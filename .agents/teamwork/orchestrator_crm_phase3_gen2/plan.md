# Project Plan: CredSmart CRM Phase 3 — Salary Management & Payroll Engine

## Architecture Overview
- **Storage/DB**: Supabase PostgreSQL with 4 dedicated tables:
  1. `crm_salary_profiles` (staff salary configuration, leaves, overtime rate, PF/ESI)
  2. `crm_payroll_runs` (monthly aggregate runs, draft/locked/disbursed status, totals)
  3. `crm_payslips` (individual payslips linked to run and staff, snapshot of calculation)
  4. `crm_salary_adjustments` (advances, bonuses, deductions, loan repayments)
- **Engine**: `src/utils/crmPayrollUtils.ts`
  - Pure calculation functions for working days, daily rates, LOP, overtime, PF, ESI, advance deductions, and net salary.
  - Zero division safety (0 working days handling).
  - Currency rounding to 2 decimals.
- **UI**: `src/pages/crm/SalaryManagement.tsx`
  - 4 Tabs:
    - Tab 1: Salary Profiles (Staff table, profile config drawer, add drawer)
    - Tab 2: Payroll Run (Month selector, run generator preview, totals summary, Lock Payroll, Mark Disbursed) - Admin gated
    - Tab 3: Advances & Deductions (Adjustment table, Record Advance form, Approve/Reject actions)
    - Tab 4: My Payslips (Self-service payslip cards, download PDF)
  - Full mobile responsiveness, CRM design system tokens, CRMPermissionGate
- **PDF Export**: `src/utils/crmPayslipPdf.ts`
  - Pure vector jsPDF primitives (rect, line, text) without autotable plugin.
  - Professional branding (Navy #0F172A, Orange #FF6A00, Emerald #10B981).
- **Navigation & Dashboard**:
  - `/crm/salary` route in `App.tsx` protected by AppLayout + ProtectedRoute.
  - Live payroll run count stat card in `CRMDashboard.tsx`.
- **Reusable Documentation**:
  - `.agents/skills/crm-salary-skill/SKILL.md` with full schema, API contracts, RBAC mapping, and integration guidance.
- **Hardening & Verification**:
  - Strict TypeScript check (`cmd /c npx tsc --noEmit`), Vitest suite for all CRM modules, zero regressions.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|--------------|--------|
| M1 | Database Schema & Migration | Migration SQL + Supabase Types update + Schema/Type tests | None | DONE |
| M2 | Payroll Calculation Engine | `crmPayrollUtils.ts` + 25+ unit & stress tests | M1 | DONE |
| M3 | Salary Management UI Page | `SalaryManagement.tsx` (4 tabs) + test suite | M1, M2 | DONE |
| M4 | Vector Payslip PDF Generator | `crmPayslipPdf.ts` vector renderer + test suite | M2 | PLANNED |
| M5 | Route Wiring & Dashboard Integration | `App.tsx` + `CRMDashboard.tsx` + route tests | M3 | PLANNED |
| M6 | Reusable Skill Documentation | `.agents/skills/crm-salary-skill/SKILL.md` | M1..M5 | PLANNED |
| M7 | Final E2E Hardening | `tsc --noEmit`, full `vitest run src/test/crm*`, regression check | M1..M6 | PLANNED |

## Interface Contracts
- `CrmSalaryProfile`: `id`, `org_id`, `staff_id`, `salary_type`, `base_amount`, `currency`, `allowed_leaves_per_month`, `hourly_overtime_rate`, `pf_deduction_percent`, `esi_deduction_percent`, `is_active`
- `CrmPayrollRun`: `id`, `org_id`, `month_year`, `status`, `total_payout`, `staff_count`, `locked_by`, `locked_at`, `notes`
- `CrmPayslip`: `id`, `org_id`, `payroll_run_id`, `staff_id`, `month_year`, `salary_profile_snapshot`, `working_days_in_month`, `present_days`, `absent_days`, `half_days`, `lop_days`, `overtime_minutes`, `gross_salary`, `lop_deduction`, `overtime_amount`, `pf_deduction`, `esi_deduction`, `advance_deduction`, `bonus_amount`, `net_salary`, `payment_status`
- `CrmSalaryAdjustment`: `id`, `org_id`, `staff_id`, `type`, `amount`, `description`, `month_year`, `status`, `requested_by`, `approved_by`
- `useCRMPermission('salary', 'view' | 'edit' | 'approve')` gating UI actions.
