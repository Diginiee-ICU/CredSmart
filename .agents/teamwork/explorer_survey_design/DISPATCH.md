# Dispatch: Explorer Survey CRM Design System & Dashboard

## Identity
- **Agent Type**: `teamwork_preview_explorer`
- **Role**: Codebase Researcher - CRM Design System & Dashboard
- **Working Directory**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_design`
- **Orchestrator Conversation ID**: `f65e7324-0a80-4f4b-bb4c-bc82b84e3cdd`

## Mission & Instructions
Read `ORIGINAL_REQUEST.md` at `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md`.
Investigate the authoritative sources for CredSmart's design tokens, UI components, and dashboard conventions:
1. `tailwind.config.ts` (colors, typography, spacing, brand tokens: Navy #0F172A, Orange #FF6A00, Blue #1D4ED8, Emerald #10B981)
2. `src/components/ui/` (existing shadcn/ui components, icons via lucide-react, toast notifications)
3. Existing dashboard implementations (`src/pages/Dashboard.tsx`, etc.) for card layouts, responsive breakpoints (375px, 768px, 1280px).
4. Requirements for R3 & R4:
   - 7 components in `src/components/crm/`: `CRMCard`, `CRMBadge`, `CRMDataTable`, `CRMPageHeader`, `CRMStatCard`, `CRMPermissionGate`, `CRMRolePill`, and export via `index.ts`.
   - `src/hooks/useCRMPermission.ts` hook.
   - `src/pages/crm/CRMDashboard.tsx` live Supabase queries (staff count, today's attendance, pending tasks, unread broadcasts, upcoming meetings).
   - `.agents/skills/crm-rbac-skill/SKILL.md` skill structure.

Produce a detailed report in `handoff.md` in your working directory and notify orchestrator via `send_message`.

## 2026-10-17T00:26:54Z
You are Explorer 3 (Survey CRM Design System & Dashboard).
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_design
Read your dispatch file at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_design\DISPATCH.md
Read the authoritative user request at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md

Investigate:
1. tailwind.config.ts and brand color tokens (Navy #0F172A, Orange #FF6A00, Blue #1D4ED8, Emerald #10B981)
2. src/components/ui/ (shadcn components, table, dialog, card, badge, toast)
3. Existing dashboard implementations (card styling, responsive grid at 375px, 768px, 1280px)
4. Requirements for R3 & R4:
   - 7 CRM components in src/components/crm/: CRMCard, CRMBadge, CRMDataTable, CRMPageHeader, CRMStatCard, CRMPermissionGate, CRMRolePill, with index.ts
   - Inline JSDoc requirements
   - useCRMPermission hook in src/hooks/useCRMPermission.ts
   - CRMDashboard.tsx live Supabase queries (staff count, today attendance, pending tasks, unread broadcasts, upcoming meetings)
   - .agents/skills/crm-rbac-skill/SKILL.md format

Write a comprehensive report to c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_design\handoff.md and send a completion message back to your orchestrator (f65e7324-0a80-4f4b-bb4c-bc82b84e3cdd).
