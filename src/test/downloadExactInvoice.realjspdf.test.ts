import { describe, it, expect } from "vitest";
import jsPDF from "jspdf";

describe("Real Unmocked jsPDF Behavior Verification", () => {
  // 1x1 transparent PNG data URI
  const tinyPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

  it("verifies real jsPDF page count remains exactly 1 when height <= 297mm", () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    expect(doc.getNumberOfPages()).toBe(1);
    doc.addImage(tinyPng, "PNG", 0, 0, 210, 297, undefined, "FAST");
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it("verifies real jsPDF page count remains 1 when height is 297.015mm (nominal 794x1123px)", () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // 794x1123 nominal height at 210mm width is 297.015113mm
    doc.addImage(tinyPng, "PNG", 0, 0, 210, 297.015, undefined, "FAST");
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it("verifies real jsPDF page count remains 1 when height is within 0.5mm tolerance (297.4mm)", () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    doc.addImage(tinyPng, "PNG", 0, 0, 210, 297.4, undefined, "FAST");
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it("verifies real jsPDF page count remains 1 when tall scaled image is added (marginX, height=297)", () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const scaledWidth = 150;
    const marginX = (210 - scaledWidth) / 2; // 30
    doc.addImage(tinyPng, "PNG", marginX, 0, scaledWidth, 297, undefined, "FAST");
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it("verifies real jsPDF internal page format dimensions", () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    expect(width).toBeCloseTo(210, 1);
    expect(height).toBeCloseTo(297, 1);
  });
});
