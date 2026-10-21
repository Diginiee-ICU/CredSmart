import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MobileInvoiceSuccessView } from "@/components/invoices/mobile/MobileInvoiceSuccessView";
import { BusinessDocument } from "@/types/documents";
import { downloadExactInvoicePdf } from "@/utils/downloadExactInvoice";

vi.mock("@/utils/downloadExactInvoice", () => ({
  downloadExactInvoicePdf: vi.fn(),
}));

const createBaseInvoice = (overrides: Partial<BusinessDocument> = {}): BusinessDocument => ({
  id: "doc-challenge-001",
  organizationId: "org-001",
  docType: "sales_invoice",
  documentNumber: "INV-CHALLENGE-01",
  partyName: "Test Party",
  partyPhone: "9876543210",
  partyGstin: "27ABCDE1234F1Z5",
  partyAddress: "123 Test St",
  docDate: "2026-10-14",
  dueDate: "2026-10-21",
  items: [
    {
      id: "item-1",
      productName: "Test Item 1",
      quantity: 1,
      unit: "PCS",
      rate: 100,
      taxRate: 18,
      taxableAmount: 100,
      lineTotal: 118,
    },
  ],
  subtotal: 100,
  taxTotal: 18,
  grandTotal: 118,
  status: "paid",
  created_at: "2026-10-14T06:00:00Z",
  ...overrides,
});

