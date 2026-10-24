import { useState, useMemo } from "react";
import { useProducts, ProductCatalogOption } from "@/context/ProductsContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Package,
  Star,
  Upload,
  Check,
  Eye,
  EyeOff,
  Filter,
  Save,
  Image as ImageIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { productsApi } from "@/services/productsApi";
import { toast } from "sonner";

interface StorefrontCatalogTabProps {
  themeColor?: string;
}

export function StorefrontCatalogTab({ themeColor = "#FF6A00" }: StorefrontCatalogTabProps) {
  const { products, addOrUpdateProduct } = useProducts();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // Derive categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["all", ...Array.from(set)];
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const matchCat =
        selectedCategory === "all" ||
        (p.category || "General").toLowerCase() === selectedCategory.toLowerCase();
      if (!matchCat) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q)
      );
    });
  }, [products, searchQuery, selectedCategory]);

  // Product visibility check
  const isProductVisibleInCatalog = (p: ProductCatalogOption): boolean => {
    const tags = (p.tags && typeof p.tags === "object" ? p.tags : {}) as Record<string, unknown>;
    return tags.is_in_catalogue !== false && tags.show_in_catalogue !== false;
  };

  const isProductFeatured = (p: ProductCatalogOption): boolean => {
    const tags = (p.tags && typeof p.tags === "object" ? p.tags : {}) as Record<string, unknown>;
    return Boolean(tags.is_featured);
  };

  const getProductImage = (p: ProductCatalogOption): string => {
    const tags = (p.tags && typeof p.tags === "object" ? p.tags : {}) as Record<string, unknown>;
    return (tags.image_url as string) || (tags.imageUrl as string) || "";
  };

  // Toggle Visibility
  const toggleVisibility = async (product: ProductCatalogOption) => {
    const current = isProductVisibleInCatalog(product);
    const nextVal = !current;
    const currentTags = (product.tags || {}) as Record<string, unknown>;
    const updatedTags = { ...currentTags, is_in_catalogue: nextVal, show_in_catalogue: nextVal };

    const updatedProduct = { ...product, tags: updatedTags };
    addOrUpdateProduct(updatedProduct);

    // Save to backend
    try {
      await productsApi.updateProduct(product.id, { tags: updatedTags });
      toast.success(
        nextVal
          ? `"${product.name}" is now visible in online store`
          : `"${product.name}" is now hidden from online store`
      );
    } catch {
      toast.error("Failed to update product visibility.");
    }
  };

  // Toggle Featured
  const toggleFeatured = async (product: ProductCatalogOption) => {
    const current = isProductFeatured(product);
    const nextVal = !current;
    const currentTags = (product.tags || {}) as Record<string, unknown>;
    const updatedTags = { ...currentTags, is_featured: nextVal };

    const updatedProduct = { ...product, tags: updatedTags };
    addOrUpdateProduct(updatedProduct);

    try {
      await productsApi.updateProduct(product.id, { tags: updatedTags });
      toast.success(
        nextVal ? `Featured "${product.name}" on homepage` : `Unfeatured "${product.name}"`
      );
    } catch {
      toast.error("Failed to update featured flag.");
    }
  };

  // Upload Product Image
  const handleUploadProductImage = async (
    e: React.ChangeEvent<HTMLInputElement>,
    product: ProductCatalogOption
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }

    setUploadingId(product.id);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `products/${product.id}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("store-logos")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("store-logos").getPublicUrl(path);

      const currentTags = (product.tags || {}) as Record<string, unknown>;
      const updatedTags = { ...currentTags, image_url: publicUrl, imageUrl: publicUrl };

      const updatedProduct = { ...product, tags: updatedTags };
      addOrUpdateProduct(updatedProduct);

      await productsApi.updateProduct(product.id, { tags: updatedTags });

      toast.success(`Image updated for "${product.name}"`);
    } catch (err) {
      console.error("Image upload error:", err);
      toast.error("Failed to upload image.");
    } finally {
      setUploadingId(null);
      if (e.target) e.target.value = "";
    }
  };

  // Bulk actions
  const bulkSetVisibility = async (visible: boolean) => {
    const count = filteredProducts.length;
    if (count === 0) return;

    toast.info(`Updating ${count} products...`);
    for (const p of filteredProducts) {
      const currentTags = (p.tags || {}) as Record<string, unknown>;
      const updatedTags = { ...currentTags, is_in_catalogue: visible, show_in_catalogue: visible };
      addOrUpdateProduct({ ...p, tags: updatedTags });

      try {
        await productsApi.updateProduct(p.id, { tags: updatedTags });
      } catch { /* empty */ }
    }
    toast.success(`${count} products ${visible ? "published" : "hidden"}!`);
  };

  const totalVisible = products.filter(isProductVisibleInCatalog).length;

  return (
    <div className="flex flex-col gap-5 max-w-5xl">
      {/* Header Metric & Bulk Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Catalog Products ({products.length})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            <strong className="text-emerald-700 font-semibold">{totalVisible} items</strong> currently visible in your public digital storefront.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => bulkSetVisibility(true)}
            className="h-9 rounded-xl text-xs font-semibold border-slate-200 text-emerald-700 hover:bg-emerald-50"
          >
            <Eye className="w-3.5 h-3.5 mr-1" />
            <span>Publish All</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => bulkSetVisibility(false)}
            className="h-9 rounded-xl text-xs font-semibold border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <EyeOff className="w-3.5 h-3.5 mr-1" />
            <span>Hide All</span>
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items by name, brand, or barcode..."
            className="pl-9 h-10 rounded-xl border-slate-200 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {categories.slice(0, 6).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory.toLowerCase() === cat.toLowerCase()
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat === "all" ? "All Categories" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
            <Package className="w-12 h-12 stroke-[1.2] mb-2 text-slate-300" />
            <h4 className="text-sm font-semibold text-slate-700">No items match your filter</h4>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your search query or selecting another category.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredProducts.map((product) => {
              const visible = isProductVisibleInCatalog(product);
              const featured = isProductFeatured(product);
              const imgUrl = getProductImage(product);
              const stock = product.currentStock ?? product.stock ?? 0;

              return (
                <div
                  key={product.id}
                  className="p-3.5 sm:p-4 hover:bg-slate-50/70 transition flex items-center justify-between gap-3 sm:gap-4"
                >
                  {/* Left: Thumbnail & Info */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Thumbnail with upload trigger */}
                    <div className="relative group w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {imgUrl ? (
                        <img src={imgUrl} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-6 h-6 text-slate-400" />
                      )}

                      <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer text-white">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleUploadProductImage(e, product)}
                        />
                        <Upload className="w-3.5 h-3.5" />
                      </label>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {product.name}
                        </h4>
                        {featured && (
                          <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-sm flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            Featured
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                        <span>Cat: {product.category || "General"}</span>
                        <span>•</span>
                        <span>Stock: <strong className={stock > 0 ? "text-emerald-600" : "text-rose-600"}>{stock} {product.unit || "PCS"}</strong></span>
                        <span>•</span>
                        <span>Selling: <strong className="text-slate-900">₹{product.sellingPrice || product.mrp || 0}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Feature on homepage toggle */}
                    <button
                      type="button"
                      onClick={() => toggleFeatured(product)}
                      className={`p-1.5 rounded-lg border transition ${
                        featured
                          ? "bg-amber-50 border-amber-300 text-amber-600"
                          : "bg-white border-slate-200 text-slate-400 hover:text-slate-600"
                      }`}
                      title={featured ? "Unfeature item" : "Feature item on storefront"}
                    >
                      <Star className={`w-4 h-4 ${featured ? "fill-current" : ""}`} />
                    </button>

                    {/* Online Storefront Visibility Switch */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                        {visible ? "Visible" : "Hidden"}
                      </span>
                      <Switch
                        checked={visible}
                        onCheckedChange={() => toggleVisibility(product)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
