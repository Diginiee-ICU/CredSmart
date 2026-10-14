# Master Plan: Mobile Invoice Success Screen Edit Triggers

## Objective
Add prominent, touch-friendly Edit triggers to the Mobile Invoice Success screen (`MobileInvoiceSuccessView.tsx`) in CredSmart:
1. Dedicated circular `Edit` action button in the action row alongside `Print`, `Download`, `Share`, and `E-Way Bill` (`w-12 h-12 rounded-full border-2 border-indigo-200 bg-indigo-50/60`, `Edit2` pen icon, "Edit" label below, executes `onEdit`).
2. Dual-action sticky footer refactored from single button into side-by-side flex row:
   - Left: `Edit Bill` (`bg-indigo-50 border border-indigo-200 text-indigo-700` with `Edit2` icon, triggers `onEdit`).
   - Right: `Done` (`bg-indigo-600 text-white`, triggers `onClose`).
   - Safe area inset padding (`pb-[max(1rem,env(safe-area-inset-bottom))]`).
3. Seamless state transition back to `MobileCreateInvoice.tsx` via `setMobileSuccessInvoice(null)` in `SalesInvoiceModal.tsx`, preserving all entered line items, party details, discounts, and totals without data loss.
4. Comprehensive test verification (`tsc --noEmit`, all 219+ Vitest tests passing, new unit tests for `MobileInvoiceSuccessView`).

## Phase Breakdown

### Phase 0: Survey & Exploration
- Spawn 3 parallel Explorers:
  - Explorer 1: Inspect `MobileInvoiceSuccessView.tsx` props, action row buttons, footer structure, styling, imports, icons.
  - Explorer 2: Inspect `SalesInvoiceModal.tsx` and `MobileCreateInvoice.tsx` state management for `mobileSuccessInvoice`, invoice editing state, handlers, line items, and data preservation.
  - Explorer 3: Inspect existing Vitest suites for mobile invoices, test utilities, setup, and mocking patterns to plan the new unit test file.
- Synthesize reports into `PROJECT.md` (Feature Inventory, Architecture, Milestones, Interface Contracts).

### Phase 1: Implementation
- Spawn Worker armed with domain skills (`mobile-invoice-generate-bill-redesign`, `mobile-invoice-redesign`):
  - Update `MobileInvoiceSuccessView.tsx` props interface (`onEdit?: () => void`).
  - Add circular Edit button in action row.
  - Refactor sticky bottom bar to side-by-side flex row (`Edit Bill` + `Done`).
  - Wire `onEdit` in `SalesInvoiceModal.tsx` to `setMobileSuccessInvoice(null)`.
  - Ensure zero regressions to desktop view or data persistence.
  - Run type checks (`tsc --noEmit`).

### Phase 2: Testing & Verification
- Spawn Test Writer (`teamwork_preview_test_writer`) to create comprehensive unit tests for `MobileInvoiceSuccessView`:
  - Verify circular Edit button rendering and click handler `onEdit`.
  - Verify dual footer buttons `Edit Bill` and `Done` rendering and click handlers.
  - Verify safe-area and responsive layout classes.
  - Verify all 219+ Vitest tests pass.

### Phase 3: Review, Adversarial Challenge, and Forensic Audit
- Spawn Reviewers (2) to inspect code quality, edge cases, accessibility, styling conformance.
- Spawn Challengers (2) to test state transitions and edge cases (e.g., rapid clicks, missing onEdit callback).
- Spawn Forensic Auditor (`teamwork_preview_auditor`) to verify authentic implementation without shortcuts or cheats.
- Gate verification and synthesis.

### Phase 4: Final Reporting & Handoff
- Generate final completion report and send victory claim to parent sentinel.
