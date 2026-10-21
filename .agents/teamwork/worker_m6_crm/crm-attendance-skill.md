---
name: crm-attendance-skill
description: Authoritative architecture, database schema, Haversine geo-engine, shift calculations, payroll integration guidelines, and developer reference for CredSmart CRM Phase 2 Attendance & Geo-location tracking.
---

# CredSmart CRM Attendance & Geo-Location Skill & Developer Manual (Phases 2–6)

This skill provides the authoritative engineering standard for building, extending, and integrating CredSmart CRM Attendance and Geolocation tracking. Any sub-agent or engineer working on CRM features—particularly Phase 3 (Salary & Payroll Engine), Phase 4 (Task Tracking & Timesheets), and Mobile PWA Geofencing—must strictly adhere to these specifications, mathematical constants, and database contracts.

---

## 1. Architecture Overview

CredSmart CRM Attendance operates an end-to-end, high-precision geo-verified attendance pipeline designed for dual-role usage across mobile and desktop environments:

```
[ Staff Mobile/Desktop Browser ]
              │
              ▼
  navigator.geolocation API (high accuracy: true, timeout: 10,000ms)
              │
              ▼
  Haversine Geodesic Math Engine (`crmGeoUtils.ts`, R = 6,371,000m)
              │
              ▼
  Geofence Validation against Active Office Sites (`crm_geolocations`)
              │
    ┌─────────┴─────────┐
    ▼                   ▼
Within Geofence?     Outside Geofence?
  ├── status: 'present'   ├── status: 'present'
  ├── method: 'geo_verified' ├── method: 'manual' (audit flagged)
  └── within_geofence: true └── within_geofence: false
              │
              ▼
   Supabase Database (`public.crm_attendance`)
   [ Dual-layer LocalStorage Fallback: `credsmart_crm_attendance_${orgId}` ]
              │
    ┌─────────┼─────────────────────────┐
    ▼         ▼                         ▼
[ Admin Oversight Pod ]   [ Pure Vector PDF/CSV ]   [ Phase 3 Payroll Engine ]
  - Realtime Logs via       - Zero autotable           - Reconciles Working Days
    `CRMDataTable`            dependency               - Daily Rate & LOP Deductions
  - Geofence Manager        - Brand Tokens             - Overtime Multiplication
  - Regularisation Modal    - RFC 4180 CSV export      - Salary Slip Integration
```

### Core Invariants

1. **Zero Hardcoded Coordinates**: All office locations, warehouses, retail counters, and job sites are dynamically queried from `public.crm_geolocations`. No fixed latitude/longitude coordinates exist in client code.
2. **Dual-Layer Resilience**: In offline conditions or intermittent Supabase connectivity, client state seamlessly persists to and hydrates from localized browser storage:
   - `credsmart_crm_geolocations_${orgId}`: Cached active office perimeters.
   - `credsmart_crm_attendance_${orgId}`: Daily logs and active punch records.
   - `credsmart_crm_attendance_requests_${orgId}`: Attendance correction requests.
3. **Dual-Role User Interface**:
   - **Staff Clock-In Pod**: Touch-optimized digital time display, active session stopwatch, single-click punch button (Clock In Emerald `#10B981` / Clock Out Orange `#FF6A00`), and live GPS radar preview.
   - **Administrative Command Center**: Filterable attendance logs via `CRMDataTable` (date filter, staff search, role filter, status pills), Geofence Management Modal, and Regularisation Approval Drawer.
4. **Strict Typing & Integrity**: Zero `any` types. All entities conform to strict TypeScript interfaces aligned with database schema constraints.

---

## 2. Database Schema & Integrity Constraints

All tables are defined in `supabase/migrations/20261017010000_create_crm_attendance_tables.sql` with strict PostgreSQL `CHECK` constraints, unique keys, and Row-Level Security (RLS).

### 2.1 Table: `public.crm_geolocations`
Stores authorized company headquarters, branches, client job sites, and perimeter radii.
```sql
CREATE TABLE IF NOT EXISTS public.crm_geolocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 150,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_geolocations_org ON public.crm_geolocations(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_geolocations_active ON public.crm_geolocations(org_id, is_active);
```

