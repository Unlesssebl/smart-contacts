# 🏢 Smart Contacts (Корпоративный справочник сотрудников)

Современная корпоративная система поиска контактов сотрудников, управления заявками на изменение данных и двунаправленной синхронизации с **Active Directory**.

---

## 🚀 Архитектура проекта

Проект построен по модульной микросервисной архитектуре и полностью упакован в Docker:

```text
smart-contacts/
├── docs/                   # 📚 Центральная база знаний и архитектурные решения (ADR)
├── services/
│   ├── api_gateway/        # 🚪 REST & WebSocket API на FastAPI (Python 3.12, uv, Alembic)
│   ├── ad_sync_worker/     # 🔄 Фоновый сервис синхронизации с Active Directory (LDAP3)
│   ├── web_frontend/       # 🎨 Пользовательский интерфейс (React 19, TypeScript, Vite, Tailwind CSS)
│   └── shared/             # 📦 Общие SQLAlchemy-модели, перечисления и утилиты
├── certs/                  # 🔒 SSL/TLS сертификаты для HTTPS
├── docker-compose.yml      # Базовая Production-конфигурация (автономные образы)
└── docker-compose.override.yml # Слой для локальной разработки (Hot-reload, Live code mount)
```

> 📊 **Сервис мониторинга (Prometheus & Grafana)** вынесен в отдельный независимый репозиторий / проект (по умолчанию расположен в соседнем каталоге [`../monitoring/`](file:///c:/Users/belikov.a/Desktop/Акты,%20документы/Work/!Projects/monitoring/README.md)).

---

## 🛠️ Стек технологий

* **Backend**: FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, `uv`.
* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Framer Motion.
* **Хранилища**: PostgreSQL 15, Redis 7 (кэш сессий, защита от Brute-Force и Rate Limiting).
* **Интеграция**: Active Directory (LDAP/LDAPS, Kerberos SPNEGO).
* **Метрики и Observability**: `prometheus-fastapi-instrumentator` (OpenMetrics эндпоинт `/metrics`).
* **Шлюз / Прокси**: Nginx (HTTP/2, SSL termination, HSTS, Security Headers).

---

## 📚 Документация и сервисы

### 🏛️ Сквозная системная документация ([docs/](file:///c:/Users/belikov.a/Desktop/Акты,%20документы/Work/!Projects/smart-contacts/docs/README.md))
* 🏛️ **[Системная архитектура](file:///c:/Users/belikov.a/Desktop/Акты,%20документы/Work/!Projects/smart-contacts/docs/ARCHITECTURE.md)** — сервисы, WebSockets Presence, SSO/LDAP аутентификация и безопасность.
* 🔄 **[Интеграция с Active Directory](file:///c:/Users/belikov.a/Desktop/Акты,%20документы/Work/!Projects/smart-contacts/docs/AD_INTEGRATION.md)** — маппинг атрибутов, алгоритмы синхронизации (Pull/Push) и логика статусов.
* ⚙️ **[Бизнес-логика](file:///c:/Users/belikov.a/Desktop/Акты,%20документы/Work/!Projects/smart-contacts/docs/BUSINESS_LOGIC.md)** — механизм Gatekeeper, ролевая модель, модерация заявок.
* 🤖 **[Спецификация Telegram-бота](file:///c:/Users/belikov.a/Desktop/Акты,%20документы/Work/!Projects/smart-contacts/docs/BOT_SPEC.md)** — контракт для внешнего AI-ассистента.
* 📝 **[Архитектурные решения (ADR)](file:///c:/Users/belikov.a/Desktop/Акты,%20документы/Work/!Projects/smart-contacts/docs/adr/0001-async-migration.md)** — дорожная карта перехода на асинхронный стек.

### 📦 Модульные руководства сервисов
* 🚪 **[API Gateway](file:///c:/Users/belikov.a/Desktop/Акты,%20документы/Work/!Projects/smart-contacts/services/api_gateway/README.md)** — запуск FastAPI, структура `app/`, миграции Alembic и тесты.
* 🔄 **[AD Sync Worker](file:///c:/Users/belikov.a/Desktop/Акты,%20документы/Work/!Projects/smart-contacts/services/ad_sync_worker/README.md)** — логика синхронизации, pull/push циклы, параметры LDAP.
* 🎨 **[Web Frontend](file:///c:/Users/belikov.a/Desktop/Акты,%20документы/Work/!Projects/smart-contacts/services/web_frontend/README.md)** — архитектура UI на React 19, Zustand, анимации и Mock-сервер.
* 📦 **[Shared Package](file:///c:/Users/belikov.a/Desktop/Акты,%20документы/Work/!Projects/smart-contacts/services/shared/README.md)** — SQLAlchemy 2.0 декларативные модели, парсинг GUID и телефонов.
* 📊 **[Центральный мониторинг](file:///c:/Users/belikov.a/Desktop/Акты,%20документы/Work/!Projects/monitoring/README.md)** — документация по запуску центрального Prometheus & Grafana (отдельный сервис/репозиторий).

---

## ⚡ Быстрый старт

### 1. Подготовка окружения

Скопируйте шаблон переменных окружения:
```bash
cp .env.example .env
```

Для локальной разработки без Active Directory можно использовать тестовые учетные записи или указать параметры в `.env`:
* Для включения Dev-авторизации раскомментируйте `DEV_USER` и `DEV_PASSWORD`.
* Для локальной работы по HTTP/самоподписанному HTTPS выставьте `COOKIE_SECURE=False`.

---

### 2. Запуск в режиме разработки (Development)

Благодаря файлу `docker-compose.override.yml`, локальная разработка запускается стандартной командой:

```bash
docker compose up -d --build
```

* 🔄 **Hot-Reloading**: Uvicorn запущен с флагом `--reload` — любые изменения в `.py` файлах применяются мгновенно.
* 📦 **Live Mounting**: Исходный код смонтирован с хоста прямо в контейнеры.
* 🔒 **Авто-генерация SSL**: Nginx автоматически создаст самоподписанные сертификаты при первом старте.

---

### 3. Запуск в режиме эксплуатации (Production)

На боевом сервере запускается чистый базовый конфиг:

```bash
docker compose -f docker-compose.yml up -d --build
```

* 🛡️ **Иммутабельность**: Код запечен внутри Docker-образов, монтирование хоста отключено.
* 🚀 **Производительность**: Отключен отладочный reloader, включен строгий HSTS и HTTPS.

---

## 🌐 Сетевые порты и доступ к сервисам

| Сервис | URL / Порт | Описание |
| :--- | :--- | :--- |
| **Веб-интерфейс** | [https://localhost](https://localhost) | Главная страница справочника (HTTPS) |
| **Веб-интерфейс (HTTP)** | [http://localhost](http://localhost) | Редирект на HTTPS |
| **API Gateway** | [http://127.0.0.1:8001](http://127.0.0.1:8001) | Прямой порт API (для отладки) |
| **API Swagger** | [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs) | Интерактивная документация REST API |
| **API Metrics** | [http://127.0.0.1:8001/metrics](http://127.0.0.1:8001/metrics) | Эндпоинт метрик для центрального Prometheus |
| **PostgreSQL** | `127.0.0.1:5432` | База данных |
| **Redis** | `127.0.0.1:6379` | Кэш и сессии |
| **Центральная Grafana** | [http://localhost:3000](http://localhost:3000) | Запускается из проекта `../monitoring` |
| **Центральный Prometheus** | [http://localhost:9090](http://localhost:9090) | Запускается из проекта `../monitoring` |

---

## 📋 Управление и полезные команды

### Просмотр логов
```bash
# Логи всех сервисов
docker compose logs -f

# Логи конкретного сервиса
docker compose logs -f api_gateway
docker compose logs -f ad_sync_worker
docker compose logs -f web_frontend
```

### Остановка контейнеров
```bash
docker compose down
```

---

## 🗄️ Миграции базы данных (Alembic)

Миграции применяются автоматически при каждом старте API Gateway. При необходимости ручного управления:

```bash
# Применить все миграции:
uv run --directory services/api_gateway alembic upgrade head

# Создать новую авто-миграцию после изменения моделей:
uv run --directory services/api_gateway alembic revision --autogenerate -m "описание_изменений"
```

---

## 🧪 Тестирование

Запуск полного набора автоматизированных тестов:

```bash
# Тесты API Gateway:
uv run --directory services/api_gateway pytest

# Тесты логики синхронизации AD:
uv run --directory services/api_gateway pytest ../ad_sync_worker/tests
```
