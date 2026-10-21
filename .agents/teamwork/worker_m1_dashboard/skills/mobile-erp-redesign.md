# Mobile ERP & POS Redesign Standard (Local Skill Dump)

Source: `.agents/skills/mobile-erp-redesign/SKILL.md`

## Core Architectural Rules
1. Desktop Invariance (Zero Regression): All desktop classes (`hidden md:flex`, `hidden md:block`, etc.) remain intact. Coexist cleanly.
2. Mobile Ergonomics (Touch-First & Thumb-Zone Friendly): Minimum 44x44px touch targets. Safe area insets. Responsive data cards.
3. POS Billing Mobile Experience: Clean split stages, sticky bottom actions.
4. Modals & Dialogs on Mobile: Bottom-sheet drawers.
5. Performance & Transitions: Zero layout shifts, swift tab switching.
