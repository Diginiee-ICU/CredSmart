# Database Schema & Persistence Exploration Report

**Explorer**: `explorer_survey_2` (Role: Database Schema Explorer)  
**Target Project**: CredSmart (`c:/Users/Rudra/Desktop/Git/CredSmart`)  
**Timestamp**: 2026-09-26T03:27:00Z  

---

## 1. Observation

Direct examination of `src/integrations/supabase/types.ts`, `supabase/migrations/*.sql`, `src/pages/CashAndBank.tsx`, `src/pages/TallyImport.tsx`, `src/services/autoSyncService.ts`, `src/services/documentsService.ts`, `src/services/stockService.ts`, `src/pages/Expenses.tsx`, `src/utils/ledgerReconciliation.ts`, and test files yielded the following verified facts:

### 1.1 Complete Entity Schema Matrix

#### A. Table `products`
* **Definition Locations**: `types.ts:375-424`, `supabase/migrations/20260211173918_...sql:48-60`, `20260212030950_...sql:3`
* **Columns**:
  * `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()` (TypeScript: `string`, optional on insert)
  * `organization_id`: `UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE` (TypeScript: `string`, required on insert)
  * `name`: `TEXT NOT NULL` (TypeScript: `string`, required on insert)
  * `barcode`: `TEXT DEFAULT ''` (TypeScript: `string | null`, optional on insert)
  * `sku`: `TEXT DEFAULT ''` (TypeScript: `string | null`, optional on insert)
  * `brand`: `TEXT DEFAULT ''` (TypeScript: `string | null`, optional on insert)
  * `category`: `TEXT DEFAULT ''` (TypeScript: `string | null`, optional on insert)
  * `tags`: `JSONB DEFAULT '{}'` (TypeScript: `Json | null`, optional on insert)
  * `image_url`: `TEXT DEFAULT ''` (TypeScript: `string | null`, optional on insert)
  * `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()` (TypeScript: `string`, optional on insert)
  * `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()` (TypeScript: `string`, optional on insert)
* **Metadata Convention in `tags` (JSONB)**:
  CredSmart stores extended inventory attributes inside `tags`:
  `{ selling_price: number, purchase_price: number, mrp: number, unit: string, alt_unit?: string, alt_unit_conversion?: number, gst_rate: number, hsn_code: string | null, stock: number, opening_stock: number, min_stock_alert: number, imported_from?: string, imported_at?: string, auto_synced?: boolean }`.

#### B. Table `product_batches`
* **Definition Locations**: `types.ts:321-374`, `supabase/migrations/20260211173918_...sql:63-75`, `20260211182507_...sql:105`
* **Columns**:
  * `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()` (TypeScript: `string`, optional on insert)
  * `product_id`: `UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE` (TypeScript: `string`, required on insert)
  * `location_id`: `UUID REFERENCES public.locations(id) ON DELETE SET NULL` (TypeScript: `string | null`, optional on insert)
  * `batch_number`: `TEXT NOT NULL DEFAULT ''` (TypeScript: `string`, optional on insert; default `"BATCH-01"` or `"SYNC-BATCH-1"`)
  * `cost_price`: `NUMERIC(12,2) NOT NULL DEFAULT 0` (TypeScript: `number`, optional on insert)
  * `mrp`: `NUMERIC(12,2) NOT NULL DEFAULT 0` (TypeScript: `number`, optional on insert)
  * `stock`: `INTEGER NOT NULL DEFAULT 0` (TypeScript: `number`, optional on insert)
  * `expiry_date`: `DATE` (TypeScript: `string | null`, optional on insert; format: `YYYY-MM-DD`)
  * `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()` (TypeScript: `string`, optional on insert)
  * `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()` (TypeScript: `string`, optional on insert)
* **Constraints**:
  * Unique Index: `CREATE UNIQUE INDEX IF NOT EXISTS idx_product_batches_product_batch ON public.product_batches(product_id, batch_number);` (allows idempotent upserts).

