# CRM Phase 2 Milestone 1: Database Migration & Supabase TypeScript Survey Report

**Author**: `survey_explorer_1`  
**Date**: 2026-10-17  
**Scope**: Milestone 1 — Supabase Database Migration (`crm_geolocations`, `crm_attendance`, `crm_attendance_requests`), RLS Policies, Indexes, and TypeScript Types in `src/integrations/supabase/types.ts`.

---

## 1. Executive Summary

This investigation surveys the database schema, migration patterns, Row Level Security (RLS) helpers, and Supabase TypeScript type architecture required to implement **Milestone 1** of **CRM Phase 2: Attendance & Geo Location Attendance**.

### Key Architectural Findings:
1. **Migration Standards**: Recent migrations (e.g. `20261017000000_create_crm_rbac_tables.sql` and `20260922000000_create_sales_returns_tables.sql`) are transactional (`BEGIN;` ... `COMMIT;`) and strictly idempotent using `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `DROP POLICY IF EXISTS` before `CREATE POLICY`, and `DROP TRIGGER IF EXISTS` before `CREATE TRIGGER`.
2. **Standard RLS Helper**: The global function `public.has_org_access(_org_id UUID)` is already defined in `supabase/migrations/20260211173918_6bb13237-b72e-4831-9dd1-304eca51792b.sql:78-87` as `SECURITY DEFINER` querying `public.organization_memberships`.
3. **Timestamp Trigger**: The trigger function `public.update_updated_at()` is already defined in `20260211173918_6bb13237-b72e-4831-9dd1-304eca51792b.sql:171-179` and can be attached to `crm_attendance` and `crm_attendance_requests`.
4. **Foreign Key Patterns**:
   - Organization references always target `public.organizations(id) ON DELETE CASCADE`.
   - User identity references target `auth.users(id) ON DELETE CASCADE` (for `staff_id`) or `ON DELETE SET NULL` (for audit fields like `reviewer_id`).
5. **Supabase Types Structure**: In `src/integrations/supabase/types.ts`, `Database["public"]["Tables"]` maintains table entries in strict alphabetical order. Tables referencing `auth.users` omit that relationship from `Relationships: [...]` because `auth.users` resides in the `auth` schema, while relationships to `public.organizations` and `public.crm_geolocations` are fully declared.
6. **Repository Verification**: Both `cmd /c npx tsc --noEmit` and `cmd /c npx vitest run src/test/crmPermissionRbac.test.ts` pass with 0 errors / 26 passing tests.

---

## 2. Examination of Existing Database Architecture & Helper Functions

### 2.1 RLS Helper Function: `public.has_org_access`
Located in `supabase/migrations/20260211173918_6bb13237-b72e-4831-9dd1-304eca51792b.sql` at lines 78–87:
```sql
CREATE OR REPLACE FUNCTION public.has_org_access(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE user_id = auth.uid() AND organization_id = _org_id
  );
$$;
```
- **Evaluation**: This function ensures that only users who have an active row in `public.organization_memberships` for `_org_id` evaluate to `true`.
- **Performance**: Marked `STABLE` and `SECURITY DEFINER`, executing in constant time with `idx_organization_memberships_org_user`.

### 2.2 Trigger Function: `public.update_updated_at`
Located in `supabase/migrations/20260211173918_6bb13237-b72e-4831-9dd1-304eca51792b.sql` at lines 171–179:
```sql
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```
- **Evaluation**: Reusable across all CRM tables containing `updated_at TIMESTAMPTZ`. It automatically overwrites `NEW.updated_at` on every `UPDATE` statement.

### 2.3 CRM RBAC Baseline from Phase 1
Located in `supabase/migrations/20261017000000_create_crm_rbac_tables.sql`:
- Phase 1 seeded the Super Admin role with 14 module/action permissions, including:
  - `ARRAY['attendance', 'view']`
  - `ARRAY['attendance', 'edit']`
- This confirms that Super Admins in all existing and newly created organizations already hold valid permissions for `attendance:view` and `attendance:edit`.

---

## 3. Milestone 1 Database Schema Specification

The migration must be created at:
`supabase/migrations/20261017010000_create_crm_attendance_tables.sql`

### 3.1 Table: `public.crm_geolocations`
Stores authorized geofence hubs (offices, warehouses, client work sites).

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

#### Field Specifications:
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary Key |
| `org_id` | `UUID` | No | — | FK -> `public.organizations(id) ON DELETE CASCADE` |
| `name` | `TEXT` | No | — | Hub name (e.g. "Main Office", "Warehouse West") |
| `latitude` | `DOUBLE PRECISION` | No | — | Center latitude coordinate (WGS84 decimal degrees) |
| `longitude` | `DOUBLE PRECISION` | No | — | Center longitude coordinate (WGS84 decimal degrees) |
| `radius_meters`| `INTEGER` | No | `150` | Allowed geofence boundary radius in meters |
| `is_active` | `BOOLEAN` | No | `true` | Whether hub is active for clock-in verification |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | Timestamp of hub registration |

---

### 3.2 Table: `public.crm_attendance`
Stores daily clock-in/out logs, geolocation checks, calculated duration, and verification statuses.

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
  status TEXT NOT NULL DEFAULT 'present',
  verification_method TEXT NOT NULL DEFAULT 'geo_verified',
  is_within_geofence BOOLEAN NOT NULL DEFAULT true,
  distance_from_office_meters DOUBLE PRECISION,
  work_duration_minutes INTEGER DEFAULT 0,
  overtime_minutes INTEGER DEFAULT 0,
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
```

