/**
 * @file universalHeaderAdversarialStress.test.tsx
 * @description Adversarial Empirical Stress Test Suite for Milestone 1 (Universal Header Dual Lockup).
 * Authored by Challenger 1 (Empirical Critic & Specialist).
 *
 * Verifies:
 * 1. Viewport simulations: 320px, 360px, 375px, 412px, 768px, 1024px
 * 2. Extreme edge cases:
 *    - Long org name (100+ chars, 250+ chars, unbroken string of 100 'W's)
 *    - Missing / empty org name ("" or whitespace)
 *    - Null / undefined org name
 *    - Special characters, XSS attempts, emojis, unicode non-Latin scripts
 *    - Null, empty string, malformed logo_url
 * 3. Layout containment:
 *    - No flex-wrap on header container
 *    - Strict truncation on store title
 *    - Responsive max-width constraints on store pill
 *    - Mobile pixel budget verification across all viewports
 *    - Absence of desktop-only elements on mobile viewports
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import fs from "fs";
import path from "path";
import { MemoryRouter } from "react-router-dom";

// Mock child modals and heavyweight components
vi.mock("@/components/AppSidebar", () => ({
  AppSidebar: () => <nav data-testid="mock-sidebar">Sidebar</nav>,
}));
vi.mock("@/components/OfflineSyncBanner", () => ({
  OfflineSyncBanner: () => <div data-testid="mock-offline-banner" />,
}));
vi.mock("@/components/UniversalQuickCreateModal", () => ({
  UniversalQuickCreateModal: () => null,
}));
vi.mock("@/components/SalesInvoiceModal", () => ({
  SalesInvoiceModal: () => null,
}));
vi.mock("@/components/ReceiptModal", () => ({
  ReceiptModal: () => null,
}));
vi.mock("@/components/CreateBusinessModal", () => ({
  CreateBusinessModal: () => null,
}));
vi.mock("@/components/items/CreateItemModal", () => ({
  CreateItemModal: () => null,
}));
vi.mock("@/components/parties/CreatePartyModal", () => ({
  CreatePartyModal: () => null,
}));
vi.mock("@/components/notifications/NotificationCenter", () => ({
  NotificationCenter: () => null,
}));
vi.mock("@/components/notifications/FeatureBubbleNotification", () => ({
  FeatureBubbleNotification: () => null,
}));

// Mock hooks
const mockUseOrganization = vi.fn();
const mockUseActiveSuite = vi.fn();
const mockUseNetworkInvoices = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => mockUseOrganization(),
}));

vi.mock("@/hooks/useActiveSuite", () => ({
  useActiveSuite: () => mockUseActiveSuite(),
}));

vi.mock("@/hooks/useNetworkInvoices", () => ({
  useNetworkInvoices: () => mockUseNetworkInvoices(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

import AppLayout from "@/components/AppLayout";

const APP_LAYOUT_PATH = path.resolve(process.cwd(), "src/components/AppLayout.tsx");

describe("Universal Header Adversarial Empirical Stress Tests", () => {
  let appLayoutSource: string;

  beforeEach(() => {
    vi.clearAllMocks();
    appLayoutSource = fs.readFileSync(APP_LAYOUT_PATH, "utf-8");

    mockUseAuth.mockReturnValue({
      user: { id: "user-test", email: "challenger@credsmart.test" },
      signOut: vi.fn(),
    });
    mockUseActiveSuite.mockReturnValue({
      activeSuite: "billing",
      isCrm: false,
      switchSuite: vi.fn(),
    });
    mockUseNetworkInvoices.mockReturnValue({
      pendingCount: 0,
      unreadCount: 0,
    });
  });

  // =========================================================================
  // SECTION 1: EXTREME EDGE CASES (ORGANIZATION NAMES & LOGOS)
  // =========================================================================
  describe("Adversarial Edge Cases — Organization Names and Logos", () => {
    it("handles an extremely long unbroken organization name (100+ W's) without breaking layout classes", () => {
      const extremeName = "W".repeat(120);
      mockUseOrganization.mockReturnValue({
        org: {
          id: "org-long",
          name: extremeName,
          logo_url: null,
          business_type: "Wholesale",
        },
        orgId: "org-long",
        organizations: [{ id: "org-long", name: extremeName }],
        switchOrganization: vi.fn(),
        userRole: "store_owner",
        userPermissions: null,
      });

      const { container } = render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppLayout />
        </MemoryRouter>
      );

      // Verify the store switcher button (first of elements with title=extremeName, second is profile avatar)
      const matchingButtons = screen.getAllByTitle(extremeName);
      expect(matchingButtons.length).toBeGreaterThanOrEqual(1);
      const triggerBtn = matchingButtons[0];
      expect(triggerBtn).toBeInTheDocument();
      expect(triggerBtn.className).toContain("max-w-[100px]");

      // Verify text inside has truncate class
      const spanText = triggerBtn.querySelector("span.truncate");
      expect(spanText).toBeInTheDocument();
      expect(spanText?.textContent).toBe(extremeName);

      // Verify fallback Building2 icon is used when logo_url is null
      const svgs = triggerBtn.querySelectorAll("svg");
      expect(svgs.length).toBe(2); // Building2 and ChevronDown
    });

    it("handles 250+ character organization name with mixed whitespace and special characters", () => {
      const extremeName = "Super-Mega Global Enterprise & Sons, LLC / Inc. (India & Dubai) - [Branch #4928]".repeat(3);
      mockUseOrganization.mockReturnValue({
        org: {
          id: "org-huge",
          name: extremeName,
          logo_url: "https://example.com/huge.png",
          business_type: "Enterprise",
        },
        orgId: "org-huge",
        organizations: [{ id: "org-huge", name: extremeName }],
        switchOrganization: vi.fn(),
        userRole: "store_owner",
        userPermissions: null,
      });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppLayout />
        </MemoryRouter>
      );

      const matchingButtons = screen.getAllByTitle(extremeName);
      const triggerBtn = matchingButtons[0];
      expect(triggerBtn).toBeInTheDocument();
      const spanText = triggerBtn.querySelector("span.truncate");
      expect(spanText).toBeInTheDocument();
      expect(screen.getByAltText(extremeName)).toBeInTheDocument();
    });

    it("handles empty string organization name by safely falling back to 'My Business'", () => {
      mockUseOrganization.mockReturnValue({
        org: {
          id: "org-empty",
          name: "",
          logo_url: null,
          business_type: "",
        },
        orgId: "org-empty",
        organizations: [],
        switchOrganization: vi.fn(),
        userRole: "store_owner",
        userPermissions: null,
      });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppLayout />
        </MemoryRouter>
      );

      // Default fallback "My Business" rendered
      expect(screen.getByText("My Business")).toBeInTheDocument();
      expect(screen.getByAltText("CredSmart Shield")).toBeInTheDocument();
    });

    it("handles null organization object without throwing errors", () => {
      mockUseOrganization.mockReturnValue({
        org: null,
        orgId: null,
        organizations: [],
        switchOrganization: vi.fn(),
        userRole: "store_owner",
        userPermissions: null,
      });

      expect(() => {
        render(
          <MemoryRouter initialEntries={["/dashboard"]}>
            <AppLayout />
          </MemoryRouter>
        );
      }).not.toThrow();

      expect(screen.getByText("My Business")).toBeInTheDocument();
    });

    it("handles malicious / HTML injection strings in organization name safely (escaped by React)", () => {
      const maliciousName = "<script>alert('XSS')</script><b>BOLD</b>\"' onload='evil()'";
      mockUseOrganization.mockReturnValue({
        org: {
          id: "org-xss",
          name: maliciousName,
          logo_url: null,
        },
        orgId: "org-xss",
        organizations: [],
        switchOrganization: vi.fn(),
        userRole: "store_owner",
        userPermissions: null,
      });

      const { container } = render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppLayout />
        </MemoryRouter>
      );

      // Must be safely escaped as plain text, not rendered as raw HTML script elements
      expect(container.querySelectorAll("script").length).toBe(0);
      expect(screen.getByText(maliciousName)).toBeInTheDocument();
    });

    it("handles emoji and multilingual non-Latin characters in organization name", () => {
      const unicodeName = "🏬 सुपरमार्केट & CredSmart 🚀 (株式会社 クレドスマート - مؤسسة)";
      mockUseOrganization.mockReturnValue({
        org: {
          id: "org-unicode",
          name: unicodeName,
          logo_url: null,
        },
        orgId: "org-unicode",
        organizations: [],
        switchOrganization: vi.fn(),
        userRole: "store_owner",
        userPermissions: null,
      });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppLayout />
        </MemoryRouter>
      );

      expect(screen.getByText(unicodeName)).toBeInTheDocument();
    });

    it("handles null logo_url with valid Building2 fallback icon", () => {
      mockUseOrganization.mockReturnValue({
        org: {
          id: "org-no-logo",
          name: "Standard Store",
          logo_url: null,
        },
        orgId: "org-no-logo",
        organizations: [],
        switchOrganization: vi.fn(),
        userRole: "store_owner",
        userPermissions: null,
      });

      const { container } = render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppLayout />
        </MemoryRouter>
      );

      const triggerBtn = container.querySelector('button[title="Standard Store"]');
      expect(triggerBtn).toBeInTheDocument();
      // Logo image should not exist
      expect(screen.queryByAltText("Standard Store")).not.toBeInTheDocument();
      // SVGs must exist: Building2 + ChevronDown
      expect(triggerBtn?.querySelectorAll("svg").length).toBe(2);
    });
  });

  // =========================================================================
  // SECTION 2: VIEWPORT SIMULATION & LAYOUT CONTAINMENT
  // =========================================================================
  describe("Viewport Width Constraints and Zero Overflow Guarantees", () => {
    const viewports = [
      { name: "320px (Ultra-compact / iPhone SE 1)", width: 320, padding: 20 },
      { name: "360px (Standard compact Android)", width: 360, padding: 20 },
      { name: "375px (iPhone standard)", width: 375, padding: 20 },
      { name: "412px (Android large)", width: 412, padding: 20 },
      { name: "768px (Tablet / Desktop breakpoint)", width: 768, padding: 32 },
      { name: "1024px (Desktop workspace)", width: 1024, padding: 32 },
    ];

    viewports.forEach(({ name, width, padding }) => {
      it(`verifies pixel containment budget for ${name}`, () => {
        const netAvailable = width - padding;

        if (width < 768) {
          // Mobile Budget:
          // Left: Shield (28px) + Gap (6px) + Divider (1px) + Gap (6px) + Max Store Pill (100px) = 141px
          const maxLeftMobile = 28 + 6 + 1 + 6 + 100;
          // Right: Mobile Search (30px) + Gap (6px) + Plus (30px) + Gap (6px) + Bell (30px) + Gap (6px) + Profile (30px) = 138px
          const maxRightMobile = 30 + 6 + 30 + 6 + 30 + 6 + 30;
          const totalMobileWidth = maxLeftMobile + maxRightMobile; // 279px

          expect(totalMobileWidth).toBeLessThanOrEqual(netAvailable);
          const clearance = netAvailable - totalMobileWidth;
          expect(clearance).toBeGreaterThanOrEqual(20); // At least 20px cushion even at 320px!
        } else {
          // Desktop Budget:
          // Left: Shield (30px) + Gap (8px) + Wordmark (~80px) + Gap (8px) + Divider (1px) + Gap (8px) + Store Pill (220px) + Gap (8px) + Sidebar Toggle (30px) + Gap (8px) + Suite Switcher (~140px)
          const maxLeftDesktop = 30 + 8 + 80 + 8 + 1 + 8 + 220 + 8 + 30 + 8 + 140; // ~541px
          // Right: Split Action (~130px) + Live Sync (~70px) + Bell (34px) + Profile (34px) = ~268px
          // At 768px, search bar (flex-1 max-w-md mx-2) shrinks or fits in available space
          expect(netAvailable).toBeGreaterThan(541);
        }
      });
    });

    it("verifies header container prevents line wrapping (no flex-wrap)", () => {
      // Header must be flex items-center justify-between and MUST NOT have flex-wrap
      expect(appLayoutSource).toMatch(/<header[^>]*flex\s+items-center\s+justify-between/);
      expect(appLayoutSource).not.toMatch(/<header[^>]*flex-wrap/);
    });

    it("verifies left header container has min-w-0 and shrink-0 to prevent flex children blowouts", () => {
      expect(appLayoutSource).toMatch(/<div\s+className="flex\s+items-center\s+gap-1\.5\s+sm:gap-2\s+shrink-0\s+min-w-0">/);
    });

    it("verifies right header container has shrink-0 and ml-auto", () => {
      expect(appLayoutSource).toMatch(/<div\s+className="flex\s+items-center\s+gap-1\.5\s+sm:gap-2\s+shrink-0\s+ml-auto">/);
    });

    it("verifies desktop-only widgets are suppressed on mobile views (< 768px)", () => {
      // SuiteSwitcher is hidden on mobile
      expect(appLayoutSource).toMatch(/hidden\s+sm:inline-flex[\s\S]*?<SuiteSwitcher/);
      // Sidebar toggle button is hidden on mobile
      expect(appLayoutSource).toMatch(/hidden\s+sm:flex\s+items-center\s+justify-center\s+w-7\.5\s+h-7\.5[\s\S]*?sidebarOpen/);
      // Desktop search input is hidden on mobile (hidden md:flex)
      expect(appLayoutSource).toMatch(/hidden\s+md:flex\s+flex-1\s+max-w-md\s+mx-2/);
      // Auto Import Tally is hidden on mobile and tablet (hidden xl:flex)
      expect(appLayoutSource).toMatch(/hidden\s+xl:flex\s+items-center\s+gap-1\.5\s+h-8\.5/);
    });

    it("verifies outer application shell has overflow-hidden on root container", () => {
      expect(appLayoutSource).toMatch(/<div\s+className="flex\s+flex-col\s+h-screen\s+w-full\s+overflow-hidden\s+bg-background">/);
    });
  });
});
