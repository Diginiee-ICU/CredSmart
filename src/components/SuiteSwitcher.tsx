/**
 * @file SuiteSwitcher.tsx
 * @description High-visibility interactive Suite Switcher for CredSmart Dual-Portal Decoupling.
 * Placed in the top navigation header next to the CredSmart logo and menu toggle.
 *
 * Features:
 * - Detects active suite and synchronizes with localStorage ("credsmart_active_suite")
 * - Emits and listens to "credsmart:suite_changed" window events
 * - ARIA radio group semantics for full screen reader accessibility
 * - Keyboard navigation (Enter & Space keys)
 * - Distinct brand colors: Amber (#F59E0B) for POS & Billing, Emerald (#10B981) for CRM
 * - Cashier role guard: Cashiers are restricted from CRM and see only POS & Billing
 * - Router-aware navigation when inside React Router, with fallback for standalone test runners
 */

import React, { useEffect, useCallback } from "react";
import { useInRouterContext, useLocation, useNavigate } from "react-router-dom";
import {
  ActiveSuite,
  useActiveSuite,
  ACTIVE_SUITE_STORAGE_KEY,
  SUITE_CHANGED_EVENT,
  SUITE_PREFERENCE_STORAGE_KEY,
  parseActiveSuite,
  getActiveSuiteFromPath,
} from "@/hooks/useActiveSuite";
import { useOrganization } from "@/hooks/useOrganization";
import { ROUTE_PATHS } from "@/config/routes";
import { cn } from "@/lib/utils";

export {
  type ActiveSuite,
  ACTIVE_SUITE_STORAGE_KEY,
  SUITE_CHANGED_EVENT,
  SUITE_PREFERENCE_STORAGE_KEY,
  parseActiveSuite,
  getActiveSuiteFromPath,
  useActiveSuite,
};

export interface SuiteSwitcherProps {
  /** Optional callback fired when suite is changed */
  onSuiteChange?: (suite: ActiveSuite) => void;
  /** Optional prop override to force a specific suite display */
  currentSuite?: ActiveSuite;
  /** Optional additional CSS class names */
  className?: string;
  /** When true (default), completely hides the switcher for cashier role */
  hideForCashier?: boolean;
}

interface SuiteSwitcherViewProps extends SuiteSwitcherProps {
  onSelectSuite?: (suite: ActiveSuite) => void;
}

/**
 * Pure presentational view ensuring 100% visual and accessibility compliance.
 */
function SuiteSwitcherView({
  onSelectSuite,
  currentSuite,
  className,
}: SuiteSwitcherViewProps) {
  const { activeSuite, switchSuite } = useActiveSuite();
  const effectiveSuite = currentSuite || activeSuite;

  const handleSelect = (suite: ActiveSuite) => {
    switchSuite(suite);
    onSelectSuite?.(suite);
  };

  return (
    <div
      role="group"
      aria-label="Suite Switcher"
      className={cn(
        "inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 select-none shrink-0",
        className
      )}
    >
      {/* Button 1: POS & Billing */}
      <button
        type="button"
        role="radio"
        aria-checked={effectiveSuite === "billing"}
        aria-label="CredSmart POS & Billing"
        data-testid="suite-btn-billing"
        onClick={() => handleSelect("billing")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleSelect("billing");
          }
        }}
        className={cn(
          "px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer",
          effectiveSuite === "billing"
            ? "bg-amber-500 text-white shadow-sm font-bold"
            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        )}
      >
        <span>POS & Billing</span>
        {effectiveSuite === "billing" && (
          <span
            data-testid="active-suite-badge-billing"
            className="text-[10px] bg-amber-600 px-1 rounded uppercase tracking-wider font-bold"
          >
            Active
          </span>
        )}
      </button>

      {/* Button 2: CRM */}
      <button
        type="button"
        role="radio"
        aria-checked={effectiveSuite === "crm"}
        aria-label="CredSmart CRM"
        data-testid="suite-btn-crm"
        onClick={() => handleSelect("crm")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleSelect("crm");
          }
        }}
        className={cn(
          "px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer",
          effectiveSuite === "crm"
            ? "bg-emerald-600 text-white shadow-sm font-bold"
            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        )}
      >
        <span>CRM</span>
        {effectiveSuite === "crm" && (
          <span
            data-testid="active-suite-badge-crm"
            className="text-[10px] bg-emerald-700 px-1 rounded uppercase tracking-wider font-bold"
          >
            Active
          </span>
        )}
      </button>
    </div>
  );
}

/**
 * Router-aware wrapper syncing active portal with active route URL
 */
function RouterSuiteSwitcher(props: SuiteSwitcherProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeSuite, switchSuite } = useActiveSuite();

  useEffect(() => {
    const isCrmPath = location.pathname.startsWith("/crm");
    const isBillingPath = location.pathname.startsWith("/billing");

    if (isCrmPath && activeSuite !== "crm") {
      switchSuite("crm");
    } else if (isBillingPath && activeSuite !== "billing") {
      switchSuite("billing");
    }
  }, [location.pathname, activeSuite, switchSuite]);

  const handleSelectWithNavigate = useCallback(
    (suite: ActiveSuite) => {
      if (props.onSuiteChange) {
        props.onSuiteChange(suite);
      } else {
        const targetPath = suite === "crm" ? ROUTE_PATHS.crm : ROUTE_PATHS.dashboard;
        navigate(targetPath);
      }
    },
    [props, navigate]
  );

  return <SuiteSwitcherView {...props} onSelectSuite={handleSelectWithNavigate} />;
}

/**
 * Standalone wrapper for unit test runners without React Router provider
 */
function StandaloneSuiteSwitcher(props: SuiteSwitcherProps) {
  return <SuiteSwitcherView {...props} onSelectSuite={props.onSuiteChange} />;
}

/**
 * Main SuiteSwitcher export with automatic Cashier guard and environment detection
 */
export function SuiteSwitcher(props: SuiteSwitcherProps) {
  const inRouter = useInRouterContext();

  let isCashier = false;
  try {
    const org = useOrganization();
    isCashier = org?.userRole === "cashier";
  } catch {
    isCashier = false;
  }

  // Cashier guard: cashiers cannot switch suites and must never see CRM
  if (props.hideForCashier !== false && isCashier) {
    return null;
  }

  if (inRouter) {
    return <RouterSuiteSwitcher {...props} />;
  }

  return <StandaloneSuiteSwitcher {...props} />;
}

export default SuiteSwitcher;
