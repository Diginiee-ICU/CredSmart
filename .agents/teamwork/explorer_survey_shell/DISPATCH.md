# Dispatch: Explorer Survey Shell & Navigation

## Identity
- **Agent Type**: `teamwork_preview_explorer`
- **Role**: Codebase Researcher - Shell & Navigation
- **Working Directory**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_shell`
- **Orchestrator Conversation ID**: `f65e7324-0a80-4f4b-bb4c-bc82b84e3cdd`

## Mission & Instructions
Read `ORIGINAL_REQUEST.md` at `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md`.
Investigate the authoritative sources for CredSmart's navigation, routing, and app shell:
1. `src/components/AppSidebar.tsx`
2. `src/components/AppLayout.tsx`
3. `src/App.tsx`
4. `src/components/routes.ts`
5. `src/hooks/useAuth.tsx` or auth wrapper components.

Examine:
- How sidebar navigation is currently structured for desktop and mobile.
- How sub-navigation / collapsible menus or dropdowns are handled.
- How active route highlighting works.
- How routes are defined, protected, and rendered in `src/App.tsx` and `src/components/routes.ts`.
- Exactly what modifications are needed to add the CRM tab with sub-navigation for 8 placeholder items (Dashboard, Attendance, Salary, Tasks, Meet, Broadcasts, AI Assistant, Support) and route `/crm` mapping to `src/pages/crm/CRMDashboard.tsx`.
- How mobile responsive hamburger / drawer handles sidebar items.

Produce a detailed report in `handoff.md` in your working directory and notify orchestrator via `send_message`.
