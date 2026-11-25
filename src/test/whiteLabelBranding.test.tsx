import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { hexToHslComponents, getContrastForegroundHsl, applyWhiteLabelThemeToDocument } from "@/utils/colorTheme";
import {
  DEFAULT_BRAND_CONFIG,
  whiteLabelApi,
  WL_ACTIVE_BRAND_CACHE_KEY,
} from "@/services/whiteLabelApi";
import { WhiteLabelProvider } from "@/context/WhiteLabelContext";
import WhiteLabelSettings from "@/pages/WhiteLabelSettings";
import AdminPortal from "@/pages/AdminPortal";
import { CredSmartLogo } from "@/components/public/CredSmartLogo";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "test-token" } },
      }),
    },
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ data: { publicUrl: "https://cdn.example.com/logo.png" }, error: null }),
      }),
    },
  },
}));

// Configurable mock user & role
let mockUser: any = { id: "user-tenant-1", email: "owner@apexstore.in" };
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    signOut: vi.fn(),
  }),
}));

let mockOrgRole = "store_owner";
vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => ({
    orgId: "org-wl-1",
    org: { id: "org-wl-1", name: "Apex Retail Store", phone: "9876543210" },
    userRole: mockOrgRole,
    userPermissions: null,
    loading: false,
    organizations: [{ id: "org-wl-1", name: "Apex Retail Store" }],
    switchOrganization: vi.fn(),
  }),
}));

