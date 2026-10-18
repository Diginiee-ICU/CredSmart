# BRIEFING — 2026-10-18T17:52:00Z

## Mission
Explore and survey the CredSmart codebase for the Frontend Supabase Table Query Migration to Dedicated Backend API project.
Focus areas:
1. Invoices, Sales & Purchases Domain Query Audit (`sales`, `sale_items`, `purchase_invoices`, `purchase_invoice_items`, `expenses`, quotations, credit notes, debit notes, document sequences).
2. Settings, Organization, Profiles & Remaining Domains (`organizations`, `profiles`, app settings, business settings, tax settings, CRM modules `crm_roles`, `crm_attendance`, `crm_salary_profiles`, etc.).
3. Complete Global Inventory Scan (`supabase.from(` across entire `src/` to ensure zero queries missed).
4. Backend API Contract Mapping to `https://api.credsmart.online/api/*`.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_3
- Original parent: c0d1864a-d589-4172-80be-9e95a059559c
- Milestone: Explorer Survey Phase

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Inspect existing test files and mock setups
- Check `SalesInvoiceModal.tsx` testability and existing test coverage
- Investigate `src/services/documentsService.ts`
- Define unit test specifications for R1 (In-place update on re-edit), R2 (Save & New sequence reset), R3 (Safe deletion), R4 (More menu & WhatsApp sharing)
- Document test & verification execution commands
- 2026-10-18: Read-only codebase audit & contract mapping for frontend Supabase migration to dedicated backend API (https://api.credsmart.online/api/*).
- Maintain 5-component handoff report standard.
- Do NOT modify application source code during investigation.

## Current Parent
- Conversation ID: 73ee3452-ffda-43b4-83da-c3ca2006c47f
- Updated: 2026-10-18T17:52:00Z

## Investigation State
- **Explored paths**:
  - `src/` (265 non-test source files scanned completely)
  - `src/services/documentsService.ts` (1219 lines)
  - `src/pages/POSBilling.tsx`, `src/components/PurchaseInvoiceForm.tsx`, `src/pages/PurchaseReturns.tsx`
  - `src/pages/Expenses.tsx`, `src/pages/SalesHistory.tsx`, `src/pages/CustomerLedger.tsx`
  - `src/pages/TallyImport.tsx`, `src/services/autoSyncService.ts`
  - `src/hooks/useOrganization.tsx`, `src/pages/BusinessSettings.tsx`, `src/pages/Staff.tsx`, `src/pages/Godown.tsx`
  - `src/pages/crm/Attendance.tsx`, `src/pages/crm/RoleManagement.tsx`, `src/pages/crm/SalaryManagement.tsx`, `src/pages/crm/CRMDashboard.tsx`
  - `src/services/networkInvoicingService.ts`, `src/services/storefrontService.ts`
  - `src/integrations/supabase/client.ts`, `src/hooks/useAuth.tsx`
- **Key findings**:
  - 394 total database `.from(...)` table queries found across `src/` (single-line and multiline).
  - 40 `Array.from` calls and 12 `supabase.storage.from` calls properly differentiated and isolated.
  - 84 queries belong to Invoices, Sales & Purchases domain across 11 tables (`sales`, `sale_items`, `purchase_invoices`, `purchase_invoice_items`, `expenses`, `purchase_returns`, `purchase_return_items`, `sales_returns`, `sales_return_items`, `network_invoices`, `storefront_orders`).
  - 99 queries belong to Settings, Organizations, Profiles, Locations, Audits, and CRM modules (Phase 1 RBAC, Phase 2 Attendance, Phase 3 Payroll).
  - Dynamic tables (`$targetTable` x 7, `$table` x 1) resolved deterministically to either `customers` or `suppliers`.
  - Non-table Supabase features identified: 3 `supabase.rpc()`, 6 realtime channels, 4 edge function invocations, 12 storage operations.
  - Detailed RESTful endpoint mapping established for all 33 tables targeting `https://api.credsmart.online/api/*`.
- **Unexplored areas**: None. Global scan covers 100% of `src/`.

## Key Decisions Made
- Multi-line regex parser used to uncover all 394 table queries (vs. misleading 183 single-line count).
- Designed complete endpoint specifications with Bearer session token authentication and atomic transactional mutations.

## Artifact Index
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_3\handoff.md` — Final 5-Component Handoff Report
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_3\progress.md` — Liveness & Progress Log
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_3\DISPATCH.md` — Dispatch Audit Log
