# Спецификация REST API (api_gateway)

**Base URL**: `http://localhost:8000/api/v1`
**Формат**: JSON. Все запросы с телом требуют `Content-Type: application/json`.
**Аутентификация**: Bearer JWT в заголовке `Authorization: Bearer <token>` (кроме `/auth/login`).

---

## Общие коды ошибок

| Код | Значение |
|-----|----------|
| 400 | Bad Request — невалидный формат тела |
| 401 | Unauthorized — токен отсутствует или истёк |
| 403 | Forbidden — недостаточно прав |
| 404 | Not Found |
| 409 | Conflict — запись уже существует или статус `conflict` |
| 422 | Unprocessable Entity — ошибка валидации Pydantic |
| 503 | Service Unavailable — AD Sync Worker недоступен |

Формат тела ошибки:
```json
{ "detail": "Human-readable error message" }
```

---

## Валидация и пагинация

### Строгая валидация полей (Pydantic)
Для обеспечения целостности данных в AD и PostgreSQL, API применяет строгие Regex-паттерны:

*   **internal_phone**: `^\d{2}-\d{2}$` (ровно 4 цифры, разделенные дефисом, например `49-87`).
*   **mobile_phone**: `^\+7\d{10}$` (международный формат E.164, например `+79161234567`).

При несоответствии паттерну API возвращает **422 Unprocessable Entity**.

### Структура пагинированных ответов
Все методы, возвращающие списки объектов (`/users`, `/change-requests`, `/reports`), обязаны возвращать JSON-объект следующей структуры:

```json
{
  "total": 150,
  "page": 1,
  "limit": 20,
  "items": [ ... ]
}
```

*   `total`: общее количество записей в БД, подходящих под фильтры.
*   `page`: текущий номер страницы (начиная с 1).
*   `limit`: количество элементов на страницу.
*   `items`: массив объектов данных.

---

## 1. Аутентификация (`/auth`)

### `POST /auth/login`
Аутентификация через корпоративные AD-креденшлы (LDAP BIND).

**Тело запроса:**
```json
{ "username": "ivanov_ii", "password": "secret" }
```

**Ответ 200:**
В ответе устанавливаются Cookies: `access_token` (HttpOnly), `refresh_token` (HttpOnly), `csrf_token`.
Тело ответа:
```json
{
  "user": {
    "id": "uuid",
    "sam_account_name": "ivanov_ii",
    "full_name": "Иванов Иван Иванович",
    "role": "employee",
    "is_verified": false,
    "grace_period_left": 3,
    "avatar_color": "#2563eb"
  }
}
```

