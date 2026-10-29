import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { disconnectCrmRealtime } from "@/crm/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import {
  Layers,
  ShoppingCart,
  Users,
  Grid,
  X,
  CheckCircle2,
  ArrowRightLeft,
} from "lucide-react";

export function WorkspaceSwitcher(): React.ReactElement | null {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole } = useOrganization();

  // Strict Cashier RBAC guard: Cashiers are strictly restricted from CRM and must not see the switcher
  if (userRole === "cashier") {
    return null;
  }

  const isCrm = location.pathname.startsWith("/crm");
  const isBilling = location.pathname.startsWith("/billing");

  const handleSwitchToBilling = () => {
    disconnectCrmRealtime();
    if (typeof window !== "undefined") {
      sessionStorage.setItem("credsmart_launch_portal_active", "billing");
    }
    setIsOpen(false);
    navigate("/billing/dashboard");
  };

  const handleSwitchToCrm = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("credsmart_launch_portal_active", "crm");
    }
    setIsOpen(false);
    navigate("/crm");
  };

  const handleReturnToHub = () => {
    disconnectCrmRealtime();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("credsmart_launch_portal_active");
    }
    setIsOpen(false);
    navigate("/");
  };

  return (
    <>
      {/* Switcher Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Switch Workspace"
        aria-label="Switch Workspace"
        data-testid="workspace-switcher-trigger"
        className="h-7 px-2 sm:px-2.5 rounded-md border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 text-slate-700 dark:text-slate-300 text-[11px] font-medium shadow-2xs active:scale-[0.98] transition-colors"
      >
        <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <span className="hidden sm:inline font-semibold">
          {isCrm ? "CRM Workspace" : isBilling ? "POS & Billing" : "Workspace"}
        </span>
      </button>

      {/* Switcher Modal / Sheet */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            role="dialog"
            aria-modal="true"
            data-state="open"
            className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xl select-none"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Workspace Switcher</h3>
                  <p className="text-[11px] text-slate-500">Switch operational environment</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                data-modal-close
                className="w-7 h-7 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-3 space-y-2">
              {/* Option 1: POS & Billing */}
              <button
                type="button"
                onClick={handleSwitchToBilling}
                data-testid="switch-to-billing-btn"
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-colors ${
                  isBilling
                    ? "border-blue-500/40 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300"
                    : "border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">POS & Billing ERP</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Counters, Invoices & Khata</div>
                  </div>
                </div>
                {isBilling && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
              </button>

              {/* Option 2: CRM & Workforce */}
              <button
                type="button"
                onClick={handleSwitchToCrm}
                data-testid="switch-to-crm-btn"
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-colors ${
                  isCrm
                    ? "border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300"
                    : "border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">CredSmart CRM by CredAlert</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Attendance, Tasks & Payroll</div>
                  </div>
                </div>
                {isCrm && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              </button>

              {/* Option 3: Return to Selection Hub */}
              <button
                type="button"
                onClick={handleReturnToHub}
                data-testid="return-to-hub-btn"
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-dashed border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                    <Grid className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">Cold Launch Hub</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Return to workspace selection</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default WorkspaceSwitcher;
