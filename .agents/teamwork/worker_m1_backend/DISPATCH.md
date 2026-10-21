# Task: Milestone 1 — PostgreSQL Schema & Express Backend Integration

## Objectives
Implement the complete backend database migrations, Express API routes, and frontend API client methods for Staff User Provisioning and Task Management:

1. **Database Migrations**:
   - `supabase/migrations/20261021180000_create_crm_staff_tasks.sql`:
     - Safe `CREATE TABLE IF NOT EXISTS public.staff_tasks` with columns:
       - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
       - `org_id UUID REFERENCES organizations(id) ON DELETE CASCADE`
       - `organization_id UUID` (dual-sync trigger)
       - `assigned_to UUID REFERENCES users(id) ON DELETE SET NULL`
       - `assigned_by UUID REFERENCES users(id) ON DELETE SET NULL`
       - `title VARCHAR(255) NOT NULL`
       - `description TEXT`
       - `due_date DATE`
       - `status VARCHAR(50) DEFAULT 'todo'` (support `todo`, `in_progress`, `review`, `done`)
       - `priority VARCHAR(20) DEFAULT 'normal'` (support `urgent`, `high`, `normal`, `low`)
       - `requires_proof BOOLEAN DEFAULT false`
       - `proof_notes TEXT`
       - `completed_at TIMESTAMPTZ`
       - `approved_by UUID REFERENCES users(id) ON DELETE SET NULL`
       - `approved_at TIMESTAMPTZ`
       - `review_feedback TEXT`
       - `created_at TIMESTAMPTZ DEFAULT NOW()`
       - `updated_at TIMESTAMPTZ DEFAULT NOW()`
     - Add `ALTER TABLE public.staff_tasks ADD COLUMN IF NOT EXISTS ...` for existing databases.
     - Add indexes: `idx_staff_tasks_org_id`, `idx_staff_tasks_assigned_to`, `idx_staff_tasks_status`.
     - Update `fix_db.sql` so server target stays in sync.

2. **Backend API Routes (`backend-api/src/routes/crm.js`)**:
   - `POST /api/crm/staff/provision`:
     - Accepts: `full_name`, `email`, `phone`, `password`, `store_role`, `crm_role_id`.
     - Uses atomic transaction (`BEGIN ... COMMIT`).
     - Checks if user exists in `users` by email. If not, hashes `password` with bcrypt (10 rounds) and inserts into `users`. If exists, verifies/updates phone/name.
     - Inserts or ignores `org_memberships` record for `(user_id, org_id)`.
     - If `crm_role_id` provided, upserts into `crm_staff_assignments` and `crm_staff_roles`.
     - Returns HTTP 201 with `{ user: { id, email, full_name, phone, store_role, crm_role_id, crm_role_name, crm_role_color }, credentials: { email, password } }`.
   - `GET /api/crm/staff` and `/api/crm/staff-roles`:
     - Query `org_memberships` left joined with `users` and `crm_staff_roles` / `crm_roles` so all organization members are returned.
   - `GET /api/crm/tasks`:
     - Filter by `org_id`, with optional query params `status`, `priority`, `assigned_to`.
     - Join with `users` for `assignee_name`, `assignee_avatar`, `creator_name`, `approver_name`.
   - `POST /api/crm/tasks`:
     - Inserts task with title, description, priority, due_date, requires_proof, assigned_to, assigned_by.
   - `PATCH /api/crm/tasks/:id`:
     - Handles field updates and status transitions.
     - When status -> `review`: persists `proof_notes`.
     - When status -> `done`: sets `completed_at = NOW()`, `approved_by = req.user?.id`, `approved_at = NOW()`.
     - When status -> `in_progress` (revision request): persists `review_feedback`.
   - `DELETE /api/crm/tasks/:id`:
     - Deletes task scoped to `org_id`.

3. **Frontend API Client Methods (`src/services/crmApi.ts`)**:
   - Export typed methods:
     - `provisionStaffUser(payload: ProvisionStaffPayload): Promise<ApiResponse<ProvisionStaffResponse>>`
     - `getCRMTasks(orgId: string, filters?: CRMTaskFilters): Promise<ApiResponse<CRMTask[]>>`
     - `createCRMTask(payload: CreateCRMTaskPayload): Promise<ApiResponse<CRMTask>>`
     - `updateCRMTask(id: string, payload: Partial<CreateCRMTaskPayload>): Promise<ApiResponse<CRMTask>>`
     - `transitionCRMTaskStatus(id: string, status: CRMTaskStatus, details?: { proof_notes?: string; review_feedback?: string }): Promise<ApiResponse<CRMTask>>`
     - `deleteCRMTask(id: string): Promise<ApiResponse<{ success: boolean }>>`
   - Zero `any` types. Full TypeScript interface coverage.

4. **Verification**:
   - Run `cmd /c npx tsc --noEmit` to verify zero TypeScript errors.
   - Run existing tests to ensure zero regressions.

Write ownership:
- You own: `backend-api/src/routes/crm.js`, `supabase/migrations/20261021180000_create_crm_staff_tasks.sql`, `fix_db.sql`, `src/services/crmApi.ts`.
- DO NOT touch: `MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, or any billing modals.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.


## 2026-10-21T18:20:01Z
[Message from parent c838af97-21de-4616-9188-f0f8dfa904c9]
Implementation Worker for Milestone 1: PostgreSQL Schema & Express Backend Integration for CredSmart Enterprise CRM.
Tasks:
1. Create supabase/migrations/20261021180000_create_crm_staff_tasks.sql and keep fix_db.sql synchronized.
2. In backend-api/src/routes/crm.js: POST /api/crm/staff/provision, refactor GET /api/crm/staff & /api/crm/staff-roles, enrich GET /api/crm/tasks, implement POST /api/crm/tasks, PATCH /api/crm/tasks/:id, DELETE /api/crm/tasks/:id.
3. In src/services/crmApi.ts: Export typed methods: provisionStaffUser, getCRMTasks, createCRMTask, updateCRMTask, transitionCRMTaskStatus, deleteCRMTask. Zero any.
4. Verify with cmd /c npx tsc --noEmit and existing test suites.
