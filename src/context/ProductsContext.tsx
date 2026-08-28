import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";

export interface ProductCatalogOption {
  id: string;
  name: string;
  category?: string;
  barcode: string | null;
  brand?: string | null;
  sku?: string;
  unit?: string;
  selling_price?: number;
  sellingPrice?: number;
  purchase_price?: number;
  purchasePrice?: number;
  mrp?: number;
  currentStock?: number;
  stock?: number;
  tax_rate?: number;
  gstRate?: number;
  hsnCode?: string;
  minStockAlert?: number;
  tags?: Record<string, any>;
  product_batches?: {
    id: string;
    batch_number: string;
    mrp: number;
    cost_price?: number;
    stock: number;
    expiry_date: string | null;
  }[];
}

export function normalizeProduct(p: any): ProductCatalogOption {
  const tags = p.tags || {};
  const batches = p.product_batches || [];
  const firstBatch = batches[0];

  const mrpVal =
    Number(firstBatch?.mrp) ||
    Number(tags.mrp) ||
    Number(tags.selling_price) ||
    Number(p.selling_price) ||
    0;

  const costVal =
    Number(firstBatch?.cost_price) ||
    Number(tags.purchase_price) ||
    Number(tags.cost_price) ||
    0;

  const totalStock =
    batches.length > 0
      ? batches.reduce((sum: number, b: any) => sum + (Number(b.stock) || 0), 0)
      : Number(tags.stock ?? tags.opening_stock ?? 0);

  const unitVal = tags.unit || p.unit || "PCS";
  const gstRateVal = Number(tags.gst_rate) || Number(p.tax_rate) || 18;
  const hsnVal = tags.hsn_code || tags.hsn || (p as any).hsn || (p as any).hsn_code || "";
  const minAlert = Number(tags.min_stock_alert) || 5;

  return {
    ...p,
    id: p.id,
    name: p.name || "Unnamed Product",
    category: p.category || "General",
    brand: p.brand || null,
    barcode: p.barcode || null,
    sku: p.sku || "",
    unit: unitVal,
    selling_price: mrpVal,
    sellingPrice: mrpVal,
    purchase_price: costVal,
    purchasePrice: costVal,
    mrp: mrpVal,
    currentStock: totalStock,
    stock: totalStock,
    tax_rate: gstRateVal,
    gstRate: gstRateVal,
    hsnCode: hsnVal,
    minStockAlert: minAlert,
    tags,
    product_batches: batches,
  };
}

type ProductsContextValue = {
  products: ProductCatalogOption[];
  loading: boolean;
  refreshProducts: (orgId?: string) => Promise<void>;
  addOrUpdateProduct: (p: ProductCatalogOption) => void;
  getById: (id: string) => ProductCatalogOption | undefined;
};

const ProductsContext = createContext<ProductsContextValue | undefined>(undefined);

export const ProductsProvider = ({ children }: { children: ReactNode }) => {
  const { org } = useOrganization();
  const [products, setProducts] = useState<ProductCatalogOption[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshProducts = useCallback(async (orgId?: string) => {
    const effectiveOrg = orgId || (org && (org.id as string)) || undefined;
    if (!effectiveOrg) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, barcode, sku, category, brand, tags, product_batches(id, batch_number, mrp, cost_price, stock, expiry_date)"
        )
        .eq("organization_id", effectiveOrg)
        .order("name");
      if (error) throw error;
      if (data) {
        const normalized = data.map(normalizeProduct);
        setProducts(normalized);
      }
    } catch (e) {
      console.error("Failed to refresh products", e);
      toast.error("Failed to load product catalog");
    } finally {
      setLoading(false);
    }
  }, [org]);

  const addOrUpdateProduct = useCallback((p: ProductCatalogOption) => {
    const normalized = normalizeProduct(p);
    setProducts((prev) => {
      const idx = prev.findIndex((x) => x.id === normalized.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...normalized };
        return copy;
      }
      return [normalized, ...prev];
    });
  }, []);

  const getById = useCallback((id: string) => products.find((p) => p.id === id), [products]);

  useEffect(() => {
    if (org?.id) {
      refreshProducts(org.id);
    }
  }, [org?.id, refreshProducts]);

  return (
    <ProductsContext.Provider value={{ products, loading, refreshProducts, addOrUpdateProduct, getById }}>
      {children}
    </ProductsContext.Provider>
  );
};

export const useProducts = () => {
  const ctx = useContext(ProductsContext);
  if (!ctx) {
    throw new Error("useProducts must be used within a ProductsProvider");
  }
  return ctx;
};
