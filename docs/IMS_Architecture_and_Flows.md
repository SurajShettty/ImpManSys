# Implementation Management System (IMS) — Architecture & Flows

> A centralized platform for managing client onboarding, implementation, rollout, and enhancements.

---

## 1. What is this project?

The **Implementation Management System (IMS)** is an internal customer-success and implementation-management platform, built for Digii (formerly CollPoll). It is built around the hierarchy:

```
Client → Phase → Module → Activity → Checklist → Completion
```

Every client can have multiple phases. Every new phase automatically gets a "Kickoff" module with its default activities. Additional modules can be added to a phase, each auto-generating its own predefined activity plan. As activities are completed, progress rolls up: Activity → Module → Phase, and the client's implementation state flips to "Go Live" once every activity is done. Meetings can be logged against a phase for a communication trail. Managers see all of this on a dashboard.

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite | Browser UI |
| **Routing** | react-router-dom v6 | SPA navigation |
| **HTTP client** | axios | API calls to backend |
| **Backend API** | FastAPI (Python 3.12) | REST API |
| **Database** | PostgreSQL 16 | Persistent data |
| **ORM** | SQLAlchemy 2.0 | Database access & models |
| **Migrations** | Alembic | Schema versioning |
| **Authentication** | JWT (python-jose + bcrypt) | Stateless login |
| **Password hashing** | bcrypt | Secure password storage |
| **Validation** | Pydantic / Pydantic-Settings | Request/response schemas & config |
| **Reverse Proxy** | Nginx | Routes `/api`, `/docs`, and the SPA |
| **Deployment** | Docker Compose | Local and containerized deployment |

There is no UI component library, no client-side state management library, no test runner (backend or frontend), and no CI configuration in the repo.

---

## 3. Repository Structure

```
ImpManSys/
├── .env.example                 # Example environment variables
├── docker-compose.yml           # Multi-service orchestration
├── README.md                    # Quick start
├── docs/                        # Product & design docs
├── backend/                     # FastAPI application
│   ├── app/
│   │   ├── main.py              # FastAPI app & router registration
│   │   ├── config.py            # Pydantic settings
│   │   ├── database.py          # SQLAlchemy engine & session
│   │   ├── models.py            # SQLAlchemy ORM models
│   │   ├── schemas.py           # Pydantic request/response schemas
│   │   ├── auth.py              # Password hashing & JWT helpers
│   │   ├── dependencies.py      # Auth / permission dependency injections
│   │   ├── utils/
│   │   │   ├── seed.py          # Roles, permissions, modules, admin user seed
│   │   │   └── audit.py         # Activity logging helper
│   │   ├── services/
│   │   │   └── templates.py     # Module activity-plan generation & progress roll-up
│   │   └── routers/
│   │       ├── auth.py          # Login / current user
│   │       ├── users.py         # User CRUD
│   │       ├── roles.py         # Role & permission matrix
│   │       ├── clients.py       # Client CRUD, per-client meetings/phases
│   │       ├── phases.py        # Phase CRUD, phase-modules, meetings
│   │       ├── modules.py       # Module catalogue
│   │       ├── activities.py    # Activity CRUD, checklist, reordering
│   │       ├── dashboard.py     # Dashboard summary
│   │       ├── search.py        # Global search
│   │       ├── audit_logs.py    # Audit trail viewer
│   │       ├── recycle_bin.py   # Soft-delete recovery
│   │       └── health.py        # Health check
│   ├── alembic/versions/        # Database migrations
│   ├── .env                     # Runtime config (not in git)
│   ├── Dockerfile
│   ├── entrypoint.sh            # Startup: wait for DB, migrate, seed, run
│   └── requirements.txt
├── frontend/                    # React application
│   ├── src/
│   │   ├── main.jsx             # React entry point
│   │   ├── App.jsx              # Routes
│   │   ├── index.css            # Global styles (incl. dark mode)
│   │   ├── api/client.js        # Axios instance with token interceptor
│   │   ├── context/AuthContext.jsx
│   │   ├── components/
│   │   │   ├── Layout.jsx       # App shell / navbar / dark-mode toggle / global search
│   │   │   ├── PrivateRoute.jsx # Login guard
│   │   │   ├── RoleRoute.jsx    # Role-name guard
│   │   │   ├── PermissionRoute.jsx # Permission-code guard
│   │   │   ├── Timeline.jsx     # Module progress bar & custom Gantt chart
│   │   │   └── ui.jsx           # Reusable UI components
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Dashboard.jsx
│   │       ├── Clients.jsx
│   │       ├── ClientDetail.jsx
│   │       ├── Phases.jsx
│   │       ├── PhaseDetail.jsx  # Add modules, view Gantt, update activities/checklists/meetings
│   │       ├── Users.jsx
│   │       ├── SearchResults.jsx
│   │       ├── AuditLogs.jsx
│   │       ├── RecycleBin.jsx
│   │       └── RolePermissions.jsx
│   ├── Dockerfile
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── nginx/
    └── default.conf              # Reverse proxy configuration
```

