# Tally XML Protocol & Ingestion Specification Survey Report

**Agent**: `spec_miner_survey_1` (Role: Tally XML Spec Miner)  
**Target Milestone**: Survey & Specification Phase  
**Authoritative Request**: `.agents/teamwork/ORIGINAL_REQUEST.md`  
**Date**: 2026-09-25T21:55:00Z  

---

## Executive Summary

CredSmart provides two ingestion mechanisms for Tally accounting data:
1. **Live Direct / Bridge Sync** (`fetchLiveTallyData` in `src/services/autoSyncService.ts`), communicating via port 9000 (direct), port 9005 (`scripts/credsmart-sync-agent/index.cjs`), or Electron IPC (`electron/main.cjs`).
2. **File & Folder Import** (`parseUniversalFile` and `parseMultipleUniversalFiles` in `src/utils/universalDataImporter.ts`, powered by `src/utils/tallyXmlParser.ts` and `<TallyImportModal>`).

While the parser in `src/utils/tallyXmlParser.ts` already parses stock items, party ledgers, bank accounts, cash, and 7 voucher types (Sales, Purchase, Receipt, Payment, Journal, Credit Note, Debit Note) with line items, the live sync query and ingestion pipelines suffer from 5 major architectural gaps:
1. **Day Book Query Date Boundaries**: `TALLY_EXPORT_DAYBOOK_XML` lacks `<SVFROMDATE>` and `<SVTODATE>`, causing Tally to return only vouchers for the single active day in Tally Prime.
2. **Incomplete Voucher Ingestion in Live Sync**: `executeDirectSyncIngestion` in `autoSyncService.ts` only handles `Sales` and `Purchase` headers; it does not persist line items into `sale_items` or `purchase_invoice_items`, and treats Receipts, Payments, Expenses, and Notes as unsupported.
3. **Database Schema Mismatch in Opening Balances**: `executeDirectSyncIngestion` attempts to insert `{ customer_id, supplier_id, payment_mode, status, transaction_date }` into `credit_transactions`, whereas `src/integrations/supabase/types.ts` defines `credit_transactions` with `party_id`, `party_type` ("customer" | "supplier"), `amount`, `type` ("opening_balance"), `description`, `reference_id`, `organization_id`, and `created_by`.
4. **Bank & Cash Ingestion Dropped in Live Sync & Modal**: Live sync completely ignores `bankAccounts` and `cashInHand` returned by `parseTallyXml`. In `src/pages/TallyImport.tsx`, the embedded `<TallyImportModal>` omits the `onImportBankAccounts` callback.
5. **UI & Scope Control Visibility**: `SyncConfig.syncScope` in `autoSyncService.ts` and `TallyImport.tsx` only exposes checkboxes for `items`, `parties`, and `balances`—omitting `vouchers` and `banks`.

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Query Protocol | `TALLY_EXPORT_MASTERS_XML` | TDL envelope exporting all stock items and ledgers | `<REPORTNAME>List of Accounts</REPORTNAME>`, `<ACCOUNTTYPE>All Masters</ACCOUNTTYPE>` | XML with `<STOCKITEM>`, `<LEDGER>`, `<GROUP>`, `<COMPANY>` | Returns empty `<ENVELOPE>` if no company is open | `src/services/autoSyncService.ts:155-172` |
| 2 | Query Protocol | `TALLY_EXPORT_DAYBOOK_XML` | TDL envelope exporting all daybook transactions | `<REPORTNAME>Day Book</REPORTNAME>`, `<EXPLODEFLAG>Yes</EXPLODEFLAG>` | XML with `<VOUCHER>` elements and sub-lists | Without `<SVFROMDATE>`/`<SVTODATE>`, returns only active date | `src/services/autoSyncService.ts:174-191` |
| 3 | Query Protocol | Historical Date Boundaries | Parameters inside `<STATICVARIABLES>` specifying start and end query dates | `<SVFROMDATE>YYYYMMDD</SVFROMDATE>`, `<SVTODATE>YYYYMMDD</SVTODATE>` | Full historical transaction range | Defaults to single active date if omitted | Tally TDL Specification & `ORIGINAL_REQUEST.md:24` |
| 4 | Parser Engine | XML Sanitization & Ampersand Escape | Cleans XML control characters, entities, and unescaped ampersands | Raw XML string with `&#4;` or unescaped `&` | Cleaned DOM Document via `DOMParser()` | Throws `XML Parse Error` on invalid DOM | `src/utils/tallyXmlParser.ts:707-736` |
| 5 | Parser Engine | Group Hierarchy Resolver | Recursively traverses nested `<GROUP>` elements (depth up to 12) | `<GROUP NAME="..."> <PARENT>...</PARENT>` | Root classification: `"customer"`, `"supplier"`, `"bank"`, `"cash"`, `"system"`, `"other"` | Falls back to `"other"` if group path is circular or unknown | `src/utils/tallyXmlParser.ts:221-270` |
| 6 | Inventory | Stock Item Master Parsing | Parses inventory items with units, rates, MRP, opening stock, GST, and HSN | `<STOCKITEM>` with `<BASEUNITS>`, `<OPENINGBALANCE>`, `<OPENINGRATE>`, `<STANDARDPRICELIST.LIST>`, `<GSTDETAILS.LIST>` | `Partial<InventoryItem>[]` | Applies 15% markup if only purchase price is present; defaults unit to PCS | `src/utils/tallyXmlParser.ts:348-403` |
| 7 | Inventory | Stock Batch Allocations | Extracts batch number, godown, and expiry from stock item opening batches | `<BATCHALLOCATIONS.LIST>` inside `<STOCKITEM>` | Item batch payload with batch number and expiry | Falls back to `"SYNC-BATCH-1"` or `"INIT-BATCH"` if absent | `src/utils/tallyXmlParser.ts:546-550`, `autoSyncService.ts:539-558` |
| 8 | Parties | Customer & Supplier Parsing | Resolves Debtors as customers and Creditors as suppliers with contacts & tax IDs | `<LEDGER>` under Sundry Debtors / Sundry Creditors | `Partial<Party>[]` with `partyType: "customer" \| "supplier"` | Ignores cash, bank, and system ledgers | `src/utils/tallyXmlParser.ts:405-499` |
| 9 | Parties | Party Opening Balance Polarity | Resolves Dr (positive receivable) vs Cr (negative payable) balance | `<OPENINGBALANCE>`, `<ISDEEMEDPOSITIVE>` ("Yes" = Dr, "No" = Cr) | Signed balance number (`+` for customer, `-` for supplier) | Normalizes supplier credit balances if deemed positive is absent | `src/utils/tallyXmlParser.ts:452-466` |
| 10 | Bank & Cash | Bank Account Ledger Extraction | Extracts bank account name, number, IFSC, and balance | `<LEDGER>` under `Bank Accounts`, `<BANKDETAILS.LIST>`, `<IFSCODE>` | `TallyBankAccount[]` with name, account number, IFSC, balance | Strips noise words from bank name; falls back to `"Bank Account"` | `src/utils/tallyXmlParser.ts:643-694` |
| 11 | Bank & Cash | Cash-in-Hand Aggregation | Aggregates all cash ledger balances (Cash, Petty Cash, Register) | `<LEDGER>` under `Cash-in-Hand` | Total numeric `cashInHand` | Defaults to 0 if no cash ledgers exist | `src/utils/tallyXmlParser.ts:683-685` |
| 12 | Transactions | Sales Voucher Parsing | Extracts sales invoice header, customer, line items, batches, and tax | `<VOUCHER VCHTYPE="Sales">`, `<ALLINVENTORYENTRIES.LIST>`, `<ALLLEDGERENTRIES.LIST>` | `TallyVoucher` with `voucherType: "Sales"`, `items[]`, `ledgerEntries[]` | Total computed from party ledger or summed item lines | `src/utils/tallyXmlParser.ts:532-616` |
| 13 | Transactions | Purchase Voucher Parsing | Extracts purchase invoice header, supplier, inventory line items, and batch details | `<VOUCHER VCHTYPE="Purchase">`, `<ALLINVENTORYENTRIES.LIST>`, `<ALLLEDGERENTRIES.LIST>` | `TallyVoucher` with `voucherType: "Purchase"`, `items[]`, `ledgerEntries[]` | If supplier is missing, auto-creates stub vendor | `src/utils/tallyXmlParser.ts:617-619`, `TallyImport.tsx:874-884` |
| 14 | Transactions | Customer Receipt Voucher Parsing | Extracts customer invoice payment transactions | `<VOUCHER VCHTYPE="Receipt">`, customer ledger (Cr) & bank/cash ledger (Dr) | `TallyVoucher` with `voucherType: "Receipt"` | In live sync, currently treated as unsupported | `src/utils/tallyXmlParser.ts:620-622` |
| 15 | Transactions | Vendor Payment Voucher Parsing | Extracts vendor disbursements and bill settlements | `<VOUCHER VCHTYPE="Payment">`, vendor ledger (Dr) & bank/cash ledger (Cr) | `TallyVoucher` with `voucherType: "Payment"` | In live sync, currently treated as unsupported | `src/utils/tallyXmlParser.ts:623-625` |
| 16 | Transactions | Expense & Journal Voucher Parsing | Extracts operating expenses (rent, electricity, repairs) and journal adjustments | `<VOUCHER VCHTYPE="Journal">`, expense ledger entries | `TallyVoucher` with `voucherType: "Journal"` | In live sync, currently treated as unsupported | `src/utils/tallyXmlParser.ts:626-628` |
| 17 | Transactions | Credit Note & Debit Note Parsing | Extracts sales returns (Credit Note) and purchase returns (Debit Note) | `<VOUCHER VCHTYPE="Credit Note">` / `Debit Note` | `TallyVoucher` with `creditNoteVouchers[]`, `debitNoteVouchers[]` | In live sync, currently treated as unsupported | `src/utils/tallyXmlParser.ts:608-613` |
| 18 | Ingestion | Stock Items Ingestion & Batches | Bulk upserts products and batches into Supabase | `parsedData.items` | Rows in `products` and `product_batches` | Generates stable SKU `TALLY-{hash}` if item lacks part number | `src/services/autoSyncService.ts:451-563` |
| 19 | Ingestion | Party Opening Balances Ingestion | Records opening balances into ledger credit transactions | `parsedData.parties` | Rows in `credit_transactions` | Failed previously due to invalid column names (`customer_id`/`supplier_id`) | `src/services/autoSyncService.ts:605-657` |
| 20 | Ingestion | Sales & Purchase Vouchers Ingestion | Inserts invoice headers into `sales` and `purchase_invoices` | `parsedData.vouchers` | Rows in `sales` and `purchase_invoices` | Currently omits `sale_items` and `purchase_invoice_items` in live sync | `src/services/autoSyncService.ts:660-727` |
| 21 | Configuration | Sync Scope Configuration | Flags controlling which entities sync during live sync | `SyncConfig.syncScope` | Config object in localStorage | Currently lacks `banks: boolean` | `src/services/autoSyncService.ts:30-35`, `85-90` |
| 22 | UI Controls | Auto-Sync Scope Checkboxes | Checkboxes in Auto-Sync settings page to toggle entity sync | User clicks on scope checkboxes | Updates `SyncConfig.syncScope` in localStorage | Currently only renders items, parties, balances | `src/pages/TallyImport.tsx:2097-2112` |
| 23 | UI Controls | File Import Modal Callbacks | Handles imported data from `<TallyImportModal>` | `onImportItems`, `onImportParties`, `onImportBankAccounts`, `onImportVouchers` | Persists data to DB / storage | `onImportBankAccounts` is omitted in `TallyImport.tsx:2887-2901` | `src/pages/TallyImport.tsx:2887-2901` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | XML Parser | String containing `&#4;` or ASCII 0x00–0x1F | Stripped via regex sanitization before `DOMParser` parses; prevents crash with `xmlParseCharRef: invalid xml`. |
| 2 | XML Parser | Unescaped ampersand (e.g. `<PARENT>Grains & Cereals</PARENT>`) | Replaced with `&amp;` via negative lookahead regex `/&(?!(?:apos\|quot\|[lg]t\|amp);\|#)/g`. |
| 3 | Date Parser | Tally 8-digit compact date `20260815` | Transformed to ISO date `2026-08-15`. Also handles `DD-MM-YYYY` and `DD/MM/YYYY`. Defaults to today if missing. |
| 4 | Numeric Parser | Formatted currency string `₹ 2,18,250.00` or `350/BAG` | Strips currency symbols (`₹`, `$`, `Rs`), commas, and trailing unit text, extracting pure float `218250.00` or `350.00`. |
| 5 | Stock Pricing | Stock item with purchase price `145.50` but no selling price | Applies standard 15% retail markup: `Math.round(145.50 * 1.15) = 167`. MRP set to 20% markup. |
| 6 | Stock Pricing | Stock item with selling price `200` but no purchase price | Applies standard 20% discount: `Math.round(200 * 0.8) = 160`. |
| 7 | Inventory Lines | Sales voucher item amount `<AMOUNT>-1400.00</AMOUNT>` | Parsed using `Math.abs(extractNumericValue(raw))` to prevent negative quantities or amounts on invoice items. |
| 8 | Group Hierarchy | Multi-level nested groups (e.g. `Delhi Retailers Club` &rarr; `North India Trade` &rarr; `Sundry Debtors`) | Resolved recursively up to 12 levels to root `"customer"`. Category classified as `"Retailer"`. |
| 9 | Party Balances | Customer with `<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>` | Recognized as negative balance (advance payment received from customer). |
| 10 | Party Balances | Supplier with credit balance `125000.00` and `<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>` | Stored as `-125000` (payable) in CredSmart ledger. |
| 11 | Bank Accounts | Ledger under `Current Operational Accounts` &rarr; `Bank Accounts` with account `50200012345678` | Correctly identified as bank account; balance recorded in `bankAccounts[]` array, not in customers or suppliers. |
| 12 | Day Book Query | Request without `<SVFROMDATE>` and `<SVTODATE>` | Tally returns only vouchers matching the currently loaded session day (often zero vouchers if working on a historical company). |
| 13 | Live Sync | Ingestion of `Receipt` or `Payment` voucher in `executeDirectSyncIngestion` | Skipped and added to `unsupportedVoucherTypes`, causing sync status to become `"partial"` or `"failed"`. |
| 14 | Live Sync | Party opening balance insertion into `credit_transactions` | Payload has `customer_id` and `supplier_id`; fails because table schema expects `party_id` and `party_type`. |
| 15 | File Import | Folder import with raw Tally directory containing `Company.900` without XML | Detected via `inspectUploadedFolder`; displays guidance advising user to export XML via `Alt+E`. |

