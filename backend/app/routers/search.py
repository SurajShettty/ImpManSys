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
    """Search clients, projects, tasks, and users from one box."""
    term = f"%{q.strip()}%"
    if term == "%%":
        return {"clients": [], "projects": [], "tasks": [], "users": []}

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

    projects = (
        db.query(models.Project)
        .join(models.Client)
        .filter(
            models.Project.is_deleted == False,
            models.Client.is_deleted == False,
            models.Project.name.ilike(term),
        )
        .limit(10)
        .all()
    )

    tasks = (
        db.query(models.Task)
        .join(models.Phase)
        .join(models.ProjectModule)
        .join(models.Project)
        .filter(
            models.Task.is_deleted == False,
            models.Phase.is_deleted == False,
            models.ProjectModule.is_deleted == False,
            models.Project.is_deleted == False,
            or_(
                models.Task.title.ilike(term),
                models.Task.description.ilike(term),
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
        "projects": [
            {
                "id": p.id,
                "name": p.name,
                "client_id": p.client_id,
                "client_name": p.client.name if p.client else None,
                "status": p.status,
                "progress": p.progress,
            }
            for p in projects
        ],
        "tasks": [
            {
                "id": t.id,
                "title": t.title,
                "status": t.status,
                "priority": t.priority,
                "project_id": t.phase.project_module.project_id,
                "project_name": t.phase.project_module.project.name,
            }
            for t in tasks
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
