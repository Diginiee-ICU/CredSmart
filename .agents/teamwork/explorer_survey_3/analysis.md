# Explorer Survey 3: CRM Suite & Billing Ledger Ergonomics
**Generated at**: 2026-10-27T08:26:00Z  
**Investigator**: Explorer Survey 3 (Read-Only Investigation Agent)  
**Scope**: All 9 CRM Routes + All 9 POS & Billing Ledger Routes on 360px–430px Mobile Viewports with 100% Desktop (>=768px) Preservation  
**Design Standard Reference**: `.agents/rules/minimal-design-system.md` & `.agents/skills/mobile-erp-redesign/SKILL.md`

---

## Executive Summary

A comprehensive, code-level survey was executed across all **9 CRM routes** and all **9 Billing & Ledger routes**. The objective: identify rigid table structures, horizontal overflow bugs, touch targets failing Apple/Android 44x44px ergonomic standards, keyboard occlusion bugs, and vertical density bloat on mobile devices (360px–430px viewports, e.g. iPhone SE, iPhone 14/15/16, Samsung Galaxy S23, Pixel 7).

### Key Architectural Findings:
1. **Desktop vs. Mobile Divergence Status**:
   - Several pages (`Sales.tsx`, `Purchases.tsx`, `SalaryManagement.tsx`, `CashAndBank.tsx`) already implement clean `hidden md:block` (desktop table) and `block md:hidden` (mobile touch cards) pattern.
   - However, several other critical pages (`Godown.tsx` Tab 2, `Tasks.tsx` Kanban view, `Reports.tsx` 3-column stack, `RoleManagement.tsx` permissions matrix, `AIAssistant.tsx` fixed height container) lack dedicated touch-first mobile ergonomics, resulting in horizontal scrolling tables, 150px+ tall sprawling cards, or broken fixed-height layouts.
2. **Modal Ergonomics (Virtual Keyboard Clipping)**:
   - Modals across CRM (`Tasks.tsx`, `Meet.tsx`, `Broadcasts.tsx`, `RoleManagement.tsx`, `Attendance.tsx`) and Billing (`Godown.tsx`, `Reports.tsx`, `Inventory.tsx`) use desktop centered `DialogContent` (`sm:max-w-md rounded-2xl`). When the mobile virtual keyboard pops up, inputs at the bottom are occluded, and dialog headers get pushed off the viewport.
   - These must be transformed on mobile (`< md`) into **bottom-sheet drawers** (`max-h-[92dvh] rounded-t-2xl bottom-0 fixed inset-x-0`) with fixed bottom action buttons and safe-area padding.
3. **Sub-44px Touch Targets**:
   - Icon action buttons in `Customers.tsx` (lines 665–689) and `CashAndBank.tsx` (line 941) use `p-1` (24x24px) or `w-7 h-7` (28x28px) without 44px hit bounds, causing frequent mis-taps on small devices.
4. **Information Density Standard (4–5 Cards Per Viewport)**:
   - `Suppliers.tsx` (lines 640–740) renders cards at 160px+ height, limiting visibility to only 1.5 cards on an iPhone SE. By streamlining typography to `text-xs font-semibold`, pulling phone/email into a single inline meta row, and providing 1-tap call/WhatsApp action chips, density increases to the required 4–5 cards per viewport.

---

## Part 1: Comprehensive CRM Route Survey (9 Routes)

### 1. `/crm` & `/crm/dashboard` — `src/pages/crm/CRMDashboard.tsx`
- **Current Mobile Implementation**:
  - Contains mobile header (lines 443–520) with CredSmart dropdown, `[ POS | CRM ]` switcher, and refresh button.
  - 2x2 metric summary cards (`grid grid-cols-2 gap-2 sm:gap-3`, lines 525–580).
  - Quick Tools Grid (`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3`, lines 585–690).
- **Mobile Ergonomic Defects**:
  - **Header Crowding on 360px (iPhone SE)**: The top action row with `[ Org Tree ]` and `Role Mgmt` wraps awkwardly, creating a jagged double-line header.
  - **Tool Grid Label Truncation**: Buttons like "Support Desk" and "Salary & Payroll" required zero-width spaces (`\u200B`) to prevent text overflow. On 360px screens, long titles wrap into 3 lines.
  - **Ad-Hoc Floating Modals**: Org chart modal uses centered `DialogContent` (`max-w-3xl`) which scales poorly on mobile.