---

## 5-Component Handoff Report

### 1. Observation

Direct code analysis of the authoritative source files reveals the following exact lines and behaviors:

#### A. Tally Query Constants (`src/services/autoSyncService.ts:174-191`)
```typescript
export const TALLY_EXPORT_DAYBOOK_XML = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Day Book</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          <EXPLODEFLAG>Yes</EXPLODEFLAG>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>
`.trim();
```
**Observation**: The `<STATICVARIABLES>` block contains only `<SVEXPORTFORMAT>` and `<EXPLODEFLAG>`. It omits `<SVFROMDATE>` and `<SVTODATE>`. In Tally Prime and Tally.ERP 9, when date variables are omitted from `Day Book` exports, Tally defaults to `##SVCURRENTDATE` (a single day). Historical transactions are completely excluded from the HTTP response.

#### B. Ingestion Voucher Handling (`src/services/autoSyncService.ts:660-727`)
```typescript
    // --- Process Vouchers ---
    if (parsedData.vouchers && parsedData.vouchers.length > 0) {
      const salesToUpsert: any[] = [];
      const purchasesToUpsert: any[] = [];
      
      for (const vch of parsedData.vouchers) {
        if (!vch.voucherNumber) continue;

        if (vch.voucherType === "Sales") {
          ...
          salesToUpsert.push({
             organization_id: orgId,
             invoice_number: vch.voucherNumber,
             subtotal: vch.amount,
             total: vch.amount,
             tax: 0,
             payment_method: "Credit",
             customer_id: customerId,
             created_by: userId || "sync_daemon",
             created_at: vch.date ? `${vch.date}T10:00:00.000Z` : new Date().toISOString(),
          });
        } else if (vch.voucherType === "Purchase") {
          ...
        } else {
          unsupportedVoucherTypes.add(vch.voucherType);
        }
      }
```
**Observation**:
- Line items are not persisted: neither `sale_items` nor `purchase_invoice_items` are inserted.
- All non-Sales/Purchase vouchers (`Receipt`, `Payment`, `Journal`, `Credit Note`, `Debit Note`) trigger `unsupportedVoucherTypes.add(vch.voucherType)`.
- If a Day Book XML contains Receipts or Payments, `executeDirectSyncIngestion` marks the sync as `status: "partial"` or `status: "failed"` and returns an error: `"Unsupported voucher types: Receipt, Payment"`.

