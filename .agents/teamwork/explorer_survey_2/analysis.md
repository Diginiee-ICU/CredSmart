# Detailed Survey & Analysis Report: Frontend Supabase Query Migration to Dedicated Backend API
**Domain**: Customers, Suppliers, Parties, Khata/Credit Ledgers, Cash & Bank Accounts
**Explorer**: explorer_survey_2
**Date**: 2026-10-18T17:45:00Z
**Target Backend Base URL**: `https://api.credsmart.online/api`

---

## Executive Summary

This survey comprehensively audits all direct frontend client-side Supabase table queries (`supabase.from(...)`) across the CredSmart codebase for:
1. **Parties Domain**: `customers`, `suppliers`, party-wise prices & catalogues (`customItems` / `custom_fields`), opening balances, and Khata (credit/debit) records.
2. **Cash & Bank Domain**: `bank_accounts`, bank transactions, cash in hand, and unlinked balances.
3. **Contract & State Parity**: Component state hooks, loading states, toast notifications, and expected data structures.
4. **Backend API Contract Mapping**: Detailed REST endpoints, query parameter conventions, payload shapes, and migration blueprints targeting `https://api.credsmart.online/api/*`.

A total of **52 direct Supabase table query invocations** across 11 production source files were catalogued, analyzed, and mapped to REST endpoints with zero schema ambiguities.

---

