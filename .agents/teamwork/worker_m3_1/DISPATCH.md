# Task Assignment: Worker M3-1 (Salary Management UI Page Implementation)

Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m3_1
Target Milestone: M3 — Salary Management UI Page

## Input Artifacts
- ORIGINAL_REQUEST.md: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
- DISPATCH.md: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase3_gen2\DISPATCH.md
- Explorer M3-1 UI Page Blueprint: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m3_1\handoff.md
- Explorer M3-2 Interactive Workflows Blueprint: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m3_2\handoff.md
- Explorer M3-3 UI Test Strategy Blueprint: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m3_3\handoff.md
- Calculations & Types: `src/utils/crmPayrollUtils.ts`, `src/types/crmPayroll.ts`

## Exclusive Write Ownership
You own and may ONLY edit/create these files:
- `src/pages/crm/SalaryManagement.tsx`
- `src/test/crmSalaryManagement.test.tsx`
- `src/test/crmSalaryManagementAdmin.test.tsx`

## Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Deliverables & Acceptance Criteria
1. Implement `src/pages/crm/SalaryManagement.tsx` with all 4 tabs:
   - Tab 1: Salary Profiles (Table of staff with salary profile using `CRMDataTable`, Add New Profile drawer, Configure Profile drawer).
   - Tab 2: Payroll Run (Admin gated with `useCRMPermission('salary', 'approve')`, Month picker, Generate Payroll button, preview table, summary totals bar, Lock Payroll button, Mark as Disbursed button, warning toast if profile missing).
   - Tab 3: Advances & Deductions (Table of adjustments with type badges, Record Advance button/form, Approve/Reject actions gated with `salary`, `approve`).
   - Tab 4: My Payslips (Staff self-service for authenticated users, grid of past payslips, net pay, status badge, Download PDF button).
   - Top-level permission gate with `useCRMPermission('salary', 'view')` and CRMPermissionGate.
   - Use design system components (`CRMPageHeader`, `CRMCard`, `CRMBadge`, `CRMDataTable`, `CRMStatCard`, `CRMPermissionGate`).
   - Loading skeletons and error boundary toasts.
   - Indian currency format: ₹X,XX,XXX.XX.
   - Mobile responsive (375px, 768px, 1280px).
   - Strict TypeScript compliance, zero `any` types.
2. Implement `src/test/crmSalaryManagement.test.tsx` (20+ tests).
3. Implement `src/test/crmSalaryManagementAdmin.test.tsx` (12+ tests).
4. Run tests: `cmd /c npx vitest run src/test/crmSalaryManagement*.test.tsx`.
5. Run regression tests: `cmd /c npx vitest run crmPayroll crmSalary`.
6. Run `cmd /c npx tsc --noEmit` to verify 0 errors.
7. Author `handoff.md` and report back.
