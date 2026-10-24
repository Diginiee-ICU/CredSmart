# BRIEFING — 2026-10-24T00:12:45Z

## Mission
Design the concrete integration of `SuiteSwitcher.tsx` into `src/components/AppLayout.tsx`, header title/subtitle adaptation, quick-action switching, and strict preservation of regex constraints in existing test suites.

## 🔒 My Identity
- Archetype: explorer
- Roles: read-only investigation, architectural synthesis, concrete code specification
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_decouple_2
- Original parent: 8ac6491a-275d-4c1c-b664-961cd66511b1
- Milestone: M2 Decouple - AppLayout Header & Viewport Shell Integration

## 🔒 Key Constraints
- Read-only investigation — do NOT implement directly in `src/`
- Strictly preserve regex string literals required by `src/test/mobileErgonomicsChallenger.test.ts`:
  - `flex flex-col h-screen w-full overflow-hidden`
  - `flex-1 min-w-0 flex flex-col`
  - `isMobile && !isPosRoute && "pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"`
  - `isMobile && isPosRoute && "pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))]"`
- Preserve desktop layout and existing responsive behavior
- Respect CRM RBAC / permission boundaries if applicable

## Current Parent
- Conversation ID: 8ac6491a-275d-4c1c-b664-961cd66511b1
- Updated: 2026-10-24T00:12:45Z

## Investigation State
- **Explored paths**: `src/components/AppLayout.tsx`, `src/config/routes.ts`, `src/test/mobileErgonomicsChallenger.test.ts`, `src/test/m2GrepAstChallenger.test.ts`, `src/test/e2e/decoupleShells.test.tsx`, `src/test/crmShellRoutes.test.ts`, `src/test/crmShellNavigation.audit.test.ts`
- **Key findings**:
  1. `<SuiteSwitcher />` integrates directly into the top header left container next to the logo and toggle chevron button.
  2. Brand logo destination dynamically links to `isCrmSuite ? ROUTE_PATHS.crm : ROUTE_PATHS.billing`.
  3. Header title/subtitle adapts across all 9 CRM submodules and all POS/ERP billing modules.
  4. Header action buttons adapt: Tally Import + New Invoice (amber) for Billing; "+ Quick Action" (blue/indigo) for CRM.
  5. Exact regex string literals in `AppLayout.tsx` are documented for line-by-line preservation.
- **Unexplored areas**: None. Investigation complete.

## Key Decisions Made
- Fully specified concrete drop-in code snippets and diffs for Worker M2.
- Verified test suite pass rate (59/59 in `mobileErgonomicsChallenger` + `decoupleShells`, 30/30 in CRM shell suites).

## Artifact Index
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_decouple_2\progress.md` — Liveness heartbeat
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_decouple_2\handoff.md` — 5-component handoff report
