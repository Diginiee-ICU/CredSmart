# DISPATCH — Worker M4-C (CRM Portal & Shared Components Overhaul)

## Identity
- Role: CRM Portal & Tokens Overhaul Worker
- Type: teamwork_preview_worker
- Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_c\
- Parent: Project Orchestrator (3044c8ce-523a-4157-917d-31b6f5d55c6a)

## MANDATORY INTEGRITY WARNING (ZERO TOLERANCE)
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## STRICT QUARANTINE LOCK
Under NO circumstances edit, format, or touch any of the 19 protected invoice creation files:
`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`, `UnifiedInvoiceRenderer.tsx`, `downloadExactInvoice.ts`, etc.

## Assigned Scope & Files Owned Exclusively
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

## References
- Authoritative User Request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (Lines 1120-1218).
- Master Project Architecture: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md`.
- Master Design System Rules: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md`.
- Explorer 3 Report: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m4_3\handoff.md`.

## Concrete Tasks & Non-Negotiable Test Invariants
1. **Shared CRM Components (`src/components/crm/*`)**:
   - `CRMBadge.tsx` & `CRMRolePill.tsx`: Upgrade `sm` size style to `text-[11px] font-semibold`. Reconcile navy `#1D4ED8` to Royal Blue `#2563EB`.
   - `CRMCard.tsx`: Change default `rounded-2xl` to `rounded-xl`. Replace `glass` variant (`backdrop-blur-md bg-white/80`) with clean hairline surface (`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs`). Update `CRM_BRAND_COLORS.blue` to `#2563EB`.
   - `CRMStatCard.tsx`: Change container to `rounded-xl p-3.5`. Reconcile hardcoded accent colors to design system tokens.
   - `CRMPageHeader.tsx`: Streamline title from `text-3xl` to `text-base sm:text-xl font-bold` to eliminate vertical sprawl.
   - `CRMDataTable.tsx`: Change wrapper to `rounded-xl`. Reconcile sort arrow `#1D4ED8` to `text-blue-600 dark:text-blue-400`.
2. **`src/pages/crm/Attendance.tsx`**:
   - Refactor clock-in & clock-out buttons from bloated `h-14 rounded-2xl` with glowing drop shadows to refined 44px/46px touch CTA buttons with `rounded-xl font-bold text-sm shadow-sm active:scale-[0.98]`.
   - **CRITICAL TEST INVARIANT**: Preserve `data-testid="attendance-role-filter"` on the SelectTrigger for role filtering (enforced by `src/test/crmAttendanceRoleFilterStress.test.tsx`).
   - Upgrade `text-[10px]` to `text-[11px]`.
3. **`src/pages/crm/SalaryManagement.tsx`**:
   - **CRITICAL TEST INVARIANT**: Add `<CRMBadge variant="info" size="sm">Phase 3 Live</CRMBadge>` to the page header badge (enforced by `src/test/crmSalaryManagement.test.tsx:482`).
   - Standardize `Add New Profile` and `Record Advance` buttons to `h-8.5 px-3 rounded-lg text-xs font-semibold bg-primary`.
   - Add `tabular-nums` to `font-mono` on all wage figures.
   - Change containers from `rounded-2xl` to `rounded-xl`.
4. **`src/pages/crm/Broadcasts.tsx`**:
   - **CRITICAL TEST INVARIANT**: Add `<CRMBadge variant="info" size="sm">Phase 4 Active</CRMBadge>` to the page header badge (enforced by `src/test/crmSubmodules.test.tsx:97`).
   - Standardize `Publish Broadcast` button to `h-8.5 px-3 rounded-lg text-xs font-semibold bg-primary text-white`.
5. **`src/pages/crm/Tasks.tsx`**:
   - **CRITICAL TEST INVARIANT**: Preserve `min-h-[44px] h-11 px-3 flex items-center` on "Start Job →", "Submit Proof", "Approve ✓" status advance buttons (enforced by `src/test/mobileTouchErgonomicsRemediation.test.ts:111-113`).
   - Upgrade sub-11px micro-fonts (`text-[9px]`, `text-[10px]`) to `text-[11px]`.
   - Change column wrappers from `rounded-2xl` to `rounded-xl`.
6. **`src/pages/crm/CRMDashboard.tsx`**:
   - Standardize header action buttons to `h-8.5 px-3 rounded-lg text-xs font-semibold bg-primary text-white shadow-2xs`.
   - Restyle `quickNavItems` cards to use neutral slate containers with royal blue accents, eliminating rainbow distraction.
7. **`Meet.tsx`, `AIAssistant.tsx`, `Support.tsx`**:
   - Replace bloated `h-11 px-4` send button in `AIAssistant.tsx` with standard `h-8.5 px-3 rounded-lg text-xs font-semibold`.
   - Replace rainbow gradient card backgrounds with clean neutral surfaces.
   - Upgrade `text-[10px]` to `text-[11px]`.

## Verification Commands
- `cmd /c npx tsc --noEmit` (exit code 0, 0 errors).
- `cmd /c npx eslint src/components/crm/CRMBadge.tsx src/components/crm/CRMCard.tsx src/pages/crm/Attendance.tsx src/pages/crm/CRMDashboard.tsx src/pages/crm/Tasks.tsx src/pages/crm/SalaryManagement.tsx src/pages/crm/Broadcasts.tsx` (0 errors).
- `cmd /c npx vitest run src/test/crmSubmodules.test.tsx src/test/crmSalaryManagement.test.tsx src/test/crmAttendanceRoleFilterStress.test.tsx src/test/mobileTouchErgonomicsRemediation.test.ts` (all pass 100%).
- Verify 0 diff lines on the 19 quarantined protected files.

Write your handoff report to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_c\handoff.md` and report completion via `send_message`.


## 2026-10-24T21:24:49Z
[Message] timestamp=2026-10-24T21:24:49Z sender=3044c8ce-523a-4157-917d-31b6f5d55c6a priority=MESSAGE_PRIORITY_HIGH content=You are Worker M4-C for Milestone 4 (CRM Portal & Shared Components Overhaul).
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_c\

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

STRICT QUARANTINE LOCK:
Under NO circumstances edit, format, or touch any of the 19 protected invoice creation files:
MobileCreateInvoice.tsx, SalesInvoiceModal.tsx, AddItemModal.tsx, SelectPartyModal.tsx, EditItemModal.tsx, MobileInvoiceSuccessView.tsx, MobileBillPreviewModal.tsx, MobileInvoiceFitViewer.tsx, CreatePartyModal.tsx (in invoices/mobile/), MobileCreatePurchaseInvoice.tsx, CreateNewItemModal.tsx (in items/mobile/), PurchaseInvoiceModal.tsx, AddItemsToBillModal.tsx, InvoiceFitView.tsx, UnifiedInvoiceRenderer.tsx, downloadExactInvoice.ts, whatsappPdfShare.ts, invoiceThemeLoader.ts, documentsService.ts.

Read your full dispatch directive:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_c\DISPATCH.md
Read the authoritative user request:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (Lines 1120-1218).
Read the project architecture:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md.
Read the master design rules:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md.
Read Explorer 3 report:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m4_3\handoff.md

Execute the overhaul across:
src/components/crm/* and src/pages/crm/* per DISPATCH.md.
CRITICAL INVARIANTS:
1. Attendance.tsx: preserve data-testid="attendance-role-filter"
2. SalaryManagement.tsx: add/preserve <CRMBadge variant="info" size="sm">Phase 3 Live</CRMBadge>
3. Broadcasts.tsx: add/preserve <CRMBadge variant="info" size="sm">Phase 4 Active</CRMBadge>
4. Tasks.tsx: preserve min-h-[44px] h-11 px-3 flex items-center on status buttons
Verify with:
- cmd /c npx tsc --noEmit
- cmd /c npx eslint src/components/crm/CRMBadge.tsx src/components/crm/CRMCard.tsx src/pages/crm/Attendance.tsx src/pages/crm/CRMDashboard.tsx src/pages/crm/Tasks.tsx src/pages/crm/SalaryManagement.tsx src/pages/crm/Broadcasts.tsx
- cmd /c npx vitest run src/test/crmSubmodules.test.tsx src/test/crmSalaryManagement.test.tsx src/test/crmAttendanceRoleFilterStress.test.tsx src/test/mobileTouchErgonomicsRemediation.test.ts
- Verify 0 diff lines on the 19 protected files.

Write your handoff report to c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_c\handoff.md and report completion via send_message to orchestrator (3044c8ce-523a-4157-917d-31b6f5d55c6a).
