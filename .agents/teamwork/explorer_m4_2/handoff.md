# HANDOFF REPORT — Explorer 2 (Milestone 4: Catalog & Ledger Accounts Overhaul)

**Working Directory**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m4_2\`  
**Target Milestone**: Milestone 4 — Core Application Pages Overhaul  
**Recipient**: Project Orchestrator (`3044c8ce-523a-4157-917d-31b6f5d55c6a`) & Worker M4  

---

## 1. Observation

A forensic read-only inspection was executed across all 7 target catalog and ledger pages:
1. `src/pages/Items.tsx`
2. `src/pages/Inventory.tsx`
3. `src/pages/Parties.tsx`
4. `src/pages/Customers.tsx`
5. `src/pages/Suppliers.tsx`
6. `src/pages/CashAndBank.tsx`
7. `src/pages/Expenses.tsx`

The observations are categorized by page below:

### Track 1: Items & Inventory

#### `src/pages/Items.tsx`
- **Container Structure**: Fits within screen-fitted desktop viewport (`line 658`):  
  ```tsx
  <div className="h-full flex flex-col p-3 sm:p-4 space-y-3 overflow-hidden font-sans bg-slate-50/50 dark:bg-slate-950/50">
  ```
  Desktop table container (`line 1017`) bounded by `flex-1 min-h-0 ... flex flex-col`.
- **Sub-11px Micro-Font Anti-Patterns**:
  - `Lines 666, 684, 694, 704`: Mobile KPI strip cards use `text-[8.5px] font-bold text-... uppercase tracking-wider font-mono truncate block`.
  - `Lines 721, 747, 768, 785`: Desktop KPI labels use `text-[10px] font-bold uppercase tracking-wider font-mono`.
  - `Lines 727, 755, 774, 791`: Explanatory subtext uses `text-[10.5px] font-medium`.
  - `Lines 1102, 1107, 1112`: Mobile stock badges use `text-[9.5px] font-bold font-mono` (`0 Stock`, `Low Stock`, `In Stock`).
  - `Lines 1123, 1128, 1135`: Price headers use `text-[10px]` and `text-[9.5px]`.
  - `Lines 1410, 1415, 1420`: Desktop table badges use `text-[10px] font-bold font-mono`.
- **Button Sizing Anti-Patterns**:
  - `Line 1166`: Mobile adjust button uses `min-h-[44px] h-11 px-3 rounded-lg border ... text-xs font-semibold`.
  - `Line 1176`: Mobile dropdown trigger uses `min-w-[44px] min-h-[44px] w-11 h-11 rounded-lg border ...`.
  - Action button standard (`minimal-design-system.md` Rule 1) strictly mandates: Standard action `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs` (34px) and table action `h-7 px-2.5 rounded-md text-[11px] font-medium` (28px).

#### `src/pages/Inventory.tsx`
- **Unbounded Long Page Scroll Anti-Pattern**:
  - `Line 436`:  
    ```tsx
    <div className="w-full max-w-[1400px] mx-auto px-4 py-6 sm:px-8 sm:py-8 space-y-6 font-sans">
    ```
    The page is entirely scrollable vertically, breaking Requirement R2 ("Screen-Fitted Desktop Productivity Shell, Zero Long Scroll").
- **Skeuomorphic & Neon Glow Anti-Patterns**:
  - `Lines 465, 482, 501, 518`: Metric cards use `glass-card-3d p-5 relative overflow-hidden group select-none` with glowing neon halos:
    - `shadow-[0_0_8px_rgba(59,130,246,0.5)]`
    - `shadow-[0_0_8px_rgba(16,185,129,0.5)]`
    - `shadow-[0_0_8px_rgba(99,102,241,0.5)]`
    - `shadow-[0_0_8px_rgba(245,158,11,0.5)]`
  - `Line 545`: Filter bar uses `bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-3 sm:p-4`.
- **Table Density Anti-Pattern**:
  - `Lines 826, 847, 858, 915, 959, 997, 1010, 1016, 1044`: Table cells use `px-5 py-4`, creating bloated row heights of 64px–72px instead of the mandatory 38px–42px row height.
- **Micro-Prose Redundancy**:
  - `Lines 450-452`: "Real-time stock valuation, batch management & low-stock alerts".
  - `Lines 475, 495, 513, 537`: "Total Quantity on Hand", "Cost Price Valuation", "Needs replenishment (≤ 20)".
- **Tabular Numerals & Monospace**:
  - `Lines 749, 952, 1011`: Numeric values lack `font-mono tabular-nums`.

---

### Track 2: Parties, Customers & Suppliers (Udhar Khata)

#### `src/pages/Parties.tsx`
- **Container Structure**:
  - `Line 713`: Uses screen-fitted container `h-full flex flex-col p-2.5 sm:p-4 space-y-2.5 overflow-hidden bg-slate-50/40 dark:bg-slate-950/40`.
- **Udhar Khata Directional Balance Cards**:
  - `Lines 901-955`: Solid directional metric cards: Total Parties (blue border-l-2), To Collect (Dr) (Emerald border-l-2, `text-emerald-600`), To Pay (Cr) (Rose border-l-2, `text-rose-600`).
  - Directional balance pills (`Lines 1283-1307` mobile, `Lines 1643-1667` desktop):
    - To Collect: `bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/80` with emerald dot.
    - To Pay: `bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200/80` with rose dot.
    - Settled: `bg-slate-100 text-slate-500 border border-slate-200`.
- **Sub-11px Font Size Violations**:
  - `Lines 1265, 1272, 1289, 1299, 1649, 1659`: Subtext uses `text-[9px]` and `text-[9.5px]` ("To Collect", "To Pay").
- **Mobile Card Button Sizing**:
  - `Lines 1318, 1335, 1353, 1360`: Buttons use `min-h-[44px] h-11 px-3 rounded-lg` and `min-w-[44px] min-h-[44px] w-11 h-11`.

#### `src/pages/Customers.tsx`
- **Unbounded Long Page Scroll Anti-Pattern**:
  - `Line 478`: `className="w-full max-w-[1400px] mx-auto px-4 py-6 sm:px-8 sm:py-8 space-y-6"`.
- **Skeuomorphic & Neon Glowing Halos**:
  - `Lines 509, 638`: Uses `glowing-btn-amber` with glowing neon box shadows.
  - `Lines 550, 565, 582`: Uses `glass-card-3d p-2.5 sm:p-5 relative overflow-hidden group select-none` with glowing neon halos (`shadow-[0_0_8px_rgba(59,130,246,0.5)]`, `shadow-[0_0_8px_rgba(244,63,94,0.5)]`, `shadow-[0_0_8px_rgba(245,158,11,0.5)]`).
  - `Line 603`: Uses `backdrop-blur-xl`.
- **Sub-11px Micro-Fonts**:
  - `Lines 520, 529, 538`: Mobile mini strip uses `text-[8.5px]`.
  - `Lines 553, 568, 585`: Metric card titles use `text-[9px]`.
  - `Line 645`: Badge uses `text-[9px]`.

#### `src/pages/Suppliers.tsx`
- **Unbounded Long Page Scroll Anti-Pattern**:
  - `Line 456`: `className="w-full max-w-[1400px] mx-auto px-4 py-6 sm:px-8 sm:py-8 space-y-6 font-sans"`.
- **Skeuomorphic & Neon Glowing Halos**:
  - `Line 496`: Uses `glowing-btn-amber text-white font-bold text-xs shadow-md`.
  - `Lines 507, 522, 539, 556`: Uses `glass-card-3d` with `shadow-[0_0_8px_rgba(...)]`.
  - `Line 579`: Uses `backdrop-blur-xl`.
- **Sub-11px Micro-Fonts**:
  - `Lines 510, 525`: Metric titles use `text-[9px]`.
  - `Lines 465, 621`: Badges use `text-[10px]`.
- **Table Density**:
  - Table rows lack screen-fitted bounded container with sticky header.

---

### Track 3: Cash & Bank & Expenses

#### `src/pages/CashAndBank.tsx`
- **Container Structure**:
  - `Line 554`: Container is screen-fitted `h-full flex flex-col bg-slate-50/60 dark:bg-slate-950/40 text-foreground overflow-hidden font-sans`.
  - `Line 605`: 2-column layout (`w-full lg:w-[320px] xl:w-[360px]` on left for accounts; right side for transaction ledger).
- **Hardcoded Arbitrary Palette Anti-Pattern**:
  - Multiple locations use hardcoded `#5046E5` (indigo/purple), `#EEF0FD` (purple tint), and `#4338CA`:
    - `Line 638`: `bg-[#EEF0FD] dark:bg-primary/15 border-[#5046E5] text-[#5046E5]`
    - `Line 661`: `text-[#5046E5] hover:text-[#4338CA]`
    - `Line 681`: `bg-[#EEF0FD] border-[#5046E5] text-[#5046E5]`
    - `Line 749`: `border-b-2 border-[#5046E5] text-[#5046E5]`
    - `Line 752`: `bg-[#EEF0FD] text-[#5046E5]`
    - `Lines 796, 800`: `text-[#5046E5]`
    - `Line 814`: `focus:ring-[#5046E5]`
    - `Line 864`: `bg-[#5046E5] hover:bg-[#4338CA]`
  - Minimal Design System Rule 5 strictly mandates: "Single Cohesive Accent: Royal/Electric Blue (`#2563EB` / `bg-blue-600` / `hover:bg-blue-700`)."
