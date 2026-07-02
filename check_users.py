import os
import psycopg2

conn = psycopg2.connect(
    dbname="smart_contacts",
    user="Unless",
    password="Vimeworld@",
    host="127.0.0.1",
    port=5432
)
cur = conn.cursor()
cur.execute("SELECT full_name, department, office_location, organization, ad_dn FROM users;")
users = cur.fetchall()

print("Users matching 'ИТЗ':")
for u in users:
    full_name, dept, office, org, ad_dn = u
    full_name = full_name or ""
    dept = dept or ""
    office = office or ""
    org = org or ""
    ad_dn = ad_dn or ""
    if "ИТЗ" in full_name or "ИТЗ" in dept or "ИТЗ" in office or "ИТЗ" in org or "ИТЗ" in ad_dn:
        print(f"Name: {full_name} | Dept: {dept} | Office: {office} | Org: {org} | DN: {ad_dn}")
