# BRIEFING — 2026-10-23T22:18:00Z

## Mission
Investigate authentication flow, post-login routing, organization setup, onboarding preferences, and build/test verification infrastructure for dual-portal decoupling (Billing vs CRM).

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, reporter
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_onboarding
- Original parent: 8ac6491a-275d-4c1c-b664-961cd66511b1
- Milestone: Survey & Onboarding / Routing Architecture Investigation

## 🔒 Key Constraints
- Read-only investigation — do NOT implement in source code
- Zero collateral damage to protected billing flows (`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, etc.)
- Only write in .agents/teamwork/explorer_survey_onboarding/
- Never place source code or data in .agents/teamwork/

## Current Parent
- Conversation ID: 8ac6491a-275d-4c1c-b664-961cd66511b1
- Updated: 2026-10-23T22:02:10Z

## Investigation State
- **Explored paths**:
  - `src/pages/Auth.tsx` (Sign in, multi-step onboarding, logo upload, pending onboarding)
  - `src/hooks/useAuth.tsx` & `src/hooks/useOrganization.tsx` (Session management, org provisioning, memberships, registry, local cache)
  - `src/App.tsx`, `src/config/routes.ts`, `src/components/routes.ts` (App router, ProtectedRoutes, RoleProtectedRoute, HomeRoute, AuthRoute, nav groups)
  - `src/components/AppLayout.tsx`, `src/components/AppSidebar.tsx` (Header, mega-menu, mobile bottom nav dock, modals)
  - `src/components/invoices/mobile/` & `src/components/SalesInvoiceModal.tsx` (5 protected invoicing files)
  - `package.json`, `tsconfig.json`, `tsconfig.app.json`, `vite.config.ts`, `vitest.config.ts`
  - Vitest test suites: `crmShellRoutes.test.ts`, `crmShellNavigation.audit.test.ts`, `crmChallengerM1_2.test.ts`, `billingLifecycleEngine.test.ts`
- **Key findings**:
  - Auth is unified in `src/pages/Auth.tsx` (there is no `Login.tsx`).
  - Post-login routing in `Auth.tsx`, `AuthRoute`, and `HomeRoute` hardcodes `membership?.role === "cashier" ? ROUTE_PATHS.checkout : ROUTE_PATHS.dashboard`.
  - Cashiers are strictly restricted from CRM via `RESTRICTED_ROUTES_FOR_CASHIER` in `routes.ts`.
  - Organization onboarding persists unauthenticated signup state via `credsmart_pending_onboarding_v1` in localStorage. Suite preference ("POS & Billing" vs "CRM" vs "Both") can be seamlessly stored in `PendingOnboardingData` and active suite in `credsmart_active_suite`.
  - `crmShellRoutes.test.ts` statically asserts regex patterns on `ProtectedRoutes` and `RoleProtectedRoute` in `src/App.tsx`. Any decoupling MUST maintain exact compliance with these regex assertions.
  - `crmChallengerM1_2.test.ts` Section 5 strictly verifies that 5 protected invoice files exist and exceed 1000 bytes.
  - Build and tests pass cleanly: `tsc --noEmit` exits with 0 errors, `vite build` builds in 2m 5s with 0 errors, Vitest test suites pass with 100% success rate.
- **Unexplored areas**: None within the scope of this survey mission.

## Key Decisions Made
- Architected suite preference flow integrating into `Auth.tsx` step 2/3 and `useOrganization.tsx`.
- Architected post-login and root (`/` and `/app`) routing strategy prioritizing deep links, cashier restrictions, and `credsmart_active_suite` fallback.
- Formulated strict guidelines for preserving all 5 protected billing files and satisfying static route tests.

## Artifact Index
- DISPATCH.md — Dispatch instructions and incoming messages
- BRIEFING.md — Persistent working memory
- progress.md — Liveness heartbeat
- handoff.md — Comprehensive 5-component handoff report
