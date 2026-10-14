# Visual Specification Mining Report: Enterprise Master GST Invoice Redesign

**Author**: Visual Specification Miner (`spec_miner_visual`)  
**Date**: 2026-10-13  
**Target Reference**: `c:\Users\bishn\Documents\GitHub\CredSmart\Correction\New folder\New Invoice.jpeg`  
**Legacy Reference**: `c:\Users\bishn\Documents\GitHub\CredSmart\Correction\New folder\Old Invoice.jpeg`  
**Authority**: `ORIGINAL_REQUEST.md` (Section 2026-10-13T20:00:31Z)

---

## 1. Executive Summary

This specification report details the pixel-level visual, typographic, structural, and behavioral specifications mined from the target reference `New Invoice.jpeg` in contrast with the legacy implementation in `Old Invoice.jpeg` and current codebase components (`UnifiedInvoiceRenderer.tsx`, `downloadExactInvoice.ts`, `LiveInvoicePreview.tsx`).

The target invoice architecture shifts CredSmart from a cluttered, heavily boxed layout with nested borders and redundant badges to an **unboxed, high-end enterprise stationery design**. It preserves complete compliance with the Indian Goods and Services Tax (GST) Act while delivering modern visual clarity and guaranteed single-page A4 print/PDF fidelity.

---

## 2. Design Token System

### 2.1 Color Palette
| Token Name | Hex Code | RGB | Tailwind Equivalent | Usage in New Design |
|---|---|---|---|---|
| **Navy Primary** | `#0c324e` | rgb(12, 50, 78) | Custom (`bg-[#0c324e]`) | Table Header Row background, `TAX INVOICE` document title, primary total font |
| **Accent Cyan / Blue** | `#0284c7` | rgb(2, 132, 199) | `sky-600` / `cyan-600` | Full-width header accent divider line, `ITEM DETAILS` title, ribbon titles (`FROM`, `BILL TO`, `BANK ACCOUNT DETAILS`, `AUTHORISED SIGNATORY`) |
| **Ribbon Light Blue** | `#e8f4fd` | rgb(232, 244, 253) | Custom (`bg-[#e8f4fd]`) | Header ribbons on party pods and bank/signatory cards, rounded background pill for `Invoice total (rounded)` |
| **Canvas Background** | `#ffffff` | rgb(255, 255, 255) | `bg-white` | Page canvas, pod backgrounds, table cells |
| **Border Slate** | `#e2e8f0` | rgb(226, 232, 240) | `border-slate-200` | Pod container outlines, internal pod dividers, table grid borders, bank card outlines |
| **Dark Slate (Primary Text)** | `#0f172a` | rgb(15, 23, 42) | `text-slate-900` | Business name, Buyer name, item names, numerical totals, key labels |
| **Muted Slate (Secondary Text)**| `#475569` | rgb(71, 85, 105) | `text-slate-600` | Addresses, phone, email, metadata labels, summary labels |
| **Subtle Slate (Footer & Subtext)**| `#64748b` | rgb(100, 116, 139) | `text-slate-500` | "Thank you for your business.", signature label, secondary details |
| **Negative / Balance Red** | `#e11d48` | rgb(225, 29, 72) | `text-rose-600` | Balance amount due (if unpaid/credit) |

