"""client portal access

Adds users.client_id (links a "Client" role login to the institution they
belong to) and meetings.client_visible (opt-in flag: a meeting's MoM is
private/internal by default, and only shown in the client portal once a
staff member explicitly marks it shareable).

Revision ID: g1h2i3j4k5l6
Revises: f6a7b8c9d0e1
Create Date: 2026-08-06 09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "g1h2i3j4k5l6"
down_revision = "f6a7b8c9d0e1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=True))
    op.create_index("ix_users_client_id", "users", ["client_id"])

    op.add_column(
        "meetings",
        sa.Column("client_visible", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.alter_column("meetings", "client_visible", server_default=None)


def downgrade() -> None:
    op.drop_column("meetings", "client_visible")
    op.drop_index("ix_users_client_id", table_name="users")
    op.drop_column("users", "client_id")
