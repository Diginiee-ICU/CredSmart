# Handoff Report: POS/Billing Route Lockdown & Unified CRM Command Center Header (R4 & R6)

**Agent:** explorer_survey_routes_header  
**Working Directory:** `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_routes_header`  
**Parent Agent:** `9b1188fd-78cb-4433-afbb-88547ac33d9e`  
**Timestamp:** 2026-10-26T20:15:00Z  
**Type:** Hard Handoff (Investigation & Survey Complete)

---

## 1. Observation

1. **POS / Billing Routes Lack Role Guards (`src/App.tsx:273–286`)**:
   - Routes `/billing/checkout` (`POSBilling`), `/billing/pos` (`POSBilling`), `/billing/sales` (`Sales`), `/billing/items` (`Items`), `/billing/inventory` (`Inventory`), `/billing/parties` (`Parties`), etc., are mounted under plain `<ProtectedRoutes>` with zero role restriction.
   - Any authenticated user with a valid JWT (including newly provisioned CRM staff with role `"staff"`) can directly access the billing counter.

2. **Inverse Escalation Fallback in `RoleProtectedRoute` (`src/App.tsx:139–141`)**:
   ```tsx
   if (!allowedRoles.includes(effectiveRole) && !isRouteAllowedForRole(currentPath, effectiveRole, userPermissions)) {
     return <Navigate to={ROUTE_PATHS.checkout} replace />;
   }
   ```
   - When a CRM staff member attempts to view a manager page (e.g. `/billing/dashboard`), `RoleProtectedRoute` denies them and redirects them directly to `ROUTE_PATHS.checkout` (`/billing/checkout` — POS billing!), inadvertently granting them access to billing.

3. **Fallback Role Inflation (`src/hooks/useOrganization.tsx:256, 620` & `src/App.tsx:136`)**:
   - `useOrganization.tsx:256`: `role: d.role === "cashier" ? "cashier" : "store_owner"` converts any role other than `"cashier"` (such as `"staff"`) into `"store_owner"`.
   - `useOrganization.tsx:620`: If `memberships.length === 0`, `setUserRole("store_owner")` defaults users to owner.
   - `App.tsx:136`: `const effectiveRole = userRole || "store_owner";` defaults unassigned users to `"store_owner"`.

4. **Rigid Static Test Invariants in Test Suites**:
   - `src/test/challengerM1_2DecoupleAudit.test.ts:201`: Tests exact regex:
     `/function\s+RoleProtectedRoute\s*\([\s\S]*?\)\s*\{[\s\S]*?if\s*\(!user\)\s*\{\s*return\s*<Navigate\s+to=\{ROUTE_PATHS\.auth\}\s+replace\s*\/>;\s*\}[\s\S]*?return\s*<Navigate\s+to=\{ROUTE_PATHS\.checkout\}\s+replace\s*\/>;[\s\S]*?\}/`
   - `src/test/challengerM1_2DecoupleAudit.test.ts:205` & `src/test/crmAttendanceRouteWiringChallenge.test.tsx:180`: Tests exact route AST ordering: `<ProtectedRoutes>` < `<Attendance>` (`ROUTE_PATHS.crmAttendance`) < `<RoleProtectedRoute allowedRoles={MANAGER_ROLES}>`.
   - All 36 legacy redirect routes (`<LegacyRedirect to="..." />`) must remain declared under `<ProtectedRoutes>`.

5. **Disparate CRM Headers Across Sub-Pages**:
   - `CRMDashboard.tsx` features a responsive header:
     - Mobile: Top App Bar with CredSmart brand dropdown (org switcher), Dual-Suite Capsule `[ POS | ● CRM ]`, 32x32px `RotateCw` refresh button, and title/actions stack.
     - Desktop: `CRMPageHeader` with title, subtitle, breadcrumbs, `Live Sync` badge, and quick action buttons.
   - The 8 CRM sub-pages (`RoleManagement`, `SalaryManagement`, `Tasks`, `Attendance`, `Broadcasts`, `Meet`, `AIAssistant`, `Support`) each have separate, ad-hoc, handwritten headers:
     - `RoleManagement` and `Attendance` have custom mobile headers with back arrows, but no brand dropdown and no `[ POS | ● CRM ]` suite toggle.
     - `SalaryManagement` has an ad-hoc mobile title with custom refresh buttons.
     - `Tasks`, `Broadcasts`, `Meet`, `AIAssistant`, and `Support` share desktop `CRMPageHeader` on mobile without the Command Center top bar.

---

## 2. Logic Chain

