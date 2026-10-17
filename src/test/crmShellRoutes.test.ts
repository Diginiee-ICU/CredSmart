import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import fs from "fs";
import path from "path";

// 1. Direct and Re-exported module imports
import * as ConfigRoutes from "@/config/routes";
import * as ComponentsRoutes from "@/components/routes";
import {
  ROUTE_PATHS,
  isRouteAllowedForRole,
  MAIN_NAV_ROUTES,
  NAV_ROUTES,
  RESTRICTED_ROUTES_FOR_CASHIER,
  FEATURE_ROUTE_MAP,
  STORE_OWNER_ROLES,
  FULL_ACCESS_ROLES,
  MANAGER_ROLES,
  ALL_APP_ROLES,
} from "@/config/routes";

// 2. Component imports
import RoleManagement from "@/pages/crm/RoleManagement";
import CRMDashboard from "@/pages/crm/CRMDashboard";

// Mock Supabase client to test graceful DB fallback resilience
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: null, error: { message: "relation does not exist" } }),
          gte: vi.fn().mockResolvedValue({ count: null, error: { message: "relation does not exist" } }),
          neq: vi.fn().mockResolvedValue({ count: null, error: { message: "relation does not exist" } }),
        }),
      }),
    }),
  },
}));

// Mock Organization hook
vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => ({
    orgId: "mock-org-123",
    org: { id: "mock-org-123", name: "CredSmart Test Superstore" },
    userRole: "store_owner",
    userPermissions: null,
  }),
}));

