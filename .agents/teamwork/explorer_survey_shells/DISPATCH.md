# Survey Dispatch: Navigation Shells, Sidebars & Suite Switcher

## Mission
Investigate and design dedicated navigation shells, sidebars, mobile navigation docks, and the top-level Suite Switcher for POS & Billing vs CRM.

## Source of Truth
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (timestamp 2026-10-23T21:58:59Z)
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_decouple\DISPATCH.md`

## Your Working Directory
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_shells`

## Specific Investigation Tasks
1. Inspect `src/components/Layout.tsx`, header components, sidebar implementations, and mobile navigation components.
2. Analyze how navigation items are currently organized and how CRM items are currently mixed into ERP/billing menus.
3. Design dedicated POS & Billing sidebar navigation (strictly billing, inventory, POS, reports, accounting, store settings - zero CRM items).
4. Design dedicated CRM sidebar navigation (strictly attendance, tasks, salary/payroll, roles, meetings, broadcasts, AI assistant, support - zero billing items).
5. Design the interactive Suite Switcher / App Launcher for the top header with active suite badge and localStorage persistence (`credsmart_active_suite`).
6. Detail mobile adaptive navigation: bottom dock items and quick-action drawers depending on whether the user is in `/billing/*` or `/crm/*`.

## Handoff Requirements
Write comprehensive analysis and architectural designs to `handoff.md` in your working directory. Use send_message to report completion back to parent.


## 2026-10-23T22:02:09Z
You are explorer_survey_shells.
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_shells
Project root: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart

Read your dispatch file: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_shells\DISPATCH.md
Read the authoritative user request: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (see timestamp 2026-10-23T21:58:59Z)

Your mission:
Investigate and design dedicated navigation shells, sidebars, mobile navigation docks, and the top-level Suite Switcher for POS & Billing vs CRM.
1. Inspect `src/components/Layout.tsx`, header components, sidebar implementations, and mobile navigation components.
2. Analyze how navigation items are currently organized and how CRM items are currently mixed into ERP/billing menus.
3. Design dedicated POS & Billing sidebar navigation (strictly billing, inventory, POS, reports, accounting, store settings - zero CRM items).
4. Design dedicated CRM sidebar navigation (strictly attendance, tasks, salary/payroll, roles, meetings, broadcasts, AI assistant, support - zero billing items).
5. Design the interactive Suite Switcher / App Launcher for the top header with active suite badge and localStorage persistence (`credsmart_active_suite`).
6. Detail mobile adaptive navigation: bottom dock items and quick-action drawers depending on whether the user is in `/billing/*` or `/crm/*`.

Write your findings to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_shells\handoff.md`.
Communicate your completion back to parent via send_message.
