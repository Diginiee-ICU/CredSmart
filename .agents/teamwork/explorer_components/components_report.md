# Master GST Invoice Redesign — Component Architecture Analysis Report

**Author**: Component Architect Explorer  
**Date**: 2026-10-13  
**Working Directory**: `c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\explorer_components`  
**Reference Material**:
- Target Design Reference: `Correction/New folder/New Invoice.jpeg`
- Legacy Design Reference: `Correction/New folder/Old Invoice.jpeg`
- Original Request: `ORIGINAL_REQUEST.md` (Section 2026-10-13T20:00:31Z)

---

## 1. Executive Summary

This investigation analyzed CredSmart's invoice rendering architecture across web preview modals, settings previews, mobile bill modals, and single-page PDF generation pipelines. 

The primary finding is that **CredSmart already possesses a single, centralized invoice engine**: `src/components/invoices/UnifiedInvoiceRenderer.tsx`. This component governs invoice rendering across the entire application and is consumed by `downloadExactInvoice.ts` for pixel-accurate single-page A4 PDF rendering.

The current implementation of `UnifiedInvoiceRenderer.tsx` (specifically lines 608–1153) directly corresponds to the legacy boxed format shown in `Correction/New folder/Old Invoice.jpeg`. The target enterprise design shown in `Correction/New folder/New Invoice.jpeg` requires redesigning this master A4 rendering layer into an unboxed, modern layout with distinct visual pods, a solid navy item header (`bg-[#0c324e]`), right-aligned financial totals with a soft blue rounded pill highlight, and dual side-by-side cards for bank details and signatures.

Crucially, this redesign can be implemented **with zero breaking changes to existing consumer components**, 100% preservation of all 11 document types, complete fidelity of multi-unit conversion math, and full backward compatibility with thermal POS receipt printing (80mm and 58mm layouts).

---

## 2. Visual & Structural Architecture Comparison

A side-by-side breakdown between `Old Invoice.jpeg`, `New Invoice.jpeg`, and the current codebase:

