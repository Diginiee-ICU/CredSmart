# DISPATCH — Frontend Supabase Table Query Migration to Dedicated Backend API

## Project Scope
Migrate all direct frontend Supabase table queries to standard fetch requests communicating with the dedicated backend API (`https://api.credsmart.online/api/*`), securing endpoints with active session tokens and preserving complete UI and data contract parity.

Working directory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart`
Orchestrator directory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_api_migration`
Integrity mode: development
Original Request File: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md`

## Requirements
### R1. Frontend Table Query Migration
Replace all direct client-side Supabase table queries (e.g. `supabase.from(...)`) across all application domains (including products, customers/parties, invoices, settings, and ledgers) with standard `fetch()` requests directed to `https://api.credsmart.online/api/*`.

### R2. Session Authentication & Header Propagation
Ensure every backend API call that requires authentication automatically retrieves the active session token (e.g., Supabase JWT) and forwards it in standard HTTP headers (`Authorization: Bearer <token>`), handling session expiration gracefully.

### R3. Response Contract & State Parity
Preserve all existing data contract shapes, component interfaces, error handling, loading states, and mutation workflows so that end-user features continue functioning seamlessly without UI regressions.

### R4. Centralized API Client Architecture
Provide a clean, maintainable API client layer or utility with base URL configuration (defaulting to `https://api.credsmart.online/api`) that encapsulates request headers, JSON serialization, and error normalization.

## Acceptance Criteria
### Static Verification & Build
- Automated grep/AST scan confirms zero `supabase.from(...)` table query calls remain in frontend application code for migrated resources.
- The frontend application builds cleanly via `npm run build` with zero TypeScript or syntax compilation errors.

### Runtime & API Parity
- Network requests for products, parties, invoices, and other data resources target `https://api.credsmart.online/api/*` via standard HTTP methods (GET, POST, PUT, DELETE).
- Protected endpoints consistently attach the active session's Bearer token.
- Response handling correctly parses backend payload structures, preserving loading indicators, toast notifications, and error boundary behaviors.


## 2026-10-18T17:38:01Z
You are the Project Orchestrator for the Frontend Supabase Table Query Migration to Dedicated Backend API project.

Your assigned working directory is:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_api_migration

Authoritative User Request:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
Also see dispatch details in:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_api_migration\DISPATCH.md

Project Root:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart

Mission:
Migrate all direct frontend Supabase table queries to standard fetch requests communicating with the dedicated backend API (https://api.credsmart.online/api/*), securing endpoints with active session tokens and preserving complete UI and data contract parity.

Key Requirements:
1. R1: Frontend Table Query Migration - Replace all direct client-side Supabase table queries (e.g. `supabase.from(...)`) across all application domains (including products, customers/parties, invoices, settings, and ledgers) with standard `fetch()` requests directed to `https://api.credsmart.online/api/*`.
2. R2: Session Authentication & Header Propagation - Ensure every backend API call that requires authentication automatically retrieves the active session token (e.g., Supabase JWT) and forwards it in standard HTTP headers (`Authorization: Bearer <token>`), handling session expiration gracefully.
3. R3: Response Contract & State Parity - Preserve all existing data contract shapes, component interfaces, error handling, loading states, and mutation workflows so that end-user features continue functioning seamlessly without UI regressions.
4. R4: Centralized API Client Architecture - Provide a clean, maintainable API client layer or utility with base URL configuration (defaulting to `https://api.credsmart.online/api`) that encapsulates request headers, JSON serialization, and error normalization.

Acceptance Criteria:
- Automated grep/AST scan confirms zero `supabase.from(...)` table query calls remain in frontend application code for migrated resources.
- The frontend application builds cleanly via `npm run build` with zero TypeScript or syntax compilation errors.
- Network requests for products, parties, invoices, and other data resources target `https://api.credsmart.online/api/*` via standard HTTP methods (GET, POST, PUT, DELETE).
- Protected endpoints consistently attach the active session's Bearer token.
- Response handling correctly parses backend payload structures, preserving loading indicators, toast notifications, and error boundary behaviors.


## 2026-10-18T19:15:17Z
You are the successor Project Orchestrator (Generation 2) for the Frontend Supabase Table Query Migration to Dedicated Backend API project.

Your assigned working directory is:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_api_migration

MANDATORY FIRST STEPS:
Read the following files to recover full state, project architecture, and completed milestones:
1. handoff.md at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_api_migration\handoff.md
2. BRIEFING.md at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_api_migration\BRIEFING.md
3. ORIGINAL_REQUEST.md at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
4. DISPATCH.md at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_api_migration\DISPATCH.md
5. progress.md at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_api_migration\progress.md
6. PROJECT.md at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md
7. GATE_STATUS.md at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_api_migration\GATE_STATUS.md
8. TEST_READY.md at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\TEST_READY.md

PARENT IDENTIFIER:
Your parent is 8176c3a3-cd13-4c92-a7c9-4ed99486c69b — use this ID for all escalation, milestone updates, and final project completion reporting via send_message. Generation 1 has concluded its quota and self-succeeded.

Current State Summary:
- Milestone 1 (Centralized API Client & Auth Interceptor): DONE (Gate PASSED). Created `src/lib/apiClient.ts` with 53 unit/stress tests and E2E harness in `src/test/e2eApiMigration.test.ts`.
- Milestone 2 (Products & Inventory Domain Migration): DONE (Gate PASSED). Created `src/services/productsApi.ts` and migrated 21 files. Confirmed 0 direct queries remain for `products` or `product_batches`.

Your Immediate Tasks:
1. Start your heartbeat cron via schedule(CronExpression="*/10 * * * *", Prompt="Check subagent progress and update progress.md").
2. Execute Milestone 3 (Customers, Suppliers, Parties & Financial Ledgers Domain Migration):
   - Review Explorer 2 audit in `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_2\handoff.md`.
   - Dispatch Worker M3 to create `src/services/partiesApi.ts` wrapping `apiClient` and migrate call sites in `Customers.tsx`, `Suppliers.tsx`, `Parties.tsx`, `CustomerLedger.tsx`, `SalesInvoiceModal.tsx`, `PurchaseInvoiceModal.tsx`, `PurchaseInvoiceForm.tsx`, `CashAndBank.tsx`, etc.
   - Run the M3 Gate Squad (2 Reviewers, 2 Challengers, 1 Forensic Auditor) and record verdicts in `GATE_STATUS.md`.
3. Proceed to Milestone 4 (Invoices, Sales, Purchases, Returns & Expenses) using Explorer 3 audit.
4. Proceed to Milestone 5 (Settings, Organizations, Profiles, Godowns & CRM).
5. Proceed to Milestone 6 (Final static scan verifying zero `supabase.from(...)` table queries in application code, clean `npm run build`, and final audit).
6. Send final completion report to parent 8176c3a3-cd13-4c92-a7c9-4ed99486c69b.
