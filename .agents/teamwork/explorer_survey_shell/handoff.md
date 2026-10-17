# Handoff Report: Survey Shell & Navigation Architecture for CRM Tab

## 1. Observation

### 1.1 Navigation Schema & Routing Table
- **Canonical Routing File**: Found at `src/config/routes.ts`. The referenced path `src/components/routes.ts` does not currently exist.
- **Route Constants (`ROUTE_PATHS`)**: Defined at `src/config/routes.ts:28-97` as a `const` object with keys including `dashboard`, `checkout`, `sales`, `purchases`, `staff`, `settings`, etc.
- **Navigation Interfaces**: Defined at `src/config/routes.ts:280-298`:
  ```typescript
  export interface NavRouteChild {
    title: string;
    url: AppRoutePath | string;
  }

  export interface NavRouteItem {
    title: string;
    url: AppRoutePath;
    icon: LucideIcon;
    mobilePrimary?: boolean;
    shortcut?: string;
    badge?: string;
    children?: NavRouteChild[];
  }

  export interface NavRouteGroup {
    label: string;
    items: NavRouteItem[];
  }
  ```
- **Navigation Groups (`MAIN_NAV_ROUTES`)**: Defined at `src/config/routes.ts:300-475`. Contains 4 groups:
  1. `"GENERAL"` (`dashboard`, `checkout`, `parties`, `items`, `sales`, `purchases`, `reports`)
  2. `"ACCOUNTING SOLUTIONS"` (`cashBank`, `eInvoicing`, `ewayBill`, `automatedBills`, `expenses`)
  3. `"BUSINESS TOOLS"` (`storefront`, `staff`, `pos`, `activityLog`)
  4. `"SETTINGS & APP PREFERENCES"` (`businessSettings`, `invoiceSettings`, `tallyImport`)
- **Existing Sub-Navigation Precedents**:
  Items such as `Parties` (lines 325-330), `Catalog` (lines 338-345), `Sales Hub` (lines 353-370), `Purchase Hub` (lines 377-381), and `Reports & Insights` (lines 388-391) already use `children?: NavRouteChild[]` with collapsible accordion rendering.
- **Role Permission Filter**: `isRouteAllowedForRole` (`src/config/routes.ts:178-278`) checks `FEATURE_ROUTE_MAP` (`lines 156-176`). Full-access roles (`super_admin`, `admin`, `store_owner`, `partner`, `owner`, `manager`) automatically return `true` (`lines 196-205`).