- **Skeuomorphic & Neon Elements**:
  - `Line 596`: `glowing-btn-amber text-white font-bold text-xs shadow-md`.
  - `Line 607`: Left panel uses `glass-card-3d`.
- **Sub-11px Micro-Fonts**:
  - `Line 612`: `text-[10px] font-bold uppercase tracking-wider font-mono`.
  - `Lines 888, 892, 896, 926, 933, 980, 984, 989, 1007, 1013, 1017`: `text-[10px]`.

#### `src/pages/Expenses.tsx`
- **Skeuomorphic & Glass Anti-Pattern**:
  - `Line 557`: Table container uses `glass-card-3d overflow-hidden rounded-2xl`.
- **Hardcoded Palette Anti-Pattern**:
  - Hardcoded `#5046E5` and `#4338CA` at `Line 589`, `Line 611`, `Line 793`.
- **Neon Glow Buttons**:
  - `Line 479`: `glowing-btn-amber text-white font-bold text-xs shadow-md`.
- **Button & Control Sizing**:
  - `Lines 432, 497, 507, 538`: Controls use `h-9 rounded-xl` instead of standard `h-8.5 rounded-lg`.
- **Numerals & Monospace**:
  - `Line 736`: Table amount `font-bold text-rose-600 text-xs` lacks `font-mono tabular-nums`.

