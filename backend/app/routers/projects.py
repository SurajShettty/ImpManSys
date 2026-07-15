from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.dependencies import get_current_active_user, require_role
from app.utils.audit import log_activity
from app.services.templates import generate_module_plan, recompute_project_progress

router = APIRouter()

MANAGER_ROLES = ("Administrator", "Customer Success Manager", "Project Manager")


@router.get("/", response_model=List[schemas.ProjectResponse])
def list_projects(
    client_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    query = db.query(models.Project)
    if client_id is not None:
        query = query.filter(models.Project.client_id == client_id)
    return query.order_by(models.Project.created_at.desc()).all()


@router.post("/", response_model=schemas.ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(*MANAGER_ROLES)),
):
    client = db.query(models.Client).filter(models.Client.id == payload.client_id).first()
    if not client:
        raise HTTPException(status_code=400, detail="Client not found")

    project = models.Project(**payload.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    log_activity(db, current_user.id, "project", "create", f"Created project '{project.name}'")
    return project


@router.get("/{project_id}", response_model=schemas.ProjectResponse)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/{project_id}", response_model=schemas.ProjectResponse)
def update_project(
    project_id: int,
    payload: schemas.ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(*MANAGER_ROLES)),
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    log_activity(db, current_user.id, "project", "update", f"Updated project '{project.name}'")
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("Administrator", "Project Manager")),
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
    log_activity(db, current_user.id, "project", "delete", f"Deleted project #{project_id}")


# ---------- Project modules (with automatic plan generation) ----------


@router.get("/{project_id}/modules", response_model=List[schemas.ProjectModuleResponse])
def list_project_modules(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project.project_modules


@router.post(
    "/{project_id}/modules",
    response_model=schemas.ProjectModuleDetail,
    status_code=status.HTTP_201_CREATED,
)
def add_project_module(
    project_id: int,
    payload: schemas.ProjectModuleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(*MANAGER_ROLES)),
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    module = db.query(models.Module).filter(models.Module.id == payload.module_id).first()
    if not module:
        raise HTTPException(status_code=400, detail="Module not found")

    existing = (
        db.query(models.ProjectModule)
        .filter(
            models.ProjectModule.project_id == project_id,
            models.ProjectModule.module_id == payload.module_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Module already added to this project")

    project_module = models.ProjectModule(project=project, module=module)
    db.add(project_module)
    # Selecting a module automatically generates its implementation plan (SOP 3.3 / 6).
    generate_module_plan(db, project_module)
    recompute_project_progress(db, project)
    db.commit()
    db.refresh(project_module)
    log_activity(
        db,
        current_user.id,
        "project_module",
        "create",
        f"Added module '{module.name}' to project '{project.name}'",
    )
    return project_module


@router.delete(
    "/{project_id}/modules/{project_module_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_project_module(
    project_id: int,
    project_module_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(*MANAGER_ROLES)),
):
    project_module = (
        db.query(models.ProjectModule)
        .filter(
            models.ProjectModule.id == project_module_id,
            models.ProjectModule.project_id == project_id,
        )
        .first()
    )
    if not project_module:
        raise HTTPException(status_code=404, detail="Project module not found")

    project = project_module.project
    db.delete(project_module)
    db.commit()
    recompute_project_progress(db, project)
    db.commit()
    log_activity(
        db, current_user.id, "project_module", "delete", f"Removed module #{project_module_id}"
    )


@router.get("/{project_id}/plan", response_model=List[schemas.ProjectModuleDetail])
def get_project_plan(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Full drill-down: every module with its phases, tasks and checklists."""
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project.project_modules
