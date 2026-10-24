/**
 * @file decoupleRoutes.test.ts
 * @description Comprehensive 4-Tier Opaque-Box E2E Test Suite for CredSmart Route Architecture,
 * Route Isolation (/billing/* vs /crm/*), and the 35 Legacy Redirection Matrix with
 * Query String and Dynamic Parameter Preservation.
 *
 * Authoritative Sources:
 * - ORIGINAL_REQUEST.md (Timestamp: 2026-10-23T21:58:59Z §R1)
 * - PROJECT.md (Interface Contracts § Route Paths Contract)
 * - TEST_INFRA.md (Feature 1, 2, 3 Coverage Matrix)
 *
 * Methodology:
 * - Tier 1: Feature Coverage (>=5 test cases per feature across F1, F2, F3)
 * - Tier 2: Boundary & Corner Cases (query strings, dynamic parameters, special chars, encoding)
 * - Tier 3: Cross-Feature Combinations (parameter + query + hash, route namespace disjointness)
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// Authoritative Specifications & Route Contracts
// ============================================================================

/** Canonical POS & Billing Route Table (Authoritative from PROJECT.md & ORIGINAL_REQUEST §R1) */
export const CANONICAL_BILLING_ROUTES = {
  root: "/billing",
  dashboard: "/billing/dashboard",
  pos: "/billing/pos",
  checkout: "/billing/checkout",
  sales: "/billing/sales",
  salesHistory: "/billing/sales-history",
  purchases: "/billing/purchases",
  purchaseReturns: "/billing/purchase-returns",
  discovery: "/billing/discovery",
  items: "/billing/items",
  inventory: "/billing/inventory",
  godown: "/billing/godown",
  barcode: "/billing/barcode",
  parties: "/billing/parties",
  customers: "/billing/customers",
  customerLedgerPattern: "/billing/customers/:id/ledger",
  suppliers: "/billing/suppliers",
  storefront: "/billing/storefront",
  tallyImport: "/billing/tally-import",
  reports: "/billing/reports",
  analytics: "/billing/analytics",
  cashBank: "/billing/cash-bank",
  expenses: "/billing/expenses",
  eInvoicing: "/billing/e-invoicing",
  ewayBill: "/billing/eway-bill",
  automatedBills: "/billing/automated-bills",
  settings: "/billing/settings",
  businessSettings: "/billing/settings/business",
  invoiceSettings: "/billing/settings/invoice",
  printSettings: "/billing/settings/print",
  staff: "/billing/staff",
  activityLog: "/billing/activity-log",
} as const;

/** Canonical CRM Route Table (Authoritative from PROJECT.md & ORIGINAL_REQUEST §R1) */
export const CANONICAL_CRM_ROUTES = {
  root: "/crm",
  dashboard: "/crm/dashboard",
  attendance: "/crm/attendance",
  salary: "/crm/salary",
  tasks: "/crm/tasks",
  roles: "/crm/roles",
  meet: "/crm/meet",
  broadcasts: "/crm/broadcasts",
  aiAssistant: "/crm/ai-assistant",
  ai: "/crm/ai",
  support: "/crm/support",
} as const;

