# DISPATCH — Implementation Worker (Invoice Redesign & PDF Parity)

**Working Directory**: c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\worker_invoice_redesign
**Role**: Implementation Worker
**Original Request**: c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (Section 2026-10-13T20:00:31Z)
**Project Plan**: c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_invoice\PROJECT.md
**Visual Spec Report**: c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\spec_miner_visual\spec_report.md
**Component Architecture Report**: c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\explorer_components\components_report.md
**PDF Engine Report**: c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\explorer_pdf\pdf_report.md
**E2E Test Suites**:
- `src/test/unifiedInvoiceRenderer.test.tsx`
- `src/test/downloadExactInvoice.test.ts`
**Target Visual Reference**: `Correction/New folder/New Invoice.jpeg`
**Legacy Layout Reference**: `Correction/New folder/Old Invoice.jpeg`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## File Ownership
- Primary: `src/components/invoices/UnifiedInvoiceRenderer.tsx`
- Secondary: `src/utils/downloadExactInvoice.ts`
- Optional styling: `src/index.css` (for print media queries if needed)

## Detailed Implementation Requirements

### 1. `src/components/invoices/UnifiedInvoiceRenderer.tsx`
Replace the legacy boxed layout (lines 608–1153) with the modern unboxed enterprise layout matching `New Invoice.jpeg`:
1. **Unboxed Stationery Canvas**: Remove outer enclosing page border and rounded shadows. Render as clean white stationery with `px-8 pt-8 pb-6`. Add `data-print-container="invoice"` attribute.
2. **Modern Unboxed Header**:
   - Left: Unboxed bold `TAX INVOICE` in navy (`#0c324e`, 22px–24px font, font-black/bold, uppercase). For non-sales documents, adapt title accordingly (e.g., `ESTIMATE / QUOTATION`, `PROFORMA INVOICE`, `CREDIT NOTE`, `DEBIT NOTE`, `PURCHASE INVOICE`).
   - Right: Stacked right-aligned key-value blocks for `Invoice No.` (or document number), `Invoice Date`, and `Due Date`.
   - Accent Divider: Full-width 2px solid cyan/blue horizontal line (`#0ea5e9` or `#0284c7`) directly beneath header.
3. **Dual Equal-Width Party Pods (FROM & BILL TO)**:
   - Side-by-side 2-column grid (`grid grid-cols-2`, 50%/50% width) enclosed in a border (`border border-slate-200`) with a central vertical divider.
   - Header ribbons with light-blue background (`bg-[#e0f2fe]` or `bg-[#e8f4fd]`) and bold cyan text (`text-[#0284c7]` / `text-[#0369a1]`):
     - Left: `FROM`
     - Right: `BILL TO`
   - Content:
     - Left (Seller): Organization name (bold), phone, email, full address, GSTIN, PAN.
     - Right (Buyer): Party/Customer name (bold), phone, billing address, GSTIN, State.
   - Bottom Sub-Compartments: Equal-height horizontal sub-row:
     - Left: `Place of Supply: <State>`
     - Right: `Customer: <Customer Name>`
4. **Items Table**:
   - Section heading: Uppercase `ITEM DETAILS` in cyan (`#0284c7` / `#0ea5e9`) above the table.
   - Header row: Solid dark navy (`bg-[#0c324e]`) with crisp white typography (`text-white`) with columns:
     - `S.No.` (w-[6%], center/left)
     - `Description` (w-[48%], left)
     - `HSN` (w-[12%], left)
     - `Qty` (w-[10%], right/center)
     - `Rate` (w-[12%], right)
     - `Amount` (w-[12%], right)
   - Body rows: Clean borders, zebra or white rows, supporting dual units (`formatItemQuantityDisplay`), item notes, rates, and amounts.
5. **Right-Aligned Financial Summary**:
   - Right-aligned summary container (`w-[320px]`):
     - `Taxable value / Rate` (subtotal)
     - GST tax lines (`GST (5%)` or CGST/SGST/IGST breakdown)
     - Round off (if present)
   - Grand Total Highlight Pill: Signature rounded soft-blue container (`bg-[#e0f2fe]` or `bg-[#e8f4fd]`, `rounded-md`, `px-3 py-1.5`) displaying `Invoice total (rounded)` and the total formatted in `#0c324e`.
   - Payment tracking: `Amount received (Cash)` and conditional `Balance amount` (if balance due > 0).
6. **Amount in Words**:
   - Clean single unboxed line `Amount in words: INR ... Only` directly below or alongside totals without enclosing box.
7. **Dual Bottom Cards**:
   - Side-by-side bordered cards with light-blue ribbons (`bg-[#e0f2fe]` or `bg-[#e8f4fd]`):
     - Left: `BANK ACCOUNT DETAILS` (Bank Name, Account Number, IFSC, Account Holder, Branch).
     - Right: `AUTHORISED SIGNATORY` (with digital signature graphic if present and signing line for seller).
8. **Minimalist Footer**:
   - Single clean line: `Thank you for your business.`
   - Remove legacy cluttered URLs, browser print footers, and bulky compliance banners.
9. **Backward Compatibility & Preserved Exports**:
   - Preserve `export function formatItemQuantityDisplay` with exact signature and logic.
   - Preserve thermal layouts (`layout === 'thermal'` or `'thermal_58'`).
   - Preserve all `UniversalDocType` handling.

### 2. `src/utils/downloadExactInvoice.ts`
1. Ensure the off-screen capture container has `width: 794px; min-height: 1123px`.
2. Ensure `ExactInvoicePayload` supports `bankDetails`. When rendering `UnifiedInvoiceRenderer` inside the off-screen root, pass `bankDetails` so that bank account information renders on exported PDFs.
3. In scaling calculation: apply a `0.5mm` tolerance threshold so that when `imgHeightMm <= 297.5mm`, it uses full 100% scale without subpixel downscale distortion.
4. Clean up off-screen containers reliably in `finally`.

## Verification Instructions
1. Run TypeScript compiler check:
   `npx tsc --noEmit`
2. Run Vitest test suites:
   `npx vitest run src/test/unifiedInvoiceRenderer.test.tsx src/test/downloadExactInvoice.test.ts`
3. Run existing tests to ensure zero regressions:
   `npx vitest run src/test/unitConversionBill.test.ts`
4. Deliver `handoff.md` with full command outputs, diff summary, and verification evidence.


## 2026-10-13T22:00:26Z
You are Implementation Worker for CredSmart Master GST Invoice Redesign.
Your working directory is: c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\worker_invoice_redesign
Read your dispatch file at c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\worker_invoice_redesign\DISPATCH.md
Read ORIGINAL_REQUEST.md at c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (Section 2026-10-13T20:00:31Z).
Read PROJECT.md at c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_invoice\PROJECT.md
Read spec_report.md at c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\spec_miner_visual\spec_report.md
Read components_report.md at c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\explorer_components\components_report.md
Read pdf_report.md at c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\explorer_pdf\pdf_report.md
