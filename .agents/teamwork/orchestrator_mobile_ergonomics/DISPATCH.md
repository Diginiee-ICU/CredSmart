# Orchestrator Dispatch — Universal Header Logo Architecture & Full CRM/POS Mobile Ergonomics

## Mission
Execute complete implementation for placing the official CredSmart platform shield logo permanently in the universal command bar alongside the tenant's store branding, and delivering dedicated touch-first mobile ergonomics across all pages of CRM and POS & Billing without altering desktop workflows.

## Source Requirements
Read `.agents/teamwork/ORIGINAL_REQUEST.md` (last section `## 2026-10-27T02:39:33Z`).

## Key Deliverables & Acceptance Criteria
1. **Permanent CredSmart Logo & Tenant Store Dual Lockup in Universal Header**:
   - Far Left: Permanent CredSmart platform mark using `/favicon.png` or `CredSmartShieldIcon` (`w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 p-1 shadow-2xs`) paired with styled `CredSmart` wordmark (`hidden sm:inline font-bold text-sm tracking-tight text-slate-900 dark:text-white`).
   - Tenant Business Selector: Adjacent hairline divider (`border-slate-200 dark:border-slate-800`), active Store Switcher dropdown pill with tenant store logo (`org?.logo_url` or `<Building2 />`) and `{org?.name}`.
   - Mobile Header Viewport (< 768px): Strict 48px slim header height (`h-12`), compact 28x28px CredSmart Shield Logo paired with compact store pill, zero horizontal overflow/wrapping on 360px–430px screens.

2. **Touch-First Mobile POS Billing Terminal (`/pos`, `/checkout`)**:
   - Single-Column Mobile POS Terminal on < 768px: Sticky top bar (back to dashboard, barcode scan, search input).
   - Horizontal category chips with 1-tap filtering.
   - Scrollable high-density product cards (4-5 visible per scroll) with item name, price, stock badge, and 1-tap `+`/`-` stepper.
   - Floating Bottom Cart Dock (`fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]`) with total count, grand total (₹), and "Review Cart & Checkout" CTA.
   - 1-Tap Checkout Bottom Drawer with customer details, payment method selection, and "Generate Bill & Print" CTA.

3. **Comprehensive Mobile CRM Suite Ergonomics (All CRM Pages)**:
   - All 9 CRM routes (`/crm`, `/crm/roles`, `/crm/attendance`, `/crm/salary`, `/crm/tasks`, `/crm/meet`, `/crm/broadcasts`, `/crm/ai`, `/crm/support`) render with zero horizontal scrollbar on a 375px mobile screen.
   - CRM Command Centre (`/crm`, `/crm/dashboard`): Polish mobile header & quick tools grid for 360px–430px viewports.
   - Task Management (`/crm/tasks`): Dedicated mobile card view with swipeable/1-tap status transitions, priority pills, and bottom-sheet task creation drawer.
   - Salary & Payroll (`/crm/salary`): High-density staff payroll cards replacing wide horizontal table on mobile, net pay, advance balance, 1-tap payslip.
   - Role Management (`/crm/roles`): Staff provisioning and role assignment matrix in touch-friendly full-height bottom drawer with 44px tap targets.
   - Meet, Broadcasts, AI Assistant, Support: Clean mobile-first layout with bottom-anchored inputs, thumb-reachable action buttons, zero edge clipping.

4. **Complete Mobile POS & Billing Ledger & Inventory Pages**:
   - Sales & Purchases (`/sales`, `/purchases`): Dense transaction cards on mobile with swipeable/quick actions (print, WhatsApp share, edit/view).
   - Parties (`/customers`, `/suppliers`): 4-5 cards per viewport with 1-tap call/WhatsApp buttons, credit balance indicators, quick ledger drawers.
   - Inventory & Godowns (`/inventory`, `/godown`, `/items`): Compact catalog cards with thumbnail, SKU, stock quantity pill, selling price, quick stock adjustment button.
   - Reports (`/reports`): Summary reports in mobile-optimized metric cards and collapsible category accordions.
   - Cash & Bank (`/cash-and-bank`): Responsive account cards and clean ledger transaction stream.

5. **Desktop Preservation & Zero Regression**:
   - Desktop layouts (>= 768px) must remain 100% pixel-perfect and functionally identical.
   - Never modify underlying business logic, Supabase real-time subscriptions, GST tax calculation engines, routes, role permissions, or printing pipelines.
   - Full production build (`npm run build`) and test suite pass cleanly.


## 2026-10-27T02:43:54Z
You are the Project Orchestrator for the Universal Header Logo Architecture & Full CRM/POS Mobile Ergonomics project.
Your working directory is c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_mobile_ergonomics.
Read your dispatch instructions in c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_mobile_ergonomics\DISPATCH.md and the original user request in c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (last section ## 2026-10-27T02:39:33Z).
Maintain your plan.md, progress.md, and BRIEFING.md in your working directory.
Decompose the mission into milestones, dispatch specialized subagents to implement and review changes, ensure 100% desktop preservation with zero regressions, verify with tests and production build (npm run build), and deliver a complete final report when victory is reached.
