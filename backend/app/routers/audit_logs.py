from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.dependencies import require_permission

router = APIRouter()


@router.get("/")
def list_activity_logs(
    entity: str | None = None,
    action: str | None = None,
    user_id: int | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("audit.view")),
):
    """Audit trail of user actions, paginated (SOP section 16 / audit logs)."""
    query = db.query(models.ActivityLog).order_by(models.ActivityLog.timestamp.desc())
    if entity:
        query = query.filter(models.ActivityLog.entity == entity)
    if action:
        query = query.filter(models.ActivityLog.action == action)
    if user_id:
        query = query.filter(models.ActivityLog.user_id == user_id)

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [schemas.ActivityLogResponse.model_validate(i).model_dump() for i in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size if total else 1,
    }
