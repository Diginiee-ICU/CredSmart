# Implementation Plan: Staff User Provisioning & Enterprise CRM Task Management

## 1. Objectives & Scope
Deliver full-stack enterprise capabilities for CredSmart CRM:
1. **R1: Staff User Provisioning & Instant Role Assignment**:
   - "Add Staff User" modal in `RoleManagement.tsx`
   - Auto-generated or custom secure passwords with bcrypt hashing
   - Atomic registration: `users` table + `org_memberships` + `crm_staff_roles`
   - Plaintext credentials summary confirmation modal with 1-click clipboard copy
   - "Create Role" dialog enhancement allowing simultaneous assignment of existing or new staff members
2. **R2: Enterprise Task Management System**:
   - Backend API `/api/crm/tasks` with PostgreSQL table `staff_tasks`
   - Task creation with title, description, priority, due date, proof requirements, and assignee selection from real org staff
   - Dual view: Kanban board & Data Table
   - Lifecycle transitions: `todo` -> `in_progress` -> `review` -> `done`
   - Proof submission notes by assignee
   - Manager approval / revision requests recording `completed_at` and `approved_by`
   - Real-time/accurate KPI metrics calculated from backend data
3. **R3: Backend & Database Schema**:
   - Express endpoints in `backend-api/src/routes/crm.js`
   - PostgreSQL tables and migrations for multi-tenant isolation, bcrypt password hashing, and role checks
4. **Zero Regressions & Quality**:
   - `npm run build` with zero TypeScript errors
   - 100% test pass rate
   - Forensic integrity audit clean

## 2. Execution Phases
- **Phase 0: Survey (3 Explorers in parallel)**:
  - Explorer 1: Backend architecture (`backend-api/src/routes/crm.js`, `backend-api/src/routes/auth.js`, PostgreSQL schema, server migrations)
  - Explorer 2: Frontend CRM architecture (`src/pages/crm/RoleManagement.tsx`, `src/pages/crm/Tasks.tsx`, CRM components, staff fetching, role assignment)
  - Explorer 3 / Spec Miner: Requirements & E2E Testing strategy (`.agents/skills/crm-rbac-skill/SKILL.md`, test runners, mocks, acceptance criteria)
- **Phase 1: Feature Inventory & Decomposition into Milestones**:
  - Synthesize reports into `PROJECT.md`
  - Establish Interface Contracts between Frontend and Backend
- **Phase 2: Dual Track Dispatch**:
  - Track A: E2E Testing Track (Test Suite & Runner)
  - Track B: Implementation Milestones (Backend API & DB, Role Management UI, Task Management UI)
- **Phase 3: Iteration Loops (Worker -> Reviewer -> Challenger -> Auditor -> Gate)**
- **Phase 4: Full Verification & Final Attestation**
