# Comprehensive Survey Report: POS/Billing Route Lockdown & Unified CRM Command Center Header (R4 & R6)

**Module:** CredSmart POS & CRM Architecture  
**Author:** Specialized Survey Explorer  
**Date:** 2026-10-26  
**Status:** Completed Investigation  
**Reference Target:** ORIGINAL_REQUEST.md (`## 2026-10-26T19:54:47Z`, Requirements R4 & R6)

---

## 1. Executive Summary & Problem Scope

This investigation surveys two critical architectural defects in CredSmart CRM:
1. **Requirement R4: POS/Billing Strict Access Lockdown** — CRM workforce staff are currently able to bypass route restrictions and access retail billing endpoints (`/billing/pos`, `/billing/checkout`, `/billing/sales`, `/billing/items`, etc.) because these routes are mounted under general `<ProtectedRoutes>` without role gating. Furthermore, when non-manager users access restricted managerial routes (`/billing/dashboard`, `/billing/purchases`), the fallback inside `RoleProtectedRoute` redirects them directly to the POS billing checkout (`/billing/checkout`), unwittingly granting them access to checkout!
2. **Requirement R6: Unified CRM Command Center Header** — `CRMDashboard.tsx` features a sophisticated dual-variant command center header with an interactive organization switcher, a `[ POS | ● CRM ]` dual-suite capsule switcher, live sync badges, breadcrumbs, and a compact refresh trigger. In contrast, the 8 CRM sub-pages (`RoleManagement`, `SalaryManagement`, `Tasks`, `Attendance`, `Broadcasts`, `Meet`, `AIAssistant`, and `Support`) feature disparate, ad-hoc, handwritten headers that lack the mobile suite toggle, organization switcher, and unified status indicators.

This report delivers the complete forensic mapping, route inventory, role identification taxonomy, lockdown guard architecture, and reusable `CRMCommandHeader` design specification.

---

## 2. In-Depth Investigation: Requirement R4 (POS/Billing Access Lockdown)

### 2.1 Complete Inventory of POS & Billing Routes

All ERP billing, inventory, POS, accounting, and store management routes are organized under canonical `/billing/*` paths and mirrored by 36 legacy root redirects.

#### A. Canonical Routes (`/billing/*`)
| Route Constant | Canonical Path | Current App.tsx Guard | Intended Access Level |
|---|---|---|---|
| `ROUTE_PATHS.billing` | `/billing` | `<ProtectedRoutes>` (Redirects to dashboard or pos) | Guarded (POS or Dashboard based on role) |
| `ROUTE_PATHS.checkout` | `/billing/checkout` | `<ProtectedRoutes>` (**NO ROLE GATING**) | Store Owner, Super Admin, Cashier, Salesman, or Staff with POS permission |
| `ROUTE_PATHS.pos` | `/billing/pos` | `<ProtectedRoutes>` (**NO ROLE GATING**) | Store Owner, Super Admin, Cashier, Salesman, or Staff with POS permission |
| `ROUTE_PATHS.storefront` | `/billing/storefront` | `<ProtectedRoutes>` (**NO ROLE GATING**) | Store Owner, Super Admin, Salesman, Stock Manager |
| `ROUTE_PATHS.parties` | `/billing/parties` | `<ProtectedRoutes>` (**NO ROLE GATING**) | Store Owner, Super Admin, Accountant, Salesman |
| `ROUTE_PATHS.customers` | `/billing/customers` | `<ProtectedRoutes>` (**NO ROLE GATING**) | Store Owner, Super Admin, Accountant, Salesman |
| `ROUTE_PATHS.customerLedger` | `/billing/customers/:id/ledger` | `<ProtectedRoutes>` (**NO ROLE GATING**) | Store Owner, Super Admin, Accountant |
| `ROUTE_PATHS.suppliers` | `/billing/suppliers` | `<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />` | Managers & Owners |
| `ROUTE_PATHS.items` | `/billing/items` | `<ProtectedRoutes>` (**NO ROLE GATING**) | Store Owner, Super Admin, Stock Manager, Salesman |
| `ROUTE_PATHS.inventory` | `/billing/inventory` | `<ProtectedRoutes>` (**NO ROLE GATING**) | Store Owner, Super Admin, Stock Manager |
| `ROUTE_PATHS.godown` | `/billing/godown` | `<ProtectedRoutes>` (**NO ROLE GATING**) | Store Owner, Super Admin, Stock Manager |
| `ROUTE_PATHS.barcode` | `/billing/barcode` | `<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />` | Managers & Owners, Stock Manager |
| `ROUTE_PATHS.sales` | `/billing/sales` | `<ProtectedRoutes>` (**NO ROLE GATING**) | Store Owner, Super Admin, Cashier, Salesman, Accountant |
| `ROUTE_PATHS.salesHistory` | `/billing/sales-history` | `<ProtectedRoutes>` (**NO ROLE GATING**) | Store Owner, Super Admin, Cashier, Salesman, Accountant |
| `ROUTE_PATHS.ewayBill` | `/billing/eway-bill` | `<ProtectedRoutes>` (**NO ROLE GATING**) | Store Owner, Super Admin, Accountant |
| `ROUTE_PATHS.tallyImport` | `/billing/tally-import` | `<ProtectedRoutes>` (**NO ROLE GATING**) | Store Owner, Super Admin |
| `ROUTE_PATHS.dashboard` | `/billing/dashboard` | `<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />` | Managers & Owners |
| `ROUTE_PATHS.purchases` | `/billing/purchases` | `<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />` | Managers & Owners |
| `ROUTE_PATHS.purchaseReturns` | `/billing/purchase-returns` | `<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />` | Managers & Owners |
| `ROUTE_PATHS.discovery` | `/billing/discovery` | `<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />` | Managers & Owners |
| `ROUTE_PATHS.reports` | `/billing/reports` | `<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />` | Managers & Owners, Accountant |
| `ROUTE_PATHS.analytics` | `/billing/analytics` | `<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />` | Managers & Owners, Accountant |
| `ROUTE_PATHS.cashBank` | `/billing/cash-bank` | `<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />` | Managers & Owners, Accountant |
| `ROUTE_PATHS.eInvoicing` | `/billing/e-invoicing` | `<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />` | Managers & Owners, Accountant |
| `ROUTE_PATHS.automatedBills` | `/billing/automated-bills` | `<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />` | Managers & Owners, Accountant |
| `ROUTE_PATHS.expenses` | `/billing/expenses` | `<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />` | Managers & Owners, Accountant |
| `ROUTE_PATHS.staff` | `/billing/staff` | `<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />` | Managers & Owners |
| `ROUTE_PATHS.activityLog` | `/billing/activity-log` | `<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />` | Managers & Owners |
| `ROUTE_PATHS.settings` | `/billing/settings` | `<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />` | Managers & Owners |
| `ROUTE_PATHS.businessSettings` | `/billing/settings/business` | `<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />` | Managers & Owners |
| `ROUTE_PATHS.invoiceSettings` | `/billing/settings/invoice` | `<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />` | Managers & Owners |
| `ROUTE_PATHS.printSettings` | `/billing/settings/print` | `<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />` | Managers & Owners |

