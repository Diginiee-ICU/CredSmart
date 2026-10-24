# BRIEFING — 2026-10-24T00:15:00Z

## Mission
Design the concrete architecture for `src/components/AppSidebar.tsx` to render dedicated navigation groups (`BILLING_NAV_ROUTES` vs `CRM_NAV_ROUTES`) and adaptive mobile bottom docks for Milestone 2.

## 🔒 My Identity
- Archetype: explorer
- Roles: Read-only investigation, architectural analysis, synthesis, structured handoff reporting
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_decouple_3
- Original parent: 8ac6491a-275d-4c1c-b664-961cd66511b1
- Milestone: Milestone 2 — Dedicated Navigation Shells & Adaptive Mobile Bottom Docks

## 🔒 Key Constraints
- Read-only investigation — do NOT implement directly in `src/`
- Strictly preserve regex string literals required by `src/test/mobileErgonomicsChallenger.test.ts`
- Zero CRM clutter in POS & Billing navigation; zero billing clutter in CRM navigation
- Retain backward compatibility and cashier role permission logic
- Verify against `src/test/e2e/decoupleShells.test.tsx` and `src/test/crmShellRoutes.test.ts`

## Current Parent
- Conversation ID: 8ac6491a-275d-4c1c-b664-961cd66511b1
- Updated: 2026-10-24T00:06:53Z

## Investigation State
- **Explored paths**:
  - `src/components/AppSidebar.tsx`
  - `src/config/routes.ts`
  - `src/components/routes.ts`
  - `src/components/AppLayout.tsx`
  - `src/test/mobileErgonomicsChallenger.test.ts`
  - `src/test/e2e/decoupleShells.test.tsx`
  - `src/test/crmShellRoutes.test.ts`
  - `PROJECT.md` & `ORIGINAL_REQUEST.md` (§R2)
  - `explorer_survey_shells/handoff.md`
- **Key findings**:
  - `BILLING_NAV_ROUTES` and `CRM_NAV_ROUTES` are already defined and exported from `src/config/routes.ts`.
  - `AppSidebar.tsx` currently imports `NAV_ROUTES` (which aliases `MAIN_NAV_ROUTES`).
  - Active suite is dynamically derived via `location.pathname.startsWith("/crm") ? "crm" : "billing"` and synchronized with `localStorage` and `credsmart:suite_changed`.
  - `src/test/mobileErgonomicsChallenger.test.ts` invariants: comment `Mobile: Bottom Navigation Dock`, 4+ `min-h-[44px]`, `w-[52px] h-[52px]`, `pb-[max(0.65rem,env(safe-area-inset-bottom,0px))]`, and `fixed bottom-0 left-0 right-0 z-50`.
  - Cashier permissions verified: all 5 billing tabs are rendered in the bottom dock.
  - Vitest test suite verified: 81/81 tests passing across `mobileErgonomicsChallenger.test.ts`, `decoupleShells.test.tsx`, and `crmShellRoutes.test.ts`.
- **Unexplored areas**: None.

## Key Decisions Made
- Architecture for `AppSidebar.tsx` dynamically selects between `BILLING_NAV_ROUTES` and `CRM_NAV_ROUTES` based on current suite.
- Adaptive Mobile Bottom Dock dynamically switches:
  - If `isCrmSuite`: 5 CRM tabs (Command, Attendance, Center Elevated Punch/Task, Payroll, Roles).
  - If `!isCrmSuite`: 5 Billing tabs (Home, Sales, Center Elevated POS Billing, Items, Purchases).
- Retained exact styling, safe-area inset classes, and comment markers for 100% test preservation.
- Produced production-ready `proposed_AppSidebar.tsx` and comprehensive `handoff.md`.

## Artifact Index
- `DISPATCH.md` — Task definition from orchestrator
- `BRIEFING.md` — Persistent situational memory
- `progress.md` — Liveness heartbeat
- `proposed_AppSidebar.tsx` — Complete drop-in code recommendation for Worker M2
- `handoff.md` — 5-component self-contained report
