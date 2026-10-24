# Handoff Report: Reviewer M1 (Iteration 2.1) — Cashier RBAC Remediation & Route Decoupling Review

**Reviewer**: `reviewer_m1_r2_1` (Reviewer & Adversarial Critic)  
**Parent Orchestrator**: `8ac6491a-275d-4c1c-b664-961cd66511b1`  
**Date**: 2026-10-23T23:38:00Z  
**Work Product Reviewed**: Worker M1 R2 (`worker_m1_r2`) remediation in:
- `src/config/routes.ts`
- `src/test/challengerM1_2DecoupleAudit.test.ts`
**Verdict**: **APPROVE**  
**Integrity Audit**: **PASSED (0 integrity violations, 0 shortcuts, genuine defense-in-depth)**

---

## 1. Observation

### 1.1 Direct Source Code Inspection
1. **`src/config/routes.ts` Lines 143–203 (`RESTRICTED_ROUTES_FOR_CASHIER`)**:
   `RESTRICTED_ROUTES_FOR_CASHIER` now contains all canonical CRM routes and subroutes:
   - `ROUTE_PATHS.crm` (`/crm`)
   - `ROUTE_PATHS.crmDashboard` (`/crm`)
   - `ROUTE_PATHS.crmAttendance` (`/crm/attendance`)
   - `ROUTE_PATHS.crmSalary` (`/crm/salary`)
   - `ROUTE_PATHS.crmTasks` (`/crm/tasks`)
   - `ROUTE_PATHS.crmMeet` (`/crm/meet`)
   - `ROUTE_PATHS.crmBroadcasts` (`/crm/broadcasts`)
   - `ROUTE_PATHS.crmAiAssistant` (`/crm/ai-assistant`)
   - `ROUTE_PATHS.crmSupport` (`/crm/support`)
   - `ROUTE_PATHS.crmRoles` (`/crm/roles`)
   
   It also contains all canonical settings subroutes and legacy aliases:
   - `ROUTE_PATHS.settings`, `businessSettings`, `invoiceSettings`, `printSettings`, `settingsReminders`, `settingsCaSharing`, `settingsPricing`, `settingsRefer`, `settingsHelp`, `tallyImport`
   - `"/settings"`, `"/settings/business"`, `"/settings/invoice"`, `"/settings/print"`, `"/settings/reminders"`, `"/settings/ca-sharing"`, `"/settings/pricing"`, `"/settings/refer"`, `"/settings/help"`, `"/tally-import"`.

2. **`src/config/routes.ts` Lines 397–401 (`isRouteAllowedForRole` Cashier Gating)**:
   ```typescript
   // Cashier
   if (role === "cashier") {
     if (url.startsWith("/crm")) return false;
     if (url.startsWith("/billing/settings") || url === "/billing/settings") return false;
     return !RESTRICTED_ROUTES_FOR_CASHIER.has(url);
   }
   ```
   This implements dual-layer protection:
   - Layer 1: Prefix matching denies any path starting with `/crm` or `/billing/settings` (covering nested routes, dynamic parameters, and query parameters).
   - Layer 2: Explicit Set lookup in `RESTRICTED_ROUTES_FOR_CASHIER` blocks any remaining restricted routes (such as `/billing/dashboard`, `/billing/purchases`, `/billing/reports`, `/billing/staff`, `/billing/expenses`, etc.).
   
3. **`src/config/routes.ts` Lines 259–299 (`normalizeRouteForRbac`)**:
   Incoming paths are normalized prior to evaluation. Legacy paths like `/settings/reminders` are mapped to `/billing/settings/reminders`, allowing prefix and set guards to evaluate identically across legacy and canonical paths.

4. **`src/test/challengerM1_2DecoupleAudit.test.ts` Lines 138–169**:
   Contains comprehensive assertions validating that cashiers are denied access to:
   - All CRM routes: `ROUTE_PATHS.crm`, `crmDashboard`, `crmRoles`, `crmAttendance`, `crmSalary`, `crmTasks`, `crmMeet`, `crmBroadcasts`, `crmAiAssistant`, `crmSupport`, `/crm/attendance`, `/crm/salary`, `/crm/tasks`.
   - All settings routes: `ROUTE_PATHS.settings`, `businessSettings`, `invoiceSettings`, `printSettings`, `settingsReminders`, `settingsCaSharing`, `settingsPricing`, `settingsRefer`, `settingsHelp`, `tallyImport`, `/billing/settings/reminders`, `/settings/reminders`, `/settings/ca-sharing`, `/settings/refer`.
   - Casts refactored from `as any` to `as unknown as string` ensuring 0 ESLint warnings.

5. **Invoicing Protection Invariant**:
   All 5 protected invoicing files (`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`) remain 100% untampered with size > 1000 bytes.

### 1.2 Independent Verification Tool Commands & Verbatim Results
1. **TypeScript Static Analysis**:
   - Command: `cmd /c npx tsc --noEmit`
   - Exit Code: `0`
   - Output: 0 compilation errors.

2. **Primary Vitest Verification Suite**:
   - Command: `cmd /c npx vitest run src/test/challengerM1_2DecoupleAudit.test.ts src/test/crmShellRoutes.test.ts src/test/e2e/decoupleRoutes.test.ts`
   - Exit Code: `0`
   - Result:
     ```text
     ✓ src/test/e2e/decoupleRoutes.test.ts (68 tests) 628ms
     ✓ src/test/challengerM1_2DecoupleAudit.test.ts (52 tests) 306ms
     ✓ src/test/crmShellRoutes.test.ts (22 tests) 1186ms

     Test Files  3 passed (3)
          Tests  142 passed (142)
     ```

