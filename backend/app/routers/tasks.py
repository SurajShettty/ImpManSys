from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.dependencies import get_current_active_user, require_role
from app.utils.audit import log_activity
from app.services.templates import recompute_project_module_progress

router = APIRouter()

# Task-level work can also be done by implementation executives.
EXECUTOR_ROLES = (
    "Administrator",
    "Customer Success Manager",
    "Project Manager",
    "Implementation Executive",
)


def _load_task(db: Session, task_id: int) -> models.Task:
    task = db.query(models.Task).filter(models.Task.id == task_id, models.Task.is_deleted == False).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


def _roll_up(db: Session, task: models.Task) -> None:
    """Recompute progress for the owning module and project after a task change."""
    recompute_project_module_progress(db, task.phase.project_module)


@router.get("/{task_id}", response_model=schemas.TaskResponse)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    return _load_task(db, task_id)


@router.post("/", response_model=schemas.TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(*EXECUTOR_ROLES)),
):
    phase = db.query(models.Phase).filter(models.Phase.id == payload.phase_id, models.Phase.is_deleted == False).first()
    if not phase:
        raise HTTPException(status_code=400, detail="Phase not found")

    task = models.Task(**payload.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    _roll_up(db, task)
    db.commit()
    log_activity(db, current_user.id, "task", "create", f"Created task '{task.title}'")
    return task


@router.put("/{task_id}", response_model=schemas.TaskResponse)
def update_task(
    task_id: int,
    payload: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(*EXECUTOR_ROLES)),
):
    task = _load_task(db, task_id)
    data = payload.model_dump(exclude_unset=True)

    # Keep progress consistent with a status change. Completed = 100%.
    # Re-opening a completed task resets progress unless the caller explicitly
    # provided a new progress value.
    new_status = data.get("status")
    old_status = task.status
    if new_status is not None:
        if new_status == "Completed":
            data["progress"] = 100.0
        elif old_status == "Completed" and new_status != "Completed":
            if "progress" not in data:
                data["progress"] = 0.0
        elif new_status == "Not Started" and "progress" not in data:
            data["progress"] = 0.0

    for field, value in data.items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    _roll_up(db, task)
    db.commit()
    log_activity(db, current_user.id, "task", "update", f"Updated task '{task.title}'")
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(*EXECUTOR_ROLES)),
):
    task = _load_task(db, task_id)
    project_module = task.phase.project_module
    task.is_deleted = True
    for item in task.checklist_items:
        item.is_deleted = True
    db.commit()
    recompute_project_module_progress(db, project_module)
    db.commit()
    log_activity(db, current_user.id, "task", "delete", f"Deleted task #{task_id}")


# ---------- Checklist items ----------


@router.post(
    "/{task_id}/checklist",
    response_model=schemas.ChecklistItemResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_checklist_item(
    task_id: int,
    payload: schemas.ChecklistItemCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(*EXECUTOR_ROLES)),
):
    _load_task(db, task_id)
    item = models.ChecklistItem(task_id=task_id, **payload.model_dump())
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
    current_user: models.User = Depends(require_role(*EXECUTOR_ROLES)),
):
    item = db.query(models.ChecklistItem).filter(models.ChecklistItem.id == item_id, models.ChecklistItem.is_deleted == False).first()
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/checklist/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_checklist_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(*EXECUTOR_ROLES)),
):
    item = db.query(models.ChecklistItem).filter(models.ChecklistItem.id == item_id, models.ChecklistItem.is_deleted == False).first()
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")
    item.is_deleted = True
    db.commit()
