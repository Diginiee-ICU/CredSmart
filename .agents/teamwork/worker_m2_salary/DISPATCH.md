## 2026-10-26T20:44:10Z
You are Worker M2 implementing Milestone 2: Salary & Payroll Staff Synchronization (Requirement R2) for CredSmart CRM Defects Elimination.

Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2_salary
Authoritative Request: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (MUST read section ## 2026-10-26T19:54:47Z before starting work!)
Project Scope: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_defects\PROJECT.md
Survey & Forensic Analysis Reports:
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_staff_salary\survey_staff_salary.md
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_staff_salary\handoff.md

Exclusive Write Ownership:
- `src/pages/crm/SalaryManagement.tsx`
- `src/test/crmSalaryManagement.test.tsx` (if needed for test mocks alignment)

Detailed Tasks:
1. Hydrate `staffDirectory` in `SalaryManagement.tsx`:
   - Query `crmApi.getCRMStaff(effectiveOrgId)`. If `staffRes?.data` has items, populate `dirMap`.
   - Fallback: check `localStorage.getItem("credsmart_crm_staff_" + effectiveOrgId)`.
   - Fallback: call `settingsApi.getMemberships(effectiveOrgId)` and map user fields (`m.user?.full_name || m.user?.name || m.full_name || m.name`) directly into `dirMap` WITHOUT querying the non-existent `profiles` table.
   - Add a `window.addEventListener('credsmart:crm_staff_updated', ...)` listener so that staff directory reloads whenever staff are added/updated.
2. Display both Configured Profiles AND Unconfigured Staff in Tab 1 (Salary Profiles):
   - Compute unconfigured staff: `const unconfiguredStaff = Object.values(staffDirectory).filter(s => !salaryProfiles.some(p => p.staff_id === s.id));`
   - Render configured profiles table/cards.
   - Render unconfigured staff section or unified roster with clear badge ("Not Configured" / Amber).
   - Provide a prominent 1-click **"Configure Salary"** button on each unconfigured staff row that opens the slide-over drawer with their staff ID, full name, role pre-selected, and standard default values.
3. Ensure `p.staff_name` correctly renders the real name:
   - `staffDirectory[p.staff_id]?.name || p.staff_name || "Staff Member"`.
4. Fix test suite `src/test/crmSalaryManagement.test.tsx`:
   - Run `cmd /c npx vitest run src/test/crmSalaryManagement.test.tsx`.
   - Fix all 11 failing tests so 21/21+ tests pass cleanly!
   - Run `cmd /c npx vitest run src/test/crmSalary* src/test/crmPayroll*`.
   - Run `cmd /c npx tsc --noEmit` to verify zero TypeScript errors.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Output Requirements:
- Write implementation log in `progress.md`.
- Run tests and record test output.
- Write completion report in `handoff.md`.
- Send message back to orchestrator.
