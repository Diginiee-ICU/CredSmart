# Technical Blueprint & Handoff Report: Bounded Module Explorer & Button Standardization

**Agent**: Explorer M2 Landing 3 (`teamwork_explorer`)  
**Target Scope**: `src/pages/Landing.tsx`, `src/components/public/HeroDashboardCard.tsx`, Button Tokens, and Test Harness Strategy  
**Working Directory**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_landing_3`  
**Milestone**: Milestone 2 — Desktop Landing Page Dual-Suite Redesign  
**Date**: 2026-10-31  

---

## 1. Observation

Direct code audits and baseline test runs were executed across the workspace:

### 1.1 Baseline Test Verification
- **Quarantined Files Audit**:
  - Command: `node .agents/teamwork/auditor_m3/verify_protected.cjs`
  - Output: `Summary: 19 / 19 protected files untouched. VERDICT: ZERO LINES MODIFIED IN ALL 19 QUARANTINED FILES.` (Exit Code 0).
- **Public Pages E2E Suite**:
  - Command: `npm.cmd test -- src/test/e2e/publicPages.e2e.test.tsx --run`
  - Output: `Test Files: 1 passed (1) | Tests: 59 passed (59) | Duration: 41.77s` (Exit Code 0).

### 1.2 Identified Sprawling Vertical Sections & Viewport Violations on `Landing.tsx`
- **Missing `#suites` Showcase Anchor**:
  - `PublicHeader.tsx` links "POS & Billing ERP" and "Workforce CRM" to `/#suites` (Lines 64–65).
  - Verbatim check on `Landing.tsx`: Zero elements have `id="suites"`. As a result, clicking header dual-suite links fails to find a target element and defaults to top-of-page.
- **Sprawling Module Showcase (Section 4, Lines 714–844)**:
  - Spans over 800px of unconstrained vertical scroll depth (`py-14 sm:py-20`, `p-6 sm:p-10`).
  - Lacks dual-suite categorization: only covers 6 Retail POS modules (`pos`, `gst`, `barcode`, `inventory`, `khata`, `reports`) and has zero coverage of Workforce CRM modules (`attendance`, `payroll`, `tasks`, `roles`, `meet`, `copilot`).
  - Has no bounded scrolling container (`max-h-[520px]`) and no split-pane productivity architecture.
- **Hero Dashboard Preview Card (`HeroDashboardCard.tsx`, Lines 1–380)**:
  - Contains POS workspace tabs and metrics (`To Collect`, `To Pay`, `Cash & Bank`), but lacks an interactive toggle between POS Retail KPIs and CRM Workforce attendance/payroll/tasks, leaving the dual-suite promise unfulfilled in the hero preview.

### 1.3 Button Token & Bloat Violations Audit
A line-by-line audit of buttons and interactive controls on `Landing.tsx` revealed multiple violations of `.agents/rules/minimal-design-system.md`:
1. **Hero Primary CTA** (`Landing.tsx:394`):
   - *Verbatim*: `className="w-full sm:w-auto h-12 sm:h-13 px-7 sm:px-8 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-blue-700/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"`
   - *Violation*: Bloated `h-12 sm:h-13`, `px-7 sm:px-8`, and heavy multi-color shadow `shadow-xl shadow-blue-700/25`.
2. **Hero Secondary CTA** (`Landing.tsx:403`):
   - *Verbatim*: `className="w-full sm:w-auto h-12 sm:h-13 px-6 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-sm sm:text-base active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"`
   - *Violation*: Bloated `h-12 sm:h-13`, `px-6`.
3. **Ecosystem Bento Button** (`Landing.tsx:621`):
   - *Verbatim*: `className="px-6 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-semibold text-sm transition-colors cursor-pointer shadow-xs"`
   - *Violation*: Non-standard height (~40px) and padding.
4. **CredAlert Intelligence Button** (`Landing.tsx:674`):
   - *Verbatim*: `className="px-6 py-2.5 rounded-xl border border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold text-sm transition-colors cursor-pointer mb-4 inline-flex items-center gap-1.5"`
   - *Violation*: Non-standard height (~40px) and padding.
5. **Module Showcase Primary Button** (`Landing.tsx:790`):
   - *Verbatim*: `className="h-11 px-6 rounded-xl bg-[#FF6A00] hover:bg-[#E65F00] text-white font-bold"`
   - *Violation*: Oversized `h-11`, `px-6`.
6. **Module Showcase Secondary Button** (`Landing.tsx:795`):
   - *Verbatim*: `className="h-11 px-5 rounded-xl border-slate-300"`
   - *Violation*: Oversized `h-11`, `px-5`.
7. **Native App Download Action Buttons** (`Landing.tsx:918, 977`):
   - *Verbatim*: `className="w-full sm:w-auto h-12 px-6 rounded-xl bg-emerald-600 ..."` and `className="w-full sm:w-auto h-12 px-6 rounded-xl bg-blue-600 ..."`
   - *Violation*: Oversized `h-12`, `px-6`.
8. **Bottom Conversion Strip Buttons** (`Landing.tsx:1228, 1237`):
   - *Verbatim*: `className="w-full sm:w-auto h-13 px-8 rounded-xl ..."` and `className="w-full sm:w-auto h-13 px-6 rounded-xl ..."`
   - *Violation*: Oversized `h-13`, `px-8`.

---

## 2. Logic Chain

### 2.1 Viewport Containment & Screen-Fitting Rationale
1. **Rule 2 from `minimal-design-system.md`** specifies:
   - "Desktop Viewport Containment: Layouts must fit within standard monitor heights (768px - 1080px) without requiring long, tedious vertical scrolling."
   - "Independent Scrolling Panes: Catalog scrolls independently on left; Cart scrolls independently on right."
