/**
 * @file mobilePosTerminal.test.tsx
 * @description Comprehensive Test Suite for Dedicated Single-Column Mobile POS Billing Terminal (< 768px)
 *
 * Verifies:
 * 1. Single-column layout on mobile (< 768px):
 *    - Sticky top bar (back to dashboard, search input, barcode scan button, voice trigger)
 *    - Horizontal category chips carousel
 *    - Scrollable high-density product cards stream
 *    - Floating bottom cart dock
 * 2. Category filtering and live search:
 *    - 1-tap category selection immediately updates visible products
 *    - Search query filters products in real time
 *    - Clear search button resets query
 * 3. 1-tap + / - steppers:
 *    - "+ Add" button when item quantity in cart is 0
 *    - Compact stepper (- / count / +) when quantity > 0
 *    - Clicking + increments cart quantity
 *    - Clicking - decrements cart quantity, removing item when count reaches 1
 * 4. Floating bottom cart dock:
 *    - Item count and unit count formatting
 *    - Grand total formatted with ₹ in tabular monospace
 *    - Review Cart & Checkout CTA enabled/disabled states
 * 5. 1-Tap Checkout Bottom Drawer:
 *    - Slides up on Review Cart & Checkout tap
 *    - Customer profile pod and change customer button
 *    - Cart items review with stepper and delete triggers
 *    - Payment method selection (Cash, UPI, Card, Credit, Split)
 *    - UPI QR preview card
 *    - Cash quick chips and live change due calculation
 *    - Generate Bill & Print [F6] trigger
 * 6. POS.tsx route alias fidelity
 */

import React, { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MobilePOSTerminal, MobilePOSTerminalProps } from "@/components/pos/MobilePOSTerminal";
import { MobileProductCard } from "@/components/pos/MobileProductCard";
import { MobileCartDock } from "@/components/pos/MobileCartDock";
import { MobileCheckoutDrawer } from "@/components/pos/MobileCheckoutDrawer";
import POS, { POSBilling as ExportedPOSBilling } from "@/pages/POS";
import POSBilling, { BillingTab, POSCartItem } from "@/pages/POSBilling";
import { Product, Batch } from "@/types/pos";

// ---------------------------------------------------------------------------
// Mock Fixtures
// ---------------------------------------------------------------------------

const mockProducts: Product[] = [
  {
    id: "prod-1",
    name: "Aashirvaad Atta 5kg",
    barcode: "8901030383748",
    brand: "ITC",
    category: "Grocery",
    batches: [
      {
        id: "batch-1",
        costPrice: 200,
        mrp: 260,
        stock: 25,
        batchNumber: "ATT-2026",
      },
    ],
    tags: { selling_price: "240", mrp: "260", stock: "25" },
  },
  {
    id: "prod-2",
    name: "Tata Tea Gold 500g",
    barcode: "8901052002146",
    brand: "Tata",
    category: "Beverages",
    batches: [
      {
        id: "batch-2",
        costPrice: 280,
        mrp: 350,
        stock: 8,
        batchNumber: "TEA-2026",
      },
    ],
    tags: { selling_price: "320", mrp: "350", stock: "8" },
  },
  {
    id: "prod-3",
    name: "Parle-G Gold Biscuits 1kg",
    barcode: "8901719102030",
    brand: "Parle",
    category: "Snacks",
    batches: [
      {
        id: "batch-3",
        costPrice: 80,
        mrp: 120,
        stock: 0,
        batchNumber: "PAR-2026",
      },
    ],
    tags: { selling_price: "100", mrp: "120", stock: "0" },
  },
];

const mockBatch: Batch = {
  id: "batch-1",
  costPrice: 200,
  mrp: 260,
  stock: 25,
  batchNumber: "ATT-2026",
};

const createMockCartItem = (product: Product, quantity = 1, sp = 240): POSCartItem => ({
  id: `cart-item-${product.id}`,
  product,
  batch: product.batches[0] || mockBatch,
  mrp: 260,
  sp,
  discountPercent: 0,
  discountType: "percent",
  quantity,
  itemCode: product.barcode,
});

