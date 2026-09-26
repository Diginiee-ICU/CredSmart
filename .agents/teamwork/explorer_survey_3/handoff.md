# Handoff Report — explorer_survey_3: UI Components and Test Suites Survey

## 1. Observation

### 1.1 TallyImportModal Component (`src/components/TallyImportModal.tsx`)
- **Definition & Interface** (`src/components/TallyImportModal.tsx:56-66`):
  ```typescript
  export interface TallyImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportItems?: (items: Partial<InventoryItem>[], conflictMode?: ConflictMode) => Promise<void>;
    onImportParties?: (parties: Partial<Party>[], conflictMode?: ConflictMode) => Promise<void>;
    onImportBankAccounts?: (banks: TallyBankAccount[], cashInHand: number) => Promise<void>;
    onImportVouchers?: (vouchers: TallyVoucher[], conflictMode?: ConflictMode) => Promise<void>;
    defaultTab?: "items" | "parties" | "all";
    initialSoftware?: SupportedSoftware;
    onAutoSearch?: () => void;
  }
  ```
- **Modal Internal State & Checkboxes** (`src/components/TallyImportModal.tsx:142-145`, `877-990`):
  - State variables: `importItems`, `importParties`, `importBanks`, `importVouchers`.
  - Preview tabs: `items` (line 695), `parties` (line 722), `banks` (line 763), `vouchers` (line 811).
  - Step 3 Options checkboxes: Stock Items, Parties & Ledgers, Bank & Cash Accounts, Ledger Statement Vouchers.
  - Step 4 Import execution (`src/components/TallyImportModal.tsx:293-301`):
    ```typescript
    if (importBanks && parseResult.bankAccounts.length > 0 && onImportBankAccounts) {
      try {
        await onImportBankAccounts(parseResult.bankAccounts, parseResult.cashInHand);
        stats.banksImported = parseResult.bankAccounts.length;
      } catch (e: unknown) {
        stats.banksFailed = parseResult.bankAccounts.length;
        stats.errors.push(`Bank accounts import failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    ```
- **Mounting Locations across the Codebase**:
  1. `src/pages/TallyImport.tsx:2887-2901`:
     ```tsx
     <TallyImportModal
       isOpen={modalOpen}
       onClose={() => setModalOpen(false)}
       initialSoftware={selectedSoftware}
       onAutoSearch={handleAutoSearchTally}
       onImportItems={async (items, mode) => {
         await handleDirectSaveItems(items, mode);
       }}
       onImportParties={async (parties, mode) => {
         await handleDirectSaveParties(parties, mode);
       }}
       onImportVouchers={async (vouchers, mode) => {
         await handleDirectSaveVouchers(vouchers, mode);
       }}
     />
     ```
     **Direct observation**: `onImportBankAccounts` is **NOT passed at all**!
  2. `src/components/items/ProductLibraryModal.tsx:993-1003`: Passes only `onImportItems`, `defaultTab="items"`.
  3. `src/components/parties/PartyExcelUploadModal.tsx:610-620`: Passes only `onImportParties`, `defaultTab="parties"`.

### 1.2 Auto-Sync Dashboard & Live Sync UI (`src/pages/TallyImport.tsx`)
- **Route & Page Identity**:
  - The live route is `/tally-import` mapped to `TallyImport` in `src/App.tsx:235` and `src/config/routes.ts:96`. (There is no separate `TallyIntegration.tsx`; the integration dashboard and file import are unified in `src/pages/TallyImport.tsx`).
- **Entity Scope Checkboxes Rendered in UI** (`src/pages/TallyImport.tsx:2096-2112`):
  ```tsx
  <div className="flex items-center gap-3 flex-wrap">
    {[
      { key: "items" as const, label: "Stock & Prices" },
      { key: "parties" as const, label: "Customers & Suppliers" },
      { key: "balances" as const, label: "Opening & Running Balances" },
    ].map((sc) => (
      <label key={sc.key} className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-foreground select-none">
        <input
          type="checkbox"
          checked={syncConfig.syncScope[sc.key]}
          onChange={() => handleToggleScope(sc.key)}
          className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
        />
        <span>{sc.label}</span>
      </label>
    ))}
  </div>
  ```
  **Direct observation**: Only 3 entity checkboxes (`items`, `parties`, `balances`) are rendered. `vouchers` is NOT rendered in the list. `banks` does not exist in `syncConfig.syncScope`.
- **Sync Stats Cards Rendered in UI** (`src/pages/TallyImport.tsx:1823-1836`):
  - Card 1: "Items Synced" (`{syncConfig.lastSyncStats?.items ?? 0} Products`)
  - Card 2: "Parties Synced" (`{syncConfig.lastSyncStats?.parties ?? 0} Ledgers`)
  - **Direct observation**: No cards for Balances Synced, Vouchers Synced, or Banks Synced.
- **Sync Scope and Stats Interfaces** (`src/services/autoSyncService.ts:23-46`):
  ```typescript
  export interface SyncConfig {
    organizationId: string;
    enabled: boolean;
    pairingToken: string;
    selectedSoftware: SupportedSoftware;
    tallyHost: string;
    syncIntervalMinutes: number;
    syncScope: {
      items: boolean;
      parties: boolean;
      balances: boolean;
      vouchers: boolean;
    };
    conflictStrategy: "erp_master" | "credsmart_master" | "latest_timestamp";
    lastSyncAt?: string;
    lastSyncStatus?: "success" | "partial" | "failed" | "idle";
    lastSyncStats?: {
      items: number;
      parties: number;
      vouchers: number;
    };
    connectedDeviceName?: string;
    history: SyncAuditLog[];
  }
  ```
  **Direct observation**:
  - `syncScope` lacks `banks: boolean`.
  - `lastSyncStats` lacks `banks: number` and `balances: number`.
  - `SyncAuditLog` (lines 10-21) lacks `banksSynced` and `balancesSynced`.
  - `SyncExecutionResult` (lines 48-56) lacks `banksCount` and `balancesCount`.

### 1.3 Ingestion Engine Deficiencies in `src/services/autoSyncService.ts`
- **Credit Transactions Schema Mismatch** (`src/services/autoSyncService.ts:609-655`):
  ```typescript
  transactionsToInsert.push({
    organization_id: orgId,
    customer_id: cust.id,       // <-- INVALID COLUMN: table has party_id & party_type
    type: "opening_balance",
    amount: origParty.openingBalance,
    payment_mode: "adjustment",  // <-- INVALID COLUMN: not in credit_transactions
    reference_id: "SYNC-OPENING",
    status: "completed",         // <-- INVALID COLUMN: not in credit_transactions
    transaction_date: new Date().toISOString() // <-- INVALID COLUMN: created_at used instead
  });
  // ...
  const { error } = await supabase.from("credit_transactions").insert(transactionsToInsert.slice(i, i + 1000));
  if (error) console.error("Failed to insert credit_transactions:", error.message);
  ```
  Schema from `src/integrations/supabase/types.ts:58-82`:
  - Columns: `id`, `organization_id`, `party_id`, `party_type`, `amount`, `type`, `description`, `reference_id`, `created_at`, `created_by`.
  - `created_by` is **mandatory non-null string**, but omitted in `autoSyncService.ts`.
  - `customer_id` and `supplier_id` do not exist.
- **Vouchers Line Item Ingestion** (`src/services/autoSyncService.ts:664-726`):
  - In `autoSyncService.ts`, sales are inserted into `sales`, but line items are **never inserted into `sale_items`**.
  - Purchases are inserted into `purchase_invoices`, but line items are **never inserted into `purchase_invoice_items`**.
  - Receipts and Payments are flagged as `unsupportedVoucherTypes` and completely omitted from `credit_transactions`.
  - Expenses are flagged as `unsupportedVoucherTypes` and omitted from `expenses`.
- **Bank and Cash Accounts Ingestion**:
  - In `src/services/autoSyncService.ts:404-411`: `executeDirectSyncIngestion` does not take `banks` or `bankAccounts` or `cashInHand` in `parsedData`.
  - There is zero bank account or cash-in-hand ingestion in live auto-sync.
- **Tally Day Book XML Query Date Boundaries** (`src/services/autoSyncService.ts:174-191`):
  ```xml
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
  **Direct observation**: `<SVFROMDATE>` and `<SVTODATE>` are **missing**.

