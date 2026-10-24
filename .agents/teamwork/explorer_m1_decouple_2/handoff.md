# Handoff Report: App.tsx Route Tree & Universal Legacy Redirection Engine

**Explorer**: `explorer_m1_decouple_2`  
**Date**: 2026-10-23T22:30:00Z  
**Working Directory**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_decouple_2`  
**Target File**: `src/App.tsx` (and `src/components/routing/LegacyRedirect.tsx`)  
**Parent Orchestrator**: `8ac6491a-275d-4c1c-b664-961cd66511b1`  

---

## 1. Observation

### 1.1 Current Architecture of `src/App.tsx`
1. **Router Selection** (`src/App.tsx:190-194`):
   ```tsx
   const isDesktopApp = typeof window !== "undefined" && (
     Boolean((window as any).credsmartDesktop?.isDesktop) ||
     window.location.protocol === "file:"
   );
   const AppRouter = isDesktopApp ? HashRouter : BrowserRouter;
   ```
   Both web/PWA/Capacitor (`BrowserRouter`) and Electron/desktop (`HashRouter`) run through `AppRouter`. All route paths, redirects, and navigation utilities must be compatible with both router modes.

2. **Route Protection Guards** (`src/App.tsx:108-142`):
   - `ProtectedRoutes`:
     ```tsx
     function ProtectedRoutes() {
       const { user, loading } = useAuth();
       if (loading) return <SleekRouteLoader />;
       if (!user) return <Navigate to={ROUTE_PATHS.auth} replace />;
       return <Outlet />;
     }
     ```
   - `RoleProtectedRoute`:
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

3. **Existing Route Grouping** (`src/App.tsx:231-288`):
   - All authenticated routes currently sit inside a single pathless `<Route element={<ProtectedRoutes />}>` wrapped in `<Route element={<AppLayout />}>`.
   - General cashier-accessible routes (`/checkout`, `/pos`, `/storefront`, `/parties`, `/items`, `/inventory`, `/godown`, `/customers`, `/customers/:id/ledger`, `/tally-import`, `/sales`, `/sales-history`, `/eway-bill`) are at lines 235-247.
   - CRM routes (`/crm`, `/crm/roles`, `/crm/attendance`, `/crm/salary`, `/crm/tasks`, `/crm/meet`, `/crm/broadcasts`, `/crm/ai-assistant`, `/crm/ai`, `/crm/support`) are at lines 250-260.
   - Manager-restricted routes under `<Route element={<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />}>` (`/dashboard`, `/purchases`, `/discovery`, `/suppliers`, `/purchase-returns`, `/analytics`, `/reports`, `/cash-bank`, `/e-invoicing`, `/automated-bills`, `/expenses`, `/barcode`, `/settings`, `/settings/business`, `/settings/invoice`, `/settings/print`, `/settings/reminders`, `/settings/ca-sharing`, `/settings/pricing`, `/settings/refer`, `/settings/help`, `/staff`, `/activity-log`) are at lines 262-286.

### 1.2 Strict Static AST & Regex Constraints from Existing Tests
1. **`src/test/crmShellRoutes.test.ts:298-321`**:
   - Must match exact function declaration:
     ```ts
     expect(appSource).toMatch(/function\s+ProtectedRoutes\(\)/);
     ```
   - Must match exact redirect logic in `ProtectedRoutes`:
     ```ts
     expect(appSource).toMatch(
       /if\s*\(!user\)\s*\{\s*return\s*<Navigate\s+to=\{ROUTE_PATHS\.auth\}\s+replace\s*\/>;\s*\}/
     );
     ```
   - Must match exact function declaration:
     ```ts
     expect(appSource).toMatch(/function\s+RoleProtectedRoute/);
     ```
   - Must match exact redirect logic in `RoleProtectedRoute`:
     ```ts
     expect(appSource).toMatch(
       /if\s*\(!user\)\s*\{\s*return\s*<Navigate\s+to=\{ROUTE_PATHS\.auth\}\s+replace\s*\/>;\s*\}/
     );
     ```
   - Must contain verbatim route declarations:
     ```ts
     expect(appSource).toContain("<Route path={ROUTE_PATHS.crm} element={<CRMDashboard />} />");
     expect(appSource).toContain("<Route path={ROUTE_PATHS.crmRoles} element={<RoleManagement />} />");
     expect(appSource).toContain("<Route path={ROUTE_PATHS.crmAttendance} element={<Attendance />} />");
     ```

2. **`src/test/crmAttendanceRouteWiringChallenge.test.tsx:163-203`**:
   - Must match import statement:
     ```ts
     expect(appSource).toMatch(
       /import\s+Attendance\s+from\s+["']@\/pages\/crm\/Attendance["'];?/
     );
     ```
   - Must contain verbatim route line:
     ```ts
     expect(appSource).toContain(
       "<Route path={ROUTE_PATHS.crmAttendance} element={<Attendance />} />"
     );
     ```
   - **Crucial Order Invariant (`crmAttendanceRouteWiringChallenge.test.tsx:180-192`)**:
     ```ts
     const protectedIndex = appSource.indexOf("<Route element={<ProtectedRoutes />}>");
     const crmAttendanceIndex = appSource.indexOf(
       "<Route path={ROUTE_PATHS.crmAttendance} element={<Attendance />} />"
     );
     const managerIndex = appSource.indexOf(
       "<Route element={<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />}>"
     );

     expect(protectedIndex).toBeGreaterThan(-1);
     expect(crmAttendanceIndex).toBeGreaterThan(protectedIndex);
     // Ensure crmAttendance is NOT locked into manager-only routes
     expect(crmAttendanceIndex).toBeLessThan(managerIndex);
     ```
     **Direct Impact**: The declaration `<Route path={ROUTE_PATHS.crmAttendance} element={<Attendance />} />` MUST appear AFTER `<Route element={<ProtectedRoutes />}>` and strictly BEFORE `<Route element={<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />}>` in the text of `src/App.tsx`.

3. **Current Baseline Test Status**:
   - Vitest test suite (`src/test/crmShellRoutes.test.ts` & `src/test/crmAttendanceRouteWiringChallenge.test.tsx`): 32/32 tests pass.
   - `npx tsc --noEmit`: 0 errors.

---

## 2. Logic Chain

1. **Premise 1**: All business ERP routes previously located at root (`/dashboard`, `/pos`, `/sales`, `/items`, `/purchases`, etc.) are being decoupled into the POS & Billing portal under `/billing/*`.
2. **Premise 2**: Users, bookmarks, notifications, internal links, or external integrations hitting any of the 35+ legacy routes must be seamlessly redirected to their new `/billing/*` destinations.
3. **Premise 3**: Redirection cannot simply be a static string replacement because:
   - Dynamic parameters exist (specifically `customerLedger`: `/customers/:id/ledger` → `/billing/customers/:id/ledger`).
   - Query parameters exist throughout the app (e.g. `navigate("/sales?tab=quotation")`, `navigate("/purchases?tab=purchase_invoice")`, `?new=1`, `?page=2`).
   - Hash fragments exist (e.g. `#details`).
   - Static `<Navigate to="/billing/sales" />` would discard query strings and fail on `:id` path tokens.
4. **Premise 4**: A universal component `<LegacyRedirect to={targetPath} />` that consumes `useParams()`, `useLocation().search`, and `useLocation().hash`, substitutes all `:param` tokens with URI-encoded values, and appends the search string and hash cleanly, ensures 100% preservation of all navigation state across all legacy URLs.
5. **Premise 5**: Because all legacy routes were protected ERP routes, mounting the 36 legacy redirect `<Route>` entries inside `<Route element={<ProtectedRoutes />}>` ensures that unauthenticated visitors are redirected to `/auth` before any redirection executes, maintaining identical access control semantics.
6. **Premise 6**: To satisfy the strict index order requirement in `crmAttendanceRouteWiringChallenge.test.tsx` (`crmAttendanceIndex < managerIndex`), CRM routes must be declared in `src/App.tsx` before `<Route element={<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />}>`.
7. **Premise 7**: When root `/billing` or `/billing/` is hit, a specialized `BillingIndexRedirect` redirects cashiers to `/billing/pos` and managers/owners to `/billing/dashboard`.
8. **Premise 8**: The 5 protected invoice files (`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`) operate as in-memory modals and contain zero direct route definitions; they remain 100% untouched and functional.

---

## 3. Caveats

1. **Strict Exclusion of Protected Files**: No edits should be made to `MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, or item selection modals.
2. **HashRouter / Desktop App Compatibility**: In `RoleProtectedRoute`, using `useLocation().pathname || window.location.pathname` avoids issues where `window.location.pathname` in Electron points to the root HTML bundle file while the routed path resides in `hash`.
3. **Milestone Division**:
   - `src/config/routes.ts` updates (`ROUTE_PATHS`, `BILLING_NAV_ROUTES`, `CRM_NAV_ROUTES`) are designed by `explorer_m1_decouple_1`.
   - `src/App.tsx` and `LegacyRedirect.tsx` are designed here (`explorer_m1_decouple_2`).
   - Worker M1 will execute the unified changes cleanly.

---

## 4. Conclusion & Implementation Blueprint

### 4.1 The Universal `<LegacyRedirect />` Component

Create `src/components/routing/LegacyRedirect.tsx`:

```tsx
import React from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";

export interface LegacyRedirectProps {
  to: string;
}

/**
 * Universal LegacyRedirect component that forwards legacy route accesses
 * to their new destination while preserving all dynamic path parameters (:id, :slug, etc.),
 * URL query parameters (?tab=..., ?page=...), and hash fragments (#section).
 * Uses HTTP replace to prevent cluttering the browser history stack.
 */
export function LegacyRedirect({ to }: LegacyRedirectProps) {
  const location = useLocation();
  const params = useParams();

  let destination = to;

  // Substitute all dynamic path parameters (:paramName and wildcard *)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      if (key === "*") {
        destination = destination.replace("/*", `/${value}`).replace("*", value);
      } else {
        destination = destination.replace(`:${key}`, encodeURIComponent(value));
      }
    }
  }

  // Preserve query string and hash fragment
  const search = location.search || "";
  const hash = location.hash || "";
  const fullTarget = `${destination}${search}${hash}`;

  return <Navigate to={fullTarget} replace />;
}

