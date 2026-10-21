# Orchestrator Soft Handoff: Gen 2 -> Gen 3

## Target
Successor Project Orchestrator (Generation 3)

## Milestone State
| Milestone | Name | Status | Summary |
|-----------|------|--------|---------|
| M0 | Survey & E2E Test Suite | DONE | 74/74 E2E tests passing, `TEST_INFRA.md` & `TEST_READY.md` published at root |
| M1 | PostgreSQL Schema & Express Backend | DONE | Migration `20261021180000_create_crm_staff_tasks.sql`, `fix_db.sql` byte parity, atomic provisioning, full tasks CRUD, Gate PASSED |
| M2 | Staff User Provisioning & Instant Role UI | GATING (Remediation Ready) | `RoleManagement.tsx` modals & `crmStaffUtils.ts` complete. Reviewer 2 requested minor fixes (test timeout in `crmStaffProvisioningUI.test.tsx` & email regex in `crmStaffUtils.ts`) |
| M3 | Full-Stack Enterprise Task Management | PLANNED | `Tasks.tsx` Kanban, Table, state machine (`todo` -> `in_progress` -> `review` -> `done`), proof submission, manager approvals, metrics |
| M4 | Final E2E Verification & Hardening | PLANNED | Full test suite pass, `tsc --noEmit` exits 0, Forensic Victory Audit CLEAN |

## Active Subagents
None currently running. All 16 subagents spawned by Gen 2 have completed and delivered their handoffs.

## Pending Decisions & Immediate Action for Gen 3
1. **Milestone 2 Remediation**:
   - In `src/test/crmStaffProvisioningUI.test.tsx`: add test timeout `, 15000)` to async tests (specifically M2.UI.3 and M2.UI.4) so `cmd /c npx vitest run crmStaff` passes with 0 failures under default Vitest execution.
   - In `src/utils/crmStaffUtils.ts`: update email validation regex in `validateStaffProvisioningInput` to ensure local part doesn't end in dot and TLD is at least 2 chars (`/^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/`).
   - In `src/pages/crm/RoleManagement.tsx`: escape regex special characters or use `.toLowerCase().includes(...)` in Section 3 staff search filter.
   - Verify `cmd /c npx vitest run crmStaff` and `cmd /c npx tsc --noEmit`.
   - Update `GATE_STATUS.md` and mark Milestone 2 as DONE in `PROJECT.md`.
2. **Milestone 3 Execution**:
   - Wire `src/pages/crm/Tasks.tsx` to `crmApi.getCRMTasks(orgId)` (with fallback to `localStorage` for offline support).
   - Populate assignee dropdown with real organization members fetched from `crmApi.getCRMStaff(orgId)`.
   - Implement interactive lifecycle transitions:
     - `todo` -> `in_progress` ("Start Job")
     - `in_progress` -> `review` (opens Proof Submission dialog requiring proof notes)
     - `review` -> `done` (Manager Approval action setting `completed_at` and `approved_by`)
     - `review` -> `in_progress` (Manager Revision Request dialog capturing revision notes)
   - Real-time KPI metrics calculation: Total, In Progress, Review, Completed, Completion Rate (%).
   - Run Milestone 3 Gate (Worker -> Reviewers -> Challengers -> Auditor).
3. **Milestone 4 Execution**:
   - Run full regression suites (`crmStaff`, `crmTask`, `crmBackendApiM1`, `fixDbSchema`).
   - Run `cmd /c npx tsc --noEmit` ensuring 0 TypeScript errors across the repository.
   - Run final Forensic Victory Audit.
   - Send final completion report back to parent (`84962645-2d55-4807-a07a-b9ed1619c874`).

## Key Artifacts
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md` — Global architecture, feature inventory, milestones, contracts
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\TEST_READY.md` — E2E test suite runner & pass verification
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_tasks_gen2\GATE_STATUS.md` — Gate verdicts
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_tasks_gen2\progress.md` — Workflow progress
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_tasks_gen2\BRIEFING.md` — Working memory
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` — Authoritative requirements
