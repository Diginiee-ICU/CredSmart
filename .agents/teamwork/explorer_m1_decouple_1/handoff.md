# Handoff Report: Route Architecture & Isolation Design for `src/config/routes.ts`

**Explorer**: `explorer_m1_decouple_1`  
**Date**: 2026-10-23T22:30:00Z  
**Working Directory**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_decouple_1`  
**Parent Orchestrator**: `8ac6491a-275d-4c1c-b664-961cd66511b1`  
**Milestone**: Milestone 1 — Route Architecture & Isolation (`/billing/*` and `/crm/*`)  
**Proposed Code Artifact**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_decouple_1\proposed_routes.ts`

---

## 1. Observation

### 1.1 Current Structure of `src/config/routes.ts`
Direct inspection of `src/config/routes.ts` (522 lines total) revealed the following configuration segments:
1. **Lucide Icon Imports** (`lines 1–27`): Imports 24 icons (`LayoutDashboard`, `Users2`, `Package`, `ShoppingCart`, `Truck`, `BarChart3`, `Landmark`, `FileCheck`, `Repeat`, `Receipt`, `Monitor`, `CalendarCheck`, `Settings`, `Warehouse`, `FileSpreadsheet`, `RotateCcw`, `Barcode`, `History`, `UserCircle`, `Users`, `Activity`, `FileText`, `Store`, `Briefcase`).
2. **`ROUTE_PATHS` Constant** (`lines 29–110`):
   - **Public & Marketing (19 routes)**: `landing: "/"`, `auth: "/auth"`, `features: "/features"`, `pricing: "/pricing"`, `publicStorefront: "/store/:slug"`, etc.
   - **POS & Billing ERP routes (37 routes)**: Currently declared at the root level without namespace prefixes:
     - `dashboard: "/dashboard"`, `parties: "/parties"`, `customers: "/customers"`, `customerLedger: "/customers/:id/ledger"`, `suppliers: "/suppliers"`, `storefront: "/storefront"`, `items: "/items"`, `inventory: "/inventory"`, `godown: "/godown"`, `barcode: "/barcode"`, `sales: "/sales"`, `salesHistory: "/sales-history"`, `checkout: "/checkout"`, `pos: "/pos"`, `purchases: "/purchases"`, `purchaseReturns: "/purchase-returns"`, `discovery: "/discovery"`, `reports: "/reports"`, `analytics: "/analytics"`, `cashBank: "/cash-bank"`, `eInvoicing: "/e-invoicing"`, `ewayBill: "/eway-bill"`, `automatedBills: "/automated-bills"`, `expenses: "/expenses"`, `staff: "/staff"`, `activityLog: "/activity-log"`, `settings: "/settings"`, `businessSettings: "/settings/business"`, `invoiceSettings: "/settings/invoice"`, `printSettings: "/settings/print"`, `settingsReminders: "/settings/reminders"`, `settingsCaSharing: "/settings/ca-sharing"`, `settingsPricing: "/settings/pricing"`, `settingsRefer: "/settings/refer"`, `settingsHelp: "/settings/help"`, `tallyImport: "/tally-import"`.
   - **CRM routes (10 keys, 9 unique endpoints)**: Already scoped under `/crm/*`:
     - `crm: "/crm"`, `crmDashboard: "/crm"`, `crmAttendance: "/crm/attendance"`, `crmSalary: "/crm/salary"`, `crmTasks: "/crm/tasks"`, `crmMeet: "/crm/meet"`, `crmBroadcasts: "/crm/broadcasts"`, `crmAiAssistant: "/crm/ai-assistant"`, `crmSupport: "/crm/support"`, `crmRoles: "/crm/roles"`.
3. **Role & RBAC Definitions** (`lines 114–154`):
   - `STORE_OWNER_ROLES`, `FULL_ACCESS_ROLES`, `MANAGER_ROLES`, `ALL_APP_ROLES`.
   - `RESTRICTED_ROUTES_FOR_CASHIER: ReadonlySet<string>` references `ROUTE_PATHS.dashboard`, `ROUTE_PATHS.purchases`, `ROUTE_PATHS.crm`, `ROUTE_PATHS.crmRoles`, etc.
4. **`FEATURE_ROUTE_MAP`** (`lines 172–203`): Maps `FeatureKey` strings (`dashboard`, `pos`, `sales`, `purchases`, `items`, `parties`, `cashBank`, `eInvoicing`, `automatedBills`, `expenses`, `reports`, `analytics`, `staff`, `settings`, `crm`) to route arrays.
5. **`isRouteAllowedForRole`** (`lines 205–305`): Evaluates role permissions against exact URL strings and `FEATURE_ROUTE_MAP`.
6. **`MAIN_NAV_ROUTES`** (`lines 327–519`): Monolithic array with 4 groups:
   - `GENERAL`: Dashboard, POS Billing, Parties (4 children), Catalog (6 children), Sales Hub (4 children), Purchase Hub (3 children), Reports & Insights (2 children).
   - `ACCOUNTING SOLUTIONS`: Cash & Bank, E-Invoicing, E-Way Billing, Automated Invoices, Expenses & Petty Cash.
   - `BUSINESS TOOLS`: CRM (with 9 children), Digital Storefront, Staff Permissions, POS Billing Terminal, Activity & Audit Log.
   - `SETTINGS & APP PREFERENCES`: Business Settings, Invoice & Print Settings, Import Data (Tally & Excel).
7. **`NAV_ROUTES` Re-export** (`line 521`): `export const NAV_ROUTES = MAIN_NAV_ROUTES;`.

### 1.2 Re-Export Mirroring in `src/components/routes.ts`
Inspection of `src/components/routes.ts` (`lines 1–10`):
```ts
export * from "@/config/routes";
```
Every constant, type, and function exported from `src/config/routes.ts` is re-exported with identical reference identity.

### 1.3 Strict Test Assertions in Existing Test Suites
Running baseline tests via `vitest` confirmed 81 passing tests:
- `src/test/crmShellRoutes.test.ts` (22 tests passing)
- `src/test/crmShellNavigation.audit.test.ts` (8 tests passing)
- `src/test/example.test.ts` (10 tests passing)
- `src/test/crmSubmodules.test.tsx` (11 tests passing)
- `src/test/crmAttendanceRouteWiringChallenge.test.tsx` (10 tests passing)
- `src/test/crmDashboardResilience.test.tsx` (20 tests passing)

Specific invariant assertions identified:
1. **Re-export reference equality (`src/test/crmShellRoutes.test.ts:56–81`)**:
   ```ts
   expect(ComponentsRoutes.ROUTE_PATHS).toBe(ConfigRoutes.ROUTE_PATHS);
   expect(ComponentsRoutes.MAIN_NAV_ROUTES).toBe(ConfigRoutes.MAIN_NAV_ROUTES);
   expect(ComponentsRoutes.NAV_ROUTES).toBe(ConfigRoutes.NAV_ROUTES);
   expect(componentKeys.length).toBe(configKeys.length);
   ```
2. **Canonical CRM paths (`src/test/crmShellRoutes.test.ts:86–128`)**:
   - `ROUTE_PATHS.crm === "/crm"`
   - `ROUTE_PATHS.crmDashboard === "/crm"`
   - Exactly 9 unique CRM paths (`/crm`, `/crm/attendance`, `/crm/salary`, `/crm/tasks`, `/crm/meet`, `/crm/broadcasts`, `/crm/ai-assistant`, `/crm/support`, `/crm/roles`).
   - Asserts zero collisions between `crmPaths` and existing protected routes (`ROUTE_PATHS.dashboard`, `sales`, `checkout`, `pos`, `purchases`, `inventory`, `parties`, `reports`, `cashBank`, `staff`, `settings`).
3. **`FEATURE_ROUTE_MAP.crm` length (`src/test/crmShellRoutes.test.ts:170–192` & `src/test/crmShellNavigation.audit.test.ts:72`)**:
   - Asserts `FEATURE_ROUTE_MAP.crm.length === 9` and contains all 9 canonical CRM paths without duplicates.
4. **Hierarchical sub-navigation in `MAIN_NAV_ROUTES` (`src/test/crmShellRoutes.test.ts:201–232`)**:
   - `MAIN_NAV_ROUTES` must have a group with `label: "BUSINESS TOOLS"`.
   - The item with `title: "CRM"` must have `url: ROUTE_PATHS.crm`, `badge: "NEW"`, and exactly 9 children matching:
     `Dashboard`, `Attendance`, `Salary`, `Tasks`, `Meet`, `Broadcasts`, `AI Assistant`, `Support`, `Role Management`.
   - `NAV_ROUTES` must be identical to `MAIN_NAV_ROUTES` (`expect(NAV_ROUTES).toBe(MAIN_NAV_ROUTES)`).

---

## 2. Logic Chain

1. **Isolation Premise**: In accordance with `ORIGINAL_REQUEST.md §R1` and `PROJECT.md §System Topology`, CredSmart must decouple its features into two dedicated portals: POS & Billing (`/billing/*`) and CRM (`/crm/*`).
2. **Route Prefix Mapping**:
   - Any billing/ERP route currently residing at `/` (e.g. `/dashboard`, `/pos`, `/sales`, `/items`) must now have its canonical value in `ROUTE_PATHS` prefixed with `/billing` (e.g. `/billing/dashboard`, `/billing/pos`, `/billing/sales`, `/billing/items`).
   - A new root path `billing: "/billing"` must be added to `ROUTE_PATHS`.
   - All CRM paths already start with `/crm` and must remain strictly unmodified to preserve existing CRM functionality and pass all 22 assertions in `crmShellRoutes.test.ts`.
3. **Backward Compatibility & Legacy Redirection**:
   - Upgrading `ROUTE_PATHS` updates links rendered across the application.
   - However, legacy URLs (e.g., bookmarked links, search queries, or internal routes like `/pos` or `/customers/:id/ledger`) will still hit root URLs.
   - Therefore, a complete catalog of 36 legacy routes must be defined (`LEGACY_ROUTE_REDIRECTS`) to enable Worker M1 to mount universal parameterized `<LegacyRedirect />` components in `src/App.tsx`.
4. **RBAC & Path Normalization**:
   - `isRouteAllowedForRole` evaluates whether a user role is permitted to access a given URL.
   - If an application component or test queries `isRouteAllowedForRole` with a legacy path (e.g. `isRouteAllowedForRole("/reports", "cashier")`), or if a component queries with `/billing/reports`, the outcome must be identical.
   - Implementing `normalizeRouteForRbac(url)` inside `isRouteAllowedForRole` transparently maps legacy prefixes to `/billing/*` before evaluating `stockAllowed`, `salesAllowed`, `accountantAllowed`, and `RESTRICTED_ROUTES_FOR_CASHIER`.
5. **Preservation of `MAIN_NAV_ROUTES`**:
   - `src/test/crmShellRoutes.test.ts` Suite 4 and `src/test/crmShellNavigation.audit.test.ts` directly inspect `MAIN_NAV_ROUTES` and `NAV_ROUTES`.
   - To prevent test failures, `MAIN_NAV_ROUTES` must be maintained and exported with all its existing groups, items, and CRM children.
6. **Dedicated Portals Navigation Design (`BILLING_NAV_ROUTES` & `CRM_NAV_ROUTES`)**:
   - `BILLING_NAV_ROUTES`: Excludes the CRM item from `BUSINESS TOOLS`, keeping retail, inventory, accounting, and store settings 100% clean.
   - `CRM_NAV_ROUTES`: Replaces billing groups with two clean workforce-focused groups:
     - `WORKFORCE & OPERATIONS`: Command Center, Attendance Tracker, Salary & Payroll, Tasks & Projects, Role Management.
     - `COMMUNICATION & TOOLS`: Meetings, Broadcasts, AI Assistant, Support Tickets.
   - Both navigation structures use the shared TypeScript interface `NavRouteGroup[]`, ensuring seamless plug-and-play rendering in `AppSidebar.tsx` and `AppLayout.tsx` for Milestone 2.

---

## 3. Caveats

1. **Read-Only Scope**: In compliance with the investigator archetype, no edits were directly written to `src/config/routes.ts` or `src/App.tsx`. All edits have been drafted in `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_decouple_1\proposed_routes.ts` and detailed below for Worker M1.
2. **Create Invoice Flow Invariance**: No routes or modals related to invoice creation (`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`) are altered. Invoicing is invoked as a modal workflow from `/billing/sales` and `/billing/pos`, remaining 100% invariant.
3. **AppRouter Desktop Compatibility**: CredSmart runs in both Web (`BrowserRouter`) and Desktop Electron (`HashRouter`). Paths must remain relative to root/hash without relying on browser window origins.

---

## 4. Conclusion & Concrete Implementation Recommendations for Worker M1

Worker M1 can directly replace `src/config/routes.ts` with `proposed_routes.ts` or execute the following line-by-line modifications:

### 4.1 Update Lucide Icon Imports (`src/config/routes.ts:1–27`)
**Target**: Add icons needed by `CRM_NAV_ROUTES`: `CheckSquare`, `Wallet`, `Video`, `Radio`, `Bot`, `LifeBuoy`, `Shield`.

```typescript
// Replace lines 1-27 with:
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users2,
  Package,
  ShoppingCart,
  Truck,
  BarChart3,
  Landmark,
  FileCheck,
  Repeat,
  Receipt,
  Monitor,
  CalendarCheck,
  Settings,
  Warehouse,
  FileSpreadsheet,
  RotateCcw,
  Barcode,
  History,
  UserCircle,
  Users,
  Activity,
  FileText,
  Store,
  Briefcase,
  CheckSquare,
  Wallet,
  Video,
  Radio,
  Bot,
  LifeBuoy,
  Shield,
} from "lucide-react";
```

### 4.2 Update `ROUTE_PATHS` (`src/config/routes.ts:29–110`)
**Target**: Add `billing: "/billing"` and map all 37 billing/ERP routes to `/billing/*`. Preserve all 10 CRM paths under `/crm/*`.

```typescript
export const ROUTE_PATHS = {
  // Public & Marketing
  landing: "/",
  auth: "/auth",
  privacyPolicy: "/privacy-policy",
  termsOfService: "/terms-of-service",
  features: "/features",
  pricing: "/pricing",
  gstBillingGuide: "/gst-billing-guide",
  compareVyapar: "/compare-vyapar",
  compareMyBillBook: "/compare-mybillbook",
  compareTally: "/compare-tally",
  barcodeGuide: "/barcode-generator-guide",
  eInvoicingGuide: "/e-invoicing-guide",
  about: "/about",
  contact: "/contact",
  security: "/security",
  faq: "/faq",
  publicStorefront: "/store/:slug",
  publicCatalogue: "/catalogue/:slug",
  publicCatalogueShort: "/c/:slug",

  // POS & Billing Portal Root
  billing: "/billing",

  // POS & Billing ERP Features (mapped under /billing/*)
  dashboard: "/billing/dashboard",
  parties: "/billing/parties",
  customers: "/billing/customers",
  customerLedger: "/billing/customers/:id/ledger",
  suppliers: "/billing/suppliers",

  storefront: "/billing/storefront",
  items: "/billing/items",
  inventory: "/billing/inventory",
  godown: "/billing/godown",
  barcode: "/billing/barcode",

  sales: "/billing/sales",
  salesHistory: "/billing/sales-history",
  checkout: "/billing/checkout",
  pos: "/billing/pos",

  purchases: "/billing/purchases",
  purchaseReturns: "/billing/purchase-returns",
  discovery: "/billing/discovery",
  vendorDiscovery: "/billing/discovery",

  reports: "/billing/reports",
  analytics: "/billing/analytics",

  // Accounting Solutions (mapped under /billing/*)
  cashBank: "/billing/cash-bank",
  eInvoicing: "/billing/e-invoicing",
  ewayBill: "/billing/eway-bill",
  automatedBills: "/billing/automated-bills",
  expenses: "/billing/expenses",

  // Business Tools (mapped under /billing/*)
  staff: "/billing/staff",
  activityLog: "/billing/activity-log",

  // CRM Command Center & Submodules (strictly /crm/*)
  crm: "/crm",
  crmDashboard: "/crm",
  crmAttendance: "/crm/attendance",
  crmSalary: "/crm/salary",
  crmTasks: "/crm/tasks",
  crmMeet: "/crm/meet",
  crmBroadcasts: "/crm/broadcasts",
  crmAiAssistant: "/crm/ai-assistant",
  crmSupport: "/crm/support",
  crmRoles: "/crm/roles",

  // Settings & Help (mapped under /billing/*)
  settings: "/billing/settings",
  businessSettings: "/billing/settings/business",
  invoiceSettings: "/billing/settings/invoice",
  printSettings: "/billing/settings/print",
  settingsReminders: "/billing/settings/reminders",
  settingsCaSharing: "/billing/settings/ca-sharing",
  settingsPricing: "/billing/settings/pricing",
  settingsRefer: "/billing/settings/refer",
  settingsHelp: "/billing/settings/help",
  tallyImport: "/billing/tally-import",
} as const;
```

### 4.3 Update `RESTRICTED_ROUTES_FOR_CASHIER` (`src/config/routes.ts:132–153`)
Ensure legacy path strings are included alongside `ROUTE_PATHS.*` references:

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
  // Legacy paths for robust backwards compatibility
  "/dashboard",
  "/purchases",
  "/discovery",
  "/suppliers",
  "/purchase-returns",
  "/analytics",
  "/reports",
  "/cash-bank",
  "/e-invoicing",
  "/automated-bills",
  "/expenses",
  "/barcode",
  "/settings",
  "/settings/business",
  "/settings/invoice",
  "/settings/print",
  "/staff",
  "/activity-log",
]);
```

### 4.4 Add Path Normalization to `isRouteAllowedForRole` (`src/config/routes.ts:205–305`)
Prepend normalization helper to make role checking work seamlessly for both legacy and `/billing/*` paths:

```typescript
function normalizeRouteForRbac(url: string): string {
  if (!url || typeof url !== "string") return url;
  if (url.startsWith("/billing/") || url === "/billing" || url.startsWith("/crm/") || url === "/crm") {
    return url;
  }
  const legacyPrefixes = [
    "/dashboard",
    "/parties",
    "/customers",
    "/suppliers",
    "/storefront",
    "/items",
    "/inventory",
    "/godown",
    "/barcode",
    "/sales",
    "/sales-history",
    "/checkout",
    "/pos",
    "/purchases",
    "/purchase-returns",
    "/discovery",
    "/reports",
    "/analytics",
    "/cash-bank",
    "/e-invoicing",
    "/eway-bill",
    "/automated-bills",
    "/expenses",
    "/staff",
    "/activity-log",
    "/settings",
    "/tally-import",
  ];
  for (const prefix of legacyPrefixes) {
    if (url === prefix || url.startsWith(`${prefix}/`) || url.startsWith(`${prefix}?`)) {
      return `/billing${url}`;
    }
  }
  return url;
}

export function isRouteAllowedForRole(
  rawUrl: string,
  role: string | null | undefined,
  customPermissions?: Record<string, boolean> | null
): boolean {
  if (!role) return false;
  const url = normalizeRouteForRbac(rawUrl);
  // ... rest of function remains identical
```

### 4.5 Add Dedicated Navigation Suites & Legacy Redirection Mappings (Appended to `src/config/routes.ts`)

```typescript
/**
 * Dedicated POS & Billing navigation groups containing strictly retail, inventory,
 * POS counter, sales, purchases, reports, and store setting modules (Zero CRM clutter).
 */
