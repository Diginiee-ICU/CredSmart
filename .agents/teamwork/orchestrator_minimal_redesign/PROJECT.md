# Project: CredSmart Minimal & Fast-Access Redesign

## Architecture
Redesign CredSmart's complete Theme, Fonts, Style, Structure, and Layout into a modern, attractive, minimalist, lightning-fast, and user-friendly experience across both mobile (< 768px) and desktop (>= 768px) views. The redesign strictly prohibits visual crowding, bloated buttons, and long scrollable pages, ensuring screen-fitted data density with zero business logic regression.

### System Topology & Design Pillars
1. **Pillar 1: Minimal Design Tokens & Base Primitives** (`M1`):
   - Typography: `'Inter'` sans-serif; `'IBM Plex Mono'` tabular monospace (`font-mono tabular-nums`, `font-feature-settings: "tnum" on`) strictly for currency (₹), numbers, dates, barcodes. Zero sub-11px micro-fonts.
   - Spacing Tokens: Add `'7.5'` (30px), `'8.5'` (34px), `'11.5'` (46px), `'13'` (52px) to Tailwind spacing scale.
   - Button Primitives: Standard action 34px (`h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs`), Table action 28px (`h-7 px-2.5 rounded-md text-[11px] font-medium`), Micro icon 30px (`w-7.5 h-7.5 rounded-md`), Center mobile CTA 46px (`46x46px rounded-xl`). Eliminate bloated `h-11`, `h-12`, `rounded-3xl` bubble buttons.
   - Neutral Surfaces & Palette: Light mode `#F8FAFC` (`bg-slate-50`), `#FFFFFF` (`bg-white` cards), `#E2E8F0` (`border-slate-200/80`); Dark mode `#090D16` (`bg-slate-950`), `#111726` (`bg-slate-900` cards), `#1E293B` (`border-slate-800`). Accent Royal Blue `#2563EB` with semantic Emerald `#10B981` and Rose `#E11D48`.
   - Deprecate skeuomorphism: Eliminate liquid glass, heavy 3D glass reflections, skeuomorphic bevels, 3D tilt perspective, and glowing neon halos.
2. **Pillar 2: Screen-Fitted Desktop Shell & Layouts** (`M2`):
   - Unified 52px command header (`h-13`) hosting compact 28px brand mark, Org Switcher dropdown pill, segmented neutral Suite Switcher, central Command Palette (`⌘K`), split `+ New Invoice` button, live sync dot.
   - Screen-fitted data tables: Sticky header, bounded scroll body (`flex-1 min-h-0 overflow-y-auto`), fixed bottom pagination footer (`shrink-0 border-t`). Zero whole-page vertical scrolling.
   - Split POS workbench: Dual-pane layout (left item catalog/cart scrolls independently, right checkout dock has top net total, bounded scroll middle, fixed bottom action bar with `Save & Print [F6]`, `Save Bill [F7]`, `WhatsApp`). Monochromatic hotkey ribbon (`F1`-`F7`, `CTRL+B`, `CTRL+I`, `DEL`).
3. **Pillar 3: Mobile Ergonomics & Native-Touch Layouts** (`M3`):
   - Fixed bottom navigation dock (5 destinations: `Home`, `Sales`, Center Elevated `+ POS/Bill` 46x46px royal blue, `Items`, `Parties`) with 44px+ hit targets and `safe-area-inset-bottom`.
   - Swipeable action strip below header (`+ Sale Bill`, `+ Quick POS`, `+ Customer`, `+ Item`, `Day Book`).
   - Smooth bottom-sheet drawers (`max-h-[92dvh] rounded-t-2xl`) with fixed bottom confirmation bars.
4. **Pillar 4: Core Application Pages Overhaul** (`M4`):
   - Overhaul `Dashboard.tsx`, `POSBilling.tsx`, `Sales.tsx`, `Purchases.tsx`, `Items.tsx`, `Inventory.tsx`, `Parties.tsx`, `Customers.tsx`, `Suppliers.tsx`, `CashAndBank.tsx`, `Expenses.tsx`, and `CRM Portal`.
   - Eliminate micro-prose, enforce 4–5 cards per viewport on mobile, crisp 38px–42px row height on desktop tables.
