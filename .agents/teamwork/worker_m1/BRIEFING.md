# BRIEFING — 2026-10-25T09:25:00Z

## Mission
Implement Milestone 1 (M1) — CRM Roles & Tasks Modernization: refactor mobile list item containers in `src/pages/crm/RoleManagement.tsx` (module permission action grid) and `src/pages/crm/Tasks.tsx` (Kanban column task cards) to eliminate the nested card-in-a-card anti-pattern on mobile, converting them to clean minimal flat list rows in a single `divide-y divide-slate-100 dark:divide-slate-800/60` container while strictly preserving 100% desktop layouts, state, and functionality.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1
- Original parent: 73ee3452-ffda-43b4-83da-c3ca2006c47f
- Milestone: M1: Centralized API Client & Auth Interceptor
- Active Parent ID: 47768107-cdc6-46b5-a415-7ea52564fffb
- Active Milestone: M1: Live Database Schema Alignment & Idempotent fix_db.sql
- Current Parent ID: 3044c8ce-523a-4157-917d-31b6f5d55c6a
- Current Milestone: Milestone 1: Minimal Design Tokens & Base Primitives
- Active Parent ID (Milestone 1 — Mobile List Item Containers): 24d614cb-853d-49d4-9ac2-cf0090c93a62
- Active Milestone (Current): Milestone 1 — CRM Roles & Tasks Modernization (`RoleManagement.tsx`, `Tasks.tsx`)

## 🔒 Key Constraints
- Exclusively own `src/lib/apiClient.ts` and `src/test/apiClient.test.ts`. Do NOT modify files outside this ownership boundary.
- All implementations must be genuine — no hardcoded test results, facade implementations, or shortcuts.
- Base URL must default to `https://api.credsmart.online/api` and allow override via `VITE_API_BASE_URL` or `window.__API_BASE_URL__`.
- Automatically retrieve active Supabase JWT session token via `supabase.auth.getSession()` and attach `Authorization: Bearer <token>`.
- Automatically attach `x-organization-id` header from caller options or `localStorage.getItem("credsmart_active_org_id")`.
- Transparent 401 Unauthorized token refresh: call `supabase.auth.refreshSession()` and retry once if session expired.
- Response normalization envelope: `{ data: T | null, error: ApiError | null }` with `{ message: string, code?: string, status?: number }`.
- Export helper functions: `apiClient<T>(endpoint, options)`, `apiGet`, `apiPost`, `apiPut`, `apiDelete`, `apiPatch`.
- Unit tests (15+ tests) verifying header propagation, HTTP verbs, query serialization, error normalization, 401 retry, and network failures.
- Verification commands: `cmd /c npx tsc --noEmit` and `cmd /c npx vitest run src/test/apiClient.test.ts`.
- Exclusively own `fix_db.sql`, `backend-api/fix_db.sql`, and `src/test/fixDbSchema.test.ts`. Do NOT touch any other files.
- Universal bidirectional trigger `sync_org_id_and_organization_id()` attached to all 42 tenant-scoped tables.
- Dual table synchronization between `org_memberships` and `organization_memberships`.
- Complete column coverage for `customers` and `suppliers` (all 20 fields matching backend contracts, with safe defaults).
- Run inside `BEGIN; ... COMMIT;` with `ANALYZE` commands outside the transaction block.
- Composite B-Tree indexes on tenant IDs and primary search filters (`org_id, barcode`, `org_id, sku`, `org_id, phone`, `org_id, sale_date DESC, created_at DESC`).
- Verification command: `cmd /c npx vitest run src/test/fixDbSchema.test.ts`.
- Exclusively own and edit ONLY: `tailwind.config.ts`, `src/index.css`, `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/table.tsx`, `src/components/ui/dialog.tsx`.
- STRICT EXCLUSION: DO NOT modify any of the 19 invoice files (`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`, `MobileInvoiceSuccessView.tsx`, etc.).
- MANDATORY INTEGRITY: Genuine implementation, no hardcoded test results, facade implementations, or shortcuts.
- Standardize button sizing: default (34px `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs`), sm (28px `h-7 px-2.5 rounded-md text-[11px] font-medium`), table (28px `h-7 px-2.5 rounded-md text-[11px] font-medium`), icon (30px `w-7.5 h-7.5 rounded-md p-0`), icon-sm (28px `w-7 h-7 rounded-md p-0`), cta (46px `w-[46px] h-[46px] rounded-xl font-bold shadow-sm p-0`).
- Re-alias legacy button variants (ruby, gold, glass, pill, pill-lg, lg) to clean minimal tokens for backward compatibility.
- Card padding: `p-3.5`. Hairline border `border-border/80`. Re-alias variant="glass" to clean card.
- Badge: `text-[11px] font-semibold font-mono`. Add success, warning, destructive, info variants.
- Table: `TableHead` `h-8.5 px-3 uppercase tracking-wider sticky top-0`, `TableCell` `py-2 px-3 text-xs align-middle` (38px-42px row height).
- Dialog: replace `sm:rounded-3xl` with `sm:rounded-2xl` and remove oversized blur.
- Verification commands: `cmd /c npx tsc --noEmit`, `cmd /c npx vitest run src/test/crmComponents.test.tsx`, node spacing check.
- Exclusively own `src/pages/crm/RoleManagement.tsx` and `src/pages/crm/Tasks.tsx`. Do NOT touch any other files, especially the 19 quarantine files.
- Eliminate floating card-in-a-card anti-pattern on mobile (`rounded-xl border shadow-2xs`), converting to clean flat list rows in a single `divide-y divide-slate-100 dark:divide-slate-800/60` container.
- Preserve 100% desktop layouts (`sm:` and `md:` grid and cards), state, logic, and handlers.
- Minimum touch targets `min-h-[44px]` on mobile. Minimum font size >= 11px.
- Verification commands: `node node_modules/typescript/bin/tsc --noEmit` and `node node_modules/vite/bin/vite.js build`.