#### C. Table `customers`
* **Definition Locations**: `types.ts:105-145`, `supabase/migrations/20260211184741_...sql:3-12`, `20260825_add_party_extended_fields.sql:6-14`
* **Columns**:
  * `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()` (TypeScript: `string`, optional on insert)
  * `organization_id`: `UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE` (TypeScript: `string`, required on insert)
  * `name`: `TEXT NOT NULL` (TypeScript: `string`, required on insert)
  * `phone`: `TEXT DEFAULT ''` (TypeScript: `string | null`, optional on insert)
  * `email`: `TEXT DEFAULT ''` (TypeScript: `string | null`, optional on insert)
  * `address`: `TEXT DEFAULT ''` (TypeScript: `string | null`, optional on insert)
  * `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()` (TypeScript: `string`, optional on insert)
  * `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()` (TypeScript: `string`, optional on insert)
  * *Extended Columns (migration `20260825`)*: `trade_name TEXT`, `pan TEXT`, `pincode TEXT`, `shipping_address TEXT`, `custom_fields JSONB`, `credit_limit NUMERIC`, `credit_period_days INTEGER`, `category TEXT`.

#### D. Table `suppliers`
* **Definition Locations**: `types.ts:831-875`, `supabase/migrations/20260211182507_...sql:3-13`, `20260825_add_party_extended_fields.sql:16-24`
* **Columns**:
  * `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()` (TypeScript: `string`, optional on insert)
  * `organization_id`: `UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE` (TypeScript: `string`, required on insert)
  * `name`: `TEXT NOT NULL` (TypeScript: `string`, required on insert)
  * `phone`: `TEXT DEFAULT ''` (TypeScript: `string | null`, optional on insert)
  * `email`: `TEXT DEFAULT ''` (TypeScript: `string | null`, optional on insert)
  * `gstin`: `TEXT DEFAULT ''` (TypeScript: `string | null`, optional on insert)
  * `address`: `TEXT DEFAULT ''` (TypeScript: `string | null`, optional on insert)
  * `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()` (TypeScript: `string`, optional on insert)
  * `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()` (TypeScript: `string`, optional on insert)
  * *Extended Columns (migration `20260825`)*: `trade_name TEXT`, `pan TEXT`, `pincode TEXT`, `shipping_address TEXT`, `custom_fields JSONB`, `credit_limit NUMERIC`, `credit_period_days INTEGER`, `category TEXT`.

#### E. Table `credit_transactions`
* **Definition Locations**: `types.ts:58-104`, `supabase/migrations/20260211184741_...sql:24-35`
* **Columns**:
  * `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()` (TypeScript: `string`, optional on insert)
  * `organization_id`: `UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE` (TypeScript: `string`, required on insert)
  * `party_type`: `TEXT NOT NULL CHECK (party_type IN ('customer', 'supplier'))` (TypeScript: `string`, required on insert)
  * `party_id`: `UUID NOT NULL` (TypeScript: `string`, required on insert; polymorphically references `customers.id` or `suppliers.id`)
  * `amount`: `NUMERIC NOT NULL DEFAULT 0` (TypeScript: `number`, optional/required on insert; always positive)
  * `type`: `TEXT NOT NULL CHECK (type IN ('credit', 'payment'))` (TypeScript: `string`, required on insert)
  * `description`: `TEXT DEFAULT ''` (TypeScript: `string | null`, optional on insert)
  * `reference_id`: `TEXT DEFAULT ''` (TypeScript: `string | null`, optional on insert)
  * `created_by`: `UUID NOT NULL` (TypeScript: `string`, required on insert; MUST be a valid RFC4122 UUID, NOT literal string "admin"!)
  * `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()` (TypeScript: `string`, optional on insert)
* **Check Constraints**:
  * `CONSTRAINT credit_transactions_party_type_check CHECK (party_type IN ('customer', 'supplier'))`
  * `CONSTRAINT credit_transactions_type_check CHECK (type IN ('credit', 'payment'))`

#### F. Table `bank_accounts`
* **Definition Status**: Not present in `types.ts` and no migration in `supabase/migrations/`.
* **Probing Pattern**:
  `const { error: probeError } = await supabase.from("bank_accounts").select("id").limit(1);`
  If `probeError` is null, columns inserted in `TallyImport.tsx:763-773` are:
  `organization_id`, `name`, `bank_name`, `account_number`, `ifsc_code`, `account_type`, `balance`, `is_primary`, `created_by`.
