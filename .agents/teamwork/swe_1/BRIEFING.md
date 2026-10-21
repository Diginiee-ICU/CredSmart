# BRIEFING — 2026-10-21T07:35:50Z

## Mission
Orchestrate SWE Light lifecycle for B2B network synchronization, notification de-duplication, default paid invoice status, and mobile invoice success theme rendering.

## 🔒 My Identity
- Archetype: teamwork_preview_swe
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\swe_1
- Original parent: Sentinel
- Original parent conversation ID: 8043dbfd-686e-4606-b537-df0ccf6765ea

## 🔒 My Workflow
- **Pattern**: SWE Light
- **Scope document**: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\swe_1\DISPATCH.md
1. **Decompose**: SWE Light does NOT decompose. Every worker receives the whole task verbatim.
2. **Dispatch & Execute**:
   - Dispatch implementer (teamwork_preview_implementer) on whole task verbatim.
   - Run sequential refinement rounds (teamwork_preview_reviewer) with open-issues ledger (floor of 3 review rounds).
   - Verify by independently inspecting diff and running tests.
   - Run blocking post-victory audit (teamwork_preview_victory_auditor).
3. **On failure**:
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: At 16 spawns, write handoff.md, spawn successor
- **Work items**:
  1. Implementer Round (teamwork_preview_implementer) [in-progress]
  2. Review Round 1 (teamwork_preview_reviewer) [pending]
  3. Review Round 2 (teamwork_preview_reviewer) [pending]
  4. Review Round 3 (teamwork_preview_reviewer) [pending]
  5. Victory Audit (teamwork_preview_victory_auditor) [pending]
- **Current phase**: 2
- **Current focus**: Implementer Round (teamwork_preview_implementer)

## 🔒 Key Constraints
- NEVER write, modify, or create source code files yourself. Delegate all implementation and repair to workers.
- NEVER explore or debug the codebase to solve the task yourself.
- Verify independently: read worker diff and re-run tests.
- Maintain cumulative open-issues ledger across all rounds.
- Propagate task text verbatim.
- Floor of 3 review rounds after implementer.
- Blocking victory audit before declaring completion.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.

## Current Parent
- Conversation ID: 8043dbfd-686e-4606-b537-df0ccf6765ea
- Updated: 2026-10-21T07:35:50Z

## Key Decisions Made
- Dispatched implementer_1 (dc384fc4-d8f2-453d-ada3-44b4abd6f541).

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| Implementer 1 | teamwork_preview_implementer | Whole task (R1-R4) | in-progress | dc384fc4-d8f2-453d-ada3-44b4abd6f541 |

## Succession Status
- Succession required: no
- Spawn count: 1 / 16
- Pending subagents: dc384fc4-d8f2-453d-ada3-44b4abd6f541
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: task-20
- Safety timer: none
- On succession: kill all timers before spawning successor
- On context truncation: run `manage_task(Action="list")` — re-create if missing

## Artifact Index
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\swe_1\DISPATCH.md — Dispatch instructions
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md — Original request verbatim
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\swe_1\progress.md — Liveness & status tracking
