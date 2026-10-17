# Progress Tracker — Worker M2 (CRM RBAC, Migrations, Hook & Skill)

Last visited: 2026-10-17T07:08:00Z

## Checklist
- [x] Step 1: Create `supabase/migrations/20261017000000_create_crm_rbac_tables.sql`
- [x] Step 2: Extend `src/integrations/supabase/types.ts` with CRM tables (zero `any`)
- [x] Step 3: Implement `src/hooks/useCRMPermission.ts` (useCRMPermission & usePermission)
- [x] Step 4: Implement `src/pages/crm/RoleManagement.tsx` (Role modal, 14-action matrix, staff assignment)
- [x] Step 5: Update `src/pages/Staff.tsx` with CRM Role Management banner
- [x] Step 6: Create `.agents/skills/crm-rbac-skill/SKILL.md`
- [x] Step 7: Verification (`tsc --noEmit` exits with 0, `vitest run src/test/crm` 45/45 tests pass)
- [x] Step 8: Handoff report and message orchestrator
