---
name: credsmart-minimal-design-system
description: >-
  Ultra-high production-grade master design standard for CredSmart by CredAlert.
  Defines full-stack minimalist UI/UX tokens, typography hierarchy, neutral surface color architecture,
  fast-access desktop productivity layouts, and native-feeling touch-first mobile ergonomics.
  Enforces 100% desktop-mobile divergence with zero regression across business workflows.
---

# CredSmart Minimal & Fast-Access Design System (Master Standard)

This skill defines the technical design tokens, architectural rules, layout patterns, and component blueprints for redesigning CredSmart into a modern, minimal, lightning-fast, and user-friendly ERP, POS, and financial billing platform.

---

## 1. Core Design Philosophy: "Clean, Dense & Instant"

CredSmart is a high-frequency daily utility for merchants, accountants, and store owners. The design must prioritize **speed of comprehension**, **speed of input**, and **calm visual ergonomics**.

1. **Zero Visual Clutter**:
   - Eliminate heavy 3D glass reflections, multi-color skeuomorphic gradients, neon glowing drop shadows, and unnecessary animated pulses.
   - Replace with crisp 1px hairline borders (`border-slate-200/80` in light, `border-slate-800` in dark), subtle micro-elevations (`shadow-xs`), and generous whitespace balanced with high data density.

2. **Distinct Mobile & Desktop Architectures**:
   - **Desktop View**: Optimized for mouse, large monitor real-estate, keyboard shortcuts (`⌘K`, hotkeys), multi-column data tables with sticky headers, and split-screen productivity.
   - **Mobile View**: Optimized for one-handed thumb interaction (360px–430px), bottom-docked navigation, swipeable action chips, compact responsive data cards, and full-screen bottom-sheet drawers.

3. **Instant Ergonomic Access**:
   - Primary actions (Create Invoice, POS Billing, Add Item, Add Customer) must be accessible within **1 click or tap** from any screen.
   - Global Search & Command Palette (`⌘K`) available everywhere.

---

## 2. Design Tokens: Typography, Palette & Surfaces

### A. Typography Scale
- **Primary Sans Font**: `'Inter'`, `-apple-system`, `BlinkMacSystemFont`, `'Segoe UI'`, `Roboto`, `sans-serif`. Clean, universally legible across all OS devices.
- **Monospace & Tabular Numbers**: `'IBM Plex Mono'`, `ui-monospace`, `monospace` with `font-feature-settings: "tnum" on, "cv02", "cv03", "cv04"`. Used exclusively for currency amounts, invoice numbers, timestamps, and barcodes.
- **Strict Hierarchy**:
  | Token | Size | Line Height | Weight | Usage |
  |---|---|---|---|---|
  | `text-2xl` / `text-3xl` | 24px - 30px | 1.2 | 700 / Bold | Hero KPI figures, major invoice totals |
  | `text-lg` / `text-xl` | 18px - 20px | 1.25 | 600 / SemiBold | Page titles, modal headings |
  | `text-sm` / `text-base`| 14px - 15px | 1.4 | 500 / 600 | Card titles, primary form labels, table cells |
  | `text-xs` | 12px - 13px | 1.4 | 400 / 500 | Table column headers, metadata, secondary descriptions |
  | `text-[11px]` | 11px | 1.3 | 600 / Bold | System badges, keyboard shortcut chips, status pills |
  *(Note: Avoid any sub-10px fonts to ensure accessible readability).*

### B. Minimal Neutral Color Architecture
CredSmart moves away from multi-colored rainbow confusion to a calm, high-contrast palette:

```css
/* LIGHT MODE (Clean, Crisp Neutral Canvas) */
--background: 210 20% 98%;          /* #F8FAFC - Soft crisp neutral */
--foreground: 222 47% 11%;          /* #0F172A - Deep slate for ultra-readable text */

--card: 0 0% 100%;                  /* #FFFFFF - Pure white card surfaces */
--card-foreground: 222 47% 11%;

--border: 214 32% 91%;              /* #E2E8F0 - Crisp hairline border */
--input: 214 32% 91%;

/* Primary Accent: Sophisticated Royal/Electric Blue */
--primary: 221 83% 53%;             /* #2563EB - Trustworthy, high-visibility blue */
--primary-foreground: 0 0% 100%;
--primary-soft: 214 100% 97%;       /* #EFF6FF - Soft tint for hover & active states */

/* Semantic Status Tokens */
--success: 158 64% 42%;             /* #10B981 - Emerald: Paid, Active, In Stock */
--success-soft: 152 76% 96%;
--destructive: 346 87% 45%;         /* #E11D48 - Rose: Overdue, Voided, Out of Stock */
--destructive-soft: 355 100% 97%;
--warning: 38 92% 50%;              /* #F59E0B - Amber: Pending, Due Today */
--warning-soft: 48 100% 96%;
```

```css
/* DARK MODE (Deep Charcoal & Midnight Minimal) */
--background: 224 45% 6%;           /* #090D16 - Deep midnight */
--foreground: 210 40% 98%;          /* #F8FAFC - Clear off-white */

--card: 224 35% 10%;                /* #111726 - Elevated charcoal surface */
--card-foreground: 210 40% 98%;

--border: 217 33% 18%;              /* #1E293B - Hairline dark divider */
--input: 217 33% 18%;

--primary: 217 91% 60%;             /* #3B82F6 - Bright accessible blue */
--primary-foreground: 0 0% 100%;
--primary-soft: 224 45% 15%;
```

### C. Radii & Shadows
- **Border Radius**: 
  - Buttons & Inputs: `rounded-lg` (8px) or `rounded-xl` (12px).
  - Cards & Containers: `rounded-xl` (12px) to `rounded-2xl` (16px).
  - Badges & Pills: `rounded-full`.
  - Avoid oversized 3xl bubble shapes.
- **Box Shadows**:
  - `shadow-xs`: `0 1px 2px 0 rgba(15, 23, 42, 0.04)` (for buttons, input fields, and inline controls).
  - `shadow-sm`: `0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px -1px rgba(15, 23, 42, 0.08)` (for surface cards).
  - `shadow-md`: `0 4px 6px -1px rgba(15, 23, 42, 0.08)` (for dropdown menus, popovers, and bottom action docks).

---

## 3. Desktop Layout Architecture (Screens >= 768px)

### A. Unified Top Command Header (52px / h-13)
The desktop experience revolves around a single, distraction-free command header:
1. **Left Section**:
   - Minimal Brand Badge (CredSmart wordmark with clean suite indicator).
   - Organization Switcher dropdown with quick store stats.
   - Suite Switcher (Billing & POS ↔ CRM Command Center).
2. **Center Section**:
   - Command Palette Search Button (`⌘K` / `Ctrl+K`): Instant keyboard-driven lookup for parties, items, invoices, and settings.
3. **Right Section**:
   - Split "+ New Invoice" Action Button: Primary action in deep accent blue with dropdown for Quotation, Payment In, Purchase, and Expense.
   - "+ POS Billing" Fast Access Link (direct hotkey).
   - Live Sync Status Pill (subtle green dot with "Sync Live").
   - Notification Center Bell with unread counter badge.
   - User Profile Menu with quick role switcher.

### B. High-Density Data Tables
Desktop tables prioritize data density, rapid scanning, and zero horizontal scroll clipping:
- **Header**: Sticky top (`sticky top-0 bg-white/95 backdrop-blur-sm`), uppercase 11px font with sort arrows (`ArrowUpDown`), border-b.
- **Row Height**: Compact 40px–44px with subtle zebra or clean hover background (`hover:bg-slate-50/80 dark:hover:bg-slate-800/50`).
- **Alignment Rules**:
  - Text, party names, invoice numbers: **Left-aligned**.
  - Dates, statuses, units: **Center-aligned**.
  - Quantities, tax rates, total currency amounts: **Right-aligned** with monospace tabular figures (`font-mono tabular-nums`).
