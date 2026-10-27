# Task Assignment: Milestone 3 Challenger 2 — Synthetic ID & Rollback Stress Challenge

## Objective
Design and execute adversarial stress tests for Milestone 3 (R3):
1. Create a stress test suite (e.g. `src/test/crmTasksSyntheticRollbackChallenger.test.tsx` or similar) verifying:
   - Rejection/filtering of synthetic IDs (`user-123456`, `user-${Date.now()}`) in assignees and form inputs.
   - Genuine UUID acceptance (`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`).
   - Deterministic state rollback when `createCRMTask` fails: temporary task is completely removed from state, error toast triggered.
   - Deterministic state rollback when status transitions (`updateCRMTaskStatus`, `approveCRMTask`, etc.) fail: task reverts to original status.
   - Clean empty state (`[]`) when backend returns 0 tasks.
2. Execute the test suite and verify 100% pass rate.
3. Run `cmd /c npx tsc --noEmit` to verify type safety.

## Output
Write report to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\challenger_m3_2\handoff.md` with explicit verdict: `APPROVE` or `FAIL`.
Send a completion message back with your verdict.

## 2026-10-26T22:03:41Z
You are Challenger 2 for Milestone 3 (Tasks & Staff Provisioning - R3).
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\challenger_m3_2
Read your instructions in: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\challenger_m3_2\DISPATCH.md
Read the user request in: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
Read the worker handoff in: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m3_tasks\handoff.md

Write and execute an adversarial stress test suite verifying:
1. Rejection of synthetic IDs (`user-123456`, `user-${Date.now()}`) and strict UUID acceptance.
2. Deterministic rollback in `Tasks.tsx` when task creation fails (optimistic task removed, destructive toast called).
3. Deterministic rollback in `Tasks.tsx` when lifecycle status transitions fail (status reverted to original, destructive toast called).
4. Empty organization rendering clean empty state (`[]`).
Run Vitest on your new test suite, and run `cmd /c npx tsc --noEmit`.

Write your report to: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\challenger_m3_2\handoff.md
Send your verdict (APPROVE or FAIL) via send_message to the orchestrator.
