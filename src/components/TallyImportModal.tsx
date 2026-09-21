import { useState, useRef, useCallback } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Package,
  Users2,
  ShoppingCart,
  Truck,
  Building2,
  ChevronRight,
  RotateCw,
  ExternalLink,
  Info,
  Layers,
  FileText,
  ArrowRight,
  Check,
  Trash2,
  Eye,
  Download,
  Landmark,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  autoDetectAndParseTally,
  TallyParseResult,
  TallyBankAccount,
  TallyVoucher,
} from "@/utils/tallyXmlParser";
import {
  SOFTWARE_PROFILES,
  SupportedSoftware,
  UniversalImportData,
  parseMultipleUniversalFiles,
} from "@/utils/universalDataImporter";
import { InventoryItem } from "@/types/inventory";
import { Party } from "@/types/parties";

// ─── Types ────────────────────────────────────────────────────────────────────

type ConflictMode = "skip" | "overwrite" | "merge";
type WizardStep = "upload" | "preview" | "options" | "importing" | "done";

export interface TallyImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportItems?: (items: Partial<InventoryItem>[], conflictMode?: ConflictMode) => Promise<void>;
  onImportParties?: (parties: Partial<Party>[], conflictMode?: ConflictMode) => Promise<void>;
  onImportBankAccounts?: (banks: TallyBankAccount[], cashInHand: number) => Promise<void>;
  onImportVouchers?: (vouchers: TallyVoucher[], conflictMode?: ConflictMode) => Promise<void>;
  defaultTab?: "items" | "parties" | "all";
  initialSoftware?: SupportedSoftware;
}

interface ImportStats {
  itemsImported: number;
  partiesImported: number;
  banksImported: number;
  vouchersImported: number;
  itemsFailed: number;
  partiesFailed: number;
  banksFailed: number;
  vouchersFailed: number;
  errors: string[];
}

// ─── Step Indicators ─────────────────────────────────────────────────────────

const STEPS: { id: WizardStep; label: string }[] = [
  { id: "upload", label: "Upload File" },
  { id: "preview", label: "Preview" },
  { id: "options", label: "Options" },
  { id: "importing", label: "Importing" },
  { id: "done", label: "Done" },
];

// ─── Export Guide Data ────────────────────────────────────────────────────────

