# Task Assignment: Milestone 4 Worker — Strict POS/Billing Access Lockdown & Route Guard (Requirement R4)

## Objective
Implement strict route lockdown preventing CRM staff without POS/billing roles from accessing `/billing/*`, `/pos`, `/checkout`, while preserving store owners, cashiers, salesmen, stock managers, and accountants.

## Write Ownership
You have exclusive write ownership of:
- `src/components/routing/BillingLockdownGuard.tsx` (new file)
- `src/App.tsx` (carefully edit using exact replacement chunks)
- Any new test file for route lockdown verification (e.g. `src/test/crmBillingLockdownGuard.test.tsx`)

## Technical Specifications
1. **Create `src/components/routing/BillingLockdownGuard.tsx`**:
   - Must use `useAuth()`, `useOrganization()`, and `useCRMPermission()`.
   - Determine if the user is authorized for POS / Billing:
     ```tsx
     const { user, loading: authLoading } = useAuth();
     const { userRole, userPermissions, loading: orgLoading } = useOrganization();
     const { isSuperAdmin, hasPermission, loading: permLoading } = useCRMPermission();

     if (authLoading || orgLoading || permLoading) {
       return <SleekRouteLoader />;
     }

     const allowedStoreRoles = [
       "store_owner",
       "super_admin",
       "admin",
       "owner",
       "manager",
       "partner",
       "cashier",
       "salesman",
       "stock_manager",
       "delivery_boy",
       "accountant",
     ];

     const effectiveRole = userRole || (user as any)?.role || "";

     const isAllowed =
       isSuperAdmin ||
       allowedStoreRoles.includes(effectiveRole) ||
       Boolean(userPermissions?.pos || userPermissions?.sales || userPermissions?.checkout || userPermissions?.billing) ||
       hasPermission("pos", "access") ||
       hasPermission("billing", "access") ||
       hasPermission("sales", "access") ||
       hasPermission("checkout", "access");
     ```
   - If `!isAllowed`:
     Trigger a destructive alert toast informing the user:
     `"Access Restricted: Billing & POS counter is reserved for store owners and cashiers."`
     (Make sure to avoid infinite toast re-trigger loops using `useEffect` or `useRef`).
     Redirect to `ROUTE_PATHS.crm` (`/crm`):
     `return <Navigate to={ROUTE_PATHS.crm} replace />;`
   - If `isAllowed`:
     `return <Outlet />;`

2. **Update `src/App.tsx`**:
   - Import `BillingLockdownGuard` from `@/components/routing/BillingLockdownGuard`.
   - Wrap the dedicated POS & Billing routes inside `<Route element={<AppLayout />}>` with `<Route element={<BillingLockdownGuard />}>`:
     ```tsx
     {/* POS & Billing Routes protected by BillingLockdownGuard */}
     <Route element={<BillingLockdownGuard />}>
       <Route path="/billing" element={<BillingIndexRedirect />} />
       <Route path={ROUTE_PATHS.checkout} element={<POSBilling />} />
       ...
       <Route element={<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />}>
         ...
       </Route>
     </Route>
     ```
   - **CRITICAL AST INVARIANT 1**: Do NOT modify the function declaration or body of `RoleProtectedRoute` in `src/App.tsx`.
     Specifically, the exact line:
     `return <Navigate to={ROUTE_PATHS.checkout} replace />;`
     inside `RoleProtectedRoute` MUST NOT BE ALTERED! (Verified by `src/test/challengerM1_2DecoupleAudit.test.ts:201`).
   - **CRITICAL AST INVARIANT 2**: Ensure route ordering remains:
     `<Route element={<ProtectedRoutes />}>`
       comes before `<Route path={ROUTE_PATHS.crmAttendance} element={<Attendance />} />`
       which comes before `<Route element={<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />}>`
     (Verified by `src/test/challengerM1_2DecoupleAudit.test.ts:205-217`).
   - **CRITICAL AST INVARIANT 3**: All 36 legacy redirect routes (`<LegacyRedirect to="..." />`) must remain declared.

3. **Mandatory Integrity Warning**:
   DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

4. **Verification Requirements**:
   Run and pass:
   - `cmd /c npx vitest run src/test/challengerM1_2DecoupleAudit.test.ts src/test/crmAttendanceRouteWiringChallenge.test.tsx src/test/crmDashboardResilience.test.tsx`
   - Run any new test suite you write for `BillingLockdownGuard` (e.g. `src/test/crmBillingLockdownGuard.test.tsx`).
   - `cmd /c npx tsc --noEmit` must pass with 0 errors.

## Output
Write your handoff report to:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_lockdown\handoff.md`
Send a completion message back to the orchestrator.


## 2026-10-26T22:38:17Z
[Message] timestamp=2026-10-26T22:38:17Z sender=9b1188fd-78cb-4433-afbb-88547ac33d9e priority=MESSAGE_PRIORITY_HIGH content=You are the Implementation Worker for Milestone 4 (Strict POS/Billing Access Lockdown & Route Guard - Requirement R4).
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_lockdown
Read your instructions in: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_lockdown\DISPATCH.md
Read the authoritative user request in: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
Read project context in: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_defects\PROJECT.md

Exclusive Write Ownership:
- `src/components/routing/BillingLockdownGuard.tsx` (new file)
- `src/App.tsx` (careful edit preserving all AST regexes)
- `src/test/crmBillingLockdownGuard.test.tsx` (new test suite)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

CRITICAL INVARIANTS IN App.tsx:
1. Do NOT modify the function body of `RoleProtectedRoute` in `src/App.tsx`. The exact line `return <Navigate to={ROUTE_PATHS.checkout} replace />;` must remain intact.
2. Route ordering: `<ProtectedRoutes>` < `<Attendance>` (`ROUTE_PATHS.crmAttendance`) < `<RoleProtectedRoute allowedRoles={MANAGER_ROLES}>`.
3. Keep all 36 legacy routes intact.

Run verification commands:
`cmd /c npx vitest run src/test/challengerM1_2DecoupleAudit.test.ts src/test/crmAttendanceRouteWiringChallenge.test.tsx src/test/crmBillingLockdownGuard.test.tsx`
`cmd /c npx tsc --noEmit`

Write your handoff report to:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_lockdown\handoff.md
Send a completion message back to the orchestrator when finished.