2. By restructuring Section 4 into a fixed-height Bounded Module Explorer (`max-h-[520px]`), the user never has to endlessly scroll down through tall individual module panels.
3. The 35% / 65% split-pane pattern mirrors high-productivity desktop software:
   - **Left column (35%)**: Scrollable list of 6 modules with instant click-to-activate interaction and status badges.
   - **Right column (65%)**: Real-time interactive preview card showing module KPIs, feature checks, tabular monospace stats (`font-mono tabular-nums`), and direct deep-links to `/features`.
4. Adding the Suite Switcher `[ Retail POS & ERP Modules (6) ]` ↔ `[ Workforce CRM Modules (6) ]` enables total coverage of all 12 platform modules in the exact same 520px vertical footprint.

### 2.2 Dedicated `#suites` Section Rationale
1. `PublicHeader.tsx` implements smooth navigation targeting element ID `suites` (Lines 47–58, 77–88).
2. Creating `<section id="suites" className="py-12 sm:py-16 bg-white border-b border-slate-200/70 scroll-mt-14">` with side-by-side balanced cards for Suite 1 (POS & Billing ERP) and Suite 2 (Workforce CRM) satisfies both the interface contract and Feature F8 in `PROJECT.md`.
3. Direct launch handlers (`handleLaunchPos` and `handleLaunchCrm`) set `sessionStorage.setItem("credsmart_launch_portal_active", "billing" | "crm")` and navigate directly to `/billing/dashboard` or `/crm`.

### 2.3 Button Standardization & De-Cluttering Mapping
All buttons on `Landing.tsx` are mapped strictly to design system tokens:

| Button Instance | Current (Bloated) | Standard Token Replacement | Dimensions |
|---|---|---|---|
| Hero Primary CTA | `h-12 sm:h-13 px-7 sm:px-8 rounded-xl` | `h-9.5 px-4.5 rounded-lg text-sm font-semibold shadow-xs` | 38px height |
| Hero Secondary CTA | `h-12 sm:h-13 px-6 rounded-xl` | `h-9.5 px-4 rounded-lg text-sm font-semibold shadow-xs` | 38px height |
| Ecosystem "Learn More" | `px-6 py-2.5 rounded-xl` | `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs` | 34px height |
| CredAlert "Check Credibility" | `px-6 py-2.5 rounded-xl` | `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs` | 34px height |
| Module Explorer Primary CTA | `h-11 px-6 rounded-xl` | `h-8.5 px-3.5 rounded-lg text-xs font-semibold shadow-2xs` | 34px height |
| Module Explorer Secondary CTA | `h-11 px-5 rounded-xl` | `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs` | 34px height |
| Native Android Download CTA | `h-12 px-6 rounded-xl` | `h-9.5 px-4.5 rounded-lg text-sm font-semibold shadow-xs` | 38px height |
| Native Windows Download CTA | `h-12 px-6 rounded-xl` | `h-9.5 px-4.5 rounded-lg text-sm font-semibold shadow-xs` | 38px height |
| Bottom Banner Primary CTA | `h-13 px-8 rounded-xl` | `h-9.5 px-4.5 rounded-lg text-sm font-semibold shadow-xs` | 38px height |
| Bottom Banner Secondary CTA | `h-13 px-6 rounded-xl` | `h-9.5 px-4.5 rounded-lg text-sm font-semibold shadow-xs` | 38px height |
| Dialog Modal Actions | Varied | `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs` | 34px height |

---

## 3. Caveats

1. **Quarantine Files Strict Invariance**:
   - The 19 files listed in `PROJECT.md` Section "Quarantine Files Lockdown" must remain 100% untouched (0 diff).
   - Only `src/pages/Landing.tsx`, `src/components/public/HeroDashboardCard.tsx`, and new test harnesses may be modified or created.
2. **Mobile (< 768px) Responsive Stacking**:
   - In screens `< 768px`, the split-pane layout must degrade gracefully: the module list and active card stack vertically or scroll smoothly using standard responsive classes (`grid-cols-1 md:grid-cols-12`).
   - Touch targets must remain >= 44x44px on mobile while adhering to standard heights on desktop.
3. **HeroDashboardCard Tab Preservation**:
   - `HeroDashboardCard.tsx` default suite MUST be `"pos"` on initial render to preserve all existing test assertions in `publicPages.e2e.test.tsx` (e.g. `LIVE RECONCILED`, `Recent Reconciled Activity`, `POS Billing`, `Sales`, `Items / Inventory`).

---

## 4. Conclusion & Technical Implementation Blueprints

### 4.1 Complete Module Data Structure (12 Modules)
The Worker should place this complete typed dataset in `src/pages/Landing.tsx` or a companion definition file:

