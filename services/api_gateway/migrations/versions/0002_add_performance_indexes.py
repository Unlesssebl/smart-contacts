"""Add performance indexes for user directory search and active listing

Revision ID: 0002_add_performance_indexes
Revises: 0001_initial_schema
Create Date: 2026-08-28 10:50:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = '0002_add_performance_indexes'
down_revision: Union[str, None] = '0001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Ensure pg_trgm extension is installed
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")

    # 2. Composite partial index for default directory sorting / active listings
    op.execute("""
    CREATE INDEX IF NOT EXISTS idx_users_active_fullname
    ON users (full_name ASC)
    WHERE status != 'RESIGNED' AND is_hidden = FALSE;
    """)

    # 3. Trigram GIN indexes for fast fuzzy and ILIKE searches
    op.execute("""
    CREATE INDEX IF NOT EXISTS idx_users_fullname_trgm
    ON users USING GIN (full_name gin_trgm_ops);
    """)

    op.execute("""
    CREATE INDEX IF NOT EXISTS idx_users_department_trgm
    ON users USING GIN (department gin_trgm_ops);
    """)

    op.execute("""
    CREATE INDEX IF NOT EXISTS idx_users_office_trgm
    ON users USING GIN (office_location gin_trgm_ops);
    """)

    op.execute("""
    CREATE INDEX IF NOT EXISTS idx_users_internal_phone_trgm
    ON users USING GIN (regexp_replace(internal_phone, '[^0-9]', '', 'g') gin_trgm_ops);
    """)

    op.execute("""
    CREATE INDEX IF NOT EXISTS idx_users_mobile_phone_trgm
    ON users USING GIN (regexp_replace(mobile_phone, '[^0-9]', '', 'g') gin_trgm_ops);
    """)

def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_users_mobile_phone_trgm;")
    op.execute("DROP INDEX IF EXISTS idx_users_internal_phone_trgm;")
    op.execute("DROP INDEX IF EXISTS idx_users_office_trgm;")
    op.execute("DROP INDEX IF EXISTS idx_users_department_trgm;")
    op.execute("DROP INDEX IF EXISTS idx_users_fullname_trgm;")
    op.execute("DROP INDEX IF EXISTS idx_users_active_fullname;")
