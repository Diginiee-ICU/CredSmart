import { useState, useEffect, useRef } from "react";
import {
  X,
  Package,
  QrCode,
  Tag,
  Percent,
  Layers,
  Calendar,
  Warehouse,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Search,
  Plus,
  Trash2,
  DollarSign,
} from "lucide-react";
import { InventoryItem, ItemUnit, GSTRate, ItemBatch } from "@/types/inventory";
import { searchHSNCodes, HSNRecord, COMMON_HSN_CODES } from "@/utils/hsnLookup";
import { STANDARD_GST_UNITS, STANDARD_HSN_CODES } from "@/utils/suggestionData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CreateItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: Omit<InventoryItem, "id" | "created_at" | "isLowStock">) => Promise<void>;
  initialData?: InventoryItem | null;
  categories: string[];
  godowns?: { id: string; name: string }[];
}

const DEFAULT_CATEGORY_SUGGESTIONS = [
  "Groceries & Staples",
  "Dairy & Bakery",
  "Instant Food & Snacks",
  "Personal Care",
  "Household Cleaning",
  "Beverages & Tea",
  "Electronics & Accessories",
  "Hardware & Tools",
  "Apparel",
  "Pharmacy & Health",
  "General",
];

const UNIT_OPTIONS: ItemUnit[] = [
  "PCS",
  "KG",
  "LTR",
  "BOX",
  "NOS",
  "MTR",
  "PKT",
  "DOZ",
  "BAG",
  "CAN",
  "BTL",
  "SET",
  "GM",
  "ML",
  "STEPS",
];

const GST_RATES: GSTRate[] = [0, 0.1, 0.25, 3, 5, 12, 18, 28];

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : typeof error === "string" ? error : fallback;

