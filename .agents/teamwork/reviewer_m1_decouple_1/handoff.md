# Review & Adversarial Challenge Report: Milestone 1 Route Decoupling

**Reviewer / Critic**: `reviewer_m1_decouple_1`  
**Date**: 2026-10-23T22:50:30Z  
**Parent Orchestrator**: `8ac6491a-275d-4c1c-b664-961cd66511b1`  
**Target Worker**: `worker_m1_decouple`  
**Milestone**: Milestone 1 — Route Architecture & Isolation (`/billing/*` and `/crm/*`)  
**Verdict**: **APPROVE**  

---

## 1. Observation

### 1.1 Source Code Verification
1. **`src/config/routes.ts`**:
   - `ROUTE_PATHS` lines 36-121 defines `billing: "/billing"` and maps all 37 POS, sales, purchasing, inventory, reporting, accounting, and store setting routes under canonical `/billing/*` paths.
   - CRM paths lines 98-109 (`crm: "/crm"`, `crmDashboard: "/crm"`, `crmAttendance: "/crm/attendance"`, `crmSalary: "/crm/salary"`, `crmTasks: "/crm/tasks"`, `crmMeet: "/crm/meet"`, `crmBroadcasts: "/crm/broadcasts"`, `crmAiAssistant: "/crm/ai-assistant"`, `crmSupport: "/crm/support"`, `crmRoles: "/crm/roles"`) are isolated strictly under `/crm/*`.
   - `RESTRICTED_ROUTES_FOR_CASHIER` (lines 143-183) contains both canonical `/billing/*` routes and all legacy root routes (`/dashboard`, `/purchases`, `/reports`, etc.).
   - `normalizeRouteForRbac(url: string)` (lines 239-279) transparently translates legacy root paths to `/billing/*` prior to RBAC evaluation, preventing permission divergence.
   - `MAIN_NAV_ROUTES` and `NAV_ROUTES` (lines 408-600, 902) are preserved verbatim with identical structure, labels, shortcut keys, and Lucide icons.
   - `BILLING_NAV_ROUTES` (lines 606-769) isolates retail ERP tools into 4 clean groups with zero CRM entries.
   - `CRM_NAV_ROUTES` (lines 776-846) isolates workforce modules into 2 clean groups with zero billing entries.
   - `LEGACY_ROUTE_REDIRECTS` (lines 856-893) maps all 36 legacy paths to their canonical `/billing/*` and public targets.

2. **`src/components/routing/LegacyRedirect.tsx`**:
   - Pure, universal redirection engine (lines 14-37).
   - Extracts dynamic parameters via `useParams()` and substitutes `:paramName` (using `encodeURIComponent(value)`) and wildcard `*`.
   - Preserves search queries (`location.search`) and hash fragments (`location.hash`).
   - Dispatches `<Navigate to={fullTarget} replace />` to avoid polluting the browser history stack.
   - Zero hardcoded test values, zero facade logic.

3. **`src/App.tsx`**:
   - Lines 109-121: `function ProtectedRoutes()` preserves exact `if (!user) { return <Navigate to={ROUTE_PATHS.auth} replace />; }` AST pattern.
   - Lines 123-144: `function RoleProtectedRoute` preserves exact AST redirection pattern.
   - Lines 257-353: Routes are hierarchically protected:
     - Unauthenticated requests to both canonical routes and legacy redirect routes are intercepted by `<Route element={<ProtectedRoutes />}>` and redirected to `/auth`.
     - CRM routes (lines 260-270) are mounted inside `<AppLayout />` prior to `RoleProtectedRoute`, strictly satisfying the AST index ordering required by `crmAttendanceRouteWiringChallenge.test.tsx`.
     - 36 legacy redirect routes (lines 316-352) are cleanly declared via `<LegacyRedirect to="..." />`.

4. **Invariance of Protected Invoicing Flow**:
   - `src/components/invoices/mobile/MobileCreateInvoice.tsx` — Untouched (486 lines)
   - `src/components/SalesInvoiceModal.tsx` — Untouched (3227 lines)
   - `src/components/invoices/mobile/AddItemModal.tsx` — Untouched (107 lines)
   - `src/components/invoices/mobile/SelectPartyModal.tsx` — Untouched (298 lines)
   - `src/components/invoices/mobile/EditItemModal.tsx` — Untouched (274 lines)

### 1.2 Independent Verification Execution
All commands were independently executed by the reviewer:
1. `cmd /c npx tsc --noEmit`
   - **Exit code**: `0`
   - **Errors**: `0`
2. `cmd /c npx vitest run src/test/crmShellRoutes.test.ts src/test/crmAttendanceRouteWiringChallenge.test.tsx src/test/e2e/decoupleRoutes.test.ts`
   - **Exit code**: `0`
   - **Results**: `100 passed (100 total)`
   - `src/test/e2e/decoupleRoutes.test.ts`: 68/68 passed
   - `src/test/crmShellRoutes.test.ts`: 22/22 passed
   - `src/test/crmAttendanceRouteWiringChallenge.test.tsx`: 10/10 passed
3. Comprehensive Regression Test Suite:
   - `cmd /c npx vitest run src/test/billingLifecycleEngine.test.ts src/test/MobileInvoiceSuccessView.test.tsx src/test/networkInvoicing.test.ts src/test/crmSubmodules.test.tsx src/test/crmShellNavigation.audit.test.ts`
   - **Exit code**: `0`
   - **Results**: `75 passed (75 total)` across 5 test suites.

---

## 2. Logic Chain

