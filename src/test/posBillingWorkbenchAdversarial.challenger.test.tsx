/**
 * @file posBillingWorkbenchAdversarial.challenger.test.tsx
 * @description Adversarial Stress Harness for POS Billing Workbench (src/pages/POSBilling.tsx)
 *
 * Verifies:
 * 1. Hotkey Shortcuts:
 *    - F1 (search focus & selection)
 *    - F2 (bill discount modal)
 *    - F3 (additional charge modal)
 *    - F6 (save & print checkout flow)
 *    - F7 (save bill checkout flow)
 *    - P (price change modal on selected item)
 *    - Q (quantity change modal on selected item)
 *    - D (item discount modal on selected item)
 *    - V (voice recognition toggle)
 *    - DEL / Backspace (delete selected item)
 * 2. Input Isolation / Evasion Defense:
 *    - Single-key shortcuts (P, Q, D, V, DEL) are strictly blocked while user is typing in <input>
 *    - Function keys (F1, F2, F3, F6, F7) remain active even when focused inside <input>
 * 3. 3-Region Decoupled Checkout Panel Architecture:
 *    - Region 1 (Fixed Net Total): shrink-0, independent of body scroll, renders ₹ grand total
 *    - Region 2 (Middle Scroll Area): flex-1 min-h-0 overflow-y-auto, houses cards/selectors
 *    - Region 3 (Bottom Fixed Dock): shrink-0 border-t, pins Save & Print [F6] / Save [F7] / WA
 * 4. Monochromatic Ribbon Sizing & Tokens Compliance:
 *    - 28px/34px buttons with hairline borders (border-slate-200/80) and monospace kbd badges
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import POSBilling from "@/pages/POSBilling";

// ---------------------------------------------------------------------------
// Mocks & Fixtures via vi.hoisted
// ---------------------------------------------------------------------------

const { mockToast, mockSoundService, mockStartVoice, mockStopVoice, mockProducts, mockBatches } = vi.hoisted(() => ({
  mockToast: vi.fn(),
  mockSoundService: {
    playErrorBeep: vi.fn(),
    playSuccessChime: vi.fn(),
    playBeep: vi.fn(),
    playScanBeep: vi.fn(),
  },
  mockStartVoice: vi.fn(),
  mockStopVoice: vi.fn(),
  mockProducts: [
    {
      id: "prod-1",
      name: "Aashirvaad Atta 5kg",
      barcode: "8901030383748",
      category: "Grocery",
      tags: { selling_price: "240", mrp: "280", stock: "25" },
    },
    {
      id: "prod-2",
      name: "Tata Tea Gold 500g",
      barcode: "8901052002146",
      category: "Beverages",
      tags: { selling_price: "320", mrp: "360", stock: "40" },
    },
  ],
  mockBatches: [
    {
      id: "batch-1",
      product_id: "prod-1",
      batch_number: "ATT-2026",
      mrp: 280,
      cost_price: 210,
      stock: 25,
    },
    {
      id: "batch-2",
      product_id: "prod-2",
      batch_number: "TEA-2026",
      mrp: 360,
      cost_price: 270,
      stock: 40,
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
    start: mockStartVoice,
    stop: mockStopVoice,
    abort: vi.fn(),
  })),
  parsePOSVoiceCommand: vi.fn(),
  speakPOSMessage: vi.fn(),
  isVoiceSupported: () => true,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-pos-challenger", email: "cashier@credsmart.test" },
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
  useAuditLog: () => ({
    log: vi.fn(),
  }),
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
    getCustomers: vi.fn(async () => ({
      data: [
        {
          id: "cust-1",
          name: "Amit Verma",
          phone: "9811223344",
          custom_fields: {},
        },
      ],
      error: null,
    })),
    recordCreditTransaction: vi.fn(async () => ({ data: null, error: null })),
  },
}));

vi.mock("@/services/invoicesApi", () => ({
  invoicesApi: {
    createSale: vi.fn(async () => ({ data: { id: "sale-mock-123" }, error: null })),
    createSaleItems: vi.fn(async () => ({ data: [], error: null })),
  },
}));

vi.mock("@/services/networkInvoicingService", () => ({
  networkInvoicingService: {
    sendSalesInvoiceToNetwork: vi.fn(),
  },
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

describe("Challenger 2: POS Billing Workbench Empirical Stress Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // =========================================================================
  // 1. HOTKEY SHORTCUTS VERIFICATION & ADVERSARIAL STRESS
  // =========================================================================
  describe("R1. Global & Context-Aware Hotkeys", () => {
    it("executes [F1] to focus the search bar from anywhere", async () => {
      render(
        <MemoryRouter>
          <POSBilling />
        </MemoryRouter>
      );

      const searchInput = screen.getByPlaceholderText(/Search item \/ barcode \/ SKU \/ HSN/i);
      expect(searchInput).toBeInTheDocument();

      // Blur search input and focus body
      searchInput.blur();
      expect(document.activeElement).not.toBe(searchInput);

      // Press F1
      fireEvent.keyDown(window, { key: "F1", code: "F1" });

      // Search input must immediately acquire focus
      expect(document.activeElement).toBe(searchInput);
    });

    it("executes [F2] to open Quick Bill Discount modal", async () => {
      render(
        <MemoryRouter>
          <POSBilling />
        </MemoryRouter>
      );

      expect(screen.queryByText(/Add Bill Discount \[F2\]/i)).not.toBeInTheDocument();

      fireEvent.keyDown(window, { key: "F2", code: "F2" });

      // Modal header appears
      expect(await screen.findByText(/Add Bill Discount \[F2\]/i)).toBeInTheDocument();
      expect(screen.getByText(/Discount Value/i)).toBeInTheDocument();

      // Press cancel to dismiss
      const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
      fireEvent.click(cancelBtn);
      expect(screen.queryByText(/Add Bill Discount \[F2\]/i)).not.toBeInTheDocument();
    });

    it("executes [F3] to open Additional Charge modal", async () => {
      render(
        <MemoryRouter>
          <POSBilling />
        </MemoryRouter>
      );

      expect(screen.queryByText(/Add Charge \[F3\]/i)).not.toBeInTheDocument();

      fireEvent.keyDown(window, { key: "F3", code: "F3" });

      // Modal header appears
      expect(await screen.findByText(/Add Charge \[F3\]/i)).toBeInTheDocument();
      expect(screen.getByText(/Charge Description/i)).toBeInTheDocument();

      // Close modal
      const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
      fireEvent.click(cancelBtn);
      expect(screen.queryByText(/Add Charge \[F3\]/i)).not.toBeInTheDocument();
    });

    it("executes [F6] and [F7] with empty cart safeguards", async () => {
      render(
        <MemoryRouter>
          <POSBilling />
        </MemoryRouter>
      );

      // When cart is empty, F6 (Save & Print) must be safely rejected
      fireEvent.keyDown(window, { key: "F6", code: "F6" });
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Cannot Save Empty Bill",
          variant: "destructive",
        })
      );
      expect(mockSoundService.playErrorBeep).toHaveBeenCalled();

      mockToast.mockClear();
      mockSoundService.playErrorBeep.mockClear();

      // When cart is empty, F7 (Save Bill) must also be safely rejected
      fireEvent.keyDown(window, { key: "F7", code: "F7" });
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Cannot Save Empty Bill",
          variant: "destructive",
        })
      );
      expect(mockSoundService.playErrorBeep).toHaveBeenCalled();
    });

    it("executes [V] to toggle Voice Assistant listening state", async () => {
      render(
        <MemoryRouter>
          <POSBilling />
        </MemoryRouter>
      );

      // Trigger [V]
      fireEvent.keyDown(window, { key: "v", code: "KeyV" });

      // Should attempt to start voice recognition
      expect(mockStartVoice).toHaveBeenCalled();
    });

    it("shields single-key shortcuts ([P], [Q], [D], [V], [DEL]) while user is typing in an <input>", async () => {
      render(
        <MemoryRouter>
          <POSBilling />
        </MemoryRouter>
      );

      const searchInput = screen.getByPlaceholderText(/Search item \/ barcode \/ SKU \/ HSN/i);
      searchInput.focus();
      expect(document.activeElement).toBe(searchInput);

      mockStartVoice.mockClear();
      mockToast.mockClear();

      // Typing 'v' in search input must NOT toggle voice
      fireEvent.keyDown(searchInput, { key: "v", code: "KeyV" });
      expect(mockStartVoice).not.toHaveBeenCalled();

      // Typing 'p' in search input must NOT trigger price change modal
      fireEvent.keyDown(searchInput, { key: "p", code: "KeyP" });
      expect(screen.queryByText(/Change Selling Price \(SP\) \[P\]/i)).not.toBeInTheDocument();

      // Typing 'q' in search input must NOT trigger quantity change modal
      fireEvent.keyDown(searchInput, { key: "q", code: "KeyQ" });
      expect(screen.queryByText(/Change Quantity \[Q\]/i)).not.toBeInTheDocument();

      // Typing 'd' in search input must NOT trigger discount change modal
      fireEvent.keyDown(searchInput, { key: "d", code: "KeyD" });
      expect(screen.queryByText(/Item Discount \[D\]/i)).not.toBeInTheDocument();

      // Pressing 'Delete' in search input must NOT trigger item deletion logic
      fireEvent.keyDown(searchInput, { key: "Delete", code: "Delete" });
      expect(mockToast).not.toHaveBeenCalledWith(expect.objectContaining({ title: "No Item Selected" }));

      // HOWEVER: Function key [F2] MUST STILL WORK while focused in the search input
      fireEvent.keyDown(searchInput, { key: "F2", code: "F2" });
      expect(await screen.findByText(/Add Bill Discount \[F2\]/i)).toBeInTheDocument();
    });

    it("handles [P], [Q], [D], [DEL] when no item is selected (safe error handling)", async () => {
      render(
        <MemoryRouter>
          <POSBilling />
        </MemoryRouter>
      );

      // Ensure activeElement is body
      document.body.focus();

      // Press [P] with no item selected
      fireEvent.keyDown(window, { key: "p", code: "KeyP" });
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "No Item Selected",
        })
      );
      expect(mockSoundService.playErrorBeep).toHaveBeenCalled();

      mockToast.mockClear();
      mockSoundService.playErrorBeep.mockClear();

      // Press [Q] with no item selected
      fireEvent.keyDown(window, { key: "q", code: "KeyQ" });
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "No Item Selected",
        })
      );

      mockToast.mockClear();

      // Press [D] with no item selected
      fireEvent.keyDown(window, { key: "d", code: "KeyD" });
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "No Item Selected",
        })
      );

      mockToast.mockClear();

      // Press [DEL] with no item selected
      fireEvent.keyDown(window, { key: "Delete", code: "Delete" });
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "No Item Selected",
        })
      );
    });
  });

  // =========================================================================
  // 2. 3-REGION DECOUPLED CHECKOUT PANEL ARCHITECTURAL CONTAINMENT
  // =========================================================================
  describe("R2. 3-Region Decoupled Checkout Panel Containment", () => {
    it("verifies the Right Checkout Column maintains strict 3-region viewport containment", () => {
      const { container } = render(
        <MemoryRouter>
          <POSBilling />
        </MemoryRouter>
      );

      // Locate the right checkout column
      const rightCol = container.querySelector(
        ".lg\\:w-\\[400px\\], .xl\\:w-\\[430px\\], div[class*='lg:w-']"
      ) as HTMLElement;

      expect(rightCol).toBeTruthy();
      expect(rightCol.className).toContain("flex-col");
      expect(rightCol.className).toContain("lg:flex");
      expect(rightCol.className).toContain("h-full");
      expect(rightCol.className).toContain("min-h-0");
      expect(rightCol.className).toContain("overflow-hidden");

      // Verify Region 1: Fixed Top Net Payable Total
      const netPayableText = screen.getByText(/Net Payable/i);
      const region1 = netPayableText.closest("div.shrink-0");
      expect(region1).toBeTruthy();
      expect(region1?.className).toContain("shrink-0");
      expect(region1?.className).toContain("bg-blue-600");
      expect(region1?.className).toContain("text-white");
      expect(region1?.textContent).toContain("₹");

      // Verify Region 2: Bounded Middle Scroll Area inside right checkout column
      const region2 = rightCol.querySelector("div.flex-1.min-h-0.overflow-y-auto") as HTMLElement;
      expect(region2).toBeTruthy();
      expect(region2.className).toContain("flex-1");
      expect(region2.className).toContain("min-h-0");
      expect(region2.className).toContain("overflow-y-auto");
      // Region 2 must contain Quick Actions: Bill Discount [F2] and Add Charge [F3]
      expect(region2.textContent).toContain("Bill Discount");
      expect(region2.textContent).toContain("F2");
      expect(region2.textContent).toContain("F3");

      // Verify Region 3: Fixed Bottom Checkout Action Dock
      const printBtn = screen.getByTitle(/Save bill and print receipt \[F6\]/i);
      const saveBtn = screen.getByTitle(/Save bill directly \[F7\]/i);
      const waBtn = screen.getByTitle(/Save bill and dispatch WhatsApp receipt/i);

      expect(printBtn).toBeInTheDocument();
      expect(saveBtn).toBeInTheDocument();
      expect(waBtn).toBeInTheDocument();

      const region3 = printBtn.closest("div.shrink-0");
      expect(region3).toBeTruthy();
      expect(region3?.className).toContain("shrink-0");
      expect(region3?.className).toContain("border-t");

      // CRITICAL ARCHITECTURAL ASSERTION:
      // Region 1 and Region 3 MUST NOT be children of Region 2 (the scrollable body).
      // They must be direct sibling peers inside rightCol, guaranteeing zero scroll drift!
      expect(region2.contains(region1)).toBe(false);
      expect(region2.contains(region3)).toBe(false);
      expect(rightCol.contains(region1)).toBe(true);
      expect(rightCol.contains(region2)).toBe(true);
      expect(rightCol.contains(region3)).toBe(true);
    });

    it("verifies Print [F6] and Save [F7] buttons are disabled when cart is empty and enabled when items exist", async () => {
      render(
        <MemoryRouter>
          <POSBilling />
        </MemoryRouter>
      );

      const printBtn = screen.getByTitle(/Save bill and print receipt \[F6\]/i) as HTMLButtonElement;
      const saveBtn = screen.getByTitle(/Save bill directly \[F7\]/i) as HTMLButtonElement;

      // When cart is empty
      expect(printBtn.disabled).toBe(true);
      expect(saveBtn.disabled).toBe(true);

      // Now add an item via search query
      const searchInput = screen.getByPlaceholderText(/Search item \/ barcode \/ SKU \/ HSN/i);
      fireEvent.focus(searchInput);
      fireEvent.change(searchInput, { target: { value: "Atta" } });

      await waitFor(() => {
        expect(screen.getByText("Aashirvaad Atta 5kg")).toBeInTheDocument();
      });

      const productResult = screen.getByText("Aashirvaad Atta 5kg").closest("div[class*='cursor-pointer']");
      expect(productResult).toBeTruthy();
      if (productResult) {
        fireEvent.click(productResult);
      }

      // After adding item, Print and Save buttons MUST BE ENABLED and clickable
      await waitFor(() => {
        expect(printBtn.disabled).toBe(false);
        expect(saveBtn.disabled).toBe(false);
      });
    });
  });

  // =========================================================================
  // 3. MONOCHROMATIC HOTKEY RIBBON COMPLIANCE
  // =========================================================================
  describe("R3. Monochromatic Hotkey Ribbon Standard Compliance", () => {
    it("verifies all ribbon action buttons conform to minimal design tokens without pastel fills", () => {
      render(
        <MemoryRouter>
          <POSBilling />
        </MemoryRouter>
      );

      const searchBtn = screen.getByTitle(/Focus Search Bar \[F1\]/i);
      const newItemBtn = screen.getByTitle(/Add New Stock Item \[CTRL\+I\]/i);
      const holdBillBtn = screen.getByTitle(/Hold Current Bill & Start New \[CTRL\+B\]/i);
      const priceBtn = screen.getByTitle(/Change Price of Selected Item \[P\]/i);
      const qtyBtn = screen.getByTitle(/Change Quantity of Selected Item \[Q\]/i);
      const discBtn = screen.getByTitle(/Change Discount on Selected Item \[D\]/i);
      const voiceBtn = screen.getByTitle(/Voice Assistant: speak to add items/i);
      const delBtn = screen.getByTitle(/Delete Selected Item \[DEL\]/i);

      const ribbonButtons = [
        searchBtn,
        newItemBtn,
        holdBillBtn,
        priceBtn,
        qtyBtn,
        discBtn,
        voiceBtn,
        delBtn,
      ];

      ribbonButtons.forEach((btn) => {
        expect(btn).toBeInTheDocument();
        // Sizing: standardized to h-7 (28px)
        expect(btn.className).toContain("h-7");
        expect(btn.className).toContain("px-2.5");
        expect(btn.className).toContain("rounded-md");
        expect(btn.className).toContain("text-[11px]");

        // Zero pastel color flooding
        expect(btn.className).not.toContain("bg-indigo-500");
        expect(btn.className).not.toContain("bg-amber-500");
        expect(btn.className).not.toContain("bg-emerald-500");
      });

      // Monospace badges check
      const kbdElements = Array.from(document.querySelectorAll("kbd"));
      const kbdTexts = kbdElements.map((k) => k.textContent?.trim());
      expect(kbdTexts).toContain("F1");
      expect(kbdTexts).toContain("CTRL+I");
      expect(kbdTexts).toContain("CTRL+B");
      expect(kbdTexts).toContain("P");
      expect(kbdTexts).toContain("Q");
      expect(kbdTexts).toContain("D");
      expect(kbdTexts).toContain("V");
      expect(kbdTexts).toContain("DEL");
      expect(kbdTexts).toContain("F6");
      expect(kbdTexts).toContain("F7");
    });
  });
});
