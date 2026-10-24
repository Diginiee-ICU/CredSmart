# Dispatch: Explorer M2.2 — AppLayout Top Header & Viewport Shell Integration

## Mission
Design the concrete integration of `SuiteSwitcher.tsx` into `src/components/AppLayout.tsx`, header title/subtitle adaptation, quick-action switching, and strict preservation of regex constraints in existing test suites.

## Authoritative Sources
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (timestamp 2026-10-23T21:58:59Z §R2)
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md`
- Survey Blueprint: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_shells\handoff.md`

## Your Working Directory
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_decouple_2`

## Specific Tasks
1. Detail integration of `<SuiteSwitcher />` in `AppLayout.tsx` top header next to the brand logo.
2. Adapt logo click: links to `/billing` when in POS & Billing, and `/crm` when in CRM.
3. Adapt page title and subtitle dynamically based on active suite.
4. Adapt header action buttons: show Tally import and "+ New Invoice" in billing suite; in CRM, hide Tally and show CRM quick actions ("+ Quick Action").
5. Strictly preserve regex string literals required by `src/test/mobileErgonomicsChallenger.test.ts`:
   - `flex flex-col h-screen w-full overflow-hidden`
   - `flex-1 min-w-0 flex flex-col`
   - `isMobile && !isPosRoute && "pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"`
   - `isMobile && isPosRoute && "pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))]"`
6. Provide line-by-line recommendations for Worker M2.

Write report to `handoff.md` and report completion via `send_message`.

## 2026-10-24T00:06:53Z
You are explorer_m2_decouple_2.
Your working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_decouple_2
Project root: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart

Read your dispatch file: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_decouple_2\DISPATCH.md
Read the authoritative user request: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (see timestamp 2026-10-23T21:58:59Z §R2)
Read PROJECT.md: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md
Read survey blueprint: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_shells\handoff.md

Design the concrete integration of `SuiteSwitcher.tsx` into `src/components/AppLayout.tsx`, header title/subtitle adaptation, quick-action switching, and strict preservation of regex constraints in existing test suites.
Write report to handoff.md and report completion back to parent via send_message.
