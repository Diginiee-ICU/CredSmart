import React, { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { OrgProvider, useOrganization } from "@/hooks/useOrganization";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import AppLayout from "@/components/AppLayout";
import { ROUTE_PATHS, MANAGER_ROLES } from "@/config/routes";

// Lazy-loaded route components for optimal bundle splitting
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const POSBilling = lazy(() => import("@/pages/POSBilling"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const BusinessSettings = lazy(() => import("@/pages/BusinessSettings"));
const InvoiceSettings = lazy(() => import("@/pages/InvoiceSettings"));
const PrintSettings = lazy(() => import("@/pages/PrintSettings"));
const Reports = lazy(() => import("@/pages/Reports"));
const Purchases = lazy(() => import("@/pages/Purchases"));
const VendorDiscovery = lazy(() => import("@/pages/VendorDiscovery"));
const Inventory = lazy(() => import("@/pages/Inventory"));
const Parties = lazy(() => import("@/pages/Parties"));
const Items = lazy(() => import("@/pages/Items"));
const Godown = lazy(() => import("@/pages/Godown"));
const Staff = lazy(() => import("@/pages/Staff"));
const Suppliers = lazy(() => import("@/pages/Suppliers"));
const PurchaseReturns = lazy(() => import("@/pages/PurchaseReturns"));
const Sales = lazy(() => import("@/pages/Sales"));
const Customers = lazy(() => import("@/pages/Customers"));
const CustomerLedger = lazy(() => import("@/pages/CustomerLedger"));
const Auth = lazy(() => import("@/pages/Auth"));
const ActivityLog = lazy(() => import("@/pages/ActivityLog"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Expenses = lazy(() => import("@/pages/Expenses"));
const CashAndBank = lazy(() => import("@/pages/CashAndBank"));
const EInvoicing = lazy(() => import("@/pages/EInvoicing"));
const AutomatedBills = lazy(() => import("@/pages/AutomatedBills"));
const BarcodeGenerator = lazy(() => import("@/pages/BarcodeGenerator"));
const Landing = lazy(() => import("@/pages/Landing"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("@/pages/TermsOfService"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Sleek loading fallback for Suspense transitions
 */
export function SleekRouteLoader() {
  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-200">
      <div className="relative flex items-center justify-center">
        {/* Soft emerald glowing halo */}
        <div className="absolute w-20 h-20 rounded-full bg-emerald-500/15 blur-xl animate-pulse pointer-events-none" />
        {/* Outer spinner */}
        <div className="w-10 h-10 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 border-r-emerald-500 animate-spin" />
        {/* Core pulsing dot */}
        <div className="absolute w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
      </div>
      <div className="mt-4 flex flex-col items-center gap-1">
        <p className="text-xs font-mono font-medium text-foreground/80 tracking-wider uppercase">
          CredSmart POS
        </p>
        <p className="text-[11px] font-mono text-muted-foreground">
          Loading workspace...
        </p>
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
    return <Navigate to={ROUTE_PATHS.landing} replace />;
  }

  return <Outlet />;
}

function RoleProtectedRoute({ allowedRoles }: { allowedRoles: readonly string[] | string[] }) {
  const { userRole, loading } = useOrganization();

  if (loading) {
    return <SleekRouteLoader />;
  }

  if (!userRole || !allowedRoles.includes(userRole)) {
    return <Navigate to={ROUTE_PATHS.checkout} replace />;
  }

  return <Outlet />;
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

  return <Landing />;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <OrgProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <Suspense fallback={<SleekRouteLoader />}>
                <Routes>
                  {/* Public Routes */}
                  <Route path={ROUTE_PATHS.landing} element={<HomeRoute />} />
                  <Route path={ROUTE_PATHS.auth} element={<AuthRoute />} />
                  <Route path={ROUTE_PATHS.privacyPolicy} element={<PrivacyPolicy />} />
                  <Route path={ROUTE_PATHS.termsOfService} element={<TermsOfService />} />

                  {/* Protected Shell */}
                  <Route element={<ProtectedRoutes />}>
                    <Route element={<AppLayout />}>
                      {/* Available to all authenticated roles (including cashiers) */}
                      <Route path={ROUTE_PATHS.checkout} element={<POSBilling />} />
                      <Route path={ROUTE_PATHS.pos} element={<POSBilling />} />
                      <Route path={ROUTE_PATHS.parties} element={<Parties />} />
                      <Route path={ROUTE_PATHS.items} element={<Items />} />
                      <Route path={ROUTE_PATHS.inventory} element={<Inventory />} />
                      <Route path={ROUTE_PATHS.godown} element={<Godown />} />
                      <Route path={ROUTE_PATHS.customers} element={<Customers />} />
                      <Route path={ROUTE_PATHS.customerLedger} element={<CustomerLedger />} />
                      <Route path={ROUTE_PATHS.sales} element={<Sales />} />
                      <Route path={ROUTE_PATHS.salesHistory} element={<Sales />} />

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
                        <Route path={ROUTE_PATHS.staff} element={<Staff />} />
                        <Route path={ROUTE_PATHS.activityLog} element={<ActivityLog />} />
                      </Route>
                    </Route>
                  </Route>

                  {/* Global 404 Catch-All */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </OrgProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