| Component Section | Legacy Design (`Old Invoice.jpeg` / current lines 608–1153) | Target Enterprise Design (`New Invoice.jpeg`) | Implementation Architecture |
| :--- | :--- | :--- | :--- |
| **Outer Wrapper** | Heavy outer box border around the entire invoice (`border border-slate-300`, `shadow-md`, `p-3`). | **Clean, borderless, unboxed canvas** on crisp white background with generous whitespace. | Remove outer box borders from container; keep printable A4 constraints (`max-w-[794px]` / `w-full mx-auto`). |
| **Header Left** | Boxed bar with title text `TAX INVOICE`, copy pill `ORIGINAL FOR RECIPIENT`, and right store tag. | **Large, bold, unboxed document title** (`TAX INVOICE`) in dark navy (`text-[#0c324e]`, ~`text-2xl` / `font-black`). | Render clean unboxed left title. For other doc types, dynamically inject mapped title. |
| **Header Right** | Grid-cell metadata inside bordered box (`INVOICE NO:`, `INVOICE DATE:`, `DUE DATE:`, `PLACE OF SUPPLY:`). | **Clean, right-aligned, stacked metadata stack** without bounding boxes: `Invoice No.`, `Invoice Date`, `Due Date` with bold values. | Right-aligned flex/grid column; stacked label-value pairs with bold typography. |
| **Header Divider** | Thin gray border line between boxed sections. | **Full-width horizontal cyan accent divider line** (`border-t-2 border-[#0ea5e9]` / `#38bdf8`). | Full-width border or divider spanning the container width directly under header. |
| **FROM (Seller Pod)** | Col-span-7 grid box inside top section with logo, contact, and GSTIN/PAN inline. | **Dedicated bordered pod with light-blue header ribbon (`FROM`)**: Bold company name, address, Phone, Email, GSTIN, PAN, and bottom bar `Place of Supply: [State]`. | Left pod in dual-pod grid (`grid-cols-2 gap-3`); light-blue header (`bg-[#e0f2fe]` / `text-[#0284c7]`); bottom border strip for place of supply. |
| **BILL TO (Buyer Pod)** | Col-span-12 full-width bar below store info with `BILL TO: [NAME]` and inline address. | **Dedicated bordered pod with light-blue header ribbon (`BILL TO`)**: Bold party name, address, Contact, GSTIN, and bottom bar `Customer: [Contact/Party Name]`. | Right pod in dual-pod grid; light-blue header ribbon; bottom strip for customer/contact name or balance. |
| **Section Title** | None (jumped straight into table). | **Uppercase section title**: `ITEM DETAILS` in bold cyan/navy typography above the table. | `div` with `font-bold text-xs uppercase tracking-wider text-[#0c324e]` above items table. |
| **Item Table Header** | Light pastel background (`bg-[#f0f9ff]`), slate borders, uppercase `S.No`, `ITEMS`, `HSN`, `QTY`, `RATE`, `AMOUNT`. | **Solid dark navy header row (`bg-[#0c324e]`) with pure white typography**: `S.No.`, `Description`, `HSN`, `Qty`, `Rate`, `Amount`. | `thead` with `bg-[#0c324e] text-white`; crisp white column headers; aligned padding. |
| **Item Table Rows** | Alternating white/gray rows with heavy borders; item name + batch + exp date. | **Clean rows with subtle borders**: S.No, Description (supports multi-line notes), HSN, Qty (supports dual-unit), Rate, Amount. | Table rows with `border-b border-slate-200`; compact padding (`py-1.5 px-2`); mono rates/totals. |
| **Financial Summary** | Full-width table rows for Total Amount, Received Amount, and Balance Due. | **Right-aligned stacked financial breakdown**: `Taxable value / Rate`, `GST (5%)` (or CGST+SGST/IGST), **soft blue rounded pill** for `Invoice total (rounded)`, and `Amount received (Cash)`. | Right-aligned block (occupies ~45% width); rows with label and value; total row rendered inside rounded pill (`bg-[#e0f2fe] text-[#0c324e] rounded-lg px-3 py-1.5 font-bold`). |
| **Amount in Words** | Boxed banner with gray background `bg-slate-50/70` and gray border. | **Clean unboxed single-line statement**: `Amount in words: INR [Words] Only`. | `p` or `div` without borders or background: bold label `Amount in words:` followed by capitalized text. |
| **Bottom Cards** | 3-column boxed grid dividing Terms, Bank Details, and Signature/QR. | **Dual side-by-side bordered cards with light-blue ribbons**: 1. `BANK ACCOUNT DETAILS` (Bank, A/C No, IFSC, Account Holder); 2. `AUTHORISED SIGNATORY` (signature canvas, signature line, signatory label). | `grid grid-cols-2 gap-3`; each card has light-blue header ribbon (`bg-[#e0f2fe] text-[#0284c7] font-bold`); compact body. |
| **Footer Note** | Heavy compliance footer with logos, "Powered by CredSmart POS & Billing", "IT Act 2000 Ready • 100% Tax Compliant". | **Minimalist clean statement**: `Thank you for your business.`. | Centered/left muted footer (`text-slate-500 text-xs italic`). |

---

## 3. Data Flow & Information Sourcing Analysis

### 3.1 Seller Data (`FROM`) Sourcing
In `UnifiedInvoiceRenderer.tsx`, seller data is consumed via the `storeInfo` prop:
```typescript
storeInfo?: {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  state?: string;
  stateCode?: string;
  gstin?: string;
  pan?: string;
  logoUrl?: string;
  bank_name?: string;
  account_number?: string;
  ifsc?: string;
  account_holder?: string;
  branch?: string;
  upi_id?: string;
};
```
- **Source in Application**: Call sites (`SalesInvoiceModal.tsx`, `PurchaseInvoiceModal.tsx`, `Sales.tsx`, `Purchases.tsx`, `SalesHistory.tsx`) retrieve this from `useOrganization()` or the Supabase `organizations` table.
- **Auto-Derivations**:
  - `stateCode`: If missing, derived from `gstin.substring(0, 2)`.
  - `pan`: If missing, derived from `gstin.substring(2, 12)`.
  - `account_holder`: If missing, defaults to `storeInfo.name`.
- **Target Layout Mapping**:
  - Store Name: Displayed in bold uppercase in the `FROM` pod.
  - Full Address: Rendered beneath the store name.
  - Phone & Email: Rendered on a single line (`Phone: ...  Email: ...`).
  - GSTIN & PAN: Rendered together (`GSTIN: ...  PAN: ...`).
  - Place of Supply: Rendered in the bottom strip of the `FROM` pod: `Place of Supply: [resolvedPlaceOfSupply]`.