describe("CredSmart White-Label Branding & Key Approval Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    mockUser = { id: "user-tenant-1", email: "owner@apexstore.in" };
    mockOrgRole = "store_owner";
    document.documentElement.removeAttribute("data-whitelabel");
    document.documentElement.style.removeProperty("--primary");
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("1. Color Theme & Document Head Engine", () => {
    it("converts hex colors to HSL triplets and computes high-contrast foreground", () => {
      expect(hexToHslComponents("#10B981")).toBe("160 84% 39%");
      expect(hexToHslComponents("#2563EB")).toBe("221 83% 53%");
      expect(getContrastForegroundHsl("#0F172A")).toBe("0 0% 100%"); // Dark bg -> white text
      expect(getContrastForegroundHsl("#FACC15")).toBe("222 47% 11%"); // Bright yellow -> dark text
    });

    it("applies custom CSS variables, document title, and reverts cleanly", () => {
      const customBrand = {
        ...DEFAULT_BRAND_CONFIG,
        brand_name: "Apex Retail POS",
        brand_tagline: "Smart Store ERP",
        primary_color: "#059669",
        secondary_color: "#0EA5E9",
        meta_title: "Apex Retail POS — Billing",
      };

      applyWhiteLabelThemeToDocument(customBrand, true);
      expect(document.documentElement.getAttribute("data-whitelabel")).toBe("active");
      expect(document.documentElement.style.getPropertyValue("--wl-primary")).toBe("#059669");
      expect(document.documentElement.style.getPropertyValue("--primary")).toBe("161 94% 30%");
      expect(document.title).toBe("Apex Retail POS — Billing");

      // Revert back to CredSmart default
      applyWhiteLabelThemeToDocument(DEFAULT_BRAND_CONFIG, false);
      expect(document.documentElement.getAttribute("data-whitelabel")).toBeNull();
      expect(document.documentElement.style.getPropertyValue("--wl-primary")).toBe("");
    });
  });

  describe("2. White-Label Request -> Admin Key Approval -> Activation -> Studio Flow", () => {
    it("allows a tenant owner to request white-labeling and enter key once approved", async () => {
      const statusResponses = [
        // 1st GET /white-label/status -> No request yet
        {
          is_platform_admin: false,
          request: null,
          is_activated: false,
          config: null,
        },
      ];

      vi.spyOn(global, "fetch").mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes("/white-label/status")) {
          const payload = statusResponses[0];
          return new Response(JSON.stringify(payload), { status: 200 });
        }
        if (url.includes("/white-label/request")) {
          return new Response(
            JSON.stringify({
              success: true,
              request: {
                id: "wl-req-1",
                organization_id: "org-wl-1",
                requested_by: "user-tenant-1",
                requester_email: "owner@apexstore.in",
                requester_name: "Owner",
                requested_brand_name: "Apex Billing",
                requested_domain: "pos.apex.in",
                notes: "Partner rebrand",
                status: "pending",
                created_at: new Date().toISOString(),
              },
            }),
            { status: 201 }
          );
        }
        return new Response(JSON.stringify({}), { status: 200 });
      });

      render(
        <MemoryRouter>
          <WhiteLabelProvider>
            <WhiteLabelSettings />
          </WhiteLabelProvider>
        </MemoryRouter>
      );

      // Step 1: Request Form appears WITHOUT any custom domain field
      await waitFor(() => {
        expect(screen.getByText(/Request Custom White-Label Access/i)).toBeDefined();
        expect(screen.queryByText(/Preferred Custom Domain/i)).toBeNull();
      });

      const submitBtn = screen.getByRole("button", { name: /Submit White-Label Request/i });
      fireEvent.click(submitBtn);

      // Transitions to Pending Approval UI
      await waitFor(() => {
        expect(screen.getByText(/Awaiting Admin Approval/i)).toBeDefined();
      });
    }, 15000);

    it("unlocks Branding Studio upon valid key entry and propagates custom branding to UI logo", async () => {
      vi.spyOn(global, "fetch").mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes("/white-label/status")) {
          return new Response(
            JSON.stringify({
              is_platform_admin: false,
              request: {
                id: "wl-req-1",
                organization_id: "org-wl-1",
                requested_by: "user-tenant-1",
                requester_email: "owner@apexstore.in",
                requester_name: "Owner",
                requested_brand_name: "Apex Billing",
                requested_domain: "pos.apex.in",
                notes: "Approved",
                status: "approved",
                created_at: new Date().toISOString(),
              },
              is_activated: false,
              config: null,
            }),
            { status: 200 }
          );
        }
        if (url.includes("/white-label/activate")) {
          return new Response(
            JSON.stringify({
              success: true,
              message: "White-Label Branding Studio unlocked successfully!",
              config: {
                organization_id: "org-wl-1",
                is_activated: true,
                is_enabled: true,
                brand_slug: "apex-billing",
                custom_domain: "pos.apex.in",
                brand_name: "Apex Billing",
                brand_tagline: "Enterprise Retail Suite",
                powered_by_text: "Apex Group",
                hide_platform_branding: true,
                logo_light_url: "",
                logo_dark_url: "",
                favicon_url: "",
                splash_logo_url: "",
                primary_color: "#059669",
                secondary_color: "#0EA5E9",
                sidebar_theme: "dark",
                support_email: "help@apex.in",
                support_phone: "",
                website_url: "",
                meta_title: "Apex Billing Portal",
                meta_description: "",
                custom_footer_text: "",
              },
            }),
            { status: 200 }
          );
        }
        return new Response(JSON.stringify({}), { status: 200 });
      });

      render(
        <MemoryRouter>
          <WhiteLabelProvider>
            <CredSmartLogo />
            <WhiteLabelSettings />
          </WhiteLabelProvider>
        </MemoryRouter>
      );

      // Should show Activation Key Gate
      await waitFor(() => {
        expect(screen.getByText(/Approved — Enter Your Activation Key/i)).toBeDefined();
      });

      const keyInput = screen.getByPlaceholderText("CSWL-XXXX-XXXX-XXXX");
      fireEvent.change(keyInput, { target: { value: "CSWL-ABCD-1234-XYZZ" } });

      const verifyBtn = screen.getByRole("button", { name: /Verify Key & Unlock Branding Studio/i });
      fireEvent.click(verifyBtn);

      // Branding Studio unlocked & Logo rebranded from CredSmart -> Apex Billing!
      await waitFor(() => {
        expect(screen.getByText(/Identity & Brand/i)).toBeDefined();
        expect(screen.getByText(/Portal Link & SEO/i)).toBeDefined();
        expect(screen.queryByText(/Domain & SEO/i)).toBeNull();
        expect(screen.getAllByText(/Apex Billing/i).length).toBeGreaterThan(0);
        expect(localStorage.getItem(WL_ACTIVE_BRAND_CACHE_KEY)).toBeTruthy();
      });

      // Switch to Portal Link & SEO tab and confirm no custom domain CNAME field exists
      fireEvent.click(screen.getByRole("button", { name: /Portal Link & SEO/i }));
      await waitFor(() => {
        expect(screen.getByText(/Branded Portal Slug/i)).toBeDefined();
        expect(screen.queryByText(/Custom Domain \(CNAME\)/i)).toBeNull();
      });
    }, 15000);
  });

  describe("3. Platform Admin Governance in AdminPortal", () => {
    it("hides White-Label tab from non-platform-admin store owners", async () => {
      mockUser = { id: "regular-owner", email: "regular@store.com" };
      vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

      render(
        <MemoryRouter>
          <WhiteLabelProvider>
            <AdminPortal />
          </WhiteLabelProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Admin & Feature Control Center/i)).toBeDefined();
      });
      expect(screen.queryByRole("button", { name: /White-Label/i })).toBeNull();
    });

    it("shows White-Label tab to Platform Admin and generates activation key on approval", async () => {
      mockUser = { id: "admin-1", email: "ashwinbishnoi05@gmail.com", is_platform_admin: true };

      vi.spyOn(global, "fetch").mockImplementation(async (input) => {
        const url = String(input);
        if (url.includes("/white-label/status")) {
          return new Response(
            JSON.stringify({ is_platform_admin: true, request: null, is_activated: false, config: null }),
            { status: 200 }
          );
        }
        if (url.includes("/admin/white-label/requests/wl-req-99/approve")) {
          return new Response(
            JSON.stringify({
              success: true,
              activation_key: "CSWL-9988-7766-5544",
              request: { id: "wl-req-99", status: "approved" },
            }),
            { status: 200 }
          );
        }
        if (url.includes("/admin/white-label/requests")) {
          return new Response(
            JSON.stringify([
              {
                id: "wl-req-99",
                organization_id: "org-client-2",
                organization_name: "Metro Supermart",
                requester_email: "metro@client.in",
                requester_name: "Vikram",
                requested_brand_name: "MetroPOS",
                requested_domain: "billing.metro.in",
                notes: "Custom brand request",
                status: "pending",
                created_at: new Date().toISOString(),
              },
            ]),
            { status: 200 }
          );
        }
        if (url.includes("/admin/metrics")) {
          return new Response(JSON.stringify({ live_users_count: 2, today_bills_count: 5 }), { status: 200 });
        }
        return new Response(JSON.stringify([]), { status: 200 });
      });

      render(
        <MemoryRouter>
          <WhiteLabelProvider>
            <AdminPortal />
          </WhiteLabelProvider>
        </MemoryRouter>
      );

      const wlTabBtn = await screen.findByRole("button", { name: /White-Label/i });
      fireEvent.click(wlTabBtn);

      await waitFor(() => {
        expect(screen.getByText("MetroPOS")).toBeDefined();
      });

      const approveBtn = screen.getByRole("button", { name: /Approve & Generate Key/i });
      fireEvent.click(approveBtn);

      // Confirm inside approval modal
      const modalSubmitBtn = await screen.findAllByRole("button", { name: /Approve & Generate Key/i });
      fireEvent.click(modalSubmitBtn[modalSubmitBtn.length - 1]);

      await waitFor(() => {
        expect(screen.getByText("Activation Key Generated")).toBeDefined();
        expect(screen.getByText("CSWL-9988-7766-5544")).toBeDefined();
      });
    });

    it("loads scope=all users and metrics across businesses for Platform Admin", async () => {
      mockUser = { id: "admin-1", email: "ashwinbishnoi05@gmail.com", is_platform_admin: true };
      const requestedUrls: string[] = [];

      vi.spyOn(global, "fetch").mockImplementation(async (input) => {
        const url = String(input);
        requestedUrls.push(url);
        if (url.includes("/white-label/status")) {
          return new Response(
            JSON.stringify({ is_platform_admin: true, request: null, is_activated: false, config: null }),
            { status: 200 }
          );
        }
        if (url.includes("/admin/metrics")) {
          return new Response(
            JSON.stringify({ live_users_count: 5, total_users_count: 14, total_orgs_count: 6, today_bills_count: 22 }),
            { status: 200 }
          );
        }
        if (url.includes("/admin/users")) {
          return new Response(
            JSON.stringify([
              {
                id: "owner-real-1",
                email: "tester@realbiz.in",
                full_name: "Priya Real Owner",
                role: "owner",
                organization_id: "org-real-99",
                organization_name: "RealTime Superstore",
                presence_status: "online",
                bill_count: 10,
                bill_total: 19500,
                locked_features_count: 0,
              },
            ]),
            { status: 200 }
          );
        }
        return new Response(JSON.stringify([]), { status: 200 });
      });

      render(
        <MemoryRouter>
          <WhiteLabelProvider>
            <AdminPortal />
          </WhiteLabelProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(requestedUrls.some((u) => u.includes("/admin/users") && u.includes("scope=all"))).toBe(true);
        expect(requestedUrls.some((u) => u.includes("/admin/metrics") && u.includes("scope=all"))).toBe(true);
      });

      const usersTabBtn = screen.getByRole("button", { name: /^Users$/i });
      fireEvent.click(usersTabBtn);

      await waitFor(() => {
        expect(screen.getByText("Priya Real Owner")).toBeDefined();
        expect(screen.getAllByText(/RealTime Superstore/i).length).toBeGreaterThan(0);
      });
    });

    it("resolves public brand by slug cleanly", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            active: true,
            brand: {
              brand_slug: "metropos",
              brand_name: "MetroPOS",
              primary_color: "#0D9488",
            },
          }),
          { status: 200 }
        )
      );

      const res = await whiteLabelApi.resolvePublicBrand({ slug: "metropos" });
      expect(res.data?.active).toBe(true);
      expect(res.data?.brand?.brand_name).toBe("MetroPOS");
    });
  });
});
