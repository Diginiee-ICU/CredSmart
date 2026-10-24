# Design Tokens & Base Primitives Specification Mining Report
**Milestone 1 Discovery & Implementation Blueprint**

**Author**: Design Tokens & Base Primitives Specification Miner  
**Project**: CredSmart Minimal & Fast-Access Redesign  
**Working Directory**: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\survey_miner_tokens`  
**Date**: 2026-10-24T19:05:00Z  

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Typography | Google Fonts Ingestion | Ingests 'Inter', 'IBM Plex Mono', and 'Instrument Sans' font weights via CDN | `<link>` in `index.html:18`, `@import` in `src/index.css:1` | CSS `@font-face` definitions | Network failure fallbacks to system fonts | Inspection of `index.html` & `src/index.css` |
| 2 | Typography | Primary Sans Font Family | Currently configured to `'Instrument Sans'` rather than standard `'Inter'` | Tailwind `theme.extend.fontFamily.sans`, `display`; CSS `body`, `h1-h6` | Computed font-family for UI text | Falls back to system sans | Inspection of `tailwind.config.ts:17` & `src/index.css:185` |
| 3 | Typography | Monospace & Tabular Numerals | 'IBM Plex Mono' defined for `.font-mono`, but missing OpenType tabular figure flags | Tailwind `theme.extend.fontFamily.mono`, CSS `code, kbd, pre, .font-mono` | Fixed-pitch font glyphs | Proportional digits fluctuate column widths without `tnum` | Inspection of `src/index.css:197` |
| 4 | Typography | Font Size Scale & Hierarchy | Scale contains sub-11px micro-fonts (`text-[9px]`, `text-[10px]`) violating standard | Tailwind classes across components (e.g. `CRMBadge.tsx:92`) | Font sizing < 11px | Accessibility & readability failure on low-contrast screens | Codebase grep audit |
| 5 | Tailwind Spacing | Missing Half-Step Spacing Tokens | Spacing scale lacks `'7.5'` (30px), `'8.5'` (34px), `'11.5'` (46px), `'13'` (52px) | Tailwind utility classes `h-8.5`, `w-7.5`, `h-13` in components | Computed CSS style rules | Fails to resolve style: `spacing 8.5: undefined`, zero height generated | Node evaluation of Tailwind resolved config |
| 6 | Button Primitives | Button Sizes in `button.tsx` | Sizes use 36px (`default`), 32px (`sm`), 44px bubble (`lg`, `pill-lg`), 36px bubble (`pill`), 36px (`icon`) | `size` prop on `<Button>` | Button bounding box & padding classes | Violates 34px / 28px / 30px / 46px minimal design standard | Inspection of `src/components/ui/button.tsx:31` |
| 7 | Button Primitives | Skeuomorphic Button Variants | Variants `default`, `ruby`, `gold` use multi-stop linear gradients, lift shadows, and hover transforms | `variant` prop on `<Button>` | Background image gradients & 3D shadow lifts | Visual noise, sluggish 300ms transitions, heavy GPU draw | Inspection of `src/components/ui/button.tsx:12` |
| 8 | Button Primitives | Button Ripple Surface | Base button style injects `.ripple-surface` with animated pseudo-element ripple | Applied unconditionally to all buttons | Expanding CSS scale animation on active click | Clutters tactile feedback; conflicts with fast-access feel | Inspection of `src/components/ui/button.tsx:8` |
| 9 | Button Primitives | Bloated Buttons in Pages | Hardcoded `h-11`, `h-12`, `px-8`, and `rounded-3xl` bubble buttons found in 20+ files | Inline Tailwind classes in pages/modals | Oversized button elements | Disproportionate touch targets, wastes vertical viewport | Codebase grep audit |
| 10 | Card Primitives | Card Container Base Styles | `Card` component supports `variant="glass"` which injects skeuomorphic `.liquid-glass` | `<Card variant="glass">` | Inset white specular border, 24px blur, lift shadow | Heavy visual noise and blur rendering overhead | Inspection of `src/components/ui/card.tsx:10` |
| 11 | Card Primitives | Card Content Padding | Default `CardHeader` (`p-6`) and `CardContent` (`p-6 pt-0`) waste 24px vertical padding | Standard shadcn card wrappers | 24px container padding | Pushes content below fold on 768px-1080px monitors | Inspection of `src/components/ui/card.tsx:17` |
| 12 | Table Primitives | Table Row & Header Density | `TableHead` is `h-12` (48px) and `TableCell` is `p-4` (vertical padding 16px), causing 56px+ rows | `<Table>`, `<TableHead>`, `<TableCell>` | Table layout bounding boxes | Requires long vertical scrolling, violates 38px-42px row standard | Inspection of `src/components/ui/table.tsx:49, 60` |
| 13 | Surface Color Tokens | Light Mode Neutral Canvas | Currently configured as Warm Ivory (`--ivory`, `--background: 40 20% 98%`, `--primary: 232 45% 22%`) | CSS `:root` variables in `src/index.css` | Global background & text colors | Off-white ivory tint instead of crisp `#F8FAFC` & slate-900 | Inspection of `src/index.css:13` |
| 14 | Surface Color Tokens | Dark Mode Midnight Minimal | Currently midnight with periwinkle primary (`--primary: 228 85% 72%`) and heavy card tint | CSS `.dark` variables in `src/index.css` | Dark theme surface variables | Sub-optimal contrast for deep charcoal minimal canvas | Inspection of `src/index.css:103` |
| 15 | Surface Color Tokens | Primary Accent Blue | Currently CredAlert Institutional Navy (`hsl(232 45% 22%)`) instead of Royal Blue (`#2563EB`) | CSS `--primary` and `--ring` variables | Accent borders, primary CTAs, focus rings | Dark navy fails to pop against light backgrounds | Inspection of `src/index.css:24, 64` |
| 16 | Shadows & Glows | Heavy Glow & Bevel Utilities | 28 files contain `.hover-3d-glow`, `.liquid-glass`, `.liquid-card-3d`, `.glowing-btn-*`, `.glass-nav` | Utility classes across pages & components | 20px-40px blurred colored halos, inset specular bevels | Violates zero-skeuomorphic / zero-neon halo rules | Codebase grep audit |
| 17 | Background Effects | Body Multi-Stop Radial Wash | `body` contains 4 stacked radial gradients with gold, accent, and repeating ellipses | CSS `body` background-image in `src/index.css:178` | Fixed wallpaper gradient with dot pattern | Adds visual noise behind clean cards | Inspection of `src/index.css:178` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Tailwind Half-Step Spacing | `className="h-8.5"` or `className="w-7.5"` without `theme.extend.spacing` | Tailwind JIT engine emits **no CSS rule**; resolved theme returns `undefined`. Button renders with height auto or collapses. |
| 2 | Tabular Numerals in Monospace | `<span className="font-mono">₹1,23,456.78</span>` without OpenType `tnum` | IBM Plex Mono renders standard glyph widths, but numbers without OpenType tabular feature settings can jitter during rapid counter transitions. |
| 3 | Legacy Variant Calls | Existing code or tests rendering `<Button variant="ruby">` or `variant="gold"` | If variant keys are removed from CVA schema, TypeScript compilation fails (`tsc --noEmit`) and tests like `crmComponents.test.tsx` fail. |
| 4 | Legacy CRMCard Glass Variant | `CRMCard variant="glass"` tested in `crmComponents.test.tsx:964` | Test asserts `expect(el).toHaveClass("backdrop-blur-md")`. Removing this class breaks existing unit tests. |
| 5 | Sub-11px Badges in Mobile Feeds | Elements styled with `text-[9px]` or `text-[10px]` | Unreadable on standard Android/iOS viewports (< 400px), failing WCAG accessibility guidelines. |
| 6 | Protected Billing Routes | Attempting to edit `MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, etc. | Violates Project R7 Strict Exclusion rule ("Create Invoice flow 100% untouched"). |

---

## 1. Observation

Direct examination of codebase files via inspection tools, command executions, and AST searches revealed the following:

### A. Typography Declarations (`index.html`, `src/index.css`, `tailwind.config.ts`)
1. **Google Fonts imports exist**:
   - `index.html:18`:
     ```html
     <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
     ```
   - `src/index.css:1`:
     ```css
     @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Inter:wght@400;500;600;700&display=swap');
     ```
   Both `'Inter'` and `'IBM Plex Mono'` are loaded.
2. **Current Font Family mapping overrides 'Inter' with 'Instrument Sans'**:
   - `tailwind.config.ts:17-18`:
     ```ts
     sans: ["'Instrument Sans'", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
     display: ["'Instrument Sans'", "ui-sans-serif", "system-ui", "sans-serif"],
     mono: ["'IBM Plex Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
     ```
   - `src/index.css:185`:
     ```css
     font-family: 'Instrument Sans', ui-sans-serif, system-ui, -apple-system, sans-serif;
     ```
   - `src/index.css:192`:
     ```css
     h1, h2, h3, h4, h5, h6 {
       font-family: 'Instrument Sans', ui-sans-serif, system-ui, sans-serif;
     }
     ```
3. **Tabular Numeral OpenType feature settings missing**:
   - `src/index.css:197-199`:
     ```css
     code, kbd, pre, .font-mono {
       font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace;
     }
     ```
     Lacks `font-feature-settings: "tnum" on, "cv02", "cv03", "cv04"` and `font-variant-numeric: tabular-nums`.

### B. Tailwind Spacing Primitives (`tailwind.config.ts`)
Execution of `node -e "const resolveConfig = require('tailwindcss/resolveConfig'); const config = require('./tailwind.config.ts'); const full = resolveConfig(config.default || config); console.log('spacing 8.5:', full.theme.spacing['8.5'], 'spacing 7.5:', full.theme.spacing['7.5'], 'spacing 13:', full.theme.spacing['13']);"` yielded:
```
spacing 8.5: undefined spacing 7.5: undefined spacing 13: undefined
```
This confirms that classes such as `h-8.5` (34px standard button), `w-7.5` / `h-7.5` (30px micro icon button), and `h-13` (52px desktop command bar) fail to resolve in Tailwind unless explicitly added to `theme.extend.spacing`.

### C. Button Variants & Sizes (`src/components/ui/button.tsx`)
In `src/components/ui/button.tsx`:
- Base classes include `duration-300`, `rounded-xl`, and `ripple-surface`.
- `variant.default` uses `shadow-soft [background-image:var(--gradient-primary)] hover:-translate-y-0.5 hover:shadow-lift`.
- `variant.ruby` and `variant.gold` use heavy multi-stop gradients.
- `variant.outline` uses `glass-input text-foreground hover:border-[color-mix(in_oklab,var(--accent)_40%,transparent)]`.
- `variant.glass` uses `liquid-glass-soft`.
- `size.default`: `h-9 px-4 py-2 text-xs font-semibold rounded-xl` (36px, not 34px).
- `size.sm`: `h-8 rounded-lg px-3 text-xs` (32px, not 28px).
- `size.lg`: `h-11 rounded-full px-8 text-sm font-semibold` (bloated 44px bubble button).
- `size.pill`: `h-9 px-5 rounded-full text-xs font-semibold` (bubble button).
- `size.pill-lg`: `h-11 px-8 rounded-full text-sm font-semibold` (bloated 44px bubble button).
- `size.icon`: `h-9 w-9 rounded-xl` (36px, not 30px).

### D. Bloated Buttons Across Pages
Grep searches for `h-11`, `h-12`, and `rounded-3xl` identified:
- `src/components/notifications/NetworkInvoicePreviewModal.tsx:329, 339, 349`: `h-11 sm:h-9 text-xs font-semibold`
- `src/pages/VendorDiscovery.tsx:154`: `h-11 px-6 font-bold rounded-xl gap-2 glowing-btn-amber text-white text-xs`
- `src/components/ReceiptModal.tsx:366`: `rounded-3xl flex flex-col shadow-2xl`
- `src/components/CreateBusinessModal.tsx:438, 447`: `rounded-full text-xs font-bold [background-image:var(--gradient-primary)] text-white px-5` and `px-6`
- `src/pages/public/About.tsx:120`: `h-12 px-8 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF8533]`
- `src/pages/Landing.tsx:380, 389, 904, 963`: `h-12 sm:h-13 px-7 sm:px-8 rounded-xl`, `h-12 px-6`

### E. Skeuomorphic & Liquid Glass Classes
Grep search identified 28 files using skeuomorphic styles:
- `src/index.css`: `.hover-3d-glow` (line 210), `.liquid-glass` (line 237), `.glass-panel` (line 255), `.liquid-glass-soft` (line 273), `.glass-nav` (line 290), `.liquid-card-3d` (line 330), `.glowing-btn-amber` (line 348), `.glowing-btn-blue` (line 363), `.glowing-btn-orange` (line 378), `.glowing-nav-purple` (line 393), `.aurora` (line 406), `.glass-shimmer` (line 427), `.glass-card-3d` (line 723), `.glass-sidebar-midnight` (line 757).
- `src/components/AppLayout.tsx`: lines 478, 485, 547, 560, 572, 588, 596, 600, 608, 641, 758, 803 contain `glass-nav`, `hover-3d-glow`, and `glowing-btn-amber`.
- `src/components/ui/card.tsx:10`: `const glassClasses = "liquid-glass text-card-foreground";`.

### F. Table & Dialog Density
- `src/components/ui/table.tsx:49`: `TableHead` is `h-12 px-4 text-left align-middle font-medium` (48px header).
- `src/components/ui/table.tsx:60`: `TableCell` is `p-4 align-middle` (16px vertical padding, causing 56px+ row height).
- `src/components/ui/dialog.tsx:82`: `DialogContent` has `rounded-2xl sm:rounded-3xl border ... backdrop-blur-xl p-5 sm:p-6 shadow-2xl`.

### G. Color Token Mapping (`src/index.css`)
- Light mode:
  - Current: `--background: 40 20% 98%` (ivory), `--primary: 232 45% 22%` (navy), `--accent: 14 88% 58%` (ruby), `--border: 40 15% 88%`.
  - Master Target: `--background: 210 20% 98%` (`#F8FAFC`), `--card: 0 0% 100%` (`#FFFFFF`), `--foreground: 222 47% 11%` (`#0F172A`), `--border: 214 32% 91%` (`#E2E8F0`), `--primary: 221 83% 53%` (`#2563EB` royal blue), `--primary-soft: 214 100% 97%` (`#EFF6FF`).
- Dark mode:
  - Current: `--background: 224 45% 7%`, `--card: 224 35% 11%`, `--primary: 228 85% 72%`, `--border: 224 25% 18%`.
  - Master Target: `--background: 224 45% 6%` (`#090D16`), `--card: 224 35% 10%` (`#111726`), `--foreground: 210 40% 98%` (`#F8FAFC`), `--border: 217 33% 18%` (`#1E293B`), `--primary: 217 91% 60%` (`#3B82F6`), `--primary-soft: 224 45% 15%`.

---

## 2. Logic Chain

1. **Premise 1 (Font configuration)**: The user specification and `minimal-design-system.md` require `'Inter'` as the primary sans font and `'IBM Plex Mono'` with OpenType tabular figures (`font-mono tabular-nums`) for currency and data.
2. **Deduction 1**: Because `index.html` already links `'Inter'`, changing `theme.extend.fontFamily.sans` and `display` in `tailwind.config.ts`, and `body` / `h1-h6` in `src/index.css` from `'Instrument Sans'` to `'Inter'`, immediately activates `'Inter'` across the application without additional network assets. Adding `font-feature-settings: "tnum" on` to `.font-mono` and `.tabular-nums` guarantees tabular numeral column alignment.
3. **Premise 2 (Tailwind spacing)**: The standard button heights are 34px (`h-8.5`), 28px (`h-7`), 30px (`w-7.5 h-7.5`), 46px (`h-11.5`), and 52px command bar (`h-13`).
4. **Deduction 2**: Our verification command confirmed `theme.spacing['8.5']`, `['7.5']`, and `['13']` are `undefined`. Adding these four key increments to `theme.extend.spacing` in `tailwind.config.ts`:
   - `'7.5'`: `'1.875rem'` (30px)
   - `'8.5'`: `'2.125rem'` (34px)
   - `'11.5'`: `'2.875rem'` (46px)
   - `'13'`: `'3.25rem'` (52px)
   is mandatory for Milestone 1 so all downstream agents can use standard utility classes without falling back to arbitrary bracket syntax.
5. **Premise 3 (Button component standard)**: `src/components/ui/button.tsx` is the root primitive for all action buttons.
6. **Deduction 3**:
   - Updating `size.default` to `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs` standardizes every `<Button>` across the app to exactly 34px.
   - Updating `size.sm` to `h-7 px-2.5 rounded-md text-[11px] font-medium` provides the 28px table action button standard.
   - Adding `size.icon` as `w-7.5 h-7.5 rounded-md p-0` provides the 30px micro-icon standard.
   - Adding `size.cta` as `w-[46px] h-[46px] rounded-xl font-bold shadow-sm p-0` provides the 46px mobile center CTA.
   - Removing `ripple-surface`, `hover:-translate-y-0.5`, `shadow-lift`, and multi-stop gradients from `variant.default` enforces the minimal aesthetic.
   - Preserving `ruby`, `gold`, `glass`, `pill`, and `lg` variants by re-aliasing them to clean minimal styles preserves backward compatibility and ensures existing test suites pass.
7. **Premise 4 (Card, Table & Dialog Primitives)**:
   - In `card.tsx`, aliasing `variant="glass"` to a clean minimal card (`border border-border/80 bg-card text-card-foreground`) eliminates skeuomorphic liquid glass while honoring test contracts in `crmComponents.test.tsx`.
   - In `table.tsx`, reducing `TableHead` from `h-12` (48px) to `h-8.5` (34px) and `TableCell` padding from `p-4` to `py-2 px-3` satisfies the target 38px–42px row height for screen-fitted viewport containment.
   - In `dialog.tsx`, replacing `sm:rounded-3xl` with `sm:rounded-2xl` and `backdrop-blur-xl` with clean `bg-black/40` or subtle blur eliminates bloated modal bubble styling.
8. **Premise 5 (Color tokens)**: Updating `:root` and `.dark` variables in `src/index.css` to `#F8FAFC` (light canvas), `#090D16` (dark canvas), and `#2563EB` (royal blue) automatically updates all Tailwind semantic utility classes (`bg-background`, `bg-card`, `bg-primary`, `border-border`, etc.) throughout the app with zero template breakage.

---

## 3. Caveats

1. **Protected Create Invoice Workflow**:
   Per Rule R7 in the project prompt, the following files MUST NOT be edited by any agent:
   - `src/components/invoices/mobile/MobileCreateInvoice.tsx`
   - `src/components/SalesInvoiceModal.tsx`
   - `src/components/invoices/mobile/AddItemModal.tsx`
   - `src/components/invoices/mobile/SelectPartyModal.tsx`
   - `src/components/invoices/mobile/EditItemModal.tsx`
   All bill creation logic, tax calculation engines, and inputs must remain untouched. These files will naturally inherit global token updates (CSS variables, font family, button defaults) from `src/index.css` and `tailwind.config.ts` without needing file-level modifications.
2. **Third-Party & Public Marketing Pages**:
   Marketing landing pages (`src/pages/Landing.tsx`, `src/pages/public/*`) contain hero-specific button classes (`h-12`, `px-8`, custom gradient CTAs). The primary focus of the minimal redesign is the ERP/POS/CRM business workspace (`/billing/*`, `/crm/*`). Marketing page changes should be carefully scoped to avoid degrading external conversion funnels.
3. **No Breaking Variant Deletions**:
   `src/test/crmComponents.test.tsx` tests `CRMCard` with `variant="glass"`. Removing the variant prop key entirely would cause TypeScript compilation errors. The safe architecture is to alias `glass` to clean minimal tokens.

---

## 4. Conclusion & Milestone 1 Implementation Blueprint

To achieve full compliance with the CredSmart Minimal Design System standard, Milestone 1 must execute the following concrete code changes:

### Blueprint Item 1: `tailwind.config.ts`
1. **Extend `spacing`**:
   Add to `theme.extend.spacing`:
   ```ts
   spacing: {
     "7.5": "1.875rem",  // 30px (Micro icon button standard)
     "8.5": "2.125rem",  // 34px (Standard action button standard)
     "11.5": "2.875rem", // 46px (Mobile center CTA standard)
     "13": "3.25rem",    // 52px (Unified command header standard)
   },
   ```
2. **Update `fontFamily`**:
   Change `sans` and `display` to:
   ```ts
   fontFamily: {
     sans: ["'Inter'", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
     display: ["'Inter'", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
     mono: ["'IBM Plex Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
   },
   ```
3. **Refine `boxShadow`**:
   Replace heavy lift/glow definitions with minimal micro-shadow tokens:
   ```ts
   boxShadow: {
     "2xs": "0 1px 2px 0 rgba(0, 0, 0, 0.02)",
     xs: "0 1px 2px 0 rgba(15, 23, 42, 0.04)",
     sm: "0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px -1px rgba(15, 23, 42, 0.08)",
     md: "0 4px 6px -1px rgba(15, 23, 42, 0.08)",
     soft: "0 1px 3px 0 rgba(15, 23, 42, 0.06)", // Deprecate 32px blur
     lift: "0 2px 6px 0 rgba(15, 23, 42, 0.08)",  // Deprecate 60px blur
     glow: "none",                                 // Deprecate neon halos
     "glow-gold": "none",                          // Deprecate gold halos
   },
   ```
4. **Enforce `borderRadius` scale**:
   Ensure `3xl` is clamped to prevent oversized bubbles:
   ```ts
   borderRadius: {
     "3xl": "1.25rem", // 20px max container radius
     "2xl": "1rem",    // 16px
     xl: "0.75rem",    // 12px
     lg: "0.5rem",     // 8px (standard button/input radius)
     md: "0.375rem",   // 6px (table button radius)
     sm: "0.25rem",    // 4px
   },
   ```

### Blueprint Item 2: `src/index.css`
1. **Light Mode Token Overhaul (`:root`)**:
   ```css
   --background: 210 20% 98%;          /* #F8FAFC - Soft crisp neutral */
   --foreground: 222 47% 11%;          /* #0F172A - Deep slate for ultra-readable text */

   --card: 0 0% 100%;                  /* #FFFFFF - Pure white card surfaces */
   --card-foreground: 222 47% 11%;

   --popover: 0 0% 100%;
   --popover-foreground: 222 47% 11%;

   --primary: 221 83% 53%;             /* #2563EB - Royal/electric blue */
   --primary-foreground: 0 0% 100%;
   --primary-soft: 214 100% 97%;       /* #EFF6FF - Soft tint */

   --secondary: 210 40% 96%;           /* #F1F5F9 - Slate 100 */
   --secondary-foreground: 222 47% 11%;

   --muted: 210 40% 96%;               /* #F1F5F9 */
   --muted-foreground: 215 16% 47%;    /* #64748B - Slate 500 */

   --accent: 221 83% 53%;              /* #2563EB */
   --accent-foreground: 0 0% 100%;
   --accent-soft: 214 100% 97%;

   --destructive: 346 87% 45%;         /* #E11D48 - Rose */
   --destructive-foreground: 0 0% 100%;

   --success: 158 64% 42%;             /* #10B981 - Emerald */
   --success-foreground: 0 0% 100%;

   --warning: 38 92% 50%;              /* #F59E0B - Amber */
   --warning-foreground: 222 47% 11%;

   --info: 221 83% 53%;
   --info-foreground: 0 0% 100%;

   --border: 214 32% 91%;              /* #E2E8F0 - Crisp hairline border */
   --input: 214 32% 91%;
   --ring: 221 83% 53%;

   --radius: 0.5rem;                   /* 8px */

   --shadow-xs: 0 1px 2px 0 rgba(15, 23, 42, 0.04);
   --shadow-soft: 0 1px 3px 0 rgba(15, 23, 42, 0.06);
   --shadow-lift: 0 2px 6px 0 rgba(15, 23, 42, 0.08);
   --shadow-glow: none;
   ```

2. **Dark Mode Token Overhaul (`.dark`)**:
   ```css
   --background: 224 45% 6%;           /* #090D16 - Deep midnight canvas */
   --foreground: 210 40% 98%;          /* #F8FAFC - Clear off-white */

   --card: 224 35% 10%;                /* #111726 - Elevated charcoal surface */
   --card-foreground: 210 40% 98%;

   --popover: 224 35% 10%;
   --popover-foreground: 210 40% 98%;

   --primary: 217 91% 60%;             /* #3B82F6 - Bright accessible blue */
   --primary-foreground: 0 0% 100%;
   --primary-soft: 224 45% 15%;

   --secondary: 217 33% 15%;
   --secondary-foreground: 210 40% 98%;

   --muted: 217 33% 15%;
   --muted-foreground: 215 20% 65%;

   --accent: 217 91% 60%;
   --accent-foreground: 0 0% 100%;
   --accent-soft: 224 45% 15%;

   --destructive: 346 87% 60%;
   --destructive-foreground: 210 40% 98%;

   --success: 158 64% 42%;
   --success-foreground: 0 0% 100%;

   --warning: 38 92% 50%;
   --warning-foreground: 210 40% 98%;

   --border: 217 33% 18%;              /* #1E293B - Hairline dark divider */
   --input: 217 33% 18%;
   --ring: 217 91% 60%;
   ```

3. **Body & Typography Rules**:
   - Strip multi-stop radial gradients from `body`. Set background cleanly to `hsl(var(--background))`:
     ```css
     body {
       background-color: hsl(var(--background));
       color: hsl(var(--foreground));
       font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
       font-feature-settings: 'cv02', 'cv03', 'cv04';
       letter-spacing: -0.011em;
       overflow-x: hidden;
     }

     h1, h2, h3, h4, h5, h6 {
       font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
       letter-spacing: -0.02em;
     }

     code, kbd, pre, .font-mono, .tabular-nums {
       font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace;
       font-feature-settings: "tnum" on, "cv02", "cv03", "cv04";
       font-variant-numeric: tabular-nums;
     }
     ```

4. **Skeuomorphic & Glass Utility Sanitization**:
   Deprecate heavy 3D glass reflections, neon glows, and liquid cards by replacing them with crisp hairline borders:
   - `.hover-3d-glow`: Replace transform/glow with simple `active:scale-[0.98] transition-colors duration-150`.
   - `.liquid-glass`, `.liquid-card-3d`, `.glass-card-3d`: Map to `bg-card border border-border/80 shadow-xs rounded-xl`.
   - `.glowing-btn-amber`, `.glowing-btn-blue`, `.glowing-btn-orange`: Map to clean solid buttons (`bg-primary text-white hover:bg-primary/90 shadow-2xs rounded-lg`).

### Blueprint Item 3: `src/components/ui/button.tsx`
Refactor `buttonVariants` to strictly implement the Master Minimal Standard:
```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-xs font-semibold ring-offset-background transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-2xs hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-2xs hover:bg-destructive/90",
        outline:
          "border border-border/80 bg-background text-foreground hover:bg-muted/60 hover:text-foreground shadow-2xs",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/60 shadow-2xs",
        ghost:
          "hover:bg-muted/60 hover:text-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",
        // Backward-compatibility aliases for legacy calls
        ruby:
          "bg-rose-600 text-white shadow-2xs hover:bg-rose-700",
        gold:
          "bg-amber-500 text-slate-950 font-bold shadow-2xs hover:bg-amber-600",
        glass:
          "border border-border/80 bg-background/80 text-foreground hover:bg-muted/60 shadow-2xs",
      },
      size: {
        // 34px Standard Action Button
        default: "h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs",
        // 28px Small / Table Action Button
        sm: "h-7 px-2.5 rounded-md text-[11px] font-medium",
        table: "h-7 px-2.5 rounded-md text-[11px] font-medium",
        // 30px Micro / Inline Icon Button
        icon: "w-7.5 h-7.5 rounded-md p-0 flex items-center justify-center",
        "icon-sm": "w-7 h-7 rounded-md p-0 flex items-center justify-center",
        // 46px Mobile Center Elevated CTA
        cta: "w-[46px] h-[46px] rounded-xl font-bold shadow-sm p-0 flex items-center justify-center",
        // Proportional standard overrides (replaces bloated 44px bubbles)
        lg: "h-9.5 px-4 rounded-lg text-sm font-semibold shadow-2xs",
        pill: "h-8.5 px-3.5 rounded-full text-xs font-semibold shadow-2xs",
        "pill-lg": "h-9.5 px-4 rounded-full text-sm font-semibold shadow-2xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
```

### Blueprint Item 4: `src/components/ui/card.tsx`
- Replace `variant="glass"` implementation:
  ```tsx
  const base = "rounded-xl shadow-xs transition-colors duration-150";
  const defaultClasses = "border border-border/80 bg-card text-card-foreground";
  const glassClasses = "border border-border/80 bg-card text-card-foreground"; // Deprecate liquid-glass
  ```
- Reduce default `CardHeader` and `CardContent` padding:
  - `CardHeader`: `p-3.5 pb-2` with `space-y-1`
  - `CardContent`: `p-3.5 pt-0`
  - `CardFooter`: `p-3.5 pt-0`

### Blueprint Item 5: `src/components/ui/badge.tsx`
Enhance `badgeVariants` to support full semantic indicator set and enforce `text-[11px]`:
```tsx
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold font-mono tracking-tight transition-colors select-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-border/80 bg-secondary text-secondary-foreground",
        destructive: "border-rose-200/80 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-400",
        outline: "border-border/80 text-foreground",
        success: "border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-400",
        warning: "border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-400",
        info: "border-blue-200/80 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);
```

### Blueprint Item 6: `src/components/ui/table.tsx`
Achieve the standard 38px–42px row height and compact header:
- `TableHead`: Update from `h-12 px-4` to `h-8.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-background/95 backdrop-blur-xs z-10`.
- `TableCell`: Update from `p-4` to `py-2 px-3 text-xs text-foreground align-middle`.

---

## 5. Verification Method

To independently verify the discoveries and the Milestone 1 blueprint:

1. **Verify TypeScript compilation**:
   ```bash
   cmd /c npx tsc --noEmit
   ```
   *Expected result*: Exits with code 0.
2. **Verify unit test integrity**:
   ```bash
   cmd /c npx vitest run src/test/crmComponents.test.tsx
   ```
   *Expected result*: All 55 tests pass cleanly.
3. **Verify Tailwind spacing scale resolution**:
   ```bash
   node -e "const resolveConfig = require('tailwindcss/resolveConfig'); const config = require('./tailwind.config.ts'); const full = resolveConfig(config.default || config); console.log(full.theme.spacing['8.5'], full.theme.spacing['7.5'], full.theme.spacing['13']);"
   ```
   *Current result*: `undefined undefined undefined`.  
   *Post-Milestone 1 result*: `2.125rem 1.875rem 3.25rem`.
4. **Inspect CSS tokens & fonts**:
   - Confirm `index.html:18` loads `Inter` and `IBM Plex Mono`.
   - Confirm `tailwind.config.ts:17` maps `sans` to `Inter`.
   - Confirm `src/index.css` sets `--background: 210 20% 98%` (light) and `--background: 224 45% 6%` (dark).
