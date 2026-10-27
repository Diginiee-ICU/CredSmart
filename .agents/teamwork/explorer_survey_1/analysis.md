# Universal Header Architecture Survey & Specification

**Date**: 2026-10-27  
**Author**: Explorer Subagent (Survey 1)  
**Target Module**: Universal Command Bar / Global App Shell (`src/components/AppLayout.tsx`)  
**Scope**: Platform Shield Logo Permanent Lockup, Multi-Tenant Store Selector, Desktop (52px / `h-13`) vs Mobile (48px / `h-12`) Ergonomics, and Zero-Regression Compatibility  

---

## 1. Executive Summary

CredSmart currently features a centralized application shell in `src/components/AppLayout.tsx` that wraps all authenticated POS/Billing and CRM routes. However, an architectural review revealed two major defects:
1. **Brand Identity Dilution / Erasure**: The top-left logo container currently prioritizes `org?.logo_url` over the CredSmart platform brand. When a tenant organization has a custom logo, the CredSmart shield mark is completely wiped from the header and replaced with the store's icon and store name. If no logo is set, a generic blue box with a Lucide `Sparkles` icon is rendered instead of the official CredSmart Shield.
2. **Mobile Viewport Overflow & Erroneous Header Hiding**:
   - The Store Switcher pill is hardcoded with `hidden sm:flex`, rendering it completely invisible and inaccessible to mobile users from the header.
   - On the CRM Dashboard route (`/crm` or `/crm/dashboard`), `AppLayout.tsx` uses `isCrmDashboard && "hidden md:flex"`, which forcibly suppresses the universal header on mobile devices in favor of a duplicate, non-standard mobile top-bar in `CRMDashboard.tsx`.
   - On 360px–430px screens, the current header controls (if all made visible without responsive sizing) sum to ~370px, causing severe horizontal overflow.

This survey establishes the complete architectural blueprint to:
1. Permanently anchor the official CredSmart platform shield mark (`/favicon.png`) with styled wordmark on the far left.
2. Position a dedicated Tenant Business Selector dropdown pill immediately adjacent, separated by a crisp 1px hairline divider (`border-slate-200 dark:border-slate-800`), visible on both desktop and mobile.
3. Enforce a strict 48px height (`h-12`) on mobile with a compact 28x28px shield logo and compact store pill, guaranteeing zero horizontal wrapping or overflow across standard 360px–430px screens.
4. Preserve 100% desktop fidelity (52px / `h-13` command bar, centered `⌘K` palette, Royal Blue split button, and keyboard navigation).

---

## 2. Codebase Topology & Component Inventory

| File Path | Role in Header Architecture | Current State & Findings |
|---|---|---|
| `src/components/AppLayout.tsx` | Universal application shell & global header container (lines 482–964) | Contains top `<header>` element (52px `md:h-13` desktop, 48px mobile). Holds brand mark, store switcher, suite switcher, search, quick action button, bell, and profile trigger. |
| `src/components/AppSidebar.tsx` | 3D Dropdown Navigator (Mega Menu) & Mobile Bottom Dock | On desktop, triggered via `setSidebarOpen` chevron. On mobile (< 768px), renders fixed bottom thumb dock (56px) with primary modules. |
| `src/components/SuiteSwitcher.tsx` | Interactive segmented switcher (`[ POS & Billing \| CRM ]`) | Rendered in `AppLayout.tsx` line 610. Emits `credsmart:suite_changed`. Supports compact `sm:hidden font-bold` label ("POS"). |
| `src/components/public/CredSmartLogo.tsx` | Public brand components & SVGs | Exports `CredSmartShieldIcon`, which renders `<img src="/favicon.png" alt="CredSmart Shield Logo" ... />`. |
| `public/favicon.png` | Official CredSmart platform shield brand asset | High-resolution 169 KB PNG image representing the official CredSmart shield mark. |
| `src/pages/POSBilling.tsx` | Dedicated Full-Screen POS billing terminal | Excluded from `AppLayout` header via `!isPosRoute`. Renders its own specialized terminal command bar (lines 2230–2285). |
| `src/pages/crm/CRMDashboard.tsx` | CRM Landing Page | Contains an inline mobile header (lines 472–517) because `AppLayout.tsx` conditionally hides the global header on `/crm` mobile. |

