# Project: CredSmart Tally Ingestion & Live Sync Expansion

## Architecture

CredSmart synchronizes and imports accounting data from Tally Prime / ERP 9 through two coordinated pathways:
1. **Live Direct / Bridge Sync Engine (`src/services/autoSyncService.ts`)**:
   - Queries Tally via HTTP (port 9000, 9005 via bridge, or Electron IPC) using TDL XML envelopes (`TALLY_EXPORT_MASTERS_XML` and `TALLY_EXPORT_DAYBOOK_XML`).
   - Parses the XML DOM via `src/utils/tallyXmlParser.ts`.
   - Ingests entities into Supabase (`products`, `product_batches`, `customers`, `suppliers`, `credit_transactions`, `sales`, `sale_items`, `purchase_invoices`, `purchase_invoice_items`, `expenses`) with resilient local storage fallbacks for Bank and Cash (`credsmart_bank_accounts_{orgId}`, `credsmart_cash_in_hand_{orgId}`).
   - Controls sync scope via `SyncConfig.syncScope` and tracks sync history & metrics.
2. **File & Folder Universal Importer (`src/pages/TallyImport.tsx` & `<TallyImportModal>`)**:
   - Allows users to drag-and-drop Tally XML or folder exports.
   - Parses, previews, and ingests items, parties, bank/cash accounts, and all voucher types into their respective database tables and local storage stores.

```
       [ Tally Prime / ERP 9 / Export XML ]
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
 [ Live Sync / Bridge ]          [ File / Modal Import ]
 (`autoSyncService.ts`)          (`TallyImportModal.tsx`)
        │                                 │
        └────────────────┬────────────────┘
                         ▼
             [ src/utils/tallyXmlParser.ts ]
                         │
        ┌────────────────┼────────────────┬────────────────┐
        ▼                ▼                ▼                ▼
   [ Masters ]      [ Vouchers ]     [ Bank/Cash ]    [ Balances ]
   products         sales            bank_accounts    credit_transactions
   product_batches  sale_items       (localStorage)   (party_id, party_type,
   customers        purchase_invoices cash_in_hand    type: credit/payment)
   suppliers        purchase_items   (localStorage)
                    credit_txns (rec/pay)
                    expenses
```

## Feature Inventory

