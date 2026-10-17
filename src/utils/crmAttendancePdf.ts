/**
 * CredSmart CRM Phase 2: Attendance Reports & PDF/CSV Export Engine
 * Pure vector jsPDF and RFC 4180 CSV export implementation for attendance tracking,
 * shift compliance, and payroll ingestion.
 */

import { jsPDF } from "jspdf";
import { exportToCSV } from "@/lib/utils";
import type { CRMAttendanceRecord } from "@/types/crmAttendance";

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface MonthlyAttendanceMetrics {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  onLeaveDays: number;
  totalWorkMinutes: number;
  totalWorkHours: number;
  totalOvertimeMinutes: number;
  totalOvertimeHours: number;
  geoVerifiedCount: number;
  manualCount: number;
  regularizedCount: number;
}

export interface AttendanceReportPdfOptions {
  records: CRMAttendanceRecord[];
  organizationName?: string;
  staffName?: string;
  staffEmail?: string;
  month?: string;
  year?: string | number;
  period?: string;
  staffProfiles?: Record<string, { full_name?: string; email?: string; name?: string }>;
  geofenceMap?: Record<string, string>;
  filename?: string;
  autoSave?: boolean;
}

export interface ExportAttendanceCsvOptions {
  filename?: string;
  staffProfiles?: Record<string, { full_name?: string; email?: string; name?: string }>;
  geofenceMap?: Record<string, string>;
  autoDownload?: boolean;
}

// ============================================================================
// Design Tokens (CredSmart CRM Brand Palette)
// ============================================================================

export const BRAND_COLORS = {
  navy: [15, 23, 42] as [number, number, number],       // #0F172A
  orange: [255, 106, 0] as [number, number, number],    // #FF6A00
  emerald: [16, 185, 129] as [number, number, number],  // #10B981
  slate: [100, 116, 139] as [number, number, number],   // #64748B
  lightSlate: [241, 245, 249] as [number, number, number], // #F1F5F9
  softSlate: [248, 250, 252] as [number, number, number],  // #F8FAFC
  borderSlate: [226, 232, 240] as [number, number, number],// #E2E8F0
  gold: [245, 158, 11] as [number, number, number],     // #F59E0B
  blue: [29, 78, 216] as [number, number, number],      // #1D4ED8
  white: [255, 255, 255] as [number, number, number],
};

// ============================================================================
// Helper Utilities
// ============================================================================

export function formatMinutesToHM(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0) return "0m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatTimeDisplay(isoString: string | null): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch {
    return "—";
  }
}

// ============================================================================
// Metric Calculations
// ============================================================================

/**
 * Calculates monthly attendance aggregations, shift hours, overtime, and verification distribution.
 */
export function calculateMonthlyAttendanceMetrics(
  records: CRMAttendanceRecord[]
): MonthlyAttendanceMetrics {
  if (!Array.isArray(records) || records.length === 0) {
    return {
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
    };
  }

  let presentDays = 0;
  let absentDays = 0;
  let halfDays = 0;
  let onLeaveDays = 0;
  let totalWorkMinutes = 0;
  let totalOvertimeMinutes = 0;
  let geoVerifiedCount = 0;
  let manualCount = 0;
  let regularizedCount = 0;

  for (const record of records) {
    // Status counts
    if (record.status === "present") {
      presentDays++;
    } else if (record.status === "absent") {
      absentDays++;
    } else if (record.status === "half_day") {
      halfDays++;
    } else if (record.status === "on_leave") {
      onLeaveDays++;
    }

    // Work duration & overtime accumulation
    const workMins = Number(record.work_duration_minutes) || 0;
    if (workMins > 0) {
      totalWorkMinutes += workMins;
    }

    const otMins = Number(record.overtime_minutes) || 0;
    if (otMins > 0) {
      totalOvertimeMinutes += otMins;
    }

    // Verification method breakdown
    if (record.verification_method === "geo_verified") {
      geoVerifiedCount++;
    } else if (record.verification_method === "regularized") {
      regularizedCount++;
    } else if (record.verification_method === "manual") {
      manualCount++;
    }
  }

  const totalWorkHours = Math.round((totalWorkMinutes / 60) * 10) / 10;
  const totalOvertimeHours = Math.round((totalOvertimeMinutes / 60) * 10) / 10;

  return {
    totalDays: records.length,
    presentDays,
    absentDays,
    halfDays,
    onLeaveDays,
    totalWorkMinutes,
    totalWorkHours,
    totalOvertimeMinutes,
    totalOvertimeHours,
    geoVerifiedCount,
    manualCount,
    regularizedCount,
  };
}

