# Execution Plan: CredSmart CRM Defects Elimination

## 1. Objective
Eliminate critical CRM defects across CredSmart: resolve staff vanishing on refresh, prevent cross-tenant user leaks, link newly provisioned staff strictly to the owner's organization with custom credentials, fix Salary Management staff visibility, restore Task assignment, enforce strict route lockdown preventing CRM staff from entering POS/Billing, accelerate CRM page load speed, unify the CRM Command Center header across all sub-pages, and cleanly decouple CRM and POS/Billing data on the PostgreSQL database.

## 2. Milestone Architecture
- **Phase 0: Survey & Codebase Mapping (Parallel Explorers)**
  - Explorer 1: Backend API & Database Schema (auth middleware, settings routes, staff provisioning, org memberships, indexes).
  - Explorer 2: Frontend CRM Modules (RoleManagement, SalaryManagement, Tasks, synthetic ID tracking, optimistic updates).
  - Explorer 3: Routing, Route Guards, POS Lockdown & Command Header (App.tsx, RoleProtectedRoute, CRMDashboard header vs sub-page headers).

- **Milestone 1: Database & Backend Multi-Tenant Isolation & Staff Provisioning (R1, R7)**
  - Cleanse database memberships (eliminate CROSS JOIN cross-linking).
  - Fix `POST /api/crm/staff/provision` to authoritatively link staff to org in `crm_staff_assignments` and `crm_staff_roles`.
  - Fix `GET /api/crm/staff`, `GET /api/profiles`, `GET /api/organization-memberships` to strictly filter by `org_id`.
  - Eliminate global fallback in auth middleware.
  - Decouple CRM roles from POS store roles.

- **Milestone 2: Staff Directory & Salary/Payroll Synchronization (R2)**
  - Update `SalaryManagement.tsx` to populate staff directory directly from authoritative CRM staff for active org.
  - Render both configured and unconfigured staff, enabling 1-click salary profile creation.

- **Milestone 3: Reliable Task Assignment & Persistence (R3)**
  - Validate and accept valid UUIDs in `POST /api/crm/tasks`.
  - In `src/pages/crm/Tasks.tsx`, eliminate synthetic IDs, provide instant optimistic UI with persistent sync.

- **Milestone 4: Strict POS/Billing Access Lockdown & Route Guard (R4)**
  - Implement route guard preventing CRM staff without POS permission from accessing `/billing/*`, `/pos`, `/checkout`.
  - Redirect unauthorized users to `/crm` with alert. Store owner / super admin retain full access.

- **Milestone 5: Lightning-Fast CRM Page Loading (R5)**
  - Bundle or parallelize CRM initial load requests (`Promise.all` / React Query).
  - Expand backend in-memory micro-cache (10s TTL) to `/rest/v1/*`.
  - Add composite B-Tree indexes on `crm_staff_assignments`, `staff_tasks`, `crm_salary_profiles`.

- **Milestone 6: Unified CRM Command Center Header Component (R6)**
  - Extract reusable `CRMCommandHeader` from `CRMDashboard.tsx`.
  - Apply across all 8 CRM sub-pages with responsive fidelity.

- **Milestone 7: Verification, Test Hardening & Final Gate (Audit + Tests)**
  - Typecheck: `npx tsc --noEmit` must pass with 0 errors.
  - Vitest test suites: all CRM and regression tests must pass.
  - Forensic Auditor integrity verification.
  - Sentinel victory handoff.

## 3. Orchestration Guardrails
- Explorer -> Worker -> Reviewers (2) -> Challengers (2) -> Auditor -> Gate check.
- Binary veto on Auditor integrity violations.
- Never write source code directly; strictly orchestrate workers.
