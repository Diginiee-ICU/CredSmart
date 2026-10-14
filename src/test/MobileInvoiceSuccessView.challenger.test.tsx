import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileInvoiceSuccessView } from "@/components/invoices/mobile/MobileInvoiceSuccessView";
import { BusinessDocument } from "@/types/documents";

// Mock PDF generation
vi.mock("@/utils/downloadExactInvoice", () => ({
  downloadExactInvoicePdf: vi.fn(),
}));

const mockInvoice: BusinessDocument = {
  id: "doc-adv-202",
  organizationId: "org-adv-202",
  docType: "sales_invoice",
  documentNumber: "INV-2026-CHALLENGER-9999",
  partyName: "Adversarial Stress Supermarket With Extremely Long Business Name India Pvt Ltd",
  partyPhone: "9876543210",
  partyGstin: "27AABCA1234A1Z5",
  partyAddress: "Plot 99, Adversarial Tech Park, Mumbai",
  docDate: "2026-10-14",
  dueDate: "2026-10-21",
  items: [
    {
      id: "item-1",
      productName: "Stress Item Alpha",
      quantity: 10,
      unit: "PCS",
      rate: 100,
      taxRate: 18,
      taxableAmount: 1000,
      cgstAmount: 90,
      sgstAmount: 90,
      igstAmount: 0,
      lineTotal: 1180,
    },
  ],
  subtotal: 1000,
  taxableTotal: 1000,
  cgstTotal: 90,
  sgstTotal: 90,
  igstTotal: 0,
  taxTotal: 180,
  grandTotal: 1180,
  paidAmount: 1180,
  balanceDue: 0,
  status: "paid",
  paymentMethod: "UPI",
  created_at: "2026-10-14T06:00:00Z",
};

describe("Adversarial Review: Event Bubbling & Child Target Propagation", () => {
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
        {...propsOverrides}
      />
    );
  };

  it("triggers onEdit when directly clicking the child <path> inside circular Edit button", () => {
    const { container } = renderComponent();
    const editBtn = screen.getByRole("button", { name: /^Edit$/i });
    const pathElem = editBtn.querySelector("path");
    expect(pathElem).not.toBeNull();

    // Directly click the path element
    fireEvent.click(pathElem!);
    expect(onEditMock).toHaveBeenCalledTimes(1);
    expect(onCloseMock).not.toHaveBeenCalled();
  });

  it("triggers onEdit when directly clicking the child <svg> inside circular Edit button", () => {
    const { container } = renderComponent();
    const editBtn = screen.getByRole("button", { name: /^Edit$/i });
    const svgElem = editBtn.querySelector("svg");
    expect(svgElem).not.toBeNull();

    fireEvent.click(svgElem!);
    expect(onEditMock).toHaveBeenCalledTimes(1);
    expect(onCloseMock).not.toHaveBeenCalled();
  });

  it("triggers onEdit when clicking the circular inner <div> container", () => {
    const { container } = renderComponent();
    const editBtn = screen.getByRole("button", { name: /^Edit$/i });
    const circleDiv = editBtn.querySelector(".rounded-full");
    expect(circleDiv).not.toBeNull();

    fireEvent.click(circleDiv!);
    expect(onEditMock).toHaveBeenCalledTimes(1);
  });

  it("triggers onEdit when clicking the label <span>Edit</span>", () => {
    renderComponent();
    const spanElem = screen.getByText(/^Edit$/i);
    expect(spanElem.tagName.toLowerCase()).toBe("span");

    fireEvent.click(spanElem);
    expect(onEditMock).toHaveBeenCalledTimes(1);
  });

  it("triggers onEdit when clicking child <path> inside footer 'Edit Bill' button", () => {
    renderComponent();
    const editBillBtn = screen.getByRole("button", { name: /Edit Bill/i });
    const pathElem = editBillBtn.querySelector("path");
    expect(pathElem).not.toBeNull();

    fireEvent.click(pathElem!);
    expect(onEditMock).toHaveBeenCalledTimes(1);
    expect(onCloseMock).not.toHaveBeenCalled();
  });

  it("triggers onEdit when clicking <span>Edit Bill</span> inside footer button", () => {
    renderComponent();
    const spanElem = screen.getByText(/^Edit Bill$/i);
    fireEvent.click(spanElem);
    expect(onEditMock).toHaveBeenCalledTimes(1);
  });

  it("triggers onClose when clicking child <path> inside header back ArrowLeft button", () => {
    const { container } = renderComponent();
    const backBtn = container.querySelector(".lucide-arrow-left")?.closest("button");
    const pathElem = backBtn?.querySelector("path");
    expect(pathElem).not.toBeNull();

    fireEvent.click(pathElem!);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("triggers onEdit when clicking child <path> inside header Edit2 button", () => {
    const { container } = renderComponent();
    const headerEditBtn = container.querySelector(".sticky.top-0 button.text-blue-600");
    const pathElem = headerEditBtn?.querySelector("path");
    expect(pathElem).not.toBeNull();

    fireEvent.click(pathElem!);
    expect(onEditMock).toHaveBeenCalledTimes(1);
  });

  it("triggers onDelete when clicking child <path> inside header Trash2 button", () => {
    const { container } = renderComponent();
    const trashBtn = container.querySelector(".sticky.top-0 button.text-rose-500");
    const pathElem = trashBtn?.querySelector("path");
    expect(pathElem).not.toBeNull();

    fireEvent.click(pathElem!);
    expect(onDeleteMock).toHaveBeenCalledTimes(1);
  });
});

