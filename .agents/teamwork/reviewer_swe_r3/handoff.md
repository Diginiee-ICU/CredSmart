# Adversarial Review Round 3 Handoff Report: Invoicing & Sync Hardening

> [!WARNING] **Skepticism Disclaimer**
> 105 core unit/stress tests and 164 extended tests pass with 0 TypeScript compiler errors; live multi-tenant Supabase CDC WebSocket broadcasts and ESC/POS thermal printer hardware feeds remain reliant on staging environment validation.

---

## 1. What the Prior Attempt Got Wrong

### Defect 1: PostgREST 22P02 UUID Syntax Crash in `rejectNetworkInvoice` for Non-UUID Invoice Numbers and Missing Local Notification Update
- **Input:** `rejectNetworkInvoice("INV-NON-UUID-999", buyerOrg, "Price too high")` when querying by invoice number rather than an 8-4-4-4-12 hex UUID.
- **Expected:** Supabase `network_notifications` table updates the notification `action_status` to `"rejected"`, and the local notification array updates `actionStatus` to `"rejected"`.
- **Actual:** In `rejectNetworkInvoice` (line 1759 of previous revision), `.eq("network_invoice_id", networkInvoiceId)` directly queried the UUID column with a non-UUID invoice number string, triggering PostgREST 22P02 (`invalid input syntax for type uuid`). Simultaneously, local notification update checked only `if (n.networkInvoiceId === networkInvoiceId)` (omitting `|| n.networkInvoiceId === inv.id`), leaving local notifications in `"pending"` status. Furthermore, if neither `networkInvoiceId` nor `inv.id` was a valid UUID, updating `network_invoices` crashed PostgREST with 22P02.
- **Root Cause:** Asymmetric UUID guard implementation between `approveNetworkInvoice` and `rejectNetworkInvoice`, plus failure to fall back to `invoice_number` and `data->>invoiceNumber` when neither ID is a UUID.

### Defect 2: Cross-Tenant Confidential Invoice and Notification Leaks via Generic Business Stop Words in `isBusinessNameMatch`
- **Input:** `isBusinessNameMatch("Sharma Wholesale", "Verma Wholesale")`, `isBusinessNameMatch("Delhi Store", "Mumbai Store")`, or `isBusinessNameMatch("Ramesh Traders", "Suresh Traders")`.
- **Expected:** Returns `false`. Unrelated organizations sharing generic business descriptors must never match each other.
- **Actual:** Returned `true`. Single-word matching split words by whitespace and matched any common word of length $\ge 3$. As a result, every store with "Store", "Traders", or "Wholesale" in its name was treated as the same business!
- **Root Cause:** `isBusinessNameMatch` lacked a generic business stop-words filter (`GENERIC_BUSINESS_STOP_WORDS`). This caused `isNotificationForOrg` and `isInvoiceForOrg` to treat unrelated merchants as identical, routing confidential notifications and invoices to unintended competitors.

### Defect 3: PostgREST Filter Grammar 400 Bad Request on Business Names with Parentheses
- **Input:** `findConnectedOrganization`, `getInvoicesForOrg`, or `getNotificationsForOrg` with party or store names containing parentheses (e.g., `"Acme Corp (India) Pvt Ltd"` or `"Gupta & Sons (Branch 1)"`).
- **Expected:** PostgREST `.or(...)` filter compiles and executes without syntax aborts.
- **Actual:** PostgREST returned HTTP 400 Bad Request (`failed to parse filter`).
- **Root Cause:** In PostgREST syntax, parentheses `(...)` are reserved grammar operators for logical grouping. While commas and percents were stripped with `.replace(/[,%]/g, "")`, parentheses were left unescaped, corrupting the PostgREST query string.

### Defect 4: Silent Form Reset without Confirmation Toast on Mobile "Save & New"
- **Input:** Mobile user clicking "Save & New" in `MobileCreateInvoice`.
- **Expected:** Single clean toast `Invoice #${saved.documentNumber} created! Ready for next bill.` provides immediate confirmation before resetting the form.
- **Actual:** Zero feedback was provided. The modal wiped its form fields with no toast and no success screen.
- **Root Cause:** In `SalesInvoiceModal.tsx`, line 1120 unconditionally suppressed all toasts if `isMobileView` was true. However, when `saveAndNew` is true, `MobileInvoiceSuccessView` is explicitly set to `null` (line 1222). Suppressing toasts left mobile users without any indication that their bill was saved.

### Defect 5: Cross-Sender Deduplication Collision in `useNetworkInvoices`
- **Input:** Seller A sends invoice "INV-001" to Buyer, and 3 seconds later Seller B also sends invoice "INV-001" to Buyer.
- **Expected:** Both Seller A's and Seller B's invoice alerts are delivered to Buyer.
- **Actual:** Seller B's alert was swallowed by the 10-second deduplication cache because the cache key was solely `"inv-001"`.
- **Root Cause:** Cache key was not scoped by `senderOrgId`, causing cross-seller collisions on common numbering sequences like "INV-001".

