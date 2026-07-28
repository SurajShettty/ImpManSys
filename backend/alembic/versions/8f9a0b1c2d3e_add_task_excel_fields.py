"""add excel project plan fields to tasks

Revision ID: 8f9a0b1c2d3e
Revises: 7e8f9a0b1c2d
Create Date: 2026-07-19 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "8f9a0b1c2d3e"
down_revision = "7e8f9a0b1c2d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    columns = [
        ("client_spoc", sa.String(150), True, None),
        ("client_spoc_email", sa.String(255), True, None),
        ("client_spoc_phone", sa.String(50), True, None),
        ("uat_proposed", sa.Boolean(), False, sa.false()),
        ("delay_reason", sa.Text(), True, None),
        ("client_response", sa.Text(), True, None),
        ("internal_response", sa.Text(), True, None),
        ("external_link", sa.String(500), True, None),
        ("category", sa.String(50), False, "Regular"),
        ("proposed_timeline", sa.Date(), True, None),
        ("module_status", sa.String(100), True, None),
    ]

    for name, col_type, nullable, server_default in columns:
        kwargs = {}
        if server_default is not None:
            kwargs["server_default"] = str(server_default)
        op.add_column(
            "tasks",
            sa.Column(name, col_type, nullable=nullable, **kwargs),
        )


def downgrade() -> None:
    for name in [
        "client_spoc",
        "client_spoc_email",
        "client_spoc_phone",
        "uat_proposed",
        "delay_reason",
        "client_response",
        "internal_response",
        "external_link",
        "category",
        "proposed_timeline",
        "module_status",
    ]:
        op.drop_column("tasks", name)
