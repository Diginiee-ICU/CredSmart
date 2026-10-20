# BRIEFING — 2026-10-20T11:05:00Z

## Mission
Implement Milestone 1 (M1) — Live Database Schema Alignment & Idempotent `fix_db.sql` at root and in `backend-api/fix_db.sql`, with unit and contract tests in `src/test/fixDbSchema.test.ts`.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1
- Original parent: 73ee3452-ffda-43b4-83da-c3ca2006c47f
- Milestone: M1: Centralized API Client & Auth Interceptor
- Active Parent ID: 47768107-cdc6-46b5-a415-7ea52564fffb
- Active Milestone: M1: Live Database Schema Alignment & Idempotent fix_db.sql

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

## Current Parent
- Conversation ID: 47768107-cdc6-46b5-a415-7ea52564fffb
- Updated: 2026-10-20T11:05:00Z

## Task Summary
- **What to build**: Production-grade idempotent `fix_db.sql` at root and in `backend-api/fix_db.sql`, and comprehensive verification tests in `src/test/fixDbSchema.test.ts`.
- **Success criteria**: All 42 tables covered with dual columns and bidirectional sync triggers, complete 20 party fields with safe defaults, all performance indexes present, and 100% test pass rate in `src/test/fixDbSchema.test.ts`.
- **Interface contracts**: `SCOPE.md`, `ORIGINAL_REQUEST.md:758-777`, `explorer_survey_1/handoff.md`.
- **Code layout**: Root `fix_db.sql`, `backend-api/fix_db.sql`, `src/test/fixDbSchema.test.ts`.

## Key Decisions Made
- Adopting Explorer Survey 1's PL/pgSQL BEFORE INSERT OR UPDATE trigger architecture (`sync_org_id_and_organization_id`) to ensure in-memory, zero-query bidirectional replication between `org_id` and `organization_id`.
- Covering all 42 tenant-scoped tables identified in the comprehensive database audit.
- Mirroring identical idempotent SQL code in root `fix_db.sql` and `backend-api/fix_db.sql`.
- Authoring exhaustive schema contract and trigger logic unit tests in `src/test/fixDbSchema.test.ts`.

## Artifact Index
- `fix_db.sql` — Root master migration script
- `backend-api/fix_db.sql` — Mirrored backend migration script
- `src/test/fixDbSchema.test.ts` — Comprehensive validation test suite
- `.agents/teamwork/worker_m1/handoff.md` — Handoff report

## Change Tracker
- **Files modified**:
  - `fix_db.sql`: Created root database alignment script with universal bidirectional trigger, 42 tenant-scoped tables, 20 party columns, and composite B-tree indexes.
  - `backend-api/fix_db.sql`: Mirrored full 42-table trigger, schema, and index alignment.
  - `src/test/fixDbSchema.test.ts`: Authored comprehensive test suite (398 tests) verifying all 42 tables, party columns, indexes, trigger logic simulation, and statistics recomputation.
- **Build status**: Pass (`tsc --noEmit` exited 0; 398/398 fixDbSchema tests passed; 53/53 apiClient tests passed)
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pass (398/398 tests passing in 5.30s; `tsc --noEmit` passed with 0 errors)
- **Lint status**: 0 violations
- **Tests added/modified**: 398 validation tests in `src/test/fixDbSchema.test.ts`

## Loaded Skills
- None specified for M1


