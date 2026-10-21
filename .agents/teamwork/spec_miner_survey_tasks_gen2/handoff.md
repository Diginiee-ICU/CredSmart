# Handoff Report: Enterprise CRM Task Management & Testing Architecture

**Date**: 2026-10-21T18:45:00Z  
**Agent**: Spec Miner & Task Management Architecture Explorer (`spec_miner_survey_tasks_gen2`)  
**Parent Agent**: `c838af97-21de-4616-9188-f0f8dfa904c9`  
**Working Directory**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\spec_miner_survey_tasks_gen2`  
**Report Artifact**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\spec_miner_survey_tasks_gen2\report.md`  

---

## 1. Observation

1. **`src/pages/crm/Tasks.tsx` (Lines 138–170)**:
   The component currently operates in isolation from the backend:
   ```typescript
   const [tasks, setTasks] = useState<CRMTask[]>(() => {
     try {
       const saved = localStorage.getItem(storageKey);
       if (saved) return JSON.parse(saved);
     } catch {
       // Fallback
     }
     return INITIAL_TASKS;
   });
   ```
   No `apiClient`, `crmApi`, or `fetch` calls are made. It reads and writes exclusively to `localStorage` key `credsmart_crm_tasks_${orgId || "default"}`.

2. **`src/pages/crm/Tasks.tsx` (Lines 728–738)**:
   The assignee input in `<CreateTaskDialog>` is a free-text input rather than a picker from organization staff:
   ```tsx
   <div className="space-y-1">
     <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
       Assignee
     </label>
     <Input
       placeholder="Staff member name..."
       value={newAssignee}
       onChange={(e) => setNewAssignee(e.target.value)}
       className="text-xs h-9"
     />
   </div>
   ```

3. **`src/pages/crm/Tasks.tsx` (Lines 194–264, 600–638)**:
   The current state transitions in the UI allow:
   - `todo` -> `in_progress` (via `handleMoveStatus(row.id, "in_progress")`)
   - `in_progress` -> `review` (via `handleSubmitProof()`, setting `proof_notes`)
   - `review` -> `done` (via `handleMoveStatus(row.id, "done")`, gated by `canApprove`)
   There is **no revision request mechanism** in the UI: once a task is in `review`, a manager can only click "Approve". There is no button or dialog to send the task back to `in_progress` with revision notes.

4. **`src/services/crmApi.ts` (Lines 1–617)**:
   Methods exist for roles, permissions, geolocations, attendance, salary profiles, payroll runs, payslips, and dashboard counts. However, **zero task methods** exist. Neither `getCRMTasks`, `createCRMTask`, `updateCRMTask`, `transitionCRMTaskStatus`, nor `deleteCRMTask` are defined or exported.

