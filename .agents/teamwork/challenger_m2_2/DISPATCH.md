# Task Assignment: Challenger M2-2 (Precision Drift & Oracle Invariance Testing)
Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\challenger_m2_2
Target: Milestone M2 Empirical Challenge
Challenge:
1. Challenge floating-point precision drift in `src/utils/crmPayrollUtils.ts`.
2. Verify that `computeNetSalary` and `generatePayslipData` match integer-only Cent Oracle arithmetic within <= ₹0.01 bounded difference.
3. Verify deduction stacking never produces negative net salary.
4. Run `cmd /c npx vitest run src/test/crmPayrollUtils.test.ts`.
Report APPROVE or REJECT in handoff.md.


## 2026-10-18T10:53:38Z
You are Challenger M2-2 for CredSmart Phase 3: Salary Management & Payroll Engine.
Your working directory is c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\challenger_m2_2.
Task assignment: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\challenger_m2_2\DISPATCH.md.
Read:
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2_1\handoff.md
- src/utils/crmPayrollUtils.ts
- src/test/crmPayrollUtils.test.ts

Adversarially challenge precision and invariants:
- Verify floating point error bound <= 0.01 against integer cent oracle.
- Verify total deductions exceeding gross salary are clamped to net salary = 0 (never negative).
- Run cmd /c npx vitest run src/test/crmPayrollUtils.test.ts
Write your verdict (APPROVE or REJECT) to c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\challenger_m2_2\handoff.md.
Send a message back to caller with your verdict and handoff path.