#### C. Schema Mismatch on `credit_transactions` (`src/services/autoSyncService.ts:608-620` vs `src/integrations/supabase/types.ts:58-95`)
In `src/services/autoSyncService.ts:610-619`:
```typescript
                transactionsToInsert.push({
                  organization_id: orgId,
                  customer_id: cust.id,
                  type: "opening_balance",
                  amount: origParty.openingBalance,
                  payment_mode: "adjustment",
                  reference_id: "SYNC-OPENING",
                  status: "completed",
                  transaction_date: new Date().toISOString()
                });
```
In `src/integrations/supabase/types.ts:58-70`:
```typescript
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          description: string | null
          id: string
          organization_id: string
          party_id: string
          party_type: string
          reference_id: string | null
          type: string
        }
```
**Observation**: `customer_id`, `supplier_id`, `payment_mode`, `status`, and `transaction_date` are not columns on `credit_transactions`. The Supabase schema specifies `party_id`, `party_type` (`"customer"` or `"supplier"`), `created_by`, `description`, `reference_id`, `type`, and `amount`.

#### D. Bank & Cash Ignored in Live Sync (`src/services/autoSyncService.ts:404-413`)
```typescript
export async function executeDirectSyncIngestion(
  orgId: string,
  userId: string,
  parsedData: {
    items: Partial<InventoryItem>[];
    parties: Partial<Party>[];
    vouchers?: TallyVoucher[];
  },
```
**Observation**: `executeDirectSyncIngestion` does not accept `bankAccounts` or `cashInHand` in its input parameter signature. In `src/pages/TallyImport.tsx:168-177`:
```typescript
        const result = await executeDirectSyncIngestion(
          orgId,
          user?.id || "sync-user",
          {
            items: syncConfig.syncScope.items ? tallyData.items : [],
            parties: syncConfig.syncScope.parties ? tallyData.parties : [],
            vouchers: syncConfig.syncScope.vouchers ? getAllTallyVouchers(tallyData) : [],
          },
```
Even though `tallyData` has `tallyData.bankAccounts` and `tallyData.cashInHand`, they are completely dropped and never passed to the ingestion engine.

