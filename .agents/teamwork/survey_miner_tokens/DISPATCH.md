# Survey Task Assignment: Design Tokens & Base Primitives Spec Miner

## Mission
Investigate and document all design token specifications, Tailwind configurations, typography declarations, button primitives, hairline borders, and color palettes across CredSmart. Identify all bloated buttons (h-11, h-12, rounded-3xl), skeuomorphic/liquid glass styles, and heavy shadows in existing code.

## References
- User Request: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-24T18:51:21Z`)
- Design System Rules: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\rules\minimal-design-system.md`
- Master Skill: `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\credsmart-minimal-design-system\SKILL.md`

## Working Directory
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\survey_miner_tokens`

## Expected Output
Write `handoff.md` in your working directory with detailed findings, existing file locations, and token specifications for Milestone 1.

## 2026-10-24T18:55:30Z
You are the Design Tokens & Base Primitives Specification Miner for the CredSmart Minimal & Fast-Access Redesign project.

Your dedicated working directory is:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\survey_miner_tokens`

Read your dispatch directive:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\survey_miner_tokens\DISPATCH.md`

Read the authoritative user request:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md` (section `## 2026-10-24T18:51:21Z`)

Read the design rules and master skill:
- `.agents/rules/minimal-design-system.md`
- `.agents/skills/credsmart-minimal-design-system/SKILL.md`

Investigate the existing codebase (read-only):
- `src/index.css`
- `tailwind.config.ts`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/badge.tsx`
- Key pages and components using buttons, badges, and card containers.

Your objective:
1. Document current font family declarations, font sizes, line heights, and verify support for `'Inter'` and `'IBM Plex Mono'` tabular numerals (`font-mono tabular-nums`).
2. Document button variants and sizes in `src/components/ui/button.tsx` and across the app. Identify all bloated buttons (`h-11`, `h-12`, `rounded-3xl` bubbles) that violate the 34px / 28px / 30px / 46px standard.
3. Document border styles and shadows. Identify skeuomorphic bevels, liquid glass, heavy 3D glass reflections, and glowing neon halos.
4. Document the color token mapping for Light mode (`#F8FAFC` bg, `#FFFFFF` cards) and Dark mode (`#090D16` bg, `#111726` cards), and the `#2563EB` royal blue accent.
5. Provide a precise, line-by-line implementation blueprint for Milestone 1.

Write your complete findings and recommendations to:
`c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\survey_miner_tokens\handoff.md`

You are read-only: do NOT edit source files. When done, send a message to the orchestrator with your summary and handoff path.