export default LegacyRedirect;
```

### 4.2 Complete 36 Legacy Redirection Table

| # | Legacy Route Path | Redirect Target | Parameter Preservation | Query/Hash Preservation | Protection Level |
|---|---|---|---|---|---|
| 1 | `/dashboard` | `/billing/dashboard` | N/A | Preserved (`location.search + hash`) | Protected |
| 2 | `/pos` | `/billing/pos` | N/A | Preserved | Protected |
| 3 | `/checkout` | `/billing/pos` | N/A | Preserved | Protected |
| 4 | `/sales` | `/billing/sales` | N/A | Preserved (`?tab=quotation`, etc.) | Protected |
| 5 | `/sales-history` | `/billing/sales-history` | N/A | Preserved | Protected |
| 6 | `/purchases` | `/billing/purchases` | N/A | Preserved (`?tab=purchase_invoice`, etc.) | Protected |
| 7 | `/purchase-returns` | `/billing/purchase-returns` | N/A | Preserved | Protected |
| 8 | `/discovery` | `/billing/discovery` | N/A | Preserved (`?q=...`) | Protected |
| 9 | `/items` | `/billing/items` | N/A | Preserved (`?new=1`, `?bulk=1`) | Protected |
| 10 | `/inventory` | `/billing/inventory` | N/A | Preserved | Protected |
| 11 | `/godown` | `/billing/godown` | N/A | Preserved | Protected |
| 12 | `/barcode` | `/billing/barcode` | N/A | Preserved | Protected |
| 13 | `/parties` | `/billing/parties` | N/A | Preserved (`?new=1`) | Protected |
| 14 | `/customers` | `/billing/customers` | N/A | Preserved | Protected |
| 15 | `/customers/:id/ledger` | `/billing/customers/:id/ledger` | **Dynamic `:id` substituted & URI-encoded** | Preserved | Protected |
| 16 | `/suppliers` | `/billing/suppliers` | N/A | Preserved | Protected |
| 17 | `/storefront` | `/billing/storefront` | N/A | Preserved | Protected |
| 18 | `/tally-import` | `/billing/tally-import` | N/A | Preserved | Protected |
| 19 | `/reports` | `/billing/reports` | N/A | Preserved | Protected |
| 20 | `/analytics` | `/billing/analytics` | N/A | Preserved | Protected |
| 21 | `/cash-bank` | `/billing/cash-bank` | N/A | Preserved | Protected |
| 22 | `/expenses` | `/billing/expenses` | N/A | Preserved (`?new=1`) | Protected |
| 23 | `/e-invoicing` | `/billing/e-invoicing` | N/A | Preserved | Protected |
| 24 | `/eway-bill` | `/billing/eway-bill` | N/A | Preserved | Protected |
| 25 | `/automated-bills` | `/billing/automated-bills` | N/A | Preserved | Protected |
| 26 | `/settings` | `/billing/settings` | N/A | Preserved | Protected |
| 27 | `/settings/business` | `/billing/settings/business` | N/A | Preserved | Protected |
| 28 | `/settings/invoice` | `/billing/settings/invoice` | N/A | Preserved | Protected |
| 29 | `/settings/print` | `/billing/settings/print` | N/A | Preserved | Protected |
| 30 | `/settings/reminders`| `/billing/settings` | N/A | Preserved | Protected |
| 31 | `/settings/ca-sharing`| `/billing/reports` | N/A | Preserved | Protected |
| 32 | `/settings/pricing` | `/pricing` | N/A | Preserved | Protected |
| 33 | `/settings/refer` | `/billing/settings` | N/A | Preserved | Protected |
| 34 | `/settings/help` | `/faq` | N/A | Preserved | Protected |
| 35 | `/staff` | `/billing/staff` | N/A | Preserved | Protected |
| 36 | `/activity-log` | `/billing/activity-log` | N/A | Preserved | Protected |

---

### 4.3 Exact Code Implementation for `src/App.tsx`

Below is the complete, drop-in replacement specification for `src/App.tsx` ensuring 100% compatibility with all AST and regex tests:

```tsx
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { OrgProvider, useOrganization } from "@/hooks/useOrganization";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import AppLayout from "@/components/AppLayout";
import { ProductsProvider } from "@/context/ProductsContext";
import { NetworkInvoicesProvider } from "@/hooks/useNetworkInvoices";
import { ROUTE_PATHS, MANAGER_ROLES, isRouteAllowedForRole } from "@/config/routes";
import { LegacyRedirect } from "@/components/routing/LegacyRedirect";
import ScrollToTop from "@/components/ScrollToTop";
import { NativePlatformBridge } from "@/components/native/NativePlatformBridge";
import { isNativePlatform } from "@/services/nativeCapacitor";
import { MobileAppStartingCards } from "@/components/mobile/MobileAppStartingCards";