### 1.4 Ingestion Engine Deficiencies in `src/pages/TallyImport.tsx`
- In `handleDirectSaveVouchers` (`src/pages/TallyImport.tsx:1237-1420`):
  - Only processes `Sales` and `Purchase`.
  - Receipts and payments are completely ignored (not inserted into `credit_transactions`).
  - Expenses are completely ignored (not inserted into `expenses`).
- In `handleDirectSaveParties` (`src/pages/TallyImport.tsx:1204`):
  - Uses `type: opBal >= 0 ? "credit" : "payment"`, NOT `type: "opening_balance"`.
  - Omits `reference_id`.
- There is NO `handleDirectSaveBankAccounts` function in `TallyImport.tsx`.

### 1.5 Cash and Bank Storage Conventions (`src/pages/CashAndBank.tsx`)
- Storage Keys (`src/pages/CashAndBank.tsx:93-96`):
  - `credsmart_bank_accounts_${orgId || "no_org"}` (array of `BankAccount`)
  - `credsmart_cash_in_hand_${orgId || "no_org"}` (number as string)
  - `credsmart_bank_txns_${orgId || "no_org"}` (array of `BankTransaction`)
- Bank Account Schema in Local Storage (`src/pages/CashAndBank.tsx:46-57`):
  ```typescript
  export interface BankAccount {
    id: string;
    name: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountType: "savings" | "current" | "overdraft";
    balance: number;
    upiId?: string;
    isPrimary?: boolean;
    createdAt: string;
  }
  ```

