# Project: CredSmart Dual Portal Decoupling (POS & Billing vs CRM)

## Architecture
Architecturally and visually decouple CredSmart into two distinct core product portals:
1. **CredSmart POS & Billing (`/billing/*`)**: Tailored strictly for retail, billing, point-of-sale, inventory, customer/supplier ledgers, GST compliance, and store accounting.
2. **CredSmart CRM (`/crm/*`)**: Tailored strictly for workforce operations, attendance, biometric geofencing, salary/payroll, task management, custom roles/RBAC, meetings, broadcasts, AI assistant, and helpdesk support.

### System Topology
- **Unified Authentication & Organization Layer**:
  - Shared Supabase auth session, JWT tokens, and multi-tenant organization context (`useOrganization`, `useAuth`).
  - Cashier role protection: Cashiers remain strictly constrained to POS billing operations.
- **Route Isolation & Redirection Engine**:
  - `src/config/routes.ts`: Centralized `ROUTE_PATHS`, `BILLING_NAV_ROUTES`, `CRM_NAV_ROUTES`, and backwards-compatible `MAIN_NAV_ROUTES`.
  - `src/App.tsx`: Clean route separation with `/billing/*` and `/crm/*` tree, plus universal `LegacyRedirect` component preserving query params and dynamic path parameters.
- **Navigation Shells & Suite Switcher**:
  - `src/components/SuiteSwitcher.tsx`: Interactive app launcher in top header displaying active suite badge, persisting to `localStorage` (`credsmart_active_suite`), and emitting `credsmart:suite_changed` window events.
  - `src/components/AppLayout.tsx`: Suite-aware header, branding, subtitle, quick-action buttons, and sidebar state.
  - `src/components/AppSidebar.tsx`: Dedicated popovers/sidebars for Billing vs CRM; adaptive mobile bottom navigation docks tailored to the active suite.
- **Onboarding & Entry Routing**:
  - `src/pages/Auth.tsx`: Step 2 onboarding suite selection ("POS & Billing", "CRM", "Both").
  - `src/App.tsx` (`resolvePostLoginRoute` / `HomeRoute`): Intelligent entry resolution for `/` and `/app` directing users to their preferred or last-active suite, while preserving direct deep-links.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Route Isolation `/billing/*` | Dedicated route tree for all retail, POS, inventory, sales, purchases, reports, and billing tools | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Route Isolation `/crm/*` | Dedicated route tree for all CRM submodules (dashboard, attendance, payroll, tasks, roles, etc.) | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Universal Legacy Redirections | 35 legacy paths (`/pos`, `/sales`, `/items`, `/inventory`, `/customers`, etc.) seamlessly redirected to `/billing/*` with query/param preservation | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Centralized Route Config Parity | Update `ROUTE_PATHS` while maintaining `MAIN_NAV_ROUTES` and regex compatibility with existing test suites | M1 | Survey (Routes Explorer) |
| 5 | Dedicated POS & Billing Navigation | `BILLING_NAV_ROUTES` containing strictly retail/ERP items and 0 CRM clutter | M2 | ORIGINAL_REQUEST §R2 |
| 6 | Dedicated CRM Navigation | `CRM_NAV_ROUTES` containing strictly workforce/CRM items and 0 billing clutter | M2 | ORIGINAL_REQUEST §R2 |
| 7 | Top-Level Interactive Suite Switcher | Interactive component in top header displaying active suite badge with instant switching | M2 | ORIGINAL_REQUEST §R2 |
| 8 | Suite State Persistence | `localStorage` persistence (`credsmart_active_suite`) with cross-tab/window event synchronization | M2 | ORIGINAL_REQUEST §R2 |
| 9 | Adaptive Mobile Navigation Dock | Bottom touch dock dynamically rendering POS tabs vs CRM tabs with 44px hit targets and safe-area insets | M2 | ORIGINAL_REQUEST §R2 |
| 10 | Dual Portal Onboarding Preference | New organization onboarding UI to select primary operational hub ("POS & Billing", "CRM", "Both") | M3 | ORIGINAL_REQUEST §R3 |
| 11 | Intelligent Entry Routing (`/`, `/app`) | Post-login and root routing to preferred or last-active suite while respecting cashier roles | M3 | ORIGINAL_REQUEST §R3 |
| 12 | Deep-Link Preservation | Direct URLs to `/billing/*` and `/crm/*` resolve directly without unwanted redirects | M3 | ORIGINAL_REQUEST §R3 |
| 13 | Comprehensive E2E Test Suite | Tiers 1-4 opaque-box test suite verifying all features, boundary cases, cross-portal navigation, and real-world workflows | E2E Testing Track | Architecture Specification |
| 14 | 100% E2E Pass & Zero Collateral Verification | Passing full E2E suite, zero regressions in existing tests, `tsc --noEmit` code 0, `npm run build` code 0 | M4 (Final Milestone) | ORIGINAL_REQUEST §R4 |
| 15 | Adversarial Coverage Hardening (Tier 5) & Forensic Audit | White-box adversarial testing and forensic integrity verification confirming zero mock/hardcode shortcuts | M4 (Final Milestone) | Orchestration Standard |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Route Architecture & Isolation | `src/config/routes.ts`, `src/App.tsx`, legacy redirect engine, URL parameter & search param preservation | None | **DONE** |
| M2 | Navigation Shells & Suite Switcher | `SuiteSwitcher.tsx`, `AppLayout.tsx`, `AppSidebar.tsx`, dedicated sidebars, adaptive mobile bottom dock | M1 | **IN_PROGRESS** |
| M3 | Dual Onboarding & Entry Routing | `src/pages/Auth.tsx`, suite preference selection, `resolvePostLoginRoute`, deep link handling for `/` and `/app` | M1, M2 | PLANNED |
| M4 | Final Milestone & Verification | 100% E2E test pass (Tiers 1-4), Tier 5 adversarial tests, full `tsc --noEmit`, Vitest pass, `npm run build`, forensic audit | M1, M2, M3, E2E Track | PLANNED |
| E2E | E2E Testing Track | Independent opaque-box test harness and test suites across Tiers 1-4, publishing `TEST_READY.md` | M1 (Route contracts) | **DONE** |

