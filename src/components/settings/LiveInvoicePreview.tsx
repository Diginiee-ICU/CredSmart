import { useRef } from "react";
import { InvoiceSettingsState } from "@/types/invoice-settings";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedInvoiceRenderer } from "@/components/invoices/UnifiedInvoiceRenderer";

interface LiveInvoicePreviewProps {
  settings: InvoiceSettingsState;
  businessName?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessAddress?: string;
  businessGstin?: string;
  businessLogo?: string;
}

export function LiveInvoicePreview({
  settings,
  businessName = "Business Store",
  businessPhone = "",
  businessEmail = "",
  businessAddress = "",
  businessGstin = "",
  businessLogo = "",
}: LiveInvoicePreviewProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);

  // Sample items matching in.PNG
  const sampleItems = [
    {
      id: "1",
      name: "SAMSUNG A30",
      description: "samsung smartphone with amoled display",
      hsn: "8517",
      qty: 1,
      unit: "PCS",
      freeQty: 0,
      rate: 10000,
      discount: 1000,
      discountPercent: 10,
      taxRate: 18,
      taxAmount: 1620,
      total: 10620,
      batchNo: "BAT-9941",
      expDate: "12/2027",
      mfgDate: "01/2025",
      priceHistory: "₹9,800.00 (Last Bill)",
    },
    {
      id: "2",
      name: "PARLE-G 200G (BOX)",
      description: "crispy glucose biscuits box",
      hsn: "1905",
      qty: 24,
      unit: "Pcs",
      altUnit: "BOX",
      altQty: 1,
      altUnitConversion: 24,
      freeQty: 1,
      rate: 342.86,
      discount: 51.43,
      discountPercent: 15,
      taxRate: 5,
      taxAmount: 14.57,
      total: 306,
      batchNo: "BAT-5512",
      expDate: "09/2026",
      mfgDate: "03/2025",
      priceHistory: "₹345.00 (Last Bill)",
    },
    {
      id: "3",
      name: "PUMA DRY-FIT T-SHIRT",
      description: "sports performance dry fit cotton",
      hsn: "6109",
      qty: 2,
      unit: "PCS",
      freeQty: 0,
      rate: 900,
      discount: 0,
      discountPercent: 0,
      taxRate: 5,
      taxAmount: 90,
      total: 1890,
      batchNo: "BAT-1102",
      expDate: "N/A",
      mfgDate: "11/2024",
      priceHistory: "₹920.00 (Last Bill)",
    },
  ];

  const handlePrint = () => {
    const content = invoiceRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank", "width=850,height=950");
    if (!printWindow) return;

    const headStyles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
      .map((el) => el.outerHTML)
      .join("\n");

    const printSpecificStyles = `
      @page {
        size: A4 portrait;
        margin: 5mm 7mm;
      }
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        box-sizing: border-box !important;
      }
      html, body {
        width: 100% !important;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
        font-size: 10px !important;
        line-height: 1.25 !important;
      }
      #unified-invoice-document {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
        box-shadow: none !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 0 !important;
        padding: 0 !important;
        margin: 0 auto !important;
        page-break-after: avoid !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    `;

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Tax Invoice - 1 Page Fit</title>
        ${headStyles}
        <style>${printSpecificStyles}</style>
      </head>
      <body class="bg-white p-0 m-0">
        <div class="w-full flex justify-center">
          ${content.outerHTML}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
              window.close();
            }, 300);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="w-full space-y-3">
      {/* Top Preview Status & 1-Page Print Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-card rounded-xl border border-border shadow-xs text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-foreground">Live Single-Page Preview</span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono font-bold">
            1-Page A4 Guarantee
          </span>
        </div>
        <Button
          size="sm"
          onClick={handlePrint}
          className="h-7 px-2.5 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
        >
          <Printer className="w-3.5 h-3.5" />
          Print 1-Page Invoice
        </Button>
      </div>

      <div className="w-full bg-slate-100 dark:bg-slate-900/60 p-2 sm:p-4 rounded-2xl border border-border/70 overflow-x-auto shadow-inner">
        <UnifiedInvoiceRenderer
          ref={invoiceRef}
          settings={settings}
          layout="a4"
          docType="sales_invoice"
          invoiceNumber="INV-2026-0042"
          referenceNumber="REF-9021"
          date={new Date()}
          dueDate="2026-03-05"
          storeInfo={{
            name: businessName,
            phone: businessPhone,
            email: businessEmail,
            address: businessAddress,
            gstin: businessGstin,
            logoUrl: businessLogo,
          }}
          partyInfo={{
            name: "Sample Customer / Client",
            phone: "",
            email: "",
            address: "",
            gstin: "",
            balance: 14500,
            type: "customer",
          }}
          items={sampleItems}
          totals={{
            subtotal: 12816.0,
            discountTotal: 1051.43,
            discountLabel: "Festive Promo (10%)",
            taxableAmount: 11091.43,
            cgst: 862.29,
            sgst: 862.29,
            taxTotal: 1724.57,
            roundOff: 0.5,
            grandTotal: 12816.5,
            paidAmount: 0.0,
            balanceDue: 12816.5,
          }}
          paymentMethod="UPI"
          notes="Thank you for shopping with CredSmart Enterprises."
        />
      </div>
    </div>
  );
}
