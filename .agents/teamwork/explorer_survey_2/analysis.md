# CredSmart CRM Phase 2: UI Infrastructure Survey & Attendance.tsx Construction Blueprint

**Survey Explorer**: `survey_explorer_2`  
**Working Directory**: `.agents/teamwork/explorer_survey_2/`  
**Timestamp**: 2026-10-17T09:10:00Z  
**Target Milestone**: CRM Phase 2 — Attendance & Geo Location Attendance  
**Reference Documents**: 
- `ORIGINAL_REQUEST.md` (Section `## 2026-10-17T08:52:11Z`)
- `orchestrator_crm_phase2/DISPATCH.md`
- `.agents/skills/crm-rbac-skill/SKILL.md`

---

## 1. Executive Summary

CredSmart CRM Phase 1 established an enterprise-grade UI design system in `src/components/crm/`, a robust, dynamic Role-Based Access Control (RBAC) engine in `src/hooks/useCRMPermission.ts`, and shell navigation linking CRM modules inside `src/config/routes.ts` and `src/App.tsx`.

In Phase 2, the primary frontend deliverable is `src/pages/crm/Attendance.tsx` — a high-precision, production-grade Attendance & Geolocation hub. This survey analyzes every layer of existing CRM infrastructure, details exact component APIs, reveals database query patterns, highlights route and test constraints, and provides a 100% conforming blueprint for building `Attendance.tsx`.

### Core Survey Takeaways:
1. **Design System**: All 7 core CRM components (`CRMCard`, `CRMBadge`, `CRMDataTable`, `CRMPageHeader`, `CRMStatCard`, `CRMPermissionGate`, `CRMRolePill`) are fully implemented, strictly typed, and exported from `src/components/crm/index.ts`.
2. **Permission Model**: The `"attendance"` module is registered in `RoleManagement.tsx` with two actions: `"view"` (view self and team daily records) and `"edit"` (adjust clock-in times, manage geofences, approve regularisation requests). `useCRMPermission("attendance", "view" | "edit")` and `<CRMPermissionGate>` provide seamless dual-layer enforcement with super-admin bypass.
3. **Dashboard Sync**: `CRMDashboard.tsx` already contains a placeholder stat card for Attendance querying `crm_attendance` with a type cast fallback (`(supabase as unknown as ...)`), ready to be upgraded to typed queries once `src/integrations/supabase/types.ts` is updated.
4. **Route Integration & Regression Alert**: `ROUTE_PATHS.crmAttendance` (`/crm/attendance`) is registered in `src/config/routes.ts` and currently points to `<CRMDashboard />` in `src/App.tsx`. Crucially, `src/test/crmShellRoutes.test.ts:320` statically asserts:
   ```typescript
   expect(appSource).toContain("<Route path={ROUTE_PATHS.crmAttendance} element={<CRMDashboard />} />");
   ```
   When `Attendance.tsx` is wired in `src/App.tsx`, this test assertion must be updated to expect `<Attendance />` to maintain 100% test pass rate.
5. **Staff Query Pattern**: `RoleManagement.tsx` models the standard way to retrieve staff names, store roles, and custom CRM roles by joining `organization_memberships` with `profiles` and `crm_staff_roles`.

---

## 2. Component-by-Component Survey of `src/components/crm/`

### 2.1 `CRMCard` (`src/components/crm/CRMCard.tsx`)
- **Purpose**: Enterprise container wrapper adhering to CredSmart brand tokens, subtle borders, and elevation styles.
- **Brand Colors**:
  ```typescript
  export const CRM_BRAND_COLORS = {
    navy: "#0F172A",     // Primary text and structural elements
    orange: "#FF6A00",   // CredSmart vibrant brand orange
    blue: "#1D4ED8",     // Royal Blue for primary actions & links
    emerald: "#10B981",  // Live status green & success
    gold: "#F59E0B",     // Amber highlight & warnings
    slateBg: "#F8FAFC",  // Soft slate background canvas
  } as const;
  ```
