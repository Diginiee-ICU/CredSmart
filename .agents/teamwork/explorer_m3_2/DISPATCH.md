# Task Assignment: Explorer M3-2 (Payroll Run & Drawers Interaction Engine)
Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m3_2
Target: Milestone M3 — Salary Management UI Page
Read:
- ORIGINAL_REQUEST.md & DISPATCH.md
- src/utils/crmPayrollUtils.ts
- src/types/crmPayroll.ts
Analyze interactive workflows:
1. Salary Profile Add & Configure Drawers (validation, base salary, currency, leaves, overtime rate, PF%, ESI%).
2. Payroll Run Generation Workflow (gated with `salary`, `approve`): month picker, fetching attendance for month, computing preview using `generatePayslipData`, summary stats bar, lock payroll flow, mark as disbursed flow, warning toast for missing profiles.
3. Advances & Deductions Workflow: Record Advance modal, approve/reject action buttons.
4. My Payslips Grid: Download PDF integration with `generatePayslipPDF`.
Report complete blueprint to handoff.md.


## 2026-10-18T11:06:29Z
You are Explorer M3-2 for CredSmart Phase 3: Salary Management & Payroll Engine.
Your working directory is c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m3_2.
Task assignment: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m3_2\DISPATCH.md.
Read:
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase3_gen2\DISPATCH.md
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\src\utils\crmPayrollUtils.ts
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\src\types\crmPayroll.ts

Your Task:
Investigate and design interactive workflows for `src/pages/crm/SalaryManagement.tsx`:
1. Tab 1: Configure Profile Drawer & Add New Profile Drawer (fields, validation, Supabase upsert to `crm_salary_profiles`).
2. Tab 2: Payroll Run workflow:
   - Month selector ('YYYY-MM')
   - Generate Payroll calculation trigger using `crm_attendance`, `crm_salary_profiles`, and `crm_salary_adjustments` via `generatePayslipData`
   - Summary totals bar: Total Staff, Total Payout, Total Deductions
   - "Lock Payroll" button (gated with `useCRMPermission('salary', 'approve')`) -> persists to `crm_payroll_runs` and `crm_payslips`
   - "Mark as Disbursed" button (enabled only when status === 'locked')
   - Warning toast if any active staff member is missing a salary profile
3. Tab 3: Advances & Deductions workflow:
   - Record Advance drawer/form (`amount`, `staff_id`, `description`, `month_year`)
   - Type badges (advance=Gold, bonus=Emerald, deduction=Orange, loan=Blue)
   - Approve/Reject actions (gated with `salary`, `approve`)
4. Tab 4: My Payslips self-service:
   - Query `crm_payslips` for current authenticated user
   - Card grid with Month, Net Pay, Status badge, Download PDF button.

Rules:
- Read-only exploration. DO NOT write or edit source code files yourself.
- Write your complete blueprint to c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m3_2\handoff.md.
- Send a message back to caller with a summary and handoff path.
