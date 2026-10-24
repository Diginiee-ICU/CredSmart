/**
 * @file useActiveSuite.ts
 * @description Hook and state synchronization engine for CredSmart Dual-Portal Decoupling
 * (CredSmart POS & Billing vs CredSmart CRM).
 *
 * Interfaces & Contracts:
 * - localStorage key: "credsmart_active_suite" ("billing" | "crm")
 * - localStorage key: "credsmart_suite_preference" ("billing" | "crm" | "both")
 * - Custom window event: "credsmart:suite_changed" with detail: { suite: ActiveSuite }
 * - Cross-tab synchronization via window 'storage' events
 * - Cashier role guard: Cashiers are strictly constrained to POS & Billing
 */

import { useState, useEffect, useCallback } from "react";
import { useOrganization } from "@/hooks/useOrganization";

export type ActiveSuite = "billing" | "crm";

export const ACTIVE_SUITE_STORAGE_KEY = "credsmart_active_suite";
export const SUITE_CHANGED_EVENT = "credsmart:suite_changed";
export const SUITE_PREFERENCE_STORAGE_KEY = "credsmart_suite_preference";

/**
 * Safely parses a string value into a valid ActiveSuite ("billing" | "crm").
 * Any invalid, corrupt, or empty value defaults to "billing".
 */
export function parseActiveSuite(val: unknown): ActiveSuite {
  if (val === "crm") return "crm";
  return "billing";
}

/**
 * Detects the active suite from a URL pathname.
 */
export function getActiveSuiteFromPath(pathname: string): ActiveSuite {
  if (pathname.startsWith("/crm")) {
    return "crm";
  }
  return "billing";
}

export interface UseActiveSuiteReturn {
  activeSuite: ActiveSuite;
  setActiveSuite: (suite: ActiveSuite) => void;
  switchSuite: (suite: ActiveSuite) => void;
  isBilling: boolean;
  isCrm: boolean;
}

/**
 * Unified hook for tracking and switching between POS & Billing and CRM portals.
 */
export function useActiveSuite(): UseActiveSuiteReturn {
  let isCashier = false;
  try {
    const org = useOrganization();
    isCashier = org?.userRole === "cashier";
  } catch {
    isCashier = false;
  }

  const [activeSuite, setLocalSuite] = useState<ActiveSuite>(() => {
    if (isCashier) {
      return "billing";
    }

    try {
      const stored = localStorage.getItem(ACTIVE_SUITE_STORAGE_KEY);
      if (stored === "crm" || stored === "billing") {
        return stored;
      }
      if (typeof window !== "undefined" && window.location?.pathname?.startsWith("/crm")) {
        return "crm";
      }
    } catch {
      // Storage access fallback
    }
    return "billing";
  });

  const switchSuite = useCallback(
    (newSuite: ActiveSuite) => {
      if (isCashier && newSuite === "crm") {
        setLocalSuite("billing");
        return;
      }

      const validatedSuite = parseActiveSuite(newSuite);
      setLocalSuite(validatedSuite);

      try {
        localStorage.setItem(ACTIVE_SUITE_STORAGE_KEY, validatedSuite);
        window.dispatchEvent(
          new CustomEvent(SUITE_CHANGED_EVENT, { detail: { suite: validatedSuite } })
        );
      } catch {
        // Graceful fallback for restricted storage environments
      }
    },
    [isCashier]
  );

  useEffect(() => {
    if (isCashier && activeSuite !== "billing") {
      setLocalSuite("billing");
      try {
        localStorage.setItem(ACTIVE_SUITE_STORAGE_KEY, "billing");
      } catch {
        // ignore
      }
      return;
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === ACTIVE_SUITE_STORAGE_KEY) {
        if (e.newValue === "billing" || e.newValue === "crm") {
          if (!isCashier || e.newValue === "billing") {
            setLocalSuite(e.newValue);
          }
        }
      }
    };

    const handleSuiteChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ suite: ActiveSuite }>;
      const suite = customEvent.detail?.suite;
      if (suite === "billing" || suite === "crm") {
        if (!isCashier || suite === "billing") {
          setLocalSuite(suite);
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(SUITE_CHANGED_EVENT, handleSuiteChanged);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(SUITE_CHANGED_EVENT, handleSuiteChanged);
    };
  }, [isCashier, activeSuite]);

  return {
    activeSuite: isCashier ? "billing" : activeSuite,
    setActiveSuite: switchSuite,
    switchSuite,
    isBilling: isCashier ? true : activeSuite === "billing",
    isCrm: isCashier ? false : activeSuite === "crm",
  };
}
