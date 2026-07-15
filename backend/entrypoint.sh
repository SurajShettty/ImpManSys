#!/bin/bash
set -e

# Wait for MySQL to be ready
echo "Waiting for MySQL at ${DB_HOST}:${DB_PORT}..."
while ! python -c "
import socket
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
try:
    s.connect(('${DB_HOST}', int('${DB_PORT}')))
    s.close()
    exit(0)
except Exception:
    exit(1)
" 2>/dev/null; do
    sleep 1
done
echo "MySQL is ready."

# Run database migrations
echo "Running database migrations..."
alembic upgrade head

# Seed initial data (idempotent)
echo "Seeding initial data..."
python - <<PY
from app.database import SessionLocal
from app.utils.seed import seed_data

db = SessionLocal()
try:
    seed_data(db)
finally:
    db.close()
PY

# Start application
echo "Starting application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
