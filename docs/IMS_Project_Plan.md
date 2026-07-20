# Implementation Management System (IMS) — Project Plan

## 1. Executive Summary

The Implementation Management System (IMS) is a centralized web platform to plan, execute, and track client implementations for Digii (formerly CollPoll). It replaces ad-hoc spreadsheets and email-based follow-ups with a structured workflow covering clients, projects, modules, phases, tasks, meetings, and audit trails.

This plan requests approval to complete the IMS rollout, including final UX polish, permission controls, reporting, and production readiness.

---

## 2. Project Objectives

| # | Objective | Success Metric |
|---|-----------|----------------|
| 1 | Provide a single source of truth for all client implementations | 100% active projects tracked in IMS |
| 2 | Standardize implementation delivery using reusable module/phase templates | All new projects auto-generate from standard module catalogue |
| 3 | Improve visibility for management and customers | Dashboard, Gantt, and status timeline available per project |
| 4 | Enforce accountability with fine-grained access control | Role-permission matrix configured and active |
| 5 | Maintain full auditability and safe recovery | All deletions are soft-deleted; 12-hour recycle bin + audit log |

---

## 3. Scope

### 3.1 In Scope

- **Client Management** — client profiles, CRM linkage, contract dates, CSM/PM assignment, priority/status.
- **Project Management** — project creation, types, status, dates, progress tracking.
- **Implementation Planning** — module catalogue, automatic 7-phase plan generation per module.
- **Task Management** — tasks, priorities, statuses, due dates, owners, reviewers, drag-and-drop reordering.
- **Checklists** — per-task checklist items with completion tracking.
- **Meetings & Communication Log** — MoMs, decisions, action items, next follow-ups at project and client level.
- **Reporting & Visualization** — dashboard, Gantt chart, status timeline, global search, audit logs.
- **Access Control** — role-based permission matrix (roles, permissions, role-permissions).
- **Soft Delete & Recovery** — recycle bin with 12-hour restore window.
- **Dark Mode & Branding** — Digii logo, theme colors, dark/light toggle.

### 3.2 Out of Scope (Future Phases)

- Native mobile applications.
- Two-way CRM synchronization.
- Automated customer email notifications.
- Advanced resource capacity planning.
- Financial/billing integration.

---

## 4. Target Audience / Users

| Role | Primary Use |
|------|-------------|
| Administrator | User/role management, audit logs, recycle bin, permissions matrix |
| Management | Dashboard, reports, audit oversight |
| Customer Success Manager (CSM) | Client relationships, meetings, project coordination |
| Project Manager (PM) | Project planning, module/phase/task tracking |
| Implementation Executive | Task execution, checklist completion, updates |
| Data Team / Support | Read-only access to relevant client/project data |
| Client | View-only access to their own project progress and meetings |

---

## 5. Methodology

We will follow an **agile, iterative delivery model**:

- Two-week sprints.
- Weekly stakeholder demos.
- Backend-first API development, followed by frontend integration.
- Continuous testing via TestClient and production builds.
- Incremental rollout: core hierarchy → collaboration → reporting → permissions → production hardening.

---

## 6. Project Phases & Milestones

### Phase 1: Foundation (Completed)
- Core database schema (clients, projects, modules, phases, tasks, checklist, dependencies).
- User authentication and role management.
- Basic CRUD for clients, projects, and tasks.
- Soft-delete foundation.

**Milestone:** M1 — Core data model and auth live.

### Phase 2: Implementation Planning (Completed)
- Module catalogue and automatic phase/task generation.
- Project detail view with modules, phases, and tasks.
- Checklist items.
- Drag-and-drop task reordering.

**Milestone:** M2 — Project implementation plan workflow functional.

### Phase 3: Collaboration & Tracking (Completed)
- Meeting & Communication Log (project and client roll-up).
- Task due dates and overdue highlighting.
- Gantt chart and status timeline.
- Priority/status color coding.

**Milestone:** M3 — Project execution and communication tools live.

### Phase 4: Search, Audit & Recovery (Completed)
- Global search.
- Audit log viewer with filters and pagination.
- Recycle bin with 12-hour restore window.
- Meeting log recycle-bin support.

**Milestone:** M4 — System traceability and recovery live.

### Phase 5: Access Control & Administration (Completed)
- Permission model and role-permission matrix.
- Fine-grained API permission checks across all routers.
- Role Permissions UI for administrators.

**Milestone:** M5 — Permission matrix active and configurable.

### Phase 6: UX Polish & Branding (Completed)
- Digii logo and theme colors.
- Dark mode toggle.
- Pretty dropdowns and forms.
- User edit modal alignment fixes.
- Collapsible meeting cards.
- Sticky role column in permissions matrix.

