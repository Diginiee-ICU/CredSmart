# BRIEFING — 2026-10-23T22:00:00Z

## Mission
Architecturally and visually decouple CredSmart into two distinct core product offerings: (1) CredSmart POS & Billing (`/billing/*`) and (2) CredSmart CRM (`/crm/*`), providing route-isolated portals, dedicated navigation shells, independent sidebars, separate onboarding entry points, and an intuitive top-level Suite Switcher, while preserving 100% backwards compatibility and sharing a unified authentication and organization layer.

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
- Strict exclusion: Create Invoice flow (`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`) must remain 100% untouched and functional

## User Context
- **Last user request**: Decouple CredSmart into POS & Billing (`/billing/*`) and CRM (`/crm/*`) portals with dedicated navigation shells, Suite Switcher, dual onboarding, and complete backward compatibility.
- **Pending clarifications**: none
- **Delivered results**: In progress under Project Orchestrator `8ac6491a-275d-4c1c-b664-961cd66511b1`.

## Project Status
- **Phase**: in progress (Milestone 1 DONE; Milestone 2 Navigation Shells & Suite Switcher active)
- **Routing Decision**: General path -> teamwork_preview_orchestrator
- **Active Orchestrator ID**: 8ac6491a-275d-4c1c-b664-961cd66511b1
- **Working Directory**: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_decouple
- **Cron 1 (Reporting)**: task-22
- **Cron 2 (Liveness)**: task-24

## Victory Audit Status
- **Triggered**: no
- **Verdict**: pending
- **Auditor ID**: [to be spawned on victory claim]
- **Working Directory**: [TBD]
- **Retry count**: 0

## Artifact Index
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md — Original verbatim user request
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_decouple\DISPATCH.md — Orchestrator dispatch instructions
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md — Authoritative project scope and feature inventory
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\TEST_INFRA.md — Opaque-box test strategy across Tiers 1-4
