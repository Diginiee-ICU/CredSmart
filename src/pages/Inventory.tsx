import { useState, useEffect, useMemo } from "react";
import { usePagination } from "@/hooks/usePagination";
import { PaginationBar } from "@/components/ui/PaginationBar";
import {
  Search,
  Filter,
  Package,
  AlertTriangle,
  ArrowUpDown,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Plus,
  Minus,
  X,
  Layers,
  Calendar,
  IndianRupee,
  Boxes,
  CheckCircle2,
  AlertCircle,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  FileSpreadsheet,
  Save,
  Undo2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/hooks/useOrganization";
import { productsApi } from "@/services/productsApi";
import { toast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  playSuccessChime,
  playScanBeep,
  triggerHapticSuccess,
  triggerHapticScan,
} from "@/utils/soundAndHaptics";

interface BatchData {
  id: string;
  batch_number: string;
  cost_price: number;
  mrp: number;
  stock: number;
  expiry_date: string | null;
  product_id: string;
}

interface ProductData {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  barcode: string | null;
  unit?: string | null;
  batches: BatchData[];
  totalStock: number;
  totalValue: number;
  avgMrp: number;
}

const LOW_STOCK_THRESHOLD = 20;

export default function Inventory() {
  const { orgId, loading: orgLoading } = useOrganization();
  const { log: auditLog } = useAuditLog();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline Excel Edit Mode State
  const [isExcelEditMode, setIsExcelEditMode] = useState(false);
  const [dirtyRows, setDirtyRows] = useState<
    Record<string, { stock: number; mrp: number; cost_price: number; batchId: string; productName: string }>
  >({});
  const [savingExcel, setSavingExcel] = useState(false);

  // Batch Viewer Modal
  const [viewBatchesProduct, setViewBatchesProduct] = useState<ProductData | null>(null);

  // Stock adjustment modal
  const [adjustProduct, setAdjustProduct] = useState<ProductData | null>(null);
  const [adjustBatchId, setAdjustBatchId] = useState<string>("");
  const [adjustType, setAdjustType] = useState<"add" | "reduce">("add");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const fetchProducts = async (isMounted = true) => {
    if (!orgId) return;
    setLoading(true);
    try {
      const { data: prods, error: prodsErr } = await productsApi.getProducts(orgId);

      if (prodsErr) {
        toast({ title: "Error loading inventory", description: prodsErr.message, variant: "destructive" });
        if (isMounted) setProducts([]);
        return;
      }

      if (!prods || prods.length === 0) {
        if (isMounted) setProducts([]);
        return;
      }

      const prodIds = prods.map((p) => p.id);
      const { data: batches, error: batchesErr } = await productsApi.getBatches(prodIds, orgId);

      if (batchesErr) {
        console.warn("Failed to load batches:", batchesErr.message);
      }

      const batchMap: Record<string, BatchData[]> = {};
      (batches || []).forEach((b) => {
        if (!batchMap[b.product_id]) batchMap[b.product_id] = [];
        batchMap[b.product_id].push({
          id: b.id,
          batch_number: b.batch_number || "BATCH-01",
          cost_price: Number(b.cost_price) || 0,
          mrp: Number(b.mrp) || 0,
          stock: Number(b.stock) || 0,
          expiry_date: b.expiry_date,
          product_id: b.product_id,
        });
      });

      const enriched: ProductData[] = prods.map((p) => {
        const pBatches = batchMap[p.id] || [];
        const totalStock = pBatches.reduce((s, b) => s + (Number(b.stock) || 0), 0);
        const totalValue = pBatches.reduce((s, b) => s + (Number(b.cost_price) || 0) * (Number(b.stock) || 0), 0);
        const avgMrp = pBatches.length > 0 ? pBatches.reduce((s, b) => s + (Number(b.mrp) || 0), 0) / pBatches.length : 0;
        const tagsObj = typeof p.tags === "object" && p.tags !== null ? (p.tags as Record<string, any>) : {};
        const unit = typeof tagsObj.unit === "string" ? tagsObj.unit : "PCS";
        return { ...p, unit, batches: pBatches, totalStock, totalValue, avgMrp };
      });

      if (isMounted) setProducts(enriched);
    } catch (err: unknown) {
      console.error("fetchProducts unexpected error:", err);
      toast({ title: "Error", description: err?.message || "Failed to load inventory", variant: "destructive" });
      if (isMounted) setProducts([]);
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (orgLoading) return;

    if (!orgId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    fetchProducts(isMounted);
    return () => { isMounted = false; };
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, orgLoading]);

  const handleStockAdjust = async () => {
    if (!adjustProduct || !adjustQty) return;
    setAdjusting(true);

    const qty = parseInt(adjustQty);
    if (isNaN(qty) || qty <= 0) {
      toast({ title: "Invalid quantity", description: "Please enter a positive whole number", variant: "destructive" });
      setAdjusting(false);
      return;
    }

    try {
      // If product has no batches yet, create initial batch with added stock
      if (adjustProduct.batches.length === 0) {
        if (adjustType === "reduce") {
          toast({ title: "No Stock Available", description: "Cannot reduce stock for a product with 0 inventory.", variant: "destructive" });
          setAdjusting(false);
          return;
        }

        const { data: newBatch, error: insErr } = await productsApi.createBatch(
          {
            product_id: adjustProduct.id,
            batch_number: "BATCH-01",
            cost_price: 0,
            mrp: 0,
            stock: qty,
          },
          orgId
        );

        if (insErr) throw new Error(insErr.message);

        toast({
          title: "Stock Initialized",
          description: `Created initial batch (BATCH-01) with ${qty} units.`,
        });

        try {
          auditLog?.({
            action: "stock_added",
            entity_type: "stock_adjustment",
            entity_id: newBatch?.id || adjustProduct.id,
            details: {
              product: adjustProduct.name,
              batch: "BATCH-01",
              quantity: qty,
              previous_stock: 0,
              new_stock: qty,
            },
          });
        } catch (aErr) {
          console.warn("Audit log failed:", aErr);
        }

        setAdjustProduct(null);
        setAdjustBatchId("");
        setAdjustQty("");
        fetchProducts();
        return;
      }

      const batch = adjustProduct.batches.find((b) => b.id === adjustBatchId) || adjustProduct.batches[0];
      if (!batch) {
        toast({ title: "Batch not found", variant: "destructive" });
        setAdjusting(false);
        return;
      }

      const currentStock = Number(batch.stock) || 0;
      if (adjustType === "reduce" && currentStock <= 0) {
        toast({ title: "Out of stock", description: "This batch currently has 0 units.", variant: "destructive" });
        setAdjusting(false);
        return;
      }

      const newStock = adjustType === "add" ? currentStock + qty : Math.max(0, currentStock - qty);

      const { error } = await productsApi.updateBatch(
        batch.id,
        { stock: newStock },
        orgId
      );

      if (error) throw new Error(error.message);

      toast({
        title: "Stock Adjusted",
        description: `Updated ${adjustProduct.name} stock to ${newStock} units.`,
      });

      try {
        auditLog?.({
          action: "stock_adjusted",
          entity_type: "stock_adjustment",
          entity_id: batch.id,
          details: {
            product: adjustProduct.name,
            batch: batch.batch_number,
            previous_stock: currentStock,
            new_stock: newStock,
            adjustment: adjustType === "add" ? `+${qty}` : `-${qty}`,
          },
        });
      } catch (aErr) {
        console.warn("Audit log failed:", aErr);
      }

      setAdjustProduct(null);
      setAdjustBatchId("");
      setAdjustQty("");
      fetchProducts();
    } catch (err: unknown) {
      toast({ title: "Error adjusting stock", description: err.message, variant: "destructive" });
    } finally {
      setAdjusting(false);
    }
  };

  // ─── Inline Excel Edit Mode Handlers ─────────────────────────────────
  const handleCellChange = (
    productId: string,
    batchId: string,
    field: "stock" | "mrp" | "cost_price",
    val: number,
    currentValues: { stock: number; mrp: number; cost_price: number },
    productName: string
  ) => {
    setDirtyRows((prev) => {
      const existing = prev[productId] || {
        stock: currentValues.stock,
        mrp: currentValues.mrp,
        cost_price: currentValues.cost_price,
        batchId: batchId || "",
        productName,
      };

      return {
        ...prev,
        [productId]: {
          ...existing,
          [field]: Math.max(0, val),
        },
      };
    });
  };

  const handleSaveAllExcelChanges = async () => {
    const entries = Object.entries(dirtyRows);
    if (entries.length === 0) return;

    setSavingExcel(true);
    let successCount = 0;
    try {
      for (const [prodId, data] of entries) {
        if (data.batchId) {
          const { error } = await productsApi.updateBatch(
            data.batchId,
            {
              stock: data.stock,
              mrp: data.mrp,
              cost_price: data.cost_price,
            },
            orgId
          );
          if (!error) successCount++;
        } else {
          // If no batch exists, create one
          const { error } = await productsApi.createBatch(
            {
              product_id: prodId,
              batch_number: "BATCH-01",
              stock: data.stock,
              mrp: data.mrp,
              cost_price: data.cost_price,
            },
            orgId
          );
          if (!error) successCount++;
        }
      }

      playSuccessChime();
      triggerHapticSuccess();
      toast({
        title: "Inventory Bulk Updated!",
        description: `Successfully updated ${successCount} product(s) in bulk via Excel mode.`,
      });

      setDirtyRows({});
      fetchProducts();
    } catch (err: unknown) {
      toast({
        title: "Error saving bulk changes",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingExcel(false);
    }
  };

  const handleDiscardExcelChanges = () => {
    setDirtyRows({});
    toast({
      title: "Changes Discarded",
      description: "Reverted all inline inventory edits.",
    });
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [products]);

  const filtered = products.filter((item) => {
    const matchSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.barcode && item.barcode.includes(search)) ||
      (item.brand && item.brand.toLowerCase().includes(search.toLowerCase()));

    const matchFilter =
      filter === "all" ||
      (filter === "low" && item.totalStock > 0 && item.totalStock <= LOW_STOCK_THRESHOLD) ||
      (filter === "out" && item.totalStock === 0);

    const matchCategory =
      selectedCategory === "all" || (item.category && item.category.trim() === selectedCategory);

    return matchSearch && matchFilter && matchCategory;
  });

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    paginatedItems,
    totalPages,
    totalItems: filteredTotalItems,
    startIndex,
    endIndex,
    hasNext,
    hasPrev,
  } = usePagination(filtered, 25);

  const totalItems = products.length;
  const totalStockUnits = products.reduce((s, i) => s + i.totalStock, 0);
  const totalInventoryValue = products.reduce((s, i) => s + i.totalValue, 0);
  const lowStockCount = products.filter((i) => i.totalStock > 0 && i.totalStock <= LOW_STOCK_THRESHOLD).length;
  const outOfStockCount = products.filter((i) => i.totalStock === 0).length;

  if (orgLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 py-6 sm:px-8 sm:py-8 space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white font-sans flex items-center gap-2.5">
              <Boxes className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Inventory &amp; Stock Hub
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE VALUATION</span>
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time stock valuation, batch management &amp; low-stock alerts
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant="outline" className="px-3 py-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-slate-200 dark:border-slate-800 text-xs font-semibold gap-1.5 shadow-xs rounded-xl">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {totalItems} Products Tracked
          </Badge>
        </div>
      </div>

      {/* Metrics Cards - 3D Frosted Glass */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products */}
        <div className="glass-card-3d p-5 relative overflow-hidden group select-none">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 via-blue-500 to-indigo-600 rounded-l-2xl shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider font-mono">Total Products</span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">{totalItems}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
              <span className="font-bold text-foreground">{categories.length}</span> Active Categories
            </p>
          </div>
        </div>

        {/* Stock Units */}
        <div className="glass-card-3d p-5 relative overflow-hidden group select-none">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 via-teal-500 to-green-600 rounded-l-2xl shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-mono">Stock Units</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
              {totalStockUnits.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Total Quantity on Hand
            </p>
          </div>
        </div>

        {/* Inventory Value */}
        <div className="glass-card-3d p-5 relative overflow-hidden group select-none">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 via-purple-500 to-violet-600 rounded-l-2xl shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-mono">Inventory Value</span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
              ₹{totalInventoryValue.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Cost Price Valuation</p>
          </div>
        </div>

        {/* Low / Out of Stock */}
        <div className="glass-card-3d p-5 relative overflow-hidden group select-none">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 via-orange-500 to-rose-600 rounded-l-2xl shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider font-mono">Stock Alerts</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">{lowStockCount}</p>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Low</span>
              {outOfStockCount > 0 && (
                <>
                  <span className="text-slate-400">·</span>
                  <span className="text-sm font-bold text-rose-600">{outOfStockCount} Out</span>
                </>
              )}
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-semibold">
              Needs replenishment (≤ {LOW_STOCK_THRESHOLD})
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls - Frosted Glass Container */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name, brand, or barcode..."
              className="w-full h-10 pl-10 pr-10 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all text-xs"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status filter pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shrink-0 overflow-x-auto">
            {([
              { id: "all", label: "All Items", count: products.length },
              { id: "low", label: "Low Stock", count: lowStockCount },
              { id: "out", label: "Out of Stock", count: outOfStockCount },
            ] as const).map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer active:scale-95",
                  filter === f.id
                    ? "bg-blue-600 dark:bg-blue-600 text-white shadow-md shadow-blue-500/25 border border-blue-500"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent"
                )}
              >
                <span>{f.label}</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
                    filter === f.id ? "bg-white/25 text-white" : "bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  )}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          {/* Excel Edit Mode Toggle (Desktop) */}
          <div className="hidden md:flex items-center gap-1 p-1 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsExcelEditMode((v) => !v);
                playScanBeep();
                triggerHapticScan();
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none",
                isExcelEditMode
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                  : "text-slate-600 dark:text-slate-400 hover:text-foreground hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
              )}
              title="Toggle Excel-style direct editing"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel Edit</span>
              <span
                className={cn(
                  "text-[9px] px-1.5 py-0.2 rounded-full font-mono uppercase font-bold",
                  isExcelEditMode
                    ? "bg-white/25 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isExcelEditMode ? "ON" : "OFF"}
              </span>
            </button>
          </div>
        </div>

        {/* Category filter pills */}
        {categories.length > 0 && (
          <div className="pt-2 border-t border-border/60 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Categories:
            </span>
            <button
              onClick={() => setSelectedCategory("all")}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-medium transition-colors shrink-0",
                selectedCategory === "all"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground"
              )}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-medium transition-colors shrink-0",
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-muted/50 hover:bg-muted text-muted-foreground"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Inventory Table Container */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden relative">
        {/* Mobile View: Cards */}
        <div className="block md:hidden divide-y divide-border pb-24">
          {paginatedItems.map((item) => {
            const stockPercent = Math.min(100, Math.max(0, (item.totalStock / (LOW_STOCK_THRESHOLD * 2.5)) * 100));
            const isOutOfStock = item.totalStock === 0;
            const isLowStock = item.totalStock > 0 && item.totalStock <= LOW_STOCK_THRESHOLD;

            return (
              <div key={item.id} className="p-4 space-y-3 hover:bg-muted/20 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground text-sm truncate">{item.name}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        {item.brand && <span className="text-xs text-muted-foreground">{item.brand}</span>}
                        {item.category && (
                          <Badge variant="secondary" className="text-[10px] px-2 py-0">
                            {item.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold",
                        isOutOfStock
                          ? "bg-destructive/10 text-destructive"
                          : isLowStock
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {isOutOfStock ? "Out of Stock" : isLowStock ? "Low Stock" : "In Stock"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Stock Level</span>
                    <span className="font-semibold font-mono text-foreground">
                      {item.totalStock} {item.unit || "Units"}
                    </span>
                  </div>
                  <Progress
                    value={stockPercent}
                    className={cn(
                      "h-1.5",
                      isOutOfStock ? "[&>div]:bg-destructive" : isLowStock ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"
                    )}
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewBatchesProduct(item)}
                      className="text-primary hover:underline font-medium text-xs flex items-center gap-1"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      {item.batches.length} {item.batches.length === 1 ? "Batch" : "Batches"}
                    </button>
                    <span className="text-muted-foreground">•</span>
                    <button
                      onClick={() => {
                        setAdjustProduct(item);
                        setAdjustBatchId(item.batches[0]?.id || "");
                      }}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <ArrowUpDown className="w-3 h-3" />
                      Adjust
                    </button>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-muted-foreground mr-1">Val:</span>
                    <span className="font-bold text-foreground">₹{item.totalValue.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Pagination */}
        <div className="md:hidden">
          <PaginationBar
            page={page}
            totalPages={totalPages}
            totalItems={filteredTotalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            hasNext={hasNext}
            hasPrev={hasPrev}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3.5">Product & Details</th>
                <th className="text-left px-5 py-3.5">Category</th>
                <th className="text-left px-5 py-3.5 min-w-[180px]">
                  {isExcelEditMode ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                      <FileSpreadsheet className="w-3.5 h-3.5" /> Stock (Units)
                    </span>
                  ) : (
                    "Stock Level"
                  )}
                </th>
                <th className="text-left px-5 py-3.5">
                  {isExcelEditMode ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">MRP (₹)</span>
                  ) : (
                    "Avg MRP"
                  )}
                </th>
                {isExcelEditMode && (
                  <th className="text-left px-5 py-3.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">Cost Price (₹)</span>
                  </th>
                )}
                <th className="text-left px-5 py-3.5">Batches</th>
                {!isExcelEditMode && <th className="text-left px-5 py-3.5">Inventory Value</th>}
                <th className="text-left px-5 py-3.5">Status</th>
                <th className="text-right px-5 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedItems.map((item) => {
                const stockPercent = Math.min(100, Math.max(0, (item.totalStock / (LOW_STOCK_THRESHOLD * 2.5)) * 100));
                const isOutOfStock = item.totalStock === 0;
                const isLowStock = item.totalStock > 0 && item.totalStock <= LOW_STOCK_THRESHOLD;
                const primaryBatch = item.batches[0];
                const isRowModified = !!dirtyRows[item.id];

                return (
                  <tr
                    key={item.id}
                    className={cn(
                      "transition-colors group",
                      isRowModified
                        ? "bg-amber-50/50 dark:bg-amber-950/20"
                        : "hover:bg-muted/30"
                    )}
                  >
                    {/* Product Name & Brand */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground">{item.name}</p>
                            {isRowModified && (
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Unsaved changes" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            {item.brand && <span>{item.brand}</span>}
                            {item.barcode && <span className="font-mono text-[11px]">#{item.barcode}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-4">
                      {item.category ? (
                        <Badge variant="secondary" className="font-medium text-xs">
                          {item.category}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>

                    {/* Stock Level (Standard or Excel Edit Input) */}
                    <td className="px-5 py-4">
                      {isExcelEditMode ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={
                              dirtyRows[item.id]?.stock !== undefined
                                ? dirtyRows[item.id].stock
                                : item.totalStock
                            }
                            onChange={(e) => {
                              handleCellChange(
                                item.id,
                                primaryBatch?.id || "",
                                "stock",
                                Number(e.target.value) || 0,
                                {
                                  stock: item.totalStock,
                                  mrp: primaryBatch?.mrp || item.avgMrp,
                                  cost_price: primaryBatch?.cost_price || 0,
                                },
                                item.name
                              );
                            }}
                            className={cn(
                              "w-24 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all focus:outline-hidden",
                              dirtyRows[item.id]?.stock !== undefined
                                ? "bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-950 dark:text-amber-200 ring-2 ring-amber-400/40"
                                : "bg-slate-100/80 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-foreground"
                            )}
                          />
                          <span className="text-[11px] text-muted-foreground">units</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-w-[180px]">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-foreground text-sm">
                              {item.totalStock}{" "}
                              <span className="text-xs font-normal text-muted-foreground">units</span>
                            </span>
                            <span className="text-[11px] text-muted-foreground">Min: {LOW_STOCK_THRESHOLD}</span>
                          </div>
                          <Progress
                            value={stockPercent}
                            className={cn(
                              "h-1.5 rounded-full",
                              isOutOfStock ? "bg-destructive/20 [&>div]:bg-destructive" :
                              isLowStock ? "bg-amber-500/20 [&>div]:bg-amber-500" :
                              "bg-emerald-500/20 [&>div]:bg-emerald-500"
                            )}
                          />
                        </div>
                      )}
                    </td>

                    {/* Avg MRP (Standard or Excel Edit Input) */}
                    <td className="px-5 py-4">
                      {isExcelEditMode ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-muted-foreground">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={
                              dirtyRows[item.id]?.mrp !== undefined
                                ? dirtyRows[item.id].mrp
                                : primaryBatch?.mrp || item.avgMrp || 0
                            }
                            onChange={(e) => {
                              handleCellChange(
                                item.id,
                                primaryBatch?.id || "",
                                "mrp",
                                Number(e.target.value) || 0,
                                {
                                  stock: item.totalStock,
                                  mrp: primaryBatch?.mrp || item.avgMrp,
                                  cost_price: primaryBatch?.cost_price || 0,
                                },
                                item.name
                              );
                            }}
                            className={cn(
                              "w-24 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all focus:outline-hidden",
                              dirtyRows[item.id]?.mrp !== undefined
                                ? "bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-950 dark:text-amber-200 ring-2 ring-amber-400/40"
                                : "bg-slate-100/80 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-foreground"
                            )}
                          />
                        </div>
                      ) : (
                        <span className="font-medium text-foreground">
                          ₹{item.avgMrp > 0 ? item.avgMrp.toFixed(2) : "0.00"}
                        </span>
                      )}
                    </td>

                    {/* Cost Price (Excel Edit Mode only) */}
                    {isExcelEditMode && (
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-muted-foreground">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={
                              dirtyRows[item.id]?.cost_price !== undefined
                                ? dirtyRows[item.id].cost_price
                                : primaryBatch?.cost_price || 0
                            }
                            onChange={(e) => {
                              handleCellChange(
                                item.id,
                                primaryBatch?.id || "",
                                "cost_price",
                                Number(e.target.value) || 0,
                                {
                                  stock: item.totalStock,
                                  mrp: primaryBatch?.mrp || item.avgMrp,
                                  cost_price: primaryBatch?.cost_price || 0,
                                },
                                item.name
                              );
                            }}
                            className={cn(
                              "w-24 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all focus:outline-hidden",
                              dirtyRows[item.id]?.cost_price !== undefined
                                ? "bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-950 dark:text-amber-200 ring-2 ring-amber-400/40"
                                : "bg-slate-100/80 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-foreground"
                            )}
                          />
                        </div>
                      </td>
                    )}

                    {/* Batches Viewer Button */}
                    <td className="px-5 py-4">
                      <button
                        onClick={() => setViewBatchesProduct(item)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 text-foreground transition-colors border border-border/50"
                        title="View batch details"
                      >
                        <Layers className="w-3.5 h-3.5 text-primary" />
                        <span>{item.batches.length} {item.batches.length === 1 ? "Batch" : "Batches"}</span>
                      </button>
                    </td>

                    {/* Total Value */}
                    {!isExcelEditMode && (
                      <td className="px-5 py-4 font-bold text-foreground">
                        ₹{item.totalValue.toLocaleString("en-IN")}
                      </td>
                    )}

                    {/* Status Badge */}
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                          isOutOfStock
                            ? "bg-destructive/10 text-destructive border border-destructive/20"
                            : isLowStock
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        )}
                      >
                        {isOutOfStock ? (
                          <>
                            <AlertCircle className="w-3.5 h-3.5" /> Out of Stock
                          </>
                        ) : isLowStock ? (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5" /> Low Stock
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> In Stock
                          </>
                        )}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setAdjustProduct(item);
                            setAdjustBatchId(item.batches[0]?.id || "");
                          }}
                          className="h-8 px-3 text-xs font-semibold gap-1.5 shadow-xs hover:border-primary/50"
                        >
                          <ArrowUpDown className="w-3.5 h-3.5 text-primary" />
                          Adjust Stock
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Desktop Pagination */}
        <div className="hidden md:block">
          <PaginationBar
            page={page}
            totalPages={totalPages}
            totalItems={filteredTotalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            hasNext={hasNext}
            hasPrev={hasPrev}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
        </div>

        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="py-16 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
              <Package className="w-7 h-7 opacity-50" />
            </div>
            <h3 className="text-base font-bold text-foreground">No Products Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              {products.length === 0
                ? "Your inventory is currently empty. Add products from the Items page to start tracking stock."
                : "No products matched your search or category filter. Try clearing filters."}
            </p>
            {search && (
              <Button variant="outline" size="sm" onClick={() => setSearch("")} className="mt-4 text-xs">
                Clear Search
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Floating Bottom Sticky Bar for Excel Edit Mode */}
      {isExcelEditMode && Object.keys(dirtyRows).length > 0 && (
        <aside className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[240] flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-slate-900/95 dark:bg-slate-950/95 text-white shadow-2xl border border-amber-400/50 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 select-none">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-xs font-bold font-mono">
              {Object.keys(dirtyRows).length} Product(s) Modified
            </span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <button
            type="button"
            onClick={handleDiscardExcelChanges}
            className="px-3 py-1 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSaveAllExcelChanges}
            disabled={savingExcel}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingExcel ? "Saving to Cloud..." : `Save All (${Object.keys(dirtyRows).length})`}</span>
          </button>
        </aside>
      )}

      {/* Batch Viewer Modal */}
      {viewBatchesProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground text-base">Batch Breakdown</h2>
                  <p className="text-xs text-muted-foreground">{viewBatchesProduct.name}</p>
                </div>
              </div>
              <button
                onClick={() => setViewBatchesProduct(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-3 gap-3 p-3.5 bg-muted/40 rounded-xl border border-border/60 text-xs">
                <div>
                  <span className="text-muted-foreground">Total Stock:</span>
                  <p className="font-bold text-foreground text-sm mt-0.5">{viewBatchesProduct.totalStock} units</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Valuation:</span>
                  <p className="font-bold text-foreground text-sm mt-0.5">₹{viewBatchesProduct.totalValue.toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Batches:</span>
                  <p className="font-bold text-foreground text-sm mt-0.5">{viewBatchesProduct.batches.length}</p>
                </div>
              </div>

              {viewBatchesProduct.batches.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No active batches recorded for this product. Use "Adjust Stock" to add opening stock.
                </div>
              ) : (
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/50 text-muted-foreground font-semibold uppercase tracking-wider">
                        <th className="text-left px-4 py-2.5">Batch Number</th>
                        <th className="text-left px-4 py-2.5">Stock</th>
                        <th className="text-left px-4 py-2.5">Cost Price</th>
                        <th className="text-left px-4 py-2.5">MRP</th>
                        <th className="text-left px-4 py-2.5">Expiry Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {viewBatchesProduct.batches.map((b) => {
                        const isExpired = b.expiry_date && !isNaN(new Date(b.expiry_date).getTime()) && new Date(b.expiry_date) < new Date();
                        return (
                          <tr key={b.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3 font-semibold text-foreground font-mono">
                              {b.batch_number || "DEFAULT"}
                            </td>
                            <td className="px-4 py-3 font-bold text-foreground">
                              {b.stock} units
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              ₹{Number(b.cost_price || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 font-semibold text-foreground">
                              ₹{Number(b.mrp || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {b.expiry_date && !isNaN(new Date(b.expiry_date).getTime()) ? (
                                <span className={cn("inline-flex items-center gap-1 font-medium", isExpired && "text-destructive font-semibold")}>
                                  <Calendar className="w-3 h-3" />
                                  {new Date(b.expiry_date).toLocaleDateString("en-IN")}
                                  {isExpired && (
                                    <Badge variant="destructive" className="text-[9px] px-1 py-0 ml-1">
                                      Expired
                                    </Badge>
                                  )}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-border bg-muted/20 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setViewBatchesProduct(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustProduct && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pt-6 pb-6 overflow-y-auto animate-fade-in">
          <div className="bg-card border border-border rounded-2xl shadow-xl max-w-[440px] w-full overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <ArrowUpDown className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground text-sm sm:text-base">Adjust Stock Level</h2>
                  <p className="text-xs text-muted-foreground truncate max-w-[240px]">{adjustProduct.name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setAdjustProduct(null);
                  setAdjustQty("");
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* If no batches exist */}
              {adjustProduct.batches.length === 0 ? (
                <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground mb-0.5">No existing batches</p>
                  Confirming addition will create the initial batch <span className="font-mono font-bold text-primary">BATCH-01</span> for this product.
                </div>
              ) : (
                <>
                  {/* Batch selector */}
                  {adjustProduct.batches.length > 1 && (
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Select Target Batch
                      </label>
                      <select
                        value={adjustBatchId || adjustProduct.batches[0]?.id}
                        onChange={(e) => setAdjustBatchId(e.target.value)}
                        className="mt-1.5 w-full h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        {adjustProduct.batches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.batch_number || "Default"} — Stock: {b.stock} — MRP: ₹{b.mrp}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Current stock display */}
                  <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">Current Stock in Batch</span>
                    <span className="text-base font-bold text-foreground">
                      {adjustProduct.batches.find((b) => b.id === (adjustBatchId || adjustProduct.batches[0]?.id))?.stock ?? 0} units
                    </span>
                  </div>
                </>
              )}

              {/* Add/Reduce toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted/50 rounded-xl border border-border/60">
                <button
                  type="button"
                  onClick={() => setAdjustType("add")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all",
                    adjustType === "add"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Stock
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType("reduce")}
                  disabled={adjustProduct.batches.length === 0}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all",
                    adjustType === "reduce"
                      ? "bg-destructive text-destructive-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                    adjustProduct.batches.length === 0 && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Minus className="w-3.5 h-3.5" />
                  Reduce Stock
                </button>
              </div>

              {/* Quantity input */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Adjustment Quantity *
                </label>
                <div className="relative mt-1.5">
                  <input
                    type="number"
                    min="1"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    placeholder="Enter units to adjust"
                    className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    autoFocus
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setAdjustProduct(null);
                    setAdjustQty("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleStockAdjust}
                  disabled={adjusting || !adjustQty}
                  className="flex-1 font-semibold gap-1.5"
                >
                  {adjusting && (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  )}
                  {adjustType === "add" ? "Confirm Addition" : "Confirm Reduction"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
