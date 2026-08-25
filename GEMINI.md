# Инструкции для AI-агента — Smart Contacts

Этот файл является системным руководством для AI-агентов в данном воркспейсе.
Он содержит **правила, принципы и архитектурные ограничения** проекта.

> [!IMPORTANT]
> Перед внесением изменений обязательно ознакомьтесь с документацией в каталоге [`docs/`](docs/):
> - **Системная архитектура:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
> - **Интеграция с Active Directory:** [`docs/AD_INTEGRATION.md`](docs/AD_INTEGRATION.md)
> - **Бизнес-логика и модерация:** [`docs/BUSINESS_LOGIC.md`](docs/BUSINESS_LOGIC.md)
> - **Спецификация бота:** [`docs/BOT_SPEC.md`](docs/BOT_SPEC.md)

---

## 0. Поддержание порядка в документации
- **Только правила и инварианты:** Описание эндпоинтов и полей БД хранятся в `docs/` или `README.md`.
- **Относительные ссылки:** Все ссылки на файлы должны быть относительными (например, `docs/ARCHITECTURE.md`).
- **Сквозная архитектура:** Межсистемные контракты синхронизируются с `../prism/20_Architecture/Active_Directory_Integration.md`.

---

## 1. Архитектура сервисов
Проект организован по модульному принципу:
- `services/api_gateway/` — FastAPI бэкенд (REST API, WebSocket Presence, Alembic, auth).
- `services/ad_sync_worker/` — Фоновый сервис синхронизации с Active Directory (LDAP3 pull/push).
- `services/web_frontend/` — React 19 SPA (TypeScript, Vite, Tailwind CSS).
- `services/shared/` — Общие SQLAlchemy модели, Pydantic схемы и утилиты.

---

## 2. Ключевые архитектурные принципы
1. **Безопасность Active Directory:**
   - Никаких учетных записей уровня Domain Admin в коде.
   - Минимально необходимые делегированные права (read-only для справочника, write только на сброс паролей/телефон).
2. **Асинхронность бэкенда:**
   - `SQLAlchemy 2.0 AsyncSession` для всех операций с БД.
   - Redis для кэширования сессий, Rate Limiting и WebSockets Presence.
3. **Безопасность аутентификации:**
   - Хранение сессионных cookie (`HttpOnly`, `SameSite=Lax`, `Secure` в production).
   - Защита от Brute-Force через Redis Rate Limiter.

---

## 3. Команды разработки и проверок

```bash
# Запуск тестов API Gateway
uv run --directory services/api_gateway pytest

# Применение миграций Alembic
uv run --directory services/api_gateway alembic upgrade head

# Создание автомиграции
uv run --directory services/api_gateway alembic revision --autogenerate -m "описание"
```
