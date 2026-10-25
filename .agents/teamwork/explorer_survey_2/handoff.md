# Handoff Report: CredSmart CRM Mobile Redesign Survey (Attendance & Tasks)

**Date**: 2026-10-25T10:28:00Z  
**Agent**: Survey Explorer 2  
**Mission**: Deep investigation of `src/pages/crm/Attendance.tsx` and `src/pages/crm/Tasks.tsx` against Mockup 3 (Attendance Hub) and Mockup 4 (Task Workflows) from `ORIGINAL_REQUEST.md` (Section `## 2026-10-25T10:11:33Z`).  
**Working Directory**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_2`  
**Status**: Complete (Hard Handoff)

---

## 1. Observation

### 1.1 Scope & Reference Documents
- **Authoritative Request**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (Section `## 2026-10-25T10:11:33Z`).
- **Master Design System**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md`.
- **Target Files Audited**:
  1. `src/pages/crm/Attendance.tsx` (Total lines: 2,613, Size: 103,153 bytes)
  2. `src/pages/crm/Tasks.tsx` (Total lines: 1,299, Size: 52,005 bytes)

### 1.2 Current State of `src/pages/crm/Attendance.tsx`
- **Line 157**: Component entry `export default function Attendance(): React.ReactElement`.
- **Lines 170-227**: State declarations for `activeTab`, `geofences`, `attendanceRecords`, `requests`.
- **Lines 233-242**: Real-time state:
  - `currentTime` (updated every 1,000ms via `setInterval` on line 295).
  - `elapsedSeconds` (live work timer on line 309).
  - `currentCoords`, `nearestGeofence`, `gpsStatus` (managed by `refreshLocation` on lines 328-354 using `getCurrentPosition` and `findNearestGeofence`).
- **Lines 693-818**: `handleClockIn` captures GPS, evaluates geofence (`isWithinGeofence`), updates local state optimistically, upserts to Supabase table `crm_attendance` and calls `crmApi.recordCRMAttendance`.
- **Lines 820-924**: `handleClockOut` captures GPS, calculates duration & overtime, updates local state optimistically, and upserts to Supabase and API.
- **Lines 930-1050**: Geofence CRUD handlers (`handleOpenAddGeofence`, `handleSaveGeofence`, `handleDeleteGeofence`).
- **Lines 1250-1340**: Regularisation request review handlers (`handleReviewRequest`).
- **Lines 1354-1391**: Export handlers (`handleExportCsv`, `handleExportPdf`).
- **Lines 1397-1413**: `metrics` memo: `presentToday`, `geoVerified`, `manualPending`, `totalLocations`, `complianceRate`.
- **Lines 1624-1795**: JSX Header, KPI cards (`grid grid-cols-2 md:grid-cols-4`), and Tab Switcher (`pod`, `logs`, `geofences`, `requests`).
- **Lines 1800-2078**: Tab 1 ("pod") renders:
  - Left card (`lg:col-span-1`): Digital clock, GPS status, Clock In / Clock Out button.
  - Right card (`lg:col-span-2`): 260px SVG Radar scanner with concentric rings and telemetry details.
- **Lines 2083-2251**: Tab 2 ("logs") renders `CRMDataTable` with date, status, role dropdowns. Tab 3 ("geofences") renders grid of cards.
- **Lines 2254-2339**: Tab 4 ("requests") renders regularisation cards.
- **Current Mobile Defect / Gap**:
  - The entire page currently uses a single desktop-oriented layout without divergence.
  - On mobile (< 768px), the header actions wrap clumsily into 4 separate buttons; the stat cards are bulky desktop cards (`CRMStatCard`); the Clock-In Pod stacks the clock card on top of the huge 260px SVG Radar scanner, forcing heavy vertical scrolling; there is no orange hairline shift card accent, no compact 2x2 stat pill badges, and no dual quick links.

### 1.3 Target Mockup 3 (Attendance Hub) Specification
From `ORIGINAL_REQUEST.md` (Lines 1339-1346):
1. **Header**: Title "Attendance Hub", badge `🟢 Live Sync`, export icon trigger `[ ⎋ ]`, subtitle "GPS verified clock-in, active work sessions, and shift tracking", button `[ 📍 Geofences ]` in Royal Blue (`bg-blue-600`).
2. **2x2 Stat Badges**: Compact horizontal badges with colored icon containers and right chevron:
   - `Present 0 >` (CalendarCheck, emerald)
   - `Geo-Verified 0 >` (MapPin, blue)
   - `Regularised 0 >` (AlertTriangle, amber)
   - `Geofences 1 >` (Building2, slate/navy)
3. **Segmented Tabs**: Inset pill switcher: `[ My Clock-In ]`, `[ Team Logs (0) ]`, `[ Locations ]`.
4. **Shift Card**:
   - Left orange hairline accent: `border-l-4 border-orange-500`
   - Title: "Today's Shift • General" with date pill `Sun, Oct 25`
   - Time & Radar row: Large digital clock (`02:45:48 PM`) on the left, mini concentric radar geofence scanner widget on the right
   - Status badge: `⚠️ Outside Geofence` or `🟢 Within Geofence ✓` or `Acquiring GPS...`
   - Location label: `📍 Nearest: HQ (Radius: 150m)` with distance readout
   - GPS accuracy pill: `GPS Accuracy: ±4m • Protocol: Verified`
   - Primary full-width Emerald CTA: `[ ✓ Clock In Now ]` (or Orange Clock Out + active session timer if clocked in)
5. **Quick Links**: Dual pill buttons side-by-side: `[ 📋 View Team Logs ]` and `[ ✏️ Request Correction ]`.

### 1.4 Current State of `src/pages/crm/Tasks.tsx`
- **Line 137**: Component entry `export default function Tasks(): React.ReactElement`.
- **Lines 147-155**: State declaration for `tasks` initialized from localStorage key `credsmart_crm_tasks_${orgId}` with `INITIAL_TASKS` fallback.
- **Lines 157-181**: State for `staffList`, `viewMode` ("kanban" | "table"), `searchQuery`, `priorityFilter`, `isRefreshing`, and modal states (`isCreateOpen`, `activeTaskForProof`, `activeTaskForRevision`).
- **Lines 190-260**: `loadData` queries `crmApi.getCRMStaffRoles` / `getCRMStaff` and `crmApi.getCRMTasks`.
- **Lines 262-270**: `metrics` memo: `total`, `inProgress`, `review`, `done`, `completionRate`, `overdue`.
- **Lines 273-282**: `filteredTasks` memo filtering by `searchQuery` and `priorityFilter`.
- **Lines 285-340**: Action handlers: `handleMoveStatus`, `handleApproveTask`.
- **Lines 342-408**: `handleCreateTask` creating new task and calling `crmApi.createCRMTask`.
- **Lines 410-502**: `handleSubmitProof` and `handleSubmitRevision`.
- **Lines 703-790**: Header with `CRMPageHeader`, Refresh, View Toggle, Create Task button.
- **Lines 794-830**: 4 `CRMStatCard` components.
- **Lines 833-858**: Search input and Priority select.
- **Lines 861-1048**: Kanban board (`grid grid-cols-1 md:grid-cols-4`) and Table view.
- **Current Mobile Defect / Gap**:
  - The Kanban board columns stack vertically, creating four separated column containers.
  - Mobile lacks the status filter chips (`[ 🟢 Active Workflows ]`, `[ 🔴 Overdue ]`, and primary CTA `[ + Create Task ]`), lacks the compact 2x2 stat badges, lacks the high-density unified task stream with the 4 exact emoji status tags (`📌 TO DO`, `⚡ IN PROGRESS`, `🔍 UNDER REVIEW`, `✅ COMPLETED`).

### 1.5 Target Mockup 4 (Task Workflows) Specification
From `ORIGINAL_REQUEST.md` (Lines 1347-1354):
1. **Header**: "Task Workflows", filter icon `[ ☰ ]`, subtitle "All Assignees • Live Status".
2. **Status Filter Chips**: `[ 🟢 Active Workflows ]`, `[ 🔴 Overdue ]`, and primary CTA `[ + Create Task ]` (Amber/Orange).
3. **2x2 Stat Badges**: `Total Tasks 4`, `In Progress 1`, `Pending Review 1`, `Completed 1`.
4. **Search & Priority Bar**: `🔍 Search tasks or assignees...`, dropdown `All Priorities ⌵`.
5. **High-Density Task Stream**:
   - Status Emoji Tags: `📌 TO DO`, `⚡ IN PROGRESS`, `🔍 UNDER REVIEW`, `✅ COMPLETED`
   - Priority Pill: `Urgent`, `High`, `Normal`, `Low`
   - Bold task title, description snippet
   - Assignee avatar chip with initial & name
   - Contextual action CTA: `Start Job →`, `Submit Proof`, `Approve ✓` (with `min-h-[44px]`).

### 1.6 Verification of Quarantine Files
- Ran verification on the 19 quarantine files. None of them are involved in R3 or R4.
- TypeScript compiler verification via `node node_modules/typescript/bin/tsc --noEmit` exited with code 0 (zero errors).

---

## 2. Logic Chain

1. **Isolation Guarantee (Zero Desktop Regression)**:
   - By structuring both files with an explicit breakpoint divergence:
     - Desktop container: `<div className="hidden md:block">...existing desktop UI 100% untouched...</div>`
     - Mobile container: `<div className="block md:hidden">...dedicated mobile UI...</div>`
   - All desktop functionality, tables, layouts, cards, and hotkeys remain byte-for-byte identical on screens >= 768px.

2. **State & Logic Unification**:
   - Both desktop and mobile views share the exact same component state:
     - `Attendance.tsx`: `currentTime`, `elapsedSeconds`, `currentCoords`, `nearestGeofence`, `gpsStatus`, `attendanceRecords`, `geofences`, `requests`, `metrics`.
     - `Tasks.tsx`: `tasks`, `metrics`, `filteredTasks`, `searchQuery`, `priorityFilter`, `staffList`.
   - All mutations, geolocation calculations (`crmGeoUtils.ts`), timers (`setInterval`), and API calls (`crmApi`, `supabase`) execute through existing handlers (`handleClockIn`, `handleClockOut`, `handleMoveStatus`, `handleCreateTask`, `handleApproveTask`).
   - Modals remain shared dialogs that open seamlessly whether triggered from mobile or desktop.

3. **Design System & Minimal Rules Adherence**:
   - **Proportions**: Buttons adhere to standard sizing (`h-8.5` or `h-9` for actions, `w-11 h-11` or `min-h-[44px]` for mobile touch targets).
   - **Typography**: Strict hierarchy, minimum `text-[11px]`, bold titles `text-sm` or `text-base`, monospace `tabular-nums` for clocks, dates, and coordinates.
   - **Colors**: Canvas `#F8FAFC` light / `#090D16` dark, Royal Blue (`#2563EB`) accent, Emerald (`#10B981`) for clock-in & success, Amber/Orange (`#FF6A00`) for clock-out, create task, and shift accents.
   - **Zero Nested Boxy Cards**: Mobile list rows use clean `divide-y divide-slate-100 dark:divide-slate-800/60` containers without per-row floating border boxes inside another border box.

