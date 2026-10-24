# Dispatch Directive: Worker Milestone 1 — Minimal Design Tokens & Base Primitives

## Mission
Implement Milestone 1 of the CredSmart Minimal & Fast-Access Redesign:
1. `tailwind.config.ts`: Extend spacing scale with `'7.5'` (30px), `'8.5'` (34px), `'11.5'` (46px), `'13'` (52px). Set `'Inter'` as primary `sans` and `display`. Update `boxShadow` to crisp micro-shadows (`2xs`, `xs`, `sm`, `soft`, `lift`, `glow: "none"`). Clamp `borderRadius['3xl']` to `1.25rem`.
2. `src/index.css`: Overhaul `:root` (light) and `.dark` tokens to `#F8FAFC` light canvas, `#090D16` dark canvas, `#2563EB` royal blue accent, `#10B981` emerald, `#E11D48` rose, hairline borders (`#E2E8F0` / `#1E293B`). Set `body` and `h1-h6` font to `'Inter'`. Add `font-feature-settings: "tnum" on` to `.font-mono` and `.tabular-nums`. Sanitize `.liquid-glass`, `.liquid-card-3d`, `.hover-3d-glow`, and `.glowing-btn-*` into clean hairline bordered surfaces. Strip heavy multi-stop radial body gradients.
3. `src/components/ui/button.tsx`: Standardize button sizes (`default` 34px `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs`, `sm` 28px `h-7 px-2.5 rounded-md text-[11px] font-medium`, `icon` 30px `w-7.5 h-7.5 rounded-md`, `cta` 46px `w-[46px] h-[46px] rounded-xl font-bold`). Re-alias legacy variants (`ruby`, `gold`, `glass`, `pill`, `lg`) to clean minimal tokens to guarantee backward compatibility with existing test suites. Remove `ripple-surface` and lift animations.
4. `src/components/ui/card.tsx`: Tighten padding (`p-3.5`), hairline border (`border-border/80`), re-alias `variant="glass"` to clean card.
5. `src/components/ui/badge.tsx`: Enforce `text-[11px]` font-semibold, add semantic status variants (`emerald`, `amber`, `rose`, `blue`).
6. `src/components/ui/table.tsx`: Update `TableHead` to `h-8.5 px-3` and `TableCell` to `py-2 px-3` achieving 38px–42px row height.
7. `src/components/ui/dialog.tsx`: Replace `sm:rounded-3xl` with `sm:rounded-2xl` and clean backdrop.

## Mandatory Inputs to Read First
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (Section `## 2026-10-24T18:51:21Z`)
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\survey_miner_tokens\handoff.md` (Full Blueprint)
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md`
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\credsmart-minimal-design-system\SKILL.md`
- `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\PROJECT.md`

## File Ownership (Exclusively Owns These Files)
- `tailwind.config.ts`
- `src/index.css`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/table.tsx`
- `src/components/ui/dialog.tsx`

## Strict Protected File Inventory (DO NOT TOUCH)
Do NOT edit any of the 19 invoice files:
`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, `SelectPartyModal.tsx`, `EditItemModal.tsx`, `MobileInvoiceSuccessView.tsx`, etc.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Verification Requirements
Run and document results in `handoff.md`:
1. `cmd /c npx tsc --noEmit`
2. `cmd /c npx vitest run src/test/crmComponents.test.tsx`
3. Spacing verification: `node -e "const resolveConfig = require('tailwindcss/resolveConfig'); const config = require('./tailwind.config.ts'); const full = resolveConfig(config.default || config); console.log(full.theme.spacing['8.5'], full.theme.spacing['7.5'], full.theme.spacing['13']);"`


## 2026-10-24T19:07:37Z
You are the Design System Primitives Worker for Milestone 1 of the CredSmart Minimal & Fast-Access Redesign project.

Your dedicated working directory is:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1`

Read your dispatch directive:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1\DISPATCH.md`

Read the authoritative user request:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-24T18:51:21Z`)

