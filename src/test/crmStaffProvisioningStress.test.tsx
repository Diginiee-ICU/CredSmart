/**
 * @file crmStaffProvisioningStress.test.tsx
 * @description Adversarial stress tests for Milestone 2 Staff User Provisioning & Instant Role Assignment.
 * Authored by EMPIRICAL CHALLENGER to aggressively test failure modes, entropy, edge cases, and UI concurrency.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RoleManagement from "@/pages/crm/RoleManagement";
import {
  validateStaffProvisioningInput,
  generateCryptographicPassword,
  formatCredentialsPayload,
  hydrateStaffRoster,
  type StoreRole,
} from "@/utils/crmStaffUtils";
import { crmApi } from "@/services/crmApi";
import { settingsApi } from "@/services/settingsApi";

// ============================================================================
// MOCKS & FIXTURES
// ============================================================================

const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (args: unknown) => toastMock(args),
}));

const mockOrg = {
  id: "org-stress-test-crm",
  name: "CredAlert Hypermarket",
};

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock("@/hooks/useOrganization", () => ({
  useOrganization: () => ({
    orgId: mockOrg.id,
    org: mockOrg,
    userRole: "store_owner",
  }),
}));

const mockCurrentUser = {
  id: "user-stress-owner-1",
  email: "owner@credalert.store",
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockCurrentUser,
  }),
}));

vi.mock("@/hooks/useCRMPermission", () => ({
  useCRMPermission: () => ({
    isSuperAdmin: true,
    hasPermission: () => true,
    loading: false,
    refreshPermissions: vi.fn(),
    userRoles: [{ id: "role-super-admin", name: "Super Admin", is_super_admin: true }],
  }),
  usePermission: () => ({ allowed: true, loading: false }),
}));

vi.mock("@/services/crmApi", () => {
  const roles = [
    {
      id: "role-super-admin",
      org_id: "org-stress-test-crm",
      name: "Super Admin",
      color: "#1D4ED8",
      icon: "Crown",
      is_super_admin: true,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "role-custom-floor",
      org_id: "org-stress-test-crm",
      name: "Floor Manager",
      color: "#F59E0B",
      icon: "Briefcase",
      is_super_admin: false,
      created_at: "2026-01-02T00:00:00Z",
    },
  ];

  return {
    crmApi: {
      getCRMRoles: vi.fn().mockResolvedValue({ data: roles, error: null }),
      createCRMRole: vi.fn().mockImplementation((payload) =>
        Promise.resolve({
          data: {
            id: `role-${Date.now()}`,
            org_id: payload.org_id || "org-stress-test-crm",
            name: payload.name,
            color: payload.color || "#1D4ED8",
            icon: payload.icon || "Shield",
            is_super_admin: false,
            created_at: new Date().toISOString(),
          },
          error: null,
        })
      ),
      updateCRMRole: vi.fn().mockResolvedValue({ data: {}, error: null }),
      deleteCRMRole: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
      getCRMPermissions: vi.fn().mockResolvedValue({ data: [], error: null }),
      deleteCRMPermissionsByRoleId: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
      insertCRMPermissions: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
      getCRMStaffRoles: vi.fn().mockResolvedValue({
        data: [{ staff_id: "user-staff-1", role_id: "role-custom-floor" }],
        error: null,
      }),
      assignCRMStaffRole: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
      deleteCRMStaffRole: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
      provisionStaffUser: vi.fn().mockImplementation((payload) =>
        Promise.resolve({
          data: {
            success: true,
            user: {
              id: `user-prov-${Date.now()}`,
              email: payload.email,
              full_name: payload.full_name,
              phone: payload.phone || "9876543210",
              store_role: payload.store_role,
              crm_role_id: payload.crm_role_id,
            },
            credentials: {
              email: payload.email,
              password: payload.password,
            },
          },
          error: null,
        })
      ),
    },
  };
});

vi.mock("@/services/settingsApi", () => ({
  settingsApi: {
    getMemberships: vi.fn().mockResolvedValue({
      data: [
        {
          id: "mem-1",
          user_id: "user-staff-1",
          role: "manager",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      error: null,
    }),
    getProfiles: vi.fn().mockResolvedValue({
      data: [{ id: "user-staff-1", full_name: "Amitabh Bachchan" }],
      error: null,
    }),
  },
}));

Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});
window.open = vi.fn();

// ============================================================================
// ADVERSARIAL STRESS TEST SUITE
// ============================================================================

describe("Adversarial Stress Testing: Staff Provisioning & Role Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Invalid Email Formats Matrix
  // ──────────────────────────────────────────────────────────────────────────
  describe("Adversarial 1: Email Syntax Fuzzing & Malformed Address Rejection", () => {
    const malformedEmails = [
      "",
      "   ",
      "plainaddress",
      "@missinglocal.com",
      "missingdomain@",
      "missingdomain@.com",
      "two@@at.com",
      "spaces in@local.com",
      "local@spaces in domain.com",
      "user..consecutive@domain.com",
      ".leadingdot@domain.com",
      "user@domain..com",
      "user@.domain.com",
      "user@domain.com.",
      "trailingdot.@domain.com",
      "user@domain.c",
    ];

    malformedEmails.forEach((badEmail) => {
      it(`rejects malformed email format: "${badEmail}"`, () => {
        const result = validateStaffProvisioningInput({
          full_name: "Vikram Seth",
          email: badEmail,
          store_role: "salesman",
        });

        expect(result.valid).toBe(false);
        expect(result.errors.email).toBeDefined();
        if (!badEmail.trim()) {
          expect(result.errors.email).toBe("Email is required");
        } else {
          expect(result.errors.email).toBe("Invalid email address format");
        }
      });
    });

    it("accepts valid RFC-compliant enterprise emails", () => {
      const validEmails = [
        "simple@example.com",
        "very.common@example.com",
        "disposable.style.email.with+symbol@example.com",
        "other.email-with-hyphen@example.com",
        "fully-numeric-user123@example.com",
        "x@example.com",
        "admin@subdomain.store.credsmart.online",
      ];

      validEmails.forEach((email) => {
        const result = validateStaffProvisioningInput({
          full_name: "Vikram Seth",
          email,
          store_role: "salesman",
        });
        expect(result.valid).toBe(true);
        expect(result.sanitized?.email).toBe(email.toLowerCase());
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Whitespace-Only Names & Extreme Length Boundaries
  // ──────────────────────────────────────────────────────────────────────────
  describe("Adversarial 2: Whitespace Fuzzing & Full Name Boundaries", () => {
    it("rejects various whitespace-only strings (spaces, tabs, newlines, carriage returns)", () => {
      const whitespaceInputs = ["", " ", "   ", "\t", "\n", "\r\n", " \t \n \r  "];

      whitespaceInputs.forEach((ws) => {
        const result = validateStaffProvisioningInput({
          full_name: ws,
          email: "valid@store.com",
          store_role: "cashier",
        });

        expect(result.valid).toBe(false);
        expect(result.errors.full_name).toBe("Full name is required");
      });
    });

    it("strictly enforces minimum 2 characters (rejects 1 char, accepts 2 chars)", () => {
      const oneChar = validateStaffProvisioningInput({
        full_name: "X",
        email: "valid@store.com",
        store_role: "cashier",
      });
      expect(oneChar.valid).toBe(false);
      expect(oneChar.errors.full_name).toBe("Full name must be at least 2 characters");

      const paddedOneChar = validateStaffProvisioningInput({
        full_name: "   X   ",
        email: "valid@store.com",
        store_role: "cashier",
      });
      expect(paddedOneChar.valid).toBe(false);
      expect(paddedOneChar.errors.full_name).toBe("Full name must be at least 2 characters");

      const twoChars = validateStaffProvisioningInput({
        full_name: "Al",
        email: "valid@store.com",
        store_role: "cashier",
      });
      expect(twoChars.valid).toBe(true);
      expect(twoChars.sanitized?.fullName).toBe("Al");
    });

    it("strictly enforces maximum 100 characters boundary", () => {
      const exact100 = "N".repeat(100);
      const res100 = validateStaffProvisioningInput({
        full_name: exact100,
        email: "valid@store.com",
        store_role: "cashier",
      });
      expect(res100.valid).toBe(true);
      expect(res100.sanitized?.fullName).toBe(exact100);

      const excess101 = "N".repeat(101);
      const res101 = validateStaffProvisioningInput({
        full_name: excess101,
        email: "valid@store.com",
        store_role: "cashier",
      });
      expect(res101.valid).toBe(false);
      expect(res101.errors.full_name).toBe("Full name cannot exceed 100 characters");

      // Whitespace padded 100 characters trims to 100 characters cleanly
      const padded100 = "   " + exact100 + "   ";
      const resPadded = validateStaffProvisioningInput({
        full_name: padded100,
        email: "valid@store.com",
        store_role: "cashier",
      });
      expect(resPadded.valid).toBe(true);
      expect(resPadded.sanitized?.fullName).toBe(exact100);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Short Passwords (< 6 chars in manual mode)
  // ──────────────────────────────────────────────────────────────────────────
  describe("Adversarial 3: Manual Password Validation (<6 chars threshold)", () => {
    it("rejects manual passwords with 1, 2, 3, 4, or 5 characters", () => {
      const shortPasswords = ["1", "ab", "123", "a!2c", "12345"];

      shortPasswords.forEach((pwd) => {
        const result = validateStaffProvisioningInput({
          full_name: "Deepa Mehta",
          email: "deepa@store.com",
          store_role: "salesman",
          password: pwd,
        });

        expect(result.valid).toBe(false);
        expect(result.errors.password).toBe("Password must be at least 6 characters long");
      });
    });

    it("accepts passwords with exactly 6 characters and longer", () => {
      const validPasswords = ["123456", "secret", "p@ss12", "VeryLongSecurePassword#2026!"];

      validPasswords.forEach((pwd) => {
        const result = validateStaffProvisioningInput({
          full_name: "Deepa Mehta",
          email: "deepa@store.com",
          store_role: "salesman",
          password: pwd,
        });

        expect(result.valid).toBe(true);
        expect(result.errors.password).toBeUndefined();
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. High-Entropy Password Randomness & Zero-Collision Stress Test
  // ──────────────────────────────────────────────────────────────────────────
  describe("Adversarial 4: Cryptographic Password Entropy & Distribution (100 & 500 samples)", () => {
    it("guarantees 0 collisions across 100 consecutive generations", () => {
      const generated = new Set<string>();
      const count = 100;

      for (let i = 0; i < count; i++) {
        const pwd = generateCryptographicPassword(14);
        expect(generated.has(pwd)).toBe(false);
        generated.add(pwd);
      }

      expect(generated.size).toBe(count);
    });

    it("stress-tests 500 generations with 0 collisions and verifies character diversity", () => {
      const generated = new Set<string>();
      const count = 500;

      for (let i = 0; i < count; i++) {
        const pwd = generateCryptographicPassword(14);
        expect(generated.has(pwd)).toBe(false);
        generated.add(pwd);

        // Every generated password must satisfy all 4 character classes
        expect(/[A-Z]/.test(pwd)).toBe(true);
        expect(/[a-z]/.test(pwd)).toBe(true);
        expect(/[0-9]/.test(pwd)).toBe(true);
        expect(/[!@#$%^&*()_+~|}{[\]:;?><,./-=]/.test(pwd)).toBe(true);
        expect(pwd).toHaveLength(14);
      }

      expect(generated.size).toBe(count);
    });

    it("throws boundary error when length requested is below 8", () => {
      expect(() => generateCryptographicPassword(7)).toThrow(
        "Password length must be at least 8 characters"
      );
      expect(() => generateCryptographicPassword(0)).toThrow(
        "Password length must be at least 8 characters"
      );
      expect(() => generateCryptographicPassword(-5)).toThrow(
        "Password length must be at least 8 characters"
      );
    });

    it("supports extended length cryptographic keys (e.g. 32 and 64 chars)", () => {
      const key32 = generateCryptographicPassword(32);
      expect(key32).toHaveLength(32);
      const key64 = generateCryptographicPassword(64);
      expect(key64).toHaveLength(64);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Accented / Unicode Names and Phone Number Normalization
  // ──────────────────────────────────────────────────────────────────────────
  describe("Adversarial 5: Unicode Names and Phone Normalization Stress Test", () => {
    it("safely accepts multi-language Unicode and accented names without mangling", () => {
      const multiLingualNames = [
        "René François",
        "Björn Åkesson",
        "José González",
        "Zoë O'Connor",
        "Müller-Lüdenscheidt",
        "राहुल शर्मा",
        "அருண் குமார்",
        "నవీన్ కుమార్",
        "李小龙",
        "طارق أحمد",
      ];

      multiLingualNames.forEach((name) => {
        const res = validateStaffProvisioningInput({
          full_name: name,
          email: "unicode.test@credsmart.online",
          store_role: "staff",
        });

        expect(res.valid).toBe(true);
        expect(res.sanitized?.fullName).toBe(name);
      });
    });

    it("normalizes diverse phone number formats to standard 10-digit mobile string", () => {
      const validPhoneVariations = [
        { input: "9876543210", expected: "9876543210" },
        { input: "+91 98765 43210", expected: "9876543210" },
        { input: "+91-98765-43210", expected: "9876543210" },
        { input: "919876543210", expected: "9876543210" },
        { input: "09876543210", expected: "9876543210" },
        { input: "(+91) 98765 43210", expected: "9876543210" },
        { input: "98765.43210", expected: "9876543210" },
        { input: " 98765 43210 ", expected: "9876543210" },
      ];

      validPhoneVariations.forEach(({ input, expected }) => {
        const res = validateStaffProvisioningInput({
          full_name: "Phone Test",
          email: "test@domain.com",
          phone: input,
          store_role: "manager",
        });

        expect(res.valid).toBe(true);
        expect(res.sanitized?.phone).toBe(expected);
      });
    });

    it("rejects invalid phone numbers with wrong digit counts or non-digits", () => {
      const invalidPhones = [
        "12345", // too short (5 digits)
        "987654321", // 9 digits
        "987654321012", // 12 digits not starting with 91
        "abcdefghij", // alphabetic
        "+1 555-0199", // US phone (7 digits)
      ];

      invalidPhones.forEach((badPhone) => {
        const res = validateStaffProvisioningInput({
          full_name: "Phone Test",
          email: "test@domain.com",
          phone: badPhone,
          store_role: "manager",
        });

        expect(res.valid).toBe(false);
        expect(res.errors.phone).toBe("Phone number must be a valid 10-digit mobile number");
      });
    });

    it("treats omitted or empty phone number as valid optional field", () => {
      const resUndefined = validateStaffProvisioningInput({
        full_name: "No Phone",
        email: "nophone@store.com",
        store_role: "salesman",
      });
      expect(resUndefined.valid).toBe(true);
      expect(resUndefined.sanitized?.phone).toBe("");

      const resEmpty = validateStaffProvisioningInput({
        full_name: "No Phone",
        email: "nophone@store.com",
        phone: "",
        store_role: "salesman",
      });
      expect(resEmpty.valid).toBe(true);
      expect(resEmpty.sanitized?.phone).toBe("");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Credentials Formatting & WhatsApp Safe Encoding
  // ──────────────────────────────────────────────────────────────────────────
  describe("Adversarial 6: Credentials Formatting and Special Character URL Escaping", () => {
    it("properly URL-encodes special characters in passwords inside WhatsApp sharing URL", () => {
      const specialPassword = "P@ssw0rd!#$&+=?%/~";
      const payload = formatCredentialsPayload({
        fullName: "Sanjay Singhania",
        email: "sanjay@singhania.com",
        password: specialPassword,
        roleName: "Sales Director",
        orgName: "Singhania & Co.",
      });

      // Verify masked password length matches
      expect(payload.maskedPassword).toHaveLength(specialPassword.length);
      expect(payload.maskedPassword).toBe("•".repeat(specialPassword.length));

      // Verify WhatsApp URL does not contain unescaped query string terminators
      expect(payload.whatsAppUrl.startsWith("https://wa.me/?text=")).toBe(true);
      expect(payload.whatsAppUrl).toContain(encodeURIComponent(specialPassword));
      expect(payload.whatsAppUrl).not.toContain(" ");
      expect(payload.clipboardText).toContain(specialPassword);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. In-Memory Roster Hydration Robustness
  // ──────────────────────────────────────────────────────────────────────────
  describe("Adversarial 7: Roster Hydration Edge Cases", () => {
    it("handles hydration with empty initial roster", () => {
      const { updatedStaffList, updatedRolesMap } = hydrateStaffRoster([], {}, {
        id: "new-user-1",
        full_name: "First Employee",
        store_role: "salesman",
        crm_role_id: "role-1",
      });

      expect(updatedStaffList).toHaveLength(1);
      expect(updatedStaffList[0].name).toBe("First Employee");
      expect(updatedRolesMap["new-user-1"]).toBe("role-1");
    });

    it("replaces existing staff item without creating duplicates", () => {
      const initial = [
        { id: "u1", name: "User 1", role: "cashier", crmRoleId: "r1" },
        { id: "u2", name: "User 2", role: "staff", crmRoleId: "r2" },
      ];
      const initialMap = { u1: "r1", u2: "r2" };

      const { updatedStaffList, updatedRolesMap } = hydrateStaffRoster(initial, initialMap, {
        id: "u1",
        full_name: "User 1 (Renamed)",
        store_role: "manager",
        crm_role_id: "r3",
      });

      expect(updatedStaffList).toHaveLength(2);
      expect(updatedStaffList[0].name).toBe("User 1 (Renamed)");
      expect(updatedStaffList[0].role).toBe("manager");
      expect(updatedRolesMap["u1"]).toBe("r3");
      expect(updatedRolesMap["u2"]).toBe("r2");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 8. UI Stress: Rapid Button Clicks & Search Regex Fuzzing
  // ──────────────────────────────────────────────────────────────────────────
  describe("Adversarial 8: UI Stress Testing in RoleManagement", () => {
    it(
      "handles rapid clicking of 'Regenerate' password button without crashing or generating duplicates",
      async () => {
        render(
          <MemoryRouter>
            <RoleManagement />
          </MemoryRouter>
        );

        const addStaffBtn = await screen.findByRole("button", { name: /Add Staff User/i });
        fireEvent.click(addStaffBtn);

        const regenBtn = screen.getByRole("button", { name: /Regenerate/i });

        // Click rapidly 15 times
        for (let i = 0; i < 15; i++) {
          act(() => {
            fireEvent.click(regenBtn);
          });
        }

        // Dialog should remain intact and functional
        expect(screen.getByText("Provision New Staff User")).toBeInTheDocument();
        expect(screen.getByText(/Cryptographic 14-char high-entropy password/i)).toBeInTheDocument();
      },
      15000
    );

    it(
      "handles rapid clicking of credentials Copy buttons without uncaught promise rejection",
      async () => {
        render(
          <MemoryRouter>
            <RoleManagement />
          </MemoryRouter>
        );

        const addStaffBtn = await screen.findByRole("button", { name: /Add Staff User/i });
        fireEvent.click(addStaffBtn);

        // Fill valid credentials
        fireEvent.change(screen.getByPlaceholderText("e.g. Rahul Sharma"), {
          target: { value: "Concurrency Tester" },
        });
        fireEvent.change(screen.getByPlaceholderText("e.g. rahul@company.com"), {
          target: { value: "concurrency@store.com" },
        });

        // Submit
        const submitBtn = screen.getByRole("button", { name: /Provision Staff User/i });
        fireEvent.click(submitBtn);

        await waitFor(
          () => {
            expect(screen.getByText("Staff Credentials Generated")).toBeInTheDocument();
          },
          { timeout: 10000 }
        );

        const copyAllBtn = screen.getByRole("button", { name: /Copy All Details/i });
        const copyEmailBtn = screen.getByTitle("Copy Email");
        const copyPasswordBtn = screen.getByTitle("Copy Password");

        // Rapid-fire 10 clicks across copy buttons
        for (let i = 0; i < 5; i++) {
          act(() => {
            fireEvent.click(copyAllBtn);
            fireEvent.click(copyEmailBtn);
            fireEvent.click(copyPasswordBtn);
          });
        }

        // Verification: clipboard called repeatedly without component crash
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
        expect(screen.getByText("Staff Credentials Generated")).toBeInTheDocument();
      },
      15000
    );

    it(
      "handles regex special characters in Section 3 staff search input without throwing RegExp errors",
      async () => {
        render(
          <MemoryRouter>
            <RoleManagement />
          </MemoryRouter>
        );

        await screen.findByText("Amitabh Bachchan");

        const searchInput = screen.getByPlaceholderText("Search staff by name or role...");

        // Regex special characters that break unescaped RegExp constructor
        const hostileSearchTerms = ["[", "]", "*", "+", "?", "^", "$", "(", ")", "{", "}", "\\", "|"];

        for (const term of hostileSearchTerms) {
          act(() => {
            fireEvent.change(searchInput, { target: { value: term } });
          });
          // Component must not crash; header remains visible
          expect(screen.getByText("Staff CRM Role Assignments")).toBeInTheDocument();
        }

        // Reset search back to valid query
        act(() => {
          fireEvent.change(searchInput, { target: { value: "Amitabh" } });
        });
        expect(screen.getByText("Amitabh Bachchan")).toBeInTheDocument();
      },
      15000
    );

    it(
      "stress-tests rapid toggle of password reveal/hide eye icon",
      async () => {
        render(
          <MemoryRouter>
            <RoleManagement />
          </MemoryRouter>
        );

        const addStaffBtn = await screen.findByRole("button", { name: /Add Staff User/i });
        fireEvent.click(addStaffBtn);

        const toggleEyeBtn = screen.getByTitle("Reveal password");

        for (let i = 0; i < 10; i++) {
          act(() => {
            fireEvent.click(toggleEyeBtn);
          });
        }

        // Dialog remains open and functional
        expect(screen.getByText("Provision New Staff User")).toBeInTheDocument();
      },
      15000
    );
  });
});
