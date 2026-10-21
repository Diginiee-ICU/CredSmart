# Adversarial Review Round 2 Handoff Report: Invoicing & Sync Hardening

> [!WARNING] **Skepticism Disclaimer**
> 103 unit/stress tests and full TypeScript typecheck pass cleanly with zero errors; however, live multi-device Supabase CDC broadcast delivery and physical thermal printer ESC/POS output require staging device confirmation.

---

## 1. What the Prior Attempt Got Wrong

### Defect 1: Silent False Full-Payment on Explicit Partial Payments when `markAsFullyPaid` is Omitted
- **Input:** `calculatePaymentStatusAndBalance({ grandTotal: 1000, paymentMethod: "Cash", amountReceived: 400 })` with `markAsFullyPaid` omitted / undefined.
- **Expected:** `status: "partial"`, `paidAmount: 400`, `balanceDue: 600`.
- **Actual:** `status: "paid"`, `paidAmount: 1000`, `balanceDue: 0`.
- **Root Cause:** In `src/utils/invoiceCalculations.ts`, `isFullyPaid` checked `(!isCredit && input.markAsFullyPaid !== false)`. When `markAsFullyPaid` was omitted (`undefined`), `input.markAsFullyPaid !== false` evaluated to `true`, forcibly treating every retail invoice as fully paid even when the caller explicitly specified an `amountReceived` less than `grandTotal`. This violated Requirement R1: *"Only invoices created with paymentMethod === 'Credit' or with explicit partial payments should default to unpaid or partial."*
- **Resolution:** Added `const isExplicitPartial = rawReceived > 0 && rawReceived < grandTotal && input.markAsFullyPaid !== true`. Gated the default full-payment evaluation behind `!isExplicitPartial`.

### Defect 2: PostgREST 22P02 Syntax Crash in `approveNetworkInvoice` and `rejectNetworkInvoice` Direct DB Lookup
- **Input:** `approveNetworkInvoice("INV-2026-0042", ...)` or `rejectNetworkInvoice("INV-2026-0042", ...)` when the invoice was not in local cache.
- **Expected:** Queries Supabase using `.or()` with valid syntax or queries `invoice_number` directly without triggering PostgreSQL 22P02 UUID syntax error.
- **Actual:** `supabase.from("network_invoices").select("*").or("id.eq.INV-2026-0042,invoice_number.eq.INV-2026-0042")` triggered PostgREST HTTP 400 (`22P02: invalid input syntax for type uuid: "INV-2026-0042"`).
- **Root Cause:** `id` is a UUID column in PostgreSQL. Querying `id.eq.<string>` where `<string>` is not a valid 8-4-4-4-12 hex UUID triggers a fatal Postgres type conversion abort. Furthermore, subsequent `.eq("id", networkInvoiceId)` and `.eq("network_invoice_id", networkInvoiceId)` calls on lines 1585, 1606, and 1738 passed raw `networkInvoiceId` rather than falling back to the verified UUID `inv.id`.
- **Resolution:** Checked `isUuid(networkInvoiceId)` before constructing the `.or()` filter, querying `invoice_number` directly if non-UUID. Protected update `.eq()` filters with `isUuid(networkInvoiceId) ? networkInvoiceId : inv.id`.

### Defect 3: PostgREST 22P02 Syntax Crash in `cancelNetworkInvoice` with Non-UUID Organization IDs
- **Input:** `cancelNetworkInvoice("INV-2026-CANCEL", "org_seller_person_a")`.
- **Expected:** Cancels the invoice in local storage and executes the Supabase update without syntax failure.
- **Actual:** `supabase.from("network_invoices").update(...).eq("sender_org_id", "org_seller_person_a")` triggered PostgREST HTTP 400 (`22P02: invalid input syntax for type uuid: "org_seller_person_a"`).
- **Root Cause:** `sender_org_id` in Postgres `network_invoices` table is a UUID column. Passing a non-UUID org identifier resulted in an unhandled 22P02 error.
- **Resolution:** Guarded `sender_org_id` equality clause in `cancelNetworkInvoice` with `if (isUuid(senderOrgId))`.

### Defect 4: Potential Realtime Deduplication Miss Across Transports with Casing Differences
- **Input:** Incoming invoice announced over BroadcastChannel with `invoiceNumber: "inv-2026-0042"` followed by Supabase CDC with `invoiceNumber: "INV-2026-0042"`.
- **Expected:** Deduplication cache catches both events and fires at most one audio chime and one toast notification within 10 seconds.
- **Actual:** String key mismatch in `handledEventInvoiceIdsRef` allowed duplicate chime and toast popups.
- **Root Cause:** Casing was not normalized before indexing into `handledEventInvoiceIdsRef`.
- **Resolution:** Added case-normalized (`trim().toLowerCase()`) keys to both `handleIncomingInvoiceEvent` and `subNotifs` listeners in `src/hooks/useNetworkInvoices.tsx`.

