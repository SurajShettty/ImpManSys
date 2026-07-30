# Implementation Management System (IMS)

A centralized platform to manage client onboarding, implementation, rollout, enhancements, and adoption.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js (Vite) |
| Backend API | FastAPI (Python) |
| Database | PostgreSQL 16 |
| ORM | SQLAlchemy |
| Authentication | JWT |
| File Storage | Local Storage |
| Deployment | Docker + Nginx |

## Quick Start

### 1. Clone / setup environment

```bash
cp .env.example .env
```

### 2. Run with Docker Compose

```bash
docker-compose up --build
```

Once all services are healthy:

- Web app: http://localhost
- API docs: http://localhost/docs
- Backend direct: http://localhost:8000

### 3. Default login

- Email: `admin@ims.local`
- Password: `admin123`

## Local Development (without Docker)

### 1. Install PostgreSQL 16

Download and install from https://www.postgresql.org/download/windows/

Create the database and user:

```sql
CREATE DATABASE ims;
CREATE USER ims WITH PASSWORD 'ims';
GRANT ALL PRIVILEGES ON DATABASE ims TO ims;
```

### 2. Backend

```bash
cd backend
python -m venv .venv

# On Windows:
.venv\Scripts\activate

# On Linux/Mac:
source .venv/bin/activate

pip install -r requirements.txt
alembic upgrade head
python -c "from app.database import SessionLocal; from app.utils.seed import seed_data; db = SessionLocal(); seed_data(db); db.close()"
uvicorn app.main:app --reload
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
ImpManSys/
├── backend/          # FastAPI application
├── frontend/         # React (Vite) application
├── nginx/            # Nginx reverse proxy config
├── docker-compose.yml
├── .env.example
└── docs/             # PRD, DB design, UI/UX spec, SOP
```

## Implemented Features

- Docker Compose environment (Nginx, PostgreSQL, FastAPI, React)
- JWT authentication with a fine-grained, admin-editable permission matrix (not just role names)
- `Client → Phase → Module → Activity → Checklist` hierarchy
  - Every new phase automatically gets a "Kickoff" module with default activities
  - Adding a module to a phase auto-generates that module's predefined activity list (module catalogue: 18 modules)
  - Real-time progress roll-up: Activity → Module → Phase → Client "Go Live" state
- Meeting & communication log per phase, rolled up per client
- Management dashboard (clients, active/delayed phases, upcoming go-lives) with filters
- Global search across clients, phases, activities, and users
- Paginated audit log viewer and a 12-hour recycle bin for soft-deleted records
- Drag-and-drop activity reordering, dark mode

### Key API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/clients` | List / create clients |
| GET/PUT/DELETE | `/api/clients/{id}` | Client detail / update / delete |
| GET/POST | `/api/phases` | List / create phases |
| POST | `/api/phases/{id}/modules` | Add a module (auto-generates its activity plan) |
| GET | `/api/phases/{id}/plan` | Full drill-down: modules → activities → checklists |
| GET | `/api/modules` | Module catalogue |
| PUT | `/api/activities/{id}` | Update an activity (status change rolls progress up) |
| POST | `/api/activities/{id}/checklist` | Add a checklist item |
| GET | `/api/dashboard/summary` | Management dashboard cards |
| GET | `/api/search` | Global search |
| GET | `/api/audit-logs` | Audit trail |
| GET | `/api/recycle-bin` | Soft-deleted items pending restore |

See `docs/IMS_Architecture_and_Flows.md` for the full endpoint list.

## Known Gaps / Next Steps

- Activity dependency enforcement (schema exists, not wired to any API/UI)
- Document repository / file uploads, notifications, client portal
- Automated tests and CI
- `SECRET_KEY` must be overridden via environment variable before any non-local deployment — it currently falls back to a placeholder value
- List endpoints (clients/phases/activities) have no pagination yet
