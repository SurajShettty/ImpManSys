from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict


# ---------- Role ----------
class RoleBase(BaseModel):
    name: str
    description: str | None = None


class RoleCreate(RoleBase):
    pass


class RoleResponse(RoleBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- User ----------
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role_id: int
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    role_id: int | None = None
    is_active: bool | None = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime
    role: RoleResponse | None = None


class UserInToken(BaseModel):
    id: int
    email: str
    role_id: int
    role_name: str


# ---------- Auth ----------
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: int | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ---------- Activity Log ----------
class ActivityLogCreate(BaseModel):
    entity: str
    action: str
    details: str | None = None


class ActivityLogResponse(ActivityLogCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int | None
    timestamp: datetime


# ---------- Generic ----------
class HealthCheck(BaseModel):
    status: str
    version: str = "0.1.0"
