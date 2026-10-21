## 2026-10-21T00:16:32Z
[Message] timestamp=2026-10-21T00:16:32Z sender=92c8e148-9d89-47d7-9329-5f4887fd7091 priority=MESSAGE_PRIORITY_HIGH content=You are explorer_survey_shell.
Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_shell

Read ORIGINAL_REQUEST.md at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (specifically the request dated 2026-10-21T00:05:26Z).
Read DISPATCH.md at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_mobile_redesign\DISPATCH.md.
Read authoritative skill at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\mobile-erp-redesign\SKILL.md.

Objective:
Investigate CredSmart's existing global app shell, navigation architecture, and mobile layout wrappers (src/components/AppLayout.tsx, src/components/AppSidebar.tsx, any mobile navigation/headers in src/components/, safe area insets in index.html / index.css, route definitions in src/App.tsx).

Survey Questions to Answer:
1. How is mobile vs desktop currently separated in AppLayout.tsx, AppSidebar.tsx, and related shell components?
2. How to implement the Top Mobile Header (store name/switcher, live cloud sync status pill, instant search trigger, notification center bell with unread badge, profile avatar)? What existing contexts/hooks provide store name, sync state, notifications, and user avatar?
3. How to implement the Floating Bottom Navigation Dock with 5 native-feeling touch tabs (Home/Dashboard, Sales/Invoices, POS Billing center elevated pill, Items/Inventory, Purchases/Suppliers)? What icons, routes, and active tab highlights are best suited?
4. What exact viewport padding and safe area inset styles are required (pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))])?
5. What desktop elements must be preserved with 100% invariance (hidden md:flex, hidden md:block, etc.)?

Scope Boundaries:
- Read-only investigation! NEVER modify application source code files.
- Produce handoff report at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_shell\handoff.md.
- Send message back to orchestrator when complete.
