# Task Assignment: Worker M2-1 (Payroll Calculation Engine Implementation)

Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2_1
Target Milestone: M2 — Payroll Calculation Engine

## Input Artifacts
- ORIGINAL_REQUEST.md: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
- DISPATCH.md: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase3_gen2\DISPATCH.md
- Explorer M2-1 Math Engine Blueprint: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_1\handoff.md
- Explorer M2-2 Payslip Aggregation Blueprint: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_2\handoff.md
- Explorer M2-3 Test Suite Architecture: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_3\handoff.md

## Exclusive Write Ownership
You own and may ONLY edit/create these files:
- `src/utils/crmPayrollUtils.ts`
- `src/test/crmPayrollUtils.test.ts`
- `src/test/crmPayrollUtils.stress.test.ts`

## Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Deliverables & Acceptance Criteria
1. Implement `src/utils/crmPayrollUtils.ts` with all required pure functions:
   - `getWorkingDaysInMonth(monthYear: string, weekendDays?: number[]): number`
   - `getDailyRate(baseSalary: number, workingDays: number): number`
   - `computeLopDays(absentDays: number, allowedLeaves: number): number`
   - `computeOvertimeAmount(overtimeMinutes: number, hourlyOvertimeRate: number): number`
   - `computePfDeduction(grossSalary: number, pfPercent: number): number`
   - `computeEsiDeduction(grossSalary: number, esiPercent: number): number`
   - `computeNetSalary(params: { baseSalary: number; dailyRate: number; lopDays: number; overtimeAmount: number; bonusAmount: number; pfDeduction: number; esiDeduction: number; advanceDeduction: number; }): number`
   - `generatePayslipData(params: { staffId: string; monthYear: string; salaryProfile: CrmSalaryProfile; attendanceRecords: CrmAttendanceRecord[]; adjustments: CrmSalaryAdjustment[]; }): PayslipComputedData`
   - Export all TypeScript interfaces (`CrmSalaryProfile`, `CrmAttendanceRecord`, `CrmSalaryAdjustment`, `PayslipComputedData`) re-exported or aliased from `src/types/crmPayroll.ts`.
   - All monetary calculations rounded to 2 decimals using `Math.round(x * 100) / 100`.
   - Div-by-zero protection (0 working days yields 0 daily rate, no NaN or Infinity).
   - Net salary clamped to Math.max(0, ...).
2. Implement `src/test/crmPayrollUtils.test.ts` (25+ tests covering all edge cases, half-days, clamping, and zero conditions).
3. Implement `src/test/crmPayrollUtils.stress.test.ts` (15+ mathematical stress tests across monthly/daily/hourly types).
4. Run tests: `cmd /c npx vitest run src/test/crmPayroll*`.
5. Run regression tests: `cmd /c npx vitest run src/test/crmSalary* src/test/crmAttendance* src/test/crmRbac*`.
6. Run `cmd /c npx tsc --noEmit` to verify 0 errors.

## 2026-10-18T10:24:22Z
Sender: caf7924e-19e5-4a1d-ae03-b43c66838dd3
Content: You are Worker M2-1 for CredSmart Phase 3: Salary Management & Payroll Engine.
Your working directory is c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2_1.
Task assignment: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2_1\DISPATCH.md.
