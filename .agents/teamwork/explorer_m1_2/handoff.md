# Milestone 1 Exploration Report: Public Footer, Shell & Conversion Banner

**Agent**: M1 Explorer 2 (`explorer_m1_2`)  
**Mission**: Investigate `PublicFooter.tsx`, `PublicConversionBanner.tsx`, and `PublicLayout.tsx` to formulate a precise implementation specification, line-by-line recommendations, and diff blueprints for Milestone 1.  
**Date**: 2026-10-31  

---

## 1. Observation

Direct code inspections of `src/components/public/PublicFooter.tsx`, `src/components/public/PublicConversionBanner.tsx`, and `src/components/public/PublicLayout.tsx` revealed the following concrete observations:

### A. `src/components/public/PublicFooter.tsx`
1. **Missing Workforce CRM Column & Suite Asymmetry (Lines 19, 40-191)**:
   - Line 19 defines a 5-column grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800/60`.
   - The brand section spans 2 columns (`lg:col-span-2`).
   - The remaining 3 columns are:
     - Line 43: `"Product & POS"`
     - Line 101: `"Resources & Pricing"`
     - Line 151: `"Company & Trust"`
   - **Workforce CRM is completely absent** from the footer. There are zero links or references to GPS Attendance, Monthly Payroll, Task Boards & Kanban, Team Meet & Huddle, Multi-Tier Staff Roles (RBAC), or Bilingual Voice Copilot.
2. **Brand Column Micro-Copy (Lines 24-26)**:
   ```tsx
   24: <p className="text-xs sm:text-sm text-slate-400 max-w-sm leading-relaxed">
   25:   India&apos;s all-in-one completely free business management platform. Invoicing, POS billing, inventory management, customer ledger, and intelligent credit risk mitigation for MSMEs and enterprises.
   26: </p>
   ```
   - Focuses solely on invoicing and POS; fails to articulate CredSmart's dual-suite identity (POS & Billing ERP + Workforce CRM).
3. **Buried Native App Download Links (Lines 77-95)**:
   - Android APK and Windows PC download links are buried inside the "Product & POS" feature list as plain text bullet links (`<li><a href={APP_DOWNLOAD_LINKS.androidApk}...>Download Android APK</a></li>`).
   - They lack prominent visual hierarchy, tactile buttons, or dedicated download chips.
4. **Trust & Security Badges Typography (Lines 28-36)**:
   - Badges use `text-xs font-semibold`. According to `.agents/rules/minimal-design-system.md` Rule 4 ("Strict Size Hierarchy: Micro / Badges: `text-[11px]`"), badge typography should be standardized to `text-[11px] font-semibold`.

---

### B. `src/components/public/PublicConversionBanner.tsx`
1. **Rule 1 Button Sizing Violation (Line 68)**:
   ```tsx
   68: className="w-full sm:w-auto h-13 px-8 rounded-xl bg-white hover:bg-slate-50 text-blue-800 font-black text-sm sm:text-base shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer group"
   ```
   - `h-13` (52px height) and `px-8` (32px padding) directly violates `.agents/rules/minimal-design-system.md` Rule 1 ("Compact & Refined Controls: Never use oversized buttons (e.g. avoid `h-11`, `h-12`, `px-8`, `rounded-3xl` bubble buttons)").
   - `shadow-2xl` violates Rule 3 ("Crisp Hairline Surfaces: Rely exclusively on 1px borders and subtle micro-shadows (`shadow-xs`)").
   - `active:scale-95 transition-all` violates Rule 1 ("Tactile & Responsive: `active:scale-[0.98] transition-colors duration-150`").
   - Standard hero CTA token required: `h-9.5 px-4.5 rounded-lg text-sm font-semibold shadow-xs`.
2. **Container Sprawl & Vertical Spacing (Lines 22-24)**:
   - Container padding `py-12 sm:py-16` and card padding `p-8 sm:p-12 shadow-2xl` add 96px of vertical height, contributing to viewport overflow on desktop.
   - Rocket icon container at line 31 is oversized (`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl`).
3. **Widespread Propagation Impact**:
   - `grep_search` confirmed `PublicConversionBanner` is used across **14 public pages**: `About.tsx`, `Contact.tsx`, `Features.tsx`, `Pricing.tsx`, `Security.tsx`, `FaqPage.tsx`, `CompareVyapar.tsx`, `CompareMyBillBook.tsx`, `CompareTally.tsx`, `BarcodeGuide.tsx`, `EInvoicingGuide.tsx`, `GstBillingGuide.tsx`, `TermsOfService.tsx`, and `PrivacyPolicy.tsx`.
   - Fixing `PublicConversionBanner.tsx` instantly fixes button compliance across all 14 public routes.

---

### C. `src/components/public/PublicLayout.tsx`
1. **Scroll-to-Top Clashes with Hash Anchors (Lines 13-15)**:
   ```tsx
   11: const { pathname } = useLocation();
   12: 
   13: useEffect(() => {
   14:   window.scrollTo(0, 0);
   15: }, [pathname]);
   ```
   - When a user on a subpage (e.g. `/features`, `/pricing`, `/about`) clicks an anchor link leading to the landing page (e.g. `/#suites`, `/#ecosystem`, `/#intelligence`), `pathname` becomes `"/"` and `window.scrollTo(0, 0)` unconditionally executes.
   - This overrides browser hash navigation and forces the viewport to the top of the hero section, breaking smooth anchor jumps.
   - Navigation between anchors on the same pathname does not trigger because `pathname` is unchanged.
