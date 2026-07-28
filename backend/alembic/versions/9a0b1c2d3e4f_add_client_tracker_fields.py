"""add client tracker fields to clients

Revision ID: 9a0b1c2d3e4f
Revises: 8f9a0b1c2d3e
Create Date: 2026-07-19 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "9a0b1c2d3e4f"
down_revision = "8f9a0b1c2d3e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("clients", sa.Column("instance_link", sa.String(500), nullable=True))
    op.add_column("clients", sa.Column("region", sa.String(50), nullable=True))
    op.add_column("clients", sa.Column("implementation_state", sa.String(50), nullable=True))
    op.add_column("clients", sa.Column("new_recurring", sa.String(20), nullable=True))
    op.add_column("clients", sa.Column("kickoff_meeting_date", sa.Date(), nullable=True))
    op.add_column("clients", sa.Column("agreed_go_live_date", sa.Date(), nullable=True))
    op.add_column("clients", sa.Column("billing_date", sa.Date(), nullable=True))
    op.add_column("clients", sa.Column("tracker_link", sa.String(500), nullable=True))
    op.add_column("clients", sa.Column("master_data_status", sa.String(100), nullable=True))
    op.add_column("clients", sa.Column("total_users", sa.Integer(), nullable=True))
    op.add_column("clients", sa.Column("rm_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True))


def downgrade() -> None:
    op.drop_column("clients", "rm_id")
    op.drop_column("clients", "total_users")
    op.drop_column("clients", "master_data_status")
    op.drop_column("clients", "tracker_link")
    op.drop_column("clients", "billing_date")
    op.drop_column("clients", "agreed_go_live_date")
    op.drop_column("clients", "kickoff_meeting_date")
    op.drop_column("clients", "new_recurring")
    op.drop_column("clients", "implementation_state")
    op.drop_column("clients", "region")
    op.drop_column("clients", "instance_link")
