import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "@/hooks/use-toast";

export interface InvoiceSharePayload {
  invoiceNumber: string;
  customerName?: string;
  customerPhone?: string;
  storeName?: string;
  storePhone?: string;
  totalAmount: number;
  date?: string;
  isEstimate?: boolean;
  elementId?: string; // Optional element to capture as canvas
  customElement?: HTMLElement | null;
  items?: Array<{
    name: string;
    quantity: number;
    rate: number;
    total: number;
  }>;
}

/**
 * Generates a clean PDF Blob from an invoice element or data
 */
export async function generateInvoicePdfBlob(payload: InvoiceSharePayload): Promise<Blob> {
  const targetElement =
    payload.customElement ||
    (payload.elementId ? document.getElementById(payload.elementId) : null) ||
    document.getElementById("printable-invoice") ||
    document.getElementById("receipt-printable-area") ||
    (document.querySelector(".printable-invoice-container") as HTMLElement | null);

  if (targetElement) {
    try {
      const canvas = await html2canvas(targetElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: targetElement.scrollWidth || 800,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
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

      return pdf.output("blob");
    } catch (e) {
      console.warn("Canvas capture failed, falling back to programmatic PDF generation", e);
    }
  }

  // Fallback: Programmatic Vector PDF Generation using jsPDF
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const cleanStore = payload.storeName || "CredSmart Business";
  const cleanCustomer = payload.customerName || "Valued Customer";
  const docTitle = payload.isEstimate ? "ESTIMATE / QUOTATION" : "TAX INVOICE";

  // Header Box
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(cleanStore, 14, 12);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(docTitle, 14, 19);
  doc.text(`Invoice #: ${payload.invoiceNumber} | Date: ${payload.date || new Date().toLocaleDateString("en-IN")}`, 14, 24);

  // Customer Section
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Billed To:", 14, 38);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(cleanCustomer, 14, 44);
  if (payload.customerPhone) {
    doc.text(`Phone: ${payload.customerPhone}`, 14, 49);
  }

  // Items Table Header
  const startY = payload.customerPhone ? 58 : 52;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, startY, 182, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text("Item / Description", 18, startY + 5.5);
  doc.text("Qty", 120, startY + 5.5, { align: "right" });
  doc.text("Rate", 155, startY + 5.5, { align: "right" });
  doc.text("Amount", 190, startY + 5.5, { align: "right" });

  let curY = startY + 14;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);

  if (payload.items && payload.items.length > 0) {
    payload.items.forEach((it, idx) => {
      if (curY > 270) {
        doc.addPage();
        curY = 20;
      }
      doc.text(`${idx + 1}. ${it.name}`, 18, curY);
      doc.text(String(it.quantity), 120, curY, { align: "right" });
      doc.text(`INR ${it.rate.toFixed(2)}`, 155, curY, { align: "right" });
      doc.text(`INR ${it.total.toFixed(2)}`, 190, curY, { align: "right" });
      curY += 7;
    });
  } else {
    doc.text("1. Commercial Store Purchase", 18, curY);
    doc.text("1", 120, curY, { align: "right" });
    doc.text(`INR ${payload.totalAmount.toFixed(2)}`, 155, curY, { align: "right" });
    doc.text(`INR ${payload.totalAmount.toFixed(2)}`, 190, curY, { align: "right" });
    curY += 7;
  }

  // Divider
  curY += 4;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, curY, 196, curY);
  curY += 8;

  // Grand Total Box
  doc.setFillColor(248, 250, 252);
  doc.rect(110, curY, 86, 14, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Grand Total:", 116, curY + 9);
  doc.text(`INR ${payload.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 190, curY + 9, { align: "right" });

  // Footer
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(148, 163, 184);
  doc.text("This is a computer generated tax invoice powered by CredSmart POS.", 14, 285);

  return doc.output("blob");
}

/**
 * Downloads the PDF directly from either a Blob or an InvoiceSharePayload
 */
export async function downloadInvoicePdf(
  target: InvoiceSharePayload | Blob,
  optionalFilename?: string
): Promise<void> {
  try {
    let blob: Blob;
    let filename: string;

    if (target instanceof Blob) {
      blob = target;
      filename = optionalFilename || "Invoice.pdf";
    } else {
      filename =
        optionalFilename ||
        `Invoice_${(target.invoiceNumber || "DOC").replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`;
      blob = await generateInvoicePdfBlob(target);
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    toast({
      title: "Invoice PDF Downloaded",
      description: `Saved ${filename} to your device.`,
    });
  } catch (err) {
    console.error("Error downloading PDF:", err);
    toast({
      title: "Download Failed",
      description: "Could not generate invoice PDF file.",
      variant: "destructive",
    });
  }
}

import { playSuccessChime, triggerHapticSuccess } from "./soundAndHaptics";

/**
 * Shares an invoice PDF to WhatsApp directly via Web Share API or WhatsApp Web fallback,
 * while ensuring the original A4 PDF is saved to the user's phone/device in the same action.
 */
export async function shareInvoicePdfToWhatsApp(payload: InvoiceSharePayload): Promise<void> {
  const filename = `Invoice_${payload.invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`;
  const cleanCustomer = payload.customerName || "Valued Customer";
  const cleanStore = payload.storeName || "CredSmart Store";
  const docType = payload.isEstimate ? "Estimate" : "Tax Invoice";

  const messageText = `🧾 *${cleanStore.toUpperCase()}* - ${docType.toUpperCase()}\n\nHello *${cleanCustomer}*,\nHere is your *${docType} #${payload.invoiceNumber}* for *₹${payload.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}*.\n\n📄 *An original A4 Tax Invoice PDF has been generated and attached for your records.*\n\nThank you for choosing ${cleanStore}!`;

  const rawPhone = payload.customerPhone ? payload.customerPhone.replace(/\D/g, "") : "";
  const phoneParam = rawPhone.length >= 10 ? `91${rawPhone.slice(-10)}` : "";

  try {
    toast({
      title: "Generating Original A4 PDF...",
      description: "Preparing high-resolution tax invoice for WhatsApp & device download.",
    });

    const pdfBlob = await generateInvoicePdfBlob(payload);
    const pdfFile = new File([pdfBlob], filename, { type: "application/pdf" });

    // Always trigger local device download so the user has the invoice PDF in phone/PC files
    downloadInvoicePdf(pdfBlob, filename);
    playSuccessChime();
    triggerHapticSuccess();

    // 1. Try Native Web Share API with file support (Android Chrome, iOS Safari, PWA)
    if (
      navigator.canShare &&
      navigator.canShare({
        files: [pdfFile],
      })
    ) {
      await navigator.share({
        files: [pdfFile],
        title: `${docType} - ${payload.invoiceNumber}`,
        text: messageText,
      });
      toast({
        title: "A4 PDF Shared & Saved!",
        description: `Dispatched ${filename} to WhatsApp and saved to your device.`,
      });
      return;
    }

    // 2. Fallback: Launch WhatsApp with statement text
    const waUrl = phoneParam
      ? `https://web.whatsapp.com/send?phone=${phoneParam}&text=${encodeURIComponent(messageText)}`
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;

    const fallbackWaUrl = phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(messageText)}`
      : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

    const win = window.open(waUrl, "_blank");
    if (!win || win.closed || typeof win.closed === "undefined") {
      window.open(fallbackWaUrl, "_blank");
    }

    toast({
      title: "PDF Saved & WhatsApp Opened",
      description: `Saved ${filename} to device files. Attach it in the opened WhatsApp chat.`,
    });
  } catch (err: unknown) {
    if (err?.name === "AbortError") {
      return;
    }
    console.error("Error sharing PDF to WhatsApp:", err);

    // Fallback to text WhatsApp link
    const waUrl = phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(messageText)}`
      : `https://wa.me/?text=${encodeURIComponent(messageText)}`;
    window.open(waUrl, "_blank");

    toast({
      title: "Opened WhatsApp Chat",
      description: "Sent invoice statement to WhatsApp.",
    });
  }
}