export const BILLING_NAV_ROUTES: NavRouteGroup[] = [
  {
    label: "GENERAL",
    items: [
      {
        title: "Dashboard",
        url: ROUTE_PATHS.dashboard,
        icon: LayoutDashboard,
        mobilePrimary: true,
        shortcut: "Alt+D",
      },
      {
        title: "POS Billing",
        url: ROUTE_PATHS.checkout,
        icon: Monitor,
        mobilePrimary: true,
        badge: "FAST",
        shortcut: "Alt+K",
      },
      {
        title: "Parties",
        url: ROUTE_PATHS.parties,
        icon: Users2,
        mobilePrimary: true,
        shortcut: "Alt+P",
        children: [
          { title: "All Parties", url: ROUTE_PATHS.parties },
          { title: "Customers", url: ROUTE_PATHS.customers },
          { title: "Suppliers", url: ROUTE_PATHS.suppliers },
          { title: "Import from Tally / Excel", url: ROUTE_PATHS.tallyImport },
        ],
      },
      {
        title: "Catalog",
        url: ROUTE_PATHS.items,
        icon: Package,
        mobilePrimary: true,
        shortcut: "Alt+I",
        children: [
          { title: "All Items", url: ROUTE_PATHS.items },
          { title: "Digital Storefront", url: ROUTE_PATHS.storefront },
          { title: "Stock Summary", url: ROUTE_PATHS.inventory },
          { title: "Godowns", url: ROUTE_PATHS.godown },
          { title: "Barcode Generator", url: ROUTE_PATHS.barcode },
          { title: "Import from Tally / Excel", url: ROUTE_PATHS.tallyImport },
        ],
      },
      {
        title: "Sales Hub",
        url: ROUTE_PATHS.sales,
        icon: ShoppingCart,
        mobilePrimary: true,
        shortcut: "Alt+S",
        children: [
          { title: "Invoices & Estimates", url: ROUTE_PATHS.sales },
          { title: "Sales History", url: ROUTE_PATHS.salesHistory },
          { title: "E-Way Bills", url: ROUTE_PATHS.ewayBill },
          { title: "POS Terminal", url: ROUTE_PATHS.checkout },
        ],
      },
      {
        title: "Purchase Hub",
        url: ROUTE_PATHS.purchases,
        icon: Truck,
        shortcut: "Alt+B",
        children: [
          { title: "Purchase Bills", url: ROUTE_PATHS.purchases },
          { title: "Purchase Returns", url: ROUTE_PATHS.purchaseReturns },
          { title: "Find Vendors", url: ROUTE_PATHS.discovery },
        ],
      },
      {
        title: "Reports & Insights",
        url: ROUTE_PATHS.reports,
        icon: BarChart3,
        shortcut: "Alt+R",
        children: [
          { title: "All Reports (GSTR, P&L)", url: ROUTE_PATHS.reports },
          { title: "Business Analytics", url: ROUTE_PATHS.analytics },
        ],
      },
    ],
  },
  {
    label: "ACCOUNTING SOLUTIONS",
    items: [
      {
        title: "Cash & Bank",
        url: ROUTE_PATHS.cashBank,
        icon: Landmark,
      },
      {
        title: "E-Invoicing",
        url: ROUTE_PATHS.eInvoicing,
        icon: FileCheck,
      },
      {
        title: "E-Way Billing",
        url: ROUTE_PATHS.ewayBill,
        icon: Truck,
        badge: "GST",
      },
      {
        title: "Automated Invoices",
        url: ROUTE_PATHS.automatedBills,
        icon: Repeat,
      },
      {
        title: "Expenses & Petty Cash",
        url: ROUTE_PATHS.expenses,
        icon: Receipt,
      },
    ],
  },
  {
    label: "BUSINESS TOOLS",
    items: [
      {
        title: "Digital Storefront",
        url: ROUTE_PATHS.storefront,
        icon: Store,
        badge: "NEW",
        mobilePrimary: true,
      },
      {
        title: "Staff Permissions",
        url: ROUTE_PATHS.staff,
        icon: Users,
      },
      {
        title: "POS Billing Terminal",
        url: ROUTE_PATHS.pos,
        icon: Monitor,
        shortcut: "F2",
      },
      {
        title: "Activity & Audit Log",
        url: ROUTE_PATHS.activityLog,
        icon: Activity,
      },
    ],
  },
  {
    label: "SETTINGS & APP PREFERENCES",
    items: [
      {
        title: "Business Settings",
        url: ROUTE_PATHS.businessSettings,
        icon: Settings,
      },
      {
        title: "Invoice & Print Settings",
        url: ROUTE_PATHS.invoiceSettings,
        icon: FileText,
      },
      {
        title: "Import Data (Tally & Excel)",
        url: ROUTE_PATHS.tallyImport,
        icon: FileSpreadsheet,
        badge: "NEW",
      },
    ],
  },
];