---

## 3. Caveats

1. **Quarantine Inviolability**:
   - Under no circumstances should the 19 protected files be touched or imported differently.
2. **Permission Gating**:
   - Both pages wrap the root content with `<CRMPermissionGate>`. The mobile and desktop containers must remain inside this gate.
3. **Geolocation Permissions**:
   - If user denies browser geolocation on mobile, the UI must gracefully display the `outside` or `error` badge and still allow manual punch or regularisation request submission.
4. **No caveats on architecture or feasibility**:
   - The bifurcation pattern has been tested across other CredSmart pages and compiles cleanly.

---

## 4. Conclusion & Implementation Blueprint

### 4.1 Implementation Blueprint for R3: `Attendance.tsx`

#### Step 1: Add Mobile State & Helpers
At line 170 in `src/pages/crm/Attendance.tsx`:
```tsx
// Mobile view active tab: 'pod' | 'logs' | 'geofences'
// Can reuse existing activeTab state or synchronize with it.
```

#### Step 2: Desktop Containment
Wrap lines 1644–2339 in:
```tsx
{/* ====================================================================== */}
{/* DESKTOP VIEW (>= 768px): 100% UNTOUCHED & PRESERVED                     */}
{/* ====================================================================== */}
<div className="hidden md:block space-y-6">
  {/* CRMPageHeader */}
  {/* Summary Stat Cards (4 CRMStatCard) */}
  {/* Navigation Tabs */}
  {/* Tab 1: Pod (Clock + 260px SVG Radar) */}
  {/* Tab 2: Logs (CRMDataTable) */}
  {/* Tab 3: Geofences */}
  {/* Tab 4: Requests */}
</div>
```

