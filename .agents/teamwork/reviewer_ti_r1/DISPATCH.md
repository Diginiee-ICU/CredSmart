# Reviewer Round 1 Dispatch — Strict Multi-Tenant Organization Isolation for CredSmart CRM

Your working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_ti_r1

<original_task>
This is a single self-contained fix; keep it small and focused. Enforce strict multi-tenant organization isolation for CredSmart CRM so that staff members, attendance, tasks, salary profiles, roles, and CRM operations are strictly scoped to the active organization (e.g., "Cred"), preventing any cross-tenant data or user visibility across different organizations.

Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart
Integrity mode: development

## Requirements

### R1. Tenant-Isolated Staff & User Directory
- CRM staff lists (`/api/crm/staff`, `/api/crm/staff-roles`, and frontend roster components) must strictly return users who are members of the active organization (`organization_id` / `org_id`).
- Prevent cross-organization staff visibility: users belonging to Organization A must never appear in Organization B's staff directory, assignee selector, or attendance logs.
- When provisioning new staff members, the user membership must be explicitly recorded and scoped to the active organization (`org_memberships` / `organization_memberships` and `crm_staff_assignments`).

### R2. Strict Organization Scoping across CRM Endpoints
- Ensure all CRM routes (`/api/crm/tasks`, `/api/crm/attendance`, `/api/crm/salary-profiles`, `/api/crm/roles`, `/api/crm/broadcasts`, `/api/crm/meetings`) enforce strict tenant boundaries matching the active organization context.
- Prevent data leakage between organizations: requests from Organization A must not read, update, or delete records belonging to Organization B.

### R3. Membership Isolation & Clean Separation
- Ensure queries retrieving organization members do not cross-join or aggregate users from unrelated organizations.
- When an admin provisions staff for a CRM instance, ensure the relationship is firmly bound to that organization and not globally associated with all organizations.

## Verification Resources
- Automated test suites:
  - `src/test/crmStaffTasksIntegration.test.tsx`
  - `src/test/crmStaffProvisioning.test.ts`
  - `src/test/crmStaffProvisioningUI.test.tsx`
  - `src/test/crmDashboardResilience.test.tsx`
  - `src/test/crmTasksView.test.tsx`
- Type checking:
  - `npx tsc --noEmit`

## Acceptance Criteria

### Multi-Tenant Isolation
- [ ] Querying `/api/crm/staff` for Organization A returns only staff assigned to Organization A, and 0 users from Organization B.
- [ ] Task assignees in Organization A only display staff belonging to Organization A.
- [ ] Attendance and salary records are strictly partitioned by organization ID without cross-tenant bleed.
- [ ] Attempting to access or mutate CRM records of another organization returns an error or empty result isolated to the caller's organization.

### Zero Regression & Code Health
- [ ] `tsc --noEmit` exits with 0 errors across the repository.
- [ ] All 198+ existing CRM tests pass cleanly without regression.
- [ ] Billing and invoice generation workflows remain 100% untouched.
</original_task>

<prior_attempt>
> [!WARNING] **Skepticism Disclaimer**
> While all 102 automated unit/integration tests and static type checking pass cleanly with zero errors, my confidence in end-to-end multi-tenant isolation in production is tempered by the fact that backend unit tests execute against mocked PostgreSQL pools rather than a live PostgreSQL cluster enforcing row-level security or foreign key cascades.

## 1. What I changed
- **`backend-api/src/routes/crm.js`**: Enforced strict multi-tenant organization isolation across all endpoints. Introduced `resolveOrgId`, `verifyUserInOrg`, and `verifyRoleInOrg` helpers. Scoped `/roles`, `/permissions`, `/staff`, `/staff-roles`, `/staff/provision`, `/attendance`, `/salary-profiles`, `/salary`, `/payroll-runs`, `/payroll`, `/payslips`, `/salary-adjustments`, `/tasks`, `/tickets`, `/broadcasts`, `/meetings`, and `/dashboard-counts`. Blocked cross-tenant task assignment, status updates, deletions, foreign role assignment, and duplicate staff collision across distinct organizations.
- **`src/pages/crm/SalaryManagement.tsx`**: Replaced un-scoped global Supabase queries (`supabase.from("profiles").select("*")`, `crm_salary_profiles`, `crm_payroll_runs`, `crm_payslips`, `crm_salary_adjustments`, `crm_attendance`) with queries strictly filtered by `effectiveOrgId` and scoped membership user IDs. Scoped salary adjustments and disbursement updates to `effectiveOrgId`.
- **`src/pages/crm/Attendance.tsx`**: Scoped `crm_staff_roles` query by `.in("staff_id", userIds)` where `userIds` are active members of `effectiveOrgId`.
- **`src/pages/crm/Broadcasts.tsx`**, **`src/pages/crm/Meet.tsx`**, **`src/pages/crm/Tasks.tsx`**: Added reload effects when `storageKey` or `orgId` changes so in-memory state from one tenant is immediately cleared and does not bleed into another during organization switching.
- **`fix_crm_schema.sql` & `backend-api/fix_crm_schema.sql`**: Added `crm_meetings` DDL table definition with `org_id` reference and index.
- **`src/test/crmTenantIsolation.test.ts`**: Created comprehensive 18-test unit suite covering tenant resolution, roster isolation, cross-tenant task assignment rejection, cross-tenant task mutation protection, attendance scoping, salary profile isolation, and role permission protection.

