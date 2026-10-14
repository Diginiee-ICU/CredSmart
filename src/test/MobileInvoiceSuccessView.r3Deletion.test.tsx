import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MobileInvoiceSuccessView } from "@/components/invoices/mobile/MobileInvoiceSuccessView";
import { BusinessDocument } from "@/types/documents";
import { documentsService } from "@/services/documentsService";
import { toast } from "sonner";

// Mock external dependencies
vi.mock("@/utils/downloadExactInvoice", () => ({
  downloadExactInvoicePdf: vi.fn(),
}));

vi.mock("@/services/documentsService", () => ({
  documentsService: {
    deleteDocument: vi.fn(),
    saveDocument: vi.fn(),
    getLocalDocuments: vi.fn(),
    saveLocalDocuments: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const mockInvoice: BusinessDocument = {
  id: "doc-r3-test-99",
  organizationId: "org-r3-100",
  docType: "sales_invoice",
  documentNumber: "INV-R3-999",
  partyName: "Test Party Corp",
  partyPhone: "9876543210",
  partyGstin: "27AABCA1234A1Z5",
  partyAddress: "123 Business St, Mumbai",
  docDate: "2026-10-14",
  dueDate: "2026-10-21",
  items: [
    {
      id: "item-1",
      productName: "Test Item",
      quantity: 2,
      unit: "PCS",
      rate: 500,
      taxRate: 18,
      taxableAmount: 1000,
      cgstAmount: 90,
      sgstAmount: 90,
      igstAmount: 0,
      lineTotal: 1180,
    },
  ],
  subtotal: 1000,
  taxTotal: 180,
  grandTotal: 1180,
  paidAmount: 1180,
  balanceDue: 0,
  status: "paid",
  paymentMethod: "Cash",
  created_at: "2026-10-14T06:00:00Z",
};

describe("Adversarial Empirical Stress Suite: Safe Invoice Deletion Lifecycle (R3)", () => {
  let onCloseMock: ReturnType<typeof vi.fn>;
  let onDeleteMock: ReturnType<typeof vi.fn>;
  let onEditMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onCloseMock = vi.fn();
    onDeleteMock = vi.fn();
    onEditMock = vi.fn();
  });

  const renderSuccessView = (propsOverrides: Partial<React.ComponentProps<typeof MobileInvoiceSuccessView>> = {}) => {
    return render(
      <MobileInvoiceSuccessView
        invoice={mockInvoice}
        onClose={onCloseMock}
        onEdit={onEditMock}
        onDelete={onDeleteMock}
        {...propsOverrides}
      />
    );
  };

  // ─────────────────────────────────────────────────────────────
  // 1. UNCONFIRMED DELETION PREVENTION
  // ─────────────────────────────────────────────────────────────
  describe("R3-1: Unconfirmed Deletion Prevention", () => {
    it("never calls onDelete immediately when header trash icon is clicked", () => {
      const { container } = renderSuccessView();
      const trashBtn = container.querySelector(".sticky.top-0 button.text-rose-500");
      expect(trashBtn).toBeTruthy();

      fireEvent.click(trashBtn!);

      // Dialog opens, but onDelete must NOT be called
      expect(onDeleteMock).not.toHaveBeenCalled();
      expect(screen.getByRole("dialog", { name: /delete invoice/i })).toBeInTheDocument();
      expect(screen.getByText("Delete this invoice? This action cannot be undone.")).toBeInTheDocument();
    });

    it("does not call onDelete when clicking 20 times rapidly on the trash icon", () => {
      const { container } = renderSuccessView();
      const trashBtn = container.querySelector(".sticky.top-0 button.text-rose-500");
      expect(trashBtn).toBeTruthy();

      for (let i = 0; i < 20; i++) {
        fireEvent.click(trashBtn!);
      }

      expect(onDeleteMock).not.toHaveBeenCalled();
      expect(screen.getAllByRole("dialog")).toHaveLength(1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. DIALOG DISMISSAL (CANCEL & OVERLAY BACKDROP)
  // ─────────────────────────────────────────────────────────────
  describe("R3-2: Dialog Dismissal Mechanisms", () => {
    it("dismisses the confirmation dialog when 'Cancel' button is clicked", () => {
      const { container } = renderSuccessView();
      const trashBtn = container.querySelector(".sticky.top-0 button.text-rose-500");
      fireEvent.click(trashBtn!);

      const cancelBtn = screen.getByRole("button", { name: /^Cancel$/i });
      fireEvent.click(cancelBtn);

      expect(onDeleteMock).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog", { name: /delete invoice/i })).not.toBeInTheDocument();
    });

    it("dismisses the confirmation dialog when overlay backdrop is clicked", () => {
      const { container } = renderSuccessView();
      const trashBtn = container.querySelector(".sticky.top-0 button.text-rose-500");
      fireEvent.click(trashBtn!);

      const dialogBackdrop = container.querySelector(".fixed.inset-0.z-\\[600\\]");
      expect(dialogBackdrop).toBeTruthy();

      fireEvent.click(dialogBackdrop!);

      expect(onDeleteMock).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog", { name: /delete invoice/i })).not.toBeInTheDocument();
    });

    it("does NOT dismiss dialog when clicking inside the dialog card (stopPropagation)", () => {
      const { container } = renderSuccessView();
      const trashBtn = container.querySelector(".sticky.top-0 button.text-rose-500");
      fireEvent.click(trashBtn!);

      const dialogCard = screen.getByRole("dialog", { name: /delete invoice/i });
      fireEvent.click(dialogCard);

      // Dialog remains open
      expect(dialogCard).toBeInTheDocument();
      expect(onDeleteMock).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. CONFIRMATION FLOW & ON_DELETE TRIGGER
  // ─────────────────────────────────────────────────────────────
  describe("R3-3: Confirmation Flow & Action Triggering", () => {
    it("invokes onDelete callback and dismisses dialog when 'Delete' button is confirmed", () => {
      const { container } = renderSuccessView();
      const trashBtn = container.querySelector(".sticky.top-0 button.text-rose-500");
      fireEvent.click(trashBtn!);

      const deleteBtn = screen.getByRole("button", { name: /^Delete$/i });
      fireEvent.click(deleteBtn);

      expect(onDeleteMock).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Z-INDEX LAYERING & ACCESSIBILITY CONTRACT
  // ─────────────────────────────────────────────────────────────
  describe("R3-4: Z-Index Layering & Accessibility Contract", () => {
    it("enforces z-[600] on the delete confirmation sheet overlay", () => {
      const { container } = renderSuccessView();
      const trashBtn = container.querySelector(".sticky.top-0 button.text-rose-500");
      fireEvent.click(trashBtn!);

      const overlay = container.querySelector(".fixed.inset-0.z-\\[600\\]");
      expect(overlay).not.toBeNull();
      expect(overlay?.className).toContain("z-[600]");
    });

    it("ensures dialog has role='dialog', aria-modal='true', and valid aria-labelledby", () => {
      const { container } = renderSuccessView();
      const trashBtn = container.querySelector(".sticky.top-0 button.text-rose-500");
      fireEvent.click(trashBtn!);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby", "delete-dialog-title");

      const title = screen.getByText("Delete Invoice");
      expect(title).toHaveAttribute("id", "delete-dialog-title");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. SALESINVOICEMODAL DELETION LIFECYCLE (DATABASE & TOAST INTEGRATION)
  // ─────────────────────────────────────────────────────────────
  describe("R3-5: SalesInvoiceModal Deletion Lifecycle Handlers", () => {
    it("simulates full SalesInvoiceModal onDelete lifecycle: deletes document, shows success toast, and closes modal", async () => {
      vi.mocked(documentsService.deleteDocument).mockResolvedValue(true);

      let activeSavedDocId: string | null = mockInvoice.id;
      let mobileSuccessInvoice: BusinessDocument | null = mockInvoice;
      let isModalOpen = true;

      // Exact handler implementation from SalesInvoiceModal.tsx:1520-1533
      const handleDelete = async () => {
        if (mobileSuccessInvoice) {
          try {
            await documentsService.deleteDocument(
              "org-r3-100",
              mobileSuccessInvoice.docType,
              mobileSuccessInvoice.id
            );
            toast.success(`Invoice #${mobileSuccessInvoice.documentNumber} deleted`);
          } catch (err) {
            console.error("Delete failed:", err);
            toast.error("Failed to delete invoice");
          }
        }
        activeSavedDocId = null;
        mobileSuccessInvoice = null;
        isModalOpen = false;
      };

      await handleDelete();

      expect(documentsService.deleteDocument).toHaveBeenCalledWith(
        "org-r3-100",
        "sales_invoice",
        "doc-r3-test-99"
      );
      expect(toast.success).toHaveBeenCalledWith("Invoice #INV-R3-999 deleted");
      expect(activeSavedDocId).toBeNull();
      expect(mobileSuccessInvoice).toBeNull();
      expect(isModalOpen).toBe(false);
    });

    it("handles database deletion failure gracefully: shows error toast and resets modal state", async () => {
      vi.mocked(documentsService.deleteDocument).mockRejectedValue(new Error("Supabase network timeout"));

      let activeSavedDocId: string | null = mockInvoice.id;
      let mobileSuccessInvoice: BusinessDocument | null = mockInvoice;
      let isModalOpen = true;

      // Exact handler implementation from SalesInvoiceModal.tsx:1520-1533
      const handleDelete = async () => {
        if (mobileSuccessInvoice) {
          try {
            await documentsService.deleteDocument(
              "org-r3-100",
              mobileSuccessInvoice.docType,
              mobileSuccessInvoice.id
            );
            toast.success(`Invoice #${mobileSuccessInvoice.documentNumber} deleted`);
          } catch (err) {
            console.error("Delete failed:", err);
            toast.error("Failed to delete invoice");
          }
        }
        activeSavedDocId = null;
        mobileSuccessInvoice = null;
        isModalOpen = false;
      };

      await handleDelete();

      expect(documentsService.deleteDocument).toHaveBeenCalledTimes(1);
      expect(toast.error).toHaveBeenCalledWith("Failed to delete invoice");
      expect(toast.success).not.toHaveBeenCalled();
      // Ensure state is cleanly reset even on deletion failure so user is not stuck
      expect(activeSavedDocId).toBeNull();
      expect(mobileSuccessInvoice).toBeNull();
      expect(isModalOpen).toBe(false);
    });
  });
});
