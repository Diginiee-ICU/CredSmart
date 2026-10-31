/**
 * @file challengerM1NavigationButtonsAdversarial.test.tsx
 * @description M1 Challenger 1 Adversarial Test Suite
 * Stress-testing:
 * 1. Double-slash URL generation across subpage transitions and anchor links.
 * 2. Button bloat & prohibited class assertions across PublicHeader, PublicFooter, and PublicConversionBanner.
 * 3. Hash scroll listener execution and graceful degradation when target DOM element is absent or with reduced motion.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicConversionBanner } from "@/components/public/PublicConversionBanner";
import { PublicLayout } from "@/components/public/PublicLayout";

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

describe("M1 Challenger 1: Navigation & Button Adversarial Stress Harness", () => {
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
  // CHALLENGE 1: Double-Slash Bug Challenge Across Subpages & Anchor Fragments
  // ==========================================================================
  describe("Challenge 1: Zero Double-Slash Invariant across Route Transitions", () => {
    const subpages = [
      "/features",
      "/pricing",
      "/about",
      "/contact",
      "/security",
      "/faq",
      "/gst-billing-guide",
      "/barcode-generator-guide",
      "/e-invoicing-guide",
      "/compare-vyapar",
      "/compare-mybillbook",
      "/compare-tally",
      "/privacy-policy",
      "/terms-of-service",
    ];

    it.each(subpages)(
      "PublicHeader: clicking '/#suites' from subpage '%s' navigates to '/#suites' without double slash",
      (subpage) => {
        const { unmount } = render(
          <MemoryRouter initialEntries={[subpage]}>
            <PublicHeader />
          </MemoryRouter>
        );

        // Click POS & Billing link
        const posLink = screen.getByRole("link", { name: /POS & Billing ERP|POS Billing/i });
        fireEvent.click(posLink);

        expect(mockNavigate).toHaveBeenCalledTimes(1);
        const destination = mockNavigate.mock.calls[0][0];

        // Assert strictly no double slash
        expect(destination).toBe("/#suites");
        expect(destination).not.toContain("//");
        expect(destination.startsWith("//")).toBe(false);

        unmount();
      }
    );

    it.each(subpages)(
      "PublicHeader: clicking Workforce CRM anchor from subpage '%s' navigates cleanly without double slash",
      (subpage) => {
        const { unmount } = render(
          <MemoryRouter initialEntries={[subpage]}>
            <PublicHeader />
          </MemoryRouter>
        );

        const crmLink = screen.getByRole("link", { name: /Workforce CRM/i });
        fireEvent.click(crmLink);

        expect(mockNavigate).toHaveBeenCalledTimes(1);
        const destination = mockNavigate.mock.calls[0][0];

        expect(destination).toBe("/#suites");
        expect(destination).not.toContain("//");

        unmount();
      }
    );

    it.each(subpages)(
      "PublicHeader: clicking mobile drawer anchor links from subpage '%s' produces no double slash",
      (subpage) => {
        const { unmount } = render(
          <MemoryRouter initialEntries={[subpage]}>
            <PublicHeader />
          </MemoryRouter>
        );

        const hamburgerButton = screen.getByLabelText("Toggle navigation menu");
        fireEvent.click(hamburgerButton);

        // Inside drawer, click 'POS & Billing ERP'
        const posLinks = screen.getAllByRole("link", { name: /POS & Billing ERP|POS Billing/i });
        const drawerPosLink = posLinks[posLinks.length - 1];
        fireEvent.click(drawerPosLink);

        expect(mockNavigate).toHaveBeenCalled();
        const destination = mockNavigate.mock.calls[mockNavigate.mock.calls.length - 1][0];
        expect(destination).toBe("/#suites");
        expect(destination).not.toContain("//");

        unmount();
      }
    );

    it("PublicHeader: on root path '/', clicking an anchor calls navigate to synchronize router state and scrolls into view", () => {
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

      // Should call router navigate on root to synchronize location state without double-slash
      expect(mockNavigate).toHaveBeenCalledWith("/#suites");
      // Should scroll into view
      expect(suitesElem.scrollIntoView).toHaveBeenCalled();

      suitesElem.remove();
    });

    it("PublicHeader: clicking Quick Download button triggers '/#download' when no modal opener provided, without double-slash", () => {
      render(
        <MemoryRouter initialEntries={["/features"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      const downloadBtn = screen.getByRole("button", { name: /Download App|App/i });
      fireEvent.click(downloadBtn);

      expect(mockNavigate).toHaveBeenCalledWith("/#download");
      expect(mockNavigate).not.toHaveBeenCalledWith("//#download");
    });
  });

  // ==========================================================================
  // CHALLENGE 2: Button Bloat & Prohibited Classes Inspection
  // ==========================================================================
  describe("Challenge 2: Button Bloat & Prohibited Classes Assertions", () => {
    const prohibitedButtonClasses = ["h-10", "h-12", "h-13", "px-8", "rounded-3xl"];

    it("PublicHeader: desktop and mobile buttons strictly avoid all prohibited bloat classes", () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      // Open drawer to inspect mobile buttons as well
      const hamburger = screen.getByLabelText("Toggle navigation menu");
      fireEvent.click(hamburger);

      const buttons = container.querySelectorAll("button");
      expect(buttons.length).toBeGreaterThan(0);

      buttons.forEach((btn) => {
        const classList = btn.className;
        
        // Ensure prohibited bloat classes are NOT present on any button
        prohibitedButtonClasses.forEach((prohibited) => {
          // Exception: hamburger is w-11 h-11, header itself is h-12 sm:h-13, but no button should have prohibited bloat classes
          expect(
            classList.includes(prohibited),
            `Button "${btn.textContent || btn.getAttribute("aria-label")}" has prohibited class "${prohibited}". ClassList: ${classList}`
          ).toBe(false);
        });
      });
    });

    it("PublicHeader: desktop CTA buttons conform to standard h-8.5 px-3 rounded-lg text-xs font-semibold", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      const loginBtn = screen.getByRole("button", { name: /^Login$/i });
      const startFreeBtn = screen.getByRole("button", { name: /^Start Free$/i });
      const downloadBtn = screen.getByRole("button", { name: /Download App|App/i });

      [loginBtn, startFreeBtn, downloadBtn].forEach((btn) => {
        expect(btn.className).toContain("h-8.5");
        expect(btn.className).toContain("px-3");
        expect(btn.className).toContain("rounded-lg");
        expect(btn.className).toContain("text-xs");
        expect(btn.className).toContain("font-semibold");
      });
    });

    it("PublicConversionBanner: CTA button strictly avoids h-10, h-12, h-13, px-8, rounded-3xl and uses standard h-9.5 px-4.5", () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicConversionBanner />
        </MemoryRouter>
      );

      const buttons = container.querySelectorAll("button");
      expect(buttons.length).toBe(1);

      const ctaBtn = buttons[0];
      const classList = ctaBtn.className;

      prohibitedButtonClasses.forEach((prohibited) => {
        expect(
          classList.includes(prohibited),
          `PublicConversionBanner button has prohibited class "${prohibited}". ClassList: ${classList}`
        ).toBe(false);
      });

      // Assert adherence to hero CTA standard
      expect(classList).toContain("h-9.5");
      expect(classList).toContain("px-4.5");
      expect(classList).toContain("rounded-lg");
      expect(classList).toContain("text-sm");
      expect(classList).toContain("font-semibold");
    });

    it("PublicFooter: app download chips avoid bloated button classes and use compact styling", () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicFooter />
        </MemoryRouter>
      );

      const downloadChips = container.querySelectorAll("a[href*='drive.usercontent.google.com']");
      expect(downloadChips.length).toBe(2);

      downloadChips.forEach((chip) => {
        const classList = chip.className;
        prohibitedButtonClasses.forEach((prohibited) => {
          expect(
            classList.includes(prohibited),
            `PublicFooter download chip has prohibited class "${prohibited}". ClassList: ${classList}`
          ).toBe(false);
        });

        // Assert compact styling
        expect(classList).toContain("text-xs");
        expect(classList).toContain("px-2.5");
        expect(classList).toContain("py-1.5");
        expect(classList).toContain("rounded-lg");
      });
    });
  });

  // ==========================================================================
  // CHALLENGE 3: Hash Scroll Listener Verification & Resilience
  // ==========================================================================
  describe("Challenge 3: Hash Scroll Listener Verification & Fallback Resilience", () => {
    it("PublicLayout: navigating to /#suites triggers smooth scroll on existing element", async () => {
      const targetElement = document.createElement("div");
      targetElement.id = "suites";
      document.body.appendChild(targetElement);

      render(
        <MemoryRouter initialEntries={["/#suites"]}>
          <PublicLayout>
            <div>Page Content</div>
          </PublicLayout>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(targetElement.scrollIntoView).toHaveBeenCalledWith({
          behavior: "smooth",
        });
      });

      targetElement.remove();
    });

    it("PublicLayout: when target element is absent, gracefully calls window.scrollTo(0, 0) without unhandled error", async () => {
      // Intentionally do NOT append an element with id="non-existent-anchor"
      expect(() => {
        render(
          <MemoryRouter initialEntries={["/#non-existent-anchor"]}>
            <PublicLayout>
              <div>Page Content</div>
            </PublicLayout>
          </MemoryRouter>
        );
      }).not.toThrow();

      await waitFor(() => {
        expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
      });
    });

    it("PublicLayout: honors prefers-reduced-motion: reduce by using behavior 'auto'", async () => {
      const targetElement = document.createElement("div");
      targetElement.id = "reduced-motion-target";
      document.body.appendChild(targetElement);

      // Mock matchMedia for prefers-reduced-motion
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query.includes("prefers-reduced-motion: reduce"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(
        <MemoryRouter initialEntries={["/#reduced-motion-target"]}>
          <PublicLayout>
            <div>Page Content</div>
          </PublicLayout>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(targetElement.scrollIntoView).toHaveBeenCalledWith({
          behavior: "auto",
        });
      });

      targetElement.remove();
    });

    it("PublicHeader: smooth scroll timer handles resilient aliases (suites <-> billing-erp / workforce-crm)", async () => {
      const erpElement = document.createElement("div");
      erpElement.id = "billing-erp";
      document.body.appendChild(erpElement);

      render(
        <MemoryRouter initialEntries={["/#suites"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      // PublicHeader's findTargetElement falls back from "suites" to "billing-erp"
      await waitFor(() => {
        expect(erpElement.scrollIntoView).toHaveBeenCalled();
      });

      erpElement.remove();
    });

    it("handles edge case hashes: empty hash, double hash, special characters without crashing", () => {
      const edgeHashes = ["#", "##", "#/test", "#?", "#suites-123", "#&amp;"];

      edgeHashes.forEach((hashVal) => {
        expect(() => {
          const { unmount } = render(
            <MemoryRouter initialEntries={[`/${hashVal}`]}>
              <PublicLayout>
                <div>Edge Hash Content</div>
              </PublicLayout>
            </MemoryRouter>
          );
          unmount();
        }).not.toThrow();
      });
    });
  });
});
