---
name: mobile-invoice-redesign
description: >-
  Ultra-high master level skill for planning and redesigning the Create Invoice page
  strictly for Mobile View. Enforces exact structural fidelity, typography, spacing,
  and interactions based on reference images, without distracting into desktop designs.
---

# Mobile Create Invoice Redesign Standard

This skill defines the exact rules, structure, and design principles required for the Mobile "Create Invoice / Bill" page redesign, perfectly mirroring the provided reference UI.

## Core Directives

1. **Mobile-Exclusive Focus**:
   - Only analyze, plan, and build for the mobile viewport.
   - Ignore desktop classes or desktop-specific paradigms for this particular view unless explicitly merging into a responsive framework that requires `block md:hidden`.

2. **Pixel-Perfect Structure & Hierarchy**:
   - **Header**: Back arrow, "Create Bill / Invoice" title (bold, centered or left-aligned as per ref), and action icons (e.g., settings, barcode scanner) on the right.
   - **Invoice Metadata Card**: Invoice Type & Number (e.g., "Sales Invoice #4"), Date ("12 Sept 2026"), Due Date status, and an "EDIT" outline button.
   - **Party Selection**: "PARTY NAME *" label with a prominent dropdown/search input. Must open a full-screen or bottom-sheet modal for party selection.
   - **Smart Banner (Optional state)**: "Now create Invoices instantly" with a prominent orange "Scan & Record Invoices Bills" button.
   - **Items Section**:
     - Empty state: A prominent full-width "Add Items" button.
     - Filled state: Shows item count "ITEMS (1)", right-aligned "+ Item" button. List of items showing Name, Category/Desc, Qty x Rate, Total Price, and an "EDIT" button.
     - Subtotal & Additional Charges: "Item Subtotal" row, followed by textual buttons for "+ Additional Charges", "+ Discount", "+ Round Off", "+ Apply TCS", and "+ Notes" aligned to the right or appropriately.
   - **Footer Action Bar (Sticky)**:
     - "Total Amount" row with currency symbol and formatted amount.
     - Bottom-most split action buttons: "Save & New" (light/secondary) and "Generate Bill" (dark/primary, taking equal or more width).

3. **Modals & Overlays**:
   - **Select Party Modal**: Top search bar, tabs for "All Parties" and "Contacts", list of parties with balances (green/red arrows), and a floating or sticky bottom button "+ Create Party".
   - **Add Item Modal**: Top search bar for "Serial Number / IMEI" with scan/mic icons, "+ Create New Item" pill button. List of selectable items with "ADD +" buttons.

4. **Typography & Styling**:
   - Use clean, modern sans-serif typography.
   - Colors: Primary brand color (e.g., Indigo/Deep Purple) for main actions and icons. Orange for the scanner banner. Light gray backgrounds for input fields and section separators.
   - Borders: Subtle 1px borders for inputs, rounded corners (e.g., `rounded-md` or `rounded-lg`).

5. **Behavioral Rules**:
   - Ensure touch targets are at least 44x44px.
   - The bottom action bar must be sticky and remain visible above the keyboard or at the bottom of the viewport at all times.

## Workflow

When invoked to redesign the Create Invoice mobile view:
1. Analyze the existing codebase for the invoice creation page.
2. Draft an implementation plan (`implementation_plan.md`) mapping existing components to the new mobile requirements.
3. Define exact React/Tailwind (or applicable framework) component structures.
4. Maintain a laser-focus on the goal: replicating the reference images for mobile view without any distraction.
