# Handoff Report: Milestone 1 — PostgreSQL Schema & Express Backend Integration

**Worker**: `worker_m1_backend`  
**Parent Agent**: `c838af97-21de-4616-9188-f0f8dfa904c9`  
**Timestamp**: 2026-10-22T00:06:30Z  
**Type**: Hard (Task Complete)

---

## 1. Observation

1. **Database Schema State**:
   - `staff_tasks` existed in `backend-api/schema.sql` and `fix_db.sql` with basic prototype columns (`title`, `description`, `assigned_to`, `due_date`, `status = 'pending'`, `priority = 'medium'`), but was absent from `supabase/migrations/` and lacked enterprise Kanban lifecycle columns (`requires_proof`, `proof_required`, `proof_notes`, `completed_at`, `approved_by`, `approved_at`, `review_feedback`).
   - `fixDbSchema.test.ts` (test 1.3) strictly enforces that `root fix_db.sql` and `backend-api/fix_db.sql` must be 100% byte-for-byte identical.
   - `crm_staff_assignments` in `fix_db.sql` previously only had `staff_id`, whereas `backend-api/src/routes/crm.js` wrote to `user_id`.

2. **Backend API State (`backend-api/src/routes/crm.js`)**:
   - `POST /api/crm/staff/provision` did not exist.
   - `GET /api/crm/staff` queried `crm_staff_assignments` directly, omitting any store employees who had not yet been assigned a CRM role. `/api/crm/staff-roles` was not exposed.
   - `GET /api/crm/tasks` performed a raw `SELECT * FROM staff_tasks` without joining user profile records (`assignee_name`, `creator_name`, `approver_name`), without filtering, and without mapping `assigned_to` as `assignee_id`.
   - `POST /api/crm/tasks` did not support proof requirements or return enriched fields.
   - `PATCH /api/crm/tasks/:id` and `DELETE /api/crm/tasks/:id` were absent.

3. **Frontend API Client State (`src/services/crmApi.ts`)**:
   - Role management, attendance, salary, and dashboard count methods existed, but typed methods and TypeScript interfaces for staff user provisioning and task lifecycle management were missing.

---

## 2. Logic Chain

1. **Schema & Migration Harmonization**:
   - Authored `supabase/migrations/20261021180000_create_crm_staff_tasks.sql` using idempotent DDL (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, RLS policies, and dual-sync trigger `trg_sync_org_ids`).
   - Added proof and approval columns: `requires_proof`, `proof_required`, `proof_notes`, `completed_at`, `approved_by`, `approved_at`, `review_feedback`.
   - Normalised legacy statuses and priorities (`pending` -> `todo`, `medium` -> `normal`).
   - Synchronized `user_id` and `staff_id` on `crm_staff_assignments`.
   - Updated `fix_db.sql` and copied it byte-for-byte to `backend-api/fix_db.sql`. Executing `npx vitest run src/test/fixDbSchema.test.ts` confirmed all 398 tests passed.

2. **Atomic Staff User Provisioning Endpoint**:
   - In `backend-api/src/routes/crm.js`, implemented `POST /api/crm/staff/provision` wrapped in a PostgreSQL client transaction (`BEGIN ... COMMIT`).
   - Validated email, password (min 6 chars), and full name.
   - Lowercased and trimmed email; checked for existing user in `users`.
   - If user exists in current org, returns HTTP 409 Conflict.
   - If new user, hashed password using `bcrypt.hash(password, 10)` and inserted into `public.users`.
   - Inserted into `public.org_memberships` and `public.organization_memberships` with the selected store role.
   - If `crm_role_id` provided, upserted into both `public.crm_staff_assignments` and `public.crm_staff_roles`.
   - Returns HTTP 201 with `{ user, credentials: { email, password } }`.

3. **Staff Roster Left-Join**:
   - Refactored `GET /api/crm/staff` and aliased `GET /api/crm/staff-roles` to query `org_memberships` / `organization_memberships` left-joined with `users`, `crm_staff_assignments`, `crm_staff_roles`, and `crm_roles`.
   - 100% of organization personnel are now returned and selectable as task assignees, whether or not a custom CRM role has been assigned yet.
   - Also implemented `POST` and `DELETE` on `/api/crm/staff-roles` for duality compatibility.

