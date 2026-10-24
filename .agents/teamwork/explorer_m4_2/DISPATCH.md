# DISPATCH — Explorer 2 (Milestone 4: Catalog & Ledger Accounts)

## Identity
- Role: Catalog & Ledgers Explorer
- Type: teamwork_preview_explorer
- Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m4_2\
- Parent: Project Orchestrator (3044c8ce-523a-4157-917d-31b6f5d55c6a)

## Mandates & Context
- Authoritative User Request: Read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (Lines 1120-1218).
- Master Project Architecture: Read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md`.
- Master Design System Rules: Read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md`.
- Master Skill Specification: Read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\credsmart-minimal-design-system\SKILL.md`.

## Investigation Scope
Examine existing implementations in:
1. `src/pages/Items.tsx` & `src/pages/Inventory.tsx`
2. `src/pages/Parties.tsx`, `src/pages/Customers.tsx`, `src/pages/Suppliers.tsx`
3. `src/pages/CashAndBank.tsx` & `src/pages/Expenses.tsx`

Analyze:
- **Items & Inventory**:
  - Stock level badges: verify alignment to minimal semantic tokens (Emerald for In Stock, Amber for Low Stock, Rose for Out of Stock).
  - Catalog layout: desktop table density (sticky headers, 38-42px row height, bounded scroll) vs mobile compact product cards (4-5 per screen).
  - Action buttons: ensure 34px standard buttons and 28px action buttons without bloated sizing.
- **Parties, Customers & Suppliers (Udhar Khata)**:
  - Udhar Khata directional balance cards: Emerald for "You'll Get" (Receivable), Rose for "You'll Give" (Payable), neutral for settled.
  - Quick action communication triggers: 1-tap Call and WhatsApp shortcuts.
  - Search & filter bar: compact styling, hairline borders (`border-slate-200/80` light, `border-slate-800` dark).
- **Cash, Bank & Expenses**:
  - Reconciled liquidity cards: clean neutral surfaces, hairline borders, bold numbers in `font-mono tabular-nums`.
  - Transaction ledger: table/card styling, category pills, date formatting.

## Strict Quarantine Warning
Do NOT propose or touch any of the 19 protected invoice files:
`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`, `UnifiedInvoiceRenderer.tsx`, `downloadExactInvoice.ts`, etc.

## Deliverables
Write your exploration report to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m4_2\handoff.md` with:
- Observation (current file paths, lines, classes, and specific anti-patterns found)
- Logic Chain (remedies aligned with minimal design system tokens)
- Recommended Fix Strategy (concrete class/layout replacements for Worker M4)
- Caveats (any complex state hooks, real-time subscriptions, or edge cases to preserve)
Send completion message to orchestrator (`3044c8ce-523a-4157-917d-31b6f5d55c6a`).
