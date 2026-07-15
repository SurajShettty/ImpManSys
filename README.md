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

## Implemented Phases

- **Phase 1**: Scaffolding & Infrastructure (Docker, Nginx, React, FastAPI)
- **Phase 2**: Database & Authentication Foundation (JWT, roles, users, audit logs)

## Next Steps

- Client & Project CRUD
- Module / Phase / Task hierarchy
- Dashboards & reporting
