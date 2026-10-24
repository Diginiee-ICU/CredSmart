# Dispatch: Worker M2 — Navigation Shells & Suite Switcher

## Mission
Implement Milestone 2: Navigation Shells & Suite Switcher.
Create `src/hooks/useActiveSuite.ts` and `src/components/SuiteSwitcher.tsx`, and integrate them into `src/components/AppLayout.tsx` and `src/components/AppSidebar.tsx` to provide dedicated navigation sidebars, adaptive mobile docks, and persistent suite switching between CredSmart POS & Billing (`/billing/*`) and CredSmart CRM (`/crm/*`).

## Source of Truth & Explorer Reports
- Authoritative User Request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (timestamp 2026-10-23T21:58:59Z §R2)
- Project Scope: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md`
- Test Readiness: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\TEST_READY.md`
- Explorer M2.1 Report: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_decouple_1\handoff.md` (`SuiteSwitcher.tsx` & `useActiveSuite.ts`)
- Explorer M2.2 Report: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_decouple_2\handoff.md` (`AppLayout.tsx`)
- Explorer M2.3 Report: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_decouple_3\handoff.md` (`AppSidebar.tsx` and `proposed_AppSidebar.tsx`)

## Your Working Directory
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2_decouple`

## Exclusive Write Ownership
You own and may edit:
1. `src/hooks/useActiveSuite.ts` (create)
2. `src/components/SuiteSwitcher.tsx` (create)
3. `src/components/AppLayout.tsx`
4. `src/components/AppSidebar.tsx`
DO NOT edit any other files. Strictly do NOT touch the 5 protected invoice creation files.

## Specific Implementation Instructions
1. Create `src/hooks/useActiveSuite.ts`:
   - Manages active suite state (`"billing"` | `"crm"`).
   - Syncs with `localStorage.getItem("credsmart_active_suite")`.
   - Listens to and emits `window.dispatchEvent(new CustomEvent("credsmart:suite_changed", { detail: { suite } }))`.
   - Listens to browser `"storage"` events for cross-tab sync.
   - Restricts cashiers: cashiers always return `"billing"` and cannot switch.
2. Create `src/components/SuiteSwitcher.tsx`:
   - Interactive segmented switch / pill placed in top header next to brand logo.
   - Amber pill/badge for POS & Billing, Emerald for CRM.
   - ARIA attributes: `role="group"`, `role="radio"`, `aria-checked`.
   - Instant switching via React Router `navigate("/billing")` / `navigate("/crm")`.
   - Hidden or disabled for `cashier`.
3. Update `src/components/AppLayout.tsx`:
   - Render `<SuiteSwitcher />` next to brand logo.
   - Brand logo links to `/billing` when in Billing suite and `/crm` when in CRM suite.
   - Page metadata title/subtitle expands to cover all CRM and Billing submodules.
   - Header actions: Tally import and "+ New Invoice" in billing suite; hide Tally and show CRM quick actions in CRM suite.
   - Strictly preserve all regex string literals for `mobileErgonomicsChallenger.test.ts`:
     - `flex flex-col h-screen w-full overflow-hidden`
     - `flex-1 min-w-0 flex flex-col`
     - `isMobile && !isPosRoute && "pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"`
     - `isMobile && isPosRoute && "pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))]"`
4. Update `src/components/AppSidebar.tsx`:
   - Popover mega-menu renders `BILLING_NAV_ROUTES` for Billing and `CRM_NAV_ROUTES` for CRM.
   - Adaptive mobile bottom dock:
     - Billing: Home (`/billing`), Sales (`/billing/sales`), Center Elevated POS Billing (`/billing/checkout`), Items (`/billing/items`), Purchases (`/billing/purchases`). (For cashiers, ensure all tabs are permitted).
     - CRM: Command (`/crm`), Attendance (`/crm/attendance`), Center Elevated Punch/Task, Payroll (`/crm/salary`), Roles (`/crm/roles`).
   - Strictly preserve regex string literals:
     - `pb-[max(0.65rem,env(safe-area-inset-bottom,0px))]`
     - `fixed bottom-0 left-0 right-0 z-50`
   - Retain 44px minimum hit targets.
5. Verification Commands:
   - `cmd /c npx tsc --noEmit`
   - `cmd /c npx vitest run src/test/e2e/decoupleShells.test.tsx src/test/mobileErgonomicsChallenger.test.ts`
   - `cmd /c npx vitest run src/test/crmShellRoutes.test.ts src/test/crmShellNavigation.audit.test.ts`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Handoff Requirements
Write your detailed report to `handoff.md` in your working directory and notify parent via `send_message`.


## 2026-10-24T00:18:13Z
You are worker_m2_decouple.
Your working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2_decouple
Project root: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart

Read your dispatch file: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2_decouple\DISPATCH.md
Read the authoritative user request: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (see timestamp 2026-10-23T21:58:59Z §R2)
Read PROJECT.md: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md
Read the 3 Explorer reports:
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_decouple_1\handoff.md
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_decouple_2\handoff.md
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_decouple_3\handoff.md and proposed_AppSidebar.tsx

Your exclusive write ownership:
1. `src/hooks/useActiveSuite.ts` (create)
2. `src/components/SuiteSwitcher.tsx` (create)
3. `src/components/AppLayout.tsx`
4. `src/components/AppSidebar.tsx`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Execute the implementation according to DISPATCH.md instructions.
Run verification commands:
- `cmd /c npx tsc --noEmit`
- `cmd /c npx vitest run src/test/e2e/decoupleShells.test.tsx src/test/mobileErgonomicsChallenger.test.ts`
- `cmd /c npx vitest run src/test/crmShellRoutes.test.ts src/test/crmShellNavigation.audit.test.ts`
Ensure all pass with code 0.

Write report to handoff.md and report completion back to parent via send_message.
