---
name: crm-attendance-skill
description: Authoritative architectural guidelines, database schema, Haversine geo-fencing mathematics, attendance state machines, PDF reporting patterns, and payroll integration rules for CredSmart CRM Attendance (Phases 2 through 6).
---

# CredSmart CRM Attendance & Geo Location Developer Manual (Phase 2 & Beyond)

This skill provides the production engineering standard for extending, maintaining, and integrating the CredSmart CRM Attendance and Geolocation engine. Any sub-agent or engineer working on CRM features—especially Phase 3 (Salary & Payroll Calculation), Phase 4 (Task Tracking), and Mobile PWA Geolocation—must adhere to these specifications.

---

## 1. Architectural Overview

CredSmart CRM Attendance operates a dual-layer check-in model:
1. **Self-Service Staff Pod**: Touch-optimized clock-in / clock-out interface with live GPS distance radar and real-time session timer.
2. **Administrative Command Center**: Filterable attendance logs via `CRMDataTable`, geofence zone configuration, attendance regularisation approval, and vector PDF/CSV export.

```
[ Staff Mobile/Desktop Browser ]
              │
              ▼
  navigator.geolocation API (high accuracy)
              │
              ▼
  Haversine Geodesic Engine (`crmGeoUtils.ts`)
              │
    ┌─────────┴─────────┐
    ▼                   ▼
Within Geofence?     Outside Geofence?
  ├── status: 'present'   ├── status: 'present'
  ├── method: 'geo_verified' ├── method: 'manual' (flagged)
  └── within_geofence: true └── within_geofence: false
              │
              ▼
   Supabase `crm_attendance`
              │
   ┌──────────┴──────────┐
   ▼                     ▼
[ Admin Oversight ]   [ Phase 3 Payroll Engine ]
```

---

## 2. Database Schema & Tables

All attendance tables are defined in `supabase/migrations/20261017010000_create_crm_attendance_tables.sql` with strict PostgreSQL `CHECK` constraints and Row-Level Security.

### 2.1 Table: `public.crm_geolocations`
Stores authorized company sites, branches, warehouses, and client locations.
```sql
CREATE TABLE public.crm_geolocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 150,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_geolocations_org ON public.crm_geolocations(org_id);
```

### 2.2 Table: `public.crm_attendance`
Stores individual staff daily clock-in and clock-out logs.
```sql
CREATE TABLE public.crm_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  clock_in_latitude DOUBLE PRECISION,
  clock_in_longitude DOUBLE PRECISION,
  clock_in_accuracy DOUBLE PRECISION,
  clock_out_latitude DOUBLE PRECISION,
  clock_out_longitude DOUBLE PRECISION,
  clock_out_accuracy DOUBLE PRECISION,
  clock_in_location_id UUID REFERENCES public.crm_geolocations(id) ON DELETE SET NULL,
  clock_out_location_id UUID REFERENCES public.crm_geolocations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'present'
    CHECK (status IN ('present', 'absent', 'half_day', 'on_leave')),
  verification_method TEXT NOT NULL DEFAULT 'geo_verified'
    CHECK (verification_method IN ('geo_verified', 'manual', 'regularized')),
  is_within_geofence BOOLEAN NOT NULL DEFAULT true,
  distance_from_office_meters DOUBLE PRECISION,
  work_duration_minutes INTEGER DEFAULT 0
    CHECK (work_duration_minutes >= 0),
  overtime_minutes INTEGER DEFAULT 0
    CHECK (overtime_minutes >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_crm_attendance_staff_date UNIQUE (org_id, staff_id, date)
);
CREATE INDEX idx_crm_attendance_org_date ON public.crm_attendance(org_id, date);
CREATE INDEX idx_crm_attendance_staff ON public.crm_attendance(staff_id, date);
```

### 2.3 Table: `public.crm_attendance_requests`
Stores attendance correction and regularisation requests.
```sql
CREATE TABLE public.crm_attendance_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attendance_id UUID REFERENCES public.crm_attendance(id) ON DELETE CASCADE,
  requested_date DATE NOT NULL,
  requested_clock_in TIMESTAMPTZ,
  requested_clock_out TIMESTAMPTZ,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 3. Geo Calculation & Geofencing Mathematics

Core mathematical operations are encapsulated in `@/utils/crmGeoUtils`:

### 3.1 Haversine Distance Formula
Uses the mean Earth radius of 6,371,000 meters ($R$) with strict boundary clamping:
$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$
$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right)$$
$$d = R \cdot c$$

```typescript
import { calculateHaversineDistance, isWithinGeofence, findNearestGeofence } from "@/utils/crmGeoUtils";

