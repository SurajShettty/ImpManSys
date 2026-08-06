from __future__ import annotations

from datetime import datetime, date
from pydantic import BaseModel, EmailStr, ConfigDict, field_validator


# ---------- Role ----------
class RoleBase(BaseModel):
    name: str
    description: str | None = None


class RoleCreate(RoleBase):
    pass


class RoleResponse(RoleBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- Permissions ----------
class PermissionBase(BaseModel):
    code: str
    name: str
    description: str | None = None
    category: str | None = None


class PermissionCreate(PermissionBase):
    pass


class PermissionResponse(PermissionBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


class RolePermissionUpdate(BaseModel):
    permission_codes: list[str]


class RolePermissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    role_id: int
    permissions: list[PermissionResponse] = []


# ---------- User ----------
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role_id: int
    client_id: int | None = None  # set when role_id refers to the "Client" role
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    role_id: int | None = None
    client_id: int | None = None
    is_active: bool | None = None
    password: str | None = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str  # output as plain string so special-use domains (e.g. .local) don't break responses
    created_at: datetime
    updated_at: datetime
    role: RoleResponse | None = None


class UserInToken(BaseModel):
    id: int
    email: str
    role_id: int
    role_name: str
    permissions: list[str] = []


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


# ---------- Notification ----------
class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activity_id: int | None = None
    client_id: int | None = None
    meeting_id: int | None = None
    type: str
    message: str
    is_read: bool
    created_at: datetime
    read_at: datetime | None = None
    phase_id: int | None = None
    client_name: str | None = None


# ---------- Reusable mini user ----------
class UserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str  # plain string on output to avoid strict email validation for existing data


# ---------- Reusable mini phase ----------
class PhaseBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


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
    pm_id: int | None = None
    sales_owner: str | None = None

    # Client tracker fields
    instance_link: str | None = None
    region: str | None = None
    state: str | None = None
    implementation_state: str | None = None
    new_recurring: str | None = None
    kickoff_meeting_date: date | None = None
    agreed_go_live_date: date | None = None
    billing_date: date | None = None
    tracker_link: str | None = None
    master_data_status: str | None = None
    total_users: int | None = None


class ClientCreate(ClientBase):
    institution_type: str
    region: str
    state: str
    instance_link: str
    csm_ids: list[int]
    rm_ids: list[int]

    @field_validator("name", "institution_type", "region", "state", "instance_link")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("This field is required")
        return v

    @field_validator("csm_ids", "rm_ids")
    @classmethod
    def _at_least_one(cls, v: list[int]) -> list[int]:
        if not v:
            raise ValueError("At least one must be selected")
        return v


class ClientUpdate(BaseModel):
    name: str | None = None
    crm_id: str | None = None
    institution_type: str | None = None
    status: str | None = None
    priority: str | None = None
    contract_start: date | None = None
    contract_end: date | None = None
    go_live_date: date | None = None
    csm_ids: list[int] | None = None
    pm_id: int | None = None
    rm_ids: list[int] | None = None
    sales_owner: str | None = None

    # Client tracker fields
    instance_link: str | None = None
    region: str | None = None
    state: str | None = None
    implementation_state: str | None = None
    new_recurring: str | None = None
    kickoff_meeting_date: date | None = None
    agreed_go_live_date: date | None = None
    billing_date: date | None = None
    tracker_link: str | None = None
    master_data_status: str | None = None
    total_users: int | None = None


class ClientResponse(ClientBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime
    pm: UserBrief | None = None
    csms: list[UserBrief] = []
    rms: list[UserBrief] = []
    phase_count: int = 0


# ---------- Phase ----------
class PhaseBase(BaseModel):
    name: str
    description: str | None = None
    type: str = "New Implementation"
    status: str = "Not Started"
    start_date: date | None = None
    end_date: date | None = None


class PhaseCreate(PhaseBase):
    client_id: int


class PhaseUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    type: str | None = None
    status: str | None = None
    start_date: date | None = None
    end_date: date | None = None


class PhaseResponse(PhaseBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    client_id: int
    client_name: str | None = None
    progress: float
    module_names: list[str] = []
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
    activity_id: int


# ---------- Activity ----------
class ActivityBase(BaseModel):
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
    client_spoc: str | None = None
    client_spoc_email: str | None = None
    client_spoc_phone: str | None = None
    uat_proposed: bool = False
    delay_reason: str | None = None
    client_response: str | None = None
    internal_response: str | None = None
    external_link: str | None = None
    category: str = "Regular"
    proposed_timeline: date | None = None
    module_status: str | None = None


class ActivityCreate(ActivityBase):
    phase_module_id: int


class ActivityUpdate(BaseModel):
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
    client_spoc: str | None = None
    client_spoc_email: str | None = None
    client_spoc_phone: str | None = None
    uat_proposed: bool | None = None
    delay_reason: str | None = None
    client_response: str | None = None
    internal_response: str | None = None
    external_link: str | None = None
    category: str | None = None
    proposed_timeline: date | None = None
    module_status: str | None = None
    depends_on_activity_ids: list[int] | None = None


# ---------- Reusable mini activity (dependency display) ----------
class ActivityDependencyBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    status: str


class ActivityResponse(ActivityBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    phase_module_id: int
    parent_activity_id: int | None = None
    progress: float
    sequence: int = 0
    created_at: datetime
    updated_at: datetime
    owner: UserBrief | None = None
    reviewer: UserBrief | None = None
    checklist_items: list[ChecklistItemResponse] = []
    depends_on: list[ActivityDependencyBrief] = []


# ---------- Activity (client portal - internal-only fields omitted) ----------
class ActivityPortalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    phase_module_id: int
    title: str
    description: str | None = None
    priority: str
    status: str
    due_date: date | None = None
    progress: float
    category: str
    proposed_timeline: date | None = None
    client_spoc: str | None = None
    client_spoc_email: str | None = None
    client_spoc_phone: str | None = None
    uat_proposed: bool
    client_response: str | None = None
    updated_at: datetime
    checklist_items: list[ChecklistItemResponse] = []


class ActivityClientResponseUpdate(BaseModel):
    client_response: str | None = None


class ChecklistItemPortalUpdate(BaseModel):
    completed: bool


# ---------- Phase module ----------
class PhaseModuleCreate(BaseModel):
    module_id: int


class PhaseModuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    phase_id: int
    module_id: int
    status: str
    progress: float
    module: ModuleResponse | None = None


class PhaseModuleDetail(PhaseModuleResponse):
    activities: list[ActivityResponse] = []


# ---------- Meeting ----------
class MeetingBase(BaseModel):
    title: str
    meeting_date: date
    participants: str | None = None
    discussion: str | None = None
    decisions: str | None = None
    action_items: str | None = None
    next_follow_up: date | None = None
    client_visible: bool = False


class MeetingCreate(MeetingBase):
    pass


class MeetingUpdate(BaseModel):
    title: str | None = None
    meeting_date: date | None = None
    participants: str | None = None
    discussion: str | None = None
    decisions: str | None = None
    action_items: str | None = None
    next_follow_up: date | None = None
    client_visible: bool | None = None


class MeetingResponse(MeetingBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    phase_id: int
    created_by: int | None = None
    created_at: datetime
    updated_at: datetime
    creator: UserBrief | None = None
    phase: PhaseBrief | None = None


# ---------- Meeting (client portal) ----------
class MeetingPortalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    phase_id: int
    title: str
    meeting_date: date
    participants: str | None = None
    discussion: str | None = None
    decisions: str | None = None
    action_items: str | None = None
    next_follow_up: date | None = None
    phase: PhaseBrief | None = None


# ---------- Document ----------
class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    client_id: int | None = None
    phase_id: int | None = None
    activity_id: int | None = None
    category: str
    original_filename: str
    content_type: str | None = None
    size_bytes: int
    created_at: datetime
    uploader: UserBrief | None = None


# ---------- Generic ----------
class HealthCheck(BaseModel):
    status: str
    version: str = "0.1.0"
