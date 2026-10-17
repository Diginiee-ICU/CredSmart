/**
 * EMPIRICAL STRESS TEST SUITE: CRM Phase 2 Attendance Reports & PDF/CSV Export Engine
 * Author: challenger_m4_1
 *
 * Stress-tests `calculateMonthlyAttendanceMetrics`, `generateAttendanceReportPDF`, and `exportAttendanceCSV`
 * under extreme boundary conditions, large datasets, float precision, and malformed inputs.
 */

import { describe, it, expect } from "vitest";
import {
  calculateMonthlyAttendanceMetrics,
  generateAttendanceReportPDF,
  exportAttendanceCSV,
  formatMinutesToHM,
  formatTimeDisplay,
} from "@/utils/crmAttendancePdf";
import type { CRMAttendanceRecord } from "@/types/crmAttendance";

const makeRecord = (overrides: Partial<CRMAttendanceRecord> = {}): CRMAttendanceRecord => ({
  id: "rec-" + Math.random().toString(36).substring(2, 9),
  org_id: "org-stress-01",
  staff_id: "usr-stress-01",
  staff_name: "Test Staff",
  staff_email: "staff@test.com",
  date: "2026-10-01",
  clock_in: "2026-10-01T09:00:00Z",
  clock_out: "2026-10-01T18:00:00Z",
  clock_in_latitude: 12.9716,
  clock_in_longitude: 77.5946,
  clock_in_accuracy: 10,
  clock_out_latitude: 12.9716,
  clock_out_longitude: 77.5946,
  clock_out_accuracy: 10,
  clock_in_location_id: "loc-01",
  clock_out_location_id: "loc-01",
  status: "present",
  verification_method: "geo_verified",
  is_within_geofence: true,
  distance_from_office_meters: 15.0,
  work_duration_minutes: 480,
  overtime_minutes: 60,
  notes: "Standard day",
  created_at: "2026-10-01T09:00:00Z",
  updated_at: "2026-10-01T18:00:00Z",
  ...overrides,
});