/**
 * Dedicated CRM navigation groups containing strictly workforce management,
 * biometric attendance, salary/payroll, enterprise tasks, custom roles, and
 * omnichannel communication tools (Zero POS/billing clutter).
 */
export const CRM_NAV_ROUTES: NavRouteGroup[] = [
  {
    label: "WORKFORCE & OPERATIONS",
    items: [
      {
        title: "Command Center",
        url: ROUTE_PATHS.crm,
        icon: LayoutDashboard,
        mobilePrimary: true,
        shortcut: "Alt+C",
      },
      {
        title: "Attendance Tracker",
        url: ROUTE_PATHS.crmAttendance,
        icon: CalendarCheck,
        mobilePrimary: true,
        shortcut: "Alt+A",
      },
      {
        title: "Salary & Payroll",
        url: ROUTE_PATHS.crmSalary,
        icon: Wallet,
        mobilePrimary: true,
        shortcut: "Alt+Y",
      },
      {
        title: "Tasks & Projects",
        url: ROUTE_PATHS.crmTasks,
        icon: CheckSquare,
        mobilePrimary: true,
        shortcut: "Alt+T",
      },
      {
        title: "Role Management",
        url: ROUTE_PATHS.crmRoles,
        icon: Shield,
        shortcut: "Alt+R",
      },
    ],
  },
  {
    label: "COMMUNICATION & TOOLS",
    items: [
      {
        title: "Meetings",
        url: ROUTE_PATHS.crmMeet,
        icon: Video,
        shortcut: "Alt+M",
      },
      {
        title: "Broadcasts",
        url: ROUTE_PATHS.crmBroadcasts,
        icon: Radio,
        shortcut: "Alt+B",
      },
      {
        title: "AI Assistant",
        url: ROUTE_PATHS.crmAiAssistant,
        icon: Bot,
        badge: "AI",
        shortcut: "Alt+X",
      },
      {
        title: "Support Tickets",
        url: ROUTE_PATHS.crmSupport,
        icon: LifeBuoy,
        shortcut: "Alt+H",
      },
    ],
  },
];

