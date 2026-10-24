# BRIEFING — 2026-10-24T21:26:00Z

## Mission
Overhaul Catalog & Ledger pages (`Items.tsx`, `Inventory.tsx`, `Parties.tsx`, `Customers.tsx`, `Suppliers.tsx`, `CashAndBank.tsx`, `Expenses.tsx`) to strictly adhere to the CredSmart Minimal Design System: screen-fitted viewport containment, zero long page scrolling, hairline cards with zero glowing skeuomorphism, standard Royal Blue palette, elevated micro-fonts (no sub-11px), compact 38px-42px row heights, and tabular monospace numerals.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_b
- Original parent: 3044c8ce-523a-4157-917d-31b6f5d55c6a
- Milestone: Milestone 4 (Catalog & Ledgers Overhaul)

## 🔒 Key Constraints
- STRICT QUARANTINE LOCK: Under NO circumstances edit, format, or touch any of the 19 protected invoice creation files: MobileCreateInvoice.tsx, SalesInvoiceModal.tsx, AddItemModal.tsx, SelectPartyModal.tsx, EditItemModal.tsx, MobileInvoiceSuccessView.tsx, MobileBillPreviewModal.tsx, MobileInvoiceFitViewer.tsx, CreatePartyModal.tsx (in invoices/mobile/), MobileCreatePurchaseInvoice.tsx, CreateNewItemModal.tsx (in items/mobile/), PurchaseInvoiceModal.tsx, AddItemsToBillModal.tsx, InvoiceFitView.tsx, UnifiedInvoiceRenderer.tsx, downloadExactInvoice.ts, whatsappPdfShare.ts, invoiceThemeLoader.ts, documentsService.ts.
- Zero business logic regression: Do NOT alter Supabase real-time subscriptions, GST engines, localStorage keys, dirty row tracking, or payment handlers.
- All implementations must be genuine. No fake or hardcoded values.

## Current Parent
- Conversation ID: 3044c8ce-523a-4157-917d-31b6f5d55c6a
- Updated: 2026-10-24T21:26:00Z

## Task Summary
- **What to build**: Full overhaul of 7 pages: `src/pages/Items.tsx`, `src/pages/Inventory.tsx`, `src/pages/Parties.tsx`, `src/pages/Customers.tsx`, `src/pages/Suppliers.tsx`, `src/pages/CashAndBank.tsx`, `src/pages/Expenses.tsx`.
- **Success criteria**:
  1. `cmd /c npx tsc --noEmit` passes with 0 errors.
  2. `cmd /c npx eslint src/pages/Items.tsx src/pages/Inventory.tsx src/pages/Parties.tsx src/pages/Customers.tsx src/pages/Suppliers.tsx src/pages/CashAndBank.tsx src/pages/Expenses.tsx` passes with 0 errors.
  3. Zero diff on the 19 protected invoice files.
  4. Zero instances of `glass-card-3d`, `glowing-btn-amber`, `#5046E5`, `#EEF0FD`, `#4338CA`, sub-11px fonts (`text-[8.5px]`, `text-[9px]`, `text-[9.5px]`, `text-[10px]`) in the 7 target files.
  5. Screen-fitted viewport wrappers on `Inventory.tsx`, `Customers.tsx`, and `Suppliers.tsx`.
  6. Compact table rows (38px-42px) with sticky headers and pinned bottom pagination footer.
- **Interface contracts**: `PROJECT.md` & `.agents/rules/minimal-design-system.md`
- **Code layout**: Target files in `src/pages/`

## Key Decisions Made
- [2026-10-24T21:26:00Z] Initial plan formulated following Explorer 2 roadmap.

## Artifact Index
- `DISPATCH.md` — Assignment instructions
- `progress.md` — Liveness heartbeat and step tracker
- `handoff.md` — Self-contained final handoff report

## Change Tracker
- **Files modified**: None yet
- **Build status**: Not run yet
- **Pending issues**: None

## Quality Status
- **Build/test result**: TBD
- **Lint status**: TBD
- **Tests added/modified**: TBD

## Loaded Skills
- **Source**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\credsmart-minimal-design-system\SKILL.md`
- **Local copy**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_b\skills\credsmart-minimal-design-system\SKILL.md`
- **Core methodology**: Production-grade master design standard for CredSmart by CredAlert: minimal UI/UX tokens, typography hierarchy, neutral surface color architecture, fast-access desktop productivity layouts, native-feeling touch ergonomics.
