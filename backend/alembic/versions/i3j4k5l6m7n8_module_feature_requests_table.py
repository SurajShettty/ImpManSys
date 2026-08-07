"""module feature requests table

Adds module_feature_requests: tracked Feature/Enhancement/Bug requests
scoped to a catalogue Module (backend/app/models.py Module), not to a
specific client/phase.

Revision ID: i3j4k5l6m7n8
Revises: h2i3j4k5l6m7
Create Date: 2026-08-07 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "i3j4k5l6m7n8"
down_revision = "h2i3j4k5l6m7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "module_feature_requests",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("module_id", sa.Integer(), sa.ForeignKey("modules.id"), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("type", sa.String(length=20), nullable=False, server_default="Feature"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="Requested"),
        sa.Column("priority", sa.String(length=10), nullable=False, server_default="Medium"),
        sa.Column("clickup_link", sa.String(length=500), nullable=True),
        sa.Column("requested_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_module_feature_requests_module_id", "module_feature_requests", ["module_id"])
    op.alter_column("module_feature_requests", "type", server_default=None)
    op.alter_column("module_feature_requests", "status", server_default=None)
    op.alter_column("module_feature_requests", "priority", server_default=None)
    op.alter_column("module_feature_requests", "is_deleted", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_module_feature_requests_module_id", table_name="module_feature_requests")
    op.drop_table("module_feature_requests")
