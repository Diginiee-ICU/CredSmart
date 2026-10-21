# Worker Dispatch: Mobile Touch Target Ergonomics Remediation (Iteration 2)

## Identity
- Role: Worker (Mobile Touch Target Ergonomics Remediation)
- Working Directory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_touch_remediation`

## Mandatory Reference Documents
- Original Request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md`
- Challenger 1 Findings: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\challenger_1_mobile\handoff.md`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## STRICT EXCLUSION & PRESERVATION (ZERO TOUCH)
DO NOT touch, modify, or edit any files in `src/components/invoices/mobile/` or `src/components/SalesInvoiceModal.tsx`.

## Mission: Upgrade Mobile Touch Targets to >= 44x44px
1. `src/pages/Sales.tsx` (lines 1034, 1044, 1054, 1065):
   - Upgrade action buttons (`Print`, `Download`, `WhatsApp Share`, `More Options`) from `w-10 h-10` to `w-11 h-11 min-w-[44px] min-h-[44px]`.
2. `src/pages/Purchases.tsx` (lines 950, 964, 1002, 1035, 1044):
   - Upgrade `Pay Now` button from `h-7 px-2` to `min-h-[44px] px-3.5 flex items-center justify-center`.
   - Upgrade `Print`, `Download PDF`, `WhatsApp Share`, `More Menu` from `min-w-[36px] min-h-[36px]` to `min-w-[44px] min-h-[44px] w-11 h-11`.
3. `src/pages/Items.tsx` (lines 1166, 1176):
   - Upgrade `Adjust` stock button from `h-8` to `min-h-[44px] h-11 px-3 flex items-center`.
   - Upgrade `More Options` button from `h-8 w-8` to `min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center`.
4. `src/pages/Parties.tsx` (lines 1318, 1335, 1353, 1360):
   - Upgrade `Call`, `WhatsApp`, and `Ledger` buttons from `h-8` to `min-h-[44px] h-11 px-3 flex items-center`.
   - Upgrade `More Options` trigger from `h-8 w-8` to `min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center`.
5. `src/components/ui/PaginationBar.tsx` (lines 111, 127, 180, 196):
   - Add `min-w-[44px] min-h-[44px] flex items-center justify-center` to mobile chevron pagination buttons.
6. `src/pages/crm/Tasks.tsx` (lines 607, 623, 633):
   - Upgrade Kanban status action buttons (`Start Job →`, `Submit Proof`, `Approve ✓`) from `h-6` to `min-h-[44px] h-11 px-3 flex items-center`.

## Verification Commands Required
1. `node node_modules/typescript/bin/tsc --noEmit` (Must pass with code 0)
2. `cmd /c npx vitest run src/test/mobileDashboardRedesign.test.tsx src/test/MobileInvoiceSuccessView.test.tsx` (Must pass)

## Output
Write completion report to:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_touch_remediation\handoff.md`
and notify caller.

## 2026-10-21T12:21:14Z
From caller: 2a5bd82c-5175-47f3-a02b-3ee793555f5a
You are Worker (Mobile Touch Target Ergonomics Remediation).
Tasks:
Apply the targeted >=44x44px touch target upgrades to:
1. src/pages/Sales.tsx (action buttons to w-11 h-11 / min-w-[44px] min-h-[44px])
2. src/pages/Purchases.tsx (Pay Now to min-h-[44px] px-3.5, action buttons to min-w-[44px] min-h-[44px] w-11 h-11)
3. src/pages/Items.tsx (Adjust stock to min-h-[44px] h-11, more options to min-w-[44px] min-h-[44px] w-11 h-11)
4. src/pages/Parties.tsx (Call, WhatsApp, Ledger to min-h-[44px] h-11, more options to min-w-[44px] min-h-[44px] w-11 h-11)
5. src/components/ui/PaginationBar.tsx (chevrons to min-w-[44px] min-h-[44px])
6. src/pages/crm/Tasks.tsx (Kanban action buttons to min-h-[44px] h-11 px-3)

Run verification commands:
- node node_modules/typescript/bin/tsc --noEmit
- cmd /c npx vitest run src/test/mobileDashboardRedesign.test.tsx src/test/MobileInvoiceSuccessView.test.tsx

Write report to c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_touch_remediation\handoff.md. Once done, send a message to caller.