---

## Interface Contracts

### Suite Switcher & State Management
- `localStorage` key: `"credsmart_active_suite"` (`"billing"` | `"crm"`)
- `localStorage` key: `"credsmart_suite_preference"` (`"billing"` | `"crm"` | `"both"`)
- Custom Window Event: `window.dispatchEvent(new CustomEvent("credsmart:suite_changed", { detail: { suite: "billing" | "crm" } }))`
- Hook: `useActiveSuite()`:
  ```typescript
  export type ActiveSuite = "billing" | "crm";
  export function useActiveSuite(): {
    activeSuite: ActiveSuite;
    setActiveSuite: (suite: ActiveSuite) => void;
    switchSuite: (suite: ActiveSuite) => void;
    isBilling: boolean;
    isCrm: boolean;
  };
  ```

### Route Paths Contract (`src/config/routes.ts`)
- POS & Billing Portal:
  - Root: `/billing`
  - Dashboard: `/billing/dashboard`
  - POS Checkout: `/billing/checkout`
  - Sales: `/billing/sales`
  - Purchases: `/billing/purchases`
  - Items / Catalog: `/billing/items`
  - Parties / Customers: `/billing/parties`
  - Other modules: `/billing/inventory`, `/billing/godown`, `/billing/barcode`, `/billing/cash-bank`, `/billing/expenses`, etc.
- CRM Portal:
  - Root / Command Center: `/crm` or `/crm/dashboard`
  - Attendance: `/crm/attendance`
  - Salary / Payroll: `/crm/salary`
  - Tasks: `/crm/tasks`
  - Roles & RBAC: `/crm/roles`
  - Meetings: `/crm/meet`
  - Broadcasts: `/crm/broadcasts`
  - AI Assistant: `/crm/ai-assistant`
  - Support: `/crm/support`
- Legacy Redirects:
  - `/pos` -> `/billing/checkout`
  - `/dashboard` -> `/billing/dashboard`
  - `/sales` -> `/billing/sales`
  - `/purchases` -> `/billing/purchases`
  - `/items` -> `/billing/items`
  - `/customers` -> `/billing/customers`
  - `/inventory` -> `/billing/inventory`
  - `/suppliers` -> `/billing/suppliers`
  - etc. (36 total paths)

---

## Code Layout & File Boundaries
- `src/config/routes.ts`: Owned exclusively by Milestone 1 Worker.
- `src/App.tsx`: Owned by Milestone 1 Worker for route trees and legacy redirects; Milestone 3 Worker for entry routing.
- `src/components/SuiteSwitcher.tsx`: Owned by Milestone 2 Worker.
- `src/components/AppLayout.tsx`: Owned by Milestone 2 Worker.
- `src/components/AppSidebar.tsx`: Owned by Milestone 2 Worker.
- `src/pages/Auth.tsx`: Owned by Milestone 3 Worker.
- `src/test/e2e/*`: Owned exclusively by E2E Testing Track.
- **Strictly Protected (DO NOT TOUCH)**:
  - `src/components/invoices/mobile/MobileCreateInvoice.tsx`
  - `src/components/SalesInvoiceModal.tsx`
  - `src/components/invoices/mobile/AddItemModal.tsx`
  - `src/components/invoices/mobile/SelectPartyModal.tsx`
  - `src/components/invoices/mobile/EditItemModal.tsx`
