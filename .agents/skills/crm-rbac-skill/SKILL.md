---
name: crm-rbac-skill
description: Comprehensive architecture, database schema, permission hooks, gating components, migration conventions, and developer guidelines for CredSmart CRM Role-Based Access Control (RBAC) across Phases 2 through 6.
---

# CredSmart CRM RBAC Skill & Developer Manual (Phases 1–6)

This skill provides the authoritative engineering standard for building, extending, and securing CredSmart CRM modules. Any sub-agent or engineer working on CRM features (Attendance, Salary, Tasks, Meetings, Broadcasts, AI Assistant, Support) must adhere to these patterns.

---

## 1. Architecture Overview

CredSmart CRM operates a decoupled, dynamic, user-configurable Role-Based Access Control (RBAC) engine that operates independently of store cashier/billing roles:

```
[ Authenticated User ] ───> [ useAuth() & useOrganization() ]
                                       │
                                       ▼
                         [ useCRMPermission(module, action) ]
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
       [ isSuperAdmin Bypass ]                     [ Granular Permission ]
- store_owner / super_admin                  - Checks crm_staff_roles
- crm_roles.is_super_admin = true            - Evaluates crm_permissions
  (Returns true unconditionally)               (allowed: true for module/action)
```

### Key Principles
1. **Zero Hardcoded Roles**: Roles are entirely user-defined and stored in Supabase with custom name, hex color, and icon.
2. **Super Admin Bypass**: Organization owners, ERP super admins, and users assigned a role with `is_super_admin = true` unconditionally bypass all permission checks.
3. **Dual-Layer Resilience**: Frontend queries Supabase tables with automatic fallback to `localStorage` (`credsmart_crm_roles_${orgId}`, `credsmart_crm_permissions_${orgId}`, `credsmart_crm_staff_roles_${orgId}`).
4. **Strict Typing**: All CRM queries and components use strict TypeScript interfaces with zero `any` types.

---

## 2. Database Schema Reference

The CRM RBAC database layer comprises three core tables created in `supabase/migrations/20261017000000_create_crm_rbac_tables.sql`:

### 2.1 Table: `public.crm_roles`
Stores user-defined roles for each organization.
```sql
CREATE TABLE public.crm_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#1D4ED8',
  icon TEXT NOT NULL DEFAULT 'User',
  is_super_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_roles_org ON public.crm_roles(org_id);
```

### 2.2 Table: `public.crm_permissions`
Stores allowed actions per role across modules.
```sql
CREATE TABLE public.crm_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES public.crm_roles(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT uq_crm_permissions_role_mod_act UNIQUE (role_id, module, action)
);
CREATE INDEX idx_crm_permissions_role ON public.crm_permissions(role_id);
```

### 2.3 Table: `public.crm_staff_roles`
Junction linking staff members (`auth.users`) to CRM roles.
```sql
CREATE TABLE public.crm_staff_roles (
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.crm_roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (staff_id, role_id)
);
CREATE INDEX idx_crm_staff_roles_staff ON public.crm_staff_roles(staff_id);
CREATE INDEX idx_crm_staff_roles_role ON public.crm_staff_roles(role_id);
```

### 2.4 Automated Super Admin Seeding
Every new organization automatically receives a seeded "Super Admin" role with all 14 permissions enabled via the PostgreSQL trigger `trigger_seed_crm_super_admin` calling `seed_crm_super_admin_for_org(NEW.id)`.

---

## 3. Hook Usage: `useCRMPermission` & `usePermission`

Import the hook from `@/hooks/useCRMPermission`:

```typescript
import { useCRMPermission, usePermission } from "@/hooks/useCRMPermission";
```

### 3.1 Basic Component Permission Check
```typescript
import React from "react";
import { useCRMPermission } from "@/hooks/useCRMPermission";
import { Button } from "@/components/ui/button";

export function TaskActionButtons() {
  const { hasPermission, isSuperAdmin, loading } = useCRMPermission();

  if (loading) return null;

  return (
    <div className="flex gap-2">
      {hasPermission("tasks", "create") && (
        <Button>Create Task</Button>
      )}

      {hasPermission("tasks", "approve") && (
        <Button variant="outline">Approve Submissions</Button>
      )}
    </div>
  );
}
```

### 3.2 Direct Boolean Evaluation (`allowed`)
When checking a single permission, pass `(module, action)` directly into the hook:
```typescript
export function BroadcastSender() {
  const { allowed, loading } = useCRMPermission("broadcasts", "send");

  if (!allowed) {
    return <p className="text-xs text-slate-400">You do not have permission to publish broadcasts.</p>;
  }

  return <button className="btn-primary">Publish Broadcast</button>;
}
```

### 3.3 Accessing User Roles & Re-fetching
```typescript
const { userRoles, isSuperAdmin, refreshPermissions } = useCRMPermission();

// userRoles: Array of CRMRole objects assigned to active user
console.log("Current user roles:", userRoles.map(r => r.name));

// Call refreshPermissions() after modifying roles in UI
await refreshPermissions();
```

---

## 4. Component Gating: `CRMPermissionGate`