### 1.6 Existing Test Suites & Runners
- **Vitest Config** (`vitest.config.ts`):
  - Environment: `jsdom`.
  - Globals: `true`.
  - Setup: `./src/test/setup.ts` (`window.matchMedia` stub).
  - Include: `src/**/*.{test,spec}.{ts,tsx}`.
- **Existing Test Files**:
  - `src/test/tallyBridge.test.ts` (94 lines): Tests node bridge child process (`scripts/credsmart-sync-agent/index.cjs`), token validation, XML POST proxying.
  - `src/test/tallyImport.test.ts` (555 lines): Tests XML parsing for stock items, party classification, bank/cash parsing, voucher parsing, CSV daybook parsing, multi-file folder aggregation.
  - `src/test/example.test.ts` (143 lines): Tests RBAC and GSTIN/PAN validation.
  - `src/test/invoiceCalculations.test.ts` (160 lines): Tests invoice item calculations.
  - `src/test/networkInvoicing.test.ts` (797 lines): Tests B2B network invoicing using mock localStorage.
  - `src/test/unitConversionBill.test.ts` (124 lines): Tests unit conversions.

---

## 2. Logic Chain

1. **Premise 1**: Acceptance Criteria R3 states: *"The Auto-Sync dashboard and File Import modals must expose explicit controls and status indicators for all entity types (Items, Parties, Balances, Invoices/Vouchers, and Bank/Cash), with safe defaults enabling full synchronization."*
   - **Observation**: `TallyImportModal.tsx` contains the UI components (preview tabs, option toggles) for Items, Parties, Banks, and Vouchers, and exposes callback props for each. However, `src/pages/TallyImport.tsx:2887-2901` does not pass `onImportBankAccounts`, and has no handler to persist bank accounts or cash-in-hand.
   - **Observation**: `src/pages/TallyImport.tsx:2097-2112` only renders 3 checkboxes for auto-sync (`items`, `parties`, `balances`). Vouchers and Banks checkboxes are omitted.
   - **Observation**: `src/pages/TallyImport.tsx:1823-1836` only renders 2 stat cards (`items`, `parties`). Cards for Balances, Vouchers, and Banks are omitted.
   - **Inference**: Both the modal and the auto-sync dashboard fail Acceptance Criteria R3 until:
     - `onImportBankAccounts` is implemented and wired into `<TallyImportModal>` in `TallyImport.tsx`.
     - Auto-sync scope renders all 5 checkboxes (`items`, `parties`, `balances`, `vouchers`, `banks`).
     - Auto-sync dashboard displays stat cards for all 5 entities.

