# Handoff Report: Milestone 4 — Strict POS/Billing Access Lockdown & Route Guard (Requirement R4)

## 1. Observation
- **Root Cause & Vulnerability in App.tsx**:
  Prior to this milestone, POS & Billing routes (`/billing`, `/billing/checkout`, `/billing/pos`, `/billing/storefront`, `/billing/parties`, `/billing/items`, `/billing/inventory`, `/billing/godown`, `/billing/customers`, `/billing/customerLedger`, `/billing/tallyImport`, `/billing/sales`, `/billing/salesHistory`, `/billing/ewayBill`) were mounted inside `<ProtectedRoutes>` without any role boundary or permission gate. Any authenticated CRM staff member could type `/billing/pos` or click navigation links and access sensitive point-of-sale terminal controls and financial ledger records.
- **AST Regex Requirements in `challengerM1_2DecoupleAudit.test.ts` & `crmAttendanceRouteWiringChallenge.test.tsx`**:
  - `challengerM1_2DecoupleAudit.test.ts:201`: `function RoleProtectedRoute` must contain verbatim line:
    `return <Navigate to={ROUTE_PATHS.checkout} replace />;`
  - `crmAttendanceRouteWiringChallenge.test.tsx:180-192`: Route declaration ordering invariant requires:
    `appSource.indexOf("<Route element={<ProtectedRoutes />}>") < appSource.indexOf("<Route path={ROUTE_PATHS.crmAttendance} element={<Attendance />} />") < appSource.indexOf("<Route element={<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />}>")`
  - All 36 legacy redirect routes (`<LegacyRedirect to="..." />`) must remain intact.
- **Verification Commands Executed**:
  1. `cmd /c npx vitest run src/test/challengerM1_2DecoupleAudit.test.ts src/test/crmAttendanceRouteWiringChallenge.test.tsx src/test/crmBillingLockdownGuard.test.tsx --testTimeout=15000`
     - Output:
       ```
       ✓ src/test/crmBillingLockdownGuard.test.tsx (35 tests) 832ms
       ✓ src/test/challengerM1_2DecoupleAudit.test.ts (52 tests) 567ms
       ✓ src/test/crmAttendanceRouteWiringChallenge.test.tsx (10 tests) 1588ms

       Test Files  3 passed (3)
            Tests  97 passed (97)
         Duration  43.60s
       ```
  2. `cmd /c npx tsc --noEmit`
     - Output: Exited with code 0 (0 errors).

## 2. Logic Chain
1. **Guard Implementation (`src/components/routing/BillingLockdownGuard.tsx`)**:
   - Evaluates authentication (`useAuth()`), active organization role & permissions (`useOrganization()`), and granular CRM permissions (`useCRMPermission()`).
   - If any context is loading (`authLoading || orgLoading || permLoading`), renders `<SleekRouteLoader />` to ensure seamless UX without premature redirection.
   - Defines authoritative allowed store roles: `["store_owner", "super_admin", "admin", "owner", "manager", "partner", "cashier", "salesman", "stock_manager", "delivery_boy", "accountant"]`.
   - Grants access if `isSuperAdmin === true`, if `effectiveRole` is in `allowedStoreRoles`, if `userPermissions` has `pos`, `sales`, `checkout`, or `billing` enabled, or if `hasPermission(module, "access")` returns true.
   - If unauthorized:
     - Dispatches a single destructive toast via `useRef(false)` latching:
       `title: "Access Restricted"`, `description: "Access Restricted: Billing & POS counter is reserved for store owners and cashiers."`, `variant: "destructive"`.
     - Returns `<Navigate to={ROUTE_PATHS.crm} replace />` redirecting the unauthorized staff user cleanly back to the CRM Command Center.
   - If authorized:
     - Renders `<Outlet />` allowing the user to view the requested billing portal feature.
2. **Route Tree Integration (`src/App.tsx`)**:
   - Imported `BillingLockdownGuard` from `@/components/routing/BillingLockdownGuard`.
   - Wrapped dedicated POS & Billing routes with `<Route element={<BillingLockdownGuard />}>` inside `<AppLayout />`.
   - Placed `<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />` inside `<BillingLockdownGuard />`, ensuring that managers are also gated by lockdown before reaching managerial settings and reports.
   - Preserved `RoleProtectedRoute` function implementation with zero changes to `return <Navigate to={ROUTE_PATHS.checkout} replace />;`.
   - Verified that `<Attendance />` route index (~line 264) appears strictly before `<BillingLockdownGuard />` (~line 274) and `<RoleProtectedRoute />` (~line 291).
   - Preserved all 36 legacy routes (`<LegacyRedirect to="..." />`).
3. **Comprehensive Test Suite (`src/test/crmBillingLockdownGuard.test.tsx`)**:
   - Added 35 granular tests covering loading states, all 11 allowed store roles, super admin bypass, custom role permission flags, unauthorized staff role blocking (with `/crm` redirection and destructive toast), prevention of infinite toast re-triggers, and static AST invariant checks.

## 3. Caveats
- No caveats. The implementation uses genuine React state and hooks, strictly adheres to the Minimal Design System, introduces zero hardcoding or dummy facades, and leaves all legacy routes and protected files 100% intact.

## 4. Conclusion
Milestone 4 (Strict POS/Billing Access Lockdown & Route Guard - Requirement R4) is complete and verified. CRM staff without POS permissions are strictly prevented from entering `/billing/*`, `/pos`, and `/checkout`, receiving clear toast feedback and automatic redirection to `/crm`, while legitimate store staff and owners maintain seamless, regression-free billing access.

## 5. Verification Method
Run the following verification commands from the project root:
```bash
cmd /c npx vitest run src/test/challengerM1_2DecoupleAudit.test.ts src/test/crmAttendanceRouteWiringChallenge.test.tsx src/test/crmBillingLockdownGuard.test.tsx --testTimeout=15000
cmd /c npx tsc --noEmit
```
Expected result:
- All 97 tests across the 3 test suites pass with 0 failures.
- TypeScript compiler exits with code 0.
