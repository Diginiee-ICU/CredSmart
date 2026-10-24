---
description: Enforce CredSmart minimal, user-friendly, fast-access, and non-crowded design system rules across all components, styles, and viewports.
trigger: always_on
---

# CredSmart Minimal & Fast-Access Design System Rules (Master Standard)

All modifications to UI, CSS, themes, layout components, and pages must strictly adhere to these rules.

## 1. Proportions & Button Sizing (Zero Bloated Buttons)
- **Compact & Refined Controls**: Never use oversized buttons (e.g. avoid `h-11`, `h-12`, `px-8`, `rounded-3xl` bubble buttons). Standardize on:
  - Standard Action Button: `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs` (34px height)
  - Small / Table Action Button: `h-7 px-2.5 rounded-md text-[11px] font-medium` (28px height)
  - Micro / Inline Icon Button: `w-7.5 h-7.5 rounded-md` (30x30px)
  - Mobile Center Elevated CTA: `46x46px rounded-xl` (ergonomic thumb target, not oversized)
- **Tactile & Responsive**: `active:scale-[0.98] transition-colors duration-150`.

## 2. Screen-Fitted Viewports (Zero Long Scrollable Pages)
- **Desktop Viewport Containment**: Layouts must fit within standard monitor heights (768px - 1080px) without requiring long, tedious vertical scrolling.
- **Independent Scrolling Panes**:
  - Top header and action bars are sticky/fixed.
  - POS Workbench: Catalog scrolls independently on left; Cart scrolls independently on right; Checkout bar fixed at bottom.
  - Data Tables: Table headers are sticky; rows scroll within a bounded container (`flex-1 min-h-0 overflow-y-auto`); pagination footer stays visible at bottom.
- **Mobile Viewport Optimization**: Mobile screens (360px - 430px) must display 4-5 items per viewport with compact, high-density cards rather than sprawling oversized blocks.

## 3. Breathing Room & De-Cluttering (Zero Crowding)
- **Eliminate Micro-Prose**: Strip redundant explanatory text from cards (e.g., delete "Outstanding customer credit ledger balance.", "Total sales for this month.", "Reconciled liquidity across accounts."). Let clean, prominent metrics and clear labels speak for themselves.
- **Balanced Whitespace**: Use 8px–12px padding (`p-3` or `p-3.5`) inside cards, 12px gaps (`gap-3`) between grid items.
- **Crisp Hairline Surfaces**: Rely exclusively on 1px borders (`border-slate-200/80` light, `border-slate-800` dark) and subtle micro-shadows (`shadow-xs`). Prohibit heavy 3D glass reflections, skeuomorphic bevels, liquid glass, and glowing neon halos.

## 4. Typography & Readability Scale
- **Primary Sans**: Use `'Inter'`, `-apple-system`, `BlinkMacSystemFont`, `system-ui`, `sans-serif` for all UI text, headings, and labels.
- **Tabular Monospace**: Use `'IBM Plex Mono'`, `ui-monospace`, `monospace` with `font-mono tabular-nums` strictly for currency amounts (₹), quantities, invoice numbers, dates, and barcodes.
- **Strict Size Hierarchy (No Sub-11px Micro-Fonts)**:
  - Micro / Badges: `text-[11px]` (font-medium or font-semibold)
  - Small / Tables / Secondary: `text-xs` (12px)
  - Body / Controls / Inputs: `text-sm` (14px)
  - Subheadings / Card Titles: `text-base` (16px)
  - Page Titles: `text-lg` or `text-xl` (18px - 20px)
  - Hero KPI Figures: `text-2xl` (24px, bold)

## 5. Colors & Accessible Contrast
- **Clean Neutral Canvas**:
  - Light Mode: Background `#F8FAFC` (`bg-slate-50`), Cards `#FFFFFF` (`bg-white`), Borders `#E2E8F0` (`border-slate-200/80`).
  - Dark Mode: Background `#090D16` (`bg-slate-950`), Cards `#111726` (`bg-slate-900`), Borders `#1E293B` (`border-slate-800`).
- **Single Cohesive Accent**: Royal/Electric Blue (`#2563EB` / `bg-blue-600` / `hover:bg-blue-700`).
- **Semantic Indicators**:
  - Emerald (`#10B981`): Paid, In Stock, Active.
  - Rose (`#E11D48`): Overdue, Voided, Out of Stock.
  - Amber (`#F59E0B`): Pending, Warning, Due Soon.

## 6. Desktop vs Mobile Layout Divergence
- **Desktop (>= 768px)**: Unified slim 52px top command bar (`h-13`), global Command Palette (`⌘K`), dense data tables (38px–42px row height), split POS terminal with hotkeys (`F1`-`F7`).
- **Mobile (< 768px)**: 48px slim header, swipeable 1-tap action chips, fixed bottom thumb dock (56px with `safe-area-inset-bottom`), responsive data cards, full-screen bottom-sheet drawers for dialogs, minimum 44x44px touch targets.

## 7. Zero Regression Rule
- Never modify underlying business logic, Supabase real-time subscriptions, GST tax calculation engines, routes, role permissions, or printing pipelines.