5. **Pillar 5: Verification & Zero Regression** (`M5`):
   - Strict NO-EDIT quarantine on all 19 invoice creation and document lifecycle files (`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`, etc.).
   - Verify TypeScript compilation (`npm run build`), ESLint (`npm run lint`), all route/DB/Supabase/GST/PDF invariance.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Tailwind Spacing Scale Extension | Add '7.5' (30px), '8.5' (34px), '11.5' (46px), '13' (52px) to Tailwind spacing | M1 | Survey (Tokens Miner) |
| 2 | Typography 'Inter' Activation | Set 'Inter' as primary sans across Tailwind config, body, and headings | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Tabular Numerals OpenType Setup | Configure 'IBM Plex Mono' with `font-feature-settings: "tnum" on` for .font-mono & .tabular-nums | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Button Primitives Standardization | Standardize `<Button>` to 34px default, 28px sm/table, 30px icon, 46px cta; re-alias legacy variants | M1 | ORIGINAL_REQUEST §R1 |
| 5 | Surface Color Tokens Overhaul | Implement #F8FAFC light / #090D16 dark / #2563EB royal blue palette in CSS variables | M1 | ORIGINAL_REQUEST §R1 |
| 6 | Skeuomorphic & Glass Deprecation | Replace liquid glass, heavy glows, and multi-stop gradients with 1px hairline borders & shadow-xs | M1 | ORIGINAL_REQUEST §R1 |
| 7 | Base Card, Badge & Table Density | Update Card padding (p-3.5), Badge font size (text-[11px]), Table row height (38px-42px) | M1 | Survey (Tokens Miner) |
| 8 | Unified 52px Desktop Command Header | Slim 52px header (h-13), 28px brand mark, org switcher pill, segmented suite switcher, central ⌘K, split action | M2 | ORIGINAL_REQUEST §R2 |
| 9 | Screen-Fitted Data Tables Architecture | Sticky thead, bounded tbody (flex-1 min-h-0 overflow-y-auto), fixed bottom pagination footer | M2 | ORIGINAL_REQUEST §R2 |
| 10 | Split POS Workbench Containment | Dual-pane layout, independent cart scroll, fixed bottom checkout bar (F6/F7), monochromatic hotkey ribbon | M2 | ORIGINAL_REQUEST §R2 |
| 11 | Mobile Bottom Navigation Dock | 5 destinations (Home, Sales, Center 46x46px +POS, Items, Parties with Tab 5 fixed to Parties) | M3 | ORIGINAL_REQUEST §R3 |
| 12 | Mobile Swipeable Action Strip | Horizontal touch chip strip placed directly below header on Dashboard and list pages | M3 | ORIGINAL_REQUEST §R3 |
| 13 | Mobile Bottom-Sheet Drawers | Max-h-[92dvh] rounded-t-2xl drawers with drag handle and fixed bottom confirmation bar | M3 | ORIGINAL_REQUEST §R3 |
| 14 | Executive ERP Dashboard Redesign | 4 minimal KPI cards with top hairline accents, spline area chart, recent transactions table/cards | M4 | ORIGINAL_REQUEST §R4 |
| 15 | Sales & Purchases Ledger Overhaul | High-density tables on desktop, responsive touch cards on mobile, multi-status filters | M4 | ORIGINAL_REQUEST §R4 |
| 16 | Items & Inventory Catalog Overhaul | Stock badges (In Stock, Low Stock, Out of Stock), compact product rows/cards | M4 | ORIGINAL_REQUEST §R4 |
| 17 | Parties, Customers & Suppliers Overhaul | Udhar Khata directional balance cards, 1-tap call/WhatsApp, search/filter | M4 | ORIGINAL_REQUEST §R4 |
| 18 | Cash, Bank & Expenses Overhaul | Reconciled liquidity cards and categorized transaction ledger | M4 | ORIGINAL_REQUEST §R4 |
| 19 | CRM Portal Views Polish | Workforce dashboard, attendance clock-in, task boards, salary management minimal styling | M4 | ORIGINAL_REQUEST §R4 |
| 20 | Protected Billing Routes Lockdown | Strict quarantine of all 19 invoice creation files guaranteeing zero regression | M5 | ORIGINAL_REQUEST §R5 |
| 21 | Full Verification & Forensic Audit | TypeScript compile (`npm run build`), ESLint (`npm run lint`), Vitest test suite pass | M5 | ORIGINAL_REQUEST §R5 |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Minimal Design Tokens & Base Primitives | `tailwind.config.ts`, `src/index.css`, `button.tsx`, `card.tsx`, `badge.tsx`, `table.tsx`, `dialog.tsx` | None | **DONE** |
| M2 | Screen-Fitted Desktop Shell & Layouts | `AppLayout.tsx`, `AppSidebar.tsx`, `SuiteSwitcher.tsx`, `POSBilling.tsx`, table wrappers | M1 | **IN_PROGRESS** |
| M3 | Mobile Ergonomics & Native-Touch Layouts | `AppSidebar.tsx` (bottom dock), action strip, bottom sheets, mobile drawer primitives | M1 | PLANNED |
| M4 | Core Application Pages Overhaul | `Dashboard.tsx`, `Sales.tsx`, `Purchases.tsx`, `Items.tsx`, `Parties.tsx`, `CashAndBank.tsx`, `Expenses.tsx`, `CRM` | M1, M2, M3 | PLANNED |
| M5 | Verification & Zero Regression | `npm run build`, `npm run lint`, Vitest suites, forensic audit, protected route invariance | M1, M2, M3, M4 | PLANNED |

