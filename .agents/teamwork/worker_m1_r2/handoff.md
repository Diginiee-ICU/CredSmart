# Handoff Report: Worker M1 R2 — Cashier Route Gating Decoupling Remediation

**Agent**: `worker_m1_r2` (Implementer / QA / Specialist)  
**Date**: 2026-10-23T23:28:00Z  
**Target Files Modified**:
- `src/config/routes.ts`
- `src/test/challengerM1_2DecoupleAudit.test.ts`
**Parent Orchestrator**: `8ac6491a-275d-4c1c-b664-961cd66511b1`  
**Status**: COMPLETE (All acceptance criteria met, 0 compiler errors, 0 lint errors, 100% tests passing)

---

## 1. Observation

### 1.1 Pre-Modification State & Vulnerability
Prior to modification, `RESTRICTED_ROUTES_FOR_CASHIER` in `src/config/routes.ts` (lines 143–183) contained only `ROUTE_PATHS.crm` and `ROUTE_PATHS.crmRoles`, but omitted the 8 active CRM subroutes (`crmDashboard`, `crmAttendance`, `crmSalary`, `crmTasks`, `crmMeet`, `crmBroadcasts`, `crmAiAssistant`, `crmSupport`) and 6 settings subroutes (`settingsReminders`, `settingsCaSharing`, `settingsPricing`, `settingsRefer`, `settingsHelp`, `tallyImport`, along with legacy counterparts).

Furthermore, the cashier role branch in `isRouteAllowedForRole` (lines 376–379):
```typescript
if (role === "cashier") {
  return !RESTRICTED_ROUTES_FOR_CASHIER.has(url);
}
```
relied exclusively on exact Set membership lookup. Unlisted CRM subroutes (such as `/crm/attendance` or `/billing/settings/reminders`) returned `false` for `RESTRICTED_ROUTES_FOR_CASHIER.has(url)`, yielding `true` from `isRouteAllowedForRole`.

### 1.2 Implemented Changes
1. **`src/config/routes.ts` Lines 143–208**:
   - Added all canonical CRM subroutes:
     - `ROUTE_PATHS.crmDashboard`
     - `ROUTE_PATHS.crmAttendance`
     - `ROUTE_PATHS.crmSalary`
     - `ROUTE_PATHS.crmTasks`
     - `ROUTE_PATHS.crmMeet`
     - `ROUTE_PATHS.crmBroadcasts`
     - `ROUTE_PATHS.crmAiAssistant`
     - `ROUTE_PATHS.crmSupport`
   - Added all settings subroutes and legacy aliases:
     - `ROUTE_PATHS.settingsReminders`, `ROUTE_PATHS.settingsCaSharing`, `ROUTE_PATHS.settingsPricing`, `ROUTE_PATHS.settingsRefer`, `ROUTE_PATHS.settingsHelp`, `ROUTE_PATHS.tallyImport`
     - `"/settings/reminders"`, `"/settings/ca-sharing"`, `"/settings/pricing"`, `"/settings/refer"`, `"/settings/help"`, `"/tally-import"`
   - Updated `isRouteAllowedForRole` cashier block:
     ```typescript
     // Cashier
     if (role === "cashier") {
       if (url.startsWith("/crm")) return false;
       if (url.startsWith("/billing/settings") || url === "/billing/settings") return false;
       return !RESTRICTED_ROUTES_FOR_CASHIER.has(url);
     }
     ```
2. **`src/test/challengerM1_2DecoupleAudit.test.ts` Lines 138–174**:
   - Replaced the audit gap demonstration test with two exhaustive test cases asserting `toBe(false)` for cashiers across all CRM and settings subroutes.
   - Refactored `as any` casts in parameter normalization tests to `as unknown as string` to resolve ESLint `@typescript-eslint/no-explicit-any` warnings.

### 1.3 Tool Commands and Verbatim Results
1. **TypeScript Type Check**:
   - Command: `cmd /c npx tsc --noEmit`
   - Result: Exit code 0, 0 errors.
2. **ESLint Validation**:
   - Command: `cmd /c npx eslint src/config/routes.ts src/test/challengerM1_2DecoupleAudit.test.ts`
   - Result: Exit code 0, 0 problems (0 errors, 0 warnings).
3. **Challenger Audit Test Suite**:
   - Command: `cmd /c npx vitest run src/test/challengerM1_2DecoupleAudit.test.ts`
   - Result: Exit code 0.
   - Verbatim Output:
     ```text
     ✓ src/test/challengerM1_2DecoupleAudit.test.ts (52 tests) 433ms
     Test Files  1 passed (1)
          Tests  52 passed (52)
     ```
4. **CRM Shell & Decouple Route Suites**:
   - Command: `cmd /c npx vitest run src/test/crmShellRoutes.test.ts src/test/e2e/decoupleRoutes.test.ts`
   - Result: Exit code 0.
   - Verbatim Output:
     ```text
     ✓ src/test/e2e/decoupleRoutes.test.ts (68 tests) 171ms
     ✓ src/test/crmShellRoutes.test.ts (22 tests) 1610ms
     Test Files  2 passed (2)
          Tests  90 passed (90)
     ```