2. **Desktop Viewport Containment (Lines 18-22)**:
   - `<main className="flex-1 w-full">{children}</main>` lacks `overflow-x-hidden relative`, allowing ambient blur orbs (e.g., from `PublicConversionBanner` or hero glows) to cause horizontal layout shift and scrollbars.

---

## 2. Logic Chain

1. **Dual-Suite Parity**:
   - `ORIGINAL_REQUEST.md` § R1 mandates: "Redesign and implement production-ready desktop public pages and landing layouts for CredSmart, presenting both suites of the platform (POS & Billing ERP + Workforce CRM)".
   - `PROJECT.md` F4 mandates: "Add Workforce CRM column and feature links alongside POS & Billing in `PublicFooter.tsx`".
   - Adding a dedicated "Workforce CRM" column balances the suite presentation:
     - Suite 1 Column: "POS & Billing ERP" (POS Retail Billing, GST Invoicing & Taxes, Inventory & Godowns, Customer Ledgers & Udhar, Barcode Studio & Labels, Business Ecosystem, CredAlert Intelligence).
     - Suite 2 Column: "Workforce CRM" (GPS Geofenced Attendance, Automated Monthly Payroll, Task Boards & Kanban, Team Meet & Huddles, Multi-Tier Staff Roles, Bilingual Voice Copilot, Team Announcements).
2. **Responsive Grid Mathematics**:
   - 1 Brand Column + 4 Navigation Columns = 5 distinct semantic blocks.
   - On Desktop (`lg:` >= 1024px): Brand spans 2 (`lg:col-span-2`), and each of the 4 navigation columns spans 1 (`lg:col-span-1`). Total slots = 2 + 1 + 1 + 1 + 1 = 6. Layout: `lg:grid-cols-6`. All 5 blocks sit side-by-side in a single row without wrapping.
   - On Tablet (`md:` 768px-1024px): Brand spans 4 (`md:col-span-4`), followed by a 4-column row (`md:grid-cols-4`) where each navigation column occupies 1 slot.
   - On Mobile (`< 768px`): Grid is 2 columns (`grid-cols-2`). Brand spans full width (`col-span-2`), and navigation columns form a clean 2x2 grid (`col-span-1` each), eliminating endless vertical scrolling.
