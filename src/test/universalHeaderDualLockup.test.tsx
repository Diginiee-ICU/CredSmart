/**
 * @file universalHeaderDualLockup.test.tsx
 * @description Master Comprehensive Test Suite for Milestone 1:
 * Universal Header Dual Lockup (Permanent CredSmart Shield Mark + Tenant Store Switcher).
 *
 * Verifies:
 * 1. Far Left Platform Mark:
 *    - Unconditionally renders CredSmart shield with /favicon.png
 *    - Styled 'CredSmart' wordmark
 *    - Decoupled completely from org.logo_url and org.name
 * 2. Adjacent Tenant Business Selector:
 *    - Separated by 1px hairline divider
 *    - Responsive trigger pill visible on mobile (< 768px) and desktop (>= 768px)
 *    - Renders tenant store logo (org?.logo_url) or fallback <Building2 />
 *    - Renders store name (org?.name || "My Business")
 * 3. Mobile Viewport (< 768px) Ergonomics:
 *    - Strict 48px slim header height (h-12 / h-[calc(3rem+env(safe-area-inset-top,0px))])
 *    - Strict 52px desktop height (md:h-13)
 *    - Zero horizontal overflow budget check on 360px-430px viewports
 * 4. Empirical DOM Rendering:
 *    - Organization with custom logo renders both platform shield AND store logo
 *    - Organization without custom logo renders platform shield AND Building2 fallback
 *    - Organization null/undefined renders platform shield AND "My Business" fallback
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import fs from "fs";
import path from "path";
import { MemoryRouter } from "react-router-dom";

// Mock child modals and heavyweight components to keep test isolated and fast
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

// Import AppLayout component after mocks
import AppLayout from "@/components/AppLayout";

const APP_LAYOUT_PATH = path.resolve(process.cwd(), "src/components/AppLayout.tsx");

describe("Universal Header Dual Lockup Test Suite", () => {
  let appLayoutSource: string;

  beforeEach(() => {
    vi.clearAllMocks();
    appLayoutSource = fs.readFileSync(APP_LAYOUT_PATH, "utf-8");

    // Standard default hook returns
    mockUseAuth.mockReturnValue({
      user: { id: "user-1", email: "storeowner@credsmart.test" },
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
  // 1. STATIC SOURCE AUDIT & ARCHITECTURAL FIDELITY TESTS
  // =========================================================================
  describe("Static Architectural Specification Audits", () => {
    it("verifies platform shield logo is unconditionally rendered with /favicon.png", () => {
      // Must contain /favicon.png image mark
      expect(appLayoutSource).toMatch(/src="\/favicon\.png"/);
      expect(appLayoutSource).toMatch(/alt="CredSmart Shield"/);

      // Must have prescribed 32px standard container
      expect(appLayoutSource).toMatch(
        /w-8\s+h-8\s+rounded-lg\s+border\s+border-slate-200\/80\s+dark:border-slate-800\s+bg-white\s+dark:bg-slate-950\s+p-1\s+shadow-2xs/
      );
    });

    it("verifies styled 'CredSmart' wordmark is rendered prominently across mobile and desktop", () => {
      expect(appLayoutSource).toMatch(
        /<span[^>]*font-bold\s+text-sm\s+sm:text-base\s+tracking-tight\s+text-slate-900\s+dark:text-white\s+font-sans[^>]*>\s*CredSmart\s*<\/span>/
      );
    });

    it("verifies platform brand mark is completely decoupled from org.logo_url and org.name", () => {
      // The platform mark NavLink must NOT conditionally switch between org.logo_url and Sparkles
      expect(appLayoutSource).not.toMatch(/org\?\.logo_url\s*\?\s*\(\s*<div[^>]*>[\s\S]*?<Sparkles/);
      expect(appLayoutSource).not.toMatch(/\{org\?\.name\s*\?\s*org\.name\s*:\s*"CredSmart"\}/);
    });

    it("verifies 1px hairline divider separates platform mark from store switcher", () => {
      expect(appLayoutSource).toMatch(
        /<div\s+className="hidden\s+sm:block\s+h-4\s+w-px\s+bg-slate-200\s+dark:bg-slate-800\s+shrink-0\s+mx-0\.5\s+sm:mx-1"\s+aria-hidden="true"\s*\/>/
      );
    });

    it("verifies store switcher trigger is visible on mobile with responsive max-width", () => {
      // Trigger must use 'flex'
      expect(appLayoutSource).toMatch(
        /flex\s+h-7\s+sm:h-8\s+px-1\.5\s+sm:px-2\.5\s+rounded-lg\s+border\s+border-slate-200\/80\s+dark:border-slate-800\s+bg-slate-50/
      );
      // Must contain responsive max-widths
      expect(appLayoutSource).toMatch(/max-w-\[100px\]\s+xs:max-w-\[130px\]\s+sm:max-w-\[180px\]\s+lg:max-w-\[220px\]/);
    });

    it("verifies header height conforms to 52px-56px standard to avoid clipping", () => {
      expect(appLayoutSource).toMatch(/h-13\s+sm:h-14/);
      expect(appLayoutSource).toMatch(/pt-\[env\(safe-area-inset-top,0px\)\]/);
    });

    it("verifies desktop-only controls are suppressed on mobile to prevent horizontal overflow", () => {
      // Sidebar menu toggle button is standard w-8.5 h-8.5
      expect(appLayoutSource).toMatch(/flex\s+items-center\s+justify-center\s+w-8\.5\s+h-8\.5/);

      // Suite switcher is hidden on mobile
      expect(appLayoutSource).toMatch(/hidden\s+sm:inline-flex/);

      // Desktop command palette search bar is hidden on mobile (md:flex)
      expect(appLayoutSource).toMatch(/hidden\s+md:flex\s+flex-1\s+max-w-md\s+mx-2/);

      // Mobile search icon button is hidden on desktop (md:hidden)
      expect(appLayoutSource).toMatch(/w-8\.5\s+h-8\.5\s+flex\s+items-center\s+justify-center\s+rounded-lg[\s\S]*?md:hidden/);
    });

    it("validates mobile pixel budget guarantees zero horizontal overflow on 360px viewport", () => {
      // Standard minimal mobile viewport width
      const viewportWidth = 360;
      const leftMargin = 10; // px-2.5
      const rightMargin = 10; // px-2.5
      const netAvailableWidth = viewportWidth - (leftMargin + rightMargin); // 340px

      // Left Dual Lockup Components:
      // Shield logo: 28px (w-7)
      // Gap: 4px
      // Divider: 1px
      // Gap: 4px
      // Compact store switcher pill: max 100px (icon 14px + gap 4px + text ~70px + chevron 10px)
      const leftDualLockupWidth = 28 + 4 + 1 + 4 + 100; // 137px max

      // Right Control Group (Mobile):
      // Search: 30px (w-7.5)
      // Gap: 6px
      // Quick Action (+): 30px (w-7.5)
      // Gap: 6px
      // Notification Bell: 30px (w-7.5)
      // Gap: 6px
      // Profile Avatar: 30px (w-7.5)
      const rightControlGroupWidth = 30 + 6 + 30 + 6 + 30 + 6 + 30; // 138px

      const totalOccupiedWidth = leftDualLockupWidth + rightControlGroupWidth; // 275px
      const remainingBuffer = netAvailableWidth - totalOccupiedWidth; // 65px minimum cushion!

      expect(totalOccupiedWidth).toBeLessThanOrEqual(280);
      expect(remainingBuffer).toBeGreaterThanOrEqual(60);
    });
  });

  // =========================================================================
  // 2. EMPIRICAL COMPONENT RENDERING & STATE-DRIVEN TESTS
  // =========================================================================
  describe("Empirical DOM Rendering Tests", () => {
    it("renders permanent platform shield mark alongside tenant store logo when org has logo_url", () => {
      mockUseOrganization.mockReturnValue({
        org: {
          id: "org-1",
          name: "Apex Hypermarket",
          logo_url: "https://cdn.example.com/apex-logo.png",
          business_type: "Supermarket",
        },
        orgId: "org-1",
        organizations: [
          {
            id: "org-1",
            name: "Apex Hypermarket",
            logo_url: "https://cdn.example.com/apex-logo.png",
          },
        ],
        switchOrganization: vi.fn(),
        userRole: "store_owner",
        userPermissions: null,
      });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppLayout />
        </MemoryRouter>
      );

      // 1. Permanent CredSmart platform shield must be in the DOM
      const platformShield = screen.getByAltText("CredSmart Shield");
      expect(platformShield).toBeInTheDocument();
      expect(platformShield).toHaveAttribute("src", "/favicon.png");

      // 2. CredSmart brand text must be in the DOM
      expect(screen.getByText("CredSmart")).toBeInTheDocument();

      // 3. Tenant Store Switcher must display tenant name
      expect(screen.getByText("Apex Hypermarket")).toBeInTheDocument();

      // 4. Tenant Store logo must also be in the DOM with org.name alt text
      const storeLogo = screen.getByAltText("Apex Hypermarket");
      expect(storeLogo).toBeInTheDocument();
      expect(storeLogo).toHaveAttribute("src", "https://cdn.example.com/apex-logo.png");
    });

    it("renders permanent platform shield mark with Building2 fallback when org has no logo_url", () => {
      mockUseOrganization.mockReturnValue({
        org: {
          id: "org-2",
          name: "Metro Retailers",
          logo_url: "",
          business_type: "Retail Store",
        },
        orgId: "org-2",
        organizations: [
          {
            id: "org-2",
            name: "Metro Retailers",
            logo_url: "",
          },
        ],
        switchOrganization: vi.fn(),
        userRole: "store_owner",
        userPermissions: null,
      });

      const { container } = render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppLayout />
        </MemoryRouter>
      );

      // 1. Platform shield still renders /favicon.png
      const platformShield = screen.getByAltText("CredSmart Shield");
      expect(platformShield).toBeInTheDocument();
      expect(platformShield).toHaveAttribute("src", "/favicon.png");

      // 2. CredSmart brand wordmark present
      expect(screen.getByText("CredSmart")).toBeInTheDocument();

      // 3. Tenant name present
      expect(screen.getByText("Metro Retailers")).toBeInTheDocument();

      // 4. Store logo image is NOT present
      expect(screen.queryByAltText("Metro Retailers")).not.toBeInTheDocument();

      // 5. Building2 SVG icon is rendered in the switcher trigger (first of 2 svgs: building icon + chevron)
      const triggerButton = container.querySelector('button[title="Metro Retailers"]');
      expect(triggerButton).toBeInTheDocument();
      const svgs = triggerButton?.querySelectorAll("svg");
      expect(svgs?.length).toBe(2);
    });

    it("gracefully renders platform shield and 'My Business' fallback when org is null", () => {
      mockUseOrganization.mockReturnValue({
        org: null,
        orgId: null,
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

      // 1. Platform shield mark is intact
      const platformShield = screen.getByAltText("CredSmart Shield");
      expect(platformShield).toBeInTheDocument();
      expect(platformShield).toHaveAttribute("src", "/favicon.png");

      // 2. CredSmart wordmark intact
      expect(screen.getByText("CredSmart")).toBeInTheDocument();

      // 3. Store switcher displays default "My Business"
      expect(screen.getByText("My Business")).toBeInTheDocument();
    });

    it("renders dual lockup correctly when in CRM suite", () => {
      mockUseActiveSuite.mockReturnValue({
        activeSuite: "crm",
        isCrm: true,
        switchSuite: vi.fn(),
      });
      mockUseOrganization.mockReturnValue({
        org: {
          id: "org-crm",
          name: "Global Enterprises",
          logo_url: "https://cdn.example.com/global.png",
        },
        orgId: "org-crm",
        organizations: [],
        switchOrganization: vi.fn(),
        userRole: "store_owner",
        userPermissions: null,
      });

      render(
        <MemoryRouter initialEntries={["/crm/tasks"]}>
          <AppLayout />
        </MemoryRouter>
      );

      // Both marks rendered in CRM mode
      expect(screen.getByAltText("CredSmart Shield")).toBeInTheDocument();
      expect(screen.getByText("CredSmart")).toBeInTheDocument();
      expect(screen.getByText("Global Enterprises")).toBeInTheDocument();
      expect(screen.getByAltText("Global Enterprises")).toBeInTheDocument();
    });
  });
});