// Exact distance between coordinates
const distanceMeters = calculateHaversineDistance(
  userLat, userLon,
  officeLat, officeLon
);

// Boolean geofence boundary check
const isVerified = isWithinGeofence(
  userLat, userLon,
  officeLat, officeLon,
  officeRadiusMeters
);

// Nearest office determination
const nearest = findNearestGeofence(userLat, userLon, activeOffices);
if (nearest) {
  console.log(`Nearest office: ${nearest.geofence.name}, Distance: ${nearest.distanceMeters}m`);
}
```

### 3.2 GPS Accuracy Thresholding
- If `accuracy > 100` meters: Flag as low-confidence GPS reading, but permit clock-in with recorded accuracy value.
- If GPS access is denied or timed out: Offer manual check-in which defaults to `verification_method: 'manual'` and `is_within_geofence: false`.

---

## 4. Attendance Reporting & PDF Export (`crmAttendancePdf.ts`)

Located in `src/utils/crmAttendancePdf.ts`. Produces publication-grade vector documents adhering to CredSmart brand tokens:

### 4.1 Usage
```typescript
import {
  calculateMonthlyAttendanceMetrics,
  generateAttendanceReportPDF,
  generateAttendanceCSV
} from "@/utils/crmAttendancePdf";

// 1. Calculate summary metrics
const metrics = calculateMonthlyAttendanceMetrics(attendanceRecords, workingDaysInMonth);

// 2. Export vector PDF with KPI summary cards & multi-page table
generateAttendanceReportPDF({
  organizationName: "CredSmart Enterprise",
  monthYear: "October 2026",
  metrics,
  records: attendanceRecords,
  staffList: organizationMembers,
});

// 3. Export RFC-4180 CSV for payroll processing
generateAttendanceCSV(attendanceRecords, organizationMembers, "October 2026");
```

---

## 5. Phase 3 (Salary & Payroll) Integration Contract

Sub-agents and engineers implementing **Phase 3: Salary Management** must consume attendance data using the following standard contract:

### 5.1 Reconciling Monthly Working Days & Loss of Pay (LOP)
```typescript
// Query staff attendance for the target payroll month
const { data: attendanceLogs } = await supabase
  .from("crm_attendance")
  .select("*")
  .eq("org_id", orgId)
  .eq("staff_id", staffId)
  .gte("date", startOfMonth)
  .lte("date", endOfMonth);

const presentDays = attendanceLogs.filter(r => r.status === "present").length;
const halfDays = attendanceLogs.filter(r => r.status === "half_day").length;
const effectivePresentDays = presentDays + (halfDays * 0.5);

// LOP (Loss of Pay) days = Total Working Days - Effective Present Days - Approved Leaves
const lopDays = Math.max(0, totalWorkingDays - effectivePresentDays - approvedLeaves);
const perDayDeduction = baseSalary / totalWorkingDays;
const lopDeductionAmount = lopDays * perDayDeduction;
```

### 5.2 Overtime Calculation
```typescript
const totalOvertimeMinutes = attendanceLogs.reduce(
  (sum, record) => sum + (record.overtime_minutes || 0), 0
);
const overtimeHours = totalOvertimeMinutes / 60;
const overtimePay = overtimeHours * hourlyOvertimeRate;
```

---

## 6. Security & RBAC Gating Rules

All attendance components and API routes must enforce:
1. `CRMPermissionGate` wrapping administrative actions:
   - `module: "attendance"`, `action: "view"`: Required to view daily attendance table and staff check-in pod.
   - `module: "attendance"`, `action: "edit"`: Required to manually adjust attendance records or approve regularisations.
   - `module: "attendance"`, `action: "manage_geofence"`: Required to add, update, or deactivate office locations.
   - `module: "attendance"`, `action: "export"`: Required to generate PDF/CSV reports.
2. Super Admin unconditional bypass: Organization owners and super admins automatically bypass all gating checks.
