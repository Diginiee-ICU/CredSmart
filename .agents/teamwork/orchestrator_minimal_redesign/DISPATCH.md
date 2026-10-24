# Dispatch Directive: CredSmart Minimal & Fast-Access Redesign

## Mission
Execute a complete multi-agent redesign of CredSmart's Theme, Fonts, Style, Structure, and Layout from scratch into a modern, attractive, minimalist, lightning-fast, and user-friendly experience across both mobile (< 768px) and desktop (>= 768px) views. The redesign strictly prohibits visual crowding, bloated buttons, and long scrollable pages, ensuring screen-fitted data density with zero business logic regression.

## Working Directory
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_minimal_redesign`

## Authoritative User Request
See `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` under section `## 2026-10-24T18:51:21Z`.

## Mandatory References & Design System
1. **Design System Rules**: `.agents/rules/minimal-design-system.md`
2. **Master Skill Specification**: `.agents/skills/credsmart-minimal-design-system/SKILL.md`
3. **Reference Visual Targets**:
   - Desktop Mockup: `C:/Users/bishn/.gemini/antigravity/brain/a2993855-5881-4a48-9b6e-369ad00d3392/credsmart_desktop_dashboard_1792867012395.jpg`
   - Mobile Mockup: `C:/Users/bishn/.gemini/antigravity/brain/a2993855-5881-4a48-9b6e-369ad00d3392/credsmart_mobile_app_mockup_1792867057837.jpg`

## Core Requirements Breakdown
- **R1. Non-Crowded Minimal Design System & Proportions**:
  - Button sizing: Standard action button `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs` (34px); compact/table button `h-7 px-2.5 rounded-md text-[11px] font-medium` (28px); micro icon button `w-7.5 h-7.5 rounded-md` (30x30px); center mobile CTA `46x46px rounded-xl`. Eliminate oversized `h-11`, `h-12`, and `rounded-3xl` bubble buttons.
  - De-cluttering & Whitespace: Strip redundant explanatory prose from cards. Rely on 1px hairline borders (`border-slate-200/80` light, `border-slate-800` dark) and micro-shadows (`shadow-xs`). Completely eliminate heavy 3D glass reflections, skeuomorphic bevels, liquid glass, and glowing neon halos.
  - Typography & Readability: `'Inter'` sans-serif with system fallbacks. Tabular monospace `'IBM Plex Mono'` (`font-mono tabular-nums`) strictly for currency (₹), numbers, dates, and barcodes. No sub-11px micro-fonts.
  - Surfaces & Palette: Light mode `#F8FAFC` background with `#FFFFFF` pure white cards; Dark mode `#090D16` background with `#111726` elevated charcoal cards; Accent royal/electric blue `#2563EB` with semantic Emerald `#10B981` and Rose `#E11D48`.
- **R2. Screen-Fitted Desktop Productivity Shell (Screens >= 768px, Zero Long Scroll)**:
  - Unified 52px command header (`h-13`) hosting compact 28px brand mark, org switcher, suite toggle, Command Palette (`⌘K`), split `+ New Invoice`, live sync dot, notifications, profile.
  - Screen-fitted data tables: Sticky table header, bounded scrollable table body (`flex-1 min-h-0 overflow-y-auto`), fixed pagination footer.
  - Split POS workbench: Dual-pane layout (left item catalog scrolls independently, right cart scrolls independently, checkout action bar fixed at bottom) with monospace hotkey badges (`F1`-`F7`, `CTRL+B`, `CTRL+I`, `DEL`).
- **R3. Mobile Ergonomics & Native-Touch Layout (Screens < 768px)**:
  - Thumb-Zone bottom navigation dock fixed at bottom with `safe-area-inset-bottom` and 5 destinations (`Home`, `Sales`, Center Elevated `+ POS/Bill` 46x46px, `Items`, `Parties`) with min 44x44px touch targets.
  - Swipeable action strip below header (`+ Sale Bill`, `+ Quick POS`, `+ Customer`, `+ Item`, `Day Book`).
  - Responsive mobile data cards replacing wide tables.
  - Full-screen bottom-sheet drawers (`max-h-[92dvh] rounded-t-2xl overflow-y-auto`) with fixed bottom confirmation bars.
- **R4. Core Application Pages Overhaul**:
  - `Dashboard.tsx`, `POSBilling.tsx`, `Sales.tsx`, `Purchases.tsx`, `Items.tsx`, `Inventory.tsx`, `Parties.tsx`, `Customers.tsx`, `Suppliers.tsx`, `CashAndBank.tsx`, `Expenses.tsx`, and `CRM Portal`.
- **R5. Zero Business Logic & Structural Regression**:
  - Strictly preserve Supabase real-time updates, GST tax calculation engines, PDF generation, routes, role permissions, and printing pipelines.

## Team Decomposition Guidance
Deploy specialized subagents (e.g. design-system-core, mobile-view-architect, desktop-layout-architect, theme-visual-qa) using distinct working folders under `.agents/teamwork/`. Verify with `npm run build` and `npm run lint`.


