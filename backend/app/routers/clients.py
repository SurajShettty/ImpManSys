from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.dependencies import get_current_active_user, require_role
from app.utils.audit import log_activity

router = APIRouter()

# Roles allowed to create/modify implementation data.
MANAGER_ROLES = ("Administrator", "Customer Success Manager", "Project Manager")


def _with_counts(client: models.Client) -> models.Client:
    client.project_count = len(client.projects)
    return client


@router.get("/", response_model=List[schemas.ClientResponse])
def list_clients(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    clients = db.query(models.Client).order_by(models.Client.name).all()
    return [_with_counts(c) for c in clients]


@router.post("/", response_model=schemas.ClientResponse, status_code=status.HTTP_201_CREATED)
def create_client(
    payload: schemas.ClientCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(*MANAGER_ROLES)),
):
    client = models.Client(**payload.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    log_activity(db, current_user.id, "client", "create", f"Created client '{client.name}'")
    return _with_counts(client)


@router.get("/{client_id}", response_model=schemas.ClientResponse)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return _with_counts(client)


@router.put("/{client_id}", response_model=schemas.ClientResponse)
def update_client(
    client_id: int,
    payload: schemas.ClientUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(*MANAGER_ROLES)),
):
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(client, field, value)
    db.commit()
    db.refresh(client)
    log_activity(db, current_user.id, "client", "update", f"Updated client '{client.name}'")
    return _with_counts(client)


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("Administrator")),
):
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    db.delete(client)
    db.commit()
    log_activity(db, current_user.id, "client", "delete", f"Deleted client #{client_id}")


@router.get("/{client_id}/projects", response_model=List[schemas.ProjectResponse])
def list_client_projects(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return (
        db.query(models.Project)
        .filter(models.Project.client_id == client_id)
        .order_by(models.Project.created_at.desc())
        .all()
    )
