from sqlalchemy.orm import Session
from app.models.user import User
from typing import Optional

def get_user_by_sam(db: Session, sam: str) -> Optional[User]:
    return db.query(User).filter(User.sam_account_name == sam).first()

def get_user_by_guid(db: Session, guid: str) -> Optional[User]:
    return db.query(User).filter(User.object_guid == guid).first()

def create_user_stub(db: Session, sam: str) -> User:
    """
    Creates a user record if it doesn't exist (Sync Worker will fill details later).
    In a real LDAP system, we might pull some basic info during BIND if possible,
    but the spec says Sync Worker handles the rest.
    """
    user = User(
        sam_account_name=sam,
        full_name=sam, # Placeholder
        role="employee",
        is_verified=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