export function CreateItemModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  categories = [],
  godowns = [
    { id: "g-main", name: "Main Central Godown" },
    { id: "g-north", name: "North Branch Warehouse" },
    { id: "g-cold", name: "Cold Storage Unit 1" },
  ],
}: CreateItemModalProps) {
  const [activeTab, setActiveTab] = useState<"basic" | "pricing" | "stock" | "batch">("basic");

  // Merge default categories with custom categories
  const allCategories = Array.from(
    new Set([...categories.filter(Boolean), ...DEFAULT_CATEGORY_SUGGESTIONS])
  );

  // Basic Info
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [category, setCategory] = useState(allCategories[0] || "General");
  const [brand, setBrand] = useState("");
  const [unit, setUnit] = useState<ItemUnit>("PCS");

  // Pricing & Tax
  const [sellingPrice, setSellingPrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [gstRate, setGstRate] = useState<GSTRate>(18);
  const [hsnCode, setHsnCode] = useState("");
  const [hsnSearchQuery, setHsnSearchQuery] = useState("");
  const [hsnSuggestions, setHsnSuggestions] = useState<HSNRecord[]>([]);
  const [showHsnDropdown, setShowHsnDropdown] = useState(false);

  // Stock & Warehouses
  const [openingStock, setOpeningStock] = useState("0");
  const [minStockAlert, setMinStockAlert] = useState("10");
  const [godownId, setGodownId] = useState(godowns[0]?.id || "g-main");

  // Batch & Expiry
  const [trackBatches, setTrackBatches] = useState(false);
  const [batchNumber, setBatchNumber] = useState("");
  const [manufacturingDate, setManufacturingDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setSku(initialData.sku || "");
      setBarcode(initialData.barcode || "");
      setCategory(initialData.category || allCategories[0] || "General");
      setBrand(initialData.brand || "");
      setUnit(initialData.unit || (initialData as any)?.tags?.unit || "PCS");
      const initSelling = initialData.sellingPrice ?? (initialData as any)?.selling_price ?? initialData.mrp ?? (initialData as any)?.tags?.selling_price ?? (initialData as any)?.tags?.mrp ?? "";
      const initPurchase = initialData.purchasePrice ?? (initialData as any)?.purchase_price ?? (initialData as any)?.tags?.purchase_price ?? "";
      const initMrp = initialData.mrp ?? (initialData as any)?.tags?.mrp ?? initSelling ?? "";
      const initStock = initialData.currentStock ?? initialData.openingStock ?? (initialData as any)?.stock ?? (initialData as any)?.tags?.stock ?? "0";
      const initMinAlert = initialData.minStockAlert ?? (initialData as any)?.tags?.min_stock_alert ?? "10";

      setSellingPrice(initSelling ? String(initSelling) : "");
      setPurchasePrice(initPurchase ? String(initPurchase) : "");
      setMrp(initMrp ? String(initMrp) : "");
      setGstRate(initialData.gstRate || (initialData as any)?.tax_rate || 18);
      setHsnCode(initialData.hsnCode || (initialData as any)?.tags?.hsn_code || "");
      setOpeningStock(String(initStock));
      setMinStockAlert(String(initMinAlert));
      setGodownId(initialData.godownId || godowns[0]?.id || "g-main");
      if (initialData.batches && initialData.batches.length > 0) {
        setTrackBatches(true);
        const b = initialData.batches[0];
        setBatchNumber(b.batchNumber || "");
        setExpiryDate(b.expiryDate || "");
        setManufacturingDate(b.manufacturingDate || "");
      } else {
        setTrackBatches(false);
        setBatchNumber("");
        setExpiryDate("");
        setManufacturingDate("");
      }
    } else {
      setName("");
      setSku(`SKU-${Math.floor(100000 + Math.random() * 900000)}`);
      setBarcode("");
      setCategory(allCategories[0] || "General");
      setBrand("");
      setUnit("PCS");
      setSellingPrice("");
      setPurchasePrice("");
      setMrp("");
      setGstRate(18);
      setHsnCode("");
      setOpeningStock("0");
      setMinStockAlert("10");
      setGodownId(godowns[0]?.id || "g-main");
      setTrackBatches(false);
      setBatchNumber("");
      setExpiryDate("");
      setManufacturingDate("");
    }
  }, [initialData, isOpen]);

  const formScrollRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (isOpen) {
      formScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
      if (formScrollRef.current) formScrollRef.current.scrollTop = 0;
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleGenerateBarcode = () => {
    const randomEAN = `890${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    setBarcode(randomEAN);
    toast.success("Generated standard EAN-13 barcode!");
  };

  const handleHsnSearchChange = (query: string) => {
    setHsnSearchQuery(query);
    setHsnCode(query);
    const results = searchHSNCodes(query);
    setHsnSuggestions(results);
    setShowHsnDropdown(true);
  };

  const handleSelectHsn = (rec: HSNRecord) => {
    setHsnCode(rec.code);
    setHsnSearchQuery(rec.code);
    setGstRate(rec.gstRate);
    setShowHsnDropdown(false);
    toast.success(`Selected HSN ${rec.code} (GST: ${rec.gstRate}%)`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Item Name is required.");
      return;
    }

    const sPrice = parseFloat(sellingPrice) || 0;
    const pPrice = parseFloat(purchasePrice) || 0;
    const mrpVal = parseFloat(mrp) || sPrice;
    const opStock = parseFloat(openingStock) || 0;
    const minStock = parseFloat(minStockAlert) || 5;

    const batches: ItemBatch[] = [];
    if (trackBatches || batchNumber.trim()) {
      batches.push({
        id: `batch-${Date.now()}`,
        productId: initialData?.id || "",
        batchNumber: batchNumber.trim() || "BATCH-01",
        mrp: mrpVal,
        sellingPrice: sPrice,
        costPrice: pPrice,
        stock: opStock,
        locationId: godownId,
        locationName: godowns.find((g) => g.id === godownId)?.name,
        manufacturingDate: manufacturingDate || null,
        expiryDate: expiryDate || null,
      });
    }

    const payload: Omit<InventoryItem, "id" | "created_at" | "isLowStock"> = {
      name: name.trim(),
      sku: sku.trim() || `SKU-${Date.now().toString().slice(-6)}`,
      barcode: barcode.trim() || null,
      category: category || "General",
      brand: brand.trim() || null,
      unit,
      sellingPrice: sPrice,
      purchasePrice: pPrice,
      mrp: mrpVal,
      gstRate,
      hsnCode: hsnCode.trim() || null,
      currentStock: opStock,
      openingStock: opStock,
      minStockAlert: minStock,
      godownId,
      godownName: godowns.find((g) => g.id === godownId)?.name,
      batches,
    };

    setIsSubmitting(true);
    try {
      await onSave(payload);
      onClose();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to save item."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-card w-full h-[100dvh] max-h-[100dvh] max-w-full rounded-none border-none p-0 sm:max-w-5xl sm:h-auto sm:max-h-[92vh] sm:rounded-2xl sm:border flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 shadow-2xl">
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 text-primary">
              <Package className="w-4 sm:w-5 h-4 sm:h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                {initialData ? "Edit Product / Item" : "Create New Item"}
              </h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-1">
                GST tax rates, HSN code lookup, pricing slabs, stock units & batch tracking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-border px-3 sm:px-6 bg-muted/20 gap-1 overflow-x-auto scrollbar-none shrink-0">
          {[
            { id: "basic", label: "Basic Details" },
            { id: "pricing", label: "Pricing & GST Tax" },
            { id: "stock", label: "Inventory & Godown" },
            { id: "batch", label: "Batch & Expiry" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as "basic" | "pricing" | "stock" | "batch")}
              className={cn(
                "px-3 sm:px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form ref={formScrollRef} onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6 scrollbar-thin">
          {/* TAB 1: Basic Details */}
          {activeTab === "basic" && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="item-name" className="text-xs font-semibold">
                  Item / Product Name *
                </Label>
                <Input
                  id="item-name"
                  placeholder="e.g. Amul Butter Pasteurized 500g"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="item-sku" className="text-xs font-semibold">
                      SKU / Item Code *
                    </Label>
                    <button
                      type="button"
                      onClick={() => setSku(`SKU-${Math.floor(100000 + Math.random() * 900000)}`)}
                      className="text-[10px] text-primary hover:underline"
                    >
                      Auto-generate
                    </button>
                  </div>
                  <Input
                    id="item-sku"
                    placeholder="e.g. AML-BUT-500G"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="font-mono text-xs uppercase"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="item-barcode" className="text-xs font-semibold">
                      Barcode / EAN-13
                    </Label>
                    <button
                      type="button"
                      onClick={handleGenerateBarcode}
                      className="text-[10px] text-primary hover:underline"
                    >
                      Generate Barcode
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="item-barcode"
                      placeholder="e.g. 8901030728563"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      className="font-mono text-xs"
                    />
                    <QrCode className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {allCategories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="item-brand" className="text-xs font-semibold">
                    Brand / Manufacturer
                  </Label>
                  <Input
                    id="item-brand"
                    placeholder="e.g. Amul / Nestlé / Cadbury"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Primary Unit *</Label>
                  <Select value={unit} onValueChange={(val) => setUnit(val as ItemUnit)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Pricing & Tax */}
          {activeTab === "pricing" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="selling-price" className="text-xs font-semibold">
                    Selling Price (₹) *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                      ₹
                    </span>
                    <Input
                      id="selling-price"
                      type="number"
                      placeholder="0.00"
                      className="pl-8 text-sm font-bold"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="purchase-price" className="text-xs font-semibold">
                    Purchase / Cost Price (₹) *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                      ₹
                    </span>
                    <Input
                      id="purchase-price"
                      type="number"
                      placeholder="0.00"
                      className="pl-8 text-sm font-bold"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="item-mrp" className="text-xs font-semibold">
                    MRP (Maximum Retail Price ₹)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                      ₹
                    </span>
                    <Input
                      id="item-mrp"
                      type="number"
                      placeholder="0.00"
                      className="pl-8 text-sm font-bold"
                      value={mrp}
                      onChange={(e) => setMrp(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              {/* Profit Margin Indicator */}
              {sellingPrice && purchasePrice && parseFloat(sellingPrice) > 0 && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                  <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                    Gross Profit Margin:
                  </span>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                    ₹ {(parseFloat(sellingPrice) - parseFloat(purchasePrice)).toFixed(2)} (
                    {(((parseFloat(sellingPrice) - parseFloat(purchasePrice)) / parseFloat(purchasePrice || "1")) * 100).toFixed(1)}
                    %)
                  </span>
                </div>
              )}

              {/* GST Rate & HSN Code Lookup */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">GST Tax Rate (%)</Label>
                  <Select value={gstRate.toString()} onValueChange={(v) => setGstRate(parseFloat(v) as GSTRate)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select GST Rate" />
                    </SelectTrigger>
                    <SelectContent>
                      {GST_RATES.map((rate) => (
                        <SelectItem key={rate} value={rate.toString()}>
                          {rate}% GST {rate === 0 ? "(Exempted)" : rate === 5 ? "(Essential Food)" : rate === 18 ? "(Standard)" : rate === 28 ? "(Luxury / Aerated)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 relative">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="hsn-code" className="text-xs font-semibold">
                      HSN / SAC Code
                    </Label>
                    <span className="text-[10px] text-muted-foreground">Type to search HSN library</span>
                  </div>
                  <div className="relative">
                    <Input
                      id="hsn-code"
                      placeholder="e.g. 0402 (Dairy), 1905 (Biscuits)"
                      value={hsnCode}
                      onChange={(e) => handleHsnSearchChange(e.target.value)}
                      onFocus={() => {
                        if (hsnCode) handleHsnSearchChange(hsnCode);
                      }}
                      className="font-mono"
                    />
                    <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>

                  {showHsnDropdown && hsnSuggestions.length > 0 && (
                    <div className="absolute z-[200] top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-border text-xs">
                      {hsnSuggestions.map((h) => (
                        <button
                          key={h.code}
                          type="button"
                          onClick={() => handleSelectHsn(h)}
                          className="w-full text-left p-2.5 hover:bg-muted/50 transition-colors flex items-center justify-between group"
                        >
                          <div>
                            <span className="font-bold text-foreground font-mono mr-2">{h.code}</span>
                            <span className="text-muted-foreground text-[11px]">{h.description}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                            {h.gstRate}% GST
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Inventory & Godown */}
          {activeTab === "stock" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="opening-stock" className="text-xs font-semibold">
                    Opening Stock Quantity ({unit})
                  </Label>
                  <Input
                    id="opening-stock"
                    type="number"
                    placeholder="0"
                    value={openingStock}
                    onChange={(e) => setOpeningStock(e.target.value)}
                    min="0"
                  />
                  <p className="text-[11px] text-muted-foreground">Initial inventory on-hand balance</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="min-stock" className="text-xs font-semibold">
                    Low Stock Alert Level ({unit})
                  </Label>
                  <Input
                    id="min-stock"
                    type="number"
                    placeholder="10"
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(e.target.value)}
                    min="0"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Triggers reorder warning when stock reaches this threshold
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Default Godown / Warehouse Location</Label>
                <Select value={godownId} onValueChange={setGodownId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {godowns.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Stock will be assigned to this facility upon item creation
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: Batch & Expiry Tracking */}
          {activeTab === "batch" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
                <div className="space-y-0.5">
                  <p className="font-bold text-foreground text-xs">Enable Batch & Expiry Tracking</p>
                  <p className="text-[11px] text-muted-foreground">
                    Crucial for Pharma, Dairy, FMCG & Perishables with FEFO inventory rotation
                  </p>
                </div>
                <Switch checked={trackBatches} onCheckedChange={setTrackBatches} />
              </div>

              {trackBatches && (
                <div className="space-y-4 p-4 rounded-xl border border-border bg-card animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="batch-number" className="text-xs font-semibold">
                        Batch Number
                      </Label>
                      <Input
                        id="batch-number"
                        placeholder="e.g. BATCH-2026A"
                        value={batchNumber}
                        onChange={(e) => setBatchNumber(e.target.value.toUpperCase())}
                        className="font-mono text-xs uppercase"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="mfg-date" className="text-xs font-semibold">
                        Manufacturing Date
                      </Label>
                      <Input
                        id="mfg-date"
                        type="date"
                        value={manufacturingDate}
                        onChange={(e) => setManufacturingDate(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="expiry-date" className="text-xs font-semibold">
                        Expiry Date
                      </Label>
                      <Input
                        id="expiry-date"
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div>
              {activeTab !== "basic" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (activeTab === "pricing") setActiveTab("basic");
                    else if (activeTab === "stock") setActiveTab("pricing");
                    else if (activeTab === "batch") setActiveTab("stock");
                  }}
                >
                  ← Back
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              {activeTab !== "batch" ? (
                <Button
                  type="button"
                  onClick={() => {
                    if (activeTab === "basic") setActiveTab("pricing");
                    else if (activeTab === "pricing") setActiveTab("stock");
                    else if (activeTab === "stock") setActiveTab("batch");
                  }}
                  className="gap-1.5"
                >
                  Continue →
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting} className="gap-2 font-bold">
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {initialData ? "Update Item" : "Save & Create Item"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
