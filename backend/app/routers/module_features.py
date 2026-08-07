from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas
from app.dependencies import require_permission
from app.utils.audit import log_activity

router = APIRouter()

FEATURE_REQUEST_TYPES = ["Feature", "Enhancement", "Bug"]
FEATURE_REQUEST_STATUSES = ["Requested", "In Progress", "Done", "Rejected"]
FEATURE_REQUEST_PRIORITIES = ["Low", "Medium", "High"]


def _load(db: Session, request_id: int) -> models.ModuleFeatureRequest:
    item = (
        db.query(models.ModuleFeatureRequest)
        .filter(
            models.ModuleFeatureRequest.id == request_id,
            models.ModuleFeatureRequest.is_deleted == False,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Feature request not found")
    return item


@router.get("/", response_model=List[schemas.ModuleFeatureRequestResponse])
def list_feature_requests(
    module_id: int | None = None,
    status_: str | None = Query(None, alias="status"),
    type_: str | None = Query(None, alias="type"),
    priority: str | None = None,
    requested_by: int | None = None,
    requested_by_client_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("feature_request.view")),
):
    query = db.query(models.ModuleFeatureRequest).filter(models.ModuleFeatureRequest.is_deleted == False)
    if module_id is not None:
        query = query.filter(models.ModuleFeatureRequest.module_id == module_id)
    if status_ is not None:
        query = query.filter(models.ModuleFeatureRequest.status == status_)
    if type_ is not None:
        query = query.filter(models.ModuleFeatureRequest.type == type_)
    if priority is not None:
        query = query.filter(models.ModuleFeatureRequest.priority == priority)
    if requested_by is not None:
        query = query.filter(models.ModuleFeatureRequest.requested_by == requested_by)
    if requested_by_client_id is not None:
        query = query.filter(models.ModuleFeatureRequest.requested_by_client_id == requested_by_client_id)
    return query.order_by(models.ModuleFeatureRequest.created_at.desc()).all()


@router.post("/", response_model=schemas.ModuleFeatureRequestResponse, status_code=status.HTTP_201_CREATED)
def create_feature_request(
    payload: schemas.ModuleFeatureRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("feature_request.create")),
):
    module = (
        db.query(models.Module)
        .filter(models.Module.id == payload.module_id, models.Module.is_deleted == False)
        .first()
    )
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    if payload.requested_by_client_id is not None:
        client = (
            db.query(models.Client)
            .filter(models.Client.id == payload.requested_by_client_id, models.Client.is_deleted == False)
            .first()
        )
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

    data = payload.model_dump()
    if data.get("type") not in FEATURE_REQUEST_TYPES:
        data["type"] = "Feature"
    if data.get("status") not in FEATURE_REQUEST_STATUSES:
        data["status"] = "Requested"
    if data.get("priority") not in FEATURE_REQUEST_PRIORITIES:
        data["priority"] = "Medium"

    item = models.ModuleFeatureRequest(**data, requested_by=current_user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    log_activity(
        db, current_user.id, "module_feature_request", "create",
        f"Requested '{item.title}' for module '{module.name}'",
    )
    return item


@router.put("/{request_id}", response_model=schemas.ModuleFeatureRequestResponse)
def update_feature_request(
    request_id: int,
    payload: schemas.ModuleFeatureRequestUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("feature_request.update")),
):
    item = _load(db, request_id)
    updates = payload.model_dump(exclude_unset=True)

    if "module_id" in updates:
        module = (
            db.query(models.Module)
            .filter(models.Module.id == updates["module_id"], models.Module.is_deleted == False)
            .first()
        )
        if not module:
            raise HTTPException(status_code=404, detail="Module not found")
    if updates.get("requested_by_client_id") is not None:
        client = (
            db.query(models.Client)
            .filter(models.Client.id == updates["requested_by_client_id"], models.Client.is_deleted == False)
            .first()
        )
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
    if "type" in updates and updates["type"] not in FEATURE_REQUEST_TYPES:
        updates.pop("type")
    if "status" in updates and updates["status"] not in FEATURE_REQUEST_STATUSES:
        updates.pop("status")
    if "priority" in updates and updates["priority"] not in FEATURE_REQUEST_PRIORITIES:
        updates.pop("priority")

    for key, value in updates.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    log_activity(db, current_user.id, "module_feature_request", "update", f"Updated '{item.title}'")
    return item


@router.delete("/{request_id}", status_code=204)
def delete_feature_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("feature_request.delete")),
):
    item = _load(db, request_id)
    item.is_deleted = True
    item.deleted_at = models.utc_now()
    db.commit()
    log_activity(db, current_user.id, "module_feature_request", "delete", f"Deleted '{item.title}'")