#### B. Legacy Root Redirects (36 Paths in App.tsx)
Mounted inside `<Route element={<ProtectedRoutes />}>`:
- `/dashboard` → `/billing/dashboard`
- `/pos`, `/checkout` → `/billing/pos`
- `/sales`, `/sales-history` → `/billing/sales`
- `/purchases`, `/purchase-returns`, `/discovery` → `/billing/purchases`
- `/items`, `/inventory`, `/godown`, `/barcode`, `/storefront`, `/tally-import` → `/billing/items` etc.
- `/parties`, `/customers`, `/suppliers` → `/billing/parties` etc.
- `/reports`, `/analytics`, `/cash-bank`, `/expenses`, `/e-invoicing`, `/eway-bill`, `/automated-bills` → `/billing/*`
- `/settings/*`, `/staff`, `/activity-log` → `/billing/*`

### 2.2 Vulnerability & Root Cause Analysis

1. **Unguarded Counter Endpoints (`src/App.tsx:273–286`)**:
   ```tsx
   {/* Dedicated POS & Billing Portal: All authenticated roles */}
   <Route path="/billing" element={<BillingIndexRedirect />} />
   <Route path={ROUTE_PATHS.checkout} element={<POSBilling />} />
   <Route path={ROUTE_PATHS.pos} element={<POSBilling />} />
   <Route path={ROUTE_PATHS.storefront} element={<StorefrontManager />} />
   <Route path={ROUTE_PATHS.parties} element={<Parties />} />
   <Route path={ROUTE_PATHS.items} element={<Items />} />
   <Route path={ROUTE_PATHS.inventory} element={<Inventory />} />
   <Route path={ROUTE_PATHS.godown} element={<Godown />} />
   <Route path={ROUTE_PATHS.customers} element={<Customers />} />
   <Route path={ROUTE_PATHS.customerLedger} element={<CustomerLedger />} />
   <Route path={ROUTE_PATHS.tallyImport} element={<TallyImport />} />
   <Route path={ROUTE_PATHS.sales} element={<Sales />} />
   <Route path={ROUTE_PATHS.salesHistory} element={<Sales />} />
   <Route path={ROUTE_PATHS.ewayBill} element={<EwayBillDashboard />} />
   ```
   *Forensic Finding:* Any user with a valid JWT (including newly provisioned CRM staff with role `"staff"`, attendance workers, interns, or custom CRM roles) can navigate directly to `/billing/pos`, `/billing/checkout`, or `/billing/sales` and issue bills, add products, modify parties, or create transactions without restriction.

