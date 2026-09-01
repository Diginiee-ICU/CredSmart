import { createRoot } from "react-dom/client";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import React from "react";
import { toast } from "@/hooks/use-toast";
import { loadInvoiceSettings } from "@/utils/invoiceThemeLoader";
import {
  UnifiedInvoiceRenderer,
  UniversalDocType,
  InvoiceItemData,
} from "@/components/invoices/UnifiedInvoiceRenderer";

export interface ExactInvoicePayload {
  invoiceNumber: string;
  referenceNumber?: string;
  docType?: UniversalDocType;
  date?: string | Date;
  dueDate?: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  customerGstin?: string | null;
  partyBalance?: number | null;
  storeName?: string;
  storePhone?: string;
  storeEmail?: string;
  storeAddress?: string;
  storeGstin?: string;
  storePan?: string;
  storeLogoUrl?: string;
  isEstimate?: boolean;
  subtotal?: number;
  discountAmount?: number;
  discountLabel?: string;
  tax?: number;
  roundOff?: number;
  totalAmount: number;
  paymentMethod?: string;
  notes?: string;
  terms?: string;
  items: Array<{
    name: string;
    description?: string;
    hsn?: string;
    quantity: number;
    unit?: string;
    altUnit?: string;
    altQty?: number;
    altUnitConversion?: number;
    rate: number;
    total: number;
    taxRate?: number;
    batchNo?: string;
    expDate?: string;
    mrp?: number;
  }>;
}

/**
 * Downloads the exact styled invoice PDF that matches the preview modal.
 * Renders UnifiedInvoiceRenderer off-screen, captures with html2canvas, saves as PDF.
 */
