---
name: mobile-invoice-create-new-item-redesign
description: "Ultra high master level skill for planning and redesigning the Create New Item modal strictly for Mobile View in Create Invoice. Enforces exact structural fidelity, typography, spacing, tabs (Pricing, Stock, Other, Party Wise Prices) and product/service toggle based on reference images."
---

# Mobile Create New Item Redesign Standard (CredSmart)

You are an elite, master-level UI/UX engineer and React architect. Your goal is to redesign the **Create New Item** modal within the Create Invoice flow **strictly for Mobile View**.

## Goal
To analyze and plan the redesign of the "Create New Item" modal for mobile view exactly as shown in the reference images. The desktop view must remain 100% untouched.

## Reference Specifications

### 1. Modal Container & Header
- Full-screen fixed overlay covering the entire viewport (`fixed inset-0 z-50 bg-white flex flex-col`).
- **Header**:
  - `flex items-center px-4 py-3 gap-3 border-b border-slate-100`
  - Left: Back Arrow (`ArrowLeft`), text-indigo-700.
  - Center: "Create New Item" (`text-[17px] font-bold text-slate-900 flex-1 text-center`).
  - Right: Settings gear icon (`Settings`), text-indigo-700.

### 2. Top Form (Always Visible)
- **Item Name**: Input field with label "Item Name*".
- **HSN/SAC**: Input field with label "HSN" (if Product) or "SAC" (if Service). Has a search icon on the right.
- **Item Type**: Radio/Pill buttons for "Product" and "Service".
  - Active: `border border-indigo-600 text-indigo-700 bg-white font-semibold rounded-full`.
  - Inactive: `bg-slate-100 text-slate-700 font-semibold border border-transparent rounded-full`.

### 3. Tabs
- Flex container with scrollable overflow (`flex overflow-x-auto border-b border-slate-200 hide-scrollbar`).
- Tabs: "Pricing", "Stock" (Product only), "Other", "Party Wise Prices".
- Active Tab: `text-indigo-700 font-bold border-b-2 border-indigo-700 py-3 px-4 whitespace-nowrap`.
- Inactive Tab: `text-slate-500 font-semibold py-3 px-4 whitespace-nowrap`.

### 4. Tab 1: Pricing
- **Unit**: Input or Dropdown.
- **Sales Price**: Input with '₹' prefix. Right-side dropdown for "Without Tax" / "With Tax".
- **Purchase Price** (Product only): Input with '₹' prefix. Right-side dropdown.
- **GST**: Select dropdown (e.g. "None").
- **Discount on Sales Price**: Input. Right-side percent symbol '%'.

### 5. Tab 2: Stock (Product only)
- **Opening Stock**: Input (e.g., `35`). Right-side text `/PCS`.
- **As of Date**: Date picker input with Calendar icon.
- **Item Code**: Input.
- **Action Buttons**: Two side-by-side buttons: "Generate Barcode" and "Scan Barcode" (`border border-slate-200 text-indigo-700 rounded-lg py-2.5 font-bold text-sm`).
- **Low stock alert**: Toggle switch.

### 6. Tab 3: Other
- **Add Image**: Large button (`bg-slate-100 rounded-xl h-24 flex flex-col items-center justify-center text-slate-500 font-semibold`).
- **Item Category**: Select dropdown.
- **Custom Fields**: "Add Fields to Item" button (`border border-slate-200 text-indigo-700`).
- **Item Description**: Textarea.
- **Show in Online Store**: Checkbox with label.

### 7. Tab 4: Party Wise Prices
- Empty state: Center aligned icon (document with Rupee symbol).
- Text: "To enable Party Wise Prices and set custom prices for parties, please save the item first".

### 8. Sticky Footer Action Bar
- Fixed bottom (`p-3 bg-white border-t border-slate-100 flex items-center justify-between pb-[max(1rem,env(safe-area-inset-bottom))]`).
- Left side text: "Save & New" (purple bold), below it "Create New Item" (gray).
- Right side button: "Save" (`bg-indigo-600 text-white px-12 py-3.5 rounded-lg font-bold text-[15px]`).

## Integration
- Create `src/components/items/mobile/CreateNewItemModal.tsx`.
- Connect it inside `MobileCreateInvoice.tsx` via `AddItemModal.tsx` when clicking "+ Create New Item".

## Execution Rules
1. **Analyze First**: Create an `implementation_plan.md` artifact detailing the component structure.
2. **Zero Desktop Distraction**: Do not touch desktop tabs or components.
3. **Production Ready**: Fully implement forms, toggles, and UI components cleanly.
