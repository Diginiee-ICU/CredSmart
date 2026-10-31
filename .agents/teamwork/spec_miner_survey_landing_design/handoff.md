# SPECIFICATION MINING REPORT: CREDSMART DESKTOP PUBLIC PAGES & DUAL-SUITE DESIGN STANDARD

**Document Version:** 1.0.0-PROD  
**Author:** Survey Spec Miner 2 (`teamwork_spec_miner`)  
**Assigned Working Directory:** `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\spec_miner_survey_landing_design`  
**Target Codebase:** `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart`  
**Date:** 2026-10-31  

---

## Executive Summary

This specification mining report probes the authoritative design and architecture standards of CredSmart across:
1. `.agents/rules/minimal-design-system.md`
2. `.agents/skills/credsmart-landing-design/SKILL.md`
3. `.agents/skills/credsmart-minimal-design-system/SKILL.md`
4. `CRM_INTEGRATION_PLAN.md` & `src/components/portal/ColdLaunchHub.tsx`
5. `tailwind.config.ts`, `src/index.css`, `src/components/ui/button.tsx`, and existing public desktop pages (`Landing.tsx`, `PublicHeader.tsx`, `PublicFooter.tsx`, `Features.tsx`, `Pricing.tsx`, etc.).

The investigation revealed that CredSmart is fundamentally a **Dual-Suite Platform** comprising:
- **Suite 1: POS & Billing ERP (`/billing/*`)** backed by the Ubuntu Cloud API (`https://api.credsmart.online`)
- **Suite 2: Workforce CRM (`/crm/*`)** backed by Supabase Cloud (`https://wqllixoghlxvapmziilk.supabase.co`)

While `ColdLaunchHub.tsx` models this dual-suite architecture for mobile and standalone cold launches, the existing desktop web marketing pages (`Landing.tsx`, `Features.tsx`, `PublicFooter.tsx`) currently suffer from:
1. **Severe Desktop Viewport Containment Violations**: `Landing.tsx` is an unconstrained 1,395-line vertical scroll (~5,000px high) with 9 stacked sections requiring endless mouse scrolling.
2. **Blatant Button Bloat**: Proliferation of inline buttons with prohibited dimensions (`h-12 sm:h-13 px-8 rounded-xl`, `shadow-xl`, `shadow-2xl`) directly violating Rule 1 of `minimal-design-system.md`.
3. **Broken Navigation Anchors & Missing Suite 2 Coverage**: `PublicHeader.tsx` links to `#suites`, but no `#suites` ID exists in `Landing.tsx`. Workforce CRM is completely absent from `Landing.tsx`'s module showcases, absent from `PublicFooter.tsx`, and orphaned in handler functions (`handleLaunchCrm`).

---

## 1. Observation

### 1.1 Direct Codebase & Rule Inspections

#### A. Master Design System Rules (`minimal-design-system.md`)
- **Rule 1 (Proportions & Button Sizing)**:
  > "Never use oversized buttons (e.g. avoid `h-11`, `h-12`, `px-8`, `rounded-3xl` bubble buttons). Standardize on:
  > - Standard Action Button: `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs` (34px height)
  > - Small / Table Action Button: `h-7 px-2.5 rounded-md text-[11px] font-medium` (28px height)
  > - Micro / Inline Icon Button: `w-7.5 h-7.5 rounded-md` (30x30px)
  > - Mobile Center Elevated CTA: `46x46px rounded-xl` (ergonomic thumb target, not oversized)
  > - Tactile & Responsive: `active:scale-[0.98] transition-colors duration-150`."
- **Rule 2 (Screen-Fitted Viewports)**:
  > "Desktop Viewport Containment: Layouts must fit within standard monitor heights (768px - 1080px) without requiring long, tedious vertical scrolling.
  > Top header and action bars are sticky/fixed... Data Tables: Table headers are sticky; rows scroll within a bounded container (`flex-1 min-h-0 overflow-y-auto`)."
- **Rule 3 (Breathing Room & De-Cluttering)**:
  > "Eliminate Micro-Prose: Strip redundant explanatory text from cards... Crisp Hairline Surfaces: Rely exclusively on 1px borders (`border-slate-200/80` light, `border-slate-800` dark) and subtle micro-shadows (`shadow-xs`). Prohibit heavy 3D glass reflections, skeuomorphic bevels, liquid glass, and glowing neon halos."
- **Rule 4 (Typography & Readability Scale)**:
  > "Primary Sans: 'Inter'... Tabular Monospace: 'IBM Plex Mono' with `font-mono tabular-nums` strictly for currency amounts (₹), quantities, invoice numbers, dates, and barcodes. Strict Size Hierarchy (No Sub-11px Micro-Fonts)."