- **Proposed Mobile Specification (< 768px)**:
  - Header: Standardize on `CRMCommandHeader.tsx` with a single compact breadcrumb chip and 36px icon buttons (`h-8.5 w-8.5 rounded-lg`).
  - Metrics: 2x2 compact grid with `p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs`. Metric font: `text-lg font-mono font-bold`.
  - Quick Tools: 2-column card grid with `min-h-[56px] p-2.5 rounded-xl flex items-center gap-2.5`, icon badge `w-8 h-8 rounded-lg`, and 2-line title/subtitle (`text-xs font-semibold` + `text-[11px] text-muted-foreground truncate`).

---

### 2. `/crm/tasks` — `src/pages/crm/Tasks.tsx`
- **Current Mobile Implementation**:
  - Has view mode switcher (`board` vs `table`, lines 600–650).
  - On mobile, the Kanban Board (`viewMode === "board"`) renders `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4` (lines 690–780).
- **Mobile Ergonomic Defects**:
  - **Kanban Column Stacking**: On mobile (< 768px), stacking 4 columns vertically forces the user to scroll through dozens of items or multiple empty columns before reaching "Done".
  - **Sub-44px Status Transitions**: Task status changes require dragging (which fails on touch) or opening the desktop edit dialog.
  - **Task Creation Dialog**: Centered modal (`DialogContent sm:max-w-md`) gets occluded when typing task description and assigning staff.
- **Proposed Mobile Specification (< 768px)**:
  - **Segmented Horizontal Status Filter**: Replace the vertical 4-column stack on mobile with a sticky top segmented pill bar:
    `[ All (12) | To Do (4) | In Progress (3) | Review (2) | Done (3) ]` with `overflow-x-auto scrollbar-none py-1`.
  - **High-Density Task Cards**: `p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-card space-y-2 shadow-2xs`.
    - Priority pill (`High` / `Medium` / `Low`) + Due date font-mono (`dd MMM`).
    - Title (`text-xs font-bold`) + Assignee avatar chip (`20x20px`).
    - **1-Tap Quick Status Advance Button**: `h-8 px-2.5 text-[11px] rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 border border-blue-200` to advance task to next stage in 1 tap without opening dialog.
  - **Bottom-Sheet Task Drawer**: New Task / Edit Task renders in a bottom sheet (`max-h-[88dvh] rounded-t-2xl fixed bottom-0 inset-x-0`) with fixed bottom action buttons.

---

### 3. `/crm/salary` — `src/pages/crm/SalaryManagement.tsx`
- **Current Mobile Implementation**:
  - Has 4 tabs: `Tab 1: Staff Directory & CTC Setup`, `Tab 2: Monthly Payroll Engine`, `Tab 3: Advance Salary & Loans`, `Tab 4: Bulk Payout Export`.
  - Already features `hidden md:block` (desktop table) and `block md:hidden` (mobile cards) branching.
- **Mobile Ergonomic Defects**:
  - **Tab 2 (Payroll Engine)**: Mobile cards show Basic, Allowances, Gross, Deductions, and Net Pay, but **lack the Staff Advance Balance indicator** and **1-tap Payslip Download/Share action**.
  - **Tab 3 (Salary Advances)**: Disbursal modal uses centered `DialogContent` with 6 input fields that cause virtual keyboard clipping.
  - **Non-Standard Header**: Line 820 uses custom `h1 Payroll Engine` with manual styling rather than `CRMCommandHeader`.
- **Proposed Mobile Specification (< 768px)**:
  - Unify header with `CRMCommandHeader`.
  - In Tab 2 Mobile Card:
    - Add Advance Recovery pill: `Advance Due: ₹ X,XXX` (amber badge).
    - Add 1-tap action buttons at card footer: `[ Download Slip ]` (PDF icon, `h-8 text-xs font-semibold`) and `[ Pay Net: ₹XX,XXX ]` (`h-8 text-xs font-semibold bg-emerald-600 text-white`).
  - In Tab 3 Mobile Disbursal: Render in a bottom-sheet drawer with quick preset buttons for advance amount (`₹2,000`, `₹5,000`, `₹10,000`).

---

### 4. `/crm/roles` — `src/pages/crm/RoleManagement.tsx`
- **Current Mobile Implementation**:
  - Contains Role Selector, Staff Assignment list, and 7-category Permissions Matrix.
  - Has `block md:hidden` mobile view (lines 1900–2250).