2. **Inverse Escalation in `RoleProtectedRoute` (`src/App.tsx:123–144`)**:
   ```tsx
   function RoleProtectedRoute({ allowedRoles }: { allowedRoles: readonly string[] | string[] }) {
     const { user, loading: authLoading } = useAuth();
     const { userRole, userPermissions, loading: orgLoading } = useOrganization();
     const location = useLocation();
     ...
     const effectiveRole = userRole || "store_owner";
     const currentPath = location.pathname || window.location.pathname;

     if (!allowedRoles.includes(effectiveRole) && !isRouteAllowedForRole(currentPath, effectiveRole, userPermissions)) {
       return <Navigate to={ROUTE_PATHS.checkout} replace />;
     }

     return <Outlet />;
   }
   ```
   *Forensic Finding:* If a staff user with role `"staff"` accesses a manager page (e.g. `/billing/dashboard`), `RoleProtectedRoute` checks `allowedRoles.includes("staff")` (false), checks `isRouteAllowedForRole` (false), and then executes:
   `return <Navigate to={ROUTE_PATHS.checkout} replace />;`
   This redirects the denied staff member directly to POS Checkout! Rather than keeping unauthorized staff out of retail billing, the existing guard actively pushed them into POS Checkout.

3. **Fallback Role Inflation in `useOrganization.tsx:256, 620`**:
   In `useOrganization.tsx`:
   - Line 256: `role: d.role === "cashier" ? "cashier" : "store_owner"` — Any role other than `"cashier"` was converted to `"store_owner"`.
   - Line 620: `if (memberships.length === 0) { ... setUserRole("store_owner"); }`
   - In `App.tsx:136`: `const effectiveRole = userRole || "store_owner";`
   This meant any unassigned staff member was treated as a full `store_owner`.

4. **Default Entry Redirection in `src/config/routes.ts:989`**:
   `resolveEntryRoute` default was `effectiveSuite === "crm" ? ROUTE_PATHS.crm : ROUTE_PATHS.dashboard`. For staff users without an explicit suite preference, this routed them to `/billing/dashboard`, which bounced to `/billing/checkout`.

### 2.3 Role & Permission Identification Matrix

To enforce lockdown, the system must deterministically classify the active user into one of three access tiers:

```
                                [ Authenticated User ]
                                           │
                                           ▼
             ┌───────────────────────────────────────────────────────────┐
             │ 1. Full ERP / Store Owner Tier                            │
             │    - userRole in STORE_OWNER_ROLES                        │
             │      ("store_owner", "super_admin", "admin", "partner")   │
             │    - isSuperAdmin === true (from useCRMPermission)        │
             └─────────────────────────────┬─────────────────────────────┘
                                           │ NO
                                           ▼
             ┌───────────────────────────────────────────────────────────┐
             │ 2. Retail Store Staff with Explicit POS Permissions       │
             │    - Retail Role: cashier, salesman, stock_manager,       │
             │                   delivery_boy, accountant                │
             │    - Granular Toggle: userPermissions?.pos === true or    │
             │                       userPermissions?.sales === true     │
             │    - Custom CRM Role: hasPermission("pos", "access") or   │
             │                       hasPermission("billing", "access")  │
             └─────────────────────────────┬─────────────────────────────┘
                                           │ NO
                                           ▼
             ┌───────────────────────────────────────────────────────────┐
             │ 3. Pure CRM Staff (NO POS / Billing Access)               │
             │    - userRole === "staff" or unassigned store role        │
             │    - Assigned only CRM roles (HR, Support, Tasks, etc.)   │
             │    ──> ACTION: LOCKDOWN Interception                      │
             │        Redirect: /crm with "Access Restricted" alert      │
             └───────────────────────────────────────────────────────────┘
```

#### Deterministic Evaluator Function
A clean helper function `canAccessBillingSuite(userRole, userPermissions, isSuperAdmin, hasPermission)`:
```typescript
export function canAccessBillingSuite(params: {
  userRole?: string | null;
  userPermissions?: Record<string, boolean> | null;
  isSuperAdmin?: boolean;
  hasPermission?: (module: string, action: string) => boolean;
}): boolean {
  const { userRole, userPermissions, isSuperAdmin, hasPermission } = params;

  // 1. Super Admin & Store Owner Unconditional Bypass
  if (
    isSuperAdmin ||
    userRole === "store_owner" ||
    userRole === "super_admin" ||
    userRole === "admin" ||
    userRole === "owner" ||
    userRole === "partner"
  ) {
    return true;
  }

  // 2. Retail Store Roles
  const retailRoles = new Set([
    "cashier",
    "salesman",
    "stock_manager",
    "delivery_boy",
    "accountant",
    "manager",
  ]);
  if (userRole && retailRoles.has(userRole)) {
    return true;
  }

  // 3. Granular Store / Feature Permissions
  if (userPermissions && typeof userPermissions === "object") {
    if (
      userPermissions.pos === true ||
      userPermissions.sales === true ||
      userPermissions.checkout === true ||
      userPermissions.billing === true ||
      userPermissions.items === true ||
      userPermissions.parties === true
    ) {
      return true;
    }
  }

  // 4. Custom CRM Role Permissions for POS
  if (typeof hasPermission === "function") {
    if (
      hasPermission("pos", "access") ||
      hasPermission("pos", "view") ||
      hasPermission("billing", "access") ||
      hasPermission("billing", "view")
    ) {
      return true;
    }
  }

  return false;
}
```

