from app.core.ldap.pool import init_ldap_pool

def test_get_search_pool_with_mock(mock_ldap_pool):
    """
    Test that getting the search pool returns our mocked connection.
    This ensures no real network queries happen to AD.
    """
    import app.core.ldap.pool
    pool = app.core.ldap.pool.get_search_pool()
    assert pool is not None
    assert pool == mock_ldap_pool

def test_init_ldap_pool(mocker, caplog):
    """
    Test the init_ldap_pool startup function.
    """
    import logging
    caplog.set_level(logging.INFO)
    mocker.patch("app.core.ldap.pool.get_search_pool", return_value=None)
    mocker.patch("app.core.ldap.pool.get_setting", return_value="fake_creds")
    
    # Normally it checks the connection if pool is None, we should mock Connection too
    mock_conn_class = mocker.patch("app.core.ldap.pool.Connection")
    mock_conn_instance = mock_conn_class.return_value.__enter__.return_value
    mock_conn_instance.open.return_value = True

    init_ldap_pool()
    
    assert "AD_USER/AD_PASSWORD not set in DB" in caplog.text
    assert "LDAP server is reachable" in caplog.text

def test_apply_ou_mapping_to_users_bg(db_session, test_normal_user, mocker):
    """
    Test the background task logic for OU mapping to Organization and Department fields.
    """
    from app.api.v1.endpoints.admin import apply_ou_mapping_to_users_bg
    
    # Give the user an AD DN with nested department OU
    test_normal_user.ad_dn = "CN=Normal User,OU=Engineering,OU=Moscow_HQ,OU=Users,DC=domain,DC=local"
    db_session.commit()
    
    mapping = {
        "Moscow_HQ": "Central Office",
        "Some_Other_OU": "Other Office"
    }
    
    apply_ou_mapping_to_users_bg(mapping)
    
    # Fetch the user again to see if organization and department were updated
    db_session.refresh(test_normal_user)
    
    assert test_normal_user.organization == "Central Office"
    assert test_normal_user.department == "Engineering"

def test_apply_ou_mapping_case_insensitive(db_session, test_normal_user, mocker):
    """
    Test that OU mapping is case-insensitive.
    """
    from app.api.v1.endpoints.admin import apply_ou_mapping_to_users_bg
    
    test_normal_user.ad_dn = "CN=Normal User,OU=remote_workers,OU=Users,DC=domain,DC=local"
    db_session.commit()
    
    mapping = {
        "Remote_Workers": "Remote Office"
    }
    
    apply_ou_mapping_to_users_bg(mapping)
    
    db_session.refresh(test_normal_user)
    
    assert test_normal_user.organization == "Remote Office"