- **Mobile Ergonomic Defects**:
  - **Permission Matrix Switches**: On 360px viewports, the category permission toggles are crammed next to long permission titles (e.g. `MANAGE_ORGANIZATION_SETTINGS`), causing title text wrapping and mis-taps.
  - **Role Creation Dialog**: Uses centered modal (`max-w-2xl max-h-[90vh]`) with color swatch selector (4 swatches per row) and permission checkboxes that overflow viewport.
- **Proposed Mobile Specification (< 768px)**:
  - **Collapsible Category Accordions**: Group permissions into 7 accordions (`Billing & POS`, `Inventory & Godowns`, `CRM & Staff`, `Accounting & Banking`, `Reports & Tax`, `Settings & Security`, `Audits`).
  - **44px Touch Toggle Rows**: Each permission row is `min-h-[44px] flex items-center justify-between px-3 py-2 border-b border-border/50`.
  - **Bottom Drawer for Role Creation**: Transform role creation into bottom sheet with 2-step wizard (Step 1: Role Name & Color, Step 2: Preset Permissions: Admin, Cashier, Accountant, Sales Exec).

---

### 5. `/crm/attendance` — `src/pages/crm/Attendance.tsx`
- **Current Mobile Implementation**:
  - Features Selfie Clock-In pod, Live Geolocation radar, and Monthly Attendance Calendar / Log Table (lines 1–2650).
- **Mobile Ergonomic Defects**:
  - **Camera Viewport Sizing**: On 360px screens, the camera video feed (`w-72 h-72`) causes outer page scrolling when camera permissions are granted.
  - **Attendance Log Table**: Desktop table contains 8 columns (`Date`, `Staff`, `Shift`, `In Time`, `Out Time`, `Geo Distance`, `Work Hours`, `Status`). On mobile, it scrolls horizontally.
- **Proposed Mobile Specification (< 768px)**:
  - **Selfie Clock-In Pod**: Fixed aspect ratio camera container (`aspect-square max-w-[260px] mx-auto rounded-2xl overflow-hidden`) with clear green radar pulse ring.
  - **Touch Attendance Cards**: For attendance logs on mobile, replace table with daily cards:
    - Header: Date (`font-mono font-bold`) + Status Badge (`Present` / `Late` / `Half Day` / `Absent`).
    - Body: In Time (`09:12 AM`) → Out Time (`06:45 PM`) + Total Hours (`8h 33m font-mono`).
    - Geo Badge: `Within Geofence (42m)` in emerald or `Out of Bounds (1.2km)` in rose.

---

### 6. `/crm/meet` — `src/pages/crm/Meet.tsx`
- **Current Mobile Implementation**:
  - Instant Video Room generation pod, scheduled meetings list, and meeting launch buttons (lines 1–480).
- **Mobile Ergonomic Defects**:
  - Action buttons (`Start Instant Meet`, `Schedule`) stack awkwardly on 360px screens.
  - Meeting room card shows copy link icon with `h-8 w-8`, but lacks 1-tap WhatsApp meeting invite share.
- **Proposed Mobile Specification (< 768px)**:
  - **Compact Instant Room Card**: Top card with room ID input and 44px primary CTA `[ Join / Start Meeting ]`.
  - **Meeting Card Action Dock**: Each scheduled meeting card includes 1-tap `[ Join ]` (`bg-blue-600 text-white font-semibold text-xs h-8.5`) and `[ Share on WhatsApp ]` (`bg-emerald-600 text-white h-8.5 px-3 rounded-lg flex items-center gap-1.5`).

---

### 7. `/crm/broadcasts` — `src/pages/crm/Broadcasts.tsx`
- **Current Mobile Implementation**:
  - Circulars and announcements broadcast feed with acknowledgment buttons (lines 1–525).
- **Mobile Ergonomic Defects**:
  - Compose announcement dialog is a desktop centered modal with rich text formatting options that get squeezed on mobile screens.
- **Proposed Mobile Specification (< 768px)**:
  - **High-Density Circular Cards**: 3-line card: Title + Priority Badge (`Urgent` / `General`), Timestamp (`font-mono text-[11px]`), 2-line snippet, and 1-tap `[ Acknowledge (✓) ]` button (`min-h-[44px]`).
  - **Bottom-Sheet Broadcast Composer**: Sheet with department target selector chips (`All`, `Sales`, `Accounts`, `Inventory`) and clean textarea with auto-grow.

