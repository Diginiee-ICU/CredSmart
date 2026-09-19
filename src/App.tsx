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
import BarcodeGuide from "@/pages/public/BarcodeGuide";
import EInvoicingGuide from "@/pages/public/EInvoicingGuide";
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
    <div className="min-h-[100dvh] w-full bg-white flex flex-col items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-200">
      <div className="relative flex flex-col items-center justify-center max-w-sm w-full">
        <img
          src="/IMG_9301.GIF"
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
                {/* Public & Mobile App Routes */}
                <Route path={ROUTE_PATHS.landing} element={<HomeRoute />} />
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
                      <Route path={ROUTE_PATHS.settingsReminders} element={<Navigate to={ROUTE_PATHS.settings} replace />} />
                      <Route path={ROUTE_PATHS.settingsCaSharing} element={<Navigate to={ROUTE_PATHS.reports} replace />} />
                      <Route path={ROUTE_PATHS.settingsPricing} element={<Navigate to={ROUTE_PATHS.pricing} replace />} />
                      <Route path={ROUTE_PATHS.settingsRefer} element={<Navigate to={ROUTE_PATHS.settings} replace />} />
                      <Route path={ROUTE_PATHS.settingsHelp} element={<Navigate to={ROUTE_PATHS.faq} replace />} />
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