1. From **Observation 1 & 2**, because retail POS and sales endpoints are unguarded and `RoleProtectedRoute` redirects unauthorized users to `ROUTE_PATHS.checkout`, CRM staff can access all retail POS features.
2. From **Observation 3**, role determination currently leaks `"store_owner"` status to unassigned users or staff members unless explicitly gated.
3. Therefore, an explicit route guard (`BillingLockdownGuard`) must be placed around all retail billing routes (`/billing/*`).
4. To avoid regressions on existing tests (**Observation 4**), `BillingLockdownGuard` must be inserted as a parent route wrapper around `/billing/*` and `<RoleProtectedRoute allowedRoles={MANAGER_ROLES}>` inside `<AppLayout>`, WITHOUT modifying the signature or inner regex of `RoleProtectedRoute` or altering the relative order of `ProtectedRoutes < crmAttendance < RoleProtectedRoute`.
5. For role evaluation:
   - Full access bypass: `isSuperAdmin || userRole === "store_owner" || userRole === "super_admin" || userRole === "admin" || userRole === "partner"`.
   - Retail store roles allowed: `cashier`, `salesman`, `stock_manager`, `delivery_boy`, `accountant`.
   - Granular store permissions allowed: `userPermissions?.pos === true || userPermissions?.sales === true || userPermissions?.checkout === true`.
   - CRM role permissions allowed: `hasPermission("pos", "access") || hasPermission("billing", "access")`.
   - Any user not meeting these criteria is pure CRM staff: redirect to `ROUTE_PATHS.crm` and trigger a toast alert ("Access Restricted").
6. From **Observation 5**, each CRM sub-page duplicates navigation and lacks the mobile suite toggle. Extracting `CRMCommandHeader.tsx` into `src/components/crm/` and standardizing it across all 8 sub-pages provides consistent branding, tenant switching, suite toggling, and sync status while preserving each page's specific actions and tabs.

---

## 3. Caveats

- **Test Invariant Strictness**: Do not change the text `return <Navigate to={ROUTE_PATHS.checkout} replace />;` inside `RoleProtectedRoute` in `App.tsx` because AST regex tests in `challengerM1_2DecoupleAudit.test.ts` match that exact string.
- **Legacy Route Redirection**: 36 legacy routes redirect to `/billing/*`. Because they redirect to canonical billing paths, guarding `/billing/*` automatically shields all legacy entries without touching the 36 redirect declarations.
- **DesktopPOS Terminal (`/pos` & `/billing/pos`)**: When cashier users or retail staff enter POS, they must still retain full access to POS counter.

---

## 4. Conclusion

1. **R4 (Lockdown)**: Implement `src/components/routing/BillingLockdownGuard.tsx` wrapping all `/billing/*` routes in `src/App.tsx`. Gated logic verifies store owner status, retail role, or POS permission, and redirects CRM staff to `/crm` with an unauthorized alert toast.
2. **R6 (Command Center Header)**: Create `src/components/crm/CRMCommandHeader.tsx`, export it via `src/components/crm/index.ts`, and integrate it across `CRMDashboard.tsx` and all 8 sub-pages (`RoleManagement`, `SalaryManagement`, `Tasks`, `Attendance`, `Broadcasts`, `Meet`, `AIAssistant`, `Support`), preserving their internal tabs and view switches.
3. Detailed architectural designs, interface contracts, before/after code snippets, and verification plans are fully documented in:
   `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_routes_header\survey_routes_header.md`.

---

## 5. Verification Method

1. **File Inspection**:
   - `survey_routes_header.md`: Verify detailed route matrix and component specification.
   - `src/App.tsx`: Confirm route ordering (`ProtectedRoutes` < `crmAttendance` < `RoleProtectedRoute`) and static regex matches.
2. **Command Verification**:
   - Run: `cmd /c npx vitest run src/test/challengerM1_2DecoupleAudit.test.ts src/test/crmAttendanceRouteWiringChallenge.test.tsx src/test/crmDashboardResilience.test.tsx src/test/crmShellRoutes.test.ts`
   - Confirm all suites pass with 0 failures.
3. **Invalidation Conditions**:
   - Any modification that removes `ROUTE_PATHS.checkout` redirect from `RoleProtectedRoute` in `App.tsx` will invalidate `challengerM1_2DecoupleAudit.test.ts:201`.
   - Any reordering that places `RoleProtectedRoute` before `crmAttendance` will invalidate `challengerM1_2DecoupleAudit.test.ts:205` and `crmAttendanceRouteWiringChallenge.test.tsx:180`.
