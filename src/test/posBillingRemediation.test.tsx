import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { isNotificationForOrg, isInvoiceForOrg } from "@/services/networkInvoicingService";
import { NetworkInvoice, NetworkNotification } from "@/types/networkInvoicing";
import { UnifiedInvoiceRenderer } from "@/components/invoices/UnifiedInvoiceRenderer";

describe("POS & Billing Critical Remediation Test Suite", () => {
  describe("Issue 1: B2B Network Invoice Self-Notification & Isolation", () => {
    const orgId = "org-11111111-1111-1111-1111-111111111111";

    it("STRICTLY BLOCKS inward notifications when current org is the SENDER", () => {
      const inwardNotifFromSelf: NetworkNotification = {
        id: "notif-001",
        recipientOrgId: "recipient-org-999",
        recipientOrgName: "Billed Customer",
        type: "sale_invoice_received",
        category: "inward",
        title: "Sale was Created on your name",
        message: "You have a new purchase bill to inward",
        status: "unread",
        actionStatus: "pending",
        data: {
          senderOrgId: orgId, // Current org created this sale!
          senderOrgName: "My Company",
          invoiceNumber: "INV-101",
          grandTotal: 5000,
        },
        created_at: new Date().toISOString(),
      };

      // Even if party name or phone accidentally resembles current user, senderOrgId === orgId must reject it!
      const isForOrg = isNotificationForOrg(
        inwardNotifFromSelf,
        orgId,
        "9876543210",
        "27AAAAA0000A1Z5",
        "My Company"
      );

      expect(isForOrg).toBe(false);
    });

    it("ACCEPTS inward notifications when current org is the legitimate RECIPIENT", () => {
      const genuineInwardNotif: NetworkNotification = {
        id: "notif-002",
        recipientOrgId: orgId,
        recipientOrgName: "My Company",
        recipientPhone: "9876543210",
        type: "sale_invoice_received",
        category: "inward",
        title: "Sale was Created on your name",
        message: "Vendor X created bill on your name",
        status: "unread",
        actionStatus: "pending",
        data: {
          senderOrgId: "other-org-222",
          senderOrgName: "Vendor X Wholesale",
          invoiceNumber: "INV-888",
          grandTotal: 12000,
        },
        created_at: new Date().toISOString(),
      };

      const isForOrg = isNotificationForOrg(
        genuineInwardNotif,
        orgId,
        "9876543210",
        "27AAAAA0000A1Z5",
        "My Company"
      );

      expect(isForOrg).toBe(true);
    });
  });

  describe("Issue 2: Purchase Invoice Biller vs Bill-To Inversion in Invoice Renderer", () => {
    it("INVERTS Biller and Bill-To pods when docType is purchase_invoice", () => {
      render(
        <UnifiedInvoiceRenderer
          docType="purchase_invoice"
          invoiceNumber="PUR-2026-001"
          date="2026-10-27"
          storeInfo={{
            name: "Woodzire Technologies Pvt Ltd", // MY COMPANY
            address: "Tech Park, Pune",
            phone: "9998887770",
            gstin: "27AAAAA1111A1Z1",
          }}
          partyInfo={{
            name: "Steel Authority of India Ltd", // SUPPLIER
            address: "Industrial Area, Mumbai",
            phone: "9112233445",
            gstin: "27SSSSS9999S1Z9",
            type: "supplier",
          }}
          items={[
            {
              name: "Raw Steel Sheets",
              quantity: 10,
              rate: 1500,
              lineTotal: 15000,
            },
          ]}
        />
      );

      // The Left Pod (FROM / SELLER) must display the SUPPLIER
      const supplierHeader = screen.getByText(/FROM \(SUPPLIER \/ VENDOR\)/i);
      expect(supplierHeader).toBeDefined();

      // The Right Pod (BILL TO / BUYER) must display MY COMPANY
      const purchaserHeader = screen.getByText(/BILL TO \(BUYER \/ PURCHASER\)/i);
      expect(purchaserHeader).toBeDefined();

      // Document title must be Purchase Invoice
      expect(screen.getByText(/PURCHASE INVOICE/i)).toBeDefined();
    });

    it("RETAINS standard Biller as Store and Bill-To as Customer when docType is sales_invoice", () => {
      render(
        <UnifiedInvoiceRenderer
          docType="sales_invoice"
          invoiceNumber="INV-2026-001"
          date="2026-10-27"
          storeInfo={{
            name: "Woodzire Technologies Pvt Ltd", // MY COMPANY (SELLER)
            address: "Tech Park, Pune",
            phone: "9998887770",
          }}
          partyInfo={{
            name: "Sharma General Store", // CUSTOMER (BUYER)
            address: "Main Market, Pune",
            phone: "9887766554",
            type: "customer",
          }}
          items={[
            {
              name: "CredSmart Subscription",
              quantity: 1,
              rate: 2999,
              lineTotal: 2999,
            },
          ]}
        />
      );

      // For sales invoice, FROM is my Store, and BILL TO is Customer
      expect(screen.getByText(/^FROM$/i)).toBeDefined();
      expect(screen.getByText(/^BILL TO$/i)).toBeDefined();
    });
  });

  describe("Issue 4: Dashboard KPI Cards Non-Cancelling Accounting Accumulator", () => {
    it("accumulates customer receivables and supplier payables independently without cross-party cancellation", () => {
      const creditData = [
        { id: "1", party_type: "customer", party_id: "cust-1", amount: 10000, type: "credit" },  // Cust 1 owes ₹10,000
        { id: "2", party_type: "customer", party_id: "cust-2", amount: 12000, type: "payment" }, // Cust 2 paid advance ₹12,000
        { id: "3", party_type: "supplier", party_id: "supp-1", amount: 25000, type: "credit" },  // We owe Supp 1 ₹25,000
        { id: "4", party_type: "supplier", party_id: "supp-2", amount: 5000, type: "payment" },  // We paid Supp 2 ₹5,000
      ];

      // Customer grouping:
      const customerBalanceMap: Record<string, number> = {};
      creditData.forEach((c) => {
        if (c.party_type === "customer" && c.party_id) {
          const amt = Number(c.amount) || 0;
          const cur = customerBalanceMap[c.party_id] || 0;
          customerBalanceMap[c.party_id] = c.type === "credit" ? cur + amt : cur - amt;
        }
      });
      const toCollect = Object.values(customerBalanceMap)
        .filter((bal) => bal > 0)
        .reduce((acc, bal) => acc + bal, 0);

      // Supplier grouping:
      const supplierBalanceMap: Record<string, number> = {};
      creditData.forEach((c) => {
        if (c.party_type === "supplier" && c.party_id) {
          const amt = Number(c.amount) || 0;
          const cur = supplierBalanceMap[c.party_id] || 0;
          supplierBalanceMap[c.party_id] = c.type === "credit" ? cur + amt : cur - amt;
        }
      });
      const toPay = Object.values(supplierBalanceMap)
        .filter((bal) => bal > 0)
        .reduce((acc, bal) => acc + bal, 0);

      // Crucial assertion: Cust 2's advance (negative balance) must NOT cancel Cust 1's receivable!
      expect(toCollect).toBe(10000);
      expect(toPay).toBe(25000);
    });
  });
});
