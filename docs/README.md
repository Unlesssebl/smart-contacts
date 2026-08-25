# 📚 Документация проекта Smart Contacts

Центральная база знаний, архитектурных соглашений и карта документации проекта.

---

## 🏛️ Сквозная системная документация

Документы, описывающие общие архитектурные принципы, сквозную бизнес-логику и протоколы интеграций всей системы:

| Документ | Описание |
| :--- | :--- |
| 🏛️ **[ARCHITECTURE.md](file:///c:/Users/belikov.a/Desktop/Акты,%20документы/Work/!Projects/smart-contacts/docs/ARCHITECTURE.md)** | Системная архитектура, микросервисы, аутентификация (Kerberos SSO / LDAP BIND, JWT, CSRF), Redis Pub/Sub, WebSockets Presence и архитектура Observability. |
| 🔄 **[AD_INTEGRATION.md](file:///c:/Users/belikov.a/Desktop/Акты,%20документы/Work/!Projects/smart-contacts/docs/AD_INTEGRATION.md)** | Специфика интеграции с Active Directory: маппинг атрибутов LDAP ↔ PostgreSQL, алгоритмы синхронизации (Pull/Push), логика статусов (`userAccountControl`, суффиксы логинов) и иерархия подразделений (OU). |
| ⚙️ **[BUSINESS_LOGIC.md](file:///c:/Users/belikov.a/Desktop/Акты,%20документы/Work/!Projects/smart-contacts/docs/BUSINESS_LOGIC.md)** | Бизнес-правила: механизм актуализации контактов Gatekeeper (soft/hard block, bypass prevention), ролевая модель, VIP-защита профилей и сценарии обработки заявок. |
| 🤖 **[BOT_SPEC.md](file:///c:/Users/belikov.a/Desktop/Акты,%20документы/Work/!Projects/smart-contacts/docs/BOT_SPEC.md)** | Контракт взаимодействия с внешним Telegram-ботом (LLM Function Calling и отправка жалоб). |
| 🏢 **[CN.md](file:///c:/Users/belikov.a/Desktop/Акты,%20документы/Work/!Projects/smart-contacts/docs/CN.md)** | Справочник канонических наименований юридических лиц и организаций для маппинга подразделений AD. |
| 📝 **[adr/0001-async-migration.md](file:///c:/Users/belikov.a/Desktop/Акты,%20документы/Work/!Projects/smart-contacts/docs/adr/0001-async-migration.md)** | Architecture Decision Record: стратегия и дорожная карта перехода на асинхронный стек (`asyncpg`, `bonsai`). |

---

## 📦 Документация сервисов и модулей

Каждый компонент проекта изолирован и сопровождается собственным локальным руководством:

| Компонент | Путь | Описание |
| :--- | :--- | :--- |
| 🚪 **API Gateway** | **[services/api_gateway/README.md](file:///c:/Users/belikov.a/Desktop/Акты,%20документы/Work/!Projects/smart-contacts/services/api_gateway/README.md)** | REST API & WebSockets на FastAPI, сессии, LDAP-модули, миграции Alembic, тесты. |
| 🔄 **AD Sync Worker** | **[services/ad_sync_worker/README.md](file:///c:/Users/belikov.a/Desktop/Акты,%20документы/Work/!Projects/smart-contacts/services/ad_sync_worker/README.md)** | Фоновый воркер синхронизации с Active Directory, Pull/Push циклы, парсинг UAC. |
| 🎨 **Web Frontend** | **[services/web_frontend/README.md](file:///c:/Users/belikov.a/Desktop/Акты,%20документы/Work/!Projects/smart-contacts/services/web_frontend/README.md)** | Клиентский интерфейс (React 19, TypeScript, Vite, Tailwind CSS), Zustand сторы, Mock-сервер. |
| 📦 **Shared Package** | **[services/shared/README.md](file:///c:/Users/belikov.a/Desktop/Акты,%20документы/Work/!Projects/smart-contacts/services/shared/README.md)** | Общие SQLAlchemy 2.0 модели БД, утилиты парсинга GUID и телефонов. |
| 📊 **Monitoring** | **[../monitoring/README.md](file:///c:/Users/belikov.a/Desktop/Акты,%20документы/Work/!Projects/monitoring/README.md)** | Централизованный сервис мониторинга (Prometheus + Grafana), конфигурация Scrape Job и дашборды. |

---

## 🔌 Автодокументация API и схемы данных

* **Интерактивная REST API документация**:
  * Swagger UI: `http://localhost:8001/docs` (генерируется на лету из FastAPI/Pydantic).
  * ReDoc: `http://localhost:8001/redoc`.
* **Схема базы данных**:
  * Единый источник истины (SSOT) — SQLAlchemy-модели в каталоге `services/shared/models/` и миграции `services/api_gateway/alembic/versions/`.