---

## 3. Brand Asset Analysis & Platform Mark Identification

### 3.1 Official Brand Assets in `public/`
- `public/favicon.png` (169,112 bytes): The definitive, official CredSmart platform shield mark.
- `public/logo-icon.png` (169,112 bytes): Identical binary copy of `favicon.png`.
- `public/logo.png` (671,793 bytes): Full horizontal logo with wordmark.
- `public/logo-static.jpeg` (105,453 bytes): Static banner asset.

### 3.2 Platform Mark Component Reference
In `src/components/public/CredSmartLogo.tsx:11-23`:
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

### 3.3 Target Brand Architecture Lockup
The top-left header region must feature a permanent **Dual Lockup**:
```
┌─────────────────────────────────┐   │   ┌────────────────────────────────┐
│  [Shield Logo]  CredSmart       │   │   │  [Store Logo]  Store Name  ▼   │
│  (Platform Mark - Permanent)    │   │   │  (Tenant Store Selector Pill)  │
└─────────────────────────────────┘   │   └────────────────────────────────┘
                                      │
                         Subtle Hairline Divider
```

1. **Far Left Platform Mark**:
   - Container: `w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 p-1 shadow-2xs overflow-hidden flex items-center justify-center shrink-0 transition-transform group-hover:scale-105`
   - Shield Image: `<img src="/favicon.png" alt="CredSmart" className="w-full h-full object-contain select-none" />`
   - Wordmark: `<span className="hidden sm:inline font-bold text-sm tracking-tight text-slate-900 dark:text-white font-sans">CredSmart</span>`
   - Navigation Link: `NavLink` routes to `/dashboard` (or `/crm` when in CRM suite, `/checkout` for cashier).

2. **Subtle Hairline Divider**:
   - `<div className="h-4 sm:h-5 w-px bg-slate-200/80 dark:bg-slate-800 shrink-0" aria-hidden="true" />`

3. **Tenant Business Selector (Adjacent Store Switcher Pill)**:
   - Trigger Container: `flex h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 items-center gap-1.5 shadow-2xs transition-colors cursor-pointer select-none max-w-[100px] xs:max-w-[130px] sm:max-w-[180px] lg:max-w-[220px]`
   - Store Icon / Logo: If `org?.logo_url` exists, render `<img src={org.logo_url} alt="" className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded object-contain shrink-0 border border-slate-200/60 dark:border-slate-700" />`. Otherwise render `<Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400 shrink-0" />`.
   - Store Label: `<span className="truncate text-[11px] sm:text-xs font-semibold">{org?.name || "My Business"}</span>`
   - Dropdown Indicator: `<ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400 shrink-0" />`

---

## 4. Desktop (>= 768px) vs Mobile (< 768px) Viewport Divergence

### 4.1 Specification Matrix

