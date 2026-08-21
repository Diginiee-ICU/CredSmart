import { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

  // Batch Viewer Modal
  const [viewBatchesProduct, setViewBatchesProduct] = useState<ProductData | null>(null);

  // Stock adjustment modal
  const [adjustProduct, setAdjustProduct] = useState<ProductData | null>(null);
  const [adjustBatchId, setAdjustBatchId] = useState<string>("");
  const [adjustType, setAdjustType] = useState<"add" | "reduce">("add");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    if (orgLoading) return;

    if (!orgId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    fetchProducts();
  }, [orgId, orgLoading]);

  const fetchProducts = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const { data: prods, error: prodsErr } = await supabase
        .from("products")
        .select("id, name, brand, category, barcode")
        .eq("organization_id", orgId)
        .order("name");

      if (prodsErr) {
        toast({ title: "Error loading inventory", description: prodsErr.message, variant: "destructive" });
        setProducts([]);
        return;
      }

      if (!prods || prods.length === 0) {
        setProducts([]);
        return;
      }

      const prodIds = prods.map((p) => p.id);
      const { data: batches, error: batchesErr } = await supabase
        .from("product_batches")
        .select("id, product_id, batch_number, cost_price, mrp, stock, expiry_date")
        .in("product_id", prodIds.length > 0 ? prodIds : ["__none__"]);

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
        return { ...p, batches: pBatches, totalStock, totalValue, avgMrp };
      });

      setProducts(enriched);
    } catch (err: any) {
      console.error("fetchProducts unexpected error:", err);
      toast({ title: "Error", description: err?.message || "Failed to load inventory", variant: "destructive" });
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

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

        const { data: newBatch, error: insErr } = await supabase
          .from("product_batches")
          .insert({
            product_id: adjustProduct.id,
            batch_number: "BATCH-01",
            cost_price: 0,
            mrp: 0,
            stock: qty,
          })
          .select("id")
          .single();

        if (insErr) throw insErr;

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

      const { error } = await supabase
        .from("product_batches")
        .update({ stock: newStock })
        .eq("id", batch.id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({
          title: "Stock Updated",
          description: `${adjustType === "add" ? "Added" : "Reduced"} ${qty} units. New stock: ${newStock}`,
        });
        try {
          auditLog?.({
            action: adjustType === "add" ? "stock_added" : "stock_reduced",
            entity_type: "stock_adjustment",
            entity_id: batch.id,
            details: {
              product: adjustProduct.name,
              batch: batch.batch_number,
              quantity: qty,
              previous_stock: currentStock,
              new_stock: newStock,
            },
          });
        } catch (aErr) {
          console.warn("Audit log failed:", aErr);
        }
        setAdjustProduct(null);
        setAdjustBatchId("");
        setAdjustQty("");
        fetchProducts();
      }
    } catch (err: any) {
      console.error("handleStockAdjust failed:", err);
      toast({ title: "Error", description: err?.message || "Failed to update stock", variant: "destructive" });
    } finally {
      setAdjusting(false);
    }
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
    <div className="w-full max-w-[1400px] mx-auto px-4 py-6 sm:px-8 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Boxes className="w-7 h-7 text-primary" />
            Inventory & Stock
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time stock valuation, batch management & low-stock alerts
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant="outline" className="px-3 py-1.5 bg-background border-border text-xs font-semibold gap-1.5 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {totalItems} Products Tracked
          </Badge>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products */}
        <div className="relative overflow-hidden p-5 rounded-2xl border border-border/80 bg-gradient-to-br from-card to-card/60 shadow-sm hover:shadow-md transition-all group">
          <div className="absolute right-0 top-0 -mt-2 -mr-2 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Products</span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{totalItems}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="font-medium text-foreground">{categories.length}</span> Active Categories
            </p>
          </div>
        </div>

        {/* Stock Units */}
        <div className="relative overflow-hidden p-5 rounded-2xl border border-border/80 bg-gradient-to-br from-card to-card/60 shadow-sm hover:shadow-md transition-all group">
          <div className="absolute right-0 top-0 -mt-2 -mr-2 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stock Units</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              {totalStockUnits.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Total Quantity on Hand
            </p>
          </div>
        </div>

        {/* Inventory Value */}
        <div className="relative overflow-hidden p-5 rounded-2xl border border-border/80 bg-gradient-to-br from-card to-card/60 shadow-sm hover:shadow-md transition-all group">
          <div className="absolute right-0 top-0 -mt-2 -mr-2 w-20 h-20 bg-indigo-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Inventory Value</span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              ₹{totalInventoryValue.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Cost Price Valuation</p>
          </div>
        </div>

        {/* Low / Out of Stock */}
        <div className="relative overflow-hidden p-5 rounded-2xl border border-border/80 bg-gradient-to-br from-card to-card/60 shadow-sm hover:shadow-md transition-all group">
          <div className="absolute right-0 top-0 -mt-2 -mr-2 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stock Alerts</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{lowStockCount}</p>
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Low</span>
              {outOfStockCount > 0 && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-sm font-bold text-destructive">{outOfStockCount} Out</span>
                </>
              )}
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
              Needs replenishment (≤ {LOW_STOCK_THRESHOLD})
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name, brand, or barcode..."
              className="w-full h-11 pl-10 pr-10 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
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
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/50 shrink-0 overflow-x-auto">
            {([
              { id: "all", label: "All Items", count: products.length },
              { id: "low", label: "Low Stock", count: lowStockCount },
              { id: "out", label: "Out of Stock", count: outOfStockCount },
            ] as const).map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5",
                  filter === f.id
                    ? "bg-background text-foreground shadow-sm border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full",
                    filter === f.id ? "bg-primary/10 text-primary font-bold" : "bg-muted text-muted-foreground"
                  )}
                >
                  {f.count}
                </span>
              </button>
            ))}
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
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Mobile View: Cards */}
        <div className="block md:hidden divide-y divide-border">
          {filtered.map((item) => {
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

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewBatchesProduct(item)}
                      className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Batches ({item.batches.length})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAdjustProduct(item);
                        setAdjustBatchId(item.batches[0]?.id || "");
                      }}
                      className="h-8 px-2.5 text-xs gap-1 font-semibold"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 text-primary" />
                      Adjust
                    </Button>
                  </div>
                </div>

                {/* Stock progress bar & info */}
                <div className="space-y-1.5 bg-muted/40 p-2.5 rounded-xl border border-border/40">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-muted-foreground">Stock Level</span>
                    <span className="font-bold text-foreground">
                      {item.totalStock} units{" "}
                      <span className="text-[11px] font-normal text-muted-foreground">
                        (min: {LOW_STOCK_THRESHOLD})
                      </span>
                    </span>
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

                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "font-semibold text-xs px-2.5 py-0.5 rounded-full inline-flex items-center gap-1",
                        isOutOfStock
                          ? "bg-destructive/10 text-destructive border border-destructive/20"
                          : isLowStock
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      )}
                    >
                      {isOutOfStock ? (
                        <>
                          <AlertCircle className="w-3 h-3" /> Out of Stock
                        </>
                      ) : isLowStock ? (
                        <>
                          <AlertTriangle className="w-3 h-3" /> Low Stock
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> In Stock
                        </>
                      )}
                    </span>
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

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3.5">Product & Details</th>
                <th className="text-left px-5 py-3.5">Category</th>
                <th className="text-left px-5 py-3.5 min-w-[200px]">Stock vs Min Level</th>
                <th className="text-left px-5 py-3.5">Batches</th>
                <th className="text-left px-5 py-3.5">Avg MRP</th>
                <th className="text-left px-5 py-3.5">Inventory Value</th>
                <th className="text-left px-5 py-3.5">Status</th>
                <th className="text-right px-5 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((item) => {
                const stockPercent = Math.min(100, Math.max(0, (item.totalStock / (LOW_STOCK_THRESHOLD * 2.5)) * 100));
                const isOutOfStock = item.totalStock === 0;
                const isLowStock = item.totalStock > 0 && item.totalStock <= LOW_STOCK_THRESHOLD;

                return (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors group">
                    {/* Product Name & Brand */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{item.name}</p>
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

                    {/* Stock vs Min Level Progress */}
                    <td className="px-5 py-4">
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
                    </td>

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

                    {/* Avg MRP */}
                    <td className="px-5 py-4 font-medium text-foreground">
                      ₹{item.avgMrp > 0 ? item.avgMrp.toFixed(2) : "0.00"}
                    </td>

                    {/* Total Value */}
                    <td className="px-5 py-4 font-bold text-foreground">
                      ₹{item.totalValue.toLocaleString("en-IN")}
                    </td>

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
                          className="h-8 px-3 text-xs font-semibold gap-1.5 shadow-sm hover:border-primary/50"
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
