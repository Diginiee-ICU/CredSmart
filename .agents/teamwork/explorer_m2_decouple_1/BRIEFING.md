# BRIEFING — 2026-10-24T00:16:00Z

## Mission
Design the concrete implementation of `src/components/SuiteSwitcher.tsx` and the `useActiveSuite()` hook for Milestone 2.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_decouple_1
- Original parent: 8ac6491a-275d-4c1c-b664-961cd66511b1
- Milestone: Milestone 2 — Shell Decoupling

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Design concrete implementation for `src/components/SuiteSwitcher.tsx` and `useActiveSuite()` hook
- Write report to handoff.md and report completion back to parent via send_message
- Cashier guard: cashiers restricted from CRM, see only POS & Billing

## Current Parent
- Conversation ID: 8ac6491a-275d-4c1c-b664-961cd66511b1
- Updated: 2026-10-24T00:16:00Z

## Investigation State
- **Explored paths**:
  - `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (§R2)
  - `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md`
  - `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_shells\handoff.md`
  - `src/App.tsx`, `src/config/routes.ts`, `src/components/AppLayout.tsx`, `src/components/AppSidebar.tsx`
  - `src/hooks/useOrganization.tsx`
  - `src/test/e2e/decoupleShells.test.tsx` and `src/test/e2e/decoupleIntegration.test.tsx` (199/199 tests passing)
- **Key findings**:
  - `useActiveSuite()` hook specification must support `activeSuite`, `setActiveSuite`, `switchSuite`, `isBilling`, `isCrm`.
  - Must synchronize with `localStorage` (`credsmart_active_suite`), window event `credsmart:suite_changed`, and cross-tab storage event.
  - `SuiteSwitcher` must provide accessible ARIA radio group semantics, amber (billing) and emerald (crm) styles, keyboard navigation (Enter/Space), and test IDs (`suite-btn-billing`, `suite-btn-crm`, `active-suite-badge-billing`, `active-suite-badge-crm`).
  - Cashier Guard: cashiers (`useOrganization().userRole === 'cashier'`) are strictly prevented from viewing the switcher and restricted from accessing CRM.
  - Router-aware composition: cleanly separates `RouterSuiteSwitcher` (using `useInRouterContext()`, `useLocation`, `useNavigate`) and `StandaloneSuiteSwitcher` for 100% test and production safety without React hook violations.
- **Unexplored areas**: None. Design is concrete and fully validated against test invariants.

## Key Decisions Made
- Architecture composed of two core files: `src/hooks/useActiveSuite.ts` and `src/components/SuiteSwitcher.tsx`.
- Defense-in-depth cashier guard applied both in `SuiteSwitcher` and in `AppLayout.tsx`.
- Drop-in recommendations prepared for Worker M2 covering layout placement, route syncing, and mobile dock adaptation.

## Artifact Index
- DISPATCH.md — Task assignment and instructions
- BRIEFING.md — Persistent working memory
- progress.md — Liveness heartbeat
- handoff.md — Final 5-component handoff report
