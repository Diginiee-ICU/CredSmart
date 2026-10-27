## 2026-10-26T21:33:47Z
You are Worker M3 implementing Milestone 3: Reliable Task Assignment & Synthetic ID Elimination (Requirement R3) for CredSmart CRM Defects Elimination.

Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m3_tasks
Authoritative Request: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (MUST read section ## 2026-10-26T19:54:47Z before starting work!)
Project Scope: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_defects\PROJECT.md
Survey Reports:
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_staff_salary\survey_staff_salary.md
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_staff_salary\handoff.md

Exclusive Write Ownership:
- `src/pages/crm/RoleManagement.tsx`
- `src/pages/crm/Tasks.tsx`

Detailed Tasks:
1. `src/pages/crm/RoleManagement.tsx`:
   - Inspect lines 1067–1070 and 1148 where `newUserId = res?.data?.user?.id || 'user-' + Date.now()` was used.
   - Eliminate all synthetic ID generation (`user-${Date.now()}` or `user-178...`).
   - Check `if (res?.error)` or `!res?.data?.user?.id`. If provisioning fails, show a destructive toast (`toast.error(res.error || "Failed to provision staff")`), reset form, and DO NOT add ghost staff to local state or `localStorage`.
   - In catch block (line 1148), do not generate fallback synthetic IDs.
2. `src/pages/crm/Tasks.tsx`:
   - Eliminate synthetic IDs from staff selection: filter staff IDs so only valid UUIDs (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`) can be selected as task assignees.
   - Prioritize real staff from `crmApi.getCRMStaff(orgId)` and `crmApi.getCRMStaffRoles(orgId)`.
   - In `handleCreateTask`: perform optimistic insert with temporary key, but check `if (res?.error)`. If error, roll back the optimistic task from state and show error toast. If success, replace temp ID with real database UUID `res.data.id`.
   - Implement deterministic error rollback across task lifecycle transitions (`handleMoveStatus`, `handleApproveTask`, `handleSubmitProof`, `handleSubmitRevision`).
   - In `loadData()` line 282: when `res?.data` is an empty array `[]` (an org with 0 tasks), call `setTasks([])` so the empty state renders cleanly instead of trapping the org into displaying mock demo tasks (`INITIAL_TASKS`).
3. Verification:
   - Run `cmd /c npx vitest run src/test/crmTasksView.test.tsx src/test/crmStaffTasksIntegration.test.tsx src/test/crmStaffProvisioningUI.test.tsx`
   - Run `cmd /c npx tsc --noEmit`
   - Confirm all tests pass with 0 errors.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Output Requirements:
- Write implementation log in `progress.md`.
- Run tests and record test output.
- Write completion report in `handoff.md`.
- Send message back to orchestrator.

## 2026-10-26T21:50:18Z
**Context**: Milestone M3 (Task Assignment & Synthetic ID Elimination)
**Content**: Checking on your progress. Please update your progress.md with current status and let us know which step you are on (RoleManagement.tsx edits, Tasks.tsx edits, or test execution).
**Action**: Report current status and progress.