---

### 8. `/crm/ai` — `src/pages/crm/AIAssistant.tsx`
- **Current Mobile Implementation**:
  - AI Assistant chat interface for CRM queries (lines 1–415).
- **Mobile Ergonomic Defects**:
  - **Rigid `h-[520px]` Height**: Line 205 has a rigid `h-[520px]` card container. On mobile, this causes double scrolling (outer viewport + inner chat).
  - **Unanchored Bottom Input**: The prompt input textarea is positioned inside the card rather than docked to the mobile thumb zone with `safe-area-inset-bottom`.
- **Proposed Mobile Specification (< 768px)**:
  - **Full-Viewport Mobile Chat Mode**: `h-[calc(100dvh-52px)] flex flex-col`.
  - **Anchored Bottom Input Dock**: Textarea dock fixed to bottom thumb zone with `p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800`.
  - Quick prompt recommendation chips: Horizontal scrollable pills above input (`"Today's Sales"`, `"Pending Overdue"`, `"Top Selling Items"`).

---

### 9. `/crm/support` — `src/pages/crm/Support.tsx`
- **Current Mobile Implementation**:
  - Support ticket desk with SLA badges, customer ticket list, and message thread (lines 1–650).
- **Mobile Ergonomic Defects**:
  - Desktop table used on tablet/desktop; on mobile, ticket list shows full details causing tall cards.
  - Ticket response modal opens centered desktop dialog.
- **Proposed Mobile Specification (< 768px)**:
  - **Ticket Cards**: Compact 70px card with Ticket ID (`#TKT-1042`), SLA timer badge (`2h left` in amber), customer name, and status badge.
  - **Full-Screen Reply Drawer**: Clicking a ticket slides up a full-screen drawer showing conversation history and bottom-docked reply box.

---

## Part 2: Comprehensive POS & Billing Ledger Survey (9 Routes)

### 1. `/sales` — `src/pages/Sales.tsx`
- **Current Mobile Implementation**:
  - Features `hidden md:block` (desktop table, lines 950–1150) and `block md:hidden` (mobile transaction cards, lines 600–750).
  - Mobile cards display Invoice #, Date, Customer Name, Total Amount, Payment Status badge, and 44px action buttons (`View`, `WhatsApp`, `PDF`).
- **Mobile Ergonomic Opportunities**:
  - Mobile cards are well-structured with `min-h-[44px]` touch targets.
  - Can be further optimized by tightening internal padding from `p-4` to `p-3` and font scale to standard `text-xs font-semibold` to comfortably display 4 cards per viewport on 375px screens.

---

### 2. `/purchases` — `src/pages/Purchases.tsx`
- **Current Mobile Implementation**:
  - Features `hidden md:block` (desktop table) and `block md:hidden` (mobile cards, lines 750–920).
  - Includes `[ Pay Now ]` button, Supplier name, Purchase Bill #, and Due Date.
- **Mobile Ergonomic Opportunities**:
  - Ensure `[ Pay Now ]` button opens a mobile bottom-sheet payment recorder rather than navigating away.

---

### 3. `/customers` — `src/pages/Customers.tsx`
- **Current Mobile Implementation**:
  - Customer list with search, balance summary, and action buttons (lines 600–850).
- **Mobile Ergonomic Defects**:
  - **Sub-44px Icon Buttons**: Edit, Delete, and Record Payment buttons (lines 665–689) use `p-1` (24x24px) or `w-7 h-7` (28x28px), causing mis-taps.
  - **Full Page Navigation for Ledger**: Clicking customer ledger redirects to `/customers/:id/ledger` full page, breaking user flow when quickly verifying balances on mobile.
- **Proposed Mobile Specification (< 768px)**:
  - **Card Density (4–5 Cards/Viewport)**: Each card `p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2`.
    - Customer Name (`text-xs font-bold`) + Phone (`font-mono text-[11px]`).
    - Balance: `₹ X,XXX` (Emerald if credit, Rose if overdue balance).
    - Quick Action Bar: 44px touch targets:
      - `[ 📞 Call ]` (`h-8.5 px-3 rounded-lg border border-slate-200 flex items-center gap-1 text-xs`)
      - `[ 💬 WhatsApp ]` (`h-8.5 px-3 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 text-xs font-semibold`)
      - `[ 📋 Quick Ledger ]` (`h-8.5 px-3 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 text-xs font-semibold`)
  - **Bottom-Sheet Quick Ledger**: Clicking `[ Quick Ledger ]` opens a 5-item transaction preview drawer with `[ Full Statement ]` link, preventing jarring page reloads.

