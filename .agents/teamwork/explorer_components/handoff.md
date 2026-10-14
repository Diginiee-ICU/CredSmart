# Handoff Report — Component Architect Explorer

**Author**: Component Architect Explorer  
**Directory**: `c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\explorer_components`  
**Target Milestone**: Master GST Invoice Redesign (Section 2026-10-13T20:00:31Z)  
**Parent Agent**: `9233a9f6-554b-4b0a-8c55-0f1b3272d0ec`  

---

## 1. Observation

1. **Master Invoice Renderer**:
   - `c:\Users\bishn\Documents\GitHub\CredSmart\src\components\invoices\UnifiedInvoiceRenderer.tsx` (1159 lines, 56,835 bytes) is the sole invoice template used across all modals, pages, settings, and PDF downloads.
   - Lines 436–605 render thermal POS receipt layouts (`layout === "80mm" || layout === "58mm"`).
   - Lines 608–1153 render the standard A4 invoice format. The existing code uses the legacy boxed layout:
     ```tsx
     // Line 624-644: Legacy boxed header
     <div className="border border-slate-300 bg-white">
       <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-300" style={{ backgroundColor: bgLightHex }}>
         <h1 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900">{docTitle}</h1>
     ```
     This matches `Correction/New folder/Old Invoice.jpeg` directly.

2. **Target Visual Specification**:
   - `Correction/New folder/New Invoice.jpeg` specifies an enterprise unboxed layout:
     - Unboxed header: Left large bold `TAX INVOICE` in navy; Right stacked right-aligned metadata (`Invoice No.`, `Invoice Date`, `Due Date`).
     - Full-width horizontal cyan accent line (`#0ea5e9` / `#38bdf8`) under header.
     - Dual side-by-side equal-width pods (`FROM` and `BILL TO`) with light-blue header ribbons (`bg-[#e0f2fe]`), full contact details, and bottom strips (`Place of Supply` and `Customer`).
     - Section title: `ITEM DETAILS` in bold uppercase above items table.
     - Items table header: Solid dark navy (`bg-[#0c324e]`) with pure white typography (`S.No.`, `Description`, `HSN`, `Qty`, `Rate`, `Amount`).
     - Financial summary: Stacked right-aligned breakdown with `Taxable value / Rate`, `GST (5%)`, soft blue rounded pill for `Invoice total (rounded)`, and `Amount received (Cash)`.
     - Amount in words: Clean unboxed `Amount in words: INR ... Only`.
     - Dual bottom cards: Equal-width bordered cards for `BANK ACCOUNT DETAILS` and `AUTHORISED SIGNATORY` with light-blue ribbons.
     - Minimalist footer: `Thank you for your business.`.

3. **PDF Export Engine**:
   - `c:\Users\bishn\Documents\GitHub\CredSmart\src\utils\downloadExactInvoice.ts` (lines 66–234) mounts `UnifiedInvoiceRenderer` into an off-screen fixed container (`width: 794px; min-height: 1123px;`), captures it with `html2canvas` at `scale: 2`, and writes it to a portrait A4 `jsPDF` instance.
   - Currently, `ExactInvoicePayload` (lines 13–60) does not include bank account properties (`bankName`, `accountNumber`, `ifsc`, `accountHolder`, `branch`, `upiId`), forcing bank details to fall back to `loadInvoiceSettings()` or render blank in downloaded PDFs.

4. **Multi-Unit Quantities & Calculations**:
   - `UnifiedInvoiceRenderer.tsx` exports `formatItemQuantityDisplay` (lines 148–184) which formats single and dual-unit quantities (`1 PKT` / `(1*4 Pcs)`).
   - This export is directly imported and verified by tests in `c:\Users\bishn\Documents\GitHub\CredSmart\src\test\unitConversionBill.test.ts`.

5. **Document Types**:
   - `UnifiedInvoiceRenderer.tsx` supports 11 document types mapped via `DOC_TITLE_MAP` (lines 131–143): `sales_invoice`, `purchase_invoice`, `pos_invoice`, `quotation`, `delivery_challan`, `sales_return`, `credit_note`, `debit_note`, `proforma_invoice`, `payment_in`, `payment_out`.
   - All document types share the same underlying master layout with conditional titles and party swapping for purchase documents.

---

## 2. Logic Chain

1. **Centralized Architectural Leverage**:
   - Because all invoice views (`SalesInvoiceModal`, `PurchaseInvoiceModal`, `ReceiptModal`, `LiveInvoicePreview`, `MobileBillPreviewModal`, and `downloadExactInvoice.ts`) route through `UnifiedInvoiceRenderer.tsx`, replacing the legacy boxed layout in lines 608–1153 of `UnifiedInvoiceRenderer.tsx` instantly updates all preview modals, settings previews, and PDF downloads across the entire application in a single unified modification.

