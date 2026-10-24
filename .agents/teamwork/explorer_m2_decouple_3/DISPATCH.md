# Dispatch: Explorer M2.3 — Dedicated Sidebars & Adaptive Mobile Bottom Docks

## Mission
Design the concrete architecture for `src/components/AppSidebar.tsx` to render dedicated navigation groups (`BILLING_NAV_ROUTES` vs `CRM_NAV_ROUTES`) and adaptive mobile bottom docks.

## Authoritative Sources
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (timestamp 2026-10-23T21:58:59Z §R2)
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md`
- Survey Blueprint: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_shells\handoff.md`

## Your Working Directory
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_decouple_3`

## Specific Tasks
1. Desktop mega-menu / popover navigation in `AppSidebar.tsx`:
   - When on `/billing/*`, render `BILLING_NAV_ROUTES` (4 groups, strictly retail/billing, zero CRM clutter).
   - When on `/crm/*`, render `CRM_NAV_ROUTES` (strictly workforce/CRM, zero billing clutter).
2. Adaptive Mobile Bottom Navigation Dock:
   - When on `/billing/*`: Home (`/billing`), Sales (`/billing/sales`), Center Elevated POS Billing (`/billing/checkout`), Items (`/billing/items`), Purchases (`/billing/purchases`). (For cashiers, ensure all tabs are permitted).
   - When on `/crm/*`: Command (`/crm`), Attendance (`/crm/attendance`), Center Elevated Punch/Task, Payroll (`/crm/salary`), Roles (`/crm/roles`).
3. Strictly preserve regex string literals required by `src/test/mobileErgonomicsChallenger.test.ts`:
   - `pb-[max(0.65rem,env(safe-area-inset-bottom,0px))]`
   - `fixed bottom-0 left-0 right-0 z-50`
   - 44px minimum hit targets.
4. Verify that `src/test/e2e/decoupleShells.test.tsx` and `src/test/crmShellRoutes.test.ts` pass with this design.
5. Provide line-by-line recommendations for Worker M2.

Write report to `handoff.md` and report completion via `send_message`.

## 2026-10-24T00:06:53Z
You are explorer_m2_decouple_3.
Your working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_decouple_3
Project root: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart

Read your dispatch file: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_decouple_3\DISPATCH.md
Read the authoritative user request: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (see timestamp 2026-10-23T21:58:59Z §R2)
Read PROJECT.md: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md
Read survey blueprint: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_shells\handoff.md

Design the concrete architecture for `src/components/AppSidebar.tsx` to render dedicated navigation groups (`BILLING_NAV_ROUTES` vs `CRM_NAV_ROUTES`) and adaptive mobile bottom docks.
Write report to handoff.md and report completion back to parent via send_message.
