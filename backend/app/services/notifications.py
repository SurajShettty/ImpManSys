"""Personal notifications: due-today/overdue alerts (time-derived, synced on
read since this app has no background job runner) and assignment alerts
(event-derived, created directly when an activity's owner changes).
"""
from datetime import date
from sqlalchemy.orm import Session
from app import models

DUE_TYPES = ("due_today", "overdue")


def _due_message(activity: models.Activity, type_: str) -> str:
    if type_ == "due_today":
        return f"'{activity.title}' is due today"
    return f"'{activity.title}' is overdue (was due {activity.due_date:%d %b %Y})"


def sync_due_notifications(db: Session) -> None:
    """Upsert due-today/overdue alerts for every activity owner, and resolve
    any existing unread alert whose activity no longer matches (completed,
    cancelled, reassigned, due date pushed back, or soft-deleted).
    """
    today = date.today()

    candidates = (
        db.query(models.Activity)
        .filter(
            models.Activity.is_deleted == False,
            models.Activity.owner_id.isnot(None),
            models.Activity.due_date.isnot(None),
            models.Activity.due_date <= today,
            models.Activity.status.notin_(["Completed", "Cancelled"]),
        )
        .all()
    )
    candidate_map: dict[tuple[int, int, str], models.Activity] = {}
    for activity in candidates:
        type_ = "due_today" if activity.due_date == today else "overdue"
        candidate_map[(activity.owner_id, activity.id, type_)] = activity

    existing = (
        db.query(models.Notification)
        .filter(models.Notification.type.in_(DUE_TYPES))
        .all()
    )
    existing_map = {(n.user_id, n.activity_id, n.type): n for n in existing}

    for key, notification in existing_map.items():
        if not notification.is_read and key not in candidate_map:
            notification.is_read = True
            notification.read_at = models.utc_now()

    for key, activity in candidate_map.items():
        user_id, activity_id, type_ = key
        notification = existing_map.get(key)
        if notification is None:
            db.add(
                models.Notification(
                    user_id=user_id,
                    activity_id=activity_id,
                    type=type_,
                    message=_due_message(activity, type_),
                )
            )
        elif notification.is_read:
            notification.is_read = False
            notification.read_at = None
            notification.message = _due_message(activity, type_)
            notification.created_at = models.utc_now()
        # else: already active and up to date.

    db.commit()


def notify_assignment(db: Session, activity: models.Activity) -> None:
    """Create or reactivate an "assigned to you" alert for the activity's owner."""
    if not activity.owner_id:
        return

    notification = (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id == activity.owner_id,
            models.Notification.activity_id == activity.id,
            models.Notification.type == "assigned",
        )
        .first()
    )
    message = f"'{activity.title}' was assigned to you"
    if notification:
        notification.is_read = False
        notification.read_at = None
        notification.message = message
        notification.created_at = models.utc_now()
    else:
        db.add(
            models.Notification(
                user_id=activity.owner_id,
                activity_id=activity.id,
                type="assigned",
                message=message,
            )
        )
    db.commit()