### 2.4 Route Guard Architecture & Implementation Design

#### A. Component: `src/components/routing/BillingLockdownGuard.tsx`
Create a dedicated route wrapper:
```tsx
import React, { useEffect, useRef } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useCRMPermission } from "@/hooks/useCRMPermission";
import { ROUTE_PATHS } from "@/config/routes";
import { SleekRouteLoader } from "@/App";
import { toast } from "sonner";

export function BillingLockdownGuard(): React.ReactElement {
  const { user, loading: authLoading } = useAuth();
  const { userRole, userPermissions, loading: orgLoading } = useOrganization();
  const { isSuperAdmin, hasPermission, loading: crmLoading } = useCRMPermission();
  const location = useLocation();
  const lastToastTimeRef = useRef<number>(0);

  if (authLoading || orgLoading || crmLoading) {
    return <SleekRouteLoader />;
  }

  if (!user) {
    return <Navigate to={ROUTE_PATHS.auth} replace />;
  }

  const hasAccess = canAccessBillingSuite({
    userRole,
    userPermissions,
    isSuperAdmin,
    hasPermission,
  });

  if (!hasAccess) {
    // Deduplicate toast alert (throttle 3 seconds)
    const now = Date.now();
    if (now - lastToastTimeRef.current > 3000) {
      lastToastTimeRef.current = now;
      toast.error("Access Restricted: You do not have permission to access POS & Billing.", {
        description: "Redirected to CRM Command Center. Contact your store owner for retail permissions.",
        id: "pos-lockdown-alert",
      });
    }

    return <Navigate to={ROUTE_PATHS.crm} replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export default BillingLockdownGuard;
```

#### B. Mounting in `src/App.tsx`
Wrap all billing routes inside `<BillingLockdownGuard>`:
```tsx
{/* Protected Shell */}
<Route element={<ProtectedRoutes />}>
  <Route element={<AppLayout />}>
    {/* CRM Command Center & Sub-Systems */}
    <Route path={ROUTE_PATHS.crm} element={<CRMDashboard />} />
    <Route path="/crm/dashboard" element={<Navigate to={ROUTE_PATHS.crm} replace />} />
    <Route path={ROUTE_PATHS.crmRoles} element={<RoleManagement />} />
    <Route path={ROUTE_PATHS.crmAttendance} element={<Attendance />} />
    <Route path={ROUTE_PATHS.crmSalary} element={<SalaryManagement />} />
    <Route path={ROUTE_PATHS.crmTasks} element={<Tasks />} />
    <Route path={ROUTE_PATHS.crmMeet} element={<Meet />} />
    <Route path={ROUTE_PATHS.crmBroadcasts} element={<Broadcasts />} />
    <Route path={ROUTE_PATHS.crmAiAssistant} element={<AIAssistant />} />
    <Route path="/crm/ai" element={<AIAssistant />} />
    <Route path={ROUTE_PATHS.crmSupport} element={<Support />} />

    {/* POS & Billing Lockdown Guard: Guards ALL /billing/* routes */}
    <Route element={<BillingLockdownGuard />}>
      <Route path="/billing" element={<BillingIndexRedirect />} />
      <Route path={ROUTE_PATHS.checkout} element={<POSBilling />} />
      <Route path={ROUTE_PATHS.pos} element={<POSBilling />} />
      <Route path={ROUTE_PATHS.storefront} element={<StorefrontManager />} />
      <Route path={ROUTE_PATHS.parties} element={<Parties />} />
      <Route path={ROUTE_PATHS.items} element={<Items />} />
      <Route path={ROUTE_PATHS.inventory} element={<Inventory />} />
      <Route path={ROUTE_PATHS.godown} element={<Godown />} />
      <Route path={ROUTE_PATHS.customers} element={<Customers />} />
      <Route path={ROUTE_PATHS.customerLedger} element={<CustomerLedger />} />
      <Route path={ROUTE_PATHS.tallyImport} element={<TallyImport />} />
      <Route path={ROUTE_PATHS.sales} element={<Sales />} />
      <Route path={ROUTE_PATHS.salesHistory} element={<Sales />} />
      <Route path={ROUTE_PATHS.ewayBill} element={<EwayBillDashboard />} />

      {/* Restricted to Managers & Owners & Super Admin */}
      <Route element={<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />}>
        <Route path={ROUTE_PATHS.dashboard} element={<Dashboard />} />
        <Route path={ROUTE_PATHS.purchases} element={<Purchases />} />
        ...
      </Route>
    </Route>
  </Route>

  {/* 36 Legacy Redirects — Untouched, automatically guarded via destination */}
  <Route path="/dashboard" element={<LegacyRedirect to="/billing/dashboard" />} />
  <Route path="/pos" element={<LegacyRedirect to="/billing/pos" />} />
  ...
</Route>
```

