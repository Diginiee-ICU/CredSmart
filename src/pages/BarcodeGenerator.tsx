import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { productsApi } from "@/services/productsApi";
import { useOrganization } from "@/hooks/useOrganization";
import {
  Printer,
  Search,
  Plus,
  Minus,
  Barcode as BarcodeIcon,
  Sliders,
  Trash2,
  Tag,
  Store,
  Layers,
  X,
  Eye,
  Settings2,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react";
import Barcode from "react-barcode";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface BarcodeProduct {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  brand?: string | null;
  category?: string | null;
  price: number;
  stock: number;
  batchNumber?: string | null;
}

interface QueuedLabel extends BarcodeProduct {
  quantity: number;
}

type PaperPreset = "thermal-50x38" | "thermal-38x25" | "a4-24" | "a4-40" | "a4-65";
type BarcodeFormat = "CODE128" | "EAN13" | "CODE39" | "UPC";

export default function BarcodeGenerator() {
  const { orgId, org } = useOrganization();
  const location = useLocation();
  const [products, setProducts] = useState<BarcodeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedLabels, setSelectedLabels] = useState<QueuedLabel[]>([]);

  useEffect(() => {
    const prefilled = (location.state as { prefilledItem?: Record<string, unknown> })?.prefilledItem;
    if (prefilled) {
      const barcodeItem: BarcodeProduct = {
        id: String(prefilled.id || `item-${Date.now()}`),
        name: String(prefilled.name || "Item"),
        sku: String(prefilled.sku || prefilled.barcode || ""),
        barcode: String(prefilled.barcode || prefilled.sku || ""),
        brand: String(prefilled.brand || ""),
        category: String(prefilled.category || ""),
        price: Number(prefilled.mrp || prefilled.sellingPrice || prefilled.price || 0),
        stock: Number(prefilled.stock || prefilled.currentStock || 0),
      };
      setSelectedLabels((prev) => {
        if (prev.some((l) => l.id === barcodeItem.id)) return prev;
        return [{ ...barcodeItem, quantity: 1 }, ...prev];
      });
    }
  }, [location.state]);

  // Paper & Sizing Controls
  const [paperPreset, setPaperPreset] = useState<PaperPreset>("thermal-50x38");
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>("CODE128");
  const [barcodeHeight, setBarcodeHeight] = useState<number>(36);
  const [barcodeWidth, setBarcodeWidth] = useState<number>(1.3);
  const [fontSize, setFontSize] = useState<number>(10);

  // Content Visibility Toggles
  const [showShopName, setShowShopName] = useState<boolean>(true);
  const [showProductName, setShowProductName] = useState<boolean>(true);
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showSkuText, setShowSkuText] = useState<boolean>(true);
  const [customShopName, setCustomShopName] = useState<string>("");

  const storeDisplayName = customShopName.trim() || org?.name || "CredSmart POS Store";

  useEffect(() => {
    if (!orgId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    const fetchProducts = async () => {
      setLoading(true);
      try {
        const { data: prodData, error: prodError } = await productsApi.getProducts(orgId);

        if (prodError) {
          console.error("fetchProducts error:", prodError);
          toast({ title: "Error loading products", description: prodError.message, variant: "destructive" });
          setProducts([]);
          setLoading(false);
          return;
        }

        if (!prodData || prodData.length === 0) {
          setProducts([]);
          setLoading(false);
          return;
        }

        // Fetch batches to get current price / MRP for each product
        const prodIds = prodData.map((p) => p.id);
        const { data: batchData, error: batchError } = await productsApi.getBatches(prodIds, orgId);

        if (batchError) {
          console.warn("fetch batches error:", batchError);
        }

        const priceMap: Record<string, { mrp: number; stock: number; batchNumber?: string }> = {};
        (batchData || []).forEach((b) => {
          const pId = b.product_id || b.productId;
          if (!pId) return;
          const bStock = Number(b.stock || 0);
          if (!priceMap[pId] || (bStock > 0 && priceMap[pId].stock <= 0)) {
            priceMap[pId] = {
              mrp: Number(b.mrp || 0),
              stock: bStock,
              batchNumber: b.batch_number || b.batchNumber,
            };
          }
        });

        const mapped: BarcodeProduct[] = prodData.map((p) => {
          const batch = priceMap[p.id];
          return {
            id: p.id,
            name: p.name,
            sku: p.sku || p.barcode || "",
            barcode: p.barcode || p.sku || "",
            brand: p.brand || "",
            category: p.category || "",
            price: batch?.mrp || 0,
            stock: batch?.stock || 0,
            batchNumber: batch?.batchNumber,
          };
        });

        setProducts(mapped);
      } catch (err: unknown) {
        console.error("fetchProducts unexpected:", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [orgId]);

  // Adjust default dimensions based on selected preset
  const handlePresetChange = (preset: PaperPreset) => {
    setPaperPreset(preset);
    if (preset === "thermal-50x38") {
      setBarcodeHeight(34);
      setBarcodeWidth(1.3);
      setFontSize(10);
    } else if (preset === "thermal-38x25") {
      setBarcodeHeight(22);
      setBarcodeWidth(1.0);
      setFontSize(9);
    } else if (preset === "a4-24") {
      setBarcodeHeight(36);
      setBarcodeWidth(1.3);
      setFontSize(10);
    } else if (preset === "a4-40") {
      setBarcodeHeight(26);
      setBarcodeWidth(1.1);
      setFontSize(9);
    } else if (preset === "a4-65") {
      setBarcodeHeight(20);
      setBarcodeWidth(0.9);
      setFontSize(8);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
      (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase())) ||
      (p.brand && p.brand.toLowerCase().includes(search.toLowerCase()))
  );

  const addLabel = (product: BarcodeProduct, count = 1) => {
    const existing = selectedLabels.find((l) => l.id === product.id);
    if (existing) {
      setSelectedLabels(
        selectedLabels.map((l) =>
          l.id === product.id ? { ...l, quantity: l.quantity + count } : l
        )
      );
    } else {
      setSelectedLabels([...selectedLabels, { ...product, quantity: count }]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setSelectedLabels(
      selectedLabels
        .map((l) => {
          if (l.id === id) return { ...l, quantity: Math.max(0, l.quantity + delta) };
          return l;
        })
        .filter((l) => l.quantity > 0)
    );
  };

  const setExactQuantity = (id: string, qty: number) => {
    const safeQty = Math.max(0, Math.floor(qty) || 0);
    if (safeQty === 0) {
      setSelectedLabels(selectedLabels.filter((l) => l.id !== id));
    } else {
      setSelectedLabels(
        selectedLabels.map((l) => (l.id === id ? { ...l, quantity: safeQty } : l))
      );
    }
  };

  const addAllFiltered = () => {
    if (filteredProducts.length === 0) return;
    const map = new Map(selectedLabels.map((l) => [l.id, l]));
    filteredProducts.forEach((p) => {
      const existing = map.get(p.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        map.set(p.id, { ...p, quantity: 1 });
      }
    });
    setSelectedLabels(Array.from(map.values()));
    toast({ title: `Added ${filteredProducts.length} items to print queue` });
  };

  const totalLabelCount = selectedLabels.reduce((s, l) => s + l.quantity, 0);

  const handlePrint = () => {
    const printContent = document.getElementById("print-area");
    if (!printContent || selectedLabels.length === 0) {
      toast({ title: "Queue is empty", description: "Add products to the queue to print barcodes.", variant: "destructive" });
      return;
    }

    const printWindow = window.open("", "_blank", "width=850,height=900");
    if (!printWindow) {
      toast({
        title: "Print popup blocked",
        description: "Please allow popups in your browser to print barcode stickers.",
        variant: "destructive",
      });
      return;
    }

    let cssRules = "";
    if (paperPreset === "thermal-50x38") {
      cssRules = `
        @page { size: 50mm 38mm; margin: 0; }
        body { margin: 0; padding: 2mm; background: #fff; display: flex; flex-direction: column; align-items: center; }
        .label-grid { display: block; width: 100%; }
        .label {
          width: 46mm; height: 34mm; margin: 0 auto 4mm;
          border: 1px dashed #bbb; border-radius: 4px; padding: 2px;
          display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;
          page-break-after: always; box-sizing: border-box; overflow: hidden;
        }
        @media print { .label { border: none; margin: 0; height: 38mm; page-break-after: always; } }
      `;
    } else if (paperPreset === "thermal-38x25") {
      cssRules = `
        @page { size: 38mm 25mm; margin: 0; }
        body { margin: 0; padding: 1.5mm; background: #fff; }
        .label-grid { display: block; width: 100%; }
        .label {
          width: 35mm; height: 22mm; margin: 0 auto 3mm;
          border: 1px dashed #bbb; border-radius: 3px; padding: 1px;
          display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;
          page-break-after: always; box-sizing: border-box; overflow: hidden;
        }
        @media print { .label { border: none; margin: 0; height: 25mm; page-break-after: always; } }
      `;
    } else if (paperPreset === "a4-24") {
      cssRules = `
        @page { size: A4 portrait; margin: 8mm; }
        body { margin: 0; padding: 0; background: #fff; font-family: sans-serif; }
        .label-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 4mm; width: 100%; box-sizing: border-box;
        }
        .label {
          border: 1px dashed #ccc; border-radius: 4px; padding: 4px 6px;
          height: 33mm; display: flex; flex-direction: column; justify-content: center; align-items: center;
          text-align: center; page-break-inside: avoid; box-sizing: border-box; overflow: hidden;
        }
      `;
    } else if (paperPreset === "a4-40") {
      cssRules = `
        @page { size: A4 portrait; margin: 6mm; }
        body { margin: 0; padding: 0; background: #fff; font-family: sans-serif; }
        .label-grid {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 3mm; width: 100%; box-sizing: border-box;
        }
        .label {
          border: 1px dashed #ccc; border-radius: 3px; padding: 2px 4px;
          height: 26mm; display: flex; flex-direction: column; justify-content: center; align-items: center;
          text-align: center; page-break-inside: avoid; box-sizing: border-box; overflow: hidden;
        }
      `;
    } else {
      cssRules = `
        @page { size: A4 portrait; margin: 5mm; }
        body { margin: 0; padding: 0; background: #fff; font-family: sans-serif; }
        .label-grid {
          display: grid; grid-template-columns: repeat(5, 1fr);
          gap: 2mm; width: 100%; box-sizing: border-box;
        }
        .label {
          border: 1px dashed #ccc; border-radius: 2px; padding: 2px;
          height: 20mm; display: flex; flex-direction: column; justify-content: center; align-items: center;
          text-align: center; page-break-inside: avoid; box-sizing: border-box; overflow: hidden;
        }
      `;
    }

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Print Barcodes — ${storeDisplayName}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #000; }
            .shop-name { font-size: 8px; font-weight: 800; text-transform: uppercase; margin-bottom: 1px; color: #111; max-width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
            .product-name { font-size: 10px; font-weight: 700; margin-bottom: 2px; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #111; }
            .price { font-size: 11px; font-weight: 900; margin-top: 1px; color: #000; }
            .barcode-svg { max-height: 48px; max-width: 100%; }
            ${cssRules}
          </style>
        </head>
        <body>
          <div class="label-grid">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                window.close();
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const previewProduct: BarcodeProduct = selectedLabels[0] || products[0] || {
    id: "preview",
    name: "Sample Organic Green Tea 100g",
    sku: "8901234567890",
    barcode: "8901234567890",
    price: 249.0,
    stock: 25,
    brand: "FreshLeaf",
    category: "Beverages",
  };

  const getBarcodeValue = (p: { barcode?: string | null; sku?: string | null }) => {
    const val = p.barcode || p.sku || "8901234567890";
    return val.trim() || "8901234567890";
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white font-sans flex items-center gap-2.5">
              <BarcodeIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Barcode &amp; MRP Label Studio
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>LABEL ENGINE</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Batch-generate and print barcode stickers for thermal roll printers or A4 sticker sheets.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handlePrint}
            disabled={selectedLabels.length === 0}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl glowing-btn-amber text-white font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-40 flex-1 sm:flex-none"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
            <span>Print Labels ({totalLabelCount})</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Product Selector (5 Cols) */}
        <div className="lg:col-span-5 glass-card-3d rounded-2xl shadow-sm overflow-hidden flex flex-col h-[640px]">
          {/* Header & Search */}
          <div className="p-3.5 sm:p-4 border-b border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white font-mono">
                1. Select Products
              </span>
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="text-[11px] font-medium">
                  {products.length} Items
                </Badge>
                {filteredProducts.length > 0 && (
                  <button
                    type="button"
                    onClick={addAllFiltered}
                    className="text-[11px] font-bold text-primary hover:underline ml-1"
                  >
                    + Add All ({filteredProducts.length})
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, SKU, or barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-8 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-xs sm:text-sm font-medium"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Product list */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-xs">Loading inventory products...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center p-4">
                <Tag className="w-10 h-10 mb-2 opacity-30 text-primary" />
                <p className="font-semibold text-sm">No items found</p>
                <p className="text-xs mt-0.5">
                  {products.length === 0
                    ? "Add products to inventory to generate barcodes."
                    : "Try searching with a different product name or SKU."}
                </p>
              </div>
            ) : (
              filteredProducts.map((p) => {
                const queued = selectedLabels.find((l) => l.id === p.id);
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all text-left",
                      queued
                        ? "bg-primary/5 border-primary/40 shadow-xs"
                        : "bg-background border-border hover:border-primary/40 hover:bg-muted/30"
                    )}
                  >
                    <div className="min-w-0 flex-1 pr-2 cursor-pointer" onClick={() => addLabel(p, 1)}>
                      <p className="font-semibold text-foreground text-xs sm:text-sm truncate">{p.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                        <span className="font-mono bg-muted px-1.5 py-0.2 rounded">
                          {p.barcode || p.sku || "No Barcode"}
                        </span>
                        <span>·</span>
                        <span className="font-bold text-foreground">₹{p.price.toFixed(2)}</span>
                        {p.stock > 0 && <span className="text-muted-foreground">({p.stock} in stock)</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {queued ? (
                        <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => updateQuantity(p.id, -1)}
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted font-bold text-xs"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold text-xs w-5 text-center">{queued.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(p.id, 1)}
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted font-bold text-xs text-primary"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addLabel(p, 1)}
                          className="w-7 h-7 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors text-muted-foreground"
                          title="Add 1 label"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Center/Right Column: Live Preview & Print Queue (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Live Preview Card with Styling Controls */}
          <div className="bg-card border border-border rounded-2xl shadow-sm p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-foreground text-sm sm:text-base">Sticker Preview & Formatting</h3>
              </div>

              {/* Paper Preset Selector */}
              <div className="flex items-center gap-1.5">
                <select
                  value={paperPreset}
                  onChange={(e) => handlePresetChange(e.target.value as PaperPreset)}
                  className="h-8 px-2.5 rounded-lg border border-border bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="thermal-50x38">Thermal Roll (50mm × 38mm)</option>
                  <option value="thermal-38x25">Thermal Roll (38mm × 25mm)</option>
                  <option value="a4-24">A4 Sheet — 24 Labels (3×8)</option>
                  <option value="a4-40">A4 Sheet — 40 Labels (4×10)</option>
                  <option value="a4-65">A4 Sheet — 65 Labels (5×13)</option>
                </select>
              </div>
            </div>

            {/* Sticker Graphic Container */}
            <div className="flex justify-center p-4 sm:p-6 bg-muted/40 rounded-xl border border-border/60">
              <div
                className="bg-white text-slate-900 border-2 border-dashed border-slate-300 rounded-xl p-3.5 shadow-md flex flex-col items-center justify-center text-center transition-all"
                style={{
                  width: paperPreset === "thermal-38x25" ? "220px" : "270px",
                  minHeight: paperPreset === "thermal-38x25" ? "130px" : "160px",
                }}
              >
                {showShopName && (
                  <div className="text-[9px] font-black tracking-widest text-slate-900 uppercase mb-0.5 truncate max-w-full">
                    {storeDisplayName}
                  </div>
                )}
                {showProductName && (
                  <div className="text-[11px] font-bold text-slate-800 line-clamp-1 max-w-full mb-1">
                    {previewProduct.name}
                  </div>
                )}
                <div className="my-1 flex justify-center w-full overflow-hidden">
                  <Barcode
                    value={getBarcodeValue(previewProduct)}
                    format={barcodeFormat}
                    width={barcodeWidth}
                    height={barcodeHeight}
                    fontSize={fontSize}
                    margin={0}
                    displayValue={showSkuText}
                  />
                </div>
                {showPrice && (
                  <div className="text-xs sm:text-sm font-black text-slate-950 mt-0.5">
                    MRP: ₹{previewProduct.price.toFixed(2)}
                  </div>
                )}
              </div>
            </div>

            {/* Styling Controls Grid */}
            <div className="space-y-3 pt-1">
              {/* Toggles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setShowShopName(!showShopName)}
                  className={cn(
                    "p-2 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all",
                    showShopName ? "bg-primary/10 border-primary/50 text-foreground" : "bg-background border-border text-muted-foreground"
                  )}
                >
                  <span>Store Name</span>
                  <span className={cn("text-[10px] font-bold", showShopName ? "text-primary" : "text-muted-foreground")}>
                    {showShopName ? "ON" : "OFF"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowProductName(!showProductName)}
                  className={cn(
                    "p-2 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all",
                    showProductName ? "bg-primary/10 border-primary/50 text-foreground" : "bg-background border-border text-muted-foreground"
                  )}
                >
                  <span>Product Name</span>
                  <span className={cn("text-[10px] font-bold", showProductName ? "text-primary" : "text-muted-foreground")}>
                    {showProductName ? "ON" : "OFF"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrice(!showPrice)}
                  className={cn(
                    "p-2 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all",
                    showPrice ? "bg-primary/10 border-primary/50 text-foreground" : "bg-background border-border text-muted-foreground"
                  )}
                >
                  <span>Price / MRP</span>
                  <span className={cn("text-[10px] font-bold", showPrice ? "text-primary" : "text-muted-foreground")}>
                    {showPrice ? "ON" : "OFF"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSkuText(!showSkuText)}
                  className={cn(
                    "p-2 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all",
                    showSkuText ? "bg-primary/10 border-primary/50 text-foreground" : "bg-background border-border text-muted-foreground"
                  )}
                >
                  <span>Barcode Text</span>
                  <span className={cn("text-[10px] font-bold", showSkuText ? "text-primary" : "text-muted-foreground")}>
                    {showSkuText ? "ON" : "OFF"}
                  </span>
                </button>
              </div>

              {/* Format & Store Name Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Barcode Symbology Format
                  </label>
                  <select
                    value={barcodeFormat}
                    onChange={(e) => setBarcodeFormat(e.target.value as BarcodeFormat)}
                    className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="CODE128">CODE128 (Standard Alphanumeric)</option>
                    <option value="EAN13">EAN-13 (13 Digit Retail)</option>
                    <option value="CODE39">CODE39 (Industrial)</option>
                    <option value="UPC">UPC-A (12 Digit)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Custom Store Header
                  </label>
                  <input
                    type="text"
                    placeholder={org?.name || "Store name"}
                    value={customShopName}
                    onChange={(e) => setCustomShopName(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Selected Print Queue Card */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col max-h-[300px]">
            <div className="p-3.5 sm:p-4 border-b border-border bg-muted/20 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-foreground text-xs sm:text-sm">
                  Print Queue ({totalLabelCount} Total Stickers)
                </h3>
              </div>
              {selectedLabels.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedLabels([])}
                  className="text-xs text-destructive hover:underline font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear Queue
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
              {selectedLabels.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-xs">
                  Click '+' on any product on the left to add it to the print queue.
                </div>
              ) : (
                selectedLabels.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between p-2.5 sm:p-3 bg-muted/30 rounded-xl border border-border/60 text-xs"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="font-bold text-foreground truncate">{l.name}</p>
                      <p className="text-muted-foreground font-mono text-[11px] mt-0.5">
                        Code: {getBarcodeValue(l)} · ₹{l.price.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(l.id, -1)}
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted font-bold text-xs"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={l.quantity}
                          onChange={(e) => setExactQuantity(l.id, parseInt(e.target.value) || 0)}
                          className="w-10 h-6 text-center font-bold text-xs bg-transparent focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateQuantity(l.id, 1)}
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted font-bold text-xs text-primary"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedLabels(selectedLabels.filter((item) => item.id !== l.id))}
                        className="w-7 h-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
                        title="Remove from queue"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Print Area rendered into DOM for print popup extraction */}
      <div id="print-area" className="hidden">
        {selectedLabels.map((l) =>
          Array.from({ length: l.quantity }).map((_, idx) => (
            <div key={`${l.id}-${idx}`} className="label">
              {showShopName && <div className="shop-name">{storeDisplayName}</div>}
              {showProductName && <div className="product-name">{l.name}</div>}
              <div className="barcode-svg">
                <Barcode
                  value={getBarcodeValue(l)}
                  format={barcodeFormat}
                  width={barcodeWidth}
                  height={barcodeHeight}
                  fontSize={fontSize}
                  margin={0}
                  displayValue={showSkuText}
                />
              </div>
              {showPrice && <div className="price">MRP: ₹{l.price.toFixed(2)}</div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

