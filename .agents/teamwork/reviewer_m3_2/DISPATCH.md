# Dispatch: Reviewer 2 (Milestone 3 — State Machine & Lifecycle Workflows)

## Working Directory
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_m3_2`

## Task
Review the task lifecycle workflows, proof enforcement, manager approvals, revision requests, and KPI metrics in `src/pages/crm/Tasks.tsx`.

## Key Inspection Criteria
1. **Lifecycle State Transitions**:
   - `todo` -> `in_progress` ("Start Job →").
   - `in_progress` -> `review` (Requires proof notes submission if `requires_proof === true`).
   - `review` -> `done` (Manager/Super-Admin approval recording `completed_at` and approver name).
   - `review` -> `in_progress` (Manager revision request requiring non-empty `review_feedback` and showing amber alert callout on card).
2. **Proof & Revision Modals**:
   - `<SubmitProofDialog>`: validation preventing submission with empty proof.
   - `<RequestRevisionDialog>`: validation preventing submission with empty revision feedback.
3. **KPI Metrics Calculation**:
   - Verify Total, In Progress, Under Review, Completed, Completion Rate % (`Math.round((done / total) * 100) || 0`), and Overdue task count.
4. **Verification**:
   - Run `cmd /c npx vitest run crmTask`.
   - Run `cmd /c npx tsc --noEmit`.

Write your handoff report to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_m3_2\handoff.md` with explicit verdict: **APPROVE** or **REQUEST_CHANGES**.

## 2026-10-21T19:50:06Z
You are Reviewer 2 for Milestone 3 of the CredSmart Enterprise CRM Staff Provisioning & Task Management project.

MANDATORY: Read c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (specifically timestamp 2026-10-21T17:42:42Z) and c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md before starting work.
Also read your task dispatch at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_m3_2\DISPATCH.md.

Your Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_m3_2

Review task lifecycle state transitions (`todo` -> `in_progress` -> `review` -> `done`, and revision loop `review` -> `in_progress`), proof notes requirement validation, manager approval permissions and timestamps, manager revision notes, and real-time KPI metrics in `src/pages/crm/Tasks.tsx`.
Run verification commands: `cmd /c npx vitest run crmTask` and `cmd /c npx tsc --noEmit`.
Write your handoff report to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_m3_2\handoff.md` with explicit verdict: APPROVE or REQUEST_CHANGES.
Send message back to parent when done.
