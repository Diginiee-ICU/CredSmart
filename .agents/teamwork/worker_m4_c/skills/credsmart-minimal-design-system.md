# CredSmart Minimal & Fast-Access Design System (Master Standard)

Source: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\credsmart-minimal-design-system\SKILL.md`

## Key Directives:
1. Buttons:
   - Standard action button: `h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs` (34px height)
   - Table action button: `h-7 px-2.5 rounded-md text-[11px] font-medium` (28px height)
   - Micro icon button: `w-7.5 h-7.5 rounded-md` (30px)
   - Mobile elevated CTA: `46x46px rounded-xl` (ergonomic thumb target)
   - Prohibit oversized `h-11`, `h-12`, `rounded-3xl` bubble buttons.
2. Viewports:
   - Desktop: Screen-fitted viewports, sticky headers, bounded scrolling bodies (`flex-1 min-h-0 overflow-y-auto`).
   - Mobile: 4-5 items per viewport, high-density cards, thumb-friendly.
3. Clean hairline surfaces:
   - 1px borders (`border-slate-200/80` light, `border-slate-800` dark) and subtle micro-shadows (`shadow-xs`).
   - Deprecate heavy 3D glass reflections, skeuomorphic bevels, liquid glass, and glowing neon halos.
4. Typography:
   - Inter sans for UI text.
   - IBM Plex Mono with `font-mono tabular-nums` for currency, quantities, invoice numbers, dates.
   - Strict size hierarchy, NO sub-11px fonts.
5. Palette:
   - Light: `#F8FAFC` bg, `#FFFFFF` cards, `#E2E8F0` borders.
   - Dark: `#090D16` bg, `#111726` cards, `#1E293B` borders.
   - Accent: Royal/Electric Blue `#2563EB`. Semantic: Emerald `#10B981`, Rose `#E11D48`, Amber `#F59E0B`.
