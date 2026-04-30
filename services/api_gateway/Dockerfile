FROM python:3.12-slim-bookworm

# Suppress debconf warnings
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    apt-utils \
    curl \
    libpq-dev \
    gcc \
    krb5-user \
    libkrb5-dev \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy dependency files
COPY services/api_gateway/pyproject.toml services/api_gateway/uv.lock ./

# Install dependencies using uv
RUN uv sync --no-dev

# Copy shared code
COPY services/shared ./shared

# Copy application code
COPY services/api_gateway .

# Expose port
EXPOSE 8000

# Command to run the application
# We use 'uv run' to ensure we use the synced environment
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
