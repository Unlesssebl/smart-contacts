from enum import Enum

class UserStatus(str, Enum):
    ACTIVE = "ACTIVE"
    RESIGNED = "RESIGNED"
    ON_LEAVE = "ON_LEAVE"

class UserRole(str, Enum):
    EMPLOYEE = "employee"
    IT_OPERATOR = "it_operator"
    ADMIN = "admin"

class ChangeRequestStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CONFLICT = "conflict"
    APPLIED = "applied"

class ReportStatus(str, Enum):
    PENDING = "pending"
    PROCESSED = "processed"
