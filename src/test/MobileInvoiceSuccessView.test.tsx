import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileInvoiceSuccessView } from "@/components/invoices/mobile/MobileInvoiceSuccessView";
import { BusinessDocument } from "@/types/documents";

// Mock PDF generation to prevent html2canvas/jspdf execution in jsdom
vi.mock("@/utils/downloadExactInvoice", () => ({
  downloadExactInvoicePdf: vi.fn(),
}));

const mockInvoice: BusinessDocument = {
  id: "doc-test-101",
  organizationId: "org-test-101",
  docType: "sales_invoice",
  documentNumber: "INV-2026-0042",
  partyName: "Acme Supermarket",
  partyPhone: "9876543210",
  partyGstin: "27AABCA1234A1Z5",
  partyAddress: "Plot 42, Bandra West, Mumbai 400050",
  docDate: "2026-10-14",
  dueDate: "2026-10-21",
  items: [
    {
      id: "item-1",
      productName: "Premium Basmati Rice",
      quantity: 5,
      unit: "KG",
      rate: 120,
      discountPercent: 0,
      discountAmount: 0,
      taxRate: 5,
      taxableAmount: 600,
      cgstAmount: 15,
      sgstAmount: 15,
      igstAmount: 0,
      lineTotal: 630,
    },
    {
      id: "item-2",
      productName: "Sunflower Oil 1L",
      quantity: 2,
      unit: "LTR",
      rate: 140,
      discountPercent: 0,
      discountAmount: 0,
      taxRate: 5,
      taxableAmount: 280,
      cgstAmount: 7,
      sgstAmount: 7,
      igstAmount: 0,
      lineTotal: 294,
    },
  ],
  subtotal: 880,
  discountTotal: 0,
  taxableTotal: 880,
  cgstTotal: 22,
  sgstTotal: 22,
  igstTotal: 0,
  taxTotal: 44,
  roundOff: 0,
  grandTotal: 924,
  paidAmount: 924,
  balanceDue: 0,
  status: "paid",
  paymentMethod: "Cash",
  created_at: "2026-10-14T06:00:00Z",
};

