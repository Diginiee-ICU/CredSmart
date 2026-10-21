# Dispatch: Reviewer 1 (Milestone 3 — UI, Kanban & Table Views)

## Working Directory
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_m3_1`

## Task
Review the Milestone 3 implementation of full-stack Enterprise Task Management in `src/pages/crm/Tasks.tsx`.

## Key Inspection Criteria
1. **Live Backend Wiring & Offline Resilience**:
   - Inspect `crmApi.getCRMTasks(orgId)` call on mount and manual refresh.
   - Verify `localStorage` key `credsmart_crm_tasks_${orgId}` fallback on network errors.
2. **Real Organization Staff Assignee Picker**:
   - Inspect loading of staff from `crmApi.getCRMStaffRoles` / `getCRMStaff`.
   - Verify `<Select>` dropdown displays staff with store role and CRM role badges.
   - Verify compatibility with companion `<Input placeholder="Staff member name..." />`.
3. **Interactive Dual Views (Kanban & Table)**:
   - Verify 4 Kanban swimlanes (`todo`, `in_progress`, `review`, `done`) with count badges, priority chips, due date warnings, assignee avatars, and proof badges.
   - Verify high-density sortable Table view with matching action buttons.
4. **Verification**:
   - Run `cmd /c npx vitest run src/test/crmTasksView.test.tsx src/test/crmStaffTasksIntegration.test.tsx`.
   - Run `cmd /c npx tsc --noEmit`.

Write your handoff report to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_m3_1\handoff.md` with explicit verdict: **APPROVE** or **REQUEST_CHANGES**.

## 2026-10-21T19:50:05Z
You are Reviewer 1 for Milestone 3 of the CredSmart Enterprise CRM Staff Provisioning & Task Management project.

MANDATORY: Read c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (specifically timestamp 2026-10-21T17:42:42Z) and c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md before starting work.
Also read your task dispatch at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_m3_1\DISPATCH.md.

Your Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_m3_1

Review `src/pages/crm/Tasks.tsx`, live backend wiring with `crmApi.getCRMTasks`, offline cache fallback, real organization staff loading in `<CreateTaskDialog>`, 4-column Kanban board, and high-density Table view.
Run verification commands: `cmd /c npx vitest run src/test/crmTasksView.test.tsx src/test/crmStaffTasksIntegration.test.tsx` and `cmd /c npx tsc --noEmit`.
Write your handoff report to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_m3_1\handoff.md` with explicit verdict: APPROVE or REQUEST_CHANGES.
Send message back to parent when done.
