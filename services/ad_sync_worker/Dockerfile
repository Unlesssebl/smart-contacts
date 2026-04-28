FROM python:3.12-slim-bookworm

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy dependency files
COPY pyproject.toml ./

# Install dependencies using uv
RUN uv sync --no-dev

# Copy application code
COPY . .

# Command to run the worker
CMD ["uv", "run", "python", "main.py"]