```typescript
import {
  ShoppingCart,
  Receipt,
  QrCode,
  Package,
  Users2,
  FileSpreadsheet,
  MapPin,
  Landmark,
  CheckSquare,
  ShieldCheck,
  Video,
  Mic,
  type LucideIcon,
} from "lucide-react";

export interface ModuleShowcaseItem {
  id: string;
  suite: "pos" | "crm";
  title: string;
  shortName: string;
  badge: string;
  badgeColor: string;
  desc: string;
  tag: string;
  metrics: Array<{ label: string; value: string; hint?: string }>;
  points: string[];
  icon: LucideIcon;
  simulation: {
    title: string;
    subtitle: string;
    stats: Array<{ label: string; value: string; status?: "success" | "blue" | "amber" }>;
    bannerText: string;
    badgeText: string;
  };
}

export const MODULE_SHOWCASES: Record<string, ModuleShowcaseItem> = {
  // ── SUITE 1: RETAIL POS & ERP (6 MODULES) ──
  pos: {
    id: "pos",
    suite: "pos",
    shortName: "POS Billing",
    tag: "Counter Checkout",
    badge: "Fast POS Terminal",
    badgeColor: "bg-blue-100 text-blue-800",
    title: "Lightning-Fast Retail POS Billing Workbench",
    desc: "Process rush-hour customer queues with keyboard shortcuts (F1-F12), held bill stacks, instant barcode lookup, and split payments.",
    icon: ShoppingCart,
    metrics: [
      { label: "Held Bill Stacks", value: "5 Max", hint: "1-Click Recall" },
      { label: "Barcode Lookup", value: "< 50ms", hint: "Ultra-low latency" },
      { label: "Thermal Roll", value: "58 / 80mm", hint: "ESC/POS Native" },
    ],
    points: [
      "5 Concurrent Held Bills with instant 1-click restore",
      "Instant barcode scanner SKU resolution (< 50ms)",
      "Split cash, UPI, card & Udhar credit tender",
      "Direct thermal printing on 58mm & 80mm ESC/POS rolls",
    ],
    simulation: {
      title: "Main Retail Counter 01",
      subtitle: "Active Cashier Session",
      stats: [
        { label: "Active Counter", value: "Cashier 01 (Online)", status: "success" },
        { label: "Hardware Status", value: "Thermal 80mm ESC/POS Ready", status: "success" },
        { label: "Offline Sync", value: "Zero-Lag SQLite Sync", status: "blue" },
      ],
      bannerText: "Press F8 to tender cash or Enter to print receipt instantly.",
      badgeText: "Ready",
    },
  },
  gst: {
    id: "gst",
    suite: "pos",
    shortName: "GST Invoicing",
    tag: "Multi-Rate Tax",
    badge: "100% Tax Compliant",
    badgeColor: "bg-emerald-100 text-emerald-800",
    title: "Automated GST Invoicing & Multi-Rate Tax Engine",
    desc: "Create official tax invoices with automatic CGST, SGST, IGST calculations, HSN resolution, and dynamic payment QR codes.",
    icon: Receipt,
    metrics: [
      { label: "GST Slabs", value: "0% - 28%", hint: "All tax tiers" },
      { label: "HSN / SAC Lookup", value: "Automated", hint: "Instant resolve" },
      { label: "Dynamic UPI QR", value: "Direct Print", hint: "Zero MDR fees" },
    ],
    points: [
      "Supports 0%, 5%, 12%, 18%, 28% GST tax slabs",
      "Automated intra-state & inter-state tax engine",
      "Dynamic UPI payment QR printed directly on bill",
      "B2B and B2C custom invoice series",
    ],
    simulation: {
      title: "Tax Invoice #INV-2026-089",
      subtitle: "Sharma General Store (GSTIN: 27AABCU9603R1ZM)",
      stats: [
        { label: "Tax Classification", value: "Intra-State (CGST + SGST)", status: "blue" },
        { label: "Invoice Amount", value: "₹ 14,850.00", status: "success" },
        { label: "UPI Payment QR", value: "Embedded on PDF", status: "success" },
      ],
      bannerText: "Cryptographically verified GST calculations with round-off logic.",
      badgeText: "Compliant",
    },
  },
  barcode: {
    id: "barcode",
    suite: "pos",
    shortName: "Barcode Studio",
    tag: "Label Designer",
    badge: "Thermal Label Studio",
    badgeColor: "bg-purple-100 text-purple-800",
    title: "Custom Barcode & Sticker Generator Studio",
    desc: "Design and print custom barcode price tags directly from your product catalog on thermal sticker rolls or A4 label sheets.",
    icon: QrCode,
    metrics: [
      { label: "Thermal Rolls", value: "50x38 / 38x25", hint: "Custom sizes" },
      { label: "A4 Label Sheets", value: "24 / 40 / 65", hint: "Per page" },
      { label: "Symbologies", value: "EAN-13 / Code128", hint: "+ QR Codes" },
    ],
    points: [
      "Thermal roll sizes: 50x38mm, 38x25mm & custom label sizing",
      "Standard laser/inkjet A4 sheets (24, 40, 65 labels per sheet)",
      "Code 128, EAN-13, and QR Code barcode encoding",
      "Batch print queue synced directly with purchase bills",
    ],
    simulation: {
      title: "Sticker Batch #PRN-102",
      subtitle: "50x38mm Thermal Roll Preview",
      stats: [
        { label: "Batch Item", value: "Fortune Premium Oil 1L", status: "blue" },
        { label: "Barcode / SKU", value: "8901030382910 (EAN-13)", status: "blue" },
        { label: "Batch Count", value: "120 Labels Queued", status: "success" },
      ],
      bannerText: "Direct thermal label driver interface with automatic calibration.",
      badgeText: "Calibrated",
    },
  },
  inventory: {
    id: "inventory",
    suite: "pos",
    shortName: "Stock & Godowns",
    tag: "Warehouse Control",
    badge: "Multi-Godown Stock",
    badgeColor: "bg-amber-100 text-amber-800",
    title: "Multi-Godown Stock & Batch Expiry Tracking",
    desc: "Track inventory quantities in real time across multiple retail godowns, batch expiry dates, and low-stock reorder thresholds.",
    icon: Package,
    metrics: [
      { label: "Warehouse Godowns", value: "Unlimited", hint: "Multi-location" },
      { label: "Valuation Mode", value: "FIFO & Avg", hint: "Real-time" },
      { label: "Expiry Tracking", value: "Batch MFG", hint: "Zero wastage" },
    ],
    points: [
      "Multi-godown stock transfers and real-time tracking",
      "Batch tracking with MFG and Expiry date warnings",
      "Stock valuation reports (FIFO / Average Costing)",
      "Automatic low-stock SMS and push alerts",
    ],
    simulation: {
      title: "Central Godown B • Aisle 4",
      subtitle: "Real-Time Stock Audit",
      stats: [
        { label: "Tracked SKUs", value: "1,420 Active Items", status: "blue" },
        { label: "Low Stock Items", value: "16 Items Under Reorder", status: "amber" },
        { label: "Stock Valuation", value: "₹ 18,45,200 (FIFO)", status: "success" },
      ],
      bannerText: "Real-time sync between retail counter sales and warehouse deductions.",
      badgeText: "Synchronized",
    },
  },
  khata: {
    id: "khata",
    suite: "pos",
    shortName: "Udhar Khata",
    tag: "Party Ledgers",
    badge: "Customer Khata",
    badgeColor: "bg-orange-100 text-orange-800",
    title: "Digital Udhar Khata & WhatsApp Payment Reminders",
    desc: "Maintain clean party ledgers, track receivables, record partial payments, and send instant WhatsApp payment reminder links with bill PDFs.",
    icon: Users2,
    metrics: [
      { label: "WhatsApp Alerts", value: "1-Click", hint: "Free reminder" },
      { label: "Ledger Audit", value: "Bilateral", hint: "Anti-dispute" },
      { label: "Party Credit Limits", value: "Enforced", hint: "Risk control" },
    ],
    points: [
      "Customer & supplier running debit/credit ledger statements",
      "1-click WhatsApp payment reminders with invoice PDF link",
      "SharedLedger bilateral balance reconciliation",
      "Credit limit enforcement and overdue aging alerts",
    ],
    simulation: {
      title: "Party: Rajesh Trading Co.",
      subtitle: "Udhar Ledger Statement",
      stats: [
        { label: "Outstanding Balance", value: "₹ 24,500 Dr", status: "amber" },
        { label: "Credit Limit", value: "₹ 50,000 (Safe)", status: "success" },
        { label: "Last Payment", value: "₹ 10,000 on 28 Oct", status: "blue" },
      ],
      bannerText: "1-Tap WhatsApp dispatch sends itemized PDF statement with UPI pay link.",
      badgeText: "Reconciled",
    },
  },
  reports: {
    id: "reports",
    suite: "pos",
    shortName: "Tax & CA Reports",
    tag: "GSTR-1 JSON",
    badge: "CA & Government Ready",
    badgeColor: "bg-indigo-100 text-indigo-800",
    title: "GSTR-1 JSON Schema 2.0 & Excel Tax Reports",
    desc: "Export 100% government-compliant GSTR-1 JSON Schema 2.0 files and detailed Excel audit sheets for your CA in seconds.",
    icon: FileSpreadsheet,
    metrics: [
      { label: "GSTR-1 JSON", value: "Schema 2.0", hint: "GSTN Portal" },
      { label: "Tally Bridge", value: "XML Bridge", hint: "1-Click Import" },
      { label: "Excel Sheets", value: "B2B/B2C/HSN", hint: "Multi-tab format" },
    ],
    points: [
      "GSTR-1 B2B, B2CL, B2CS, and HSN summary export",
      "Profit & loss, sales summary, and tax registers",
      "Tally XML import & export bridge compatibility",
      "1-click CA sharing link with password protection",
    ],
    simulation: {
      title: "GSTR-1 Monthly Return Export",
      subtitle: "FY 2026-27 • September Filing",
      stats: [
        { label: "Total Taxable Value", value: "₹ 8,42,100", status: "blue" },
        { label: "Total Tax Amount", value: "₹ 1,51,578 (CGST+SGST)", status: "blue" },
        { label: "JSON Schema Status", value: "Validated (Zero Errors)", status: "success" },
      ],
      bannerText: "Directly uploadable to GSTN portal without manual CA re-entry.",
      badgeText: "Valid",
    },
  },

  // ── SUITE 2: WORKFORCE CRM (6 MODULES) ──
  attendance: {
    id: "attendance",
    suite: "crm",
    shortName: "GPS Attendance",
    tag: "100m Geofence",
    badge: "Anti-Proxy GPS",
    badgeColor: "bg-blue-100 text-blue-800",
    title: "100m GPS Geofenced Mobile Attendance & Clock-In",
    desc: "Eliminate buddy punching and proxy attendance with strict GPS perimeter validation, timestamp verification, and instant mobile selfie check-ins.",
    icon: MapPin,
    metrics: [
      { label: "Geofence Radius", value: "100 Meters", hint: "Store perimeter" },
      { label: "Verification", value: "GPS + Selfie", hint: "Anti-proxy" },
      { label: "Live Dashboard", value: "Real-time", hint: "Instant sync" },
    ],
    points: [
      "Strict 100m geofence perimeter around store or warehouse",
      "Mobile selfie clock-in with live timestamp validation",
      "Late mark, half-day, and overtime automated calculation",
      "Works on Android smartphones without dedicated biometric hardware",
    ],
    simulation: {
      title: "Store 01 • Main Geofence Hub",
      subtitle: "Perimeter: Lat 19.0760, Lng 72.8777 (100m)",
      stats: [
        { label: "Store Roster", value: "24 / 26 Staff Present", status: "success" },
        { label: "Outside Perimeter", value: "0 Rejected Clock-ins", status: "success" },
        { label: "Average Check-in", value: "08:54 AM", status: "blue" },
      ],
      bannerText: "Location validated via device high-accuracy GPS before attendance registers.",
      badgeText: "Geofence Active",
    },
  },
  payroll: {
    id: "payroll",
    suite: "crm",
    shortName: "Monthly Payroll",
    tag: "Automated Slips",
    badge: "1-Click Salary Run",
    badgeColor: "bg-emerald-100 text-emerald-800",
    title: "Automated Monthly Payroll & Salary Slips Engine",
    desc: "Calculate accurate net salaries based on verified attendance records, leave balances, PF/ESI deductions, and cash advances in 1 click.",
    icon: Landmark,
    metrics: [
      { label: "Payroll Run", value: "1-Click", hint: "Under 10s" },
      { label: "Salary Slips", value: "WhatsApp PDF", hint: "Automated delivery" },
      { label: "Deductions", value: "PF / ESI / Advance", hint: "Auto-calculated" },
    ],
    points: [
      "Direct synchronization with GPS attendance and leave tracking",
      "Automated PF, ESI, professional tax, and advance deductions",
      "Professional salary slips generated with company letterhead",
      "1-click salary slip dispatch via WhatsApp and SMS",
    ],
    simulation: {
      title: "Monthly Payroll Run • October 2026",
      subtitle: "26 Employees • 100% Attendance Reconciled",
      stats: [
        { label: "Gross Salary Disbursed", value: "₹ 5,12,000", status: "blue" },
        { label: "Statutory Deductions", value: "₹ 29,500 (PF+ESI)", status: "amber" },
        { label: "Net Payable", value: "₹ 4,82,500", status: "success" },
      ],
      bannerText: "Bank NEFT/RTGS batch payout sheet generated with one click.",
      badgeText: "Calculated",
    },
  },
  tasks: {
    id: "tasks",
    suite: "crm",
    shortName: "Task Boards",
    tag: "Kanban SOPs",
    badge: "Operations Kanban",
    badgeColor: "bg-purple-100 text-purple-800",
    title: "Role-Based Task Delegation & Kanban Workflow",
    desc: "Assign store opening checklists, stock restocking tasks, and counter audit duties to specific staff members with real-time status tracking.",
    icon: CheckSquare,
    metrics: [
      { label: "Active Boards", value: "Kanban", hint: "To Do / In Prog / Done" },
      { label: "Task SLA", value: "Due Time Alerts", hint: "Push notifications" },
      { label: "Checklists", value: "Daily Recurring", hint: "Store SOPs" },
    ],
    points: [
      "Visual Kanban boards for store tasks, stock checks, and deliveries",
      "Recurring daily checklists for store open and close procedures",
      "Photo proof of completion required for high-importance tasks",
      "Mobile push notifications when tasks are assigned or overdue",
    ],
    simulation: {
      title: "Store Operations Sprint Board",
      subtitle: "Morning Shift • 18 Daily SOP Tasks",
      stats: [
        { label: "Tasks Completed", value: "14 / 18 Tasks Done", status: "success" },
        { label: "In Progress", value: "4 Tasks Active", status: "blue" },
        { label: "Overdue Items", value: "0 Tasks Pending", status: "success" },
      ],
      bannerText: "Photo verification enabled: Cashier uploaded till balance photo.",
      badgeText: "In Progress",
    },
  },
  roles: {
    id: "roles",
    suite: "crm",
    shortName: "Staff Roles",
    tag: "Granular RBAC",
    badge: "6-Tier RBAC Matrix",
    badgeColor: "bg-rose-100 text-rose-800",
    title: "Multi-Tier Staff Role Permissions & Access Control",
    desc: "Safeguard confidential business data with granular permissions for Store Owners, Managers, Cashiers, Warehouse Handlers, and Accountants.",
    icon: ShieldCheck,
    metrics: [
      { label: "Pre-Built Roles", value: "6 Tiers", hint: "Owner to Trainee" },
      { label: "Permission Keys", value: "48 Granular", hint: "Zero data leaks" },
      { label: "Audit Log", value: "Immutable", hint: "User action trails" },
    ],
    points: [
      "Restrict discount limits, cost price visibility, and delete permissions",
      "Cashier lockdown prevents viewing total business profit or vendor costs",
      "Manager approval required for bill cancellations and item returns",
      "Full chronological audit log of every invoice edit and reprint",
    ],
    simulation: {
      title: "RBAC Security Matrix",
      subtitle: "Store Counter 01 • Cashier Profile",
      stats: [
        { label: "Price Edit Access", value: "Locked (Manager PIN)", status: "amber" },
        { label: "Profit Margin View", value: "Hidden (Admin Only)", status: "amber" },
        { label: "Fast POS Checkout", value: "Full Authorization", status: "success" },
      ],
      bannerText: "Zero risk of revenue leakage or unauthorized cashier discounts.",
      badgeText: "Secured",
    },
  },
  meet: {
    id: "meet",
    suite: "crm",
    shortName: "Team Meet",
    tag: "Audio/Video Huddles",
    badge: "Daily Huddles",
    badgeColor: "bg-cyan-100 text-cyan-800",
    title: "Daily Morning Huddles & Team Video/Audio Sync",
    desc: "Connect multi-store managers and remote warehouse staff with integrated 1-click video and audio meeting rooms directly inside the CRM.",
    icon: Video,
    metrics: [
      { label: "Meeting Rooms", value: "1-Click", hint: "Zero app download" },
      { label: "Team Chat", value: "Encrypted", hint: "End-to-End" },
      { label: "Daily Huddle", value: "Automated", hint: "Scheduled 09:30 AM" },
    ],
    points: [
      "Instant 1-click team video huddle without third-party meeting links",
      "Store opening briefing and daily sales target announcements",
      "Store-to-store secure text messaging and photo sharing",
      "Zero friction communication across dispersed retail outlets",
    ],
    simulation: {
      title: "Daily Store Managers Huddle",
      subtitle: "Room #HUDDLE-HQ-01 • WebRTC Audio/Video",
      stats: [
        { label: "Connected Stores", value: "3 Retail Outlets", status: "success" },
        { label: "Participants", value: "5 Managers Online", status: "blue" },
        { label: "Call Quality", value: "HD Low-Latency", status: "success" },
      ],
      bannerText: "Reviewing daily sales targets and distributor inward shipments.",
      badgeText: "Live Huddle",
    },
  },
  copilot: {
    id: "copilot",
    suite: "crm",
    shortName: "Voice Copilot",
    tag: "Hindi/English AI",
    badge: "AI Voice Copilot",
    badgeColor: "bg-violet-100 text-violet-800",
    title: "Bilingual Hindi & English Voice Copilot Assistant",
    desc: "Speak natural voice commands in Hindi or English to check daily sales, lookup product stock, or log employee attendance hands-free.",
    icon: Mic,
    metrics: [
      { label: "Languages", value: "Hindi + English", hint: "Hinglish ready" },
      { label: "Response Speed", value: "< 200ms", hint: "Local WebSpeech" },
      { label: "Command Set", value: "40+ Actions", hint: "Voice enabled" },
    ],
    points: [
      "Ask 'Aaj ki total sales kitni hai?' to get instant verbal audio response",
      "Voice product lookup: 'Check stock of Fortune 1L in Godown B'",
      "Hands-free bill creation and fast shortcut voice navigation",
      "Designed specifically for busy shop owners on the counter",
    ],
    simulation: {
      title: "CredSmart Voice AI Engine",
      subtitle: "Active Microphone • Hindi & English Speech Model",
      stats: [
        { label: "Last Query", value: "\"Aaj ka cash collection kitna hai?\"", status: "blue" },
        { label: "AI Response", value: "\"Aaj ka cash collection ₹ 42,350 hai\"", status: "success" },
        { label: "Speech Engine", value: "Zero-Cloud Latency", status: "success" },
      ],
      bannerText: "Natural language processing calibrated for Indian retail terminology.",
      badgeText: "Listening",
    },
  },
};
```