- **Variants**: `"default"` | `"elevated"` | `"brand"` | `"outline"` | `"glass"`.
  - `default`: Clean white card with subtle border (`border-slate-200/80`) and `shadow-2xs`.
  - `brand`: Left accent bar (`border-l-4 border-l-[#FF6A00]`), ideal for highlighting clock-in pods or alert states.
  - `elevated`: Hover lift interaction (`hover:shadow-lift`).
- **Slots**: `title`, `description`, `headerAction`, `footer`, `contentClassName`, `children`.
- **Application in Attendance**:
  - Main Clock-In Pod container using `variant="brand"`.
  - Daily Logs Table card using `variant="default"`.
  - Geofence radar card using `variant="elevated"`.

### 2.2 `CRMBadge` (`src/components/crm/CRMBadge.tsx`)
- **Purpose**: Status badge with semantic color variants and optional pulsing status indicator.
- **Variants**:
  - `success`: Emerald `#10B981` (`bg-emerald-50 text-emerald-700`) — used for "Present", "Within Geofence ✓", "Geo-Verified".
  - `warning`: Amber `#F59E0B` (`bg-amber-50 text-amber-700`) — used for "Pending Regularisation", "Late Arrival", "Half Day".
  - `error`: Rose `#EF4444` (`bg-rose-50 text-rose-700`) — used for "Absent", "Outside Geofence ⚠️", "Rejected".
  - `info`: Royal Blue `#1D4ED8` (`bg-blue-50 text-[#1D4ED8]`) — used for "On Leave", "Regularized", "Shift Info".
  - `neutral`: Slate `#0F172A` (`bg-slate-100 text-[#0F172A]`) — used for standard tags and counters.
  - `orange`: CredSmart Orange `#FF6A00` (`bg-orange-50 text-[#FF6A00]`) — used for active session timers and overtime highlights.
- **Props**: `size` (`"sm" | "md" | "lg"`), `dot` (boolean for animated pulse dot), `children`.
- **Application in Attendance**:
  - Live GPS status indicator (`<CRMBadge variant="success" dot>Within Geofence (18m)</CRMBadge>`).
  - Attendance punch status in data table (`Present`, `Late`, `Half Day`, `Absent`).
  - Verification method badge (`Geo-Verified`, `Manual`, `Regularized`).

### 2.3 `CRMDataTable` (`src/components/crm/CRMDataTable.tsx`)
- **Purpose**: Sortable, filterable, paginated data table powered by `usePagination` hook and shadcn/ui `Table`.
- **Key Interface**:
  ```typescript
  export interface CRMColumnDef<T> {
    key: string;
    header: React.ReactNode;
    accessor?: (row: T) => React.ReactNode;
    sortable?: boolean;
    className?: string;
    headerClassName?: string;
  }
  ```
- **Props**: `data: T[]`, `columns: CRMColumnDef<T>[]`, `searchPlaceholder`, `searchKey`, `searchFilter`, `pageSize` (default 10), `emptyMessage`, `isLoading`, `onRowClick`.
- **Capabilities**:
  - Client-side search across all fields or restricted via `searchKey` or custom `searchFilter`.
  - Column sorting with ascending/descending indicators (`ArrowUp`, `ArrowDown`, `ArrowUpDown`).
  - Integrated `PaginationBar` with page numbers, items range, and page size selector.
  - Built-in loading spinner and empty state messages.
- **Application in Attendance**:
  - Admin daily attendance logs table.
  - Regularisation approval requests table.
  - Office geofence locations directory.

### 2.4 `CRMPageHeader` (`src/components/crm/CRMPageHeader.tsx`)
- **Purpose**: Unified page heading with responsive stacking, breadcrumb trail, title badge, and desktop actions slot.
- **Props**: `title`, `subtitle`, `breadcrumbs: CRMBreadcrumbItem[]`, `badge`, `actions`, `className`.
- **Application in Attendance**:
  ```tsx
  <CRMPageHeader
    title="Attendance & Shift Hub"
    subtitle="GPS-verified clock-in, geofence radius tracking, shifts, and team oversight"
    breadcrumbs={[
      { label: "Home", href: "/" },
      { label: "CRM", href: ROUTE_PATHS.crm },
      { label: "Attendance", href: ROUTE_PATHS.crmAttendance },
    ]}
    badge={<CRMBadge variant="success" size="sm" dot>Phase 2 Live</CRMBadge>}
    actions={
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
          <Download className="w-4 h-4 mr-1.5" /> Export PDF
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownloadCsv}>
          <FileSpreadsheet className="w-4 h-4 mr-1.5" /> Export CSV
        </Button>
        {isManager && (
          <Button size="sm" className="bg-[#1D4ED8]" onClick={() => setGeofenceModalOpen(true)}>
            <MapPin className="w-4 h-4 mr-1.5" /> Geofences
          </Button>
        )}
      </div>
    }
  />
  ```