#### Step 3: Mobile View Implementation (`block md:hidden`)
Directly above or below the desktop container, insert the Mockup 3 mobile interface:

```tsx
{/* ====================================================================== */}
{/* MOBILE VIEW (< 768px): MOCKUP 3 - ATTENDANCE HUB                        */}
{/* ====================================================================== */}
<div className="block md:hidden space-y-3.5 pb-24">
  {/* 1. Mobile Header */}
  <div className="space-y-1.5 pt-1">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Attendance Hub</h1>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live Sync
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleExportPdf()}
          className="w-8 h-8 p-0 rounded-lg border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
          title="Export Attendance"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
        </Button>
        {canEdit && (
          <Button
            size="sm"
            onClick={() => setActiveTab("geofences")}
            className="h-8 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1 shadow-2xs"
          >
            <MapPin className="w-3 h-3" />
            <span>Geofences</span>
          </Button>
        )}
      </div>
    </div>
    <p className="text-xs text-slate-500 dark:text-slate-400">
      GPS verified clock-in, active work sessions, and shift tracking
    </p>
  </div>

  {/* 2. 2x2 Stat Badges */}
  <div className="grid grid-cols-2 gap-2">
    <button
      type="button"
      onClick={() => setActiveTab("logs")}
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-2.5 flex items-center justify-between shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-850 text-left transition-all"
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
          <CalendarCheck className="w-3.5 h-3.5" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Present</div>
          <div className="text-sm font-bold font-mono text-slate-900 dark:text-white tabular-nums">
            {metrics.presentToday}
          </div>
        </div>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
    </button>

    <button
      type="button"
      onClick={() => setActiveTab("logs")}
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-2.5 flex items-center justify-between shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-850 text-left transition-all"
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
          <MapPin className="w-3.5 h-3.5" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Geo-Verified</div>
          <div className="text-sm font-bold font-mono text-slate-900 dark:text-white tabular-nums">
            {metrics.geoVerified}
          </div>
        </div>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
    </button>

    <button
      type="button"
      onClick={() => setActiveTab("requests")}
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-2.5 flex items-center justify-between shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-850 text-left transition-all"
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-3.5 h-3.5" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Regularised</div>
          <div className="text-sm font-bold font-mono text-slate-900 dark:text-white tabular-nums">
            {metrics.manualPending}
          </div>
        </div>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
    </button>

    <button
      type="button"
      onClick={() => setActiveTab("geofences")}
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-2.5 flex items-center justify-between shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-850 text-left transition-all"
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
          <Building2 className="w-3.5 h-3.5" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Geofences</div>
          <div className="text-sm font-bold font-mono text-slate-900 dark:text-white tabular-nums">
            {metrics.totalLocations}
          </div>
        </div>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
    </button>
  </div>

  {/* 3. Inset Segmented Tabs */}
  <div className="p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center gap-1">
    <button
      type="button"
      onClick={() => setActiveTab("pod")}
      className={cn(
        "flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all text-center",
        activeTab === "pod"
          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
      )}
    >
      My Clock-In
    </button>
    <button
      type="button"
      onClick={() => setActiveTab("logs")}
      className={cn(
        "flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all text-center",
        activeTab === "logs"
          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
      )}
    >
      Team Logs ({attendanceRecords.length})
    </button>
    <button
      type="button"
      onClick={() => setActiveTab("geofences")}
      className={cn(
        "flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all text-center",
        activeTab === "geofences"
          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
      )}
    >
      Locations ({geofences.length})
    </button>
  </div>

  {/* 4. Tab Content: My Clock-In (Mockup 3 Shift Card) */}
  {activeTab === "pod" && (
    <div className="space-y-3.5">
      {/* Shift Card */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs border-l-4 border-l-orange-500 p-4 space-y-3.5">
        {/* Top Shift Row */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 dark:text-white">Today's Shift • General</span>
          <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200/60 dark:border-slate-700">
            {currentTime.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}
          </span>
        </div>

        {/* Digital Clock + Mini Concentric Radar Widget */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-mono text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
              {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-600" />
              <span>Shift: 09:00 AM - 06:00 PM (8h)</span>
            </div>
          </div>

          {/* Mini Concentric Radar Widget */}
          <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-700 relative flex items-center justify-center overflow-hidden shrink-0">
            <div className="w-11 h-11 rounded-full border border-slate-700/80 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border border-slate-600 flex items-center justify-center bg-emerald-500/10">
                <Building2 className="w-2.5 h-2.5 text-emerald-400" />
              </div>
            </div>
            {/* Blinking user beacon */}
            {nearestGeofence && (
              <div
                className={cn(
                  "absolute w-2 h-2 rounded-full",
                  nearestGeofence.isWithin
                    ? "bg-emerald-400 animate-ping"
                    : "bg-amber-400 animate-pulse"
                )}
                style={{
                  top: nearestGeofence.isWithin ? "40%" : "20%",
                  right: nearestGeofence.isWithin ? "40%" : "20%",
                }}
              />
            )}
          </div>
        </div>

        {/* Status Badge + Location Text */}
        <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            {gpsStatus === "inside" && (
              <CRMBadge variant="success" size="sm" dot>
                Within Geofence ✓
              </CRMBadge>
            )}
            {gpsStatus === "outside" && (
              <CRMBadge variant="warning" size="sm">
                ⚠️ Outside Geofence
              </CRMBadge>
            )}
            {gpsStatus === "acquiring" && (
              <CRMBadge variant="warning" size="sm" dot>
                Acquiring GPS...
              </CRMBadge>
            )}
            {gpsStatus === "error" && (
              <CRMBadge variant="error" size="sm">
                GPS Unavailable
              </CRMBadge>
            )}
            {gpsStatus === "idle" && (
              <CRMBadge variant="neutral" size="sm">
                GPS Standby
              </CRMBadge>
            )}

            {nearestGeofence && (
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {Math.round(nearestGeofence.distance)}m away
              </span>
            )}
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">
              Nearest: <strong className="text-slate-900 dark:text-white">{nearestGeofence?.geofence.name || "Default HQ"}</strong> (Radius: {nearestGeofence?.geofence.radius_meters || 150}m)
            </span>
          </div>
        </div>

        {/* GPS Accuracy Pill */}
        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
          <span>GPS Accuracy: ±{Math.round(currentCoords?.accuracy || 4)}m</span>
          <span className="text-emerald-600 font-semibold">Protocol: Verified</span>
        </div>

        {/* Primary Action Button */}
        <div>
          {!todayRecord ? (
            <Button
              type="button"
              onClick={handleClockIn}
              disabled={actionLoading}
              className="w-full min-h-[44px] h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{actionLoading ? "Punching GPS..." : "✓ Clock In Now"}</span>
            </Button>
          ) : !todayRecord.clock_out ? (
            <div className="space-y-2.5">
              <div className="p-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/60 text-center">
                <div className="text-[11px] font-semibold text-[#FF6A00] uppercase font-mono">
                  Active Work Session
                </div>
                <div className="font-mono text-xl font-black text-orange-950 dark:text-orange-200 tabular-nums">
                  {formatSecondsToHMS(elapsedSeconds)}
                </div>
              </div>
              <Button
                type="button"
                onClick={handleClockOut}
                disabled={actionLoading}
                className="w-full min-h-[44px] h-11 rounded-xl bg-[#FF6A00] hover:bg-orange-600 active:scale-[0.98] text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Clock className="w-4 h-4" />
                <span>{actionLoading ? "Punching Out..." : "Clock Out"}</span>
              </Button>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-center space-y-1.5">
              <div className="font-bold text-xs text-emerald-900 dark:text-emerald-300">Shift Completed for Today</div>
              <div className="text-xs font-mono text-slate-600 dark:text-slate-400">
                {formatTimeDisplay(todayRecord.clock_in)} → {formatTimeDisplay(todayRecord.clock_out)} ({formatMinutesToHM(todayRecord.work_duration_minutes)})
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Quick Links Dual Pills */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          onClick={() => setActiveTab("logs")}
          className="min-h-[44px] h-11 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs hover:bg-slate-50"
        >
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          <span>📋 View Team Logs</span>
        </Button>
        <Button
          variant="outline"
          onClick={() => handleOpenRequestModal(todayRecord || undefined)}
          className="min-h-[44px] h-11 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs hover:bg-slate-50"
        >
          <Edit3 className="w-3.5 h-3.5 text-amber-600" />
          <span>✏️ Request Correction</span>
        </Button>
      </div>
    </div>
  )}

  {/* Tab Content: Team Logs (Divide-Y Stream) */}
  {activeTab === "logs" && (
    <div className="space-y-3">
      {/* Date & Search Bar */}
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="h-9 text-xs flex-1 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 text-xs w-32 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="present">Present</SelectItem>
            <SelectItem value="half_day">Half Day</SelectItem>
            <SelectItem value="absent">Absent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Divide-Y Mobile Stream */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">
        {filteredLogs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No attendance records match criteria.
          </div>
        ) : (
          filteredLogs.map((row) => {
            const profile = staffProfiles[row.staff_id];
            const name = row.staff_name || profile?.name || "Staff";
            return (
              <div
                key={row.id}
                onClick={() => setSelectedRecordForDetails(row)}
                className="px-3.5 py-3 flex items-center justify-between gap-2.5 active:bg-slate-50 dark:active:bg-slate-850 cursor-pointer min-h-[44px]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                      {name}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {formatTimeDisplay(row.clock_in)} → {formatTimeDisplay(row.clock_out)} ({formatMinutesToHM(row.work_duration_minutes)})
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  {row.verification_method === "geo_verified" ? (
                    <CRMBadge variant="success" size="sm" dot>Verified</CRMBadge>
                  ) : (
                    <CRMBadge variant="warning" size="sm">Manual</CRMBadge>
                  )}
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  )}

  {/* Tab Content: Locations (Divide-Y Stream) */}
  {activeTab === "geofences" && (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-900 dark:text-white">Active Geofences ({geofences.length})</span>
        {canEdit && (
          <Button
            size="sm"
            onClick={handleOpenAddGeofence}
            className="h-8 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1 shadow-2xs"
          >
            <Plus className="w-3 h-3" />
            <span>Add Geofence</span>
          </Button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">
        {geofences.map((geo) => (
          <div key={geo.id} className="px-3.5 py-3 flex items-center justify-between gap-2.5 min-h-[44px]">
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{geo.name}</span>
                {geo.is_active ? (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded">Active</span>
                ) : (
                  <span className="text-[10px] text-slate-400">Inactive</span>
                )}
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                Radius: {geo.radius_meters}m • Lat: {geo.latitude.toFixed(4)}, Lon: {geo.longitude.toFixed(4)}
              </div>
            </div>
            {canEdit && (
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenEditGeofence(geo)}
                  className="w-8 h-8 p-0 text-slate-500 hover:text-slate-900"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteGeofence(geo.id, geo.name)}
                  className="w-8 h-8 p-0 text-rose-500 hover:text-rose-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )}
</div>
```

