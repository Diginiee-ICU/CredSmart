# BRIEFING — 2026-10-23T22:30:00Z

## Mission
Investigate and design exact code edits for `src/App.tsx` for Milestone 1 (Route Architecture & Isolation, 35-path legacy redirect engine with parameter/search preservation), strictly preserving AST/regex constraints in `src/test/crmShellRoutes.test.ts`.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, architect, synthesizer
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_decouple_2
- Original parent: 8ac6491a-275d-4c1c-b664-961cd66511b1
- Milestone: Milestone 1 - Route Architecture & Isolation

## 🔒 Key Constraints
- Read-only investigation — do NOT implement or modify source code
- Strictly preserve AST/regex constraints tested in `src/test/crmShellRoutes.test.ts`
- Preserve all existing routes and legacy paths via clean redirects
- Preserve query parameters and dynamic route parameters across redirects

## Current Parent
- Conversation ID: 8ac6491a-275d-4c1c-b664-961cd66511b1
- Updated: 2026-10-23T22:30:00Z

## Investigation State
- **Explored paths**: `src/App.tsx`, `src/config/routes.ts`, `src/components/AppLayout.tsx`, `src/test/crmShellRoutes.test.ts`, `src/test/crmAttendanceRouteWiringChallenge.test.tsx`, `src/test/example.test.ts`, `PROJECT.md`, `ORIGINAL_REQUEST.md`, `explorer_survey_routes/handoff.md`.
- **Key findings**:
  1. `src/test/crmShellRoutes.test.ts:303-320` requires exact function signatures `function ProtectedRoutes()` and `function RoleProtectedRoute()`, exact redirect pattern `if (!user) { return <Navigate to={ROUTE_PATHS.auth} replace />; }` in both, and exact string matches `<Route path={ROUTE_PATHS.crm} element={<CRMDashboard />} />`, `<Route path={ROUTE_PATHS.crmRoles} element={<RoleManagement />} />`, `<Route path={ROUTE_PATHS.crmAttendance} element={<Attendance />} />`.
  2. `src/test/crmAttendanceRouteWiringChallenge.test.tsx:180-192` requires `<Route path={ROUTE_PATHS.crmAttendance} element={<Attendance />} />` to be located AFTER `<Route element={<ProtectedRoutes />}>` AND BEFORE `<Route element={<RoleProtectedRoute allowedRoles={MANAGER_ROLES} />}>` (`protectedIndex < crmAttendanceIndex < managerIndex`).
  3. Legacy redirects require dynamic parameter handling (e.g. `/customers/:id/ledger` -> `/billing/customers/:id/ledger`) and search string preservation (`location.search` & `location.hash`).
  4. Complete table of 36 legacy routes defined, mapping cleanly to `/billing/*` and marketing/faq targets.
  5. Universal `<LegacyRedirect />` component fully architected.
- **Unexplored areas**: None for M1 App.tsx scope.

## Key Decisions Made
- Designed `<LegacyRedirect />` component capturing `useParams()`, `useLocation().search`, and `useLocation().hash`, replacing dynamic tokens with `encodeURIComponent(value)`.
- Positioned CRM routes before Manager RoleProtected routes within `<ProtectedRoutes />` to preserve the AST order invariant checked by `crmAttendanceRouteWiringChallenge.test.tsx`.
- Recommended placing all 36 legacy redirect routes inside `<Route element={<ProtectedRoutes />}>` to maintain protected access parity.
- Structured line-by-line recommendations for Worker M1.

## Artifact Index
- `.agents/teamwork/explorer_m1_decouple_2/DISPATCH.md` — Initial dispatch instructions
- `.agents/teamwork/explorer_m1_decouple_2/BRIEFING.md` — Situational awareness and identity
- `.agents/teamwork/explorer_m1_decouple_2/progress.md` — Activity log
- `.agents/teamwork/explorer_m1_decouple_2/handoff.md` — 5-component handoff report for Worker M1
