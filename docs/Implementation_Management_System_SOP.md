# Standard Operating Procedure (SOP)

## Implementation Management System (IMS)

**Document Version:** 2.0\
**Department:** Customer Success\
**Owner:** Customer Success Team\
**Purpose:** To standardize the planning, execution, and tracking of implementation projects for all clients using the IMS application.

> This revision describes only what the IMS application currently supports. Business-process items with no corresponding system feature (risk/issue tracking, document repository, notifications) have been removed; see `docs/IMS_PRD.md` §7 for the list of known gaps if these are needed later.

------------------------------------------------------------------------

# 1. Purpose

The purpose of the Implementation Management System (IMS) is to provide a centralized platform for managing client implementations from kickoff through go-live.

The system aims to:

- Standardize implementation processes across all clients.
- Improve project visibility.
- Track implementation timelines and progress.
- Reduce implementation delays.
- Improve accountability via role-based access and a full audit trail.
- Provide management with real-time implementation status.

------------------------------------------------------------------------

# 2. Scope

This SOP applies to:

- New Client Implementations
- Existing Client Enhancements
- Module Implementations
- Go-Live Activities

Applicable Teams:

- Customer Success
- Implementation Team
- Data Team
- Support Team
- Management

------------------------------------------------------------------------

# 3. Objectives

The system enables users to:

- Create and manage client records.
- Manage multiple implementation phases per client.
- Add modules to a phase and track their activities.
- Monitor activity completion and checklist items.
- Record client meetings and communications.
- View real-time progress and delay dashboards.
- Maintain a full audit trail of every change.
- Recover accidentally deleted records within a 12-hour window.

------------------------------------------------------------------------

# 4. Implementation Hierarchy

```
Client → Phase → Module → Activity → Checklist → Completion
```

Example:

- Client: ABC University
- Phase: Academic ERP Implementation
- Modules added to the phase:
  - Kickoff *(added automatically to every new phase)*
  - Admission Management
  - Academic Management System
  - Learning Management System
- Academic Management System module
  - Activity: Time-table Management
  - Checklist:
    - Curriculum data received
    - Time-table configured
    - Demo completed with client

------------------------------------------------------------------------

# 5. Implementation Lifecycle

## Stage 1 — Client Creation

Captured fields:

- Client Name, Institution Type, CRM ID
- Customer Success Manager, Project Manager, Relationship Manager
- Sales Owner
- Contract Start / End Date, Expected Go-Live Date
- Priority, Status
- Tracker fields: instance link, region, implementation state, new/recurring, kickoff meeting date, agreed go-live date, billing date, tracker link, master data status, total users

## Stage 2 — Phase Creation

A phase is the top-level implementation engagement for a client (e.g. "Academic ERP Implementation", "Finance Module Rollout").

Phase details: name, description, type (free text, e.g. New Implementation, Additional Module, Migration, Upgrade), status, start/end date.

**Creating a phase automatically adds a "Kickoff" module** with its standard activities (Requirement Gathering, Stakeholder Identification, Scope Confirmation, Timeline Approval) — no manual setup needed.

## Stage 3 — Module Selection

The module catalogue (seeded on first startup) currently contains:

| Module | Category |
|--------|----------|
| Kickoff | Onboarding |
| Master Data Management | Core |
| Member Records (student, faculty, staff, parent) | Core |
| Admission Management | Academic |
| Institutional Calendar | Academic |
| Academic Management System | Academic |
| Examination Management System | Academic |
| Learning Management System | Academic |
| Finance Management | Administrative |
| Hostel Management | Administrative |
| Transportation Management | Administrative |
| HR Management | Administrative |
| Infrastructure Management | Infrastructure |
| Feedback Management | Engagement |
| Placement and Internship | Engagement |
| Campus Help Center | Support |
| Koha | Integration |
| Booth Management | Other |

Administrators can add custom modules to the catalogue. **Adding a module to a phase automatically generates its predefined activities** (see `backend/app/services/templates.py` for the full list per module).

------------------------------------------------------------------------

# 6. Activity Management

Each activity includes:

- Title, Description
- Module & Phase (via the module instance it belongs to)
- Owner, Reviewer
- Priority, Status
- Start Date, Due Date
- Estimated Hours, Actual Hours
- Progress %
- Checklist items
- Client SPOC name / email / phone
- UAT Proposed (yes/no)
- Delay Reason, Client Response, Internal Response
- External Link, Category, Proposed Timeline, Module Status

Activities can be manually reordered within a module (drag-and-drop) and can have sub-activities via a parent/child link.

------------------------------------------------------------------------

# 7. Activity Status & Priority

Status is a free-text field; the conventions in use are:

- Not Started
- In Progress
- Waiting for Client
- Waiting for Internal Team
- Blocked
- Under Testing
- Completed
- Cancelled

Marking an activity **Completed** sets its progress to 100% automatically; cancelled activities are excluded from module/phase progress averages.

Priority: Critical, High, Medium, Low.

------------------------------------------------------------------------

# 8. Checklist Management

Example — "Time-table Management" activity:

- [ ] Curriculum data received
- [ ] Time-table configured
- [ ] Demo completed with client

Checklist completion is a manual tracking aid and does not affect the activity's progress percentage.

------------------------------------------------------------------------

# 9. Meeting & Communication Log

Each meeting record (attached to a phase) captures:

- Title, Meeting Date
- Participants
- Discussion (Minutes of Meeting)
- Decisions
- Action Items
- Next Follow-up Date

All meetings for a client can be viewed rolled up across its phases from the client record.

------------------------------------------------------------------------

# 10. Dashboards

## Management Dashboard

- Total Clients
- Total Phases
- Active Phases (Not Started / In Progress / On Hold)
- Delayed Phases (past end date, not Completed/Cancelled)
- Go-Live This Month

Filterable by client status, region, phase status, and owner (CSM/PM).

## Global Search

A single search box (top navigation) searches clients, phases, activities, and users at once.

------------------------------------------------------------------------

# 11. User Roles

- Administrator
- Customer Success Manager
- Project Manager
- Implementation Executive
- Data Team
- Support Team
- Management
- Client *(role exists for future client-facing access; no client portal UI exists yet)*

Access is enforced by a fine-grained permission matrix (not just role name) — see §12.

------------------------------------------------------------------------

# 12. Roles & Permissions

Permissions are individual codes (e.g. `client.create`, `activity.delete`) grouped by category: System, Users, Clients, Phases, Modules, Activities, Meetings. Each role is mapped to a set of permission codes, editable by an Administrator via the Role Permissions screen (the Administrator role itself is fixed and cannot be edited).

------------------------------------------------------------------------

# 13. Automation

The system automatically:

- Adds a Kickoff module with default activities to every new phase.
- Generates a module's predefined activities when it's added to a phase.
- Recalculates progress: Activity → Module → Phase, in real time on every activity change.
- Marks a client's implementation state as "Go Live" once every activity across the client is completed.
- Records an audit log entry for every create, update, delete, and restore action.

------------------------------------------------------------------------

# 14. Phase Closure

Manual checklist before closing a phase:

- All activities completed or explicitly cancelled
- Client sign-off obtained (recorded via a meeting entry)
- Training completed
- Phase status set to Completed

------------------------------------------------------------------------

# 15. Success Criteria

The IMS should provide standardized implementation tracking, real-time visibility into progress and delays, role-based accountability, and a full audit trail with recoverable deletes.

------------------------------------------------------------------------

# Appendix A — Database Entities

- Clients
- Phases
- Modules
- Phase Modules
- Activities
- Checklist Items
- Activity Dependencies *(schema only — not yet used by any API or UI)*
- Meetings
- Users
- Roles
- Permissions / Role Permissions
- Activity Logs

------------------------------------------------------------------------

# Appendix B — Workflow

Contract Signed

↓

Client Created

↓

Phase Created (Kickoff module auto-generated)

↓

Modules Selected (each auto-generates its activity plan)

↓

Execution (activities updated, checklists tracked, meetings logged)

↓

Go-Live

↓

Client Sign-off

↓

Phase Closed