5. **Additional Regression Suites**:
   - Command: `cmd /c npx vitest run src/test/crmShellNavigation.audit.test.ts src/test/crmChallengerM1_2.test.ts`
   - Result: Exit code 0, 19/19 passed.
   - Command: `cmd /c npx vitest run src/test/challengerM1Decouple.test.tsx src/test/crmAttendanceRouteWiringChallenge.test.tsx`
   - Result: Exit code 0, 38/38 passed.

---

## 2. Logic Chain

1. **Premise 1 (Policy Requirement)**:
   As established in `PROJECT.md` and `DISPATCH.md`, cashier roles must be strictly restricted to POS billing operations and denied access to all CRM subroutes (`/crm/*`) and administrative settings (`/billing/settings/*`).
2. **Premise 2 (Root Cause)**:
   `isRouteAllowedForRole` previously relied solely on exact lookup in `RESTRICTED_ROUTES_FOR_CASHIER`. Because the Set only contained `/crm` and `/crm/roles`, querying any other CRM subpath (`/crm/attendance`, `/crm/salary`, etc.) resulted in lookup miss (`false`), and the negated return `!RESTRICTED_ROUTES_FOR_CASHIER.has(url)` permitted access.
3. **Premise 3 (Dual-Layer Defense-in-Depth Solution)**:
   - Layer 1 (Set Population): Explicitly adding every canonical and legacy CRM and settings route ensures direct lookups by UI components or helper utilities evaluate to restricted (`true`).
   - Layer 2 (Prefix Gating): Adding `if (url.startsWith("/crm")) return false;` and `if (url.startsWith("/billing/settings") || url === "/billing/settings") return false;` guarantees that deep links, query strings, and dynamic subroutes are unconditionally blocked for cashiers without requiring exhaustive list maintenance.
4. **Premise 4 (Preservation of Granular Custom Permissions)**:
   Lines 289–297 evaluate explicit `customPermissions` before reaching the cashier block. Hence, explicit super-admin feature overrides (such as `{ crm: true }`) continue to function as architecturally intended, while standard cashiers without custom grants are strictly blocked.
5. **Premise 5 (Verification & Integrity)**:
   The updated test suite in `challengerM1_2DecoupleAudit.test.ts` verifies that `isRouteAllowedForRole` returns `false` across every CRM and settings route, TypeScript compiles with zero errors, and all 199 tests across 7 vitest test files pass cleanly.

---

## 3. Caveats

1. **Protected Invoicing Files**:
   No changes were made to any of the 5 protected invoicing files (`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`).
2. **Custom Permission Overrides**:
   If an administrator grants a cashier user explicit custom permission `{ crm: true }`, `isRouteAllowedForRole` will honor the override because custom permissions are checked prior to role defaults. This is an intended design feature verified in `crmShellRoutes.test.ts`.

---

## 4. Conclusion

The cashier route gating remediation has been implemented with precision:
- `RESTRICTED_ROUTES_FOR_CASHIER` now contains all CRM subroutes, settings subroutes, and legacy routes.
- `isRouteAllowedForRole` enforces prefix denial on `/crm` and `/billing/settings` for `role === "cashier"`.
- `challengerM1_2DecoupleAudit.test.ts` comprehensively verifies complete access denial for cashiers on all CRM and settings subroutes.
- The build, lint, and all test suites pass with exit code 0.

---

## 5. Verification Method

To independently reproduce and verify this remediation:

1. **Type Check**:
   ```bash
   cmd /c npx tsc --noEmit
   ```
   *Expected*: Code 0, zero errors.

2. **Lint Check**:
   ```bash
   cmd /c npx eslint src/config/routes.ts src/test/challengerM1_2DecoupleAudit.test.ts
   ```
   *Expected*: Code 0, zero errors or warnings.

3. **Challenger Decouple Audit**:
   ```bash
   cmd /c npx vitest run src/test/challengerM1_2DecoupleAudit.test.ts
   ```
   *Expected*: 52/52 tests pass.

4. **CRM Shell & Decouple Route Verification**:
   ```bash
   cmd /c npx vitest run src/test/crmShellRoutes.test.ts src/test/e2e/decoupleRoutes.test.ts
   ```
   *Expected*: 90/90 tests pass.

5. **Decouple Regression Matrix**:
   ```bash
   cmd /c npx vitest run src/test/challengerM1Decouple.test.tsx src/test/crmAttendanceRouteWiringChallenge.test.tsx src/test/crmShellNavigation.audit.test.ts src/test/crmChallengerM1_2.test.ts
   ```
   *Expected*: 57/57 tests pass.

6. **Invalidation Conditions**:
   - `isRouteAllowedForRole(ROUTE_PATHS.crmAttendance, "cashier")` evaluates to `true`.
   - `isRouteAllowedForRole(ROUTE_PATHS.settingsReminders, "cashier")` evaluates to `true`.
   - Any modifications detected in protected sales/invoicing files.
