import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MobileInvoiceSuccessView } from "@/components/invoices/mobile/MobileInvoiceSuccessView";
import { documentsService } from "@/services/documentsService";
import { stockService } from "@/services/stockService";
import { BusinessDocument } from "@/types/documents";
import { toast } from "sonner";

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock PDF download to avoid canvas/jsPDF errors in jsdom
vi.mock("@/utils/downloadExactInvoice", () => ({
  downloadExactInvoicePdf: vi.fn(),
}));

const baseMockInvoice: BusinessDocument = {
  id: "inv-orig-100",
  organizationId: "org-challenger-m2",
  docType: "sales_invoice",
  documentNumber: "INV-140",
  partyName: "Test Party Pvt Ltd",
  partyPhone: "9876543210",
  partyGstin: "27AAPFU0939F1ZV",
  partyAddress: "123 Business Park, Mumbai",
  docDate: "2026-10-14",
  dueDate: "2026-10-21",
  items: [
    {
      id: "it-1",
      productName: "Premium Basmati Rice 5kg",
      quantity: 2,
      unit: "BAG",
      rate: 450,
      taxRate: 5,
      taxableAmount: 900,
      cgstAmount: 22.5,
      sgstAmount: 22.5,
      igstAmount: 0,
      lineTotal: 945,
    },
  ],
  subtotal: 900,
  taxableTotal: 900,
  cgstTotal: 22.5,
  sgstTotal: 22.5,
  igstTotal: 0,
  taxTotal: 45,
  grandTotal: 945,
  paidAmount: 945,
  balanceDue: 0,
  status: "paid",
  paymentMethod: "Cash",
  created_at: new Date().toISOString(),
};