describe("Milestone 1 Empirical Challenger: CRM Shell & Navigation Suite", () => {
  // ─── SUITE 1: Re-export Parity (src/components/routes.ts) ───────────────────
  describe("Suite 1: Re-export Completeness (src/components/routes.ts)", () => {
    it("re-exports all constants, maps, and functions with strict reference equality", () => {
      expect(ComponentsRoutes.ROUTE_PATHS).toBe(ConfigRoutes.ROUTE_PATHS);
      expect(ComponentsRoutes.MAIN_NAV_ROUTES).toBe(ConfigRoutes.MAIN_NAV_ROUTES);
      expect(ComponentsRoutes.NAV_ROUTES).toBe(ConfigRoutes.NAV_ROUTES);
      expect(ComponentsRoutes.RESTRICTED_ROUTES_FOR_CASHIER).toBe(ConfigRoutes.RESTRICTED_ROUTES_FOR_CASHIER);
      expect(ComponentsRoutes.FEATURE_ROUTE_MAP).toBe(ConfigRoutes.FEATURE_ROUTE_MAP);
      expect(ComponentsRoutes.isRouteAllowedForRole).toBe(ConfigRoutes.isRouteAllowedForRole);
      expect(ComponentsRoutes.STORE_OWNER_ROLES).toBe(ConfigRoutes.STORE_OWNER_ROLES);
      expect(ComponentsRoutes.FULL_ACCESS_ROLES).toBe(ConfigRoutes.FULL_ACCESS_ROLES);
      expect(ComponentsRoutes.MANAGER_ROLES).toBe(ConfigRoutes.MANAGER_ROLES);
      expect(ComponentsRoutes.ALL_APP_ROLES).toBe(ConfigRoutes.ALL_APP_ROLES);
    });

    it("verifies every exported member from src/config/routes is present in src/components/routes", () => {
      const configKeys = Object.keys(ConfigRoutes);
      const componentKeys = Object.keys(ComponentsRoutes);

      expect(configKeys.length).toBeGreaterThan(0);
      expect(componentKeys.length).toBe(configKeys.length);

      for (const key of configKeys) {
        expect(ComponentsRoutes).toHaveProperty(key);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((ComponentsRoutes as any)[key]).toBe((ConfigRoutes as any)[key]);
      }
    });
  });

  // ─── SUITE 2: Route Definitions & Aliases ───────────────────────────────────
  describe("Suite 2: Route Definitions, Paths, and Aliases", () => {
    it("defines canonical CRM path and dashboard alias correctly", () => {
      expect(ROUTE_PATHS.crm).toBe("/crm");
      expect(ROUTE_PATHS.crmDashboard).toBe("/crm");
      // crmDashboard must be a direct alias of crm
      expect(ROUTE_PATHS.crmDashboard).toBe(ROUTE_PATHS.crm);
    });

    it("defines all 9 CRM sub-module routes matching exact specifications", () => {
      expect(ROUTE_PATHS.crmAttendance).toBe("/crm/attendance");
      expect(ROUTE_PATHS.crmSalary).toBe("/crm/salary");
      expect(ROUTE_PATHS.crmTasks).toBe("/crm/tasks");
      expect(ROUTE_PATHS.crmMeet).toBe("/crm/meet");
      expect(ROUTE_PATHS.crmBroadcasts).toBe("/crm/broadcasts");
      expect(ROUTE_PATHS.crmAiAssistant).toBe("/crm/ai-assistant");
      expect(ROUTE_PATHS.crmSupport).toBe("/crm/support");
      expect(ROUTE_PATHS.crmRoles).toBe("/crm/roles");
    });

    it("ensures exactly 9 unique CRM paths with zero accidental collisions", () => {
      const crmPaths = [
        ROUTE_PATHS.crm,
        ROUTE_PATHS.crmAttendance,
        ROUTE_PATHS.crmSalary,
        ROUTE_PATHS.crmTasks,
        ROUTE_PATHS.crmMeet,
        ROUTE_PATHS.crmBroadcasts,
        ROUTE_PATHS.crmAiAssistant,
        ROUTE_PATHS.crmSupport,
        ROUTE_PATHS.crmRoles,
      ];

      const uniquePaths = new Set(crmPaths);
      expect(uniquePaths.size).toBe(9);

      // Verify all paths start with /crm
      for (const p of crmPaths) {
        expect(p.startsWith("/crm")).toBe(true);
        // Ensure no trailing slash
        expect(p.endsWith("/")).toBe(false);
        // Ensure lowercase URL format
        expect(p).toBe(p.toLowerCase());
      }
    });

    it("ensures no collisions with pre-existing protected routes", () => {
      const crmPaths = new Set([
        ROUTE_PATHS.crm,
        ROUTE_PATHS.crmAttendance,
        ROUTE_PATHS.crmSalary,
        ROUTE_PATHS.crmTasks,
        ROUTE_PATHS.crmMeet,
        ROUTE_PATHS.crmBroadcasts,
        ROUTE_PATHS.crmAiAssistant,
        ROUTE_PATHS.crmSupport,
        ROUTE_PATHS.crmRoles,
      ]);

      const existingProtectedRoutes = [
        ROUTE_PATHS.dashboard,
        ROUTE_PATHS.sales,
        ROUTE_PATHS.checkout,
        ROUTE_PATHS.pos,
        ROUTE_PATHS.purchases,
        ROUTE_PATHS.inventory,
        ROUTE_PATHS.parties,
        ROUTE_PATHS.reports,
        ROUTE_PATHS.cashBank,
        ROUTE_PATHS.staff,
        ROUTE_PATHS.settings,
      ];

      for (const route of existingProtectedRoutes) {
        expect(crmPaths.has(route)).toBe(false);
      }
    });
  });

  // ─── SUITE 3: FeatureKey & FEATURE_ROUTE_MAP ────────────────────────────────
  describe("Suite 3: FeatureKey and FEATURE_ROUTE_MAP Invariant Integrity", () => {
    it("includes crm feature key in FEATURE_ROUTE_MAP", () => {
      expect(FEATURE_ROUTE_MAP).toHaveProperty("crm");
      expect(Array.isArray(FEATURE_ROUTE_MAP.crm)).toBe(true);
    });

    it("maps all 9 canonical CRM routes in FEATURE_ROUTE_MAP.crm", () => {
      const mappedRoutes = FEATURE_ROUTE_MAP.crm;
      expect(mappedRoutes).toHaveLength(9);

      const expectedRoutes = [
        ROUTE_PATHS.crm,
        ROUTE_PATHS.crmAttendance,
        ROUTE_PATHS.crmSalary,
        ROUTE_PATHS.crmTasks,
        ROUTE_PATHS.crmMeet,
        ROUTE_PATHS.crmBroadcasts,
        ROUTE_PATHS.crmAiAssistant,
        ROUTE_PATHS.crmSupport,
        ROUTE_PATHS.crmRoles,
      ];

      for (const route of expectedRoutes) {
        expect(mappedRoutes).toContain(route);
      }

      // No duplicate routes in the array
      expect(new Set(mappedRoutes).size).toBe(9);
    });
  });

  // ─── SUITE 4: Sub-Navigation Hierarchy in MAIN_NAV_ROUTES ───────────────────
  describe("Suite 4: Sub-Navigation Hierarchy in MAIN_NAV_ROUTES", () => {
    it("preserves NAV_ROUTES alias to MAIN_NAV_ROUTES", () => {
      expect(NAV_ROUTES).toBe(MAIN_NAV_ROUTES);
    });

    it("places CRM nav item inside the BUSINESS TOOLS navigation group", () => {
      const businessToolsGroup = MAIN_NAV_ROUTES.find((g) => g.label === "BUSINESS TOOLS");
      expect(businessToolsGroup).toBeDefined();

      const crmItem = businessToolsGroup?.items.find((item) => item.title === "CRM");
      expect(crmItem).toBeDefined();
      expect(crmItem?.url).toBe(ROUTE_PATHS.crm);
      expect(crmItem?.badge).toBe("NEW");
      expect(crmItem?.icon).toBeDefined();
    });

    it("configures exactly 9 sub-navigation children in correct hierarchical order", () => {
      const businessToolsGroup = MAIN_NAV_ROUTES.find((g) => g.label === "BUSINESS TOOLS");
      const crmItem = businessToolsGroup?.items.find((item) => item.title === "CRM");

      expect(crmItem?.children).toBeDefined();
      expect(crmItem?.children?.length).toBe(9);

      const expectedChildren = [
        { title: "Dashboard", url: ROUTE_PATHS.crm },
        { title: "Attendance", url: ROUTE_PATHS.crmAttendance },
        { title: "Salary", url: ROUTE_PATHS.crmSalary },
        { title: "Tasks", url: ROUTE_PATHS.crmTasks },
        { title: "Meet", url: ROUTE_PATHS.crmMeet },
        { title: "Broadcasts", url: ROUTE_PATHS.crmBroadcasts },
        { title: "AI Assistant", url: ROUTE_PATHS.crmAiAssistant },
        { title: "Support", url: ROUTE_PATHS.crmSupport },
        { title: "Role Management", url: ROUTE_PATHS.crmRoles },
      ];

      expect(crmItem?.children).toEqual(expectedChildren);
    });

    it("ensures mobile primary items in other groups remain intact", () => {
      const generalGroup = MAIN_NAV_ROUTES.find((g) => g.label === "GENERAL");
      expect(generalGroup).toBeDefined();

      const dashboardItem = generalGroup?.items.find((it) => it.title === "Dashboard");
      expect(dashboardItem?.mobilePrimary).toBe(true);

      const posItem = generalGroup?.items.find((it) => it.title === "POS Billing");
      expect(posItem?.mobilePrimary).toBe(true);
    });
  });

  // ─── SUITE 5: Cashier Restrictions & RBAC Matrix ────────────────────────────
  describe("Suite 5: Cashier Restriction Mappings & Role-Based Access Control", () => {
    it("includes crm and crmRoles in RESTRICTED_ROUTES_FOR_CASHIER", () => {
      expect(RESTRICTED_ROUTES_FOR_CASHIER.has(ROUTE_PATHS.crm)).toBe(true);
      expect(RESTRICTED_ROUTES_FOR_CASHIER.has(ROUTE_PATHS.crmRoles)).toBe(true);
    });

    it("restricts cashiers from accessing restricted CRM routes by default", () => {
      expect(isRouteAllowedForRole(ROUTE_PATHS.crm, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmRoles, "cashier")).toBe(false);
    });

    it("permits full access roles to access all CRM routes", () => {
      const fullRoles = ["store_owner", "super_admin", "admin", "partner", "owner", "manager"];
      const testRoutes = [
        ROUTE_PATHS.crm,
        ROUTE_PATHS.crmRoles,
        ROUTE_PATHS.crmAttendance,
        ROUTE_PATHS.crmSalary,
        ROUTE_PATHS.crmTasks,
      ];

      for (const role of fullRoles) {
        for (const route of testRoutes) {
          expect(isRouteAllowedForRole(route, role)).toBe(true);
        }
      }
    });

    it("rejects null, undefined, or empty string roles for all CRM routes", () => {
      expect(isRouteAllowedForRole(ROUTE_PATHS.crm, null)).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crm, undefined)).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crm, "")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmRoles, null)).toBe(false);
    });

    it("respects customPermissions override: explicit false denies full-access roles", () => {
      const customPermissions = { crm: false };
      expect(isRouteAllowedForRole(ROUTE_PATHS.crm, "store_owner", customPermissions)).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmRoles, "super_admin", customPermissions)).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmAttendance, "admin", customPermissions)).toBe(false);
    });

    it("respects customPermissions override: explicit true grants cashiers access to crm", () => {
      const customPermissions = { crm: true };
      expect(isRouteAllowedForRole(ROUTE_PATHS.crm, "cashier", customPermissions)).toBe(true);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmRoles, "cashier", customPermissions)).toBe(true);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmAttendance, "cashier", customPermissions)).toBe(true);
    });
  });

  // ─── SUITE 6: Unauthenticated Redirect Behavior ─────────────────────────────
  describe("Suite 6: Unauthenticated Redirect Invariants (src/App.tsx)", () => {
    it("statically verifies that ProtectedRoutes and RoleProtectedRoute redirect unauthenticated users to ROUTE_PATHS.auth", () => {
      const appTsxPath = path.resolve(__dirname, "../App.tsx");
      const appSource = fs.readFileSync(appTsxPath, "utf-8");

      // Verify ProtectedRoutes definition
      expect(appSource).toMatch(/function\s+ProtectedRoutes\(\)/);
      // Verify redirect target in ProtectedRoutes
      expect(appSource).toMatch(
        /if\s*\(!user\)\s*\{\s*return\s*<Navigate\s+to=\{ROUTE_PATHS\.auth\}\s+replace\s*\/>;\s*\}/
      );

      // Verify RoleProtectedRoute definition
      expect(appSource).toMatch(/function\s+RoleProtectedRoute/);
      // Verify redirect target in RoleProtectedRoute
      expect(appSource).toMatch(
        /if\s*\(!user\)\s*\{\s*return\s*<Navigate\s+to=\{ROUTE_PATHS\.auth\}\s+replace\s*\/>;\s*\}/
      );

      // Verify CRM routes are registered under ProtectedRoutes
      expect(appSource).toContain("<Route path={ROUTE_PATHS.crm} element={<CRMDashboard />} />");
      expect(appSource).toContain("<Route path={ROUTE_PATHS.crmRoles} element={<RoleManagement />} />");
      expect(appSource).toContain("<Route path={ROUTE_PATHS.crmAttendance} element={<Attendance />} />");
    });

    it("empirically verifies route protection harness: unauthenticated user is redirected to /auth", () => {
      // Functional simulation harness replicating App.tsx ProtectedRoutes guard without JSX
      function TestProtectedGuard({ user }: { user: { id: string } | null }) {
        if (!user) {
          return React.createElement(Navigate, { to: ROUTE_PATHS.auth, replace: true });
        }
        return React.createElement(Outlet, null);
      }

      function LocationSpy() {
        const location = useLocation();
        return React.createElement("div", { "data-testid": "current-location" }, location.pathname);
      }

      // Test 1: Unauthenticated user accessing /crm
      const { unmount } = render(
        React.createElement(
          MemoryRouter,
          { initialEntries: ["/crm"] },
          React.createElement(
            Routes,
            null,
            React.createElement(Route, { path: "/auth", element: React.createElement(LocationSpy, null) }),
            React.createElement(
              Route,
              { element: React.createElement(TestProtectedGuard, { user: null }) },
              React.createElement(Route, {
                path: "/crm",
                element: React.createElement("div", null, "CRM Protected Content"),
              })
            )
          )
        )
      );

      expect(screen.getByTestId("current-location").textContent).toBe("/auth");
      expect(screen.queryByText("CRM Protected Content")).toBeNull();
      unmount();

      // Test 2: Authenticated user accessing /crm
      render(
        React.createElement(
          MemoryRouter,
          { initialEntries: ["/crm"] },
          React.createElement(
            Routes,
            null,
            React.createElement(Route, { path: "/auth", element: React.createElement(LocationSpy, null) }),
            React.createElement(
              Route,
              { element: React.createElement(TestProtectedGuard, { user: { id: "user-123" } }) },
              React.createElement(Route, {
                path: "/crm",
                element: React.createElement("div", null, "CRM Protected Content"),
              })
            )
          )
        )
      );

      expect(screen.getByText("CRM Protected Content")).toBeDefined();
    });
  });

  // ─── SUITE 7: Component Smoke & Resilience Verification ─────────────────────
  describe("Suite 7: Component Resilience & Landing Smoke Tests", () => {
    it("renders RoleManagement shell with breadcrumbs, title, and badges without crashing", () => {
      render(
        React.createElement(
          MemoryRouter,
          { initialEntries: ["/crm/roles"] },
          React.createElement(RoleManagement, null)
        )
      );

      expect(screen.getByText("CRM Role & Permission Manager")).toBeDefined();
      expect(screen.getByText("RBAC Foundation")).toBeDefined();
      expect(screen.getByText("Live")).toBeDefined();
      expect(screen.getByText("Zero Hard-coded Roles")).toBeDefined();
      expect(screen.getByTitle("Back to CRM Command Center")).toBeDefined();
    });

    it("renders CRMDashboard with live stat cards and quick module navigation links", async () => {
      await render(
        React.createElement(
          MemoryRouter,
          { initialEntries: ["/crm"] },
          React.createElement(CRMDashboard, null)
        )
      );

      expect(await screen.findByText("CRM Command Center")).toBeDefined();
      expect(screen.getByText("Total Staff")).toBeDefined();
      expect(screen.getByText("Today Attendance")).toBeDefined();
      expect(screen.getByText("Pending Tasks")).toBeDefined();
      expect(screen.getByText("Broadcasts")).toBeDefined();
      expect(screen.getByText("Upcoming Meet")).toBeDefined();

      // Quick action modules
      expect(screen.getAllByText("Role Management").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("CRM AI Assistant")).toBeDefined();
      expect(screen.getByText("Attendance Tracker")).toBeDefined();
    });
  });
});