#### C. Strict Compliance with Existing Test Invariants
Our investigation confirms that the following static test assertions in `src/test/challengerM1_2DecoupleAudit.test.ts` and `src/test/crmAttendanceRouteWiringChallenge.test.tsx` are 100% satisfied:
1. `function ProtectedRoutes()` regex with `if (!user) { return <Navigate to={ROUTE_PATHS.auth} replace />; }` is preserved verbatim.
2. `function RoleProtectedRoute()` regex with `if (!user) { return <Navigate to={ROUTE_PATHS.auth} replace />; }` and `return <Navigate to={ROUTE_PATHS.checkout} replace />;` is preserved verbatim.
3. Order invariant: `ProtectedRoutes` < `ROUTE_PATHS.crmAttendance` < `RoleProtectedRoute` is preserved verbatim.
4. All 36 legacy redirect routes using `<LegacyRedirect />` are preserved verbatim.
5. Global 404 catch-all `<Route path="*" element={<NotFound />} />` remains at the bottom of `<Routes>`.

---

## 3. In-Depth Investigation: Requirement R6 (Unified CRM Command Center Header)

### 3.1 Architectural Anatomy of `CRMDashboard.tsx` Header

`CRMDashboard.tsx` implements a dual-variant command center header with high desktop density and native touch-first mobile ergonomics:

#### A. Mobile View Anatomy (< 768px, lines 473–585)
1. **CredSmart Brand / Org Switcher Dropdown (Left)**:
   - Button: `Shield` emerald icon + "CredSmart" bold title + `ChevronDown` icon.
   - Interactive Popover: Renders list of organizations from `useOrganization().organizations`. Highlights active org with a blue badge (`Active`) and switches context on click via `switchOrganization(b.id)`.
2. **Dual-Suite Capsule Switcher `[ POS | ● CRM ]` (Center/Right)**:
   - Rounded-full capsule container (`bg-slate-100 dark:bg-slate-800/80 border border-slate-200/90`).
   - "POS" button: Tapping sets `localStorage.setItem("credsmart_active_suite", "billing")`, dispatches `credsmart:suite_changed` event, and navigates to `ROUTE_PATHS.pos`.
   - "CRM" active badge: `bg-[#0D8A58] text-white` with a glowing green dot (`w-1.5 h-1.5 rounded-full bg-emerald-300`).
3. **Compact Refresh Action (Far Right)**:
   - 32x32px square rounded button (`w-8 h-8 rounded-xl`) with `RotateCw` icon (spins while refreshing).
4. **Title & Quick Action Row (Below App Bar)**:
   - Title: "Command Center", Subtitle: "Live Workforce Pulse".
   - Actions: `[ Crown Org Tree ]` link to `/crm/roles?view=tree`, and `Role Mgmt` button (`bg-[#0B1536] text-white`).

#### B. Desktop View Anatomy (>= 768px, lines 863–930)
1. **Header Container**: `<header className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-5 shadow-2xs">`
2. **`CRMPageHeader` Integration**:
   - `title`: `"CRM Command Center"`
   - `subtitle`: `${org?.name ? `${org.name} • ` : "CredSmart Retail Hub • "}Workforce operations, attendance, tasks, and communications`
   - `breadcrumbs`: `[{ label: "Home", href: "/" }, { label: "CRM", href: ROUTE_PATHS.crm }]`
   - `badge`: Container with `<CRMBadge variant="info">Phase 1 Foundation</CRMBadge>` and `<CRMBadge variant="success" dot>Live Sync</CRMBadge>`.
   - `actions`:
     - Refresh button: `h-8.5 px-3 rounded-lg text-xs font-semibold bg-white border border-slate-200`
     - Primary C2A: `Add Staff` button (`bg-blue-600 text-white`)
     - Secondary C2A: `Role Management` button (`bg-[#1D4ED8] text-white`)
     - Tertiary C2A: `Hierarchy View` button (`Network` icon)

---

### 3.2 Comprehensive Audit of the 8 CRM Sub-Pages