Read the detailed implementation blueprint from the survey miner:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\survey_miner_tokens\handoff.md`

Read the design rules and master skill:
- `.agents/rules/minimal-design-system.md`
- `.agents/skills/credsmart-minimal-design-system/SKILL.md`
- `PROJECT.md`

You exclusively own and may edit ONLY the following files:
1. `tailwind.config.ts`
2. `src/index.css`
3. `src/components/ui/button.tsx`
4. `src/components/ui/card.tsx`
5. `src/components/ui/badge.tsx`
6. `src/components/ui/table.tsx`
7. `src/components/ui/dialog.tsx`

STRICT EXCLUSION: DO NOT modify any of the 19 invoice files (`MobileCreateInvoice.tsx`, `SalesInvoiceModal.tsx`, `AddItemModal.tsx`, etc.).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task:
1. `tailwind.config.ts`:
   - Extend `theme.extend.spacing` with `'7.5': '1.875rem'`, `'8.5': '2.125rem'`, `'11.5': '2.875rem'`, `'13': '3.25rem'`.
   - Update `theme.extend.fontFamily`: set `sans` and `display` to `["'Inter'", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"]`.
   - Refine `boxShadow`: replace heavy lift/glow with crisp micro-shadows (`2xs`, `xs`, `sm`, `md`, `soft: "0 1px 3px 0 rgba(15, 23, 42, 0.06)"`, `lift: "0 2px 6px 0 rgba(15, 23, 42, 0.08)"`, `glow: "none"`, `"glow-gold": "none"`).
   - Clamp `borderRadius['3xl']` to `'1.25rem'`.
2. `src/index.css`:
   - Overhaul `:root` with light canvas tokens (`--background: 210 20% 98%` #F8FAFC, `--card: 0 0% 100%`, `--foreground: 222 47% 11%` #0F172A, `--border: 214 32% 91%` #E2E8F0, `--primary: 221 83% 53%` #2563EB royal blue, `--destructive: 346 87% 45%` #E11D48, `--success: 158 64% 42%` #10B981, `--warning: 38 92% 50%` #F59E0B).
   - Overhaul `.dark` with dark canvas tokens (`--background: 224 45% 6%` #090D16, `--card: 224 35% 10%` #111726, `--foreground: 210 40% 98%` #F8FAFC, `--border: 217 33% 18%` #1E293B, `--primary: 217 91% 60%` #3B82F6, etc.).
   - Strip multi-stop radial wallpaper gradients on `body`. Set background cleanly to `hsl(var(--background))` with `'Inter'` font.
   - Set `h1-h6` to `'Inter'`.
   - Configure `code, kbd, pre, .font-mono, .tabular-nums` with `'IBM Plex Mono'` and `font-feature-settings: "tnum" on, "cv02", "cv03", "cv04"`, `font-variant-numeric: tabular-nums`.
   - Deprecate skeuomorphic utilities: sanitize `.hover-3d-glow`, `.liquid-glass`, `.liquid-card-3d`, `.glowing-btn-amber`, `.glowing-btn-blue`, `.glowing-btn-orange` into crisp hairline bordered surfaces with shadow-2xs or shadow-xs.
3. `src/components/ui/button.tsx`:
   - Implement button sizing: `default` (34px `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs`), `sm` (28px `h-7 px-2.5 rounded-md text-[11px] font-medium`), `table` (28px `h-7 px-2.5 rounded-md text-[11px] font-medium`), `icon` (30px `w-7.5 h-7.5 rounded-md p-0`), `icon-sm` (28px `w-7 h-7 rounded-md p-0`), `cta` (46px `w-[46px] h-[46px] rounded-xl font-bold shadow-sm p-0`).
   - Clean variants: `default` (`bg-primary text-primary-foreground shadow-2xs hover:bg-primary/90`), `outline`, `secondary`, `destructive`, `ghost`, `link`.
   - Re-alias legacy variants (`ruby`, `gold`, `glass`, `pill`, `pill-lg`, `lg`) to clean minimal tokens so existing tests and code do not break.
   - Remove `ripple-surface`, lift animations, and sluggish 300ms transitions. Use `active:scale-[0.98] transition-colors duration-150`.
4. `src/components/ui/card.tsx`:
   - Set padding to `p-3.5` (compact 14px padding). Hairline border `border-border/80`. Re-alias `variant="glass"` to clean card.
5. `src/components/ui/badge.tsx`:
   - Set font to `text-[11px] font-semibold font-mono`. Add `success` (emerald), `warning` (amber), `destructive` (rose), `info` (blue) variants.
6. `src/components/ui/table.tsx`:
   - `TableHead`: `h-8.5 px-3 text-xs font-semibold uppercase tracking-wider sticky top-0 bg-background/95 backdrop-blur-xs z-10`.
   - `TableCell`: `py-2 px-3 text-xs text-foreground align-middle` (ensuring 38px–42px row height).
7. `src/components/ui/dialog.tsx`:
   - Replace `sm:rounded-3xl` with `sm:rounded-2xl` and remove oversized blur.

Run build & tests to verify:
1. `cmd /c npx tsc --noEmit`
2. `cmd /c npx vitest run src/test/crmComponents.test.tsx`
3. Node spacing check: `node -e "const resolveConfig = require('tailwindcss/resolveConfig'); const config = require('./tailwind.config.ts'); const full = resolveConfig(config.default || config); console.log(full.theme.spacing['8.5'], full.theme.spacing['7.5'], full.theme.spacing['13']);"`

Write your handoff report to:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\worker_m1\handoff.md`
Report verification outputs and file diff summaries. When complete, send a message to the orchestrator.