### 2.5 `CRMStatCard` (`src/components/crm/CRMStatCard.tsx`)
- **Purpose**: Metric card featuring tinted icon pods, large numeric tabular figures, metric labels, trend indicators, and optional descriptions.
- **Accents**: `"navy" | "orange" | "blue" | "emerald" | "gold"`.
- **Props**: `label`, `value`, `icon`, `accent`, `trend: { value, direction: "up"|"down"|"neutral", label }`, `description`, `loading`, `onClick`.
- **Application in Attendance (5 KPI cards)**:
  1. **Total Present Today**: `accent="emerald"`, `icon={CalendarCheck}`, `trend={{ direction: "up", value: "92%", label: "Turnout" }}`.
  2. **On-Time Rate**: `accent="blue"`, `icon={Clock}`, `trend={{ direction: "up", value: "+4%", label: "vs last week" }}`.
  3. **Geo-Fence Compliance**: `accent="orange"`, `icon={MapPin}`, `trend={{ direction: "neutral", value: "98%", label: "Geo-verified" }}`.
  4. **Avg Work Hours**: `accent="gold"`, `icon={Timer}`, `description="8.4 hrs / employee"`.
  5. **Pending Approvals**: `accent="navy"`, `icon={AlertTriangle}`, `description="Regularisation requests"`.

### 2.6 `CRMPermissionGate` (`src/components/crm/CRMPermissionGate.tsx`)
- **Purpose**: Conditional permission wrapper that evaluates user permissions via `useCRMPermission`. Renders children if allowed; otherwise renders `fallback` and safely fires a "Not Authorized" toast notification once via `useRef`.
- **Props**: `module`, `action`, `children`, `fallback`, `showToast`, `suppressToast`, `toastMessage`.
- **Application in Attendance**:
  - Gating admin controls (Geofence modal trigger, Regularisation approval buttons, Manual punch overrides).
  - Gating team oversight view tabs (`attendance.edit` or `isSuperAdmin`).

### 2.7 `CRMRolePill` (`src/components/crm/CRMRolePill.tsx`)
- **Purpose**: Dynamic role pill with user-configured custom hex colors (automatically computes 15% opacity background and 35% opacity border tints via `toHexAlpha`).
- **Super Admin Support**: Automatically replaces the standard icon with a gold super-admin crown (`Crown` icon in amber-500).
- **Props**: `name`, `color`, `icon`, `isSuperAdmin`, `size: "sm" | "md" | "lg"`.
- **Application in Attendance**:
  - Displayed alongside staff names in the attendance log table.
  - Used in staff filter dropdowns and regularisation request cards.

---

## 3. Hook Architecture: `useCRMPermission.ts` & `usePermission`

The authoritative hook is located in `src/hooks/useCRMPermission.ts` (aliased as `usePermission`).

### 3.1 Hook Return Contract
```typescript
export interface UseCRMPermissionResult {
  hasPermission: (module: string, action: string) => boolean;
  isSuperAdmin: boolean;
  userRoles: CRMRole[];
  permissions: CRMPermission[];
  loading: boolean;
  error: Error | null;
  refreshPermissions: () => Promise<void>;
  refetch: () => Promise<void>;
  allowed: boolean;
}
```

### 3.2 Evaluation Logic & Super-Admin Bypass
1. **Store Owner / ERP Admin Bypass**:
   If `userRole` in `useOrganization()` is `"store_owner"`, `"super_admin"`, or `"admin"`, `isSuperAdmin` evaluates to `true`.
2. **CRM Role Super Admin Bypass**:
   If any assigned custom CRM role in `crm_roles` has `is_super_admin: true`, `isSuperAdmin` evaluates to `true`.