---

### Strict Quarantine Verification
The 19 protected billing and invoice files were checked:
- None of the 7 files investigated are on the quarantine list.
- None of the 7 files import or touch any quarantined file.
- The 19 files remain 100% untouched.

---

## 2. Logic Chain

1. **Premise 1 (Screen-Fitted Viewport)**: Rule 2 of the master design system mandates that layouts fit within standard monitor heights (768px–1080px) without long page scroll.
   - `Observation`: `Inventory.tsx` (line 436), `Customers.tsx` (line 478), and `Suppliers.tsx` (line 456) use `w-full max-w-[1400px] mx-auto px-4 py-6 sm:px-8 sm:py-8 space-y-6`, allowing unrestricted whole-page vertical scrolling.
   - `Inference`: These 3 pages must be wrapped into the established screen-fitted shell:
     `h-full flex flex-col p-3 sm:p-4 space-y-3 overflow-hidden font-sans bg-slate-50/50 dark:bg-slate-950/50`, with `shrink-0` header, `shrink-0` KPI and filter bars, and `flex-1 min-h-0 overflow-hidden flex flex-col` table container.

2. **Premise 2 (Deprecation of Skeuomorphism and Neon Glows)**: Rule 3 strictly prohibits `glass-card-3d`, `backdrop-blur-xl`, and `shadow-[0_0_8px_...]` neon glowing drop shadows, requiring 1px hairline borders (`border-slate-200/80` light, `border-slate-800` dark) and subtle micro-shadows (`shadow-2xs` / `shadow-xs`).
   - `Observation`: `glass-card-3d` with glowing halos is present in `Inventory.tsx` (lines 465, 482, 501, 518), `Customers.tsx` (lines 550, 565, 582), `Suppliers.tsx` (lines 507, 522, 539, 556), `CashAndBank.tsx` (line 607), and `Expenses.tsx` (line 557).
   - `Observation`: `glowing-btn-amber` is present in `Customers.tsx` (lines 509, 638), `Suppliers.tsx` (line 496), `CashAndBank.tsx` (line 596), and `Expenses.tsx` (line 479).
   - `Inference`: Replace all `glass-card-3d` with `rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs`. Replace all `glowing-btn-amber` with standard minimal action button: `h-8.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs active:scale-[0.98] transition-all`.

