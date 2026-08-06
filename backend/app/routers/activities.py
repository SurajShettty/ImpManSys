from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.dependencies import get_current_active_user, require_permission
from app.utils.audit import log_activity
from app.services.templates import (
    recompute_phase_module_progress,
    recompute_client_kickoff_date,
    recompute_phase_start_date,
)
from app.services.notifications import notify_assignment
from app.services.access import ensure_client_access
from app.services.documents import cascade_delete_documents

router = APIRouter()


# Activity-level work can also be done by implementation executives.


def _load_activity(db: Session, activity_id: int, current_user: models.User) -> models.Activity:
    activity = db.query(models.Activity).filter(models.Activity.id == activity_id, models.Activity.is_deleted == False).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    ensure_client_access(db, current_user, activity.phase_module.phase.client_id)
    return activity


def _roll_up(db: Session, activity: models.Activity) -> None:
    """Recompute progress for the owning module and phase after an activity change."""
    recompute_phase_module_progress(db, activity.phase_module)


def _resolve_dependency_targets(
    db: Session, activity: models.Activity, depends_on_ids: list[int]
) -> list[models.Activity]:
    """Validate a proposed dependency set: no self-reference, all targets in
    the same phase, and no cycle back to `activity`. Raises 400 on failure."""
    unique_ids = set(depends_on_ids)
    if activity.id in unique_ids:
        raise HTTPException(status_code=400, detail="An activity can't depend on itself")
    if not unique_ids:
        return []

    targets = (
        db.query(models.Activity)
        .filter(models.Activity.id.in_(unique_ids), models.Activity.is_deleted == False)
        .all()
    )
    if len(targets) != len(unique_ids):
        raise HTTPException(status_code=400, detail="One or more dependency activities were not found")

    phase_id = activity.phase_module.phase_id
    for target in targets:
        if target.phase_module.phase_id != phase_id:
            raise HTTPException(
                status_code=400,
                detail=f"'{target.title}' is not in the same phase and can't be set as a dependency",
            )

    # Cycle check: walk the dependency graph outward from each target; if we
    # ever reach `activity.id`, setting this dependency would create a cycle.
    visited: set[int] = set()
    queue = [t.id for t in targets]
    while queue:
        current_id = queue.pop()
        if current_id == activity.id:
            raise HTTPException(status_code=400, detail="That would create a circular dependency")
        if current_id in visited:
            continue
        visited.add(current_id)
        queue.extend(
            row.depends_on_activity_id
            for row in db.query(models.ActivityDependency.depends_on_activity_id).filter(
                models.ActivityDependency.activity_id == current_id
            )
        )

    return targets


def _set_activity_dependencies(db: Session, activity: models.Activity, targets: list[models.Activity]) -> None:
    db.query(models.ActivityDependency).filter(models.ActivityDependency.activity_id == activity.id).delete()
    for target in targets:
        db.add(models.ActivityDependency(activity_id=activity.id, depends_on_activity_id=target.id))


@router.get("/{activity_id}", response_model=schemas.ActivityResponse)
def get_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("activity.view")),
):
    return _load_activity(db, activity_id, current_user)


@router.post("/", response_model=schemas.ActivityResponse, status_code=status.HTTP_201_CREATED)
def create_activity(
    payload: schemas.ActivityCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("activity.create")),
):
    phase_module = db.query(models.PhaseModule).filter(
        models.PhaseModule.id == payload.phase_module_id,
        models.PhaseModule.is_deleted == False,
    ).first()
    if not phase_module:
        raise HTTPException(status_code=400, detail="Module not found")
    ensure_client_access(db, current_user, phase_module.phase.client_id)

    activity = models.Activity(**payload.model_dump())
    # Place new activities at the end of their module by default.
    max_seq = (
        db.query(models.Activity)
        .filter(models.Activity.phase_module_id == payload.phase_module_id, models.Activity.is_deleted == False)
        .count()
    )
    activity.sequence = max_seq + 1
    db.add(activity)
    db.commit()
    db.refresh(activity)
    _roll_up(db, activity)
    recompute_client_kickoff_date(db, phase_module.phase.client)
    db.commit()
    if activity.owner_id and activity.owner_id != current_user.id:
        notify_assignment(db, activity)
    log_activity(db, current_user.id, "activity", "create", f"Created activity '{activity.title}'")
    return activity


