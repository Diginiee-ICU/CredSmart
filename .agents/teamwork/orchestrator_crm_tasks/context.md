# Technical Context: Staff User Provisioning & Enterprise CRM Task Management

## Codebase Map
- Frontend Root: `src/`
- CRM Pages: `src/pages/crm/`
  - `CRMDashboard.tsx`
  - `RoleManagement.tsx`
  - `Tasks.tsx`
  - `Attendance.tsx`
  - `SalaryManagement.tsx`
- CRM Components: `src/components/crm/`
  - `CRMCard`, `CRMBadge`, `CRMDataTable`, `CRMPageHeader`, `CRMStatCard`, `CRMPermissionGate`, `CRMRolePill`
- RBAC Hook: `src/hooks/useCRMPermission.ts`
- Backend API: `backend-api/`
  - Routes: `backend-api/src/routes/` (`crm.js`, `auth.js`, `users.js`, `settings.js`, etc.)
  - Database pool / client: `backend-api/src/db.js` or `backend-api/src/config/`
- Database Migrations:
  - Supabase / PostgreSQL: `supabase/migrations/`
  - Backend server scripts: `deploy-fix.sh`, `fix_db.sql`, etc.
- Skills:
  - `.agents/skills/crm-rbac-skill/SKILL.md`

## Brand Tokens
- Navy: `#0F172A`
- Orange: `#FF6A00`
- Royal Blue: `#1D4ED8`
- Emerald Green: `#10B981`
- Amber Gold: `#F59E0B`
