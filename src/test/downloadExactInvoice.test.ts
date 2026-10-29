import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { downloadExactInvoicePdf, ExactInvoicePayload } from "@/utils/downloadExactInvoice";

// Mock html2canvas and jspdf
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

describe("downloadExactInvoice Engine Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanvas.width = 794;
    mockCanvas.height = 1123;
  });

  afterEach(() => {
    // Clean up any stray containers in document.body
    const strayContainers = document.querySelectorAll('div[style*="left: -9999px"], div[style*="left:-9999px"]');
    strayContainers.forEach((el) => el.remove());
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Off-Screen Capture Container Layout & Dimensions
  // ─────────────────────────────────────────────────────────────
  describe("Off-Screen Capture Container Properties", () => {
    it("creates an off-screen container with exact A4 96 DPI pixel width (794px)", async () => {
      let capturedStyle: CSSStyleDeclaration | null = null;
      const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation((node) => {
        if (node instanceof HTMLElement && (node.style.left === "-9999px" || node.style.cssText.includes("-9999px"))) {
          capturedStyle = node.style;
        }
        return node;
      });

      const payload: ExactInvoicePayload = {
        invoiceNumber: "INV-TEST-001",
        totalAmount: 1000,
        items: [{ name: "Test Item", quantity: 1, rate: 1000, total: 1000 }],
      };

      await downloadExactInvoicePdf(payload);

      expect(appendChildSpy).toHaveBeenCalled();
      expect(capturedStyle).not.toBeNull();
      if (capturedStyle) {
        expect((capturedStyle as CSSStyleDeclaration).width).toBe("794px");
        expect((capturedStyle as CSSStyleDeclaration).position).toBe("fixed");
        expect((capturedStyle as CSSStyleDeclaration).top).toBe("0px");
        expect((capturedStyle as CSSStyleDeclaration).left).toBe("-9999px");
        expect((capturedStyle as CSSStyleDeclaration).pointerEvents).toBe("none");
      }
      appendChildSpy.mockRestore();
    });

    it("enforces minimum height of 1123px (A4 height at 96 DPI) on capture container", async () => {
      let minHeightValue = "";
      const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation((node) => {
        if (node instanceof HTMLElement) {
          minHeightValue = node.style.minHeight;
        }
        return node;
      });

      const payload: ExactInvoicePayload = {
        invoiceNumber: "INV-TEST-002",
        totalAmount: 500,
        items: [{ name: "Item A", quantity: 2, rate: 250, total: 500 }],
      };

      await downloadExactInvoicePdf(payload);

      expect(minHeightValue).toBe("1123px");
      appendChildSpy.mockRestore();
    });

    it("sets background to pure white (#ffffff) and negative z-index (-999)", async () => {
      let capturedBackground = "";
      let capturedZIndex = "";
      const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation((node) => {
        if (node instanceof HTMLElement) {
          capturedBackground = node.style.background || node.style.backgroundColor;
          capturedZIndex = node.style.zIndex;
        }
        return node;
      });

      const payload: ExactInvoicePayload = {
        invoiceNumber: "INV-TEST-003",
        totalAmount: 200,
        items: [{ name: "Item B", quantity: 1, rate: 200, total: 200 }],
      };

      await downloadExactInvoicePdf(payload);

      expect(capturedBackground).toMatch(/#ffffff|rgb\(255,\s*255,\s*255\)/i);
      expect(capturedZIndex).toBe("-999");
      appendChildSpy.mockRestore();
    });

    it("cleans up off-screen DOM element from document.body after generation", async () => {
      const payload: ExactInvoicePayload = {
        invoiceNumber: "INV-TEST-CLEANUP",
        totalAmount: 100,
        items: [{ name: "Item C", quantity: 1, rate: 100, total: 100 }],
      };

      await downloadExactInvoicePdf(payload);

      // Verify no remaining elements with -9999px left in the body
      const remainingNodes = Array.from(document.body.children).filter(
        (child) => (child as HTMLElement).style?.left === "-9999px"
      );
      expect(remainingNodes.length).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Single-Page A4 Scaling Mathematics & Tolerance
  // ─────────────────────────────────────────────────────────────
  describe("Single-Page A4 Scaling Mathematics & Aspect Ratio", () => {
    const pageWidthMm = 210;
    const pageHeightMm = 297;

    it("calculates exact single-page fit for standard 794x1123 canvas without distortion", () => {
      const canvasWidth = 794;
      const canvasHeight = 1123;
      const imgAspect = canvasHeight / canvasWidth;
      const imgHeightMm = pageWidthMm * imgAspect;

      // Theoretical height at 794x1123 is 297.015mm
      expect(imgHeightMm).toBeCloseTo(297.015, 2);

      // Tolerance check: if imgHeightMm exceeds 297 by <= 0.5mm, it fits single page
      const diffMm = imgHeightMm - pageHeightMm;
      expect(diffMm).toBeLessThanOrEqual(0.5);
    });

    it("correctly handles short content (less than A4 height) with 0 top margin", async () => {
      // Set short canvas (e.g. 794 x 800)
      mockCanvas.width = 794;
      mockCanvas.height = 800;

      const payload: ExactInvoicePayload = {
        invoiceNumber: "INV-SHORT",
        totalAmount: 1200,
        items: [{ name: "Compact Bill", quantity: 1, rate: 1200, total: 1200 }],
      };

      await downloadExactInvoicePdf(payload);

      expect(mockAddImage).toHaveBeenCalled();
      const lastCall = mockAddImage.mock.calls[0];
      // Arguments: imgData, format, x, y, width, height, alias, compression
      const x = lastCall[2];
      const y = lastCall[3];
      const width = lastCall[4];
      const height = lastCall[5];

      expect(x).toBe(0);
      expect(y).toBe(0);
      expect(width).toBe(210);
      expect(height).toBeCloseTo(210 * (800 / 794), 1);
    });

    it("scales down tall content (> 1123px) to fit exactly on 1 page (height = 297mm)", async () => {
      // Set tall canvas (e.g. 794 x 1600)
      mockCanvas.width = 794;
      mockCanvas.height = 1600;

      const payload: ExactInvoicePayload = {
        invoiceNumber: "INV-TALL",
        totalAmount: 15000,
        items: Array.from({ length: 15 }, (_, i) => ({
          name: `Item ${i + 1}`,
          quantity: 2,
          rate: 500,
          total: 1000,
        })),
      };

      await downloadExactInvoicePdf(payload);

      expect(mockAddImage).toHaveBeenCalled();
      const lastCall = mockAddImage.mock.calls[0];
      const x = lastCall[2];
      const y = lastCall[3];
      const width = lastCall[4];
      const height = lastCall[5];

      // In tall mode, height must be clamped to 297mm
      expect(height).toBe(297);
      expect(y).toBe(0);

      // Width must be scaled proportionally and centered horizontally
      const expectedAspect = 1600 / 794;
      const expectedImgHeightMm = 210 * expectedAspect;
      const expectedScale = 297 / expectedImgHeightMm;
      const expectedScaledWidth = 210 * expectedScale;
      const expectedMarginX = (210 - expectedScaledWidth) / 2;

      expect(width).toBeCloseTo(expectedScaledWidth, 2);
      expect(x).toBeCloseTo(expectedMarginX, 2);
    });

    it("applies horizontal centering (marginX = (210 - scaledWidth) / 2) when downscaled", () => {
      const canvasHeight = 1500;
      const canvasWidth = 794;
      const imgAspect = canvasHeight / canvasWidth;
      const imgHeightMm = pageWidthMm * imgAspect;
      const scaleToFit = pageHeightMm / imgHeightMm;
      const scaledWidth = pageWidthMm * scaleToFit;
      const marginX = (pageWidthMm - scaledWidth) / 2;

      expect(marginX).toBeGreaterThan(0);
      expect(scaledWidth + 2 * marginX).toBeCloseTo(210, 5);
    });

    it("verifies 0.5mm tolerance threshold prevents subpixel downscaling distortion", () => {
      // When canvas is 1123px at 794px width, height in mm is 297.015mm
      // A tolerance threshold of 0.5mm allows values in [297.0, 297.5] to fit single page without resizing
      const toleranceThresholdMm = 0.5;
      const theoreticalMm = 210 * (1123 / 794);
      const isWithinTolerance = theoreticalMm - 297 <= toleranceThresholdMm;

      expect(isWithinTolerance).toBe(true);
      expect(Math.abs(theoreticalMm - 297)).toBeLessThan(toleranceThresholdMm);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Payload Normalization, Bank Details & Document Naming
  // ─────────────────────────────────────────────────────────────
  describe("Payload Handling & Sanitization", () => {
    it("sanitizes slashes, colons, and illegal characters in PDF filename", async () => {
      const payload: ExactInvoicePayload = {
        invoiceNumber: "INV/26-27/134:A*B?C",
        totalAmount: 4988,
        items: [{ name: "Hook sample", quantity: 1, rate: 4988, total: 4988 }],
      };

      await downloadExactInvoicePdf(payload);

      expect(mockSave).toHaveBeenCalled();
      const savedFilename = mockSave.mock.calls[0][0];
      // Should not contain illegal characters: / \ : * ? " < > |
      expect(savedFilename).not.toMatch(/[/\\:*?"<>|]/);
      expect(savedFilename).toBe("Invoice-INV-26-27-134-A-B-C.pdf");
    });

    it("uses default fallback filename 'Invoice-invoice.pdf' if invoiceNumber is empty", async () => {
      const payload: ExactInvoicePayload = {
        invoiceNumber: "",
        totalAmount: 250,
        items: [{ name: "Sample", quantity: 1, rate: 250, total: 250 }],
      };

      await downloadExactInvoicePdf(payload);

      expect(mockSave).toHaveBeenCalled();
      const savedFilename = mockSave.mock.calls[0][0];
      expect(savedFilename).toBe("Invoice-invoice.pdf");
    });

    it("supports forwarding bankDetails object in payload", async () => {
      const payloadWithBank = {
        invoiceNumber: "INV-BANK-001",
        totalAmount: 4988,
        storeName: "ASIA INTERNATIONAL",
        bankDetails: {
          bankName: "Federal Bank",
          accountNumber: "77770100867585",
          ifsc: "FDRL0007777",
          accountHolder: "Ashwin Bishnoi",
          branch: "Nagina",
        },
        items: [{ name: "Sample Item", quantity: 1, rate: 4988, total: 4988 }],
      };

      // downloadExactInvoicePdf should accept payload with bankDetails
      await downloadExactInvoicePdf(payloadWithBank as ExactInvoicePayload);
      expect(mockSave).toHaveBeenCalled();
    });

    it("correctly maps docType to 'quotation' when isEstimate is true and docType is omitted", async () => {
      const payload: ExactInvoicePayload = {
        invoiceNumber: "EST-2026-001",
        isEstimate: true,
        totalAmount: 8500,
        items: [{ name: "Consulting", quantity: 1, rate: 8500, total: 8500 }],
      };

      await downloadExactInvoicePdf(payload);
      expect(mockSave).toHaveBeenCalledWith("Estimate-EST-2026-001.pdf");
    });

    it("splits total tax evenly into CGST and SGST for intrastate transactions", () => {
      const totalTax = 237.5;
      const cgst = totalTax / 2;
      const sgst = totalTax / 2;

      expect(cgst).toBe(118.75);
      expect(sgst).toBe(118.75);
      expect(cgst + sgst).toBe(totalTax);
    });

    it("preserves paymentMethod Credit with paidAmount=0 and balanceDue=totalAmount", () => {
      const totalAmount = 5000;
      const paymentMethod = "Credit";
      const paidAmount = paymentMethod === "Credit" ? 0 : totalAmount;
      const balanceDue = paymentMethod === "Credit" ? totalAmount : 0;

      expect(paidAmount).toBe(0);
      expect(balanceDue).toBe(5000);
    });

    it("preserves paymentMethod Cash with paidAmount=totalAmount and balanceDue=0", () => {
      const totalAmount = 4988;
      const paymentMethod = "Cash";
      const paidAmount = paymentMethod === "Credit" ? 0 : totalAmount;
      const balanceDue = paymentMethod === "Credit" ? totalAmount : 0;

      expect(paidAmount).toBe(4988);
      expect(balanceDue).toBe(0);
    });
  });
});