describe("MobileInvoiceSuccessView Unit Test Suite", () => {
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

  const renderComponent = (propsOverrides: Partial<React.ComponentProps<typeof MobileInvoiceSuccessView>> = {}) => {
    return render(
      <MobileInvoiceSuccessView
        invoice={mockInvoice}
        onClose={onCloseMock}
        onEdit={onEditMock}
        onDelete={onDeleteMock}
        onGenerateEwayBill={onGenerateEwayBillMock}
        storeInfo={{
          name: "CredSmart Retail Hub",
          phone: "9988776655",
          email: "billing@credsmart.in",
          address: "Shop 12, High Street, Mumbai",
          gstin: "27AAACB1234F1Z1",
        }}
        {...propsOverrides}
      />
    );
  };

  // ─────────────────────────────────────────────────────────────
  // SUITE 1: QUICK ACTION ROW EDIT BUTTON (R1)
  // ─────────────────────────────────────────────────────────────
  describe("R1: Quick Action Row Edit Button", () => {
    it("renders the circular Edit action button alongside existing action buttons", () => {
      renderComponent();
      const editBtn = screen.getByRole("button", { name: /^Edit$/i });
      expect(editBtn).toBeInTheDocument();
      expect(screen.getByText(/^Edit$/i)).toBeInTheDocument();
    });

    it("applies circular styling consistent with existing purple/indigo action circles", () => {
      renderComponent();
      const editBtn = screen.getByRole("button", { name: /^Edit$/i });
      const circleContainer = editBtn.querySelector(".rounded-full") || editBtn;
      expect(circleContainer.className).toMatch(/w-12/);
      expect(circleContainer.className).toMatch(/h-12/);
      expect(circleContainer.className).toMatch(/rounded-full/);
      expect(circleContainer.className).toMatch(/border-2/);
      expect(circleContainer.className).toMatch(/border-indigo-200/);
      expect(circleContainer.className).toMatch(/bg-indigo-50/);
    });

    it("triggers onEdit callback exactly once when the circular Edit button is tapped", () => {
      renderComponent();
      const editBtn = screen.getByRole("button", { name: /^Edit$/i });
      fireEvent.click(editBtn);

      expect(onEditMock).toHaveBeenCalledTimes(1);
      expect(onCloseMock).not.toHaveBeenCalled();
    });

    it("action row contains 5 buttons: Print, Download, Share, E-Way Bill, and Edit", () => {
      renderComponent();
      expect(screen.getByRole("button", { name: /Print/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Download/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Share/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /E-Way Bill/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Edit$/i })).toBeInTheDocument();

      const editBtn = screen.getByRole("button", { name: /^Edit$/i });
      const actionRow = editBtn.closest(".justify-around");
      expect(actionRow).not.toBeNull();
      expect(actionRow?.querySelectorAll("button")).toHaveLength(5);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // SUITE 2: DUAL-ACTION STICKY FOOTER (R2)
  // ─────────────────────────────────────────────────────────────
  describe("R2: Dual-Action Sticky Footer Layout & Styling", () => {
    it("renders both 'Edit Bill' and 'Done' buttons side-by-side in sticky footer", () => {
      renderComponent();
      const editBillBtn = screen.getByRole("button", { name: /Edit Bill/i });
      const doneBtn = screen.getByRole("button", { name: /^Done$/i });

      expect(editBillBtn).toBeInTheDocument();
      expect(doneBtn).toBeInTheDocument();

      const footerContainer = editBillBtn.closest(".fixed.bottom-0") || editBillBtn.parentElement;
      expect(footerContainer).toContainElement(doneBtn);
      expect(footerContainer?.className).toMatch(/flex/);
      expect(footerContainer?.className).toMatch(/gap-3/);
    });

    it("styles 'Edit Bill' button with outline/soft indigo palette", () => {
      renderComponent();
      const editBillBtn = screen.getByRole("button", { name: /Edit Bill/i });
      expect(editBillBtn.className).toMatch(/bg-indigo-50/);
      expect(editBillBtn.className).toMatch(/border-indigo-200/);
      expect(editBillBtn.className).toMatch(/text-indigo-700/);
      expect(editBillBtn.className).toMatch(/rounded-xl/);
      expect(editBillBtn.className).toMatch(/flex-1/);
    });

    it("styles 'Done' button with primary filled indigo palette", () => {
      renderComponent();
      const doneBtn = screen.getByRole("button", { name: /^Done$/i });
      expect(doneBtn.className).toMatch(/bg-indigo-600/);
      expect(doneBtn.className).toMatch(/text-white/);
      expect(doneBtn.className).toMatch(/rounded-xl/);
      expect(doneBtn.className).toMatch(/flex-1/);
    });

    it("applies safe-area inset bottom padding to the sticky footer", () => {
      const { container } = renderComponent();
      const footer = container.querySelector(".fixed.bottom-0");
      expect(footer).not.toBeNull();
      expect(footer?.className).toMatch(/pb-\[max\(1rem,env\(safe-area-inset-bottom\)\)\]/);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // SUITE 3: FOOTER CALLBACK TRIGGERS (R2 & R3)
  // ─────────────────────────────────────────────────────────────
  describe("R3: Callback Wiring & Transition Handlers", () => {
    it("invokes onEdit when 'Edit Bill' footer button is clicked", () => {
      renderComponent();
      const editBillBtn = screen.getByRole("button", { name: /Edit Bill/i });
      fireEvent.click(editBillBtn);

      expect(onEditMock).toHaveBeenCalledTimes(1);
      expect(onCloseMock).not.toHaveBeenCalled();
    });

    it("invokes onClose when 'Done' footer button is clicked", () => {
      renderComponent();
      const doneBtn = screen.getByRole("button", { name: /^Done$/i });
      fireEvent.click(doneBtn);

      expect(onCloseMock).toHaveBeenCalledTimes(1);
      expect(onEditMock).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // SUITE 4: HEADER ACTIONS & PARITY
  // ─────────────────────────────────────────────────────────────
  describe("Header Action Triggers", () => {
    it("invokes onClose when top-left back button is clicked", () => {
      const { container } = renderComponent();
      const backBtn = container.querySelector(".lucide-arrow-left")?.closest("button");
      expect(backBtn).toBeTruthy();
      fireEvent.click(backBtn!);

      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it("invokes onEdit when top-right edit icon button is clicked", () => {
      const { container } = renderComponent();
      const headerEditBtn = container.querySelector(".sticky.top-0 button.text-blue-600, .sticky button.text-blue-600, .sticky.top-0 .lucide-pen, .sticky.top-0 .lucide-edit-2")?.closest("button");
      expect(headerEditBtn).toBeTruthy();
      fireEvent.click(headerEditBtn!);

      expect(onEditMock).toHaveBeenCalledTimes(1);
    });

    it("invokes onDelete when header trash button is clicked", () => {
      const { container } = renderComponent();
      const trashBtn = container.querySelector(".sticky.top-0 button.text-rose-500, .sticky button.text-rose-500, .lucide-trash2, .lucide-trash-2, .lucide-trash")?.closest("button");
      expect(trashBtn).toBeTruthy();
      fireEvent.click(trashBtn!);

      expect(onDeleteMock).toHaveBeenCalledTimes(1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // SUITE 5: GRACEFUL DEGRADATION (OMITTED CALLBACKS)
  // ─────────────────────────────────────────────────────────────
  describe("Graceful Degradation When Optional Callbacks Are Omitted", () => {
    it("renders full-width 'Done' button when onEdit is omitted", () => {
      const { container } = renderComponent({ onEdit: undefined });

      const doneBtn = screen.getByRole("button", { name: /^Done$/i });
      expect(doneBtn).toBeInTheDocument();
      expect(doneBtn.className).toMatch(/w-full/);

      // 'Edit Bill' button must not be present in footer
      expect(screen.queryByRole("button", { name: /Edit Bill/i })).not.toBeInTheDocument();

      // Action row Edit button must not be present
      expect(screen.queryByRole("button", { name: /^Edit$/i })).not.toBeInTheDocument();

      // Header edit button must not be present
      const headerEdit = container.querySelector(".sticky.top-0 .lucide-pen, .sticky.top-0 .lucide-edit-2, button.text-blue-600");
      expect(headerEdit).toBeNull();

      // Clicking Done should still call onClose cleanly
      fireEvent.click(doneBtn);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it("does not render header trash button when onDelete is omitted", () => {
      const { container } = renderComponent({ onDelete: undefined });
      const trashIcon = container.querySelector(".lucide-trash2, .lucide-trash-2, .lucide-trash, button.text-rose-500");
      expect(trashIcon).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // SUITE 6: DATA INTEGRITY & ACCESSIBILITY
  // ─────────────────────────────────────────────────────────────
  describe("Data Integrity & Accessibility", () => {
    it("displays invoice document number and grand total in preview", () => {
      renderComponent();
      expect(screen.getAllByText(/INV-2026-0042/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/924/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Acme Supermarket/i).length).toBeGreaterThanOrEqual(1);
    });

    it("has accessible buttons with proper minimum touch target sizes", () => {
      renderComponent();
      const editBillBtn = screen.getByRole("button", { name: /Edit Bill/i });
      const doneBtn = screen.getByRole("button", { name: /^Done$/i });

      // Verifies minimum vertical padding for 48px touch target
      expect(editBillBtn.className).toMatch(/py-3\.5/);
      expect(doneBtn.className).toMatch(/py-3\.5/);
    });
  });
});