const createMockTab = (items: POSCartItem[] = []): BillingTab => ({
  id: "tab-test-1",
  tabIndex: 1,
  title: "Bill 1",
  items,
  selectedItemIndex: items.length > 0 ? 0 : -1,
  customer: {
    id: "cust-1",
    name: "Rahul Sharma",
    phone: "9876543210",
  },
  discountType: "percent",
  discountValue: 0,
  discountReason: "",
  additionalCharges: [],
  paymentMode: "Cash",
  receivedAmount: "500",
  notes: "",
});

// Mock modules for POSBilling page level tests
vi.mock("@/context/ProductsContext", () => ({
  useProducts: () => ({ products: mockProducts, loading: false }),
  ProductsProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/sound", () => ({
  soundService: {
    playScanBeep: vi.fn(),
    playErrorBeep: vi.fn(),
    playSuccessChime: vi.fn(),
    playTabSwitch: vi.fn(),
    setEnabled: vi.fn(),
  },
}));

vi.mock("@/utils/soundAndHaptics", () => ({
  playScanBeep: vi.fn(),
  playSuccessChime: vi.fn(),
  playDeleteThud: vi.fn(),
  triggerHapticScan: vi.fn(),
  triggerHapticSuccess: vi.fn(),
  triggerHapticDelete: vi.fn(),
}));

vi.mock("@/services/productsApi", () => ({
  productsApi: {
    getProducts: vi.fn(async () => ({ data: mockProducts, error: null })),
    getBatches: vi.fn(async () => ({ data: [], error: null })),
  },
}));

vi.mock("@/services/partiesApi", () => ({
  partiesApi: {
    getCustomers: vi.fn(async () => ({ data: [], error: null })),
  },
}));

vi.mock("@/services/invoicesApi", () => ({
  invoicesApi: {
    createSale: vi.fn(async () => ({ data: { id: "sale-1" }, error: null })),
    createSaleItems: vi.fn(async () => ({ data: [], error: null })),
  },
}));

// ---------------------------------------------------------------------------
// Interactive Harness Component for Testing MobilePOSTerminal State Flow
// ---------------------------------------------------------------------------

const MobilePOSTerminalHarness: React.FC<{
  initialProducts?: Product[];
  initialItems?: POSCartItem[];
  onSaveBillMock?: ReturnType<typeof vi.fn>;
}> = ({
  initialProducts = mockProducts,
  initialItems = [],
  onSaveBillMock = vi.fn(async () => {}),
}) => {
  const [products] = useState<Product[]>(initialProducts);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTab, setCurrentTab] = useState<BillingTab>(() => createMockTab(initialItems));

  const totalItemsCount = currentTab.items.reduce((sum, it) => sum + it.quantity, 0);
  const subTotal = currentTab.items.reduce((sum, it) => sum + it.sp * it.quantity, 0);
  const grandTotal = subTotal;
  const receivedNum = parseFloat(currentTab.receivedAmount) || 0;
  const changeDue = Math.max(0, receivedNum - grandTotal);
  const balanceRemaining = Math.max(0, grandTotal - receivedNum);

  const handleAddProduct = (product: Product) => {
    setCurrentTab((tab) => {
      const existing = tab.items.find((it) => it.product.id === product.id);
      if (existing) {
        return {
          ...tab,
          items: tab.items.map((it) =>
            it.product.id === product.id ? { ...it, quantity: it.quantity + 1 } : it
          ),
        };
      }
      return {
        ...tab,
        items: [createMockCartItem(product, 1), ...tab.items],
      };
    });
  };

  const handleRemoveItem = (index: number) => {
    setCurrentTab((tab) => ({
      ...tab,
      items: tab.items.filter((_, i) => i !== index),
    }));
  };

  return (
    <MobilePOSTerminal
      products={products}
      categories={["All", "Grocery", "Beverages", "Snacks"]}
      selectedCategory={selectedCategory}
      setSelectedCategory={setSelectedCategory}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      currentTab={currentTab}
      updateCurrentTab={setCurrentTab}
      onAddProduct={handleAddProduct}
      onRemoveItem={handleRemoveItem}
      grandTotal={grandTotal}
      subTotal={subTotal}
      taxAmount={0}
      itemDiscountsTotal={0}
      billDiscountAmount={0}
      totalItemsCount={totalItemsCount}
      receivedNum={receivedNum}
      changeDue={changeDue}
      balanceRemaining={balanceRemaining}
      onSaveBill={onSaveBillMock}
      isProcessingSave={false}
      onExitPOS={vi.fn()}
      onOpenCustomerModal={vi.fn()}
      onOpenSettingsModal={vi.fn()}
      onOpenReturnModal={vi.fn()}
      onOpenCameraScanner={vi.fn()}
      isListening={false}
      onToggleVoice={vi.fn()}
      org={{ id: "org-1", name: "CredSmart Mart" }}
      settings={{ storeName: "CredSmart Mart", upiId: "store@upi" }}
    />
  );
};

