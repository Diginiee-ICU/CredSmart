# Original User Request

## Initial Request — 2026-09-25T21:42:28Z

Fix and expand CredSmart's Tally Live Sync and File Import pipelines to synchronize and import all financial entities—including Invoices & Vouchers (Sales, Purchases, Receipts, Payments, Expenses, Notes) with item line details, Bank Accounts, and Cash in Hand—beyond just Items and Parties.

Working directory: c:/Users/Rudra/Desktop/Git/CredSmart
Integrity mode: development

## Requirements

### R1. Comprehensive Tally Entity Synchronization & Ingestion
The system must parse, ingest, and persist all primary accounting entities from Tally Prime / ERP 9 exports and live sync streams:
- **Products & Inventory**: Stock items, standard rates, opening stock, units of measurement, GST rates, HSN codes, and batch allocations in `products` and `product_batches`.
- **Parties & Khata Balances**: Sundry Debtors as `customers`, Sundry Creditors as `suppliers`, with contact details, GSTIN, and opening balances correctly recorded in `credit_transactions`.
- **Bank & Cash Accounts**: Bank accounts and Cash-in-Hand ledger balances stored in `bank_accounts` (and localStorage fallbacks) and kept in sync with the Cash & Bank views.
- **Invoices & Vouchers**: Full transactional records:
  - Sales invoices persisted to `sales` with line items in `sale_items`.
  - Purchase invoices persisted to `purchase_invoices` with line items in `purchase_invoice_items`.
  - Customer receipts and vendor payments recorded as payment transactions in `credit_transactions`.
  - Operating expenses recorded in `expenses`.

### R2. Query Protocols & Historical Date-Range Support
Day Book XML queries to Tally must provide configurable date boundaries (`SVFROMDATE` and `SVTODATE`) to ensure historical transaction records are returned rather than only the current active day.

### R3. User Interface Controls & Full Entity Visibility
The Auto-Sync dashboard and File Import modals must expose explicit controls and status indicators for all entity types (Items, Parties, Balances, Invoices/Vouchers, and Bank/Cash), with safe defaults enabling full synchronization.

## Verification Resources

- Existing test suite in `src/test/tallyImport.test.ts` and `src/test/tallyBridge.test.ts`.
- Database schema definitions in `src/integrations/supabase/types.ts`.
- Cash and bank storage keys defined in `src/pages/CashAndBank.tsx`.

## Acceptance Criteria

### Master Data Integrity
- [ ] Stock items are parsed and upserted into `products` and `product_batches` with valid SKUs, prices, GST, and units.
- [ ] Customers and suppliers are parsed and upserted into `customers` and `suppliers`.
- [ ] Party opening balances are inserted into `credit_transactions` matching the database schema (`party_id`, `party_type`, `amount`, `type: "opening_balance"`, `description`, `reference_id`, `organization_id`, `created_by`).

### Bank & Cash Account Ingestion
- [ ] Bank accounts from Tally are stored in `bank_accounts` (or localStorage key `credsmart_bank_accounts_{orgId}`).
- [ ] Cash-in-hand ledger balance is stored in `credsmart_cash_in_hand_{orgId}`.
- [ ] Bank accounts are imported when using both Live Sync and `<TallyImportModal>`.

### Vouchers & Transaction Ingestion
- [ ] Sales vouchers create entries in `sales` and corresponding item entries in `sale_items`.
- [ ] Purchase vouchers create entries in `purchase_invoices` and corresponding item entries in `purchase_invoice_items`.
- [ ] Customer receipts and supplier payments create corresponding `payment` records in `credit_transactions`.
- [ ] Indirect/Direct expenses create entries in `expenses`.

### Live Sync & UI Verification
- [ ] `TALLY_EXPORT_DAYBOOK_XML` includes `<SVFROMDATE>` and `<SVTODATE>` parameters.
- [ ] Auto-sync UI renders checkboxes for all entity types (Items, Parties, Balances, Vouchers, and Banks), and sync stats accurately display records ingested for each.
- [ ] Vitest test suite passes with zero regressions.


## 2026-10-13T20:00:31Z

Redesign the master GST invoice layout in CredSmart to match the new enterprise visual specification in `Correction/New folder/New Invoice.jpeg`, replacing the legacy boxed format from `Correction/New folder/Old Invoice.jpeg` across web invoice previews and single-page PDF generation.

Working directory: c:\Users\bishn\Documents\GitHub\CredSmart
Integrity mode: development

Reference Material:
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