## Current Parent
- Conversation ID: 24d614cb-853d-49d4-9ac2-cf0090c93a62
- Updated: 2026-10-25T09:25:00Z

## Task Summary
- **What to build**: Modernize mobile view list item containers in `src/pages/crm/RoleManagement.tsx` (module permission action grid) and `src/pages/crm/Tasks.tsx` (Kanban column tasks) to clean minimal flat list rows in `divide-y divide-slate-100 dark:divide-slate-800/60` containers while preserving desktop grids, touch targets (>= 44px), font sizes (>= 11px), and all business logic.
- **Success criteria**:
  1. `src/pages/crm/RoleManagement.tsx` refactored with clean `divide-y` mobile container and flat rows.
  2. `src/pages/crm/Tasks.tsx` refactored with clean `divide-y` mobile container and flat task rows.
  3. `node node_modules/typescript/bin/tsc --noEmit` exits with 0 errors.
  4. `node node_modules/vite/bin/vite.js build` succeeds.
  5. `git status` verifies only `RoleManagement.tsx` and `Tasks.tsx` were modified.
- **Interface contracts**: `PROJECT.md`, `DISPATCH.md`, `handoff.md` (explorer_survey_1), `minimal-design-system.md`.
- **Code layout**: `src/pages/crm/RoleManagement.tsx`, `src/pages/crm/Tasks.tsx`.

## Key Decisions Made
- Followed Explorer 1's blueprint from `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_1\handoff.md`.
- Implemented responsive divergence: mobile gets flat rows in `divide-y divide-slate-100 dark:divide-slate-800/60` containers, desktop (`sm:` / `md:`) retains grid and bordered card styling.
- Maintained touch targets at `min-h-[44px]` and kept all fonts >= 11px.

## Artifact Index
- `src/pages/crm/RoleManagement.tsx` — CRM Role Management permission matrix
- `src/pages/crm/Tasks.tsx` — CRM Tasks Kanban columns
- `.agents/teamwork/worker_m1/handoff.md` — Worker 1 completion report

## Change Tracker
- **Files modified**:
  - `src/pages/crm/RoleManagement.tsx`: Replaced mobile nested action cards with flat divide-y list rows (`min-h-[44px]`), preserving desktop 2/3 column grid.
  - `src/pages/crm/Tasks.tsx`: Replaced mobile Kanban task cards with flat divide-y list rows in unified container, preserving desktop Kanban cards.
- **Build status**: PASS (`tsc --noEmit`: 0 errors; `vite build`: ✓ built in 55.00s)
- **Pending issues**: None

## Quality Status
- **Build/test result**: PASS (TypeScript 0 errors, Vite production build successful)
- **Lint status**: 0 violations
- **Tests added/modified**: Verified via `tsc --noEmit`, `vite build`, and git boundary checks

## Loaded Skills
- **Source**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\credsmart-minimal-design-system\SKILL.md`
- **Core methodology**: Full-stack minimalist UI/UX tokens, typography hierarchy, neutral surface color architecture, fast-access desktop layouts, and native touch-first mobile ergonomics.
