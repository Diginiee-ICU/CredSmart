## 2026-10-27T03:06:59Z
You are a Worker subagent (Worker Milestone 1: Universal Header Dual Lockup).
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1
Read ORIGINAL_REQUEST.md at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (specifically the last section ## 2026-10-27T02:39:33Z).
Read PROJECT.md at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md.
Read Explorer 1's detailed findings and architectural blueprint in:
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_1\analysis.md
- c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_1\handoff.md
Read user rules in: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
- src/components/AppLayout.tsx
- src/test/universalHeaderDualLockup.test.tsx (create unit/integration test)
- src/test/desktopShellMilestone2.challenger.test.tsx (update lines 55-64 brand regex to match new permanent shield mark per Explorer 1 handoff)

TASK:
1. Implement the Permanent CredSmart Shield Logo & Tenant Store Dual Lockup in src/components/AppLayout.tsx:
   a) Far Left Platform Mark:
      - Unconditionally render the CredSmart platform shield using /favicon.png inside:
        `w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 p-1 shadow-2xs overflow-hidden flex items-center justify-center shrink-0`
      - Paired with styled `CredSmart` wordmark:
        `<span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white font-sans hidden sm:inline">CredSmart</span>`
      - Decouple this completely from `org.logo_url` and `org.name`.
   b) Adjacent Store Switcher Trigger:
      - Place immediately adjacent to the platform mark, separated by a 1px hairline divider:
        `<div className="h-4 w-px bg-slate-200 dark:bg-slate-800 shrink-0 mx-0.5 sm:mx-1" />`
      - Render the active Store Switcher dropdown pill displaying tenant store logo (`org?.logo_url` or `<Building2 />`) and `{org?.name || "My Business"}`.
      - Make the trigger visible on mobile: `flex h-7 sm:h-8 px-1.5 sm:px-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 items-center gap-1.5 shadow-2xs transition-colors cursor-pointer select-none max-w-[100px] xs:max-w-[130px] sm:max-w-[180px] lg:max-w-[220px]`.
   c) Mobile Viewport (< 768px):
      - Ensure strict 48px slim header height (`h-12` / `h-[calc(3rem+env(safe-area-inset-top,0px))]`) and 52px desktop height (`md:h-13`).
      - Compact 28x28px shield logo paired with compact store pill.
      - Enforce zero horizontal overflow/wrapping on 360px-430px screens. Ensure right-side controls (search, action (+), bell, profile) fit with ample margin.
   d) 100% Desktop Preservation on >= 768px:
      - Desktop command palette (⌘K), split action button, suite switcher, notifications, profile, and theme toggle remain 100% intact.
2. Update `src/test/desktopShellMilestone2.challenger.test.tsx` (lines 55-64) where it checks the old Sparkles/bg-blue-600 icon, updating it to assert the permanent /favicon.png CredSmart shield mark.
3. Write a comprehensive test suite in `src/test/universalHeaderDualLockup.test.tsx` verifying:
   - Platform shield mark renders `/favicon.png` regardless of whether org has a logo.
   - Wordmark 'CredSmart' is rendered.
   - Adjacent Store Switcher pill renders org.name and org.logo (or Building2 fallback).
   - Mobile classes enforce 48px height (`h-12`) and desktop classes enforce 52px height (`md:h-13`).
4. Run tests and typecheck:
   - `cmd /c npx vitest run src/test/universalHeaderDualLockup.test.tsx`
   - `cmd /c npx vitest run src/test/desktopShellMilestone2.challenger.test.tsx`
   - `cmd /c npx vitest run src/test/mobileErgonomicsChallenger.test.ts`
   - `cmd /c npx tsc --noEmit`
5. Write your complete completion report in:
   c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1\handoff.md
6. Send completion message via send_message to orchestrator (conversation ID: d2d7b35b-d1d5-45b5-9a65-d7a02d968987).
