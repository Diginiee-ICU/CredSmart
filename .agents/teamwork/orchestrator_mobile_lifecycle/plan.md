# Implementation Plan — Mobile Billing Lifecycle Actions

## Objective
Implement R1-R4 for mobile billing in CredSmart:
1. In-place update lifecycle on re-edit (prevent duplicate invoices).
2. Mobile "Save & New" engine & sequence reset (INV-139 → INV-140, form reset, stay on editor).
3. Safe invoice deletion with confirmation bottom sheet / alert dialog.
4. Header More menu (3-dots) with WhatsApp direct sharing, Duplicate bill, Thermal/PDF download, and Void invoice.
5. Comprehensive unit/E2E test suite with 0 tsc errors, 100% test pass rate, and zero desktop regressions.

---

## Phase 0: Survey & Technical Investigation (Parallel Explorers)
- **Explorer 1**: `SalesInvoiceModal.tsx` state architecture, `saveAndNew` conditional logic (line 1163), `handleSave` document ID preservation, `editingDoc` transitions, and sequence incrementation.
- **Explorer 2**: `MobileInvoiceSuccessView.tsx` header components, trash confirmation dialog/sheet, more menu options, WhatsApp message formatting, and document action props.
- **Explorer 3**: Test suite architecture in `src/test/MobileInvoiceSuccessView*.test.tsx`, mock definitions for `documentsService`, and test strategies for R1-R4.

## Phase 1: Milestone 1 — In-Place Update Lifecycle on Re-Edit (R1)
- Persist `saved.id` across edit transitions (`activeSavedDocId` or updating `editingDoc` in `SalesInvoiceModal.tsx`).
- Ensure `handleSave` passes the existing document ID so `documentsService.saveDocument` executes an update rather than an insert.
- Toast feedback: "Invoice #[number] updated successfully!".
- Gate: Reviewer + Challenger + Auditor verification.

## Phase 2: Milestone 2 — Mobile "Save & New" Engine & Sequence Reset (R2)
- Refactor the conditional block at `SalesInvoiceModal.tsx:1163` so `saveAndNew` triggers sequence reset on mobile instead of unconditionally opening success view.
- Clear party selection, reset line items to a single blank row, reset payment amounts.
- Increment sequence number (e.g., `INV-139` → `INV-140`).
- Display toast: "Invoice #[number] created! Ready for next bill." and remain on `MobileCreateInvoice`.
- Gate: Reviewer + Challenger + Auditor verification.

## Phase 3: Milestone 3 — Safe Invoice Deletion with Confirmation (R3)
- Wire `Trash2` icon in `MobileInvoiceSuccessView.tsx` header to open confirmation bottom sheet / alert dialog: "Delete this invoice? This action cannot be undone."
- On confirmation, invoke `documentsService.deleteDocument(invoice.id)`.
- Reset active invoice state (`setMobileSuccessInvoice(null)`), close modal, and display toast: "Invoice #[number] deleted".
- Gate: Reviewer + Challenger + Auditor verification.

## Phase 4: Milestone 4 — Header More Menu & WhatsApp Direct Sharing (R4)
- Wire `MoreVertical` button on `MobileInvoiceSuccessView.tsx` to open touch-friendly bottom sheet / dropdown menu.
- Implement options:
  - Duplicate / Copy Bill (loads invoice items into new bill with next sequence number)
  - Share via WhatsApp (`https://wa.me/?text=...` with formatted summary)
  - Download Thermal Receipt / PDF
  - Cancel / Void Invoice (marks status as cancelled)
- Gate: Reviewer + Challenger + Auditor verification.

## Phase 5: Milestone 5 — Full Test Suite, Zero Compiler Errors & Regression Hardening
- Worker creates/updates comprehensive tests in `src/test/MobileInvoiceSuccessView.test.tsx` and related test files covering all 4 requirements.
- Worker runs `npx tsc --noEmit` to verify 0 TypeScript compiler errors.
- Worker runs Vitest across all affected test suites.
- Reviewer, Challenger, and Auditor verification.

## Phase 6: Orchestrator Handoff & Sentinel Notification
- Synthesize all results, write `handoff.md`, and notify parent Sentinel.
