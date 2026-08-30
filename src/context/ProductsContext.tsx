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
  altUnit?: string;
  altUnitConversion?: number;
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
  tags?: Record<string, unknown>;
  product_batches?: {
    id: string;
    batch_number: string;
    mrp: number;
    cost_price?: number;
    stock: number;
    expiry_date: string | null;
  }[];
}

// eslint-disable-next-line react-refresh/only-export-components
export function normalizeProduct(p: unknown): ProductCatalogOption {
  const pRecord = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
  const tags = (pRecord.tags && typeof pRecord.tags === "object" ? pRecord.tags : {}) as Record<string, unknown>;
  const batches = Array.isArray(pRecord.product_batches) ? pRecord.product_batches : [];
  const firstBatch = batches[0];

  const mrpVal =
    Number(firstBatch?.mrp) ||
    Number(tags.mrp) ||
    Number(tags.selling_price) ||
    Number(pRecord.selling_price) ||
    0;

  const costVal =
    Number(firstBatch?.cost_price) ||
    Number(tags.purchase_price) ||
    Number(tags.cost_price) ||
    0;

  const totalStock =
    batches.length > 0
      ? batches.reduce((sum: number, b: unknown) => sum + (Number((b as Record<string, unknown>)?.stock) || 0), 0)
      : Number(tags.stock ?? tags.opening_stock ?? 0);

  const unitVal = (tags.unit as string) || (pRecord.unit as string) || "PCS";
  const altUnitVal = (tags.alt_unit as string) || (pRecord.altUnit as string) || (pRecord.alt_unit as string) || undefined;
  const altConvRaw = tags.alt_unit_conversion ?? pRecord.altUnitConversion ?? pRecord.alt_unit_conversion ?? undefined;
  const altConvVal = altConvRaw != null && !isNaN(Number(altConvRaw)) ? Number(altConvRaw) : undefined;
  const gstRateVal = Number(tags.gst_rate) || Number(pRecord.tax_rate) || 18;
  const hsnVal = (tags.hsn_code as string) || (tags.hsn as string) || (pRecord.hsn as string) || (pRecord.hsn_code as string) || "";
  const minAlert = Number(tags.min_stock_alert) || 5;

  return {
    ...pRecord,
    id: String(pRecord.id || ""),
    name: String(pRecord.name || "Unnamed Product"),
    category: String(pRecord.category || "General"),
    brand: pRecord.brand ? String(pRecord.brand) : null,
    barcode: pRecord.barcode ? String(pRecord.barcode) : null,
    sku: String(pRecord.sku || ""),
    unit: unitVal,
    altUnit: altUnitVal,
    altUnitConversion: altConvVal,
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
  const { org, orgId } = useOrganization();
  const [products, setProducts] = useState<ProductCatalogOption[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshProducts = useCallback(async (customOrgId?: string) => {
    const effectiveOrg =
      customOrgId ||
      orgId ||
      org?.id ||
      localStorage.getItem("credsmart_active_org_id") ||
      undefined;
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
    } finally {
      setLoading(false);
    }
  }, [org, orgId]);

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
    const targetId = orgId || org?.id || localStorage.getItem("credsmart_active_org_id");
    if (targetId) {
      refreshProducts(targetId);
    }
  }, [org?.id, orgId, refreshProducts]);

  return (
    <ProductsContext.Provider value={{ products, loading, refreshProducts, addOrUpdateProduct, getById }}>
      {children}
    </ProductsContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useProducts = () => {
  const ctx = useContext(ProductsContext);
  if (!ctx) {
    throw new Error("useProducts must be used within a ProductsProvider");
  }
  return ctx;
};