- **Rule 5 (Colors & Accessible Contrast)**:
  > "Light Mode: Background `#F8FAFC`, Cards `#FFFFFF`, Borders `#E2E8F0` (`border-slate-200/80`). Dark Mode: Background `#090D16`, Cards `#111726`, Borders `#1E293B` (`border-slate-800`). Accent: Royal/Electric Blue `#2563EB`. Semantic: Emerald `#10B981`, Rose `#E11D48`, Amber `#F59E0B`."

#### B. Button Primitive Implementation (`src/components/ui/button.tsx`)
`src/components/ui/button.tsx` lines 33-47 directly implement the master tokens:
```tsx
size: {
  // 34px Standard Action Button
  default: "h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs",
  // 28px Small / Table Action Button
  sm: "h-7 px-2.5 rounded-md text-[11px] font-medium",
  table: "h-7 px-2.5 rounded-md text-[11px] font-medium",
  // 30px Micro / Inline Icon Button
  icon: "w-7.5 h-7.5 rounded-md p-0 flex items-center justify-center",
  "icon-sm": "w-7 h-7 rounded-md p-0 flex items-center justify-center",
  // 46px Mobile Center Elevated CTA
  cta: "w-[46px] h-[46px] rounded-xl font-bold shadow-sm p-0 flex items-center justify-center",
  // Proportional standard overrides (replaces bloated 44px bubbles)
  lg: "h-9.5 px-4 rounded-lg text-sm font-semibold shadow-2xs",
  pill: "h-8.5 px-3.5 rounded-full text-xs font-semibold shadow-2xs",
  "pill-lg": "h-9.5 px-4 rounded-full text-sm font-semibold shadow-2xs",
}
```

#### C. Violations in Existing Public Marketing Pages
1. **`src/pages/Landing.tsx`**:
   - Line 394: `className="w-full sm:w-auto h-12 sm:h-13 px-7 sm:px-8 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 shadow-xl shadow-blue-700/25"` (Bloated 48px-52px button)
   - Line 403: `className="w-full sm:w-auto h-12 sm:h-13 px-6 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700"` (Bloated button)
   - Line 790: `className="h-11 px-6 rounded-xl bg-[#FF6A00] hover:bg-[#E65F00] text-white font-bold"`
   - Line 918: `className="w-full sm:w-auto h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md"`
   - Line 977: `className="w-full sm:w-auto h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md"`
   - Line 1228: `className="w-full sm:w-auto h-13 px-8 rounded-xl bg-white hover:bg-slate-50 text-blue-800 font-black text-sm sm:text-base shadow-2xl"`
   - Total lines: 1,395 lines in a single file with 9 sequential unconstrained sections.
   - Missing `#suites` anchor: Line 41-42 in `PublicHeader.tsx` defines `{ label: "POS Billing", href: "/#suites" }` and `{ label: "Workforce CRM", href: "/#suites" }`, but `Landing.tsx` contains zero elements with `id="suites"`.
   - Missing Suite 2 Showcase: Lines 169-171 define `activeModuleTab: "pos" | "crm" | "gst" | ...`, but lines 214-293 (`moduleShowcases`) omit `crm` completely.
   - Orphaned Handlers: Lines 177-189 define `handleLaunchPos` and `handleLaunchCrm`, but neither is invoked anywhere in the JSX.

2. **`src/pages/public/Features.tsx`**:
   - Line 236: `<button className="h-12 px-8 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF8533]... shadow-xl shadow-orange-500/20">`
   - Line 243: `className="h-12 px-6 rounded-xl border-slate-300 bg-white text-slate-700..."`
   - Content omits Workforce CRM features entirely (only lists POS Billing, GST, Barcode, Godowns, Khata, GSTR-1, Themes, Multi-Store, Discovery, Intelligence, Analytics, Cloud Sync).

3. **`src/pages/public/Pricing.tsx`**:
   - Line 151: `<button className="w-full h-12 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF8533]... shadow-xl shadow-orange-500/20">`
   - Only lists POS & Billing capabilities under the master ₹0 plan; Workforce CRM modules (GPS Attendance, Task Kanban, Payroll Engine, Staff Provisioner) are not highlighted.

4. **`src/components/public/PublicConversionBanner.tsx`**:
   - Line 68: `className="w-full sm:w-auto h-13 px-8 rounded-xl bg-white hover:bg-slate-50 text-blue-800 font-black text-sm sm:text-base shadow-2xl"`