3. **Bypass Behavior**:
   When `isSuperAdmin` is `true`, `hasPermission(mod, act)` and `allowed` return `true` unconditionally, even if the database permissions table is empty or explicitly records `allowed: false`.
4. **Offline & Fast-Mount Caching**:
   Initializes synchronously from `localStorage` (`credsmart_crm_roles_${orgId}`, `credsmart_crm_permissions_${orgId}`, `credsmart_crm_staff_roles_${orgId}`) to eliminate UI flicker, then revalidates against Supabase.

### 3.3 Permissions for Attendance Module
In `RoleManagement.tsx`, the `"attendance"` module is registered with:
- `module: "attendance"`
- `action: "view"`: Read attendance logs, own timer, shift schedules.
- `action: "edit"`: Clock-in time adjustments, geofence radius configuration, regularisation approvals.

---

## 4. CRMDashboard Integration & Stat Card Wiring

In `src/pages/crm/CRMDashboard.tsx`, lines 86–111 currently query `crm_attendance`:
```typescript
// 2. Today's attendance: query crm_attendance with graceful fallback
let attendance = 0;
try {
  if (activeOrgId) {
    const today = new Date().toISOString().split("T")[0];
    const { count, error } = await (supabase as unknown as {
      from: (t: string) => {
        select: (s: string, o: { count: string; head: boolean }) => {
          eq: (c: string, v: string) => {
            eq: (c2: string, v2: string) => Promise<{ count: number | null; error: Error | null }>;
          };
        };
      };
    })
      .from("crm_attendance")
      .select("id", { count: "exact", head: true })
      .eq("org_id", activeOrgId)
      .eq("date", today);

    if (!error && typeof count === "number") {
      attendance = count;
    }
  }
} catch {
  attendance = 0;
}
```

### Improvement Required for Phase 2:
Once `supabase/migrations/20261017010000_create_crm_attendance_tables.sql` is created and `src/integrations/supabase/types.ts` is updated with `crm_attendance`, the awkward cast `(supabase as unknown as ...)` can be replaced with direct, typed calls:
```typescript
const { count, error } = await supabase
  .from("crm_attendance")
  .select("id", { count: "exact", head: true })
  .eq("org_id", activeOrgId)
  .eq("date", today);
```
Furthermore, `quickNavItems` in `CRMDashboard.tsx` (line 220) already links "Attendance Tracker" to `ROUTE_PATHS.crmAttendance` with `badge: "Phase 2"`. Once `Attendance.tsx` is implemented, clicking "Open Module" transitions seamlessly to the new Attendance view.

---

## 5. RoleManagement & Staff Directory Pattern

In `src/pages/crm/RoleManagement.tsx`, staff members are queried by joining three sources:
1. `organization_memberships`: Retrieves `user_id`, `role` (store role), `created_at`.
2. `profiles`: Retrieves `full_name` and avatar details for each `user_id`.
3. `crm_staff_roles`: Retrieves assigned custom CRM role (`role_id`).

### Reusable Pattern for `Attendance.tsx`:
```typescript
// 1. Fetch organization members
const { data: members } = await supabase
  .from("organization_memberships")
  .select("id, user_id, role")
  .eq("organization_id", orgId);

// 2. Fetch profiles
const userIds = (members ?? []).map((m) => m.user_id);
const { data: profiles } = await supabase
  .from("profiles")
  .select("id, full_name, avatar_url")
  .in("id", userIds);

// 3. Fetch CRM staff roles & custom roles
const { data: staffRoles } = await supabase
  .from("crm_staff_roles")
  .select("staff_id, role_id");
const { data: crmRoles } = await supabase
  .from("crm_roles")
  .select("id, name, color, icon, is_super_admin")
  .eq("org_id", orgId);
```
This pattern allows `Attendance.tsx` to render every attendance record with full staff identity, including full name, avatar, store role, and custom CRM role pill.

---

## 6. Routing & Shell Navigation Architecture

