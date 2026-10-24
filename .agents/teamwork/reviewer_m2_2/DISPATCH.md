# Dispatch Directive: Reviewer 2 — Milestone 2 (POS Billing Workbench)

## Mission
Independently review the Milestone 2 changes in `src/pages/POSBilling.tsx`:
1. Hotkey Ribbon: Verify monochromatic styling with hairline borders (`border-slate-200/80 bg-white hover:bg-slate-100`) and clean monospace badges (`[F1]`, `[CTRL+I]`, `[CTRL+B]`, `[P]`, `[Q]`, `[D]`, `[V]`, `[DEL]`).
2. Right Column Decoupling: Verify 3 regions:
   - Region 1 (Top Fixed Total): Net Payable in `text-2xl font-bold font-mono tabular-nums`.
   - Region 2 (Middle Bounded Scroll): Breakdown, payment mode, received amount/change due, customer profile.
   - Region 3 (Bottom Fixed Action Dock): `Save & Print [F6]`, `Save Bill [F7]`, and `WhatsApp Receipt`.
3. Screen-Fitted Containment: Verify zero vertical scroll is required to click Save or Print on standard 768px-900px displays.
4. Test & Type Check: Run `cmd /c npx vitest run src/test/billingLifecycleEngine.test.ts` and `cmd /c npx tsc --noEmit`.
5. Protected Files: Verify zero modifications to protected invoice files.

## References to Read
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (Section `## 2026-10-24T18:51:21Z`)
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2\handoff.md`
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md`
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md`

## Expected Output
Write `handoff.md` in `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_m2_2\handoff.md` with your verdict (APPROVE or REQUEST_CHANGES). Send message when done.

## 2026-10-24T19:44:41Z
You are Reviewer 2 for Milestone 2 of the CredSmart Minimal & Fast-Access Redesign project.
Dedicated working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\reviewer_m2_2
Task: Objectively review and adversarially challenge the POS Billing workbench.
