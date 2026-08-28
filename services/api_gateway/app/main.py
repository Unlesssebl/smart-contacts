import os
import secrets
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.ldap import init_ldap_pool
from app.db.session import engine
import shared.models  # noqa: F401
from shared.database import Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Startup: Initialize LDAP pool
    init_ldap_pool()
    yield
    # Shutdown logic (if any) could go here

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Prometheus Metrics Instrumentation
Instrumentator().instrument(app).expose(app, endpoint="/metrics")

trusted_proxies = [h.strip() for h in settings.TRUSTED_PROXIES.split(",") if h.strip()]
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=trusted_proxies)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"

        # Auto-issue csrf_token cookie for browser clients if missing in request and not already set by endpoint
        if "csrf_token" not in request.cookies:
            raw_headers = response.raw_headers
            has_csrf_set = any(
                k.lower() == b"set-cookie" and b"csrf_token=" in v
                for k, v in raw_headers
            )
            if not has_csrf_set:
                csrf_token = secrets.token_hex(32)
                response.set_cookie(
                    key="csrf_token",
                    value=csrf_token,
                    httponly=False,
                    secure=getattr(settings, "COOKIE_SECURE", False),
                    samesite="lax",
                    path="/",
                    max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
                )
        return response

# Parse allowed origins from settings
origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()]

app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=bool(origins),
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-CSRF-Token", "Accept", "Origin", "X-Requested-With"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8080, reload=True)
