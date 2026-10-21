# Dispatch: Survey - Backend API & Database Architecture

## Objective
Investigate the backend API (`backend-api/`) and database structure regarding CRM routes, task management, user provisioning, authentication, and database schemas.

## Authoritative Inputs
- Read `ORIGINAL_REQUEST.md`: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (see timestamp `2026-10-21T17:42:42Z`)
- Skill guide: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\crm-rbac-skill\SKILL.md`
- Backend code: `backend-api/src/routes/crm.js`, `backend-api/src/routes/auth.js`, `backend-api/src/index.js`, database pool/connection files, `supabase/migrations/`

## Investigation Scope
1. How does `backend-api/` handle authentication, session validation, organization isolation, and bcrypt password hashing?
2. Does `backend-api/src/routes/crm.js` already exist? What endpoints exist or need to be implemented for:
   - Staff user provisioning (registering user, password hashing with bcrypt, inserting into `users`, `org_memberships`, `crm_staff_roles` or `crm_staff_assignments`)
   - Task CRUD: `GET /api/crm/tasks`, `POST /api/crm/tasks`, `PUT /api/crm/tasks/:id`, transitions (`todo`, `in_progress`, `review`, `done`), proof submission, manager approvals/revisions
   - Staff list for task assignees (fetching real org staff members)
3. What is the database schema status? What migrations exist in `supabase/migrations/` or `backend-api/`? What tables (`staff_tasks`, `users`, `org_memberships`, `crm_staff_assignments` / `crm_staff_roles`) exist or need migrations?
4. Document exact endpoint signatures, request payloads, response shapes, error handling, and SQL schema recommendations.

## Output
Write your comprehensive survey report to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_backend\survey_report.md` and complete your handoff.
