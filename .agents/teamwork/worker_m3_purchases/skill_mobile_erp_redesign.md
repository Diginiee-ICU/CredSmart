# Mobile ERP & POS Redesign Standard (Local Skill Copy)

Source: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\mobile-erp-redesign\SKILL.md

## Core Architectural Rules

1. **Desktop Invariance (Zero Regression)**:
   - All desktop classes (`hidden md:flex`, `hidden md:block`, `md:table-cell`, `lg:grid-cols-...`) must remain 100% intact.
   - Never remove or shrink desktop controls, buttons, tables, shortcuts, or dialogs.
   - Desktop and mobile layouts coexist either via CSS breakpoint switching (`block md:hidden` vs `hidden md:block`) or clean modular sub-components.

2. **Mobile Ergonomics (Touch-First & Thumb-Zone Friendly)**:
   - **Touch Targets**: Minimum 44x44px for buttons, chips, and interactive cards.
   - **Bottom Navigation & Bottom Action Bars**: Primary actions easily reachable with one hand at the bottom of the screen.
   - **Safe Area Insets**: Support `env(safe-area-inset-bottom)` and `env(safe-area-inset-top)`.
   - **Card & Swipe Patterns**: Responsive data cards with key metrics (Amount, Status badge, Date, Party) prominently visible.

3. **Performance & Transitions**:
   - Zero layout shifts, swift tab switching, smooth animations.
