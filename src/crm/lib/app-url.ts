/**
 * Where staff should be sent to sign in.
 *
 * The app is reachable from several addresses (the Lovable preview host, the
 * published *.lovable.app host and the company's own domain). A link copied
 * from the preview host would expire, so every staff-facing link is written
 * against the company's permanent address instead.
 */

/** Permanent company address — the custom domain this CRM is served from. */
export const CANONICAL_APP_URL = "https://crm.credalert.business";

const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|\d{1,3}(\.\d{1,3}){3})$/;
const LOVABLE_HOST = /(^|\.)lovable\.app$/i;

/**
 * Which address a link should use, given the address the admin is on.
 * Development stays on the dev server; preview/published Lovable hosts are
 * rewritten to the company domain; any other host (a custom domain) is kept.
 */
export function resolveAppBaseUrl(hostname: string, origin = ""): string {
  const host = (hostname || "").toLowerCase();
  if (!host) return CANONICAL_APP_URL;
  if (LOCAL.test(host)) return origin || CANONICAL_APP_URL;
  const canonicalHost = CANONICAL_APP_URL.replace(/^https?:\/\//, "");
  if (host === canonicalHost) return CANONICAL_APP_URL;
  if (LOVABLE_HOST.test(host)) return CANONICAL_APP_URL;
  return origin || `https://${host}`;
}

/** Address the app is currently being served from, safe for sharing. */
export function appBaseUrl(): string {
  if (typeof window === "undefined") return CANONICAL_APP_URL;
  return resolveAppBaseUrl(window.location.hostname, window.location.origin);
}

/** The exact page a staff member opens: sign-in with their company pre-filled. */
export function staffSignInUrl(companyId: string, base = appBaseUrl()): string {
  return `${base.replace(/\/+$/, "")}/?join=${companyId}`;
}

/** WhatsApp / SMS copy that accompanies the sign-in link. */
export function staffSignInMessage(companyId: string, base = appBaseUrl()): string {
  return `Sign in to our team app:\n${staffSignInUrl(companyId, base)}\nUse your mobile number and the 4-digit passcode your admin shared.`;
}
