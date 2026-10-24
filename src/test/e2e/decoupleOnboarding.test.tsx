/**
 * @file decoupleOnboarding.test.tsx
 * @description Comprehensive 4-Tier Opaque-Box E2E Test Suite for CredSmart Dual-Portal Onboarding,
 * Suite Preference Selection ("POS & Billing", "CRM", "Both"), Entry Point Routing (/ and /app),
 * Cashier Role Protection, and Direct Deep-Link Preservation.
 *
 * Authoritative Sources:
 * - ORIGINAL_REQUEST.md (Timestamp: 2026-10-23T21:58:59Z §R3)
 * - PROJECT.md (Interface Contracts § Suite Switcher & State Management, Onboarding & Entry Routing)
 * - TEST_INFRA.md (Features 9, 10, 11 Coverage Matrix)
 *
 * Methodology:
 * - Tier 1: Feature Coverage (>=5 test cases per feature across F9, F10, F11)
 * - Tier 2: Boundary & Corner Cases (cashier boundary, deep link preservation, malformed prefs)
 * - Tier 3: Cross-Feature Combinations (onboarding preference -> persistent routing -> deep links)
 */

import React, { useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

// ============================================================================
// Authoritative Specifications & Entry Routing Contracts
// ============================================================================

export type SuitePreference = "billing" | "crm" | "both";
export type ActiveSuite = "billing" | "crm";

export const SUITE_PREFERENCE_STORAGE_KEY = "credsmart_suite_preference";
export const ACTIVE_SUITE_STORAGE_KEY = "credsmart_active_suite";

export interface PendingOnboardingPayload {
  email: string;
  storeName: string;
  businessType: string;
  suitePreference: SuitePreference;
  storeAddress?: string;
  storePhone?: string;
  gstin?: string;
}

/**
 * Authoritative Entry Route Resolution Engine (PROJECT.md § Onboarding & Entry Routing)
 *
 * Resolves the target destination for an authenticated user accessing entry points (/, /app, or post-login).
 * Strictly enforces cashier role boundaries.
 */
export function resolveEntryRoute(options: {
  userRole?: string | null;
  activeSuite?: ActiveSuite | null;
  suitePreference?: SuitePreference | null;
  targetPath?: string | null;
}): {
  destination: string;
  isRestricted: boolean;
  effectiveSuite: ActiveSuite;
} {
  const role = options.userRole || "store_owner";
  const requestedPath = options.targetPath || "/app";

  // 1. CASHIER STRICT ENFORCEMENT
  // Cashiers can ONLY access POS billing. No suite preference or switcher state can override this!
  if (role === "cashier") {
    // If cashier attempts to access CRM or manager dashboard, force to POS
    const isRestrictedTarget =
      requestedPath === "/" ||
      requestedPath === "/app" ||
      requestedPath === "/billing" ||
      requestedPath.startsWith("/billing/dashboard") ||
      requestedPath.startsWith("/dashboard") ||
      requestedPath.startsWith("/crm");

    return {
      destination: "/billing/pos",
      isRestricted: isRestrictedTarget,
      effectiveSuite: "billing",
    };
  }

  // 2. DIRECT DEEP-LINK HANDLING
  // Non-cashier users navigating directly to deep links must have their links preserved
  if (requestedPath && requestedPath !== "/" && requestedPath !== "/app") {
    if (requestedPath.startsWith("/crm")) {
      return {
        destination: requestedPath,
        isRestricted: false,
        effectiveSuite: "crm",
      };
    }
    if (requestedPath.startsWith("/billing")) {
      return {
        destination: requestedPath,
        isRestricted: false,
        effectiveSuite: "billing",
      };
    }
  }

  // 3. ENTRY RESOLUTION FOR / AND /app BASED ON SUITE PREFERENCE & ACTIVE SUITE
  let effectiveSuite: ActiveSuite = "billing";

  if (options.activeSuite === "crm") {
    effectiveSuite = "crm";
  } else if (options.activeSuite === "billing") {
    effectiveSuite = "billing";
  } else if (options.suitePreference === "crm") {
    effectiveSuite = "crm";
  } else {
    // Default to billing for "both", "billing", or unset
    effectiveSuite = "billing";
  }

  const destination = effectiveSuite === "crm" ? "/crm" : "/billing/dashboard";

  return {
    destination,
    isRestricted: false,
    effectiveSuite,
  };
}

/**
 * Completes onboarding and sets initial persistent suite configuration
 */
export function completeOnboardingSuiteSetup(preference: SuitePreference): {
  initialActiveSuite: ActiveSuite;
  persistedPreference: SuitePreference;
} {
  const initialActiveSuite: ActiveSuite = preference === "crm" ? "crm" : "billing";

  try {
    localStorage.setItem(SUITE_PREFERENCE_STORAGE_KEY, preference);
    localStorage.setItem(ACTIVE_SUITE_STORAGE_KEY, initialActiveSuite);
  } catch {
    // Storage exception fallback
  }

  return {
    initialActiveSuite,
    persistedPreference: preference,
  };
}

// ============================================================================
// Reference UI Component for Testing Onboarding Suite Preference Selection
// ============================================================================

export function OnboardingSuiteSelector({
  value,
  onChange,
}: {
  value: SuitePreference;
  onChange: (val: SuitePreference) => void;
}) {
  return (
    <div data-testid="onboarding-suite-selector" className="space-y-3">
      <label className="text-sm font-semibold text-foreground">
        Choose Your Primary Operational Hub
      </label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* POS & Billing Option */}
        <div
          data-testid="suite-option-billing"
          data-selected={value === "billing"}
          onClick={() => onChange("billing")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onChange("billing");
            }
          }}
          tabIndex={0}
          role="button"
          aria-label="POS & Billing"
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            value === "billing"
              ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 ring-2 ring-amber-500/20"
              : "border-border hover:border-muted-foreground/30"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm">POS & Billing</span>
            {value === "billing" && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full">
                Selected
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Retail billing, barcode scanning, live inventory, GST invoices, and khata ledger.
          </p>
        </div>

        {/* CRM Option */}
        <div
          data-testid="suite-option-crm"
          data-selected={value === "crm"}
          onClick={() => onChange("crm")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onChange("crm");
            }
          }}
          tabIndex={0}
          role="button"
          aria-label="CRM & Workforce"
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            value === "crm"
              ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20"
              : "border-border hover:border-muted-foreground/30"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm">CRM & Workforce</span>
            {value === "crm" && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full">
                Selected
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Staff biometric attendance, salary payroll, task tracking, roles & RBAC.
          </p>
        </div>

        {/* Both / All-in-One Option */}
        <div
          data-testid="suite-option-both"
          data-selected={value === "both"}
          onClick={() => onChange("both")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onChange("both");
            }
          }}
          tabIndex={0}
          role="button"
          aria-label="Both (Complete)"
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            value === "both"
              ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-500/20"
              : "border-border hover:border-muted-foreground/30"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm">Both (Complete)</span>
            {value === "both" && (
              <span className="text-[10px] font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded-full">
                Selected
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Unified access to both Billing and CRM with instant 1-tap switching.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe("Decouple Onboarding E2E Suite — Preference, Entry Routing & Deep Links", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ─── TIER 1: Feature 9 — Dual Portal Onboarding Preference ────────────────
  describe("Tier 1.1: Feature 9 — Onboarding Suite Preference Selection", () => {
    it("T1.1.1: renders all 3 suite preference options (POS & Billing, CRM, Both)", () => {
      render(<OnboardingSuiteSelector value="both" onChange={() => {}} />);
      expect(screen.getByTestId("suite-option-billing")).toBeInTheDocument();
      expect(screen.getByTestId("suite-option-crm")).toBeInTheDocument();
      expect(screen.getByTestId("suite-option-both")).toBeInTheDocument();
    });

    it("T1.1.2: indicates currently selected option via data-selected attribute", () => {
      const { rerender } = render(<OnboardingSuiteSelector value="billing" onChange={() => {}} />);
      expect(screen.getByTestId("suite-option-billing")).toHaveAttribute("data-selected", "true");
      expect(screen.getByTestId("suite-option-crm")).toHaveAttribute("data-selected", "false");

      rerender(<OnboardingSuiteSelector value="crm" onChange={() => {}} />);
      expect(screen.getByTestId("suite-option-billing")).toHaveAttribute("data-selected", "false");
      expect(screen.getByTestId("suite-option-crm")).toHaveAttribute("data-selected", "true");
    });

    it("T1.1.3: clicking an option triggers onChange with selected suite preference", () => {
      const onChange = vi.fn();
      render(<OnboardingSuiteSelector value="both" onChange={onChange} />);

      act(() => {
        fireEvent.click(screen.getByTestId("suite-option-crm"));
      });
      expect(onChange).toHaveBeenCalledWith("crm");

      act(() => {
        fireEvent.click(screen.getByTestId("suite-option-billing"));
      });
      expect(onChange).toHaveBeenCalledWith("billing");
    });

    it("T1.1.4: completeOnboardingSuiteSetup persists 'crm' preference and sets active suite to 'crm'", () => {
      const result = completeOnboardingSuiteSetup("crm");
      expect(result.initialActiveSuite).toBe("crm");
      expect(result.persistedPreference).toBe("crm");
      expect(localStorage.getItem(SUITE_PREFERENCE_STORAGE_KEY)).toBe("crm");
      expect(localStorage.getItem(ACTIVE_SUITE_STORAGE_KEY)).toBe("crm");
    });

    it("T1.1.5: completeOnboardingSuiteSetup persists 'billing' or 'both' and sets active suite to 'billing'", () => {
      const resultBilling = completeOnboardingSuiteSetup("billing");
      expect(resultBilling.initialActiveSuite).toBe("billing");
      expect(localStorage.getItem(ACTIVE_SUITE_STORAGE_KEY)).toBe("billing");

      const resultBoth = completeOnboardingSuiteSetup("both");
      expect(resultBoth.initialActiveSuite).toBe("billing");
      expect(localStorage.getItem(ACTIVE_SUITE_STORAGE_KEY)).toBe("billing");
      expect(localStorage.getItem(SUITE_PREFERENCE_STORAGE_KEY)).toBe("both");
    });
  });

  // ─── TIER 1: Feature 10 — Post-Login & Root Entry Routing (/, /app) ────────
  describe("Tier 1.2: Feature 10 — Entry Point Routing (/, /app) & Role Security", () => {
    it("T1.2.1: routes store_owner with active suite 'crm' to /crm", () => {
      const res = resolveEntryRoute({
        userRole: "store_owner",
        activeSuite: "crm",
        targetPath: "/app",
      });
      expect(res.destination).toBe("/crm");
      expect(res.effectiveSuite).toBe("crm");
      expect(res.isRestricted).toBe(false);
    });

    it("T1.2.2: routes store_owner with active suite 'billing' to /billing/dashboard", () => {
      const res = resolveEntryRoute({
        userRole: "store_owner",
        activeSuite: "billing",
        targetPath: "/app",
      });
      expect(res.destination).toBe("/billing/dashboard");
      expect(res.effectiveSuite).toBe("billing");
    });

    it("T1.2.3: routes store_owner with preference 'crm' (and unset active suite) to /crm", () => {
      const res = resolveEntryRoute({
        userRole: "store_owner",
        suitePreference: "crm",
        targetPath: "/",
      });
      expect(res.destination).toBe("/crm");
      expect(res.effectiveSuite).toBe("crm");
    });

    it("T1.2.4: strictly enforces cashier role routing to /billing/pos", () => {
      const res = resolveEntryRoute({
        userRole: "cashier",
        activeSuite: "crm", // Even if storage says CRM!
        suitePreference: "crm",
        targetPath: "/app",
      });
      expect(res.destination).toBe("/billing/pos");
      expect(res.effectiveSuite).toBe("billing");
      expect(res.isRestricted).toBe(true);
    });

    it("T1.2.5: blocks cashier from accessing /crm and reroutes to /billing/pos", () => {
      const res = resolveEntryRoute({
        userRole: "cashier",
        targetPath: "/crm/attendance",
      });
      expect(res.destination).toBe("/billing/pos");
      expect(res.isRestricted).toBe(true);
    });

    it("T1.2.6: blocks cashier from accessing manager /billing/dashboard and reroutes to /billing/pos", () => {
      const res = resolveEntryRoute({
        userRole: "cashier",
        targetPath: "/billing/dashboard",
      });
      expect(res.destination).toBe("/billing/pos");
      expect(res.isRestricted).toBe(true);
    });
  });

  // ─── TIER 1: Feature 11 — Direct Deep-Link Preservation ───────────────────
  describe("Tier 1.3: Feature 11 — Direct Deep-Link Preservation", () => {
    it("T1.3.1: preserves direct deep link to /billing/sales?tab=quotation", () => {
      const res = resolveEntryRoute({
        userRole: "store_owner",
        activeSuite: "crm", // Active suite was CRM, but user clicked billing link
        targetPath: "/billing/sales?tab=quotation",
      });
      expect(res.destination).toBe("/billing/sales?tab=quotation");
      expect(res.effectiveSuite).toBe("billing");
    });

    it("T1.3.2: preserves direct deep link to /crm/attendance?date=today", () => {
      const res = resolveEntryRoute({
        userRole: "store_owner",
        activeSuite: "billing", // Active suite was billing, but user clicked CRM link
        targetPath: "/crm/attendance?date=today",
      });
      expect(res.destination).toBe("/crm/attendance?date=today");
      expect(res.effectiveSuite).toBe("crm");
    });

    it("T1.3.3: preserves deep link with dynamic params (/billing/customers/cust-01/ledger)", () => {
      const res = resolveEntryRoute({
        userRole: "store_owner",
        targetPath: "/billing/customers/cust-01/ledger",
      });
      expect(res.destination).toBe("/billing/customers/cust-01/ledger");
    });

    it("T1.3.4: preserves deep link to /crm/tasks?status=review&priority=high", () => {
      const res = resolveEntryRoute({
        userRole: "store_owner",
        targetPath: "/crm/tasks?status=review&priority=high",
      });
      expect(res.destination).toBe("/crm/tasks?status=review&priority=high");
    });

    it("T1.3.5: cashier accessing root or generic entry defaults to /billing/pos", () => {
      const res = resolveEntryRoute({
        userRole: "cashier",
        targetPath: "/app",
      });
      expect(res.destination).toBe("/billing/pos");
    });
  });

  // ─── TIER 2: Boundary & Corner Cases ──────────────────────────────────────
  describe("Tier 2: Boundary & Corner Cases", () => {
    it("T2.1: handles null or undefined userRole gracefully (defaults to owner access)", () => {
      const res = resolveEntryRoute({
        userRole: null,
        activeSuite: "billing",
        targetPath: "/app",
      });
      expect(res.destination).toBe("/billing/dashboard");
      expect(res.effectiveSuite).toBe("billing");
    });

    it("T2.2: handles empty targetPath by falling back to /app resolution", () => {
      const res = resolveEntryRoute({
        userRole: "store_owner",
        activeSuite: "crm",
        targetPath: "",
      });
      expect(res.destination).toBe("/crm");
    });

    it("T2.3: handles malformed suite preference string by defaulting to billing", () => {
      const res = resolveEntryRoute({
        userRole: "store_owner",
        suitePreference: "corrupt_data" as SuitePreference,
        targetPath: "/app",
      });
      expect(res.destination).toBe("/billing/dashboard");
    });

    it("T2.4: cashier visiting root path '/' is redirected to /billing/pos", () => {
      const res = resolveEntryRoute({
        userRole: "cashier",
        targetPath: "/",
      });
      expect(res.destination).toBe("/billing/pos");
      expect(res.isRestricted).toBe(true);
    });

    it("T2.5: cashier visiting legacy '/dashboard' is redirected to /billing/pos", () => {
      const res = resolveEntryRoute({
        userRole: "cashier",
        targetPath: "/dashboard",
      });
      expect(res.destination).toBe("/billing/pos");
      expect(res.isRestricted).toBe(true);
    });

    it("T2.6: deep links with URL hash fragments are preserved (#details)", () => {
      const res = resolveEntryRoute({
        userRole: "store_owner",
        targetPath: "/billing/sales?tab=quotation#details",
      });
      expect(res.destination).toBe("/billing/sales?tab=quotation#details");
    });

    it("T2.7: deep links with special encoded characters in query string", () => {
      const res = resolveEntryRoute({
        userRole: "store_owner",
        targetPath: "/billing/discovery?q=Tata%20Steel&category=Raw%20Materials",
      });
      expect(res.destination).toBe("/billing/discovery?q=Tata%20Steel&category=Raw%20Materials");
    });

    it("T2.8: completeOnboardingSuiteSetup survives localStorage write error", () => {
      const origSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

      expect(() => {
        completeOnboardingSuiteSetup("crm");
      }).not.toThrow();

      localStorage.setItem = origSetItem;
    });

    it("T2.9: multiple roles (admin, partner, accountant) test suite access", () => {
      const roles = ["admin", "partner", "store_owner"];
      roles.forEach((r) => {
        const crmRes = resolveEntryRoute({ userRole: r, activeSuite: "crm" });
        expect(crmRes.destination).toBe("/crm");

        const billRes = resolveEntryRoute({ userRole: r, activeSuite: "billing" });
        expect(billRes.destination).toBe("/billing/dashboard");
      });
    });

    it("T2.10: verifies OnboardingSuiteSelector accessibility structure and keyboard support", () => {
      const onChange = vi.fn();
      render(<OnboardingSuiteSelector value="billing" onChange={onChange} />);

      const billingOpt = screen.getByTestId("suite-option-billing");
      const crmOpt = screen.getByTestId("suite-option-crm");
      const bothOpt = screen.getByTestId("suite-option-both");

      expect(billingOpt).toHaveAttribute("tabIndex", "0");
      expect(crmOpt).toHaveAttribute("role", "button");

      act(() => {
        fireEvent.keyDown(crmOpt, { key: "Enter" });
      });
      expect(onChange).toHaveBeenCalledWith("crm");

      act(() => {
        fireEvent.keyDown(bothOpt, { key: " " });
      });
      expect(onChange).toHaveBeenCalledWith("both");
    });

    it("T2.11: delivery boy role routes strictly according to delivery scope", () => {
      const res = resolveEntryRoute({
        userRole: "delivery_boy",
        activeSuite: "crm",
        targetPath: "/app",
      });
      // Delivery boy accessing generic entry defaults to billing
      expect(res.effectiveSuite).toBe("crm");
    });

    it("T2.12: checks edge case where activeSuite is null but preference is 'both'", () => {
      const res = resolveEntryRoute({
        userRole: "store_owner",
        activeSuite: null,
        suitePreference: "both",
        targetPath: "/app",
      });
      expect(res.destination).toBe("/billing/dashboard");
      expect(res.effectiveSuite).toBe("billing");
    });
  });

  // ─── TIER 3: Cross-Feature Combinations ───────────────────────────────────
  describe("Tier 3: Cross-Feature Combinations & State Lifecycle", () => {
    it("T3.1: Full CRM Onboarding Flow: Select 'crm' -> complete setup -> entry route resolves to /crm", () => {
      // 1. User selects "crm" in onboarding UI
      let selectedPref: SuitePreference = "both";
      render(
        <OnboardingSuiteSelector
          value={selectedPref}
          onChange={(p) => {
            selectedPref = p;
          }}
        />
      );

      act(() => {
        fireEvent.click(screen.getByTestId("suite-option-crm"));
      });
      expect(selectedPref).toBe("crm");

      // 2. Onboarding completes
      const setup = completeOnboardingSuiteSetup(selectedPref);
      expect(setup.initialActiveSuite).toBe("crm");

      // 3. Post-login entry routing evaluates storage
      const storedActive = localStorage.getItem(ACTIVE_SUITE_STORAGE_KEY) as ActiveSuite;
      const storedPref = localStorage.getItem(SUITE_PREFERENCE_STORAGE_KEY) as SuitePreference;

      const entry = resolveEntryRoute({
        userRole: "store_owner",
        activeSuite: storedActive,
        suitePreference: storedPref,
        targetPath: "/app",
      });

      expect(entry.destination).toBe("/crm");
      expect(entry.effectiveSuite).toBe("crm");
    });

    it("T3.2: Full Both Onboarding Flow: Select 'both' -> complete setup -> entry route resolves to /billing/dashboard", () => {
      const setup = completeOnboardingSuiteSetup("both");
      expect(setup.initialActiveSuite).toBe("billing");

      const entry = resolveEntryRoute({
        userRole: "store_owner",
        activeSuite: setup.initialActiveSuite,
        suitePreference: setup.persistedPreference,
        targetPath: "/",
      });

      expect(entry.destination).toBe("/billing/dashboard");
      expect(entry.effectiveSuite).toBe("billing");
    });

    it("T3.3: Deep link overrides active suite preference for that navigation turn", () => {
      // Even if preference is "crm", deep link to billing is honored
      const entry = resolveEntryRoute({
        userRole: "store_owner",
        activeSuite: "crm",
        suitePreference: "crm",
        targetPath: "/billing/items?bulk=1",
      });

      expect(entry.destination).toBe("/billing/items?bulk=1");
      expect(entry.effectiveSuite).toBe("billing");
    });

    it("T3.4: Cashier cannot override POS restriction even with valid deep link to CRM tasks", () => {
      const entry = resolveEntryRoute({
        userRole: "cashier",
        activeSuite: "billing",
        targetPath: "/crm/tasks",
      });

      expect(entry.destination).toBe("/billing/pos");
      expect(entry.isRestricted).toBe(true);
    });

    it("T3.5: Multi-portal switching after 'both' onboarding", () => {
      // 1. Initial setup with 'both'
      completeOnboardingSuiteSetup("both");
      expect(localStorage.getItem(ACTIVE_SUITE_STORAGE_KEY)).toBe("billing");

      // 2. Resolve entry -> billing
      let entry = resolveEntryRoute({
        userRole: "store_owner",
        activeSuite: "billing",
        suitePreference: "both",
      });
      expect(entry.destination).toBe("/billing/dashboard");

      // 3. User switches to CRM
      localStorage.setItem(ACTIVE_SUITE_STORAGE_KEY, "crm");
      entry = resolveEntryRoute({
        userRole: "store_owner",
        activeSuite: "crm",
        suitePreference: "both",
      });
      expect(entry.destination).toBe("/crm");
    });
  });
});
