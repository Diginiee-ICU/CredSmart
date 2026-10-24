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
      name: "birla cement super",
      description: "high grade Portland pozzolana cement",
      hsn: "2523",
      qty: 1,
      unit: "Bag",
      rate: 352,
      discount: 0,
      taxRate: 12,
      taxAmount: 42.24,
      total: 394.24,
    },
    {
      id: "2",
      name: "river sand",
      description: "washed construction river sand",
      hsn: "25051011",
      qty: 1,
      unit: "Tonne",
      rate: 1600,
      discount: 0,
      taxRate: 28,
      taxAmount: 448,
      cessAmount: 960,
      total: 3008,
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
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono font-bold">
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
          invoiceNumber="35"
          referenceNumber="REF-9021"
          date={new Date("2024-06-23")}
          dueDate="2024-07-25"
          deliveryCharge={0}
          storeInfo={{
            name: businessName || "Swift Distributors",
            phone: businessPhone || "+91 98765 43210",
            email: businessEmail || "sales@swiftgrow.in",
            address: businessAddress || "1278, 8 main, vijaynagar, Bangalore, Karnataka, 560040",
            state: "Karnataka",
            stateCode: "29",
            gstin: businessGstin || "29AABCU5007R1Z12",
            pan: "PPCS4567K",
            logoUrl: businessLogo,
            bank_name: "State Bank of India",
            account_number: "40928172910",
            ifsc: "SBIN0001234",
            branch: "Main Branch, Bengaluru",
            account_holder: businessName || "Swift Distributors",
            upi_id: "swiftgrow@oksbi",
          }}
          partyInfo={{
            name: "STAR CONSTRUCTIONS",
            phone: "999177700",
            email: "contact@starconstructions.in",
            address: "15, 4 cross, r r nagar, Bengaluru, 560048",
            state: "Karnataka",
            stateCode: "29",
            gstin: "29AAECS47361Z6",
            balance: 14500,
            type: "customer",
          }}
          items={sampleItems}
          totals={{
            subtotal: 1952.0,
            discountTotal: 0,
            taxableAmount: 1952.0,
            cgst: 245.12,
            sgst: 245.12,
            cess: 960.0,
            taxTotal: 1450.24,
            roundOff: 0.0,
            grandTotal: 3402.24,
            paidAmount: 3402.24,
            balanceDue: 0.0,
          }}
          paymentMethod="Bank / UPI"
          notes="Thank you for your business."
          terms="1. All disputes are subject to bengaluru jurisdiction only.&#10;2. Goods once sold will not be taken back.&#10;3. This is a computer generated tax invoice."
        />
      </div>
    </div>
  );
}
