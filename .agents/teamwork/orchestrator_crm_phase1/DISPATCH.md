# Dispatch: Project Orchestrator — CRM Phase 1

## Identity & Role
- **Agent Type**: `teamwork_preview_orchestrator`
- **Role**: Project Orchestrator for CRM Tab Phase 1
- **Working Directory**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase1`
- **Parent Sentinel**: `611e8d05-cece-4277-a0f8-3ab239af7c11`

## Mission
Lead and orchestrate the complete development, verification, and delivery of CRM Tab Phase 1: Foundation, CRM Shell & Custom Role-Based Access in CredSmart, matching mobile and desktop design standards, with custom CRM components in `src/components/crm/`, configurable roles, Supabase migrations, and reusable skill file.

## Authoritative User Request
Refer to the verbatim request in `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (and `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\ORIGINAL_REQUEST.md`).

## Technical Requirements Summary
1. **R1: CRM Tab & Navigation Shell**
   - AppSidebar.tsx: "CRM" item with sub-nav (Dashboard, Attendance, Salary, Tasks, Meet, Broadcasts, AI Assistant, Support)
   - Fully responsive (mobile + desktop)
   - src/pages/crm/CRMDashboard.tsx: summary cards (staff count, today attendance, pending tasks, unread broadcasts, upcoming meetings) querying Supabase live
   - App.tsx and src/components/routes.ts routing & authentication guards

2. **R2: Custom Configurable Role System**
   - Role Management UI: src/pages/crm/RoleManagement.tsx (create custom roles with name, color, icon; module/action permissions; assign roles to staff; promote/demote)
   - Supabase schema & migrations: crm_roles, crm_permissions, crm_staff_roles with super_admin seeded
   - Searchable staff role assignment UI
   - No hard-coded roles — all roles user-defined

3. **R3: CRM Design System Bootstrap**
   - src/components/crm/: CRMCard, CRMBadge, CRMDataTable, CRMPageHeader, CRMStatCard, CRMPermissionGate, CRMRolePill, index.ts
   - CredSmart brand colors: Navy #0F172A, Orange #FF6A00, Blue #1D4ED8, Emerald #10B981
   - Complete inline JSDoc

4. **R4: Reusable Skill File & Hooks**
   - .agents/skills/crm-rbac-skill/SKILL.md with full documentation
   - src/hooks/useCRMPermission.ts

5. **Quality & Acceptance**
   - Zero TypeScript errors (`tsc --noEmit`)
   - Zero ESLint errors on new/modified files
   - Zero regressions to existing protected routes
   - Maintain `progress.md` continuously

When finished and verified, send completion notice and handoff report back to Sentinel.


## 2026-10-17T00:25:37Z
You are the Project Orchestrator for CRM Tab Phase 1.
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase1
Read your dispatch file at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase1\DISPATCH.md
Read the authoritative user request at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md

Execute the plan and orchestrate the team:
1. Decompose the CRM Phase 1 project into milestones (R1 Shell & Navigation, R2 Configurable Role System & Migrations, R3 CRM Design System Bootstrap, R4 Reusable Skill File & Hooks, and Verification).
2. Spawn workers and reviewers following the teamwork protocols.
3. Maintain progress.md and BRIEFING.md continuously in your working directory.
4. Verify all acceptance criteria, TypeScript types (tsc --noEmit), tests, and linting.
5. Once fully verified, deliver handoff.md and notify Sentinel via send_message.