// Direct page imports for rock-solid zero-delay rendering
import Dashboard from "@/pages/Dashboard";
import POSBilling from "@/pages/POSBilling";
import Analytics from "@/pages/Analytics";
import BusinessSettings from "@/pages/BusinessSettings";
import InvoiceSettings from "@/pages/InvoiceSettings";
import PrintSettings from "@/pages/PrintSettings";
import Reports from "@/pages/Reports";
import Purchases from "@/pages/Purchases";
import VendorDiscovery from "@/pages/VendorDiscovery";
import Inventory from "@/pages/Inventory";
import Parties from "@/pages/Parties";
import Items from "@/pages/Items";
import Godown from "@/pages/Godown";
import Staff from "@/pages/Staff";
import Suppliers from "@/pages/Suppliers";
import PurchaseReturns from "@/pages/PurchaseReturns";
import Sales from "@/pages/Sales";
import Customers from "@/pages/Customers";
import CustomerLedger from "@/pages/CustomerLedger";
import Auth from "@/pages/Auth";
import ActivityLog from "@/pages/ActivityLog";
import NotFound from "@/pages/NotFound";
import Expenses from "@/pages/Expenses";
import CashAndBank from "@/pages/CashAndBank";
import EInvoicing from "@/pages/EInvoicing";
import EwayBillDashboard from "@/pages/EwayBillDashboard";
import AutomatedBills from "@/pages/AutomatedBills";
import BarcodeGenerator from "@/pages/BarcodeGenerator";
import Landing from "@/pages/Landing";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import Features from "@/pages/public/Features";
import Pricing from "@/pages/public/Pricing";
import GstBillingGuide from "@/pages/public/GstBillingGuide";
import CompareVyapar from "@/pages/public/CompareVyapar";
import CompareMyBillBook from "@/pages/public/CompareMyBillBook";
import CompareTally from "@/pages/public/CompareTally";
import TallyImport from "@/pages/TallyImport";
import BarcodeGuide from "@/pages/public/BarcodeGuide";
import EInvoicingGuide from "@/pages/public/EInvoicingGuide";
import About from "@/pages/public/About";
import Contact from "@/pages/public/Contact";
import Security from "@/pages/public/Security";
import FaqPage from "@/pages/public/FaqPage";
import StorefrontManager from "@/pages/StorefrontManager";
import PublicStorefront from "@/pages/public/PublicStorefront";
import CRMDashboard from "@/pages/crm/CRMDashboard";
import RoleManagement from "@/pages/crm/RoleManagement";
import Attendance from "@/pages/crm/Attendance";
import SalaryManagement from "@/pages/crm/SalaryManagement";
import Tasks from "@/pages/crm/Tasks";
import Broadcasts from "@/pages/crm/Broadcasts";
import Meet from "@/pages/crm/Meet";
import AIAssistant from "@/pages/crm/AIAssistant";
import Support from "@/pages/crm/Support";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