3. **Premise 3 (Palette Cohesion)**: Rule 5 mandates a single cohesive royal blue accent (`#2563EB` / `bg-blue-600`), replacing ad-hoc rainbow colors.
   - `Observation`: `CashAndBank.tsx` and `Expenses.tsx` heavily use hardcoded `#5046E5`, `#EEF0FD`, and `#4338CA`.
   - `Inference`: Replace all occurrences of `#5046E5` with `bg-blue-600` / `text-blue-600` / `border-blue-600`, `#EEF0FD` with `bg-blue-50 dark:bg-blue-950/40`, and `#4338CA` with `hover:bg-blue-700`.

4. **Premise 4 (Typography Scale & Zero Sub-11px Micro-Fonts)**: Rule 4 strictly forbids any font size below `11px` (`text-[11px]`).
   - `Observation`: We found `text-[8.5px]`, `text-[9px]`, `text-[9.5px]`, and `text-[10px]` across mobile KPI strips, card titles, badges, and metadata in `Items.tsx`, `Parties.tsx`, `Customers.tsx`, `Suppliers.tsx`, `CashAndBank.tsx`, and `Expenses.tsx`.
   - `Inference`: Systematically bump all `text-[8.5px]`, `text-[9px]`, `text-[9.5px]`, and `text-[10px]` to `text-[11px]` (font-medium or font-semibold for badges/labels) or `text-xs` (12px for body/secondary text).

5. **Premise 5 (Button Sizing Standard)**: Rule 1 forbids oversized `h-11`, `h-12`, `px-8` bubble buttons and standardizes on `h-8.5 px-3 rounded-lg text-xs font-semibold` (34px) and table action `h-7 px-2.5 rounded-md text-[11px] font-medium` (28px).
   - `Observation`: `Items.tsx` (lines 1166, 1176) and `Parties.tsx` (lines 1318, 1335, 1353, 1360) use `min-h-[44px] h-11 px-3` and `min-w-[44px] min-h-[44px] w-11 h-11`.
   - `Inference`: Standardize these controls to `h-8.5 px-3 rounded-lg text-xs font-semibold` (or wrap inside standard touch container with 44px hit bounds) without bloated button dimensions.

6. **Premise 6 (Tabular Numerals OpenType Setup)**: Rule 4 mandates `'IBM Plex Mono'` with `font-mono tabular-nums` for all currency amounts (₹), quantities, and invoice numbers.
   - `Observation`: Unformatted numbers in `Inventory.tsx` (lines 749, 952, 1011) and `Expenses.tsx` (line 736).
   - `Inference`: Add `font-mono tabular-nums` to all monetary and quantity figures.

---

## 3. Recommended Fix Strategy for Worker M4

### Track 1: Items & Inventory

#### File 1: `src/pages/Items.tsx`
1. **Typography normalization**:
   - Replace all `text-[8.5px]`, `text-[9.5px]`, and `text-[10px]` with `text-[11px] font-semibold`.
   - In mobile KPI mini strip (`Lines 666, 684, 694, 704`): change `text-[8.5px]` to `text-[11px]`.
   - In desktop KPI cards (`Lines 721, 747, 768, 785`): change `text-[10px]` to `text-[11px]`. Strip redundant micro-prose ("Current cost valuation", "Master products", "Needs restock") or simplify.
   - In stock level badges (`Lines 1102, 1107, 1112` and `Lines 1410, 1415, 1420`): standardize to `text-[11px] font-semibold font-mono px-2 py-0.5 rounded-md`.
2. **Button sizing refinement**:
   - `Line 1166`: Replace `min-h-[44px] h-11 px-3 rounded-lg ...` with `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs`.
   - `Line 1176`: Replace `min-w-[44px] min-h-[44px] w-11 h-11 rounded-lg ...` with `w-8.5 h-8.5 rounded-lg flex items-center justify-center text-slate-500`.