### 2.2 Typography Scale & Hierarchy
| Level / Component | Font Family | Weight | Size | Line Height | Text Transform | Color |
|---|---|---|---|---|---|---|
| **Document Title (`TAX INVOICE`)** | Sans-serif | Extra-Bold (800) | 22px – 24px | 1.1 | UPPERCASE | `#0c324e` |
| **Metadata Labels (`Invoice No.`)** | Sans-serif | Bold (700) | 10px | 1.2 | Title Case / Cap | `#475569` |
| **Metadata Values (`INV/26-27/134`)** | Sans-serif / Mono | Semi-Bold (600) | 10.5px | 1.2 | None | `#0f172a` |
| **Pod Ribbon Headers (`FROM`, `BILL TO`)**| Sans-serif | Bold (700) | 10.5px | 1.0 | UPPERCASE | `#0284c7` |
| **Entity Names (`ASIA INTERNATIONAL`)** | Sans-serif | Black (800) | 11.5px | 1.2 | UPPERCASE | `#0f172a` |
| **Entity Body / Address / Tax Lines** | Sans-serif | Regular (400) / Semi-Bold | 9.5px | 1.35 | None | `#475569` / `#0f172a` |
| **Section Title (`ITEM DETAILS`)** | Sans-serif | Bold (700) | 10.5px | 1.0 | UPPERCASE | `#0284c7` |
| **Table Header Row** | Sans-serif | Bold (700) | 9.5px – 10px | 1.0 | Title Case / Cap | `#ffffff` |
| **Table Line Item Names** | Sans-serif | Semi-Bold (600) | 9.5px | 1.25 | Sentence / Title | `#0f172a` |
| **Table Numbers (Qty, Rate, Amount)** | Sans-serif / Mono | Medium / Bold | 9.5px | 1.0 | None | `#0f172a` |
| **Financial Summary Labels** | Sans-serif | Regular (400) / Medium | 10px | 1.2 | Sentence Case | `#475569` |
| **Total Highlight Pill Label & Value** | Sans-serif | Bold (700) / Black (800) | 11px / 11.5px | 1.0 | Sentence Case | `#0c324e` |
| **Amount in Words** | Sans-serif | Bold (700) + Medium (500) | 10px | 1.3 | Title / Sentence | `#0f172a` / `#475569` |
| **Footer Note** | Sans-serif | Regular (400) | 9.5px | 1.0 | Sentence Case | `#64748b` |

---

## 3. Structural Layout & Component Specifications

### 3.1 Document Canvas & Geometry
- **Outer Page Dimensions**:
  - Target format: Single-Page A4 portrait.
  - Pixel dimensions (at 96 DPI): `794px` width × `1123px` height.
  - Standard Print dimensions: `210mm` × `297mm`.
- **Canvas Framing**:
  - **No outer border**: Unlike the legacy format which wrapped the entire page in `border border-slate-300 rounded-lg`, the target design uses a borderless, pure white stationery canvas (`bg-white`).
  - **Outer Padding**: Generous whitespace padding of `32px` to `40px` (approx `10mm` to `12mm`) on all four sides (`px-8 pt-8 pb-6`).
  - **Single Page Strict Constraint**: All visual components (header, pods, item table, summary, bottom cards, footer) are budgeted vertically to fit cleanly within `1123px` without overflow or multi-page spill.

---

### 3.2 Header Section
The header contains three primary elements: the unboxed document title, right-aligned stacked metadata, and a full-width cyan horizontal accent divider line.

```
TAX INVOICE                                                  Invoice No.
                                                          INV/26-27/134

                                                           Invoice Date
                                                            12 Oct 2026

                                                               Due Date
                                                            12 Oct 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ (Cyan Accent Divider)
```

1. **Title (Left)**:
   - Text: `TAX INVOICE` (dynamically replaced by `DOC_TITLE_MAP[docType]` for quotations, purchase bills, etc.).
   - Placement: Left-aligned, unboxed, flush with left margin.
   - Styling: Bold/Black sans-serif (`font-extrabold text-[22px] tracking-wide text-[#0c324e]`).
   - Notable Elimination: No enclosing box, no background tint, and no copy badge ("ORIGINAL FOR RECIPIENT") cluttering the header bar.
2. **Metadata Stack (Right)**:
   - Placement: Right-aligned (`text-right`), vertically stacked key-value blocks.
   - Geometry: Occupies right ~30% of header width.
   - Data Rows:
     - **Invoice No.**:
       - Label: `Invoice No.` (`text-[10px] font-bold text-slate-700`)
       - Value: `INV/26-27/134` (`text-[10.5px] font-medium text-slate-900`)
     - **Invoice Date**:
       - Label: `Invoice Date` (`text-[10px] font-bold text-slate-700`)
       - Value: `12 Oct 2026` (`text-[10.5px] font-medium text-slate-900`)
     - **Due Date**:
       - Label: `Due Date` (`text-[10px] font-bold text-slate-700`)
       - Value: `12 Oct 2026` (`text-[10.5px] font-medium text-slate-900`)
   - Spacing: `space-y-1.5` between metadata groups.