export function SleekRouteLoader() {
  return (
    <div className="min-h-[100dvh] w-full bg-white flex flex-col items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-200">
      <div className="relative flex flex-col items-center justify-center max-w-sm w-full">
        <img
          src="./IMG_9301.GIF"
          alt="CredSmart"
          className="w-72 sm:w-80 max-w-[85vw] h-auto object-contain select-none"
          loading="eager"
        />
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="w-32 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-600 to-amber-500 w-1/2 rounded-full animate-[ping_1.5s_infinite]" />
          </div>
          <p className="text-[11px] font-mono font-semibold text-slate-500 tracking-wider uppercase">
            Loading CredSmart...
          </p>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <SleekRouteLoader />;
  }

  if (!user) {
    return <Navigate to={ROUTE_PATHS.auth} replace />;
  }

  return <Outlet />;
}

function RoleProtectedRoute({ allowedRoles }: { allowedRoles: readonly string[] | string[] }) {
  const { user, loading: authLoading } = useAuth();
  const { userRole, userPermissions, loading: orgLoading } = useOrganization();
  const location = useLocation();

  if (authLoading || orgLoading) {
    return <SleekRouteLoader />;
  }

  if (!user) {
    return <Navigate to={ROUTE_PATHS.auth} replace />;
  }

  const effectiveRole = userRole || "store_owner";
  const currentPath = location.pathname || window.location.pathname;

  if (!allowedRoles.includes(effectiveRole) && !isRouteAllowedForRole(currentPath, effectiveRole, userPermissions)) {
    return <Navigate to={ROUTE_PATHS.checkout} replace />;
  }

  return <Outlet />;
}

