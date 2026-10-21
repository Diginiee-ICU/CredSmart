# Task: Milestone 3 — Full-Stack Enterprise Task Management

## Objectives
Implement the complete full-stack Enterprise Task Management page in `src/pages/crm/Tasks.tsx` connected to the backend API via `crmApi.ts`:

1. **Backend Integration & Real Assignee Loading**:
   - Replace the legacy prototype `INITIAL_TASKS` and standalone `localStorage` usage with live API calls to `crmApi.getCRMTasks(orgId)` on mount and refresh.
   - Maintain `localStorage` key `credsmart_crm_tasks_${orgId}` as an offline/transient cache fallback on network errors.
   - Fetch real organization staff members using `crmApi.getCRMStaff(orgId)` or `settingsApi.getMemberships(orgId)` to populate the assignee selection dropdown in `<CreateTaskDialog>`.
   - Store assignee as `assigned_to: staffMember.id` (or fallback to staff name/email).

2. **Task Creation (`<CreateTaskDialog>`)**:
   - Fields:
     - Title (required, min 3 chars)
     - Description (optional)
     - Priority: `urgent`, `high`, `normal`, `low`
     - Due Date: date picker input (`YYYY-MM-DD`)
     - Proof Required toggle: boolean checkbox ("Require photo or invoice proof notes on completion")
     - Assignee selector: dropdown listing real organization staff members with their store role and CRM role badges.
   - On submission: calls `crmApi.createCRMTask(payload)`.
   - On success: updates local tasks state immediately, shows success toast.

3. **Interactive Dual Views (Kanban & Table)**:
   - **Kanban Board**: 4 columns (`todo` / "To Do", `in_progress` / "In Progress", `review` / "Under Review", `done` / "Completed").
     - Shows column count pills.
     - Task cards render: Title, priority badge (`urgent` in rose, `high` in orange, `normal` in blue, `low` in slate), due date (with overdue highlight if past due and not done), assignee name and avatar initials, proof badge (`Requires Proof`), and contextual action buttons:
       - In `todo`: "Start Job" button (transitions to `in_progress`).
       - In `in_progress`: "Submit Proof" button (if proof required) or "Complete Task" (transitions to `review`).
       - In `review`:
         - For Managers/Super-Admins (`isSuperAdminOrOwner` or `canApproveTasks`):
           - "Approve" button (transitions to `done`, sets `completed_at` and `approved_by`).
           - "Request Revision" button (opens revision notes modal, moves back to `in_progress` with `review_feedback`).
         - Displays submitted `proof_notes` on the card.
       - In `done`: Completed checkmark, `completed_at` date, approver name.
   - **Table View**: Sortable and filterable data table using `CRMDataTable` or clean table structure with columns: Title, Priority, Status, Assignee, Due Date, Proof Required, Actions matching Kanban actions.

4. **Proof Submission Modal / Drawer**:
   - When an assignee clicks "Submit Proof" or completes a proof-required task:
     - Opens a dialog displaying task title and requiring `proof_notes` input (e.g. invoice number, photo upload reference, delivery confirmation notes).
     - Submitting calls `crmApi.transitionCRMTaskStatus(taskId, "review", { proof_notes })`.
     - Transitions status to `review`.

5. **Manager Revision Request Dialog**:
   - In `review`, manager clicks "Request Revision":
     - Opens dialog asking for `review_feedback` notes.
     - Submitting calls `crmApi.transitionCRMTaskStatus(taskId, "in_progress", { review_feedback })`.
     - Card in `in_progress` displays amber revision badge with feedback.

6. **Real-Time KPI Metrics Cards**:
   - Total Tasks: count of all tasks.
   - In Progress: count of `in_progress`.
   - Under Review: count of `review`.
   - Completed: count of `done`.
   - Completion Rate: `Math.round((done / total) * 100) || 0`%.
   - Overdue Tasks count: tasks where `due_date < today` and `status !== 'done'`.