- **Row Actions**: Subtle hover action group (Quick View, Print, WhatsApp, Duplicate, Edit) without cluttering default view.

### C. Split-Screen POS Billing & Terminal Mode
- 2-Column Desktop layout:
  - **Left 60%**: Fast-search item catalog with barcode scanner input, category filter chips, and instant click-to-add items.
  - **Right 40%**: Active checkout bill cart, line-item quantity adjusters, discount/tax controls, and large high-visibility checkout button.

---

## 4. Mobile Layout Architecture (Screens < 768px)

### A. Thumb-Zone Bottom Navigation Dock
Fixed to the bottom of the screen with explicit safe-area inset:
- **Dock Height**: `56px` + `env(safe-area-inset-bottom)`.
- **5 Navigation Destinations**:
  1. `Home` (Dashboard overview & store KPIs)
  2. `Sales` (Invoices, Quotations, Payments In)
  3. **Center Elevated CTA**: `+ POS` or `+ Bill` (Primary touch target, 50x50px rounded-2xl)
  4. `Items` (Stock catalog & prices)
  5. `Parties` (Customer & Supplier udhar ledgers)
- **Ergonomics**: Minimum touch targets of 44x44px, immediate active icon highlight with subtle 2px top indicator.

### B. Swipeable Fast-Access Action Strip
Below the compact mobile top bar, a horizontal scrollable strip with 1-tap micro-cards:
- `+ Sale Bill` | `+ Quick POS` | `+ Customer` | `+ Item` | `Scan Barcode` | `Day Book`
- Fast thumb activation without diving into nested hamburger menus.

### C. Mobile Responsive Data Cards (Zero Truncated Tables)
Instead of squeezed 10-column desktop tables with awkward horizontal scroll, mobile views render clean responsive cards:
```tsx
<div className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs active:scale-[0.99] transition-transform">
  <div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs flex items-center justify-center font-mono">
        {partyInitials}
      </div>
      <div className="min-w-0">
        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{partyName}</h4>
        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{docNumber} • {docDate}</p>
      </div>
    </div>
    <div className="text-right shrink-0">
      <div className="text-xs font-bold font-mono tabular-nums text-slate-900 dark:text-white">
        ₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
      </div>
      <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold font-mono mt-1", statusBadgeClass)}>
        {status}
      </span>
    </div>
  </div>
</div>
```

### D. Full-Screen Bottom-Sheet Drawers
Modals on mobile (Create Item, Add Customer, Filter, Settings) automatically render as smooth bottom sheets:
- `max-h-[92dvh] rounded-t-2xl overflow-y-auto` with swipe-down indicator handle.
- Fixed bottom action bar with full-width primary button (`Save & Continue` / `Confirm & Print`).

---

## 5. Implementation Rules & Best Practices

1. **Breakpoint Separation**:
   - Use `block md:hidden` for mobile-optimized layouts and `hidden md:block` (or `md:flex`) for desktop productivity layouts.
   - Never compromise desktop power-user efficiency for mobile, and never cram desktop tables onto small phone screens.

2. **Keyboard Navigation First (Desktop)**:
   - All modals must be dismissible via `Escape`.
   - Command Palette triggered via `⌘K` or `Ctrl+K`.
   - Forms support `Tab` cycling and `Enter` submit.

3. **Performance & CLS (Cumulative Layout Shift)**:
   - Zero layout shifts during data loading; use lightweight CSS skeletons (`animate-pulse bg-slate-100 dark:bg-slate-800 rounded-lg`).
   - Fast tab transitions with `transition-all duration-150 ease-out`.

4. **Preserve Business Logic**:
   - Never alter underlying database hooks, queries, tax calculations (CGST/SGST/IGST), or route structures.
   - Changes are strictly confined to Theme, Fonts, Style, Structure, and Layout.
