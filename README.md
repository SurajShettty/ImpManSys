# Implementation Management System (IMS)

A centralized platform to manage client onboarding, implementation, rollout, enhancements, and adoption.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js (Vite) |
| Backend API | FastAPI (Python) |
| Database | MySQL 8.x |
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

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

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
