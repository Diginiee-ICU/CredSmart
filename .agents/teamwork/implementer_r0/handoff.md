# CredSmart CRM Hardening & Real Staff Isolation — Handoff Report

## 1. Observation & Root Cause
- **R1 (Mock Staff Pollution)**: `CRMDashboard.tsx` hardcoded a fallback demo array `DEFAULT_STAFF` (`Suresh`, `Pushpa`, `Rajesh`, `Meenakshi`, `Anjali`) and merged it into the active organization's staff pills whenever fewer than 5 members were found or when `crmApi.getCRMStaff` was unresolved. For empty organizations, instead of showing a clean empty state, it displayed these hardcoded demo names.
- **R2 (Human Display Name Fallback in Backend Routes)**: In `backend-api/src/routes/crm.js`, the route handlers for `POST /tasks` and `PATCH /tasks/:id` only selected `full_name` and fell back immediately to `email` if `full_name` was null/empty, without falling back to `users.name`. In `RoleManagement.tsx`, fallback to authenticated user fell back directly to `user.email?.split("@")[0]` without inspecting `user.user_metadata?.full_name` or `user.user_metadata?.name`.
- **R3 (Default Password Format Compliance)**: Default auto-generated passwords in frontend (`generateStaffDefaultPassword`) and backend (`/api/crm/staff/provision`) follow the `{firstName}123` convention (e.g. `aman123`, padded to 6 chars minimum with `3`). When clicking "+ Add Staff" from search queries on the dashboard, `RoleManagement.tsx` didn't previously read the `name` URL search param to auto-fill the staff name and auto-derive their password.
- **R4 (Task Assignment & Lifecycle Invariants)**: Staff tasks workflow relies on clean active organization staff fetching, storing `assigned_to` and `assignee_id`, displaying human display names with avatar initial badges, and traversing state transitions `todo` -> `in_progress` -> `review` -> `done`.

---

## 2. Diff Summary (Files Modified)

### 1. `src/pages/crm/CRMDashboard.tsx`
- Deleted `DEFAULT_STAFF` mock data array.
- Initialized `dynamicStaff` state as empty `[]`.
- Removed all `DEFAULT_STAFF` merge loops from both cached localStorage staff hydration and authoritative `crmApi.getCRMStaff` responses.
- Added clean dashed-border empty state UI when no staff are provisioned yet:
  `"No staff members provisioned yet. Click + Add Staff to onboard your team."`

### 2. `backend-api/src/routes/crm.js`
- `POST /tasks`: Added `name` to the user query (`SELECT full_name, name, email, avatar_url FROM users WHERE id = $1`) and updated assignee/creator resolution to prefer `full_name`, then `name`, then `email`.
- `PATCH /tasks/:id`: Added `name` to the user query for assignee, approver, and creator resolution to prefer `full_name`, then `name`, then `email`.

### 3. `src/pages/crm/RoleManagement.tsx`
- Updated deep-link URL search param parser for `action=add-staff` to read `name` query parameter, populating `staffFormFullName` and auto-generating the default password `{firstName}123` via `generateStaffDefaultPassword`.
- Updated fallback user creation to prioritize `user.user_metadata?.full_name` and `user.user_metadata?.name` before email prefix.

---

## 3. Verification Record

### Automated Test Suite Run
Command executed:
```powershell
cmd /c npx vitest run src/test/crmTenantIsolation.test.ts src/test/crmDashboardResilience.test.tsx src/test/crmStaffTasksIntegration.test.tsx src/test/crmStaffProvisioning.test.ts src/test/crmStaffProvisioningUI.test.tsx src/test/crmTasksView.test.tsx src/test/crmBackendApiM1.test.ts src/test/crmSubmodules.test.tsx
```

#### Results Summary:
- **Test Files**: 8 passed (8 / 8)
- **Tests**: 136 passed (136 / 136)
- **Breakdown**:
  1. `src/test/crmTenantIsolation.test.ts`: 41 passed
  2. `src/test/crmStaffProvisioning.test.ts`: 29 passed
  3. `src/test/crmDashboardResilience.test.tsx`: 18 passed
  4. `src/test/crmBackendApiM1.test.ts`: 10 passed
  5. `src/test/crmSubmodules.test.tsx`: 10 passed
  6. `src/test/crmStaffTasksIntegration.test.tsx`: 8 passed
  7. `src/test/crmStaffProvisioningUI.test.tsx`: 7 passed
  8. `src/test/crmTasksView.test.tsx`: 6 passed

### Static Analysis & Type Checking
Command executed:
```powershell
cmd /c npx tsc --noEmit
```
#### Results:
- Exited with code `0`.
- 0 TypeScript compilation or type errors.

### Protected Files Check
- Checked all changes; zero modifications made to billing, POS, checkout, or invoicing files.

---

## 4. Known Issues, Unverified Aspects & Edge Cases

- `Shallow Verification`: Live PostgreSQL database instance with real concurrent network latency was not invoked directly in automated unit tests (tests use Vitest in-memory mocks / query builder mocks). However, backend route queries in `backend-api/src/routes/crm.js` are strictly tested via `crmBackendApiM1.test.ts` and `crmTenantIsolation.test.ts`.
- `Minor Robustness Risk`: If a user has neither `full_name` nor `name`, the system gracefully falls back to the email username prefix (e.g. `alex` from `alex@store.com`), which is standard resilient enterprise behavior.
