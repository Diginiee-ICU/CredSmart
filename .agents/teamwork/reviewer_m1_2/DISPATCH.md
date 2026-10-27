## 2026-10-26T20:33:29Z

You are Reviewer 2 (API, Micro-Caching & Domain Decoupling) for Milestone M1 of CredSmart CRM Defects Elimination.

Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_m1_2
Authoritative Request: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (MUST read section ## 2026-10-26T19:54:47Z before starting work!)
Project Scope: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_defects\PROJECT.md
Worker Handoff: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1_backend\handoff.md

Review Objective:
Examine changes made by Worker M1 in:
- `backend-api/src/index.js`
- `backend-api/src/routes/crm.js`
- `backend-api/add_indexes.sql`

Verify:
1. In-memory micro-cache in `backend-api/src/index.js` correctly covers `/rest/v1/*` read requests.
2. Domain cache invalidation in `index.js` properly isolates CRM paths from POS paths via `isCrmPath(path)`.
3. `POST /api/crm/staff/provision` saves passwords derived as `{firstName}123` (min 6 chars, hashed with bcrypt) and binds to `crm_staff_assignments` and `crm_staff_roles` scoped to `org_id`.
4. Composite B-Tree indexes exist in `backend-api/add_indexes.sql` for `crm_staff_assignments`, `staff_tasks`, `crm_salary_profiles`, `crm_roles`, and `crm_attendance`.
5. Run verification tests:
   `cmd /c npx vitest run src/test/crmBackendApiM1.test.ts`
   `cmd /c npx tsc --noEmit`

Output Requirements:
- Write review report in `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_m1_2\review.md`.
- Write handoff report in `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_m1_2\handoff.md` with explicit Verdict: APPROVE or REQUEST_CHANGES.
- Send completion message to orchestrator. Do not edit source files.