---

### 4.2 JSX Blueprint for Dedicated `#suites` Section (`Landing.tsx`)
This section anchors header navigation, displays side-by-side balanced cards, and triggers suite launches:

```tsx
{/* ── SECTION: DUAL-SUITE PLATFORM SHOWCASE (#suites) ── */}
<section id="suites" className="py-12 sm:py-16 bg-white border-b border-slate-200/70 scroll-mt-14">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center max-w-3xl mx-auto mb-10">
      <span className="text-xs font-bold text-blue-600 uppercase tracking-widest font-mono">
        Enterprise Dual-Suite Architecture
      </span>
      <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1.5">
        Two Dedicated Engines. <span className="text-[#FF6A00]">One Unified Platform.</span>
      </h2>
      <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-2xl mx-auto">
        Switch between high-speed counter billing and automated workforce operations with zero duplicate entry and zero subscription fees.
      </p>
    </div>

    {/* Dual Suite Cards Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ── Suite 1: POS & Billing ERP ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-6 sm:p-7 flex flex-col justify-between shadow-xs hover:shadow-md transition-all">
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold font-mono">
              SUITE 1: POS &amp; BILLING ERP
            </span>
            <span className="text-[11px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Cloud + Offline Ready
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
            High-Speed Retail Billing &amp; GST Compliance
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5">
            Engineered for high-volume billing counters, wholesale distribution warehouses, and multi-godown inventory control with zero latency.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6 text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>5 Held Bills &amp; &lt;50ms barcode lookup</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Thermal 58mm/80mm ESC/POS printing</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Multi-godown stock &amp; Udhar Khata ledgers</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>1-Click GSTR-1 JSON Schema 2.0 export</span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200/80 flex items-center justify-between gap-3">
          <Button
            type="button"
            onClick={handleLaunchPos}
            className="h-8.5 px-3.5 rounded-lg text-xs font-semibold shadow-2xs bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
          >
            <span>Launch POS Billing ERP</span>
            <span>🚀</span>
          </Button>

          <Link
            to="/features#pos"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
          >
            <span>Explore ERP Features</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Suite 2: Workforce CRM ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-6 sm:p-7 flex flex-col justify-between shadow-xs hover:shadow-md transition-all">
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold font-mono">
              SUITE 2: WORKFORCE CRM
            </span>
            <span className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              Supabase Real-Time
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
            GPS Geofenced Attendance, Payroll &amp; Tasks
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5">
            Digitize staff operations with 100m GPS perimeter validation, automated monthly payroll calculations, role permissions, and Kanban boards.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6 text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>100m GPS geofenced mobile selfie clock-in</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>1-Click automated salary calculation &amp; slips</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Granular 6-tier staff role permissions (RBAC)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Bilingual Hindi &amp; English Voice Copilot</span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200/80 flex items-center justify-between gap-3">
          <Button
            type="button"
            onClick={handleLaunchCrm}
            className="h-8.5 px-3.5 rounded-lg text-xs font-semibold shadow-2xs bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
          >
            <span>Launch Workforce CRM</span>
            <span>🚀</span>
          </Button>

          <Link
            to="/features#crm"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
          >
            <span>Explore CRM Features</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  </div>
</section>
```