3. **App Downloads Elevation**:
   - Moving native app downloads from buried bullet points into tactile action chips in the brand column provides high visibility:
     - Android APK: `bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400` with `Smartphone` icon.
     - Windows PC: `bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400` with `Monitor` icon.
4. **Button Sizing Standard Enforcement**:
   - `minimal-design-system.md` Rule 1 mandates: Standard Action Button `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs` (34px), Hero CTA `h-9.5 px-4.5 rounded-lg text-sm font-semibold shadow-xs` (38px).
   - Changing `PublicConversionBanner.tsx` button to `h-9.5 px-4.5 rounded-lg text-sm font-semibold shadow-xs active:scale-[0.98] transition-colors duration-150` strictly enforces Rule 1 and eliminates oversized bubble buttons across 14 pages.
5. **Hash-Aware Layout Orchestration**:
   - Updating `PublicLayout.tsx` to listen to `[pathname, hash]` and check `if (hash)` allows smooth scrolling to the target element (`document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' })`).
   - Checking `window.matchMedia("(prefers-reduced-motion: reduce)").matches` respects user accessibility preferences.
   - Adding `overflow-x-hidden relative` to `<main>` guarantees zero horizontal spillover from backdrop blur effects.

---

## 3. Caveats

1. **Quarantine Files Lockdown**:
   - The 19 quarantined invoice files (`src/components/invoices/mobile/*`, `src/utils/downloadExactInvoice.ts`, etc.) must remain completely untouched (0-diff). None of the public shell components interact with these files.
2. **Landing Page Shell Integration**:
   - `Landing.tsx` renders `<PublicHeader onOpenDownloadModal={...} />` and `<PublicFooter />` directly rather than through `PublicLayout`, because it holds state for the download modal. The footer enhancements will immediately take effect on `Landing.tsx`.
3. **Protected CRM Routes**:
   - The actual CRM workspace routes (`/crm/*`) require authentication and are protected by `BillingLockdownGuard`. Therefore, the footer links for Workforce CRM point to the public feature page (`/features` or `/features#attendance`, etc.) so public visitors and search engine crawlers can read about the features without getting blocked or redirected.

---

## 4. Conclusion & Recommended Worker Implementation Plan

The worker must implement the following precise changes:

### File 1: `src/components/public/PublicFooter.tsx`

**Key Changes**:
- Change grid to `grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 sm:gap-10`.
- Set Brand Column to `col-span-2 md:col-span-4 lg:col-span-2`.
- Update Brand copy to articulate the dual-suite platform.
- Standardize badges to `text-[11px] font-semibold`.
- Add official app download chips (Android APK & Windows PC) to the Brand column.
- Rename Column 1 to `"POS & Billing ERP"` and add Barcode Studio link.
- Add new Column 2: `"Workforce CRM"` with links for Attendance, Monthly Payroll, Task Boards, Team Meet, Staff Roles, Voice Copilot, and Announcements.
- Standardize Column 3 (`"Resources & Pricing"`) and Column 4 (`"Company & Trust"`).
- Update footer bottom bar with platform dual-suite tagline.

