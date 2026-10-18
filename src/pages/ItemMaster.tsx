import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  QrCode,
  Edit,
  Trash2,
  Package,
  Filter,
  CheckSquare,
  X,
  Download,
} from "lucide-react";
import { AddProductModal, EditProductData } from "@/components/AddProductModal";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { productsApi } from "@/services/productsApi";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { normalizeError } from "@/lib/normalizeError";
import { Checkbox } from "@/components/ui/checkbox";

interface ProductRow {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  barcode: string | null;
  sku: string | null;
  image_url: string | null;
  tags: Record<string, string> | null;
  batches: { id: string; mrp: number; stock: number; costPrice: number; batchNumber: string; expiryDate: string | null }[];
}

type SaveProductInput = {
  name: string;
  brand?: string;
  category?: string;
  barcode?: string;
  sku?: string;
  imageUrl?: string;
  tags?: Record<string, string>;
  batches?: Array<{
    id?: string;
    batchNumber?: string;
    costPrice?: number | string;
    mrp?: number | string;
    stock?: number | string;
    expiryDate?: string | null;
  }>;
};

type ProductImport = {
  name: string;
  brand?: string;
  category?: string;
  barcode?: string;
  imageUrl?: string;
  costPrice?: number;
  mrp?: number;
  stock?: number;
};