## 2026-10-24T18:53:03Z
[Message] timestamp=2026-10-24T18:53:03Z sender=89c87ca4-db87-4c7b-8195-abda0c200ca9 priority=MESSAGE_PRIORITY_HIGH
You are the Project Orchestrator for the CredSmart Minimal & Fast-Access Redesign project.

Your dedicated working directory is:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_minimal_redesign`

Read the authoritative dispatch directive and user prompt:
1. Dispatch instructions: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_minimal_redesign\DISPATCH.md`
2. Verbatim user prompt: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` under section `## 2026-10-24T18:51:21Z`
3. Design System Rules: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md`
4. Master Skill Reference: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\credsmart-minimal-design-system\SKILL.md`
5. Visual Reference Targets:
   - Desktop Minimal Dashboard Mockup: `C:/Users/bishn/.gemini/antigravity/brain/a2993855-5881-4a48-9b6e-369ad00d3392/credsmart_desktop_dashboard_1792867012395.jpg`
   - Mobile Touch-First Screen Mockup: `C:/Users/bishn/.gemini/antigravity/brain/a2993855-5881-4a48-9b6e-369ad00d3392/credsmart_mobile_app_mockup_1792867057837.jpg`

Your mission is to decompose and orchestrate the specialized multi-agent design & layout team to redesign CredSmart's complete Theme, Fonts, Style, Structure, and Layout into a modern, attractive, minimalist, lightning-fast, and user-friendly experience across both mobile (< 768px) and desktop (>= 768px) views:
- Milestone 1: Non-Crowded Minimal Design System & Base Primitives (Colors, Buttons 34px/28px/46px, Hairline Borders, Typography Inter & IBM Plex Mono tabular, Zero Bloated Bubble Buttons, Zero Skeuomorphism)
- Milestone 2: Screen-Fitted Desktop Shell & Productivity Layouts (52px Unified Command Header, Sticky-Header/Scrollable-Body/Fixed-Footer Data Tables, Split POS Workbench with hotkeys)
- Milestone 3: Mobile Ergonomics & Native-Touch Layouts (Fixed Bottom Navigation Dock with 44px+ touch targets, Swipeable Action Strip, Responsive Touch Cards, Smooth Bottom-Sheet Drawers)
- Milestone 4: Core Application Pages Overhaul (Dashboard, POSBilling, Sales, Purchases, Items, Inventory, Parties, Customers, Suppliers, CashAndBank, Expenses, CRM Portal)
- Milestone 5: Verification & Zero Regression (TypeScript compilation `npm run build`, ESLint `npm run lint`, all route/DB/Supabase/GST/PDF invariance)

Maintain your `plan.md` and `progress.md` continuously in your working directory. Ensure each subagent has a dedicated subdirectory under `.agents/teamwork/`. When you complete all milestones and verify acceptance criteria, report completion back to the Sentinel.


## 2026-10-24T18:56:14Z
[Message] timestamp=2026-10-24T18:56:14Z sender=89c87ca4-db87-4c7b-8195-abda0c200ca9 priority=MESSAGE_PRIORITY_HIGH
Received. Survey Phase tracking active. Proceed with Phase 0 synthesis into PROJECT.md and Milestone 1 dispatch upon receiving explorer handoffs. Standing by.


## 2026-10-24T19:31:29Z
[Message] timestamp=2026-10-24T19:31:29Z sender=89c87ca4-db87-4c7b-8195-abda0c200ca9 priority=MESSAGE_PRIORITY_HIGH
Received. Milestone 1 certification logged. Milestone 2 (Screen-Fitted Desktop Shell) tracking active under Worker 1c7e4f38. Standing by for M2 completion and verification.

## 2026-10-24T20:22:39Z
[Message] timestamp=2026-10-24T20:22:39Z sender=89c87ca4-db87-4c7b-8195-abda0c200ca9 priority=MESSAGE_PRIORITY_HIGH
Received. Milestone 3 Worker completion logged. Multi-agent verification gate active (Reviewers 224a6107, 3b0eef4c; Challengers 31ab3a15, bed585bd; Forensic Auditor 6abfd960). Standing by for gate verdict.

## 2026-10-24T20:30:23Z
[Message] timestamp=2026-10-24T20:30:23Z sender=89c87ca4-db87-4c7b-8195-abda0c200ca9 priority=MESSAGE_PRIORITY_HIGH
Received. Milestone 3 certification logged (Gate PASS, Forensic Audit CLEAN). Milestone 4 (Core Application Pages Overhaul) tracking active. Standing by.

## 2026-10-24T20:43:23Z
[Message] timestamp=2026-10-24T20:43:23Z sender=89c87ca4-db87-4c7b-8195-abda0c200ca9 priority=MESSAGE_PRIORITY_HIGH
Received. Milestone 4 exploration synthesis logged. Worker M4 (73d7344a) dispatch noted with strict quarantine enforcement on all 19 invoice creation files. Standing by for worker handoff report.