export interface LegacyRouteRedirect {
  from: string;
  to: string;
}

/**
 * Complete list of 36 legacy root route paths mapped to their new decoupled destinations.
 */
export const LEGACY_ROUTE_REDIRECTS: readonly LegacyRouteRedirect[] = [
  { from: "/dashboard", to: ROUTE_PATHS.dashboard },
  { from: "/pos", to: ROUTE_PATHS.pos },
  { from: "/checkout", to: ROUTE_PATHS.checkout },
  { from: "/sales", to: ROUTE_PATHS.sales },
  { from: "/sales-history", to: ROUTE_PATHS.salesHistory },
  { from: "/purchases", to: ROUTE_PATHS.purchases },
  { from: "/purchase-returns", to: ROUTE_PATHS.purchaseReturns },
  { from: "/discovery", to: ROUTE_PATHS.discovery },
  { from: "/items", to: ROUTE_PATHS.items },
  { from: "/inventory", to: ROUTE_PATHS.inventory },
  { from: "/godown", to: ROUTE_PATHS.godown },
  { from: "/barcode", to: ROUTE_PATHS.barcode },
  { from: "/parties", to: ROUTE_PATHS.parties },
  { from: "/customers", to: ROUTE_PATHS.customers },
  { from: "/customers/:id/ledger", to: ROUTE_PATHS.customerLedger },
  { from: "/suppliers", to: ROUTE_PATHS.suppliers },
  { from: "/storefront", to: ROUTE_PATHS.storefront },
  { from: "/tally-import", to: ROUTE_PATHS.tallyImport },
  { from: "/reports", to: ROUTE_PATHS.reports },
  { from: "/analytics", to: ROUTE_PATHS.analytics },
  { from: "/cash-bank", to: ROUTE_PATHS.cashBank },
  { from: "/expenses", to: ROUTE_PATHS.expenses },
  { from: "/e-invoicing", to: ROUTE_PATHS.eInvoicing },
  { from: "/eway-bill", to: ROUTE_PATHS.ewayBill },
  { from: "/automated-bills", to: ROUTE_PATHS.automatedBills },
  { from: "/settings", to: ROUTE_PATHS.settings },
  { from: "/settings/business", to: ROUTE_PATHS.businessSettings },
  { from: "/settings/invoice", to: ROUTE_PATHS.invoiceSettings },
  { from: "/settings/print", to: ROUTE_PATHS.printSettings },
  { from: "/settings/reminders", to: ROUTE_PATHS.settings },
  { from: "/settings/ca-sharing", to: ROUTE_PATHS.reports },
  { from: "/settings/pricing", to: ROUTE_PATHS.pricing },
  { from: "/settings/refer", to: ROUTE_PATHS.settings },
  { from: "/settings/help", to: ROUTE_PATHS.faq },
  { from: "/staff", to: ROUTE_PATHS.staff },
  { from: "/activity-log", to: ROUTE_PATHS.activityLog },
] as const;

