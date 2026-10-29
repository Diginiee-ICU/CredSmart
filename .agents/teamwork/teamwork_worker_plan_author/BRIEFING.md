# BRIEFING — 2026-10-30T01:21:45Z

## Mission
Author the definitive, production-grade integration and migration plan for the CRM Integration project and write it directly to `CRM_INTEGRATION_PLAN.md`.

## 🔒 My Identity
- Archetype: teamwork_worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\teamwork_worker_plan_author
- Original parent: 9748749b-91ae-4c8c-9c53-2b946c42ea38
- Milestone: Integration & Migration Plan Authoring

## 🔒 Key Constraints
- Comprehensive, highly actionable, engineering-rigorous master plan.
- Must cover all 4 core requirements (R1, R2, R3, R4) and quality assurance protocols.
- Dual-backend isolation: POS (Ubuntu API: https://api.credsmart.online) vs Lovable CRM (Supabase Cloud: https://wqllixoghlxvapmziilk.supabase.co).
- Decommission 88 obsolete CRM files in CredSmart without touching POS/Billing or protected invoice files.
- Full inventory of Lovable CRM assets to migrate into `src/crm/`.
- Cold Launch Hub (`<ColdLaunchHub />`) with cold-boot detection, hardware back button hierarchy, workspace switcher.
- Strict adherence to CredSmart Minimal Design System tokens and zero regression rule.
- Do NOT cheat, fabricate, or hardcode dummy implementations.

## Current Parent
- Conversation ID: 9748749b-91ae-4c8c-9c53-2b946c42ea38
- Updated: not yet

## Task Summary
- **What to build**: Master CRM Integration and Migration Plan (`CRM_INTEGRATION_PLAN.md`) and Handoff Report (`handoff.md`).
- **Success criteria**: Exhaustive, production-grade architectural and execution roadmap covering all 6 mandatory sections.
- **Interface contracts**: PROJECT.md, ORIGINAL_REQUEST.md, 3 Explorer handoff reports.
- **Code layout**: Minimal-design-system compliant, strict domain separation (`src/` vs `src/crm/`).

## Key Decisions Made
- Authored `CRM_INTEGRATION_PLAN.md` with full specifications for all 88 files to delete, decoupling of `BillingLockdownGuard.tsx`, Lovable CRM placement under `src/crm/`, real Supabase client pointing to `wqllixoghlxvapmziilk.supabase.co`, storage isolation matrix, cold launch hub and hardware back button hierarchy, 6-phase execution sequence, and verification protocols.

## Artifact Index
- `CRM_INTEGRATION_PLAN.md` — Definitive Master Plan
- `handoff.md` — Handoff report following 5-component standard

## Change Tracker
- **Files modified**: `CRM_INTEGRATION_PLAN.md` (authored master plan)
- **Build status**: Ready for phase execution
- **Pending issues**: None

## Quality Status
- **Build/test result**: Document authoring verified
- **Lint status**: Clean
- **Tests added/modified**: Test strategies and suites outlined in plan

## Loaded Skills
- **Source**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md`
- **Core methodology**: Minimal & Fast-Access Design System rules (proportions, screen-fitted viewports, tabular monospace, dual-backend isolation, zero regression).
