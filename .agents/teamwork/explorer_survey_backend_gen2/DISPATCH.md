# Survey Task: Backend API & PostgreSQL Schema

## Objectives
Investigate the authoritative backend implementation and database schema for CredSmart CRM:
1. `backend-api/src/routes/crm.js`, `backend-api/src/routes/auth.js`, `backend-api/src/routes/settings.js`, `backend-api/src/server.js`.
2. Supabase / PostgreSQL migrations in `supabase/migrations/` and any database schemas.
3. Examine existing tables and schemas: `users`, `org_memberships`, `crm_roles`, `crm_permissions`, `crm_staff_roles`, and check if `staff_tasks` exists or needs migration.
4. Detail the exact design for:
   - Staff User Provisioning endpoint in `backend-api/src/routes/crm.js` (e.g. `POST /api/crm/staff/provision`): bcrypt password hashing, atomic insert into `users`, `org_memberships`, and `crm_staff_roles`. Check how `/api/auth/login` verifies passwords so newly provisioned users can log in immediately.
   - Staff listing endpoint for task assignees (e.g. `GET /api/crm/staff` or existing members endpoint).
   - Task management endpoints in `backend-api/src/routes/crm.js`: `GET /api/crm/tasks`, `POST /api/crm/tasks`, `PATCH /api/crm/tasks/:id`.
   - Idempotent SQL migration for `staff_tasks` table and any required columns/indexes.
5. Identify any potential breaking changes or conflicts.

## Output
Write your comprehensive investigation report to:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_backend_gen2\report.md`

## 2026-10-21T17:58:00Z
You are the Backend & DB Explorer for the CredSmart Enterprise CRM Staff Provisioning & Task Management project.

MANDATORY: Read c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (specifically timestamp 2026-10-21T17:42:42Z) before starting work.
Also read your task dispatch at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_backend_gen2\DISPATCH.md.

Your Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_backend_gen2
Investigate:
1. `backend-api/src/routes/crm.js`, `backend-api/src/routes/auth.js`, `backend-api/src/routes/settings.js`, `backend-api/src/server.js`.
2. Supabase / PostgreSQL migrations in `supabase/migrations/` and database schemas.
3. Tables: `users`, `org_memberships`, `crm_roles`, `crm_permissions`, `crm_staff_roles`, and check if `staff_tasks` exists or needs migration.
4. Detail the backend routes and SQL schema needed for:
   - Staff user provisioning (atomic user registration with bcrypt hash, org membership, CRM role assignment). Verify how `/api/auth/login` checks passwords so new users can authenticate immediately.
   - Staff listing for assignees.
   - Tasks CRUD & lifecycle endpoints: `GET /api/crm/tasks`, `POST /api/crm/tasks`, `PATCH /api/crm/tasks/:id`.
   - Idempotent migration for `staff_tasks`.

Write your full findings to:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_backend_gen2\report.md`
and write your `handoff.md` in your directory.
Send your completion message back to parent when finished.
