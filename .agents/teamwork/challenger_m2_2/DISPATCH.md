# Dispatch Directive: Challenger 2 — Milestone 2 (POS Billing Hotkeys & Containment Challenger)

## Mission
Empirically stress-test the POS Billing workbench (`src/pages/POSBilling.tsx`):
1. Test all hotkey shortcuts: `F1` (search focus), `F2` (discount), `F3` (charge), `F6` (print), `F7` (save bill), `P` (price), `Q` (qty), `D` (discount), `V` (voice), `DEL` (delete item).
2. Stress-test the 3-region decoupled checkout panel: verify top net total does not scroll away, middle breakdown scrolls independently, and bottom action bar remains pinned with Save & Print buttons always clickable.
3. Run test suites:
   `cmd /c npx vitest run src/test/billingLifecycleEngine.test.ts src/test/MobileInvoiceSuccessView.test.tsx`
4. Verify TypeScript compilation: `cmd /c npx tsc --noEmit`.

## References to Read
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (Section `## 2026-10-24T18:51:21Z`)
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2\handoff.md`
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md`
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md`

## Expected Output
Write `handoff.md` in `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\challenger_m2_2\handoff.md` with your verdict (APPROVE or REQUEST_CHANGES). Send message when done.
