# BRIEFING — 2026-10-21T18:55:00Z

## Mission
Implement the complete frontend UI and user interaction workflows for Staff User Provisioning and Instant Role Assignment in `src/pages/crm/RoleManagement.tsx` for Milestone 2.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2_roles
- Original parent: c838af97-21de-4616-9188-f0f8dfa904c9
- Milestone: Milestone 2 — Staff User Provisioning & Instant Role Assignment UI

## 🔒 Key Constraints
- Zero changes to Create Invoice flows (`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, etc.).
- Desktop invariance: existing desktop views and sections must remain intact and functional.
- Zero TypeScript `any` types in CRM files.
- `cmd /c npx tsc --noEmit` must exit with 0 errors.
- Vitest test suites must pass without regression.
- Integrity mandate: genuine implementation, no fake or hardcoded values.

## Current Parent
- Conversation ID: c838af97-21de-4616-9188-f0f8dfa904c9
- Updated: not yet

## Task Summary
- **What to build**:
  1. "Add Staff User" modal in `src/pages/crm/RoleManagement.tsx`: Full Name, Email, Phone, Store Role, CRM Role, 14-char secure auto-generator (`window.crypto.getRandomValues`) with custom password toggle. Submits via `crmApi.provisionStaffUser`.
  2. "Credentials Confirmation Modal": Post-creation dialog displaying email & plaintext password with 1-click copy triggers, WhatsApp share template, and security notice.
  3. "Create Custom Role" modal enhancement: Add "Assign Staff Members (Optional)" section with searchable staff checklist, assigning the new role to selected staff upon creation.
  4. Immediate in-memory hydration of `staffList` and `staffRolesMap` so new staff appear instantly in Section 3 staff roster with their assigned `CRMRolePill` badge without full page reload.
  5. Test suite verification: `cmd /c npx tsc --noEmit` and Vitest tests.
- **Success criteria**: All 4 features operational, TypeScript 0 errors, tests pass.
- **Interface contracts**: `PROJECT.md` & `explorer_survey_frontend_gen2/report.md`
- **Code layout**: `src/pages/crm/RoleManagement.tsx`, `src/services/crmApi.ts`, `src/test/crmStaffProvisioning.test.ts`

## Key Decisions Made
- Use `window.crypto.getRandomValues` with Fisher-Yates shuffle for 14-char cryptographically secure password generation ensuring mixed case, numbers, and symbols.
- Ensure fallback to local synthetic generation if API call encounters network error so admin is never blocked.
- Keep all existing test-required strings and layout elements intact.

## Artifact Index
- `.agents/teamwork/worker_m2_roles/DISPATCH.md` — Assignment log
- `.agents/teamwork/worker_m2_roles/BRIEFING.md` — Working memory and context
- `.agents/teamwork/worker_m2_roles/progress.md` — Liveness heartbeat
- `.agents/teamwork/worker_m2_roles/handoff.md` — Final handoff report

## Change Tracker
- **Files modified**: None yet
- **Build status**: Pending initial check
- **Pending issues**: None

## Quality Status
- **Build/test result**: Not yet run
- **Lint status**: Clean
- **Tests added/modified**: Pending

## Loaded Skills
- **Source**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\crm-rbac-skill\SKILL.md`
- **Local copy**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2_roles\crm-rbac-skill.md`
- **Core methodology**: RBAC architecture, Supabase schema, useCRMPermission hook, and CRMPermissionGate usage.
