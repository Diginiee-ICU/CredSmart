# Task Assignment: Explorer M2-3 (Payroll Unit & Stress Testing Architecture)
Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_3
Target: Milestone M2 — Payroll Calculation Engine
Read:
- ORIGINAL_REQUEST.md & DISPATCH.md
- src/types/crmPayroll.ts
Design test suites for:
1. `src/test/crmPayrollUtils.test.ts` (25+ tests: 0 salary, 0 LOP, max overtime, advance > net clamped, half-day logic, PF+ESI stacking, full month absent, leap years, boundary months).
2. `src/test/crmPayrollUtils.stress.test.ts` (15+ tests: mathematical stress testing across monthly, daily, and hourly salary types, floating point precision stability, high volume records).
Report complete blueprint to handoff.md.

## 2026-10-18T10:15:10Z
[Message] timestamp=2026-10-18T10:15:10Z sender=caf7924e-19e5-4a1d-ae03-b43c66838dd3 priority=MESSAGE_PRIORITY_HIGH content=You are Explorer M2-3 for CredSmart Phase 3: Salary Management & Payroll Engine.
Your working directory is c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_3.
Task assignment: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_3\DISPATCH.md.
Read:
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase3_gen2\DISPATCH.md
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\src\types\crmPayroll.ts

Your Task:
Design comprehensive test architectures for Milestone 2:
1. `src/test/crmPayrollUtils.test.ts` (25+ unit tests):
   - Zero base salary, zero working days (div-by-zero prevention)
   - Zero absent days, zero LOP days
   - Allowed leaves >= absent days -> LOP = 0
   - Half-day calculations (0.5 present, 0.5 absent)
   - Large overtime minutes & hourly rate
   - PF and ESI percentage computations and boundaries (0%, 12%, 1.75%, 100%)
   - Advance deduction exceeding gross -> net salary clamped to 0
   - Full month absent -> net salary 0
   - Multiple adjustments (approved vs pending/rejected)
2. `src/test/crmPayrollUtils.stress.test.ts` (15+ stress tests):
   - High volume attendance logs (e.g., 365 daily records)
   - Mathematical precision and rounding drift across 1,000 randomized cycles
   - Salary types: monthly vs daily vs hourly
Provide exact test structures, assertion patterns, and commands.

Rules:
- Read-only exploration. DO NOT write or edit source code files yourself.
- Write your complete findings to c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_3\handoff.md.
- Send a message back to caller with a summary and handoff path.