---

### 4. `/suppliers` — `src/pages/Suppliers.tsx`
- **Current Mobile Implementation**:
  - Supplier directory and payable balances (lines 550–800).
- **Mobile Ergonomic Defects**:
  - **Sprawling Card Height (160px+)**: Cards include multi-line address blocks, large GSTIN badges, and loose padding, fitting only 1–2 suppliers on screen at once.
- **Proposed Mobile Specification (< 768px)**:
  - **Compact Supplier Card (78px height)**:
    - Line 1: Supplier Name (`text-xs font-bold`) + Payable Balance (`text-sm font-mono font-bold text-rose-600`).
    - Line 2: Contact Person + Phone (`font-mono text-[11px] text-muted-foreground`).
    - Line 3: 1-tap action chips: `[ 📞 Call ]`, `[ 💬 WhatsApp ]`, `[ Pay Bill ]` (`min-h-[44px] touch target area`).

---

### 5. `/inventory` — `src/pages/Inventory.tsx`
- **Current Mobile Implementation**:
  - Low stock alerts, stock level progress bars, batch tracking, and adjustment modal (lines 600–900).
- **Mobile Ergonomic Defects**:
  - Stock Adjustment modal uses desktop centered dialog (`DialogContent sm:max-w-md`).
- **Proposed Mobile Specification (< 768px)**:
  - **Catalog Card (80px height)**: Item name (`text-xs font-bold`), SKU/Barcode (`font-mono text-[11px]`), Current Stock pill with color warning (Rose if `< min_stock`), Stock Valuation.
  - **Bottom-Sheet Quick Adjuster**: 1-tap `[ Adjust ]` button opens bottom drawer with `+` / `-` stepper buttons (`44x44px`), reason dropdown (`Purchase Return`, `Damaged / Expired`, `Inventory Count`), and quick `[ Save Stock ]` CTA.

---

### 6. `/godown` — `src/pages/Godown.tsx`
- **Current Mobile Implementation**:
  - Tab 1: Godown Facilities (grid cards).
  - Tab 2: Stock Transfer Records (lines 640–717).
  - Tab 3: Transfer Modal & Facility Modal (lines 723–957).
- **Mobile Ergonomic Defects**:
  - **Tab 2 Rigid Table**: Stock Transfer Records is rendered as an 7-column HTML `<table>` inside an `overflow-x-auto` container (lines 640–702). Mobile users must swipe horizontally across 7 columns.
  - **Stock Transfer Modal**: Multi-field form in centered dialog (lines 834–957) with 8 inputs that get pushed off-screen when mobile keyboard appears.
- **Proposed Mobile Specification (< 768px)**:
  - **Tab 2 Mobile Waybill Cards (`block md:hidden`)**:
    - Header: Waybill # (`font-mono font-bold text-xs`) + Status Badge (`Completed` / `In Transit` / `Pending`).
    - Route: Source Godown `→` Destination Godown with arrow icon.
    - Product: Item Name + SKU + Quantity (`font-mono font-bold text-sm`).
    - Footer: Vehicle No + Date (`text-[11px] text-muted-foreground`).
  - **Transfer Stock Bottom Sheet**: Multi-step bottom drawer with warehouse dropdowns, item selector with barcode scan button, and 44px `[ Dispatch & Transfer ]` button.

---

### 7. `/items` — `src/pages/Items.tsx`
- **Current Mobile Implementation**:
  - Product catalog, category pills, search bar, stock & pricing cards (lines 650–950).
- **Mobile Ergonomic Opportunities**:
  - Dedicated mobile item cards are present.
  - Ensure category pills use `h-8 px-3 rounded-lg text-xs` with `active:scale-95` and smooth horizontal swipe without scrollbar obstruction.

---

### 8. `/reports` — `src/pages/Reports.tsx`
- **Current Mobile Implementation**:
  - 3-Column Report Grid (`grid grid-cols-1 lg:grid-cols-3 gap-3.5`, lines 543–654).
  - Top 1-click filing action bar (GSTR-1 JSON, GSTR-1 Excel, GSTR-3B Excel, Share CA, lines 423–504).
