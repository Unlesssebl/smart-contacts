FROM python:3.12-slim-bookworm

# Suppress debconf warnings
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    apt-utils \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy dependency files
COPY services/ad_sync_worker/pyproject.toml services/ad_sync_worker/uv.lock ./

# Install dependencies using uv
RUN uv sync --no-dev

# Copy shared code
COPY services/shared ./shared

# Copy application code
COPY services/ad_sync_worker .

# Command to run the worker
CMD ["uv", "run", "python", "main.py"]
