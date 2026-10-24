# Orchestration Plan: CredSmart Decoupling

## Objective
Architecturally and visually decouple CredSmart into two distinct core product offerings:
(1) CredSmart POS & Billing (`/billing/*`)
(2) CredSmart CRM (`/crm/*`)
with route-isolated portals, dedicated navigation shells, independent sidebars, separate onboarding entry points, and an intuitive top-level Suite Switcher, while preserving 100% backwards compatibility and sharing a unified authentication and organization layer.

## Methodology & Pattern
Project Pattern with Dual Track Architecture:
- Top-Level Orchestrator sets scope via Survey (Phase 0).
- Implementation Track decomposes features into modular milestones (Routing, Navigation Shells, Onboarding & Entry, Verification).
- E2E Testing Track independently designs opaque-box test suites (Tiers 1-4) across both portals.
- Final Milestone validates 100% passing E2E tests, zero regressions in existing tests, clean `tsc --noEmit`, clean `npm run build`, followed by Forensic Integrity Audit.

## Survey Strategy (Phase 0)
Dispatch 3 Explorers in parallel:
1. `explorer_survey_routes`: Analyze existing routes in `App.tsx`, navigation links, redirects, route guards, and legacy URLs (`/pos`, `/sales`, `/items`, `/inventory`, `/customers`, `/dashboard`).
2. `explorer_survey_shells`: Analyze existing layouts, `Layout.tsx`, sidebars, top headers, mobile bottom dock, quick action drawers, and how to implement dedicated POS & Billing vs CRM shells and persistent Suite Switcher.
3. `explorer_survey_onboarding`: Analyze onboarding flow, post-login routing, auth context, organization preferences, and entry point resolution (`/`, `/app`).
