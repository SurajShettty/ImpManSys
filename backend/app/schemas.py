from datetime import datetime, date
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


# ---------- Reusable mini user ----------
class UserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: EmailStr


# ---------- Client ----------
class ClientBase(BaseModel):
    name: str
    crm_id: str | None = None
    institution_type: str | None = None
    status: str = "Active"
    priority: str = "Medium"
    contract_start: date | None = None
    contract_end: date | None = None
    go_live_date: date | None = None
    csm_id: int | None = None
    pm_id: int | None = None
    sales_owner: str | None = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: str | None = None
    crm_id: str | None = None
    institution_type: str | None = None
    status: str | None = None
    priority: str | None = None
    contract_start: date | None = None
    contract_end: date | None = None
    go_live_date: date | None = None
    csm_id: int | None = None
    pm_id: int | None = None
    sales_owner: str | None = None


class ClientResponse(ClientBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime
    csm: UserBrief | None = None
    pm: UserBrief | None = None
    project_count: int = 0


# ---------- Project ----------
class ProjectBase(BaseModel):
    name: str
    description: str | None = None
    type: str = "New Implementation"
    status: str = "Not Started"
    start_date: date | None = None
    end_date: date | None = None


class ProjectCreate(ProjectBase):
    client_id: int


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    type: str | None = None
    status: str | None = None
    start_date: date | None = None
    end_date: date | None = None


class ProjectResponse(ProjectBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    client_id: int
    progress: float
    created_at: datetime
    updated_at: datetime


# ---------- Module catalogue ----------
class ModuleBase(BaseModel):
    name: str
    category: str | None = None
    description: str | None = None


class ModuleCreate(ModuleBase):
    pass


class ModuleResponse(ModuleBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- Checklist ----------
class ChecklistItemBase(BaseModel):
    item: str
    completed: bool = False


class ChecklistItemCreate(ChecklistItemBase):
    pass


class ChecklistItemUpdate(BaseModel):
    item: str | None = None
    completed: bool | None = None


class ChecklistItemResponse(ChecklistItemBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    task_id: int


# ---------- Task ----------
class TaskBase(BaseModel):
    title: str
    description: str | None = None
    priority: str = "Medium"
    status: str = "Not Started"
    start_date: date | None = None
    due_date: date | None = None
    estimated_hours: float | None = None
    actual_hours: float | None = None
    owner_id: int | None = None
    reviewer_id: int | None = None


class TaskCreate(TaskBase):
    phase_id: int
    parent_task_id: int | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: str | None = None
    status: str | None = None
    start_date: date | None = None
    due_date: date | None = None
    estimated_hours: float | None = None
    actual_hours: float | None = None
    owner_id: int | None = None
    reviewer_id: int | None = None
    progress: float | None = None


class TaskResponse(TaskBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    phase_id: int
    parent_task_id: int | None = None
    progress: float
    created_at: datetime
    updated_at: datetime
    owner: UserBrief | None = None
    reviewer: UserBrief | None = None
    checklist_items: list[ChecklistItemResponse] = []


# ---------- Phase ----------
class PhaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_module_id: int
    name: str
    sequence: int
    tasks: list[TaskResponse] = []


# ---------- Project module ----------
class ProjectModuleCreate(BaseModel):
    module_id: int


class ProjectModuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    module_id: int
    status: str
    progress: float
    module: ModuleResponse | None = None


class ProjectModuleDetail(ProjectModuleResponse):
    phases: list[PhaseResponse] = []


# ---------- Generic ----------
class HealthCheck(BaseModel):
    status: str
    version: str = "0.1.0"
