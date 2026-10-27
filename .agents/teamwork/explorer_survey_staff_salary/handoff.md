# Handoff Report: Frontend Staff, Salary & Tasks Workflows Survey (R2 & R3)

**Author**: `explorer_survey_staff_salary`  
**Milestone**: Phase 0 — Survey & Forensic Codebase Mapping  
**Date**: 2026-10-26T20:25:00Z  
**Target Recipient**: Orchestrator (`9b1188fd-78cb-4433-afbb-88547ac33d9e`) & Implementation Workers (`worker_m1_salary`, `worker_m3_tasks`)

---

## 1. Observation

1. **`SalaryManagement.tsx` Staff Hydration Flaw (Lines 304–358)**:
   - In `src/pages/crm/SalaryManagement.tsx:308-313`:
     ```ts
     const staffRes = await crmApi.getCRMStaff(effectiveOrgId);
     if (staffRes?.data && Array.isArray(staffRes.data) && staffRes.data.length > 0) {
       staffData = staffRes.data as unknown as Record<string, unknown>[];
     }
     ```
   - In `src/pages/crm/SalaryManagement.tsx:315-346`: If `staffData` is null, the fallback queries `supabase.from("organization_memberships")` and `supabase.from("profiles")`. However, user accounts in the PostgreSQL backend live in `users`, not `profiles`.
   - In `src/pages/crm/SalaryManagement.tsx:325`: When `settingsApi.getMemberships(effectiveOrgId)` is called, the response already contains user details (`u.full_name, u.name, u.email`), but `SalaryManagement.tsx` line 327 discards this data: `memberUserIds = memRes.data.map((m: any) => m.user_id).filter(Boolean);` and proceeds to query the empty `profiles` table.
   - In `src/pages/crm/SalaryManagement.tsx:265`: Line 265 executes `setStaffDirectory({});` on organization switch, but never checks `localStorage.getItem("credsmart_crm_staff_" + effectiveOrgId)`.

2. **Empirical Verification of Salary Test Failure**:
   - Command: `cmd.exe /c npx vitest run src/test/crmTasksView.test.tsx src/test/crmSalaryManagement.test.tsx`
   - Result:
     - `src/test/crmTasksView.test.tsx`: 6/6 tests PASS.
     - `src/test/crmSalaryManagement.test.tsx`: 11 tests FAIL at line 883:
       `Unable to find an element with text: Amit Sharma`.
     - Cause: `staffDirectory` remained `{}` because `crmApi.getCRMStaff` and the fallback failed to populate `dirMap`. Consequently, `p.staff_name` defaulted to `"Staff Member"` instead of `"Amit Sharma"`.

3. **Invisibility of Unconfigured Staff in Tab 1 (Lines 1430–1576)**:
   - In `src/pages/crm/SalaryManagement.tsx:1435`:
     `<CRMDataTable<CrmSalaryProfile> data={salaryProfiles} ... />`
   - In `src/pages/crm/SalaryManagement.tsx:1536`:
     `{salaryProfiles.length === 0 ? <div>No salary profiles configured yet.</div> : salaryProfiles.map(...)}`
   - Tab 1 only renders rows that already exist in `crm_salary_profiles`. Newly provisioned staff have no salary profile and therefore are completely invisible on the main page.
   - In `src/pages/crm/SalaryManagement.tsx:2743-2756`: The Profile Drawer staff select maps over `Object.values(staffDirectory)`. When `staffDirectory` is empty, the dropdown has 0 selectable staff.