| Feature / Element | Desktop Standard (>= 768px) | Mobile Ergonomics (< 768px) |
|---|---|---|
| **Header Height** | Strictly 52px (`md:h-13`) | Strictly 48px (`h-12` / `h-[calc(3rem+env(safe-area-inset-top,0px))]`) |
| **CredSmart Platform Mark** | 30x30px (`sm:w-7.5 sm:h-7.5`) Shield icon + styled "CredSmart" wordmark (`hidden sm:inline`) | 28x28px (`w-7 h-7`) Shield icon; Wordmark hidden to prioritize screen width |
| **Divider** | 20px height (`sm:h-5 w-px`) | 16px height (`h-4 w-px`) |
| **Store Switcher Pill** | Full width (`h-8 px-2.5`, max-w 180–220px) with logo, full store name, and chevron | Compact pill (`h-7 px-2`, max-w 95–115px) with micro logo, truncated name, and micro chevron |
| **Sidebar Chevron (`setSidebarOpen`)** | Visible (`sm:flex w-7.5 h-7.5`) to open 3D Dropdown Mega Menu | Hidden (`hidden sm:flex`) because mobile uses bottom navigation dock (`AppSidebar`) |
| **Suite Switcher (`[ POS \| CRM ]`)** | Visible (`sm:inline-flex`) with full labels ("POS & Billing", "CRM") | Hidden (`hidden sm:inline-flex`) or rendered in bottom dock / profile sheet |
| **Command Palette (`⌘K`)** | Centered input trigger (`hidden md:flex flex-1 max-w-md mx-2`, h-8.5) | Replaced with compact 30x30px search icon button (`w-7.5 h-7.5 md:hidden`) |
| **Auto Import Tally** | Visible on xl screens (`hidden xl:flex h-8.5 px-2.5`) | Hidden on mobile |
| **Live Sync Pill** | Visible (`hidden sm:inline-flex text-[11px] font-mono`) with green pulsing dot | Hidden on mobile to prevent clutter |
| **Action Split Button** | Full 34px button (`hidden sm:flex h-8.5`) with "+ New Invoice" / "+ Quick Action" and split chevron | Compact circular/rounded action button (`flex sm:hidden w-7.5 h-7.5 bg-blue-600 text-white`) |
| **Notification Center Bell** | 34x34px (`hidden sm:flex w-8.5 h-8.5`) with unread badge | 30x30px (`flex sm:hidden w-7.5 h-7.5`) with unread badge |
| **Profile Trigger** | 34x34px (`sm:w-8.5 sm:h-8.5`) avatar button | 30x30px (`w-7.5 h-7.5`) avatar button |

### 4.2 Pixel Budget Math on a Minimum 360px Mobile Screen

```
Total Viewport Width: 360px
Left Margin / Padding: px-2.5 (10px)
Right Margin / Padding: px-2.5 (10px)
Net Usable Horizontal Space: 340px

Left Lockup Elements:
  - CredSmart Shield Logo: 28px
  - Gap: 4px
  - Hairline Divider: 1px
  - Gap: 4px
  - Compact Store Switcher Pill: ~75px (14px icon + 4px gap + 45px text + 2px gap + 10px chevron)
  Left Lockup Subtotal = 112px

Right Control Group Elements:
  - Mobile Search Trigger: 30px
  - Gap: 6px
  - Quick Action (+) Button: 30px
  - Gap: 6px
  - Notification Bell: 30px
  - Gap: 6px
  - Profile Avatar: 30px
  Right Controls Subtotal = 138px

Combined Width: 112px + 138px = 250px
Free Horizontal Breathing Space: 340px - 250px = 90px!
```
**Conclusion**: With 90px of remaining breathing space, this configuration **guarantees zero horizontal overflow, zero wrapping, and zero horizontal scrolling** across all screens from 360px to 430px.

---

## 5. Detailed Code Changes Proposed for `src/components/AppLayout.tsx`

### 5.1 Before: Current Implementation (Lines 482–555)
```tsx
      {/* Global Top Header */}
      {!isPosRoute && (
        <header
          className={cn(
            "pt-[env(safe-area-inset-top,0px)] h-[calc(3rem+env(safe-area-inset-top,0px))] md:h-13 shrink-0 sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 px-2.5 sm:px-4 shadow-2xs bg-white/95 dark:bg-slate-900/95 backdrop-blur-md select-none",
            isCrmDashboard && "hidden md:flex"
          )}
        >
            {/* LEFT: 28px Brand Mark + Menu Toggle + Org Switcher + Suite Switcher */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
              {/* Compact 28px Brand Mark & Wordmark with Org Logo Support */}
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

              {/* Sidebar Menu Toggle Arrow */}
              <button
                type="button"
                onClick={() => setSidebarOpen((v) => !v)}
                ...
              >
                <ChevronDown ... />
              </button>

              {/* Dedicated Organization Switcher Dropdown Pill */}
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
                ...
```

