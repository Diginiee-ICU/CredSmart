## 2026-10-31T11:47:39Z

You are the Milestone 1 Remediation Worker (teamwork_worker) for CredSmart.

Your assigned working directory is:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1_round2

Your Parent Agent (Orchestrator) is:
4ca3c226-daa7-4621-95f6-7c629c003e5f

Read the authoritative user request first:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md

Read the project blueprint and design standards:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\credsmart-landing-design\SKILL.md
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\credsmart-minimal-design-system\SKILL.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Background & Context:
In Milestone 1 Iteration 1 Gate, Reviewer 2 found a layout defect in `src/components/public/PublicHeader.tsx`:
When `mobileMenuOpen === true`, the mobile drawer container was rendered as an in-flow flex child inside the horizontal flex header `<header className="flex items-center ...">`, squishing both the header bar and the mobile drawer into 50% width columns, clipping ~250px of content off the top, and causing horizontal overflow. Additionally, clicking same-page anchor links on `/` bypassed React Router navigation, leaving `location.hash` stale and preventing active link highlighting.

Explorer M1 Round 2 has thoroughly researched and documented the complete solution in:
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_r2\handoff.md
c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m1_r2\remediation.patch

Exclusive File Write Ownership:
You have exclusive write access to ONLY these three files:
1. `src/components/public/PublicHeader.tsx`
2. `src/test/publicShellComponents.test.tsx`
3. `src/test/challengerM1NavigationButtonsAdversarial.test.tsx`
Under NO circumstances may you modify any of the 19 quarantined invoice files or any other files.

Your Task:
1. In `src/components/public/PublicHeader.tsx`:
   - Line 217 (Mobile Drawer container): Update className and add `data-testid="mobile-drawer"`:
     ```tsx
     <div
       data-testid="mobile-drawer"
       className="lg:hidden absolute top-full left-0 right-0 w-full max-h-[calc(100vh-3rem)] overflow-y-auto border-b border-slate-200 bg-white px-4 py-4 shadow-xl animate-in slide-in-from-top-4 duration-200"
     >
     ```
   - Lines 81-87 (Anchor click handler): In the else branch (when on root path `/`), after scrolling element into view, call `navigate(`/${targetHash}`)` instead of `window.history.pushState(null, "", `/${targetHash}`)` so React Router's location state is properly synchronized.
2. In `src/test/publicShellComponents.test.tsx`:
   - Add two explicit regression test cases inside `describe("PublicHeader", ...)`:
     a. Test that toggling hamburger renders `screen.getByTestId("mobile-drawer")` with classes `absolute`, `top-full`, `left-0`, `right-0`, `w-full`, `max-h-[calc(100vh-3rem)]`, and `overflow-y-auto`.
     b. Test that clicking same-page anchor link calls `mockNavigate("/#suites")` and `scrollIntoView`.
3. In `src/test/challengerM1NavigationButtonsAdversarial.test.tsx`:
   - Lines 152-177: Update the test assertion so that it expects `mockNavigate` to be called with `"/#suites"` when clicking the anchor link on `/`, rather than expecting `mockNavigate` not to be called.
4. Run all verification checks using terminal commands:
   - `node .agents/teamwork/auditor_m3/verify_protected.cjs` (Must verify 19/19 protected invoice files are 100% untouched)
   - `node ./node_modules/typescript/bin/tsc --noEmit` (Must be clean, 0 diagnostics)
   - `node ./node_modules/vitest/vitest.mjs run src/test/publicShellComponents.test.tsx` (Must pass 100%)
   - `node ./node_modules/vitest/vitest.mjs run src/test/challengerM1NavigationButtonsAdversarial.test.tsx src/test/m1AdversarialChallenge.test.tsx` (Must pass 100%)
   - `node ./node_modules/vitest/vitest.mjs run src/test/e2e/publicPages.e2e.test.tsx` (Must pass 100%)

Deliverables:
- Implement the changes cleanly.
- Verify all tests and builds pass.
- Write your complete handoff report to:
  `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1_round2\handoff.md`
- Once finished, send a message back to parent (`4ca3c226-daa7-4621-95f6-7c629c003e5f`) summarizing your changes, verification results, and report location.