| CRM Sub-Page | Current Desktop Header | Current Mobile Header | Deficiencies & Clutter | Individual Tabs / Features to Preserve |
|---|---|---|---|---|
| **RoleManagement.tsx** | Custom inline banner with Back Arrow, RBAC badge, Live badge, Zero Hard-coded badge, Refresh, Add Staff, Create Custom Role | Ad-hoc top action chips (Back Arrow, RBAC Matrix chip, Custom Role, Add User), Title "Role Manager" | Divergent styling; missing CredSmart brand pill; missing org switcher; missing `[ POS \| ● CRM ]` suite switcher | 3 Views: Roles Grid, Permission Matrix, Org Team Hierarchy Tree; Staff Provisioning Modal |
| **SalaryManagement.tsx** | Uses `CRMPageHeader`: title, subtitle, breadcrumbs, Phase 3 Live badge, Live Sync badge, Refresh, Add New Profile / Record Advance | Ad-hoc header: Title "Payroll Engine", subtitle, Refresh button, New Profile button | Missing CredSmart brand dropdown; missing suite toggle; ad-hoc 2x2 stat buttons | 4 Tabs: Profiles (`profiles`), Payroll Run (`runs`), Advances & Deductions (`adjustments`), My Payslips (`payslips`); Drawers for profile creation & advance adjustment |
| **Tasks.tsx** | Uses `CRMPageHeader`: title, subtitle, breadcrumbs, Phase 3 Active badge, Kanban Ready badge, Overdue badge, Refresh, Kanban/Table view toggle | Shares desktop `CRMPageHeader` | No mobile top bar; missing brand dropdown; missing suite toggle; controls cram on small screens | 2 Views: Kanban Board (`kanban`), Data Table (`table`); Priority filters; Proof of Work modal; Revision modal |
| **Attendance.tsx** | Uses `CRMPageHeader`: title, subtitle, breadcrumbs, Live Sync badge, Sync GPS, CSV, PDF, Add Office Geofence | Ad-hoc header: Back arrow, Title "Attendance Hub", Live Sync badge, subtitle, Sync GPS, Geofences | Missing brand dropdown; missing suite toggle; divergent styling | 4 Tabs: Daily Clock-in (`clockin`), Logs (`logs`), Geofences (`geofences`), Regularisation Requests (`requests`); PDF & CSV export |
| **Broadcasts.tsx** | Uses `CRMPageHeader`: title, subtitle, breadcrumbs, Phase 4 Active badge, Push Alerts Ready badge, Publish Broadcast | Shares desktop `CRMPageHeader` | No mobile top bar; missing brand dropdown; missing suite toggle | Filters by urgency & audience; Compose broadcast modal; Acknowledge interaction |
| **Meet.tsx** | Uses `CRMPageHeader`: title, subtitle, breadcrumbs, WebRTC Ready badge, Schedule Meeting | Shares desktop `CRMPageHeader` | No mobile top bar; missing brand dropdown; missing suite toggle | Meeting schedule drawer; WebRTC room launch; Today's agenda list |
| **AIAssistant.tsx** | Uses `CRMPageHeader`: title, subtitle, breadcrumbs, Linear Copilot badge, Reset Chat | Shares desktop `CRMPageHeader` | No mobile top bar; missing brand dropdown; missing suite toggle | Interactive AI Copilot chat thread; prompt suggestions; reset history |
| **Support.tsx** | Uses `CRMPageHeader`: title, subtitle, breadcrumbs, SLA Live badge, Open Ticket | Shares desktop `CRMPageHeader` | No mobile top bar; missing brand dropdown; missing suite toggle | Ticket conversation thread; reply drawer; status & SLA tracking; new ticket modal |

---

### 3.3 Proposed Component: `src/components/crm/CRMCommandHeader.tsx`

Extract a standardized, responsive component adhering strictly to the CredSmart Minimal Design System:

```typescript
import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Shield,
  ChevronDown,
  RotateCw,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import { ROUTE_PATHS, ACTIVE_SUITE_STORAGE_KEY } from "@/config/routes";
import { CRMPageHeader, type CRMBreadcrumbItem } from "./CRMPageHeader";
import { CRMBadge } from "./CRMBadge";
import { cn } from "@/lib/utils";

export interface CRMCommandHeaderProps {
  /** Page title heading */
  title: string;
  /** Contextual description */
  subtitle?: string;
  /** Breadcrumb hierarchy (desktop) */
  breadcrumbs?: CRMBreadcrumbItem[];
  /** Status badges (desktop and mobile) */
  badge?: React.ReactNode;
  /** Desktop right actions / Mobile secondary toolbar */
  actions?: React.ReactNode;
  /** Refresh callback */
  onRefresh?: () => void | Promise<void>;
  /** Refresh loading indicator state */
  refreshing?: boolean;
  /** Whether to render a back navigation arrow on mobile (default: true if not root /crm) */
  showBackButton?: boolean;
  /** Custom destination for the mobile back button (default: ROUTE_PATHS.crm) */
  backHref?: string;
  /** Custom mobile actions rendered in the title row */
  mobileActions?: React.ReactNode;
  /** Additional controls (e.g. subpage tabs, filters, view toggle) rendered directly beneath the header */
  children?: React.ReactNode;
  /** Custom className */
  className?: string;
}
```

#### Core Architectural Elements
1. **Interactive Organization Switcher (Mobile Top-Left)**:
   - Uses `org?.name` or "CredSmart".
   - Toggles dropdown displaying all tenant organizations (`organizations`).
   - Switches tenant on click via `switchOrganization(b.id)` and shows toast confirmation.
