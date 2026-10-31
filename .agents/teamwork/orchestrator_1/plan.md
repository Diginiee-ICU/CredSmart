# Orchestration Plan: Desktop Public and Landing Pages Design

## Objective
Design production-ready desktop public pages and landing pages for CredSmart, presenting the dual-suite platform (POS & Billing ERP + Workforce CRM) with full desktop viewport optimization and high visual fidelity for live deployment.

## Phase 0: Survey & Technical Mapping
- [ ] Spawn 3 Survey Agents in parallel:
  - Agent 1 (`teamwork_explorer`): Survey existing public pages, routes, headers, footers, guides, comparison pages, and routing configuration.
  - Agent 2 (`teamwork_spec_miner`): Survey design rules, UI tokens, landing page visual standard (`credsmart-landing-design`, `credsmart-minimal-design-system`, minimal design rules), dual-suite presentation requirements.
  - Agent 3 (`teamwork_explorer`): Survey test suites, build configuration, baseline test runs, quarantine invoice files (19 files), and SEO architecture (`ultra-master-seo`).
- [ ] Synthesize Survey Reports into `PROJECT.md` (Architecture, Feature Inventory, Milestones, Code Layout, Interface Contracts).

## Phase 1: Dual Track Launch
- [ ] Track A: E2E Testing Track Orchestrator (`e2e_orch_public`)
  - Formulate `TEST_INFRA.md`
  - Design Tiers 1-4 tests (Feature, Boundary, Cross-feature, Real-world)
  - Publish `TEST_READY.md`
- [ ] Track B: Implementation Track Milestones
  - Milestone 1: Navigation & Layout Shell (`PublicHeader.tsx`, `PublicFooter.tsx`, Global Public Shell, Mobile-Desktop Divergence)
  - Milestone 2: Landing Page (`src/pages/Landing.tsx`) Dual-Suite Presentation (POS & Billing ERP + Workforce CRM, Interactive Switcher/Showcase, Viewport Containment)
  - Milestone 3: Core Public Pages (`Features.tsx`, `Pricing.tsx`, `About.tsx`, `Contact.tsx`)
  - Milestone 4: Trust, Security & Knowledge Pages (`Security.tsx`, `FaqPage.tsx`, Comparison and Guide pages)
  - Milestone 5: Full-Stack SEO & Dynamic Schema Hydration (`ultra-master-seo`, OpenGraph, Twitter Cards, JSON-LD, robots.txt, sitemap)
- [ ] Phase 2: Final Milestone (100% E2E tests pass, Tier 5 Adversarial Coverage Hardening with Challengers, Final Forensic Audit).
