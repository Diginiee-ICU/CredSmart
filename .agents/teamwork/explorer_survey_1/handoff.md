# Handoff Report: Universal Header Architecture (Survey 1)

**Agent**: Explorer Survey 1 (Universal Header Architecture)  
**Parent / Recipient**: Orchestrator (`d2d7b35b-d1d5-45b5-9a65-d7a02d968987`)  
**Date**: 2026-10-27  
**Type**: Hard Handoff (Investigation & Architecture Survey Complete)  

---

## 1. Observation

1. **Header Location & Current Implementation**:
   - The universal command bar is implemented in `src/components/AppLayout.tsx:482-964` inside a `<header>` tag.
   - Current header height declaration (`src/components/AppLayout.tsx:484-487`):
     ```tsx
     <header
       className={cn(
         "pt-[env(safe-area-inset-top,0px)] h-[calc(3rem+env(safe-area-inset-top,0px))] md:h-13 shrink-0 sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 px-2.5 sm:px-4 shadow-2xs bg-white/95 dark:bg-slate-900/95 backdrop-blur-md select-none",
         isCrmDashboard && "hidden md:flex"
       )}
     >
     ```
   - `isCrmDashboard && "hidden md:flex"` hides the universal header on `/crm` mobile viewports.
   - `!isPosRoute` suppresses the header on `/pos` and `/checkout`, delegating to `POSBilling.tsx:2230` which provides its own full-screen terminal command bar.

2. **Current Brand & Store Identity Coupling Defect**:
   - In `src/components/AppLayout.tsx:493-514`:
     ```tsx
     <NavLink
       to={isCrmSuite ? ROUTE_PATHS.crm : (userRole === "cashier" ? ROUTE_PATHS.checkout : ROUTE_PATHS.dashboard)}
       title={isCrmSuite ? "CredSmart CRM Command Center" : "CredSmart POS & Billing"}
       className="flex items-center gap-2 rounded-lg py-1 shrink-0 select-none cursor-pointer group"
     >
       {org?.logo_url ? (
         <div className="w-7 h-7 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 p-0.5 shadow-2xs overflow-hidden flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
           <img
             src={org.logo_url}
             alt={org.name || "Business Logo"}
             className="w-full h-full object-contain rounded-md"
           />
         </div>
       ) : (
         <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-2xs transition-transform group-hover:scale-105">
           <Sparkles className="w-3.5 h-3.5 fill-white/20 stroke-white" />
         </div>
       )}
       <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white font-sans hidden sm:inline">
         {org?.name ? org.name : "CredSmart"}
       </span>
     </NavLink>
     ```
   - When an organization has a logo (`org.logo_url`) or custom name (`org.name`), the CredSmart platform brand mark is entirely replaced by the store logo/name.
   - If no organization logo exists, a generic blue box with a Lucide `Sparkles` icon is displayed instead of the official CredSmart shield mark.

3. **Store Switcher Dropdown Current State**:
   - In `src/components/AppLayout.tsx:540-549`:
     ```tsx
     <DropdownMenu>
       <DropdownMenuTrigger asChild>
         <button
           type="button"
           className="hidden sm:flex h-8 px-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 items-center gap-1.5 shadow-2xs transition-colors cursor-pointer select-none"
           title={org?.name || "Select Business"}
         >
           <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
           <span className="max-w-[110px] lg:max-w-[140px] truncate">{org?.name || "My Business"}</span>
           <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
         </button>
       </DropdownMenuTrigger>
     ```
   - The Store Switcher pill is hardcoded with `hidden sm:flex`, rendering it invisible on mobile screens.
   - It is located after the sidebar toggle arrow (`setSidebarOpen`), separating it from the primary brand lockup.

4. **Brand Asset Verification**:
   - `public/favicon.png` (169,112 bytes) is the definitive CredSmart platform shield asset.
   - `src/components/public/CredSmartLogo.tsx:11-23` wraps `/favicon.png` as `CredSmartShieldIcon`:
     ```tsx
     export function CredSmartShieldIcon({ size = 36, className }: { size?: number; className?: string }) {
       return (
         <img
           src="/favicon.png"
           alt="CredSmart Shield Logo"
           width={size}
           height={size}
           className={cn("shrink-0 object-contain drop-shadow-md select-none", className)}
           style={{ width: size, height: size }}
           loading="eager"
         />
       );
     }
     ```

5. **Existing Automated Test Assertions**:
   - `src/test/desktopShellMilestone2.challenger.test.tsx:55-64` asserts:
     ```tsx
     expect(appLayoutSource).toMatch(/w-7\s+h-7\s+rounded-lg\s+bg-blue-600/);
     expect(appLayoutSource).toMatch(/<Sparkles[^>]*w-3\.5\s+h-3\.5/);
     expect(appLayoutSource).toMatch(/CredSmart<\/span>/);
     ```
   - `src/test/mobileErgonomicsChallenger.test.ts:186-207` asserts `flex flex-col h-screen w-full overflow-hidden` and `calc(6rem + env(safe-area-inset-bottom, 0px))`.

