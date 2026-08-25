"""Initial schema setup

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-08-25 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Use IF NOT EXISTS to be fully backward-compatible with existing init.sql tables
    op.execute("""
    CREATE TABLE IF NOT EXISTS users (
        object_guid UUID PRIMARY KEY,
        sam_account_name VARCHAR(255) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        job_title VARCHAR(255),
        job_title_raw VARCHAR(255),
        department VARCHAR(255),
        department_raw VARCHAR(255),
        office_location VARCHAR(255),
        organization VARCHAR(255),
        internal_phone VARCHAR(50),
        mobile_phone VARCHAR(50),
        email VARCHAR(255),
        ad_dn TEXT,
        status VARCHAR(50) DEFAULT 'active' NOT NULL,
        role VARCHAR(50) DEFAULT 'user' NOT NULL,
        is_protected BOOLEAN DEFAULT FALSE NOT NULL,
        sync_error_log TEXT,
        last_sync_timestamp TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS change_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_guid UUID NOT NULL REFERENCES users(object_guid) ON DELETE CASCADE,
        attribute_name VARCHAR(100) NOT NULL,
        old_value TEXT,
        new_value TEXT,
        status VARCHAR(50) DEFAULT 'pending' NOT NULL,
        rejection_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        resolved_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        target_user_guid UUID NOT NULL REFERENCES users(object_guid) ON DELETE CASCADE,
        reporter_user_guid UUID REFERENCES users(object_guid) ON DELETE SET NULL,
        attribute_name VARCHAR(100) NOT NULL,
        old_value TEXT,
        new_value TEXT,
        status VARCHAR(50) DEFAULT 'pending' NOT NULL,
        rejection_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        processed_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_guid UUID REFERENCES users(object_guid) ON DELETE SET NULL,
        sender_name VARCHAR(255),
        sender_contact VARCHAR(255),
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'new' NOT NULL,
        resolution_notes TEXT,
        resolved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_sam ON users(sam_account_name);
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    CREATE INDEX IF NOT EXISTS idx_users_dept ON users(department);
    CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization);
    CREATE INDEX IF NOT EXISTS idx_cr_status ON change_requests(status);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
    """)

def downgrade() -> None:
    op.drop_table('support_tickets')
    op.drop_table('reports')
    op.drop_table('change_requests')
    op.drop_table('system_settings')
    op.drop_table('users')