function BillingIndexRedirect() {
  const { userRole } = useOrganization();
  const dest = userRole === "cashier" ? ROUTE_PATHS.pos : ROUTE_PATHS.dashboard;
  return <Navigate to={dest} replace />;
}

function AppEntryRoute() {
  const { user, loading } = useAuth();
  const { userRole } = useOrganization();

  if (loading) {
    return <SleekRouteLoader />;
  }

  if (!user) {
    return <Navigate to={ROUTE_PATHS.auth} replace />;
  }

  const dest = userRole === "cashier" ? ROUTE_PATHS.checkout : ROUTE_PATHS.dashboard;
  return <Navigate to={dest} replace />;
}

function AuthRoute() {
  const { user, loading } = useAuth();
  const { userRole } = useOrganization();

  if (loading) {
    return <SleekRouteLoader />;
  }

  if (user) {
    const dest = userRole === "cashier" ? ROUTE_PATHS.checkout : ROUTE_PATHS.dashboard;
    return <Navigate to={dest} replace />;
  }

  return <Auth />;
}

function HomeRoute() {
  const { user, loading } = useAuth();
  const { userRole } = useOrganization();

  if (loading) {
    return <SleekRouteLoader />;
  }

  if (user) {
    const dest = userRole === "cashier" ? ROUTE_PATHS.checkout : ROUTE_PATHS.dashboard;
    return <Navigate to={dest} replace />;
  }

  // Inside Native Mobile App (Capacitor/Android APK/AAB) or mobile app mode:
  // Render Mobile App Starting Cards onboarding tour directly
  if (isNativePlatform() || (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches)) {
    return <MobileAppStartingCards />;
  }

  return <Landing />;
}

// Wrapper for public marketing routes: on mobile app, redirect to App Starting Cards / Auth
function PublicMarketingRoute({ element }: { element: React.ReactElement }) {
  if (isNativePlatform() || (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches)) {
    return <Navigate to={ROUTE_PATHS.landing} replace />;
  }
  return element;
}

const isDesktopApp = typeof window !== "undefined" && (
  Boolean((window as any).credsmartDesktop?.isDesktop) ||
  window.location.protocol === "file:"
);
const AppRouter = isDesktopApp ? HashRouter : BrowserRouter;

