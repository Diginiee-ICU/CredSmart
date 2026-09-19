import { useState, useRef } from "react";
import {
  X,
  Library,
  Layers,
  Sparkles,
  Check,
  Plus,
  ArrowRight,
  Database,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
  Package,
  Barcode,
  Building2,
  FileText,
  RotateCw,
  Zap,
} from "lucide-react";
import { InventoryItem } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { parseUniversalFile, SupportedSoftware } from "@/utils/universalDataImporter";
import { TallyImportModal } from "@/components/TallyImportModal";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : typeof error === "string" ? error : fallback;

interface ProductLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProducts: (products: Partial<InventoryItem>[]) => Promise<void>;
  mode?: "library" | "software" | "excel";
}

// eslint-disable-next-line react-refresh/only-export-components
export const PRESET_LIBRARY_ITEMS: Partial<InventoryItem>[] = [
  // FMCG & Grocery
  {
    name: "Amul Butter Pasteurised 500g",
    brand: "Amul",
    category: "Dairy",
    unit: "PCS",
    sku: "AML-BUT-500G",
    barcode: "8901030728563",
    sellingPrice: 280,
    purchasePrice: 245,
    mrp: 285,
    gstRate: 12,
    hsnCode: "0402",
    openingStock: 25,
    minStockAlert: 5,
  },
  {
    name: "Tata Salt Vacuum Evaporated 1kg",
    brand: "Tata",
    category: "Grocery",
    unit: "KG",
    sku: "TAT-SLT-1KG",
    barcode: "8901030615863",
    sellingPrice: 28,
    purchasePrice: 22,
    mrp: 30,
    gstRate: 5,
    hsnCode: "1006",
    openingStock: 80,
    minStockAlert: 20,
  },
  {
    name: "Maggi 2-Minute Instant Noodles 70g",
    brand: "Nestlé",
    category: "Snacks",
    unit: "PKT",
    sku: "MAG-NDL-70G",
    barcode: "8901058852301",
    sellingPrice: 14,
    purchasePrice: 11.5,
    mrp: 14,
    gstRate: 18,
    hsnCode: "1905",
    openingStock: 120,
    minStockAlert: 30,
  },
  {
    name: "Fortune Sunlite Refined Sunflower Oil 1L",
    brand: "Fortune",
    category: "Grocery",
    unit: "LTR",
    sku: "FOR-OIL-1L",
    barcode: "8906007280143",
    sellingPrice: 155,
    purchasePrice: 132,
    mrp: 165,
    gstRate: 5,
    hsnCode: "1512",
    openingStock: 50,
    minStockAlert: 10,
  },
  {
    name: "Aashirvaad Select Sharbati Atta 5kg",
    brand: "ITC",
    category: "Grocery",
    unit: "BAG",
    sku: "AAS-ATT-5KG",
    barcode: "8901030025983",
    sellingPrice: 320,
    purchasePrice: 275,
    mrp: 335,
    gstRate: 5,
    hsnCode: "1101",
    openingStock: 40,
    minStockAlert: 8,
  },
  {
    name: "Parle-G Glucose Biscuits 800g Super Saver",
    brand: "Parle",
    category: "Biscuits",
    unit: "PKT",
    sku: "PAR-GLU-800",
    barcode: "8901719101019",
    sellingPrice: 85,
    purchasePrice: 72,
    mrp: 90,
    gstRate: 18,
    hsnCode: "1905",
    openingStock: 65,
    minStockAlert: 15,
  },
  // Hygiene & Personal Care
  {
    name: "Dettol Antiseptic Disinfectant Liquid 500ml",
    brand: "Dettol",
    category: "Hygiene",
    unit: "BTL",
    sku: "DET-LIQ-500M",
    barcode: "8901058851403",
    sellingPrice: 195,
    purchasePrice: 160,
    mrp: 210,
    gstRate: 18,
    hsnCode: "3808",
    openingStock: 35,
    minStockAlert: 10,
  },
  {
    name: "Colgate Strong Teeth Toothpaste 500g Value Saver",
    brand: "Colgate",
    category: "Personal Care",
    unit: "PCS",
    sku: "COL-PST-500",
    barcode: "8901314010323",
    sellingPrice: 240,
    purchasePrice: 195,
    mrp: 260,
    gstRate: 18,
    hsnCode: "3306",
    openingStock: 45,
    minStockAlert: 10,
  },
  // Pharmacy
  {
    name: "Paracetamol Tablets 500mg IP (Strip of 10)",
    brand: "Cipla",
    category: "Pharmacy",
    unit: "PKT",
    sku: "CIP-PCM-500",
    barcode: "8906002410507",
    sellingPrice: 22,
    purchasePrice: 14,
    mrp: 25,
    gstRate: 12,
    hsnCode: "3004",
    openingStock: 200,
    minStockAlert: 50,
  },
  {
    name: "Cetirizine 10mg Tablets (Strip of 10)",
    brand: "Sun Pharma",
    category: "Pharmacy",
    unit: "PKT",
    sku: "SUN-CET-10M",
    barcode: "8901117002014",
    sellingPrice: 38,
    purchasePrice: 24,
    mrp: 42,
    gstRate: 12,
    hsnCode: "3004",
    openingStock: 150,
    minStockAlert: 30,
  },
  // Beverages
  {
    name: "Coca-Cola Original Taste 300ml Can",
    brand: "Coca-Cola",
    category: "Beverages",
    unit: "CAN",
    sku: "COK-CAN-300",
    barcode: "8901491101356",
    sellingPrice: 40,
    purchasePrice: 28,
    mrp: 40,
    gstRate: 28,
    hsnCode: "2202",
    openingStock: 60,
    minStockAlert: 15,
  },
  {
    name: "Red Bull Energy Drink 250ml",
    brand: "Red Bull",
    category: "Beverages",
    unit: "CAN",
    sku: "RBL-CAN-250",
    barcode: "9002490205973",
    sellingPrice: 125,
    purchasePrice: 98,
    mrp: 125,
    gstRate: 28,
    hsnCode: "2202",
    openingStock: 48,
    minStockAlert: 12,
  },
  // Hardware & Electrical
  {
    name: "Supreme PVC Elbow Joint 1 inch (Heavy)",
    brand: "Supreme",
    category: "Hardware",
    unit: "PCS",
    sku: "SUP-ELB-1IN",
    barcode: "8901063010222",
    sellingPrice: 25,
    purchasePrice: 16,
    mrp: 28,
    gstRate: 18,
    hsnCode: "7307",
    openingStock: 150,
    minStockAlert: 25,
  },
  {
    name: "Anchor Roma 6A 1-Way Modular Switch White",
    brand: "Panasonic",
    category: "Electrical",
    unit: "PCS",
    sku: "ANC-ROM-6A1W",
    barcode: "8901353001017",
    sellingPrice: 32,
    purchasePrice: 21,
    mrp: 35,
    gstRate: 18,
    hsnCode: "8536",
    openingStock: 180,
    minStockAlert: 40,
  },
];

