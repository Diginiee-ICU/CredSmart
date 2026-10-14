# DISPATCH — Visual Spec Miner

**Working Directory**: c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\spec_miner_visual
**Role**: Visual Specification Miner
**Original Request**: c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (Section 2026-10-13T20:00:31Z)
**Target Design Reference**: c:\Users\bishn\Documents\GitHub\CredSmart\Correction\New folder\New Invoice.jpeg
**Legacy Layout Reference**: c:\Users\bishn\Documents\GitHub\CredSmart\Correction\New folder\Old Invoice.jpeg

## Objectives
1. Read `ORIGINAL_REQUEST.md` (Section 2026-10-13T20:00:31Z).
2. Examine the reference image `c:\Users\bishn\Documents\GitHub\CredSmart\Correction\New folder\New Invoice.jpeg` (using view_file) and compare it against `Old Invoice.jpeg`.
3. Extract and document complete pixel-level specifications:
   - Header: Unboxed TAX INVOICE title on the left, right-aligned stacked metadata (Invoice No, Invoice Date, Due Date), full-width cyan/blue accent divider.
   - Dual Pods: Side-by-side equal-width FROM (Seller) and BILL TO (Buyer) pods, light-blue header ribbons, typography, labels, address, GSTIN, State code, etc.
   - Items Table: Uppercase ITEM DETAILS title above table, solid dark navy header (`bg-[#0c324e]`) with white typography (`S.No.`, `Description`, `HSN`, `Qty`, `Rate`, `Amount`), row borders, spacing, text alignments.
   - Financial Summary: Right-aligned totals breakdown (Taxable Value, CGST/SGST/IGST breakdown or GST %, Total highlight pill with soft blue rounded background, Received amount, Balance amount).
   - Amount in Words: Clean unboxed line below summary.
   - Bank Details & Signatory: Dual side-by-side bordered cards with light-blue header ribbons for BANK ACCOUNT DETAILS and AUTHORISED SIGNATORY.
   - Footer: "Thank you for your business."
4. Deliver a comprehensive report in `spec_report.md` and `handoff.md` in your working directory.

## 2026-10-13T20:07:17Z
You are Visual Spec Miner.
Your working directory is: c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\spec_miner_visual
Read your dispatch file at c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\spec_miner_visual\DISPATCH.md
Read ORIGINAL_REQUEST.md at c:\Users\bishn\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (Section 2026-10-13T20:00:31Z).
Inspect the reference images:
- Target: c:\Users\bishn\Documents\GitHub\CredSmart\Correction\New folder\New Invoice.jpeg
- Legacy: c:\Users\bishn\Documents\GitHub\CredSmart\Correction\New folder\Old Invoice.jpeg
Examine the visual details (use view_file on images if needed or inspect details):
- Header: Unboxed TAX INVOICE title on the left, right-aligned stacked metadata (Invoice No, Invoice Date, Due Date), full-width cyan accent divider line.
- Dual Pods: Equal-width side-by-side FROM (Seller) and BILL TO (Buyer) pods with light-blue header ribbons and contact/tax details.
- Items Table: Uppercase ITEM DETAILS title above table, solid dark navy header row (bg-[#0c324e]) with white text (S.No., Description, HSN, Qty, Rate, Amount).
- Totals: Right-aligned breakdown (Taxable Value, GST 5%, Total highlight pill with soft blue rounded background, Received amount, Balance amount).
- Amount in Words: Clean unboxed line below summary totals.
- Bank Account Details & Authorised Signatory: Side-by-side bordered cards with light-blue header ribbons.
- Footer: "Thank you for your business."
Extract and document all visual specs (colors, fonts, padding, borders, layout structure) into spec_report.md and write a complete handoff.md in your working directory.
When finished, send a message back with your findings summary and file paths.
