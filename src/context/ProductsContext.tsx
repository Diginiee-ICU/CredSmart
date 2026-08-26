import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
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
  tax_rate?: number;
  tags?: Record<string, any>;
  product_batches?: {
    id: string;
    batch_number: string;
    mrp: number;
    stock: number;
    expiry_date: string | null;
  }[];
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
          "id, name, barcode, sku, category, unit, brand, tags, product_batches(id, batch_number, mrp, stock, expiry_date)"
        )
        .eq("organization_id", effectiveOrg)
        .order("name");
      if (error) throw error;
      if (data) setProducts(data as ProductCatalogOption[]);
    } catch (e) {
      console.error("Failed to refresh products", e);
      toast.error("Failed to load product catalog");
    } finally {
      setLoading(false);
    }
  }, [org]);

  const addOrUpdateProduct = useCallback((p: ProductCatalogOption) => {
    setProducts((prev) => {
      const idx = prev.findIndex((x) => x.id === p.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...p };
        return copy;
      }
      return [p, ...prev];
    });
  }, []);

  const getById = useCallback((id: string) => products.find((p) => p.id === id), [products]);

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