> `is_verified` и `grace_period_left` включены в ответ намеренно: фронтенд кеширует их в `authStore` и определяет состояние Gatekeeper без дополнительных запросов.
```

**Ответ 401**: `{ "detail": "Invalid credentials" }`

---

### `GET /auth/sso`
Тихая аутентификация через Kerberos/SPNEGO. Используется фронтендом для автоматического входа.
Если Kerberos-билет отсутствует или невалиден, API возвращает 401 Unauthorized **БЕЗ** заголовка `WWW-Authenticate: Negotiate`, чтобы избежать появления системного окна ввода пароля у пользователей вне домена.

**Ответ 200:** Устанавливает Cookies. Тело ответа аналогично `/auth/login`.
**Ответ 401**: `{ "detail": "Kerberos authentication failed or not available" }`

---

### `POST /auth/refresh`
Обновление access token. Токен читается из куки `refresh_token`.

**Ответ 200:** `{"detail": "Tokens refreshed"}` + новые Cookies `access_token` и `refresh_token`.
**Ответ 401**: `{ "detail": "No refresh token provided" }` или `{ "detail": "Invalid or expired refresh token" }`

---

### `POST /auth/logout`
Удаление сессии (очистка кук).

**Ответ 200:** `{"detail": "Logged out"}` + заголовки на удаление кук.

---

### `GET /auth/me`
Получить профиль текущего пользователя. Требует Bearer.

**Ответ 200:**
```json
{
  "id": "uuid",
  "sam_account_name": "ivanov_ii",
  "full_name": "Иванов Иван Иванович",
  "internal_phone": "49-87",
  "mobile_phone": "+79161234567",
  "department": "ИТ-отдел",
  "office_location": "Офис А, каб. 301",
  "role": "employee",
  "is_verified": true,
  "is_protected": false,
  "is_hidden": false,
  "grace_period_left": 3,
  "last_sync_timestamp": "2026-04-27T10:00:00Z",
  "avatar_color": "#2563eb"
}
```

---

## 2. Gatekeeper

> Gatekeeper **не имеет собственного namespace**. Состояние (`is_verified`, `grace_period_left`) передаётся в ответе `POST /auth/login` и `GET /auth/me`. Фронтенд читает эти поля из `authStore` — без дополнительных HTTP-запросов.

**Логика определения состояния (на клиенте):**
- `is_verified = true` → рендер страницы без модального окна
- `!is_verified && grace_period_left > 0` → мягкий блок (`<GatekeeperModal>`)
- `!is_verified && grace_period_left == 0` → жёсткий блок (`<GatekeeperModal hardBlock>`)

---

## 3. Справочник сотрудников (`/users`)

### `GET /users`
Поиск по справочнику. Доступен всем авторизованным пользователям.

**Query-параметры:**
| Параметр | Тип | По умолчанию | Описание |
|----------|-----|-------------|----------|
| `q` | string | — | Поиск по ФИО (`full_name`) и телефонам (`internal_phone`, `mobile_phone`). Результаты ранжируются по релевантности совпадения с ФИО с использованием `pg_trgm` |
| `department` | string | — | Фильтр по точному названию отдела |
| `organization` | string | — | Фильтр по точному названию организации |
| `job_title` | string | — | Фильтр по точной должности |
| `has_phone` | boolean | — | Фильтр сотрудников с заполненным телефоном (внутренним или мобильным) |
| `has_email` | boolean | — | Фильтр сотрудников с заполненным email |
| `hidden_only` | boolean | — | Фильтр по скрытым профилям (только для `admin` / `it_operator`) |
| `page` | int | 1 | Номер страницы |
| `limit` | int | 20 | Размер страницы (макс. 100) |

**Ответ 200:** (см. раздел "Валидация и пагинация" для структуры объекта)
```json
{
  "total": 150,
  "page": 1,
  "limit": 20,
  "items": [
    {
      "id": "uuid",
      "full_name": "Иванов Иван Иванович",
      "internal_phone": "49-87",
      "mobile_phone": "+79161234567",
      "department": "ИТ-отдел",
      "office_location": "Офис А, каб. 301",
      "is_hidden": false,
      "ad_dn": "CN=Иванов Иван Иванович,OU=ИТ-отдел,DC=domain,DC=local"
    }
  ]
}
```

> **Примечание**: Поле `ad_dn` (Distinguished Name в Active Directory) возвращается только пользователям с административными ролями (`admin` / `it_operator`). Для обычных сотрудников возвращается `null`.

---

### `GET /users/{user_id}`
Получить полный профиль сотрудника.

**Ответ 200:** Схема идентична `GET /auth/me` (без полей `role`, `grace_period_left`), плюс возвращается поле `ad_dn` (строка, только для администраторов).

**Примечание**: 
1. Для профилей с `is_protected = true` поле `internal_phone` скрыто для обычных пользователей (возвращается `null`). IT-Operator видит полностью.
2. Поле `ad_dn` возвращается как `null` для пользователей без прав администратора.

---

### `GET /users/departments`
Получить отсортированный по алфавиту список всех уникальных отделов (исключая пустые значения). Доступен всем авторизованным пользователям.

**Ответ 200:**
```json
[
  "Бухгалтерия",
  "ИТ-отдел",
  "Отдел кадров"
]
```

---

### `GET /users/organizations`
Получить отсортированный по алфавиту список всех уникальных организаций (исключая пустые значения). Доступен всем авторизованным пользователям.

**Ответ 200:**
```json
[
  "Головной офис",
  "ООО Технологии"
]
```

---

### `GET /users/job-titles`
Получить отсортированный по алфавиту список всех уникальных должностей (исключая пустые значения). Доступен всем авторизованным пользователям.

**Ответ 200:**
```json
[
  "Бухгалтер",
  "Инженер-разработчик",
  "Специалист по кадрам"
]
```

---

## 4. Профиль текущего пользователя (`/profile`)

### `GET /profile/me`
Алиас для `GET /auth/me`. Возвращает полный профиль + историю своих `change_requests`.

**Ответ 200:**
```json
{
  "profile": { /* схема как в /auth/me */ },
  "pending_changes": [
    {
      "id": "uuid",
      "attribute_name": "internal_phone",
      "new_value": "49-99",
      "status": "pending",
      "created_at": "2026-04-27T09:00:00Z"
    }
  ]
}
```

---

### `POST /profile/me/acknowledge`
Обработать действие пользователя в Gatekeeper-модальном окне.

**Тело запроса:**
```json
{ "action": "confirm" }
```
| `action` | Поведение |
|---|---|
| `confirm` | `is_verified = true`. Доступно всегда (при `!is_verified`). |
| `skip` | `grace_period_left -= 1`. Доступно только если `grace_period_left > 0`. |

> **Race Condition Warning:** Эндпоинт обязан использовать транзакцию с `SELECT ... FOR UPDATE` для строки пользователя, чтобы гарантировать атомарность вычитания `grace_period_left`. При обнаружении конфликта (нарушение констрейнта БД) возвращать **409 Conflict**.

**Ответ 200:**
```json
{ "is_verified": true, "grace_period_left": 3 }
```

**Ответ 409**: `{ "detail": "No skips remaining" }` — при `action: skip` и `grace_period_left == 0`.

**Ответ 409**: `{ "detail": "Already verified" }` — при попытке подтвердить уже верифицированный профиль.

---

### `POST /profile/me/change-request`
Создать заявку на изменение своих данных.

> **Примечание:** Если запрос отправляется пользователем с `!is_verified`, API автоматически выполняет `is_verified = true` (эквивалент `action: confirm`), закрывая возможный deadlock.

**Тело запроса:**
```json
{
  "attribute_name": "mobile_phone",
  "new_value": "+79161234567"
}
```

**Валидация**:
- `attribute_name` — строго из списка: `internal_phone`, `mobile_phone`, `office_location`. При попытке передать любое другое поле (например, `full_name` или `department`) API **обязан** вернуть **422 Unprocessable Entity**.
- `internal_phone` — паттерн `^\d{2}-\d{2}$`.
- `mobile_phone` — паттерн `^\+7\d{10}$`.
- Нельзя создать новую заявку на то же поле, пока предыдущая имеет статус `pending`.

**Ответ 201:**
```json
{
  "id": "uuid",
  "attribute_name": "mobile_phone",
  "new_value": "+79161234567",
  "status": "pending",
  "created_at": "2026-04-27T10:00:00Z"
}
```

**Ответ 409**: Уже есть активная заявка на это поле.

---

## 5. Заявки на изменения (`/change-requests`)

> **Доступ**: IT-Operator.

### `GET /change-requests`

**Query-параметры:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| `status` | enum | `pending`, `conflict`, `approved`, `applied` |
| `department` | string | Фильтр по отделу |
| `user_id` | uuid | Фильтр по пользователю |
| `page` | int | |
| `limit` | int | |

**Ответ 200:** Пагинированный список `change_requests` (структура по стандарту в разделе "Валидация и пагинация"). Каждый элемент `items` содержит вложенный объект `user` (id, full_name, department).

---

### `PATCH /change-requests/{id}/approve`
Одобрить заявку. Статус меняется: `pending/conflict` → `approved`.

**Доступ**: IT-Operator.

**Ответ 200:** Обновлённый объект `change_request`.

---

### `PATCH /change-requests/{id}/reject`
Отклонить заявку. Запись удаляется из очереди (или переводится в архивный статус `rejected`).

**Тело запроса (опционально):**
```json
{ "reason": "Некорректный номер" }
```

**Доступ**: IT-Operator.

**Ответ 200:** `{ "status": "rejected" }`

> **Бизнес-правило:** Если после отклонения у пользователя не осталось других заявок в статусе `pending` или `conflict`, API сбрасывает `is_verified = false` и `grace_period_left = 0`.

---

## 6. Репорты (`/reports`)

### `POST /reports`
Пожаловаться на контакт сотрудника.

**Тело запроса:**
```json
{
  "target_user_id": "uuid",
  "reason": "Номер телефона не актуален"
}
```

**Правила**:
- Нельзя репортить самого себя (проверяется только для авторизованных Web-пользователей).
- Один пользователь не может дважды репортить одного и того же человека (пока первый репорт в статусе `new`). **Исключение**: запросы от Telegram-бота фиксируются как анонимные (`reporter_user_id = null`), проверки на дубликаты для них смягчены.
- Репорт на `is_protected = true` — тихо создаёт тикет для IT, не меняет видимый статус профиля.
- Несколько репортов на одного пользователя переводят связанный `change_request` в статус `conflict`.

**Ответ 201:** `{ "id": "uuid", "status": "new" }`

---

### `GET /reports`
**Доступ**: Только IT-Operator.

**Query-параметры:** `status` (`new`, `processed`), `page`, `limit`.

**Ответ 200:** Пагинированный список репортов (структура по стандарту в разделе "Валидация и пагинация"). Каждый элемент `items` содержит вложенные объекты `target_user` и `reporter_user`.

---

### `PATCH /reports/{id}/process`
Пометить репорт как обработанный. **Доступ**: IT-Operator.

**Ответ 200:** `{ "status": "processed" }`

---

## 7. Административные функции (`/admin`)

### `GET /admin/dashboard`
**Доступ**: IT-Operator.

**Ответ 200:**
```json
{
  "total_users": 500,
  "unverified_users": 42,
  "hard_blocked_users": 5,
  "pending_changes": 18,
  "conflict_changes": 3,
  "new_reports": 7,
  "last_sync_at": "2026-04-27T10:00:00Z",
  "sync_worker_status": "healthy"
}
```

---

### `POST /admin/sync/force`
Принудительный запуск синхронизации AD. **Доступ**: IT-Operator.

**Ответ 200:** `{ "status": "ok", "message": "Sync requested" }`

---

### `PATCH /admin/users/{user_id}/visibility`
Скрыть или показать профиль пользователя в общем справочнике. **Доступ**: IT-Operator.

**Тело запроса:**
```json
{
  "is_hidden": true
}
```

**Ответ 200:**
```json
{
  "status": "ok",
  "is_hidden": true
}
```

---

### `GET /admin/settings/ou-mapping`
Получить текущий маппинг OU -> Название организации. **Доступ**: IT-Operator.

**Ответ 200:**
```json
{
  "mapping": {
    "IT": {
      "org": "ООО Технологии"
    },
    "HQ": {
      "org": "Головной офис"
    }
  }
}
```

---

### `POST /admin/settings/ou-mapping`
Обновить маппинг OU -> Название организации. После обновления маппинга запускается фоновая задача (background task), которая обновляет поле `organization` у всех существующих пользователей. **Доступ**: IT-Operator.

**Тело запроса:**
```json
{
  "mapping": {
    "IT": {
      "org": "ООО Технологии"
    },
    "HQ": {
      "org": "Головной офис"
    }
  }
}
```

**Ответ 200:** Обновленный маппинг.

---

### `GET /admin/ldap/ous`
Получить иерархическое дерево всех организационных подразделений (OU) из Active Directory для настройки маппинга на клиенте. **Доступ**: IT-Operator.

**Ответ 200:**
```json
{
  "company.local": {
    "HQ": {
      "IT": {},
      "HR": {}
    },
    "Branch": {}
  }
}
```

---

## Приложение: Разрешённые атрибуты для `change-requests`

| `attribute_name` | Кто может подать | Кто одобряет |
|---|---|---|
| `internal_phone` | Сам сотрудник | IT-Operator |
| `mobile_phone` | Сам сотрудник | IT-Operator |
| `office_location` | Сам сотрудник | IT-Operator |
| `department` | IT-Operator (через `change-request`) | Автоматически `applied` |
| `full_name` | IT-Operator (через `change-request`) | Автоматически `applied` |
383: 
384: ---
385: 
386: ## 8. WebSockets и статусы присутствия (`/ws`)
387: 
388: ### `GET /auth/ws-token`
389: Получить одноразовый короткоживущий токен для WebSocket-соединения.
390: **Ответ 200:**
391: ```json
392: {
393:   "ws_token": "eyJhbGciOiJIUzI1NiIsInR5..."
394: }
395: ```
396: 
397: ---
398: 
399: ### WebSocket `/ws/presence`
400: Канал обмена статусами присутствия в реальном времени. Требует токен в параметре запроса: `?token=<ws_token>`.
401: 
402: **Входящие сообщения от клиента:**
403: - Установка статуса «отошел» или «в сети»:
404: ```json
405: {
406:   "action": "set_presence",
407:   "status": "away" // или "online"
408: }
409: ```
410: 
411: **Исходящие сообщения от сервера:**
412: - Первичное состояние всех активных пользователей при подключении:
413: ```json
414: {
415:   "type": "full_state",
416:   "data": {
417:     "f85c09e8-8249-40cc-9b9a-ece54ffdc93b": "online",
418:     "d41f021e-1289-4acc-8bf8-dcb41235123d": "away"

---

## 8. WebSockets и статусы присутствия (`/ws`)

### `GET /auth/ws-token`
Получить одноразовый короткоживущий токен для WebSocket-соединения.
**Ответ 200:**
```json
{
  "ws_token": "eyJhbGciOiJIUzI1NiIsInR5..."
}
```

---

### WebSocket `/ws/presence`
Канал обмена статусами присутствия в реальном времени. Требует токен в параметре запроса: `?token=<ws_token>`.

**Входящие сообщения от клиента:**
- Установка статуса «отошел» или «в сети»:
```json
{
  "action": "set_presence",
  "status": "away" // или "online"
}
```

**Исходящие сообщения от сервера:**
- Первичное состояние всех активных пользователей при подключении:
```json
{
  "type": "full_state",
  "data": {
    "f85c09e8-8249-40cc-9b9a-ece54ffdc93b": "online",
    "d41f021e-1289-4acc-8bf8-dcb41235123d": "away"
  }
}
```
- Уведомление об изменении статуса конкретного пользователя:
```json
{
  "type": "presence_update",
  "user_id": "f85c09e8-8249-40cc-9b9a-ece54ffdc93b",
  "status": "online" // "online" / "away" / "offline"
}
```

---

## Обращения пользователей (Support Tickets)

### `POST /support/tickets`
Отправить обращение в службу технической поддержки (доступно как авторизованным сотрудникам, так и гостям со страницы входа).

**Тело запроса:**
```json
{
  "category": "access", // "access" | "data_error" | "bug" | "suggestion" | "other"
  "message": "Не могу войти под своей учетной записью Windows",
  "sender_name": "Иванов Иван", // Обязательно для неавторизованных пользователей
  "sender_contact": "+79991234567" // Обязательно для неавторизованных пользователей
}
```

**Ответ 201:**
```json
{
  "status": "ok",
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "message": "Обращение успешно отправлено"
}
```

---

### `GET /admin/support-tickets`
Получить список обращений в поддержку. **Доступ**: IT-Operator.
- Параметр запроса: `status` (опционально: `open`, `closed`).

**Ответ 200:**
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "user_guid": "123e4567-e89b-12d3-a456-426614174001",
    "sender_name": "Иванов Иван",
    "sender_contact": "ivan@example.com",
    "display_sender_name": "Иванов Иван",
    "display_sender_contact": "ivan@example.com",
    "department": "IT Отдел",
    "job_title": "Системный администратор",
    "is_guest": false,
    "category": "access",
    "message": "Не могу войти под своей учетной записью",
    "status": "open",
    "closed_by": null,
    "closer_name": null,
    "closed_at": null,
    "created_at": "2026-08-21T11:30:00Z",
    "updated_at": "2026-08-21T11:30:00Z"
  }
]
```

---

### `PATCH /admin/support-tickets/{ticket_id}/close`
Закрыть обращение в 1 клик. **Доступ**: IT-Operator.

**Ответ 200:** Обновленный объект обращения со статусом `"closed"`.

---

### `PATCH /admin/support-tickets/{ticket_id}/reopen`
Повторно открыть обращение. **Доступ**: IT-Operator.

**Ответ 200:** Обновленный объект обращения со статусом `"open"`.