#### File 2: `src/pages/Inventory.tsx`
1. **Screen-fitted container overhaul**:
   - Replace `line 436`:
     ```tsx
     // BEFORE:
     <div className="w-full max-w-[1400px] mx-auto px-4 py-6 sm:px-8 sm:py-8 space-y-6 font-sans">
     
     // AFTER:
     <div className="h-full flex flex-col p-3 sm:p-4 space-y-3 overflow-hidden font-sans bg-slate-50/50 dark:bg-slate-950/50">
     ```
   - Make Header and KPI grid `shrink-0`.
   - Wrap the Table/Mobile stream inside:
     ```tsx
     <div className="flex-1 min-h-0 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs flex flex-col">
       {/* Mobile Cards stream: */}
       <div className="block md:hidden flex-1 min-h-0 overflow-y-auto p-2.5 pb-24 space-y-2">...</div>
       {/* Desktop Table: */}
       <div className="hidden md:block flex-1 min-h-0 overflow-y-auto overflow-x-auto w-full scrollbar-thin">
         <table className="w-full text-xs text-left min-w-[720px]">
           <thead className="sticky top-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs ...">...</thead>
           ...
         </table>
       </div>
       {/* Fixed pagination footer */}
       <div className="shrink-0 border-t border-slate-200/80 dark:border-slate-800">
         <PaginationBar ... />
       </div>
     </div>
     ```
2. **Purge skeuomorphism**:
   - Replace all `glass-card-3d p-5 ... shadow-[0_0_8px_...]` with clean hairline cards:
     ```tsx
     <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-3.5 flex items-center justify-between relative overflow-hidden select-none">
     ```
   - Replace `backdrop-blur-xl border border-slate-200/80 rounded-2xl p-3 sm:p-4` with `bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs`.
3. **Table Row Height Density**:
   - Replace bloated `px-5 py-4` with compact `px-3 py-2.5` (`38px–42px` row height).
   - Ensure all prices, stock quantities, and values use `font-mono tabular-nums`.

---

### Track 2: Parties, Customers & Suppliers

#### File 3: `src/pages/Parties.tsx`
1. **Typography normalization**:
   - In mobile and desktop cards (`Lines 1265, 1272, 1289, 1299, 1649, 1659`), upgrade all `text-[9px]` and `text-[9.5px]` to `text-[11px] font-semibold`.
2. **Button sizing refinement**:
   - Standardize mobile card action buttons (`Lines 1318, 1335, 1353, 1360`) from `h-11` to `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs`.

#### File 4: `src/pages/Customers.tsx`
1. **Screen-fitted container overhaul**:
   - Replace `line 478`:
     ```tsx
     // BEFORE:
     <div className="w-full max-w-[1400px] mx-auto px-4 py-6 sm:px-8 sm:py-8 space-y-6">
     
     // AFTER:
     <div className="h-full flex flex-col p-3 sm:p-4 space-y-3 overflow-hidden font-sans bg-slate-50/50 dark:bg-slate-950/50">
     ```
2. **Purge skeuomorphism & neon buttons**:
   - Replace `glowing-btn-amber` with standard royal blue action button:
     ```tsx
     className="flex items-center gap-1.5 h-8.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
     ```
   - Replace `glass-card-3d` with `rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-3.5`.
3. **Normalize fonts & Udhar Khata directional badges**:
   - Replace `text-[8.5px]` and `text-[9px]` with `text-[11px] font-semibold`.
   - Align directional balances with Emerald for "To Collect (Dr)" and Rose for "To Pay (Cr)" with `font-mono tabular-nums`.

#### File 5: `src/pages/Suppliers.tsx`
1. **Screen-fitted container overhaul**:
   - Replace `line 456`:
     ```tsx
     // BEFORE:
     <div className="w-full max-w-[1400px] mx-auto px-4 py-6 sm:px-8 sm:py-8 space-y-6 font-sans">
     
     // AFTER:
     <div className="h-full flex flex-col p-3 sm:p-4 space-y-3 overflow-hidden font-sans bg-slate-50/50 dark:bg-slate-950/50">
     ```
2. **Purge skeuomorphism & neon buttons**:
   - Replace `glowing-btn-amber` with standard royal blue action button:
     ```tsx
     className="flex items-center gap-1.5 h-8.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
     ```
   - Replace `glass-card-3d` with clean hairline cards (`border-slate-200/80 dark:border-slate-800 shadow-2xs`).
3. **Normalize fonts & Udhar Khata directional badges**:
   - Replace `text-[9px]` and `text-[10px]` with `text-[11px] font-semibold`.
   - Ensure supplier payables use Rose pill with `font-mono tabular-nums`.

---

### Track 3: Cash & Bank & Expenses

#### File 6: `src/pages/CashAndBank.tsx`
1. **Color Palette Alignment**:
   - Replace all `#5046E5` with `bg-blue-600` / `text-blue-600` / `border-blue-600`.
   - Replace `#EEF0FD` with `bg-blue-50 dark:bg-blue-950/40`.
   - Replace `#4338CA` with `hover:bg-blue-700`.
