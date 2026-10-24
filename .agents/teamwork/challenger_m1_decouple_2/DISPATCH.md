# Dispatch: Challenger M1.2 — RBAC & Route Boundary Adversarial Verification

## Mission
Adversarially challenge and verify role-based route access controls (RBAC), cashier restrictions across `/billing/*` and legacy paths, and AST syntax resilience.

## Source of Truth & Context
- Authoritative User Request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (timestamp 2026-10-23T21:58:59Z)
- Project Scope: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md`
- Test Readiness: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\TEST_READY.md`
- Worker M1 Handoff: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1_decouple\handoff.md`

## Your Working Directory
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\challenger_m1_decouple_2`

## Specific Challenger Tasks
1. Verify cashier route boundaries:
   - Cashiers must be blocked from CRM paths (`/crm/*`).
   - Cashiers accessing `/pos` or `/billing/pos` or `/billing/checkout` must be permitted.
   - `normalizeRouteForRbac` must correctly normalize `/billing/*` routes to their core permission keys.
2. Run empirical challenge test suites:
   - `cmd /c npx vitest run src/test/crmAttendanceRouteWiringChallenge.test.tsx`
   - `cmd /c npx vitest run src/test/crmChallengerM1.test.ts`
   - `cmd /c npx vitest run src/test/crmChallengerM1_2.test.ts`
3. Render a clear empirical verdict: `APPROVE` or `REQUEST_CHANGES`.

## Handoff Requirements
Write your challenge report to `handoff.md` in your working directory. State your verdict clearly. Notify parent via `send_message`.

## 2026-10-23T22:45:07Z
You are challenger_m1_decouple_2.
Adversarially challenge RBAC boundary controls, cashier role permissions across `/billing/*` and legacy routes, and AST structure.
Run empirical tests:
- `cmd /c npx vitest run src/test/crmAttendanceRouteWiringChallenge.test.tsx`
- `cmd /c npx vitest run src/test/crmChallengerM1.test.ts`
- `cmd /c npx vitest run src/test/crmChallengerM1_2.test.ts`
Render verdict: APPROVE or REQUEST_CHANGES.
Write report to handoff.md and notify parent via send_message.
