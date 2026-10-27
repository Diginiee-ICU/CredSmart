import React, { useEffect, useRef } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useCRMPermission } from "@/hooks/useCRMPermission";
import { ROUTE_PATHS } from "@/config/routes";
import { toast } from "@/hooks/use-toast";

/**
 * SleekRouteLoader component displayed during route evaluation
 */
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

/**
 * BillingLockdownGuard
 * Route guard preventing CRM staff without POS/billing roles from accessing /billing/*, /pos, /checkout.
 * Preserves access for store owners, cashiers, salesmen, stock managers, delivery boys, accountants,
 * super admins, and users explicitly granted POS billing access permissions.
 *
 * If access is denied:
 * - Dispatches a destructive alert toast
 * - Redirects to ROUTE_PATHS.crm (/crm)
 */
export function BillingLockdownGuard(): React.ReactElement {
  const { user, loading: authLoading } = useAuth();
  const { userRole, userPermissions, loading: orgLoading } = useOrganization();
  const { isSuperAdmin, hasPermission, loading: permLoading } = useCRMPermission();

  const isLoading = authLoading || orgLoading || permLoading;

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

  const isAllowed =
    isSuperAdmin ||
    allowedStoreRoles.includes(effectiveRole) ||
    Boolean(
      userPermissions?.pos ||
      userPermissions?.sales ||
      userPermissions?.checkout ||
      userPermissions?.billing
    ) ||
    (typeof hasPermission === "function" && (
      hasPermission("pos", "access") ||
      hasPermission("billing", "access") ||
      hasPermission("sales", "access") ||
      hasPermission("checkout", "access")
    ));

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
