import { useState, useEffect, useMemo, useCallback } from "react";
import { usePagination } from "@/hooks/usePagination";
import { PaginationBar } from "@/components/ui/PaginationBar";
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
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { InventoryItem, ItemUnit, GSTRate, ItemOffer } from "@/types/inventory";
import { productsApi } from "@/services/productsApi";
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
      const mappedItems: InventoryItem[] = products.map((p: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const sPrice = p.sellingPrice ?? p.selling_price ?? p.mrp ?? 0;
        const pPrice = p.purchasePrice ?? p.purchase_price ?? 0;
        const stock = p.currentStock ?? p.stock ?? 0;
        const minAlert = p.minStockAlert ?? 5;
        const altUnitVal = p.altUnit || p.tags?.alt_unit || null;
        const altConvVal = p.altUnitConversion ?? p.tags?.alt_unit_conversion ?? null;
        const imgUrl = p.imageUrl || p.image_url || p.tags?.image_url || p.tags?.imageUrl || null;
        return {
          id: p.id,
          name: p.name || "Item",
          sku: p.sku || "",
          barcode: p.barcode || null,
          category: p.category || "General",
          brand: p.brand || null,
          unit: p.unit || "PCS",
          altUnit: altUnitVal,
          altUnitConversion: altConvVal ? Number(altConvVal) : null,
          imageUrl: imgUrl,
          tags: p.tags || null,
          sellingPrice: sPrice,
          purchasePrice: pPrice,
          mrp: p.mrp ?? sPrice,
          gstRate: (p.gstRate || p.tax_rate || 18) as GSTRate,
          hsnCode: p.hsnCode || (p.tags as any /* eslint-disable-line @typescript-eslint/no-explicit-any */)?.hsn_code || (p.tags as any /* eslint-disable-line @typescript-eslint/no-explicit-any */)?.hsn || "", // eslint-disable-line @typescript-eslint/no-explicit-any
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
// eslint-disable-next-line react-hooks/exhaustive-deps
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
        alt_unit: itemData.altUnit || undefined,
        alt_unit_conversion: itemData.altUnitConversion || undefined,
        gst_rate: itemData.gstRate,
        hsn_code: itemData.hsnCode?.trim() || null,
        selling_price: itemData.sellingPrice,
        purchase_price: itemData.purchasePrice,
        mrp: itemData.mrp || itemData.sellingPrice,
        min_stock_alert: itemData.minStockAlert,
        image_url: itemData.imageUrl || undefined,
        imageUrl: itemData.imageUrl || undefined,
      };

      if (editingItem) {
        const { error: updateErr } = await productsApi.updateProduct(
          editingItem.id,
          {
            name: itemData.name,
            sku: itemData.sku,
            barcode: itemData.barcode,
            category: itemData.category,
            brand: itemData.brand,
            image_url: itemData.imageUrl || null,
            tags: tagsPayload,
          },
          orgId
        );
        if (updateErr) throw new Error(updateErr.message);

        // Synchronize product batch prices & stock
        try {
          const { data: existingBatches } = await productsApi.getBatches([editingItem.id], orgId);

          if (existingBatches && existingBatches.length > 0) {
            await productsApi.updateBatch(
              existingBatches[0].id!,
              {
                cost_price: itemData.purchasePrice,
                mrp: itemData.mrp || itemData.sellingPrice,
                stock: itemData.currentStock,
              },
              orgId
            );
          } else {
            await productsApi.createBatch(
              {
                product_id: editingItem.id,
                batch_number: "BATCH-01",
                cost_price: itemData.purchasePrice,
                mrp: itemData.mrp || itemData.sellingPrice,
                stock: itemData.currentStock,
              },
              orgId
            );
          }
        } catch (batchErr) {
          console.warn("Product batch update notice:", batchErr);
        }

        toast.success(`Updated product "${itemData.name}"`);
      } else {
        const { data: newProd, error } = await productsApi.createProduct(
          {
            organization_id: orgId,
            name: itemData.name,
            sku: itemData.sku,
            barcode: itemData.barcode,
            category: itemData.category,
            brand: itemData.brand,
            image_url: itemData.imageUrl || null,
            tags: tagsPayload,
          },
          orgId
        );

        if (error) throw new Error(error.message);

        if (newProd) {
          const batch = (itemData.batches && itemData.batches.length > 0) ? itemData.batches[0] : null;
          try {
            await productsApi.createBatch(
              {
                product_id: newProd.id,
                batch_number: batch?.batchNumber || "BATCH-01",
                cost_price: itemData.purchasePrice,
                mrp: itemData.mrp || itemData.sellingPrice,
                stock: itemData.currentStock,
                expiry_date: batch?.expiryDate || null,
              },
              orgId
            );
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
            addOrUpdateProduct(newItem as any /* eslint-disable-line @typescript-eslint/no-explicit-any */); // eslint-disable-line @typescript-eslint/no-explicit-any
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
          hsn_code: it.hsnCode ? String(it.hsnCode).trim() : null,
          min_stock_alert: minStockAlertVal,
        };

        const { data: newProd, error: pErr } = await productsApi.createProduct(
          {
            organization_id: orgId,
            name: it.name || "Product",
            brand: it.brand ?? null,
            category: it.category ?? "General",
            barcode: it.barcode ?? null,
            sku: skuVal,
            image_url: it.imageUrl ?? "",
            tags: tagsPayload,
          },
          orgId
        );

        if (newProd && !pErr) {
          await productsApi.createBatch(
            {
              product_id: newProd.id,
              batch_number: "BATCH-01",
              cost_price: pPrice,
              mrp: it.mrp || sPrice,
              stock: stock,
            },
            orgId
          );
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
      const { error } = await productsApi.deleteProduct(item.id, orgId);
      if (error) throw new Error(error.message);
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
        await productsApi.deleteBatchesByProductIds(ids, orgId);
        const { error } = await productsApi.bulkDelete(ids, orgId);
        if (error) throw new Error(error.message);
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
        await productsApi.adjustStock({
          productId: adjustingItem.id,
          adjustType,
          quantity: qty,
          orgId,
          costPrice: adjustingItem.purchasePrice,
          mrp: adjustingItem.mrp || adjustingItem.sellingPrice,
        });
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

  const {
    page, setPage, pageSize, setPageSize,
    paginatedItems, totalPages, totalItems,
    startIndex, endIndex, hasNext, hasPrev,
  } = usePagination(filteredItems, 25);

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
    <div className="h-full flex flex-col p-3 sm:p-4 space-y-3 overflow-hidden font-sans bg-slate-50/50 dark:bg-slate-950/50">
      {/* ------------------------------------------------------------- */}
      {/* METRIC CARDS: Stock Value (₹), Low Stock count, Total Items, Out of Stock */}
      {/* ------------------------------------------------------------- */}
      {/* Mobile Compact 4-Col KPI Mini Strip (Mobile Only) */}
      <div className="grid grid-cols-4 sm:hidden gap-1.5 shrink-0">
        <div className="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 select-none text-center relative overflow-hidden shadow-2xs">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-500" />
          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-mono truncate block">
            Valuation
          </span>
          <p className="text-xs font-bold text-slate-900 dark:text-white font-mono tabular-nums tracking-tight truncate mt-0.5">
            ₹{totalStockValue.toLocaleString("en-IN")}
          </p>
        </div>

        <div
          onClick={() => setLowStockOnly((prev) => !prev)}
          className={cn(
            "p-2 rounded-xl border select-none text-center cursor-pointer transition-all relative overflow-hidden shadow-2xs",
            lowStockOnly
              ? "ring-1.5 ring-amber-500/50 bg-amber-50/50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/60"
              : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900"
          )}
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500" />
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider font-mono truncate block">
            Low Stock
          </span>
          <p className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums tracking-tight truncate mt-0.5">
            {lowStockCount} SKUs
          </p>
        </div>

        <div className="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 select-none text-center relative overflow-hidden shadow-2xs">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />
          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider font-mono truncate block">
            Catalog
          </span>
          <p className="text-xs font-bold text-slate-900 dark:text-white font-mono tabular-nums tracking-tight truncate mt-0.5">
            {totalItemsCount} SKUs
          </p>
        </div>

        <div className="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 select-none text-center relative overflow-hidden shadow-2xs">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-rose-500" />
          <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider font-mono truncate block">
            Zero Stock
          </span>
          <p className="text-xs font-bold text-rose-600 dark:text-rose-400 font-mono tabular-nums tracking-tight truncate mt-0.5">
            {outOfStockCount} SKUs
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* METRIC CARDS: Stock Value (₹), Low Stock count, Total Items, Out of Stock (Tablet / Desktop) */}
      {/* ------------------------------------------------------------- */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 shrink-0">
        {/* Card 1: Total Stock Value */}
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-3.5 flex items-center justify-between relative overflow-hidden group select-none transition-all">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-500" />
          <div className="space-y-0.5 min-w-0">
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-mono truncate block">
              Stock Valuation
            </span>
            <p className="text-base sm:text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums tracking-tight truncate">
              ₹ {totalStockValue.toLocaleString("en-IN")}
            </p>


          </div>
          <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 shrink-0 hidden sm:flex">
            <Package className="w-4 h-4" />
          </div>
        </div>

        {/* Card 2: Low Stock Count */}
        <div
          onClick={() => setLowStockOnly((prev) => !prev)}
          className={cn(
            "rounded-xl border shadow-2xs p-3.5 cursor-pointer transition-all flex items-center justify-between relative overflow-hidden group select-none",
            lowStockOnly
              ? "ring-1.5 ring-amber-500/50 bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/60"
              : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
          )}
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500" />
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider font-mono truncate block">
                Low Stock
              </span>
              {lowStockOnly && <span className="text-[11px] px-1.5 py-0.2 rounded font-bold font-mono bg-amber-500 text-white">Active</span>}
            </div>
            <p className="text-base sm:text-xl font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums tracking-tight truncate">
              {lowStockCount} Items
            </p>




          </div>
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40 shrink-0 hidden sm:flex">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        {/* Card 3: Total Items Count */}
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-3.5 flex items-center justify-between relative overflow-hidden group select-none transition-all">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />
          <div className="space-y-0.5 min-w-0">
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider font-mono truncate block">
              Total Catalog
            </span>
            <p className="text-base sm:text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums tracking-tight truncate">
              {totalItemsCount} SKUs

            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 shrink-0 hidden sm:flex">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        {/* Card 4: Out of Stock Count */}
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-3.5 flex items-center justify-between relative overflow-hidden group select-none transition-all">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-rose-500" />
          <div className="space-y-0.5 min-w-0">
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider font-mono truncate block">
              Zero Stock
            </span>
            <p className="text-base sm:text-xl font-bold text-rose-600 dark:text-rose-400 font-mono tabular-nums tracking-tight truncate">
              {outOfStockCount} Items

            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 shrink-0 hidden sm:flex">
            <X className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* FILTER & SEARCH BAR - Stripe / Linear Hairline Container */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
          {/* Search input with clear X button */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search by Name, SKU, Barcode, HSN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-8 h-8.5 text-xs bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/90 dark:border-slate-700/80 rounded-lg focus-visible:ring-1 focus-visible:ring-slate-900 dark:focus-visible:ring-white"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5 rounded transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8.5 w-[125px] sm:w-[150px] text-xs bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/90 dark:border-slate-700/80 rounded-lg">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {DEFAULT_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Stock status filter */}
          <Select value={lowStockOnly ? "LOW" : "ALL"} onValueChange={(v) => setLowStockOnly(v === "LOW")}>
            <SelectTrigger className="h-8.5 w-[110px] sm:w-[130px] text-xs bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/90 dark:border-slate-700/80 rounded-lg">
              <SelectValue placeholder="Stock Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Stock</SelectItem>
              <SelectItem value="LOW">Low Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate(ROUTE_PATHS.barcode)}
            className="flex items-center justify-center gap-1.5 h-8.5 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 font-semibold text-xs shadow-2xs active:scale-[0.98] transition-all cursor-pointer shrink-0"
            title="Scan or generate barcodes"
          >
            <QrCode className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Barcode</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(ROUTE_PATHS.tallyImport)}
            className="flex items-center justify-center gap-1.5 h-8.5 px-3 rounded-lg bg-amber-50 hover:bg-amber-100/70 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-semibold text-xs shadow-2xs active:scale-[0.98] transition-all cursor-pointer shrink-0"
            title="Import Data from Tally or Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline">Import Data</span>
            <span className="sm:hidden">Import</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setShowCreateModal(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 h-8.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Item</span>
          </button>
        </div>

        {/* Selected Items Bulk Floating Banner */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-3 py-1.5 rounded-lg shadow-sm">
            <span className="text-xs font-semibold font-mono">
              {selectedIds.size} Selected
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-slate-700 dark:border-slate-300 text-slate-900 dark:text-white bg-white dark:bg-slate-900">
                  Bulk Actions <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    const percent = window.prompt("Enter percentage change for selling price (e.g. +10 or -5):");
                    if (percent) {
                      const factor = 1 + parseFloat(percent) / 100;
                      setItems((prev) =>
                        prev.map((it) =>
                          selectedIds.has(it.id)
                            ? { ...it, sellingPrice: Math.round(it.sellingPrice * factor * 100) / 100 }
                            : it
                        )
                      );
                      toast.success(`Updated prices for ${selectedIds.size} items by ${percent}%`);
                    }
                  }}
                  className="text-xs"
                >
                  <Percent className="w-3.5 h-3.5 mr-2" />
                  Bulk Price Change
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleBulkDelete} className="text-xs text-rose-600">
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Delete Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* 1-Tap Category Filter Chips & Software Migration Ribbon */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5 no-scrollbar shrink-0 py-0.5">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={cn(
              "h-7 px-2.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer active:scale-95 border",
              categoryFilter === "all"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-2xs"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            All Items ({items.length})
          </button>
          {DEFAULT_CATEGORIES.map((cat) => {
            const isSelected = categoryFilter.toLowerCase() === cat.toLowerCase();
            const count = items.filter((i) => (i.category || "").toLowerCase() === cat.toLowerCase()).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(isSelected ? "all" : cat)}
                className={cn(
                  "h-7 px-2.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer active:scale-95 border flex items-center gap-1",
                  isSelected
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-2xs"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                <span>{cat}</span>
                {count > 0 && (
                  <span className={cn(
                    "text-[11px] px-1 rounded-full font-mono",
                    isSelected ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 pl-2">
          <button
            type="button"
            onClick={() => {
              setLibraryModalMode("library");
              setShowLibraryModal(true);
            }}
            className="h-7 px-2.5 text-[11px] font-semibold gap-1.5 rounded-lg bg-blue-50/80 hover:bg-blue-100/70 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 shrink-0 cursor-pointer shadow-2xs flex items-center transition-all active:scale-95"
          >
            <Barcode className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Product Library</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLibraryModalMode("software");
              setShowLibraryModal(true);
            }}
            className="h-7 px-2.5 text-[11px] font-semibold gap-1.5 rounded-lg bg-indigo-50/80 hover:bg-indigo-100/70 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 shrink-0 cursor-pointer shadow-2xs flex items-center transition-all active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">Import from Vyapar / Tally</span>
            <span className="sm:hidden">Import Vyapar</span>
          </button>

          <button
            type="button"
            onClick={handleBulkExport}
            className="h-7 px-2.5 text-[11px] font-semibold gap-1.5 rounded-lg bg-slate-100/80 hover:bg-slate-200/70 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 shrink-0 cursor-pointer shadow-2xs flex items-center transition-all active:scale-95"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ITEMS TABLE / MOBILE CARDS STREAM - Fits Remaining Height */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 min-h-0 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs flex flex-col">
        {/* MOBILE VIEW: Touch Item Cards (Visible on screens < md) */}
        <div className="block md:hidden flex-1 min-h-0 overflow-y-auto p-2 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] space-y-2 scrollbar-thin overscroll-y-contain">
          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <div className="w-6 h-6 border-2 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-xs font-mono">Loading items catalog...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center space-y-2.5">
              <Package className="w-10 h-10 mx-auto text-slate-400/50" />
              <p className="text-xs font-bold text-slate-900 dark:text-white">No inventory items found</p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                {search ? `No items match "${search}".` : "Create your first product or import from product library."}
              </p>
  
              <Button
                size="sm"
                onClick={() => {
                  setEditingItem(null);
                  setShowCreateModal(true);
                }}
                className="gap-1.5 text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
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
                    "p-3 rounded-xl border transition-all bg-white dark:bg-slate-900 space-y-2 shadow-2xs active:scale-[0.99]",
                    isSelected ? "border-slate-900 dark:border-white ring-1.5 ring-slate-900/20 dark:ring-white/20 bg-slate-50/50 dark:bg-slate-800/40" : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300"
                  )}
                >
                  {/* Top Line: Thumbnail + Name + Status Micro-Dot Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        onClick={() => {
                          setEditingItem(item);
                          setShowCreateModal(true);
                        }}
                        className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-200/80 dark:border-slate-700 shrink-0 overflow-hidden cursor-pointer"
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <Package className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4
                          onClick={() => {
                            setEditingItem(item);
                            setShowCreateModal(true);
                          }}
                          className="font-bold text-xs text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors truncate"
                        >
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-0.5">
                          {item.brand && <span>{item.brand} ·</span>}
                          <span className="bg-slate-100 dark:bg-slate-800 px-1 rounded border border-slate-200/60 dark:border-slate-700/60">
                            {item.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isZero ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          0 Stock
                        </span>
                      ) : isLow ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          {item.currentStock} {item.unit}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {item.currentStock} {item.unit}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Line: Pricing & Stock figures in Tabular Num */}
                  <div className="flex items-center justify-between text-xs font-mono py-1 border-t border-b border-slate-100 dark:border-slate-800/60">
                    <div>
                      <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-sans">Selling Price</span>
                      <span className="font-bold tabular-nums text-slate-900 dark:text-white text-xs">
                        ₹ {(Number(item.sellingPrice) || 0).toLocaleString("en-IN")}
                      </span>
                      {Number(item.mrp || 0) > Number(item.sellingPrice || 0) && (
                        <span className="text-[11px] text-slate-400 line-through ml-1 tabular-nums">
                          ₹{Number(item.mrp || 0).toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-sans">Cost Price</span>
                      <span className="font-medium tabular-nums text-slate-600 dark:text-slate-400 text-xs">
                        ₹ {(Number(item.purchasePrice) || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Line: SKU / Barcode + Adjust & More Actions (≥44px touch targets) */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono truncate min-w-0">
                      {item.sku && (
                        <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60 truncate font-semibold">
                          {item.sku}
                        </span>
                      )}
                      {item.barcode && (
                        <span className="text-indigo-600 dark:text-indigo-400 truncate flex items-center gap-0.5">
                          <QrCode className="w-2.5 h-2.5" />
                          {item.barcode}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setAdjustingItem(item);
                          setAdjustQty("5");
                          setAdjustType("add");
                        }}
                        className="min-h-[44px] h-11 px-3 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 shadow-2xs active:scale-[0.98] transition-all cursor-pointer min-w-[70px] justify-center"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Adjust</span>
                      </button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 active:scale-[0.98] transition-all cursor-pointer"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingItem(item);
                              setShowCreateModal(true);
                            }}
                            className="text-xs cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5 mr-2 text-slate-500" />
                            Edit Item
                          </DropdownMenuItem>
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

        {/* DESKTOP VIEW: High-Density Data Table (Visible on md: and above) */}
        <div className="hidden md:block flex-1 min-h-0 overflow-y-auto overflow-x-auto w-full scrollbar-thin">
          <table className="w-full text-xs text-left min-w-[640px]">
            <thead className="sticky top-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[11px] uppercase tracking-wider z-10">
              <tr>
                <th className="px-3 py-2.5 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {selectedIds.size > 0 && selectedIds.size === filteredItems.length ? (
                      <CheckSquare className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                </th>
                <th
                  onClick={() => handleSort("name")}
                  className="px-3 py-2.5 cursor-pointer hover:text-slate-900 dark:hover:text-white select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Item Details</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="px-3 py-2.5">SKU & Barcode</th>
                <th
                  onClick={() => handleSort("stock")}
                  className="px-3 py-2.5 cursor-pointer hover:text-slate-900 dark:hover:text-white select-none text-right transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Stock Status</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("sellingPrice")}
                  className="px-3 py-2.5 cursor-pointer hover:text-slate-900 dark:hover:text-white select-none text-right transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Selling Price (₹)</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="px-3 py-2.5 text-right">Purchase Price (₹)</th>
                <th className="px-3 py-2.5 text-center w-14">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span className="text-xs font-mono">Loading items catalog...</span>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 space-y-3">
                    <Package className="w-10 h-10 mx-auto text-slate-400/50" />
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">No inventory items found</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
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
                        className="gap-1.5 text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs"
                      >
                        <Plus className="w-4 h-4" />
                        Create New Item
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowLibraryModal(true)}
                        className="gap-1.5 text-xs border-slate-200 dark:border-slate-700"
                      >
                        <Library className="w-4 h-4 text-blue-600" />
                        Product Library
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  const isZero = item.currentStock <= 0;
                  const isLow = item.isLowStock && !isZero;

                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        "hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group",
                        isSelected && "bg-blue-50/40 dark:bg-blue-950/20"
                      )}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelect(item.id)}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>
                      </td>

                      {/* Item Name */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            onClick={() => {
                              setEditingItem(item);
                              setShowCreateModal(true);
                            }}
                            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-400 shrink-0 overflow-hidden cursor-pointer hover:border-slate-400 transition-colors"
                          >
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <Package className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span
                              onClick={() => {
                                setEditingItem(item);
                                setShowCreateModal(true);
                              }}
                              className="font-bold text-xs text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors truncate block"
                            >
                              {item.name}
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap mt-0.5">
                              {item.brand && <span>{item.brand} ·</span>}
                              <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200/60 dark:border-slate-700/60 font-mono text-slate-600 dark:text-slate-400">
                                {item.category}
                              </span>
                              {item.altUnit && item.altUnitConversion && item.altUnitConversion > 1 && (
                                <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-mono px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-800/60 font-bold">
                                  1 {item.altUnit} = {item.altUnitConversion} {item.unit}
                                </span>
                              )}
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
                      <td className="px-3 py-2.5 font-mono">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 dark:text-white text-xs">{item.sku || "—"}</span>
                          {item.barcode ? (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <QrCode className="w-3 h-3 text-slate-400" />
                              <span>{item.barcode}</span>
                            </p>
                
                          ) : null}
                        </div>
                      </td>

                      {/* Stock QTY & Status Badge */}
                      <td className="px-3 py-2.5 text-right">
                        <div className="space-y-1">
                          <div className="font-mono tabular-nums font-bold text-xs text-slate-900 dark:text-white">
                            {item.currentStock} <span className="font-normal text-slate-500 text-[11px]">{item.unit}</span>
                            {item.altUnit && item.altUnitConversion && item.altUnitConversion > 1 && (
                              <span className="block text-[11px] font-normal text-slate-400 font-mono">
                                ({(item.currentStock / item.altUnitConversion).toFixed(1).replace(/\.0$/, "")} {item.altUnit})
                              </span>
                            )}
                          </div>
                          <div>
                            {isZero ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                Out of Stock
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Low Stock
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                In Stock
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Selling Price */}
                      <td className="px-3 py-2.5 text-right font-mono">
                        <span className="font-bold tabular-nums text-slate-900 dark:text-white text-xs">
                          ₹ {(Number(item.sellingPrice) || 0).toLocaleString("en-IN")}
                        </span>
                        {Number(item.mrp || 0) > Number(item.sellingPrice || 0) && (
                          <p className="text-[11px] text-slate-400 line-through tabular-nums">
                            MRP ₹{Number(item.mrp || 0).toLocaleString("en-IN")}
                          </p>
              
                        )}
                      </td>

                      {/* Purchase Price */}
                      <td className="px-3 py-2.5 text-right font-mono">
                        <span className="font-medium tabular-nums text-slate-600 dark:text-slate-400 text-xs">
                          ₹ {(Number(item.purchasePrice) || 0).toLocaleString("en-IN")}
                        </span>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                          Margin: ₹ {Math.max(0, (Number(item.sellingPrice) || 0) - (Number(item.purchasePrice) || 0)).toLocaleString("en-IN")}
                        </p>
            
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2.5 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="h-7 w-7 rounded-lg border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-[11px] font-mono uppercase text-slate-400">Item Options</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingItem(item);
                                setShowCreateModal(true);
                              }}
                              className="text-xs cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5 mr-2 text-slate-500" />
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
                              <ArrowRightLeft className="w-3.5 h-3.5 mr-2 text-blue-600" />
                              Adjust Stock (+ / -)
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => navigate(ROUTE_PATHS.barcode)}
                              className="text-xs cursor-pointer"
                            >
                              <Barcode className="w-3.5 h-3.5 mr-2 text-slate-500" />
                              Print Barcode Label
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => navigate(ROUTE_PATHS.godown)}
                              className="text-xs cursor-pointer"
                            >
                              <Warehouse className="w-3.5 h-3.5 mr-2 text-slate-500" />
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

        {/* Desktop Pagination */}
        <div className="hidden md:block">
          <PaginationBar
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            hasNext={hasNext}
            hasPrev={hasPrev}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
        </div>

        {/* Table Footer Summary */}
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Showing <strong className="text-slate-900 dark:text-white font-mono">{totalItems === 0 ? 0 : `${startIndex}–${endIndex}`}</strong> of{" "}
            <strong className="text-slate-900 dark:text-white font-mono">{items.length}</strong> products
          </span>
          <div className="flex items-center gap-4 font-mono">
            <span>Selected: <strong className="text-slate-900 dark:text-white">{selectedIds.size}</strong></span>
            <span className="text-slate-900 dark:text-white font-bold">
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
      <Dialog open={!!adjustingItem} onOpenChange={(open) => !open && setAdjustingItem(null)}>
        <DialogContent className="max-w-md w-full p-0 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 shrink-0">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  Adjust Stock
                </DialogTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {adjustingItem?.name} {adjustingItem?.sku ? `(${adjustingItem.sku})` : ""}
                </p>
    
              </div>
            </div>
          </div>

          {adjustingItem && (
            <div className="p-4 space-y-4 text-xs">
              {/* Current Stock Banner */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Current Stock On-Hand</span>
                  <span className="text-xs text-slate-400 font-mono">Unit: {adjustingItem.unit}</span>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-white text-base">
                  {adjustingItem.currentStock} {adjustingItem.unit}
                </span>
              </div>

              {/* Direction Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType("add")}
                    className={cn(
                      "py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98]",
                      adjustType === "add"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 shadow-2xs font-bold"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                    <span>+ Add Inward Stock</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType("reduce")}
                    className={cn(
                      "py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98]",
                      adjustType === "reduce"
                        ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-700 shadow-2xs font-bold"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                    <span>- Deduct (Loss/Damage)</span>
                  </button>
                </div>
              </div>

              {/* Quick Stepper Presets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Quantity ({adjustingItem.unit})
                  </label>
                  <span className="text-[11px] text-slate-400">Quick presets</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[1, 5, 10, 25, 50, 100].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => setAdjustQty(step.toString())}
                      className={cn(
                        "flex-1 py-1 rounded-lg border text-xs font-mono font-semibold transition-all active:scale-95 cursor-pointer",
                        adjustQty === step.toString()
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-2xs"
                          : "border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                      )}
                    >
                      +{step}
                    </button>
                  ))}
                </div>

                <div className="relative pt-1">
                  <Input
                    type="number"
                    placeholder="Enter quantity..."
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    min="1"
                    className="h-9 font-mono text-xs bg-slate-50/70 dark:bg-slate-800/50 border-slate-200/90 dark:border-slate-700/80 rounded-lg pr-12 focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-medium text-slate-400 pointer-events-none mt-0.5">
                    {adjustingItem.unit}
                  </span>
                </div>
              </div>

              {/* Projected Stock Preview */}
              {parseFloat(adjustQty) > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/50 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500 dark:text-slate-400 font-sans">Projected Stock:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 line-through">
                      {adjustingItem.currentStock}
                    </span>
                    <span className="text-slate-400 font-sans">→</span>
                    <span className={cn(
                      "font-bold text-sm",
                      adjustType === "add" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    )}>
                      {adjustType === "add"
                        ? adjustingItem.currentStock + (parseFloat(adjustQty) || 0)
                        : Math.max(0, adjustingItem.currentStock - (parseFloat(adjustQty) || 0))} {adjustingItem.unit}
                    </span>
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAdjustingItem(null)}
                  className="h-8.5 px-3 text-xs border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveStockAdjustment}
                  className="h-8.5 px-4 text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-2xs gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
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