### 6.1 `src/config/routes.ts`
- Line 90: `ROUTE_PATHS.crmAttendance = "/crm/attendance"` is defined.
- Line 194: `ROUTE_PATHS.crmAttendance` is mapped inside `FEATURE_ROUTE_MAP.crm`.
- Line 463: `MAIN_NAV_ROUTES` includes `{ title: "Attendance", url: ROUTE_PATHS.crmAttendance }` under CRM children.
- Role checks: `isRouteAllowedForRole` allows access for full access roles and users with CRM permissions.

### 6.2 `src/App.tsx`
- Lines 225–252 configure the protected layout:
  ```tsx
  <Route element={<ProtectedRoutes />}>
    <Route element={<AppLayout />}>
      <Route path={ROUTE_PATHS.crm} element={<CRMDashboard />} />
      <Route path={ROUTE_PATHS.crmRoles} element={<RoleManagement />} />
      <Route path={ROUTE_PATHS.crmAttendance} element={<CRMDashboard />} /> {/* CURRENT PLACEHOLDER */}
  ```
- Wiring requirement: Replace `<CRMDashboard />` with `<Attendance />` at `ROUTE_PATHS.crmAttendance`.

### 6.3 ⚠️ Critical Regression Alert: `src/test/crmShellRoutes.test.ts`
Line 320 in `src/test/crmShellRoutes.test.ts` contains:
```typescript
expect(appSource).toContain("<Route path={ROUTE_PATHS.crmAttendance} element={<CRMDashboard />} />");
```
When `src/App.tsx` is updated to render `<Attendance />`, this test will fail unless line 320 is updated in tandem:
```typescript
expect(appSource).toContain("<Route path={ROUTE_PATHS.crmAttendance} element={<Attendance />} />");
```

### 6.4 `src/components/AppSidebar.tsx`
- Desktop: Renders a 3D Dropdown Mega Menu when triggered. CRM appears under "BUSINESS TOOLS" with an accordion of 9 sub-items, including "Attendance".
- Mobile: Renders a fixed bottom dock with 5 core shortcuts (Home, Sales, POS, Items, Purchases). CRM is accessed via the top-bar dropdown menu or the dashboard quick links.
- No modifications needed in `AppSidebar.tsx` because it dynamically iterates over `NAV_ROUTES`.

---

## 7. Blueprint & Architectural Specification for `src/pages/crm/Attendance.tsx`

`Attendance.tsx` must be constructed as a complete, responsive, full-featured attendance center conforming 100% to CredSmart standards.

### 7.1 Visual Layout Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ CRMPageHeader: Title, Subtitle, Breadcrumbs, Status Badge, Global Actions    │
├──────────────────────────────────────────────────────────────────────────────┤
│ 5x CRMStatCard Grid: Present | On-Time Rate | Geofence % | Avg Hours | Req   │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Tab / Segmented View]: [ My Clock-In / Today ] | [ Team Attendance Logs ]    │
├────────────────────────────────────────┬─────────────────────────────────────┤
│ Left Column (Desktop 1/3, Mobile full) │ Right Column (Desktop 2/3)          │
│ CRMCard (variant="brand"):             │ CRMCard (variant="elevated"):       │
│ • Live Digital Clock (HH:MM:SS AM/PM)  │ • Active Geofences List             │
│ • Shift Info: 09:00 AM - 06:00 PM      │ • Distance Radar / Position Preview │
│ • GPS Status CRMBadge (dot=true)       │ • Quick Office Coordinates Summary  │
│ • Big Touch Button (Emerald / Orange)  │ • Geofence Config Modal Trigger     │
│ • Live Session Elapsed Timer           │                                     │
├────────────────────────────────────────┴─────────────────────────────────────┤
│ Team Attendance Oversight (CRMPermissionGate: module="attendance", act="view")│
│ CRMCard (variant="default"):                                                 │
│ • Filter Bar: Date Picker, Staff Search, Role Select, Status Filter          │
│ • CRMDataTable: Staff, Role, Date, Punch In, Punch Out, Duration, Geo Badge  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Detailed UI Components & States

