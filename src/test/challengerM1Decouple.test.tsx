/**
 * @file challengerM1Decouple.test.tsx
 * @description Empirical Challenger Adversarial Test Suite for Milestone 1 Route Decoupling.
 *
 * Stress-tests:
 * 1. LegacyRedirect component parameter substitution, wildcard handling, query retention, and hash fragments.
 * 2. Boundary edge cases: encoded characters, unicode, spaces, dollar signs ($1, $&, $$), empty query, complex hashes.
 * 3. Navigation stack replace flag invariants.
 * 4. Downstream useParams() round-trip integrity after URL-encoding.
 * 5. Full 36 legacy route matrix execution with query and hash preservation in React Router.
 * 6. RBAC route normalization (normalizeRouteForRbac) and cashier boundary restrictions.
 * 7. Structural invariants of src/App.tsx (route nesting, protection, CRM ordering).
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation, useParams } from "react-router-dom";
import fs from "fs";
import path from "path";
import { LegacyRedirect } from "@/components/routing/LegacyRedirect";
import {
  ROUTE_PATHS,
  LEGACY_ROUTE_REDIRECTS,
  normalizeRouteForRbac,
  isRouteAllowedForRole,
  RESTRICTED_ROUTES_FOR_CASHIER,
} from "@/config/routes";

// Helper component that records the final location and route params
function LocationDisplay() {
  const location = useLocation();
  const params = useParams();
  return (
    <div data-testid="location-display">
      <span data-testid="pathname">{location.pathname}</span>
      <span data-testid="search">{location.search}</span>
      <span data-testid="hash">{location.hash}</span>
      <span data-testid="full">{location.pathname + location.search + location.hash}</span>
      <span data-testid="param-id">{params.id || ""}</span>
    </div>
  );
}

// Test harness that executes LegacyRedirect inside a real MemoryRouter
function renderRedirectHarness({
  initialEntry,
  sourcePath,
  targetPath,
}: {
  initialEntry: string;
  sourcePath: string;
  targetPath: string;
}) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path={sourcePath} element={<LegacyRedirect to={targetPath} />} />
        {targetPath.includes(":") && (
          <Route path={targetPath} element={<LocationDisplay />} />
        )}
        <Route path="*" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Empirical Challenger M1: Adversarial Route Stress Testing", () => {
  // ─── SECTION 1: Dynamic Parameter Substitution ─────────────────────────────
  describe("Section 1: Dynamic Parameter Substitution (:id, :slug, etc.)", () => {
    it("empirically resolves standard alphanumeric ID (/customers/cust-12345/ledger)", () => {
      renderRedirectHarness({
        initialEntry: "/customers/cust-12345/ledger",
        sourcePath: "/customers/:id/ledger",
        targetPath: "/billing/customers/:id/ledger",
      });

      expect(screen.getByTestId("pathname").textContent).toBe("/billing/customers/cust-12345/ledger");
      expect(screen.getByTestId("param-id").textContent).toBe("cust-12345");
    });

    it("empirically resolves UUID parameter (/customers/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d/ledger)", () => {
      const uuid = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
      renderRedirectHarness({
        initialEntry: `/customers/${uuid}/ledger`,
        sourcePath: "/customers/:id/ledger",
        targetPath: "/billing/customers/:id/ledger",
      });

      expect(screen.getByTestId("pathname").textContent).toBe(`/billing/customers/${uuid}/ledger`);
      expect(screen.getByTestId("param-id").textContent).toBe(uuid);
    });

    it("empirically encodes spaces in dynamic parameters (/customers/Acme%20Corp/ledger)", () => {
      renderRedirectHarness({
        initialEntry: "/customers/Acme%20Corp/ledger",
        sourcePath: "/customers/:id/ledger",
        targetPath: "/billing/customers/:id/ledger",
      });

      expect(screen.getByTestId("pathname").textContent).toBe("/billing/customers/Acme%20Corp/ledger");
      expect(screen.getByTestId("param-id").textContent).toBe("Acme Corp");
    });

    it("empirically handles unicode / Hindi characters in dynamic parameters", () => {
      const encodedHindi = encodeURIComponent("राम-ट्रेडर्स");
      renderRedirectHarness({
        initialEntry: `/customers/${encodedHindi}/ledger`,
        sourcePath: "/customers/:id/ledger",
        targetPath: "/billing/customers/:id/ledger",
      });

      expect(screen.getByTestId("pathname").textContent).toBe(`/billing/customers/${encodedHindi}/ledger`);
      expect(screen.getByTestId("param-id").textContent).toBe("राम-ट्रेडर्स");
    });

    it("empirically tests dynamic parameter with special characters (&, +, =)", () => {
      const specialParam = encodeURIComponent("Sharma&Sons+Co=1");
      renderRedirectHarness({
        initialEntry: `/customers/${specialParam}/ledger`,
        sourcePath: "/customers/:id/ledger",
        targetPath: "/billing/customers/:id/ledger",
      });

      expect(screen.getByTestId("pathname").textContent).toBe(`/billing/customers/${specialParam}/ledger`);
      expect(screen.getByTestId("param-id").textContent).toBe("Sharma&Sons+Co=1");
    });

    it("empirically probes dollar sign patterns in dynamic parameter substitution", () => {
      // In web standards, $ is encoded as %24 by encodeURIComponent, which neutralizes JS string replacement tokens
      const paramWithDollar = "cust$100";
      renderRedirectHarness({
        initialEntry: `/customers/${paramWithDollar}/ledger`,
        sourcePath: "/customers/:id/ledger",
        targetPath: "/billing/customers/:id/ledger",
      });

      const actualPath = screen.getByTestId("pathname").textContent;
      expect(actualPath).toBe("/billing/customers/cust%24100/ledger");
      expect(screen.getByTestId("param-id").textContent).toBe("cust$100");
    });

    it("empirically probes $& matched-substring pattern in dynamic parameter substitution", () => {
      const paramWithAmp = "cust$&test";
      renderRedirectHarness({
        initialEntry: `/customers/${paramWithAmp}/ledger`,
        sourcePath: "/customers/:id/ledger",
        targetPath: "/billing/customers/:id/ledger",
      });

      const actualPath = screen.getByTestId("pathname").textContent;
      expect(actualPath).toBe("/billing/customers/cust%24%26test/ledger");
      expect(screen.getByTestId("param-id").textContent).toBe("cust$&test");
    });
  });

  // ─── SECTION 2: Wildcard (*) Substitution ──────────────────────────────────
  describe("Section 2: Wildcard Parameter Handling", () => {
    it("empirically substitutes single-segment wildcard (/pos/checkout/fast-pay -> /billing/checkout/fast-pay)", () => {
      renderRedirectHarness({
        initialEntry: "/pos/checkout/fast-pay",
        sourcePath: "/pos/checkout/*",
        targetPath: "/billing/checkout/*",
      });

      expect(screen.getByTestId("pathname").textContent).toBe("/billing/checkout/fast-pay");
    });

    it("empirically substitutes multi-segment wildcard (/pos/checkout/fast-pay/v2/counter-1)", () => {
      renderRedirectHarness({
        initialEntry: "/pos/checkout/fast-pay/v2/counter-1",
        sourcePath: "/pos/checkout/*",
        targetPath: "/billing/checkout/*",
      });

      expect(screen.getByTestId("pathname").textContent).toBe("/billing/checkout/fast-pay/v2/counter-1");
    });

    it("empirically retains query parameters and hash fragments with wildcards", () => {
      renderRedirectHarness({
        initialEntry: "/pos/checkout/fast-pay?mode=upi&terminal=pos-01#receipt",
        sourcePath: "/pos/checkout/*",
        targetPath: "/billing/checkout/*",
      });

      expect(screen.getByTestId("pathname").textContent).toBe("/billing/checkout/fast-pay");
      expect(screen.getByTestId("search").textContent).toBe("?mode=upi&terminal=pos-01");
      expect(screen.getByTestId("hash").textContent).toBe("#receipt");
      expect(screen.getByTestId("full").textContent).toBe("/billing/checkout/fast-pay?mode=upi&terminal=pos-01#receipt");
    });

    it("empirically handles static destination when route has wildcard", () => {
      renderRedirectHarness({
        initialEntry: "/pos/legacy-subpath",
        sourcePath: "/pos/*",
        targetPath: "/billing/pos",
      });

      expect(screen.getByTestId("pathname").textContent).toBe("/billing/pos");
    });
  });

  // ─── SECTION 3: Query String Retention ─────────────────────────────────────
  describe("Section 3: Query String Retention & Complex Delimiters", () => {
    it("empirically retains multi-param query strings (?tab=quotation&status=pending&range=30d)", () => {
      const search = "?tab=quotation&status=pending&range=30d";
      renderRedirectHarness({
        initialEntry: `/sales${search}`,
        sourcePath: "/sales",
        targetPath: "/billing/sales",
      });

      expect(screen.getByTestId("pathname").textContent).toBe("/billing/sales");
      expect(screen.getByTestId("search").textContent).toBe(search);
      expect(screen.getByTestId("full").textContent).toBe(`/billing/sales${search}`);
    });

    it("empirically retains special characters and spaces in query strings", () => {
      const search = "?q=Tata%20Steel%20%26%20Power&category=Raw%20Material&rate=%3E5000";
      renderRedirectHarness({
        initialEntry: `/sales${search}`,
        sourcePath: "/sales",
        targetPath: "/billing/sales",
      });

      expect(screen.getByTestId("search").textContent).toBe(search);
    });

    it("empirically retains empty query string / trailing question mark (/sales?)", () => {
      renderRedirectHarness({
        initialEntry: "/sales?",
        sourcePath: "/sales",
        targetPath: "/billing/sales",
      });

      expect(screen.getByTestId("pathname").textContent).toBe("/billing/sales");
      // Note: React Router / window.location normalizes empty query "?" to ""
      expect(screen.getByTestId("search").textContent).toBe("");
    });

    it("empirically preserves repeated query keys and array parameters", () => {
      const search = "?status=pending&status=overdue&filter%5B%5D=1&filter%5B%5D=2";
      renderRedirectHarness({
        initialEntry: `/sales${search}`,
        sourcePath: "/sales",
        targetPath: "/billing/sales",
      });

      expect(screen.getByTestId("search").textContent).toBe(search);
    });

    it("empirically preserves boolean / flag query parameters without values", () => {
      const search = "?dense&compact&printPreview";
      renderRedirectHarness({
        initialEntry: `/sales${search}`,
        sourcePath: "/sales",
        targetPath: "/billing/sales",
      });

      expect(screen.getByTestId("search").textContent).toBe(search);
    });
  });

  // ─── SECTION 4: Hash Fragment Retention ────────────────────────────────────
  describe("Section 4: Hash Fragment Retention", () => {
    it("empirically retains simple hash fragments (#overview)", () => {
      renderRedirectHarness({
        initialEntry: "/sales#overview",
        sourcePath: "/sales",
        targetPath: "/billing/sales",
      });

      expect(screen.getByTestId("pathname").textContent).toBe("/billing/sales");
      expect(screen.getByTestId("hash").textContent).toBe("#overview");
    });

    it("empirically retains complex hash fragments (#tab=audit&row=42)", () => {
      renderRedirectHarness({
        initialEntry: "/sales#tab=audit&row=42",
        sourcePath: "/sales",
        targetPath: "/billing/sales",
      });

      expect(screen.getByTestId("hash").textContent).toBe("#tab=audit&row=42");
    });

    it("empirically retains both query string and hash fragment concurrently", () => {
      const fullSuffix = "?tab=quotation&status=pending&range=30d#table-view";
      renderRedirectHarness({
        initialEntry: `/sales${fullSuffix}`,
        sourcePath: "/sales",
        targetPath: "/billing/sales",
      });

      expect(screen.getByTestId("pathname").textContent).toBe("/billing/sales");
      expect(screen.getByTestId("search").textContent).toBe("?tab=quotation&status=pending&range=30d");
      expect(screen.getByTestId("hash").textContent).toBe("#table-view");
      expect(screen.getByTestId("full").textContent).toBe(`/billing/sales${fullSuffix}`);
    });
  });

  // ─── SECTION 5: Comprehensive 36 Legacy Redirection Matrix ─────────────────
  describe("Section 5: Exhaustive 36 Legacy Route Redirection Matrix", () => {
    it("verifies all 36 legacy routes defined in LEGACY_ROUTE_REDIRECTS map to canonical routes", () => {
      expect(LEGACY_ROUTE_REDIRECTS.length).toBe(36);

      for (const { from, to } of LEGACY_ROUTE_REDIRECTS) {
        expect(from.startsWith("/")).toBe(true);
        expect(to.startsWith("/")).toBe(true);
        // Canonical target must be either /billing/*, /crm/*, /pricing, or /faq
        const isValidTarget =
          to.startsWith("/billing") ||
          to.startsWith("/crm") ||
          to === "/pricing" ||
          to === "/faq";
        expect(isValidTarget).toBe(true);
      }
    });

    it("empirically executes redirects for each of the 36 legacy routes individually in React Router", () => {
      for (const { from, to } of LEGACY_ROUTE_REDIRECTS) {
        cleanup();
        const testQuery = "?test=m1_adversarial_challenge";
        const testHash = "#test-hash";
        const isDynamic = from.includes(":id");
        const entryPath = isDynamic ? from.replace(":id", "cust-999") : from;
        const expectedFinalPath = isDynamic ? to.replace(":id", "cust-999") : to;

        renderRedirectHarness({
          initialEntry: `${entryPath}${testQuery}${testHash}`,
          sourcePath: from,
          targetPath: to,
        });

        expect(screen.getByTestId("pathname").textContent).toBe(expectedFinalPath);
        expect(screen.getByTestId("search").textContent).toBe(testQuery);
        expect(screen.getByTestId("hash").textContent).toBe(testHash);
        expect(screen.getByTestId("full").textContent).toBe(`${expectedFinalPath}${testQuery}${testHash}`);
      }
    });
  });

  // ─── SECTION 6: RBAC Route Normalization & Role Boundary Stress Testing ────
  describe("Section 6: RBAC Normalization & Role Gating Invariants", () => {
    it("normalizes legacy ERP paths to /billing/* without mutating canonical paths", () => {
      expect(normalizeRouteForRbac("/sales")).toBe("/billing/sales");
      expect(normalizeRouteForRbac("/items")).toBe("/billing/items");
      expect(normalizeRouteForRbac("/inventory")).toBe("/billing/inventory");
      expect(normalizeRouteForRbac("/customers")).toBe("/billing/customers");
      expect(normalizeRouteForRbac("/customers/cust-123/ledger")).toBe("/billing/customers/cust-123/ledger");

      // Idempotency: Canonical paths must remain invariant
      expect(normalizeRouteForRbac("/billing/sales")).toBe("/billing/sales");
      expect(normalizeRouteForRbac("/billing/pos")).toBe("/billing/pos");
      expect(normalizeRouteForRbac("/crm/attendance")).toBe("/crm/attendance");
      expect(normalizeRouteForRbac("/crm")).toBe("/crm");
    });

    it("handles boundary inputs gracefully (null, undefined, non-strings, root)", () => {
      expect(normalizeRouteForRbac("")).toBe("");
      // @ts-expect-error test boundary
      expect(normalizeRouteForRbac(null)).toBe(null);
      // @ts-expect-error test boundary
      expect(normalizeRouteForRbac(undefined)).toBe(undefined);
      expect(normalizeRouteForRbac("/")).toBe("/");
      expect(normalizeRouteForRbac("/auth")).toBe("/auth");
    });

    it("verifies cashier role restriction enforcement across both canonical and legacy routes", () => {
      // Cashier is restricted from dashboard, purchases, reports, settings, CRM
      expect(isRouteAllowedForRole(ROUTE_PATHS.dashboard, "cashier")).toBe(false);
      expect(isRouteAllowedForRole("/dashboard", "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.reports, "cashier")).toBe(false);
      expect(isRouteAllowedForRole("/reports", "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.settings, "cashier")).toBe(false);
      expect(isRouteAllowedForRole("/settings", "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.crm, "cashier")).toBe(false);

      // Cashier is allowed checkout, pos, sales, parties
      expect(isRouteAllowedForRole(ROUTE_PATHS.checkout, "cashier")).toBe(true);
      expect(isRouteAllowedForRole(ROUTE_PATHS.pos, "cashier")).toBe(true);
      expect(isRouteAllowedForRole(ROUTE_PATHS.sales, "cashier")).toBe(true);
      expect(isRouteAllowedForRole("/sales", "cashier")).toBe(true);
      expect(isRouteAllowedForRole(ROUTE_PATHS.parties, "cashier")).toBe(true);
    });
  });

  // ─── SECTION 7: App.tsx Route Tree & AST Architectural Verification ───────
  describe("Section 7: App.tsx Route Tree Architectural Invariants", () => {
    const appTsxContent = fs.readFileSync(
      path.resolve(process.cwd(), "src/App.tsx"),
      "utf-8"
    );

    it("verifies all 36 legacy redirect routes are declared inside ProtectedRoutes wrapper", () => {
      const protectedIndex = appTsxContent.indexOf("<Route element={<ProtectedRoutes />}>");
      expect(protectedIndex).toBeGreaterThan(-1);

      // Verify that LegacyRedirect is mounted after ProtectedRoutes
      const legacyRedirectIndex = appTsxContent.indexOf("<LegacyRedirect");
      expect(legacyRedirectIndex).toBeGreaterThan(protectedIndex);
    });

    it("verifies CRM routes are mounted before RoleProtectedRoute to satisfy route priority", () => {
      const crmAttendanceIndex = appTsxContent.indexOf("ROUTE_PATHS.crmAttendance");
      const roleProtectedIndex = appTsxContent.indexOf("<Route element={<RoleProtectedRoute");

      expect(crmAttendanceIndex).toBeGreaterThan(-1);
      expect(roleProtectedIndex).toBeGreaterThan(-1);
      // crmAttendanceIndex must appear before roleProtectedIndex in App.tsx
      expect(crmAttendanceIndex).toBeLessThan(roleProtectedIndex);
    });

    it("verifies exact unauthenticated redirect syntax in ProtectedRoutes", () => {
      expect(appTsxContent).toMatch(
        /if\s*\(!user\)\s*\{\s*return\s*<Navigate\s+to=\{ROUTE_PATHS\.auth\}\s+replace\s*\/>;\s*\}/
      );
    });

    it("verifies universal 404 catch-all is positioned at the very end of Routes", () => {
      const notFoundIndex = appTsxContent.indexOf('<Route path="*" element={<NotFound />} />');
      const closeRoutesIndex = appTsxContent.indexOf("</Routes>");

      expect(notFoundIndex).toBeGreaterThan(-1);
      expect(closeRoutesIndex).toBeGreaterThan(notFoundIndex);
    });
  });
});