### Defect 6: Potential Runtime Crash on Missing/Undefined `invoice.items` in `MobileInvoiceSuccessView`
- **Input:** Rendering `MobileInvoiceSuccessView` with `items` undefined or null.
- **Expected:** Renders gracefully without unhandled TypeError.
- **Actual:** Threw `TypeError: Cannot read properties of undefined (reading 'length')` and `(reading 'map')`.
- **Root Cause:** Unprotected access to `invoice.items.length` and `invoice.items.map(...)` in `buildPdfPayload` and preview rendering.

---

## 2. What I Changed

1. `src/services/networkInvoicingService.ts`:
   - Added `GENERIC_BUSINESS_STOP_WORDS` set (including "wholesale", "store", "traders", "supermarket", "enterprises", "pvt", "ltd", "services", "mart", etc.) to `isBusinessNameMatch`. Single-word and substring matches now filter out generic words, preventing cross-tenant leaks.
   - Enhanced `findConnectedOrganization`, `getInvoicesForOrg`, and `getNotificationsForOrg` to strip parentheses (`.replace(/[,%()]/g, "")`), eliminating PostgREST filter parsing crashes.
   - Hardened `approveNetworkInvoice` and `rejectNetworkInvoice` Supabase updates: if `networkInvoiceId` or `inv.id` is not a valid UUID, they update by `invoice_number` in `network_invoices` and by `data->>invoiceNumber` in `network_notifications`, preventing Postgres 22P02 errors.
   - Added `|| n.networkInvoiceId === inv.id` to local notification update in `rejectNetworkInvoice`.

2. `src/hooks/useNetworkInvoices.tsx`:
   - Scoped deduplication cache keys with `senderOrgId` (`${networkInvoice.senderOrgId}_${invNumKey}`) in both `handleIncomingInvoiceEvent` and `subNotifs`, ensuring two independent sellers issuing "INV-001" do not collide.

3. `src/components/SalesInvoiceModal.tsx`:
   - Updated toast display condition to `if (!isMobileView || saveAndNew)`, ensuring mobile users tapping "Save & New" receive the confirmation toast while preserving full toast suppression when `MobileInvoiceSuccessView` opens.

4. `src/components/invoices/mobile/MobileInvoiceSuccessView.tsx`:
   - Guarded `invoice.items` with `(invoice.items || [])` across `buildPdfPayload`, item count badge, and `UnifiedInvoiceRenderer` item mapping.

5. `src/test/networkInvoicing.test.ts`:
   - Added unit tests for `isBusinessNameMatch` generic stop-word filtering across edge cases.
   - Added assertion verifying recipient notification `actionStatus: "rejected"` on invoice rejection.

6. `src/test/MobileInvoiceSuccessView.challenge.test.tsx`:
   - Added test verifying graceful rendering and PDF downloading when `items` is undefined or empty.

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - Executed Vitest across all 7 core test suites:
    ```powershell
    node ./node_modules/vitest/vitest.mjs run src/test/networkInvoicing.test.ts src/test/billingLifecycleEngine.test.ts src/test/MobileInvoiceSuccessView.test.tsx src/test/MobileInvoiceSuccessView.challenge.test.tsx src/test/MobileInvoiceSuccessView.challenger.test.tsx src/test/MobileInvoiceSuccessView.m2Challenger.test.tsx src/test/MobileInvoiceSuccessView.r3Deletion.test.tsx
    ```
    **Result:** 7 / 7 test files passed, **105 / 105 tests passed (0 failures)**.
  - Executed Vitest across extended billing & rendering suites:
    ```powershell
    node ./node_modules/vitest/vitest.mjs run src/test/billingLifecycleEngine.adversarial.test.ts src/test/downloadExactInvoice.test.ts src/test/invoiceCalculations.test.ts src/test/unifiedInvoiceRenderer.test.tsx src/test/downloadExactInvoice.adversarial.test.ts
    ```
    **Result:** 5 / 5 test files passed, **164 / 164 tests passed (0 failures)**.
  - Executed TypeScript compiler validation:
    ```powershell
    node ./node_modules/typescript/bin/tsc --noEmit
    ```
    **Result:** Exit code 0, **0 compiler errors across entire codebase**.

- **Shallow Verification (manual only):**
  - Inspected PostgREST filter string generation with parentheses and special characters.
  - Inspected mobile "Save & New" flow verifying toast displays on mobile when full-screen success view is bypassed.

- **Unverified aspects:**
  - Physical audio synthesis output via Web Audio API `AudioContext` and `navigator.vibrate` on physical Android/iOS hardware.
  - Live remote Supabase WebSocket CDC reconnection behavior under physical network disconnects.

---

## 4. Known Issues

- `Minor Robustness Risk`: For non-Indian international phone numbers without standard country codes, `normalizePhoneNumber` extracts the last 10 digits (optimized for Indian E.164 phone numbering).
- `Minor Robustness Risk`: Physical ESC/POS Bluetooth/USB thermal printer output requires verification on physical POS hardware in staging.

---

## 5. Remaining Risk & Next Step

- The four core systems (R1 default paid status, R2 mobile invoice success theme rendering, R3 toast notification deduplication, R4 B2B network sync hardening) are thoroughly verified with 105 core unit tests, 164 extended tests, and 0 TypeScript compiler errors.
- **Next step:** Complete deployment to staging environment and perform device validation on Android and iOS hardware for direct WhatsApp share links and thermal receipt printing.