export async function downloadExactInvoicePdf(payload: ExactInvoicePayload): Promise<void> {
  const toastId = "download-exact-invoice";
  toast({
    title: "⏳ Generating PDF…",
    description: "Preparing your invoice, please wait a moment.",
  });

  try {
    const settings = loadInvoiceSettings();

    const docType: UniversalDocType =
      payload.docType || (payload.isEstimate ? "quotation" : "sales_invoice");

    const subtotal = payload.subtotal ?? payload.totalAmount;
    const discountTotal = payload.discountAmount ?? 0;
    const tax = payload.tax ?? 0;
    const roundOff = payload.roundOff ?? 0;
    const taxableAmount = subtotal - discountTotal;
    const cgst = tax / 2;
    const sgst = tax / 2;

    const invoiceItems: InvoiceItemData[] = (payload.items || []).map((it) => ({
      name: it.name,
      description: it.description,
      hsn: it.hsn,
      qty: it.quantity,
      unit: it.unit,
      altUnit: it.altUnit,
      altQty: it.altQty,
      altUnitConversion: it.altUnitConversion,
      rate: it.rate,
      mrp: it.mrp ?? it.rate,
      taxRate: it.taxRate ?? 0,
      total: it.total,
      batchNo: it.batchNo,
      expDate: it.expDate,
    }));

    // Create off-screen container
    const container = document.createElement("div");
    container.style.cssText = [
      "position:fixed",
      "top:0",
      "left:-9999px",
      "width:794px",   // A4 pixel width at 96dpi
      "min-height:1123px",
      "background:#ffffff",
      "z-index:-1",
      "visibility:hidden",
      "pointer-events:none",
    ].join(";");
    document.body.appendChild(container);

    await new Promise<void>((resolve) => {
      const root = createRoot(container);
      root.render(
        React.createElement(UnifiedInvoiceRenderer, {
          docType,
          copyType: "ORIGINAL FOR RECIPIENT",
          invoiceNumber: payload.invoiceNumber,
          referenceNumber: payload.referenceNumber,
          date: payload.date || new Date(),
          dueDate: payload.dueDate,
          layout: "a4",
          settings,
          storeInfo: {
            name: payload.storeName,
            phone: payload.storePhone,
            email: payload.storeEmail,
            address: payload.storeAddress,
            gstin: payload.storeGstin,
            pan: payload.storePan,
            logoUrl: payload.storeLogoUrl,
          },
          partyInfo: {
            name: payload.customerName,
            phone: payload.customerPhone,
            email: payload.customerEmail,
            address: payload.customerAddress,
            gstin: payload.customerGstin,
            balance: payload.partyBalance,
            type: docType === "purchase_invoice" || docType === "debit_note" ? "supplier" : "customer",
          },
          items: invoiceItems,
          totals: {
            subtotal,
            discountTotal,
            discountLabel: payload.discountLabel,
            taxableAmount,
            cgst,
            sgst,
            taxTotal: tax,
            roundOff,
            grandTotal: payload.totalAmount,
            paidAmount: payload.paymentMethod === "Credit" ? 0 : payload.totalAmount,
            balanceDue: payload.paymentMethod === "Credit" ? payload.totalAmount : 0,
          },
          paymentMethod: payload.paymentMethod,
          notes: payload.notes,
          terms: payload.terms,
        } as any /* eslint-disable-line @typescript-eslint/no-explicit-any */) // eslint-disable-line @typescript-eslint/no-explicit-any
      );

      // Wait for React to paint the DOM
      setTimeout(() => {
        root.unmount();
        resolve();
      }, 800);
    });

    // Re-render for capture (after first render, re-add and capture)
    const captureContainer = document.createElement("div");
    captureContainer.style.cssText = [
      "position:fixed",
      "top:0",
      "left:-9999px",
      "width:794px",
      "min-height:1123px",
      "background:#ffffff",
      "z-index:-1",
      "pointer-events:none",
    ].join(";");
    document.body.appendChild(captureContainer);

    await new Promise<void>((resolve) => {
      const root2 = createRoot(captureContainer);
      root2.render(
        React.createElement(UnifiedInvoiceRenderer, {
          docType,
          copyType: "ORIGINAL FOR RECIPIENT",
          invoiceNumber: payload.invoiceNumber,
          referenceNumber: payload.referenceNumber,
          date: payload.date || new Date(),
          dueDate: payload.dueDate,
          layout: "a4",
          settings,
          storeInfo: {
            name: payload.storeName,
            phone: payload.storePhone,
            email: payload.storeEmail,
            address: payload.storeAddress,
            gstin: payload.storeGstin,
            pan: payload.storePan,
            logoUrl: payload.storeLogoUrl,
          },
          partyInfo: {
            name: payload.customerName,
            phone: payload.customerPhone,
            email: payload.customerEmail,
            address: payload.customerAddress,
            gstin: payload.customerGstin,
            balance: payload.partyBalance,
            type: docType === "purchase_invoice" || docType === "debit_note" ? "supplier" : "customer",
          },
          items: invoiceItems,
          totals: {
            subtotal,
            discountTotal,
            discountLabel: payload.discountLabel,
            taxableAmount,
            cgst,
            sgst,
            taxTotal: tax,
            roundOff,
            grandTotal: payload.totalAmount,
            paidAmount: payload.paymentMethod === "Credit" ? 0 : payload.totalAmount,
            balanceDue: payload.paymentMethod === "Credit" ? payload.totalAmount : 0,
          },
          paymentMethod: payload.paymentMethod,
          notes: payload.notes,
          terms: payload.terms,
        } as any /* eslint-disable-line @typescript-eslint/no-explicit-any */) // eslint-disable-line @typescript-eslint/no-explicit-any
      );

      setTimeout(async () => {
        try {
          const canvas = await html2canvas(captureContainer, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
            windowWidth: 794,
          });

          const imgData = canvas.toDataURL("image/png");
          const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
          });

          const imgWidth = 210;
          const pageHeight = 297;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          let heightLeft = imgHeight;
          let position = 0;

          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
          heightLeft -= pageHeight;

          while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
            heightLeft -= pageHeight;
          }

          const safeInvoiceNumber = (payload.invoiceNumber || "invoice").replace(/[/\\:*?"<>|]/g, "-");
          pdf.save(`Invoice-${safeInvoiceNumber}.pdf`);

          toast({
            title: "✅ Invoice Downloaded",
            description: `Invoice-${safeInvoiceNumber}.pdf saved successfully.`,
          });
        } catch (err) {
          console.error("PDF generation error:", err);
          toast({
            title: "Download Failed",
            description: "Could not generate PDF. Please try again.",
            variant: "destructive",
          });
        } finally {
          root2.unmount();
          resolve();
        }
      }, 1000);
    });

    // Cleanup
    if (container.parentNode) container.parentNode.removeChild(container);
    if (captureContainer.parentNode) captureContainer.parentNode.removeChild(captureContainer);

  } catch (err) {
    console.error("Exact invoice download failed:", err);
    toast({
      title: "Download Failed",
      description: "An unexpected error occurred while generating the PDF.",
      variant: "destructive",
    });
  }
}