5. **`src/components/public/PublicFooter.tsx`**:
   - Column 1 only has "Product & POS" listing POS Retail Billing, GST Invoicing & Taxes, Inventory & Godowns, Customer Ledgers & Udhar, Business Ecosystem, CredAlert Intelligence, and App Downloads. Workforce CRM is absent from the footer.

#### D. Reference Implementation of Dual-Suite Platform (`ColdLaunchHub.tsx`)
`src/components/portal/ColdLaunchHub.tsx` lines 147-300 implement the exact dual-suite split:
- **Suite 1: POS & Billing ERP**:
  - Badge: `⚡ RETAIL POS & BILLING` | Host: `api.credsmart.online`
  - Chips: `1-Tap Checkout`, `Thermal ESC/POS`, `B2B Auto-Inward`, `Realtime Stock`, `Udhar Khata`
  - Button: `h-8.5 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs`
- **Suite 2: CredSmart CRM by CredAlert (Workforce & HR)**:
  - Badge: `👥 WORKFORCE & HR` | Host: `Supabase Cloud`
  - Chips: `GPS Geofencing`, `Bilingual Voice AI`, `Task Proof Review`, `Monthly Payroll`, `Staff Roles`
  - Button: `h-8.5 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs`

---

## 2. Logic Chain

1. **Premise 1**: The user's authoritative request (`ORIGINAL_REQUEST.md`) requires:
   - R1: Production-ready desktop public and landing pages presenting the dual-suite platform (POS & Billing ERP + Workforce CRM).
   - R2: Strict adherence to `.agents/rules/minimal-design-system.md` (compact buttons, screen-fitted viewport containment without long tedious vertical scrolling, balanced whitespace, Inter + tabular monospace font hierarchy, neutral surface canvas).
2. **Premise 2**: Existing public desktop pages severely deviate from R2:
   - Buttons are bloated (`h-12`, `h-13`, `px-8`, heavy shadows) instead of standard `h-8.5 px-3 rounded-lg text-xs` or `h-9.5 px-4.5 rounded-lg text-sm`.
   - `Landing.tsx` forces unconstrained vertical scrolling over 1,395 lines rather than using bounded interactive panes and viewport containment.
   - Suite 2 (Workforce CRM) is missing from the marketing presentation, despite being an equal pillar in the product architecture.
   - Anchor links (`/#suites`) fail to resolve because no matching element exists in the DOM.
3. **Deduction 1 (Design Token Standard)**: All public page redesigns must enforce:
   - Standard action buttons: `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs`
   - Hero / Elevated buttons: `h-9.5 px-4.5 rounded-lg text-sm font-semibold shadow-xs`
   - Table / secondary buttons: `h-7 px-2.5 rounded-md text-[11px] font-medium`
   - Micro icon buttons: `w-7.5 h-7.5 rounded-md`
   - Complete ban on `h-11`, `h-12`, `h-13`, `px-8`, and glowing neon shadows.
4. **Deduction 2 (Viewport Containment Architecture)**: Rather than an infinite vertical stack, the desktop landing page layout must fit within standard monitor heights (768px - 1080px) using:
   - A sticky 52px command header with working smooth anchors (`#suites`, `#ecosystem`, `#intelligence`, `#download`, `#faq`).
   - A compact, screen-fitted Hero section with an interactive dual-suite preview dock.
   - A dedicated `#suites` Dual-Suite Showcase section featuring side-by-side or tabbed interactive cards for POS & Billing ERP vs Workforce CRM.
   - A bounded interactive Module Explorer (`max-h-[520px]`) containing tabs for both POS and CRM modules with zero vertical overflow.
   - Compact, high-density comparison tables and FAQ accordions with bounded scrolling containers.
