# Specification Mining & Codebase Survey Report: POS Billing, Mobile Invoice, Catalog & Inventory

## 1. Observation

### File Paths & Actual Code Locations
1. **POS Billing Terminal**:
   - Location: `src/pages/POSBilling.tsx` (re-exported via `src/pages/Checkout.tsx` and routed in `src/App.tsx` at `ROUTE_PATHS.pos = '/pos'` and `ROUTE_PATHS.checkout = '/checkout'`).
   - Note: Dispatch referred to `src/pages/POS.tsx`; the actual file is `src/pages/POSBilling.tsx` (4,625 lines, 207 KB).
2. **Mobile Invoice Creation & Modals**:
   - Location: `src/components/invoices/mobile/MobileCreateInvoice.tsx` (485 lines).
   - Parent Container: `src/components/SalesInvoiceModal.tsx` (lines 1500–1640).
   - Companion Modals:
     - `src/components/invoices/mobile/SelectPartyModal.tsx`
     - `src/components/invoices/mobile/AddItemModal.tsx`
     - `src/components/invoices/mobile/EditItemModal.tsx`
     - `src/components/invoices/mobile/MobileBillPreviewModal.tsx`
     - `src/components/invoices/mobile/MobileInvoiceSuccessView.tsx`
3. **Transaction Lists (Sales)**:
   - Location: `src/pages/Sales.tsx` (1,615 lines).
   - Mobile card view container: lines 818–1074 (`block md:hidden flex-1 min-h-0 overflow-y-auto p-2 pb-36 space-y-2`).
   - Desktop table container: lines 1092–1400 (`hidden md:flex flex-1 min-h-0 overflow-y-auto overflow-x-auto w-full scrollbar-thin` with `<table className="w-full text-left text-xs border-collapse min-w-[640px]">`).
4. **Inventory & Items Catalog**:
   - Location: `src/pages/Inventory.tsx` (1,387 lines) and `src/pages/Items.tsx` (1,555 lines).
   - `Inventory.tsx` Mobile card container: lines 668–755 (`block md:hidden divide-y divide-border`).
   - `Inventory.tsx` Desktop table container: lines 773–950 (`hidden md:block overflow-x-auto` with `<table className="w-full min-w-[980px] text-sm">`).
   - `Items.tsx` Mobile card container: lines 975–1090 (`block md:hidden flex-1 min-h-0 overflow-y-auto p-2 pb-32 space-y-2`).
   - `Items.tsx` Desktop table container: lines 1091–1350 (`hidden md:block flex-1 min-h-0 overflow-y-auto overflow-x-auto w-full scrollbar-thin` with `<table className="w-full text-xs text-left min-w-[640px]">`).
5. **Sound & Haptics Infrastructure**:
   - Web Audio & Vibration: `src/utils/soundAndHaptics.ts` (`triggerHapticScan` [30ms], `triggerHapticSuccess` [[40, 30, 60]], `triggerHapticDelete` [[25, 20, 25]]).
   - Native Capacitor: `src/services/nativeCapacitor.ts` (`@capacitor/haptics`).

---

### Survey Answers & Evidence Chain

#### Question 1: POS Mobile Experience & Stages
- **Current Mobile Stage Count**: Currently only **2 stages** exist in `POSBilling.tsx`, controlled by state:
  ```typescript
  // src/pages/POSBilling.tsx:413
  const [mobileActiveView, setMobileActiveView] = useState<"cart" | "checkout">("cart");
  ```
- **Missing Stage**: The required 3-stage mobile workflow (`Catalog / Scan`, `Cart (${itemCount})`, `Payment / Checkout`) described in `mobile-erp-redesign` is currently compressed into 2 views. In the current `"cart"` view, the category dropdown, search bar, and action ribbon are placed directly above the cart items. There is no dedicated full-screen or card-based Catalog/Scan tab for touch mobile browsing.
- **Mobile Toggle Bar**:
  - `src/pages/POSBilling.tsx:2396-2425`: Renders a top 2-button pill toggle:
    - `Cart (${currentTab.items.length})` (`bg-indigo-600 text-white`)
    - `Pay (₹${grandTotal.toLocaleString("en-IN")})` (`bg-emerald-600 text-white`)
