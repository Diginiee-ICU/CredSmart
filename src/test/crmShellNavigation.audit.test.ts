import { describe, it, expect } from "vitest";
import * as ComponentRoutes from "@/components/routes";
import * as ConfigRoutes from "@/config/routes";
import { ROUTE_PATHS, isRouteAllowedForRole, RESTRICTED_ROUTES_FOR_CASHIER, MAIN_NAV_ROUTES, FEATURE_ROUTE_MAP } from "@/config/routes";

describe("Milestone 1 Forensic Integrity Verification: CRM Shell & Navigation", () => {
  describe("Route Parity & Re-export Integrity", () => {
    it("verifies src/components/routes re-exports exact ROUTE_PATHS from src/config/routes", () => {
      expect(ComponentRoutes.ROUTE_PATHS).toBeDefined();
      expect(ComponentRoutes.ROUTE_PATHS.crm).toBe("/crm");
      expect(ComponentRoutes.ROUTE_PATHS.crmRoles).toBe("/crm/roles");
      expect(ComponentRoutes.ROUTE_PATHS).toEqual(ConfigRoutes.ROUTE_PATHS);
    });

    it("verifies all 9 CRM sub-routes are accurately defined in ROUTE_PATHS", () => {
      expect(ROUTE_PATHS.crm).toBe("/crm");
      expect(ROUTE_PATHS.crmDashboard).toBe("/crm");
      expect(ROUTE_PATHS.crmAttendance).toBe("/crm/attendance");
      expect(ROUTE_PATHS.crmSalary).toBe("/crm/salary");
      expect(ROUTE_PATHS.crmTasks).toBe("/crm/tasks");
      expect(ROUTE_PATHS.crmMeet).toBe("/crm/meet");
      expect(ROUTE_PATHS.crmBroadcasts).toBe("/crm/broadcasts");
      expect(ROUTE_PATHS.crmAiAssistant).toBe("/crm/ai-assistant");
      expect(ROUTE_PATHS.crmSupport).toBe("/crm/support");
      expect(ROUTE_PATHS.crmRoles).toBe("/crm/roles");
    });
  });

  describe("Security & RBAC Enforcement", () => {
    it("strictly blocks cashier from accessing CRM and CRM Roles", () => {
      expect(RESTRICTED_ROUTES_FOR_CASHIER.has(ROUTE_PATHS.crm)).toBe(true);
      expect(RESTRICTED_ROUTES_FOR_CASHIER.has(ROUTE_PATHS.crmRoles)).toBe(true);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crm, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmRoles, "cashier")).toBe(false);
    });

    it("allows full access to privileged roles (store_owner, super_admin, admin, partner)", () => {
      const privilegedRoles = ["store_owner", "super_admin", "admin", "partner", "manager", "owner"];
      for (const role of privilegedRoles) {
        expect(isRouteAllowedForRole(ROUTE_PATHS.crm, role)).toBe(true);
        expect(isRouteAllowedForRole(ROUTE_PATHS.crmRoles, role)).toBe(true);
      }
    });

    it("blocks null and undefined roles from accessing CRM", () => {
      expect(isRouteAllowedForRole(ROUTE_PATHS.crm, null)).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crm, undefined)).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmRoles, null)).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmRoles, undefined)).toBe(false);
    });

    it("blocks non-privileged operational roles (delivery_boy, stock_manager) from CRM", () => {
      expect(isRouteAllowedForRole(ROUTE_PATHS.crm, "delivery_boy")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmRoles, "delivery_boy")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crm, "stock_manager")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmRoles, "stock_manager")).toBe(false);
    });
  });

  describe("Navigation Hierarchy & Feature Mapping", () => {
    it("maps all 9 CRM routes in FEATURE_ROUTE_MAP.crm", () => {
      expect(FEATURE_ROUTE_MAP.crm).toBeDefined();
      expect(FEATURE_ROUTE_MAP.crm).toContain(ROUTE_PATHS.crm);
      expect(FEATURE_ROUTE_MAP.crm).toContain(ROUTE_PATHS.crmAttendance);
      expect(FEATURE_ROUTE_MAP.crm).toContain(ROUTE_PATHS.crmSalary);
      expect(FEATURE_ROUTE_MAP.crm).toContain(ROUTE_PATHS.crmTasks);
      expect(FEATURE_ROUTE_MAP.crm).toContain(ROUTE_PATHS.crmMeet);
      expect(FEATURE_ROUTE_MAP.crm).toContain(ROUTE_PATHS.crmBroadcasts);
      expect(FEATURE_ROUTE_MAP.crm).toContain(ROUTE_PATHS.crmAiAssistant);
      expect(FEATURE_ROUTE_MAP.crm).toContain(ROUTE_PATHS.crmSupport);
      expect(FEATURE_ROUTE_MAP.crm).toContain(ROUTE_PATHS.crmRoles);
      expect(FEATURE_ROUTE_MAP.crm.length).toBe(9);
    });

    it("registers CRM item under BUSINESS TOOLS with 9 child routes", () => {
      const businessToolsGroup = MAIN_NAV_ROUTES.find((g) => g.label === "BUSINESS TOOLS");
      expect(businessToolsGroup).toBeDefined();

      const crmItem = businessToolsGroup?.items.find((item) => item.title === "CRM");
      expect(crmItem).toBeDefined();
      expect(crmItem?.url).toBe(ROUTE_PATHS.crm);
      expect(crmItem?.badge).toBe("NEW");
      expect(crmItem?.children).toBeDefined();
      expect(crmItem?.children?.length).toBe(9);

      const childTitles = crmItem?.children?.map((c) => c.title);
      expect(childTitles).toEqual([
        "Dashboard",
        "Attendance",
        "Salary",
        "Tasks",
        "Meet",
        "Broadcasts",
        "AI Assistant",
        "Support",
        "Role Management",
      ]);
    });
  });
});
