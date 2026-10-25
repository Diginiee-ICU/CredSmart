# BRIEFING — 2026-10-25T10:25:00Z

## Mission
Conduct in-depth survey of `src/pages/crm/Attendance.tsx` and `src/pages/crm/Tasks.tsx` against Mockup 3 (Attendance Hub) and Mockup 4 (Task Workflows) from ORIGINAL_REQUEST.md (## 2026-10-25T10:11:33Z). Deliver comprehensive blueprint and handoff for worker implementation.

## 🔒 My Identity
- Archetype: explorer
- Roles: CRM Phase 2 UI infrastructure & design system survey explorer
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_2
- Original parent: 1beca3ca-d4b2-4508-99a0-6c9d39936bfb
- Milestone: CRM Phase 2 Survey & UI Infrastructure Analysis
- Updated Archetype: explorer
- Updated Roles: Frontend Supabase Table Query Migration Survey Explorer (Parties, Khata, Cash & Bank, Ledgers)
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_2
- New parent: 73ee3452-ffda-43b4-83da-c3ca2006c47f
- Milestone: Survey & Audit for Frontend Supabase Query Migration to Dedicated Backend API
- Latest Parent: 47768107-cdc6-46b5-a415-7ea52564fffb
- Latest Roles: Backend API Routes & Schema Alignment Survey Explorer (Invoices, Settings, Parties, DB)
- Latest Milestone: Production Fix Survey 2
- Current Roles: Explorer 2 (Survey: Core Billing & Inventory - Sales, Purchases, Items)
- Current Parent: 24d614cb-853d-49d4-9ac2-cf0090c93a62
- Current Milestone: Mobile Boxy Card Container Survey (Sales, Purchases, Items)
- Active Roles: Survey Explorer 2 (CredSmart CRM Mobile Redesign - Attendance & Tasks)
- Active Parent: 9b37b911-3daf-458a-8cd7-5e836d72b751
- Active Milestone: CRM Mobile Redesign Survey (R3: Attendance Hub & R4: Task Workflows)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do NOT modify source code files
- Document how src/pages/crm/Attendance.tsx should be constructed to conform 100% with CRM design system, mobile responsiveness, and permission gating
- Write detailed analysis report to analysis.md and create self-contained handoff.md
- Focus on Customers, Suppliers, Parties, Credit Transactions, Party-wise Prices, Opening Balances, Khata records, Bank Accounts, Cash Ledgers, and Bank Transactions
- Read-only audit of all direct `supabase.from(...)` queries for these domains
- Read-only audit of `backend-api/` (invoices.js, settings.js, parties.js, db.js, index.js)
- Analyze requirements 1-8 without committing source changes
- Never modify or suggest modifying any of the 19 protected quarantine files listed in DISPATCH.md
- Desktop views (>=768px) must remain 100% untouched
- Business logic, handlers, modals, filters remain 100% untouched
- Minimum touch targets >= 44px
- Minimum font sizes >= 11px
- Follow Master Design System: `minimal-design-system.md`
- Preserve all geolocation calculations, timer logic, Supabase subscriptions & queries, and action handlers

## Current Parent
- Conversation ID: 9b37b911-3daf-458a-8cd7-5e836d72b751
- Updated: 2026-10-25T10:25:00Z

## Investigation State
- **Explored paths**:
  - `src/pages/crm/Attendance.tsx` (lines 1-2613 audited)
  - `src/pages/crm/Tasks.tsx` (lines 1-1299 audited)
  - `ORIGINAL_REQUEST.md` (Mockup 3 & Mockup 4 specifications)
  - `minimal-design-system.md` (Design tokens, touch targets >=44px, typography >=11px)
  - Quarantine files list (19 files verified safe & untouched)
- **Key findings**:
  1. `Attendance.tsx`: Currently lacks mobile/desktop divergence. Wrapping lines 1644-2339 in `hidden md:block` preserves desktop 100%. Mobile view (`block md:hidden`) will implement Mockup 3 with Header (Live Sync, export [ ⎋ ], Geofences button), 2x2 stat pill badges (`Present 0 >`, `Geo-Verified 0 >`, `Regularised 0 >`, `Geofences 1 >`), Inset segmented tab bar, Shift card with left orange accent (`border-l-4 border-orange-500`), large digital clock, mini-radar visualizer, geofence status badge, location label, GPS accuracy pill, full-width emerald CTA (`Clock In Now`), and quick links.
  2. `Tasks.tsx`: Currently stacks Kanban columns vertically on mobile. Wrapping desktop main & header in `hidden md:block` preserves desktop 100%. Mobile view (`block md:hidden`) will implement Mockup 4 with Header (filter [ ☰ ]), Status Filter Chips (`Active Workflows`, `Overdue`, amber `+ Create Task`), 2x2 stat badges (`Total Tasks 4`, `In Progress 1`, `Pending Review 1`, `Completed 1`), Search & Priority bar, and High-Density Task Stream with 4 emoji status tags (`📌 TO DO`, `⚡ IN PROGRESS`, `🔍 UNDER REVIEW`, `✅ COMPLETED`), priority pill, title, assignee chip, and contextual action CTA (`Start Job →`, `Submit Proof`, `Approve ✓`).
  3. Build health: `node node_modules/typescript/bin/tsc --noEmit` produces 0 errors.
- **Unexplored areas**: None. Complete blueprint ready for implementation.

## Key Decisions Made
- Clear desktop/mobile isolation pattern (`hidden md:block` / `block md:hidden`) recommended to prevent regressions.
- State, geolocation hooks, session timer, queries, and modal triggers shared between desktop and mobile without duplication.
- Authored 5-component handoff report in `handoff.md`.

## Artifact Index
- `handoff.md` — Complete 5-component handoff report for orchestrator and workers
- `progress.md` — Liveness heartbeat and step tracking
- `DISPATCH.md` — Stored dispatch instructions
- `BRIEFING.md` — Persistent working memory
