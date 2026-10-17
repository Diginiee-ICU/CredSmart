# BRIEFING — 2026-10-17T00:36:00Z

## Mission
Investigate CredSmart's AppSidebar, AppLayout, App.tsx, routing table, auth guard mechanisms, and mobile hamburger navigation to design the CRM tab & sub-navigation architecture without breaking existing navigation.

## 🔒 My Identity
- Archetype: teamwork_preview_explorer
- Roles: Codebase Researcher - Shell & Navigation
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_shell
- Original parent: f65e7324-0a80-4f4b-bb4c-bc82b84e3cdd
- Milestone: CRM Tab Phase 1 - Survey Shell & Navigation

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Thoroughly inspect existing desktop and mobile navigation schemas
- Verify auth guard mechanism for protected routes
- Document exact file modifications needed for AppSidebar, AppLayout, App.tsx, routes.ts
- Ensure 100% preservation of desktop & mobile UI without regressions

## Current Parent
- Conversation ID: f65e7324-0a80-4f4b-bb4c-bc82b84e3cdd
- Updated: 2026-10-17T00:36:00Z

## Investigation State
- **Explored paths**:
  - `src/config/routes.ts` (routing definitions, `ROUTE_PATHS`, `MAIN_NAV_ROUTES`, `isRouteAllowedForRole`, `FEATURE_ROUTE_MAP`)
  - `src/App.tsx` (`ProtectedRoutes`, `RoleProtectedRoute`, `HomeRoute`, `AuthRoute`, route structure)
  - `src/components/AppSidebar.tsx` (3D Mega Menu Popover, mobile bottom dock, accordion sub-menus, search filtering, auto-expansion)
  - `src/components/AppLayout.tsx` (header bar, logo, menu toggle ChevronDown, `getPageMeta`, CommandDialog, 3D viewport wrapper)
  - `src/hooks/useAuth.tsx` & `src/hooks/useOrganization.tsx` (auth lifecycle, session recovery, role resolution)
  - `src/hooks/use-mobile.tsx` (mobile breakpoint `< 768px`)
  - `src/pages/Staff.tsx` (existing staff and permission models)
- **Key findings**:
  - `src/config/routes.ts` is the single source of truth; `src/components/routes.ts` does not exist yet and should re-export `src/config/routes.ts`.
  - `AppSidebar.tsx` already has native support for collapsible sub-menus via `children?: NavRouteChild[]`.
  - On mobile, `AppSidebar.tsx` provides a fixed 5-action bottom dock (Home, Sales, POS, Items, Purchases). Adding CRM as a collapsible item inside the top navigation drawer preserves the mobile bottom dock without overflow.
  - `ProtectedRoutes` currently redirects unauthenticated users to `ROUTE_PATHS.landing` ("/"); changing this to `ROUTE_PATHS.auth` ensures unauthenticated visits to `/crm` immediately redirect to `/auth`.
  - `tsc --noEmit` runs with 0 errors across the entire codebase.
- **Unexplored areas**: None for shell & navigation; investigation complete.

## Key Decisions Made
- CRM route should be mapped under `<Route element={<ProtectedRoutes />}>` and `<Route element={<AppLayout />}>` in `src/App.tsx`.
- Create `src/components/routes.ts` forwarding `src/config/routes.ts` to satisfy all import conventions.
- Position the CRM item in `BUSINESS TOOLS` (or as a primary group) in `MAIN_NAV_ROUTES` with 8 placeholder children + 1 Role Management child.
- Update `ProtectedRoutes` to redirect `!user` to `ROUTE_PATHS.auth`.

## Artifact Index
- DISPATCH.md — Task instructions and requirements
- progress.md — Liveness heartbeat and step tracking
- handoff.md — Comprehensive 5-component handoff report for orchestrator
