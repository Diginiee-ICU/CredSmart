# BRIEFING — 2026-10-25T09:14:00Z

## Mission
Survey and map all occurrences of the "nested/boxy card container" anti-pattern in assigned dashboard, party, and CRM HR files:
1. `src/pages/Dashboard.tsx` (recent activity transaction rows)
2. `src/pages/Parties.tsx` (mobile party directory rows)
3. `src/pages/crm/SalaryManagement.tsx` (salary profile list rows)
4. `src/pages/crm/Attendance.tsx` (attendance log rows)
Document exact line numbers, current classes, proposed minimal divide-y replacements, touch targets (>=44px), and font sizes (>=11px), strictly preserving the 19 protected quarantine files and desktop views.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_3
- Original parent: c0d1864a-d589-4172-80be-9e95a059559c
- Milestone: Explorer Survey Phase
- 2026-10-25: Explorer 3 (Survey: Dashboard, Parties, & CRM HR)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Inspect existing test files and mock setups
- Check `SalesInvoiceModal.tsx` testability and existing test coverage
- Investigate `src/services/documentsService.ts`
- Define unit test specifications for R1 (In-place update on re-edit), R2 (Save & New sequence reset), R3 (Safe deletion), R4 (More menu & WhatsApp sharing)
- Document test & verification execution commands
- 2026-10-18: Read-only codebase audit & contract mapping for frontend Supabase migration to dedicated backend API (https://api.credsmart.online/api/*).
- Maintain 5-component handoff report standard.
- Do NOT modify application source code during investigation.
- 2026-10-20: Read-only investigation of frontend billing latency (<500ms transition), unawaited network invoicing dispatches, single-call sale+items transactional payloads, and cache hydration/immediate in-memory state reflection across ProductsContext, Customers, Parties, and documentsService.
- 2026-10-25: Never modify or suggest modifying any of the 19 protected quarantine files.
- 2026-10-25: Desktop views (`md:` and above) must remain 100% untouched.
- 2026-10-25: Touch targets >=44px, font sizes >=11px, Royal Blue `bg-blue-600` single accent.
- 2026-10-25: Read-only investigation; produce structured survey in handoff.md.

## Current Parent
- Conversation ID: 24d614cb-853d-49d4-9ac2-cf0090c93a62
- Updated: 2026-10-25T09:14:00Z

## Investigation State
- **Explored paths**:
  - `src/pages/Dashboard.tsx` (lines 881-966: mobile recent activity transaction rows)
  - `src/pages/Parties.tsx` (lines 1195-1418: mobile party directory rows)
  - `src/pages/crm/SalaryManagement.tsx` (lines 1450-1496, 1745-1800, 1915-1968: mobile salary profiles, payroll, adjustments)
  - `src/pages/crm/Attendance.tsx` (lines 1818-1955, 2080-2166, 2190-2250, 2270-2330: shift pods, attendance logs, geofences, requests)
- **Key findings**:
  1. `Dashboard.tsx`: Mobile recent activity rows (line 916) are individual floating cards (`rounded-xl border shadow-2xs active:scale-[0.99]`) inside `space-y-2` (line 901). Target replacement: single `rounded-xl border shadow-2xs divide-y` container with flat `px-3.5 py-3 min-h-[56px]` rows.
  2. `Parties.tsx`: Mobile party directory (line 1231) has nested floating cards (`rounded-xl border shadow-2xs`) inside a padded container (`p-2.5 space-y-2.5`, line 1199) which is inside another bordered container (line 1197). Target replacement: outer container with `px-0 divide-y divide-slate-100 dark:divide-slate-800/60` and flat `px-3.5 py-3` rows with >=44px call/WhatsApp/ledger actions.
  3. `SalaryManagement.tsx`: Tab 1 salary profiles (line 1455), Tab 2 payroll (line 1746), and Tab 3 adjustments (line 1916) wrap each item in `<CRMCard variant="default">` inside `space-y-3`. Target replacement: single `divide-y` container with flat `p-3.5` rows and 44px "Configure Profile" CTA.
  4. `Attendance.tsx`: Tab 4 regularisation requests (line 2280) use floating cards (`rounded-xl border`) inside `<div className="space-y-3 pt-2">` inside CRMCard. Target replacement: single `divide-y` container with flat `px-3.5 py-3` rows. Tab 2 logs can be enhanced with a mobile divide-y list mirroring SalaryManagement.
- **Unexplored areas**: None. All 4 files surveyed and verified with exact line numbers and proposed code replacements.

## Key Decisions Made
- Adhere strictly to the clean minimal divide-y pattern: single clean container with `divide-y divide-slate-100 dark:divide-slate-800/60`, flat rows inside without per-item borders, shadows, or rounded corners.
- Confirmed zero modifications to the 19 protected quarantine files.
- Preserved desktop views (`hidden md:flex`, `hidden sm:block`) with 100% invariance.

## Artifact Index
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_3\handoff.md` — Survey handoff report
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_3\progress.md` — Liveness & Progress Log
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_3\DISPATCH.md` — Dispatch Audit Log
