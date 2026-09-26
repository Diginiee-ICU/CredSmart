## 2026-09-26T03:49:36Z

You are worker_m2 (Role: Milestone 2 Worker).
Your working directory is: c:/Users/Rudra/Desktop/Git/CredSmart/.agents/teamwork/worker_m2
Read the authoritative user request at: c:/Users/Rudra/Desktop/Git/CredSmart/.agents/teamwork/ORIGINAL_REQUEST.md
Read the project specifications at: c:/Users/Rudra/Desktop/Git/CredSmart/PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File write ownership:
- src/services/autoSyncService.ts (executeDirectSyncIngestion signature, bank & cash persistence, credit_transactions opening balance schema fix, getSyncConfig deep merge)
- src/pages/TallyImport.tsx (handleDirectSaveParties opening balance schema fix)

Your tasks for Milestone 2 (Master Data, Balances, & Bank/Cash Pipeline):
1. In src/services/autoSyncService.ts:
   - In `executeDirectSyncIngestion`:
     - Update parameter signature for `parsedData` to include `bankAccounts?: TallyBankAccount[]; cashInHand?: number;`.
     - Ingest bank accounts and cash-in-hand:
       - If `parsedData.bankAccounts` and `syncConfig?.syncScope?.banks !== false`:
         - Probe Supabase for `bank_accounts` table: `await supabase.from("bank_accounts").select("id").limit(1)`. If available without error, upsert bank accounts.
         - Reliably persist to localStorage key `credsmart_bank_accounts_${orgId}` as JSON array of BankAccount objects (`id`, `name`, `bankName`, `accountNumber`, `ifscCode`, `accountType: "current"`, `balance`, `isPrimary`, `createdAt`).
       - If `parsedData.cashInHand !== undefined && parsedData.cashInHand !== null`:
         - Persist to localStorage key `credsmart_cash_in_hand_${orgId}`.
         - If `typeof window !== "undefined"`, dispatch CustomEvent `"credsmart_bank_updated"` with `{ detail: { orgId } }`.
       - Update return values: set `banksCount` and `banksSynced` to the count of ingested bank accounts.
     - Fix Party Opening Balance Ingestion:
       - In lines ~605-657: replace the invalid columns (`customer_id`, `supplier_id`, `payment_mode`, `status`, `transaction_date`) with the exact valid columns from `src/integrations/supabase/types.ts`:
         - `organization_id`: orgId
         - `party_id`: cust.id (or supp.id)
         - `party_type`: "customer" (or "supplier")
         - `amount`: Math.abs(origParty.openingBalance)
         - `type`: origParty.openingBalance >= 0 ? "credit" : "payment"
         - `description`: "Opening Balance"
         - `reference_id`: "SYNC-OPENING"
         - `created_by`: userId || "00000000-0000-0000-0000-000000000000"
       - Set `balancesCount` and `balancesSynced` in return values to the count of opening balance records inserted.
     - Fix `getSyncConfig`:
       - When loading config from localStorage, do a deep merge on `syncScope` with default `syncScope` so `syncScope.banks` is guaranteed to be `true` even for older cached configs.
2. In src/pages/TallyImport.tsx:
   - In `handleDirectSaveParties`:
     - In the opening balance insertion into `credit_transactions`, ensure:
       - `organization_id`: orgId
       - `party_id`: partyId
       - `party_type`: isSupplier ? "supplier" : "customer"
       - `amount`: Math.abs(opBal)
       - `type`: opBal >= 0 ? "credit" : "payment"
       - `description`: "Opening Balance"
       - `reference_id`: "IMPORT-OPENING"
       - `created_by`: user?.id || "00000000-0000-0000-0000-000000000000"
3. Verify changes: ensure no syntax or type errors.
4. Write handoff report to `c:/Users/Rudra/Desktop/Git/CredSmart/.agents/teamwork/worker_m2/handoff.md`.
5. Send a completion message to the orchestrator (caller id).
