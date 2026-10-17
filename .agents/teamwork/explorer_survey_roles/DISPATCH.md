# Dispatch: Explorer Survey Roles, DB & Staff

## Identity
- **Agent Type**: `teamwork_preview_explorer`
- **Role**: Codebase Researcher - Roles, DB & Staff
- **Working Directory**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_roles`
- **Orchestrator Conversation ID**: `f65e7324-0a80-4f4b-bb4c-bc82b84e3cdd`

## Mission & Instructions
Read `ORIGINAL_REQUEST.md` at `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md`.
Investigate the authoritative sources for CredSmart's database schema, auth, staff, and migration patterns:
1. `supabase/migrations/` (existing migration files, numbering conventions, syntax, idempotent execution)
2. `src/integrations/supabase/client.ts` and `src/integrations/supabase/types.ts`
3. `src/pages/Staff.tsx` and staff hooks/services (how staff members are stored/fetched, organization_id handling, auth user link)
4. Requirements for R2:
   - `crm_roles` (id, org_id, name, color, icon, is_super_admin, created_at)
   - `crm_permissions` (id, role_id, module, action, allowed)
   - `crm_staff_roles` (staff_id, role_id, assigned_by, assigned_at)
   - Auto-seeding super_admin role with all permissions
   - Role Management page at `src/pages/crm/RoleManagement.tsx` (create custom roles with name/color/icon, module+action toggles, assign roles to staff, promote/demote)
   - No hard-coded roles — all roles user-defined.

Produce a detailed report in `handoff.md` in your working directory and notify orchestrator via `send_message`.