#### A. Staff Clock-In / Clock-Out Pod
- **Live Digital Clock**: Real-time clock updating every 1000ms using `font-mono text-3xl font-extrabold tracking-tight text-slate-900`.
- **Shift Schedule**: Clear display of assigned store hours (e.g., `09:00 AM - 06:00 PM (9h Shift)`).
- **GPS Status Pill**:
  - `Acquiring GPS...`: Amber CRMBadge with spinner/pulse.
  - `Within Geofence (18m)`: Emerald CRMBadge with animated pulse dot.
  - `Outside Geofence (340m away)`: Rose/Amber CRMBadge with warning icon.
- **Primary Touch Action Button**:
  - When **Not Clocked In**:
    ```tsx
    <button
      onClick={handleClockIn}
      disabled={actionLoading}
      className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-base shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
    >
      <CheckCircle2 className="w-5 h-5" />
      <span>Clock In Now</span>
    </button>
    ```
  - When **Clocked In** (Active Session):
    ```tsx
    <button
      onClick={handleClockOut}
      disabled={actionLoading}
      className="w-full h-14 rounded-2xl bg-[#FF6A00] hover:bg-orange-600 active:scale-[0.98] text-white font-bold text-base shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
    >
      <Clock className="w-5 h-5" />
      <span>Clock Out</span>
    </button>
    ```
  - When **Clocked Out**:
    - Displays disabled/completed status: "Shift Completed for Today ✓" with total hours worked.
- **Live Work Session Timer**: When clocked in, a ticking stopwatch showing `HH:MM:SS` elapsed since `clock_in` timestamp.
- **Distance Radar Indicator**:
  - SVG radar visualization: concentric circles representing the geofence perimeter (150m), center pin for office, and pulsating user location pin.

#### B. Admin Team Attendance Oversight Table
- **Search & Filters**:
  - Date selector (defaults to Today `CURRENT_DATE`).
  - Search input targeting staff name or email.
  - Role dropdown filter.
  - Status dropdown (`All`, `Present`, `Late`, `Half Day`, `Absent`, `On Leave`).
- **Table Columns (`CRMColumnDef`)**:
  1. `Staff Name`: Avatar/initials, full name, and email.
  2. `Role`: Rendered via `<CRMRolePill name={role.name} color={role.color} />`.
  3. `Date`: Formatted date (`dd MMM yyyy`).
  4. `Clock In`: Time formatted (`hh:mm a`) + late indicator badge if applicable.
  5. `Clock Out`: Time formatted or "Active" green badge.
  6. `Duration`: Total work duration in hours and minutes (`Xh Ym`).
  7. `Verification`:
     - Geo-verified: `<CRMBadge variant="success" dot>Geo-Verified ✓</CRMBadge>`
     - Manual/Outside: `<CRMBadge variant="warning">Manual ⚠️ (${dist}m)</CRMBadge>`
     - Regularized: `<CRMBadge variant="info">Regularized</CRMBadge>`
  8. `Actions`: Button to edit punch or view GPS coordinates on map/modal.

#### C. Geofence Management Modal
- Gated with `CRMPermissionGate` (`module="attendance"`, `action="edit"`).
- Manage office locations:
  - Form fields: Office Name, Latitude, Longitude, Radius in meters (default: 150m), Active toggle.
  - "Capture Current GPS" button: Automatically reads `navigator.geolocation` and sets lat/lon into form fields.
  - Table of configured office geofences with edit/delete triggers.

#### D. Regularisation Approval Drawer
- Gated with `CRMPermissionGate` (`module="attendance"`, `action="edit"`).
- Staff can submit regularisation requests with reason ("Missed punch", "GPS device error", "Client on-site visit").
- Managers can review pending requests, click "Approve" (updates attendance record to regularized and updates times), or "Reject" with notes.

#### E. Reports & Export Engine
- **Monthly Attendance PDF Report**:
  - Implemented using `jsPDF` vector document generation (similar to `src/utils/whatsappPdfShare.ts`).
  - Header: CredSmart dark navy banner (`#0F172A`), organization name, report title, date range.
  - Summary metrics: Total Days, Total Staff, Present %, Overtime Hours.
  - Clean vector table with striped slate rows.
  - Saves file as `Attendance_Report_${month}_${year}.pdf`.
- **CSV Export**:
  - Generates downloadable CSV with columns: `Staff Name, Email, Date, Clock In, Clock Out, Duration (mins), Overtime (mins), Status, Verification, Distance (m)`.

