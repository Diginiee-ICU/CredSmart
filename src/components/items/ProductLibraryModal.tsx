import { useState } from "react";
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
} from "lucide-react";
import { InventoryItem } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProductLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProducts: (products: Partial<InventoryItem>[]) => Promise<void>;
  mode?: "library" | "software_import";
}

const PRESET_LIBRARY_ITEMS: Partial<InventoryItem>[] = [
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
];

export function ProductLibraryModal({
  isOpen,
  onClose,
  onAddProducts,
  mode = "library",
}: ProductLibraryModalProps) {
  const [activeTab, setActiveTab] = useState<"library" | "software">(mode);
  const [search, setSearch] = useState("");
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(PRESET_LIBRARY_ITEMS.map((_, i) => i))
  );
  const [isAdding, setIsAdding] = useState(false);
  const [selectedSoftware, setSelectedSoftware] = useState<"vyapar" | "tally" | "marg" | "busy">("vyapar");

  if (!isOpen) return null;

  const filteredLibrary = PRESET_LIBRARY_ITEMS.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.name?.toLowerCase().includes(q) ||
      item.brand?.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q) ||
      item.sku?.toLowerCase().includes(q)
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
      toast.success(`Added ${itemsToAdd.length} products to your inventory!`);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add products from library.");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-6xl w-[95vw] max-h-[92vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Library className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Product Library & Software Migration
              </h2>
              <p className="text-xs text-muted-foreground">
                Instantly seed master catalog or import from Vyapar, Tally Prime, Marg ERP & Busy
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

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-border px-6 bg-muted/20 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("library")}
            className={cn(
              "px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors",
              activeTab === "library"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Standard Product Library (FMCG, Pharma, Hardware)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("software")}
            className={cn(
              "px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors",
              activeTab === "software"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Import from Vyapar / Tally / Marg / Busy
          </button>
        </div>

        {/* Tab 1: Product Library */}
        {activeTab === "library" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search catalog by name, brand, barcode..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
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
                className="h-9 text-xs"
              >
                {selectedIndices.size === PRESET_LIBRARY_ITEMS.length ? "Deselect All" : "Select All"}
              </Button>
            </div>

            <div className="border border-border rounded-xl divide-y divide-border overflow-hidden bg-card">
              {filteredLibrary.map((item, idx) => {
                const isSelected = selectedIndices.has(idx);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleSelect(idx)}
                    className={cn(
                      "p-3 flex items-center justify-between cursor-pointer hover:bg-muted/40 transition-colors",
                      isSelected && "bg-primary/5"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-border bg-card"
                        )}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {item.brand} · {item.category} · Barcode: {item.barcode} · HSN: {item.hsnCode} ({item.gstRate}% GST)
                        </p>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <p className="font-bold text-foreground">₹ {item.sellingPrice}</p>
                      <p className="text-[10px] text-muted-foreground">Cost: ₹ {item.purchasePrice}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Other Software Migration */}
        {activeTab === "software" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
            <div className="space-y-2">
              <p className="font-bold text-foreground text-sm">Select Your Existing Accounting Software</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: "vyapar", label: "Vyapar App", color: "text-red-500" },
                  { id: "tally", label: "Tally Prime / ERP 9", color: "text-amber-500" },
                  { id: "marg", label: "Marg ERP 9+", color: "text-blue-500" },
                  { id: "busy", label: "Busy Accounting", color: "text-purple-500" },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSoftware(s.id as any)}
                    className={cn(
                      "p-4 rounded-xl border text-center font-bold transition-all",
                      selectedSoftware === s.id
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border hover:bg-muted text-foreground"
                    )}
                  >
                    <FileSpreadsheet className={cn("w-6 h-6 mx-auto mb-2", s.color)} />
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
              <p className="font-bold text-foreground">
                How to export from {selectedSoftware.toUpperCase()}:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground leading-relaxed text-[11px]">
                <li>Open your {selectedSoftware.toUpperCase()} application.</li>
                <li>Go to Reports / Master Lists &gt; Item Master / Stock Summary.</li>
                <li>Click <strong>Export to Excel / CSV</strong>.</li>
                <li>Upload the generated file here to auto-map columns (Name, SKU, Stock, MRP, Cost).</li>
              </ol>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-muted/40 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isAdding}>
            Cancel
          </Button>
          {activeTab === "library" ? (
            <Button
              size="sm"
              onClick={handleImportSelected}
              disabled={selectedIndices.size === 0 || isAdding}
              className="gap-1.5 font-bold"
            >
              {isAdding ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Add {selectedIndices.size} Items to Inventory
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                toast.success(`Importing schema prepared for ${selectedSoftware.toUpperCase()}!`);
                onClose();
              }}
              className="gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Upload {selectedSoftware.toUpperCase()} Export File
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
