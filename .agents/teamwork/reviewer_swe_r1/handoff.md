# Handoff Report: Adversarial Review & Resolution of Invoicing & Sync Systems

## 1. What the Prior Attempt Got Wrong

### Defect 1: Credit Overrode Explicit `markAsFullyPaid: true` in `calculatePaymentStatusAndBalance`
- **Input:** `{ grandTotal: 3000, paymentMethod: "Credit", markAsFullyPaid: true, amountReceived: 0 }`
- **Expected:** `status: "paid"`, `paidAmount: 3000`, `balanceDue: 0`
- **Actual:** `status: "unpaid"`, `paidAmount: 0`, `balanceDue: 3000`
- **Root Cause:** In `src/utils/invoiceCalculations.ts`, `isFullyPaid` was defined as `!isCredit && (input.markAsFullyPaid !== false || rawReceived >= input.grandTotal)`. When `isCredit` was `true`, `!isCredit` evaluated to `false`, forcibly negating `markAsFullyPaid: true` and falling through to an amount received check that evaluated to zero.
- **Resolution:** Refactored `isFullyPaid` to prioritize explicit user intent:
  `input.markAsFullyPaid === true || (!isCredit && input.markAsFullyPaid !== false) || (grandTotal > 0 && rawReceived >= grandTotal)`.

### Defect 2: Mobile Bill Preview Reverted to `unpaid` & Disconnected Themes
- **Input:** Opening mobile bill preview (`MobileBillPreviewModal`) on a newly created Cash or UPI retail sales invoice.
- **Expected:** Preview renders with `status: "paid"`, `paidAmount: grandTotal`, `balanceDue: 0`, and the active invoice theme styling.
- **Actual:** Mobile preview computed `balanceDue = Math.max(0, grandTotal - (amountReceived || 0))` which evaluated to `grandTotal`, status was set to `"unpaid"`, and `UnifiedInvoiceRenderer` was missing direct `paymentMethod` and `paidAmount` props.
- **Root Cause:** `MobileBillPreviewModal` was not wired to `calculatePaymentStatusAndBalance`, omitted `markAsFullyPaid` from its props, and passed `paymentMethod` only inside an unconsumed `paymentInfo` prop rather than as a direct prop to `UnifiedInvoiceRenderer`.
- **Resolution:** Integrated `calculatePaymentStatusAndBalance` into `MobileBillPreviewModal`, accepted `markAsFullyPaid`, passed `markAsFullyPaid` down from `SalesInvoiceModal` -> `MobileCreateInvoice` -> `MobileBillPreviewModal`, and passed `paymentMethod` and `paidAmount` directly to `UnifiedInvoiceRenderer`.

### Defect 3: Silent Failure & Missing Delivery on Supabase Network Notifications
- **Input:** `sendSalesInvoiceToNetwork` called when buyer organization is not yet verified or connected as a known UUID.
- **Expected:** Network notification is saved into Supabase with normalized 10-digit `recipient_phone`, `recipient_org_name`, and `recipient_gstin` so Person B can discover the notification when querying by phone or GSTIN.
- **Actual:** `notifPayload` completely omitted `recipient_phone`, `recipient_org_name`, and `recipient_gstin`. `validRecipientOrgId` was `null`. Person B's subsequent query in `getNotificationsForOrg` could never find the row.
- **Root Cause:** In `src/services/networkInvoicingService.ts`, `notifPayload` only inserted `id, recipient_org_id, type, title, message, status, action_status, network_invoice_id, data, created_at`, dropping recipient contact columns.
- **Resolution:** Added `recipient_phone`, `recipient_org_name`, and `recipient_gstin` to `notifPayload` and its retry insert.

### Defect 4: PostgREST 22P02 Syntax Crashes on Non-UUID Organization IDs
- **Input:** `getInvoicesForOrg("party_match_9876543210")` or `getNotificationsForOrg("custom_org_id")`
- **Expected:** Queries Supabase using phone, GSTIN, and name without crashing PostgREST.
- **Actual:** PostgREST query failed with HTTP 400 (`22P02: invalid input syntax for type uuid`).
- **Root Cause:** `orClauses` unconditionally added `recipient_org_id.eq.${orgId}` and `sender_org_id.eq.${orgId}` before verifying if `orgId` was a valid UUID. Additionally, `approveInvoice` and `rejectInvoice` directly passed raw `inv.senderOrgId` and `inv.id` to UUID columns without `isUuid` guards.
- **Resolution:** Wrapped all PostgREST UUID column equality queries and insert payloads in `isUuid(...)` checks. Expanded `isUuid` regex to validate 8-4-4-4-12 hex UUIDs to eliminate any false rejections of valid UUID representations.