@router.put("/{activity_id}", response_model=schemas.ActivityResponse)
def update_activity(
    activity_id: int,
    payload: schemas.ActivityUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("activity.update")),
):
    activity = _load_activity(db, activity_id, current_user)
    data = payload.model_dump(exclude_unset=True)
    previous_owner_id = activity.owner_id

    depends_on_ids = data.pop("depends_on_activity_ids", None)
    new_targets = _resolve_dependency_targets(db, activity, depends_on_ids) if depends_on_ids is not None else None

    # Keep progress consistent with a status change. Completed = 100%.
    # Re-opening a completed activity resets progress unless the caller explicitly
    # provided a new progress value.
    new_status = data.get("status")
    old_status = activity.status
    if new_status == "Completed":
        prerequisites = new_targets if new_targets is not None else activity.depends_on
        unmet = [p for p in prerequisites if p.status not in ("Completed", "Cancelled")]
        if unmet:
            names = ", ".join(p.title for p in unmet)
            raise HTTPException(status_code=400, detail=f"Can't mark this Completed — still blocked by: {names}")
    if new_status is not None:
        if new_status == "Completed":
            data["progress"] = 100.0
        elif old_status == "Completed" and new_status != "Completed":
            if "progress" not in data:
                data["progress"] = 0.0
        elif new_status == "Not Started" and "progress" not in data:
            data["progress"] = 0.0

    for field, value in data.items():
        setattr(activity, field, value)
    if new_targets is not None:
        _set_activity_dependencies(db, activity, new_targets)
    db.commit()
    db.refresh(activity)
    _roll_up(db, activity)
    if old_status == "Not Started" and new_status not in (None, "Not Started"):
        recompute_phase_start_date(db, activity.phase_module.phase)
    db.commit()
    if (
        "owner_id" in data
        and activity.owner_id
        and activity.owner_id != previous_owner_id
        and activity.owner_id != current_user.id
    ):
        notify_assignment(db, activity)
    log_activity(db, current_user.id, "activity", "update", f"Updated activity '{activity.title}'")
    return activity


@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("activity.delete")),
):
    activity = _load_activity(db, activity_id, current_user)
    phase_module = activity.phase_module
    now = models.utc_now()
    activity.is_deleted = True
    activity.deleted_at = now
    for item in activity.checklist_items:
        item.is_deleted = True
        item.deleted_at = now
    cascade_delete_documents(db, activity_ids=[activity.id])
    db.commit()
    recompute_phase_module_progress(db, phase_module)
    db.commit()
    log_activity(db, current_user.id, "activity", "delete", f"Deleted activity #{activity_id}")


# ---------- Checklist items ----------


@router.post(
    "/{activity_id}/checklist",
    response_model=schemas.ChecklistItemResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_checklist_item(
    activity_id: int,
    payload: schemas.ChecklistItemCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("activity.update")),
):
    _load_activity(db, activity_id, current_user)
    item = models.ChecklistItem(activity_id=activity_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put(
    "/checklist/{item_id}",
    response_model=schemas.ChecklistItemResponse,
)
def update_checklist_item(
    item_id: int,
    payload: schemas.ChecklistItemUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("activity.update")),
):
    item = db.query(models.ChecklistItem).filter(models.ChecklistItem.id == item_id, models.ChecklistItem.is_deleted == False).first()
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")
    ensure_client_access(db, current_user, item.activity.phase_module.phase.client_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/checklist/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_checklist_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("activity.update")),
):
    item = db.query(models.ChecklistItem).filter(models.ChecklistItem.id == item_id, models.ChecklistItem.is_deleted == False).first()
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")
    ensure_client_access(db, current_user, item.activity.phase_module.phase.client_id)
    item.is_deleted = True
    item.deleted_at = models.utc_now()
    db.commit()


# ---------- Reordering ----------


from pydantic import BaseModel as PydanticBaseModel


class ReorderPayload(PydanticBaseModel):
    ordered_activity_ids: list[int]


@router.post("/reorder/{phase_module_id}", status_code=status.HTTP_204_NO_CONTENT)
def reorder_activities(
    phase_module_id: int,
    payload: ReorderPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("activity.update")),
):
    """Manually reorder activities within a module (drag-and-drop support)."""
    phase_module = db.query(models.PhaseModule).filter(
        models.PhaseModule.id == phase_module_id,
        models.PhaseModule.is_deleted == False,
    ).first()
    if not phase_module:
        raise HTTPException(status_code=404, detail="Module not found")
    ensure_client_access(db, current_user, phase_module.phase.client_id)

    activities = {a.id: a for a in phase_module.activities if not a.is_deleted}
    for position, activity_id in enumerate(payload.ordered_activity_ids, start=1):
        activity = activities.get(activity_id)
        if activity:
            activity.sequence = position
    db.commit()
    log_activity(db, current_user.id, "phase_module", "reorder", f"Reordered activities in module #{phase_module_id}")
