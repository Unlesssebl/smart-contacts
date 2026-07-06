from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from .config import settings
from shared.models.user import User
from shared.models.change_request import ChangeRequest
from shared.models.system_setting import SystemSetting

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
