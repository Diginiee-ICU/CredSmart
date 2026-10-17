# Project: CredSmart CRM Phase 2 — Attendance & Geo Location Attendance

## Architecture
- **Frontend Stack**: React 18, Vite, TypeScript, Tailwind CSS, Lucide icons, jsPDF, shadcn/ui.
- **Backend & Database**: Supabase PostgreSQL with Row Level Security (RLS) guarded by `has_org_access(org_id)`.
- **RBAC**: CRM Phase 1 dynamic permission system (`useCRMPermission`, `CRMPermissionGate`, `crm_roles`, `crm_permissions`).
- **Geo Engine**: Pure TypeScript Haversine distance calculation and geofencing engine in `src/utils/crmGeoUtils.ts`.
- **UI Architecture**:
  - `src/pages/crm/Attendance.tsx` housing Staff Clock-In Pod (digital clock, GPS status, geofence distance radar, touch CTA, live work timer) and Admin Oversight (CRMDataTable, Geofence manager modal, Regularisation modal).
  - `src/pages/crm/CRMDashboard.tsx` with live attendance count query.
  - PDF export matching CredSmart brand tokens (Navy `#0F172A`, Orange `#FF6A00`, Emerald `#10B981`).
- **Data Flow**:
  1. Staff loads Attendance page -> checks geolocation via Browser Geolocation API -> evaluates distance to active org geofences using Haversine formula.
  2. Staff clicks "Clock In" -> inserts/upserts record in `crm_attendance` with timestamp, GPS coords, accuracy, verification method (`geo_verified` vs `manual`), geofence flag, and distance.
  3. Real-time timer counts active elapsed shift duration.
  4. Staff clicks "Clock Out" -> updates `clock_out`, `work_duration_minutes`, `overtime_minutes` in `crm_attendance`.
  5. Admin / Manager views daily log, manages office geofences, reviews regularisation requests, and exports PDF/CSV reports.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Database Tables & Migration | `crm_geolocations`, `crm_attendance`, `crm_attendance_requests` with RLS | M1 | DISPATCH.md R1 |
| 2 | TypeScript Schema Types | Update `src/integrations/supabase/types.ts` with new tables | M1 | DISPATCH.md R1 |
| 3 | Haversine Formula Engine | Distance calculation in meters between coordinates | M2 | DISPATCH.md R2 |
| 4 | Geofence Evaluation & GPS API | `isWithinGeofence`, browser GPS wrapper with timeouts and fallback mocks | M2 | DISPATCH.md R2 |
| 5 | Staff Clock-In / Clock-Out Pod | Digital clock, single touch emerald/orange button, GPS radar, elapsed timer | M3 | DISPATCH.md R3 |
| 6 | Admin Attendance Oversight Table | CRMDataTable with date/staff/role filters and status badges | M3 | DISPATCH.md R3 |
| 7 | Geofence Management Modal | Add/edit office locations with lat/lon/radius | M3 | DISPATCH.md R3 |
| 8 | Regularisation Approval Modal | Request & approve/reject manual attendance fixes | M3 | DISPATCH.md R3 |
| 9 | Monthly Attendance Breakdown & Stats | Present, absent, half day, overtime hours calculation | M4 | DISPATCH.md R4 |
| 10 | PDF & CSV Export | Styled PDF via jsPDF with brand tokens and payroll CSV | M4 | DISPATCH.md R4 |
| 11 | Route Wiring & App Integration | Wire `ROUTE_PATHS.crmAttendance` in `src/App.tsx` and `routes.ts` | M5 | DISPATCH.md R5 |
| 12 | CRMDashboard Live Stat Card | Query `crm_attendance` for today's live attendance count | M5 | DISPATCH.md R5 |
| 13 | Reusable Skill Documentation | `.agents/skills/crm-attendance-skill/SKILL.md` authoring | M6 | DISPATCH.md R6 |
| 14 | E2E Testing & Adversarial Hardening | Comprehensive unit & E2E tests across all tiers, `tsc --noEmit` clean | M7 | DISPATCH.md Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Database Schema & Migration | Migration SQL, RLS policies, TypeScript types | none | DONE |
| M2 | Geo Location Engine | `src/utils/crmGeoUtils.ts`, Haversine formula, GPS wrapper, unit tests | M1 | DONE |
| M3 | Attendance UI & Hub | `src/pages/crm/Attendance.tsx`, Clock-in pod, admin table, geofence modal | M1, M2 | DONE |
| M4 | Attendance Reports & Exports | Monthly breakdown, jsPDF formatted report, CSV export | M1, M3 | DONE |
| M5 | Route Wiring & Dashboard Integration | Wire route in `App.tsx`, update `CRMDashboard.tsx` live query | M3 | DONE |
| M6 | Reusable Skill Documentation | `.agents/skills/crm-attendance-skill/SKILL.md` | M1-M5 | PLANNED |
| M7 | E2E Verification & Adversarial Hardening | Full vitest suite, `tsc --noEmit`, dual-track verification | M1-M6 | PLANNED |

## Interface Contracts
### `crmGeoUtils.ts`
- `calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number` (returns meters)
- `isWithinGeofence(userLat: number, userLon: number, officeLat: number, officeLon: number, radiusMeters: number): boolean`
- `getCurrentPosition(options?: PositionOptions): Promise<GeolocationCoordinates>`
- `findNearestGeofence(userLat: number, userLon: number, geofences: CRMGeolocation[]): { geofence: CRMGeolocation; distance: number; isWithin: boolean } | null`

### Database Entities
- `CRMGeolocation`: `{ id, org_id, name, latitude, longitude, radius_meters, is_active, created_at }`
- `CRMAttendance`: `{ id, org_id, staff_id, date, clock_in, clock_out, clock_in_latitude, clock_in_longitude, clock_in_accuracy, clock_out_latitude, clock_out_longitude, clock_out_accuracy, clock_in_location_id, clock_out_location_id, status, verification_method, is_within_geofence, distance_from_office_meters, work_duration_minutes, overtime_minutes, notes, created_at, updated_at }`
- `CRMAttendanceRequest`: `{ id, org_id, staff_id, attendance_id, requested_date, requested_clock_in, requested_clock_out, reason, status, reviewed_by, reviewed_at, created_at }`

## Code Layout
- Migration: `supabase/migrations/20261017010000_create_crm_attendance_tables.sql`
- Types: `src/integrations/supabase/types.ts`
- Utilities: `src/utils/crmGeoUtils.ts`, `src/utils/crmAttendancePdf.ts`
- Pages: `src/pages/crm/Attendance.tsx`, `src/pages/crm/CRMDashboard.tsx`
- Routing: `src/config/routes.ts`, `src/App.tsx`, `src/components/AppSidebar.tsx`
- Documentation: `.agents/skills/crm-attendance-skill/SKILL.md`
- Tests: `src/test/crmGeoUtils.test.ts`, `src/test/crmAttendance.test.tsx`
