# Project: CredSmart Master GST Invoice Redesign

## Architecture
- **Master UI Component**: `src/components/invoices/UnifiedInvoiceRenderer.tsx`
  - Replaces legacy boxed A4 layout (lines 608–1153) with modern enterprise stationery layout matching `New Invoice.jpeg`.
  - Preserves thermal POS modes (`80mm` / `58mm`) and exported utility `formatItemQuantityDisplay`.
  - Seamlessly handles all 11 `UniversalDocType` documents (`sales_invoice`, `pos_invoice`, `purchase_invoice`, `quotation`, `proforma_invoice`, `credit_note`, `debit_note`, etc.).
- **PDF & Print Engine**: `src/utils/downloadExactInvoice.ts` & `src/index.css`
  - Off-screen container (794px × 1123px at 96 DPI = 210mm × 297mm A4).
  - High-res capture via `html2canvas` (`scale: 2`) and single-page compilation via `jsPDF`.
  - Tolerance check (0.5mm threshold) to eliminate subpixel downscale distortion when content fits within 1123px.
  - Print container media styling `[data-print-container="invoice"]` for 100% browser print parity.
- **Data Model & Payloads**:
  - `storeInfo` (Seller / FROM pod): organization name, address, GSTIN, state, phone, logo, bank details.
  - `partyInfo` (Buyer / BILL TO pod): customer/vendor name, billing address, GSTIN, state, phone.
  - `items`: line items with description, HSN/SAC, quantity, units, rate, discount, GST %, tax amount, line total.
  - `ExactInvoicePayload`: extended to pass `bankDetails` for complete PDF export fidelity.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Clean Unboxed Header | Top-left bold `TAX INVOICE` in navy (`#0c324e`), unboxed header layout | M2 | New Invoice.jpeg § Header |
| F2 | Stacked Right-Aligned Metadata | Right-aligned stacked `Invoice No.`, `Invoice Date`, `Due Date` | M2 | New Invoice.jpeg § Metadata |
| F3 | Cyan Accent Line | Full-width 2px cyan horizontal line (`#0ea5e9` / `#0284c7`) beneath header | M2 | New Invoice.jpeg § Divider |
| F4 | Dual Equal-Width Party Pods | Side-by-side 50%/50% FROM and BILL TO pods with light-blue ribbons (`bg-[#e0f2fe]`) | M2 | New Invoice.jpeg § Pods |
| F5 | Party Bottom Sub-Compartments | Horizontally aligned bottom sub-compartments: `Place of Supply` and `Customer` | M2 | New Invoice.jpeg § Pods |
| F6 | Section Title ITEM DETAILS | Uppercase cyan section heading `ITEM DETAILS` above items table | M2 | New Invoice.jpeg § Table |
| F7 | Dark Navy Table Header | Solid dark navy header (`bg-[#0c324e]`) with white typography (`text-white`) | M2 | New Invoice.jpeg § Table Header |
| F8 | Items Table Data & Multi-Unit | Columns: `S.No.`, `Description`, `HSN`, `Qty`, `Rate`, `Amount` with dual unit formatting | M2 | New Invoice.jpeg § Table Body |
| F9 | Right-Aligned Financial Summary | Right-aligned breakdown: Taxable value, GST (5%), received amount, balance | M2 | New Invoice.jpeg § Totals |
| F10 | Soft Blue Total Highlight Pill | Signature rounded pill container (`bg-[#e0f2fe]`) with `Invoice total (rounded)` | M2 | New Invoice.jpeg § Grand Total |
| F11 | Unboxed Amount in Words | Single clean line `Amount in words: INR ... Only` without enclosing box | M2 | New Invoice.jpeg § Amount in words |
| F12 | Dual Bottom Cards | Side-by-side bordered cards with light-blue ribbons for `BANK ACCOUNT DETAILS` & `AUTHORISED SIGNATORY` | M2 | New Invoice.jpeg § Cards |
| F13 | Minimalist Footer Note | Clean single line `Thank you for your business.` removing cluttered legacy links | M2 | New Invoice.jpeg § Footer |
| F14 | Single-Page A4 PDF Parity | Off-screen 794px × 1123px rendering, jsPDF scaling, 0.5mm tolerance, zero clipping | M3 | ORIGINAL_REQUEST § R2 |
| F15 | Document Type & System Compatibility | 100% backward compatibility for all document types, thermal layouts, and unit conversions | M2, M3 | ORIGINAL_REQUEST § R3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | E2E Test Suite & Infra | Opaque-box test suite (`unifiedInvoiceRenderer.test.tsx`, `downloadExactInvoice.test.ts`), `TEST_INFRA.md`, publish `TEST_READY.md` | Survey Complete | DONE |
| M2 | Master Invoice Visual Redesign | Implement features F1–F13, F15 in `UnifiedInvoiceRenderer.tsx`, verify typography, colors, pods, table, totals | M1 defined contracts | DONE |
| M3 | PDF Engine & Print Parity | Enhance `downloadExactInvoice.ts` & print CSS, single-page A4 scaling, payload bank details passing | M2 | DONE |
| M4 | Final Acceptance & Adversarial Hardening | Phase 1: 100% E2E tests pass (Tiers 1-4). Phase 2: Tier 5 adversarial stress testing, forensic audit, build & typecheck | M1, M2, M3 | DONE |

## Interface Contracts
### UnifiedInvoiceRenderer Props
- Component: `src/components/invoices/UnifiedInvoiceRenderer.tsx`
- Props: `UnifiedInvoiceProps`
  - `invoice`: Transaction / invoice data (invoice_number, date, due_date, items, total, tax, received, balance, etc.)
  - `customer`: Customer / party details (name, address, gstin, state, phone)
  - `organization`: Store / seller details (name, address, gstin, state, phone, logo, bank details)
  - `docType`: `UniversalDocType` (defaults to `"sales_invoice"`)
  - `layout`: `"standard"` | `"thermal"` | `"thermal_58"` | `"a4_detailed"`
  - `isPrintMode`: boolean
  - `themeColor`: string (default `#0c324e` navy with cyan accents)

### downloadExactInvoice Function
- Function: `downloadExactInvoicePdf(payload: ExactInvoicePayload): Promise<void>`
- Payload: `invoice`, `customer`, `organization`, `docType`, `bankDetails`, `termsAndConditions`
- Output: Exact single-page A4 PDF download

## Code Layout
- Master Component: `src/components/invoices/UnifiedInvoiceRenderer.tsx`
- PDF Download Utility: `src/utils/downloadExactInvoice.ts`
- Print CSS Styles: `src/index.css`
- E2E Component Tests: `src/test/unifiedInvoiceRenderer.test.tsx`
- E2E PDF Engine Tests: `src/test/downloadExactInvoice.test.ts`
