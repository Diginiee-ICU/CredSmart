---
name: mobile-erp-redesign
description: >-
  Expert instructions and design principles for building high-performance, native-feeling,
  and production-ready mobile views for ERP, POS, inventory, billing, and financial ledger applications.
  Enforces 100% desktop preservation while crafting dedicated touch-first mobile interfaces.
---

# Mobile ERP & POS Redesign Standard

This skill defines the technical standards, UX patterns, and UI architecture for building mobile-first experiences in POS & ERP systems.

## Core Architectural Rules

1. **Desktop Invariance (Zero Regression)**:
   - All desktop classes (`hidden md:flex`, `hidden md:block`, `md:table-cell`, `lg:grid-cols-...`) must remain 100% intact.
   - Never remove or shrink desktop controls, buttons, tables, shortcuts, or dialogs.
   - Desktop and mobile layouts coexist either via CSS breakpoint switching (`block md:hidden` vs `hidden md:block`) or clean modular sub-components (e.g., `<MobileCardList />` alongside `<DesktopTable />`).

2. **Mobile Ergonomics (Touch-First & Thumb-Zone Friendly)**:
   - **Touch Targets**: Minimum 44x44px for buttons, chips, and interactive cards.
   - **Bottom Navigation & Bottom Action Bars**: Primary actions (e.g. Save, Print, Add Item, Hold Bill, Pay Now) must be easily reachable with one hand at the bottom of the screen.
   - **Safe Area Insets**: Always support iOS Notch / Dynamic Island / Android navigation bar with `env(safe-area-inset-bottom)` and `env(safe-area-inset-top)`.
   - **Card & Swipe Patterns**: Instead of truncated 10-column tables on a 375px phone, display responsive data cards with key metrics (Amount, Status badge, Date, Party) prominently visible, expandable for secondary details.

3. **POS Billing Mobile Experience**:
   - Split views into clear mobile stages / tabs (e.g. `Items Catalog / Scan`, `Current Cart (${itemCount})`, `Payment / Checkout`).
   - Sticky bottom bar showing item count, total ₹ amount, and prominent "Checkout" / "Pay" button.
   - Fast search and camera barcode scanner integration directly accessible via one tap.

4. **Modals & Dialogs on Mobile**:
   - Use bottom-sheet / full-screen drawer styles on mobile (`max-h-[92dvh] rounded-t-3xl overflow-y-auto`) with fixed bottom action buttons.
   - Avoid cramped desktop dialogs that clip screen edges or have nested horizontal scrolls.

5. **Performance & Transitions**:
   - Zero layout shifts, swift tab switching, smooth animations with `transition-all duration-200`.