7. **Zero Regression & Protected File Preservation**:
   - Create Invoice flows (`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`) must remain 100% untouched.
   - `cmd /c npx tsc --noEmit` must exit with 0 errors.
   - Vitest test suites (`src/test/crmTaskLifecycle.test.ts`, `src/test/crmStaffTasksIntegration.test.tsx`, `src/test/crmStaffProvisioning.test.ts`) must pass 100%.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your handoff report to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m3_tasks\handoff.md` and send a message back to parent when done.


## 2026-10-21T19:37:25Z
You are the Implementation Worker for Milestone 3: Full-Stack Enterprise Task Management for CredSmart Enterprise CRM.

MANDATORY: Read c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (specifically timestamp 2026-10-21T17:42:42Z) and c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md before starting work.
Also read your task dispatch at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m3_tasks\DISPATCH.md and the specification report at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\spec_miner_survey_tasks_gen2\report.md.

Your Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m3_tasks

You have exclusive write ownership of:
- `src/pages/crm/Tasks.tsx`
- Any helper components or test files needed for tasks (e.g. `src/test/crmTasksView.test.tsx` or similar if needed)

Tasks:
1. Connect `src/pages/crm/Tasks.tsx` to live backend:
   - Wire to `crmApi.getCRMTasks(orgId)` on mount and refresh, falling back to `localStorage` key `credsmart_crm_tasks_${orgId}` on network errors.
   - Fetch real organization staff members using `crmApi.getCRMStaff(orgId)` or `crmApi.getCRMStaffRoles(orgId)` to populate the assignee dropdown in `<CreateTaskDialog>`.
   - Store assignee as `assigned_to` with user id, name, and role.
2. In `<CreateTaskDialog>`:
   - Fields: Title (required, min 3 chars), Description (optional), Priority (`urgent`, `high`, `normal`, `low`), Due Date (`YYYY-MM-DD`), Proof Required toggle (`requires_proof`), and Assignee selector dropdown.
   - On submission: calls `crmApi.createCRMTask(payload)`.
   - On success: updates local tasks state immediately and shows success toast.
3. Interactive Dual Views (Kanban & Table):
   - **Kanban Board**: 4 columns (`todo` / "To Do", `in_progress` / "In Progress", `review` / "Under Review", `done` / "Completed") with column count pills.
   - Cards display: Title, priority badge, due date, assignee name + avatar, proof badge (`Requires Proof`), and contextual action buttons:
     - In `todo`: "Start Job" button (transitions to `in_progress`).
     - In `in_progress`: "Submit Proof" button (if proof required) or "Complete Task" (transitions to `review`).
     - In `review`:
       - For Managers/Super-Admins (`isSuperAdminOrOwner` or `canApproveTasks`):
         - "Approve" button (transitions to `done`, setting `completed_at` and `approved_by`).
         - "Request Revision" button (opens revision notes modal, moves back to `in_progress` with `review_feedback`).
       - Displays submitted `proof_notes` on card.
     - In `done`: Completed checkmark, `completed_at` timestamp, approver name.
   - **Table View**: Sortable and filterable table with matching action buttons and columns: Task, Priority, Status, Assignee, Due Date, Proof Required, Actions.
4. Proof Submission Modal / Drawer:
   - Opens when clicking "Submit Proof". Requires non-empty `proof_notes`.
   - Calls `crmApi.transitionCRMTaskStatus(taskId, "review", { proof_notes })`.
5. Manager Revision Request Dialog:
   - In `review`, manager clicks "Request Revision". Requires non-empty `review_feedback`.
   - Calls `crmApi.transitionCRMTaskStatus(taskId, "in_progress", { review_feedback })`.
   - Displays amber revision badge/callout on card in `in_progress`.
6. Real-Time KPI Metrics Cards:
   - Total Tasks, In Progress, Under Review, Completed, Completion Rate % (`Math.round((done / total) * 100) || 0`), and Overdue count.
7. Verification:
   - Run `cmd /c npx vitest run crmTask src/test/crmStaffTasksIntegration.test.tsx` (all must pass 100%).
   - Run `cmd /c npx tsc --noEmit` (must exit code 0 with zero errors).
   - Verify protected invoice files (`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`) remain 100% untouched.
