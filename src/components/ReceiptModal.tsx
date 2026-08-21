import { useRef, useState } from "react";
import { CartItem } from "@/types/pos";
import { Printer, X, CheckCircle2, FileText, ScrollText, Smartphone, Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { numberToWords } from "@/lib/numberToWords";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export interface ReceiptData {
  invoiceNumber: string;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  discountLabel: string;
  tax: number;
  total: number;
  roundOff?: number;
  creditApplied?: number;
  customerName?: string | null;
  customerPhone?: string | null;
  paymentMethod: string;
  splitPayments?: { cash: number; card: number; upi: number; credit?: number } | null;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  gstin?: string;
  date: Date | string;
  isEstimate?: boolean;
  notes?: string;
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
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; width: 54mm; margin: 0 auto; padding: 6px; font-size: 11px; color: #000; background: #fff; }
        .no-print { display: none !important; }
        table { width: 100%; border-collapse: collapse; }
      `;
    } else if (layout === "80mm") {
      printStyles = `
        @page { margin: 0; size: 80mm auto; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; width: 72mm; margin: 0 auto; padding: 10px; font-size: 12px; color: #000; background: #fff; }
        .no-print { display: none !important; }
        table { width: 100%; border-collapse: collapse; }
      `;
    } else {
      printStyles = `
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
          font-size: 11px;
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
        .invoice-wrapper {
          max-height: 282mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        table { width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 6px; page-break-inside: avoid; break-inside: avoid; }
        th, td { border: 1px solid #444; padding: 3.5px 6px; font-size: 11px; }
        th { background-color: #f3f4f6; font-weight: bold; text-align: left; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
          
          {/* ─── 80MM / 58MM THERMAL RECEIPT LAYOUT ─── */}
          {(layout === "80mm" || layout === "58mm") && (
            <div
              className={cn(
                "bg-white text-black rounded-xl border border-neutral-300 p-4 sm:p-5 shadow-sm transition-all duration-200",
                layout === "80mm" ? "w-full max-w-[320px]" : "w-full max-w-[240px] text-[11px]"
              )}
              style={{ fontFamily: "'Courier New', Courier, monospace" }}
            >
              <div ref={receiptRef}>
                <div style={{ textAlign: "center", marginBottom: "8px" }}>
                  <div style={{ fontSize: layout === "80mm" ? "16px" : "14px", fontWeight: "bold", textTransform: "uppercase" }}>
                    {storeName}
                  </div>
                  {storeAddress && <div style={{ fontSize: "10px", color: "#333", marginTop: "2px" }}>{storeAddress}</div>}
                  {storePhone && <div style={{ fontSize: "10px", color: "#333" }}>Tel: {storePhone}</div>}
                  {gstin && <div style={{ fontSize: "10px", fontWeight: "bold", color: "#222" }}>GSTIN: {gstin}</div>}
                  
                  <div style={{ marginTop: "6px", fontWeight: "bold", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px" }}>
                    {data.isEstimate ? "*** ESTIMATE / QUOTATION ***" : "*** TAX INVOICE ***"}
                  </div>
                </div>

                <div style={{ borderTop: "1px dashed #666", margin: "8px 0" }} />

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                  <span>Inv: <strong>{data.invoiceNumber}</strong></span>
                  <span>{formattedDate}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginTop: "2px" }}>
                  <span>Pay: <strong>{data.paymentMethod}</strong></span>
                  <span>{formattedTime}</span>
                </div>
                <div style={{ fontSize: "10px", marginTop: "2px" }}>
                  Cust: <strong>{data.customerName || "Walk-in Customer"}</strong>
                  {data.customerPhone && <span> ({data.customerPhone})</span>}
                </div>

                <div style={{ borderTop: "1px dashed #666", margin: "8px 0" }} />

                {/* Items Header */}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", fontWeight: "bold" }}>
                  <span style={{ flex: 1 }}>Item</span>
                  <span style={{ width: "32px", textAlign: "center" }}>Qty</span>
                  <span style={{ width: "65px", textAlign: "right" }}>Amt (₹)</span>
                </div>
                <div style={{ borderTop: "1px solid #aaa", margin: "4px 0" }} />

                {/* Items List */}
                {data.items.map((item, idx) => (
                  <div key={idx} style={{ padding: "2px 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                      <span style={{ flex: 1, paddingRight: "4px", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.product.name}
                      </span>
                      <span style={{ width: "32px", textAlign: "center" }}>{item.quantity}</span>
                      <span style={{ width: "65px", textAlign: "right", fontWeight: "bold" }}>
                        {(item.batch.mrp * item.quantity).toFixed(2)}
                      </span>
                    </div>
                    <div style={{ fontSize: "9px", color: "#555" }}>
                      @ ₹{item.batch.mrp.toFixed(2)} {item.batch.batchNumber ? `(B:${item.batch.batchNumber})` : ""}
                    </div>
                  </div>
                ))}

                <div style={{ borderTop: "1px dashed #666", margin: "8px 0" }} />

                {/* Totals */}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", padding: "1px 0" }}>
                  <span>Subtotal</span>
                  <span>₹{data.subtotal.toFixed(2)}</span>
                </div>
                {data.discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", padding: "1px 0" }}>
                    <span>Disc ({data.discountLabel})</span>
                    <span>-₹{data.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {data.tax > 0 && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", padding: "1px 0", color: "#444" }}>
                      <span>CGST</span>
                      <span>₹{cgst.toFixed(2)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", padding: "1px 0", color: "#444" }}>
                      <span>SGST</span>
                      <span>₹{sgst.toFixed(2)}</span>
                    </div>
                  </>
                )}
                {data.creditApplied && data.creditApplied > 0 ? (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", padding: "1px 0" }}>
                    <span>Credit Applied</span>
                    <span>-₹{data.creditApplied.toFixed(2)}</span>
                  </div>
                ) : null}
                {Math.abs(roundOffAmount) > 0.001 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", padding: "1px 0", color: "#555" }}>
                    <span>Round Off</span>
                    <span>{roundOffAmount > 0 ? "+" : ""}₹{roundOffAmount.toFixed(2)}</span>
                  </div>
                )}

                <div style={{ borderTop: "1px solid #000", margin: "6px 0 4px" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: "bold" }}>
                  <span>NET TOTAL</span>
                  <span>₹{data.total.toFixed(2)}</span>
                </div>
                <div style={{ borderTop: "1px solid #000", margin: "4px 0 8px" }} />

                {/* Split Payments Breakdown if applicable */}
                {data.splitPayments && (
                  <div style={{ fontSize: "9px", color: "#444", marginBottom: "6px" }}>
                    <strong>Split: </strong>
                    {data.splitPayments.cash > 0 && `Cash: ₹${data.splitPayments.cash.toFixed(2)} `}
                    {data.splitPayments.card > 0 && `Card: ₹${data.splitPayments.card.toFixed(2)} `}
                    {data.splitPayments.upi > 0 && `UPI: ₹${data.splitPayments.upi.toFixed(2)} `}
                  </div>
                )}

                {/* QR Code */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "10px 0 6px" }}>
                  <QRCodeSVG
                    value={`INVOICE:${data.invoiceNumber}|TOTAL:${data.total.toFixed(2)}|DATE:${formattedDate}`}
                    size={layout === "80mm" ? 85 : 70}
                    level="L"
                  />
                  <span style={{ fontSize: "8px", color: "#777", marginTop: "3px" }}>Scan to verify</span>
                </div>

                <div style={{ textAlign: "center", fontSize: "10px", marginTop: "6px", color: "#333" }}>
                  Thank you for your business!
                </div>
              </div>
            </div>
          )}

          {/* ─── A4 / BILL BOOK INVOICE LAYOUT ─── */}
          {layout === "a4" && (
            <div
              className="bg-white text-black rounded-xl border border-neutral-300 p-4 sm:p-6 shadow-sm w-full max-w-[720px] transition-all"
              style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
            >
              <div ref={receiptRef} className="invoice-wrapper">
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div>
                    <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: "0 0 2px", color: "#111" }}>{storeName}</h1>
                    <div style={{ fontSize: "11px", color: "#444", lineHeight: "1.35", maxWidth: "300px" }}>
                      {storeAddress && <div>{storeAddress}</div>}
                      {storePhone && <div>Ph: {storePhone}</div>}
                      {gstin && <div style={{ fontWeight: "bold", color: "#111" }}>GSTIN: {gstin}</div>}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <h2 style={{ fontSize: "18px", color: "#222", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 6px" }}>
                      {data.isEstimate ? "ESTIMATE" : "TAX INVOICE"}
                    </h2>
                    <table style={{ width: "210px", borderCollapse: "collapse", marginLeft: "auto", border: "1px solid #ccc", fontSize: "10.5px" }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: "3px 5px", backgroundColor: "#f5f5f5", fontWeight: "bold", border: "1px solid #ccc" }}>Invoice No</td>
                          <td style={{ padding: "3px 5px", border: "1px solid #ccc", fontWeight: "bold" }}>{data.invoiceNumber}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: "3px 5px", backgroundColor: "#f5f5f5", fontWeight: "bold", border: "1px solid #ccc" }}>Date & Time</td>
                          <td style={{ padding: "3px 5px", border: "1px solid #ccc" }}>{formattedDate} {formattedTime}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: "3px 5px", backgroundColor: "#f5f5f5", fontWeight: "bold", border: "1px solid #ccc" }}>Payment Mode</td>
                          <td style={{ padding: "3px 5px", border: "1px solid #ccc" }}>{data.paymentMethod}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Billed To Section */}
                <div style={{ marginBottom: "10px", padding: "6px 10px", backgroundColor: "#fafafa", border: "1px solid #e5e5e5", borderRadius: "5px" }}>
                  <div style={{ fontSize: "10px", fontWeight: "bold", color: "#666", textTransform: "uppercase", marginBottom: "1px" }}>
                    Billed To:
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: "bold", color: "#111" }}>
                    {data.customerName || "Walk-in Customer"}
                  </div>
                  {data.customerPhone && <div style={{ fontSize: "11px", color: "#444" }}>Phone: {data.customerPhone}</div>}
                </div>

                {/* Items Table */}
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px" }}>
                  <thead>
                    <tr>
                      <th style={{ border: "1px solid #333", padding: "4px 6px", backgroundColor: "#f5f5f5", width: "30px", textAlign: "center" }}>#</th>
                      <th style={{ border: "1px solid #333", padding: "4px 6px", backgroundColor: "#f5f5f5", textAlign: "left" }}>Description of Goods</th>
                      <th style={{ border: "1px solid #333", padding: "4px 6px", backgroundColor: "#f5f5f5", width: "75px", textAlign: "right" }}>Rate (₹)</th>
                      <th style={{ border: "1px solid #333", padding: "4px 6px", backgroundColor: "#f5f5f5", width: "45px", textAlign: "center" }}>Qty</th>
                      <th style={{ border: "1px solid #333", padding: "4px 6px", backgroundColor: "#f5f5f5", width: "85px", textAlign: "right" }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ border: "1px solid #ccc", padding: "4px 6px", textAlign: "center", fontSize: "10.5px" }}>{idx + 1}</td>
                        <td style={{ border: "1px solid #ccc", padding: "4px 6px" }}>
                          <div style={{ fontWeight: "bold", fontSize: "11.5px" }}>{item.product.name}</div>
                          <div style={{ fontSize: "9.5px", color: "#666" }}>
                            {item.product.brand && `${item.product.brand} · `}
                            {item.product.category && `${item.product.category} · `}
                            {item.batch.batchNumber ? `Batch: ${item.batch.batchNumber}` : ""}
                          </div>
                        </td>
                        <td style={{ border: "1px solid #ccc", padding: "4px 6px", textAlign: "right", fontSize: "11px" }}>
                          {item.batch.mrp.toFixed(2)}
                        </td>
                        <td style={{ border: "1px solid #ccc", padding: "4px 6px", textAlign: "center", fontSize: "11px", fontWeight: "bold" }}>
                          {item.quantity}
                        </td>
                        <td style={{ border: "1px solid #ccc", padding: "4px 6px", textAlign: "right", fontWeight: "bold", fontSize: "11px" }}>
                          {(item.batch.mrp * item.quantity).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Summary & Terms */}
                <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginTop: "4px" }}>
                  {/* Left Side */}
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: "8px" }}>
                      <div style={{ fontSize: "10px", color: "#666" }}>Amount in Words:</div>
                      <div style={{ fontSize: "11px", fontWeight: "bold", color: "#111", textTransform: "capitalize" }}>
                        Rupees {numberToWords(data.total)} Only
                      </div>
                    </div>

                    <div style={{ fontSize: "9.5px", color: "#555", borderTop: "1px solid #eee", paddingTop: "6px" }}>
                      <strong style={{ color: "#222" }}>Terms &amp; Conditions:</strong>
                      <ul style={{ paddingLeft: "12px", margin: "2px 0 0" }}>
                        <li>Goods once sold cannot be returned without original receipt.</li>
                        <li>Subject to local jurisdiction.</li>
                        <li>This is a computer generated invoice.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Right Side Totals Table */}
                  <div style={{ width: "220px", shrink: 0 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: "3px 5px", border: "1px solid #ccc" }}>Subtotal</td>
                          <td style={{ padding: "3px 5px", border: "1px solid #ccc", textAlign: "right", fontWeight: "bold" }}>
                            ₹{data.subtotal.toFixed(2)}
                          </td>
                        </tr>
                        {data.discountAmount > 0 && (
                          <tr>
                            <td style={{ padding: "3px 5px", border: "1px solid #ccc" }}>Discount ({data.discountLabel})</td>
                            <td style={{ padding: "3px 5px", border: "1px solid #ccc", textAlign: "right", color: "#16a34a" }}>
                              -₹{data.discountAmount.toFixed(2)}
                            </td>
                          </tr>
                        )}
                        {data.tax > 0 && (
                          <>
                            <tr>
                              <td style={{ padding: "3px 5px", border: "1px solid #ccc" }}>CGST</td>
                              <td style={{ padding: "3px 5px", border: "1px solid #ccc", textAlign: "right" }}>
                                ₹{cgst.toFixed(2)}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ padding: "3px 5px", border: "1px solid #ccc" }}>SGST</td>
                              <td style={{ padding: "3px 5px", border: "1px solid #ccc", textAlign: "right" }}>
                                ₹{sgst.toFixed(2)}
                              </td>
                            </tr>
                          </>
                        )}
                        {data.creditApplied && data.creditApplied > 0 ? (
                          <tr>
                            <td style={{ padding: "3px 5px", border: "1px solid #ccc" }}>Credit Applied</td>
                            <td style={{ padding: "3px 5px", border: "1px solid #ccc", textAlign: "right" }}>
                              -₹{data.creditApplied.toFixed(2)}
                            </td>
                          </tr>
                        ) : null}
                        {Math.abs(roundOffAmount) > 0.001 && (
                          <tr>
                            <td style={{ padding: "3px 5px", border: "1px solid #ccc" }}>Round Off</td>
                            <td style={{ padding: "3px 5px", border: "1px solid #ccc", textAlign: "right" }}>
                              {roundOffAmount > 0 ? "+" : ""}₹{roundOffAmount.toFixed(2)}
                            </td>
                          </tr>
                        )}
                        <tr>
                          <td style={{ padding: "4px 6px", border: "1px solid #111", backgroundColor: "#f5f5f5", fontWeight: "bold", fontSize: "12.5px" }}>
                            Grand Total
                          </td>
                          <td style={{ padding: "4px 6px", border: "1px solid #111", backgroundColor: "#f5f5f5", textAlign: "right", fontWeight: "bold", fontSize: "12.5px" }}>
                            ₹{data.total.toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <div style={{ marginTop: "18px", textAlign: "center", borderTop: "1px solid #333", paddingTop: "2px", fontSize: "10px", fontWeight: "bold" }}>
                      Authorized Signatory
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Action Bar */}
        <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-2 bg-card rounded-b-2xl">
          <button
            type="button"
            onClick={handleWhatsApp}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm transition-colors shadow-xs"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
            WhatsApp
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-primary text-primary-foreground font-semibold text-xs sm:text-sm hover:bg-primary/90 transition-opacity shadow-xs"
          >
            <Printer className="w-4 h-4 shrink-0" />
            Print {layout === "a4" ? "Invoice" : "Receipt"}
          </button>

          <button
            type="button"
            onClick={handleCopySummary}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-border bg-background hover:bg-muted text-foreground font-semibold text-xs sm:text-sm transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy"}
          </button>

          <button
            type="button"
            onClick={onNewSale}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border-2 border-primary text-primary font-semibold text-xs sm:text-sm hover:bg-primary/5 transition-colors"
          >
            New Sale
          </button>
        </div>
      </div>
    </div>
  );
}

