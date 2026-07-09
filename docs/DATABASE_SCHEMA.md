# Спецификация БД (PostgreSQL - Staging Area)

## Расширения PostgreSQL

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- генерация UUID
CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- нечёткий поиск (fuzzy search)
```

---

## Таблица `users` (Профили сотрудников)

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `object_guid` | UUID | PK | Неизменяемый ID из AD (`objectGUID`) |
| `sam_account_name` | VARCHAR(64) | UNIQUE, NOT NULL | Логин из AD (`sAMAccountName`). Может меняться при смене статуса. |
| `status` | VARCHAR(16) | NOT NULL, DEFAULT 'ACTIVE' | Статус: `ACTIVE`, `RESIGNED`, `ON_LEAVE` |
| `tg_id` | BIGINT | UNIQUE, NULLABLE | ID пользователя в Telegram |
| `full_name` | VARCHAR(256) | NOT NULL | ФИО (`displayName` из AD) |
| `internal_phone` | VARCHAR(20) | NULLABLE | AD `telephoneNumber`: корпоративный (внутренний) номер, формат XX-XX |
| `mobile_phone` | VARCHAR(20) | NULLABLE | AD `mobile`: мобильный телефон, формат E.164 (`+7XXXXXXXXXX`) |
| `department` | VARCHAR(256) | NULLABLE | Отдел (`department` из AD) |
| `office_location` | VARCHAR(256) | NULLABLE | Кабинет/офис (`physicalDeliveryOfficeName` из AD) |
| `organization` | VARCHAR(256) | NULLABLE | Организация (вычисляется из `memberOf` по списку в `docs/CN.md`) |
| `ad_dn` | VARCHAR(512) | NULLABLE | Distinguished Name пользователя в AD (`distinguishedName`) |
| `job_title` | VARCHAR(256) | NULLABLE | Должность (`title` из AD) |
| `email` | VARCHAR(256) | NULLABLE | Электронная почта (`mail` из AD) |
| `role` | VARCHAR(32) | NOT NULL, DEFAULT 'employee' | Роль в системе: `employee`, `it_operator` |
| `is_verified` | BOOLEAN | NOT NULL, DEFAULT FALSE | Пройдена ли проверка Gatekeeper |
| `is_protected` | BOOLEAN | NOT NULL, DEFAULT FALSE | VIP-защита профиля |
| `is_hidden` | BOOLEAN | NOT NULL, DEFAULT FALSE | Скрыт ли пользователь из общего справочника (для сервисных УЗ) |
| `grace_period_left` | SMALLINT | NOT NULL, DEFAULT 3 | Оставшихся попыток «Пропустить» |
| `last_sync_timestamp` | TIMESTAMPTZ | NULLABLE | Время последней синхронизации из AD |
| `sync_error_log` | TEXT | NULLABLE | Лог последней ошибки или предупреждение (например, о нескольких группах организации) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Обновляется триггером |

**CHECK-ограничение:**
```sql
CONSTRAINT users_role_check CHECK (role IN ('employee', 'it_operator'))
CONSTRAINT users_status_check CHECK (status IN ('ACTIVE', 'RESIGNED', 'ON_LEAVE'))
CONSTRAINT users_grace_check CHECK (grace_period_left >= 0 AND grace_period_left <= 3)
```

### Индексы таблицы `users`

```sql
-- Нечёткий поиск по full_name, department, office_location
CREATE INDEX idx_users_fullname_trgm    ON users USING GIN (full_name gin_trgm_ops);
CREATE INDEX idx_users_department_trgm  ON users USING GIN (department gin_trgm_ops);
CREATE INDEX idx_users_office_trgm      ON users USING GIN (office_location gin_trgm_ops);
CREATE INDEX idx_users_internal_phone_trgm ON users USING GIN (regexp_replace(internal_phone, '[^0-9]', '', 'g') gin_trgm_ops);
CREATE INDEX idx_users_mobile_phone_trgm   ON users USING GIN (regexp_replace(mobile_phone, '[^0-9]', '', 'g') gin_trgm_ops);



-- Поиск по Telegram ID
CREATE INDEX idx_users_tg_id ON users (tg_id) WHERE tg_id IS NOT NULL;