5. **Deduction 3 (Dual-Suite Articulation)**: Both product suites must be explicitly represented:
   - Navigation: `PublicHeader.tsx` and `PublicFooter.tsx` must articulate both POS Billing ERP and Workforce CRM with valid routes and anchors.
   - Features: `Features.tsx` and `Landing.tsx` must showcase both Suite 1 modules (Retail POS, GST Invoicing, Barcode Studio, Inventory, Khata, GSTR-1, Thermal Print) and Suite 2 modules (GPS Attendance, Task Delegation & Kanban, Staff RBAC, Monthly Payroll Engine, Team Comms, Bilingual Voice Copilot).
   - Direct Workspace Launchers: Desktop pages must provide 1-click launch routing to both `/billing/dashboard` and `/crm`.

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Navigation | Unified Public Header (`PublicHeader.tsx`) | 52px sticky command bar with brand logo, suite links, download modal trigger, and auth CTAs | Route location, user session, auth state | Rendered desktop nav bar + mobile hamburger drawer | Fallback to landing if unauthenticated | `PublicHeader.tsx`, `minimal-design-system.md` |
| 2 | Navigation | Direct Suite Anchor `#suites` | Smooth-scroll anchor pointing to dual-suite platform overview | Click on header "POS Billing" or "Workforce CRM" | Smooth scroll to `#suites` container | Missing in current DOM (CRITICAL FIX REQUIRED) | `PublicHeader.tsx:41-42` |
| 3 | Hero | Screen-Fitted Dual Hero Section | Compact hero viewport with value proposition, dual CTAs, trust badges, and interactive dashboard preview | User mouse hover / click | Live interactive preview of retail KPIs or CRM workforce stats | Clamped viewport without vertical bloat | `Landing.tsx`, `credsmart-landing-design` |
| 4 | Dual-Suite | Interactive Suite Switcher | Segment control `[ ⚡ POS & Billing ERP \| 👥 Workforce CRM ]` toggling preview cards and feature showcases | User click on suite tab | Instantaneous UI switch between POS counter and CRM attendance | Safe state toggle (default: POS) | `ColdLaunchHub.tsx`, `CRM_INTEGRATION_PLAN.md` |
| 5 | Suite 1: POS | High-Speed Retail POS Billing Terminal | Counter billing workbench with held bills (max 5), barcode scanner (<50ms), keyboard shortcuts (F1-F12), split payments | Barcode scan, SKU input, cash tender, hotkeys | Instant thermal receipt generation, stock deduction | Warning on unallocated items or negative stock | `Features.tsx:44-55`, `POSBilling.tsx` |
| 6 | Suite 1: POS | Multi-Rate GST Tax Engine | Compliant GST tax invoice generation with CGST, SGST, IGST breakdown, HSN/SAC resolution, dynamic UPI QR | Party state, item HSN, tax rate (0-28%) | Formatted GST invoice + UPI QR code | Flag invalid GSTIN format | `Features.tsx:57-68`, `GstBillingGuide.tsx` |
| 7 | Suite 1: POS | Barcode & Label Designer Studio | Custom thermal roll sticker (50x38, 38x25mm) and A4 label sheet (24/40/65) generator | Catalog SKU, item name, price, barcode format | Print-ready SVG / canvas barcode layout | Alert on unreadable barcode strings | `BarcodeGuide.tsx`, `Features.tsx:70-81` |
| 8 | Suite 1: POS | Multi-Godown Warehouse Control | Real-time stock tracking across multiple retail godowns, batch tracking, expiry dates, low-stock reorder alerts | Godown ID, batch, inward/outward quantity | Real-time inventory ledger and stock valuation (FIFO/Avg) | Low-stock notification trigger | `Features.tsx:83-94`, `Inventory.tsx` |
| 9 | Suite 1: POS | Customer & Vendor Udhar Khata | Digital ledger balance statements, 1-click WhatsApp payment reminders with PDF bill attachment | Party transactions, partial payments | Bilateral running credit statement | Warning on exceeding credit limit | `Features.tsx:96-107`, `CustomerLedger.tsx` |
| 10 | Suite 1: POS | CA-Ready GSTR-1 Tax Exports | 1-click export of official GSTR-1 JSON Schema 2.0 and multi-sheet Excel for direct GSTN upload | Selected tax period (month/quarter) | Valid JSON Schema 2.0 file + CA Excel workbook | Validation check against GSTN rules | `Features.tsx:109-120`, `Reports.tsx` |
| 11 | Suite 1: POS | Offline Billing & ESC/POS Thermal Printing | USB/Bluetooth/LAN thermal printer output (58mm/80mm) with local SQLite queue synchronization | Print command, offline invoice creation | Direct ESC/POS byte stream, background cloud sync | Automatic queue retry on reconnect | `Landing.tsx:948-963`, `ColdLaunchHub.tsx` |
| 12 | Suite 2: CRM | Geofenced GPS Clock-In & Shifts | Workforce attendance tracking via mobile GPS perimeter lock, shift scheduling, late and overtime tracking | Staff GPS coordinates, timestamp, camera selfie | Real-time presence log in Supabase Cloud | Rejection if outside store geofence radius | `ColdLaunchHub.tsx:271-274`, `CRM_INTEGRATION_PLAN.md` |
| 13 | Suite 2: CRM | Task Delegation & Kanban Management | Staff task assignment with priority tags, deadlines, photo proof-of-work submission, manager sign-off | Task title, assignee, deadline, proof attachment | Interactive Kanban board with status columns | Overdue task visual flag | `CRM_INTEGRATION_PLAN.md:41`, `ColdLaunchHub.tsx:280` |
| 14 | Suite 2: CRM | Granular Staff Roles & RBAC | Role provisioner for Owner, Store Manager, Cashier, Stock Manager, Salesman, Delivery Boy | Staff credentials, assigned role permissions | Scoped view ensuring cashiers cannot view purchase costs | Access denied redirection | `src/config/routes.ts:125-135`, `ColdLaunchHub.tsx:284` |
| 15 | Suite 2: CRM | Automated Monthly Payroll & Salary Engine | Salary slip calculation combining base rate, attendance, overtime multiplier, deductions, and salary advances | Month, employee ID, attendance records | Detailed payslip statement with net payout | Alert on unresolved attendance discrepancies | `ColdLaunchHub.tsx:288`, `CRM_INTEGRATION_PLAN.md:19` |
| 16 | Suite 2: CRM | Bilingual AI Voice Copilot & Notes | Voice-driven task creation and operational note logging supporting Hindi and English speech | Microphone audio stream, language toggle | Transcribed text note or structured task object | Fallback to manual text input | `CRM_INTEGRATION_PLAN.md:19`, `ColdLaunchHub.tsx:276` |
| 17 | Suite 2: CRM | Team Hub & Unified Announcements | Store-wide noticeboard, emergency broadcast bulletins, operational handover checklists | Announcement text, urgency level | Instant push alert to all staff mobile devices | Notification failure fallback | `CRM_INTEGRATION_PLAN.md:97-98` |
| 18 | Ecosystem | CredSmart Connected Business Network | Bilateral invoice exchange: sales invoice from Business A automatically creates purchase invoice for Business B | B2B invoice generation with registered GSTIN | Auto-inward purchase invoice with 0 data re-entry | Requires receiver authorization | `Landing.tsx:560-653`, `SKILL.md` |
| 19 | Intelligence | CredAlert Risk Intelligence | Real-time commercial credit verification checking defaulter flags across 3.2M+ Indian registered businesses | GSTIN, PAN, or Company Name query | Risk score badge, default track records | Safe empty state if no record found | `Landing.tsx:656-708`, `Landing3DIcons.tsx` |
| 20 | Comparison | ₹0 Transparent Pricing Matrix | High-density comparison table evaluating CredSmart vs Vyapar, myBillBook, and Tally Prime | Comparison feature rows | Clear table with sticky header and check indicators | Responsive horizontal scroll on small viewports | `Pricing.tsx:20-32`, `CompareVyapar.tsx` |
| 21 | Distribution | Multi-Platform Download Hub | Dedicated download triggers for Android APK and Windows PC (.exe) with hardware specs | Click on download button / modal selector | Direct APK/EXE download or modal instruction | Display minimum OS requirements | `AppDownloadButtons.tsx`, `DownloadAppModal.tsx` |
| 22 | Footer | Unified Public Footer (`PublicFooter.tsx`) | 5-column comprehensive footer with brand mission, POS links, CRM links, comparisons, and legal links | Static links, year generator | Responsive footer grid with 1px border divider | Valid link routes | `PublicFooter.tsx` |

