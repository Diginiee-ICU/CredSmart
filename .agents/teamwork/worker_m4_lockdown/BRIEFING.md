# BRIEFING — 2026-10-26T22:59:00Z

## Mission
Implement strict POS/Billing route lockdown guard (BillingLockdownGuard.tsx) and wire it into App.tsx while strictly preserving AST regexes and test invariants (Requirement R4).

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_lockdown
- Original parent: 9b1188fd-78cb-4433-afbb-88547ac33d9e
- Milestone: M4 - Strict POS/Billing Access Lockdown & Route Guard

## 🔒 Key Constraints
- Exclusive Write Ownership:
  - `src/components/routing/BillingLockdownGuard.tsx` (new file)
  - `src/App.tsx` (careful edit preserving all AST regexes)
  - `src/test/crmBillingLockdownGuard.test.tsx` (new test suite)
- Mandatory Integrity: No cheating, no fake mocks, genuine implementation.
- Critical Invariants in App.tsx:
  1. Do NOT modify the function body of `RoleProtectedRoute` in `src/App.tsx`. The exact line `return <Navigate to={ROUTE_PATHS.checkout} replace />;` must remain intact.
  2. Route ordering: `<ProtectedRoutes>` < `<Attendance>` (`ROUTE_PATHS.crmAttendance`) < `<RoleProtectedRoute allowedRoles={MANAGER_ROLES}>`.
  3. Keep all 36 legacy routes intact.
- Verification Commands:
  - `cmd /c npx vitest run src/test/challengerM1_2DecoupleAudit.test.ts src/test/crmAttendanceRouteWiringChallenge.test.tsx src/test/crmBillingLockdownGuard.test.tsx`
  - `cmd /c npx tsc --noEmit`

## Current Parent
- Conversation ID: 9b1188fd-78cb-4433-afbb-88547ac33d9e
- Updated: 2026-10-26T22:59:00Z

## Task Summary
- **What to build**:
  - `BillingLockdownGuard.tsx`: evaluates `useAuth()`, `useOrganization()`, and `useCRMPermission()`. Allows super admins, store roles ("store_owner", "super_admin", "admin", "owner", "manager", "partner", "cashier", "salesman", "stock_manager", "delivery_boy", "accountant"), and users with granular permissions (`pos`, `billing`, `sales`, `checkout`). For unauthorized staff, fires a single destructive alert toast and redirects to `ROUTE_PATHS.crm` (`/crm`).
  - `App.tsx`: wraps dedicated POS & Billing routes inside `<Route element={<BillingLockdownGuard />}>` while preserving AST route ordering and all 36 legacy redirects.
  - `crmBillingLockdownGuard.test.tsx`: 35 behavioral and security tests verifying loading states, allowed roles, super admin bypass, granular permissions, unauthorized staff lockdown, single toast firing, and AST invariants.
- **Success criteria**:
  - 97/97 tests passing across the 3 suites
  - `tsc --noEmit` exits with 0 errors
- **Interface contracts**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_defects\PROJECT.md`
- **Code layout**: `src/components/routing/BillingLockdownGuard.tsx`, `src/App.tsx`, `src/test/crmBillingLockdownGuard.test.tsx`

## Key Decisions Made
- Included `SleekRouteLoader` inside `BillingLockdownGuard.tsx` to prevent heavy bundle imports and eliminate potential circular module dependencies with `App.tsx`.
- Protected toast invocation against infinite loops using `useRef` flag (`toastFiredRef.current`).
- Nested `<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />` directly inside `<BillingLockdownGuard />` in `src/App.tsx` to maintain exact index ordering (`ProtectedRoutes < crmAttendance < RoleProtectedRoute`).

## Artifact Index
- `.agents/teamwork/worker_m4_lockdown/DISPATCH.md` — Worker assignment and requirements
- `.agents/teamwork/worker_m4_lockdown/BRIEFING.md` — Situational awareness
- `.agents/teamwork/worker_m4_lockdown/progress.md` — Liveness and progress tracking
- `.agents/teamwork/worker_m4_lockdown/handoff.md` — Final handoff report
- `src/components/routing/BillingLockdownGuard.tsx` — Production route guard
- `src/App.tsx` — Route wiring
- `src/test/crmBillingLockdownGuard.test.tsx` — Test suite

## Change Tracker
- **Files modified**:
  - `src/components/routing/BillingLockdownGuard.tsx` — Implemented POS/billing route lockdown guard
  - `src/App.tsx` — Imported guard and wrapped dedicated billing routes
  - `src/test/crmBillingLockdownGuard.test.tsx` — Authored 35 unit/integration tests
- **Build status**: Pass (tsc --noEmit 0 errors, Vitest 97/97 passing)
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pass (3 suites, 97 tests, 0 failures)
- **Lint status**: 0 violations
- **Tests added/modified**: `src/test/crmBillingLockdownGuard.test.tsx` (35 tests)

## Loaded Skills
- None requested in prompt
