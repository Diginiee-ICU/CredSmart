# Handoff Report: Audit of Navigation Shells, Sidebars, and Mobile Dock under Cashier Role Constraints

**Agent**: `explorer_m1_r2_3` (EXPLORER / read-only investigation)  
**Date**: 2026-10-23T23:08:00Z  
**Target Milestone**: CredSmart Dual Portal Decoupling — Milestone 1 (Retry 2.3) & Preparation for Milestone 2  
**Parent Orchestrator**: `8ac6491a-275d-4c1c-b664-961cd66511b1`  

---

## 1. Observation

### 1.1 Direct Inspection of `src/components/AppSidebar.tsx`
Direct inspection of `src/components/AppSidebar.tsx` lines 137–179 and lines 412–440 revealed:

1. **Filtering Pipeline** (`AppSidebar.tsx:137-179`):
   ```typescript
   const filteredNavRouteGroups: NavGroup[] = useMemo(() => {
     const query = searchQuery.trim().toLowerCase();

     return NAV_ROUTES.map((group) => {
       const allowedItems = group.items
         .filter((item) => isRouteAllowedForRole(item.url, userRole, userPermissions))
         .map((item) => {
           const allowedChildren = item.children
             ? item.children.filter((child) =>
                 isRouteAllowedForRole(child.url as string, userRole, userPermissions)
               )
             : undefined;

           return {
             ...item,
             children: allowedChildren,
           };
         });
       ...
       return {
         label: group.label || group.group || "",
         group: group.group || group.label || "",
         items: allowedItems,
       };
     }).filter((group) => group.items.length > 0);
   }, [userRole, userPermissions, searchQuery]);
   ```
2. **Empty Group Suppression** (`AppSidebar.tsx:178`):
   - `.filter((group) => group.items.length > 0)` explicitly drops any navigation group where `allowedItems.length === 0`.
   - At line 422, `filteredNavRouteGroups.map((group, gIdx) => ...)` only receives groups with at least 1 allowed item.
   - At line 445, `const hasChildren = Boolean(item.children?.length);`: if all children are filtered out by `isRouteAllowedForRole`, `hasChildren` is `false`, so no empty chevron accordion or empty dropdown list is rendered.

3. **Current Mobile Bottom Dock** (`AppSidebar.tsx:199-308`):
   ```tsx
   {isMobile && (
     <nav
       className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/90 dark:border-slate-800/90 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-2 pt-1.5 pb-[max(0.65rem,env(safe-area-inset-bottom,0px))] flex items-center justify-around text-slate-500 select-none"
       aria-label="Mobile Bottom Navigation"
     >
       {/* Home */}
       <NavLink to={ROUTE_PATHS.dashboard} ...>Home</NavLink>
       {/* Sales */}
       <NavLink to={ROUTE_PATHS.sales} ...>Sales</NavLink>
       {/* Center Elevated POS Billing Button */}
       <NavLink to={ROUTE_PATHS.checkout} ...>POS Billing</NavLink>
       {/* Items */}
       <NavLink to={ROUTE_PATHS.items} ...>Items</NavLink>
       {/* Purchases */}
       <NavLink to={ROUTE_PATHS.purchases} ...>Purchases</NavLink>
     </nav>
   )}
   ```
   - The mobile dock is **hardcoded to exactly 5 static items**: Home (`ROUTE_PATHS.dashboard`), Sales (`ROUTE_PATHS.sales`), POS Billing (`ROUTE_PATHS.checkout`), Items (`ROUTE_PATHS.items`), and Purchases (`ROUTE_PATHS.purchases`).
   - It performs **ZERO role filtering**: neither `isRouteAllowedForRole` nor `userRole` is consulted.
   - For a `cashier`, `ROUTE_PATHS.dashboard` and `ROUTE_PATHS.purchases` are defined in `RESTRICTED_ROUTES_FOR_CASHIER` (`src/config/routes.ts:144, 145`).
   - In `src/App.tsx:139-141`, `RoleProtectedRoute` blocks unallowed routes and redirects to `ROUTE_PATHS.checkout`:
     ```typescript
     if (!allowedRoles.includes(effectiveRole) && !isRouteAllowedForRole(currentPath, effectiveRole, userPermissions)) {
       return <Navigate to={ROUTE_PATHS.checkout} replace />;
     }
     ```
   - When a mobile cashier taps "Home" or "Purchases", the application immediately triggers an unwanted redirect back to `/billing/checkout`. Thus, **40% of the mobile dock items are forbidden traps for cashiers**.