#### E. Storage Keys in CashAndBank (`src/pages/CashAndBank.tsx:93-96`)
```typescript
  const storageKeyAccounts = `credsmart_bank_accounts_${orgId || "no_org"}`;
  const storageKeyTransactions = `credsmart_bank_txns_${orgId || "no_org"}`;
  const storageKeyCash = `credsmart_cash_in_hand_${orgId || "no_org"}`;
  const storageKeyUnlinked = `credsmart_unlinked_balance_${orgId || "no_org"}`;
```
**Observation**: The Cash and Bank screen looks for `credsmart_bank_accounts_{orgId}` and `credsmart_cash_in_hand_{orgId}` in `localStorage`.

#### F. UI Scope Checkboxes Missing Vouchers & Banks (`src/pages/TallyImport.tsx:2097-2112`)
```typescript
                  <div className="flex items-center gap-3 flex-wrap">
                    {[
                      { key: "items" as const, label: "Stock & Prices" },
                      { key: "parties" as const, label: "Customers & Suppliers" },
                      { key: "balances" as const, label: "Opening & Running Balances" },
                    ].map((sc) => (
```
**Observation**: The entities checkbox group only has `items`, `parties`, and `balances`. Neither `vouchers` nor `banks` are rendered as user-toggleable checkboxes in the Auto-Sync schedule & scope section.

