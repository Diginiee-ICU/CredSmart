# Dump of mobile-erp-redesign SKILL.md
Source: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\mobile-erp-redesign\SKILL.md

Core Directives:
- Desktop Invariance (Zero Regression): All desktop classes remain 100% intact. Coexistence via CSS breakpoint switching or modular sub-components.
- Mobile Ergonomics: 44x44px min touch target, bottom navigation / action bars, safe area insets env(safe-area-inset-bottom), responsive cards instead of truncated tables.
- POS Billing Mobile Experience: Split into stages/tabs (Catalog / Scan, Cart (${itemCount}), Payment / Checkout). Sticky bottom bar with itemCount, amount, checkout. Fast search and barcode scanner.
- Modals & Dialogs on Mobile: Bottom-sheet / full-screen drawer (max-h-[92dvh] rounded-t-3xl overflow-y-auto) with fixed bottom buttons.
- Performance & Transitions: Zero layout shifts, transition-all duration-200.
