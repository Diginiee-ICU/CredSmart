# Review & Adversarial Challenge Report: Phase 3 Milestone M2 (Payroll Calculation Engine)

**Reviewer**: Reviewer M2-2  
**Milestone**: Phase 3 Milestone M2 — Payroll Calculation Engine & Utilities  
**Target Code**: `src/utils/crmPayrollUtils.ts`, `src/types/crmPayroll.ts`  
**Upstream Worker Report**: `.agents/teamwork/worker_m2_1/handoff.md`  
**Date**: 2026-10-18T11:00:00Z  
**Verdict**: **APPROVE**

---

## 1. Observation

### 1.1 Requirements & Scope
The assignment assigned to Reviewer M2-2 in `DISPATCH.md`:
1. Examine `generatePayslipData` attendance and adjustments integration, snapshot fidelity, and `salary_type` behavior.
2. Run full regression test suite: `cmd /c npx vitest run crmSalary` and `cmd /c npx vitest run src/test/crmAttendanceMigrationStress.test.ts src/test/crmPermissionRbac.test.ts`.
3. Check for any regression across Phase 1 & 2 tests.
4. Report APPROVE or REQUEST_CHANGES in `handoff.md`.

### 1.2 Static Type Checking
- Command executed:
  ```bash
  cmd /c npx tsc --noEmit
  ```
- Output verbatim:
  ```
  The command exited with code 0.
  Stdout: (empty)
  Stderr: (empty)
  ```
- Result: 0 TypeScript errors across the entire codebase. Strict typing maintained with zero `any` types in CRM files.

### 1.3 M2 Test Execution (`crmPayroll`)
- Command executed:
  ```bash
  cmd /c npx vitest run crmPayroll
  ```
- Output verbatim:
  ```
  ✓ src/test/crmPayrollUtils.test.ts (48 tests) 36ms
  ✓ src/test/crmPayrollUtils.stress.test.ts (16 tests) 399ms

  Test Files  2 passed (2)
       Tests  64 passed (64)
    Duration  5.37s
  ```

### 1.4 Regression Verification Suite 1 (`crmSalary`)
- Command executed:
  ```bash
  cmd /c npx vitest run crmSalary
  ```
- Output verbatim:
  ```
  ✓ src/test/crmSalaryTypes.test.ts (20 tests) 33ms
  ✓ src/test/crmSalaryMigration.test.ts (22 tests) 153ms
  ✓ src/test/crmSalaryMigrationStress.challenger.test.ts (29 tests) 320ms
  ✓ src/test/crmSalaryTypes.challenger.test.ts (27 tests) 33ms

  Test Files  4 passed (4)
       Tests  98 passed (98)
    Duration  9.21s
  ```

### 1.5 Regression Verification Suite 2 (Phase 1 & Phase 2 Core Tests)
- Command executed:
  ```bash
  cmd /c npx vitest run src/test/crmAttendanceMigrationStress.test.ts src/test/crmPermissionRbac.test.ts
  ```
- Output verbatim:
  ```
  ✓ src/test/crmAttendanceMigrationStress.test.ts (31 tests) 51ms
  ✓ src/test/crmPermissionRbac.test.ts (26 tests) 3424ms

  Test Files  2 passed (2)
       Tests  57 passed (57)
    Duration  9.11s
  ```

### 1.6 Source Code Inspection
- Inspected `src/utils/crmPayrollUtils.ts` (390 lines):
  - Pure functions: `round2` (lines 32-35), `getWorkingDaysInMonth` (lines 47-71), `getDailyRate` (lines 81-89), `computeLopDays` (lines 99-105), `computeOvertimeAmount` (lines 114-125), `computePfDeduction` (lines 133-144), `computeEsiDeduction` (lines 153-164), `computeNetSalary` (lines 191-208), `createSalaryProfileSnapshot` (lines 214-224), `generatePayslipData` (lines 233-389).
  - Domain interfaces re-exported: `CrmSalaryProfile`, `CrmAttendanceRecord`, `CrmSalaryAdjustment`, `PayslipComputedData`, `CrmSalaryProfileSnapshot`.
