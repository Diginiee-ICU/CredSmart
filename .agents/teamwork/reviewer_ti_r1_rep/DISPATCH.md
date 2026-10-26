# Reviewer Round 1 (Replacement) Dispatch — Strict Multi-Tenant Organization Isolation

Your working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_ti_r1_rep

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
Implementer & Reviewer R1 preliminary progress:
1. Implemented strict multi-tenant scoping in `backend-api/src/routes/crm.js`, `src/pages/crm/SalaryManagement.tsx`, `src/pages/crm/Attendance.tsx`, `src/pages/crm/Broadcasts.tsx`, `src/pages/crm/Meet.tsx`, `src/pages/crm/Tasks.tsx`.
2. Authored 27 comprehensive tests in `src/test/crmTenantIsolation.test.ts` testing:
   - Tenant-isolated staff directory & role scoping
   - Assigning roles across organizations rejected (404/403)
   - Staff deletion tenant-scoped
   - Provisioning duplicate user in same org (409) vs cross-tenant membership (201)
   - Password hash preserved on cross-tenant provisioning
   - Legacy single-table deployment handling (org_memberships fallback)
   - Task query tenant scoping
   - Cross-tenant task assignment rejected (400)
   - Cross-tenant task PATCH & DELETE rejected (404)
   - Attendance & Salary profile queries and mutations strictly partitioned by org ID
   - Roles, permissions, broadcasts, meetings, and dashboard counts strictly partitioned
   - Bulk payslips, payroll runs, tickets, geolocations, attendance requests protected against cross-tenant access.
3. Verification:
   - `tsc --noEmit` exits with 0 errors.
   - All 7 test files (111 tests) pass cleanly.
</prior_attempt>

## Additional Context
Open issues ledger:
- [OI-1] Legacy single-table deployments: If a tenant lacks an entry in both org_memberships and organization_memberships, verifyUserInOrg fallback behavior and staff provisioning handling. (Verified passing in test 20)
- [OI-2] Browser local storage scoping & cleanup: Verify storageKey isolation and pruning when switching tenants frequently in Broadcasts and Meet.
- [OI-3] Cross-tenant password / auth collision: Provisioning an existing user into Tenant B whose password in Tenant A was created with non-bcrypt hashing scheme or modified directly in Supabase Auth. (Verified passing in test 19)
- [OI-4] Cross-tenant PATCH /crm/tasks/:id and other endpoints: Test that attempting to mutate a task, attendance, role, or meeting belonging to Tenant B using credentials for Tenant A strictly returns 404/403 and prevents mutation. (Verified passing in tests 9, 10, 12, 14, 15, 24, 25)
- [OI-5] Zero regression verification across remaining CRM suites (e.g. `crmBackendApiM1.test.ts`, all 198+ existing CRM tests).