// ============================================================================
// PDF Export Engine (Pure Vector jsPDF)
// ============================================================================

/**
 * Generates an executive attendance and shift summary PDF using programmatic
 * vector primitives matching CredSmart brand tokens.
 */
export function generateAttendanceReportPDF(options: AttendanceReportPdfOptions): jsPDF {
  const {
    records = [],
    organizationName = "CredSmart Business",
    staffName,
    month,
    year,
    period,
    staffProfiles = {},
    filename,
    autoSave = true,
  } = options;

  const safeRecords = Array.isArray(records) ? records : [];

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const metrics = calculateMonthlyAttendanceMetrics(safeRecords);
  const currentPeriod = period || (month && year ? `${month} ${year}` : new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" }));
  const resolvedStaff = staffName || "All Staff";
  const generatedTimestamp = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  // Check if multiple staff are present to adjust column layout
  const hasMultipleStaff =
    resolvedStaff === "All Staff" ||
    safeRecords.some((r, _, arr) => r.staff_id !== arr[0]?.staff_id);

  // Helper to draw primary top header banner on page 1
  const drawPage1Header = () => {
    // Top Navy Header Banner
    doc.setFillColor(...BRAND_COLORS.navy);
    doc.rect(0, 0, 210, 28, "F");

    // Orange Accent Line beneath header
    doc.setFillColor(...BRAND_COLORS.orange);
    doc.rect(0, 28, 210, 1.5, "F");

    // Document Title
    doc.setTextColor(...BRAND_COLORS.white);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("CredSmart by CredAlert Attendance & Shift Summary Report", 14, 12);

    // Organization & Metadata Subtitle
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(203, 213, 225); // Slate 300
    doc.text(
      `Organization: ${organizationName}   |   Staff: ${resolvedStaff}   |   Period: ${currentPeriod}   |   Generated: ${generatedTimestamp}`,
      14,
      20
    );
  };

  // Helper to draw compact continuation header on page 2+
  const drawContinuationHeader = (pageNumber: number) => {
    doc.setFillColor(...BRAND_COLORS.navy);
    doc.rect(0, 0, 210, 15, "F");

    doc.setFillColor(...BRAND_COLORS.orange);
    doc.rect(0, 15, 210, 1, "F");

    doc.setTextColor(...BRAND_COLORS.white);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.text(`CredSmart CRM — Attendance Report (Page ${pageNumber})`, 14, 9.5);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(203, 213, 225);
    doc.text(`${organizationName} • ${currentPeriod}`, 196, 9.5, { align: "right" });
  };

  // Helper to draw KPI summary cards
  const drawMetricCards = (startY: number) => {
    const cardY = startY;
    const cardHeight = 18;
    const totalWidth = 182;
    const cardGap = 3.5;
    const cardWidth = (totalWidth - cardGap * 4) / 5; // 33.6mm each

    const cards = [
      {
        label: "PRESENT",
        value: `${metrics.presentDays} days`,
        color: BRAND_COLORS.emerald,
      },
      {
        label: "ABSENT",
        value: `${metrics.absentDays} days`,
        color: BRAND_COLORS.orange,
      },
      {
        label: "HALF / LEAVE",
        value: `${metrics.halfDays} / ${metrics.onLeaveDays}`,
        color: BRAND_COLORS.gold,
      },
      {
        label: "WORK HOURS",
        value: `${metrics.totalWorkHours}h`,
        color: BRAND_COLORS.navy,
      },
      {
        label: "OVERTIME",
        value: `${metrics.totalOvertimeHours}h`,
        color: BRAND_COLORS.blue,
      },
    ];

    cards.forEach((card, idx) => {
      const cardX = 14 + idx * (cardWidth + cardGap);

      // Card Background & Border
      doc.setFillColor(...BRAND_COLORS.softSlate);
      doc.setDrawColor(...BRAND_COLORS.borderSlate);
      if (typeof doc.roundedRect === "function") {
        doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 1.5, 1.5, "FD");
      } else {
        doc.rect(cardX, cardY, cardWidth, cardHeight, "FD");
      }

      // Card Label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...BRAND_COLORS.slate);
      doc.text(card.label, cardX + 3.5, cardY + 5.5);

      // Card Value
      doc.setFontSize(10.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...card.color);
      doc.text(card.value, cardX + 3.5, cardY + 13.5);
    });
  };

  // Column Layout Definitions
  const colX = hasMultipleStaff
    ? {
        date: 16,
        staff: 38,
        clockIn: 76,
        clockOut: 98,
        duration: 120,
        status: 140,
        verification: 162,
        overtime: 184,
      }
    : {
        date: 16,
        staff: 16,
        clockIn: 45,
        clockOut: 72,
        duration: 98,
        status: 122,
        verification: 150,
        overtime: 180,
      };

  const drawTableHeader = (y: number) => {
    doc.setFillColor(...BRAND_COLORS.navy);
    doc.rect(14, y, 182, 7.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND_COLORS.white);

    if (hasMultipleStaff) {
      doc.text("Date", colX.date, y + 5);
      doc.text("Staff Member", colX.staff, y + 5);
      doc.text("Clock In", colX.clockIn, y + 5);
      doc.text("Clock Out", colX.clockOut, y + 5);
      doc.text("Duration", colX.duration, y + 5);
      doc.text("Status", colX.status, y + 5);
      doc.text("Verification", colX.verification, y + 5);
      doc.text("Overtime", colX.overtime, y + 5);
    } else {
      doc.text("Date", colX.date, y + 5);
      doc.text("Clock In", colX.clockIn, y + 5);
      doc.text("Clock Out", colX.clockOut, y + 5);
      doc.text("Duration", colX.duration, y + 5);
      doc.text("Status", colX.status, y + 5);
      doc.text("Verification", colX.verification, y + 5);
      doc.text("Overtime", colX.overtime, y + 5);
    }
  };

  // 1. Initial Page 1 Render
  drawPage1Header();
  drawMetricCards(34);

  let curY = 58;
  drawTableHeader(curY);
  curY += 7.5;

  // 2. Render Attendance Record Rows
  if (safeRecords.length === 0) {
    doc.setFillColor(...BRAND_COLORS.softSlate);
    doc.rect(14, curY, 182, 12, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND_COLORS.slate);
    doc.text("No attendance records found for the selected period.", 105, curY + 7.5, {
      align: "center",
    });
    curY += 12;
  } else {
    safeRecords.forEach((record, index) => {
      const rowHeight = 7;

      // Check pagination boundary
      if (curY + rowHeight > 275) {
        doc.addPage();
        const currentPage = typeof doc.getNumberOfPages === "function" ? doc.getNumberOfPages() : 2;
        drawContinuationHeader(currentPage);
        curY = 20;
        drawTableHeader(curY);
        curY += 7.5;
      }

      // Alternating row background
      if (index % 2 === 1) {
        doc.setFillColor(...BRAND_COLORS.softSlate);
        doc.rect(14, curY, 182, rowHeight, "F");
      }

      // Thin bottom border line
      doc.setDrawColor(...BRAND_COLORS.lightSlate);
      doc.line(14, curY + rowHeight, 196, curY + rowHeight);

      // Data Text Formatting
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);

      // Date
      doc.text(record.date || "—", colX.date, curY + 4.8);

      // Staff (if applicable)
      if (hasMultipleStaff) {
        const staffNameResolved =
          record.staff_name ||
          staffProfiles[record.staff_id]?.full_name ||
          staffProfiles[record.staff_id]?.name ||
          "Staff";
        const truncated =
          staffNameResolved.length > 18
            ? staffNameResolved.substring(0, 16) + "..."
            : staffNameResolved;
        doc.text(truncated, colX.staff, curY + 4.8);
      }

      // Clock In & Clock Out
      doc.text(formatTimeDisplay(record.clock_in), colX.clockIn, curY + 4.8);
      doc.text(formatTimeDisplay(record.clock_out), colX.clockOut, curY + 4.8);

      // Duration
      doc.text(formatMinutesToHM(record.work_duration_minutes), colX.duration, curY + 4.8);

      // Status Badge Text
      let statusLabel = "Present";
      let statusColor = BRAND_COLORS.emerald;
      if (record.status === "absent") {
        statusLabel = "Absent";
        statusColor = BRAND_COLORS.orange;
      } else if (record.status === "half_day") {
        statusLabel = "Half Day";
        statusColor = BRAND_COLORS.gold;
      } else if (record.status === "on_leave") {
        statusLabel = "On Leave";
        statusColor = BRAND_COLORS.blue;
      }

      doc.setFont("helvetica", "bold");
      doc.setTextColor(...statusColor);
      doc.text(statusLabel, colX.status, curY + 4.8);

      // Verification Method
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND_COLORS.slate);
      let verifLabel = "Manual";
      if (record.verification_method === "geo_verified") {
        verifLabel = "Geo-Verified";
      } else if (record.verification_method === "regularized") {
        verifLabel = "Regularized";
      }
      doc.text(verifLabel, colX.verification, curY + 4.8);

      // Overtime
      const otMins = record.overtime_minutes || 0;
      if (otMins > 0) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...BRAND_COLORS.navy);
        doc.text(`+${formatMinutesToHM(otMins)}`, colX.overtime, curY + 4.8);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...BRAND_COLORS.slate);
        doc.text("—", colX.overtime, curY + 4.8);
      }

      curY += rowHeight;
    });
  }

  // 3. Stamp Footers on All Pages
  const totalPages = typeof doc.getNumberOfPages === "function" ? doc.getNumberOfPages() : 1;
  for (let p = 1; p <= totalPages; p++) {
    if (typeof doc.setPage === "function") {
      doc.setPage(p);
    }

    doc.setDrawColor(...BRAND_COLORS.borderSlate);
    doc.line(14, 286, 196, 286);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND_COLORS.slate);
    doc.text("Confidential CredSmart CRM Report • Generated via CredSmart by CredAlert", 14, 291);
    doc.text(`Page ${p} of ${totalPages}`, 196, 291, { align: "right" });
  }

  // 4. Trigger Save if AutoSave is Enabled
  const outFilename =
    filename ||
    `CredSmart_Attendance_Report_${currentPeriod.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

  if (autoSave && typeof window !== "undefined" && typeof doc.save === "function") {
    try {
      doc.save(outFilename);
    } catch (saveErr) {
      console.warn("PDF auto-save failed in environment:", saveErr);
    }
  }

  return doc;
}

// ============================================================================
// CSV Export Engine (RFC 4180 Compliant)
// ============================================================================

/**
 * Exports detailed attendance records into an RFC 4180 compliant CSV format,
 * supporting external payroll calculators and HR compliance audits.
 */
export function exportAttendanceCSV(
  records: CRMAttendanceRecord[],
  options?: ExportAttendanceCsvOptions
): { csvContent: string; rows: (string | number)[][] } {
  const staffProfiles = options?.staffProfiles || {};
  const geofenceMap = options?.geofenceMap || {};
  const filename =
    options?.filename ||
    `CredSmart_Attendance_${new Date().toISOString().slice(0, 10)}.csv`;

  const headers = [
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

  const safeRecords = Array.isArray(records) ? records : [];

  const dataRows: (string | number)[][] = safeRecords.map((record) => {
    const staffName =
      record.staff_name ||
      staffProfiles[record.staff_id]?.full_name ||
      staffProfiles[record.staff_id]?.name ||
      "Staff";

    const clockInStr = record.clock_in
      ? new Date(record.clock_in).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      : "";

    const clockOutStr = record.clock_out
      ? new Date(record.clock_out).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      : "";

    const geofenceLocationName =
      (record.clock_in_location_id && geofenceMap[record.clock_in_location_id]) ||
      (record.is_within_geofence ? "Office HQ" : "Outside Perimeter");

    const distanceFormatted =
      record.distance_from_office_meters !== null &&
      record.distance_from_office_meters !== undefined
        ? Math.round(record.distance_from_office_meters)
        : "";

    return [
      record.staff_id || "",
      staffName,
      record.date || "",
      clockInStr,
      clockOutStr,
      record.work_duration_minutes ?? 0,
      formatMinutesToHM(record.work_duration_minutes ?? 0),
      record.overtime_minutes ?? 0,
      record.status || "present",
      record.verification_method || "manual",
      record.is_within_geofence ? "YES" : "NO",
      distanceFormatted,
      geofenceLocationName,
      record.notes || "",
    ];
  });

  const fullGrid: (string | number)[][] = [headers, ...dataRows];

  // Build RFC 4180 CSV string
  const formatCell = (val: string | number | null | undefined): string => {
    const str = String(val === null || val === undefined ? "" : val);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = fullGrid.map((row) => row.map(formatCell).join(",")).join("\r\n");

  // Trigger download if not explicitly disabled and running in DOM
  if (options?.autoDownload !== false && typeof window !== "undefined") {
    try {
      exportToCSV(filename, fullGrid);
    } catch {
      // Fallback Blob download if exportToCSV faces JSDOM constraints
      try {
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (blobErr) {
        console.warn("Direct blob download fallback failed:", blobErr);
      }
    }
  }

  return {
    csvContent,
    rows: fullGrid,
  };
}
