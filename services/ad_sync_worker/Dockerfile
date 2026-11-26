FROM python:3.12-slim-bookworm

# Suppress debconf warnings
ENV DEBIAN_FRONTEND=noninteractive

# Debian ships apt sources over plain HTTP, which is often blocked in
# corporate networks. Default to HTTPS and allow overriding the mirror
# (e.g. an internal one) without editing the Dockerfile.
#   docker compose build --build-arg DEBIAN_MIRROR=mirror.corp.local
ARG DEBIAN_MIRROR=deb.debian.org
ARG DEBIAN_SCHEME=https

# Install system dependencies
RUN set -eux; \
    for f in /etc/apt/sources.list /etc/apt/sources.list.d/debian.sources; do \
        [ -f "$f" ] || continue; \
        sed -i -E "s#https?://[A-Za-z0-9.-]*deb\.debian\.org#${DEBIAN_SCHEME}://${DEBIAN_MIRROR}#g" "$f"; \
    done; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        apt-utils \
        libpq-dev \
        gcc \
    ; \
    rm -rf /var/lib/apt/lists/*

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