-- Быстрая фильтрация неверифицированных пользователей
CREATE INDEX idx_users_is_verified ON users (is_verified) WHERE is_verified = FALSE;
```

---

## Таблица `change_requests` (Очередь изменений)

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | |
| `user_guid` | UUID | FK → users.object_guid ON DELETE CASCADE, NOT NULL | Чей профиль меняется |
| `attribute_name` | VARCHAR(64) | NOT NULL | Имя поля: `mobile_phone`, `extension_number`, `office_location` |
| `new_value` | TEXT | NOT NULL | Новое значение |
| `source` | VARCHAR(10) | NOT NULL | Источник: `web`, `bot` |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'pending' | `pending`, `conflict`, `approved`, `applied`, `rejected` |
| `rejection_reason` | TEXT | NULLABLE | Причина отклонения (заполняется IT-Operator) |
| `resolved_by` | UUID | FK → users.object_guid ON DELETE SET NULL, NULLABLE | Кто одобрил/отклонил |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `resolved_at` | TIMESTAMPTZ | NULLABLE | Когда обработана |

**CHECK-ограничение:**
```sql
CONSTRAINT cr_source_check CHECK (source IN ('web', 'bot'))
CONSTRAINT cr_status_check CHECK (status IN ('pending', 'conflict', 'approved', 'applied', 'rejected'))
CONSTRAINT cr_attribute_check CHECK (attribute_name IN ('internal_phone', 'mobile_phone', 'office_location', 'department', 'full_name'))
```

**Уникальный индекс**: Нельзя создать две активные заявки на одно поле одного пользователя:
```sql
CREATE UNIQUE INDEX idx_cr_unique_pending
  ON change_requests (user_guid, attribute_name)
  WHERE status IN ('pending', 'conflict');
```

### Индексы `change_requests`

```sql
CREATE INDEX idx_cr_user_guid ON change_requests (user_guid);
CREATE INDEX idx_cr_status  ON change_requests (status);
```

---

## Таблица `reports` (Жалобы на контакты)

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | |
| `target_user_guid` | UUID | FK → users.object_guid ON DELETE CASCADE, NOT NULL | На кого жалоба |
| `reporter_user_guid` | UUID | FK → users.object_guid ON DELETE SET NULL, NULLABLE | Кто пожаловался |
| `reason` | TEXT | NOT NULL | Причина жалобы (свободный текст, макс. 500 символов) |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'new' | `new`, `processed` |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `processed_at` | TIMESTAMPTZ | NULLABLE | |
| `processed_by` | UUID | FK → users.object_guid ON DELETE SET NULL, NULLABLE | IT-Operator, закрывший репорт |

**Уникальный индекс**: Один пользователь — один активный репорт на один профиль:
```sql
CREATE UNIQUE INDEX idx_reports_unique_new
  ON reports (target_user_guid, reporter_user_guid)
  WHERE status = 'new';
```

### Индексы `reports`

```sql
CREATE INDEX idx_reports_target   ON reports (target_user_guid);
CREATE INDEX idx_reports_status   ON reports (status);
```

---

## Таблица `refresh_tokens` (Сессии)

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `id` | UUID | PK | |
| `user_guid` | UUID | FK → users.object_guid ON DELETE CASCADE | |
| `token_hash` | VARCHAR(64) | UNIQUE, NOT NULL | SHA-256 от refresh token |
| `expires_at` | TIMESTAMPTZ | NOT NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `revoked` | BOOLEAN | NOT NULL, DEFAULT FALSE | |

---

---

## Таблица `system_settings` (Системные настройки)

| Поле | Тип | Ограничения | Описание |
|------|-----|-------------|----------|
| `key` | VARCHAR(64) | PK | Ключ настройки (например, `AD_USER`, `OU_MAPPING`, `FORCE_SYNC`) |
| `value` | TEXT | NOT NULL | Значение настройки |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Время последнего обновления |

---

## Политики ON DELETE (сводка)

| Таблица | FK | Политика |
|---------|-----|----------|
| `change_requests.user_guid` | → `users.object_guid` | CASCADE — заявки удаляются вместе с пользователем |
| `change_requests.resolved_by` | → `users.object_guid` | SET NULL — история сохраняется |
| `reports.target_user_guid` | → `users.object_guid` | CASCADE |
| `reports.reporter_user_guid` | → `users.object_guid` | SET NULL |
| `reports.processed_by` | → `users.object_guid` | SET NULL |
| `refresh_tokens.user_guid` | → `users.object_guid` | CASCADE |