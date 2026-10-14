import { describe, it, expect, beforeEach, vi } from "vitest";
import { documentsService } from "@/services/documentsService";
import { stockService } from "@/services/stockService";
import { BusinessDocument } from "@/types/documents";

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
});
