from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app import models
from app.dependencies import get_current_active_user, require_permission

router = APIRouter()


@router.get("/")
def global_search(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("search.view")),
):
    """Search clients, phases, activities, and users from one box."""
    term = f"%{q.strip()}%"
    if term == "%%":
        return {"clients": [], "phases": [], "activities": [], "users": []}

    clients = (
        db.query(models.Client)
        .filter(
            models.Client.is_deleted == False,
            or_(
                models.Client.name.ilike(term),
                models.Client.crm_id.ilike(term),
                models.Client.institution_type.ilike(term),
            ),
        )
        .limit(10)
        .all()
    )

    phases = (
        db.query(models.Phase)
        .join(models.Client)
        .filter(
            models.Phase.is_deleted == False,
            models.Client.is_deleted == False,
            models.Phase.name.ilike(term),
        )
        .limit(10)
        .all()
    )

    activities = (
        db.query(models.Activity)
        .join(models.PhaseModule)
        .join(models.Phase)
        .join(models.Client)
        .filter(
            models.Activity.is_deleted == False,
            models.PhaseModule.is_deleted == False,
            models.Phase.is_deleted == False,
            models.Client.is_deleted == False,
            or_(
                models.Activity.title.ilike(term),
                models.Activity.description.ilike(term),
            ),
        )
        .limit(10)
        .all()
    )

    users = (
        db.query(models.User)
        .filter(
            models.User.is_deleted == False,
            models.User.is_active == True,
            or_(
                models.User.name.ilike(term),
                models.User.email.ilike(term),
            ),
        )
        .limit(10)
        .all()
    )

    return {
        "clients": [
            {
                "id": c.id,
                "name": c.name,
                "crm_id": c.crm_id,
                "institution_type": c.institution_type,
                "status": c.status,
            }
            for c in clients
        ],
        "phases": [
            {
                "id": p.id,
                "name": p.name,
                "client_id": p.client_id,
                "client_name": p.client.name if p.client else None,
                "status": p.status,
                "progress": p.progress,
            }
            for p in phases
        ],
        "activities": [
            {
                "id": a.id,
                "title": a.title,
                "status": a.status,
                "priority": a.priority,
                "phase_id": a.phase_module.phase_id,
                "phase_name": a.phase_module.phase.name,
            }
            for a in activities
        ],
        "users": [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "role": u.role.name if u.role else None,
            }
            for u in users
        ],
    }