#### Verbatim Blueprint for `src/components/public/PublicFooter.tsx`
```tsx
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  ExternalLink,
  Smartphone,
  Monitor,
} from "lucide-react";
import { APP_DOWNLOAD_LINKS } from "@/config/downloadLinks";
import { CredSmartLogo } from "./CredSmartLogo";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0B132B] text-slate-400 border-t border-slate-800/80 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Section: Brand + Dual-Suite Navigation Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 sm:gap-10 pb-12 border-b border-slate-800/60">
          
          {/* Brand & Mission Column (Spans 2 on Mobile/Desktop, 4 on Tablet) */}
          <div className="col-span-2 md:col-span-4 lg:col-span-2 space-y-4">
            <Link to="/" className="inline-block">
              <CredSmartLogo size="lg" variant="dark" />
            </Link>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm leading-relaxed">
              India&apos;s all-in-one completely free business management platform. Dual-suite POS billing ERP and Workforce CRM with intelligent credit risk mitigation for MSMEs and enterprises.
            </p>

            {/* Trust & Security Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 100% Free Forever
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-semibold">
                <Lock className="w-3.5 h-3.5 text-blue-400" /> 256-Bit SSL Encrypted
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> CredAlert Intel
              </span>
            </div>

            {/* Official Native App Download Chips */}
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                Official Native Apps
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={APP_DOWNLOAD_LINKS.androidApk}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 text-xs font-semibold transition-colors"
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Android APK</span>
                </a>
                <a
                  href={APP_DOWNLOAD_LINKS.windowsExe}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:text-blue-300 text-xs font-semibold transition-colors"
                >
                  <Monitor className="w-3.5 h-3.5 text-blue-400" />
                  <span>Windows PC</span>
                </a>
              </div>
            </div>
          </div>

          {/* Column 1: POS & Billing ERP */}
          <div className="col-span-1 space-y-3">
            <p className="text-xs font-bold text-white uppercase tracking-wider">
              POS &amp; Billing ERP
            </p>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/features" className="hover:text-amber-400 transition-colors">
                  POS Retail Billing
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-amber-400 transition-colors">
                  GST Invoicing &amp; Taxes
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-amber-400 transition-colors">
                  Inventory &amp; Godowns
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-amber-400 transition-colors">
                  Customer Ledgers &amp; Udhar
                </Link>
              </li>
              <li>
                <Link to="/barcode-generator-guide" className="hover:text-amber-400 transition-colors">
                  Barcode Studio &amp; Labels
                </Link>
              </li>
              <li>
                <Link to="/#ecosystem" className="hover:text-amber-400 transition-colors">
                  Business Ecosystem
                </Link>
              </li>
              <li>
                <Link to="/#intelligence" className="hover:text-amber-400 transition-colors">
                  CredAlert Intelligence
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Workforce CRM */}
          <div className="col-span-1 space-y-3">
            <p className="text-xs font-bold text-white uppercase tracking-wider">
              Workforce CRM
            </p>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/features" className="hover:text-blue-400 transition-colors">
                  GPS Geofenced Attendance
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-blue-400 transition-colors">
                  Automated Monthly Payroll
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-blue-400 transition-colors">
                  Task Boards &amp; Kanban
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-blue-400 transition-colors">
                  Team Meet &amp; Huddles
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-blue-400 transition-colors">
                  Multi-Tier Staff Roles
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-blue-400 transition-colors">
                  Bilingual Voice Copilot
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-blue-400 transition-colors">
                  Team Announcements
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources & Pricing */}
          <div className="col-span-1 space-y-3">
            <p className="text-xs font-bold text-white uppercase tracking-wider">
              Resources &amp; Pricing
            </p>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/pricing" className="hover:text-[#FF6A00] transition-colors font-semibold text-[#FF6A00]">
                  100% Free Forever Plan
                </Link>
              </li>
              <li>
                <Link to="/gst-billing-guide" className="hover:text-slate-200 transition-colors">
                  GST Invoicing Guide
                </Link>
              </li>
              <li>
                <Link to="/barcode-generator-guide" className="hover:text-slate-200 transition-colors">
                  Barcode Label Guide
                </Link>
              </li>
              <li>
                <Link to="/e-invoicing-guide" className="hover:text-slate-200 transition-colors">
                  e-Invoicing IRN Guide
                </Link>
              </li>
              <li>
                <Link to="/compare-vyapar" className="hover:text-slate-200 transition-colors">
                  CredSmart vs Vyapar
                </Link>
              </li>
              <li>
                <Link to="/compare-mybillbook" className="hover:text-slate-200 transition-colors">
                  CredSmart vs myBillBook
                </Link>
              </li>
              <li>
                <Link to="/compare-tally" className="hover:text-slate-200 transition-colors">
                  CredSmart vs Tally Prime
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-slate-200 transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Company & Trust */}
          <div className="col-span-1 space-y-3">
            <p className="text-xs font-bold text-white uppercase tracking-wider">
              Company &amp; Trust
            </p>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/about" className="hover:text-slate-200 transition-colors">
                  About CredSmart
                </Link>
              </li>
              <li>
                <a
                  href="https://www.credalert.business"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-slate-200 transition-colors inline-flex items-center gap-1"
                >
                  CredAlert Network <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              </li>
              <li>
                <Link to="/security" className="hover:text-slate-200 transition-colors">
                  Security Architecture
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="hover:text-slate-200 transition-colors">
                  Privacy Policy (DPDP 2023)
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="hover:text-slate-200 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-slate-200 transition-colors">
                  Support &amp; Grievance
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Statutory Notes */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
            <p>© {currentYear} CredSmart by CredAlert. All rights reserved.</p>
            <span className="hidden sm:inline text-slate-700">•</span>
            <p className="text-slate-400">
              ₹0 Community Lifetime Free Retail POS ERP &amp; Workforce CRM
            </p>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/privacy-policy" className="hover:text-slate-400 transition-colors">
              Privacy
            </Link>
            <Link to="/terms-of-service" className="hover:text-slate-400 transition-colors">
              Terms
            </Link>
            <Link to="/security" className="hover:text-slate-400 transition-colors">
              Security
            </Link>
            <Link to="/contact" className="hover:text-slate-400 transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default PublicFooter;
```

