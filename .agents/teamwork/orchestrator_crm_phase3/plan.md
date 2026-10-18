# Plan: CredSmart CRM Phase 3 — Salary Management & Payroll Engine

## Architecture Overview
CredSmart CRM Phase 3 adds salary profiles, monthly payroll generation, LOP and overtime computation based on Phase 2 attendance records, advance salary management, payslip storage, and pure vector PDF export.

All components integrate seamlessly with:
- Phase 1: CRM RBAC (`useCRMPermission`, `CRMPermissionGate`, `CRMDataTable`, `CRMCard`, `CRMBadge`, `CRMStatCard`, `CRMPageHeader`)
- Phase 2: CRM Attendance (`crm_attendance` records for present/absent/half_day/overtime calculations)
- App Shell: `AppSidebar`, `routes.ts`, `App.tsx`, `CRMDashboard.tsx`

## Milestones Decomposition

### M1: Database Schema & Idempotent Migration
- **Artifacts**:
  - `supabase/migrations/20261017020000_create_crm_salary_tables.sql`
  - `src/integrations/supabase/types.ts` (add `crm_salary_profiles`, `crm_payroll_runs`, `crm_payslips`, `crm_salary_adjustments`)
  - `src/test/crmSalaryMigration.test.ts` (15+ tests for SQL schema contracts, constraints, RLS)
  - `src/test/crmSalaryTypes.test.ts` (10+ tests for TypeScript type completeness)
- **Status**: PLANNED

### M2: Payroll Calculation Engine
- **Artifacts**:
  - `src/utils/crmPayrollUtils.ts` (pure math functions, 2-decimal precision, edge case handling, zero div protection)
  - `src/test/crmPayrollUtils.test.ts` (25+ tests covering edge cases)
  - `src/test/crmPayrollUtils.stress.test.ts` (15+ mathematical stress tests)
- **Status**: PLANNED

### M3: Salary Management UI Page
- **Artifacts**:
  - `src/pages/crm/SalaryManagement.tsx` (4 tabs: Salary Profiles, Payroll Run, Advances & Deductions, My Payslips; responsive 375px/768px/1280px; CRM brand tokens; loading skeletons; Supabase integration)
  - `src/test/crmSalaryManagement.test.tsx` (20+ tests)
  - `src/test/crmSalaryManagementAdmin.test.tsx` (12+ tests)
- **Status**: PLANNED

### M4: Vector Payslip PDF Generator
- **Artifacts**:
  - `src/utils/crmPayslipPdf.ts` (pure vector jsPDF, NO autotable, brand colors Navy `#0F172A`, Orange `#FF6A00`, Emerald `#10B981`)
  - `src/test/crmPayslipPdf.test.ts` (15+ tests for PDF generation, currency formatting, edge cases)
- **Status**: PLANNED

### M5: Route Wiring & Dashboard Integration
- **Artifacts**:
  - `src/App.tsx` (wire `/crm/salary` to `SalaryManagement.tsx` under ProtectedRoute + AppLayout)
  - `src/pages/crm/CRMDashboard.tsx` (live query for payroll runs this month)
  - `src/test/crmSalaryRouteWiring.test.tsx` (test route protection and rendering)
- **Status**: PLANNED

### M6: Reusable Skill Documentation
- **Artifacts**:
  - `.agents/skills/crm-salary-skill/SKILL.md` (YAML frontmatter, comprehensive docs, DB schema, formulas, helpers, Phase 4/5 integration contracts, RBAC matrix, jsPDF spec, next migration naming)
- **Status**: PLANNED

### M7: Final E2E Hardening & Full Suite Verification
- **Artifacts**:
  - Typecheck: `cmd /c npx tsc --noEmit` -> 0 errors, zero `any`
  - Vitest: `cmd /c npx vitest run src/test/crm*` -> All Phase 1, 2, 3 tests pass, 0 regressions
  - Visual & edge case verification
- **Status**: PLANNED
