## 2026-10-27T03:30:49Z

You are a Worker subagent (Worker Milestone 2: Mobile POS Billing Terminal).
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2
Read ORIGINAL_REQUEST.md at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (specifically the last section ## 2026-10-27T02:39:33Z).
Read PROJECT.md at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md.
Read Explorer 2's comprehensive analysis and blueprint in:
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_2\analysis.md
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_2\handoff.md
Read user rules in: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
- src/pages/POS.tsx
- src/components/pos/MobilePOSTerminal.tsx
- src/components/pos/MobileProductCard.tsx
- src/components/pos/MobileCartDock.tsx
- src/components/pos/MobileCheckoutDrawer.tsx
- src/pages/POSBilling.tsx (wire mobile terminal for < 768px while strictly preserving the desktop workbench intact)
- src/test/mobilePosTerminal.test.tsx

TASK:
1. Create `src/pages/POS.tsx` re-exporting `POSBilling` (mirroring `Checkout.tsx`).
2. Create `src/components/pos/` directory and components:
   - `MobilePOSTerminal.tsx`: Single-column mobile POS layout (< 768px):
     * Sticky top bar (back to dashboard, barcode scan button, and product search input).
     * Horizontal category chips carousel with 1-tap filtering.
     * Scrollable high-density product cards (4-5 visible per scroll) with item name, price, stock badge, and 1-tap `+` / `-` stepper.
     * Floating Bottom Cart Dock (`fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]`) with item count, grand total (₹), and "Review Cart & Checkout" CTA.
     * 1-Tap Checkout Bottom Drawer: Slide-up bottom sheet drawer for customer details, payment method selection (Cash, UPI/QR, Card, Credit), and "Generate Bill & Print" CTA.
   - `MobileProductCard.tsx`: High-density touch product card (item name, selling price, stock pill, `+`/`-` stepper).
   - `MobileCartDock.tsx`: Floating bottom dock with safe area padding.
   - `MobileCheckoutDrawer.tsx`: Bottom sheet checkout drawer.
3. In `src/pages/POSBilling.tsx`:
   - Integrate `<MobilePOSTerminal ... />` on mobile viewports (< lg / < 768px) sharing state with `POSBilling`.
   - Preserve 100% of the desktop 2-column workbench (`hidden lg:flex` / `lg:block`). DO NOT alter desktop hotkeys, 3-region right panel, 9-column cart table, or comments expected by desktop shell challenger tests.
4. Write comprehensive test suite in `src/test/mobilePosTerminal.test.tsx` verifying:
   - Single-column layout on mobile.
   - Category filtering updates visible products.
   - 1-tap `+`/`-` steppers update cart quantity.
   - Bottom cart dock renders item count and grand total.
   - Checkout drawer opens and allows payment method selection and printing trigger.
5. Run tests and typecheck:
   - cmd /c npx vitest run src/test/mobilePosTerminal.test.tsx
   - cmd /c npx vitest run src/test/desktopShellMilestone2.challenger.test.tsx
   - cmd /c npx vitest run src/test/posBillingWorkbenchAdversarial.challenger.test.tsx
   - cmd /c npx vitest run src/test/posBillingRemediation.test.tsx
   - cmd /c npx tsc --noEmit
6. Deliver full completion report in:
   c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2\handoff.md
7. Send completion message via send_message to orchestrator (conversation ID: d2d7b35b-d1d5-45b5-9a65-d7a02d968987).
