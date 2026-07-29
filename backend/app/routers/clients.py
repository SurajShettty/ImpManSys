from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.dependencies import get_current_active_user, require_permission
from app.utils.audit import log_activity

router = APIRouter()


def _with_counts(client: models.Client) -> models.Client:
    client.phase_count = len([p for p in client.phases if not p.is_deleted])
    return client


@router.get("/", response_model=List[schemas.ClientResponse])
def list_clients(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    clients = db.query(models.Client).filter(models.Client.is_deleted == False).order_by(models.Client.name).all()
    return [_with_counts(c) for c in clients]


@router.post("/", response_model=schemas.ClientResponse, status_code=status.HTTP_201_CREATED)
def create_client(
    payload: schemas.ClientCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("client.create")),
):
    client = models.Client(**payload.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    log_activity(db, current_user.id, "client", "create", f"Created client '{client.name}'")
    return _with_counts(client)


@router.get("/{client_id}", response_model=schemas.ClientResponse)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    client = db.query(models.Client).filter(models.Client.id == client_id, models.Client.is_deleted == False).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return _with_counts(client)


@router.put("/{client_id}", response_model=schemas.ClientResponse)
def update_client(
    client_id: int,
    payload: schemas.ClientUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("client.update")),
):
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(client, field, value)
    db.commit()
    db.refresh(client)
    log_activity(db, current_user.id, "client", "update", f"Updated client '{client.name}'")
    return _with_counts(client)


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("client.delete")),
):
    client = db.query(models.Client).filter(models.Client.id == client_id, models.Client.is_deleted == False).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    now = models.utc_now()
    client.is_deleted = True
    client.deleted_at = now
    for phase in client.phases:
        phase.is_deleted = True
        phase.deleted_at = now
        for meeting in phase.meetings:
            meeting.is_deleted = True
            meeting.deleted_at = now
        for phase_module in phase.phase_modules:
            phase_module.is_deleted = True
            phase_module.deleted_at = now
            for activity in phase_module.activities:
                activity.is_deleted = True
                activity.deleted_at = now
                for item in activity.checklist_items:
                    item.is_deleted = True
                    item.deleted_at = now

    db.commit()
    log_activity(db, current_user.id, "client", "delete", f"Deleted client #{client_id}")


@router.get("/{client_id}/meetings", response_model=List[schemas.MeetingResponse])
def list_client_meetings(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """All meetings across all phases for this client."""
    client = db.query(models.Client).filter(models.Client.id == client_id, models.Client.is_deleted == False).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    phase_ids = [p.id for p in client.phases if not p.is_deleted]
    if not phase_ids:
        return []

    return (
        db.query(models.Meeting)
        .filter(
            models.Meeting.phase_id.in_(phase_ids),
            models.Meeting.is_deleted == False,
        )
        .order_by(models.Meeting.meeting_date.desc(), models.Meeting.created_at.desc())
        .all()
    )


@router.get("/{client_id}/phases", response_model=List[schemas.PhaseResponse])
def list_client_phases(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    client = db.query(models.Client).filter(models.Client.id == client_id, models.Client.is_deleted == False).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return (
        db.query(models.Phase)
        .filter(models.Phase.client_id == client_id, models.Phase.is_deleted == False)
        .order_by(models.Phase.created_at.desc())
        .all()
    )
