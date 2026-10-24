# DISPATCH — Explorer 3 (Milestone 4: CRM Portal & Cross-Page Design Tokens)

## Identity
- Role: CRM & Design Tokens Explorer
- Type: teamwork_preview_explorer
- Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m4_3\
- Parent: Project Orchestrator (3044c8ce-523a-4157-917d-31b6f5d55c6a)

## Mandates & Context
- Authoritative User Request: Read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (Lines 1120-1218).
- Master Project Architecture: Read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md`.
- Master Design System Rules: Read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md`.
- Master Skill Specification: Read `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\credsmart-minimal-design-system\SKILL.md`.

## Investigation Scope
Examine existing implementations in:
1. `src/pages/crm/*` (e.g., `src/pages/crm/Dashboard.tsx` or `CrmDashboard.tsx`, `Attendance.tsx`, `Tasks.tsx`, `Payroll.tsx`, `Roles.tsx`, etc.)
2. Global Button & Typography compliance across all core application pages.

Analyze:
- **CRM Portal Views**:
  - Workforce dashboard: check for card bloat, micro-prose, oversized buttons, and skeuomorphic backgrounds.
  - Attendance clock-in / Geo-tracking cards: check button sizing, status indicators (Active, Inactive, On Leave), and map/table containment.
  - Task boards / Kanban columns: check column spacing, card density, drag handles, and badge styling.
  - Salary management / Payroll: check tabular monospace for salary figures (₹), pay run actions, and status chips.
- **Cross-Page Design Tokens & Anti-Patterns**:
  - Scan for lingering bloated bubble buttons (`h-11`, `h-12`, `px-8`, `rounded-3xl`).
  - Scan for lingering heavy glassmorphism (`backdrop-blur-2xl bg-white/40`, `shadow-2xl`, glowing neon halos).
  - Verify primary sans `'Inter'` and monospace `'IBM Plex Mono'` with `font-mono tabular-nums`.

## Strict Quarantine Warning
Do NOT propose or touch any of the 19 protected invoice files:
`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`, `UnifiedInvoiceRenderer.tsx`, `downloadExactInvoice.ts`, etc.

## Deliverables
Write your exploration report to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m4_3\handoff.md` with:
- Observation (current file paths, lines, classes, and specific anti-patterns found)
- Logic Chain (remedies aligned with minimal design system tokens)
- Recommended Fix Strategy (concrete class/layout replacements for Worker M4)
- Caveats (any complex state hooks, real-time subscriptions, or edge cases to preserve)
Send completion message to orchestrator (`3044c8ce-523a-4157-917d-31b6f5d55c6a`).


## 2026-10-24T20:31:26Z
You are Explorer 3 for Milestone 4 (Core Application Pages Overhaul).
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m4_3\

Read your dispatch instructions at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m4_3\DISPATCH.md.
Read the authoritative user request at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (Lines 1120-1218).
Read the project architecture at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md.
Read the master design rules at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md.
Read the master design skill at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\credsmart-minimal-design-system\SKILL.md.

Investigate:
1. src/pages/crm/* (Workforce dashboard, attendance clock-in, task boards, salary management/payroll).
2. Cross-page button sizing (34px standard action, 28px table action, 30px icon, zero bloated bubble buttons), typography ('Inter', 'IBM Plex Mono' tabular-nums), zero heavy glassmorphism/glows.

Strict Quarantine: Under NO circumstances touch or propose edits to the 19 protected invoice creation files.

Write your report to c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_m4_3\handoff.md and notify orchestrator (3044c8ce-523a-4157-917d-31b6f5d55c6a) via send_message.
