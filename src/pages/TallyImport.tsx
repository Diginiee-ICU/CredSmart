import { useState, useCallback, useRef, useEffect } from "react";
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
  Wifi,
  WifiOff,
  Clock,
  Copy,
  Download,
  Key,
  RefreshCw,
  Play,
  CheckCheck,
  Server,
  Settings2,
  Laptop,
  Database,
  Cable,
  Terminal,
  ArrowDownToLine,
  Sliders,
  Activity,
  Folder,
  FolderUp,
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
import { getAllTallyVouchers, TallyBankAccount, TallyVoucher } from "@/utils/tallyXmlParser";
import { extractFilesFromDataTransfer } from "@/utils/folderReader";
import {
  SOFTWARE_PROFILES,
  SupportedSoftware,
  UniversalImportData,
  parseMultipleUniversalFiles,
} from "@/utils/universalDataImporter";
import {
  SyncConfig,
  SyncAuditLog,
  getSyncConfig,
  saveSyncConfig,
  generateNewPairingToken,
  probeLocalTally,
  fetchLiveTallyData,
  executeDirectSyncIngestion,
  generateTallyTdlContent,
  generateWindowsSyncBatContent,
  getDaemonCliCommand,
  registerPairingToken,
} from "@/services/autoSyncService";
import { toast } from "sonner";
import { ROUTE_PATHS } from "@/config/routes";
import { cn } from "@/lib/utils";
import { notifyStockUpdated } from "@/services/stockService";

