import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { disconnectCrmRealtime } from "@/crm/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import {
  Layers,
  ShoppingCart,
  Users,
  Grid,
  CheckCircle2,
  ArrowRightLeft,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher(): React.ReactElement | null {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole } = useOrganization();

  // Strict Cashier RBAC guard: Cashiers are strictly restricted from CRM and must not see the switcher
  if (userRole === "cashier") {
    return null;
  }

  const isCrm = location.pathname.startsWith("/crm");
  const isBilling = location.pathname.startsWith("/billing") || location.pathname === "/";

  const handleSwitchToBilling = () => {
    disconnectCrmRealtime();
    if (typeof window !== "undefined") {
      sessionStorage.setItem("credsmart_launch_portal_active", "billing");
      localStorage.setItem("credsmart_active_suite", "billing");
      localStorage.setItem("credsmart_suite_preference", "billing");
    }
    navigate("/billing/dashboard");
  };

  const handleSwitchToCrm = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("credsmart_launch_portal_active", "crm");
      localStorage.setItem("credsmart_active_suite", "crm");
      localStorage.setItem("credsmart_suite_preference", "crm");
    }
    navigate("/crm");
  };

  const handleReturnToHub = () => {
    disconnectCrmRealtime();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("credsmart_launch_portal_active");
    }
    navigate("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Switch Workspace"
          aria-label="Switch Workspace"
          data-testid="workspace-switcher-trigger"
          className="h-8.5 px-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-2xs active:scale-[0.98] transition-colors cursor-pointer select-none"
        >
          <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="hidden sm:inline">
            {isCrm ? "CRM Workspace" : "POS & Billing"}
          </span>
          <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-2 shadow-xl z-[200] animate-in fade-in zoom-in-95 duration-150 select-none"
      >
        <DropdownMenuLabel className="px-2 pt-1 pb-1.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-xs font-bold text-slate-900 dark:text-white">Workspace Switcher</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Dual-Engine</span>
        </DropdownMenuLabel>

        <div className="py-1.5 space-y-1">
          {/* Option 1: POS & Billing */}
          <DropdownMenuItem
            onSelect={handleSwitchToBilling}
            data-testid="switch-to-billing-btn"
            className={cn(
              "w-full flex items-center justify-between p-2 rounded-lg border text-left transition-colors cursor-pointer",
              isBilling
                ? "border-blue-500/50 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-semibold"
                : "border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                  isBilling
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60"
                )}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold truncate">POS &amp; Billing ERP</span>
                  <span className="text-[9px] font-mono font-medium px-1 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    Ubuntu
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                  Counters, Invoices &amp; Khata
                </div>
              </div>
            </div>
            {isBilling && <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 ml-1.5" />}
          </DropdownMenuItem>

          {/* Option 2: CRM & Workforce */}
          <DropdownMenuItem
            onSelect={handleSwitchToCrm}
            data-testid="switch-to-crm-btn"
            className={cn(
              "w-full flex items-center justify-between p-2 rounded-lg border text-left transition-colors cursor-pointer",
              isCrm
                ? "border-emerald-500/50 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold"
                : "border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                  isCrm
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60"
                )}
              >
                <Users className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold truncate">CredSmart CRM</span>
                  <span className="text-[9px] font-mono font-medium px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Cloud
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                  Attendance, Tasks &amp; Payroll
                </div>
              </div>
            </div>
            {isCrm && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 ml-1.5" />}
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 my-1" />

        {/* Option 3: Return to Selection Hub */}
        <DropdownMenuItem
          onSelect={handleReturnToHub}
          data-testid="return-to-hub-btn"
          className="w-full flex items-center gap-2 p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs"
        >
          <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">
            <Grid className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-xs">Return to Selection Hub</div>
            <div className="text-[10px] text-slate-400 truncate">Launch Portal Selection Screen</div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default WorkspaceSwitcher;
