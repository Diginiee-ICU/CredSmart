# Milestone 1 Handoff Report: Query Protocols & Scope Config

## 1. Observation
- In `src/services/autoSyncService.ts`:
  - `TALLY_EXPORT_DAYBOOK_XML` previously defined `<REPORTNAME>Day Book</REPORTNAME>` with `<STATICVARIABLES>` containing only `<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>` and `<EXPLODEFLAG>Yes</EXPLODEFLAG>`.
  - Lines 10-57 defined `SyncAuditLog`, `SyncConfig`, and `SyncExecutionResult`. `SyncConfig.syncScope` had only `items`, `parties`, `balances`, and `vouchers`. `lastSyncStats` had only `items`, `parties`, `vouchers`.
  - `getDefaultSyncConfig(orgId)` previously configured `syncScope` with `vouchers: false` and did not include `banks`.
- In `scripts/credsmart-sync-agent/index.cjs`:
  - `TALLY_REQUESTS.daybook` contained only `<SVEXPORTFORMAT>` and `<EXPLODEFLAG>` inside `<STATICVARIABLES>`, without historical date limits.
- Exact modifications made:
  1. `src/services/autoSyncService.ts`:
     - In `TALLY_EXPORT_DAYBOOK_XML`: added `<SVFROMDATE>20200401</SVFROMDATE>` and `<SVTODATE>20291231</SVTODATE>` to `<STATICVARIABLES>`.
     - In `SyncAuditLog`: added `banksSynced?: number;` and `balancesSynced?: number;`.
     - In `SyncConfig.syncScope`: added `banks: boolean;`.
     - In `SyncConfig.lastSyncStats`: added `banks: number;` and `balances: number;`.
     - In `SyncExecutionResult`: added `banksCount?: number;` and `balancesCount?: number;`.
     - In `getDefaultSyncConfig`: updated `syncScope` to:
       ```typescript
       syncScope: {
         items: true,
         parties: true,
         balances: true,
         vouchers: true,
         banks: true,
       }
       ```
     - In `executeDirectSyncIngestion`: populated default 0 for `banksSynced`, `balancesSynced`, `banks`, `balances`, `banksCount`, and `balancesCount` in the success and failure return paths.
  2. `scripts/credsmart-sync-agent/index.cjs`:
     - Defined `TALLY_EXPORT_DAYBOOK_XML` with `<SVFROMDATE>20200401</SVFROMDATE>` and `<SVTODATE>20291231</SVTODATE>` within `<STATICVARIABLES>`.
     - Used `TALLY_EXPORT_DAYBOOK_XML` in `TALLY_REQUESTS.daybook`.
     - Exported `server`, `TALLY_EXPORT_DAYBOOK_XML`, and `TALLY_REQUESTS` in `module.exports`.

## 2. Logic Chain
- Historical synchronization requires Tally to output DayBook transactions across a wide historical window rather than defaulting to the current single transaction date. Adding `<SVFROMDATE>20200401</SVFROMDATE>` and `<SVTODATE>20291231</SVTODATE>` directly in the TDL request envelope instructs Tally's export engine to fetch all transactions within the 2020-2029 window across both browser live queries and the desktop sync bridge agent.
- Expanding `SyncConfig.syncScope` with `banks: boolean` and default `true` fulfills requirement R3 / Feature 2 to enable full 5-entity synchronization (`items`, `parties`, `balances`, `vouchers`, `banks`).
- Expanding `lastSyncStats`, `SyncAuditLog`, and `SyncExecutionResult` provides the typed structure required for Milestone 2, Milestone 3, and Milestone 4 to accurately record and present entity ingestion counts for all 5 domains.
- Populating default 0 counts in `executeDirectSyncIngestion` prevents undefined reference errors or missing property TypeScript issues during the transitional milestone phase.

## 3. Caveats
- No local `node_modules` directory was present in the repository root at invocation time, causing standalone execution of `vitest` without prior package installation to fail resolution of `@vitejs/plugin-react-swc`.
- Interactive permission prompt for executing terminal commands timed out awaiting user response; as mandated, fallback to non-interactive verification and structural code inspection was performed.
- Live ingestion of bank accounts, cash in hand, and full voucher line items into Supabase tables will be handled by subsequent workers (Milestones 2 & 3).

## 4. Conclusion
Milestone 1 is complete. `TALLY_EXPORT_DAYBOOK_XML` contains `<SVFROMDATE>20200401</SVFROMDATE>` and `<SVTODATE>20291231</SVTODATE>` in both `src/services/autoSyncService.ts` and `scripts/credsmart-sync-agent/index.cjs`. All 5 entities (`items`, `parties`, `balances`, `vouchers`, `banks`) are declared in `SyncConfig`, typed across stats and logs, and enabled by default in `getDefaultSyncConfig`.

## 5. Verification Method
1. Inspect `src/services/autoSyncService.ts`:
   - Line ~182: Verify `TALLY_EXPORT_DAYBOOK_XML` contains `<SVFROMDATE>20200401</SVFROMDATE>` and `<SVTODATE>20291231</SVTODATE>`.
   - Line ~18: Verify `SyncAuditLog` has `banksSynced?: number` and `balancesSynced?: number`.
   - Line ~37: Verify `SyncConfig.syncScope` has `banks: boolean`.
   - Line ~46: Verify `SyncConfig.lastSyncStats` has `banks: number` and `balances: number`.
   - Line ~58: Verify `SyncExecutionResult` has `banksCount?: number` and `balancesCount?: number`.
   - Line ~93: Verify `getDefaultSyncConfig` initializes `syncScope` with all 5 flags set to `true`.
2. Inspect `scripts/credsmart-sync-agent/index.cjs`:
   - Line ~35: Verify `TALLY_EXPORT_DAYBOOK_XML` is defined and includes the date range.
   - Line ~221: Verify `module.exports` exports `TALLY_EXPORT_DAYBOOK_XML`.
3. Test suite command (when packages are installed):
   `npx vitest run src/test/tallyImport.test.ts src/test/tallyBridge.test.ts`