## 2. Why
To guarantee strict data isolation for the active organization (e.g., "Cred"), preventing any cross-tenant data leaks, unauthorized mutations, or user visibility across different organizations in compliance with requirements R1, R2, and R3.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `cmd /c npx tsc --noEmit` -> Exited 0 with 0 errors.
  - `cmd /c npx vitest run src/test/crmTenantIsolation.test.ts` -> 18/18 tests passed (26ms).
  - Full suite run (`cmd /c npx vitest run src/test/crmStaffTasksIntegration.test.tsx src/test/crmStaffProvisioning.test.ts src/test/crmStaffProvisioningUI.test.tsx src/test/crmDashboardResilience.test.tsx src/test/crmTasksView.test.tsx src/test/crmBackendApiM1.test.ts src/test/crmTenantIsolation.test.ts`):
    - All 7 test files passed.
    - All 102 individual tests passed in 30.38s.
- **Shallow Verification (manual run only):**
  - Eyeballed query patterns in `backend-api/src/routes/crm.js` and `SalaryManagement.tsx` to verify all DB queries contain `org_id` or `organization_id` filters.
- **Unverified aspects:**
  - Did not execute against a live hosted PostgreSQL instance or Supabase production database with actual RLS policies enabled.
  - Did not visually test WebRTC video peer connections in `Meet.tsx` across physical browser sessions.

## 4. Known Issues
- `Minor Robustness Risk` — If a tenant lacks an entry in both `org_memberships` and `organization_memberships` (legacy single-table deployments), `verifyUserInOrg` relies on `COALESCE` across both tables; if neither exists, staff provisioning defaults to creating the membership record in `org_memberships`.
- `Shallow Verification` — In-browser local storage keys for Broadcasts and Meet use `credsmart_crm_broadcasts_${effectiveOrgId}`; browser storage quotas are not explicitly pruned for old tenant data when switching tenants frequently.

## 5. Untested Edge Cases & Next Step
- **Untested Edge Case**: Provisioning an existing user into Tenant B whose password in Tenant A was created with a non-bcrypt hashing scheme or modified directly in Supabase Auth.
- **Reviewer Next Step**: Execute an integration test against a live PostgreSQL database attempting to issue a `PATCH /crm/tasks/:id` with an auth token from Tenant A targeting a task ID belonging to Tenant B to confirm the endpoint returns 404 Not Found.
</prior_attempt>

## Additional Context
Open issues ledger from prior round:
- [OI-1] Legacy single-table deployments: If a tenant lacks an entry in both org_memberships and organization_memberships, verifyUserInOrg fallback behavior and staff provisioning handling. (Raised by: Implementer R1)
- [OI-2] Browser local storage scoping & cleanup: Verify storageKey isolation and pruning when switching tenants frequently in Broadcasts and Meet. (Raised by: Implementer R1)
- [OI-3] Cross-tenant password / auth collision: Provisioning an existing user into Tenant B whose password in Tenant A was created with non-bcrypt hashing scheme or modified directly in Supabase Auth. (Raised by: Implementer R1)
- [OI-4] Cross-tenant PATCH /crm/tasks/:id and other endpoints: Test that attempting to mutate a task, attendance, role, or meeting belonging to Tenant B using credentials for Tenant A strictly returns 404/403 and prevents mutation. (Raised by: Implementer R1)
- [OI-5] Zero regression verification across remaining CRM suites (e.g. `crmBackendApiM1.test.ts`, all 198+ existing CRM tests). (Raised by: Implementer R1)
