# BRIEFING — 2026-10-25T08:55:00Z

## Mission
Fix the "nested/boxy card container" anti-pattern across CredSmart mobile pages in 9 files. Replace individual floating bordered item cards (`rounded-xl border shadow-2xs`) with clean minimal divide-y list rows (`divide-y divide-slate-100 dark:divide-slate-800/60`) throughout mobile views.

## 🔒 My Identity
- Archetype: sentinel
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\sentinel
- Orchestrator: 8ac6491a-275d-4c1c-b664-961cd66511b1
- Victory Auditor: [to be spawned on victory claim]
- Working directory: c:/Users/Rudra/Desktop/Git/CredSmart/.agents/teamwork/sentinel
- Orchestrator: 14c6a959-d68e-4859-bb68-805bb9f6c60d
- Current working directory: c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\sentinel
- Active Orchestrator: 9233a9f6-554b-4b0a-8c55-0f1b3272d0ec
- Victory Auditor: 5241a514-2a29-49fc-a631-9cfade7a2e21
- Active Orchestrator (New Task): 128ce6df-e01a-4513-8b58-90303779e4c7
- Victory Auditor (New Task): 3830018e-1dce-49db-8e77-3c33336e68ef
- Active Orchestrator (Lifecycle Task): c0d1864a-d589-4172-80be-9e95a059559c (terminated upon victory)
- Victory Auditor (Lifecycle Task): bf004818-bd2d-4705-b819-4fc6d3869b10 (terminated upon victory confirmation)
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\sentinel
- Active Orchestrator (CRM Phase 1): f65e7324-0a80-4f4b-bb4c-bc82b84e3cdd
- Victory Auditor (CRM Phase 1): [to be spawned on victory claim]
- Active Orchestrator (CRM Phase 2): 1beca3ca-d4b2-4508-99a0-6c9d39936bfb
- Victory Auditor (CRM Phase 2): [to be spawned on victory claim]
- Active Orchestrator (CRM Phase 3): a6c6970e-7c4c-4a2f-b5be-d02fc8860e0a
- Victory Auditor (CRM Phase 3): [to be spawned on victory claim]
- Active Orchestrator (CRM Phase 3 Gen 2): caf7924e-19e5-4a1d-ae03-b43c66838dd3
- Victory Auditor (CRM Phase 3 Gen 2): [to be spawned on victory claim]
- Active Orchestrator (API Migration Gen 1): 73ee3452-ffda-43b4-83da-c3ca2006c47f (succeeded at 16 spawns)
- Active Orchestrator (API Migration Gen 2): 02fa2ba5-8091-4db1-9b70-bdb7e414d8ee
- Victory Auditor (API Migration): 4817e639-ade5-4c21-a49e-d1eba94e20bb
- Active Orchestrator (Production Fixes): 47768107-cdc6-46b5-a415-7ea52564fffb
- Victory Auditor (Production Fixes): [to be spawned on victory claim]
- Active Orchestrator (Mobile Redesign): 92c8e148-9d89-47d7-9329-5f4887fd7091
- Victory Auditor (Mobile Redesign): [to be spawned on victory claim]
- Active Orchestrator (SWE Light Invoicing & Sync): 6f66cc7c-6e8b-4015-9fe1-c76bd83f96b0
- Victory Auditor (SWE Light Invoicing & Sync): [to be spawned on victory claim]
- Active Victory Auditor (SWE Light Invoicing & Sync): 224543fa-a8c9-4a5c-b919-39ff50376951
- Active Orchestrator (Core Redesign): 2a5bd82c-5175-47f3-a02b-3ee793555f5a
- Victory Auditor (Core Redesign): [to be spawned on victory claim]
- Active Orchestrator (Staff Provisioning & Enterprise Tasks): 0257415d-4ccf-41a8-aff2-818a11322a27
- Victory Auditor (Staff Provisioning & Enterprise Tasks): [to be spawned on victory claim]
- Active Orchestrator (Staff Provisioning & Enterprise Tasks Gen 2): c838af97-21de-4616-9188-f0f8dfa904c9
- Victory Auditor (Staff Provisioning & Enterprise Tasks Gen 2): [to be spawned on victory claim]
- Active Orchestrator (Decouple Portals): 8ac6491a-275d-4c1c-b664-961cd66511b1
- Victory Auditor (Decouple Portals): [to be spawned on victory claim]
- Active Orchestrator (Minimal Redesign): 3044c8ce-523a-4157-917d-31b6f5d55c6a
- Victory Auditor (Minimal Redesign): [to be spawned on victory claim]
- Active Orchestrator (Mobile Cards Modernization): 24d614cb-853d-49d4-9ac2-cf0090c93a62
- Victory Auditor (Mobile Cards Modernization): [to be spawned on victory claim]

## 🔒 Key Constraints
- No technical decisions — relay only
- Victory Audit is MANDATORY before reporting completion
- Must not write code, analyze problems, or make technical decisions
- Monitor orchestrator via progress and liveness crons
- CRM roles must be fully configurable by business owner — zero hard-coded roles
- Never take orchestrator completion claim at face value — spawn victory auditor
- Clean context execution: keep Sentinel context ultra-light
- Zero TypeScript `any` types anywhere in CRM files
- Zero ESLint errors
- All SQL migrations are idempotent (IF NOT EXISTS, ON CONFLICT DO NOTHING)
- `cmd /c npx` for all CLI commands (PowerShell execution policy)
- Ensure PostgreSQL 16 compatibility and 0 data loss
- Decouple PDF generation from bill generation UI thread (< 500ms)
- 100% desktop invariance: all desktop views/tables/modals/shortcuts (`hidden md:flex`, `hidden md:block`, etc.) remain 100% untouched and functional
- Mobile redesign strictly isolated to mobile breakpoints (`block md:hidden` or `isMobile`)
- Safe area inset handling with `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`
- 44x44px minimum touch targets and bottom thumb zone optimization
- Zero TypeScript compiler errors (`tsc --noEmit`)
- All Vitest test suites must pass without regression
- Strict exclusion: 19 quarantine files must remain 100% untouched
- Minimal design system rules: 34px standard action, 28px table action, 46px mobile CTA, hairline borders, no 3D glass / neon halos / bubble buttons, screen-fitted 52px top bar, sticky headers and bounded scroll tables
- Flat minimal list rows with divide-y divide-slate-100 dark:divide-slate-800/60 replacing boxy nested card containers

## User Context
- **Last user request**: Replace boxy nested cards across 9 mobile pages with clean minimal divide-y list rows.
- **Pending clarifications**: none
- **Delivered results**: Project Orchestrator launched (`24d614cb-853d-49d4-9ac2-cf0090c93a62`).

## Project Status
- **Phase**: in progress
- **Routing Decision**: General path -> teamwork_preview_orchestrator
- **Active Orchestrator ID**: 24d614cb-853d-49d4-9ac2-cf0090c93a62
- **Working Directory**: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_mobile_cards
- **Cron 1 (Reporting)**: task-26
- **Cron 2 (Liveness)**: task-28

## Victory Audit Status
- **Triggered**: no
- **Verdict**: pending
- **Auditor ID**: [to be spawned on victory claim]
- **Working Directory**: [TBD]
- **Retry count**: 0

## Artifact Index
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md — Original verbatim user request
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_mobile_cards\DISPATCH.md — Orchestrator dispatch instructions
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md — Master design system rules
