---
name: credsmart-landing-design
description: >-
  Ultra-high master level UI/UX design standard for CredSmart by CredAlert landing pages, public pages,
  and authentication interfaces. Enforces exact visual fidelity, typography hierarchy, 3D card mockups,
  ecosystem diagrams, and high-conversion layouts while strictly preserving protected business routes.
---

# CredSmart Landing & Public UI/UX Design System (Master Level)

This skill defines the technical standards, design tokens, visual hierarchy, and component architectures for CredSmart's landing page, public marketing pages, and authentication interfaces.

---

## 1. Brand Identity & Color Tokens

### Primary Palette
- **Deep Navy / Slate**: `#0F172A` (Slate 900), `#1E293B` (Slate 800), text `#0F172A`
- **CredSmart Orange (Primary Brand Accent)**: `#FF6A00` / `#F97316` / `#EA580C`
  - Used for the "Smart" in CredSmart, key value highlights ("Completely Free.", "For Free.", "Intelligence"), and primary action CTAs.
- **Royal Accent Blue (Action & Trust)**: `#1D4ED8` / `#2563EB` / `#1E40AF`
  - Used for the primary hero button ("Start Free Now 🚀"), badges, secondary action outlines, and conversion banners.
- **Emerald Green (Status & Live Reconciled)**: `#10B981` / `#059669`
  - Used for "• LIVE RECONCILED" indicator and positive metrics.
- **Warm Gold & Amber (Liquidity & Highlights)**: `#F59E0B` / `#D97706`
  - Used for "CASH & BANK" liquidity metrics, gold bank 3D icons, and user avatar.
- **Light Slate / Warm Ivory Background**: `#F8FAFC` to `#FFFFFF` with subtle radial mesh blurs.

---

## 2. Typography & Hierarchy

- **Font Family**: Modern clean sans-serif (`'Instrument Sans'`, `'Inter'`, system-ui).
- **Hero Title**:
  - `Everything Your Business` (Bold Slate-950, tracking-tight, 48px - 64px)
  - `Needs.` (Bold Slate-950)
  - `Completely Free.` (Bold Vibrant Orange `#FF6A00`)
- **Section Headings**:
  - `Why Businesses Love` + `<span className="text-[#FF6A00]">CredSmart</span>`
  - `The <span className="text-[#FF6A00]">CredSmart</span> Business Ecosystem`
  - `CredAlert <span className="text-[#FF6A00]">Intelligence</span>`
  - `Run Your Entire Business. <span className="text-[#FFB800]">For Free.</span>`

---

## 3. Structural Layout Architecture

### A. Navigation Header
1. **Logo**:
   - Shield Icon (Layered blue, orange, and red accents)
   - Text: `Cred<span className="text-[#FF6A00]">Smart</span>` with small subtext `by CredAlert`.
2. **Center Nav Links**:
   - Home, Features, Business Ecosystem, CredAlert Intelligence, About Us, Contact.
3. **Action Buttons**:
   - `Login`: Outlined border button (`border border-blue-600 text-blue-600 font-semibold px-6 py-2 rounded-xl hover:bg-blue-50 transition`).
   - `Start Free`: Vibrant orange button (`bg-[#FF6A00] hover:bg-[#E65F00] text-white font-semibold px-6 py-2 rounded-xl shadow-md transition`).

---

### B. Hero Section
1. **Value Proposition (Left)**:
   - Pill badge: `(All-in-One Business Management Software ×)` with soft blue border.
   - Headline: **Everything Your Business Needs. Completely Free.**
   - Subtitle: "Invoicing, POS, Inventory, Purchases, Accounting & more — one powerful platform to run your entire business."
   - 3 Feature Badges in a horizontal row:
     - 🎁 `100% Free Forever`
     - 🟢 `All Features Included`
     - 👥 `For Every Business`
   - Dual CTAs:
     - `Start Free Now 🚀` (Solid Royal Blue `#1D4ED8` with rocket icon)
     - `Explore CredSmart ▶` (Clean white button with subtle blue border and blue play icon)
   - Trust Checklist:
     - `✓ No Credit Card Required` | `✓ Easy to Use` | `✓ Setup in Minutes`

