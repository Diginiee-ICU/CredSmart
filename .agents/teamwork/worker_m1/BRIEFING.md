# BRIEFING — 2026-10-24T19:07:37Z

## Mission
Implement Milestone 1 (M1) — Minimal Design Tokens & Base Primitives: extend Tailwind spacing scale & micro-shadows, overhaul CSS variables for light/dark canvas, sanitize skeuomorphic styles, configure 'Inter' and 'IBM Plex Mono' tabular figures, and update base UI primitives (Button, Card, Badge, Table, Dialog) with zero business logic regression.

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

## Current Parent
- Conversation ID: 3044c8ce-523a-4157-917d-31b6f5d55c6a
- Updated: 2026-10-24T19:07:37Z

## Task Summary
- **What to build**: Minimal design tokens in Tailwind, clean CSS color canvas & typography in `src/index.css`, sanitized utilities, standard button sizes & backward-compatible aliases in `button.tsx`, compact card in `card.tsx`, semantic badge in `badge.tsx`, screen-fitted table in `table.tsx`, clamped dialog in `dialog.tsx`.
- **Success criteria**: All 7 files updated cleanly according to the survey blueprint; `node -e` resolves spacing '8.5', '7.5', '13'; `tsc --noEmit` exits 0; `vitest run src/test/crmComponents.test.tsx` passes 100%.
- **Interface contracts**: `PROJECT.md`, `.agents/rules/minimal-design-system.md`, `.agents/skills/credsmart-minimal-design-system/SKILL.md`, `survey_miner_tokens/handoff.md`.
- **Code layout**: `tailwind.config.ts`, `src/index.css`, `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/table.tsx`, `src/components/ui/dialog.tsx`.

## Key Decisions Made
- Use exact blueprint from `survey_miner_tokens/handoff.md` which was thoroughly pre-mined.
- Retain backward compatibility by aliasing legacy variants (`ruby`, `gold`, `glass`, `pill`, `pill-lg`, `lg`) in `button.tsx` and `glass` in `card.tsx` so existing unit tests (e.g., `crmComponents.test.tsx`) pass without failure.

## Artifact Index
- `tailwind.config.ts` — Spacing, font family, boxShadow, borderRadius
- `src/index.css` — CSS variables, typography, sanitized utilities
- `src/components/ui/button.tsx` — Button primitives and sizes
- `src/components/ui/card.tsx` — Card primitive and compact padding
- `src/components/ui/badge.tsx` — Badge primitive and semantic variants
- `src/components/ui/table.tsx` — Table head and cell density
- `src/components/ui/dialog.tsx` — Dialog content radius and clean backdrop
- `.agents/teamwork/worker_m1/handoff.md` — Final handoff report

## Change Tracker
- **Files modified**:
  - `tailwind.config.ts`: Added spacing scale ('7.5', '8.5', '11.5', '13'), set Inter sans/display, refined boxShadow micro-shadows, clamped borderRadius['3xl'] to 1.25rem.
  - `src/index.css`: Overhauled :root and .dark tokens (#F8FAFC canvas, #2563EB royal blue, semantic tokens, hairline borders), set body and h1-h6 to Inter, added IBM Plex Mono tabular numbers, sanitized skeuomorphic and glowing utilities.
  - `src/components/ui/button.tsx`: Implemented standard button sizing (34px default, 28px sm/table, 30px icon, 46px cta), clean variants, re-aliased legacy variants (ruby, gold, glass, pill, pill-lg, lg), active:scale-[0.98] duration-150.
  - `src/components/ui/card.tsx`: Tightened padding to p-3.5 (14px), hairline border border-border/80, shadow-xs, re-aliased variant="glass".
  - `src/components/ui/badge.tsx`: Enforced text-[11px] font-semibold font-mono, added semantic status variants (success, warning, destructive, info).
  - `src/components/ui/table.tsx`: Updated TableHead to h-8.5 px-3 uppercase tracking-wider sticky header, TableCell to py-2 px-3 for 38-42px row height.
  - `src/components/ui/dialog.tsx`: Clamped dialog radius to sm:rounded-2xl, replaced oversized blur with subtle blur.
- **Build status**: PASS (tsc --noEmit: 0 errors; vitest crmComponents.test.tsx: 55/55 passed; spacing check: 2.125rem 1.875rem 3.25rem; eslint: 0 violations)
- **Pending issues**: None

## Quality Status
- **Build/test result**: PASS (55/55 unit tests passing in 2.16s, `tsc --noEmit` exited 0)
- **Lint status**: 0 violations (ESLint passed cleanly across all modified files)
- **Tests added/modified**: Verified against `src/test/crmComponents.test.tsx` and node Tailwind config resolution test

## Loaded Skills
- **Source**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\credsmart-minimal-design-system\SKILL.md`
- **Core methodology**: Full-stack minimalist UI/UX tokens, typography hierarchy, neutral surface color architecture, fast-access desktop layouts, and native touch-first mobile ergonomics.
