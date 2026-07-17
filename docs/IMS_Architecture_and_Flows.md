# Implementation Management System (IMS) — Project Guide

> A centralized platform for managing client onboarding, implementation, rollout, enhancements, and adoption.

---

## 1. What is this project?

The **Implementation Management System (IMS)** is an internal customer-success and implementation-management platform. It is built around the hierarchy:

```
Client → Project → Module → Phase → Task → Checklist → Completion
```

Every client can have multiple projects. Each project can contain multiple modules. When a module is added to a project, the system automatically generates a standard 7-phase implementation plan with tasks. As tasks are completed, progress rolls up to the phase, module, and project levels. Managers see this on a dashboard.

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite | Browser UI |
| **Routing** | react-router-dom | SPA navigation |
| **HTTP client** | axios | API calls to backend |
| **Backend API** | FastAPI (Python 3.12) | REST API |
| **Database** | PostgreSQL 16 | Persistent data |
| **ORM** | SQLAlchemy 2.0 | Database access & models |
| **Migrations** | Alembic | Schema versioning |
| **Authentication** | JWT (python-jose + bcrypt) | Stateless login |
| **Password hashing** | bcrypt | Secure password storage |
| **Validation** | Pydantic / Pydantic-Settings | Request/response schemas & config |
| **File Storage** | Local filesystem (mounted volume) | Uploads |
| **Reverse Proxy** | Nginx | Routes `/api`, `/docs`, `/uploads` and SPA |
| **Deployment** | Docker Compose | Local and containerized deployment |

---

## 3. Repository Structure

```
ImpManSys/
├── .env.example                 # Example environment variables
├── .gitignore
├── docker-compose.yml           # Multi-service orchestration
├── README.md                    # Quick start
├── docs/                        # Product & design docs
│   ├── Implementation_Management_System_SOP.md
│   ├── IMS_Database_Design.md
│   ├── IMS_PRD.md
│   ├── IMS_UI_UX_Specification.md
│   └── IMS_Architecture_and_Flows.md  # This file
├── backend/                     # FastAPI application
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app & router registration
│   │   ├── config.py            # Pydantic settings
│   │   ├── database.py          # SQLAlchemy engine & session
│   │   ├── models.py            # SQLAlchemy ORM models
│   │   ├── schemas.py           # Pydantic request/response schemas
│   │   ├── auth.py              # Password hashing & JWT helpers
│   │   ├── dependencies.py      # Auth dependency injections
│   │   ├── utils/
│   │   │   ├── seed.py          # Roles, modules, admin user seed
│   │   │   └── audit.py         # Activity logging helper
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   └── templates.py     # Module plan generation & progress roll-up
│   │   └── routers/
│   │       ├── auth.py          # Login / current user
│   │       ├── users.py         # User CRUD
│   │       ├── roles.py         # Role CRUD
│   │       ├── clients.py       # Client CRUD
│   │       ├── projects.py      # Project CRUD + module add/remove + plan
│   │       ├── modules.py       # Module catalogue
│   │       ├── tasks.py         # Task CRUD + checklist
│   │       ├── dashboard.py     # Dashboard summary
│   │       └── health.py        # Health check
│   ├── alembic/                 # Database migrations
│   │   ├── versions/
│   │   │   ├── 001_initial_schema.py
│   │   │   └── 8cb1a7727bd3_core_hierarchy_clients_projects_modules_.py
│   │   └── env.py
│   ├── uploads/                 # File uploads (local)
│   ├── .env                     # Runtime config (not in git)
│   ├── alembic.ini
│   ├── Dockerfile
│   ├── entrypoint.sh            # Startup: wait for DB, migrate, seed, run
│   └── requirements.txt
├── frontend/                    # React application
│   ├── src/
│   │   ├── main.jsx             # React entry point
│   │   ├── App.jsx              # Routes
│   │   ├── index.css            # Global styles
│   │   ├── api/
│   │   │   └── client.js        # Axios instance with token interceptor
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Auth state provider
│   │   ├── components/
│   │   │   ├── Layout.jsx       # App shell / navigation
│   │   │   ├── PrivateRoute.jsx # Login guard
│   │   │   ├── RoleRoute.jsx    # Role-based guard
│   │   │   └── ui.jsx           # Reusable UI components
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Dashboard.jsx
│   │       ├── Clients.jsx
│   │       ├── ClientDetail.jsx
│   │       ├── Projects.jsx
│   │       ├── ProjectDetail.jsx
│   │       └── Users.jsx
│   ├── Dockerfile
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── nginx/
    └── default.conf               # Reverse proxy configuration
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

Public URLs:

- Web app: `http://localhost`
- API docs (Swagger): `http://localhost/docs`
- ReDoc: `http://localhost/redoc`
- Direct backend: `http://localhost:8000`

### Without Docker (local development)