2. **Preservation of Non-A4 Modalities**:
   - Lines 436–605 handle POS thermal receipts (`80mm` and `58mm`). Because they branch before line 608 via `if (layout === "80mm" || layout === "58mm") return (...)`, modifying lines 608–1153 guarantees zero impact on thermal receipt printing.

3. **Single-Page PDF Geometry Alignment**:
   - `downloadExactInvoice.ts` computes scaling using `canvas.height / canvas.width`. If content height exceeds 1123px at 794px width, it compresses the layout vertically.
   - The target layout in `New Invoice.jpeg` is more vertically compact than the legacy layout:
     - Replaces heavy multi-line boxed borders with clean padding.
     - Collapses the 3-pod bottom layout into 2 clean cards.
     - Unboxes the amount in words and metadata.
   - This compact structure ensures that 1–5 item invoices fit cleanly into ~650px–850px total height, rendering at full 1:1 scale on single-page A4 PDFs with zero clipping or letterboxing.

4. **Data Sourcing & Fallbacks**:
   - Both `storeInfo` (FROM) and `partyInfo` (BILL TO) already supply all required fields (names, addresses, phone, email, GSTIN, PAN, state/place of supply).
   - Enhancing `downloadExactInvoice.ts` to accept and forward `bankDetails` ensures parity between on-screen modals and exported PDFs.

---

## 3. Caveats

1. **Local Node Environment**:
   - `node_modules` was not pre-installed in the workspace root during this session. Package dependencies and scripts will be executed once dependencies are installed or in the designated runner environment.
2. **Additional Document Fields**:
   - For document types like `credit_note` or `debit_note`, original invoice references (`originalInvoiceNumber`, `originalInvoiceDate`, `returnReason`, `settlementMode`) should continue to render gracefully (e.g. as a compact info strip below the header accent line).
3. **Consignee / Shipping Address**:
   - If a distinct shipping address is provided (`shippingInfo.address !== partyInfo.address`), the buyer pod can toggle to show Ship-To details or split into Bill-To / Ship-To pods while maintaining the new visual language.

---

## 4. Conclusion

1. **Refactor Target**: The master GST redesign must be implemented primarily in `src/components/invoices/UnifiedInvoiceRenderer.tsx` (replacing the legacy boxed section in lines 608–1153) and secondarily in `src/utils/downloadExactInvoice.ts` (adding bank details forwarding).
2. **Zero Breaking Changes**: All existing props, exported types (`UniversalDocType`, `InvoiceItemData`, `PartyDetails`, `UnifiedInvoiceProps`), and the `formatItemQuantityDisplay` function must be strictly preserved.
3. **Visual Parity**: Full compliance with `New Invoice.jpeg` is achieved by:
   - Unboxed bold header with stacked right metadata.
   - Cyan accent divider line (`#0ea5e9`).
   - Dual `FROM` and `BILL TO` pods with light-blue ribbons (`bg-[#e0f2fe]`).
   - Uppercase `ITEM DETAILS` title.
   - Dark navy items table header (`bg-[#0c324e]`) with white text.
   - Right-aligned financial summary with soft blue rounded pill for `Invoice total (rounded)`.
   - Clean unboxed `Amount in words` line.
   - Dual bordered cards for `BANK ACCOUNT DETAILS` and `AUTHORISED SIGNATORY`.
   - Minimalist footer: `Thank you for your business.`.

---

## 5. Verification Method

1. **Visual Fidelity Verification**:
   - Inspect `src/components/settings/LiveInvoicePreview.tsx` in a browser or test environment to verify visual parity against `Correction/New folder/New Invoice.jpeg`.
   - Verify unboxed header, cyan divider, dual FROM/BILL TO pods, navy table header, soft blue total pill, dual bank/signature cards, and minimalist footer.
2. **Code & Type Integrity Verification**:
   - Run TypeScript typecheck: `npm run lint` or `npx tsc --noEmit`. Expected result: 0 errors across modified files.
3. **Unit Test Verification**:
   - Run vitest test suite: `npx vitest run src/test/unitConversionBill.test.ts`. Expected result: 100% passing.
4. **PDF Single-Page Export Verification**:
   - Invoke `downloadExactInvoicePdf` from Sales or Live Preview.
   - Open generated PDF: verify single-page A4 fit (no second blank page, no clipping, sharp text).

---
*End of Handoff Report*
