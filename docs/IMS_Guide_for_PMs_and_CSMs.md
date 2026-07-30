# Implementation Management System (IMS) — Guide for Product Managers & Customer Success

> A plain-language guide to what IMS does, who uses it, and how implementation work runs from start to finish.

---

## 1. What is IMS?

The **Implementation Management System (IMS)** is a single place to plan, run, and track every client implementation. Instead of managing onboarding in spreadsheets, emails, and scattered documents, IMS gives your team a shared workspace where:

- Every implementation follows a standard plan.
- Activity owners know what to do and when.
- Managers see progress and delays in real time.
- Meetings and decisions are logged against the client, not lost in email threads.

---

## 2. Who Uses IMS?

| Role | Why they use IMS |
|------|------------------|
| **Administrator** | Manages users, roles/permissions, and the module catalogue. |
| **Customer Success Manager (CSM)** | Owns the client relationship, tracks overall health, logs meetings. |
| **Project Manager (PM)** | Builds the phase plan, assigns activities, manages deadlines. |
| **Implementation Executive** | Executes day-to-day activities — configuration, data work, testing, training. |
| **Data Team** | Read access to relevant client/phase/activity data. |
| **Support Team** | Read access, plus meeting visibility, for go-live and post-launch support. |
| **Management** | Views dashboards, audit logs, identifies delays. |
| **Client** | *(Role exists in the system; there is no client-facing portal screen yet.)* |

---

## 3. The Big Idea: One Hierarchy for Every Implementation

```
Client → Phase → Module → Activity → Checklist
```

Think of it like folders inside folders:

- **Client** = the organization you are implementing for (e.g., ABC University).
- **Phase** = the implementation engagement (e.g., "Academic ERP Implementation").
- **Module** = a product area being implemented (e.g., Admission Management, Finance Management, LMS).
- **Activity** = a specific action someone must complete (e.g., "Configure Attendance Rules").
- **Checklist** = fine-grained sub-steps within an activity.

---

## 4. The Standard Workflow

### Stage 1 — Client Created

When a contract is signed, create the **Client** record: name, institution type, CRM ID, contract dates, expected go-live date, priority, assigned CSM/PM/Relationship Manager, and sales owner.

### Stage 2 — Phase Created

A **Phase** is the work stream for that client (e.g., a new implementation or an additional module rollout). As soon as you create it, IMS **automatically adds a "Kickoff" module** with 4 starter activities (Requirement Gathering, Stakeholder Identification, Scope Confirmation, Timeline Approval) — there's nothing to set up manually.

### Stage 3 — Modules Added

Add the modules the client needs from the catalogue (Admission Management, Finance Management, Academic Management System, LMS, and 14 others). **The moment you add a module, IMS generates its full activity list automatically** — each module has its own predefined set of activities (a small module like "Koha" has one activity; a large one like "Examination Management System" has close to twenty).

### Stage 4 — Work Begins

Implementation executives update activity statuses as work moves forward (Not Started, In Progress, Waiting for Client, Blocked, Under Testing, Completed, Cancelled, etc.). Marking an activity **Completed** rolls its progress up automatically:

```
Activity progress → Module progress → Phase progress → Client "Go Live" state
```

Once every activity for a client is completed, the client's implementation state automatically flips to **"Go Live."**

### Stage 5 — Track, Log, and Close

Throughout the phase, the team can:

- Add checklist items to activities for detailed tracking.
- Log meetings (MoM, decisions, action items, next follow-up) against the phase.
- Reorder activities within a module by dragging them.
- Monitor delays on the dashboard.

When everything is complete, the phase status is set to Completed.

---

## 5. What Gets Created Automatically?

| When this happens | IMS automatically creates |
|-------------------|---------------------------|
| A phase is created | 1 "Kickoff" module + its 4 default activities |
| A module is added to a phase | 1 module instance + that module's predefined activity list |
| An activity is marked Completed | Activity progress = 100%, then module/phase progress recalculated |
| Every activity for a client is completed | Client `implementation_state` = "Go Live" |
| A phase is deleted | All its modules, activities, checklists, and meetings are soft-deleted (recoverable for 12 hours) |
| A client is deleted | All its phases and everything under them are soft-deleted (recoverable for 12 hours) |

---

## 6. What Data Do You See?

### Client Record

Overview and contract details, go-live date and priority, assigned CSM/PM/RM, tracker fields (instance link, region, master data status), all phases for this client, and all meetings across those phases.

### Phase Record

Type, status, dates, overall progress bar, a Gantt-style timeline of dated activities, and every module added — with its activities, owners, statuses, and checklists.

### Activity Record