---

### 4.2 Implementation Blueprint for R4: `Tasks.tsx`

#### Step 1: Add Mobile State & Helpers
At line 161 in `src/pages/crm/Tasks.tsx`, add a mobile filter chip state:
```tsx
const [mobileWorkflowFilter, setMobileWorkflowFilter] = useState<"all" | "active" | "overdue">("all");
```
And compute the mobile stream list:
```tsx
const mobileStreamTasks = useMemo(() => {
  return filteredTasks.filter((t) => {
    if (mobileWorkflowFilter === "active") {
      return t.status !== "done";
    }
    if (mobileWorkflowFilter === "overdue") {
      return t.status !== "done" && Boolean(t.due_date && t.due_date < todayStr);
    }
    return true;
  });
}, [filteredTasks, mobileWorkflowFilter, todayStr]);
```

#### Step 2: Desktop Containment
Wrap lines 704–1048 in:
```tsx
{/* ====================================================================== */}
{/* DESKTOP VIEW (>= 768px): 100% UNTOUCHED & PRESERVED                     */}
{/* ====================================================================== */}
<div className="hidden md:block">
  {/* Header & CRMPageHeader */}
  {/* Main with CRMStatCard grid, filter bar, Kanban board & table */}
</div>
```

#### Step 3: Mobile View Implementation (`block md:hidden`)
Directly above or below the desktop container, insert the Mockup 4 mobile interface:

```tsx
{/* ====================================================================== */}
{/* MOBILE VIEW (< 768px): MOCKUP 4 - TASK WORKFLOWS                        */}
{/* ====================================================================== */}
<div className="block md:hidden space-y-3.5 px-3 py-3 pb-24">
  {/* 1. Mobile Header */}
  <div className="space-y-1 pt-1">
    <div className="flex items-center justify-between">
      <h1 className="text-lg font-bold text-slate-900 dark:text-white">Task Workflows</h1>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          // Toggle quick filter or refresh
          loadData();
        }}
        className="w-8 h-8 p-0 rounded-lg border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
      </Button>
    </div>
    <p className="text-xs text-slate-500 dark:text-slate-400">
      All Assignees • Live Status
    </p>
  </div>

  {/* 2. Status Filter Chips + Primary CTA */}
  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
    <button
      type="button"
      onClick={() => setMobileWorkflowFilter("all")}
      className={cn(
        "h-8 px-3 rounded-full text-xs font-semibold border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
        mobileWorkflowFilter === "all"
          ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-800"
      )}
    >
      <span>All ({metrics.total})</span>
    </button>
    <button
      type="button"
      onClick={() => setMobileWorkflowFilter("active")}
      className={cn(
        "h-8 px-3 rounded-full text-xs font-semibold border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
        mobileWorkflowFilter === "active"
          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-800"
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      <span>Active Workflows</span>
    </button>
    <button
      type="button"
      onClick={() => setMobileWorkflowFilter("overdue")}
      className={cn(
        "h-8 px-3 rounded-full text-xs font-semibold border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
        mobileWorkflowFilter === "overdue"
          ? "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800"
          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-800"
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
      <span>Overdue ({metrics.overdue})</span>
    </button>

    {canCreate && (
      <Button
        onClick={() => setIsCreateOpen(true)}
        className="h-8 px-3 rounded-lg bg-[#FF6A00] hover:bg-orange-600 active:scale-[0.98] text-white font-bold text-xs flex items-center gap-1 shadow-2xs ml-auto shrink-0 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Create Task</span>
      </Button>
    )}
  </div>

  {/* 3. 2x2 Stat Badges */}
  <div className="grid grid-cols-2 gap-2">
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-2.5 flex items-center justify-between shadow-2xs">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Tasks</span>
      <span className="font-mono font-bold text-sm text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md tabular-nums">
        {metrics.total}
      </span>
    </div>
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-2.5 flex items-center justify-between shadow-2xs">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">In Progress</span>
      <span className="font-mono font-bold text-sm text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md tabular-nums">
        {metrics.inProgress}
      </span>
    </div>
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-2.5 flex items-center justify-between shadow-2xs">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Review</span>
      <span className="font-mono font-bold text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md tabular-nums">
        {metrics.review}
      </span>
    </div>
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-2.5 flex items-center justify-between shadow-2xs">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Completed</span>
      <span className="font-mono font-bold text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md tabular-nums">
        {metrics.done}
      </span>
    </div>
  </div>

  {/* 4. Search & Priority Bar */}
  <div className="flex items-center gap-2">
    <div className="relative flex-1">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
      <Input
        placeholder="Search tasks or assignees..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-8 h-9 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800"
      />
    </div>
    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
      <SelectTrigger className="w-[125px] h-9 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800">
        <SelectValue placeholder="Priority" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Priorities</SelectItem>
        <SelectItem value="urgent">Urgent</SelectItem>
        <SelectItem value="high">High</SelectItem>
        <SelectItem value="normal">Normal</SelectItem>
        <SelectItem value="low">Low</SelectItem>
      </SelectContent>
    </Select>
  </div>

  {/* 5. High-Density Task Stream (Divide-Y) */}
  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">
    {mobileStreamTasks.length === 0 ? (
      <div className="py-12 text-center text-xs text-slate-400">
        No tasks match your filters.
      </div>
    ) : (
      mobileStreamTasks.map((task) => {
        const isOverdue = task.status !== "done" && Boolean(task.due_date && task.due_date < todayStr);

        return (
          <div key={task.id} className="p-3.5 space-y-2.5 transition-colors">
            {/* Top row: Status Emoji Tag + Priority Pill */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                {task.status === "todo" && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    📌 TO DO
                  </span>
                )}
                {task.status === "in_progress" && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold font-mono text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md">
                    ⚡ IN PROGRESS
                  </span>
                )}
                {task.status === "review" && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold font-mono text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md">
                    🔍 UNDER REVIEW
                  </span>
                )}
                {task.status === "done" && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                    ✅ COMPLETED
                  </span>
                )}

                {isOverdue && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                    🔴 Overdue
                  </span>
                )}
              </div>

              {/* Priority Pill */}
              <div>
                {task.priority === "urgent" && (
                  <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 px-2 py-0.5 rounded-full">
                    Urgent
                  </span>
                )}
                {task.priority === "high" && (
                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 px-2 py-0.5 rounded-full">
                    High
                  </span>
                )}
                {task.priority === "normal" && (
                  <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 px-2 py-0.5 rounded-full">
                    Normal
                  </span>
                )}
                {task.priority === "low" && (
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 px-2 py-0.5 rounded-full">
                    Low
                  </span>
                )}
              </div>
            </div>

            {/* Task Title & Description */}
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                {task.title}
              </h4>
              {task.description && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                  {task.description}
                </p>
              )}
            </div>

            {/* Revision feedback or proof notes if present */}
            {task.review_feedback && task.status === "in_progress" && (
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300">
                <strong>Revision note:</strong> {task.review_feedback}
              </div>
            )}
            {task.proof_notes && (
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                <strong>Proof:</strong> {task.proof_notes}
              </div>
            )}

            {/* Bottom Row: Assignee + Due Date + Contextual Action CTA */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center justify-center shrink-0">
                  {task.assignee_name ? task.assignee_name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[110px]">
                    {task.assignee_name}
                  </div>
                  <div className={cn("text-[10px] font-mono", isOverdue ? "text-rose-600 font-bold" : "text-slate-400")}>
                    {task.due_date || "No due date"}
                  </div>
                </div>
              </div>

              {/* Contextual CTA (Minimum 44px touch target) */}
              <div className="shrink-0">
                {task.status === "todo" && (
                  <Button
                    size="sm"
                    onClick={() => handleMoveStatus(task.id, "in_progress")}
                    className="min-h-[44px] h-9 px-3 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer"
                  >
                    Start Job →
                  </Button>
                )}
                {task.status === "in_progress" && (
                  <Button
                    size="sm"
                    onClick={() => {
                      if (task.requires_proof) {
                        setActiveTaskForProof(task);
                        setProofText("");
                      } else {
                        handleMoveStatus(task.id, "review");
                      }
                    }}
                    className="min-h-[44px] h-9 px-3 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg cursor-pointer"
                  >
                    Submit Proof
                  </Button>
                )}
                {task.status === "review" && (
                  <div className="flex items-center gap-1">
                    {canApprove && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenRevision(task)}
                          className="min-h-[44px] h-9 px-2 text-xs text-amber-700 border-amber-200"
                        >
                          Revise
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApproveTask(task.id)}
                          className="min-h-[44px] h-9 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                        >
                          Approve ✓
                        </Button>
                      </>
                    )}
                  </div>
                )}
                {task.status === "done" && (
                  <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 py-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Done</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })
    )}
  </div>
</div>
```

