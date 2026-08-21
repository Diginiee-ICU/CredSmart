import { useRef, useState } from "react";
import { CartItem } from "@/types/pos";
import { Printer, X, CheckCircle2, FileText, ScrollText, Smartphone, Copy, Check, Zap, Download, Bluetooth } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { buildReceiptEscPos, printViaWebUSB, printViaWebBluetooth } from "@/utils/escpos";
import { UnifiedInvoiceRenderer, UniversalDocType, InvoiceItemData } from "@/components/invoices/UnifiedInvoiceRenderer";
import { loadInvoiceSettings } from "@/utils/invoiceThemeLoader";
import { cn } from "@/lib/utils";

export interface ReceiptData {
  invoiceNumber: string;
  referenceNumber?: string;
  docType?: UniversalDocType;
  items: (CartItem | { product: { name: string; brand?: string; category?: string; description?: string; unit?: string; hsn?: string; hsnCode?: string; gstRate?: number }; quantity: number; batch: { mrp: number; batchNumber?: string; expiryDate?: string; costPrice?: number } })[];
  subtotal: number;
  discountAmount: number;
  discountLabel: string;
  tax: number;
  total: number;
  roundOff?: number;
  creditApplied?: number;
  customerName?: string | null;
  customerPhone?: string | null;
  partyEmail?: string | null;
  partyAddress?: string | null;
  partyGstin?: string | null;
  partyBalance?: number | null;
  paymentMethod: string;
  splitPayments?: { cash: number; card: number; upi: number; credit?: number } | null;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  storeEmail?: string;
  storeLogoUrl?: string;
  gstin?: string;
  date: Date | string;
  dueDate?: string;
  isEstimate?: boolean;
  notes?: string;
  terms?: string;
}

interface ReceiptModalProps {
  data: ReceiptData;
  onClose: () => void;
  onNewSale: () => void;
}

