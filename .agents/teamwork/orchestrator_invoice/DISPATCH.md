# DISPATCH to Project Orchestrator

**Assigned Agent**: teamwork_preview_orchestrator
**Working Directory**: c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_invoice
**Project Root**: c:\Users\bishn\Documents\GitHub\CredSmart
**Original Request**: c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (Section 2026-10-13T20:00:31Z)

## Objective
Redesign the master GST invoice layout in CredSmart to match the new enterprise visual specification in `Correction/New folder/New Invoice.jpeg`, replacing the legacy boxed format from `Correction/New folder/Old Invoice.jpeg` across web invoice previews and single-page PDF generation.

## Reference Material
- Target design reference: `c:\Users\bishn\Documents\GitHub\CredSmart\Correction\New folder\New Invoice.jpeg`
- Legacy layout reference: `c:\Users\bishn\Documents\GitHub\CredSmart\Correction\New folder\Old Invoice.jpeg`

## Requirements
### R1. Enterprise Invoice Visual Redesign
Redesign the master invoice layout to achieve pixel-perfect fidelity with `New Invoice.jpeg`:
1. Clean unboxed header with large bold `TAX INVOICE` on the left and stacked right-aligned metadata (`Invoice No.`, `Invoice Date`, `Due Date`).
2. Full-width cyan/blue horizontal accent divider line beneath header.
3. Dual equal-width side-by-side pods for `FROM` (Seller) and `BILL TO` (Buyer) with light-blue header ribbons and complete address/tax details.
4. Uppercase `ITEM DETAILS` section heading above the table.
5. Solid dark navy table header (`bg-[#0c324e]`) with white typography (`S.No.`, `Description`, `HSN`, `Qty`, `Rate`, `Amount`).
6. Right-aligned financial summary breakdown with taxable value, GST (5%), soft blue rounded total highlight pill, and received/balance amount.
7. Clean unboxed `Amount in words` line.
8. Dual side-by-side bordered cards for `BANK ACCOUNT DETAILS` and `AUTHORISED SIGNATORY` with light-blue header ribbons.
9. Minimalist footer note: `Thank you for your business.`

### R2. PDF Export & Print Engine Parity
Ensure the off-screen capture and PDF download pipeline in `downloadExactInvoice.ts` renders the redesigned invoice template with 100% fidelity, maintaining exact single-page A4 aspect ratio and sharp vector typography without clipping or distortion.

### R3. Full System Compatibility & Zero Regressions
Preserve complete backward compatibility for all document types (`sales_invoice`, `pos_invoice`, `purchase_invoice`, `quotation`, `proforma_invoice`, `credit_note`, `debit_note`), multi-unit calculations, and custom company settings without introducing regressions.

## Acceptance Criteria
### Visual & Structural Fidelity
- [ ] Header renders large bold TAX INVOICE title with cleanly stacked metadata on the right and cyan accent line.
- [ ] Dual FROM and BILL TO pods render side-by-side with light-blue ribbon headers and full contact/tax info.
- [ ] Items table features ITEM DETAILS title and solid dark navy header row with white text.
- [ ] Totals section displays right-aligned breakdown with soft blue rounded total pill and received amount.
- [ ] Amount in words renders clearly below summary totals.
- [ ] Bank Account Details and Authorised Signatory render as two side-by-side bordered cards with light-blue header ribbons.
- [ ] Footer renders "Thank you for your business."

### PDF & Print Rendering
- [ ] Downloaded PDF from `downloadExactInvoicePdf` fits exactly onto a single A4 page with clean margins and zero visual clipping.

### Code Quality & Production Standards
- [ ] Zero TypeScript compiler errors across all modified components (`tsc --noEmit`).
- [ ] Existing invoice calculations and test suites pass with 100% success rate.


## 2026-10-13T20:02:49Z
Sender: 83781f15-58a9-4d25-8298-8e4f475957da
You are the Project Orchestrator for CredSmart Master GST Invoice Redesign.
Your working directory is: c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_invoice
The project root is: c:\Users\bishn\Documents\GitHub\CredSmart
Read your dispatch file at c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_invoice\DISPATCH.md and the user request at c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (Section 2026-10-13T20:00:31Z).
Follow all standard orchestrator protocols: initialize your BRIEFING.md, build your plan, decompose tasks, dispatch specialist subagents into their own isolated directories under .agents/teamwork/, maintain progress in progress.md, and ensure all visual fidelity, PDF single-page rendering, TypeScript checks, and test suite requirements are strictly satisfied. When complete, send a final victory report back to the Sentinel.


## 2026-10-13T21:58:50Z
Sender: 83781f15-58a9-4d25-8298-8e4f475957da
SYSTEM RESTART RESUMPTION DIRECTIVE:
The system underwent a server restart. All subagents and background tasks were stopped.
You are the Project Orchestrator (`9233a9f6-554b-4b0a-8c55-0f1b3272d0ec`) for the Master GST Invoice Redesign in `c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_invoice`.

Your checkpoint state before restart:
- Phase 0: Survey & Architecture Discovery complete (`PROJECT.md` and `TEST_INFRA.md` published).
- Milestone 1: E2E Test Suite Creation in progress by `test_writer_m1`. Both `src/test/unifiedInvoiceRenderer.test.tsx` and `src/test/downloadExactInvoice.test.ts` have been created on disk.

ACTION REQUIRED:
1. Revive `test_writer_m1` if needed or inspect the test suite status and verify test execution via a worker.
2. Advance to Milestone 2: Invoice Component Visual Redesign in `UnifiedInvoiceRenderer.tsx`.
3. Proceed with Milestone 3 (PDF engine parity in `downloadExactInvoice.ts`), Milestone 4 (multi-document types), and Milestone 5 (100% test pass).
4. Resume your heartbeat cron and continue standard orchestration until all acceptance criteria are met and you deliver your final victory report.
