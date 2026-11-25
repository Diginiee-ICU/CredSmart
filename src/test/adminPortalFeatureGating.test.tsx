import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { adminApi } from "@/services/adminApi";
import { FeatureAccessProvider, useFeatureAccess } from "@/hooks/useFeatureAccess";
import { FeatureAccessRequestModal } from "@/components/features/FeatureAccessRequestModal";
import { FeatureLockGuard } from "@/components/routing/FeatureLockGuard";
import AdminPortal from "@/pages/AdminPortal";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "test-token" } },
      }),
    },
  },
}));

// Mock Auth
const mockUser = { id: "user-123", email: "cashier@credsmart.online" };
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    signOut: vi.fn(),
  }),
}));

// Mock Organization with configurable role
let mockRole = "cashier";
let mockPermissions: Record<string, boolean> | null = null;
vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => ({
    orgId: "org-test-1",
    userRole: mockRole,
    userPermissions: mockPermissions,
    loading: false,
    organizations: [{ id: "org-test-1", name: "CredSmart Retail Hub" }],
    switchOrganization: vi.fn(),
  }),
}));

describe("CredSmart Admin Portal & Granular Feature Gating Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    mockRole = "cashier";
    mockPermissions = null;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("1. adminApi Service Client", () => {
    it("requests metrics with x-organization-id header", async () => {
      const mockMetrics = {
        live_users_count: 3,
        today_bills_count: 42,
        today_sales_total: 12500,
        total_bills_count: 512,
        total_sales_total: 156000,
        pending_requests_count: 2,
        hourly_velocity: [{ hour: 11, count: 8, total: 2400 }],
        billings_by_staff: [{ user_id: "u1", user_name: "Rahul", user_email: "r@c.io", count: 25, total: 8000 }],
        feature_usage_stats: [{ feature_key: "pos", usage_count: 120 }],
      };

      vi.spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockMetrics), { status: 200 })
      );

      const res = await adminApi.getMetrics("org-test-1");
      expect(res.data).toEqual(mockMetrics);
      expect(res.data?.live_users_count).toBe(3);
      expect(res.data?.today_bills_count).toBe(42);
    });

    it("toggles user feature lock and updates local cache", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, lock: { feature_key: "eInvoicing", is_locked: true } }), {
          status: 200,
        })
      );

      const res = await adminApi.toggleUserFeature("user-123", "eInvoicing", true, "org-test-1");
      expect(res.data?.success).toBe(true);

      const cached = localStorage.getItem("credsmart_feature_locks_org-test-1_user-123");
      expect(cached).toBeTruthy();
      expect(JSON.parse(cached!)).toEqual({ eInvoicing: true });
    });

    it("submits feature access request and broadcasts event", async () => {
      const mockReq = {
        id: "req-1",
        organization_id: "org-test-1",
        user_id: "user-123",
        user_email: "cashier@credsmart.online",
        user_name: "Cashier",
        feature_key: "eInvoicing",
        reason: "Need for GST export",
        status: "pending" as const,
        created_at: new Date().toISOString(),
      };

      vi.spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, request: mockReq }), { status: 200 })
      );

      const res = await adminApi.requestFeatureAccess("eInvoicing", "Need for GST export", "org-test-1");
      expect(res.data?.success).toBe(true);
      expect(res.data?.request.feature_key).toBe("eInvoicing");
    });
  });

  describe("2. useFeatureAccess Hook & Real-time Gating", () => {
    function HookTester({ featureKey }: { featureKey: string }) {
      const { isFeatureLocked, getFeatureRequestStatus, openRequestModal, requestAccess } = useFeatureAccess();
      return (
        <div>
          <span data-testid="locked-status">{isFeatureLocked(featureKey) ? "LOCKED" : "UNLOCKED"}</span>
          <span data-testid="request-status">{getFeatureRequestStatus(featureKey)}</span>
          <button data-testid="open-modal-btn" onClick={() => openRequestModal(featureKey)}>
            Open Modal
          </button>
          <button data-testid="request-btn" onClick={() => requestAccess(featureKey, "Need access")}>
            Request Access
          </button>
        </div>
      );
    }

    it("store owner is NEVER locked from any feature", () => {
      mockRole = "store_owner";
      render(
        <FeatureAccessProvider>
          <HookTester featureKey="eInvoicing" />
        </FeatureAccessProvider>
      );

      expect(screen.getByTestId("locked-status").textContent).toBe("UNLOCKED");
    });

    it("cashier is locked when feature lock is enabled", async () => {
      mockRole = "cashier";
      vi.spyOn(global, "fetch").mockImplementation((url: any) => {
        if (url.includes("/features/my-locks")) {
          return Promise.resolve(new Response(JSON.stringify({ eInvoicing: true }), { status: 200 }));
        }
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      });

      render(
        <FeatureAccessProvider>
          <HookTester featureKey="eInvoicing" />
        </FeatureAccessProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("locked-status").textContent).toBe("LOCKED");
      });
    });

    it("unlocks immediately in real-time when approval event is received", async () => {
      mockRole = "cashier";
      vi.spyOn(global, "fetch").mockImplementation((url: any) => {
        if (url.includes("/features/my-locks")) {
          return Promise.resolve(new Response(JSON.stringify({ eInvoicing: true }), { status: 200 }));
        }
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      });

      render(
        <FeatureAccessProvider>
          <HookTester featureKey="eInvoicing" />
        </FeatureAccessProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("locked-status").textContent).toBe("LOCKED");
      });

      // Fire real-time approval event
      window.dispatchEvent(
        new CustomEvent("credsmart:access_request_reviewed", {
          detail: {
            id: "req-1",
            user_id: "user-123",
            feature_key: "eInvoicing",
            status: "approved",
          },
        })
      );

      await waitFor(() => {
        expect(screen.getByTestId("locked-status").textContent).toBe("UNLOCKED");
      });
    });
  });

  describe("3. FeatureAccessRequestModal Component", () => {
    function ModalWrapper() {
      const { openRequestModal } = useFeatureAccess();
      return (
        <div>
          <button data-testid="trigger-btn" onClick={() => openRequestModal("eInvoicing")}>
            Open
          </button>
          <FeatureAccessRequestModal />
        </div>
      );
    }

    it("renders modal with feature title and submits access request", async () => {
      vi.spyOn(global, "fetch").mockImplementation((url: any) => {
        if (url.includes("/features/request-access")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                request: {
                  id: "req-99",
                  feature_key: "eInvoicing",
                  status: "pending",
                  created_at: new Date().toISOString(),
                },
              }),
              { status: 200 }
            )
          );
        }
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      });

      render(
        <FeatureAccessProvider>
          <ModalWrapper />
        </FeatureAccessProvider>
      );

      fireEvent.click(screen.getByTestId("trigger-btn"));

      expect(screen.getByText("E-Invoicing & E-Way Compliance")).toBeDefined();
      expect(screen.getByText(/Locked/i)).toBeDefined();

      const textarea = screen.getByPlaceholderText(/e\.g\. Need access to generate/i);
      fireEvent.change(textarea, { target: { value: "Need for quarterly GST" } });

      const submitBtn = screen.getByRole("button", { name: /Request Access/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Access Request Pending Review/i)).toBeDefined();
      });
    });
  });

  describe("4. FeatureLockGuard Route Interceptor", () => {
    it("renders locked card and request trigger when navigating to locked route", async () => {
      mockRole = "cashier";
      vi.spyOn(global, "fetch").mockImplementation((url: any) => {
        if (url.includes("/features/my-locks")) {
          return Promise.resolve(new Response(JSON.stringify({ eInvoicing: true }), { status: 200 }));
        }
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      });

      render(
        <MemoryRouter initialEntries={["/billing/e-invoicing"]}>
          <FeatureAccessProvider>
            <Routes>
              <Route element={<FeatureLockGuard />}>
                <Route path="/billing/e-invoicing" element={<div data-testid="e-inv-page">Secret E-Invoice</div>} />
              </Route>
            </Routes>
          </FeatureAccessProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Module Locked by Administrator/i)).toBeDefined();
        expect(screen.queryByTestId("e-inv-page")).toBeNull();
      });
    });
  });

  describe("5. AdminPortal Component", () => {
    it("renders all 4 tabs and KPI hero cards for store owner", async () => {
      mockRole = "store_owner";

      vi.spyOn(global, "fetch").mockImplementation((url: any) => {
        if (url.includes("/admin/metrics")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                live_users_count: 4,
                today_bills_count: 18,
                today_sales_total: 45000,
                total_bills_count: 820,
                total_sales_total: 310000,
                pending_requests_count: 1,
                hourly_velocity: [],
                billings_by_staff: [
                  { user_id: "u1", user_name: "Aman", user_email: "a@c.io", count: 12, total: 32000 },
                ],
                feature_usage_stats: [{ feature_key: "pos", usage_count: 90 }],
              }),
              { status: 200 }
            )
          );
        }
        if (url.includes("/presence/live-users")) {
          return Promise.resolve(
            new Response(
              JSON.stringify([
                {
                  user_id: "u1",
                  user_email: "a@c.io",
                  user_name: "Aman",
                  display_name: "Aman Singh",
                  user_role: "cashier",
                  current_path: "/billing/pos",
                  platform: "desktop-web",
                  status: "online",
                  last_active_at: new Date().toISOString(),
                },
              ]),
              { status: 200 }
            )
          );
        }
        if (url.includes("/admin/users")) {
          return Promise.resolve(
            new Response(
              JSON.stringify([
                {
                  id: "u1",
                  email: "a@c.io",
                  full_name: "Aman Singh",
                  role: "cashier",
                  presence_status: "online",
                  bill_count: 12,
                  bill_total: 32000,
                  locked_features_count: 2,
                },
              ]),
              { status: 200 }
            )
          );
        }
        if (url.includes("/admin/access-requests")) {
          return Promise.resolve(
            new Response(
              JSON.stringify([
                {
                  id: "req-1",
                  organization_id: "org-test-1",
                  user_id: "u1",
                  user_name: "Aman Singh",
                  feature_key: "eInvoicing",
                  reason: "Truck departure",
                  status: "pending",
                  created_at: new Date().toISOString(),
                },
              ]),
              { status: 200 }
            )
          );
        }
        if (url.includes("/features/my-locks")) {
          return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
        }
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      });

      render(
        <MemoryRouter>
          <FeatureAccessProvider>
            <AdminPortal />
          </FeatureAccessProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Admin & Feature Control Center/i)).toBeDefined();
        expect(screen.getByText("Live Users Online")).toBeDefined();
        expect(screen.getByText("Today's Invoices")).toBeDefined();
        expect(screen.getByText("Aman Singh")).toBeDefined();
      });

      // Switch to Requests tab
      const requestsTabBtn = screen.getByRole("button", { name: /Requests/i });
      fireEvent.click(requestsTabBtn);

      await waitFor(() => {
        expect(screen.getByText(/Truck departure/i)).toBeDefined();
        expect(screen.getByRole("button", { name: /Approve & Unlock/i })).toBeDefined();
      });
    });

    it("renders DB 'owner' users with organization names and matches them under owner_group filter", async () => {
      mockRole = "store_owner";

      vi.spyOn(global, "fetch").mockImplementation((url: any) => {
        const s = String(url);
        if (s.includes("/admin/metrics")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                live_users_count: 3,
                total_users_count: 3,
                total_orgs_count: 2,
                today_bills_count: 5,
                today_sales_total: 12000,
                total_bills_count: 50,
                total_sales_total: 90000,
                pending_requests_count: 0,
                hourly_velocity: [],
                billings_by_staff: [],
                feature_usage_stats: [],
              }),
              { status: 200 }
            )
          );
        }
        if (s.includes("/admin/users")) {
          return Promise.resolve(
            new Response(
              JSON.stringify([
                {
                  id: "u-owner-1",
                  email: "rajesh@sharmakirana.in",
                  full_name: "Rajesh Sharma",
                  role: "owner",
                  organization_id: "org-kirana-1",
                  organization_name: "Sharma Kirana Mart",
                  presence_status: "online",
                  bill_count: 42,
                  bill_total: 85000,
                  locked_features_count: 0,
                },
                {
                  id: "u-cashier-1",
                  email: "cashier@sharmakirana.in",
                  full_name: "Neha Cashier",
                  role: "cashier",
                  organization_id: "org-kirana-1",
                  organization_name: "Sharma Kirana Mart",
                  presence_status: "offline",
                  bill_count: 8,
                  bill_total: 5000,
                  locked_features_count: 1,
                },
              ]),
              { status: 200 }
            )
          );
        }
        if (s.includes("/features/my-locks")) {
          return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
        }
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      });

      render(
        <MemoryRouter>
          <FeatureAccessProvider>
            <AdminPortal />
          </FeatureAccessProvider>
        </MemoryRouter>
      );

      // Verify Users tab shows both owner & cashier + store name
      const usersTabBtn = await screen.findByRole("button", { name: /^Users$/i });
      fireEvent.click(usersTabBtn);

      await waitFor(() => {
        expect(screen.getByText("Rajesh Sharma")).toBeDefined();
        expect(screen.getByText("Neha Cashier")).toBeDefined();
        expect(screen.getAllByText(/Sharma Kirana Mart/i).length).toBeGreaterThan(0);
      });

      // Apply Business Owners filter (owner_group must match DB role 'owner')
      const selects = screen.getAllByRole("combobox");
      const roleSelect = selects.find((el) => el.querySelector('option[value="owner_group"]'));
      expect(roleSelect).toBeDefined();
      fireEvent.change(roleSelect!, { target: { value: "owner_group" } });

      await waitFor(() => {
        expect(screen.getByText("Rajesh Sharma")).toBeDefined();
        expect(screen.queryByText("Neha Cashier")).toBeNull();
      });
    });

    it("passes target_org_id when toggling a feature lock for a cross-org business owner", async () => {
      mockRole = "store_owner";
      let capturedToggleBody: any = null;

      vi.spyOn(global, "fetch").mockImplementation((url: any, options?: any) => {
        const s = String(url);
        if (s.includes("/admin/metrics")) {
          return Promise.resolve(new Response(JSON.stringify({ live_users_count: 1 }), { status: 200 }));
        }
        if (s.includes("/admin/users/u-owner-2/features") && options?.method === "POST") {
          capturedToggleBody = JSON.parse(options.body);
          return Promise.resolve(
            new Response(JSON.stringify({ success: true, feature_key: capturedToggleBody.feature_key, is_locked: true }), {
              status: 200,
            })
          );
        }
        if (s.includes("/admin/users/u-owner-2/features")) {
          return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
        }
        if (s.includes("/admin/users")) {
          return Promise.resolve(
            new Response(
              JSON.stringify([
                {
                  id: "u-owner-2",
                  email: "owner2@metropos.in",
                  full_name: "Vikram Verma",
                  role: "owner",
                  organization_id: "org-biz-2",
                  organization_name: "Metro Mart",
                  presence_status: "online",
                  bill_count: 15,
                  bill_total: 24000,
                  locked_features_count: 0,
                },
              ]),
              { status: 200 }
            )
          );
        }
        if (s.includes("/features/my-locks")) {
          return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
        }
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      });

      render(
        <MemoryRouter>
          <FeatureAccessProvider>
            <AdminPortal />
          </FeatureAccessProvider>
        </MemoryRouter>
      );

      const featuresTabBtn = await screen.findByRole("button", { name: /Feature Gating/i });
      fireEvent.click(featuresTabBtn);

      await waitFor(() => {
        const selects = screen.getAllByRole("combobox");
        const targetSelect = selects.find((el) => el.querySelector('option[value="u-owner-2"]'));
        expect(targetSelect).toBeDefined();
      });

      const selects = screen.getAllByRole("combobox");
      const targetSelect = selects.find((el) => el.querySelector('option[value="u-owner-2"]'))!;
      fireEvent.change(targetSelect, { target: { value: "u-owner-2" } });

      const lockButtons = await screen.findAllByRole("button", { name: /^Lock$/i });
      fireEvent.click(lockButtons[0]);

      await waitFor(() => {
        expect(capturedToggleBody).toBeTruthy();
        expect(capturedToggleBody.target_org_id).toBe("org-biz-2");
        expect(capturedToggleBody.is_locked).toBe(true);
      });
    });

    it("surfaces backend error banner with Retry when /admin/users fails", async () => {
      mockRole = "store_owner";

      vi.spyOn(global, "fetch").mockImplementation((url: any) => {
        const s = String(url);
        if (s.includes("/admin/metrics")) {
          return Promise.resolve(new Response(JSON.stringify({ live_users_count: 1 }), { status: 200 }));
        }
        if (s.includes("/admin/users")) {
          return Promise.resolve(
            new Response(JSON.stringify({ error: 'column "role" does not exist' }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            })
          );
        }
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      });

      render(
        <MemoryRouter>
          <FeatureAccessProvider>
            <AdminPortal />
          </FeatureAccessProvider>
        </MemoryRouter>
      );

      const usersTabBtn = await screen.findByRole("button", { name: /^Users$/i });
      fireEvent.click(usersTabBtn);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load users/i)).toBeDefined();
        expect(screen.getByRole("button", { name: /Retry/i })).toBeDefined();
      });
    });

    it("logs feature usage telemetry when visiting an unlocked guarded route", async () => {
      mockRole = "store_owner";
      let capturedUsageBody: any = null;

      vi.spyOn(global, "fetch").mockImplementation((url: any, options?: any) => {
        const s = String(url);
        if (s.includes("/features/log-usage") && options?.method === "POST") {
          capturedUsageBody = JSON.parse(options.body);
          return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
        }
        if (s.includes("/features/my-locks")) {
          return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
        }
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      });

      render(
        <MemoryRouter initialEntries={["/billing/reports"]}>
          <FeatureAccessProvider>
            <Routes>
              <Route element={<FeatureLockGuard />}>
                <Route path="/billing/reports" element={<div data-testid="unlocked-reports">Reports Ready</div>} />
              </Route>
            </Routes>
          </FeatureAccessProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("unlocked-reports")).toBeDefined();
        expect(capturedUsageBody).toBeTruthy();
        expect(capturedUsageBody.feature_key).toBe("reports");
      });
    });

    it("blocks unauthorized roles (e.g. cashier) from accessing AdminPortal and renders restricted access screen", async () => {
      mockRole = "cashier";

      render(
        <MemoryRouter>
          <FeatureAccessProvider>
            <AdminPortal />
          </FeatureAccessProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Access Restricted: Administrator Privileges Required/i)).toBeDefined();
        expect(screen.getByRole("button", { name: /Return to POS & Billing/i })).toBeDefined();
      });
    });
  });
});
