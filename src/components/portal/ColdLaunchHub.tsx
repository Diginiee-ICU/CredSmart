import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isNativePlatform } from "@/services/nativeCapacitor";
import {
  ShoppingCart,
  Users,
  Sun,
  Moon,
  ArrowRight,
  ShieldCheck,
  Zap,
  Printer,
  FileSpreadsheet,
  PackageCheck,
  BookOpen,
  MapPin,
  Mic,
  CheckSquare,
  BadgePercent,
  Lock,
  Radio,
  Server,
  Cloud,
} from "lucide-react";

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

  // Keyboard shortcut navigation for power users & retail counter staff
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "1" || e.key === "p" || e.key === "P") {
        e.preventDefault();
        launchBilling();
      } else if (e.key === "2" || e.key === "c" || e.key === "C") {
        e.preventDefault();
        launchCrm();
      } else if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        toggleTheme();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDark]);

  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between p-3.5 sm:p-6 transition-colors duration-200">
      {/* Top Header */}
      <header className="w-full max-w-4xl mx-auto flex items-center justify-between py-2 border-b border-slate-200/80 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-2xs flex items-center justify-center">
            <img src="/favicon.png" alt="CredSmart Shield" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">CredSmart</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                v1.1.8
              </span>
            </div>
            <p className="text-[11px] font-mono font-medium text-slate-500 uppercase tracking-wider">
              Enterprise Hybrid Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Cloud Sync Heartbeat */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs text-[11px] font-mono text-slate-600 dark:text-slate-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="hidden sm:inline font-medium">All Systems Operational</span>
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
      <main className="w-full max-w-4xl mx-auto my-auto py-5 sm:py-8 flex flex-col items-center">
        <div className="text-center max-w-lg mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-semibold mb-2 shadow-2xs">
            <Radio className="w-3 h-3 animate-pulse text-blue-600 dark:text-blue-400" />
            <span>Dual-Engine Architecture Active</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Select Operational Portal
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Choose your workspace to launch. Both engines execute with strict runtime and storage isolation.
          </p>
        </div>

        {/* Selection Pods Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: POS & Billing */}
          <div
            onClick={launchBilling}
            data-testid="launch-pos-pod"
            className="group relative flex flex-col justify-between p-4.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/60 dark:hover:border-blue-500/60 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.99] overflow-hidden"
          >
            {/* Top Accent Gradient Line on Hover */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

            <div>
              {/* Header Badges & Icon Pod */}
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 text-[11px] font-semibold px-2 py-0.5 rounded-md">
                    ⚡ RETAIL POS & BILLING
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Ubuntu API
                  </span>
                </div>

                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200">
                  <ShoppingCart className="w-4.5 h-4.5" />
                </div>
              </div>

              {/* Title & Tagline */}
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-2">
                POS & Billing ERP
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                Turbo counter checkout, barcode scanner, thermal printing, multi-tab billing, GST invoicing & Udhar Khata ledgers.
              </p>

              {/* Capability Chips */}
              <div className="mt-3.5 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 text-slate-700 dark:text-slate-300">
                  <Zap className="w-3 h-3 text-blue-500" />
                  1-Tap Checkout
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 text-slate-700 dark:text-slate-300">
                  <Printer className="w-3 h-3 text-blue-500" />
                  Thermal ESC/POS
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 text-slate-700 dark:text-slate-300">
                  <FileSpreadsheet className="w-3 h-3 text-blue-500" />
                  B2B Auto-Inward
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 text-slate-700 dark:text-slate-300">
                  <PackageCheck className="w-3 h-3 text-blue-500" />
                  Realtime Stock
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 text-slate-700 dark:text-slate-300">
                  <BookOpen className="w-3 h-3 text-blue-500" />
                  Udhar Khata
                </span>
              </div>
            </div>

            {/* Bottom Host & Action Bar */}
            <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 dark:text-slate-500">
                <Server className="w-3.5 h-3.5" />
                <span>api.credsmart.online</span>
              </div>

              <div className="flex items-center gap-2">
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-2xs">
                  [1]
                </kbd>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    launchBilling();
                  }}
                  className="h-8.5 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 active:scale-[0.98] transition-all shadow-2xs"
                >
                  <span>Launch POS</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Lovable CRM */}
          <div
            onClick={launchCrm}
            data-testid="launch-crm-pod"
            className="group relative flex flex-col justify-between p-4.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/60 dark:hover:border-emerald-500/60 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.99] overflow-hidden"
          >
            {/* Top Accent Gradient Line on Hover */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

            <div>
              {/* Header Badges & Icon Pod */}
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold px-2 py-0.5 rounded-md">
                    👥 WORKFORCE & HR
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Supabase Cloud
                  </span>
                </div>

                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-2xs group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-200">
                  <Users className="w-4.5 h-4.5" />
                </div>
              </div>

              {/* Title & Tagline */}
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                CredSmart CRM by CredAlert
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                Geofenced GPS attendance, task delegation with proof reviews, staff permissions, Voice Copilot, and automated payroll.
              </p>

              {/* Capability Chips */}
              <div className="mt-3.5 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 text-slate-700 dark:text-slate-300">
                  <MapPin className="w-3 h-3 text-emerald-500" />
                  GPS Geofencing
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 text-slate-700 dark:text-slate-300">
                  <Mic className="w-3 h-3 text-emerald-500" />
                  Bilingual Voice AI
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 text-slate-700 dark:text-slate-300">
                  <CheckSquare className="w-3 h-3 text-emerald-500" />
                  Proof-of-Work
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 text-slate-700 dark:text-slate-300">
                  <BadgePercent className="w-3 h-3 text-emerald-500" />
                  Instant Payroll
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 text-slate-700 dark:text-slate-300">
                  <Lock className="w-3 h-3 text-emerald-500" />
                  Role Matrix & PINs
                </span>
              </div>
            </div>

            {/* Bottom Host & Action Bar */}
            <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 dark:text-slate-500">
                <Cloud className="w-3.5 h-3.5" />
                <span>wqllixoghlxvap...</span>
              </div>

              <div className="flex items-center gap-2">
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-2xs">
                  [2]
                </kbd>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    launchCrm();
                  }}
                  className="h-8.5 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 active:scale-[0.98] transition-all shadow-2xs"
                >
                  <span>Launch CRM</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
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
        <div className="font-mono flex items-center gap-2">
          <span>Shortcuts: <kbd className="px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">1</kbd> POS • <kbd className="px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">2</kbd> CRM • <kbd className="px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">T</kbd> Theme</span>
        </div>
      </footer>
    </div>
  );
}

export default ColdLaunchHub;