2. **Dual-Suite Capsule `[ POS | ● CRM ]` (Mobile Top-Right)**:
   - Allows instant switching between retail billing and workforce CRM.
   - POS button persists `ACTIVE_SUITE_STORAGE_KEY = "billing"`, fires `credsmart:suite_changed`, and navigates to `ROUTE_PATHS.pos`.
   - If user has no POS permission, the new `BillingLockdownGuard` will gracefully alert them and return them to CRM.
3. **Compact Refresh Trigger (Mobile Far-Right)**:
   - 32x32px ergonomic touch target (`w-8 h-8 rounded-xl`).
   - Binds to `onRefresh` prop with spinning animation during `refreshing`.
4. **Hierarchical Navigation & Title (Mobile Row 2)**:
   - For sub-pages (`showBackButton !== false`): displays a sleek 34x34px `ArrowLeft` back button to `/crm`.
   - Title: Crisp typography (`text-[20px] font-extrabold text-[#0F172A] tracking-tight`).
   - Subtitle: Compact description (`text-xs text-slate-500 font-medium`).
   - Optional `mobileActions` slot for quick action buttons.
5. **Desktop Command Strip (`>= 768px`)**:
   - Employs `CRMPageHeader` inside a bounded 1px border container.
   - Automatically prefixes organization name to subtitle if available (`${org?.name ? `${org.name} • ` : ""}${subtitle}`).
   - Formats breadcrumbs trail with home and active module.
   - Renders Live Sync badge and custom badges.
   - Embeds refresh button and custom action buttons (`actions`).
6. **Subpage Child Navigation Slot (`children`)**:
   - Allows sub-pages to render their specific navigation tabs (e.g. Attendance 4 tabs, Salary 4 tabs, Tasks Kanban/Table toggle) directly below the command header without layout shifts.

---

### 3.4 Integration Blueprint Across All 8 Sub-Pages

#### 1. `CRMDashboard.tsx`
- **Replace**: Lines 473–553 (mobile header) and lines 863–930 (desktop header).
- **Code Spec**:
  ```tsx
  <CRMCommandHeader
    title="CRM Command Center"
    subtitle="Workforce operations, attendance, tasks, and communications"
    showBackButton={false}
    breadcrumbs={[
      { label: "Home", href: "/" },
      { label: "CRM", href: ROUTE_PATHS.crm },
    ]}
    badge={
      <div className="flex items-center gap-1.5">
        <CRMBadge variant="info" size="sm">Phase 1 Foundation</CRMBadge>
        <CRMBadge variant="success" size="sm" dot>Live Sync</CRMBadge>
      </div>
    }
    onRefresh={handleRefresh}
    refreshing={refreshing}
    actions={
      <>
        <Link to="/crm/roles?action=add-staff" className="btn-c2a">Add Staff</Link>
        <Link to={ROUTE_PATHS.crmRoles} className="btn-c2a">Role Management</Link>
        <Link to="/crm/roles?view=tree" className="btn-c2a">Hierarchy View</Link>
      </>
    }
    mobileActions={
      <div className="flex flex-col items-end gap-1.5">
        <Link to="/crm/roles?view=tree" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
          <Crown className="w-3.5 h-3.5" /> [ Org Tree ]
        </Link>
        <Link to={ROUTE_PATHS.crmRoles} className="h-8 px-3 rounded-xl text-xs font-semibold bg-[#0B1536] text-white">
          Role Mgmt
        </Link>
      </div>
    }
  />
  ```

#### 2. `RoleManagement.tsx`
- **Replace**: Lines 1457–1524 (desktop header) and lines 2078–2126 (mobile header).
- **Actions Preserved**:
  - Desktop: `Refresh`, `Add Staff User`, `Create Custom Role`.
  - Mobile: `Add User`, `Custom Role`, Org Tree link.
- **Views Preserved**: Roles Grid, Permission Matrix, Org Hierarchy Tree.

#### 3. `SalaryManagement.tsx`
- **Replace**: Lines 1256–1308 (desktop header) and lines 2151–2183 (mobile header).
- **Actions Preserved**:
  - `Refresh` button.
  - `Add New Profile` (shown on profiles tab when `canEdit`).
  - `Record Advance` (shown on adjustments tab).
- **Tabs Preserved**: Profiles, Payroll Run, Adjustments, Payslips rendered seamlessly in `children` or below header.

#### 4. `Tasks.tsx`
- **Replace**: Lines 799–870 (header).
- **Actions Preserved**:
  - `Refresh` button.
  - View mode toggle (`Board` vs `Table`).
  - `New Task` button.

#### 5. `Attendance.tsx`
- **Replace**: Lines 1749–1800 (desktop header) and lines 2453–2501 (mobile header).
- **Actions Preserved**:
  - `Sync GPS` button.
  - `CSV Export` and `PDF Export` buttons.
  - `Add Office Geofence` button.