4. **Full Lifecycle Task Management Routes**:
   - Enriched `GET /api/crm/tasks` with left-joins on `users` (`assignee_name`, `assignee_email`, `assignee_avatar_url`, `creator_name`, `approver_name`), normalized `status` and `priority`, and implemented `status`, `priority`, `assigned_to`, and `search` query filters.
   - Implemented `POST /api/crm/tasks` with proof requirement options, priority normalization, due date parsing, and immediate return of enriched user details.
   - Implemented `PATCH /api/crm/tasks/:id` with state transition lifecycle automation:
     - `status === 'done'`: records `completed_at = NOW()`, `approved_by = req.user?.id`, `approved_at = NOW()`.
     - `status === 'review'`: records `proof_notes`.
     - `status === 'in_progress'` / `todo`: resets approval timestamps if reopening, persists `review_feedback` on manager revision request.
   - Implemented `DELETE /api/crm/tasks/:id` scoped to the active tenant.

5. **Type-Safe API Client (`src/services/crmApi.ts`)**:
   - Added strict TypeScript interfaces: `ProvisionStaffPayload`, `ProvisionStaffResponse`, `CRMTaskStatus`, `CRMTaskPriority`, `CRMTask`, `CRMTaskFilters`, `CreateCRMTaskPayload`. Zero `any` types.
   - Exported typed methods: `provisionStaffUser`, `getCRMTasks`, `createCRMTask`, `updateCRMTask`, `transitionCRMTaskStatus`, `deleteCRMTask`.
   - Attached methods to the exported `crmApi` namespace.

---

## 3. Caveats

- **Invoice Flow Invariance**: Untouched. No billing or POS files were inspected or altered (`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, etc. remain completely untouched).
- **Frontend UI Implementation**: The UI components (`RoleManagement.tsx` modals, `Tasks.tsx` Kanban/Table views) will be connected and enhanced in Milestones 2 & 3. All underlying backend routes, schemas, and typed API client methods are fully prepared and verified.

---

## 4. Conclusion

Milestone 1 is complete.
1. The database migration `supabase/migrations/20261021180000_create_crm_staff_tasks.sql` is created, and both `fix_db.sql` and `backend-api/fix_db.sql` are updated with 100% byte-for-byte parity.
2. The Express API routes in `backend-api/src/routes/crm.js` provide atomic staff provisioning with bcrypt password hashing, a unified staff directory, and complete CRUD with Kanban lifecycle state transitions for tasks.
3. The TypeScript client methods in `src/services/crmApi.ts` are fully typed with zero `any` types.
4. Static type checks (`npx tsc --noEmit`) and all 482 tests across 5 vitest suites pass cleanly with 0 errors.

---

## 5. Verification Method

To independently reproduce and verify this milestone:

1. **TypeScript Typecheck**:
   ```powershell
   cmd /c npx tsc --noEmit
   ```
   *Expected result*: Exits with code 0.

2. **Database Schema Parity & Migration Verification**:
   ```powershell
   cmd /c npx vitest run src/test/fixDbSchema.test.ts
   ```
   *Expected result*: 398/398 tests pass.

3. **Client API & Lifecycle Unit Tests**:
   ```powershell
   cmd /c npx vitest run src/test/crmBackendApiM1.test.ts src/test/crmStaffProvisioning.test.ts src/test/crmTaskLifecycle.test.ts
   ```
   *Expected result*: 72/72 tests pass.

4. **Integration Test Suite**:
   ```powershell
   cmd /c npx vitest run src/test/crmStaffTasksIntegration.test.tsx
   ```
   *Expected result*: 12/12 tests pass.

5. **Full Suite Execution**:
   ```powershell
   cmd /c npx vitest run src/test/crmBackendApiM1.test.ts src/test/crmStaffProvisioning.test.ts src/test/crmTaskLifecycle.test.ts src/test/crmStaffTasksIntegration.test.tsx src/test/fixDbSchema.test.ts
   ```
   *Expected result*: 482/482 tests pass.
