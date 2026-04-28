FROM python:3.11-slim-bookworm

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy dependency files
COPY pyproject.toml ./
# If uv.lock exists, copy it too. For now, we'll let uv generate it if missing.
# COPY uv.lock ./

# Install dependencies using uv
RUN uv sync --no-dev

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Command to run the application
# We use 'uv run' to ensure we use the synced environment
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
