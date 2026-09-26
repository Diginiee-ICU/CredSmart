# Milestone 1 Challenger Report: Query Protocols & Scope Config

**Verdict**: **APPROVE** (with 2 non-blocking advisories)

---

## 1. Observation

Direct code and structural observations across the repository targets:

### A. `TALLY_EXPORT_DAYBOOK_XML` in `src/services/autoSyncService.ts` (lines 182–201)
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
          <SVFROMDATE>20200401</SVFROMDATE>
          <SVTODATE>20291231</SVTODATE>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>
`.trim();
```
- Line 191: `<REPORTNAME>Day Book</REPORTNAME>`.
- Line 192: `<STATICVARIABLES>`.
- Line 194: `<SVFROMDATE>20200401</SVFROMDATE>`.
- Line 195: `<SVTODATE>20291231</SVTODATE>`.
- Line 196: `</STATICVARIABLES>`.
- Closing elements `</REQUESTDESC>`, `</EXPORTDATA>`, `</BODY>`, `</ENVELOPE>` strictly match their openers.

### B. `TALLY_EXPORT_DAYBOOK_XML` in `scripts/credsmart-sync-agent/index.cjs` (lines 35–51, 69, 221–225)
```javascript
const TALLY_EXPORT_DAYBOOK_XML = `
<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Day Book</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          <EXPLODEFLAG>Yes</EXPLODEFLAG>
          <SVFROMDATE>20200401</SVFROMDATE>
          <SVTODATE>20291231</SVTODATE>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`.trim();
```
- Line 45: `<SVFROMDATE>20200401</SVFROMDATE>`.
- Line 46: `<SVTODATE>20291231</SVTODATE>`.
- Line 69: `TALLY_REQUESTS.daybook: TALLY_EXPORT_DAYBOOK_XML`.
- Line 223: `module.exports = { server, TALLY_EXPORT_DAYBOOK_XML, TALLY_REQUESTS };`.

### C. `getDefaultSyncConfig` in `src/services/autoSyncService.ts` (lines 82–103)
```typescript
export function getDefaultSyncConfig(orgId: string): SyncConfig {
  const desktopToken =
    typeof window !== "undefined" ? window.credsmartDesktop?.pairingToken : undefined;
  return {
    organizationId: orgId,
    enabled: false,
    pairingToken: desktopToken || `crds_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`,
    selectedSoftware: "tally",
    tallyHost: "http://127.0.0.1:9000",
    syncIntervalMinutes: 15,
    syncScope: {
      items: true,
      parties: true,
      balances: true,
      vouchers: true,
      banks: true,
    },
    conflictStrategy: "erp_master",
    lastSyncStatus: "idle",
    history: [],
  };
}
```
- `syncScope.items === true` (strict boolean)
- `syncScope.parties === true` (strict boolean)
- `syncScope.balances === true` (strict boolean)
- `syncScope.vouchers === true` (strict boolean)
- `syncScope.banks === true` (strict boolean)

### D. TypeScript Interface Conformance in `src/services/autoSyncService.ts` (lines 10–63)
- `SyncAuditLog`:
  - Line 18: `banksSynced?: number;`
  - Line 19: `balancesSynced?: number;`
- `SyncConfig`:
  - Line 37: `banks: boolean;` inside `syncScope`
  - Lines 46–47: `banks: number;` and `balances: number;` inside `lastSyncStats`
- `SyncExecutionResult`:
  - Line 58: `banksCount?: number;`
  - Line 59: `balancesCount?: number;`
- Fallback and return values in `executeDirectSyncIngestion`:
  - Lines 754–755: `banksSynced: 0, balancesSynced: 0`
  - Line 766: `updatedConfig.lastSyncStats = { items: itemsCount, parties: partiesCount, vouchers: vouchersCount, banks: 0, balances: 0 }`
  - Lines 775–776: `banksCount: 0, balancesCount: 0`
  - Lines 793–794: `banksSynced: 0, balancesSynced: 0`
  - Line 806: `banksCount: 0, balancesCount: 0`

---

## 2. Logic Chain

1. **XML Well-Formedness & Nesting**:
   - Both XML definitions contain a single root element (`<ENVELOPE>`).
   - Every tag is closed symmetrically without overlapping or orphaned tags.
   - `<STATICVARIABLES>` is an immediate child of `<REQUESTDESC>`.
   - `<SVFROMDATE>` and `<SVTODATE>` are properly nested within `<STATICVARIABLES>`, formatted as `20200401` and `20291231` (YYYYMMDD standard date syntax recognized by Tally Prime / ERP 9).
   - This directly satisfies Requirement R2 and PROJECT.md Feature #1.