---

## 4. Running the System

### Docker Compose (recommended)

```bash
cp .env.example .env
docker-compose up --build
```

Services started:

| Service | Container | Port | Description |
|---------|-----------|------|-------------|
| PostgreSQL | `ims-db` | `5432` | Database |
| FastAPI | `ims-backend` | `8000` | API (also proxied via Nginx) |
| Vite dev server | `ims-frontend` | `5173` | React dev server |
| Nginx | `ims-nginx` | `80` | Public entry point |

Public URLs: `http://localhost` (web app), `http://localhost/docs` (Swagger), `http://localhost/redoc` (ReDoc), `http://localhost:8000` (direct backend).

### Without Docker (local development)

**Backend:**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate       # Windows
pip install -r requirements.txt
alembic upgrade head
python -c "from app.database import SessionLocal; from app.utils.seed import seed_data; db = SessionLocal(); seed_data(db); db.close()"
uvicorn app.main:app --reload
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

---

## 5. Default Roles, Permissions & Seed Data

On every startup, `seed_data()` idempotently creates/updates:

**Roles:** Administrator, Customer Success Manager, Relationship Manager, Project Manager, Implementation Executive, Support Team, Management, Client.

**Permissions:** fine-grained codes in the form `resource.action`, grouped into categories System, Users, Clients, Phases, Modules, Activities, Meetings (full list in `backend/app/utils/seed.py`). The Administrator role always has every permission; other roles get a curated subset.

**Module catalogue** (18 seeded modules): Kickoff, Master Data Management, Admission Management, Finance Management, Infrastructure Management, Institutional Calendar, Academic Management System, Feedback Management, Examination Management System, Learning Management System, Hostel Management, Placement and Internship, Transportation Management, Member Records, Campus Help Center, HR Management, Booth Management, Koha.

**Default administrator login:** `admin@ims.local` / `admin123`.

Seeding also migrates old permission codes (`project.*`, `task.*`) to their current names (`phase.*`, `activity.*`) so existing role mappings survive the Project→Phase / Task→Activity rename.

---

## 6. Authentication & Authorization

### Flow

1. User submits email/password (as OAuth2 form fields) to `POST /api/auth/login`.
2. Backend verifies password with `bcrypt`.
3. Backend issues a **JWT access token** signed with `SECRET_KEY`.
4. Token expires after `ACCESS_TOKEN_EXPIRE_MINUTES` (default: 1440 = 24 hours).
5. Frontend stores the token in `localStorage` and sends it as `Authorization: Bearer <token>` on every request.
6. `dependencies.py` decodes the token and loads the current active user.
7. Each endpoint is guarded with `require_permission("<code>")`, which checks the current user's role's permission codes (not the role name directly).

### Permission Model

Unlike a simple role check, authorization is driven by the **role → permissions** mapping configured in the database (editable via the Role Permissions screen). `require_permission(*codes)` passes if the user's role has *any* of the listed codes; `require_all_permissions(*codes)` requires *all* of them. A legacy `require_role(*names)` helper also exists for role-name checks but the routers use permission codes exclusively.

