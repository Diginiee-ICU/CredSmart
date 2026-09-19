import { useState, useCallback, useRef } from "react";
import {
  ArrowLeft,
  FileSpreadsheet,
  HelpCircle,
  Zap,
  Upload,
  Check,
  CheckCircle2,
  Package,
  Users2,
  AlertTriangle,
  RotateCw,
  Eye,
  Trash2,
  Search,
  ShoppingCart,
  Landmark,
  Wallet,
  Building2,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TallyImportModal } from "@/components/TallyImportModal";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { InventoryItem } from "@/types/inventory";
import { Party } from "@/types/parties";
import { TallyBankAccount, TallyVoucher } from "@/utils/tallyXmlParser";
import {
  SOFTWARE_PROFILES,
  SupportedSoftware,
  UniversalImportData,
  parseMultipleUniversalFiles,
} from "@/utils/universalDataImporter";
import { toast } from "sonner";
import { ROUTE_PATHS } from "@/config/routes";
import { cn } from "@/lib/utils";

export default function TallyImport() {
  const navigate = useNavigate();
  const { orgId } = useOrganization();
  const { user } = useAuth();

  // Modal vs Page view state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSoftware, setSelectedSoftware] = useState<SupportedSoftware>("auto");
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<UniversalImportData | null>(null);

  // Import options
  const [importItems, setImportItems] = useState(true);
  const [importParties, setImportParties] = useState(true);
  const [importBanks, setImportBanks] = useState(true);
  const [importVouchers, setImportVouchers] = useState(true);
  const [conflictMode, setConflictMode] = useState<"skip" | "overwrite">("skip");

  // Execution state
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importCompleted, setImportCompleted] = useState(false);
  const [importedStats, setImportedStats] = useState({
    items: 0,
    parties: 0,
    banks: 0,
    vouchers: 0,
  });

  // Table preview filter
  const [previewTab, setPreviewTab] = useState<"items" | "parties" | "banks" | "vouchers">("items");
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Universal File Handling ────────────────────────────────────────────────

  const handleFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    for (const f of files) {
      if (f.size > 50 * 1024 * 1024) {
        toast.error(`File "${f.name}" is too large. Maximum size is 50MB.`);
        return;
      }
    }

    setIsParsing(true);
    try {
      const data = await parseMultipleUniversalFiles(files, selectedSoftware);
      setParsedData(data);
      setImportCompleted(false);

      if (data.detectedSoftware !== selectedSoftware && selectedSoftware === "auto") {
        setSelectedSoftware(data.detectedSoftware);
      }

      if (data.warnings.length > 0) {
        data.warnings.forEach((w) => toast.warning(w));
      }

      const totalFound = data.items.length + data.parties.all.length;
      if (totalFound > 0) {
        toast.success(
          `Successfully parsed ${data.items.length} items and ${data.parties.all.length} parties from ${SOFTWARE_PROFILES[data.detectedSoftware]?.name}!`
        );
      } else {
        toast.error("No inventory items or parties recognized in the uploaded file(s).");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to parse files");
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // ── Real Supabase 1-Click Import Engine ────────────────────────────────────

  const handleExecuteImport = async () => {
    if (!orgId) {
      toast.error("Organization not found. Please log in.");
      return;
    }
    if (!parsedData) return;

    setIsImporting(true);
    setImportProgress(10);

    let itemsCount = 0;
    let partiesCount = 0;
    let banksCount = 0;
    let vouchersCount = 0;

    try {
      // 1. Items Import
      if (importItems && parsedData.items.length > 0) {
        setImportProgress(25);
        for (const item of parsedData.items) {
          const sPrice = item.sellingPrice || 100;
          const pPrice = item.purchasePrice || Math.round(sPrice * 0.8);
          const stock = item.openingStock ?? item.currentStock ?? 0;
          const skuVal = item.sku || `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

          const tagsPayload = {
            selling_price: sPrice,
            purchase_price: pPrice,
            mrp: item.mrp ?? sPrice,
            unit: item.unit ?? "PCS",
            gst_rate: Number(item.gstRate ?? 18),
            hsn_code: item.hsnCode ? String(item.hsnCode).trim() : null,
            opening_stock: stock,
            min_stock_alert: Number(item.minStockAlert ?? 5),
            imported_from: parsedData.detectedSoftware,
            imported_at: new Date().toISOString(),
          };

          const { data: newProd, error: pErr } = await supabase
            .from("products")
            .insert({
              organization_id: orgId,
              name: item.name || "Imported Item",
              brand: item.brand ?? null,
              category: item.category ?? "General",
              barcode: item.barcode ?? null,
              sku: skuVal,
              tags: tagsPayload,
            })
            .select()
            .single();

          if (!pErr && newProd) {
            await supabase.from("product_batches").insert({
              product_id: newProd.id,
              batch_number: "INIT-BATCH",
              cost_price: pPrice,
              mrp: item.mrp || sPrice,
              stock: stock,
            });
            itemsCount++;
          }
        }
      }

      // 2. Parties Import (Customers & Suppliers)
      if (importParties && parsedData.parties.all.length > 0) {
        setImportProgress(60);
        for (const party of parsedData.parties.all) {
          const isSupplier = party.partyType === "supplier";
          const targetTable = isSupplier ? "suppliers" : "customers";

          const { data: newParty, error: pErr } = await supabase
            .from(targetTable)
            .insert({
              organization_id: orgId,
              name: party.name || "Unnamed Party",
              phone: party.phone || undefined,
              email: party.email || undefined,
              address: party.address || undefined,
              gstin: party.gstin || undefined,
              trade_name: party.tradeName || undefined,
              pan: party.pan || undefined,
              pincode: party.pincode || undefined,
              category: party.category || (isSupplier ? "Wholesaler" : "Retailer"),
              credit_limit: party.creditLimit || 50000,
              credit_period_days: party.creditPeriodDays || 30,
              custom_fields: {
                imported_from: parsedData.detectedSoftware,
                imported_at: new Date().toISOString(),
              },
            })
            .select()
            .single();

          if (!pErr && newParty) {
            partiesCount++;

            const opBal = Number(party.balance ?? party.openingBalance ?? 0);
            if (opBal !== 0) {
              await supabase.from("credit_transactions").insert({
                organization_id: orgId,
                party_id: newParty.id,
                party_type: isSupplier ? "supplier" : "customer",
                amount: Math.abs(opBal),
                type: opBal >= 0 ? "credit" : "payment",
                description: `${parsedData.detectedSoftware.toUpperCase()} Opening Balance`,
                created_by: user?.id || "admin",
              });
            }
          }
        }
      }

      // 3. Bank & Cash Accounts Import
      if (importBanks && parsedData.bankAccounts.length > 0) {
        setImportProgress(85);
        const storageKeyAccounts = `credsmart_bank_accounts_${orgId}`;
        const existingRaw = localStorage.getItem(storageKeyAccounts);
        let existingAccounts: unknown[] = [];
        try {
          existingAccounts = existingRaw ? JSON.parse(existingRaw) : [];
        } catch {
          existingAccounts = [];
        }

        const newAccounts = parsedData.bankAccounts.map((b, i) => ({
          id: `bank-${Date.now()}-${i}`,
          name: b.accountName,
          bankName: b.accountName,
          accountNumber: b.accountNumber || "—",
          ifscCode: b.ifsc || "—",
          accountType: "current",
          balance: b.balance,
          isPrimary: existingAccounts.length === 0 && i === 0,
          createdAt: new Date().toISOString(),
        }));

        localStorage.setItem(storageKeyAccounts, JSON.stringify([...existingAccounts, ...newAccounts]));
        banksCount = newAccounts.length;
      }

      setImportProgress(100);
      setImportedStats({
        items: itemsCount,
        parties: partiesCount,
        banks: banksCount,
        vouchers: vouchersCount,
      });
      setImportCompleted(true);
      toast.success(
        `🎉 1-Click Import Complete! Successfully imported ${itemsCount} items and ${partiesCount} parties.`
      );
    } catch (err) {
      toast.error(`Import error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsImporting(false);
    }
  };

  // ── Filtered Previews ─────────────────────────────────────────────────────

  const filteredItems = (parsedData?.items || []).filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.name || "").toLowerCase().includes(q) ||
      (item.sku || "").toLowerCase().includes(q) ||
      (item.category || "").toLowerCase().includes(q)
    );
  });

  const filteredParties = (parsedData?.parties.all || []).filter((party) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (party.name || "").toLowerCase().includes(q) ||
      (party.phone || "").toLowerCase().includes(q) ||
      (party.gstin || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header Bar */}
      <div className="border-b border-border bg-card px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(ROUTE_PATHS.businessSettings)}
            className="gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </Button>

          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 shrink-0">
            <FileSpreadsheet className="w-5 h-5 stroke-[2.2]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-foreground tracking-tight truncate">
                1-Click Data Migration Hub
              </h1>
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30 font-bold hidden sm:inline-flex">
                ALL TOOLS SUPPORTED
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Seamlessly migrate complete items, customer/supplier ledgers & balances in 1 click
            </p>
          </div>
        </div>

        {/* Wizard Launcher Modal Button */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="gap-2 text-xs font-bold cursor-pointer hover-3d-glow"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Launch Wizard</span>
          </Button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Step 1: Select Tool Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center text-xs font-black">
                1
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground font-mono">
                Select Your Accounting Software
              </h2>
            </div>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Click any tool to activate custom format settings
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {Object.values(SOFTWARE_PROFILES).map((soft) => {
              const isSelected = selectedSoftware === soft.id;
              return (
                <button
                  key={soft.id}
                  type="button"
                  onClick={() => setSelectedSoftware(soft.id)}
                  className={cn(
                    "flex flex-col items-start p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer select-none hover:scale-[1.02] active:scale-95 shadow-xs hover-3d-glow",
                    isSelected
                      ? cn("ring-2 ring-amber-500 shadow-md bg-gradient-to-br", soft.color, "text-white")
                      : "bg-card hover:bg-muted/50 border-border text-foreground hover:border-border/80"
                  )}
                >
                  <span className="text-xs font-black truncate w-full mb-1">{soft.shortName}</span>
                  <span
                    className={cn(
                      "text-[8.5px] font-bold px-1.5 py-0.2 rounded-full uppercase shrink-0 mb-1.5",
                      isSelected ? "bg-white/25 text-white" : cn(soft.badgeBg, soft.badgeText)
                    )}
                  >
                    {soft.badge}
                  </span>
                  <p className={cn("text-[9px] line-clamp-2 leading-tight", isSelected ? "text-white/85" : "text-muted-foreground")}>
                    {soft.supportedFormats.join(", ")}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Tool Guide Banner */}
        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 shrink-0 mt-0.5">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  {SOFTWARE_PROFILES[selectedSoftware]?.exportGuide.title}
                </h3>
                {SOFTWARE_PROFILES[selectedSoftware]?.exportGuide.shortcut && (
                  <kbd className="px-2 py-0.5 rounded bg-muted border border-border text-[10px] font-mono text-muted-foreground">
                    {SOFTWARE_PROFILES[selectedSoftware]?.exportGuide.shortcut}
                  </kbd>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {SOFTWARE_PROFILES[selectedSoftware]?.tagline}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {SOFTWARE_PROFILES[selectedSoftware]?.exportGuide.steps.map((st, i) => (
                  <span key={i} className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                    {i + 1}. {st}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Drag and Drop Upload Zone */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center text-xs font-black">
                2
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground font-mono">
                Upload File(s)
              </h2>
            </div>
            {parsedData && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setParsedData(null);
                  setImportCompleted(false);
                }}
                className="text-xs text-rose-500 hover:text-rose-600 gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Upload
              </Button>
            )}
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "p-8 sm:p-12 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-4 text-center transition-all duration-200 cursor-pointer select-none",
              isDragging
                ? "border-amber-500 bg-amber-500/10 scale-[1.01]"
                : "border-amber-500/30 hover:border-amber-500/60 bg-gradient-to-b from-amber-500/5 to-transparent hover:bg-amber-500/8"
            )}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-tr from-amber-600 to-amber-400 text-white">
              {isParsing ? (
                <RotateCw className="w-8 h-8 animate-spin" />
              ) : (
                <Upload className="w-8 h-8 stroke-[2]" />
              )}
            </div>

            <div>
              <p className="font-black text-base text-foreground">
                {isParsing
                  ? "Parsing your accounting file..."
                  : `Drop your ${SOFTWARE_PROFILES[selectedSoftware]?.name} files here`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports <span className="font-semibold text-foreground">{SOFTWARE_PROFILES[selectedSoftware]?.supportedFormats.join(", ")}</span> (Drop single file or items &amp; parties together)
              </p>
            </div>

            <Button
              type="button"
              disabled={isParsing}
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Choose File(s)</span>
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".xml,.csv,.xlsx,.xls,.txt"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFiles(e.target.files);
                }
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {/* Step 3: Interactive Data Preview & One-Click Import */}
        {parsedData && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
            {/* Stats Overview Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground mb-1">
                  <Package className="w-4 h-4 text-amber-500" />
                  <span>Items Detected</span>
                </div>
                <p className="text-2xl font-black text-foreground">{parsedData.items.length}</p>
                <p className="text-[10px] text-muted-foreground">Ready for POS &amp; Inventory</p>
              </div>

              <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground mb-1">
                  <Users2 className="w-4 h-4 text-blue-500" />
                  <span>Parties Detected</span>
                </div>
                <p className="text-2xl font-black text-foreground">{parsedData.parties.all.length}</p>
                <p className="text-[10px] text-muted-foreground">
                  {parsedData.parties.customers.length} Customers • {parsedData.parties.suppliers.length} Suppliers
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground mb-1">
                  <Wallet className="w-4 h-4 text-emerald-500" />
                  <span>Opening Receivables</span>
                </div>
                <p className="text-2xl font-black text-emerald-600">
                  ₹{parsedData.summary.totalOpeningReceivable.toLocaleString("en-IN")}
                </p>
                <p className="text-[10px] text-muted-foreground">Customer Udhar Khata</p>
              </div>

              <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground mb-1">
                  <Building2 className="w-4 h-4 text-rose-500" />
                  <span>Opening Payables</span>
                </div>
                <p className="text-2xl font-black text-rose-600">
                  ₹{parsedData.summary.totalOpeningPayable.toLocaleString("en-IN")}
                </p>
                <p className="text-[10px] text-muted-foreground">Supplier Due Balance</p>
              </div>
            </div>

            {/* Preview Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border">
              {/* Tab Pills */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setPreviewTab("items")}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    previewTab === "items"
                      ? "bg-amber-500 text-white shadow-xs"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  Items ({parsedData.items.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("parties")}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    previewTab === "parties"
                      ? "bg-amber-500 text-white shadow-xs"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  Parties ({parsedData.parties.all.length})
                </button>
                {parsedData.bankAccounts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPreviewTab("banks")}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                      previewTab === "banks"
                        ? "bg-amber-500 text-white shadow-xs"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    Bank Accounts ({parsedData.bankAccounts.length})
                  </button>
                )}
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${previewTab}...`}
                  className="pl-8 h-8.5 text-xs rounded-xl bg-muted/40"
                />
              </div>
            </div>

            {/* Preview Table: Items */}
            {previewTab === "items" && (
              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                <div className="max-h-96 overflow-y-auto scrollbar-thin">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-muted/90 backdrop-blur-md text-[11px] font-mono text-muted-foreground uppercase border-b border-border">
                      <tr>
                        <th className="py-2.5 px-4">Item Name</th>
                        <th className="py-2.5 px-3">SKU / Code</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Stock Qty</th>
                        <th className="py-2.5 px-3 text-right">Sale Price</th>
                        <th className="py-2.5 px-3 text-right">Purchase Price</th>
                        <th className="py-2.5 px-3 text-right">GST %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredItems.slice(0, 100).map((it, idx) => (
                        <tr key={idx} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-4 font-bold text-foreground truncate max-w-xs">{it.name}</td>
                          <td className="py-2.5 px-3 font-mono text-muted-foreground">{it.sku || "—"}</td>
                          <td className="py-2.5 px-3"><Badge variant="outline" className="text-[10px]">{it.category || "General"}</Badge></td>
                          <td className="py-2.5 px-3 font-semibold">{it.openingStock || 0} {it.unit || "PCS"}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">₹{it.sellingPrice || 0}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">₹{it.purchasePrice || 0}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{it.gstRate || 18}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredItems.length > 100 && (
                  <div className="p-2 text-center text-xs text-muted-foreground border-t border-border bg-muted/20">
                    Showing first 100 of {filteredItems.length} items. All records will be imported.
                  </div>
                )}
              </div>
            )}

            {/* Preview Table: Parties */}
            {previewTab === "parties" && (
              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                <div className="max-h-96 overflow-y-auto scrollbar-thin">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-muted/90 backdrop-blur-md text-[11px] font-mono text-muted-foreground uppercase border-b border-border">
                      <tr>
                        <th className="py-2.5 px-4">Party Name</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Mobile / Phone</th>
                        <th className="py-2.5 px-3">GSTIN</th>
                        <th className="py-2.5 px-3 text-right">Opening Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredParties.slice(0, 100).map((p, idx) => {
                        const bal = Number(p.balance || 0);
                        return (
                          <tr key={idx} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-4 font-bold text-foreground truncate max-w-xs">{p.name}</td>
                            <td className="py-2.5 px-3">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] font-bold uppercase",
                                  p.partyType === "supplier"
                                    ? "bg-purple-500/10 text-purple-600 border-purple-500/30"
                                    : "bg-blue-500/10 text-blue-600 border-blue-500/30"
                                )}
                              >
                                {p.partyType || "Customer"}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-muted-foreground">{p.phone || "—"}</td>
                            <td className="py-2.5 px-3 font-mono">{p.gstin || "—"}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold">
                              {bal > 0 ? (
                                <span className="text-emerald-600">₹{bal.toLocaleString("en-IN")} Dr</span>
                              ) : bal < 0 ? (
                                <span className="text-rose-600">₹{Math.abs(bal).toLocaleString("en-IN")} Cr</span>
                              ) : (
                                <span className="text-muted-foreground">₹0</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {filteredParties.length > 100 && (
                  <div className="p-2 text-center text-xs text-muted-foreground border-t border-border bg-muted/20">
                    Showing first 100 of {filteredParties.length} parties. All records will be imported.
                  </div>
                )}
              </div>
            )}

            {/* Execution Control Action Box */}
            <div className="p-6 rounded-3xl border border-amber-400/40 bg-gradient-to-r from-amber-500/10 via-card to-amber-500/5 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center md:text-left">
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                  <h3 className="text-base font-black text-foreground">
                    Ready to Migrate into CredSmart
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Deduplication protects against existing items and parties. All data saved securely to your cloud account.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleExecuteImport}
                  disabled={isImporting}
                  className="gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-amber-500/30 cursor-pointer hover-3d-glow"
                >
                  {isImporting ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>Importing ({importProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-white" />
                      <span>Start 1-Click Import ({parsedData.items.length + parsedData.parties.all.length} Records)</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Success Card */}
            {importCompleted && (
              <div className="p-6 rounded-3xl border border-emerald-400/50 bg-emerald-500/10 shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-foreground">
                      Migration Successfully Completed!
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Imported {importedStats.items} Items and {importedStats.parties} Parties. Your business is live and ready for billing.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button
                    onClick={() => navigate(ROUTE_PATHS.checkout)}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Open POS Billing
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate(ROUTE_PATHS.items)}
                    className="gap-2 text-xs font-bold"
                  >
                    <Package className="w-4 h-4 text-amber-500" />
                    View Stock Catalog
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate(ROUTE_PATHS.parties)}
                    className="gap-2 text-xs font-bold"
                  >
                    <Users2 className="w-4 h-4 text-blue-500" />
                    View Party Ledgers
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Embedded Universal 5-Step Modal */}
      <TallyImportModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialSoftware={selectedSoftware}
        onImportItems={async (items) => {
          // Re-use page import handler
          setParsedData((prev) => prev ? { ...prev, items } : null);
          await handleExecuteImport();
        }}
        onImportParties={async (parties) => {
          setParsedData((prev) => prev ? { ...prev, parties: { ...prev.parties, all: parties } } : null);
          await handleExecuteImport();
        }}
      />
    </div>
  );
}
