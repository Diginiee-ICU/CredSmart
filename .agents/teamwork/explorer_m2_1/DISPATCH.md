# Task Assignment: Explorer M2-1 (Payroll Mathematical Engine Architecture)
Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_1
Target: Milestone M2 — Payroll Calculation Engine
Read:
- ORIGINAL_REQUEST.md & DISPATCH.md
- .agents/skills/crm-attendance-skill/SKILL.md (Section 6: Phase 3 Payroll & Salary Integration Pattern)
- src/utils/crmAttendancePdf.ts (attendance metrics calculations)
- src/types/crmPayroll.ts & src/types/crmAttendance.ts
Analyze mathematical contracts for:
`getWorkingDaysInMonth`, `getDailyRate`, `computeLopDays`, `computeOvertimeAmount`, `computePfDeduction`, `computeEsiDeduction`, `computeNetSalary`, and `generatePayslipData`.
Design zero-division safety, negative clamping, and 2-decimal precision.
Report complete blueprint to handoff.md.


## 2026-10-18T10:15:09Z
You are Explorer M2-1 for CredSmart Phase 3: Salary Management & Payroll Engine.
Your working directory is c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_1.
Task assignment: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_1\DISPATCH.md.
Read:
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase3_gen2\DISPATCH.md
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\crm-attendance-skill\SKILL.md
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\src\types\crmPayroll.ts

Your Task:
Investigate and design the mathematical engine for `src/utils/crmPayrollUtils.ts`.
Analyze:
- `getWorkingDaysInMonth(monthYear: string, weekendDays?: number[]): number` (default Sunday exclusion [0], handles leap years, returns exact working days)
- `getDailyRate(baseSalary: number, workingDays: number): number` (division by zero safeguard: returns 0 if workingDays <= 0)
- `computeLopDays(absentDays: number, allowedLeaves: number): number` (Math.max(0, absentDays - allowedLeaves))
- `computeOvertimeAmount(overtimeMinutes: number, hourlyOvertimeRate: number): number` (Math.round((overtimeMinutes / 60) * hourlyOvertimeRate * 100) / 100)
- `computePfDeduction(grossSalary: number, pfPercent: number): number`
- `computeEsiDeduction(grossSalary: number, esiPercent: number): number`
- `computeNetSalary(params: { baseSalary: number; dailyRate: number; lopDays: number; overtimeAmount: number; bonusAmount: number; pfDeduction: number; esiDeduction: number; advanceDeduction: number; }): number` (clamped to Math.max(0, ...))

Rules:
- Read-only exploration. DO NOT write or edit source code files yourself.
- Write your complete findings to c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_1\handoff.md.
- Send a message back to caller with a summary and handoff path.
