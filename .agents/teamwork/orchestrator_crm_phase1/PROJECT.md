# Project: CredSmart CRM Tab — Phase 1: Foundation, Shell & Custom RBAC

## Architecture

CredSmart CRM Phase 1 integrates a full-scale CRM Command Center into the CredSmart enterprise PWA platform:

```
[ AppSidebar & Mega Menu ] ───> [ Protected Navigation ]
           │                                 │
           ▼                                 ▼
[ src/pages/crm/CRMDashboard ]     [ src/pages/crm/RoleManagement ]
           │                                 │
           ▼                                 ▼
[ src/components/crm/ ]             [ src/hooks/useCRMPermission ]
- CRMCard, CRMBadge                          │
- CRMDataTable, CRMPageHeader                ▼
- CRMStatCard, CRMRolePill         [ Supabase / LocalStorage ]
- CRMPermissionGate                 - crm_roles
                                    - crm_permissions
                                    - crm_staff_roles
```

1. **Navigation Shell (`src/components/AppSidebar.tsx`, `AppLayout.tsx`, `App.tsx`, `src/config/routes.ts`, `src/components/routes.ts`)**:
   - Integrates "CRM" into `MAIN_NAV_ROUTES` with 8 placeholder sub-items (Dashboard, Attendance, Salary, Tasks, Meet, Broadcasts, AI Assistant, Support) + Role Management.
   - Preserves 5-item touch dock on mobile (<768px) while collapsing CRM into the top dropdown drawer.
   - Enforces unauthenticated redirection to `/auth` on protected CRM routes.
2. **Custom Configurable RBAC Engine (`supabase/migrations/`, `src/pages/crm/RoleManagement.tsx`, `src/hooks/useCRMPermission.ts`)**:
   - Dynamic user-defined roles stored in `crm_roles`, `crm_permissions`, `crm_staff_roles`.
   - 14 granular action permissions across 7 modules (attendance, salary, tasks, meetings, broadcasts, ai_assistant, support).
   - Automated idempotent migration seeding `super_admin` role with all permissions enabled.
   - Role Management UI with searchable staff assignment, promote/demote, and color/icon customization.
3. **CRM Design System (`src/components/crm/`)**:
   - 7 reusable components: `CRMCard`, `CRMBadge`, `CRMDataTable`, `CRMPageHeader`, `CRMStatCard`, `CRMPermissionGate`, `CRMRolePill`, all exported with `CRM_BRAND_COLORS` from `src/components/crm/index.ts`.
   - Strict TypeScript typing (zero `any`) and complete inline JSDoc comments.
