# Project Orchestrator Dispatch — CRM Phase 2: Attendance & Geo Location Attendance

## Mission
Build a fully integrated CRM Tab — Phase 2: Attendance & Geo Location Attendance — inside CredSmart, a React + Vite + TypeScript + Supabase PWA business management platform. All UI must be polished, production-quality, matching the existing CredSmart mobile + desktop design standards, using the custom CRM design system in src/components/crm/ and RBAC integration from Phase 1.

## Working Directories & References
- Project root: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart`
- Orchestrator Working Directory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase2`
- User Request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-17T08:52:11Z`)
- Prior Skill: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\crm-rbac-skill\SKILL.md`

## Requirements
### R1. Database Schema & Idempotent Migration
Create `supabase/migrations/20261017010000_create_crm_attendance_tables.sql` containing:
1. `public.crm_geolocations`:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE`
   - `name TEXT NOT NULL`
   - `latitude DOUBLE PRECISION NOT NULL`
   - `longitude DOUBLE PRECISION NOT NULL`
   - `radius_meters INTEGER NOT NULL DEFAULT 150`
   - `is_active BOOLEAN NOT NULL DEFAULT true`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
2. `public.crm_attendance`:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE`
   - `staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
   - `date DATE NOT NULL DEFAULT CURRENT_DATE`
   - `clock_in TIMESTAMPTZ`
   - `clock_out TIMESTAMPTZ`
   - `clock_in_latitude DOUBLE PRECISION`
   - `clock_in_longitude DOUBLE PRECISION`
   - `clock_in_accuracy DOUBLE PRECISION`
   - `clock_out_latitude DOUBLE PRECISION`
   - `clock_out_longitude DOUBLE PRECISION`
   - `clock_out_accuracy DOUBLE PRECISION`
   - `clock_in_location_id UUID REFERENCES public.crm_geolocations(id) ON DELETE SET NULL`
   - `clock_out_location_id UUID REFERENCES public.crm_geolocations(id) ON DELETE SET NULL`
   - `status TEXT NOT NULL DEFAULT 'present'` ('present', 'absent', 'half_day', 'on_leave')
   - `verification_method TEXT NOT NULL DEFAULT 'geo_verified'` ('geo_verified', 'manual', 'regularized')
   - `is_within_geofence BOOLEAN NOT NULL DEFAULT true`
   - `distance_from_office_meters DOUBLE PRECISION`
   - `work_duration_minutes INTEGER DEFAULT 0`
   - `overtime_minutes INTEGER DEFAULT 0`
   - `notes TEXT`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - `CONSTRAINT uq_crm_attendance_staff_date UNIQUE (org_id, staff_id, date)`
3. `public.crm_attendance_requests`:
   - For regularisation / manual correction with status ('pending', 'approved', 'rejected').
4. Enable RLS on all tables with `has_org_access(org_id)` policy.
5. Update `src/integrations/supabase/types.ts` with these new table definitions.

### R2. Geo Location Calculation Engine
Create `src/utils/crmGeoUtils.ts`:
- Haversine distance formula calculating exact distance in meters between `(lat1, lon1)` and `(lat2, lon2)`
- `isWithinGeofence(userLat, userLon, officeLat, officeLon, radiusMeters)`
- Geolocation API wrapper with timeout, high accuracy flag, and clean error handling
- Geolocation mock helpers for test suites

### R3. Attendance UI & Clock-In Hub
Create `src/pages/crm/Attendance.tsx`:
- Staff Clock-In / Clock-Out pod:
  - Live digital time display, shift info, and single touch-optimized button (Clock In Emerald `#10B981` / Clock Out Orange `#FF6A00`)
  - Live GPS status indicator ("Acquiring GPS...", "Within Geofence ✓", "Outside Geofence ⚠️")
  - Distance radar / map preview indicator showing office center and user position
  - Work timer showing elapsed time for today's session
- Admin Attendance Oversight:
  - Daily Attendance Table using `CRMDataTable` with date filter, staff search, role filter, status badge
  - Geofence Management Modal: add/edit office locations (name, lat, lon, radius)
  - Regularisation approval drawer/modal
- Gated using `CRMPermissionGate` and `useCRMPermission("attendance", "view")`

### R4. Attendance Reports & PDF Export
- Monthly attendance breakdown: Present days, Absent, Half day, Overtime hours
- Formatted PDF export using `jsPDF` matching CredSmart design tokens
- CSV export for payroll processing

### R5. Wire Routes & Update CRMDashboard
- Wire `ROUTE_PATHS.crmAttendance` in `src/App.tsx` pointing to `Attendance.tsx`
- In `src/pages/crm/CRMDashboard.tsx`, update the Attendance stat card to query `crm_attendance` for today's real attendance count

### R6. Reusable Skill Documentation
Create `.agents/skills/crm-attendance-skill/SKILL.md` documenting:
- Database schema for attendance & geolocations
- Haversine calculation guidelines
- Shift calculation rules (overtime, late arrival, half day)
- Pattern for consuming attendance data in Phase 3 (Salary & Payroll calculation)
- Permissions matrix for attendance module

### Acceptance Criteria
- [ ] Database migration is idempotent with IF NOT EXISTS and RLS
- [ ] TypeScript types updated in `src/integrations/supabase/types.ts`
- [ ] `src/utils/crmGeoUtils.ts` Haversine formula implemented and tested
- [ ] Staff can clock in/out with live elapsed timer
- [ ] GPS coordinates captured on clock in/out
- [ ] Geofence check correctly marks attendance as "Geo-Verified ✓" or "Manual ⚠️"
- [ ] Admin can view logs in `CRMDataTable` and manage geofences
- [ ] Monthly PDF report downloads cleanly
- [ ] Responsive design verified on mobile (375px) and desktop
- [ ] `tsc --noEmit` exits with 0 errors
- [ ] All new tests pass with 0 failures
- [ ] `.agents/skills/crm-attendance-skill/SKILL.md` authored and committed

## 2026-10-17T17:33:09Z

[Sentinel Liveness Nudge]
Network connectivity is restored. All milestones 1 through 5 have passed their gates. Please proceed with Milestone 6 (Reusable Skill Documentation at .agents/skills/crm-attendance-skill/SKILL.md) and update progress.md.

