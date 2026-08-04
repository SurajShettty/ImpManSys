"""notification meeting follow-up support

Allow a Notification to reference a meeting (meeting_follow_up type), so a
CSM can be alerted when a meeting's follow-up date arrives.

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-08-04 09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "f6a7b8c9d0e1"
down_revision = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("notifications", sa.Column("meeting_id", sa.Integer(), sa.ForeignKey("meetings.id"), nullable=True))
    op.create_index("ix_notifications_meeting_id", "notifications", ["meeting_id"])
    op.create_unique_constraint(
        "uq_notification_user_meeting_type", "notifications", ["user_id", "meeting_id", "type"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_notification_user_meeting_type", "notifications", type_="unique")
    op.drop_index("ix_notifications_meeting_id", table_name="notifications")
    op.drop_column("notifications", "meeting_id")
