import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isNativePlatform } from "@/services/nativeCapacitor";
import { ShoppingCart, Users, Sun, Moon, ArrowRight, ShieldCheck } from "lucide-react";

export function isColdLaunchActive(): boolean {
  if (typeof window === "undefined") return false;
  const isMobileApp = isNativePlatform() || window.matchMedia("(display-mode: standalone)").matches;
  if (!isMobileApp) return false;
  return sessionStorage.getItem("credsmart_launch_portal_active") === null;
}

export function ColdLaunchHub(): React.ReactElement {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsDark(document.documentElement.classList.contains("dark"));
    }
  }, []);

  const toggleTheme = () => {
    if (typeof window !== "undefined") {
      const next = !isDark;
      setIsDark(next);
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  const launchBilling = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("credsmart_launch_portal_active", "billing");
    }
    navigate("/billing/dashboard");
  };

  const launchCrm = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("credsmart_launch_portal_active", "crm");
    }
    navigate("/crm");
  };

  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-6 transition-colors duration-200">
      {/* Top Header */}
      <header className="w-full max-w-4xl mx-auto flex items-center justify-between py-2 border-b border-slate-200/80 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-2xs flex items-center justify-center">
            <img src="/favicon.png" alt="CredSmart Shield" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">CredSmart</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                v1.1.7
              </span>
            </div>
            <p className="text-[11px] font-mono font-medium text-slate-500 uppercase tracking-wider">
              Enterprise Hybrid Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Cloud Sync Heartbeat */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs text-[11px] font-mono text-slate-600 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">Cloud Active</span>
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="w-7.5 h-7.5 rounded-md border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white active:scale-[0.98] transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Selection Area */}
      <main className="w-full max-w-4xl mx-auto my-auto py-6 sm:py-8 flex flex-col items-center">
        <div className="text-center max-w-md mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Select Operational Portal
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Choose a workspace to launch. You can seamlessly switch between platforms anytime.
          </p>
        </div>

        {/* Selection Pods Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: POS & Billing */}
          <div
            onClick={launchBilling}
            data-testid="launch-pos-pod"
            className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.99]"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 text-[11px] font-semibold px-2 py-0.5 rounded-md">
                  ⚡ RETAIL POS & BILLING
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4" />
                </div>
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                POS & Billing ERP
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                Turbo counter checkout, barcode scanner, thermal printing, multi-tab billing, GST invoicing & Udhar Khata ledgers.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400">
                Ubuntu Cloud • api.credsmart.online
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  launchBilling();
                }}
                className="h-8.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1 active:scale-[0.98] transition-all shadow-2xs"
              >
                <span>Launch POS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 2: Lovable CRM */}
          <div
            onClick={launchCrm}
            data-testid="launch-crm-pod"
            className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.99]"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold px-2 py-0.5 rounded-md">
                  👥 WORKFORCE & HR
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                CredSmart CRM by CredAlert
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                Geofenced GPS attendance, task delegation with proof reviews, staff permissions, Voice Copilot, and automated payroll.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400">
                Supabase Cloud • wqllixoghlxvap...
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  launchCrm();
                }}
                className="h-8.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1 active:scale-[0.98] transition-all shadow-2xs"
              >
                <span>Launch CRM</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Attestation */}
      <footer className="w-full max-w-4xl mx-auto py-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Strict Dual-Backend Architecture • Zero Shared Token Leakage</span>
        </div>
        <div className="font-mono">
          CredSmart Android Hybrid Container
        </div>
      </footer>
    </div>
  );
}

export default ColdLaunchHub;
