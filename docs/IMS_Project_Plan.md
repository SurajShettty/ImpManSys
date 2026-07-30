# Implementation Management System (IMS) — Project Plan

## 1. Executive Summary

The Implementation Management System (IMS) is a centralized web platform to plan, execute, and track client implementations for Digii (formerly CollPoll). It replaces ad-hoc spreadsheets and email-based follow-ups with a structured workflow covering clients, phases, modules, activities, meetings, and audit trails.

This plan tracks the work completed so far and requests approval for the remaining production-readiness work.

---

## 2. Project Objectives

| # | Objective | Success Metric |
|---|-----------|----------------|
| 1 | Provide a single source of truth for all client implementations | All active phases tracked in IMS |
| 2 | Standardize implementation delivery using reusable module templates | Every module added to a phase auto-generates its activity plan from the catalogue |
| 3 | Improve visibility for management | Dashboard, Gantt timeline, and module progress view available per phase |
| 4 | Enforce accountability with fine-grained access control | Role-permission matrix configured and admin-editable |
| 5 | Maintain full auditability and safe recovery | All deletions are soft-deleted; 12-hour recycle bin + audit log |

---

## 3. Scope

### 3.1 In Scope

- **Client Management** — client profiles, CRM linkage, contract dates, CSM/PM/RM assignment, priority/status, tracker fields.
- **Phase Management** — phase creation, types, status (auto-derived from progress), dates.
- **Implementation Planning** — module catalogue (18 modules), automatic activity-plan generation per module.
- **Activity Management** — activities, priorities, statuses, due dates, owners, reviewers, drag-and-drop reordering.
- **Checklists** — per-activity checklist items with completion tracking.
- **Meetings & Communication Log** — MoMs, decisions, action items, next follow-ups per phase, rolled up per client.
- **Reporting & Visualization** — dashboard, custom Gantt chart, module progress timeline, global search, audit logs.
- **Access Control** — fine-grained role-permission matrix (roles, permissions, role-permissions), editable per role except Administrator.
- **Soft Delete & Recovery** — recycle bin with 12-hour restore window.
- **Dark Mode & Branding** — Digii logo, theme colors, dark/light toggle.

### 3.2 Out of Scope (Not Yet Built)

- Activity dependency enforcement (schema exists, unused).
- Document repository / file uploads.
- Notifications (assignment, due-date, overdue alerts).
- Native mobile applications.
- Two-way CRM synchronization.
- Client-facing portal.
- Usage & adoption dashboards, exportable reports (Excel/PDF).
- Automated test suite and CI pipeline.

---

## 4. Target Audience / Users

| Role | Primary Use |
|------|-------------|
| Administrator | User/role management, audit logs, recycle bin, permissions matrix |
| Management | Dashboard, audit oversight |
| Customer Success Manager (CSM) | Client relationships, meetings, phase coordination |
| Project Manager (PM) | Phase planning, module/activity tracking |
| Implementation Executive | Activity execution, checklist completion, updates |
| Data Team / Support | Read-only access to relevant client/phase data |
| Client | Role exists in the system; no client-facing UI yet |

---

## 5. Methodology

Delivered iteratively: backend-first API development followed by frontend integration, with an incremental rollout — core hierarchy → collaboration → search/audit/recovery → permissions → UX polish.

---

## 6. Project Phases & Milestones

### Phase 1: Foundation (Completed)
- Core database schema (clients, phases, modules, phase-modules, activities, checklists).
- JWT authentication and role management.
- Basic CRUD for clients, phases, and activities.
- Soft-delete foundation.

### Phase 2: Implementation Planning (Completed)
- Module catalogue and automatic activity generation per module.
- Phase detail view with modules and activities.
- Checklist items.
- Drag-and-drop activity reordering.

### Phase 3: Collaboration & Tracking (Completed)
- Meeting & Communication Log (phase and client roll-up).
- Activity due dates.
- Custom Gantt chart and module progress timeline.
- Priority/status color coding.

### Phase 4: Search, Audit & Recovery (Completed)
- Global search across clients, phases, activities, and users.
- Audit log viewer with filters and pagination.
- Recycle bin with 12-hour restore window.

### Phase 5: Access Control & Administration (Completed)
- Fine-grained permission model and role-permission matrix.
- Permission checks across all routers.
- Role Permissions UI for administrators.

### Phase 6: UX Polish & Branding (Completed)
- Digii logo and theme colors.
- Dark mode toggle.

### Phase 7: Production Readiness (Recommended Next)
- Fix insecure `SECRET_KEY` default (currently falls back to a known placeholder if unset).
- Add pagination to client/phase/activity list endpoints (currently unbounded).
- Add rate limiting on auth endpoints.
- Environment-driven CORS origins for non-local deployments.
- Automated backend/frontend test suite and CI pipeline.
- Database backup strategy.
- User acceptance testing (UAT).

**Milestone:** M7 — IMS ready for production use.

---

## 7. Deliverables

| # | Deliverable | Status |
|---|-------------|--------|
| 1 | Backend API with full CRUD and permission enforcement | Done |
| 2 | React frontend with dashboard, lists, detail views | Done |
| 3 | Database schema and migrations | Done |
| 4 | Role-permission matrix UI | Done |
| 5 | Audit log and recycle bin | Done |
| 6 | ERD and technical documentation | Done |
| 7 | User guide / SOP for PMs and CSMs | Done |
| 8 | Automated test suite | Pending |
| 9 | Production deployment plan (secrets, CORS, backups, CI) | Pending |
| 10 | Training session for users | Pending |

---

## 8. Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Users resist switching from spreadsheets | High | Training, demonstrate time savings |
| Permission misconfiguration blocks valid users | High | Clear permission matrix, Administrator role is fixed and cannot lock itself out |
| Data loss in production | High | Soft deletes, recycle bin, audit logs — but no backup strategy defined yet |
| Performance issues with large client/phase/activity lists | Medium | List endpoints are currently unbounded (no pagination) — needs addressing before scale |
| Insecure default `SECRET_KEY` in production | High | Must be overridden via environment variable before any non-local deployment |
| No automated tests | Medium | Regressions can only be caught by manual testing today |

---

## 9. Success Criteria

The project will be considered successful when:

1. All active implementations are tracked in IMS.
2. PMs and CSMs can create a phase, add modules, and assign activities without engineering support.
3. Management can view dashboards and audit logs.
4. No unauthorized user can access or modify data outside their role's permissions.
5. Deleted data is recoverable within 12 hours.
6. The system passes UAT with no critical or high-severity bugs.

---

## 10. Appendix: Key Documents

- `README.md` — Project overview and setup.
- `docs/IMS_Architecture_and_Flows.md` — System architecture.
- `docs/IMS_Database_Design.md` — Database design notes.
- `docs/IMS_ERD.md` — Entity relationship diagram.
- `docs/Implementation_Management_System_SOP.md` — Standard operating procedures.
- `docs/IMS_UI_UX_Specification.md` — UI/UX specification.
- `docs/IMS_PRD.md` — Product requirements document.
- `docs/IMS_Guide_for_PMs_and_CSMs.md` — End-user guide.