### 5.2 After: Redesigned Universal Header Architecture
```tsx
      {/* Global Top Header — Screen-Fitted 52px Desktop / 48px Mobile */}
      {!isPosRoute && (
        <header
          className={cn(
            "pt-[env(safe-area-inset-top,0px)] h-[calc(3rem+env(safe-area-inset-top,0px))] md:h-13 shrink-0 sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-1.5 sm:gap-2 px-2.5 sm:px-4 shadow-2xs bg-white/95 dark:bg-slate-900/95 backdrop-blur-md select-none",
            isCrmDashboard && "hidden md:flex"
          )}
        >
            {/* LEFT: Permanent CredSmart Shield Mark + Divider + Active Store Switcher Pill + Desktop Navigation Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
              {/* Permanent CredSmart Platform Brand Mark */}
              <NavLink
                to={isCrmSuite ? ROUTE_PATHS.crm : (userRole === "cashier" ? ROUTE_PATHS.checkout : ROUTE_PATHS.dashboard)}
                title={isCrmSuite ? "CredSmart CRM Command Center" : "CredSmart POS & Billing"}
                className="flex items-center gap-1.5 sm:gap-2 rounded-lg py-1 shrink-0 select-none cursor-pointer group"
              >
                <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 p-1 shadow-2xs overflow-hidden flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                  <img
                    src="/favicon.png"
                    alt="CredSmart Shield"
                    className="w-full h-full object-contain select-none"
                    loading="eager"
                  />
                </div>
                <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white font-sans hidden sm:inline">
                  CredSmart
                </span>
              </NavLink>

              {/* 1px Hairline Divider */}
              <div className="h-4 sm:h-5 w-px bg-slate-200/80 dark:bg-slate-800 shrink-0" aria-hidden="true" />

              {/* Dedicated Tenant Business Selector Dropdown Pill (Mobile & Desktop) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex h-7 sm:h-8 px-1.5 sm:px-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 items-center gap-1 sm:gap-1.5 shadow-2xs transition-colors cursor-pointer select-none max-w-[100px] xs:max-w-[130px] sm:max-w-[180px] lg:max-w-[220px]"
                    title={org?.name || "Select Business"}
                  >
                    {org?.logo_url ? (
                      <img
                        src={org.logo_url}
                        alt={org?.name || "Store Logo"}
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded object-contain shrink-0 border border-slate-200/60 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    ) : (
                      <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    )}
                    <span className="truncate text-[11px] sm:text-xs font-semibold">
                      {org?.name || "My Business"}
                    </span>
                    <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" sideOffset={6} className="w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 p-2 shadow-xl rounded-xl z-dropdown animate-in fade-in zoom-in-95 duration-150">
                  <DropdownMenuLabel className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between px-2 pt-1 pb-1">
                    <span>YOUR BUSINESSES</span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold font-mono">{(organizations || []).length} Store(s)</span>
                  </DropdownMenuLabel>
                  <div className="space-y-1 my-1 max-h-48 overflow-y-auto scrollbar-thin">
                    {(organizations || []).filter(Boolean).map((business) => {
                      if (!business) return null;
                      const isActive = business.id === orgId;
                      const bizName = business.name || "Store";
                      return (
                        <DropdownMenuItem
                          key={business.id}
                          onSelect={() => {
                            if (business.id) switchOrganization(business.id);
                            toast.success(`Switched to "${bizName}"`);
                          }}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer gap-2",
                            isActive
                              ? "bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold border border-blue-200 dark:border-blue-800/60"
                              : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            {business.logo_url ? (
                              <img
                                src={business.logo_url}
                                alt={bizName}
                                className="w-5 h-5 rounded-md object-contain border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 shrink-0"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                <Building2 className="w-3 h-3 text-slate-500" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold">{bizName}</p>
                              <p className="text-[11px] text-slate-400 font-mono truncate">{business.business_type || "Retail"}</p>
                            </div>
                          </div>
                          {isActive && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                  <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 my-1" />
                  <DropdownMenuItem
                    onSelect={() => setCreateBusinessModalOpen(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Business / Branch</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sidebar Menu Toggle Arrow — Desktop only (sm:flex) */}
              <button
                type="button"
                onClick={() => setSidebarOpen((v) => !v)}
                aria-label={sidebarOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={sidebarOpen}
                title={sidebarOpen ? "Close Menu" : "Open Menu"}
                className={cn(
                  "hidden sm:flex items-center justify-center w-7.5 h-7.5 rounded-lg text-xs font-medium cursor-pointer border transition-colors select-none shadow-2xs shrink-0 active:scale-95",
                  sidebarOpen
                    ? "bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400"
                    : "bg-slate-50 dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 stroke-[2] transition-transform duration-200",
                    sidebarOpen ? "rotate-180 text-blue-600 dark:text-blue-400" : ""
                  )}
                />
              </button>

              {/* Suite Switcher — Desktop only (sm:inline-flex) */}
              {userRole !== "cashier" && (
                <div className="hidden sm:inline-flex">
                  <SuiteSwitcher
                    onSuiteChange={(newSuite) => {
                      navigate(newSuite === "crm" ? ROUTE_PATHS.crm : ROUTE_PATHS.dashboard);
                    }}
                  />
                </div>
              )}
            </div>
```

