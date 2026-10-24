import { describe, it, expect } from "vitest";
import {
  isRouteAllowedForRole,
  normalizeRouteForRbac,
  RESTRICTED_ROUTES_FOR_CASHIER,
  ROUTE_PATHS,
} from "@/config/routes";

describe("Adversarial Cashier RBAC Boundary & Route Gating Stress Suite", () => {
  // ==========================================================================
  // SECTION 1: CRM Route Matrix Oracle
  // ==========================================================================
  describe("1. CRM Route Denial Oracle for Cashier", () => {
    const crmBaseRoutes = [
      ROUTE_PATHS.crm,
      ROUTE_PATHS.crmDashboard,
      ROUTE_PATHS.crmAttendance,
      ROUTE_PATHS.crmSalary,
      ROUTE_PATHS.crmTasks,
      ROUTE_PATHS.crmMeet,
      ROUTE_PATHS.crmBroadcasts,
      ROUTE_PATHS.crmAiAssistant,
      ROUTE_PATHS.crmSupport,
      ROUTE_PATHS.crmRoles,
    ];

    it("strictly blocks cashier from all canonical CRM routes", () => {
      for (const route of crmBaseRoutes) {
        expect(
          isRouteAllowedForRole(route, "cashier"),
          `Expected cashier to be blocked from ${route}`
        ).toBe(false);
      }
    });

    it("strictly blocks cashier from CRM routes with trailing slashes", () => {
      for (const route of crmBaseRoutes) {
        const slashRoute = `${route}/`;
        expect(
          isRouteAllowedForRole(slashRoute, "cashier"),
          `Expected cashier to be blocked from trailing slash: ${slashRoute}`
        ).toBe(false);
      }
    });

    it("strictly blocks cashier from CRM routes with query strings & search params", () => {
      const queryVariations = [
        "?tab=history",
        "?date=2026-10-24",
        "?filter=pending&sort=asc",
        "?orgId=org-12345",
        "?token=malicious_token",
      ];

      for (const route of crmBaseRoutes) {
        for (const q of queryVariations) {
          const queryRoute = `${route}${q}`;
          expect(
            isRouteAllowedForRole(queryRoute, "cashier"),
            `Expected cashier to be blocked from query route: ${queryRoute}`
          ).toBe(false);
        }
      }
    });

    it("strictly blocks cashier from deep nested CRM subpaths", () => {
      const deepNestedCrmPaths = [
        "/crm/attendance/records/monthly",
        "/crm/attendance/live-clock",
        "/crm/salary/payslips/2026-10",
        "/crm/salary/advances/approve",
        "/crm/tasks/view/task-883",
        "/crm/tasks/kanban",
        "/crm/roles/new/permissions",
        "/crm/meet/rooms/executive",
        "/crm/broadcasts/compose",
        "/crm/ai-assistant/chat",
        "/crm/support/ticket/999",
        "/crm/unregistered/future/route",
      ];

      for (const nestedPath of deepNestedCrmPaths) {
        expect(
          isRouteAllowedForRole(nestedPath, "cashier"),
          `Expected cashier to be blocked from nested CRM path: ${nestedPath}`
        ).toBe(false);
      }
    });

    it("verifies RESTRICTED_ROUTES_FOR_CASHIER explicitly contains all canonical CRM routes", () => {
      for (const route of crmBaseRoutes) {
        expect(
          RESTRICTED_ROUTES_FOR_CASHIER.has(route),
          `Expected ${route} to be present in RESTRICTED_ROUTES_FOR_CASHIER`
        ).toBe(true);
      }
    });
  });

  // ==========================================================================
  // SECTION 2: Settings Route Matrix Oracle
  // ==========================================================================
  describe("2. Settings Route Denial Oracle for Cashier", () => {
    const canonicalSettingsRoutes = [
      ROUTE_PATHS.settings,
      ROUTE_PATHS.businessSettings,
      ROUTE_PATHS.invoiceSettings,
      ROUTE_PATHS.printSettings,
      ROUTE_PATHS.settingsReminders,
      ROUTE_PATHS.settingsCaSharing,
      ROUTE_PATHS.settingsPricing,
      ROUTE_PATHS.settingsRefer,
      ROUTE_PATHS.settingsHelp,
      ROUTE_PATHS.tallyImport,
    ];

    const legacySettingsRoutes = [
      "/settings",
      "/settings/business",
      "/settings/invoice",
      "/settings/print",
      "/settings/reminders",
      "/settings/ca-sharing",
      "/settings/pricing",
      "/settings/refer",
      "/settings/help",
      "/tally-import",
    ];

    it("strictly blocks cashier from all canonical /billing/settings routes", () => {
      for (const route of canonicalSettingsRoutes) {
        expect(
          isRouteAllowedForRole(route, "cashier"),
          `Expected cashier to be blocked from canonical settings: ${route}`
        ).toBe(false);
      }
    });

    it("strictly blocks cashier from all legacy /settings routes", () => {
      for (const route of legacySettingsRoutes) {
        expect(
          isRouteAllowedForRole(route, "cashier"),
          `Expected cashier to be blocked from legacy settings: ${route}`
        ).toBe(false);
      }
    });

    it("strictly blocks cashier from settings routes with trailing slashes & query parameters", () => {
      const variations = [
        "/billing/settings/",
        "/billing/settings/reminders/",
        "/billing/settings?section=sms",
        "/billing/settings/reminders?sms=enabled",
        "/settings/",
        "/settings/reminders/",
        "/settings?section=general",
        "/settings/ca-sharing?client=99",
      ];

      for (const v of variations) {
        expect(
          isRouteAllowedForRole(v, "cashier"),
          `Expected cashier to be blocked from setting variation: ${v}`
        ).toBe(false);
      }
    });

    it("strictly blocks cashier from deep nested settings subroutes", () => {
      const deepSettings = [
        "/billing/settings/reminders/templates/sms",
        "/billing/settings/security/two-factor",
        "/billing/settings/audit/log",
      ];

      for (const s of deepSettings) {
        expect(
          isRouteAllowedForRole(s, "cashier"),
          `Expected cashier to be blocked from deep settings: ${s}`
        ).toBe(false);
      }
    });

    it("verifies RESTRICTED_ROUTES_FOR_CASHIER contains all canonical and legacy settings routes", () => {
      for (const r of canonicalSettingsRoutes) {
        expect(
          RESTRICTED_ROUTES_FOR_CASHIER.has(r),
          `Expected ${r} in RESTRICTED_ROUTES_FOR_CASHIER`
        ).toBe(true);
      }
      for (const r of legacySettingsRoutes) {
        expect(
          RESTRICTED_ROUTES_FOR_CASHIER.has(r),
          `Expected legacy ${r} in RESTRICTED_ROUTES_FOR_CASHIER`
        ).toBe(true);
      }
    });
  });

  // ==========================================================================
  // SECTION 3: Legitimate Cashier POS Access Preservation (Anti-Lockout Oracle)
  // ==========================================================================
  describe("3. Legitimate Cashier POS Access Preservation", () => {
    const legitimateCashierRoutes = [
      ROUTE_PATHS.checkout,
      ROUTE_PATHS.pos,
      ROUTE_PATHS.sales,
      ROUTE_PATHS.salesHistory,
      ROUTE_PATHS.items,
      ROUTE_PATHS.parties,
      ROUTE_PATHS.customers,
      ROUTE_PATHS.storefront,
      ROUTE_PATHS.inventory,
      ROUTE_PATHS.godown,
    ];

    const legitimateLegacyCashierRoutes = [
      "/checkout",
      "/pos",
      "/sales",
      "/sales-history",
      "/items",
      "/parties",
      "/customers",
      "/storefront",
      "/inventory",
      "/godown",
    ];

    it("preserves access for cashier to essential billing and POS paths", () => {
      for (const route of legitimateCashierRoutes) {
        expect(
          isRouteAllowedForRole(route, "cashier"),
          `Expected cashier to HAVE access to ${route}`
        ).toBe(true);
      }
    });

    it("preserves access for cashier to legacy POS paths via automatic normalization", () => {
      for (const route of legitimateLegacyCashierRoutes) {
        expect(
          isRouteAllowedForRole(route, "cashier"),
          `Expected cashier to HAVE access to legacy ${route}`
        ).toBe(true);
      }
    });

    it("confirms administrative and sensitive routes remain denied to cashier", () => {
      const sensitiveBillingRoutes = [
        ROUTE_PATHS.dashboard,
        ROUTE_PATHS.purchases,
        ROUTE_PATHS.purchaseReturns,
        ROUTE_PATHS.reports,
        ROUTE_PATHS.analytics,
        ROUTE_PATHS.cashBank,
        ROUTE_PATHS.expenses,
        ROUTE_PATHS.staff,
        ROUTE_PATHS.activityLog,
        ROUTE_PATHS.eInvoicing,
        ROUTE_PATHS.automatedBills,
        ROUTE_PATHS.barcode,
      ];

      for (const route of sensitiveBillingRoutes) {
        expect(
          isRouteAllowedForRole(route, "cashier"),
          `Expected sensitive billing route ${route} to be DENIED to cashier`
        ).toBe(false);
      }
    });
  });

  // ==========================================================================
  // SECTION 4: Custom Granular Permission Override Hardening
  // ==========================================================================
  describe("4. Custom Granular Permission Override Hardening", () => {
    it("honors explicit custom CRM grant if configured by super admin", () => {
      const allowedWithOverride = isRouteAllowedForRole(
        ROUTE_PATHS.crmAttendance,
        "cashier",
        { crm: true }
      );
      expect(allowedWithOverride).toBe(true);
    });

    it("honors explicit custom CRM denial", () => {
      const deniedWithOverride = isRouteAllowedForRole(
        ROUTE_PATHS.crmAttendance,
        "cashier",
        { crm: false }
      );
      expect(deniedWithOverride).toBe(false);
    });

    it("honors POS restriction override", () => {
      const posRevoked = isRouteAllowedForRole(
        ROUTE_PATHS.pos,
        "cashier",
        { pos: false }
      );
      expect(posRevoked).toBe(false);
    });

    it("denies access when empty or irrelevant custom permissions object is provided", () => {
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmAttendance, "cashier", {})).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmAttendance, "cashier", { dummy: true })).toBe(false);
    });
  });

  // ==========================================================================
  // SECTION 5: Multi-Role Matrix Contrast Oracle
  // ==========================================================================
  describe("5. Multi-Role Matrix Contrast Oracle", () => {
    const fullAccessRoles = ["store_owner", "super_admin", "admin", "owner", "manager", "partner"];
    const limitedRoles = ["stock_manager", "salesman", "delivery_boy", "accountant"];

    it("permits full access roles to access CRM subroutes", () => {
      for (const role of fullAccessRoles) {
        expect(isRouteAllowedForRole(ROUTE_PATHS.crmAttendance, role)).toBe(true);
        expect(isRouteAllowedForRole(ROUTE_PATHS.crmSalary, role)).toBe(true);
        expect(isRouteAllowedForRole(ROUTE_PATHS.crmTasks, role)).toBe(true);
        expect(isRouteAllowedForRole(ROUTE_PATHS.businessSettings, role)).toBe(true);
      }
    });

    it("denies non-CRM limited roles from accessing CRM subroutes", () => {
      for (const role of limitedRoles) {
        expect(
          isRouteAllowedForRole(ROUTE_PATHS.crmAttendance, role),
          `Expected role ${role} to be DENIED /crm/attendance`
        ).toBe(false);
        expect(
          isRouteAllowedForRole(ROUTE_PATHS.crmSalary, role),
          `Expected role ${role} to be DENIED /crm/salary`
        ).toBe(false);
      }
    });
  });

  // ==========================================================================
  // SECTION 6: Defensive Input Sanitization & Robustness
  // ==========================================================================
  describe("6. Defensive Input Sanitization & Robustness", () => {
    it("handles null, undefined, empty, and invalid role/url gracefully", () => {
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmAttendance, null)).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmAttendance, undefined)).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmAttendance, "")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmAttendance, "unknown_role_xyz")).toBe(false);

      expect(isRouteAllowedForRole("", "cashier")).toBe(true); // empty string is not in restricted routes
    });

    it("normalizes legacy query string and dynamic routes accurately", () => {
      expect(normalizeRouteForRbac("/settings/business?tab=tax")).toBe(
        "/billing/settings/business?tab=tax"
      );
      expect(normalizeRouteForRbac("/crm/attendance?date=today")).toBe(
        "/crm/attendance?date=today"
      );
    });
  });
});
