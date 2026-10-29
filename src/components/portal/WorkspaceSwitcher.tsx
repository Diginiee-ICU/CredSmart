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
  Server,
  Cloud,
  Zap,
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            role="dialog"
            aria-modal="true"
            data-state="open"
            className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xl select-none"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">Workspace Switcher</h3>
                  <p className="text-[10px] text-slate-500 font-mono">Isolated Dual-Engine Architecture</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                data-modal-close
                className="w-7 h-7 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Options List */}
            <div className="py-3 space-y-2">
              {/* Option 1: POS & Billing */}
              <button
                type="button"
                onClick={handleSwitchToBilling}
                data-testid="switch-to-billing-btn"
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all active:scale-[0.99] ${
                  isBilling
                    ? "border-blue-500/50 bg-blue-50/60 dark:bg-blue-950/30 text-blue-900 dark:text-blue-300 shadow-2xs"
                    : "border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isBilling
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60"
                  }`}>
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold">POS & Billing ERP</span>
                      <span className="text-[9px] font-mono font-medium px-1 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        Ubuntu API
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Counters, Invoices & Khata
                    </div>
                  </div>
                </div>
                {isBilling && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
              </button>

              {/* Option 2: CRM & Workforce */}
              <button
                type="button"
                onClick={handleSwitchToCrm}
                data-testid="switch-to-crm-btn"
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all active:scale-[0.99] ${
                  isCrm
                    ? "border-emerald-500/50 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 shadow-2xs"
                    : "border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isCrm
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60"
                  }`}>
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold">CredSmart CRM by CredAlert</span>
                      <span className="text-[9px] font-mono font-medium px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Supabase
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Attendance, Tasks & Payroll
                    </div>
                  </div>
                </div>
                {isCrm && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              </button>

              {/* Option 3: Return to Selection Hub */}
              <button
                type="button"
                onClick={handleReturnToHub}
                data-testid="return-to-hub-btn"
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-dashed border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 transition-colors active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                    <Grid className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-medium">Return to Hub</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Launch Portal Selection Screen</div>
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
