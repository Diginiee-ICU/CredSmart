/**
 * @file challengerM1Round2MobileDrawer.adversarial.test.tsx
 * @description Adversarial Challenger Test Suite for Milestone 1 Round 2.
 * Strictly verifies mobile drawer layout, absolute positioning, viewport containment,
 * touch ergonomics, and state synchronization in PublicHeader.tsx.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PublicHeader } from "@/components/public/PublicHeader";
import { ROUTE_PATHS } from "@/config/routes";

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

describe("Challenger M1 Round 2: Mobile Drawer Adversarial & Ergonomic Harness", () => {
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
  // Section 1: Mobile Drawer Positioning & Layout Geometry Classes
  // ==========================================================================
  describe("1. Mobile Drawer Absolute Positioning & Clamping", () => {
    it("renders drawer with exact absolute positioning and scroll containment tokens", () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      // Initially closed
      expect(screen.queryByTestId("mobile-drawer")).not.toBeInTheDocument();

      // Open drawer
      const toggle = screen.getByLabelText("Toggle navigation menu");
      fireEvent.click(toggle);

      const drawer = screen.getByTestId("mobile-drawer");
      expect(drawer).toBeInTheDocument();

      // Required positioning and containment classes
      expect(drawer).toHaveClass("lg:hidden");
      expect(drawer).toHaveClass("absolute");
      expect(drawer).toHaveClass("top-full");
      expect(drawer).toHaveClass("left-0");
      expect(drawer).toHaveClass("right-0");
      expect(drawer).toHaveClass("w-full");
      expect(drawer).toHaveClass("max-h-[calc(100vh-3rem)]");
      expect(drawer).toHaveClass("overflow-y-auto");
      expect(drawer).toHaveClass("border-b");
      expect(drawer).toHaveClass("border-slate-200");
      expect(drawer).toHaveClass("bg-white");
      expect(drawer).toHaveClass("shadow-xl");
    });

    it("verifies drawer is rendered as direct child of header and NOT inside the inner horizontal flex bar", () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      const toggle = screen.getByLabelText("Toggle navigation menu");
      fireEvent.click(toggle);

      const header = container.querySelector("header");
      const innerBar = header?.firstElementChild;
      const drawer = screen.getByTestId("mobile-drawer");

      // Header must contain both innerBar and drawer as sibling children
      expect(header).toBeInTheDocument();
      expect(innerBar).toBeInTheDocument();
      expect(drawer.parentElement).toBe(header);
      expect(drawer.parentElement).not.toBe(innerBar);

      // Inner bar must retain flex justify-between without drawer contamination
      expect(innerBar).toHaveClass("flex");
      expect(innerBar).toHaveClass("justify-between");
      expect(innerBar).toHaveClass("w-full");
      expect(innerBar).not.toContainElement(drawer);
    });
  });

  // ==========================================================================
  // Section 2: Viewport & Top Header Bar Containment Invariance
  // ==========================================================================
  describe("2. Viewport & Top Header Bar Containment Invariance", () => {
    it("preserves header height classes, branding link, and toggle button dimensions across drawer toggles", () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      const header = container.querySelector("header");
      expect(header).toHaveClass("sticky");
      expect(header).toHaveClass("top-0");
      expect(header).toHaveClass("z-50");
      expect(header).toHaveClass("h-12");
      expect(header).toHaveClass("sm:h-13");

      const brandLogo = screen.getByRole("link", { name: /credsmart/i });
      expect(brandLogo).toBeInTheDocument();
      expect(brandLogo).toHaveAttribute("href", "/");

      const toggle = screen.getByLabelText("Toggle navigation menu");
      expect(toggle).toHaveClass("w-11");
      expect(toggle).toHaveClass("h-11"); // 44x44px touch target

      // Toggle OPEN
      fireEvent.click(toggle);

      // Header dimensions and identity must remain strictly invariant
      expect(header).toHaveClass("h-12");
      expect(header).toHaveClass("sm:h-13");
      expect(brandLogo).toBeInTheDocument();
      expect(brandLogo).toHaveAttribute("href", "/");
      expect(toggle).toHaveClass("w-11");
      expect(toggle).toHaveClass("h-11");

      // Toggle CLOSED
      fireEvent.click(toggle);

      expect(header).toHaveClass("h-12");
      expect(header).toHaveClass("sm:h-13");
      expect(brandLogo).toBeInTheDocument();
      expect(toggle).toHaveClass("w-11");
      expect(toggle).toHaveClass("h-11");
      expect(screen.queryByTestId("mobile-drawer")).not.toBeInTheDocument();
    });

    it("resists rapid alternating clicks without state de-synchronization or orphaned elements", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      const toggle = screen.getByLabelText("Toggle navigation menu");

      // Rapidly toggle 7 times (odd -> open)
      for (let i = 0; i < 7; i++) {
        fireEvent.click(toggle);
      }
      expect(screen.getByTestId("mobile-drawer")).toBeInTheDocument();

      // 1 more click (even -> closed)
      fireEvent.click(toggle);
      expect(screen.queryByTestId("mobile-drawer")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Section 3: Navigation Dismissal & React Router Synchronization
  // ==========================================================================
  describe("3. Navigation Dismissal & Router Sync in Mobile Drawer", () => {
    it("dismisses drawer and synchronizes router on same-page anchor link click on root path", () => {
      const mockElement = document.createElement("div");
      mockElement.id = "suites";
      document.body.appendChild(mockElement);

      render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      // Open drawer
      fireEvent.click(screen.getByLabelText("Toggle navigation menu"));
      const drawer = screen.getByTestId("mobile-drawer");
      expect(drawer).toBeInTheDocument();

      // Click anchor link inside drawer
      const posLinkInDrawer = within(drawer).getByRole("link", { name: /^POS & Billing ERP$/i });
      fireEvent.click(posLinkInDrawer);

      // Verify router navigation called with proper hash
      expect(mockNavigate).toHaveBeenCalledWith("/#suites");
      expect(mockElement.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });

      // Verify drawer immediately dismissed
      expect(screen.queryByTestId("mobile-drawer")).not.toBeInTheDocument();

      mockElement.remove();
    });

    it("dismisses drawer and calls navigate when clicking standard page link inside drawer", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      // Open drawer
      fireEvent.click(screen.getByLabelText("Toggle navigation menu"));
      const drawer = screen.getByTestId("mobile-drawer");

      // Click Features link inside drawer
      const featuresLink = within(drawer).getByRole("link", { name: /^Features$/i });
      fireEvent.click(featuresLink);

      // Drawer should be dismissed
      expect(screen.queryByTestId("mobile-drawer")).not.toBeInTheDocument();
    });

    it("dismisses drawer when native app download chips are clicked", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      // Open drawer
      fireEvent.click(screen.getByLabelText("Toggle navigation menu"));
      let drawer = screen.getByTestId("mobile-drawer");

      const androidChip = within(drawer).getByRole("link", { name: /Android APK/i });
      expect(androidChip).toHaveAttribute("target", "_blank");
      expect(androidChip).toHaveAttribute("rel", "noopener noreferrer");

      fireEvent.click(androidChip);
      expect(screen.queryByTestId("mobile-drawer")).not.toBeInTheDocument();

      // Re-open and test Windows chip
      fireEvent.click(screen.getByLabelText("Toggle navigation menu"));
      drawer = screen.getByTestId("mobile-drawer");

      const windowsChip = within(drawer).getByRole("link", { name: /Windows PC/i });
      expect(windowsChip).toHaveAttribute("target", "_blank");
      expect(windowsChip).toHaveAttribute("rel", "noopener noreferrer");

      fireEvent.click(windowsChip);
      expect(screen.queryByTestId("mobile-drawer")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Section 4: Role-Based & Authentication Ergonomics in Mobile Drawer
  // ==========================================================================
  describe("4. Mobile Drawer Auth & Role Ergonomics", () => {
    it("renders Login and Start Free Now buttons with ergonomic 38px (h-9.5) and full-width in drawer when unauthenticated", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByLabelText("Toggle navigation menu"));
      const drawer = screen.getByTestId("mobile-drawer");

      const loginBtn = within(drawer).getByRole("button", { name: /^Login$/i });
      const signupBtn = within(drawer).getByRole("button", { name: /^Start Free Now$/i });

      expect(loginBtn).toHaveClass("w-full");
      expect(loginBtn).toHaveClass("h-9.5");
      expect(signupBtn).toHaveClass("w-full");
      expect(signupBtn).toHaveClass("h-9.5");

      // Click login button link in drawer -> dismisses drawer
      const loginLink = loginBtn.closest("a");
      expect(loginLink).toHaveAttribute("href", `${ROUTE_PATHS.auth}?mode=login`);
      fireEvent.click(loginLink!);
      expect(screen.queryByTestId("mobile-drawer")).not.toBeInTheDocument();
    });

    it("renders Open Workspace CTA and routes cashier to checkout vs owner to dashboard", () => {
      // 1. Store Owner
      mockUseAuth.mockReturnValue({
        user: { id: "user-owner", email: "owner@credsmart.com" },
        loading: false,
        signOut: vi.fn(),
      });
      mockUseOrganization.mockReturnValue({
        userRole: "store_owner",
        userPermissions: {},
        loading: false,
      });

      const { unmount } = render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByLabelText("Toggle navigation menu"));
      const drawer = screen.getByTestId("mobile-drawer");

      const workspaceLink = within(drawer).getByRole("link", { name: /Open Workspace/i });
      expect(workspaceLink).toHaveAttribute("href", ROUTE_PATHS.dashboard);

      unmount();

      // 2. Cashier
      mockUseOrganization.mockReturnValue({
        userRole: "cashier",
        userPermissions: {},
        loading: false,
      });

      render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByLabelText("Toggle navigation menu"));
      const cashierDrawer = screen.getByTestId("mobile-drawer");

      const cashierWorkspaceLink = within(cashierDrawer).getByRole("link", { name: /Open Workspace/i });
      expect(cashierWorkspaceLink).toHaveAttribute("href", ROUTE_PATHS.checkout);
    });
  });

  // ==========================================================================
  // Section 5: Active Link Highlighting Verification
  // ==========================================================================
  describe("5. Active Link Highlight State in Mobile Drawer", () => {
    it("accurately highlights active anchor link based on location hash", () => {
      render(
        <MemoryRouter initialEntries={["/#suites"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByLabelText("Toggle navigation menu"));
      const drawer = screen.getByTestId("mobile-drawer");

      const posLink = within(drawer).getByRole("link", { name: /^POS & Billing ERP$/i });
      const pricingLink = within(drawer).getByRole("link", { name: /^Pricing$/i });

      expect(posLink).toHaveClass("bg-blue-50");
      expect(posLink).toHaveClass("text-blue-700");
      expect(pricingLink).not.toHaveClass("bg-blue-50");
      expect(pricingLink).toHaveClass("text-slate-700");
    });
  });
});
