import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ROUTE_PATHS } from "@/config/routes";
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

describe("M1 Adversarial Challenge: Invariance, Mobile Divergence & Isolation", () => {
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

  describe("Challenge Target 4: Mobile Divergence (<768px vs >=768px)", () => {
    it("PublicHeader: desktop nav is hidden on mobile/tablet via 'hidden lg:flex' and hamburger has 44x44px touch target", () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      // Verify desktop nav bar is strictly responsive-hidden
      const desktopNav = container.querySelector("nav");
      expect(desktopNav).toBeInTheDocument();
      expect(desktopNav?.className).toContain("hidden");
      expect(desktopNav?.className).toContain("lg:flex");

      // Verify hamburger button is present for mobile/tablet
      const hamburgerButton = screen.getByRole("button", { name: /toggle navigation menu/i });
      expect(hamburgerButton).toBeInTheDocument();
      expect(hamburgerButton.className).toContain("lg:hidden");
      expect(hamburgerButton.className).toContain("w-11");
      expect(hamburgerButton.className).toContain("h-11"); // 44x44px ergonomic touch target
    });

    it("PublicHeader: mobile drawer provides full-width action buttons without horizontal overflow", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      const hamburgerButton = screen.getByRole("button", { name: /toggle navigation menu/i });
      fireEvent.click(hamburgerButton);

      // Drawer opens
      const loginButtons = screen.getAllByRole("button", { name: /login/i });
      const drawerLoginBtn = loginButtons.find((btn) => btn.className.includes("w-full"));
      expect(drawerLoginBtn).toBeDefined();
      expect(drawerLoginBtn?.className).toContain("w-full");
      expect(drawerLoginBtn?.className).toContain("h-9.5");

      const signupDrawerBtn = screen.getByRole("button", { name: /start free now/i });
      expect(signupDrawerBtn).toBeInTheDocument();
      expect(signupDrawerBtn.className).toContain("w-full");
      expect(signupDrawerBtn.className).toContain("h-9.5");
    });

    it("PublicConversionBanner: switches to vertical stack on mobile (<1024px) with full-width CTA", () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicConversionBanner />
        </MemoryRouter>
      );

      const bannerCard = container.querySelector(".rounded-2xl");
      expect(bannerCard).toBeInTheDocument();
      expect(bannerCard?.className).toContain("flex-col");
      expect(bannerCard?.className).toContain("lg:flex-row");
      expect(bannerCard?.className).toContain("overflow-hidden"); // prevents ambient glow overflow

      const ctaButton = screen.getByRole("button", { name: /start free now/i });
      expect(ctaButton).toBeInTheDocument();
      expect(ctaButton.className).toContain("w-full");
      expect(ctaButton.className).toContain("sm:w-auto");
      expect(ctaButton.className).toContain("h-9.5");
      expect(ctaButton.className).toContain("px-4.5");
    });

    it("PublicFooter: mobile uses 2 columns, tablet 4 columns, desktop 6 columns without horizontal overflow", () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicFooter />
        </MemoryRouter>
      );

      const footerGrid = container.querySelector(".grid");
      expect(footerGrid).toBeInTheDocument();
      expect(footerGrid?.className).toContain("grid-cols-2");
      expect(footerGrid?.className).toContain("md:grid-cols-4");
      expect(footerGrid?.className).toContain("lg:grid-cols-6");
    });

    it("PublicLayout: enforces overflow-x-hidden on main content to guarantee zero viewport horizontal scroll", () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicLayout>
            <div data-testid="child-content">Content</div>
          </PublicLayout>
        </MemoryRouter>
      );

      const mainElement = container.querySelector("main");
      expect(mainElement).toBeInTheDocument();
      expect(mainElement?.className).toContain("overflow-x-hidden");
      expect(mainElement?.className).toContain("relative");
      expect(mainElement?.className).toContain("min-h-0");
    });
  });

  describe("Adversarial Edge Cases & Navigation Stress", () => {
    it("handles malicious double-slash / irregular anchor navigation safely without crash or '//' path", () => {
      render(
        <MemoryRouter initialEntries={["/features"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      const posBillingLink = screen.getByRole("link", { name: /POS & Billing ERP|POS Billing/i });
      fireEvent.click(posBillingLink);

      expect(mockNavigate).toHaveBeenCalled();
      const navigatedPath = mockNavigate.mock.calls[0][0];
      expect(navigatedPath).not.toContain("//");
      expect(navigatedPath).toBe("/#suites");
    });

    it("smooth scroll fallback handles non-existent DOM element gracefully without error", () => {
      render(
        <MemoryRouter initialEntries={["/#non-existent-section"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      // Should render and not throw
      expect(screen.getByRole("banner")).toBeInTheDocument();
    });

    it("handles authenticated cashier role routing to checkout instead of dashboard", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "test-user-id", email: "cashier@credsmart.online" },
        loading: false,
        signOut: vi.fn(),
      });
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

      const workspaceLink = screen.getByRole("link", { name: /open workspace/i });
      expect(workspaceLink).toBeInTheDocument();
      expect(workspaceLink).toHaveAttribute("href", ROUTE_PATHS.checkout);
    });
  });
});
