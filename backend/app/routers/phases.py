from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.dependencies import get_current_active_user, require_permission
from app.utils.audit import log_activity
from app.services.templates import (
    create_default_kickoff_module,
    add_module_to_phase,
    recompute_phase_progress,
)

router = APIRouter()


@router.get("/", response_model=List[schemas.PhaseResponse])
def list_phases(
    client_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("phase.view")),
):
    query = db.query(models.Phase).filter(models.Phase.is_deleted == False)
    if client_id is not None:
        query = query.filter(models.Phase.client_id == client_id)
    return query.order_by(models.Phase.created_at.desc()).all()


@router.post("/", response_model=schemas.PhaseResponse, status_code=status.HTTP_201_CREATED)
def create_phase(
    payload: schemas.PhaseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("phase.create")),
):
    client = db.query(models.Client).filter(models.Client.id == payload.client_id, models.Client.is_deleted == False).first()
    if not client:
        raise HTTPException(status_code=400, detail="Client not found")

    phase = models.Phase(**payload.model_dump())
    db.add(phase)
    db.commit()
    db.refresh(phase)

    # Every new phase automatically gets a Kickoff module with default activities.
    create_default_kickoff_module(db, phase)
    db.commit()
    db.refresh(phase)

    log_activity(db, current_user.id, "phase", "create", f"Created phase '{phase.name}'")
    return phase


@router.get("/{phase_id}", response_model=schemas.PhaseResponse)
def get_phase(
    phase_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("phase.view")),
):
    phase = db.query(models.Phase).filter(models.Phase.id == phase_id, models.Phase.is_deleted == False).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    return phase


@router.put("/{phase_id}", response_model=schemas.PhaseResponse)
def update_phase(
    phase_id: int,
    payload: schemas.PhaseUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("phase.update")),
):
    phase = db.query(models.Phase).filter(models.Phase.id == phase_id, models.Phase.is_deleted == False).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(phase, field, value)
    db.commit()
    db.refresh(phase)
    log_activity(db, current_user.id, "phase", "update", f"Updated phase '{phase.name}'")
    return phase


@router.delete("/{phase_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_phase(
    phase_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("phase.delete")),
):
    phase = db.query(models.Phase).filter(models.Phase.id == phase_id, models.Phase.is_deleted == False).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")

    now = models.utc_now()
    phase.is_deleted = True
    phase.deleted_at = now
    for phase_module in phase.phase_modules:
        phase_module.is_deleted = True
        phase_module.deleted_at = now
        for activity in phase_module.activities:
            activity.is_deleted = True
            activity.deleted_at = now
            for item in activity.checklist_items:
                item.is_deleted = True
                item.deleted_at = now
    for meeting in phase.meetings:
        meeting.is_deleted = True
        meeting.deleted_at = now

    db.commit()
    log_activity(db, current_user.id, "phase", "delete", f"Deleted phase #{phase_id}")


# ---------- Phase modules (with automatic activity generation) ----------


@router.get("/{phase_id}/modules", response_model=List[schemas.PhaseModuleResponse])
def list_phase_modules(
    phase_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("module.view")),
):
    phase = db.query(models.Phase).filter(models.Phase.id == phase_id, models.Phase.is_deleted == False).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    return [pm for pm in phase.phase_modules if not pm.is_deleted]


