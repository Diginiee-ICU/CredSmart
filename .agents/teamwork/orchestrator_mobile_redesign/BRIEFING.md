# BRIEFING — 2026-10-21T00:17:00Z

## Mission
Execute a complete from-scratch mobile view redesign of the CredSmart ERP & POS application following a Clean High-Density Retail Minimal (Stripe / Shopify POS) aesthetic with strict 100% desktop invariance and 100% test pass.

## 🔒 My Identity
- Archetype: orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_mobile_redesign
- Original parent: Sentinel
- Original parent conversation ID: 3b90584f-11d3-4ec4-9a29-8affff134fe0

## 🔒 My Workflow
- **Pattern**: Project Pattern (Survey -> Decompose & Delegate -> Dual Track [Implementation + E2E Testing])
- **Scope document**: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_mobile_redesign\PROJECT.md
1. **Decompose**: Survey full scope with 3 Explorers/Spec Miners, build Feature Inventory, decompose into 3-7 milestones.
2. **Dispatch & Execute**:
   - Direct / Delegate: Sub-orchestrators for milestones, Dual Track with E2E Testing Orchestrator, Explorer -> Worker -> Reviewer -> Challenger -> Auditor iteration loop.
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: At 16 spawns, write handoff.md, cancel background tasks, spawn successor.
- **Work items**:
  1. Survey & Codebase Mapping [in-progress]
  2. Architecture & Milestone Decomposition [pending]
  3. Mobile Shell & Floating Navigation Dock [pending]
  4. Dashboard Mobile Experience & Financial Ledger [pending]
  5. POS Billing & High-Density Catalog Touch [pending]
  6. E2E Testing Track & Full Verification [pending]
- **Current phase**: 0 (Survey)
- **Current focus**: Surveying codebase and design requirements with 3 parallel explorers

## 🔒 Key Constraints
- NEVER write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers to do so.
- NEVER investigate or explore the problem at the code level — dispatch Explorers for technical investigation.
- Strict 100% desktop invariance (zero regression on desktop >= 768px).
- Clean High-Density Retail Minimal (Stripe / Shopify POS) design system.
- Zero tsc errors (`tsc --noEmit`).
- All 188+ Vitest test suites passing.
- Hard audit veto on integrity violations.
- Always pass ORIGINAL_REQUEST.md path to subagents.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.

## Current Parent
- Conversation ID: 3b90584f-11d3-4ec4-9a29-8affff134fe0
- Updated: 2026-10-21T00:15:00Z

## Key Decisions Made
- Follow Project Pattern with Survey phase (3 parallel explorers).
- Maintain all orchestrator state files in .agents/teamwork/orchestrator_mobile_redesign/.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_survey_shell | teamwork_preview_explorer | Global Shell, Navigation & Safe Areas | in-progress | 9a468527-6c2a-4615-b61a-93ef89256c60 |
| explorer_survey_dashboard | teamwork_preview_explorer | Dashboard Experience & Financial Ledger | in-progress | 7312e4aa-6c4c-4121-aef2-23bc26f335f3 |
| spec_miner_survey_pos_catalog | teamwork_preview_spec_miner | POS Billing, Invoices & Catalog Views | in-progress | 0e18f7a0-df7f-4f1f-a5d3-0a6160f5ea0d |

## Succession Status
- Succession required: no
- Spawn count: 3 / 16
- Pending subagents: 9a468527-6c2a-4615-b61a-93ef89256c60, 7312e4aa-6c4c-4121-aef2-23bc26f335f3, 0e18f7a0-df7f-4f1f-a5d3-0a6160f5ea0d
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: 92c8e148-9d89-47d7-9329-5f4887fd7091/task-20
- Safety timer: none
- On succession: kill all timers before spawning successor
- On context truncation: run manage_task(Action="list") — re-create if missing

## Artifact Index
- .agents/teamwork/orchestrator_mobile_redesign/DISPATCH.md — Dispatch instructions from parent
- .agents/teamwork/ORIGINAL_REQUEST.md — Original user request
- .agents/skills/mobile-erp-redesign/SKILL.md — Authoritative skill
- .agents/teamwork/orchestrator_mobile_redesign/plan.md — Orchestrator project plan
- .agents/teamwork/orchestrator_mobile_redesign/progress.md — Orchestrator progress & liveness
- .agents/teamwork/orchestrator_mobile_redesign/PROJECT.md — Global project scope & feature inventory