---

## 2. Logic Chain

1. **Observation 2 & 4** show that the top-left mark currently renders the tenant's store logo or a generic Sparkles placeholder.  
   → **Inference 1**: To satisfy Requirement R1, the platform mark must be permanently decoupled from `org.logo_url`. The container must unconditionally render `/favicon.png` inside `w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 p-1 shadow-2xs` paired with `<span className="hidden sm:inline font-bold text-sm tracking-tight text-slate-900 dark:text-white">CredSmart</span>`.

2. **Observation 3** shows that the Store Switcher dropdown pill is placed after the sidebar menu toggle and hidden on mobile via `hidden sm:flex`.  
   → **Inference 2**: The Store Switcher pill must be moved immediately adjacent to the platform mark, separated by a 1px hairline divider (`border-slate-200 dark:border-slate-800`), and its trigger must be updated to support mobile screens (`flex h-7 sm:h-8 px-1.5 sm:px-2.5 max-w-[100px] xs:max-w-[130px] sm:max-w-[180px] lg:max-w-[220px]`). It must display `org?.logo_url` (or `<Building2 />`) and `{org?.name || "My Business"}`.

3. **Observation 1 & Mobile Math**:  
   On a 360px viewport:
   - Available width after 10px margins (`px-2.5`): 340px.
   - Left Dual Lockup (Shield 28px + gap 4px + Divider 1px + gap 4px + Compact Store Pill 75px): 112px.
   - Right Control Group (Search 30px + Action(+) 30px + Bell 30px + Profile 30px + 3 gaps of 6px): 138px.
   - Total width: 112px + 138px = 250px.
   - Remaining buffer: 340px - 250px = 90px.  
   → **Inference 3**: Enforcing `hidden sm:flex` on the sidebar chevron and `hidden sm:inline-flex` on SuiteSwitcher guarantees zero horizontal overflow, zero wrapping, and zero horizontal scrollbar on screens from 360px to 430px, while mobile navigation is provided by the bottom thumb dock (`AppSidebar.tsx:258-505`).

4. **Observation 1 (`isCrmDashboard && "hidden md:flex"`)**:  
   → **Inference 4**: Removing this condition allows the universal header to render uniformly on `/crm` mobile, eliminating the need for the redundant mobile header in `CRMDashboard.tsx:472-517`.

5. **Observation 5 (`desktopShellMilestone2.challenger.test.tsx`)**:  
   → **Inference 5**: Replacing `<Sparkles>` and `bg-blue-600` with the permanent `/favicon.png` shield mark requires updating lines 55–64 of `desktopShellMilestone2.challenger.test.tsx` to prevent false-positive test regressions.

---

## 3. Caveats

1. **POS Billing Route Preservation**: The `/checkout` and `/pos` routes intentionally bypass `AppLayout.tsx`'s header via `!isPosRoute` and render their own specialized terminal header in `POSBilling.tsx:2230`. This is intentional and preserved.
2. **Legacy Challenger Test Dependencies**: `desktopShellMilestone2.challenger.test.tsx` statically audits `AppLayout.tsx` for `bg-blue-600` and `<Sparkles`. When the implementer updates to the permanent CredSmart shield mark, this test file will need its assertion adjusted to match the new permanent brand mark.
3. **No Code Written**: Per the read-only Explorer role, no application source files or tests were modified during this investigation.

---

## 4. Conclusion

The Universal Header architecture is completely mapped, verified, and ready for surgical implementation:
1. `src/components/AppLayout.tsx` lines 482–565 must be updated with the Dual Lockup: permanent CredSmart Shield Mark (`/favicon.png`) on the far left, followed by a 1px hairline divider, followed immediately by the responsive active Store Switcher dropdown pill.
2. Desktop viewports (>= 768px) maintain the 52px command bar height (`md:h-13`), centered `⌘K` command palette, Royal Blue split button, and desktop suite switcher with 100% preservation.
3. Mobile viewports (< 768px) enforce strict 48px height (`h-12`), 28x28px shield logo, compact store pill, and compact 30x30px right-hand controls with 90px of clearance on 360px viewports (zero horizontal overflow).

---

## 5. Verification Method

To independently verify the architecture and recommendations:
1. **Source Code Inspection**:
   - Inspect `src/components/AppLayout.tsx:482-606` to verify current brand replacement flaw and `hidden sm:flex` store switcher.
   - Inspect `public/favicon.png` and `src/components/public/CredSmartLogo.tsx:11-23` to confirm the platform shield mark.
2. **Analysis Report**:
   - Review complete architectural specification, before/after code snippets, and pixel budget math in:
     `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\explorer_survey_1\analysis.md`.
3. **Automated Vitest Execution**:
   - Run: `cmd /c npx vitest run src/test/desktopShellMilestone2.challenger.test.tsx`
   - Run: `cmd /c npx vitest run src/test/mobileErgonomicsChallenger.test.ts`
   - Run: `cmd /c npx tsc --noEmit`