- **Sticky Bottom Bar & Cart Sheet**:
  - **In Cart View**: Lines 3117–3139 renders a sticky bottom bar displaying:
    - Left: `Total (${totalItemsCount} Qty)` and `₹${grandTotal.toLocaleString("en-IN")}` in large font.
    - Right: Button `Proceed to Pay ->` which executes `setMobileActiveView("checkout")`.
  - **In Checkout View**: The checkout panel (`w-full lg:w-[410px]`) fills the screen (`mobileActiveView === "checkout" ? "flex flex-1" : "hidden lg:flex"`). At the top is a back button `Back to Cart (${currentTab.items.length})` (line 3155), and at the bottom is a 3-column action row: `Print` (F6), `Save` (F7), `WhatsApp` (lines 3455–3498).
  - **Cart Sheet**: There is NO slide-over bottom sheet or drawer for the cart. The view alternates completely between the Cart panel and the Checkout panel.
- **Breakpoint Discrepancy**:
  - `POSBilling.tsx` uses `lg` (1024px) breakpoint for mobile toggling (`flex lg:hidden`, `hidden lg:flex`, `window.innerWidth < 1024`).
  - Meanwhile, `Sales.tsx`, `Inventory.tsx`, and `Items.tsx` use `md` (768px) breakpoint (`block md:hidden`, `hidden md:flex`).

---

#### Question 2: Touch Ergonomics, Hit Targets & Haptic Feedback
- **Requirements Defined by Skills**:
  - Minimum hit target: **44×44px** for all touchable buttons, steppers, and action pills.
  - Active feedback: `active:scale-[0.98] transition-transform` (or `active:scale-95`).
  - Safe Area Insets: `env(safe-area-inset-bottom)` and `env(safe-area-inset-top)`.
  - Container bottom padding: `pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]` to avoid dock obstruction.
- **Observed Discrepancies in Existing Code**:
  1. `POSBilling.tsx` Steppers: Lines 3070 and 3096 use `w-8 h-8` (32×32px) for minus/plus buttons — **violates 44×44px hit target**.
  2. `POSBilling.tsx` Card Delete: Line 3022 uses `p-1.5` (~28×28px) — **violates 44×44px**.
  3. `POSBilling.tsx` Action Ribbon: Lines 2447, 2469, 2482, 2494, 2506 use `px-2.5 py-1.5` (~30px total height) — **below 44px**.
  4. `Sales.tsx` & `Items.tsx` Mobile Actions: Print, Download, WhatsApp, More buttons in card footers use `p-1.5 rounded-lg` (~28×28px) — **below 44px**.
  5. Active Scale: Most existing components use `active:scale-95 transition-all` rather than the smoother `active:scale-[0.98] transition-transform`.
- **Haptic Feedback Infrastructure**:
  - Web Audio & Vibration in `src/utils/soundAndHaptics.ts`:
    - `triggerHapticScan()`: `navigator.vibrate(30)`
    - `triggerHapticSuccess()`: `navigator.vibrate([40, 30, 60])`
    - `triggerHapticDelete()`: `navigator.vibrate([25, 20, 25])`
  - Already integrated in `POSBilling.tsx` for barcode scan (line 820), item delete (line 1007), bill save (line 1604), and `SwipeableListItem.tsx` (lines 76, 79).

---

#### Question 3: Mobile vs Desktop List Rendering & Overflow Issues
- **`Sales.tsx`**:
  - Clean separation: Mobile uses `block md:hidden` (card stream with `pb-36`), Desktop uses `hidden md:flex` with `<table className="w-full text-left text-xs border-collapse min-w-[640px]">`.
  - The table has `min-w-[640px]`, but since it is wrapped in `hidden md:flex`, it causes NO horizontal overflow on viewports `< 768px`.
  - Mobile cards display Invoice #, clickable payment status badge (toggles Paid/Unpaid), grand total, customer name, date, due text, and quick action icons.