3. **Cyan Accent Divider Line**:
   - Placement: Spans the full content width directly beneath the title and metadata block.
   - Thickness: `2px` solid line.
   - Color: `#0284c7` (cyan / royal sky blue).
   - Margin: `mt-3 mb-4`.

---

### 3.3 Dual Party Pods (`FROM` & `BILL TO`)
The seller and buyer details are presented in two equal-width, side-by-side bordered pods with distinct light-blue header ribbons.

```
┌──────────────────────────────────────┬──────────────────────────────────────┐
│ FROM                                 │ BILL TO                              │  <- Ribbon: bg-[#e8f4fd] text-[#0284c7]
├──────────────────────────────────────┼──────────────────────────────────────┤
│ ASIA INTERNATIONAL                   │ SIMPLE SOURCING                      │
│ Shop No. 3, Mohalla Lal Sarai...     │ 9/5 Surya Darshan Building...        │
│ Phone: 9958685892                    │ Contact: 9920041363                  │
│ Email: ashwin@woodzire.business      │                                      │
│ GSTIN: 09CFHPA3376R1ZU               │ GSTIN: 27BEXPG3118P2ZS               │
│ PAN: CFHPA3376R                      │                                      │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ Place of Supply: Maharashtra         │ Customer: Suvrat Sunil Ghatiwala     │  <- Bottom Sub-Compartment
└──────────────────────────────────────┴──────────────────────────────────────┘
```

1. **Container Structure**:
   - Geometry: 2-column grid (`grid grid-cols-2`), equal 50%/50% width.
   - Border: Enclosed in a single unified box with an outer border `border border-slate-200` and a central vertical divider `divide-x divide-slate-200`.
   - Corner Radius: Subtle rounded corners (`rounded-none` or `rounded-sm` for crisp stationery look).
2. **Header Ribbons**:
   - Background: Soft light blue `#e8f4fd` (`bg-[#e8f4fd]`).
   - Padding: `px-3 py-1.5`.
   - Border Bottom: `border-b border-slate-200`.
   - Typography: Bold uppercase `text-[10.5px] font-bold tracking-wider text-[#0284c7]`.
   - Left Label: `FROM`
   - Right Label: `BILL TO`
3. **FROM Pod (Seller) Body**:
   - Padding: `p-3 space-y-1 text-[9.5px]`.
   - Business Name: `ASIA INTERNATIONAL` (uppercase, `font-extrabold text-[11.5px] text-slate-900`).
   - Address: `Shop No. 3, Mohalla Lal Sarai, Nagina, Bijnor, Uttar Pradesh 246762, India` (`text-slate-600 leading-snug`).
   - Phone & Email: `Phone: 9958685892   Email: ashwin@woodzire.business` (`text-slate-700`).
   - Tax Credentials: `GSTIN: 09CFHPA3376R1ZU   PAN: CFHPA3376R` (`font-mono text-slate-800`).
   - Bottom Sub-Compartment:
     - Separator: `border-t border-slate-200`.
     - Padding: `px-3 py-1.5`.
     - Content: `Place of Supply: Maharashtra` (`font-medium text-slate-700`).
4. **BILL TO Pod (Buyer) Body**:
   - Padding: `p-3 space-y-1 text-[9.5px]`.
   - Customer Company Name: `SIMPLE SOURCING` (uppercase, `font-extrabold text-[11.5px] text-slate-900`).
   - Address: `9/5 Surya Darshan Building, Opposite Sheetal Bagh Bus Stop, 44/50 Walkeshwar Road, Mumbai – 400006, Maharashtra, India` (`text-slate-600 leading-snug`).
   - Contact & Tax: `Contact: 9920041363   GSTIN: 27BEXPG3118P2ZS` (`text-slate-700`, GSTIN in `font-mono text-slate-800`).
   - Bottom Sub-Compartment:
     - Separator: `border-t border-slate-200`.
     - Padding: `px-3 py-1.5`.
     - Content: `Customer: Suvrat Sunil Ghatiwala` (`font-medium text-slate-700`).

---

### 3.4 Items Table Section
The items table is introduced by an explicit uppercase section title and features a high-contrast dark navy header row.

