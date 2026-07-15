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


def seed_data(db: Session) -> None:
    # Seed roles
    existing_roles = {r.name for r in db.query(models.Role).all()}
    for role_data in DEFAULT_ROLES:
        if role_data["name"] not in existing_roles:
            db.add(models.Role(**role_data))
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
