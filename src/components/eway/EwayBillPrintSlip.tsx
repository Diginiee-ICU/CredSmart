import React, { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EwayBillRecord } from "@/types/ewayBill";
import { Printer, Download, Share2, X, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface EwayBillPrintSlipProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ewayBill: EwayBillRecord | null;
}

export const EwayBillPrintSlip: React.FC<EwayBillPrintSlipProps> = ({
  open,
  onOpenChange,
  ewayBill,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!ewayBill) return null;

  const qrPayload =
    ewayBill.qrCodeText ||
    `EWB:${ewayBill.ewayBillNo}|GSTIN:${ewayBill.fromGstin}|DOC:${ewayBill.docNo}|VAL:${ewayBill.totInvValue}|EXP:${ewayBill.validUpto}`;

  const formatDateTime = (isoStr?: string) => {
    if (!isoStr) return "-";
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDateOnly = (dateStr?: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    const toastId = toast.loading("Generating Form GST EWB-01 PDF...");
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
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

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`E-Way-Bill-${ewayBill.ewayBillNo}.pdf`);
      toast.success("E-Way Bill PDF downloaded successfully", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF slip", { id: toastId });
    }
  };

  const handleShare = () => {
    const text = `E-Way Bill Details:\nEWB No: ${ewayBill.ewayBillNo}\nDoc No: ${ewayBill.docNo}\nParty: ${ewayBill.toTrdName}\nVehicle: ${ewayBill.vehicleNo || "Awaiting Part-B"}\nValid Upto: ${formatDateTime(ewayBill.validUpto)}\nGenerated via CredSmart.`;
    if (navigator.share) {
      navigator.share({ title: `E-Way Bill ${ewayBill.ewayBillNo}`, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success("E-Way Bill summary copied to clipboard!");
    }
  };

  const isExpired = ewayBill.status === "expired" || (ewayBill.validUpto && new Date(ewayBill.validUpto).getTime() < Date.now());
  const isCancelled = ewayBill.status === "cancelled";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 max-h-[92vh] flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-800">
        {/* Modal Toolbar Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Official Form GST EWB-01 Slip
                {isCancelled ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-300">
                    CANCELLED
                  </span>
                ) : isExpired ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-300">
                    EXPIRED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-300 flex items-center gap-1">
                    <CheckCircle className="w-2.5 h-2.5" /> ACTIVE
                  </span>
                )}
              </DialogTitle>
              <p className="text-[11px] text-slate-500 font-mono">
                EWB: {ewayBill.ewayBillNo} • Valid Upto: {formatDateTime(ewayBill.validUpto)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="h-8 gap-1.5 text-xs font-semibold"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              className="h-8 gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download PDF</span>
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              className="h-8 gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </Button>
          </div>
        </div>

        {/* Printable Canvas Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950 flex justify-center">
          <div
            ref={printRef}
            className="w-full max-w-[780px] bg-white text-slate-900 shadow-md border border-slate-300 p-6 rounded-sm font-sans text-xs print:p-0 print:border-none print:shadow-none print:w-full"
            style={{ minHeight: "1000px" }}
          >
            {/* Government Title Header */}
            <div className="text-center pb-3 border-b-2 border-slate-900 relative">
              {isCancelled && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                  <span className="text-7xl font-black text-rose-600 -rotate-12 border-8 border-rose-600 px-8 py-2 uppercase tracking-widest">
                    CANCELLED
                  </span>
                </div>
              )}
              <h1 className="text-base font-black tracking-wider uppercase">
                FORM GST EWB-01
              </h1>
              <p className="text-[10px] text-slate-600 font-medium">
                (See Rule 138 of Central Goods and Services Tax Rules, 2017)
              </p>
              <p className="text-sm font-bold text-slate-900 tracking-wide mt-1">
                E-WAY BILL
              </p>
            </div>

            {/* Barcode & Key Identifiers Header */}
            <div className="grid grid-cols-3 items-center py-4 border-b border-slate-300 gap-4">
              {/* Barcode representation */}
              <div className="flex flex-col items-center justify-center">
                <Barcode
                  value={ewayBill.ewayBillNo}
                  width={1.4}
                  height={40}
                  fontSize={11}
                  margin={0}
                  displayValue={false}
                />
                <span className="text-[11px] font-mono font-bold tracking-wider mt-1 text-slate-800">
                  {ewayBill.ewayBillNo}
                </span>
              </div>

              {/* Central Metadata */}
              <div className="text-center space-y-1">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                    E-Way Bill Number
                  </span>
                  <span className="text-base font-mono font-black text-slate-900 tracking-wider">
                    {ewayBill.ewayBillNo}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                    Generated Date
                  </span>
                  <span className="text-xs font-semibold text-slate-800">
                    {formatDateTime(ewayBill.ewayBillDate)}
                  </span>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center justify-center">
                <div className="p-1.5 border border-slate-300 rounded bg-white">
                  <QRCodeSVG
                    value={qrPayload}
                    size={80}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <span className="text-[9px] text-slate-500 mt-1 font-mono">
                  Scan for Verification
                </span>
              </div>
            </div>

            {/* Validity Banner */}
            <div className="grid grid-cols-2 bg-slate-50 border-b border-slate-300 text-[11px] p-2.5 font-medium">
              <div>
                <span className="text-slate-500">Valid From: </span>
                <span className="font-bold text-slate-800">
                  {formatDateTime(ewayBill.ewayBillDate)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500">Valid Until: </span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatDateTime(ewayBill.validUpto)}
                </span>
              </div>
            </div>

            {/* PART-A Section */}
            <div className="mt-4">
              <div className="bg-slate-900 text-white font-bold px-3 py-1 text-xs uppercase tracking-wider flex justify-between items-center">
                <span>PART - A (Consignment Details)</span>
                <span className="text-[10px] font-normal text-slate-300">
                  Distance: {ewayBill.transDistance} KM
                </span>
              </div>

              <table className="w-full border-collapse border border-slate-300 mt-1 text-[11px]">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="w-1/4 p-2 bg-slate-50 font-bold border-r border-slate-200">
                      1. GSTIN of Supplier
                    </td>
                    <td className="w-1/4 p-2 font-mono font-bold border-r border-slate-200">
                      {ewayBill.fromGstin}
                    </td>
                    <td className="w-1/4 p-2 bg-slate-50 font-bold border-r border-slate-200">
                      Place of Dispatch
                    </td>
                    <td className="w-1/4 p-2">
                      {ewayBill.fromPlace} ({ewayBill.fromPincode}), State: {ewayBill.fromStateCode}
                    </td>
                  </tr>

                  <tr className="border-b border-slate-200">
                    <td className="p-2 bg-slate-50 font-bold border-r border-slate-200">
                      Supplier Trade Name
                    </td>
                    <td colSpan={3} className="p-2 font-semibold">
                      {ewayBill.fromTrdName} - {ewayBill.fromAddr1}
                    </td>
                  </tr>

                  <tr className="border-b border-slate-200">
                    <td className="p-2 bg-slate-50 font-bold border-r border-slate-200">
                      2. GSTIN of Recipient
                    </td>
                    <td className="p-2 font-mono font-bold border-r border-slate-200">
                      {ewayBill.toGstin || "URP (Unregistered)"}
                    </td>
                    <td className="p-2 bg-slate-50 font-bold border-r border-slate-200">
                      Place of Delivery
                    </td>
                    <td className="p-2">
                      {ewayBill.toPlace} ({ewayBill.toPincode}), State: {ewayBill.toStateCode}
                    </td>
                  </tr>

                  <tr className="border-b border-slate-200">
                    <td className="p-2 bg-slate-50 font-bold border-r border-slate-200">
                      Recipient Trade Name
                    </td>
                    <td colSpan={3} className="p-2 font-semibold">
                      {ewayBill.toTrdName} - {ewayBill.toAddr1}
                    </td>
                  </tr>

                  <tr className="border-b border-slate-200">
                    <td className="p-2 bg-slate-50 font-bold border-r border-slate-200">
                      3. Document Details
                    </td>
                    <td className="p-2 border-r border-slate-200">
                      <span className="font-semibold">{ewayBill.docType}</span> -{" "}
                      <span className="font-mono font-bold">{ewayBill.docNo}</span>
                    </td>
                    <td className="p-2 bg-slate-50 font-bold border-r border-slate-200">
                      Document Date
                    </td>
                    <td className="p-2 font-mono">
                      {formatDateOnly(ewayBill.docDate)}
                    </td>
                  </tr>

                  <tr className="border-b border-slate-200">
                    <td className="p-2 bg-slate-50 font-bold border-r border-slate-200">
                      4. Transaction Type
                    </td>
                    <td className="p-2 border-r border-slate-200">
                      {ewayBill.supplyType === "O" ? "Outward Supply" : "Inward Supply"}
                    </td>
                    <td className="p-2 bg-slate-50 font-bold border-r border-slate-200">
                      Sub-Supply Type
                    </td>
                    <td className="p-2 font-semibold">
                      Supply {ewayBill.subSupplyDesc ? `(${ewayBill.subSupplyDesc})` : ""}
                    </td>
                  </tr>

                  <tr className="border-b border-slate-200">
                    <td className="p-2 bg-slate-50 font-bold border-r border-slate-200">
                      5. Value of Goods
                    </td>
                    <td colSpan={3} className="p-2">
                      <div className="grid grid-cols-4 gap-2 text-[10px]">
                        <div>
                          <span className="text-slate-500 block">Taxable Amount:</span>
                          <span className="font-mono font-bold text-xs">
                            ₹{ewayBill.totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">CGST + SGST:</span>
                          <span className="font-mono font-semibold">
                            ₹{(ewayBill.cgstValue + ewayBill.sgstValue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">IGST:</span>
                          <span className="font-mono font-semibold">
                            ₹{ewayBill.igstValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block font-bold text-slate-800">Total Invoice Value:</span>
                          <span className="font-mono font-black text-xs text-indigo-700">
                            ₹{ewayBill.totInvValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>

                  <tr className="border-b border-slate-200">
                    <td className="p-2 bg-slate-50 font-bold border-r border-slate-200">
                      6. Transporter Details
                    </td>
                    <td colSpan={3} className="p-2">
                      {ewayBill.transporterName ? (
                        <span>
                          {ewayBill.transporterName}{" "}
                          {ewayBill.transporterId && (
                            <span className="font-mono text-slate-600">
                              (TRANSIN: {ewayBill.transporterId})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Self / By Road</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Items Table */}
            <div className="mt-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block mb-1">
                Itemized Consignment Manifest
              </span>
              <table className="w-full border-collapse border border-slate-300 text-[10px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                    <th className="p-1.5 text-left border-r border-slate-300 w-8">#</th>
                    <th className="p-1.5 text-left border-r border-slate-300">Product Name</th>
                    <th className="p-1.5 text-left border-r border-slate-300 w-20">HSN Code</th>
                    <th className="p-1.5 text-right border-r border-slate-300 w-16">Quantity</th>
                    <th className="p-1.5 text-right border-r border-slate-300 w-24">Taxable Amt (₹)</th>
                    <th className="p-1.5 text-right border-r border-slate-300 w-24">Tax Rate</th>
                    <th className="p-1.5 text-right w-24">Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {ewayBill.itemList.map((item, idx) => {
                    const itemTax = item.cgstAmount + item.sgstAmount + item.igstAmount + (item.cessAmount || 0);
                    const itemTotal = item.taxableAmount + itemTax;
                    const taxRateCombined = item.igstRate || (item.cgstRate + item.sgstRate);
                    return (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="p-1.5 border-r border-slate-200 text-center font-mono">
                          {idx + 1}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 font-medium">
                          {item.productName}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 font-mono text-slate-700">
                          {item.hsnCode}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">
                          {item.quantity} {item.qtyUnit}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">
                          {item.taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">
                          {taxRateCombined}%
                        </td>
                        <td className="p-1.5 text-right font-mono font-semibold">
                          {itemTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* PART-B Section */}
            <div className="mt-4">
              <div className="bg-slate-900 text-white font-bold px-3 py-1 text-xs uppercase tracking-wider flex justify-between items-center">
                <span>PART - B (Vehicle & Transit Information)</span>
                <span className="text-[10px] font-normal text-slate-300">
                  {ewayBill.vehicleNo ? "Vehicle Assigned" : "Vehicle Pending (Part-A Only)"}
                </span>
              </div>

              <table className="w-full border-collapse border border-slate-300 mt-1 text-[11px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700 text-[10px]">
                    <th className="p-1.5 text-left border-r border-slate-300">Mode</th>
                    <th className="p-1.5 text-left border-r border-slate-300">Vehicle / Trans Doc No</th>
                    <th className="p-1.5 text-left border-r border-slate-300">From Place</th>
                    <th className="p-1.5 text-left border-r border-slate-300">Entered Date</th>
                    <th className="p-1.5 text-left border-r border-slate-300">Entered By</th>
                    <th className="p-1.5 text-left">Multi-Veh Info / Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {ewayBill.vehicleNo ? (
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5 border-r border-slate-200 font-semibold">
                        {ewayBill.transMode === "1"
                          ? "Road"
                          : ewayBill.transMode === "2"
                          ? "Rail"
                          : ewayBill.transMode === "3"
                          ? "Air"
                          : "Ship"}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 font-mono font-bold text-slate-900">
                        {ewayBill.vehicleNo}
                        {ewayBill.transDocNo && (
                          <div className="text-[9px] text-slate-500 font-normal">
                            Doc: {ewayBill.transDocNo}
                          </div>
                        )}
                      </td>
                      <td className="p-1.5 border-r border-slate-200">
                        {ewayBill.fromPlace} ({ewayBill.fromStateCode})
                      </td>
                      <td className="p-1.5 border-r border-slate-200 font-mono text-[10px]">
                        {formatDateTime(ewayBill.ewayBillDate)}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 font-mono text-[10px]">
                        {ewayBill.fromGstin}
                      </td>
                      <td className="p-1.5 text-[10px] text-emerald-700 font-medium">
                        Initial Assignment
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-3 text-center text-amber-700 italic font-medium bg-amber-50/50">
                        Part-B is pending. Goods are ready for movement, awaiting transporter assignment or vehicle allocation.
                      </td>
                    </tr>
                  )}

                  {/* Vehicle History / Transshipments */}
                  {ewayBill.vehicleHistory && ewayBill.vehicleHistory.length > 0 && (
                    <>
                      {ewayBill.vehicleHistory.map((hist, hIdx) => (
                        <tr key={hIdx} className="border-b border-slate-200 bg-slate-50/50">
                          <td className="p-1.5 border-r border-slate-200 font-semibold">
                            {hist.transMode === "1" ? "Road" : hist.transMode === "2" ? "Rail" : "Other"}
                          </td>
                          <td className="p-1.5 border-r border-slate-200 font-mono font-bold text-slate-800">
                            {hist.vehicleNo}
                            {hist.transDocNo && (
                              <div className="text-[9px] text-slate-500 font-normal">
                                Doc: {hist.transDocNo}
                              </div>
                            )}
                          </td>
                          <td className="p-1.5 border-r border-slate-200">
                            {hist.fromPlace} ({hist.fromState})
                          </td>
                          <td className="p-1.5 border-r border-slate-200 font-mono text-[10px]">
                            {formatDateTime(hist.updatedAt)}
                          </td>
                          <td className="p-1.5 border-r border-slate-200 font-mono text-[10px]">
                            {ewayBill.fromGstin}
                          </td>
                          <td className="p-1.5 text-[10px] text-slate-700">
                            {hist.reasonCode} {hist.reasonRemarks ? `(${hist.reasonRemarks})` : ""}
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Statutory Disclaimer & Footer */}
            <div className="mt-8 pt-4 border-t border-slate-300 text-[9px] text-slate-500 flex justify-between items-end">
              <div className="space-y-0.5">
                <p className="font-semibold text-slate-700">
                  Notes & Statutory Compliance:
                </p>
                <p>
                  1. E-Way Bill is valid for transit across states as per Rule 138 of CGST / SGST Rules.
                </p>
                <p>
                  2. Goods must be accompanied by this Form GST EWB-01 slip along with the Invoice / Delivery Challan.
                </p>
                <p>
                  3. If vehicle breaks down or is changed mid-transit, Part-B must be updated before resuming journey.
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono text-slate-400">Powered by CredSmart ERP</p>
                <p className="font-bold text-slate-800">GST E-Way Bill System</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
