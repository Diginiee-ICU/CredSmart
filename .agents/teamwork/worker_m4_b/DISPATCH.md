# DISPATCH — Worker M4-B (Catalog & Ledgers Overhaul)

## Identity
- Role: Catalog & Ledgers Overhaul Worker
- Type: teamwork_preview_worker
- Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_b\
- Parent: Project Orchestrator (3044c8ce-523a-4157-917d-31b6f5d55c6a)

## MANDATORY INTEGRITY WARNING (ZERO TOLERANCE)
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## STRICT QUARANTINE LOCK
Under NO circumstances edit, format, or touch any of the 19 protected invoice creation files:
`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`, `UnifiedInvoiceRenderer.tsx`, `downloadExactInvoice.ts`, etc.

## Assigned Scope & Files Owned Exclusively
1. `src/pages/Items.tsx`
2. `src/pages/Inventory.tsx`
3. `src/pages/Parties.tsx`
4. `src/pages/Customers.tsx`
5. `src/pages/Suppliers.tsx`
6. `src/pages/CashAndBank.tsx`
7. `src/pages/Expenses.tsx`

## References
- Authoritative User Request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (Lines 1120-1218).
- Master Project Architecture: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md`.
- Master Design System Rules: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md`.
- Explorer 2 Report: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m4_2\handoff.md`.

## Concrete Tasks
1. **`src/pages/Inventory.tsx`, `Customers.tsx`, `Suppliers.tsx`**:
   - Convert from unbounded whole-page scrolling (`max-w-[1400px] mx-auto px-4 py-6`) to screen-fitted viewport shells:
     `h-full flex flex-col p-3 sm:p-4 space-y-3 overflow-hidden font-sans bg-slate-50/50 dark:bg-slate-950/50`.
   - Wrap tables in `flex-1 min-h-0 overflow-y-auto overflow-x-auto scrollbar-thin` with `thead sticky top-0` and pinned bottom pagination footer (`shrink-0 border-t border-slate-200/80 dark:border-slate-800`).
   - Standardize table row heights to `px-3 py-2.5` (38px–42px row height). In `Inventory.tsx`, ensure inline Excel edit inputs fit compactly (`h-7 px-2 text-xs font-mono`).
2. **Purge Skeuomorphism & Neon Glowing Halos**:
   - Replace all `glass-card-3d` with glowing halos (`shadow-[0_0_8px_rgba(...)]`) across `Inventory.tsx`, `Customers.tsx`, `Suppliers.tsx`, `CashAndBank.tsx`, and `Expenses.tsx` with clean hairline cards:
     `rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-3.5`.
   - Replace all `glowing-btn-amber` with standard Royal Blue action buttons:
     `h-8.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs active:scale-[0.98] transition-all cursor-pointer`.
3. **Color Palette Alignment in `CashAndBank.tsx` & `Expenses.tsx`**:
   - Replace hardcoded `#5046E5` / `#EEF0FD` / `#4338CA` with master Royal Blue tokens (`bg-blue-600`, `text-blue-600`, `border-blue-600`, `bg-blue-50 dark:bg-blue-950/40`, `hover:bg-blue-700`).
4. **Udhar Khata Directional Balance Badges**:
   - In `Parties.tsx`, `Customers.tsx`, `Suppliers.tsx`, verify directional balances use Emerald for "To Collect (Dr)" and Rose for "To Pay (Cr)" with `font-mono tabular-nums`.
5. **Stock Level Badges & Micro-Font Elevation**:
   - Standardize stock badges in `Items.tsx` and `Inventory.tsx` to `text-[11px] font-semibold font-mono` (Emerald for In Stock, Amber for Low Stock, Rose for Out of Stock).
   - Elevate all sub-11px micro-fonts (`text-[8.5px]`, `text-[9px]`, `text-[9.5px]`, `text-[10px]`) across the 7 pages to `text-[11px]`.
   - Ensure all currency figures (₹) use `font-mono tabular-nums`.

## Verification Commands
- `cmd /c npx tsc --noEmit` (exit code 0, 0 errors).
- `cmd /c npx eslint src/pages/Items.tsx src/pages/Inventory.tsx src/pages/Parties.tsx src/pages/Customers.tsx src/pages/Suppliers.tsx src/pages/CashAndBank.tsx src/pages/Expenses.tsx` (0 errors).
- Verify 0 diff lines on the 19 quarantined protected files.

Write your handoff report to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_b\handoff.md` and report completion via `send_message`.


## 2026-10-24T21:24:48Z
You are Worker M4-B for Milestone 4 (Catalog & Ledgers Overhaul).
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_b\

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

STRICT QUARANTINE LOCK:
Under NO circumstances edit, format, or touch any of the 19 protected invoice creation files:
MobileCreateInvoice.tsx, SalesInvoiceModal.tsx, AddItemModal.tsx, SelectPartyModal.tsx, EditItemModal.tsx, MobileInvoiceSuccessView.tsx, MobileBillPreviewModal.tsx, MobileInvoiceFitViewer.tsx, CreatePartyModal.tsx (in invoices/mobile/), MobileCreatePurchaseInvoice.tsx, CreateNewItemModal.tsx (in items/mobile/), PurchaseInvoiceModal.tsx, AddItemsToBillModal.tsx, InvoiceFitView.tsx, UnifiedInvoiceRenderer.tsx, downloadExactInvoice.ts, whatsappPdfShare.ts, invoiceThemeLoader.ts, documentsService.ts.

Read your full dispatch directive:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_b\DISPATCH.md
Read the authoritative user request:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (Lines 1120-1218).
Read the project architecture:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md.
Read the master design rules:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md.
Read Explorer 2 report:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m4_2\handoff.md

Execute the overhaul across:
Items.tsx, Inventory.tsx, Parties.tsx, Customers.tsx, Suppliers.tsx, CashAndBank.tsx, Expenses.tsx.
Verify with:
- cmd /c npx tsc --noEmit
- cmd /c npx eslint src/pages/Items.tsx src/pages/Inventory.tsx src/pages/Parties.tsx src/pages/Customers.tsx src/pages/Suppliers.tsx src/pages/CashAndBank.tsx src/pages/Expenses.tsx
- Verify 0 diff lines on the 19 protected files.

Write your handoff report to c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_b\handoff.md and report completion via send_message to orchestrator (3044c8ce-523a-4157-917d-31b6f5d55c6a).