---

## 4. Edge Cases

| # | Feature | Input / Trigger | Observed Behavior & Spec Mandate |
|---|---------|-----------------|----------------------------------|
| 1 | Viewport Containment | Desktop user viewing on 1366x768 or 1920x1080 screen | Currently: 5,000px vertical unconstrained scroll. Spec mandate: Layout must fit within bounded sections with sticky headers, section tab switchers, and max-height containers (`max-h-[520px]`). |
| 2 | Navigation Anchor | User clicks header link "POS Billing" or "Workforce CRM" (`/#suites`) | Currently: URL changes to `/#suites`, but page does not scroll because element with `id="suites"` does not exist. Spec mandate: Must render `<section id="suites">` with smooth-scroll containment. |
| 3 | Button Sizing | Developer or page uses standard Tailwind button classes | Currently: Inline buttons use `h-12 px-8 rounded-xl` or `h-13 px-8`. Spec mandate: Enforce standard action `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs` and hero `h-9.5 px-4.5 rounded-lg text-sm font-semibold shadow-xs`. Zero `h-12`/`h-13`/`px-8` bubble buttons. |
| 4 | Font Tabular Consistency | Rendering currency amounts (₹), quantities, invoice IDs | Standard text fonts cause column jitter on dynamic data. Spec mandate: All amounts, numbers, and dates must strictly use `font-mono tabular-nums` (`'IBM Plex Mono'`). |
| 5 | Dual-Suite Switcher | User toggles between "POS & Billing ERP" and "Workforce CRM" | Preview dock must instantaneously update between POS sales counters and CRM attendance/payroll mockups without full page reload. |
| 6 | Direct Suite Launcher | User clicks `Launch POS & Billing →` or `Launch CRM & Workforce →` | Must set `sessionStorage.setItem("credsmart_launch_portal_active", "billing" | "crm")` and navigate directly to `/billing/dashboard` or `/crm`. |
| 7 | Authenticated Visitor | Logged-in store owner visits public landing page `/` | `HomeRoute()` in `src/App.tsx` redirects authenticated web users to `/billing/dashboard` or `/crm` according to `portalActive`. Public marketing pages remain accessible via direct URL. |
| 8 | Mobile Divergence | User visits public landing page on mobile browser (<768px) | Layout gracefully collapses into high-density 1-column cards with swipeable chips and bottom-dock navigation, preserving 44x44px minimum touch targets while keeping desktop layout dense and screen-fitted. |
| 9 | Unauthenticated CTA Click | Visitor clicks "Start Free" or "Get Started" without active session | System navigates to `/auth?mode=signup`, preserving intended suite selection in URL query param (`?portal=billing` or `?portal=crm`). |
| 10 | Dark Mode Theme Switch | User toggles light/dark mode on public landing page | Canvas background toggles `#F8FAFC` ↔ `#090D16`, cards `#FFFFFF` ↔ `#111726`, hairline borders `border-slate-200/80` ↔ `border-slate-800`. Text remains high-contrast slate. |

