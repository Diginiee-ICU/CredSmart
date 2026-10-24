# Survey Dispatch: Dual Portal Onboarding, Entry Routing & Auth State

## Mission
Investigate authentication flow, post-login routing, organization setup, onboarding preferences, and build/test verification infrastructure.

## Source of Truth
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (timestamp 2026-10-23T21:58:59Z)
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_decouple\DISPATCH.md`

## Your Working Directory
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_onboarding`

## Specific Investigation Tasks
1. Inspect authentication context and login routing (`src/pages/Auth.tsx`, `src/pages/Login.tsx`, auth hooks, onboarding components).
2. Analyze how organization setup and onboarding works, and how to introduce suite preference ("POS & Billing" vs "CRM" vs "Both").
3. Determine how entry routing should work for root `/` or `/app` for authenticated users (routing to preferred or last-active suite while preserving deep links).
4. Review existing test infrastructure (Vitest setup, test commands, existing billing/CRM/RBAC tests) and build scripts (`package.json`, `tsconfig.json`).
5. Ensure zero collateral damage to protected billing flows (`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, etc.).

## Handoff Requirements
Write comprehensive analysis and integration blueprint to `handoff.md` in your working directory. Use send_message to report completion back to parent.

## 2026-10-23T22:02:10Z
[Message] sender=8ac6491a-275d-4c1c-b664-961cd66511b1 priority=MESSAGE_PRIORITY_HIGH
Mission:
Investigate authentication flow, post-login routing, organization setup, onboarding preferences, and build/test verification infrastructure.
1. Inspect authentication context and login routing (`src/pages/Auth.tsx`, `src/pages/Login.tsx`, auth hooks, onboarding components).
2. Analyze how organization setup and onboarding works, and how to introduce suite preference ("POS & Billing" vs "CRM" vs "Both").
3. Determine how entry routing should work for root `/` or `/app` for authenticated users (routing to preferred or last-active suite while preserving deep links).
4. Review existing test infrastructure (Vitest setup, test commands, existing billing/CRM/RBAC tests) and build scripts (`package.json`, `tsconfig.json`).
5. Ensure zero collateral damage to protected billing flows (`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, etc.).

Write your findings to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_onboarding\handoff.md`.
Communicate your completion back to parent via send_message.
