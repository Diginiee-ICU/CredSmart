# BRIEFING — 2026-10-21T00:15:00Z

## Mission
Complete from-scratch mobile view redesign of CredSmart ERP & POS application following a Clean High-Density Retail Minimal (Stripe / Shopify POS) aesthetic. Redesign global mobile shell, floating bottom navigation dock, Dashboard, Tally import banner, 2x2 financial ledger cards, quick actions, POS billing touch layout, invoice lists, and inventory cards, strictly preserving 100% desktop invariance.

## 🔒 My Identity
- Archetype: sentinel
- Working directory: c:/Users/Rudra/Desktop/Git/CredSmart/.agents/teamwork/sentinel
- Orchestrator: 14c6a959-d68e-4859-bb68-805bb9f6c60d
- Victory Auditor: [to be spawned on victory claim]
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

## User Context
- **Last user request**: Complete from-scratch mobile view redesign of CredSmart ERP & POS application following a Clean High-Density Retail Minimal (Stripe / Shopify POS) aesthetic.
- **Pending clarifications**: none
- **Delivered results**: In progress

## Project Status
- **Phase**: in progress
- **Routing Decision**: General path -> teamwork_preview_orchestrator
- **Active Orchestrator ID**: 92c8e148-9d89-47d7-9329-5f4887fd7091
- **Working Directory**: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_mobile_redesign
- **Cron 1 (Reporting)**: task-34 (*/8 * * * *)
- **Cron 2 (Liveness)**: task-36 (*/10 * * * *)

## Victory Audit Status
- **Triggered**: no
- **Verdict**: pending
- **Retry count**: 0
- **Auditor Report**: [pending]

## Artifact Index
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md — Original verbatim user request
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_mobile_redesign\DISPATCH.md — Orchestrator dispatch instructions