### 1.2 Inspection of `src/components/AppLayout.tsx`
Direct inspection of `src/components/AppLayout.tsx` lines 456–518 and lines 650–692 revealed:

1. **Auto Import Tally Button** (`AppLayout.tsx:456-464`):
   - Rendered unconditionally on tablet/desktop:
     ```tsx
     <button type="button" onClick={() => navigate(ROUTE_PATHS.tallyImport)} ...>
       <span>Auto Import Tally</span>
     </button>
     ```
   - No check for `userRole !== "cashier"`.

2. **Header "New Invoice" Quick Create Dropdown** (`AppLayout.tsx:488-517`):
   - The dropdown contains a hardcoded section:
     ```tsx
     <DropdownMenuLabel ...>PURCHASES & EXPENSES</DropdownMenuLabel>
     <DropdownMenuItem onClick={() => handleQuickAction("purchase")} ...>Purchase Bill</DropdownMenuItem>
     <DropdownMenuItem onClick={() => handleQuickAction("payment_out")} ...>Payment Out</DropdownMenuItem>
     <DropdownMenuItem onClick={() => handleQuickAction("expense")} ...>Record Expense</DropdownMenuItem>
     ```
   - `purchases` and `expenses` are restricted routes for cashiers. Clicking them triggers a redirect back to checkout.

3. **Command Palette** (`AppLayout.tsx:672-691`):
   - Dynamically filters `NAV_ROUTES` with `isRouteAllowedForRole`.
   - `if (allowedItems.length === 0) return null;` suppresses empty groups cleanly.

### 1.3 Inspection of `src/config/routes.ts`
1. `MAIN_NAV_ROUTES` (lines 408–600) contains 4 groups:
   - `GENERAL`: Dashboard, POS Billing, Parties (with children), Catalog (with children), Sales Hub (with children), Purchase Hub (with children), Reports & Insights (with children).
   - `ACCOUNTING SOLUTIONS`: Cash & Bank, E-Invoicing, E-Way Billing, Automated Invoices, Expenses & Petty Cash.
   - `BUSINESS TOOLS`: CRM (with 9 children), Digital Storefront, Staff Permissions, POS Billing Terminal, Activity & Audit Log.
   - `SETTINGS & APP PREFERENCES`: Business Settings, Invoice & Print Settings, Import Data (Tally & Excel).
2. Currently in `RESTRICTED_ROUTES_FOR_CASHIER` (`src/config/routes.ts:143-183`):
   - Missing CRM subroutes: `crmAttendance`, `crmSalary`, `crmTasks`, `crmMeet`, `crmBroadcasts`, `crmAiAssistant`, `crmSupport`.
   - Missing subroutes in billing: `ewayBill` (`/billing/eway-bill`), `tallyImport` (`/billing/tally-import`), `settingsReminders`, `settingsCaSharing`, `settingsRefer`.

---

## 2. Logic Chain