* **LocalStorage Fallback**:
  Key: `credsmart_bank_accounts_${orgId || "no_org"}`
  Format: JSON array of `BankAccount`:
  ```ts
  interface BankAccount {
    id: string; // e.g. `bank-${Date.now()}-${i}` or UUID
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

#### G. Table `sales`
* **Definition Locations**: `types.ts:720-789`, `supabase/migrations/20260211182754_...sql:3-16`, `20260211184741_...sql:45`
* **Columns**:
  * `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()` (TypeScript: `string`, optional on insert)
  * `organization_id`: `UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE` (TypeScript: `string`, required on insert)
  * `customer_id`: `UUID REFERENCES public.customers(id)` (TypeScript: `string | null`, optional on insert; NULLABLE)
  * `location_id`: `UUID REFERENCES public.locations(id)` (TypeScript: `string | null`, optional on insert)
  * `invoice_number`: `TEXT NOT NULL DEFAULT ''` (TypeScript: `string`, optional on insert)
  * `subtotal`: `NUMERIC NOT NULL DEFAULT 0` (TypeScript: `number`, optional on insert)
  * `discount_amount`: `NUMERIC NOT NULL DEFAULT 0` (TypeScript: `number`, optional on insert)
  * `discount_label`: `TEXT DEFAULT ''` (TypeScript: `string | null`, optional on insert)
  * `tax`: `NUMERIC NOT NULL DEFAULT 0` (TypeScript: `number`, optional on insert)
  * `total`: `NUMERIC NOT NULL DEFAULT 0` (TypeScript: `number`, optional on insert)
  * `payment_method`: `TEXT NOT NULL DEFAULT 'Cash'` (TypeScript: `string`, optional on insert; e.g. "Cash", "UPI", "Credit")
  * `created_by`: `UUID NOT NULL` (TypeScript: `string`, required on insert; MUST be valid UUID)
  * `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()` (TypeScript: `string`, optional on insert)

#### H. Table `sale_items`
* **Definition Locations**: `types.ts:666-719`, `supabase/migrations/20260211182754_...sql:24-36`
* **Columns**:
  * `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()` (TypeScript: `string`, optional on insert)
  * `sale_id`: `UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE` (TypeScript: `string`, required on insert)
  * `product_id`: `UUID REFERENCES public.products(id)` (TypeScript: `string | null`, optional on insert; NULLABLE)
  * `product_name`: `TEXT NOT NULL` (TypeScript: `string`, required on insert)
  * `batch_id`: `TEXT DEFAULT ''` (TypeScript: `string | null`, optional on insert)
  * `batch_number`: `TEXT DEFAULT ''` (TypeScript: `string | null`, optional on insert)
  * `mrp`: `NUMERIC NOT NULL DEFAULT 0` (TypeScript: `number`, optional on insert)
  * `quantity`: `INTEGER NOT NULL DEFAULT 1` (TypeScript: `number`, optional on insert)
  * `line_total`: `NUMERIC NOT NULL DEFAULT 0` (TypeScript: `number`, optional on insert)
  * `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()` (TypeScript: `string`, optional on insert)

#### I. Table `purchase_invoices`
* **Definition Locations**: `types.ts:503-556`, `supabase/migrations/20260211182507_...sql:25-36`
* **Columns**:
  * `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()` (TypeScript: `string`, optional on insert)
  * `organization_id`: `UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE` (TypeScript: `string`, required on insert)
  * `supplier_id`: `UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT` (TypeScript: `string`, required on insert; CRITICAL: NOT NULL)
  * `invoice_number`: `TEXT NOT NULL DEFAULT ''` (TypeScript: `string`, optional on insert)
  * `status`: `TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'received', 'partial'))` (TypeScript: `string`, optional on insert)
  * `notes`: `TEXT DEFAULT ''` (TypeScript: `string | null`, optional on insert)
  * `total_amount`: `NUMERIC NOT NULL DEFAULT 0` (TypeScript: `number`, optional on insert)
  * `created_by`: `UUID NOT NULL` (TypeScript: `string`, required on insert; MUST be valid UUID)
  * `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()` (TypeScript: `string`, optional on insert)
  * `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()` (TypeScript: `string`, optional on insert)
* **Triggers**:
  * `trigger_purchase_receive` (`20260211182507.sql:107`): When `status` changes to `'received'`, automatically upserts into `product_batches` for all items in `purchase_invoice_items`.

#### J. Table `purchase_invoice_items`
* **Definition Locations**: `types.ts:449-502`, `supabase/migrations/20260211182507_...sql:48-60`
* **Columns**:
  * `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()` (TypeScript: `string`, optional on insert)
  * `purchase_invoice_id`: `UUID NOT NULL REFERENCES public.purchase_invoices(id) ON DELETE CASCADE` (TypeScript: `string`, required on insert)
  * `product_id`: `UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT` (TypeScript: `string`, required on insert; CRITICAL: NOT NULL)
  * `batch_number`: `TEXT NOT NULL DEFAULT ''` (TypeScript: `string`, optional on insert)
  * `quantity`: `INTEGER NOT NULL DEFAULT 0` (TypeScript: `number`, optional on insert)
  * `cost_price`: `NUMERIC NOT NULL DEFAULT 0` (TypeScript: `number`, optional on insert)
  * `mrp`: `NUMERIC NOT NULL DEFAULT 0` (TypeScript: `number`, optional on insert)
  * `expiry_date`: `DATE` (TypeScript: `string | null`, optional on insert)
  * `received_quantity`: `INTEGER NOT NULL DEFAULT 0` (TypeScript: `number`, optional on insert)
  * `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()` (TypeScript: `string`, optional on insert)

#### K. Table `expenses`
* **Definition Locations**: `types.ts:146-195`, `supabase/migrations/20260830_create_expenses_table.sql:6-19`
* **Columns**:
  * `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()` (TypeScript: `string`, optional on insert)
  * `organization_id`: `UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE` (TypeScript: `string`, required on insert)
  * `expense_number`: `TEXT` (TypeScript: `string | null`, optional on insert; e.g. "EXP-001")
  * `party_name`: `TEXT DEFAULT 'General Expense Payee'` (present in migration, optional on insert)
  * `category`: `TEXT NOT NULL` (TypeScript: `string`, required on insert; e.g. "Rent", "Electricity", "Tea & Snacks")
  * `amount`: `NUMERIC(12,2) NOT NULL DEFAULT 0` (TypeScript: `number`, optional on insert)
  * `date`: `DATE NOT NULL DEFAULT CURRENT_DATE` (TypeScript: `string`, optional on insert; format: `YYYY-MM-DD`)
  * `description`: `TEXT` (TypeScript: `string | null`, optional on insert)
  * `payment_method`: `TEXT DEFAULT 'Cash'` (TypeScript: `string | null`, optional on insert)
  * `created_by`: `UUID REFERENCES auth.users(id) ON DELETE SET NULL` (TypeScript: `string | null`, optional on insert; NULLABLE)
  * `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()` (TypeScript: `string`, optional on insert)
  * `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()` (TypeScript: `string`, optional on insert)
* **LocalStorage Fallback**:
  * Key: `credsmart_expenses_${orgId || "no_org"}`

---

### 1.2 LocalStorage Keys and Formats in `CashAndBank.tsx`

`src/pages/CashAndBank.tsx` operates entirely via `localStorage` with four primary keys:

| Key Name | Storage Key Pattern | Stored Data Type | Example Value |
|---|---|---|---|
| **Bank Accounts** | `credsmart_bank_accounts_${orgId \|\| "no_org"}` | JSON stringified array of `BankAccount` objects | `[{"id":"bank-1712000000-0","name":"HDFC Bank","bankName":"HDFC Bank","accountNumber":"50200012345678","ifscCode":"HDFC0001234","accountType":"current","balance":540250,"isPrimary":true,"createdAt":"2026-09-26T03:00:00.000Z"}]` |
| **Cash in Hand** | `credsmart_cash_in_hand_${orgId \|\| "no_org"}` | Plain string of numeric float | `"28500"` (read via `parseFloat(val) \|\| 0`, written via `amt.toString()`) |
| **Bank Transactions** | `credsmart_bank_txns_${orgId \|\| "no_org"}` | JSON stringified array of `BankTransaction` objects | `[{"id":"txn-1","date":"2026-09-26","type":"money_in","accountId":"cash","amount":5000,"paymentMode":"cash","category":"Direct Cash","createdAt":"..."}]` |
| **Unlinked Balance** | `credsmart_unlinked_balance_${orgId \|\| "no_org"}` | Plain string of numeric float | `"0"` |

---

## 2. Logic Chain & Comparative Analysis

### 2.1 Critical Bug: `credit_transactions` Type & Column Mismatch

1. **Observation**: In `autoSyncService.ts:610-644`, opening balances were being pushed as:
   ```ts
   transactionsToInsert.push({
     organization_id: orgId,
     customer_id: cust.id,       // DOES NOT EXIST IN DB
     supplier_id: supp.id,       // DOES NOT EXIST IN DB
     type: "opening_balance",    // VIOLATES CHECK CONSTRAINT
     amount: origParty.openingBalance,
     payment_mode: "adjustment", // DOES NOT EXIST IN DB
     reference_id: "SYNC-OPENING",
     status: "completed",        // DOES NOT EXIST IN DB
     transaction_date: new Date().toISOString() // DOES NOT EXIST IN DB
   });
   ```
2. **Observation**: `supabase/migrations/20260211184741_...sql:24-35` defines:
   ```sql
   CREATE TABLE public.credit_transactions (
     id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
     organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
     party_type TEXT NOT NULL CHECK (party_type IN ('customer', 'supplier')),
     party_id UUID NOT NULL,
     amount NUMERIC NOT NULL DEFAULT 0,
     type TEXT NOT NULL CHECK (type IN ('credit', 'payment')),
     description TEXT DEFAULT '',
     reference_id TEXT DEFAULT '',
     created_by UUID NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   );
   ```
3. **Logic Deduction**:
   - The PostgreSQL constraint `CHECK (type IN ('credit', 'payment'))` strictly prohibits `"opening_balance"`.
   - In `Parties.tsx:444-453` and `Parties.tsx:510-518`, opening balances are correctly recorded as:
     * Customer opening balance: `party_type: "customer"`, `party_id: id`, `type: "credit"` (if positive receivable), `description: "Opening balance"`.
     * Supplier opening balance: `party_type: "supplier"`, `party_id: id`, `type: "credit"` (if positive payable), `description: "Opening balance"`.
   - In `CustomerLedger.tsx` and `ledgerReconciliation.ts:208-255`, the reconciliation engine parses `type: "credit"` as increasing Dr (receivable for customer) or increasing Cr (payable for supplier), and `type: "payment"` as decreasing the balance.
   - Any insert with `type: "opening_balance"` or columns `customer_id`/`supplier_id`/`payment_mode`/`status` fails at the Postgres engine level.
   - `created_by` is `UUID NOT NULL`. If passed literal `"admin"` or `"sync_daemon"`, Postgres fails with error `22P02: invalid input syntax for type uuid: "admin"`. The codebase standard is `user?.id || "00000000-0000-0000-0000-000000000000"`.

### 2.2 Critical Foreign Key Difference: `sale_items` vs `purchase_invoice_items`

1. **Observation**:
   - `sale_items.product_id` is defined as `UUID REFERENCES public.products(id)` (NULLABLE).
   - `purchase_invoice_items.product_id` is defined as `UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT`.
2. **Logic Deduction**:
   - For `sale_items`, a line item can be saved with `product_id: null` if a product is unlinked.
   - For `purchase_invoice_items`, `product_id` **MUST NEVER BE NULL**. Any purchase voucher containing an item whose name does not match an existing product in `products` will throw a NOT NULL constraint violation on insert unless the item is auto-created in `products` beforehand (as implemented in `documentsService.ts:788-799`).
   - Similarly, `purchase_invoices.supplier_id` is `UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT`. A purchase voucher whose supplier is not in `suppliers` will fail unless the supplier is auto-created in `suppliers` first (as in `documentsService.ts:734-747` and `TallyImport.tsx:875-883`).

### 2.3 Status Transition Triggers on Purchase Invoices

1. **Observation**:
   - `purchase_invoices.status` has constraint `CHECK (status IN ('draft', 'sent', 'received', 'partial'))`.
   - Migration `20260211182507` defines trigger `trigger_purchase_receive`:
     `IF NEW.status = 'received' AND OLD.status != 'received' THEN ... INSERT INTO public.product_batches ... ON CONFLICT (product_id, batch_number) DO UPDATE SET stock = product_batches.stock + EXCLUDED.stock;`
2. **Logic Deduction**:
   - When importing purchase vouchers as `"received"`, Supabase automatically increases inventory stock in `product_batches`.
   - If importing with status `"sent"` or `"draft"`, batch stock is not touched by the trigger.

### 2.4 Daybook Query Parameters in `autoSyncService.ts`

1. **Observation**:
   In `autoSyncService.ts:174-191`:
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
2. **Logic Deduction**:
   - Without `<SVFROMDATE>` and `<SVTODATE>`, Tally defaults to only exporting vouchers for the active system date in Tally.
   - Adding `<SVFROMDATE>20200401</SVFROMDATE>` and `<SVTODATE>20270331</SVTODATE>` (or configurable date bounds) inside `<STATICVARIABLES>` ensures full historical Day Book extraction.

---

## 3. Caveats

1. **`bank_accounts` Table Existence**: The Supabase database schema does not natively include a `bank_accounts` table in its migration files. The application relies on `CashAndBank.tsx` using `localStorage` keys (`credsmart_bank_accounts_{orgId}` and `credsmart_cash_in_hand_{orgId}`). The probing logic `supabase.from("bank_accounts").select("id").limit(1)` safely detects whether a custom table has been created, and falls back to `localStorage` when it fails.
2. **Polymorphic `party_id`**: In `credit_transactions`, `party_id` is a UUID without a database-enforced foreign key to either `customers` or `suppliers` because Postgres does not support polymorphic foreign keys. Referential integrity is maintained by `party_type: 'customer' | 'supplier'`.
3. **`created_by` UUID Syntax**: Even though `created_by` does not enforce a foreign key against `auth.users`, Postgres strictly validates the UUID format. Strings like `"admin"`, `"system"`, or `"daemon"` crash the query with Postgres error code `22P02`. A zero UUID `00000000-0000-0000-0000-000000000000` or the authenticated user's ID must be supplied.
4. **`expenses.party_name` vs `types.ts`**: The column `party_name` was added in migration `20260830_create_expenses_table.sql` but is absent from `types.ts`. Typescript cast or `(exp as any)` is necessary when querying or inserting `party_name` if `types.ts` is not regenerated.

---

## 4. Conclusion & Actionable Mapping Specification

To fulfill the requirements of `ORIGINAL_REQUEST.md`, any ingestion and sync pipelines (AutoSync and TallyImportModal) must adhere to the following exact mappings:

### 4.1 Stock Items & Batches
- **Target Tables**: `products` and `product_batches`
- **Product Upsert Payload**:
  ```ts
  {
    id: existingProduct?.id || crypto.randomUUID(),
    organization_id: orgId,
    name: item.name.trim(),
    category: item.category || "General",
    brand: item.brand || null,
    barcode: item.barcode || null,
    sku: item.sku || `SKU-${item.name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`,
    tags: {
      selling_price: Number(item.sellingPrice) || 0,
      purchase_price: Number(item.purchasePrice) || 0,
      mrp: Number(item.mrp) || Number(item.sellingPrice) || 0,
      unit: (item.unit || "PCS").toUpperCase(),
      gst_rate: Number(item.gstRate ?? 18),
      hsn_code: item.hsnCode ? String(item.hsnCode).trim() : null,
      opening_stock: Number(item.openingStock ?? item.currentStock ?? 0),
      stock: Number(item.openingStock ?? item.currentStock ?? 0),
      imported_from: "tally",
      auto_synced: true,
    }
  }
  ```
- **Batch Upsert Payload**:
  ```ts
  {
    product_id: productId,
    batch_number: item.batchNumber || "SYNC-BATCH-1",
    cost_price: Number(item.purchasePrice) || 0,
    mrp: Number(item.mrp) || Number(item.sellingPrice) || 0,
    stock: Number(item.openingStock ?? item.currentStock ?? 0),
    expiry_date: item.expiryDate || null,
  }
  ```

### 4.2 Parties & Opening Balances
- **Customers**: Upsert into `customers` (`organization_id`, `name`, `phone`, `email`, `address`, `gstin`).
- **Suppliers**: Upsert into `suppliers` (`organization_id`, `name`, `phone`, `email`, `address`, `gstin`).
- **Opening Balances**: Insert into `credit_transactions`:
  ```ts
  {
    organization_id: orgId,
    party_id: partyId,
    party_type: isSupplier ? "supplier" : "customer",
    amount: Math.abs(Number(openingBalance)),
    type: Number(openingBalance) >= 0 ? "credit" : "payment",
    description: "Opening Balance",
    reference_id: "SYNC-OPENING",
    created_by: userId || "00000000-0000-0000-0000-000000000000",
  }
  ```

### 4.3 Bank Accounts & Cash in Hand
- **Database Probe**: Check `supabase.from("bank_accounts").select("id").limit(1)`.
- **LocalStorage Sync (Standard)**:
  * Key: `credsmart_bank_accounts_${orgId}`
  * Format: JSON array of `BankAccount` objects.
  * Key: `credsmart_cash_in_hand_${orgId}`
  * Format: Numeric string (e.g. `String(parsedData.cashInHand || 0)`).

### 4.4 Vouchers & Transactions
- **Sales Vouchers**:
  * Insert into `sales`:
    `{ organization_id, customer_id, invoice_number, subtotal, total, tax, discount_amount: 0, payment_method: "Credit", created_by: userId || "00000000-0000-0000-0000-000000000000", created_at: voucher.date }`
  * Insert into `sale_items`:
    `{ sale_id, product_id: productMap.get(item.itemName)?.id || null, product_name: item.itemName, mrp: item.rate, quantity: item.quantity, line_total: item.amount, batch_number: item.batchNumber || null }`
- **Purchase Vouchers**:
  * Auto-resolve/create supplier in `suppliers` if not present.
  * Insert into `purchase_invoices`:
    `{ organization_id, supplier_id, invoice_number, total_amount, status: "received", notes, created_by: userId || "00000000-0000-0000-0000-000000000000", created_at: voucher.date }`
  * Auto-resolve/create product in `products` if not present (to satisfy `product_id NOT NULL`).
  * Insert into `purchase_invoice_items`:
    `{ purchase_invoice_id, product_id, quantity: item.quantity, cost_price: item.rate, mrp: item.rate, batch_number: item.batchNumber || "BATCH-01", expiry_date: item.expiryDate || null }`
- **Receipt Vouchers (Customer Payments)**:
  * Insert into `credit_transactions`:
    `{ organization_id, party_id: customerId, party_type: "customer", amount: voucher.amount, type: "payment", description: voucher.narration || "Customer Receipt", reference_id: voucher.voucherNumber, created_by: userId || "00000000-0000-0000-0000-000000000000", created_at: voucher.date }`
- **Payment Vouchers (Vendor Payments)**:
  * Insert into `credit_transactions`:
    `{ organization_id, party_id: supplierId, party_type: "supplier", amount: voucher.amount, type: "payment", description: voucher.narration || "Supplier Payment", reference_id: voucher.voucherNumber, created_by: userId || "00000000-0000-0000-0000-000000000000", created_at: voucher.date }`
- **Expenses**:
  * Insert into `expenses`:
    `{ organization_id, category: expenseCategory || "Direct Expenses", amount: voucher.amount, date: voucher.date.slice(0, 10), description: `${voucher.partyName || "Expense"} - ${voucher.narration || ""}`, payment_method: "Cash", created_by: userId || null }`
  * And append to `localStorage.getItem("credsmart_expenses_" + orgId)`.

---

## 5. Verification Method

To verify these database schemas, constraints, and persistence requirements independently:

1. **Verify Types**: Inspect `src/integrations/supabase/types.ts` lines 58-104 (`credit_transactions`), lines 321-374 (`product_batches`), lines 375-424 (`products`), lines 449-556 (`purchase_invoices` & `purchase_invoice_items`), lines 666-789 (`sales` & `sale_items`), lines 146-195 (`expenses`).
2. **Verify SQL Constraints**: Inspect `supabase/migrations/20260211184741_...sql` line 27-30 (`party_type CHECK`, `type CHECK`).
3. **Verify LocalStorage Keys**: Inspect `src/pages/CashAndBank.tsx` lines 93-97 (`storageKeyAccounts`, `storageKeyCash`).
4. **Run Vitest Tests**:
   Execute `npx vitest run src/test/tallyImport.test.ts src/test/tallyBridge.test.ts` to confirm test suite integrity.
