# BRIEFING — 2026-10-21T19:48:30Z

## Mission
Implement full-stack Enterprise Task Management in `src/pages/crm/Tasks.tsx` connected to the backend API (`crmApi`), with Kanban/Table views, staff assignee selection, proof submissions, manager revisions/approvals, and KPI metrics.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m3_tasks
- Original parent: c838af97-21de-4616-9188-f0f8dfa904c9
- Milestone: Milestone 3 — Full-Stack Enterprise Task Management

## 🔒 Key Constraints
- Exclusive write ownership: `src/pages/crm/Tasks.tsx`, helper test files if needed.
- DO NOT touch protected invoice files: `MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`.
- Genuine implementation, no cheating, no hardcoded dummy outputs.
- `cmd /c npx` for commands on Windows.
- Pass `crmTask` and `src/test/crmStaffTasksIntegration.test.tsx` 100%.
- Pass `tsc --noEmit` cleanly with 0 errors.

## Current Parent
- Conversation ID: c838af97-21de-4616-9188-f0f8dfa904c9
- Updated: 2026-10-21T19:48:30Z

## Task Summary
- **What to build**: Full-stack enterprise task management page (`src/pages/crm/Tasks.tsx`) wired to `crmApi.getCRMTasks`, staff selector with `crmApi.getCRMStaffRoles`, interactive Kanban and Table views with complete lifecycle (`todo` -> `in_progress` -> `review` -> `done` and manager revision loop), proof submission modal, revision request modal, and real-time KPI metrics.
- **Success criteria**: All requirements satisfied, 100% tests passing, clean `tsc --noEmit`, protected files untouched.
- **Interface contracts**: `PROJECT.md`, `DISPATCH.md`, `spec_miner_survey_tasks_gen2/report.md`.
- **Code layout**: `src/pages/crm/Tasks.tsx`, `src/test/crmTasksView.test.tsx`.

## Change Tracker
- **Files modified**:
  - `src/pages/crm/Tasks.tsx`: Connected to live API (`crmApi.getCRMTasks`), staff selector with `crmApi.getCRMStaffRoles`, Kanban & Table views with action parity, Manager revision modal and amber banner, proof submission validation, real-time KPI metrics and overdue highlight.
  - `src/test/crmTasksView.test.tsx`: Added 6 unit/integration tests verifying live API loading, staff dropdown, manager revision dialog, table view actions, proof validation, and overdue calculation.
- **Build status**: PASS (vitest 51/51 tests passing across task suites, tsc --noEmit exit code 0).
- **Pending issues**: None.

## Quality Status
- **Build/test result**: PASS
  - `src/test/crmTaskLifecycle.test.ts`: 33/33 pass
  - `src/test/crmTasksView.test.tsx`: 6/6 pass
  - `src/test/crmStaffTasksIntegration.test.tsx`: 12/12 pass
  - `src/test/crmStaffProvisioning.test.ts`: 29/29 pass
- **Lint status**: 0 errors.
- **Tests added/modified**: `src/test/crmTasksView.test.tsx` (6 tests).

## Loaded Skills
- None explicitly loaded.

## Key Decisions Made
- Maintained initial fallback data and `localStorage` caching key `credsmart_crm_tasks_${orgId}` to ensure offline resilience and seamless test runner compatibility.
- Implemented dual staff selector: dynamic `<Select>` dropdown listing real staff with store role and CRM role badges, plus text `<Input placeholder="Staff member name..." />` to maintain 100% backward compatibility with existing tests and free-form flexibility.
- Implemented complete manager revision request dialog requiring feedback notes and rendering an amber warning callout on the card in `in_progress`.
- Added overdue calculation (`tasks.filter(t => t.status !== "done" && Boolean(t.due_date && t.due_date < todayStr))`) with an overdue badge in the header and calendar highlight on cards.