---

## 7. Data Model / Entity Hierarchy

See `docs/IMS_ERD.md` for the full entity list and `docs/IMS_Database_Design.md` for column-level detail. Summary:

```
Role ──< User >── Client (csm_id / pm_id / rm_id)
                      │
                   Phase ──< Meeting
                      │
                 PhaseModule >── Module (catalogue)
                      │
                  Activity ──< ChecklistItem
                      │
              ActivityDependency (schema only, unused)
```

- `Client` has many `Phase`s (cascade soft-delete).
- `Phase` has many `PhaseModule`s and `Meeting`s (cascade soft-delete).
- `PhaseModule` has many `Activity`s (cascade soft-delete).
- `Activity` has many `ChecklistItem`s (cascade soft-delete).
- `User` is referenced by `Client.csm_id/pm_id/rm_id`, `Activity.owner_id/reviewer_id`, `Meeting.created_by`.

---

## 8. Lifecycle: What Gets Created When

### 8.1 Application Startup

`entrypoint.sh`: wait for PostgreSQL → `alembic upgrade head` → `seed_data()` → start `uvicorn`. Seeding runs on every startup and is idempotent (safe to run repeatedly).

### 8.2 Creating a Client

`POST /api/clients` (requires `client.create`) — creates one `clients` row and an audit log entry. No modules/phases exist yet.

### 8.3 Creating a Phase

`POST /api/phases` (requires `phase.create`) — creates one `phases` row, **then automatically creates a "Kickoff" `phase_modules` row with its 4 default activities** (Requirement Gathering, Stakeholder Identification, Scope Confirmation, Timeline Approval).

### 8.4 Adding a Module to a Phase

`POST /api/phases/{id}/modules` (requires `module.create`) with `{"module_id": ...}`:

1. Validates the module exists and isn't already added to this phase.
2. Creates one `phase_modules` row.
3. Looks up the module's activity template in `MODULE_ACTIVITY_TEMPLATES` (`backend/app/services/templates.py`) and creates one `activities` row per template entry (template lengths vary per module — e.g. Kickoff has 4, Examination Management System has 19).
4. Recomputes the phase's progress (stays low since the new module starts at 0%).

### 8.5 Updating an Activity

`PUT /api/activities/{id}` (requires `activity.update`):

1. Updates the activity row.
2. If `status` changes to `"Completed"`, `progress` is forced to `100`. If it changes *away* from `"Completed"` without an explicit new progress value, `progress` resets to `0`.
3. `recompute_phase_module_progress()` averages non-cancelled activity progress into the owning module, then cascades into `recompute_phase_progress()` for the phase, which in turn calls `recompute_client_implementation_state()` — setting the client's `implementation_state` to `"Go Live"` once every activity across the client is completed.
4. An audit log entry is recorded.

So progress flows: **Activity → PhaseModule → Phase → Client.implementation_state**.

### 8.6 Checklist Items

`POST /api/activities/{id}/checklist` adds an item; `PUT /api/activities/checklist/{item_id}` toggles it. Checklist completion is a manual tracking aid — it does not feed into progress calculations.

### 8.7 Reordering Activities

`POST /api/activities/reorder/{phase_module_id}` with an ordered list of activity IDs. The frontend implements this with native HTML5 drag-and-drop in `PhaseDetail.jsx`.

### 8.8 Meetings

`POST /api/phases/{id}/meetings` logs a meeting against a phase. `GET /api/clients/{id}/meetings` rolls up meetings across all of a client's phases.

### 8.9 Deleting Things

Deleting a client/phase/phase-module/activity soft-deletes it and cascades to its children in the same transaction (see `docs/IMS_ERD.md` §Soft Delete). Nothing is hard-deleted through the API.

---

## 9. Dashboard

`GET /api/dashboard/summary` (requires `dashboard.view`), optionally filtered by `client_status`, `region`, `phase_status`, `owner_id`:

| Field | Definition |
|-------|------------|
| `total_clients` | Count of matching clients |
| `total_phases` | Count of matching phases |
| `active_phases` | Phases with status Not Started / In Progress / On Hold |
| `delayed_phases` | Phases not Completed/Cancelled with `end_date < today` |
| `go_live_this_month` | Clients with `go_live_date` in the current calendar month |

---

## 10. API Endpoints

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| POST | `/api/auth/login` | Login, returns JWT | Public |
| GET | `/api/auth/me` | Current logged-in user + permissions | Any authenticated |
| GET/POST | `/api/users` | List / create users | `user.view` / `user.create` |
| GET/PUT/DELETE | `/api/users/{id}` | User detail / update / soft-delete | `user.view` / `user.update` / `user.delete` |
| GET | `/api/roles` | List roles | `role.manage` |
| GET/PUT | `/api/roles/{id}/permissions` | View / update a role's permission set | `role.manage` |
| GET | `/api/roles/permissions/all` | List every permission code | `role.manage` |
| GET/POST | `/api/clients` | List / create clients | `client.view`* / `client.create` |
| GET/PUT/DELETE | `/api/clients/{id}` | Client detail / update / delete | various `client.*` |
| GET | `/api/clients/{id}/phases` | Phases under a client | Any authenticated |
| GET | `/api/clients/{id}/meetings` | Meetings across all of a client's phases | Any authenticated |
| GET/POST | `/api/phases` | List / create phases (`client_id` query filter) | `phase.view` / `phase.create` |
| GET/PUT/DELETE | `/api/phases/{id}` | Phase detail / update / delete | `phase.*` |
| GET/POST | `/api/phases/{id}/modules` | List / add phase modules (auto-generates activities) | `module.view` / `module.create` |
| DELETE | `/api/phases/{id}/modules/{pm_id}` | Remove a module from a phase | `module.delete` |
| GET | `/api/phases/{id}/plan` | Full drill-down: modules → activities → checklists | `phase.view` |
| GET/POST/PUT/DELETE | `/api/phases/{id}/meetings[/{meeting_id}]` | Meeting CRUD | `meeting.*` |
| GET/POST | `/api/modules` | Module catalogue list / create | `module.view` / `module.create` |
| GET/PUT/DELETE | `/api/activities/{id}` | Activity detail / update (rolls up progress) / delete | `activity.*` |
| POST | `/api/activities/` | Create an activity | `activity.create` |
| POST/PUT/DELETE | `/api/activities/{id}/checklist`, `/api/activities/checklist/{item_id}` | Checklist item CRUD | `activity.update` |
| POST | `/api/activities/reorder/{phase_module_id}` | Reorder activities within a module | `activity.update` |
| GET | `/api/dashboard/summary` | Dashboard summary cards | `dashboard.view` |
| GET | `/api/search?q=` | Global search across clients/phases/activities/users | `search.view` |
| GET | `/api/audit-logs` | Paginated audit trail (filter by entity/action/user) | `audit.view` |
| GET | `/api/recycle-bin` | List soft-deleted items still within the 12-hour window | `recycle_bin.view` |
| POST | `/api/recycle-bin/restore/{entity}/{id}` | Restore a soft-deleted item | `recycle_bin.restore` |
| GET | `/api/health` | Health check | Public |

*`client.view` is not currently enforced on the list/detail client endpoints — they only require an authenticated active user (see `backend/app/routers/clients.py`). Everything else in this table maps to a real `require_permission(...)` dependency in the corresponding router.

---

## 11. Frontend Pages & Navigation

| Route | Page | Guard |
|-------|------|-------|
| `/login` | Login | Public |
| `/` | Dashboard | Any authenticated |
| `/clients` | Clients | Any authenticated |
| `/clients/:id` | ClientDetail | Any authenticated |
| `/phases` | Phases | Any authenticated |
| `/phases/:id` | PhaseDetail | Any authenticated |
| `/search` | SearchResults | Any authenticated |
| `/users` | Users | `user.view` |
| `/audit-logs` | AuditLogs | `audit.view` |
| `/recycle-bin` | RecycleBin | `recycle_bin.view` |
| `/role-permissions` | RolePermissions | `role.manage` |

