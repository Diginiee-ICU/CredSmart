# Project: CredSmart Production-Ready Desktop Public & Landing Pages Redesign

## Architecture
CredSmart is an Enterprise Hybrid Dual-Suite Platform:
- **Suite 1: POS & Billing ERP (`/billing/*`)**: Retail POS, thermal ESC/POS printing, GST tax engine, inventory, barcodes, B2B auto-inward, Khata ledgers. Backed by Ubuntu Cloud API (`https://api.credsmart.online`).
- **Suite 2: Workforce CRM (`/crm/*`)**: GPS geofenced attendance, automated monthly payroll/salary, task delegation & Kanban, role-based access control (RBAC), team meet/huddle, bilingual Voice Copilot. Backed by Supabase Cloud.

### Public Navigation & Shell Architecture
- **Unified Public Header (`src/components/public/PublicHeader.tsx`)**: 52px sticky command bar (`h-13`), permanent platform logo, balanced center links for "POS & Billing ERP" and "Workforce CRM" pointing to `#suites`, download trigger modal, and auth entry CTAs.
- **Unified Public Footer (`src/components/public/PublicFooter.tsx`)**: Dark navy surface (`#0B132B`) with balanced dual-suite columns ("POS & Billing ERP", "Workforce CRM", "Resources & Pricing", "Company & Trust"), download links, and copyright.
- **Global Public Wrapper (`src/components/public/PublicLayout.tsx`)**: Wraps public pages with header, footer, and scroll-to-top effect.
- **Desktop Viewport Containment**: Layouts on desktop (>= 768px) must fit within standard monitor heights (768px–1080px) using bounded scrolling containers (`max-h-[520px]`, `overflow-y-auto`), split productivity panes, interactive preview docks, and elimination of sprawling 6,000px vertical scroll depth.
- **Design Tokens**: Standard Action Button `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs` (34px); Hero CTA `h-9.5 px-4.5 rounded-lg text-sm font-semibold shadow-xs` (38px); Table Button `h-7 px-2.5 rounded-md text-[11px]` (28px); Micro Icon `w-7.5 h-7.5 rounded-md` (30px). Complete ban on bloated bubble buttons (`h-11`, `h-12`, `h-13`, `px-8`, `rounded-3xl`).
- **Typography & Colors**: Inter sans for UI text, IBM Plex Mono with `font-mono tabular-nums` for currency (₹) and numbers. Neutral canvas (`#F8FAFC` light / `#090D16` dark), cards (`#FFFFFF` light / `#111726` dark), 1px borders (`border-slate-200/80` / `border-slate-800`), Electric Blue (`#2563EB`) accent, vibrant orange (`#FF6A00`) brand highlight.
- **Full-Stack SEO & Privacy Architecture**: Dynamic meta injection via `src/components/public/SEOHead.tsx`, Schema.org JSON-LD structured data, canonical base `https://pos.credalert.bussiness/`, `public/robots.txt`, `public/sitemap.xml`, `public/llms.txt`, `public/llms-full.txt`, and client-side Crawler Privacy Guard setting `<meta name="robots" content="noindex, nofollow, noarchive">` on protected business routes.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | F1: Header Navigation & Anchor Fix | Fix `PublicHeader.tsx` `/#suites` anchor target and resolve `navigate(/${href})` double-slash bug | M1 | Survey Explorer 1 / Spec Miner 2 |
| 2 | F2: Dual-Suite Header Links | Add explicit navigation links for "POS & Billing ERP" and "Workforce CRM" in `PublicHeader.tsx` | M1 | ORIGINAL_REQUEST § R1 |
| 3 | F3: Header Button Standardization | Standardize header action buttons to `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs` | M1 | minimal-design-system.md § 1 |
| 4 | F4: Dual-Suite Public Footer | Add Workforce CRM column and feature links alongside POS & Billing in `PublicFooter.tsx` | M1 | ORIGINAL_REQUEST § R1 |
| 5 | F5: Conversion Banner Refinement | Refine `PublicConversionBanner.tsx` button sizing to `h-9.5 px-4.5 rounded-lg text-sm` | M1 | minimal-design-system.md § 1 |
| 6 | F6: Screen-Fitted Dual Hero | Compact 50/50 split Hero viewport in `Landing.tsx` with dual CTAs and interactive dashboard preview | M2 | ORIGINAL_REQUEST § R1, R2 |
| 7 | F7: Interactive Dual-Suite Preview Dock | Interactive preview card toggling between POS Retail KPIs and CRM Workforce attendance/tasks | M2 | credsmart-landing-design |
| 8 | F8: Dedicated `#suites` Showcase Anchor | Side-by-side balanced dual cards in `Landing.tsx` with direct launch buttons for both suites | M2 | ORIGINAL_REQUEST § R1 |
| 9 | F9: Bounded Module Explorer | Tabbed module viewer (`max-h-[520px]`) supporting both POS and CRM modules with zero vertical overflow | M2 | minimal-design-system.md § 2 |
| 10 | F10: Desktop Viewport Containment on Landing | Eliminate 6,000px vertical sprawling; structure comparisons and FAQs into bounded containers | M2 | minimal-design-system.md § 2 |
| 11 | F11: Landing Button Refinement | Replace all bloated `h-12`/`h-13`/`px-8` buttons in `Landing.tsx` with master standard tokens | M2 | minimal-design-system.md § 1 |
| 12 | F12: Dual-Suite Features Catalog | Organize `Features.tsx` into Suite 1 (POS & Billing — 6 modules) and Suite 2 (Workforce CRM — 6 modules) with sticky category nav | M3 | ORIGINAL_REQUEST § R1, R2 |
| 13 | F13: Dual-Suite Community Free Pricing | Detail ₹0 Community Lifetime Free tier in `Pricing.tsx` covering both POS & Billing and Workforce CRM | M3 | ORIGINAL_REQUEST § R1 |
| 14 | F14: About Page Viewport Containment | Compact story, MSME democratization, and statutory disclaimers in `About.tsx` | M3 | minimal-design-system.md § 2 |
| 15 | F15: Contact Page & Canonical Fix | Support & Grievance Officer desk in `Contact.tsx`; fix canonical URL to `https://pos.credalert.bussiness/contact` | M3 | ultra-master-seo § 1 |
| 16 | F16: Security Page Desktop Layout | 256-bit encryption, Supabase RLS, and DPDP Act 2023 compliance layout in `Security.tsx` | M4 | ORIGINAL_REQUEST § R1, R2 |
| 17 | F17: Dual-Suite FAQ Accordion | Searchable FAQ in `FaqPage.tsx` with dedicated Workforce CRM categories alongside POS/Billing | M4 | ORIGINAL_REQUEST § R1 |
| 18 | F18: Guides & Comparison Pages Polish | Standardize buttons, layout containment, and typography across comparison and guide pages | M4 | minimal-design-system.md |
| 19 | F19: Crawler Privacy Guard & robots.txt | Client-side `noindex, nofollow` on protected routes (`/billing/*`, `/crm/*`) and update `public/robots.txt` | M5 | ultra-master-seo § 4 |
| 20 | F20: Generative AI SEO (`llms-full.txt`) | Create comprehensive `public/llms-full.txt` documenting all 12+ ERP and CRM modules for LLM engines | M5 | ultra-master-seo § 5 |
| 21 | F21: Dynamic JSON-LD Schema Validation | Verify and enforce rich Schema.org JSON-LD and OpenGraph cards across all 17 public routes | M5 | ultra-master-seo § 2, 3 |
| 22 | F22: SEO & Privacy Automated Test Suite | Add automated Vitest suites (`src/test/seoHead.test.tsx` and `src/test/crawlerPrivacy.test.tsx`) | M5 | ultra-master-seo § 7 |
| 23 | F23: 100% E2E Test Suite Pass | Verify all Tier 1-4 tests pass with exit code 0 | M6 | ORIGINAL_REQUEST Acceptance Criteria |
| 24 | F24: Adversarial Coverage Hardening (Tier 5) | White-box adversarial testing with Challengers to close edge cases and untested paths | M6 | Project Pattern Phase 2 |
| 25 | F25: 19 Quarantine Files Forensic Audit | Execute `verify_protected.cjs` and forensic audit confirming 100% clean 0-diff integrity | M6 | ORIGINAL_REQUEST § R4 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Navigation, Brand & Dual-Suite Foundation | `PublicHeader.tsx`, `PublicFooter.tsx`, `PublicLayout.tsx`, `PublicConversionBanner.tsx` | None | DONE (Gate passed, 172/172 tests, 19/19 quarantine clean) |
| M2 | Desktop Landing Page Dual-Suite Redesign | `Landing.tsx`, `HeroDashboardCard.tsx`, interactive dual preview dock, `#suites` section, bounded module explorer | M1 | PLANNED |
| M3 | Core Public Pages Redesign | `Features.tsx`, `Pricing.tsx`, `About.tsx`, `Contact.tsx` | M1 | PLANNED |
| M4 | Trust, Security & Knowledge Pages | `Security.tsx`, `FaqPage.tsx`, comparison pages, guide pages | M1 | PLANNED |
| M5 | Full-Stack SEO & Crawler Privacy Architecture | `SEOHead.tsx`, Crawler Privacy Guard, `robots.txt`, `llms-full.txt`, SEO test suites | M1 | PLANNED |
| M6 | Final Verification, E2E Pass & Forensic Audit | Pass 100% E2E tests, Tier 5 adversarial testing, verify 19 quarantine files with `verify_protected.cjs` | M2, M3, M4, M5, E2E Track | PLANNED |

