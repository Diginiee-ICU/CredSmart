---
name: mobile-invoice-edit-item-redesign
description: "Ultra high master level skill for planning and redesigning the Edit Item modal strictly for Mobile View in Create Invoice. Enforces exact structural fidelity, typography, spacing, and interactions based on reference images."
---

# Mobile Edit Item Redesign Standard (CredSmart)

You are an elite, master-level UI/UX engineer and React architect. Your goal is to redesign the **Edit Item** modal within the Create Invoice flow **strictly for Mobile View**.

## Goal
To analyze and plan the redesign of the "Edit Item" modal for mobile view exactly as shown in the reference images. The desktop view must remain 100% untouched.

## Reference Specifications

### 1. Modal Container
- Full-screen fixed overlay covering the entire viewport (`fixed inset-0 z-50 bg-white flex flex-col`).
- Must include a rounded-t-xl or standard full-screen sheet styling if it acts as a bottom sheet (in the images, it looks like a bottom sheet pulling up, but a full-screen layout with a back button is safe). Actually, the images show a white rounded top card overlaying a darker background, so it's a bottom sheet!
- **Backdrop**: dark overlay (`bg-black/50`).
- **Sheet**: `bg-white rounded-t-[20px] mt-24 flex flex-col h-full overflow-hidden`.

### 2. Header
- **Left**: Back Arrow (`ArrowLeft`).
- **Center**: Item Name (e.g., "Sample Item") - text-[17px] font-bold text-slate-900.
- **Right**: "DEL" button - text-[11px] text-red-500 font-bold border border-red-200 rounded-full px-3 py-1.

### 3. Tabs
- Flex container with border-bottom.
- **"Price & Discount"**: active state is text-indigo-700 font-bold, border-b-2 border-indigo-700.
- **"Other Details"**: inactive state is text-slate-500 font-semibold.

### 4. Tab 1: Price & Discount
- **Sales Price**: Full width input. Label "Sales Price (Without Tax)". Input has '₹' prefix inside.
- **Quantity & Unit**: Flex row (gap-3). Qty input (type="number"), Unit dropdown (Select component).
- **Discount**: Flex row. Discount amount/percent input, and type dropdown (Percentage / Amount).
- **Tax Rate**: Full width dropdown (e.g., "GST @ 0%").

### 5. Tab 2: Other Details
- **Item Description**: Textarea or input for "Add Note/ Description".

### 6. Bottom Summary Panel
- Light gray box (`bg-slate-50 rounded-xl p-4 mx-4 mt-auto mb-4 border border-slate-100`).
- Lines (text-xs text-slate-500 flex justify-between):
  - "Tax Exclusive Price * Qty" -> "₹ 1,000"
  - "Discount" -> "(0.0%) ₹ 0"
  - "Tax Rate(%)" -> "0.0% = ₹ 0"
- Bold Total (text-[15px] text-slate-900 font-bold flex justify-between mt-2 pt-2 border-t border-slate-200):
  - "Total Amount" -> "₹ 1,000"

### 7. Footer
- Fixed at the bottom (`p-4 bg-white border-t border-slate-100 pb-[max(1rem,env(safe-area-inset-bottom))]`).
- **"Done" Button**: Full width, `bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-[15px] text-center`.

## Integration
- Create `src/components/invoices/mobile/EditItemModal.tsx`.
- Connect it inside `MobileCreateInvoice.tsx`. When "EDIT" is clicked on a line item, this modal should open with the selected item's data.

## Execution Rules
1. **Analyze First**: Create an `implementation_plan.md` artifact detailing the component structure and Tailwind classes.
2. **Zero Desktop Distraction**: Do not touch desktop tabs or components.
3. **Production Ready**: Ensure inputs update state correctly and totals calculate reactively.
