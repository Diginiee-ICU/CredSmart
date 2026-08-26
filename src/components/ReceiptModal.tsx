import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CartItem } from "@/types/pos";
import { Printer, X, CheckCircle2, FileText, ScrollText, Smartphone, Copy, Check, Zap, Download, Bluetooth, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { buildReceiptEscPos, printViaWebUSB, printViaWebBluetooth } from "@/utils/escpos";
import { UnifiedInvoiceRenderer, UniversalDocType, InvoiceItemData } from "@/components/invoices/UnifiedInvoiceRenderer";
import { loadInvoiceSettings } from "@/utils/invoiceThemeLoader";
import { shareInvoicePdfToWhatsApp, downloadInvoicePdf } from "@/utils/whatsappPdfShare";
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
  upiId?: string;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  accountHolder?: string;
  branch?: string;
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
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<"80mm" | "58mm" | "a4">("80mm");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    scrollBodyRef.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (scrollBodyRef.current) scrollBodyRef.current.scrollTop = 0;
  }, [layout]);

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "ESC/POS Generation Error", description: message, variant: "destructive" });
    }
  };

  const handlePrint = () => {
    const content = receiptRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank", "width=850,height=950");
    if (!printWindow) {
      toast({
        title: "Pop-up Blocked",
        description: "Please allow pop-ups for this site to print receipts.",
        variant: "destructive",
      });
      return;
    }

    // Grab all stylesheet links and style tags from current document so all Tailwind & theme styling applies 1:1
    const headStyles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
      .map((el) => el.outerHTML)
      .join("\n");

    let printSpecificStyles = "";

    if (layout === "58mm") {
      printSpecificStyles = `
        @page { margin: 0; size: 58mm auto; }
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        html, body {
          font-family: 'Courier New', Courier, monospace;
          width: 56mm;
          max-width: 56mm;
          margin: 0 auto;
          padding: 2mm;
          font-size: 10px;
          color: #000;
          background: #fff;
        }
      `;
    } else if (layout === "80mm") {
      printSpecificStyles = `
        @page { margin: 0; size: 80mm auto; }
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        html, body {
          font-family: 'Courier New', Courier, monospace;
          width: 76mm;
          max-width: 76mm;
          margin: 0 auto;
          padding: 3mm;
          font-size: 11px;
          color: #000;
          background: #fff;
        }
      `;
    } else {
      printSpecificStyles = `
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
    }

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Invoice - ${data.invoiceNumber}</title>
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

  const handleWhatsApp = async () => {
    await shareInvoicePdfToWhatsApp({
      invoiceNumber: data.invoiceNumber,
      customerName: data.customerName || undefined,
      customerPhone: data.customerPhone || undefined,
      storeName: storeName,
      storePhone: storePhone || undefined,
      totalAmount: data.total,
      date: formattedDate,
      isEstimate: data.isEstimate,
      elementId: "receipt-printable-area",
      items: data.items.map((it) => ({
        name: it.product.name,
        quantity: it.quantity,
        rate: it.batch.mrp,
        total: it.batch.mrp * it.quantity,
      })),
    });
  };

  const handleDownload = async () => {
    await downloadInvoicePdf({
      invoiceNumber: data.invoiceNumber,
      customerName: data.customerName || undefined,
      customerPhone: data.customerPhone || undefined,
      storeName: storeName,
      storePhone: storePhone || undefined,
      totalAmount: data.total,
      date: formattedDate,
      isEstimate: data.isEstimate,
      elementId: "receipt-printable-area",
      items: data.items.map((it) => ({
        name: (it as any).product?.name || (it as any).name || "Item",
        quantity: it.quantity,
        rate: (it as any).batch?.mrp || (it as any).rate || (it as any).unitPrice || 0,
        total: ((it as any).batch?.mrp || (it as any).rate || (it as any).unitPrice || 0) * it.quantity,
      })),
    });
  };

  const handleCopySummary = () => {
    const summary = `${data.isEstimate ? "Estimate" : "Invoice"}: ${data.invoiceNumber} | Store: ${storeName} | Total: ₹${data.total.toFixed(2)} | Date: ${formattedDate}`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    toast({ title: "Invoice Summary Copied", description: summary });
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-modal-title"
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="bg-slate-900 border-0 sm:border border-slate-800 w-full h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[94vh] max-w-full sm:max-w-[780px] sm:rounded-3xl flex flex-col shadow-2xl text-white overflow-hidden animate-scale-in">
        
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 sm:px-6 py-3 sm:py-3.5 border-b border-slate-800 bg-slate-900/95 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                <span>{data.isEstimate ? "Estimate Generated" : "Bill Saved Successfully"}</span>
                <span className="text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  ₹{data.total.toLocaleString("en-IN")}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">Invoice #{data.invoiceNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Segment Switcher */}
            <div className="flex bg-slate-950 p-0.5 sm:p-1 rounded-xl border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setLayout("80mm")}
                className={cn(
                  "px-2 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all",
                  layout === "80mm"
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <ScrollText className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                <span>80mm</span>
              </button>
              <button
                type="button"
                onClick={() => setLayout("58mm")}
                className={cn(
                  "px-2 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all",
                  layout === "58mm"
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <Smartphone className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                <span>58mm</span>
              </button>
              <button
                type="button"
                onClick={() => setLayout("a4")}
                className={cn(
                  "px-2 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all",
                  layout === "a4"
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <FileText className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                <span>A4</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              aria-label="Close invoice preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Receipt Preview Body with Thermal Paper Styling */}
        <div ref={scrollBodyRef} className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 flex justify-center items-start">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden p-1 text-slate-900 border border-slate-200">
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
                const itemData = item as {
                  product?: {
                    name?: string;
                    description?: string;
                    brand?: string;
                    category?: string;
                    hsn?: string;
                    hsnCode?: string;
                    gstRate?: number;
                    unit?: string;
                  } | null;
                  batch?: {
                    mrp?: number;
                    batchNumber?: string;
                    expiryDate?: string;
                  } | null;
                  rate?: number;
                  unitPrice?: number;
                  name?: string;
                  hsn?: string;
                  unit?: string;
                  taxRate?: number;
                  batchNo?: string;
                  expDate?: string;
                };
                const p = itemData.product ?? {};
                const b = itemData.batch ?? {};
                const qty = Number(item.quantity) || 1;
                const rate = Number(b.mrp ?? itemData.rate ?? itemData.unitPrice ?? 0);
                return {
                  id: String(idx),
                  name: p.name ?? itemData.name ?? `Item ${idx + 1}`,
                  description: p.description ?? (p.brand ? `${p.brand} · ${p.category || ""}` : ""),
                  hsn: p.hsn ?? p.hsnCode ?? itemData.hsn ?? "",
                  qty,
                  unit: p.unit ?? itemData.unit ?? "PCS",
                  rate,
                  mrp: rate,
                  discount: 0,
                  taxRate: p.gstRate ?? itemData.taxRate ?? 0,
                  total: rate * qty,
                  batchNo: b.batchNumber ?? itemData.batchNo ?? "",
                  expDate: b.expiryDate ?? itemData.expDate ?? "",
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
        </div>

        {/* Modal Action Bar: Clean 3-Action Footer (Print, Download, Whatsapp) */}
        <div className="px-3.5 sm:px-6 py-3 sm:py-4 border-t border-slate-800 grid grid-cols-3 gap-2.5 sm:gap-3 bg-slate-900 sm:rounded-b-3xl shrink-0 z-10 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
          {/* 1. Print */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-indigo-950/40 active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>Print</span>
          </button>

          {/* 2. Download */}
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 hover:text-white font-bold text-xs sm:text-sm transition-all border border-slate-700 active:scale-95 cursor-pointer shadow-md"
          >
            <Download className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Download</span>
          </button>

          {/* 3. Whatsapp */}
          <button
            type="button"
            onClick={handleWhatsApp}
            className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-emerald-950/40 active:scale-95 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
            <span>Whatsapp</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
