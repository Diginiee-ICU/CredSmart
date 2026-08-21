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
  businessName = "CREDSMART ENTERPRISES",
  businessPhone = "+91 7409200341",
  businessEmail = "billing@credsmart.in",
  businessAddress = "Shop 14, Main Market, Rajpur Road, Dehradun, Uttarakhand - 248001",
  businessGstin = "05AAAAA0000A1Z5",
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
      altUnit: "1 Unit",
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
      name: "PARLE-G 200G",
      description: "crispy glucose biscuits box",
      hsn: "1905",
      qty: 1,
      unit: "BOX",
      altUnit: "24 PACKS",
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
      altUnit: "2 Units",
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

    const printWindow = window.open("", "_blank", "width=850,height=900");
    if (!printWindow) return;

    const printStyles = `
      @page { size: A4 portrait; margin: 5mm 7mm 5mm 7mm; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        width: 100%;
        max-width: 196mm;
        height: 100%;
        max-height: 284mm;
        margin: 0 auto;
        padding: 0;
        color: #000;
        background: #fff;
        font-size: 10.5px;
        line-height: 1.3;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        page-break-after: avoid;
        page-break-before: avoid;
        page-break-inside: avoid;
        break-after: avoid;
        break-inside: avoid;
        overflow: hidden;
      }
      .one-page-invoice {
        max-height: 282mm;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      table { width: 100%; border-collapse: collapse; margin-top: 4px; margin-bottom: 4px; page-break-inside: avoid; break-inside: avoid; }
      th, td { padding: 3px 5px; font-size: 10.5px; }
      th { font-weight: bold; text-align: left; }
      .text-right { text-align: right !important; }
      .text-center { text-align: center !important; }
      .no-print { display: none !important; }
    `;

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Tax Invoice - 1 Page Fit</title>
        <style>${printStyles}</style>
      </head>
      <body>
        ${content.innerHTML}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
              window.close();
            }, 250);
          };
        <\/script>
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
            name: "M/s Sharma Retailers & Traders",
            phone: "+91 9897123450",
            email: "sharma.traders@gmail.com",
            address: "42 Subhash Nagar, Dehradun, Uttarakhand - 248002",
            gstin: "05ABCDE1234F1Z5",
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
