# Task Assignment: Milestone 4 Forensic Integrity Audit (Auditor M4)

## Objective
Perform an exhaustive forensic integrity audit of Milestone 4 changes:
- `src/components/routing/BillingLockdownGuard.tsx`
- `src/App.tsx`

## Mandatory Integrity Forensics
1. Verify genuine route guarding:
   - Verify `BillingLockdownGuard.tsx` implements authentic authorization checks via hooks (`useAuth`, `useOrganization`, `useCRMPermission`).
   - Check that there are no dummy passes, mock bypasses, or hardcoded user emails.
   - Check that unauthorized users genuinely receive destructive alert toast and are redirected to `ROUTE_PATHS.crm`.
2. Verify AST preservation in `src/App.tsx`:
   - Check that `RoleProtectedRoute` function implementation was NOT modified.
   - Check that `return <Navigate to={ROUTE_PATHS.checkout} replace />;` remains verbatim.
   - Check route ordering: `<ProtectedRoutes>` < `<Attendance>` < `<RoleProtectedRoute>`.
   - Check all 36 legacy redirect routes remain declared.
3. Verify quarantine files non-tampering:
   - Run `node verify_protected.cjs` or `git diff HEAD` across all 19 protected billing/invoicing files. Must be 100% untouched (0 diff lines).
4. Run compiler and tests:
   - Run `cmd /c npx vitest run src/test/challengerM1_2DecoupleAudit.test.ts src/test/crmAttendanceRouteWiringChallenge.test.tsx src/test/crmBillingLockdownGuard.test.tsx`
   - Run `cmd /c npx tsc --noEmit`

## Output
Write your report to:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\auditor_m4\handoff.md`
Send your verdict (`CLEAN` or `INTEGRITY VIOLATION`) via `send_message` to the orchestrator.

## 2026-10-26T23:00:00Z
You are Forensic Auditor for Milestone 4 (Strict POS/Billing Route Lockdown - Requirement R4).
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\auditor_m4
Read instructions in: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\auditor_m4\DISPATCH.md
Read the user request in: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
Read the worker handoff in: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_lockdown\handoff.md

Perform full forensic integrity audit on:
- `src/components/routing/BillingLockdownGuard.tsx`
- `src/App.tsx`
Verify:
1. Authentic hook usage (`useAuth`, `useOrganization`, `useCRMPermission`). Zero hardcoded user bypasses or mock facades.
2. Strict preservation of `RoleProtectedRoute` function body (`return <Navigate to={ROUTE_PATHS.checkout} replace />;`) and route ordering.
3. Verification that all 19 quarantined protected files have 0 diff lines (`node verify_protected.cjs`).
4. Execution of Vitest tests and `npx tsc --noEmit`.

Write your report to: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\auditor_m4\handoff.md
Send your verdict (CLEAN or INTEGRITY VIOLATION) via send_message to the orchestrator.
