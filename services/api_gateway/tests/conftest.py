import os
os.environ["POSTGRES_USER"] = "test_user"
os.environ["POSTGRES_PASSWORD"] = "test_pass"
os.environ["POSTGRES_DB"] = "test_db"
os.environ["DB_HOST"] = "localhost"
os.environ["SECRET_KEY"] = "test_secret_key_mock_value"
os.environ["AD_SERVER"] = "test_ad_server"
os.environ["AD_BASE_DN"] = "DC=test,DC=local"

import pytest
from typing import Generator
from fastapi.testclient import TestClient

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import difflib
import re

# Create our test engine
test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)

@event.listens_for(test_engine, "connect")
def register_sqlite_functions(dbapi_connection, connection_record):
    def sqlite_similarity(str1, str2):
        if str1 is None or str2 is None:
            return 0.0
        return difflib.SequenceMatcher(None, str(str1).lower(), str(str2).lower()).ratio()

    def sqlite_regexp_replace(target, pattern, replacement, flags=""):
        if target is None:
            return ""
        return re.sub(pattern, replacement, str(target))

    dbapi_connection.create_function("similarity", 2, sqlite_similarity)
    dbapi_connection.create_function("regexp_replace", 4, sqlite_regexp_replace)
    dbapi_connection.create_function("regexp_replace", 3, lambda t, p, r: re.sub(p, r, str(t) if t else ""))

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Inject them into app.db.session BEFORE app is imported!
import app.db.session
app.db.session.engine = test_engine
app.db.session.SessionLocal = TestingSessionLocal

from app.main import app
from app.db.session import Base, get_db
from shared.models.user import User
import uuid
from datetime import datetime, timezone

# Use SQLite file for optimal testing speed without touching Postgres
SQLALCHEMY_DATABASE_URL = "sqlite:////tmp/test.db"

@pytest.fixture(scope="session")
def db_engine():
    yield test_engine
    if os.path.exists("/tmp/test.db"):
        try:
            os.remove("/tmp/test.db")
        except OSError:
            pass

@pytest.fixture(scope="function")
def db_session(db_engine) -> Generator:
    """
    Creates a fresh database session for a test by dropping and recreating tables.
    """
    Base.metadata.drop_all(bind=db_engine)
    Base.metadata.create_all(bind=db_engine)
    
    from app.db.session import SessionLocal
    connection = db_engine.connect()
    session = SessionLocal(bind=connection)
    
    yield session
    
    session.close()
    connection.close()

@pytest.fixture(scope="function")
def client(db_session) -> Generator:
    """
    FastAPI TestClient that overrides the get_db dependency.
    """
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def mock_service_upn() -> str:
    """
    The UPN of the mocked service account for tests.
    Ensures that real OS credentials are NOT used.
    """
    return "test_service"

@pytest.fixture
def mock_kerberos(mocker, test_admin_user):
    """
    Mocks Kerberos SPNEGO authentication.
    Instead of real OS ticket negotiation, it returns the mock service account UPN.
    """
    mocker.patch(
        "app.api.v1.endpoints.auth.validate_kerberos_ticket",
        return_value=test_admin_user.sam_account_name
    )
    return test_admin_user.sam_account_name

@pytest.fixture(autouse=True)
def mock_ldap_pool(mocker):
    """
    Mocks the LDAP connection pool to avoid real AD network queries.
    """
    mock_conn = mocker.MagicMock()
    mocker.patch("app.core.ldap.pool.get_search_pool", return_value=mock_conn)
    mocker.patch("app.core.ldap.search.get_search_pool", return_value=mock_conn)
    return mock_conn

@pytest.fixture
def test_admin_user(db_session, mock_service_upn):
    """
    Seed a service account user with admin (it_operator) privileges.
    """
    user = User(
        object_guid=uuid.uuid4(),
        sam_account_name=mock_service_upn,
        full_name="Service Account",
        role="it_operator",
        organization="Главный Офис",
        is_verified=True,
        is_protected=True,
        status="ACTIVE",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture
def test_normal_user(db_session):
    """
    Seed a standard user without admin privileges.
    """
    user = User(
        object_guid=uuid.uuid4(),
        sam_account_name="normal_user",
        full_name="Normal User",
        role="employee",
        organization="Главный Офис",
        is_verified=True,
        is_protected=False,
        status="ACTIVE",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture(autouse=True)
def mock_redis(mocker):
    """
    Globally mocks the Redis client to prevent hanging during brute-force checks or caching.
    """
    mock_redis_client = mocker.MagicMock()
    mock_redis_client.get.return_value = None
    mock_redis_client.set.return_value = None
    mock_redis_client.eval.return_value = [0, 0]
    
    mocker.patch("app.core.redis.redis_client", mock_redis_client)
    mocker.patch("app.core.ldap.pool.redis_client", mock_redis_client)
    mocker.patch("app.services.event_service.redis_client", mock_redis_client)
    
    # Also patch async if it exists
    try:
        mocker.patch("app.core.redis.async_redis_client", mock_redis_client)
    except Exception:
        pass
    
    return mock_redis_client