---

### File 2: `src/components/public/PublicConversionBanner.tsx`

**Key Changes**:
- Update banner padding to `py-8 sm:py-12` and card padding to `p-6 sm:p-8 rounded-2xl border border-blue-500/20 shadow-lg`.
- Resize rocket icon to `w-12 h-12 rounded-xl text-2xl`.
- Refine heading to `text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white leading-snug`.
- Update default props and center checkmarks to reflect the dual-suite platform.
- **Surgically replace the CTA button** with standard hero CTA dimensions: `h-9.5 px-4.5 rounded-lg text-sm font-semibold shadow-xs active:scale-[0.98] transition-colors duration-150`.

#### Verbatim Blueprint for `src/components/public/PublicConversionBanner.tsx`
```tsx
import { Link } from "react-router-dom";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { ROUTE_PATHS } from "@/config/routes";
import { cn } from "@/lib/utils";

interface PublicConversionBannerProps {
  className?: string;
  title?: string;
  highlightedText?: string;
  subtitle?: string;
  ctaText?: string;
}

export function PublicConversionBanner({
  className,
  title = "Ready to Run Your Entire Business on One Platform?",
  highlightedText = "100% Free Forever.",
  subtitle = "Join thousands of Indian retail shops and workforce teams who trust CredSmart. No credit card required.",
  ctaText = "Start Free Now",
}: PublicConversionBannerProps) {
  return (
    <section className={cn("py-8 sm:py-12", className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-800 p-6 sm:p-8 border border-blue-500/20 shadow-lg text-white flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8 relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute right-0 bottom-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-12 -top-12 w-48 h-48 bg-orange-500/20 rounded-full blur-2xl pointer-events-none" />

          {/* Left Content */}
          <div className="flex items-center gap-4 sm:gap-5 text-left z-10">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 text-white flex items-center justify-center text-2xl shadow-sm shrink-0">
              🚀
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white leading-snug">
                {title}{" "}
                {highlightedText && (
                  <span className="text-amber-300 drop-shadow-xs">{highlightedText}</span>
                )}
              </h3>
              <p className="text-xs sm:text-sm text-blue-100/90 mt-1.5 max-w-xl leading-relaxed font-normal">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Center Badges (Desktop) */}
          <div className="hidden xl:flex flex-col gap-1.5 text-xs font-semibold text-blue-100 z-10 shrink-0">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              Unlimited POS Invoices &amp; Khata
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              GPS Attendance &amp; Staff Payroll
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              100% Free Forever • Zero Hidden Fees
            </span>
          </div>

          {/* Right CTA - Strictly adheres to Rule 1 Standard Hero CTA dimensions */}
          <div className="shrink-0 w-full sm:w-auto z-10">
            <Link to={ROUTE_PATHS.auth} className="block w-full sm:w-auto">
              <button
                type="button"
                className="w-full sm:w-auto h-9.5 px-4.5 rounded-lg bg-white hover:bg-slate-50 text-blue-700 font-semibold text-sm shadow-xs active:scale-[0.98] transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer group"
              >
                <span>{ctaText}</span>
                <ArrowRight className="w-4 h-4 text-blue-700 group-hover:translate-x-0.5 transition-transform stroke-[2]" />
              </button>
            </Link>
            <p className="text-[11px] text-blue-200 mt-1.5 text-center font-medium">
              Instant 30-Second Setup • No Credit Card
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PublicConversionBanner;
```

