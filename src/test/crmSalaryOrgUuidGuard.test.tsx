/**
 * @file crmSalaryOrgUuidGuard.test.tsx
 * @description Verifies that SalaryManagement does not trigger PostgreSQL invalid UUID syntax
 * errors ("invalid input syntax for type uuid: 'default_org'") or show destructive error toasts
 * when orgId is uninitialized, null, or 'default_org'.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SalaryManagement from "@/pages/crm/SalaryManagement";
import { supabase } from "@/integrations/supabase/client";

export const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (args: unknown) => toastMock(args),
}));

export const mockOrgState = {
  orgId: null as string | null,
  org: null as any,
  userRole: "admin",
};

vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => mockOrgState,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-test", email: "test@credsmart.test" },
  }),
}));

vi.mock("@/hooks/useCRMPermission", () => ({
  useCRMPermission: () => ({
    isSuperAdmin: true,
    hasPermission: () => true,
    role: "admin",
  }),
}));

describe("Salary Management Org UUID Safety Guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrgState.orgId = null;
    mockOrgState.org = null;
  });

  it("does not query Supabase crm_salary_adjustments with 'default_org' when orgId is null", async () => {
    const fromSpy = vi.spyOn(supabase, "from");

    render(
      <MemoryRouter>
        <SalaryManagement />
      </MemoryRouter>
    );

    // Wait short interval to allow initial effect to settle
    await new Promise((r) => setTimeout(r, 100));

    // Verify crm_salary_adjustments was NOT queried with default_org
    const adjustmentCalls = fromSpy.mock.calls.filter(([tbl]) => tbl === "crm_salary_adjustments");
    expect(adjustmentCalls.length).toBe(0);

    // Verify no destructive error toast was shown
    expect(toastMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Error Loading Adjustments",
        variant: "destructive",
      })
    );
  });

  it("does not query Supabase when orgId is explicitly 'default_org'", async () => {
    mockOrgState.orgId = "default_org";
    const fromSpy = vi.spyOn(supabase, "from");

    render(
      <MemoryRouter>
        <SalaryManagement />
      </MemoryRouter>
    );

    await new Promise((r) => setTimeout(r, 100));

    const adjustmentCalls = fromSpy.mock.calls.filter(([tbl]) => tbl === "crm_salary_adjustments");
    expect(adjustmentCalls.length).toBe(0);
    expect(toastMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Error Loading Adjustments",
        variant: "destructive",
      })
    );
  });
});