export function ReceiptModal({ data, onClose, onNewSale }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<"80mm" | "58mm" | "a4">("80mm");
  const [copied, setCopied] = useState(false);

  const receiptDate = data.date instanceof Date ? data.date : new Date(data.date || Date.now());

  // Format date and time
  const formattedDate = receiptDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const formattedTime = receiptDate.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Calculate exact total and round-off
  const exactTotal = data.subtotal - data.discountAmount + data.tax - (data.creditApplied || 0);
  const roundOffAmount = data.roundOff !== undefined ? data.roundOff : Number((data.total - exactTotal).toFixed(2));

  // Tax splitting (CGST = 50%, SGST = 50% of total tax)
  const cgst = data.tax / 2;
  const sgst = data.tax / 2;

  const storeName = data.storeName || "CredSmart Retail Store";
  const storeAddress = data.storeAddress || "";
  const storePhone = data.storePhone || "";
  const gstin = data.gstin || "";

  const handleEscPosPrint = async (directUsb = false) => {
    try {
      const printerWidth = layout === "58mm" ? "58mm" : "80mm";
      const bytes = buildReceiptEscPos(data, {
        width: printerWidth,
        openCashDrawer: data.paymentMethod === "Cash",
        cut: true,
        printQr: true,
        printBarcode: true,
      });

      if (directUsb && "usb" in navigator) {
        toast({ title: "Connecting USB Printer...", description: "Please select your thermal printer from device list." });
        const res = await printViaWebUSB(bytes);
        if (res.success) {
          toast({ title: "⚡ Thermal Receipt Printed", description: `Sent raw ESC/POS bytes to printer (${printerWidth}).` });
          return;
        } else {
          toast({ title: "USB Print Notice", description: res.error || "WebUSB transfer failed, downloading raw file.", variant: "destructive" });
        }
      }

      // Default: Download raw binary file or prompt
      const blob = new Blob([bytes], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt_${data.invoiceNumber}_${printerWidth}.bin`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 200);

      toast({
        title: "⚡ ESC/POS Payload Generated",
        description: `Downloaded ${printerWidth} raw binary stream (${bytes.length} bytes) for thermal printer.`,
      });
    } catch (err: any) {
      toast({ title: "ESC/POS Generation Error", description: err.message, variant: "destructive" });
    }
  };

  const handlePrint = () => {
    const content = receiptRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank", "width=850,height=900");
    if (!printWindow) {
      toast({
        title: "Print popup blocked",
        description: "Please allow popups in your browser to print receipts.",
        variant: "destructive",
      });
      return;
    }

    let printStyles = "";
    if (layout === "58mm") {
      printStyles = `
        @page { margin: 0; size: 58mm auto; }
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        html, body {
          font-family: 'Courier New', Courier, monospace;
          width: 56mm;
          max-width: 56mm;
          margin: 0 auto;
          padding: 4px;
          font-size: 10.5px;
          color: #000;
          background: #fff;
          page-break-after: avoid;
          page-break-before: avoid;
          page-break-inside: avoid;
          break-after: avoid;
          break-inside: avoid;
          overflow: visible;
        }
        .no-print { display: none !important; }
        table { width: 100%; border-collapse: collapse; page-break-inside: avoid; break-inside: avoid; }
      `;
    } else if (layout === "80mm") {
      printStyles = `
        @page { margin: 0; size: 80mm auto; }
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        html, body {
          font-family: 'Courier New', Courier, monospace;
          width: 76mm;
          max-width: 76mm;
          margin: 0 auto;
          padding: 6px;
          font-size: 11.5px;
          color: #000;
          background: #fff;
          page-break-after: avoid;
          page-break-before: avoid;
          page-break-inside: avoid;
          break-after: avoid;
          break-inside: avoid;
          overflow: visible;
        }
        .no-print { display: none !important; }
        table { width: 100%; border-collapse: collapse; page-break-inside: avoid; break-inside: avoid; }
      `;
    } else {
      printStyles = `
        @page { size: A4 portrait; margin: 6mm 8mm 6mm 8mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        html, body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          width: 100%;
          max-width: 196mm;
          height: auto;
          max-height: 284mm;
          margin: 0 auto;
          padding: 0;
          color: #000;
          background: #fff;
          font-size: 11px;
          line-height: 1.3;
          page-break-after: avoid;
          page-break-before: avoid;
          page-break-inside: avoid;
          break-after: avoid;
          break-inside: avoid;
          overflow: hidden;
        }
        .invoice-wrapper {
          max-height: 280mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        table { width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 6px; page-break-inside: avoid; break-inside: avoid; }
        th, td { border: 1px solid #444; padding: 3.5px 6px; font-size: 11px; }
        th { background-color: #f3f4f6; font-weight: bold; text-align: left; }
        .text-right { text-align: right !important; }
        .text-center { text-align: center !important; }
        .fw-bold { font-weight: bold; }
        .no-print { display: none !important; }
        h1, h2, h3, h4 { margin-bottom: 2px; }
      `;
    }

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice - ${data.invoiceNumber}</title>
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

  const handleWhatsApp = () => {
    const cleanCustomer = data.customerName || "Valued Customer";
    const itemList = data.items
      .map((it, i) => `${i + 1}. ${it.product.name} (x${it.quantity}) - ₹${(it.batch.mrp * it.quantity).toFixed(2)}`)
      .join("\n");

    const message = `Hello *${cleanCustomer}*,\n\nThank you for shopping at *${storeName}*!\n\n📋 *${data.isEstimate ? "ESTIMATE" : "TAX INVOICE"}*: ${data.invoiceNumber}\n📅 Date: ${formattedDate} ${formattedTime}\n💳 Payment: ${data.paymentMethod}\n\n*Items Purchased:*\n${itemList}\n\n💰 *Total Amount: ₹${data.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}*\n\nFor any queries, please reach out to us${storePhone ? ` at ${storePhone}` : ""}.\nHave a wonderful day!`;

    const rawPhone = data.customerPhone ? data.customerPhone.replace(/\D/g, "") : "";
    const waUrl =
      rawPhone.length >= 10
        ? `https://wa.me/91${rawPhone.slice(-10)}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, "_blank");
  };

  const handleCopySummary = () => {
    const summary = `${data.isEstimate ? "Estimate" : "Invoice"}: ${data.invoiceNumber} | Store: ${storeName} | Total: ₹${data.total.toFixed(2)} | Date: ${formattedDate}`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    toast({ title: "Invoice Summary Copied", description: summary });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/65 backdrop-blur-xs px-2 sm:px-4 pt-3 sm:pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
      <div className="bg-card rounded-2xl card-shadow-lg max-w-[760px] w-full max-h-[calc(100dvh-0.75rem)] sm:max-h-[92vh] flex flex-col animate-fade-in border border-border">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-sm sm:text-base">
                {data.isEstimate ? "Estimate Generated" : "Sale Completed"}
              </h2>
              <p className="text-[11px] text-muted-foreground font-mono">{data.invoiceNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex bg-muted p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setLayout("80mm")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all",
                  layout === "80mm"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ScrollText className="w-3.5 h-3.5" />
                80mm
              </button>
              <button
                type="button"
                onClick={() => setLayout("58mm")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all",
                  layout === "58mm"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Smartphone className="w-3.5 h-3.5" />
                58mm
              </button>
              <button
                type="button"
                onClick={() => setLayout("a4")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all",
                  layout === "a4"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <FileText className="w-3.5 h-3.5" />
                A4 Bill Book
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground"
              aria-label="Close invoice preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Receipt Preview Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-muted/40 flex justify-center">
          <UnifiedInvoiceRenderer
            ref={receiptRef}
            layout={layout}
            docType={data.docType || (data.isEstimate ? "quotation" : "sales_invoice")}
            invoiceNumber={data.invoiceNumber}
            referenceNumber={data.referenceNumber}
            date={data.date}
            dueDate={data.dueDate}
            storeInfo={{
              name: storeName,
              address: storeAddress,
              phone: storePhone,
              email: data.storeEmail || "billing@credsmart.in",
              gstin: gstin,
              logoUrl: data.storeLogoUrl || "",
            }}
            partyInfo={{
              name: data.customerName || (data.docType === "purchase_invoice" ? "Vendor" : "Walk-in Customer"),
              phone: data.customerPhone,
              email: data.partyEmail,
              address: data.partyAddress,
              gstin: data.partyGstin,
              balance: data.partyBalance,
              type: data.docType === "purchase_invoice" || data.docType === "debit_note" ? "supplier" : "customer",
            }}
            items={data.items.map((item, idx) => {
              const p = (item as any).product || {};
              const b = (item as any).batch || {};
              const qty = Number(item.quantity) || 1;
              const rate = Number(b.mrp || (item as any).rate || (item as any).unitPrice || 0);
              return {
                id: String(idx),
                name: p.name || (item as any).name || `Item ${idx + 1}`,
                description: p.description || (p.brand ? `${p.brand} · ${p.category || ""}` : ""),
                hsn: p.hsn || p.hsnCode || (item as any).hsn || "",
                qty: qty,
                unit: p.unit || (item as any).unit || "PCS",
                rate: rate,
                mrp: rate,
                discount: 0,
                taxRate: p.gstRate || (item as any).taxRate || 0,
                total: rate * qty,
                batchNo: b.batchNumber || (item as any).batchNo || "",
                expDate: b.expiryDate || (item as any).expDate || "",
              };
            })}
            totals={{
              subtotal: data.subtotal,
              discountTotal: data.discountAmount,
              discountLabel: data.discountLabel,
              taxableAmount: data.subtotal - data.discountAmount,
              cgst: cgst,
              sgst: sgst,
              taxTotal: data.tax,
              roundOff: roundOffAmount,
              grandTotal: data.total,
              paidAmount: data.paymentMethod === "Credit" ? 0 : data.total,
              balanceDue: data.paymentMethod === "Credit" ? data.total : 0,
            }}
            paymentMethod={data.paymentMethod}
            notes={data.notes}
            terms={data.terms}
          />
        </div>

        {/* Modal Action Bar */}
        <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-t border-border grid grid-cols-2 sm:grid-cols-5 gap-2 bg-card rounded-b-2xl">
          <button
            type="button"
            onClick={handleWhatsApp}
            className="flex items-center justify-center gap-2 py-2.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm transition-colors shadow-xs"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
            WhatsApp
          </button>

          <button
            type="button"
            onClick={() => handleEscPosPrint(true)}
            title="Send raw ESC/POS commands directly to thermal printer (WebUSB / Stream)"
            className="flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs sm:text-sm transition-colors shadow-xs"
          >
            <Zap className="w-4 h-4 shrink-0" />
            <span>ESC/POS Raw</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs sm:text-sm hover:bg-primary/90 transition-opacity shadow-xs"
          >
            <Printer className="w-4 h-4 shrink-0" />
            Print {layout === "a4" ? "A4" : layout}
          </button>

          <button
            type="button"
            onClick={handleCopySummary}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground font-semibold text-xs sm:text-sm transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy"}
          </button>

          <button
            type="button"
            onClick={onNewSale}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-xl border-2 border-primary text-primary font-semibold text-xs sm:text-sm hover:bg-primary/5 transition-colors col-span-2 sm:col-span-1"
          >
            New Sale
          </button>
        </div>
      </div>
    </div>
  );
}

