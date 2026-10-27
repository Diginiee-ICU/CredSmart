# Task Assignment: Milestone 3 Review (Reviewer 2) — Optimistic Updates & Error Rollbacks

## Objective
Review the implementation in `src/pages/crm/Tasks.tsx` against Requirement R3:
- Verify optimistic task creation in `handleCreateTask`: temporary ID, server UUID replacement upon API success, rollback and destructive toast on API failure/rejection.
- Verify deterministic error rollback across all task lifecycle transitions:
  - `handleMoveStatus`
  - `handleApproveTask`
  - `handleSubmitProof`
  - `handleSubmitRevision`
- Verify that previous task states are restored and error toasts are shown if any of these API calls fail.

## Relevant Files to Inspect
- `src/pages/crm/Tasks.tsx`
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m3_tasks\handoff.md`
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md`

## Verification Requirements
1. Run `cmd /c npx vitest run src/test/crmTasksView.test.tsx src/test/crmStaffTasksIntegration.test.tsx src/test/crmStaffProvisioningUI.test.tsx`.
2. Run `cmd /c npx tsc --noEmit`.
3. Verify deterministic rollback logic in every task transition handler.

## Output
Write your findings to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_m3_2\handoff.md` with explicit verdict: `APPROVE` or `REQUEST_CHANGES`.
Send a completion message back with your verdict.

## 2026-10-26T22:03:39Z
You are Reviewer 2 for Milestone 3 (Tasks & Staff Provisioning - R3).
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_m3_2
Read your instructions in: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_m3_2\DISPATCH.md
Read the user request in: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
Read the worker handoff in: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m3_tasks\handoff.md

Inspect `src/pages/crm/Tasks.tsx`.
Verify optimistic creation, server UUID replacement, and deterministic error rollbacks on failure for all task transitions (handleMoveStatus, handleApproveTask, handleSubmitProof, handleSubmitRevision).
Run verification commands:
`cmd /c npx vitest run src/test/crmTasksView.test.tsx src/test/crmStaffTasksIntegration.test.tsx src/test/crmStaffProvisioningUI.test.tsx`
`cmd /c npx tsc --noEmit`

Write your handoff report to: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_m3_2\handoff.md
Send your verdict (APPROVE or REQUEST_CHANGES) via send_message to the orchestrator.