- **`Inventory.tsx`**:
  - Desktop table has `min-w-[980px]` inside `hidden md:block overflow-x-auto`.
  - Mobile cards use `block md:hidden divide-y divide-border`.
  - **Defect Identified**: `Inventory.tsx` mobile card container lacks bottom padding (`pb-28` or `pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]`). When rendered with a floating bottom navigation dock, the bottom-most inventory items will be clipped or occluded!
- **`Items.tsx`**:
  - Clean separation: Mobile card view has `pb-32` (`block md:hidden flex-1 min-h-0 overflow-y-auto p-2 pb-32 space-y-2`), Desktop table has `min-w-[640px]` inside `hidden md:block`.
- **`POSBilling.tsx`**:
  - The cart items table has `min-w-[600px]` inside `hidden lg:block`.
  - On mobile, `SwipeableListItem` renders cards inside `block lg:hidden p-3 space-y-2.5 pb-28`.

---

#### Question 4: Component Props, Data Models & Action Handlers

##### A. `MobileCreateInvoice.tsx` (`src/components/invoices/mobile/MobileCreateInvoice.tsx`)
- **Props (`MobileCreateInvoiceProps`)**:
  ```typescript
  export interface MobileCreateInvoiceProps {
    onClose: () => void;
    saving?: boolean;
    docType: string;
    docDate: string;
    dueDate: string;
    showDueDate: boolean;
    invoicePrefix: string;
    invoiceNumberSeq: string;
    selectedCustomerId: string;
    partyName: string;
    customers: any[];
    items: DocumentLineItem[];
    recalculatedItems: DocumentLineItem[];
    totals: any;
    catalog: any[];
    onSetSelectedCustomerId: (id: string, partyData?: any) => void;
    onUpdateItem: (index: number, field: keyof DocumentLineItem, value: any) => void;
    onRemoveItem: (index: number) => void;
    onSave: (andPrint: boolean, saveAndNew: boolean) => void;
    onAddSelectedItems: (items: DocumentLineItem[]) => void;
    onUpdateAdditionalCharges?: (amount: number, reason: string) => void;
    onUpdateDiscount?: (type: "flat" | "percent", value: number) => void;
    onUpdateRoundOff?: (auto: boolean, manualValue: number) => void;
    onUpdateNotes?: (notes: string) => void;
    amountReceived?: number;
    markAsFullyPaid?: boolean;
    onUpdatePayment?: (amountReceived: number, markAsFullyPaid: boolean) => void;
    onCustomerCreated?: (customer: any) => void;
    storeInfo?: any;
    partyPhone?: string;
    partyGstin?: string;
    partyAddress?: string;
    placeOfSupply?: string;
    paymentMethod?: string;
    notes?: string;
    terms?: string;
    ewayBillNo?: string;
    vehicleNumber?: string;
    poReference?: string;
  }
  ```
- **Action Handlers**:
  - `handleSaveAndNew`: calls `props.onSave(false, true)`
  - `handleGenerateBill`: calls `props.onSave(true, false)`
  - `props.onUpdateItem(idx, 'quantity', qty)`
  - `props.onAddSelectedItems(items)` from `AddItemModal`

##### B. `SalesInvoiceModal.tsx` (`src/components/SalesInvoiceModal.tsx`)
- **Save Action Handler (`handleSave`)**:
  - Validates `partyName` and `validItems.length > 0`.
  - Determines ID: `const currentDocId = activeSavedDocId || editingDoc?.id || undefined`.
  - Calls `const saved = await documentsService.saveDocument(finalDoc, user?.id)`.
  - Non-blocking network invoice dispatch: `networkInvoicingService.sendSalesInvoiceToNetwork(saved, org, user?.id)`.
  - If `saveAndNew`: resets fields, increments sequence `invoiceNumberSeq`, stays on `MobileCreateInvoice`.
  - If `window.innerWidth < 1024` and not `saveAndNew`: `setMobileSuccessInvoice(saved)` -> mounts `MobileInvoiceSuccessView`.
