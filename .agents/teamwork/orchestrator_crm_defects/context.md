# Architecture Context: CredSmart CRM Defects Elimination

## 1. System Architecture
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui.
  - CRM Pages: `src/pages/crm/` (`CRMDashboard.tsx`, `RoleManagement.tsx`, `SalaryManagement.tsx`, `Tasks.tsx`, `Attendance.tsx`, `Broadcasts.tsx`, `Meet.tsx`, `AIAssistant.tsx`, `Support.tsx`).
  - CRM Components: `src/components/crm/` (`CRMCard`, `CRMBadge`, `CRMDataTable`, `CRMPageHeader`, `CRMStatCard`, `CRMPermissionGate`, `CRMRolePill`).
  - CRM API Client: `src/services/crmApi.ts`, `src/services/backendApi.ts`.
  - Auth Hook & State: `src/hooks/useAuth.tsx`, `src/hooks/useCRMPermission.ts`.
  - Router: `src/App.tsx`, `src/config/routes.ts`.
- **Backend API**: `backend-api/` (Express + pg / PostgreSQL).
  - Routes: `backend-api/src/routes/auth.js`, `backend-api/src/routes/crm.js`, `backend-api/src/routes/settings.js`, `backend-api/src/routes/tasks.js`.
  - Middleware: `backend-api/src/middleware/auth.js`, `backend-api/src/middleware/cache.js`.
  - Database scripts: `backend-api/fix_db.sql`, migrations in `supabase/migrations/`.

## 2. Forensic Root Causes & Architectural Fix Points
1. **Cross-Tenant Leaks & SQL Cross-Join**:
   - `backend-api/fix_db.sql`: eliminate `users u CROSS JOIN organizations o`.
   - `backend-api/src/routes/auth.js` (`getUserPrimaryOrgId`) and `backend-api/src/middleware/auth.js`: remove fallback selecting org with most products. Never auto-assign random orgs.
   - `backend-api/src/routes/settings.js`: `GET /api/profiles` and `GET /api/organization-memberships` must require and filter by `org_id`.
2. **Staff Provisioning & Synthetic IDs**:
   - `POST /api/crm/staff/provision`: enforce authoritative password hash and insert into `crm_staff_assignments` and `crm_staff_roles`.
   - `src/pages/crm/RoleManagement.tsx`: stop falling back to `user-${Date.now()}` on failure; handle backend errors gracefully and surface them.
3. **Salary Management Visibility**:
   - `SalaryManagement.tsx`: query authoritative staff list for active `orgId`, showing configured and unconfigured staff for 1-click salary profile creation.
4. **Task Assignment Reliability**:
   - `src/pages/crm/Tasks.tsx`: eliminate synthetic IDs, ensure real staff UUIDs are passed, support optimistic updates and persistent sync.
5. **POS/Billing Route Lockdown**:
   - Implement `POSRouteGuard` / `BillingRouteGuard` in `src/App.tsx` guarding `/billing/*`, `/pos`, `/checkout`. Only store owner / super admin or staff with explicit POS permissions can enter. CRM staff redirected to `/crm`.
6. **CRM Performance & Caching**:
   - `backend-api/src/middleware/cache.js`: expand in-memory micro-cache (10s TTL) to `/rest/v1/*`.
   - Add DB indexes on `crm_staff_assignments(org_id, user_id)`, `staff_tasks(org_id, status)`, `crm_salary_profiles(org_id, staff_id)`.
   - Parallelize cascading requests on frontend with `Promise.all`.
7. **Unified Command Center Header**:
   - Create `src/components/crm/CRMCommandHeader.tsx` modeled after `CRMDashboard.tsx` header.
   - Standardize across all CRM sub-pages.
8. **CRM / POS Separation**:
   - Decouple CRM roles and permissions from POS store roles.
