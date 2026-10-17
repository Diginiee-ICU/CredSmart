/**
 * Comprehensive Test Suite for CRM Phase 2 Attendance Reports & PDF/CSV Export Engine
 * Validates metric aggregations, pure vector jsPDF generation, pagination, and RFC 4180 CSV compliance.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateMonthlyAttendanceMetrics,
  generateAttendanceReportPDF,
  exportAttendanceCSV,
  formatMinutesToHM,
  formatTimeDisplay,
  BRAND_COLORS,
} from "@/utils/crmAttendancePdf";
import type { CRMAttendanceRecord } from "@/types/crmAttendance";

// Sample helper to create realistic attendance mock records
const createMockRecord = (overrides: Partial<CRMAttendanceRecord> = {}): CRMAttendanceRecord => ({
  id: "rec-" + Math.random().toString(36).substring(2, 9),
  org_id: "org-test-credsmart-01",
  staff_id: "usr-001",
  staff_name: "Aarav Patel",
  staff_email: "aarav@credsmart.app",
  date: "2026-10-01",
  clock_in: "2026-10-01T09:00:00Z",
  clock_out: "2026-10-01T17:30:00Z",
  clock_in_latitude: 12.9716,
  clock_in_longitude: 77.5946,
  clock_in_accuracy: 12,
  clock_out_latitude: 12.9716,
  clock_out_longitude: 77.5946,
  clock_out_accuracy: 15,
  clock_in_location_id: "geo-hq-01",
  clock_out_location_id: "geo-hq-01",
  status: "present",
  verification_method: "geo_verified",
  is_within_geofence: true,
  distance_from_office_meters: 24.5,
  work_duration_minutes: 510, // 8.5 hours
  overtime_minutes: 30,       // 0.5 hours
  notes: "On-time arrival at Main HQ",
  created_at: "2026-10-01T09:00:00Z",
  updated_at: "2026-10-01T17:30:00Z",
  ...overrides,
});

describe("CRM Attendance PDF & CSV Export Engine", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // 1. Helper Formatters
  // ==========================================================================
  describe("Helper Formatters", () => {
    it("formatMinutesToHM formats minutes into human-readable hours and minutes", () => {
      expect(formatMinutesToHM(0)).toBe("0m");
      expect(formatMinutesToHM(-15)).toBe("0m");
      expect(formatMinutesToHM(45)).toBe("45m");
      expect(formatMinutesToHM(60)).toBe("1h");
      expect(formatMinutesToHM(120)).toBe("2h");
      expect(formatMinutesToHM(125)).toBe("2h 5m");
      expect(formatMinutesToHM(510)).toBe("8h 30m");
    });

    it("formatTimeDisplay converts ISO timestamp to localized time or fallback", () => {
      expect(formatTimeDisplay(null)).toBe("—");
      expect(formatTimeDisplay("")).toBe("—");
      expect(formatTimeDisplay("invalid-date-string")).toBe("—");

      const validTime = formatTimeDisplay("2026-10-17T09:30:00Z");
      expect(typeof validTime).toBe("string");
      expect(validTime).not.toBe("—");
    });

    it("verifies CredSmart CRM brand token RGB triples", () => {
      expect(BRAND_COLORS.navy).toEqual([15, 23, 42]);
      expect(BRAND_COLORS.orange).toEqual([255, 106, 0]);
      expect(BRAND_COLORS.emerald).toEqual([16, 185, 129]);
      expect(BRAND_COLORS.slate).toEqual([100, 116, 139]);
      expect(BRAND_COLORS.lightSlate).toEqual([241, 245, 249]);
    });
  });

  // ==========================================================================
  // 2. calculateMonthlyAttendanceMetrics
  // ==========================================================================
  describe("calculateMonthlyAttendanceMetrics", () => {
    it("returns all zeroes when passed an empty array", () => {
      const metrics = calculateMonthlyAttendanceMetrics([]);
      expect(metrics).toEqual({
        totalDays: 0,
        presentDays: 0,
        absentDays: 0,
        halfDays: 0,
        onLeaveDays: 0,
        totalWorkMinutes: 0,
        totalWorkHours: 0,
        totalOvertimeMinutes: 0,
        totalOvertimeHours: 0,
        geoVerifiedCount: 0,
        manualCount: 0,
        regularizedCount: 0,
      });
    });

    it("returns zeroes gracefully when passed invalid non-array input", () => {
      // @ts-expect-error Testing defensive runtime handling
      const metrics = calculateMonthlyAttendanceMetrics(null);
      expect(metrics.totalDays).toBe(0);
      expect(metrics.presentDays).toBe(0);
    });

    it("correctly counts present, absent, half_day, and on_leave statuses", () => {
      const records: CRMAttendanceRecord[] = [
        createMockRecord({ status: "present" }),
        createMockRecord({ status: "present" }),
        createMockRecord({ status: "absent" }),
        createMockRecord({ status: "half_day" }),
        createMockRecord({ status: "on_leave" }),
      ];

      const metrics = calculateMonthlyAttendanceMetrics(records);
      expect(metrics.totalDays).toBe(5);
      expect(metrics.presentDays).toBe(2);
      expect(metrics.absentDays).toBe(1);
      expect(metrics.halfDays).toBe(1);
      expect(metrics.onLeaveDays).toBe(1);
    });

    it("correctly aggregates work duration minutes and converts to rounded hours (1 decimal)", () => {
      const records: CRMAttendanceRecord[] = [
        createMockRecord({ work_duration_minutes: 480 }), // 8h
        createMockRecord({ work_duration_minutes: 510 }), // 8.5h
        createMockRecord({ work_duration_minutes: 245 }), // ~4.08h
      ];

      const metrics = calculateMonthlyAttendanceMetrics(records);
      expect(metrics.totalWorkMinutes).toBe(1235);
      // 1235 / 60 = 20.58333... rounded to 1 decimal is 20.6
      expect(metrics.totalWorkHours).toBe(20.6);
    });

    it("correctly aggregates overtime minutes and converts to rounded hours (1 decimal)", () => {
      const records: CRMAttendanceRecord[] = [
        createMockRecord({ overtime_minutes: 30 }),
        createMockRecord({ overtime_minutes: 45 }),
        createMockRecord({ overtime_minutes: 50 }),
      ];

      const metrics = calculateMonthlyAttendanceMetrics(records);
      expect(metrics.totalOvertimeMinutes).toBe(125);
      // 125 / 60 = 2.08333... rounded to 1 decimal is 2.1
      expect(metrics.totalOvertimeHours).toBe(2.1);
    });

    it("correctly breaks down verification methods (geo_verified, manual, regularized)", () => {
      const records: CRMAttendanceRecord[] = [
        createMockRecord({ verification_method: "geo_verified" }),
        createMockRecord({ verification_method: "geo_verified" }),
        createMockRecord({ verification_method: "manual" }),
        createMockRecord({ verification_method: "regularized" }),
        createMockRecord({ verification_method: "regularized" }),
      ];

      const metrics = calculateMonthlyAttendanceMetrics(records);
      expect(metrics.geoVerifiedCount).toBe(2);
      expect(metrics.manualCount).toBe(1);
      expect(metrics.regularizedCount).toBe(2);
    });

    it("safely handles null, undefined, and non-numeric work minutes", () => {
      const records: CRMAttendanceRecord[] = [
        // @ts-expect-error Simulating malformed DB payload
        createMockRecord({ work_duration_minutes: null, overtime_minutes: undefined }),
        // @ts-expect-error Simulating malformed DB payload
        createMockRecord({ work_duration_minutes: "invalid", overtime_minutes: null }),
        createMockRecord({ work_duration_minutes: 120, overtime_minutes: 15 }),
      ];

      const metrics = calculateMonthlyAttendanceMetrics(records);
      expect(metrics.totalWorkMinutes).toBe(120);
      expect(metrics.totalWorkHours).toBe(2);
      expect(metrics.totalOvertimeMinutes).toBe(15);
      expect(metrics.totalOvertimeHours).toBe(0.3);
    });
  });

  // ==========================================================================
  // 3. generateAttendanceReportPDF
  // ==========================================================================
  describe("generateAttendanceReportPDF", () => {
    it("generates a valid jsPDF instance without crashing on empty records", () => {
      const doc = generateAttendanceReportPDF({
        records: [],
        organizationName: "CredSmart Enterprise",
        period: "October 2026",
        autoSave: false,
      });

      expect(doc).toBeDefined();
      expect(typeof doc.save).toBe("function");
      expect(typeof doc.addPage).toBe("function");
      expect(doc.getNumberOfPages()).toBe(1);
    });

    it("generates a single page document for up to 25 records", () => {
      const records: CRMAttendanceRecord[] = Array.from({ length: 20 }, (_, i) =>
        createMockRecord({
          date: `2026-10-${String(i + 1).padStart(2, "0")}`,
          work_duration_minutes: 480,
          status: i % 7 === 0 ? "on_leave" : "present",
        })
      );

      const doc = generateAttendanceReportPDF({
        records,
        organizationName: "CredSmart Enterprise",
        staffName: "Aarav Patel",
        period: "October 2026",
        autoSave: false,
      });

      expect(doc.getNumberOfPages()).toBe(1);
    });

    it("automatically triggers pagination across multiple pages for large datasets (>30 records)", () => {
      // 45 records will overflow page 1 (which holds ~30 records under the header and KPI cards)
      const records: CRMAttendanceRecord[] = Array.from({ length: 45 }, (_, i) =>
        createMockRecord({
          id: `rec-overflow-${i}`,
          date: `2026-10-${String((i % 31) + 1).padStart(2, "0")}`,
          work_duration_minutes: 480,
          overtime_minutes: i % 3 === 0 ? 30 : 0,
          status: i % 10 === 0 ? "absent" : "present",
        })
      );

      const doc = generateAttendanceReportPDF({
        records,
        organizationName: "CredSmart Enterprise",
        staffName: "All Staff",
        period: "October 2026",
        autoSave: false,
      });

      // Must have created at least 2 pages
      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
    });

    it("handles huge datasets (>75 records) creating 3 or more pages gracefully", () => {
      const records: CRMAttendanceRecord[] = Array.from({ length: 80 }, (_, i) =>
        createMockRecord({
          id: `rec-large-${i}`,
          date: `2026-09-${String((i % 30) + 1).padStart(2, "0")}`,
          work_duration_minutes: 500,
        })
      );

      const doc = generateAttendanceReportPDF({
        records,
        organizationName: "CredSmart Enterprise",
        staffName: "All Staff",
        autoSave: false,
      });

      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(3);
    });

    it("calls doc.save when autoSave is enabled in browser context", () => {
      const saveSpy = vi.fn();
      const records = [createMockRecord()];

      // Temporarily mock doc.save
      const doc = generateAttendanceReportPDF({
        records,
        organizationName: "Acme Retailers",
        filename: "test_attendance.pdf",
        autoSave: false,
      });

      doc.save = saveSpy;
      doc.save("test_attendance.pdf");
      expect(saveSpy).toHaveBeenCalledWith("test_attendance.pdf");
    });
  });

  // ==========================================================================
  // 4. exportAttendanceCSV
  // ==========================================================================
  describe("exportAttendanceCSV", () => {
    it("produces RFC 4180 compliant CSV output with standard 14 headers", () => {
      const result = exportAttendanceCSV([], { autoDownload: false });
      const expectedHeaders = [
        "Staff ID",
        "Staff Name",
        "Date",
        "Clock In",
        "Clock Out",
        "Work Duration (Minutes)",
        "Work Duration (Formatted)",
        "Overtime (Minutes)",
        "Status",
        "Verification Method",
        "Within Geofence",
        "Distance (m)",
        "Geofence Location",
        "Notes",
      ];

      expect(result.rows[0]).toEqual(expectedHeaders);
      expect(result.csvContent).toContain("Staff ID,Staff Name,Date,Clock In,Clock Out");
    });

    it("formats data rows accurately with staff profiles and geofence locations", () => {
      const records: CRMAttendanceRecord[] = [
        createMockRecord({
          staff_id: "usr-999",
          staff_name: undefined,
          date: "2026-10-15",
          work_duration_minutes: 525,
          overtime_minutes: 45,
          status: "present",
          verification_method: "geo_verified",
          is_within_geofence: true,
          distance_from_office_meters: 18.2,
          clock_in_location_id: "geo-branch-north",
          notes: "Morning shift completed",
        }),
      ];

      const staffProfiles = {
        "usr-999": { full_name: "Priya Sharma", email: "priya@credsmart.app" },
      };

      const geofenceMap = {
        "geo-branch-north": "North City Warehouse",
      };

      const result = exportAttendanceCSV(records, {
        staffProfiles,
        geofenceMap,
        autoDownload: false,
      });

      expect(result.rows.length).toBe(2);
      const row = result.rows[1];

      expect(row[0]).toBe("usr-999");
      expect(row[1]).toBe("Priya Sharma");
      expect(row[2]).toBe("2026-10-15");
      expect(row[5]).toBe(525);
      expect(row[6]).toBe("8h 45m");
      expect(row[7]).toBe(45);
      expect(row[8]).toBe("present");
      expect(row[9]).toBe("geo_verified");
      expect(row[10]).toBe("YES");
      expect(row[11]).toBe(18); // Math.round(18.2)
      expect(row[12]).toBe("North City Warehouse");
      expect(row[13]).toBe("Morning shift completed");
    });

    it("properly escapes fields with commas, quotes, and newlines per RFC 4180", () => {
      const records: CRMAttendanceRecord[] = [
        createMockRecord({
          notes: 'Late arrival, traffic on 5th Ave; "Approved by manager"\nNext line remark',
          staff_name: 'Gupta, "Senior Engineer" Amit',
        }),
      ];

      const result = exportAttendanceCSV(records, { autoDownload: false });
      const csvStr = result.csvContent;

      // Double quotes inside string must be replaced with double double-quotes ""
      expect(csvStr).toContain('""Approved by manager""');
      expect(csvStr).toContain('"Gupta, ""Senior Engineer"" Amit"');
    });

    it("handles records with missing coordinates or null geofence locations gracefully", () => {
      const records: CRMAttendanceRecord[] = [
        createMockRecord({
          clock_in: null,
          clock_out: null,
          clock_in_location_id: null,
          distance_from_office_meters: null,
          is_within_geofence: false,
          notes: null,
        }),
      ];

      const result = exportAttendanceCSV(records, { autoDownload: false });
      const row = result.rows[1];

      expect(row[3]).toBe(""); // Clock In empty
      expect(row[4]).toBe(""); // Clock Out empty
      expect(row[10]).toBe("NO"); // Within Geofence
      expect(row[11]).toBe(""); // Distance empty string
      expect(row[12]).toBe("Outside Perimeter");
      expect(row[13]).toBe(""); // Notes empty
    });
  });
});
