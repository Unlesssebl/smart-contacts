# 🚪 API Gateway (FastAPI Backend)

Основной шлюз API системы «Smart Contacts», обслуживающий веб-интерфейс, внешних клиентов и сервисы взаимодействия по протоколам REST, WebSockets и SSO.

---

## 🛠️ Стек технологий

* **Язык и среда:** Python 3.12, `uv`
* **Фреймворк:** FastAPI, Uvicorn, Starlette
* **База данных:** PostgreSQL 15, SQLAlchemy 2.0 (Sync sessions in threadpool), Alembic
* **Кэш и шина событий:** Redis 7 (Pub/Sub, Rate Limiting, Presence)
* **Аутентификация и безопасность:** LDAP3 (LDAPS/TLS), `pyspnego` (Kerberos SPNEGO), `python-jose` (JWT), `passlib`
* **Метрики:** `prometheus-fastapi-instrumentator`

---

## 📂 Структура проекта

```text
services/api_gateway/
├── app/
│   ├── api/
│   │   ├── endpoints/       # Роуты API (/auth, /users, /profile, /change_requests, /admin)
│   │   └── deps.py          # Внедрение зависимостей (DB session, текущий пользователь, CSRF)
│   ├── core/
│   │   ├── config.py        # Конфигурация Pydantic Settings (.env)
│   │   ├── security.py      # Хэширование, JWT токены, Double Submit CSRF
│   │   ├── rate_limit.py    # Redis-based Rate Limiter и защита от Brute-Force
│   │   └── ldap/            # Модульная интеграция с Active Directory (TLS, pool, auth, search)
│   ├── db/
│   │   └── session.py       # Пул соединений SQLAlchemy
│   ├── schemas/             # Pydantic v2 DTO схемы запросов и ответов
│   ├── services/            # Бизнес-сервисы (Presence WebSocket Manager, Gatekeeper, User sync)
│   └── main.py              # Точка входа FastAPI приложения, middleware, lifespan
├── migrations/ & alembic/   # Миграции схемы базы данных
├── tests/                   # Модульные и интеграционные тесты (pytest, pytest-asyncio)
└── pyproject.toml           # Зависимости и конфигурация uv
```

---

## ⚙️ Ключевые возможности

1. **Двухуровневая аутентификация**:
   * Kerberos SSO через `/auth/sso` для бесшовного входа с доменных рабочих станций.
   * LDAP BIND через `/auth/login` с передачей JWT в `HttpOnly`, `Secure`, `SameSite=Lax` cookies.
2. **Real-time WebSockets & Presence**:
   * Отслеживание онлайн-статусов пользователей в Redis Hash `global_presence`.
   * Мгновенная рассылка системных событий (`admin_update`, `profile_updated`) через Redis Pub/Sub.
3. **Механизм Gatekeeper**:
   * Принудительная верификация контактных данных с поддержкой мягкой/жесткой блокировки и защитой от обхода.
4. **Интерактивная автодокументация**:
   * Swagger UI доступен по адресу `/docs`.
   * ReDoc доступен по адресу `/redoc`.

---

## ⚡ Локальный запуск

### 1. Установка зависимостей через uv
```bash
uv sync
```

### 2. Запуск сервера разработки
```bash
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Управление миграциями базы данных
```bash
# Применить миграции к БД:
uv run alembic upgrade head

# Создать новую миграцию:
uv run alembic revision --autogenerate -m "описание_изменений"
```

---

## 🧪 Тестирование

```bash
# Запуск тестов API Gateway:
uv run pytest

# Запуск с детальным выводом:
uv run pytest -v -s
```
