# DISPATCH: Mobile View Redesign (Clean High-Density Retail Minimal / Stripe & Shopify POS)

## Objective
Execute a complete from-scratch mobile view redesign of the CredSmart ERP & POS application following a Clean High-Density Retail Minimal (Stripe / Shopify POS) aesthetic. Redesign the global mobile shell, floating bottom navigation dock, Dashboard, Tally import banner, 2x2 financial ledger cards, quick actions, POS billing touch layout, invoice lists, and inventory cards, strictly preserving 100% desktop invariance.

## References & Skills
- Authoritative Skill to read and follow: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\mobile-erp-redesign\SKILL.md`
- Also check: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\mobile-invoice-redesign\SKILL.md`
- Original User Request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md`

## Requirements

### R1. Desktop Invariance (Zero Regression)
All desktop views, tables, sidebars, modals, and keyboard shortcuts (`hidden md:flex`, `hidden md:block`, `md:grid`, etc.) must remain 100% untouched and functional. All new mobile design code must be strictly isolated to mobile breakpoints (`block md:hidden` or `isMobile`).

### R2. Clean High-Density Retail Minimal Design System (Stripe / Shopify POS Style)
- Visual Language: High-contrast typography, borderless or hairline-bordered clean cards, high information density with zero wasted whitespace, crisp monospaced currency formatting (₹), and refined color accents (emerald for paid, amber for pending, indigo/slate for primary actions).
- Touch Ergonomics: All interactive elements must satisfy minimum 44×44px hit targets. Primary actions placed in the bottom thumb zone with haptic feedback styling (`active:scale-[0.98] transition-transform`).
- Safe Area Inset Handling: Full support for iOS notch/home indicator and Android navigation bars using `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.

### R3. Mobile Shell & Floating Bottom Navigation Dock
- Top Mobile Header: Compact header featuring store name/switcher, live cloud sync status pill, instant search trigger, notification center bell with unread badge, and profile avatar.
- Floating Bottom Dock: 5 native-feeling touch tabs:
  1. `Home` (Dashboard)
  2. `Sales` (Invoices & Receipts)
  3. `POS Billing` (Elevated center pill with prominent icon and subtle shadow)
  4. `Items` (Catalog & Inventory)
  5. `Purchases` (Suppliers & Inward Bills)
- Viewport content container must have bottom padding `pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]` to prevent content obstruction.

### R4. Dashboard Mobile Experience From Scratch
- Store Greeting & Status: Dynamic time-of-day greeting ("Good Morning / Afternoon, [Store Name]") with live sync heartbeat indicator.
- Tally 1-Click Auto Import Banner: Minimal, compact banner with emerald accent, clear value statement, and a full-width touch button with search icon.
- High-Density Financial Ledger Summary Grid: 2x2 compact card layout replacing oversized cards:
  - `TO COLLECT`: Total receivables ₹ amount, customer count.
  - `TO PAY`: Total payables ₹ amount, supplier count.
  - `CASH & BANK`: Reconciled liquidity across cash and bank accounts.
  - `TODAY'S SALES`: Real-time daily turnover with sales invoice count.
- Quick Action Strip: Horizontal swipeable chip row for fast single-tap operations (+ Invoice, + Item, + Customer, 📷 Barcode Scan, 📊 Day Summary).
- Recent Activity Feed: Mobile transaction rows with party initials avatar, invoice number, payment status pill, date, and ₹ amount.

### R5. Code Health & Test Suite Integrity
- Clean up any ESLint regex or type warnings in mobile components.
- Zero TypeScript compiler errors (`node node_modules/typescript/bin/tsc --noEmit` exits 0).
- All 188+ Vitest unit, lifecycle, and adversarial test suites must pass without regression (`npm test` or `npx vitest run`).

## Execution & Coordination Discipline
1. Initialize `plan.md`, `progress.md`, and `BRIEFING.md` in your working directory (`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_mobile_redesign`).
2. Dispatch specialized subagents for surveying codebase, implementing changes, reviewing design fidelity, and running verification tests.
3. Update `progress.md` continuously.
4. When finished and verified, send completion notice to Sentinel.


## 2026-10-21T00:12:59Z

You are the Project Orchestrator for the CredSmart Mobile View Redesign.
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_mobile_redesign
Your dispatch instructions are at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_mobile_redesign\DISPATCH.md
The authoritative skill to follow is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\mobile-erp-redesign\SKILL.md
The original user request is at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md

Initialize plan.md, progress.md, and BRIEFING.md in your working directory immediately.
Decompose the mission into milestones, dispatch specialized subagents, maintain progress.md, ensure strict 100% desktop invariance, adhere to the Clean High-Density Retail Minimal (Stripe / Shopify POS) aesthetic, and verify zero tsc errors and all Vitest test suites passing.
Report completion back to the Sentinel when done.