- **Success View Transitions**:
  - `onEdit`: `setActiveSavedDocId(mobileSuccessInvoice.id)`, `setMobileSuccessInvoice(null)` (in-place re-edit).
  - `onDelete`: calls `documentsService.deleteDocument(...)`, closes dialog.
  - `onDuplicate`: increments sequence, clears amounts, returns to editor.

##### C. `POSBilling.tsx` (`src/pages/POSBilling.tsx`)
- **Data Models**:
  ```typescript
  export interface POSCartItem {
    id: string;
    product: Product;
    batch: Batch;
    mrp: number;
    sp: number; // Selling Price
    discountPercent: number;
    discountType: "percent" | "flat";
    quantity: number;
    itemCode: string;
    notes?: string;
  }

  export interface BillingTab {
    id: string;
    tabIndex: number;
    title: string;
    items: POSCartItem[];
    selectedItemIndex: number;
    customer: CustomerInfo | null;
    discountType: "percent" | "flat";
    discountValue: number;
    discountReason: string;
    additionalCharges: AdditionalCharge[];
    paymentMode: "Cash" | "UPI" | "Card" | "Credit" | "Split" | "Net Banking";
    receivedAmount: string;
    notes: string;
    splitCash?: number;
    splitCard?: number;
    splitUPI?: number;
    splitCredit?: number;
  }
  ```
- **Barcode Scanning Engine**:
  - Hardware scanner keydown interceptor (lines 880–925): tracks inter-keystroke interval `< 70ms`. On `Enter` with buffer length >= 3, matches product by `barcode`, `sku`, or `id`, calls `handleAddProduct(matched)`, plays scan beep and triggers haptic.
  - Camera scanner (lines 4317–4353): modal toggle with camera viewfinder frame and pulse line.
- **Add to Cart Handler (`handleAddProduct`)**:
  - Matches custom party pricing if `currentTab.customer?.customItems` contains special rates.
  - Checks if item + batch already exists in `tab.items`: increments `quantity + 1`.
  - If new: creates `POSCartItem` and prepends to `tab.items`.
  - Triggers `playScanBeep()` and `triggerHapticScan()`.

---

#### Question 5: Vitest Test Suites
1. **Mobile Invoice Success & Lifecycle**:
   - `src/test/MobileInvoiceSuccessView.test.tsx` (24 tests: circular edit button, dual-action footer, callbacks, touch targets, more options menu, WhatsApp share)
   - `src/test/MobileInvoiceSuccessView.challenge.test.tsx`
   - `src/test/MobileInvoiceSuccessView.challenger.test.tsx`
   - `src/test/MobileInvoiceSuccessView.m2Challenger.test.tsx`
   - `src/test/MobileInvoiceSuccessView.r3Deletion.test.tsx`
2. **Billing Lifecycle & In-Place Updates**:
   - `src/test/billingLifecycleEngine.test.ts` (6 tests: single-record cache integrity, in-place document updates, saveAndNew sequence increment)
   - `src/test/billingLifecycleEngine.adversarial.test.ts`
3. **Invoice Rendering & Printing**:
   - `src/test/downloadExactInvoice.test.ts`, `.adversarial.test.ts`, `.realjspdf.test.ts`
   - `src/test/unifiedInvoiceRenderer.test.tsx`, `.edge.test.tsx`
   - `src/test/invoiceCalculations.test.ts`
   - `src/test/unitConversionBill.test.ts`
4. **Network Invoicing**:
   - `src/test/networkInvoicing.test.ts`
5. **POS Billing Coverage Gap**:
   - **Critical finding**: `POSBilling.tsx` has **0 dedicated unit test suites**. It is only referenced in `src/test/m2GrepAstChallenger.test.ts`. Any mobile POS redesign must ensure tests are added or existing billing lifecycle tests pass without regressions.

