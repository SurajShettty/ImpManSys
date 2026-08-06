"""documents table

Adds the documents table: files (contracts, SOWs, UAT sign-offs, training
decks) attached to a Client, Phase, or Activity. Exactly one of
client_id/phase_id/activity_id is set per row (app-level convention, not a
DB constraint - same approach already used for notifications).

Revision ID: h2i3j4k5l6m7
Revises: g1h2i3j4k5l6
Create Date: 2026-08-06 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "h2i3j4k5l6m7"
down_revision = "g1h2i3j4k5l6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "documents",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=True),
        sa.Column("phase_id", sa.Integer(), sa.ForeignKey("phases.id"), nullable=True),
        sa.Column("activity_id", sa.Integer(), sa.ForeignKey("activities.id"), nullable=True),
        sa.Column("category", sa.String(length=30), nullable=False, server_default="Other"),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("stored_filename", sa.String(length=80), nullable=False),
        sa.Column("content_type", sa.String(length=120), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("uploaded_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_documents_client_id", "documents", ["client_id"])
    op.create_index("ix_documents_phase_id", "documents", ["phase_id"])
    op.create_index("ix_documents_activity_id", "documents", ["activity_id"])
    op.alter_column("documents", "category", server_default=None)
    op.alter_column("documents", "is_deleted", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_documents_activity_id", table_name="documents")
    op.drop_index("ix_documents_phase_id", table_name="documents")
    op.drop_index("ix_documents_client_id", table_name="documents")
    op.drop_table("documents")
