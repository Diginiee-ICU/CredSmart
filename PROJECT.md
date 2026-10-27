# Project: Universal Header Logo Architecture & Full CRM/POS Mobile Ergonomics

## Architecture
- **Universal Header**: Housed in `src/components/AppLayout.tsx`. Implements a decoupled dual-lockup architecture:
  - Far Left: Permanent platform mark unconditionally rendering `/favicon.png` (`w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 p-1 shadow-2xs`) and styled `CredSmart` wordmark (`hidden sm:inline font-bold text-sm tracking-tight text-slate-900 dark:text-white`).
  - Tenant Business Selector: Immediately adjacent (separated by 1px hairline divider `border-slate-200 dark:border-slate-800`), responsive active Store Switcher dropdown pill displaying tenant store logo (`org?.logo_url` or `<Building2 />`) and `{org?.name}`.
  - Viewports: Desktop >= 768px maintains 52px command bar (`md:h-13`), centered `⌘K`, split action button; Mobile < 768px enforces strict 48px height (`h-12`), 28x28px shield logo, compact store pill, and compact 30x30px right-hand controls with 90px of clearance on 360px screens (zero horizontal overflow).
- **POS Billing Terminal**: Dedicated Single-Column Mobile Terminal (`<MobilePOSTerminal />` in `src/components/pos/`) for viewports < 768px while strictly preserving the 2-column desktop workbench in `src/pages/POSBilling.tsx` on >= 768px.
  - Sticky 48px top bar (back to dashboard, search input, barcode scan button).
  - Horizontal category chips carousel with 1-tap filtering.
  - High-density product cards (4-5 per scroll) with 1-tap `+`/`-` quantity stepper.
  - Floating bottom cart dock (`fixed bottom-0 left-0 right-0 z-40` with `env(safe-area-inset-bottom)`) with total count, grand total (₹), and "Review Cart & Checkout" CTA.
  - 1-Tap slide-up bottom sheet checkout drawer for payment methods and receipt generation.
  - `src/pages/POS.tsx` re-exports `POSBilling` for route parity.
- **CRM Suite Mobile Ergonomics (9 routes)**:
  - Route files: `src/pages/crm/*` and `src/components/crm/*`.
  - Unified `CRMCommandHeader` across CRM sub-pages with compact breadcrumbs.
  - Tasks (`/crm/tasks`): Segmented status pills (`All`, `To Do`, `In Progress`, `Review`, `Done`), 1-tap status transition button, bottom-sheet task drawer.
  - Salary & Payroll (`/crm/salary`): High-density mobile payroll cards with staff advance balance indicator pill and 1-tap payslip download/share action button.
  - Role Management (`/crm/roles`): Collapsible category accordions with 44px toggle rows, full-height bottom-sheet provisioning drawer.
  - Meet, Broadcasts, AI Assistant, Support: Full-viewport mobile chat (100dvh) with thumb-docked input, 1-tap WhatsApp meeting share, bottom-sheet drawers.
- **Billing & Ledger Mobile Ergonomics**:
  - Sales & Purchases (`/sales`, `/purchases`): Dense transaction cards with swipeable/quick actions (print, WhatsApp share, edit/view).
  - Parties (`/customers`, `/suppliers`): 78px compact cards (4-5 per viewport) with >=44px call/WhatsApp buttons and bottom-sheet quick ledger preview.
  - Inventory & Godowns (`/inventory`, `/godown`, `/items`): Compact catalog cards with thumbnail, SKU, stock quantity pill, selling price, quick stock adjustment button, and Tab 2 mobile waybill cards.
  - Reports (`/reports`): 3 collapsible category accordions fitting the report directory into one screen.
  - Cash & Bank (`/cash-and-bank`): 96px horizontal account carousel above transaction feed.
