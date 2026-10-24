# Handoff Report: Explorer M1.2 Audit of Role Permission Boundaries Across `/billing/*` and `/crm/*`

**Agent**: `explorer_m1_r2_2` (Teamwork Explorer / Investigation & Synthesis)  
**Date**: 2026-10-23T23:08:00Z  
**Parent Orchestrator**: `8ac6491a-275d-4c1c-b664-961cd66511b1`  
**Target Milestone**: Milestone 1 Retry 2.2 — Decouple / RBAC Route Boundary Audit  
**Working Directory**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_r2_2`  

---

## 1. Observation

### 1.1 Route Configuration & Implementation in `src/config/routes.ts`

Direct inspection of `src/config/routes.ts` revealed the following structural details:

1. **Absence of `ROLE_ROUTE_MAP` Constant**:
   - `ROLE_ROUTE_MAP` does not exist as an exported constant in `src/config/routes.ts` or anywhere in the repository.
   - Instead, feature mappings are defined in `FEATURE_ROUTE_MAP` (lines 202–233), cashier restrictions in `RESTRICTED_ROUTES_FOR_CASHIER` (lines 143–183), and role-based permissions are evaluated procedurally within `isRouteAllowedForRole` (lines 281–382).

2. **Definition and Call of `normalizeRouteForRbac`**:
   - Lines 239–279:
     ```typescript
     export function normalizeRouteForRbac(url: string): string {
       if (!url || typeof url !== "string") return url;
       if (url.startsWith("/billing/") || url === "/billing" || url.startsWith("/crm/") || url === "/crm") {
         return url;
       }
       const legacyPrefixes = [
         "/dashboard", "/parties", "/customers", "/suppliers", "/storefront",
         "/items", "/inventory", "/godown", "/barcode", "/sales",
         "/sales-history", "/checkout", "/pos", "/purchases", "/purchase-returns",
         "/discovery", "/reports", "/analytics", "/cash-bank", "/e-invoicing",
         "/eway-bill", "/automated-bills", "/expenses", "/staff",
         "/activity-log", "/settings", "/tally-import",
       ];
       for (const prefix of legacyPrefixes) {
         if (url === prefix || url.startsWith(`${prefix}/`) || url.startsWith(`${prefix}?`)) {
           return `/billing${url}`;
         }
       }
       return url;
     }
     ```
   - Line 287: `isRouteAllowedForRole` calls `normalizeRouteForRbac` at the very beginning of its execution:
     ```typescript
     export function isRouteAllowedForRole(
       rawUrl: string,
       role: string | null | undefined,
       customPermissions?: Record<string, boolean> | null
     ): boolean {
       if (!role) return false;
       const url = normalizeRouteForRbac(rawUrl);
       ...
     ```

3. **Evaluation Logic in `isRouteAllowedForRole` (lines 281–382)**:
   - **Step 1 (Granular Custom Feature Toggles)** (lines 290–297):
     ```typescript
     if (customPermissions && typeof customPermissions === "object") {
       for (const [featKey, routes] of Object.entries(FEATURE_ROUTE_MAP)) {
         if (routes.some((r) => url === r || url.startsWith(`${r}/`))) {
           if (customPermissions[featKey] === true) return true;
           if (customPermissions[featKey] === false) return false;
         }
       }
     }
     ```
   - **Step 2 (Full Access Roles)** (lines 299–309):
     ```typescript
     if (
       role === "store_owner" ||
       role === "super_admin" ||
       role === "admin" ||
       role === "owner" ||
       role === "manager" ||
       role === "partner"
     ) {
       return true;
     }
     ```
   - **Step 3 (Specialized Operational Roles)** (lines 312–374):
     `stock_manager`, `salesman`, `delivery_boy`, and `accountant` each use an explicit whitelist `Set<string>` (e.g. `stockAllowed.has(url)`).
   - **Step 4 (Cashier Inverted Blacklist)** (lines 376–379):
     ```typescript
     if (role === "cashier") {
       return !RESTRICTED_ROUTES_FOR_CASHIER.has(url);
     }
     ```
   - **Step 5 (Fallback)** (line 381):
     `return false;`

4. **Cashier Set Definition (`RESTRICTED_ROUTES_FOR_CASHIER`)** (lines 143–183):
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
     // Legacy paths
     "/dashboard", "/purchases", "/discovery", "/suppliers", "/purchase-returns",
     "/analytics", "/reports", "/cash-bank", "/e-invoicing", "/automated-bills",
     "/expenses", "/barcode", "/settings", "/settings/business", "/settings/invoice",
     "/settings/print", "/staff", "/activity-log",
   ]);
   ```
   **Omissions directly observed**:
   - Missing 7 CRM subroutes: `ROUTE_PATHS.crmAttendance` (`/crm/attendance`), `ROUTE_PATHS.crmSalary` (`/crm/salary`), `ROUTE_PATHS.crmTasks` (`/crm/tasks`), `ROUTE_PATHS.crmMeet` (`/crm/meet`), `ROUTE_PATHS.crmBroadcasts` (`/crm/broadcasts`), `ROUTE_PATHS.crmAiAssistant` (`/crm/ai-assistant`), `ROUTE_PATHS.crmSupport` (`/crm/support`).
   - Missing Billing settings subroutes: `ROUTE_PATHS.settingsReminders` (`/billing/settings/reminders`), `ROUTE_PATHS.settingsCaSharing` (`/billing/settings/ca-sharing`), `ROUTE_PATHS.settingsPricing` (`/billing/settings/pricing`), `ROUTE_PATHS.settingsRefer` (`/billing/settings/refer`), `ROUTE_PATHS.settingsHelp` (`/billing/settings/help`).
   - Missing Financial/Data routes: `ROUTE_PATHS.ewayBill` (`/billing/eway-bill`), `ROUTE_PATHS.tallyImport` (`/billing/tally-import`).

5. **`MANAGER_ROLES` and `ALL_APP_ROLES` in `src/config/routes.ts`**:
   - Lines 125–127:
     ```typescript
     export const STORE_OWNER_ROLES = ["store_owner", "super_admin", "admin", "partner"] as const;
     export const FULL_ACCESS_ROLES = ["store_owner", "super_admin", "admin", "partner"] as const;
     export const MANAGER_ROLES = FULL_ACCESS_ROLES;
     ```
     `MANAGER_ROLES` does NOT include `"manager"` or `"owner"`.
   - Lines 129–139:
     ```typescript
     export const ALL_APP_ROLES = [
       "admin", "partner", "stock_manager", "salesman", "delivery_boy",
       "accountant", "cashier", "store_owner", "super_admin",
     ] as const;
     ```
     `ALL_APP_ROLES` does NOT include `"manager"`, `"owner"`, or `"staff"`.

### 1.2 Route Guards in `src/App.tsx`
- Lines 123–144: `RoleProtectedRoute` checks:
  ```typescript
  if (!allowedRoles.includes(effectiveRole) && !isRouteAllowedForRole(currentPath, effectiveRole, userPermissions)) {
    return <Navigate to={ROUTE_PATHS.checkout} replace />;
  }
  ```
- Lines 259–270: CRM submodules are mounted directly under `<AppLayout />` without `RoleProtectedRoute`:
  ```tsx
  <Route path={ROUTE_PATHS.crm} element={<CRMDashboard />} />
  <Route path={ROUTE_PATHS.crmRoles} element={<RoleManagement />} />
  <Route path={ROUTE_PATHS.crmAttendance} element={<Attendance />} />
  <Route path={ROUTE_PATHS.crmSalary} element={<SalaryManagement />} />
  <Route path={ROUTE_PATHS.crmTasks} element={<Tasks />} />
  <Route path={ROUTE_PATHS.crmMeet} element={<Meet />} />
  <Route path={ROUTE_PATHS.crmBroadcasts} element={<Broadcasts />} />
  <Route path={ROUTE_PATHS.crmAiAssistant} element={<AIAssistant />} />
  <Route path={ROUTE_PATHS.crmSupport} element={<Support />} />
  ```
- Lines 283 & 286: `ROUTE_PATHS.tallyImport` and `ROUTE_PATHS.ewayBill` are mounted outside `RoleProtectedRoute`:
  ```tsx
  <Route path={ROUTE_PATHS.tallyImport} element={<TallyImport />} />
  <Route path={ROUTE_PATHS.ewayBill} element={<EwayBillDashboard />} />
  ```

### 1.3 Empirical Vitest Run Results
Execution of `cmd /c npx vitest run src/test/challengerM1_2DecoupleAudit.test.ts`:
- **Result**: Passed (51/51 tests, 364ms, Exit Code: 0).
- Test line 138: `it("AUDIT GAP: cashier is blocked from /crm & /crm/roles but permitted on /crm subroutes in isRouteAllowedForRole")` specifically confirmed that:
  - `isRouteAllowedForRole(ROUTE_PATHS.crmAttendance, "cashier") === true`
  - `isRouteAllowedForRole(ROUTE_PATHS.crmSalary, "cashier") === true`
  - `isRouteAllowedForRole(ROUTE_PATHS.crmTasks, "cashier") === true`
  - `isRouteAllowedForRole(ROUTE_PATHS.crmMeet, "cashier") === true`
  - `isRouteAllowedForRole(ROUTE_PATHS.crmBroadcasts, "cashier") === true`
  - `isRouteAllowedForRole(ROUTE_PATHS.crmAiAssistant, "cashier") === true`
  - `isRouteAllowedForRole(ROUTE_PATHS.crmSupport, "cashier") === true`

---

## 2. Logic Chain

1. **Role `owner` and `admin` Evaluation**:
   - In `isRouteAllowedForRole`, lines 301–304 explicitly match `store_owner`, `super_admin`, `admin`, and `owner`.
   - When evaluated with `customPermissions == null`, both `owner` and `admin` return `true` for all 37 `/billing/*` paths and all 9 `/crm/*` paths, as well as all 36 legacy aliases.
   - However, if `customPermissions` contains an explicit `false` (e.g. `{ crm: false }`), lines 290–297 return `false` before reaching line 299. In contrast, `useCRMPermission` contains an unconditional super-admin bypass (`if (isSuperAdmin) return true;`).
   - *Inference*: `admin` and `owner` have unrestricted access across both portals under standard conditions.

2. **Role `manager` Evaluation**:
   - In `isRouteAllowedForRole`, line 305 matches `role === "manager"` and returns `true`.
   - However, in `src/config/routes.ts` line 127, `MANAGER_ROLES` is aliased to `FULL_ACCESS_ROLES`, which contains only `["store_owner", "super_admin", "admin", "partner"]`. It omits the literal `"manager"`.
   - When a manager accesses protected routes in `src/App.tsx`, `allowedRoles.includes("manager")` evaluates to `false`. Access is only granted because the fallback `isRouteAllowedForRole(currentPath, "manager")` returns `true`.
   - *Inference*: While `isRouteAllowedForRole` permits `manager`, `MANAGER_ROLES` contains an internal configuration gap.

3. **Role `staff` Evaluation**:
   - `src/config/routes.ts` does NOT have an `if (role === "staff")` block in `isRouteAllowedForRole`.
   - When `customPermissions` is `null` or empty, `isRouteAllowedForRole(url, "staff")` falls through to line 381 and returns `false` for every route.
   - In `src/components/AppSidebar.tsx` (lines 141–146), sidebar navigation items and children are filtered by `isRouteAllowedForRole(item.url, userRole, userPermissions)`. Consequently, for `userRole === "staff"` without `userPermissions`, `AppSidebar.tsx` hides ALL navigation links (rendering an empty sidebar).
   - When `customPermissions` is provided (e.g. `{ crm: true, pos: true }`), lines 290–297 look up `FEATURE_ROUTE_MAP`. The user is granted access to all 9 CRM routes via `crm: true`, and to `/billing/pos` and `/billing/checkout` via `pos: true`.
   - In `src/pages/Staff.tsx`, `ROLE_PRESET_PERMISSIONS` completely lacks an entry for `"staff"`.
   - *Inference*: `staff` is treated as a pure custom role with zero default access. It operates strictly via explicit `customPermissions`. Without custom permissions, staff is locked out of sidebar navigation even if assigned CRM roles in the backend database.

4. **Role `cashier` Evaluation & Boundary Leakage**:
   - Unlike all other operational roles (`stock_manager`, `salesman`, `delivery_boy`, `accountant`) which use whitelists, `cashier` uses an inverted blacklist (`!RESTRICTED_ROUTES_FOR_CASHIER.has(url)`).
   - In `RESTRICTED_ROUTES_FOR_CASHIER`, only `/crm` and `/crm/roles` are listed; 7 CRM subroutes (`crmAttendance`, `crmSalary`, `crmTasks`, `crmMeet`, `crmBroadcasts`, `crmAiAssistant`, `crmSupport`) are omitted.
   - Therefore, `isRouteAllowedForRole` returns `true` for cashiers on all 7 CRM subroutes.
   - In `src/App.tsx`, CRM routes are mounted directly under `<AppLayout />` without `RoleProtectedRoute`.
   - Additionally, `ROUTE_PATHS.settingsReminders`, `ROUTE_PATHS.settingsCaSharing`, `ROUTE_PATHS.settingsPricing`, `ROUTE_PATHS.settingsRefer`, `ROUTE_PATHS.settingsHelp`, `ROUTE_PATHS.ewayBill`, and `ROUTE_PATHS.tallyImport` are omitted from `RESTRICTED_ROUTES_FOR_CASHIER`, evaluating to `true` for cashiers.
   - *Inference*: Cashiers are not strictly constrained to POS billing. Direct URL navigation or programmatic role checks permit cashiers into CRM submodules and unshielded billing tools.

5. **Utilization of `normalizeRouteForRbac`**:
   - `normalizeRouteForRbac` is called on line 287 of `isRouteAllowedForRole`.
   - Any legacy path (e.g. `/pos`, `/sales`, `/dashboard`, `/reports`) passed to `isRouteAllowedForRole` is normalized to its `/billing/*` counterpart before role checks or set lookups occur.
   - All 36 legacy redirect paths from `LEGACY_ROUTE_REDIRECTS` fall under the 27 prefix families handled by `normalizeRouteForRbac`.
   - *Inference*: `normalizeRouteForRbac` is properly and centrally utilized across all callers of `isRouteAllowedForRole`.

---

## 3. Caveats

- **Component-Level CRM Protection**: Inside individual CRM pages (`Attendance.tsx`, `SalaryManagement.tsx`, `Tasks.tsx`), component-level calls to `useCRMPermission()` will block write operations (e.g. approving attendance, creating tasks) if the user lacks assigned CRM permissions in Supabase. However, this is a second-layer defense; route-level gating in `isRouteAllowedForRole` currently leaks read/view navigation to cashiers.
- **Top-Level CRM Sidebar Menu**: In `src/components/AppSidebar.tsx`, the top-level CRM group has `url: ROUTE_PATHS.crm` (`/crm`), which IS present in `RESTRICTED_ROUTES_FOR_CASHIER`. Thus, the sidebar hides the top-level CRM menu from cashiers under standard UI navigation. The vulnerability is triggered via direct URL navigation, deep links, command palette search, and programmatic calls to `isRouteAllowedForRole`.

---

## 4. Conclusion

### 4.1 Audit Summary Matrix

| Role | Access to `/billing/*` | Access to `/crm/*` | Legacy Route Handling | Vulnerabilities / Issues Identified |
|---|---|---|---|---|
| **owner** | Unrestricted (`true`) | Unrestricted (`true`) | Normalized to `/billing/*` (`true`) | Preempted by `customPermissions[feat] === false` if set. |
| **admin** | Unrestricted (`true`) | Unrestricted (`true`) | Normalized to `/billing/*` (`true`) | Preempted by `customPermissions[feat] === false` if set. |
| **manager** | Unrestricted (`true`) | Unrestricted (`true`) | Normalized to `/billing/*` (`true`) | Literal `"manager"` missing from `MANAGER_ROLES` in `routes.ts`. |
| **staff** | Blocked by default (`false`) | Blocked by default (`false`) | Normalized to `/billing/*` (`false`) | Zero default routes. All sidebar links hidden when `userPermissions` is null. Missing from `ROLE_PRESET_PERMISSIONS`. |
| **cashier** | Permitted POS/Sales/Items/Parties | **LEAKED** (`true` on 7 CRM subroutes) | Normalized to `/billing/*` | **CRITICAL LEAK**: Cashier blacklist omits 7 CRM routes, 5 settings subroutes, `ewayBill`, and `tallyImport`. |

### 4.2 Actionable Remediation Plan for Worker M1

#### 1. Bulletproof Cashier Boundary in `src/config/routes.ts`
In `isRouteAllowedForRole`, enforce an architectural prefix deny for cashiers so no CRM routes can ever leak:
```typescript
// Cashier
if (role === "cashier") {
  // Strictly isolate cashiers to POS & Billing; deny all CRM paths unconditionally
  if (url.startsWith("/crm")) {
    return false;
  }
  return !RESTRICTED_ROUTES_FOR_CASHIER.has(url);
}
```
And expand `RESTRICTED_ROUTES_FOR_CASHIER` to explicitly include all CRM subroutes, settings subroutes, and compliance tools:
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
  ROUTE_PATHS.ewayBill,
  ROUTE_PATHS.automatedBills,
  ROUTE_PATHS.expenses,
  ROUTE_PATHS.barcode,
  ROUTE_PATHS.settings,
  ROUTE_PATHS.businessSettings,
  ROUTE_PATHS.invoiceSettings,
  ROUTE_PATHS.printSettings,
  ROUTE_PATHS.settingsReminders,
  ROUTE_PATHS.settingsCaSharing,
  ROUTE_PATHS.settingsPricing,
  ROUTE_PATHS.settingsRefer,
  ROUTE_PATHS.settingsHelp,
  ROUTE_PATHS.tallyImport,
  ROUTE_PATHS.staff,
  ROUTE_PATHS.activityLog,
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
  ...
]);
```

#### 2. Fix `MANAGER_ROLES` & `ALL_APP_ROLES` in `src/config/routes.ts`
```typescript
export const FULL_ACCESS_ROLES = [
  "store_owner",
  "super_admin",
  "admin",
  "partner",
  "manager",
  "owner",
] as const;
export const MANAGER_ROLES = FULL_ACCESS_ROLES;

