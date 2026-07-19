from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.dependencies import get_current_active_user, require_permission
from app.utils.audit import log_activity

router = APIRouter()


def _load_project(db: Session, project_id: int) -> models.Project:
    project = db.query(models.Project).filter(
        models.Project.id == project_id, models.Project.is_deleted == False
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/{project_id}/meetings", response_model=List[schemas.MeetingResponse])
def list_meetings(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("meeting.view")),
):
    _load_project(db, project_id)
    return (
        db.query(models.Meeting)
        .filter(
            models.Meeting.project_id == project_id,
            models.Meeting.is_deleted == False,
        )
        .order_by(models.Meeting.meeting_date.desc(), models.Meeting.created_at.desc())
        .all()
    )


@router.post("/{project_id}/meetings", response_model=schemas.MeetingResponse, status_code=status.HTTP_201_CREATED)
def create_meeting(
    project_id: int,
    payload: schemas.MeetingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("meeting.create")),
):
    project = _load_project(db, project_id)
    meeting = models.Meeting(
        project_id=project_id,
        created_by=current_user.id,
        **payload.model_dump(),
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    log_activity(
        db,
        current_user.id,
        "meeting",
        "create",
        f"Created meeting '{meeting.title}' for project '{project.name}'",
    )
    return meeting


@router.get("/{project_id}/meetings/{meeting_id}", response_model=schemas.MeetingResponse)
def get_meeting(
    project_id: int,
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("meeting.view")),
):
    _load_project(db, project_id)
    meeting = (
        db.query(models.Meeting)
        .filter(
            models.Meeting.id == meeting_id,
            models.Meeting.project_id == project_id,
            models.Meeting.is_deleted == False,
        )
        .first()
    )
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@router.put("/{project_id}/meetings/{meeting_id}", response_model=schemas.MeetingResponse)
def update_meeting(
    project_id: int,
    meeting_id: int,
    payload: schemas.MeetingUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("meeting.update")),
):
    _load_project(db, project_id)
    meeting = (
        db.query(models.Meeting)
        .filter(
            models.Meeting.id == meeting_id,
            models.Meeting.project_id == project_id,
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
    log_activity(
        db,
        current_user.id,
        "meeting",
        "update",
        f"Updated meeting '{meeting.title}' (#{meeting.id})",
    )
    return meeting


@router.delete("/{project_id}/meetings/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meeting(
    project_id: int,
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("meeting.delete")),
):
    _load_project(db, project_id)
    meeting = (
        db.query(models.Meeting)
        .filter(
            models.Meeting.id == meeting_id,
            models.Meeting.project_id == project_id,
            models.Meeting.is_deleted == False,
        )
        .first()
    )
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    meeting.is_deleted = True
    meeting.deleted_at = models.utc_now()
    db.commit()
    log_activity(
        db,
        current_user.id,
        "meeting",
        "delete",
        f"Deleted meeting '{meeting.title}' (#{meeting.id})",
    )
