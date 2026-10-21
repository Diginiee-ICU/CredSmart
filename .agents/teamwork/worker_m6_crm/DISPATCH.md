# Worker Dispatch: Milestone 6 — Full CRM Suite Redesign & Route Wiring

## Identity
- Role: Worker (Milestone 6 — Full CRM Suite & Route Wiring)
- Working Directory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m6_crm`
- Exclusive File Ownership: `src/pages/crm/*` and `src/App.tsx` (lines 66-70 and lines 243-255 only)

## Mandatory Reference Documents
- Original Request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md`
- Project Architecture & Feature Inventory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_core_redesign\PROJECT.md`
- CRM Survey Report: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_crm\handoff.md`
- CRM RBAC Skill: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\crm-rbac-skill\SKILL.md`
- CRM Attendance Skill: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\crm-attendance-skill\SKILL.md`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## STRICT EXCLUSION & PRESERVATION (ZERO TOUCH)
DO NOT touch, modify, or edit any files in `src/components/invoices/mobile/` or `src/components/SalesInvoiceModal.tsx`.

## Mission & Requirements for CRM Suite
1. **CRMDashboard Bug Fix (`src/pages/crm/CRMDashboard.tsx`)**:
   - In lines 3–16, import `Award` from `lucide-react` (used on line 161). This fixes the `ReferenceError: Award is not defined` crash.
   - Refactor command center cards to the hairline Stripe/Linear aesthetic with 8-module quick navigation grid.
2. **`src/App.tsx` Line 247 & Route Fix**:
   - Import `SalaryManagement` from `@/pages/crm/SalaryManagement`.
   - Update line 247: `<Route path={ROUTE_PATHS.crmSalary} element={<SalaryManagement />} />`.
   - Wire routes for dedicated submodules:
     - `ROUTE_PATHS.crmTasks` -> `<Tasks />`
     - `ROUTE_PATHS.crmMeet` -> `<Meet />`
     - `ROUTE_PATHS.crmBroadcasts` -> `<Broadcasts />`
     - `ROUTE_PATHS.crmAiAssistant` and `"/crm/ai"` -> `<AIAssistant />`
     - `ROUTE_PATHS.crmSupport` -> `<Support />`
3. **Dedicated Views for Sub-Modules (`src/pages/crm/`)**:
   - Create `src/pages/crm/Tasks.tsx`: Task list/board with priority tags, status columns, slide-over create task drawer.
   - Create `src/pages/crm/Broadcasts.tsx`: Announcements feed with urgency badges, target audience selector, create broadcast drawer.
   - Create `src/pages/crm/Meet.tsx`: Team huddles, instant room link generator, upcoming calendar.
   - Create `src/pages/crm/AIAssistant.tsx`: AI assistant prompt interface with quick action suggestions and chat stream.
   - Create `src/pages/crm/Support.tsx`: Support ticket queue, SLA countdown badges, status filter, reply thread drawer.
   - All 5 submodules must use the CRM design system (`CRMPageHeader`, `CRMCard`, `CRMBadge`, `CRMDataTable`, `CRMPermissionGate`) and have responsive desktop & mobile layouts.
4. **Attendance (`Attendance.tsx`) & Role Management (`RoleManagement.tsx`) Refinement**:
   - Align Attendance clock-in pod to hairline styling with 1-tap mobile punch card and live GPS lock.
   - Refine RoleManagement permission matrix with mobile accordion support for the 14 actions.
   - Ensure `SalaryManagement.tsx` 4 tabs render cleanly.

## Verification Commands Required
1. `node node_modules/typescript/bin/tsc --noEmit` (Must pass with code 0)
2. `cmd /c npx vitest run src/test/crmShellRoutes.test.ts src/test/crmDashboardResilience.test.tsx` (Must pass, resolving the previous Award error)
3. `cmd /c npx vitest run src/test/crmPayrollUtils.test.ts` (Must pass)

## Output
Write your full completion report to:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m6_crm\handoff.md`
and send a completion message to the caller.
