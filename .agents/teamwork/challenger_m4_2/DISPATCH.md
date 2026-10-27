# Task Assignment: Milestone 4 Challenger 2 — Adversarial Navigation & Deep Link Stress Challenge

## Objective
Author and execute an adversarial challenge testing route lockdown boundaries:
1. Test that pure CRM staff users without POS permissions are strictly redirected when accessing:
   - `/billing/checkout`
   - `/billing/pos`
   - `/billing/parties`
   - `/billing/items`
   - `/billing/sales`
   - `/billing/dashboard`
2. Test that store owners, cashiers, and users with granular POS permissions (`userPermissions.pos: true`) are allowed through to `<Outlet />`.
3. Test that unauthorized attempts fire exactly one alert toast without infinite loops.
4. Execute test suite and run `cmd /c npx tsc --noEmit`.

## Output
Write your report to:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\challenger_m4_2\handoff.md`
Send your verdict (`APPROVE` or `FAIL`) via `send_message` to the orchestrator.

## 2026-10-26T22:59:58Z
You are Challenger 2 for Milestone 4 (Strict POS/Billing Route Lockdown - Requirement R4).
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\challenger_m4_2
Read instructions in: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\challenger_m4_2\DISPATCH.md
Read the user request in: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
Read the worker handoff in: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_lockdown\handoff.md

Adversarially challenge route lockdown:
1. Verify deep link interception across `/billing/pos`, `/billing/checkout`, `/billing/parties`, `/billing/sales`, `/billing/dashboard` for pure CRM staff.
2. Verify store owners, super admins, cashiers, and users with granular POS permissions pass through.
3. Verify toast deduplication and zero loop re-triggers.
4. Run your test suite and `cmd /c npx tsc --noEmit`.

Write your report to: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\challenger_m4_2\handoff.md
Send your verdict (APPROVE or FAIL) via send_message to the orchestrator.
