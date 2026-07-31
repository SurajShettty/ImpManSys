"""notification client assignment support

Allow a Notification to reference a client (client_assigned type) instead of
an activity: activity_id becomes nullable, add client_id + its unique
constraint.

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-08-01 09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("notifications", "activity_id", existing_type=sa.Integer(), nullable=True)
    op.add_column("notifications", sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=True))
    op.create_index("ix_notifications_client_id", "notifications", ["client_id"])
    op.create_unique_constraint(
        "uq_notification_user_client_type", "notifications", ["user_id", "client_id", "type"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_notification_user_client_type", "notifications", type_="unique")
    op.drop_index("ix_notifications_client_id", table_name="notifications")
    op.drop_column("notifications", "client_id")
    op.alter_column("notifications", "activity_id", existing_type=sa.Integer(), nullable=False)
