# Dispatch: Explorer M1.2 — App.tsx Route Tree & Universal Legacy Redirection

## Mission
Investigate and design the exact code edits for `src/App.tsx` to implement Milestone 1: Route Architecture & Isolation, including the 35-path legacy redirect engine with parameter and search preservation.

## Authoritative Requirements & Sources
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (timestamp 2026-10-23T21:58:59Z)
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md` (Milestone 1 Scope)
- Prior Survey Report: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_routes\handoff.md`

## Your Working Directory
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_decouple_2`

## Specific Investigation Tasks
1. Inspect `src/App.tsx`: analyze how `<Routes>` are declared inside `App()`, `ProtectedRoutes()`, and `RoleProtectedRoute()`.
2. Strictly check AST/regex constraints in `src/test/crmShellRoutes.test.ts`:
   - Exact function signature `function ProtectedRoutes()`
   - Exact function signature `function RoleProtectedRoute()`
   - Exact check: `if (!user) { return <Navigate to={ROUTE_PATHS.auth} replace />; }`
   - Exact `<Route path={ROUTE_PATHS.crm} element={<CRMDashboard />} />`
3. Design the universal `<LegacyRedirect to={targetPath} />` component that captures `useParams()`, `useLocation().search`, and reconstructs destination URLs cleanly.
4. Define the complete table of `<Route path="/legacy" element={<LegacyRedirect to="/billing/..." />} />` for all 35 legacy routes.
5. Provide line-by-line recommendation for Worker M1.

## Handoff Requirements
Write comprehensive analysis and fix strategy to `handoff.md` in your working directory. Report completion back to parent via `send_message`.


## 2026-10-23T22:19:57Z
You are explorer_m1_decouple_2.
Your working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_decouple_2
Project root: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart

Read your dispatch file: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_decouple_2\DISPATCH.md
Read the authoritative user request: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (see timestamp 2026-10-23T21:58:59Z)
Read PROJECT.md: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md

Your mission:
Investigate and design the exact code edits for `src/App.tsx` to implement Milestone 1: Route Architecture & Isolation, including the 35-path legacy redirect engine with parameter and search preservation.
1. Inspect `src/App.tsx`: analyze route declarations inside `App()`, `ProtectedRoutes()`, and `RoleProtectedRoute()`.
2. Strictly check AST/regex constraints in `src/test/crmShellRoutes.test.ts`:
   - Exact function signature `function ProtectedRoutes()`
   - Exact function signature `function RoleProtectedRoute()`
   - Exact check: `if (!user) { return <Navigate to={ROUTE_PATHS.auth} replace />; }`
   - Exact `<Route path={ROUTE_PATHS.crm} element={<CRMDashboard />} />`
3. Design the universal `<LegacyRedirect to={targetPath} />` component that captures `useParams()`, `useLocation().search`, and reconstructs destination URLs cleanly.
4. Define the complete table of `<Route path="/legacy" element={<LegacyRedirect to="/billing/..." />} />` for all 35 legacy routes.
5. Provide concrete, line-by-line recommendations for Worker M1.

Write your findings to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_decouple_2\handoff.md`.
Communicate your completion back to parent via send_message.