### 3.2 Buyer Data (`BILL TO`) Sourcing
Buyer information is consumed via the `partyInfo` prop:
```typescript
partyInfo?: {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  state?: string | null;
  stateCode?: string | null;
  gstin?: string | null;
  pan?: string | null;
  balance?: number | null;
  type?: "customer" | "supplier";
};
```
- **Source in Application**: Populated from selected customer (`CustomerOption` in `SalesInvoiceModal.tsx` or `sale.customer_*` in `SalesHistory.tsx`).
- **Support for Consignee / Ship-To**: If `shippingInfo` is provided and differs from `partyInfo.address`, dual destination info can be accommodated.
- **Target Layout Mapping**:
  - Party Name: Displayed in bold uppercase in the `BILL TO` pod.
  - Billing Address: Rendered beneath the customer name.
  - Contact & GSTIN: Rendered together (`Contact: ...  GSTIN: ...`).
  - Bottom strip: Displays `Customer: [Contact Person or Party Name]` (and optionally balance badge if enabled by `activeSettings.showPartyBalance`).

### 3.3 Item Line Calculations & Multi-Unit Quantities
Item rows are structured via `InvoiceItemData`:
```typescript
export interface InvoiceItemData {
  id?: string;
  name: string;
  description?: string;
  hsn?: string;
  qty: number;
  unit?: string;
  altUnit?: string;
  altQty?: number;
  altUnitConversion?: number;
  freeQty?: number;
  rate: number;
  mrp?: number;
  discount?: number;
  discountPercent?: number;
  taxRate?: number;
  taxAmount?: number;
  cessRate?: number;
  cessAmount?: number;
  total: number;
  batchNo?: string;
  expDate?: string;
  mfgDate?: string;
}
```
- **Multi-Unit Quantity Formatter**: `formatItemQuantityDisplay(it: InvoiceItemData)`:
  - If single unit: Returns `{ isDual: false, primaryLine: "1 Pc", secondaryLine: null }`.
  - If alternate unit active: Returns `{ isDual: true, primaryLine: "1 PKT", secondaryLine: "(1*4 Pcs)" }`.
  - **Unit Test Protection**: Tested in `src/test/unitConversionBill.test.ts`. This logic must be preserved exactly as-is.
- **Line Rates and Totals**:
  - `Rate`: Taxable unit rate `₹${it.rate.toFixed(2)}`.
  - `Amount`: Line total `₹${it.total.toFixed(2)}` (or fallback `it.rate * it.qty`). Note that in the reference image, `Amount` reflects the gross line total (`₹4,750 + 5% = ₹4,987.50`).

### 3.4 Totals & Tax Breakdown Calculations
Totals are supplied via `totals` prop or calculated from items:
- `taxableAmount`: Taxable subtotal (e.g. `₹4,750.00`).
- `cgst`, `sgst`, `igst`: Tax breakdowns.
  - Automatically detects interstate vs intrastate using store vs party state codes, or presence of `totals.igst > 0`.
  - For intrastate: Displays combined `GST (5%)` or `CGST (2.5%) + SGST (2.5%)`.
  - For interstate: Displays `IGST (5%)`.
- `grandTotal`: Final rounded invoice total.
- `paidAmount`: Paid amount (`Amount received (Cash)` or relevant payment mode).
- `balanceDue`: Any remaining unpaid balance.
- **Statutory HSN/SAC Summary Table**:
  - Already calculated via `hsnSummaryList` (lines 313–373).
  - When `showHsnSummary` is true or `layout === 'a4_detailed'`, this detailed matrix is rendered. In the standard `a4` layout matching `New Invoice.jpeg`, the right-aligned summary breakdown serves as the concise tax representation.

