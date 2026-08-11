# Database Design Document

> Column-level summary of the schema in `backend/app/models.py`. For full types, defaults, and notes, see `docs/IMS_ERD.md`. For migration history, see `backend/alembic/versions/`.

## Core Tables

### roles

role_id (PK) name description

### permissions

permission_id (PK) code (unique, `resource.action`) name description category

### role_permissions

role_id (PK, FK) permission_id (PK, FK) created_at

### users

user_id (PK) name email (unique) hashed_password role_id (FK) is_active is_deleted deleted_at created_at updated_at 

### clients

client_id (PK) name crm_id institution_type status priority contract_start contract_end go_live_date csm_id (FK users) pm_id (FK users) rm_id (FK users) sales_owner instance_link region implementation_state new_recurring kickoff_meeting_date agreed_go_live_date billing_date tracker_link master_data_status total_users is_deleted deleted_at created_at updated_at

### phases

phase_id (PK) client_id (FK) name description type status start_date end_date progress is_deleted deleted_at created_at updated_at

> A phase is the top-level unit of implementation work under a client (this replaced the earlier "Project" concept). Creating a phase automatically creates a Kickoff `phase_module` with its default activities.

### modules

module_id (PK) name (unique) category description is_deleted deleted_at

### phase_modules

phase_module_id (PK) phase_id (FK) module_id (FK) status progress is_deleted deleted_at created_at

> Adding a module to a phase creates one `phase_modules` row and auto-generates its `activities` from the per-module template in `backend/app/services/templates.py`.

### activities

activity_id (PK) phase_module_id (FK) parent_activity_id (FK, self, nullable) owner_id (FK users) reviewer_id (FK users) title description priority status start_date due_date estimated_hours actual_hours progress sequence client_spoc client_spoc_email client_spoc_phone uat_proposed delay_reason client_response internal_response external_link category proposed_timeline module_status is_deleted deleted_at created_at updated_at

> Replaces the earlier "Task" concept. `sequence` supports manual/drag-and-drop reordering within a module via `POST /api/activities/reorder/{phase_module_id}`.

### checklist_items

checklist_id (PK) activity_id (FK) item completed is_deleted deleted_at

### activity_dependencies

dependency_id (PK) activity_id (FK) depends_on_activity_id (FK)

> Table exists but is not yet wired to any API endpoint or UI — dependencies cannot currently be created or enforced.

### meetings

meeting_id (PK) phase_id (FK) title meeting_date participants discussion decisions action_items next_follow_up created_by (FK users) is_deleted deleted_at created_at updated_at

> Meeting & communication log, attached directly to a phase (not to an individual module).

### activity_logs

log_id (PK) user_id (FK, nullable) entity action timestamp details

## Relationships

```
Client -> Phases -> PhaseModules -> Activities -> ChecklistItems
Modules -> PhaseModules (catalogue reused across phases)
Phases -> Meetings
Users -> Clients (csm_id / pm_id / rm_id), Activities (owner_id / reviewer_id), Meetings (created_by)
Roles <-> Permissions (via role_permissions)
```

## Progress Roll-Up Rules

Implemented in `backend/app/services/templates.py`:

1. **Activity → PhaseModule**: `phase_module.progress` = average of activity progress (Completed = 100%, others use their own `progress` value), excluding activities with status `Cancelled`. `phase_module.status` is set to Completed/In Progress/Not Started based on that average.
2. **PhaseModule → Phase**: `phase.progress` = average of its (non-deleted) phase modules' progress. `phase.status` follows the same derivation, unless it has been manually set to `On Hold` or `Cancelled` (those are not overwritten automatically).
3. **Phase → Client**: `client.implementation_state` is set to `"Go Live"` once every non-cancelled activity across every phase of the client is `Completed`.

Checklist item completion does not feed into any of these calculations — it's a manual sub-tracking aid only.

## Soft Delete & Recycle Bin

All core tables carry `is_deleted` + `deleted_at`. Deleting a parent row cascades a soft-delete to its children in the same request. Soft-deleted rows remain visible in the Recycle Bin (`GET /api/recycle-bin`) for 12 hours from `deleted_at` and can be restored (`POST /api/recycle-bin/restore/{entity}/{id}`) by users holding `recycle_bin.restore`, provided the parent record isn't itself deleted and the 12-hour window hasn't expired.
