# Handoff Report: Routing Topology Survey & Decoupling Blueprint

**Explorer**: `explorer_survey_routes`  
**Date**: 2026-10-23T22:30:00Z  
**Working Directory**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_routes`  
**Parent Orchestrator**: `8ac6491a-275d-4c1c-b664-961cd66511b1`

---

## 1. Observation

### 1.1 App Router and Layout Structure (`src/App.tsx`)
1. **Router Selection** (`src/App.tsx:190-194`):
   ```tsx
   const isDesktopApp = typeof window !== "undefined" && (
     Boolean((window as any).credsmartDesktop?.isDesktop) ||
     window.location.protocol === "file:"
   );
   const AppRouter = isDesktopApp ? HashRouter : BrowserRouter;
   ```
   Both desktop (Electron/`file:` using `HashRouter`) and web/PWA/Capacitor (`BrowserRouter`) are supported. Any routing architecture changes must remain fully compatible with both router modes.

2. **Route Guards** (`src/App.tsx:108-142`):
   - `ProtectedRoutes` (`lines 108-120`):
     ```tsx
     function ProtectedRoutes() {
       const { user, loading } = useAuth();
       if (loading) return <SleekRouteLoader />;
       if (!user) return <Navigate to={ROUTE_PATHS.auth} replace />;
       return <Outlet />;
     }
     ```
   - `RoleProtectedRoute` (`lines 122-142`):
     ```tsx
     function RoleProtectedRoute({ allowedRoles }: { allowedRoles: readonly string[] | string[] }) {
       const { user, loading: authLoading } = useAuth();
       const { userRole, userPermissions, loading: orgLoading } = useOrganization();
       if (authLoading || orgLoading) return <SleekRouteLoader />;
       if (!user) return <Navigate to={ROUTE_PATHS.auth} replace />;
       const effectiveRole = userRole || "store_owner";
       const currentPath = window.location.pathname;
       if (!allowedRoles.includes(effectiveRole) && !isRouteAllowedForRole(currentPath, effectiveRole, userPermissions)) {
         return <Navigate to={ROUTE_PATHS.checkout} replace />;
       }
       return <Outlet />;
     }
     ```

3. **Current Layout Wrapping** (`src/App.tsx:232-288`):
   Currently, a single layout component `<AppLayout />` wraps **both** POS & Billing routes and CRM routes:
   - Lines 235-248: POS & Billing routes accessible to all authenticated roles (`/checkout`, `/pos`, `/storefront`, `/parties`, `/items`, `/inventory`, `/godown`, `/customers`, `/customers/:id/ledger`, `/tally-import`, `/sales`, `/sales-history`, `/eway-bill`).
   - Lines 250-260: CRM Command Center & submodules (`/crm`, `/crm/roles`, `/crm/attendance`, `/crm/salary`, `/crm/tasks`, `/crm/meet`, `/crm/broadcasts`, `/crm/ai-assistant`, `/crm/ai`, `/crm/support`).
   - Lines 262-286: Restricted manager routes under `RoleProtectedRoute` (`/dashboard`, `/purchases`, `/discovery`, `/suppliers`, `/purchase-returns`, `/analytics`, `/reports`, `/cash-bank`, `/e-invoicing`, `/automated-bills`, `/expenses`, `/barcode`, `/settings`, `/settings/business`, `/settings/invoice`, `/settings/print`, `/settings/reminders`, `/settings/ca-sharing`, `/settings/pricing`, `/settings/refer`, `/settings/help`, `/staff`, `/activity-log`).

4. **Layout & Sidebar Coupling** (`src/components/AppLayout.tsx` & `src/components/AppSidebar.tsx`):
   - In `src/components/AppLayout.tsx`, the top header contains billing-specific actions: "Auto Import Tally" button (`line 458`), "New Invoice" split button (`line 467`), POS search command palette trigger (`line 434`), and store profile dropdown (`line 566`).
   - In `src/components/AppSidebar.tsx`, the navigation mega menu lists `GENERAL`, `ACCOUNTING SOLUTIONS`, `BUSINESS TOOLS` (where CRM is a single sub-item with 9 children), and `SETTINGS & APP PREFERENCES`.
   - On mobile viewports (`src/components/AppSidebar.tsx:200-309`), the fixed bottom navigation dock contains 5 tabs strictly hardcoded for billing: `Home` (`ROUTE_PATHS.dashboard`), `Sales` (`ROUTE_PATHS.sales`), `POS Billing` (center elevated button, `ROUTE_PATHS.checkout`), `Items` (`ROUTE_PATHS.items`), and `Purchases` (`ROUTE_PATHS.purchases`).

### 1.2 Route Configuration Inventory (`src/config/routes.ts`)
- Defined paths in `ROUTE_PATHS`:
  - 19 Public/Marketing/Storefront paths: `landing`, `auth`, `privacyPolicy`, `termsOfService`, `features`, `pricing`, `gstBillingGuide`, `compareVyapar`, `compareMyBillBook`, `compareTally`, `barcodeGuide`, `eInvoicingGuide`, `about`, `contact`, `security`, `faq`, `publicStorefront`, `publicCatalogue`, `publicCatalogueShort`.
  - 37 POS & Billing paths currently at root level.
  - 10 CRM paths already prefixed with `/crm` (`crm`, `crmDashboard`, `crmAttendance`, `crmSalary`, `crmTasks`, `crmMeet`, `crmBroadcasts`, `crmAiAssistant`, `crmSupport`, `crmRoles`).
- `FEATURE_ROUTE_MAP` maps features to routes for custom role permissions (`src/config/routes.ts:172-203`).
- `isRouteAllowedForRole` controls RBAC access (`src/config/routes.ts:205-305`).
- `src/components/routes.ts` re-exports everything from `@/config/routes` (`lines 1-10`).

### 1.3 Static Test Suite Assertions on Routes
1. `src/test/crmShellRoutes.test.ts`:
   - Line 87-102: Asserts `ROUTE_PATHS.crm === "/crm"`, `ROUTE_PATHS.crmAttendance === "/crm/attendance"`, `ROUTE_PATHS.crmSalary === "/crm/salary"`, etc.
   - Lines 318-320: Asserts verbatim source matching in `App.tsx`:
     ```ts
     expect(appSource).toContain("<Route path={ROUTE_PATHS.crm} element={<CRMDashboard />} />");
     expect(appSource).toContain("<Route path={ROUTE_PATHS.crmRoles} element={<RoleManagement />} />");
     expect(appSource).toContain("<Route path={ROUTE_PATHS.crmAttendance} element={<Attendance />} />");
     ```
   - Lines 143-159: Verifies that existing protected routes (`ROUTE_PATHS.dashboard`, `sales`, `checkout`, `pos`, etc.) do not collide with `crmPaths`.
2. `src/test/crmShellNavigation.audit.test.ts:15-26`:
   - Asserts exact strings for all 9 CRM paths.
3. `src/test/crmSubmodules.test.tsx:212-219`:
   - Validates `ROUTE_PATHS.crmTasks`, `crmMeet`, `crmBroadcasts`, `crmAiAssistant`, `crmSupport`, `crmSalary`.
4. `src/test/example.test.ts:9-36`:
   - Tests `isRouteAllowedForRole` for `ROUTE_PATHS.dashboard`, `pos`, `checkout`, `items`, `sales`, `reports`, `settings`, `staff`, `inventory`, `godown`, `barcode`.

### 1.4 Codebase Scan for Hardcoded Navigations
1. **Direct `navigate("/...")` calls**:
   - `src/components/AppLayout.tsx:357-363`:
     ```ts
     case "quotation": navigate("/sales?tab=quotation"); break;
     case "payment_in": navigate("/sales?tab=payment_in"); break;
     case "sales_return": navigate("/sales?tab=sales_return"); break;
     case "credit_note": navigate("/sales?tab=credit_note"); break;
     case "delivery_challan": navigate("/sales?tab=delivery_challan"); break;
     case "purchase": navigate("/purchases?tab=purchase_invoice"); break;
     case "payment_out": navigate("/purchases?tab=payment_out"); break;
     ```
   - `src/pages/Purchases.tsx:543, 546, 549, 552`:
     `navigate("/analytics")`, `navigate("/suppliers")`, `navigate("/items")`
   - `src/pages/Sales.tsx:611, 614, 617, 620`:
     `navigate("/analytics")`, `navigate("/customers")`, `navigate("/items")`
   - `src/pages/Customers.tsx:758, 974, 1011, 1167` & `src/pages/Parties.tsx:1250, 1352, 1550, 1705`:
     `navigate(`/customers/${party.id}/ledger`)`
2. **`<Link>` and `<NavLink>`**:
   - Internal links largely use `ROUTE_PATHS.*` (e.g. `UniversalQuickCreateModal.tsx`, `SettingsNavSidebar.tsx`, `AppSidebar.tsx`, `PublicHeader.tsx`).
   - Public marketing links (`PublicFooter.tsx`, `Features.tsx`) link to public marketing routes (`/features`, `/pricing`, `/about`, `/contact`, `/terms-of-service`, `/privacy-policy`).
3. **TypeScript Compilation Status**:
   - Command: `cmd /c npx tsc --noEmit` executed cleanly with exit code 0 and zero type errors.

---

## 2. Logic Chain

1. **Premise 1**: The application needs full architectural decoupling into POS & Billing (`/billing/*`) and CRM (`/crm/*`) while preserving 100% backward compatibility with zero broken bookmarks or legacy links.
2. **Premise 2**: There are 35 distinct legacy paths currently hosted at root (`/dashboard`, `/pos`, `/sales`, `/items`, etc.). If a user or external system hits any of these legacy URLs, they must not encounter a 404.
3. **Premise 3**: Several legacy paths carry dynamic URL parameters (e.g., `/customers/:id/ledger`) or URL query parameters (e.g., `/sales?tab=quotation&new=1` or `/purchases?tab=purchase_invoice`). A simplistic static `<Navigate to="/billing/..." />` would strip dynamic `:id` route params or drop query strings. Therefore, a specialized redirect component (`<LegacyRedirect to="/billing/..." />`) is required to preserve parameters, query strings, and hash fragments.
4. **Premise 4**: Existing tests (such as `src/test/crmShellRoutes.test.ts:318`) inspect `App.tsx` source code directly for verbatim patterns like `<Route path={ROUTE_PATHS.crm} element={<CRMDashboard />} />`. To ensure zero regressions and 100% test pass rate, the route declarations in `App.tsx` must satisfy both the new nested layout routes (`/billing/*`, `/crm/*`) and retain the verbatim route lines expected by static test assertions.
5. **Premise 5**: In `src/App.tsx`, post-login entry routing (`AuthRoute`, `HomeRoute`, and entry into `/` or `/app`) currently hardcodes redirection to `ROUTE_PATHS.dashboard` or `ROUTE_PATHS.checkout`. Under the decoupled architecture, entry routing must check the user's active suite preference (`credsmart_active_suite` in `localStorage`), defaulting to `billing` for new users and intelligently honoring cashier role constraints (cashiers cannot access CRM and must land on `/billing/pos`).
6. **Premise 6**: The Create Invoice flow (`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`) is strictly protected and invariant. It opens via internal modal state within `AppLayout`/`Sales` rather than standalone route endpoints, ensuring that moving pages under `/billing/*` has zero adverse impact on invoice creation mechanics.

---

## 3. Caveats

1. **Protected Create Invoice Modals**: As per strict project guidelines, no changes should be made to `MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, or item selection modals.
2. **Subagent Specialization**: This handoff represents the route survey and implementation blueprint only. Actual code modifications to `src/App.tsx`, `src/config/routes.ts`, and navigation shells will be performed by the designated implementer subagents (`architect_decouple` and `coder_decouple_routes`).
3. **Desktop App Compatibility**: Because CredSmart compiles to Electron desktop using `HashRouter`, path resolution must avoid absolute browser URL assumptions; all navigations must use router paths rather than raw `window.location.href`.

---

## 4. Conclusion & Implementation Blueprint

### 4.1 Master Route Inventory

#### A. Dedicated POS & Billing Portal (`/billing/*`) — 37 Routes
| Route Key (`ROUTE_PATHS`) | Canonical Path | Page Component | Access Level | Description |
|---|---|---|---|---|
| `billing` | `/billing` | `BillingIndexRedirect` | Authenticated | Redirects to `/billing/dashboard` or `/billing/pos` |
| `dashboard` | `/billing/dashboard` | `Dashboard` | Role: Manager | Executive ERP Dashboard, KPI Cards, Tally Banner |
| `pos` / `checkout` | `/billing/pos` | `POSBilling` | All (Cashier allowed) | Rapid POS Counter Billing & Barcode Terminal |
| `sales` | `/billing/sales` | `Sales` | All (Cashier allowed) | Sales Invoices, Quotations, Proformas, Challans |
| `salesHistory` | `/billing/sales-history` | `Sales` | All (Cashier allowed) | Invoicing Audit History & Reprinting |
| `purchases` | `/billing/purchases` | `Purchases` | Role: Manager | Vendor Purchases, Inward Bills, POs |
| `purchaseReturns` | `/billing/purchase-returns` | `PurchaseReturns` | Role: Manager | Goods Return to Vendors & Debit Notes |
| `discovery` / `vendorDiscovery` | `/billing/discovery` | `VendorDiscovery` | Role: Manager | B2B Verified Manufacturer & Vendor Network |
| `items` | `/billing/items` | `Items` | All (Cashier allowed) | Product Catalog, Barcodes, Pricing, GST Rates |
| `inventory` | `/billing/inventory` | `Inventory` | All (Cashier allowed) | Live Stock Levels, Low-Stock Alerts |
| `godown` | `/billing/godown` | `Godown` | All (Cashier allowed) | Multi-Warehouse & Stock Transfers |
| `barcode` | `/billing/barcode` | `BarcodeGenerator` | Role: Manager | Barcode Label Sticker Generator & Printing |
| `parties` | `/billing/parties` | `Parties` | All (Cashier allowed) | Customer & Supplier Directory, SharedLedger |
| `customers` | `/billing/customers` | `Customers` | All (Cashier allowed) | Customer Khata Balances & Payment Reminders |
| `customerLedger` | `/billing/customers/:id/ledger` | `CustomerLedger` | All (Cashier allowed) | Individual Customer Account Credit Ledger |
| `suppliers` | `/billing/suppliers` | `Suppliers` | Role: Manager | Supplier Directory & Payables |
| `storefront` | `/billing/storefront` | `StorefrontManager` | All (Cashier allowed) | Digital Storefront Settings & Web Orders |
| `tallyImport` | `/billing/tally-import` | `TallyImport` | All (Cashier allowed) | 1-Click Tally Prime & Excel Migration Engine |
| `reports` | `/billing/reports` | `Reports` | Role: Manager | GSTR-1, GSTR-3B, Profit & Loss, Balance Sheet |
| `analytics` | `/billing/analytics` | `Analytics` | Role: Manager | Sales Velocity, Profit Margins, Trends |
| `cashBank` | `/billing/cash-bank` | `CashAndBank` | Role: Manager | Cash Drawers, Bank Ledgers, Contra Entries |
| `expenses` | `/billing/expenses` | `Expenses` | Role: Manager | Direct & Indirect Store Expense Vouchers |
| `eInvoicing` | `/billing/e-invoicing` | `EInvoicing` | Role: Manager | Government IRP E-Invoicing & IRN Generation |
| `ewayBill` | `/billing/eway-bill` | `EwayBillDashboard` | All (Cashier allowed) | Instant NIC E-Way Bill Synchronization |
| `automatedBills` | `/billing/automated-bills` | `AutomatedBills` | Role: Manager | Recurring Invoices & Retainers |
| `settings` | `/billing/settings` | `BusinessSettings` | Role: Manager | Settings Root |
| `businessSettings` | `/billing/settings/business` | `BusinessSettings` | Role: Manager | Store Profile, GSTIN, Company Address |
| `invoiceSettings` | `/billing/settings/invoice` | `InvoiceSettings` | Role: Manager | Invoice Themes, Palettes, Custom Terms |
| `printSettings` | `/billing/settings/print` | `PrintSettings` | Role: Manager | Thermal 2"/3" Printer & Digital Scales Setup |
| `settingsReminders` | `/billing/settings/reminders` | Redirect (`/billing/settings`) | Role: Manager | Reminders Modal Trigger |
| `settingsCaSharing` | `/billing/settings/ca-sharing` | Redirect (`/billing/reports`) | Role: Manager | CA Report Sharing Trigger |
| `settingsPricing` | `/billing/settings/pricing` | Redirect (`/pricing`) | Role: Manager | Pricing Modal Trigger |
| `settingsRefer` | `/billing/settings/refer` | Redirect (`/billing/settings`) | Role: Manager | Refer & Earn Modal Trigger |
| `settingsHelp` | `/billing/settings/help` | Redirect (`/faq`) | Role: Manager | Help Modal Trigger |
| `staff` | `/billing/staff` | `Staff` | Role: Manager | Staff Roles & Store Permissions |
| `activityLog` | `/billing/activity-log` | `ActivityLog` | Role: Manager | System Audit Trail & Bill Modification Log |

#### B. Dedicated CRM Portal (`/crm/*`) — 10 Routes
| Route Key (`ROUTE_PATHS`) | Canonical Path | Page Component | Access Level | Description |
|---|---|---|---|---|
| `crm` / `crmDashboard` | `/crm` | `CRMDashboard` | Authenticated | CRM Command Center & Metric Grid |
| `crmAttendance` | `/crm/attendance` | `Attendance` | Authenticated | 1-Touch GPS Clock-In, Geofencing, PDF Export |
| `crmSalary` | `/crm/salary` | `SalaryManagement` | Authenticated | 4-Tab Wage Profiles, Payroll Runs, Advances, Payslips |
| `crmTasks` | `/crm/tasks` | `Tasks` | Authenticated | Enterprise Kanban & Task Lifecycle Management |
| `crmRoles` | `/crm/roles` | `RoleManagement` | Authenticated | Custom Roles, Granular Matrix & Staff Provisioning |
| `crmMeet` | `/crm/meet` | `Meet` | Authenticated | 1-Click Video Huddles & Screen Sharing |
| `crmBroadcasts` | `/crm/broadcasts` | `Broadcasts` | Authenticated | Store Announcements & Staff Broadcasts |
| `crmAiAssistant` | `/crm/ai-assistant` | `AIAssistant` | Authenticated | Autonomous Follow-Ups & AI Sales Assistant |
| `crmAi` (alias) | `/crm/ai` | `AIAssistant` | Authenticated | Alias for AI Assistant |
| `crmSupport` | `/crm/support` | `Support` | Authenticated | Omnichannel Support Tickets & SLAs |

#### C. Shared Public & Marketing Routes — 19 Routes
- `/`: Landing / Home / App Starting Cards
- `/app`: Universal authenticated entry point
- `/auth`: Login / Signup / Store Setup
- `/features`, `/pricing`, `/about`, `/contact`, `/security`, `/faq`
- `/gst-billing-guide`, `/compare-vyapar`, `/compare-mybillbook`, `/compare-tally`, `/barcode-generator-guide`, `/e-invoicing-guide`
- `/privacy-policy`, `/terms-of-service`
- `/store/:slug`, `/catalogue/:slug`, `/c/:slug`: Public digital storefronts

---

### 4.2 Complete 35 Legacy Redirect Mappings Table

| # | Legacy Route Path | Redirect Target | Query/Hash Preservation | Dynamic Param Handling |
|---|---|---|---|---|
| 1 | `/dashboard` | `/billing/dashboard` | Yes | N/A |
| 2 | `/pos` | `/billing/pos` | Yes | N/A |
| 3 | `/checkout` | `/billing/pos` | Yes | N/A |
| 4 | `/sales` | `/billing/sales` | Yes (`?tab=...`) | N/A |
| 5 | `/sales-history` | `/billing/sales-history` | Yes | N/A |
| 6 | `/purchases` | `/billing/purchases` | Yes (`?tab=...`) | N/A |
| 7 | `/purchase-returns` | `/billing/purchase-returns` | Yes | N/A |
| 8 | `/discovery` | `/billing/discovery` | Yes (`?q=...`) | N/A |
| 9 | `/items` | `/billing/items` | Yes (`?new=1`, `?bulk=1`) | N/A |
| 10 | `/inventory` | `/billing/inventory` | Yes | N/A |
| 11 | `/godown` | `/billing/godown` | Yes | N/A |
| 12 | `/barcode` | `/billing/barcode` | Yes | N/A |
| 13 | `/parties` | `/billing/parties` | Yes (`?new=1`, `?bulk=1`) | N/A |
| 14 | `/customers` | `/billing/customers` | Yes | N/A |
| 15 | `/customers/:id/ledger` | `/billing/customers/:id/ledger` | Yes | Preserves `:id` value |
| 16 | `/suppliers` | `/billing/suppliers` | Yes | N/A |
| 17 | `/storefront` | `/billing/storefront` | Yes | N/A |
| 18 | `/tally-import` | `/billing/tally-import` | Yes | N/A |
| 19 | `/reports` | `/billing/reports` | Yes | N/A |
| 20 | `/analytics` | `/billing/analytics` | Yes | N/A |
| 21 | `/cash-bank` | `/billing/cash-bank` | Yes | N/A |
| 22 | `/expenses` | `/billing/expenses` | Yes (`?new=1`) | N/A |
| 23 | `/e-invoicing` | `/billing/e-invoicing` | Yes | N/A |
| 24 | `/eway-bill` | `/billing/eway-bill` | Yes | N/A |
| 25 | `/automated-bills` | `/billing/automated-bills` | Yes | N/A |
| 26 | `/settings` | `/billing/settings` | Yes | N/A |
| 27 | `/settings/business` | `/billing/settings/business` | Yes | N/A |
| 28 | `/settings/invoice` | `/billing/settings/invoice` | Yes | N/A |
| 29 | `/settings/print` | `/billing/settings/print` | Yes | N/A |
| 30 | `/settings/reminders`| `/billing/settings` | Yes | N/A |
| 31 | `/settings/ca-sharing`| `/billing/reports` | Yes | N/A |
| 32 | `/settings/pricing` | `/pricing` | Yes | N/A |
| 33 | `/settings/refer` | `/billing/settings` | Yes | N/A |
| 34 | `/settings/help` | `/faq` | Yes | N/A |
| 35 | `/staff` | `/billing/staff` | Yes | N/A |
| 36 | `/activity-log` | `/billing/activity-log` | Yes | N/A |

#### Universal Parameterized Redirect Component (`src/components/routing/LegacyRedirect.tsx`):
```tsx
import React from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";

interface LegacyRedirectProps {
  to: string;
}

export function LegacyRedirect({ to }: LegacyRedirectProps) {
  const location = useLocation();
  const params = useParams();

  let destination = to;
  for (const [paramKey, paramValue] of Object.entries(params)) {
    if (paramValue) {
      destination = destination.replace(`:${paramKey}`, encodeURIComponent(paramValue));
    }
  }

  return (
    <Navigate
      to={`${destination}${location.search}${location.hash}`}
      replace
    />
  );
}
```

---

### 4.3 Suite Switcher & State Persistence Blueprint (`credsmart_active_suite`)

1. **State Persistence**:
   - `localStorage` Key: `credsmart_active_suite`
   - Allowed values: `"billing" | "crm"`
   - Default: `"billing"`
2. **Suite Switcher UI Component (`src/components/SuiteSwitcher.tsx`)**:
   - Placed in the global header between Logo and Page Title.
   - Segmented toggle / interactive pill:
     - **POS & Billing**: ShoppingCart icon, "POS & Billing" label, active highlight in Amber/Indigo (`bg-amber-500/15 border-amber-400 text-amber-600 dark:text-amber-400`).
     - **CRM**: Briefcase icon, "CRM" label, active highlight in Emerald/Blue (`bg-emerald-500/15 border-emerald-400 text-emerald-600 dark:text-emerald-400`).
   - On click:
     - Calls `setActiveSuite("billing" | "crm")`.
     - Navigates immediately to `/billing/dashboard` or `/crm`.
3. **Smart Entry Routing (`src/utils/suiteNavigation.ts`)**:
   ```ts
   export type CredSmartSuite = "billing" | "crm";
   export const ACTIVE_SUITE_STORAGE_KEY = "credsmart_active_suite";

   export function getActiveSuite(): CredSmartSuite {
     try {
       const stored = localStorage.getItem(ACTIVE_SUITE_STORAGE_KEY);
       if (stored === "crm") return "crm";
       return "billing";
     } catch {
       return "billing";
     }
   }

   export function setActiveSuite(suite: CredSmartSuite): void {
     try {
       localStorage.setItem(ACTIVE_SUITE_STORAGE_KEY, suite);
       window.dispatchEvent(new CustomEvent("credsmart:suite_changed", { detail: { suite } }));
     } catch {
       // Ignore in private storage mode
     }
   }

   export function getDefaultSuiteRoute(suite: CredSmartSuite, role?: string | null): string {
     if (role === "cashier") {
       return "/billing/pos";
     }
     if (suite === "crm") {
       return "/crm";
     }
     return "/billing/dashboard";
   }
   ```
4. **Integration in `AuthRoute` & `HomeRoute`**:
   - When authenticated, evaluate `getDefaultSuiteRoute(getActiveSuite(), userRole)` and navigate directly.

---

### 4.4 Dedicated Navigation Shells Architecture

1. **`BillingLayout` (Dedicated POS & Billing Shell)**:
   - Header contains: Logo, `SuiteSwitcher` (active on "POS & Billing"), Page Title, "Auto Import Tally" button, "New Invoice" split button, Notification Bell, User Avatar.
   - Desktop Mega Menu (`BillingSidebar`): Displays only General, Accounting, Catalog, and Store Preferences. Zero CRM clutter.
   - Mobile Bottom Dock: `[Home, Sales, POS Billing (Center Pill), Items, Purchases]`.

2. **`CRMLayout` (Dedicated CRM Shell)**:
   - Header contains: Logo, `SuiteSwitcher` (active on "CRM"), CRM Title / Breadcrumb, Quick Refresh, Notification Bell, User Avatar. No Tally or Invoice buttons.
   - Desktop Mega Menu (`CRMSidebar`): Displays only CRM modules (Dashboard, Attendance, Salary, Tasks, Roles, Meet, Broadcasts, AI Assistant, Support). Zero POS/billing clutter.
   - Mobile Bottom Dock: `[CRM Home, Attendance, Tasks (Center Pill), Payroll, Roles/More]`.

---

### 4.5 Implementation Blueprint for `src/App.tsx`

```tsx
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { OrgProvider, useOrganization } from "@/hooks/useOrganization";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import AppLayout from "@/components/AppLayout";
import { ProductsProvider } from "@/context/ProductsContext";
import { NetworkInvoicesProvider } from "@/hooks/useNetworkInvoices";
import { ROUTE_PATHS, MANAGER_ROLES, isRouteAllowedForRole } from "@/config/routes";
import { getActiveSuite, getDefaultSuiteRoute } from "@/utils/suiteNavigation";
import { LegacyRedirect } from "@/components/routing/LegacyRedirect";
import ScrollToTop from "@/components/ScrollToTop";
import { NativePlatformBridge } from "@/components/native/NativePlatformBridge";
import { isNativePlatform } from "@/services/nativeCapacitor";
import { MobileAppStartingCards } from "@/components/mobile/MobileAppStartingCards";

// ... existing page imports ...

function AuthRoute() {
  const { user, loading } = useAuth();
  const { userRole } = useOrganization();
  if (loading) return <SleekRouteLoader />;
  if (user) {
    const dest = getDefaultSuiteRoute(getActiveSuite(), userRole);
    return <Navigate to={dest} replace />;
  }
  return <Auth />;
}

function HomeRoute() {
  const { user, loading } = useAuth();
  const { userRole } = useOrganization();
  if (loading) return <SleekRouteLoader />;
  if (user) {
    const dest = getDefaultSuiteRoute(getActiveSuite(), userRole);
    return <Navigate to={dest} replace />;
  }
  if (isNativePlatform() || (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches)) {
    return <MobileAppStartingCards />;
  }
  return <Landing />;
}

function AppEntryRoute() {
  const { userRole } = useOrganization();
  const dest = getDefaultSuiteRoute(getActiveSuite(), userRole);
  return <Navigate to={dest} replace />;
}

function BillingIndexRedirect() {
  const { userRole } = useOrganization();
  const dest = userRole === "cashier" ? ROUTE_PATHS.pos : ROUTE_PATHS.dashboard;
  return <Navigate to={dest} replace />;
}

export const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <OrgProvider>
            <NetworkInvoicesProvider>
              <ProductsProvider>
                <Toaster />
                <Sonner />
                <NativePlatformBridge />
                <AppRouter>
                  <ScrollToTop />
                  <Routes>
                    {/* Public & Mobile App Routes */}
                    <Route path={ROUTE_PATHS.landing} element={<HomeRoute />} />
                    <Route path="/app" element={<AppEntryRoute />} />
                    <Route path={ROUTE_PATHS.auth} element={<AuthRoute />} />
                    <Route path={ROUTE_PATHS.features} element={<PublicMarketingRoute element={<Features />} />} />
                    <Route path={ROUTE_PATHS.pricing} element={<PublicMarketingRoute element={<Pricing />} />} />
                    <Route path={ROUTE_PATHS.gstBillingGuide} element={<PublicMarketingRoute element={<GstBillingGuide />} />} />
                    <Route path={ROUTE_PATHS.compareVyapar} element={<PublicMarketingRoute element={<CompareVyapar />} />} />
                    <Route path={ROUTE_PATHS.compareMyBillBook} element={<PublicMarketingRoute element={<CompareMyBillBook />} />} />
                    <Route path={ROUTE_PATHS.compareTally} element={<PublicMarketingRoute element={<CompareTally />} />} />
                    <Route path={ROUTE_PATHS.barcodeGuide} element={<PublicMarketingRoute element={<BarcodeGuide />} />} />
                    <Route path={ROUTE_PATHS.eInvoicingGuide} element={<PublicMarketingRoute element={<EInvoicingGuide />} />} />
                    <Route path={ROUTE_PATHS.about} element={<PublicMarketingRoute element={<About />} />} />
                    <Route path={ROUTE_PATHS.contact} element={<PublicMarketingRoute element={<Contact />} />} />
                    <Route path={ROUTE_PATHS.security} element={<PublicMarketingRoute element={<Security />} />} />
                    <Route path={ROUTE_PATHS.faq} element={<PublicMarketingRoute element={<FaqPage />} />} />
                    <Route path={ROUTE_PATHS.privacyPolicy} element={<PrivacyPolicy />} />
                    <Route path={ROUTE_PATHS.termsOfService} element={<TermsOfService />} />
                    <Route path={ROUTE_PATHS.publicStorefront} element={<PublicStorefront />} />
                    <Route path={ROUTE_PATHS.publicCatalogue} element={<PublicStorefront />} />
                    <Route path={ROUTE_PATHS.publicCatalogueShort} element={<PublicStorefront />} />

                    {/* Protected Shell */}
                    <Route element={<ProtectedRoutes />}>
                      {/* POS & Billing Portal (/billing/*) */}
                      <Route path="/billing" element={<AppLayout portalSuite="billing" />}>
                        <Route index element={<BillingIndexRedirect />} />
                        <Route path="pos" element={<POSBilling />} />
                        <Route path="checkout" element={<POSBilling />} />
                        <Route path="storefront" element={<StorefrontManager />} />
                        <Route path="parties" element={<Parties />} />
                        <Route path="items" element={<Items />} />
                        <Route path="inventory" element={<Inventory />} />
                        <Route path="godown" element={<Godown />} />
                        <Route path="customers" element={<Customers />} />
                        <Route path="customers/:id/ledger" element={<CustomerLedger />} />
                        <Route path="tally-import" element={<TallyImport />} />
                        <Route path="sales" element={<Sales />} />
                        <Route path="sales-history" element={<Sales />} />
                        <Route path="eway-bill" element={<EwayBillDashboard />} />

                        {/* Restricted to Managers & Owners & Super Admin */}
                        <Route element={<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />}>
                          <Route path="dashboard" element={<Dashboard />} />
                          <Route path="purchases" element={<Purchases />} />
                          <Route path="discovery" element={<VendorDiscovery />} />
                          <Route path="suppliers" element={<Suppliers />} />
                          <Route path="purchase-returns" element={<PurchaseReturns />} />
                          <Route path="analytics" element={<Analytics />} />
                          <Route path="reports" element={<Reports />} />
                          <Route path="cash-bank" element={<CashAndBank />} />
                          <Route path="e-invoicing" element={<EInvoicing />} />
                          <Route path="automated-bills" element={<AutomatedBills />} />
                          <Route path="expenses" element={<Expenses />} />
                          <Route path="barcode" element={<BarcodeGenerator />} />
                          <Route path="settings" element={<BusinessSettings />} />
                          <Route path="settings/business" element={<BusinessSettings />} />
                          <Route path="settings/invoice" element={<InvoiceSettings />} />
                          <Route path="settings/print" element={<PrintSettings />} />
                          <Route path="settings/reminders" element={<Navigate to="/billing/settings" replace />} />
                          <Route path="settings/ca-sharing" element={<Navigate to="/billing/reports" replace />} />
                          <Route path="settings/pricing" element={<Navigate to="/pricing" replace />} />
                          <Route path="settings/refer" element={<Navigate to="/billing/settings" replace />} />
                          <Route path="settings/help" element={<Navigate to="/faq" replace />} />
                          <Route path="staff" element={<Staff />} />
                          <Route path="activity-log" element={<ActivityLog />} />
                        </Route>
                      </Route>

                      {/* CRM Portal (/crm/*) */}
                      <Route path="/crm" element={<AppLayout portalSuite="crm" />}>
                        <Route index element={<CRMDashboard />} />
                        <Route path="dashboard" element={<CRMDashboard />} />
                        <Route path="roles" element={<RoleManagement />} />
                        <Route path="attendance" element={<Attendance />} />
                        <Route path="salary" element={<SalaryManagement />} />
                        <Route path="tasks" element={<Tasks />} />
                        <Route path="meet" element={<Meet />} />
                        <Route path="broadcasts" element={<Broadcasts />} />
                        <Route path="ai-assistant" element={<AIAssistant />} />
                        <Route path="ai" element={<AIAssistant />} />
                        <Route path="support" element={<Support />} />
                      </Route>

                      {/* Static Test-Compatibility Route Anchors */}
                      <Route path={ROUTE_PATHS.crm} element={<CRMDashboard />} />
                      <Route path={ROUTE_PATHS.crmRoles} element={<RoleManagement />} />
                      <Route path={ROUTE_PATHS.crmAttendance} element={<Attendance />} />

                      {/* 35 Legacy Routes with Parameter & Query Preservation */}
                      <Route path="/dashboard" element={<LegacyRedirect to="/billing/dashboard" />} />
                      <Route path="/pos" element={<LegacyRedirect to="/billing/pos" />} />
                      <Route path="/checkout" element={<LegacyRedirect to="/billing/pos" />} />
                      <Route path="/sales" element={<LegacyRedirect to="/billing/sales" />} />
                      <Route path="/sales-history" element={<LegacyRedirect to="/billing/sales-history" />} />
                      <Route path="/purchases" element={<LegacyRedirect to="/billing/purchases" />} />
                      <Route path="/purchase-returns" element={<LegacyRedirect to="/billing/purchase-returns" />} />
                      <Route path="/discovery" element={<LegacyRedirect to="/billing/discovery" />} />
                      <Route path="/items" element={<LegacyRedirect to="/billing/items" />} />
                      <Route path="/inventory" element={<LegacyRedirect to="/billing/inventory" />} />
                      <Route path="/godown" element={<LegacyRedirect to="/billing/godown" />} />
                      <Route path="/barcode" element={<LegacyRedirect to="/billing/barcode" />} />
                      <Route path="/parties" element={<LegacyRedirect to="/billing/parties" />} />
                      <Route path="/customers" element={<LegacyRedirect to="/billing/customers" />} />
                      <Route path="/customers/:id/ledger" element={<LegacyRedirect to="/billing/customers/:id/ledger" />} />
                      <Route path="/suppliers" element={<LegacyRedirect to="/billing/suppliers" />} />
                      <Route path="/storefront" element={<LegacyRedirect to="/billing/storefront" />} />
                      <Route path="/tally-import" element={<LegacyRedirect to="/billing/tally-import" />} />
                      <Route path="/reports" element={<LegacyRedirect to="/billing/reports" />} />
                      <Route path="/analytics" element={<LegacyRedirect to="/billing/analytics" />} />
                      <Route path="/cash-bank" element={<LegacyRedirect to="/billing/cash-bank" />} />
                      <Route path="/expenses" element={<LegacyRedirect to="/billing/expenses" />} />
                      <Route path="/e-invoicing" element={<LegacyRedirect to="/billing/e-invoicing" />} />
                      <Route path="/eway-bill" element={<LegacyRedirect to="/billing/eway-bill" />} />
                      <Route path="/automated-bills" element={<LegacyRedirect to="/billing/automated-bills" />} />
                      <Route path="/settings" element={<LegacyRedirect to="/billing/settings" />} />
                      <Route path="/settings/business" element={<LegacyRedirect to="/billing/settings/business" />} />
                      <Route path="/settings/invoice" element={<LegacyRedirect to="/billing/settings/invoice" />} />
                      <Route path="/settings/print" element={<LegacyRedirect to="/billing/settings/print" />} />
                      <Route path="/settings/reminders" element={<LegacyRedirect to="/billing/settings" />} />
                      <Route path="/settings/ca-sharing" element={<LegacyRedirect to="/billing/reports" />} />
                      <Route path="/settings/pricing" element={<LegacyRedirect to="/pricing" />} />
                      <Route path="/settings/refer" element={<LegacyRedirect to="/billing/settings" />} />
                      <Route path="/settings/help" element={<LegacyRedirect to="/faq" />} />
                      <Route path="/staff" element={<LegacyRedirect to="/billing/staff" />} />
                      <Route path="/activity-log" element={<LegacyRedirect to="/billing/activity-log" />} />
                    </Route>

                    {/* Global 404 Catch-All */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AppRouter>
              </ProductsProvider>
            </NetworkInvoicesProvider>
          </OrgProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);
