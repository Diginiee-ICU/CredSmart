# Dispatch: Explorer M1.3 — Cross-Link Audit & Regression Verification

## Mission
Investigate hardcoded navigation calls across the CredSmart codebase, verify compatibility with the new `/billing/*` routes, and map potential regressions.

## Authoritative Requirements & Sources
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (timestamp 2026-10-23T21:58:59Z)
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md` (Milestone 1 Scope)
- Prior Survey Report: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_routes\handoff.md`

## Your Working Directory
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_decouple_3`

## Specific Investigation Tasks
1. Scan for hardcoded `navigate("/pos")`, `navigate("/sales")`, `navigate("/items")`, `navigate("/dashboard")`, `navigate("/customers")`, etc. in `src/`.
2. Confirm whether `ROUTE_PATHS` updates in `src/config/routes.ts` will automatically update components, or if any component has hardcoded string literals.
3. Verify that the 5 protected invoice files (`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`) do NOT need modifications and will work transparently with the redirects.
4. Verify existing test commands (`npx vitest run src/test/crmShellRoutes.test.ts`, etc.) and ensure zero regressions.
5. Provide line-by-line recommendation for Worker M1.

## Handoff Requirements
Write comprehensive analysis and fix strategy to `handoff.md` in your working directory. Report completion back to parent via `send_message`.

## 2026-10-23T22:19:58Z
You are explorer_m1_decouple_3.
Your working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_decouple_3
Project root: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart

Read your dispatch file: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_decouple_3\DISPATCH.md
Read the authoritative user request: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (see timestamp 2026-10-23T21:58:59Z)
Read PROJECT.md: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md

Your mission:
Investigate hardcoded navigation calls across the CredSmart codebase, verify compatibility with the new `/billing/*` routes, and map potential regressions.
1. Scan for hardcoded `navigate("/pos")`, `navigate("/sales")`, `navigate("/items")`, `navigate("/dashboard")`, `navigate("/customers")`, etc. in `src/`.
2. Confirm whether `ROUTE_PATHS` updates in `src/config/routes.ts` will automatically update components.
3. Verify that the 5 protected invoice files (`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`) do NOT need modifications and will work transparently with the redirects.
4. Verify existing test commands (`npx vitest run src/test/crmShellRoutes.test.ts`, etc.) and ensure zero regressions.
5. Provide concrete, line-by-line recommendations for Worker M1.

Write your findings to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_decouple_3\handoff.md`.
Communicate your completion back to parent via send_message.
