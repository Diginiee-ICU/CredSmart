# Survey Task Assignment: Mobile Ergonomics & Protected Routes Explorer

## Mission
Investigate mobile ergonomics (< 768px) and map protected invoice flows across CredSmart:
1. Thumb-Zone Bottom Navigation Dock: Check `AppSidebar.tsx` / `AppLayout.tsx` for fixed bottom dock (5 destinations, 44px+ hit targets, `safe-area-inset-bottom`).
2. Swipeable Action Strip: Check action chips under header (`+ Sale Bill`, `+ Quick POS`, `+ Customer`, etc.).
3. Responsive Mobile Data Cards: Check list rendering in `Dashboard.tsx`, `Sales.tsx`, `Purchases.tsx`, `Items.tsx`, `Parties.tsx` on viewports 360px-430px.
4. Mobile Bottom-Sheet Drawers: Check modal drawer implementations.
5. STRICT WRITE BOUNDARY AUDIT: Locate and document all components of the protected Create Invoice flow (`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`, etc.) to guarantee zero modifications and zero regressions.

## References
- User Request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-24T18:51:21Z`)
- Design System Rules: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md`
- Master Skill: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\credsmart-minimal-design-system\SKILL.md`
- Visual Mockup: `C:/Users/bishn/.gemini/antigravity/brain/a2993855-5881-4a48-9b6e-369ad00d3392/credsmart_mobile_app_mockup_1792867057837.jpg`

## Working Directory
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\survey_explorer_mobile`

## Expected Output
Write `handoff.md` in your working directory with detailed findings, component inventory, touch target audit, and protected file inventory for Milestone 3 & 4.


## 2026-10-24T18:55:31Z
You are the Mobile Ergonomics & Protected Routes Explorer for the CredSmart Minimal & Fast-Access Redesign project.

Your dedicated working directory is:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\survey_explorer_mobile`

Read your dispatch directive:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\survey_explorer_mobile\DISPATCH.md`

Read the authoritative user request:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-24T18:51:21Z`)

Read the design rules and master skill:
- `.agents/rules/minimal-design-system.md`
- `.agents/skills/credsmart-minimal-design-system/SKILL.md`

View the Mobile Mockup:
`C:/Users/bishn/.gemini/antigravity/brain/a2993855-5881-4a48-9b6e-369ad00d3392/credsmart_mobile_app_mockup_1792867057837.jpg`

Investigate the existing codebase (read-only):
- `src/components/AppSidebar.tsx` / `src/components/AppLayout.tsx` (mobile bottom nav dock)
- `src/pages/Dashboard.tsx`
- `src/pages/Sales.tsx`
- `src/pages/Purchases.tsx`
- `src/pages/Items.tsx`
- `src/pages/Parties.tsx`
- All modal dialogs and drawers on mobile
- PROTECTED FLOWS: Inspect `src/components/invoices/mobile/MobileCreateInvoice.tsx`, `src/components/SalesInvoiceModal.tsx`, `src/components/invoices/mobile/AddItemModal.tsx`, `src/components/invoices/mobile/SelectPartyModal.tsx`, `src/components/invoices/mobile/EditItemModal.tsx`, and map exact file paths.

Your objective:
1. Audit mobile thumb-zone bottom navigation dock (5 destinations: Home, Sales, Center Elevated 46x46px + POS/Bill, Items, Parties, with 44px+ hit targets and `safe-area-inset-bottom`).
2. Audit swipeable action strip below header.
3. Audit mobile card stream layouts replacing horizontal table scroll.
4. Audit mobile bottom-sheet drawers (`max-h-[92dvh] rounded-t-2xl`) with fixed bottom confirmation bars.
5. Create an EXPLICIT PROTECTED FILE INVENTORY: list all invoice creation files that MUST NOT be touched or modified under any circumstances.
6. Provide a clear refactoring blueprint for Milestone 3 & 4 mobile views.

Write your complete findings and recommendations to:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\survey_explorer_mobile\handoff.md`

You are read-only: do NOT edit source files. When done, send a message to the orchestrator with your summary and handoff path.