### 2.2 Table: `public.crm_attendance`
Stores daily clock-in/out timestamps, GPS coordinates, geofence audit flags, and shift metrics.
```sql
CREATE TABLE IF NOT EXISTS public.crm_attendance (
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
    CONSTRAINT chk_crm_attendance_status CHECK (status IN ('present', 'absent', 'half_day', 'on_leave')),
  verification_method TEXT NOT NULL DEFAULT 'geo_verified'
    CONSTRAINT chk_crm_attendance_verification CHECK (verification_method IN ('geo_verified', 'manual', 'regularized')),
  is_within_geofence BOOLEAN NOT NULL DEFAULT true,
  distance_from_office_meters DOUBLE PRECISION,
  work_duration_minutes INTEGER NOT NULL DEFAULT 0,
  overtime_minutes INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_crm_attendance_staff_date UNIQUE (org_id, staff_id, date)
);

CREATE INDEX IF NOT EXISTS idx_crm_attendance_org_date ON public.crm_attendance(org_id, date);
CREATE INDEX IF NOT EXISTS idx_crm_attendance_staff_date ON public.crm_attendance(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_crm_attendance_status ON public.crm_attendance(org_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_attendance_clock_in_loc ON public.crm_attendance(clock_in_location_id);
CREATE INDEX IF NOT EXISTS idx_crm_attendance_clock_out_loc ON public.crm_attendance(clock_out_location_id);

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_crm_attendance_updated_at ON public.crm_attendance;
CREATE TRIGGER update_crm_attendance_updated_at
  BEFORE UPDATE ON public.crm_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
```

### 2.3 Table: `public.crm_attendance_requests`
Stores regularisation workflows for missed punches, GPS hardware failures, or shift disputes.
```sql
CREATE TABLE IF NOT EXISTS public.crm_attendance_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attendance_id UUID REFERENCES public.crm_attendance(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  requested_clock_in TIMESTAMPTZ,
  requested_clock_out TIMESTAMPTZ,
  requested_status TEXT NOT NULL DEFAULT 'present'
    CHECK (requested_status IN ('present', 'absent', 'half_day', 'on_leave')),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_attendance_requests_org ON public.crm_attendance_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_attendance_requests_staff ON public.crm_attendance_requests(staff_id);
CREATE INDEX IF NOT EXISTS idx_crm_attendance_requests_status ON public.crm_attendance_requests(org_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_attendance_requests_att ON public.crm_attendance_requests(attendance_id);

DROP TRIGGER IF EXISTS update_crm_attendance_requests_updated_at ON public.crm_attendance_requests;
CREATE TRIGGER update_crm_attendance_requests_updated_at
  BEFORE UPDATE ON public.crm_attendance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
```

### 2.4 Row Level Security (RLS) Policies
All attendance tables enforce organization isolation via `has_org_access(org_id)`:
```sql
ALTER TABLE public.crm_geolocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_attendance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view crm attendance"
  ON public.crm_attendance FOR SELECT
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

CREATE POLICY "Members can insert crm attendance"
  ON public.crm_attendance FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND has_org_access(org_id));

CREATE POLICY "Members can update crm attendance"
  ON public.crm_attendance FOR UPDATE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));
```

### 2.5 Strict TypeScript Domain Entities (`@/types/crmAttendance`)
```typescript
export type AttendanceStatus = "present" | "absent" | "half_day" | "on_leave";
export type AttendanceVerificationMethod = "geo_verified" | "manual" | "regularized";
export type AttendanceRequestStatus = "pending" | "approved" | "rejected";

export interface CRMGeolocation {
  id: string;
  org_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  created_at: string;
}

export interface CRMAttendanceRecord {
  id: string;
  org_id: string;
  staff_id: string;
  staff_name?: string;
  staff_email?: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  clock_in_latitude: number | null;
  clock_in_longitude: number | null;
  clock_in_accuracy: number | null;
  clock_out_latitude: number | null;
  clock_out_longitude: number | null;
  clock_out_accuracy: number | null;
  clock_in_location_id: string | null;
  clock_out_location_id: string | null;
  status: AttendanceStatus;
  verification_method: AttendanceVerificationMethod;
  is_within_geofence: boolean;
  distance_from_office_meters: number | null;
  work_duration_minutes: number;
  overtime_minutes: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CRMAttendanceRequest {
  id: string;
  org_id: string;
  staff_id: string;
  staff_name?: string;
  attendance_id: string | null;
  date: string;
  requested_clock_in: string | null;
  requested_clock_out: string | null;
  requested_status: AttendanceStatus;
  reason: string;
  status: AttendanceRequestStatus;
  reviewer_id: string | null;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CRMShiftMetrics {
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
```

