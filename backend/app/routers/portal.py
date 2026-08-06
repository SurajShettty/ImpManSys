from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.dependencies import require_role
from app.utils.audit import log_activity

router = APIRouter()


def _require_linked_client(current_user: models.User) -> int:
    if current_user.client_id is None:
        raise HTTPException(status_code=400, detail="This login isn't linked to a client yet")
    return current_user.client_id


def _own_phase_or_404(db: Session, client_id: int, phase_id: int) -> models.Phase:
    phase = (
        db.query(models.Phase)
        .filter(models.Phase.id == phase_id, models.Phase.is_deleted == False)
        .first()
    )
    if not phase or phase.client_id != client_id:
        raise HTTPException(status_code=404, detail="Phase not found")
    return phase


def _own_activity_or_404(db: Session, client_id: int, activity_id: int) -> models.Activity:
    activity = (
        db.query(models.Activity)
        .filter(models.Activity.id == activity_id, models.Activity.is_deleted == False)
        .first()
    )
    if not activity or activity.phase_module.phase.client_id != client_id:
        raise HTTPException(status_code=404, detail="Activity not found")
    return activity


def _own_checklist_item_or_404(db: Session, client_id: int, item_id: int) -> models.ChecklistItem:
    item = (
        db.query(models.ChecklistItem)
        .filter(models.ChecklistItem.id == item_id, models.ChecklistItem.is_deleted == False)
        .first()
    )
    if not item or item.activity.phase_module.phase.client_id != client_id:
        raise HTTPException(status_code=404, detail="Checklist item not found")
    return item


@router.get("/summary")
def portal_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("Client")),
):
    client_id = _require_linked_client(current_user)
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client or client.is_deleted:
        raise HTTPException(status_code=404, detail="Client not found")

    phases = [p for p in client.phases if not p.is_deleted]
    overall_progress = round(sum(p.progress or 0.0 for p in phases) / len(phases), 2) if phases else 0.0

    today = date.today()
    open_activities = (
        db.query(models.Activity)
        .join(models.PhaseModule, models.Activity.phase_module_id == models.PhaseModule.id)
        .join(models.Phase, models.PhaseModule.phase_id == models.Phase.id)
        .filter(
            models.Phase.client_id == client_id,
            models.Phase.is_deleted == False,
            models.PhaseModule.is_deleted == False,
            models.Activity.is_deleted == False,
            models.Activity.status.notin_(("Completed", "Cancelled")),
        )
        .count()
    )

    upcoming_meetings = (
        db.query(models.Meeting)
        .join(models.Phase, models.Meeting.phase_id == models.Phase.id)
        .filter(
            models.Phase.client_id == client_id,
            models.Phase.is_deleted == False,
            models.Meeting.is_deleted == False,
            models.Meeting.client_visible == True,
            models.Meeting.next_follow_up.isnot(None),
            models.Meeting.next_follow_up >= today,
        )
        .order_by(models.Meeting.next_follow_up.asc())
        .limit(5)
        .all()
    )

    return {
        "client_name": client.name,
        "overall_progress": overall_progress,
        "phase_count": len(phases),
        "open_activities": open_activities,
        "go_live_date": client.go_live_date,
        "agreed_go_live_date": client.agreed_go_live_date,
        "kickoff_meeting_date": client.kickoff_meeting_date,
        "phases": [
            {"id": p.id, "name": p.name, "status": p.status, "progress": p.progress}
            for p in phases
        ],
        "upcoming_meetings": [
            {
                "id": m.id,
                "title": m.title,
                "phase_id": m.phase_id,
                "phase_name": m.phase.name,
                "next_follow_up": m.next_follow_up,
            }
            for m in upcoming_meetings
        ],
    }


@router.get("/phases", response_model=list[schemas.PhaseResponse])
def portal_phases(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("Client")),
):
    client_id = _require_linked_client(current_user)
    return (
        db.query(models.Phase)
        .filter(models.Phase.client_id == client_id, models.Phase.is_deleted == False)
        .order_by(models.Phase.created_at.desc())
        .all()
    )


@router.get("/phases/{phase_id}")
def portal_phase_detail(
    phase_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("Client")),
):
    client_id = _require_linked_client(current_user)
    phase = _own_phase_or_404(db, client_id, phase_id)

    modules = [pm for pm in phase.phase_modules if not pm.is_deleted]
    return {
        "id": phase.id,
        "name": phase.name,
        "description": phase.description,
        "status": phase.status,
        "progress": phase.progress,
        "start_date": phase.start_date,
        "end_date": phase.end_date,
        "modules": [
            {
                "id": pm.id,
                "module_id": pm.module_id,
                "module_name": pm.module.name if pm.module else None,
                "status": pm.status,
                "progress": pm.progress,
                "activities": [
                    schemas.ActivityPortalResponse.model_validate(a)
                    for a in pm.activities
                    if not a.is_deleted
                ],
            }
            for pm in modules
        ],
    }


@router.get("/meetings", response_model=list[schemas.MeetingPortalResponse])
def portal_meetings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("Client")),
):
    client_id = _require_linked_client(current_user)
    return (
        db.query(models.Meeting)
        .join(models.Phase, models.Meeting.phase_id == models.Phase.id)
        .filter(
            models.Phase.client_id == client_id,
            models.Phase.is_deleted == False,
            models.Meeting.is_deleted == False,
            models.Meeting.client_visible == True,
        )
        .order_by(models.Meeting.meeting_date.desc())
        .all()
    )


@router.patch("/activities/{activity_id}/response", response_model=schemas.ActivityPortalResponse)
def update_activity_client_response(
    activity_id: int,
    payload: schemas.ActivityClientResponseUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("Client")),
):
    client_id = _require_linked_client(current_user)
    activity = _own_activity_or_404(db, client_id, activity_id)
    activity.client_response = payload.client_response
    db.commit()
    db.refresh(activity)
    log_activity(db, current_user.id, "activity", "client_response", f"Activity #{activity.id} client response updated")
    return activity


@router.patch("/checklist-items/{item_id}", response_model=schemas.ChecklistItemResponse)
def update_checklist_item(
    item_id: int,
    payload: schemas.ChecklistItemPortalUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("Client")),
):
    client_id = _require_linked_client(current_user)
    item = _own_checklist_item_or_404(db, client_id, item_id)
    item.completed = payload.completed
    db.commit()
    db.refresh(item)
    log_activity(db, current_user.id, "checklist_item", "client_update", f"Checklist item #{item.id} marked {'done' if item.completed else 'not done'}")
    return item