```
ITEM DETAILS                                                                    <- Title: text-[#0284c7] font-bold
┌──────┬─────────────────────────────────┬──────────┬───────┬──────────┬──────────┐
│ S.No.│ Description                     │ HSN      │ Qty   │ Rate     │ Amount   │ <- Header: bg-[#0c324e] text-white
├──────┼─────────────────────────────────┼──────────┼───────┼──────────┼──────────┤
│ 1    │ Wooden Crocheting hooks samples │ 44219990 │ 1 Pc  │ ■4,750.00│ ■4,987.50│
└──────┴─────────────────────────────────┴──────────┴───────┴──────────┴──────────┘
```

1. **Section Heading**:
   - Text: `ITEM DETAILS`
   - Styling: Bold uppercase `text-[10.5px] font-bold tracking-wider text-[#0284c7]`.
   - Spacing: `mt-4 mb-1.5`.
2. **Table Header Row**:
   - Background: Solid Dark Navy `#0c324e` (`bg-[#0c324e]`).
   - Text: Pure White `#ffffff` (`text-white font-bold text-[9.5px]`).
   - Height / Padding: `py-2 px-2.5` (~32px height).
   - Column Structure & Proportions:
     | Column Index | Column Header | Alignment | Width % | Data Type | Notes |
     |---|---|---|---|---|---|
     | 1 | `S.No.` | Left / Center | 6% | Numeric index | Sequential 1-based index |
     | 2 | `Description` | Left | 48% | Product / Service name | Primary item description |
     | 3 | `HSN` | Left / Center | 12% | HSN/SAC code | 4 to 8 digit code |
     | 4 | `Qty` | Left / Center | 10% | Quantity + unit | e.g. `1 Pc`, `1 Box (10 Pcs)` |
     | 5 | `Rate` | Right | 12% | Currency rate | Pre-tax taxable rate |
     | 6 | `Amount` | Right | 12% | Currency amount | Total line amount |
   - Cell Separators: Subtle vertical borders between columns (`border-r border-[#1a4a6e]` or crisp cell dividers).
3. **Table Body Rows**:
   - Background: Pure White (`bg-white`).
   - Padding: `py-2 px-2.5`.
   - Borders: Thin horizontal border `border-b border-slate-200` and thin vertical column dividers `border-r border-slate-200`.
   - Typography:
     - `S.No.`: `text-slate-600 font-medium`.
     - `Description`: `text-slate-900 font-semibold text-[9.5px]`. Optional line item description or batch details render below name in `text-[8px] text-slate-500`.
     - `HSN`: `font-mono text-slate-700 text-[9px]`.
     - `Qty`: `text-slate-800 font-medium text-[9px]`. Dual unit rendering uses primary line (`1 Box`) and secondary bracketed conversion `(1*10 Pcs)`.
     - `Rate`: `font-mono text-slate-800 text-right text-[9.5px]`. Format: `₹4,750.00`.
     - `Amount`: `font-mono text-slate-900 font-bold text-right text-[9.5px]`. Format: `₹4,987.50`.

---

### 3.5 Financial Summary Breakdown
The totals calculation is formatted as a compact, right-aligned summary block directly below the items table, featuring a signature rounded total highlight pill.

```
                                                 Taxable value / Rate       ■4,750.00
                                                 GST (5%)                     ■237.50
                                               ╭──────────────────────────────────────╮
                                               │ Invoice total (rounded)    ■4,988.00 │ <- Pill: bg-[#e8f4fd] rounded
                                               ╰──────────────────────────────────────╯
                                                 Amount received (Cash)     ■4,988.00
```

1. **Placement & Geometry**:
   - Alignment: Flush right (`ml-auto flex flex-col items-end`).
   - Width: ~40% to 45% of the total table width (`w-[320px]`).
   - Spacing: `mt-2.5 space-y-1`.
