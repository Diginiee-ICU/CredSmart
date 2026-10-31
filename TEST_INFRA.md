# CredSmart Desktop Public & Landing Pages — E2E Test Infrastructure

## 1. Test Philosophy & Architecture

### 1.1 Opaque-Box & Requirement-Driven
The CredSmart Desktop Public & Landing Pages E2E test suite evaluates the complete public web experience strictly from the end-user's observable perspective and the authoritative specifications in `ORIGINAL_REQUEST.md` and `PROJECT.md`. Tests do not inspect or couple to internal component implementation quirks. If a component refactors its internal state or styling pipeline while honoring interface contracts, the tests continue to pass.

### 1.2 The 4-Tier Testing Methodology
The test suite implements a rigorous 4-tier testing pyramid:

- **Tier 1: Feature Coverage (F1 through F22 in Isolation)**:
  Verifies that every single feature outlined in the PROJECT.md Feature Inventory performs its designated contract in isolation. This covers route rendering across all public routes, navigation headers, footer columns, dual-suite showcases, button size token conformance, and dynamic SEO metadata.
- **Tier 2: Boundary, Corner & Adversarial Cases**:
  Tests system resilience against rapid viewport changes (desktop `>= 768px` vs mobile `< 768px`), malformed/missing URL fragments, deep subpage navigation, invalid anchors, extreme query strings, and non-existent route handling.
- **Tier 3: Cross-Feature Combinations**:
  Exercises multi-component interactions: navigating across `/features` or `/pricing` to `/#suites`, toggling interactive preview cards between POS Retail and CRM Workforce metrics, and triggering auth/launch CTAs.
- **Tier 4: Real-World End-User Journeys**:
  Simulates comprehensive persona-driven scenarios:
  1. *MSME Merchant Exploration Journey*: Landing → Dual-Suite Showcase → POS Features → Community Free Pricing → Start Free CTA.
  2. *Enterprise HR & Ops Discovery Journey*: Landing → CRM Workforce Preview → Module Explorer → Security Architecture (DPDP 2023) → Open Workspace.
  3. *Migrating Merchant Comparison Journey*: Landing → Compare Vyapar / Compare Tally → Barcode/GST Guides → Community Free Pricing.
  4. *Support, Trust & Grievance Journey*: Landing → About CredSmart → Grievance Officer Desk (Contact form) → Legal/Terms.
  5. *Multi-Platform App Ingress Journey*: Landing → Download Modal (Android APK & Windows PC) → QR Code / Download Trigger.

---

## 2. Feature Inventory & Coverage Mapping (F1 to F22)

