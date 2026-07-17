# Implementation Management System (IMS) — Guide for Product Managers & Customer Success

> A plain-language guide to what IMS does, who uses it, and how implementation projects run from start to finish.

---

## 1. What is IMS?

The **Implementation Management System (IMS)** is a single place to plan, run, and track every client implementation. Instead of managing onboarding in spreadsheets, emails, and scattered documents, IMS gives your team a shared workspace where:

- Sales handoffs become a structured client record.
- Every implementation follows a standard plan.
- Task owners know what to do and when.
- Managers see progress, risks, and delays in real time.
- Nothing falls through the cracks between go-live and post-launch support.

In short: **IMS turns a chaotic onboarding process into a repeatable, visible workflow.**

---

## 2. Who Uses IMS?

| Role | Why they use IMS |
|------|------------------|
| **Administrator** | Sets up the system, manages users, and maintains the module catalogue. |
| **Customer Success Manager (CSM)** | Owns the client relationship, tracks overall health, and ensures value delivery. |
| **Project Manager (PM)** | Builds the implementation plan, assigns work, and manages deadlines. |
| **Implementation Executive** | Executes the day-to-day tasks — configuration, data work, testing, training. |
| **Data Team** | Handles imports, mappings, reporting, and data-related issues. |
| **Support Team** | Helps during go-live and hypercare. |
| **Management** | Views dashboards, identifies bottlenecks, and tracks team performance. |
| **Client (Portal)** | *(Planned)* Will get a read-only view of progress, documents, and next steps. |

---

## 3. The Big Idea: One Hierarchy for Every Implementation

Every implementation in IMS follows the same structure:

```
Client → Project → Module → Phase → Task → Checklist
```

Think of it like folders inside folders:

- **Client** = the organization you are implementing for (e.g., ABC University).
- **Project** = the specific engagement (e.g., "Academic ERP Implementation" or "Finance Module Rollout").
- **Module** = a product area being implemented (e.g., Admissions, Attendance, Finance, LMS).
- **Phase** = a stage of the module (e.g., Kickoff, Configuration, Testing, Go-Live).
- **Task** = a specific action someone must complete (e.g., "Upload student master data").
- **Checklist** = fine-grained sub-steps within a task (e.g., "Validate CSV format").

This hierarchy is the backbone of IMS. It makes large implementations easy to break down, assign, and track.

---

## 4. The Standard Workflow

A typical implementation moves through these stages inside IMS:

### Stage 1 — Client Created

When a contract is signed, someone creates the **Client** record in IMS.

Key details captured:

- Client name and institution type
- CRM ID (for linking with your sales system)
- Contract start and end dates
- Expected go-live date
- Priority
- Assigned Customer Success Manager and Project Manager
- Sales owner

Once the client exists, any number of projects can be created under it.

### Stage 2 — Project Created

A **Project** represents the work stream. Examples:

- New Implementation
- Additional Module
- Migration
- Upgrade
- Feature Rollout
- Integration
- Custom Development

At this stage, the project is just a shell: name, type, dates, description. It has **0% progress** and no modules yet.

### Stage 3 — Modules Added

Once the project is created, the PM or CSM selects the modules the client needs (e.g., Admissions, Attendance, Finance, LMS).

**This is where the magic happens.**

When a module is added, IMS automatically creates a complete implementation plan for that module, following the standard 7-phase template:

1. **Kickoff** — align on requirements, stakeholders, scope, and timeline.
2. **Configuration** — set up the system, roles, permissions, and academic structure.
3. **Data Preparation** — import students, faculty, programmes, and timetables.
4. **Testing** — functional testing, UAT, and issue resolution.
5. **Training** — train admins, faculty, and students.
6. **Go-Live** — enable production and monitor closely.
7. **Hypercare** — daily monitoring, bug fixes, and client support.

Each phase comes with pre-defined tasks. So adding one module creates **7 phases and 28 tasks** immediately. No one has to build the plan from scratch.

### Stage 4 — Work Begins

Implementation executives update task statuses as work moves forward:

- Not Started
- In Progress
- Waiting for Client
- Waiting for Internal Team
- Blocked
- Under Testing
- Completed
- Cancelled

When a task is marked **Completed**, the system automatically moves progress upward:

```
Task progress → Module progress → Project progress
```

So progress is always current, without anyone needing to calculate it manually.

### Stage 5 — Track, Adjust, and Close

Throughout the project, the team can:

- Add custom tasks if something unique comes up.
- Add checklist items to tasks for detailed tracking.
- Update project dates and status.
- Monitor delays on the dashboard.
- Complete hypercare and obtain client sign-off.

When everything is complete, the project is closed.

---

## 5. What Gets Created Automatically?

IMS removes manual planning work by generating the standard plan for every module added to a project.

| When this happens | IMS automatically creates |
|-------------------|---------------------------|
| A module is added to a project | 1 project module record |
| | 7 phases (Kickoff, Configuration, Data Preparation, Testing, Training, Go-Live, Hypercare) |
| | 28 tasks (4 per phase) |
| A task is marked Completed | Task progress = 100% |
| | Module progress recalculated |
| | Project progress recalculated |
| A project is deleted | All related modules, phases, tasks, and checklists are removed |
| A client is deleted | All related projects and everything under them are removed |

**Example:** If a client implements 4 modules, IMS will generate **4 modules → 28 phases → 112 tasks** instantly.

---

## 6. What Data Do You See?

### Client Record

A client page shows:

- Client overview and contract details
- Go-live date and priority
- Assigned CSM and PM
- List of all projects for this client
- Project count

### Project Record

A project page shows:

- Project type, status, and dates
- Overall progress bar
- All added modules
- For each module: phases, tasks, owners, statuses, and progress
- Module-by-module accordion view

### Task Record

Each task includes:

- Title and description
- Owner and reviewer
- Priority
- Start and due dates
- Estimated and actual hours
- Status
- Progress percentage
- Checklist items
- (Planned) Attachments, comments, and dependencies

---

## 7. Dashboards & Metrics

The management dashboard gives leadership a quick, real-time pulse of all implementations.

Current summary cards show:

| Metric | What it tells you |
|--------|-------------------|
| **Total Clients** | How many clients are in the system. |
| **Total Projects** | How many engagements exist. |
| **Active Projects** | Projects that are still running (not completed or cancelled). |
| **Delayed Projects** | Projects that have passed their planned end date but are not complete. |
| **Go-Live This Month** | Clients expected to go live in the current month. |

Future dashboards will include:

- Module-level progress charts
- Resource workload
- Risk and issue summaries
- Adoption tracking
- Project timeline / Gantt view
- Kanban board

---

## 8. Statuses and Priorities

### Task Statuses

| Status | Meaning |
|--------|---------|
| Not Started | No work has begun. |
| In Progress | Someone is actively working on it. |
| Waiting for Client | Blocked until the client provides something. |
| Waiting for Internal Team | Blocked until another internal team acts. |
| Blocked | There is a hard blocker. |
| Under Testing | Work is done and being tested. |
| Completed | Done and approved. |
| Cancelled | No longer needed. |

### Priorities

- Critical
- High
- Medium
- Low

### Client Statuses

- Active
- On Hold
- Completed
- Churned

### Project Statuses

- Not Started
- In Progress
- On Hold
- Completed
- Cancelled

**Note:** Project status is automatically updated based on progress, unless someone manually sets it to **On Hold** or **Cancelled**.

---

## 9. Roles & Permissions in Plain Language

| What you want to do | Who can do it |
|---------------------|---------------|
| Create a client | Administrator, CSM, or Project Manager |
| Create a project | Administrator, CSM, or Project Manager |
| Add or remove a module from a project | Administrator, CSM, or Project Manager |
| Assign and update tasks | Administrator, CSM, Project Manager, or Implementation Executive |
| Add or update checklist items | Administrator, CSM, Project Manager, or Implementation Executive |
| Create new modules in the catalogue | Administrator only |
| Delete a client | Administrator only |
| Delete a project | Administrator or Project Manager |
| View dashboards and reports | Any logged-in user |
| Manage users | Administrator only (via Users page) |