- **Desktop Preservation**: Strict `hidden md:flex` / `block md:hidden` media-query boundaries. Zero modification to underlying business logic, Supabase subscriptions, calculation engines, or API routes.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | F1: Permanent Shield Mark | Far left permanent CredSmart platform logo using `/favicon.png` + styled wordmark | M1 | ORIGINAL_REQUEST § R1 |
| 2 | F2: Store Dual Lockup | Adjacent hairline divider + responsive active Store Switcher dropdown pill with store logo and name | M1 | ORIGINAL_REQUEST § R1 |
| 3 | F3: Mobile Header 48px | Strict 48px slim header height on < 768px with zero horizontal overflow on 360px-430px viewports | M1 | ORIGINAL_REQUEST § R1 |
| 4 | F4: Mobile POS Terminal | Single-column touch POS layout on < 768px with sticky top search & barcode bar | M2 | ORIGINAL_REQUEST § R2 |
| 5 | F5: Mobile POS Category Chips | Horizontal category carousel with 1-tap active filtering | M2 | ORIGINAL_REQUEST § R2 |
| 6 | F6: Mobile POS Product Cards | High-density product cards (4-5 per scroll) with 1-tap `+`/`-` quantity stepper | M2 | ORIGINAL_REQUEST § R2 |
| 7 | F7: Mobile POS Floating Cart Dock | Fixed bottom dock with item count, grand total (₹), safe-area padding, and checkout CTA | M2 | ORIGINAL_REQUEST § R2 |
| 8 | F8: Mobile POS Checkout Drawer | 1-tap slide-up bottom sheet checkout drawer for payment method and printing | M2 | ORIGINAL_REQUEST § R2 |
| 9 | F9: CRM Command Center Mobile | Polish mobile header & quick tools grid for 360px-430px viewports with zero horizontal scrollbar | M3 | ORIGINAL_REQUEST § R3 |
| 10 | F10: CRM Tasks Mobile Ergonomics | Segmented status pills, 1-tap status transition chip, bottom-sheet task creation drawer | M3 | ORIGINAL_REQUEST § R3 |
| 11 | F11: CRM Salary Mobile Cards | High-density payroll cards with staff advance balance indicator pill and 1-tap payslip action | M3 | ORIGINAL_REQUEST § R3 |
| 12 | F12: CRM Role Management Drawer | Collapsible permission accordions with 44px toggle rows & full-height bottom-sheet provisioning | M3 | ORIGINAL_REQUEST § R3 |
| 13 | F13: CRM Meet, Broadcasts, AI, Support | 100dvh mobile chat with bottom thumb-zone input, 1-tap WhatsApp meeting share, bottom-sheet dialogs | M3 | ORIGINAL_REQUEST § R3 |
| 14 | F14: Mobile Sales & Purchases Cards | Dense transaction cards with quick actions (print, WhatsApp share, edit/view) | M4 | ORIGINAL_REQUEST § R4 |
| 15 | F15: Mobile Parties Cards (Customers & Suppliers) | 78px cards (4-5 per viewport) with >=44px call/WhatsApp buttons and quick ledger preview | M4 | ORIGINAL_REQUEST § R4 |
| 16 | F16: Mobile Inventory & Godowns | Compact catalog cards with stock adjustment drawer + Tab 2 mobile waybill cards | M4 | ORIGINAL_REQUEST § R4 |
| 17 | F17: Mobile Reports Accordions | 3 collapsible category accordions fitting reports directory into one viewport | M4 | ORIGINAL_REQUEST § R4 |
| 18 | F18: Mobile Cash & Bank Carousel | 96px horizontal account carousel bringing transaction feed into thumb zone | M4 | ORIGINAL_REQUEST § R4 |
| 19 | F19: Desktop 100% Preservation | Strict preservation of >= 768px desktop layouts, hotkeys, and workbench workflows | M1-M5 | ORIGINAL_REQUEST § R5 |
| 20 | F20: E2E Dual-Track Test Suite & Build | Comprehensive Vitest suite covering mobile responsive branches & full production build | M5 | ORIGINAL_REQUEST § Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Universal Header Dual Lockup | Implement permanent CredSmart shield mark + store dropdown pill + 48px mobile height in `AppLayout.tsx` | none | DONE |
| 2 | Mobile POS Billing Terminal | Implement single-column `<MobilePOSTerminal />`, product cards, floating cart dock, checkout drawer | none | DONE |
| 3 | Mobile CRM Suite Ergonomics | Implement mobile ergonomics across all 9 CRM routes (`Tasks`, `Salary`, `Roles`, `Meet`, `Broadcasts`, `AI`, `Support`, `Dashboard`) | none | PLANNED |
| 4 | Mobile Ledger, Inventory & Reports | Implement mobile cards and touch drawers in `Sales`, `Purchases`, `Customers`, `Suppliers`, `Inventory`, `Godown`, `Reports`, `CashAndBank` | none | PLANNED |
| 5 | E2E Dual-Track Verification & Hardening | Automated Vitest test suite for mobile ergonomics & brand lockup + production build (`npm run build`) | M1, M2, M3, M4 | PLANNED |

