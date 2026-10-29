# Handoff Report: CredSmart Existing CRM Codebase Audit & Decoupling Inventory

**Agent**: Explorer 1 (`teamwork_explorer_credsmart_crm`)  
**Working Directory**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\teamwork_explorer_credsmart_crm`  
**Target Codebase**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart`  
**Authoritative Reference**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md`  
**Date**: 2026-10-30T01:15:00Z  
**Status**: Complete (Hard Handoff)

---

## 1. Observation

A full forensic audit of the CredSmart repository at `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart` was conducted across all pages, components, hooks, services, utilities, types, routing tables, app shells, test suites, and backend scripts to identify every artifact belonging to the existing CRM implementation.

### 1.1 CRM Pages (`src/pages/crm/`)
Direct filesystem inspection confirms 9 files exist in `src/pages/crm/`:
1. `src/pages/crm/CRMDashboard.tsx` (51,919 bytes): Legacy command center with stat card grid querying Supabase `crm_attendance`, `crm_payroll_runs`, and `crm_roles`.
2. `src/pages/crm/Attendance.tsx` (134,040 bytes): Geofenced punch-in hub, Haversine telemetry radar, live GPS timer, and admin attendance logs table.
3. `src/pages/crm/SalaryManagement.tsx` (147,223 bytes): 4-tab payroll manager (Profiles, Payroll Run, Advances & Deductions, My Payslips).
4. `src/pages/crm/RoleManagement.tsx` (148,875 bytes): Configurable RBAC permission matrix, user provisioning modal, and role assignment tree.
5. `src/pages/crm/Tasks.tsx` (73,654 bytes): Kanban/Table task workflow board querying `/api/crm/tasks`.
6. `src/pages/crm/Meet.tsx` (25,456 bytes): Omnichannel video meeting scheduler and WhatsApp invite link generator.
7. `src/pages/crm/Broadcasts.tsx` (25,645 bytes): Broadcast message composer and announcement feed.
8. `src/pages/crm/AIAssistant.tsx` (19,153 bytes): Standalone AI query chat assistant for staff.
9. `src/pages/crm/Support.tsx` (31,368 bytes): Internal support ticketing desk.

*Cross-check*: `src/pages/Staff.tsx` (73,425 bytes) was verified. Lines 1–60 and router wiring confirm `Staff.tsx` is an existing POS/Billing store staff management page (`/billing/staff`) that manages store roles (`store_owner`, `cashier`, `salesman`, `stock_manager`, etc.) via `settingsApi` and `organizations`. It is NOT an obsolete CRM page and MUST be RETAINED.

### 1.2 CRM Components (`src/components/crm/`)
Direct inspection of `src/components/crm/` reveals 10 files (including barrel export):
1. `src/components/crm/CRMBadge.tsx` (3,736 bytes): Status/label badge with variants (success, warning, error, info, neutral).
2. `src/components/crm/CRMCard.tsx` (4,600 bytes): Styled card container with CredSmart CRM brand tokens.
3. `src/components/crm/CRMCommandHeader.tsx` (4,500 bytes): Command center top bar with breadcrumb and sync pill.
4. `src/components/crm/CRMDataTable.tsx` (9,310 bytes): Generic paginated, sortable data table for CRM lists.
5. `src/components/crm/CRMPageHeader.tsx` (3,422 bytes): Header with title, subtitle, and action slot.
6. `src/components/crm/CRMPermissionGate.tsx` (2,259 bytes): Conditional permission wrapper checking `useCRMPermission()`.
7. `src/components/crm/CRMRolePill.tsx` (2,580 bytes): Colored pill tag displaying role name.
8. `src/components/crm/CRMStatCard.tsx` (5,425 bytes): KPI metric card with icon and trend arrow.
9. `src/components/crm/CRMTeamTreeView.tsx` (39,671 bytes): Hierarchical staff organogram tree.
10. `src/components/crm/index.ts` (481 bytes): Barrel exports for all CRM design system primitives.

*Cross-check*: Grep search across the entire repository for `@/components/crm` and `components/crm` confirms that ZERO components in core POS, billing, inventory, settings, parties, sales, or purchases import from `src/components/crm/`. Only `src/pages/crm/*` and `src/test/crm*` import these components.

### 1.3 Navigation, App Shell & Routing References
1. **`src/config/routes.ts`**:
   - Lines 98–109 define `ROUTE_PATHS.crm*`:
     - `crm: "/crm"`, `crmDashboard: "/crm"`, `crmAttendance: "/crm/attendance"`, `crmSalary: "/crm/salary"`, `crmTasks: "/crm/tasks"`, `crmMeet: "/crm/meet"`, `crmBroadcasts: "/crm/broadcasts"`, `crmAiAssistant: "/crm/ai-assistant"`, `crmSupport: "/crm/support"`, `crmRoles: "/crm/roles"`.
   - Lines 168–177 include `ROUTE_PATHS.crm*` in `RESTRICTED_ROUTES_FOR_CASHIER`.
   - Lines 242–253 define `FEATURE_ROUTE_MAP.crm`.
   - Lines 798–868 define `CRM_NAV_ROUTES` with 9 navigation items across "WORKFORCE & OPERATIONS" and "COMMUNICATION & TOOLS".
   - Lines 929–1046 define `resolveEntryRoute`, `resolvePostLoginRoute`, and `completeOnboardingSuiteSetup` handling `activeSuite` and `suitePreference`.
2. **`src/components/routes.ts`**:
   - Re-exports everything from `@/config/routes`.
3. **`src/App.tsx`**:
   - Lines 29, 32–43 import `CRMDashboard` and lazy-load `RoleManagement`, `Attendance`, `SalaryManagement`, `Tasks`, `Broadcasts`, `Meet`, `AIAssistant`, and `Support`.
   - Lines 265–276 mount `<Route path={ROUTE_PATHS.crm} ...>` etc. under `<Route element={<ProtectedRoutes />}><Route element={<AppLayout />}>`.
4. **`src/components/AppSidebar.tsx`**:
   - Line 39 imports `CRM_NAV_ROUTES`.
   - Lines 123–124 branch navigation: `const activeNavRoutes = isCrmSuite ? CRM_NAV_ROUTES : BILLING_NAV_ROUTES;`.
   - Lines 263–378 render mobile dock navigation tabs for CRM (`/crm`, `/crm/attendance`, `/crm/tasks`, `/crm/salary`, `/crm/roles`).
   - Lines 546–740 render desktop sidebar navigation and search shortcuts for CRM.
5. **`src/components/AppLayout.tsx`**:
   - Lines 95–144 map route paths to header titles (`CRM Command Center`, `Attendance Hub`, `Payroll Engine`, etc.).
   - Line 405 declares `crmActionMenuOpen` state.
   - Lines 740–845 render `/* CRM Suite: CRM Quick Action split button */` dropdown menu.
   - Lines 1086–1095 render mobile CRM command bar.
6. **`src/components/SuiteSwitcher.tsx`**:
   - Interactive header widget toggling `activeSuite` between `"billing"` and `"crm"`, storing value in `localStorage.getItem("credsmart_active_suite")`.
7. **`src/components/OnboardingSuiteSelector.tsx`**:
   - 3-option card selector (`billing`, `crm`, `both`) used in onboarding workflows.
8. **`src/hooks/useActiveSuite.ts`**:
   - Hook managing active suite state (`billing` vs `crm`), storage sync, and custom event `credsmart:suite_changed`.

### 1.4 Hooks & State
1. **`src/hooks/useCRMPermission.ts`** (350 lines, 11,685 bytes):
   - Exports `useCRMPermission` and alias `usePermission`.
   - Queries `crmApi.getCRMStaffRoles`, `crmApi.getCRMRoles`, `crmApi.getCRMPermissions`, and Supabase tables `crm_roles`, `crm_permissions`, `crm_staff_roles`.
   - Imports:
     - `src/pages/crm/*` (all 9 pages)
     - `src/components/crm/CRMPermissionGate.tsx`
     - `src/components/crm/CRMTeamTreeView.tsx`
     - `src/components/routing/BillingLockdownGuard.tsx` (Line 5)
     - `src/test/crm*.test.ts[x]`

### 1.5 Services
1. **`src/services/crmApi.ts`** (847 lines, 24,387 bytes):
   - Complete HTTP client calling `/api/crm/*` and fallback Supabase queries for roles, permissions, staff, attendance, geolocations, salary profiles, payroll runs, payslips, adjustments, and tasks.
   - Imported exclusively by `src/hooks/useCRMPermission.ts`, `src/pages/crm/*`, and `src/test/crm*`.

### 1.6 Utilities
1. **`src/utils/crmGeoUtils.ts`** (11,813 bytes): Haversine distance formula, geofence radius check, GPS accuracy filter.
2. **`src/utils/crmPayrollUtils.ts`** (13,460 bytes): Working days calculator, LOP deduction formula, overtime, PF, ESI, net pay generator.
3. **`src/utils/crmAttendancePdf.ts`** (20,575 bytes): jsPDF-based vector monthly attendance report generator.
4. **`src/utils/crmStaffUtils.ts`** (7,775 bytes): Staff provisioning password generator (`{firstName}123`) and validation helpers.

*Cross-check*: Grep search confirms zero usage of these 4 files outside `src/pages/crm/` and `src/test/crm*`.

### 1.7 Domain Types
1. **`src/types/crmAttendance.ts`** (1,916 bytes): Types for `CRMGeolocation`, `CRMAttendanceRecord`, `CRMAttendanceRequest`.
2. **`src/types/crmPayroll.ts`** (4,856 bytes): Types for `CrmSalaryProfile`, `CrmPayrollRun`, `CrmPayslip`, `CrmSalaryAdjustment`, `PayslipComputedData`.

### 1.8 Agents & Skills
1. `.agents/skills/crm-attendance-skill/SKILL.md` (authoritative guidelines for Phase 2 Attendance & Geolocation).
2. `.agents/skills/crm-rbac-skill/SKILL.md` (authoritative guidelines for Phase 1 RBAC and `CRMPermissionGate`).

### 1.9 Backend API & Database Schemas
1. **`backend-api/src/routes/crm.js`** (94,548 bytes): Express router mounting all `/api/crm/*` endpoints.
2. **`backend-api/create_crm_staff_tasks.sql`** (6,597 bytes): PostgreSQL DDL for `staff_tasks` table.
3. **`backend-api/fix_crm_schema.sql`** (9,944 bytes): Migration aligning `crm_roles`, `crm_permissions`, `crm_staff_roles`, `crm_geolocations`, `crm_attendance`.
4. **`clean_cross_memberships.sql`** (1,826 bytes): One-off root script.
5. **`fix_crm_schema.sql`** (9,944 bytes): Root copy of PostgreSQL DDL.
6. **`supabase/migrations/`**:
   - `20261017000000_create_crm_rbac_tables.sql`
   - `20261017010000_create_crm_attendance_tables.sql`
   - `20261017020000_create_crm_salary_tables.sql`
   - `20261017030000_crm_full_schema.sql`
   - `20261021180000_create_crm_staff_tasks.sql`
7. **`src/integrations/supabase/types.ts`**:
   - Table definitions for `crm_attendance`, `crm_attendance_requests`, `crm_geolocations`, `crm_payroll_runs`, `crm_payslips`, `crm_permissions`, `crm_roles`, `crm_salary_adjustments`, `crm_salary_profiles`, `crm_staff_roles`.

### 1.10 Unit & Integration Tests (`src/test/`)
1. **54 CRM-Dedicated Test Files** in `src/test/`:
   `crmAttendance.test.tsx`, `crmAttendanceAdminChallenge.test.tsx`, `crmAttendanceMigrationStress.test.ts`, `crmAttendancePdf.m4_2.stress.test.ts`, `crmAttendancePdf.stress.test.ts`, `crmAttendancePdf.test.ts`, `crmAttendanceRoleFilterStress.challenger.test.tsx`, `crmAttendanceRoleFilterStress.test.tsx`, `crmAttendanceRouteWiringChallenge.test.tsx`, `crmAttendanceStress.test.tsx`, `crmAttendanceTypes.challenger.test.ts`, `crmBackendApiM1.test.ts`, `crmBillingLockdownGuard.test.tsx`, `crmCacheAndProvisioningChallenger.test.ts`, `crmChallengerM1.test.ts`, `crmChallengerM1_2.test.ts`, `crmComponents.test.tsx`, `crmDashboardResilience.test.tsx`, `crmGeoUtils.test.ts`, `crmGeoUtilsAdversarial.test.ts`, `crmGeoUtilsMathematicalStressOracle.test.ts`, `crmMobileSuiteSwitch.test.tsx`, `crmPayrollUtils.challenger.test.ts`, `crmPayrollUtils.stress.test.ts`, `crmPayrollUtils.test.ts`, `crmPayrollUtilsAdversarialChallenge.test.ts`, `crmPermissionGate.test.tsx`, `crmPermissionRbac.test.ts`, `crmRolesTasksEmpiricChallenger2.test.ts`, `crmRolesTasksModernization.challenger.test.ts`, `crmSalaryLifecycleChallenger.test.tsx`, `crmSalaryManagement.challenger.test.ts`, `crmSalaryManagement.test.tsx`, `crmSalaryManagementAdmin.test.tsx`, `crmSalaryMigration.test.ts`, `crmSalaryMigrationStress.challenger.test.ts`, `crmSalaryOrgUuidGuard.test.tsx`, `crmSalaryStaffHydrationChallenger.test.tsx`, `crmSalaryTypes.challenger.test.ts`, `crmSalaryTypes.test.ts`, `crmShellNavigation.audit.test.ts`, `crmShellRoutes.test.ts`, `crmStaffProvisioning.test.ts`, `crmStaffProvisioningStress.test.tsx`, `crmStaffProvisioningUI.test.tsx`, `crmStaffTasksIntegration.test.tsx`, `crmSubmodules.test.tsx`, `crmTaskLifecycle.test.ts`, `crmTasksChallengerM3.test.tsx`, `crmTasksSyntheticRollbackChallenger.test.tsx`, `crmTasksView.test.tsx`, `crmTeamTreeView.test.tsx`, `crmTeamTreeViewIntegration.test.tsx`, `crmTenantIsolation.test.ts`.

2. **5 Multi-Domain Test Files** checking both POS and CRM files:
   - `src/test/m3DashboardPartiesCrmHrEmpiric.challenger.test.ts` (tests `Dashboard.tsx`, `Parties.tsx`, `SalaryManagement.tsx`, `Attendance.tsx`)
   - `src/test/milestone3ContainerModernization.challenger.test.ts` (tests `Dashboard.tsx`, `Parties.tsx`, `SalaryManagement.tsx`, `Attendance.tsx`)
   - `src/test/mobileErgonomicsChallenger.test.ts` (checks `targetFiles` array including CRM pages)
   - `src/test/mobileTouchErgonomicsRemediation.test.ts` (section 6 checks `Tasks.tsx`)
   - `src/test/e2e/decouple*` (`decoupleRoutes.test.ts`, `decoupleShells.test.tsx`, `decoupleIntegration.test.tsx`, `decoupleOnboarding.test.tsx` verifying dual-portal routes)

---

## 2. Logic Chain

1. **Isolation of Core POS & Invoicing**:
   - Observations 1.1, 1.2, 1.5, 1.6 confirm that POS billing (`src/pages/POSBilling.tsx`, `src/components/pos/*`), sales invoicing (`src/pages/Sales.tsx`, `src/components/invoices/*`, `src/components/SalesInvoiceModal.tsx`), inventory management (`src/pages/Items.tsx`, `src/pages/Inventory.tsx`), customer ledgers (`src/pages/Customers.tsx`, `src/pages/Parties.tsx`), accounting (`src/pages/CashAndBank.tsx`, `src/pages/Expenses.tsx`), and the 19 protected invoice quarantine files contain ZERO imports from `src/pages/crm/`, `src/components/crm/`, `src/utils/crm*`, or `src/services/crmApi.ts`.
   - Therefore, removing all legacy CRM pages, components, hooks, utilities, and services will produce ZERO direct symbol or import breakages in any core POS/Billing module.

2. **Cross-Cutting Dependency in `BillingLockdownGuard.tsx`**:
   - Observation 1.4 reveals that `src/components/routing/BillingLockdownGuard.tsx` (lines 5, 48, 77–82) imports `useCRMPermission` to evaluate whether CRM staff should be allowed into `/billing/*`.
   - If `src/hooks/useCRMPermission.ts` is deleted without refactoring `BillingLockdownGuard.tsx`, TypeScript compilation will fail and the POS route guard will crash.
   - Refactoring `BillingLockdownGuard.tsx` to evaluate store roles strictly via `useOrganization()` (`userRole`, `userPermissions`) cleanly breaks this dependency while keeping the route lockdown intact.

3. **App Shell & Routing Redirection**:
   - Observations 1.3 demonstrate that `src/config/routes.ts`, `src/App.tsx`, `src/components/AppSidebar.tsx`, and `src/components/AppLayout.tsx` contain hardcoded paths (`/crm/*`), navigation route groups (`CRM_NAV_ROUTES`), and UI action menus for the old CRM submodules.
   - Under the target architecture (R3 & R4 of original user request), the app will feature a cold launch selection hub and mount the new Lovable CRM (`<CrmApp />`).
   - Thus, these shell files must be refactored: remove old CRM imports and submenus, route `/crm/*` to the Lovable CRM integration component, and replace the old Suite Switcher with the isolated launch selection hub.

4. **Test Suite Hygiene & Invariance**:
   - Observation 1.10 shows that 54 test files exist exclusively to verify the old CRM implementation, Haversine geo formulas, salary profiles, and task boards. These 54 files can be deleted safely.
   - However, 5 test suites (`m3DashboardPartiesCrmHrEmpiric`, `milestone3ContainerModernization`, `mobileErgonomicsChallenger`, `mobileTouchErgonomicsRemediation`, and `decouple*`) contain joint assertions on both core ERP pages (`Dashboard.tsx`, `Sales.tsx`, `Parties.tsx`) and obsolete CRM pages (`SalaryManagement.tsx`, `Attendance.tsx`, `Tasks.tsx`).
   - If these 5 test suites are deleted, vital POS regression coverage will be lost; if left unmodified, they will fail once old CRM files are deleted. Therefore, they must be REFACTORED to remove CRM-specific assertions while preserving all POS/Billing assertions.

5. **Shared Dependencies in `package.json`**:
   - Observation 1.6 and inspection of `src/utils/downloadExactInvoice.ts` confirm that `jspdf` is actively used by the core sales invoice PDF generator (`UnifiedInvoiceRenderer` -> `downloadExactInvoicePdf`).
   - `recharts` is actively used by `src/pages/Dashboard.tsx` (ERP revenue chart).
   - `html2canvas` is actively used by invoice print rendering.
   - None of these packages should be pruned from `package.json`.

---

## 3. Caveats

1. **Quarantine Invariance**: All 19 invoice files (e.g. `MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `UnifiedInvoiceRenderer.tsx`, `documentsService.ts`) are strictly protected. No edits are permitted to these files under any circumstance.
2. **Ubuntu Backend Retention**: The Ubuntu backend Express app (`backend-api/src/index.js`) currently mounts `/api/crm`. Removing `/api/crm` from `index.js` or deleting `backend-api/src/routes/crm.js` does not affect any POS endpoints (`/api/sales`, `/api/products`, `/api/parties`, `/api/inventory`).
3. **Multi-Tenant Memberships**: Store roles in POS (`store_owner`, `cashier`, `salesman`, `stock_manager`) are governed by `org_memberships` in the Ubuntu backend and `settingsApi`. They do not depend on the legacy `crm_roles` or `crm_permissions` tables.

---

## 4. Conclusion: Master Catalog of CRM Artifacts

Below is the exhaustive, file-by-file catalog categorized by type, action, and rationale.

### 4.1 CRM Pages (Directory: `src/pages/crm/`) — 9 Files (ALL DELETE)
| File Path | Type | Action | Rationale |
|---|---|---|---|
| `src/pages/crm/CRMDashboard.tsx` | Page | **Delete** | Obsolete legacy CRM dashboard; replaced by Lovable CRM `<MetallicCommand />` |
| `src/pages/crm/Attendance.tsx` | Page | **Delete** | Obsolete legacy attendance hub; replaced by Lovable CRM `<AttendanceScreen />` |
| `src/pages/crm/SalaryManagement.tsx` | Page | **Delete** | Obsolete legacy payroll page; replaced by Lovable CRM `<Payroll />` |
| `src/pages/crm/RoleManagement.tsx` | Page | **Delete** | Obsolete legacy role page; replaced by Lovable CRM `<StaffManager />` |
| `src/pages/crm/Tasks.tsx` | Page | **Delete** | Obsolete legacy task board; replaced by Lovable CRM `<TasksScreen />` |
| `src/pages/crm/Meet.tsx` | Page | **Delete** | Obsolete legacy meeting scheduler; feature integrated into Lovable CRM |
| `src/pages/crm/Broadcasts.tsx` | Page | **Delete** | Obsolete legacy announcements; feature integrated into Lovable CRM |
| `src/pages/crm/AIAssistant.tsx` | Page | **Delete** | Obsolete standalone AI assistant; replaced by Lovable CRM Voice Copilot |
| `src/pages/crm/Support.tsx` | Page | **Delete** | Obsolete legacy support desk; replaced by Lovable CRM |

### 4.2 CRM Components (Directory: `src/components/crm/`) — 10 Files (ALL DELETE)
| File Path | Type | Action | Rationale |
|---|---|---|---|
| `src/components/crm/CRMBadge.tsx` | Component | **Delete** | Unused outside obsolete CRM pages |
| `src/components/crm/CRMCard.tsx` | Component | **Delete** | Unused outside obsolete CRM pages |
| `src/components/crm/CRMCommandHeader.tsx` | Component | **Delete** | Unused outside obsolete CRM pages |
| `src/components/crm/CRMDataTable.tsx` | Component | **Delete** | Unused outside obsolete CRM pages |
| `src/components/crm/CRMPageHeader.tsx` | Component | **Delete** | Unused outside obsolete CRM pages |
| `src/components/crm/CRMPermissionGate.tsx` | Component | **Delete** | Unused outside obsolete CRM pages |
| `src/components/crm/CRMRolePill.tsx` | Component | **Delete** | Unused outside obsolete CRM pages |
| `src/components/crm/CRMStatCard.tsx` | Component | **Delete** | Unused outside obsolete CRM pages |
| `src/components/crm/CRMTeamTreeView.tsx` | Component | **Delete** | Unused outside obsolete CRM pages |
| `src/components/crm/index.ts` | Barrel | **Delete** | Barrel export for deleted CRM design system primitives |

### 4.3 Hooks & Services — 2 Files (ALL DELETE)
| File Path | Type | Action | Rationale |
|---|---|---|---|
| `src/hooks/useCRMPermission.ts` | Hook | **Delete** | Obsolete RBAC hook querying legacy CRM tables |
| `src/services/crmApi.ts` | Service | **Delete** | Obsolete API client calling `/api/crm/*` |

### 4.4 Utilities — 4 Files (ALL DELETE)
| File Path | Type | Action | Rationale |
|---|---|---|---|
| `src/utils/crmGeoUtils.ts` | Util | **Delete** | Legacy Haversine formula; replaced by Lovable CRM internal GPS engine |
| `src/utils/crmPayrollUtils.ts` | Util | **Delete** | Legacy payroll math; replaced by Lovable CRM `<Payroll />` calculations |
| `src/utils/crmAttendancePdf.ts` | Util | **Delete** | Legacy attendance PDF generator; no POS dependency |
| `src/utils/crmStaffUtils.ts` | Util | **Delete** | Legacy password generation helper; no POS dependency |

### 4.5 Domain Types — 2 Files (ALL DELETE)
| File Path | Type | Action | Rationale |
|---|---|---|---|
| `src/types/crmAttendance.ts` | Type | **Delete** | Obsolete Phase 2 attendance type declarations |
| `src/types/crmPayroll.ts` | Type | **Delete** | Obsolete Phase 3 payroll type declarations |

### 4.6 Agent Skills — 2 Files (ALL DELETE)
| File Path | Type | Action | Rationale |
|---|---|---|---|
| `.agents/skills/crm-attendance-skill/SKILL.md` | Skill | **Delete** | Obsolete Phase 2 attendance architecture documentation |
| `.agents/skills/crm-rbac-skill/SKILL.md` | Skill | **Delete** | Obsolete Phase 1 RBAC architecture documentation |

### 4.7 Backend & SQL Scripts — 5 Files (ALL DELETE)
| File Path | Type | Action | Rationale |
|---|---|---|---|
| `backend-api/src/routes/crm.js` | Backend Route | **Delete** | Obsolete Express route handler for legacy CRM |
| `backend-api/create_crm_staff_tasks.sql` | SQL | **Delete** | Obsolete database migration script |
| `backend-api/fix_crm_schema.sql` | SQL | **Delete** | Obsolete database migration script |
| `clean_cross_memberships.sql` | SQL | **Delete** | Obsolete root cleanup script |
| `fix_crm_schema.sql` | SQL | **Delete** | Obsolete root migration script |

### 4.8 Dedicated CRM Unit & Integration Tests — 54 Files (ALL DELETE)
All 54 test files matching `src/test/crm*.test.ts[x]` (listed below) verify only the deleted CRM pages, utilities, and endpoints:
1. `src/test/crmAttendance.test.tsx`
2. `src/test/crmAttendanceAdminChallenge.test.tsx`
3. `src/test/crmAttendanceMigrationStress.test.ts`
4. `src/test/crmAttendancePdf.m4_2.stress.test.ts`
5. `src/test/crmAttendancePdf.stress.test.ts`
6. `src/test/crmAttendancePdf.test.ts`
7. `src/test/crmAttendanceRoleFilterStress.challenger.test.tsx`
8. `src/test/crmAttendanceRoleFilterStress.test.tsx`
9. `src/test/crmAttendanceRouteWiringChallenge.test.tsx`
10. `src/test/crmAttendanceStress.test.tsx`
11. `src/test/crmAttendanceTypes.challenger.test.ts`
12. `src/test/crmBackendApiM1.test.ts`
13. `src/test/crmBillingLockdownGuard.test.tsx` (Delete old mock suite; replaced with clean unit test for refactored guard)
14. `src/test/crmCacheAndProvisioningChallenger.test.ts`
15. `src/test/crmChallengerM1.test.ts`
16. `src/test/crmChallengerM1_2.test.ts`
17. `src/test/crmComponents.test.tsx`
18. `src/test/crmDashboardResilience.test.tsx`
19. `src/test/crmGeoUtils.test.ts`
20. `src/test/crmGeoUtilsAdversarial.test.ts`
21. `src/test/crmGeoUtilsMathematicalStressOracle.test.ts`
22. `src/test/crmMobileSuiteSwitch.test.tsx`
23. `src/test/crmPayrollUtils.challenger.test.ts`
24. `src/test/crmPayrollUtils.stress.test.ts`
25. `src/test/crmPayrollUtils.test.ts`
26. `src/test/crmPayrollUtilsAdversarialChallenge.test.ts`
27. `src/test/crmPermissionGate.test.tsx`
28. `src/test/crmPermissionRbac.test.ts`
29. `src/test/crmRolesTasksEmpiricChallenger2.test.ts`
30. `src/test/crmRolesTasksModernization.challenger.test.ts`
31. `src/test/crmSalaryLifecycleChallenger.test.tsx`
32. `src/test/crmSalaryManagement.challenger.test.ts`
33. `src/test/crmSalaryManagement.test.tsx`
34. `src/test/crmSalaryManagementAdmin.test.tsx`
35. `src/test/crmSalaryMigration.test.ts`
36. `src/test/crmSalaryMigrationStress.challenger.test.ts`
37. `src/test/crmSalaryOrgUuidGuard.test.tsx`
38. `src/test/crmSalaryStaffHydrationChallenger.test.tsx`
39. `src/test/crmSalaryTypes.challenger.test.ts`
40. `src/test/crmSalaryTypes.test.ts`
41. `src/test/crmShellNavigation.audit.test.ts`
42. `src/test/crmShellRoutes.test.ts`
43. `src/test/crmStaffProvisioning.test.ts`
44. `src/test/crmStaffProvisioningStress.test.tsx`
45. `src/test/crmStaffProvisioningUI.test.tsx`
46. `src/test/crmStaffTasksIntegration.test.tsx`
47. `src/test/crmSubmodules.test.tsx`
48. `src/test/crmTaskLifecycle.test.ts`
49. `src/test/crmTasksChallengerM3.test.tsx`
50. `src/test/crmTasksSyntheticRollbackChallenger.test.tsx`
51. `src/test/crmTasksView.test.tsx`
52. `src/test/crmTeamTreeView.test.tsx`
53. `src/test/crmTeamTreeViewIntegration.test.tsx`
54. `src/test/crmTenantIsolation.test.ts`

### 4.9 App Shell & Routing Files Requiring Refactoring (REFACTOR)
| File Path | Type | Action | Refactoring Scope |
|---|---|---|---|
| `src/components/routing/BillingLockdownGuard.tsx` | Guard | **Refactor** | Remove `useCRMPermission` import; guard `/billing/*` routes strictly using store roles (`store_owner`, `cashier`, etc.) and `userPermissions` from `useOrganization()`. |
| `src/config/routes.ts` | Config | **Refactor** | Retain `/crm` route pointing to Lovable CRM root; eliminate deprecated individual CRM sub-routes (`/crm/attendance`, `/crm/salary`, etc.) or map them to internal Lovable tabs; retain `ROUTE_PATHS.billing` and all POS routes. |
| `src/components/routes.ts` | Config | **Refactor** | Update re-exports matching `src/config/routes.ts`. |
| `src/App.tsx` | Root Component | **Refactor** | Remove 9 obsolete CRM page lazy imports; mount launch selection hub on cold start; mount Lovable CRM container (`<CrmApp />`) under `/crm/*`. |
| `src/components/AppLayout.tsx` | Layout | **Refactor** | Remove legacy CRM quick actions split button, CRM titles, and floating dock; ensure layout cleanly hosts POS shell and launches Lovable CRM. |
| `src/components/AppSidebar.tsx` | Sidebar | **Refactor** | Remove legacy `CRM_NAV_ROUTES` and 5 legacy mobile dock tabs; retain dedicated POS & Billing navigation. |
| `src/components/SuiteSwitcher.tsx` | Component | **Refactor** | Adapt or replace with Cold Launch Selection Hub trigger. |
| `src/components/OnboardingSuiteSelector.tsx` | Component | **Refactor** | Align suite options with launch hub. |
| `src/hooks/useActiveSuite.ts` | Hook | **Refactor** | Ensure strict storage key isolation (`credsmart_active_suite`) without leaking session tokens across domains. |
| `backend-api/src/index.js` | Server Entry | **Refactor** | Remove `const crmRoutes = require('./routes/crm')` and `app.use('/api/crm', crmRoutes)`. |

### 4.10 Multi-Domain Tests Requiring Refactoring (REFACTOR)
| File Path | Type | Action | Refactoring Scope |
|---|---|---|---|
| `src/test/m3DashboardPartiesCrmHrEmpiric.challenger.test.ts` | Test | **Refactor** | Remove tests for `SalaryManagement.tsx` and `Attendance.tsx`; preserve tests for `Dashboard.tsx` and `Parties.tsx`. |
| `src/test/milestone3ContainerModernization.challenger.test.ts` | Test | **Refactor** | Remove tests for `SalaryManagement.tsx` and `Attendance.tsx`; preserve tests for `Dashboard.tsx` and `Parties.tsx`. |
| `src/test/mobileErgonomicsChallenger.test.ts` | Test | **Refactor** | Remove CRM paths from `targetFiles` array; preserve ergonomics checks for all core ERP pages. |
| `src/test/mobileTouchErgonomicsRemediation.test.ts` | Test | **Refactor** | Remove Section 6 (`Tasks.tsx`); preserve touch tests for `Sales`, `Purchases`, `Items`, `Parties`, `PaginationBar`. |
| `src/test/e2e/decoupleRoutes.test.ts` | E2E Test | **Refactor** | Update route expectations: `/crm` mounts Lovable CRM, legacy routes redirect to `/billing/*`. |
| `src/test/e2e/decoupleShells.test.tsx` | E2E Test | **Refactor** | Update shell expectations matching the new decoupled architecture. |
| `src/test/e2e/decoupleIntegration.test.tsx` | E2E Test | **Refactor** | Update suite switching expectations. |
| `src/test/e2e/decoupleOnboarding.test.tsx` | E2E Test | **Refactor** | Update onboarding suite expectations. |

### 4.11 Core POS/Billing Assets to RETAIN (ZERO REGRESSION)
1. **Core ERP Pages**: `Dashboard.tsx`, `POSBilling.tsx`, `POS.tsx`, `Checkout.tsx`, `Sales.tsx`, `SalesHistory.tsx`, `Purchases.tsx`, `PurchaseReturns.tsx`, `Items.tsx`, `Inventory.tsx`, `Godown.tsx`, `Parties.tsx`, `Customers.tsx`, `CustomerLedger.tsx`, `Suppliers.tsx`, `CashAndBank.tsx`, `Expenses.tsx`, `EInvoicing.tsx`, `EwayBillDashboard.tsx`, `Staff.tsx`, `Reports.tsx`, `Analytics.tsx`, `TallyImport.tsx`, `BarcodeGenerator.tsx`, `StorefrontManager.tsx`, `BusinessSettings.tsx`, `InvoiceSettings.tsx`, `PrintSettings.tsx`, `ActivityLog.tsx`, `AutomatedBills.tsx`, `VendorDiscovery.tsx`, `Auth.tsx`, `Landing.tsx`, `NotFound.tsx`.
2. **19 Protected Invoice Quarantine Files**: All bill creation and invoice rendering files (`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `UnifiedInvoiceRenderer.tsx`, `downloadExactInvoice.ts`, etc.) remain 100% untouched.
3. **Core Dependencies**: `jspdf`, `recharts`, `html2canvas`, `@capacitor/*`, `@radix-ui/*`, `@tanstack/react-query`, `lucide-react`, `tailwindcss`.

---

## 5. Verification Method

To independently verify this investigation and validate each claim:

### 5.1 Verification Commands
1. **Verify No POS Dependencies on CRM Components**:
   ```powershell
   grep -rn "components/crm" src/pages/Dashboard.tsx src/pages/Sales.tsx src/pages/POSBilling.tsx src/pages/Purchases.tsx src/pages/Items.tsx src/pages/Parties.tsx
   ```
   *Expected output*: Zero matches.

2. **Verify `BillingLockdownGuard.tsx` Dependency**:
   ```powershell
   grep -rn "useCRMPermission" src/components/routing/BillingLockdownGuard.tsx
   ```
   *Expected output*: Confirms lines 5 and 48 import and call `useCRMPermission`.

3. **Verify Core POS Tests Pass**:
   ```powershell
   cmd /c npx vitest run src/test/billingLifecycleEngine.test.ts src/test/e2e/decoupleRoutes.test.ts
   ```
   *Expected output*: 17/17 billing lifecycle tests pass; 68/68 decouple route tests pass.

4. **Verify TypeScript Compilation Health**:
   ```powershell
   cmd /c npx tsc --noEmit
   ```
   *Expected output*: 0 errors across the repository before changes.

### 5.2 Invalidation Conditions
This investigation report would be invalidated if:
- Any file in `src/pages/` (outside `crm/`) directly imports from `src/components/crm/` or `src/services/crmApi.ts`. (Verified: 0 files import them).
- `src/pages/Staff.tsx` is misclassified as an obsolete CRM file. (Verified: it is a core store staff page and is retained).
- Core invoicing PDF export does not depend on `jspdf`. (Verified: `downloadExactInvoice.ts:2` directly imports `jspdf`).
