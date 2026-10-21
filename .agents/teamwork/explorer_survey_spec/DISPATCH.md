# Dispatch: Survey - Requirements, Spec Mining & E2E Testing Architecture

## Objective
Extract the complete, authoritative specification from `ORIGINAL_REQUEST.md` (timestamp `2026-10-21T17:42:42Z`), analyze testing infrastructure across the codebase, and design the E2E and unit testing strategy for Staff User Provisioning and Enterprise CRM Task Management.

## Authoritative Inputs
- Read `ORIGINAL_REQUEST.md`: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (see timestamp `2026-10-21T17:42:42Z`)
- Skill guide: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\crm-rbac-skill\SKILL.md`
- Existing test suites: `src/test/crm*.test.*`, `src/test/`, `backend-api/test/` (if any), `vitest.config.ts`, `package.json`

## Investigation Scope
1. Enumerate all explicit and implicit requirements from `ORIGINAL_REQUEST.md` (timestamp `2026-10-21T17:42:42Z`):
   - Staff User Provisioning & Instant Role Assignment
   - Password auto-gen and custom password
   - Plaintext credentials copy dialog
   - Create Role dialog with staff assignment
   - Authentication verification via `/api/auth/login`
   - Enterprise Task Management (PostgreSQL, `/api/crm/tasks`, Kanban, Table, priority, due date, proof notes, manager approvals/revisions, metrics)
   - Zero TypeScript errors (`npm run build` / `tsc --noEmit`)
2. Examine the testing runner and environment:
   - How are Vitest tests run and configured?
   - How are Supabase/backend API calls mocked or tested in existing `src/test/` tests?
   - What test files already exist for CRM?
3. Design the 4-tier E2E testing framework plan (Tier 1: Feature Coverage, Tier 2: Boundary/Edge Cases, Tier 3: Cross-Feature Interactions, Tier 4: Real-world Workflows) for both Staff Provisioning & Tasks.

## Output
Write your comprehensive survey report to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_spec\survey_report.md` and complete your handoff.
