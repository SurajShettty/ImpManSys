"""add is_deleted soft delete flags

Revision ID: 3a4b5c6d7e8f
Revises: 8cb1a7727bd3
Create Date: 2026-07-17 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "3a4b5c6d7e8f"
down_revision = "8cb1a7727bd3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("clients", sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("projects", sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("modules", sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("project_modules", sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("phases", sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("tasks", sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("checklist_items", sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")))


def downgrade() -> None:
    op.drop_column("checklist_items", "is_deleted")
    op.drop_column("tasks", "is_deleted")
    op.drop_column("phases", "is_deleted")
    op.drop_column("project_modules", "is_deleted")
    op.drop_column("modules", "is_deleted")
    op.drop_column("projects", "is_deleted")
    op.drop_column("clients", "is_deleted")
    op.drop_column("users", "is_deleted")
