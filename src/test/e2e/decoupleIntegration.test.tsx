/**
 * @file decoupleIntegration.test.tsx
 * @description Comprehensive Tier 4 Real-World End-to-End Application Scenarios for CredSmart
 * Dual-Portal Decoupling (POS & Billing vs CRM).
 *
 * Authoritative Sources:
 * - ORIGINAL_REQUEST.md (Timestamp: 2026-10-23T21:58:59Z §R1, §R2, §R3, §R4)
 * - PROJECT.md (Architecture, Interface Contracts, Milestones)
 * - TEST_INFRA.md (§ Real-World Application Scenarios Tier 4)
 *
 * Scenarios Tested:
 * 1. Retail Cashier Flow (F1, F10, F11)
 * 2. HR Manager Flow (F2, F5, F10)
 * 3. Business Owner Dual Flow (F1, F2, F4, F5, F6, F7, F8)
 * 4. External Link Ingress & Legacy Migration Flow (F1, F3, F11)
 * 5. New Organization Onboarding & Portal Discovery Flow (F6, F7, F9, F10)
 * 6. Multi-Tenant & Multi-Role Session Boundary Resilience Flow (F1, F2, F7, F10, F11)
 */

import React, { useState, useEffect } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import {
  resolveLegacyRedirect,
  CANONICAL_BILLING_ROUTES,
  CANONICAL_CRM_ROUTES,
  LEGACY_REDIRECT_MATRIX,
} from "./decoupleRoutes.test";

import {
  ActiveSuite,
  ACTIVE_SUITE_STORAGE_KEY,
  SUITE_CHANGED_EVENT,
  useActiveSuite,
  SuiteSwitcher,
  AdaptiveMobileDock,
  BILLING_NAV_SPEC,
  CRM_NAV_SPEC,
  BILLING_MOBILE_DOCK_TABS,
  CRM_MOBILE_DOCK_TABS,
} from "./decoupleShells.test";

import {
  SuitePreference,
  SUITE_PREFERENCE_STORAGE_KEY,
  resolveEntryRoute,
  completeOnboardingSuiteSetup,
  OnboardingSuiteSelector,
} from "./decoupleOnboarding.test";

// ============================================================================
// Real-World Simulation Application Harness
// ============================================================================

interface SimulatedSessionState {
  user: { id: string; email: string; name: string } | null;
  role: string | null;
  currentPath: string;
  activeSuite: ActiveSuite;
}

/**
 * High-fidelity simulated Decoupled CredSmart Application Shell
 * Ties together authentication, role boundaries, SuiteSwitcher, sidebars, entry routing, and mobile docks.
 */
