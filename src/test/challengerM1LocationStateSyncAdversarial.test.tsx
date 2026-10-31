/**
 * @file challengerM1LocationStateSyncAdversarial.test.tsx
 * @description Empirical Challenger M1 Round 2 Instance 2 Adversarial Test Suite.
 * 
 * Verifies React Router location state synchronization and navigation behavior in PublicHeader:
 * 1. Same-page anchor clicks on root path `/`:
 *    - Clicking anchor (e.g. href="/#suites") invokes navigate("/#suites") and calls scrollIntoView.
 *    - Strict double-slash invariant: zero `//#` or `//` generated across all anchors.
 *    - Graceful non-crash and resilient dual-suite alias fallback (suites <-> billing-erp / workforce-crm).
 * 2. Cross-route anchor navigation:
 *    - Clicking an anchor from non-root routes (/features, /pricing, etc.) navigates to `/#suites`.
 *    - Deferred scroll execution via useEffect post-navigation on root path.
 * 3. Active link highlight logic (`isExactActive`):
 *    - Matches location.pathname === "/" && location.hash === targetHash for anchors.
 *    - Applies `font-semibold text-blue-600` on desktop, `bg-blue-50 text-blue-700 font-semibold` on mobile.
 *    - Ensures exact matching (non-matching anchors and Home link properly deactivate when hash is present).
 *    - Rejects false activation when hash is appended to non-root subpages (e.g. /features#suites).
 * 4. Mobile drawer synchronization:
 *    - Clicking drawer anchor closes drawer, navigates via React Router, and coordinates scroll.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { PublicHeader } from "@/components/public/PublicHeader";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseOrganization = vi.fn();
vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => mockUseOrganization(),
}));

describe("Empirical Challenger M1 Round 2: Router State Sync & Active Link Highlight", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signOut: vi.fn(),
    });
    mockUseOrganization.mockReturnValue({
      userRole: "store_owner",
      userPermissions: {},
      loading: false,
    });
    window.scrollTo = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // SUITE 1: Same-Page Anchor Clicks on Root Path "/"
  // ==========================================================================
  describe("Suite 1: Same-Page Anchor Clicks on Root Path '/'", () => {
    it("invokes navigate('/#suites') and calls scrollIntoView on target element", () => {
      const suitesElem = document.createElement("div");
      suitesElem.id = "suites";
      document.body.appendChild(suitesElem);

      render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      const posLink = screen.getByRole("link", { name: /POS & Billing ERP|POS Billing/i });
      fireEvent.click(posLink);

      // Must invoke navigate to update React Router state
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith("/#suites");

      // Must call scrollIntoView on the DOM element with smooth behavior
      expect(suitesElem.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });

      suitesElem.remove();
    });

    it("Workforce CRM anchor also invokes navigate('/#suites') and scrolls target element", () => {
      const suitesElem = document.createElement("div");
      suitesElem.id = "suites";
      document.body.appendChild(suitesElem);

      render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      const crmLink = screen.getByRole("link", { name: /Workforce CRM/i });
      fireEvent.click(crmLink);

      expect(mockNavigate).toHaveBeenCalledWith("/#suites");
      expect(suitesElem.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });

      suitesElem.remove();
    });

    it("verifies other anchors (ecosystem, intelligence, download) invoke navigate and scroll without double slash", () => {
      const ecoElem = document.createElement("div");
      ecoElem.id = "ecosystem";
      document.body.appendChild(ecoElem);

      const intelElem = document.createElement("div");
      intelElem.id = "intelligence";
      document.body.appendChild(intelElem);

      const dlElem = document.createElement("div");
      dlElem.id = "download";
      document.body.appendChild(dlElem);

      render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      const ecoLink = screen.getByRole("link", { name: /Ecosystem/i });
      fireEvent.click(ecoLink);
      expect(mockNavigate).toHaveBeenCalledWith("/#ecosystem");
      expect(ecoElem.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });

      const intelLink = screen.getByRole("link", { name: /CredAlert Intel/i });
      fireEvent.click(intelLink);
      expect(mockNavigate).toHaveBeenCalledWith("/#intelligence");
      expect(intelElem.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });

      const dlLink = screen.getByRole("link", { name: /^Download$/i });
      fireEvent.click(dlLink);
      expect(mockNavigate).toHaveBeenCalledWith("/#download");
      expect(dlElem.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });

      // Clean up DOM
      ecoElem.remove();
      intelElem.remove();
      dlElem.remove();
    });

    it("strictly forbids double-slash generation on all anchor clicks", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      const anchorLinks = [
        /POS & Billing ERP|POS Billing/i,
        /Workforce CRM/i,
        /Ecosystem/i,
        /CredAlert Intel/i,
        /^Download$/i,
      ];

      anchorLinks.forEach((pattern) => {
        mockNavigate.mockClear();
        const link = screen.getByRole("link", { name: pattern });
        fireEvent.click(link);

        expect(mockNavigate).toHaveBeenCalled();
        const calledArg = mockNavigate.mock.calls[0][0];
        expect(calledArg).not.toContain("//");
        expect(calledArg.startsWith("//")).toBe(false);
        expect(calledArg).toMatch(/^\/#[a-z0-9-]+$/);
      });
    });

    it("gracefully navigates without throw when target DOM element is absent on root", () => {
      // Ensure target element does NOT exist in document
      const existing = document.getElementById("suites");
      if (existing) existing.remove();

      render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      const posLink = screen.getByRole("link", { name: /POS & Billing ERP|POS Billing/i });
      expect(() => {
        fireEvent.click(posLink);
      }).not.toThrow();

      // navigate still fires
      expect(mockNavigate).toHaveBeenCalledWith("/#suites");
    });

    it("resilient dual-suite fallback: scrolls 'billing-erp' or 'workforce-crm' if 'suites' id missing", () => {
      const billingErp = document.createElement("div");
      billingErp.id = "billing-erp";
      document.body.appendChild(billingErp);

      render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      const posLink = screen.getByRole("link", { name: /POS & Billing ERP|POS Billing/i });
      fireEvent.click(posLink);

      expect(mockNavigate).toHaveBeenCalledWith("/#suites");
      expect(billingErp.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });

      billingErp.remove();
    });
  });

  // ==========================================================================
  // SUITE 2: Cross-Route Anchor Clicks from Other Routes
  // ==========================================================================
  describe("Suite 2: Cross-Route Anchor Clicks from Non-Root Routes", () => {
    const foreignRoutes = ["/features", "/pricing", "/about", "/contact", "/security", "/faq"];

    it.each(foreignRoutes)(
      "from '%s', clicking anchor '/#suites' navigates to '/#suites' and does not call synchronous scroll",
      (route) => {
        const dummySuite = document.createElement("div");
        dummySuite.id = "suites";
        document.body.appendChild(dummySuite);

        const { unmount } = render(
          <MemoryRouter initialEntries={[route]}>
            <PublicHeader />
          </MemoryRouter>
        );

        const posLink = screen.getByRole("link", { name: /POS & Billing ERP|POS Billing/i });
        fireEvent.click(posLink);

        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith("/#suites");
        // Crucial invariant: Should NOT call scroll on foreign route synchronously
        expect(dummySuite.scrollIntoView).not.toHaveBeenCalled();

        dummySuite.remove();
        unmount();
      }
    );

    it("executes post-navigation smooth scroll via useEffect when landing on '/' with hash", async () => {
      const targetElement = document.createElement("div");
      targetElement.id = "suites";
      document.body.appendChild(targetElement);

      render(
        <MemoryRouter initialEntries={["/#suites"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      // PublicHeader has a 80ms timer for cross-page hash scroll
      await waitFor(
        () => {
          expect(targetElement.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
        },
        { timeout: 1000 }
      );

      targetElement.remove();
    });
  });

  // ==========================================================================
  // SUITE 3: Active Link Highlight Logic (isExactActive)
  // ==========================================================================
  describe("Suite 3: Active Link Highlight Logic (isExactActive)", () => {
    it("on root '/' without hash, only 'Home' link has active styling", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      const homeLink = screen.getByRole("link", { name: /^Home$/i });
      expect(homeLink.className).toContain("text-blue-600");
      expect(homeLink.className).toContain("font-semibold");

      // Check anchor links are NOT active
      const posLink = screen.getByRole("link", { name: /POS & Billing ERP|POS Billing/i });
      const crmLink = screen.getByRole("link", { name: /Workforce CRM/i });
      const ecoLink = screen.getByRole("link", { name: /Ecosystem/i });
      const dlLink = screen.getByRole("link", { name: /^Download$/i });

      [posLink, crmLink, ecoLink, dlLink].forEach((link) => {
        expect(link.className).not.toContain("text-blue-600");
        expect(link.className).toContain("text-slate-600");
      });

      // Check subpage links are NOT active
      const featLink = screen.getByRole("link", { name: /^Features$/i });
      const priceLink = screen.getByRole("link", { name: /^Pricing$/i });
      expect(featLink.className).not.toContain("text-blue-600");
      expect(priceLink.className).not.toContain("text-blue-600");
    });

    it("on '/#suites', POS & Billing ERP and Workforce CRM receive active styling, and Home deactivates", () => {
      render(
        <MemoryRouter initialEntries={["/#suites"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      // Dual-suite links targeting #suites must be active
      const posLink = screen.getByRole("link", { name: /POS & Billing ERP|POS Billing/i });
      const crmLink = screen.getByRole("link", { name: /Workforce CRM/i });

      expect(posLink.className).toContain("text-blue-600");
      expect(posLink.className).toContain("font-semibold");
      expect(crmLink.className).toContain("text-blue-600");
      expect(crmLink.className).toContain("font-semibold");

      // Home link must NOT be active when hash is present
      const homeLink = screen.getByRole("link", { name: /^Home$/i });
      expect(homeLink.className).not.toContain("text-blue-600");
      expect(homeLink.className).toContain("text-slate-600");

      // Other anchor links must NOT be active
      const ecoLink = screen.getByRole("link", { name: /Ecosystem/i });
      expect(ecoLink.className).not.toContain("text-blue-600");
    });

    it("on '/#ecosystem', Ecosystem receives active styling and suites link deactivates", () => {
      render(
        <MemoryRouter initialEntries={["/#ecosystem"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      const ecoLink = screen.getByRole("link", { name: /Ecosystem/i });
      expect(ecoLink.className).toContain("text-blue-600");
      expect(ecoLink.className).toContain("font-semibold");

      const posLink = screen.getByRole("link", { name: /POS & Billing ERP|POS Billing/i });
      expect(posLink.className).not.toContain("text-blue-600");
      expect(posLink.className).toContain("text-slate-600");
    });

    it("on '/#intelligence', CredAlert Intel receives active styling", () => {
      render(
        <MemoryRouter initialEntries={["/#intelligence"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      const intelLink = screen.getByRole("link", { name: /CredAlert Intel/i });
      expect(intelLink.className).toContain("text-blue-600");
      expect(intelLink.className).toContain("font-semibold");
    });

    it("on '/#download', Download receives active styling", () => {
      render(
        <MemoryRouter initialEntries={["/#download"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      const dlLink = screen.getByRole("link", { name: /^Download$/i });
      expect(dlLink.className).toContain("text-blue-600");
      expect(dlLink.className).toContain("font-semibold");
    });

    it("on subpage '/features', Features is active and anchors are not active", () => {
      render(
        <MemoryRouter initialEntries={["/features"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      const featLink = screen.getByRole("link", { name: /^Features$/i });
      expect(featLink.className).toContain("text-blue-600");
      expect(featLink.className).toContain("font-semibold");

      const homeLink = screen.getByRole("link", { name: /^Home$/i });
      expect(homeLink.className).not.toContain("text-blue-600");

      const posLink = screen.getByRole("link", { name: /POS & Billing ERP|POS Billing/i });
      expect(posLink.className).not.toContain("text-blue-600");
    });

    it("adversarial edge case: on '/features#suites', '#suites' anchor does NOT falsely activate on subpage", () => {
      render(
        <MemoryRouter initialEntries={["/features#suites"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      // Anchors should only activate when location.pathname === "/"
      const posLink = screen.getByRole("link", { name: /POS & Billing ERP|POS Billing/i });
      expect(posLink.className).not.toContain("text-blue-600");
      expect(posLink.className).toContain("text-slate-600");
    });
  });

  // ==========================================================================
  // SUITE 4: Mobile Drawer State Synchronization & Active Links
  // ==========================================================================
  describe("Suite 4: Mobile Drawer State Synchronization & Active Links", () => {
    it("renders active link styling in mobile drawer for root path '/'", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      const hamburger = screen.getByLabelText("Toggle navigation menu");
      fireEvent.click(hamburger);

      const drawer = screen.getByTestId("mobile-drawer");
      expect(drawer).toBeInTheDocument();

      // Inside drawer, find Home link
      const homeLinks = screen.getAllByRole("link", { name: /^Home$/i });
      const drawerHomeLink = homeLinks[homeLinks.length - 1];
      expect(drawerHomeLink.className).toContain("bg-blue-50");
      expect(drawerHomeLink.className).toContain("text-blue-700");
      expect(drawerHomeLink.className).toContain("font-semibold");

      // Suites link in drawer should be inactive
      const posLinks = screen.getAllByRole("link", { name: /POS & Billing ERP|POS Billing/i });
      const drawerPosLink = posLinks[posLinks.length - 1];
      expect(drawerPosLink.className).not.toContain("bg-blue-50");
      expect(drawerPosLink.className).toContain("text-slate-700");
    });

    it("renders active link styling in mobile drawer for '/#suites'", () => {
      render(
        <MemoryRouter initialEntries={["/#suites"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      const hamburger = screen.getByLabelText("Toggle navigation menu");
      fireEvent.click(hamburger);

      const posLinks = screen.getAllByRole("link", { name: /POS & Billing ERP|POS Billing/i });
      const drawerPosLink = posLinks[posLinks.length - 1];
      expect(drawerPosLink.className).toContain("bg-blue-50");
      expect(drawerPosLink.className).toContain("text-blue-700");
      expect(drawerPosLink.className).toContain("font-semibold");
    });

    it("clicking drawer anchor link closes drawer and navigates cleanly", () => {
      const suitesElem = document.createElement("div");
      suitesElem.id = "suites";
      document.body.appendChild(suitesElem);

      render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      const hamburger = screen.getByLabelText("Toggle navigation menu");
      fireEvent.click(hamburger);

      expect(screen.getByTestId("mobile-drawer")).toBeInTheDocument();

      const posLinks = screen.getAllByRole("link", { name: /POS & Billing ERP|POS Billing/i });
      const drawerPosLink = posLinks[posLinks.length - 1];
      fireEvent.click(drawerPosLink);

      expect(mockNavigate).toHaveBeenCalledWith("/#suites");
      expect(suitesElem.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });

      // Drawer should now be closed
      expect(screen.queryByTestId("mobile-drawer")).not.toBeInTheDocument();

      suitesElem.remove();
    });

    it("clicking drawer anchor link from non-root route closes drawer and navigates cleanly", () => {
      render(
        <MemoryRouter initialEntries={["/features"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      const hamburger = screen.getByLabelText("Toggle navigation menu");
      fireEvent.click(hamburger);

      expect(screen.getByTestId("mobile-drawer")).toBeInTheDocument();

      const posLinks = screen.getAllByRole("link", { name: /POS & Billing ERP|POS Billing/i });
      const drawerPosLink = posLinks[posLinks.length - 1];
      fireEvent.click(drawerPosLink);

      expect(mockNavigate).toHaveBeenCalledWith("/#suites");
      expect(mockNavigate).not.toHaveBeenCalledWith("//#suites");
      expect(screen.queryByTestId("mobile-drawer")).not.toBeInTheDocument();
    });
  });
});