---

## 5. Architectural Wireframe Patterns for Viewport Containment

### Pattern A: Screen-Fitted Master Hero (Desktop >= 768px)
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ STICKY PUBLIC HEADER (52px / h-13): [Logo] [Suites] [Features] [Pricing] [About] [CTA] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ HERO VIEWPORT (Contained within 700px - 820px max height):                              │
│ ┌─────────────────────────────────────────┐  ┌───────────────────────────────────────┐ │
│ │ LEFT COLUMN: VALUE PROPOSITION (50%)    │  │ RIGHT COLUMN: DUAL-SUITE PREVIEW (50%)│ │
│ │ • Pill Badge: "All-in-One Dual Suite"   │  │ • Suite Switcher Tab Strip:           │ │
│ │ • Headline: "Everything Your Business   │  │   [ ⚡ POS Billing ] [ 👥 Workforce ] │ │
│ │   Needs. Completely Free."              │  │ • Live Interactive Simulation Card:   │ │
│ │ • 3 Compact Capability Badges           │  │   - Metric 1: Cash & Bank Liquidity   │ │
│ │ • Dual Compact CTAs:                    │  │   - Metric 2: Today's Reconciled Sales│ │
│ │   [ Start Free Now 🚀 (h-9.5 px-4.5) ]   │  │   - Metric 3: Active Staff On Shift   │ │
│ │   [ Explore Showcase ▶ (h-9.5 px-4) ]   │  │   - Interactive Live Demo Buttons     │ │
│ │ • Compact Download Badges (Android + PC)│  │ • Bounded height: max-h-[480px]       │ │
│ │ • Trust Checklist (No CC, Free Forever) │  │                                       │ │
│ └─────────────────────────────────────────┘  └───────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Pattern B: Dedicated Dual-Suite Anchor Section (`#suites`)
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ SECTION #suites: "THE DUAL-SUITE ARCHITECTURE" (Contained Bounded Height)             │
│ Subheading: "Two powerful operational engines. Zero subscription fees. One platform."  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────┐  ┌────────────────────────────────────────┐ │
│ │ SUITE 1: POS & BILLING ERP             │  │ SUITE 2: WORKFORCE CRM BY CREDALERT    │ │
│ │ Badge: ⚡ RETAIL POS & BILLING          │  │ Badge: 👥 WORKFORCE & HR               │ │
│ │ Host: api.credsmart.online (Ubuntu API)│  │ Host: Supabase Cloud Engine            │ │
│ │ Features:                              │  │ Features:                              │ │
│ │ • Lightning Counter POS (F1-F12 keys)  │  │ • Geofenced GPS Clock-In & Shifts      │ │
│ │ • GST Tax Invoicing (0-28% + UPI QR)   │  │ • Task Delegation & Kanban Proof Review│ │
│ │ • Multi-Godown Stock & Batch Tracking  │  │ • Granular Staff RBAC Permissions      │ │
│ │ • Barcode & Price Sticker Label Studio │  │ • Automated Monthly Payroll Engine     │ │
│ │ • Customer Udhar Khata & WhatsApp Alert│  │ • Bilingual AI Voice Copilot (Hi/En)   │ │
│ │ • 100% Offline Billing Mode + ESC/POS  │  │ • Team Hub & Emergency Broadcast Comms │ │
│ │                                        │  │                                        │ │
│ │ Action: [ Launch POS & Billing → ]     │  │ Action: [ Launch CRM & Workforce → ]   │ │
│ │ (h-8.5 px-3.5 rounded-lg bg-blue-600)  │  │ (h-8.5 px-3.5 rounded-lg bg-emerald-600)│
│ └────────────────────────────────────────┘  └────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Pattern C: Bounded Interactive Module Explorer
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ SECTION: "EVERY ENTERPRISE MODULE INCLUDED" (Single Contained Box)                     │
│ Horizontal Tab Selector: [POS] [CRM] [GST] [Barcode] [Inventory] [Khata] [Tax Reports] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Bounded Container (`max-h-[500px] overflow-hidden`):                                  │
│ ┌─────────────────────────────────────────┐  ┌───────────────────────────────────────┐ │
│ │ Active Tab Specifications & Benefits    │  │ Interactive Module Simulation Panel   │ │
│ │ • Module Title & Badges                 │  │ • Mock Counter / GPS Geofence Map     │ │
│ │ • 4 High-Density Bullet Points          │  │ • Active Status Indicators            │ │
│ │ • Try Module Free Button (h-8.5)        │  │ • Hardware Ready ESC/POS Indicator    │ │
│ └─────────────────────────────────────────┘  └───────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Concrete Criteria for Reviewers and Auditors (Compliance Checklist for R2)

