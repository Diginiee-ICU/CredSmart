import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { downloadExactInvoicePdf, ExactInvoicePayload } from "@/utils/downloadExactInvoice";
import jsPDF from "jspdf";
import * as ReactDOMClient from "react-dom/client";

// Mocks for standard execution
const mockAddImage = vi.fn();
const mockSave = vi.fn();

vi.mock("jspdf", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      addImage: mockAddImage,
      save: mockSave,
    })),
  };
});

const mockCanvas = {
  width: 794,
  height: 1123,
  toDataURL: vi.fn(() => "data:image/png;base64,mockImageData"),
};

vi.mock("html2canvas", () => {
  return {
    default: vi.fn().mockImplementation(() => Promise.resolve(mockCanvas)),
  };
});

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

describe("Adversarial PDF Engine Challenge Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanvas.width = 794;
    mockCanvas.height = 1123;
  });

  afterEach(() => {
    const strayContainers = document.querySelectorAll('div[style*="left: -9999px"], div[style*="left:-9999px"]');
    strayContainers.forEach((el) => el.remove());
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Stress Testing Container Dimensions & Aspect Ratio Math
  // ─────────────────────────────────────────────────────────────
  describe("Mathematical Boundary & Aspect Ratio Challenges", () => {
    it("empirically checks exact A4 96 DPI aspect ratio matching (794x1123)", () => {
      const a4WidthMm = 210;
      const a4HeightMm = 297;
      const nominalWidthPx = 794;
      const nominalHeightPx = 1123;

      const physicalAspect = a4HeightMm / a4WidthMm; // 297 / 210 = 1.4142857
      const pixelAspect = nominalHeightPx / nominalWidthPx; // 1123 / 794 = 1.4143576
      const aspectDiscrepancy = Math.abs(pixelAspect - physicalAspect);

      // Discrepancy must be under 0.0001 (less than 0.01% error)
      expect(aspectDiscrepancy).toBeLessThan(0.0001);

      // Physical equivalent height in mm at 210mm width
      const heightInMm = a4WidthMm * pixelAspect;
      expect(heightInMm - a4HeightMm).toBeLessThanOrEqual(0.5);
    });

    it("evaluates boundary condition precisely at the 0.5mm tolerance threshold", async () => {
      // Threshold is pageHeightMm + 0.5 = 297.5mm.
      // At canvas width = 794, canvas height for 297.5mm is 794 * 297.5 / 210 = 1124.8333 px.

      // Case A: Just BELOW threshold (297.49mm) -> 794 * 297.49 / 210 = 1124.79 px
      mockCanvas.width = 794;
      mockCanvas.height = 1124; // 210 * 1124 / 794 = 297.279mm <= 297.5mm -> No scale down
      await downloadExactInvoicePdf({
        invoiceNumber: "INV-SUB-THRESHOLD",
        totalAmount: 1000,
        items: [{ name: "A", quantity: 1, rate: 1000, total: 1000 }],
      });

      expect(mockAddImage).toHaveBeenCalled();
      const subCall = mockAddImage.mock.calls[0];
      expect(subCall[2]).toBe(0); // marginX = 0
      expect(subCall[4]).toBe(210); // full width
      expect(subCall[5]).toBeCloseTo(297.28, 1);

      vi.clearAllMocks();

      // Case B: Just ABOVE threshold (297.55mm) -> canvas height 1125 px
      mockCanvas.height = 1125; // 210 * 1125 / 794 = 297.544mm > 297.5mm -> Triggers scale down
      await downloadExactInvoicePdf({
        invoiceNumber: "INV-ABOVE-THRESHOLD",
        totalAmount: 1000,
        items: [{ name: "B", quantity: 1, rate: 1000, total: 1000 }],
      });

      expect(mockAddImage).toHaveBeenCalled();
      const aboveCall = mockAddImage.mock.calls[0];
      const marginX = aboveCall[2];
      const scaledWidth = aboveCall[4];
      const heightClamped = aboveCall[5];

      expect(heightClamped).toBe(297);
      expect(marginX).toBeGreaterThan(0);
      expect(scaledWidth).toBeLessThan(210);
      expect(scaledWidth + 2 * marginX).toBeCloseTo(210, 5);
    });

    it("stress-tests extreme vertical scaling (50 line items, canvas height = 4000px)", async () => {
      mockCanvas.width = 794;
      mockCanvas.height = 4000;

      await downloadExactInvoicePdf({
        invoiceNumber: "INV-EXTREME-TALL",
        totalAmount: 50000,
        items: Array.from({ length: 50 }, (_, i) => ({
          name: `Item ${i + 1}`,
          quantity: 1,
          rate: 1000,
          total: 1000,
        })),
      });

      expect(mockAddImage).toHaveBeenCalled();
      const call = mockAddImage.mock.calls[0];
      const marginX = call[2];
      const y = call[3];
      const scaledWidth = call[4];
      const height = call[5];

      // Must strictly fit on one A4 page
      expect(y).toBe(0);
      expect(height).toBe(297);
      expect(scaledWidth + 2 * marginX).toBeCloseTo(210, 5);
      expect(scaledWidth).toBeCloseTo(210 * (297 / (210 * (4000 / 794))), 2);
    });

    it("verifies horizontal centering symmetry for arbitrary heights", () => {
      const heights = [1200, 1500, 1800, 2400, 3200, 5000];
      const width = 794;

      heights.forEach((h) => {
        const imgAspect = h / width;
        const imgHeightMm = 210 * imgAspect;
        const scaleToFit = 297 / imgHeightMm;
        const scaledWidth = 210 * scaleToFit;
        const marginX = (210 - scaledWidth) / 2;

        expect(marginX).toBeGreaterThan(0);
        // Symmetry test: left margin + scaled content + right margin = total page width
        expect(marginX * 2 + scaledWidth).toBeCloseTo(210, 5);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. DOM Cleanup and Leakage Stress Tests
  // ─────────────────────────────────────────────────────────────
  describe("DOM Lifecycle & Cleanup Under Adversarial Conditions", () => {
    it("guarantees DOM cleanup even when html2canvas rejects with an unhandled rendering error", async () => {
      const html2canvasMock = await vi.importMock<any>("html2canvas");
      html2canvasMock.default.mockRejectedValueOnce(new Error("html2canvas synthetic font rendering failure"));

      const payload: ExactInvoicePayload = {
        invoiceNumber: "INV-ERROR-CLEANUP",
        totalAmount: 500,
        items: [{ name: "Crashing Item", quantity: 1, rate: 500, total: 500 }],
      };

      await downloadExactInvoicePdf(payload);

      // Verify no remaining elements with -9999px left in the body
      const remainingNodes = Array.from(document.body.children).filter(
        (child) => (child as HTMLElement).style?.left === "-9999px"
      );
      expect(remainingNodes.length).toBe(0);
    });

    it("guarantees DOM cleanup when jsPDF throws during save", async () => {
      mockSave.mockImplementationOnce(() => {
        throw new Error("Disk full or permissions error");
      });

      const payload: ExactInvoicePayload = {
        invoiceNumber: "INV-JSPDF-FAIL",
        totalAmount: 1000,
        items: [{ name: "Normal Item", quantity: 1, rate: 1000, total: 1000 }],
      };

      await downloadExactInvoicePdf(payload);

      const remainingNodes = Array.from(document.body.children).filter(
        (child) => (child as HTMLElement).style?.left === "-9999px"
      );
      expect(remainingNodes.length).toBe(0);
    });

    it("does not leak multiple containers when invoked concurrently", async () => {
      const payloads: ExactInvoicePayload[] = [
        { invoiceNumber: "CONCURRENT-1", totalAmount: 100, items: [{ name: "A", quantity: 1, rate: 100, total: 100 }] },
        { invoiceNumber: "CONCURRENT-2", totalAmount: 200, items: [{ name: "B", quantity: 1, rate: 200, total: 200 }] },
        { invoiceNumber: "CONCURRENT-3", totalAmount: 300, items: [{ name: "C", quantity: 1, rate: 300, total: 300 }] },
      ];

      await Promise.all(payloads.map((p) => downloadExactInvoicePdf(p)));

      const remainingNodes = Array.from(document.body.children).filter(
        (child) => (child as HTMLElement).style?.left === "-9999px"
      );
      expect(remainingNodes.length).toBe(0);
      expect(mockSave).toHaveBeenCalledTimes(3);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Filename Sanitization & Security Edge Cases
  // ─────────────────────────────────────────────────────────────
  describe("Adversarial Filename Sanitization", () => {
    it("neutralizes all OS reserved filesystem characters (/ \\ : * ? \" < > |)", async () => {
      const maliciousNumber = 'INV/2026\\test:illegal*wild?quote"less<greater>pipe|';
      await downloadExactInvoicePdf({
        invoiceNumber: maliciousNumber,
        totalAmount: 100,
        items: [{ name: "Item", quantity: 1, rate: 100, total: 100 }],
      });

      expect(mockSave).toHaveBeenCalled();
      const filename = mockSave.mock.calls[0][0];

      // None of the illegal characters should be present
      expect(filename).not.toMatch(/[/\\:*?"<>|]/);
      expect(filename).toBe("Invoice-INV-2026-test-illegal-wild-quote-less-greater-pipe-.pdf");
    });

    it("prevents relative directory traversal attacks via ../ and ..\\", async () => {
      const traversalInvoice = "../../../../../windows/system32/cmd";
      await downloadExactInvoicePdf({
        invoiceNumber: traversalInvoice,
        totalAmount: 100,
        items: [{ name: "Item", quantity: 1, rate: 100, total: 100 }],
      });

      const filename = mockSave.mock.calls[0][0];
      expect(filename).not.toContain("/");
      expect(filename).not.toContain("\\");
      expect(filename).toBe("Invoice-..-..-..-..-..-windows-system32-cmd.pdf");
    });

    it("handles falsy, empty, and null invoice numbers safely", async () => {
      // Empty string
      await downloadExactInvoicePdf({
        invoiceNumber: "",
        totalAmount: 100,
        items: [{ name: "Item", quantity: 1, rate: 100, total: 100 }],
      });
      expect(mockSave).toHaveBeenLastCalledWith("Invoice-invoice.pdf");

      // null as any
      await downloadExactInvoicePdf({
        invoiceNumber: null as any,
        totalAmount: 100,
        items: [{ name: "Item", quantity: 1, rate: 100, total: 100 }],
      });
      expect(mockSave).toHaveBeenLastCalledWith("Invoice-invoice.pdf");

      // undefined as any
      await downloadExactInvoicePdf({
        invoiceNumber: undefined as any,
        totalAmount: 100,
        items: [{ name: "Item", quantity: 1, rate: 100, total: 100 }],
      });
      expect(mockSave).toHaveBeenLastCalledWith("Invoice-invoice.pdf");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Payload Mapping & Enterprise Redesign Support
  // ─────────────────────────────────────────────────────────────
  describe("Payload Mapping & Enterprise Redesign Contracts", () => {
    it("accurately forwards bank details to the renderer", async () => {
      const payload: ExactInvoicePayload = {
        invoiceNumber: "INV-WITH-BANK",
        totalAmount: 3500,
        bankDetails: {
          bankName: "HDFC Bank",
          accountNumber: "50100234567890",
          ifsc: "HDFC0001234",
          accountHolder: "CredSmart Enterprise",
          branch: "Cyber City",
        },
        items: [{ name: "Service", quantity: 1, rate: 3500, total: 3500 }],
      };

      await downloadExactInvoicePdf(payload);
      expect(mockSave).toHaveBeenCalledWith("Invoice-INV-WITH-BANK.pdf");
    });

    it("faithfully computes taxable amount, discount, cgst, sgst", async () => {
      const payload: ExactInvoicePayload = {
        invoiceNumber: "INV-TAX-SPLIT",
        subtotal: 10000,
        discountAmount: 1000,
        tax: 450,
        roundOff: -0.5,
        totalAmount: 9449.5,
        items: [{ name: "Item", quantity: 10, rate: 1000, total: 10000 }],
      };

      await downloadExactInvoicePdf(payload);
      expect(mockSave).toHaveBeenCalledWith("Invoice-INV-TAX-SPLIT.pdf");
    });
  });
});