---

## 2. Logic Chain

1. **Premise 1**: The original request (2026-10-21T00:05:26Z) and `DISPATCH.md` mandate a complete from-scratch mobile view redesign adhering to Clean High-Density Retail Minimal (Stripe / Shopify POS), while preserving 100% desktop invariance.
2. **Premise 2**: Authoritative skill `mobile-erp-redesign` specifies a 3-stage POS mobile workflow: (1) `Catalog / Scan`, (2) `Current Cart (${itemCount})`, and (3) `Payment / Checkout`, with a sticky bottom bar and >=44×44px hit targets.
3. **Inference from Code Survey**:
   - `src/pages/POSBilling.tsx` currently only provides 2 stages (`cart` and `checkout`) toggled via top buttons, with no dedicated mobile catalog/scanning stage.
   - Stepper buttons and delete icons are undersized (32×32px and 28×28px), violating the 44×44px standard.
   - The breakpoint in `POSBilling.tsx` is `lg:` (1024px), whereas all other modules use `md:` (768px).
   - In `Inventory.tsx`, mobile card list has no bottom padding, causing occlusion if a bottom dock is rendered.
   - In `SalesInvoiceModal.tsx`, mobile creation is cleanly isolated in `MobileCreateInvoice.tsx` and transitions to `MobileInvoiceSuccessView.tsx`.
4. **Test Suite Health**:
   - Running `npx vitest run src/test/MobileInvoiceSuccessView.test.tsx src/test/billingLifecycleEngine.test.ts` passed 30/30 tests.
   - Running `npx tsc --noEmit` exited with code 0 (zero compiler errors).

---

## 3. Caveats

1. **POS File Naming**: The dispatch assignment mentioned `src/pages/POS.tsx`. That file does not exist; the actual implementation is `src/pages/POSBilling.tsx` (re-exported by `src/pages/Checkout.tsx`).
2. **Mobile Invoice File Location**: The dispatch mentioned `src/components/MobileCreateInvoice.tsx`. The actual location is `src/components/invoices/mobile/MobileCreateInvoice.tsx`.
3. **Hardware Scanner Testing**: Hardware barcode scanners fire rapid keyboard events (<70ms between characters). This behavior is handled in `useEffect` in `POSBilling.tsx`, but cannot be simulated on mobile touchscreens without camera barcode scanning or manual search.

---

## 4. Conclusion

- CredSmart's mobile billing architecture consists of two primary pipelines:
  1. **POS Fast Retail Billing**: `src/pages/POSBilling.tsx`, which contains rich business logic (multi-tab billing, hardware scanner detection, custom party catalog pricing, voice billing, thermal ESC/POS printing, UPI QR generation), but is currently constrained by a 2-stage mobile layout (`cart` and `checkout`) with undersized hit targets (<44px).
  2. **Standard Sales Invoicing**: `src/components/invoices/mobile/MobileCreateInvoice.tsx` inside `src/components/SalesInvoiceModal.tsx`, which features a dedicated mobile editor, party selection modal, item search/add modal, and transitions to `MobileInvoiceSuccessView.tsx` with tested in-place update and duplication lifecycles.
- For catalog and inventory, `Sales.tsx` and `Items.tsx` already feature responsive mobile cards, but `Inventory.tsx` requires bottom padding fixes (`pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]`) to prevent occlusions with the floating bottom dock.
- To achieve the Stripe / Shopify POS standard, POS Billing should be restructured into 3 mobile stages (`Catalog / Scan`, `Cart`, `Payment`) while leaving the desktop table and shortcuts (`hidden lg:flex`) 100% intact.

---

## 5. Verification Method

- **TypeScript compilation**:
  `cmd /c npx tsc --noEmit` -> verify exit code 0.
