# Orchestration Plan — Universal Header Logo Architecture & Full CRM/POS Mobile Ergonomics

## Objective
Place the official CredSmart platform shield logo permanently in the universal command bar alongside tenant store branding, and deliver dedicated touch-first mobile ergonomics across all pages of CRM and POS & Billing while guaranteeing 100% desktop preservation and zero regressions.

## Milestones Roadmap
1. **Phase 0 — Parallel Architecture Survey (3 Explorers)**:
   - Explorer 1: Universal Header, Layout components (`AppLayout.tsx`, `AppSidebar.tsx`, `Header.tsx`, store switcher, logo assets, favicon)
   - Explorer 2: POS Billing Terminal (`/pos`, `/checkout`, `POS.tsx`, cart sheet, category chips, mobile viewport handling)
   - Explorer 3: CRM Suite (9 routes: `/crm`, `/crm/roles`, `/crm/attendance`, `/crm/salary`, `/crm/tasks`, `/crm/meet`, `/crm/broadcasts`, `/crm/ai`, `/crm/support`) & Ledger/Inventory/Parties/Reports pages
2. **Phase 1 — Project Scope Specification (`PROJECT.md`)**:
   - Synthesize survey findings into Feature Inventory, component boundaries, interface contracts, and desktop-preservation constraints.
3. **Milestone 1 — Universal Header Dual Lockup**:
   - Permanent CredSmart platform shield logo + styled wordmark + hairline divider + tenant store dropdown pill.
   - 52px desktop height / 48px mobile height with zero wrapping or overflow on 360px-430px screens.
   - Worker implementation -> Reviewers -> Challenger -> Forensic Auditor -> Gate.
4. **Milestone 2 — Mobile POS Billing Terminal (`/pos`, `/checkout`)**:
   - Dedicated single-column layout on < 768px: sticky top search & scan bar, horizontal category chips, high-density product cards, floating bottom cart dock, and 1-tap checkout drawer.
   - Worker implementation -> Reviewers -> Challenger -> Forensic Auditor -> Gate.
5. **Milestone 3 — Comprehensive Mobile CRM Suite Ergonomics (All 9 Routes)**:
   - Command Center, Tasks, Salary & Payroll, Roles, Attendance, Meet, Broadcasts, AI Assistant, Support.
   - Worker implementation -> Reviewers -> Challenger -> Forensic Auditor -> Gate.
6. **Milestone 4 — Mobile POS & Billing Ledger, Inventory, Parties, Reports, Cash & Bank**:
   - Sales, Purchases, Customers, Suppliers, Inventory, Godown, Reports, Cash & Bank cards and drawer interactions.
   - Worker implementation -> Reviewers -> Challenger -> Forensic Auditor -> Gate.
7. **Milestone 5 — Dual-Track E2E Test Suite & Adversarial Hardening**:
   - Comprehensive test suite covering mobile responsive branches, brand lockup, touch targets, and full production build (`npm run build`).
8. **Final Victory Delivery**:
   - Complete human-facing report and parent handoff.
