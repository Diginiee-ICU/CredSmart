# BRIEFING — 2026-10-24T00:07:00Z

## Mission
Decouple CredSmart into two distinct core product offerings: CredSmart POS & Billing (/billing/*) and CredSmart CRM (/crm/*) with route-isolated portals, dedicated navigation shells, independent sidebars, suite switcher, dual onboarding, and 100% backwards compatibility.

## 🔒 My Identity
- Archetype: orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_decouple
- Original parent: parent
- Original parent conversation ID: a9fd6fe6-a74c-4676-8151-9a06a6a2f29a

## 🔒 My Workflow
- **Pattern**: Project
- **Scope document**: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md
1. **Decompose**: Survey with 3 Explorers, synthesize feature inventory and architecture, decompose into 3-7 modular milestones + E2E Testing Track
2. **Dispatch & Execute**:
   - **Direct (iteration loop)**: M1 -> M2 -> M3 -> M4
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: At 16 spawns, write handoff.md, cancel crons, spawn successor
- **Work items**:
  1. Survey & Map Scope [done]
  2. PROJECT.md & TEST_INFRA.md Definition [done]
  3. E2E Testing Track (Tiers 1-4 Suite, TEST_READY.md) [done]
  4. Milestone 1: Route Architecture & Isolation (`/billing/*` & `/crm/*`) [done]
  5. Milestone 2: Navigation Shells, Dedicated Sidebars & Suite Switcher [in-progress: Explorers active]
  6. Milestone 3: Dual Portal Onboarding & Intelligent Entry Routing [pending]
  7. Milestone 4: Final Integration, 100% E2E Pass, Tier 5 Hardening & Forensic Audit [pending]
- **Current phase**: 2 (Milestone 2 Navigation Decoupling)
- **Current focus**: 3 Explorers formulating exact code blueprints for SuiteSwitcher.tsx, AppLayout.tsx, and AppSidebar.tsx

## 🔒 Key Constraints
- NEVER write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers to do so.
- NEVER investigate or explore the problem at the code level — dispatch Explorers for technical investigation.
- File editing tools ONLY for metadata/state files (.md) in .agents/teamwork/.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.
- Zero-collateral damage to POS billing, thermal invoice printing, GST calculation, and CRM database synchronization.
- Strictly preserve protected Create Invoice flows (MobileCreateInvoice.tsx, SalesInvoiceModal.tsx, AddItemModal.tsx, SelectPartyModal.tsx, EditItemModal.tsx).
- cmd /c npx tsc --noEmit and cmd /c npm run build must succeed without error.

## Current Parent
- Conversation ID: a9fd6fe6-a74c-4676-8151-9a06a6a2f29a
- Updated: 2026-10-24T00:00:52Z

## Key Decisions Made
- Milestone 1 signed off (100% pass across all tests, 2 Reviewers, 2 Challengers, Forensic Auditor CLEAN).
- Launched Milestone 2: dispatched 3 Explorers for SuiteSwitcher, AppLayout, and AppSidebar.

## Active Timers
- Heartbeat cron: task-201 (*/10 * * * *)
- Safety timer: none (covered by heartbeat cron)
- On succession: kill all timers before spawning successor
- On context truncation: run manage_task(Action="list") — re-create if missing

## Artifact Index
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md — Global Project Specification & Feature Inventory
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\TEST_INFRA.md — E2E Test Suite Infrastructure & Coverage Thresholds
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\TEST_READY.md — E2E Test Readiness & Coverage Report
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_decouple\GATE_STATUS.md — Gate Verdicts
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_decouple\progress.md — Liveness & Progress
