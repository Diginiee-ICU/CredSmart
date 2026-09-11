---
name: ultra-master-seo
description: >-
  Ultra-high master level SEO standard for CredSmart by CredAlert. Defines full-stack search engine optimization,
  Schema.org JSON-LD structured data, Generative Engine Optimization (GEO / llms.txt), Core Web Vitals,
  social graph previews, dynamic meta hydration, and strict crawler privacy enforcement for protected business routes.
---

# Ultra-High Master Level SEO Design & Implementation Standard

This skill establishes the production SEO architecture, indexing rules, structured data standards, and Generative AI optimization guidelines for CredSmart by CredAlert (`https://pos.credalert.bussiness/`).

---

## 1. Core Principles & Domain Architecture

- **Canonical Base URL**: `https://pos.credalert.bussiness/` (All canonical tags, sitemaps, OpenGraph links, and Schema entities must resolve to this absolute origin).
- **Target Audience / Locale**: Indian Businesses, Retailers, Wholesalers, Distributors, MSMEs (`en-IN`).
- **Core Search Keywords**:
  - `Free GST billing software India`
  - `Free POS software for retail shop`
  - `Vyapar free alternative`
  - `myBillBook free alternative`
  - `GST invoice generator CGST SGST IGST`
  - `Customer Udhar Khata app`
  - `Thermal POS printer billing software`
  - `Free inventory and godown management software`
  - `CredAlert commercial credit risk intelligence`

---

## 2. Technical SEO & Indexing Directives

### A. Robots.txt Specification (`/robots.txt`)
- **Public Routes (Allowed)**:
  - `/`, `/features`, `/pricing`, `/gst-billing-guide`, `/compare-vyapar`, `/about`, `/contact`, `/security`, `/faq`, `/privacy-policy`, `/terms-of-service`, `/auth`
- **Protected Internal ERP/POS Routes (Strictly Disallowed)**:
  - `/dashboard`, `/checkout`, `/pos`, `/sales`, `/sales-history`, `/purchases`, `/purchase-returns`, `/items`, `/inventory`, `/godown`, `/parties`, `/customers`, `/customer-ledger`, `/suppliers`, `/discovery`, `/cash-bank`, `/expenses`, `/reports`, `/analytics`, `/e-invoicing`, `/automated-bills`, `/barcode`, `/settings`, `/business-settings`, `/invoice-settings`, `/print-settings`, `/staff`, `/activity-log`
- **Host & Sitemap**:
  - `Host: https://pos.credalert.bussiness/`
  - `Sitemap: https://pos.credalert.bussiness/sitemap.xml`

### B. XML Sitemap Specification (`/sitemap.xml`)
- High priority (`1.0`): Homepage `/`
- Core product pages (`0.9`): `/features`, `/pricing`
- Guides & Comparisons (`0.85`): `/gst-billing-guide`, `/compare-vyapar`
- Trust & FAQ (`0.80`): `/security`, `/faq`
- Company (`0.75`): `/about`, `/contact`
- Legal (`0.50`): `/privacy-policy`, `/terms-of-service`

---

## 3. Rich Structured Data (Schema.org JSON-LD)

Every public marketing route must be equipped with relevant Schema.org JSON-LD scripts:

1. **`Organization`**:
   - `name`: "CredSmart by CredAlert"
   - `url`: `https://pos.credalert.bussiness/`
   - `logo`: `https://pos.credalert.bussiness/favicon.png`
   - `description`: "India's all-in-one completely free business management and GST billing software."
2. **`SoftwareApplication`**:
   - `applicationCategory`: "BusinessApplication"
   - `operatingSystem`: "Web, Android, iOS, Windows, macOS"
   - `offers`: `{ "@type": "Offer", "price": "0", "priceCurrency": "INR" }`
   - `aggregateRating`: `{ "@type": "AggregateRating", "ratingValue": "4.9", "reviewCount": "2480" }`
3. **`WebSite`**:
   - Includes `potentialAction: SearchAction` for commercial discovery.
4. **`FAQPage`**:
   - Array of `Question` and `Answer` entities matching top search queries.
5. **`BreadcrumbList`**:
   - Hierarchical navigational breadcrumbs for deep public guides.
6. **`HowTo` & `Article`**:
   - Step-by-step guides for GST invoice creation and thermal printing workflows.

---

## 4. OpenGraph & Twitter Social Cards

- **OG Tags**: `og:title`, `og:description`, `og:type`, `og:url`, `og:image`, `og:site_name`, `og:locale`.
- **Twitter Card**: `summary_large_image`, `twitter:site`, `twitter:creator`, `twitter:image`.
- **Optimal Image Dimensions**: `1200 x 630 px` with clear typography and brand crest.

---

## 5. Generative Engine Optimization (GEO / `llms.txt`)

- Maintain `/llms.txt` and `/llms-full.txt` at the root for AI search engines (Perplexity, ChatGPT, Claude, Gemini).
- Include comprehensive markdown documentation: Product identity, feature inventory, ₹0 pricing matrix, competitor alternatives, technical specifications, and key FAQ answers.

---

## 6. Dynamic Client-Side Meta Hydration (`SEOHead.tsx`)

- React component that synchronizes `document.title`, primary `<meta>`, canonical `<link>`, social graph tags, and `<script type="application/ld+json">` during client-side SPA route transitions.

---

## 7. Strict Protected Route Invariance Rule

> **MANDATORY POLICY**:
> Never expose, index, or alter protected business logic and operational ERP/POS routes (`/dashboard`, `/pos`, `/sales`, `/inventory`, etc.).
> All SEO optimizations are strictly isolated to public landing pages, marketing guides, root metadata files, and client-side head injectors.
