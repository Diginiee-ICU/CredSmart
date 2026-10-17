# Handoff Report: Survey Roles, Database & Staff Architecture

## 1. Observation

### 1.1 Existing Migrations & DDL Patterns in `supabase/migrations/`
- Directory contains 20 migration files. The latest 5 files follow the timestamp prefix convention `YYYYMMDDHHMMSS_<description>.sql`:
  - `20260920120000_create_network_notifications_table.sql`
  - `20260921000000_create_storefront_tables.sql`
  - `20260922000000_create_sales_returns_tables.sql`
  - `20260922010000_fix_b2b_network_realtime_rls.sql`
  - `20260922020000_create_tally_sync_pairing_tokens.sql`
- Next sequential migration filename: `20261017000000_create_crm_rbac_tables.sql`.
- In `20260921000000_create_storefront_tables.sql:1-37` and `20260922020000_create_tally_sync_pairing_tokens.sql:1-33`, the standard idempotent DDL pattern is:
  1. Transaction wrapper: `BEGIN; ... COMMIT;`
  2. Idempotent table creation: `CREATE TABLE IF NOT EXISTS public.<table_name> (id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, ...);`
  3. Foreign keys: `organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE`
  4. Indexes: `CREATE INDEX IF NOT EXISTS <index_name> ON public.<table_name>(...);`
  5. Row-Level Security: `ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;`
  6. Idempotent policies: `DROP POLICY IF EXISTS "..." ON public.<table_name>; CREATE POLICY "..." ON public.<table_name> ...;`
  7. Established RLS helper functions (defined in `20260211173918_6bb13237-b72e-4831-9dd1-304eca51792b.sql:78-112`):
     - `public.has_org_access(_org_id UUID)`
     - `public.is_org_owner_or_manager(_org_id UUID)`
- In `20260213163000_fix_organization_onboarding_rls.sql:40-44`, organization lifecycle triggers use `AFTER INSERT ON public.organizations FOR EACH ROW EXECUTE FUNCTION ...`.

### 1.2 Supabase Client & TypeScript Schema in `src/integrations/supabase/`
- `src/integrations/supabase/client.ts:11-17` initializes the Supabase client:
  ```ts
  export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { storage: localStorage, persistSession: true, autoRefreshToken: true }
  });
  ```
- `src/integrations/supabase/types.ts:9-897` defines `Database['public']['Tables']`, `Database['public']['Functions']`, and `Database['public']['Enums']`.
- Currently, CRM tables (`crm_roles`, `crm_permissions`, `crm_staff_roles`) are not present in `types.ts`.
- In previous migrations (e.g. `storefront_settings`), tables omitted from `types.ts` forced developers to cast queries with `as any` (e.g. `src/hooks/useOrganization.tsx:746`: `supabase.from("storefront_settings" as any)`).
- The prompt strictly mandates: `Zero TypeScript errors (strict mode, no any types in CRM files)`.

### 1.3 Staff Management & Organization Context in `src/pages/Staff.tsx` and `src/hooks/`
- `src/pages/Staff.tsx:593-595` and `src/hooks/useOrganization.tsx:33-59`:
  - Organization context provides `orgId`, `userRole`, `userPermissions`, `org`.
  - Current staff members are queried from `public.organization_memberships` (`Staff.tsx:737-744`):
    ```ts
    const { data, error } = await supabase
      .from("organization_memberships")
      .select("id, user_id, role, created_at")
      .eq("organization_id", oid)
      .order("created_at", { ascending: true });
    ```
  - Profiles are joined via `public.profiles` (`Staff.tsx:752-758`):
    ```ts
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds);
    ```
- `src/pages/Staff.tsx:64-75, 298-571` utilizes hard-coded legacy roles (`store_owner`, `super_admin`, `admin`, `partner`, `manager`, `salesman`, `cashier`, `stock_manager`, `delivery_boy`, `accountant`) mapped to fixed feature sets (`ROLE_PRESET_PERMISSIONS`).
- `src/pages/Staff.tsx:614-627` uses localStorage as a resilience layer (`org_user_permissions_${orgId}_${member.user_id}`).
- In `ORIGINAL_REQUEST.md:228`: "Existing Staff page: src/pages/Staff.tsx (extend/integrate where relevant, do NOT replace)."

