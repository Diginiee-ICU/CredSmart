import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Package,
  Sparkles,
  QrCode,
  Search,
  Plus,
  ArrowUpDown,
  MoreVertical,
  Edit,
  Trash2,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Printer,
  CheckSquare,
  Square,
  CheckCircle2,
  X,
  Library,
  Layers,
  ChevronDown,
  Warehouse,
  Barcode,
  ArrowRightLeft,
  Percent,
  RotateCcw,
} from "lucide-react";
import { InventoryItem, ItemUnit, GSTRate, ItemOffer } from "@/types/inventory";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { useProducts } from "@/context/ProductsContext";
import { CreateItemModal } from "@/components/items/CreateItemModal";
import { CreateOfferModal } from "@/components/items/CreateOfferModal";
import { ProductLibraryModal } from "@/components/items/ProductLibraryModal";
import { ItemsExcelUploadModal } from "@/components/items/ItemsExcelUploadModal";
import { exportItemsToCSV, downloadCSV } from "@/utils/excelImportExport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import { ROUTE_PATHS } from "@/config/routes";

const DEFAULT_CATEGORIES = [
  "Grocery",
  "Dairy",
  "Beverages",
  "Snacks",
  "Stationery",
  "Pharmacy",
  "Hygiene",
  "Hardware",
  "Electronics",
  "General",
];

const DEFAULT_SAMPLE_ITEMS: InventoryItem[] = [];

interface ProductBatchSummary {
  id: string;
  productId: string;
  batchNumber: string | null;
  mrp: number;
  sellingPrice: number;
  costPrice: number;
  stock: number;
  expiryDate: string | null;
  locationId: string | null;
}

interface ProductTags {
  [key: string]: unknown;
  selling_price?: number | string;
  purchase_price?: number | string;
  mrp?: number | string;
  min_stock_alert?: number | string;
  unit?: ItemUnit | string;
  gst_rate?: number | string;
  hsn_code?: string | null;
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }
  return "Something went wrong.";
};

