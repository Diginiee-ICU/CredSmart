import { describe, it, expect, beforeEach, vi } from "vitest";
import { documentsService } from "@/services/documentsService";
import { stockService } from "@/services/stockService";
import { BusinessDocument } from "@/types/documents";
import { calculatePaymentStatusAndBalance } from "@/utils/invoiceCalculations";

describe("Milestone 1: Core Billing Lifecycle Engine (R1 & R2)", () => {
  const orgId = "org_test_m1";

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(stockService, "handleDocumentStock").mockResolvedValue(undefined as any);
  });

  describe("R1: In-Place Update Lifecycle on Re-Edit (documentsService)", () => {
    const sampleDoc: Omit<BusinessDocument, "id"> & { id?: string } = {
      organizationId: orgId,
      docType: "sales_invoice",
      documentNumber: "INV/26-27/101",
      partyName: "Test Party Retailers",
      partyPhone: "9876543210",
      partyAddress: "123 Market St, Mumbai",
      docDate: "2026-10-14",
      items: [
        {
          id: "item-1",
          productName: "Parle-G 100g",
          quantity: 10,
          rate: 10,
          taxRate: 5,
          lineTotal: 105,
        },
      ],
      subtotal: 100,
      discountTotal: 0,
      taxableTotal: 100,
      cgstTotal: 2.5,
      sgstTotal: 2.5,
      igstTotal: 0,
      taxTotal: 5,
      roundOff: 0,
      grandTotal: 105,
      paidAmount: 105,
      balanceDue: 0,
      status: "paid",
      paymentMethod: "Cash",
      created_at: new Date().toISOString(),
    };

    it("assigns an ID on initial save and stores exactly 1 record in local cache", async () => {
      const saved = await documentsService.saveDocument(sampleDoc);

      expect(saved.id).toBeDefined();
      expect(typeof saved.id).toBe("string");
      expect(saved.id.length).toBeGreaterThan(0);

      const docs = documentsService.getLocalDocuments(orgId, "sales_invoice");
      expect(docs).toHaveLength(1);
      expect(docs[0].id).toBe(saved.id);
      expect(docs[0].grandTotal).toBe(105);
    });

    it("updates existing document in-place on re-save without creating duplicate records", async () => {
      // 1. Initial save
      const initialSaved = await documentsService.saveDocument(sampleDoc);
      expect(initialSaved.id).toBeDefined();

      let docs = documentsService.getLocalDocuments(orgId, "sales_invoice");
      expect(docs).toHaveLength(1);

      // 2. Modify items and total for re-save
      const updatedDocPayload: BusinessDocument = {
        ...initialSaved,
        items: [
          ...initialSaved.items,
          {
            id: "item-2",
            productName: "Britannia Marie Gold 200g",
            quantity: 5,
            rate: 30,
            taxRate: 5,
            lineTotal: 157.5,
          },
        ],
        subtotal: 250,
        taxableTotal: 250,
        taxTotal: 12.5,
        grandTotal: 262.5,
        paidAmount: 262.5,
      };

      const stockSpy = vi.spyOn(stockService, "handleDocumentStock").mockResolvedValue(undefined as any);

      // 3. Re-save with existing ID
      const secondSaved = await documentsService.saveDocument(updatedDocPayload);

      // ID must remain invariant
      expect(secondSaved.id).toBe(initialSaved.id);
      expect(secondSaved.grandTotal).toBe(262.5);
      expect(secondSaved.items).toHaveLength(2);

      // Local storage cache must still contain EXACTLY 1 document (no duplicates)
      docs = documentsService.getLocalDocuments(orgId, "sales_invoice");
      expect(docs).toHaveLength(1);
      expect(docs[0].id).toBe(initialSaved.id);
      expect(docs[0].documentNumber).toBe("INV/26-27/101");
      expect(docs[0].grandTotal).toBe(262.5);
      expect(docs[0].items).toHaveLength(2);
      expect(docs[0].updated_at).toBeDefined();

      // Stock service must be called with "update" and previousDoc reference
      expect(stockSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: initialSaved.id }),
        "update",
        expect.objectContaining({ id: initialSaved.id, grandTotal: 105 })
      );
    });

    it("handles re-save matching by documentNumber when id is retained", async () => {
      const initialSaved = await documentsService.saveDocument({
        ...sampleDoc,
        id: "doc_test_existing_uuid",
      });

      expect(initialSaved.id).toBe("doc_test_existing_uuid");

      const modifiedDoc = {
        ...initialSaved,
        partyName: "Updated Customer Enterprise",
        grandTotal: 500,
      };

      const resaved = await documentsService.saveDocument(modifiedDoc);
      expect(resaved.id).toBe("doc_test_existing_uuid");
      expect(resaved.partyName).toBe("Updated Customer Enterprise");

      const allDocs = documentsService.getLocalDocuments(orgId, "sales_invoice");
      expect(allDocs).toHaveLength(1);
      expect(allDocs[0].partyName).toBe("Updated Customer Enterprise");
    });
  });

  describe("R2: Sequence Increment Logic for Save & New", () => {
    const calculateNextSeq = (currentSeq: string): string => {
      const parsed = parseInt(currentSeq, 10);
      return !isNaN(parsed)
        ? String(parsed + 1).padStart(currentSeq.length, "0")
        : Math.floor(100 + Math.random() * 900).toString();
    };

    it("cleanly increments numeric sequence numbers", () => {
      expect(calculateNextSeq("101")).toBe("102");
      expect(calculateNextSeq("139")).toBe("140");
      expect(calculateNextSeq("999")).toBe("1000");
    });

    it("preserves leading zero padding during auto-increment", () => {
      expect(calculateNextSeq("001")).toBe("002");
      expect(calculateNextSeq("042")).toBe("043");
      expect(calculateNextSeq("0099")).toBe("0100");
    });

    it("falls back to random 3-digit sequence if non-numeric", () => {
      const fallback = calculateNextSeq("ABC");
      expect(Number(fallback)).toBeGreaterThanOrEqual(100);
      expect(Number(fallback)).toBeLessThan(1000);
    });
  });

  describe("R1: Default Sales Invoices to 'Paid' Status & Payment Calculations", () => {
    it("defaults retail sales invoices (Cash, UPI, Card, Net Banking, Cheque) to paid with zero balance due", () => {
      const methods = ["Cash", "UPI", "Card", "Net Banking", "Cheque"];

      for (const method of methods) {
        const result = calculatePaymentStatusAndBalance({
          grandTotal: 1500,
          paymentMethod: method,
          markAsFullyPaid: true,
          amountReceived: 0,
        });

        expect(result.status).toBe("paid");
        expect(result.paidAmount).toBe(1500);
        expect(result.balanceDue).toBe(0);
      }
    });

    it("defaults Credit payment method to unpaid with full balance due", () => {
      const result = calculatePaymentStatusAndBalance({
        grandTotal: 2500,
        paymentMethod: "Credit",
        markAsFullyPaid: false,
        amountReceived: 0,
      });

      expect(result.status).toBe("unpaid");
      expect(result.paidAmount).toBe(0);
      expect(result.balanceDue).toBe(2500);
    });

    it("handles explicit partial payments accurately", () => {
      const result = calculatePaymentStatusAndBalance({
        grandTotal: 1000,
        paymentMethod: "Cash",
        markAsFullyPaid: false,
        amountReceived: 400,
      });

      expect(result.status).toBe("partial");
      expect(result.paidAmount).toBe(400);
      expect(result.balanceDue).toBe(600);
    });

    it("handles explicit partial payment when markAsFullyPaid is omitted/undefined", () => {
      const result = calculatePaymentStatusAndBalance({
        grandTotal: 1000,
        paymentMethod: "Cash",
        amountReceived: 400,
      });

      expect(result.status).toBe("partial");
      expect(result.paidAmount).toBe(400);
      expect(result.balanceDue).toBe(600);
    });

    it("handles explicit zero payment on Cash when markAsFullyPaid is explicitly false", () => {
      const result = calculatePaymentStatusAndBalance({
        grandTotal: 1000,
        paymentMethod: "Cash",
        markAsFullyPaid: false,
        amountReceived: 0,
      });

      expect(result.status).toBe("unpaid");
      expect(result.paidAmount).toBe(0);
      expect(result.balanceDue).toBe(1000);
    });

    it("marks as paid when amount received equals or exceeds grand total even if markAsFullyPaid is false", () => {
      const result = calculatePaymentStatusAndBalance({
        grandTotal: 1000,
        paymentMethod: "UPI",
        markAsFullyPaid: false,
        amountReceived: 1000,
      });

      expect(result.status).toBe("paid");
      expect(result.paidAmount).toBe(1000);
      expect(result.balanceDue).toBe(0);
    });

    it("marks as paid when markAsFullyPaid is explicitly true even for Credit terms", () => {
      const result = calculatePaymentStatusAndBalance({
        grandTotal: 3000,
        paymentMethod: "Credit",
        markAsFullyPaid: true,
        amountReceived: 0,
      });

      expect(result.status).toBe("paid");
      expect(result.paidAmount).toBe(3000);
      expect(result.balanceDue).toBe(0);
    });

    it("defaults to paid for retail methods when markAsFullyPaid is omitted/undefined", () => {
      const result = calculatePaymentStatusAndBalance({
        grandTotal: 1200,
        paymentMethod: "Cash",
      });

      expect(result.status).toBe("paid");
      expect(result.paidAmount).toBe(1200);
      expect(result.balanceDue).toBe(0);
    });

    it("defaults to unpaid for Credit terms when markAsFullyPaid is omitted/undefined", () => {
      const result = calculatePaymentStatusAndBalance({
        grandTotal: 1200,
        paymentMethod: "Credit",
      });

      expect(result.status).toBe("unpaid");
      expect(result.paidAmount).toBe(0);
      expect(result.balanceDue).toBe(1200);
    });

    it("handles zero grand total gracefully as paid with zero balance", () => {
      const result = calculatePaymentStatusAndBalance({
        grandTotal: 0,
        paymentMethod: "Cash",
      });

      expect(result.status).toBe("paid");
      expect(result.paidAmount).toBe(0);
      expect(result.balanceDue).toBe(0);
    });

    it("persists sales invoice with default paid status and zero balance due in documentsService", async () => {
      const cashDoc: Omit<BusinessDocument, "id"> = {
        organizationId: orgId,
        docType: "sales_invoice",
        documentNumber: "INV-PAID-001",
        partyName: "Cash Walk-in Customer",
        docDate: "2026-10-21",
        items: [{ id: "it-1", productName: "Item One", quantity: 2, rate: 250, lineTotal: 500 }],
        subtotal: 500,
        discountTotal: 0,
        taxableTotal: 500,
        taxTotal: 0,
        grandTotal: 500,
        paidAmount: 500,
        balanceDue: 0,
        status: "paid",
        paymentMethod: "Cash",
        created_at: new Date().toISOString(),
      };

      const saved = await documentsService.saveDocument(cashDoc);
      expect(saved.id).toBeDefined();
      expect(saved.status).toBe("paid");
      expect(saved.paidAmount).toBe(500);
      expect(saved.balanceDue).toBe(0);

      const retrieved = documentsService.getLocalDocuments(orgId, "sales_invoice");
      const found = retrieved.find((d) => d.id === saved.id);
      expect(found).toBeDefined();
      expect(found?.status).toBe("paid");
      expect(found?.balanceDue).toBe(0);
    });
  });
});

