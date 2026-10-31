import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import resolveConfig from "tailwindcss/resolveConfig";
import tailwindConfig from "../../tailwind.config";
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

describe("Milestone 1 Public Shell Components Test Suite", () => {
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

  // ============================================================================
  // 1. Tailwind Spacing Scale Verification
  // ============================================================================
  describe("Tailwind Spacing Scale Extension", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fullTheme = (resolveConfig(tailwindConfig as any) as any).theme;

    it("resolves spacing tokens '4.5' and '9.5' to exact pixel equivalent rem values", () => {
      expect(fullTheme.spacing["4.5"]).toBe("1.125rem"); // 18px
      expect(fullTheme.spacing["9.5"]).toBe("2.375rem"); // 38px
      expect(fullTheme.spacing["8.5"]).toBe("2.125rem"); // 34px
      expect(fullTheme.spacing["13"]).toBe("3.25rem");   // 52px
    });
  });

  // ============================================================================
  // 2. PublicHeader Component Verification
  // ============================================================================
  describe("PublicHeader", () => {
    it("renders dual-suite navigation links for POS & Billing ERP and Workforce CRM pointing to /#suites", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      const posLink = screen.getByRole("link", { name: /POS & Billing ERP|POS Billing/i });
      const crmLink = screen.getByRole("link", { name: /Workforce CRM/i });

      expect(posLink).toBeInTheDocument();
      expect(posLink).toHaveAttribute("href", "/#suites");
      expect(crmLink).toBeInTheDocument();
      expect(crmLink).toHaveAttribute("href", "/#suites");

      expect(screen.getByRole("link", { name: /Features/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Pricing/i })).toBeInTheDocument();
    });

    it("standardizes desktop action buttons to h-8.5 and prevents bloated bubble buttons", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      const loginButton = screen.getByRole("button", { name: /Login/i });
      const startFreeButton = screen.getByRole("button", { name: /Start Free/i });

      expect(loginButton).toBeInTheDocument();
      expect(startFreeButton).toBeInTheDocument();

      // Enforce 34px standard action button classes
      expect(loginButton.className).toContain("h-8.5");
      expect(loginButton.className).toContain("px-3");
      expect(loginButton.className).toContain("rounded-lg");
      expect(startFreeButton.className).toContain("h-8.5");
      expect(startFreeButton.className).toContain("px-3");
      expect(startFreeButton.className).toContain("rounded-lg");

      // Verify absolute absence of bloated bubble button classes
      expect(loginButton.className).not.toContain("h-10");
      expect(loginButton.className).not.toContain("h-12");
      expect(loginButton.className).not.toContain("rounded-3xl");
      expect(startFreeButton.className).not.toContain("h-10");
      expect(startFreeButton.className).not.toContain("h-12");
      expect(startFreeButton.className).not.toContain("rounded-3xl");
    });

    it("enforces fixed command bar height h-12 sm:h-13 to prevent Cumulative Layout Shift (CLS)", () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      const header = container.querySelector("header");
      expect(header).toBeInTheDocument();
      expect(header?.className).toContain("h-12");
      expect(header?.className).toContain("sm:h-13");
    });

    it("provides mobile hamburger button with minimum 44x44px touch target", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      const hamburgerButton = screen.getByLabelText("Toggle navigation menu");
      expect(hamburgerButton).toBeInTheDocument();
      expect(hamburgerButton.className).toContain("w-11");
      expect(hamburgerButton.className).toContain("h-11");
    });

    it("opens mobile drawer and closes on link interaction", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      const hamburgerButton = screen.getByLabelText("Toggle navigation menu");
      fireEvent.click(hamburgerButton);

      // Verify mobile drawer items are visible
      expect(screen.getByText("Download Native Apps")).toBeInTheDocument();

      // Click a nav link inside drawer
      const pricingLinks = screen.getAllByRole("link", { name: /Pricing/i });
      fireEvent.click(pricingLinks[pricingLinks.length - 1]);

      // Drawer should close
      expect(screen.queryByText("Download Native Apps")).not.toBeInTheDocument();
    });

    it("renders mobile drawer as an absolute dropdown beneath the header with scroll containment", () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      const hamburgerButton = screen.getByLabelText("Toggle navigation menu");
      fireEvent.click(hamburgerButton);

      const drawer = screen.getByTestId("mobile-drawer");
      expect(drawer).toBeInTheDocument();
      expect(drawer).toHaveClass("absolute");
      expect(drawer).toHaveClass("top-full");
      expect(drawer).toHaveClass("left-0");
      expect(drawer).toHaveClass("right-0");
      expect(drawer).toHaveClass("w-full");
      expect(drawer).toHaveClass("max-h-[calc(100vh-3rem)]");
      expect(drawer).toHaveClass("overflow-y-auto");
    });

    it("synchronizes React Router location state via navigate when clicking same-page anchor links", () => {
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

      expect(mockNavigate).toHaveBeenCalledWith("/#suites");
      expect(suitesElem.scrollIntoView).toHaveBeenCalled();

      suitesElem.remove();
    });

    it("navigates cleanly without double-slashes when clicking an anchor from subpage", () => {
      render(
        <MemoryRouter initialEntries={["/features"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      const posLink = screen.getByRole("link", { name: /POS & Billing ERP|POS Billing/i });
      fireEvent.click(posLink);

      expect(mockNavigate).toHaveBeenCalledWith("/#suites");
      expect(mockNavigate).not.toHaveBeenCalledWith("//#suites");
    });

    it("renders Open Workspace button with h-8.5 when user is authenticated", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "test-user-1", email: "test@credsmart.com" },
        loading: false,
        signOut: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicHeader />
        </MemoryRouter>
      );

      const workspaceButton = screen.getByRole("button", { name: /Open Workspace/i });
      expect(workspaceButton).toBeInTheDocument();
      expect(workspaceButton.className).toContain("h-8.5");
      expect(workspaceButton.className).toContain("px-3");
    });
  });

  // ============================================================================
  // 3. PublicFooter Component Verification
  // ============================================================================
  describe("PublicFooter", () => {
    it("renders dual-suite columns: POS & Billing ERP and Workforce CRM", () => {
      render(
        <MemoryRouter>
          <PublicFooter />
        </MemoryRouter>
      );

      // Verify POS & Billing suite column and features
      expect(screen.getByText("POS & Billing ERP")).toBeInTheDocument();
      expect(screen.getByText("POS Retail Billing")).toBeInTheDocument();
      expect(screen.getByText("GST Invoicing & Taxes")).toBeInTheDocument();
      expect(screen.getByText("Inventory & Godowns")).toBeInTheDocument();
      expect(screen.getByText("Customer Ledgers & Udhar")).toBeInTheDocument();
      expect(screen.getByText("Barcode Studio & Labels")).toBeInTheDocument();

      // Verify Workforce CRM suite column and 7 features
      expect(screen.getByText("Workforce CRM")).toBeInTheDocument();
      expect(screen.getByText("GPS Geofenced Attendance")).toBeInTheDocument();
      expect(screen.getByText("Automated Monthly Payroll")).toBeInTheDocument();
      expect(screen.getByText("Task Boards & Kanban")).toBeInTheDocument();
      expect(screen.getByText("Team Meet & Huddles")).toBeInTheDocument();
      expect(screen.getByText("Multi-Tier Staff Roles")).toBeInTheDocument();
      expect(screen.getByText("Bilingual Voice Copilot")).toBeInTheDocument();
      expect(screen.getByText("Team Announcements")).toBeInTheDocument();

      // Verify Resources & Company columns
      expect(screen.getByText("Resources & Pricing")).toBeInTheDocument();
      expect(screen.getByText("Company & Trust")).toBeInTheDocument();
    });

    it("renders official native app download chips with external download URLs", () => {
      render(
        <MemoryRouter>
          <PublicFooter />
        </MemoryRouter>
      );

      const androidLink = screen.getByRole("link", { name: /Download Android APK/i });
      const windowsLink = screen.getByRole("link", { name: /Download Windows PC/i });

      expect(androidLink).toHaveAttribute("target", "_blank");
      expect(windowsLink).toHaveAttribute("target", "_blank");
      expect(androidLink.getAttribute("href")).toContain("drive.usercontent.google.com");
      expect(windowsLink.getAttribute("href")).toContain("drive.usercontent.google.com");
    });

    it("standardizes trust badges to 11px micro-typography", () => {
      render(
        <MemoryRouter>
          <PublicFooter />
        </MemoryRouter>
      );

      const freeBadge = screen.getByText("100% Free Forever");
      expect(freeBadge).toHaveClass("text-[11px]");
      expect(freeBadge).toHaveClass("font-semibold");
    });

    it("renders dark navy footer surface (#0B132B) with balanced 6-column grid", () => {
      const { container } = render(
        <MemoryRouter>
          <PublicFooter />
        </MemoryRouter>
      );

      const footer = container.querySelector("footer");
      expect(footer?.className).toContain("bg-[#0B132B]");

      const grid = footer?.querySelector(".grid");
      expect(grid?.className).toContain("lg:grid-cols-6");
      expect(grid?.className).toContain("md:grid-cols-4");
      expect(grid?.className).toContain("grid-cols-2");
    });
  });

  // ============================================================================
  // 4. PublicConversionBanner Component Verification
  // ============================================================================
  describe("PublicConversionBanner", () => {
    it("strictly adheres to Rule 1 standard hero CTA dimensions without bloated buttons", () => {
      render(
        <MemoryRouter>
          <PublicConversionBanner />
        </MemoryRouter>
      );

      const button = screen.getByRole("button", { name: /Start Free Now/i });
      expect(button).toHaveClass("h-9.5");
      expect(button).toHaveClass("px-4.5");
      expect(button).toHaveClass("rounded-lg");
      expect(button).toHaveClass("text-sm");
      expect(button).toHaveClass("font-semibold");
      expect(button).toHaveClass("shadow-xs");

      // Verify complete absence of bloated classes
      expect(button).not.toHaveClass("h-13");
      expect(button).not.toHaveClass("px-8");
      expect(button).not.toHaveClass("rounded-xl");
      expect(button).not.toHaveClass("shadow-2xl");
      expect(button).not.toHaveClass("font-black");
    });

    it("renders dual-suite platform copy and benefits", () => {
      render(
        <MemoryRouter>
          <PublicConversionBanner />
        </MemoryRouter>
      );

      expect(screen.getByText("Ready to Run Your Entire Business on One Platform?")).toBeInTheDocument();
      expect(screen.getByText("Unlimited POS Invoices & Khata")).toBeInTheDocument();
      expect(screen.getByText("GPS Attendance & Staff Payroll")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 5. PublicLayout Component Verification
  // ============================================================================
  describe("PublicLayout", () => {
    it("wraps child content with header and footer and provides overflow containment", () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/"]}>
          <PublicLayout>
            <div data-testid="layout-test-child">Child Content Area</div>
          </PublicLayout>
        </MemoryRouter>
      );

      expect(screen.getByTestId("layout-test-child")).toBeInTheDocument();
      expect(screen.getAllByText("POS & Billing ERP").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Workforce CRM").length).toBeGreaterThanOrEqual(2);

      const main = container.querySelector("main");
      expect(main?.className).toContain("overflow-x-hidden");
      expect(main?.className).toContain("relative");
      expect(main?.className).toContain("min-h-0");
    });

    it("handles hash-aware scroll navigation smoothly without error", async () => {
      const targetElement = document.createElement("div");
      targetElement.id = "suites";
      document.body.appendChild(targetElement);

      render(
        <MemoryRouter initialEntries={["/#suites"]}>
          <PublicLayout>
            <div>Target Content</div>
          </PublicLayout>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(targetElement.scrollIntoView).toHaveBeenCalled();
      });

      targetElement.remove();
    });
  });
});
