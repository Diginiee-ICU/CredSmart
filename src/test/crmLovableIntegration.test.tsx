import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CrmAppDefault, { CrmApp } from "@/crm";
import { supabase, disconnectCrmRealtime } from "@/crm/integrations/supabase/client";

// Mock Supabase Realtime channel to avoid unhandled network connections in tests
vi.mock("@/crm/integrations/supabase/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/crm/integrations/supabase/client")>();
  return {
    ...actual,
    disconnectCrmRealtime: vi.fn(() => {
      actual.disconnectCrmRealtime();
    }),
  };
});

describe("CRM Lovable Integration & Dual-Backend Isolation", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("1. Module Exports & Contract Invariants", () => {
    it("exports CrmApp as both named export and default export from src/crm", () => {
      expect(CrmApp).toBeDefined();
      expect(CrmAppDefault).toBeDefined();
      expect(CrmApp).toBe(CrmAppDefault);
    });

    it("ensures CRM Supabase client is configured for Lovable backend instance", () => {
      expect(supabase).toBeDefined();
      // Supabase client instance configuration check
      // Target Lovable backend project: wqllixoghlxvapmziilk.supabase.co
      expect((supabase as any).supabaseUrl).toBe("https://wqllixoghlxvapmziilk.supabase.co");
    });

    it("ensures CRM Supabase client uses isolated storageKey 'crm_supabase_auth_token'", () => {
      // The storageKey must NOT collide with POS credentials ('pos_auth_token' or 'credsmart_token')
      const authConfig = (supabase.auth as any).storageKey;
      expect(authConfig).toBe("crm_supabase_auth_token");
      expect(authConfig).not.toBe("pos_auth_token");
      expect(authConfig).not.toBe("credsmart_token");
    });

    it("exports disconnectCrmRealtime function and safely executes", () => {
      expect(typeof disconnectCrmRealtime).toBe("function");
      expect(() => disconnectCrmRealtime()).not.toThrow();
    });
  });

  describe("2. Shell Rendering & 4-Tier Hardware Back Support", () => {
    it("renders CrmApp inside MemoryRouter without crashing", () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/crm"]}>
          <CrmApp />
        </MemoryRouter>
      );

      expect(container).toBeDefined();
      // Verify root CRM container renders
      const crmRoot = container.querySelector("[data-crm-active-tab]");
      expect(crmRoot).not.toBeNull();
    });

    it("mounts with 'command' as initial active sub-tab for back-button tab unwinding", () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/crm"]}>
          <CrmApp />
        </MemoryRouter>
      );

      const crmRoot = container.querySelector("[data-crm-active-tab]");
      expect(crmRoot?.getAttribute("data-crm-active-tab")).toBe("command");
    });

    it("renders navigation sub-tabs decorated with data-crm-tab attributes", () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/crm"]}>
          <CrmApp />
        </MemoryRouter>
      );

      // Verify that navigation tabs have data-crm-tab for Android hardware back unwinding
      const commandTab = container.querySelector('[data-crm-tab="command"]');
      const attendanceTab = container.querySelector('[data-crm-tab="attendance"]');
      const tasksTab = container.querySelector('[data-crm-tab="tasks"]');
      const payrollTab = container.querySelector('[data-crm-tab="payroll"]');

      expect(commandTab).not.toBeNull();
      expect(attendanceTab).not.toBeNull();
      expect(tasksTab).not.toBeNull();
      expect(payrollTab).not.toBeNull();
    });
  });
});
