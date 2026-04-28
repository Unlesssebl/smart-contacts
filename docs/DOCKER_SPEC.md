# Спецификация Docker-окружения (DOCKER_SPEC.md)

Данный документ описывает конфигурацию контейнеризации, стратегии сборки и правила взаимодействия сервисов системы «Smart Contacts».

## 1. Общая архитектура (Docker Compose)

Система разворачивается с использованием Docker Compose и состоит из следующих основных сервисов:
- `db`: СУБД PostgreSQL 15.
- `redis`: In-memory хранилище для кэширования и брокера (опционально).
- `api_gateway`: Backend API на базе FastAPI.
- `ad_sync_worker`: Фоновый воркер для синхронизации с Active Directory.
- `web_frontend`: SPA-приложение на React.

## 2. Спецификации сервисов

### 2.1 База данных (`db`)
- **Образ:** `postgres:15-alpine`
- **Healthcheck:**
  ```yaml
  test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
  interval: 10s
  timeout: 5s
  retries: 5
  ```

### 2.2 Redis (`redis`)
- **Образ:** `redis:7-alpine`
- **Healthcheck:**
  ```yaml
  test: ["CMD", "redis-cli", "ping"]
  interval: 10s
  timeout: 5s
  retries: 5
  ```

### 2.3 API Gateway (`api_gateway`)
- **Зависимости:** Дожидается готовности `db` и `redis` (`service_healthy`).
- **Healthcheck:** Проверка доступности эндпоинта `/health`.
  ```yaml
  test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  ```
- **Сборка:** Python 3.11+ (использование `uv` или `pip`).

### 2.4 AD Sync Worker (`ad_sync_worker`)
- **Зависимости:** Дожидается готовности `db` и `redis` (`service_healthy`).
- **Healthcheck:** Проверка активного соединения с базой данных.
  ```bash
  # Внутренняя логика воркера должна проверять соединение при старте
  test: ["CMD", "python", "-c", "import psycopg2, os; conn = psycopg2.connect(os.getenv('DATABASE_URL')); conn.cursor().execute('SELECT 1'); conn.close()"]
  interval: 30s
  timeout: 10s
  retries: 3
  ```

### 2.5 Web Frontend (`web_frontend`)
- **Стратегия сборки (Multi-stage build):**
  1. **Stage 1 (Compilation):** Использование образа `node:18`. Выполнение `npm install` и `npm run build`.
  2. **Stage 2 (Production):** Использование образа `nginx:alpine`. Копирование статических файлов из Stage 1 в `/usr/share/nginx/html`.
- **Конфигурация:** Кастомный `nginx.conf` для корректной работы React Router (fallback на `index.html`).

## 3. Управление зависимостями

Сервисы `api_gateway` и `ad_sync_worker` используют механизм `depends_on` с условием `service_healthy` для обеспечения правильного порядка запуска:

```yaml
depends_on:
  db:
    condition: service_healthy
  redis:
    condition: service_healthy
```

## 4. Переменные окружения (Environment Variables)

Обязательные переменные из `.env.example`, которые должны быть проброшены в контейнеры:

| Переменная | Описание | Контейнеры |
| :--- | :--- | :--- |
| `POSTGRES_USER` | Пользователь БД | `db`, `api_gateway`, `ad_sync_worker` |
| `POSTGRES_PASSWORD` | Пароль БД | `db`, `api_gateway`, `ad_sync_worker` |
| `POSTGRES_DB` | Имя БД | `db`, `api_gateway`, `ad_sync_worker` |
| `DB_HOST` | Хост БД (обычно `db`) | `api_gateway`, `ad_sync_worker` |
| `DB_PORT` | Порт БД (5432) | `api_gateway`, `ad_sync_worker` |
| `AD_SERVER` | URL сервера LDAP | `ad_sync_worker` |
| `AD_USER` | Пользователь для синхронизации | `ad_sync_worker` |
| `AD_PASSWORD` | Пароль AD | `ad_sync_worker` |
| `AD_BASE_DN` | Базовый DN для поиска | `ad_sync_worker` |
| `EXCHANGE_SERVER` | URL Exchange EWS | `ad_sync_worker` |
| `SECRET_KEY` | Ключ для подписи JWT | `api_gateway` |
| `ALGORITHM` | Алгоритм шифрования | `api_gateway` |
| `VITE_API_BASE_URL` | URL API для фронтенда | `web_frontend` |

## 5. Сетевое взаимодействие

Все сервисы объединяются в общую сеть (bridge), что позволяет им обращаться друг к другу по именам сервисов (`http://api_gateway:8000`, `redis:6379` и т.д.).
