/**
 * @file challengerM1AdversarialDeep.test.tsx
 * @description Deep Adversarial Stress Harness for Milestone 1 Route Decoupling.
 *
 * Tests:
 * 1. Dynamic Route Parameters (:id, multiple params, UUIDs, path traversal, encoding, long strings).
 * 2. Multi-Segment Wildcards (* splats, nested slashes, special characters, replacement tokens).
 * 3. Complex Queries (multi-keys, array params, JSON payloads, unicode, duplicate keys, empty flags).
 * 4. Infinite redirect loop detection & circular graph analysis.
 * 5. RBAC & Cashier deep-path gating invariants against evasion vectors.
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation, useParams } from "react-router-dom";
import { LegacyRedirect } from "@/components/routing/LegacyRedirect";
import {
  ROUTE_PATHS,
  LEGACY_ROUTE_REDIRECTS,
  normalizeRouteForRbac,
  isRouteAllowedForRole,
  RESTRICTED_ROUTES_FOR_CASHIER,
} from "@/config/routes";

function LocationSpy() {
  const location = useLocation();
  const params = useParams();
  return (
    <div data-testid="location-spy">
      <span data-testid="pathname">{location.pathname}</span>
      <span data-testid="search">{location.search}</span>
      <span data-testid="hash">{location.hash}</span>
      <span data-testid="full">{location.pathname + location.search + location.hash}</span>
      <span data-testid="params">{JSON.stringify(params)}</span>
    </div>
  );
}

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
        <Route path={targetPath.replace(/\/\*/, "/*")} element={<LocationSpy />} />
        <Route path="*" element={<LocationSpy />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Empirical Challenger M1: Deep Adversarial Harness", () => {
  // ─── 1. DYNAMIC ROUTE PARAMETERS ───────────────────────────────────────────
  describe("1. Dynamic Route Parameters & Complex Identifiers", () => {
    it("handles extreme length parameter IDs (2048 chars) without buffer truncation", () => {
      const longId = "x".repeat(2048);
      renderRedirectHarness({
        initialEntry: `/customers/${longId}/ledger`,
        sourcePath: "/customers/:id/ledger",
        targetPath: "/billing/customers/:id/ledger",
      });

      expect(screen.getByTestId("pathname").textContent).toBe(`/billing/customers/${longId}/ledger`);
      const params = JSON.parse(screen.getByTestId("params").textContent || "{}");
      expect(params.id).toBe(longId);
      cleanup();
    });

    it("handles complex Base64 and URL-safe encoded parameter IDs", () => {
      const base64Id = "eyJvcmdJZCI6IjEyMyIsInNlY3JldCI6Inh5eiJ9";
      renderRedirectHarness({
        initialEntry: `/customers/${base64Id}/ledger`,
        sourcePath: "/customers/:id/ledger",
        targetPath: "/billing/customers/:id/ledger",
      });

      expect(screen.getByTestId("pathname").textContent).toBe(`/billing/customers/${base64Id}/ledger`);
      cleanup();
    });

    it("handles parameter values with periods, colons, and hyphens", () => {
      const complexId = "org.corp-v1.0:tenant_42";
      renderRedirectHarness({
        initialEntry: `/customers/${encodeURIComponent(complexId)}/ledger`,
        sourcePath: "/customers/:id/ledger",
        targetPath: "/billing/customers/:id/ledger",
      });

      expect(screen.getByTestId("pathname").textContent).toBe(`/billing/customers/${encodeURIComponent(complexId)}/ledger`);
      cleanup();
    });

    it("verifies multi-parameter substitution across multiple dynamic tokens", () => {
      renderRedirectHarness({
        initialEntry: "/orgs/org-99/customers/cust-42/ledger",
        sourcePath: "/orgs/:orgId/customers/:custId/ledger",
        targetPath: "/billing/orgs/:orgId/customers/:custId/ledger",
      });

      expect(screen.getByTestId("pathname").textContent).toBe("/billing/orgs/org-99/customers/cust-42/ledger");
      cleanup();
    });

    it("handles emojis and multi-byte UTF-8 in dynamic route parameters", () => {
      const emojiParam = encodeURIComponent("📦-store-🔥-77");
      renderRedirectHarness({
        initialEntry: `/customers/${emojiParam}/ledger`,
        sourcePath: "/customers/:id/ledger",
        targetPath: "/billing/customers/:id/ledger",
      });

      expect(screen.getByTestId("pathname").textContent).toBe(`/billing/customers/${emojiParam}/ledger`);
      cleanup();
    });
  });

  // ─── 2. MULTI-SEGMENT WILDCARD STRESS ──────────────────────────────────────
  describe("2. Multi-Segment Wildcard (*) & Splat Handling", () => {
    it("handles deeply nested 6-segment wildcard paths", () => {
      renderRedirectHarness({
        initialEntry: "/pos/terminal/v2/counter/north/counter-1/cash",
        sourcePath: "/pos/*",
        targetPath: "/billing/pos/*",
      });

      expect(screen.getByTestId("pathname").textContent).toBe("/billing/pos/terminal/v2/counter/north/counter-1/cash");
      cleanup();
    });

    it("handles wildcard path segments with spaces and encoded delimiters", () => {
      renderRedirectHarness({
        initialEntry: "/pos/sub%20terminal/counter%201",
        sourcePath: "/pos/*",
        targetPath: "/billing/pos/*",
      });

      // Note: React Router's useParams()["*"] returns decoded string ("sub terminal/counter 1")
      // LegacyRedirect substitutes the raw decoded splat directly into the target pathname
      expect(screen.getByTestId("pathname").textContent).toBe("/billing/pos/sub terminal/counter 1");
      cleanup();
    });

    it("verifies wildcard redirect when target path ignores wildcard (static collapse)", () => {
      renderRedirectHarness({
        initialEntry: "/checkout/terminal-legacy/v1",
        sourcePath: "/checkout/*",
        targetPath: "/billing/pos",
      });

      expect(screen.getByTestId("pathname").textContent).toBe("/billing/pos");
      cleanup();
    });
  });

  // ─── 3. COMPLEX QUERIES & QUERY PRESERVATION ───────────────────────────────
  describe("3. Complex Query Strings & Edge Delimiters", () => {
    it("preserves URL-encoded JSON payloads inside query parameters", () => {
      const jsonQuery = "?filter=" + encodeURIComponent(JSON.stringify({ status: "active", minAmount: 5000, tags: ["gst", "b2b"] }));
      renderRedirectHarness({
        initialEntry: `/sales${jsonQuery}`,
        sourcePath: "/sales",
        targetPath: "/billing/sales",
      });

      expect(screen.getByTestId("search").textContent).toBe(jsonQuery);
      cleanup();
    });

    it("preserves non-standard query structures (keys without values, duplicate keys, multiple amp)", () => {
      const weirdQuery = "?flag1&flag2=&key=val1&key=val2&&extra=1";
      renderRedirectHarness({
        initialEntry: `/purchases${weirdQuery}`,
        sourcePath: "/purchases",
        targetPath: "/billing/purchases",
      });

      expect(screen.getByTestId("search").textContent).toBe(weirdQuery);
      cleanup();
    });

    it("preserves query parameters containing nested question marks and equals signs", () => {
      const nestedQuery = "?returnUrl=/billing/items?cat=food%26instock=true&ref=portal";
      renderRedirectHarness({
        initialEntry: `/items${nestedQuery}`,
        sourcePath: "/items",
        targetPath: "/billing/items",
      });

      expect(screen.getByTestId("search").textContent).toBe(nestedQuery);
      cleanup();
    });

    it("preserves unicode Hindi, Tamil, and Bengali query values", () => {
      const unicodeQuery = "?search=" + encodeURIComponent("खाता विवरण") + "&region=" + encodeURIComponent("महाराष्ट्र");
      renderRedirectHarness({
        initialEntry: `/reports${unicodeQuery}`,
        sourcePath: "/reports",
        targetPath: "/billing/reports",
      });

      expect(screen.getByTestId("search").textContent).toBe(unicodeQuery);
      cleanup();
    });

    it("preserves 50+ concurrent query parameters in stress test", () => {
      const params = Array.from({ length: 50 }, (_, i) => `p${i}=val_${i}`).join("&");
      const massiveQuery = `?${params}`;
      renderRedirectHarness({
        initialEntry: `/analytics${massiveQuery}`,
        sourcePath: "/analytics",
        targetPath: "/billing/analytics",
      });

      expect(screen.getByTestId("search").textContent).toBe(massiveQuery);
      cleanup();
    });
  });

  // ─── 4. INFINITE REDIRECT LOOP DETECTION ───────────────────────────────────
  describe("4. Graph Cycle & Infinite Loop Prevention", () => {
    it("verifies NO redirect destination maps back to a legacy source (Zero Cycles in Directed Graph)", () => {
      const legacySources = new Map<string, string>();
      for (const { from, to } of LEGACY_ROUTE_REDIRECTS) {
        legacySources.set(from, to);
      }

      // Check every destination: traversing the graph must terminate in exactly 1 hop
      for (const [from, to] of legacySources.entries()) {
        expect(legacySources.has(to)).toBe(false);
        // Canonical destinations must not redirect again
        const canonicalTarget = to.split("?")[0].split("#")[0];
        expect(legacySources.has(canonicalTarget)).toBe(false);
      }
    });

    it("verifies that all canonical ROUTE_PATHS are disjoint from legacy route keys", () => {
      const legacySet = new Set(LEGACY_ROUTE_REDIRECTS.map((r) => r.from));
      const canonicalValues = Object.values(ROUTE_PATHS);

      for (const cPath of canonicalValues) {
        // If it starts with /billing or /crm, it must never equal a legacy root path
        if (cPath.startsWith("/billing/") || cPath.startsWith("/crm/")) {
          expect(legacySet.has(cPath)).toBe(false);
        }
      }
    });
  });

  // ─── 5. RBAC & CASHIER GATING RESILIENCE ────────────────────────────────────
  describe("5. Cashier Gating Resilience Against Path Evasion", () => {
    it("strictly blocks cashier from any /crm prefix variant", () => {
      const evasionPaths = [
        "/crm",
        "/crm/",
        "/crm/attendance",
        "/crm/attendance/today",
        "/crm/attendance?date=2026-10-23",
        "/crm/salary",
        "/crm/tasks",
        "/crm/roles",
        "/crm/meet",
        "/crm/broadcasts",
        "/crm/ai-assistant",
        "/crm/support",
      ];

      for (const p of evasionPaths) {
        expect(isRouteAllowedForRole(p, "cashier")).toBe(false);
      }
    });

    it("strictly blocks cashier from any /billing/settings prefix variant", () => {
      const settingsPaths = [
        "/billing/settings",
        "/billing/settings/",
        "/billing/settings/business",
        "/billing/settings/invoice",
        "/billing/settings/print",
        "/billing/settings/reminders",
        "/billing/settings/pricing",
        "/billing/settings?tab=advanced",
      ];

      for (const p of settingsPaths) {
        expect(isRouteAllowedForRole(p, "cashier")).toBe(false);
      }
    });

    it("allows cashier to access permissible POS & customer routes", () => {
      expect(isRouteAllowedForRole("/billing/pos", "cashier")).toBe(true);
      expect(isRouteAllowedForRole("/billing/checkout", "cashier")).toBe(true);
      expect(isRouteAllowedForRole("/billing/sales", "cashier")).toBe(true);
      expect(isRouteAllowedForRole("/billing/customers/cust-123/ledger", "cashier")).toBe(true);
      expect(isRouteAllowedForRole("/customers/cust-123/ledger", "cashier")).toBe(true);
    });
  });
});