---

### 4.3 JSX Blueprint for Bounded Module Explorer (`Landing.tsx`)
Replaces the sprawling Section 4 with a fixed-height, screen-fitted 2-pane explorer:

```tsx
{/* ── SECTION: BOUNDED DUAL-SUITE MODULE EXPLORER (max-h-[520px]) ── */}
<section className="py-12 sm:py-16 bg-slate-50/60 border-b border-slate-200/70">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center max-w-3xl mx-auto mb-8">
      <span className="text-xs font-bold text-blue-600 uppercase tracking-widest font-mono">
        12 Enterprise Modules Included
      </span>
      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
        Interactive Platform <span className="text-[#FF6A00]">Module Explorer</span>
      </h2>
      <p className="text-xs sm:text-sm text-slate-600 mt-1.5">
        Explore enterprise capabilities across both platform suites with zero paywalls.
      </p>
    </div>

    {/* Bounded Container: max-h-[520px] */}
    <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden max-h-[520px] flex flex-col">
      {/* Explorer Command Header with Suite Switcher */}
      <div className="bg-slate-50/80 px-4 sm:px-6 py-3 border-b border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>Module Navigator</span>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {activeSuiteTab === "pos" ? "6 POS & ERP Modules" : "6 Workforce CRM Modules"}
            </span>
          </h3>
        </div>

        {/* Suite Tab Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-slate-200/70 border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveSuiteTab("pos");
              setActiveModuleKey("pos");
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer text-xs",
              activeSuiteTab === "pos"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900 font-medium"
            )}
          >
            <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
            <span>Retail POS &amp; ERP (6)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSuiteTab("crm");
              setActiveModuleKey("attendance");
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer text-xs",
              activeSuiteTab === "crm"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900 font-medium"
            )}
          >
            <Users2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Workforce CRM (6)</span>
          </button>
        </div>
      </div>

      {/* Split Panes Body */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200/80">
        {/* Left Column (35%): Compact Scrollable Module List */}
        <div className="md:col-span-4 lg:col-span-4 overflow-y-auto max-h-[445px] p-2 space-y-1 bg-slate-50/40">
          {currentSuiteModules.map((mod) => {
            const Icon = mod.icon;
            const isSelected = activeModuleKey === mod.id;
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => setActiveModuleKey(mod.id)}
                className={cn(
                  "w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                  isSelected
                    ? "bg-white border-blue-500/50 shadow-xs ring-1 ring-blue-500/20 text-slate-900"
                    : "bg-white/60 hover:bg-white border-slate-200/70 text-slate-700 hover:border-slate-300"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-2xs",
                      isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate leading-tight">
                      {mod.shortName}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate font-mono">
                      {mod.tag}
                    </div>
                  </div>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0",
                    isSelected
                      ? "bg-blue-100 text-blue-800"
                      : "bg-slate-100 text-slate-600"
                  )}
                >
                  {mod.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Column (65%): Active Module Interactive Preview Card */}
        <div className="md:col-span-8 lg:col-span-8 p-4 sm:p-5 overflow-y-auto max-h-[445px] flex flex-col justify-between bg-white">
          <div className="space-y-3">
            {/* Header Badge & Status */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono", activeModule.badgeColor)}>
                  {activeModule.badge}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Suite: {activeSuiteTab === "pos" ? "POS & Billing ERP" : "Workforce CRM"}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold font-mono border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{activeModule.simulation.badgeText}</span>
              </span>
            </div>

            {/* Title & Desc */}
            <div>
              <h4 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {activeModule.title}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed mt-1">
                {activeModule.desc}
              </p>
            </div>

            {/* 3 Metrics with font-mono tabular-nums */}
            <div className="grid grid-cols-3 gap-2.5">
              {activeModule.metrics.map((m, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                    {m.label}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-slate-900 font-mono tabular-nums block mt-0.5">
                    {m.value}
                  </span>
                  {m.hint && (
                    <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                      {m.hint}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Feature Points Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {activeModule.points.map((pt, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-tight">{pt}</span>
                </div>
              ))}
            </div>

            {/* Interactive Simulation Widget */}
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/90 text-xs space-y-2">
              <div className="flex items-center justify-between font-mono text-[11px] text-slate-500">
                <span className="font-bold text-slate-800">{activeModule.simulation.title}</span>
                <span>{activeModule.simulation.subtitle}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                {activeModule.simulation.stats.map((s, idx) => (
                  <div key={idx}>
                    <span className="text-slate-400 block font-mono">{s.label}:</span>
                    <span className={cn("font-bold font-mono", s.status === "success" ? "text-emerald-700" : s.status === "amber" ? "text-amber-700" : "text-blue-700")}>
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200/60">
                &bull; {activeModule.simulation.bannerText}
              </div>
            </div>
          </div>

          {/* Bottom CTA Bar */}
          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
              100% Free Forever &bull; Zero Paywalls
            </span>
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <Button
                type="button"
                onClick={activeSuiteTab === "pos" ? handleLaunchPos : handleLaunchCrm}
                className="h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                <span>Try {activeModule.shortName} Free</span>
                <span>🚀</span>
              </Button>

              <Link to={`${ROUTE_PATHS.features}#${activeModule.id}`}>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <span>Explore Features</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
