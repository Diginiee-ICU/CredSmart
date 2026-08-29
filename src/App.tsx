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
import { NetworkInvoicesProvider } from "@/hooks/useNetworkInvoices";
import { ROUTE_PATHS, MANAGER_ROLES, isRouteAllowedForRole } from "@/config/routes";
import ScrollToTop from "@/components/ScrollToTop";
import { NativePlatformBridge } from "@/components/native/NativePlatformBridge";

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
    <>
      {/* 3D Preloader - Desktop View */}
      <div className="hidden md:flex min-h-[100dvh] w-full bg-slate-50/50 backdrop-blur-3xl flex-col items-center justify-center p-6 select-none animate-in fade-in duration-300">
        <div className="relative flex items-center justify-center perspective-[1200px]">
          {/* Outer glowing ring */}
          <div className="absolute w-32 h-32 rounded-full border border-amber-200 shadow-[0_0_40px_rgba(245,158,11,0.2)] animate-[spin_4s_linear_infinite]" style={{ transformStyle: 'preserve-3d', transform: 'rotateX(60deg) rotateZ(0deg)' }} />
          {/* Inner fast ring */}
          <div className="absolute w-24 h-24 rounded-full border-2 border-t-amber-500 border-r-transparent border-b-amber-400 border-l-transparent animate-[spin_1.5s_ease-in-out_infinite]" style={{ transformStyle: 'preserve-3d', transform: 'rotateX(60deg) rotateZ(0deg)' }} />
          {/* Floating Logo/Core */}
          <div className="w-16 h-16 bg-gradient-to-tr from-amber-400 to-yellow-300 rounded-2xl shadow-[0_10px_30px_rgba(245,158,11,0.4)] animate-[bounce_2s_infinite] flex items-center justify-center border-2 border-white/50 backdrop-blur-md">
            <div className="w-8 h-8 bg-white/90 rounded-lg shadow-inner animate-pulse" />
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center gap-2">
          <p className="text-sm font-bold text-slate-800 tracking-[0.2em] uppercase drop-shadow-sm">
            CredSmart OS
          </p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>

      {/* 3D Preloader - Mobile View */}
      <div className="md:hidden min-h-[100dvh] w-full bg-white flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-300">
        <div className="relative flex items-center justify-center perspective-[800px]">
          {/* Soft back glow */}
          <div className="absolute w-24 h-24 rounded-full bg-indigo-500/10 blur-2xl animate-pulse" />
          {/* 3D Flip Card */}
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-cyan-400 rounded-[2rem] shadow-[0_15px_35px_rgba(99,102,241,0.3)] border-[3px] border-white/20 animate-[flip_2s_ease-in-out_infinite] flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-[3px] border-white/80 border-t-transparent animate-spin" />
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center gap-1.5">
          <p className="text-xs font-black bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent tracking-widest uppercase">
            Loading Workspace
          </p>
          <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 w-1/2 rounded-full animate-[ping_1.5s_infinite]" />
          </div>
        </div>
      </div>
    </>
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
  const { userRole, userPermissions, loading: orgLoading } = useOrganization();

  if (authLoading || orgLoading) {
    return <SleekRouteLoader />;
  }

  if (!user) {
    return <Navigate to={ROUTE_PATHS.landing} replace />;
  }

  const effectiveRole = userRole || "store_owner";
  const currentPath = window.location.pathname;

  if (!allowedRoles.includes(effectiveRole) && !isRouteAllowedForRole(currentPath, effectiveRole, userPermissions)) {
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
            <NetworkInvoicesProvider>
              <ProductsProvider>
                <Toaster />
                <Sonner />
                <NativePlatformBridge />
                <BrowserRouter>
                  <ScrollToTop />
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
            </NetworkInvoicesProvider>
          </OrgProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
