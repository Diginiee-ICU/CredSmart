import React, { useEffect, useRef } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { ROUTE_PATHS } from "@/config/routes";
import { toast } from "@/hooks/use-toast";

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

export function BillingLockdownGuard(): React.ReactElement {
  const { user, loading: authLoading } = useAuth();
  const { userRole, userPermissions, loading: orgLoading } = useOrganization();

  const isLoading = authLoading || orgLoading;

  const allowedStoreRoles = [
    "store_owner",
    "super_admin",
    "admin",
    "owner",
    "manager",
    "partner",
    "cashier",
    "salesman",
    "stock_manager",
    "delivery_boy",
    "accountant",
  ];

  const effectiveRole = userRole || (user as any)?.role || "";

  // Pure Store Role / POS Permission check (Zero CRM hook dependency)
  const isAllowed =
    effectiveRole === "super_admin" ||
    allowedStoreRoles.includes(effectiveRole) ||
    Boolean(
      userPermissions?.pos ||
      userPermissions?.sales ||
      userPermissions?.checkout ||
      userPermissions?.billing
    );

  // Self-Healing: Prevent infinite redirect loops on WebView process restore
  useEffect(() => {
    if (user && typeof window !== "undefined" && !sessionStorage.getItem("credsmart_launch_portal_active")) {
      sessionStorage.setItem("credsmart_launch_portal_active", "billing");
    }
  }, [user]);

  const toastFiredRef = useRef(false);

  useEffect(() => {
    if (!isLoading && !isAllowed && !toastFiredRef.current) {
      toastFiredRef.current = true;
      toast({
        title: "Access Restricted",
        description: "Access Restricted: Billing & POS counter is reserved for store owners and cashiers.",
        variant: "destructive",
      });
    }
  }, [isLoading, isAllowed]);

  if (isLoading) {
    return <SleekRouteLoader />;
  }

  if (!isAllowed) {
    return <Navigate to={ROUTE_PATHS.crm} replace />;
  }

  return <Outlet />;
}

export default BillingLockdownGuard;
