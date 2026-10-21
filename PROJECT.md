# Project: CredSmart Enterprise CRM Staff Provisioning & Task Management

## Architecture
- **Multi-Tenant Staff Provisioning**:
  - Atomic backend registration via `POST /api/crm/staff/provision` running in a PostgreSQL transaction (`BEGIN ... COMMIT`).
  - Passwords hashed using bcrypt (10 rounds).
  - Simultaneous creation of user record in `public.users`, tenant membership in `public.org_memberships`, and CRM role assignment in `public.crm_staff_assignments` and `public.crm_staff_roles`.
  - Seamless authentication via `/api/auth/login` with immediate JWT token generation.
- **Staff User Provisioning & Instant Role UI**:
  - "Add Staff User" modal in `src/pages/crm/RoleManagement.tsx` with cryptographic auto-password generator (`window.crypto.getRandomValues`, 14 chars) and custom password toggle.
  - Ephemeral "Credentials Confirmation Modal" with 1-click clipboard copy triggers and preformatted communication template.
  - "Create Role" dialog enhancement allowing simultaneous assignment of existing or new staff.
  - In-memory hydration of `staffList` and `staffRolesMap` for zero-refresh roster updates.
- **Enterprise Task Management System**:
  - Persistent PostgreSQL storage in `public.staff_tasks` with multi-tenant organization isolation.
  - Backend API in `backend-api/src/routes/crm.js`: `GET /api/crm/tasks`, `POST /api/crm/tasks`, `PATCH /api/crm/tasks/:id`.
  - Full lifecycle state machine:
    - `todo` -> `in_progress` (started by assignee)
    - `in_progress` -> `review` (requires submitting proof notes)
    - `review` -> `done` (approved by manager/owner, records `completed_at` and `approved_by`)
    - `review` -> `in_progress` (manager revision request with revision notes)
  - Interactive dual views: Kanban Board and filterable Data Table.
  - Assignee picker populated with real organization staff fetched from backend.
  - Accurate KPI metrics calculation (Total, In Progress, Review, Completed, Completion Rate).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Idempotent PostgreSQL Migration | Update `staff_tasks` with proof, review, and approval columns | M1 | survey |
| 2 | Backend Staff Provisioning Endpoint | `POST /api/crm/staff/provision` with bcrypt hashing and atomic org membership + CRM role | M1 | survey |
| 3 | Backend Staff Listing & Tasks API | `GET /api/crm/staff`, `GET /api/crm/tasks`, `POST /api/crm/tasks`, `PATCH /api/crm/tasks/:id` | M1 | survey |
| 4 | Frontend CRM API Service Methods | `src/services/crmApi.ts` methods for staff provisioning and full tasks CRUD/lifecycle | M1 | survey |
| 5 | "Add Staff User" Modal in RoleManagement | Full name, email, phone, role selector, 14-char secure auto-generator, custom toggle | M2 | survey |
| 6 | Credentials Confirmation Modal | Post-creation dialog displaying email & plaintext password with 1-click copy & WhatsApp template | M2 | survey |
| 7 | Create Role Direct Staff Assignment | "Create Role" dialog enhancement with searchable staff checklist for instant assignment | M2 | survey |
| 8 | Instant Staff Roster & Role Badges | Immediate in-memory update of `staffList`, `staffRolesMap`, and `CRMRolePill` badges | M2 | survey |
| 9 | Tasks API Wiring & Assignee Picker | `Tasks.tsx` wired to `crmApi.getCRMTasks` and real organization staff assignee dropdown | M3 | survey |
| 10 | Interactive Kanban & Table Views | Dual views with column counts, search, priority badges, and status actions | M3 | survey |
| 11 | Proof Notes Submission Dialog | Dialog/drawer prompting for proof notes when transitioning from `in_progress` to `review` | M3 | survey |
| 12 | Manager Approval & Revision Request | Actions for managers to approve (`done` with timestamp) or request revision with notes | M3 | survey |
| 13 | Real-Time Task KPI Metrics | Accurate cards for Total, In Progress, Review, Completed, and Completion Rate % | M3 | survey |
| 14 | E2E Testing Suite (Tiers 1-4) | Comprehensive test suite verifying all features, boundary cases, and full lifecycle | M4 | survey |
| 15 | Adversarial Coverage Hardening (Tier 5) | White-box stress testing, zero TypeScript compile errors (`tsc --noEmit`), and clean audit | M4 | survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: PostgreSQL Schema & Express Backend Integration | `supabase/migrations/20261021180000_create_crm_staff_tasks.sql`, `fix_db.sql`, `backend-api/src/routes/crm.js`, `src/services/crmApi.ts` | none | DONE |
| 2 | M2: Staff User Provisioning & Instant Role Assignment UI | `src/pages/crm/RoleManagement.tsx`, Add Staff Modal, Credentials Modal, Create Role Staff Assignment | M1 | IN_PROGRESS |
| 3 | M3: Full-Stack Enterprise Task Management | `src/pages/crm/Tasks.tsx`, Kanban/Table views, lifecycle transitions, proof submission, manager approvals, metrics | M1, M2 | PLANNED |
| 4 | M4: E2E Verification, Clean Build & Adversarial Hardening | E2E test suite passing, `tsc --noEmit` exits 0, Forensic Integrity Audit CLEAN | M1, M2, M3 | PLANNED |