- **Mobile Ergonomic Defects**:
  - **Endless Vertical Stacking**: On mobile (`grid-cols-1`), all 3 categories (Favourite, GST, Transaction) are expanded, resulting in 20+ report rows that require tedious scrolling.
  - **Top Action Bar Overflow**: Top 1-click buttons scroll horizontally in a single tight row.
- **Proposed Mobile Specification (< 768px)**:
  - **Collapsible Category Accordions**: Group reports into 3 collapsible touch accordions on mobile:
    - `⭐ Favourites & GST Returns (4)` [Expanded by default]
    - `🏛️ GST & Tax Compliance (7)` [Collapsed]
    - `📊 Transaction, P&L & Balance Sheet (10)` [Collapsed]
  - **Card Viewport Containment**: Fits the screen neatly; user taps category to view only relevant reports.
  - **1-Click Export Bottom Drawer**: Clicking any report opens bottom sheet with direct buttons: `[ Download Official JSON ]`, `[ Download Multi-Sheet Excel (.xls) ]`, and `[ Email to CA ]`.

---

### 9. `/cash-and-bank` — `src/pages/CashAndBank.tsx`
- **Current Mobile Implementation**:
  - 2-Column Split: Left panel = Balances & Accounts (Total Net Liquidity, Cash in hand, Bank accounts, Unlinked). Right panel = Transactions feed (lines 605–950).
  - Has `block md:hidden` touch cards for transactions (lines 874–949).
- **Mobile Ergonomic Defects**:
  - **Account Panel Pushes Transactions Below Fold**: On mobile (`flex-col`), the left account panel sits above the transaction feed, consuming 350px of vertical space. Users cannot see recent transactions without scrolling.
  - **Sub-44px Delete Button**: Line 941 has `p-1 rounded text-slate-400` (24x24px hit area).
- **Proposed Mobile Specification (< 768px)**:
  - **Swipeable Horizontal Account Carousel (Top 96px)**:
    - Replace the tall vertical account stack on mobile with a horizontal scrollable card strip:
      - Card 1: `Total Liquidity: ₹ X,XXX` (Emerald)
      - Card 2: `Cash in hand: ₹ X,XXX`
      - Card 3: `HDFC Bank ••4210: ₹ X,XXX`
      - Card 4: `Unlinked Txns: ₹ X,XXX` (Blue)
    - Tapping a card filters transactions immediately.
  - **Immediate Transaction Stream**: Transactions feed starts immediately beneath the 96px carousel, showing 4-5 transaction cards per viewport.
  - **44px Action Targets**: Expand transaction action buttons to minimum 44x44px ergonomic touch bounds.

---

## Part 3: Architecture & Layout Compliance Matrix

