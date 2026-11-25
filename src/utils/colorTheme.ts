import type { ResolvedWhiteLabelBrand } from "@/services/whiteLabelApi";

/**
 * Converts a 6-character hex color (#RRGGBB) into space-separated HSL components
 * compatible with Tailwind's `hsl(var(--primary))` syntax (`H S% L%`).
 */
export function hexToHslComponents(hex: string): string {
  const clean = String(hex || "").trim().replace(/^#/, "");
  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) {
    return "221 83% 53%";
  }

  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Computes high-contrast foreground HSL triplet (white vs slate-900) against a hex background.
 */
export function getContrastForegroundHsl(hex: string): string {
  const clean = String(hex || "").trim().replace(/^#/, "");
  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) {
    return "0 0% 100%";
  }
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);

  // Perceived brightness (YIQ)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 155 ? "222 47% 11%" : "0 0% 100%";
}

const WL_OVERRIDE_VARS = [
  "--primary",
  "--primary-foreground",
  "--accent",
  "--accent-foreground",
  "--ring",
  "--sidebar-primary",
  "--sidebar-ring",
  "--info",
  "--wl-primary",
  "--wl-secondary",
];

function updateLinkHref(relSelector: string, href: string): void {
  if (typeof document === "undefined" || !href) return;
  const elements = document.querySelectorAll(relSelector);
  elements.forEach((el) => {
    (el as HTMLLinkElement).href = href;
  });
}

function updateMetaContent(attr: "name" | "property", key: string, content: string): void {
  if (typeof document === "undefined" || !content) return;
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * Dynamically applies (or resets) CSS variables, favicon, theme-color, and metadata
 * across the entire document without requiring page reloads.
 */
export function applyWhiteLabelThemeToDocument(brand: ResolvedWhiteLabelBrand, isWhiteLabeled: boolean): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (!isWhiteLabeled) {
    WL_OVERRIDE_VARS.forEach((cssVar) => root.style.removeProperty(cssVar));
    root.removeAttribute("data-whitelabel");
    updateLinkHref('link[rel="icon"]', "/favicon.png");
    updateLinkHref('link[rel="apple-touch-icon"]', "/apple-touch-icon.png");
    updateMetaContent("name", "theme-color", "#1D4ED8");
    updateMetaContent("name", "apple-mobile-web-app-title", "CredSmart");
    return;
  }

  const primaryHex = /^#[0-9A-Fa-f]{6}$/.test(brand.primary_color || "") ? brand.primary_color : "#2563EB";
  const secondaryHex = /^#[0-9A-Fa-f]{6}$/.test(brand.secondary_color || "") ? brand.secondary_color : "#F97316";

  const primaryHsl = hexToHslComponents(primaryHex);
  const foregroundHsl = getContrastForegroundHsl(primaryHex);

  root.style.setProperty("--primary", primaryHsl);
  root.style.setProperty("--primary-foreground", foregroundHsl);
  root.style.setProperty("--accent", primaryHsl);
  root.style.setProperty("--accent-foreground", foregroundHsl);
  root.style.setProperty("--ring", primaryHsl);
  root.style.setProperty("--sidebar-primary", primaryHsl);
  root.style.setProperty("--sidebar-ring", primaryHsl);
  root.style.setProperty("--info", primaryHsl);
  root.style.setProperty("--wl-primary", primaryHex);
  root.style.setProperty("--wl-secondary", secondaryHex);
  root.setAttribute("data-whitelabel", "active");

  const iconUrl = brand.favicon_url || brand.logo_light_url;
  if (iconUrl) {
    updateLinkHref('link[rel="icon"]', iconUrl);
    updateLinkHref('link[rel="apple-touch-icon"]', iconUrl);
  }

  updateMetaContent("name", "theme-color", primaryHex);
  updateMetaContent("name", "apple-mobile-web-app-title", brand.brand_name || "Portal");
  updateMetaContent("property", "og:site_name", brand.brand_name || "Portal");

  if (brand.meta_title) {
    document.title = brand.meta_title;
  } else if (brand.brand_name) {
    document.title = brand.brand_tagline ? `${brand.brand_name} — ${brand.brand_tagline}` : brand.brand_name;
  }

  if (brand.meta_description) {
    updateMetaContent("name", "description", brand.meta_description);
  }
}
