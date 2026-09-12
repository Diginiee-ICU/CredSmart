---
name: mobile-invoice-generate-bill-redesign
description: "Ultra high master level skill for planning and redesigning the 'Generate Bill' success screen strictly for Mobile View in Create Invoice. Enforces exact structural fidelity, typography, spacing based on reference images."
---

# Mobile Generate Bill Success Screen Redesign (CredSmart)

You are an elite, master-level UI/UX engineer and React architect. Your goal is to redesign the success view that appears after clicking "Generate Bill" (Save) strictly for Mobile View.

## Goal
Create `MobileInvoiceSuccessView.tsx` to match the provided reference image of the "Sales Invoice Created" screen.

## Reference Specifications

### 1. Header
- Left: Back Arrow (purple text)
- Title: "Sales Invoice Created" (bold, dark slate)
- Subtitle: "#3" (Invoice number, small, gray)
- Right Actions: 
  - Edit icon (blue pen `Pen`)
  - Delete icon (red trash with x `Trash2`)
  - More menu (3 vertical dots `MoreVertical`, purple)

### 2. Promo Banner
- Full width white container below header.
- "Celebrate New Theme(s)" (bold)
- "New exclusive theme styling available" (gray, small text)
- Button: "Explore Now" (dark blue rounded rectangle)
- Close icon: "X" on the right.

### 3. PDF Preview Container
- Background: light gray (`bg-slate-100`).
- Padding: padding all around.
- Inner Box: A simulated PDF page (`bg-white shadow-sm border border-slate-200 aspect-[1/1.4] w-full p-4`).
- We can just render a stylized skeleton of a PDF, or an iframe/image placeholder that looks like a bill (e.g. "myBillBook" placeholder).

### 4. Remove Logo Banner
- White background, bottom border.
- Left: Small icon of "myBillBook" with an "x".
- Text: "Remove myBillBook logo"
- Right: `>` chevron icon.

### 5. Activity Summary
- White background, padding.
- Top Left: Clock icon + "Last Activity by Your Name" (gray, text-sm).
- Bottom Left: Party Name (e.g., "Cash Sale") in bold, phone number in gray text-sm.
- Top Right: Total Amount (e.g., "₹ 1,000") in bold text-xl.
- Bottom Right: Status "Paid" (green text) with a green checkmark.

### 6. Action Buttons Row
- White background, flex row centered.
- 3 Buttons: "Print", "Download", "Share".
- Each button has a circle icon container (purple border/icon) with text below it.

### 7. Footer
- Fixed bottom, white background, top border.
- Large full-width "Done" button with purple background (`bg-[#4f46e5]`).

## Integration Plan Requirements
1. Create `src/components/invoices/mobile/MobileInvoiceSuccessView.tsx`.
2. Update `src/components/SalesInvoiceModal.tsx` to handle a new state `mobileSuccessInvoice` (type `BusinessDocument | null`).
3. Modify `handleSave` in `SalesInvoiceModal.tsx` so that if `isMobile` is true (you can detect this using window.innerWidth or pass a flag from `MobileCreateInvoice`'s onSave), it sets `mobileSuccessInvoice` instead of closing the modal.
4. Render `MobileInvoiceSuccessView` in the `block lg:hidden` section when `mobileSuccessInvoice` is not null.

## Execution Rules
1. Never break desktop flow.
2. Produce `implementation_plan.md` first.
