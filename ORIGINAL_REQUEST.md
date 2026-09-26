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