- **Existing Billing & Mobile Test Suites**:
  `cmd /c npx vitest run src/test/MobileInvoiceSuccessView.test.tsx src/test/billingLifecycleEngine.test.ts` -> verify 30 tests pass.
- **Code Inspection**:
  - `src/pages/POSBilling.tsx` lines 413, 2396–2425 (mobile view toggle), 2950–3110 (cart cards), 3117–3139 (sticky checkout bar), 3145–3500 (checkout panel).
  - `src/components/invoices/mobile/MobileCreateInvoice.tsx` lines 10–50 (props), lines 262–300 (sticky footer).
  - `src/components/SalesInvoiceModal.tsx` lines 1030–1220 (save & in-place update lifecycle), 1500–1640 (modal mobile/desktop mount).
  - `src/pages/Inventory.tsx` lines 668–755 (mobile cards without bottom padding).

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | POS Mobile | 2-Stage Mobile View Toggle | Switches view between Cart and Checkout via top buttons | `mobileActiveView: "cart" \| "checkout"` | Toggles DOM rendering between left column and right panel | Defaults to "cart" if items present | `src/pages/POSBilling.tsx:413, 2396-2425` |
| 2 | POS Mobile | Sticky Mobile Cart Checkout Bar | Sticky footer showing item count, grand total, and "Proceed to Pay" CTA | Current tab items & grandTotal | Switches `mobileActiveView` to "checkout" | Disabled when cart has 0 items | `src/pages/POSBilling.tsx:3117-3139` |
| 3 | POS Mobile | Swipeable Mobile Cart Card | Mobile cart items rendered as touch cards with swipe-left-to-delete | `SwipeableListItem`, `POSCartItem` | Triggers `handleRemoveCartItem(idx)` with haptic delete | Prevents decrement below 1 | `src/pages/POSBilling.tsx:2983-3110` |
| 4 | POS Mobile | Full-Screen Mobile Checkout View | Full-screen panel for discount, additional charges, payment mode, cash calculator | Payment mode selection, received amount input | Computes change due or credit balance | Displays warning banner if balance due | `src/pages/POSBilling.tsx:3145-3500` |
| 5 | POS Barcode | Hardware Rapid Keystroke Scanner | Detects USB/Bluetooth hardware barcode scanner (<70ms between characters) | Keystrokes in `window` `keydown` listener | Matches product by barcode/sku/id, adds to cart, beeps | Plays error beep and destructive toast if not found | `src/pages/POSBilling.tsx:880-925` |
| 6 | POS Barcode | Camera Barcode Scanner Modal | Modal camera viewfinder for scanning barcodes on touchscreens/phones | Camera scanner toggle button | Frame overlay with animated pulse line | Closes on tap | `src/pages/POSBilling.tsx:4317-4353` |
| 7 | POS Pricing | Custom Party Item Pricing | Overrides MRP/SP based on customer custom catalog prices | `currentTab.customer.customItems` | Replaces batch MRP with `customPrice` | Falls back to standard batch MRP | `src/pages/POSBilling.tsx:801-816` |
| 8 | POS Voice | Voice Billing Assistant | Speech recognition engine for adding items or changing quantities via voice | `webkitSpeechRecognition` / `SpeechRecognition` | Parses commands into item/price/qty/payment mutations | Toasts if voice unsupported | `src/pages/POSBilling.tsx:2443`, `src/utils/posVoiceService.ts` |
| 9 | POS ESC/POS | Direct Thermal Printing | Zero-latency WebUSB ESC/POS receipt printing with cash drawer kick | WebUSB device connection | Raw binary ESC/POS bytecode | Falls back to standard browser print | `src/pages/POSBilling.tsx:3710`, `src/utils/escpos.ts` |
| 10 | Invoice Mobile | Mobile Create Invoice Layout | Dedicated mobile screen for invoice metadata, party, items, charges | `MobileCreateInvoiceProps` | Emits `onSave(andPrint, saveAndNew)` | Toasts if party or items empty | `src/components/invoices/mobile/MobileCreateInvoice.tsx` |
| 11 | Invoice Mobile | Sticky Invoice Footer Bar | Sticky bar with Total Amount, "Save & New", "Preview Bill", "Generate Bill" | `totals.grandTotal`, `saving` | Triggers save or opens `MobileBillPreviewModal` | Buttons disabled while `saving` is true | `src/components/invoices/mobile/MobileCreateInvoice.tsx:262-300` |
| 12 | Invoice Mobile | Mobile Success Screen with In-Place Edit | Displays bill summary with circular quick actions, PDF/WhatsApp share, and in-place edit | `MobileInvoiceSuccessViewProps` | `onEdit` preserves active document ID to avoid duplicate creation | Delete requires confirmation bottom sheet | `src/components/invoices/mobile/MobileInvoiceSuccessView.tsx` |
| 13 | Invoice Mobile | Mobile Save & New Sequence Engine | Saves invoice and automatically increments sequence number without leaving editor | `saveAndNew: true` | Clears party, resets rows to 1, increments `invoiceNumberSeq` | Toasts next bill ready | `src/components/SalesInvoiceModal.tsx:1174-1210` |
| 14 | Sales Mobile | Touch Transaction Cards | Responsive cards replacing 10-column table on `< md` screens | `filteredDocuments`, pagination | Shows Invoice #, status pill, amount, party, date, quick actions | Empty state prompt if 0 transactions | `src/pages/Sales.tsx:818-1074` |
| 15 | Inventory Mobile | Mobile Inventory Item Cards | Responsive cards showing item name, category badge, stock progress bar, value | `paginatedItems` | Quick Adjust modal trigger, Batch list drawer | Missing bottom safe-area padding | `src/pages/Inventory.tsx:668-755` |
| 16 | Items Mobile | Mobile Items Catalog Cards | Responsive cards showing SKU, barcode, selling price, stock pill | `paginatedItems` | Quick stock adjustment (+5/-5) and more menu | Shows "0 Stock" in rose badge | `src/pages/Items.tsx:975-1090` |
| 17 | Haptics | Web Vibration Helpers | 3 vibration pulses for scan (30ms), success (40-30-60), delete (25-20-25) | `navigator.vibrate` | Physical device haptic pulse | Silently ignored if unsupported | `src/utils/soundAndHaptics.ts` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | POS Mobile Cart | 0 items in cart | Displays "Cart is empty" with scan line animation and voice billing CTA button; "Proceed to Pay" button in sticky footer is disabled. |
| 2 | POS Quantity Stepper | Quantity is 1 and user taps Minus | `Math.max(1, it.quantity - 1)` ensures quantity never drops below 1; user must use Trash icon or swipe left to remove item. |
| 3 | POS Hardware Scanner | Scan interval > 100ms or < 3 chars | Scanner buffer resets; keys are treated as standard user keyboard input to avoid corrupted inputs. |
| 4 | POS Mobile Breakpoint | Viewport width 800px (tablet) | `Sales.tsx` and `Inventory.tsx` display desktop tables (`md:`), but `POSBilling.tsx` displays mobile layout (`lg:`). |
| 5 | Mobile Invoice In-Place Edit | User edits saved bill and clicks "Generate Bill" | `currentDocId` is preserved in `activeSavedDocId`; `documentsService.saveDocument` executes SQL update rather than creating a duplicate. |
| 6 | Mobile Invoice "Save & New" | User taps "Save & New" on mobile | Current bill is saved, form fields reset, sequence number increments (e.g. 101 -> 102), and modal remains open for rapid-fire billing. |
| 7 | Inventory Mobile View | User scrolls to last item on mobile with dock | Bottom cards are clipped/occluded because `Inventory.tsx` lacks `pb-28` or `pb-[calc(5.5rem+env(safe-area-inset-bottom))]`. |
| 8 | Sound & Haptic Vibration | iOS Safari or browser without `navigator.vibrate` | Safe try-catch blocks silently catch errors without crashing UI. |
