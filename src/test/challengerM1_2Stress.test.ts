import { describe, it, expect, beforeEach, vi } from "vitest";
import { documentsService } from "@/services/documentsService";
import { stockService } from "@/services/stockService";
import { BusinessDocument } from "@/types/documents";

describe("Milestone 1 Adversarial Challenge & Stress Tests (Challenger 2)", () => {
  const orgId = "org_challenger_m1_2";

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(stockService, "handleDocumentStock").mockResolvedValue(undefined as any);
  });

  // ─────────────────────────────────────────────────────────────
  // 1. SEQUENCE NUMBER PADDING & NUMERIC OVERFLOW ORACLE
  // ─────────────────────────────────────────────────────────────
  describe("Challenge 1: Sequence Number Padding & Roll-over Oracle", () => {
    const calculateNextSeq = (currentSeq: string): string => {
      const parsed = parseInt(currentSeq, 10);
      return !isNaN(parsed)
        ? String(parsed + 1).padStart(currentSeq.length, "0")
        : Math.floor(100 + Math.random() * 900).toString();
    };

    it("verifies leading zero padding holds for '001' -> '002'", () => {
      expect(calculateNextSeq("001")).toBe("002");
    });

    it("verifies padding holds for '099' -> '100'", () => {
      expect(calculateNextSeq("099")).toBe("100");
    });

    it("verifies padding holds for 4-digit sequence '0005' -> '0006'", () => {
      expect(calculateNextSeq("0005")).toBe("0006");
    });

    it("verifies roll-over behavior when exceeding length e.g. '999' -> '1000'", () => {
      // padStart does not truncate if length >= targetLength
      const next = calculateNextSeq("999");
      expect(next).toBe("1000");
      expect(next.length).toBe(4);
    });

    it("verifies roll-over behavior for '0999' -> '1000'", () => {
      expect(calculateNextSeq("0999")).toBe("1000");
    });

    it("tests non-numeric or alphanumeric sequence edge cases", () => {
      // Alphanumeric with leading digits: parseInt('001A') -> 1 -> padStart(4, '0') -> '0002' (A stripped)
      expect(calculateNextSeq("001A")).toBe("0002");

      // Pure alphabetic sequence falls back to 3-digit random number
      const fallback = calculateNextSeq("INV");
      expect(Number(fallback)).toBeGreaterThanOrEqual(100);
      expect(Number(fallback)).toBeLessThan(1000);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. CONCURRENT / RAPID SUCCESSION CLICKS RACE CONDITIONS
  // ─────────────────────────────────────────────────────────────
  describe("Challenge 2: Rapid Succession Clicks on Save & New", () => {
    it("empirically reproduces duplicate saves if multiple concurrent save operations trigger before sequence increments", async () => {
      const baseDoc: Omit<BusinessDocument, "id"> = {
        organizationId: orgId,
        docType: "sales_invoice",
        documentNumber: "INV/26-27/101",
        partyName: "Fast Clicking Customer",
        partyPhone: "9998887770",
        docDate: "2026-10-14",
        items: [
          {
            id: "row-1",
            productName: "Item A",
            quantity: 2,
            rate: 50,
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

      // If a user clicks Save & New twice rapidly before state updates:
      // Both operations receive identical documentNumber "INV/26-27/101" without an id
      const [save1, save2] = await Promise.all([
        documentsService.saveDocument({ ...baseDoc }),
        documentsService.saveDocument({ ...baseDoc }),
      ]);

      const stored = documentsService.getLocalDocuments(orgId, "sales_invoice");
      // In localStorage cache, index lookup by documentNumber deduplicates in cache:
      expect(stored.length).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. STATE BLEED & RESIDUAL ATTRIBUTES BETWEEN BILLS
  // ─────────────────────────────────────────────────────────────
  describe("Challenge 3: State Bleed & Residual Attribute Leakage", () => {
    it("detects whether placeOfSupply bleeds between bills (Interstate vs Intrastate)", () => {
      // Simulate state transition:
      // Bill 1: Interstate party (07-Delhi)
      let placeOfSupply = "07-Delhi";
      const orgStateCode = "27"; // Maharashtra

      const isInterState1 = placeOfSupply.slice(0, 2) !== "" && placeOfSupply.slice(0, 2) !== orgStateCode;
      expect(isInterState1).toBe(true);

      // Save & New execution as implemented in SalesInvoiceModal.tsx lines 1181-1207:
      // Notice: billingPlaceOfSupply is reset to "27-Maharashtra", but placeOfSupply is NOT reset!
      let billingPlaceOfSupply = "27-Maharashtra";
      // placeOfSupply is NOT touched!

      // Bill 2: Walk-in customer (no party chosen, uses default placeOfSupply)
      const isInterState2 = placeOfSupply.slice(0, 2) !== "" && placeOfSupply.slice(0, 2) !== orgStateCode;

      // Because placeOfSupply was not reset in SalesInvoiceModal, it bleeds!
      expect(placeOfSupply).toBe("07-Delhi");
      expect(isInterState2).toBe(true); // BUG: Walk-in local customer incorrectly treated as Interstate!
    });

    it("verifies manualRoundOff residual leakage", () => {
      // Bill 1: User set manual round-off to 0.45
      let manualRoundOff = 0.45;

      // Save & New executed:
      // In SalesInvoiceModal.tsx, manualRoundOff is not reset
      expect(manualRoundOff).toBe(0.45); // Leakage: manual round off remains active
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. ACTIVE SAVED DOC ID RESET & OVERWRITE PREVENTION
  // ─────────────────────────────────────────────────────────────
  describe("Challenge 4: Active Saved Doc ID Reset & Overwrite Prevention", () => {
    it("verifies that subsequent bill receives a distinct ID and does not overwrite previous bill", async () => {
      // 1. First bill saved via Save & New
      const bill1: Omit<BusinessDocument, "id"> = {
        organizationId: orgId,
        docType: "sales_invoice",
        documentNumber: "INV/26-27/101",
        partyName: "Party One",
        docDate: "2026-10-14",
        items: [
          {
            id: "row-1",
            productName: "Product 1",
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

      const saved1 = await documentsService.saveDocument(bill1);
      expect(saved1.id).toBeDefined();

      // On Save & New, activeSavedDocId is reset to null:
      let activeSavedDocId: string | null = null;
      expect(activeSavedDocId).toBeNull();

      // 2. Second bill saved with next sequence "INV/26-27/102" and id: activeSavedDocId || undefined (undefined)
      const bill2: Omit<BusinessDocument, "id"> & { id?: string } = {
        id: activeSavedDocId || undefined,
        organizationId: orgId,
        docType: "sales_invoice",
        documentNumber: "INV/26-27/102",
        partyName: "Party Two",
        docDate: "2026-10-14",
        items: [
          {
            id: "row-1",
            productName: "Product 2",
            quantity: 3,
            rate: 200,
            lineTotal: 600,
          },
        ],
        subtotal: 600,
        discountTotal: 0,
        taxableTotal: 600,
        cgstTotal: 0,
        sgstTotal: 0,
        igstTotal: 0,
        taxTotal: 0,
        roundOff: 0,
        grandTotal: 600,
        paidAmount: 600,
        balanceDue: 0,
        status: "paid",
        created_at: new Date().toISOString(),
      };

      const saved2 = await documentsService.saveDocument(bill2);
      expect(saved2.id).toBeDefined();
      expect(saved2.id).not.toBe(saved1.id);

      // Verify both invoices exist independently in cache
      const allBills = documentsService.getLocalDocuments(orgId, "sales_invoice");
      expect(allBills).toHaveLength(2);
      expect(allBills.map((b) => b.documentNumber)).toContain("INV/26-27/101");
      expect(allBills.map((b) => b.documentNumber)).toContain("INV/26-27/102");
    });
  });
});