4. **Synthetic Staff ID Generation in `RoleManagement.tsx` (Lines 1067–1070 & 1148)**:
   - In `src/pages/crm/RoleManagement.tsx:1067-1070`:
     ```ts
     const res = await crmApi.provisionStaffUser(payload, orgId);
     const assignedRole = roles.find((r) => r.id === crmRoleIdToAssign);
     const newUserId = res?.data?.user?.id || `user-${Date.now()}`;
     ```
   - In `src/lib/apiClient.ts:316-324`: `apiPost` catches HTTP 4xx/5xx and returns `{ data: null, error: ... }` without throwing.
   - `RoleManagement.tsx` does NOT check `if (res.error)`. When backend rejects provisioning (status 400, 409 duplicate email, or 500), `res.data` is null, generating a client-side synthetic ID `user-${Date.now()}` (e.g. `user-1784920481234`).
   - Line 1096 saves `newStaffEntry` with this synthetic ID to `credsmart_crm_staff_${orgId}` in `localStorage`.
   - Line 1148 in the catch block also generates `fallbackUserId = "user-" + Date.now()`.

5. **Backend Rejection in `POST /api/crm/tasks` (crm.js:1827–1835)**:
   - In `backend-api/src/routes/crm.js:1830`:
     ```js
     const belongs = await verifyUserInOrg(cleanAssignee, orgId);
     if (!belongs) {
       return res.status(400).json({ error: 'Assigned user does not belong to this organization' });
     }
     ```
   - `verifyUserInOrg` checks PostgreSQL tables `org_memberships`, `organization_memberships`, and `crm_staff_assignments`.
   - A synthetic ID (`user-178...`) does not exist in the database (and is not a valid UUID).
   - Backend responds with HTTP 400: `"Assigned user does not belong to this organization"`.

6. **Frontend Error Suppression & Ghost Tasks in `Tasks.tsx` (Lines 426–497)**:
   - In `src/pages/crm/Tasks.tsx:426-444`: `handleCreateTask` inserts the task optimistically with `tempId = "task-" + Date.now()`.
   - In `src/pages/crm/Tasks.tsx:479`: The code only checks `if (res?.data && res.data.id)`.
   - When the backend returns HTTP 400, `res.error` is ignored. No error toast is shown, and the optimistic task is **never rolled back**.
   - On page refresh, `loadData()` calls `crmApi.getCRMTasks(orgId)` which returns only the database rows. The unpersisted task vanishes permanently.
   - In `src/pages/crm/Tasks.tsx:282`: If `res.data` is an empty array `[]` (an org with 0 tasks), `res.data.length > 0` is false, so `setTasks` is not called, trapping clean organizations into displaying the hardcoded mock `INITIAL_TASKS` (Rahul Sharma, Pooja Verma, etc.).

---

## 2. Logic Chain

1. **R2 Invisibility Mechanism**:
   - Newly provisioned staff only get rows in `users`, `org_memberships`, and `crm_staff_assignments` (Observation 1, 4).
   - No row is created in `crm_salary_profiles` until explicitly configured.
   - Because Tab 1 in `SalaryManagement.tsx` binds exclusively to `salaryProfiles`, any staff member without a salary profile is completely invisible (Observation 3).
   - When `crmApi.getCRMStaff` fails, the fallback tries to query `profiles` which does not exist, causing `staffDirectory` to become empty `{}` (Observation 1, 2).
   - An empty `staffDirectory` causes the Add Profile drawer dropdown to show 0 selectable options (Observation 3).
   - Therefore, the UI must hydrate `staffDirectory` from authoritative sources (with local cache fallback), listen for `credsmart:crm_staff_updated`, and render both configured and unconfigured staff in Tab 1 with 1-click configuration buttons.

2. **R3 Task Assignment Failure Mechanism**:
   - If provisioning fails on the backend, `RoleManagement.tsx` creates a synthetic ID (`user-178...`) and stores it in `localStorage` under `credsmart_crm_staff_${orgId}` (Observation 4).
   - `Tasks.tsx` loads staff from `localStorage` as a fallback when `crmApi.getCRMStaffRoles` fails or lags (Observation 6).
   - When the user assigns a task to that staff member, the synthetic ID is sent to `POST /api/crm/tasks` (Observation 5, 6).
   - Backend `verifyUserInOrg` validates that `cleanAssignee` belongs to `orgId` in PostgreSQL. Because the synthetic ID does not exist in PostgreSQL, it returns HTTP 400 (Observation 5).
   - `Tasks.tsx` performs an optimistic update, but ignores `res.error` and never rolls back the optimistic task (Observation 6).
   - On browser refresh, `loadData()` queries PostgreSQL, which has no record of the task, causing the task to vanish (Observation 6).
   - Furthermore, organizations with 0 tasks are prevented from clearing mock demo tasks due to the faulty check `res.data.length > 0` (Observation 6).
   - Therefore, synthetic IDs must be blocked at creation, `Tasks.tsx` must sanitize UUIDs, implement deterministic optimistic rollback on `res.error`, and correctly render empty state when `res.data.length === 0`.

