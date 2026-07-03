-- --- Smart Contacts Database Initialization ---

-- 1. Расширения PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- генерация UUID
CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- нечёткий поиск (fuzzy search)

-- 2. Таблица users (Профили сотрудников)
CREATE TABLE users (
    object_guid UUID PRIMARY KEY,
    sam_account_name VARCHAR(64) UNIQUE NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    tg_id BIGINT UNIQUE,
    full_name VARCHAR(256) NOT NULL,
    internal_phone VARCHAR(100),
    mobile_phone VARCHAR(100),
    department VARCHAR(256),
    office_location VARCHAR(256),
    organization VARCHAR(256),
    job_title VARCHAR(256),
    email VARCHAR(256),
    role VARCHAR(32) NOT NULL DEFAULT 'employee',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_protected BOOLEAN NOT NULL DEFAULT FALSE,
    grace_period_left SMALLINT NOT NULL DEFAULT 3,
    last_sync_timestamp TIMESTAMPTZ,
    sync_error_log TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Ограничения
    CONSTRAINT users_role_check CHECK (role IN ('employee', 'it_operator')),
    CONSTRAINT users_status_check CHECK (status IN ('ACTIVE', 'RESIGNED', 'ON_LEAVE')),
    CONSTRAINT users_grace_check CHECK (grace_period_left >= 0 AND grace_period_left <= 3)
);

-- 3. Таблица change_requests (Очередь изменений)
CREATE TABLE change_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_guid UUID NOT NULL REFERENCES users(object_guid) ON DELETE CASCADE ON UPDATE CASCADE,
    attribute_name VARCHAR(64) NOT NULL,
    new_value TEXT NOT NULL,
    source VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    resolved_by UUID REFERENCES users(object_guid) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    
    -- Ограничения
    CONSTRAINT cr_source_check CHECK (source IN ('web', 'bot')),
    CONSTRAINT cr_status_check CHECK (status IN ('pending', 'conflict', 'approved', 'applied', 'rejected')),
    CONSTRAINT cr_attribute_check CHECK (attribute_name IN ('internal_phone', 'mobile_phone', 'office_location', 'department', 'full_name'))
);

-- 4. Таблица reports (Жалобы на контакты)
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_user_guid UUID NOT NULL REFERENCES users(object_guid) ON DELETE CASCADE ON UPDATE CASCADE,
    reporter_user_guid UUID REFERENCES users(object_guid) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES users(object_guid) ON DELETE SET NULL,
    
    -- Ограничение статуса
    CONSTRAINT reports_status_check CHECK (status IN ('pending', 'processed'))
);

-- 5. Таблица refresh_tokens (Сессии)
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY,
    user_guid UUID NOT NULL REFERENCES users(object_guid) ON DELETE CASCADE ON UPDATE CASCADE,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked BOOLEAN NOT NULL DEFAULT FALSE
);

-- 6. Индексы
-- Нечёткий поиск по full_name, department, office_location
CREATE INDEX idx_users_fullname_trgm    ON users USING GIN (full_name gin_trgm_ops);
CREATE INDEX idx_users_department_trgm  ON users USING GIN (department gin_trgm_ops);
CREATE INDEX idx_users_office_trgm      ON users USING GIN (office_location gin_trgm_ops);

-- Поиск по Telegram ID
CREATE INDEX idx_users_tg_id ON users (tg_id) WHERE tg_id IS NOT NULL;

-- Быстрая фильтрация неверифицированных пользователей
CREATE INDEX idx_users_is_verified ON users (is_verified) WHERE is_verified = FALSE;

-- Уникальный индекс для change_requests: одна активная заявка на поле
CREATE UNIQUE INDEX idx_cr_unique_pending
  ON change_requests (user_guid, attribute_name)
  WHERE status IN ('pending', 'conflict');

CREATE INDEX idx_cr_user_guid ON change_requests (user_guid);
CREATE INDEX idx_cr_status  ON change_requests (status);

-- Уникальный индекс для reports: один пользователь — одна активная жалоба на профиль
CREATE UNIQUE INDEX idx_reports_unique_new
  ON reports (target_user_guid, reporter_user_guid)
  WHERE status = 'pending';

CREATE INDEX idx_reports_target   ON reports (target_user_guid);
CREATE INDEX idx_reports_status   ON reports (status);

-- 7. Таблица system_settings (Системные настройки)
CREATE TABLE system_settings (
    key VARCHAR(64) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
