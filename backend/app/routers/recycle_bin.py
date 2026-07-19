from datetime import timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.dependencies import require_permission
from app.utils.audit import log_activity
from app.services.templates import recompute_project_module_progress

router = APIRouter()

# Items stay in the recycle bin for this long after deletion.
RETENTION = timedelta(hours=12)


def _restore_project(db: Session, project: models.Project) -> None:
    project.is_deleted = False
    project.deleted_at = None
    for pm in project.project_modules:
        _restore_project_module(db, pm)


def _restore_project_module(db: Session, pm: models.ProjectModule) -> None:
    pm.is_deleted = False
    pm.deleted_at = None
    for phase in pm.phases:
        phase.is_deleted = False
        phase.deleted_at = None
        for task in phase.tasks:
            task.is_deleted = False
            task.deleted_at = None
            for item in task.checklist_items:
                item.is_deleted = False
                item.deleted_at = None


@router.get("/")
def list_deleted_items(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("recycle_bin.view")),
):
    """The recycle bin: soft-deleted items from the last 12 hours."""
    cutoff = models.utc_now() - RETENTION

    clients = (
        db.query(models.Client)
        .filter(models.Client.is_deleted == True, models.Client.deleted_at >= cutoff)
        .order_by(models.Client.deleted_at.desc())
        .all()
    )
    projects = (
        db.query(models.Project)
        .filter(models.Project.is_deleted == True, models.Project.deleted_at >= cutoff)
        .order_by(models.Project.deleted_at.desc())
        .all()
    )
    tasks = (
        db.query(models.Task)
        .filter(models.Task.is_deleted == True, models.Task.deleted_at >= cutoff)
        .order_by(models.Task.deleted_at.desc())
        .all()
    )
    users = (
        db.query(models.User)
        .filter(models.User.is_deleted == True, models.User.deleted_at >= cutoff)
        .order_by(models.User.deleted_at.desc())
        .all()
    )
    meetings = (
        db.query(models.Meeting)
        .filter(models.Meeting.is_deleted == True, models.Meeting.deleted_at >= cutoff)
        .order_by(models.Meeting.deleted_at.desc())
        .all()
    )

    def expires(dt):
        return (dt + RETENTION).isoformat() if dt else None

    return {
        "retention_hours": 12,
        "clients": [
            {
                "id": c.id,
                "name": c.name,
                "crm_id": c.crm_id,
                "deleted_at": c.deleted_at.isoformat() if c.deleted_at else None,
                "expires_at": expires(c.deleted_at),
            }
            for c in clients
        ],
        "projects": [
            {
                "id": p.id,
                "name": p.name,
                "client_name": p.client.name if p.client else None,
                "client_deleted": p.client.is_deleted if p.client else True,
                "deleted_at": p.deleted_at.isoformat() if p.deleted_at else None,
                "expires_at": expires(p.deleted_at),
            }
            for p in projects
        ],
        "tasks": [
            {
                "id": t.id,
                "title": t.title,
                "project_id": t.phase.project_module.project_id,
                "project_name": t.phase.project_module.project.name,
                "deleted_at": t.deleted_at.isoformat() if t.deleted_at else None,
                "expires_at": expires(t.deleted_at),
            }
            for t in tasks
            if t.phase and t.phase.project_module and t.phase.project_module.project
        ],
        "users": [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "deleted_at": u.deleted_at.isoformat() if u.deleted_at else None,
                "expires_at": expires(u.deleted_at),
            }
            for u in users
        ],
        "meetings": [
            {
                "id": m.id,
                "title": m.title,
                "project_id": m.project_id,
                "project_name": m.project.name if m.project else None,
                "deleted_at": m.deleted_at.isoformat() if m.deleted_at else None,
                "expires_at": expires(m.deleted_at),
            }
            for m in meetings
        ],
    }


@router.post("/restore/{entity}/{item_id}")
def restore_item(
    entity: str,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("recycle_bin.restore")),
):
    """Restore a soft-deleted item (and its children) from the recycle bin."""
    cutoff = models.utc_now() - RETENTION

    def _not_expired(item):
        if item.deleted_at is None:
            raise HTTPException(status_code=400, detail="Restore window has expired")
        # Ensure both datetimes are offset-aware UTC before comparing.
        deleted_at = item.deleted_at
        if deleted_at.tzinfo is None:
            deleted_at = deleted_at.replace(tzinfo=timezone.utc)
        if deleted_at < cutoff:
            raise HTTPException(status_code=400, detail="Restore window has expired")

    if entity == "clients":
        item = db.query(models.Client).filter(models.Client.id == item_id, models.Client.is_deleted == True).first()
        if not item:
            raise HTTPException(status_code=404, detail="Client not found in recycle bin")
        _not_expired(item)
        item.is_deleted = False
        item.deleted_at = None
        for project in item.projects:
            _restore_project(db, project)

    elif entity == "projects":
        item = db.query(models.Project).filter(models.Project.id == item_id, models.Project.is_deleted == True).first()
        if not item:
            raise HTTPException(status_code=404, detail="Project not found in recycle bin")
        _not_expired(item)
        if item.client and item.client.is_deleted:
            raise HTTPException(status_code=400, detail="Restore the client first")
        _restore_project(db, item)

    elif entity == "tasks":
        item = db.query(models.Task).filter(models.Task.id == item_id, models.Task.is_deleted == True).first()
        if not item:
            raise HTTPException(status_code=404, detail="Task not found in recycle bin")
        _not_expired(item)
        pm = item.phase.project_module
        if pm.is_deleted or pm.project.is_deleted or (pm.project.client and pm.project.client.is_deleted):
            raise HTTPException(status_code=400, detail="Restore the parent project/client first")
        item.is_deleted = False
        item.deleted_at = None
        for ci in item.checklist_items:
            ci.is_deleted = False
            ci.deleted_at = None
        db.flush()
        recompute_project_module_progress(db, pm)

    elif entity == "users":
        item = db.query(models.User).filter(models.User.id == item_id, models.User.is_deleted == True).first()
        if not item:
            raise HTTPException(status_code=404, detail="User not found in recycle bin")
        _not_expired(item)
        item.is_deleted = False
        item.deleted_at = None

    elif entity == "meetings":
        item = db.query(models.Meeting).filter(models.Meeting.id == item_id, models.Meeting.is_deleted == True).first()
        if not item:
            raise HTTPException(status_code=404, detail="Meeting not found in recycle bin")
        _not_expired(item)
        if item.project and item.project.is_deleted:
            raise HTTPException(status_code=400, detail="Restore the parent project first")
        item.is_deleted = False
        item.deleted_at = None

    else:
        raise HTTPException(status_code=400, detail=f"Unknown entity '{entity}'")

    db.commit()
    log_activity(db, current_user.id, entity, "restore", f"Restored {entity} #{item_id}")
    return {"restored": True, "entity": entity, "id": item_id}
