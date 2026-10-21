# Project Plan: CredSmart Mobile View Redesign

## Goal
Execute a complete from-scratch mobile view redesign of the CredSmart ERP & POS application following a Clean High-Density Retail Minimal (Stripe / Shopify POS) aesthetic. Redesign global mobile shell, floating bottom navigation dock, Dashboard, Tally import banner, 2x2 financial ledger cards, quick actions, POS billing touch layout, invoice lists, and inventory cards, strictly preserving 100% desktop invariance.

## Phase 0: Survey & Codebase Investigation
1. Dispatch 3 parallel Explorers / Spec Miners:
   - Explorer 1: Global App Shell, Navigation, Layouts (`AppLayout.tsx`, `AppSidebar.tsx`, bottom bar, header, safe area CSS).
   - Explorer 2: Dashboard Experience (`Dashboard.tsx`, Tally banner, financial cards, quick actions, recent transactions).
   - Explorer 3: POS Billing, Invoices & Catalog (`POS.tsx`, `Inventory.tsx`, `Sales.tsx`, `MobileCreateInvoice.tsx`).
2. Synthesize findings into `PROJECT.md` Feature Inventory & Architecture.

## Phase 1: Milestone Decomposition & Track Architecture
1. Define 4-5 focused milestones with strict file write ownership.
2. Spawn Dual Tracks:
   - Implementation Track (Milestone-by-milestone implementation).
   - E2E Testing Track (Requirement-driven opaque-box test suite across Tiers 1-4).

## Phase 2: Implementation Milestones
- **Milestone 1**: Mobile Shell & Floating Bottom Navigation Dock (`AppLayout.tsx`, `MobileHeader.tsx`, `MobileBottomDock.tsx`).
- **Milestone 2**: Clean High-Density Dashboard & Financial Ledger (`MobileDashboard.tsx`, 2x2 summary cards, quick action strip, recent activity feed, Tally banner).
- **Milestone 3**: Touch-First POS Billing & Catalog Layout (`MobilePOSView.tsx`, cart sheet, touch barcode scanner).
- **Milestone 4**: High-Density Invoice & Inventory Mobile Views (`MobileSalesList.tsx`, `MobileInventoryList.tsx`).
- **Milestone 5**: Full Integration, E2E Test Pass (Tiers 1-4) & Adversarial Coverage Hardening (Tier 5).

## Phase 3: Acceptance & Handoff
1. Ensure zero TypeScript errors (`tsc --noEmit`).
2. Ensure all 188+ Vitest test suites pass with 0 regressions.
3. Reviewer approval & Forensic Integrity clean audit.
4. Final completion report to Sentinel.
