# DISPATCH — E2E Test Suite Writer (Milestone 1)

**Working Directory**: c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\test_writer_m1
**Role**: E2E Test Suite Writer
**Original Request**: c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (Section 2026-10-13T20:00:31Z)
**Project Plan**: c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_invoice\PROJECT.md
**Test Infrastructure Plan**: c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_invoice\TEST_INFRA.md
**Visual Design Reference**: c:\Users\bishn\Documents\GitHub\CredSmart\Correction\New folder\New Invoice.jpeg

## Objectives
1. Read `ORIGINAL_REQUEST.md` (Section 2026-10-13T20:00:31Z), `PROJECT.md`, and `TEST_INFRA.md`.
2. Check environment: Ensure node dependencies are ready (run `npm install` if `node_modules` is missing).
3. Author the comprehensive opaque-box test suites:
   - `src/test/unifiedInvoiceRenderer.test.tsx`:
     - **Tier 1 (Feature Coverage)**: Assert all 15 features in isolation (clean unboxed TAX INVOICE header, stacked right-aligned metadata, cyan line `#0ea5e9` / `#0284c7`, dual FROM/BILL TO pods with light-blue ribbons `bg-[#e0f2fe]` / `bg-[#e8f4fd]`, bottom sub-compartments for Place of Supply & Customer, uppercase ITEM DETAILS, solid dark navy header `bg-[#0c324e]` with white text, columns S.No./Description/HSN/Qty/Rate/Amount, financial summary breakdown, soft blue rounded highlight pill for `Invoice total (rounded)`, clean unboxed Amount in words, dual cards for BANK ACCOUNT DETAILS and AUTHORISED SIGNATORY, minimalist footer "Thank you for your business.").
     - **Tier 2 (Boundary & Corner Cases)**: Empty/null customer info, long business names/addresses, single item, zero items, 0% tax, zero rate, multi-unit quantities (`formatItemQuantityDisplay`), large amounts, decimal fractions.
     - **Tier 3 (Cross-Feature Combinations)**: Document type variations (`sales_invoice`, `pos_invoice`, `quotation`, `proforma_invoice`, `credit_note`), thermal vs standard modes, cash received vs partial credit balance.
     - **Tier 4 (Real-World Application Scenarios)**: Realistic end-to-end invoice setups matching `New Invoice.jpeg` (Woodzire / Suvrat Sunil Ghatiwala invoice, 5% GST, 4,988 total).
   - `src/test/downloadExactInvoice.test.ts`:
     - Test off-screen container layout (794px width, 1123px min-height).
     - Test single-page A4 scaling mathematics ($794 \times 1123$ vs $210 \times 297$), 0.5mm tolerance threshold, and horizontal centering.
     - Test `ExactInvoicePayload` forwarding of `bankDetails`.
4. Run the test suite (`npx vitest run src/test/unifiedInvoiceRenderer.test.tsx src/test/downloadExactInvoice.test.ts` or `npm test`).
5. Publish `TEST_READY.md` summarizing the runner command, tier breakdown, and test counts.
6. Deliver `handoff.md` with complete verification details.


## 2026-10-13T20:33:51Z
You are E2E Test Suite Writer for Milestone 1 of CredSmart Master GST Invoice Redesign.
Your working directory is: c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\test_writer_m1
Read your dispatch file at c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\test_writer_m1\DISPATCH.md
Read ORIGINAL_REQUEST.md at c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (Section 2026-10-13T20:00:31Z).
Read PROJECT.md at c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_invoice\PROJECT.md
Read TEST_INFRA.md at c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_invoice\TEST_INFRA.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task:
1. Ensure node dependencies are ready (run npm install if node_modules is missing or required for vitest).
2. Author the opaque-box test suites:
   - `src/test/unifiedInvoiceRenderer.test.tsx` (Tiers 1-4 coverage matching TEST_INFRA.md and New Invoice.jpeg).
   - `src/test/downloadExactInvoice.test.ts` (PDF single-page scaling math, tolerance, off-screen container layout, bank details payload).
3. Run the test suite using `npx vitest run src/test/unifiedInvoiceRenderer.test.tsx src/test/downloadExactInvoice.test.ts` (it is expected that some layout tests will fail on the UNMODIFIED legacy invoice renderer before Milestone 2 implements the visual redesign; ensure the test suite itself compiles cleanly and is fully ready to verify Milestone 2).
4. Publish `c:\Users\bishn\Documents\GitHub\CredSmart\TEST_READY.md` (and a copy at `c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_invoice\TEST_READY.md`) summarizing the test runner command and coverage breakdown.
5. Deliver `handoff.md` in your working directory.
When finished, send a message back with your findings summary and file paths.
