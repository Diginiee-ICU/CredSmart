# DISPATCH — SWE Light Invoicing & Sync Hardening

## Task Overview
Production-grade resolution, architectural hardening, and verification of four core invoicing & sync systems in CredSmart:
1. B2B network synchronization
2. Notification de-duplication
3. Default paid invoice status
4. Mobile invoice success theme rendering

Working directory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart`
Metadata directory: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\swe_1`
Original request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (timestamp `2026-10-21T07:31:34Z`)

## Requirements

### R1. Default Sales Invoices to 'Paid' Status
New retail sales invoices generated in CredSmart (using Cash, UPI, Card, Net Banking, or Cheque) must default to `status: "paid"`, with `markAsFullyPaid: true`, `paidAmount: grandTotal`, and `balanceDue: 0`. Only invoices created with `paymentMethod === "Credit"` or with explicit partial payments should default to `unpaid` or `partial`. Both live preview calculations and document persistence must reflect this consistently.

### R2. Mobile Invoice Success View Relayout & Real Theme Rendering
The mobile invoice creation success screen (`MobileInvoiceSuccessView`) must place the summary card (Party Name, bold ₹ Total, Paid pill) and the 5 primary action buttons (`Edit`, `Print`, `Download`, `Share WhatsApp`, `E-Way Bill`) directly above the fold without requiring any vertical scrolling. The previous dummy skeleton must be replaced by the authentic `UnifiedInvoiceRenderer` matching the active store settings, brand color palette, and selected invoice theme.

### R3. Streamline & Deduplicate On-Screen Toast Notifications
Creating an invoice must not trigger stacked or simultaneous toast notifications. Mute the redundant secondary network dispatch toast (`⚡ Sales Invoice shared with...`). On mobile viewports, suppress floating foreground save toasts when the full-screen `MobileInvoiceSuccessView` opens. Add a 10-second deduplication cache to realtime incoming invoice and notification alerts in `useNetworkInvoices` across DOM, BroadcastChannel, and Supabase CDC transports. Add `{ silent?: boolean }` to PDF downloads to avoid disruptive intermediate toasts.

### R4. B2B Network Sync Engine Hardening & Organization Discovery
Resolve network invoice delivery failures between independent organizations. In `findConnectedOrganization`, query the public Supabase `organizations` directory by phone, GSTIN, and organization name. Store recipient phone numbers in normalized 10-digit format upon insert. In `getInvoicesForOrg` and `getNotificationsForOrg`, support resilient PostgREST query clauses (both exact and `ilike` pattern matching). Ensure runtime utility `isUuid` is strictly defined and exported to prevent silent database insertion failures.

## Verification Resources
Automated test suites:
- `src/test/networkInvoicing.test.ts`
- `src/test/MobileInvoiceSuccessView.test.tsx`
- `src/test/MobileInvoiceSuccessView.challenge.test.tsx`
- `src/test/MobileInvoiceSuccessView.challenger.test.tsx`
- `src/test/MobileInvoiceSuccessView.m2Challenger.test.tsx`
- `src/test/MobileInvoiceSuccessView.r3Deletion.test.tsx`
- `src/test/billingLifecycleEngine.test.ts`

## Acceptance Criteria
- [ ] Invoices created with Cash/UPI save with `status: "paid"`, `paidAmount: grandTotal`, and `balanceDue: 0` without manual user input.
- [ ] `livePreviewDocument` reflects `status: "paid"` dynamically when creating new sales bills.
- [ ] Switching payment method to "Credit" sets `markAsFullyPaid: false` and `amountReceived: 0`.
- [ ] Activity Summary and all 5 action buttons (`Edit`, `Print`, `Download`, `Share`, `E-Way Bill`) are immediately visible above the fold on mobile viewports (< 768px).
- [ ] True invoice theme design renders via `UnifiedInvoiceRenderer` with store details, GST table, and active theme badge.
- [ ] All 72 unit tests across `MobileInvoiceSuccessView` test suites pass with zero failures.
- [ ] Creating a bill produces at most 1 single clean toast on desktop and zero redundant toast popups on mobile.
- [ ] Secondary `⚡ Sales Invoice shared with...` toast is eliminated from the save flow.
- [ ] Realtime events do not trigger duplicate chime or notification popups within a 10-second window.
- [ ] `isUuid` validator is exported and tested, ensuring Supabase database insertions succeed.
- [ ] Cross-organization lookup finds external organizations in Supabase by phone or GSTIN.
- [ ] `networkInvoicing.test.ts` passes 13/13 tests cleanly.
- [ ] TypeScript validation (`tsc --noEmit`) passes with 0 errors across the codebase.


## 2026-10-21T07:33:49Z
You are the SWE Light Orchestrator (teamwork_preview_swe).
Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\swe_1
Project root: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart
Original request: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (under ## 2026-10-21T07:31:34Z)
Dispatch instructions: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\swe_1\DISPATCH.md

Execute the SWE Light lifecycle to completion:
1. Dispatch one implementer (teamwork_preview_implementer) on the whole task to implement all 4 requirements (R1, R2, R3, R4) and satisfy all verification resources and acceptance criteria.
2. Conduct adversarial review rounds (teamwork_preview_reviewer) carrying a cumulative open-issues ledger, establishing correctness by running tests (Vitest and tsc --noEmit).
3. Maintain progress.md in your working directory (c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\swe_1\progress.md).
4. When all criteria and tests pass, send completion message with your handoff report to Sentinel.