@router.post(
    "/{phase_id}/modules",
    response_model=schemas.PhaseModuleDetail,
    status_code=status.HTTP_201_CREATED,
)
def add_phase_module(
    phase_id: int,
    payload: schemas.PhaseModuleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("module.create")),
):
    phase = db.query(models.Phase).filter(models.Phase.id == phase_id, models.Phase.is_deleted == False).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")

    module = db.query(models.Module).filter(models.Module.id == payload.module_id, models.Module.is_deleted == False).first()
    if not module:
        raise HTTPException(status_code=400, detail="Module not found")

    existing = (
        db.query(models.PhaseModule)
        .filter(
            models.PhaseModule.phase_id == phase_id,
            models.PhaseModule.module_id == payload.module_id,
            models.PhaseModule.is_deleted == False,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Module already added to this phase")

    phase_module = add_module_to_phase(db, phase, module)
    db.commit()
    db.refresh(phase_module)
    log_activity(
        db,
        current_user.id,
        "phase_module",
        "create",
        f"Added module '{module.name}' to phase '{phase.name}'",
    )
    return phase_module


@router.delete(
    "/{phase_id}/modules/{phase_module_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_phase_module(
    phase_id: int,
    phase_module_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("module.delete")),
):
    phase_module = (
        db.query(models.PhaseModule)
        .filter(
            models.PhaseModule.id == phase_module_id,
            models.PhaseModule.phase_id == phase_id,
            models.PhaseModule.is_deleted == False,
        )
        .first()
    )
    if not phase_module:
        raise HTTPException(status_code=404, detail="Phase module not found")

    phase = phase_module.phase
    now = models.utc_now()
    phase_module.is_deleted = True
    phase_module.deleted_at = now
    for activity in phase_module.activities:
        activity.is_deleted = True
        activity.deleted_at = now
        for item in activity.checklist_items:
            item.is_deleted = True
            item.deleted_at = now

    db.commit()
    recompute_phase_progress(db, phase)
    db.commit()
    log_activity(
        db, current_user.id, "phase_module", "delete", f"Removed module #{phase_module_id}"
    )


@router.get("/{phase_id}/plan", response_model=List[schemas.PhaseModuleDetail])
def get_phase_plan(
    phase_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("phase.view")),
):
    """Full drill-down: every module with its activities and checklists."""
    phase = db.query(models.Phase).filter(models.Phase.id == phase_id, models.Phase.is_deleted == False).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")

    modules = []
    for pm in phase.phase_modules:
        if pm.is_deleted:
            continue
        activities = []
        for activity in pm.activities:
            if activity.is_deleted:
                continue
            activity.checklist_items = [ci for ci in activity.checklist_items if not ci.is_deleted]
            activities.append(activity)
        pm.activities = activities
        modules.append(pm)
    return modules


# ---------- Meetings ----------


@router.get("/{phase_id}/meetings", response_model=List[schemas.MeetingResponse])
def list_phase_meetings(
    phase_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("meeting.view")),
):
    phase = db.query(models.Phase).filter(models.Phase.id == phase_id, models.Phase.is_deleted == False).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    return [m for m in phase.meetings if not m.is_deleted]


@router.get("/{phase_id}/meetings/{meeting_id}", response_model=schemas.MeetingResponse)
def get_phase_meeting(
    phase_id: int,
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("meeting.view")),
):
    meeting = (
        db.query(models.Meeting)
        .filter(
            models.Meeting.id == meeting_id,
            models.Meeting.phase_id == phase_id,
            models.Meeting.is_deleted == False,
        )
        .first()
    )
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@router.post("/{phase_id}/meetings", response_model=schemas.MeetingResponse, status_code=status.HTTP_201_CREATED)
def create_phase_meeting(
    phase_id: int,
    payload: schemas.MeetingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("meeting.create")),
):
    phase = db.query(models.Phase).filter(models.Phase.id == phase_id, models.Phase.is_deleted == False).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")

    meeting = models.Meeting(phase_id=phase_id, created_by=current_user.id, **payload.model_dump())
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    log_activity(db, current_user.id, "meeting", "create", f"Created meeting '{meeting.title}'")
    return meeting


@router.put("/{phase_id}/meetings/{meeting_id}", response_model=schemas.MeetingResponse)
def update_phase_meeting(
    phase_id: int,
    meeting_id: int,
    payload: schemas.MeetingUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("meeting.update")),
):
    meeting = (
        db.query(models.Meeting)
        .filter(
            models.Meeting.id == meeting_id,
            models.Meeting.phase_id == phase_id,
            models.Meeting.is_deleted == False,
        )
        .first()
    )
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(meeting, field, value)
    db.commit()
    db.refresh(meeting)
    log_activity(db, current_user.id, "meeting", "update", f"Updated meeting '{meeting.title}'")
    return meeting


@router.delete("/{phase_id}/meetings/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_phase_meeting(
    phase_id: int,
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("meeting.delete")),
):
    meeting = (
        db.query(models.Meeting)
        .filter(
            models.Meeting.id == meeting_id,
            models.Meeting.phase_id == phase_id,
            models.Meeting.is_deleted == False,
        )
        .first()
    )
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    meeting.is_deleted = True
    meeting.deleted_at = models.utc_now()
    db.commit()
    log_activity(db, current_user.id, "meeting", "delete", f"Deleted meeting #{meeting_id}")