2. **Interactive Live Dashboard Preview Card (Right)**:
   - Elevated card with soft 3D ambient shadow (`shadow-2xl ring-1 ring-slate-900/5 rounded-2xl bg-white p-4`).
   - Top bar: Mini CredSmart logo, Hamburger icon, "Dashboard" title, "• LIVE RECONCILED" badge, Search icon, "+ Bill ▾" orange button, User avatar ("Y").
   - Left Mini-Sidebar: Dashboard (active), Sales, POS Billing, Purchases, Items / Inventory, Customers, Suppliers, Reports, Settings.
   - Top 3 Metrics:
     - `↙ TO COLLECT ↗` (₹ 0 Outstanding Receivables) + 3D isometric blue folder graphic.
     - `↗ TO PAY ↗` (₹ 0 Pending Payables) + 3D isometric orange receipt graphic.
     - `🏛 CASH & BANK ↗` (₹ 97,678 Reconciled Liquidity) + 3D isometric gold bank pillar graphic.
   - Recent Overview 4-Metric Grid:
     - Sales (This Month): ₹ 1,24,590 (12 Invoices)
     - Purchases (This Month): ₹ 78,320 (9 Invoices)
     - Low Stock Items: 16 (Need Attention)
     - Customers Due: ₹ 54,320 (8 Customers)

---

### C. "Why Businesses Love CredSmart" 6-Card Grid
6 cards in responsive layout (1-col mobile, 2-col tablet, 6-col / 3-col desktop):
1. **Complete & Free**: Blue gift box | "Use every feature. Forever. No hidden charges. No limits."
2. **All-in-One Platform**: Orange stacked layers | "Invoicing, POS, Inventory, Sales, Purchases, Accounting – everything in one place."
3. **Business Ecosystem**: Purple connected network | "Your sales invoice can automatically become their purchase invoice."
4. **CredAlert Intelligence**: Emerald shield | "Know the credibility of the businesses you deal with. Stay protected."
5. **Real-time Insights**: Blue growth chart | "Live financial dashboard. Track collections, payments & cash flow in real-time."
6. **Built for Every Business**: Orange people group | "Retailers, Wholesalers, Distributors, Manufacturers, Service Businesses & more."

---

### D. Dual Bento Spotlight Cards
1. **The CredSmart Business Ecosystem Card**:
   - Description: "When both businesses use CredSmart, transactions flow automatically. No duplicate entry. No extra work. Just connected businesses."
   - Visual Diagram: `Business A (Creates Sales Invoice)` ➔ `CredSmart Ecosystem` ➔ `Business B (Receives as Purchase Invoice)`.
   - Dark Navy "Learn More" button.
   - 3 Perks: ⏱️ "Save Time - No manual data entry" | 📎 "Reduce Errors - Eliminate duplicate data" | 🌐 "Stronger Network - Grow with connected businesses".

2. **CredAlert Intelligence Card**:
   - Description: "Get alerted if a business is flagged as a potential defaulter or risky counterparty by our CredAlert Intelligence system. Make smarter credit decisions. Reduce risk."
   - Action Button: "Check Business Credibility ↗" (Outlined blue button).
   - Subtext: "For more details visit www.credalert.business".
   - 3D Graphic: Glowing royal blue shield with vibrant orange warning triangle.

---

### E. Royal Blue High-Conversion Banner
- Container width banner with vibrant royal blue gradient background (`bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white`).
- Rocket badge in white circle.
- Title: "Run Your Entire Business. **For Free.**"
- Subtext: "Stop juggling multiple tools. Start using CredSmart today."
- Feature checks: `✓ Complete Solution` | `✓ All Features Free` | `✓ Trusted by Businesses`.
- Button: "Start Free Now 🚀" (White background, bold royal blue text).

---

## 4. Protected Route Invariance Rule

> **CRITICAL MANDATE**:
> Never modify protected routes (`/dashboard`, `/checkout`, `/pos`, `/sales`, `/purchases`, `/inventory`, `/parties`, `/reports`, `/cash-bank`, etc.).
> All changes are strictly restricted to `src/pages/Landing.tsx`, `src/pages/Auth.tsx`, `src/components/public/*`, and public marketing pages (`src/pages/public/*`).