1. **Observation 1.1** establishes that `src/config/routes.ts` establishes canonical route constants for 37 billing features under `/billing/*` and 10 CRM features under `/crm/*`, meeting the exact contract required by `ORIGINAL_REQUEST.md §R1` and `PROJECT.md`.
2. **Observation 1.1** confirms that backwards-compatibility structures (`MAIN_NAV_ROUTES`, `NAV_ROUTES`, and legacy role restrictions) are preserved without breaking existing tests.
3. **Observation 1.2** demonstrates that `LegacyRedirect.tsx` operates dynamically and generically, preserving `:id`, query parameters, and hashes.
4. **Observation 1.3** demonstrates that `src/App.tsx` guards legacy routes behind `ProtectedRoutes`, ensuring unauthenticated users cannot bypass login via legacy bookmarks.
5. **Observation 1.3** confirms that AST and regex ordering invariants from existing test suites are rigorously satisfied.
6. **Observation 1.4** verifies that zero modifications were made to the protected mobile and modal invoicing files.
7. **Observation 1.2** demonstrates 100% compilation cleanliness and 175 passing tests across 8 test suites.
8. Therefore, the implementation is correct, secure, backward-compatible, and free of regressions or integrity violations.

---

## 3. Adversarial Stress-Test & Challenge Assessment

### Challenge 1: Authentication Gating on Legacy Redirects
- **Hypothesis**: Could an unauthenticated user bypass authentication or leak layout assets by requesting a legacy path like `/pos` or `/sales`?
- **Stress-Test**: Inspected route tree in `src/App.tsx` (lines 257-353). All 36 legacy routes are nested under `<Route element={<ProtectedRoutes />}>`.
- **Finding**: PASS. Unauthenticated requests trigger `ProtectedRoutes` check (`if (!user) return <Navigate to={ROUTE_PATHS.auth} replace />`) before `LegacyRedirect` mounts.

### Challenge 2: Dynamic Parameter & Query Preservation
- **Hypothesis**: Does `/customers/:id/ledger` lose the customer ID or query parameters during redirection?
- **Stress-Test**: Tested with `decoupleRoutes.test.ts` T2.5, T2.6, T3.5 with complex UUIDs, alphanumeric IDs (`CUST-MH-2026-9901`), query strings (`?currency=INR&export=pdf`), and hashes (`#top`).
- **Finding**: PASS. `LegacyRedirect` substitutes `:id` and appends search/hash cleanly without loss.

### Challenge 3: Cashier Role Restriction Leakage
- **Hypothesis**: If a cashier navigates to a legacy URL (`/dashboard` or `/reports`), does `isRouteAllowedForRole` erroneously allow access because the legacy route string doesn't start with `/billing`?
- **Stress-Test**: Checked `RESTRICTED_ROUTES_FOR_CASHIER` in `src/config/routes.ts` and `normalizeRouteForRbac`.
- **Finding**: PASS. `RESTRICTED_ROUTES_FOR_CASHIER` includes both legacy paths (`/dashboard`, `/reports`) and canonical paths (`/billing/dashboard`, `/billing/reports`), and `normalizeRouteForRbac` normalizes all legacy paths to `/billing/*`.

### Challenge 4: Regex AST Invariants in Static Verification Suites
- **Hypothesis**: Did refactoring `src/App.tsx` break exact AST regexes in `crmShellRoutes.test.ts` or `crmAttendanceRouteWiringChallenge.test.tsx`?
- **Stress-Test**: Executed both suites independently.
- **Finding**: PASS. Exact snippet and route sequence constraints are strictly satisfied.

---

## 4. Integrity Violation Check

- Hardcoded test outputs embedded in source code: **None found**.
- Dummy or facade implementations: **None found**.
- Shortcuts bypassing intended work: **None found**.
- Fabricated verification logs: **None found**.
- Self-certifying assertions: **None found**. All claims validated through clean live command execution.

---

## 5. Caveats

- **No Caveats**. Implementation covers all requirements for Milestone 1. Shell and SuiteSwitcher components are scheduled for Milestone 2 as designed in `PROJECT.md`.

---

## 6. Conclusion

Worker M1 (`worker_m1_decouple`) has delivered a complete, robust, and verified implementation of Milestone 1:
- 37 POS & Billing routes canonicalized under `/billing/*`.
- 10 CRM routes isolated under `/crm/*`.
- Universal parameter- and query-preserving `LegacyRedirect` deployed across 36 legacy routes.
- Full backwards compatibility maintained with `MAIN_NAV_ROUTES` and `NAV_ROUTES`.
- Zero TypeScript errors (`tsc --noEmit` code 0).
- 100% pass across all targeted and regression Vitest suites (175/175 tests).
- 5 protected invoice creation files remain 100% untouched.

**Verdict**: **APPROVE**

---

## 7. Verification Method

To independently reproduce this verification:

```bash
# 1. Typecheck entire project
cmd /c npx tsc --noEmit

# 2. Run Milestone 1 Decouple Route and Shell Tests
cmd /c npx vitest run src/test/crmShellRoutes.test.ts src/test/crmAttendanceRouteWiringChallenge.test.tsx src/test/e2e/decoupleRoutes.test.ts

# 3. Run Invoicing & Navigation Regression Suites
cmd /c npx vitest run src/test/billingLifecycleEngine.test.ts src/test/MobileInvoiceSuccessView.test.tsx src/test/networkInvoicing.test.ts src/test/crmSubmodules.test.tsx src/test/crmShellNavigation.audit.test.ts
```
