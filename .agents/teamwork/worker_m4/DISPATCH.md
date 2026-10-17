## 2026-10-17T11:37:11Z
You are worker_m4 for CRM Phase 2 Milestone 4: Attendance Reports & PDF/CSV Export.
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY: Read ORIGINAL_REQUEST.md at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (specifically section ## 2026-10-17T08:52:11Z) before doing any work.
Also read DISPATCH.md at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase2\DISPATCH.md.
Also read spec miner survey findings at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\spec_miner_survey_3\handoff.md.

Your write ownership:
- src/utils/crmAttendancePdf.ts (new file)
- src/pages/crm/Attendance.tsx (wire export buttons and callbacks)
- src/test/crmAttendancePdf.test.ts (new test suite)
- src/test/crmAttendance.test.tsx (ensure existing export tests integrate seamlessly)

Requirements to implement:
1. Create `src/utils/crmAttendancePdf.ts`:
   - `calculateMonthlyAttendanceMetrics(records: CRMAttendanceRecord[])`:
     - Returns: totalDays, presentDays, absentDays, halfDays, onLeaveDays, totalWorkMinutes, totalWorkHours (rounded to 1 decimal), totalOvertimeMinutes, totalOvertimeHours (rounded to 1 decimal), geoVerifiedCount, manualCount, regularizedCount.
   - `generateAttendanceReportPDF(options: AttendanceReportPdfOptions)`:
     - Pure vector jsPDF (`import { jsPDF } from "jspdf"`).
     - **CRITICAL**: `jspdf-autotable` is NOT installed in package.json. DO NOT IMPORT `jspdf-autotable`.
     - Use programmatic vector primitives (`doc.rect()`, `doc.text()`, `doc.setFillColor()`, `doc.setTextColor()`, `doc.addPage()`, `doc.save()`) following the clean pattern in `src/utils/whatsappPdfShare.ts`.
     - Design with CredSmart CRM brand tokens: Navy (`[15, 23, 42]`), Orange (`[255, 106, 0]`), Emerald (`[16, 185, 129]`), Slate (`[100, 116, 139]`), Light Slate (`[241, 245, 249]`).
     - Header: CredSmart by CredAlert Attendance & Shift Summary Report, Organization Name, Staff Member (or "All Staff"), Month & Year, Generated timestamp.
     - Metric Summary KPI Cards: Present, Absent, Half Day, Work Hours, Overtime Hours.
     - Table of attendance records: Date, Clock In, Clock Out, Duration, Status, Verification Method (Geo-Verified, Manual, Regularized), Overtime.
     - Pagination: calculate row height and call `doc.addPage()` with clean header continuation if records span multiple pages.
     - Footer: Page X of Y, Confidential CredSmart CRM Report.
     - Returns the `jsPDF` instance or Blob, and calls `doc.save(filename)` if running in browser context.
   - `exportAttendanceCSV(records: CRMAttendanceRecord[], options?: { filename?: string; staffProfiles?: Record<string, { full_name?: string; email?: string }>; geofenceMap?: Record<string, string> })`:
     - Formats rows with columns: Staff ID, Staff Name, Date, Clock In, Clock Out, Work Duration (Minutes), Work Duration (Formatted), Overtime (Minutes), Status, Verification Method, Within Geofence, Distance (m), Geofence Location, Notes.
     - Uses `exportToCSV(filename, rows)` from `src/lib/utils.ts` or creates Blob download.
2. In `src/pages/crm/Attendance.tsx`:
   - In the Admin Team Attendance table toolbar (or table header actions alongside date/status/role filters), ensure "Export PDF" and "Export CSV" buttons are present and wired to call `generateAttendanceReportPDF` and `exportAttendanceCSV` using the current `filteredLogs`, organization name, staff profiles, and geofences.
3. Create comprehensive test suite `src/test/crmAttendancePdf.test.ts`:
   - Unit tests for `calculateMonthlyAttendanceMetrics`:
     - Empty array returns zeroes.
     - Present, absent, half_day, on_leave counts.
     - Work duration & overtime accumulation.
     - Verification method breakdown (geo_verified, manual, regularized).
   - Tests for `generateAttendanceReportPDF`:
     - Generates valid PDF doc with jsPDF.
     - Supports multi-page pagination for >30 records without crashing.
     - Handles empty records gracefully.
   - Tests for `exportAttendanceCSV`:
     - Produces RFC 4180 compliant CSV rows with escaped fields.
4. Run verification:
   - cmd /c npx tsc --noEmit
   - npm.cmd test -- src/test/crmAttendancePdf.test.ts --run
   - npm.cmd test -- src/test/crmAttendance.test.tsx --run
   - npm.cmd test -- crm --run
   Ensure 100% pass with 0 errors.

Write your handoff report to c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4\handoff.md and notify orchestrator.