2. **Breakdown Rows**:
   - **Taxable Value / Rate**:
     - Key: `Taxable value / Rate` (`text-[9.5px] text-slate-600`)
     - Value: `₹4,750.00` (`text-[9.5px] font-mono text-slate-900`)
   - **GST Tax Line**:
     - Key: `GST (5%)` (`text-[9.5px] text-slate-600`). In intrastate contexts, can display combined `GST (5%)` or `CGST (2.5%)` + `SGST (2.5%)`; in interstate contexts, `IGST (5%)`.
     - Value: `₹237.50` (`text-[9.5px] font-mono text-slate-900`)
   - **Invoice Total Highlight Pill**:
     - Container: Rounded rectangle / pill with soft light-blue fill `bg-[#e8f4fd]`, `rounded-md px-3 py-1.5 w-full flex justify-between items-center`.
     - Key: `Invoice total (rounded)` (`text-[10.5px] font-bold text-[#0c324e]`).
     - Value: `₹4,988.00` (`text-[11.5px] font-extrabold text-[#0c324e] font-mono`).
   - **Amount Received**:
     - Key: `Amount received (Cash)` (`text-[9.5px] text-slate-600`). Mode dynamically reflects payment method (`Cash`, `UPI`, `Bank Transfer`, etc.).
     - Value: `₹4,988.00` (`text-[9.5px] font-mono font-bold text-slate-900`).
   - **Balance Amount (Conditional)**:
     - When `balanceDue > 0`: renders row `Balance amount` (`text-[9.5px] font-bold text-rose-600`).
     - When `balanceDue === 0`: omitted or displays `₹0.00`.

---

### 3.6 Amount in Words
- **Placement**: Directly below the summary block, left-aligned across the page.
- **Styling**:
  - **Completely unboxed**: Unlike the legacy format which rendered a full-width boxed banner (`INVOICE AMOUNT (IN WORDS): INR Rupees...`), the target design uses a clean typographic line without any background tint or border.
  - Spacing: `my-3`.
  - Prefix Label: `Amount in words:` (`font-bold text-[10px] text-slate-900 mr-2`).
  - Text Value: `INR Four Thousand Nine Hundred Eighty-Eight Only` (`font-medium text-[9.5px] text-slate-700`).

---

### 3.7 Bottom Dual Cards (`BANK ACCOUNT DETAILS` & `AUTHORISED SIGNATORY`)
Two equal-width, side-by-side bordered cards positioned directly below the Amount in Words line.

```
┌──────────────────────────────────────┬──────────────────────────────────────┐
│ BANK ACCOUNT DETAILS                 │ AUTHORISED SIGNATORY                 │  <- Ribbon: bg-[#e8f4fd] text-[#0284c7]
├──────────────────────────────────────┼──────────────────────────────────────┤
│ Bank: Federal Bank                   │                                      │
│ A/C No.: 77770100867585              │              [ Signature ]           │
│ IFSC: FDRL0007777                    │         ────────────────────         │
│ Account Holder: Ashwin Bishnoi       │                    Signature         │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

1. **Container Geometry**:
   - 2-column grid (`grid grid-cols-2`), equal 50%/50% width.
   - Outer border `border border-slate-200` with central vertical divider `divide-x divide-slate-200`.
   - Uniform height for visual balance.
2. **Left Card: BANK ACCOUNT DETAILS**:
   - Header Ribbon: Soft light-blue background `#e8f4fd` (`bg-[#e8f4fd] px-3 py-1.5 border-b border-slate-200`).
   - Header Text: `BANK ACCOUNT DETAILS` (`font-bold text-[10px] tracking-wider text-[#0284c7]`).
   - Card Body (padding `p-3 space-y-0.5 text-[9.5px]`):
     - `Bank: Federal Bank` (`text-slate-700`)
     - `A/C No.: 77770100867585` (`text-slate-900 font-mono font-medium`)
     - `IFSC: FDRL0007777` (`text-slate-900 font-mono font-medium`)
     - `Account Holder: Ashwin Bishnoi` (`text-slate-700`)
3. **Right Card: AUTHORISED SIGNATORY**:
   - Header Ribbon: Soft light-blue background `#e8f4fd` (`bg-[#e8f4fd] px-3 py-1.5 border-b border-slate-200`).
   - Header Text: `AUTHORISED SIGNATORY` (`font-bold text-[10px] tracking-wider text-[#0284c7]`).
   - Card Body (padding `p-3 flex flex-col justify-end items-center min-h-[75px]`):
     - Signature Graphic: Render digitized signature image (or blank signing area for physical stamp/sign).
     - Signature Line: Horizontal divider line `border-b border-slate-300 w-36 mb-1`.
     - Label: `Signature` (`text-[9px] text-slate-500 font-medium text-right w-36` or centered).

