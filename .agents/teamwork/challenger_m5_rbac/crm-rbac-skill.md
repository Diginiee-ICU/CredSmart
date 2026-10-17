# Dump of crm-rbac-skill for Challenger RBAC
Reference: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\crm-rbac-skill\SKILL.md

See original skill file for complete details. Key items:
- 14 granular permissions:
  1. attendance: view, edit
  2. salary: view, edit
  3. tasks: view, create, approve
  4. meetings: view, create
  5. broadcasts: view, send
  6. ai_assistant: access
  7. support: view, manage
- Super Admin Bypass:
  - store_owner, super_admin, or is_super_admin: true
- localStorage fallback keys:
  - credsmart_crm_roles_${orgId}
  - credsmart_crm_permissions_${orgId}
  - credsmart_crm_staff_roles_${orgId}
- Org isolation: permissions & roles scoped strictly by org_id.
