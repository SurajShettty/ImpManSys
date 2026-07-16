from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.dependencies import require_role

router = APIRouter()


@router.get("/", response_model=List[schemas.RoleResponse])
def list_roles(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("Administrator")),
):
    return db.query(models.Role).order_by(models.Role.name).all()