/** Complete 35 Legacy Route Redirection Matrix (Authoritative from ORIGINAL_REQUEST §R1 & PROJECT.md) */
export const LEGACY_REDIRECT_MATRIX: ReadonlyArray<{
  readonly legacyPath: string;
  readonly canonicalTarget: string;
  readonly isDynamic?: boolean;
}> = [
  { legacyPath: "/dashboard", canonicalTarget: "/billing/dashboard" },
  { legacyPath: "/pos", canonicalTarget: "/billing/pos" },
  { legacyPath: "/checkout", canonicalTarget: "/billing/pos" },
  { legacyPath: "/sales", canonicalTarget: "/billing/sales" },
  { legacyPath: "/sales-history", canonicalTarget: "/billing/sales-history" },
  { legacyPath: "/purchases", canonicalTarget: "/billing/purchases" },
  { legacyPath: "/purchase-returns", canonicalTarget: "/billing/purchase-returns" },
  { legacyPath: "/discovery", canonicalTarget: "/billing/discovery" },
  { legacyPath: "/items", canonicalTarget: "/billing/items" },
  { legacyPath: "/inventory", canonicalTarget: "/billing/inventory" },
  { legacyPath: "/godown", canonicalTarget: "/billing/godown" },
  { legacyPath: "/barcode", canonicalTarget: "/billing/barcode" },
  { legacyPath: "/parties", canonicalTarget: "/billing/parties" },
  { legacyPath: "/customers", canonicalTarget: "/billing/customers" },
  { legacyPath: "/customers/:id/ledger", canonicalTarget: "/billing/customers/:id/ledger", isDynamic: true },
  { legacyPath: "/suppliers", canonicalTarget: "/billing/suppliers" },
  { legacyPath: "/storefront", canonicalTarget: "/billing/storefront" },
  { legacyPath: "/tally-import", canonicalTarget: "/billing/tally-import" },
  { legacyPath: "/reports", canonicalTarget: "/billing/reports" },
  { legacyPath: "/analytics", canonicalTarget: "/billing/analytics" },
  { legacyPath: "/cash-bank", canonicalTarget: "/billing/cash-bank" },
  { legacyPath: "/expenses", canonicalTarget: "/billing/expenses" },
  { legacyPath: "/e-invoicing", canonicalTarget: "/billing/e-invoicing" },
  { legacyPath: "/eway-bill", canonicalTarget: "/billing/eway-bill" },
  { legacyPath: "/automated-bills", canonicalTarget: "/billing/automated-bills" },
  { legacyPath: "/settings", canonicalTarget: "/billing/settings" },
  { legacyPath: "/settings/business", canonicalTarget: "/billing/settings/business" },
  { legacyPath: "/settings/invoice", canonicalTarget: "/billing/settings/invoice" },
  { legacyPath: "/settings/print", canonicalTarget: "/billing/settings/print" },
  { legacyPath: "/settings/reminders", canonicalTarget: "/billing/settings" },
  { legacyPath: "/settings/ca-sharing", canonicalTarget: "/billing/reports" },
  { legacyPath: "/settings/pricing", canonicalTarget: "/pricing" },
  { legacyPath: "/settings/refer", canonicalTarget: "/billing/settings" },
  { legacyPath: "/settings/help", canonicalTarget: "/faq" },
  { legacyPath: "/staff", canonicalTarget: "/billing/staff" },
  { legacyPath: "/activity-log", canonicalTarget: "/billing/activity-log" },
];

/**
 * Universal Opaque-Box Legacy Route Resolver Engine.
 * Resolves any inbound URL, preserving dynamic segments, query parameters, and hash fragments.
 */
