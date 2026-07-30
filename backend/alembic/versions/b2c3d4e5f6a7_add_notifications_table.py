"""add notifications table

Revision ID: b2c3d4e5f6a7
Revises: phase_activity_refactor
Create Date: 2026-07-30 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b2c3d4e5f6a7"
down_revision = "phase_activity_refactor"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("activity_id", sa.Integer(), sa.ForeignKey("activities.id"), nullable=False, index=True),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("message", sa.String(255), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False, default=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.Column("read_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("user_id", "activity_id", "type", name="uq_notification_user_activity_type"),
    )


def downgrade() -> None:
    op.drop_table("notifications")