## Interface Contracts
### `PublicHeader` ↔ Page Anchors
- Element `id="suites"` must exist on `Landing.tsx` as the target for header "POS Billing" and "Workforce CRM" links.
- `PublicHeader.tsx` smooth navigation handler must check `location.pathname === "/"`:
  - If on `/`, call `document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' })`.
  - If on subpage, navigate to `/${targetHref.replace(/^\/+/, '')}` without double forward-slashes.

### `SEOHead` ↔ Protected Shells
- Prop `noIndex?: boolean` (defaults to `false`).
- When `noIndex: true`, injects `<meta name="robots" content="noindex, nofollow, noarchive">` and removes `seo-dynamic-structured-data`.
- Protected route layout wrappers (`BillingLockdownGuard`, `CrmApp`, `ProtectedRoutes`) invoke Crawler Privacy protection to guarantee private ERP/CRM views are never indexed.

### Public Pages ↔ Design Tokens
- Action buttons must use `src/components/ui/button.tsx` or master utility classes:
  - Default Action: `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs`
  - Hero CTA: `h-9.5 px-4.5 rounded-lg text-sm font-semibold shadow-xs`
  - Small / Table Action: `h-7 px-2.5 rounded-md text-[11px] font-medium`
  - Micro Icon Button: `w-7.5 h-7.5 rounded-md`