4. **CRM Landing Dashboard (`src/pages/crm/CRMDashboard.tsx`)**:
   - 5 live metric cards (staff count, today's attendance, pending tasks, unread broadcasts, upcoming meetings) with error-resilient querying and full responsiveness across 375px, 768px, and 1280px.
5. **Reusable Skill File (`.agents/skills/crm-rbac-skill/SKILL.md`)**:
   - Comprehensive reference documentation for subsequent agents implementing Phases 2–6.

---

## Feature Inventory

Every feature from `ORIGINAL_REQUEST.md` is enumerated below with its assigned milestone:

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | CRM Route Paths & Aliases | Define `crm`, `crmDashboard`, and 8 sub-routes in `ROUTE_PATHS`, create `src/components/routes.ts` re-exporting `src/config/routes.ts` | M1 | `ORIGINAL_REQUEST.md:237` |
| 2 | CRM Sidebar Mega Menu Item | Add "CRM" to `MAIN_NAV_ROUTES` in `AppSidebar` with badge and 8 sub-navigation placeholder items | M1 | `ORIGINAL_REQUEST.md:237,271` |
| 3 | Mobile Navigation Resilience | Preserve 5-item mobile bottom dock while collapsing CRM into top mobile drawer without breaking existing navigation | M1 | `ORIGINAL_REQUEST.md:272` |
| 4 | Authentication Guard Redirection | Ensure `/crm` and protected CRM routes redirect unauthenticated users directly to `/auth` | M1 | `ORIGINAL_REQUEST.md:275` |
| 5 | AppLayout Header Metadata | Provide dynamic page title & subtitle for `/crm` and `/crm/roles` in `AppLayout.tsx` | M1 | `ORIGINAL_REQUEST.md:237` |
| 6 | CRM RBAC Supabase Migration | Create `supabase/migrations/20261017000000_create_crm_rbac_tables.sql` defining `crm_roles`, `crm_permissions`, `crm_staff_roles` with RLS, indexes, and triggers | M2 | `ORIGINAL_REQUEST.md:242,283` |
| 7 | Super Admin Automated Seeding | Auto-seed `super_admin` role with all 14 permissions enabled via migration trigger for current and future orgs | M2 | `ORIGINAL_REQUEST.md:242,284` |
| 8 | Supabase Types Definition | Extend `src/integrations/supabase/types.ts` with strict TypeScript types for CRM tables (zero `any`) | M2 | `ORIGINAL_REQUEST.md:298` |
| 9 | Role Management Page UI | Implement `src/pages/crm/RoleManagement.tsx` allowing super-admins to create/edit custom roles (name, color, icon) | M2 | `ORIGINAL_REQUEST.md:241,278` |
| 10 | Granular Permission Matrix | Interactive toggles for 14 actions across 7 modules persisted to `crm_permissions` and localStorage fallback | M2 | `ORIGINAL_REQUEST.md:241,279` |
| 11 | Searchable Staff Role Assignment | Searchable staff list with role dropdown, promote to super-admin, and demote actions in `RoleManagement.tsx` | M2 | `ORIGINAL_REQUEST.md:243,280` |
| 12 | Staff Page Non-Breaking Integration | Add link/banner in `src/pages/Staff.tsx` pointing to CRM Role Management without breaking existing store roles | M2 | `ORIGINAL_REQUEST.md:228` |
| 13 | CRMCard Component | Card wrapper with CredSmart brand tokens, variants, and header actions (`src/components/crm/CRMCard.tsx`) | M3 | `ORIGINAL_REQUEST.md:249,287` |
| 14 | CRMBadge Component | Semantic badge with variants: `success`, `warning`, `error`, `info`, `neutral` (`src/components/crm/CRMBadge.tsx`) | M3 | `ORIGINAL_REQUEST.md:250,287` |
| 15 | CRMDataTable Component | Generic sortable, filterable, paginated data table (`src/components/crm/CRMDataTable.tsx`) | M3 | `ORIGINAL_REQUEST.md:251,288` |
| 16 | CRMPageHeader Component | Header with title, subtitle, breadcrumb, and action slot (`src/components/crm/CRMPageHeader.tsx`) | M3 | `ORIGINAL_REQUEST.md:252,287` |
| 17 | CRMStatCard Component | Metric card with icon, value, label, trend indicator (up/down/neutral) (`src/components/crm/CRMStatCard.tsx`) | M3 | `ORIGINAL_REQUEST.md:253,289` |
| 18 | CRMPermissionGate Component | Renders children only if user has permission; else fires "Not Authorized" toast (`src/components/crm/CRMPermissionGate.tsx`) | M3 | `ORIGINAL_REQUEST.md:254,281` |
| 19 | CRMRolePill Component | Dynamic role pill rendered with user-defined hex color (`src/components/crm/CRMRolePill.tsx`) | M3 | `ORIGINAL_REQUEST.md:255,287` |
| 20 | CRM Design System Index & Tokens | Export all components and `CRM_BRAND_COLORS` in `src/components/crm/index.ts` with JSDoc | M3 | `ORIGINAL_REQUEST.md:256,291` |
| 21 | CRMDashboard Landing Page | Implement `src/pages/crm/CRMDashboard.tsx` with 5 live Supabase stat cards (staff, attendance, tasks, broadcasts, meetings) | M3 | `ORIGINAL_REQUEST.md:237,294` |
| 22 | Dashboard Responsive Layout | CRMDashboard responsive across 375px (mobile), 768px (tablet), and 1280px (desktop) | M3 | `ORIGINAL_REQUEST.md:295` |
| 23 | Permission Hook (`useCRMPermission.ts`) | Create `src/hooks/useCRMPermission.ts` exporting `useCRMPermission` and `usePermission` with super-admin bypass | M4 | `ORIGINAL_REQUEST.md:262,302` |
| 24 | Reusable Skill File (`crm-rbac-skill`) | Create `.agents/skills/crm-rbac-skill/SKILL.md` with full schema, usage guidelines, and migration conventions | M4 | `ORIGINAL_REQUEST.md:259,301` |
| 25 | System Verification & Typecheck | Run `tsc --noEmit` (zero errors, strict mode, no `any`), unit tests, and linting | M5 | `ORIGINAL_REQUEST.md:298,299` |
| 26 | Route Non-Regression Verification | Verify existing protected routes (/dashboard, /sales, /pos, /purchases, etc.) remain intact | M5 | `ORIGINAL_REQUEST.md:300` |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | CRM Shell & Navigation | Features 1-5: `routes.ts`, `AppSidebar.tsx`, `AppLayout.tsx`, `App.tsx` routing, mobile nav, `/auth` redirect | none | DONE (tsc 0, 45 tests pass) |
| M2 | Configurable Role System & Migrations | Features 6-12: SQL migration, Supabase types, `RoleManagement.tsx`, staff assignment, `Staff.tsx` integration | none | IN_PROGRESS |
| M3 | CRM Design System Bootstrap & Dashboard | Features 13-22: 7 CRM components in `src/components/crm/`, `index.ts`, `CRMDashboard.tsx` with 5 live stat cards | M2, M4 | PLANNED |
| M4 | Reusable Skill File & Hooks | Features 23-24: `useCRMPermission.ts`, `.agents/skills/crm-rbac-skill/SKILL.md` | M2 | PLANNED |
| M5 | Full Verification & E2E Acceptance | Features 25-26: `tsc --noEmit`, test suite execution, regression audit, gate signoff | M1, M2, M3, M4 | PLANNED |

---

## Interface Contracts

### CRM RBAC Database Tables
- `public.crm_roles`:
  - `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `org_id`: UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE
  - `name`: TEXT NOT NULL
  - `color`: TEXT NOT NULL DEFAULT '#1D4ED8'
  - `icon`: TEXT NOT NULL DEFAULT 'User'
  - `is_super_admin`: BOOLEAN NOT NULL DEFAULT false
  - `created_at`: TIMESTAMPTZ NOT NULL DEFAULT now()
- `public.crm_permissions`:
  - `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `role_id`: UUID NOT NULL REFERENCES public.crm_roles(id) ON DELETE CASCADE
  - `module`: TEXT NOT NULL (attendance, salary, tasks, meetings, broadcasts, ai_assistant, support)
  - `action`: TEXT NOT NULL (view, edit, create, approve, send, access, manage)
  - `allowed`: BOOLEAN NOT NULL DEFAULT true
  - UNIQUE (role_id, module, action)
- `public.crm_staff_roles`:
  - `staff_id`: UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
  - `role_id`: UUID NOT NULL REFERENCES public.crm_roles(id) ON DELETE CASCADE
  - `assigned_by`: UUID REFERENCES auth.users(id) ON DELETE SET NULL
  - `assigned_at`: TIMESTAMPTZ NOT NULL DEFAULT now()
  - PRIMARY KEY (staff_id, role_id)

### `useCRMPermission` Hook Contract (`src/hooks/useCRMPermission.ts`)
```typescript
export interface UseCRMPermissionResult {
  hasPermission: (module: string, action: string) => boolean;
  isSuperAdmin: boolean;
  userRoles: CRMRole[];
  loading: boolean;
  refreshPermissions: () => Promise<void>;
}

export function useCRMPermission(module?: string, action?: string): UseCRMPermissionResult & { allowed: boolean };
export const usePermission: typeof useCRMPermission;
```

### `CRMPermissionGate` Component Contract (`src/components/crm/CRMPermissionGate.tsx`)
```typescript
export interface CRMPermissionGateProps {
  module: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showToast?: boolean;
  toastMessage?: string;
}
```

---

## Code Layout

- `src/components/routes.ts` — Route re-export for modular imports
- `src/config/routes.ts` — Canonical route definitions, `MAIN_NAV_ROUTES` with CRM section
- `src/components/AppSidebar.tsx` — Desktop mega-menu & mobile responsive drawer
- `src/components/AppLayout.tsx` — App layout header title & breadcrumbs
- `src/App.tsx` — Protected router configuration with `/crm` and `/crm/roles`
- `supabase/migrations/20261017000000_create_crm_rbac_tables.sql` — Idempotent DDL & triggers
- `src/integrations/supabase/types.ts` — TypeScript schema definitions for CRM tables
- `src/hooks/useCRMPermission.ts` — RBAC permission evaluation hook
- `src/components/crm/` — Reusable CRM Design System components:
  - `CRMCard.tsx`
  - `CRMBadge.tsx`
  - `CRMDataTable.tsx`
  - `CRMPageHeader.tsx`
  - `CRMStatCard.tsx`
  - `CRMPermissionGate.tsx`
  - `CRMRolePill.tsx`
  - `index.ts`
- `src/pages/crm/CRMDashboard.tsx` — Live CRM landing dashboard
- `src/pages/crm/RoleManagement.tsx` — Dynamic role configuration & staff assignment
- `src/pages/Staff.tsx` — Non-breaking CRM role banner integration
- `.agents/skills/crm-rbac-skill/SKILL.md` — Reusable agent skill for Phases 2–6