```

---

### 4.4 JSX Blueprint for Dual-Suite Preview Toggle (`HeroDashboardCard.tsx`)
Adds the interactive suite switcher `activeSuite: "pos" | "crm"` without breaking any existing test:

```tsx
// Inside HeroDashboardCard.tsx:
const [activeSuite, setActiveSuite] = useState<"pos" | "crm">("pos");

// In the browser-like top bar:
<div className="flex items-center gap-1.5 p-0.5 rounded-lg bg-slate-800 border border-slate-700/80">
  <button
    type="button"
    onClick={() => setActiveSuite("pos")}
    className={cn(
      "px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer font-mono",
      activeSuite === "pos"
        ? "bg-blue-600 text-white shadow-2xs"
        : "text-slate-400 hover:text-white"
    )}
  >
    POS Retail
  </button>
  <button
    type="button"
    onClick={() => setActiveSuite("crm")}
    className={cn(
      "px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer font-mono",
      activeSuite === "crm"
        ? "bg-indigo-600 text-white shadow-2xs"
        : "text-slate-400 hover:text-white"
    )}
  >
    Workforce CRM
  </button>
</div>
```

When `activeSuite === "crm"`, render:
- Top 3 Metrics:
  1. `GPS PRESENT`: `24 / 26 Staff` (92% On-Site) with MapPin icon
  2. `MONTHLY PAYROLL`: `₹ 4,82,500` (Reconciled) with Landmark icon
  3. `ACTIVE TASKS`: `18 Open` (4 In Review) with CheckSquare icon
- Overview 4-Metric Grid:
  - Active Staff: `26 Members`
  - Geofence Logs: `24 Clock-ins`
  - Overtime Logged: `14.5 Hours`
  - Open Huddles: `2 Active`
- Activity Feed:
  - `Rahul Sharma • Clock-in (Store 01 - GPS Verified 42m)` • `09:02 AM`
  - `Priya Mehta • Closed Daily Stock Audit` • `09:15 AM`
  - `Vikas Singh • Shift Check-in (Counter 02)` • `09:28 AM`

---

### 4.5 Full Test Harness Blueprint (`src/test/landingMilestone2.test.tsx`)
The Worker must create this automated Vitest suite to verify all Milestone 2 deliverables:

```tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Landing from "@/pages/Landing";
import { HeroDashboardCard } from "@/components/public/HeroDashboardCard";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => ({ userRole: "store_owner", loading: false }),
}));

