# DISPATCH: Project Orchestrator — CRM Phase 3: Salary Management & Payroll Engine

## Mission
Build a fully integrated CRM Tab — Phase 3: Salary Management & Payroll Engine — inside CredSmart, a React + Vite + TypeScript + Supabase PWA business management platform. All UI must be polished, production-quality, matching the existing CredSmart mobile + desktop design standards, using the custom CRM design system in `src/components/crm/` and RBAC integration from Phase 1.

Working directory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase3`
Project Root: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart`
Original User Request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md`

Integrity mode: benchmark (no restrictions — any approach that works)

## CRITICAL: Read These Skill Files First (Before Writing Any Code)
1. Read `.agents/skills/crm-rbac-skill/SKILL.md` — Phase 1 RBAC patterns, useCRMPermission hook, CRMPermissionGate usage
2. Read `.agents/skills/crm-attendance-skill/SKILL.md` — Phase 2 attendance data schema, Haversine engine, shift rules, and the Phase 3 payroll integration contract (LOP formulas, overtime reconciliation)

## Tech Stack & Phase 1+2 Foundations
- Frontend: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- Backend/DB: Supabase (client in src/integrations/supabase/)
- Auth: Supabase Auth (existing useAuth.tsx hook)
- App shell: src/components/AppSidebar.tsx, src/components/AppLayout.tsx, src/config/routes.ts
- CRM Design System: src/components/crm/ (CRMCard, CRMBadge, CRMDataTable, CRMPageHeader, CRMStatCard, CRMPermissionGate, CRMRolePill)
- RBAC Hook: src/hooks/useCRMPermission.ts
- Phase 2 Attendance tables: `crm_attendance`, `crm_geolocations`, `crm_attendance_requests` (already exist in supabase/migrations/20261017010000_...)
- Brand colors: Navy #0F172A, Orange #FF6A00, Blue #1D4ED8, Emerald #10B981, Gold #F59E0B
- Route path `ROUTE_PATHS.crmSalary` is already defined in src/config/routes.ts as '/crm/salary'

## Milestone Structure (7 Milestones)

### M1: Database Schema & Idempotent Migration
Create `supabase/migrations/20261017020000_create_crm_salary_tables.sql`:
1. `public.crm_salary_profiles`:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE`
   - `staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
   - `salary_type TEXT NOT NULL DEFAULT 'monthly' CHECK (salary_type IN ('monthly', 'daily', 'hourly'))`
   - `base_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00`
   - `currency TEXT NOT NULL DEFAULT 'INR'`
   - `allowed_leaves_per_month INTEGER NOT NULL DEFAULT 2`
   - `hourly_overtime_rate NUMERIC(10,2) DEFAULT 0.00`
   - `pf_deduction_percent NUMERIC(5,2) DEFAULT 0.00`
   - `esi_deduction_percent NUMERIC(5,2) DEFAULT 0.00`
   - `is_active BOOLEAN NOT NULL DEFAULT true`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - `CONSTRAINT uq_crm_salary_profiles_staff UNIQUE (org_id, staff_id)`

2. `public.crm_payroll_runs`:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE`
   - `month_year TEXT NOT NULL` (format: 'YYYY-MM', e.g. '2026-10')
   - `status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'locked', 'disbursed'))`
   - `total_payout NUMERIC(14,2) DEFAULT 0.00`
   - `staff_count INTEGER DEFAULT 0`
   - `locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL`
   - `locked_at TIMESTAMPTZ`
   - `notes TEXT`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - `CONSTRAINT uq_crm_payroll_runs_month UNIQUE (org_id, month_year)`

3. `public.crm_payslips`:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE`
   - `payroll_run_id UUID NOT NULL REFERENCES public.crm_payroll_runs(id) ON DELETE CASCADE`
   - `staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
   - `month_year TEXT NOT NULL`
   - `salary_profile_snapshot JSONB NOT NULL` (snapshot of crm_salary_profiles at time of payroll)
   - `working_days_in_month INTEGER NOT NULL`
   - `present_days INTEGER NOT NULL DEFAULT 0`
   - `absent_days INTEGER NOT NULL DEFAULT 0`
   - `half_days INTEGER NOT NULL DEFAULT 0`
   - `lop_days NUMERIC(5,2) NOT NULL DEFAULT 0` (loss of pay days = max(0, absent_days - allowed_leaves))
   - `overtime_minutes INTEGER NOT NULL DEFAULT 0`
   - `gross_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00`
   - `lop_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00`
   - `overtime_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00`
   - `pf_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00`
   - `esi_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00`
   - `advance_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00`
   - `bonus_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00`
   - `net_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00`
   - `payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial'))`
   - `paid_at TIMESTAMPTZ`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - `CONSTRAINT uq_crm_payslips_staff_month UNIQUE (org_id, staff_id, month_year)`