1. **Premise 1 (Menu Group Pruning)**:
   - In `AppSidebar.tsx:142`, items are filtered by `isRouteAllowedForRole(item.url, userRole, userPermissions)`.
   - If an item's URL is restricted, the entire item (and all its children) is omitted from `allowedItems`.
   - In `AppSidebar.tsx:178`, `.filter((group) => group.items.length > 0)` excludes any group where `group.items.length === 0`.
   - In `AppSidebar.tsx:445`, child accordions only render if `Boolean(item.children?.length)`.
   - Therefore, when all CRM subroutes and settings subroutes are placed into `RESTRICTED_ROUTES_FOR_CASHIER`:
     - The `CRM` menu item is completely dropped from `BUSINESS TOOLS` (it has 0 allowed items).
     - The `ACCOUNTING SOLUTIONS` group drops to 0 items (assuming `ewayBill` is also restricted) and is pruned completely.
     - The `SETTINGS & APP PREFERENCES` group drops to 0 items (assuming `tallyImport` is also restricted) and is pruned completely.
     - No orphan category headers, 0-count badges, or empty submenus are rendered in the sidebar.

2. **Premise 2 (Cashier Sidebar Composition)**:
   - In `GENERAL`: `POS Billing`, `Parties` (with only allowed children `All Parties` and `Customers`), `Catalog` (with only allowed items `All Items`, `Digital Storefront`, `Stock Summary`, `Godowns`), and `Sales Hub` (with only allowed items `Invoices & Estimates`, `Sales History`, `POS Terminal`) pass the filter.
   - In `BUSINESS TOOLS`: `Digital Storefront` and `POS Billing Terminal` pass the filter.
   - The resulting sidebar for a cashier contains **strictly allowed billing modules**: POS checkout, Catalog/Items, Sales, Customer ledgers, and Digital Storefront.

3. **Premise 3 (Mobile Dock Vulnerability)**:
   - In `AppSidebar.tsx:199-308`, the mobile bottom dock does not use the filtering pipeline; its 5 tabs (`dashboard`, `sales`, `checkout`, `items`, `purchases`) are hardcoded.
   - `dashboard` and `purchases` are restricted for cashiers.
   - When a cashier navigates to `dashboard` or `purchases`, `App.tsx:RoleProtectedRoute` redirects them back to `/billing/checkout`.
   - Therefore, the current mobile dock violates the cashier constraint by exposing forbidden routes as primary navigation buttons.

---

## 3. Caveats

1. **Monolithic vs Decoupled Routes in Milestone 1**:
   - `AppSidebar.tsx` currently imports `NAV_ROUTES` (which aliases `MAIN_NAV_ROUTES`).
   - Milestone 1 has prepared `BILLING_NAV_ROUTES` and `CRM_NAV_ROUTES`, but their active consumption in `AppSidebar.tsx` is designated for **Milestone 2**.
2. **Missing Billing Restrictions**:
   - `ROUTE_PATHS.ewayBill` (`/billing/eway-bill`) and `ROUTE_PATHS.tallyImport` (`/billing/tally-import`) are not currently present in `RESTRICTED_ROUTES_FOR_CASHIER`. If left unrestricted, `E-Way Billing` causes `ACCOUNTING SOLUTIONS` to render as a 1-item group, and `tallyImport` causes `SETTINGS & APP PREFERENCES` to render as a 1-item group.

---

## 4. Conclusion

1. **Sidebar Menu Rendering is Robust**:
   When all CRM subroutes (`crmAttendance`, `crmSalary`, `crmTasks`, `crmMeet`, `crmBroadcasts`, `crmAiAssistant`, `crmSupport`) and settings subroutes are restricted for cashiers, `AppSidebar.tsx` renders a clean, focused sidebar consisting strictly of allowed retail/billing operations (POS Billing, Sales, Items, Customers/Parties, Digital Storefront). The existing pipeline at line 178 completely eliminates empty category cards, badges, and headers.

2. **Mobile Bottom Dock Requires Role Adaptivity**:
   The current mobile bottom navigation dock in `AppSidebar.tsx` hardcodes `Home` (Dashboard) and `Purchases`, both of which are restricted routes for cashiers. Cashiers tapping these tabs experience jarring route redirects back to POS.

3. **Header Quick Actions Require Role Filtering**:
   The `AppLayout.tsx` header "New Invoice" dropdown and "Auto Import Tally" button expose purchase, expense, and import actions to cashiers without role checks.

---

## 5. Specific Recommendations for Milestone 2