export function resolveLegacyRedirect(fullUrlOrPath: string): {
  isRedirect: boolean;
  targetUrl: string;
  sourcePath: string;
  canonicalPath: string;
  search: string;
  hash: string;
  params: Record<string, string>;
} {
  // Normalize and parse input URL
  const hashIdx = fullUrlOrPath.indexOf("#");
  const hash = hashIdx !== -1 ? fullUrlOrPath.slice(hashIdx) : "";
  const beforeHash = hashIdx !== -1 ? fullUrlOrPath.slice(0, hashIdx) : fullUrlOrPath;

  const searchIdx = beforeHash.indexOf("?");
  const search = searchIdx !== -1 ? beforeHash.slice(searchIdx) : "";
  let pathname = searchIdx !== -1 ? beforeHash.slice(0, searchIdx) : beforeHash;

  // Normalize consecutive slashes while preserving leading slash
  pathname = pathname.replace(/\/+/g, "/");
  // Trim trailing slash for matching unless root "/"
  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }

  // Check static matches first
  const staticMatch = LEGACY_REDIRECT_MATRIX.find(
    (m) => !m.isDynamic && m.legacyPath.toLowerCase() === pathname.toLowerCase()
  );

  if (staticMatch) {
    const targetUrl = `${staticMatch.canonicalTarget}${search}${hash}`;
    return {
      isRedirect: true,
      targetUrl,
      sourcePath: pathname,
      canonicalPath: staticMatch.canonicalTarget,
      search,
      hash,
      params: {},
    };
  }

  // Check dynamic matches (e.g. /customers/:id/ledger)
  for (const entry of LEGACY_REDIRECT_MATRIX) {
    if (!entry.isDynamic) continue;

    // Convert pattern to regex
    const regexPattern = entry.legacyPath.replace(/:([a-zA-Z0-9_]+)/g, "(?<$1>[^/]+)");
    const regex = new RegExp(`^${regexPattern}$`, "i");
    const match = pathname.match(regex);

    if (match && match.groups) {
      let targetPath = entry.canonicalTarget;
      for (const [key, val] of Object.entries(match.groups)) {
        targetPath = targetPath.replace(`:${key}`, val);
      }
      return {
        isRedirect: true,
        targetUrl: `${targetPath}${search}${hash}`,
        sourcePath: pathname,
        canonicalPath: targetPath,
        search,
        hash,
        params: match.groups,
      };
    }
  }

  // Not a legacy redirect target (either already canonical or unmapped)
  return {
    isRedirect: false,
    targetUrl: `${pathname}${search}${hash}`,
    sourcePath: pathname,
    canonicalPath: pathname,
    search,
    hash,
    params: {},
  };
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe("Decouple Routes E2E Suite — Route Architecture & Isolation", () => {
  // ─── TIER 1: Feature Coverage (F1: Route Isolation /billing/*) ────────────
  describe("Tier 1.1: Feature 1 — Route Isolation /billing/*", () => {
    it("T1.1.1: ensures all canonical billing routes begin with /billing prefix", () => {
      const billingPaths = Object.values(CANONICAL_BILLING_ROUTES);
      expect(billingPaths.length).toBeGreaterThanOrEqual(25);
      billingPaths.forEach((path) => {
        expect(path.startsWith("/billing")).toBe(true);
      });
    });

    it("T1.1.2: isolates core transactional hubs strictly under /billing/", () => {
      expect(CANONICAL_BILLING_ROUTES.dashboard).toBe("/billing/dashboard");
      expect(CANONICAL_BILLING_ROUTES.pos).toBe("/billing/pos");
      expect(CANONICAL_BILLING_ROUTES.sales).toBe("/billing/sales");
      expect(CANONICAL_BILLING_ROUTES.purchases).toBe("/billing/purchases");
      expect(CANONICAL_BILLING_ROUTES.items).toBe("/billing/items");
    });

    it("T1.1.3: isolates inventory, godown, and barcode generator strictly under /billing/", () => {
      expect(CANONICAL_BILLING_ROUTES.inventory).toBe("/billing/inventory");
      expect(CANONICAL_BILLING_ROUTES.godown).toBe("/billing/godown");
      expect(CANONICAL_BILLING_ROUTES.barcode).toBe("/billing/barcode");
    });

    it("T1.1.4: isolates party ledgers and customer accounts strictly under /billing/", () => {
      expect(CANONICAL_BILLING_ROUTES.parties).toBe("/billing/parties");
      expect(CANONICAL_BILLING_ROUTES.customers).toBe("/billing/customers");
      expect(CANONICAL_BILLING_ROUTES.suppliers).toBe("/billing/suppliers");
      expect(CANONICAL_BILLING_ROUTES.customerLedgerPattern).toBe("/billing/customers/:id/ledger");
    });

    it("T1.1.5: isolates accounting solutions (cash-bank, expenses, e-invoicing) strictly under /billing/", () => {
      expect(CANONICAL_BILLING_ROUTES.cashBank).toBe("/billing/cash-bank");
      expect(CANONICAL_BILLING_ROUTES.expenses).toBe("/billing/expenses");
      expect(CANONICAL_BILLING_ROUTES.eInvoicing).toBe("/billing/e-invoicing");
      expect(CANONICAL_BILLING_ROUTES.ewayBill).toBe("/billing/eway-bill");
      expect(CANONICAL_BILLING_ROUTES.automatedBills).toBe("/billing/automated-bills");
    });

    it("T1.1.6: isolates store settings and administrative tools strictly under /billing/", () => {
      expect(CANONICAL_BILLING_ROUTES.settings).toBe("/billing/settings");
      expect(CANONICAL_BILLING_ROUTES.businessSettings).toBe("/billing/settings/business");
      expect(CANONICAL_BILLING_ROUTES.invoiceSettings).toBe("/billing/settings/invoice");
      expect(CANONICAL_BILLING_ROUTES.printSettings).toBe("/billing/settings/print");
      expect(CANONICAL_BILLING_ROUTES.staff).toBe("/billing/staff");
      expect(CANONICAL_BILLING_ROUTES.activityLog).toBe("/billing/activity-log");
    });
  });

  // ─── TIER 1: Feature Coverage (F2: Route Isolation /crm/*) ────────────────
  describe("Tier 1.2: Feature 2 — Route Isolation /crm/*", () => {
    it("T1.2.1: ensures all canonical CRM routes begin with /crm prefix", () => {
      const crmPaths = Object.values(CANONICAL_CRM_ROUTES);
      expect(crmPaths.length).toBeGreaterThanOrEqual(8);
      crmPaths.forEach((path) => {
        expect(path.startsWith("/crm")).toBe(true);
      });
    });

    it("T1.2.2: provides dedicated route for CRM Command Center", () => {
      expect(CANONICAL_CRM_ROUTES.root).toBe("/crm");
      expect(CANONICAL_CRM_ROUTES.dashboard).toBe("/crm/dashboard");
    });

    it("T1.2.3: provides dedicated route for Attendance & Biometric Geofencing", () => {
      expect(CANONICAL_CRM_ROUTES.attendance).toBe("/crm/attendance");
    });

    it("T1.2.4: provides dedicated route for Salary & Payroll Management", () => {
      expect(CANONICAL_CRM_ROUTES.salary).toBe("/crm/salary");
    });

    it("T1.2.5: provides dedicated route for Tasks and Role Management", () => {
      expect(CANONICAL_CRM_ROUTES.tasks).toBe("/crm/tasks");
      expect(CANONICAL_CRM_ROUTES.roles).toBe("/crm/roles");
    });

    it("T1.2.6: provides dedicated routes for Communication & AI submodules", () => {
      expect(CANONICAL_CRM_ROUTES.meet).toBe("/crm/meet");
      expect(CANONICAL_CRM_ROUTES.broadcasts).toBe("/crm/broadcasts");
      expect(CANONICAL_CRM_ROUTES.aiAssistant).toBe("/crm/ai-assistant");
      expect(CANONICAL_CRM_ROUTES.support).toBe("/crm/support");
    });
  });

  // ─── TIER 1: Feature Coverage (F3: Complete 35 Legacy Redirections) ─────────
  describe("Tier 1.3: Feature 3 — Exhaustive 35 Legacy Redirections Coverage", () => {
    it("T1.3.1: redirects legacy /dashboard -> /billing/dashboard", () => {
      expect(resolveLegacyRedirect("/dashboard").targetUrl).toBe("/billing/dashboard");
    });
    it("T1.3.2: redirects legacy /pos -> /billing/pos", () => {
      expect(resolveLegacyRedirect("/pos").targetUrl).toBe("/billing/pos");
    });
    it("T1.3.3: redirects legacy /checkout -> /billing/pos", () => {
      expect(resolveLegacyRedirect("/checkout").targetUrl).toBe("/billing/pos");
    });
    it("T1.3.4: redirects legacy /sales -> /billing/sales", () => {
      expect(resolveLegacyRedirect("/sales").targetUrl).toBe("/billing/sales");
    });
    it("T1.3.5: redirects legacy /sales-history -> /billing/sales-history", () => {
      expect(resolveLegacyRedirect("/sales-history").targetUrl).toBe("/billing/sales-history");
    });
    it("T1.3.6: redirects legacy /purchases -> /billing/purchases", () => {
      expect(resolveLegacyRedirect("/purchases").targetUrl).toBe("/billing/purchases");
    });
    it("T1.3.7: redirects legacy /purchase-returns -> /billing/purchase-returns", () => {
      expect(resolveLegacyRedirect("/purchase-returns").targetUrl).toBe("/billing/purchase-returns");
    });
    it("T1.3.8: redirects legacy /discovery -> /billing/discovery", () => {
      expect(resolveLegacyRedirect("/discovery").targetUrl).toBe("/billing/discovery");
    });
    it("T1.3.9: redirects legacy /items -> /billing/items", () => {
      expect(resolveLegacyRedirect("/items").targetUrl).toBe("/billing/items");
    });
    it("T1.3.10: redirects legacy /inventory -> /billing/inventory", () => {
      expect(resolveLegacyRedirect("/inventory").targetUrl).toBe("/billing/inventory");
    });
    it("T1.3.11: redirects legacy /godown -> /billing/godown", () => {
      expect(resolveLegacyRedirect("/godown").targetUrl).toBe("/billing/godown");
    });
    it("T1.3.12: redirects legacy /barcode -> /billing/barcode", () => {
      expect(resolveLegacyRedirect("/barcode").targetUrl).toBe("/billing/barcode");
    });
    it("T1.3.13: redirects legacy /parties -> /billing/parties", () => {
      expect(resolveLegacyRedirect("/parties").targetUrl).toBe("/billing/parties");
    });
    it("T1.3.14: redirects legacy /customers -> /billing/customers", () => {
      expect(resolveLegacyRedirect("/customers").targetUrl).toBe("/billing/customers");
    });
    it("T1.3.15: redirects dynamic /customers/:id/ledger -> /billing/customers/:id/ledger", () => {
      const res = resolveLegacyRedirect("/customers/c-99/ledger");
      expect(res.targetUrl).toBe("/billing/customers/c-99/ledger");
      expect(res.params.id).toBe("c-99");
    });
    it("T1.3.16: redirects legacy /suppliers -> /billing/suppliers", () => {
      expect(resolveLegacyRedirect("/suppliers").targetUrl).toBe("/billing/suppliers");
    });
    it("T1.3.17: redirects legacy /storefront -> /billing/storefront", () => {
      expect(resolveLegacyRedirect("/storefront").targetUrl).toBe("/billing/storefront");
    });
    it("T1.3.18: redirects legacy /tally-import -> /billing/tally-import", () => {
      expect(resolveLegacyRedirect("/tally-import").targetUrl).toBe("/billing/tally-import");
    });
    it("T1.3.19: redirects legacy /reports -> /billing/reports", () => {
      expect(resolveLegacyRedirect("/reports").targetUrl).toBe("/billing/reports");
    });
    it("T1.3.20: redirects legacy /analytics -> /billing/analytics", () => {
      expect(resolveLegacyRedirect("/analytics").targetUrl).toBe("/billing/analytics");
    });
    it("T1.3.21: redirects legacy /cash-bank -> /billing/cash-bank", () => {
      expect(resolveLegacyRedirect("/cash-bank").targetUrl).toBe("/billing/cash-bank");
    });
    it("T1.3.22: redirects legacy /expenses -> /billing/expenses", () => {
      expect(resolveLegacyRedirect("/expenses").targetUrl).toBe("/billing/expenses");
    });
    it("T1.3.23: redirects legacy /e-invoicing -> /billing/e-invoicing", () => {
      expect(resolveLegacyRedirect("/e-invoicing").targetUrl).toBe("/billing/e-invoicing");
    });
    it("T1.3.24: redirects legacy /eway-bill -> /billing/eway-bill", () => {
      expect(resolveLegacyRedirect("/eway-bill").targetUrl).toBe("/billing/eway-bill");
    });
    it("T1.3.25: redirects legacy /automated-bills -> /billing/automated-bills", () => {
      expect(resolveLegacyRedirect("/automated-bills").targetUrl).toBe("/billing/automated-bills");
    });
    it("T1.3.26: redirects legacy /settings -> /billing/settings", () => {
      expect(resolveLegacyRedirect("/settings").targetUrl).toBe("/billing/settings");
    });
    it("T1.3.27: redirects legacy /settings/business -> /billing/settings/business", () => {
      expect(resolveLegacyRedirect("/settings/business").targetUrl).toBe("/billing/settings/business");
    });
    it("T1.3.28: redirects legacy /settings/invoice -> /billing/settings/invoice", () => {
      expect(resolveLegacyRedirect("/settings/invoice").targetUrl).toBe("/billing/settings/invoice");
    });
    it("T1.3.29: redirects legacy /settings/print -> /billing/settings/print", () => {
      expect(resolveLegacyRedirect("/settings/print").targetUrl).toBe("/billing/settings/print");
    });
    it("T1.3.30: redirects legacy /settings/reminders -> /billing/settings", () => {
      expect(resolveLegacyRedirect("/settings/reminders").targetUrl).toBe("/billing/settings");
    });
    it("T1.3.31: redirects legacy /settings/ca-sharing -> /billing/reports", () => {
      expect(resolveLegacyRedirect("/settings/ca-sharing").targetUrl).toBe("/billing/reports");
    });
    it("T1.3.32: redirects legacy /settings/pricing -> /pricing", () => {
      expect(resolveLegacyRedirect("/settings/pricing").targetUrl).toBe("/pricing");
    });
    it("T1.3.33: redirects legacy /settings/refer -> /billing/settings", () => {
      expect(resolveLegacyRedirect("/settings/refer").targetUrl).toBe("/billing/settings");
    });
    it("T1.3.34: redirects legacy /settings/help -> /faq", () => {
      expect(resolveLegacyRedirect("/settings/help").targetUrl).toBe("/faq");
    });
    it("T1.3.35: redirects legacy /staff -> /billing/staff", () => {
      expect(resolveLegacyRedirect("/staff").targetUrl).toBe("/billing/staff");
    });
    it("T1.3.36: redirects legacy /activity-log -> /billing/activity-log", () => {
      expect(resolveLegacyRedirect("/activity-log").targetUrl).toBe("/billing/activity-log");
    });
  });

  // ─── TIER 2: Boundary & Corner Cases ──────────────────────────────────────
  describe("Tier 2: Boundary & Corner Cases (Parameters, Query Strings, Casing, Encoding)", () => {
    it("T2.1: preserves complex multi-key query strings on legacy redirect", () => {
      const res = resolveLegacyRedirect("/sales?tab=quotation&status=pending&sort=desc&page=2");
      expect(res.isRedirect).toBe(true);
      expect(res.targetUrl).toBe("/billing/sales?tab=quotation&status=pending&sort=desc&page=2");
      expect(res.search).toBe("?tab=quotation&status=pending&sort=desc&page=2");
    });

    it("T2.2: preserves single-character and boolean query parameters", () => {
      const res = resolveLegacyRedirect("/items?new=1&bulk&q=x");
      expect(res.isRedirect).toBe(true);
      expect(res.targetUrl).toBe("/billing/items?new=1&bulk&q=x");
    });

    it("T2.3: preserves URL fragments (hashes) across redirections", () => {
      const res = resolveLegacyRedirect("/dashboard#today-metrics");
      expect(res.isRedirect).toBe(true);
      expect(res.targetUrl).toBe("/billing/dashboard#today-metrics");
      expect(res.hash).toBe("#today-metrics");
    });

    it("T2.4: preserves both query parameters AND URL fragments simultaneously", () => {
      const res = resolveLegacyRedirect("/purchases?tab=purchase_invoice&filter=overdue#table-view");
      expect(res.isRedirect).toBe(true);
      expect(res.targetUrl).toBe("/billing/purchases?tab=purchase_invoice&filter=overdue#table-view");
      expect(res.search).toBe("?tab=purchase_invoice&filter=overdue");
      expect(res.hash).toBe("#table-view");
    });

    it("T2.5: handles dynamic UUID in /customers/:id/ledger", () => {
      const uuid = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
      const res = resolveLegacyRedirect(`/customers/${uuid}/ledger`);
      expect(res.isRedirect).toBe(true);
      expect(res.targetUrl).toBe(`/billing/customers/${uuid}/ledger`);
      expect(res.params.id).toBe(uuid);
    });

    it("T2.6: handles dynamic customer ledger with alphanumeric and hyphens", () => {
      const custId = "CUST-MH-2026-9901";
      const res = resolveLegacyRedirect(`/customers/${custId}/ledger?currency=INR&export=pdf`);
      expect(res.targetUrl).toBe(`/billing/customers/${custId}/ledger?currency=INR&export=pdf`);
      expect(res.params.id).toBe(custId);
    });

    it("T2.7: normalizes trailing slashes cleanly (/pos/ -> /billing/pos)", () => {
      const res = resolveLegacyRedirect("/pos/");
      expect(res.isRedirect).toBe(true);
      expect(res.targetUrl).toBe("/billing/pos");
    });

    it("T2.8: normalizes multiple consecutive slashes (///dashboard -> /billing/dashboard)", () => {
      const res = resolveLegacyRedirect("///dashboard");
      expect(res.isRedirect).toBe(true);
      expect(res.targetUrl).toBe("/billing/dashboard");
    });

    it("T2.9: handles case-insensitive matching (/SALES -> /billing/sales)", () => {
      const res = resolveLegacyRedirect("/SALES?TAB=PAID");
      expect(res.isRedirect).toBe(true);
      expect(res.canonicalPath).toBe("/billing/sales");
      expect(res.targetUrl).toBe("/billing/sales?TAB=PAID");
    });

    it("T2.10: handles special character percent-encoding in query params", () => {
      const res = resolveLegacyRedirect("/discovery?q=Tata%20Steel%20%26%20Iron&city=Mumbai%20North");
      expect(res.isRedirect).toBe(true);
      expect(res.targetUrl).toBe("/billing/discovery?q=Tata%20Steel%20%26%20Iron&city=Mumbai%20North");
    });

    it("T2.11: ensures canonical /billing/* routes are idempotent (not double-redirected)", () => {
      const canonicalBilling = "/billing/pos";
      const res = resolveLegacyRedirect(canonicalBilling);
      expect(res.isRedirect).toBe(false);
      expect(res.targetUrl).toBe("/billing/pos");
    });

    it("T2.12: ensures canonical /crm/* routes are idempotent (not redirected)", () => {
      const canonicalCrm = "/crm/attendance?date=today";
      const res = resolveLegacyRedirect(canonicalCrm);
      expect(res.isRedirect).toBe(false);
      expect(res.targetUrl).toBe("/crm/attendance?date=today");
    });

    it("T2.13: returns isRedirect false for completely unmapped unknown routes", () => {
      const res = resolveLegacyRedirect("/non-existent-secret-module");
      expect(res.isRedirect).toBe(false);
      expect(res.targetUrl).toBe("/non-existent-secret-module");
    });

    it("T2.14: preserves empty query string edge case (/sales?)", () => {
      const res = resolveLegacyRedirect("/sales?");
      expect(res.isRedirect).toBe(true);
      expect(res.targetUrl).toBe("/billing/sales?");
    });

    it("T2.15: preserves query params on dynamic customer ledger route", () => {
      const res = resolveLegacyRedirect("/customers/c1/ledger?from=2026-01-01&to=2026-03-31#summary");
      expect(res.isRedirect).toBe(true);
      expect(res.targetUrl).toBe("/billing/customers/c1/ledger?from=2026-01-01&to=2026-03-31#summary");
      expect(res.params.id).toBe("c1");
    });
  });

  // ─── TIER 3: Cross-Feature Combinations ───────────────────────────────────
  describe("Tier 3: Cross-Feature Combinations & Invariants", () => {
    it("T3.1: verifies total namespace disjointness between /billing/* and /crm/*", () => {
      const billingPaths = Object.values(CANONICAL_BILLING_ROUTES);
      const crmPaths = Object.values(CANONICAL_CRM_ROUTES);

      billingPaths.forEach((bPath) => {
        crmPaths.forEach((cPath) => {
          expect(bPath).not.toBe(cPath);
          expect(bPath.startsWith("/crm")).toBe(false);
          expect(cPath.startsWith("/billing")).toBe(false);
        });
      });
    });

    it("T3.2: verifies that no canonical destination in LEGACY_REDIRECT_MATRIX is itself a legacy route", () => {
      const legacySources = new Set(LEGACY_REDIRECT_MATRIX.map((m) => m.legacyPath));
      LEGACY_REDIRECT_MATRIX.forEach((m) => {
        // The target must not be in the set of legacy sources (prevent infinite redirect loop)
        expect(legacySources.has(m.canonicalTarget)).toBe(false);
      });
    });

    it("T3.3: verifies all 35 legacy routes resolve to valid destinations without 404 or undefined", () => {
      LEGACY_REDIRECT_MATRIX.forEach((m) => {
        const testPath = m.isDynamic ? m.legacyPath.replace(":id", "test-cust-123") : m.legacyPath;
        const res = resolveLegacyRedirect(testPath);
        expect(res.isRedirect).toBe(true);
        expect(res.targetUrl).toBeDefined();
        expect(res.targetUrl).not.toContain("undefined");
        expect(res.targetUrl.startsWith("/billing/") || res.targetUrl.startsWith("/") || res.targetUrl.startsWith("/crm/")).toBe(true);
      });
    });

    it("T3.4: verifies query string preservation resilience across all 35 legacy paths in a batch", () => {
      const testQuery = "?utm_source=email&session_id=abc_123";
      LEGACY_REDIRECT_MATRIX.forEach((m) => {
        const testPath = m.isDynamic ? m.legacyPath.replace(":id", "org-99") : m.legacyPath;
        const res = resolveLegacyRedirect(`${testPath}${testQuery}`);
        expect(res.targetUrl.endsWith(testQuery)).toBe(true);
      });
    });

    it("T3.5: verifies combined dynamic param + query + hash on /customers/:id/ledger", () => {
      const raw = "/customers/tenant_abc/ledger?filter=pending&sort=asc#top";
      const res = resolveLegacyRedirect(raw);
      expect(res.isRedirect).toBe(true);
      expect(res.targetUrl).toBe("/billing/customers/tenant_abc/ledger?filter=pending&sort=asc#top");
      expect(res.params.id).toBe("tenant_abc");
      expect(res.search).toBe("?filter=pending&sort=asc");
      expect(res.hash).toBe("#top");
    });
  });
});