describe("Adversarial Empirical Challenge Suite: MobileInvoiceSuccessView", () => {
  let onEditMock: ReturnType<typeof vi.fn>;
  let onCloseMock: ReturnType<typeof vi.fn>;
  let onDeleteMock: ReturnType<typeof vi.fn>;
  let onGenerateEwayBillMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onEditMock = vi.fn();
    onCloseMock = vi.fn();
    onDeleteMock = vi.fn();
    onGenerateEwayBillMock = vi.fn();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. RAPID SUCCESSIVE CLICKS ON EDIT, EDIT BILL, AND DONE
  // ─────────────────────────────────────────────────────────────
  describe("Adversarial Stress Test: Rapid Successive Clicks", () => {
    it("handles 20 rapid successive clicks on the circular Edit button without crashing", () => {
      render(
        <MobileInvoiceSuccessView
          invoice={createBaseInvoice()}
          onClose={onCloseMock}
          onEdit={onEditMock}
        />
      );

      const editBtn = screen.getByRole("button", { name: /^Edit$/i });
      for (let i = 0; i < 20; i++) {
        fireEvent.click(editBtn);
      }

      expect(onEditMock).toHaveBeenCalledTimes(20);
      expect(onCloseMock).not.toHaveBeenCalled();
    });

    it("handles 20 rapid successive clicks on the 'Edit Bill' footer button without crashing", () => {
      render(
        <MobileInvoiceSuccessView
          invoice={createBaseInvoice()}
          onClose={onCloseMock}
          onEdit={onEditMock}
        />
      );

      const editBillBtn = screen.getByRole("button", { name: /Edit Bill/i });
      for (let i = 0; i < 20; i++) {
        fireEvent.click(editBillBtn);
      }

      expect(onEditMock).toHaveBeenCalledTimes(20);
      expect(onCloseMock).not.toHaveBeenCalled();
    });

    it("handles 20 rapid successive clicks on the 'Done' footer button without crashing", () => {
      render(
        <MobileInvoiceSuccessView
          invoice={createBaseInvoice()}
          onClose={onCloseMock}
          onEdit={onEditMock}
        />
      );

      const doneBtn = screen.getByRole("button", { name: /^Done$/i });
      for (let i = 0; i < 20; i++) {
        fireEvent.click(doneBtn);
      }

      expect(onCloseMock).toHaveBeenCalledTimes(20);
      expect(onEditMock).not.toHaveBeenCalled();
    });

    it("handles interleaved rapid clicks between Edit Bill and Done without state corruption", () => {
      render(
        <MobileInvoiceSuccessView
          invoice={createBaseInvoice()}
          onClose={onCloseMock}
          onEdit={onEditMock}
        />
      );

      const editBillBtn = screen.getByRole("button", { name: /Edit Bill/i });
      const doneBtn = screen.getByRole("button", { name: /^Done$/i });

      for (let i = 0; i < 10; i++) {
        fireEvent.click(editBillBtn);
        fireEvent.click(doneBtn);
      }

      expect(onEditMock).toHaveBeenCalledTimes(10);
      expect(onCloseMock).toHaveBeenCalledTimes(10);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. MISSING OPTIONAL INVOICE FIELDS
  // ─────────────────────────────────────────────────────────────
  describe("Adversarial Edge Case: Missing Optional Invoice Fields", () => {
    it("renders cleanly without throwing when phone, GSTIN, and address are missing", () => {
      const minimalInvoice = createBaseInvoice({
        partyName: undefined,
        partyPhone: undefined,
        partyGstin: undefined,
        partyAddress: undefined,
      });

      expect(() => {
        render(
          <MobileInvoiceSuccessView
            invoice={minimalInvoice}
            onClose={onCloseMock}
            onEdit={onEditMock}
          />
        );
      }).not.toThrow();

      // Fallback "Cash Sale" should be rendered
      expect(screen.getAllByText(/Cash Sale/i).length).toBeGreaterThanOrEqual(1);
    });

    it("renders cleanly and triggers PDF generation when storeInfo is undefined", () => {
      const invoice = createBaseInvoice();

      expect(() => {
        render(
          <MobileInvoiceSuccessView
            invoice={invoice}
            onClose={onCloseMock}
            onEdit={onEditMock}
            storeInfo={undefined}
          />
        );
      }).not.toThrow();

      // Trigger download and print with undefined storeInfo
      const downloadBtn = screen.getByRole("button", { name: /Download/i });
      const printBtn = screen.getByRole("button", { name: /Print/i });

      fireEvent.click(downloadBtn);
      expect(downloadExactInvoicePdf).toHaveBeenCalledTimes(1);

      fireEvent.click(printBtn);
      expect(downloadExactInvoicePdf).toHaveBeenCalledTimes(2);

      // Verify payload fallback
      const lastCallPayload = vi.mocked(downloadExactInvoicePdf).mock.calls[1][0];
      expect(lastCallPayload.storeName).toBe("CredSmart Store");
      expect(lastCallPayload.storePhone).toBeUndefined();
      expect(lastCallPayload.storeGstin).toBeUndefined();
    });

    it("renders cleanly when storeInfo is provided but has all undefined optional fields", () => {
      const invoice = createBaseInvoice();

      render(
        <MobileInvoiceSuccessView
          invoice={invoice}
          onClose={onCloseMock}
          onEdit={onEditMock}
          storeInfo={{ name: "Custom Name Only" }}
        />
      );

      const downloadBtn = screen.getByRole("button", { name: /Download/i });
      fireEvent.click(downloadBtn);

      const lastCallPayload = vi.mocked(downloadExactInvoicePdf).mock.calls[0][0];
      expect(lastCallPayload.storeName).toBe("Custom Name Only");
      expect(lastCallPayload.storePhone).toBeUndefined();
    });

    it("handles invoice with 0 items without throwing in preview and PDF payload", () => {
      const zeroItemsInvoice = createBaseInvoice({
        items: [],
        subtotal: 0,
        taxTotal: 0,
        grandTotal: 0,
      });

      expect(() => {
        render(
          <MobileInvoiceSuccessView
            invoice={zeroItemsInvoice}
            onClose={onCloseMock}
            onEdit={onEditMock}
          />
        );
      }).not.toThrow();

      const downloadBtn = screen.getByRole("button", { name: /Download/i });
      fireEvent.click(downloadBtn);

      const lastCallPayload = vi.mocked(downloadExactInvoicePdf).mock.calls[0][0];
      expect(lastCallPayload.items).toEqual([]);
    });

    it("handles invoice with missing item unit by falling back to 'PCS'", () => {
      const itemWithoutUnit = createBaseInvoice({
        items: [
          {
            id: "no-unit-1",
            productName: "Raw Commodity",
            quantity: 3,
            unit: undefined as any,
            rate: 50,
            lineTotal: 150,
          },
        ],
      });

      render(
        <MobileInvoiceSuccessView
          invoice={itemWithoutUnit}
          onClose={onCloseMock}
          onEdit={onEditMock}
        />
      );

      const downloadBtn = screen.getByRole("button", { name: /Download/i });
      fireEvent.click(downloadBtn);

      const lastCallPayload = vi.mocked(downloadExactInvoicePdf).mock.calls[0][0];
      expect(lastCallPayload.items[0].unit).toBe("PCS");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. ZERO TOTAL / PAID / UNPAID INVOICES
  // ─────────────────────────────────────────────────────────────
  describe("Adversarial Edge Case: Zero Total / Paid / Unpaid Invoices", () => {
    it("renders zero grand total correctly with ₹0 formatting", () => {
      const zeroInvoice = createBaseInvoice({
        subtotal: 0,
        taxTotal: 0,
        grandTotal: 0,
        paidAmount: 0,
        balanceDue: 0,
        status: "paid",
      });

      render(
        <MobileInvoiceSuccessView
          invoice={zeroInvoice}
          onClose={onCloseMock}
          onEdit={onEditMock}
        />
      );

      // Verify ₹0 / ₹0.00 displays without NaN
      expect(screen.getByText("₹0.00")).toBeInTheDocument();
      expect(screen.getByText("₹0")).toBeInTheDocument();
      expect(screen.getByText("Paid")).toBeInTheDocument();
    });

    it("renders status 'unpaid' badge when invoice status is unpaid", () => {
      const unpaidInvoice = createBaseInvoice({
        status: "unpaid",
        grandTotal: 500,
        paidAmount: 0,
        balanceDue: 500,
      });

      render(
        <MobileInvoiceSuccessView
          invoice={unpaidInvoice}
          onClose={onCloseMock}
          onEdit={onEditMock}
        />
      );

      expect(screen.getByText("Unpaid")).toBeInTheDocument();
      expect(screen.queryByText("Paid")).not.toBeInTheDocument();
    });

    it("renders status 'partial' badge when invoice status is partial", () => {
      const partialInvoice = createBaseInvoice({
        status: "partial",
        grandTotal: 500,
        paidAmount: 200,
        balanceDue: 300,
      });

      render(
        <MobileInvoiceSuccessView
          invoice={partialInvoice}
          onClose={onCloseMock}
          onEdit={onEditMock}
        />
      );

      expect(screen.getByText("Partial")).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. LARGE ITEMS LIST & OVERFLOW BEHAVIOR
  // ─────────────────────────────────────────────────────────────
  describe("Adversarial Stress Test: High Volume Line Items", () => {
    it("renders item overflow badge (+6 more item(s)) when invoice has 10 items", () => {
      const tenItems = Array.from({ length: 10 }, (_, i) => ({
        id: `item-${i}`,
        productName: `Item Number ${i + 1}`,
        quantity: 1,
        unit: "PCS",
        rate: 10,
        lineTotal: 10,
      }));

      const largeInvoice = createBaseInvoice({
        items: tenItems,
        grandTotal: 100,
      });

      render(
        <MobileInvoiceSuccessView
          invoice={largeInvoice}
          onClose={onCloseMock}
          onEdit={onEditMock}
        />
      );

      expect(screen.getByText("+6 more item(s)")).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. DOCUMENT TYPES & HEADER BEHAVIOR
  // ─────────────────────────────────────────────────────────────
  describe("Adversarial Edge Case: Non-Sales Document Types", () => {
    it("displays 'Purchase Invoice Created' when docType is purchase_invoice", () => {
      const purchaseInvoice = createBaseInvoice({
        docType: "purchase_invoice",
      });

      render(
        <MobileInvoiceSuccessView
          invoice={purchaseInvoice}
          onClose={onCloseMock}
          onEdit={onEditMock}
        />
      );

      expect(screen.getByText("Purchase Invoice Created")).toBeInTheDocument();
      expect(screen.getByText("Purchase Invoice")).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. SHARE AND CLIPBOARD BEHAVIOR UNDER MOBILE ENVIRONMENT
  // ─────────────────────────────────────────────────────────────
  describe("Adversarial Edge Case: Share & Clipboard APIs", () => {
    it("calls navigator.share when available and ignores rejection gracefully", async () => {
      const shareMock = vi.fn().mockRejectedValue(new Error("User cancelled"));
      Object.assign(navigator, { share: shareMock });

      render(
        <MobileInvoiceSuccessView
          invoice={createBaseInvoice()}
          onClose={onCloseMock}
          onEdit={onEditMock}
        />
      );

      const shareBtn = screen.getByRole("button", { name: /Share/i });
      await act(async () => {
        fireEvent.click(shareBtn);
      });

      expect(shareMock).toHaveBeenCalledTimes(1);
    });

    it("falls back to navigator.clipboard when navigator.share is undefined", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      const originalShare = navigator.share;
      // @ts-ignore
      delete navigator.share;
      Object.assign(navigator, {
        clipboard: { writeText: writeTextMock },
      });

      render(
        <MobileInvoiceSuccessView
          invoice={createBaseInvoice()}
          onClose={onCloseMock}
          onEdit={onEditMock}
        />
      );

      const shareBtn = screen.getByRole("button", { name: /Share/i });
      await act(async () => {
        fireEvent.click(shareBtn);
      });

      expect(writeTextMock).toHaveBeenCalledTimes(1);

      // Restore navigator.share if it existed
      if (originalShare) {
        Object.assign(navigator, { share: originalShare });
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 7. ALL 3 EDIT TRIGGERS RAPID INTERACTION STRESS
  // ─────────────────────────────────────────────────────────────
  describe("Adversarial Stress Test: All 3 Edit Triggers", () => {
    it("handles rapid sequential clicks across header edit, quick action edit, and footer edit bill", () => {
      const { container } = render(
        <MobileInvoiceSuccessView
          invoice={createBaseInvoice()}
          onClose={onCloseMock}
          onEdit={onEditMock}
        />
      );

      const headerEditBtn = container.querySelector(".sticky.top-0 button.text-blue-600");
      const quickActionEditBtn = screen.getByRole("button", { name: /^Edit$/i });
      const footerEditBillBtn = screen.getByRole("button", { name: /Edit Bill/i });

      expect(headerEditBtn).not.toBeNull();
      expect(quickActionEditBtn).not.toBeNull();
      expect(footerEditBillBtn).not.toBeNull();

      for (let i = 0; i < 5; i++) {
        fireEvent.click(headerEditBtn!);
        fireEvent.click(quickActionEditBtn);
        fireEvent.click(footerEditBillBtn);
      }

      expect(onEditMock).toHaveBeenCalledTimes(15);
    });

    it("gracefully renders and downloads when items array is undefined or empty", () => {
      const invoiceWithoutItems = {
        ...createBaseInvoice(),
        items: undefined as any,
      };

      expect(() => {
        render(
          <MobileInvoiceSuccessView
            invoice={invoiceWithoutItems}
            onClose={onCloseMock}
            onEdit={onEditMock}
          />
        );
      }).not.toThrow();

      expect(screen.getAllByText("Test Party").length).toBeGreaterThan(0);

      const downloadBtn = screen.getByRole("button", { name: /^Download$/i });
      expect(() => fireEvent.click(downloadBtn)).not.toThrow();
      expect(downloadExactInvoicePdf).toHaveBeenCalledTimes(1);
    });
  });
});
