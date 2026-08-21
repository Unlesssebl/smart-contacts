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

class SupportTicketStatus(str, Enum):
    OPEN = "open"
    CLOSED = "closed"

class SupportTicketCategory(str, Enum):
    ACCESS = "access"
    DATA_ERROR = "data_error"
    BUG = "bug"
    SUGGESTION = "suggestion"
    OTHER = "other"