---

### 3.8 Minimalist Footer Note
- **Text**: `Thank you for your business.`
- **Placement**: Bottom of document, left-aligned (or centered), generous top margin (`mt-6`).
- **Styling**: `text-[9.5px] text-slate-500 font-normal`.
- **Eliminated Legacy Elements**:
  - Removed bulky Terms & Conditions boilerplate box.
  - Removed CredSmart POS & Billing powered-by footer logo and links.
  - Removed legal compliance text (`IT Act 2000 Ready • 100% Tax Compliant`).
  - Removed browser print URL and timestamp artifacts (`https://www.credsmart.online/...`).

---

## 4. Comprehensive Comparison Matrix: Legacy vs Target Design

| Dimension | Legacy Implementation (`Old Invoice.jpeg`) | Target Master Specification (`New Invoice.jpeg`) |
|---|---|---|
| **Outer Canvas** | Outer border box with rounded corners and shadow (`border border-slate-300 rounded-lg shadow-md`) | Borderless, pure white stationery canvas (`bg-white`) with clean margins |
| **Document Title** | Boxed bar with light-blue background (`bg-[#f0f9ff]`), title `TAX INVOICE` + copy badge `ORIGINAL FOR RECIPIENT` + `Woodzire • GST Registered` | Bold unboxed `TAX INVOICE` in dark navy `#0c324e` on top-left, flush with margin |
| **Document Metadata** | In a 5-column grey box on top-right with row borders (`INVOICE NO:`, `INVOICE DATE:`, `DUE DATE:`, `PLACE OF SUPPLY:`) | Right-aligned stacked key-value blocks (`Invoice No.`, `Invoice Date`, `Due Date`) without enclosing box |
| **Header Accent Line** | None (uses grey box outlines) | Full-width solid cyan accent line (`#0284c7`, 2px thick) across entire document width |
| **Seller & Buyer Details** | Seller in top 7-col box with logo; Buyer in a separate full-width `BILL TO:` box below | Equal-width side-by-side pods (`FROM` & `BILL TO`) with soft blue ribbons (`#e8f4fd`) |
| **Place of Supply / Customer Meta** | `PLACE OF SUPPLY: State Code 27` in header metadata box | Dedicated bottom row inside the FROM pod (`Place of Supply: Maharashtra`) aligned with `Customer: [Name]` in BILL TO pod |
| **Items Section Heading** | None | Uppercase `ITEM DETAILS` section title above table in cyan accent (`#0284c7`) |
| **Table Header Row** | Light-blue / grey background (`bg-[#f0f9ff]` / `bg-slate-100`) with dark text | Solid dark navy background (`bg-[#0c324e]`) with crisp pure white text (`text-white`) |
| **Table Columns** | `S.NO`, `ITEMS`, `HSN`, `QTY`, `RATE`, `AMOUNT` | `S.No.`, `Description`, `HSN`, `Qty`, `Rate`, `Amount` |
| **Table Formatting** | `1Pcs`, `₹4750.00` | `1 Pc`, `₹4,750.00` with standard comma notation |
| **HSN/SAC Breakdown Table** | Separate large 8-column table below items table | Replaced by clean right-aligned totals breakdown in standard view |
| **Total Highlight** | Full-width grey row `TOTAL AMOUNT` across table | Distinct right-aligned highlight pill with soft blue rounded background (`#e8f4fd`) |
| **Received Amount** | Full-width table row `RECEIVED AMOUNT (Cash): ₹4988.00` | Right-aligned key-value row `Amount received (Cash): ₹4,988.00` |
| **Amount in Words** | Boxed grey bar with border (`INVOICE AMOUNT (IN WORDS): INR Rupees ...`) | Clean unboxed typography line (`Amount in words: INR Four Thousand Nine Hundred Eighty-Eight Only`) |
| **Bottom Cards** | 3-compartment box: Terms & Conditions, Bank Details, QR + Signatory | 2 equal-width side-by-side bordered cards with light-blue ribbons: `BANK ACCOUNT DETAILS` & `AUTHORISED SIGNATORY` |
| **Footer** | `Powered by CredSmart POS & Billing` + `IT Act 2000 Ready` + URL | Minimalist note: `Thank you for your business.` |

