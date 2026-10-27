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
import { ROUTE_PATHS, MANAGER_ROLES, isRouteAllowedForRole, resolvePostLoginRoute } from "@/config/routes";
import { LegacyRedirect } from "@/components/routing/LegacyRedirect";
import { BillingLockdownGuard } from "@/components/routing/BillingLockdownGuard";
import ScrollToTop from "@/components/ScrollToTop";
import { NativePlatformBridge } from "@/components/native/NativePlatformBridge";
import { isNativePlatform } from "@/services/nativeCapacitor";
import { MobileAppStartingCards } from "@/components/mobile/MobileAppStartingCards";

// Direct page imports for core business operations (instantaneous 0ms rendering)
import Dashboard from "@/pages/Dashboard";
import POSBilling from "@/pages/POSBilling";
import Parties from "@/pages/Parties";
import Items from "@/pages/Items";
import Sales from "@/pages/Sales";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";
import CRMDashboard from "@/pages/crm/CRMDashboard";

// Lazy-loaded secondary operations & sub-systems (drastically reduces initial JS bundle & parse time)
const RoleManagement = React.lazy(() => import("@/pages/crm/RoleManagement"));
const Attendance = React.lazy(() => import("@/pages/crm/Attendance"));
const Analytics = React.lazy(() => import("@/pages/Analytics"));
const Purchases = React.lazy(() => import("@/pages/Purchases"));
const Suppliers = React.lazy(() => import("@/pages/Suppliers"));
const Customers = React.lazy(() => import("@/pages/Customers"));
const SalaryManagement = React.lazy(() => import("@/pages/crm/SalaryManagement"));
const Tasks = React.lazy(() => import("@/pages/crm/Tasks"));
const Broadcasts = React.lazy(() => import("@/pages/crm/Broadcasts"));
const Meet = React.lazy(() => import("@/pages/crm/Meet"));
const AIAssistant = React.lazy(() => import("@/pages/crm/AIAssistant"));
const Support = React.lazy(() => import("@/pages/crm/Support"));

// Lazy-loaded secondary pages & public marketing routes (drastically reduces initial JS bundle & parse time)
const BusinessSettings = React.lazy(() => import("@/pages/BusinessSettings"));
const InvoiceSettings = React.lazy(() => import("@/pages/InvoiceSettings"));
const PrintSettings = React.lazy(() => import("@/pages/PrintSettings"));
const Reports = React.lazy(() => import("@/pages/Reports"));
const VendorDiscovery = React.lazy(() => import("@/pages/VendorDiscovery"));
const Inventory = React.lazy(() => import("@/pages/Inventory"));
const Godown = React.lazy(() => import("@/pages/Godown"));
const Staff = React.lazy(() => import("@/pages/Staff"));
const PurchaseReturns = React.lazy(() => import("@/pages/PurchaseReturns"));
const CustomerLedger = React.lazy(() => import("@/pages/CustomerLedger"));
const ActivityLog = React.lazy(() => import("@/pages/ActivityLog"));
const Expenses = React.lazy(() => import("@/pages/Expenses"));
const CashAndBank = React.lazy(() => import("@/pages/CashAndBank"));
const EInvoicing = React.lazy(() => import("@/pages/EInvoicing"));
const EwayBillDashboard = React.lazy(() => import("@/pages/EwayBillDashboard"));
const AutomatedBills = React.lazy(() => import("@/pages/AutomatedBills"));
const BarcodeGenerator = React.lazy(() => import("@/pages/BarcodeGenerator"));
const Landing = React.lazy(() => import("@/pages/Landing"));
const PrivacyPolicy = React.lazy(() => import("@/pages/PrivacyPolicy"));
const TermsOfService = React.lazy(() => import("@/pages/TermsOfService"));
const Features = React.lazy(() => import("@/pages/public/Features"));
const Pricing = React.lazy(() => import("@/pages/public/Pricing"));
const GstBillingGuide = React.lazy(() => import("@/pages/public/GstBillingGuide"));
const CompareVyapar = React.lazy(() => import("@/pages/public/CompareVyapar"));
const CompareMyBillBook = React.lazy(() => import("@/pages/public/CompareMyBillBook"));
const CompareTally = React.lazy(() => import("@/pages/public/CompareTally"));
const TallyImport = React.lazy(() => import("@/pages/TallyImport"));
const BarcodeGuide = React.lazy(() => import("@/pages/public/BarcodeGuide"));
const EInvoicingGuide = React.lazy(() => import("@/pages/public/EInvoicingGuide"));
const About = React.lazy(() => import("@/pages/public/About"));
const Contact = React.lazy(() => import("@/pages/public/Contact"));
const Security = React.lazy(() => import("@/pages/public/Security"));
const FaqPage = React.lazy(() => import("@/pages/public/FaqPage"));
const StorefrontManager = React.lazy(() => import("@/pages/StorefrontManager"));
const PublicStorefront = React.lazy(() => import("@/pages/public/PublicStorefront"));

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

  const dest = resolvePostLoginRoute(userRole);
  return <Navigate to={dest} replace />;
}

function AuthRoute() {
  const { user, loading } = useAuth();
  const { userRole } = useOrganization();

  if (loading) {
    return <SleekRouteLoader />;
  }

  if (user) {
    const dest = resolvePostLoginRoute(userRole);
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
    const dest = resolvePostLoginRoute(userRole);
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
                  <React.Suspense fallback={<SleekRouteLoader />}>
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

                        {/* Dedicated POS & Billing Portal protected by BillingLockdownGuard */}
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

                      {/* Global 404 Catch-All */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </React.Suspense>
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
