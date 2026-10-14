# BRIEFING — 2026-10-13T20:03:00Z

## Mission
Orchestrate the master GST invoice redesign in CredSmart to match the enterprise visual specification in `Correction/New folder/New Invoice.jpeg` across web invoice previews and single-page PDF generation with zero regressions.

## 🔒 My Identity
- Archetype: teamwork_preview_orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_invoice
- Original parent: Sentinel
- Original parent conversation ID: 83781f15-58a9-4d25-8298-8e4f475957da

## 🔒 My Workflow
- **Pattern**: Project Pattern (Dual Track: Implementation + E2E Testing)
- **Scope document**: c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_invoice\PROJECT.md
1. **Decompose**: Survey codebase and visual specifications via 3 Explorers in parallel. Enumerate features, constraints, component architecture, and dependencies. Decompose into modular milestones and opaque-box E2E test suite.
2. **Dispatch & Execute**:
   - **Direct (iteration loop)**: For each milestone, execute Explorer (3) -> Worker (1) -> Reviewer (2) -> Challenger (2) -> Auditor (1) -> Gate.
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (last resort)
4. **Succession**: At 16 spawns, write handoff.md, cancel crons, spawn successor.
- **Work items**:
  1. Survey & Architecture Discovery [done]
  2. E2E Test Suite & Infrastructure [done]
  3. Invoice Component Visual Redesign [in-progress]
  4. PDF Single-Page & Print Engine Parity [pending]
  5. Multi-Document Compatibility & System Verification [pending]
  6. Final Milestone: 100% E2E Test Pass & Adversarial Hardening [pending]
- **Current phase**: 2 (Milestone 2)
- **Current focus**: 3. Invoice Component Visual Redesign

## 🔒 Key Constraints
- NEVER write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers to do so.
- NEVER investigate or explore at the code level — dispatch Explorers for technical investigation.
- Use file-editing tools ONLY for metadata/state files (.md) in your .agents/teamwork/ folder.
- Auditor INTEGRITY VIOLATION is a non-negotiable binary veto.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.
- Preserve backward compatibility across all invoice types and multi-unit calculations.

## Current Parent
- Conversation ID: 83781f15-58a9-4d25-8298-8e4f475957da
- Updated: 2026-10-13T21:58:50Z

## Key Decisions Made
- Initialized Project Orchestrator with Project Pattern dual track.
- Phase 0 Survey complete: Feature Inventory (F1–F15) documented in PROJECT.md.
- Milestone 1 E2E Test Suite complete: authored unifiedInvoiceRenderer.test.tsx & downloadExactInvoice.test.ts, published TEST_READY.md.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|---|---|---|---|---|
| spec_miner_visual | teamwork_preview_spec_miner | Visual Spec Discovery | completed | d3f10185-c312-4961-9414-a65eadd1bac6 |
| explorer_components | teamwork_preview_explorer | Component Architecture Discovery | completed | fe9f3b9c-cc3a-4457-b12d-2037685af946 |
| explorer_pdf | teamwork_preview_explorer | PDF Engine & Test Discovery | completed | 2a5af7b6-fc4d-49b2-a167-7e7d1028af14 |
| test_writer_m1 | teamwork_preview_test_writer | Milestone 1 E2E Test Suite Creation | completed | 7f4846ab-eb22-4684-a2a0-925f2a8a002f |
| worker_invoice_redesign | teamwork_preview_worker | Invoice Redesign & PDF Parity | completed | 37d7d3b7-901c-46ab-a8c1-d09892324cd0 |
| reviewer_visual | teamwork_preview_reviewer | Visual & Structural Review | completed | cc438f17-466e-4de2-9eb3-3b4a44095586 |
| reviewer_arch | teamwork_preview_reviewer | Architecture & PDF Review | completed | 657b2851-d5a2-4e05-b296-8e12aa8f27b6 |
| challenger_edge | teamwork_preview_challenger | Edge Cases & Stress Testing | completed | 499bd05b-caae-4a75-9944-4fa5b416b976 |
| challenger_pdf | teamwork_preview_challenger | PDF & Print Scaling Challenger | completed | 39f4ca8a-fe71-4779-a7ed-3f4a243e2cbf |
| auditor_integrity | teamwork_preview_auditor | Forensic Integrity Audit | completed | 867aa511-d90f-48c7-ac05-52289c490753 |

## Succession Status
- Succession required: no
- Spawn count: 10 / 16
- Pending subagents: none
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: 9233a9f6-554b-4b0a-8c55-0f1b3272d0ec/task-112
- Safety timer: none
- On succession: kill all timers before spawning successor
- On context truncation: run `manage_task(Action="list")` — re-create if missing

## Artifact Index
- c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_invoice\BRIEFING.md — Working memory and identity index
- c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_invoice\DISPATCH.md — Task assignment from Sentinel
- c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md — Immutable original user request
- c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_invoice\progress.md — Liveness heartbeat & iteration tracking
