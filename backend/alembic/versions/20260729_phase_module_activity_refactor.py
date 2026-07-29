"""phase_module_activity_refactor

Rename the implementation hierarchy from Client -> Project -> ProjectModule ->
Phase -> Task to Client -> Phase -> PhaseModule -> Activity. The old Phase
layer is removed, so activities sit directly under the module instance.

Revision ID: phase_activity_refactor
Revises: 9a0b1c2d3e4f
Create Date: 2026-07-29 06:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "phase_activity_refactor"
down_revision = "9a0b1c2d3e4f"
branch_labels = None
depends_on = None


ACTIVITY_COLUMNS = [
    sa.Column("id", sa.Integer(), primary_key=True, index=True),
    sa.Column("phase_module_id", sa.Integer(), sa.ForeignKey("phase_modules.id"), nullable=False, index=True),
    sa.Column("parent_activity_id", sa.Integer(), sa.ForeignKey("activities.id"), nullable=True),
    sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
    sa.Column("reviewer_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
    sa.Column("title", sa.String(200), nullable=False),
    sa.Column("description", sa.Text(), nullable=True),
    sa.Column("priority", sa.String(20), nullable=False, server_default="Medium"),
    sa.Column("status", sa.String(30), nullable=False, server_default="Not Started"),
    sa.Column("start_date", sa.Date(), nullable=True),
    sa.Column("due_date", sa.Date(), nullable=True),
    sa.Column("estimated_hours", sa.Float(), nullable=True),
    sa.Column("actual_hours", sa.Float(), nullable=True),
    sa.Column("progress", sa.Float(), nullable=False, server_default="0.0"),
    sa.Column("sequence", sa.Integer(), nullable=False, server_default="0"),
    sa.Column("client_spoc", sa.String(150), nullable=True),
    sa.Column("client_spoc_email", sa.String(255), nullable=True),
    sa.Column("client_spoc_phone", sa.String(50), nullable=True),
    sa.Column("uat_proposed", sa.Boolean(), nullable=False, server_default=sa.false()),
    sa.Column("delay_reason", sa.Text(), nullable=True),
    sa.Column("client_response", sa.Text(), nullable=True),
    sa.Column("internal_response", sa.Text(), nullable=True),
    sa.Column("external_link", sa.String(500), nullable=True),
    sa.Column("category", sa.String(50), nullable=False, server_default="Regular"),
    sa.Column("proposed_timeline", sa.Date(), nullable=True),
    sa.Column("module_status", sa.String(100), nullable=True),
    sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
    sa.Column("deleted_at", sa.DateTime(), nullable=True),
    sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
]


def upgrade() -> None:
    # 1. Preserve the old phase -> project_module mapping so tasks can be
    #    migrated up one level.
    op.execute(
        """
        CREATE TABLE _old_phase_mapping AS
        SELECT id AS phase_id, project_module_id
        FROM phases
        """
    )

    # 2. Rename the project-level tables to the new phase terminology. The
    #    schemas are identical, so only the table/column names change.
    op.rename_table("project_modules", "phase_modules")
    op.alter_column("phase_modules", "project_id", new_column_name="phase_id")

    # 3. Create activities table from tasks. Activities now sit directly under
    #    the phase module, using the old phase mapping to resolve the parent.
    op.create_table("activities", *ACTIVITY_COLUMNS)
    op.execute(
        """
        INSERT INTO activities (
            id, phase_module_id, parent_activity_id, owner_id, reviewer_id, title,
            description, priority, status, start_date, due_date, estimated_hours,
            actual_hours, progress, sequence, client_spoc, client_spoc_email,
            client_spoc_phone, uat_proposed, delay_reason, client_response,
            internal_response, external_link, category, proposed_timeline,
            module_status, is_deleted, deleted_at, created_at, updated_at
        )
        SELECT
            t.id, m.project_module_id, t.parent_task_id, t.owner_id, t.reviewer_id,
            t.title, t.description, t.priority, t.status, t.start_date, t.due_date,
            t.estimated_hours, t.actual_hours, t.progress, t.sequence, t.client_spoc,
            t.client_spoc_email, t.client_spoc_phone, t.uat_proposed, t.delay_reason,
            t.client_response, t.internal_response, t.external_link, t.category,
            t.proposed_timeline, t.module_status, t.is_deleted, t.deleted_at,
            t.created_at, t.updated_at
        FROM tasks t
        JOIN _old_phase_mapping m ON t.phase_id = m.phase_id
        """
    )

    # 4. Create activity_dependencies from task_dependencies.
    op.create_table(
        "activity_dependencies",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("activity_id", sa.Integer(), sa.ForeignKey("activities.id"), nullable=False, index=True),
        sa.Column("depends_on_activity_id", sa.Integer(), sa.ForeignKey("activities.id"), nullable=False),
    )
    op.execute(
        """
        INSERT INTO activity_dependencies (id, activity_id, depends_on_activity_id)
        SELECT id, task_id, depends_on_task_id
        FROM task_dependencies
        """
    )

    # 5. Recreate checklist_items with activity_id.
    op.create_table(
        "_checklist_items_new",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("activity_id", sa.Integer(), sa.ForeignKey("activities.id"), nullable=False, index=True),
        sa.Column("item", sa.String(255), nullable=False),
        sa.Column("completed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.execute(
        """
        INSERT INTO _checklist_items_new
        (id, activity_id, item, completed, is_deleted, deleted_at)
        SELECT id, task_id, item, completed, is_deleted, deleted_at
        FROM checklist_items
        """
    )

    # 6. Drop old tables in dependency order. The old checklist_items table
    #    depends on tasks, so it must be dropped before tasks. The old phases
    #    table must be dropped before projects can be renamed to phases.
    op.drop_table("task_dependencies")
    op.drop_table("checklist_items")
    op.rename_table("_checklist_items_new", "checklist_items")
    op.drop_table("tasks")
    op.drop_table("phases")

    # 7. Rename the projects table to phases. The phase_modules table has already
    #    been renamed and its FK references projects.id, which now becomes phases.id.
    op.rename_table("projects", "phases")

    # 8. The meetings table only needs its project_id column renamed to phase_id;
    #    its schema is otherwise unchanged. PostgreSQL updates the FK reference.
    op.alter_column("meetings", "project_id", new_column_name="phase_id")

    # 9. Drop the temporary mapping table.
    op.drop_table("_old_phase_mapping")

    # 10. Reset serial sequences after explicit-ID inserts so future inserts work.
    for table in ("phases", "phase_modules", "activities", "activity_dependencies", "checklist_items", "meetings"):
        op.execute(
            f"""
            SELECT setval(
                pg_get_serial_sequence('{table}', 'id'),
                COALESCE((SELECT MAX(id) FROM {table}), 0) + 1,
                false
            )
            """
        )


def downgrade() -> None:
    # Full downgrade is not supported because the old phase layer is removed.
    raise NotImplementedError("Downgrade of phase/activity refactor is not supported")