When reviewing or auditing public desktop pages (`Landing.tsx`, `PublicHeader.tsx`, `PublicFooter.tsx`, `Features.tsx`, `Pricing.tsx`, `About.tsx`, `Contact.tsx`, `Security.tsx`, `FaqPage.tsx`), verify against this 10-point pass/fail checklist:

| Check # | Audit Item | Expected Standard | Failure Condition |
|---------|------------|-------------------|-------------------|
| **C1** | **Button Heights & Proportions** | Standard: `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs` (34px). Hero: `h-9.5 px-4.5 rounded-lg text-sm font-semibold shadow-xs` (38px max). Small: `h-7 px-2.5 rounded-md text-[11px] font-medium` (28px). | Any instance of `h-11`, `h-12`, `h-13`, `px-8`, `px-7`, `rounded-3xl`, or bloated bubble buttons. |
| **C2** | **Desktop Viewport Containment** | Page layouts fit within 768px-1080px monitor heights with bounded containers (`max-h-[520px]`), tab switchers, and independent scrolling panes. | Unconstrained 5000px single vertical stacks requiring tedious mouse wheel scrolling. |
| **C3** | **Dual-Suite Presentation** | Both **POS & Billing ERP** and **Workforce CRM** are explicitly articulated with dedicated feature chips, badges, and launchers. | Pages describe only POS billing while omitting Workforce CRM modules. |
| **C4** | **DOM Anchor Resolution** | `#suites`, `#ecosystem`, `#intelligence`, `#download`, and `#faq` exist as valid DOM IDs and smoothly scroll to their respective targets. | Header links pointing to `#suites` that do not exist or fail to scroll. |
| **C5** | **Direct Suite Launch Routing** | Suite cards trigger `sessionStorage.setItem("credsmart_launch_portal_active", ...)` and navigate to `/billing/dashboard` and `/crm`. | Dead buttons, non-functional handlers, or orphaned functions. |
| **C6** | **Typography Hierarchy** | Inter for sans UI text; IBM Plex Mono with `font-mono tabular-nums` for all ₹ amounts, counts, dates, invoice IDs, and barcodes. | Sub-11px micro-fonts, or numeric currency amounts using proportional sans without tabular figures. |
| **C7** | **Surface & Color System** | Canvas `#F8FAFC` light / `#090D16` dark; Cards `#FFFFFF` light / `#111726` dark; Hairline 1px borders (`border-slate-200/80` / `border-slate-800`); Electric Blue `#2563EB` primary accent. | Multi-colored rainbow gradients, skeuomorphic bevels, liquid glass reflections, or neon drop shadows. |
| **C8** | **Elimination of Micro-Prose** | Compact feature cards with dense capability chips, concise headings, and clear metrics. | Bloated multi-sentence explanatory paragraphs repeating obvious statements. |
| **C9** | **SEO & Structured Data** | Every public route includes `SEOHead` with canonical URL, page title, description, OpenGraph tags, and valid Schema.org JSON-LD. | Missing meta tags, broken canonical links, or missing breadcrumbs. |
| **C10** | **Protected Route Invariance** | Zero modifications to protected routes (`/billing/*`, `/crm/*`), zero modifications to the 19 quarantine invoice files, tests pass. | Regressions in POS billing, quarantine file changes, or build failures. |