---

### 2. Logic Chain

1. **Step 1 (Query)**: When a user triggers Live Sync, `fetchLiveTallyData()` issues `TALLY_EXPORT_DAYBOOK_XML`. Because the query has no `<SVFROMDATE>` and `<SVTODATE>`, Tally's TDL engine exports only the current day. If that day has no activity, `salesVouchers`, `purchaseVouchers`, etc. are returned empty.
2. **Step 2 (Scope & Settings)**: When `executeDirectSyncIngestion` runs, `syncConfig.syncScope.vouchers` defaults to `false` in `getDefaultSyncConfig`. Because the UI has no checkbox for `vouchers`, users cannot enable voucher sync without developer console intervention.
3. **Step 3 (Voucher Ingestion)**: Even if vouchers are parsed, `executeDirectSyncIngestion` rejects `Receipt`, `Payment`, `Journal`, `Credit Note`, and `Debit Note` as unsupported. Furthermore, for `Sales` and `Purchase`, it inserts parent records into `sales` and `purchase_invoices` without extracting or inserting rows into `sale_items` and `purchase_invoice_items`.
4. **Step 4 (Bank & Cash Disconnect)**: `parseTallyXml` correctly extracts bank accounts and cash in hand. However, `executeDirectSyncIngestion` does not accept bank accounts or cash in hand in its arguments. In addition, `<TallyImportModal>` embedded in `TallyImport.tsx` lacks the `onImportBankAccounts` prop, meaning bank accounts uploaded via the modal are parsed in the preview but discarded on final import.
5. **Step 5 (Opening Balances DB Failure)**: During party ingestion, `transactionsToInsert` attempts to insert into `credit_transactions` with mismatched property names (`customer_id`, `supplier_id`), causing Postgres/Supabase insert rejections.