---

## 5. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| 1 | Header | Unboxed TAX INVOICE Title | Large prominent title on left without enclosing box | `docType` string | Uppercase title text (`TAX INVOICE`, `PURCHASE INVOICE`, `ESTIMATE / QUOTATION`) | Fallback to "TAX INVOICE" if `docType` unrecognized | `New Invoice.jpeg` & `UnifiedInvoiceRenderer.tsx:131` |
| 2 | Header | Stacked Right-Aligned Metadata | Vertical key-value blocks for Invoice No., Invoice Date, Due Date | `invoiceNumber`, `date`, `dueDate` | Cleanly formatted text blocks aligned to right | Missing date falls back to current date; missing due date omitted | `New Invoice.jpeg` |
| 3 | Header | Full-Width Cyan Accent Line | 2px solid cyan horizontal divider separating header from party pods | Layout width | `#0284c7` divider rule spanning 100% | Never errors; CSS border-bottom | `New Invoice.jpeg` |
| 4 | Parties | Dual Equal-Width Pods | Side-by-side bordered cards for Seller (`FROM`) and Buyer (`BILL TO`) | `storeInfo`, `partyInfo` | 2-column grid (`grid grid-cols-2`) with equal 50% width | Graceful fallback placeholders ("CredSmart Store", "Walk-in Customer") | `New Invoice.jpeg` |
| 5 | Parties | Soft Blue Header Ribbons | Pastel blue banner on party pods with cyan text | Pod category labels | Background `#e8f4fd`, text `#0284c7` bold | Static CSS styling | `New Invoice.jpeg` |
| 6 | Parties | Place of Supply & Customer Sub-Rows | Horizontally aligned bottom sub-compartments in pods | `placeOfSupply`, customer name | Left shows `Place of Supply: [State]`, right shows `Customer: [Name]` | State code fallback if state name absent | `New Invoice.jpeg` |
| 7 | Items Table | `ITEM DETAILS` Section Title | Uppercase category heading preceding line items table | None | Cyan bold text `ITEM DETAILS` | Always visible | `New Invoice.jpeg` |
| 8 | Items Table | Solid Dark Navy Header Row | Table header row with solid `#0c324e` background and white text | Column labels | High-contrast header with `S.No.`, `Description`, `HSN`, `Qty`, `Rate`, `Amount` | Column widths fixed via percentage | `New Invoice.jpeg` |
| 9 | Items Table | Dual Unit Quantity Display | Quantity column with primary line and alternate bracketed unit | `InvoiceItemData` (`qty`, `unit`, `altQty`, `altUnit`, `altUnitConversion`) | e.g. `1 Box` + `(1*10 Pcs)` | Fallback to single unit if no altUnit | `unitConversionBill.test.ts` & `UnifiedInvoiceRenderer.tsx:148` |
| 10 | Items Table | Line Item Spacing & Borders | Clean cell padding with subtle horizontal and vertical dividers | Item array | Clean table grid enclosed in `border border-slate-200` | Empty items array renders empty table structure | `New Invoice.jpeg` |
| 11 | Summary | Right-Aligned Totals Breakdown | Key-value summary block for Taxable Value, GST, Total, Received | `totals` object | Right-aligned block displaying calculated subtotals | Fallback to 0 if totals undefined | `New Invoice.jpeg` |
| 12 | Summary | Rounded Total Highlight Pill | Signature soft blue pill highlighting the grand total | `grandTotal` | Rounded badge `bg-[#e8f4fd]` with `Invoice total (rounded)` and total value | Formats negative or zero values safely | `New Invoice.jpeg` |
| 13 | Summary | Payment Method Tracking | Received amount row with payment mode tag | `paymentMethod`, `paidAmount` | e.g. `Amount received (Cash): ₹4,988.00` | Fallback to "Cash" if unspecified | `New Invoice.jpeg` |
| 14 | Amount Words | Clean Unboxed Line | Single-line spelled out amount without background box or border | `grandTotal` | `Amount in words: INR Four Thousand Nine Hundred Eighty-Eight Only` | Fallback to "Zero" for 0 | `New Invoice.jpeg` & `numberToWords.ts` |
| 15 | Bottom Pods | Side-by-Side Bank & Signatory Cards | Dual equal-width cards with soft blue ribbons for Bank & Signature | `bankDetails`, `signatureDataUrl` | Left: bank details; Right: signature line & title | Fallback to store bank if custom bank omitted; blank signing line if signature image omitted | `New Invoice.jpeg` |
| 16 | Bottom Pods | Bank Details Key-Value List | Formatted Bank Name, Account No, IFSC, Account Holder | Bank details fields | Multi-line clean key-value text in font-mono | Omitted or placeholder if no bank exists | `New Invoice.jpeg` |
| 17 | Bottom Pods | Authorised Signatory Pod | Digitized signature image with clean horizontal signing line | `signatureDataUrl`, `signatoryTitle` | Centered / right signature graphic + line + label | Fallback to empty signing line | `New Invoice.jpeg` |
| 18 | Footer | Minimalist Thank You Note | Clean closing note replacing legacy compliance boilerplate | None | `Thank you for your business.` in muted slate | Static text | `New Invoice.jpeg` |
| 19 | Engine | Single-Page A4 PDF Pipeline | Off-screen capture via html2canvas and jsPDF with exact aspect ratio | HTML node, canvas width 794px | Vector-crisp PDF saved to client disk | Auto-scales down if height exceeds 297mm to prevent page break | `downloadExactInvoice.ts:186` |
| 20 | Documents | Multi-Doc Type Support | Seamless rendering across sales, purchases, POS, quotes, notes | `docType` prop | Dynamic titles and party role inversion (Supplier vs Customer) | Validated against `UniversalDocType` | `UnifiedInvoiceRenderer.tsx:8` |

