from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.dependencies import get_current_active_user, require_role
from app.utils.audit import log_activity

router = APIRouter()


@router.get("/", response_model=List[schemas.ModuleResponse])
def list_modules(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """The master catalogue of implementable modules (SOP section 5, stage 3)."""
    return db.query(models.Module).order_by(models.Module.name).all()


@router.post("/", response_model=schemas.ModuleResponse, status_code=status.HTTP_201_CREATED)
def create_module(
    payload: schemas.ModuleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("Administrator")),
):
    existing = db.query(models.Module).filter(models.Module.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Module already exists")
    module = models.Module(**payload.model_dump())
    db.add(module)
    db.commit()
    db.refresh(module)
    log_activity(db, current_user.id, "module", "create", f"Created module '{module.name}'")
    return module
