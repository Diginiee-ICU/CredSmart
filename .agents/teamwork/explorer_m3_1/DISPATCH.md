# Task Assignment: Explorer M3-1 (Salary Management UI Page Architecture)
Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m3_1
Target: Milestone M3 — Salary Management UI Page
Read:
- ORIGINAL_REQUEST.md & DISPATCH.md (Milestone 3 sections)
- src/pages/crm/Attendance.tsx (architecture and design reference)
- src/components/crm/ (CRMPageHeader, CRMCard, CRMBadge, CRMDataTable, CRMPermissionGate, CRMStatCard)
- src/hooks/useCRMPermission.ts & .agents/skills/crm-rbac-skill/SKILL.md
Analyze overall page layout, top-level permission gating (`salary`, `view`), 4-tab structure, responsive layouts (375px, 768px, 1280px), brand tokens, and Supabase data hydration.
Report complete blueprint to handoff.md.


## 2026-10-18T11:06:29Z
You are Explorer M3-1 for CredSmart Phase 3: Salary Management & Payroll Engine.
Your working directory is c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m3_1.
Task assignment: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m3_1\DISPATCH.md.
Read:
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase3_gen2\DISPATCH.md
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\src\pages\crm\Attendance.tsx
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\src\components\crm\

Your Task:
Investigate and design the full page architecture for `src/pages/crm/SalaryManagement.tsx`:
- Top-level permission check: `useCRMPermission('salary', 'view')` with `CRMPermissionGate` fallback.
- Header with `CRMPageHeader` (Navy #0F172A, actions, breadcrumbs).
- 4 Tabs:
  - Tab 1: Salary Profiles (default)
  - Tab 2: Payroll Run
  - Tab 3: Advances & Deductions
  - Tab 4: My Payslips
- Layout responsiveness (375px mobile stacked view, 768px tablet, 1280px desktop grid).
- Currency formatting utility for Indian numbering format (₹X,XX,XXX.XX).
- Skeletons and error boundary toasts.

Rules:
- Read-only exploration. DO NOT write or edit source code files yourself.
- Write your complete blueprint to c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m3_1\handoff.md.
- Send a message back to caller with a summary and handoff path.
