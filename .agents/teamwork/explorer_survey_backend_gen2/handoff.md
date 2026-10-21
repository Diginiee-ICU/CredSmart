# Handoff Report: Backend API & Database Survey

**Project**: Staff User Provisioning & Enterprise Task Management  
**Timestamp**: 2026-10-21T18:25:00Z  
**Author**: Backend & DB Explorer (`explorer_survey_backend_gen2`)  
**Recipient**: Parent Orchestrator (`c838af97-21de-4616-9188-f0f8dfa904c9`) & Implementation Agents  
**Report File**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_backend_gen2\report.md`

---

## 1. Observation

1. **Authentication Flow (`backend-api/src/routes/auth.js:135–191`)**:
   - `POST /api/auth/login` looks up the user by email in `public.users`:
     ```javascript
     const userRes = await pool.query(
       `SELECT id, email, password_hash, full_name, phone, avatar_url, created_at
        FROM users WHERE email = $1`,
       [email.toLowerCase().trim()]
     );
     const passwordMatch = await bcrypt.compare(password, user.password_hash);
     ```
   - Primary organization lookup is resolved directly via `getUserPrimaryOrgId(user.id)` querying `org_memberships` / `organization_memberships`.
   - Access and refresh JWT tokens are generated with `{ id: user.id, email: user.email, orgId }`.
   - **Verification**: New users registered directly in `users` with `bcrypt.hash(password, 10)` and a corresponding record in `org_memberships` authenticate immediately without requiring external email validation.

2. **Server Architecture & Caching (`backend-api/src/index.js:64–103, 126–135`)**:
   - Express mounts `/api/auth`, `/api/crm`, `/api` (for settings, parties, invoices), and `/` (for rpc, upload).
   - In-memory cache `apiCache` caches `GET /api/*` for 10 seconds, but lines 69–79 invalidate the cache for that organization on any `POST`, `PUT`, `PATCH`, or `DELETE` request.

3. **Existing CRM Routes (`backend-api/src/routes/crm.js`)**:
   - `GET /api/crm/roles`, `POST /api/crm/roles`, `DELETE /api/crm/roles/:id` (lines 10–70).
   - `GET /api/crm/staff` (lines 74–92): Only performs `JOIN crm_staff_assignments sa JOIN users u`, which omits organization members who have not been explicitly assigned a custom CRM role.
   - `GET /api/crm/tasks` (lines 323–331) and `POST /api/crm/tasks` (lines 333–347): Prototype implementations returning raw table columns without joining `users` for `assignee_name`, and lacks `PATCH /api/crm/tasks/:id`.
   - There is NO route for `POST /api/crm/staff/provision` or `/api/crm/staff-roles`.

4. **Database Schemas & Migrations**:
   - `staff_tasks` table is defined in `backend-api/schema.sql:484–496` and `fix_db.sql:1068–1079`, but does NOT exist in `supabase/migrations/`.
   - In `backend-api/schema.sql` and `fix_db.sql`, `staff_tasks` has `status VARCHAR(50) DEFAULT 'pending'` and lacks columns `requires_proof`, `proof_required`, `proof_notes`, `completed_at`, `approved_by`, `approved_at`, and `review_feedback`.
   - In `src/pages/crm/Tasks.tsx:57–74`, the frontend `CRMTask` interface expects statuses `todo`, `in_progress`, `review`, `done`, priorities `urgent`, `high`, `normal`, `low`, and proof fields.
   - Dual-table relationship between `crm_staff_assignments` and `crm_staff_roles` exists in `fix_db.sql:833–856`.

---

## 2. Logic Chain

1. **Staff Provisioning Immediate Auth**:
   - Because `POST /api/auth/login` verifies credentials by matching `bcrypt.compare(password, user.password_hash)` against `users` and looks up `org_memberships`, inserting the user and membership inside an atomic SQL transaction with bcrypt hashing (10 salt rounds) guarantees that the user can log in immediately with the returned credentials.

2. **Staff Assignee Visibility**:
   - The task creation modal requires a list of all possible assignees. Because some staff members only exist in `org_memberships` with a store role (`salesman`, `cashier`, `staff`) without a custom CRM role, querying `crm_staff_assignments` directly drops them.
   - By querying `org_memberships` first and `LEFT JOIN`ing `crm_staff_assignments`, `crm_staff_roles`, and `crm_roles`, 100% of staff members will be visible in the assignee picker with their designated roles.

3. **Task Lifecycle Support**:
   - To support the full Kanban lifecycle (`todo` → `in_progress` → `review` → `done`), `PATCH /api/crm/tasks/:id` must handle:
     - Transition to `review`: stores `proof_notes`.
     - Transition to `done`: sets `completed_at = NOW()`, `approved_by = req.user.id`, `approved_at = NOW()`.
     - Revision requests: updates `review_feedback` and resets status to `in_progress` or `todo`.
   - Returning enriched responses with joined `assignee_name`, `creator_name`, and `approver_name` satisfies the frontend contract without requiring multiple client-side requests.

4. **Zero-Regression Migration**:
   - Old records may have status `'pending'`. Updating `'pending'` to `'todo'` and mapping `'medium'` to `'normal'` prevents existing tasks from disappearing from Kanban columns.
   - Creating an idempotent migration file `supabase/migrations/20261021180000_create_crm_staff_tasks.sql` and keeping `fix_db.sql` synchronized preserves compliance with `src/test/fixDbSchema.test.ts`.

---

## 3. Caveats

1. **Email Uniqueness Across Organizations**:
   - If an employee's email is already registered under another store/organization in `users`, `POST /api/crm/staff/provision` attaches the existing user to the new organization in `org_memberships` rather than throwing a duplicate email collision.
2. **Offline LocalStorage vs Cloud API**:
   - `Tasks.tsx` currently has a fallback to `localStorage`. When the frontend is wired to `crmApi.getCRMTasks()`, it should gracefully fall back to cached data if offline, mirroring the pattern in `RoleManagement.tsx`.

---

## 4. Conclusion

1. Implement `POST /api/crm/staff/provision` in `backend-api/src/routes/crm.js` using the provided atomic transaction code.
2. Refactor `GET /api/crm/staff` and alias `/api/crm/staff-roles` in `backend-api/src/routes/crm.js` to query all organization members from `org_memberships` left-joined with CRM roles.
3. Replace the prototype task handlers in `backend-api/src/routes/crm.js` with the enriched `GET /api/crm/tasks`, `POST /api/crm/tasks`, and new `PATCH /api/crm/tasks/:id`.
4. Apply the idempotent migration `20261021180000_create_crm_staff_tasks.sql` to both `supabase/migrations/` and `fix_db.sql`.

---

## 5. Verification Method

1. **TypeScript Compilation**:
   ```bash
   cmd /c npx tsc --noEmit
   ```
   Must exit with code 0 without any type errors in CRM or settings files.

2. **Schema & Migration Integrity Tests**:
   ```bash
   cmd /c npx vitest run src/test/fixDbSchema.test.ts
   ```
   Verifies all 42 tenant-scoped tables, trigger functions, and index definitions pass.

3. **Backend API Route Testing via Curl/Vitest**:
   - `POST /api/crm/staff/provision`: Provision user `test.staff@credsmart.test` with role `salesman` and verify HTTP 201 with credentials returned.
   - `POST /api/auth/login`: Authenticate with `test.staff@credsmart.test` and verify valid JWT token returned.
   - `GET /api/crm/staff`: Verify provisioned user appears in staff list.
   - `POST /api/crm/tasks`: Create task assigned to user and verify HTTP 201.
   - `PATCH /api/crm/tasks/:id`: Move status to `review` with proof notes, then approve to `done` and verify `completed_at` and `approved_by` are set.