describe("Milestone 2 Landing Page & Module Explorer Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  // ── SCENARIO 1: DOM Anchor #suites exists and is targetable ──
  it("M2.1: verifies DOM id 'suites' exists with smooth scroll offset", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <Landing />
      </MemoryRouter>
    );

    const suitesSection = container.querySelector("#suites");
    expect(suitesSection).toBeInTheDocument();
    expect(suitesSection?.className).toContain("scroll-mt-14");
    expect(screen.getByText(/Enterprise Dual-Suite Architecture|Enterprise Dual-Suite Platform/i)).toBeInTheDocument();
  });

  // ── SCENARIO 2: Dual Suite Launch Actions ──
  it("M2.2: verifies suite launch buttons set sessionStorage and navigate to correct routes", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Landing />
      </MemoryRouter>
    );

    const launchPosBtn = screen.getByRole("button", { name: /Launch POS Billing ERP/i });
    fireEvent.click(launchPosBtn);
    expect(sessionStorage.getItem("credsmart_launch_portal_active")).toBe("billing");
    expect(mockNavigate).toHaveBeenCalledWith("/billing/dashboard");

    const launchCrmBtn = screen.getByRole("button", { name: /Launch Workforce CRM/i });
    fireEvent.click(launchCrmBtn);
    expect(sessionStorage.getItem("credsmart_launch_portal_active")).toBe("crm");
    expect(mockNavigate).toHaveBeenCalledWith("/crm");
  });

  // ── SCENARIO 3: Bounded Module Explorer Viewport & Dual-Suite Switcher ──
  it("M2.3: verifies Bounded Module Explorer operates within max-h-[520px] and switches between POS and CRM", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <Landing />
      </MemoryRouter>
    );

    // Verify bounded height container
    const boundedContainer = container.querySelector(".max-h-\\[520px\\]");
    expect(boundedContainer).toBeInTheDocument();

    // Default suite is POS
    expect(screen.getByText(/6 POS & ERP Modules/i)).toBeInTheDocument();

    // Switch to Workforce CRM suite
    const crmSuiteBtn = screen.getByRole("button", { name: /Workforce CRM \(6\)/i });
    fireEvent.click(crmSuiteBtn);

    expect(screen.getByText(/6 Workforce CRM Modules/i)).toBeInTheDocument();
    expect(screen.getByText(/GPS Attendance/i)).toBeInTheDocument();
    expect(screen.getByText(/Monthly Payroll/i)).toBeInTheDocument();

    // Click a CRM module
    const payrollItem = screen.getByRole("button", { name: /Monthly Payroll/i });
    fireEvent.click(payrollItem);
    expect(screen.getByText(/Automated Monthly Payroll & Salary Slips/i)).toBeInTheDocument();
  });

  // ── SCENARIO 4: HeroDashboardCard Dual-Suite Preview Toggle ──
  it("M2.4: verifies HeroDashboardCard toggles between POS Retail and Workforce CRM previews", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <HeroDashboardCard />
      </MemoryRouter>
    );

    // Initial state is POS
    expect(screen.getByText(/TO COLLECT/i)).toBeInTheDocument();

    // Toggle to CRM
    const crmToggle = screen.getByRole("button", { name: /Workforce CRM/i });
    fireEvent.click(crmToggle);

    expect(screen.getByText(/GPS PRESENT/i)).toBeInTheDocument();
    expect(screen.getByText(/MONTHLY PAYROLL/i)).toBeInTheDocument();

    // Toggle back to POS
    const posToggle = screen.getByRole("button", { name: /POS Retail/i });
    fireEvent.click(posToggle);

    expect(screen.getByText(/TO COLLECT/i)).toBeInTheDocument();
  });

  // ── SCENARIO 5: Button Token Compliance (No Bloated Bubble Buttons) ──
  it("M2.5: audits every button on Landing to guarantee 100% compliance with minimal design tokens", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Landing />
      </MemoryRouter>
    );

    const allButtons = screen.getAllByRole("button");
    allButtons.forEach((btn) => {
      expect(btn.className).not.toContain("rounded-3xl");
      expect(btn.className).not.toContain("h-11");
      expect(btn.className).not.toContain("h-12");
      expect(btn.className).not.toContain("h-13");
    });
  });
});
```

---

## 5. Verification Method

To independently verify the implementation:

1. **Forensic Integrity Check**:
   ```bash
   node .agents/teamwork/auditor_m3/verify_protected.cjs
   ```
   *Expected output*: `Summary: 19 / 19 protected files untouched. VERDICT: ZERO LINES MODIFIED IN ALL 19 QUARANTINED FILES.` (Exit Code 0).

2. **Milestone 2 Unit & Integration Test Suite**:
   ```bash
   npm.cmd test -- src/test/landingMilestone2.test.tsx --run
   ```
   *Expected output*: All 5 scenarios pass with exit code 0.

3. **Master Public Pages Regression Test**:
   ```bash
   npm.cmd test -- src/test/e2e/publicPages.e2e.test.tsx --run
   ```
   *Expected output*: All 59 tests pass with zero regression in exit code 0.

4. **Production Build Compilation**:
   ```bash
   npm.cmd run build
   ```
   *Expected output*: Vite build completes with zero TypeScript errors.
