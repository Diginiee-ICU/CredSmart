# DISPATCH: Survey Explorer 2 - Attendance & Tasks

## Objective
Analyze `src/pages/crm/Attendance.tsx` and `src/pages/crm/Tasks.tsx` in depth.
Compare current implementation with Mockup 3 (Attendance Hub) and Mockup 4 (Task Workflows) specifications from `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-25T10:11:33Z`).

## Scope & Boundaries
- DO NOT write or edit source code.
- Analyze:
  1. Current layout structure (where are `block md:hidden` vs `hidden md:block` or responsive classes).
  2. State management, hooks, geolocation calculations, timer, Supabase queries, and action handlers that must be preserved.
  3. Exact visual requirements for Mockup 3 (Attendance Hub):
     - Header, badge `🟢 Live Sync`, `[ ⎋ ]`, subtitle, `[ 📍 Geofences ]` button
     - 2x2 Stat Badges: `Present 0 >`, `Geo-Verified 0 >`, `Regularised 0 >`, `Geofences 1 >`
     - Segmented Tabs: `[ My Clock-In ]`, `[ Team Logs (0) ]`, `[ Locations ]`
     - Shift Card: "Today's Shift • General", date pill `Sun, Oct 25`, left orange hairline accent (`border-l-4 border-orange-500`), large digital clock (`02:45:48 PM`), radar geofence widget on the right, status badge `⚠️ Outside Geofence`, location label `📍 Nearest: HQ (Radius: 150m)`, GPS accuracy pill, and full-width Emerald CTA `[ ✓ Clock In Now ]`
     - Quick Links: Dual pill buttons (`[ 📋 View Team Logs ]`, `[ ✏️ Request Correction ]`)
  4. Exact visual requirements for Mockup 4 (Task Workflows):
     - Header, filter icon `[ ☰ ]`, subtitle
     - Status Filter Chips: `[ 🟢 Active Workflows ]`, `[ 🔴 Overdue ]`, primary CTA `[ + Create Task ]` (Amber/Orange)
     - 2x2 Stat Badges: `Total Tasks 4`, `In Progress 1`, `Pending Review 1`, `Completed 1`
     - Search & Priority Bar: `🔍 Search tasks or assignees...`, dropdown `All Priorities ⌵`
     - High-Density Task Stream: Status Emoji Tags (`📌 TO DO`, `⚡ IN PROGRESS`, `🔍 UNDER REVIEW`, `✅ COMPLETED`), Priority Pill (`Urgent`, `High`, `Normal`, `Low`), bold task title, assignee avatar chip, and contextual action CTA (`Start Job →`, `Submit Proof`, `Approve ✓`)
  5. Verification that the 19 protected quarantine files are not touched.

## Output
Write your comprehensive findings to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_2\handoff.md`.
Include:
- Executive Summary
- Current Attendance.tsx analysis & mobile gap
- Current Tasks.tsx analysis & mobile gap
- Implementation strategy for R3 (Attendance) and R4 (Tasks)
- Preservation checklist (geolocation engine, timer, task state mutations, desktop views)


## 2026-10-25T10:17:14Z
From parent:
You are Survey Explorer 2 for the CredSmart CRM Mobile Redesign.
Your working directory is: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_2
Read your dispatch instructions at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_2\DISPATCH.md
MANDATORY: Read the authoritative user request at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md (specifically the latest section ## 2026-10-25T10:11:33Z and background sections).
Read the master design rules at: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md.

Analyze in detail:
1. `src/pages/crm/Attendance.tsx`
2. `src/pages/crm/Tasks.tsx`

Compare their current implementations against Mockup 3 (Attendance Hub) and Mockup 4 (Task Workflows) specifications in ORIGINAL_REQUEST.md.
Document how to structure the mobile view (`block md:hidden`) vs desktop view (`hidden md:block`), how all state, geolocation engines, timer logic, Supabase queries, and action handlers are preserved, and provide an exact blueprint for the worker.
Maintain liveness in your `progress.md` and write your complete handoff report to `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_2\handoff.md`.
When done, notify the orchestrator with send_message.
