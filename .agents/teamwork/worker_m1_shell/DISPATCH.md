## 2026-10-21T00:29:54Z
You are worker_m1_shell.
Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1_shell

Read ORIGINAL_REQUEST.md at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (specifically request dated 2026-10-21T05:43:08+05:30 / 2026-10-21T00:05:26Z).
Read DISPATCH.md at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_mobile_redesign\DISPATCH.md.
Read PROJECT.md at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_mobile_redesign\PROJECT.md.
Read explorer survey report at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_shell\handoff.md.
Read authoritative skill at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\mobile-erp-redesign\SKILL.md.

File Ownership:
You EXCLUSIVELY own and may modify:
- src/components/AppLayout.tsx
- src/components/AppSidebar.tsx
Do NOT touch any other files without permission.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Objective:
Implement Milestone 1: Mobile Shell & Floating Bottom Navigation Dock according to the Clean High-Density Retail Minimal (Stripe / Shopify POS) design system.

Tasks:
1. Top Mobile Header in src/components/AppLayout.tsx:
   - Within `header`, isolate mobile header elements to `flex md:hidden items-center justify-between w-full`.
   - Store Name & Switcher on the left: store initial avatar badge + store name + ChevronDown dropdown.
   - Center/Right elements:
     - Live Cloud Sync status pill (emerald pulse dot, font-mono text-[9px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full).
     - Instant Search trigger button (Search icon, min 44×44px touch target) invoking `setOpenCommand(true)`.
     - Notification Center Bell with unread badge (`pendingCount + unreadCount`).
     - Profile Avatar with dropdown for account/settings/signout.
2. Viewport Content Container in src/components/AppLayout.tsx:
   - Update `<main>` bottom padding on mobile (`isMobile && !isPosRoute`) to:
     `pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]`.
   - Ensure `pt-[env(safe-area-inset-top,0px)]` and `pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))]` on POS routes are preserved.
3. Floating Bottom Navigation Dock in src/components/AppSidebar.tsx:
   - 5 native-feeling touch tabs:
     1. `Home` (`ROUTE_PATHS.dashboard`, `LayoutDashboard`)
     2. `Sales` (`ROUTE_PATHS.sales`, `Receipt`)
     3. `POS Billing` (`ROUTE_PATHS.checkout`, `ShoppingCart` on elevated center pill `-mt-5`, `w-13 h-13` or `w-14 h-14` rounded-2xl ring-4 ring-white shadow-xl bg-gradient-to-tr from-indigo-600 to-blue-500)
     4. `Items` (`ROUTE_PATHS.items`, `Package`)
     5. `Purchases` (`ROUTE_PATHS.purchases`, `Truck`)
   - Every tab must satisfy minimum 44×44px hit target (`min-h-[44px]` or `min-h-[48px]`).
   - Tactile feedback: `active:scale-[0.98] transition-transform`.
   - Bottom safe area padding: `pb-[max(0.65rem,env(safe-area-inset-bottom,0px))]`.
   - Floating dock container: `fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]`.
4. Strict Desktop Invariance:
   - All desktop elements (`hidden md:flex`, `hidden md:block`, `hidden xl:flex`, `hidden sm:flex`) must remain 100% untouched and functional.
   - Desktop 3D perspective wrapper on `<main>` and watermark must remain intact.
5. Verification:
   - Run `node node_modules/typescript/bin/tsc --noEmit` and verify exit code 0.
   - Run `npx vitest run src/test/MobileInvoiceSuccessView.test.tsx src/test/billingLifecycleEngine.test.ts` and verify all tests pass.
6. Handoff:
   - Write comprehensive report to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1_shell\handoff.md`.
   - Send completion message to orchestrator.