2. **Sync Scope Configuration**:
   - `getDefaultSyncConfig(orgId)` constructs and returns `syncScope` with all 5 flags (`items`, `parties`, `balances`, `vouchers`, `banks`) explicitly assigned `true`.
   - This directly satisfies Requirement R3 and PROJECT.md Feature #2.

3. **Type Safety & Runtime Stability**:
   - All 5 entity fields are typed across `SyncConfig.syncScope`, `SyncConfig.lastSyncStats`, `SyncAuditLog`, and `SyncExecutionResult`.
   - `executeDirectSyncIngestion` initializes `banks` and `balances` count fields to numeric zero (`0`) across both success and exception code paths, eliminating `undefined` access errors or downstream UI crashes.

---

## 3. Caveats & Adversarial Findings

### Advisory 1: Unscoped `server.listen()` in `scripts/credsmart-sync-agent/index.cjs`
- **Finding**: In `scripts/credsmart-sync-agent/index.cjs`, line 216 calls `server.listen(PORT, "127.0.0.1", ...)` at top-level.
- **Impact**: While child process execution via `spawn()` (used in `src/test/tallyBridge.test.ts`) works normally, requiring `index.cjs` as a module (`require('.../index.cjs')`) will immediately start the server and bind port 9005, keeping the Node event loop alive.
- **Recommendation for M5 / Hardening**: Guard server startup with `if (require.main === module) { server.listen(...) }`.

### Advisory 2: Shallow Spread in `getSyncConfig(orgId)`
- **Finding**: Line 112 in `src/services/autoSyncService.ts` uses:
  ```typescript
  return {
    ...getDefaultSyncConfig(orgId),
    ...parsed,
  };
  ```
- **Impact**: If a client has a pre-existing legacy sync config saved in `localStorage` prior to Milestone 1, `parsed.syncScope` lacks `banks`. Because `parsed` shallowly overrides the object, `syncScope.banks` would evaluate to `undefined` rather than defaulting to `true` for that legacy user.
- **Recommendation for M2 / M4**: Enhance `getSyncConfig` to merge `syncScope` deeply:
  ```typescript
  syncScope: {
    ...getDefaultSyncConfig(orgId).syncScope,
    ...(parsed?.syncScope || {}),
  },
  ```

---

## 4. Conclusion

**Verdict: APPROVE.**

The worker has successfully and accurately implemented all requirements for Milestone 1:
- `TALLY_EXPORT_DAYBOOK_XML` is well-formed XML with `<SVFROMDATE>20200401</SVFROMDATE>` and `<SVTODATE>20291231</SVTODATE>` properly nested within `<STATICVARIABLES>` in both `src/services/autoSyncService.ts` and `scripts/credsmart-sync-agent/index.cjs`.
- `getDefaultSyncConfig` returns `syncScope` with all 5 entity types (`items`, `parties`, `balances`, `vouchers`, `banks`) strictly set to `true`.
- TypeScript definitions and runtime assignments in `autoSyncService.ts` cleanly accommodate all 5 entities across audit logs, config stats, and execution results.

---

## 5. Verification Method

1. **Standalone Test Suite**:
   Run the verification test suite created in `scripts/test_challenger_m1.cjs`:
   ```bash
   node scripts/test_challenger_m1.cjs
   ```
   Expected output:
   - `autoSyncService.ts exports TALLY_EXPORT_DAYBOOK_XML` [PASS]
   - `autoSync XML starts with <ENVELOPE> and ends with </ENVELOPE>` [PASS]
   - `autoSync XML specifies REPORTNAME Day Book` [PASS]
   - `SVFROMDATE is nested inside STATICVARIABLES` [PASS]
   - `SVTODATE is nested inside STATICVARIABLES` [PASS]
   - `index.cjs defines TALLY_EXPORT_DAYBOOK_XML with matching date bounds` [PASS]
   - `getDefaultSyncConfig sets all 5 syncScope flags strictly to true` [PASS]
   - `SyncConfig.syncScope has banks: boolean` [PASS]
   - `Results: 15 passed, 0 failed.`

2. **Vitest E2E Suite** (when npm dependencies are installed):
   ```bash
   npx vitest run src/test/tallyE2E.test.ts -t "1.1 DayBook XML Date Range Support"
   npx vitest run src/test/tallyE2E.test.ts -t "1.2 SyncConfig & Scope Expansion"
   ```

3. **Invalidation Conditions**:
   - Any modification altering the tag symmetry or omitting `<SVFROMDATE>`/`<SVTODATE>`.
   - Modifying `getDefaultSyncConfig` to set any of `items`, `parties`, `balances`, `vouchers`, `banks` to false.
