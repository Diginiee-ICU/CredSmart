# BRIEFING — 2026-10-27T02:45:00Z

## Mission
Place the official CredSmart platform shield logo permanently in the universal command bar alongside tenant branding, and deliver dedicated touch-first mobile ergonomics across all CRM and POS & Billing pages without altering desktop workflows.

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
- Victory Auditor (Mobile Cards Modernization): 2a8e0dab-ae50-4423-aa41-e1b25238be9a
- Active Orchestrator (SWE Tenant Isolation): 2c379784-fe44-4a5a-926c-fb71ccfb2a72 (terminated due to network outage)
- Victory Auditor (SWE Tenant Isolation): [to be spawned on victory claim]
- Active Orchestrator (SWE Tenant Isolation Gen 2): ddaf2611-f7a9-49ac-a76c-95a53bfa1d39 (victory confirmed)
- Victory Auditor (SWE Tenant Isolation Gen 2): 821cae1a-e032-4e96-b736-ebcc5a0d8bc4 (victory confirmed)
- Active Orchestrator (SWE CRM Hardening): de9ee5f3-aa5e-4256-bde3-aa61264e04df
- Victory Auditor (SWE CRM Hardening): [to be spawned on victory claim]
- Active Orchestrator (CRM Defects Elimination): 9b1188fd-78cb-4433-afbb-88547ac33d9e
- Victory Auditor (CRM Defects Elimination): [to be spawned on victory claim]
- Active Orchestrator (Mobile Ergonomics): d2d7b35b-d1d5-45b5-9a65-d7a02d968987
- Victory Auditor (Mobile Ergonomics): [to be spawned on victory claim]

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
- Multi-tenant organization isolation: CRM staff, attendance, tasks, salary profiles, roles strictly scoped to active org
- 0 cross-tenant visibility or bleeding between organizations
- Strict Real Staff Visibility: eliminate DEFAULT_STAFF mock data from CRMDashboard.tsx
- Human display name fallback (users.name if users.full_name is empty) across backend and frontend
- Default password generation format: {firstName}123 (minimum 6 characters)
- Eradicate cross-joined rogue memberships in PostgreSQL database
- Newly provisioned staff bound strictly to provisioning owner org with valid credentials
- Salary Management populated with authoritative CRM staff roster
- Real UUID task assignment without synthetic IDs
- Strict POS/Billing lockdown for CRM staff without explicit POS permissions
- Sub-500ms CRM page loads with parallel queries and cached endpoints
- Unified CRMCommandHeader across all CRM pages
- Permanent CredSmart platform shield logo in universal command bar alongside tenant branding
- Strict 52px desktop / 48px mobile universal header height with 0 horizontal overflow on 360px viewport
- Dedicated Single-Column Mobile POS Terminal (< 768px) with category chips, product cards, floating bottom cart dock, and 1-tap checkout drawer
- Comprehensive mobile card layouts for all 9 CRM routes with swipeable status and 44x44px touch targets
- Dense transaction cards (4-5 items per viewport) for Sales, Purchases, Parties, Inventory, Reports, Cash & Bank
- 100% desktop workflow preservation with zero regressions to calculations, database, or API routes

## User Context
- **Last user request**: Place official CredSmart platform shield logo permanently in universal command bar alongside tenant branding, and deliver dedicated touch-first mobile ergonomics across all CRM and POS & Billing pages without altering desktop workflows.
- **Pending clarifications**: none
- **Delivered results**: Dispatched General Project Orchestrator (`teamwork_preview_orchestrator`) with monitoring crons.

## Project Status
- **Phase**: in progress
- **Routing Decision**: General -> teamwork_preview_orchestrator
- **Active Orchestrator ID**: d2d7b35b-d1d5-45b5-9a65-d7a02d968987
- **Working Directory**: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_mobile_ergonomics
- **Cron 1 (Reporting)**: 708b3a4f-8887-401f-9a2a-e81fad49c398/task-310 (`*/8 * * * *`)
- **Cron 2 (Liveness)**: 708b3a4f-8887-401f-9a2a-e81fad49c398/task-312 (`*/10 * * * *`)

## Victory Audit Status
- **Triggered**: no
- **Verdict**: pending
- **Retry count**: 0

## Artifact Index
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md — Original verbatim user request
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_mobile_ergonomics\DISPATCH.md — Dispatch instructions
