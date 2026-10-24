# Dispatch Directive: Worker — Milestone 3 (Mobile Ergonomics & Native-Touch Layouts)

## 2026-10-24T20:06:00Z
You are the implementation Worker for Milestone 3 of the CredSmart Minimal & Fast-Access Redesign project.
Your working directory is: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m3`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Mandatory Documents to Read
1. `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (Section `## 2026-10-24T18:51:21Z`)
2. `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md`
3. `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md`
4. `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\credsmart-minimal-design-system\SKILL.md`

## Your Exclusive Write Ownership
You are strictly authorized to modify ONLY these 4 files:
- `src/components/AppSidebar.tsx`
- `src/components/items/CreateItemModal.tsx`
- `src/components/parties/CreatePartyModal.tsx`
- `src/test/mobileErgonomicsChallenger.test.ts`

## STRICT QUARANTINE: 19 Protected Invoice Files (DO NOT TOUCH)
Under no circumstances may you edit, format, or modify any of the following 19 quarantined files:
1. `src/components/invoices/mobile/MobileCreateInvoice.tsx`
2. `src/components/invoices/mobile/AddItemModal.tsx`
3. `src/components/invoices/mobile/SelectPartyModal.tsx`
4. `src/components/invoices/mobile/EditItemModal.tsx`
5. `src/components/invoices/mobile/MobileInvoiceSuccessView.tsx`
6. `src/components/invoices/mobile/MobileBillPreviewModal.tsx`
7. `src/components/invoices/mobile/MobileInvoiceFitViewer.tsx`
8. `src/components/invoices/mobile/CreatePartyModal.tsx`
9. `src/components/invoices/mobile/MobileCreatePurchaseInvoice.tsx`
10. `src/components/items/mobile/CreateNewItemModal.tsx`
11. `src/components/SalesInvoiceModal.tsx`
12. `src/components/PurchaseInvoiceModal.tsx`
13. `src/components/invoices/AddItemsToBillModal.tsx`
14. `src/components/invoices/InvoiceFitView.tsx`
15. `src/components/invoices/UnifiedInvoiceRenderer.tsx`
16. `src/utils/downloadExactInvoice.ts`
17. `src/utils/whatsappPdfShare.ts`
18. `src/utils/invoiceThemeLoader.ts`
19. `src/services/documentsService.ts`

## Tasks to Implement

### 1. Mobile Bottom Navigation Dock (`src/components/AppSidebar.tsx`)
- **Tab 5 Destination Fix**: Refactor Tab 5 from `Purchases` (`ROUTE_PATHS.purchases`) to `Parties` (`ROUTE_PATHS.parties`). Use `Users2` icon and label `Parties`. Update active check: `isPartiesActive = isRouteActive(ROUTE_PATHS.parties) || isRouteActive(ROUTE_PATHS.customers);`.
- **Center Elevated CTA Standard**: Replace `52x52px` (`w-[52px] h-[52px]`) with exact `46x46px` (`w-[46px] h-[46px] rounded-xl font-bold`) in solid Royal Blue (`bg-blue-600 hover:bg-blue-700 text-white shadow-md active:scale-95`). Completely eliminate skeuomorphic multi-color rainbow gradients (`from-indigo-600 via-indigo-500 to-purple-600` / amber).
- **Single Royal Blue Active State**: Replace rainbow active colors (Amber, Indigo, Emerald) on tab items with the single Royal Blue accent (`text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30`). Inactive tabs: `text-slate-400 hover:text-slate-600 dark:hover:text-slate-300`.
- **Ergonomics & Touch Targets**: Guarantee all 5 touch targets maintain `min-h-[44px]` and `pb-[max(0.65rem,env(safe-area-inset-bottom,0px))]`.

### 2. Mobile Bottom-Sheet Drawers (`CreateItemModal.tsx` & `CreatePartyModal.tsx`)
- On mobile (`< 768px`), refactor from full-screen `h-[100dvh] max-h-[100dvh] rounded-none` to smooth bottom-sheet drawers:
  - Dialog content container: `max-h-[92dvh] rounded-t-2xl sm:rounded-2xl border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl`.
  - Top drag handle indicator: `<div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto my-2 sm:hidden shrink-0" />`.
  - Fixed bottom confirmation action bar: `sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-slate-200/80 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] flex items-center justify-end gap-2 shrink-0`.

### 3. Test Assertion Synchronization (`src/test/mobileErgonomicsChallenger.test.ts`)
- Synchronize regex from `w-[52px] h-[52px]` to `w-[46px] h-[46px]`.
- Ensure Tab 5 tests pass cleanly for `Parties`.

### 4. Verification Requirements
- `cmd /c npx tsc --noEmit` (exit code 0, 0 errors).
- `cmd /c npx vitest run src/test/mobileErgonomicsChallenger.test.ts src/test/mobileTouchErgonomicsRemediation.test.ts src/test/billingLifecycleEngine.test.ts` (100% pass).
- `cmd /c npx eslint src/components/AppSidebar.tsx src/components/items/CreateItemModal.tsx src/components/parties/CreatePartyModal.tsx` (0 errors).

Write your handoff report to:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m3\handoff.md`
When done, send a message to orchestrator `3044c8ce-523a-4157-917d-31b6f5d55c6a`.