2. **Purge skeuomorphism & neon buttons**:
   - Replace `glowing-btn-amber` (`Line 596`) with standard action button: `h-8.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs`.
   - Replace `glass-card-3d` (`Line 607`) with `rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs`.
3. **Typography & Table Density**:
   - Replace `text-[10px]` with `text-[11px]`.
   - Standardize table row padding to `px-3.5 py-2.5` (`38px–42px` row height).
   - Ensure all transaction amounts use `font-mono tabular-nums`.

#### File 7: `src/pages/Expenses.tsx`
1. **Purge skeuomorphism & hardcoded palette**:
   - Replace `glass-card-3d` (`Line 557`) with `rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs`.
   - Replace `#5046E5` / `#4338CA` with royal blue `bg-blue-600` / `hover:bg-blue-700`.
   - Replace `glowing-btn-amber` (`Line 479`) with `h-8.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs`.
2. **Standardize controls**:
   - Change `h-9 rounded-xl` inputs and dropdowns (`Lines 432, 497, 507, 538`) to `h-8.5 rounded-lg`.
3. **Tabular Numerals**:
   - Ensure amount figures use `font-mono tabular-nums` (`Line 736`).

---

## 4. Caveats

1. **Excel Edit Mode in `Inventory.tsx`**:
   `Inventory.tsx` supports inline cell editing (`isExcelEditMode`) with dirty row tracking (`dirtyRows`). When Worker M4 refactors table rows to `px-3 py-2.5` and 38px–42px height, the `<input type="number">` fields for stock, MRP, and cost price must fit compactly within the row (`h-7 px-2 text-xs font-mono`). State handling and mutation callbacks must not be altered.
2. **Real-time / LocalStorage State in `CashAndBank.tsx` & `Expenses.tsx`**:
   `CashAndBank.tsx` and `Expenses.tsx` use localized localStorage synchronization keyed to `orgId`. Worker M4 must only alter layout wrappers and CSS classes, preserving storage keys and transaction handlers intact.
3. **Customer & Supplier Modals**:
   `Customers.tsx` and `Suppliers.tsx` contain GST lookup autocompletion and credit modals. All business logic in `handleCreditSubmit` and `triggerGstAutoFill` must remain 100% untouched.
4. **Strict Quarantine**:
   Worker M4 must never open, touch, or format any of the 19 protected invoice creation files.

---

## 5. Conclusion

The 7 catalog and ledger pages are structurally sound in business logic but contain widespread design debt:
- **Long page scrolling** in `Inventory.tsx`, `Customers.tsx`, and `Suppliers.tsx` (`max-w-[1400px] mx-auto px-4 py-6`) directly violates R2.
- **Skeuomorphic artifacts** (`glass-card-3d`, multi-color neon halos `shadow-[0_0_8px_...]`, `glowing-btn-amber`) linger across 5 of the 7 pages.
- **Palette divergence** in `CashAndBank.tsx` and `Expenses.tsx` uses arbitrary purple `#5046E5` instead of royal blue `#2563EB`.
- **Sub-11px micro-fonts** (`text-[8.5px]`, `text-[9px]`, `text-[10px]`) are scattered across 6 pages.

Worker M4 has an exact, surgical roadmap to remediate these files without touching any business logic or quarantined files.

---

## 6. Verification Method

1. **TypeScript Build Verification**:
   ```powershell
   npm run build
   ```
   Must pass with 0 errors.

2. **Lint Verification**:
   ```powershell
   npm run lint
   ```
   Must pass with 0 errors.

3. **Visual Invalidation Checks**:
   - Check `Inventory.tsx`, `Customers.tsx`, and `Suppliers.tsx` on desktop (1920x1080 and 1366x768). There must be **zero vertical page scrollbar** on the main window; only the inner table body should scroll.
   - Grep search for `glass-card-3d` across `src/pages/`: must return 0 results.
   - Grep search for `glowing-btn` across `src/pages/`: must return 0 results.
   - Grep search for `#5046E5` across `src/pages/`: must return 0 results.
   - Grep search for `text-[8.5px]`, `text-[9px]`, `text-[9.5px]` across the 7 pages: must return 0 results.
   - Verify git status confirms zero changes to the 19 protected invoice creation files.
