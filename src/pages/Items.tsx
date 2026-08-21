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
} from "lucide-react";
import { InventoryItem, ItemUnit, GSTRate, ItemOffer } from "@/types/inventory";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
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
import { useNavigate } from "react-router-dom";
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

const DEFAULT_SAMPLE_ITEMS: InventoryItem[] = [
  {
    id: "item-01",
    name: "Amul Butter Pasteurised (500g)",
    sku: "AML-BUT-500",
    barcode: "8901030728563",
    category: "Dairy",
    brand: "Amul",
    unit: "PCS",
    sellingPrice: 280,
    purchasePrice: 240,
    mrp: 285,
    gstRate: 12,
    hsnCode: "0402",
    currentStock: 45,
    openingStock: 50,
    minStockAlert: 15,
    isLowStock: false,
    godownName: "Main Warehouse",
    batches: [
      {
        id: "b-01",
        productId: "item-01",
        batchNumber: "BATCH-D01",
        mrp: 285,
        sellingPrice: 280,
        costPrice: 240,
        stock: 45,
        expiryDate: "2026-11-30",
      },
    ],
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: "item-02",
    name: "Dettol Antiseptic Liquid (500ml)",
    sku: "DET-LIQ-500",
    barcode: "8901058851403",
    category: "Hygiene",
    brand: "Dettol",
    unit: "BTL",
    sellingPrice: 195,
    purchasePrice: 160,
    mrp: 210,
    gstRate: 18,
    hsnCode: "3808",
    currentStock: 6,
    openingStock: 25,
    minStockAlert: 10,
    isLowStock: true,
    godownName: "Main Warehouse",
    batches: [
      {
        id: "b-02",
        productId: "item-02",
        batchNumber: "BATCH-H01",
        mrp: 210,
        sellingPrice: 195,
        costPrice: 160,
        stock: 6,
        expiryDate: "2027-04-30",
      },
    ],
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
  {
    id: "item-03",
    name: "Tata Salt Vacuum Evaporated (1kg)",
    sku: "TAT-SLT-1KG",
    barcode: "8901030615863",
    category: "Grocery",
    brand: "Tata",
    unit: "KG",
    sellingPrice: 28,
    purchasePrice: 22,
    mrp: 30,
    gstRate: 5,
    hsnCode: "1006",
    currentStock: 120,
    openingStock: 150,
    minStockAlert: 25,
    isLowStock: false,
    godownName: "North Branch Godown",
    batches: [
      {
        id: "b-03",
        productId: "item-03",
        batchNumber: "BATCH-GR01",
        mrp: 30,
        sellingPrice: 28,
        costPrice: 22,
        stock: 120,
        expiryDate: "2027-08-31",
      },
    ],
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: "item-04",
    name: "Paracetamol 500mg IP (Strip of 10)",
    sku: "CIP-PCM-500",
    barcode: "8906002410507",
    category: "Pharmacy",
    brand: "Cipla",
    unit: "PKT",
    sellingPrice: 22,
    purchasePrice: 14,
    mrp: 25,
    gstRate: 12,
    hsnCode: "3004",
    currentStock: 300,
    openingStock: 300,
    minStockAlert: 50,
    isLowStock: false,
    godownName: "Main Warehouse",
    batches: [
      {
        id: "b-04",
        productId: "item-04",
        batchNumber: "BATCH-P01",
        mrp: 25,
        sellingPrice: 22,
        costPrice: 14,
        stock: 300,
        expiryDate: "2028-02-28",
      },
    ],
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: "item-05",
    name: "Coca-Cola Original 300ml Can",
    sku: "COK-CAN-300",
    barcode: "8901491101356",
    category: "Beverages",
    brand: "Coca-Cola",
    unit: "CAN",
    sellingPrice: 40,
    purchasePrice: 28,
    mrp: 40,
    gstRate: 28,
    hsnCode: "2202",
    currentStock: 0,
    openingStock: 48,
    minStockAlert: 12,
    isLowStock: true,
    godownName: "Cold Storage Unit 1",
    batches: [
      {
        id: "b-05",
        productId: "item-05",
        batchNumber: "BATCH-BV01",
        mrp: 40,
        sellingPrice: 40,
        costPrice: 28,
        stock: 0,
        expiryDate: "2026-10-31",
      },
    ],
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: "item-06",
    name: "Supreme PVC Elbow Joint (1 inch)",
    sku: "SUP-ELB-1IN",
    barcode: "8901063010222",
    category: "Hardware",
    brand: "Supreme",
    unit: "PCS",
    sellingPrice: 25,
    purchasePrice: 16,
    mrp: 28,
    gstRate: 18,
    hsnCode: "7307",
    currentStock: 140,
    openingStock: 150,
    minStockAlert: 30,
    isLowStock: false,
    godownName: "North Branch Godown",
    batches: [
      {
        id: "b-06",
        productId: "item-06",
        batchNumber: "BATCH-HW01",
        mrp: 28,
        sellingPrice: 25,
        costPrice: 16,
        stock: 140,
      },
    ],
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
];

export default function Items() {
  const navigate = useNavigate();
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
  const [libraryModalMode, setLibraryModalMode] = useState<"library" | "software_import">("library");
  const [showExcelUploadModal, setShowExcelUploadModal] = useState(false);

  // Quick Stock Adjustment Modal
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustType, setAdjustType] = useState<"add" | "reduce">("add");

  // Fetch Items & Batches from Supabase
  const fetchItems = useCallback(async () => {
    if (!orgId) {
      setItems(DEFAULT_SAMPLE_ITEMS);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: dbProducts, error: prodErr } = await supabase
        .from("products")
        .select("id, name, brand, category, barcode, sku, image_url, tags, created_at")
        .eq("organization_id", orgId)
        .order("name");

      if (prodErr || !dbProducts || dbProducts.length === 0) {
        setItems(DEFAULT_SAMPLE_ITEMS);
        setLoading(false);
        return;
      }

      const prodIds = dbProducts.map((p) => p.id);
      const { data: batches } = await supabase
        .from("product_batches")
        .select("id, product_id, mrp, stock, cost_price, batch_number, expiry_date, location_id")
        .in("product_id", prodIds.length > 0 ? prodIds : ["__none__"]);

      const batchMap: Record<string, any[]> = {};
      (batches || []).forEach((b) => {
        if (!batchMap[b.product_id]) batchMap[b.product_id] = [];
        batchMap[b.product_id].push({
          id: b.id,
          productId: b.product_id,
          batchNumber: b.batch_number,
          mrp: Number(b.mrp) || 0,
          sellingPrice: Number(b.mrp) || 0,
          costPrice: Number(b.cost_price) || 0,
          stock: Number(b.stock) || 0,
          expiryDate: b.expiry_date,
          locationId: b.location_id,
        });
      });

      const formatted: InventoryItem[] = dbProducts.map((p) => {
        const rawSPrice = Number(tags.selling_price) || Number(firstBatch.sellingPrice) || Number(firstBatch.mrp) || 100;
        const sPrice = isNaN(rawSPrice) || rawSPrice <= 0 ? 100 : rawSPrice;

        const rawPPrice = Number(tags.purchase_price) || Number(firstBatch.costPrice) || Math.round(sPrice * 0.8) || 80;
        const pPrice = isNaN(rawPPrice) || rawPPrice <= 0 ? Math.round(sPrice * 0.8) : rawPPrice;

        const rawMrp = Number(firstBatch.mrp) || Number(tags.mrp) || sPrice;
        const mrpVal = isNaN(rawMrp) ? sPrice : rawMrp;

        const minAlert = Number(tags.min_stock_alert) || 10;
        const unitVal: ItemUnit = (tags.unit as ItemUnit) || "PCS";
        const gstRateVal: GSTRate = tags.gst_rate ? Number(tags.gst_rate) as GSTRate : 18;

        return {
          id: p.id,
          name: p.name,
          sku: p.sku || `SKU-${p.id.slice(0, 6)}`,
          barcode: p.barcode,
          category: p.category || "General",
          brand: p.brand,
          unit: unitVal,
          sellingPrice: sPrice,
          purchasePrice: pPrice,
          mrp: mrpVal,
          gstRate: gstRateVal,
          hsnCode: tags.hsn_code || null,
          currentStock: totalStock,
          openingStock: totalStock,
          minStockAlert: minAlert,
          isLowStock: totalStock <= minAlert,
          batches: itemBatches,
          created_at: p.created_at,
        };
      });

      setItems(formatted);
    } catch (err) {
      console.error("Error fetching items:", err);
      setItems(DEFAULT_SAMPLE_ITEMS);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

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
        hsn_code: itemData.hsnCode,
        selling_price: itemData.sellingPrice,
        purchase_price: itemData.purchasePrice,
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

        if (newProd && itemData.batches && itemData.batches.length > 0) {
          const batch = itemData.batches[0];
          await supabase.from("product_batches").insert({
            product_id: newProd.id,
            batch_number: batch.batchNumber || "BATCH-01",
            cost_price: itemData.purchasePrice,
            mrp: itemData.mrp,
            stock: itemData.currentStock,
            expiry_date: batch.expiryDate || null,
          });
        }
        toast.success(`Created item "${itemData.name}"!`);
      }
      fetchItems();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save item.");
    }
  };

  // Bulk Import
  const handleBulkImportItems = async (importedList: Partial<InventoryItem>[]) => {
    const newItems: InventoryItem[] = importedList.map((it, idx) => {
      const sPrice = it.sellingPrice || 100;
      const pPrice = it.purchasePrice || 80;
      const stock = it.currentStock || 0;
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
      fetchItems();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete item.");
    }
  };

  // Bulk Delete
  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected items?`)) return;
    setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
    setSelectedIds(new Set());
    toast.success("Selected items deleted.");
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
  const handleSaveStockAdjustment = () => {
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

    setItems((prev) =>
      prev.map((i) =>
        i.id === adjustingItem.id
          ? { ...i, currentStock: newStock, isLowStock: newStock <= i.minStockAlert }
          : i
      )
    );

    toast.success(
      `Stock adjusted for ${adjustingItem.name} (${adjustType === "add" ? "+" : "-"}${qty} ${adjustingItem.unit})`
    );
    setAdjustingItem(null);
    setAdjustQty("");
  };

  // Metric Cards Calculations
  const totalStockValue = items.reduce(
    (sum, it) => sum + it.currentStock * it.purchasePrice,
    0
  );
  const lowStockCount = items.filter((it) => it.isLowStock && it.currentStock > 0).length;
  const outOfStockCount = items.filter((it) => it.currentStock <= 0).length;
  const totalItemsCount = items.length;

  // Sorting & Filtering
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (categoryFilter !== "all" && item.category.toLowerCase() !== categoryFilter.toLowerCase()) {
          return false;
        }
        if (lowStockOnly && !item.isLowStock) {
          return false;
        }
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          (item.barcode && item.barcode.toLowerCase().includes(q)) ||
          (item.brand && item.brand.toLowerCase().includes(q)) ||
          (item.hsnCode && item.hsnCode.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortField === "name") {
          const comp = a.name.localeCompare(b.name);
          return sortDirection === "asc" ? comp : -comp;
        }
        if (sortField === "stock") {
          const diff = a.currentStock - b.currentStock;
          return sortDirection === "asc" ? diff : -diff;
        }
        if (sortField === "sellingPrice") {
          const diff = a.sellingPrice - b.sellingPrice;
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
    <div className="space-y-6 pb-12">
      {/* ------------------------------------------------------------- */}
      {/* TOP BANNER: Launch Offers on Your Items [Create Offer Now] [X] */}
      {/* ------------------------------------------------------------- */}
      {showOfferBanner && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent p-4 sm:p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">Launch Offers on Your Items</h3>
                  <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] uppercase font-bold border-amber-500/30">
                    Boost Sales
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                  Run attractive seasonal discounts, category percentage offers, and Buy-1-Get-1 schemes to accelerate stock turnover.
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setShowOfferModal(true)}
                    className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white gap-1.5 shadow-sm"
                  >
                    <Percent className="w-3.5 h-3.5" />
                    Create Offer Now →
                  </Button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowOfferBanner(false)}
              className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-background/40 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* METRIC CARDS: Stock Value (₹), Low Stock count, Total Items, Out of Stock */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Stock Value */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm hover:border-primary/40 transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Total Stock Value
            </span>
            <p className="text-2xl sm:text-3xl font-black text-foreground font-mono">
              ₹ {totalStockValue.toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-muted-foreground">Valuation at purchase cost</p>
          </div>
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Low Stock Count */}
        <div
          onClick={() => setLowStockOnly((prev) => !prev)}
          className={cn(
            "p-5 rounded-2xl border cursor-pointer shadow-sm transition-all flex items-center justify-between",
            lowStockOnly
              ? "border-amber-500 bg-amber-500/15 shadow-amber-500/10"
              : "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50"
          )}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                Low Stock Alert
              </span>
              {lowStockOnly && <Badge className="text-[9px] h-4">Active Filter</Badge>}
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {lowStockCount} Items
            </p>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
              Click to {lowStockOnly ? "clear filter" : "filter low stock"}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Total Items Count */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm hover:border-primary/40 transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Total Catalog Items
            </span>
            <p className="text-2xl sm:text-3xl font-black text-foreground">{totalItemsCount}</p>
            <p className="text-[11px] text-muted-foreground">Active SKUs across warehouses</p>
          </div>
          <div className="p-3 rounded-2xl bg-muted text-muted-foreground">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Out of Stock Count */}
        <div className="p-5 rounded-2xl border border-rose-500/30 bg-rose-500/5 dark:bg-rose-500/10 shadow-sm hover:border-rose-500/50 transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
              Out of Stock
            </span>
            <p className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">
              {outOfStockCount} Items
            </p>
            <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80">0 available quantity</p>
          </div>
          <div className="p-3 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
            <X className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* FILTER & SEARCH BAR: Search by SKU / Barcode, Categories dropdown, Low Stock button, Bulk Actions, "+ Create Item" */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-sm">
        {/* Left: Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by Item Name, SKU Code, Barcode, HSN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 text-xs bg-muted/30 border-border/80 focus:bg-background"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Categories dropdown */}
        <div className="w-full sm:w-52 shrink-0">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-10 text-xs">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {DEFAULT_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Low Stock Filter Button */}
        <Button
          variant={lowStockOnly ? "default" : "outline"}
          onClick={() => setLowStockOnly((prev) => !prev)}
          className={cn(
            "h-10 text-xs font-semibold gap-1.5 shrink-0",
            lowStockOnly
              ? "bg-amber-600 hover:bg-amber-700 text-white"
              : "border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
          )}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Low Stock ({lowStockCount})
        </Button>

        {/* Bulk Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-10 text-xs font-semibold gap-1.5 shrink-0"
              disabled={selectedIds.size === 0}
            >
              Bulk Actions ({selectedIds.size})
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs">Inventory Operations</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleBulkExport} className="text-xs cursor-pointer">
              <Download className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
              Export Selected to CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate(ROUTE_PATHS.barcode)}
              className="text-xs cursor-pointer"
            >
              <Barcode className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
              Print Barcode Labels
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                toast.success(`Updated prices for ${selectedIds.size} items.`);
              }}
              className="text-xs cursor-pointer"
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

        {/* Primary "+ Create Item" button */}
        <Button
          onClick={() => {
            setEditingItem(null);
            setShowCreateModal(true);
          }}
          className="h-10 gap-2 font-bold text-xs shrink-0 shadow-md shadow-primary/20"
        >
          <Plus className="w-4 h-4" />
          + Create Item
        </Button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ITEMS TABLE: Checkbox, Item Name (sortable), Item Code, Stock QTY & unit (sortable), Selling Price, Purchase Price, Actions */}
      {/* ------------------------------------------------------------- */}
      <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3.5 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="p-1 rounded hover:bg-muted text-foreground"
                  >
                    {selectedIds.size > 0 && selectedIds.size === filteredItems.length ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground" />
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
      {/* BOTTOM BANNER: Add Multiple items at once - Bulk Upload Items from Product Library or Other Software like Vyapar, Tally, Marg & Busy [Import Items] [Product Library] [Upload Excel] */}
      {/* ------------------------------------------------------------- */}
      <div className="p-5 rounded-2xl border border-border bg-gradient-to-r from-muted/60 via-card to-muted/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary shrink-0">
            <Library className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">Add Multiple items at once</h4>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
              Bulk Upload Items from Product Library or Other Software like Vyapar, Tally, Marg &amp; Busy.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Button
            variant="outline"
            onClick={() => {
              setLibraryModalMode("software_import");
              setShowLibraryModal(true);
            }}
            className="text-xs font-semibold h-10 gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            Import Items
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setLibraryModalMode("library");
              setShowLibraryModal(true);
            }}
            className="text-xs font-semibold h-10 gap-1.5"
          >
            <Library className="w-4 h-4 text-primary" />
            Product Library
          </Button>

          <Button
            onClick={() => setShowExcelUploadModal(true)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-4 shadow-sm"
          >
            <Download className="w-4 h-4" />
            Upload Excel
          </Button>
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
