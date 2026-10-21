# Orchestrator Dispatch: Staff User Provisioning & Enterprise Task Management (Gen 2)

## Objective
Implement production-grade staff user provisioning & instant role assignment in CRM Role Management and complete the full-stack Enterprise Task Management system for multi-tenant company workflows.

## Source of Truth
- Verbatim User Request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (see timestamp `2026-10-21T17:42:42Z`)
- Working Directory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart`
- Orchestrator Working Directory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_tasks_gen2`

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

4. **Acceptance Criteria & Strict Constraints**
   - Zero regression on existing features.
   - Strictly preserve protected Create Invoice flows (`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`).
   - `npm run build` / `cmd /c npx tsc --noEmit` must pass cleanly with zero TypeScript errors.
   - All tests must pass cleanly.
   - Idempotent SQL schema migrations (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).
   - Consult relevant skills: `.agents/skills/crm-rbac-skill/SKILL.md`.


## 2026-10-21T17:51:59Z
You are the Project Orchestrator (Generation 2) for the CredSmart Enterprise CRM Staff Provisioning & Task Management project.

Your Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_tasks_gen2
Project Root: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart
Dispatch Specification: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_tasks_gen2\DISPATCH.md
Authoritative User Request: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (see timestamp 2026-10-21T17:42:42Z)

Mission:
Implement production-grade staff user provisioning & instant role assignment in CRM Role Management and complete the full-stack Enterprise Task Management system for multi-tenant company workflows.

Key Deliverables:
1. Staff User Provisioning & Instant Role Assignment:
   - "Add Staff User" modal/workflow in `src/pages/crm/RoleManagement.tsx` with auto-generation or custom password, full name, email, phone, and immediate CRM role assignment.
   - Atomic registration, org membership, and CRM role assignment.
   - Credentials confirmation modal with one-click copy of email and plaintext password.
   - Custom role creation dialog allowing direct assignment to existing or new staff.
   - New users appear immediately in staff roster with role badge and can authenticate via `/api/auth/login`.
2. Enterprise CRM Task Management:
   - PostgreSQL table `staff_tasks` and endpoints in `backend-api/src/routes/crm.js` (`GET /api/crm/tasks`, `POST /api/crm/tasks`, `PATCH /api/crm/tasks/:id`).
   - Assignee selection from real organization staff members.
   - Interactive Kanban and Table views with lifecycle transitions: `todo` -> `in_progress` -> `review` -> `done`.
   - Proof notes submission on task completion.
   - Manager/owner approval or revision requests with `completed_at` and `approved_by`.
   - Accurate real-time task metrics.
3. Backend & DB Schema:
   - Authenticated Express endpoints with bcrypt password hashing, tenant isolation, role gating.
   - Idempotent PostgreSQL migrations.
4. Acceptance & Verification:
   - Dual-track execution (implementation + E2E testing).
   - Zero regression on existing features, strictly preserve protected Create Invoice flows.
   - `npm run build` / `cmd /c npx tsc --noEmit` exits 0 with zero TypeScript errors.
