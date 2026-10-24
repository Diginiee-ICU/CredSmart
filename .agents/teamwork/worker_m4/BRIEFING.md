# BRIEFING — 2026-10-24T20:42:42Z

## Mission
Milestone 4: Core Application Pages Overhaul. Execute surgical overhaul across Dashboard, Sales, Purchases, Items, Inventory, Parties, Customers, Suppliers, CashAndBank, Expenses, and CRM portal/components according to minimal-design-system rules with 0 regression, adhering strictly to quarantine locks on the 19 invoice files.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4
- Original parent: 3044c8ce-523a-4157-917d-31b6f5d55c6a
- Milestone: Milestone 4 (Core Application Pages Overhaul)

## 🔒 Key Constraints
- STRICT QUARANTINE LOCK: Zero edits/formatting on 19 protected invoice files:
  MobileCreateInvoice.tsx, SalesInvoiceModal.tsx, AddItemModal.tsx, SelectPartyModal.tsx, EditItemModal.tsx, MobileInvoiceSuccessView.tsx, MobileBillPreviewModal.tsx, MobileInvoiceFitViewer.tsx, CreatePartyModal.tsx (in invoices/mobile/), MobileCreatePurchaseInvoice.tsx, CreateNewItemModal.tsx (in items/mobile/), PurchaseInvoiceModal.tsx, AddItemsToBillModal.tsx, InvoiceFitView.tsx, UnifiedInvoiceRenderer.tsx, downloadExactInvoice.ts, whatsappPdfShare.ts, invoiceThemeLoader.ts, documentsService.ts.
- Minimal-change principle: Only modify what is necessary; no unrelated refactoring.
- Genuine implementations: Real state, real behavior, zero hardcoded cheat values.
- Screen-fitted viewports on desktop tables (sticky thead, flex-1 min-h-0 overflow-y-auto, pinned pagination footer).
- De-clutter KPI cards: strip micro-prose, hairline accents, p-3.5 padding.
- Button standards: h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs; micro icons w-7.5 h-7.5 rounded-md; table actions h-7 px-2.5 rounded-md text-[11px].
- Primary Royal Blue #2563EB for primary actions. Purge glassmorphic blur, 3D halos, glowing-btn-amber/blue.
- Directional badges: Emerald for To Collect / In Stock, Amber for Low Stock, Rose for To Pay / Out of Stock with font-mono tabular-nums.
- Elevate sub-11px micro fonts to text-[11px].
- CRM Invariants:
  - Preserve data-testid="attendance-role-filter" in Attendance.tsx.
  - Preserve/Add <CRMBadge variant="info" size="sm">Phase 3 Live</CRMBadge> in SalaryManagement.tsx.
  - Preserve/Add <CRMBadge variant="info" size="sm">Phase 4 Active</CRMBadge> in Broadcasts.tsx.
  - Preserve min-h-[44px] h-11 px-3 flex items-center in Tasks.tsx.

## Current Parent
- Conversation ID: 3044c8ce-523a-4157-917d-31b6f5d55c6a
- Updated: 2026-10-24T20:42:42Z

## Task Summary
- **What to build**: Surgical redesign and overhaul across 10 core pages and CRM components according to minimal design system.
- **Success criteria**:
  - tsc --noEmit passes (0 errors)
  - eslint passes on all affected pages (0 errors)
  - vitest test suites pass 100%
  - git diff HEAD on 19 quarantined files is completely empty (0 diff lines)
- **Interface contracts**: minimal-design-system.md, PROJECT.md, and test suites.

## Change Tracker
- **Files modified**: [TBD]
- **Build status**: [TBD]
- **Pending issues**: None

## Quality Status
- **Build/test result**: [TBD]
- **Lint status**: [TBD]
- **Tests added/modified**: [TBD]

## Loaded Skills
- **Source**: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\credsmart-minimal-design-system\SKILL.md
- **Local copy**: None needed
- **Core methodology**: Master standard for minimal UI tokens, viewport containment, button sizing, neutral colors, tabular typography, and mobile-desktop divergence.

## Key Decisions Made
- [TBD]

## Artifact Index
- `.agents/teamwork/worker_m4/DISPATCH.md` — Assigned instructions
- `.agents/teamwork/worker_m4/BRIEFING.md` — Active briefing and state
- `.agents/teamwork/worker_m4/progress.md` — Liveness & progress tracking
- `.agents/teamwork/worker_m4/handoff.md` — Final handoff report
