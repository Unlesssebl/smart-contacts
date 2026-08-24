class LdapAuthError(Exception):
    def __init__(self, message: str, code: str = None):
        super().__init__(message)
        self.message = message
        self.code = code

class LdapWorkstationRestrictionError(LdapAuthError):
    """AD data 531: User not allowed to logon from this computer (Logon Workstations)"""
    pass

class LdapPasswordExpiredError(LdapAuthError):
    """AD data 532, 773: Password expired or must change"""
    pass

class LdapAccountDisabledError(LdapAuthError):
    """AD data 533: Account disabled in AD"""
    pass

class LdapAccountLockedError(LdapAuthError):
    """AD data 775: Account locked out in AD"""
    pass
