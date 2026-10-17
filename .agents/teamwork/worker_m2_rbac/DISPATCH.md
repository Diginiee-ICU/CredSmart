# Dispatch: Worker M2 — Configurable Role System, Migrations, RBAC & Skill

## Identity
- **Agent Type**: `teamwork_preview_worker`
- **Role**: Full-Stack Engineer - CRM RBAC & Migrations
- **Working Directory**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2_rbac`
- **Orchestrator Conversation ID**: `f65e7324-0a80-4f4b-bb4c-bc82b84e3cdd`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Input Context & Survey Reports
1. Read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (lines 239-267)
2. Read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase1\PROJECT.md`
3. Read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_roles\handoff.md`
4. Read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_design\handoff.md`

## File Write Ownership
You have exclusive write ownership over:
- `supabase/migrations/20261017000000_create_crm_rbac_tables.sql`
- `src/integrations/supabase/types.ts`
- `src/hooks/useCRMPermission.ts`
- `.agents/skills/crm-rbac-skill/SKILL.md`
- `src/pages/crm/RoleManagement.tsx`
- `src/pages/Staff.tsx`

Do NOT touch any other source files.

## Detailed Requirements for Milestone 2 & 4 (R2, R4)

### 1. Supabase Migration (`supabase/migrations/20261017000000_create_crm_rbac_tables.sql`)
- Create idempotent PostgreSQL DDL:
  - Table `public.crm_roles`:
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE`
    - `name TEXT NOT NULL`
    - `color TEXT NOT NULL DEFAULT '#1D4ED8'`
    - `icon TEXT NOT NULL DEFAULT 'User'`
    - `is_super_admin BOOLEAN NOT NULL DEFAULT false`
    - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - Table `public.crm_permissions`:
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `role_id UUID NOT NULL REFERENCES public.crm_roles(id) ON DELETE CASCADE`
    - `module TEXT NOT NULL` (attendance, salary, tasks, meetings, broadcasts, ai_assistant, support)
    - `action TEXT NOT NULL` (view, edit, create, approve, send, access, manage)
    - `allowed BOOLEAN NOT NULL DEFAULT true`
    - `CONSTRAINT uq_crm_permissions_role_mod_act UNIQUE (role_id, module, action)`
  - Table `public.crm_staff_roles`:
    - `staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
    - `role_id UUID NOT NULL REFERENCES public.crm_roles(id) ON DELETE CASCADE`
    - `assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL`
    - `assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()`
    - `PRIMARY KEY (staff_id, role_id)`
  - Indexes:
    - `idx_crm_roles_org` on `crm_roles(org_id)`
    - `idx_crm_permissions_role` on `crm_permissions(role_id)`
    - `idx_crm_staff_roles_staff` on `crm_staff_roles(staff_id)`
    - `idx_crm_staff_roles_role` on `crm_staff_roles(role_id)`
  - Enable RLS on all 3 tables with idempotent policies (`has_org_access`, `is_org_owner_or_manager`, or matching organization access).
  - Define function `public.seed_crm_super_admin_for_org(_org_id UUID)`:
    - Inserts a "Super Admin" role for `_org_id` with `is_super_admin = true`, `color = '#1D4ED8'`, `icon = 'Crown'`.
    - Inserts all 14 permissions across all 7 modules with `allowed = true`.
  - Automatically call `seed_crm_super_admin_for_org` for all existing organizations in `public.organizations`.
  - Create trigger on `public.organizations` AFTER INSERT calling `seed_crm_super_admin_for_org(NEW.id)`.

### 2. Supabase Types Definition (`src/integrations/supabase/types.ts`)
- Add typed table definitions for `crm_roles`, `crm_permissions`, and `crm_staff_roles` in `Database['public']['Tables']` so that:
  - `supabase.from("crm_roles")`, `supabase.from("crm_permissions")`, and `supabase.from("crm_staff_roles")` are strictly typed.
  - Strict TypeScript mode passes with ZERO `any` types.

### 3. CRM Permission Hook (`src/hooks/useCRMPermission.ts`)
- Implement and export `useCRMPermission(module?: string, action?: string)` and alias `usePermission`:
  - Reads active `user` from `useAuth()` and `orgId` from `useOrganization()`.
  - Reads user's assigned roles from `crm_staff_roles` joined with `crm_roles`.
  - If user is super-admin (`is_super_admin === true` or `userRole === 'store_owner' | 'super_admin'`), `hasPermission` returns `true` for all actions.
  - Otherwise, checks if any assigned role grants `allowed: true` for `(module, action)` in `crm_permissions`.
  - Fallback caching to `localStorage` (`credsmart_crm_roles_${orgId}`, `credsmart_crm_permissions_${orgId}`, `credsmart_crm_staff_roles_${orgId}`) for offline / testing resilience.
  - Returns `{ hasPermission, isSuperAdmin, userRoles, loading, refreshPermissions, allowed }`.

