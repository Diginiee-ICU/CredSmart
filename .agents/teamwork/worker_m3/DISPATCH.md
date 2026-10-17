## 2026-10-17T10:29:19Z
You are worker_m3 for CRM Phase 2 Milestone 3: Attendance UI & Clock-In Hub.
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m3

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY: Read ORIGINAL_REQUEST.md at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (specifically section ## 2026-10-17T08:52:11Z) before doing any work.
Also read DISPATCH.md at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase2\DISPATCH.md.
Also read survey_explorer_2's architectural blueprint at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_2\analysis.md (which details the exact component structure, CRM tokens, and responsive layout).

Your exclusive write ownership:
- src/pages/crm/Attendance.tsx
- src/test/crmAttendance.test.tsx

Tasks to execute:
1. Implement src/pages/crm/Attendance.tsx:
   - Built with CredSmart CRM design system in src/components/crm/ (CRMPageHeader, CRMCard, CRMBadge, CRMDataTable, CRMStatCard, CRMPermissionGate, CRMRolePill).
   - Integrated with RBAC: useCRMPermission("attendance", "view") and useCRMPermission("attendance", "edit").
   - Integrated with Geo Engine: calculateHaversineDistance, isWithinGeofence, findNearestGeofence, getCurrentPosition from src/utils/crmGeoUtils.ts.
   - Staff Clock-In / Clock-Out Pod:
     - Live digital time display updating every second.
     - Live GPS status indicator ("Acquiring GPS...", "Within Geofence ✓" in emerald, "Outside Geofence ⚠️" in orange/amber).
     - Distance radar / preview showing distance in meters to nearest office geofence.
     - Single touch-optimized action button:
       - If not clocked in today: Emerald #10B981 "Clock In" button. On click: acquires GPS position, determines if within geofence, inserts/upserts record into crm_attendance with verification_method ('geo_verified' if within, 'manual' if outside), and starts work session.
       - If clocked in: Orange #FF6A00 "Clock Out" button. Displays active ticking elapsed work timer (HH:MM:SS) since clock-in. On click: acquires GPS position, calculates work_duration_minutes, calculates overtime_minutes, and updates record.
   - Admin Attendance Oversight:
     - Summary stat cards: Present Today, Geo-Verified, Manual/Pending Regularisation, Total Locations.
     - Daily Attendance Table using CRMDataTable with search filter, date filter, status badges, verification method badges.
     - Geofence Management Modal: add/edit office locations (name, lat, lon, radius_meters) with "Use My Current Location" button.
     - Regularisation Request & Approval Modal: request punch correction and approve/reject pending requests.
   - Fully responsive design on mobile (375px) and desktop (1280px).
2. Create src/test/crmAttendance.test.tsx:
   - Unit tests covering:
     - Attendance page renders with CRMPageHeader and PermissionGate.
     - Staff pod displays digital clock, GPS status indicator, and Clock In button.
     - Clock In triggers getCurrentPosition and updates attendance state.
     - Active clock-in displays elapsed timer and Clock Out button.
     - Clock Out calculates duration and completes session.
     - Geofence Management Modal opens and allows adding a new office geofence.
     - Regularisation modal opens and allows submitting correction request.
     - Admin table renders columns with CRMDataTable.
     - Gating blocks unauthorized views if permission is denied.
3. Run verification commands:
   - cmd /c npx tsc --noEmit
   - npm.cmd test -- src/test/crmAttendance.test.tsx --run
   - npm.cmd test -- src/test/crmGeoUtils.test.ts --run

Write your handoff report to c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m3\handoff.md and notify orchestrator.
