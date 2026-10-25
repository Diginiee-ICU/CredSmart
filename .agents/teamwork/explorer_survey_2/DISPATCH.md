# Dispatch Assignment: Survey Explorer 2 (Core Billing & Inventory)

## Mission
Investigate and map all occurrences of the "nested/boxy card container" anti-pattern in the assigned billing and inventory files:
1. `src/pages/Sales.tsx` (~9 hits: mobile invoice list cards + outer wrapper double border)
2. `src/pages/Purchases.tsx` (~6 hits: mobile purchase invoice list cards)
3. `src/pages/Items.tsx` (~13 hits: mobile product list cards)

## Working Directory
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_2`

## Mandatory Reference Documents
- Original Request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (MUST read before starting)
- Dispatch Instructions: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_mobile_cards\DISPATCH.md`
- Minimal Design System: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md`

## 19 Protected Quarantine Files — NEVER MODIFY OR SUGGEST MODIFYING:
- `src/components/invoices/mobile/MobileCreateInvoice.tsx`
- `src/components/invoices/mobile/AddItemModal.tsx`
- `src/components/invoices/mobile/SelectPartyModal.tsx`
- `src/components/invoices/mobile/EditItemModal.tsx`
- `src/components/invoices/mobile/MobileInvoiceSuccessView.tsx`
- `src/components/invoices/mobile/MobileBillPreviewModal.tsx`
- `src/components/invoices/mobile/MobileInvoiceFitViewer.tsx`
- `src/components/invoices/mobile/CreatePartyModal.tsx`
- `src/components/invoices/mobile/MobileCreatePurchaseInvoice.tsx`
- `src/components/items/mobile/CreateNewItemModal.tsx`
- `src/components/SalesInvoiceModal.tsx`
- `src/components/PurchaseInvoiceModal.tsx`
- `src/components/invoices/AddItemsToBillModal.tsx`
- `src/components/invoices/InvoiceFitView.tsx`
- `src/components/invoices/UnifiedInvoiceRenderer.tsx`
- `src/utils/downloadExactInvoice.ts`
- `src/utils/whatsappPdfShare.ts`
- `src/utils/invoiceThemeLoader.ts`
- `src/services/documentsService.ts`

## Tasks & Investigation Requirements
1. In `src/pages/Sales.tsx`:
   - Identify the outer wrapper double border:
     `flex-1 min-h-0 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col overflow-hidden` -> `flex-1 min-h-0 bg-white dark:bg-slate-900 flex flex-col overflow-hidden`
   - Identify all mobile invoice list cards (`rounded-xl border shadow-2xs` or similar) in the mobile view (`block md:hidden`).
   - Exact line numbers and snippets.
   - Proposed replacement with flat rows in a `divide-y divide-slate-100 dark:divide-slate-800/60` container.
2. In `src/pages/Purchases.tsx`:
   - Identify all mobile purchase invoice list cards in the mobile view (`block md:hidden`).
   - Exact line numbers and snippets.
   - Proposed replacement with flat rows in a `divide-y divide-slate-100 dark:divide-slate-800/60` container.
3. In `src/pages/Items.tsx`:
   - Identify all mobile product list cards (~13 hits) in the mobile view (`block md:hidden`).
   - Exact line numbers and snippets.
   - Proposed replacement with flat rows in a `divide-y divide-slate-100 dark:divide-slate-800/60` container.
4. Verify:
   - Minimum 44px touch targets on interactive rows.
   - No sub-11px fonts.
   - Desktop views (`hidden md:...` or table views) remain 100% untouched.
   - Business logic, handlers, modals, filters remain 100% untouched.
5. Write survey report to `handoff.md` in your working directory and notify parent via `send_message`.


## 2026-10-25T08:58:31Z
You are Explorer 2 (Survey: Core Billing & Inventory).
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_2
Read your dispatch assignment: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_2\DISPATCH.md
Read the authoritative original request: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
Read the design system rules: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md

Your task:
Survey and investigate the boxy/nested card container anti-pattern in:
1. src/pages/Sales.tsx (mobile invoice list cards + outer wrapper double border)
2. src/pages/Purchases.tsx (mobile purchase invoice list cards)
3. src/pages/Items.tsx (mobile product list cards)

Never modify or suggest modifying any of the 19 protected quarantine files listed in DISPATCH.md.
Document exact line numbers, existing classes, proposed minimal divide-y replacements, outer wrapper fix for Sales.tsx, touch targets (>=44px), and font sizes (>=11px).
Write your survey findings to c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_2\handoff.md.
When finished, notify the orchestrator using send_message.
