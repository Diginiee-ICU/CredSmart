/**
 * Empirical Adversarial Challenge Test Suite — Milestone 1
 * CredSmart Minimal & Fast-Access Redesign
 *
 * Verifies:
 * 1. Tailwind spacing scale resolution ('7.5', '8.5', '11.5', '13')
 * 2. Tailwind font families ('sans', 'display', 'mono')
 * 3. Tailwind boxShadows and borderRadius tokens
 * 4. CSS token variables (:root and .dark)
 * 5. WCAG 2.1 Contrast Ratios (AA & AAA thresholds)
 * 6. OpenType tabular numerals configuration ("tnum" on)
 * 7. Component primitives classes & backward-compatibility aliases
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import resolveConfig from "tailwindcss/resolveConfig";
import tailwindConfig from "../../tailwind.config";
import { buttonVariants } from "@/components/ui/button";
import { badgeVariants } from "@/components/ui/badge";

// Helper functions for WCAG 2.1 luminance & contrast calculations
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("Milestone 1 Empirical Challenge: Tailwind Theme & Spacing Scale", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fullTheme = (resolveConfig(tailwindConfig as any) as any).theme;

  it("resolves the extended spacing scale with exact pixel equivalent rems", () => {
    expect(fullTheme.spacing["7.5"]).toBe("1.875rem"); // 30px
    expect(fullTheme.spacing["8.5"]).toBe("2.125rem"); // 34px
    expect(fullTheme.spacing["11.5"]).toBe("2.875rem"); // 46px
    expect(fullTheme.spacing["13"]).toBe("3.25rem"); // 52px
  });

  it("resolves typography families with Inter as primary sans and IBM Plex Mono as mono", () => {
    expect(fullTheme.fontFamily.sans[0]).toBe("'Inter'");
    expect(fullTheme.fontFamily.display[0]).toBe("'Inter'");
    expect(fullTheme.fontFamily.mono[0]).toBe("'IBM Plex Mono'");
  });

  it("resolves micro-shadows and eliminates skeuomorphic glowing halos", () => {
    expect(fullTheme.boxShadow["2xs"]).toBe("0 1px 2px 0 rgba(0, 0, 0, 0.02)");
    expect(fullTheme.boxShadow["xs"]).toBe("0 1px 2px 0 rgba(15, 23, 42, 0.04)");
    expect(fullTheme.boxShadow["soft"]).toBe("0 1px 3px 0 rgba(15, 23, 42, 0.06)");
    expect(fullTheme.boxShadow["lift"]).toBe("0 2px 6px 0 rgba(15, 23, 42, 0.08)");
    expect(fullTheme.boxShadow["glow"]).toBe("none");
    expect(fullTheme.boxShadow["glow-gold"]).toBe("none");
  });

  it("constrains border-radius to eliminate oversized 3xl bubble buttons", () => {
    expect(fullTheme.borderRadius["3xl"]).toBe("1.25rem"); // 20px constrained
    expect(fullTheme.borderRadius["2xl"]).toBe("calc(var(--radius) + 10px)");
    expect(fullTheme.borderRadius["xl"]).toBe("calc(var(--radius) + 4px)");
    expect(fullTheme.borderRadius["lg"]).toBe("var(--radius)");
    expect(fullTheme.borderRadius["md"]).toBe("calc(var(--radius) - 2px)");
    expect(fullTheme.borderRadius["sm"]).toBe("calc(var(--radius) - 4px)");
  });
});

describe("Milestone 1 Empirical Challenge: CSS Tokens in src/index.css", () => {
  const cssPath = path.resolve(__dirname, "../index.css");
  const cssContent = fs.readFileSync(cssPath, "utf-8");

  it("contains light mode neutral canvas tokens (:root)", () => {
    expect(cssContent).toContain("--background: 210 20% 98%;");
    expect(cssContent).toContain("--foreground: 222 47% 11%;");
    expect(cssContent).toContain("--card: 0 0% 100%;");
    expect(cssContent).toContain("--card-foreground: 222 47% 11%;");
    expect(cssContent).toContain("--border: 214 32% 91%;");
    expect(cssContent).toContain("--primary: 221 83% 53%;");
    expect(cssContent).toContain("--primary-soft: 214 100% 97%;");
    expect(cssContent).toContain("--destructive: 346 87% 45%;");
    expect(cssContent).toContain("--success: 158 64% 42%;");
    expect(cssContent).toContain("--warning: 38 92% 50%;");
    expect(cssContent).toContain("--warning-foreground: 222 47% 11%;");
    expect(cssContent).toContain("--radius: 0.5rem;");
  });

  it("contains dark mode neutral canvas tokens (.dark)", () => {
    expect(cssContent).toContain("--background: 224 45% 6%;");
    expect(cssContent).toContain("--foreground: 210 40% 98%;");
    expect(cssContent).toContain("--card: 224 35% 10%;");
    expect(cssContent).toContain("--card-foreground: 210 40% 98%;");
    expect(cssContent).toContain("--border: 217 33% 18%;");
    expect(cssContent).toContain("--primary: 217 91% 60%;");
  });

  it("enforces OpenType tabular numbers and IBM Plex Mono on .font-mono and .tabular-nums", () => {
    expect(cssContent).toMatch(/code,\s*kbd,\s*pre,\s*\.font-mono,\s*\.tabular-nums/);
    expect(cssContent).toContain('font-feature-settings: "tnum" on');
    expect(cssContent).toContain("font-variant-numeric: tabular-nums;");
  });

  it("enforces Inter sans on body and headings", () => {
    expect(cssContent).toMatch(/body\s*\{[^}]*font-family:\s*'Inter'/);
    expect(cssContent).toMatch(/h1,\s*h2,\s*h3,\s*h4,\s*h5,\s*h6\s*\{[^}]*font-family:\s*'Inter'/);
  });

  it("sanitizes legacy skeuomorphic and glowing utilities", () => {
    expect(cssContent).toContain(".hover-3d-glow");
    expect(cssContent).toContain("box-shadow: var(--shadow-xs) !important;");
    expect(cssContent).toContain(".liquid-glass");
    expect(cssContent).toContain("border: 1px solid hsl(var(--border) / 0.8);");
  });
});

describe("Milestone 1 Empirical Challenge: WCAG 2.1 Contrast Oracle", () => {
  const lightBg = hslToRgb(210, 20, 98); // #F8FAFC
  const lightFg = hslToRgb(222, 47, 11); // #0F172A
  const lightCard = hslToRgb(0, 0, 100); // #FFFFFF
  const lightCardFg = hslToRgb(222, 47, 11);
  const lightPrimary = hslToRgb(221, 83, 53); // #2563EB
  const lightPrimaryFg = hslToRgb(0, 0, 100);
  const lightMutedFg = hslToRgb(215, 16, 47); // #64748B
  const lightWarning = hslToRgb(38, 92, 50); // #F59E0B
  const lightWarningFg = hslToRgb(222, 47, 11); // Dark slate

  const darkBg = hslToRgb(224, 45, 6); // #090D16
  const darkFg = hslToRgb(210, 40, 98); // #F8FAFC
  const darkCard = hslToRgb(224, 35, 10); // #111726
  const darkCardFg = hslToRgb(210, 40, 98);
  const darkMutedFg = hslToRgb(215, 20, 65); // #94A3B8

  it("validates light mode foreground against background exceeds WCAG AAA (>= 7:1)", () => {
    const ratio = contrastRatio(lightFg, lightBg);
    expect(ratio).toBeGreaterThanOrEqual(7.0);
    expect(ratio).toBeCloseTo(17.1, 0);
  });

  it("validates light mode card foreground against card exceeds WCAG AAA (>= 7:1)", () => {
    const ratio = contrastRatio(lightCardFg, lightCard);
    expect(ratio).toBeGreaterThanOrEqual(7.0);
    expect(ratio).toBeCloseTo(17.87, 0);
  });

  it("validates light mode primary button foreground (white) against primary blue exceeds WCAG AA (>= 4.5:1)", () => {
    const ratio = contrastRatio(lightPrimaryFg, lightPrimary);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    expect(ratio).toBeCloseTo(5.17, 0);
  });

  it("validates light mode muted foreground on card exceeds WCAG AA (>= 4.5:1)", () => {
    const ratio = contrastRatio(lightMutedFg, lightCard);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    expect(ratio).toBeCloseTo(4.7, 0);
  });

  it("validates light mode warning uses high-contrast dark text exceeding WCAG AAA (>= 7:1)", () => {
    const ratio = contrastRatio(lightWarningFg, lightWarning);
    expect(ratio).toBeGreaterThanOrEqual(7.0);
    expect(ratio).toBeCloseTo(8.38, 0);
  });

  it("validates dark mode foreground against background exceeds WCAG AAA (>= 7:1)", () => {
    const ratio = contrastRatio(darkFg, darkBg);
    expect(ratio).toBeGreaterThanOrEqual(7.0);
    expect(ratio).toBeCloseTo(18.68, 0);
  });

  it("validates dark mode card foreground against card exceeds WCAG AAA (>= 7:1)", () => {
    const ratio = contrastRatio(darkCardFg, darkCard);
    expect(ratio).toBeGreaterThanOrEqual(7.0);
    expect(ratio).toBeCloseTo(17.39, 0);
  });

  it("validates dark mode muted foreground against background exceeds WCAG AAA (>= 7:1)", () => {
    const ratio = contrastRatio(darkMutedFg, darkBg);
    expect(ratio).toBeGreaterThanOrEqual(7.0);
    expect(ratio).toBeCloseTo(7.62, 0);
  });
});

describe("Milestone 1 Empirical Challenge: Component Primitives Classes", () => {
  it("verifies standard button sizing classes (34px default, 28px sm/table, 30px icon, 46px cta)", () => {
    const defaultBtn = buttonVariants({ size: "default" });
    expect(defaultBtn).toContain("h-8.5");
    expect(defaultBtn).toContain("text-xs");

    const smBtn = buttonVariants({ size: "sm" });
    expect(smBtn).toContain("h-7");
    expect(smBtn).toContain("text-[11px]");

    const tableBtn = buttonVariants({ size: "table" });
    expect(tableBtn).toContain("h-7");
    expect(tableBtn).toContain("text-[11px]");

    const iconBtn = buttonVariants({ size: "icon" });
    expect(iconBtn).toContain("w-7.5");
    expect(iconBtn).toContain("h-7.5");

    const ctaBtn = buttonVariants({ size: "cta" });
    expect(ctaBtn).toContain("w-[46px]");
    expect(ctaBtn).toContain("h-[46px]");

    const lgBtn = buttonVariants({ size: "lg" });
    expect(lgBtn).toContain("h-9.5");
  });

  it("verifies legacy button variants backward-compatibility aliases (ruby, gold, glass)", () => {
    const rubyBtn = buttonVariants({ variant: "ruby" });
    expect(rubyBtn).toContain("bg-rose-600");

    const goldBtn = buttonVariants({ variant: "gold" });
    expect(goldBtn).toContain("bg-amber-500");

    const glassBtn = buttonVariants({ variant: "glass" });
    expect(glassBtn).toContain("border");
    expect(glassBtn).toContain("bg-background/80");
  });

  it("verifies badge semantic variants and 11px monospace typography", () => {
    const defaultBadge = badgeVariants({ variant: "default" });
    expect(defaultBadge).toContain("text-[11px]");
    expect(defaultBadge).toContain("font-mono");

    const successBadge = badgeVariants({ variant: "success" });
    expect(successBadge).toContain("bg-emerald-50");
    expect(successBadge).toContain("text-emerald-700");

    const warningBadge = badgeVariants({ variant: "warning" });
    expect(warningBadge).toContain("bg-amber-50");
    expect(warningBadge).toContain("text-amber-700");

    const destructiveBadge = badgeVariants({ variant: "destructive" });
    expect(destructiveBadge).toContain("bg-rose-50");
    expect(destructiveBadge).toContain("text-rose-700");

    const infoBadge = badgeVariants({ variant: "info" });
    expect(infoBadge).toContain("bg-blue-50");
    expect(infoBadge).toContain("text-blue-700");
  });
});