---

## 6. Edge Cases & Boundary Conditions

| # | Feature | Input / Condition | Observed / Required Behavior |
|---|---|---|---|
| 1 | Party Pods | Extra-long Business or Party Name (e.g. 50+ chars) | Name wraps cleanly within pod without overflowing into neighboring pod; line-height stays tight (`leading-tight`) |
| 2 | Party Pods | Multi-line Address (e.g. 4+ address lines) | Pod body expands vertically; both `FROM` and `BILL TO` pods maintain equal height through `flex flex-col justify-between` or matching grid row |
| 3 | Party Pods | Unregistered Party (No GSTIN / B2C Walk-in) | `GSTIN: -` or line omitted; `Place of Supply` remains visible to ensure GST tax classification |
| 4 | Tax Summary | Intrastate vs Interstate Tax Handling | Intrastate displays `GST (5%)` or `CGST (2.5%) + SGST (2.5%)`; Interstate displays `IGST (5%)` |
| 5 | Tax Summary | Multi-Tax Slabs (e.g. 5%, 12%, 18% in same invoice) | Summary displays itemized GST rows per rate or total GST combined, matching the right-aligned breakdown rhythm |
| 6 | Financial Totals | Partial Payment or Credit Invoice | `Amount received (Cash): ₹0.00`; Displays additional row `Balance amount due: ₹4,988.00` in red text (`text-rose-600`) |
| 7 | Line Items | High Line-Item Count (e.g. 8 to 12 items) | Vertical spacing budgeted compactly (`py-1.5` to `py-2`) to keep total invoice height under `1123px`, preventing multi-page PDF spill |
| 8 | Line Items | Dual Units & Alternate Units | Formats `primaryLine` (e.g. `1 Box`) and `secondaryLine` in brackets `(1*10 Pcs)` without expanding row height excessively |
| 9 | Discounts & Delivery | Invoice with Discount Total or Delivery Charges | Dedicated rows appear cleanly in summary breakdown: `Delivery Charge: ₹...`, `Discount: -₹...` |
| 10 | Bank & Signatory | Store has no Bank Account configured | Displays graceful placeholder: "Direct bank payment available on request." |
| 11 | Bank & Signatory | No digital signature image uploaded | Renders standard signature line with title `Signature` or `Authorised Signatory` for manual stamping/signing |
| 12 | PDF Generation | Mobile browser / high-DPI retina display | Off-screen capture explicitly fixes viewport width to `794px` and scale to `2x`, producing crisp 300 DPI vector-like PDF output without responsive warping |