**Backend:**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate       # Windows
# source .venv/bin/activate  # Linux/Mac
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

## 5. Default Users & Roles

On first startup, `seed_data()` creates:

| Role | Description |
|------|-------------|
| Administrator | Full system access |
| Customer Success Manager | Manages client relationships |
| Project Manager | Manages projects and resources |
| Implementation Executive | Executes implementation tasks |
| Data Team | Handles data and reports |
| Support Team | Provides client support |
| Management | Views dashboards and reports |
| Client | Client portal view-only access |

Default administrator login:

- Email: `admin@ims.local`
- Password: `admin123`

The system also seeds the **module catalogue** (15 standard modules): Admissions, Attendance, Academics, Finance, Examination, Hostel, Transport, Library, LMS, Feedback, Placement, Research, Alumni, Campus Help Centre, Analytics.

---

## 6. Authentication & Authorization

### Flow

1. User submits email/password to `POST /api/auth/login`.
2. Backend verifies password with `bcrypt`.
3. Backend issues a **JWT access token** signed with `SECRET_KEY`.
4. Token expires after `ACCESS_TOKEN_EXPIRE_MINUTES` (default: 24 hours).
5. Frontend stores the token in `localStorage` and sends it as `Authorization: Bearer <token>` on every request.
6. `dependencies.py` decodes the token and loads the current user.
7. `require_role(...)` guards endpoints by role name.

### Role Restrictions

| Area | Allowed Roles |
|------|---------------|
| Clients CRUD | Administrator, Customer Success Manager, Project Manager |
| Projects CRUD | Administrator, Customer Success Manager, Project Manager |
| Add/remove modules | Administrator, Customer Success Manager, Project Manager |
| Task CRUD, checklist | Administrator, CSM, Project Manager, Implementation Executive |
| Module catalogue create | Administrator only |
| Users CRUD | Administrator only (UI) |
| Dashboard / read | Any authenticated active user |
| Client delete | Administrator only |

---

## 7. Data Model / Entity Hierarchy

### Core Entities

```
┌─────────────────┐
│     Role        │
└────────┬────────┘
         │
┌────────▼────────┐     ┌─────────────────┐     ┌─────────────────┐
│      User       │     │     Client      │     │     Module      │
│  (system users) │     │   (customer)    │     │  (catalogue)    │
└────────┬────────┘     └────────┬────────┘     └─────────────────┘
         │                         │
         │              ┌──────────▼──────────┐
         │              │       Project       │
         │              │  (engagement work)  │
         │              └──────────┬──────────┘
         │                         │
         │              ┌──────────▼──────────┐     ┌──────────────┐
         │              │   ProjectModule     │────▶│   Module     │
         │              │ (module instance)   │     └──────────────┘
         │              └──────────┬──────────┘
         │                         │
         │              ┌──────────▼──────────┐
         │              │       Phase         │
         │              │  (implementation    │
         │              │      step)          │
         │              └──────────┬──────────┘
         │                         │
         │              ┌──────────▼──────────┐     ┌──────────────┐
         │              │        Task         │◀────│ TaskDependency│
         └─────────────▶│ (assigned work)     │     └──────────────┘
                        └──────────┬──────────┘
                                   │
                        ┌──────────▼──────────┐
                        │    ChecklistItem    │
                        │  (sub-completion)     │
                        └─────────────────────┘
```

### Table Descriptions

| Table | Purpose |
|-------|---------|
| `roles` | Master list of user roles |
| `users` | System users (admins, managers, executives, etc.) |
| `clients` | Customers / institutions |
| `modules` | Master catalogue of implementable modules |
| `projects` | An engagement under a client |
| `project_modules` | A module selected for a specific project |
| `phases` | One of the 7 standard implementation phases inside a module |
| `tasks` | Actionable work item under a phase |
| `checklist_items` | Sub-items under a task |
| `task_dependencies` | Task-to-task dependency links |
| `activity_logs` | Audit trail of user actions |

### Key Relationships

- `Client` has many `Project`s (`cascade delete`).
- `Project` has many `ProjectModule`s (`cascade delete`).
- `ProjectModule` has many `Phase`s (`cascade delete`).
- `Phase` has many `Task`s (`cascade delete`).
- `Task` has many `ChecklistItem`s (`cascade delete`).
- `Task` has many `TaskDependency` rows (`cascade delete`).
- `User` is referenced by `Client.csm_id`, `Client.pm_id`, `Task.owner_id`, `Task.reviewer_id`.

---

## 8. Project Lifecycle: What Gets Created When

### 8.1 Application Startup

When the backend container starts (`entrypoint.sh`):

1. Waits for PostgreSQL to accept connections.
2. Runs `alembic upgrade head` to apply migrations.
3. Runs `seed_data()`:
   - Creates default `roles` if missing.
   - Creates default `modules` catalogue if missing.
   - Creates the default `admin@ims.local` user if missing.
