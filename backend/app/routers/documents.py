from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.dependencies import require_permission
from app.utils.audit import log_activity
from app.services.access import ensure_client_access
from app.services import documents as documents_service

router = APIRouter()


def _load_document(db: Session, document_id: int, current_user: models.User) -> models.Document:
    document = (
        db.query(models.Document)
        .filter(models.Document.id == document_id, models.Document.is_deleted == False)
        .first()
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    client_id = document.client_id
    if client_id is None and document.phase_id is not None:
        client_id = document.phase.client_id
    if client_id is None and document.activity_id is not None:
        client_id = document.activity.phase_module.phase.client_id
    ensure_client_access(db, current_user, client_id)
    return document


@router.get("/", response_model=List[schemas.DocumentResponse])
def list_documents(
    client_id: int | None = None,
    phase_id: int | None = None,
    activity_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("document.view")),
):
    owning_client_id, client_id, phase_id, activity_id = documents_service.resolve_client_id(
        db, client_id=client_id, phase_id=phase_id, activity_id=activity_id
    )
    ensure_client_access(db, current_user, owning_client_id)

    query = db.query(models.Document).filter(models.Document.is_deleted == False)
    if client_id is not None:
        query = query.filter(models.Document.client_id == client_id)
    elif phase_id is not None:
        query = query.filter(models.Document.phase_id == phase_id)
    else:
        query = query.filter(models.Document.activity_id == activity_id)

    return query.order_by(models.Document.created_at.desc()).all()


@router.post("/upload", response_model=schemas.DocumentResponse, status_code=201)
def upload_document(
    file: UploadFile = File(...),
    category: str = Form("Other"),
    client_id: int | None = Form(None),
    phase_id: int | None = Form(None),
    activity_id: int | None = Form(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("document.upload")),
):
    owning_client_id, client_id, phase_id, activity_id = documents_service.resolve_client_id(
        db, client_id=client_id, phase_id=phase_id, activity_id=activity_id
    )
    ensure_client_access(db, current_user, owning_client_id)

    if category not in documents_service.DOCUMENT_CATEGORIES:
        category = "Other"

    stored_filename, size_bytes, content_type = documents_service.save_upload(file)

    document = models.Document(
        client_id=client_id,
        phase_id=phase_id,
        activity_id=activity_id,
        category=category,
        original_filename=file.filename or stored_filename,
        stored_filename=stored_filename,
        content_type=content_type,
        size_bytes=size_bytes,
        uploaded_by=current_user.id,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    log_activity(db, current_user.id, "document", "upload", f"Uploaded document '{document.original_filename}'")
    return document


@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("document.view")),
):
    document = _load_document(db, document_id, current_user)
    path = documents_service.document_path(document.stored_filename)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File is missing from storage")
    return FileResponse(
        path,
        media_type=document.content_type or "application/octet-stream",
        filename=document.original_filename,
    )


@router.delete("/{document_id}", status_code=204)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("document.delete")),
):
    document = _load_document(db, document_id, current_user)
    document.is_deleted = True
    document.deleted_at = models.utc_now()
    db.commit()
    log_activity(db, current_user.id, "document", "delete", f"Deleted document '{document.original_filename}'")
