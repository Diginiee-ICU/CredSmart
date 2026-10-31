# BRIEFING — 2026-10-31T12:25:00Z

## Mission
Investigate and design technical blueprint for the Dual-Suite Interactive Preview Dock in `src/components/public/HeroDashboardCard.tsx`.

## 🔒 My Identity
- Archetype: teamwork_explorer
- Roles: Explorer, Architectural Designer
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_landing_2
- Original parent: 4ca3c226-daa7-4621-95f6-7c629c003e5f
- Milestone: M2 Landing Design Redesign

## 🔒 Key Constraints
- Read-only investigation — do NOT implement directly into `src/components/public/HeroDashboardCard.tsx`
- Enforce Minimal & Fast-Access Design System rules (1px hairline borders, compact proportions, tabular monospace for numbers, screen-fitted height 420-460px)
- Strictly preserve protected quarantined invoice files (19 files untouched)
- Zero regression on existing public shell and public pages e2e tests
- Deliver comprehensive handoff with complete JSX code blueprints, state definitions, sub-components, and styling tokens

## Current Parent
- Conversation ID: 4ca3c226-daa7-4621-95f6-7c629c003e5f
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `src/components/public/HeroDashboardCard.tsx`
  - `src/pages/Landing.tsx`
  - `src/test/e2e/publicPages.e2e.test.tsx` (all 59 tests verified passing)
  - `src/test/publicShellComponents.test.tsx` (all 18 tests verified passing)
  - `.agents/teamwork/auditor_m3/verify_protected.cjs` (19/19 quarantined files verified untouched)
  - Design token systems in `.agents/rules/minimal-design-system.md` and `.agents/skills/`
- **Key findings**:
  - Current `HeroDashboardCard.tsx` displays only ERP/Billing features; Workforce CRM is completely absent from the Hero card.
  - Test suites enforce specific DOM text: `LIVE RECONCILED`, `Recent Reconciled Activity`, `Auto-Synced Cloud Ledger`, `CredSmart v1.1.4`, sidebar buttons `POS Billing`, `Sales`, `Items / Inventory`, and metric tiles `TO COLLECT`, `TO PAY`, `CASH & BANK`.
  - The blueprint design maintains default `activeSuite = "pos"` with all required test elements while introducing the interactive Dual-Suite Segmented Control (`[ 🛒 Retail POS & Billing ]` | `[ 👥 Workforce CRM ]`).
  - View A features modern fast-billing workbench: Barcode scan input (F2/⌘K), active cart line items with `font-mono tabular-nums`, GST (CGST+SGST) tax breakdown, and quick tender buttons (Cash F4, UPI F6, Card F7, Udhar).
  - View B features Workforce CRM Operations Board: Staff attendance ledger with GPS geofence indicator, field task dispatch board with ETA, lead stage kanban pills, and automated daily sales & attendance stats.
  - Screen containment: Total card height capped at ~440px–460px with crisp 1px hairline borders and subtle micro-shadows.
- **Unexplored areas**: Implementation handoff to Worker agent.

## Key Decisions Made
- Authored reference implementation in `proposed_HeroDashboardCard.tsx` and validated TypeScript compiler (`tsc --noEmit` exited 0).
- Fully documented 5-component handoff report.

## Artifact Index
- DISPATCH.md — Incoming parent dispatch
- BRIEFING.md — Situational awareness
- progress.md — Liveness heartbeat
- proposed_HeroDashboardCard.tsx — Complete reference JSX component
- handoff.md — 5-component handoff report
