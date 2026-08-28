#!/bin/sh
set -e

# Run Alembic migrations once before launching multi-worker server
echo "Applying database migrations..."
uv run alembic upgrade head || echo "Alembic upgrade failed or database already at latest version"

echo "Starting Uvicorn with 4 workers..."
exec uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