- Numeric & Currency figures must use `font-mono tabular-nums`.

## Code Layout
```
src/
├── components/
│   ├── public/
│   │   ├── PublicHeader.tsx           # Global public navigation header
│   │   ├── PublicFooter.tsx           # Global public footer
│   │   ├── PublicLayout.tsx           # Wrapper layout for public pages
│   │   ├── PublicConversionBanner.tsx # Standardized CTA conversion strip
│   │   ├── SEOHead.tsx                # Dynamic meta hydration & schema injection
│   │   ├── HeroDashboardCard.tsx      # Interactive dual-suite preview card
│   │   └── CredSmartLogo.tsx          # Brand mark & shield logo
│   └── ui/
│       └── button.tsx                 # Master button primitives (h-8.5, h-9.5, h-7)
├── pages/
│   ├── Landing.tsx                    # Screen-fitted dual-suite marketing landing page
│   └── public/
│       ├── Features.tsx               # Dual-suite 12-module feature catalog
│       ├── Pricing.tsx                # Community ₹0 lifetime free plan breakdown
│       ├── About.tsx                  # Company story & MSME democratization
│       ├── Contact.tsx                # Support & Grievance Officer desk
│       ├── Security.tsx               # 256-bit encryption & DPDP 2023 compliance
│       ├── FaqPage.tsx                # Searchable FAQ accordion
│       ├── GstBillingGuide.tsx        # GST billing guide
│       ├── BarcodeGuide.tsx           # Barcode generator guide
│       ├── EInvoicingGuide.tsx        # e-Invoicing guide
│       ├── CompareVyapar.tsx          # Competitor comparison vs Vyapar
│       ├── CompareMyBillBook.tsx      # Competitor comparison vs myBillBook
│       └── CompareTally.tsx           # Competitor comparison vs Tally Prime
├── test/
│   ├── seoHead.test.tsx               # Automated Vitest suite for SEOHead & schemas
│   ├── crawlerPrivacy.test.tsx        # Automated Vitest suite for crawler privacy tags
│   └── e2e/                           # Requirement-driven E2E tests
public/
├── robots.txt                         # Search engine crawler permissions & protected disallows
├── sitemap.xml                        # Canonical XML sitemap (15 public routes)
├── llms.txt                           # Summary context for LLM search engines
└── llms-full.txt                      # Comprehensive context for LLM search engines
```

## Quarantine Files Lockdown (DO NOT TOUCH)
The following 19 files are quarantined and must remain completely untouched (0 diff):
1. `src/components/invoices/mobile/MobileCreateInvoice.tsx`
2. `src/components/invoices/mobile/AddItemModal.tsx`
3. `src/components/invoices/mobile/SelectPartyModal.tsx`
4. `src/components/invoices/mobile/EditItemModal.tsx`
5. `src/components/invoices/mobile/MobileInvoiceSuccessView.tsx`
6. `src/components/invoices/mobile/MobileBillPreviewModal.tsx`
7. `src/components/invoices/mobile/MobileInvoiceFitViewer.tsx`
8. `src/components/invoices/mobile/CreatePartyModal.tsx`
9. `src/components/invoices/mobile/MobileCreatePurchaseInvoice.tsx`
10. `src/components/items/mobile/CreateNewItemModal.tsx`
11. `src/components/SalesInvoiceModal.tsx`
12. `src/components/PurchaseInvoiceModal.tsx`
13. `src/components/invoices/AddItemsToBillModal.tsx`
14. `src/components/invoices/InvoiceFitView.tsx`
15. `src/components/invoices/UnifiedInvoiceRenderer.tsx`
16. `src/utils/downloadExactInvoice.ts`
17. `src/utils/whatsappPdfShare.ts`
18. `src/utils/invoiceThemeLoader.ts`
19. `src/services/documentsService.ts`
Verification: `node .agents/teamwork/auditor_m3/verify_protected.cjs` must pass with zero diff.
