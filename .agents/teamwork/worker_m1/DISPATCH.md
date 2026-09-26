## 2026-09-26T03:29:49+05:30

You are worker_m1 (Role: Milestone 1 Worker).
Your working directory is: c:/Users/Rudra/Desktop/Git/CredSmart/.agents/teamwork/worker_m1
Read the authoritative user request at: c:/Users/Rudra/Desktop/Git/CredSmart/.agents/teamwork/ORIGINAL_REQUEST.md
Read the project specifications at: c:/Users/Rudra/Desktop/Git/CredSmart/PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File write ownership:
- src/services/autoSyncService.ts (query constants, SyncConfig interface, getDefaultSyncConfig)
- scripts/credsmart-sync-agent/index.cjs (daybook query constants)

Your tasks for Milestone 1 (Query Protocols & Scope Config):
1. In src/services/autoSyncService.ts, update `TALLY_EXPORT_DAYBOOK_XML`:
   Inside <STATICVARIABLES>, add:
   <SVFROMDATE>20200401</SVFROMDATE>
   <SVTODATE>20291231</SVTODATE>
   Ensure TALLY_EXPORT_DAYBOOK_XML includes these parameters.
2. In scripts/credsmart-sync-agent/index.cjs, update the TALLY_EXPORT_DAYBOOK_XML string to also include <SVFROMDATE>20200401</SVFROMDATE> and <SVTODATE>20291231</SVTODATE>.
3. In src/services/autoSyncService.ts:
   - Update `SyncConfig.syncScope` to include `banks: boolean`.
   - Update `SyncConfig.lastSyncStats` to include `banks: number` and `balances: number`.
   - Update `SyncAuditLog` to include `banksSynced?: number` and `balancesSynced?: number`.
   - Update `SyncExecutionResult` to include `banksCount?: number` and `balancesCount?: number`.
   - Update `getDefaultSyncConfig(orgId)` so that all 5 entities are enabled by default:
     syncScope: { items: true, parties: true, balances: true, vouchers: true, banks: true }
4. Run tests:
   Run `npx vitest run src/test/tallyImport.test.ts src/test/tallyBridge.test.ts` to verify zero regressions.
5. Write your handoff report to:
c:/Users/Rudra/Desktop/Git/CredSmart/.agents/teamwork/worker_m1/handoff.md
6. Send a message to the orchestrator (caller id) with summary and report path.