---

## 8. Mobile Responsiveness Strategy (375px to 1280px)

CredSmart is a progressive PWA used on mobile smartphones (375px+), tablets (768px), and desktop POS monitors (1280px+).

### 8.1 Mobile (375px - 640px)
- **Clock-In Pod**: Full-width container with minimum 56px touch target for Clock In/Out button.
- **Segmented Tabs**: Rather than stacking massive tables below the clock-in pod, use mobile tabs:
  - Tab 1: `My Clock-In` (Personal punch clock, GPS status, today's summary).
  - Tab 2: `Team Records` (Available only if user has `attendance.view`).
  - Tab 3: `Requests` (Regularisation requests).
- **Stat Cards**: Grid uses `grid-cols-2` with the 5th card spanning 2 columns (`col-span-2`), exactly like `CRMDashboard.tsx`.
- **Modals & Drawers**: Render as full-width bottom sheets with safe-area bottom padding:
  ```css
  pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]
  ```
- **Touch Feedback**: `active:scale-95` on all buttons, 48px touch minimums, zero horizontal overflow (`overflow-x-hidden`).

### 8.2 Desktop (1024px - 1440px+)
- **Header**: Inline breadcrumbs with right-aligned action buttons (Export PDF, Export CSV, Geofence Config).
- **Stat Cards**: 5-column horizontal grid (`lg:grid-cols-5`).
- **Main Body**: 2-column split (1/3 left for Staff Clock-In Pod; 2/3 right for Geofence Map/Status Radar).
- **Team Oversight Table**: Full-width `CRMDataTable` with sorting, search, and pagination.

---

## 9. Verification & Testing Strategy

### 9.1 Vitest Unit Tests
Create `src/test/crmAttendance.test.tsx` verifying:
1. **Clock-In / Clock-Out Interaction**:
   - Renders Clock In button when user is not clocked in.
   - Clicking Clock In captures GPS coordinates and updates state to Clocked Out button.
   - Elapsed work timer counts up while clocked in.
2. **Geofence Evaluation**:
   - Correctly marks punch as "Geo-Verified ✓" when user is within 150m of office.
   - Correctly marks punch as "Manual ⚠️" when user is outside radius.
3. **Permission Gating**:
   - Users without `attendance.edit` cannot open Geofence Modal or approve regularisation.
   - Super admin bypasses all restrictions.
4. **Export Engines**:
   - PDF export triggers `jsPDF.save` without throwing.
   - CSV export builds valid RFC-4180 CSV blob.

### 9.2 TypeScript Strictness
- `cmd /c npx tsc --noEmit` must pass with 0 errors.
- Strict typing with zero `any` types in `Attendance.tsx` and helper files.

### 9.3 Existing Suite Protection
- Update `src/test/crmShellRoutes.test.ts:320` to reference `<Attendance />`.
- Verify all 26 test suites in `src/test/` continue to pass.

---

## 10. Summary File & Path Checklist for Implementers

| Resource | Path | Purpose |
|---|---|---|
| Migration | `supabase/migrations/20261017010000_create_crm_attendance_tables.sql` | Create `crm_geolocations`, `crm_attendance`, `crm_attendance_requests` with RLS |
| Types | `src/integrations/supabase/types.ts` | Add new table types to Supabase schema |
| Geo Engine | `src/utils/crmGeoUtils.ts` | Haversine formula, geofence tester, GPS wrapper |
| Attendance Page | `src/pages/crm/Attendance.tsx` | Main Attendance & Geolocation UI Hub |
| Route Registration | `src/App.tsx` | Replace `<CRMDashboard />` with `<Attendance />` at `ROUTE_PATHS.crmAttendance` |
| Route Test Fix | `src/test/crmShellRoutes.test.ts` | Update line 320 to expect `<Attendance />` |
| CRMDashboard Sync | `src/pages/crm/CRMDashboard.tsx` | Upgrade attendance stat card query to typed Supabase query |
| Skill Documentation | `.agents/skills/crm-attendance-skill/SKILL.md` | Author Phase 2 skill manual for subsequent phases |
