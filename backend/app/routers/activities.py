from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.dependencies import get_current_active_user, require_permission
from app.utils.audit import log_activity
from app.services.templates import recompute_phase_module_progress, recompute_client_kickoff_date
from app.services.notifications import notify_assignment
from app.services.access import ensure_client_access

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

    # Keep progress consistent with a status change. Completed = 100%.
    # Re-opening a completed activity resets progress unless the caller explicitly
    # provided a new progress value.
    new_status = data.get("status")
    old_status = activity.status
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
    db.commit()
    db.refresh(activity)
    _roll_up(db, activity)
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