describe("Empirical Challenger Stress Suite: calculateMonthlyAttendanceMetrics", () => {
  // ==========================================================================
  // Task 1.1: Empty arrays, null/undefined fields, zero duration records
  // ==========================================================================
  describe("1.1 Empty arrays, null/undefined fields, and zero durations", () => {
    it("handles empty array correctly", () => {
      const res = calculateMonthlyAttendanceMetrics([]);
      expect(res).toEqual({
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

    it("handles non-array inputs defensively without throwing", () => {
      // @ts-expect-error Testing non-array defensive guards
      expect(calculateMonthlyAttendanceMetrics(null).totalDays).toBe(0);
      // @ts-expect-error Testing undefined
      expect(calculateMonthlyAttendanceMetrics(undefined).totalDays).toBe(0);
      // @ts-expect-error Testing boolean
      expect(calculateMonthlyAttendanceMetrics(false).totalDays).toBe(0);
      // @ts-expect-error Testing string
      expect(calculateMonthlyAttendanceMetrics("not-an-array").totalDays).toBe(0);
      // @ts-expect-error Testing plain object
      expect(calculateMonthlyAttendanceMetrics({}).totalDays).toBe(0);
    });

    it("handles records with zero work_duration_minutes and zero overtime_minutes", () => {
      const zeroRecords: CRMAttendanceRecord[] = [
        makeRecord({ work_duration_minutes: 0, overtime_minutes: 0 }),
        makeRecord({ work_duration_minutes: 0, overtime_minutes: 0, status: "absent" }),
      ];

      const res = calculateMonthlyAttendanceMetrics(zeroRecords);
      expect(res.totalDays).toBe(2);
      expect(res.totalWorkMinutes).toBe(0);
      expect(res.totalWorkHours).toBe(0);
      expect(res.totalOvertimeMinutes).toBe(0);
      expect(res.totalOvertimeHours).toBe(0);
      expect(res.presentDays).toBe(1);
      expect(res.absentDays).toBe(1);
    });

    it("handles null and undefined fields in individual records without crashing", () => {
      const recordsWithNulls: CRMAttendanceRecord[] = [
        makeRecord({
          // @ts-expect-error Testing null field resilience
          work_duration_minutes: null,
          // @ts-expect-error Testing undefined field resilience
          overtime_minutes: undefined,
          // @ts-expect-error Testing undefined status
          status: undefined,
          // @ts-expect-error Testing undefined verification
          verification_method: undefined,
        }),
        makeRecord({
          // @ts-expect-error Testing non-numeric string
          work_duration_minutes: "invalid_minutes",
          // @ts-expect-error Testing NaN
          overtime_minutes: NaN,
        }),
        makeRecord({
          // @ts-expect-error Testing negative durations
          work_duration_minutes: -100,
          overtime_minutes: -50,
        }),
        // Minimal empty object
        // @ts-expect-error Testing bare minimum record
        {},
      ];

      const res = calculateMonthlyAttendanceMetrics(recordsWithNulls);
      expect(res.totalDays).toBe(4);
      expect(res.totalWorkMinutes).toBe(0);
      expect(res.totalWorkHours).toBe(0);
      expect(res.totalOvertimeMinutes).toBe(0);
      expect(res.totalOvertimeHours).toBe(0);
      expect(Number.isNaN(res.totalWorkHours)).toBe(false);
      expect(Number.isNaN(res.totalOvertimeHours)).toBe(false);
    });
  });

  // ==========================================================================
  // Task 1.2: Large month datasets (31 days with mixed statuses)
  // ==========================================================================
  describe("1.2 Realistic and Large 31-day month datasets with mixed statuses", () => {
    it("accurately calculates exact sums for a standard 31-day calendar month", () => {
      // 31 days breakdown:
      // 20 Present days (each 480 mins work, 30 mins overtime)
      // 4 Absent days (0 mins work, 0 mins overtime)
      // 4 Half-days (each 240 mins work, 0 mins overtime)
      // 3 On-leave days (each 0 mins work, 0 mins overtime)
      // Verification: 22 geo_verified, 5 manual, 4 regularized
      const records: CRMAttendanceRecord[] = [];

      for (let day = 1; day <= 31; day++) {
        let status: CRMAttendanceRecord["status"] = "present";
        let workMins = 480;
        let otMins = 30;
        let method: CRMAttendanceRecord["verification_method"] = "geo_verified";

        if (day <= 20) {
          status = "present";
          workMins = 480;
          otMins = 30;
          method = day <= 15 ? "geo_verified" : "manual";
        } else if (day <= 24) {
          status = "absent";
          workMins = 0;
          otMins = 0;
          method = "manual"; // 4 absent, manual
        } else if (day <= 28) {
          status = "half_day";
          workMins = 240;
          otMins = 0;
          method = "regularized"; // 4 half_day, regularized
        } else {
          status = "on_leave";
          workMins = 0;
          otMins = 0;
          method = "geo_verified"; // 3 on_leave
        }

        records.push(
          makeRecord({
            date: `2026-10-${String(day).padStart(2, "0")}`,
            status,
            work_duration_minutes: workMins,
            overtime_minutes: otMins,
            verification_method: method,
          })
        );
      }

      const res = calculateMonthlyAttendanceMetrics(records);

      expect(res.totalDays).toBe(31);
      expect(res.presentDays).toBe(20);
      expect(res.absentDays).toBe(4);
      expect(res.halfDays).toBe(4);
      expect(res.onLeaveDays).toBe(3);

      // Expected work minutes: 20 * 480 + 4 * 240 = 9600 + 960 = 10560 mins
      expect(res.totalWorkMinutes).toBe(10560);
      // Expected work hours: 10560 / 60 = 176.0 hours
      expect(res.totalWorkHours).toBe(176.0);

      // Expected overtime minutes: 20 * 30 = 600 mins
      expect(res.totalOvertimeMinutes).toBe(600);
      // Expected overtime hours: 600 / 60 = 10.0 hours
      expect(res.totalOvertimeHours).toBe(10.0);

      // Verification counts:
      // geo_verified: 15 (present) + 3 (on_leave) = 18
      // manual: 5 (present) + 4 (absent) = 9
      // regularized: 4 (half_day) = 4
      expect(res.geoVerifiedCount).toBe(18);
      expect(res.manualCount).toBe(9);
      expect(res.regularizedCount).toBe(4);
      expect(res.geoVerifiedCount + res.manualCount + res.regularizedCount).toBe(31);
    });

    it("stress-tests 365 days multi-employee dataset (3650 records)", () => {
      // 10 employees x 365 days
      const largeRecords: CRMAttendanceRecord[] = [];
      let expectedWorkMins = 0;
      let expectedOtMins = 0;
      let expectedPresent = 0;
      let expectedAbsent = 0;

      for (let i = 0; i < 3650; i++) {
        const isPresent = i % 5 !== 0;
        const workMins = isPresent ? 450 : 0;
        const otMins = isPresent && i % 3 === 0 ? 45 : 0;

        if (isPresent) {
          expectedPresent++;
          expectedWorkMins += workMins;
          if (otMins > 0) expectedOtMins += otMins;
        } else {
          expectedAbsent++;
        }

        largeRecords.push(
          makeRecord({
            id: `large-rec-${i}`,
            staff_id: `usr-${i % 10}`,
            status: isPresent ? "present" : "absent",
            work_duration_minutes: workMins,
            overtime_minutes: otMins,
            verification_method: i % 2 === 0 ? "geo_verified" : "manual",
          })
        );
      }

      const res = calculateMonthlyAttendanceMetrics(largeRecords);

      expect(res.totalDays).toBe(3650);
      expect(res.presentDays).toBe(expectedPresent);
      expect(res.absentDays).toBe(expectedAbsent);
      expect(res.totalWorkMinutes).toBe(expectedWorkMins);
      expect(res.totalOvertimeMinutes).toBe(expectedOtMins);
      expect(res.totalWorkHours).toBe(Math.round((expectedWorkMins / 60) * 10) / 10);
      expect(res.totalOvertimeHours).toBe(Math.round((expectedOtMins / 60) * 10) / 10);
    });
  });

  // ==========================================================================
  // Task 1.3: High overtime accumulation and rounding precision
  // ==========================================================================
  describe("1.3 High overtime accumulation and decimal rounding precision", () => {
    it("handles high overtime accumulation (e.g. 50,000 minutes) without overflow", () => {
      const records: CRMAttendanceRecord[] = [
        makeRecord({ work_duration_minutes: 50000, overtime_minutes: 25000 }),
        makeRecord({ work_duration_minutes: 30000, overtime_minutes: 15000 }),
      ];

      const res = calculateMonthlyAttendanceMetrics(records);
      expect(res.totalWorkMinutes).toBe(80000);
      expect(res.totalOvertimeMinutes).toBe(40000);
      // 80000 / 60 = 1333.3333... -> 1333.3
      expect(res.totalWorkHours).toBe(1333.3);
      // 40000 / 60 = 666.6666... -> 666.7
      expect(res.totalOvertimeHours).toBe(666.7);
    });

    it("systematically verifies 1-decimal rounding across all remainder minute offsets (0..59 mins)", () => {
      // Test every remainder minute from 0 to 59 to verify consistent round-half-up behavior
      for (let mins = 0; mins < 60; mins++) {
        const totalMins = 480 + mins; // 8h + remainder
        const records = [makeRecord({ work_duration_minutes: totalMins, overtime_minutes: mins })];
        const res = calculateMonthlyAttendanceMetrics(records);

        const expectedWorkHours = Math.round((totalMins / 60) * 10) / 10;
        const expectedOtHours = Math.round((mins / 60) * 10) / 10;

        expect(res.totalWorkHours).toBe(expectedWorkHours);
        expect(res.totalOvertimeHours).toBe(expectedOtHours);

        // Ensure resulting number has at most 1 decimal place
        const strWork = res.totalWorkHours.toString();
        const strOt = res.totalOvertimeHours.toString();
        const workDecimals = strWork.includes(".") ? strWork.split(".")[1].length : 0;
        const otDecimals = strOt.includes(".") ? strOt.split(".")[1].length : 0;

        expect(workDecimals).toBeLessThanOrEqual(1);
        expect(otDecimals).toBeLessThanOrEqual(1);
      }
    });

    it("verifies specific rounding edge cases (e.g., 3 mins = 0.1h, 2 mins = 0h, 5 mins = 0.1h)", () => {
      // 2 mins: 2/60 = 0.0333 * 10 = 0.333 -> round = 0 -> 0.0h
      expect(calculateMonthlyAttendanceMetrics([makeRecord({ work_duration_minutes: 2 })]).totalWorkHours).toBe(0);
      // 3 mins: 3/60 = 0.05 * 10 = 0.5 -> round = 1 -> 0.1h
      expect(calculateMonthlyAttendanceMetrics([makeRecord({ work_duration_minutes: 3 })]).totalWorkHours).toBe(0.1);
      // 57 mins: 57/60 = 0.95 * 10 = 9.5 -> round = 10 -> 1.0h
      expect(calculateMonthlyAttendanceMetrics([makeRecord({ work_duration_minutes: 57 })]).totalWorkHours).toBe(1);
    });
  });

  // ==========================================================================
  // Task 1.4: Verification method breakdown (geo_verified, manual, regularized)
  // ==========================================================================
  describe("1.4 Verification method breakdown and unknown fallback", () => {
    it("correctly breaks down all three supported verification methods", () => {
      const records: CRMAttendanceRecord[] = [
        makeRecord({ verification_method: "geo_verified" }),
        makeRecord({ verification_method: "geo_verified" }),
        makeRecord({ verification_method: "geo_verified" }),
        makeRecord({ verification_method: "manual" }),
        makeRecord({ verification_method: "manual" }),
        makeRecord({ verification_method: "regularized" }),
      ];

      const res = calculateMonthlyAttendanceMetrics(records);
      expect(res.geoVerifiedCount).toBe(3);
      expect(res.manualCount).toBe(2);
      expect(res.regularizedCount).toBe(1);
    });

    it("handles unknown or foreign verification methods gracefully without corrupting counts", () => {
      const records: CRMAttendanceRecord[] = [
        makeRecord({ verification_method: "geo_verified" }),
        // @ts-expect-error Simulating legacy or external sync method
        makeRecord({ verification_method: "biometric_fingerprint" }),
        // @ts-expect-error Simulating null method
        makeRecord({ verification_method: null }),
        // @ts-expect-error Simulating empty string
        makeRecord({ verification_method: "" }),
      ];

      const res = calculateMonthlyAttendanceMetrics(records);
      expect(res.totalDays).toBe(4);
      expect(res.geoVerifiedCount).toBe(1);
      expect(res.manualCount).toBe(0);
      expect(res.regularizedCount).toBe(0);
    });
  });

  // ==========================================================================
  // Additional Empirical Stress: PDF & CSV generation on stressed inputs
  // ==========================================================================
  describe("1.5 Stress testing PDF and CSV generation on boundary datasets", () => {
    it("generates multi-page PDF on 31-day mixed dataset without errors", () => {
      const records = Array.from({ length: 31 }, (_, i) =>
        makeRecord({
          date: `2026-10-${String(i + 1).padStart(2, "0")}`,
          status: i % 4 === 0 ? "absent" : "present",
          work_duration_minutes: i % 4 === 0 ? 0 : 480,
          overtime_minutes: i % 4 === 0 ? 0 : 30,
        })
      );

      const doc = generateAttendanceReportPDF({
        records,
        organizationName: "Empirical Challenge Org",
        period: "October 2026",
        autoSave: false,
      });

      expect(doc).toBeDefined();
      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    });

    it("exports CSV with 31 rows and correctly formatted columns", () => {
      const records = Array.from({ length: 31 }, (_, i) =>
        makeRecord({
          date: `2026-10-${String(i + 1).padStart(2, "0")}`,
          notes: i % 2 === 0 ? 'Normal "quoted" note, with comma' : "Standard note",
        })
      );

      const result = exportAttendanceCSV(records, { autoDownload: false });
      expect(result.rows.length).toBe(32);
      expect(result.csvContent).toContain("Staff ID,Staff Name,Date");
      // Header + 31 rows = 32 lines
      const lines = result.csvContent.trim().split("\n");
      expect(lines.length).toBe(32);
    });
  });
});
