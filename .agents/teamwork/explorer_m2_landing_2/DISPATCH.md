# Dispatch: Explorer M2 Landing 2
Role: Dual-Suite Interactive Preview Dock Explorer (HeroDashboardCard.tsx)
Assigned Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_landing_2
Parent: 4ca3c226-daa7-4621-95f6-7c629c003e5f
## 2026-10-31T12:14:58Z

[Message] timestamp=2026-10-31T12:14:58Z sender=4ca3c226-daa7-4621-95f6-7c629c003e5f priority=MESSAGE_PRIORITY_HIGH content=You are Explorer M2 Landing 2 (teamwork_explorer) for CredSmart.

Your assigned working directory is:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_landing_2

Your Parent Agent (Orchestrator) is:
4ca3c226-daa7-4621-95f6-7c629c003e5f

Read the authoritative user request first:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md

Read the project blueprint and master design standards:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\credsmart-landing-design\SKILL.md
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\credsmart-minimal-design-system\SKILL.md

Target File:
`src/components/public/HeroDashboardCard.tsx`

Your Mission:
Investigate and design the technical blueprint for the Dual-Suite Interactive Preview Dock in `src/components/public/HeroDashboardCard.tsx`:
1. Source Code Inspection:
   - Read and analyze `src/components/public/HeroDashboardCard.tsx`. Identify current mockup contents, styling, interactive state, and dimensions.
2. Dual-Suite Interactive Dock Architecture:
   - Design an interactive tabbed segmented control:
     `[ 🛒 Retail POS & Billing ]` | `[ 👥 Workforce CRM ]`
   - **View A: Retail POS Billing Terminal Mockup**:
     - Modern fast-billing workbench: Barcode scan input, active customer cart items with prices formatted in tabular monospace font (`font-mono tabular-nums`), GST tax breakdown, and quick payment tender buttons.
   - **View B: Workforce CRM Operations Board Mockup**:
     - Operations dashboard: Real-time staff attendance ledger with GPS geofence indicators, field task dispatch board, lead stage kanban pills, and automated daily sales/attendance stats in tabular monospace font (`font-mono tabular-nums`).
3. Minimal Design System Conformance:
   - Crisp 1px hairline borders (`border-slate-200/80` light, `border-slate-800` dark).
   - Clean neutral surfaces (`bg-white` light, `bg-slate-900` dark) with subtle micro-shadow (`shadow-xs` / `shadow-sm`).
   - Zero glowing neon halos, skeuomorphic bevels, or distorted glass reflections.
   - Screen-fitted dimensions: Total card height should be capped (~420px–460px) to comfortably fit standard 1080p and 768p monitor viewports alongside the Hero left column.
4. Non-Regression & Verification:
   - Confirm that existing unit tests (`publicShellComponents.test.tsx`, `publicPages.e2e.test.tsx`) continue to pass or document any required mock updates.
   - Verify that all 19 quarantined invoice files are 100% untouched (`node .agents/teamwork/auditor_m3/verify_protected.cjs`).

Deliverable:
Write a comprehensive handoff report to:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_landing_2\handoff.md`
Provide complete JSX code blueprints, state definitions, sub-components, and styling tokens for the Worker.
When finished, notify parent via `send_message`.
## 2026-10-31T12:25:31Z

[Message] timestamp=2026-10-31T12:25:31Z sender=4ca3c226-daa7-4621-95f6-7c629c003e5f priority=MESSAGE_PRIORITY_HIGH content=**Context**: Milestone 2 Dual-Suite Preview Dock Exploration
**Content**: We observed that your reference implementation `proposed_HeroDashboardCard.tsx` has been generated and validated. Please finalize your handoff.md and send your completion message so we can proceed to Worker dispatch.
**Action**: Finalize handoff.md and report back.