### 1.2 AppSidebar Component (`src/components/AppSidebar.tsx`)
- **Dual Architecture**:
  1. **Mobile Bottom Navigation Dock** (`lines 198-308`):
     Rendered when `isMobile` is true (`window.innerWidth < 768px`). Displays 5 fixed high-frequency touch actions:
     - Home (`/dashboard`)
     - Sales (`/sales`)
     - Elevated 3D POS Billing button (`/checkout`)
     - Items (`/items`)
     - Purchases (`/purchases`)
  2. **Top Mega Menu Popover / Dropdown Navigator** (`lines 310-579`):
     Rendered when `isOpen` is true (both desktop and mobile). Anchored at `fixed top-[3.75rem] sm:top-[5.5rem] md:top-[6rem] left-2.5 right-2.5 sm:left-4 sm:right-4 max-w-7xl mx-auto z-[200]`.
     Features:
     - Header strip with title, subtitle, search input, and close button (`lines 343-394`).
     - Mobile search input (`lines 397-408`).
     - 4-column responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`, line 421).
     - Submenu toggle button with `ChevronDown` icon (`lines 488-513`).
     - Collapsible accordion container with amber highlight border (`lines 527-555`):
       `<div className="ml-6 pl-3 py-1 border-l-2 border-amber-200 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">`
     - Auto-expansion effect (`lines 86-107`): Automatically expands any section whose parent `url` or child `url` matches the active route.
     - Search filter (`lines 164-172`): Matches both item title and child titles.

### 1.3 AppLayout Component (`src/components/AppLayout.tsx`)
- **Header Toggle**: At lines 379-398, the `ChevronDown` button directly toggles `sidebarOpen` (`setSidebarOpen((v) => !v)`).
- **Page Meta Resolution**: `getPageMeta(pathname)` at lines 79-217 provides page titles and subtitles. Unmatched routes fall back to "CredSmart POS" / "Enterprise Retail Management System".
- **Global Command Palette (`⌘K`)**: Lines 658-677 iterate over `NAV_ROUTES` to dynamically populate searchable commands.
- **3D Main Viewport Wrapper**: Lines 728-766 apply a 3D perspective shift on desktop when `sidebarOpen && !isMobile` (`transform: translateY(3rem) scale(0.96) rotateX(3deg)`).

### 1.4 Route Protection & Redirection (`src/App.tsx`)
- **Protected Shell**: Lines 223-267 wrap all internal routes in `<Route element={<ProtectedRoutes />}>` and `<Route element={<AppLayout />}>`.
- **Existing `ProtectedRoutes` Implementation**: Lines 99-111:
  ```typescript
  function ProtectedRoutes() {
    const { user, loading } = useAuth();

    if (loading) {
      return <SleekRouteLoader />;
    }

    if (!user) {
      return <Navigate to={ROUTE_PATHS.landing} replace />;
    }

    return <Outlet />;
  }
  ```
  *Current behavior*: An unauthenticated user visiting protected routes is redirected to `ROUTE_PATHS.landing` (`/`).
  *Requirement Acceptance Criteria*: "CRM route is guarded: unauthenticated users are redirected to /auth".
- **Existing `RoleProtectedRoute` Implementation**: Lines 113-133:
  ```typescript
  function RoleProtectedRoute({ allowedRoles }: { allowedRoles: readonly string[] | string[] }) {
    const { user, loading: authLoading } = useAuth();
    const { userRole, userPermissions, loading: orgLoading } = useOrganization();

    if (authLoading || orgLoading) {
      return <SleekRouteLoader />;
    }

    if (!user) {
      return <Navigate to={ROUTE_PATHS.landing} replace />;
    }

    const effectiveRole = userRole || "store_owner";
    const currentPath = window.location.pathname;

    if (!allowedRoles.includes(effectiveRole) && !isRouteAllowedForRole(currentPath, effectiveRole, userPermissions)) {
      return <Navigate to={ROUTE_PATHS.checkout} replace />;
    }

    return <Outlet />;
  }
  ```

### 1.5 Auth Lifecyle & Providers (`src/hooks/useAuth.tsx` & `src/hooks/useOrganization.tsx`)
- `useAuth`: Listens to `supabase.auth.getSession()` and `supabase.auth.onAuthStateChange`. Employs a 1500ms safety timeout to prevent infinite loading screens.
- `useOrganization`: Loads user role and permissions from `organization_members`.

### 1.6 TypeScript Status
- Executed `.\node_modules\.bin\tsc.cmd --noEmit` synchronously: Exited with code 0 (zero compiler errors).

---

## 2. Logic Chain

1. **Routing Single Source of Truth**:
   - `src/config/routes.ts` is imported by 40+ components across the codebase.
   - The original specification mentions `src/components/routes.ts`.
   - Creating `src/components/routes.ts` as `export * from "@/config/routes";` fulfills the specification without breaking any existing imports or creating duplicate definitions.

2. **CRM Route Definition & Permissions Schema**:
   - To support the CRM module, `ROUTE_PATHS` must define:
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
   - `FeatureKey` must include `"crm"`.
   - `FEATURE_ROUTE_MAP.crm` must map these routes so `isRouteAllowedForRole` recognizes custom permission toggles.
   - For all owner/super-admin/manager roles, line 196 of `routes.ts` automatically permits all `/crm` routes.

3. **Sidebar Sub-Navigation Rendering without Breaking Desktop or Mobile**:
   - In `MAIN_NAV_ROUTES`, adding a `"CRM"` item under `BUSINESS TOOLS` (or as its own highlighted item):
     ```typescript
     {
       title: "CRM",
       url: ROUTE_PATHS.crm,
       icon: Briefcase,
       badge: "NEW",
       children: [
         { title: "Dashboard", url: ROUTE_PATHS.crm },
         { title: "Attendance", url: ROUTE_PATHS.crmAttendance },
         { title: "Salary", url: ROUTE_PATHS.crmSalary },
         { title: "Tasks", url: ROUTE_PATHS.crmTasks },
         { title: "Meet", url: ROUTE_PATHS.crmMeet },
         { title: "Broadcasts", url: ROUTE_PATHS.crmBroadcasts },
         { title: "AI Assistant", url: ROUTE_PATHS.crmAiAssistant },
         { title: "Support", url: ROUTE_PATHS.crmSupport },
         { title: "Role Management", url: ROUTE_PATHS.crmRoles },
       ],
     }
     ```
   - **Desktop Layout**: Preserves the 4-column mega menu grid (`xl:grid-cols-4`). Clicking "CRM" navigates to `/crm`; clicking the chevron expands all 8 placeholder sub-routes plus Role Management.
   - **Mobile Layout**: Preserves the 5-button bottom dock (Home, Sales, POS Billing, Items, Purchases). CRM neatly collapses into the top navigation menu triggered by the header dropdown toggle. This directly meets the requirement: *"Mobile: CRM tab collapses correctly into the mobile hamburger menu without breaking existing nav"*.
   - **Automatic Highlighting & Auto-Expansion**: Because `isRouteActive` checks `location.pathname === url || location.pathname.startsWith(`${url}/`)`, visiting `/crm` or any `/crm/*` route automatically highlights the CRM item and opens its collapsible accordion when opening the menu.
   - **Command Palette (`⌘K`)**: Because `CommandDialog` in `AppLayout.tsx` maps `NAV_ROUTES`, the CRM module and its sub-actions immediately become searchable via keyboard shortcut.

4. **Authentication Guard Mechanism**:
   - Currently, `ProtectedRoutes` redirects `!user` to `ROUTE_PATHS.landing` (`/`).
   - The Acceptance Criteria mandates: *"CRM route is guarded: unauthenticated users are redirected to /auth"*.
   - Updating `ProtectedRoutes` and `RoleProtectedRoute` in `src/App.tsx` from `Navigate to={ROUTE_PATHS.landing}` to `Navigate to={ROUTE_PATHS.auth}` guarantees that any unauthenticated attempt to access `/crm` (or other protected business routes) will redirect straight to `/auth`.
   - The public landing page (`/`) remains publicly accessible via `<Route path={ROUTE_PATHS.landing} element={<HomeRoute />} />`.

5. **AppLayout Header Metadata**:
   - In `src/components/AppLayout.tsx`, `getPageMeta(pathname)` must be extended:
     ```typescript
     if (pathname === ROUTE_PATHS.crm || pathname === "/crm") {
       return {
         title: "CRM Command Center",
         subtitle: "Unified customer relations, team attendance, tasks, and communications",
       };
     }
     if (pathname === ROUTE_PATHS.crmRoles || pathname === "/crm/roles") {
       return {
         title: "CRM Role & Permission Manager",
         subtitle: "Configure custom roles, granular module permissions, and staff assignments",
       };
     }
     ```
   - This ensures the desktop header displays the proper title, subtitle, and live sync indicator on CRM pages.

---

## 3. Caveats

- **Existing Failing Test**: The test file `src/test/tallyE2E.test.ts` has 52 pre-existing failures related to Tally XML parsing and synchronization mocks. All other 19 Vitest test suites (395 tests) pass cleanly. This test file is unrelated to navigation, layout, or CRM routing.
- **`src/components/routes.ts` vs `src/config/routes.ts`**: Currently only `src/config/routes.ts` exists. Creating `src/components/routes.ts` as a re-export ensures full backwards and forwards compatibility without ambiguity.
- **Future Placeholder Sub-Routes**: The 8 placeholder items (Attendance, Salary, Tasks, Meet, Broadcasts, AI Assistant, Support) belong to subsequent development phases (Phases 2–6). In `src/App.tsx`, these sub-routes should map to `<CRMDashboard />` (or a tabbed view within `CRMDashboard`) so clicking any sub-route in the navigation does not trigger a 404 page.

---

## 4. Conclusion

The application's shell and navigation architecture is fully primed for seamless integration of the CRM Tab.

### Actionable Implementation Specification

1. **`src/components/routes.ts`**:
   - Create file with `export * from "@/config/routes";`.

2. **`src/config/routes.ts`**:
   - Add CRM paths to `ROUTE_PATHS`.
   - Add `"crm"` to `FeatureKey`.
   - Add `crm` array to `FEATURE_ROUTE_MAP`.
   - Add the `"CRM"` `NavRouteItem` to `MAIN_NAV_ROUTES` inside `BUSINESS TOOLS` (with Lucide icon `Briefcase` or `UserCheck`, badge `"NEW"`, and 9 children: Dashboard, Attendance, Salary, Tasks, Meet, Broadcasts, AI Assistant, Support, Role Management).

3. **`src/App.tsx`**:
   - Import `CRMDashboard` from `@/pages/crm/CRMDashboard`.
   - Import `RoleManagement` from `@/pages/crm/RoleManagement`.
   - Update `ProtectedRoutes` line 107 to redirect unauthenticated users to `ROUTE_PATHS.auth`:
     `if (!user) return <Navigate to={ROUTE_PATHS.auth} replace />;`
   - Update `RoleProtectedRoute` line 122 to redirect unauthenticated users to `ROUTE_PATHS.auth`:
     `if (!user) return <Navigate to={ROUTE_PATHS.auth} replace />;`
   - Register routes under `<Route element={<AppLayout />}>`:
     - `<Route path={ROUTE_PATHS.crm} element={<CRMDashboard />} />`
     - `<Route path={ROUTE_PATHS.crmRoles} element={<RoleManagement />} />`
     - Map placeholder sub-routes (`/crm/attendance`, `/crm/salary`, `/crm/tasks`, `/crm/meet`, `/crm/broadcasts`, `/crm/ai-assistant`, `/crm/support`) to `<CRMDashboard />`.

4. **`src/components/AppLayout.tsx`**:
   - Add CRM route metadata cases to `getPageMeta(pathname)`.

5. **`src/components/AppSidebar.tsx`**:
   - No structural changes required — the component already dynamically renders `NAV_ROUTES` groups and collapsible child accordions, handles search queries, and maintains the 5-item mobile dock without overflow.

---

## 5. Verification Method

To independently verify these conclusions and any subsequent implementation:

1. **TypeScript Typecheck**:
   ```powershell
   .\node_modules\.bin\tsc.cmd --noEmit
   ```
   *Expected result*: Exits with code 0.

2. **Vitest Test Suite Run**:
   ```powershell
   cmd /c "npm test -- --run"
   ```
   *Expected result*: Confirms all non-Tally test suites pass with 100% success rate.

3. **Route Guard & Navigation Invariants**:
   - Inspect `src/App.tsx`: Confirm `ProtectedRoutes` redirects `!user` to `ROUTE_PATHS.auth`.
   - Verify unauthenticated navigation to `http://localhost:5173/crm` redirects to `http://localhost:5173/auth`.
   - Verify authenticated navigation to `http://localhost:5173/crm` renders `CRMDashboard.tsx`.
   - Verify `AppSidebar.tsx` renders "CRM" with 8+ sub-items in the mega menu dropdown.
   - Verify mobile viewport (`< 768px`) preserves the 5-item bottom dock and collapses the CRM menu into the top header drawer.