---

## 2. What I Changed

1. `src/utils/invoiceCalculations.ts`:
   - Updated `calculatePaymentStatusAndBalance` to detect explicit partial payments (`isExplicitPartial`) where `amountReceived > 0 && amountReceived < grandTotal && input.markAsFullyPaid !== true`.
   - Prevented default retail auto-full-payment from overriding explicit partial payments when `markAsFullyPaid` is omitted/undefined.

2. `src/services/networkInvoicingService.ts`:
   - Replaced raw `.or("id.eq.${networkInvoiceId},invoice_number.eq.${networkInvoiceId}")` in `approveNetworkInvoice` and `rejectNetworkInvoice` direct DB lookups with conditional `isUuid(networkInvoiceId)` branching to prevent Postgres 22P02 errors.
   - Updated Supabase status updates in `approveNetworkInvoice` and `rejectNetworkInvoice` to use `isUuid(networkInvoiceId) ? networkInvoiceId : inv.id`.
   - Guarded `sender_org_id` in `cancelNetworkInvoice` Supabase update with `if (isUuid(senderOrgId))`.

3. `src/hooks/useNetworkInvoices.tsx`:
   - Hardened `handledEventInvoiceIdsRef` deduplication cache in both `handleIncomingInvoiceEvent` and `subNotifs` with case-normalized invoice numbers (`invNumKey`).

4. `src/test/billingLifecycleEngine.test.ts`:
   - Added unit tests for explicit partial payments when `markAsFullyPaid` is omitted (`amountReceived: 400` on `grandTotal: 1000` -> `status: "partial"`, `balanceDue: 600`).
   - Added unit test for explicit zero payment on Cash when `markAsFullyPaid` is explicitly false (`status: "unpaid"`, `balanceDue: 1000`).

5. `src/test/networkInvoicing.test.ts`:
   - Added unit test for resilient approval, rejection, and cancellation with non-UUID invoice numbers and non-UUID organization IDs.

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - Executed Vitest across all 7 core test suites:
    ```powershell
    node ./node_modules/vitest/vitest.mjs run src/test/networkInvoicing.test.ts src/test/billingLifecycleEngine.test.ts src/test/MobileInvoiceSuccessView.test.tsx src/test/MobileInvoiceSuccessView.challenge.test.tsx src/test/MobileInvoiceSuccessView.challenger.test.tsx src/test/MobileInvoiceSuccessView.m2Challenger.test.tsx src/test/MobileInvoiceSuccessView.r3Deletion.test.tsx
    ```
    **Result:** 7 / 7 test files passed, **103 / 103 tests passed (0 failures)**.
  - Executed Vitest across related invoicing & calculation test suites:
    ```powershell
    node ./node_modules/vitest/vitest.mjs run src/test/billingLifecycleEngine.adversarial.test.ts src/test/downloadExactInvoice.test.ts src/test/invoiceCalculations.test.ts src/test/unifiedInvoiceRenderer.test.tsx
    ```
    **Result:** 4 / 4 test files passed, **152 / 152 tests passed (0 failures)**.
  - Executed TypeScript compiler check:
    ```powershell
    node ./node_modules/typescript/bin/tsc --noEmit
    ```
    **Result:** Exit code 0, **0 compiler errors across codebase**.

- **Shallow Verification (manual only):**
  - Validated above-the-fold layout structure of `MobileInvoiceSuccessView` ensuring Quick Action Row (Edit, Print, Download, Share, E-Way Bill) and Activity Summary render within viewport without vertical scroll.
  - Inspected toast suppression logic on mobile viewports (< 1024px) during invoice save flow.

- **Unverified aspects:**
  - Physical audio synthesis chime on real mobile hardware (Web Audio API `AudioContext` behavior during background tabs on mobile Safari).
  - Physical ESC/POS Bluetooth/USB thermal printer output on physical Android and iOS hardware.

---

## 4. Known Issues

- `Minor Robustness Risk`: For non-Indian international phone numbers without standard country codes, `normalizePhoneNumber` extracts the last 10 digits (optimized for Indian E.164 phone numbering).
- `Minor Robustness Risk`: If two bills are created in rapid succession with identical invoice numbers across different browser tabs within less than 10 seconds, the 10-second deduplication cache will treat the second alert as a duplicate.

---

## 5. Remaining Risk & Next Step

- The four core systems (R1 default paid status, R2 mobile invoice success theme rendering, R3 toast notification deduplication, R4 B2B network sync hardening) are thoroughly verified with 103 passing tests and zero TypeScript errors.
- **Next step:** Deploy to staging environment and perform device verification on an Android phone and an iPhone to confirm touch target responsiveness, WhatsApp direct share deep-linking, and thermal receipt printing.
