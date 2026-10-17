# Local Copy of crm-rbac-skill

This file is a local cache of `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\crm-rbac-skill\SKILL.md`.

Refer to the original file for full text. Core methodology:
- Decoupled, dynamic, user-configurable CRM RBAC engine.
- Zero hardcoded roles, full custom colors/icons/permissions.
- Super admin bypass for org owner / super_admin role.
- Supabase tables `crm_roles`, `crm_permissions`, `crm_staff_roles` with localStorage fallback.
- `useCRMPermission` hook and `CRMPermissionGate` gating component with toast feedback.
- Idempotent migration with triggers and automated super admin seeding.
- Strict typing (zero `any`).
