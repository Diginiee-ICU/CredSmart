---
name: mobile-erp-redesign
description: >-
  Expert instructions and production-grade design principles for building high-performance,
  native-feeling, and minimal mobile views for ERP, POS, inventory, billing, and financial ledger applications.
  Enforces 100% desktop preservation while crafting dedicated touch-first mobile interfaces.
---

# Mobile ERP & POS Redesign Standard (Master Production Grade)

This skill defines the technical standards, UX patterns, and UI architecture for building mobile-first experiences in POS & ERP systems. It coordinates with the `credsmart-minimal-design-system` skill to guarantee visual harmony, minimal aesthetics, and instant user ergonomics.

---

## 1. Core Architectural Rules

1. **Desktop Invariance (Zero Regression)**:
   - All desktop classes (`hidden md:flex`, `hidden md:block`, `md:table-cell`, `lg:grid-cols-...`) must remain 100% intact.
   - Never remove or shrink desktop controls, buttons, tables, shortcuts, or dialogs.
   - Desktop and mobile layouts coexist either via CSS breakpoint switching (`block md:hidden` vs `hidden md:block`) or clean modular sub-components (e.g., `<MobileCardList />` alongside `<DesktopTable />`).

2. **Mobile Ergonomics (Touch-First & Thumb-Zone Friendly)**:
   - **Touch Targets**: Strictly enforce a minimum of 44x44px for buttons, chips, list items, and interactive cards.
   - **Bottom Navigation & Bottom Action Bars**: Primary actions (Save, Print, Add Item, Hold Bill, Pay Now, Checkout) must be easily reachable with one hand at the bottom of the screen.
   - **Safe Area Insets**: Always support iOS Notch, Dynamic Island, and Android gesture navigation bars using `env(safe-area-inset-bottom)` and `env(safe-area-inset-top)`.
   - **Card & Swipe Patterns**: Instead of truncated 10-column tables on a 375px phone, display responsive data cards with key metrics (Amount, Status badge, Date, Party) prominently visible, expandable for secondary details.

3. **POS Billing Mobile Experience**:
   - Split views into clear mobile stages / tabs:
     - Stage 1: `Items Catalog / Barcode Scan`
     - Stage 2: `Current Cart (${itemCount})`
     - Stage 3: `Payment / Checkout`
   - Sticky bottom bar showing item count, total ₹ amount, and prominent "Checkout" / "Pay" button.
   - Fast search and camera barcode scanner integration directly accessible via one tap.

4. **Modals & Dialogs on Mobile**:
   - Use bottom-sheet / full-screen drawer styles on mobile (`max-h-[92dvh] rounded-t-2xl overflow-y-auto`) with fixed bottom action buttons.
   - Avoid cramped desktop dialogs that clip screen edges or have nested horizontal scrolls.

5. **Performance & Transitions**:
   - Zero layout shifts (CLS = 0), swift tab switching, smooth animations with `transition-all duration-150`.
   - Use lightweight, crisp hairline borders (`border-slate-200/80` in light mode, `border-slate-800` in dark mode) and clean minimal typography.
