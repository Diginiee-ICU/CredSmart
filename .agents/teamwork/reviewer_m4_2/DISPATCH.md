# Task Assignment: Milestone 4 Reviewer 2 — Route Hierarchy & Minimal Design Review

## Objective
Review the route architecture, route guard hierarchy, and minimal design system compliance for Milestone 4 (R4):
- Inspect `src/App.tsx` and verify:
  - Route nesting: `<AppLayout>` contains CRM routes, followed by `<Route element={<BillingLockdownGuard />}>`, which nests POS routes and `<Route element={<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />}>`.
  - Preserved verbatim AST lines for `RoleProtectedRoute`.
  - Preserved index ordering in `crmAttendanceRouteWiringChallenge.test.tsx`.
  - Preserved all 36 legacy redirect routes.
- Inspect `src/components/routing/BillingLockdownGuard.tsx` for compliance with Minimal Design System:
  - Clean SleekRouteLoader typography and animation tokens.
  - Toast configuration with destructive variant.
  - Zero performance regression on route evaluation.

## Relevant Files
- `src/App.tsx`
- `src/components/routing/BillingLockdownGuard.tsx`
- `src/test/crmBillingLockdownGuard.test.tsx`
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_lockdown\handoff.md`

## Verification Requirements
1. Run `cmd /c npx vitest run src/test/challengerM1_2DecoupleAudit.test.ts src/test/crmAttendanceRouteWiringChallenge.test.tsx src/test/crmBillingLockdownGuard.test.tsx`.
2. Run `cmd /c npx tsc --noEmit`.

## Output
Write your handoff report to:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_m4_2\handoff.md`
Send your verdict (`APPROVE` or `REQUEST_CHANGES`) via `send_message` to the orchestrator.


## 2026-10-26T22:59:53Z

You are Reviewer 2 for Milestone 4 (Strict POS/Billing Route Lockdown - Requirement R4).
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_m4_2
Read instructions in: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_m4_2\DISPATCH.md
Read the user request in: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
Read the worker handoff in: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_lockdown\handoff.md

Inspect `src/App.tsx` and `src/components/routing/BillingLockdownGuard.tsx`.
Verify route hierarchy, route ordering (`ProtectedRoutes` < `crmAttendance` < `BillingLockdownGuard` < `RoleProtectedRoute`), all 36 legacy redirect routes, and Minimal Design System compliance.
Run verification commands:
`cmd /c npx vitest run src/test/challengerM1_2DecoupleAudit.test.ts src/test/crmAttendanceRouteWiringChallenge.test.tsx src/test/crmBillingLockdownGuard.test.tsx`
`cmd /c npx tsc --noEmit`

Write your handoff report to: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_m4_2\handoff.md
Send your verdict (APPROVE or REQUEST_CHANGES) via send_message to the orchestrator.
