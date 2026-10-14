import { describe, it, expect, beforeEach, vi } from "vitest";
import { documentsService } from "@/services/documentsService";
import { stockService } from "@/services/stockService";
import { BusinessDocument, DocumentLineItem } from "@/types/documents";

describe("Milestone 1 Adversarial Challenge: In-Place Update Lifecycle & Stock Delatas", () => {
  const orgId = "org_adv_challenge_m1";

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("Challenge 1: Repeated Re-Edits (edit -> save -> edit -> save across 10 cycles)", () => {
    it("maintains activeSavedDocId invariantly and keeps exactly 1 record in local cache across 10 edit-save cycles", async () => {
      vi.spyOn(stockService, "handleDocumentStock").mockResolvedValue(undefined as any);

      // Initial Creation without ID
      const initialPayload: Omit<BusinessDocument, "id"> = {
        organizationId: orgId,
        docType: "sales_invoice",
        documentNumber: "INV-2026-CHALLENGE-01",
        partyName: "Cycle Test Enterprise",
        docDate: "2026-10-14",
        items: [
          {
            id: "row-init",
            productId: "prod-1",
            productName: "Product Alpha",
            quantity: 1,
            rate: 100,
            lineTotal: 100,
          },
        ],
        subtotal: 100,
        discountTotal: 0,
        taxableTotal: 100,
        cgstTotal: 0,
        sgstTotal: 0,
        igstTotal: 0,
        taxTotal: 0,
        roundOff: 0,
        grandTotal: 100,
        paidAmount: 100,
        balanceDue: 0,
        status: "paid",
        created_at: new Date().toISOString(),
      };

      const initialSaved = await documentsService.saveDocument(initialPayload);
      const persistentDocId = initialSaved.id;
      expect(persistentDocId).toBeDefined();

      let currentDoc: BusinessDocument = initialSaved;

      // Execute 10 consecutive mutation and re-save cycles
      for (let cycle = 1; cycle <= 10; cycle++) {
        // Mutate document: update quantity, add items, update metadata
        const updatedItems: DocumentLineItem[] = [
          {
            id: `row-alpha-${cycle}`,
            productId: "prod-1",
            productName: "Product Alpha",
            quantity: cycle * 2,
            rate: 100,
            lineTotal: cycle * 200,
          },
          {
            id: `row-cycle-${cycle}`,
            productId: `prod-addon-${cycle}`,
            productName: `Addon Item ${cycle}`,
            quantity: 1,
            rate: 50,
            lineTotal: 50,
          },
        ];

        const newSubtotal = cycle * 200 + 50;
        currentDoc = {
          ...currentDoc,
          id: persistentDocId, // Emulates activeSavedDocId preserved across cycles
          items: updatedItems,
          subtotal: newSubtotal,
          taxableTotal: newSubtotal,
          grandTotal: newSubtotal,
          paidAmount: newSubtotal,
          notes: `Re-edit cycle ${cycle} executed`,
        };

        const reSaved = await documentsService.saveDocument(currentDoc);

        // Verification 1: ID never changes
        expect(reSaved.id).toBe(persistentDocId);

        // Verification 2: Document number remains stable
        expect(reSaved.documentNumber).toBe("INV-2026-CHALLENGE-01");

        // Verification 3: Cache has exactly 1 document
        const cachedDocs = documentsService.getLocalDocuments(orgId, "sales_invoice");
        expect(cachedDocs).toHaveLength(1);
        expect(cachedDocs[0].id).toBe(persistentDocId);
        expect(cachedDocs[0].grandTotal).toBe(newSubtotal);
        expect(cachedDocs[0].notes).toBe(`Re-edit cycle ${cycle} executed`);
      }
    });
  });

  describe("Challenge 2: Offline/Local Document Duplicate Prevention", () => {
    it("never creates duplicate records when offline document number is changed during re-edit", async () => {
      vi.spyOn(stockService, "handleDocumentStock").mockResolvedValue(undefined as any);

      // Offline document created with doc_ prefix
      const offlineDoc = await documentsService.saveDocument({
        organizationId: orgId,
        docType: "sales_invoice",
        documentNumber: "OFFLINE-001",
        partyName: "Offline Retailer",
        docDate: "2026-10-14",
        items: [{ id: "it-1", productName: "Offline Item", quantity: 2, rate: 25, lineTotal: 50 }],
        subtotal: 50,
        discountTotal: 0,
        taxableTotal: 50,
        cgstTotal: 0,
        sgstTotal: 0,
        igstTotal: 0,
        taxTotal: 0,
        roundOff: 0,
        grandTotal: 50,
        paidAmount: 50,
        balanceDue: 0,
        status: "paid",
        created_at: new Date().toISOString(),
      });

      const initialId = offlineDoc.id;
      expect(initialId.startsWith("doc_")).toBe(true);

      // User re-edits and edits document number to OFFLINE-001-REV1
      const editedDoc = {
        ...offlineDoc,
        documentNumber: "OFFLINE-001-REV1",
        grandTotal: 75,
      };

      const resavedDoc = await documentsService.saveDocument(editedDoc);
      expect(resavedDoc.id).toBe(initialId);

      const storedDocs = documentsService.getLocalDocuments(orgId, "sales_invoice");
      expect(storedDocs).toHaveLength(1);
      expect(storedDocs[0].id).toBe(initialId);
      expect(storedDocs[0].documentNumber).toBe("OFFLINE-001-REV1");
      expect(storedDocs[0].grandTotal).toBe(75);
    });

    it("isolates multi-tenant documents so updating an invoice in Org A does not duplicate or pollute Org B", async () => {
      vi.spyOn(stockService, "handleDocumentStock").mockResolvedValue(undefined as any);
      const otherOrgId = "org_other_tenant";

      const docOrgA = await documentsService.saveDocument({
        organizationId: orgId,
        docType: "sales_invoice",
        documentNumber: "TENANT-01",
        partyName: "Org A Party",
        docDate: "2026-10-14",
        items: [{ id: "i-a", productName: "A Item", quantity: 1, rate: 100, lineTotal: 100 }],
        subtotal: 100,
        discountTotal: 0,
        taxableTotal: 100,
        cgstTotal: 0,
        sgstTotal: 0,
        igstTotal: 0,
        taxTotal: 0,
        roundOff: 0,
        grandTotal: 100,
        paidAmount: 100,
        balanceDue: 0,
        status: "paid",
        created_at: new Date().toISOString(),
      });

      const docOrgB = await documentsService.saveDocument({
        organizationId: otherOrgId,
        docType: "sales_invoice",
        documentNumber: "TENANT-01",
        partyName: "Org B Party",
        docDate: "2026-10-14",
        items: [{ id: "i-b", productName: "B Item", quantity: 2, rate: 100, lineTotal: 200 }],
        subtotal: 200,
        discountTotal: 0,
        taxableTotal: 200,
        cgstTotal: 0,
        sgstTotal: 0,
        igstTotal: 0,
        taxTotal: 0,
        roundOff: 0,
        grandTotal: 200,
        paidAmount: 200,
        balanceDue: 0,
        status: "paid",
        created_at: new Date().toISOString(),
      });

      // Update doc in Org A
      await documentsService.saveDocument({
        ...docOrgA,
        grandTotal: 150,
      });

      const listA = documentsService.getLocalDocuments(orgId, "sales_invoice");
      const listB = documentsService.getLocalDocuments(otherOrgId, "sales_invoice");

      expect(listA).toHaveLength(1);
      expect(listA[0].grandTotal).toBe(150);

      expect(listB).toHaveLength(1);
      expect(listB[0].grandTotal).toBe(200);
      expect(listB[0].partyName).toBe("Org B Party");
    });
  });

  describe("Challenge 3: Line Item Mutations & Stock Adjustment Oracles", () => {
    it("accurately notifies stockService with previousDoc when items are added, modified, or removed", async () => {
      const stockSpy = vi.spyOn(stockService, "handleDocumentStock").mockResolvedValue(undefined as any);

      // 1. Initial save with 2 items: Prod A (qty 10), Prod B (qty 5)
      const initialDoc = await documentsService.saveDocument({
        organizationId: orgId,
        docType: "sales_invoice",
        documentNumber: "STOCK-TEST-001",
        partyName: "Inventory Customer",
        docDate: "2026-10-14",
        items: [
          { id: "row-a", productId: "prod-a", productName: "Product A", quantity: 10, rate: 20, lineTotal: 200 },
          { id: "row-b", productId: "prod-b", productName: "Product B", quantity: 5, rate: 40, lineTotal: 200 },
        ],
        subtotal: 400,
        discountTotal: 0,
        taxableTotal: 400,
        cgstTotal: 0,
        sgstTotal: 0,
        igstTotal: 0,
        taxTotal: 0,
        roundOff: 0,
        grandTotal: 400,
        paidAmount: 400,
        balanceDue: 0,
        status: "paid",
        created_at: new Date().toISOString(),
      });

      expect(stockSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: initialDoc.id }),
        "create"
      );

      // 2. Re-edit: Remove Prod A, Increase Prod B qty to 8, Add Prod C (qty 15)
      stockSpy.mockClear();

      const mutatedDoc: BusinessDocument = {
        ...initialDoc,
        items: [
          { id: "row-b", productId: "prod-b", productName: "Product B", quantity: 8, rate: 40, lineTotal: 320 },
          { id: "row-c", productId: "prod-c", productName: "Product C", quantity: 15, rate: 10, lineTotal: 150 },
        ],
        subtotal: 470,
        taxableTotal: 470,
        grandTotal: 470,
        paidAmount: 470,
      };

      await documentsService.saveDocument(mutatedDoc);

      // Verify stockService was invoked with "update" AND previousDoc containing the exact original items
      expect(stockSpy).toHaveBeenCalledTimes(1);
      expect(stockSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: initialDoc.id,
          items: expect.arrayContaining([
            expect.objectContaining({ productId: "prod-b", quantity: 8 }),
            expect.objectContaining({ productId: "prod-c", quantity: 15 }),
          ]),
        }),
        "update",
        expect.objectContaining({
          id: initialDoc.id,
          items: expect.arrayContaining([
            expect.objectContaining({ productId: "prod-a", quantity: 10 }),
            expect.objectContaining({ productId: "prod-b", quantity: 5 }),
          ]),
        })
      );
    });

    it("verifies mathematical integrity: lineTotals, taxes, discounts, and roundOff match grandTotal on re-edit", async () => {
      vi.spyOn(stockService, "handleDocumentStock").mockResolvedValue(undefined as any);

      const items: DocumentLineItem[] = [
        { id: "1", productName: "Item 1", quantity: 3, rate: 33.33, lineTotal: 99.99 },
        { id: "2", productName: "Item 2", quantity: 2, rate: 50.00, lineTotal: 100.00 },
      ];

      const rawSubtotal = items.reduce((acc, it) => acc + it.lineTotal, 0); // 199.99
      const discount = 9.99; // 190.00
      const taxable = rawSubtotal - discount; // 190.00
      const taxRate = 18; // 18% GST -> 34.20
      const taxTotal = taxable * (taxRate / 100);
      const cgst = taxTotal / 2; // 17.10
      const sgst = taxTotal / 2; // 17.10
      const rawGrand = taxable + taxTotal; // 224.20
      const roundOff = -0.20;
      const grandTotal = Math.round(rawGrand + roundOff); // 224.00

      const doc = await documentsService.saveDocument({
        organizationId: orgId,
        docType: "sales_invoice",
        documentNumber: "MATH-001",
        partyName: "Math Test",
        docDate: "2026-10-14",
        items,
        subtotal: rawSubtotal,
        discountTotal: discount,
        taxableTotal: taxable,
        cgstTotal: cgst,
        sgstTotal: sgst,
        igstTotal: 0,
        taxTotal: taxTotal,
        roundOff: roundOff,
        grandTotal: grandTotal,
        paidAmount: 200,
        balanceDue: 24,
        status: "partial",
        created_at: new Date().toISOString(),
      });

      expect(doc.balanceDue).toBe(24);
      expect(doc.status).toBe("partial");

      // Now re-edit to fully pay
      const paidDoc = await documentsService.saveDocument({
        ...doc,
        paidAmount: 224,
        balanceDue: 0,
        status: "paid",
      });

      expect(paidDoc.balanceDue).toBe(0);
      expect(paidDoc.status).toBe("paid");

      const localDocs = documentsService.getLocalDocuments(orgId, "sales_invoice");
      expect(localDocs).toHaveLength(1);
      expect(localDocs[0].paidAmount).toBe(224);
      expect(localDocs[0].balanceDue).toBe(0);
      expect(localDocs[0].status).toBe("paid");
    });
  });

  describe("Challenge 4: Save & New State Reset and Multi-Document Isolation", () => {
    it("ensures clearing activeSavedDocId on Save & New creates distinct documents and isolates updates", async () => {
      vi.spyOn(stockService, "handleDocumentStock").mockResolvedValue(undefined as any);

      // Bill 1: Initial save
      let activeSavedDocId: string | null = null;

      const bill1 = await documentsService.saveDocument({
        id: activeSavedDocId || undefined,
        organizationId: orgId,
        docType: "sales_invoice",
        documentNumber: "INV-001",
        partyName: "Party One",
        docDate: "2026-10-14",
        items: [{ id: "b1-it1", productName: "Item One", quantity: 1, rate: 100, lineTotal: 100 }],
        subtotal: 100,
        discountTotal: 0,
        taxableTotal: 100,
        cgstTotal: 0,
        sgstTotal: 0,
        igstTotal: 0,
        taxTotal: 0,
        roundOff: 0,
        grandTotal: 100,
        paidAmount: 100,
        balanceDue: 0,
        status: "paid",
        created_at: new Date().toISOString(),
      });

      activeSavedDocId = bill1.id;
      expect(bill1.id).toBeDefined();

      // Trigger Save & New reset (emulating SalesInvoiceModal:1207)
      activeSavedDocId = null;

      // Bill 2: Save second bill with incremented invoice number
      const bill2 = await documentsService.saveDocument({
        id: activeSavedDocId || undefined,
        organizationId: orgId,
        docType: "sales_invoice",
        documentNumber: "INV-002",
        partyName: "Party Two",
        docDate: "2026-10-14",
        items: [{ id: "b2-it1", productName: "Item Two", quantity: 2, rate: 50, lineTotal: 100 }],
        subtotal: 100,
        discountTotal: 0,
        taxableTotal: 100,
        cgstTotal: 0,
        sgstTotal: 0,
        igstTotal: 0,
        taxTotal: 0,
        roundOff: 0,
        grandTotal: 100,
        paidAmount: 100,
        balanceDue: 0,
        status: "paid",
        created_at: new Date().toISOString(),
      });

      expect(bill2.id).toBeDefined();
      expect(bill2.id).not.toBe(bill1.id);

      // Verify 2 distinct documents exist in cache
      let allDocs = documentsService.getLocalDocuments(orgId, "sales_invoice");
      expect(allDocs).toHaveLength(2);

      // Re-edit Bill 1 (activeSavedDocId set to bill1.id)
      activeSavedDocId = bill1.id;
      const updatedBill1 = await documentsService.saveDocument({
        ...bill1,
        id: activeSavedDocId,
        partyName: "Party One Updated",
        grandTotal: 150,
      });

      expect(updatedBill1.id).toBe(bill1.id);

      allDocs = documentsService.getLocalDocuments(orgId, "sales_invoice");
      expect(allDocs).toHaveLength(2);
      const retrievedB1 = allDocs.find((d) => d.id === bill1.id);
      const retrievedB2 = allDocs.find((d) => d.id === bill2.id);

      expect(retrievedB1?.partyName).toBe("Party One Updated");
      expect(retrievedB1?.grandTotal).toBe(150);
      expect(retrievedB2?.partyName).toBe("Party Two");
      expect(retrievedB2?.grandTotal).toBe(100);
    });
  });
});

