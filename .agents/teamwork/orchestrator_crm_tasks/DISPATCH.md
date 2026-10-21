# Orchestrator Dispatch: Staff User Provisioning & Enterprise Task Management

## Objective
Implement production-grade staff user provisioning & instant role assignment in CRM Role Management and complete the full-stack Enterprise Task Management system for multi-tenant company workflows.

## Source of Truth
- Verbatim User Request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (see timestamp `2026-10-21T17:42:42Z`)
- Working Directory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart`
- Orchestrator Working Directory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_tasks`

## Key Requirements & Scope
1. **R1. CRM Role Management: Staff User Provisioning & Instant Role Assignment**
   - Company owners and super-admins must be able to provision new staff user credentials (full name, email, generated/custom password, phone, store role) directly from the Role Management dashboard (`src/pages/crm/RoleManagement.tsx`).
   - The creation process must atomically register the user, establish organization membership, and assign the selected CRM role.
   - When creating a custom role, owners must be able to assign existing or newly created staff to that role in a single unified interaction.
   - After user creation, a credentials summary dialog must provide one-click copying of the login details (email and plaintext password).
   - Newly created user appears immediately in the staff list with assigned role badge and can authenticate via `/api/auth/login`.

2. **R2. Enterprise CRM Task Management System**
   - Connected to persistent database storage via Ubuntu backend API (`/api/crm/tasks`).
   - Support task creation with title, description, priority (`urgent`, `high`, `normal`, `low`), due date, proof requirements, and assignment to real organization staff members fetched from backend.
   - Interactive Kanban and Table views with complete lifecycle state transitions (`todo` -> `in_progress` -> `review` -> `done`).
   - Submission of proof notes when completing work.
   - Manager/owner approval or change requests on tasks in Review (recording `completed_at` and `approved_by`).
   - Accurate task metrics (Total, In Progress, Review, Completed, Completion Rate) calculated from backend data.

3. **R3. Backend API & PostgreSQL Schema Integration**
   - Authenticated Express endpoints in `backend-api/src/routes/crm.js` backed by PostgreSQL (`staff_tasks`, `users`, `org_memberships`, `crm_staff_assignments`).
   - Enforce organization isolation, password hashing with bcrypt, role-based permissions, and idempotent schema migrations.

4. **Strict Constraints & Quality Standards**
   - Zero regression on existing features.
   - Strictly preserve protected Create Invoice flows.
   - `npm run build` / `cmd /c npx tsc --noEmit` must pass with zero TypeScript errors.
   - All tests must pass cleanly.
   - Relevant skills: check `.agents/skills/crm-rbac-skill/SKILL.md` for RBAC conventions and DB schema.
