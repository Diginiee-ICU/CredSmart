import { describe, expect, it } from "vitest";
import { CANONICAL_APP_URL, resolveAppBaseUrl, staffSignInMessage, staffSignInUrl } from "@/crm/lib/app-url";

const COMPANY = "11111111-1111-1111-1111-111111111111";

describe("staff sign-in link", () => {
  it("points at the company domain when the admin is on a Lovable preview or published host", () => {
    expect(resolveAppBaseUrl("id-preview--abc.lovable.app", "https://id-preview--abc.lovable.app")).toBe(CANONICAL_APP_URL);
    expect(resolveAppBaseUrl("pixel-perfect-replay-2772.lovable.app", "https://pixel-perfect-replay-2772.lovable.app")).toBe(CANONICAL_APP_URL);
  });

  it("keeps the company's own domain and the local dev server", () => {
    expect(resolveAppBaseUrl("crm.credalert.business", "https://crm.credalert.business")).toBe("https://crm.credalert.business");
    expect(resolveAppBaseUrl("crm.credalert.business", "http://crm.credalert.business")).toBe("https://crm.credalert.business");
    expect(resolveAppBaseUrl("localhost", "http://localhost:8080")).toBe("http://localhost:8080");
  });

  it("opens the sign-in page with the company already filled in", () => {
    expect(staffSignInUrl(COMPANY, "https://crm.credalert.business/")).toBe(
      `https://crm.credalert.business/?join=${COMPANY}`,
    );
  });

  it("tells staff the mobile number and passcode they need", () => {
    const msg = staffSignInMessage(COMPANY, "https://crm.credalert.business");
    expect(msg).toContain(`https://crm.credalert.business/?join=${COMPANY}`);
    expect(msg).toContain("4-digit passcode");
  });
});