2. **Premise 2**: Acceptance Criteria states: *"Party opening balances are inserted into `credit_transactions` matching the database schema (`party_id`, `party_type`, `amount`, `type: "opening_balance"`, `description`, `reference_id`, `organization_id`, `created_by`)."*
   - **Observation**: In `autoSyncService.ts:610-645`, `transactionsToInsert` specifies `customer_id` / `supplier_id` (invalid columns), `payment_mode` (invalid), `status` (invalid), `transaction_date` (invalid), and omits `created_by` (required). In `TallyImport.tsx:1204`, opening balances are inserted with `type: opBal >= 0 ? "credit" : "payment"`, not `"opening_balance"`, and without `reference_id`.
   - **Inference**: Opening balance ingestion fails schema validation and does not conform to the required `type: "opening_balance"` and column mapping.

3. **Premise 3**: Acceptance Criteria states: *"Bank accounts from Tally are stored in `bank_accounts` (or localStorage key `credsmart_bank_accounts_{orgId}`). Cash-in-hand ledger balance is stored in `credsmart_cash_in_hand_{orgId}`. Bank accounts are imported when using both Live Sync and `<TallyImportModal>`."*
   - **Observation**: Neither live sync (`executeDirectSyncIngestion`) nor modal import (`TallyImportModal` mounting in `TallyImport.tsx`) saves bank accounts or cash-in-hand.
   - **Inference**: Bank & Cash ingestion must be implemented in both pipelines to satisfy the criteria.

4. **Premise 4**: Acceptance Criteria states: *"Sales vouchers create entries in `sales` and corresponding item entries in `sale_items`. Purchase vouchers create entries in `purchase_invoices` and corresponding item entries in `purchase_invoice_items`. Customer receipts and supplier payments create corresponding `payment` records in `credit_transactions`. Indirect/Direct expenses create entries in `expenses`."*
   - **Observation**: `executeDirectSyncIngestion` omits item entries for sales and purchases, and discards receipts, payments, and expenses. `handleDirectSaveVouchers` processes sales and purchases with line items, but completely discards receipts, payments, and expenses.
   - **Inference**: Voucher handling across both live sync and modal import must be expanded to handle line items, receipts/payments in `credit_transactions`, and expenses in `expenses`.

5. **Premise 5**: Acceptance Criteria states: *"`TALLY_EXPORT_DAYBOOK_XML` includes `<SVFROMDATE>` and `<SVTODATE>` parameters."*
   - **Observation**: In `src/services/autoSyncService.ts:174-191`, `TALLY_EXPORT_DAYBOOK_XML` contains only `<REPORTNAME>Day Book</REPORTNAME>`, `<SVEXPORTFORMAT>`, and `<EXPLODEFLAG>Yes</EXPLODEFLAG>`.
   - **Inference**: `TALLY_EXPORT_DAYBOOK_XML` must include `<SVFROMDATE>` and `<SVTODATE>`.

6. **Premise 6**: Acceptance Criteria states: *"Vitest test suite passes with zero regressions."*
   - **Observation**: The current test suite in `src/test/tallyImport.test.ts` only validates parsing logic. There are zero unit or integration tests for:
     - `executeDirectSyncIngestion` (products, batches, credit transactions, sales, purchases, receipts, payments, expenses, banks).
     - `<TallyImportModal>` callback wiring.
     - Presence of `<SVFROMDATE>` and `<SVTODATE>` in `TALLY_EXPORT_DAYBOOK_XML`.
     - Presence of 5 entity scope checkboxes and 5 sync stats cards in the auto-sync UI.
   - **Inference**: New tests must be added to cover all these Acceptance Criteria without breaking existing parser tests.

---

## 3. Caveats

