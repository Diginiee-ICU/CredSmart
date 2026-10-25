# Execution Plan — Mobile List Item Container Modernization

## Objective
Modernize mobile list item containers across 9 target files in CredSmart:
Eliminate the floating card-in-a-card anti-pattern (`rounded-xl border shadow-2xs`) inside outer containers, replacing with clean minimal flat list rows separated by subtle hairlines (`divide-y divide-slate-100 dark:divide-slate-800/60`). Fix Sales.tsx outer double border. Strictly preserve desktop views and 19 quarantine files.

## Target Files & Hit Breakdown
1. `src/pages/crm/RoleManagement.tsx` — 32 hits (permission toggle rows)
2. `src/pages/Items.tsx` — 13 hits (mobile product list cards)
3. `src/pages/Sales.tsx` — 9 hits (mobile invoice list cards + outer wrapper double border)
4. `src/pages/Dashboard.tsx` — 9 hits (recent activity transaction rows)
5. `src/pages/Purchases.tsx` — 6 hits (mobile purchase invoice list cards)
6. `src/pages/Parties.tsx` — 6 hits (mobile party directory rows)
7. `src/pages/crm/SalaryManagement.tsx` — 4 hits (salary profile list rows)
8. `src/pages/crm/Attendance.tsx` — 4 hits (attendance log rows)
9. `src/pages/crm/Tasks.tsx` — 3 hits (task cards in Kanban groups)

## Phases
### Phase 0: Survey
- Spawn 3 Explorers in parallel partitioned by file groups:
  - Explorer 1 (CRM RBAC & Tasks): `RoleManagement.tsx`, `Tasks.tsx`
  - Explorer 2 (Core Billing & Catalog): `Sales.tsx`, `Purchases.tsx`, `Items.tsx`
  - Explorer 3 (Core Dashboard, Directory & CRM HR): `Dashboard.tsx`, `Parties.tsx`, `SalaryManagement.tsx`, `Attendance.tsx`
- Each explorer locates exact line numbers, existing wrapper classes, row container classes, touch targets, and proposes exact replacement diffs adhering to minimal design system rules.

### Phase 1: Global Project Specification (PROJECT.md)
- Consolidate explorer findings into Feature Inventory and Milestone plan.
- Establish strict code boundary assignments and safety constraints.

### Phase 2: Implementation Milestones
- Execute Milestones with Worker -> Reviewer -> Challenger -> Auditor iteration loops:
  - Milestone 1: CRM Roles & Tasks
  - Milestone 2: Core Billing (Sales, Purchases, Items)
  - Milestone 3: CRM HR & Directory (Dashboard, Parties, SalaryManagement, Attendance)

### Phase 3: Verification & Forensic Audit
- Type check: `node node_modules/typescript/bin/tsc --noEmit`
- Production build: `node node_modules/vite/bin/vite.js build`
- Quarantine check: verify 19 protected files remain 100% untouched.
- Forensic audit veto check.
