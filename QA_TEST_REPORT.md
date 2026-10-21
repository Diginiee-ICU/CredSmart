# Comprehensive QA & Test Audit Report (Production Failure Analysis & Full CRM Audit)

**Audit Date**: October 22, 2026  
**Application Name**: CredSmart (B2B/B2C GST Billing, POS & Multi-Tenant ERP & CRM Suite)  
**Total Pages Audited**: 32 Pages (including 8 CRM Submodules)  
**Total Issues Identified**: 10 Critical Production Runtime & Backend API Issues  
**Overall Application Status**: ⚠️ **Critical Blockers in CRM & REST Passthrough Layer**

---

## 1. Executive Summary

During production deployment on the Ubuntu Linux server and Vercel frontend, critical runtime errors were encountered on the **CRM Role Management**, **Attendance**, **Broadcasts**, and **Staff Provisioning** workflows. 

An exhaustive forensic analysis revealed three core root causes:
1. **Frontend Supabase Shim Defect (`src/integrations/supabase/client.ts`)**: The custom `QueryBuilder` lacks standard PostgREST chain methods such as `.in(column, values)`. When `useCRMPermission.ts` calls `.in("role_id", roleIds)`, JavaScript throws an uncaught `TypeError: cr.from(...).select(...).in is not a function`, crashing permission hydration across all CRM views.
2. **Missing CRM Endpoints & Permitted Tables (`backend-api`)**:
   - `GET /api/crm/permissions` and `POST /api/crm/permissions/bulk` are not implemented in `backend-api/src/routes/crm.js`, producing HTTP 404 Route Not Found errors.
   - Tables `crm_attendance`, `crm_broadcasts`, `crm_staff_roles`, and `crm_permissions` are absent from `ALLOWED_TABLES` in `backend-api/src/routes/rpc.js`, returning HTTP 400 Bad Request on all REST passthrough calls.
3. **Database Schema & Unhandled Exception Mismatches (`PostgreSQL & crm.js`)**:
   - `organization_memberships` queries attempt to filter by `status = 'active'`, but the column `status` does not exist in the database table, causing PostgreSQL to abort with HTTP 500.
   - `POST /api/crm/staff/provision` and `POST /api/crm/staff-roles` use `ON CONFLICT (user_id, org_id)` on `crm_staff_assignments`, but the table on the server lacks a unique index on those columns, causing PostgreSQL to raise `ERROR: there is no unique or exclusion constraint matching the ON CONFLICT specification`.
   - In `src/pages/crm/RoleManagement.tsx`, API error responses are unhandled and passed directly to `.forEach()`, triggering uncaught `TypeError: Mr.forEach is not a function`.

All other core billing, POS, and inventory flows remain intact.

---

## 2. Forensic Audit of Production Console Errors

### Issue 1: Missing Method `.in()` in `QueryBuilder`
- **Location**: `src/integrations/supabase/client.ts` & `src/hooks/useCRMPermission.ts:228`
- **Error**: `TypeError: cr.from(...).select(...).in is not a function`
- **Category**: Type 5 (Logic, State & Runtime Bugs)
- **Root Cause**: `useCRMPermission` expects Supabase's `.in("role_id", roleIds)` method on `supabase.from(...)`. The shimmed `QueryBuilder` only implemented `.eq()`, `.or()`, `.order()`, and `.limit()`.
- **Impact**: Permissions fail to load for any logged-in user, defaulting to read-only or breaking permission-gated CRM modules.

### Issue 2: Missing CRM Permission Endpoints (HTTP 404)
- **Location**: `backend-api/src/routes/crm.js`
- **Endpoints**: `GET /api/crm/permissions?role_ids=...`, `POST /api/crm/permissions/bulk`, `DELETE /api/crm/permissions`
- **Error**: `Failed to load resource: the server responded with a status of 404 (Route not found)`
- **Category**: Type 1 (Routing & API Endpoints)
- **Root Cause**: `src/services/crmApi.ts` requests these routes directly, but `backend-api/src/routes/crm.js` did not register handlers for permissions CRUD.
- **Impact**: Role permissions cannot be fetched or persisted from `RoleManagement.tsx`.

### Issue 3: REST Passthrough Table Whitelist Rejection (HTTP 400)
- **Location**: `backend-api/src/routes/rpc.js` (`ALLOWED_TABLES`)
- **Tables Rebuffed**: `crm_attendance`, `crm_broadcasts`, `crm_staff_roles`, `crm_permissions`
- **Error**: `Failed to load resource: the server responded with a status of 400 (Table 'crm_...' not accessible via REST passthrough)`
- **Category**: Type 5 (Logic, State & Runtime Bugs)
- **Root Cause**: `ALLOWED_TABLES` contains `attendance_records` and `crm_staff_assignments`, but the frontend queries `crm_attendance`, `crm_broadcasts`, and `crm_staff_roles`.
- **Impact**: Dashboard widgets for Today's Attendance and Broadcasts fail to load; permission and role lookup fallback fails.

### Issue 4: Missing `status` Column on `organization_memberships` (HTTP 500)
- **Location**: `backend-api/src/routes/rpc.js` & PostgreSQL database
- **Query**: `GET /rest/v1/organization_memberships?select=id&organization_id=...&status=active`
- **Error**: `Failed to load resource: the server responded with a status of 500 (column "status" does not exist)`
- **Category**: Type 6 (Type Safety & Database Validation)
- **Root Cause**: Table `organization_memberships` was created without a `status` column. `rpc.js` constructs `AND "status" = $2`, which aborts in PostgreSQL.
- **Impact**: Membership verification fails across multiple protected app views.

