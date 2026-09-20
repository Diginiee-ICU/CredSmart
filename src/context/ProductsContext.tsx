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
  imageUrl?: string | null;
  image_url?: string | null;
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
  const imgVal =
    (pRecord.image_url as string) ||
    (pRecord.imageUrl as string) ||
    (tags.image_url as string) ||
    (tags.imageUrl as string) ||
    null;

  return {
    ...pRecord,
    id: String(pRecord.id || ""),
    name: String(pRecord.name || "Unnamed Product"),
    category: String(pRecord.category || "General"),
    brand: pRecord.brand ? String(pRecord.brand) : null,
    barcode: pRecord.barcode ? String(pRecord.barcode) : null,
    sku: String(pRecord.sku || ""),
    imageUrl: imgVal,
    image_url: imgVal,
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
          "id, name, barcode, sku, category, brand, image_url, tags, product_batches(id, batch_number, mrp, cost_price, stock, expiry_date)"
        )
        .eq("organization_id", effectiveOrg)
        .order("name");
      if (error) throw error;

      const normalized = (data || []).map(normalizeProduct);

      // Merge with any local cached products (e.g. newly created via B2B network inward or offline)
      const localKey = `credsmart_cached_products_${effectiveOrg}`;
      let localCached: unknown[] = [];
      try {
        const raw = localStorage.getItem(localKey);
        localCached = raw ? JSON.parse(raw) : [];
      } catch { /* empty */ }

      const combined = [...normalized];
      if (Array.isArray(localCached)) {
        for (const loc of localCached) {
          const locObj = loc as Record<string, unknown>;
          const exists = combined.some(
            (p) =>
              p.id === locObj.id ||
              (locObj.barcode && p.barcode === locObj.barcode) ||
              (locObj.name && p.name.trim().toLowerCase() === String(locObj.name).trim().toLowerCase())
          );
          if (!exists) {
            combined.push(normalizeProduct(loc));
          }
        }
      }

      setProducts(combined);
      try {
        localStorage.setItem(localKey, JSON.stringify(combined));
      } catch { /* empty */ }
    } catch (e) {
      console.error("Failed to refresh products from cloud, checking local cache", e);
      // Fallback to local storage cache if Supabase is offline / unreachable
      try {
        const localKey = `credsmart_cached_products_${effectiveOrg}`;
        const raw = localStorage.getItem(localKey);
        const localCached = raw ? JSON.parse(raw) : [];
        if (Array.isArray(localCached) && localCached.length > 0) {
          setProducts(localCached.map(normalizeProduct));
        }
      } catch { /* empty */ }
    } finally {
      setLoading(false);
    }
  }, [org, orgId]);

  const addOrUpdateProduct = useCallback((p: ProductCatalogOption) => {
    const normalized = normalizeProduct(p);
    setProducts((prev) => {
      const idx = prev.findIndex((x) => x.id === normalized.id);
      let updated: ProductCatalogOption[];
      if (idx !== -1) {
        updated = [...prev];
        updated[idx] = { ...updated[idx], ...normalized };
      } else {
        updated = [normalized, ...prev];
      }
      const effectiveOrg = orgId || org?.id || localStorage.getItem("credsmart_active_org_id");
      if (effectiveOrg) {
        try {
          localStorage.setItem(`credsmart_cached_products_${effectiveOrg}`, JSON.stringify(updated));
        } catch { /* empty */ }
      }
      return updated;
    });
  }, [org, orgId]);

  const getById = useCallback((id: string) => products.find((p) => p.id === id), [products]);

  useEffect(() => {
    const targetId = orgId || org?.id || localStorage.getItem("credsmart_active_org_id");
    if (targetId) {
      // Immediate optimistic hydration from local cache
      try {
        const raw = localStorage.getItem(`credsmart_cached_products_${targetId}`);
        const localCached = raw ? JSON.parse(raw) : [];
        if (Array.isArray(localCached) && localCached.length > 0) {
          setProducts(localCached.map(normalizeProduct));
        }
      } catch { /* empty */ }

      refreshProducts(targetId);
    }
  }, [org?.id, orgId, refreshProducts]);

  // Real-time listener for stock adjustments from invoices, POS bills, and inventory updates
  useEffect(() => {
    const handleStockUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ orgId?: string }>;
      const targetId = customEvent.detail?.orgId || orgId || org?.id || localStorage.getItem("credsmart_active_org_id");
      if (targetId) {
        refreshProducts(targetId);
      }
    };

    window.addEventListener("credsmart:stock_updated", handleStockUpdate);
    return () => window.removeEventListener("credsmart:stock_updated", handleStockUpdate);
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
