import { describe, it, expect } from "vitest";
import { isRouteAllowedForRole, ROUTE_PATHS } from "@/config/routes";
import { isValidGSTIN, isValidPAN } from "@/utils/gstinLookup";
import { performFullLedgerReconciliation } from "@/utils/ledgerReconciliation";
import { Party } from "@/types/parties";

describe("CredSmart Core Engine & Security Suite", () => {
  describe("Role-Based Access Control (RBAC)", () => {
    it("allows full access to store_owner and admin roles", () => {
      expect(isRouteAllowedForRole(ROUTE_PATHS.dashboard, "store_owner")).toBe(true);
      expect(isRouteAllowedForRole(ROUTE_PATHS.reports, "admin")).toBe(true);
      expect(isRouteAllowedForRole(ROUTE_PATHS.settings, "super_admin")).toBe(true);
      expect(isRouteAllowedForRole(ROUTE_PATHS.staff, "partner")).toBe(true);
      expect(isRouteAllowedForRole(ROUTE_PATHS.pos, "store_owner")).toBe(true);
    });

    it("restricts cashier role from financial reports and business settings", () => {
      expect(isRouteAllowedForRole(ROUTE_PATHS.pos, "cashier")).toBe(true);
      expect(isRouteAllowedForRole(ROUTE_PATHS.checkout, "cashier")).toBe(true);
      expect(isRouteAllowedForRole(ROUTE_PATHS.items, "cashier")).toBe(true);
      expect(isRouteAllowedForRole(ROUTE_PATHS.sales, "cashier")).toBe(true);

      // Restricted routes
      expect(isRouteAllowedForRole(ROUTE_PATHS.reports, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.settings, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.activityLog, "cashier")).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.staff, "cashier")).toBe(false);
    });

    it("allows stock_manager access to inventory, godown, and items only", () => {
      expect(isRouteAllowedForRole(ROUTE_PATHS.items, "stock_manager")).toBe(true);
      expect(isRouteAllowedForRole(ROUTE_PATHS.inventory, "stock_manager")).toBe(true);
      expect(isRouteAllowedForRole(ROUTE_PATHS.godown, "stock_manager")).toBe(true);
      expect(isRouteAllowedForRole(ROUTE_PATHS.barcode, "stock_manager")).toBe(true);
      expect(isRouteAllowedForRole(ROUTE_PATHS.reports, "stock_manager")).toBe(false);
    });

    it("returns false for null or undefined roles", () => {
      expect(isRouteAllowedForRole(ROUTE_PATHS.dashboard, null)).toBe(false);
      expect(isRouteAllowedForRole(ROUTE_PATHS.pos, undefined)).toBe(false);
    });
  });

  describe("GSTIN & PAN Statutory Validation", () => {
    it("correctly validates compliant 15-character Indian GSTINs", () => {
      expect(isValidGSTIN("27AAPFU0939F1ZV")).toBe(true);
      expect(isValidGSTIN("29ABCDE1234F2Z5")).toBe(true);
      expect(isValidGSTIN("07AAAAA0000A1Z5")).toBe(true);
    });

    it("rejects invalid GSTIN strings", () => {
      expect(isValidGSTIN("")).toBe(false);
      expect(isValidGSTIN("12345")).toBe(false);
      expect(isValidGSTIN("INVALID_GSTIN_123")).toBe(false);
      expect(isValidGSTIN("27AAPFU0939F1Z")).toBe(false); // 14 chars
    });

    it("correctly validates compliant 10-character Indian PANs", () => {
      expect(isValidPAN("AAPFU0939F")).toBe(true);
      expect(isValidPAN("ABCDE1234F")).toBe(true);
    });

    it("rejects invalid PAN strings", () => {
      expect(isValidPAN("")).toBe(false);
      expect(isValidPAN("1234567890")).toBe(false);
      expect(isValidPAN("AAPFU0939FZ")).toBe(false); // 11 chars
    });
  });

  describe("Ledger Reconciliation & Integrity Score Engine", () => {
    it("evaluates balanced customer ledgers with high integrity score", () => {
      const sampleParty: Party = {
        id: "party-001",
        name: "Acme Retailers",
        partyType: "customer",
        balance: 5000,
        phone: "9876543210",
        created_at: new Date().toISOString(),
      };

      const sampleTransactions = [
        {
          id: "tx-001",
          party_id: "party-001",
          party_type: "customer",
          amount: 5000,
          type: "credit",
          created_at: new Date().toISOString(),
        },
      ];

      const audit = performFullLedgerReconciliation({
        orgId: "org-001",
        orgName: "CredSmart Superstore",
        parties: [sampleParty],
        creditTransactions: sampleTransactions,
      });

      expect(audit).toBeDefined();
      expect(audit.integrityScore).toBeGreaterThanOrEqual(95);
      expect(audit.integrityStatus).toBe("perfect");
      expect(audit.reconciledPartiesCount).toBe(1);
      expect(audit.discrepantPartiesCount).toBe(0);
      expect(audit.allDiscrepancies.length).toBe(0);
      expect(audit.totalReceivables).toBe(5000);
    });

    it("detects balance mismatch when recorded balance differs from transaction sum", () => {
      const sampleParty: Party = {
        id: "party-002",
        name: "Mismatched Customer",
        partyType: "customer",
        balance: 10000, // Recorded
        phone: "9876543210",
        created_at: new Date().toISOString(),
      };

      const sampleTransactions = [
        {
          id: "tx-002",
          party_id: "party-002",
          party_type: "customer",
          amount: 2000, // Only 2000 in transactions
          type: "credit",
          created_at: new Date().toISOString(),
        },
      ];

      const audit = performFullLedgerReconciliation({
        orgId: "org-001",
        orgName: "CredSmart Superstore",
        parties: [sampleParty],
        creditTransactions: sampleTransactions,
      });

      expect(audit).toBeDefined();
      expect(audit.discrepantPartiesCount).toBe(1);
      expect(audit.allDiscrepancies.length).toBeGreaterThan(0);
      expect(audit.allDiscrepancies.some((d) => d.type === "balance_mismatch")).toBe(true);
    });
  });
});