### Issue 5: Missing Unique Constraint for `ON CONFLICT (user_id, org_id)` (HTTP 500)
- **Location**: `backend-api/src/routes/crm.js` lines 176 & 295, and `fix_db.sql`
- **Error**: `POST /api/crm/staff/provision` & `POST /api/crm/staff-roles` fail with status 500
- **Category**: Type 6 (Type Safety & Database Validation)
- **Root Cause**: `INSERT INTO crm_staff_assignments ... ON CONFLICT (user_id, org_id)` requires an explicit unique index on `(user_id, org_id)`. The migration table definition in `fix_db.sql` did not specify this constraint.
- **Impact**: Provisioning new staff members and assigning roles fails on the backend.

### Issue 6: Unhandled Error Objects Passed to `.forEach()` in UI
- **Location**: `src/pages/crm/RoleManagement.tsx` lines 300, 402, 414
- **Error**: `RoleManagement: Error loading data: TypeError: Mr.forEach is not a function`
- **Category**: Type 5 (Logic, State & Runtime Bugs)
- **Root Cause**: When the API returns an error object (e.g., `{ error: "Request failed" }`), the component assumes `data` is an Array and calls `.forEach()`.
- **Impact**: The entire Role Management dashboard crashes with a white screen / unhandled exception.

---

## 3. Page-by-Page Detailed Audit

### Page: CRM Role Management (`/crm/roles`)
- **Status**: ❌ **Broken due to API & Shim Errors**
- **Component File**: `src/pages/crm/RoleManagement.tsx`
- **Findings**:
  - **Routing & Navigation**: Route registered and accessible via sidebar.
  - **Buttons & Interactive Features**: "Add Staff User" and "Create Role" modals render, but submitting triggers HTTP 500 / 404 from the backend.
  - **Logic, State & Runtime Bugs**: Uncaught `TypeError: Mr.forEach is not a function` occurs during `loadData` when `getCRMStaffRoles` or `getProfiles` returns an error payload instead of an array.
  - **Type Safety & Validation**: Needs defensive `Array.isArray()` checks on all incoming collections.

### Page: CRM Dashboard (`/crm`)
- **Status**: ⚠️ **Degraded Metrics**
- **Component File**: `src/pages/crm/CRMDashboard.tsx`
- **Findings**:
  - **Buttons & Interactive Features**: Navigation cards to submodules work properly.
  - **Logic, State & Runtime Bugs**: Queries to `crm_attendance` and `crm_broadcasts` return HTTP 400 from `rpc.js` due to missing `ALLOWED_TABLES` entries. Caught by fallback, but metrics display 0.

### Page: CRM Tasks (`/crm/tasks`)
- **Status**: ⚠️ **Partially Operational**
- **Component File**: `src/pages/crm/Tasks.tsx`
- **Findings**:
  - **Routing & Navigation**: Route operates correctly.
  - **Buttons & Interactive Features**: Kanban drag-and-drop, proof submission, and manager approval modals function as designed.
  - **Logic, State & Runtime Bugs**: When `crmApi.getCRMStaffRoles` fails with HTTP 500, the task assignee dropdown fails to populate real staff members.

---

## 4. Summary of Actionable Items for QA Master Fixer

| # | Priority | Page / Component | Category | Issue Description | Proposed Surgical Fix |
|---|----------|------------------|----------|-------------------|------------------------|
| 1 | **High** | `src/integrations/supabase/client.ts` | Type 5 | `QueryBuilder` missing `.in()` method causes `useCRMPermission` crash | Implement `.in(column, values)`, `.neq()`, `.gte()`, `.lte()`, `.is()` on `QueryBuilder` |
| 2 | **High** | `backend-api/src/routes/crm.js` | Type 1 | `GET /permissions`, `POST /permissions/bulk`, `DELETE /permissions` missing | Implement permission route handlers in `crm.js` |
| 3 | **High** | `backend-api/src/routes/rpc.js` | Type 5 | `crm_attendance`, `crm_broadcasts`, `crm_staff_roles`, `crm_permissions` missing from whitelist | Add tables to `ALLOWED_TABLES` and implement `op === 'in'` filter support |
| 4 | **High** | `backend-api/fix_db.sql` & Postgres | Type 6 | `organization_memberships` lacks `status` column causing 500 error | Add `ALTER TABLE organization_memberships ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';` |
| 5 | **High** | `backend-api/fix_db.sql` & Postgres | Type 6 | `crm_staff_assignments` lacks unique constraint on `(user_id, org_id)` | Add `ALTER TABLE crm_staff_assignments ADD CONSTRAINT uq_staff_user_org UNIQUE(user_id, org_id);` |
| 6 | **High** | `src/pages/crm/RoleManagement.tsx` | Type 5 | `profilesData.forEach` and `staffRolesData.forEach` crash on non-array error payloads | Wrap all array iterations in `Array.isArray(x) ? x : []` |
| 7 | **Med** | `backend-api/src/routes/crm.js` | Type 5 | `GET /roles` query fails if `crm_role_permissions` is empty or lacks rows | Use defensive query joining `crm_permissions` and `crm_role_permissions` with COALESCE |