---

## 3. Haversine Formula & Geofencing Math Engine

The core spherical trigonometry engine is implemented in `@/utils/crmGeoUtils.ts`.

### 3.1 Mathematical Definition & Earth Constants
- **Earth Radius Constant**: $R = 6,371,000$ meters (mean spherical Earth radius per IUGG standard).
- **Coordinate Clamping**: Latitude must satisfy $[-90, +90]^\circ$; Longitude must satisfy $[-180, +180]^\circ$.
- **Shortest Arc Longitude Normalization**:
  $$\Delta\lambda_{\text{deg}} = (\lambda_2 - \lambda_1) \pmod{360}$$
  Normalize $\Delta\lambda_{\text{deg}}$ into $[-180, +180]$ to handle shortest trajectory across the 180° antimeridian.
- **Haversine Formula**:
  $$\Delta\phi = \text{toRad}(\phi_2 - \phi_1), \quad \Delta\lambda = \text{toRad}(\Delta\lambda_{\text{deg}})$$
  $$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\text{toRad}(\phi_1))\cos(\text{toRad}(\phi_2))\sin^2\left(\frac{\Delta\lambda}{2}\right)$$
  $$a_{\text{clamped}} = \min(1, \max(0, a)) \quad \text{// Prevents NaN from floating-point inaccuracy}$$
  $$c = 2 \cdot \text{atan2}\left(\sqrt{a_{\text{clamped}}}, \sqrt{1 - a_{\text{clamped}}}\right)$$
  $$d = R \cdot c$$

### 3.2 Core Functions
```typescript
import {
  EARTH_RADIUS_METERS,
  calculateHaversineDistance,
  isWithinGeofence,
  findNearestGeofence,
  getCurrentPosition,
} from "@/utils/crmGeoUtils";

// 1. Calculate Great-Circle Distance
const distanceMeters = calculateHaversineDistance(
  userLat, userLon,
  officeLat, officeLon
);

// 2. Boolean Geofence Validation
const isInside = isWithinGeofence(
  userLat, userLon,
  officeLat, officeLon,
  150 // radius in meters
);

// 3. Nearest Geofence Resolution
const nearest = findNearestGeofence(userLat, userLon, geofences);
if (nearest) {
  console.log(`Nearest: ${nearest.geofence.name}, Distance: ${nearest.distance}m, Inside: ${nearest.isWithin}`);
}
```

### 3.3 Browser Geolocation API Wrapper
The `getCurrentPosition` wrapper provides standard options, timeout guarantees, and W3C error code parsing:
- **Default Options**: `{ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }`
- **W3C Error Codes**:
  - `1 (PERMISSION_DENIED)`: "Location permission denied. Please allow location access to continue."
  - `2 (POSITION_UNAVAILABLE)`: "Location position unavailable. Please check your GPS or network settings."
  - `3 (TIMEOUT)`: "Location request timed out. Please try again."
- **Fallback Handling**: If GPS capture fails or times out, the system permits manual clock-in, automatically flagging the record with `verification_method = "manual"` and `is_within_geofence = false`.

---

## 4. Shift & Work Duration Calculation Engine

### 4.1 Duration & Overtime Calculations
1. **Work Duration (Minutes)**:
   $$\text{duration\_minutes} = \max\left(0, \text{round}\left(\frac{\text{clock\_out} - \text{clock\_in}}{1000 \times 60}\right)\right)$$
2. **Work Duration (Hours)**:
   $$\text{duration\_hours} = \text{round}\left(\frac{\text{duration\_minutes}}{60} \times 10\right) / 10$$
3. **Shift Thresholds**:
   - **Full Day**: $\ge 480$ minutes (8.0 hours standard).
   - **Half Day**: $\ge 240$ minutes (4.0 hours) and $< 480$ minutes.
   - **Short Shift / Absent**: $< 240$ minutes without regularisation.
4. **Overtime Accumulation**:
   $$\text{overtime\_minutes} = \max(0, \text{duration\_minutes} - 480)$$
   $$\text{overtime\_hours} = \text{round}\left(\frac{\text{overtime\_minutes}}{60} \times 10\right) / 10$$

### 4.2 Status Transitions
| Condition | Resolved Status | Notes |
|---|---|---|
| Active punch, or duration $\ge 480$ mins | `present` | Full work credit |
| Duration $\ge 240$ mins and $< 480$ mins | `half_day` | 0.5 day work credit |
| Working day with 0 work minutes recorded | `absent` | Deducted via LOP unless covered by leave |
| Approved leave request | `on_leave` | Paid/unpaid per leave balance |

### 4.3 Verification Method Labeling
- `geo_verified`: Punch occurred with GPS accuracy validated and distance $\le$ `radius_meters`.
- `manual`: Punch occurred outside the geofence perimeter, or GPS was unavailable/denied.
- `regularized`: Punch adjustment requested by staff and approved by an authorized manager.

---

## 5. Monthly Metrics & Reporting Engine

Implemented in `@/utils/crmAttendancePdf.ts`.

### 5.1 Metric Calculation: `calculateMonthlyAttendanceMetrics`
```typescript
import { calculateMonthlyAttendanceMetrics } from "@/utils/crmAttendancePdf";

const metrics = calculateMonthlyAttendanceMetrics(attendanceRecords);
// Returns:
// {
//   totalDays: number,
//   presentDays: number,
//   absentDays: number,
//   halfDays: number,
//   onLeaveDays: number,
//   totalWorkMinutes: number,
//   totalWorkHours: number,
//   totalOvertimeMinutes: number,
//   totalOvertimeHours: number,
//   geoVerifiedCount: number,
//   manualCount: number,
//   regularizedCount: number,
// }
```

### 5.2 Pure Vector jsPDF Report Specification
- **Zero Third-Party Autotable Dependency**: Implemented purely using native jsPDF vector primitives (`doc.rect`, `doc.roundedRect`, `doc.line`, `doc.text`).
- **CredSmart CRM Brand Tokens**:
  - **Navy**: `[15, 23, 42]` (`#0F172A`) — Primary header banner, table header rows, dark badges.
  - **Orange**: `[255, 106, 0]` (`#FF6A00`) — Accent divider lines, absent metrics, CTAs.
  - **Emerald**: `[16, 185, 129]` (`#10B981`) — Present days, geo-verified indicators.
  - **Slate**: `[100, 116, 139]` (`#64748B`) — Labels, secondary subtitles, confidentiality text.
  - **Light Slate**: `[241, 245, 249]` (`#F1F5F9`) — Row borders and subtle dividers.
  - **Soft Slate**: `[248, 250, 252]` (`#F8FAFC`) — KPI card background, alternating table row shading.
  - **Gold**: `[245, 158, 11]` (`#F59E0B`) — Half day and regularized badges.
  - **Royal Blue**: `[29, 78, 216]` (`#1D4ED8`) — Overtime metrics and leave indicators.
- **Document Structure**:
  - **Page 1 Banner**: 28mm Navy top banner with 1.5mm Orange accent bar, organization metadata, and generation timestamp.
  - **Continuation Header**: 15mm compact banner with running page indicator on pages 2+.
  - **5 KPI Summary Cards**: Present, Absent, Half/Leave, Work Hours, Overtime.
  - **Table Layout**: Alternating zebra striping, adaptive columns for single-staff vs all-staff reports, status color highlighting.
  - **Pagination Guard**: Automatic page break when $Y + \text{rowHeight} > 275\text{mm}$.
  - **Dynamic Footer**: Confidentiality disclaimer and `Page p of totalPages` stamped across all pages.

### 5.3 RFC 4180 CSV Export Specification
Export function `exportAttendanceCSV(records, options)` generates standards-compliant CSV data:
- **Delimiter**: Comma (`,`), line terminators: CRLF (`\r\n`).
- **Escaping Rule**: Values containing commas, quotes (`"`), or newlines are wrapped in double quotes; nested quotes are escaped as `""`.
- **14 Standard Output Columns**:
  1. `Staff ID`
  2. `Staff Name`
  3. `Date`
  4. `Clock In`
  5. `Clock Out`
  6. `Work Duration (Minutes)`
  7. `Work Duration (Formatted)`
  8. `Overtime (Minutes)`
  9. `Status`
  10. `Verification Method`
  11. `Within Geofence`
  12. `Distance (m)`
  13. `Geofence Location`
  14. `Notes`

---

## 6. Phase 3 Payroll & Salary Integration Pattern

Engineers building **Phase 3 (Salary & Payroll Engine)** must ingest `crm_attendance` records using this standardized calculation contract.

### 6.1 Mathematical Payroll Formulas
Let:
- $S_{\text{base}}$ = Monthly Base Salary configured for the staff member.
- $W$ = Total Scheduled Working Days in month (typically 26 days, or calendar days minus scheduled weekly offs and company holidays).
- $D_{\text{rate}}$ = Daily Wage Rate $= \frac{S_{\text{base}}}{W}$.
- $H_{\text{rate}}$ = Base Hourly Rate $= \frac{D_{\text{rate}}}{8} = \frac{S_{\text{base}}}{W \times 8}$.
- $M_{\text{OT}}$ = Overtime Multiplier (statutory standard $1.5\times$ or $2.0\times$).

The gross payout is calculated as:
$$\text{Earned Base} = (N_{\text{present}} \times 1.0 \times D_{\text{rate}}) + (N_{\text{half\_day}} \times 0.5 \times D_{\text{rate}}) + (N_{\text{paid\_leave}} \times 1.0 \times D_{\text{rate}})$$
$$\text{Overtime Payout} = \left(\frac{\sum \text{overtime\_minutes}}{60}\right) \times H_{\text{rate}} \times M_{\text{OT}}$$
$$\text{Loss of Pay (LOP) Deduction} = N_{\text{unpaid\_absent}} \times D_{\text{rate}}$$
$$\text{Net Salary} = \text{Earned Base} + \text{Overtime Payout} - \text{LOP Deduction} + \text{Incentives} - \text{Advances}$$

### 6.2 Phase 3 Code Ingestion Pattern
```typescript
import { supabase } from "@/integrations/supabase/client";
import { calculateMonthlyAttendanceMetrics } from "@/utils/crmAttendancePdf";
import type { CRMAttendanceRecord } from "@/types/crmAttendance";

export async function calculateStaffMonthlySalary(
  orgId: string,
  staffId: string,
  baseSalary: number,
  workingDaysInMonth: number = 26,
  overtimeMultiplier: number = 1.5,
  startDate: string,
  endDate: string
) {
  // 1. Fetch attendance records for the target payroll cycle
  const { data, error } = await supabase
    .from("crm_attendance")
    .select("*")
    .eq("org_id", orgId)
    .eq("staff_id", staffId)
    .gte("date", startDate)
    .lte("date", endDate);

  if (error) throw error;
  const records = (data || []) as CRMAttendanceRecord[];

  // 2. Aggregate shift metrics
  const metrics = calculateMonthlyAttendanceMetrics(records);

  // 3. Compute statutory daily & hourly rates
  const dailyRate = baseSalary / workingDaysInMonth;
  const hourlyRate = dailyRate / 8;

  // 4. Calculate earned wage components
  const fullDayEarnings = metrics.presentDays * dailyRate;
  const halfDayEarnings = metrics.halfDays * (0.5 * dailyRate);
  const paidLeaveEarnings = metrics.onLeaveDays * dailyRate;
  const overtimeEarnings = (metrics.totalOvertimeMinutes / 60) * (hourlyRate * overtimeMultiplier);

  // 5. Calculate Loss of Pay (LOP) deductions
  const lopDays = Math.max(0, workingDaysInMonth - (metrics.presentDays + metrics.halfDays * 0.5 + metrics.onLeaveDays));
  const lopDeduction = lopDays * dailyRate;

  const grossEarnings = fullDayEarnings + halfDayEarnings + paidLeaveEarnings + overtimeEarnings;
  const netPayable = Math.max(0, grossEarnings - lopDeduction);

  return {
    baseSalary,
    workingDaysInMonth,
    dailyRate: Math.round(dailyRate * 100) / 100,
    hourlyRate: Math.round(hourlyRate * 100) / 100,
    presentDays: metrics.presentDays,
    halfDays: metrics.halfDays,
    absentDays: metrics.absentDays,
    lopDays,
    totalOvertimeHours: metrics.totalOvertimeHours,
    overtimeEarnings: Math.round(overtimeEarnings * 100) / 100,
    lopDeduction: Math.round(lopDeduction * 100) / 100,
    grossEarnings: Math.round(grossEarnings * 100) / 100,
    netPayable: Math.round(netPayable * 100) / 100,
  };
}
```

---

## 7. Permissions Matrix & Gating Conventions

Attendance capabilities are protected by CredSmart CRM RBAC.

### 7.1 Module & Action Taxonomy
- **Module**: `"attendance"`
- **Actions**:
  - `"view"`: View staff clock-in pod and personal/team daily attendance records.
  - `"create"`: Record personal clock-in and submit regularisation requests.
  - `"edit"`: Manually adjust attendance timestamps, override statuses, and approve/reject regularisation requests.
  - `"delete"`: Remove attendance logs or delete geofence boundaries.

### 7.2 Role Matrix
| Role | View Attendance | Punch Clock In/Out | Review Requests | Manage Geofences | Export Reports |
|---|:---:|:---:|:---:|:---:|:---:|
| **Staff Member** | Self | Yes | No | No | No |
| **Cashier** | Self | Yes | No | No | No |
| **Manager** | All Team | Yes | Yes (Approve/Reject) | View Only | Yes |
| **Super Admin / Owner** | All Team (Bypass) | Yes | Yes (Bypass) | Create / Edit / Delete | Yes |

### 7.3 Component Gating Examples
```tsx
import { CRMPermissionGate } from "@/components/crm";
import { useCRMPermission } from "@/hooks/useCRMPermission";

// 1. Guarding Geofence Management Modal
<CRMPermissionGate module="attendance" action="edit" suppressToast>
  <Button onClick={handleOpenAddGeofence}>
    <Plus className="w-4 h-4 mr-2" /> Add Office Geofence
  </Button>
</CRMPermissionGate>

// 2. Programmatic Permission Check for Regularisation Review
export function RegularisationReviewButton({ request }: { request: CRMAttendanceRequest }) {
  const { hasPermission, isSuperAdmin } = useCRMPermission();
  const canReview = isSuperAdmin || hasPermission("attendance", "edit");

  if (!canReview) return null;

  return (
    <Button size="sm" onClick={() => handleApprove(request)}>
      Approve Request
    </Button>
  );
}
```

---

## 8. Testing & Verification Standards

All attendance code must maintain 100% test pass rates across unit and stress test suites.

### 8.1 Vitest Unit Testing Patterns
Testing Haversine distances, antipodal points, and office boundary thresholds:
```typescript
import { describe, it, expect, afterEach } from "vitest";
import {
  calculateHaversineDistance,
  isWithinGeofence,
  mockGeolocationPosition,
  mockGeolocationError,
  resetGeolocationMock,
} from "@/utils/crmGeoUtils";

describe("Haversine & Geofence Math Validation", () => {
  afterEach(() => {
    resetGeolocationMock();
  });

  it("calculates exact 0m for identical coordinates", () => {
    expect(calculateHaversineDistance(28.6139, 77.2090, 28.6139, 77.2090)).toBe(0);
  });

  it("accurately detects inside vs outside geofence perimeter", () => {
    const officeLat = 28.6139;
    const officeLon = 77.2090;
    const radius = 150; // meters

    // Exact office location -> inside
    expect(isWithinGeofence(officeLat, officeLon, officeLat, officeLon, radius)).toBe(true);

    // 100m away -> inside
    // ~0.0009 deg latitude difference ~ 100m
    expect(isWithinGeofence(officeLat + 0.0009, officeLon, officeLat, officeLon, radius)).toBe(true);

    // 500m away -> outside
    // ~0.0045 deg latitude difference ~ 500m
    expect(isWithinGeofence(officeLat + 0.0045, officeLon, officeLat, officeLon, radius)).toBe(false);
  });
});
```

### 8.2 GPS Mocking Helpers
When testing clock-in and clock-out UI components in JSDOM, always use the mocking helpers:
```typescript
// Mock success GPS
mockGeolocationPosition({
  latitude: 28.6139,
  longitude: 77.2090,
  accuracy: 10,
});

// Mock permission denied
mockGeolocationError({
  code: 1, // PERMISSION_DENIED
  message: "User denied Geolocation",
});

// Always restore in cleanup
resetGeolocationMock();
```

### 8.3 Verification Commands
Before submitting any CRM code modification or milestone completion:
```bash
# 1. Typecheck: Zero TypeScript compilation errors
cmd /c npx tsc --noEmit

# 2. Test Execution: All CRM tests must pass
npm.cmd test -- crm --run
```