export function ProductLibraryModal({
  isOpen,
  onClose,
  onAddProducts,
  mode = "library",
}: ProductLibraryModalProps) {
  const [activeTab, setActiveTab] = useState<"library" | "software" | "excel">(mode);
  const [search, setSearch] = useState("");
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(PRESET_LIBRARY_ITEMS.map((_, i) => i))
  );
  const [isAdding, setIsAdding] = useState(false);
  const [selectedSoftware, setSelectedSoftware] = useState<SupportedSoftware>("vyapar");

  // Excel / CSV state
  const [parsedItems, setParsedItems] = useState<Partial<InventoryItem>[]>([]);
  const [pastedCSV, setPastedCSV] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Software migration state
  const [tallyModalOpen, setTallyModalOpen] = useState(false);
  const [softwareParsedItems, setSoftwareParsedItems] = useState<Partial<InventoryItem>[]>([]);
  const softwareFileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSoftwareFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const result = await parseUniversalFile(file, selectedSoftware);
      if (result.items.length === 0) {
        toast.error(`No stock items found in this ${selectedSoftware.toUpperCase()} file. Please verify and try again.`);
        return;
      }
      setSoftwareParsedItems(result.items);
      setActiveTab("software");
      toast.success(`Detected ${result.items.length} items from ${selectedSoftware.toUpperCase()} (${file.name}). Ready to import!`);
      if (result.warnings.length > 0) result.warnings.forEach((w) => toast.warning(w));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : `Failed to parse ${selectedSoftware.toUpperCase()} file.`);
    }
  };

  const handleConfirmSoftwareImport = async () => {
    if (softwareParsedItems.length === 0) return;
    setIsAdding(true);
    try {
      await onAddProducts(softwareParsedItems);
      toast.success(`Imported ${softwareParsedItems.length} items into inventory!`);
      setSoftwareParsedItems([]);
      onClose();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to import items."));
    } finally {
      setIsAdding(false);
    }
  };



  const filteredLibrary = PRESET_LIBRARY_ITEMS.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.name?.toLowerCase().includes(q) ||
      item.brand?.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q) ||
      item.sku?.toLowerCase().includes(q) ||
      item.barcode?.toLowerCase().includes(q)
    );
  });

  const toggleSelect = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleImportSelected = async () => {
    const itemsToAdd = PRESET_LIBRARY_ITEMS.filter((_, i) => selectedIndices.has(i));
    if (itemsToAdd.length === 0) {
      toast.error("Please select at least one item to add.");
      return;
    }

    setIsAdding(true);
    try {
      await onAddProducts(itemsToAdd);
      toast.success(`Added ${itemsToAdd.length} products with barcodes, GST rates & stock!`);
      onClose();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to add products from library."));
    } finally {
      setIsAdding(false);
    }
  };

  const parseProductCSV = (text: string): Partial<InventoryItem>[] => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length <= 1) return [];

    const headers = lines[0].split(/[,\t]/).map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
    const results: Partial<InventoryItem>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(/[,\t]/).map((p) => p.trim());
      if (parts.length < 2) continue;

      const obj: Record<string, string | number> = {};
      headers.forEach((h, idx) => {
        const val = parts[idx] || "";
        if (h.includes("name") || h.includes("item")) obj.name = val;
        else if (h.includes("barcode") || h.includes("code")) obj.barcode = val;
        else if (h.includes("sku")) obj.sku = val;
        else if (h.includes("brand")) obj.brand = val;
        else if (h.includes("category")) obj.category = val;
        else if (h.includes("unit")) obj.unit = val;
        else if (h.includes("selling") || h.includes("sp") || h.includes("rate") || h.includes("saleprice")) obj.sellingPrice = Number.parseFloat(val) || 0;
        else if (h.includes("purchase") || h.includes("cost") || h.includes("pp")) obj.purchasePrice = Number.parseFloat(val) || 0;
        else if (h.includes("mrp")) obj.mrp = Number.parseFloat(val) || 0;
        else if (h.includes("gst") || h.includes("tax")) obj.gstRate = Number.parseFloat(val) || 18;
        else if (h.includes("hsn")) obj.hsnCode = val;
        else if (h.includes("stock") || h.includes("qty") || h.includes("quantity")) obj.openingStock = Number.parseFloat(val) || 0;
      });

      if (obj.name) {
        const sellingPrice = typeof obj.sellingPrice === "number" ? obj.sellingPrice : Number.parseFloat(String(obj.sellingPrice ?? "0")) || 100;
        const purchasePrice = typeof obj.purchasePrice === "number" ? obj.purchasePrice : Number.parseFloat(String(obj.purchasePrice ?? "0")) || Math.round(sellingPrice * 0.8);
        const mrp = typeof obj.mrp === "number" ? obj.mrp : Number.parseFloat(String(obj.mrp ?? "0")) || sellingPrice || 100;
        const gstRate = typeof obj.gstRate === "number" ? obj.gstRate : Number.parseFloat(String(obj.gstRate ?? "0")) || 18;
        const openingStock = typeof obj.openingStock === "number" ? obj.openingStock : Number.parseFloat(String(obj.openingStock ?? "0")) || 10;

        results.push({
          name: String(obj.name),
          barcode: typeof obj.barcode === "string" ? obj.barcode : undefined,
          sku: typeof obj.sku === "string" ? obj.sku : `SKU-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
          category: typeof obj.category === "string" ? obj.category : "General",
          brand: typeof obj.brand === "string" ? obj.brand : "General",
          unit: typeof obj.unit === "string" ? obj.unit : "PCS",
          sellingPrice,
          purchasePrice,
          mrp,
          gstRate,
          hsnCode: typeof obj.hsnCode === "string" ? obj.hsnCode.trim() : "",
          openingStock,
          minStockAlert: 5,
        });
      }
    }
    return results;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    try {
      const res = await parseUniversalFile(file, "custom");
      if (res.items.length === 0) {
        toast.error("No valid product rows found in file. Ensure headers match Item Name, Selling Price, etc.");
      } else {
        setParsedItems(res.items);
        toast.success(`Successfully parsed ${res.items.length} products from ${file.name}!`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to parse spreadsheet file.");
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = "Item Name,Barcode,Brand,Category,Unit,Selling Price,Purchase Price,MRP,GST Rate,HSN Code,Opening Stock\n" +
      "Amul Butter 500g,8901030728563,Amul,Dairy,PCS,280,245,285,12,0402,50\n" +
      "Tata Salt 1kg,8901030615863,Tata,Grocery,KG,28,22,30,5,1006,100\n" +
      "Maggi Noodles 70g,8901058852301,Nestle,Snacks,PKT,14,11.5,14,18,1905,200\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `CredSmart_Product_Catalog_Template.csv`;
    link.click();
    toast.success("Sample Excel/CSV Catalog Template downloaded!");
  };

  const handleConfirmExcelImport = async () => {
    if (parsedItems.length === 0) {
      toast.error("No parsed products to import.");
      return;
    }
    setIsAdding(true);
    try {
      await onAddProducts(parsedItems);
      toast.success(`Successfully imported ${parsedItems.length} products into inventory!`);
      onClose();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to import items."));
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-6xl w-[96vw] max-h-[94vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header (Matching Reference Image) */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <Library className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                Product Library &amp; Software Migration
              </h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                Instantly seed master catalog or import from Vyapar, Tally Prime, My Bill Book, Marg ERP &amp; Busy
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
            onClick={() => setActiveTab("library")}
            className={cn(
              "px-3 sm:px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer",
              activeTab === "library"
                ? "border-primary text-primary bg-primary/5 font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Standard Product Library (FMCG, Pharma, Hardware)
          </button>
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
            Bulk Upload via Excel / CSV
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

        {/* Tab 1: Product Library */}
        {activeTab === "library" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs scrollbar-thin">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search preloaded catalog by product name, brand, barcode, or category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (selectedIndices.size === PRESET_LIBRARY_ITEMS.length) {
                      setSelectedIndices(new Set());
                    } else {
                      setSelectedIndices(new Set(PRESET_LIBRARY_ITEMS.map((_, i) => i)));
                    }
                  }}
                  className="h-9 text-xs cursor-pointer"
                >
                  {selectedIndices.size === PRESET_LIBRARY_ITEMS.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
            </div>

            <div className="border border-border rounded-xl divide-y divide-border overflow-hidden bg-card shadow-2xs">
              {filteredLibrary.map((item, idx) => {
                const isSelected = selectedIndices.has(idx);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleSelect(idx)}
                    className={cn(
                      "p-3 sm:p-3.5 flex items-center justify-between cursor-pointer hover:bg-muted/40 transition-colors gap-3",
                      isSelected && "bg-primary/5"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors",
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-border bg-card"
                        )}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-foreground text-xs sm:text-sm truncate">{item.name}</p>
                        <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground font-mono mt-0.5">
                          <span className="font-semibold text-primary">{item.brand}</span>
                          <span>·</span>
                          <span>{item.category}</span>
                          <span>·</span>
                          <span>Code: {item.barcode}</span>
                          <span>·</span>
                          <span>HSN: {item.hsnCode} ({item.gstRate}% GST)</span>
                          <span>·</span>
                          <span className="text-emerald-600 font-semibold">Stock: {item.openingStock} {item.unit}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono shrink-0">
                      <p className="font-bold text-foreground text-xs sm:text-sm">₹ {item.sellingPrice}</p>
                      <p className="text-[10px] text-muted-foreground">Cost: ₹ {item.purchasePrice}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Bulk Upload via Excel / CSV */}
        {activeTab === "excel" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs scrollbar-thin">
            <div className="p-6 sm:p-8 rounded-3xl border-2 border-dashed border-teal-500/40 hover:border-teal-500/80 bg-gradient-to-b from-teal-500/10 via-emerald-500/5 to-transparent flex flex-col items-center justify-center gap-3.5 text-center transition-all duration-200 shadow-inner">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/30">
                <Upload className="w-7 h-7 stroke-[2.2]" />
              </div>
              <div>
                <p className="font-black text-base text-slate-900 dark:text-white">Upload Excel / CSV Product Master Sheet</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-lg">
                  Direct import with automatic column detection: <span className="font-semibold text-slate-700 dark:text-slate-300">Item Name, Barcode, Selling Price, Purchase Price, MRP, GST Rate, HSN Code, Opening Stock</span>
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
                  <span>Choose Excel / CSV File</span>
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

            {/* Parsed Items Preview */}
            {parsedItems.length > 0 && (
              <div className="border border-emerald-500/30 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-md space-y-2">
                <div className="px-4 py-3 bg-gradient-to-r from-emerald-500/15 to-teal-500/10 border-b border-emerald-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-black text-xs text-emerald-800 dark:text-emerald-300">
                      {parsedItems.length} Products Verified &amp; Ready for Inward Import
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setParsedItems([])}
                    className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                  {parsedItems.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          {item.barcode && `Barcode: ${item.barcode} · `}
                          HSN: {item.hsnCode || "N/A"} · GST: {item.gstRate}% · Stock: {item.openingStock} {item.unit}
                        </p>
                      </div>
                      <div className="text-right font-mono">
                        <p className="font-black text-emerald-600 dark:text-emerald-400">₹ {item.sellingPrice}</p>
                        <p className="text-[10px] text-slate-500">MRP: ₹ {item.mrp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Other Software Migration (Vyapar, Tally Prime, My Bill Book, Marg ERP & Busy) */}
        {activeTab === "software" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs scrollbar-thin">
            <div className="space-y-2">
              <p className="font-bold text-foreground text-sm">Select Your Existing Accounting &amp; POS Software</p>
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
                        ? "border-primary ring-2 ring-primary/20 bg-primary/10 text-primary shadow-sm"
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
                <Building2 className="w-4 h-4 text-primary" />
                How to export from {selectedSoftware.toUpperCase()}:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground leading-relaxed text-[11px]">
                {selectedSoftware === "auto" && (
                  <>
                    <li>Drop any Excel (.xlsx, .xls), CSV, or Tally XML file.</li>
                    <li>CredSmart's signature engine will automatically recognize your software and extract items.</li>
                  </>
                )}
                {selectedSoftware === "vyapar" && (
                  <>
                    <li>Open Vyapar on Desktop / Mobile &gt; Go to <strong>Items Master</strong>.</li>
                    <li>Click the 3 dots at top-right &gt; Choose <strong>Export to Excel</strong>.</li>
                    <li>Upload the exported file below to auto-map Item Names, Barcodes, HSN, Tax, and Stock.</li>
                  </>
                )}
                {selectedSoftware === "tally" && (
                  <>
                    <li>Open Tally Prime &gt; Gateway of Tally &gt; <strong>Stock Summary</strong> or <strong>List of Items</strong>.</li>
                    <li>Press <kbd className="px-1 py-0.5 bg-muted border rounded font-mono">Alt + E</kbd> &gt; Choose <strong>Excel Spreadsheet (XML/CSV)</strong>.</li>
                    <li>Upload the exported sheet below for zero-loss migration.</li>
                  </>
                )}
                {selectedSoftware === "mybillbook" && (
                  <>
                    <li>Open My Bill Book &gt; Go to <strong>Items</strong> in navigation.</li>
                    <li>Click <strong>Bulk Actions / Export Items</strong> &gt; Select <strong>Excel Format</strong>.</li>
                    <li>Upload the exported file here. All custom fields, barcodes, and MRP are preserved.</li>
                  </>
                )}
                {selectedSoftware === "marg" && (
                  <>
                    <li>Open Marg ERP 9+ &gt; Masters &gt; <strong>Inventory Master</strong> &gt; <strong>Item Master</strong>.</li>
                    <li>Press <kbd className="px-1 py-0.5 bg-muted border rounded font-mono">Alt + P</kbd> &gt; Export to <strong>Excel (CSV)</strong>.</li>
                    <li>Upload the Marg export file below.</li>
                  </>
                )}
                {selectedSoftware === "busy" && (
                  <>
                    <li>Open Busy Accounting &gt; Administration &gt; <strong>Bulk Updation</strong> &gt; <strong>Export Items</strong>.</li>
                    <li>Generate the Excel file and upload below.</li>
                  </>
                )}
                {selectedSoftware === "zoho" && (
                  <>
                    <li>Open Zoho Books &gt; Items &gt; Click the hamburger/gear menu &gt; <strong>Export Items</strong>.</li>
                    <li>Export as CSV or XLS and upload below.</li>
                  </>
                )}
              </ol>
            </div>

            {/* Universal Dropzone for Software Export File */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/15 text-primary">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <p className="font-bold text-xs text-foreground">
                    Upload {selectedSoftware === "auto" ? "Any Tool" : selectedSoftware.toUpperCase()} Export File
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-[11px] text-muted-foreground">
                      Supports native <strong>.xlsx, .xls, .xml, .csv</strong> files with auto column detection
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setTallyModalOpen(true)}
                      className="gap-1.5 font-bold text-primary border-primary/30 hover:bg-primary/10 cursor-pointer text-[11px]"
                    >
                      <FileSpreadsheet className="w-3 h-3" />
                      Full Universal Wizard
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => softwareFileRef.current?.click()}
                      className="gap-1.5 font-bold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
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

              {/* Parsed items preview */}
              {softwareParsedItems.length > 0 && (
                <div className="border border-emerald-500/20 rounded-xl overflow-hidden bg-card">
                  <div className="px-4 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                        {softwareParsedItems.length} Items Parsed from {selectedSoftware.toUpperCase()} — Ready to Import
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSoftwareParsedItems([])}
                      className="h-6 text-[11px] text-rose-500 hover:text-rose-600"
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-border scrollbar-thin">
                    {softwareParsedItems.slice(0, 100).map((item, idx) => (
                      <div key={idx} className="px-3 py-2 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-foreground truncate max-w-[200px]">{item.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {item.unit} · HSN: {item.hsnCode || "—"} · GST: {item.gstRate}%
                          </p>
                        </div>
                        <div className="text-right font-mono">
                          <p className="font-bold">Qty: {item.openingStock ?? 0}</p>
                          <p className="text-[10px] text-muted-foreground">₹{(item.sellingPrice ?? item.purchasePrice ?? 0).toFixed(2)}</p>
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
          <Button variant="outline" size="sm" onClick={onClose} disabled={isAdding} className="text-xs cursor-pointer">
            Cancel
          </Button>

          {activeTab === "library" && (
            <button
              type="button"
              onClick={handleImportSelected}
              disabled={selectedIndices.size === 0 || isAdding}
              className="relative flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer disabled:cursor-not-allowed overflow-hidden"
            >
              {isAdding ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              Add {selectedIndices.size} Items to Inventory
            </button>
          )}

          {activeTab === "excel" && (
            <button
              type="button"
              onClick={handleConfirmExcelImport}
              disabled={parsedItems.length === 0 || isAdding}
              className="relative flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 disabled:opacity-50 text-white font-black text-xs shadow-[0_4px_16px_rgba(16,185,129,0.4)] hover:shadow-[0_6px_22px_rgba(16,185,129,0.55)] border border-emerald-400/40 active:scale-95 transition-all cursor-pointer disabled:cursor-not-allowed overflow-hidden group"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
              {isAdding ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200 group-hover:scale-110 transition-transform" />
              )}
              <span>Import {parsedItems.length} Products</span>
            </button>
          )}

          {activeTab === "software" && softwareParsedItems.length > 0 && (
            <button
              type="button"
              onClick={handleConfirmSoftwareImport}
              disabled={isAdding}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
            >
              {isAdding ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              Import {softwareParsedItems.length} {selectedSoftware === "auto" ? "" : selectedSoftware.toUpperCase()} Items
            </button>
          )}

          {activeTab === "software" && softwareParsedItems.length === 0 && (
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
      onImportItems={async (items) => {
        await onAddProducts(items);
        setTallyModalOpen(false);
        onClose();
      }}
      defaultTab="items"
    />
    </>
  );
}

