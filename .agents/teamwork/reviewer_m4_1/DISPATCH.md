# Task Assignment: Milestone 4 Reviewer 1 — BillingLockdownGuard & App.tsx Review

## Objective
Review the implementation of Milestone 4 (Strict POS/Billing Access Lockdown & Route Guard - Requirement R4):
- Inspect `src/components/routing/BillingLockdownGuard.tsx`:
  - Verify auth, organization, and CRM permission checks.
  - Verify allowed store roles list and permission flags (`pos`, `sales`, `checkout`, `billing`).
  - Verify unauthorized CRM staff blocking: destructive toast alert and `<Navigate to={ROUTE_PATHS.crm} replace />`.
  - Verify loading state handling (`<SleekRouteLoader />`) and toast latching (`useRef` to prevent infinite re-triggers).
- Inspect `src/App.tsx`:
  - Verify wrapping of POS & Billing routes inside `<Route element={<BillingLockdownGuard />}>`.
  - Verify `RoleProtectedRoute` function body remains intact (`return <Navigate to={ROUTE_PATHS.checkout} replace />;`).
  - Verify route ordering: `<ProtectedRoutes>` < `<Attendance>` < `<RoleProtectedRoute>`.
  - Verify all 36 legacy redirect routes remain declared.

## Relevant Files
- `src/components/routing/BillingLockdownGuard.tsx`
- `src/App.tsx`
- `src/test/crmBillingLockdownGuard.test.tsx`
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_lockdown\handoff.md`
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md`

## Verification Requirements
1. Run `cmd /c npx vitest run src/test/challengerM1_2DecoupleAudit.test.ts src/test/crmAttendanceRouteWiringChallenge.test.tsx src/test/crmBillingLockdownGuard.test.tsx`.
2. Run `cmd /c npx tsc --noEmit`.

## Output
Write your handoff report to:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_m4_1\handoff.md`
Send your verdict (`APPROVE` or `REQUEST_CHANGES`) via `send_message` to the orchestrator.

## 2026-10-26T22:59:51Z
From: 9b1188fd-78cb-4433-afbb-88547ac33d9e
You are Reviewer 1 for Milestone 4 (Strict POS/Billing Route Lockdown - Requirement R4).
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_m4_1
Read instructions in: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_m4_1\DISPATCH.md
Read the user request in: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
Read the worker handoff in: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_lockdown\handoff.md

Inspect `src/components/routing/BillingLockdownGuard.tsx` and `src/App.tsx`.
Verify authorization logic, store roles list, permission flags, unauthorized staff redirect to `/crm` with destructive toast, SleekRouteLoader loading state, toast latching, and AST preservation.
Run verification commands:
`cmd /c npx vitest run src/test/challengerM1_2DecoupleAudit.test.ts src/test/crmAttendanceRouteWiringChallenge.test.tsx src/test/crmBillingLockdownGuard.test.tsx`
`cmd /c npx tsc --noEmit`

Write your handoff report to: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_m4_1\handoff.md
Send your verdict (APPROVE or REQUEST_CHANGES) via send_message to the orchestrator.