export default function ItemMaster() {
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<EditProductData | null>(null);
  const { toast } = useToast();
  const { orgId, loading: orgLoading } = useOrganization();
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEditField, setBulkEditField] = useState<"category" | "brand" | null>(null);
  const [bulkEditValue, setBulkEditValue] = useState("");

  const fetchProducts = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const { data: prods, error: prodsErr } = await productsApi.getProducts(orgId);

      if (prodsErr) {
        toast({ title: "Error loading products", description: prodsErr.message, variant: "destructive" });
        setProducts([]);
        return;
      }

      if (!prods || prods.length === 0) {
        setProducts([]);
        return;
      }

      const prodIds = prods.map((p) => p.id);
      const { data: batches, error: batchesErr } = await productsApi.getBatches(prodIds, orgId);

      if (batchesErr) {
        console.warn("Failed to load batches:", batchesErr.message);
      }

      const batchMap: Record<string, ProductRow["batches"]> = {};
      (batches || []).forEach((b) => {
        if (!batchMap[b.product_id]) batchMap[b.product_id] = [];
        batchMap[b.product_id].push({
          id: b.id,
          mrp: Number(b.mrp) || 0,
          stock: Number(b.stock) || 0,
          costPrice: Number(b.cost_price) || 0,
          batchNumber: b.batch_number || "BATCH-01",
          expiryDate: b.expiry_date,
        });
      });

      const enriched: ProductRow[] = prods.map((p) => ({
        ...p,
        tags: (p.tags as Record<string, string>) || null,
        batches: batchMap[p.id] || [],
      }));

      setProducts(enriched);
    } catch (err: unknown) {
      console.error("fetchProducts failed:", err);
      toast({ title: "Error", description: normalizeError(err), variant: "destructive" });
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, toast]);

  useEffect(() => {
    if (orgLoading) return;

    if (!orgId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    fetchProducts();
  }, [fetchProducts, orgId, orgLoading]);

  const handleSaveProduct = async (data: SaveProductInput) => {
    if (!orgId) return;
    try {
      const barcodeToSave = data.barcode?.trim() || data.sku || "";

      // Barcode duplication check
      if (barcodeToSave) {
        const { data: barcodeRes } = await productsApi.checkBarcodeUnique(barcodeToSave, orgId);
        if (barcodeRes && !barcodeRes.available && barcodeRes.existingProduct) {
          toast({
            title: "Duplicate Barcode / SKU",
            description: `Barcode "${barcodeToSave}" is already used by "${barcodeRes.existingProduct.name}". Please use a unique barcode.`,
            variant: "destructive",
          });
          return;
        }
      }

      // Initial batch creation
      const validBatches = (data.batches || [])
        .filter((b) => b && (b.mrp || b.costPrice || b.stock || b.batchNumber))
        .map((b) => ({
          batch_number: b.batchNumber?.trim() || "BATCH-01",
          cost_price: parseFloat(b.costPrice) || 0,
          mrp: parseFloat(b.mrp) || 0,
          stock: parseInt(b.stock) || 0,
          expiry_date: b.expiryDate || null,
        }));

      const initialBatches =
        validBatches.length > 0
          ? validBatches
          : [
              {
                batch_number: "BATCH-01",
                cost_price: 0,
                mrp: 0,
                stock: 0,
                expiry_date: null,
              },
            ];

      const { data: prod, error } = await productsApi.createProduct(
        {
          name: data.name.trim(),
          brand: data.brand?.trim() || "",
          category: data.category?.trim() || "",
          barcode: barcodeToSave,
          sku: data.sku,
          organization_id: orgId,
          tags: data.tags || {},
          image_url: data.imageUrl || "",
          batches: initialBatches,
        },
        orgId
      );

      if (error || !prod) {
        throw new Error(error?.message || "Failed to create product");
      }

      // Insert batches if not automatically created by backend createProduct
      for (const batch of initialBatches) {
        await productsApi.createBatch({ ...batch, product_id: prod.id }, orgId);
      }

      toast({ title: "Product saved", description: `${data.name} added to catalog.` });
      setShowAddModal(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (err: unknown) {
      console.error("handleSaveProduct failed:", err);
      toast({ title: "Error", description: normalizeError(err), variant: "destructive" });
    }
  };

  const handleUpdateProduct = async (id: string, data: SaveProductInput) => {
    if (!orgId) return;
    try {
      const barcodeToSave = data.barcode?.trim() || data.sku || "";

      // Barcode duplication check across other products
      if (barcodeToSave) {
        const { data: barcodeRes } = await productsApi.checkBarcodeUnique(barcodeToSave, orgId, id);
        if (barcodeRes && !barcodeRes.available && barcodeRes.existingProduct && barcodeRes.existingProduct.id !== id) {
          toast({
            title: "Duplicate Barcode / SKU",
            description: `Barcode "${barcodeToSave}" is already used by "${barcodeRes.existingProduct.name}". Please choose another barcode.`,
            variant: "destructive",
          });
          return;
        }
      }

      const { error } = await productsApi.updateProduct(
        id,
        {
          name: data.name.trim(),
          brand: data.brand?.trim() || "",
          category: data.category?.trim() || "",
          barcode: barcodeToSave,
          tags: data.tags || {},
          image_url: data.imageUrl || "",
        },
        orgId
      );

      if (error) throw new Error(error.message);

      // Handle batch updates on product edit
      if (data.batches && Array.isArray(data.batches)) {
        // Fetch existing batches for this product
        const { data: existingBatches } = await productsApi.getBatches([id], orgId);

        const existingIds = new Set((existingBatches || []).map((b) => b.id).filter(Boolean) as string[]);
        const keptIds = new Set<string>();

        for (const b of data.batches) {
          const batchPayload = {
            product_id: id,
            batch_number: b.batchNumber?.trim() || "BATCH-01",
            cost_price: parseFloat(b.costPrice) || 0,
            mrp: parseFloat(b.mrp) || 0,
            stock: parseInt(b.stock) || 0,
            expiry_date: b.expiryDate || null,
          };

          if (b.id && existingIds.has(b.id)) {
            keptIds.add(b.id);
            await productsApi.updateBatch(b.id, batchPayload, orgId);
          } else {
            const { data: ins } = await productsApi.createBatch(batchPayload, orgId);
            if (ins?.id) keptIds.add(ins.id);
          }
        }

        // Delete any removed batches (that were not kept)
        const toDelete = Array.from(existingIds).filter((eId) => !keptIds.has(eId));
        for (const delId of toDelete) {
          await productsApi.deleteBatch(delId, orgId);
        }
      }

      toast({ title: "Product updated", description: `${data.name} has been updated.` });
      setShowAddModal(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (err: unknown) {
      console.error("handleUpdateProduct failed:", err);
      toast({ title: "Error", description: normalizeError(err), variant: "destructive" });
    }
  };

  const handleBulkImport = async (importedProducts: ProductImport[]) => {
    if (!orgId) return;
    try {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      const productsToInsert = importedProducts.map((p) => {
        let genSku = "NX-";
        for (let i = 0; i < 8; i++) genSku += chars[Math.floor(Math.random() * chars.length)];
        return {
          name: p.name,
          brand: p.brand || "",
          category: p.category || "",
          barcode: p.barcode?.trim() || genSku,
          sku: genSku,
          image_url: p.imageUrl || "",
          organization_id: orgId,
        };
      });

      const bulkPayload = importedProducts.map((p, idx) => {
        const prod = productsToInsert[idx];
        return {
          ...prod,
          batches: [
            {
              batch_number: "BATCH-01",
              cost_price: Number(p.costPrice) || 0,
              mrp: Number(p.mrp) || 0,
              stock: Number(p.stock) || 0,
            },
          ],
        };
      });

      const { data: importRes, error } = await productsApi.bulkImport(bulkPayload, "overwrite", orgId);
      if (error) throw new Error(error.message);

      toast({ title: "Products Imported", description: `${importedProducts.length} products added from website.` });
      setShowAddModal(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (err: unknown) {
      console.error("handleBulkImport failed:", err);
      toast({ title: "Import failed", description: normalizeError(err), variant: "destructive" });
    }
  };

  const handleEditProduct = (product: ProductRow) => {
    setEditingProduct({
      id: product.id,
      name: product.name,
      brand: product.brand || "",
      barcode: product.barcode || "",
      category: product.category || "",
      tags: product.tags || {},
      imageUrl: product.image_url || "",
      sku: product.sku || "",
      batches: product.batches.map((b) => ({
        id: b.id,
        batchNumber: b.batchNumber,
        costPrice: String(b.costPrice),
        mrp: String(b.mrp),
        stock: String(b.stock),
        expiryDate: b.expiryDate || "",
      })),
    });
    setShowAddModal(true);
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This will also remove all its batches.`)) return;
    try {
      await productsApi.deleteBatchesByProductIds([id], orgId);
      const { error } = await productsApi.deleteProduct(id, orgId);
      if (error) throw new Error(error.message);

      toast({ title: "Deleted", description: `${name} removed from catalog.` });
      fetchProducts();
    } catch (err: unknown) {
      console.error("handleDeleteProduct failed:", err);
      toast({ title: "Error", description: normalizeError(err), variant: "destructive" });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} product(s)? This will also remove all their batches.`)) return;

    const ids = Array.from(selectedIds);
    try {
      await productsApi.deleteBatchesByProductIds(ids, orgId);
      const { error } = await productsApi.bulkDelete(ids, orgId);
      if (error) throw new Error(error.message);

      toast({ title: "Deleted", description: `${ids.length} product(s) removed.` });
      setSelectedIds(new Set());
      fetchProducts();
    } catch (err: unknown) {
      console.error("handleBulkDelete failed:", err);
      toast({ title: "Error", description: normalizeError(err), variant: "destructive" });
    }
  };

  const handleBulkEdit = async () => {
    if (selectedIds.size === 0 || !bulkEditField || !bulkEditValue.trim()) return;

    const ids = Array.from(selectedIds);
    const update: Record<string, string> = {};
    update[bulkEditField] = bulkEditValue.trim();

    try {
      const { error } = await productsApi.bulkUpdate(ids, update, orgId);
      if (error) throw new Error(error.message);

      toast({ title: "Updated", description: `${ids.length} product(s) updated.` });
      setSelectedIds(new Set());
      setBulkEditField(null);
      setBulkEditValue("");
      fetchProducts();
    } catch (err: unknown) {
      console.error("handleBulkEdit failed:", err);
      toast({ title: "Error", description: normalizeError(err), variant: "destructive" });
    }
  };

  const handleExportCSV = () => {
    const ids = selectedIds.size > 0 ? Array.from(selectedIds) : filtered.map((p) => p.id);
    const toExport = products.filter((p) => ids.includes(p.id));
    if (toExport.length === 0) return;

    const headers = ["Name", "Brand", "Category", "Barcode", "SKU", "Total Stock", "MRP"];
    const rows = toExport.map((p) => [
      `"${(p.name || "").replace(/"/g, '""')}"`,
      `"${(p.brand || "").replace(/"/g, '""')}"`,
      `"${(p.category || "").replace(/"/g, '""')}"`,
      `"${(p.barcode || "").replace(/"/g, '""')}"`,
      `"${(p.sku || "").replace(/"/g, '""')}"`,
      p.batches.reduce((s, b) => s + b.stock, 0),
      p.batches.length > 0 ? p.batches[0].mrp : "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${toExport.length} product(s) exported as CSV.` });
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.includes(search)) ||
      (p.brand && p.brand.toLowerCase().includes(search.toLowerCase()))
  );

  const categoryNames = [...new Set(products.map((p) => p.category).filter(Boolean) as string[])].sort();
  const brandNames = [...new Set(products.map((p) => p.brand).filter(Boolean) as string[])].sort();

  if (orgLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Item Master</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your product catalog & generate QR labels</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:shrink-0 w-full sm:w-auto">
          <button
            onClick={() => { setEditingProduct(null); setShowAddModal(true); }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold hover:opacity-90 transition-opacity w-full sm:w-auto"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Search / Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, barcode, or brand..."
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
          />
        </div>
      </div>

      {/* Bulk action toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20">
          <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-1 w-6 h-6 rounded flex items-center justify-center hover:bg-muted text-muted-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="h-5 w-px bg-border mx-1" />
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <div className="h-5 w-px bg-border mx-1" />
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
          <div className="h-5 w-px bg-border mx-1" />
          {bulkEditField ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground capitalize">Set {bulkEditField}:</span>
              <input
                type="text"
                list={`bulk-${bulkEditField}-list`}
                value={bulkEditValue}
                onChange={(e) => setBulkEditValue(e.target.value)}
                placeholder={`New ${bulkEditField}...`}
                className="h-8 w-40 px-2 rounded-lg bg-card border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <datalist id={`bulk-${bulkEditField}-list`}>
                {(bulkEditField === "category" ? categoryNames : brandNames).map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
              <button
                onClick={handleBulkEdit}
                disabled={!bulkEditValue.trim()}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Apply
              </button>
              <button onClick={() => { setBulkEditField(null); setBulkEditValue(""); }} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setBulkEditField("category")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                <Edit className="w-3.5 h-3.5" /> Set Category
              </button>
              <button
                onClick={() => setBulkEditField("brand")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                <Edit className="w-3.5 h-3.5" /> Set Brand
              </button>
            </>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card card-shadow overflow-hidden glass-panel">
        {/* Mobile card view */}
        <div className="block md:hidden divide-y divide-border">
          {filtered.map((product) => (
            <div key={product.id} className={cn("p-4 space-y-2", selectedIds.has(product.id) && "bg-primary/5")}>
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedIds.has(product.id)}
                  onCheckedChange={() => toggleSelect(product.id)}
                  className="shrink-0"
                />
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-9 h-9 rounded-lg object-cover shrink-0 bg-muted"
                    onError={(e) => {
                      const el = e.target as HTMLImageElement;
                      el.style.display = "none";
                      if (el.nextElementSibling) {
                        (el.nextElementSibling as HTMLElement).classList.remove("hidden");
                      }
                    }}
                  />
                ) : null}
                <div className={cn("w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0", product.image_url && "hidden")}>
                  <Package className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground text-sm truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.brand} · {product.category}</p>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {product.batches.reduce((s, b) => s + b.stock, 0)} qty
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs text-muted-foreground">{product.barcode}</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEditProduct(product)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDeleteProduct(product.id, product.name)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[1080px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-3 py-3 w-10">
                <Checkbox
                  checked={filtered.length > 0 && selectedIds.size === filtered.length}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Product</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Barcode</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Category</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Batches</th>
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Total Stock</th>
              <th className="text-right px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => (
              <tr key={product.id} className={cn("border-b border-border last:border-0 hover:bg-muted/30 transition-colors", selectedIds.has(product.id) && "bg-primary/5")}>
                <td className="px-3 py-4">
                  <Checkbox
                    checked={selectedIds.has(product.id)}
                    onCheckedChange={() => toggleSelect(product.id)}
                  />
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-9 h-9 rounded-lg object-cover shrink-0 bg-muted"
                        onError={(e) => {
                          const el = e.target as HTMLImageElement;
                          el.style.display = "none";
                          if (el.nextElementSibling) {
                            (el.nextElementSibling as HTMLElement).classList.remove("hidden");
                          }
                        }}
                      />
                    ) : null}
                    <div className={cn("w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center", product.image_url && "hidden")}>
                      <Package className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.brand}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 font-mono text-xs text-muted-foreground">{product.barcode}</td>
                <td className="px-5 py-4">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
                    {product.category}
                  </span>
                </td>
                <td className="px-5 py-4">
                  {product.batches.map((b) => (
                    <span key={b.id} className="inline-block text-xs mr-1.5 px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      ₹{b.mrp} ({b.stock})
                    </span>
                  ))}
                </td>
                <td className="px-5 py-4 font-semibold text-foreground">
                  {product.batches.reduce((s, b) => s + b.stock, 0)}
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => handleEditProduct(product)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteProduct(product.id, product.name)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {products.length === 0 ? "No products yet. Add products manually or import from a website." : "No matching products."}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddProductModal
          categories={categoryNames}
          onClose={() => { setShowAddModal(false); setEditingProduct(null); }}
          onSave={handleSaveProduct}
          onUpdate={handleUpdateProduct}
          onBulkImport={handleBulkImport}
          editData={editingProduct}
        />
      )}
    </div>
  );
}

