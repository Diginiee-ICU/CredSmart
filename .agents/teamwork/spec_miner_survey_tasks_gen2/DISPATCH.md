# Survey Task: Enterprise CRM Task Management & E2E Testing Architecture

## Objectives
Investigate the Task Management architecture, requirements, and testing patterns:
1. Examine `src/pages/crm/Tasks.tsx`, `src/components/crm/*`, `src/services/crmApi.ts` (or equivalent API services).
2. Detail the requirements for Enterprise CRM Task Management:
   - Data model: Task title, description, priority (`urgent`, `high`, `normal`, `low`), due date, proof required boolean/notes, assignee (from real org staff), creator, status (`todo`, `in_progress`, `review`, `done`), `completed_at`, `approved_by`.
   - Dual view: Kanban board with drag-and-drop or interactive status move actions, and sortable/filterable Data Table view.
   - Lifecycle state machine:
     - `todo` -> `in_progress` (started by assignee)
     - `in_progress` -> `review` (requires submitting proof notes modal/drawer)
     - `review` -> `done` (approved by manager/owner, records completed_at and approved_by)
     - `review` -> `in_progress` (change requested / rejected by manager with revision notes)
   - Real-time/computed metrics cards: Total tasks, In Progress, Under Review, Completed, Completion Rate (%).
   - Assignee selector: populated with real organization members fetched from backend.
3. Test suite architecture:
   - Review existing test structure (`src/test/`), Vitest configuration, component test patterns with `@testing-library/react`.
   - Outline 4-tier E2E and unit test coverage strategy for Staff Provisioning & Task Management.
   - Outline mock handlers for `apiClient` to ensure tests run reliably and fast in Vitest.

## Output
Write your comprehensive investigation report to:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\spec_miner_survey_tasks_gen2\report.md`
and write your `handoff.md` in your directory.


## 2026-10-21T17:58:01Z

You are the Spec Miner & Task Management Architecture Explorer for the CredSmart Enterprise CRM project.

MANDATORY: Read c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (specifically timestamp 2026-10-21T17:42:42Z) before starting work.
Also read your task dispatch at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\spec_miner_survey_tasks_gen2\DISPATCH.md.

Your Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\spec_miner_survey_tasks_gen2
Investigate:
1. `src/pages/crm/Tasks.tsx`, `src/components/crm/*`, `src/services/crmApi.ts`.
2. Specifications for Enterprise Task Management:
   - Kanban board and Table views.
   - Task creation modal with real org staff assignee picker.
   - Lifecycle state transitions (`todo` -> `in_progress` -> `review` -> `done`).
   - Proof submission modal/drawer for moving to review.
   - Manager approval / revision request actions.
   - Real-time/computed KPI metrics cards.
3. E2E & Unit testing architecture:
   - Vitest test setup, existing CRM test files, mocks for `apiClient`, 4-tier test plan.

Write your full findings to:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\spec_miner_survey_tasks_gen2\report.md`
and write your `handoff.md` in your directory.
Send your completion message back to parent when finished.
