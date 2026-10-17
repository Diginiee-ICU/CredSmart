# Handoff Report: CRM Phase 2 UI Infrastructure & Attendance.tsx Specification

**Agent**: `survey_explorer_2`  
**Working Directory**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_2`  
**Handoff Type**: Hard (Task Complete)  
**Recipient**: `1beca3ca-d4b2-4508-99a0-6c9d39936bfb` (Parent Orchestrator)  
**Date**: 2026-10-17T09:12:00Z  

---

## 1. Observation

1. **CRM Component Suite**:
   Direct inspection of `src/components/crm/` confirmed all 7 components and the barrel export exist:
   - `CRMCard.tsx`: Brand tokens (`CRM_BRAND_COLORS`), 5 variants (`default`, `elevated`, `brand`, `outline`, `glass`), header action slot, footer slot.
   - `CRMBadge.tsx`: 6 variants (`success`, `warning`, `error`, `info`, `neutral`, `orange`), animated `dot` indicator (`animate-pulse`), sizes (`sm`, `md`, `lg`).
   - `CRMDataTable.tsx`: Generic `CRMColumnDef<T>`, sortable columns (`ArrowUpDown`, `ArrowUp`, `ArrowDown`), client search with optional `searchKey` / `searchFilter`, `PaginationBar` integration.
   - `CRMPageHeader.tsx`: Title, subtitle, `breadcrumbs` array, `badge` slot, right-aligned `actions` slot with responsive stacking.
   - `CRMStatCard.tsx`: Metric label, tabular figures (`font-mono tabular-nums font-extrabold`), 5 icon pod accents (`navy`, `orange`, `blue`, `emerald`, `gold`), trend indicator (`up`, `down`, `neutral`), loading pulse.
   - `CRMPermissionGate.tsx`: Evaluates permission via `useCRMPermission`, renders `children` or `fallback`, dispatches "Not Authorized" toast via `useRef` to prevent duplicate alerts.
   - `CRMRolePill.tsx`: Dynamic hex color opacity computation (`toHexAlpha`), gold `Crown` icon for `isSuperAdmin`, `Shield` or custom icon for normal roles.
   - `index.ts`: Re-exports all 7 components and `CRM_BRAND_COLORS`.

2. **Permission Hook & Taxonomy**:
   - `src/hooks/useCRMPermission.ts` provides `hasPermission(module, action)` and `isSuperAdmin`. Super admins (`store_owner`, `super_admin`, `admin`, or CRM roles with `is_super_admin: true`) unconditionally bypass all permission checks.
   - In `src/pages/crm/RoleManagement.tsx:90-99`, the `attendance` module is registered with two actions:
     - `view`: "View self and team daily attendance records"
     - `edit`: "Adjust clock-in times, approve manual punch requests"

3. **Dashboard Query & Stat Card**:
   - `src/pages/crm/CRMDashboard.tsx:86-111` queries `crm_attendance` with a type cast:
     ```typescript
     const today = new Date().toISOString().split("T")[0];
     const { count, error } = await (supabase as unknown as ...)
       .from("crm_attendance")
       .select("id", { count: "exact", head: true })
       .eq("org_id", activeOrgId)
       .eq("date", today);
     ```
   - In `CRMDashboard.tsx:220-230`, "Attendance Tracker" is already present in `quickNavItems` linking to `ROUTE_PATHS.crmAttendance` with `badge: "Phase 2"`.

4. **Routing & Regression Anchor**:
   - `src/config/routes.ts:90`: `ROUTE_PATHS.crmAttendance = "/crm/attendance"` is defined.
   - `src/config/routes.ts:194`: `ROUTE_PATHS.crmAttendance` is in `FEATURE_ROUTE_MAP.crm`.
   - `src/config/routes.ts:463`: `MAIN_NAV_ROUTES` includes `{ title: "Attendance", url: ROUTE_PATHS.crmAttendance }`.
   - `src/App.tsx:245`: Currently renders `<Route path={ROUTE_PATHS.crmAttendance} element={<CRMDashboard />} />`.
   - `src/test/crmShellRoutes.test.ts:320`: Statically asserts:
     ```typescript
     expect(appSource).toContain("<Route path={ROUTE_PATHS.crmAttendance} element={<CRMDashboard />} />");
     ```
     Replacing `<CRMDashboard />` with `<Attendance />` in `App.tsx` will cause this test to fail unless updated to expect `<Attendance />`.

5. **Test & Build Status**:
   - Running `cmd /c npx vitest run src/test/crmShellRoutes.test.ts` passed 22 of 22 tests.
   - Running `cmd /c npx tsc --noEmit` exited with code 0 (zero compiler errors).
   - `jspdf` version `^4.2.1` is installed and verified via `src/utils/whatsappPdfShare.ts`.

---

## 2. Logic Chain

1. **Design System Conformance** (Supported by Observation 1):
   `Attendance.tsx` can be assembled entirely out of existing CRM components: `CRMPageHeader` for breadcrumbs and action triggers; `CRMStatCard` (5 cards) for metrics; `CRMCard` for the Staff Clock-In Hub and Geofence radar; `CRMBadge` for GPS and punch status; `CRMRolePill` for staff roles; and `CRMDataTable` for team logs and regularisation requests.

2. **RBAC & Gating Conformance** (Supported by Observation 2):
   Because `attendance.view` is defined for daily inspection and `attendance.edit` is defined for punch adjustments and geofence configuration, `Attendance.tsx` should allow every authenticated staff member to clock in/out and view their own history under `attendance.view`, while gating management tabs, geofence configuration, and regularisation approvals behind `hasPermission("attendance", "edit")` or `isSuperAdmin`.

3. **Dashboard & Database Parity** (Supported by Observation 3):
   When `supabase/migrations/20261017010000_create_crm_attendance_tables.sql` is deployed and `src/integrations/supabase/types.ts` is updated, the type cast in `CRMDashboard.tsx` can be cleanly replaced with typed queries, and the dashboard Attendance stat card will reflect live attendance records.

4. **Shell Routing & Test Maintenance** (Supported by Observation 4):
   Wiring `ROUTE_PATHS.crmAttendance` to `Attendance.tsx` in `src/App.tsx` fulfills R5. To prevent test suite failure, `src/test/crmShellRoutes.test.ts:320` must be simultaneously updated to assert `<Route path={ROUTE_PATHS.crmAttendance} element={<Attendance />} />`.

5. **Vector Export Parity** (Supported by Observation 5):
   Using programmatic `jsPDF` vector generation (identical to `src/utils/whatsappPdfShare.ts`) avoids flaky DOM canvas capture and produces clean, branded A4 monthly attendance reports.

---

## 3. Caveats

- **Geolocation in Headless/CI Environments**:
  Browsers and test environments running in Node/jsdom do not have hardware GPS (`navigator.geolocation`). As observed, `src/utils/crmGeoUtils.ts` must provide mock helpers (`mockGeolocationPosition`, `resetGeolocationMock`) so unit tests can simulate both within-geofence and outside-geofence states deterministically.
- **Office Location Defaults**:
  If an organization has not yet configured any office geofence in `crm_geolocations`, `Attendance.tsx` should fall back to a sensible default or prompt the administrator to set their office location with a 1-click "Use Current Location" button.

---

## 4. Conclusion

The CRM Phase 1 infrastructure is 100% prepared to host `src/pages/crm/Attendance.tsx`. No changes are required to the existing 7 CRM components or the RBAC hook. The implementation requires:
1. Creating migration `supabase/migrations/20261017010000_create_crm_attendance_tables.sql`.
2. Updating `src/integrations/supabase/types.ts`.
3. Creating geolocation math and GPS wrapper in `src/utils/crmGeoUtils.ts`.
4. Creating `src/pages/crm/Attendance.tsx` matching the architecture blueprint in `analysis.md`.
5. Wiring `Attendance.tsx` in `src/App.tsx` and updating `src/test/crmShellRoutes.test.ts:320`.
6. Upgrading `CRMDashboard.tsx` to typed queries.
7. Authoring `.agents/skills/crm-attendance-skill/SKILL.md`.

---

## 5. Verification Method

To independently verify the findings and enforce compliance:
1. **Type Safety Verification**:
   ```powershell
   cmd /c npx tsc --noEmit
   ```
   Must exit with code 0.
2. **Existing Route & Navigation Suite**:
   ```powershell
   cmd /c npx vitest run src/test/crmShellRoutes.test.ts
   ```
   Must pass all 22 tests.
3. **CRM Components & RBAC Verification**:
   ```powershell
   cmd /c npx vitest run src/test/crmComponents.test.tsx src/test/crmPermissionRbac.test.ts
   ```
   Must pass all component and RBAC tests.
4. **Inspect Analysis Report**:
   Review detailed blueprint and architecture in `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_2\analysis.md`.
