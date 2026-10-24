# Orchestrator Dispatch: Decouple CredSmart into POS & Billing (`/billing/*`) and CRM (`/crm/*`)

## Objective
Architecturally and visually decouple CredSmart into two distinct core product offerings:
(1) CredSmart POS & Billing (`/billing/*`)
(2) CredSmart CRM (`/crm/*`)
providing route-isolated portals, dedicated navigation shells, independent sidebars, separate onboarding entry points, and an intuitive top-level Suite Switcher, while preserving 100% backwards compatibility and sharing a unified authentication and organization layer.

## Source of Truth
- Verbatim User Request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (see timestamp `2026-10-23T21:58:59Z`)
- Project Root: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart`
- Working Directory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_decouple`

## Requirements

### R1. Route Architecture & Isolation: POS & Billing (`/billing/*`) and CRM (`/crm/*`)
- Restructure application routing so that POS & Billing features live strictly under `/billing/*` (dashboard, POS terminal, sales, purchases, inventory, godown, barcode, parties, accounting, e-invoicing, reports, settings) and CRM features live strictly under `/crm/*` (dashboard, attendance, salary/payroll, tasks, role management, meetings, broadcasts, AI assistant, support).
- Ensure all legacy routes (e.g. `/pos`, `/sales`, `/items`, `/dashboard`, `/inventory`, `/customers`, etc.) seamlessly redirect to their new `/billing/*` destinations with zero broken links.

### R2. Dedicated Navigation Shells & Suite Switcher
- Create dedicated layout shells for each product portal:
  - A dedicated POS & Billing sidebar containing only billing, inventory, POS, and accounting tools (no CRM clutter).
  - A dedicated CRM sidebar containing only CRM submodules (attendance, tasks, salary, staff roles, broadcasts, meet, AI assistant, support - no billing clutter).
  - A high-visibility Suite Switcher / App Launcher in the top navigation header enabling instant switching between "CredSmart POS & Billing" and "CredSmart CRM", with badge indicators and state persistence (`credsmart_active_suite`).
  - Mobile bottom navigation and quick-create drawers dynamically adapt depending on whether the user is in POS & Billing or CRM.

### R3. Dual Portal Onboarding & Post-Login Entry Routing
- Enhance post-authentication routing and onboarding so business owners can designate their primary operational hub ("POS & Billing" vs "CRM" vs "Both").
- The app automatically directs users to their chosen or last-active suite upon login, with direct deep-linking support for each portal.
- Authenticated users entering the root path `/` or `/app` are intelligently routed to their preferred or last-active portal.

### R4. Zero-Collateral Code Integrity & Verification
- All existing POS billing algorithms, thermal invoice printing, GST calculation engines, modal workflows, and CRM database synchronization must remain completely invariant.
- Verify with full TypeScript compilation (`tsc --noEmit`), automated test suites (Vitest across CRM, Billing, and RBAC), and clean production build (`npm run build`).

## Acceptance Criteria
- [ ] Navigating to `/billing` loads the dedicated POS & Billing portal and dashboard.
- [ ] Navigating to `/crm` loads the dedicated CRM portal and command center.
- [ ] Legacy routes (e.g., `/pos`, `/sales`, `/inventory`, `/customers`, `/dashboard`) automatically redirect to `/billing/*` without 404s.
- [ ] Mobile bottom navigation and quick-create drawers dynamically adapt depending on whether the user is in POS & Billing or CRM.
- [ ] POS & Billing sidebar displays only billing, inventory, sales, purchases, reports, and store settings (no CRM clutter).
- [ ] CRM sidebar displays only CRM submodules: Dashboard, Attendance, Tasks, Payroll, Roles, Meetings, Broadcasts, AI Assistant, Support (no billing clutter).
- [ ] An interactive Suite Switcher in the top header allows instant switching between "POS & Billing" and "CRM".
- [ ] Active suite selection persists across sessions in `localStorage` (`credsmart_active_suite`).
- [ ] Onboarding includes suite selection preference for new organizations.
- [ ] Authenticated users entering the root path `/` or `/app` are intelligently routed to their preferred or last-active portal.
- [ ] TypeScript compilation (`tsc --noEmit`) passes with 0 errors.
- [ ] Vitest test suites across CRM, Billing, and RBAC pass with 100% success rate.
- [ ] `npm run build` generates clean production assets with zero errors.

## Key Constraints
- Zero technical shortcuts — full implementation with robust backward compatibility.
- Strictly preserve protected Create Invoice flows (`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`).
- `cmd /c npx tsc --noEmit` and `cmd /c npm run build` must succeed without error.
