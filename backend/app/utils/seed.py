from sqlalchemy.orm import Session
from app import models
from app.auth import get_password_hash


DEFAULT_ROLES = [
    {"name": "Administrator", "description": "Full system access"},
    {"name": "Customer Success Manager", "description": "Manages client relationships"},
    {"name": "Relationship Manager", "description": "Owns specific client relationships"},
    {"name": "Project Manager", "description": "Manages phases and resources"},
    {"name": "Implementation Executive", "description": "Executes implementation activities"},
    {"name": "Support Team", "description": "Provides client support"},
    {"name": "Management", "description": "Views dashboards and reports"},
    {"name": "Client", "description": "Client portal view-only access"},
]

PERMISSIONS = [
    # System
    {"code": "dashboard.view", "name": "View Dashboard", "category": "System"},
    {"code": "search.view", "name": "Use Global Search", "category": "System"},
    {"code": "audit.view", "name": "View Audit Logs", "category": "System"},
    {"code": "recycle_bin.view", "name": "View Recycle Bin", "category": "System"},
    {"code": "recycle_bin.restore", "name": "Restore Deleted Items", "category": "System"},
    {"code": "role.manage", "name": "Manage Roles & Permissions", "category": "System"},
    {"code": "settings.manage", "name": "Manage Settings", "category": "System"},
    # Users
    {"code": "user.view", "name": "View Users", "category": "Users"},
    {"code": "user.create", "name": "Create Users", "category": "Users"},
    {"code": "user.update", "name": "Edit Users", "category": "Users"},
    {"code": "user.delete", "name": "Deactivate Users", "category": "Users"},
    # Clients
    {"code": "client.view", "name": "View Clients", "category": "Clients"},
    {"code": "client.create", "name": "Create Clients", "category": "Clients"},
    {"code": "client.update", "name": "Edit Clients", "category": "Clients"},
    {"code": "client.delete", "name": "Delete Clients", "category": "Clients"},
    # Phases (formerly projects)
    {"code": "phase.view", "name": "View Phases", "category": "Phases"},
    {"code": "phase.create", "name": "Create Phases", "category": "Phases"},
    {"code": "phase.update", "name": "Edit Phases", "category": "Phases"},
    {"code": "phase.delete", "name": "Delete Phases", "category": "Phases"},
    # Modules
    {"code": "module.view", "name": "View Modules", "category": "Modules"},
    {"code": "module.create", "name": "Add Modules", "category": "Modules"},
    {"code": "module.update", "name": "Edit Modules", "category": "Modules"},
    {"code": "module.delete", "name": "Remove Modules", "category": "Modules"},
    # Activities (formerly tasks)
    {"code": "activity.view", "name": "View Activities", "category": "Activities"},
    {"code": "activity.create", "name": "Create Activities", "category": "Activities"},
    {"code": "activity.update", "name": "Edit Activities", "category": "Activities"},
    {"code": "activity.delete", "name": "Delete Activities", "category": "Activities"},
    # Meetings
    {"code": "meeting.view", "name": "View Meetings", "category": "Meetings"},
    {"code": "meeting.create", "name": "Create Meetings", "category": "Meetings"},
    {"code": "meeting.update", "name": "Edit Meetings", "category": "Meetings"},
    {"code": "meeting.delete", "name": "Delete Meetings", "category": "Meetings"},
    # Documents
    {"code": "document.view", "name": "View Documents", "category": "Documents"},
    {"code": "document.upload", "name": "Upload Documents", "category": "Documents"},
    {"code": "document.delete", "name": "Delete Documents", "category": "Documents"},
]

# Permission codes that were renamed from the previous project/task terminology.
# Existing records are migrated on startup so role mappings are preserved.
PERMISSION_RENAMES = {
    "project.view": "phase.view",
    "project.create": "phase.create",
    "project.update": "phase.update",
    "project.delete": "phase.delete",
    "task.view": "activity.view",
    "task.create": "activity.create",
    "task.update": "activity.update",
    "task.delete": "activity.delete",
}

PERMISSION_NAME_MAP = {p["code"]: p["name"] for p in PERMISSIONS}

