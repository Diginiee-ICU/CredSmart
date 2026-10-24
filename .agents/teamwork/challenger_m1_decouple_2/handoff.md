# Handoff Report: Challenger M1.2 Adversarial Verification of RBAC Boundaries & Route Decoupling

**Agent**: `challenger_m1_decouple_2` (EMPIRICAL CHALLENGER / critic & specialist)  
**Date**: 2026-10-23T22:58:00Z  
**Target Milestone**: Milestone 1 — Route Architecture & Isolation (`/billing/*` and `/crm/*`)  
**Parent Orchestrator**: `8ac6491a-275d-4c1c-b664-961cd66511b1`  
**Verdict**: **`REQUEST_CHANGES`**

---

## 1. Observation

### 1.1 Empirical Command Executions & Test Results
All requested empirical test commands executed successfully and passed:

1. `cmd /c npx vitest run src/test/crmAttendanceRouteWiringChallenge.test.tsx`
   - **Result**: Passed (10/10 tests, 482ms, Exit Code: 0).
   - Validated: Static import of `Attendance` in `App.tsx`, route placement nested under `ProtectedRoutes`, `crmAttendanceIndex < managerIndex`, unauthenticated redirects to `/auth`, and authenticated rendering.

2. `cmd /c npx vitest run src/test/crmChallengerM1.test.ts`
   - **Result**: Passed (90/90 tests, 166ms, Exit Code: 0).
   - Validated: Staff user provisioning inputs, 1000-char password validation, Devanagari names, phone format normalizations, task lifecycle state transitions, KPI metrics calculation under 10k items stress test, and API client error handling.

3. `cmd /c npx vitest run src/test/crmChallengerM1_2.test.ts`
   - **Result**: Passed (11/11 tests, 36ms, Exit Code: 0).
   - Validated: SQL metacharacter handling in task query filters, 4x4 state transition matrix oracle, dual-field aliasing, DDL schema parity between root and `backend-api` `fix_db.sql`, and integrity of all 5 protected invoicing files.

4. `cmd /c npx vitest run src/test/challengerM1_2DecoupleAudit.test.ts`
   - **Result**: Passed (51/51 tests, 159ms, Exit Code: 0).
   - Authored by Challenger 2 to test cashier permissions across all 37 billing routes and 9 CRM routes, legacy path normalizations, AST structure, and navigation clutter invariants.

5. `cmd /c npx tsc --noEmit`
   - **Result**: Passed (Exit Code: 0, zero TypeScript compiler errors).

### 1.2 RBAC Boundary Vulnerability in `src/config/routes.ts`
Direct inspection of `src/config/routes.ts` revealed that:
1. Lines 143–164: `RESTRICTED_ROUTES_FOR_CASHIER` is defined as:
   ```typescript
   export const RESTRICTED_ROUTES_FOR_CASHIER: ReadonlySet<string> = new Set([
     ROUTE_PATHS.dashboard,
     ROUTE_PATHS.purchases,
     ROUTE_PATHS.discovery,
     ROUTE_PATHS.suppliers,
     ROUTE_PATHS.purchaseReturns,
     ROUTE_PATHS.analytics,
     ROUTE_PATHS.reports,
     ROUTE_PATHS.cashBank,
     ROUTE_PATHS.eInvoicing,
     ROUTE_PATHS.automatedBills,
     ROUTE_PATHS.expenses,
     ROUTE_PATHS.barcode,
     ROUTE_PATHS.settings,
     ROUTE_PATHS.businessSettings,
     ROUTE_PATHS.invoiceSettings,
     ROUTE_PATHS.printSettings,
     ROUTE_PATHS.staff,
     ROUTE_PATHS.activityLog,
     ROUTE_PATHS.crm,
     ROUTE_PATHS.crmRoles,
     ...
   ]);
   ```
   **Missing CRM Subroutes**:
   - `ROUTE_PATHS.crmAttendance` (`/crm/attendance`)
   - `ROUTE_PATHS.crmSalary` (`/crm/salary`)
   - `ROUTE_PATHS.crmTasks` (`/crm/tasks`)
   - `ROUTE_PATHS.crmMeet` (`/crm/meet`)
   - `ROUTE_PATHS.crmBroadcasts` (`/crm/broadcasts`)
   - `ROUTE_PATHS.crmAiAssistant` (`/crm/ai-assistant`)
   - `ROUTE_PATHS.crmSupport` (`/crm/support`)