---

## 10. Standard Module Catalogue

IMS comes with 15 standard modules pre-loaded, grouped by category:

| Module | Category |
|--------|----------|
| Admissions | Academic |
| Attendance | Academic |
| Academics | Academic |
| Examination | Academic |
| Library | Academic |
| LMS | Academic |
| Research | Academic |
| Finance | Administrative |
| Hostel | Administrative |
| Transport | Administrative |
| Feedback | Engagement |
| Placement | Engagement |
| Alumni | Engagement |
| Campus Help Centre | Support |
| Analytics | Reporting |

Admins can add custom modules if a client needs something outside this list.

---

## 11. Key Benefits for Your Team

### For Customer Success Managers

- One client view with all projects, progress, and go-live dates.
- Less time chasing updates — progress is visible in real time.
- Early warning when a project is delayed.

### For Project Managers

- No need to build implementation plans from scratch.
- Consistent delivery across all clients.
- Clear task ownership and status tracking.

### For Implementation Executives

- A single to-do list with priorities and due dates.
- Checklists keep complex tasks from being missed.
- Status updates roll up automatically.

### For Management

- Real-time visibility into all active implementations.
- Delayed projects and upcoming go-lives at a glance.
- Data to improve forecasting and resource planning.

### For the Organization

- Standardized process = fewer missed steps.
- Faster onboarding = quicker time-to-value for clients.
- Complete audit trail of every action.
- Scalable as client volume grows.

---

## 12. What Is Currently Live?

IMS has completed the core implementation foundation:

- Users can log in with secure roles.
- Clients, projects, and modules can be created and managed.
- Adding a module automatically generates the standard 7-phase plan.
- Tasks can be updated and progress rolls up automatically.
- Dashboard shows key summary metrics.
- All major actions are logged for audit.

---

## 13. What Is Coming Next?

Planned features to support full implementation operations:

- **Risk Register** — track risks, impact, probability, and mitigation plans.
- **Issue Tracker** — log and resolve implementation issues.
- **Meeting & Communication Log** — capture MoMs, decisions, and action items.
- **Document Repository** — upload requirements, configs, training materials, and sign-offs.
- **Task Dependencies** — enforce that Task B cannot start until Task A is done.
- **Gantt Timeline** — visual project schedule.
- **Kanban Board** — drag-and-drop task board.
- **Notifications** — alerts for assignments, due dates, blockers, and go-lives.
- **Client Portal** — give clients read-only access to progress and documents.
- **Usage & Adoption Dashboard** — track product adoption post go-live.
- **Reports & Exports** — project summary, delay reports, resource reports, and more.

---

## 14. Quick Reference: How to Do Common Things

### Create a new client

1. Go to **Clients** → click **Add Client**.
2. Fill in name, CRM ID, institution type, dates, priority, and assigned CSM/PM.
3. Save.

### Start a new implementation project

1. Go to **Projects** → click **Add Project**.
2. Select the client.
3. Enter project name, type, start/end dates, and description.
4. Save.

### Build the implementation plan

1. Open the project.
2. Select a module from the dropdown and click **Add Module**.
3. IMS automatically creates phases and tasks.
4. Repeat for each module the client needs.

### Track work

1. Open a project and expand a module.
2. Update the status dropdown on each task as work progresses.
3. Add checklist items if needed.
4. Watch the module and project progress bars update automatically.

### Check overall health

1. Go to the **Dashboard**.
2. Review total clients, active projects, delayed projects, and go-lives this month.

---

## 15. Need Help?

For technical setup and troubleshooting, see the `README.md` file.

For detailed product requirements, see `docs/IMS_PRD.md`.  
For operating procedures, see `docs/Implementation_Management_System_SOP.md`.  
For the technical architecture guide, see `docs/IMS_Architecture_and_Flows.md`.  
For UI/UX specifications, see `docs/IMS_UI_UX_Specification.md`.

---

*This document is written for product managers, customer success managers, and operations teams. It intentionally avoids technical implementation details and focuses on how IMS works as a business tool.*