4. `public.crm_salary_adjustments`:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE`
   - `staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
   - `type TEXT NOT NULL CHECK (type IN ('advance', 'bonus', 'deduction', 'loan_repayment'))`
   - `amount NUMERIC(12,2) NOT NULL`
   - `description TEXT`
   - `month_year TEXT` (if null, deducted in the next payroll run)
   - `status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'deducted', 'rejected'))`
   - `requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL`
   - `approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL`
   - `approved_at TIMESTAMPTZ`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

5. RLS: Enable RLS on all 4 tables. Add policy: `USING (has_org_access(org_id))` for SELECT/INSERT/UPDATE/DELETE.
6. All tables use `CREATE TABLE IF NOT EXISTS`. All indexes use `CREATE INDEX IF NOT EXISTS`.

Also update `src/integrations/supabase/types.ts` with these new table definitions (follow the same pattern used for Phase 2 attendance types).

Write tests:
- `src/test/crmSalaryMigration.test.ts` — 15+ tests verifying migration schema contracts, type validation, constraint logic
- `src/test/crmSalaryTypes.test.ts` — 10+ tests verifying TypeScript type completeness

### M2: Payroll Calculation Engine
Create `src/utils/crmPayrollUtils.ts` with exported functions:
- `getWorkingDaysInMonth(monthYear: string, weekendDays?: number[]): number`
- `getDailyRate(baseSalary: number, workingDays: number): number`
- `computeLopDays(absentDays: number, allowedLeaves: number): number`
- `computeOvertimeAmount(overtimeMinutes: number, hourlyOvertimeRate: number): number`
- `computePfDeduction(grossSalary: number, pfPercent: number): number`
- `computeEsiDeduction(grossSalary: number, esiPercent: number): number`
- `computeNetSalary(params: { baseSalary: number; dailyRate: number; lopDays: number; overtimeAmount: number; bonusAmount: number; pfDeduction: number; esiDeduction: number; advanceDeduction: number; }): number`
- `generatePayslipData(params: { staffId: string; monthYear: string; salaryProfile: CrmSalaryProfile; attendanceRecords: CrmAttendanceRecord[]; adjustments: CrmSalaryAdjustment[]; }): PayslipComputedData`

All computations: pure functions, `Math.round(x * 100) / 100` for 2-decimal precision, handle edge cases (zero salary, zero working days, negative values clamped to 0).

Export TypeScript interfaces: `CrmSalaryProfile`, `CrmAttendanceRecord`, `CrmSalaryAdjustment`, `PayslipComputedData`.

Write tests:
- `src/test/crmPayrollUtils.test.ts` — 25+ tests: edge cases (0 salary, 0 LOP, max overtime, advance > net, half-day logic, PF+ESI stacking, full month absent)
- `src/test/crmPayrollUtils.stress.test.ts` — 15+ mathematical stress tests verifying formula accuracy across different salary types

### M3: Salary Management UI Page
Create `src/pages/crm/SalaryManagement.tsx` (full polished page):
- Tab 1 — Salary Profiles (default tab): Table of all staff with salary profile (`CRMDataTable`), Configure drawer, Add New Profile drawer.
- Tab 2 — Payroll Run (admin only, gated with `useCRMPermission('salary', 'approve')`): Month picker, Generate Payroll button, preview table, summary totals bar, Lock Payroll button, Mark as Disbursed button, warning toast if profile missing.
- Tab 3 — Advances & Deductions: Table of all adjustments with type badge, Record Advance button/form, Approve/Reject actions (gated with approve permission).
- Tab 4 — My Payslips (staff self-service, all authenticated CRM users): Grid of past payslips for logged-in user with Month, Net Pay, Status badge, Download PDF button.