## Interface Contracts

### Backend API: `POST /api/crm/staff/provision`
- **Request Body**:
  ```json
  {
    "full_name": "string",
    "email": "string",
    "phone": "string (optional)",
    "password": "string",
    "store_role": "salesman | cashier | manager | staff",
    "crm_role_id": "UUID (optional)"
  }
  ```
- **Response** (HTTP 201):
  ```json
  {
    "user": {
      "id": "UUID",
      "email": "string",
      "full_name": "string",
      "phone": "string",
      "store_role": "string",
      "crm_role_id": "UUID | null",
      "crm_role_name": "string | null",
      "crm_role_color": "string | null"
    },
    "credentials": {
      "email": "string",
      "password": "string"
    }
  }
  ```

### Backend API: `GET /api/crm/tasks`
- **Query Params**: `status`, `priority`, `assigned_to`
- **Response** (HTTP 200):
  ```json
  [
    {
      "id": "UUID",
      "org_id": "UUID",
      "title": "string",
      "description": "string",
      "assigned_to": "UUID",
      "assigned_to_name": "string",
      "assigned_to_avatar": "string",
      "assigned_by": "UUID",
      "creator_name": "string",
      "due_date": "YYYY-MM-DD",
      "status": "todo | in_progress | review | done",
      "priority": "urgent | high | normal | low",
      "requires_proof": true,
      "proof_notes": "string | null",
      "completed_at": "TIMESTAMPTZ | null",
      "approved_by": "UUID | null",
      "approver_name": "string | null",
      "review_feedback": "string | null",
      "created_at": "TIMESTAMPTZ",
      "updated_at": "TIMESTAMPTZ"
    }
  ]
  ```

### Backend API: `PATCH /api/crm/tasks/:id`
- **Request Body**:
  ```json
  {
    "status": "todo | in_progress | review | done",
    "proof_notes": "string (optional)",
    "review_feedback": "string (optional)",
    "title": "string (optional)",
    "description": "string (optional)",
    "priority": "string (optional)",
    "due_date": "string (optional)",
    "assigned_to": "string (optional)"
  }
  ```
- **Response** (HTTP 200): Enriched task object.

## Code Layout
- `backend-api/src/routes/crm.js` — Staff provisioning and task management Express routes
- `supabase/migrations/20261021180000_create_crm_staff_tasks.sql` — Idempotent migration for `staff_tasks`
- `fix_db.sql` — Server target database alignment script
- `src/services/crmApi.ts` — Frontend CRM API service methods
- `src/pages/crm/RoleManagement.tsx` — Staff provisioning, credentials confirmation & role assignment UI
- `src/pages/crm/Tasks.tsx` — Enterprise Kanban & Table task management view
- `src/test/crmStaffProvisioning.test.ts` — Staff provisioning unit & lifecycle tests
- `src/test/crmTaskLifecycle.test.ts` — Task state machine & transitions tests
- `src/test/crmStaffTasksIntegration.test.tsx` — Full integration tests with UI and mock API
