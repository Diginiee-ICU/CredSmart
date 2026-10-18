# Handoff Report: Phase 3 TypeScript Types Design (`types.ts` & Domain Models)

**Role**: Explorer M1-2  
**Target Milestone**: CRM Phase 3: Salary Management & Payroll Engine — Milestone 1 & 2  
**Working Directory**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_2`  
**Generated Date**: 2026-10-18  

---

## 1. Observation

### 1.1 Existing Supabase Client & Type System Architecture
- **`src/integrations/supabase/client.ts` (lines 1-17)**:
  ```typescript
  import { createClient } from '@supabase/supabase-js';
  import type { Database } from './types';
  
  export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { ... });
  ```
  The Supabase client is strictly parameterized by the generic `Database` interface from `./types`. Any call `supabase.from("tableName")` is strictly typed against `keyof Database["public"]["Tables"]`. Calling an unmapped table fails type checking.

- **`src/integrations/supabase/types.ts` (lines 16-413)**:
  Tables in `Database["public"]["Tables"]` are organized in alphabetical order:
  - `audit_logs` (line 17)
  - `credit_transactions` (line 58)
  - `crm_attendance` (lines 105-204)
  - `crm_attendance_requests` (lines 205-273)
  - `crm_geolocations` (lines 274-314)
  - `crm_permissions` (lines 315-346)
  - `crm_roles` (lines 347-384)
  - `crm_staff_roles` (lines 385-413)
  - `customers` (lines 414-447)
  Every table adheres to the standard Supabase structure:
  - `Row`: exact SQL column representation with non-null vs nullable (`T | null`) mapping.
  - `Insert`: fields with defaults/nullable marked optional (`field?: T`), mandatory columns marked required (`field: T`).
  - `Update`: all fields marked optional (`field?: T`).
  - `Relationships`: array of foreign keys pointing to referenced relations within the `public` schema. References to `auth.users(id)` are omitted from `Relationships` because the Supabase client only models intra-schema public relationships.
  - Table helper types exported at the bottom (lines 1212-1289): `Tables<T>`, `TablesInsert<T>`, `TablesUpdate<T>`.

- **`src/types/crmAttendance.ts` (lines 1-70)**:
  Phase 2 established the pattern of housing domain models in a dedicated file (`src/types/crmAttendance.ts`) exporting:
  - Strict string literal union types (`AttendanceStatus`, `AttendanceVerificationMethod`, `AttendanceRequestStatus`).
  - High-level domain interfaces (`CRMGeolocation`, `CRMAttendanceRecord`, `CRMAttendanceRequest`) with optional UI enrichment fields (`staff_name?: string; staff_email?: string;`).

- **`src/test/crmAttendanceTypes.challenger.test.ts` (18 passing tests)**:
  Tests enforce exact SQL column count and property type equality via `expectTypeOf<...>()` and compile-time assignability guards (`Extends<T, U>`).

- **`ORIGINAL_REQUEST.md` (lines 446-522)**:
  Specifies the 4 salary tables to be created in `supabase/migrations/20261017020000_create_crm_salary_tables.sql`:
  1. `public.crm_salary_profiles` (13 columns)
  2. `public.crm_payroll_runs` (11 columns)
  3. `public.crm_payslips` (24 columns)
  4. `public.crm_salary_adjustments` (12 or 13 columns depending on `updated_at`)

---

## 2. Logic Chain

1. **Alphabetical Placement in `Database["public"]["Tables"]`**:
   To preserve convention and code predictability:
   - Between `crm_geolocations` (ends line 314) and `crm_permissions` (line 315):
     - `crm_payroll_runs`
     - `crm_payslips`
   - Between `crm_roles` (ends line 384) and `crm_staff_roles` (line 385):
     - `crm_salary_adjustments`
     - `crm_salary_profiles`

2. **Column Nullability and Defaults Derivation**:
   - Primary Keys (`id` with `DEFAULT gen_random_uuid()`): `Row` has `string`, `Insert` has `id?: string`, `Update` has `id?: string`.
   - Foreign Keys (`org_id`, `staff_id`, `payroll_run_id`): `NOT NULL` without default. In `Row`: `string`. In `Insert`: required `string`. In `Update`: `string | undefined`.
   - Timestamps (`created_at`, `updated_at` with `DEFAULT now()`): `Row` has `string`, `Insert` has `string | undefined`, `Update` has `string | undefined`.
   - Nullable fields (`locked_at`, `locked_by`, `notes`, `paid_at`, `approved_at`, `approved_by`, `description`, `month_year` in adjustments): In `Row`: `string | null`. In `Insert`: `string | null | undefined`. In `Update`: `string | null | undefined`.
   - Numeric fields with defaults (`base_amount`, `hourly_overtime_rate`, `pf_deduction_percent`, `esi_deduction_percent`, `total_payout`, `gross_salary`, `net_salary`, etc.): In `Row`: `number`. In `Insert`: `number | undefined`. In `Update`: `number | undefined`.
   - JSONB snapshot (`salary_profile_snapshot` in `crm_payslips`): In `Row`: `Json`. In `Insert`: required `salary_profile_snapshot: Json` (since `JSONB NOT NULL` has no database default). In `Update`: `salary_profile_snapshot?: Json`.

3. **Relationships Mapping**:
   - `crm_salary_profiles`: FK `org_id` -> `public.organizations(id)`.
   - `crm_payroll_runs`: FK `org_id` -> `public.organizations(id)`.
   - `crm_payslips`:
     - FK `org_id` -> `public.organizations(id)`
     - FK `payroll_run_id` -> `public.crm_payroll_runs(id)`
   - `crm_salary_adjustments`: FK `org_id` -> `public.organizations(id)`.

4. **Dedicated Domain Types File (`src/types/crmPayroll.ts`)**:
   Paralleling `src/types/crmAttendance.ts`, a domain file is required to provide developer-friendly interfaces, union types, and UI metadata slots for components and utilities, ensuring zero `any`.

---

## 3. Caveats

- **`crm_salary_adjustments.updated_at`**: The spec in `ORIGINAL_REQUEST.md` line 515 lists `created_at TIMESTAMPTZ NOT NULL DEFAULT now()` without explicitly listing `updated_at`. However, status transitions ('pending' -> 'approved' -> 'deducted') standardly update records. Both 12-column (strict spec) and 13-column (with `updated_at`) type definitions are fully provided.
- **`auth.users` Foreign Keys in `types.ts`**: Even though PostgreSQL defines foreign keys `REFERENCES auth.users(id)`, Supabase client types strictly model relationships within the `public` schema. Including `auth.users` in `types.ts.Relationships` causes compiler errors against Supabase PostgREST types.
- **Read-Only Scope**: This report proposes exact code structures for subsequent worker implementation; no source code has been altered during this investigation.

---

## 4. Conclusion & Complete Type Specifications

### 4.1 Exact Code to Insert into `src/integrations/supabase/types.ts`

#### Insertion 1: After `crm_geolocations` (line 314) and before `crm_permissions` (line 315)

```typescript
      crm_payroll_runs: {
        Row: {
          created_at: string
          id: string
          locked_at: string | null
          locked_by: string | null
          month_year: string
          notes: string | null
          org_id: string
          staff_count: number
          status: string
          total_payout: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          month_year: string
          notes?: string | null
          org_id: string
          staff_count?: number
          status?: string
          total_payout?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          month_year?: string
          notes?: string | null
          org_id?: string
          staff_count?: number
          status?: string
          total_payout?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_payroll_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_payslips: {
        Row: {
          absent_days: number
          advance_deduction: number
          bonus_amount: number
          created_at: string
          esi_deduction: number
          gross_salary: number
          half_days: number
          id: string
          lop_days: number
          lop_deduction: number
          month_year: string
          net_salary: number
          org_id: string
          overtime_amount: number
          overtime_minutes: number
          paid_at: string | null
          payment_status: string
          payroll_run_id: string
          pf_deduction: number
          present_days: number
          salary_profile_snapshot: Json
          staff_id: string
          updated_at: string
          working_days_in_month: number
        }
        Insert: {
          absent_days?: number
          advance_deduction?: number
          bonus_amount?: number
          created_at?: string
          esi_deduction?: number
          gross_salary?: number
          half_days?: number
          id?: string
          lop_days?: number
          lop_deduction?: number
          month_year: string
          net_salary?: number
          org_id: string
          overtime_amount?: number
          overtime_minutes?: number
          paid_at?: string | null
          payment_status?: string
          payroll_run_id: string
          pf_deduction?: number
          present_days?: number
          salary_profile_snapshot: Json
          staff_id: string
          updated_at?: string
          working_days_in_month: number
        }
        Update: {
          absent_days?: number
          advance_deduction?: number
          bonus_amount?: number
          created_at?: string
          esi_deduction?: number
          gross_salary?: number
          half_days?: number
          id?: string
          lop_days?: number
          lop_deduction?: number
          month_year?: string
          net_salary?: number
          org_id?: string
          overtime_amount?: number
          overtime_minutes?: number
          paid_at?: string | null
          payment_status?: string
          payroll_run_id?: string
          pf_deduction?: number
          present_days?: number
          salary_profile_snapshot?: Json
          staff_id?: string
          updated_at?: string
          working_days_in_month?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_payslips_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_payslips_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "crm_payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
```

#### Insertion 2: After `crm_roles` (line 384) and before `crm_staff_roles` (line 385)

```typescript
      crm_salary_adjustments: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          description: string | null
          id: string
          month_year: string | null
          org_id: string
          requested_by: string | null
          staff_id: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          month_year?: string | null
          org_id: string
          requested_by?: string | null
          staff_id: string
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          month_year?: string | null
          org_id?: string
          requested_by?: string | null
          staff_id?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_salary_adjustments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_salary_profiles: {
        Row: {
          allowed_leaves_per_month: number
          base_amount: number
          created_at: string
          currency: string
          esi_deduction_percent: number
          hourly_overtime_rate: number
          id: string
          is_active: boolean
          org_id: string
          pf_deduction_percent: number
          salary_type: string
          staff_id: string
          updated_at: string
        }
        Insert: {
          allowed_leaves_per_month?: number
          base_amount?: number
          created_at?: string
          currency?: string
          esi_deduction_percent?: number
          hourly_overtime_rate?: number
          id?: string
          is_active?: boolean
          org_id: string
          pf_deduction_percent?: number
          salary_type?: string
          staff_id: string
          updated_at?: string
        }
        Update: {
          allowed_leaves_per_month?: number
          base_amount?: number
          created_at?: string
          currency?: string
          esi_deduction_percent?: number
          hourly_overtime_rate?: number
          id?: string
          is_active?: boolean
          org_id?: string
          pf_deduction_percent?: number
          salary_type?: string
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_salary_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
```

*(Note: If the migration omits `updated_at` on `crm_salary_adjustments`, simply remove `updated_at` from `Row`, `Insert`, and `Update` for that single table. All other fields remain identical).*

---

### 4.2 Proposed Domain Types File: `src/types/crmPayroll.ts`

To be created in `src/types/crmPayroll.ts`:

```typescript
/**
 * CRM Phase 3: Salary Management & Payroll Engine Domain Types
 * Provides strict union literals, domain entities with UI enrichments,
 * and calculation result interfaces for the payroll engine.
 */

import type { Json } from "@/integrations/supabase/types";

// ============================================================================
// 1. Literal Union Types matching Database CHECK Constraints
// ============================================================================

export type SalaryType = "monthly" | "daily" | "hourly";

export type PayrollRunStatus = "draft" | "locked" | "disbursed";

export type PayslipPaymentStatus = "pending" | "paid" | "partial";

export type SalaryAdjustmentType = "advance" | "bonus" | "deduction" | "loan_repayment";

export type SalaryAdjustmentStatus = "pending" | "approved" | "deducted" | "rejected";

// ============================================================================
// 2. Snapshot of Salary Profile at the time of Payroll Generation
// ============================================================================

export interface CrmSalaryProfileSnapshot {
  salary_type: SalaryType;
  base_amount: number;
  currency: string;
  allowed_leaves_per_month: number;
  hourly_overtime_rate: number;
  pf_deduction_percent: number;
  esi_deduction_percent: number;
}

// ============================================================================
// 3. Domain Entity Interfaces (Database Row + UI Enrichment)
// ============================================================================

export interface CrmSalaryProfile {
  id: string;
  org_id: string;
  staff_id: string;
  staff_name?: string;
  staff_email?: string;
  staff_role?: string;
  salary_type: SalaryType;
  base_amount: number;
  currency: string;
  allowed_leaves_per_month: number;
  hourly_overtime_rate: number;
  pf_deduction_percent: number;
  esi_deduction_percent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CrmPayrollRun {
  id: string;
  org_id: string;
  month_year: string;
  status: PayrollRunStatus;
  total_payout: number;
  staff_count: number;
  locked_by: string | null;
  locked_by_name?: string;
  locked_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmPayslip {
  id: string;
  org_id: string;
  payroll_run_id: string;
  staff_id: string;
  staff_name?: string;
  staff_email?: string;
  staff_role?: string;
  month_year: string;
  salary_profile_snapshot: CrmSalaryProfileSnapshot | Json;
  working_days_in_month: number;
  present_days: number;
  absent_days: number;
  half_days: number;
  lop_days: number;
  overtime_minutes: number;
  gross_salary: number;
  lop_deduction: number;
  overtime_amount: number;
  pf_deduction: number;
  esi_deduction: number;
  advance_deduction: number;
  bonus_amount: number;
  net_salary: number;
  payment_status: PayslipPaymentStatus;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmSalaryAdjustment {
  id: string;
  org_id: string;
  staff_id: string;
  staff_name?: string;
  type: SalaryAdjustmentType;
  amount: number;
  description: string | null;
  month_year: string | null;
  status: SalaryAdjustmentStatus;
  requested_by: string | null;
  requester_name?: string;
  approved_by: string | null;
  approver_name?: string;
  approved_at: string | null;
  created_at: string;
  updated_at?: string;
}

// ============================================================================
// 4. Payroll Calculation Input & Output Contracts (M2 Engine)
// ============================================================================

export interface CrmAttendanceRecordForPayroll {
  staff_id: string;
  date: string;
  status: "present" | "absent" | "half_day" | "on_leave";
  overtime_minutes: number;
  work_duration_minutes: number;
}

export interface PayslipComputedData {
  staffId: string;
  monthYear: string;
  workingDaysInMonth: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  lopDays: number;
  overtimeMinutes: number;
  grossSalary: number;
  lopDeduction: number;
  overtimeAmount: number;
  pfDeduction: number;
  esiDeduction: number;
  advanceDeduction: number;
  bonusAmount: number;
  netSalary: number;
}
```

---

## 5. Verification Method

Once implemented by the milestone worker:

1. **Static Type Checker**:
   ```powershell
   cmd /c npx tsc --noEmit
   ```
   Must pass with **0 errors**, proving zero `any` leaks and full compatibility across the codebase.

2. **Unit Test Suite for Type Verification (`src/test/crmSalaryTypes.test.ts`)**:
   Verify with:
   ```powershell
   cmd /c npx vitest run src/test/crmSalaryTypes.test.ts
   ```
   The test suite should verify:
   - `Database["public"]["Tables"]["crm_salary_profiles"]["Row"]` has exact 13 keys.
   - `Database["public"]["Tables"]["crm_payroll_runs"]["Row"]` has exact 11 keys.
   - `Database["public"]["Tables"]["crm_payslips"]["Row"]` has exact 24 keys.
   - `Database["public"]["Tables"]["crm_salary_adjustments"]["Row"]` has exact 12/13 keys.
   - Minimal and maximal payload assignability on all 4 `Insert` types.
   - Negative compile-time assertions rejecting missing required fields (`org_id`, `staff_id`, `month_year`, `payroll_run_id`, `amount`, `type`).
   - `Update` types allow empty objects `{}` and partial properties.
   - Foreign key relationships to `organizations` and `crm_payroll_runs`.
   - Domain models in `src/types/crmPayroll.ts` assign seamlessly without runtime casts.

3. **Regression Check**:
   ```powershell
   cmd /c npx vitest run src/test/crm*
   ```
   Ensure zero regression against all 20+ existing Phase 1 & Phase 2 CRM test suites.