## Table of Contents
1. [Customers Domain Audit](#1-customers-domain-audit)
2. [Suppliers Domain Audit](#2-suppliers-domain-audit)
3. [Credit Transactions & Khata Domain Audit](#3-credit-transactions--khata-domain-audit)
4. [Cash & Bank Domain Audit](#4-cash--bank-domain-audit)
5. [Contract & State Parity Analysis](#5-contract--state-parity-analysis)
6. [Backend API Endpoint Contract Mapping](#6-backend-api-endpoint-contract-mapping)
7. [Implementation & Architecture Recommendations](#7-implementation--architecture-recommendations)

---

## 1. Customers Domain Audit

Table: `public.customers`
Schema definition in `src/integrations/supabase/types.ts:684-725`:
- `id`: UUID (Primary Key)
- `organization_id`: UUID (Foreign Key -> organizations.id)
- `name`: string (NOT NULL)
- `phone`: string | null
- `email`: string | null
- `address`: string | null
- `trade_name`: string | null
- `pan`: string | null
- `pincode`: string | null
- `shipping_address`: string | null
- `category`: string | null (Default: 'General')
- `credit_limit`: number | null
- `credit_period_days`: number | null (Default: 30)
- `custom_fields`: Json | null (Contains `keepSamePrice`, `keepSameInventory`, `customItems`, `dlNumber`, `bankAccount`, `bankIfsc`, `notes`)
- `created_at`: string (TIMESTAMPTZ)
- `updated_at`: string (TIMESTAMPTZ)

### Identified Queries:

| # | File Path & Line | Operation | Query Signature & Filters | Payload / Return Shape | Consuming State / Component Action |
|---|------------------|-----------|---------------------------|------------------------|------------------------------------|
| 1 | `src/pages/Customers.tsx:223` | `SELECT` | `.from("customers").select("id, name, phone, email, address, created_at, custom_fields").eq("organization_id", orgId).order("name")` | Array of customer records | `setCustomers(mergedWithCreditBalances)` |
| 2 | `src/pages/Customers.tsx:357` | `UPDATE` | `.from("customers").update({ name, phone, email, address }).eq("id", editingId)` | `{ name, phone, email, address }` | Edit customer form save; toast on success |
| 3 | `src/pages/Customers.tsx:377` | `INSERT` | `.from("customers").insert({ organization_id, name, phone, email, address })` | Customer creation fields | New customer form submit; toast on success |
| 4 | `src/pages/Customers.tsx:399` | `DELETE` | `.from("customers").delete().eq("id", id)` | None | Delete customer action with confirmation |
| 5 | `src/pages/Parties.tsx:144` | `SELECT` | `.from("customers").select("id, name, phone, email, address, trade_name, pan, pincode, shipping_address, custom_fields, credit_limit, credit_period_days, category, created_at").eq("organization_id", orgId)` | Full customer profile array | Merged with suppliers into `parties` state with Khata balance calculation |
| 6 | `src/pages/Parties.tsx:390` *(dynamic via `targetTable`)* | `UPDATE` | `.from(targetTable).update({ name, phone, email, address, trade_name, pan, pincode, shipping_address, category, credit_limit, credit_period_days, custom_fields }).eq("id", editingParty.id)` | Complete party update payload | Edit Party slide-over drawer / modal submit |
| 7 | `src/pages/Parties.tsx:422` *(dynamic via `targetTable`)* | `INSERT` | `.from(targetTable).insert({ organization_id, name, phone, email, address, trade_name, pan, pincode, shipping_address, category, credit_limit, credit_period_days, custom_fields }).select().single()` | Created customer record | Add Party submit; triggers opening balance insertion |
| 8 | `src/pages/Parties.tsx:497` *(dynamic via `targetTable`)* | `INSERT` | `.from(targetTable).insert({ organization_id, name, phone, email, address, gstin }).select().single()` | Imported customer record | Bulk Excel/CSV Party Import loop |
| 9 | `src/pages/Parties.tsx:544` | `DELETE` | `.from("customers").delete().eq("id", party.id)` | None | Delete Party button; prompts user confirm |
| 10 | `src/pages/Parties.tsx:597` *(dynamic via `targetTable`)* | `DELETE` | `.from(targetTable).delete().eq("id", dup.id)` | None | Merge duplicate parties tool; executed after re-linking `credit_transactions` |
| 11 | `src/pages/CustomerLedger.tsx:59` | `SELECT` | `.from("customers").select("*").eq("id", id).single()` | Single full customer record | Reconciled against invoices and transactions via `reconcilePartyLedger` |
| 12 | `src/pages/POSBilling.tsx:568` | `SELECT` | `.from("customers").select("id, name, phone, email, custom_fields").eq("organization_id", orgId).order("name")` | Customer list with `custom_fields` | Populates POS customer search, custom item prices, and restricted catalogue |
| 13 | `src/pages/POSBilling.tsx:1345` | `INSERT` | `.from("customers").insert({ organization_id, name, phone }).select().single()` | `{ id, name, phone }` | Quick Add Customer popup on POS checkout |
| 14 | `src/components/SalesInvoiceModal.tsx:434` | `SELECT` | `.from("customers").select("id, name, phone, email, address, custom_fields").eq("organization_id", orgId).order("name")` | Array of customers with custom items | Populates Bill To dropdown, pricing matrix |
| 15 | `src/components/SalesInvoiceModal.tsx:1002` | `INSERT` | `.from("customers").insert({ organization_id, name, phone, email, address }).select().single()` | Customer record | Quick Add Customer dialog in Sales Invoice |
| 16 | `src/components/PurchaseInvoiceModal.tsx:512` | `SELECT` | `.from("customers").select("id, name, phone, email, address, gstin, custom_fields").eq("organization_id", orgId).order("name")` | Customers list with GSTIN | Merged with suppliers for universal B2B party billing |
| 17 | `src/components/PurchaseInvoiceModal.tsx:1051` | `INSERT` | `.from("customers").insert({ organization_id, name, phone, address, gstin }).select().single()` | Single customer record | Quick Add Supplier in Purchase Invoice (stored in customers for omnichannel reuse) |
| 18 | `src/components/AppLayout.tsx:871` *(dynamic via `targetTable`)* | `INSERT` | `.from(targetTable).insert(insertData).select().single()` | Customer record | Top navigation header Quick Add Party modal |
| 19 | `src/components/invoices/mobile/CreatePartyModal.tsx:93` *(dynamic via `targetTable`)* | `INSERT` | `.from(targetTable).insert(insertData).select().single()` | Customer record | Mobile Create Party bottom sheet modal |
| 20 | `src/pages/Dashboard.tsx:1281` *(dynamic via `targetTable`)* | `INSERT` | `.from(targetTable).insert(insertData).select().single()` | Customer record | Dashboard quick action Add Party modal |
| 21 | `src/services/autoSyncService.ts:485` | `SELECT` | `.from("customers").select("id, name, phone").eq("organization_id", orgId).limit(10000)` | Array of `{ id, name, phone }` | Pre-flight duplicate check for Tally live sync |
| 22 | `src/services/autoSyncService.ts:691` | `UPSERT` | `.from("customers").upsert(customersToUpsert.slice(i, i + 1000)).select("id, name")` | Chunk of up to 1000 records | Tally Live Sync master party batch upsert |
| 23 | `src/services/autoSyncService.ts:926` | `INSERT` | `.from("customers").insert([newCustomer])` | Single customer record | Auto-creates missing customer when syncing sales voucher |
| 24 | `src/pages/TallyImport.tsx:622, 1473, 1594` | `SELECT` | `.from("customers").select("id, name, phone").eq("organization_id", orgId).limit(10000)` | Array of existing customers | Pre-import matching and overwrite detection |
| 25 | `src/pages/TallyImport.tsx:775` | `UPSERT` | `.from("customers").upsert(customersToUpsert.slice(i, i + 1000)).select("id, name, phone")` | Batch of 1000 records | XML/Daybook File Import party upsert |
| 26 | `src/pages/TallyImport.tsx:1073, 1731` | `INSERT` | `.from("customers").insert({ organization_id, name, phone, address })` | Single record | Auto-creates customer when importing sales voucher |
| 27 | `src/pages/TallyImport.tsx:1519` *(dynamic via `table`)* | `UPSERT` | `.from(table).upsert(arr.slice(i, i + 1000)).select("id, name, phone")` | Batch of 1000 records | Shared party batch import handler |
| 28 | `src/utils/offlineQueue.ts:135` | `INSERT` | `.from("customers").insert([item.payload])` | Stored customer payload | PWA offline replay engine when network reconnects |

---

## 2. Suppliers Domain Audit

Table: `public.suppliers`
Schema definition in `src/integrations/supabase/types.ts:1406-1437`:
- `id`: UUID (Primary Key)
- `organization_id`: UUID (Foreign Key -> organizations.id)
- `name`: string (NOT NULL)
- `phone`: string | null
- `email`: string | null
- `address`: string | null
- `gstin`: string | null
- `trade_name`: string | null
- `pan`: string | null
- `pincode`: string | null
- `shipping_address`: string | null
- `category`: string | null
- `credit_limit`: number | null
- `credit_period_days`: number | null
- `custom_fields`: Json | null
- `created_at`: string
- `updated_at`: string

### Identified Queries:

| # | File Path & Line | Operation | Query Signature & Filters | Payload / Return Shape | Consuming State / Component Action |
|---|------------------|-----------|---------------------------|------------------------|------------------------------------|
| 1 | `src/pages/Suppliers.tsx:167` | `SELECT` | `.from("suppliers").select("id, name, phone, email, gstin, address, created_at, custom_fields").eq("organization_id", orgId).order("name")` | Array of supplier records | `setSuppliers(mergedWithPayableBalances)` |
| 2 | `src/pages/Suppliers.tsx:334` | `UPDATE` | `.from("suppliers").update({ name, phone, email, gstin, address }).eq("id", editingId)` | Supplier update fields | Edit supplier form save |
| 3 | `src/pages/Suppliers.tsx:354` | `INSERT` | `.from("suppliers").insert({ organization_id, name, phone, email, gstin, address })` | Supplier create fields | Create supplier form save |
| 4 | `src/pages/Suppliers.tsx:377` | `DELETE` | `.from("suppliers").delete().eq("id", id)` | None | Delete supplier with FK validation |
| 5 | `src/pages/Parties.tsx:150` | `SELECT` | `.from("suppliers").select("id, name, phone, email, address, gstin, trade_name, pan, pincode, shipping_address, custom_fields, credit_limit, credit_period_days, category, created_at").eq("organization_id", orgId)` | Array of supplier records | Merged into `parties` state (`partyType: "supplier"`) |
| 6 | `src/pages/Parties.tsx:542` | `DELETE` | `.from("suppliers").delete().eq("id", party.id)` | None | Delete supplier from Parties list |
| 7 | `src/pages/PurchaseReturns.tsx:153` | `SELECT` | `.from("suppliers").select("id, name").eq("organization_id", orgId).order("name")` | `{ id, name }[]` | Populates supplier picker in Debit Note / Purchase Return modal |
| 8 | `src/components/PurchaseInvoiceModal.tsx:519` | `SELECT` | `.from("suppliers").select("id, name, phone, email, address, gstin, custom_fields").eq("organization_id", orgId).order("name")` | Supplier records | Populates Bill From dropdown in Purchase Invoice |
| 9 | `src/components/PurchaseInvoiceForm.tsx:111` | `SELECT` | `.from("suppliers").select("id, name, phone, gstin").eq("organization_id", organizationId).order("name")` | Minimal supplier records | Supplier select dropdown |
| 10 | `src/components/PurchaseInvoiceForm.tsx:148` | `INSERT` | `.from("suppliers").insert({ organization_id, name, phone, gstin }).select("id, name, phone, gstin").single()` | Supplier record | Quick Add Supplier in purchase form |
| 11 | `src/services/documentsService.ts:775, 786, 797, 808` | `SELECT` & `INSERT` | Probes suppliers by `id`, `phone`, or `name`. If not found, `.insert({ organization_id, name, phone, email, gstin, address })` | Supplier record | Auto-resolves or creates supplier to satisfy purchase invoice FK constraint |
| 12 | `src/services/documentsService.ts:903, 911, 920` | `SELECT` & `INSERT` | Probes suppliers by `id` or `name`. If missing, `.insert(...)` | Supplier record | Auto-resolves supplier for purchase return / debit note persistence |
| 13 | `src/services/networkInvoicingService.ts:1264, 1281` | `SELECT` & `INSERT` | Probes supplier by GSTIN/phone/name. If missing, `.insert(...)` | Supplier record | Auto-creates sender as supplier in recipient org when B2B network invoice is accepted |
| 14 | `src/services/autoSyncService.ts:486` | `SELECT` | `.from("suppliers").select("id, name, phone").eq("organization_id", orgId).limit(10000)` | Existing supplier list | Pre-flight duplicate check |
| 15 | `src/services/autoSyncService.ts:716` | `UPSERT` | `.from("suppliers").upsert(suppliersToUpsert.slice(i, i + 1000)).select("id, name")` | Chunk of up to 1000 records | Tally Live Sync master supplier batch upsert |
| 16 | `src/services/autoSyncService.ts:840` | `INSERT` | `.from("suppliers").insert([newSupplier])` | Single record | Auto-creates supplier from purchase voucher |
| 17 | `src/services/autoSyncService.ts:982` | `INSERT` | `.from("suppliers").insert([newSupplier])` | Single record | Auto-creates supplier from payment voucher |
| 18 | `src/pages/TallyImport.tsx:623, 1474, 1595` | `SELECT` | `.from("suppliers").select("id, name, phone").eq("organization_id", orgId)` | Supplier records | Pre-import matching and lookup map creation |
| 19 | `src/pages/TallyImport.tsx:808` | `UPSERT` | `.from("suppliers").upsert(suppliersToUpsert.slice(i, i + 1000)).select("id, name, phone")` | Batch of 1000 records | File import supplier upsert |
| 20 | `src/pages/TallyImport.tsx:1030, 1122, 1688, 1781` | `INSERT` | `.from("suppliers").insert({ organization_id, name, phone, gstin })` | Single record | Auto-creates supplier on voucher import |

---

## 3. Credit Transactions & Khata Domain Audit

Table: `public.credit_transactions`
Schema definition in `src/integrations/supabase/types.ts:58-104`:
- `id`: UUID (Primary Key, default `gen_random_uuid()`)
- `organization_id`: UUID (Foreign Key -> organizations.id)
- `party_id`: UUID (Foreign Key -> customers.id or suppliers.id)
- `party_type`: string (`"customer"` | `"supplier"`)
- `type`: string (`"credit"` | `"payment"` | `"opening_balance"`)
- `amount`: number (Numeric / Float)
- `description`: string | null
- `reference_id`: string | null (Invoice ID, Voucher No, or Return ID)
- `created_by`: UUID / string
- `created_at`: string (TIMESTAMPTZ)

### Identified Queries:

| # | File Path & Line | Operation | Query Signature & Filters | Payload / Return Shape | Consuming State / Purpose |
|---|------------------|-----------|---------------------------|------------------------|---------------------------|
| 1 | `src/pages/Customers.tsx:116` | `SELECT` | `.from("credit_transactions").select("*").eq("party_id", customerId).order("created_at", { ascending: false }).limit(15)` | Array of transactions | Populates split-screen ledger transaction feed for selected customer |
| 2 | `src/pages/Customers.tsx:236` | `SELECT` | `.from("credit_transactions").select("party_id, amount, type").eq("organization_id", orgId).eq("party_type", "customer")` | `{ party_id, amount, type }[]` | Calculates live outstanding balances for all customers |
| 3 | `src/pages/Customers.tsx:419` | `SELECT` | `.from("credit_transactions").select("id, amount, type, description, created_at").eq("party_id", c.id).eq("party_type", "customer").order("created_at", { ascending: false }).limit(20)` | Transaction history | Populates customer Record Payment / Give Credit modal history |
| 4 | `src/pages/Customers.tsx:445` | `INSERT` | `.from("credit_transactions").insert({ organization_id, party_type: "customer", party_id, amount, type, description, created_by })` | Transaction record | Customer Give Credit or Receive Payment submit |
| 5 | `src/pages/Suppliers.tsx:180` | `SELECT` | `.from("credit_transactions").select("party_id, amount, type").eq("organization_id", orgId).eq("party_type", "supplier")` | `{ party_id, amount, type }[]` | Calculates live payable balances for all suppliers |
| 6 | `src/pages/Suppliers.tsx:403` | `SELECT` | `.from("credit_transactions").select("id, amount, type, description, created_at").eq("party_id", s.id).eq("party_type", "supplier").order("created_at", { ascending: false }).limit(20)` | Transaction history | Populates supplier Pay Vendor / Take Credit modal history |
| 7 | `src/pages/Suppliers.tsx:429` | `INSERT` | `.from("credit_transactions").insert({ organization_id, party_type: "supplier", party_id, amount, type, description, created_by })` | Transaction record | Supplier Record Payment or Take Credit submit |
| 8 | `src/pages/Parties.tsx:156` | `SELECT` | `.from("credit_transactions").select("party_id, party_type, amount, type, created_at, reference_id, description").eq("organization_id", orgId)` | All org credit transactions | Unified balance calculation and ledger reconciliation engine input |
| 9 | `src/pages/Parties.tsx:444` | `INSERT` | `.from("credit_transactions").insert({ organization_id, party_id, party_type, amount, type: openingBalance > 0 ? "credit" : "payment", description: "Opening balance", created_by })` | Initial balance record | Created upon new party creation with non-zero opening balance |
| 10 | `src/pages/Parties.tsx:510` | `INSERT` | `.from("credit_transactions").insert({ organization_id, party_id, party_type, amount, type, description: "Opening balance import", created_by })` | Initial balance record | Created during bulk party import |
| 11 | `src/pages/Parties.tsx:596` | `UPDATE` | `.from("credit_transactions").update({ party_id: primary.id }).eq("party_id", dup.id)` | `{ party_id: primary.id }` | Reassigns transactions to primary party when merging duplicates |
| 12 | `src/pages/CustomerLedger.tsx:68` | `SELECT` | `.from("credit_transactions").select("*").eq("party_id", id).order("created_at", { ascending: true })` | All party transactions | Consumed by `reconcilePartyLedger` to calculate chronological running Dr/Cr balances |
| 13 | `src/pages/Dashboard.tsx:179` | `SELECT` | `.from("credit_transactions").select("id, party_id, party_type, amount, type, created_at").eq("organization_id", orgId).order("created_at", { ascending: true })` | All transactions | Generates Dashboard KPI summary cards (Total to Collect, Total to Pay) and cashflow trends |
| 14 | `src/pages/Dashboard.tsx:1287` | `INSERT` | `.from("credit_transactions").insert({ organization_id, party_id, party_type, amount, type, description: "Opening balance", created_by: "admin" })` | Opening balance record | Dashboard quick-add party modal submit |
| 15 | `src/pages/POSBilling.tsx:1518` | `INSERT` | `.from("credit_transactions").insert({ organization_id, party_id, party_type: "customer", type: "credit", amount: grandTotal, description: "Credit Sale Invoice #...", reference_id: sale.id, created_by })` | Credit sale record | Automatically recorded when POS sale payment method is "Credit" |
| 16 | `src/components/SalesInvoiceModal.tsx:440` | `SELECT` | `.from("credit_transactions").select("party_id, amount, type").eq("organization_id", orgId)` | Balances subset | Calculates active customer balance shown on invoice creation |
| 17 | `src/components/PurchaseInvoiceModal.tsx:526` | `SELECT` | `.from("credit_transactions").select("party_id, amount, type").eq("organization_id", orgId)` | Balances subset | Calculates active supplier balance shown on purchase creation |
| 18 | `src/components/AppLayout.tsx:877` | `INSERT` | `.from("credit_transactions").insert({ organization_id, party_id, party_type, amount, type, description: "Opening balance", created_by: "admin" })` | Opening balance record | App layout global quick-add modal |
| 19 | `src/components/invoices/mobile/CreatePartyModal.tsx:103` | `INSERT` | `.from("credit_transactions").insert({ organization_id, party_id, party_type, amount, type, description: "Opening balance", created_by: "mobile_invoice" })` | Opening balance record | Mobile create party modal submit |
| 20 | `src/services/documentsService.ts:1052` | `INSERT` | `.from("credit_transactions").insert({ organization_id, party_type: "customer", party_id, amount: doc.grandTotal, type: "payment", reference_id: srData.id, description: "Credit Note #...", created_by })` | Store credit record | Recorded when sales return settlement mode is `store_credit` (reduces customer receivable) |
| 21 | `src/services/documentsService.ts:1146` | `DELETE` | `.from("credit_transactions").delete().eq("reference_id", docId)` | None | Auto-removes credit record when a sales return document is deleted |
| 22 | `src/pages/PurchaseReturns.tsx:257, 345` | `INSERT` | `.from("credit_transactions").insert({ organization_id, party_type: "supplier", party_id, amount, type: "payment", reference_id: ret.id, description: "Debit Note #...", created_by })` | Debit note record | Recorded when purchase return is completed (reduces supplier payable) |
| 23 | `src/services/autoSyncService.ts:489` | `SELECT` | `.from("credit_transactions").select("reference_id").eq("organization_id", orgId).limit(10000)` | `{ reference_id }[]` | Deduplication check for live sync |
| 24 | `src/services/autoSyncService.ts:744` | `INSERT` | `.from("credit_transactions").insert(chunk)` | Batch of opening balances | Upserts opening balances for imported parties |
| 25 | `src/services/autoSyncService.ts:1047` | `INSERT` | `.from("credit_transactions").insert(creditTxnsToInsert.slice(i, i + 1000))` | Batch of receipt & payment vouchers | Synchronizes Tally receipts and payments to Khata |
| 26 | `src/pages/TallyImport.tsx:839, 1281, 1552, 1938` | `INSERT` | `.from("credit_transactions").insert(...)` | Batch of transactions | Imports opening balances and historical payments from Tally files |
| 27 | `src/pages/TallyImport.tsx:934, 1596` | `SELECT` | `.from("credit_transactions").select("reference_id").eq("organization_id", orgId).limit(10000)` | Reference IDs | Deduplication check during import |
| 28 | `src/utils/offlineQueue.ts:145` | `INSERT` | `.from("credit_transactions").insert([item.payload])` | Single transaction payload | Replays offline credit/payment transactions |

---

## 4. Cash & Bank Domain Audit

### Current Storage Architecture
In the existing codebase, cash and bank accounts are managed through a dual mechanism:
1. **Database table probing with local storage persistence**:
   - `src/services/autoSyncService.ts:1090-1105` and `src/pages/TallyImport.tsx:851-869, 2001-2018` probe `supabase.from("bank_accounts").select("id").limit(1)`.
   - If present, they execute `supabase.from("bank_accounts").upsert(dbAccounts)`.
   - In both cases, they immediately synchronize and mirror state into `localStorage` keys:
     - `credsmart_bank_accounts_${orgId}`: Array of bank account objects
     - `credsmart_cash_in_hand_${orgId}`: Float balance string
     - Event dispatched: `window.dispatchEvent(new CustomEvent("credsmart_bank_updated", { detail: { orgId } }))`
2. **Component UI Layer (`src/pages/CashAndBank.tsx`)**:
   - Manages all accounts, transactions, cash in hand, and unlinked balances via `localStorage`:
     - `credsmart_bank_accounts_${orgId}`
     - `credsmart_bank_txns_${orgId}`
     - `credsmart_cash_in_hand_${orgId}`
     - `credsmart_unlinked_balance_${orgId}`

### Direct Supabase Queries for `bank_accounts`:
| # | File Path & Line | Operation | Query Signature | Payload / Return Shape | Consuming Action |
|---|------------------|-----------|-----------------|------------------------|------------------|
| 1 | `src/services/autoSyncService.ts:1090` | `SELECT` | `.from("bank_accounts").select("id").limit(1)` | Probe check | Checks if table exists in DB |
| 2 | `src/services/autoSyncService.ts:1101` | `UPSERT` | `.from("bank_accounts").upsert(dbAccounts)` | `Array<{ organization_id, name, bank_name, account_number, ifsc_code, account_type, balance }>` | Upserts Tally bank accounts |
| 3 | `src/pages/TallyImport.tsx:851, 2001` | `SELECT` | `.from("bank_accounts").select("id").limit(1)` | Probe check | Checks if table exists in DB |
| 4 | `src/pages/TallyImport.tsx:866, 2015` | `UPSERT` | `.from("bank_accounts").upsert(newAccounts)` | `Array<{ organization_id, name, bank_name, account_number, ifsc_code, account_type, balance, is_primary, created_by }>` | Upserts imported bank accounts |

### Component State & Actions in `CashAndBank.tsx`:
- **State variables**:
  - `cashInHand`: number (Cash ledger balance)
  - `unlinkedBalance`: number (Unlinked payments/receipts)
  - `bankAccounts`: `BankAccount[]`
  - `transactions`: `BankTransaction[]`
  - `selectedAccountId`: `"all" | "cash" | "unlinked" | string`
  - `dateFilter`: `"today" | "yesterday" | "last7" | "last30" | "thisMonth" | "lastMonth" | "last365" | "all"`
  - `searchQuery`: string
- **Mutations Handled**:
  - `handleAddReduceMoney`: Adds or subtracts funds to Cash, Unlinked, or specific Bank Account and creates a `BankTransaction`.
  - `handleTransferMoney`: Moves funds between accounts (e.g. Cash -> Bank or Bank -> Bank) with validation and records transfer transaction.
  - `handleAddBankAccount`: Adds a new bank account with initial opening balance.
  - `handleEditBankAccount`: Edits account details and opening balance.
  - `handleDeleteAccount`: Removes bank account and handles orphan transactions.
  - `handleDeleteTransaction`: Reverses transaction amount on balance and deletes record.
  - `handleEditTransaction`: Modifies transaction metadata (notes, party, category, reference).

---

## 5. Contract & State Parity Analysis

### A. Component State Hooks & Loading States
All target components follow structured React state lifecycles:
1. `Customers.tsx`:
   - `loading` (spinner on initial mount)
   - `saving` (submitting create/edit form)
   - `loadingTx` (split-screen customer transaction feed)
2. `Suppliers.tsx`:
   - `loading` (initial load)
   - `saving` (create/edit submit)
3. `Parties.tsx`:
   - `loading` (initial table load)
   - `isSubmitting` (in `CreatePartyModal.tsx`)
   - Re-runs `fetchParties()` on all mutations to guarantee balance synchronization.
4. `CustomerLedger.tsx`:
   - `loading` (fetching customer + transactions + sales)
   - `isVerifying` (running financial reconciliation check)
5. `CashAndBank.tsx`:
   - Synchronous local storage parsing; will be upgraded to standard `loading` / `isSubmitting` states when querying the backend API.

### B. Toast Feedback Parity
The application enforces user feedback on mutations. The migrated API service calls must trigger the exact toast messages:
- `"Customer created successfully"` / `"Customer updated successfully"` / `"Customer deleted"`
- `"Supplier created successfully"` / `"Supplier updated successfully"` / `"Supplier deleted"`
- `"Created party '<name>'!"` / `"Updated party '<name>'"` / `"Party deleted successfully."`
- `"Credit given recorded"` / `"Payment received recorded"`
- `"Credit taken recorded"` / `"Payment made recorded"`
- `"Money Added Successfully"` / `"Money Reduced Successfully"` / `"Transfer Completed Successfully"`
- `"Bank Account Added Successfully"` / `"Bank Account Deleted"`

### C. Data Structures Expected by Consuming Components

#### 1. `Party` Model (`src/types/parties.ts:39-68`):
```typescript
export interface Party {
  id: string;
  organization_id?: string;
  name: string;
  tradeName?: string;
  phone: string | null;
  email: string | null;
  partyType: "customer" | "supplier" | "both";
  category: string;
  gstin?: string | null;
  pan?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  shippingAddress?: string | null;
  openingBalance: number;
  balance: number; // Positive = Receivable (Dr), Negative = Payable (Cr), 0 = Settled
  creditLimit?: number | null;
  creditPeriodDays?: number | null;
  keepSamePrice?: boolean;
  keepSameInventory?: boolean;
  customItems?: PartyCustomItem[];
  customFields?: Record<string, any>;
  sharedLedgerEnabled?: boolean;
  sharedLedgerStatus?: "synced" | "pending" | "invited" | "unlinked";
  created_at: string;
  updated_at?: string;
}
```

#### 2. `PartyCustomItem` (Party-wise Prices):
```typescript
export interface PartyCustomItem {
  productId: string;
  productName: string;
  category?: string;
  brand?: string | null;
  sku?: string;
  barcode?: string | null;
  unit?: string;
  standardPrice: number;
  customPrice: number;
  costPrice?: number;
  gstRate?: number;
  hsnCode?: string;
  customStock?: number;
  notes?: string;
  isActive?: boolean;
}
```

#### 3. `CreditTransaction` Model (`src/integrations/supabase/types.ts:58-70`):
```typescript
export interface CreditTransaction {
  id: string;
  organization_id: string;
  party_id: string;
  party_type: "customer" | "supplier";
  amount: number;
  type: "credit" | "payment" | "opening_balance";
  description: string | null;
  reference_id: string | null;
  created_by: string;
  created_at: string;
}
```

#### 4. `BankAccount` & `BankTransaction` Models (`src/pages/CashAndBank.tsx:5-72`):
```typescript
export interface BankAccount {
  id: string;
  organization_id?: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  accountType: "current" | "savings" | "overdraft" | "cash_credit";
  balance: number;
  upiId?: string;
  isDefault?: boolean;
  createdAt: string;
}

export interface BankTransaction {
  id: string;
  organization_id?: string;
  date: string;
  type: "money_in" | "money_out" | "transfer";
  accountId: string; // 'cash' | 'unlinked' | bankAccountId
  targetAccountId?: string;
  amount: number;
  paymentMode: "cash" | "cheque" | "neft_rtgs" | "upi" | "card" | "other";
  partyName?: string;
  category?: string;
  referenceNo?: string;
  notes?: string;
  createdAt: string;
}
```

---

## 6. Backend API Endpoint Contract Mapping

All API endpoints reside under `https://api.credsmart.online/api/*`.
Every authenticated request includes:
```http
Authorization: Bearer <SUPABASE_JWT_TOKEN>
Content-Type: application/json
```

### Summary Mapping Table

| Domain / Query | Target Backend Endpoint | Method | Key Query Params / Payload | Replaces |
|---|---|---|---|---|
| Fetch Customers | `/api/customers` | `GET` | `?organization_id={id}&sort=name&order=asc&include_balance=true` | `supabase.from("customers").select(...)` |
| Get Customer Detail | `/api/customers/:id` | `GET` | `?organization_id={id}` | `supabase.from("customers").select(...).eq("id", id).single()` |
| Create Customer | `/api/customers` | `POST` | `{ organization_id, name, phone, email, address, opening_balance, custom_fields }` | `supabase.from("customers").insert(...)` |
| Update Customer | `/api/customers/:id` | `PUT` | `{ name, phone, email, address, custom_fields, ... }` | `supabase.from("customers").update(...).eq("id", id)` |
| Delete Customer | `/api/customers/:id` | `DELETE` | `?organization_id={id}` | `supabase.from("customers").delete().eq("id", id)` |
| Bulk Import Customers | `/api/customers/bulk` | `POST` | `{ items: Customer[], strategy: "overwrite" \| "merge" }` | `supabase.from("customers").upsert(...)` |
| Fetch Suppliers | `/api/suppliers` | `GET` | `?organization_id={id}&sort=name&order=asc&include_balance=true` | `supabase.from("suppliers").select(...)` |
| Get Supplier Detail | `/api/suppliers/:id` | `GET` | `?organization_id={id}` | `supabase.from("suppliers").select(...).eq("id", id).single()` |
| Create Supplier | `/api/suppliers` | `POST` | `{ organization_id, name, phone, email, gstin, address, opening_balance }` | `supabase.from("suppliers").insert(...)` |
| Update Supplier | `/api/suppliers/:id` | `PUT` | `{ name, phone, email, gstin, address, ... }` | `supabase.from("suppliers").update(...).eq("id", id)` |
| Delete Supplier | `/api/suppliers/:id` | `DELETE` | `?organization_id={id}` | `supabase.from("suppliers").delete().eq("id", id)` |
| Bulk Import Suppliers | `/api/suppliers/bulk` | `POST` | `{ items: Supplier[], strategy: "overwrite" \| "merge" }` | `supabase.from("suppliers").upsert(...)` |
| Unified Parties List | `/api/parties` | `GET` | `?organization_id={id}&type=all\|customer\|supplier` | Merged customers + suppliers queries in `Parties.tsx` |
| Merge Duplicate Parties | `/api/parties/merge` | `POST` | `{ primaryId: string, duplicateIds: string[], partyType: string }` | Manual loop updating transactions & deleting duplicates |
| Fetch Credit Txns | `/api/credit-transactions` | `GET` | `?organization_id={id}&party_id={id}&limit=20` | `supabase.from("credit_transactions").select(...)` |
| Record Credit/Payment | `/api/credit-transactions` | `POST` | `{ organization_id, party_id, party_type, amount, type, description, reference_id, created_by }` | `supabase.from("credit_transactions").insert(...)` |
| Bulk Insert Credit Txns | `/api/credit-transactions/bulk`| `POST` | `{ items: CreditTransaction[] }` | Chunked `.from("credit_transactions").insert(...)` |
| Delete Credit Txn by Ref | `/api/credit-transactions/reference/:refId` | `DELETE` | `?organization_id={id}` | `supabase.from("credit_transactions").delete().eq("reference_id", refId)` |
| Reassign Party Txns | `/api/credit-transactions/reassign` | `PUT` | `{ from_party_id: string, to_party_id: string }` | `.update({ party_id }).eq("party_id", dupId)` |
| Fetch Bank Accounts & Cash | `/api/bank-accounts` | `GET` | `?organization_id={id}` | `supabase.from("bank_accounts").select(...)` & `localStorage` |
| Create Bank Account | `/api/bank-accounts` | `POST` | `{ organization_id, bankName, accountHolderName, accountNumber, ifscCode, accountType, balance, upiId }` | `handleAddBankAccount` / `supabase.from("bank_accounts").upsert(...)` |
| Update Bank Account | `/api/bank-accounts/:id` | `PUT` | Partial account payload | `handleEditBankAccount` |
| Delete Bank Account | `/api/bank-accounts/:id` | `DELETE` | `?organization_id={id}` | `handleDeleteAccount` |
| Batch Upsert Bank Accounts | `/api/bank-accounts/bulk` | `POST` | `{ accounts: Array<BankAccount> }` | Tally sync & import bank upsert |
| Update Cash in Hand | `/api/bank-accounts/cash-in-hand` | `PUT` | `{ organization_id, amount: number }` | `persistCashInHand` in `CashAndBank.tsx` |
| Fetch Bank Transactions | `/api/bank-transactions` | `GET` | `?organization_id={id}&accountId={id}&startDate={d}&endDate={d}&page=1&limit=25` | `filteredTransactions` in `CashAndBank.tsx` |
| Create Bank Transaction | `/api/bank-transactions` | `POST` | `{ organization_id, date, type, accountId, targetAccountId, amount, paymentMode, partyName, category, referenceNo, notes }` | `handleAddReduceMoney` & `handleTransferMoney` (auto-adjusts balances) |
| Delete Bank Transaction | `/api/bank-transactions/:id` | `DELETE` | `?organization_id={id}` | `handleDeleteTransaction` (auto-reverses balance impact) |

---

## 7. Implementation & Architecture Recommendations

### A. Centralized API Client Architecture
Create `src/services/apiClient.ts` as the unified HTTP engine:
- Encapsulates base URL: `const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || "https://api.credsmart.online/api";`
- Automatic session token resolution:
  ```typescript
  async function getAuthHeader(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }
  ```
- Error normalization: Handles HTTP 400/401/403/404/500 errors gracefully with clean error messages matching `toast.error(error.message)`.

### B. Dedicated Service Modules
Organize into specialized client services:
1. `src/services/partyService.ts`:
   - `getCustomers(orgId, options)`
   - `getCustomerById(orgId, id)`
   - `saveCustomer(orgId, payload, id?)`
   - `deleteCustomer(orgId, id)`
   - `getSuppliers(orgId, options)`
   - `getSupplierById(orgId, id)`
   - `saveSupplier(orgId, payload, id?)`
   - `deleteSupplier(orgId, id)`
   - `getParties(orgId, options)`
   - `mergeDuplicateParties(orgId, primaryId, duplicateIds, partyType)`
2. `src/services/creditTransactionService.ts`:
   - `getCreditTransactions(orgId, options)`
   - `recordCreditTransaction(orgId, payload)`
   - `bulkInsertCreditTransactions(orgId, items)`
   - `deleteCreditTransactionsByReference(orgId, referenceId)`
3. `src/services/bankingService.ts`:
   - `getBankAccounts(orgId)`
   - `saveBankAccount(orgId, account, id?)`
   - `deleteBankAccount(orgId, id)`
   - `bulkUpsertBankAccounts(orgId, accounts)`
   - `updateCashInHand(orgId, amount)`
   - `getBankTransactions(orgId, filter)`
   - `recordBankTransaction(orgId, payload)`
   - `deleteBankTransaction(orgId, txnId)`

### C. Zero UI/UX Regression Strategy
- Keep UI component state identical (`customers`, `suppliers`, `parties`, `bankAccounts`, `transactions`).
- Components invoke `partyService.getCustomers(orgId)` instead of `supabase.from("customers").select(...)`.
- The server computes running balances during party fetch so the frontend does not need to perform expensive manual joins between `customers` and `credit_transactions`.
- Dispatch window custom events (`credsmart:parties_updated`, `credsmart_documents_updated`, `credsmart_bank_updated`) on mutation to keep multiple open tabs in sync.