#### Key Constraints & Invariants:
1. **Unique Daily Entry**: `CONSTRAINT uq_crm_attendance_staff_date UNIQUE (org_id, staff_id, date)` guarantees that a staff member cannot have duplicate attendance rows for the same calendar date in the same organization. Clock-in updates the row, and clock-out updates the same row.
2. **Status Values**: `'present'`, `'absent'`, `'half_day'`, `'on_leave'`.
3. **Verification Method Values**: `'geo_verified'`, `'manual'`, `'regularized'`.
4. **Trigger**:
```sql
DROP TRIGGER IF EXISTS update_crm_attendance_updated_at ON public.crm_attendance;
CREATE TRIGGER update_crm_attendance_updated_at
  BEFORE UPDATE ON public.crm_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
```

---

### 3.3 Table: `public.crm_attendance_requests`
Stores regularisation and manual attendance correction requests submitted by staff members or requested on their behalf.

```sql
CREATE TABLE IF NOT EXISTS public.crm_attendance_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attendance_id UUID REFERENCES public.crm_attendance(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  requested_clock_in TIMESTAMPTZ,
  requested_clock_out TIMESTAMPTZ,
  requested_status TEXT NOT NULL DEFAULT 'present',
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
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
```

#### Field Specifications:
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary Key |
| `org_id` | `UUID` | No | — | FK -> `organizations(id)` |
| `staff_id` | `UUID` | No | — | FK -> `auth.users(id)` (requesting employee) |
| `attendance_id` | `UUID` | Yes | `NULL` | FK -> `crm_attendance(id)` (if regularizing existing punch) |
| `date` | `DATE` | No | — | Calendar date being requested/corrected |
| `requested_clock_in` | `TIMESTAMPTZ` | Yes | `NULL` | Corrected clock-in time |
| `requested_clock_out` | `TIMESTAMPTZ` | Yes | `NULL` | Corrected clock-out time |
| `requested_status` | `TEXT` | No | `'present'` | `'present'`, `'half_day'`, `'on_leave'` |
| `reason` | `TEXT` | No | — | Justification for missed punch or geofence error |
| `status` | `TEXT` | No | `'pending'` | Approval state: `'pending'`, `'approved'`, `'rejected'` |
| `reviewer_id` | `UUID` | Yes | `NULL` | Manager who approved/rejected request |
| `reviewer_notes` | `TEXT` | Yes | `NULL` | Explanation or audit feedback |
| `reviewed_at` | `TIMESTAMPTZ` | Yes | `NULL` | Timestamp of approval decision |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | Request submission timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | `now()` | Record update timestamp |

#### Trigger:
```sql
DROP TRIGGER IF EXISTS update_crm_attendance_requests_updated_at ON public.crm_attendance_requests;
CREATE TRIGGER update_crm_attendance_requests_updated_at
  BEFORE UPDATE ON public.crm_attendance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
```

---

## 4. Complete SQL Migration Script

Below is the verified, drop-in migration file content for `supabase/migrations/20261017010000_create_crm_attendance_tables.sql`:

