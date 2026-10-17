# Dispatch: Worker M1 — CRM Shell & Navigation

## Identity
- **Agent Type**: `teamwork_preview_worker`
- **Role**: Software Engineer - CRM Shell & Navigation
- **Working Directory**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1_shell`
- **Orchestrator Conversation ID**: `f65e7324-0a80-4f4b-bb4c-bc82b84e3cdd`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Input Context & Survey Reports
1. Read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md`
2. Read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase1\PROJECT.md`
3. Read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_shell\handoff.md`

## File Write Ownership
You have exclusive write ownership over:
- `src/components/routes.ts`
- `src/config/routes.ts`
- `src/components/AppSidebar.tsx`
- `src/components/AppLayout.tsx`
- `src/App.tsx`
- `src/pages/crm/CRMDashboard.tsx`
- `src/pages/crm/RoleManagement.tsx`

Do NOT touch any other source files.

## Detailed Requirements for Milestone 1 (R1)
1. **`src/components/routes.ts`**:
   - Create this file with `export * from "@/config/routes";` (and export any necessary route types) so imports from `@/components/routes` or `@/config/routes` work seamlessly.

2. **`src/config/routes.ts`**:
   - Add CRM paths to `ROUTE_PATHS`:
     - `crm: "/crm"`
     - `crmDashboard: "/crm"`
     - `crmAttendance: "/crm/attendance"`
     - `crmSalary: "/crm/salary"`
     - `crmTasks: "/crm/tasks"`
     - `crmMeet: "/crm/meet"`
     - `crmBroadcasts: "/crm/broadcasts"`
     - `crmAiAssistant: "/crm/ai-assistant"`
     - `crmSupport: "/crm/support"`
     - `crmRoles: "/crm/roles"`
   - Add `"crm"` to `FeatureKey` type union.
   - Add `"crm"` key to `FEATURE_ROUTE_MAP` mapping all CRM paths.
   - In `MAIN_NAV_ROUTES`, add a "CRM" nav item in the "BUSINESS TOOLS" group (or appropriate navigation group) with:
     - `title: "CRM"`
     - `url: ROUTE_PATHS.crm`
     - `icon: Briefcase` (from `lucide-react`)
     - `badge: "NEW"`
     - `children`: 8 future feature placeholders + Role Management:
       1. `{ title: "Dashboard", url: ROUTE_PATHS.crm }`
       2. `{ title: "Attendance", url: ROUTE_PATHS.crmAttendance }`
       3. `{ title: "Salary", url: ROUTE_PATHS.crmSalary }`
       4. `{ title: "Tasks", url: ROUTE_PATHS.crmTasks }`
       5. `{ title: "Meet", url: ROUTE_PATHS.crmMeet }`
       6. `{ title: "Broadcasts", url: ROUTE_PATHS.crmBroadcasts }`
       7. `{ title: "AI Assistant", url: ROUTE_PATHS.crmAiAssistant }`
       8. `{ title: "Support", url: ROUTE_PATHS.crmSupport }`
       9. `{ title: "Role Management", url: ROUTE_PATHS.crmRoles }`

3. **`src/App.tsx`**:
   - Ensure unauthenticated users accessing protected routes (including `/crm`) are redirected to `ROUTE_PATHS.auth` (`/auth`):
     - In `ProtectedRoutes`, `if (!user) return <Navigate to={ROUTE_PATHS.auth} replace />;`
     - In `RoleProtectedRoute`, `if (!user) return <Navigate to={ROUTE_PATHS.auth} replace />;`
   - Register the CRM routes within the protected layout (`<Route element={<AppLayout />}>`):
     - `<Route path={ROUTE_PATHS.crm} element={<CRMDashboard />} />`
     - `<Route path={ROUTE_PATHS.crmRoles} element={<RoleManagement />} />`
     - Register placeholder sub-routes (`/crm/attendance`, `/crm/salary`, `/crm/tasks`, `/crm/meet`, `/crm/broadcasts`, `/crm/ai-assistant`, `/crm/support`) pointing to `<CRMDashboard />` (or rendering a clean CRM section placeholder) so clicking any sub-navigation item renders without 404.

4. **`src/components/AppLayout.tsx`**:
   - In `getPageMeta(pathname)`:
     - When `pathname === ROUTE_PATHS.crm` or starts with `/crm`, return title `"CRM Command Center"` and subtitle `"Unified customer relations, team attendance, tasks, and communications"`.
     - When `pathname === ROUTE_PATHS.crmRoles` or `/crm/roles`, return title `"CRM Role & Permission Manager"` and subtitle `"Configure custom roles, granular module permissions, and staff assignments"`.

5. **`src/pages/crm/CRMDashboard.tsx`**:
   - Implement the CRM landing page with a responsive summary card grid:
     - Staff Count (querying `organization_memberships` or staff table)
     - Today's Attendance (querying `crm_attendance` with graceful fallback to 0 if table not yet created)
     - Pending Tasks (querying `crm_tasks` with graceful fallback to 0)
     - Unread Broadcasts (querying `crm_broadcasts` with graceful fallback to 0)
     - Upcoming Meetings (querying `crm_meetings` with graceful fallback to 0)
   - Include quick navigation links to the CRM sub-sections (Attendance, Salary, Tasks, Meet, Broadcasts, AI Assistant, Support, Role Management).
   - Use CredSmart brand colors (#0F172A, #FF6A00, #1D4ED8, #10B981) and responsive design (375px mobile, 768px tablet, 1280px desktop).

6. **`src/pages/crm/RoleManagement.tsx`**:
   - Create initial functional stub/shell component so `/crm/roles` route loads cleanly with header and placeholder layout.

7. **Verification**:
   - Run `tsc --noEmit` to verify 0 compiler errors.
   - Run tests `npm test -- --run` to ensure existing tests pass with 0 regressions.
   - Verify mobile bottom dock is preserved without breakage and top drawer collapses nicely.

Document all modified files, commands executed, and verification outputs in `handoff.md` in your working directory and notify orchestrator.


## 2026-10-17T06:13:55Z
Received dispatch from orchestrator (f65e7324-0a80-4f4b-bb4c-bc82b84e3cdd):
Execute Milestone 1:
1. Create src/components/routes.ts (re-export from src/config/routes.ts)
2. Update src/config/routes.ts (add CRM routes, FeatureKey, FEATURE_ROUTE_MAP, and "CRM" in MAIN_NAV_ROUTES with 8 placeholder sub-items + Role Management)
3. Update src/App.tsx (route /crm and placeholder sub-routes to CRMDashboard, /crm/roles to RoleManagement, update ProtectedRoutes and RoleProtectedRoute to redirect unauthenticated users to ROUTE_PATHS.auth)
4. Update src/components/AppLayout.tsx (header metadata for /crm and /crm/roles)
5. Create src/pages/crm/CRMDashboard.tsx with live stat cards (staff count, today attendance, pending tasks, unread broadcasts, upcoming meetings with graceful error handling), brand colors, responsive design (375px, 768px, 1280px)
6. Create src/pages/crm/RoleManagement.tsx initial shell
7. Run `tsc --noEmit` and run `npm test -- --run` to verify zero compiler errors and test integrity.
