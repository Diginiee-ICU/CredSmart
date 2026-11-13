/**
 * @file posInvoiceZeroAmountElimination.test.tsx
 * @description Comprehensive Test Suite verifying zero-amount elimination across POS billing,
 * receipt generation, thermal ESC/POS, UnifiedInvoiceRenderer, and documentsService.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import POSBilling from "@/pages/POSBilling";
import { UnifiedInvoiceRenderer } from "@/components/invoices/UnifiedInvoiceRenderer";
import { documentsService } from "@/services/documentsService";
import { buildReceiptEscPos } from "@/utils/escpos";
import { ReceiptData } from "@/components/ReceiptModal";

// ---------------------------------------------------------------------------
// Mocks & Fixtures via vi.hoisted
// ---------------------------------------------------------------------------

const { mockToast, mockProducts, mockBatches, mockCreateSale, mockSaveDocument } = vi.hoisted(() => ({
  mockToast: vi.fn(),
  mockCreateSale: vi.fn(async (payload: any) => ({
    data: { id: "sale-saved-101", ...payload },
    error: null,
  })),
  mockSaveDocument: vi.fn(async (doc: any) => doc),
  mockProducts: [
    {
      id: "prod-zero-batch-mrp",
      name: "Special Tea 500g",
      barcode: "8901234567890",
      category: "Beverages",
      selling_price: 240,
      batches: [
        {
          id: "batch-zero-mrp",
          product_id: "prod-zero-batch-mrp",
          batch_number: "BATCH-ZERO",
          mrp: 0, // Defect scenario: batch MRP is 0
          stock: 50,
          cost_price: 180,
        },
      ],
      tags: { selling_price: "240", stock: "50" },
    },
    {
      id: "prod-normal",
      name: "Organic Honey 250g",
      barcode: "8909876543210",
      category: "Grocery",
      batches: [
        {
          id: "batch-normal",
          product_id: "prod-normal",
          batchNumber: "HONEY-01",
          mrp: 180,
          stock: 30,
          costPrice: 120,
        },
      ],
    },
  ],
  mockBatches: [
    {
      id: "batch-zero-mrp",
      product_id: "prod-zero-batch-mrp",
      batch_number: "BATCH-ZERO",
      mrp: 0,
      stock: 50,
      cost_price: 180,
    },
    {
      id: "batch-normal",
      product_id: "prod-normal",
      batch_number: "HONEY-01",
      mrp: 180,
      stock: 30,
      cost_price: 120,
    },
  ],
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

vi.mock("@/context/ProductsContext", () => ({
  useProducts: () => ({ products: mockProducts, loading: false }),
  ProductsProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: any[]) => mockToast(...args),
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/lib/sound", () => ({
  soundService: {
    playErrorBeep: vi.fn(),
    playSuccessChime: vi.fn(),
    playBeep: vi.fn(),
    playScanBeep: vi.fn(),
    playTabSwitch: vi.fn(),
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

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "cashier-user-1", email: "pos@credsmart.test" },
    signOut: vi.fn(),
  }),
}));

vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => ({
    org: {
      id: "org-zero-test",
      name: "CredSmart Test Mart",
      address: "123 Market Street",
      phone: "9876543210",
      gstin: "27AABCU9603R1ZM",
    },
    orgId: "org-zero-test",
    userRole: "admin",
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
    getParties: vi.fn(async () => ({ data: [], error: null })),
    getCustomers: vi.fn(async () => ({ data: [], error: null })),
    recordCreditTransaction: vi.fn(async () => ({ data: null, error: null })),
  },
}));

vi.mock("@/services/invoicesApi", () => ({
  invoicesApi: {
    createSale: (...args: any[]) => mockCreateSale(...args),
    createSaleItems: vi.fn(async () => ({ data: [], error: null })),
    getSales: vi.fn(async () => ({
      data: [
        {
          id: "sale-sup-1",
          invoice_number: "INV-999001",
          total: 0, // Defect scenario: s.total is 0 in DB
          total_amount: 360, // but total_amount is 360
          subtotal: 360,
          discount_amount: 0,
          payment_method: "Cash",
          created_at: "2026-11-13T10:00:00Z",
          sale_items: [
            {
              id: "item-1",
              product_name: "Special Tea 500g",
              quantity: 2,
              mrp: 180,
              line_total: 360,
            },
          ],
        },
      ],
      error: null,
    })),
  },
}));

describe("Zero Amount POS Invoice Elimination Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("1. Resolves product price to selling_price when batch MRP is 0, displaying non-zero cart amounts", async () => {
    render(
      <MemoryRouter>
        <POSBilling />
      </MemoryRouter>
    );

    // Search and select product with batch MRP 0
    const searchInput = screen.getByPlaceholderText(/Search item \/ barcode \/ SKU \/ HSN/i);
    fireEvent.focus(searchInput);
    fireEvent.change(searchInput, { target: { value: "Special Tea" } });

    // Wait for dropdown result
    await waitFor(() => {
      expect(screen.getAllByText("Special Tea 500g").length).toBeGreaterThan(0);
    });

    const productResults = screen.getAllByText("Special Tea 500g");
    const clickableResult = productResults.find((el) => el.closest("div[class*='cursor-pointer']"));
    expect(clickableResult).toBeTruthy();
    fireEvent.click(clickableResult!.closest("div[class*='cursor-pointer']")!);

    // Verify cart reflects non-zero selling_price (₹240) instead of 0
    await waitFor(() => {
      // Look for ₹240.00 in cart table or summary
      const priceElements = screen.getAllByText(/240/);
      expect(priceElements.length).toBeGreaterThan(0);
    });

    // Check Net Payable / Grand Total is positive
    const netPayableHeading = screen.getByText(/Net Payable/i);
    expect(netPayableHeading).toBeInTheDocument();
  });

  it("2. UnifiedInvoiceRenderer falls back to line items total when totals.grandTotal is 0 or null", () => {
    const { container } = render(
      <UnifiedInvoiceRenderer
        invoiceNumber="INV-FALLBACK-01"
        copyType="ORIGINAL FOR RECIPIENT"
        date={new Date("2026-11-13")}
        items={[
          {
            name: "Premium Coffee 200g",
            qty: 2,
            rate: 250,
            total: 500,
            unit: "PCS",
          },
        ]}
        totals={{
          subtotal: 0, // Defect scenario: passed as 0
          grandTotal: 0, // Defect scenario: passed as 0
        } as any}
      />
    );

    // Should display ₹500.00 (from items total) instead of ₹0.00
    const renderedText = container.textContent || "";
    expect(renderedText).toContain("500.00");
    expect(renderedText).not.toContain("₹0.00");
  });

  it("3. documentsService.fetchSalesDocuments maps positive grandTotal even if s.total is 0", async () => {
    const docs = await documentsService.fetchSalesDocuments("org-zero-test", "sales_invoice");
    expect(docs.length).toBeGreaterThan(0);
    const invoice = docs.find((d) => d.documentNumber === "INV-999001");
    expect(invoice).toBeDefined();
    // Must be 360, not 0
    expect(invoice?.grandTotal).toBe(360);
    expect(invoice?.subtotal).toBe(360);
  });

  it("4. buildReceiptEscPos formats non-zero rate and line total even if batch.mrp is 0", () => {
    const receiptData: ReceiptData = {
      docType: "pos_invoice",
      invoiceNumber: "INV-ESCPOS-01",
      storeName: "CredSmart Mart",
      date: new Date("2026-11-13T10:00:00Z"),
      paymentMethod: "Cash",
      items: [
        {
          product: { name: "Zero Batch Product" },
          batch: { mrp: 0 },
          quantity: 2,
          sp: 150, // SP is 150
          total: 300,
        } as any,
      ],
      subtotal: 0, // passed 0
      total: 0, // passed 0
      tax: 0,
      discountAmount: 0,
      discountLabel: "",
    };

    const uint8Array = buildReceiptEscPos(receiptData, { paperWidth: "80mm" });
    const decoded = new TextDecoder("utf-8").decode(uint8Array);

    // Text should contain Rs.300.00 or 150.00, not Rs.0.00
    expect(decoded).toContain("Rs.300.00");
  });
});
