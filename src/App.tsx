import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { OrgProvider, useOrganization } from "@/hooks/useOrganization";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import AppLayout from "@/components/AppLayout";
import { ProductsProvider } from "@/context/ProductsContext";
import { ROUTE_PATHS, MANAGER_ROLES } from "@/config/routes";

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
import AutomatedBills from "@/pages/AutomatedBills";
import BarcodeGenerator from "@/pages/BarcodeGenerator";
import Landing from "@/pages/Landing";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import Features from "@/pages/public/Features";
import Pricing from "@/pages/public/Pricing";
import GstBillingGuide from "@/pages/public/GstBillingGuide";
import CompareVyapar from "@/pages/public/CompareVyapar";
import About from "@/pages/public/About";
import Contact from "@/pages/public/Contact";
import Security from "@/pages/public/Security";
import FaqPage from "@/pages/public/FaqPage";

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
    <div className="min-h-[100dvh] w-full bg-background flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-200">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-20 h-20 rounded-full bg-emerald-500/15 blur-xl animate-pulse pointer-events-none" />
        <div className="w-10 h-10 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 border-r-emerald-500 animate-spin" />
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
  const { user, loading: authLoading } = useAuth();
  const { userRole, loading: orgLoading } = useOrganization();

  if (authLoading || orgLoading) {
    return <SleekRouteLoader />;
  }

  if (!user) {
    return <Navigate to={ROUTE_PATHS.landing} replace />;
  }

  const effectiveRole = userRole || "store_owner";
  if (!allowedRoles.includes(effectiveRole)) {
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
            <ProductsProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
              <Routes>
                {/* Public Routes */}
                <Route path={ROUTE_PATHS.landing} element={<HomeRoute />} />
                <Route path={ROUTE_PATHS.auth} element={<AuthRoute />} />
                <Route path={ROUTE_PATHS.features} element={<Features />} />
                <Route path={ROUTE_PATHS.pricing} element={<Pricing />} />
                <Route path={ROUTE_PATHS.gstBillingGuide} element={<GstBillingGuide />} />
                <Route path={ROUTE_PATHS.compareVyapar} element={<CompareVyapar />} />
                <Route path={ROUTE_PATHS.about} element={<About />} />
                <Route path={ROUTE_PATHS.contact} element={<Contact />} />
                <Route path={ROUTE_PATHS.security} element={<Security />} />
                <Route path={ROUTE_PATHS.faq} element={<FaqPage />} />
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
            </BrowserRouter>
            </ProductsProvider>
          </OrgProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
