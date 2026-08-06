from datetime import timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.dependencies import require_permission
from app.utils.audit import log_activity
from app.services.templates import recompute_phase_module_progress

router = APIRouter()

# Items stay in the recycle bin for this long after deletion.
RETENTION = timedelta(hours=12)


def _restore_phase(db: Session, phase: models.Phase) -> None:
    phase.is_deleted = False
    phase.deleted_at = None
    for pm in phase.phase_modules:
        _restore_phase_module(db, pm)
    for meeting in phase.meetings:
        meeting.is_deleted = False
        meeting.deleted_at = None


def _restore_phase_module(db: Session, pm: models.PhaseModule) -> None:
    pm.is_deleted = False
    pm.deleted_at = None
    for activity in pm.activities:
        activity.is_deleted = False
        activity.deleted_at = None
        for item in activity.checklist_items:
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
    phases = (
        db.query(models.Phase)
        .filter(models.Phase.is_deleted == True, models.Phase.deleted_at >= cutoff)
        .order_by(models.Phase.deleted_at.desc())
        .all()
    )
    activities = (
        db.query(models.Activity)
        .filter(models.Activity.is_deleted == True, models.Activity.deleted_at >= cutoff)
        .order_by(models.Activity.deleted_at.desc())
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
    documents = (
        db.query(models.Document)
        .filter(models.Document.is_deleted == True, models.Document.deleted_at >= cutoff)
        .order_by(models.Document.deleted_at.desc())
        .all()
    )

    def _document_attached_to(d):
        if d.client_id is not None:
            return d.client.name if d.client else None
        if d.phase_id is not None:
            return d.phase.name if d.phase else None
        return d.activity.title if d.activity else None

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
        "phases": [
            {
                "id": p.id,
                "name": p.name,
                "client_name": p.client.name if p.client else None,
                "client_deleted": p.client.is_deleted if p.client else True,
                "deleted_at": p.deleted_at.isoformat() if p.deleted_at else None,
                "expires_at": expires(p.deleted_at),
            }
            for p in phases
        ],
        "activities": [
            {
                "id": a.id,
                "title": a.title,
                "phase_id": a.phase_module.phase_id,
                "phase_name": a.phase_module.phase.name,
                "deleted_at": a.deleted_at.isoformat() if a.deleted_at else None,
                "expires_at": expires(a.deleted_at),
            }
            for a in activities
            if a.phase_module and a.phase_module.phase
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
                "phase_id": m.phase_id,
                "phase_name": m.phase.name if m.phase else None,
                "deleted_at": m.deleted_at.isoformat() if m.deleted_at else None,
                "expires_at": expires(m.deleted_at),
            }
            for m in meetings
        ],
        "documents": [
            {
                "id": d.id,
                "original_filename": d.original_filename,
                "category": d.category,
                "attached_to": _document_attached_to(d),
                "deleted_at": d.deleted_at.isoformat() if d.deleted_at else None,
                "expires_at": expires(d.deleted_at),
            }
            for d in documents
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
        for phase in item.phases:
            _restore_phase(db, phase)

    elif entity == "phases":
        item = db.query(models.Phase).filter(models.Phase.id == item_id, models.Phase.is_deleted == True).first()
        if not item:
            raise HTTPException(status_code=404, detail="Phase not found in recycle bin")
        _not_expired(item)
        if item.client and item.client.is_deleted:
            raise HTTPException(status_code=400, detail="Restore the client first")
        _restore_phase(db, item)

    elif entity == "activities":
        item = db.query(models.Activity).filter(models.Activity.id == item_id, models.Activity.is_deleted == True).first()
        if not item:
            raise HTTPException(status_code=404, detail="Activity not found in recycle bin")
        _not_expired(item)
        pm = item.phase_module
        if pm.is_deleted or pm.phase.is_deleted or (pm.phase.client and pm.phase.client.is_deleted):
            raise HTTPException(status_code=400, detail="Restore the parent phase/client first")
        item.is_deleted = False
        item.deleted_at = None
        for ci in item.checklist_items:
            ci.is_deleted = False
            ci.deleted_at = None
        db.flush()
        recompute_phase_module_progress(db, pm)

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
        if item.phase and item.phase.is_deleted:
            raise HTTPException(status_code=400, detail="Restore the parent phase first")
        item.is_deleted = False
        item.deleted_at = None

    elif entity == "documents":
        item = db.query(models.Document).filter(models.Document.id == item_id, models.Document.is_deleted == True).first()
        if not item:
            raise HTTPException(status_code=404, detail="Document not found in recycle bin")
        _not_expired(item)
        if item.client_id is not None and item.client and item.client.is_deleted:
            raise HTTPException(status_code=400, detail="Restore the parent client first")
        if item.phase_id is not None and item.phase and item.phase.is_deleted:
            raise HTTPException(status_code=400, detail="Restore the parent phase first")
        if item.activity_id is not None and item.activity and item.activity.is_deleted:
            raise HTTPException(status_code=400, detail="Restore the parent activity first")
        item.is_deleted = False
        item.deleted_at = None

    else:
        raise HTTPException(status_code=400, detail=f"Unknown entity '{entity}'")

    db.commit()
    log_activity(db, current_user.id, entity, "restore", f"Restored {entity} #{item_id}")
    return {"restored": True, "entity": entity, "id": item_id}
