from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Date,
    Float,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)

    users = relationship("User", back_populates="role")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    role = relationship("Role", back_populates="users")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    entity = Column(String(50), nullable=False)  # e.g. client, project, task
    action = Column(String(50), nullable=False)  # e.g. create, update, delete
    timestamp = Column(DateTime, default=utc_now, nullable=False)
    details = Column(Text, nullable=True)

    user = relationship("User")


# ---------------------------------------------------------------------------
# Implementation hierarchy: Client -> Project -> Module -> Phase -> Task
# Reference: docs/IMS_Database_Design.md and docs/Implementation_Management_System_SOP.md
# ---------------------------------------------------------------------------


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    crm_id = Column(String(50), nullable=True)
    institution_type = Column(String(100), nullable=True)
    status = Column(String(30), nullable=False, default="Active")  # Active/On Hold/Completed/Churned
    priority = Column(String(20), nullable=False, default="Medium")  # Critical/High/Medium/Low
    contract_start = Column(Date, nullable=True)
    contract_end = Column(Date, nullable=True)
    go_live_date = Column(Date, nullable=True)
    csm_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Customer Success Manager
    pm_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Project Manager
    sales_owner = Column(String(100), nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    csm = relationship("User", foreign_keys=[csm_id])
    pm = relationship("User", foreign_keys=[pm_id])
    projects = relationship(
        "Project", back_populates="client", cascade="all, delete-orphan"
    )


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(String(50), nullable=False, default="New Implementation")
    status = Column(String(30), nullable=False, default="Not Started")
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    progress = Column(Float, nullable=False, default=0.0)  # 0-100, derived from modules
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    client = relationship("Client", back_populates="projects")
    project_modules = relationship(
        "ProjectModule", back_populates="project", cascade="all, delete-orphan"
    )


class Module(Base):
    """Master catalogue of implementable modules (Admissions, Attendance, ...)."""

    __tablename__ = "modules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    category = Column(String(50), nullable=True)
    description = Column(String(255), nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)


class ProjectModule(Base):
    """A module selected for a specific project (generates its own phase/task plan)."""

    __tablename__ = "project_modules"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False)
    status = Column(String(30), nullable=False, default="Not Started")
    progress = Column(Float, nullable=False, default=0.0)  # 0-100, derived from tasks
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    project = relationship("Project", back_populates="project_modules")
    module = relationship("Module")
    phases = relationship(
        "Phase", back_populates="project_module", cascade="all, delete-orphan"
    )


class Phase(Base):
    __tablename__ = "phases"

    id = Column(Integer, primary_key=True, index=True)
    project_module_id = Column(
        Integer, ForeignKey("project_modules.id"), nullable=False, index=True
    )
    name = Column(String(100), nullable=False)
    sequence = Column(Integer, nullable=False, default=0)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)

    project_module = relationship("ProjectModule", back_populates="phases")
    tasks = relationship(
        "Task",
        back_populates="phase",
        cascade="all, delete-orphan",
        order_by="Task.sequence",
    )


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    phase_id = Column(Integer, ForeignKey("phases.id"), nullable=False, index=True)
    parent_task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(String(20), nullable=False, default="Medium")
    status = Column(String(30), nullable=False, default="Not Started")
    start_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True)
    estimated_hours = Column(Float, nullable=True)
    actual_hours = Column(Float, nullable=True)
    progress = Column(Float, nullable=False, default=0.0)  # 0-100
    sequence = Column(Integer, nullable=False, default=0)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    phase = relationship("Phase", back_populates="tasks")
    owner = relationship("User", foreign_keys=[owner_id])
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    checklist_items = relationship(
        "ChecklistItem", back_populates="task", cascade="all, delete-orphan"
    )
    dependencies = relationship(
        "TaskDependency",
        back_populates="task",
        foreign_keys="TaskDependency.task_id",
        cascade="all, delete-orphan",
    )


class ChecklistItem(Base):
    __tablename__ = "checklist_items"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False, index=True)
    item = Column(String(255), nullable=False)
    completed = Column(Boolean, nullable=False, default=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)

    task = relationship("Task", back_populates="checklist_items")


class TaskDependency(Base):
    __tablename__ = "task_dependencies"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False, index=True)
    depends_on_task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)

    task = relationship("Task", back_populates="dependencies", foreign_keys=[task_id])
    depends_on = relationship("Task", foreign_keys=[depends_on_task_id])
