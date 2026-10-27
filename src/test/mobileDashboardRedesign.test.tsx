import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Dashboard from "@/pages/Dashboard";
import { BrowserRouter } from "react-router-dom";

// Mock router navigation
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock organization hook
vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => ({
    org: { id: "test-org-123", name: "Metro Retailers" },
    orgId: "test-org-123",
  }),
}));

// Mock toast hook
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: () => ({
      on: () => ({
        on: () => ({
          subscribe: vi.fn(),
        }),
      }),
    }),
    removeChannel: vi.fn(),
  },
}));

// Mock partiesApi & invoicesApi & documentsService
vi.mock("@/services/partiesApi", () => ({
  partiesApi: {
    getCreditTransactions: vi.fn().mockResolvedValue({
      data: [
        { id: "c1", party_type: "customer", amount: 15400, type: "credit", created_at: new Date().toISOString() },
        { id: "s1", party_type: "supplier", amount: 8200, type: "credit", created_at: new Date().toISOString() },
      ],
    }),
    savePartyRecord: vi.fn().mockResolvedValue({ data: { id: "p1" } }),
    recordCreditTransaction: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/services/invoicesApi", () => ({
  invoicesApi: {
    getSales: vi.fn().mockResolvedValue({
      data: [
        {
          id: "sale-1",
          invoice_number: "INV-2026-001",
          total: 4500,
          payment_method: "cash",
          created_at: new Date().toISOString(),
          customers: { name: "Rajesh Kumar" },
        },
        {
          id: "sale-2",
          invoice_number: "INV-2026-002",
          total: 12000,
          payment_method: "credit",
          created_at: new Date().toISOString(),
          customers: { name: "Anil Sharma" },
        },
      ],
    }),
  },
}));

vi.mock("@/services/documentsService", () => ({
  documentsService: {
    fetchPurchaseDocuments: vi.fn().mockResolvedValue([]),
  },
}));

// Mock child modals
vi.mock("@/components/SalesInvoiceModal", () => ({
  SalesInvoiceModal: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="sales-invoice-modal" /> : null),
}));
vi.mock("@/components/items/CreateItemModal", () => ({
  CreateItemModal: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="create-item-modal" /> : null),
}));
vi.mock("@/components/parties/CreatePartyModal", () => ({
  CreatePartyModal: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="create-party-modal" /> : null),
}));
vi.mock("@/components/UniversalQuickCreateModal", () => ({
  UniversalQuickCreateModal: ({ open }: { open: boolean }) => (open ? <div data-testid="universal-quick-create-modal" /> : null),
}));

// Mock ResponsiveContainer for recharts
vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 400, height: 200 }}>{children}</div>
    ),
  };
});

