# Dispatch: Worker M1 (Iteration 2) — Apply Cashier Route Gating Remediation

## Mission
Apply the surgical RBAC route gating remediation to `src/config/routes.ts` and update `src/test/challengerM1_2DecoupleAudit.test.ts` to strictly block cashier access to all CRM subroutes and settings subroutes.

## Source of Truth & Patch File
- Patch file: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_r2_1\remediation.patch`
- Explorer Report: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_r2_1\handoff.md`
- Project Scope: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md`

## Your Working Directory
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1_r2`

## Exclusive Write Ownership
You own and may edit:
1. `src/config/routes.ts`
2. `src/test/challengerM1_2DecoupleAudit.test.ts`
DO NOT edit any other files.

## Instructions
1. Apply the patch from `explorer_m1_r2_1\remediation.patch`:
   - Add all CRM subroutes and settings subroutes to `RESTRICTED_ROUTES_FOR_CASHIER`.
   - In `isRouteAllowedForRole`, add prefix denial for `role === "cashier"`:
     ```typescript
     if (url.startsWith("/crm")) return false;
     if (url.startsWith("/billing/settings") || url === "/billing/settings") return false;
     ```
   - In `src/test/challengerM1_2DecoupleAudit.test.ts`, update the tests to assert `toBe(false)` for cashiers on all CRM and settings subroutes.
2. Verification commands:
   - `cmd /c npx tsc --noEmit`
   - `cmd /c npx vitest run src/test/challengerM1_2DecoupleAudit.test.ts`
   - `cmd /c npx vitest run src/test/crmShellRoutes.test.ts src/test/e2e/decoupleRoutes.test.ts`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Handoff Requirements
Write your detailed report to `handoff.md` in your working directory and notify parent via `send_message`.


## 2026-10-23T23:18:38Z
You are worker_m1_r2.
Your working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1_r2
Project root: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart

Read your dispatch file: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1_r2\DISPATCH.md
Read the patch file: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_r2_1\remediation.patch
Read the explorer report: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_r2_1\handoff.md

Your exclusive write ownership:
1. `src/config/routes.ts`
2. `src/test/challengerM1_2DecoupleAudit.test.ts`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Apply the patch accurately.
Run verification commands:
- `cmd /c npx tsc --noEmit`
- `cmd /c npx vitest run src/test/challengerM1_2DecoupleAudit.test.ts`
- `cmd /c npx vitest run src/test/crmShellRoutes.test.ts src/test/e2e/decoupleRoutes.test.ts`
Ensure all pass with code 0.

Write report to handoff.md and report completion back to parent via send_message.
