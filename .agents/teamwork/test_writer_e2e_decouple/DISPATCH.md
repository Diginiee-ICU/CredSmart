# Dispatch: E2E Testing Track — CredSmart Decoupling Suite

## Mission
Design and implement an opaque-box, requirement-driven E2E test suite in `src/test/e2e/` covering Tiers 1-4 (≥130 test cases) verifying complete decoupling of CredSmart POS & Billing (`/billing/*`) and CredSmart CRM (`/crm/*`).

## Authoritative Requirements & Sources
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (timestamp 2026-10-23T21:58:59Z)
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md`
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\TEST_INFRA.md`

## Your Working Directory
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\test_writer_e2e_decouple`

## Required Deliverables
1. Comprehensive test files in `src/test/e2e/`:
   - `src/test/e2e/decoupleRoutes.test.ts`: Route tree isolation & redirection matrix (35 paths, parameter and query string preservation).
   - `src/test/e2e/decoupleShells.test.tsx`: Navigation sidebars, Suite Switcher (`credsmart_active_suite`), and adaptive mobile bottom docks.
   - `src/test/e2e/decoupleOnboarding.test.tsx`: Onboarding suite preference selection ("POS & Billing", "CRM", "Both") and post-login / entry routing (`/`, `/app`).
   - `src/test/e2e/decoupleIntegration.test.tsx`: Cross-portal workflows, cashier role restrictions, and direct deep links.
2. Publish `TEST_READY.md` at project root `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\TEST_READY.md` once test files are ready.
3. Write your handoff report to `handoff.md` in your working directory and notify the parent orchestrator via `send_message`.

## Integrity Constraints
DO NOT CHEAT. All tests must genuinely test the specified behavior according to `TEST_INFRA.md`.
DO NOT modify any production code in `src/` (outside `src/test/e2e/`).
Strictly avoid touching the 5 protected invoice creation files.


## 2026-10-23T22:19:56Z
You are test_writer_e2e_decouple.
Your working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\test_writer_e2e_decouple
Project root: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart

Read your dispatch file: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\test_writer_e2e_decouple\DISPATCH.md
Read the authoritative user request: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (see timestamp 2026-10-23T21:58:59Z)
Read the Project Scope: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md
Read the Test Infra Plan: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\TEST_INFRA.md

Your mission:
Design and implement an opaque-box, requirement-driven E2E test suite in `src/test/e2e/` covering Tiers 1-4 (≥130 test cases) verifying complete decoupling of CredSmart POS & Billing (`/billing/*`) and CredSmart CRM (`/crm/*`).
1. Create `src/test/e2e/decoupleRoutes.test.ts` (Tiers 1-3 route isolation, 35 legacy redirects, search params and dynamic parameter preservation).
2. Create `src/test/e2e/decoupleShells.test.tsx` (Tiers 1-3 sidebars, Suite Switcher, active badge, localStorage persistence `credsmart_active_suite`, adaptive mobile docks).
3. Create `src/test/e2e/decoupleOnboarding.test.tsx` (Tiers 1-3 onboarding suite preference selection, entry routing `/` and `/app`, cashier role routing).
4. Create `src/test/e2e/decoupleIntegration.test.tsx` (Tier 4 end-to-end real-world user workflows).
5. When all test files are authored, publish `TEST_READY.md` at project root `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\TEST_READY.md`.

DO NOT CHEAT. All tests must be genuine and execute against the real application contracts.
DO NOT modify any production files in `src/` outside `src/test/e2e/`.
Write your handoff report to `handoff.md` and report completion back to parent via send_message.
