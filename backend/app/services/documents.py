"""Document storage: files attached to a Client, Phase, or Activity, saved
outside the app's public uploads/ directory (see models.Document docstring)
and served only through the authenticated /api/documents/{id}/download
endpoint.
"""
import os
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app import models
from app.config import get_settings

ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".png", ".jpg", ".jpeg", ".zip",
}

DOCUMENT_CATEGORIES = ["Contract", "SOW", "UAT Sign-off", "Training Deck", "Other"]


def _documents_root() -> Path:
    settings = get_settings()
    root = Path(settings.documents_dir)
    root.mkdir(parents=True, exist_ok=True)
    return root


def document_path(stored_filename: str) -> Path:
    return _documents_root() / stored_filename


def save_upload(upload_file: UploadFile) -> tuple[str, int, str | None]:
    """Validate and persist an uploaded file. Returns (stored_filename, size_bytes, content_type)."""
    settings = get_settings()
    ext = Path(upload_file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type '{ext or 'unknown'}' is not allowed")

    max_bytes = settings.max_document_size_mb * 1024 * 1024
    stored_filename = f"{uuid.uuid4().hex}{ext}"
    dest = document_path(stored_filename)

    size = 0
    with open(dest, "wb") as out:
        while chunk := upload_file.file.read(1024 * 1024):
            size += len(chunk)
            if size > max_bytes:
                out.close()
                os.remove(dest)
                raise HTTPException(
                    status_code=400,
                    detail=f"File exceeds the {settings.max_document_size_mb}MB limit",
                )
            out.write(chunk)

    return stored_filename, size, upload_file.content_type


def resolve_client_id(
    db: Session, *, client_id: int | None, phase_id: int | None, activity_id: int | None
) -> tuple[int, int | None, int | None, int | None]:
    """Given exactly one of client_id/phase_id/activity_id, validate the
    target exists and return (owning_client_id, client_id, phase_id, activity_id)
    with the other two normalized to None."""
    provided = [v for v in (client_id, phase_id, activity_id) if v is not None]
    if len(provided) != 1:
        raise HTTPException(status_code=400, detail="Provide exactly one of client_id, phase_id, or activity_id")

    if client_id is not None:
        client = db.query(models.Client).filter(models.Client.id == client_id, models.Client.is_deleted == False).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        return client.id, client.id, None, None

    if phase_id is not None:
        phase = db.query(models.Phase).filter(models.Phase.id == phase_id, models.Phase.is_deleted == False).first()
        if not phase:
            raise HTTPException(status_code=404, detail="Phase not found")
        return phase.client_id, None, phase.id, None

    activity = db.query(models.Activity).filter(models.Activity.id == activity_id, models.Activity.is_deleted == False).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    return activity.phase_module.phase.client_id, None, None, activity.id


def cascade_delete_documents(
    db: Session, *, client_id: int | None = None, phase_ids: list[int] | None = None, activity_ids: list[int] | None = None
) -> None:
    """Soft-delete any Document rows attached to the given client/phases/
    activities, so a deleted parent doesn't leave its documents active."""
    conditions = []
    if client_id is not None:
        conditions.append(models.Document.client_id == client_id)
    if phase_ids:
        conditions.append(models.Document.phase_id.in_(phase_ids))
    if activity_ids:
        conditions.append(models.Document.activity_id.in_(activity_ids))
    if not conditions:
        return

    now = models.utc_now()
    docs = db.query(models.Document).filter(or_(*conditions), models.Document.is_deleted == False).all()
    for doc in docs:
        doc.is_deleted = True
        doc.deleted_at = now