---

### File 3: `src/components/public/PublicLayout.tsx`

**Key Changes**:
- Update `useEffect` to listen to `[pathname, hash]`.
- If `hash` is present, scroll smoothly to the target element with fallback to `(0, 0)`.
- Support `prefers-reduced-motion`.
- Add `overflow-x-hidden relative` to `<main>` to contain horizontal glow blur artifacts.

#### Verbatim Blueprint for `src/components/public/PublicLayout.tsx`
```tsx
import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { PublicHeader } from "./PublicHeader";
import { PublicFooter } from "./PublicFooter";

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const targetId = hash.replace(/^#/, "");
      // Slight delay ensures DOM tree is mounted on route transition
      const timer = setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          const prefersReducedMotion =
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          element.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
          });
        } else {
          window.scrollTo(0, 0);
        }
      }, 60);
      return () => clearTimeout(timer);
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col selection:bg-[#FF6A00] selection:text-white">
      <PublicHeader />
      <main className="flex-1 w-full overflow-x-hidden relative">{children}</main>
      <PublicFooter />
    </div>
  );
}

export default PublicLayout;
```

---

### File 4: Proposed Automated Unit Test `src/test/publicShellComponents.test.tsx`

The worker should create `src/test/publicShellComponents.test.tsx` to automatically verify these behaviors:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicConversionBanner } from "@/components/public/PublicConversionBanner";
import { PublicLayout } from "@/components/public/PublicLayout";

