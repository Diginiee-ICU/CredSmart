## 2026-10-26T20:19:24Z
You are Worker M1 implementing Backend Multi-Tenant Isolation & Staff Provisioning (Requirements R1, R5, R7) for CredSmart CRM Defects Elimination.

Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1_backend
Authoritative Request: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (MUST read section ## 2026-10-26T19:54:47Z before starting work!)
Project Scope: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_defects\PROJECT.md
Survey & Forensic Analysis Reports:
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_backend_crm\survey_backend_crm.md
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_backend_crm\handoff.md

Exclusive Write Ownership:
- `backend-api/fix_db.sql`
- `backend-api/src/routes/auth.js`
- `backend-api/src/middleware/auth.js`
- `backend-api/src/routes/settings.js`
- `backend-api/src/routes/crm.js`
- `backend-api/src/index.js`
- `backend-api/add_indexes.sql`
(Do NOT touch frontend files in this milestone).

Detailed Implementation Tasks:
1. `backend-api/fix_db.sql`:
   - Remove lines 130–148 (`CROSS JOIN` inserting rogue owner rows across all orgs).
   - Ensure clean database membership semantics.
2. `backend-api/src/routes/auth.js`:
   - Update `getUserPrimaryOrgId`: resolve primary org from user's explicit memberships, `organization_memberships`, or `crm_staff_assignments`.
   - Remove sorting by product count (`COUNT(*) FROM products DESC`).
   - Remove fallback that auto-inserts the user into the organization with the most products. If a user has no membership, return `null`.
   - In `POST /api/auth/login`: handle staff login so provisioned staff are bound strictly to their assigned organization (checking `crm_staff_assignments` if no `org_memberships` row exists).
3. `backend-api/src/middleware/auth.js`:
   - In catch block (lines 43–54): remove fallback selecting the organization with the most products in the entire database.
4. `backend-api/src/routes/settings.js`:
   - In `GET /api/profiles` and `GET /api/organization-memberships`: enforce `targetOrg` filtering. If `targetOrg` / `org_id` is missing or undefined, return an empty array `[]` instead of running `WHERE 1=1` and leaking all users across tenants.
5. `backend-api/src/routes/crm.js`:
   - Verify `POST /api/crm/staff/provision` saves passwords derived as `{firstName}123` (minimum 6 characters, hashed with bcrypt).
   - Ensure provisioned staff are authoritatively linked in `crm_staff_assignments` and `crm_staff_roles` scoped strictly to `org_id`.
   - Ensure `GET /api/crm/staff` strictly scopes to `org_id` and never leaks foreign staff.
6. `backend-api/src/index.js`:
   - Expand the 10-second micro-cache (`CACHE_TTL_MS = 10000`) to cover `/rest/v1/*` read requests in addition to `/api/`.
   - Segregate CRM vs POS cache keys on mutation so POS operations do not needlessly invalidate CRM cache and vice versa.
7. `backend-api/add_indexes.sql`:
   - Add composite B-Tree indexes:
     - `CREATE INDEX IF NOT EXISTS idx_crm_staff_assignments_org_user ON crm_staff_assignments(org_id, user_id);`
     - `CREATE INDEX IF NOT EXISTS idx_staff_tasks_org_status ON staff_tasks(org_id, status);`
     - `CREATE INDEX IF NOT EXISTS idx_crm_salary_profiles_org_staff ON crm_salary_profiles(org_id, staff_id);`
8. Verification:
   - Run tests using `cmd /c npx vitest run src/test/crmTenantIsolation.test.ts src/test/fixDbSchema.test.ts src/test/crmBackendApiM1.test.ts`
   - Run `cmd /c npx tsc --noEmit` to verify typecheck.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Output Requirements:
- Write detailed implementation log in `progress.md`.
- Run tests and record test output.
- Write completion report in `handoff.md`.
- Send message back to orchestrator.
