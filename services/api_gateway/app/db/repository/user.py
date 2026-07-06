from sqlalchemy.orm import Session
from app.models.user import User
from typing import Optional
import uuid
from sqlalchemy import update

def get_user_by_sam(db: Session, sam: str) -> Optional[User]:
    return db.query(User).filter(User.sam_account_name == sam).first()

def get_user_by_guid(db: Session, guid: str) -> Optional[User]:
    if isinstance(guid, str):
        guid = uuid.UUID(guid)
    return db.query(User).filter(User.object_guid == guid).first()

def update_user_guid(db: Session, sam: str, new_guid: str) -> None:
    """
    Updates the primary key (object_guid) for a user identified by sam_account_name.
    Used for linking API stubs to real AD GUIDs.
    """
    db.execute(
        update(User).where(User.sam_account_name == sam).values(object_guid=new_guid)
    )
    db.commit()

def create_user_stub(db: Session, sam: str, guid: Optional[str] = None, full_name: Optional[str] = None) -> User:
    """
    Creates a user record if it doesn't exist (Sync Worker will fill details later).
    """
    user_data = {
        "sam_account_name": sam,
        "full_name": full_name or sam,
        "role": "employee",
        "is_verified": False
    }
    if guid:
        user_data["object_guid"] = guid
        
    user = User(**user_data)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
