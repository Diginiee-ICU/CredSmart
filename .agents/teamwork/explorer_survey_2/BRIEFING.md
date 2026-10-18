# BRIEFING — 2026-10-18T17:50:00Z

## Mission
Explore and survey the CredSmart codebase for the Frontend Supabase Table Query Migration to Dedicated Backend API project, focusing on Customers, Suppliers, Parties, Khata records, Cash & Bank, Ledger Accounts, Contract & State Parity, and Backend API Contract Mapping.

## 🔒 My Identity
- Archetype: explorer
- Roles: CRM Phase 2 UI infrastructure & design system survey explorer
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_2
- Original parent: 1beca3ca-d4b2-4508-99a0-6c9d39936bfb
- Milestone: CRM Phase 2 Survey & UI Infrastructure Analysis
- Updated Archetype: explorer
- Updated Roles: Frontend Supabase Table Query Migration Survey Explorer (Parties, Khata, Cash & Bank, Ledgers)
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_2
- New parent: 73ee3452-ffda-43b4-83da-c3ca2006c47f
- Milestone: Survey & Audit for Frontend Supabase Query Migration to Dedicated Backend API

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do NOT modify source code files
- Document how src/pages/crm/Attendance.tsx should be constructed to conform 100% with CRM design system, mobile responsiveness, and permission gating
- Write detailed analysis report to analysis.md and create self-contained handoff.md
- Focus on Customers, Suppliers, Parties, Credit Transactions, Party-wise Prices, Opening Balances, Khata records, Bank Accounts, Cash Ledgers, and Bank Transactions
- Read-only audit of all direct `supabase.from(...)` queries for these domains

## Current Parent
- Conversation ID: 73ee3452-ffda-43b4-83da-c3ca2006c47f
- Updated: 2026-10-18T17:50:00Z

## Investigation State
- **Explored paths**:
  - `src/pages/Customers.tsx` (all direct customer & credit queries, split-screen ledger)
  - `src/pages/Suppliers.tsx` (all direct supplier & credit queries)
  - `src/pages/Parties.tsx` (unified party queries, dynamic `targetTable` inserts, updates, deletes, bulk import, merge duplicates)
  - `src/pages/CustomerLedger.tsx` (single customer fetch, transactions fetch, realtime subscriptions, automated reconciliation)
  - `src/pages/CashAndBank.tsx` (localStorage banking & cash ledger, transactions, accounts)
  - `src/pages/POSBilling.tsx` (customer fetch, quick add, credit sale transaction recording)
  - `src/components/SalesInvoiceModal.tsx` (customer fetch with custom item prices, quick add)
  - `src/components/PurchaseInvoiceModal.tsx` & `PurchaseInvoiceForm.tsx` (supplier & customer fetch, quick add)
  - `src/components/AppLayout.tsx` & `src/components/invoices/mobile/CreatePartyModal.tsx` (quick add party modals)
  - `src/services/documentsService.ts` & `src/services/networkInvoicingService.ts` (supplier resolution & credit note / debit note ledger recording)
  - `src/services/autoSyncService.ts` & `src/pages/TallyImport.tsx` (high-throughput batch customer, supplier, credit transaction, and bank account synchronization)
  - `src/utils/offlineQueue.ts` (PWA offline replay queries)
- **Key findings**:
  - 52 distinct client-side Supabase table queries across `customers`, `suppliers`, and `credit_transactions`, plus 4 queries on `bank_accounts`.
  - `party_wise_prices` are serialized into `custom_fields.customItems` inside the customer/supplier record rather than in a separate table.
  - Cash & Bank is currently driven by `localStorage` (`credsmart_bank_accounts_${orgId}`, `credsmart_bank_txns_${orgId}`, `credsmart_cash_in_hand_${orgId}`) while Tally sync services probe `bank_accounts`.
  - Fully mapped to REST endpoints under `https://api.credsmart.online/api/*`.
- **Unexplored areas**: None. Domain audit is complete.

## Key Decisions Made
- Recommending a centralized `apiClient.ts` with automatic Supabase JWT Bearer token propagation.
- Specifying bulk endpoints (`/api/customers/bulk`, `/api/suppliers/bulk`, `/api/credit-transactions/bulk`) to support Tally sync chunking.
- Keeping exact UI contract and state parity across all pages and modals.

## Artifact Index
- `analysis.md` — Full investigation findings, complete line-by-line query catalogue, and API mapping specification
- `handoff.md` — 5-component handoff report for orchestrator and implementers
- `progress.md` — Heartbeat and step tracking
- `DISPATCH.md` — Stored dispatch instructions
