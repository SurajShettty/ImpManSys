from sqlalchemy.orm import Session
from app import models


def log_activity(
    db: Session,
    user_id: int | None,
    entity: str,
    action: str,
    details: str | None = None,
) -> models.ActivityLog:
    log = models.ActivityLog(
        user_id=user_id,
        entity=entity,
        action=action,
        details=details,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