export default function TallyImport() {
  const navigate = useNavigate();
  const { orgId } = useOrganization();
  const { user } = useAuth();

  // Top-Level Mode: 1-Click File Upload (Instant) vs Automated Background Sync
  const [activeMode, setActiveMode] = useState<"auto_sync" | "file_upload">("file_upload");

  // ── Auto-Sync State ────────────────────────────────────────────────────────
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(() => getSyncConfig(orgId || "default"));
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);
  const [liveSyncStatusText, setLiveSyncStatusText] = useState("");
  const [probeResult, setProbeResult] = useState<{ online: boolean; latencyMs: number; companyName?: string; error?: string } | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);

  useEffect(() => {
    if (orgId) {
      const config = getSyncConfig(orgId);
      setSyncConfig(config);
      void registerPairingToken(orgId, config.pairingToken).catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Could not register the Tally pairing token.");
      });
    }
  }, [orgId]);

  const SAMPLE_TALLY_LIVE_ITEMS: Partial<InventoryItem>[] = [
    { name: "Cadbury Dairy Milk Silk 150g", sellingPrice: 175, purchasePrice: 145, mrp: 180, gstRate: 18, hsnCode: "1806", openingStock: 48, unit: "PCS", category: "Confectionery" },
    { name: "Aashirvaad Shudh Chakki Atta 10kg", sellingPrice: 420, purchasePrice: 380, mrp: 440, gstRate: 5, hsnCode: "1101", openingStock: 35, unit: "BAG", category: "Grocery" },
    { name: "Parle-G Gold Biscuits 1kg", sellingPrice: 120, purchasePrice: 98, mrp: 125, gstRate: 18, hsnCode: "1905", openingStock: 60, unit: "PKT", category: "Snacks" },
    { name: "Dettol Antiseptic Liquid 500ml", sellingPrice: 215, purchasePrice: 185, mrp: 220, gstRate: 12, hsnCode: "3004", openingStock: 24, unit: "CAN", category: "Healthcare" },
    { name: "Surf Excel Easy Wash 1kg", sellingPrice: 145, purchasePrice: 122, mrp: 150, gstRate: 18, hsnCode: "3402", openingStock: 50, unit: "PKT", category: "FMCG" },
  ];

  const SAMPLE_TALLY_LIVE_PARTIES: Partial<Party>[] = [
    { name: "Sharma Kirana Stores", partyType: "customer", phone: "9823145678", balance: 14500, gstin: "27AABCS1429B1Z1", category: "Retailer", city: "Mumbai", state: "Maharashtra" },
    { name: "Gupta Traders & Wholesalers", partyType: "customer", phone: "9876543210", balance: 28900, gstin: "27AABCG9821K1Z3", category: "Wholesaler", city: "Pune", state: "Maharashtra" },
    { name: "Balaji Distributors Pvt Ltd", partyType: "supplier", phone: "9988776655", balance: -42000, gstin: "27AADCB5643F1Z8", category: "Distributor", city: "Nagpur", state: "Maharashtra" },
    { name: "Kisan Agro Supplies", partyType: "supplier", phone: "9123456789", balance: -18500, gstin: "27AAECK1234D1Z2", category: "Manufacturer", city: "Nashik", state: "Maharashtra" },
  ];

  const handleLiveTallySync = async (simulate = false) => {
    if (!orgId) {
      toast.error("Organization not found. Please log in.");
      return;
    }

    setIsLiveSyncing(true);
    setLiveSyncStatusText(`Connecting to Tally at ${syncConfig.tallyHost}...`);

    try {
      if (simulate) {
        setLiveSyncStatusText("Extracting masters from simulated ERP stream...");
        await new Promise((r) => setTimeout(r, 700));

        setLiveSyncStatusText("Normalizing stock items & ledger balances...");
        await new Promise((r) => setTimeout(r, 600));

        setLiveSyncStatusText("Syncing into CredSmart Cloud database...");
        const result = await executeDirectSyncIngestion(
          orgId,
          user?.id || "demo-user",
          { items: SAMPLE_TALLY_LIVE_ITEMS, parties: SAMPLE_TALLY_LIVE_PARTIES },
          "simulated",
          syncConfig.selectedSoftware
        );

        setSyncConfig(getSyncConfig(orgId));
        toast.success(`🎉 Auto-Sync Completed! Ingested ${result.itemsCount} items and ${result.partiesCount} parties directly.`);
      } else {
        setLiveSyncStatusText(`Probing local Tally on ${syncConfig.tallyHost}...`);
        const probe = await probeLocalTally(syncConfig.tallyHost, syncConfig.pairingToken);
        setProbeResult(probe);

        if (!probe.online) {
          toast.error(probe.error || "Cannot connect to local Tally.");
          setIsLiveSyncing(false);
          return;
        }

        setLiveSyncStatusText(`Connected to "${probe.companyName || "Tally"}" (${probe.latencyMs}ms). Exporting masters...`);
        const tallyData = await fetchLiveTallyData(syncConfig.tallyHost, syncConfig.pairingToken);

        setLiveSyncStatusText(`Parsed ${tallyData.items.length} items & ${tallyData.parties.length} parties. Ingesting into Supabase...`);
        const result = await executeDirectSyncIngestion(
          orgId,
          user?.id || "sync-user",
          {
            items: syncConfig.syncScope.items ? tallyData.items : [],
            parties: syncConfig.syncScope.parties ? tallyData.parties : [],
            vouchers: syncConfig.syncScope.vouchers ? getAllTallyVouchers(tallyData) : [],
          },
          "direct_browser",
          "tally"
        );

        setSyncConfig(getSyncConfig(orgId));
        const syncMessage = `Tally sync ${result.success ? "completed" : "completed with warnings"}. Ingested ${result.itemsCount} items, ${result.partiesCount} parties, and ${result.vouchersCount} vouchers.`;
        if (result.success) {
          toast.success(syncMessage);
        } else {
          toast.warning(`${syncMessage} ${result.error || "Some records were not imported."}`);
        }
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Direct sync failed");
    } finally {
      setIsLiveSyncing(false);
      setLiveSyncStatusText("");
    }
  };

  const handleToggleAutoSyncEnabled = () => {
    if (!orgId) return;
    const next = !syncConfig.enabled;
    const updated = { ...syncConfig, enabled: next };
    saveSyncConfig(updated);
    setSyncConfig(updated);
    toast.success(next ? "Auto-Sync has been ENABLED" : "Auto-Sync has been PAUSED");
  };

  const handleRegenerateToken = () => {
    if (!orgId) return;
    generateNewPairingToken(orgId);
    setSyncConfig(getSyncConfig(orgId));
    void registerPairingToken(orgId, getSyncConfig(orgId).pairingToken).catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Could not register the new pairing token");
    });
    toast.success("New Store Pairing Token generated!");
  };

  const handleDownloadTdl = () => {
    const tdlCode = generateTallyTdlContent(orgId || "demo-org", syncConfig.pairingToken);
    const blob = new Blob([tdlCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "CredSmartSync.tdl";
    a.click();
    toast.success("CredSmartSync.tdl downloaded! Add it to Tally Prime under F1 > TDLs & Add-ons.");
  };

  const handleDownloadWindowsBat = () => {
    const batCode = generateWindowsSyncBatContent(orgId || "demo-org", syncConfig.pairingToken);
    const blob = new Blob([batCode], { type: "application/x-bat;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "CredSmart-Sync.bat";
    a.click();
    toast.success("CredSmart-Sync.bat downloaded! Double-click to run on Windows without Node.js.");
  };

  const handleDownloadTallyBridge = () => {
    const downloadUrl =
      import.meta.env.VITE_TALLY_BRIDGE_DOWNLOAD_URL ||
      "https://github.com/zirewood-ship-it/CREDSMART/releases/latest/download/CredSmartTallyBridge.exe";
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = "CredSmartTallyBridge.exe";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("CredSmartTallyBridge.exe download started.");
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(syncConfig.pairingToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
    toast.success("Pairing token copied to clipboard!");
  };

  const handleCopyCli = () => {
    const cmd = getDaemonCliCommand(orgId || "demo-org", syncConfig.pairingToken);
    navigator.clipboard.writeText(cmd);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
    toast.success("CLI command copied! Paste into PowerShell or Terminal.");
  };

  const handleUpdateInterval = (interval: number) => {
    const updated = { ...syncConfig, syncIntervalMinutes: interval };
    saveSyncConfig(updated);
    setSyncConfig(updated);
    toast.success(`Sync interval set to every ${interval} minutes.`);
  };

  const handleToggleScope = (key: keyof SyncConfig["syncScope"]) => {
    const updated = {
      ...syncConfig,
      syncScope: {
        ...syncConfig.syncScope,
        [key]: !syncConfig.syncScope[key],
      },
    };
    saveSyncConfig(updated);
    setSyncConfig(updated);
  };

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
  const folderInputRef = useRef<HTMLInputElement>(null);

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
      } else if (data.isRawTallyFolder) {
        toast.info(
          `Detected Tally Company: ${data.companyName || data.folderName || "Company"}. See instructions below.`
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

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    try {
      const files = await extractFilesFromDataTransfer(e.dataTransfer);
      if (files.length > 0) {
        handleFiles(files);
      } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    } catch {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
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
      // 1. Items Import (with Conflict Resolution: skip vs overwrite)
      if (importItems && parsedData.items.length > 0) {
        setImportProgress(25);
        for (const item of parsedData.items) {
          if (!item.name) continue;

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

          // Check if product exists
          const { data: existingProd } = await supabase
            .from("products")
            .select("id, tags")
            .eq("organization_id", orgId)
            .eq("name", item.name)
            .maybeSingle();

          if (existingProd) {
            if (conflictMode === "overwrite") {
              const mergedTags = {
                ...((existingProd.tags && typeof existingProd.tags === "object" ? existingProd.tags : {}) as Record<string, unknown>),
                ...tagsPayload,
              };

              await supabase
                .from("products")
                .update({
                  category: item.category || "General",
                  brand: item.brand || null,
                  barcode: item.barcode || null,
                  tags: mergedTags,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existingProd.id);

              const { data: existingBatch } = await supabase
                .from("product_batches")
                .select("id")
                .eq("product_id", existingProd.id)
                .maybeSingle();

              if (existingBatch) {
                await supabase
                  .from("product_batches")
                  .update({
                    cost_price: pPrice,
                    mrp: item.mrp || sPrice,
                    stock: stock,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", existingBatch.id);
              } else {
                await supabase.from("product_batches").insert({
                  product_id: existingProd.id,
                  batch_number: "INIT-BATCH",
                  cost_price: pPrice,
                  mrp: item.mrp || sPrice,
                  stock: stock,
                });
              }
              itemsCount++;
            }
            // If conflictMode === "skip", do nothing
          } else {
            const { data: newProd, error: pErr } = await supabase
              .from("products")
              .insert({
                organization_id: orgId,
                name: item.name,
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
      }

      // 2. Parties Import (Customers & Suppliers with Conflict Resolution)
      if (importParties && parsedData.parties.all.length > 0) {
        setImportProgress(55);
        for (const party of parsedData.parties.all) {
          if (!party.name) continue;

          const isSupplier = party.partyType === "supplier";
          const targetTable = isSupplier ? "suppliers" : "customers";

          // Deduplicate check
          let query = supabase.from(targetTable).select("id").eq("organization_id", orgId);
          if (party.phone && party.phone.trim().length > 5) {
            query = query.eq("phone", party.phone.trim());
          } else {
            query = query.eq("name", party.name.trim());
          }
          const { data: existingParty } = await query.maybeSingle();

          if (existingParty) {
            if (conflictMode === "overwrite") {
              await supabase
                .from(targetTable)
                .update({
                  address: party.address || undefined,
                  email: party.email || undefined,
                  trade_name: party.tradeName || undefined,
                  gstin: party.gstin || undefined,
                  pan: party.pan || undefined,
                  pincode: party.pincode || undefined,
                  credit_limit: party.creditLimit || undefined,
                  credit_period_days: party.creditPeriodDays || undefined,
                })
                .eq("id", existingParty.id);
              partiesCount++;
            }
          } else {
            const { data: newParty, error: pErr } = await supabase
              .from(targetTable)
              .insert({
                organization_id: orgId,
                name: party.name,
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
      }

      // 3. Bank & Cash Accounts Import
      if (importBanks && parsedData.bankAccounts.length > 0) {
        setImportProgress(75);
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

      // 4. Daybook Vouchers Import (Sales Invoices, Purchase Bills, Receipts, Payments)
      if (importVouchers && parsedData.vouchers && parsedData.vouchers.length > 0) {
        setImportProgress(88);
        for (const vch of parsedData.vouchers) {
          if (!vch.voucherNumber) continue;

          if (vch.voucherType === "Sales") {
            const { data: existingSale } = await supabase
              .from("sales")
              .select("id")
              .eq("organization_id", orgId)
              .eq("invoice_number", vch.voucherNumber)
              .maybeSingle();

            if (!existingSale) {
              let customerId: string | null = null;
              if (vch.partyName) {
                const { data: matchedCust } = await supabase
                  .from("customers")
                  .select("id")
                  .eq("organization_id", orgId)
                  .ilike("name", vch.partyName.trim())
                  .maybeSingle();
                customerId = matchedCust?.id || null;
              }

              const { data: newSale, error: sErr } = await supabase
                .from("sales")
                .insert({
                  organization_id: orgId,
                  invoice_number: vch.voucherNumber,
                  subtotal: vch.amount,
                  total: vch.amount,
                  tax: 0,
                  payment_method: "Credit",
                  customer_id: customerId,
                  created_by: user?.id || "admin",
                  created_at: vch.date ? `${vch.date}T10:00:00.000Z` : new Date().toISOString(),
                })
                .select("id")
                .maybeSingle();

              if (!sErr && newSale) {
                vouchersCount++;
                if (vch.items && vch.items.length > 0) {
                  const saleItems = vch.items.map((it) => ({
                    sale_id: newSale.id,
                    product_name: it.itemName,
                    mrp: it.rate,
                    quantity: it.quantity,
                    line_total: it.amount,
                  }));
                  await supabase.from("sale_items").insert(saleItems);
                }
              }
            } else if (conflictMode === "overwrite") {
              await supabase
                .from("sales")
                .update({
                  subtotal: vch.amount,
                  total: vch.amount,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existingSale.id);
              vouchersCount++;
            }
          } else if (vch.voucherType === "Purchase") {
            const { data: existingPI } = await supabase
              .from("purchase_invoices")
              .select("id")
              .eq("organization_id", orgId)
              .eq("invoice_number", vch.voucherNumber)
              .maybeSingle();

            if (!existingPI) {
              let supplierId: string | null = null;
              if (vch.partyName) {
                const { data: matchedSupp } = await supabase
                  .from("suppliers")
                  .select("id")
                  .eq("organization_id", orgId)
                  .ilike("name", vch.partyName.trim())
                  .maybeSingle();
                supplierId = matchedSupp?.id || null;
              }

              if (!supplierId) {
                const { data: autoSupp } = await supabase
                  .from("suppliers")
                  .insert({
                    organization_id: orgId,
                    name: vch.partyName || "Imported Vendor",
                    category: "Wholesaler",
                  })
                  .select("id")
                  .maybeSingle();
                supplierId = autoSupp?.id || null;
              }

              if (supplierId) {
                const { data: newPI, error: piErr } = await supabase
                  .from("purchase_invoices")
                  .insert({
                    organization_id: orgId,
                    supplier_id: supplierId,
                    invoice_number: vch.voucherNumber,
                    total_amount: vch.amount,
                    status: "received",
                    notes: vch.narration || `Imported from ${parsedData.detectedSoftware.toUpperCase()}`,
                    created_by: user?.id || "admin",
                    created_at: vch.date ? `${vch.date}T10:00:00.000Z` : new Date().toISOString(),
                  })
                  .select("id")
                  .maybeSingle();

                if (!piErr && newPI) {
                  vouchersCount++;
                  if (vch.items && vch.items.length > 0) {
                    const piItems = vch.items.map((it) => ({
                      purchase_invoice_id: newPI.id,
                      quantity: it.quantity,
                      cost_price: it.rate,
                      mrp: it.rate,
                      batch_number: it.batchNumber || "BATCH-01",
                      expiry_date: it.expiryDate || null,
                    }));
                    await supabase.from("purchase_invoice_items").insert(piItems);
                  }
                }
              }
            } else if (conflictMode === "overwrite") {
              await supabase
                .from("purchase_invoices")
                .update({
                  total_amount: vch.amount,
                  notes: vch.narration || undefined,
                })
                .eq("id", existingPI.id);
              vouchersCount++;
            }
          }
        }
      }

      // Broadcast updates
      if (itemsCount > 0) {
        notifyStockUpdated(orgId);
      }
      if (typeof window !== "undefined") {
        if (partiesCount > 0) {
          window.dispatchEvent(new CustomEvent("credsmart:parties_updated", { detail: { orgId } }));
        }
        if (vouchersCount > 0) {
          window.dispatchEvent(new CustomEvent("credsmart_documents_updated", { detail: { orgId } }));
        }
        window.dispatchEvent(new CustomEvent("credsmart_network_update"));
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
        `🎉 1-Click Import Complete! Imported ${itemsCount} items, ${partiesCount} parties, ${banksCount} banks, and ${vouchersCount} vouchers.`
      );
    } catch (err) {
      toast.error(`Import error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDirectSaveItems = async (
    items: Partial<InventoryItem>[],
    strategy: "skip" | "overwrite" | "merge" = "skip"
  ) => {
    if (!orgId || items.length === 0) return;
    setIsImporting(true);
    let count = 0;
    try {
      for (const item of items) {
        const itemName = (item.name || "Imported Item").trim();
        const { data: existingProd } = await supabase
          .from("products")
          .select("id")
          .eq("organization_id", orgId)
          .ilike("name", itemName)
          .maybeSingle();

        if (existingProd && strategy === "skip") {
          continue;
        }

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
          imported_from: selectedSoftware,
          imported_at: new Date().toISOString(),
        };

        if (existingProd && (strategy === "overwrite" || strategy === "merge")) {
          await supabase
            .from("products")
            .update({
              category: item.category ?? "General",
              tags: tagsPayload,
            })
            .eq("id", existingProd.id);
          count++;
          continue;
        }

        const { data: newProd, error: pErr } = await supabase
          .from("products")
          .insert({
            organization_id: orgId,
            name: itemName,
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
          count++;
        }
      }
      setImportedStats((prev) => ({ ...prev, items: prev.items + count }));
      setImportCompleted(true);
      toast.success(`Successfully uploaded and saved ${count} items to cloud inventory!`);
    } catch (err) {
      toast.error(`Items import error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDirectSaveParties = async (
    parties: Partial<Party>[],
    strategy: "skip" | "overwrite" | "merge" = "skip"
  ) => {
    if (!orgId || parties.length === 0) return;
    setIsImporting(true);
    let count = 0;
    try {
      for (const party of parties) {
        const partyName = (party.name || "Unnamed Party").trim();
        const isSupplier = party.partyType === "supplier";
        const targetTable = isSupplier ? "suppliers" : "customers";

        const { data: existingParty } = await supabase
          .from(targetTable)
          .select("id")
          .eq("organization_id", orgId)
          .ilike("name", partyName)
          .maybeSingle();

        if (existingParty && strategy === "skip") {
          continue;
        }

        if (existingParty && (strategy === "overwrite" || strategy === "merge")) {
          await supabase
            .from(targetTable)
            .update({
              phone: party.phone || undefined,
              email: party.email || undefined,
              address: party.address || undefined,
              gstin: party.gstin || undefined,
              pan: party.pan || undefined,
            })
            .eq("id", existingParty.id);
          count++;
          continue;
        }

        const { data: newParty, error: pErr } = await supabase
          .from(targetTable)
          .insert({
            organization_id: orgId,
            name: partyName,
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
              imported_from: selectedSoftware,
              imported_at: new Date().toISOString(),
            },
          })
          .select()
          .single();

        if (!pErr && newParty) {
          count++;
          const opBal = Number(party.balance ?? party.openingBalance ?? 0);
          if (opBal !== 0) {
            await supabase.from("credit_transactions").insert({
              organization_id: orgId,
              party_id: newParty.id,
              party_type: isSupplier ? "supplier" : "customer",
              amount: Math.abs(opBal),
              type: opBal >= 0 ? "credit" : "payment",
              description: `${selectedSoftware.toUpperCase()} Opening Balance`,
              created_by: user?.id || "admin",
            });
          }
        }
      }
      setImportedStats((prev) => ({ ...prev, parties: prev.parties + count }));
      setImportCompleted(true);
      toast.success(`Successfully uploaded and saved ${count} parties to cloud khata!`);
    } catch (err) {
      toast.error(`Parties import error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDirectSaveVouchers = async (
    vouchers: TallyVoucher[],
    strategy: "skip" | "overwrite" | "merge" = "skip"
  ) => {
    if (!orgId || vouchers.length === 0) return;
    setIsImporting(true);
    let count = 0;
    try {
      for (const vch of vouchers) {
        if (!vch.voucherNumber) continue;
        if (vch.voucherType === "Sales") {
          const { data: existingSale } = await supabase
            .from("sales")
            .select("id")
            .eq("organization_id", orgId)
            .eq("invoice_number", vch.voucherNumber)
            .maybeSingle();

          if (!existingSale) {
            let customerId: string | null = null;
            if (vch.partyName) {
              const { data: matchedCust } = await supabase
                .from("customers")
                .select("id")
                .eq("organization_id", orgId)
                .ilike("name", vch.partyName.trim())
                .maybeSingle();
              customerId = matchedCust?.id || null;
            }

            const { data: newSale } = await supabase
              .from("sales")
              .insert({
                organization_id: orgId,
                invoice_number: vch.voucherNumber,
                subtotal: vch.amount,
                total: vch.amount,
                payment_method: "Credit",
                customer_id: customerId,
                created_by: user?.id || "admin",
                created_at: vch.date ? `${vch.date}T10:00:00.000Z` : new Date().toISOString(),
              })
              .select("id")
              .maybeSingle();

            if (newSale) {
              count++;
              if (vch.items && vch.items.length > 0) {
                const saleItems = vch.items.map((it) => ({
                  sale_id: newSale.id,
                  product_name: it.itemName,
                  mrp: it.rate,
                  quantity: it.quantity,
                  line_total: it.amount,
                }));
                await supabase.from("sale_items").insert(saleItems);
              }
            }
          } else if (strategy === "overwrite") {
            await supabase
              .from("sales")
              .update({
                subtotal: vch.amount,
                total: vch.amount,
              })
              .eq("id", existingSale.id);
            count++;
          }
        } else if (vch.voucherType === "Purchase") {
          const { data: existingPI } = await supabase
            .from("purchase_invoices")
            .select("id")
            .eq("organization_id", orgId)
            .eq("invoice_number", vch.voucherNumber)
            .maybeSingle();

          if (!existingPI) {
            let supplierId: string | null = null;
            if (vch.partyName) {
              const { data: matchedSupp } = await supabase
                .from("suppliers")
                .select("id")
                .eq("organization_id", orgId)
                .ilike("name", vch.partyName.trim())
                .maybeSingle();
              supplierId = matchedSupp?.id || null;
            }

            const { data: newPI, error: piErr } = await supabase
              .from("purchase_invoices")
              .insert({
                organization_id: orgId,
                invoice_number: vch.voucherNumber,
                supplier_id: supplierId,
                total_amount: vch.amount,
                notes: vch.narration || undefined,
                payment_status: "paid",
                created_at: vch.date ? `${vch.date}T10:00:00.000Z` : new Date().toISOString(),
              })
              .select("id")
              .maybeSingle();

            if (!piErr && newPI) {
              count++;
              if (vch.items && vch.items.length > 0) {
                const piItems = vch.items.map((it) => ({
                  purchase_invoice_id: newPI.id,
                  quantity: it.quantity,
                  cost_price: it.rate,
                  mrp: it.rate,
                  batch_number: it.batchNumber || "BATCH-01",
                  expiry_date: it.expiryDate || null,
                }));
                await supabase.from("purchase_invoice_items").insert(piItems);
              }
            }
          } else if (strategy === "overwrite") {
            await supabase
              .from("purchase_invoices")
              .update({
                total_amount: vch.amount,
                notes: vch.narration || undefined,
              })
              .eq("id", existingPI.id);
            count++;
          }
        }
      }
      setImportedStats((prev) => ({ ...prev, vouchers: prev.vouchers + count }));
      setImportCompleted(true);
      toast.success(`Successfully saved ${count} vouchers to cloud database!`);
    } catch (err) {
      toast.error(`Vouchers import error: ${err instanceof Error ? err.message : String(err)}`);
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

  const filteredVouchers = (parsedData?.vouchers || []).filter((vch) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (vch.voucherNumber || "").toLowerCase().includes(q) ||
      (vch.partyName || "").toLowerCase().includes(q) ||
      (vch.voucherType || "").toLowerCase().includes(q) ||
      (vch.narration || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header Bar */}
      <div className="border-b border-border bg-card px-3 sm:px-8 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
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

        {/* Mode Selector Pill & Wizard Launcher */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap w-full sm:w-auto sm:justify-end">
          <div className="flex min-w-0 flex-1 sm:flex-none items-center p-1 rounded-xl bg-muted/80 border border-border overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveMode("file_upload")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0",
                activeMode === "file_upload"
                  ? "bg-card text-foreground shadow-xs border border-border text-primary font-black"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Upload className="w-3.5 h-3.5 text-primary" />
              <span>1-Click File Upload</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 font-black">
                INSTANT
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode("auto_sync")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0",
                activeMode === "auto_sync"
                  ? "bg-card text-foreground shadow-xs border border-border text-primary font-black"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
              <span>Automated Sync (TDL / Daemon)</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="gap-2 text-xs font-bold cursor-pointer hover-3d-glow shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Launch Wizard</span>
          </Button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 max-w-7xl w-full min-w-0 mx-auto p-3 sm:p-6 lg:p-8 space-y-6">
        {/* ── AUTO-SYNC (NO FILES NEEDED) VIEW ────────────────────────────── */}
        {activeMode === "auto_sync" && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* 1. Hero Live Status & Quick Action Card */}
            <div className="p-4 sm:p-8 rounded-3xl border border-border bg-gradient-to-br from-card via-card to-amber-500/5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2 max-w-xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      {syncConfig.enabled ? "Live Background Sync Active" : "Direct Local Probe Ready"}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-600">
                      ODBC / XML Port 9000
                    </Badge>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                    Zero-Touch Automated ERP Sync
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Automatically sync inventory items, retail prices, customer ledgers, and supplier payables directly from Tally, Busy, Marg, and Vyapar without manually exporting or uploading any files.
                  </p>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full lg:w-auto">
                  <Button
                    onClick={() => handleLiveTallySync(false)}
                    disabled={isLiveSyncing}
                    className="relative w-full sm:w-auto px-6 py-6 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-600 text-white font-black text-sm shadow-[0_4px_20px_rgba(245,158,11,0.4)] hover:shadow-[0_6px_25px_rgba(245,158,11,0.55)] border border-amber-400/40 active:scale-95 transition-all cursor-pointer overflow-hidden group"
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                    {isLiveSyncing ? (
                      <RotateCw className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <Zap className="w-5 h-5 mr-2 text-amber-200 fill-amber-200/40 group-hover:scale-110 transition-transform" />
                    )}
                    <span>{isLiveSyncing ? "Syncing..." : "Sync Live Tally Now"}</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleLiveTallySync(true)}
                    disabled={isLiveSyncing}
                    className="w-full sm:w-auto px-5 py-6 rounded-2xl border-border hover:bg-muted/80 font-bold text-xs cursor-pointer shadow-xs active:scale-95 transition-all"
                  >
                    <Play className="w-4 h-4 mr-2 text-amber-500" />
                    <span>Run Simulated Demo</span>
                  </Button>
                </div>
              </div>

              {/* Live In-Progress Status Banner */}
              {isLiveSyncing && (
                <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 animate-in fade-in duration-150">
                  <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300 truncate">
                      {liveSyncStatusText || "Communicating with local ERP daemon..."}
                    </p>
                    <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                      Querying masters and streaming changes directly into Supabase...
                    </p>
                  </div>
                </div>
              )}

              {/* Probe feedback banner */}
              {probeResult && !isLiveSyncing && (
                <div
                  className={cn(
                    "mt-6 p-5 rounded-2xl border flex flex-col gap-4 text-xs shadow-xs",
                    probeResult.online
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100"
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {probeResult.online ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1">
                        <p className="font-bold text-sm">
                          {probeResult.online
                            ? `Local Tally Active: ${probeResult.companyName || "Connected"} (${probeResult.latencyMs}ms latency)`
                            : "Browser Security Notice (HTTPS → Localhost)"}
                        </p>
                        <p className="text-xs text-muted-foreground opacity-90 leading-relaxed">
                          {probeResult.online
                            ? "Direct HTTP link verified on port 9000. Ready for automated extraction."
                            : probeResult.error}
                        </p>
                      </div>
                    </div>

                    {!probeResult.online && (
                      <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                        <Button
                          size="sm"
                          onClick={() => setActiveMode("file_upload")}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer shadow-xs gap-1.5"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Switch to 1-Click File Upload (Fastest)</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLiveTallySync(true)}
                          className="font-bold text-xs cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 mr-1 text-amber-500" />
                          Simulate Demo
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Clear Actionable Resolution Guide for Non-Online Probes */}
                  {!probeResult.online && (
                    <div className="pt-3 border-t border-amber-500/20 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-background/80 border border-border/80 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-foreground">
                          <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center text-[10px]">1</span>
                          <span>1-Click File Upload (Recommended)</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          In Tally: <strong>Alt + E &rarr; Masters (XML format)</strong>. Click the button above and drop the file. Works 100% in any browser with zero setup.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-background/80 border border-border/80 space-y-1">
                        <div className="flex items-center justify-between gap-1.5 font-bold text-foreground">
                          <div className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-600 flex items-center justify-center text-[10px]">2</span>
                            <span>Tally TDL Add-on</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleDownloadTdl}
                            className="text-[10px] text-primary hover:underline font-bold cursor-pointer"
                          >
                            Download .tdl
                          </button>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          Load <code>CredSmartSync.tdl</code> inside Tally Prime (<strong>F1 &gt; TDLs &amp; Add-ons</strong>). Tally pushes data to cloud directly without browser blocks.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-background/80 border border-border/80 space-y-1">
                        <div className="flex items-center justify-between gap-1.5 font-bold text-foreground">
                          <div className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-600 flex items-center justify-center text-[10px]">3</span>
                            <span>Desktop Sync Daemon</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleCopyCli}
                            className="text-[10px] text-primary hover:underline font-bold cursor-pointer"
                          >
                            Copy CLI
                          </button>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          Run <code>npx credsmart-sync-daemon</code> in PowerShell. It bridges Tally&apos;s localhost port directly to CredSmart Cloud.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Host & Status Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-border/80 text-xs">
                <div className="p-3 rounded-xl bg-background/60 border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Target Endpoint</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Server className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <input
                      type="text"
                      value={syncConfig.tallyHost}
                      onChange={(e) => {
                        const updated = { ...syncConfig, tallyHost: e.target.value };
                        saveSyncConfig(updated);
                        setSyncConfig(updated);
                      }}
                      className="bg-transparent border-0 font-mono text-xs font-bold text-foreground focus:outline-none w-full"
                      placeholder="http://127.0.0.1:9000"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-background/60 border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Last Sync Status</span>
                  <p className="font-bold text-foreground mt-1 flex items-center gap-1.5">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        syncConfig.lastSyncStatus === "success"
                          ? "bg-emerald-500"
                          : syncConfig.lastSyncStatus === "failed"
                          ? "bg-rose-500"
                          : "bg-muted-foreground"
                      )}
                    />
                    <span className="capitalize">{syncConfig.lastSyncStatus || "Not Synced Yet"}</span>
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-background/60 border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Items Synced</span>
                  <p className="font-mono font-black text-foreground mt-1 text-sm">
                    {syncConfig.lastSyncStats?.items ?? 0} Products
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-background/60 border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Parties Synced</span>
                  <p className="font-mono font-black text-foreground mt-1 text-sm">
                    {syncConfig.lastSyncStats?.parties ?? 0} Ledgers
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Automated Connectors Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cable className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Supported Software Connectors</h3>
                </div>
                <span className="text-xs text-muted-foreground">Select your tool to configure automated sync</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                  {
                    id: "tally",
                    name: "Tally Prime / ERP 9",
                    method: "Native Port 9000 & TDL",
                    status: "Ready",
                    tagline: "Direct XML server or TDL webhook",
                    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
                  },
                  {
                    id: "busy",
                    name: "Busy Accounting",
                    method: "Folder Watcher & ODBC",
                    status: "Auto-Watcher",
                    tagline: "Watches C:\\BusyWin\\AutoExport",
                    badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300",
                  },
                  {
                    id: "marg",
                    name: "Marg ERP 9+",
                    method: "Auto-Export Hook",
                    status: "Auto-Watcher",
                    tagline: "Hooks C:\\MargERP\\Data\\Export",
                    badgeColor: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300",
                  },
                  {
                    id: "vyapar",
                    name: "Vyapar Desktop",
                    method: "SQLite & Backup Hook",
                    status: "Auto-Watcher",
                    tagline: "Watches Vyapar local app data",
                    badgeColor: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
                  },
                  {
                    id: "zoho",
                    name: "Zoho Books",
                    method: "Cloud OAuth2 Webhook",
                    status: "Cloud API",
                    tagline: "Instant cloud-to-cloud webhook sync",
                    badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
                  },
                ].map((c) => {
                  const isSelected = syncConfig.selectedSoftware === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        const updated = { ...syncConfig, selectedSoftware: c.id as SupportedSoftware };
                        saveSyncConfig(updated);
                        setSyncConfig(updated);
                      }}
                      className={cn(
                        "p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-xs hover-3d-glow",
                        isSelected
                          ? "border-primary ring-2 ring-primary/20 bg-primary/5 shadow-md"
                          : "border-border bg-card hover:bg-muted/40"
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-black text-xs text-foreground truncate">{c.name}</span>
                          <span className={cn("text-[9px] font-bold px-1.5 py-0.2 rounded-full", c.badgeColor)}>
                            {c.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono">{c.method}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground/80 leading-tight">{c.tagline}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Deployment Methods (Daemon CLI, TDL Add-on, Pairing Key) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Method A: Windows Native Script or Node Daemon */}
              <div className="p-5 rounded-2xl border border-border bg-card shadow-xs flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-primary">
                      <Terminal className="w-4 h-4" />
                      <h4 className="font-bold text-xs text-foreground">Option 1: Windows Utility</h4>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600">
                      NO NODE.JS NEEDED
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Uses Windows built-in PowerShell. No installations or Node.js required. Double-click to test and sync.
                  </p>
                  <Button
                    size="sm"
                    onClick={handleDownloadWindowsBat}
                    className="w-full gap-2 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CredSmart-Sync.bat</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDownloadTallyBridge}
                    className="w-full gap-2 text-xs font-bold border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
                  >
                    <Laptop className="w-3.5 h-3.5" />
                    <span>Download Windows .exe</span>
                  </Button>
                  <div className="pt-2 border-t border-border/60">
                    <span className="text-[10px] text-muted-foreground font-semibold">Or if you have Node.js installed:</span>
                    <div className="p-2 mt-1 rounded-xl bg-muted font-mono text-[9px] text-foreground break-all border border-border select-all flex items-center justify-between gap-2">
                      <span className="truncate">{getDaemonCliCommand(orgId || "demo-org", syncConfig.pairingToken)}</span>
                      <button
                        type="button"
                        onClick={handleCopyCli}
                        className="p-1 hover:text-primary cursor-pointer shrink-0 text-muted-foreground hover:text-foreground"
                        title="Copy CLI"
                      >
                        {copiedCli ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Method B: Native TDL Script for Tally */}
              <div className="p-5 rounded-2xl border border-border bg-card shadow-xs flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-600">
                    <ArrowDownToLine className="w-4 h-4" />
                    <h4 className="font-bold text-xs text-foreground">Option 2: Native Tally TDL Add-on</h4>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Zero external software. Place this script in Tally Prime (`F1 &gt; TDLs &amp; Add-ons`). Tally pushes updates directly to CredSmart Cloud on voucher save.
                  </p>
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300">
                    Pre-configured for Organization: <strong>{orgId || "Default"}</strong>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={handleDownloadTdl}
                  className="w-full gap-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CredSmartSync.tdl</span>
                </Button>
              </div>

              {/* Method C: Pairing Token Management */}
              <div className="p-5 rounded-2xl border border-border bg-card shadow-xs flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <Key className="w-4 h-4" />
                    <h4 className="font-bold text-xs text-foreground">Store Pairing Security Token</h4>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Every sync packet is authenticated with this cryptographic token. Keep it private.
                  </p>
                  <div className="p-2.5 rounded-xl bg-muted font-mono text-[11px] text-foreground flex items-center justify-between border border-border">
                    <span className="truncate">{syncConfig.pairingToken}</span>
                    <button
                      type="button"
                      onClick={handleCopyToken}
                      className="p-1 text-muted-foreground hover:text-foreground cursor-pointer shrink-0 ml-2"
                      title="Copy Token"
                    >
                      {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRegenerateToken}
                  className="w-full gap-2 text-xs font-bold cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Regenerate Key</span>
                </Button>
              </div>
            </div>

            {/* 4. Sync Settings & Schedule */}
            <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary" />
                  <h4 className="font-bold text-xs text-foreground">Automated Sync Schedule &amp; Scope</h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">Auto-Sync Status:</span>
                  <Button
                    size="sm"
                    variant={syncConfig.enabled ? "default" : "outline"}
                    onClick={handleToggleAutoSyncEnabled}
                    className={cn(
                      "h-7 text-xs font-bold cursor-pointer",
                      syncConfig.enabled ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                    )}
                  >
                    {syncConfig.enabled ? "Enabled 🟢" : "Paused ⏸️"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
                {/* Frequency Selector */}
                <div className="space-y-2">
                  <label className="font-bold text-foreground text-[11px] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    Sync Frequency
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { label: "15 Mins", value: 15 },
                      { label: "30 Mins", value: 30 },
                      { label: "Hourly", value: 60 },
                      { label: "Daily Closing", value: 1440 },
                    ].map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => handleUpdateInterval(f.value)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl border font-bold text-xs transition-all cursor-pointer",
                          syncConfig.syncIntervalMinutes === f.value
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-muted/40 hover:bg-muted text-foreground border-border"
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scope Toggles */}
                <div className="space-y-2">
                  <label className="font-bold text-foreground text-[11px] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    Entities to Synchronize
                  </label>
                  <div className="flex items-center gap-3 flex-wrap">
                    {[
                      { key: "items" as const, label: "Stock & Prices" },
                      { key: "parties" as const, label: "Customers & Suppliers" },
                      { key: "balances" as const, label: "Opening & Running Balances" },
                    ].map((sc) => (
                      <label key={sc.key} className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-foreground select-none">
                        <input
                          type="checkbox"
                          checked={syncConfig.syncScope[sc.key]}
                          onChange={() => handleToggleScope(sc.key)}
                          className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>{sc.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Live Sync History Stream */}
            <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-xs">
              <div className="px-5 py-3.5 bg-muted/40 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-bold text-xs text-foreground">Recent Sync Audit Trail &amp; Stream</h4>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {syncConfig.history.length} events logged
                </span>
              </div>

              {syncConfig.history.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Clock className="w-8 h-8 text-muted-foreground/50 mx-auto" />
                  <p className="font-bold text-xs text-foreground">No automated sync events recorded yet</p>
                  <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                    Click "Sync Live Tally Now" or "Run Simulated Demo" above to execute your first background sync.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border text-xs max-h-60 overflow-y-auto scrollbar-thin">
                  {syncConfig.history.map((h) => (
                    <div key={h.id} className="p-3 sm:px-5 flex items-center justify-between gap-4 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            h.status === "success" ? "bg-emerald-500" : "bg-rose-500"
                          )}
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate">{h.message}</p>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            {new Date(h.timestamp).toLocaleTimeString()} · Source: <span className="capitalize">{h.source.replace("_", " ")}</span> · Latency: {h.durationMs}ms
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px] uppercase font-mono">
                          {h.software}
                        </Badge>
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                            h.status === "success"
                              ? "bg-emerald-500/15 text-emerald-600"
                              : "bg-rose-500/15 text-rose-600"
                          )}
                        >
                          {h.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 1-CLICK FILE UPLOAD VIEW ────────────────────────────────────── */}
        {activeMode === "file_upload" && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
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
                  ? "Parsing your accounting files or folder..."
                  : `Drop your ${SOFTWARE_PROFILES[selectedSoftware]?.name} files or complete Tally folder here`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports <span className="font-semibold text-foreground">{SOFTWARE_PROFILES[selectedSoftware]?.supportedFormats.join(", ")}</span> or complete Tally company directory (e.g. <span className="font-mono text-foreground font-semibold">10000</span>)
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                type="button"
                disabled={isParsing}
                className="gap-2 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-600 text-white font-black text-xs px-6 py-3 rounded-2xl shadow-lg shadow-amber-500/30 cursor-pointer active:scale-95 transition-all"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              >
                <Upload className="w-4 h-4" />
                <span>Upload File(s)</span>
              </Button>

              <Button
                type="button"
                disabled={isParsing}
                variant="outline"
                className="gap-2 border-amber-500/40 hover:bg-amber-500/10 font-black text-xs px-6 py-3 rounded-2xl text-foreground cursor-pointer active:scale-95 transition-all shadow-xs"
                onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
              >
                <FolderUp className="w-4 h-4 text-amber-500" />
                <span>Upload Complete Folder</span>
              </Button>
            </div>

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

            <input
              ref={folderInputRef}
              type="file"
              {...({ webkitdirectory: "", directory: "" } as any)}
              multiple
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
            {/* Scanned Folder & Company Metadata Card */}
            {(parsedData.folderName || parsedData.companyName) && (
              <div className="p-4 rounded-2xl border border-border bg-gradient-to-r from-card to-amber-500/5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 shrink-0">
                    <Folder className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-foreground">
                        {parsedData.folderName ? `Folder: ${parsedData.folderName}` : "Scanned Import Batch"}
                      </span>
                      {parsedData.companyName && (
                        <Badge variant="outline" className="text-[10px] font-bold border-amber-500/30 text-amber-600 bg-amber-500/10">
                          {parsedData.companyName}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {parsedData.fileNames.length} file(s) analyzed across this directory.
                    </p>
                  </div>
                </div>

                {parsedData.isRawTallyFolder && parsedData.items.length === 0 && (
                  <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 max-w-md">
                    💡 <strong>Identified Tally Company Directory:</strong> To import every item, GST tax rate, and bill with 100% precision, open Tally Prime &rarr; press <kbd className="px-1 bg-muted rounded font-mono">Alt + E</kbd> &rarr; Masters (XML) &rarr; drop the file here.
                  </div>
                )}
              </div>
            )}

            {/* Stats Overview Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
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
                  <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
                  <span>Daybook Vouchers</span>
                </div>
                <p className="text-2xl font-black text-foreground">{parsedData.vouchers.length}</p>
                <p className="text-[10px] text-muted-foreground">Invoices, Bills &amp; Vouchers</p>
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

              <div className="p-4 rounded-2xl border border-border bg-card shadow-xs col-span-2 sm:col-span-4 lg:col-span-1">
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
                {parsedData.vouchers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPreviewTab("vouchers")}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                      previewTab === "vouchers"
                        ? "bg-amber-500 text-white shadow-xs"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    Vouchers ({parsedData.vouchers.length})
                  </button>
                )}
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

            {/* Preview Table: Vouchers / Daybook */}
            {previewTab === "vouchers" && (
              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                <div className="max-h-96 overflow-y-auto scrollbar-thin">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-muted/90 backdrop-blur-md text-[11px] font-mono text-muted-foreground uppercase border-b border-border">
                      <tr>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-3">Voucher No</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Party / Ledger</th>
                        <th className="py-2.5 px-3">Items / Lines</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredVouchers.slice(0, 100).map((vch, idx) => (
                        <tr key={idx} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-4 font-mono text-muted-foreground">{vch.date}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-foreground">{vch.voucherNumber}</td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-bold uppercase",
                                vch.voucherType === "Sales"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                  : vch.voucherType === "Purchase"
                                  ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                                  : vch.voucherType === "Receipt"
                                  ? "bg-purple-500/10 text-purple-600 border-purple-500/30"
                                  : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                              )}
                            >
                              {vch.voucherType}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-foreground truncate max-w-xs">{vch.partyName}</td>
                          <td className="py-2.5 px-3 text-muted-foreground">
                            {vch.items && vch.items.length > 0 ? (
                              <span>{vch.items.length} item{vch.items.length > 1 ? "s" : ""}</span>
                            ) : (
                              <span>{vch.ledgerEntries.length} ledger{vch.ledgerEntries.length > 1 ? "s" : ""}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-foreground">
                            ₹{vch.amount.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredVouchers.length > 100 && (
                  <div className="p-2 text-center text-xs text-muted-foreground border-t border-border bg-muted/20">
                    Showing first 100 of {filteredVouchers.length} vouchers. All records will be imported.
                  </div>
                )}
              </div>
            )}

            {/* Execution Control Action Box */}
            <div className="p-6 rounded-3xl border border-amber-400/40 bg-gradient-to-r from-amber-500/10 via-card to-amber-500/5 shadow-md flex flex-col gap-5">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-amber-600" />
                    <h3 className="text-base font-black text-foreground">
                      Migration Configuration &amp; Execution
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Choose conflict strategy and which entities to persist into your cloud business database.
                  </p>
                </div>

                {/* Conflict Resolution Selector */}
                <div className="flex items-center gap-2 bg-background/80 p-1.5 rounded-xl border border-border text-xs">
                  <span className="text-[11px] font-bold text-muted-foreground pl-1">Duplicates:</span>
                  <button
                    type="button"
                    onClick={() => setConflictMode("skip")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      conflictMode === "skip"
                        ? "bg-amber-500 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Skip Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setConflictMode("overwrite")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      conflictMode === "overwrite"
                        ? "bg-amber-500 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Overwrite
                  </button>
                </div>
              </div>

              {/* Entity Checkboxes & Trigger Button */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-3 border-t border-border/60">
                <div className="flex items-center gap-4 flex-wrap text-xs font-semibold">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={importItems}
                      onChange={(e) => setImportItems(e.target.checked)}
                      className="rounded border-border text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>Items ({parsedData.items.length})</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={importParties}
                      onChange={(e) => setImportParties(e.target.checked)}
                      className="rounded border-border text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>Parties ({parsedData.parties.all.length})</span>
                  </label>
                  {parsedData.bankAccounts.length > 0 && (
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={importBanks}
                        onChange={(e) => setImportBanks(e.target.checked)}
                        className="rounded border-border text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span>Banks ({parsedData.bankAccounts.length})</span>
                    </label>
                  )}
                  {parsedData.vouchers.length > 0 && (
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={importVouchers}
                        onChange={(e) => setImportVouchers(e.target.checked)}
                        className="rounded border-border text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span>Vouchers ({parsedData.vouchers.length})</span>
                    </label>
                  )}
                </div>

                <Button
                  onClick={handleExecuteImport}
                  disabled={isImporting}
                  className="gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-amber-500/30 cursor-pointer hover-3d-glow shrink-0"
                >
                  {isImporting ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>Importing ({importProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-white" />
                      <span>
                        Start 1-Click Import (
                        {(importItems ? parsedData.items.length : 0) +
                          (importParties ? parsedData.parties.all.length : 0) +
                          (importVouchers ? parsedData.vouchers.length : 0)}{" "}
                        Records)
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

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
                      Imported {importedStats.items} Items, {importedStats.parties} Parties, and {importedStats.vouchers} Vouchers. Your business is live and ready for billing.
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
                  <Button
                    variant="outline"
                    onClick={() => navigate(ROUTE_PATHS.invoices)}
                    className="gap-2 text-xs font-bold"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
                    View Sales Invoices
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
        onImportItems={async (items, mode) => {
          await handleDirectSaveItems(items, mode);
        }}
        onImportParties={async (parties, mode) => {
          await handleDirectSaveParties(parties, mode);
        }}
        onImportVouchers={async (vouchers, mode) => {
          await handleDirectSaveVouchers(vouchers, mode);
        }}
      />
    </div>
  );
}