---

## Code Layout & Protected Boundaries

### Editable Scope by Milestone
- **Milestone 1**:
  - `tailwind.config.ts`
  - `src/index.css`
  - `src/components/ui/button.tsx`
  - `src/components/ui/card.tsx`
  - `src/components/ui/badge.tsx`
  - `src/components/ui/table.tsx`
  - `src/components/ui/dialog.tsx`
- **Milestone 2**:
  - `src/components/AppLayout.tsx`
  - `src/components/AppSidebar.tsx` (Desktop sections)
  - `src/components/SuiteSwitcher.tsx`
  - `src/pages/POSBilling.tsx` (Desktop workbench)
- **Milestone 3**:
  - `src/components/AppSidebar.tsx` (Mobile bottom dock)
  - `src/components/items/CreateItemModal.tsx` (Bottom sheet conversion)
  - `src/components/parties/CreatePartyModal.tsx` (Bottom sheet conversion)
  - `src/test/mobileErgonomicsChallenger.test.ts` (Synchronize 46px assertion)
- **Milestone 4**:
  - `src/pages/Dashboard.tsx`
  - `src/pages/Sales.tsx`
  - `src/pages/Purchases.tsx`
  - `src/pages/Items.tsx`
  - `src/pages/Parties.tsx`
  - `src/pages/Customers.tsx`, `src/pages/Suppliers.tsx`
  - `src/pages/CashAndBank.tsx`, `src/pages/Expenses.tsx`
  - `src/pages/crm/*`

### Protected File Inventory (STRICT NO-EDIT LOCK)
Under no circumstances may any worker or subagent edit or modify the following files:
1. `src/components/invoices/mobile/MobileCreateInvoice.tsx`
2. `src/components/invoices/mobile/AddItemModal.tsx`
3. `src/components/invoices/mobile/SelectPartyModal.tsx`
4. `src/components/invoices/mobile/EditItemModal.tsx`
5. `src/components/invoices/mobile/MobileInvoiceSuccessView.tsx`
6. `src/components/invoices/mobile/MobileBillPreviewModal.tsx`
7. `src/components/invoices/mobile/MobileInvoiceFitViewer.tsx`
8. `src/components/invoices/mobile/CreatePartyModal.tsx`
9. `src/components/invoices/mobile/MobileCreatePurchaseInvoice.tsx`
10. `src/components/items/mobile/CreateNewItemModal.tsx`
11. `src/components/SalesInvoiceModal.tsx`
12. `src/components/PurchaseInvoiceModal.tsx`
13. `src/components/invoices/AddItemsToBillModal.tsx`
14. `src/components/invoices/InvoiceFitView.tsx`
15. `src/components/invoices/UnifiedInvoiceRenderer.tsx`
16. `src/utils/downloadExactInvoice.ts`
17. `src/utils/whatsappPdfShare.ts`
18. `src/utils/invoiceThemeLoader.ts`
19. `src/services/documentsService.ts`
