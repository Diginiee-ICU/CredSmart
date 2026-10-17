/**
 * EMPIRICAL STRESS TEST SUITE: CRM Phase 2 Attendance PDF & CSV Export Engine
 * Author: challenger_m4_2
 *
 * Scope:
 *  1. Multi-page vector PDF generation scaling (50, 100, 150 records; asserting doc.getNumberOfPages() >= 4)
 *  2. Malicious and unusual CSV escaping (commas, double quotes, line breaks, unicode characters, empty strings)
 *     verified using a full RFC 4180 streaming state machine round-trip parser.
 *  3. PDF binary stream validity (%PDF-, %%EOF), memory stability across repeated generations, and crash resilience.
 */

import { describe, it, expect } from "vitest";
import {
  generateAttendanceReportPDF,
  exportAttendanceCSV,
  calculateMonthlyAttendanceMetrics,
} from "@/utils/crmAttendancePdf";
import type { CRMAttendanceRecord } from "@/types/crmAttendance";

// Realistic baseline mock builder
function makeMockRecord(overrides: Partial<CRMAttendanceRecord> = {}): CRMAttendanceRecord {
  return {
    id: "rec-" + Math.random().toString(36).substring(2, 9),
    org_id: "org-credsmart-stress-test",
    staff_id: "usr-stress-01",
    staff_name: "Vikram Malhotra",
    staff_email: "vikram@credsmart.app",
    date: "2026-10-01",
    clock_in: "2026-10-01T09:00:00Z",
    clock_out: "2026-10-01T17:30:00Z",
    clock_in_latitude: 19.076,
    clock_in_longitude: 72.8777,
    clock_in_accuracy: 10,
    clock_out_latitude: 19.076,
    clock_out_longitude: 72.8777,
    clock_out_accuracy: 10,
    clock_in_location_id: "geo-hq-mumbai",
    clock_out_location_id: "geo-hq-mumbai",
    status: "present",
    verification_method: "geo_verified",
    is_within_geofence: true,
    distance_from_office_meters: 15.4,
    work_duration_minutes: 510,
    overtime_minutes: 30,
    notes: "Regular verified shift",
    created_at: "2026-10-01T09:00:00Z",
    updated_at: "2026-10-01T17:30:00Z",
    ...overrides,
  };
}