### 1.4 Detailed Requirements for R2 (CRM RBAC)
- Exact table names and columns specified in `ORIGINAL_REQUEST.md:241-245`:
  - `crm_roles`: `(id, org_id, name, color, icon, is_super_admin, created_at)`
  - `crm_permissions`: `(id, role_id, module, action, allowed)`
  - `crm_staff_roles`: `(staff_id, role_id, assigned_by, assigned_at)`
- Modules and actions taxonomy explicitly specified in `ORIGINAL_REQUEST.md:241-242`:
  - `attendance`: `view`, `edit`
  - `salary`: `view`, `edit`
  - `tasks`: `view`, `create`, `approve`
  - `meetings`: `view`, `create`
  - `broadcasts`: `view`, `send`
  - `ai_assistant`: `access`
  - `support`: `view`, `manage`
  Total: 7 modules, 14 granular actions.
- Automatic seeding: Super admin role must be seeded automatically via migration with all 14 permissions enabled.
- Dynamic roles: "No hard-coded roles anywhere in the codebase — all roles are user-defined."
- Role Management UI: `src/pages/crm/RoleManagement.tsx` allowing super-admins to create roles, configure module/action toggles, assign roles to staff, and promote/demote users.

---

## 2. Logic Chain

1. **Migration Numbering & Execution**:
   - Because the latest migration is `20260922020000_create_tally_sync_pairing_tokens.sql`, creating `20261017000000_create_crm_rbac_tables.sql` maintains standard lexical timestamp sorting.
   - Using `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, and `DROP POLICY IF EXISTS` guarantees full idempotency across test and production environments.

2. **Schema & Foreign Key Integrity**:
   - In `crm_roles`, the specification requires `org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE`. Using `org_id` matches the prompt exactly while indexing `idx_crm_roles_org ON crm_roles(org_id)`.
   - In `crm_permissions`, linking `role_id UUID REFERENCES public.crm_roles(id) ON DELETE CASCADE` with a unique constraint `UNIQUE (role_id, module, action)` prevents duplicate module-action records per role.
   - In `crm_staff_roles`, `staff_id` links to `auth.users(id) ON DELETE CASCADE` (which matches `organization_memberships.user_id` and `profiles.id`). A unique constraint `UNIQUE (staff_id, role_id)` ensures idempotent role assignment.

3. **Auto-Seeding Mechanism**:
   - To satisfy "Seed a super_admin role automatically via migration", we define a stored procedure `public.seed_crm_super_admin_for_org(_org_id UUID)`.
   - It inserts/updates `crm_roles` with `name = 'Super Admin'`, `color = '#1D4ED8'`, `icon = 'Crown'`, and `is_super_admin = true`.
   - It populates all 14 module-action pairs into `crm_permissions` with `allowed = true`.
   - The migration invokes this function for all existing organizations in `public.organizations`.
   - An `AFTER INSERT ON public.organizations` trigger calls `seed_crm_super_admin_for_org(NEW.id)` to guarantee any future organization is automatically seeded upon creation.

4. **Strict TypeScript Typing (Zero `any`)**:
   - The strict constraint `Zero TypeScript errors (strict mode, no any types in CRM files)` cannot be satisfied if Supabase tables are untyped.
   - Therefore, `src/integrations/supabase/types.ts` must be extended with typed Row/Insert/Update definitions for `crm_roles`, `crm_permissions`, and `crm_staff_roles`.
   - This allows `supabase.from("crm_roles").select("*")` to return typed records without unsafe casts.

5. **Client-Side Resilience & Offline Fallback**:
   - In case remote Supabase is unavailable, during preview runs, or before migrations are executed in remote instances, the frontend must implement a dual-layer approach:
     - Primary: Supabase DB queries (`crm_roles`, `crm_permissions`, `crm_staff_roles`).
     - Fallback: LocalStorage caching (`credsmart_crm_roles_${orgId}`, `credsmart_crm_permissions_${orgId}`, `credsmart_crm_staff_roles_${orgId}`).
     - Store owner fallback: Users with `userRole === 'store_owner' || userRole === 'super_admin'` in `useOrganization()` are automatically granted super-admin access even if DB records have not synced yet.

6. **Role Management Page (`src/pages/crm/RoleManagement.tsx`)**:
   - The UI must feature:
     - Role Selector & Card Grid showing user-defined roles, staff count, and permission counts.
     - Role Modal: Create/Edit role with custom Name, Color (palette swatches), and Icon (Lucide icon selector).
     - Permissions Matrix: Interactive toggles for all 7 modules and 14 actions, with "Enable All" / "Disable All" bulk controls.
     - Staff Role Assignment: Searchable staff list (reading `organization_memberships` + `profiles`), role dropdown, and one-click Promote to Super Admin / Demote actions.

---

## 3. Caveats

1. **Store Roles vs CRM Roles**:
   - `src/pages/Staff.tsx` currently manages billing/POS-level roles (`salesman`, `cashier`, etc.).
   - The CRM role system is an independent, user-defined RBAC layer governing CRM modules (`attendance`, `salary`, `tasks`, `meetings`, `broadcasts`, `ai_assistant`, `support`).
   - `Staff.tsx` should remain intact and display a link/banner to CRM Role Management (`/crm/roles`) rather than replacing its store cashier/billing functionality.
2. **`routes.ts` Path**:
   - `ORIGINAL_REQUEST.md:237` mentioned `src/components/routes.ts`. However, the actual codebase defines routes in `src/config/routes.ts`. We recommend creating `src/components/routes.ts` as a re-export of `src/config/routes.ts` to satisfy both conventions with zero ambiguity.
3. **Database Permissions & RLS in Local/Preview**:
   - Local development without live database migrations requires the frontend fallback caching in `localStorage` so the UI remains fully testable and functional during Vitest runs and offline inspection.

---

## 4. Conclusion

The technical path for R2 is clear and directly actionable:
1. **Migration**: Create `supabase/migrations/20261017000000_create_crm_rbac_tables.sql` defining `crm_roles`, `crm_permissions`, and `crm_staff_roles` with RLS, indexes, and an automatic super-admin seeding trigger.
2. **Supabase Types**: Update `src/integrations/supabase/types.ts` to include typed table definitions for the three CRM tables, satisfying the strict no-`any` requirement.
3. **CRM Permission Hook**: Build `src/hooks/useCRMPermission.ts` exposing `useCRMPermission` with `hasPermission(module, action)` and super-admin bypass.
4. **Role Management UI**: Build `src/pages/crm/RoleManagement.tsx` with role creation (name, color, icon), 14-action permission matrix, searchable staff assignment, and promote/demote features.
5. **Staff Integration**: Add a CRM Role Management banner/link in `src/pages/Staff.tsx` without disrupting existing POS/store roles.

---

## 5. Verification Method

To independently verify this architectural foundation:
1. **Migration Syntax & Idempotency Check**:
   - Run SQL parser or apply migration in PostgreSQL / Supabase CLI:
     ```bash
     npx supabase db lint
     ```
   - Verify table creation, indexes, and `seed_crm_super_admin_for_org` trigger execution.
2. **TypeScript Compilation**:
   - Run `npx tsc --noEmit` to ensure `types.ts` and all CRM components have zero type errors and zero `any` usage.
3. **Test Suite**:
   - Run Vitest test suite:
     ```bash
     npm run test
     ```
   - Verify all existing tests pass with 0 regressions.
4. **Browser & UI Verification**:
   - Navigate to `/crm/roles` as super-admin / store owner.
   - Verify that the Super Admin role exists with all 14 permissions enabled.
   - Create a custom role (e.g., "Operations Lead", purple `#9333EA`, "Briefcase").
   - Toggle specific module actions (e.g. enable tasks create/view, disable salary view/edit).
   - Assign the new role to a staff member and verify persistent updates in both Supabase and localStorage.
