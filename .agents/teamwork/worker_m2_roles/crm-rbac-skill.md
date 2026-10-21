# CredSmart CRM RBAC Skill & Developer Manual (Phases 1–6)

This is a local reference copy dumped from `.agents/skills/crm-rbac-skill/SKILL.md`.

## 1. Architecture Overview
CredSmart CRM operates a decoupled, dynamic, user-configurable Role-Based Access Control (RBAC) engine that operates independently of store cashier/billing roles:
- Zero Hardcoded Roles
- Super Admin Bypass
- Dual-Layer Resilience
- Strict Typing

## 2. Database Schema Reference
- `public.crm_roles` (id, org_id, name, color, icon, is_super_admin, created_at)
- `public.crm_permissions` (id, role_id, module, action, allowed)
- `public.crm_staff_roles` (staff_id, role_id, assigned_by, assigned_at)

## 3. Hook Usage
`useCRMPermission(module, action)` or `useCRMPermission()`
- `hasPermission(mod, act)`
- `isSuperAdmin`
- `loading`
- `userRoles`

## 4. Components
- `CRMRolePill` (name, color, isSuperAdmin, icon, size)
- `CRMCard`
- `CRMBadge`
- `CRMDataTable`
- `CRMPageHeader`
- `CRMStatCard`
- `CRMPermissionGate`

## 5. Brand Tokens
- Navy: `#0F172A`
- Orange: `#FF6A00`
- Royal Blue: `#1D4ED8`
- Emerald Green: `#10B981`
- Amber Gold: `#F59E0B`
