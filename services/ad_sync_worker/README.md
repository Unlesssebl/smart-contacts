# 🔄 AD Sync Worker (Active Directory Synchronization Service)

Фоновый сервис двунаправленной синхронизации контактных данных сотрудников между локальной базой данных PostgreSQL и корпоративным каталогом **Active Directory (LDAP)**.

---

## 🛠️ Стек технологий

* **Язык и среда:** Python 3.12, `uv`
* **Интеграция с AD:** `ldap3` (LDAPS/TLS, NTLM/Simple BIND, paged search)
* **База данных:** PostgreSQL 15, SQLAlchemy 2.0, `psycopg2-binary`
* **Шина событий:** Redis 7 (публикация событий синхронизации в Pub/Sub канал `system_events`)
* **Конфигурация:** Pydantic Settings (`pydantic-settings`)

---

## 📂 Структура проекта

```text
services/ad_sync_worker/
├── app/
│   ├── core/
│   │   ├── config.py        # Конфигурация параметров AD, интервалов синхронизации (.env)
│   │   └── ldap.py          # Клиент LDAP3, TLS-соединение и базовые операции
│   ├── sync/
│   │   ├── pull.py          # Логика загрузки изменений из AD (Pull: AD -> DB)
│   │   ├── push.py          # Логика отправки одобренных изменений в AD (Push: DB -> AD)
│   │   └── mapper.py        # Нормализация телефонов, парсинг UAC, вычисление OU подразделений
│   └── main.py              # Основной цикл воркера и планировщик
├── tests/                   # Набор тестов логики синхронизации и маппинга
└── pyproject.toml           # Зависимости и конфигурация uv
```

---

## ⚙️ Ключевые возможности

1. **Инкрементальный Pull (AD → DB)**:
   * Синхронизация изменений по атрибуту `uSNChanged` с поддержкой постраничного чтения (`paged_search`).
   * Определение статуса сотрудника (`ACTIVE`, `RESIGNED`, `ON_LEAVE`) по суффиксам логина (`-uv`, `-time`) и битам `userAccountControl` (бит `0x0002` — отключен).
   * Автоматическое извлечение и сопоставление структуры подразделений и организаций из `distinguishedName` (DN).
2. **Push (DB → AD)**:
   * Обработка очереди одобренных IT-оператором заявок (`change_requests`) со статусом `approved`.
   * Запись обновленных значений (`telephoneNumber`, `mobile`, `physicalDeliveryOfficeName`) в Active Directory с переводом заявки в статус `applied`.
3. **Отказоустойчивость**:
   * При временной недоступности контроллеров домена воркер переходит в режим ожидания с повторными попытками (Exponential Backoff), не прерывая работу API Gateway.

---

## ⚡ Локальный запуск

### 1. Установка зависимостей
```bash
uv sync
```

### 2. Запуск воркера
```bash
uv run python main.py
```

---

## 🧪 Тестирование

```bash
# Запуск тестов модуля синхронизации:
uv run pytest tests/
```