export type ActiveSuite = "billing" | "crm";
export type PortalSuite = ActiveSuite;
export type SuitePreference = "billing" | "crm" | "both";

export const ACTIVE_SUITE_STORAGE_KEY = "credsmart_active_suite";
export const SUITE_PREFERENCE_STORAGE_KEY = "credsmart_suite_preference";

export const NAV_ROUTES = MAIN_NAV_ROUTES;
```

---

## 5. Verification Method

To verify these edits when Worker M1 applies them:

1. **TypeScript Typecheck**:
   ```bash
   cmd /c npx tsc --noEmit
   ```
   *Expected outcome*: Exit code 0, 0 type errors.

2. **Route and Navigation Regression Suites**:
   ```bash
   cmd /c npx vitest run src/test/crmShellRoutes.test.ts src/test/crmShellNavigation.audit.test.ts src/test/example.test.ts
   ```
   *Expected outcome*: 40/40 tests pass.
   - Verifies `MAIN_NAV_ROUTES === NAV_ROUTES`.
   - Verifies `ComponentsRoutes.MAIN_NAV_ROUTES === ConfigRoutes.MAIN_NAV_ROUTES`.
   - Verifies 9 unique CRM paths under `/crm`.
   - Verifies zero collisions between CRM paths and `ROUTE_PATHS.*`.
   - Verifies cashier restrictions for `ROUTE_PATHS.crm` and `ROUTE_PATHS.crmRoles`.

3. **Submodule Integration Suites**:
   ```bash
   cmd /c npx vitest run src/test/crmSubmodules.test.tsx src/test/crmAttendanceRouteWiringChallenge.test.tsx src/test/crmDashboardResilience.test.tsx
   ```
   *Expected outcome*: 41/41 tests pass.

4. **Invalidation Conditions**:
   - If `MAIN_NAV_ROUTES` is removed or modified, `src/test/crmShellRoutes.test.ts` Suite 4 will fail.
   - If `FEATURE_ROUTE_MAP.crm` has any number of elements other than 9, `crmShellNavigation.audit.test.ts` line 72 will fail.
   - If `ROUTE_PATHS.crm` is changed from `"/crm"`, Suite 2 will fail.
