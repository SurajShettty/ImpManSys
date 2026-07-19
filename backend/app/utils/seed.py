from sqlalchemy.orm import Session
from app import models
from app.auth import get_password_hash


DEFAULT_ROLES = [
    {"name": "Administrator", "description": "Full system access"},
    {"name": "Customer Success Manager", "description": "Manages client relationships"},
    {"name": "Project Manager", "description": "Manages projects and resources"},
    {"name": "Implementation Executive", "description": "Executes implementation tasks"},
    {"name": "Data Team", "description": "Handles data and reports"},
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
    # Projects
    {"code": "project.view", "name": "View Projects", "category": "Projects"},
    {"code": "project.create", "name": "Create Projects", "category": "Projects"},
    {"code": "project.update", "name": "Edit Projects", "category": "Projects"},
    {"code": "project.delete", "name": "Delete Projects", "category": "Projects"},
    # Modules
    {"code": "module.view", "name": "View Modules", "category": "Modules"},
    {"code": "module.create", "name": "Add Modules", "category": "Modules"},
    {"code": "module.update", "name": "Edit Modules", "category": "Modules"},
    {"code": "module.delete", "name": "Remove Modules", "category": "Modules"},
    # Tasks
    {"code": "task.view", "name": "View Tasks", "category": "Tasks"},
    {"code": "task.create", "name": "Create Tasks", "category": "Tasks"},
    {"code": "task.update", "name": "Edit Tasks", "category": "Tasks"},
    {"code": "task.delete", "name": "Delete Tasks", "category": "Tasks"},
    # Meetings
    {"code": "meeting.view", "name": "View Meetings", "category": "Meetings"},
    {"code": "meeting.create", "name": "Create Meetings", "category": "Meetings"},
    {"code": "meeting.update", "name": "Edit Meetings", "category": "Meetings"},
    {"code": "meeting.delete", "name": "Delete Meetings", "category": "Meetings"},
]

ROLE_PERMISSIONS = {
    "Administrator": [p["code"] for p in PERMISSIONS],
    "Management": [
        "dashboard.view",
        "search.view",
        "audit.view",
        "client.view",
        "project.view",
        "module.view",
        "task.view",
        "meeting.view",
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
        "project.view",
        "project.create",
        "project.update",
        "project.delete",
        "module.view",
        "module.create",
        "task.view",
        "task.create",
        "task.update",
        "meeting.view",
        "meeting.create",
        "meeting.update",
        "meeting.delete",
    ],
    "Project Manager": [
        "dashboard.view",
        "search.view",
        "client.view",
        "project.view",
        "project.create",
        "project.update",
        "project.delete",
        "module.view",
        "module.create",
        "module.update",
        "module.delete",
        "task.view",
        "task.create",
        "task.update",
        "task.delete",
        "meeting.view",
        "meeting.create",
        "meeting.update",
        "meeting.delete",
    ],
    "Implementation Executive": [
        "dashboard.view",
        "search.view",
        "client.view",
        "project.view",
        "module.view",
        "task.view",
        "task.create",
        "task.update",
        "meeting.view",
    ],
    "Data Team": [
        "dashboard.view",
        "search.view",
        "client.view",
        "project.view",
        "module.view",
        "task.view",
    ],
    "Support Team": [
        "dashboard.view",
        "search.view",
        "client.view",
        "project.view",
        "task.view",
        "meeting.view",
    ],
    "Client": [
        "dashboard.view",
        "project.view",
        "task.view",
        "meeting.view",
    ],
}

# Standard implementable modules (SOP section 5, stage 3).
DEFAULT_MODULES = [
    {"name": "Admissions", "category": "Academic"},
    {"name": "Attendance", "category": "Academic"},
    {"name": "Academics", "category": "Academic"},
    {"name": "Finance", "category": "Administrative"},
    {"name": "Examination", "category": "Academic"},
    {"name": "Hostel", "category": "Administrative"},
    {"name": "Transport", "category": "Administrative"},
    {"name": "Library", "category": "Academic"},
    {"name": "LMS", "category": "Academic"},
    {"name": "Feedback", "category": "Engagement"},
    {"name": "Placement", "category": "Engagement"},
    {"name": "Research", "category": "Academic"},
    {"name": "Alumni", "category": "Engagement"},
    {"name": "Campus Help Centre", "category": "Support"},
    {"name": "Analytics", "category": "Reporting"},
]


def seed_data(db: Session) -> None:
    # Seed roles
    existing_roles = {r.name for r in db.query(models.Role).all()}
    for role_data in DEFAULT_ROLES:
        if role_data["name"] not in existing_roles:
            db.add(models.Role(**role_data))
    db.commit()

    # Seed module catalogue
    existing_modules = {m.name for m in db.query(models.Module).all()}
    for module_data in DEFAULT_MODULES:
        if module_data["name"] not in existing_modules:
            db.add(models.Module(**module_data))
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