2. Lines 376–379: `isRouteAllowedForRole` defines cashier access strictly as a set membership lookup:
   ```typescript
   // Cashier
   if (role === "cashier") {
     return !RESTRICTED_ROUTES_FOR_CASHIER.has(url);
   }
   ```
   Because `RESTRICTED_ROUTES_FOR_CASHIER` uses exact string matching via `Set.prototype.has` and only contains `/crm` and `/crm/roles`, querying any CRM subroute for role `"cashier"` evaluates to `true`:
   - `isRouteAllowedForRole("/crm/attendance", "cashier") === true`
   - `isRouteAllowedForRole("/crm/salary", "cashier") === true`
   - `isRouteAllowedForRole("/crm/tasks", "cashier") === true`
   - `isRouteAllowedForRole("/crm/meet", "cashier") === true`
   - `isRouteAllowedForRole("/crm/broadcasts", "cashier") === true`
   - `isRouteAllowedForRole("/crm/ai-assistant", "cashier") === true`
   - `isRouteAllowedForRole("/crm/support", "cashier") === true`

3. Lines 156–160: `RESTRICTED_ROUTES_FOR_CASHIER` also omits setting redirect subroutes:
   - `ROUTE_PATHS.settingsReminders` (`/billing/settings/reminders`)
   - `ROUTE_PATHS.settingsCaSharing` (`/billing/settings/ca-sharing`)
   - `ROUTE_PATHS.settingsRefer` (`/billing/settings/refer`)
   As verified in `challengerM1_2DecoupleAudit.test.ts`, querying `isRouteAllowedForRole("/billing/settings/reminders", "cashier")` evaluates to `true`, allowing cashiers through `RoleProtectedRoute` to the redirect handler.

---

## 2. Logic Chain

1. **Premise 1**: The authoritative user request (`ORIGINAL_REQUEST.md`) and project architecture (`PROJECT.md` § System Topology) dictate:
   *"Cashier role protection: Cashiers remain strictly constrained to POS billing operations."*
   Furthermore, Challenger Dispatch Task 1 explicitly requires:
   *"Cashiers must be blocked from CRM paths (`/crm/*`)."*
2. **Premise 2**: In `src/config/routes.ts`, `isRouteAllowedForRole` is the authoritative routing gatekeeper used by `AppLayout.tsx`, `AppSidebar.tsx`, and `App.tsx` (`RoleProtectedRoute`).
3. **Premise 3**: As observed in Observation §1.2, `RESTRICTED_ROUTES_FOR_CASHIER` lists only `ROUTE_PATHS.crm` and `ROUTE_PATHS.crmRoles`, but omits the other 7 active CRM routes (`crmAttendance`, `crmSalary`, `crmTasks`, `crmMeet`, `crmBroadcasts`, `crmAiAssistant`, `crmSupport`).
4. **Premise 4**: In `isRouteAllowedForRole`, cashier authorization is calculated via `!RESTRICTED_ROUTES_FOR_CASHIER.has(url)`. Since none of the 7 CRM subroutes are in the set, the negation produces `true` (access permitted).
5. **Premise 5**: In `src/App.tsx` (lines 260–270), CRM routes are mounted directly under `<AppLayout />` without role restrictions. Thus, any deep link or direct URL navigation by a logged-in cashier to `/crm/attendance`, `/crm/salary`, or `/crm/tasks` is not intercepted by the route layer.
6. **Inference**: A logged-in cashier can access CRM subroutes without being blocked at the route or `isRouteAllowedForRole` layer, violating the core constraint that cashiers are restricted strictly to POS billing and blocked from `/crm/*`.

---

## 3. Caveats