| Page / Route | Route Path | Desktop Layout (>= 768px) | Mobile Viewport (< 768px) Defect | Mobile Touch Specification | Desktop Preservation Status |
|---|---|---|---|---|---|
| **CRM Dashboard** | `/crm`, `/crm/dashboard` | 4-col KPI + Multi-col Quick Tools | Header wrap on 360px, label clipping | 2x2 compact KPI, 2-col 56px tool cards | 100% Preserved (`hidden md:block`) |
| **Tasks** | `/crm/tasks` | 4-column Drag Kanban Board | Vertical 4-column stack, drag fails | Segmented status pills + 1-tap advance | 100% Preserved (`hidden md:grid`) |
| **Salary Management** | `/crm/salary` | 4-Tab High Density Table | Payroll card missing advance balance & slip | Added advance due pill & 1-tap payslip | 100% Preserved (`hidden md:block`) |
| **Role Management** | `/crm/roles` | Matrix Grid with Sticky Header | Permission switches cramped on 360px | Collapsible category accordions + 44px rows | 100% Preserved (`hidden md:block`) |
| **Attendance** | `/crm/attendance` | Geofence Radar + 8-col Log Table | Log table horizontal overflow | Aspect-square camera + Daily touch cards | 100% Preserved (`hidden md:block`) |
| **Meet** | `/crm/meet` | Instant Room Pod + Scheduled Grid | Copy link button small, missing WhatsApp | 44px CTA + 1-tap WhatsApp meeting share | 100% Preserved (`hidden md:block`) |
| **Broadcasts** | `/crm/broadcasts` | Feed + Rich Composer Modal | Rich modal squeezed on mobile | Compact card + Bottom-sheet composer | 100% Preserved (`hidden md:block`) |
| **AI Assistant** | `/crm/ai` | 520px Fixed Card in Workbench | Rigid 520px height double scroll | Full-viewport (100dvh) + Anchored thumb input | 100% Preserved (`hidden md:block`) |
| **Support Desk** | `/crm/support` | Ticket Table + SLA Badges | Desktop table cramped | 70px Ticket cards + Full-screen reply drawer | 100% Preserved (`hidden md:block`) |
| **Sales** | `/sales` | Dense Data Table + Actions | Minor padding bloat | High-density 4-card viewport + 44px actions | 100% Preserved (`hidden md:block`) |
| **Purchases** | `/purchases` | Dense Data Table + Actions | Modals centered | Bottom-sheet payment recorder | 100% Preserved (`hidden md:block`) |
| **Customers** | `/customers` | Data Table + Ledger | 24px icon buttons, full page redirect | 44px Call/WhatsApp chips + Quick ledger drawer | 100% Preserved (`hidden md:block`) |
| **Suppliers** | `/suppliers` | Data Table + Payables | 160px sprawling card (1-2 per screen) | 78px compact cards (4-5 per viewport) | 100% Preserved (`hidden md:block`) |
| **Inventory** | `/inventory` | Batch Table + Stock Bar | Stock adjustment modal centered | 80px catalog card + Stepper bottom sheet | 100% Preserved (`hidden md:block`) |
| **Godown** | `/godown` | Facility Grid + 7-col Transfers | 7-col transfer table horizontal scroll | Tab 2 mobile waybill cards + Bottom sheet | 100% Preserved (`hidden md:block`) |
| **Items** | `/items` | Catalog Grid + Pricing Table | Chip scrollbar overflow | 34px swipeable chips + Ergonomic catalog | 100% Preserved (`hidden md:block`) |
| **Reports** | `/reports` | 3-Column 3D Glass Grid | 20+ report endless vertical stack | 3 Collapsible category accordions | 100% Preserved (`hidden md:grid`) |
| **Cash & Bank** | `/cash-and-bank` | 2-Panel Split Workbench | Top account panel pushes txns below fold | 96px Horizontal account carousel + Txn stream | 100% Preserved (`hidden lg:flex`) |

---

## Part 4: Reusable Mobile Ergonomic Primitives

To maintain absolute visual consistency across the entire application, UI engineering agents should adopt three standardized primitive patterns:

### Primitive A: Mobile Bottom-Sheet Drawer Template
```tsx
{/* Mobile Drawer Wrapper */}
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="fixed inset-x-0 bottom-0 top-auto translate-x-0 translate-y-0 rounded-t-2xl sm:rounded-2xl sm:max-w-lg max-h-[92dvh] overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 shadow-2xl">
    <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3 sm:hidden" />
    <DialogHeader className="text-left pb-2 border-b border-slate-100 dark:border-slate-800">
      <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">{title}</DialogTitle>
    </DialogHeader>
    {/* Body content */}
    <div className="py-3 space-y-3">{children}</div>
    {/* Fixed Bottom Action Dock */}
    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
      <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-9 rounded-xl text-xs font-semibold">Cancel</Button>
      <Button onClick={onSubmit} className="flex-1 h-9 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white">Save / Submit</Button>
    </div>
  </DialogContent>
</Dialog>
```

### Primitive B: Standard 44px Minimum Touch Action Chip
```tsx
{/* Ergonomic Touch Action Chip */}
<button
  type="button"
  onClick={onClick}
  className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 text-xs font-semibold"
>
  <Icon className="w-4 h-4 text-slate-500" />
  <span>{label}</span>
</button>
```

### Primitive C: Viewport-Contained Category Accordion for Mobile
```tsx
{/* Mobile Accordion Container */}
<div className="block md:hidden space-y-2.5">
  {categories.map((cat) => (
    <div key={cat.id} className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
      <button
        onClick={() => toggleCategory(cat.id)}
        className="w-full min-h-[44px] px-4 py-3 flex items-center justify-between text-left font-bold text-xs"
      >
        <span>{cat.title} ({cat.count})</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform", openCats[cat.id] && "rotate-180")} />
      </button>
      {openCats[cat.id] && <div className="divide-y divide-slate-100 dark:divide-slate-800/60 p-2">{/* Category cards */}</div>}
    </div>
  ))}
</div>
```
