# Gemini Project Context: Smart Directory

## Project Overview
**Smart Directory** is an automated corporate directory system designed to maintain Active Directory (AD) as the "Single Source of Truth" (SSOT) while delegating contact updates to employees through a self-service Web Portal. It features a microservices architecture to handle API requests, background AD synchronization, and a user-friendly frontend.

### Core Technologies
- **Backend:** Python 3.12, [FastAPI](https://fastapi.tiangolo.com/), [SQLAlchemy](https://www.sqlalchemy.org/) (ORM), [Pydantic](https://docs.pydantic.dev/) (Data validation).
- **Frontend:** React 19, TypeScript, [Vite](https://vitejs.dev/), [Ant Design](https://ant.design/) (UI), [Zustand](https://zustand-demo.pmnd.rs/) (State management).
- **Synchronization:** [ldap3](https://ldap3.readthedocs.io/) for Active Directory integration.
- **Database:** PostgreSQL 15 (with `pg_trgm` for fuzzy search).
- **Caching/Sessions:** Redis.
- **Infrastructure:** Docker & Docker Compose.
- **Python Package Management:** [uv](https://github.com/astral-sh/uv).

---

## Project Structure
```text
.
├── docs/                   # Detailed technical documentation
├── services/
│   ├── ad_sync_worker/     # Background service for AD <-> DB synchronization
│   ├── api_gateway/        # Central REST API (FastAPI)
│   └── web_frontend/       # React SPA (Vite + Ant Design)
├── docker-compose.yml      # Orchestration for all services
├── init.sql                # PostgreSQL schema and extensions initialization
└── .env.example            # Template for environment variables
```

---

## Building and Running

### Prerequisites
- Docker and Docker Compose
- `uv` (for local Python development)
- Node.js (for local Frontend development)

### Quick Start (Docker)
1. **Configure Environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your AD/LDAP and DB credentials
   ```
2. **Launch Services:**
   ```bash
   docker compose up -d --build
   ```

### Local Development
- **API Gateway:**
  ```bash
  cd services/api_gateway
  uv sync
  uv run uvicorn app.main:app --reload --port 8000
  ```
- **Web Frontend:**
  ```bash
  cd services/web_frontend
  npm install
  npm run dev
  ```
- **AD Sync Worker:**
  ```bash
  cd services/ad_sync_worker
  uv sync
  uv run python main.py
  ```

---

## Development Conventions

### Backend (API Gateway & Worker)
- **Style:** PEP 8 compliance; use type hints extensively.
- **Database:** Use SQLAlchemy 2.0+ declarative models. Database migrations are currently handled via `init.sql` for the initial schema.
- **API Design:** Follow RESTful principles. Swagger UI is available at `/docs`.
- **Validation:** All request/response schemas should be defined using Pydantic.

### Frontend
- **State Management:** Use Zustand for global state (e.g., auth, user profile).
- **UI Components:** Prefer Ant Design components for consistency.
- **API Calls:** Use the centralized Axios client in `src/api/client.ts`.

### Database & Search
- **Fuzzy Search:** The system uses PostgreSQL's `pg_trgm` extension. Queries targeting `full_name`, `department`, or `office_location` should utilize the `%` operator for similarity matching.
- **SSOT:** Always respect the flow: `Web/Bot -> change_requests -> (Approval) -> AD -> Sync -> users table`.

---

## Key Files
- `docs/ARCHITECTURE.md`: High-level system design.
- `init.sql`: Defines the core `users`, `change_requests`, and `reports` tables.
- `services/api_gateway/app/api/v1/router.py`: Main API routing.
- `services/ad_sync_worker/app/sync.py`: Core synchronization logic between DB and LDAP.
