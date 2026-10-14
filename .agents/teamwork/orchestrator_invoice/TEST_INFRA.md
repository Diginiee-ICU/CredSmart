# E2E Test Infra: CredSmart Master GST Invoice Redesign

## Test Philosophy
- Opaque-box, requirement-driven testing. Derived strictly from `ORIGINAL_REQUEST.md` (Section 2026-10-13T20:00:31Z) and visual specifications in `New Invoice.jpeg`.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Combinatorial Testing + Real-World Workload Scenarios.

## Feature Inventory & Test Mapping
| # | Feature | Source (Requirement) | Tier 1 (Coverage) | Tier 2 (Boundaries) | Tier 3 (Cross-Feature) |
|---|---------|---------------------|:-----------------:|:-------------------:|:----------------------:|
| F1 | Clean Unboxed Header | TAX INVOICE title, no outer borders | >=5 | >=5 | ✓ |
| F2 | Stacked Right Metadata | Invoice No., Invoice Date, Due Date | >=5 | >=5 | ✓ |
| F3 | Cyan Accent Divider Line | Full-width 2px cyan line (#0ea5e9/#0284c7) | >=5 | >=5 | ✓ |
| F4 | Dual Party Pods | FROM (Seller) & BILL TO (Buyer) 50%/50% | >=5 | >=5 | ✓ |
| F5 | Party Bottom Sub-Strips | Place of Supply & Customer Name sub-row | >=5 | >=5 | ✓ |
| F6 | Uppercase ITEM DETAILS Title | Heading above table | >=5 | >=5 | ✓ |
| F7 | Dark Navy Table Header | Solid bg-[#0c324e] with white text | >=5 | >=5 | ✓ |
| F8 | Items Table Data & Multi-Unit | S.No., Description, HSN, Qty, Rate, Amount | >=5 | >=5 | ✓ |
| F9 | Right-Aligned Summary | Taxable value, GST (5%), received, balance | >=5 | >=5 | ✓ |
| F10 | Soft Blue Total Highlight Pill | bg-[#e0f2fe] rounded pill container | >=5 | >=5 | ✓ |
| F11 | Unboxed Amount in Words | Single line Amount in words: INR ... | >=5 | >=5 | ✓ |
| F12 | Dual Bottom Cards | Bank Account Details & Authorised Signatory | >=5 | >=5 | ✓ |
| F13 | Minimalist Footer Note | "Thank you for your business." | >=5 | >=5 | ✓ |
| F14 | Single-Page A4 PDF Parity | 794x1123px rendering, single A4 page scaling | >=5 | >=5 | ✓ |
| F15 | Universal Document Types | All 11 docTypes, thermal preservation | >=5 | >=5 | ✓ |

## Test Architecture
- **Test Runner**: Vitest (v3.2.4) with JSDOM environment (`npm test` / `npx vitest run`).
- **Component Test Suite**: `src/test/unifiedInvoiceRenderer.test.tsx`
  - Validates full DOM structure, CSS classes, ribbon backgrounds, navy headers, pill highlight, amounts, and document types.
- **PDF Engine Test Suite**: `src/test/downloadExactInvoice.test.ts`
  - Validates container dimensions, jsPDF A4 scaling math (210mm x 297mm), tolerance calculations, and bank details payload passing.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| S1 | Retail GST Invoice with Cash Payment | F1–F13, F15 (sales_invoice, 100% received, zero balance) | Medium |
| S2 | Multi-Item Wholesale B2B with Dual Units | F4–F12, F14 (boxes + pieces, HSN codes, high line count) | High |
| S3 | Partial Credit Invoice with Pending Balance | F9–F11, F15 (received < total, positive balance) | Medium |
| S4 | Quotation / Proforma Invoice Preview | F1–F7, F15 (quotation title, no tax breakdown) | Medium |
| S5 | High-Density Bill Single-Page PDF Export | F8, F14 (tall item list, 0.5mm scaling tolerance, single-page fit) | High |

## Coverage Thresholds
- Tier 1: >= 75 test assertions (>= 5 per feature across 15 features)
- Tier 2: >= 75 boundary & edge case assertions (empty fields, long text, 0 rate, max decimal, single item vs multi item)
- Tier 3: Pairwise combinations of document types, payment states, and item units
- Tier 4: >= 5 realistic end-to-end user scenarios