- **Component-Level CRM Protection**: Inside individual CRM pages (e.g. `Attendance.tsx` line 159, `SalaryManagement.tsx` line 157, `CRMDashboard.tsx`), component-level calls to `useCRMPermission` or `CRMPermissionGate` will prevent unauthorized write operations if the user has no assigned CRM role. However, the dispatch specifically mandates route-level gating: *"Cashiers must be blocked from CRM paths (`/crm/*`)."*
- **Sidebar Menu Filtering**: In `AppSidebar.tsx`, because the top-level CRM dropdown has `url: ROUTE_PATHS.crm` (which is restricted in `RESTRICTED_ROUTES_FOR_CASHIER`), the sidebar hides the entire CRM menu from cashiers. The leak is isolated to direct URL entry, deep links, and programmatically checking `isRouteAllowedForRole` against CRM subpaths.

---

## 4. Conclusion

**Verdict: `REQUEST_CHANGES`**

While Milestone 1 has successfully implemented route decoupling (`/billing/*` and `/crm/*`), parameter-preserving legacy redirects (`LegacyRedirect.tsx`), clean AST ordering in `App.tsx`, and zero collateral damage to protected invoicing files, it leaves a boundary control leak:
- Cashiers are **permitted** access to `/crm/attendance`, `/crm/salary`, `/crm/tasks`, `/crm/meet`, `/crm/broadcasts`, `/crm/ai-assistant`, and `/crm/support` in `isRouteAllowedForRole`.
- Cashiers are **permitted** access to `/billing/settings/reminders`, `/billing/settings/ca-sharing`, and `/billing/settings/refer` in `isRouteAllowedForRole`.

### Actionable Remediation for Worker M1:
In `src/config/routes.ts`:
1. Update `RESTRICTED_ROUTES_FOR_CASHIER` to include all CRM paths and setting subroutes:
   ```typescript
   export const RESTRICTED_ROUTES_FOR_CASHIER: ReadonlySet<string> = new Set([
     ...
     ROUTE_PATHS.crm,
     ROUTE_PATHS.crmDashboard,
     ROUTE_PATHS.crmAttendance,
     ROUTE_PATHS.crmSalary,
     ROUTE_PATHS.crmTasks,
     ROUTE_PATHS.crmMeet,
     ROUTE_PATHS.crmBroadcasts,
     ROUTE_PATHS.crmAiAssistant,
     ROUTE_PATHS.crmSupport,
     ROUTE_PATHS.crmRoles,
     ROUTE_PATHS.settingsReminders,
     ROUTE_PATHS.settingsCaSharing,
     ROUTE_PATHS.settingsRefer,
     ...
   ]);
   ```
2. OR in `isRouteAllowedForRole`, add prefix-based denial for cashiers:
   ```typescript
   // Cashier
   if (role === "cashier") {
     if (url.startsWith("/crm")) return false;
     return !RESTRICTED_ROUTES_FOR_CASHIER.has(url);
   }
   ```
   *(Note: Custom permission overrides checked at lines 290–297 will still allow explicit `{ crm: true }` overrides if configured by super admins).*

---

## 5. Verification Method

To reproduce the findings and independently verify the vulnerability:

1. **Execute Empirical Challenger Test Suite**:
   ```bash
   cmd /c npx vitest run src/test/challengerM1_2DecoupleAudit.test.ts
   ```
   *Expected outcome*: 51 tests pass. Test `AUDIT GAP: cashier is blocked from /crm & /crm/roles but permitted on /crm subroutes in isRouteAllowedForRole` directly confirms that `isRouteAllowedForRole("/crm/attendance", "cashier")` returns `true`.

2. **Run Dispatched Empirical Verification Suites**:
   ```bash
   cmd /c npx vitest run src/test/crmAttendanceRouteWiringChallenge.test.tsx
   cmd /c npx vitest run src/test/crmChallengerM1.test.ts
   cmd /c npx vitest run src/test/crmChallengerM1_2.test.ts
   ```
   *Expected outcome*: 111/111 tests pass.

3. **Verify Zero Compiler Errors**:
   ```bash
   cmd /c npx tsc --noEmit
   ```
   *Expected outcome*: Exits with code 0.

4. **Invalidation Conditions**:
   - `isRouteAllowedForRole("/crm/attendance", "cashier")` evaluates to `false`.
   - `isRouteAllowedForRole("/crm/salary", "cashier")` evaluates to `false`.
   - `isRouteAllowedForRole("/crm/tasks", "cashier")` evaluates to `false`.
   - All 5 protected invoice files remain untampered.
