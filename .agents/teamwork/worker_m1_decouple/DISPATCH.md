# Dispatch: Worker M1 — Route Architecture & Isolation (`/billing/*` & `/crm/*`)

## Mission
Implement Milestone 1: Route Architecture & Isolation. Restructure application routing so all billing tools live under `/billing/*` and CRM tools under `/crm/*`, while implementing a universal parameter- and query-preserving legacy redirection engine for all legacy routes.

## Source of Truth & Explorer Reports
- Authoritative User Request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (timestamp 2026-10-23T21:58:59Z)
- Project Scope: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md`
- Explorer M1.1 Report: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_decouple_1\handoff.md` and proposed code artifact: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_decouple_1\proposed_routes.ts`
- Explorer M1.2 Report: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_decouple_2\handoff.md` (App.tsx and LegacyRedirect.tsx)
- Explorer M1.3 Report: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_decouple_3\handoff.md` (AST regex constraints and regression guards)

## Your Working Directory
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1_decouple`

## Exclusive Write Ownership
You own and may edit:
1. `src/config/routes.ts`
2. `src/components/routing/LegacyRedirect.tsx` (new file)
3. `src/App.tsx`
DO NOT edit any other files. Strictly do NOT touch the 5 protected invoice creation files (`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`).

## Mandatory Instructions & Invariants
1. Update `src/config/routes.ts`:
   - Map all 37 billing/ERP routes to `/billing/*` and add `billing: "/billing"`.
   - Preserve all CRM paths strictly under `/crm/*`.
   - Export `BILLING_NAV_ROUTES` (4 groups, zero CRM clutter) and `CRM_NAV_ROUTES` (all 9 CRM tools, zero billing clutter).
   - Retain `MAIN_NAV_ROUTES` and `NAV_ROUTES` verbatim for existing test suites.
   - Export `LEGACY_ROUTE_REDIRECTS` and route normalization helper `normalizeRouteForRbac`.
2. Create `src/components/routing/LegacyRedirect.tsx`:
   - Capture `useParams()`, `useLocation().search`, and `location.hash` and redirect to destination.
3. Update `src/App.tsx`:
   - Restructure route tree into `/billing/*` routes, `/crm/*` routes, and 36 legacy redirect routes.
   - Strictly satisfy AST and regex constraints in `src/test/crmShellRoutes.test.ts` and `src/test/crmAttendanceRouteWiringChallenge.test.tsx`:
     - Exact `function ProtectedRoutes()` and `function RoleProtectedRoute()`
     - Exact `if (!user) { return <Navigate to={ROUTE_PATHS.auth} replace />; }` in both
     - Verbatim `<Route path={ROUTE_PATHS.crm} element={<CRMDashboard />} />`
     - Keep correct ordering: ProtectedRoutes < Attendance Route < RoleProtectedRoute
4. Verification:
   - Run `cmd /c npx tsc --noEmit`
   - Run Vitest: `cmd /c npx vitest run src/test/crmShellRoutes.test.ts src/test/crmAttendanceRouteWiringChallenge.test.tsx`
   - Confirm all pass with exit code 0.

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Handoff Requirements
Write your detailed report to `handoff.md` in your working directory with all commands run, build/test results, and changed files. Report completion back to parent via `send_message`.

## 2026-10-23T22:29:42Z
[Message from parent (8ac6491a-275d-4c1c-b664-961cd66511b1)]:
You are worker_m1_decouple.
Your working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1_decouple
Project root: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart

Read your dispatch file: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1_decouple\DISPATCH.md
Read the authoritative user request: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (see timestamp 2026-10-23T21:58:59Z)
Read PROJECT.md: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md
Read the 3 Explorer handoff reports:
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_decouple_1\handoff.md and c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_decouple_1\proposed_routes.ts
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_decouple_2\handoff.md
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_decouple_3\handoff.md

Your exclusive write ownership:
1. `src/config/routes.ts`
2. `src/components/routing/LegacyRedirect.tsx` (create this file)
3. `src/App.tsx`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Execute the implementation per your DISPATCH.md instructions.
Run verification commands:
- `cmd /c npx tsc --noEmit`
- `cmd /c npx vitest run src/test/crmShellRoutes.test.ts src/test/crmAttendanceRouteWiringChallenge.test.tsx`
Ensure code 0.

Write your handoff report to `handoff.md` and report back to parent via send_message.