**Milestone:** M6 — UI/UX polish delivered.

### Phase 7: Production Readiness (Recommended Next)
- Environment configuration cleanup (DEBUG variable fix).
- Database backup strategy.
- Docker Compose validation.
- User acceptance testing (UAT).
- Training materials and SOP finalization.
- Production deployment.

**Milestone:** M7 — IMS live for production use.

---

## 7. Deliverables

| # | Deliverable | Owner | Status |
|---|-------------|-------|--------|
| 1 | Backend API with full CRUD and permission enforcement | Engineering | Done |
| 2 | React frontend with dashboard, lists, detail views | Engineering | Done |
| 3 | Database schema and migrations | Engineering | Done |
| 4 | Role-permission matrix UI | Engineering | Done |
| 5 | Audit log and recycle bin | Engineering | Done |
| 6 | ERD and technical documentation | Engineering | Done |
| 7 | User guide / SOP for PMs and CSMs | Product/CS | In Progress |
| 8 | UAT test cases | QA / Product | Pending |
| 9 | Production deployment plan | Engineering / DevOps | Pending |
| 10 | Training session for users | CSM Lead | Pending |

---

## 8. Timeline

| Phase | Duration | Target Completion |
|-------|----------|-------------------|
| Phase 1 — Foundation | 2 weeks | Done |
| Phase 2 — Implementation Planning | 2 weeks | Done |
| Phase 3 — Collaboration & Tracking | 2 weeks | Done |
| Phase 4 — Search, Audit & Recovery | 1 week | Done |
| Phase 5 — Access Control | 1 week | Done |
| Phase 6 — UX Polish | 1 week | Done |
| Phase 7 — Production Readiness | 2 weeks | Proposed |
| **Total** | **11 weeks** | **Production: T + 2 weeks** |

---

## 9. Resource Requirements

| Resource | Role | Effort |
|----------|------|--------|
| Backend Engineer | API development, migrations, permission logic | 6 weeks |
| Frontend Engineer | React UI, charts, forms, dark mode | 5 weeks |
| Product Manager | Requirements, prioritization, UAT | 4 weeks |
| QA / Tester | Test cases, regression testing | 2 weeks |
| DevOps | Deployment, environment setup, backups | 1 week |
| CSM Lead | User training, SOP input, rollout | 1 week |

---

## 10. Risks & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Users resist switching from spreadsheets | High | Medium | Run training, demonstrate time savings, migrate key data |
| Permission misconfiguration blocks valid users | High | Low | Administrator onboarding, clear permission matrix, easy restore |
| Data loss in production | High | Low | Soft deletes, automated backups, recycle bin, audit logs |
| Performance issues with large task lists | Medium | Medium | Pagination, indexing, lazy loading, query optimization |
| Environment config issues (e.g. DEBUG variable) | Medium | Low | Standardize .env files, add validation, pre-deployment checklist |

---

## 11. Success Criteria

The project will be considered successful when:

1. All active implementations are tracked in IMS.
2. PMs and CSMs can create a project, add modules, and assign tasks without engineering support.
3. Management can view dashboards and audit logs.
4. No unauthorized user can access or modify data outside their role permissions.
5. Deleted data is recoverable within 12 hours.
6. The system passes UAT with no critical or high-severity bugs.

---

## 12. Budget Estimate (Indicative)

| Category | Estimate | Notes |
|----------|----------|-------|
| Engineering effort | 11 weeks | 2 engineers + PM/QA support |
| Infrastructure | Cloud VM + PostgreSQL | Existing Docker setup |
| Training & Change Management | 1 week | CSM-led sessions |
| Contingency | 15% | Buffer for rework/UAT fixes |

*Detailed cost breakdown to be provided by finance/HR based on internal rates.*

---

## 13. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Project Sponsor | | | |
| Product Manager | | | |
| Engineering Lead | | | |
| QA Lead | | | |
| CSM Lead | | | |

---

## 14. Appendix: Key Documents

- `README.md` — Project overview and setup.
- `docs/IMS_Architecture_and_Flows.md` — System architecture.
- `docs/IMS_Database_Design.md` — Database design notes.
- `docs/IMS_ERD.md` — Entity relationship diagram.
- `docs/Implementation_Management_System_SOP.md` — Standard operating procedures.
- `docs/IMS_UI_UX_Specification.md` — UI/UX specification.
- `docs/IMS_PRD.md` — Product requirements document.
- `docs/IMS_Guide_for_PMs_and_CSMs.md` — End-user guide.

