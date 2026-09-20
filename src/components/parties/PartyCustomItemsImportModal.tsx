import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Info,
  AlertCircle,
} from "lucide-react";
import { PartyCustomItem } from "@/types/parties";
import {
  generatePartyCustomItemsSampleCSV,
  parsePartyCustomItemsCSV,
  downloadCSV,
} from "@/utils/excelImportExport";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PartyCustomItemsImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  partyName?: string;
  catalogProducts: any /* eslint-disable-line @typescript-eslint/no-explicit-any */[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  onImport: (items: PartyCustomItem[], mode: "merge" | "replace") => void;
}

export function PartyCustomItemsImportModal({
  isOpen,
  onClose,
  partyName = "Party",
  catalogProducts,
  onImport,
}: PartyCustomItemsImportModalProps) {
  const [activeInputMode, setActiveInputMode] = useState<"file" | "paste">("file");
  const [pastedText, setPastedText] = useState("");
  const [parsedItems, setParsedItems] = useState<PartyCustomItem[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [matchedCount, setMatchedCount] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [isProcessing, setIsProcessing] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const csv = generatePartyCustomItemsSampleCSV();
    downloadCSV(`${partyName.replace(/[^a-zA-Z0-9_-]/g, "_")}_Custom_Items_Template.csv`, csv);
    toast.success("Sample Excel/CSV custom price list template downloaded!");
  };

  const processCSVText = (text: string) => {
    try {
      if (!text || !text.trim()) {
        throw new Error("Empty file or input provided.");
      }
      const res = parsePartyCustomItemsCSV(text, catalogProducts);
      setImportErrors(res.errors || []);
      
      if (res.items.length === 0) {
        toast.error("No valid product rows found. Please ensure headers match the template.");
        if (res.errors?.length) {
           toast.error(`Found ${res.errors.length} errors, check logs below.`);
        }
        return;
      }
      setParsedItems(res.items);
      setSelectedIndices(new Set(res.items.map((_, i) => i)));
      setMatchedCount(res.matchedCount);
      setNewCount(res.newCount);
      toast.success(`Successfully parsed ${res.items.length} items (${res.matchedCount} matched in master catalogue)!`);
    } catch (err: unknown) {
      console.error("Failed to parse party custom items CSV:", err);
      toast.error(err instanceof Error ? err.message : "Failed to parse CSV file. Download the sample template to check formatting.");
    }
  };

  const processUploadedFile = async (file: File) => {
    try {
      const filename = file.name.toLowerCase();
      let text = "";
      if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const firstSheetName = wb.SheetNames[0];
        if (!firstSheetName) throw new Error("No sheet found in Excel workbook.");
        const ws = wb.Sheets[firstSheetName];
        text = XLSX.utils.sheet_to_csv(ws);
      } else {
        text = await file.text();
      }
      processCSVText(text);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to read file.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processUploadedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processUploadedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      toast.error("Please paste CSV data rows first.");
      return;
    }
    processCSVText(pastedText);
  };

  const handleToggleSelectAll = () => {
    if (selectedIndices.size === parsedItems.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(parsedItems.map((_, i) => i)));
    }
  };

  const handleToggleRow = (idx: number) => {
    const next = new Set(selectedIndices);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedIndices(next);
  };

  const handleConfirmImport = () => {
    const chosen = parsedItems.filter((_, i) => selectedIndices.has(i));
    if (chosen.length === 0) {
      toast.error("Please select at least one item to import.");
      return;
    }

    setIsProcessing(true);
    try {
      onImport(chosen, importMode);
      toast.success(`Imported ${chosen.length} custom product rates for ${partyName}!`);
      onClose();
    } catch (err: unknown) {
      toast.error(err?.message || "Failed to import items.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-popover flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Bulk Import Products & Custom Rates for Party
              </h2>
              <p className="text-xs text-muted-foreground">
                Import product list with special rates for <strong>{partyName}</strong> from Excel / CSV
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Party Specific Scope Notice */}
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2.5 text-xs text-blue-700 dark:text-blue-300">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong>Party-Specific Notice:</strong> All products and custom rates imported here will be saved <u>only for this Party/Customer ({partyName})</u>. Standard prices in your master catalogue and for all other customers will remain completely unchanged.
            </div>
          </div>

          {/* Step 1: Download Template */}
          <div className="p-4 rounded-xl border border-border bg-muted/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="space-y-0.5">
              <p className="font-bold text-foreground flex items-center gap-2">
                <Download className="w-4 h-4 text-primary" />
                Step 1: Download Sample Excel / CSV Template
              </p>
              <p className="text-[11px] text-muted-foreground">
                Includes columns for Product Name, Custom Selling Price (₹), Standard Price, SKU, Barcode, and Category.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="gap-1.5 shrink-0 text-xs font-semibold cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              Download Template
            </Button>
          </div>

          {/* Step 2: Upload or Paste */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-bold text-foreground">Step 2: Upload Your File or Paste CSV Data</p>
              <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActiveInputMode("file")}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                    activeInputMode === "file"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInputMode("paste")}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                    activeInputMode === "paste"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Paste CSV
                </button>
              </div>
            </div>

            {activeInputMode === "file" ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all group gap-2",
                  isDragging
                    ? "border-primary bg-primary/15 scale-[1.01]"
                    : "border-border hover:border-primary/60 bg-muted/10 hover:bg-muted/30"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <div className="p-3 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-xs">
                    Click to browse or drag &amp; drop Excel/CSV file
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Supports <span className="font-semibold text-foreground">.xlsx, .xls, .csv, .txt</span> formats
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="mt-1 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs px-5 py-2 rounded-xl cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea
                  placeholder={`"Product Name","Custom Selling Price (₹)","Standard Catalogue Price (₹)","SKU Code","Barcode","Category"\n"Amul Pure Ghee 1L",550,590,"AML-01","890123","Dairy"`}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  className="font-mono text-xs min-h-[110px] resize-y"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleParsePastedText}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Parse Pasted Rows
                </Button>
              </div>
            )}
          </div>

          {importErrors.length > 0 && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl space-y-1.5 animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-bold text-xs">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Import Warnings / Skipped Rows ({importErrors.length})</span>
              </div>
              <ul className="text-[11px] text-red-500/80 dark:text-red-400/80 space-y-0.5 list-disc pl-4 max-h-24 overflow-y-auto">
                {importErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Step 3: Parsed Preview */}
          {parsedItems.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-border animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-foreground">
                    Step 3: Preview ({parsedItems.length} Products Found)
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold">
                    ✓ {matchedCount} Matched in Catalogue
                  </Badge>
                  {newCount > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20 font-semibold">
                      + {newCount} New Items
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleSelectAll}
                    className="text-xs h-7 px-2"
                  >
                    {selectedIndices.size === parsedItems.length ? "Deselect All" : "Select All"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setParsedItems([]);
                      setSelectedIndices(new Set());
                      setPastedText("");
                    }}
                    className="text-xs h-7 px-2 text-muted-foreground hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-border rounded-xl overflow-hidden bg-card shadow-2xs">
                <div className="max-h-[260px] overflow-y-auto divide-y divide-border">
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/60 text-[10px] font-bold text-muted-foreground uppercase tracking-wider sticky top-0 z-10">
                    <div className="col-span-1 text-center">Sel</div>
                    <div className="col-span-5">Product / SKU</div>
                    <div className="col-span-2 text-right">Standard SP</div>
                    <div className="col-span-2 text-right">Custom SP</div>
                    <div className="col-span-2 text-center">Price Delta</div>
                  </div>

                  {parsedItems.map((item, idx) => {
                    const isChecked = selectedIndices.has(idx);
                    const diff = item.customPrice - item.standardPrice;
                    const pct = item.standardPrice > 0 ? (diff / item.standardPrice) * 100 : 0;
                    const isCatalogueMatched = !item.productId.startsWith("custom-prod-");

                    return (
                      <div
                        key={idx}
                        onClick={() => handleToggleRow(idx)}
                        className={cn(
                          "grid grid-cols-12 gap-2 px-3 py-2 items-center cursor-pointer transition-colors text-xs",
                          isChecked ? "hover:bg-muted/40" : "opacity-40 bg-muted/10"
                        )}
                      >
                        <div className="col-span-1 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleRow(idx)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary accent-primary"
                          />
                        </div>

                        <div className="col-span-5 min-w-0 pr-1">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-semibold text-foreground truncate">
                              {item.productName}
                            </span>
                            {isCatalogueMatched ? (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shrink-0">
                                Matched
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-muted text-muted-foreground shrink-0">
                                New
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                            {item.sku && <span>SKU: {item.sku}</span>}
                            {item.barcode && <span>• Barcode: {item.barcode}</span>}
                            <span>• {item.category || "General"}</span>
                          </div>
                        </div>

                        <div className="col-span-2 text-right font-mono text-muted-foreground">
                          ₹{item.standardPrice.toLocaleString("en-IN")}
                        </div>

                        <div className="col-span-2 text-right font-mono font-bold text-primary">
                          ₹{item.customPrice.toLocaleString("en-IN")}
                        </div>

                        <div className="col-span-2 text-center">
                          {diff < 0 ? (
                            <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              {pct.toFixed(1)}% ({diff.toFixed(0)})
                            </span>
                          ) : diff > 0 ? (
                            <span className="inline-flex items-center text-[10px] font-semibold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">
                              +{pct.toFixed(1)}% (+{diff.toFixed(0)})
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Same</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Import Options Mode */}
              <div className="p-3 rounded-xl bg-muted/20 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="font-semibold text-foreground">Import Mode:</span>
                  <p className="text-[11px] text-muted-foreground">
                    Choose how imported items interact with existing items on this party
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="merge"
                      checked={importMode === "merge"}
                      onChange={() => setImportMode("merge")}
                      className="accent-primary"
                    />
                    <span>Merge / Update existing</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer ml-3">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === "replace"}
                      onChange={() => setImportMode("replace")}
                      className="accent-primary"
                    />
                    <span>Replace all existing</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border flex items-center justify-between bg-muted/20 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="cursor-pointer text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={parsedItems.length === 0 || selectedIndices.size === 0 || isProcessing}
            onClick={handleConfirmImport}
            className="gap-2 text-xs font-semibold cursor-pointer"
          >
            {isProcessing ? (
              <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Import {selectedIndices.size} Selected Items to Party
          </Button>
        </div>
      </div>
    </div>
  );
}