---

## 3. Caveats

- **Network Mode**: Investigation was executed under read-only mode; no source code was altered.
- **Backend Database State**: We analyzed `backend-api/src/routes/crm.js` and `settings.js`. The Ubuntu server PostgreSQL schema uses UUID primary keys for `users.id`, `org_memberships.user_id`, and `staff_tasks.id`.
- **Protected Routes**: No modifications were made or proposed to POS billing routes, tax calculation engines, or invoice generators.

---

## 4. Conclusion

1. **For Requirement R2 (Salary Management)**:
   - `SalaryManagement.tsx` must be updated to:
     - Hydrate `staffDirectory` via `crmApi.getCRMStaff(effectiveOrgId)` with fallbacks to `localStorage` (`credsmart_crm_staff_${effectiveOrgId}`) and `settingsApi.getMemberships` (directly reading user fields).
     - Add a `credsmart:crm_staff_updated` event listener to reload staff dynamically when roles or staff change in Role Management.
     - Redesign Tab 1 to display **both configured profiles and unconfigured staff members**.
     - Provide a prominent 1-click **"Configure Salary"** action button for unconfigured staff that opens the drawer pre-populated with their ID, name, role, and sensible defaults.

2. **For Requirement R3 (Tasks)**:
   - `RoleManagement.tsx` must be updated to stop generating synthetic `user-${Date.now()}` on provision error; it must check `if (res.error)` and display a destructive toast without saving ghost records.
   - `Tasks.tsx` must:
     - Eliminate mock demo data (`INITIAL_TASKS`) when the backend returns `[]`.
     - Prioritize `crmApi.getCRMStaff(orgId)` for staff selection and filter out any non-UUID IDs.
     - Implement deterministic rollback in `handleCreateTask`, `handleMoveStatus`, `handleApproveTask`, `handleSubmitProof`, and `handleSubmitRevision` whenever `res.error` is returned or on network exception.

---

## 5. Verification Method

To independently verify these findings and subsequent fixes:

1. **Run Vitest Test Suites**:
   - `cmd.exe /c npx vitest run src/test/crmTasksView.test.tsx` (Current: 6/6 passing).
   - `cmd.exe /c npx vitest run src/test/crmSalaryManagement.test.tsx` (Current: 11 failures due to missing staff name enrichment from `staffDirectory`).
   - `cmd.exe /c npx vitest run src/test/crmStaffTasksIntegration.test.tsx`.
   - `cmd.exe /c npx vitest run src/test/crmSalaryLifecycleChallenger.test.tsx`.

2. **Code Inspection**:
   - Inspect `src/pages/crm/SalaryManagement.tsx` lines 304–358 and 1430–1576.
   - Inspect `src/pages/crm/Tasks.tsx` lines 218–277 and 464–497.
   - Inspect `src/pages/crm/RoleManagement.tsx` lines 1067–1070 and 1145–1175.
   - Inspect `backend-api/src/routes/crm.js` lines 34–90 (`verifyUserInOrg`) and lines 1803–1835 (`POST /tasks`).

3. **Invalidation Conditions**:
   - If `crmApi.getCRMStaff` is proven to create database rows in `crm_salary_profiles` on staff provision (invalidated: confirmed it does not).
   - If `verifyUserInOrg` accepts non-UUID synthetic IDs without database validation (invalidated: confirmed it queries Postgres and returns false).

---

*Handoff report authored and verified by `explorer_survey_staff_salary`.*
