# 📦 Shared Package (Общие модели и утилиты)

Общий Python-пакет, переиспользуемый сервисами `api_gateway` и `ad_sync_worker` для устранения дублирования кода и обеспечения единого источника истины (SSOT) схемы базы данных.

---

## 🛠️ Стек технологий

* **ORM:** SQLAlchemy 2.0 (Declarative Base)
* **UUID & GUID:** `uuid`, кастомные утилиты конвертации бинарных данных Active Directory
* **Регулярные выражения:** Валидация и нормализация номеров телефонов (E.164, внутренние номера) и иерархии подразделений (OU).

---

## 📂 Структура пакета

```text
services/shared/
├── database.py              # Инициализация SQLAlchemy DeclarativeBase
├── models/                  # Декларативные модели таблиц PostgreSQL
│   ├── user.py              # Таблица `users` (профили сотрудников, GUID, статусы, флаги)
│   ├── change_request.py    # Таблица `change_requests` (очередь заявок на модерацию/Push в AD)
│   ├── report.py            # Таблица `reports` (жалобы на неактуальные контакты)
│   ├── support_ticket.py    # Таблица `support_tickets` (обращения в техподдержку)
│   ├── token.py             # Таблица `refresh_tokens` (сессии и хэши токенов)
│   ├── system_setting.py    # Таблица `system_settings` (маппинг OU, глобальные параметры)
│   └── enums.py             # Перечисления статусов (UserRole, UserStatus, ChangeRequestStatus)
└── utils.py                 # Общие вспомогательные функции:
                             # - ad_guid_to_uuid: конвертация бинарного objectGUID в UUID v4
                             # - parse_ou_structure: парсинг distinguishedName в организацию и отделы
                             # - format_internal_phone / normalize_phone: валидация телефонных номеров
```

---

## ⚙️ Использование в сервисах

В `services/api_gateway` и `services/ad_sync_worker` пакет подключается как локальный модуль или смонтированный том:

```python
from shared.models import User, ChangeRequest, UserStatus
from shared.utils import ad_guid_to_uuid, parse_ou_structure
```
