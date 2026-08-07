"""module feature requests requested_by_client

Adds an optional requested_by_client_id to module_feature_requests, so a
feature/enhancement request can be tied back to the client that asked for
it (separate from requested_by, the internal user who logged it).

Revision ID: j4k5l6m7n8o9
Revises: i3j4k5l6m7n8
Create Date: 2026-08-07 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "j4k5l6m7n8o9"
down_revision = "i3j4k5l6m7n8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "module_feature_requests",
        sa.Column("requested_by_client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=True),
    )
    op.create_index(
        "ix_module_feature_requests_requested_by_client_id",
        "module_feature_requests",
        ["requested_by_client_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_module_feature_requests_requested_by_client_id", table_name="module_feature_requests")
    op.drop_column("module_feature_requests", "requested_by_client_id")