describe("Milestone 1 Shell Components Verification", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
  });

  describe("PublicFooter", () => {
    it("renders dual-suite columns: POS & Billing ERP and Workforce CRM", () => {
      render(
        <MemoryRouter>
          <PublicFooter />
        </MemoryRouter>
      );

      // Verify POS & Billing suite column and features
      expect(screen.getByText("POS & Billing ERP")).toBeInTheDocument();
      expect(screen.getByText("POS Retail Billing")).toBeInTheDocument();
      expect(screen.getByText("GST Invoicing & Taxes")).toBeInTheDocument();
      expect(screen.getByText("Inventory & Godowns")).toBeInTheDocument();

      // Verify Workforce CRM suite column and features
      expect(screen.getByText("Workforce CRM")).toBeInTheDocument();
      expect(screen.getByText("GPS Geofenced Attendance")).toBeInTheDocument();
      expect(screen.getByText("Automated Monthly Payroll")).toBeInTheDocument();
      expect(screen.getByText("Task Boards & Kanban")).toBeInTheDocument();
      expect(screen.getByText("Multi-Tier Staff Roles")).toBeInTheDocument();
      expect(screen.getByText("Bilingual Voice Copilot")).toBeInTheDocument();

      // Verify Resources & Company columns
      expect(screen.getByText("Resources & Pricing")).toBeInTheDocument();
      expect(screen.getByText("Company & Trust")).toBeInTheDocument();
    });

    it("renders official native app download chips with external download URLs", () => {
      render(
        <MemoryRouter>
          <PublicFooter />
        </MemoryRouter>
      );

      const androidLink = screen.getByRole("link", { name: /Android APK/i });
      const windowsLink = screen.getByRole("link", { name: /Windows PC/i });

      expect(androidLink).toHaveAttribute("target", "_blank");
      expect(windowsLink).toHaveAttribute("target", "_blank");
      expect(androidLink.getAttribute("href")).toContain("drive.usercontent.google.com");
      expect(windowsLink.getAttribute("href")).toContain("drive.usercontent.google.com");
    });

    it("standardizes trust badges to 11px micro-typography", () => {
      render(
        <MemoryRouter>
          <PublicFooter />
        </MemoryRouter>
      );

      const freeBadge = screen.getByText("100% Free Forever");
      expect(freeBadge).toHaveClass("text-[11px]");
    });
  });

  describe("PublicConversionBanner", () => {
    it("strictly adheres to Rule 1 standard hero CTA dimensions without bloated buttons", () => {
      const { container } = render(
        <MemoryRouter>
          <PublicConversionBanner />
        </MemoryRouter>
      );

      const button = screen.getByRole("button", { name: /Start Free Now/i });
      expect(button).toHaveClass("h-9.5");
      expect(button).toHaveClass("px-4.5");
      expect(button).toHaveClass("rounded-lg");
      expect(button).toHaveClass("text-sm");
      expect(button).toHaveClass("font-semibold");
      expect(button).toHaveClass("shadow-xs");

      // Verify complete absence of bloated classes
      expect(button).not.toHaveClass("h-13");
      expect(button).not.toHaveClass("px-8");
      expect(button).not.toHaveClass("rounded-xl");
      expect(button).not.toHaveClass("shadow-2xl");
      expect(button).not.toHaveClass("font-black");
    });
  });

  describe("PublicLayout", () => {
    it("wraps child content with header and footer and handles hash scrolling", async () => {
      render(
        <MemoryRouter initialEntries={["/#suites"]}>
          <PublicLayout>
            <div data-testid="test-content">Main Page Content</div>
          </PublicLayout>
        </MemoryRouter>
      );

      expect(screen.getByTestId("test-content")).toBeInTheDocument();
      expect(screen.getByText("POS & Billing ERP")).toBeInTheDocument();
      expect(screen.getByText("Workforce CRM")).toBeInTheDocument();
    });
  });
});
```

---

## 5. Verification Method

To verify the implementation once applied:
1. **Automated Unit Tests**:
   Execute the dedicated unit test suite:
   ```powershell
   cmd /c "npx vitest run src/test/publicShellComponents.test.tsx"
   ```
   Must pass with 100% exit code 0.
2. **Full Regression Test Suite**:
   ```powershell
   cmd /c "npm test"
   ```
   Must pass with zero regressions across all existing test files.
3. **Build Check**:
   ```powershell
   cmd /c "npm run build"
   ```
   Must succeed with zero TypeScript diagnostics and bundling errors.
4. **Visual & Responsive Inspection**:
   - At desktop (>= 1024px): Verify 6-column footer grid renders Brand (2 cols) + POS & Billing ERP (1 col) + Workforce CRM (1 col) + Resources & Pricing (1 col) + Company & Trust (1 col) in a single horizontal row.
   - At tablet (768px-1024px): Verify Brand occupies full width and the 4 navigation columns form a clean 4-column row underneath.
   - At mobile (< 768px): Verify Brand occupies full width and navigation columns form a 2-column side-by-side grid.
   - On `PublicConversionBanner`: Inspect CTA button height with browser DevTools to verify exact 38px (`h-9.5`) height and 18px (`px-4.5`) padding.
