# UI / UX Specification

> Reflects the actual screens implemented in `frontend/src/pages` and `frontend/src/components`.

## Navigation (`Layout.jsx`)

Top navbar:

- Digii logo + "IMS" wordmark
- Dashboard
- Clients
- Phases
- Users *(shown only if the current user has `user.view`)*
- **Admin** dropdown *(shown only if the user has at least one of `audit.view`, `recycle_bin.view`, `role.manage`)*:
  - Audit Logs
  - Recycle Bin
  - Roles (Role Permissions matrix)
- Global search box (submits to `/search?q=...`)
- Dark/light mode toggle (persisted in `localStorage`)
- Current user's email + role name, Logout button

## Dashboard (`Dashboard.jsx`)

Summary cards, filterable by client status / region / phase status / owner:

- Total Clients
- Total Phases
- Active Phases
- Delayed Phases
- Go-Live This Month

## Clients (`Clients.jsx` / `ClientDetail.jsx`)

**List:** all clients with name, CRM ID, institution type, status, priority, CSM/PM, phase count. Add-client form/modal.

**Detail:** client overview and contract details, tracker fields (instance link, region, master data status, total users, billing date, etc.), assigned CSM/PM/RM, list of phases, and meetings rolled up across all of the client's phases.

## Phases (`Phases.jsx` / `PhaseDetail.jsx`)

**List:** all phases with client name, type, status, progress, dates.

**Detail:**
- Phase overview: type, status, dates, overall progress bar.
- Module timeline: a segmented progress bar, one segment per added module (`Timeline.jsx` → `ModuleTimeline`).
- Gantt chart: a custom-built (no external library) timeline showing dated activities per module, colored by status, with month markers (`Timeline.jsx` → `GanttTimeline`).
- Per-module accordion: activities table with owner, reviewer, priority, status, dates, hours, progress; drag-and-drop row reordering; checklist sub-items per activity; add/edit/delete activity.
- Add-module control: dropdown of catalogue modules not yet added, with an "Add Module" action that immediately generates its activities.
- Meetings section: list + add/edit/delete meeting (title, date, participants, discussion, decisions, action items, next follow-up).

## Users (`Users.jsx`)

Table of users (name, email, role, active/inactive) with create/edit/deactivate actions. Editing a user can change name, email, role, active flag, and reset the password.

## Role Permissions (`RolePermissions.jsx`)

A matrix: roles as columns, permissions (grouped by category) as rows, with checkboxes to toggle each role's access. The Administrator role's row is locked (always all permissions).

## Audit Logs (`AuditLogs.jsx`)

Paginated table of every logged action: timestamp, user, entity, action, details. Filterable by entity, action, and user.

## Recycle Bin (`RecycleBin.jsx`)

Grouped list of soft-deleted clients, phases, activities, users, and meetings still within the 12-hour retention window, each showing its deletion time, expiry time, and a Restore action (disabled/blocked if the parent record is also deleted or the window has expired).

## Search Results (`SearchResults.jsx`)

Results grouped by type (Clients, Phases, Activities, Users) for the query submitted from the navbar search box.

## UI Guidelines Actually In Place

- Status/priority badges with color coding (via `ui.jsx` badge components and CSS classes like `.badge-red`, `.badge-theme`).
- Drag-and-drop activity reordering within a module.
- Custom Gantt timeline and module progress timeline (no charting library).
- Global search across four entity types.
- Dark mode, toggled from the navbar and persisted per browser.
- Digii brand color (`--primary-red: #E31E24`) throughout.

## Not Implemented

- Kanban board
- Export to Excel/PDF
- Advanced multi-field filter builder (only the specific filters listed above exist)
- Client-facing/read-only portal view
