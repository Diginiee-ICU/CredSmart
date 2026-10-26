# DISPATCH — Strict Multi-Tenant Organization Isolation for CredSmart CRM (Gen 2)

## Task Overview
Enforce strict multi-tenant organization isolation for CredSmart CRM so that staff members, attendance, tasks, salary profiles, roles, and CRM operations are strictly scoped to the active organization (e.g., "Cred"), preventing any cross-tenant data or user visibility across different organizations.

Working directory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart`
Metadata directory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\swe_tenant_isolation_gen2`
Original request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (timestamp `2026-10-25T20:32:02Z`)
Predecessor metadata: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\swe_tenant_isolation`

## State at Re-Spawn
- **Implementer Milestone**: Completed. Core changes to `/api/crm/staff`, `/api/crm/tasks`, `/api/crm/attendance`, `/api/crm/salary-profiles`, and frontend components are already implemented.
- **Test Baseline**: 111 tests passed in Vitest (`crmTenantIsolation.test.ts`, `crmStaffTasksIntegration.test.tsx`, `crmStaffProvisioning.test.ts`, `crmStaffProvisioningUI.test.tsx`, `crmDashboardResilience.test.tsx`, `crmTasksView.test.tsx`, `crmBackendApiM1.test.ts`). `cmd /c npx tsc --noEmit` exited with 0 errors.
- **Reviewer Status**: Reviewer Round 1 was interrupted by a transient network/DNS outage. You are re-spawned to resume the adversarial review cycles (Round 1, Round 2, Round 3) to completion.

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
Automated test suites:
- `src/test/crmTenantIsolation.test.ts`
- `src/test/crmStaffTasksIntegration.test.tsx`
- `src/test/crmStaffProvisioning.test.ts`
- `src/test/crmStaffProvisioningUI.test.tsx`
- `src/test/crmDashboardResilience.test.tsx`
- `src/test/crmTasksView.test.tsx`
Type checking:
- `cmd /c npx tsc --noEmit`

## Acceptance Criteria

### Multi-Tenant Isolation
- [ ] Querying `/api/crm/staff` for Organization A returns only staff assigned to Organization A, and 0 users from Organization B.
- [ ] Task assignees in Organization A only display staff belonging to Organization A.
- [ ] Attendance and salary records are strictly partitioned by organization ID without cross-tenant bleed.
- [ ] Attempting to access or mutate CRM records of another organization returns an error or empty result isolated to the caller's organization.

### Zero Regression & Code Health
- [ ] `cmd /c npx tsc --noEmit` exits with 0 errors across the repository.
- [ ] All 198+ existing CRM tests pass cleanly without regression.
- [ ] Billing and invoice generation workflows remain 100% untouched.

## Execution Instructions
You are the SWE Light Orchestrator (`teamwork_preview_swe`).
Working directory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\swe_tenant_isolation_gen2`
Project root: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart`
Original request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (under `## 2026-10-25T20:32:02Z`)
Dispatch instructions: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\swe_tenant_isolation_gen2\DISPATCH.md`

Execute the SWE Light lifecycle to completion:
1. Since the initial implementation and baseline tests (111 passed) are in place, dispatch a reviewer (`teamwork_preview_reviewer`) for Round 1 adversarial review.
2. Conduct adversarial review rounds (minimum 3 rounds: R1, R2, R3) carrying a cumulative open-issues ledger, establishing correctness by running tests (Vitest and `cmd /c npx tsc --noEmit`).
3. Maintain `progress.md` in your working directory (`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\swe_tenant_isolation_gen2\progress.md`).
4. When all criteria and tests pass, send completion message with your handoff report to Sentinel.


## 2026-10-26T13:25:27Z
You are the SWE Light Orchestrator Gen 2 (teamwork_preview_swe).
Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\swe_tenant_isolation_gen2
Project root: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart
Original request: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (under ## 2026-10-25T20:32:02Z)
Dispatch instructions: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\swe_tenant_isolation_gen2\DISPATCH.md
Predecessor metadata: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\swe_tenant_isolation

Context:
The initial implementation phase completed successfully with 111 passing tests across all 7 CRM test suites and 0 tsc errors.
Reviewer Round 1 was interrupted by a transient network/DNS failure.

Execute the SWE Light lifecycle:
1. Dispatch Reviewer Round 1 (teamwork_preview_reviewer) to conduct adversarial break & fix review against tenant isolation edge cases and the open issues ledger.
2. Complete 3 sequential reviewer rounds (R1, R2, R3).
3. Maintain progress.md in your working directory.
4. When all criteria and tests pass, send completion message with your handoff report to Sentinel.