1. **Read-only Investigation**: In accordance with explorer identity constraints, no application or test code was modified during this survey.
2. **Interactive Command Timeout**: Running terminal command `npm test` timed out on interactive permission prompt. However, all test files and source files were inspected directly. Vitest runs in `jsdom` with path alias `@/` mapped to `./src`.
3. **Database Schema Constraints**: `bank_accounts` table is not present in `src/integrations/supabase/types.ts`. The system relies on localStorage keys `credsmart_bank_accounts_{orgId}` and `credsmart_cash_in_hand_{orgId}` as defined in `CashAndBank.tsx` and accepted in `ORIGINAL_REQUEST.md`.

---

## 4. Conclusion & Required Actionable Changes

### 4.1 UI Component Fixes

#### A. `<TallyImportModal>` Mounting in `src/pages/TallyImport.tsx`
- Implement `handleDirectSaveBankAccounts`:
  ```typescript
  const handleDirectSaveBankAccounts = async (banks: TallyBankAccount[], cashInHand: number) => {
    if (!orgId) return;
    const storageKeyAccounts = `credsmart_bank_accounts_${orgId}`;
    const storageKeyCash = `credsmart_cash_in_hand_${orgId}`;
    const existingRaw = localStorage.getItem(storageKeyAccounts);
    let existingAccounts = [];
    try { existingAccounts = existingRaw ? JSON.parse(existingRaw) : []; } catch { existingAccounts = []; }

    const mappedAccounts = banks.map((b, i) => ({
      id: `bank-${Date.now()}-${i}`,
      name: b.accountName || b.name,
      bankName: b.bankName || b.accountName || b.name,
      accountNumber: b.accountNumber || "—",
      ifscCode: b.ifscCode || b.ifsc || "—",
      accountType: "current" as const,
      balance: b.balance,
      isPrimary: existingAccounts.length === 0 && i === 0,
      createdAt: new Date().toISOString(),
    }));

    localStorage.setItem(storageKeyAccounts, JSON.stringify([...existingAccounts, ...mappedAccounts]));
    if (cashInHand !== undefined && cashInHand !== null) {
      localStorage.setItem(storageKeyCash, cashInHand.toString());
    }
    toast.success(`Imported ${mappedAccounts.length} bank account(s) and cash balance.`);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("credsmart_bank_updated", { detail: { orgId } }));
    }
  };
  ```
- Pass `onImportBankAccounts={handleDirectSaveBankAccounts}` to `<TallyImportModal>` at `src/pages/TallyImport.tsx:2887`.
- Also update `handleAutoSearchTally` to persist `data.bankAccounts` and `data.cashInHand`.

#### B. Voucher Ingestion in `handleDirectSaveVouchers` (`src/pages/TallyImport.tsx`)
- In addition to Sales and Purchases, handle:
  - `Receipt` vouchers: Insert payment record in `credit_transactions` (`party_id: customerId`, `party_type: "customer"`, `amount`, `type: "payment"`, `reference_id: vch.voucherNumber`, `created_by: user?.id || "admin"`).
  - `Payment` vouchers: Insert payment record in `credit_transactions` (`party_id: supplierId`, `party_type: "supplier"`, `amount`, `type: "payment"`, `reference_id: vch.voucherNumber`, `created_by: user?.id || "admin"`).
  - `Expense` / `Payment` with expense ledgers: Insert into `expenses` (`organization_id`, `category`, `amount`, `date`, `description: vch.narration`, `expense_number: vch.voucherNumber`, `created_by`).

#### C. Auto-Sync Scope Checkboxes in `src/pages/TallyImport.tsx`
- Update `SyncConfig["syncScope"]` in `autoSyncService.ts` to include `banks: boolean`.
- Update checkbox rendering array at `src/pages/TallyImport.tsx:2097`:
  ```tsx
  {[
    { key: "items" as const, label: "Stock & Prices" },
    { key: "parties" as const, label: "Customers & Suppliers" },
    { key: "balances" as const, label: "Opening & Running Balances" },
    { key: "vouchers" as const, label: "Invoices & Vouchers" },
    { key: "banks" as const, label: "Bank & Cash Accounts" },
  ]}
  ```

