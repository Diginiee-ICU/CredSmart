# DISPATCH: Worker - Milestone 1: Payroll Engine Mobile Redesign

## Target File
`src/pages/crm/SalaryManagement.tsx` (EXCLUSIVELY OWNED)

## References & Inputs
1. Detailed Blueprint & Analysis: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_1\analysis.md` and `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_1\handoff.md`
2. Shared Tokens & Patterns: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_3\handoff.md`
3. Authoritative User Request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (lines 1324-1331)
4. Master Design System: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md`

## Objectives
Implement the exact mobile layout from Mockup 1 for `SalaryManagement.tsx`:
1. **Desktop View Preservation**: Wrap existing desktop layout (lines ~1176–2075) in `<div className="hidden md:block space-y-5">...</div>` so viewports >= 768px remain 100% byte-for-byte identical.
2. **Dedicated Mobile View**: Implement `<div className="block md:hidden pb-24 px-3.5 pt-3 space-y-3.5">`:
   - **Mobile Header**: Large bold "Payroll Engine", subtitle "Staff compensation & payroll runs", primary action `+ New Profile` (Royal Blue `bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-8.5 px-3 rounded-lg shadow-2xs` triggering `openCreateProfileDrawer`) + export/refresh icon button `[ ⎋ ]` (`w-8 h-8 rounded-lg border-slate-200/80 bg-white text-slate-600`).
   - **2x2 Stat Badges**: Compact horizontal pill badges with subtle colored icon containers & right chevron:
     * `Active Profiles: N >` (Users icon, blue) -> clicks to tab `profiles`
     * `Current Month: ₹X.XX` (Calendar/Dollar icon, emerald) -> clicks to tab `payroll`
     * `Pending Advances: ₹X.XX >` (ArrowUpRight/AlertCircle, amber) -> clicks to tab `adjustments`
     * `Available Payslips: N` (FileText, purple/indigo) -> clicks to tab `payslips`
   - **Segmented Tab Bar**: Inset pill switcher (`p-1 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center`):
     * `Salary Profiles (N)`
     * `Payroll Run`
     * `Advances & Deductions`
   - **Empty State Card**: When `salaryProfiles.length === 0`, render clean white card (`rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs text-center p-8`) with circular vector illustration, "No salary profiles configured yet.", helper prompt, and `+ Add First Profile` button.
   - When `salaryProfiles.length > 0`: Clean flat `divide-y divide-slate-100 dark:divide-slate-800/60` list rows without bloated `h-11` buttons (use standard `h-8.5` / `h-7`).
   - **Quick Actions Footer**: Dual white pill buttons:
     * `[ 📋 View Past Runs ]` (triggers `setActiveTab("payroll")`)
     * `[ ⚙️ Pay Settings ]` (opens settings/profile config)
3. **Preservation**:
   - Zero modifications to the 19 protected quarantine files.
   - All state, Supabase queries, drawer controllers, and handlers remain 100% functional.
   - Run verification commands:
     * `node node_modules/typescript/bin/tsc --noEmit`
     * `node node_modules/vite/bin/vite.js build`
     * Vitest salary suites

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Completion
Update `progress.md` with your heartbeat and write your completion handoff report to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1_salary\handoff.md`.
Then send a completion message to the orchestrator.


## 2026-10-25T10:33:48Z
You are the Worker for Milestone 1: Payroll Engine Mobile Redesign (`src/pages/crm/SalaryManagement.tsx`).
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1_salary
Read your dispatch instructions at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1_salary\DISPATCH.md
MANDATORY: Read the authoritative user request at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (specifically the latest section ## 2026-10-25T10:11:33Z).
Read the survey blueprints at:
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_1\analysis.md`
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_1\handoff.md`
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_3\handoff.md`
Read the design rules at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md.

You exclusively own: `src/pages/crm/SalaryManagement.tsx`. Under NO circumstances touch any of the 19 protected invoice quarantine files.
Wrap the desktop UI in `hidden md:block` to preserve 100% of desktop views.
Implement the Mockup 1 mobile view in `block md:hidden` (Header, 2x2 stat badges, segmented tab switcher, clean empty state card with prompt, flat divide-y list rows without bloated h-11 buttons, bottom dual quick actions).
Run verification:
`node node_modules/typescript/bin/tsc --noEmit`
`node node_modules/vite/bin/vite.js build`
Run relevant Vitest suites.


## 2026-10-25T11:00:54Z
**Context**: Milestone 1: Payroll Engine Mobile Redesign (`src/pages/crm/SalaryManagement.tsx`)
**Content**: Heartbeat check. Please report your current progress on implementing the mobile view and running verification.
**Action**: Update your progress.md with latest timestamp and reply with status.
