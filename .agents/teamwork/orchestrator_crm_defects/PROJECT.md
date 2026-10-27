# Project: CredSmart CRM Defects Elimination

## Architecture
CredSmart is a React 18 + Vite + TypeScript PWA with a dedicated Express/Node backend (`backend-api/`) and PostgreSQL database.
- **Backend API**: `backend-api/src/` handling auth, tenancy, CRM endpoints, settings, tasks, and caching.
- **Frontend CRM**: `src/pages/crm/` and `src/components/crm/` implementing Role Management, Salary Management, Tasks, Attendance, and Dashboard.
- **Routing & Guards**: `src/App.tsx`, `src/components/RoleProtectedRoute.tsx`, and `src/components/routing/BillingLockdownGuard.tsx`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Database & Auth Multi-Tenant Isolation | Remove CROSS JOIN in fix_db.sql, remove product-count fallback in auth.js & middleware/auth.js, scope settings.js profiles/memberships to org_id | M1 | R1, R7 |
| 2 | Staff Provisioning & Auth Binding | POST /api/crm/staff/provision saves custom credentials ({firstName}123), creates authoritative link in crm_staff_assignments & crm_staff_roles strictly scoped to org_id, enables clean login | M1 | R1 |
| 3 | In-Memory Micro-Caching & DB Indexes | Expand 10s micro-cache to /rest/v1/*, isolate CRM vs POS cache keys, add composite B-Tree indexes on crm_staff_assignments, staff_tasks, crm_salary_profiles | M1 | R5, R7 |
| 4 | Salary & Payroll Staff Synchronization | Hydrate staffDirectory from authoritative crmApi.getCRMStaff with local fallbacks, render both configured and unconfigured staff in Tab 1, 1-click salary profile creation | M2 | R2 |
| 5 | Reliable Task Assignment & Persistence | Eliminate synthetic IDs (user-178...) in RoleManagement, validate real UUIDs in POST /api/crm/tasks, add optimistic UI with error rollback in Tasks.tsx, eliminate demo tasks | M3 | R3 |
| 6 | Strict POS/Billing Access Lockdown | BillingLockdownGuard blocking CRM staff from /billing/*, /pos, /checkout with redirect to /crm and toast alert, while preserving store owner access and App.tsx AST test regexes | M4 | R4 |
| 7 | Unified CRM Command Center Header | Extract CRMCommandHeader component with responsive mobile/desktop variants, brand switcher, suite toggle, sync badges; standardize across all 8 CRM sub-pages | M5 | R6 |
| 8 | Comprehensive Verification & Audit | Zero TypeScript errors (tsc --noEmit), 100% Vitest pass across CRM test suites, Forensic Audit cleanliness | M6 | Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Multi-Tenant Isolation & Staff Provisioning | backend-api/ (fix_db.sql, auth.js, middleware/auth.js, settings.js, crm.js, index.js, add_indexes.sql) | none | DONE |
| M2 | Salary & Payroll Staff Synchronization | src/pages/crm/SalaryManagement.tsx, test fixes in crmSalaryManagement.test.tsx | M1 | DONE |
| M3 | Reliable Task Assignment & Synthetic ID Elimination | src/pages/crm/RoleManagement.tsx, src/pages/crm/Tasks.tsx | M1 | DONE |
| M4 | Strict POS/Billing Route Lockdown | src/components/routing/BillingLockdownGuard.tsx, src/App.tsx | M1 | IN_PROGRESS |
| M5 | Unified CRM Command Center Header | src/components/crm/CRMCommandHeader.tsx, src/components/crm/index.ts, all 8 CRM pages | M1 | PLANNED |
| M6 | Final Verification, Hardening & Audit | TypeScript compilation, Vitest test execution, Forensic Auditor review, Sentinel Victory claim | M1, M2, M3, M4, M5 | PLANNED |

## Interface Contracts
### Auth & Tenancy (`backend-api/src/routes/auth.js` & `middleware/auth.js`)
- `getUserPrimaryOrgId(userId)`: Resolves user's assigned organization from `org_memberships`, `organization_memberships`, or `crm_staff_assignments`. If user has no valid organization, returns `null` (or HTTP 401 on login) instead of auto-inserting into the org with the most products.
- `GET /api/profiles` & `GET /api/organization-memberships`: If `targetOrg` / `org_id` is missing, returns empty array `[]` (never leaks all users).

### Staff Provisioning (`POST /api/crm/staff/provision`)
- Payload: `{ email, password, full_name, phone, role_id }`
- Response on success: `{ data: { user: { id: UUID, email, full_name, ... } } }`
- On error (duplicate email, etc.): Returns HTTP 400/409 with `{ error: string }`. Frontend MUST check `res.error` and NOT generate synthetic IDs.

### Salary Staff Directory (`src/pages/crm/SalaryManagement.tsx`)
- `staffDirectory`: Record<string, { id: string, name: string, email: string, role: string, ... }>
- Populated via `crmApi.getCRMStaff(orgId)` -> fallback to `localStorage.getItem("credsmart_crm_staff_" + orgId)` -> fallback to `settingsApi.getMemberships(orgId)`.
- Listener: `window.addEventListener('credsmart:crm_staff_updated', reloadStaff)`.

### Billing Lockdown (`src/components/routing/BillingLockdownGuard.tsx`)
- Allowed: `isSuperAdmin || ["store_owner", "super_admin", "admin", "partner", "cashier", "salesman", "stock_manager", "delivery_boy", "accountant"].includes(userRole) || userPermissions?.pos || userPermissions?.sales || userPermissions?.checkout || hasPermission("pos", "access") || hasPermission("billing", "access")`.
- Disallowed: Redirect to `ROUTE_PATHS.crm` (`/crm`) with toast: `"Access Restricted: Billing & POS counter is reserved for store owners and cashiers."`.

## Code Layout
- Backend routes: `backend-api/src/routes/` (`auth.js`, `crm.js`, `settings.js`, `tasks.js`)
- Backend middleware: `backend-api/src/middleware/` (`auth.js`, `cache.js`)
- Backend root: `backend-api/src/index.js`, `backend-api/fix_db.sql`, `backend-api/add_indexes.sql`
- Frontend routing: `src/App.tsx`, `src/components/routing/BillingLockdownGuard.tsx`
- Frontend CRM components: `src/components/crm/CRMCommandHeader.tsx`, `src/components/crm/index.ts`
- Frontend CRM pages: `src/pages/crm/SalaryManagement.tsx`, `src/pages/crm/RoleManagement.tsx`, `src/pages/crm/Tasks.tsx`, etc.
