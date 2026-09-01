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
  businessName = "Sharma Store",
  businessPhone = "+91 98765 43210",
  businessEmail = "billing@sharmastore.in",
  businessAddress = "812, Street 12, Ramra Nagar, Mumbai, Maharashtra, 400001",
  businessGstin = "27AABCU5007R1Z12",
  businessLogo = "",
}: LiveInvoicePreviewProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);

  // High-fidelity sample items matching Master B2B Invoice Specification
  const sampleItems = [
    {
      id: "1",
      name: "REAL ACTIVE JUICE 1L",
      description: "100% natural mixed fruit juice pack",
      hsn: "2009",
      qty: 10,
      unit: "PCS",
      mrp: 65,
      rate: 53.57,
      discount: 0,
      discountPercent: 0,
      taxRate: 12,
      taxAmount: 64.29,
      total: 600,
      batchNo: "BAT-9941",
      expDate: "12/2026",
    },
    {
      id: "2",
      name: "COLGATE TOTAL TOOTHPASTE 150G",
      description: "antibacterial active protection paste",
      hsn: "3306",
      qty: 8,
      unit: "PCS",
      mrp: 190,
      rate: 160.71,
      discount: 0,
      discountPercent: 0,
      taxRate: 12,
      taxAmount: 154.29,
      total: 1440,
      batchNo: "BAT-5512",
      expDate: "09/2027",
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
        border: 1px solid #cbd5e1 !important;
        border-radius: 0 !important;
        padding: 12px !important;
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
        <title>Tax Invoice - 1 Page Master Standard</title>
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
          <span className="font-semibold text-foreground">Single Master GST Invoice</span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono font-bold">
            100% Tax Compliant
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
          copyType="ORIGINAL FOR RECIPIENT"
          invoiceNumber="INV-2026-0042"
          referenceNumber="REF-9021"
          date={new Date()}
          dueDate="2026-03-25"
          deliveryCharge={50}
          storeInfo={{
            name: businessName || "Sharma Store",
            phone: businessPhone || "+91 98765 43210",
            email: businessEmail || "billing@sharmastore.in",
            address: businessAddress || "812, Street 12, Ramra Nagar, Mumbai, Maharashtra, 400001",
            state: "Maharashtra",
            stateCode: "27",
            gstin: businessGstin || "27AABCU5007R1Z12",
            pan: "PPCS4567K",
            logoUrl: businessLogo,
            bank_name: "HDFC Bank",
            account_number: "50200012345678",
            ifsc: "HDFC0001234",
            branch: "Nariman Point",
            account_holder: businessName || "Sharma Store",
            upi_id: "store@okhdfcbank",
          }}
          partyInfo={{
            name: "MOHIT GUPTA",
            phone: "9123456789",
            email: "mohit.gupta@enterprise.in",
            address: "121, South Nagar, Gachibowli Colony, Prayagraj, 211011",
            state: "Uttar Pradesh",
            stateCode: "09",
            gstin: "09AAECB47361Z6",
            balance: 14500,
            type: "customer",
          }}
          shippingInfo={{
            name: "MOHIT GUPTA",
            phone: "9123456789",
            address: "121, South Nagar, Gachibowli Colony, Prayagraj, 211011",
            state: "Uttar Pradesh",
            gstin: "09AAECB47361Z6",
          }}
          items={sampleItems}
          totals={{
            subtotal: 2040.0,
            discountTotal: 10.0,
            discountLabel: "Trade Discount",
            taxableAmount: 1821.43,
            cgst: 0,
            sgst: 0,
            igst: 218.57,
            taxTotal: 218.57,
            roundOff: 0.0,
            grandTotal: 2080.0,
            paidAmount: 200.0,
            balanceDue: 1880.0,
          }}
          paymentMethod="UPI / Advance"
          notes="Thank you for shopping with Sharma Store."
          terms="1. Goods once sold cannot be returned or exchanged.&#10;2. All disputes are subject to local jurisdiction only.&#10;3. This is a computer generated invoice."
        />
      </div>
    </div>
  );
}
