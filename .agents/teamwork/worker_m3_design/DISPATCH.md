# Dispatch: Worker M3 — CRM Design System Bootstrap & Dashboard Integration

## Identity
- **Agent Type**: `teamwork_preview_worker`
- **Role**: Frontend Design Systems Engineer - CRM Components
- **Working Directory**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m3_design`
- **Orchestrator Conversation ID**: `f65e7324-0a80-4f4b-bb4c-bc82b84e3cdd`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Input Context & Survey Reports
1. Read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (lines 247-257, 286-296)
2. Read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase1\PROJECT.md`
3. Read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_design\handoff.md` (which has the complete component specifications, prop interfaces, and code blueprints)
4. Read `src/hooks/useCRMPermission.ts`

## File Write Ownership
You have exclusive write ownership over:
- `src/components/crm/CRMCard.tsx`
- `src/components/crm/CRMBadge.tsx`
- `src/components/crm/CRMDataTable.tsx`
- `src/components/crm/CRMPageHeader.tsx`
- `src/components/crm/CRMStatCard.tsx`
- `src/components/crm/CRMPermissionGate.tsx`
- `src/components/crm/CRMRolePill.tsx`
- `src/components/crm/index.ts`
- `src/pages/crm/CRMDashboard.tsx`

Do NOT touch any other source files.

## Detailed Requirements for Milestone 3 (R3)

Create the 7 CRM Design System components in `src/components/crm/` with full TypeScript typing (zero `any`) and complete inline JSDoc on every component and prop:

1. **`CRMCard.tsx`**:
   - Styled card wrapper with CredSmart brand tokens.
   - Variants: `default`, `elevated`, `brand`, `outline`, `glass`.
   - Props: `title`, `description`, `headerAction`, `footer`, `variant`, `contentClassName`, etc.

2. **`CRMBadge.tsx`**:
   - Status/label badge with semantic variants: `success` (Emerald #10B981), `warning` (Orange #FF6A00/Amber), `error` (Destructive #EF4444), `info` (Blue #1D4ED8), `neutral` (Navy #0F172A/Slate).
   - Optional `dot` indicator (pulsing animated dot).

3. **`CRMDataTable.tsx`**:
   - Generic `<T>` sortable, filterable, paginated data table.
   - Props: `data: T[]`, `columns: CRMColumnDef<T>[]`, `searchKey?: keyof T`, `searchPlaceholder?: string`, `pageSize?: number`, `isLoading?: boolean`, `emptyMessage?: string`.
   - Integrated search input, sortable column headers (with Lucide icons `ArrowUpDown`, `ArrowUp`, `ArrowDown`), and pagination bar (page numbers, prev/next buttons).

4. **`CRMPageHeader.tsx`**:
   - Page header with title, subtitle, breadcrumb navigation, badge slot, and action slot.
   - Responsive: stacked on mobile (<768px), flex-row on desktop.

5. **`CRMStatCard.tsx`**:
   - Stat card featuring icon with tinted background, numeric metric (`font-mono tabular-nums`), label, and trend indicator (`trend?: { value: number | string; direction: "up" | "down" | "neutral"; label?: string }`).

6. **`CRMPermissionGate.tsx`**:
   - React component that checks `useCRMPermission(module, action)`.
   - If user has permission, renders `children`.
   - If not permitted, renders `fallback ?? null` and fires a "Not Authorized" toast via `useEffect` (using `@/hooks/use-toast`).
   - Props: `module: string`, `action: string`, `children: React.ReactNode`, `fallback?: React.ReactNode`, `showToast?: boolean`, `toastMessage?: string`.

7. **`CRMRolePill.tsx`**:
   - Colored pill displaying role name styled with user-configured hex color (`color`), 15% opacity background, 35% opacity border, solid text color, role name, optional Lucide icon, and super-admin crown badge.

8. **`src/components/crm/index.ts`**:
   - Export all 7 components and their prop types.
   - Export `CRM_BRAND_COLORS = { navy: "#0F172A", orange: "#FF6A00", blue: "#1D4ED8", emerald: "#10B981", gold: "#F59E0B", slateBg: "#F8FAFC" }`.

9. **`src/pages/crm/CRMDashboard.tsx` Integration**:
   - Update `CRMDashboard.tsx` to utilize the new design system components:
     - `CRMPageHeader` for the top header and breadcrumb.
     - `CRMStatCard` for the 5 live metric cards (staff count, today attendance, pending tasks, unread broadcasts, upcoming meetings).
     - `CRMCard` for the quick modules grid and role manager quick access.
     - `CRMBadge` for status badges.
   - Preserve all existing error handling and test compatibility (from `src/test/crmDashboardResilience.test.tsx`).

10. **Verification**:
    - Run `tsc --noEmit` to verify 0 compiler errors.
    - Run `npm test -- --run` to ensure all 45+ existing tests pass with 0 regressions.
    - Document all files and test outputs in `handoff.md`.


## 2026-10-17T07:09:18Z
[Message] timestamp=2026-10-17T07:09:18Z sender=f65e7324-0a80-4f4b-bb4c-bc82b84e3cdd priority=MESSAGE_PRIORITY_HIGH content=You are Worker M3 (CRM Design System Bootstrap & Dashboard Integration).
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m3_design
Read your dispatch file at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m3_design\DISPATCH.md
Read the authoritative user request at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
Read the project plan at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase1\PROJECT.md
Read the design survey report at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_design\handoff.md
Read the hook at: src/hooks/useCRMPermission.ts

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File Write Ownership:
You have exclusive write ownership over:
- src/components/crm/CRMCard.tsx
- src/components/crm/CRMBadge.tsx
- src/components/crm/CRMDataTable.tsx
- src/components/crm/CRMPageHeader.tsx
- src/components/crm/CRMStatCard.tsx
- src/components/crm/CRMPermissionGate.tsx
- src/components/crm/CRMRolePill.tsx
- src/components/crm/index.ts
- src/pages/crm/CRMDashboard.tsx

Create all 7 CRM components with full TypeScript typing (zero any) and complete inline JSDoc comments on every component and prop.
Update CRMDashboard.tsx to use CRMPageHeader, CRMStatCard, CRMCard, CRMBadge while preserving all existing test assertions.
Run `tsc --noEmit` and run `npm test -- --run` to verify 0 compiler errors and 100% test pass rate.

Write your report to c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m3_design\handoff.md and notify orchestrator via send_message.

## 2026-10-17T07:21:43Z
[Message] timestamp=2026-10-17T07:21:43Z sender=f65e7324-0a80-4f4b-bb4c-bc82b84e3cdd priority=MESSAGE_PRIORITY_HIGH content=You are Worker M3 Replacement (CRM Design System Verification & Handoff).
Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m3_design
Your predecessor implemented:
- src/components/crm/CRMCard.tsx
- src/components/crm/CRMBadge.tsx
- src/components/crm/CRMDataTable.tsx
- src/components/crm/CRMPageHeader.tsx
- src/components/crm/CRMStatCard.tsx
- src/components/crm/CRMPermissionGate.tsx
- src/components/crm/CRMRolePill.tsx
- src/components/crm/index.ts
- src/pages/crm/CRMDashboard.tsx

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your mission:
1. Inspect the 8 files in src/components/crm/ and src/pages/crm/CRMDashboard.tsx to confirm all 7 components are properly typed (zero any) and have complete inline JSDoc comments.
2. Execute type check: cmd /c npx tsc --noEmit
3. Execute test suite: cmd /c npx vitest run src/test/crm
4. Write comprehensive handoff.md to c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m3_design\handoff.md.
5. Send completion message back to orchestrator (f65e7324-0a80-4f4b-bb4c-bc82b84e3cdd).
