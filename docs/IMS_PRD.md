# Product Requirements Document (PRD)

## Implementation Management System (IMS)

## 1. Vision

A centralized implementation and customer success platform to manage client onboarding, implementation, rollout, and enhancements, replacing spreadsheet- and email-based tracking.

## 2. Goals

- Standardize implementation workflow across clients, phases, modules, and activities.
- Provide management dashboards with live progress and delay visibility.
- Reduce implementation delays through automatic plan generation and progress roll-up.
- Give every action a fine-grained, role-based permission check and a full audit trail.

## 3. User Roles

- Administrator
- Customer Success Manager (CSM)
- Project Manager (PM)
- Implementation Executive
- Data Team
- Support Team
- Management
- Client *(role exists in the system for future client-facing access; no client-facing portal UI exists yet)*

## 4. Functional Modules (Implemented)

1. Authentication (JWT) & fine-grained RBAC
2. Client Management (profile, contract dates, CSM/PM/RM assignment, tracker fields)
3. Phase Management (the implementation engagement under a client)
4. Module Catalogue & automatic activity-plan generation
5. Activity & Checklist Management (including manual drag-and-drop reordering)
6. Meeting & Communication Log (per phase, rolled up per client)
7. Management Dashboard (summary cards with client/region/status/owner filters)
8. Global Search (clients, phases, activities, users)
9. Audit Logs (filterable, paginated)
10. Recycle Bin (12-hour soft-delete recovery window)
11. Role & Permission Matrix (admin-managed, per-role permission editing)

## 5. Functional Requirements

### Client Management

- Create/edit/delete client (soft delete)
- Multiple phases per client
- Contract details, go-live tracking, priority, status
- CSM / PM / Relationship Manager assignment
- Client tracker fields (instance link, region, master data status, total users, billing date, etc.)

### Phase Management

- Phase types (default: "New Implementation")
- Status lifecycle, derived automatically from module/activity progress unless manually set to On Hold/Cancelled
- Every phase automatically gets a "Kickoff" module with its default activities on creation

### Module Management

- Master module catalogue (seeded; admins can add custom modules)
- Adding a module to a phase clones its predefined activity template automatically
- Module-level progress derived from its activities

### Activity Management

Fields: title, description, owner, reviewer, priority, status, start/due date, estimated/actual hours, progress, sequence, checklist items, plus client-tracker fields (client SPOC contact details, UAT proposed, delay reason, client/internal response, external link, category, proposed timeline, module status).

### Dashboards

Management dashboard: total clients, total phases, active phases, delayed phases, go-live this month — filterable by client status, region, phase status, and owner.

### Non-functional Requirements

- Role-based security enforced per-endpoint via permission codes
- REST API (FastAPI, OpenAPI docs at `/docs`)
- Audit logging on all create/update/delete/restore actions
- Soft delete + 12-hour recycle bin recovery window

## 6. Acceptance Criteria (Met)

- Adding a module auto-generates its activity plan immediately
- Activity progress rolls up in real time: Activity → Module → Phase → Client implementation state
- All create/update/delete/restore actions produce an audit log entry
- Deleted records are recoverable within 12 hours

## 7. Known Gaps / Not Yet Built

- Activity dependency enforcement (the `activity_dependencies` table exists but has no API/UI)
- Document repository / file uploads
- Notifications (task assignment, due-date, overdue alerts)
- Client-facing portal
- Usage & product-adoption dashboards
- Exportable reports (Excel/PDF)
- Automated tests and CI pipeline
