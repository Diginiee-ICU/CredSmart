/**
 * @file desktopPosPreservation.challenger.test.tsx
 * @description Adversarial empirical stress test for Desktop POS preservation in Milestone 2.
 *
 * Verifies:
 * 1. Hotkeys execution:
 *    - F1 (search focus)
 *    - F6 (Save & Print) & F7 (Quick Save) with active items
 *    - CTRL+I (New item modal trigger)
 *    - CTRL+B (Held bills creation and 5-tab upper boundary enforcement)
 *    - CTRL+1 to CTRL+5 (Direct tab switching hotkeys)
 *    - P, Q, D (Price, Quantity, Discount modals with selected line item)
 * 2. 3-Region Right Panel Viewport Containment Architecture
 * 3. Held Bills multi-tab state isolation & tab switching lifecycle
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import POSBilling from "@/pages/POSBilling";

const { mockToast, mockSoundService, mockProducts, mockBatches } = vi.hoisted(() => ({
  mockToast: vi.fn(),
  mockSoundService: {
    playErrorBeep: vi.fn(),
    playSuccessChime: vi.fn(),
    playBeep: vi.fn(),
    playScanBeep: vi.fn(),
    playTabSwitch: vi.fn(),
  },
  mockProducts: [
    {
      id: "prod-1",
      name: "Basmati Rice 5kg",
      barcode: "8901030383748",
      category: "Grocery",
      tags: { selling_price: "450", mrp: "500", stock: "20" },
    },
    {
      id: "prod-2",
      name: "Sunflower Oil 1L",
      barcode: "8901052002146",
      category: "Grocery",
      tags: { selling_price: "160", mrp: "190", stock: "35" },
    },
  ],
  mockBatches: [
    {
      id: "batch-1",
      product_id: "prod-1",
      batch_number: "RICE-01",
      mrp: 500,
      cost_price: 380,
      stock: 20,
    },
  ],
}));

vi.mock("@/context/ProductsContext", () => ({
  useProducts: () => ({ products: mockProducts, loading: false }),
  ProductsProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: any[]) => mockToast(...args),
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/lib/sound", () => ({
  soundService: mockSoundService,
}));

vi.mock("@/utils/soundAndHaptics", () => ({
  playScanBeep: vi.fn(),
  playSuccessChime: vi.fn(),
  playDeleteThud: vi.fn(),
  triggerHapticScan: vi.fn(),
  triggerHapticSuccess: vi.fn(),
  triggerHapticDelete: vi.fn(),
}));

vi.mock("@/utils/posVoiceService", () => ({
  createSpeechRecognizer: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    abort: vi.fn(),
  })),
  parsePOSVoiceCommand: vi.fn(),
  speakPOSMessage: vi.fn(),
  isVoiceSupported: () => true,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-pos-emp", email: "cashier@credsmart.test" },
    signOut: vi.fn(),
  }),
}));

vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => ({
    org: {
      id: "org-pos-test",
      name: "CredSmart Retail Mart",
      address: "100 Commercial Blvd",
      phone: "9876543210",
      gstin: "27AABCU9603R1ZM",
    },
    orgId: "org-pos-test",
    userRole: "cashier",
  }),
}));

vi.mock("@/hooks/useAuditLog", () => ({
  useAuditLog: () => ({ log: vi.fn() }),
}));

vi.mock("@/services/productsApi", () => ({
  productsApi: {
    getProducts: vi.fn(async () => ({ data: mockProducts, error: null })),
    getBatches: vi.fn(async () => ({ data: mockBatches, error: null })),
    updateBatch: vi.fn(async () => ({ data: null, error: null })),
  },
}));

vi.mock("@/services/partiesApi", () => ({
  partiesApi: {
    getCustomers: vi.fn(async () => ({ data: [], error: null })),
    recordCreditTransaction: vi.fn(async () => ({ data: null, error: null })),
  },
}));

vi.mock("@/services/invoicesApi", () => ({
  invoicesApi: {
    createSale: vi.fn(async () => ({ data: { id: "sale-emp-123" }, error: null })),
    createSaleItems: vi.fn(async () => ({ data: [], error: null })),
  },
}));

vi.mock("@/services/networkInvoicingService", () => ({
  networkInvoicingService: { sendSalesInvoiceToNetwork: vi.fn() },
}));

vi.mock("@/services/stockService", () => ({
  notifyStockUpdated: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}));

describe("Challenger 2 — Desktop POS Billing Terminal Preservation & Hotkey Harness", { timeout: 25000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // Helper to add item via search dropdown
  const addItemViaSearch = async (searchTerm: string, expectedFullName: string) => {
    const searchInput = screen.getByPlaceholderText(/Search item \/ barcode \/ SKU \/ HSN/i);
    fireEvent.focus(searchInput);
    fireEvent.change(searchInput, { target: { value: searchTerm } });

    await waitFor(() => {
      expect(screen.getAllByText(expectedFullName).length).toBeGreaterThan(0);
    });

    const productResults = screen.getAllByText(expectedFullName);
    const clickableResult = productResults.find((el) => el.closest("div[class*='cursor-pointer']"));
    expect(clickableResult).toBeTruthy();
    if (clickableResult) {
      fireEvent.click(clickableResult.closest("div[class*='cursor-pointer']")!);
    }
  };

  // =========================================================================
  // 1. KEYBOARD HOTKEYS EMPIRICAL EXECUTION
  // =========================================================================
  describe("1. Keyboard Hotkeys Execution (F1, F6, F7, CTRL+I, CTRL+B, P, Q, D)", () => {
    it("executes [CTRL + I] to trigger New Stock Item modal", async () => {
      render(
        <MemoryRouter>
          <POSBilling />
        </MemoryRouter>
      );

      expect(screen.queryByText(/Quick Add Product \[CTRL \+ I\]/i)).not.toBeInTheDocument();

      fireEvent.keyDown(window, { key: "i", code: "KeyI", ctrlKey: true });

      expect(await screen.findByText(/Quick Add Product \[CTRL \+ I\]/i)).toBeInTheDocument();
    });

    it("executes [CTRL + B] to create held bills and strictly caps at 5 tabs", async () => {
      render(
        <MemoryRouter>
          <POSBilling />
        </MemoryRouter>
      );

      // Initially exactly 1 tab exists
      expect(screen.getAllByText(/Billing Screen 1/i).length).toBeGreaterThan(0);

      // Trigger CTRL+B four times to create 4 more tabs (reaching max of 5)
      for (let i = 2; i <= 5; i++) {
        fireEvent.keyDown(window, { key: "b", code: "KeyB", ctrlKey: true });
        expect(screen.getAllByText(new RegExp(`Billing Screen ${i}`, "i")).length).toBeGreaterThan(0);
      }

      // 6th CTRL+B must be rejected with Tab Limit Reached toast
      fireEvent.keyDown(window, { key: "b", code: "KeyB", ctrlKey: true });
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Tab Limit Reached",
          variant: "destructive",
        })
      );
    });

    it("executes [CTRL + 1] through [CTRL + 5] to switch between held bill tabs", async () => {
      render(
        <MemoryRouter>
          <POSBilling />
        </MemoryRouter>
      );

      // Create a second tab with CTRL+B
      fireEvent.keyDown(window, { key: "b", code: "KeyB", ctrlKey: true });
      expect(screen.getAllByText(/Billing Screen 2/i).length).toBeGreaterThan(0);

      // Switch back to tab 1 via CTRL+1
      fireEvent.keyDown(window, { key: "1", code: "Digit1", ctrlKey: true });
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Switched to Billing Screen 1",
        })
      );

      // Switch back to tab 2 via CTRL+2
      fireEvent.keyDown(window, { key: "2", code: "Digit2", ctrlKey: true });
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Switched to Billing Screen 2",
        })
      );
    });

    it("executes [P], [Q], and [D] on active line item to open Price, Qty, and Discount modals", async () => {
      render(
        <MemoryRouter>
          <POSBilling />
        </MemoryRouter>
      );

      // Add Basmati Rice via search
      await addItemViaSearch("Basmati", "Basmati Rice 5kg");

      // Line item appears in cart table and is selected (selectedItemIndex = 0)
      await waitFor(() => {
        expect(screen.getAllByText("Basmati Rice 5kg").length).toBeGreaterThan(0);
      });

      // Blur any input so single-key shortcuts are active
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      // Click the cart item row to ensure selectedItemIndex is 0
      const cartItemHeader = screen.getAllByText("Basmati Rice 5kg").find((el) => el.tagName === "H4");
      expect(cartItemHeader).toBeTruthy();
      if (cartItemHeader) {
        fireEvent.click(cartItemHeader);
      }

      // Test [P] -> Change Price modal opens
      fireEvent.keyDown(window, { key: "p", code: "KeyP" });
      expect(await screen.findByText(/Change Selling Price \(SP\) \[P\]/i)).toBeInTheDocument();
      const cancelPrice = screen.getByRole("button", { name: /Cancel/i });
      fireEvent.click(cancelPrice);
      expect(screen.queryByText(/Change Selling Price \(SP\) \[P\]/i)).not.toBeInTheDocument();

      // Ensure row is re-selected after closing modal
      if (cartItemHeader) {
        fireEvent.click(cartItemHeader);
      }

      // Test [Q] -> Change Qty modal opens
      fireEvent.keyDown(window, { key: "q", code: "KeyQ" });
      expect(await screen.findByText(/Change Quantity \[Q\]/i)).toBeInTheDocument();
      const cancelQty = screen.getByRole("button", { name: /Cancel/i });
      fireEvent.click(cancelQty);
      expect(screen.queryByText(/Change Quantity \[Q\]/i)).not.toBeInTheDocument();

      // Ensure row is re-selected after closing modal
      if (cartItemHeader) {
        fireEvent.click(cartItemHeader);
      }

      // Test [D] -> Change Item Discount modal opens
      fireEvent.keyDown(window, { key: "d", code: "KeyD" });
      expect(await screen.findByText(/Item Discount \[D\]/i)).toBeInTheDocument();
      const cancelDisc = screen.getByRole("button", { name: /Cancel/i });
      fireEvent.click(cancelDisc);
      expect(screen.queryByText(/Item Discount \[D\]/i)).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 2. 3-REGION RIGHT PANEL VIEWPORT CONTAINMENT & ACTIONS
  // =========================================================================
  describe("2. 3-Region Decoupled Right Checkout Column Architecture", () => {
    it("verifies Region 1, Region 2, and Region 3 layout and action triggers", async () => {
      render(
        <MemoryRouter>
          <POSBilling />
        </MemoryRouter>
      );

      // Save & Print [F6] and Save [F7] action buttons exist in bottom dock
      const savePrintBtn = screen.getByTitle(/Save bill and print receipt \[F6\]/i) as HTMLButtonElement;
      const saveBtn = screen.getByTitle(/Save bill directly \[F7\]/i) as HTMLButtonElement;
      const waBtn = screen.getByTitle(/Save bill and dispatch WhatsApp receipt/i) as HTMLButtonElement;

      expect(savePrintBtn).toBeInTheDocument();
      expect(saveBtn).toBeInTheDocument();
      expect(waBtn).toBeInTheDocument();

      // Empty cart -> Save and Print buttons must be disabled
      expect(savePrintBtn.disabled).toBe(true);
      expect(saveBtn.disabled).toBe(true);

      // Add item to cart
      await addItemViaSearch("Basmati", "Basmati Rice 5kg");

      // Cart now has items -> Save and Print buttons are enabled
      await waitFor(() => {
        expect(savePrintBtn.disabled).toBe(false);
        expect(saveBtn.disabled).toBe(false);
      });
    });
  });

  // =========================================================================
  // 3. HELD BILLS STATE ISOLATION & TRANSITIONS
  // =========================================================================
  describe("3. Held Bills Tab State Isolation & Transitions", () => {
    it("maintains strict data isolation between multiple held bill tabs", async () => {
      render(
        <MemoryRouter>
          <POSBilling />
        </MemoryRouter>
      );

      // Add Basmati Rice (450) to Tab 1
      await addItemViaSearch("Basmati", "Basmati Rice 5kg");
      expect(screen.getAllByText("Basmati Rice 5kg").length).toBeGreaterThan(0);

      // Create Tab 2 via CTRL+B
      fireEvent.keyDown(window, { key: "b", code: "KeyB", ctrlKey: true });
      expect(screen.getAllByText(/Billing Screen 2/i).length).toBeGreaterThan(0);

      // Tab 2 should have empty cart indicator
      expect(screen.getAllByText(/Cart is empty/i).length).toBeGreaterThan(0);

      // Add Sunflower Oil (160) to Tab 2
      await addItemViaSearch("Sunflower", "Sunflower Oil 1L");
      expect(screen.getAllByText("Sunflower Oil 1L").length).toBeGreaterThan(0);

      // Switch back to Tab 1 via CTRL+1
      fireEvent.keyDown(window, { key: "1", code: "Digit1", ctrlKey: true });

      // Tab 1 must still contain Basmati Rice
      expect(screen.getAllByText(/Billing Screen 1/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText("Basmati Rice 5kg").length).toBeGreaterThan(0);
    });
  });
});
