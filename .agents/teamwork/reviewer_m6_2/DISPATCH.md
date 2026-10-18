## 2026-10-17T17:54:48Z
[Message] timestamp=2026-10-17T17:54:48Z sender=1beca3ca-d4b2-4508-99a0-6c9d39936bfb priority=MESSAGE_PRIORITY_HIGH content=You are reviewer_m6_2 for CRM Phase 2 Milestone 6: Reusable Skill Documentation.
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_m6_2

MANDATORY: Read ORIGINAL_REQUEST.md at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (specifically section ## 2026-10-17T08:52:11Z).
Also read DISPATCH.md at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m6\DISPATCH.md.
Also read worker_m6's handoff at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m6\handoff.md.

Review Tasks:
Inspect `.agents/skills/crm-attendance-skill/SKILL.md` (Sections 5 through 8):
1. Monthly Metrics & Reporting Engine (Section 5):
   - Compare against `src/utils/crmAttendancePdf.ts`:
     - Pure vector jsPDF report standard: zero `jspdf-autotable` dependency.
     - Brand color tokens: Navy (`[15, 23, 42]`), Orange (`[255, 106, 0]`), Emerald (`[16, 185, 129]`), Slate (`[100, 116, 139]`), Light Slate (`[241, 245, 249]`).
     - Multi-page continuation headers, dynamic footers.
     - CSV export specification: RFC 4180 quotation/escaping, 14 standard columns.
2. Phase 3 Payroll & Salary Integration Pattern (Section 6):
   - Verify concrete mathematical integration for consuming `crm_attendance` records in Phase 3 Salary & Payroll:
     - Daily rate formula: $\text{Base Salary} / \text{Working Days in Month}$.
     - Payout calculations: Full days ($1.0 \times \text{Daily Rate}$), Half days ($0.5 \times \text{Daily Rate}$), Overtime ($(\text{OT Minutes} / 60) \times (\text{Hourly Rate} \times \text{OT Multiplier})$), Unpaid LOP Deductions.
     - Supabase query pattern.
3. Permissions Matrix & Gating Conventions (Section 7):
   - Compare against `src/hooks/useCRMPermission.ts`, `src/components/crm/CRMPermissionGate.tsx`, `src/pages/crm/RoleManagement.tsx`:
     - Module: `"attendance"`. Actions: `"view"`, `"create"`, `"edit"`, `"delete"`.
     - Role capabilities (Staff, Cashier, Manager, Super Admin).
4. Testing & Verification Standards (Section 8):
   - Compare against Vitest suites and GPS mock helpers (`mockGeolocationPosition`, `mockGeolocationError`, `mockGeolocationUnsupported`, `resetGeolocationMock`).
5. Run verification commands:
   - `cmd /c npx tsc --noEmit`
   - `npm.cmd test -- crm --run`
6. Output verdict: APPROVE or REQUEST_CHANGES.

Write your report to c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_m6_2\handoff.md and report your verdict via send_message.