- Inspected `src/types/crmPayroll.ts` (165 lines):
  - Strict type definitions for snapshot: `CrmSalaryProfileSnapshot` (lines 30-38) matching database `JSONB` schema.
  - Complete domain entity contracts with UI enrichments.

---

## 2. Logic Chain

1. **Integrity & Authenticity Audit**:
   - Inspected `src/utils/crmPayrollUtils.ts` for integrity violations (hardcoded test values, dummy stubs, shortcuts, facades).
   - Finding: The code contains genuine, algorithmic implementations of calendar month parsing (`Date.UTC`), daily wage division, fractional LOP subtraction, hourly overtime rate calculations, statutory PF/ESI percentage clamping, and payslip data aggregation.
   - Zero hardcoding of test expectations or lookup facades detected.

2. **Calendar Determinism & Zero Timezone Drift**:
   - `getWorkingDaysInMonth` parses `monthYear` via regex `^(\d{4})-(0[1-9]|1[0-2])$`. Days are evaluated using `new Date(Date.UTC(year, month - 1, day)).getUTCDay()`.
   - UTC evaluation eliminates daylight saving or local timezone offsets. Tested across astronomical leap years (1900 = 28 days non-leap, 2000 = 29 days leap, 2024 = 29 days leap, 2100 = 28 days non-leap) and verified 100% accurate.

3. **Division by Zero & Numerical Boundary Safeguards**:
   - `getDailyRate` explicitly validates `if (!isFinite(safeBase) || safeBase <= 0) return 0; if (!isFinite(safeDays) || safeDays <= 0) return 0;`.
   - `generatePayslipData` checks `if (workingDaysInMonth <= 0)` and returns a zeroed payslip immediately, preventing `NaN` or `Infinity` from propagating.
   - `computeNetSalary` clamps net salary to `Math.max(0, ...)` ensuring that even when total deductions exceed gross earnings, net salary never goes negative.

4. **Multi-Salary Type Arithmetic (`salary_type`)**:
   - **`monthly`**: `dailyRate = round2(rawBase / workingDaysInMonth)`, `grossBase = rawBase`, LOP deduction = `Math.min(grossBase, round2(dailyRate * lopDays))`.
   - **`daily`**: `dailyRate = rawBase`, `grossBase = round2(dailyRate * (presentDays + 0.5 * halfDays))`, LOP deduction = 0 (unworked days are automatically excluded from earned base).
   - **`hourly`**: `dailyRate = round2(rawBase * 8)`, `grossBase = round2(rawBase * (presentDays * 8 + halfDays * 4))`, LOP deduction = 0.
   - All three types accurately calculate base compensation without cross-type distortion.

5. **Attendance Aggregation & Fractional LOP Days**:
   - Attendance records are filtered by `staff_id` and `date.startsWith(monthYear)`.
   - Half-days (`status === 'half_day'`) are factored as `0.5` days: `effectiveAbsentDays = absentDays + halfDays * 0.5`.
   - `lopDays = computeLopDays(effectiveAbsentDays, allowedLeaves)` accurately yields fractional values (e.g. 0.5 LOP days), adhering to database `NUMERIC(5,2)` precision.

6. **Adjustments Integration & Security Gating**:
   - In `generatePayslipData` (lines 337-342), only adjustments where `status === 'approved'` are processed. Pending and rejected adjustments are strictly ignored.
   - Unscheduled adjustments (`month_year == null` or `""`) correctly apply to the active run.
   - Adjustments of type `advance`, `loan_repayment`, and `deduction` aggregate into `advanceDeduction`, while `bonus` aggregates into `bonusAmount`.

7. **Snapshot Fidelity (`createSalaryProfileSnapshot`)**:
   - Captures all 7 configuration attributes (`salary_type`, `base_amount`, `currency`, `allowed_leaves_per_month`, `hourly_overtime_rate`, `pf_deduction_percent`, `esi_deduction_percent`).
   - Normalizes nulls/undefined to safe numeric 0 and rounds to 2 decimals, ensuring immutable audit trails in `crm_payslips.salary_profile_snapshot`.

