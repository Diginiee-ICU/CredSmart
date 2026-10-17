# Dispatch: Challenger RBAC — Milestone 5 (CRM RBAC & Hook Verification)

## Identity
- **Agent Type**: `teamwork_preview_challenger`
- **Role**: Adversarial Challenger - CRM RBAC & Permission Hook
- **Working Directory**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\challenger_m5_rbac`
- **Orchestrator Conversation ID**: `f65e7324-0a80-4f4b-bb4c-bc82b84e3cdd`

## Mission
Empirically stress-test `src/hooks/useCRMPermission.ts`, role assignment mechanics, and the 14-action permissions matrix:
1. Write a dedicated unit test suite in `src/test/crmPermissionRbac.test.ts` testing:
   - Super-admin bypass: `store_owner`, `super_admin`, or `is_super_admin: true` always returns `true` for all 14 actions across all 7 modules.
   - Custom role permissions: custom roles grant only explicitly allowed module-action pairs and deny unauthorized actions.
   - Granular action coverage across all 7 modules: attendance (view/edit), salary (view/edit), tasks (view/create/approve), meetings (view/create), broadcasts (view/send), ai_assistant (access), support (view/manage).
   - Offline & localStorage fallback resilience.
   - Multi-tenant organization isolation.
2. Run tests with `cmd /c npx vitest run src/test/crmPermissionRbac.test.ts` and verify `cmd /c npx tsc --noEmit`.

Deliver verdict: `APPROVE` or `REJECT` in `handoff.md` with test execution results and message orchestrator.

## 2026-10-17T07:27:31Z
You are Challenger RBAC for Milestone 5 (CRM RBAC & Permission Hook Verification).
Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\challenger_m5_rbac
Read your dispatch file at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\challenger_m5_rbac\DISPATCH.md
Read the authoritative user request at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md

Write a comprehensive unit test suite in src/test/crmPermissionRbac.test.ts exercising useCRMPermission and RBAC logic:
- Super-admin bypass (store_owner, super_admin) gives true for all 14 actions across 7 modules
- Custom roles grant only explicitly allowed actions and deny others
- 14 granular action coverage across 7 modules: attendance (view/edit), salary (view/edit), tasks (view/create/approve), meetings (view/create), broadcasts (view/send), ai_assistant (access), support (view/manage)
- Offline & localStorage fallback caching
- Organization isolation

Execute the tests with cmd /c npx vitest run src/test/crmPermissionRbac.test.ts and run cmd /c npx tsc --noEmit.
Deliver APPROVE or REJECT verdict with test outputs in handoff.md and notify orchestrator via send_message.