// RFC 4180 compliant CSV parser to verify round-trip fidelity
function parseRFC4180CSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;
  let i = 0;

  while (i < csvText.length) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: "" -> "
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          insideQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
        i++;
        continue;
      } else if (char === ",") {
        currentRow.push(currentField);
        currentField = "";
        i++;
        continue;
      } else if (char === "\r" && nextChar === "\n") {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
        i += 2;
        continue;
      } else if (char === "\n") {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

describe("Empirical Challenger M4_2: PDF & CSV Stress Testing", () => {
  // ==========================================================================
  // Task 1: Multi-Page Vector PDF Generation at Scale
  // ==========================================================================
  describe("Task 1: Multi-page vector PDF generation scaling (50, 100, 150 records)", () => {
    it("scales correctly for 50 records (generates 2 pages)", () => {
      const records = Array.from({ length: 50 }, (_, i) =>
        makeMockRecord({
          id: `rec-50-${i}`,
          date: `2026-10-${String((i % 30) + 1).padStart(2, "0")}`,
          staff_id: `usr-${i % 5}`,
          staff_name: `Employee ${i % 5}`,
        })
      );

      const doc = generateAttendanceReportPDF({
        records,
        organizationName: "Scale Test Org (50 Records)",
        period: "October 2026",
        autoSave: false,
      });

      const pageCount = doc.getNumberOfPages();
      expect(pageCount).toBe(2);
    });

    it("scales correctly for 100 records (generates 4 pages)", () => {
      const records = Array.from({ length: 100 }, (_, i) =>
        makeMockRecord({
          id: `rec-100-${i}`,
          date: `2026-10-${String((i % 30) + 1).padStart(2, "0")}`,
          staff_id: `usr-${i % 8}`,
          staff_name: `Staff Member ${i % 8}`,
        })
      );

      const doc = generateAttendanceReportPDF({
        records,
        organizationName: "Scale Test Org (100 Records)",
        period: "October 2026",
        autoSave: false,
      });

      const pageCount = doc.getNumberOfPages();
      // Page 1 holds 29, Page 2 holds 35, Page 3 holds 35 (total 99), Page 4 holds 1
      expect(pageCount).toBe(4);
    });

    it("scales correctly for 150 records and asserts doc.getNumberOfPages() >= 4", () => {
      const records = Array.from({ length: 150 }, (_, i) =>
        makeMockRecord({
          id: `rec-150-${i}`,
          date: `2026-10-${String((i % 30) + 1).padStart(2, "0")}`,
          staff_id: `usr-${i % 10}`,
          staff_name: `Staff Member ${i % 10}`,
        })
      );

      const doc = generateAttendanceReportPDF({
        records,
        organizationName: "CredSmart Enterprise Scale Test (150 Records)",
        period: "October 2026",
        autoSave: false,
      });

      const pageCount = doc.getNumberOfPages();
      // Explicit requirement: assert doc.getNumberOfPages() >= 4
      expect(pageCount).toBeGreaterThanOrEqual(4);
      // Detailed check: 29 + 35 + 35 + 35 = 134 on 4 pages; remaining 16 on page 5
      expect(pageCount).toBe(5);
    });

    it("handles extreme volume (300 records) spanning 9 pages with deterministic pagination", () => {
      const records = Array.from({ length: 300 }, (_, i) =>
        makeMockRecord({
          id: `rec-300-${i}`,
          date: `2026-10-${String((i % 30) + 1).padStart(2, "0")}`,
        })
      );

      const doc = generateAttendanceReportPDF({
        records,
        organizationName: "High Volume Corp (300 Records)",
        autoSave: false,
      });

      const pageCount = doc.getNumberOfPages();
      expect(pageCount).toBe(9);
    });
  });

  // ==========================================================================
  // Task 2: Adversarial CSV Escaping & Injection Tests
  // ==========================================================================
  describe("Task 2: Adversarial CSV escaping & round-trip verification", () => {
    it("correctly escapes commas, double quotes, and line breaks per RFC 4180", () => {
      const adversarialNotes = 'Line 1, with commas\nLine 2 with "embedded quotes" and \r\nLine 3 carriage return';
      const adversarialName = 'O\'Connor, "The Boss", MD\nSpecialist';

      const records: CRMAttendanceRecord[] = [
        makeMockRecord({
          staff_name: adversarialName,
          notes: adversarialNotes,
        }),
      ];

      const { csvContent } = exportAttendanceCSV(records, { autoDownload: false });

      // Parse with standard RFC 4180 parser
      const parsedRows = parseRFC4180CSV(csvContent);
      expect(parsedRows.length).toBe(2); // Header row + 1 data row

      const parsedDataRow = parsedRows[1];
      // Staff Name is column index 1
      expect(parsedDataRow[1]).toBe(adversarialName);
      // Notes is column index 13
      expect(parsedDataRow[13]).toBe(adversarialNotes);
    });

    it("survives malicious formula injection patterns without breaking CSV structure", () => {
      const injectionPayloads = [
        "=CMD|' /C calc'!A0",
        "+1234567890",
        "-999999",
        "@SUM(A1:A10)",
        "\t=1+1",
        "|ping -n 5 127.0.0.1",
      ];

      const records: CRMAttendanceRecord[] = injectionPayloads.map((payload, idx) =>
        makeMockRecord({
          id: `rec-inj-${idx}`,
          staff_name: `User ${payload}`,
          notes: `Attempting formula injection: ${payload}`,
        })
      );

      const { csvContent, rows } = exportAttendanceCSV(records, { autoDownload: false });

      // CSV must have 1 header row + N injection rows
      expect(rows.length).toBe(injectionPayloads.length + 1);

      // Verify with RFC 4180 parser that every row is intact and not corrupted
      const parsedRows = parseRFC4180CSV(csvContent);
      expect(parsedRows.length).toBe(injectionPayloads.length + 1);

      injectionPayloads.forEach((payload, idx) => {
        const row = parsedRows[idx + 1];
        expect(row[1]).toBe(`User ${payload}`);
        expect(row[13]).toBe(`Attempting formula injection: ${payload}`);
      });
    });

    it("survives international Unicode, Devanagari, Emoji, CJK, and Arabic strings", () => {
      const unicodeCases = [
        { name: "अमित कुमार शर्मा", note: "कार्यालय में समय पर उपस्थिति 🕒" },
        { name: "李秀英", note: "已通过地理围栏验证 📍" },
        { name: "محمد عبدالله", note: "حضور معتمد من الإدارة" },
        { name: "Владимир Иванов", note: "Сверхурочные 2 часа" },
        { name: "José & María 🌟", note: "Café réunion; 100% compliant" },
      ];

      const records: CRMAttendanceRecord[] = unicodeCases.map((c, idx) =>
        makeMockRecord({
          id: `rec-uni-${idx}`,
          staff_name: c.name,
          notes: c.note,
        })
      );

      const { csvContent } = exportAttendanceCSV(records, { autoDownload: false });
      const parsedRows = parseRFC4180CSV(csvContent);

      expect(parsedRows.length).toBe(unicodeCases.length + 1);

      unicodeCases.forEach((c, idx) => {
        const row = parsedRows[idx + 1];
        expect(row[1]).toBe(c.name);
        expect(row[13]).toBe(c.note);
      });
    });

    it("handles extreme edge cases: empty strings, nulls, undefined, and huge 10KB strings", () => {
      const hugeNote = "A".repeat(10000) + ',"quoted",' + "B".repeat(5000);

      const records: CRMAttendanceRecord[] = [
        makeMockRecord({
          staff_id: "",
          staff_name: "",
          clock_in: null,
          clock_out: null,
          work_duration_minutes: 0,
          overtime_minutes: 0,
          distance_from_office_meters: null,
          notes: "",
        }),
        makeMockRecord({
          notes: hugeNote,
        }),
      ];

      const { csvContent } = exportAttendanceCSV(records, { autoDownload: false });
      const parsedRows = parseRFC4180CSV(csvContent);

      expect(parsedRows.length).toBe(3); // Header + 2 rows
      expect(parsedRows[1][1]).toBe("Staff"); // Defaults to "Staff" when empty
      expect(parsedRows[1][3]).toBe("");      // Empty clock in
      expect(parsedRows[1][13]).toBe("");     // Empty note
      expect(parsedRows[2][13]).toBe(hugeNote); // Huge note preserved exactly
    });
  });

  // ==========================================================================
  // Task 3: PDF Binary Integrity, Memory Stability & Crash Verification
  // ==========================================================================
  describe("Task 3: PDF Binary Output, Memory Stability & Crash Verification", () => {
    it("produces valid PDF byte stream with %PDF- header and %%EOF trailer", () => {
      const records = [
        makeMockRecord(),
        makeMockRecord({ date: "2026-10-02" }),
      ];

      const doc = generateAttendanceReportPDF({
        records,
        organizationName: "Byte Check Corp",
        autoSave: false,
      });

      // Export arraybuffer
      const arrayBuffer = doc.output("arraybuffer");
      expect(arrayBuffer).toBeInstanceOf(ArrayBuffer);
      expect(arrayBuffer.byteLength).toBeGreaterThan(1000); // Realistic PDF is > 1KB

      // Export as binary string to inspect magic numbers
      const binaryString = doc.output();
      expect(binaryString.startsWith("%PDF-")).toBe(true);
      expect(binaryString.includes("%%EOF")).toBe(true);
    });

    it(
      "remains stable under repeated heavy generation (no memory explosion or crash)",
      () => {
        const records = Array.from({ length: 100 }, (_, i) =>
          makeMockRecord({
            id: `rec-mem-${i}`,
            date: `2026-10-${String((i % 30) + 1).padStart(2, "0")}`,
            work_duration_minutes: 480 + (i % 60),
            overtime_minutes: i % 2 === 0 ? 30 : 0,
          })
        );

        // Run 10 consecutive 100-record document generations
        const initialMem = process.memoryUsage().heapUsed;
        const docs = [];

        for (let run = 0; run < 10; run++) {
          const doc = generateAttendanceReportPDF({
            records,
            organizationName: `Mem Run ${run}`,
            autoSave: false,
          });
          expect(doc.getNumberOfPages()).toBe(4);
          const buf = doc.output("arraybuffer");
          expect(buf.byteLength).toBeGreaterThan(5000);
          docs.push(buf.byteLength);
        }

        const finalMem = process.memoryUsage().heapUsed;
        // Ensure memory difference is within reasonable bounds (< 150MB increase for 10 PDF docs)
        const memDiffMB = (finalMem - initialMem) / (1024 * 1024);
        expect(memDiffMB).toBeLessThan(150);
        expect(docs.length).toBe(10);
      },
      25000
    );

    it("handles adversarial record payloads without throwing exceptions", () => {
      const maliciousRecords: CRMAttendanceRecord[] = [
        // Negative / malformed numeric durations
        makeMockRecord({
          work_duration_minutes: -500,
          overtime_minutes: -100,
          status: "unknown_status" as any,
          verification_method: "unknown_method" as any,
        }),
        // Extreme NaN / infinite / corrupt dates
        makeMockRecord({
          date: "INVALID-DATE-9999",
          clock_in: "Not-A-Timestamp",
          clock_out: "Also-Not-A-Timestamp",
          // @ts-expect-error testing runtime robustness
          work_duration_minutes: NaN,
          // @ts-expect-error testing runtime robustness
          overtime_minutes: Infinity,
        }),
        // Super long strings in table cells
        makeMockRecord({
          staff_name: "SuperLongNameThatExceedsTheNormalCellWidthAndShouldBeTruncatedGracefullyWithoutBreakingVectorTableLayout",
          notes: "Extremely long remarks that might overflow if not handled cleanly by the PDF engine",
        }),
      ];

      expect(() => {
        const doc = generateAttendanceReportPDF({
          records: maliciousRecords,
          organizationName: "Adversarial Test Enterprise",
          autoSave: false,
        });
        expect(doc.getNumberOfPages()).toBe(1);
        const metrics = calculateMonthlyAttendanceMetrics(maliciousRecords);
        expect(metrics).toBeDefined();
      }).not.toThrow();
    });
  });
});
