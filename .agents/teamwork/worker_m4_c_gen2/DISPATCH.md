# DISPATCH — Worker M4-C Gen2 (CRM Portal & Shared Components Overhaul)

## 🔒 My Identity
- Archetype: teamwork_preview_worker
- Role: CRM Portal & Tokens Worker
- Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_c_gen2
- Parent: Orchestrator (3044c8ce-523a-4157-917d-31b6f5d55c6a)

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Assigned Scope
1. `src/components/crm/CRMBadge.tsx`
2. `src/components/crm/CRMRolePill.tsx`
3. `src/components/crm/CRMCard.tsx`
4. `src/components/crm/CRMStatCard.tsx`
5. `src/components/crm/CRMPageHeader.tsx`
6. `src/components/crm/CRMDataTable.tsx`
7. `src/pages/crm/Attendance.tsx`
8. `src/pages/crm/CRMDashboard.tsx`
9. `src/pages/crm/Tasks.tsx`
10. `src/pages/crm/SalaryManagement.tsx`
11. `src/pages/crm/Broadcasts.tsx`
12. `src/pages/crm/Meet.tsx`, `src/pages/crm/AIAssistant.tsx`, `src/pages/crm/Support.tsx`

## Protected Quarantine (STRICT NO-EDIT LOCK)
DO NOT touch any of the 19 invoice files (e.g. MobileCreateInvoice.tsx, SalesInvoiceModal.tsx, AddItemModal.tsx, SelectPartyModal.tsx, EditItemModal.tsx, UnifiedInvoiceRenderer.tsx, downloadExactInvoice.ts, etc.).

## CRITICAL TEST INVARIANTS (MUST PRESERVE)
1. `src/pages/crm/Attendance.tsx`: Line 2074 must keep `data-testid="attendance-role-filter"` on SelectTrigger (enforced by `crmAttendanceRoleFilterStress.test.tsx`).
2. `src/pages/crm/SalaryManagement.tsx`: Header badge must render `"Phase 3 Live"` (e.g. `<CRMBadge variant="info" size="sm">Phase 3 Live</CRMBadge>`, enforced by `crmSalaryManagement.test.tsx:482`).
3. `src/pages/crm/Broadcasts.tsx`: Header badge must render `"Phase 4 Active"` (enforced by `crmSubmodules.test.tsx:97`).
4. `src/pages/crm/Tasks.tsx`: Lines 984, 1001, 1020 must keep `min-h-[44px] h-11 px-3 flex items-center` on status buttons (enforced by `mobileTouchErgonomicsRemediation.test.ts:111-113`).

## Detailed Refactoring Instructions
Refer to:
- `.agents/rules/minimal-design-system.md`
- `.agents/skills/credsmart-minimal-design-system/SKILL.md`
- `.agents/teamwork/explorer_m4_3/handoff.md`

### 1. Shared CRM Components
- `CRMBadge.tsx` & `CRMRolePill.tsx`: Standardize `sm` size to `text-[11px] font-semibold`.
- `CRMCard.tsx` & `CRMStatCard.tsx`: Standardize padding to `p-3.5`, borders to `border-slate-200/80 dark:border-slate-800`, shadows to `shadow-xs`. Purge neon glows and 3D tilts.

### 2. CRM Pages
- Standardize action buttons to Royal Blue `#2563EB` (`bg-blue-600 hover:bg-blue-700`) and standard heights (34px standard action `h-8.5 px-3 rounded-lg text-xs font-semibold`, 28px table action `h-7 px-2.5 rounded-md text-[11px] font-medium`).
- In `Attendance.tsx`: Refactor clock-in/clock-out buttons from bloated `h-14` to ergonomic `h-10` or `h-11` with clean borders and subtle shadows.
- Elevate sub-11px micro-fonts to `text-[11px]`.
- Add `tabular-nums font-mono` to all wages, currency amounts, and dates.

## Verification Requirements
- `cmd /c npx tsc --noEmit` must pass with 0 errors.
- Run `cmd /c npx vitest run src/test/crmSubmodules.test.tsx src/test/crmSalaryManagement.test.tsx src/test/crmAttendanceRoleFilterStress.test.tsx`.
- Verify 0 git diff on 19 quarantined files.
- Write handoff.md in your working directory and notify parent.