---

### 3. Caveats

1. **Database Schema for Bank Accounts**: `src/integrations/supabase/types.ts` does not contain a static TypeScript definition for `bank_accounts`. In `src/pages/TallyImport.tsx:761`, the code probes `supabase.from("bank_accounts").select("id").limit(1)`. If the table does not exist or fails, it falls back to `localStorage.setItem(storageKeyAccounts, ...)`. Any implementation must preserve this dual-mode pattern (DB with localStorage fallback) so that environments without the `bank_accounts` table continue to function seamlessly.
2. **Cash in Hand Storage**: `cash_in_hand` has no table in Supabase; `CashAndBank.tsx` reads exclusively from `localStorage.getItem("credsmart_cash_in_hand_" + orgId)`. Ingesting cash must update this key and dispatch a sync event.
3. **Negative Inventory Amounts in Tally**: In Tally XML for Sales vouchers, `<AMOUNT>` on inventory entries is typically negative (representing a credit to sales/inventory). Parsers must use `Math.abs()` when creating positive line item totals for `sale_items.line_total`.

---

### 4. Conclusion

The specification survey establishes the complete blueprint required for implementation:

1. **Update `TALLY_EXPORT_DAYBOOK_XML`** in `src/services/autoSyncService.ts` and `scripts/credsmart-sync-agent/index.cjs`:
   Include `<SVFROMDATE>20200401</SVFROMDATE>` and `<SVTODATE>20261231</SVTODATE>` (or a dynamic function `getTallyDaybookXml(fromDate?: string, toDate?: string)` defaulting to a multi-year historical range).
