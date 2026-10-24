# BRIEFING — 2026-10-23T22:28:00Z

## Mission
Investigate and design exact code edits for `src/config/routes.ts` implementing Milestone 1: Route Architecture & Isolation (`/billing/*` and `/crm/*`), preserving backward compatibility for `MAIN_NAV_ROUTES` while introducing `BILLING_NAV_ROUTES` and `CRM_NAV_ROUTES`.

## 🔒 My Identity
- Archetype: explorer
- Roles: route architecture investigation, typescript types and navigation design, handoff synthesis
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_decouple_1
- Original parent: 8ac6491a-275d-4c1c-b664-961cd66511b1
- Milestone: Milestone 1 - Route Architecture & Isolation

## 🔒 Key Constraints
- Read-only investigation — do NOT implement (do not edit source code directly)
- Must adhere strictly to ORIGINAL_REQUEST.md and PROJECT.md specifications
- Must preserve and export `MAIN_NAV_ROUTES` for backward compatibility with `src/test/crmShellRoutes.test.ts`
- Must provide exact TypeScript types, exports, and path constants for `BILLING_NAV_ROUTES` and `CRM_NAV_ROUTES`
- Must provide concrete, line-by-line recommendations for Worker M1

## Current Parent
- Conversation ID: 8ac6491a-275d-4c1c-b664-961cd66511b1
- Updated: not yet

## Investigation State
- **Explored paths**: `src/config/routes.ts`, `src/components/routes.ts`, `src/App.tsx`, `src/test/crmShellRoutes.test.ts`, `src/test/crmShellNavigation.audit.test.ts`, `src/test/example.test.ts`, `ORIGINAL_REQUEST.md`, `PROJECT.md`, `explorer_survey_routes/handoff.md`
- **Key findings**:
  1. `ROUTE_PATHS` currently defines 37 billing/ERP routes at root (`/dashboard`, `/pos`, `/sales`, etc.) and 10 CRM routes under `/crm/*`.
  2. All 37 billing/ERP routes must be mapped to `/billing/*`, while CRM routes remain strictly `/crm/*`. `billing: "/billing"` root must be added.
  3. `src/test/crmShellRoutes.test.ts` Suite 4 and `src/test/crmShellNavigation.audit.test.ts` Suite 3 enforce that `MAIN_NAV_ROUTES` has a `"BUSINESS TOOLS"` group with item `"CRM"` containing exactly 9 children. `MAIN_NAV_ROUTES` and `NAV_ROUTES` alias must be preserved verbatim.
  4. `src/components/routes.ts` re-exports `* from "@/config/routes"`. All new exports from `routes.ts` are automatically present and equality-checked by tests.
  5. `isRouteAllowedForRole` should include path normalization (`normalizeRouteForRbac`) to handle both `/billing/*` and legacy path queries.
  6. Designed `BILLING_NAV_ROUTES` (4 groups, zero CRM clutter) and `CRM_NAV_ROUTES` (2 groups, all 9 CRM tools, zero billing clutter).
  7. Formatted full proposal in `proposed_routes.ts`.
- **Unexplored areas**: None. Complete investigation of `src/config/routes.ts` is achieved.

## Key Decisions Made
- Preserved `MAIN_NAV_ROUTES` and `NAV_ROUTES` for 100% test pass and backward compatibility.
- Designed `BILLING_NAV_ROUTES` and `CRM_NAV_ROUTES` typed as `NavRouteGroup[]`.
- Formulated `LEGACY_ROUTE_REDIRECTS` containing all 36 legacy-to-billing mappings.
- Created `proposed_routes.ts` as drop-in blueprint for Worker M1.

## Artifact Index
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_decouple_1\DISPATCH.md` — Dispatch directives
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_decouple_1\proposed_routes.ts` — Full proposed code for `src/config/routes.ts`
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_decouple_1\handoff.md` — Handoff report with 5 mandatory components
