"""add sequence to tasks for manual ordering

Revision ID: 4b5c6d7e8f9a
Revises: 3a4b5c6d7e8f
Create Date: 2026-07-17 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "4b5c6d7e8f9a"
down_revision = "3a4b5c6d7e8f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "tasks",
        sa.Column("sequence", sa.Integer(), nullable=False, server_default="0"),
    )
    # Backfill: give existing tasks a per-phase sequence based on their current id order.
    op.execute(
        """
        WITH ordered AS (
            SELECT id,
                   ROW_NUMBER() OVER (PARTITION BY phase_id ORDER BY id) AS rn
            FROM tasks
        )
        UPDATE tasks
        SET sequence = ordered.rn
        FROM ordered
        WHERE tasks.id = ordered.id
        """
    )


def downgrade() -> None:
    op.drop_column("tasks", "sequence")