| # | Feature | Milestone | Authoritative Source | Primary Verification Focus | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|:---------:|----------------------|----------------------------|:------:|:------:|:------:|:------:|
| 1 | **F1: Header Navigation & Anchor Fix** | M1 | PROJECT.md § Contracts | Smooth anchor scrolling on `/`, `navigate(/#suites)` on subpages without double slashes | ✓ | ✓ | ✓ | ✓ |
| 2 | **F2: Dual-Suite Header Links** | M1 | ORIGINAL_REQUEST § R1 | "POS Billing" and "Workforce CRM" header links pointing to `#suites` | ✓ | ✓ | ✓ | ✓ |
| 3 | **F3: Header Button Standardization** | M1 | minimal-design-system § 1 | Header CTAs conform to `h-8.5 px-3 rounded-lg text-xs font-semibold` (34px) | ✓ | ✓ | — | — |
| 4 | **F4: Dual-Suite Public Footer** | M1 | ORIGINAL_REQUEST § R1 | Dark navy footer (`#0B132B`) with POS & Billing, Workforce CRM, Resources, Company & Trust | ✓ | ✓ | — | ✓ |
| 5 | **F5: Conversion Banner Refinement** | M1 | minimal-design-system § 1 | Standard CTA button sizing `h-9.5 px-4.5 rounded-lg text-sm font-semibold` (38px) | ✓ | ✓ | ✓ | — |
| 6 | **F6: Screen-Fitted Dual Hero** | M2 | ORIGINAL_REQUEST § R1, R2 | 50/50 split Hero viewport with dual CTAs, brand shield, and interactive preview | ✓ | ✓ | ✓ | ✓ |
| 7 | **F7: Interactive Dual-Suite Preview Dock**| M2 | credsmart-landing-design | Interactive card toggling between POS Retail KPIs and CRM Workforce attendance/tasks | ✓ | ✓ | ✓ | ✓ |
| 8 | **F8: Dedicated `#suites` Showcase Anchor** | M2 | ORIGINAL_REQUEST § R1 | Side-by-side balanced dual cards with direct launch buttons for both suites | ✓ | ✓ | ✓ | ✓ |
| 9 | **F9: Bounded Module Explorer** | M2 | minimal-design-system § 2 | Bounded tabbed module viewer (`max-h-[520px]`) for POS & CRM modules with 0 overflow | ✓ | ✓ | ✓ | — |
| 10 | **F10: Desktop Viewport Containment** | M2 | minimal-design-system § 2 | Screen-fitted desktop containers eliminating 6,000px sprawling vertical scroll | ✓ | ✓ | — | ✓ |
| 11 | **F11: Landing Button Refinement** | M2 | minimal-design-system § 1 | Zero bloated `h-11`/`h-12`/`px-8` bubble buttons on Landing | ✓ | ✓ | — | — |
| 12 | **F12: Dual-Suite Features Catalog** | M3 | ORIGINAL_REQUEST § R1, R2 | Features.tsx organized into Suite 1 (POS & Billing) & Suite 2 (Workforce CRM) | ✓ | ✓ | ✓ | ✓ |
| 13 | **F13: Dual-Suite Community Free Pricing**| M3 | ORIGINAL_REQUEST § R1 | ₹0 Community Lifetime Free tier in Pricing.tsx covering both POS and CRM | ✓ | ✓ | ✓ | ✓ |
| 14 | **F14: About Page Viewport Containment** | M3 | minimal-design-system § 2 | Story, MSME democratization, and statutory disclaimers in About.tsx | ✓ | ✓ | — | ✓ |
| 15 | **F15: Contact Page & Canonical Fix** | M3 | ultra-master-seo § 1 | Grievance Officer desk; canonical fixed to `https://pos.credalert.bussiness/contact` | ✓ | ✓ | — | ✓ |
| 16 | **F16: Security Page Desktop Layout** | M4 | ORIGINAL_REQUEST § R1, R2 | 256-bit encryption, Supabase RLS, and DPDP Act 2023 compliance layout | ✓ | ✓ | — | ✓ |
| 17 | **F17: Dual-Suite FAQ Accordion** | M4 | ORIGINAL_REQUEST § R1 | Searchable FAQ with dedicated POS Billing & Workforce CRM categories | ✓ | ✓ | ✓ | — |
| 18 | **F18: Guides & Comparison Pages Polish** | M4 | minimal-design-system | Standardized buttons, layout containment, and typography across comparison pages | ✓ | ✓ | ✓ | ✓ |
| 19 | **F19: Crawler Privacy Guard & robots.txt**| M5 | ultra-master-seo § 4 | Protected route `noindex, nofollow` guard and `public/robots.txt` disallows | ✓ | ✓ | — | — |
| 20 | **F20: Generative AI SEO (llms-full.txt)** | M5 | ultra-master-seo § 5 | Comprehensive `public/llms-full.txt` documenting all 12+ ERP & CRM modules | ✓ | ✓ | — | — |
| 21 | **F21: Dynamic JSON-LD Schema Validation**| M5 | ultra-master-seo § 2, 3 | Valid Schema.org JSON-LD and OpenGraph cards across all public routes | ✓ | ✓ | — | ✓ |
| 22 | **F22: SEO & Privacy Automated Test Suite**| M5 | ultra-master-seo § 7 | Automated Vitest test suites for SEOHead and crawler privacy tags | ✓ | ✓ | — | — |

---

## 3. Test Architecture & Runner Setup

- **Test Framework**: Vitest v3.2.4 with `@testing-library/react` and `@testing-library/jest-dom` in `jsdom` environment.
- **Test File Location**: `src/test/e2e/publicPages.e2e.test.tsx`
- **Execution Command**:
  ```bash
  # Windows PowerShell / CMD:
  cmd /c npx vitest run src/test/e2e/publicPages.e2e.test.tsx

  # All E2E Suites:
  cmd /c npx vitest run src/test/e2e/
  ```
- **Type Checking**:
  ```bash
  cmd /c npx tsc --noEmit
  ```
- **Quarantine Invariance**:
  All 19 quarantine files listed in `PROJECT.md` remain 100% untouched.

---

## 4. Pass/Fail Criteria & Target Metrics

1. **Pass Rate**: 100% pass rate with exit code 0.
2. **TypeScript Health**: 0 type diagnostics or build failures.
3. **Execution Time**: Entire public pages E2E suite completes in < 15 seconds.
4. **Coverage Density**:
   - Tier 1: ≥ 22 feature coverage tests (at least 1 dedicated test per F1–F22).
   - Tier 2: ≥ 15 boundary & adversarial cases.
   - Tier 3: ≥ 10 cross-feature combinations.
   - Tier 4: ≥ 5 comprehensive real-world end-user journeys.
   - **Total**: ≥ 60 robust E2E test cases.
