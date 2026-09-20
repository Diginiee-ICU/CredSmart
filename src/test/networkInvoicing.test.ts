import { describe, it, expect, beforeEach } from "vitest";
import { networkInvoicingService, normalizePhoneNumber } from "@/services/networkInvoicingService";
import { BusinessDocument } from "@/types/documents";
import { OrgData } from "@/hooks/useOrganization";
import { documentsService } from "@/services/documentsService";
import { getLocalCachedProducts, addOrUpdateLocalCachedProduct } from "@/services/stockService";

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

      // Verify that the item was auto-created in Person B's catalog and stock was incremented to 20
      expect(purchaseBill.items[0].productId).toBeDefined();
      expect(purchaseBill.items[0].productId).not.toBe("it-1"); // Should NOT be Person A's item ID

      const buyerCached = getLocalCachedProducts(buyerOrg.id);
      const autoCreatedItem = buyerCached.find((p) => p.name === "Tata Tea Gold 500g");
      expect(autoCreatedItem).toBeDefined();
      expect(autoCreatedItem?.stock).toBe(20);
      expect(autoCreatedItem?.id).toBe(purchaseBill.items[0].productId);
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

  describe("Sales Invoice Cancellation & Sync Engine", () => {
    it("synchronizes sales invoice cancellation to network invoice and removes it from buyer pending list", async () => {
      const salesDoc: BusinessDocument = {
        id: "sale_cancel_test_1",
        organizationId: sellerOrg.id,
        docType: "sales_invoice",
        documentNumber: "INV-2026-CANCEL",
        partyName: buyerOrg.name,
        partyPhone: buyerOrg.phone,
        partyGstin: buyerOrg.gstin,
        docDate: "2026-08-27",
        paymentMethod: "Credit",
        items: [
          {
            id: "item-c1",
            productName: "Organic Basmati Rice 5kg",
            quantity: 4,
            unit: "PCS",
            rate: 600,
            discountPercent: 0,
            discountAmount: 0,
            taxRate: 5,
            taxableAmount: 2400,
            cgstAmount: 60,
            sgstAmount: 60,
            igstAmount: 0,
            lineTotal: 2520,
          },
        ],
        subtotal: 2400,
        discountTotal: 0,
        taxableTotal: 2400,
        cgstTotal: 60,
        sgstTotal: 60,
        igstTotal: 0,
        taxTotal: 120,
        grandTotal: 2520,
        paidAmount: 0,
        balanceDue: 2520,
        status: "unpaid",
        created_at: new Date().toISOString(),
      };

      // 1. Dispatch to network
      const netInv = await networkInvoicingService.sendSalesInvoiceToNetwork(salesDoc, sellerOrg, "user_seller_1");
      expect(netInv).toBeDefined();

      // Buyer should have 1 pending invoice
      let pending = await networkInvoicingService.getPendingInvoicesForOrg(buyerOrg.id, buyerOrg.phone, buyerOrg.gstin);
      expect(pending.length).toBe(1);

      // 2. Seller cancels/deletes the sales invoice
      const cancelOk = await networkInvoicingService.cancelNetworkInvoice("INV-2026-CANCEL", sellerOrg.id);
      expect(cancelOk).toBe(true);

      // 3. Buyer's pending invoices should now be 0
      pending = await networkInvoicingService.getPendingInvoicesForOrg(buyerOrg.id, buyerOrg.phone, buyerOrg.gstin);
      expect(pending.length).toBe(0);

      // Network invoice status should be "cancelled"
      const allInvs = networkInvoicingService.getLocalInvoices();
      const cancelledInv = allInvs.find((i) => i.invoiceNumber === "INV-2026-CANCEL");
      expect(cancelledInv?.status).toBe("cancelled");
    }, 15000);

    it("verifies full item breakdown preservation from sales invoice into buyer purchase bill", async () => {
      const salesDoc: BusinessDocument = {
        id: "sale_sync_breakdown_1",
        organizationId: sellerOrg.id,
        docType: "sales_invoice",
        documentNumber: "INV-SYNC-007",
        partyName: buyerOrg.name,
        partyPhone: buyerOrg.phone,
        partyGstin: buyerOrg.gstin,
        docDate: "2026-08-27",
        paymentMethod: "Credit",
        items: [
          {
            id: "it-1",
            productName: "Refined Sunflower Oil 1L",
            barcode: "8901234567890",
            hsn: "1512",
            quantity: 12,
            unit: "PCS",
            rate: 140,
            discountPercent: 0,
            discountAmount: 0,
            taxRate: 5,
            taxableAmount: 1680,
            cgstAmount: 42,
            sgstAmount: 42,
            igstAmount: 0,
            lineTotal: 1764,
          },
          {
            id: "it-2",
            productName: "Organic Jaggery Powder 1kg",
            barcode: "8909876543210",
            hsn: "1701",
            quantity: 20,
            unit: "PCS",
            rate: 75,
            discountPercent: 10,
            discountAmount: 150,
            taxRate: 5,
            taxableAmount: 1350,
            cgstAmount: 33.75,
            sgstAmount: 33.75,
            igstAmount: 0,
            lineTotal: 1417.5,
          },
        ],
        subtotal: 3180,
        discountTotal: 150,
        taxableTotal: 3030,
        cgstTotal: 75.75,
        sgstTotal: 75.75,
        igstTotal: 0,
        taxTotal: 151.5,
        grandTotal: 3181.5,
        paidAmount: 0,
        balanceDue: 3181.5,
        status: "unpaid",
        created_at: new Date().toISOString(),
      };

      // 1. Send sales invoice to network
      const netInv = await networkInvoicingService.sendSalesInvoiceToNetwork(salesDoc, sellerOrg, "user_seller_1");
      expect(netInv).toBeDefined();
      expect(netInv!.items.length).toBe(2);

      // 2. Buyer approves invoice
      const approveResult = await networkInvoicingService.approveNetworkInvoice(
        netInv!.id,
        buyerOrg,
        "user_buyer_1"
      );

      expect(approveResult.success).toBe(true);
      expect(approveResult.purchaseDoc).toBeDefined();

      const purchaseDoc = approveResult.purchaseDoc!;
      // Verify line items are fully intact
      expect(purchaseDoc.items.length).toBe(2);
      expect(purchaseDoc.items[0].productName).toBe("Refined Sunflower Oil 1L");
      expect(purchaseDoc.items[0].quantity).toBe(12);
      expect(purchaseDoc.items[0].rate).toBe(140);
      expect(purchaseDoc.items[1].productName).toBe("Organic Jaggery Powder 1kg");
      expect(purchaseDoc.items[1].quantity).toBe(20);
      expect(purchaseDoc.items[1].rate).toBe(75);
      expect(purchaseDoc.grandTotal).toBe(3181.5);

      // Verify reference to seller's sales invoice
      expect(purchaseDoc.referenceNumber).toBe("INV-SYNC-007");

      // Verify buyer's local purchase documents list has the document with items
      const buyerPurchases = documentsService.getLocalDocuments(buyerOrg.id, "purchase_invoice");
      expect(buyerPurchases.length).toBeGreaterThan(0);
      const savedDoc = buyerPurchases.find((d) => d.documentNumber === purchaseDoc.documentNumber);
      expect(savedDoc?.items.length).toBe(2);
    }, 15000);
  });

  describe("Real-Time Business Alerts & Store Radar Engine", () => {
    it("dynamically generates low stock alerts for inventory items below safety limit", () => {
      addOrUpdateLocalCachedProduct(buyerOrg.id, {
        id: "prod_low_stock_1",
        name: "Amul Butter 500g",
        barcode: "8901262010053",
        unit: "PCS",
        sellingPrice: 275,
        purchasePrice: 250,
        mrp: 285,
        currentStock: 2, // Less than safety limit of 5
        stock: 2,
        tags: { min_stock_alert: 5 },
      });

      const alerts = networkInvoicingService.getRealtimeBusinessAlerts(buyerOrg.id);
      expect(alerts.length).toBeGreaterThan(0);
      const lowStockAlert = alerts.find((a) => a.type === "low_stock_alert");
      expect(lowStockAlert).toBeDefined();
      expect(lowStockAlert?.category).toBe("inventory");
      expect(lowStockAlert?.title).toContain("Amul Butter 500g");
      expect(lowStockAlert?.actionUrl).toBe("/items");
    });

    it("dynamically generates payment overdue alerts for unpaid customer invoices past due date", async () => {
      const overdueInvoice: BusinessDocument = {
        id: "sale_overdue_1",
        organizationId: sellerOrg.id,
        docType: "sales_invoice",
        documentNumber: "INV-OVERDUE-01",
        partyName: "Rahul Sharma Retail Store",
        partyPhone: "9876500000",
        docDate: "2026-08-01",
        dueDate: "2026-08-10", // Past due
        paymentMethod: "Credit",
        items: [
          {
            id: "it-ov1",
            productName: "Wheat Flour",
            quantity: 10,
            unit: "PCS",
            rate: 400,
            taxRate: 0,
            taxableAmount: 4000,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 0,
            lineTotal: 4000,
          },
        ],
        subtotal: 4000,
        discountTotal: 0,
        taxableTotal: 4000,
        cgstTotal: 0,
        sgstTotal: 0,
        igstTotal: 0,
        taxTotal: 0,
        grandTotal: 4000,
        paidAmount: 1000,
        balanceDue: 3000,
        status: "partial",
        created_at: "2026-08-01T10:00:00.000Z",
      };

      await documentsService.saveDocument(overdueInvoice);

      const alerts = networkInvoicingService.getRealtimeBusinessAlerts(sellerOrg.id);
      const paymentAlert = alerts.find((a) => a.type === "payment_due_alert");
      expect(paymentAlert).toBeDefined();
      expect(paymentAlert?.category).toBe("payments");
      expect(paymentAlert?.title).toContain("Rahul Sharma Retail Store");
      expect(paymentAlert?.message).toContain("INV-OVERDUE-01");
      expect(paymentAlert?.actionUrl).toBe("/parties");
    });

    it("dynamically generates compliance alerts for high-value invoices without E-Way details", async () => {
      const highValueInvoice: BusinessDocument = {
        id: "sale_high_val_1",
        organizationId: sellerOrg.id,
        docType: "sales_invoice",
        documentNumber: "INV-HIGH-VAL-99",
        partyName: "Big Mart Mega Store",
        partyPhone: "9876511111",
        docDate: "2026-08-27",
        paymentMethod: "Credit",
        items: [
          {
            id: "it-hv1",
            productName: "Bulk Grain Consignment",
            quantity: 100,
            unit: "PCS",
            rate: 600,
            taxRate: 5,
            taxableAmount: 60000,
            cgstAmount: 1500,
            sgstAmount: 1500,
            igstAmount: 0,
            lineTotal: 63000,
          },
        ],
        subtotal: 60000,
        discountTotal: 0,
        taxableTotal: 60000,
        cgstTotal: 1500,
        sgstTotal: 1500,
        igstTotal: 0,
        taxTotal: 3000,
        grandTotal: 63000,
        paidAmount: 0,
        balanceDue: 63000,
        status: "unpaid",
        created_at: new Date().toISOString(),
      };

      await documentsService.saveDocument(highValueInvoice);

      const alerts = networkInvoicingService.getRealtimeBusinessAlerts(sellerOrg.id);
      const complianceAlert = alerts.find((a) => a.type === "compliance_alert");
      expect(complianceAlert).toBeDefined();
      expect(complianceAlert?.category).toBe("compliance");
      expect(complianceAlert?.title).toContain("INV-HIGH-VAL-99");
      expect(complianceAlert?.actionUrl).toBe("/e-invoicing");
    });
  });
});
