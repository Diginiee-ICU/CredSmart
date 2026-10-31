Design production-ready desktop public pages and landing pages for CredSmart, presenting the dual-suite platform (POS & Billing ERP + Workforce CRM) with full desktop viewport optimization and high visual fidelity for live deployment.

Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart
Integrity mode: development

## Requirements

### R1. Desktop Public and Landing Pages Design
Redesign and implement production-ready desktop public pages and landing layouts for CredSmart, presenting both suites of the platform (POS & Billing ERP + Workforce CRM). The pages to deliver include `src/pages/Landing.tsx`, `src/components/public/PublicHeader.tsx`, `src/components/public/PublicFooter.tsx`, `src/pages/public/Features.tsx`, `src/pages/public/Pricing.tsx`, `src/pages/public/About.tsx`, `src/pages/public/Contact.tsx`, `src/pages/public/Security.tsx`, `src/pages/public/FaqPage.tsx`, and associated comparison and guide pages.

### R2. Desktop Viewport Containment & Design System Compliance
Ensure desktop layouts strictly adhere to the master standards in `.agents/rules/minimal-design-system.md`, `.agents/skills/credsmart-landing-design/SKILL.md`, and `.agents/skills/credsmart-minimal-design-system/SKILL.md`. Layouts must provide balanced whitespace, crisp 1px borders, typography hierarchy using standard sans and tabular monospace fonts, cohesive electric blue accents with semantic indicators, and screen-fitted desktop viewport optimization without long, tedious unconstrained vertical scrolling.

### R3. Full-Stack Search Engine Optimization (SEO)
Comply with `.agents/skills/ultra-master-seo/SKILL.md` across all public routes, ensuring comprehensive semantic metadata, OpenGraph/Twitter cards, structured JSON-LD schemas, and crawler privacy on protected business routes.

### R4. Core System Invariance and Non-Regression
Preserve all 19 quarantine invoice files, core POS billing functionality, and store roles with zero regression. Desktop public page changes must not break existing mobile divergence, authenticated business workflows, or Supabase real-time integrations.

## Acceptance Criteria

### Build & Test Integrity
- [ ] `npm run test` passes with zero test failures.
- [ ] `npm run build` succeeds with zero TypeScript or bundling errors.
- [ ] All 19 quarantine invoice files remain completely intact and unmodified.

### Page Delivery & Routing
- [ ] All target public desktop routes render without runtime errors: `/`, `/features`, `/pricing`, `/about`, `/contact`, `/security`, `/faq`, and comparison/guide routes.
- [ ] `PublicHeader.tsx` and `PublicFooter.tsx` provide unified, consistent desktop navigation across all public pages.
- [ ] Both product suites (POS & Billing ERP and Workforce CRM) are clearly articulated and navigable on desktop.

### Design System & Viewport Conformance
- [ ] Desktop layouts (>= 768px) respect viewport containment and design rules without bloated buttons or unconstrained overflowing containers.
- [ ] Redundant micro-prose is eliminated and typography adheres to the Inter / tabular monospace font hierarchy.
- [ ] Neutral surface color palette (`#F8FAFC` / `#FFFFFF` light, `#090D16` / `#111726` dark) with single electric blue accent is consistently applied.

### SEO Verification
- [ ] Valid Schema.org JSON-LD structured data and page meta tags are present on public routes according to `.agents/skills/ultra-master-seo/SKILL.md`.