const TALLY_EXPORT_GUIDES = [
  {
    title: "Stock Items (Products & Inventory)",
    icon: Package,
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    steps: [
      "Open Tally Prime → Gateway of Tally → Stock Summary",
      "Press Alt+E → Select \"XML Format\" (recommended) or \"Spreadsheet (CSV)\"",
      "Choose date range → Export All → Save the file",
      "Upload the exported XML/CSV file below",
    ],
    tip: "For XML export: Gateway → Data → Export Data → Stock Items",
  },
  {
    title: "Parties / Ledgers (Customers & Suppliers)",
    icon: Users2,
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    steps: [
      "Open Tally Prime → Gateway → Display More Reports → Account Books → Ledger",
      "Press Alt+E → Select \"XML Format\" for complete data",
      "Or: Gateway → Masters → Export → All Ledgers → XML",
      "Upload the exported file below",
    ],
    tip: "XML export includes GSTIN, PAN, addresses and opening balances",
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export function TallyImportModal({
  isOpen,
  onClose,
  onImportItems,
  onImportParties,
  onImportBankAccounts,
  onImportVouchers,
  defaultTab = "all",
  initialSoftware = "auto",
}: TallyImportModalProps) {
  const [step, setStep] = useState<WizardStep>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedSoftware, setSelectedSoftware] = useState<SupportedSoftware>(initialSoftware);
  const [universalData, setUniversalData] = useState<UniversalImportData | null>(null);
  const [parseResult, setParseResult] = useState<TallyParseResult | null>(null);
  const [uploadedFilename, setUploadedFilename] = useState("");
  const [importItems, setImportItems] = useState(true);
  const [importParties, setImportParties] = useState(true);
  const [importBanks, setImportBanks] = useState(true);
  const [importVouchers, setImportVouchers] = useState(true);
  const [conflictMode, setConflictMode] = useState<ConflictMode>("skip");
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [previewTab, setPreviewTab] = useState<"items" | "parties" | "banks" | "vouchers">("items");
  const [showGuide, setShowGuide] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalVouchersCount = parseResult
    ? (parseResult.paymentVouchers?.length || 0) +
      (parseResult.receiptVouchers?.length || 0) +
      (parseResult.salesVouchers?.length || 0) +
      (parseResult.purchaseVouchers?.length || 0) +
      (parseResult.journalVouchers?.length || 0)
    : 0;

  // ── File Handling ────────────────────────────────────────────────────────

  const handleFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`File "${file.name}" exceeds 50MB limit.`);
        return;
      }
    }

    try {
      const data = await parseMultipleUniversalFiles(files, selectedSoftware);
      setUniversalData(data);
      setUploadedFilename(files.map((f) => f.name).join(", "));

      const syntheticResult: TallyParseResult = {
        items: data.items,
        parties: data.parties.all,
        salesVouchers: data.vouchers.filter((v) => v.voucherType === "Sales"),
        purchaseVouchers: data.vouchers.filter((v) => v.voucherType === "Purchase"),
        paymentVouchers: data.vouchers.filter((v) => v.voucherType === "Payment"),
        receiptVouchers: data.vouchers.filter((v) => v.voucherType === "Receipt"),
        journalVouchers: data.vouchers.filter((v) => v.voucherType === "Journal"),
        bankAccounts: data.bankAccounts.map((b) => ({
          accountName: b.accountName,
          accountNumber: b.accountNumber,
          ifsc: b.ifsc,
          balance: b.balance,
          isDr: b.balance >= 0,
        })),
        cashInHand: data.cashInHand,
        companyName: data.companyName,
        companyGstin: data.companyGstin,
        totalEntities: data.items.length + data.parties.all.length + data.bankAccounts.length + data.vouchers.length,
        warnings: data.warnings,
        source: data.detectedSoftware === "tally" ? "xml" : "csv",
      };

      setParseResult(syntheticResult);

      if (data.warnings.length > 0) {
        data.warnings.forEach((w) => toast.warning(w));
      }

      if (syntheticResult.totalEntities > 0) {
        const softName = SOFTWARE_PROFILES[data.detectedSoftware]?.name || "Accounting File";
        toast.success(
          `Detected ${data.items.length} items, ${data.parties.all.length} parties from ${softName}!`
        );
        setStep("preview");
      } else {
        toast.error("No recognizable items or parties found. Please verify column headers.");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to parse file";
      toast.error(msg);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    e.target.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSoftware]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  // ── Import Logic ─────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (!parseResult) return;
    setStep("importing");
    setIsImporting(true);

    const stats: ImportStats = {
      itemsImported: 0,
      partiesImported: 0,
      banksImported: 0,
      vouchersImported: 0,
      itemsFailed: 0,
      partiesFailed: 0,
      banksFailed: 0,
      vouchersFailed: 0,
      errors: [],
    };

    try {
      if (importItems && parseResult.items.length > 0 && onImportItems) {
        try {
          await onImportItems(parseResult.items, conflictMode);
          stats.itemsImported = parseResult.items.length;
        } catch (e: unknown) {
          stats.itemsFailed = parseResult.items.length;
          stats.errors.push(`Items import failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      if (importParties && parseResult.parties.length > 0 && onImportParties) {
        try {
          await onImportParties(parseResult.parties, conflictMode);
          stats.partiesImported = parseResult.parties.length;
        } catch (e: unknown) {
          stats.partiesFailed = parseResult.parties.length;
          stats.errors.push(`Parties import failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      if (importBanks && parseResult.bankAccounts.length > 0 && onImportBankAccounts) {
        try {
          await onImportBankAccounts(parseResult.bankAccounts, parseResult.cashInHand);
          stats.banksImported = parseResult.bankAccounts.length;
        } catch (e: unknown) {
          stats.banksFailed = parseResult.bankAccounts.length;
          stats.errors.push(`Bank accounts import failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      const allVouchers = [
        ...parseResult.salesVouchers,
        ...parseResult.purchaseVouchers,
        ...parseResult.paymentVouchers,
        ...parseResult.receiptVouchers,
        ...parseResult.journalVouchers,
      ];
      if (importVouchers && allVouchers.length > 0 && onImportVouchers) {
        try {
          await onImportVouchers(allVouchers, conflictMode);
          stats.vouchersImported = allVouchers.length;
        } catch (e: unknown) {
          stats.vouchersFailed = allVouchers.length;
          stats.errors.push(`Ledger vouchers import failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    } finally {
      setIsImporting(false);
      setImportStats(stats);
      setStep("done");
    }
  };

  const handleReset = () => {
    setStep("upload");
    setParseResult(null);
    setUploadedFilename("");
    setImportStats(null);
    setIsImporting(false);
  };

  // ── Render ───────────────────────────────────────────────────────────────

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">

        {/* ── Header ── */}
        <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                Tally Data Import Wizard
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20 font-mono hidden sm:inline-flex">
                  Tally Prime / ERP 9
                </Badge>
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Import complete Stock Items & Parties/Ledgers from Tally XML or CSV exports
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Progress Steps ── */}
        <div className="px-5 py-3 border-b border-border bg-muted/20 shrink-0">
          <div className="flex items-center gap-1 sm:gap-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1 sm:gap-2">
                <div className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors",
                  i < stepIndex ? "text-emerald-600 bg-emerald-500/10" :
                  i === stepIndex ? "text-primary bg-primary/10" :
                  "text-muted-foreground"
                )}>
                  {i < stepIndex ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center text-[9px] font-bold border-current">
                      {i + 1}
                    </span>
                  )}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">

          {/* ── Step: Upload ── */}
          {step === "upload" && (
            <div className="p-5 space-y-5">
              {/* Software Selection Tool Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                    Select Your Accounting Software
                  </p>
                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30 font-bold">
                    1-Click Migration
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.values(SOFTWARE_PROFILES).map((soft) => {
                    const isSelected = selectedSoftware === soft.id;
                    return (
                      <button
                        key={soft.id}
                        type="button"
                        onClick={() => setSelectedSoftware(soft.id)}
                        className={cn(
                          "flex flex-col items-start p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer select-none",
                          isSelected
                            ? cn("ring-2 ring-amber-500 shadow-sm bg-gradient-to-br", soft.color, "text-white")
                            : "bg-card hover:bg-muted/60 border-border text-foreground hover:border-border/80"
                        )}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-xs font-black truncate">{soft.shortName}</span>
                          <span
                            className={cn(
                              "text-[8.5px] font-bold px-1.5 py-0.2 rounded-full uppercase shrink-0",
                              isSelected
                                ? "bg-white/25 text-white"
                                : cn(soft.badgeBg, soft.badgeText)
                            )}
                          >
                            {soft.badge}
                          </span>
                        </div>
                        <p className={cn("text-[9.5px] line-clamp-2 leading-tight", isSelected ? "text-white/85" : "text-muted-foreground")}>
                          {soft.tagline}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Drag-drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                  "p-8 sm:p-10 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 text-center transition-all duration-200 cursor-pointer",
                  isDragging
                    ? "border-amber-500 bg-amber-500/10 scale-[1.01]"
                    : "border-amber-500/40 hover:border-amber-500/70 bg-gradient-to-b from-amber-500/5 to-transparent hover:bg-amber-500/8"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-transform",
                  isDragging ? "scale-110" : "",
                  "bg-gradient-to-tr from-amber-600 to-amber-400 text-white"
                )}>
                  <Upload className="w-8 h-8 stroke-[2]" />
                </div>
                <div>
                  <p className="font-black text-base text-foreground">
                    Drop your {SOFTWARE_PROFILES[selectedSoftware]?.name} file(s) here
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Supports <span className="font-semibold text-foreground">{SOFTWARE_PROFILES[selectedSoftware]?.supportedFormats.join(", ")}</span> formats
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Drop a single file or multiple sheets (e.g. items + parties together)
                  </p>
                </div>
                <Button
                  type="button"
                  className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Choose File(s)
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".xml,.csv,.xlsx,.xls,.txt"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </div>

              {/* Selected Software Quick Guide */}
              <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-foreground">
                      {SOFTWARE_PROFILES[selectedSoftware]?.exportGuide.title}
                    </span>
                  </div>
                  {SOFTWARE_PROFILES[selectedSoftware]?.exportGuide.shortcut && (
                    <kbd className="px-2 py-0.5 rounded bg-muted border border-border text-[10px] font-mono text-muted-foreground">
                      {SOFTWARE_PROFILES[selectedSoftware]?.exportGuide.shortcut}
                    </kbd>
                  )}
                </div>
                <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground">
                  {SOFTWARE_PROFILES[selectedSoftware]?.exportGuide.steps.map((st, sIdx) => (
                    <li key={sIdx} className="leading-relaxed">{st}</li>
                  ))}
                </ol>
              </div>

              {showGuide && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  {TALLY_EXPORT_GUIDES.map((guide) => (
                    <div key={guide.title} className={cn("p-4 rounded-xl border", guide.bg, guide.border)}>
                      <div className="flex items-center gap-2 mb-3">
                        <guide.icon className={cn("w-4 h-4", guide.color)} />
                        <p className="text-xs font-bold text-foreground">{guide.title}</p>
                      </div>
                      <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-muted-foreground">
                        {guide.steps.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ol>
                      <div className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                        <Layers className="w-3 h-3 mt-0.5 shrink-0" />
                        <span><strong>Tip:</strong> {guide.tip}</span>
                      </div>
                    </div>
                  ))}
                  <a
                    href="https://help.tallysolutions.com/tally-prime/working-with-data/export-data/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Official Tally Export Documentation
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ── Step: Preview ── */}
          {step === "preview" && parseResult && (
            <div className="p-5 space-y-4">
              {/* Summary bar */}
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
                    Successfully Parsed — {uploadedFilename}
                  </span>
                </div>
                <div className="flex items-center gap-3 ml-auto flex-wrap">
                  {parseResult.items.length > 0 && (
                    <Badge className="gap-1.5 bg-amber-500/15 text-amber-700 border-amber-500/20 text-xs font-bold">
                      <Package className="w-3 h-3" />
                      {parseResult.items.length} Items
                    </Badge>
                  )}
                  {parseResult.parties.length > 0 && (
                    <Badge className="gap-1.5 bg-blue-500/15 text-blue-700 border-blue-500/20 text-xs font-bold">
                      <Users2 className="w-3 h-3" />
                      {parseResult.parties.length} Parties
                    </Badge>
                  )}
                  {(parseResult.bankAccounts?.length > 0 || parseResult.cashInHand > 0) && (
                    <Badge className="gap-1.5 bg-emerald-500/15 text-emerald-700 border-emerald-500/20 text-xs font-bold">
                      <Landmark className="w-3 h-3" />
                      {parseResult.bankAccounts?.length || 0} Banks {parseResult.cashInHand > 0 ? "+ Cash" : ""}
                    </Badge>
                  )}
                  {totalVouchersCount > 0 && (
                    <Badge className="gap-1.5 bg-indigo-500/15 text-indigo-700 border-indigo-500/20 text-xs font-bold">
                      <FileText className="w-3 h-3" />
                      {totalVouchersCount} Vouchers
                    </Badge>
                  )}
                  {parseResult.companyName && (
                    <Badge variant="outline" className="gap-1.5 text-xs font-mono">
                      <Building2 className="w-3 h-3" />
                      {parseResult.companyName}
                    </Badge>
                  )}
                  <Badge variant="outline" className={cn("text-[10px] font-mono", parseResult.source === "xml" ? "text-amber-600" : "text-blue-600")}>
                    {parseResult.source.toUpperCase()}
                  </Badge>
                </div>
              </div>

              {/* Warnings */}
              {parseResult.warnings.length > 0 && (
                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1.5">
                  {parseResult.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Preview Tabs */}
              <div className="flex items-center border-b border-border gap-1">
                {parseResult.items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPreviewTab("items")}
                    className={cn(
                      "px-4 py-2 text-xs font-semibold border-b-2 transition-colors",
                      previewTab === "items" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Items ({parseResult.items.length})
                  </button>
                )}
                {parseResult.parties.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPreviewTab("parties")}
                    className={cn(
                      "px-4 py-2 text-xs font-semibold border-b-2 transition-colors",
                      previewTab === "parties" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Parties & Ledgers ({parseResult.parties.length})
                  </button>
                )}
                {(parseResult.bankAccounts?.length > 0 || parseResult.cashInHand > 0) && (
                  <button
                    type="button"
                    onClick={() => setPreviewTab("banks")}
                    className={cn(
                      "px-4 py-2 text-xs font-semibold border-b-2 transition-colors",
                      previewTab === "banks" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Bank & Cash ({parseResult.bankAccounts?.length || 0})
                  </button>
                )}
                {totalVouchersCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setPreviewTab("vouchers")}
                    className={cn(
                      "px-4 py-2 text-xs font-semibold border-b-2 transition-colors",
                      previewTab === "vouchers" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Ledger Vouchers ({totalVouchersCount})
                  </button>
                )}
              </div>

              {/* Preview Table */}
              <div className="border border-border rounded-xl overflow-hidden max-h-80 overflow-y-auto scrollbar-thin">
                {previewTab === "items" && (
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Item Name</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground hidden sm:table-cell">Category</th>
                        <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Stock</th>
                        <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Purchase ₹</th>
                        <th className="text-right px-3 py-2 font-semibold text-muted-foreground hidden sm:table-cell">GST%</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground hidden sm:table-cell">HSN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {parseResult.items.slice(0, 200).map((item, i) => (
                        <tr key={i} className="hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2 font-medium text-foreground truncate max-w-[180px]">{item.name}</td>
                          <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{item.category || "General"}</td>
                          <td className="px-3 py-2 text-right font-mono">{item.openingStock ?? 0} {item.unit}</td>
                          <td className="px-3 py-2 text-right font-mono">₹{(item.purchasePrice ?? 0).toFixed(2)}</td>
                          <td className="px-3 py-2 text-right hidden sm:table-cell">{item.gstRate ?? 18}%</td>
                          <td className="px-3 py-2 font-mono text-muted-foreground hidden sm:table-cell">{item.hsnCode || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {previewTab === "parties" && (
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Party Name</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground hidden sm:table-cell">Type</th>
                        <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Balance ₹</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground hidden sm:table-cell">GSTIN</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground hidden md:table-cell">Phone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {parseResult.parties.slice(0, 200).map((party, i) => (
                        <tr key={i} className="hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2 font-medium text-foreground truncate max-w-[180px]">{party.name}</td>
                          <td className="px-3 py-2 hidden sm:table-cell">
                            <Badge variant="outline" className={cn(
                              "text-[10px] font-semibold",
                              party.partyType === "customer" ? "text-blue-600 border-blue-200" :
                              party.partyType === "supplier" ? "text-purple-600 border-purple-200" :
                              "text-slate-600 border-slate-200"
                            )}>
                              {party.partyType?.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            <span className={cn(
                              "font-bold",
                              (party.balance ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                            )}>
                              {(party.balance ?? 0) >= 0 ? "+" : ""}₹{Math.abs(party.balance ?? 0).toLocaleString("en-IN")}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-muted-foreground text-[10px] hidden sm:table-cell">{party.gstin || "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">{party.phone || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {previewTab === "banks" && (
                  <div className="p-3 space-y-3">
                    {parseResult.cashInHand > 0 && (
                      <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-emerald-600" />
                          <div>
                            <p className="text-xs font-bold text-foreground">Cash-in-Hand Ledger</p>
                            <p className="text-[10px] text-muted-foreground">Tally Cash Account Balance</p>
                          </div>
                        </div>
                        <p className="font-mono font-bold text-sm text-emerald-600">
                          ₹{parseResult.cashInHand.toLocaleString("en-IN")}
                        </p>
                      </div>
                    )}
                    {parseResult.bankAccounts?.length > 0 ? (
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Bank Ledger Name</th>
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Account No.</th>
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">IFSC</th>
                            <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Balance ₹</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {parseResult.bankAccounts.map((b, i) => (
                            <tr key={i} className="hover:bg-muted/30 transition-colors">
                              <td className="px-3 py-2 font-medium text-foreground flex items-center gap-2">
                                <Landmark className="w-3.5 h-3.5 text-primary shrink-0" />
                                {b.name}
                              </td>
                              <td className="px-3 py-2 font-mono text-muted-foreground">{b.accountNumber || "—"}</td>
                              <td className="px-3 py-2 font-mono text-muted-foreground">{b.ifscCode || "—"}</td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600">
                                ₹{b.balance.toLocaleString("en-IN")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">No bank accounts detected in this export.</p>
                    )}
                  </div>
                )}

                {previewTab === "vouchers" && (
                  <div className="p-4 space-y-2">
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-blue-700 dark:text-blue-400">
                        <strong>Complete Ledger Statement Import:</strong> All vouchers (Sales, Purchases, Receipts, Payments, Journals) are parsed with original dates, amounts, item line details, and voucher references.
                      </p>
                    </div>
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Voucher #</th>
                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Type</th>
                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Party / Details</th>
                          <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Amount</th>
                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {[
                          ...(parseResult.salesVouchers || []),
                          ...(parseResult.purchaseVouchers || []),
                          ...(parseResult.receiptVouchers || []),
                          ...(parseResult.paymentVouchers || []),
                          ...(parseResult.journalVouchers || []),
                        ].slice(0, 100).map((v, i) => (
                          <tr key={i} className="hover:bg-muted/30">
                            <td className="px-3 py-2 font-mono text-xs font-medium">{v.voucherNumber}</td>
                            <td className="px-3 py-2">
                              <Badge variant="outline" className={cn(
                                "text-[10px]",
                                v.voucherType === "Receipt" ? "text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20" :
                                v.voucherType === "Payment" ? "text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950/20" :
                                v.voucherType === "Sales" ? "text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/20" :
                                v.voucherType === "Purchase" ? "text-purple-600 border-purple-300 bg-purple-50 dark:bg-purple-950/20" :
                                "text-slate-600 border-slate-300 bg-slate-50 dark:bg-slate-900/20"
                              )}>
                                {v.voucherType}
                              </Badge>
                            </td>
                            <td className="px-3 py-2">
                              <div className="font-medium text-foreground truncate max-w-[160px]">{v.partyName || "—"}</div>
                              {v.items && v.items.length > 0 && (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  ({v.items.length} line item{v.items.length > 1 ? "s" : ""})
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold">₹{v.amount.toLocaleString("en-IN")}</td>
                            <td className="px-3 py-2 font-mono text-muted-foreground">{v.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {parseResult.items.length > 200 || parseResult.parties.length > 200 ? (
                <p className="text-[11px] text-muted-foreground text-center">
                  Showing first 200 records for preview. All {parseResult.totalEntities} records will be imported.
                </p>
              ) : null}
            </div>
          )}

          {/* ── Step: Options ── */}
          {step === "options" && parseResult && (
            <div className="p-5 space-y-5">
              <p className="text-sm font-bold text-foreground">Configure Import Options</p>

              {/* Entity selection */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Select What to Import</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {parseResult.items.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setImportItems(!importItems)}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all",
                        importItems
                          ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20"
                          : "border-border bg-card hover:border-amber-300"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-amber-600" />
                          <span className="text-xs font-bold text-foreground">Stock Items</span>
                        </div>
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                          importItems ? "border-amber-500 bg-amber-500" : "border-muted-foreground"
                        )}>
                          {importItems && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{parseResult.items.length} items detected</p>
                    </button>
                  )}

                  {parseResult.parties.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setImportParties(!importParties)}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all",
                        importParties
                          ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20"
                          : "border-border bg-card hover:border-blue-300"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Users2 className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-bold text-foreground">Parties & Ledgers</span>
                        </div>
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                          importParties ? "border-blue-500 bg-blue-500" : "border-muted-foreground"
                        )}>
                          {importParties && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{parseResult.parties.length} parties detected (with opening balance)</p>
                    </button>
                  )}

                  {(parseResult.bankAccounts?.length > 0 || parseResult.cashInHand > 0) && (
                    <button
                      type="button"
                      onClick={() => setImportBanks(!importBanks)}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all",
                        importBanks
                          ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20"
                          : "border-border bg-card hover:border-emerald-300"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Landmark className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-bold text-foreground">Bank & Cash Accounts</span>
                        </div>
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                          importBanks ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground"
                        )}>
                          {importBanks && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {parseResult.bankAccounts?.length || 0} Bank Account(s) {parseResult.cashInHand > 0 ? `+ ₹${parseResult.cashInHand} Cash` : ""}
                      </p>
                    </button>
                  )}

                  {totalVouchersCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setImportVouchers(!importVouchers)}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all",
                        importVouchers
                          ? "border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/20"
                          : "border-border bg-card hover:border-indigo-300"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-indigo-600" />
                          <span className="text-xs font-bold text-foreground">Ledger Statement Vouchers</span>
                        </div>
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                          importVouchers ? "border-indigo-500 bg-indigo-500" : "border-muted-foreground"
                        )}>
                          {importVouchers && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {totalVouchersCount} Receipt/Payment/Invoice Vouchers
                      </p>
                    </button>
                  )}
                </div>
              </div>

              {/* Conflict resolution */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  If a Record Already Exists in CredSmart
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(["skip", "overwrite", "merge"] as ConflictMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setConflictMode(mode)}
                      className={cn(
                        "p-3 rounded-xl border-2 text-center transition-all",
                        conflictMode === mode
                          ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                          : "border-border bg-card hover:border-primary/40"
                      )}
                    >
                      <p className="text-xs font-bold text-foreground capitalize">{mode}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {mode === "skip" && "Keep existing data"}
                        {mode === "overwrite" && "Replace with Tally data"}
                        {mode === "merge" && "Fill only blank fields"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
                <p className="text-xs font-bold text-foreground">Import Summary</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {importItems && parseResult.items.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-amber-500" /> Items to import</span>
                      <span className="font-bold text-foreground">{parseResult.items.length}</span>
                    </div>
                  )}
                  {importParties && parseResult.parties.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Users2 className="w-3.5 h-3.5 text-blue-500" /> Parties to import</span>
                      <span className="font-bold text-foreground">{parseResult.parties.length}</span>
                    </div>
                  )}
                  {importBanks && (parseResult.bankAccounts?.length > 0 || parseResult.cashInHand > 0) && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Landmark className="w-3.5 h-3.5 text-emerald-500" /> Bank & Cash Accounts</span>
                      <span className="font-bold text-foreground">{(parseResult.bankAccounts?.length || 0) + (parseResult.cashInHand > 0 ? 1 : 0)}</span>
                    </div>
                  )}
                  {importVouchers && totalVouchersCount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-indigo-500" /> Vouchers to import</span>
                      <span className="font-bold text-foreground">{totalVouchersCount}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t border-border">
                    <span>Conflict resolution</span>
                    <span className="font-bold text-foreground capitalize">{conflictMode} duplicates</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step: Importing ── */}
          {step === "importing" && (
            <div className="p-5 flex flex-col items-center justify-center gap-6 min-h-[300px]">
              <div className="w-20 h-20 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin" />
              <div className="text-center space-y-2">
                <p className="font-bold text-foreground">Importing Tally Data...</p>
                <p className="text-sm text-muted-foreground">
                  {parseResult && (
                    <>
                      {importItems && parseResult.items.length > 0 && `Importing ${parseResult.items.length} items`}
                      {importItems && importParties && parseResult.items.length > 0 && parseResult.parties.length > 0 && " & "}
                      {importParties && parseResult.parties.length > 0 && `${parseResult.parties.length} parties`}
                      {" into CredSmart..."}
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* ── Step: Done ── */}
          {step === "done" && importStats && (
            <div className="p-5 space-y-5">
              {importStats.errors.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-foreground">Import Successful! 🎉</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your Tally data has been imported into CredSmart
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-amber-600" />
                  </div>
                  <p className="font-bold text-foreground">Import Completed with Warnings</p>
                </div>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {importStats.itemsImported > 0 && (
                  <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-center">
                    <p className="text-2xl font-black text-amber-700">{importStats.itemsImported}</p>
                    <p className="text-[11px] text-muted-foreground">Items Imported</p>
                  </div>
                )}
                {importStats.partiesImported > 0 && (
                  <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 text-center">
                    <p className="text-2xl font-black text-blue-700">{importStats.partiesImported}</p>
                    <p className="text-[11px] text-muted-foreground">Parties Imported</p>
                  </div>
                )}
                {importStats.banksImported > 0 && (
                  <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center">
                    <p className="text-2xl font-black text-emerald-700">{importStats.banksImported}</p>
                    <p className="text-[11px] text-muted-foreground">Bank Accounts</p>
                  </div>
                )}
                {importStats.vouchersImported > 0 && (
                  <div className="p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-center">
                    <p className="text-2xl font-black text-indigo-700">{importStats.vouchersImported}</p>
                    <p className="text-[11px] text-muted-foreground">Ledger Entries</p>
                  </div>
                )}
                {importStats.itemsFailed > 0 && (
                  <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-center">
                    <p className="text-2xl font-black text-rose-700">{importStats.itemsFailed}</p>
                    <p className="text-[11px] text-muted-foreground">Items Failed</p>
                  </div>
                )}
                {importStats.partiesFailed > 0 && (
                  <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-center">
                    <p className="text-2xl font-black text-rose-700">{importStats.partiesFailed}</p>
                    <p className="text-[11px] text-muted-foreground">Parties Failed</p>
                  </div>
                )}
                {importStats.banksFailed > 0 && (
                  <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-center">
                    <p className="text-2xl font-black text-rose-700">{importStats.banksFailed}</p>
                    <p className="text-[11px] text-muted-foreground">Banks Failed</p>
                  </div>
                )}
                {importStats.vouchersFailed > 0 && (
                  <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-center">
                    <p className="text-2xl font-black text-rose-700">{importStats.vouchersFailed}</p>
                    <p className="text-[11px] text-muted-foreground">Vouchers Failed</p>
                  </div>
                )}
              </div>

              {/* Errors */}
              {importStats.errors.length > 0 && (
                <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-1.5">
                  {importStats.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-rose-700">
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 justify-center">
                <Button variant="outline" onClick={handleReset} className="gap-2">
                  <RotateCw className="w-4 h-4" />
                  Import Another File
                </Button>
                <Button onClick={onClose} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Check className="w-4 h-4" />
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer Actions ── */}
        {step !== "importing" && step !== "done" && (
          <div className="px-5 py-4 border-t border-border bg-muted/40 flex items-center justify-between shrink-0">
            <Button
              variant="outline"
              onClick={step === "upload" ? onClose : () => {
                if (step === "preview") { setStep("upload"); }
                else if (step === "options") { setStep("preview"); }
              }}
              className="text-xs"
            >
              {step === "upload" ? "Cancel" : "← Back"}
            </Button>

            <div className="flex items-center gap-3">
              {step === "upload" && parseResult && (
                <Badge className="text-[11px] bg-emerald-500/15 text-emerald-700 border-emerald-500/20">
                  File Ready
                </Badge>
              )}

              {step === "preview" && (
                <Button
                  onClick={() => setStep("options")}
                  className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                >
                  Configure & Import
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}

              {step === "options" && (
                <Button
                  onClick={handleImport}
                  disabled={!importItems && !importParties && !importBanks && !importVouchers}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/30"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Start Import
                  {parseResult && ` (${(importItems ? parseResult.items.length : 0) + (importParties ? parseResult.parties.length : 0) + (importBanks ? (parseResult.bankAccounts?.length || 0) + (parseResult.cashInHand > 0 ? 1 : 0) : 0) + (importVouchers ? totalVouchersCount : 0)} Records)`}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { TallyImportModal as UniversalImportModal };