## Interface Contracts

### Universal Header Lockup (`src/components/AppLayout.tsx`)
- Far Left: Permanent CredSmart platform mark:
  - Container: `w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 p-1 shadow-2xs`
  - Asset: `<img src="/favicon.png" alt="CredSmart" className="w-full h-full object-contain" />`
  - Wordmark: `<span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white hidden sm:inline">CredSmart</span>`
- Hairline Divider: `<div className="h-4 w-px bg-slate-200 dark:border-slate-800 shrink-0 mx-0.5 sm:mx-1" />`
- Adjacent Store Switcher Trigger:
  - Container: `flex h-7 sm:h-8 px-1.5 sm:px-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 items-center gap-1.5 shadow-2xs transition-colors cursor-pointer select-none max-w-[100px] xs:max-w-[130px] sm:max-w-[180px] lg:max-w-[220px]`
  - Store Logo: `{org?.logo_url ? <img src={org.logo_url} ... /> : <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}`
  - Store Name: `<span className="truncate">{org?.name || "My Business"}</span>`

### Mobile POS Terminal (`src/components/pos/MobilePOSTerminal.tsx`)
- Props interface:
  ```typescript
  interface MobilePOSTerminalProps {
    items: CartItem[];
    products: Product[];
    categories: string[];
    selectedCategory: string;
    onSelectCategory: (cat: string) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onAddItem: (product: Product) => void;
    onUpdateQuantity: (index: number, qty: number) => void;
    onRemoveItem: (index: number) => void;
    grandTotal: number;
    totalItemCount: number;
    onCheckout: () => void;
    customer: Customer | null;
    paymentMethod: string;
    onSelectPaymentMethod: (method: string) => void;
    onSaveAndPrint: () => void;
  }
  ```

## Code Layout
- `src/components/AppLayout.tsx`: Universal Header dual lockup, mobile header height & control spacing.
- `src/pages/POSBilling.tsx`: Desktop 2-column POS workbench (preserved 100%) + mobile branching to `<MobilePOSTerminal />`.
- `src/pages/POS.tsx`: Clean re-export of `POSBilling`.
- `src/components/pos/MobilePOSTerminal.tsx`: Main mobile touch POS terminal container.
- `src/components/pos/MobileProductCard.tsx`: Touch product card with stepper.
- `src/components/pos/MobileCartDock.tsx`: Sticky bottom cart dock with safe area padding.
- `src/components/pos/MobileCheckoutDrawer.tsx`: Slide-up checkout drawer.
- `src/pages/crm/Tasks.tsx`: Mobile segmented status pills & 1-tap transition chips.
- `src/pages/crm/SalaryManagement.tsx`: Mobile payroll cards with advance balance & payslip action.
- `src/pages/crm/RoleManagement.tsx`: Mobile permission accordions & 44px toggle targets.
- `src/pages/crm/Attendance.tsx`: Mobile camera container & touch attendance logs.
- `src/pages/crm/AIAssistant.tsx`, `Meet.tsx`, `Broadcasts.tsx`, `Support.tsx`: 100dvh mobile viewports & thumb docks.
- `src/pages/Customers.tsx`, `Suppliers.tsx`: 78px compact party cards with >=44px call/WhatsApp chips.
- `src/pages/Godown.tsx`, `Inventory.tsx`: Tab 2 mobile waybill cards & bottom-sheet adjusters.
- `src/pages/Reports.tsx`: 3 collapsible category accordions.
- `src/pages/CashAndBank.tsx`: 96px horizontal account carousel.
- `src/test/universalHeaderDualLockup.test.tsx`: Milestone 1 test suite.
- `src/test/mobilePosTerminal.test.tsx`: Milestone 2 test suite.
- `src/test/mobileCrmSuiteErgonomics.test.tsx`: Milestone 3 test suite.
- `src/test/mobileLedgersErgonomics.test.tsx`: Milestone 4 test suite.
