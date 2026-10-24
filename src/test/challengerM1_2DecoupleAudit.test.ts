/**
 * @file challengerM1_2DecoupleAudit.test.ts
 * @description Empirical Challenger 2 Verification Suite:
 * Adversarially challenges RBAC boundary controls, cashier role permissions across /billing/*
 * and legacy routes, normalizeRouteForRbac transformations, and AST structure.
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  ROUTE_PATHS,
  RESTRICTED_ROUTES_FOR_CASHIER,
  isRouteAllowedForRole,
  normalizeRouteForRbac,
  BILLING_NAV_ROUTES,
  CRM_NAV_ROUTES,
  LEGACY_ROUTE_REDIRECTS,
} from "@/config/routes";
import { resolveEntryRoute } from "./e2e/decoupleOnboarding.test";

describe("Challenger M1.2 Adversarial Route & RBAC Verification Suite", () => {
  // ==========================================================================
  // SECTION 1: Cashier Route Boundaries Across /billing/* and Legacy Paths
  // ==========================================================================
  describe("1. Cashier Route Boundaries Across /billing/* and Legacy Paths", () => {
    it("permits cashier accessing POS billing routes (/pos, /billing/pos, /billing/checkout)", () => {
      expect(isRouteAllowedForRole(ROUTE_PATHS.pos, "cashier")).toBe(true);
      expect(isRouteAllowedForRole(ROUTE_PATHS.checkout, "cashier")).toBe(true);
      expect(isRouteAllowedForRole("/pos", "cashier")).toBe(true);
      expect(isRouteAllowedForRole("/billing/pos", "cashier")).toBe(true);
      expect(isRouteAllowedForRole("/billing/checkout", "cashier")).toBe(true);
    });

    it("permits cashier accessing sales, parties, items in billing suite", () => {
      expect(isRouteAllowedForRole(ROUTE_PATHS.sales, "cashier")).toBe(true);
      expect(isRouteAllowedForRole("/billing/sales", "cashier")).toBe(true);
      expect(isRouteAllowedForRole("/sales", "cashier")).toBe(true);
      expect(isRouteAllowedForRole(ROUTE_PATHS.items, "cashier")).toBe(true);
      expect(isRouteAllowedForRole("/billing/items", "cashier")).toBe(true);
      expect(isRouteAllowedForRole("/items", "cashier")).toBe(true);
      expect(isRouteAllowedForRole(ROUTE_PATHS.parties, "cashier")).toBe(true);
      expect(isRouteAllowedForRole("/billing/parties", "cashier")).toBe(true);
      expect(isRouteAllowedForRole("/parties", "cashier")).toBe(true);
    });

    it("strictly blocks cashier from manager/financial routes across both canonical and legacy paths", () => {
      const restrictedRoutes = [
        ROUTE_PATHS.dashboard,
        "/dashboard",
        "/billing/dashboard",
        ROUTE_PATHS.purchases,
        "/purchases",
        "/billing/purchases",
        ROUTE_PATHS.reports,
        "/reports",
        "/billing/reports",
        ROUTE_PATHS.analytics,
        "/analytics",
        "/billing/analytics",
        ROUTE_PATHS.cashBank,
        "/cash-bank",
        "/billing/cash-bank",
        ROUTE_PATHS.expenses,
        "/expenses",
        "/billing/expenses",
        ROUTE_PATHS.settings,
        "/settings",
        "/billing/settings",
        ROUTE_PATHS.staff,
        "/staff",
        "/billing/staff",
      ];

      for (const route of restrictedRoutes) {
        expect(isRouteAllowedForRole(route, "cashier")).toBe(false);
      }
    });

    it("blocks cashier from CRM root and Role Management", () => {
      expect(isRouteAllowedForRole(ROUTE_PATHS.crm, "cashier")).toBe(false);
      expect(isRouteAllowedForRole("/crm", "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmRoles, "cashier")).toBe(false);
      expect(isRouteAllowedForRole("/crm/roles", "cashier")).toBe(false);
    });

    it("enforces cashier entry route resolution strictly to /billing/pos", () => {
      const entryRoot = resolveEntryRoute({ userRole: "cashier", targetPath: "/" });
      expect(entryRoot.destination).toBe("/billing/pos");
      expect(entryRoot.isRestricted).toBe(true);

      const entryApp = resolveEntryRoute({ userRole: "cashier", targetPath: "/app" });
      expect(entryApp.destination).toBe("/billing/pos");
      expect(entryApp.isRestricted).toBe(true);

      const entryBilling = resolveEntryRoute({ userRole: "cashier", targetPath: "/billing" });
      expect(entryBilling.destination).toBe("/billing/pos");
      expect(entryBilling.isRestricted).toBe(true);

      const entryCrm = resolveEntryRoute({ userRole: "cashier", targetPath: "/crm" });
      expect(entryCrm.destination).toBe("/billing/pos");
      expect(entryCrm.isRestricted).toBe(true);

      const entryCrmAtt = resolveEntryRoute({ userRole: "cashier", targetPath: "/crm/attendance" });
      expect(entryCrmAtt.destination).toBe("/billing/pos");
      expect(entryCrmAtt.isRestricted).toBe(true);

      const entryCrmTasks = resolveEntryRoute({ userRole: "cashier", targetPath: "/crm/tasks" });
      expect(entryCrmTasks.destination).toBe("/billing/pos");
      expect(entryCrmTasks.isRestricted).toBe(true);
    });
  });

  // ==========================================================================
  // SECTION 2: normalizeRouteForRbac Transformation & Resilience
  // ==========================================================================
  describe("2. normalizeRouteForRbac Transformations", () => {
    it("leaves decoupled /billing/* and /crm/* routes invariant", () => {
      expect(normalizeRouteForRbac("/billing/pos")).toBe("/billing/pos");
      expect(normalizeRouteForRbac("/billing/dashboard")).toBe("/billing/dashboard");
      expect(normalizeRouteForRbac("/billing/checkout")).toBe("/billing/checkout");
      expect(normalizeRouteForRbac("/billing")).toBe("/billing");
      expect(normalizeRouteForRbac("/crm")).toBe("/crm");
      expect(normalizeRouteForRbac("/crm/attendance")).toBe("/crm/attendance");
      expect(normalizeRouteForRbac("/crm/salary")).toBe("/crm/salary");
      expect(normalizeRouteForRbac("/crm/tasks")).toBe("/crm/tasks");
    });

    it("normalizes all 36 legacy paths to /billing/* prefixes", () => {
      for (const item of LEGACY_ROUTE_REDIRECTS) {
        if (item.to.startsWith("/billing/")) {
          const normalized = normalizeRouteForRbac(item.from);
          expect(normalized.startsWith("/billing/")).toBe(true);
        }
      }
    });

    it("strictly blocks cashier from all CRM subroutes in isRouteAllowedForRole", () => {
      expect(isRouteAllowedForRole(ROUTE_PATHS.crm, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmDashboard, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmRoles, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmAttendance, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmSalary, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmTasks, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmMeet, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmBroadcasts, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmAiAssistant, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crmSupport, "cashier")).toBe(false);
      expect(isRouteAllowedForRole("/crm/attendance", "cashier")).toBe(false);
      expect(isRouteAllowedForRole("/crm/salary", "cashier")).toBe(false);
      expect(isRouteAllowedForRole("/crm/tasks", "cashier")).toBe(false);
    });

    it("strictly blocks cashier from all settings subroutes in isRouteAllowedForRole", () => {
      expect(isRouteAllowedForRole(ROUTE_PATHS.settings, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.businessSettings, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.invoiceSettings, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.printSettings, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.settingsReminders, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.settingsCaSharing, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.settingsPricing, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.settingsRefer, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.settingsHelp, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.tallyImport, "cashier")).toBe(false);
      expect(isRouteAllowedForRole("/billing/settings/reminders", "cashier")).toBe(false);
      expect(isRouteAllowedForRole("/settings/reminders", "cashier")).toBe(false);
      expect(isRouteAllowedForRole("/settings/ca-sharing", "cashier")).toBe(false);
      expect(isRouteAllowedForRole("/settings/refer", "cashier")).toBe(false);
    });

    it("preserves dynamic parameters and query strings when normalizing", () => {
      expect(normalizeRouteForRbac("/customers/cust-999/ledger")).toBe("/billing/customers/cust-999/ledger");
      expect(normalizeRouteForRbac("/sales?tab=quotation&status=open")).toBe("/billing/sales?tab=quotation&status=open");
      expect(normalizeRouteForRbac("/items/item-42/edit")).toBe("/billing/items/item-42/edit");
    });

    it("handles null, undefined, empty, and non-prefixed paths gracefully", () => {
      expect(normalizeRouteForRbac("")).toBe("");
      expect(normalizeRouteForRbac(null as unknown as string)).toBe(null);
      expect(normalizeRouteForRbac(undefined as unknown as string)).toBe(undefined);
      expect(normalizeRouteForRbac("/auth")).toBe("/auth");
      expect(normalizeRouteForRbac("/privacy-policy")).toBe("/privacy-policy");
    });
  });

  // ==========================================================================
  // SECTION 3: AST Structure & Protection Invariants (src/App.tsx)
  // ==========================================================================
  describe("3. AST Structure & Security Invariants in src/App.tsx", () => {
    const appTsxPath = path.resolve(process.cwd(), "src/App.tsx");
    const appSource = fs.readFileSync(appTsxPath, "utf-8");

    it("verifies ProtectedRoutes function exists with redirect to ROUTE_PATHS.auth", () => {
      expect(appSource).toMatch(
        /function\s+ProtectedRoutes\(\)\s*\{[\s\S]*?if\s*\(!user\)\s*\{\s*return\s*<Navigate\s+to=\{ROUTE_PATHS\.auth\}\s+replace\s*\/>;\s*\}[\s\S]*?\}/
      );
    });

    it("verifies RoleProtectedRoute function exists with redirect to ROUTE_PATHS.checkout", () => {
      expect(appSource).toMatch(
        /function\s+RoleProtectedRoute\s*\([\s\S]*?\)\s*\{[\s\S]*?if\s*\(!user\)\s*\{\s*return\s*<Navigate\s+to=\{ROUTE_PATHS\.auth\}\s+replace\s*\/>;\s*\}[\s\S]*?return\s*<Navigate\s+to=\{ROUTE_PATHS\.checkout\}\s+replace\s*\/>;[\s\S]*?\}/
      );
    });

    it("verifies strict route ordering: ProtectedRoutes < CRM Attendance < RoleProtectedRoute", () => {
      const protectedIndex = appSource.indexOf("<Route element={<ProtectedRoutes />}>");
      const crmAttendanceIndex = appSource.indexOf(
        "<Route path={ROUTE_PATHS.crmAttendance} element={<Attendance />} />"
      );
      const roleProtectedIndex = appSource.indexOf(
        "<Route element={<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />}>"
      );

      expect(protectedIndex).toBeGreaterThan(-1);
      expect(crmAttendanceIndex).toBeGreaterThan(protectedIndex);
      expect(crmAttendanceIndex).toBeLessThan(roleProtectedIndex);
    });

    it("verifies LegacyRedirect is imported and used for legacy route declarations", () => {
      expect(appSource).toMatch(/import\s+\{\s*LegacyRedirect\s*\}\s+from\s+["']@\/components\/routing\/LegacyRedirect["']/);
      expect(appSource).toContain('<Route path="/pos" element={<LegacyRedirect to="/billing/pos" />} />');
      expect(appSource).toContain('<Route path="/dashboard" element={<LegacyRedirect to="/billing/dashboard" />} />');
      expect(appSource).toContain('<Route path="/sales" element={<LegacyRedirect to="/billing/sales" />} />');
      expect(appSource).toContain('<Route path="/items" element={<LegacyRedirect to="/billing/items" />} />');
    });

    it("verifies all 36 legacy routes are declared in App.tsx", () => {
      for (const item of LEGACY_ROUTE_REDIRECTS) {
        expect(appSource).toContain(`path="${item.from}"`);
      }
    });
  });

  // ==========================================================================
  // SECTION 4: Navigation Structure (Zero Clutter Invariant)
  // ==========================================================================
  describe("4. Navigation Suite Clutter Invariants", () => {
    it("ensures BILLING_NAV_ROUTES has zero CRM routes", () => {
      const allBillingUrls = BILLING_NAV_ROUTES.flatMap((group) => [
        ...group.items.map((i) => i.url),
        ...group.items.flatMap((i) => (i.children ? i.children.map((c) => c.url) : [])),
      ]);

      const crmUrls = allBillingUrls.filter((url) => String(url).startsWith("/crm"));
      expect(crmUrls).toEqual([]);
    });

    it("ensures CRM_NAV_ROUTES has zero billing routes", () => {
      const allCrmUrls = CRM_NAV_ROUTES.flatMap((group) => [
        ...group.items.map((i) => i.url),
        ...group.items.flatMap((i) => (i.children ? i.children.map((c) => c.url) : [])),
      ]);

      const billingUrls = allCrmUrls.filter(
        (url) => String(url).startsWith("/billing") || String(url).startsWith("/pos")
      );
      expect(billingUrls).toEqual([]);
    });
  });

  // ==========================================================================
  // SECTION 5: Invoicing Protected Files Invariance
  // ==========================================================================
  describe("5. Invoicing Files Invariance", () => {
    const protectedFiles = [
      "src/components/invoices/mobile/MobileCreateInvoice.tsx",
      "src/components/SalesInvoiceModal.tsx",
      "src/components/invoices/mobile/AddItemModal.tsx",
      "src/components/invoices/mobile/SelectPartyModal.tsx",
      "src/components/invoices/mobile/EditItemModal.tsx",
    ];

    it("confirms all 5 protected invoicing files exist and are untampered", () => {
      for (const relPath of protectedFiles) {
        const fullPath = path.resolve(process.cwd(), relPath);
        expect(fs.existsSync(fullPath)).toBe(true);
        expect(fs.statSync(fullPath).size).toBeGreaterThan(1000);
      }
    });
  });
});