4. Starts `uvicorn`.

### 8.2 Creating a Client

Endpoint: `POST /api/clients`

Required fields: `name`  
Optional fields: `crm_id`, `institution_type`, `status`, `priority`, `contract_start`, `end_date`, `go_live_date`, `csm_id`, `pm_id`, `sales_owner`

What is created:

- One row in the `clients` table.
- An `activity_logs` entry: `"client" "create"`.

### 8.3 Creating a Project

Endpoint: `POST /api/projects`

Required fields: `client_id`, `name`  
Optional fields: `description`, `type`, `status`, `start_date`, `end_date`

What is created:

- One row in the `projects` table with `progress = 0` and `status = "Not Started"`.
- An `activity_logs` entry: `"project" "create"`.

**A project starts empty.** It has no modules until you explicitly add them.

### 8.4 Adding a Module to a Project

Endpoint: `POST /api/projects/{id}/modules`

Required body: `module_id`

What is created **automatically** for every module added:

| Object | Count | Description |
|--------|-------|-------------|
| `project_modules` row | 1 | Links the module to the project |
| `phases` rows | 7 | Kickoff → Configuration → Data Preparation → Testing → Training → Go-Live → Hypercare |
| `tasks` rows | 28 | 4 tasks per phase (standard template) |

The standard template is defined in `backend/app/services/templates.py`:

| Phase | Tasks |
|-------|-------|
| Kickoff | Requirement Gathering, Stakeholder Identification, Scope Confirmation, Timeline Approval |
| Configuration | System Configuration, User Roles, Permissions, Academic Setup |
| Data Preparation | Student Import, Faculty Import, Programme Mapping, Timetable Upload |
| Testing | Functional Testing, UAT, Issue Resolution |
| Training | Admin Training, Faculty Training, Student Orientation |
| Go-Live | Production Enablement, Monitoring |
| Hypercare | Daily Monitoring, Bug Fixes, Client Support |

After creation, the project-level progress is recalculated. Because the module starts at 0%, the project stays at 0%.

**Example:** If a project has 3 modules added, the database contains:

- 3 `project_modules` rows
- 21 `phases` rows
- 84 `tasks` rows

### 8.5 Updating a Task

Endpoint: `PUT /api/tasks/{id}`

What happens:

1. The task row is updated (status, progress, dates, owner, reviewer, etc.).
2. If the status is changed to `"Completed"` and no progress is provided, `progress` is set to `100` automatically.
3. `recompute_project_module_progress()` is called:
   - It averages all task progress values for the module.
   - It sets the module `status` to `"Completed"`, `"In Progress"`, or `"Not Started"` accordingly.
4. `recompute_project_progress()` is called:
   - It averages all module progress values for the project.
   - It updates the project `status` unless it is `"On Hold"` or `"Cancelled"`.
5. An `activity_logs` entry is created: `"task" "update"`.

So the progress flows upward: **Task → Module → Project**.

### 8.6 Checklist Items

Endpoint: `POST /api/tasks/{task_id}/checklist`

- Adds a `checklist_items` row linked to a task.
- Can be toggled complete/incomplete via `PUT /api/tasks/checklist/{item_id}`.
- Checklist completion does **not** currently auto-update task progress; it is a manual tracking aid.

### 8.7 Closing/Deleting a Project

- Deleting a project (`DELETE /api/projects/{id}`) cascades and deletes all `project_modules`, `phases`, `tasks`, `checklist_items`, and `task_dependencies` under it.
- Deleting a client cascades and deletes all its projects too.

---

## 9. Dashboard

Endpoint: `GET /api/dashboard/summary`

Returns:

| Field | Definition |
|-------|------------|
| `total_clients` | Count of all clients |
| `total_projects` | Count of all projects |
| `active_projects` | Projects with status `"Not Started"`, `"In Progress"`, or `"On Hold"` |
| `delayed_projects` | Projects not `"Completed"`/`"Cancelled"` with `end_date < today` |
| `go_live_this_month` | Clients with `go_live_date` in the current calendar month |

---

## 10. API Endpoints

