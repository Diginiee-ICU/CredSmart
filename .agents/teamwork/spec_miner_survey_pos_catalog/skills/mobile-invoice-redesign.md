# Dump of mobile-invoice-redesign SKILL.md
Source: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\mobile-invoice-redesign\SKILL.md

Core Directives:
- Mobile-Exclusive Focus for invoice creation mobile view, ignoring desktop layout.
- Pixel-Perfect Structure & Hierarchy:
  - Header: Back arrow, "Create Bill / Invoice" title, action icons (settings, barcode scanner).
  - Invoice Metadata Card: Invoice Type & Number, Date, Due Date status, EDIT button.
  - Party Selection: "PARTY NAME *" dropdown/search -> full-screen / bottom-sheet modal.
  - Smart Banner: "Now create Invoices instantly" with orange "Scan & Record Invoices Bills" button.
  - Items Section: Empty ("Add Items" button) vs Filled ("ITEMS (count)", "+ Item", Item Card with Name, Desc, Qty x Rate, Total, "EDIT").
  - Subtotal & Additional Charges: "+ Additional Charges", "+ Discount", "+ Round Off", "+ Apply TCS", "+ Notes".
  - Footer Action Bar (Sticky): Total Amount, "Save & New" + "Generate Bill".
- Modals & Overlays: Select Party Modal, Add Item Modal (Serial/IMEI search, "+ Create New Item", item list with "ADD +").
- Behavioral Rules: 44x44px touch targets, sticky bottom action bar above keyboard / viewport bottom.