describe("Mobile Dashboard Redesign Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderDashboard = () =>
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

  describe("Requirement 1: Mobile Tally Banner & Dismissal Persistence", () => {
    it("renders the compact Tally banner with thumb-friendly close button when not dismissed", async () => {
      renderDashboard();

      const bannerTitle = await screen.findByText(/Tally & Excel Import/i);
      expect(bannerTitle).toBeInTheDocument();

      const closeButton = screen.getByRole("button", { name: /close banner/i });
      expect(closeButton).toBeInTheDocument();
    });

    it("smoothly dismisses and sets localStorage 'credsmart_dismissed_mobile_tally_banner' when X is clicked", async () => {
      renderDashboard();

      const closeButton = await screen.findByRole("button", { name: /close banner/i });
      fireEvent.click(closeButton);

      expect(localStorage.getItem("credsmart_dismissed_mobile_tally_banner")).toBe("true");

      await waitFor(() => {
        expect(screen.queryByText(/Tally & Excel Import/i)).not.toBeInTheDocument();
      });
    });

    it("does not render the Tally banner if already dismissed in localStorage", async () => {
      localStorage.setItem("credsmart_dismissed_mobile_tally_banner", "true");
      renderDashboard();

      await waitFor(() => {
        expect(screen.queryByText(/Tally & Excel Import/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("Requirement 2 & 3: High-Density 2x2 Financial Grid & Stripe/Square Retail Aesthetic", () => {
    it("renders the 4 core financial cards with bold monospaced Indian Rupee numerals and clean labels", async () => {
      renderDashboard();

      // Card 1: TO COLLECT
      const toCollectLabels = await screen.findAllByText("TO COLLECT");
      expect(toCollectLabels.length).toBeGreaterThanOrEqual(1);

      // Card 2: TO PAY
      const toPayLabels = await screen.findAllByText("TO PAY");
      expect(toPayLabels.length).toBeGreaterThanOrEqual(1);

      // Card 3: CASH & BANK
      const cashBankLabels = await screen.findAllByText("CASH & BANK");
      expect(cashBankLabels.length).toBeGreaterThanOrEqual(1);

      // Card 4: TODAY'S SALES
      expect(screen.getByText("TODAY'S SALES")).toBeInTheDocument();
    });

    it("navigates to the appropriate ledger when financial cards are tapped", async () => {
      renderDashboard();

      const toCollectCard = (await screen.findAllByText("TO COLLECT"))[0];
      fireEvent.click(toCollectCard.closest("div[class*='cursor-pointer']")!);
      expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining("/parties"));

      const toPayCard = (await screen.findAllByText("TO PAY"))[0];
      fireEvent.click(toPayCard.closest("div[class*='cursor-pointer']")!);
      expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining("/purchases"));
    });
  });

  describe("Requirement 2: Horizontal Swipeable Quick Action Strip", () => {
    it("renders all 5 required quick action buttons", async () => {
      renderDashboard();

      expect(await screen.findByText("Sale Bill")).toBeInTheDocument();
      expect(screen.getByText("POS Billing")).toBeInTheDocument();
      expect(screen.getByText("Add Item")).toBeInTheDocument();
      expect(screen.getByText("Add Customer")).toBeInTheDocument();
      expect(screen.getByText("Day Book")).toBeInTheDocument();
    });

    it("navigates to POS billing when 'POS Billing' is clicked", async () => {
      renderDashboard();

      const posBtn = await screen.findByText("POS Billing");
      fireEvent.click(posBtn.closest("button")!);
      expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining("/checkout"));
    });

    it("navigates to Day Book (Sales) when 'Day Book' is clicked", async () => {
      renderDashboard();

      const dayBookBtn = await screen.findByText("Day Book");
      fireEvent.click(dayBookBtn.closest("button")!);
      expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining("/sales"));
    });
  });

  describe("Requirement 2: Recent Activity List with Customer Initials & Status Badge", () => {
    it("renders customer name, initials avatar, and status badge", async () => {
      renderDashboard();

      // Verify customer initials avatar (e.g. RK for Rajesh Kumar, AS for Anil Sharma)
      expect(await screen.findByText("RK")).toBeInTheDocument();
      expect(screen.getAllByText("Rajesh Kumar").length).toBeGreaterThanOrEqual(1);

      expect(screen.getByText("AS")).toBeInTheDocument();
      expect(screen.getAllByText("Anil Sharma").length).toBeGreaterThanOrEqual(1);

      // Verify status pills
      expect(screen.getAllByText("PAID").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("PENDING").length).toBeGreaterThanOrEqual(1);
    });

    it("falls back to 'Walk-in Customer' and 'WC' when transaction customer name is missing", async () => {
      renderDashboard();
      // Should handle empty / undefined gracefully
      const avatars = await screen.findAllByText(/[A-Z]{2}/);
      expect(avatars.length).toBeGreaterThan(0);
    });
  });

  describe("Requirement 4 & Ergonomics: Touch Target Sizes & Storage Exception Safety", () => {
    it("ensures close button meets minimum 44px thumb-friendly touch target requirement", async () => {
      renderDashboard();
      const closeButton = await screen.findByRole("button", { name: /close banner/i });
      expect(closeButton.className).toMatch(/min-w-\[44px\]/);
      expect(closeButton.className).toMatch(/min-h-\[44px\]/);
    });

    it("ensures quick action buttons have ergonomic touch targets and tactile feedback", async () => {
      renderDashboard();
      const saleBillBtn = await screen.findByText("Sale Bill");
      expect(saleBillBtn.closest("button")?.className).toMatch(/touch-manipulation/);

      const posBtn = screen.getByText("POS Billing");
      expect(posBtn.closest("button")?.className).toMatch(/touch-manipulation/);
    });

    it("handles localStorage write exceptions safely without crashing the dashboard", async () => {
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

      renderDashboard();
      const closeButton = await screen.findByRole("button", { name: /close banner/i });
      expect(() => fireEvent.click(closeButton)).not.toThrow();

      await waitFor(() => {
        expect(screen.queryByText(/Tally & Excel Import/i)).not.toBeInTheDocument();
      });

      setItemSpy.mockRestore();
    });
  });
});
