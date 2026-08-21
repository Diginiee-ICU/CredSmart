import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { OrgProvider, useOrganization } from "@/hooks/useOrganization";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Checkout from "@/pages/Checkout";
import ItemMaster from "@/pages/ItemMaster";
import Analytics from "@/pages/Analytics";
import SettingsPage from "@/pages/Settings";
import Purchases from "@/pages/Purchases";
import VendorDiscovery from "@/pages/VendorDiscovery";
import Inventory from "@/pages/Inventory";
import Staff from "@/pages/Staff";
import Suppliers from "@/pages/Suppliers";
import PurchaseReturns from "@/pages/PurchaseReturns";
import SalesHistory from "@/pages/SalesHistory";
import Customers from "@/pages/Customers";
import CustomerLedger from "@/pages/CustomerLedger";
import Auth from "@/pages/Auth";
import ActivityLog from "@/pages/ActivityLog";
import NotFound from "@/pages/NotFound";
import Expenses from "@/pages/Expenses";
import BarcodeGenerator from "@/pages/BarcodeGenerator";
import Landing from "@/pages/Landing";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import { ROUTE_PATHS, MANAGER_ROLES } from "@/config/routes";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={ROUTE_PATHS.landing} replace />;
  }

  return <Outlet />;
}

function RoleProtectedRoute({ allowedRoles }: { allowedRoles: readonly string[] | string[] }) {
  const { userRole, loading } = useOrganization();
  
  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
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
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
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
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    const dest = userRole === "cashier" ? ROUTE_PATHS.checkout : ROUTE_PATHS.dashboard;
    return <Navigate to={dest} replace />;
  }

  return <Landing />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <OrgProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            <Route path={ROUTE_PATHS.landing} element={<HomeRoute />} />
            <Route path={ROUTE_PATHS.auth} element={<AuthRoute />} />
            <Route path={ROUTE_PATHS.privacyPolicy} element={<PrivacyPolicy />} />
            <Route path={ROUTE_PATHS.termsOfService} element={<TermsOfService />} />

            <Route element={<ProtectedRoutes />}> 
              <Route element={<AppLayout />}> 
                
                {/* Available to everyone (including cashiers) */}
                <Route path={ROUTE_PATHS.checkout} element={<Checkout />} />
                <Route path={ROUTE_PATHS.items} element={<ItemMaster />} />
                <Route path={ROUTE_PATHS.inventory} element={<Inventory />} />
                <Route path={ROUTE_PATHS.customers} element={<Customers />} />
                <Route path={ROUTE_PATHS.customerLedger} element={<CustomerLedger />} />
                <Route path={ROUTE_PATHS.salesHistory} element={<SalesHistory />} />

                {/* Restricted to Managers & Owners & Super Admin */}
                <Route element={<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />}>
                  <Route path={ROUTE_PATHS.dashboard} element={<Dashboard />} />
                  <Route path={ROUTE_PATHS.purchases} element={<Purchases />} />
                  <Route path={ROUTE_PATHS.discovery} element={<VendorDiscovery />} />
                  <Route path={ROUTE_PATHS.suppliers} element={<Suppliers />} />
                  <Route path={ROUTE_PATHS.purchaseReturns} element={<PurchaseReturns />} />
                  <Route path={ROUTE_PATHS.analytics} element={<Analytics />} />
                  <Route path={ROUTE_PATHS.expenses} element={<Expenses />} />
                  <Route path={ROUTE_PATHS.barcode} element={<BarcodeGenerator />} />
                  <Route path={ROUTE_PATHS.settings} element={<SettingsPage />} />
                  <Route path={ROUTE_PATHS.staff} element={<Staff />} />
                  <Route path={ROUTE_PATHS.activityLog} element={<ActivityLog />} />
                </Route>

              </Route>
            </Route>

            {/* Global 404 Catch-All */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </OrgProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
