# Dispatch: Project Orchestrator (CRM Defects Elimination)

## Objective
Eliminate critical CRM defects across CredSmart: resolve staff vanishing on refresh, prevent cross-tenant user leaks, link newly provisioned staff strictly to the owner's organization with custom credentials, fix Salary Management staff visibility, restore Task assignment, enforce strict route lockdown preventing CRM staff from entering POS/Billing, accelerate CRM page load speed, unify the CRM Command Center header across all sub-pages, and cleanly decouple CRM and POS/Billing data on the Ubuntu server PostgreSQL database.

## Authoritative User Request
Refer to the latest section in `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (header `## 2026-10-26T19:54:47Z`).

## Scope & Requirements
1. **R1. Multi-Tenant User Isolation & Staff Provisioning**:
   - Cleanse database memberships: Eradicate cross-joined rogue memberships so each organization only contains its legitimate owner and explicitly provisioned staff.
   - Ensure `POST /api/crm/staff/provision` saves user credentials (email, password_hash, full_name, phone) and creates an authoritative link in `crm_staff_assignments` and `crm_staff_roles` scoped strictly to `org_id`.
   - Ensure newly provisioned staff can log in using their credentials and are strictly bound to the provisioning owner's organization.
   - Prevent `GET /api/crm/staff`, `GET /api/profiles`, and `GET /api/organization-memberships` from ever leaking users across different organizations.
2. **R2. Salary & Payroll Staff Synchronization**:
   - In `SalaryManagement.tsx`, populate the staff directory directly from authoritative CRM staff for the active organization.
   - Display a comprehensive roster showing both configured and unconfigured staff members, enabling 1-click salary profile creation.
3. **R3. Reliable Task Assignment**:
   - Ensure `POST /api/crm/tasks` accepts valid UUIDs of real provisioned staff in the active organization.
   - Update `src/pages/crm/Tasks.tsx` to handle task assignment with immediate optimistic updates and persistent database synchronization.
4. **R4. POS/Billing Strict Access Lockdown**:
   - Implement a route guard preventing CRM staff from navigating to `/billing/*`, `/pos`, `/checkout`, or billing pages.
   - Restrict POS/Billing exclusively to the Store Owner, Super Admin, or staff explicitly granted POS billing access permissions in their custom CRM role.
   - If a CRM staff user without POS permission accesses a billing URL, redirect them to `/crm` with an unauthorized alert.
5. **R5. Lightning-Fast CRM Page Loading**:
   - Eliminate cascading roundtrips: bundle CRM initial load queries or execute them concurrently with Promise.all / React Query.
   - Expand backend in-memory micro-cache (10s TTL) to cover `/rest/v1/*` read requests.
   - Add database B-Tree composite indexes on `crm_staff_assignments(org_id, user_id)`, `staff_tasks(org_id, status)`, and `crm_salary_profiles(org_id, staff_id)`.
6. **R6. Unified CRM Command Center Header**:
   - Extract the CRM Command Center header from `CRMDashboard.tsx` into a reusable `CRMCommandHeader` component.
   - Apply this unified header across all CRM pages (`RoleManagement`, `SalaryManagement`, `Tasks`, `Attendance`, `Broadcasts`, `Meet`, `AIAssistant`, `Support`).
7. **R7. CRM and POS/Billing Domain Data Separation**:
   - Segregate CRM staff assignments and permissions from POS store roles.
   - Ensure modifications within CRM (roles, staff, payroll, tasks) operate independently from POS/Billing operational records (sales invoices, products, stock).

## Constraints & Quality Standards
- Strict type safety: zero `any` types in newly written/modified code. `npx tsc --noEmit` must pass with 0 errors.
- Vitest automated test suites must pass cleanly.
- Write unit/integration tests to verify each requirement (multi-tenant isolation, route lockdown, staff provisioning, tasks, salary sync, header unification).
- All SQL migrations must be idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).
- Maintain `progress.md` with continuous updates on subtasks, milestones, and status.
- Once complete, notify Sentinel with a structured handoff report and claim completion so Victory Audit can be conducted.


## 2026-10-26T19:57:27Z
Received dispatch from Sentinel (09d50593-b38c-4503-9d7f-5e9e8dd940c0):
You are the Project Orchestrator for CredSmart CRM Defects Elimination.
Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_defects
Authoritative User Request: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (see section ## 2026-10-26T19:54:47Z)
Mission: Orchestrate resolution of R1 through R7 with zero-regression, zero TypeScript errors (`npx tsc --noEmit`), and full test verification (`npm test` / vitest).