---

## 7. Caveats

1. **Active Test Suite Baseline Execution**: Vitest test suite (`npm run test -- --run`) was executed on the workspace baseline.
   - Result: 64 of 67 test files PASSED (1,760 tests passed, 53 failed).
   - The 3 failing test files are:
     * `src/test/coreBillingInventoryMobileModernization.challenger.test.ts` (quarantine files check timed out at 5000ms while scanning 19 large files, and Sales.tsx mobile container string match)
     * `src/test/coreBillingInventoryModernizationEmpiric.challenger.test.ts` (quarantine files check timed out at 5000ms)
     * `src/test/tallyE2E.test.ts` (Tally live bridge mockDb insertion count tests expecting live sync daemon)
   - All public marketing page components, design tokens, and viewport containers are 100% decoupled from live server daemons and these Tally bridge tests.
2. **Capacitor Mobile Divergence**: Public marketing routes are conditionally bypassed in native mobile apps (`isNativePlatform()`) via `PublicMarketingRoute` in `src/App.tsx`, directing cold launches to `ColdLaunchHub`. Changes to desktop marketing pages must preserve this mobile containment without altering `App.tsx` routing logic.
3. **Quarantine Invariance**: All 19 invoice quarantine files (`src/pages/CreateInvoice.tsx`, `src/components/invoice/*`, etc.) are completely outside the scope of public desktop landing pages and must remain untouched.

---

## 8. Conclusion

CredSmart's public desktop experience currently has a major disconnect between its actual dual-suite architecture (POS & Billing ERP + Workforce CRM) and what is presented to prospective users. Furthermore, `Landing.tsx` and public marketing pages violate the master minimal design system by using bloated `h-12`/`h-13` buttons and an unconstrained 1,395-line vertical scrolling layout.

By implementing the **Screen-Fitted Master Hero (Pattern A)**, the **Dedicated Dual-Suite Anchor Section `#suites` (Pattern B)**, and the **Bounded Module Explorer (Pattern C)**, while strictly enforcing button sizing (`h-8.5 px-3` standard, `h-9.5 px-4.5` hero) and IBM Plex Mono tabular numbers, the engineering team can deliver production-ready, lightning-fast public pages that perfectly comply with R1, R2, and R4.

---

## 9. Verification Method

To independently verify the findings in this report:

1. **Verify Button Sizing Implementation**:
   - Inspect `src/components/ui/button.tsx` lines 33-47. Confirm `size.default` is `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs` and `size.lg` is `h-9.5 px-4 rounded-lg text-sm font-semibold shadow-2xs`.
   - Inspect `src/pages/Landing.tsx` lines 394, 403, 790, 918, 977, 1228 to confirm instances of prohibited `h-12` and `h-13` buttons.

2. **Verify Missing `#suites` Anchor & CRM Omission**:
   - Inspect `src/components/public/PublicHeader.tsx` lines 41-42: observe `{ label: "POS Billing", href: "/#suites" }` and `{ label: "Workforce CRM", href: "/#suites" }`.
   - Grep search `id="suites"` in `src/pages/Landing.tsx`: observe zero results.
   - Inspect `src/pages/Landing.tsx` lines 214-293: observe that `moduleShowcases` omits `crm`.

3. **Verify Dual-Suite Architecture Reference**:
   - Inspect `src/components/portal/ColdLaunchHub.tsx` lines 147-300: confirm dual-suite presentation with Ubuntu API (`api.credsmart.online`) for POS and Supabase Cloud for CRM.
   - Inspect `CRM_INTEGRATION_PLAN.md` lines 17-20: confirm architectural blueprint.

4. **Verify Build & Test Integrity**:
   - Run `cmd /c "npm run build"` to verify TypeScript and bundling pass.
   - Run `cmd /c "npm run test -- --run"` to verify test suite execution (baseline: 64 passed files, 1760 passed tests).