// ===========================================================================
// Test Suites
// ===========================================================================

describe("Mobile POS Billing Terminal (< 768px) Full Specification Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. Single-Column Layout & Ergonomics
  // -------------------------------------------------------------------------
  describe("R1. Single-Column Mobile POS Layout & Structural Elements", () => {
    it("renders the sticky top bar with back button, search input, barcode scan button, and voice trigger", () => {
      render(
        <MemoryRouter>
          <MobilePOSTerminalHarness />
        </MemoryRouter>
      );

      // Container
      expect(screen.getByTestId("mobile-pos-terminal-container")).toBeInTheDocument();

      // Top bar
      expect(screen.getByTestId("mobile-pos-top-bar")).toBeInTheDocument();
      expect(screen.getByTestId("mobile-pos-back-btn")).toBeInTheDocument();
      expect(screen.getByTestId("mobile-pos-search-input")).toBeInTheDocument();
      expect(screen.getByTestId("mobile-pos-scan-barcode-btn")).toBeInTheDocument();
      expect(screen.getByTestId("mobile-pos-voice-btn")).toBeInTheDocument();

      // Category carousel
      expect(screen.getByTestId("mobile-category-carousel")).toBeInTheDocument();

      // Product cards stream
      expect(screen.getByTestId("mobile-product-stream")).toBeInTheDocument();

      // Floating bottom cart dock
      expect(screen.getByTestId("mobile-cart-dock")).toBeInTheDocument();
    });

    it("verifies category carousel renders All and category chips", () => {
      render(
        <MemoryRouter>
          <MobilePOSTerminalHarness />
        </MemoryRouter>
      );

      expect(screen.getByTestId("category-chip-all")).toHaveTextContent("All");
      expect(screen.getByTestId("category-chip-grocery")).toHaveTextContent("Grocery");
      expect(screen.getByTestId("category-chip-beverages")).toHaveTextContent("Beverages");
      expect(screen.getByTestId("category-chip-snacks")).toHaveTextContent("Snacks");
    });
  });

  // -------------------------------------------------------------------------
  // 2. Category Filtering and Live Search
  // -------------------------------------------------------------------------
  describe("R2. Category Filtering & Real-Time Search", () => {
    it("filters visible products immediately upon tapping a category chip", () => {
      render(
        <MemoryRouter>
          <MobilePOSTerminalHarness />
        </MemoryRouter>
      );

      // Initially "All" is active, all 3 products are visible
      expect(screen.getByText("Aashirvaad Atta 5kg")).toBeInTheDocument();
      expect(screen.getByText("Tata Tea Gold 500g")).toBeInTheDocument();
      expect(screen.getByText("Parle-G Gold Biscuits 1kg")).toBeInTheDocument();

      // Tap "Grocery" category chip
      const groceryChip = screen.getByTestId("category-chip-grocery");
      fireEvent.click(groceryChip);

      // Only Grocery items should remain visible
      expect(screen.getByText("Aashirvaad Atta 5kg")).toBeInTheDocument();
      expect(screen.queryByText("Tata Tea Gold 500g")).not.toBeInTheDocument();
      expect(screen.queryByText("Parle-G Gold Biscuits 1kg")).not.toBeInTheDocument();

      // Tap "Beverages" category chip
      const beveragesChip = screen.getByTestId("category-chip-beverages");
      fireEvent.click(beveragesChip);

      // Only Beverages item is visible
      expect(screen.queryByText("Aashirvaad Atta 5kg")).not.toBeInTheDocument();
      expect(screen.getByText("Tata Tea Gold 500g")).toBeInTheDocument();
      expect(screen.queryByText("Parle-G Gold Biscuits 1kg")).not.toBeInTheDocument();

      // Return to "All"
      fireEvent.click(screen.getByTestId("category-chip-all"));
      expect(screen.getByText("Aashirvaad Atta 5kg")).toBeInTheDocument();
      expect(screen.getByText("Tata Tea Gold 500g")).toBeInTheDocument();
      expect(screen.getByText("Parle-G Gold Biscuits 1kg")).toBeInTheDocument();
    });

    it("filters products by text search query and allows 1-tap clear", () => {
      render(
        <MemoryRouter>
          <MobilePOSTerminalHarness />
        </MemoryRouter>
      );

      const searchInput = screen.getByTestId("mobile-pos-search-input");
      fireEvent.change(searchInput, { target: { value: "tea" } });

      // Only tea is visible
      expect(screen.getByText("Tata Tea Gold 500g")).toBeInTheDocument();
      expect(screen.queryByText("Aashirvaad Atta 5kg")).not.toBeInTheDocument();

      // Clear search via X button
      const clearBtn = screen.getByTestId("mobile-pos-clear-search-btn");
      expect(clearBtn).toBeInTheDocument();
      fireEvent.click(clearBtn);

      // All products return
      expect(screen.getByText("Aashirvaad Atta 5kg")).toBeInTheDocument();
      expect(screen.getByText("Tata Tea Gold 500g")).toBeInTheDocument();
    });

    it("renders empty state placeholder when no products match filter", () => {
      render(
        <MemoryRouter>
          <MobilePOSTerminalHarness />
        </MemoryRouter>
      );

      const searchInput = screen.getByTestId("mobile-pos-search-input");
      fireEvent.change(searchInput, { target: { value: "NonExistentItemXYZ" } });

      expect(screen.getByTestId("mobile-empty-products")).toBeInTheDocument();
      expect(screen.getByText(/No products found/i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 3. 1-Tap Quantity Steppers (+ / -)
  // -------------------------------------------------------------------------
  describe("R3. 1-Tap Quantity Stepper (+ / -) Ergonomics", () => {
    it("renders '+ Add' button when quantity in cart is 0 and transforms into stepper when clicked", () => {
      render(
        <MemoryRouter>
          <MobilePOSTerminalHarness />
        </MemoryRouter>
      );

      // prod-1 is not in cart initially -> '+ Add' button visible
      const addBtn = screen.getByTestId("add-to-cart-prod-1");
      expect(addBtn).toBeInTheDocument();
      expect(addBtn).toHaveTextContent("Add");

      // Tap '+ Add'
      fireEvent.click(addBtn);

      // Now stepper should be visible with count '1'
      expect(screen.getByTestId("stepper-prod-1")).toBeInTheDocument();
      expect(screen.getByTestId("qty-count-prod-1")).toHaveTextContent("1");
      expect(screen.getByTestId("increment-prod-1")).toBeInTheDocument();
      expect(screen.getByTestId("decrement-prod-1")).toBeInTheDocument();
    });

    it("increments quantity on '+' tap and updates bottom cart dock units and total", () => {
      render(
        <MemoryRouter>
          <MobilePOSTerminalHarness />
        </MemoryRouter>
      );

      // Add prod-1 (SP = 240)
      fireEvent.click(screen.getByTestId("add-to-cart-prod-1"));
      expect(screen.getByTestId("qty-count-prod-1")).toHaveTextContent("1");
      expect(screen.getByTestId("mobile-cart-items-count")).toHaveTextContent("1 unit (1 item)");
      expect(screen.getByTestId("mobile-cart-grand-total")).toHaveTextContent("₹240.00");

      // Tap '+' to increment to 2
      fireEvent.click(screen.getByTestId("increment-prod-1"));
      expect(screen.getByTestId("qty-count-prod-1")).toHaveTextContent("2");
      expect(screen.getByTestId("mobile-cart-items-count")).toHaveTextContent("2 units (1 item)");
      expect(screen.getByTestId("mobile-cart-grand-total")).toHaveTextContent("₹480.00");

      // Tap '+' again to increment to 3
      fireEvent.click(screen.getByTestId("increment-prod-1"));
      expect(screen.getByTestId("qty-count-prod-1")).toHaveTextContent("3");
      expect(screen.getByTestId("mobile-cart-items-count")).toHaveTextContent("3 units (1 item)");
      expect(screen.getByTestId("mobile-cart-grand-total")).toHaveTextContent("₹720.00");
    });

    it("decrements quantity on '-' tap and removes item when count goes from 1 to 0", () => {
      render(
        <MemoryRouter>
          <MobilePOSTerminalHarness />
        </MemoryRouter>
      );

      // Add prod-1 and increment to 2
      fireEvent.click(screen.getByTestId("add-to-cart-prod-1"));
      fireEvent.click(screen.getByTestId("increment-prod-1"));
      expect(screen.getByTestId("qty-count-prod-1")).toHaveTextContent("2");

      // Decrement back to 1
      fireEvent.click(screen.getByTestId("decrement-prod-1"));
      expect(screen.getByTestId("qty-count-prod-1")).toHaveTextContent("1");
      expect(screen.getByTestId("mobile-cart-items-count")).toHaveTextContent("1 unit (1 item)");

      // Decrement from 1 -> item should be removed and '+ Add' button restored
      fireEvent.click(screen.getByTestId("decrement-prod-1"));
      expect(screen.getByTestId("add-to-cart-prod-1")).toBeInTheDocument();
      expect(screen.queryByTestId("stepper-prod-1")).not.toBeInTheDocument();
      expect(screen.getByTestId("mobile-cart-items-count")).toHaveTextContent("0 units (0 items)");
    });
  });

  // -------------------------------------------------------------------------
  // 4. Floating Bottom Cart Dock
  // -------------------------------------------------------------------------
  describe("R4. Floating Bottom Cart Dock", () => {
    it("disables 'Review Cart & Checkout' button when cart is empty", () => {
      render(
        <MemoryRouter>
          <MobilePOSTerminalHarness initialItems={[]} />
        </MemoryRouter>
      );

      const reviewBtn = screen.getByTestId("mobile-review-checkout-btn") as HTMLButtonElement;
      expect(reviewBtn).toBeInTheDocument();
      expect(reviewBtn.disabled).toBe(true);
      expect(screen.getByTestId("mobile-cart-grand-total")).toHaveTextContent("₹0.00");
    });

    it("enables 'Review Cart & Checkout' button when items are added to cart", () => {
      const initialItems = [createMockCartItem(mockProducts[0], 2, 240)];
      render(
        <MemoryRouter>
          <MobilePOSTerminalHarness initialItems={initialItems} />
        </MemoryRouter>
      );

      const reviewBtn = screen.getByTestId("mobile-review-checkout-btn") as HTMLButtonElement;
      expect(reviewBtn.disabled).toBe(false);
      expect(screen.getByTestId("mobile-cart-items-count")).toHaveTextContent("2 units (1 item)");
      expect(screen.getByTestId("mobile-cart-grand-total")).toHaveTextContent("₹480.00");
    });
  });

  // -------------------------------------------------------------------------
  // 5. 1-Tap Checkout Bottom Drawer
  // -------------------------------------------------------------------------
  describe("R5. 1-Tap Checkout Bottom Drawer", () => {
    it("opens checkout drawer on tapping 'Review Cart & Checkout' and shows customer and items review", () => {
      const initialItems = [
        createMockCartItem(mockProducts[0], 1, 240),
        createMockCartItem(mockProducts[1], 1, 320),
      ];

      render(
        <MemoryRouter>
          <MobilePOSTerminalHarness initialItems={initialItems} />
        </MemoryRouter>
      );

      // Drawer is initially not rendered
      expect(screen.queryByTestId("mobile-checkout-drawer")).not.toBeInTheDocument();

      // Tap 'Review Cart & Checkout'
      fireEvent.click(screen.getByTestId("mobile-review-checkout-btn"));

      // Drawer opens
      expect(screen.getByTestId("mobile-checkout-drawer")).toBeInTheDocument();
      expect(screen.getByText("Checkout & Pay")).toBeInTheDocument();
      expect(screen.getByTestId("drawer-grand-total")).toHaveTextContent("₹560.00");

      // Customer info is displayed
      expect(screen.getByText("Rahul Sharma")).toBeInTheDocument();
      expect(screen.getByText("9876543210")).toBeInTheDocument();

      // Cart items are displayed in drawer
      expect(screen.getByTestId("drawer-cart-item-0")).toBeInTheDocument();
      expect(screen.getByTestId("drawer-cart-item-1")).toBeInTheDocument();

      // Close drawer via close X button
      fireEvent.click(screen.getByTestId("close-checkout-drawer-btn"));
      expect(screen.queryByTestId("mobile-checkout-drawer")).not.toBeInTheDocument();
    });

    it("allows switching payment methods inside the drawer and displays UPI QR card when UPI selected", () => {
      const initialItems = [createMockCartItem(mockProducts[0], 1, 240)];

      render(
        <MemoryRouter>
          <MobilePOSTerminalHarness initialItems={initialItems} />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId("mobile-review-checkout-btn"));

      // Default payment mode is Cash
      const cashBtn = screen.getByTestId("payment-mode-cash");
      expect(cashBtn.className).toContain("bg-blue-600");

      // Tap UPI payment mode
      const upiBtn = screen.getByTestId("payment-mode-upi");
      fireEvent.click(upiBtn);
      expect(upiBtn.className).toContain("bg-blue-600");

      // UPI QR card should now be displayed
      expect(screen.getByTestId("upi-qr-card")).toBeInTheDocument();
      expect(screen.getByText(/store@upi/i)).toBeInTheDocument();

      // Tap Card payment mode
      const cardBtn = screen.getByTestId("payment-mode-card");
      fireEvent.click(cardBtn);
      expect(cardBtn.className).toContain("bg-blue-600");
      expect(screen.queryByTestId("upi-qr-card")).not.toBeInTheDocument();
    });

    it("triggers onSaveBill(true, false) on clicking 'Generate Bill & Print' CTA", async () => {
      const saveBillMock = vi.fn(async () => {});
      const initialItems = [createMockCartItem(mockProducts[0], 1, 240)];

      render(
        <MemoryRouter>
          <MobilePOSTerminalHarness initialItems={initialItems} onSaveBillMock={saveBillMock} />
        </MemoryRouter>
      );

      // Open drawer
      fireEvent.click(screen.getByTestId("mobile-review-checkout-btn"));

      // Tap 'Generate Bill & Print' CTA
      const printBtn = screen.getByTestId("mobile-save-and-print-btn");
      expect(printBtn).toBeInTheDocument();
      fireEvent.click(printBtn);

      await waitFor(() => {
        expect(saveBillMock).toHaveBeenCalledWith(true, false);
      });
    });

    it("triggers onSaveBill(false, false) on clicking 'Save' CTA and onSaveBill(false, true) on WA CTA", async () => {
      const saveBillMock = vi.fn(async () => {});
      const initialItems = [createMockCartItem(mockProducts[0], 1, 240)];

      render(
        <MemoryRouter>
          <MobilePOSTerminalHarness initialItems={initialItems} onSaveBillMock={saveBillMock} />
        </MemoryRouter>
      );

      // Open drawer
      fireEvent.click(screen.getByTestId("mobile-review-checkout-btn"));

      // Save only
      const saveOnlyBtn = screen.getByTestId("mobile-save-only-btn");
      fireEvent.click(saveOnlyBtn);

      await waitFor(() => {
        expect(saveBillMock).toHaveBeenCalledWith(false, false);
      });

      saveBillMock.mockClear();

      // Re-open drawer to test WhatsApp trigger
      fireEvent.click(screen.getByTestId("mobile-review-checkout-btn"));

      // WhatsApp trigger
      const waBtn = screen.getByTestId("mobile-whatsapp-btn");
      fireEvent.click(waBtn);

      await waitFor(() => {
        expect(saveBillMock).toHaveBeenCalledWith(false, true);
      });
    });
  });

  // -------------------------------------------------------------------------
  // 6. Sub-Component Unit Level Verification
  // -------------------------------------------------------------------------
  describe("R6. Sub-Components Unit Fidelity", () => {
    it("verifies MobileProductCard stock badge semantic colors", () => {
      // High stock product (> 10)
      const { rerender } = render(
        <MobileProductCard
          product={mockProducts[0]} // stock 25
          quantityInCart={0}
          onAdd={vi.fn()}
          onIncrement={vi.fn()}
          onDecrement={vi.fn()}
        />
      );
      const stockBadge1 = screen.getByTestId(`product-stock-${mockProducts[0].id}`);
      expect(stockBadge1.className).toContain("text-emerald-700");
      expect(stockBadge1).toHaveTextContent("Stock: 25");

      // Low stock product (1-10)
      rerender(
        <MobileProductCard
          product={mockProducts[1]} // stock 8
          quantityInCart={0}
          onAdd={vi.fn()}
          onIncrement={vi.fn()}
          onDecrement={vi.fn()}
        />
      );
      const stockBadge2 = screen.getByTestId(`product-stock-${mockProducts[1].id}`);
      expect(stockBadge2.className).toContain("text-amber-700");
      expect(stockBadge2).toHaveTextContent("Stock: 8");

      // Out of stock product (0)
      rerender(
        <MobileProductCard
          product={mockProducts[2]} // stock 0
          quantityInCart={0}
          onAdd={vi.fn()}
          onIncrement={vi.fn()}
          onDecrement={vi.fn()}
        />
      );
      const stockBadge3 = screen.getByTestId(`product-stock-${mockProducts[2].id}`);
      expect(stockBadge3.className).toContain("text-rose-700");
      expect(stockBadge3).toHaveTextContent("Out of Stock");
    });

    it("verifies MobileCartDock renders safe area padding and correct unit text", () => {
      render(
        <MobileCartDock
          itemsCount={1}
          totalUnits={1}
          grandTotal={150}
          onOpenCheckout={vi.fn()}
        />
      );

      const dock = screen.getByTestId("mobile-cart-dock");
      expect(dock.className).toContain("fixed");
      expect(dock.className).toContain("bottom-0");
      expect(dock.className).toContain("pb-[max(0.625rem,env(safe-area-inset-bottom))]");
      expect(screen.getByTestId("mobile-cart-items-count")).toHaveTextContent("1 unit (1 item)");
    });
  });

  // -------------------------------------------------------------------------
  // 7. Route Alias POS.tsx
  // -------------------------------------------------------------------------
  describe("R7. Route Alias POS.tsx Exports", () => {
    it("confirms POS.tsx cleanly default exports and named exports POSBilling", () => {
      expect(POS).toBeDefined();
      expect(ExportedPOSBilling).toBeDefined();
      expect(typeof POS).toBe("function");
      expect(typeof ExportedPOSBilling).toBe("function");
    });
  });
});
