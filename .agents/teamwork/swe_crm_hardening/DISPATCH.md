# DISPATCH — CredSmart CRM Hardening & Real Staff Visibility

## Task Overview
This is a single self-contained fix; keep it small and focused. Perform a deep recheck and hardening of CredSmart CRM across multi-tenant isolation, real staff visibility (eliminating mock demo staff on the dashboard), human display name preservation, default password generation (name123), and task assignment features, ensuring 100% test passing and zero regressions.

Working directory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart`
Metadata directory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\swe_crm_hardening`
Original request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (timestamp `2026-10-26T16:44:01Z`)

## Requirements

### R1. Strict Real Staff Visibility & Dashboard Purity
- Eliminate `DEFAULT_STAFF` mock data (`Suresh`, `Pushpa`, `Rajesh`, etc.) from `CRMDashboard.tsx`.
- Only real staff members provisioned for or belonging to the active organization (`orgId`) must be fetched and displayed.
- If an organization has no staff members yet, render a clean empty state rather than injecting demo names.

### R2. Human Display Name Consistency
- Ensure staff human display names (e.g. "Aman Sharma") are displayed across all CRM views (roster, task cards, tables, assignee dropdowns, breadcrumbs) instead of raw or sanitized usernames.
- In backend route handlers (`POST /tasks`, `PATCH /tasks/:id`), fall back to `users.name` if `users.full_name` is empty.

### R3. Default Password Generation
- Verify default auto-generated passwords follow `{firstName}123` format (e.g. staff named "aman" -> `aman123`, padded to 6 chars minimum) on both frontend and backend.

### R4. Task Assignment & Lifecycle Invariants
- Verify task assignment workflow: selecting active org staff, persisting `assigned_to`, displaying assignee display name and initial avatar, and transitioning across lifecycle states (`todo` -> `in_progress` -> `review` -> `done`).

## Verification Resources
Automated test suites:
- `src/test/crmTenantIsolation.test.ts`
- `src/test/crmDashboardResilience.test.tsx`
- `src/test/crmStaffTasksIntegration.test.tsx`
- `src/test/crmStaffProvisioning.test.ts`
- `src/test/crmStaffProvisioningUI.test.tsx`
- `src/test/crmTasksView.test.tsx`
- `src/test/crmBackendApiM1.test.ts`
- `src/test/crmSubmodules.test.tsx`
Type checking:
- `cmd /c npx tsc --noEmit`

## Acceptance Criteria

### CRM Functionality & Isolation
- [ ] `CRMDashboard.tsx` displays only real organization staff members and zero mock `DEFAULT_STAFF`.
- [ ] New staff provisioning auto-generates password as `{firstName}123`.
- [ ] Staff display names are visible across rosters, tables, and task cards.
- [ ] Task assigning and lifecycle transitions function without errors.

### Code Health & Zero Regression
- [ ] `cmd /c npx tsc --noEmit` exits with 0 errors.
- [ ] All 136 CRM tests pass cleanly without regression.
- [ ] Zero changes to protected billing and invoice files.

## Execution Instructions
You are the SWE Light Orchestrator (`teamwork_preview_swe`).
Working directory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\swe_crm_hardening`
Project root: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart`
Original request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (under `## 2026-10-26T16:44:01Z`)
Dispatch instructions: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\swe_crm_hardening\DISPATCH.md`
Execute the SWE Light protocol:
1. Spawn one implementer (`teamwork_preview_implementer`) to execute the changes and run tests.
2. Run adversarial review rounds (`teamwork_preview_reviewer`) with cumulative open-issues ledger until fully verified.
3. Establish correctness with tests and type-checking.
4. Report completion with a structured handoff report upon completion.
