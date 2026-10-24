# CredSmart Minimal & Fast-Access Design System (Master Standard)
(Local copy for worker_m4_a_gen2)

Refer to root .agents/skills/credsmart-minimal-design-system/SKILL.md and .agents/rules/minimal-design-system.md.
Rules:
1. Proportions & Button Sizing: Standard action 34px (h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs), table action 28px (h-7 px-2.5 rounded-md text-[11px] font-medium), micro icon 30px (w-7.5 h-7.5 rounded-md), mobile center CTA 46x46px rounded-xl.
2. Viewport Containment: Desktop tables sticky header + flex-1 min-h-0 overflow-y-auto + pinned pagination footer. Mobile 4-5 items per viewport.
3. Breathing Room: Strip redundant micro-prose. 1px borders, subtle micro-shadows. No heavy 3D glass, gradients, or glowing neon halos.
4. Typography: Inter for UI, IBM Plex Mono with tabular-nums for numbers/currency/dates/barcodes. No sub-11px micro-fonts.
5. Colors: #F8FAFC light / #090D16 dark canvas. Royal Blue #2563EB accent.
6. Desktop vs Mobile: Desktop >= 768px, Mobile < 768px.
7. Zero regression on business logic, real-time subscriptions, invoice files.
