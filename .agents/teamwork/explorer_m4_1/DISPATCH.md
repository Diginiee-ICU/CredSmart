# DISPATCH — Explorer 1 (Milestone 4: Dashboard & Sales/Purchases Ledgers)

## Identity
- Role: Dashboard & Transactions Explorer
- Type: teamwork_preview_explorer
- Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m4_1\
- Parent: Project Orchestrator (3044c8ce-523a-4157-917d-31b6f5d55c6a)

## Mandates & Context
- Authoritative User Request: Read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (Lines 1120-1218).
- Master Project Architecture: Read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md`.
- Master Design System Rules: Read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md`.
- Master Skill Specification: Read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\credsmart-minimal-design-system\SKILL.md`.

## Investigation Scope
Examine existing implementations in:
1. `src/pages/Dashboard.tsx`
2. `src/pages/Sales.tsx`
3. `src/pages/Purchases.tsx`

Analyze:
- **Dashboard.tsx**:
  - Current KPI cards structure: check for explanatory micro-prose, bloated padding, heavy shadows, or saturated backgrounds.
  - Positioning of swipeable action strip on mobile (< 768px): must sit directly beneath the store header.
  - Spline area chart: check tooltip styling, grid lines, and axis labels.
  - Recent transactions: check table structure on desktop (screen-fitted, sticky headers, 38-42px row height) vs mobile responsive touch cards (4-5 per viewport).
- **Sales.tsx & Purchases.tsx**:
  - Desktop viewports (>= 768px): check for sticky headers, bounded scrollable table body (`flex-1 min-h-0 overflow-y-auto`), and fixed pagination footer at bottom (zero whole-page vertical scrolling).
  - Mobile viewports (< 768px): check responsive touch cards, status pills (Emerald for Paid, Amber for Pending, Rose for Overdue), and filter chip bar.
  - Button sizes: check for standard 34px action buttons (`h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs`) and 28px table actions (`h-7 px-2.5 rounded-md text-[11px] font-medium`).
  - Monospace tabular numbers: verify amounts use `'IBM Plex Mono'` with `font-mono tabular-nums`.

## Strict Quarantine Warning
Do NOT propose or touch any of the 19 protected invoice files:
`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`, `UnifiedInvoiceRenderer.tsx`, `downloadExactInvoice.ts`, etc.

## Deliverables
Write your exploration report to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m4_1\handoff.md` with:
- Observation (current file paths, lines, classes, and specific anti-patterns found)
- Logic Chain (remedies aligned with minimal design system tokens)
- Recommended Fix Strategy (concrete class/layout replacements for Worker M4)
- Caveats (any complex state hooks, real-time subscriptions, or edge cases to preserve)
Send completion message to orchestrator (`3044c8ce-523a-4157-917d-31b6f5d55c6a`).


## 2026-10-24T20:31:25Z
From: 3044c8ce-523a-4157-917d-31b6f5d55c6a
Content: You are Explorer 1 for Milestone 4 (Core Application Pages Overhaul).
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m4_1\

Read your dispatch instructions at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m4_1\DISPATCH.md.
Read the authoritative user request at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (Lines 1120-1218).
Read the project architecture at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md.
Read the master design rules at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md.
Read the master design skill at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\credsmart-minimal-design-system\SKILL.md.

Investigate:
1. src/pages/Dashboard.tsx (KPI cards, swipeable action strip position beneath store header, spline chart, recent transactions table/cards).
2. src/pages/Sales.tsx and src/pages/Purchases.tsx (sticky table headers, bounded scrolling tbody flex-1 min-h-0 overflow-y-auto, fixed bottom pagination footer on desktop; touch cards on mobile; 34px/28px button sizing; font-mono tabular-nums).

Strict Quarantine: Under NO circumstances touch or propose edits to the 19 protected invoice creation files.

Write your report to c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m4_1\handoff.md and notify orchestrator (3044c8ce-523a-4157-917d-31b6f5d55c6a) via send_message.