const App = () => (
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
                      <Route element={<AppLayout />}>
                        {/* CRM Command Center & Sub-Systems (Mounted first to satisfy AST index-ordering in crmAttendanceRouteWiringChallenge test) */}
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

                        {/* Restricted to Managers & Owners & Super Admin */}
                        <Route element={<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />}>
                          <Route path={ROUTE_PATHS.dashboard} element={<Dashboard />} />
                          <Route path={ROUTE_PATHS.purchases} element={<Purchases />} />
                          <Route path={ROUTE_PATHS.discovery} element={<VendorDiscovery />} />
                          <Route path={ROUTE_PATHS.suppliers} element={<Suppliers />} />
                          <Route path={ROUTE_PATHS.purchaseReturns} element={<PurchaseReturns />} />
                          <Route path={ROUTE_PATHS.analytics} element={<Analytics />} />
                          <Route path={ROUTE_PATHS.reports} element={<Reports />} />
                          <Route path={ROUTE_PATHS.cashBank} element={<CashAndBank />} />
                          <Route path={ROUTE_PATHS.eInvoicing} element={<EInvoicing />} />
                          <Route path={ROUTE_PATHS.automatedBills} element={<AutomatedBills />} />
                          <Route path={ROUTE_PATHS.expenses} element={<Expenses />} />
                          <Route path={ROUTE_PATHS.barcode} element={<BarcodeGenerator />} />
                          <Route path={ROUTE_PATHS.settings} element={<BusinessSettings />} />
                          <Route path={ROUTE_PATHS.businessSettings} element={<BusinessSettings />} />
                          <Route path={ROUTE_PATHS.invoiceSettings} element={<InvoiceSettings />} />
                          <Route path={ROUTE_PATHS.printSettings} element={<PrintSettings />} />
                          <Route path={ROUTE_PATHS.settingsReminders} element={<Navigate to={ROUTE_PATHS.settings} replace />} />
                          <Route path={ROUTE_PATHS.settingsCaSharing} element={<Navigate to={ROUTE_PATHS.reports} replace />} />
                          <Route path={ROUTE_PATHS.settingsPricing} element={<Navigate to={ROUTE_PATHS.pricing} replace />} />
                          <Route path={ROUTE_PATHS.settingsRefer} element={<Navigate to={ROUTE_PATHS.settings} replace />} />
                          <Route path={ROUTE_PATHS.settingsHelp} element={<Navigate to={ROUTE_PATHS.faq} replace />} />
                          <Route path={ROUTE_PATHS.staff} element={<Staff />} />
                          <Route path={ROUTE_PATHS.activityLog} element={<ActivityLog />} />
                        </Route>
                      </Route>

                      {/* 36 Universal Legacy Redirects with Parameter & Query Preservation */}
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

export default App;
```

---

## 5. Verification Method

### 5.1 Static AST & Regex Verification
Run Vitest to verify that static AST assertions and routing tests pass with 0 errors:
```bash
cmd /c npx vitest run src/test/crmShellRoutes.test.ts src/test/crmAttendanceRouteWiringChallenge.test.tsx
```
**Expected Outcome**: 32/32 tests pass cleanly.

### 5.2 TypeScript Compilation Validation
Validate TypeScript without emit:
```bash
cmd /c npx tsc --noEmit
```
**Expected Outcome**: Process exits with code 0.

### 5.3 Automated Legacy Redirect & Preservation Verification
Worker M1 or Test Writer can mount `LegacyRedirect` in a test suite to verify:
1. `MemoryRouter initialEntries={["/dashboard"]}` redirects to `/billing/dashboard`.
2. `MemoryRouter initialEntries={["/sales?tab=quotation&status=draft"]}` redirects to `/billing/sales?tab=quotation&status=draft`.
3. `MemoryRouter initialEntries={["/customers/c-12345/ledger?filter=recent#top"]}` redirects to `/billing/customers/c-12345/ledger?filter=recent#top`.
4. Unauthenticated navigation to `/sales` redirects to `/auth`.
5. Authenticated navigation to `/billing` routes cashiers to `/billing/pos` and managers to `/billing/dashboard`.

### 5.4 Invalidation Conditions
- If `<Route path={ROUTE_PATHS.crmAttendance} element={<Attendance />} />` is placed AFTER `<Route element={<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />}>`, `crmAttendanceRouteWiringChallenge.test.tsx` will fail.
- If `function ProtectedRoutes()` or `function RoleProtectedRoute` signatures or the exact `if (!user) { return <Navigate to={ROUTE_PATHS.auth} replace />; }` pattern are altered, `crmShellRoutes.test.ts` will fail.
- If `:id` is not replaced in dynamic routes or `location.search` is omitted, query parameter preservation will fail.