`Layout.jsx` wraps every private route: a navbar with the Digii logo, Dashboard/Clients/Phases links, a permission-gated Users link, a permission-gated "Admin" dropdown (Audit Logs / Recycle Bin / Roles), a global search box, a dark-mode toggle (persisted in `localStorage`), and the current user's email/role with a logout button.

---

## 12. Configuration

Environment variables (loaded from `.env`):

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | `change-me-in-production` | JWT signing key — **must be overridden outside local dev** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Token lifetime (24 hours) |
| `DEBUG` | `false` | Parsed from common truthy strings |
| `DB_HOST` | `db` | PostgreSQL host (use `localhost` outside Docker) |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `ims` | Database user |
| `DB_PASSWORD` | `ims` | Database password |
| `DB_NAME` | `ims` | Database name |

CORS is configured in `main.py` with a hardcoded allow-list (`http://localhost:5173`, `http://localhost`) — there's no environment-driven origin list for other deployments.

---

## 13. Nginx Routing

`nginx/default.conf` proxies:

- `/api/*`, `/docs`, `/redoc`, `/openapi.json` → `backend:8000`
- `/uploads/*` → static files from `/var/www/uploads` (no backend route currently writes to this path — there is no file-upload feature yet)
- Everything else → `frontend:5173` (Vite dev server) with WebSocket support for HMR

In production, the frontend should be served as static build files rather than the Vite dev server.

---

## 14. Current Implementation Status

**Implemented:**

- Docker Compose environment (Nginx, PostgreSQL, FastAPI, React)
- JWT authentication and fine-grained, admin-configurable permission-based access control
- Client, phase, module, activity, checklist, and meeting management
- Automatic Kickoff-module generation on phase creation; automatic activity-plan generation per module added
- Real-time progress roll-up: Activity → Module → Phase → Client "Go Live" state
- Management dashboard with filters
- Global search
- Paginated audit log viewer
- Recycle bin with 12-hour restore window
- Manual drag-and-drop activity reordering
- Dark mode
- Alembic migrations; idempotent seeding

**Not Yet Implemented:**

- Activity dependency enforcement (table exists, unused)
- Document repository / file uploads (despite the Nginx `/uploads` route existing)
- Notifications
- Client-facing portal
- Usage & adoption dashboards, exportable reports
- Automated tests and CI

---

## 15. Key Design Decisions

1. **Progress is derived, not stored per leaf beyond activity level.** Module and phase progress are calculated averages of their children, recomputed on every mutating request.
2. **A module is a catalogue item; a phase module is an instance.** This keeps activity templates reusable across phases.
3. **Status is a string, not an enum.** Gives flexibility for values like `"Waiting for Client"` or `"Blocked"` without a schema migration.
4. **Cascading soft deletes** keep the hierarchy clean while remaining recoverable for 12 hours.
5. **Authorization is permission-code based, not role-name based**, so an admin can rebalance access without a code change (except the Administrator role, which is fixed to all permissions).
6. **Seed data is idempotent** and also migrates renamed permission codes, so it can run on every container startup.
7. **Nginx is the single public entry point**, simplifying CORS and routing during development.

---

## 16. Useful Commands

```bash
# Build and start everything
docker-compose up --build

# Run backend migrations (inside container)
docker exec -it ims-backend alembic upgrade head

# Create a new migration (inside container)
docker exec -it ims-backend alembic revision --autogenerate -m "description"

# Reset the database (deletes all data)
docker-compose down -v

# View backend logs
docker-compose logs -f backend
```

---

*For product-level requirements, see `docs/IMS_PRD.md`; for SOP details, see `docs/Implementation_Management_System_SOP.md`; for database column-level design, see `docs/IMS_Database_Design.md`; for the ERD, see `docs/IMS_ERD.md`; for UI/UX screens, see `docs/IMS_UI_UX_Specification.md`.*