---

## 6. Analysis of Challenger Tests & Impact Assessment

### 6.1 `src/test/desktopShellMilestone2.challenger.test.tsx`
Lines 55–64 test:
```tsx
it("verifies compact 28px brand mark (w-7 h-7) with Sparkles icon and Inter CredSmart wordmark", () => {
  expect(appLayoutSource).toMatch(/w-7\s+h-7\s+rounded-lg\s+bg-blue-600/);
  expect(appLayoutSource).toMatch(/<Sparkles[^>]*w-3\.5\s+h-3\.5/);
  expect(appLayoutSource).toMatch(/CredSmart<\/span>/);
});
```
**Impact Analysis**:
The old Milestone 2 challenger test specifically looked for `bg-blue-600` and `<Sparkles`. Replacing it with the official `/favicon.png` platform shield icon will cause this assertion to fail unless the test is updated to assert the new permanent shield mark (`src="/favicon.png"` or `CredSmartShieldIcon`), OR the implementer maintains backward regex compatibility by allowing both or updating the challenger test.

### 6.2 `src/test/mobileErgonomicsChallenger.test.ts`
AppLayout tests passed completely:
- `it("verifies AppLayout.tsx encloses root viewport in overflow-hidden")`
- `it("verifies AppLayout.tsx applies dynamic safe-area bottom clearance")`
The proposed header modifications preserve both root `overflow-hidden` and dynamic safe-area clearance, ensuring 100% compliance.

---

## 7. Recommended Implementation Sequence

1. **Step 1: Universal Header Refactoring in `src/components/AppLayout.tsx`**:
   - Apply the redesigned left brand mark with `/favicon.png`.
   - Insert hairline divider.
   - Refactor Store Switcher pill to be visible on both mobile and desktop (`flex h-7 sm:h-8`).
   - Condition the sidebar menu toggle and SuiteSwitcher to `hidden sm:flex` / `hidden sm:inline-flex`.
2. **Step 2: Remove `isCrmDashboard && "hidden md:flex"`**:
   - Allow the universal header to render consistently on `/crm` mobile.
   - Remove duplicate mobile header from `CRMDashboard.tsx` to prevent redundant stacked headers.
3. **Step 3: Test Suite Alignment**:
   - Update `desktopShellMilestone2.challenger.test.tsx` to validate the permanent CredSmart Shield Mark and store switcher pill.
   - Add new dedicated unit tests for the mobile lockup and store switcher dropdown.
4. **Step 4: Full Build & Verification**:
   - Run `npx tsc --noEmit` and `npx vitest run`.