### Recommendation 1: Implement Role-Adaptive & Suite-Adaptive Mobile Bottom Dock
Refactor `AppSidebar.tsx:199-308` into a dedicated component (`AdaptiveMobileDock.tsx` or inline):
- **When `activeSuite === "billing"` and `userRole === "cashier"`**:
  Render strictly allowed retail tools with 44px minimum touch targets and safe-area insets:
  1. `POS Billing` (`/billing/checkout` / `/billing/pos`) — Elevated center button
  2. `Sales` (`/billing/sales`)
  3. `Items` (`/billing/items`)
  4. `Customers` (`/billing/customers`)
  5. `Sales History` (`/billing/sales-history`)
  *(Strictly 0 forbidden routes: No Dashboard, No Purchases).*
- **When `activeSuite === "billing"` and `userRole !== "cashier"`**:
  `[Home, Sales, POS Billing (Center), Items, Purchases]`
- **When `activeSuite === "crm"`**:
  `[Command Center, Attendance, Tasks (Center), Payroll, Roles]`

### Recommendation 2: Guard Suite Switcher for Cashiers
In `AppLayout.tsx`, mount the new `<SuiteSwitcher />` component:
- If `userRole === "cashier"`, lock the switcher to "CredSmart POS & Billing" with no dropdown trigger to CRM, or hide the switcher entirely. Cashiers must never switch into `/crm/*`.

### Recommendation 3: Consume Dedicated Nav Routes in `AppSidebar.tsx`
Replace `NAV_ROUTES` in `AppSidebar.tsx` with:
```typescript
const { activeSuite } = useActiveSuite();
const activeNavRoutes = useMemo(() => {
  if (userRole === "cashier") return BILLING_NAV_ROUTES;
  return activeSuite === "crm" ? CRM_NAV_ROUTES : BILLING_NAV_ROUTES;
}, [activeSuite, userRole]);
```

### Recommendation 4: Role-Filter Header Quick Create in `AppLayout.tsx`
In `AppLayout.tsx:488-518`:
- Hide the "PURCHASES & EXPENSES" section in the "New Invoice" dropdown when `userRole === "cashier"`.
- Hide the "Auto Import Tally" header button when `userRole === "cashier"`.

### Recommendation 5: Complete `RESTRICTED_ROUTES_FOR_CASHIER` in `src/config/routes.ts`
Ensure the following routes are included in `RESTRICTED_ROUTES_FOR_CASHIER`:
- CRM: `crm`, `crmDashboard`, `crmAttendance`, `crmSalary`, `crmTasks`, `crmMeet`, `crmBroadcasts`, `crmAiAssistant`, `crmSupport`, `crmRoles`.
- Billing & Accounting: `ewayBill`, `tallyImport`, `settingsReminders`, `settingsCaSharing`, `settingsRefer`.
- Add prefix check in `isRouteAllowedForRole`: `if (role === "cashier" && url.startsWith("/crm")) return false;`.

---

## 6. Verification Method

1. **Verify Empty Group Suppression**:
   - Inspect `src/components/AppSidebar.tsx` lines 141–178 to verify that `.filter((group) => group.items.length > 0)` and `hasChildren` guards exist and prevent empty cards.
2. **Verify Mobile Dock Hardcoding**:
   - Inspect `src/components/AppSidebar.tsx` lines 205–308 to verify that `ROUTE_PATHS.dashboard` and `ROUTE_PATHS.purchases` are currently hardcoded without role checks.
3. **Verify Existing Tests**:
   ```bash
   cmd /c npx vitest run src/test/crmShellNavigation.audit.test.ts
   cmd /c npx vitest run src/test/challengerM1_2DecoupleAudit.test.ts
   ```
4. **Invalidation Conditions**:
   - If `AppSidebar.tsx` mobile dock is verified to already have role filtering for cashiers (it does not).
   - If `AppSidebar.tsx` renders an empty group card when all group items are restricted (it does not, due to line 178).
