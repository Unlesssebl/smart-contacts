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

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Create our test engine
test_engine = create_engine(
    "sqlite:///./test.db",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Inject them into app.db.session BEFORE app is imported!
import app.db.session
app.db.session.engine = test_engine
app.db.session.SessionLocal = TestingSessionLocal

from app.main import app
from app.db.session import Base, get_db
from app.models.user import User
import uuid
from datetime import datetime, timezone

# Use SQLite file for optimal testing speed without touching Postgres
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

@pytest.fixture(scope="session")
def db_engine():
    yield test_engine
    if os.path.exists("./test.db"):
        try:
            os.remove("./test.db")
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
    
    mocker.patch("app.core.redis.redis_client", mock_redis_client)
    mocker.patch("app.core.ldap.pool.redis_client", mock_redis_client)
    
    # Also patch async if it exists
    try:
        mocker.patch("app.core.redis.async_redis_client", mock_redis_client)
    except Exception:
        pass
    
    return mock_redis_client
