import { QRCodeSVG } from "qrcode.react";
import { InvoiceSettingsState, COLOR_SWATCHES } from "@/types/invoice-settings";
import { cn } from "@/lib/utils";
import { Sparkles, Award, ShieldCheck, CheckCircle2 } from "lucide-react";

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
  const swatch = COLOR_SWATCHES.find((s) => s.hex.toLowerCase() === settings.primaryColor.toLowerCase()) || {
    hex: settings.primaryColor || "#0284C7",
    accent: "#0369A1",
    border: "#7DD3FC",
    bgLight: "#F0F9FF",
    textOnPrimary: "#FFFFFF",
  };

  const primaryHex = swatch.hex;
  const bgLightHex = swatch.bgLight;

  // Sample items matching in.PNG
  const sampleItems = [
    {
      id: "1",
      name: "SAMSUNG A30",
      description: "samsung phone",
      hsn: "1234",
      qty: 1,
      unit: "PCS",
      altUnit: "1 Unit",
      freeQty: 0,
      rate: 10000,
      discount: 1000,
      discountPercent: 10,
      taxPercent: 18,
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
      description: "best biscuit",
      hsn: "40511209",
      qty: 1,
      unit: "BOX",
      altUnit: "24 PACKS",
      freeQty: 1,
      rate: 342.86,
      discount: 51.43,
      discountPercent: 15,
      taxPercent: 5,
      taxAmount: 14.57,
      total: 306,
      batchNo: "BAT-5512",
      expDate: "09/2026",
      mfgDate: "03/2025",
      priceHistory: "₹345.00 (Last Bill)",
    },
    {
      id: "3",
      name: "PUMA BLUE ROUND NECK T-SHIRT",
      description: "best quality dry fit cotton",
      hsn: "2032",
      qty: 2,
      unit: "PCS",
      altUnit: "2 Units",
      freeQty: 0,
      rate: 900,
      discount: 0,
      discountPercent: 0,
      taxPercent: 5,
      taxAmount: 90,
      total: 1890,
      batchNo: "BAT-1102",
      expDate: "N/A",
      mfgDate: "11/2024",
      priceHistory: "₹920.00 (Last Bill)",
    },
  ];

  const totalQty = 4;
  const totalDiscount = 1051.43;
  const totalTax = 1724.57;
  const subtotal = 12816.0;
  const taxableAmount = 11091.43;
  const totalAmount = 9596.5;
  const receivedAmount = 0.0;
  const balanceDue = 9596.5;

  const currentTerms =
    settings.termsAndConditions[settings.termsAndConditionsType] ||
    "1. Goods once sold will not be taken back or exchanged.\n2. All disputes are subject to local jurisdiction only.";

  const upiId = settings.selectedPaymentQrUpi || "credsmart@upi";
  const upiPayload = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    businessName
  )}&am=${totalAmount.toFixed(2)}&cu=INR&tn=Invoice-INV-2026-0042`;

  const selectedBank = settings.bankAccounts.find(
    (b) => b.id === settings.selectedBankAccountId
  ) || settings.bankAccounts[0] || {
    bankName: "HDFC Bank Ltd.",
    accountNumber: "50200084920194",
    ifsc: "HDFC0001429",
    branch: "Rajpur Road Branch",
    accountHolder: businessName,
  };

  const isLuxury = settings.theme === "luxury" || settings.autoApplyLuxury;
  const isAdvancedGst = settings.theme === "advanced_gst";
  const isModern = settings.theme === "modern";
  const isClassic = settings.theme === "classic";
  const isStylish = settings.theme === "stylish" && !isLuxury;

  return (
    <div className="w-full bg-slate-100 dark:bg-slate-900/60 p-2 sm:p-4 rounded-2xl border border-border/70 overflow-x-auto shadow-inner">
      {/* Invoice Document Paper Container */}
      <div
        id="live-invoice-paper"
        className={cn(
          "bg-white text-slate-800 rounded-xl shadow-xl min-w-[620px] max-w-[780px] mx-auto p-5 sm:p-7 transition-all duration-300 relative border",
          isLuxury && "border-amber-300/80 shadow-amber-900/10 font-serif",
          isAdvancedGst && "border-slate-800 font-mono text-[11px]",
          !isLuxury && !isAdvancedGst && "border-slate-200"
        )}
      >
        {/* Luxury Ribbon / Crest */}
        {isLuxury && (
          <div className="absolute top-0 right-0 overflow-hidden w-28 h-28 pointer-events-none">
            <div className="bg-gradient-to-r from-amber-600 to-yellow-500 text-white font-sans text-[9px] font-bold py-1 px-8 transform rotate-45 translate-x-7 translate-y-3 shadow-md uppercase tracking-wider text-center">
              LUXURY GOLD
            </div>
          </div>
        )}

        {/* Invoice Top Header Bar (Styling Variations) */}
        <div
          className={cn(
            "pb-4 border-b transition-colors",
            settings.styling === "uttarakhand" && "border-b-4",
            settings.styling === "uttarakhand_2" && "border-b-2 bg-gradient-to-r from-slate-50 to-white -mx-5 -mt-5 p-5 mb-4 rounded-t-xl",
            settings.styling === "jagganth" && "border-b-2 border-dashed",
            settings.styling === "uttar_pradesh" && "border-b-2 shadow-xs",
            settings.styling === "maharashtra" && "border-b-2",
            settings.styling === "gujarat" && "border-b-2 bg-slate-50/70 -mx-5 -mt-5 p-5 mb-4 rounded-t-xl"
          )}
          style={{ borderColor: primaryHex }}
        >
          <div className="flex items-start justify-between gap-4">
            {/* Business Logo & Info */}
            <div className="flex items-start gap-3.5 max-w-[60%]">
              {businessLogo ? (
                <img
                  src={businessLogo}
                  alt="Business Logo"
                  className="w-14 h-14 object-contain rounded-lg border border-slate-200 p-0.5 shrink-0 bg-white"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 shadow-xs"
                  style={{ backgroundColor: bgLightHex, color: primaryHex }}
                >
                  {businessName.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0">
                <h2
                  className={cn(
                    "text-lg font-black tracking-tight leading-tight",
                    isLuxury ? "font-serif text-slate-900" : "font-sans"
                  )}
                  style={{ color: isLuxury ? undefined : primaryHex }}
                >
                  {businessName}
                </h2>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{businessAddress}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-600 mt-1">
                  <span>
                    Phone: <strong className="font-semibold text-slate-800">{businessPhone}</strong>
                  </span>
                  <span>
                    Email: <strong className="font-semibold text-slate-800">{businessEmail}</strong>
                  </span>
                  {businessGstin && (
                    <span>
                      GSTIN: <strong className="font-mono font-bold text-slate-900">{businessGstin}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tax Invoice Badge & Metadata */}
            <div className="text-right">
              <div
                className="inline-block px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider mb-1.5 shadow-2xs"
                style={{ backgroundColor: primaryHex, color: swatch.textOnPrimary }}
              >
                TAX INVOICE
              </div>
              <div className="text-[11px] space-y-0.5">
                <p>
                  <span className="text-slate-500">Invoice No: </span>
                  <strong className="font-mono font-bold text-slate-900">INV-2026-0042</strong>
                </p>
                <p>
                  <span className="text-slate-500">Invoice Date: </span>
                  <strong className="font-semibold text-slate-800">21 Aug 2026</strong>
                </p>
                {settings.showTimestamp && (
                  <p>
                    <span className="text-slate-500">Time: </span>
                    <strong className="font-mono text-slate-700">02:35 PM</strong>
                  </p>
                )}
                {settings.showPoNumber && (
                  <p>
                    <span className="text-slate-500">PO No: </span>
                    <strong className="font-mono text-slate-800">{settings.poNumber || "PO-99182"}</strong>
                  </p>
                )}
                {settings.showEwayBill && (
                  <p>
                    <span className="text-slate-500">E-Way Bill: </span>
                    <strong className="font-mono text-slate-800">{settings.ewayBillNumber || "EWB-77182903"}</strong>
                  </p>
                )}
                {settings.showVehicleNumber && (
                  <p>
                    <span className="text-slate-500">Vehicle No: </span>
                    <strong className="font-mono text-slate-800">{settings.vehicleNumber || "UK-07-CA-1029"}</strong>
                  </p>
                )}
                {settings.invoiceCustomFields.map((cf) => (
                  <p key={cf.id}>
                    <span className="text-slate-500">{cf.label}: </span>
                    <strong className="font-medium text-slate-800">{cf.value}</strong>
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bill To / Ship To Details */}
        <div className="grid grid-cols-2 gap-4 py-3 border-b border-slate-200 text-xs">
          {/* Bill To */}
          <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200/80">
            <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-200">
              <span className="font-bold uppercase tracking-wider text-[10px]" style={{ color: primaryHex }}>
                BILL TO (CLIENT)
              </span>
              {settings.showPartyBalance && (
                <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                  Balance: ₹13,846.50
                </span>
              )}
            </div>
            <p className="font-bold text-slate-900 text-xs">M/s Krishna Traders &amp; Sons</p>
            <p className="text-[11px] text-slate-600">Plot 88, Industrial Area, Sector 4, Noida, UP - 201301</p>
            {settings.showPhoneNumber && (
              <p className="text-[11px] text-slate-600 mt-0.5">
                Phone: <span className="font-semibold text-slate-800">+91 98971 23456</span>
              </p>
            )}
            <p className="text-[11px] text-slate-600">
              GSTIN: <span className="font-mono font-semibold text-slate-800">09AAAPL1234C1ZV</span>
            </p>
            {settings.partyCustomFields.map((pcf) => (
              <p key={pcf.id} className="text-[11px] text-slate-600">
                {pcf.label}: <span className="font-medium text-slate-800">{pcf.value}</span>
              </p>
            ))}
          </div>

          {/* Ship To */}
          <div className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200/80">
            <div className="pb-1 mb-1 border-b border-slate-200">
              <span className="font-bold uppercase tracking-wider text-[10px]" style={{ color: primaryHex }}>
                SHIP TO (DELIVERY ADDRESS)
              </span>
            </div>
            <p className="font-bold text-slate-900 text-xs">M/s Krishna Traders Warehouse 2</p>
            <p className="text-[11px] text-slate-600">Godown No. 12, Transport Nagar, Ghaziabad, UP - 201009</p>
            <p className="text-[11px] text-slate-600">State / Code: Uttar Pradesh (09)</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr style={{ backgroundColor: primaryHex, color: swatch.textOnPrimary }} className="font-bold text-[11px]">
                <th className="py-2 px-2.5 text-center w-8">#</th>
                <th className="py-2 px-2.5">ITEMS</th>
                <th className="py-2 px-2.5 text-center">HSN</th>
                {settings.columns.batchNo && <th className="py-2 px-2 text-center">BATCH</th>}
                {settings.columns.expDate && <th className="py-2 px-2 text-center">EXP</th>}
                {settings.columns.mfgDate && <th className="py-2 px-2 text-center">MFG</th>}
                {settings.columns.customColumns.map((cc) => (
                  <th key={cc.id} className="py-2 px-2 text-center">{cc.label}</th>
                ))}
                {settings.columns.quantity && <th className="py-2 px-2.5 text-center">QTY</th>}
                {settings.columns.pricePerItem && <th className="py-2 px-2.5 text-right">RATE</th>}
                <th className="py-2 px-2.5 text-right">DISC.</th>
                <th className="py-2 px-2.5 text-right">TAX</th>
                <th className="py-2 px-2.5 text-right">AMOUNT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {sampleItems.map((item, idx) => (
                <tr key={item.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="py-2 px-2.5 text-center text-slate-500 font-mono">{idx + 1}</td>
                  <td className="py-2 px-2.5">
                    <p className="font-bold text-slate-900 leading-tight">{item.name}</p>
                    {settings.showItemDescription && (
                      <p className="text-[10px] text-slate-500 italic mt-0.5">{item.description}</p>
                    )}
                    {settings.showAlternateUnit && (
                      <p className="text-[9px] text-blue-600 font-mono">Alt: {item.altUnit}</p>
                    )}
                  </td>
                  <td className="py-2 px-2.5 text-center font-mono text-slate-600">{item.hsn}</td>

                  {settings.columns.batchNo && (
                    <td className="py-2 px-2 text-center font-mono text-[10px] text-slate-600">{item.batchNo}</td>
                  )}
                  {settings.columns.expDate && (
                    <td className="py-2 px-2 text-center font-mono text-[10px] text-slate-600">{item.expDate}</td>
                  )}
                  {settings.columns.mfgDate && (
                    <td className="py-2 px-2 text-center font-mono text-[10px] text-slate-600">{item.mfgDate}</td>
                  )}
                  {settings.columns.customColumns.map((cc) => (
                    <td key={cc.id} className="py-2 px-2 text-center font-mono text-[10px] text-slate-600">
                      {cc.defaultValue || "-"}
                    </td>
                  ))}

                  {settings.columns.quantity && (
                    <td className="py-2 px-2.5 text-center font-semibold">
                      <span>{item.qty} {item.unit}</span>
                      {settings.enableFreeQty && item.freeQty > 0 && (
                        <span className="block text-[9px] font-bold text-emerald-600 bg-emerald-50 rounded px-1 mt-0.5">
                          +{item.freeQty} Free
                        </span>
                      )}
                    </td>
                  )}

                  {settings.columns.pricePerItem && (
                    <td className="py-2 px-2.5 text-right font-mono">
                      <span>{item.rate.toLocaleString("en-IN")}</span>
                      {settings.priceHistory && (
                        <span className="block text-[8px] text-slate-400 font-sans">{item.priceHistory}</span>
                      )}
                    </td>
                  )}

                  <td className="py-2 px-2.5 text-right font-mono text-slate-600">
                    {item.discount > 0 ? (
                      <>
                        <span>{item.discount.toFixed(2)}</span>
                        <span className="block text-[9px] text-slate-400">({item.discountPercent}%)</span>
                      </>
                    ) : (
                      <span>0 (0%)</span>
                    )}
                  </td>

                  <td className="py-2 px-2.5 text-right font-mono text-slate-600">
                    <span>{item.taxAmount.toFixed(2)}</span>
                    <span className="block text-[9px] text-slate-400">({item.taxPercent}%)</span>
                  </td>

                  <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900">
                    {item.total.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}

              {/* Subtotal row */}
              <tr className="font-bold bg-slate-100/80 text-slate-900 border-t border-slate-300">
                <td colSpan={2} className="py-2 px-2.5 text-left font-black tracking-wider">
                  SUBTOTAL
                </td>
                <td className="py-2 px-2.5 text-center font-mono">-</td>
                {settings.columns.batchNo && <td className="py-2 px-2" />}
                {settings.columns.expDate && <td className="py-2 px-2" />}
                {settings.columns.mfgDate && <td className="py-2 px-2" />}
                {settings.columns.customColumns.map((cc) => (
                  <td key={cc.id} className="py-2 px-2" />
                ))}
                {settings.columns.quantity && (
                  <td className="py-2 px-2.5 text-center font-mono font-black">{totalQty}</td>
                )}
                {settings.columns.pricePerItem && <td className="py-2 px-2.5" />}
                <td className="py-2 px-2.5 text-right font-mono">₹ {totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                <td className="py-2 px-2.5 text-right font-mono">₹ {totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                <td className="py-2 px-2.5 text-right font-mono font-black">₹ {subtotal.toLocaleString("en-IN")}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bottom Section: Notes & Terms on Left, Calculations & Total on Right */}
        <div className="grid grid-cols-12 gap-4 mt-3 pt-3 border-t border-slate-200">
          {/* Left Notes, Bank, Terms */}
          <div className="col-span-7 space-y-2.5 text-[10px]">
            <div>
              <p className="font-bold uppercase tracking-wider text-slate-700">NOTES</p>
              <p className="text-slate-600">Sample Note: Thanks for your prompt business with us.</p>
            </div>

            <div>
              <p className="font-bold uppercase tracking-wider text-slate-700">TERMS AND CONDITIONS</p>
              <p className="text-slate-600 whitespace-pre-line leading-relaxed">{currentTerms}</p>
            </div>

            {/* Bank details card */}
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="font-bold text-slate-800 text-[10px]">Bank Details for NEFT/RTGS/IMPS:</p>
                <p className="text-slate-600">Bank: <strong className="text-slate-900">{selectedBank.bankName}</strong></p>
                <p className="text-slate-600">A/C No: <strong className="font-mono text-slate-900">{selectedBank.accountNumber}</strong></p>
                <p className="text-slate-600">IFSC: <strong className="font-mono text-slate-900">{selectedBank.ifsc}</strong> ({selectedBank.branch})</p>
              </div>

              {/* Dynamic QR Code */}
              <div className="text-center shrink-0 p-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <QRCodeSVG value={upiPayload} size={58} level="M" />
                <p className="text-[8px] font-bold text-slate-700 mt-0.5">Scan &amp; Pay UPI</p>
              </div>
            </div>
          </div>

          {/* Right Tax Summary & Grand Total */}
          <div className="col-span-5 space-y-1.5 text-xs text-right">
            <div className="space-y-1 text-[11px] pb-2 border-b border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-600">Taxable Amount:</span>
                <span className="font-mono font-semibold text-slate-800">
                  ₹ {taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">CGST @2.5%:</span>
                <span className="font-mono text-slate-700">₹ 52.29</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SGST @2.5%:</span>
                <span className="font-mono text-slate-700">₹ 52.29</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">CGST @9%:</span>
                <span className="font-mono text-slate-700">₹ 810.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SGST @9%:</span>
                <span className="font-mono text-slate-700">₹ 810.00</span>
              </div>
            </div>

            <div
              className="p-2 rounded-lg flex items-center justify-between text-sm font-black shadow-xs"
              style={{ backgroundColor: bgLightHex, color: primaryHex }}
            >
              <span>Total Amount:</span>
              <span className="font-mono text-base">₹ {totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between text-[11px] text-slate-600 pt-0.5">
              <span>Received Amount:</span>
              <span className="font-mono font-semibold text-slate-800">₹ {receivedAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-[11px] text-rose-600 font-bold">
              <span>Balance Due:</span>
              <span className="font-mono">₹ {balanceDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>

            {/* Total Amount in Words */}
            <div className="pt-2 text-left">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Total Amount (in words):</p>
              <p className="text-[10px] font-medium text-slate-800 italic">
                Nine Thousand Five Hundred Ninety Six Rupees and Fifty Paise Only
              </p>
            </div>

            {/* Signature Box */}
            <div className="pt-3 text-center flex flex-col items-end">
              <div className="w-36 min-h-[50px] border-b border-slate-400 flex items-center justify-center p-1">
                {settings.signatureDataUrl ? (
                  <img
                    src={settings.signatureDataUrl}
                    alt="Authorized Signature"
                    className="max-h-12 max-w-full object-contain filter contrast-125"
                  />
                ) : (
                  <span className="text-[9px] font-serif italic text-slate-400">For {businessName}</span>
                )}
              </div>
              <p className="text-[10px] font-bold text-slate-700 mt-0.5 text-right w-36">
                {settings.signatoryTitle || "Authorized Signatory"}
              </p>
            </div>
          </div>
        </div>

        {/* Invoice Footer Branding */}
        <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span>Invoice created using</span>
            <strong className="font-bold text-slate-700">CredSmart POS</strong>
            <span>by flobiz</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px]">Download now at</span>
            <span className="font-semibold text-slate-600">Google Play</span>
            <span>•</span>
            <span className="font-semibold text-slate-600">App Store</span>
          </div>
        </div>
      </div>
    </div>
  );
}