Design requirements:
- Full mobile responsiveness (375px, 768px, 1280px)
- All CRM brand tokens (Navy `#0F172A`, Orange `#FF6A00`, Blue `#1D4ED8`, Emerald `#10B981`, Gold `#F59E0B`)
- Use `CRMPageHeader`, `CRMCard`, `CRMBadge`, `CRMDataTable`, `CRMPermissionGate`, `CRMStatCard` from `src/components/crm/`
- Gated top-level with `useCRMPermission('salary', 'view')`
- Loading skeletons using shadcn Skeleton component during data fetch
- Error boundary toast on Supabase errors

Write tests:
- `src/test/crmSalaryManagement.test.tsx` — 20+ tests: render, tab switching, form validation, permission gating, loading states
- `src/test/crmSalaryManagementAdmin.test.tsx` — 12+ tests: payroll run generation, lock/disburse flow, advance approval

### M4: Vector Payslip PDF Generator
Create `src/utils/crmPayslipPdf.ts`:
- `generatePayslipPDF(payslip: PayslipComputedData, staffName: string, orgName: string): void`
- Uses pure vector jsPDF primitives (rect, line, text) — NO autotable plugin
- Navy `#0F172A` header, Orange `#FF6A00` section titles, Emerald `#10B981` net pay highlight
- Strict zero `any` types

Write tests:
- `src/test/crmPayslipPdf.test.ts` — 15+ tests: PDF content verification, correct ₹ formatting, zero-deduction payslip, max deduction payslip, edge cases

### M5: Route Wiring & Dashboard Integration
- In `src/App.tsx`: Wire `/crm/salary` route pointing to `SalaryManagement.tsx` under ProtectedRoute + AppLayout wrapper.
- In `src/pages/crm/CRMDashboard.tsx`: Add/update the Salary stat card to query `crm_payroll_runs` for live count this month.
- Test: `src/test/crmSalaryRouteWiring.test.tsx`

### M6: Reusable Skill Documentation
Create `.agents/skills/crm-salary-skill/SKILL.md` with YAML frontmatter documenting full schema, formulas, helpers, Phase 4/5 integration contracts, RBAC matrix, working day conventions, jsPDF spec, next migration convention (`20261017030000_create_crm_task_tables.sql`).

### M7: Final E2E Hardening
1. `cmd /c npx tsc --noEmit` — 0 errors, zero `any` types
2. `cmd /c npx vitest run src/test/crmSalary* src/test/crmPayroll*` — ALL pass
3. `cmd /c npx vitest run src/test/crm*` — 0 regressions across Phase 1, 2, 3
4. Verify all 4 tabs render cleanly
5. Verify edge case: 0 working days handled gracefully without div-by-zero
6. Verify jsPDF does not throw on empty/zero data
7. Report final test count

## Key Constraints
- Zero TypeScript `any` types anywhere in CRM files
- Zero ESLint errors
- All SQL migrations are idempotent (IF NOT EXISTS, ON CONFLICT DO NOTHING)
- `cmd /c npx` for all CLI commands (PowerShell execution policy)
- Import from `src/components/crm/` design system — never inline duplicate components
- All monetary amounts formatted as ₹X,XX,XXX.XX (Indian numeral system)
- All Supabase queries must handle loading + error states
- Mobile-first responsive design


## 2026-10-18T09:00:19Z
You are the Project Orchestrator for CredSmart Phase 3: Salary Management & Payroll Engine.
Your working directory is `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase3`.
Your dispatch instructions are at `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase3\DISPATCH.md`.
The original user request is at `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md`.

Read `.agents/skills/crm-rbac-skill/SKILL.md` and `.agents/skills/crm-attendance-skill/SKILL.md` first.
Decompose the project across Milestones M1 through M7 (M1: Database Schema & Migration, M2: Payroll Calculation Engine, M3: Salary Management UI Page, M4: Vector Payslip PDF Generator, M5: Route Wiring & Dashboard Integration, M6: Reusable Skill Documentation, M7: Final E2E Hardening).
Spawn specialist workers, challengers, reviewers, and test writers in their respective directories under `.agents/teamwork/`.
Maintain `plan.md` and `progress.md` in your working directory.
Ensure zero TypeScript errors (`cmd /c npx tsc --noEmit`), zero regressions on Phase 1 & 2 tests (`cmd /c npx vitest run src/test/crm*`), and all Phase 3 tests pass.
When all acceptance criteria are fully met, report victory back to me with detailed summary of completed deliverables and test results.


## 2026-10-18T09:33:33Z
Sentinel liveness ping: Please report current status and next steps on Milestone M1.