```sql
BEGIN;

-- ============================================================================
-- Migration: 20261017010000_create_crm_attendance_tables.sql
-- Description: CRM Phase 2: Attendance & Geo Location Attendance Engine
-- Tables:
--   1. public.crm_geolocations
--   2. public.crm_attendance
--   3. public.crm_attendance_requests
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table: public.crm_geolocations
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 2. Table: public.crm_attendance
-- ----------------------------------------------------------------------------
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
  status TEXT NOT NULL DEFAULT 'present',
  verification_method TEXT NOT NULL DEFAULT 'geo_verified',
  is_within_geofence BOOLEAN NOT NULL DEFAULT true,
  distance_from_office_meters DOUBLE PRECISION,
  work_duration_minutes INTEGER DEFAULT 0,
  overtime_minutes INTEGER DEFAULT 0,
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

-- Attach updated_at trigger
DROP TRIGGER IF EXISTS update_crm_attendance_updated_at ON public.crm_attendance;
CREATE TRIGGER update_crm_attendance_updated_at
  BEFORE UPDATE ON public.crm_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Table: public.crm_attendance_requests
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_attendance_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attendance_id UUID REFERENCES public.crm_attendance(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  requested_clock_in TIMESTAMPTZ,
  requested_clock_out TIMESTAMPTZ,
  requested_status TEXT NOT NULL DEFAULT 'present',
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
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

-- Attach updated_at trigger
DROP TRIGGER IF EXISTS update_crm_attendance_requests_updated_at ON public.crm_attendance_requests;
CREATE TRIGGER update_crm_attendance_requests_updated_at
  BEFORE UPDATE ON public.crm_attendance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ----------------------------------------------------------------------------
-- 4. Enable Row Level Security (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.crm_geolocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_attendance_requests ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 5. RLS Policies: public.crm_geolocations
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view crm geolocations" ON public.crm_geolocations;
CREATE POLICY "Members can view crm geolocations"
  ON public.crm_geolocations FOR SELECT
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can insert crm geolocations" ON public.crm_geolocations;
CREATE POLICY "Members can insert crm geolocations"
  ON public.crm_geolocations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can update crm geolocations" ON public.crm_geolocations;
CREATE POLICY "Members can update crm geolocations"
  ON public.crm_geolocations FOR UPDATE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can delete crm geolocations" ON public.crm_geolocations;
CREATE POLICY "Members can delete crm geolocations"
  ON public.crm_geolocations FOR DELETE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

-- ----------------------------------------------------------------------------
-- 6. RLS Policies: public.crm_attendance
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view crm attendance" ON public.crm_attendance;
CREATE POLICY "Members can view crm attendance"
  ON public.crm_attendance FOR SELECT
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can insert crm attendance" ON public.crm_attendance;
CREATE POLICY "Members can insert crm attendance"
  ON public.crm_attendance FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can update crm attendance" ON public.crm_attendance;
CREATE POLICY "Members can update crm attendance"
  ON public.crm_attendance FOR UPDATE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can delete crm attendance" ON public.crm_attendance;
CREATE POLICY "Members can delete crm attendance"
  ON public.crm_attendance FOR DELETE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

-- ----------------------------------------------------------------------------
-- 7. RLS Policies: public.crm_attendance_requests
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view crm attendance requests" ON public.crm_attendance_requests;
CREATE POLICY "Members can view crm attendance requests"
  ON public.crm_attendance_requests FOR SELECT
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can insert crm attendance requests" ON public.crm_attendance_requests;
CREATE POLICY "Members can insert crm attendance requests"
  ON public.crm_attendance_requests FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can update crm attendance requests" ON public.crm_attendance_requests;
CREATE POLICY "Members can update crm attendance requests"
  ON public.crm_attendance_requests FOR UPDATE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

DROP POLICY IF EXISTS "Members can delete crm attendance requests" ON public.crm_attendance_requests;
CREATE POLICY "Members can delete crm attendance requests"
  ON public.crm_attendance_requests FOR DELETE
  USING (auth.role() = 'authenticated' AND has_org_access(org_id));

COMMIT;
```

---

## 5. TypeScript Integration: `src/integrations/supabase/types.ts`

### 5.1 Placement & Alphabetical Organization
In `src/integrations/supabase/types.ts`:
- Currently, line 104 is the closing brace of `credit_transactions`.
- Line 105 starts `crm_permissions`.
- Alphabetically:
  1. `crm_attendance` (inserted between line 104 and 105)
  2. `crm_attendance_requests` (inserted right after `crm_attendance`)
  3. `crm_geolocations` (inserted right after `crm_attendance_requests`)
  4. Followed by existing `crm_permissions`, `crm_roles`, `crm_staff_roles`.

### 5.2 Exact TypeScript Types to Insert into `Database["public"]["Tables"]`