| Method | Path | Description | Access |
|--------|------|-------------|--------|
| POST | `/api/auth/login` | Login, returns JWT | Public |
| GET | `/api/auth/me` | Current logged-in user | Any authenticated |
| GET | `/api/users` | List users | Any authenticated |
| POST | `/api/users` | Create user | Any authenticated (router-level) |
| GET | `/api/roles` | List roles | Any authenticated |
| GET | `/api/clients` | List clients | Any authenticated |
| POST | `/api/clients` | Create client | Manager roles |
| GET | `/api/clients/{id}` | Client detail | Any authenticated |
| PUT | `/api/clients/{id}` | Update client | Manager roles |
| DELETE | `/api/clients/{id}` | Delete client | Administrator |
| GET | `/api/clients/{id}/projects` | List projects under a client | Any authenticated |
| GET | `/api/projects` | List projects | Any authenticated |
| POST | `/api/projects` | Create project | Manager roles |
| GET | `/api/projects/{id}` | Project detail | Any authenticated |
| PUT | `/api/projects/{id}` | Update project | Manager roles |
| DELETE | `/api/projects/{id}` | Delete project | Administrator / PM |
| GET | `/api/projects/{id}/modules` | Modules under a project | Any authenticated |
| POST | `/api/projects/{id}/modules` | Add a module (auto-generates plan) | Manager roles |
| DELETE | `/api/projects/{id}/modules/{pm_id}` | Remove a module | Manager roles |
| GET | `/api/projects/{id}/plan` | Full drill-down plan | Any authenticated |
| GET | `/api/modules` | Module catalogue | Any authenticated |
| POST | `/api/modules` | Create a new module in catalogue | Administrator |
| GET | `/api/tasks/{id}` | Task detail | Any authenticated |
| POST | `/api/tasks` | Create a task | Executor roles |
| PUT | `/api/tasks/{id}` | Update a task (triggers progress roll-up) | Executor roles |
| DELETE | `/api/tasks/{id}` | Delete a task | Executor roles |
| POST | `/api/tasks/{id}/checklist` | Add checklist item | Executor roles |
| PUT | `/api/tasks/checklist/{item_id}` | Update checklist item | Executor roles |
| DELETE | `/api/tasks/checklist/{item_id}` | Delete checklist item | Executor roles |
| GET | `/api/dashboard/summary` | Dashboard summary | Any authenticated |
| GET | `/api/health` | Health check | Public |

---

## 11. Frontend Pages & Navigation

| Route | Page | Notes |
|-------|------|-------|
| `/login` | Login | Public |
| `/` | Dashboard | Management summary cards |
| `/clients` | Clients | List and create clients |
| `/clients/:id` | ClientDetail | Client info + projects |
| `/projects` | Projects | List and create projects |
| `/projects/:id` | ProjectDetail | Add modules, view plan, update tasks |
| `/users` | Users | Admin-only user management |

The `Layout` component wraps all private routes and shows navigation plus the authenticated user's email.

---

## 12. Configuration

Environment variables (loaded from `.env` at the project root and passed to containers):

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | `change-me-in-production` | JWT signing key |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Token lifetime (24 hours) |
| `DB_HOST` | `db` | PostgreSQL host (use `localhost` outside Docker) |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `ims` | Database user |
| `DB_PASSWORD` | `ims` | Database password |
| `DB_NAME` | `ims` | Database name |

---

## 13. Nginx Routing

`nginx/default.conf` proxies traffic:

- `/api/*` → `backend:8000`
- `/docs`, `/redoc`, `/openapi.json` → `backend:8000`
- `/uploads/*` → static files from `/var/www/uploads`
- Everything else → `frontend:5173` (React/Vite dev server) with WebSocket support for HMR

In production, the frontend should be served as static build files rather than the Vite dev server.

---

## 14. Current Implementation Status (as of Phase 3)

**Implemented:**

- Docker Compose environment with Nginx, PostgreSQL, FastAPI, and React.
- JWT authentication and role-based access control.
- User, role, client, project, module, task, and checklist management.
- Automatic 7-phase implementation plan generation when a module is added to a project.
- Real-time progress roll-up: Task → Module → Project.
- Management dashboard summary.
- Audit logging for key actions.
- Alembic database migrations.
- Idempotent seeding of roles, modules, and admin user.

**Planned / Not Yet Implemented:**

- Risk Register
- Issue Tracker
- Meeting / Communication log
- Document repository with file uploads
- Task dependency engine enforcement
- Gantt timeline / Kanban board
- Notifications
- Client portal
- Usage & adoption dashboards
- Reports and exports

---

## 15. Key Design Decisions

1. **Progress is derived, not stored per leaf.** Task progress is manual or auto-set to 100% on completion; module and project progress are calculated averages.
2. **A module is a catalogue item; a project module is an instance.** This keeps templates reusable across projects.
3. **Status is a string, not an enum.** This gives flexibility for statuses like `"Waiting for Client"`, `"Blocked"`, etc.
4. **Cascading deletes** keep the hierarchy clean: deleting a client removes everything under it.
5. **Seed data is idempotent.** It can run on every startup without creating duplicates.
6. **Nginx is the single public entry point.** This simplifies CORS and routing during development.

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

*End of document. For product-level requirements, see `docs/IMS_PRD.md`; for SOP details, see `docs/Implementation_Management_System_SOP.md`; for database column-level design, see `docs/IMS_Database_Design.md`; for UI/UX screens, see `docs/IMS_UI_UX_Specification.md`.*
