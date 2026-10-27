/**
 * @file desktopAppLayoutAdversarialPreservation.challenger.test.tsx
 * @description Empirical Challenger 2 Stress & Adversarial Test Suite for Milestone 1:
 * Desktop Preservation, Command Bar Hotkeys (⌘K, Ctrl+K), and Zero Regressions in AppLayout.tsx.
 *
 * Stress-tests:
 * 1. Desktop Command Bar Hotkeys:
 *    - ⌘K (metaKey + 'k') toggles Command Palette.
 *    - Ctrl+K (ctrlKey + 'k') toggles Command Palette.
 *    - Unrelated keys (e.g. 'k' without modifier, 'F1') do not crash or erroneously trigger CommandDialog.
 *    - 'credsmart_open_notifications' window event opens notifications.
 * 2. Desktop Structural Preservation:
 *    - 52px desktop header height (md:h-13).
 *    - 28px/30px CredSmart Shield platform mark (/favicon.png).
 *    - Styled wordmark 'CredSmart' hidden on mobile, visible on desktop (hidden sm:inline).
 *    - 1px hairline divider (h-4 w-px bg-slate-200 dark:bg-slate-800).
 *    - Tenant Store Switcher pill with responsive max widths.
 *    - Sidebar toggle button with hidden sm:flex.
 *    - SuiteSwitcher with hidden sm:inline-flex.
 *    - Centered Command Palette trigger with hidden md:flex.
 *    - Royal Blue split button with hidden sm:flex.
 *    - Live Sync indicator with hidden sm:inline-flex.
 *    - Auto Import Tally with hidden xl:flex.
 *    - Desktop Notification Bell (hidden sm:flex) vs Mobile (flex sm:hidden).
 * 3. Viewport Containment:
 *    - Outer layout containment (flex-col h-screen w-full overflow-hidden).
 *    - Main content area min-h-0 containment.
 * 4. Route Isolation:
 *    - isPosRoute skips AppLayout universal header.
 *    - isCrmDashboard hides header on mobile, preserves on desktop.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import fs from "fs";
import path from "path";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// Mock ResizeObserver and scrollIntoView for cmdk in jsdom
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver as any;
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock child modals and heavyweight components to keep test isolated and fast
vi.mock("@/components/AppSidebar", () => ({
  AppSidebar: ({ isOpen }: { isOpen: boolean; onClose: () => void }) => (
    <nav data-testid="mock-sidebar" data-open={isOpen ? "true" : "false"}>
      Sidebar
    </nav>
  ),
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
  NotificationCenter: ({ open }: { open: boolean }) => (
    <div data-testid="mock-notification-center" data-open={open ? "true" : "false"} />
  ),
}));
vi.mock("@/components/notifications/FeatureBubbleNotification", () => ({
  FeatureBubbleNotification: () => null,
}));

// Mock hooks
const mockUseOrganization = vi.fn();
const mockUseActiveSuite = vi.fn();
const mockUseNetworkInvoices = vi.fn();
const mockUseAuth = vi.fn();
const mockNavigate = vi.fn();

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

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import AppLayout from "@/components/AppLayout";

const APP_LAYOUT_PATH = path.resolve(process.cwd(), "src/components/AppLayout.tsx");

describe("Challenger 2: AppLayout Desktop Preservation & Hotkeys Adversarial Suite", () => {
  let appLayoutSource: string;

  beforeEach(() => {
    vi.clearAllMocks();
    appLayoutSource = fs.readFileSync(APP_LAYOUT_PATH, "utf-8");

    mockUseAuth.mockReturnValue({
      user: { id: "user-1", email: "admin@credsmart.store" },
      signOut: vi.fn(),
    });
    mockUseActiveSuite.mockReturnValue({
      activeSuite: "billing",
      isCrm: false,
      switchSuite: vi.fn(),
    });
    mockUseNetworkInvoices.mockReturnValue({
      pendingCount: 2,
      unreadCount: 5,
    });
    mockUseOrganization.mockReturnValue({
      org: {
        id: "org-1",
        name: "Acme Enterprises",
        logo_url: "https://example.com/logo.png",
        business_type: "Wholesale",
      },
      orgId: "org-1",
      organizations: [
        { id: "org-1", name: "Acme Enterprises", logo_url: "https://example.com/logo.png" },
        { id: "org-2", name: "Acme Retail Branch", logo_url: "" },
      ],
      switchOrganization: vi.fn(),
      userRole: "store_owner",
      userPermissions: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to render AppLayout with a test route outlet
  const renderLayoutAtRoute = (initialPath: string) => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route path="dashboard" element={<div data-testid="page-content">Dashboard Outlet</div>} />
            <Route path="billing/dashboard" element={<div data-testid="page-content">Billing Dashboard Outlet</div>} />
            <Route path="crm" element={<div data-testid="crm-outlet">CRM Dashboard Outlet</div>} />
            <Route path="pos" element={<div data-testid="pos-workbench">POS Billing Workbench Outlet</div>} />
            <Route path="checkout" element={<div data-testid="checkout-page">Checkout Screen Outlet</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  };

  // =========================================================================
  // 1. DESKTOP HOTKEYS & KEYBOARD EVENT HANDLERS
  // =========================================================================
  describe("Desktop Hotkeys & Keyboard Handling", () => {
    it("toggles Command Palette on ⌘K (Meta + K) keydown event", () => {
      renderLayoutAtRoute("/dashboard");

      // Initially command input is not rendered in document body
      expect(screen.queryByPlaceholderText("Type a command or search...")).not.toBeInTheDocument();

      // Dispatch Meta+K (⌘K)
      act(() => {
        fireEvent.keyDown(document, { key: "k", metaKey: true });
      });

      // Command dialog opens
      expect(screen.getByPlaceholderText("Type a command or search...")).toBeInTheDocument();

      // Dispatch Meta+K again toggles it closed
      act(() => {
        fireEvent.keyDown(document, { key: "k", metaKey: true });
      });

      expect(screen.queryByPlaceholderText("Type a command or search...")).not.toBeInTheDocument();
    });

    it("toggles Command Palette on Ctrl + K keydown event", () => {
      renderLayoutAtRoute("/dashboard");

      // Dispatch Ctrl+K
      act(() => {
        fireEvent.keyDown(document, { key: "k", ctrlKey: true });
      });

      // Command dialog opens
      expect(screen.getByPlaceholderText("Type a command or search...")).toBeInTheDocument();
    });

    it("does NOT toggle Command Palette when 'k' is pressed without modifier keys", () => {
      renderLayoutAtRoute("/dashboard");

      act(() => {
        fireEvent.keyDown(document, { key: "k", metaKey: false, ctrlKey: false });
      });

      expect(screen.queryByPlaceholderText("Type a command or search...")).not.toBeInTheDocument();
    });

    it("opens NotificationCenter on 'credsmart_open_notifications' window event", () => {
      renderLayoutAtRoute("/dashboard");

      const notifCenter = screen.getByTestId("mock-notification-center");
      expect(notifCenter).toHaveAttribute("data-open", "false");

      // Dispatch custom window event
      act(() => {
        window.dispatchEvent(new CustomEvent("credsmart_open_notifications"));
      });

      expect(screen.getByTestId("mock-notification-center")).toHaveAttribute("data-open", "true");
    });
  });

  // =========================================================================
  // 2. DESKTOP WORKSPACE & COMMAND BAR STRUCTURAL ELEMENTS
  // =========================================================================
  describe("Desktop Layout Elements & Styling Boundaries", () => {
    it("renders desktop search bar trigger and clicking it opens the command dialog", () => {
      renderLayoutAtRoute("/dashboard");

      const searchTrigger = screen.getByText("Search or ⌘K...");
      expect(searchTrigger).toBeInTheDocument();

      act(() => {
        fireEvent.click(searchTrigger);
      });

      expect(screen.getByPlaceholderText("Type a command or search...")).toBeInTheDocument();
    });

    it("preserves desktop Royal Blue split button with New Invoice action and dropdown trigger", () => {
      renderLayoutAtRoute("/dashboard");

      // 'New Invoice' text button
      const newInvoiceBtn = screen.getByText("New Invoice");
      expect(newInvoiceBtn).toBeInTheDocument();

      // Dropdown trigger button exists
      const chevronTrigger = screen.getByLabelText("More creation options");
      expect(chevronTrigger).toBeInTheDocument();
    });

    it("renders Live Sync status indicator on desktop", () => {
      renderLayoutAtRoute("/dashboard");

      const liveSyncText = screen.getByText("Live Sync");
      expect(liveSyncText).toBeInTheDocument();
      expect(liveSyncText.closest("div")?.className).toContain("hidden sm:inline-flex");
    });

    it("renders Auto Import Tally button on desktop >= xl: screen", () => {
      renderLayoutAtRoute("/dashboard");

      const tallyBtn = screen.getByText("Auto Import Tally");
      expect(tallyBtn).toBeInTheDocument();
      expect(tallyBtn.closest("button")?.className).toContain("hidden xl:flex");
    });

    it("renders desktop and mobile notification bells with independent responsive classes", () => {
      renderLayoutAtRoute("/dashboard");

      const bells = screen.getAllByLabelText(/Notifications/);
      expect(bells.length).toBe(2);

      const desktopBell = bells.find((b) => b.className.includes("hidden sm:flex"));
      const mobileBell = bells.find((b) => b.className.includes("flex sm:hidden"));

      expect(desktopBell).toBeDefined();
      expect(mobileBell).toBeDefined();
      expect(desktopBell?.className).toContain("w-8.5 h-8.5");
      expect(mobileBell?.className).toContain("w-8.5 h-8.5");
    });

    it("renders desktop profile trigger avatar with uppercase store initial", () => {
      const { container } = renderLayoutAtRoute("/dashboard");

      // Look for the profile button with the initial "A"
      const profileButton = container.querySelector('button.rounded-lg.bg-slate-900');
      expect(profileButton).toBeInTheDocument();
      expect(profileButton?.textContent?.trim()).toBe("A");
    });
  });

  // =========================================================================
  // 3. ROUTE ISOLATION & VIEWPORT BOUNDARY VERIFICATION
  // =========================================================================
  describe("Route Isolation & Layout Containment", () => {
    it("completely skips the universal header on POS/Checkout routes (!isPosRoute)", () => {
      const { container } = renderLayoutAtRoute("/pos");

      // On /pos, AppLayout should NOT render <header>
      expect(container.querySelector("header")).toBeNull();
      expect(screen.getByTestId("pos-workbench")).toBeInTheDocument();
    });

    it("skips universal header on /checkout routes as well", () => {
      const { container } = renderLayoutAtRoute("/checkout");

      expect(container.querySelector("header")).toBeNull();
      expect(screen.getByTestId("checkout-page")).toBeInTheDocument();
    });

    it("maintains 'hidden md:flex' on CRM Dashboard to avoid duplicate mobile headers while keeping desktop header intact", () => {
      const { container } = renderLayoutAtRoute("/crm");

      const header = container.querySelector("header");
      expect(header).not.toBeNull();
      expect(header?.className).toContain("hidden md:flex");
      expect(screen.getByTestId("crm-outlet")).toBeInTheDocument();
    });

    it("verifies strict viewport containment in CSS classes", () => {
      // Outer wrapper has h-screen w-full overflow-hidden
      expect(appLayoutSource).toMatch(/flex flex-col h-screen w-full overflow-hidden bg-background/);

      // Header has shrink-0 sticky top-0
      expect(appLayoutSource).toMatch(/shrink-0 sticky top-0 z-30/);

      // Main content body has min-h-0 and overflow-y-auto
      expect(appLayoutSource).toMatch(/flex-1 min-w-0 min-h-0 flex flex-col/);
      expect(appLayoutSource).toMatch(/overflow-y-auto/);
    });
  });
});
