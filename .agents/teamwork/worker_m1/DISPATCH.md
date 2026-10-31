## 2026-10-31T10:52:24Z
You are Worker M1 (M1 Navigation & Shell Worker).
Your identity: teamwork_worker
Your assigned working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1
Project root: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart

MANDATORY FIRST STEP:
Read the authoritative user request at:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
Read the project master document at:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE FILE OWNERSHIP:
You exclusively own and may edit only the following files:
1. `tailwind.config.ts` (extend theme spacing to include "4.5" and "9.5")
2. `src/components/public/PublicHeader.tsx`
3. `src/components/public/PublicFooter.tsx`
4. `src/components/public/PublicConversionBanner.tsx`
5. `src/components/public/PublicLayout.tsx`
6. `src/test/publicShellComponents.test.tsx` (create automated unit/integration test for M1 components)
DO NOT touch any other source files. NEVER touch any of the 19 quarantined invoice files!

INPUT EXPLORER REPORTS (Read before modifying code):
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_1\handoff.md (PublicHeader specifications & diff blueprints)
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_2\handoff.md (PublicFooter, PublicConversionBanner, PublicLayout specifications & blueprints)
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_3\handoff.md (Design token standards, spacing gap analysis, verification blueprint)

OBJECTIVE & IMPLEMENTATION TASKS:
Execute Milestone 1 (Features F1 through F5) with zero regression:
1. `tailwind.config.ts`:
   - Under `theme.extend.spacing`, add:
     `"4.5": "1.125rem",`
     `"9.5": "2.375rem",`
   - This ensures `h-9.5`, `px-4.5`, etc. compile to exact pixel values (38px and 18px).
2. `src/components/public/PublicHeader.tsx`:
   - Fix double-slash bug in `handleNavClick`: navigate to `/${href.replace(/^\/+/, '')}` instead of `/${href}`.
   - Add `useEffect` on `[location.pathname, location.hash]` to smoothly scroll to anchor elements (`#suites`, etc.) when navigating from subpages.
   - Update navigation links: explicitly include "POS & Billing ERP" and "Workforce CRM" both pointing to `/#suites`.
   - Standardize desktop action buttons:
     - Download App: `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs`
     - Open Workspace (logged in): `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs`
     - Login: `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs`
     - Start Free (elevated CTA): `h-9.5 px-4 rounded-lg text-sm font-semibold shadow-xs` (or `h-8.5 px-3.5`)
   - Header height: enforce `h-12 sm:h-13` (48px mobile, 52px desktop) to prevent layout shifts.
   - Mobile navigation drawer: ensure hamburger touch target is >= 44x44px; use client-side SPA navigation for route links (`/features`, `/pricing`, `/about`, `/contact`) closing drawer on click.
3. `src/components/public/PublicFooter.tsx`:
   - Balance dual suites: Add dedicated "Workforce CRM" column with 7 feature links (Attendance, Monthly Payroll, Task Boards, Meet & Huddle, Roles & Permissions, AI Voice Copilot, Team Pulse).
   - Rebalance grid to 6 columns (`grid-cols-2 md:grid-cols-4 lg:grid-cols-6`) with brand column spanning 2 cols on mobile/desktop, 4 cols on tablet.
   - Standardize badges to `text-[11px] font-semibold`.
   - Add download chips (`Smartphone` for Android APK, `Monitor` for Windows PC) in the brand column.
4. `src/components/public/PublicConversionBanner.tsx`:
   - Remediate button bloat: replace line 68 `h-13 px-8 rounded-xl shadow-2xl` with `h-9.5 px-4.5 rounded-lg text-sm font-semibold shadow-xs active:scale-[0.98] transition-colors duration-150`.
   - Refine padding and dimensions to eliminate viewport scroll sprawl.
   - Update copy to represent the dual-suite platform.
5. `src/components/public/PublicLayout.tsx`:
   - Hash-aware scroll behavior: when route changes with hash (`/#suites`), avoid forcing `window.scrollTo(0,0)`, allow smooth scroll to element.
   - Add `overflow-x-hidden relative flex-1 min-h-0` to `<main>`.
6. `src/test/publicShellComponents.test.tsx`:
   - Write comprehensive unit tests for `PublicHeader`, `PublicFooter`, `PublicConversionBanner`, and `PublicLayout` verifying links, button classes, hash routing, and dual-suite rendering.

MANDATORY VERIFICATION CHECKS:
Run each command and document the full output in your handoff report:
1. `node .agents/teamwork/auditor_m3/verify_protected.cjs` (Must pass with 19/19 clean, 0 diff)
2. `node ./node_modules/typescript/bin/tsc --noEmit` (Must pass with 0 errors)
3. `node ./node_modules/vitest/vitest.mjs run src/test/publicShellComponents.test.tsx` (Must pass 100%)
4. `node ./node_modules/vitest/vitest.mjs run src/crm/test/ src/test/e2e/` (Regression test suites must pass 100%)

DELIVERABLE:
Write your final report to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1\handoff.md` and send a message back to the orchestrator.
