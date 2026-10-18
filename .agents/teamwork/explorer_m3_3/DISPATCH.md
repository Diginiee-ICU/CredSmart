# Task Assignment: Explorer M3-3 (UI & Admin Workflow Test Architecture)
Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m3_3
Target: Milestone M3 — Salary Management UI Page
Read:
- ORIGINAL_REQUEST.md & DISPATCH.md
- src/test/crmAttendancePage.test.tsx or existing CRM UI tests
Design test architectures for:
1. `src/test/crmSalaryManagement.test.tsx` (20+ tests):
   - Page render, title, and CRMPageHeader
   - Permission gating with `useCRMPermission('salary', 'view')`
   - Tab switching between all 4 tabs
   - Loading skeletons during fetch
   - Indian numeral currency formatting ₹X,XX,XXX.XX
   - Empty state renders
   - Profile drawer form validation
2. `src/test/crmSalaryManagementAdmin.test.tsx` (12+ tests):
   - Payroll run month selection and generation trigger
   - Gating with `useCRMPermission('salary', 'approve')`
   - Summary totals bar calculation
   - "Lock Payroll" action and disabled states
   - "Mark as Disbursed" enabled only when locked
   - Advance approval/rejection actions
Report complete blueprint to handoff.md.


## 2026-10-18T11:06:30Z
[Message] timestamp=2026-10-18T11:06:30Z sender=caf7924e-19e5-4a1d-ae03-b43c66838dd3 priority=MESSAGE_PRIORITY_HIGH content=You are Explorer M3-3 for CredSmart Phase 3: Salary Management & Payroll Engine.
Your working directory is c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m3_3.
Task assignment: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m3_3\DISPATCH.md.
Read:
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase3_gen2\DISPATCH.md
- Existing UI tests: `src/test/crmAttendancePage.test.tsx` (or other page tests in src/test/)

Your Task:
Design comprehensive test specifications for:
1. `src/test/crmSalaryManagement.test.tsx` (20+ tests):
   - Page render, header, tab switching, mobile/desktop responsiveness, loading skeleton, error toasts, permission gating with view permission.
2. `src/test/crmSalaryManagementAdmin.test.tsx` (12+ tests):
   - Payroll run generation, month picker, summary stats, lock payroll action, mark as disbursed flow, advance approval/rejection gating with approve permission.
Provide complete mock setups for Supabase queries, auth state, and RBAC hooks.

Rules:
- Read-only exploration. DO NOT write or edit source code files yourself.
- Write your complete blueprint to c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m3_3\handoff.md.
- Send a message back to caller with a summary and handoff path.
