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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        const parsed = parseItemsCSV(text);
        if (parsed.length === 0) {
          toast.error("No valid items found in the uploaded file.");
        } else {
          setParsedItems(parsed);
          toast.success(`Successfully parsed ${parsed.length} items from file!`);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      toast.error("Please paste CSV formatted rows.");
      return;
    }
    const parsed = parseItemsCSV(pastedText);
    if (parsed.length === 0) {
      toast.error("Could not parse rows. Ensure headers and columns match the template.");
    } else {
      setParsedItems(parsed);
      toast.success(`Parsed ${parsed.length} items!`);
    }
  };

  const handleConfirmImport = async () => {
    if (parsedItems.length === 0) return;
    setIsProcessing(true);
    try {
      await onImport(parsedItems);
      toast.success(`Imported ${parsedItems.length} items successfully!`);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to bulk import items.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl sm:max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Bulk Upload Items via Excel</h2>
              <p className="text-xs text-muted-foreground">
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
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Step 1: Download Template */}
          <div className="p-4 rounded-xl border border-border bg-muted/20 flex items-center justify-between">
            <div>
              <p className="font-bold text-foreground">Step 1: Download Sample Items Template</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Formatted with Selling Price, Cost, GST %, Unit, and Barcode headers
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={handleDownloadTemplate} className="gap-1.5 shrink-0">
              <Download className="w-4 h-4" />
              Download Template
            </Button>
          </div>

          {/* Step 2: Upload or Paste */}
          <div className="space-y-3">
            <p className="font-bold text-foreground">Step 2: Upload Your File</p>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-primary/50 rounded-2xl p-6 text-center cursor-pointer bg-muted/10 hover:bg-muted/30 transition-colors"
            >
              <Upload className="w-8 h-8 mx-auto text-primary mb-2" />
              <p className="font-semibold text-foreground text-sm">Click to browse or drop CSV/Excel file</p>
              <p className="text-[11px] text-muted-foreground mt-1">Supports .csv, .txt files</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground">Or paste raw CSV rows:</span>
                {pastedText && (
                  <Button size="sm" variant="ghost" onClick={handleParsePastedText} className="h-6 text-[11px]">
                    Parse Text
                  </Button>
                )}
              </div>
              <Textarea
                placeholder="Item Name*,SKU Code,Barcode,Category*,Unit*,Selling Price*,Purchase Price*..."
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                rows={3}
                className="font-mono text-[11px]"
              />
            </div>
          </div>

          {/* Parsed Preview */}
          {parsedItems.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">
                  Ready to Import ({parsedItems.length} Products)
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setParsedItems([])}
                  className="h-6 text-xs text-rose-500 hover:text-rose-600 gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </Button>
              </div>

              <div className="border border-border rounded-xl max-h-48 overflow-y-auto divide-y divide-border">
                {parsedItems.slice(0, 10).map((item, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between text-xs hover:bg-muted/30">
                    <div>
                      <p className="font-semibold text-foreground">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        SKU: {item.sku} · {item.category} · {item.currentStock} {item.unit}
                      </p>
                    </div>
                    <div className="text-right font-mono">
                      <p className="font-bold text-foreground">₹ {item.sellingPrice}</p>
                      <p className="text-[10px] text-muted-foreground">Cost: ₹ {item.purchasePrice}</p>
                    </div>
                  </div>
                ))}
                {parsedItems.length > 10 && (
                  <div className="p-2 text-center text-muted-foreground text-[11px]">
                    + {parsedItems.length - 10} more products
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-muted/40 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirmImport}
            disabled={parsedItems.length === 0 || isProcessing}
            className="gap-1.5 font-bold"
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Import {parsedItems.length} Products Now
          </Button>
        </div>
      </div>
    </div>
  );
}
