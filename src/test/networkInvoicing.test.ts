import { describe, it, expect, beforeEach } from "vitest";
import { networkInvoicingService, normalizePhoneNumber } from "@/services/networkInvoicingService";
import { BusinessDocument } from "@/types/documents";
import { OrgData } from "@/hooks/useOrganization";
import { documentsService } from "@/services/documentsService";

describe("B2B Network Invoicing & Auto-Purchase Sync Engine", () => {
  const sellerOrg: OrgData = {
    id: "org_seller_person_a",
    name: "Person A Wholesale Supplies",
    phone: "9876543210",
    email: "seller@person-a.in",
    gstin: "27AAAAA1234A1Z5",
    address: "Market Yard, Pune, Maharashtra",
    invoice_prefix: "INV",
    logo_url: "",
    tax_rate: 18,
    business_type: "Wholesaler",
  };

  const buyerOrg: OrgData = {
    id: "org_buyer_person_b",
    name: "Person B Supermarket",
    phone: "9123456789",
    email: "buyer@person-b.in",
    gstin: "27BBBBB5678B1Z2",
    address: "Main Road, Mumbai, Maharashtra",
    invoice_prefix: "INV",
    logo_url: "",
    tax_rate: 18,
    business_type: "Retailer",
  };

  beforeEach(() => {
    localStorage.clear();
    networkInvoicingService.registerConnectedOrg(sellerOrg);
    networkInvoicingService.registerConnectedOrg(buyerOrg);
  });

  describe("Phone Number Normalization & Discovery", () => {
    it("correctly normalizes 10-digit Indian phone numbers with country codes and spaces", () => {
      expect(normalizePhoneNumber("+91 98765 43210")).toBe("9876543210");
      expect(normalizePhoneNumber("09876543210")).toBe("9876543210");
      expect(normalizePhoneNumber("98765-43210")).toBe("9876543210");
      expect(normalizePhoneNumber("")).toBe("");
      expect(normalizePhoneNumber(undefined)).toBe("");
    });
  });

  describe("Sales Invoice Dispatch to Network", () => {
    it("creates a network invoice and a notification for Person B when Person A creates a sales invoice", async () => {
      const salesDoc: BusinessDocument = {
        id: "sale_doc_101",
        organizationId: sellerOrg.id,
        docType: "sales_invoice",
        documentNumber: "INV-2026-001",
        partyName: buyerOrg.name,
        partyPhone: buyerOrg.phone,
        partyGstin: buyerOrg.gstin,
        partyAddress: buyerOrg.address,
        docDate: "2026-08-27",
        paymentMethod: "Credit",
        items: [
          {
            id: "item-1",
            productName: "Premium Organic Wheat Flour 10kg",
            hsn: "1101",
            quantity: 5,
            unit: "PCS",
            rate: 420,
            discountPercent: 0,
            discountAmount: 0,
            taxRate: 5,
            taxableAmount: 2100,
            cgstAmount: 52.5,
            sgstAmount: 52.5,
            igstAmount: 0,
            lineTotal: 2205,
          },
          {
            id: "item-2",
            productName: "Pure Cow Ghee 1L Tin",
            hsn: "0405",
            quantity: 10,
            unit: "PCS",
            rate: 650,
            discountPercent: 5,
            discountAmount: 325,
            taxRate: 12,
            taxableAmount: 6175,
            cgstAmount: 370.5,
            sgstAmount: 370.5,
            igstAmount: 0,
            lineTotal: 6916,
          },
        ],
        subtotal: 8600,
        discountTotal: 325,
        taxableTotal: 8275,
        cgstTotal: 423,
        sgstTotal: 423,
        igstTotal: 0,
        taxTotal: 846,
        roundOff: 0,
        grandTotal: 9121,
        paidAmount: 0,
        balanceDue: 9121,
        status: "unpaid",
        created_at: "2026-08-27T10:00:00.000Z",
      };

      const networkInvoice = await networkInvoicingService.sendSalesInvoiceToNetwork(
        salesDoc,
        sellerOrg,
        "user_person_a_123"
      );

      expect(networkInvoice).not.toBeNull();
      expect(networkInvoice?.senderOrgName).toBe("Person A Wholesale Supplies");
      expect(networkInvoice?.recipientOrgName).toBe("Person B Supermarket");
      expect(networkInvoice?.invoiceNumber).toBe("INV-2026-001");
      expect(networkInvoice?.grandTotal).toBe(9121);
      expect(networkInvoice?.status).toBe("pending");
      expect(networkInvoice?.items.length).toBe(2);

      // Verify Person B receives the notification
      const pendingForB = await networkInvoicingService.getPendingInvoicesForOrg(
        buyerOrg.id,
        buyerOrg.phone,
        buyerOrg.gstin
      );
      expect(pendingForB.length).toBe(1);
      expect(pendingForB[0].invoiceNumber).toBe("INV-2026-001");

      const notifsForB = await networkInvoicingService.getNotificationsForOrg(
        buyerOrg.id,
        buyerOrg.phone,
        buyerOrg.gstin
      );
      expect(notifsForB.length).toBe(1);
      expect(notifsForB[0].title).toContain("Sale was Created by Person A Wholesale Supplies on your name");
      expect(notifsForB[0].actionStatus).toBe("pending");
    });
  });

  describe("Invoice Approval & Auto-Purchase Inward Creation", () => {
    it("transforms Sales Invoice into Purchase Invoice in Person B's Purchases upon approval", async () => {
      // 1. Seller Person A creates sales invoice
      const salesDoc: BusinessDocument = {
        id: "sale_doc_202",
        organizationId: sellerOrg.id,
        docType: "sales_invoice",
        documentNumber: "INV-2026-042",
        partyName: buyerOrg.name,
        partyPhone: buyerOrg.phone,
        partyGstin: buyerOrg.gstin,
        partyAddress: buyerOrg.address,
        docDate: "2026-08-27",
        paymentMethod: "Credit",
        items: [
          {
            id: "it-1",
            productName: "Tata Tea Gold 500g",
            hsn: "0902",
            quantity: 20,
            unit: "PCS",
            rate: 280,
            discountPercent: 0,
            discountAmount: 0,
            taxRate: 5,
            taxableAmount: 5600,
            cgstAmount: 140,
            sgstAmount: 140,
            igstAmount: 0,
            lineTotal: 5880,
          },
        ],
        subtotal: 5600,
        discountTotal: 0,
        taxableTotal: 5600,
        cgstTotal: 140,
        sgstTotal: 140,
        igstTotal: 0,
        taxTotal: 280,
        roundOff: 0,
        grandTotal: 5880,
        paidAmount: 0,
        balanceDue: 5880,
        status: "unpaid",
        created_at: "2026-08-27T11:00:00.000Z",
      };

      const networkInvoice = await networkInvoicingService.sendSalesInvoiceToNetwork(
        salesDoc,
        sellerOrg,
        "user_person_a_123"
      );
      expect(networkInvoice).not.toBeNull();

      // 2. Person B approves the invoice
      const approvalResult = await networkInvoicingService.approveNetworkInvoice(
        networkInvoice!.id,
        buyerOrg,
        "user_person_b_456"
      );

      expect(approvalResult.success).toBe(true);
      expect(approvalResult.purchaseDoc).toBeDefined();

      const purchaseBill = approvalResult.purchaseDoc!;
      expect(purchaseBill.docType).toBe("purchase_invoice");
      expect(purchaseBill.organizationId).toBe(buyerOrg.id);
      expect(purchaseBill.partyName).toBe("Person A Wholesale Supplies");
      expect(purchaseBill.referenceNumber).toBe("INV-2026-042");
      expect(purchaseBill.grandTotal).toBe(5880);
      expect(purchaseBill.items.length).toBe(1);
      expect(purchaseBill.items[0].productName).toBe("Tata Tea Gold 500g");
      expect(purchaseBill.items[0].rate).toBe(280); // Cost price for buyer
      expect(purchaseBill.items[0].quantity).toBe(20);

      // Verify network invoice status is updated to approved
      const updatedInvoices = networkInvoicingService.getLocalInvoices();
      const updated = updatedInvoices.find((i) => i.id === networkInvoice!.id);
      expect(updated?.status).toBe("approved");
      expect(updated?.purchaseInvoiceNumber).toBe(purchaseBill.documentNumber);

      // Verify Person B has zero pending invoices remaining
      const pendingAfter = await networkInvoicingService.getPendingInvoicesForOrg(
        buyerOrg.id,
        buyerOrg.phone,
        buyerOrg.gstin
      );
      expect(pendingAfter.length).toBe(0);

      // Verify the Purchase Invoice appears in Person B's Purchases documents list
      const buyerPurchases = documentsService.getLocalDocuments(buyerOrg.id, "purchase_invoice");
      expect(buyerPurchases.length).toBe(1);
      expect(buyerPurchases[0].partyName).toBe("Person A Wholesale Supplies");
      expect(buyerPurchases[0].grandTotal).toBe(5880);
    }, 15000);
  });

  describe("Invoice Rejection Flow", () => {
    it("marks invoice as rejected and notifies Person A without creating a purchase bill", async () => {
      const salesDoc: BusinessDocument = {
        id: "sale_doc_303",
        organizationId: sellerOrg.id,
        docType: "sales_invoice",
        documentNumber: "INV-2026-099",
        partyName: buyerOrg.name,
        partyPhone: buyerOrg.phone,
        partyGstin: buyerOrg.gstin,
        docDate: "2026-08-27",
        items: [
          {
            id: "it-reject",
            productName: "Disputed Item",
            quantity: 1,
            unit: "PCS",
            rate: 1000,
            discountPercent: 0,
            discountAmount: 0,
            taxRate: 0,
            taxableAmount: 1000,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 0,
            lineTotal: 1000,
          },
        ],
        subtotal: 1000,
        discountTotal: 0,
        taxableTotal: 1000,
        cgstTotal: 0,
        sgstTotal: 0,
        igstTotal: 0,
        taxTotal: 0,
        roundOff: 0,
        grandTotal: 1000,
        paidAmount: 0,
        balanceDue: 1000,
        status: "unpaid",
        created_at: "2026-08-27T12:00:00.000Z",
      };

      const networkInvoice = await networkInvoicingService.sendSalesInvoiceToNetwork(
        salesDoc,
        sellerOrg,
        "user_person_a_123"
      );

      // Person B rejects with reason
      const rejectResult = await networkInvoicingService.rejectNetworkInvoice(
        networkInvoice!.id,
        buyerOrg,
        "Rate mismatch with purchase order"
      );

      expect(rejectResult.success).toBe(true);

      const allInvoices = networkInvoicingService.getLocalInvoices();
      const rejected = allInvoices.find((i) => i.id === networkInvoice!.id);
      expect(rejected?.status).toBe("rejected");
      expect(rejected?.rejectionReason).toBe("Rate mismatch with purchase order");

      // Verify no purchase bill was created for Person B
      const buyerPurchases = documentsService.getLocalDocuments(buyerOrg.id, "purchase_invoice");
      expect(buyerPurchases.length).toBe(0);

      // Verify Person A received the rejection notification
      const notifsForA = await networkInvoicingService.getNotificationsForOrg(sellerOrg.id);
      expect(notifsForA.some((n) => n.type === "sale_invoice_rejected")).toBe(true);
    });
  });

  describe("Partner Simulation Utility", () => {
    it("creates a simulated partner invoice ready for instant testing", async () => {
      const simInvoice = await networkInvoicingService.simulatePartnerInvoice(buyerOrg);

      expect(simInvoice).toBeDefined();
      expect(simInvoice.status).toBe("pending");
      expect(simInvoice.recipientOrgId).toBe(buyerOrg.id);
      expect(simInvoice.items.length).toBeGreaterThan(0);

      const pending = await networkInvoicingService.getPendingInvoicesForOrg(buyerOrg.id);
      expect(pending.length).toBe(1);
      expect(pending[0].id).toBe(simInvoice.id);
    });
  });
});
