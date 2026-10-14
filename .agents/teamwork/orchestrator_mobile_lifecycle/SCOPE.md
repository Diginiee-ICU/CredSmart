# Scope: CredSmart Mobile Billing Lifecycle Actions

## Architecture
- `src/components/sales/SalesInvoiceModal.tsx`: Top-level modal container managing document state, desktop vs mobile rendering (`MobileCreateInvoice` vs desktop views), save handlers (`handleSave`), `saveAndNew` branching, `setMobileSuccessInvoice`, document editing state (`editingDoc` / `activeSavedDocId`), sequence numbering (`invoiceNumber`), and deletion logic.
- `src/components/sales/mobile/MobileInvoiceSuccessView.tsx`: Full-screen mobile success view displayed after bill generation. Contains header with back arrow, title, trash icon (R3), and 3-dots more menu (R4); quick actions row; summary cards; dual-action sticky footer ("Edit Bill" and "Done"); and modals/sheets for Delete Confirmation, WhatsApp Share, Duplicate Bill, Void Invoice.
- `src/components/sales/mobile/MobileCreateInvoice.tsx`: Mobile form view where user inputs party, items, payments, etc.
- `src/services/documentsService.ts`: Document persistence service handling `saveDocument`, `updateDocument` (or `saveDocument` with existing ID for in-place updates), and `deleteDocument(id)`.
- Test Suites: `src/test/MobileInvoiceSuccessView*.test.tsx`, `src/test/SalesInvoiceModal*.test.tsx` (or new targeted unit tests).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | In-Place Update on Re-Edit | When returning via Edit from MobileInvoiceSuccessView, preserve invoice id and execute in-place update on re-save without creating duplicate records | M1 | R1 |
| 2 | Mobile Save & New Sequence Reset | Fix conditional block in SalesInvoiceModal:1163 so saveAndNew on mobile saves invoice, resets form, bumps sequence number, shows toast, remains on MobileCreateInvoice | M2 | R2 |
| 3 | Safe Invoice Deletion | Header Trash2 icon opens confirmation bottom sheet/dialog, calls documentsService.deleteDocument, resets state, closes modal, shows toast | M3 | R3 |
| 4 | Header More Menu & WhatsApp Share | Header 3-dots opens action menu with Duplicate/Copy Bill, WhatsApp Share (wa.me/?text=...), Download Thermal/PDF, Cancel/Void | M4 | R4 |
| 5 | Comprehensive Testing & Regression Defense | Zero tsc errors, 100% test pass across MobileInvoiceSuccessView and related suites, zero desktop regressions | M5 | Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 0 | Survey & Technical Investigation | Deep dive into SalesInvoiceModal, MobileInvoiceSuccessView, MobileCreateInvoice, and test suites | none | DONE |
| 1 | Core Billing Lifecycle Engine (R1 & R2) | SalesInvoiceModal state preservation (`activeSavedDocId`), in-place update in `documentsService.saveDocument`, Save & New conditional fix (line 1163), sequence bump (`INV-139` → `INV-140`), form reset, and toasts | M0 | DONE |
| 2 | Mobile Success Actions & Modals (R3 & R4) | MobileInvoiceSuccessView header actions: safe deletion confirmation dialog/bottom sheet, `documentsService.deleteDocument`, MoreVertical action sheet (Duplicate Bill, WhatsApp direct share, Thermal/PDF download, Void invoice) | M1 | DONE |
| 3 | Comprehensive Test Suite & Verification | Add unit tests for R1-R4, verify 0 tsc errors, 100% test pass across all suites, zero desktop regressions | M1, M2 | DONE |

## Interface Contracts
### SalesInvoiceModal ↔ MobileInvoiceSuccessView
- `onEdit`: `() => void` — switches mobile view back to MobileCreateInvoice, retaining active document state & ID.
- `onDelete`: `(docId: string) => Promise<void>` — deletes document and resets modal state.
- `onDuplicate`: `(invoice: any) => void` — loads invoice contents as new draft with bumped sequence number.
- `onClose`: `() => void` — closes invoice modal and returns to sales list.
- `onVoid`: `(docId: string) => Promise<void>` — marks invoice status as cancelled/void.