### 3.5 Bank Details, QR Code & Signatures
- **Bank Details Hierarchy**:
  1. `propBankDetails` (passed directly from props).
  2. `storeInfo` bank fields (`bank_name`, `account_number`, `ifsc`, `branch`, `account_holder`).
  3. `activeSettings.bankAccounts` (fallback to default bank account in user's saved invoice settings).
- **Authorised Signatory Hierarchy**:
  1. `activeSettings.signatureDataUrl` (signature image).
  2. Fallback placeholder signature line with `activeSettings.signatoryTitle` ("Authorized Signatory") and `For {safeStore.name}`.
- **Dynamic UPI QR Code**:
  - Formulated via `upiPayload`: `upi://pay?pa={upiId}&pn={storeName}&am={grandTotal}&cu=INR&tn=Inv {invoiceNumber}`.
  - In the target layout, this can be embedded cleanly inside or adjacent to the Bank Account Details pod.

---

## 4. Supported Document Types & Title Variants

`UnifiedInvoiceRenderer` supports 11 document types mapped via `DOC_TITLE_MAP`:
1. `sales_invoice` -> **"TAX INVOICE"** (Default)
2. `pos_invoice` -> **"RETAIL TAX INVOICE"**
3. `purchase_invoice` -> **"PURCHASE INVOICE / BILL"**
4. `quotation` -> **"ESTIMATE / QUOTATION"**
5. `delivery_challan` -> **"DELIVERY CHALLAN"**
6. `sales_return` -> **"CREDIT NOTE / SALES RETURN"**
7. `credit_note` -> **"CREDIT NOTE (SEC 34 CGST ACT)"**
8. `debit_note` -> **"DEBIT NOTE"**
9. `proforma_invoice` -> **"PROFORMA INVOICE"**
10. `payment_in` -> **"RECEIPT VOUCHER"**
11. `payment_out` -> **"PAYMENT VOUCHER"**

### Flow for Purchase & Return Documents:
- When `isPurchase` is true (`purchase_invoice`, `debit_note`, `payment_out`):
  - Left Pod (`FROM`) renders Supplier/Vendor info.
  - Right Pod (`BILL TO`) renders Organization/Store info.
- When original invoice reference is provided (`originalInvoiceNumber`, `originalInvoiceDate`, `returnReason`, `settlementMode`):
  - Can be rendered in a compact info pill in the metadata section or below the header line.

---

## 5. PDF Export & Print Engine Parity (`downloadExactInvoice.ts`)

The PDF generation process in `downloadExactInvoice.ts` operates as follows:
1. Creates an off-screen fixed-position container:
   ```css
   position: fixed;
   top: 0;
   left: -9999px;
   width: 794px;
   min-height: 1123px;
   background: #ffffff;
   z-index: -999;
   ```
2. Mounts `UnifiedInvoiceRenderer` with the provided payload into the container using React 18 `createRoot`.
3. Waits 500ms for layout stabilization and asset loading.
4. Invokes `html2canvas(captureContainer, { scale: 2, useCORS: true, windowWidth: 794 })`.
5. Computes aspect ratio:
   ```typescript
   const imgAspect = canvas.height / canvas.width;
   const imgHeightMm = pageWidthMm * imgAspect;
   if (imgHeightMm > pageHeightMm) {
     const scaleToFit = pageHeightMm / imgHeightMm;
     const scaledWidth = pageWidthMm * scaleToFit;
     const marginX = (pageWidthMm - scaledWidth) / 2;
     pdf.addImage(imgData, "PNG", marginX, 0, scaledWidth, pageHeightMm, undefined, "FAST");
   } else {
     pdf.addImage(imgData, "PNG", 0, 0, pageWidthMm, imgHeightMm, undefined, "FAST");
   }
   ```

### Requirements for 100% Single-Page A4 Fidelity:
1. **Vertical Constraint**: At 794px container width, standard A4 height is 1123px. To avoid down-scaling (which introduces horizontal margins `marginX`), the total rendered height of the new invoice template must fit naturally within ~1050px–1120px for typical 1–5 item invoices.
2. **Compact Row & Pod Padding**:
   - Header: ~80px height.
   - Dual Pods: ~150px height.
   - Table: ~40px header + ~32px per item row.
   - Summary & Words: ~120px height.
   - Dual Cards: ~140px height.
   - Total estimated height for a standard 2-item bill: ~600px–750px (well within 1123px, ensuring crystal-clear 1:1 scale rendering).
3. **Bank Details in PDF Payload**:
   - `ExactInvoicePayload` currently omits bank fields. Adding `bankDetails` or `storeBankName`, `storeAccountNumber`, etc., to `ExactInvoicePayload` will guarantee bank info appears in all generated PDFs.

---

## 6. Comprehensive File Inventory & Modification Scope

### 6.1 Primary Redesign File (High Impact)
- **`src/components/invoices/UnifiedInvoiceRenderer.tsx`**
  - **Action**: Redesign the master A4 layout section (lines 608–1153).
  - **Keep Intact**:
    - Lines 1–607: All type exports (`UniversalDocType`, `InvoiceItemData`, `PartyDetails`, `UnifiedInvoiceProps`), `formatItemQuantityDisplay`, color theme loaders, tax summary computation logic, and thermal receipt layouts (`80mm` and `58mm`).
  - **Transform (lines 608–1153)**:
    - Replace legacy boxed layout with unboxed enterprise layout.
    - Header: Unboxed large bold `TAX INVOICE` left + stacked right metadata.
    - Divider: Full-width cyan accent horizontal divider line.
    - Address pods: Dual side-by-side equal-width pods (`FROM` and `BILL TO`) with light-blue header ribbons, full contact/tax info, and bottom strips (`Place of Supply` and `Customer`).
    - Section heading: Uppercase `ITEM DETAILS`.
    - Table: Solid dark navy header `bg-[#0c324e]` with white text (`S.No.`, `Description`, `HSN`, `Qty`, `Rate`, `Amount`).
    - Summary: Right-aligned totals with soft blue rounded pill for `Invoice total (rounded)`.
    - Words: Clean unboxed `Amount in words: INR ... Only`.
    - Bottom pods: Dual side-by-side bordered cards for `BANK ACCOUNT DETAILS` and `AUTHORISED SIGNATORY` with light-blue ribbons.
    - Footer: Minimalist `Thank you for your business.`.

### 6.2 Secondary Pipeline File (Medium Impact)
- **`src/utils/downloadExactInvoice.ts`**
  - **Action**:
    - Extend `ExactInvoicePayload` to accept `bankDetails?: { bankName?: string; accountNumber?: string; ifsc?: string; accountHolder?: string; branch?: string }`, `placeOfSupply?: string`, and `partyDetails?: PartyDetails`.
    - Pass these fields to `UnifiedInvoiceRenderer` in the off-screen render step.
    - Maintain single-page A4 scaling and PDF generation logic.

### 6.3 Consumers (Verified — 100% Backward Compatible)
The following components already consume `UnifiedInvoiceRenderer` or `downloadExactInvoicePdf`:
- `src/components/SalesInvoiceModal.tsx` — passes all invoice data, calls `InvoiceFitView` + `UnifiedInvoiceRenderer`.
- `src/components/PurchaseInvoiceModal.tsx` — passes purchase invoice data, calls `InvoiceFitView` + `UnifiedInvoiceRenderer`.
- `src/components/ReceiptModal.tsx` — passes receipt data to `UnifiedInvoiceRenderer`.
- `src/components/settings/LiveInvoicePreview.tsx` — renders live preview in invoice settings.
- `src/components/invoices/mobile/MobileBillPreviewModal.tsx` — renders mobile preview.
- `src/pages/Sales.tsx`, `Purchases.tsx`, `SalesHistory.tsx` — invoke `downloadExactInvoicePdf`.

No breaking changes to prop names or types will be introduced, ensuring zero regressions across all consumers.

---

## 7. Architectural Recommendations for Implementation

1. **Strict Preservation of Interface Exports**:
   Do not modify existing prop names in `UnifiedInvoiceProps` or exported types (`InvoiceItemData`, `formatItemQuantityDisplay`).
2. **Color Constants**:
   - Header Title & Navy Table: `#0c324e` (Dark Navy).
   - Cyan Accent Line: `#0ea5e9` or `#38bdf8`.
   - Ribbon & Highlight Pill Background: `#e0f2fe` (Sky 100) or `#f0f9ff` (Sky 50).
   - Ribbon Text: `#0284c7` (Sky 600) or `#0369a1` (Sky 700).
   - Table Row Borders: `#e2e8f0` (Slate 200).
3. **Responsive & Printable Layout**:
   - Use CSS classes compatible with both web viewports and `html2canvas`.
   - Avoid modern CSS features unsupported by `html2canvas` (e.g., `oklch`, nested CSS without autoprefixing).
   - Use standard Tailwind utility classes (`bg-[#0c324e]`, `text-white`, `border-slate-300`, etc.).
4. **Thermal Receipt Protection**:
   Ensure lines 436–605 in `UnifiedInvoiceRenderer.tsx` (thermal 80mm and 58mm layouts) remain untouched.

---
*End of Component Architecture Analysis Report*