2. **Expand `SyncConfig` Interface and Defaults**:
   - Add `banks: boolean` to `SyncConfig.syncScope`.
   - Set `syncScope.vouchers = true` and `syncScope.banks = true` by default in `getDefaultSyncConfig`.
   - Add `banks: number` to `lastSyncStats`.
3. **Refactor `executeDirectSyncIngestion` in `autoSyncService.ts`**:
   - Accept `bankAccounts?: TallyBankAccount[]` and `cashInHand?: number`.
   - Persist bank accounts to `bank_accounts` / localStorage key `credsmart_bank_accounts_{orgId}`.
   - Persist cash to `credsmart_cash_in_hand_{orgId}`.
   - Fix party opening balances to insert into `credit_transactions` with schema: `{ organization_id, party_id, party_type, amount, type: "opening_balance", description, reference_id, created_by }`.
   - Ingest `sale_items` for each `Sales` voucher.
   - Ingest `purchase_invoice_items` for each `Purchase` voucher.
   - Ingest `Receipt` vouchers as `{ type: "payment", party_type: "customer", party_id, amount, reference_id: vch.voucherNumber, description: vch.narration }` in `credit_transactions`.
   - Ingest `Payment` vouchers as `{ type: "payment", party_type: "supplier", party_id, amount, reference_id: vch.voucherNumber, description: vch.narration }` in `credit_transactions`.
   - Ingest `Journal` / Expense vouchers into `expenses` (`expense_number: vch.voucherNumber`, `category`, `amount`, `date`, `description`).
4. **Wire UI Controls in `src/pages/TallyImport.tsx`**:
   - Add checkboxes for `Vouchers` (`syncScope.vouchers`) and `Bank & Cash` (`syncScope.banks`).
   - Add `Vouchers Synced` and `Banks Synced` stat cards in the Auto-Sync overview bar.
   - Pass `onImportBankAccounts` to `<TallyImportModal>`.
   - Ensure `handleLiveTallySync` passes `tallyData.bankAccounts` and `tallyData.cashInHand` to `executeDirectSyncIngestion`.

---

### 5. Verification Method

To verify these specifications independently:

1. **Static Schema Verification**:
   Inspect `src/integrations/supabase/types.ts` for tables:
   - `credit_transactions` (lines 58–104)
   - `sales` (lines 720–789)
   - `sale_items` (lines 666–719)
   - `purchase_invoices` (lines 503–556)
   - `purchase_invoice_items` (lines 449–502)
   - `expenses` (lines 146–195)
2. **Local Storage Keys Verification**:
   Inspect `src/pages/CashAndBank.tsx` (lines 93–96) for:
   - `credsmart_bank_accounts_${orgId}`
   - `credsmart_cash_in_hand_${orgId}`
3. **Day Book & Auto-Sync Verification**:
   Inspect `src/services/autoSyncService.ts` (lines 174–191) for `<REPORTNAME>Day Book</REPORTNAME>` and lack of date tags.
4. **Test Suite Verification Command**:
   Run Vitest test suites once implementation commences:
   ```bash
   npx vitest run src/test/tallyImport.test.ts src/test/tallyBridge.test.ts
   ```
   All tests in `tallyImport.test.ts` and `tallyBridge.test.ts` verify parser accuracy, XML DOM sanitization, multi-file aggregations, and bridge proxying.