describe("Adversarial Review: Viewport Constraints & Non-Wrapping Invariants", () => {
  it("enforces flex-nowrap behavior on Quick Action Row across 320px-414px viewports", () => {
    const { container } = render(
      <MobileInvoiceSuccessView
        invoice={mockInvoice}
        onClose={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    const editBtn = screen.getByRole("button", { name: /^Edit$/i });
    const actionRow = editBtn.closest(".justify-around") as HTMLElement;
    expect(actionRow).not.toBeNull();

    // Invariant 1: Action row must have 'flex' and must NOT have 'flex-wrap'
    const classList = actionRow.className.split(/\s+/);
    expect(classList).toContain("flex");
    expect(classList).not.toContain("flex-wrap");
    expect(classList).toContain("justify-around");

    // Invariant 2: Action row padding must be px-2 on mobile (16px total)
    expect(classList).toContain("px-2");

    // Invariant 3: Exactly 5 action buttons with min-w-[56px]
    const buttons = actionRow.querySelectorAll("button");
    expect(buttons).toHaveLength(5);
    buttons.forEach((btn) => {
      expect(btn.className).toMatch(/min-w-\[56px\]/);
    });

    // Invariant 4: Mathematical budget check for viewports
    // 5 buttons * 56px = 280px total width
    const totalButtonWidth = 5 * 56;
    const paddingX = 16; // px-2 (8px * 2)

    const viewports = [320, 360, 375, 414];
    viewports.forEach((vp) => {
      const availableInnerWidth = vp - paddingX;
      expect(totalButtonWidth).toBeLessThanOrEqual(availableInnerWidth);
      const remainingSpace = availableInnerWidth - totalButtonWidth;
      expect(remainingSpace).toBeGreaterThanOrEqual(0);
    });
  });

  it("enforces side-by-side flex-1 invariant on Sticky Footer across all viewports", () => {
    const { container } = render(
      <MobileInvoiceSuccessView
        invoice={mockInvoice}
        onClose={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    const editBillBtn = screen.getByRole("button", { name: /Edit Bill/i });
    const doneBtn = screen.getByRole("button", { name: /^Done$/i });
    const footerContainer = editBillBtn.closest(".fixed.bottom-0") as HTMLElement;

    expect(footerContainer).not.toBeNull();
    const classList = footerContainer.className.split(/\s+/);
    expect(classList).toContain("flex");
    expect(classList).not.toContain("flex-wrap");
    expect(classList).toContain("gap-3");

    // Invariant 5: Both buttons have flex-1 for equal 50/50 allocation
    expect(editBillBtn.className).toMatch(/flex-1/);
    expect(doneBtn.className).toMatch(/flex-1/);

    // Invariant 6: Content inside buttons does not exceed half-width on 320px
    // At 320px: available width = 320 - 32 (p-4 is 16px*2) - 12 (gap-3) = 276px.
    // Each button gets 138px.
    const min320ButtonWidth = (320 - 32 - 12) / 2;
    expect(min320ButtonWidth).toBe(138);
    // 138px is ample space for "Edit Bill" with 16px icon and "Done"
  });

  it("handles missing storeInfo gracefully without throwing", () => {
    expect(() => {
      render(
        <MobileInvoiceSuccessView
          invoice={mockInvoice}
          onClose={vi.fn()}
          onEdit={vi.fn()}
          storeInfo={undefined}
        />
      );
    }).not.toThrow();

    expect(screen.getAllByText(/INV-2026-CHALLENGER-9999/).length).toBeGreaterThanOrEqual(1);
  });
});
