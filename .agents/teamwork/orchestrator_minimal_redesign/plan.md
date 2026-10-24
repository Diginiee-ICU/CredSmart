# Plan — CredSmart Minimal & Fast-Access Redesign

## Objective
Execute a multi-agent redesign of CredSmart's complete Theme, Fonts, Style, Structure, and Layout into a modern, attractive, minimalist, lightning-fast, and user-friendly experience across both mobile (< 768px) and desktop (>= 768px) views, strictly prohibiting visual crowding, bloated buttons, and long scrollable pages, ensuring screen-fitted data density with zero business logic regression.

## Phase 0: Survey & Exploration (3 Parallel Explorers)
- **Explorer 1 (Design Tokens & Base Primitives)**:
  - Working dir: `.agents/teamwork/survey_explorer_tokens/`
  - Focus: Inspect `src/index.css`, `tailwind.config.ts`, `src/components/ui/button.tsx`, card components, badge components, color palette, font declarations (`Inter`, `IBM Plex Mono`). Identify all existing bloated button classes (`h-11`, `h-12`, `rounded-3xl`), 3D glass styles, heavy shadows, and typography mismatches.
- **Explorer 2 (Desktop Shell & Productivity Layouts)**:
  - Working dir: `.agents/teamwork/survey_explorer_desktop/`
  - Focus: Inspect `src/components/AppLayout.tsx`, `src/components/AppSidebar.tsx`, `src/components/SuiteSwitcher.tsx`, table components, and POS workbench (`src/pages/POSBilling.tsx`). Identify top header height (target 52px `h-13`), screen-fitted table scrolling (`flex-1 min-h-0 overflow-y-auto`, sticky headers, fixed pagination), and split POS terminal hotkey ribbons.
- **Explorer 3 (Mobile Ergonomics & Protected Routes)**:
  - Working dir: `.agents/teamwork/survey_explorer_mobile/`
  - Focus: Inspect mobile navigation dock in `AppSidebar.tsx` / `AppLayout.tsx`, mobile drawers/bottom-sheets, action chips, card streams, and strictly locate all protected invoice flow components (`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`) to enforce strict write boundaries.

## Phase 1: Feature Inventory & Decomposition into PROJECT.md
- Merge findings into `PROJECT.md` at root.
- Cross-check that every feature from the request is assigned to a milestone.
- Define explicit write boundaries and file ownership contracts.

## Phase 2: Milestone Execution & Verification Loop
- **Milestone 1**: Non-Crowded Minimal Design System & Base Primitives
  - Buttons (34px standard, 28px table, 30px micro icon, 46px mobile CTA).
  - Clean neutral palette (`#F8FAFC` light / `#090D16` dark, `#2563EB` royal blue accent).
  - Hairline borders (`border-slate-200/80` / `border-slate-800`), micro-shadows (`shadow-xs`), zero 3D glass reflections.
  - Typography (`Inter`, `IBM Plex Mono` tabular numerals for currency/numbers/dates).
- **Milestone 2**: Screen-Fitted Desktop Shell & Productivity Layouts
  - 52px command header (`h-13`), compact 28px brand mark, org switcher, suite toggle, Command Palette (`⌘K`), split new bill button.
  - Bounded screen-fitted data tables (sticky headers, scrollable rows, fixed pagination footer).
  - Split POS workbench (dual-pane independent scroll, fixed checkout bar, monospace hotkey badges `F1`-`F7`).
- **Milestone 3**: Mobile Ergonomics & Native-Touch Layouts
  - Fixed bottom navigation dock (5 destinations, 44px+ hit targets, `safe-area-inset-bottom`).
  - Swipeable action strip below header.
  - Responsive mobile data cards replacing wide tables.
  - Smooth bottom-sheet drawers (`max-h-[92dvh] rounded-t-2xl`) with fixed bottom confirmation bars.
- **Milestone 4**: Core Application Pages Overhaul
  - `Dashboard.tsx`: 4 minimal KPI cards with top hairline accents, spline area chart, recent transactions.
  - `POSBilling.tsx`: Monochromatic hotkey ribbon, streamlined cart items, fast checkout flow.
  - `Sales.tsx` & `Purchases.tsx`: Dense tabular lists / touch cards, sticky headers, multi-status filters.
  - `Items.tsx` & `Inventory.tsx`: Compact inventory catalog, stock level badges.
  - `Parties.tsx`, `Customers.tsx`, `Suppliers.tsx`: Clean ledger cards with Udhar Khata balances.
  - `CashAndBank.tsx` & `Expenses.tsx`: Reconciled liquidity cards and categorized transaction ledger.
  - `CRM Portal`: Clean workforce dashboard, attendance clock-in, task boards, salary management.
- **Milestone 5**: Full Verification & Zero Regression
  - Run `npm run build` and `npm run lint`.
  - Verify all protected invoice flows, Supabase real-time, GST calculation, routes, and PDF pipelines remain 100% intact.
  - Forensic audit pass.