describe("Milestone 2 Challenger 2 Empirical Stress Test Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.spyOn(stockService, "handleDocumentStock").mockResolvedValue(undefined as any);
  });

  // ─────────────────────────────────────────────────────────────
  // TASK 1.1: WHATSAPP URL ENCODING & EDGE CASE STRESS TESTS
  // ─────────────────────────────────────────────────────────────
  describe("1. WhatsApp Direct Sharing URL Generation & Encoding", () => {
    it("generates a valid URL for special characters and unicode in customer and store names", () => {
      const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);

      const specialInvoice: BusinessDocument = {
        ...baseMockInvoice,
        partyName: "M/S D'Souza & Sons (P) Ltd. <Special> #1 & % $ @ ! ? / \\",
      };

      const storeInfo = {
        name: "CredSmart & Partner's #1 Retail Hub — Café ☕",
      };

      render(
        <MobileInvoiceSuccessView
          invoice={specialInvoice}
          storeInfo={storeInfo}
          onClose={vi.fn()}
        />
      );

      // Open More Menu
      const moreBtn = screen.getByRole("button", { name: /More options/i });
      fireEvent.click(moreBtn);

      // Click WhatsApp option
      const whatsappBtn = screen.getByText(/Share via WhatsApp/i).closest("button");
      expect(whatsappBtn).toBeTruthy();
      fireEvent.click(whatsappBtn!);

      expect(windowOpenSpy).toHaveBeenCalledTimes(1);
      const urlString = windowOpenSpy.mock.calls[0][0] as string;

      // Verify URL is valid according to URL standard
      expect(() => new URL(urlString)).not.toThrow();
      const parsedUrl = new URL(urlString);
      expect(parsedUrl.hostname).toBe("wa.me");
      expect(parsedUrl.pathname).toBe("/919876543210");

      const textParam = parsedUrl.searchParams.get("text");
      expect(textParam).toBeTruthy();
      expect(textParam).toContain("CREDSMART & PARTNER'S #1 RETAIL HUB — CAFÉ ☕");
      expect(textParam).toContain("M/S D'Souza & Sons (P) Ltd. <Special> #1 & % $ @ ! ? / \\");
      expect(textParam).toContain("#INV-140");
      expect(textParam).toContain("₹945.00");

      windowOpenSpy.mockRestore();
    });

    it("formats invoice amounts with decimal fractions accurately in WhatsApp summary", () => {
      const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);

      const decimalInvoice: BusinessDocument = {
        ...baseMockInvoice,
        grandTotal: 1234.5,
      };

      render(
        <MobileInvoiceSuccessView
          invoice={decimalInvoice}
          onClose={vi.fn()}
        />
      );

      const moreBtn = screen.getByRole("button", { name: /More options/i });
      fireEvent.click(moreBtn);
      const whatsappBtn = screen.getByText(/Share via WhatsApp/i).closest("button");
      fireEvent.click(whatsappBtn!);

      const urlString = windowOpenSpy.mock.calls[0][0] as string;
      const parsedUrl = new URL(urlString);
      const textParam = parsedUrl.searchParams.get("text");

      // Verify minimumFractionDigits: 2 ensures two decimal places for 1234.5 -> ₹1,234.50
      expect(textParam).toContain("₹1,234.50");

      windowOpenSpy.mockRestore();
    });

    it("stress-tests phone number normalization matrix across edge cases", () => {
      const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);

      const testCases = [
        // [inputPhone, expectedPhoneParamInUrl, description]
        ["9876543210", "919876543210", "10-digit standard Indian mobile"],
        ["+91 98765 43210", "919876543210", "12-digit international format with +91 and spaces"],
        ["+91-98765-43210", "919876543210", "12-digit international format with hyphens"],
        ["919876543210", "919876543210", "12-digit already starting with 91"],
        ["09876543210", "09876543210", "11-digit starting with leading zero"],
        ["0", "", "single zero string"],
        ["12345", "", "short invalid number (<10 digits)"],
        ["invalid_phone_text", "", "non-digit string"],
        ["", "", "empty string"],
        [undefined, "", "undefined phone"],
      ];

      for (const [inputPhone, expectedPhoneParam, desc] of testCases) {
        windowOpenSpy.mockClear();

        const testInv: BusinessDocument = {
          ...baseMockInvoice,
          partyPhone: inputPhone as string | undefined,
        };

        const { unmount } = render(
          <MobileInvoiceSuccessView
            invoice={testInv}
            onClose={vi.fn()}
          />
        );

        const moreBtn = screen.getByRole("button", { name: /More options/i });
        fireEvent.click(moreBtn);
        const whatsappBtn = screen.getByText(/Share via WhatsApp/i).closest("button");
        fireEvent.click(whatsappBtn!);

        expect(windowOpenSpy).toHaveBeenCalledTimes(1);
        const urlString = windowOpenSpy.mock.calls[0][0] as string;

        // URL must be syntactically valid in all cases
        expect(() => new URL(urlString)).not.toThrow();
        const parsedUrl = new URL(urlString);

        if (expectedPhoneParam) {
          expect(parsedUrl.pathname, `Failed for case: ${desc}`).toBe(`/${expectedPhoneParam}`);
        } else {
          expect(parsedUrl.pathname, `Failed for case: ${desc}`).toBe("/");
        }

        unmount();
      }

      windowOpenSpy.mockRestore();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // TASK 1.2: DUPLICATE BILL SEQUENCE, PAYMENT RESET & OVERWRITE ISOLATION
  // ─────────────────────────────────────────────────────────────
  describe("2. Duplicate Bill: Sequence Advancement, Payment Reset & Isolation", () => {
    it("advances standard sequence numbers cleanly (e.g. INV-140 -> INV-141) and preserves zero-padding", () => {
      const advanceSeq = (seq: string) => {
        const parsed = parseInt(seq, 10);
        return !isNaN(parsed)
          ? String(parsed + 1).padStart(seq.length, "0")
          : Math.floor(100 + Math.random() * 900).toString();
      };

      expect(advanceSeq("140")).toBe("141");
      expect(advanceSeq("0042")).toBe("0043");
      expect(advanceSeq("0099")).toBe("0100");
      expect(advanceSeq("999")).toBe("1000");
      expect(advanceSeq("1")).toBe("2");
      expect(advanceSeq("0001")).toBe("0002");
    });

    it("verifies duplicate bill lifecycle for a bill created from scratch: creates a distinct record and resets payments", async () => {
      const orgId = "org-dup-test-1";

      // 1. Initial Document Save (Bill 1)
      const bill1Payload: BusinessDocument = {
        ...baseMockInvoice,
        id: "doc-orig-140",
        organizationId: orgId,
        documentNumber: "INV-140",
        paidAmount: 945,
        balanceDue: 0,
        status: "paid",
      };

      const savedBill1 = await documentsService.saveDocument(bill1Payload);
      expect(savedBill1.id).toBe("doc-orig-140");

      let localDocs = documentsService.getLocalDocuments(orgId, "sales_invoice");
      expect(localDocs).toHaveLength(1);
      expect(localDocs[0].documentNumber).toBe("INV-140");

      // 2. Emulate onDuplicate handler execution from SalesInvoiceModal.tsx:1534-1546
      let activeSavedDocId: string | null = savedBill1.id;
      let invoiceNumberSeq = "140";
      let amountReceived = 945;
      let markAsFullyPaid = true;
      let mobileSuccessInvoice: BusinessDocument | null = savedBill1;

      // Duplicate Action Triggered
      activeSavedDocId = null; // Clears active doc ID
      const parsed = parseInt(invoiceNumberSeq, 10);
      const nextSeq = !isNaN(parsed)
        ? String(parsed + 1).padStart(invoiceNumberSeq.length, "0")
        : "101";
      invoiceNumberSeq = nextSeq;
      amountReceived = 0; // Payment reset
      markAsFullyPaid = false; // Status reset
      mobileSuccessInvoice = null;

      expect(nextSeq).toBe("141");
      expect(amountReceived).toBe(0);
      expect(markAsFullyPaid).toBe(false);
      expect(activeSavedDocId).toBeNull();

      // 3. Emulate saving the duplicated bill (Bill 2)
      // When editingDoc is null, currentDocId = activeSavedDocId || undefined => undefined
      const bill2Payload: Omit<BusinessDocument, "id"> & { id?: string } = {
        ...savedBill1,
        id: activeSavedDocId || undefined,
        documentNumber: `INV-${nextSeq}`,
        paidAmount: amountReceived,
        balanceDue: savedBill1.grandTotal,
        status: "unpaid",
      };

      const savedBill2 = await documentsService.saveDocument(bill2Payload);

      // Verify Bill 2 has a distinct ID
      expect(savedBill2.id).toBeDefined();
      expect(savedBill2.id).not.toBe(savedBill1.id);
      expect(savedBill2.documentNumber).toBe("INV-141");
      expect(savedBill2.status).toBe("unpaid");
      expect(savedBill2.paidAmount).toBe(0);

      // Verify Original Bill 1 was NOT overwritten
      localDocs = documentsService.getLocalDocuments(orgId, "sales_invoice");
      expect(localDocs).toHaveLength(2);

      const bill1FromStorage = localDocs.find((d) => d.id === "doc-orig-140");
      expect(bill1FromStorage).toBeDefined();
      expect(bill1FromStorage?.documentNumber).toBe("INV-140");
      expect(bill1FromStorage?.status).toBe("paid");
      expect(bill1FromStorage?.paidAmount).toBe(945);
    });

    it("critically evaluates Duplicate Bill when editingDoc prop is present: detects potential overwrite collision", () => {
      // Trace what happens in SalesInvoiceModal.tsx:1053 when editingDoc prop is passed:
      const editingDocProp: BusinessDocument = {
        ...baseMockInvoice,
        id: "existing-sale-doc-99",
        documentNumber: "INV-140",
      };

      let activeSavedDocId: string | null = editingDocProp.id;

      // Duplicate is tapped:
      activeSavedDocId = null;

      // Now handleSave is called. Look at line 1053:
      // const currentDocId = activeSavedDocId || editingDoc?.id || undefined;
      const currentDocId = activeSavedDocId || editingDocProp?.id || undefined;

      // If activeSavedDocId is null, currentDocId evaluates to editingDocProp.id!
      expect(currentDocId).toBe("existing-sale-doc-99");

      // This confirms that if editingDoc prop is passed, currentDocId falls back to editingDoc.id,
      // which would update the original document instead of creating a new one!
    });
  });

  // ─────────────────────────────────────────────────────────────
  // TASK 1.3: VOID INVOICE STATUS & PERSISTENCE IN DOCUMENTSSERVICE
  // ─────────────────────────────────────────────────────────────
  describe("3. Void Invoice: Cancelled Status & documentsService Persistence", () => {
    it("marks invoice status as 'cancelled' and persists correctly in documentsService", async () => {
      const orgId = "org-void-test";

      // 1. Initial Save
      const invoiceToVoid: BusinessDocument = {
        ...baseMockInvoice,
        id: "doc-to-void-77",
        organizationId: orgId,
        documentNumber: "INV-2026-0077",
        status: "paid",
      };

      await documentsService.saveDocument(invoiceToVoid);
      let storedDocs = documentsService.getLocalDocuments(orgId, "sales_invoice");
      expect(storedDocs).toHaveLength(1);
      expect(storedDocs[0].status).toBe("paid");

      // 2. Emulate onVoid handler in SalesInvoiceModal.tsx:1547-1563
      let mobileSuccessInvoice: BusinessDocument | null = invoiceToVoid;

      const handleVoid = async () => {
        if (!mobileSuccessInvoice) return;
        try {
          const voidedDoc: BusinessDocument = {
            ...mobileSuccessInvoice,
            status: "cancelled",
          };
          await documentsService.saveDocument(voidedDoc, "user-test");
          mobileSuccessInvoice = voidedDoc;
          toast.success(`Invoice #${mobileSuccessInvoice.documentNumber} marked as Cancelled`);
        } catch (err) {
          console.error("Void failed:", err);
          toast.error("Failed to cancel invoice");
        }
      };

      await handleVoid();

      // 3. Verification: Status is cancelled in state
      expect(mobileSuccessInvoice).not.toBeNull();
      expect(mobileSuccessInvoice!.status).toBe("cancelled");
      expect(toast.success).toHaveBeenCalledWith("Invoice #INV-2026-0077 marked as Cancelled");

      // 4. Verification: Persisted in documentsService cache
      storedDocs = documentsService.getLocalDocuments(orgId, "sales_invoice");
      expect(storedDocs).toHaveLength(1);
      expect(storedDocs[0].id).toBe("doc-to-void-77");
      expect(storedDocs[0].status).toBe("cancelled");
    });

    it("renders the 'Cancelled' badge on MobileInvoiceSuccessView when invoice status is cancelled", () => {
      const cancelledInvoice: BusinessDocument = {
        ...baseMockInvoice,
        status: "cancelled",
      };

      render(
        <MobileInvoiceSuccessView
          invoice={cancelledInvoice}
          onClose={vi.fn()}
        />
      );

      const cancelledBadge = screen.getByText(/^Cancelled$/i);
      expect(cancelledBadge).toBeInTheDocument();
      expect(cancelledBadge.className).toMatch(/text-slate-600/);
      expect(cancelledBadge.className).toMatch(/bg-slate-100/);
    });

    it("triggers onVoid callback when Void option in More Menu is clicked", () => {
      const onVoidMock = vi.fn();

      render(
        <MobileInvoiceSuccessView
          invoice={baseMockInvoice}
          onClose={vi.fn()}
          onVoid={onVoidMock}
        />
      );

      const moreBtn = screen.getByRole("button", { name: /More options/i });
      fireEvent.click(moreBtn);

      const voidBtn = screen.getByText(/Cancel \/ Void Invoice/i).closest("button");
      expect(voidBtn).toBeTruthy();
      fireEvent.click(voidBtn!);

      expect(onVoidMock).toHaveBeenCalledTimes(1);
    });
  });
});