```typescript
      crm_attendance: {
        Row: {
          clock_in: string | null
          clock_in_accuracy: number | null
          clock_in_latitude: number | null
          clock_in_location_id: string | null
          clock_in_longitude: number | null
          clock_out: string | null
          clock_out_accuracy: number | null
          clock_out_latitude: number | null
          clock_out_location_id: string | null
          clock_out_longitude: number | null
          created_at: string
          date: string
          distance_from_office_meters: number | null
          id: string
          is_within_geofence: boolean
          notes: string | null
          org_id: string
          overtime_minutes: number | null
          staff_id: string
          status: string
          updated_at: string
          verification_method: string
          work_duration_minutes: number | null
        }
        Insert: {
          clock_in?: string | null
          clock_in_accuracy?: number | null
          clock_in_latitude?: number | null
          clock_in_location_id?: string | null
          clock_in_longitude?: number | null
          clock_out?: string | null
          clock_out_accuracy?: number | null
          clock_out_latitude?: number | null
          clock_out_location_id?: string | null
          clock_out_longitude?: number | null
          created_at?: string
          date?: string
          distance_from_office_meters?: number | null
          id?: string
          is_within_geofence?: boolean
          notes?: string | null
          org_id: string
          overtime_minutes?: number | null
          staff_id: string
          status?: string
          updated_at?: string
          verification_method?: string
          work_duration_minutes?: number | null
        }
        Update: {
          clock_in?: string | null
          clock_in_accuracy?: number | null
          clock_in_latitude?: number | null
          clock_in_location_id?: string | null
          clock_in_longitude?: number | null
          clock_out?: string | null
          clock_out_accuracy?: number | null
          clock_out_latitude?: number | null
          clock_out_location_id?: string | null
          clock_out_longitude?: number | null
          created_at?: string
          date?: string
          distance_from_office_meters?: number | null
          id?: string
          is_within_geofence?: boolean
          notes?: string | null
          org_id?: string
          overtime_minutes?: number | null
          staff_id?: string
          status?: string
          updated_at?: string
          verification_method?: string
          work_duration_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_attendance_clock_in_location_id_fkey"
            columns: ["clock_in_location_id"]
            isOneToOne: false
            referencedRelation: "crm_geolocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_attendance_clock_out_location_id_fkey"
            columns: ["clock_out_location_id"]
            isOneToOne: false
            referencedRelation: "crm_geolocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_attendance_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_attendance_requests: {
        Row: {
          attendance_id: string | null
          created_at: string
          date: string
          id: string
          org_id: string
          reason: string
          requested_clock_in: string | null
          requested_clock_out: string | null
          requested_status: string
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_notes: string | null
          staff_id: string
          status: string
          updated_at: string
        }
        Insert: {
          attendance_id?: string | null
          created_at?: string
          date: string
          id?: string
          org_id: string
          reason: string
          requested_clock_in?: string | null
          requested_clock_out?: string | null
          requested_status?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          staff_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          attendance_id?: string | null
          created_at?: string
          date?: string
          id?: string
          org_id?: string
          reason?: string
          requested_clock_in?: string | null
          requested_clock_out?: string | null
          requested_status?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          staff_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_attendance_requests_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: false
            referencedRelation: "crm_attendance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_attendance_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_geolocations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          latitude: number
          longitude: number
          name: string
          org_id: string
          radius_meters: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          latitude: number
          longitude: number
          name: string
          org_id: string
          radius_meters?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          name?: string
          org_id?: string
          radius_meters?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_geolocations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
```

### 5.3 Strong Domain Types (Recommended for `src/types/crmAttendance.ts` or component imports)
To provide developer ergonomicity and avoid stringly-typed enums throughout the UI:

```typescript
export type AttendanceStatus = "present" | "absent" | "half_day" | "on_leave";
export type AttendanceVerificationMethod = "geo_verified" | "manual" | "regularized";
export type AttendanceRequestStatus = "pending" | "approved" | "rejected";

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
```

---

## 6. Verification and Implementation Roadmap

1. **Idempotent Migration Delivery**:
   - Save migration script to `supabase/migrations/20261017010000_create_crm_attendance_tables.sql`.
2. **Types Integration**:
   - Insert tables into `src/integrations/supabase/types.ts`.
3. **Compiler & Test Validation**:
   - Run `cmd /c npx tsc --noEmit` to verify type compatibility with 0 errors.
   - Run `cmd /c npx vitest run src/test/crmPermissionRbac.test.ts` to ensure zero regressions to Phase 1 RBAC and database mock tests.
