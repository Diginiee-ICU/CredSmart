## 2026-10-31T12:27:23Z
You are Worker M2 Landing (teamwork_worker) for CredSmart.

Your assigned working directory is:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m2_landing

Your Parent Agent (Orchestrator) is:
4ca3c226-daa7-4621-95f6-7c629c003e5f

Read the authoritative user request first:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md

Read the project blueprint and design standards:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\credsmart-landing-design\SKILL.md
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\credsmart-minimal-design-system\SKILL.md

Read the Authoritative Milestone 2 Blueprints:
1. `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_landing_1\handoff.md` (Hero layout, Viewport containment, #suites section, button token audit)
2. `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_landing_2\handoff.md` (Dual-Suite Preview Dock architecture)
3. `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_landing_2\proposed_HeroDashboardCard.tsx` (Complete, verified reference implementation for HeroDashboardCard)
4. `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m2_landing_3\handoff.md` (Bounded Module Explorer max-h-[520px], button audit, test harness strategy)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Exclusive File Write Ownership:
You have exclusive write access to ONLY these three files:
1. `src/components/public/HeroDashboardCard.tsx`
2. `src/pages/Landing.tsx`
3. `src/test/landingMilestone2.test.tsx`
Under NO circumstances may you modify any of the 19 quarantined invoice files or any other files.

Your Implementation Tasks:
1. `src/components/public/HeroDashboardCard.tsx`:
   - Replace/upgrade with the complete dual-suite interactive preview dock as architected in `proposed_HeroDashboardCard.tsx`.
   - Feature the interactive segmented control: `[ 🛒 Retail POS & Billing ]` | `[ 👥 Workforce CRM ]`.
   - View A (POS & Billing ERP): Retain all required DOM test targets (`TO COLLECT`, `TO PAY`, `CASH & BANK`, `Recent Reconciled Activity`, `CredSmart v1.1.4`, sidebar buttons `POS Billing`, `Sales`, `Items / Inventory`), while implementing the fast-billing terminal workbench with quick barcode scan input, item list with tabular numbers (`font-mono tabular-nums`), GST breakdown, and payment tender buttons.
   - View B (Workforce CRM): Implement the real-time staff attendance ledger with live GPS geofence distance tags, field task dispatch board, lead stage kanban pills, and automated daily sales & attendance metrics with tabular numbers (`font-mono tabular-nums`).
   - Strict screen-fitted containment: capped height ~440px–460px, 1px hairline borders (`border-slate-200/80` light, `border-slate-800` dark), subtle micro-shadows, zero glowing halos.

2. `src/pages/Landing.tsx`:
   - Screen-Fitted 50/50 Desktop Hero Section:
     - Padding: `pt-5 sm:pt-8 lg:pt-10 pb-8 sm:pb-10 lg:pb-12`.
     - Left column: Dual-suite badge ("CredSmart ERP & CRM Platform"), headline ("POS & Billing ERP & Workforce CRM. 100% Free."), concise value proposition, dual CTAs ("Start Free Now" `h-9.5 px-4.5 rounded-lg text-sm font-semibold shadow-xs` and "Explore Product Suites" `h-9.5 px-4.5 rounded-lg text-sm font-semibold border-slate-300`), and compact app download chip strip.
     - Right column: Integration container embedding `HeroDashboardCard.tsx`.
   - Dedicated `#suites` Section:
     - `<section id="suites" className="scroll-mt-14 ...">` with child anchors `id="billing-erp"` and `id="workforce-crm"`.
     - Side-by-side or tabbed showcase of Suite 1 (Retail POS & Billing ERP) and Suite 2 (Workforce CRM) with 6 core capabilities each, live metrics, and role-based action routes (`/checkout` for cashier vs `/billing/dashboard` for owner, and `/crm` for CRM).
   - Bounded Module Explorer:
     - Screen-fitted container `max-h-[520px]` with dual-suite tabs (6 Retail POS + 6 Workforce CRM modules).
     - 35% scrollable module list on left with crisp icons and status chips; 65% interactive active preview card on right with tabular numbers (`font-mono tabular-nums`) and deep link CTAs to `/features`.
   - Global Button Standardization:
     - Standard Action: `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs`
     - Hero CTA: `h-9.5 px-4.5 rounded-lg text-sm font-semibold shadow-xs`
     - Small Action / Pill: `h-7 px-2.5 rounded-md text-[11px] font-medium`
     - Eliminate all bloated buttons (`h-11`, `h-12`, `h-13`, `px-8`, `rounded-xl`).

3. `src/test/landingMilestone2.test.tsx`:
   - Author comprehensive automated Vitest suite verifying:
     - Section `#suites` exists in DOM and contains `billing-erp` and `workforce-crm`.
     - Dual-suite preview dock toggles between POS and CRM views on click.
     - Button tokens in Hero and `#suites` sections strictly match `h-9.5` and `h-8.5`.
     - Bounded Module Explorer renders with `max-h-[520px]` and tab switching works.

4. Run all verification checks using terminal commands:
   - `node .agents/teamwork/auditor_m3/verify_protected.cjs` (Must verify 19/19 protected invoice files are 100% untouched)
   - `node ./node_modules/typescript/bin/tsc --noEmit` (Must be clean, 0 diagnostics)
   - `node ./node_modules/vitest/vitest.mjs run src/test/landingMilestone2.test.tsx` (Must pass 100%)
   - `node ./node_modules/vitest/vitest.mjs run src/test/publicShellComponents.test.tsx` (Must pass 100%)
   - `node ./node_modules/vitest/vitest.mjs run src/test/e2e/publicPages.e2e.test.tsx` (Must pass 100%)
