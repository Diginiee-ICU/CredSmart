# BRIEFING — 2026-10-18T09:37:00Z

## Mission
Build a fully integrated CRM Tab — Phase 3: Salary Management & Payroll Engine — inside CredSmart, a React + Vite + TypeScript + Supabase PWA business management platform, featuring salary profiles, payroll engine (LOP, overtime, PF/ESI deductions), monthly payroll run & lock flow, advances & deductions, staff self-service PDF payslips, route wiring, CRMDashboard integration, and crm-salary-skill documentation.

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

## User Context
- **Last user request**: Build CRM Tab Phase 3: Salary Management & Payroll Engine (M1: Database Schema & Migration, M2: Payroll Calculation Engine, M3: Salary Management UI Page, M4: Vector Payslip PDF Generator, M5: Route Wiring & Dashboard Integration, M6: Reusable Skill Documentation, M7: Final E2E Hardening).
- **Pending clarifications**: none
- **Delivered results**: none yet for CRM Phase 3

## Project Status
- **Phase**: in progress
- **Routing Decision**: General path -> teamwork_preview_orchestrator
- **Active Orchestrator ID**: caf7924e-19e5-4a1d-ae03-b43c66838dd3
- **Working Directory**: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase3_gen2
- **Cron 1 (Reporting)**: b39f974c-65a2-4b8d-8de6-644bb87ae3d1/task-44 (*/8 * * * *)
- **Cron 2 (Liveness)**: b39f974c-65a2-4b8d-8de6-644bb87ae3d1/task-46 (*/10 * * * *)

## Victory Audit Status
- **Triggered**: no
- **Verdict**: pending
- **Retry count**: 0

## Artifact Index
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md — Original verbatim user request
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_phase3_gen2\DISPATCH.md — Project Orchestrator dispatch
