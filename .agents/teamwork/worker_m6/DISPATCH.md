# Task Assignment: CRM Phase 2 Milestone 6 — Reusable Skill Documentation

## Objectives
Author the comprehensive, reusable engineering skill `.agents/skills/crm-attendance-skill/SKILL.md` documenting:
1. DDL Schema and CHECK constraint specifications for `crm_geolocations`, `crm_attendance`, and `crm_attendance_requests`.
2. Haversine mathematical constants and clamping rules.
3. Work duration, shift completion, and overtime calculation rules.
4. Geofence evaluation and fallback verification methods (`geo_verified` vs `manual` vs `regularized`).
5. Phase 3 Payroll & Salary integration guidelines.
6. Permissions matrix and gating conventions for the attendance module.
7. Pure vector jsPDF export standard and CSV export specification.
8. Testing and verification standards.

## Integrity Warning
DO NOT CHEAT. All implementations and documentation must be genuine. A teamwork_preview_auditor will independently verify your work.

## 2026-10-17T17:33:12Z
You are worker_m6 for CRM Phase 2 Milestone 6: Reusable Skill Documentation.
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m6

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY: Read ORIGINAL_REQUEST.md at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (specifically section ## 2026-10-17T08:52:11Z) before doing any work.
Also read DISPATCH.md at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m6\DISPATCH.md.
Also read reference skill at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\crm-rbac-skill\SKILL.md to match the authoritative tone, frontmatter structure, code block depth, and architecture standards.

Your write ownership:
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\crm-attendance-skill\SKILL.md

Tasks to execute:
Author `.agents/skills/crm-attendance-skill/SKILL.md` with YAML frontmatter:
```yaml
---
name: crm-attendance-skill
description: Authoritative architecture, database schema, Haversine geo-engine, shift calculations, payroll integration guidelines, and developer reference for CredSmart CRM Phase 2 Attendance & Geo-location tracking.
---
```

Include detailed, production-grade documentation across all 8 core domains:
1. Architecture Overview:
   - Complete end-to-end data flow: GPS Acquisition -> Haversine engine -> Geofence validation -> Supabase upsert (`crm_attendance`) -> Admin oversight / PDF reports / Phase 3 Payroll integration.
   - Core invariants: zero hardcoded coordinates, resilient localStorage fallbacks, dual-role interface (Staff Clock-In pod vs Admin Oversight).
2. Database Schema & Integrity Constraints:
   - DDL specifications from `supabase/migrations/20261017010000_create_crm_attendance_tables.sql`:
     - `public.crm_geolocations`: schema, coordinates, radius, indexes, RLS `has_org_access(org_id)`.
     - `public.crm_attendance`: schema, CHECK constraint `chk_crm_attendance_status ('present', 'absent', 'half_day', 'on_leave')`, CHECK constraint `chk_crm_attendance_verification ('geo_verified', 'manual', 'regularized')`, unique constraint `uq_crm_attendance_staff_date (org_id, staff_id, date)`, trigger `update_crm_attendance_updated_at`.
     - `public.crm_attendance_requests`: regularisation schema and workflow.
   - Strict TypeScript entities (`CRMAttendanceRecord`, `CRMGeolocation`, `CRMAttendanceRequest`, `CRMShiftMetrics`).
3. Haversine Formula & Geofencing Math Engine:
   - Exact mathematical formula with Earth radius constant $R = 6,371,000$ meters.
   - Boundary clamping rules ($[-90, 90]$ latitude, $[-180, 180]$ longitude).
   - Functions: `calculateHaversineDistance`, `isWithinGeofence`, `findNearestGeofence`.
   - Browser Geolocation API wrapper: W3C error codes (PERMISSION_DENIED, POSITION_UNAVAILABLE, TIMEOUT), timeout defaults (10,000ms), high accuracy flag, localStorage fallback coordinates.
4. Shift & Work Duration Calculation Engine:
   - Shift duration calculation: work duration in minutes and hours (rounded to 1 decimal).
   - Standard shift thresholds (480 minutes / 8 hours for full day, 240 minutes for half day).
   - Overtime accumulation rules (`overtime_minutes = Math.max(0, duration - 480)`).
   - Status transitions: `present`, `half_day`, `absent`, `on_leave`.
   - Verification method labeling: `geo_verified` (distance <= radius), `manual` (distance > radius or no GPS), `regularized` (manager approved).
5. Monthly Metrics & Reporting Engine:
   - `calculateMonthlyAttendanceMetrics`: total days, present, absent, half day, on leave, total work hours, total overtime hours, geo-verified count, manual count, regularized count.
   - Pure vector jsPDF report standard: zero `jspdf-autotable` dependency, CredSmart brand tokens (Navy `#0F172A`, Orange `#FF6A00`, Emerald `#10B981`, Slate `#64748B`, Light Slate `#F1F5F9`), multi-page continuation headers, dynamic footers.
   - CSV export specification: RFC 4180 compliance, double-quote escaping, 14 standard columns.
6. Phase 3 Payroll & Salary Integration Pattern:
   - Concrete mathematical integration for consuming `crm_attendance` records in Phase 3 Salary & Payroll:
     - Daily rate calculation: Base Salary / Working Days in Month.
     - Payout components: Full days ($1.0 \times \text{Daily Rate}$), Half days ($0.5 \times \text{Daily Rate}$), Overtime ($(\text{OT Minutes} / 60) \times (\text{Hourly Rate} \times \text{OT Multiplier})$), Unpaid Absence Deductions.
7. Permissions Matrix & Gating Conventions:
   - Module: `"attendance"`.
   - Actions: `"view"`, `"create"`, `"edit"`, `"delete"`.
   - Role matrix: Staff, Cashier, Manager, Super Admin.
   - `<CRMPermissionGate module="attendance" action="view">` usage examples.
8. Testing & Verification Standards:
   - Unit testing patterns with Vitest.
   - GPS mocking helpers (`mockGeolocation`).
   - Anti-regression and typecheck commands (`cmd /c npx tsc --noEmit`, `npm.cmd test -- crm --run`).
