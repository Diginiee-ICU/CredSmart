# Task: E2E Testing Track Orchestration & Test Suite Design

## Objectives
Design and construct the comprehensive opaque-box E2E test suite for CredSmart Staff User Provisioning and Enterprise Task Management derived directly from `ORIGINAL_REQUEST.md` (see timestamp 2026-10-21T17:42:42Z) and `PROJECT.md`.

## Methodology (4-Tier)
- **Tier 1 — Feature Coverage (>=5 per feature)**:
  - Staff provisioning form validation & field sanitization.
  - Cryptographic auto-password generation entropy (length, character sets).
  - Credentials confirmation modal rendering and 1-click clipboard payload formatting.
  - Custom role creation dialog with direct staff assignment.
  - Task creation with title, description, priority, due date, proof required flag, and staff assignee.
  - Kanban board 4-column rendering (`todo`, `in_progress`, `review`, `done`).
  - Table view rendering with status badges, priority pills, and assignee avatars.
  - Proof notes submission dialog on `in_progress` -> `review`.
  - Manager approval flow (`review` -> `done`) recording `completed_at` and `approved_by`.
  - Manager revision request flow (`review` -> `in_progress`) with revision notes.
  - Real-time KPI metrics calculation (Total, In Progress, Review, Completed, Completion Rate).
- **Tier 2 — Boundary & Corner Cases (>=5 per feature)**:
  - Empty or invalid email format handling.
  - Special characters in user names and task descriptions.
  - Zero tasks state, 100+ tasks high volume rendering.
  - Tasks without assignee (unassigned fallback).
  - Past due date and same-day due date edge cases.
  - Re-submitting proof notes multiple times.
  - Offline fallback when backend API is unreachable.
- **Tier 3 — Cross-Feature Combinations**:
  - Provision new staff -> verify immediate appearance in roster -> assign task to new staff -> transition task through full lifecycle -> manager approval.
  - Create custom role with staff assigned -> staff user assigned task -> role badge displayed in task card.
- **Tier 4 — Real-World Application Scenarios**:
  - Multi-tenant company workflow: Owner creates custom roles, provisions 3 staff users, assigns retail and inventory tasks, staff submits photo/invoice proof notes, manager approves/requests revisions.

## Deliverables
1. `src/test/crmStaffProvisioning.test.ts`
2. `src/test/crmTaskLifecycle.test.ts`
3. `src/test/crmStaffTasksIntegration.test.tsx`
4. `TEST_INFRA.md` at project root documenting test architecture.
5. `TEST_READY.md` at project root when test suite is fully implemented and runner command verified.
6. Handoff report in `.agents/teamwork/test_writer_crm_tasks/handoff.md`.


## 2026-10-21T18:20:00Z
You are the Test Writer for the E2E Testing Track of the CredSmart Enterprise CRM Staff Provisioning & Task Management project.

MANDATORY: Read c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (specifically timestamp 2026-10-21T17:42:42Z) and c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md before starting work.
Also read your task dispatch at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\test_writer_crm_tasks\DISPATCH.md.

Your Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\test_writer_crm_tasks

Build the 4-tier E2E and unit test suite:
1. `src/test/crmStaffProvisioning.test.ts` (validation, entropy, credentials formatting, role assignment)
2. `src/test/crmTaskLifecycle.test.ts` (state machine, proof notes, manager approvals, revision requests, metrics calculation)
3. `src/test/crmStaffTasksIntegration.test.tsx` (component rendering, modal workflows, mock API integration)
4. Create `TEST_INFRA.md` at project root documenting test architecture, methodology, and coverage thresholds.
5. Create `TEST_READY.md` at project root when the test suite is implemented with clear runner commands.
6. Verify your tests run with `cmd /c npx vitest run src/test/crmStaff* src/test/crmTask*` and `cmd /c npx tsc --noEmit`.

Write your completion report to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\test_writer_crm_tasks\handoff.md` and send a message back to parent when done.