5. **`backend-api/src/routes/crm.js` (Lines 322–347)**:
   ```javascript
   // GET /api/crm/tasks
   router.get('/tasks', async (req, res) => {
     try {
       const orgId = req.orgId || req.query.org_id;
       const result = await pool.query('SELECT * FROM staff_tasks WHERE org_id = $1 ORDER BY created_at DESC', [orgId]);
       return res.json(result.rows);
     } catch (err) {
       return res.status(500).json({ error: err.message });
     }
   });

   // POST /api/crm/tasks
   router.post('/tasks', async (req, res) => {
     try {
       const orgId = req.orgId || req.query.org_id;
       const { assigned_to, title, description, due_date, priority = 'medium' } = req.body;
       const result = await pool.query(
         `INSERT INTO staff_tasks (org_id, assigned_to, assigned_by, title, description, due_date, priority)
          VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
         [orgId, assigned_to, req.user?.id, title, description, due_date, priority]
       );
       return res.status(201).json(result.rows[0]);
     } catch (err) {
       return res.status(500).json({ error: err.message });
     }
   });
   ```
   The backend lacks:
   - User joins to return `assignee_name`, `assignee_email`, `assignee_avatar`, or `creator_name`.
   - Update and status transition routes (`PUT /api/crm/tasks/:id`, `PATCH /api/crm/tasks/:id/status`).
   - Fields for `requires_proof`, `proof_notes`, `revision_notes`, `approved_by`, and `completed_at`.

6. **`backend-api/schema.sql` (Lines 484–496)**:
   `staff_tasks` table is defined as:
   ```sql
   CREATE TABLE IF NOT EXISTS staff_tasks (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
       assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
       assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
       title VARCHAR(255) NOT NULL,
       description TEXT,
       due_date DATE,
       status VARCHAR(50) DEFAULT 'pending',
       priority VARCHAR(20) DEFAULT 'medium',
       created_at TIMESTAMPTZ DEFAULT NOW(),
       updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

7. **Vitest Verification Tool Execution**:
   Executing `cmd /c npx vitest run src/test/crmSubmodules.test.tsx` passed 11/11 tests cleanly in 3.86s, verifying that the current test setup (`@testing-library/react`, `jsdom`, `vitest.config.ts`) is functional.

---

## 2. Logic Chain

1. From Observation 1 and 2, `Tasks.tsx` is currently an unbacked client-side prototype relying on `INITIAL_TASKS` and `localStorage`, with untyped manual assignee string entry. Therefore, production usage requires integrating `Tasks.tsx` with `crmApi` and real organization staff fetched from `settingsApi.getMemberships(orgId)` or `/api/crm/staff`.
2. From Observation 3, the user specification requires bidirectional managerial review (`review` -> `done` on approval, or `review` -> `in_progress` on revision request). The absence of a revision request flow means staff cannot receive corrective feedback or iterate on submitted work.
3. From Observation 4 and 5, while the frontend needs to communicate via `crmApi`, the methods do not yet exist, and the backend routes in `backend-api/src/routes/crm.js` are missing status mutation logic and user profile joins.
4. From Observation 6, the PostgreSQL schema for `staff_tasks` lacks the columns (`requires_proof`, `proof_notes`, `revision_notes`, `approved_by`, `completed_at`, `organization_id`) required to persist the full lifecycle state machine.
5. From Observation 7, the existing Vitest and testing library configuration provides high-performance testing primitives. A 4-tier testing hierarchy (Unit logic -> Component rendering -> Service mock interceptors -> E2E lifecycle scenarios) can be implemented without adding new test frameworks.

---

## 3. Caveats

- **Backend Runtime Environment**: The live PostgreSQL instance runs on an Ubuntu server target (`woodzire@credsmart:~/server`). Database schema migrations must use idempotent `ALTER TABLE ADD COLUMN IF NOT EXISTS` commands to prevent disrupting live data.
- **Offline / Transient Fallback**: To prevent app crashes during backend restarts or intermittent connectivity, the frontend must preserve the `localStorage` caching pattern as a graceful fallback while prioritizing live API calls.
- **No Caveats Beyond Above**: All other requirements and component contracts are fully identified and specified.

---

## 4. Conclusion

The architectural plan for CredSmart Enterprise Task Management is fully discovered and documented in `report.md`. To achieve production readiness:
1. Expand the `staff_tasks` table with columns for `requires_proof`, `proof_notes`, `revision_notes`, `approved_by`, `completed_at`, and `organization_id`.
2. Enrich `backend-api/src/routes/crm.js` with joined user metadata on `GET /api/crm/tasks` and implement status transitions on `PATCH /api/crm/tasks/:id/status`.
3. Add `CRMTask` and corresponding API methods to `src/services/crmApi.ts`.
4. Update `src/pages/crm/Tasks.tsx` to:
   - Fetch tasks from `crmApi.getCRMTasks()`.
   - Populate assignee selector from real org staff.
   - Implement the Manager Revision Request dialog and card badge.
   - Enable matching contextual action triggers in Table view.
5. Implement the 4-tier test architecture covering state machine invariants, UI modals, API mock interceptors, and complete lifecycle traversal with RBAC boundaries.

---

## 5. Verification Method

To independently verify this survey and specification:
1. **Inspect Report**: Read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\spec_miner_survey_tasks_gen2\report.md` to review the discovered features, edge cases, state machine diagram, and API contracts.
2. **Inspect Source Files**:
   - `src/pages/crm/Tasks.tsx` lines 76–127 (mock initial tasks) and lines 728–738 (unbound assignee input).
   - `src/services/crmApi.ts` (absence of task methods).
   - `backend-api/src/routes/crm.js` lines 322–348 (basic task routes without joins or status transitions).
   - `backend-api/schema.sql` lines 484–496 (current `staff_tasks` table).
3. **Run Test Suites**:
   - Run `cmd /c npx vitest run src/test/crmSubmodules.test.tsx` to verify existing baseline test execution.
   - Run `cmd /c npx tsc --noEmit` to verify TypeScript compile integrity.