#### D. Auto-Sync Dashboard Stats in `src/pages/TallyImport.tsx`
- Update `lastSyncStats` in `SyncConfig` to include `items`, `parties`, `balances`, `vouchers`, `banks`.
- Render 5 stats cards in `TallyImport.tsx:1823` for all 5 entity types.

### 4.2 Auto-Sync Service Fixes (`src/services/autoSyncService.ts`)
- **Add Date Range to `TALLY_EXPORT_DAYBOOK_XML`**:
  ```xml
  <STATICVARIABLES>
    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
    <EXPLODEFLAG>Yes</EXPLODEFLAG>
    <SVFROMDATE>20000101</SVFROMDATE>
    <SVTODATE>20991231</SVTODATE>
  </STATICVARIABLES>
  ```
- **Fix `credit_transactions` Opening Balances**:
  Insert matching columns: `party_id: cust.id` (or `supp.id`), `party_type: "customer"` (or `"supplier"`), `amount`, `type: "opening_balance"`, `description: "Tally Opening Balance"`, `reference_id: "SYNC-OPENING"`, `organization_id: orgId`, `created_by: userId || "sync_daemon"`.
- **Implement Bank & Cash Accounts Ingestion**:
  Save bank accounts and cash in hand to localStorage keys when `syncConfig.syncScope.banks` is enabled.
- **Implement Full Voucher Ingestion**:
  - Insert line items into `sale_items` for sales.
  - Insert line items into `purchase_invoice_items` for purchases.
  - Ingest receipts and payments into `credit_transactions`.
  - Ingest expenses into `expenses`.

### 4.3 Test Suite Expansion (`src/test/`)
- In `src/test/tallyImport.test.ts` (or dedicated `src/test/tallyIngestion.test.ts`):
  1. Test that `TALLY_EXPORT_DAYBOOK_XML` contains `<SVFROMDATE>` and `<SVTODATE>`.
  2. Test `executeDirectSyncIngestion` with mocked Supabase client and verify:
     - Stock items upserted into `products` and `product_batches`.
     - Customers and suppliers upserted.
     - Party opening balances inserted into `credit_transactions` with `type: "opening_balance"`, `party_id`, `party_type`, `created_by`.
     - Bank accounts and cash-in-hand saved to `credsmart_bank_accounts_{orgId}` and `credsmart_cash_in_hand_{orgId}`.
     - Sales vouchers create entries in `sales` and `sale_items`.
     - Purchase vouchers create entries in `purchase_invoices` and `purchase_invoice_items`.
     - Receipts and payments create entries in `credit_transactions`.
     - Expenses create entries in `expenses`.
  3. Test that default `syncScope` and `lastSyncStats` contain all 5 entities (`items`, `parties`, `balances`, `vouchers`, `banks`).

---

## 5. Verification Method

To independently verify these findings:
1. **Inspect `<TallyImportModal>` usage**:
   - File: `src/pages/TallyImport.tsx:2887-2901`
   - Check props passed: verify `onImportBankAccounts` is missing.
2. **Inspect Auto-Sync UI checkboxes**:
   - File: `src/pages/TallyImport.tsx:2096-2112`
   - Check rendered array: verify only 3 checkboxes (`items`, `parties`, `balances`) are rendered.
3. **Inspect Auto-Sync Stats display**:
   - File: `src/pages/TallyImport.tsx:1823-1836`
   - Check stat cards: verify only 2 cards (`items`, `parties`) are rendered.
4. **Inspect `TALLY_EXPORT_DAYBOOK_XML`**:
   - File: `src/services/autoSyncService.ts:174-191`
   - Check static variables: verify `<SVFROMDATE>` and `<SVTODATE>` are missing.
5. **Inspect `credit_transactions` insertion**:
   - File: `src/services/autoSyncService.ts:609-645`
   - Verify columns: `customer_id`, `supplier_id`, `payment_mode`, `status`, `transaction_date` vs `src/integrations/supabase/types.ts:58-95`.
6. **Inspect test coverage**:
   - Files: `src/test/tallyImport.test.ts` and `src/test/tallyBridge.test.ts`.
   - Verify absence of ingestion and UI validation tests.