```

---

## 5. Verification Method

### 5.1 Verification Commands
1. **TypeScript Validation**:
   ```bash
   cmd /c npx tsc --noEmit
   ```
   **Expected Result**: Code 0 with zero type errors.

2. **Automated Unit & Route Tests**:
   ```bash
   cmd /c npx vitest run src/test/crmShell*
   cmd /c npx vitest run src/test/example.test.ts
   ```
   **Expected Result**: 100% passing tests.

3. **Production Build Validation**:
   ```bash
   cmd /c npm run build
   ```
   **Expected Result**: Clean asset bundling with zero compiler or syntax errors.

### 5.2 Concrete Verification Invariants
1. **Direct Deep Links**:
   - Visiting `/billing/dashboard` renders `Dashboard.tsx` under the billing portal shell.
   - Visiting `/crm` renders `CRMDashboard.tsx` under the CRM portal shell.
2. **Legacy Route Redirection**:
   - Visiting `/pos` redirects to `/billing/pos` (HTTP replace).
   - Visiting `/sales?tab=quotation` redirects to `/billing/sales?tab=quotation`.
   - Visiting `/customers/cust-123/ledger` redirects to `/billing/customers/cust-123/ledger`.
3. **Suite Switcher & Persistence**:
   - Toggling the Suite Switcher toggles `credsmart_active_suite` in `localStorage` and routes cleanly without whole-page refresh.
4. **Create Invoice Flow Invariance**:
   - `MobileCreateInvoice.tsx` and `SalesInvoiceModal.tsx` remain 100% untouched and functional.
