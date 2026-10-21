# Dispatch: Survey - Frontend CRM & Role Management Architecture

## Objective
Investigate the frontend CRM architecture, specifically `src/pages/crm/RoleManagement.tsx`, `src/pages/crm/Tasks.tsx`, `src/components/crm/`, `src/hooks/useCRMPermission.ts`, and staff management integration.

## Authoritative Inputs
- Read `ORIGINAL_REQUEST.md`: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (see timestamp `2026-10-21T17:42:42Z`)
- Skill guide: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\crm-rbac-skill\SKILL.md`
- Frontend code:
  - `src/pages/crm/RoleManagement.tsx`
  - `src/pages/crm/Tasks.tsx`
  - `src/components/crm/`
  - `src/hooks/useCRMPermission.ts`
  - `src/pages/crm/CRMDashboard.tsx`
  - API client utilities / services in `src/services/` or `src/utils/`

## Investigation Scope
1. In `RoleManagement.tsx`:
   - How are roles currently fetched, created, and updated?
   - How are staff members currently fetched and assigned to roles?
   - What UI components exist for "Add Staff User"? How should the modal be built (full name, email, generated/custom password, phone, role selector)?
   - How should the plaintext credentials confirmation dialog (with 1-click copy) work?
   - In the "Create Role" dialog, how can owners assign existing or new staff to the role atomically or in a unified flow?
2. In `Tasks.tsx`:
   - What is the current state of `Tasks.tsx`? Is it a placeholder or does it have partial implementation?
   - How should the interactive Kanban and Table views be structured?
   - How are lifecycle state transitions (`todo` -> `in_progress` -> `review` -> `done`), proof notes submission, and manager approval/revision implemented?
   - How are KPI metrics (Total, In Progress, Review, Completed, Completion Rate) calculated?
3. What API client calls are used? Do they call `api.credsmart.online` or local backend?
4. Document all UI component structures, props, state management, and UX requirements.

## Output
Write your comprehensive survey report to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_frontend\survey_report.md` and complete your handoff.