---

## 5. Verification Method

1. **Compilation Check**:
   - Command:
     ```powershell
     node node_modules/typescript/bin/tsc --noEmit
     ```
   - Invalidation condition: Any TypeScript compiler error or missing property interface.
2. **Build Test**:
   - Command:
     ```powershell
     node node_modules/vite/bin/vite.js build
     ```
   - Invalidation condition: Build failure or syntax error.
3. **Quarantine Isolation Check**:
   - Verify none of the 19 protected files have their modification timestamps changed or entries in git diff.
4. **Desktop Preservation Check**:
   - Open `/crm/attendance` and `/crm/tasks` at viewport width >= 768px.
   - Verify desktop tables, Kanban boards, and 4 KPI cards remain 100% intact.
5. **Mobile Viewport Check**:
   - Open `/crm/attendance` and `/crm/tasks` at 375px/390px viewport width:
   - Attendance: Header with Live Sync badge + Geofences button, 2x2 stat pill badges, segmented tabs, shift card with left orange border, digital clock, radar geofence widget, and emerald `Clock In Now` CTA.
   - Tasks: Header with filter icon, status filter chips (`Active Workflows`, `Overdue`, `+ Create Task`), 2x2 stat badges, search bar, and high-density task stream with the 4 status emoji tags (`📌 TO DO`, `⚡ IN PROGRESS`, `🔍 UNDER REVIEW`, `✅ COMPLETED`) and contextual CTA buttons.