Import from `@/components/crm`:
```typescript
import { CRMPermissionGate } from "@/components/crm";
```

### 4.1 Conditional Rendering with Toast Notification
If permission is denied, `CRMPermissionGate` renders `fallback` (default: `null`) and automatically fires a "Not Authorized" toast:
```tsx
<CRMPermissionGate module="salary" action="edit">
  <SalaryAdjustmentModal employeeId={employee.id} />
</CRMPermissionGate>
```

### 4.2 Custom Fallback UI & Suppressing Toasts
For tabs, buttons, or sidebars where you want a locked state without an intrusive toast:
```tsx
<CRMPermissionGate
  module="ai_assistant"
  action="access"
  suppressToast={true}
  fallback={
    <div className="p-4 bg-slate-50 border rounded-xl text-center">
      <Lock className="w-5 h-5 mx-auto text-slate-400" />
      <p className="text-xs text-slate-500 mt-1">Upgrade or request AI CRM Assistant permission</p>
    </div>
  }
>
  <AICRMWorkspace />
</CRMPermissionGate>
```

---

## 5. Adding New CRM Modules & Actions (Phases 2–6)

When implementing subsequent phases:
- **Phase 2**: Attendance & Shift Management
- **Phase 3**: Salary, Payroll & Ledgers
- **Phase 4**: Task Workflows & Approvals
- **Phase 5**: Video Meetings & Broadcasts
- **Phase 6**: AI CRM Assistant & Support Desk

### Step-by-Step Procedure:
1. **Extend Seed Function**:
   In `supabase/migrations/`, add an idempotent migration updating `seed_crm_super_admin_for_org` to include any new module/action pairs in `v_modules_actions`.
2. **Update Module Taxonomy**:
   In `src/pages/crm/RoleManagement.tsx`, append the new module or action to the `CRM_MODULES` constant:
   ```typescript
   {
     id: "new_module",
     label: "New Module Title",
     description: "Module capabilities summary",
     actions: [
       { id: "view", label: "View New Module", description: "Read-only access" },
       { id: "manage", label: "Manage New Module", description: "Full modification rights" },
     ]
   }
   ```
3. **Guard Feature Pages**:
   Wrap feature entry points in `src/pages/crm/` with `CRMPermissionGate` or check `useCRMPermission(module, action)`.
4. **Update Supabase Types**:
   Ensure `src/integrations/supabase/types.ts` is updated if new database tables are created.

---

## 6. Migration Standards & Idempotent DDL

Every Supabase migration must strictly follow these conventions:
1. **Filename Convention**: `YYYYMMDDHHMMSS_<description>.sql` (e.g. `20261017000000_create_crm_rbac_tables.sql`).
2. **Transaction Wrap**: Begin with `BEGIN;` and terminate with `COMMIT;`.
3. **Idempotency Guard**:
   - `CREATE TABLE IF NOT EXISTS public.<name> (...);`
   - `CREATE INDEX IF NOT EXISTS <name> ON ...;`
   - `DROP POLICY IF EXISTS "<name>" ON ...;`
   - `CREATE POLICY "<name>" ON ...;`
   - Seed data inserts must use `ON CONFLICT (...) DO NOTHING;` to guarantee idempotent execution.
4. **Foreign Key Integrity**:
   - Always reference `public.organizations(id) ON DELETE CASCADE`.
   - Never reference tables outside `public` unless referencing `auth.users(id)`.
5. **Row Level Security (RLS)**:
   - Always call `ALTER TABLE public.<name> ENABLE ROW LEVEL SECURITY;`.
   - Use standard helper functions `has_org_access(org_id)` and `is_org_owner_or_manager(org_id)`.

---

## 7. Brand Tokens & CRM Design System

CredSmart CRM enforces cohesive styling across all screen sizes (375px mobile, 768px tablet, 1280px desktop):

### Color Tokens
- **Navy**: `#0F172A` (Slate 900) — Primary structural text, dark headings, high-contrast borders.
- **Orange**: `#FF6A00` — CredSmart brand accent, primary CTA highlights, focus rings.
- **Royal Blue**: `#1D4ED8` (Blue 700) — RBAC primary actions, link hovers, active badges.
- **Emerald Green**: `#10B981` (Emerald 500) — Live status indicators, success states, positive trends.
- **Amber Gold**: `#F59E0B` — Super admin badges, warnings, priority alerts.

### Typography & Spacing
- Headings: `font-sans font-black tracking-tight text-slate-900 dark:text-white`
- Metrics: `font-mono tabular-nums font-black text-2xl sm:text-3xl`
- Labels: `font-mono text-xs font-bold uppercase tracking-wider text-slate-500`
- Cards: `rounded-2xl border border-slate-200/80 bg-white shadow-xs`

---

## 8. Integrity & Quality Checklist

Before submitting any CRM code modification:
1. `cmd /c npx tsc --noEmit` must exit with code 0 (zero compiler errors, strict mode, zero `any` types).
2. Existing store cashier functionality in `src/pages/Staff.tsx` must remain intact.
3. Unauthenticated requests to `/crm` or `/crm/roles` must redirect to `/auth`.
4. Role pills and badge tags must support custom hex colors dynamically.