3. **ESLint Code Health Check**:
   - Command: `cmd /c npx eslint src/config/routes.ts src/test/challengerM1_2DecoupleAudit.test.ts`
   - Exit Code: `0`
   - Output: 0 errors, 0 warnings.

4. **Regression Matrix Across CRM & Decoupling**:
   - Command: `cmd /c npx vitest run src/test/challengerM1Decouple.test.tsx src/test/crmAttendanceRouteWiringChallenge.test.tsx src/test/crmShellNavigation.audit.test.ts src/test/crmChallengerM1_2.test.ts`
   - Exit Code: `0`
   - Result: 4 test files passed, 57 passed (57).

5. **Full E2E Decoupling Suite**:
   - Command: `cmd /c npx vitest run src/test/e2e/`
   - Exit Code: `0`
   - Result: 4 test files passed, 300 passed (300).

6. **Production Build Compilation**:
   - Command: `cmd /c npm run build`
   - Exit Code: `0`
   - Result: Built in 1m 52s, generating production bundle cleanly.

---

## 2. Logic Chain

1. **Premise 1 (Policy Specification)**:
   Under `PROJECT.md` and `DISPATCH.md`, cashiers are strictly confined to POS billing operations and must be denied access to all CRM subroutes (`/crm/*`) and administrative settings (`/billing/settings/*`).
2. **Premise 2 (Vulnerability Identification)**:
   Prior to this iteration, `RESTRICTED_ROUTES_FOR_CASHIER` contained only `/crm` and `/crm/roles`, and `isRouteAllowedForRole` checked only exact set membership. Consequently, unlisted subroutes (e.g. `/crm/attendance`) fell through and allowed access.
3. **Premise 3 (Evaluation of the Fix)**:
   Worker M1 R2 introduced both:
   - Full set population for all 10 canonical CRM paths and 10 settings paths (and legacy aliases).
   - Generalized prefix blocking: `url.startsWith("/crm")` and `url.startsWith("/billing/settings") || url === "/billing/settings"`.
   This ensures complete coverage even if new subroutes or dynamic query parameters are added.
4. **Premise 4 (Non-Regression for Other Roles)**:
   Full-access roles (`store_owner`, `super_admin`, `admin`, `owner`, `manager`, `partner`) are evaluated prior to the cashier block and return `true`. Granular custom permission overrides (`customPermissions = { crm: true }` or `{ crm: false }`) are evaluated at the top of `isRouteAllowedForRole` before role checks. Thus, other roles and administrative overrides operate without unintended regressions.
5. **Premise 5 (Integrity Verification)**:
   Source code review confirms zero hardcoded outputs, zero facade implementations, and zero bypassed checks. All tests run authentic assertions against real production functions.
6. **Conclusion**:
   The remediation satisfies all correctness, quality, and security requirements. The verdict is `APPROVE`.

---

## 3. Caveats

1. **Custom Permission Overrides**:
   As designed and verified in `crmShellRoutes.test.ts`, if an administrator explicitly grants `{ crm: true }` in `customPermissions` to a cashier user, `isRouteAllowedForRole` intentionally respects that grant.
2. **Network/Backend Latency**:
   Static and unit/E2E test verification runs in node/jsdom environment; live cloud latency was not tested as this is purely client-side route authorization logic.

---

## 4. Conclusion

**Verdict: APPROVE**

Worker M1 R2 has resolved the cashier route gating vulnerability with high architectural precision and defense-in-depth:
- Complete denial for cashier on all CRM subroutes (`/crm/*`) and settings subroutes (`/billing/settings/*`).
- Continued access for cashiers to retail POS, checkout, sales, items, and parties.
- Zero regressions across existing full-access roles, legacy redirect systems, and protected invoicing files.
- 100% test pass rate across 142 primary tests, 57 regression tests, and 300 E2E tests.
- 0 TypeScript compiler errors and 0 ESLint errors. Clean production build (`npm run build`).

---

## 5. Verification Method

To independently verify this evaluation, execute:

1. **TypeScript Compilation Check**:
   ```powershell
   cmd /c npx tsc --noEmit
   ```
   *Expected*: Code 0, 0 errors.

2. **ESLint Verification**:
   ```powershell
   cmd /c npx eslint src/config/routes.ts src/test/challengerM1_2DecoupleAudit.test.ts
   ```
   *Expected*: Code 0, 0 problems.

3. **Challenger Audit & Route Tests**:
   ```powershell
   cmd /c npx vitest run src/test/challengerM1_2DecoupleAudit.test.ts src/test/crmShellRoutes.test.ts src/test/e2e/decoupleRoutes.test.ts
   ```
   *Expected*: 3 test files passed, 142 passed (142).

4. **Production Build**:
   ```powershell
   cmd /c npm run build
   ```
   *Expected*: Code 0, production assets built in `dist/`.

5. **Invalidation Conditions**:
   - `isRouteAllowedForRole("/crm/attendance", "cashier")` returns `true`.
   - `isRouteAllowedForRole("/billing/settings/reminders", "cashier")` returns `true`.
   - `tsc --noEmit` exits with non-zero code.
