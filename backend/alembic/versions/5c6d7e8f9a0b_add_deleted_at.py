"""add deleted_at timestamp for soft-delete expiry

Revision ID: 5c6d7e8f9a0b
Revises: 4b5c6d7e8f9a
Create Date: 2026-07-17 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "5c6d7e8f9a0b"
down_revision = "4b5c6d7e8f9a"
branch_labels = None
depends_on = None


TABLES = (
    "users",
    "clients",
    "projects",
    "modules",
    "project_modules",
    "phases",
    "tasks",
    "checklist_items",
)


def upgrade() -> None:
    for table in TABLES:
        op.add_column(table, sa.Column("deleted_at", sa.DateTime(), nullable=True))
    # Backfill existing soft-deleted rows so the 12-hour window starts now.
    # Tables with updated_at use it; others fall back to now().
    for table in TABLES:
        has_updated_at = table in ("users", "clients", "projects", "tasks")
        value = "updated_at" if has_updated_at else "now()"
        op.execute(
            f"UPDATE {table} SET deleted_at = {value} "
            f"WHERE is_deleted = true AND deleted_at IS NULL"
        )


def downgrade() -> None:
    for table in reversed(TABLES):
        op.drop_column(table, "deleted_at")
