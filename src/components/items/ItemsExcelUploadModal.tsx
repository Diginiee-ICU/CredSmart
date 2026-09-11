import { useState, useRef } from "react";
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { InventoryItem } from "@/types/inventory";
import {
  generateItemsSampleCSV,
  parseItemsCSV,
  downloadCSV,
} from "@/utils/excelImportExport";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : typeof error === "string" ? error : fallback;

interface ItemsExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: Partial<InventoryItem>[]) => Promise<void>;
}

export function ItemsExcelUploadModal({
  isOpen,
  onClose,
  onImport,
}: ItemsExcelUploadModalProps) {
  const [parsedItems, setParsedItems] = useState<Partial<InventoryItem>[]>([]);
  const [pastedText, setPastedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const csv = generateItemsSampleCSV();
    downloadCSV("CredSmart_Items_Import_Template.csv", csv);
    toast.success("Sample Excel/CSV Items template downloaded!");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const text = await file.text();
      if (!text) throw new Error("Empty file uploaded.");
      const parsed = parseItemsCSV(text);
      if (parsed.length === 0) {
        toast.error("No valid items found in the uploaded file. Please download the template and ensure headers match.");
      } else {
        setParsedItems(parsed);
        toast.success(`Successfully parsed ${parsed.length} items from file!`);
      }
    } catch (err: unknown) {
      console.error("Failed to parse uploaded CSV:", err);
      toast.error(getErrorMessage(err, "Failed to parse uploaded CSV. Ensure it is a valid text/CSV format matching the template."));
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      toast.error("Please paste CSV formatted rows.");
      return;
    }
    try {
      const parsed = parseItemsCSV(pastedText);
      if (parsed.length === 0) {
        toast.error("Could not parse rows. Ensure headers and columns match the template.");
      } else {
        setParsedItems(parsed);
        toast.success(`Parsed ${parsed.length} items!`);
      }
    } catch (err: unknown) {
      console.error("Failed to parse pasted CSV:", err);
      toast.error(getErrorMessage(err, "Could not parse pasted rows. Download the sample template and try again."));
    }
  };

  const handleConfirmImport = async () => {
    if (parsedItems.length === 0) return;
    setIsProcessing(true);
    try {
      await onImport(parsedItems);
      toast.success(`Imported ${parsedItems.length} items successfully!`);
      onClose();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to bulk import items."));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl sm:max-w-4xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[92vh] max-h-[85dvh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border flex items-center justify-between bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Bulk Upload Items via Excel</h2>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Import product catalog with barcodes, GST rates, HSN codes and opening stock
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 text-xs">
          {/* Step 1: Download Template */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between shadow-2xs">
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Step 1: Download Sample Items Template</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Formatted with Selling Price, Cost, GST %, Unit, and Barcode headers
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Download Template</span>
            </button>
          </div>

          {/* Step 2: Upload or Paste */}
          <div className="space-y-3">
            <p className="font-bold text-slate-900 dark:text-white">Step 2: Upload Your Excel / CSV File</p>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-teal-500/40 hover:border-teal-500/80 rounded-3xl p-5 sm:p-8 text-center cursor-pointer bg-gradient-to-b from-teal-500/10 via-emerald-500/5 to-transparent hover:from-teal-500/15 transition-all duration-200 shadow-inner group"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-teal-500/30 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6 stroke-[2.2]" />
              </div>
              <p className="font-black text-slate-900 dark:text-white text-sm">Click to browse or drop CSV/Excel file</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Supports .csv, .xlsx, .txt files with automatic column detection</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Or paste raw CSV rows:</span>
                {pastedText && (
                  <button
                    type="button"
                    onClick={handleParsePastedText}
                    className="text-xs font-bold text-teal-600 hover:underline cursor-pointer"
                  >
                    Parse Text
                  </button>
                )}
              </div>
              <Textarea
                placeholder="Item Name*,SKU Code,Barcode,Category*,Unit*,Selling Price*,Purchase Price*..."
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                rows={3}
                className="font-mono text-[11px] rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>

          {/* Parsed Preview */}
          {parsedItems.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Ready to Import ({parsedItems.length} Products)
                </span>
                <button
                  type="button"
                  onClick={() => setParsedItems([])}
                  className="text-xs text-rose-500 hover:text-rose-600 font-bold cursor-pointer"
                >
                  Clear All
                </button>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900 shadow-xs">
                {parsedItems.slice(0, 10).map((item, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        SKU: {item.sku} · {item.category} · {item.currentStock} {item.unit}
                      </p>
                    </div>
                    <div className="text-right font-mono">
                      <p className="font-black text-emerald-600 dark:text-emerald-400">₹ {item.sellingPrice}</p>
                      <p className="text-[10px] text-slate-500">Cost: ₹ {item.purchasePrice}</p>
                    </div>
                  </div>
                ))}
                {parsedItems.length > 10 && (
                  <div className="p-2 text-center text-slate-500 text-[11px] font-mono">
                    + {parsedItems.length - 10} more products
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing} className="text-xs cursor-pointer">
            Cancel
          </Button>
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={parsedItems.length === 0 || isProcessing}
            className="relative flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 disabled:opacity-50 text-white font-black text-xs shadow-[0_4px_16px_rgba(16,185,129,0.4)] hover:shadow-[0_6px_22px_rgba(16,185,129,0.55)] border border-emerald-400/40 active:scale-95 transition-all cursor-pointer disabled:cursor-not-allowed overflow-hidden group"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition-transform" />
            )}
            <span>Import {parsedItems.length} Products Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}