8. **Mathematical Precision & Monte Carlo Oracle Validation**:
   - In `crmPayrollUtils.stress.test.ts`, 1,000 randomized Monte Carlo test cases were executed comparing the floating-point engine against an independent integer Cent Oracle.
   - Observed maximum cumulative drift across all 1,000 iterations: `<= ₹0.01` (within 1 cent rounding tolerance).

---

## 3. Findings

### [Minor] Finding 1: Date Hardcoding in Legacy Test Fixture `crmAttendanceRoleFilterStress.challenger.test.tsx`
- **What**: When executing the broad pattern `cmd /c npx vitest run crmAttendance`, one test file (`src/test/crmAttendanceRoleFilterStress.challenger.test.tsx`) failed while 10 other attendance suites passed.
- **Where**: `src/test/crmAttendanceRoleFilterStress.challenger.test.tsx:69-70`
- **Why**: The test mock data hardcoded `const TODAY = "2026-10-17";` instead of using dynamic date `new Date().toISOString().split("T")[0]`. On `2026-10-18`, `Attendance.tsx` defaults its date filter to today's date (`2026-10-18`), causing zero records to be matched on initial render.
- **Impact Assessment**: Zero impact on Milestone M2 and zero impact on production code. The standard test suite `src/test/crmAttendanceRoleFilterStress.test.tsx` uses dynamic dates and passes 100%. The regression test specifically mandated by dispatch (`src/test/crmAttendanceMigrationStress.test.ts`) passed 100% (31/31 tests).
- **Suggestion**: In a subsequent maintenance cleanup, update lines 69-70 of `src/test/crmAttendanceRoleFilterStress.challenger.test.tsx` to `const TODAY = new Date().toISOString().split("T")[0];`.

---

## 4. Caveats

- **Weekend Configuration**: `getWorkingDaysInMonth` defaults to Sunday exclusion (`weekendDays = [0]`). If an organization observes a 5-day work week (Monday–Friday), callers should pass `weekendDays = [0, 6]`.
- **Pre-filtering for Extreme Enterprise Rosters**: For multi-thousand employee databases, passing pre-filtered arrays to `generatePayslipData` improves batch throughput.

---

## 5. Conclusion

**Verdict: APPROVE**

Milestone M2 (Payroll Calculation Engine) strictly fulfills all requirements set forth in `ORIGINAL_REQUEST.md`:
- `src/utils/crmPayrollUtils.ts` implements all pure calculation functions with 2-decimal precision, division-by-zero safeguards, and negative-clamping.
- Complete multi-salary type support (`monthly`, `daily`, `hourly`) validated.
- Fractional LOP days, overtime rate fallback, and approved adjustment aggregation verified.
- Immutable snapshot fidelity verified.
- All 64 M2 tests pass (`src/test/crmPayrollUtils.test.ts` [48 tests], `src/test/crmPayrollUtils.stress.test.ts` [16 tests]).
- `cmd /c npx tsc --noEmit` exits with 0 errors.
- 0 regressions on Phase 1 & 2 tests (`crmSalary` [98 tests passed], `crmAttendanceMigrationStress` & `crmPermissionRbac` [57 tests passed]).
- Zero integrity violations detected.

---

## 6. Verification Method

To independently reproduce this verification:

1. **Verify TypeScript compilation**:
   ```bash
   cmd /c npx tsc --noEmit
   ```
   *Expected*: Code 0, 0 errors.

2. **Run M2 payroll test suites**:
   ```bash
   cmd /c npx vitest run crmPayroll
   ```
   *Expected*: 2 files, 64 passed.

3. **Run Phase 3 salary regression suites**:
   ```bash
   cmd /c npx vitest run crmSalary
   ```
   *Expected*: 4 files, 98 passed.

4. **Run Phase 1 & 2 regression suites**:
   ```bash
   cmd /c npx vitest run src/test/crmAttendanceMigrationStress.test.ts src/test/crmPermissionRbac.test.ts
   ```
   *Expected*: 2 files, 57 passed.