export const ALL_APP_ROLES = [
  "admin",
  "manager",
  "owner",
  "partner",
  "stock_manager",
  "salesman",
  "delivery_boy",
  "accountant",
  "cashier",
  "store_owner",
  "super_admin",
  "staff",
] as const;
```

#### 3. Define Standard Baseline or Preset for `staff` in `src/pages/Staff.tsx`
Add explicit preset permissions for `staff` in `ROLE_PRESET_PERMISSIONS`:
```typescript
staff: {
  dashboard: false,
  pos: true,
  sales: true,
  purchases: false,
  items: true,
  parties: true,
  cashBank: false,
  eInvoicing: false,
  automatedBills: false,
  expenses: false,
  reports: false,
  analytics: false,
  staff: false,
  settings: false,
},
```

#### 4. Shield Sensitive Financial Routes in `src/App.tsx`
Move `ROUTE_PATHS.tallyImport` and `ROUTE_PATHS.ewayBill` inside `<Route element={<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />}>`.

---

## 5. Verification Method

1. **Empirical Challenger Suite Execution**:
   ```bash
   cmd /c npx vitest run src/test/challengerM1_2DecoupleAudit.test.ts
   ```
   *Expected outcome*: 51 tests pass. Test 1.38 verifies that cashier boundary gap currently exists.

2. **Route Allowed Evaluation Assertions**:
   Verify the following assertions to confirm full remediation:
   ```typescript
   // Cashier must be blocked from all CRM paths
   expect(isRouteAllowedForRole("/crm", "cashier")).toBe(false);
   expect(isRouteAllowedForRole("/crm/attendance", "cashier")).toBe(false);
   expect(isRouteAllowedForRole("/crm/salary", "cashier")).toBe(false);
   expect(isRouteAllowedForRole("/crm/tasks", "cashier")).toBe(false);
   expect(isRouteAllowedForRole("/crm/meet", "cashier")).toBe(false);
   expect(isRouteAllowedForRole("/crm/broadcasts", "cashier")).toBe(false);
   expect(isRouteAllowedForRole("/crm/ai-assistant", "cashier")).toBe(false);
   expect(isRouteAllowedForRole("/crm/support", "cashier")).toBe(false);
   expect(isRouteAllowedForRole("/crm/roles", "cashier")).toBe(false);

   // Cashier must be permitted on POS and Billing counters
   expect(isRouteAllowedForRole("/billing/pos", "cashier")).toBe(true);
   expect(isRouteAllowedForRole("/billing/checkout", "cashier")).toBe(true);
   expect(isRouteAllowedForRole("/pos", "cashier")).toBe(true);

   // Owner, Admin, Manager must be permitted on both portals
   expect(isRouteAllowedForRole("/crm/attendance", "owner")).toBe(true);
   expect(isRouteAllowedForRole("/billing/dashboard", "owner")).toBe(true);
   expect(isRouteAllowedForRole("/crm/tasks", "admin")).toBe(true);
   expect(isRouteAllowedForRole("/billing/reports", "manager")).toBe(true);
   ```

3. **TypeScript Compilation**:
   ```bash
   cmd /c npx tsc --noEmit
   ```
   *Expected outcome*: Exits with code 0.