ROLE_PERMISSIONS = {
    "Administrator": [p["code"] for p in PERMISSIONS],
    "Management": [
        "dashboard.view",
        "search.view",
        "audit.view",
        "client.view",
        "phase.view",
        "module.view",
        "activity.view",
        "meeting.view",
        "document.view",
        "user.view",
        "recycle_bin.view",
        "recycle_bin.restore",
    ],
    "Customer Success Manager": [
        "dashboard.view",
        "search.view",
        "client.view",
        "client.create",
        "client.update",
        "phase.view",
        "phase.create",
        "phase.update",
        "phase.delete",
        "module.view",
        "module.create",
        "activity.view",
        "activity.create",
        "activity.update",
        "meeting.view",
        "meeting.create",
        "meeting.update",
        "meeting.delete",
        "document.view",
        "document.upload",
        "document.delete",
    ],
    "Relationship Manager": [
        "dashboard.view",
        "search.view",
        "client.view",
        "client.create",
        "client.update",
        "phase.view",
        "phase.create",
        "phase.update",
        "phase.delete",
        "module.view",
        "module.create",
        "activity.view",
        "activity.create",
        "activity.update",
        "meeting.view",
        "meeting.create",
        "meeting.update",
        "meeting.delete",
        "document.view",
        "document.upload",
        "document.delete",
    ],
    "Project Manager": [
        "dashboard.view",
        "search.view",
        "client.view",
        "phase.view",
        "phase.create",
        "phase.update",
        "phase.delete",
        "module.view",
        "module.create",
        "module.update",
        "module.delete",
        "activity.view",
        "activity.create",
        "activity.update",
        "activity.delete",
        "meeting.view",
        "meeting.create",
        "meeting.update",
        "meeting.delete",
        "document.view",
        "document.upload",
        "document.delete",
    ],
    "Implementation Executive": [
        "dashboard.view",
        "search.view",
        "client.view",
        "phase.view",
        "module.view",
        "activity.view",
        "activity.create",
        "activity.update",
        "meeting.view",
        "document.view",
        "document.upload",
    ],
    "Support Team": [
        "dashboard.view",
        "search.view",
        "client.view",
        "phase.view",
        "activity.view",
        "meeting.view",
        "document.view",
    ],
    # Client-portal logins get no internal permission codes: the /api/portal/*
    # router gates purely on role (require_role("Client")), scoped to their
    # own client_id via services.access. Granting internal codes here would
    # let a client user hit internal endpoints and see internal-only fields.
    "Client": [],
}

# Standard implementable modules from the product implementation sheet.
# "Kickoff" is added automatically to every phase; it is included here so the
# master catalogue has it available.
DEFAULT_MODULES = [
    {"name": "Kickoff", "category": "Onboarding"},
    {"name": "Master data Managament", "category": "Core"},
    {"name": "Admission Mangagement", "category": "Academic"},
    {"name": "Finance Managament", "category": "Administrative"},
    {"name": "Infrastructure Management", "category": "Infrastructure"},
    {"name": "Institutional Calendar", "category": "Academic"},
    {"name": "Academic Management System", "category": "Academic"},
    {"name": "Feedback Management", "category": "Engagement"},
    {"name": "Examination Management System", "category": "Academic"},
    {"name": "Learning Managment System", "category": "Academic"},
    {"name": "Hostel Managament", "category": "Administrative"},
    {"name": "Placement and Internship", "category": "Engagement"},
    {"name": "Transportation Management", "category": "Administrative"},
    {"name": "Member Records (student, faculty,staff,parent)", "category": "Core"},
    {"name": "Campus Help Center", "category": "Support"},
    {"name": "HR Management", "category": "Administrative"},
    {"name": "Booth Mangmeent", "category": "Other"},
    {"name": "Koha", "category": "Integration"},
]


def seed_data(db: Session) -> None:
    # Seed roles
    existing_roles = {r.name for r in db.query(models.Role).all()}
    for role_data in DEFAULT_ROLES:
        if role_data["name"] not in existing_roles:
            db.add(models.Role(**role_data))
    db.commit()

    # Migrate renamed permission codes so existing role mappings stay valid.
    for old_code, new_code in PERMISSION_RENAMES.items():
        perm = db.query(models.Permission).filter(models.Permission.code == old_code).first()
        if perm:
            perm.code = new_code
            perm.name = PERMISSION_NAME_MAP.get(new_code, perm.name)
    db.commit()

    # Seed permissions
    existing_permissions = {p.code for p in db.query(models.Permission).all()}
    for perm_data in PERMISSIONS:
        if perm_data["code"] not in existing_permissions:
            db.add(models.Permission(**perm_data))
    db.commit()

    # Map permission codes to objects
    permission_by_code = {p.code: p for p in db.query(models.Permission).all()}
    roles_by_name = {r.name: r for r in db.query(models.Role).all()}

    # Seed role-permission matrix
    for role_name, codes in ROLE_PERMISSIONS.items():
        role = roles_by_name.get(role_name)
        if not role:
            continue
        current_codes = {p.code for p in role.permissions}
        for code in codes:
            perm = permission_by_code.get(code)
            if perm and code not in current_codes:
                role.permissions.append(perm)
        db.commit()

    # One-time correction: earlier seeds granted the Client role internal
    # permission codes (dashboard.view/phase.view/activity.view/meeting.view).
    # Those are revoked now that /api/portal/* gates on role instead, so any
    # database seeded before this change needs them stripped explicitly
    # (the loop above is additive-only and won't remove them on its own).
    client_role = roles_by_name.get("Client")
    if client_role:
        stale_codes = {"dashboard.view", "phase.view", "activity.view", "meeting.view"}
        client_role.permissions = [p for p in client_role.permissions if p.code not in stale_codes]
        db.commit()

    # Seed module catalogue
    existing_modules = {m.name for m in db.query(models.Module).all()}
    for module_data in DEFAULT_MODULES:
        if module_data["name"] not in existing_modules:
            db.add(models.Module(**module_data))
    db.commit()

    # Seed admin user if not present
    admin_email = "admin@ims.local"
    admin = db.query(models.User).filter(models.User.email == admin_email).first()
    if not admin:
        admin_role = db.query(models.Role).filter(models.Role.name == "Administrator").first()
        if admin_role:
            db.add(
                models.User(
                    name="System Administrator",
                    email=admin_email,
                    hashed_password=get_password_hash("admin123"),
                    role_id=admin_role.id,
                    is_active=True,
                )
            )
            db.commit()