Title, description, owner, reviewer, priority, dates, estimated/actual hours, status, progress, checklist items, client SPOC contact details, and UAT/delay/response fields carried over from the manual Excel tracker.

---

## 7. Dashboards & Search

The management dashboard shows: Total Clients, Total Phases, Active Phases, Delayed Phases, and Go-Live This Month — filterable by client status, region, phase status, and owner (CSM/PM).

A global search box in the top navigation searches clients, phases, activities, and users at once.

---

## 8. Statuses and Priorities

### Activity Statuses (free text; these are the conventions in use)

Not Started · In Progress · Waiting for Client · Waiting for Internal Team · Blocked · Under Testing · Completed · Cancelled

### Priorities

Critical · High · Medium · Low

### Client Statuses

Active · On Hold · Completed · Churned

### Phase Statuses

Not Started · In Progress · On Hold · Completed · Cancelled — **updated automatically** from module/activity progress unless manually set to On Hold or Cancelled.

---

## 9. Roles & Permissions in Plain Language

Access isn't just "by role" — an Administrator can fine-tune exactly which permissions each role has from the Role Permissions screen. Out of the box:

| What you want to do | Who can typically do it |
|---------------------|--------------------------|
| Create/edit a client | Administrator, CSM |
| Create/edit/delete a phase | Administrator, CSM, Project Manager |
| Add or remove a module from a phase | Administrator, CSM, Project Manager |
| Update activities and checklists | Administrator, CSM, Project Manager, Implementation Executive |
| Log meetings | Administrator, CSM, Project Manager |
| Manage users | Administrator only |
| Edit the role/permission matrix | Administrator only |
| View the dashboard and use search | Any logged-in, active user |
| View audit logs / recycle bin | Whoever has been granted those permissions (Administrator by default, Management can view) |

---

## 10. Standard Module Catalogue

IMS ships with 18 modules pre-loaded:

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

Admins can add custom modules if a client needs something outside this list — but only "Kickoff" and the modules above have a predefined activity template out of the box; a brand-new custom module starts with no default activities until they're added by hand.

---

## 11. Key Benefits for Your Team

- **CSMs** get one client view with all phases, meetings, and go-live dates.
- **PMs** don't build implementation plans from scratch — the system generates them.
- **Implementation Executives** get a clear activity list with priorities and due dates, and checklists keep detailed steps from being missed.
- **Management** gets real-time visibility into delays and upcoming go-lives.
- Every action is logged and every delete is recoverable for 12 hours.

---

## 12. What Is Currently Live?

- Secure login with role- and permission-based access.
- Clients, phases, modules, and activities can be created and managed.
- Adding a phase or module automatically generates its activity plan.
- Activities can be updated, checklisted, and reordered; progress rolls up automatically.
- Meetings can be logged per phase and viewed rolled up per client.
- Dashboard with filters, global search, audit log, and recycle bin.
- Dark mode.

## 13. What Is Not Yet Built

- Activity dependencies (Task B blocked on Task A) are not enforced.
- No document/file upload repository.
- No notifications (assignment, due-date, overdue alerts).
- No client-facing portal.
- No usage/adoption dashboards or exportable reports.

---

## 14. Quick Reference: How to Do Common Things

### Create a new client

1. Go to **Clients** → **Add Client**.
2. Fill in name, CRM ID, institution type, dates, priority, and assigned CSM/PM.
3. Save.

### Start a new implementation phase

1. Go to **Phases** → **Add Phase**, select the client.
2. Enter phase name, type, start/end dates, and description.
3. Save — the Kickoff module and its activities appear immediately.

### Build out the plan

1. Open the phase.
2. Select a module from the dropdown and click **Add Module**.
3. IMS automatically creates its activities.
4. Repeat for each module the client needs.

### Track work

1. Open a phase and expand a module.
2. Update the status dropdown on each activity as work progresses.
3. Add checklist items if needed; drag activities to reorder them.
4. Watch the module and phase progress bars update automatically.

### Log a meeting

1. Open the phase → **Meetings** section → **Add Meeting**.
2. Fill in date, participants, discussion, decisions, and action items.
3. Save.

### Check overall health

1. Go to the **Dashboard**.
2. Review total clients, active phases, delayed phases, and go-lives this month.

---

## 15. Need Help?

For technical setup, see `README.md`. For product requirements, see `docs/IMS_PRD.md`. For operating procedures, see `docs/Implementation_Management_System_SOP.md`. For the technical architecture, see `docs/IMS_Architecture_and_Flows.md`. For UI/UX specifications, see `docs/IMS_UI_UX_Specification.md`.

---

*This document is written for product managers, customer success managers, and operations teams. It intentionally avoids technical implementation details and focuses on how IMS works as a business tool.*