### Defect 5: Incomplete CDC Notification Deduplication
- **Input:** Realtime notification arrives via Supabase CDC (`postgres_changes`) for an invoice that was already announced via DOM or BroadcastChannel.
- **Expected:** Chime and toast notification are deduplicated within a 10-second window.
- **Actual:** Chime and toast re-triggered because CDC notification listener only checked `networkInvoiceId` and `id`, but not `mappedNotif.data.invoiceNumber`.
- **Root Cause:** In `useNetworkInvoices.tsx`, `subNotifs` did not incorporate `mappedNotif.data?.invoiceNumber` into the cache lookup or write keys.
- **Resolution:** Included `mappedNotif.data?.invoiceNumber` in the deduplication lookup and cache update.

---

## 2. What I Changed
1. `src/utils/invoiceCalculations.ts`:
   - Updated `calculatePaymentStatusAndBalance` to respect explicit `markAsFullyPaid: true` on Credit invoices, default retail methods to paid when `markAsFullyPaid` is omitted, and handle zero grand totals gracefully.
2. `src/components/invoices/mobile/MobileBillPreviewModal.tsx`:
   - Imported `calculatePaymentStatusAndBalance`.
   - Added `markAsFullyPaid?: boolean` to `MobileBillPreviewModalProps`.
   - Wired payment calculation into preview balance and passed `paidAmount`, `balanceDue`, and `paymentMethod` directly to `UnifiedInvoiceRenderer`.
3. `src/components/invoices/mobile/MobileCreateInvoice.tsx`:
   - Forwarded `markAsFullyPaid={props.markAsFullyPaid}` to `<MobileBillPreviewModal />`.
4. `src/components/SalesInvoiceModal.tsx`:
   - Forwarded `markAsFullyPaid={markAsFullyPaid}` to `<MobileCreateInvoice />`.
5. `src/services/networkInvoicingService.ts`:
   - Expanded `isUuid` regex to cleanly match standard 8-4-4-4-12 hex UUIDs.
   - Added `recipient_phone` (normalized 10 digits), `recipient_org_name`, and `recipient_gstin` to `notifPayload` in `sendSalesInvoiceToNetwork`.
   - Guarded `recipient_org_id` and `sender_org_id` clauses in `getInvoicesForOrg` and `getNotificationsForOrg` with `isUuid(orgId)` to avoid PostgREST 22P02 errors.
   - Guarded `approveInvoice` and `rejectInvoice` notification inserts with `isUuid(...)` and populated contact columns.
6. `src/hooks/useNetworkInvoices.tsx`:
   - Enhanced realtime deduplication in `subNotifs` to include `mappedNotif.data?.invoiceNumber`.
7. `src/test/billingLifecycleEngine.test.ts`:
   - Added test cases verifying explicit `markAsFullyPaid: true` with Credit terms, implicit retail default when `markAsFullyPaid` is omitted, implicit Credit default when `markAsFullyPaid` is omitted, and zero grand total formatting.
8. `src/test/networkInvoicing.test.ts`:
   - Added assertions verifying 10-digit normalized phone number and UUID format on network invoice and notification objects.

---

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - Executed Vitest across all 7 test files:
    `node ./node_modules/vitest/vitest.mjs run src/test/networkInvoicing.test.ts src/test/billingLifecycleEngine.test.ts src/test/MobileInvoiceSuccessView.test.tsx src/test/MobileInvoiceSuccessView.challenge.test.tsx src/test/MobileInvoiceSuccessView.challenger.test.tsx src/test/MobileInvoiceSuccessView.m2Challenger.test.tsx src/test/MobileInvoiceSuccessView.r3Deletion.test.tsx`
  - Results: **7 / 7 test files passed, 100 / 100 tests passed (0 failures).**
  - Executed TypeScript compiler check:
    `node ./node_modules/typescript/bin/tsc --noEmit`
  - Results: **Exit code 0, 0 compiler errors across codebase.**
- **Shallow Verification (manual only):**
  - Verified component prop flow across `SalesInvoiceModal` -> `MobileCreateInvoice` -> `MobileBillPreviewModal` -> `UnifiedInvoiceRenderer`.
- **Unverified aspects:**
  - Live WebSocket reconnection during network disconnects in a production mobile browser environment.
  - Physical audio synthesis chime on real mobile hardware.

---

## 4. Known Issues
- `Minor Robustness Risk`: For non-Indian international phone numbers without standard country codes, `normalizePhoneNumber` extracts the last 10 digits.

---

## 5. Remaining Risk & Next Step
- The task requirements (R1, R2, R3, R4) are fully addressed and verified with 100 passing unit/stress tests and 0 TypeScript compilation errors.
- Next step: Smoke-test invoice generation in production staging on an iOS and Android device to verify touch responsiveness and thermal printer output.
