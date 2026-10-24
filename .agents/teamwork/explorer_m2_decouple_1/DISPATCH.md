# Dispatch: Explorer M2.1 — Suite Switcher & State Synchronization Architecture

## Mission
Design the concrete implementation of `src/components/SuiteSwitcher.tsx` and the `useActiveSuite()` hook for Milestone 2.

## Authoritative Sources
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (timestamp 2026-10-23T21:58:59Z §R2)
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md`
- Survey Blueprint: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_shells\handoff.md`

## Your Working Directory
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_decouple_1`

## Specific Tasks
1. Design `src/components/SuiteSwitcher.tsx`:
   - Interactive badge/switcher placed next to the logo in the top header.
   - Detects active suite (`location.pathname.startsWith("/crm") ? "crm" : "billing"`).
   - Manages `localStorage` key `"credsmart_active_suite"`.
   - Emits and listens to `credsmart:suite_changed` window events.
   - Allows instant switching between "CredSmart POS & Billing" and "CredSmart CRM".
   - Cashier guard: cashiers are restricted from CRM and see only POS & Billing.
2. Provide hook `useActiveSuite()` or embed cleanly in `src/hooks/useActiveSuite.ts`.
3. Provide drop-in code recommendations for Worker M2.

Write report to `handoff.md` and report completion via `send_message`.

## 2026-10-24T00:06:53Z
You are explorer_m2_decouple_1.
Your working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_decouple_1
Project root: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart

Read your dispatch file: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_decouple_1\DISPATCH.md
Read the authoritative user request: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (see timestamp 2026-10-23T21:58:59Z §R2)
Read PROJECT.md: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md
Read survey blueprint: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_shells\handoff.md

Design the concrete implementation of `src/components/SuiteSwitcher.tsx` and the `useActiveSuite()` hook for Milestone 2.
Write report to handoff.md and report completion back to parent via send_message.
