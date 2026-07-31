"""client csm/rm multi-assign

Replace the single csm_id/rm_id columns on clients with many-to-many
client_csms/client_rms join tables, preserving existing assignments.

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-07-31 09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c3d4e5f6a7b8"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "client_csms",
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, default=sa.func.now()),
    )
    op.create_table(
        "client_rms",
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, default=sa.func.now()),
    )

    op.execute(
        "INSERT INTO client_csms (client_id, user_id, created_at) "
        "SELECT id, csm_id, now() FROM clients WHERE csm_id IS NOT NULL"
    )
    op.execute(
        "INSERT INTO client_rms (client_id, user_id, created_at) "
        "SELECT id, rm_id, now() FROM clients WHERE rm_id IS NOT NULL"
    )

    op.drop_column("clients", "csm_id")
    op.drop_column("clients", "rm_id")


def downgrade() -> None:
    op.add_column("clients", sa.Column("csm_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True))
    op.add_column("clients", sa.Column("rm_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True))

    # Backfill from the join tables - first assignee per client if there were multiple.
    op.execute(
        "UPDATE clients SET csm_id = sub.user_id FROM ("
        "  SELECT DISTINCT ON (client_id) client_id, user_id FROM client_csms ORDER BY client_id, user_id"
        ") sub WHERE clients.id = sub.client_id"
    )
    op.execute(
        "UPDATE clients SET rm_id = sub.user_id FROM ("
        "  SELECT DISTINCT ON (client_id) client_id, user_id FROM client_rms ORDER BY client_id, user_id"
        ") sub WHERE clients.id = sub.client_id"
    )

    op.drop_table("client_rms")
    op.drop_table("client_csms")