Every feature discovered during the survey phase is enumerated below with its assigned milestone:

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | DayBook XML Date Range Support | `TALLY_EXPORT_DAYBOOK_XML` includes `<SVFROMDATE>` and `<SVTODATE>` to extract full historical records rather than single day | M1 | `ORIGINAL_REQUEST.md:24`, survey |
| 2 | SyncConfig & Scope Expansion | `SyncConfig.syncScope` includes `banks: boolean`, with safe defaults enabling all 5 entities (`items`, `parties`, `balances`, `vouchers`, `banks`) | M1 | `ORIGINAL_REQUEST.md:27`, survey |
| 3 | Sync Metrics & Audit Expansion | `SyncConfig.lastSyncStats`, audit logs, and execution results track counts for all 5 entities | M1 | `ORIGINAL_REQUEST.md:27`, survey |
| 4 | Stock Items & Batches Ingestion | Stock items and batch allocations upserted to `products` (with SKU, UOM, GST, prices in `tags`) and `product_batches` | M2 | `ORIGINAL_REQUEST.md:14,38`, survey |
| 5 | Customers & Suppliers Ingestion | Sundry Debtors upserted to `customers` and Sundry Creditors upserted to `suppliers` with contacts and GSTIN | M2 | `ORIGINAL_REQUEST.md:15,39`, survey |
| 6 | Party Opening Balances Ingestion | Opening balances inserted into `credit_transactions` with valid schema (`party_id`, `party_type`, `amount`, `type: 'credit' \| 'payment'`, `description: 'Opening Balance'`, `reference_id: 'SYNC-OPENING'`, `created_by: UUID`) | M2 | `ORIGINAL_REQUEST.md:15,40`, survey |
| 7 | Bank Accounts Persistence | Bank accounts ingested to `bank_accounts` (or localStorage key `credsmart_bank_accounts_{orgId}`) in both live sync and modal import | M2 | `ORIGINAL_REQUEST.md:16,43,45`, survey |
| 8 | Cash-in-Hand Balance Persistence | Cash-in-hand balance saved to `credsmart_cash_in_hand_{orgId}` and triggers `credsmart_bank_updated` event | M2 | `ORIGINAL_REQUEST.md:16,44`, survey |
| 9 | Sales Vouchers & Line Items | Sales vouchers create header entries in `sales` and line item entries in `sale_items` with quantity, rate, and line total | M3 | `ORIGINAL_REQUEST.md:18,48`, survey |
| 10 | Purchase Invoices & Line Items | Purchase vouchers create entries in `purchase_invoices` and items in `purchase_invoice_items`, auto-resolving missing suppliers/products | M3 | `ORIGINAL_REQUEST.md:19,49`, survey |
| 11 | Customer Receipts Ingestion | Customer receipts create `payment` records in `credit_transactions` linked to the customer | M3 | `ORIGINAL_REQUEST.md:20,50`, survey |
| 12 | Vendor Payments Ingestion | Vendor payments create `payment` records in `credit_transactions` linked to the supplier | M3 | `ORIGINAL_REQUEST.md:20,50`, survey |
| 13 | Operating Expenses Ingestion | Direct/indirect expense vouchers create entries in `expenses` and localStorage fallback | M3 | `ORIGINAL_REQUEST.md:21,51`, survey |
| 14 | TallyImportModal Callback Wiring | `TallyImportModal` mounted in `TallyImport.tsx` passes and executes `onImportBankAccounts` | M4 | `ORIGINAL_REQUEST.md:27,45`, survey |
| 15 | Auto-Sync Scope Checkboxes UI | Dashboard renders toggle checkboxes for all 5 entities (`items`, `parties`, `balances`, `vouchers`, `banks`) | M4 | `ORIGINAL_REQUEST.md:27,55`, survey |
| 16 | Auto-Sync Dashboard Stats UI | Dashboard displays stat cards for all 5 entity types | M4 | `ORIGINAL_REQUEST.md:27,55`, survey |
| 17 | E2E Test Suite (Tiers 1-4) | Comprehensive opaque-box test suite covering feature tests, boundaries, pairwise combinations, and real-world workflows | E2E Track & M5 | `ORIGINAL_REQUEST.md:31,56`, survey |
| 18 | Coverage Hardening (Tier 5) | Adversarial test cases verifying edge cases, parser sanitization, and regression freedom | M5 | `ORIGINAL_REQUEST.md:56`, survey |

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Design & implement opaque-box test suite (Tiers 1-4) derived from user requirements; publish `TEST_READY.md` | none | DONE |
| 1 | Query Protocols & Scope Config | Add `<SVFROMDATE>`/`<SVTODATE>` to DayBook XML queries; expand `SyncConfig` interface, scope, and defaults for all 5 entities | none | DONE |
| 2 | Master Data, Balances, & Bank/Cash Pipeline | Ingest products, batches, parties; fix `credit_transactions` opening balance schema; ingest bank accounts & cash-in-hand | M1 | DONE |
| 3 | Full Voucher & Transaction Ingestion | Ingest Sales + `sale_items`, Purchases + `purchase_invoice_items`, Receipts, Payments, and Expenses | M2 | DONE |
| 4 | UI Controls & Auto-Sync Dashboard | Render all 5 scope checkboxes; render 5 sync stats cards; wire `onImportBankAccounts` into `<TallyImportModal>` | M2, M3 | DONE |
| 5 | Final Milestone: 100% E2E Pass & Hardening | Execute full test suite via `TEST_READY.md` (Tiers 1-4), resolve any gaps, then execute Tier 5 adversarial hardening | M4, E2E | IN_PROGRESS |

## Interface Contracts

### `autoSyncService.ts` ↔ Database & Storage
- `executeDirectSyncIngestion(orgId, userId, parsedData, options)`:
  - `parsedData`: `{ items: Partial<InventoryItem>[], parties: Partial<Party>[], vouchers?: TallyVoucher[], bankAccounts?: TallyBankAccount[], cashInHand?: number }`
  - `credit_transactions`: `{ organization_id, party_id, party_type: 'customer' | 'supplier', amount, type: 'credit' | 'payment', description, reference_id, created_by: UUID }`
  - Bank Accounts: probe `bank_accounts`; if present upsert, else persist to `localStorage.getItem("credsmart_bank_accounts_" + orgId)`.
  - Cash: save float to `localStorage.getItem("credsmart_cash_in_hand_" + orgId)`.

### `<TallyImportModal>` ↔ `TallyImport.tsx`
- Callback props:
  - `onImportItems(items, conflictMode)`
  - `onImportParties(parties, conflictMode)`
  - `onImportBankAccounts(banks, cashInHand)`
  - `onImportVouchers(vouchers, conflictMode)`

## Code Layout

- `src/services/autoSyncService.ts` — Live sync orchestration, DayBook XML query, database upsert engine.
- `src/utils/tallyXmlParser.ts` — Tally XML parser (DOM sanitization, masters, vouchers, bank/cash).
- `src/pages/TallyImport.tsx` — Auto-sync dashboard, entity checkboxes, sync stats cards, modal mounting.
- `src/components/TallyImportModal.tsx` — File import modal for Tally data with entity tabs and callbacks.
- `src/pages/CashAndBank.tsx` — Local storage keys and format for bank accounts and cash in hand.
- `src/test/tallyImport.test.ts` — Existing parser and import unit tests.
- `src/test/tallyBridge.test.ts` — Node bridge integration tests.
- `src/test/tallyE2E.test.ts` — E2E test suite covering full requirements.
