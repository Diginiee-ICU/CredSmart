# Test Infrastructure: CredSmart Enterprise CRM Staff Provisioning & Task Management

## Test Philosophy & Methodology
The test architecture for the CredSmart Enterprise CRM Staff Provisioning and Task Management system follows a strict 4-Tier requirement-driven, opaque-box testing methodology derived authoritatively from `ORIGINAL_REQUEST.md` (timestamp `2026-10-21T17:42:42Z`) and `PROJECT.md`.

- **Tier 1 — Feature Coverage (>=5 test cases per feature)**:
  - Staff Provisioning form validation and input sanitization (RFC 5322 email syntax, required fields, phone sanitization, store role validation).
  - Cryptographic auto-password generation entropy (length, character sets, randomness via `window.crypto.getRandomValues`).
  - Credentials confirmation modal rendering and 1-click clipboard / WhatsApp payload formatting.
  - Custom role creation dialog with direct staff assignment and in-memory roster hydration.
  - Task creation with title, description, priority, due date, proof requirements flag, and staff assignee.
  - Kanban board 4-column rendering (`todo`, `in_progress`, `review`, `done`).
  - Data Table view rendering with status badges, priority pills, and assignee avatars.
  - Proof notes submission dialog and strict validation on `in_progress` -> `review`.
  - Manager approval flow (`review` -> `done`) recording `completed_at` and `approved_by`.
  - Manager revision request flow (`review` -> `in_progress`) recording `review_feedback`.
  - Real-time KPI metrics calculation (Total, In Progress, Review, Completed, Completion Rate %).
- **Tier 2 — Boundary & Corner Cases (>=5 test cases per feature)**:
  - Empty or invalid email format handling.
  - Unicode, accented names, Devanagari script, and special characters in user names and task descriptions.
  - Zero tasks state (0% completion without division by zero or NaN).
  - 100+ tasks high volume metrics calculation and state transition stress.
  - Tasks without assignee ("Unassigned" fallback handling).
  - Past due date (overdue calculation) and same-day due date edge cases.
  - Re-submitting proof notes multiple times across revision loops.
  - Illegal state transition prevention (`todo` -> `done` directly when proof required, `done` -> `review`).
- **Tier 3 — Cross-Feature Combinations**:
  - Staff provisioning -> roster appearance -> role badge display -> task assignment -> lifecycle progression -> manager approval -> metrics update.
  - Dual concurrent task lifecycles with differing proof requirements.
- **Tier 4 — Real-World Application Scenarios**:
  - Multi-tenant company isolation: Tenant A provisions staff and assigns store roles without cross-tenant leakage to Tenant B.
  - Retail daily store operations: Opening float count, fresh produce expiry sweep, restock endcaps, and EOD settlement reconciliation.

---

## Test Architecture & Deliverables

```
src/test/
├── crmStaffProvisioning.test.ts      # Tier 1-4 tests for staff validation, entropy, credentials formatting, and roster hydration (29 tests)
├── crmTaskLifecycle.test.ts          # Tier 1-4 tests for task state machine, proof submission, manager approvals, and metrics (33 tests)
└── crmStaffTasksIntegration.test.tsx # Component integration tests for Tasks.tsx, Kanban/Table toggle, modals, and RBAC gating (12 tests)
```

### Coverage Matrix & Assertions
- **Staff Provisioning Suite (`crmStaffProvisioning.test.ts`)**: 29 tests | 75+ assertions
- **Task Lifecycle Suite (`crmTaskLifecycle.test.ts`)**: 33 tests | 85+ assertions
- **Tasks UI Integration Suite (`crmStaffTasksIntegration.test.tsx`)**: 12 tests | 35+ assertions
- **Total Suite**: **74 tests** | **195+ assertions** | **100% Pass Rate**

---

## Test Execution Commands

```bash
# Run all CRM Staff Provisioning and Task Lifecycle test suites:
cmd /c npx vitest run crmStaff crmTask

# Or run individual test suites:
cmd /c npx vitest run src/test/crmStaffProvisioning.test.ts
cmd /c npx vitest run src/test/crmTaskLifecycle.test.ts
cmd /c npx vitest run src/test/crmStaffTasksIntegration.test.tsx

# Full TypeScript compilation check (strict mode):
cmd /c npx tsc --noEmit
```

---

## Quality & Acceptance Thresholds
1. **Pass Rate**: 100% of tests must pass (0 failures, 0 skipped).
2. **Type Safety**: `tsc --noEmit` must exit with code 0 (zero compiler warnings or errors).
3. **No Facade Tests**: All assertions exercise genuine business logic, cryptographic entropy, and UI interaction states.
4. **Isolation**: Tests do not mutate shared global state and clean up `localStorage` before every test case.