### 4. Role Management Page (`src/pages/crm/RoleManagement.tsx`)
- Fully functional Role Management UI matching CredSmart design standards:
  - Super-admin check (only store owner / super-admin can edit; read-only view with indicator for others).
  - Roles List & Cards Grid showing all roles (name, color pill, icon, staff count, permission count).
  - Create / Edit Custom Role Modal:
    - Role Name input
    - Color picker (palette swatches: Navy #0F172A, Orange #FF6A00, Blue #1D4ED8, Emerald #10B981, Purple #9333EA, Amber #F59E0B, etc.)
    - Icon picker (Lucide icons: Shield, Crown, Briefcase, UserCheck, Star, Zap, Settings, Tool)
  - Interactive Permissions Matrix:
    - 7 modules: Attendance, Salary, Tasks, Meetings, Broadcasts, AI Assistant, Support
    - 14 actions with switches/checkboxes:
      - Attendance: View, Edit
      - Salary: View, Edit
      - Tasks: View, Create, Approve
      - Meetings: View, Create
      - Broadcasts: View, Send
      - AI Assistant: Access
      - Support: View, Manage
    - Bulk "Select All" / "Deselect All" buttons.
    - Save changes persisted to Supabase and localStorage cache with toast notification.
  - Staff Role Assignment Section:
    - Searchable staff list (querying `organization_memberships` + `profiles`).
    - Role assignment dropdown per staff member.
    - "Promote to Super Admin" / "Demote" actions.
    - Persists assignments to `crm_staff_roles` and localStorage.
  - No hard-coded roles — all roles are dynamic.

### 5. Staff Page Integration (`src/pages/Staff.tsx`)
- Add a prominent, polished CRM Role Management banner/link at the top of `Staff.tsx`:
  - Linking directly to `/crm/roles`.
  - Clean card explaining that POS/Cashier roles are managed here, while granular CRM module roles are configured in CRM Role Management.
  - Do NOT break or rewrite existing Staff page billing/store cashier features.

### 6. Reusable Skill File (`.agents/skills/crm-rbac-skill/SKILL.md`)
- Create with valid YAML frontmatter (`name: crm-rbac-skill`, `description: ...`).
- Comprehensive documentation for future sub-agents building Phases 2–6:
  - Database schema for `crm_roles`, `crm_permissions`, `crm_staff_roles`
  - How `CRMPermissionGate` is used in subsequent phases
  - How to use `useCRMPermission` / `usePermission` in page components
  - How to add new CRM modules and actions as new phases are built
  - Migration patterns, naming conventions, and idempotent DDL
  - CredSmart brand color tokens and CRM design guidelines

### 7. Verification
- Run `tsc --noEmit` to verify 0 compiler errors.
- Run tests (`npm test -- --run`) to verify zero regressions.
- Document all modified files and verification outputs in `handoff.md`.

## 2026-10-17T06:50:26Z
[Message] timestamp=2026-10-17T06:50:26Z sender=f65e7324-0a80-4f4b-bb4c-bc82b84e3cdd priority=MESSAGE_PRIORITY_HIGH
Execute Milestone 2 & 4:
1. Create supabase/migrations/20261017000000_create_crm_rbac_tables.sql (crm_roles, crm_permissions, crm_staff_roles with idempotent DDL, RLS policies, indexes, and automated super_admin seeding trigger).
2. Extend src/integrations/supabase/types.ts with typed CRM tables (zero any).
3. Create src/hooks/useCRMPermission.ts implementing useCRMPermission and usePermission with super_admin bypass and resilient caching.
4. Implement src/pages/crm/RoleManagement.tsx with role creation modal (name, color swatches, icon picker), interactive 14-action permissions matrix across 7 modules, searchable staff list with role dropdown, promote to super-admin / demote actions.
5. Add CRM Role Management banner in src/pages/Staff.tsx without breaking store cashier functionality.
6. Create .agents/skills/crm-rbac-skill/SKILL.md with YAML frontmatter, schema, useCRMPermission guide, CRMPermissionGate guide, and developer manual for Phases 2-6.
7. Run `tsc --noEmit` and run `npm test -- --run` to verify zero errors and non-regression.

