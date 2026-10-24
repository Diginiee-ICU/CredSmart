# BRIEFING — 2026-10-24T21:26:00Z

## Mission
Execute Milestone 4 overhaul of CRM Portal & Shared Components per minimal-design-system and test invariants.

## 🔒 My Identity
- Archetype: teamwork_preview_worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_c\
- Original parent: 3044c8ce-523a-4157-917d-31b6f5d55c6a
- Milestone: Milestone 4 (CRM Portal & Shared Components Overhaul)

## 🔒 Key Constraints
- STRICT QUARANTINE LOCK: Zero edits to 19 invoice creation files.
- MANDATORY INTEGRITY WARNING: Genuine implementation only.
- Critical Invariant 1 (Attendance.tsx): preserve `data-testid="attendance-role-filter"`
- Critical Invariant 2 (SalaryManagement.tsx): add/preserve `<CRMBadge variant="info" size="sm">Phase 3 Live</CRMBadge>`
- Critical Invariant 3 (Broadcasts.tsx): add/preserve `<CRMBadge variant="info" size="sm">Phase 4 Active</CRMBadge>`
- Critical Invariant 4 (Tasks.tsx): preserve `min-h-[44px] h-11 px-3 flex items-center` on status buttons
- Minimal Design System: Royal Blue `#2563EB`, standard button `h-8.5 px-3 rounded-lg text-xs font-semibold`, `rounded-xl` containers, `tabular-nums font-mono` for figures, eliminate sub-11px fonts.

## Current Parent
- Conversation ID: 3044c8ce-523a-4157-917d-31b6f5d55c6a
- Updated: not yet

## Task Summary
- **What to build**: Overhaul shared CRM components (`src/components/crm/*`) and CRM pages (`src/pages/crm/*`) to align with CredSmart Minimal Design System tokens while preserving all business logic and test invariants.
- **Success criteria**:
  - `cmd /c npx tsc --noEmit` exits 0.
  - `cmd /c npx eslint src/components/crm/CRMBadge.tsx src/components/crm/CRMCard.tsx src/pages/crm/Attendance.tsx src/pages/crm/CRMDashboard.tsx src/pages/crm/Tasks.tsx src/pages/crm/SalaryManagement.tsx src/pages/crm/Broadcasts.tsx` exits 0.
  - `cmd /c npx vitest run src/test/crmSubmodules.test.tsx src/test/crmSalaryManagement.test.tsx src/test/crmAttendanceRoleFilterStress.test.tsx src/test/mobileTouchErgonomicsRemediation.test.ts` passes 100%.
  - Zero diff lines on the 19 protected files.
- **Interface contracts**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md`
- **Code layout**: `src/components/crm/`, `src/pages/crm/`

## Key Decisions Made
- [TBD]

## Artifact Index
- `DISPATCH.md` — assignment directive
- `BRIEFING.md` — persistent memory
- `handoff.md` — final completion report

## Change Tracker
- **Files modified**: None yet
- **Build status**: Untested
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pending
- **Lint status**: Pending
- **Tests added/modified**: Pending

## Loaded Skills
- **Source**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\credsmart-minimal-design-system\SKILL.md`
- **Local copy**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m4_c\skills\credsmart-minimal-design-system.md`
- **Core methodology**: Full-stack minimalist UI/UX tokens, typography hierarchy, neutral surface color architecture, fast-access desktop productivity layouts, and native-feeling touch-first mobile ergonomics.
