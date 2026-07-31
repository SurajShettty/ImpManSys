from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.dependencies import get_current_active_user
from app.services.notifications import sync_due_notifications

router = APIRouter()


def _serialize(notification: models.Notification) -> dict:
    data = schemas.NotificationResponse.model_validate(notification).model_dump()
    if notification.activity and notification.activity.phase_module:
        phase = notification.activity.phase_module.phase
        data["phase_id"] = phase.id
        data["client_name"] = phase.client.name if phase.client else None
    elif notification.client:
        data["client_name"] = notification.client.name
    return data


@router.get("/")
def list_notifications(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """The caller's own notifications - no permission code needed (personal inbox)."""
    sync_due_notifications(db)

    base_query = db.query(models.Notification).filter(models.Notification.user_id == current_user.id)
    unread_count = base_query.filter(models.Notification.is_read == False).count()

    ordered_query = base_query.order_by(
        models.Notification.is_read.asc(), models.Notification.created_at.desc()
    )
    total = ordered_query.count()
    items = ordered_query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [_serialize(n) for n in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size if total else 1,
        "unread_count": unread_count,
    }


@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    notification = (
        db.query(models.Notification)
        .filter(
            models.Notification.id == notification_id,
            models.Notification.user_id == current_user.id,
        )
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    notification.read_at = models.utc_now()
    db.commit()
    db.refresh(notification)
    return _serialize(notification)


@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    updated = (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id == current_user.id,
            models.Notification.is_read == False,
        )
        .update({"is_read": True, "read_at": models.utc_now()})
    )
    db.commit()
    return {"updated": updated}