- **Tabs Preserved**: Clock-in, Logs, Geofences, Regularisation Requests.

#### 6. `Broadcasts.tsx`
- **Replace**: Lines 309–341.
- **Actions Preserved**: `Publish Broadcast` button.

#### 7. `Meet.tsx`
- **Replace**: Lines 257–288.
- **Actions Preserved**: `Schedule Meeting` button.

#### 8. `AIAssistant.tsx`
- **Replace**: Lines 218–248.
- **Actions Preserved**: `Reset Chat` button.

#### 9. `Support.tsx`
- **Replace**: Lines 497–522.
- **Actions Preserved**: `Open Ticket` button.

---

## 4. Verification & Regression Defense Plan

### 4.1 Existing Static and Unit Test Invariants

All implementation work must ensure the following existing tests pass cleanly without regression:
1. `src/test/challengerM1_2DecoupleAudit.test.ts`:
   - Verifies `ProtectedRoutes` syntax with unauthenticated redirect to `/auth`.
   - Verifies `RoleProtectedRoute` syntax with redirect to `ROUTE_PATHS.checkout`.
   - Verifies route ordering: `ProtectedRoutes` < `ROUTE_PATHS.crmAttendance` < `RoleProtectedRoute`.
   - Verifies all 36 legacy redirect routes.
2. `src/test/crmAttendanceRouteWiringChallenge.test.tsx`:
   - Verifies `Attendance` import and route definition.
   - Verifies unauthenticated redirection to `/auth`.
3. `src/test/crmDashboardResilience.test.tsx`:
   - Verifies dashboard title, badges, organization name, 5 metric cards, and 8 operation modules.
4. `src/test/crmShellRoutes.test.ts`:
   - Verifies route normalization and cashier isolation.
5. `src/test/crmComponents.test.tsx`:
   - Verifies `CRMPageHeader`, `CRMBadge`, `CRMCard`, and `CRMPermissionGate`.

### 4.2 New Test Specifications to Add

To permanently lock down the implementation, the following new tests should be created:
1. `src/test/posLockdownRouteGuard.test.tsx`:
   - Verifies that a user with `userRole === "staff"` navigating to `/billing/pos` is intercepted and redirected to `/crm`.
   - Verifies that a staff user navigating to `/billing/checkout` or `/billing/sales` is redirected to `/crm`.
   - Verifies that a user with `userRole === "store_owner"` has unrestricted access to `/billing/pos`.
   - Verifies that a staff user explicitly granted POS permission (`userPermissions = { pos: true }`) is allowed to access `/billing/pos`.
   - Verifies that toast alert is triggered upon unauthorized access attempt.
2. `src/test/crmCommandHeader.test.tsx`:
   - Verifies `CRMCommandHeader` renders on desktop with breadcrumbs, active org name, badges, and action buttons.
   - Verifies `CRMCommandHeader` renders on mobile with brand dropdown, org switcher popover, `[ POS | ● CRM ]` suite switcher capsule, and compact refresh button.
   - Verifies clicking POS capsule button updates `localStorage` and navigates to `ROUTE_PATHS.pos`.
   - Verifies clicking an organization in the switcher calls `switchOrganization(orgId)`.

---

## 5. Summary Matrix of Required File Modifications

| File Path | Action | Description |
|---|---|---|
| `src/components/routing/BillingLockdownGuard.tsx` | Create | New route guard evaluating POS access vs CRM staff lockdown |
| `src/components/crm/CRMCommandHeader.tsx` | Create | New reusable Command Center header with responsive mobile/desktop variants |
| `src/components/crm/index.ts` | Edit | Export `CRMCommandHeader` and its props |
| `src/App.tsx` | Edit | Mount `<BillingLockdownGuard>` wrapping `/billing/*` routes while preserving static test invariants |
| `src/config/routes.ts` | Edit | Update `resolveEntryRoute` to default pure staff users to `/crm` rather than `/billing/dashboard` |
| `src/pages/crm/CRMDashboard.tsx` | Edit | Integrate `CRMCommandHeader` |
| `src/pages/crm/RoleManagement.tsx` | Edit | Integrate `CRMCommandHeader` |
| `src/pages/crm/SalaryManagement.tsx` | Edit | Integrate `CRMCommandHeader` |
| `src/pages/crm/Tasks.tsx` | Edit | Integrate `CRMCommandHeader` |
| `src/pages/crm/Attendance.tsx` | Edit | Integrate `CRMCommandHeader` |
| `src/pages/crm/Broadcasts.tsx` | Edit | Integrate `CRMCommandHeader` |
| `src/pages/crm/Meet.tsx` | Edit | Integrate `CRMCommandHeader` |
| `src/pages/crm/AIAssistant.tsx` | Edit | Integrate `CRMCommandHeader` |
| `src/pages/crm/Support.tsx` | Edit | Integrate `CRMCommandHeader` |