export default function Items() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orgId, loading: orgLoading } = useOrganization();
  const { user } = useAuth();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Sorting
  const [sortField, setSortField] = useState<"name" | "stock" | "sellingPrice">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Banners & Modals
  const [showOfferBanner, setShowOfferBanner] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [libraryModalMode, setLibraryModalMode] = useState<"library" | "software" | "excel">("library");
  const [showExcelUploadModal, setShowExcelUploadModal] = useState(false);

  // Quick Stock Adjustment Modal
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustType, setAdjustType] = useState<"add" | "reduce">("add");

  // Products are served by the shared ProductsContext. Keep a local view in-sync for filtering/sorting UI
  const { products, refreshProducts, addOrUpdateProduct } = useProducts();

  useEffect(() => {
    // Map and hydrate products into local `items` for the page UI
    if (products && products.length > 0) {
      const mappedItems: InventoryItem[] = products.map((p: any) => {
        const sPrice = p.sellingPrice ?? p.selling_price ?? p.mrp ?? 0;
        const pPrice = p.purchasePrice ?? p.purchase_price ?? 0;
        const stock = p.currentStock ?? p.stock ?? 0;
        const minAlert = p.minStockAlert ?? 5;
        return {
          id: p.id,
          name: p.name || "Item",
          sku: p.sku || "",
          barcode: p.barcode || null,
          category: p.category || "General",
          brand: p.brand || null,
          unit: p.unit || "PCS",
          sellingPrice: sPrice,
          purchasePrice: pPrice,
          mrp: p.mrp ?? sPrice,
          gstRate: (p.gstRate || p.tax_rate || 18) as GSTRate,
          hsnCode: p.hsnCode || "9999",
          currentStock: stock,
          openingStock: stock,
          minStockAlert: minAlert,
          isLowStock: stock <= minAlert,
          batches: p.product_batches || [],
          created_at: p.created_at || new Date().toISOString(),
        };
      });
      setItems(mappedItems);
    } else {
      setItems([]);
    }
    setLoading(false);
  }, [products]);

  useEffect(() => {
    // Ensure products are loaded when orgId becomes available
    if (orgId && (!products || products.length === 0)) {
      (async () => {
        setLoading(true);
        try {
          await refreshProducts(orgId);
        } catch (err) {
          console.error("Failed to refresh products:", err);
          toast.error("Failed to load products.");
        } finally {
          setLoading(false);
        }
      })();
    } else {
      setLoading(false);
    }
  }, [orgId, refreshProducts]);


  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("new") === "1") {
      setEditingItem(null);
      setShowCreateModal(true);
    } else if (params.get("bulk") === "1") {
      setLibraryModalMode("excel");
      setShowLibraryModal(true);
    }
  }, [location.search]);

  // Save / Update Item
  const handleSaveItem = async (
    itemData: Omit<InventoryItem, "id" | "created_at" | "isLowStock">
  ) => {
    if (!orgId) {
      if (editingItem) {
        setItems((prev) =>
          prev.map((it) =>
            it.id === editingItem.id
              ? {
                  ...it,
                  ...itemData,
                  isLowStock: itemData.currentStock <= itemData.minStockAlert,
                }
              : it
          )
        );
        toast.success(`Updated item "${itemData.name}"`);
      } else {
        const newItem: InventoryItem = {
          ...itemData,
          id: `item-${Date.now()}`,
          isLowStock: itemData.currentStock <= itemData.minStockAlert,
          created_at: new Date().toISOString(),
        };
        setItems((prev) => [newItem, ...prev]);
        toast.success(`Created item "${itemData.name}"!`);
      }
      return;
    }

    try {
      const tagsPayload = {
        unit: itemData.unit,
        gst_rate: itemData.gstRate,
        hsn_code: itemData.hsnCode || "9999",
        selling_price: itemData.sellingPrice,
        purchase_price: itemData.purchasePrice,
        mrp: itemData.mrp || itemData.sellingPrice,
        min_stock_alert: itemData.minStockAlert,
      };

      if (editingItem) {
        await supabase
          .from("products")
          .update({
            name: itemData.name,
            sku: itemData.sku,
            barcode: itemData.barcode,
            category: itemData.category,
            brand: itemData.brand,
            tags: tagsPayload,
          })
          .eq("id", editingItem.id);

        // Synchronize product batch prices & stock
        try {
          const { data: existingBatches } = await supabase
            .from("product_batches")
            .select("id")
            .eq("product_id", editingItem.id)
            .limit(1);

          if (existingBatches && existingBatches.length > 0) {
            await supabase
              .from("product_batches")
              .update({
                cost_price: itemData.purchasePrice,
                mrp: itemData.mrp || itemData.sellingPrice,
                stock: itemData.currentStock,
              })
              .eq("id", existingBatches[0].id);
          } else {
            await supabase
              .from("product_batches")
              .insert({
                product_id: editingItem.id,
                batch_number: "BATCH-01",
                cost_price: itemData.purchasePrice,
                mrp: itemData.mrp || itemData.sellingPrice,
                stock: itemData.currentStock,
              });
          }
        } catch (batchErr) {
          console.warn("Product batch update notice:", batchErr);
        }

        toast.success(`Updated product "${itemData.name}"`);
      } else {
        const { data: newProd, error } = await supabase
          .from("products")
          .insert({
            organization_id: orgId,
            name: itemData.name,
            sku: itemData.sku,
            barcode: itemData.barcode,
            category: itemData.category,
            brand: itemData.brand,
            tags: tagsPayload,
          })
          .select()
          .single();

        if (error) throw error;

        if (newProd) {
          const batch = (itemData.batches && itemData.batches.length > 0) ? itemData.batches[0] : null;
          try {
            await supabase.from("product_batches").insert({
              product_id: newProd.id,
              batch_number: batch?.batchNumber || "BATCH-01",
              cost_price: itemData.purchasePrice,
              mrp: itemData.mrp || itemData.sellingPrice,
              stock: itemData.currentStock,
              expiry_date: batch?.expiryDate || null,
            });
          } catch (batchErr) {
            console.warn("Product batch insert notice:", batchErr);
          }
        }
        toast.success(`Created item "${itemData.name}"!`);
      }
      await refreshProducts(orgId);
    } catch (err: unknown) {
      console.error("Save item error:", err);
      const msg = getErrorMessage(err);
      if (/schema|relation|could not find|does not exist|PGRST202/i.test(msg)) {
        // Fallback to local creation if DB schema is missing or PostgREST function not found
        if (!editingItem) {
          const newItem: InventoryItem = {
            ...itemData,
            id: `item-local-${Date.now()}`,
            isLowStock: itemData.currentStock <= itemData.minStockAlert,
            created_at: new Date().toISOString(),
          };
          setItems((prev) => [newItem, ...prev]);
          // Also update shared products store so other views see the new item immediately
          try {
            addOrUpdateProduct(newItem as any);
          } catch (e) {
            console.warn('Failed to update shared products store:', e);
          }
          toast.warning("Database schema missing — item created locally. Ensure Supabase tables/migrations are applied; see SUPABASE_VERCEL_INTEGRATION.md in project root for guidance.");
          return;
        }
      }
      toast.error(msg || "Failed to save item.");
    }
  };

  // Bulk Import Products (Excel, Product Library & Software Migration)
  const handleBulkImportItems = async (importedList: Partial<InventoryItem>[]) => {
    if (!orgId) {
      const newItems: InventoryItem[] = importedList.map((it, idx) => {
        const sPrice = it.sellingPrice || 100;
        const pPrice = it.purchasePrice || 80;
        const stock = it.openingStock ?? it.currentStock ?? 0;
        const minAlert = it.minStockAlert || 10;
        return {
          id: `item-imp-${Date.now()}-${idx}`,
          name: it.name || "Product",
          sku: it.sku || `SKU-${Math.floor(100000 + Math.random() * 900000)}`,
          barcode: it.barcode || null,
          category: it.category || "General",
          brand: it.brand || null,
          unit: it.unit || "PCS",
          sellingPrice: sPrice,
          purchasePrice: pPrice,
          mrp: it.mrp || sPrice,
          gstRate: (it.gstRate as GSTRate) || 18,
          hsnCode: it.hsnCode || null,
          currentStock: stock,
          openingStock: stock,
          minStockAlert: minAlert,
          isLowStock: stock <= minAlert,
          batches: it.batches || [],
          created_at: new Date().toISOString(),
        };
      });
      setItems((prev) => [...newItems, ...prev]);
      return;
    }

    try {
      for (const it of importedList) {
        const sPrice = it.sellingPrice || 100;
        const pPrice = it.purchasePrice || Math.round(sPrice * 0.8);
        const stock = it.openingStock ?? it.currentStock ?? 10;
        const skuVal = it.sku || `SKU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        const gstRateVal = (typeof it.gstRate !== "undefined" && it.gstRate !== null) ? Number(it.gstRate) : 18;
        const minStockAlertVal = (typeof it.minStockAlert !== "undefined" && it.minStockAlert !== null) ? Number(it.minStockAlert) : 5;
        const tagsPayload = {
          selling_price: sPrice,
          purchase_price: pPrice,
          mrp: it.mrp ?? sPrice,
          unit: it.unit ?? "PCS",
          gst_rate: gstRateVal,
          hsn_code: it.hsnCode ?? "9999",
          min_stock_alert: minStockAlertVal,
        };

        const { data: newProd, error: pErr } = await supabase
          .from("products")
          .insert({
            organization_id: orgId,
            name: it.name || "Product",
            brand: it.brand ?? null,
            category: it.category ?? "General",
            barcode: it.barcode ?? null,
            sku: skuVal,
            image_url: it.imageUrl ?? "",
            tags: tagsPayload,
          })
          .select()
          .single();

        if (newProd && !pErr) {
          await supabase.from("product_batches").insert({
            product_id: newProd.id,
            batch_number: "BATCH-01",
            cost_price: pPrice,
            mrp: it.mrp || sPrice,
            stock: stock,
          });
        }
      }
      toast.success(`Successfully imported ${importedList.length} products with barcodes & stock!`);
      await refreshProducts(orgId);
    } catch (err: unknown) {
      console.error("Bulk item import error:", err);
      toast.error(getErrorMessage(err) || "Failed to persist imported items.");
    }
  };

  // Delete Item
  const handleDeleteItem = async (item: InventoryItem) => {
    if (!confirm(`Delete product "${item.name}"?`)) return;

    if (!orgId) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast.success("Item deleted.");
      return;
    }

    try {
      await supabase.from("products").delete().eq("id", item.id);
      toast.success("Product deleted.");
      await refreshProducts(orgId);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "Failed to delete item.");
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected items?`)) return;
    const ids = Array.from(selectedIds);
    try {
      if (orgId) {
        await supabase.from("product_batches").delete().in("product_id", ids);
        await supabase.from("products").delete().in("id", ids);
        await refreshProducts(orgId);
      } else {
        setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
      }
      setSelectedIds(new Set());
      toast.success("Selected items deleted.");
    } catch (err) {
      toast.error(getErrorMessage(err) || "Failed to delete items.");
    }
  };

  // Bulk Export
  const handleBulkExport = () => {
    const listToExport =
      selectedIds.size > 0 ? items.filter((i) => selectedIds.has(i.id)) : items;
    const csv = exportItemsToCSV(listToExport);
    downloadCSV(`CredSmart_Inventory_Export_${new Date().toISOString().slice(0, 10)}.csv`, csv);
    toast.success(`Exported ${listToExport.length} items to CSV!`);
  };

  // Quick Stock Adjustment
  const handleSaveStockAdjustment = async () => {
    if (!adjustingItem) return;
    const qty = parseFloat(adjustQty) || 0;
    if (qty <= 0) {
      toast.error("Please enter a valid adjustment quantity.");
      return;
    }

    const newStock =
      adjustType === "add"
        ? adjustingItem.currentStock + qty
        : Math.max(0, adjustingItem.currentStock - qty);

    try {
      if (orgId) {
        // Adjust logic needs proper batching if we were using it, but for UI sync:
        // Actually, stock adjustment belongs in inventory, but for quick adjust on item page:
        // We might just update the first batch, or we just rely on local state if DB update isn't implemented here fully.
        // Assuming we need to update the first batch for simplicity, if batches were tracked:
        const { data: batches } = await supabase.from("product_batches").select("id").eq("product_id", adjustingItem.id).limit(1);
        if (batches && batches.length > 0) {
          await supabase.from("product_batches").update({ stock: newStock }).eq("id", batches[0].id);
        } else {
          await supabase.from("product_batches").insert({
            product_id: adjustingItem.id,
            batch_number: "BATCH-01",
            cost_price: adjustingItem.purchasePrice,
            mrp: adjustingItem.mrp || adjustingItem.sellingPrice,
            stock: newStock,
          });
        }
        await refreshProducts(orgId);
      } else {
        setItems((prev) =>
          prev.map((i) =>
            i.id === adjustingItem.id
              ? { ...i, currentStock: newStock, isLowStock: newStock <= i.minStockAlert }
              : i
          )
        );
      }
      toast.success(
        `Stock adjusted for ${adjustingItem.name} (${adjustType === "add" ? "+" : "-"}${qty} ${adjustingItem.unit})`
      );
      setAdjustingItem(null);
      setAdjustQty("");
    } catch (err) {
      toast.error(getErrorMessage(err) || "Failed to adjust stock.");
    }
  };

  // Metric Cards Calculations
  const totalStockValue = items.reduce(
    (sum, it) => sum + ((it?.currentStock ?? 0) * (it?.purchasePrice ?? 0)),
    0
  );
  const lowStockCount = items.filter((it) => (it?.isLowStock ?? false) && (it?.currentStock ?? 0) > 0).length;
  const outOfStockCount = items.filter((it) => (it?.currentStock ?? 0) <= 0).length;
  const totalItemsCount = items.filter(Boolean).length;

  // Sorting & Filtering
  const filteredItems = useMemo(() => {
    // Guard against any falsy entries in `items` and use safe fallbacks for fields
    return items
      .filter(Boolean)
      .filter((item) => {
        const itemCategory = (item.category ?? "").toString();
        if (categoryFilter !== "all" && itemCategory.toLowerCase() !== categoryFilter.toLowerCase()) {
          return false;
        }
        if (lowStockOnly && !item.isLowStock) {
          return false;
        }
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        const name = (item.name ?? "").toString().toLowerCase();
        const sku = (item.sku ?? "").toString().toLowerCase();
        const barcode = (item.barcode ?? "").toString().toLowerCase();
        const brand = (item.brand ?? "").toString().toLowerCase();
        const hsn = (item.hsnCode ?? "").toString().toLowerCase();
        return (
          name.includes(q) ||
          sku.includes(q) ||
          (barcode && barcode.includes(q)) ||
          (brand && brand.includes(q)) ||
          (hsn && hsn.includes(q))
        );
      })
      .sort((a, b) => {
        if (sortField === "name") {
          const comp = (a.name ?? "").toString().localeCompare((b.name ?? "").toString());
          return sortDirection === "asc" ? comp : -comp;
        }
        if (sortField === "stock") {
          const diff = (a.currentStock ?? 0) - (b.currentStock ?? 0);
          return sortDirection === "asc" ? diff : -diff;
        }
        if (sortField === "sellingPrice") {
          const diff = (a.sellingPrice ?? 0) - (b.sellingPrice ?? 0);
          return sortDirection === "asc" ? diff : -diff;
        }
        return 0;
      });
  }, [items, categoryFilter, lowStockOnly, search, sortField, sortDirection]);

  const handleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSort = (field: "name" | "stock" | "sellingPrice") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
  setSortDirection("asc");
    }
  };

  return (
    <div className="h-full flex flex-col p-3 sm:p-4 space-y-3 overflow-hidden font-sans">
      {/* ------------------------------------------------------------- */}
      {/* METRIC CARDS: Stock Value (₹), Low Stock count, Total Items, Out of Stock */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 shrink-0">
        {/* Card 1: Total Stock Value */}
        <div className="glass-card-3d p-2.5 sm:p-3.5 flex items-center justify-between relative overflow-hidden group select-none">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 via-purple-500 to-violet-600 rounded-l-2xl shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
          <div className="space-y-0.5 min-w-0">
            <span className="text-[9px] sm:text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-mono truncate block">
              Stock Valuation
            </span>
            <p className="text-sm sm:text-lg font-black text-slate-900 dark:text-white font-mono tracking-tight truncate">
              ₹ {totalStockValue.toLocaleString("en-IN")}
            </p>
            <p className="hidden sm:block text-[10px] text-slate-500 dark:text-slate-400">Current cost valuation</p>
          </div>
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0 hidden sm:flex">
            <Package className="w-4 h-4" />
          </div>
        </div>

        {/* Card 2: Low Stock Count */}
        <div
          onClick={() => setLowStockOnly((prev) => !prev)}
          className={cn(
            "glass-card-3d p-2.5 sm:p-3.5 cursor-pointer transition-all flex items-center justify-between relative overflow-hidden group select-none",
            lowStockOnly
              ? "ring-2 ring-amber-500/40 bg-amber-50/30 dark:bg-amber-950/30"
              : "hover:scale-[1.01]"
          )}
        >
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 via-orange-500 to-rose-600 rounded-l-2xl shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-[9px] sm:text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider font-mono truncate block">
                Low Stock
              </span>
              {lowStockOnly && <Badge className="text-[8px] h-3.5 px-1 py-0 bg-amber-500 text-white">Active</Badge>}
            </div>
            <p className="text-sm sm:text-lg font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight truncate">
              {lowStockCount} Items
            </p>
            <p className="hidden sm:block text-[10px] text-amber-700/80 dark:text-amber-400/80">
              {lowStockOnly ? "Clear filter" : "Below reorder level"}
            </p>
          </div>
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0 hidden sm:flex">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        {/* Card 3: Total Items Count */}
        <div className="glass-card-3d p-2.5 sm:p-3.5 flex items-center justify-between relative overflow-hidden group select-none">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 via-blue-500 to-indigo-600 rounded-l-2xl shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          <div className="space-y-0.5 min-w-0">
            <span className="text-[9px] sm:text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider font-mono truncate block">
              Total Catalog
            </span>
            <p className="text-sm sm:text-lg font-black text-slate-900 dark:text-white font-mono tracking-tight truncate">{totalItemsCount} SKUs</p>
            <p className="hidden sm:block text-[10px] text-slate-500 dark:text-slate-400">Master products</p>
          </div>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 hidden sm:flex">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        {/* Card 4: Out of Stock Count */}
        <div className="glass-card-3d p-2.5 sm:p-3.5 flex items-center justify-between relative overflow-hidden group select-none">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-rose-400 via-red-500 to-rose-700 rounded-l-2xl shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
          <div className="space-y-0.5 min-w-0">
            <span className="text-[9px] sm:text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider font-mono truncate block">
              Zero Stock
            </span>
            <p className="text-sm sm:text-lg font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight truncate">
              {outOfStockCount} Items
            </p>
            <p className="hidden sm:block text-[10px] text-rose-500 dark:text-rose-400">Needs restock</p>
          </div>
          <div className="p-2 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 shrink-0 hidden sm:flex">
            <X className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* FILTER & SEARCH BAR - Frosted Glass Container */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
          {/* Search input */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by Item Name, SKU, Barcode, HSN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs bg-slate-50/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Categories Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-3 gap-1.5 text-xs justify-between font-semibold border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 rounded-xl shrink-0">
                <span className="truncate max-w-[85px] sm:max-w-[130px]">
                  {categoryFilter === "all" ? "Categories" : categoryFilter}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setCategoryFilter("all")}>
                All Categories
              </DropdownMenuItem>
              {DEFAULT_CATEGORIES.map((c) => (
                <DropdownMenuItem key={c} onClick={() => setCategoryFilter(c)}>
                  {c}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Bulk Upload Items Button - Always visible on mobile & desktop */}
          <button
            onClick={() => {
              setLibraryModalMode("excel");
              setShowLibraryModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl glowing-btn-blue text-white font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
            title="Bulk Upload Items from Excel / CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-300" />
            <span>Bulk Products</span>
          </button>

          {/* Primary Glowing Create Item button */}
          <button
            onClick={() => {
              setEditingItem(null);
              setShowCreateModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl glowing-btn-amber text-white font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Create Item</span>
          </button>
        </div>

        {/* Bulk Action Dropdown (shows on desktop or when items selected) */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 text-xs font-semibold w-full sm:w-auto border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <span>Bulk Action ({selectedIds.size})</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={handleBulkExport} className="text-xs">
                  <Download className="w-3.5 h-3.5 mr-2" />
                  Export Selected (CSV)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const percent = prompt("Enter price adjustment percentage (e.g. 5 for +5%, -10 for -10%):");
                    if (percent && !isNaN(Number(percent))) {
                      const factor = 1 + Number(percent) / 100;
                      setItems((prev) =>
                        prev.map((it) =>
                          selectedIds.has(it.id)
                            ? { ...it, sellingPrice: Math.round(it.sellingPrice * factor) }
                            : it
                        )
                      );
                      toast.success(`Updated prices for ${selectedIds.size} items by ${percent}%`);
                    }
                  }}
                  className="text-xs"
                >
                  <Percent className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                  Bulk Adjust Prices (+/- %)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleBulkDelete}
                  className="text-xs cursor-pointer text-rose-600 dark:text-rose-400"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Delete Selected Items
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Quick Software Migration Ribbon */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none shrink-0 py-0.5">
        <button
          onClick={() => {
            setLibraryModalMode("library");
            setShowLibraryModal(true);
          }}
          className="h-7.5 px-3 text-[11px] font-bold gap-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 shrink-0 cursor-pointer shadow-2xs flex items-center transition-all active:scale-95"
        >
          <Barcode className="w-3 h-3" />
          <span>Product Library (Preloaded Barcodes)</span>
        </button>

        <button
          onClick={() => {
            setLibraryModalMode("software");
            setShowLibraryModal(true);
          }}
          className="h-7.5 px-3 text-[11px] font-bold gap-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shrink-0 cursor-pointer shadow-2xs flex items-center transition-all active:scale-95"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Import from Vyapar / Tally / My Bill Book</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ITEMS TABLE / MOBILE CARDS STREAM - Fits Remaining Height */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 min-h-0 border border-border rounded-xl overflow-hidden bg-card shadow-2xs flex flex-col">
        {/* MOBILE VIEW: Touch Item Cards (Visible on screens < md) */}
        <div className="block md:hidden flex-1 min-h-0 overflow-y-auto p-2.5 pb-28 space-y-2.5 scrollbar-thin">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading items catalog...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Package className="w-10 h-10 mx-auto text-muted-foreground/50" />
              <p className="text-sm font-semibold text-foreground">No inventory items found</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {search ? `No items match "${search}".` : "Create your first product or import from product library."}
              </p>
              <Button
                size="sm"
                onClick={() => {
                  setEditingItem(null);
                  setShowCreateModal(true);
                }}
                className="gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Create New Item
              </Button>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSelected = selectedIds.has(item.id);
              const isZero = item.currentStock <= 0;
              const isLow = item.isLowStock && !isZero;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "p-3.5 rounded-2xl border transition-all bg-card space-y-2.5 shadow-2xs active:scale-[0.99]",
                    isSelected ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground border border-border shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4
                          onClick={() => {
                            setEditingItem(item);
                            setShowCreateModal(true);
                          }}
                          className="font-bold text-sm text-foreground hover:text-primary cursor-pointer transition-colors truncate"
                        >
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                          <span className="bg-muted px-1.5 py-0.2 rounded text-[10px] font-mono">
                            {item.sku}
                          </span>
                          <span>•</span>
                          <span className="truncate">{item.category}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-sm text-foreground">
                        ₹ {(Number(item.sellingPrice) || 0).toLocaleString("en-IN")}
                      </span>
                      <div className="mt-0.5">
                        {isZero ? (
                          <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[9px] py-0">
                            Out of Stock
                          </Badge>
                        ) : isLow ? (
                          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 text-[9px] py-0">
                            Low: {item.currentStock} {item.unit}
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[9px] py-0">
                            {item.currentStock} {item.unit}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                      {item.barcode && (
                        <span className="flex items-center gap-1">
                          <QrCode className="w-3 h-3 text-indigo-600" />
                          <span>{item.barcode}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAdjustingItem(item);
                          setAdjustType("add");
                          setAdjustQty("1");
                        }}
                        className="h-7 px-2.5 text-[11px] font-semibold"
                      >
                        Adjust Stock
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingItem(item);
                              setShowCreateModal(true);
                            }}
                            className="text-xs cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                            Edit Item
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedBarcodeItem(item);
                              setShowBarcodeModal(true);
                            }}
                            className="text-xs cursor-pointer"
                          >
                            <Barcode className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                            Print Barcode
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteItem(item)}
                            className="text-xs cursor-pointer text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Delete Item
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* DESKTOP VIEW: Untouched Data Table (Visible on md: and above) */}
        <div className="hidden md:block flex-1 min-h-0 overflow-y-auto overflow-x-auto w-full scrollbar-thin">
          <table className="w-full text-xs text-left min-w-[640px]">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-xs border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px] sm:text-[11px] z-10">
              <tr>
                <th className="px-3 py-2.5 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="p-0.5 rounded hover:bg-muted text-foreground"
                  >
                    {selectedIds.size > 0 && selectedIds.size === filteredItems.length ? (
                      <CheckSquare className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </button>
                </th>
                <th
                  onClick={() => handleSort("name")}
                  className="px-4 py-3.5 cursor-pointer hover:text-foreground select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Item Name</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th className="px-4 py-3.5">Item Code / SKU</th>
                <th
                  onClick={() => handleSort("stock")}
                  className="px-4 py-3.5 cursor-pointer hover:text-foreground select-none text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Stock QTY & Unit</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("sellingPrice")}
                  className="px-4 py-3.5 cursor-pointer hover:text-foreground select-none text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Selling Price (₹)</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th className="px-4 py-3.5 text-right">Purchase Price (₹)</th>
                <th className="px-4 py-3.5 text-center w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading items catalog...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-muted-foreground space-y-3">
                    <Package className="w-10 h-10 mx-auto text-muted-foreground/50" />
                    <p className="text-sm font-semibold text-foreground">No inventory items found</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      {search
                        ? `No items match "${search}". Try searching another name or barcode.`
                        : "Start by creating your first product or import from our pre-built product library."}
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditingItem(null);
                          setShowCreateModal(true);
                        }}
                        className="gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        Create New Item
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowLibraryModal(true)}
                        className="gap-1.5"
                      >
                        <Library className="w-4 h-4 text-primary" />
                        Product Library
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  const isZero = item.currentStock <= 0;
                  const isLow = item.isLowStock && !isZero;

                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        "hover:bg-muted/30 transition-colors group",
                        isSelected && "bg-primary/5"
                      )}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelect(item.id)}
                          className="p-1 rounded hover:bg-muted text-foreground"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                      </td>

                      {/* Item Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground border border-border shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span
                              onClick={() => {
                                setEditingItem(item);
                                setShowCreateModal(true);
                              }}
                              className="font-bold text-foreground hover:text-primary cursor-pointer transition-colors truncate block"
                            >
                              {item.name}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              {item.brand && <span>{item.brand} ·</span>}
                              <span className="bg-muted px-1.5 py-0.2 rounded border border-border/60">
                                {item.category}
                              </span>
                              {item.gstRate !== undefined && (
                                <span className="font-mono">{item.gstRate}% GST</span>
                              )}
                              {item.hsnCode && (
                                <span className="font-mono">· HSN: {item.hsnCode}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Item Code / SKU */}
                      <td className="px-4 py-3.5 font-mono">
                        <div className="space-y-0.5">
                          <span className="font-bold text-foreground text-xs">{item.sku}</span>
                          {item.barcode && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <QrCode className="w-3 h-3" />
                              {item.barcode}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Stock QTY & Unit (Sortable) */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="space-y-0.5">
                          <span
                            className={cn(
                              "font-mono font-black text-sm",
                              isZero
                                ? "text-rose-600 dark:text-rose-400"
                                : isLow
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-foreground"
                            )}
                          >
                            {item.currentStock} {item.unit}
                          </span>
                          <div>
                            {isZero ? (
                              <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[9px] py-0">
                                Out of Stock
                              </Badge>
                            ) : isLow ? (
                              <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 text-[9px] py-0">
                                Low Stock Alert
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">In Stock</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Selling Price */}
                      <td className="px-4 py-3.5 text-right font-mono">
                        <span className="font-bold text-foreground text-sm">
                          ₹ {(Number(item.sellingPrice) || 0).toLocaleString("en-IN")}
                        </span>
                        {Number(item.mrp || 0) > Number(item.sellingPrice || 0) && (
                          <p className="text-[10px] text-muted-foreground line-through">
                            MRP ₹{Number(item.mrp || 0)}
                          </p>
                        )}
                      </td>

                      {/* Purchase Price */}
                      <td className="px-4 py-3.5 text-right font-mono text-muted-foreground">
                        <span className="font-semibold text-xs">
                          ₹ {(Number(item.purchasePrice) || 0).toLocaleString("en-IN")}
                        </span>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                          Margin: ₹ {Math.max(0, (Number(item.sellingPrice) || 0) - (Number(item.purchasePrice) || 0)).toFixed(0)}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-xs">Item Options</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingItem(item);
                                setShowCreateModal(true);
                              }}
                              className="text-xs cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                              Edit Item
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => {
                                setAdjustingItem(item);
                                setAdjustQty("5");
                                setAdjustType("add");
                              }}
                              className="text-xs cursor-pointer"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5 mr-2 text-primary" />
                              Adjust Stock (+ / -)
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => navigate(ROUTE_PATHS.barcode)}
                              className="text-xs cursor-pointer"
                            >
                              <Barcode className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                              Print Barcode Label
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => navigate(ROUTE_PATHS.godown)}
                              className="text-xs cursor-pointer"
                            >
                              <Warehouse className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                              Transfer to Godown
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteItem(item)}
                              className="text-xs cursor-pointer text-rose-600 dark:text-rose-400"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Delete Item
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        <div className="p-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Showing <strong className="text-foreground">{filteredItems.length}</strong> of{" "}
            {items.length} products
          </span>
          <div className="flex items-center gap-4 font-mono font-bold">
            <span>Selected: {selectedIds.size}</span>
            <span className="text-foreground">
              Total Stock Valuation: ₹ {totalStockValue.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>


      {/* ------------------------------------------------------------- */}
      {/* ALL MODALS */}
      {/* ------------------------------------------------------------- */}
      {/* 1. Create / Edit Item Modal */}
      <CreateItemModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        initialData={editingItem}
        categories={DEFAULT_CATEGORIES}
      />

      {/* 2. Create Promotional Offer Modal */}
      <CreateOfferModal
        isOpen={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        categories={DEFAULT_CATEGORIES}
        onSaveOffer={(offer) => {
          toast.success(`Active offer created: "${offer.title}"`);
        }}
      />

      {/* 3. Product Library Modal */}
      <ProductLibraryModal
        isOpen={showLibraryModal}
        onClose={() => setShowLibraryModal(false)}
        onAddProducts={handleBulkImportItems}
        mode={libraryModalMode}
      />

      {/* 4. Items Excel Upload Modal */}
      <ItemsExcelUploadModal
        isOpen={showExcelUploadModal}
        onClose={() => setShowExcelUploadModal(false)}
        onImport={handleBulkImportItems}
      />

      {/* 5. Quick Stock Adjustment Dialog */}
      <Dialog open={!!adjustingItem} onOpenChange={() => setAdjustingItem(null)}>
        <DialogContent className="max-w-xl sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ArrowRightLeft className="w-5 h-5 text-primary" />
              Adjust Stock: {adjustingItem?.name}
            </DialogTitle>
          </DialogHeader>

          {adjustingItem && (
            <div className="space-y-4 text-xs pt-2">
              <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
                <span className="text-muted-foreground">Current Stock On-Hand:</span>
                <span className="font-mono font-bold text-foreground text-sm">
                  {adjustingItem.currentStock} {adjustingItem.unit}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Adjustment Direction</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType("add")}
                    className={cn(
                      "py-2 px-3 rounded-lg border font-bold text-xs transition-all",
                      adjustType === "add"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    + Add Inward Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType("reduce")}
                    className={cn(
                      "py-2 px-3 rounded-lg border font-bold text-xs transition-all",
                      adjustType === "reduce"
                        ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    - Deduct Stock (Damage/Loss)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">
                  Quantity to {adjustType === "add" ? "Add" : "Deduct"} ({adjustingItem.unit})
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  min="1"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setAdjustingItem(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveStockAdjustment}>
                  Apply Adjustment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
