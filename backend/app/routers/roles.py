from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.dependencies import require_permission

router = APIRouter()


@router.get("/", response_model=List[schemas.RoleResponse])
def list_roles(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("role.manage")),
):
    return db.query(models.Role).order_by(models.Role.name).all()


@router.get("/{role_id}/permissions", response_model=schemas.RolePermissionResponse)
def get_role_permissions(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("role.manage")),
):
    role = db.query(models.Role).filter(models.Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return {"role_id": role.id, "permissions": role.permissions}


@router.put("/{role_id}/permissions")
def update_role_permissions(
    role_id: int,
    payload: schemas.RolePermissionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("role.manage")),
):
    role = db.query(models.Role).filter(models.Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.name == "Administrator":
        raise HTTPException(status_code=400, detail="Administrator role permissions cannot be changed")

    valid_permissions = (
        db.query(models.Permission)
        .filter(models.Permission.code.in_(payload.permission_codes))
        .all()
    )
    valid_codes = {p.code for p in valid_permissions}
    invalid = [code for code in payload.permission_codes if code not in valid_codes]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid permission codes: {', '.join(invalid)}")

    role.permissions = valid_permissions
    db.commit()
    db.refresh(role)
    return {"role_id": role.id, "permissions": [schemas.PermissionResponse.model_validate(p).model_dump() for p in role.permissions]}


@router.get("/permissions/all", response_model=List[schemas.PermissionResponse])
def list_permissions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("role.manage")),
):
    return db.query(models.Permission).order_by(models.Permission.category, models.Permission.name).all()