function DecoupledAppSimulation({
  initialRole = "store_owner",
  initialPath = "/app",
  initialActiveSuite,
}: {
  initialRole?: string | null;
  initialPath?: string;
  initialActiveSuite?: ActiveSuite;
}) {
  const [role, setRole] = useState<string | null>(initialRole);
  const [currentPath, setCurrentPath] = useState(initialPath);
  const { activeSuite, switchSuite } = useActiveSuite();

  // On mount, resolve entry route and enforce role boundaries
  useEffect(() => {
    // 1. Check legacy redirection
    const redirect = resolveLegacyRedirect(currentPath);
    let target = redirect.isRedirect ? redirect.targetUrl : currentPath;

    // 2. Enforce cashier role security
    if (role === "cashier") {
      const restricted = resolveEntryRoute({ userRole: "cashier", targetPath: target });
      setCurrentPath(restricted.destination);
      return;
    }

    // 3. Check entry routing for / and /app
    if (target === "/" || target === "/app") {
      const entry = resolveEntryRoute({
        userRole: role,
        activeSuite,
        targetPath: target,
      });
      setCurrentPath(entry.destination);
      return;
    }

    setCurrentPath(target);
  }, [currentPath, role, activeSuite]);

  const navigate = (path: string) => {
    // Check legacy redirects
    const redirect = resolveLegacyRedirect(path);
    const target = redirect.isRedirect ? redirect.targetUrl : path;

    // Check cashier restrictions
    if (role === "cashier") {
      const restricted = resolveEntryRoute({ userRole: "cashier", targetPath: target });
      setCurrentPath(restricted.destination);
      return;
    }

    setCurrentPath(target);
    if (target.startsWith("/crm")) {
      switchSuite("crm");
    } else if (target.startsWith("/billing")) {
      switchSuite("billing");
    }
  };

  const navGroups = activeSuite === "crm" ? CRM_NAV_SPEC : BILLING_NAV_SPEC;

  return (
    <div data-testid="simulated-app" className="min-h-screen flex flex-col bg-background">
      {/* Top Header */}
      <header data-testid="top-header" className="h-14 border-b flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div data-testid="brand-logo" className="font-bold text-lg">
            CredSmart
          </div>
          {/* Cashiers don't see SuiteSwitcher */}
          {role !== "cashier" && (
            <SuiteSwitcher
              onSuiteChange={(newSuite) => {
                const target = newSuite === "crm" ? "/crm" : "/billing/dashboard";
                navigate(target);
              }}
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          <span data-testid="current-role-badge" className="text-xs bg-muted px-2 py-1 rounded">
            Role: {role}
          </span>
          <span data-testid="current-path-display" className="text-xs font-mono text-muted-foreground">
            {currentPath}
          </span>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside data-testid="sidebar-navigation" className="w-64 border-r p-4 hidden md:block">
          <div className="text-xs font-bold uppercase text-muted-foreground mb-3">
            {activeSuite === "crm" ? "CRM Workforce" : "Retail & POS"}
          </div>
          <div className="space-y-4">
            {navGroups.map((grp) => (
              <div key={grp.label} data-testid={`nav-group-${grp.label}`}>
                <div className="text-[11px] font-semibold text-muted-foreground mb-1">{grp.label}</div>
                <ul className="space-y-1">
                  {grp.items.map((item) => (
                    <li key={item.url}>
                      <button
                        type="button"
                        data-testid={`sidebar-link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                        onClick={() => navigate(item.url)}
                        className={`text-xs w-full text-left px-2 py-1.5 rounded hover:bg-muted ${
                          currentPath === item.url ? "bg-muted font-bold text-primary" : ""
                        }`}
                      >
                        {item.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        {/* Viewport Content */}
        <main data-testid="main-viewport" className="flex-1 p-6">
          <h1 data-testid="page-title" className="text-xl font-bold mb-2">
            {currentPath.startsWith("/crm") ? "CredSmart CRM Command" : "CredSmart Retail & Billing"}
          </h1>
          <p data-testid="page-route-info" className="text-sm text-muted-foreground">
            Active Route: {currentPath} | Active Suite: {activeSuite}
          </p>

          {/* Role switcher simulation controls for adversarial testing */}
          <div className="mt-8 pt-4 border-t flex gap-2">
            <button
              type="button"
              data-testid="simulate-switch-cashier"
              onClick={() => {
                setRole("cashier");
                navigate("/app");
              }}
              className="text-xs px-2 py-1 bg-slate-200 rounded"
            >
              Simulate Cashier Login
            </button>
            <button
              type="button"
              data-testid="simulate-switch-owner"
              onClick={() => {
                setRole("store_owner");
                navigate("/app");
              }}
              className="text-xs px-2 py-1 bg-slate-200 rounded"
            >
              Simulate Owner Login
            </button>
          </div>
        </main>
      </div>

      {/* Adaptive Mobile Bottom Navigation Dock */}
      <AdaptiveMobileDock activeSuite={activeSuite} />
    </div>
  );
}

// ============================================================================
// TIER 4 TEST SCENARIOS
// ============================================================================

describe("Decouple Integration E2E Suite — Real-World Application Scenarios (Tier 4)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ─── SCENARIO 1: Retail Cashier Flow ──────────────────────────────────────
  describe("Scenario 1: Retail Cashier Operational Flow (F1, F10, F11)", () => {
    it("logs in as cashier -> auto-routed to /billing/pos -> SuiteSwitcher hidden -> CRM access blocked", () => {
      render(<DecoupledAppSimulation initialRole="cashier" initialPath="/app" />);

      // 1. Cashier is auto-routed to /billing/pos
      expect(screen.getByTestId("current-path-display")).toHaveTextContent("/billing/pos");

      // 2. Suite Switcher is hidden from cashier
      expect(screen.queryByRole("group", { name: "Suite Switcher" })).not.toBeInTheDocument();

      // 3. Current role badge confirms cashier
      expect(screen.getByTestId("current-role-badge")).toHaveTextContent("Role: cashier");

      // 4. Verify cashier cannot access /crm (adversarial attempt)
      const restricted = resolveEntryRoute({
        userRole: "cashier",
        targetPath: "/crm/attendance",
      });
      expect(restricted.destination).toBe("/billing/pos");
      expect(restricted.isRestricted).toBe(true);
    });

    it("cashier following external bookmark to /dashboard is rerouted to /billing/pos", () => {
      render(<DecoupledAppSimulation initialRole="cashier" initialPath="/dashboard" />);
      expect(screen.getByTestId("current-path-display")).toHaveTextContent("/billing/pos");
    });
  });

  // ─── SCENARIO 2: HR Manager Flow ──────────────────────────────────────────
  describe("Scenario 2: HR Manager Operational Flow (F2, F5, F10)", () => {
    it("logs in with CRM preference -> lands on /crm -> operates with 0 billing clutter", () => {
      // 1. Setup HR Manager preferences
      completeOnboardingSuiteSetup("crm");
      expect(localStorage.getItem(ACTIVE_SUITE_STORAGE_KEY)).toBe("crm");

      render(<DecoupledAppSimulation initialRole="store_owner" initialPath="/app" />);

      // 2. Verified routed to /crm
      expect(screen.getByTestId("current-path-display")).toHaveTextContent("/crm");
      expect(screen.getByTestId("active-suite-badge-crm")).toBeInTheDocument();

      // 3. Sidebar shows CRM modules
      expect(screen.getByTestId("sidebar-link-attendance-&-geofence")).toBeInTheDocument();
      expect(screen.getByTestId("sidebar-link-salary-&-payroll")).toBeInTheDocument();
      expect(screen.getByTestId("sidebar-link-tasks-&-projects")).toBeInTheDocument();

      // 4. 0 Billing clutter in sidebar
      expect(screen.queryByTestId("sidebar-link-pos-billing")).not.toBeInTheDocument();
      expect(screen.queryByTestId("sidebar-link-all-items")).not.toBeInTheDocument();
      expect(screen.queryByTestId("sidebar-link-cash-&-bank")).not.toBeInTheDocument();

      // 5. Mobile dock shows CRM tabs
      expect(screen.getByTestId("mobile-tab-tasks")).toBeInTheDocument();
      expect(screen.queryByTestId("mobile-tab-pos")).not.toBeInTheDocument();
    });
  });

  // ─── SCENARIO 3: Business Owner Dual Flow ─────────────────────────────────
  describe("Scenario 3: Business Owner Dual Flow (F1, F2, F4, F5, F6, F7, F8)", () => {
    it("login -> view /billing -> toggle Switcher to /crm -> sidebars & dock swap -> persistence verified", () => {
      render(<DecoupledAppSimulation initialRole="store_owner" initialPath="/app" />);

      // 1. Initial entry: arrives at /billing/dashboard
      expect(screen.getByTestId("current-path-display")).toHaveTextContent("/billing/dashboard");
      expect(screen.getByTestId("active-suite-badge-billing")).toBeInTheDocument();
      expect(screen.getByTestId("sidebar-link-pos-billing")).toBeInTheDocument();
      expect(screen.getByTestId("mobile-tab-pos")).toBeInTheDocument();

      // 2. Owner clicks "CRM" in SuiteSwitcher
      act(() => {
        fireEvent.click(screen.getByTestId("suite-btn-crm"));
      });

      // 3. Path changes to /crm and suite badge flips to CRM
      expect(screen.getByTestId("current-path-display")).toHaveTextContent("/crm");
      expect(screen.getByTestId("active-suite-badge-crm")).toBeInTheDocument();

      // 4. Sidebar immediately updates to CRM items
      expect(screen.getByTestId("sidebar-link-attendance-&-geofence")).toBeInTheDocument();
      expect(screen.queryByTestId("sidebar-link-pos-billing")).not.toBeInTheDocument();

      // 5. Mobile dock immediately flips to CRM tabs
      expect(screen.getByTestId("mobile-tab-tasks")).toBeInTheDocument();
      expect(screen.queryByTestId("mobile-tab-pos")).not.toBeInTheDocument();

      // 6. Persistence check: localStorage is updated
      expect(localStorage.getItem(ACTIVE_SUITE_STORAGE_KEY)).toBe("crm");
    });
  });

  // ─── SCENARIO 4: External Link Ingress & Legacy Migration Flow ─────────────
  describe("Scenario 4: External Link Ingress & Legacy Migration (F1, F3, F11)", () => {
    it("external user hits legacy link /sales?tab=quotation -> seamless redirect to /billing/sales?tab=quotation", () => {
      const externalLink = "/sales?tab=quotation&status=pending";
      const redirect = resolveLegacyRedirect(externalLink);

      expect(redirect.isRedirect).toBe(true);
      expect(redirect.targetUrl).toBe("/billing/sales?tab=quotation&status=pending");
      expect(redirect.search).toBe("?tab=quotation&status=pending");

      // Render simulation with this external link
      render(<DecoupledAppSimulation initialRole="store_owner" initialPath={externalLink} />);
      expect(screen.getByTestId("current-path-display")).toHaveTextContent(
        "/billing/sales?tab=quotation&status=pending"
      );
    });

    it("external user hits legacy customer ledger /customers/cust-555/ledger -> dynamic param preserved", () => {
      const dynamicLink = "/customers/cust-555/ledger?currency=INR#transactions";
      const redirect = resolveLegacyRedirect(dynamicLink);

      expect(redirect.isRedirect).toBe(true);
      expect(redirect.targetUrl).toBe("/billing/customers/cust-555/ledger?currency=INR#transactions");
      expect(redirect.params.id).toBe("cust-555");
      expect(redirect.hash).toBe("#transactions");
    });
  });

  // ─── SCENARIO 5: New Organization Onboarding & Portal Discovery Flow ───────
  describe("Scenario 5: New Org Onboarding & Portal Discovery Flow (F6, F7, F9, F10)", () => {
    it("new user signs up with 'Both' preference -> initial landing in billing -> explores CRM via Switcher", () => {
      // 1. New user selects "Both" in onboarding UI
      let selectedPref: SuitePreference = "both";
      render(
        <OnboardingSuiteSelector
          value={selectedPref}
          onChange={(p) => {
            selectedPref = p;
          }}
        />
      );

      // Verify "Both" is selected
      expect(screen.getByTestId("suite-option-both")).toHaveAttribute("data-selected", "true");

      // 2. Complete setup
      const setup = completeOnboardingSuiteSetup("both");
      expect(setup.initialActiveSuite).toBe("billing");
      expect(setup.persistedPreference).toBe("both");

      // 3. User launches application for the first time
      render(<DecoupledAppSimulation initialRole="store_owner" initialPath="/app" />);

      // Landed in billing dashboard
      expect(screen.getByTestId("current-path-display")).toHaveTextContent("/billing/dashboard");

      // 4. User explores CRM by clicking SuiteSwitcher
      act(() => {
        fireEvent.click(screen.getByTestId("suite-btn-crm"));
      });

      // Seamlessly transitioned to CRM workspace
      expect(screen.getByTestId("current-path-display")).toHaveTextContent("/crm");
      expect(screen.getByTestId("active-suite-badge-crm")).toBeInTheDocument();
      expect(localStorage.getItem(ACTIVE_SUITE_STORAGE_KEY)).toBe("crm");
    });
  });

  // ─── SCENARIO 6: Multi-Tenant & Multi-Role Boundary Resilience Flow ────────
  describe("Scenario 6: Multi-Tenant & Multi-Role Boundary Resilience (Adversarial)", () => {
    it("shared device: Owner in CRM logs out -> Cashier logs in -> CRM access terminated -> forced to /billing/pos", () => {
      // 1. Owner was using CRM
      localStorage.setItem(ACTIVE_SUITE_STORAGE_KEY, "crm");

      render(<DecoupledAppSimulation initialRole="store_owner" initialPath="/crm" />);
      expect(screen.getByTestId("current-path-display")).toHaveTextContent("/crm");

      // 2. Owner steps away, Cashier logs in
      act(() => {
        fireEvent.click(screen.getByTestId("simulate-switch-cashier"));
      });

      // 3. Cashier is immediately forced to /billing/pos
      expect(screen.getByTestId("current-path-display")).toHaveTextContent("/billing/pos");
      expect(screen.getByTestId("current-role-badge")).toHaveTextContent("Role: cashier");
      expect(screen.queryByRole("group", { name: "Suite Switcher" })).not.toBeInTheDocument();

      // 4. Cashier logs out, Owner logs back in
      act(() => {
        fireEvent.click(screen.getByTestId("simulate-switch-owner"));
      });

      // 5. Owner is restored to proper operational dashboard with full suite switcher
      expect(screen.getByRole("group", { name: "Suite Switcher" })).toBeInTheDocument();
    });
  });
});
