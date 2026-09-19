import { useState, useRef } from "react";
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileText,
  Trash2,
  Building2,
  Users,
  Check,
  Zap,
} from "lucide-react";
import { Party } from "@/types/parties";
import {
  generatePartiesSampleCSV,
  parsePartiesCSV,
  downloadCSV,
} from "@/utils/excelImportExport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { parseUniversalFile, SupportedSoftware } from "@/utils/universalDataImporter";
import { TallyImportModal } from "@/components/TallyImportModal";

interface PartyExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (parties: Partial<Party>[]) => Promise<void>;
  initialTab?: "excel" | "software";
}

export function PartyExcelUploadModal({
  isOpen,
  onClose,
  onImport,
  initialTab = "excel",
}: PartyExcelUploadModalProps) {
  const [activeTab, setActiveTab] = useState<"excel" | "software">(initialTab);
  const [parsedParties, setParsedParties] = useState<Partial<Party>[]>([]);
  const [pastedText, setPastedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSoftware, setSelectedSoftware] = useState<SupportedSoftware>("vyapar");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Software migration state
  const [tallyModalOpen, setTallyModalOpen] = useState(false);
  const [softwareParsedParties, setSoftwareParsedParties] = useState<Partial<Party>[]>([]);
  const softwareFileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const csv = generatePartiesSampleCSV();
    downloadCSV("CredSmart_Parties_Import_Template.csv", csv);
    toast.success("Sample Excel/CSV template downloaded!");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    try {
      const res = await parseUniversalFile(file, "custom");
      if (res.parties.all.length === 0) {
        toast.error("No valid party records found in the uploaded file.");
      } else {
        setParsedParties(res.parties.all);
        toast.success(`Successfully parsed ${res.parties.all.length} parties from ${file.name}!`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to parse file.");
    }
  };

  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      toast.error("Please paste CSV or tab-separated party rows.");
      return;
    }
    const parsed = parsePartiesCSV(pastedText);
    if (parsed.length === 0) {
      toast.error("Could not parse rows. Ensure headers and columns match the template.");
    } else {
      setParsedParties(parsed);
      toast.success(`Parsed ${parsed.length} parties!`);
    }
  };

  const handleConfirmImport = async () => {
    if (parsedParties.length === 0) return;
    setIsProcessing(true);
    try {
      await onImport(parsedParties);
      toast.success(`Imported ${parsedParties.length} parties successfully!`);
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to bulk import parties.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSoftwareFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const result = await parseUniversalFile(file, selectedSoftware);
      if (result.parties.all.length === 0) {
        toast.error(`No ledger/party records found in this ${selectedSoftware.toUpperCase()} file. Please export Ledger Master and try again.`);
        return;
      }
      setSoftwareParsedParties(result.parties.all);
      toast.success(`Detected ${result.parties.all.length} parties from ${selectedSoftware.toUpperCase()} (${file.name}). Review and confirm import below.`);
      if (result.warnings.length > 0) result.warnings.forEach((w) => toast.warning(w));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : `Failed to parse ${selectedSoftware.toUpperCase()} file.`);
    }
  };

  const handleConfirmSoftwareImport = async () => {
    if (softwareParsedParties.length === 0) return;
    setIsProcessing(true);
    try {
      await onImport(softwareParsedParties);
      toast.success(`Imported ${softwareParsedParties.length} parties into CredSmart!`);
      setSoftwareParsedParties([]);
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to import parties.");
    } finally {
      setIsProcessing(false);
    }
  };



  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                Party Directory &amp; Software Migration
              </h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                Bulk upload party ledgers or import directly from Vyapar, Tally Prime, My Bill Book, Marg ERP &amp; Busy
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-border px-3 sm:px-6 bg-muted/20 gap-1 sm:gap-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("excel")}
            className={cn(
              "px-3 sm:px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer",
              activeTab === "excel"
                ? "border-primary text-primary bg-primary/5 font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Bulk Upload Parties via Excel / CSV
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("software")}
            className={cn(
              "px-3 sm:px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer",
              activeTab === "software"
                ? "border-primary text-primary bg-primary/5 font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Import from Vyapar / Tally / My Bill Book / Marg / Busy
          </button>
        </div>

        {/* Tab 1: Bulk Upload Parties */}
        {activeTab === "excel" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs scrollbar-thin">
            {/* Upload Box */}
            <div className="p-6 sm:p-8 rounded-3xl border-2 border-dashed border-teal-500/40 hover:border-teal-500/80 bg-gradient-to-b from-teal-500/10 via-emerald-500/5 to-transparent flex flex-col items-center justify-center gap-3.5 text-center transition-all duration-200 shadow-inner">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/30">
                <Upload className="w-7 h-7 stroke-[2.2]" />
              </div>
              <div>
                <p className="font-black text-base text-slate-900 dark:text-white">Upload Party Spreadsheet (.xlsx / .csv)</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-lg">
                  Direct import with automatic ledger column mapping: <span className="font-semibold text-slate-700 dark:text-slate-300">Party Name, Phone, Email, Type (Customer/Supplier), Category, Address, Opening Balance</span>
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2 flex-wrap justify-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-500 hover:to-emerald-600 text-white font-black text-xs shadow-[0_4px_16px_rgba(16,185,129,0.4)] hover:shadow-[0_6px_22px_rgba(16,185,129,0.55)] border border-emerald-400/40 active:scale-95 transition-all duration-150 cursor-pointer overflow-hidden group"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                  <FileSpreadsheet className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition-transform" />
                  <span>Choose Party File (.xlsx / .csv)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Download Sample Template</span>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls, text/csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            {/* Paste Data Option */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">Or Paste CSV / Tab-Separated Rows</span>
                {pastedText && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPastedText("")}
                    className="h-6 text-[11px] text-rose-500 hover:text-rose-600"
                  >
                    Clear Text
                  </Button>
                )}
              </div>
              <Textarea
                placeholder={"Party Name,Phone,Email,Party Type,Category,Address,Opening Balance\nRamesh Traders,9876543210,ramesh@store.in,customer,Retailer,Mumbai,15000\nTata Wholesalers,9811122233,tata@supp.in,supplier,Wholesaler,Pune,25000"}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                rows={3}
                className="text-xs font-mono resize-none bg-muted/20"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleParsePastedText}
                disabled={!pastedText.trim()}
                className="text-xs font-semibold"
              >
                Parse Pasted Rows
              </Button>
            </div>

            {/* Parsed Parties Preview */}
            {parsedParties.length > 0 && (
              <div className="border border-border rounded-xl overflow-hidden bg-card shadow-2xs space-y-2">
                <div className="px-4 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      {parsedParties.length} Parties Parsed &amp; Ready
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setParsedParties([])}
                    className="h-7 text-xs text-rose-600 hover:text-rose-700"
                  >
                    Clear All
                  </Button>
                </div>

                <div className="max-h-52 overflow-y-auto divide-y divide-border">
                  {parsedParties.map((p, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-foreground">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {p.partyType?.toUpperCase()} · {p.phone || "No phone"} · {p.address || "No address"}
                        </p>
                      </div>
                      <div className="text-right font-mono">
                        <p className="font-bold">Bal: ₹ {p.openingBalance || 0}</p>
                        <p className="text-[10px] text-muted-foreground">{p.category || "General"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Software Migration (Vyapar, Tally Prime, My Bill Book, Marg ERP & Busy) */}
        {activeTab === "software" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs scrollbar-thin">
            <div className="space-y-2">
              <p className="font-bold text-foreground text-sm">Select Your Existing Software</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                {[
                  { id: "auto", label: "Auto-Detect", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800" },
                  { id: "vyapar", label: "Vyapar App", color: "text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800" },
                  { id: "tally", label: "Tally Prime / ERP 9", color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800" },
                  { id: "mybillbook", label: "My Bill Book", color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800" },
                  { id: "busy", label: "Busy Accounting", color: "text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800" },
                  { id: "marg", label: "Marg ERP 9+", color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800" },
                  { id: "zoho", label: "Zoho Books", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800" },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSoftware(s.id as SupportedSoftware)}
                    className={cn(
                      "p-3 rounded-xl border text-center font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5",
                      selectedSoftware === s.id
                        ? "border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-sm"
                        : "border-border hover:bg-muted text-foreground"
                    )}
                  >
                    <div className={cn("p-1.5 rounded-lg border", s.color)}>
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] leading-tight">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Migration Guidelines */}
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
              <p className="font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                How to export parties &amp; ledgers from {selectedSoftware.toUpperCase()}:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground leading-relaxed text-[11px]">
                {selectedSoftware === "auto" && (
                  <>
                    <li>Drop any Excel (.xlsx, .xls), CSV, or Tally XML file.</li>
                    <li>CredSmart's signature engine will automatically recognize your software and extract parties.</li>
                  </>
                )}
                {selectedSoftware === "vyapar" && (
                  <>
                    <li>Open Vyapar &gt; Go to <strong>Parties Master</strong>.</li>
                    <li>Click the 3 dots at top right &gt; Choose <strong>Export All Parties (Excel)</strong>.</li>
                    <li>Upload the exported file below to auto-import Customers, Suppliers, and Balances.</li>
                  </>
                )}
                {selectedSoftware === "tally" && (
                  <>
                    <li>Open Tally Prime &gt; Go to <strong>Display More Reports</strong> &gt; <strong>Accounts Books</strong> &gt; <strong>Ledger</strong>.</li>
                    <li>Press <kbd className="px-1 py-0.5 bg-muted border rounded font-mono">Alt + E</kbd> &gt; Export to <strong>Excel (CSV/XML)</strong>.</li>
                    <li>Upload the exported sheet below for instant ledger mapping.</li>
                  </>
                )}
                {selectedSoftware === "mybillbook" && (
                  <>
                    <li>Open My Bill Book &gt; Go to <strong>Parties</strong> tab.</li>
                    <li>Click <strong>Export Parties / Excel</strong> from the top toolbar.</li>
                    <li>Upload the file below. Opening balances and GSTINs are preserved automatically.</li>
                  </>
                )}
                {selectedSoftware === "marg" && (
                  <>
                    <li>Open Marg ERP 9+ &gt; Masters &gt; <strong>Ledger Master</strong> &gt; <strong>List of Accounts</strong>.</li>
                    <li>Press <kbd className="px-1 py-0.5 bg-muted border rounded font-mono">Alt + P</kbd> &gt; Export to <strong>Excel/CSV</strong>.</li>
                    <li>Upload the Marg export file below.</li>
                  </>
                )}
                {selectedSoftware === "busy" && (
                  <>
                    <li>Open Busy Accounting &gt; Administration &gt; <strong>Bulk Updation</strong> &gt; <strong>Export Accounts</strong>.</li>
                    <li>Generate the Excel file and upload below.</li>
                  </>
                )}
                {selectedSoftware === "zoho" && (
                  <>
                    <li>Open Zoho Books &gt; Contacts &gt; Click the hamburger/gear menu &gt; <strong>Export Customers / Vendors</strong>.</li>
                    <li>Export as CSV or XLS and upload below.</li>
                  </>
                )}
              </ol>
            </div>

            {/* Universal Dropzone for Software Export File */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-600">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <p className="font-bold text-xs text-foreground">
                    Upload {selectedSoftware === "auto" ? "Any Tool" : selectedSoftware.toUpperCase()} Export File
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <p className="text-[11px] text-muted-foreground">
                    Supports native <strong>.xlsx, .xls, .xml, .csv</strong> files with auto column and balance detection
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setTallyModalOpen(true)}
                      className="gap-1.5 font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50 cursor-pointer text-[11px]"
                    >
                      <FileSpreadsheet className="w-3 h-3" />
                      Full Universal Wizard
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => softwareFileRef.current?.click()}
                      className="gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload File
                    </Button>
                  </div>
                </div>
                <input
                  ref={softwareFileRef}
                  type="file"
                  accept=".xml,.csv,.xlsx,.xls,.txt"
                  className="hidden"
                  onChange={handleSoftwareFileUpload}
                />
              </div>

              {/* Parsed parties preview */}
              {softwareParsedParties.length > 0 && (
                <div className="border border-emerald-500/20 rounded-xl overflow-hidden bg-card">
                  <div className="px-4 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                        {softwareParsedParties.length} Parties Parsed from {selectedSoftware.toUpperCase()} — Ready to Import
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSoftwareParsedParties([])}
                      className="h-6 text-[11px] text-rose-500 hover:text-rose-600"
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="max-h-44 overflow-y-auto divide-y divide-border scrollbar-thin">
                    {softwareParsedParties.slice(0, 100).map((p, idx) => (
                      <div key={idx} className="px-3 py-2 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-foreground truncate max-w-[200px]">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {p.partyType?.toUpperCase()} · {p.gstin || "No GSTIN"} · {p.phone || "No phone"}
                          </p>
                        </div>
                        <div className="text-right font-mono">
                          <p className={`font-bold text-xs ${(p.balance ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {(p.balance ?? 0) >= 0 ? "+" : ""}₹{Math.abs(p.balance ?? 0).toLocaleString("en-IN")}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{p.category || "General"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-t border-border bg-muted/40 flex items-center justify-between shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isProcessing} className="text-xs cursor-pointer">
            Cancel
          </Button>

          {activeTab === "excel" && (
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={parsedParties.length === 0 || isProcessing}
              className="relative flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 disabled:opacity-50 text-white font-black text-xs shadow-[0_4px_16px_rgba(16,185,129,0.4)] hover:shadow-[0_6px_22px_rgba(16,185,129,0.55)] border border-emerald-400/40 active:scale-95 transition-all cursor-pointer disabled:cursor-not-allowed overflow-hidden group"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
              {isProcessing ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200 group-hover:scale-110 transition-transform" />
              )}
              <span>Import {parsedParties.length} Parties</span>
            </button>
          )}

          {activeTab === "software" && softwareParsedParties.length > 0 && (
            <button
              type="button"
              onClick={handleConfirmSoftwareImport}
              disabled={isProcessing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
            >
              {isProcessing ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              Import {softwareParsedParties.length} {selectedSoftware === "auto" ? "" : selectedSoftware.toUpperCase()} Parties
            </button>
          )}

          {activeTab === "software" && softwareParsedParties.length === 0 && (
            <button
              type="button"
              onClick={() => softwareFileRef.current?.click()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-600/30 active:scale-95 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Select {selectedSoftware === "auto" ? "Software" : selectedSoftware.toUpperCase()} Export File</span>
            </button>
          )}
        </div>
      </div>
    </div>

    {/* Full Universal Import Wizard Modal */}
    <TallyImportModal
      isOpen={tallyModalOpen}
      onClose={() => setTallyModalOpen(false)}
      initialSoftware={selectedSoftware}
      onImportParties={async (parties) => {
        await onImport(parties);
        setTallyModalOpen(false);
        onClose();
      }}
      defaultTab="parties"
    />
    </>
  );
}

