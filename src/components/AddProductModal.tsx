import { useState, useCallback, useRef } from "react";
import { X, Plus, Trash2, QrCode, Globe, ImageIcon, Upload, Link } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";
import { WebsiteProductImport } from "@/components/WebsiteProductImport";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BatchInput {
  id?: string;
  batchNumber: string;
  costPrice: string;
  mrp: string;
  stock: string;
  expiryDate: string;
}

interface ProductFormData {
  name: string;
  brand: string;
  barcode: string;
  category: string;
  tags: Record<string, string>;
  batches: BatchInput[];
  imageUrl: string;
}

export interface EditProductData {
  id: string;
  name: string;
  brand: string;
  barcode: string;
  category: string;
  tags: Record<string, string>;
  imageUrl: string;
  sku: string;
  batches: BatchInput[];
}

interface AddProductModalProps {
  onClose: () => void;
  onSave: (data: ProductFormData & { sku: string }) => void;
  onUpdate?: (id: string, data: ProductFormData & { sku: string }) => void;
  onBulkImport?: (products: { name: string; brand: string; category: string; barcode: string; mrp: number; costPrice: number; imageUrl?: string }[]) => void;
  categories: string[];
  editData?: EditProductData | null;
}

const TAG_PRESETS: Record<string, string[]> = {
  Pharmacy: ["Expiry Date", "Drug Schedule", "Manufacturer"],
  Grocery: ["Unit of Measure", "Weight", "Organic"],
  Hardware: ["Dimensions", "Material", "Color"],
  Dairy: ["Unit of Measure", "Storage Temp"],
  Beverages: ["Volume", "Flavor"],
  default: ["Custom Tag"],
};

function generateSKU(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let sku = "NX-";
  for (let i = 0; i < 8; i++) sku += chars[Math.floor(Math.random() * chars.length)];
  return sku;
}

export function AddProductModal({ onClose, onSave, onUpdate, onBulkImport, categories, editData }: AddProductModalProps) {
  const isEditing = !!editData;
  const [mode, setMode] = useState<"manual" | "import">("manual");
  const [form, setForm] = useState<ProductFormData>(() => {
    if (editData) {
      return {
        name: editData.name,
        brand: editData.brand,
        barcode: editData.barcode,
        category: editData.category,
        tags: editData.tags,
        batches: editData.batches.length > 0 ? editData.batches.map(b => ({ ...b })) : [{ batchNumber: "", costPrice: "", mrp: "", stock: "", expiryDate: "" }],
        imageUrl: editData.imageUrl,
      };
    }
    return {
      name: "",
      brand: "",
      barcode: "",
      category: "",
      tags: {},
      batches: [{ batchNumber: "", costPrice: "", mrp: "", stock: "", expiryDate: "" }],
      imageUrl: "",
    };
  });
  const [sku] = useState(() => editData?.sku || generateSKU());
  const [showQR, setShowQR] = useState(false);
  const [newTagKey, setNewTagKey] = useState("");
  const [imagePreview, setImagePreview] = useState<string>(editData?.imageUrl || "");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateField = useCallback(
    <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) =>
      setForm((prev) => ({ ...prev, [key]: value })),
    []
  );

  const updateBatch = (idx: number, field: keyof BatchInput, value: string) => {
    setForm((prev) => ({
      ...prev,
      batches: prev.batches.map((b, i) => (i === idx ? { ...b, [field]: value } : b)),
    }));
  };

  const addBatch = () =>
    setForm((prev) => ({
      ...prev,
      batches: [...prev.batches, { batchNumber: "", costPrice: "", mrp: "", stock: "", expiryDate: "" }],
    }));

  const removeBatch = (idx: number) =>
    setForm((prev) => ({ ...prev, batches: prev.batches.filter((_, i) => i !== idx) }));

  const addTag = (key: string) => {
    if (key && !form.tags[key]) {
      updateField("tags", { ...form.tags, [key]: "" });
      setNewTagKey("");
    }
  };

  const removeTag = (key: string) => {
    const next = { ...form.tags };
    delete next[key];
    updateField("tags", next);
  };

  const suggestedTags = TAG_PRESETS[form.category] || TAG_PRESETS.default;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WEBP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file is too large. Maximum size is 5MB.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `product-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("store-logos")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("store-logos")
        .getPublicUrl(path);

      updateField("imageUrl", publicUrl);
      setImagePreview(publicUrl);
      toast.success("Product image uploaded successfully!");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && editData && onUpdate) {
      onUpdate(editData.id, { ...form, sku });
    } else {
      onSave({ ...form, sku });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-3 sm:px-4 pt-3 sm:pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl card-shadow-lg w-full max-w-3xl sm:max-w-4xl max-h-[calc(100dvh-0.75rem)] sm:max-h-[92vh] overflow-auto z-10 animate-scale-in">
        <div className="sticky top-0 bg-card border-b border-border px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-foreground">{isEditing ? "Edit Product" : "Add New Product"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode toggle - hide when editing */}
        {!isEditing && <div className="px-4 sm:px-6 pt-4 pb-2 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={cn(
              "flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all",
              mode === "manual" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-border"
            )}
          >
            Manual Entry
          </button>
          <button
            type="button"
            onClick={() => setMode("import")}
            className={cn(
              "flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5",
              mode === "import" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-border"
            )}
          >
            <Globe className="w-3.5 h-3.5" />
            Import from Website
          </button>
        </div>}

        {!isEditing && mode === "import" ? (
          <div className="p-4 sm:p-6">
            <WebsiteProductImport
              onImport={(products) => {
                if (onBulkImport) {
                  onBulkImport(products);
                }
                onClose();
              }}
            />
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 sm:space-y-6">
          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Product Name *</label>
              <input required value={form.name} onChange={(e) => updateField("name", e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Brand</label>
              <input value={form.brand} onChange={(e) => updateField("brand", e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Barcode</label>
              <input value={form.barcode} onChange={(e) => updateField("barcode", e.target.value)} placeholder="Leave empty for auto-SKU" className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Category</label>
              <select value={form.category} onChange={(e) => updateField("category", e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Product Image */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Product Image</p>
            <div className="flex gap-3 items-start">
              {/* Preview / Upload area */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center shrink-0 transition-colors hover:border-primary/50 hover:bg-primary/5 overflow-hidden",
                  uploading && "opacity-50 pointer-events-none"
                )}
              >
                {imagePreview || form.imageUrl ? (
                  <img
                    src={imagePreview || form.imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={() => setImagePreview("")}
                  />
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-muted-foreground mb-1" />
                    <span className="text-[9px] text-muted-foreground font-medium">
                      {uploading ? "Uploading..." : "Upload"}
                    </span>
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <div className="flex-1 space-y-1.5">
                <div className="relative">
                  <Link className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    value={form.imageUrl}
                    onChange={(e) => {
                      updateField("imageUrl", e.target.value);
                      setImagePreview(e.target.value);
                    }}
                    placeholder="Or paste image URL..."
                    className="w-full h-9 pl-8 pr-3 rounded-lg border border-border bg-background text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Upload a file or paste an image URL. Max 5MB.</p>
              </div>
            </div>
          </div>

          {/* Auto SKU */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Auto-Generated SKU</p>
              <p className="text-sm font-mono font-bold text-primary mt-0.5">{sku}</p>
            </div>
            <button type="button" onClick={() => setShowQR(!showQR)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity">
              <QrCode className="w-3.5 h-3.5" />
              {showQR ? "Hide QR" : "Generate QR"}
            </button>
          </div>

          {showQR && (
            <div className="flex justify-center p-4 sm:p-6 bg-background rounded-xl border border-border">
              <div className="text-center">
                <QRCodeSVG value={form.barcode || sku} size={160} level="H" includeMargin />
                <p className="text-xs text-muted-foreground mt-3 font-mono">{form.barcode || sku}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Print this label for the product</p>
              </div>
            </div>
          )}

          {/* Custom Tags */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Custom Metadata Tags</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {suggestedTags.filter((t) => !form.tags[t]).map((tag) => (
                <button key={tag} type="button" onClick={() => addTag(tag)} className="text-xs px-2.5 py-1 rounded-full border border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-colors">
                  + {tag}
                </button>
              ))}
            </div>
            {Object.entries(form.tags).map(([key, val]) => (
              <div key={key} className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-muted-foreground w-28 shrink-0">{key}</span>
                <input
                  value={val}
                  onChange={(e) => updateField("tags", { ...form.tags, [key]: e.target.value })}
                  placeholder={`Enter ${key.toLowerCase()}`}
                  className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button type="button" onClick={() => removeTag(key)} className="text-destructive hover:text-destructive/80">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input value={newTagKey} onChange={(e) => setNewTagKey(e.target.value)} placeholder="Add custom tag name..." className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <button type="button" onClick={() => addTag(newTagKey)} disabled={!newTagKey} className="px-3 h-9 rounded-lg bg-muted text-foreground text-xs font-medium hover:bg-border transition-colors disabled:opacity-40">
                Add
              </button>
            </div>
          </div>

          {/* Batches */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Batches / Pricing</p>
              <button type="button" onClick={addBatch} className="flex items-center gap-1 text-xs text-primary font-semibold hover:opacity-80">
                <Plus className="w-3 h-3" /> Add Batch
              </button>
            </div>
            {form.batches.map((batch, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-border bg-muted/30 mb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground">Batch {idx + 1}</span>
                  {form.batches.length > 1 && (
                    <button type="button" onClick={() => removeBatch(idx)} className="text-destructive hover:opacity-80">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-5 gap-2">
                  <input value={batch.batchNumber} onChange={(e) => updateBatch(idx, "batchNumber", e.target.value)} placeholder="Batch #" className="h-9 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <input type="number" value={batch.costPrice} onChange={(e) => updateBatch(idx, "costPrice", e.target.value)} placeholder="Cost" className="h-9 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <input type="number" value={batch.mrp} onChange={(e) => updateBatch(idx, "mrp", e.target.value)} placeholder="MRP" className="h-9 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <input type="number" value={batch.stock} onChange={(e) => updateBatch(idx, "stock", e.target.value)} placeholder="Stock" className="h-9 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <input type="date" value={batch.expiryDate} onChange={(e) => updateBatch(idx, "expiryDate", e.target.value)} className="h-9 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
            ))}
          </div>

          {/* Submit */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-2">
            <button type="button" onClick={onClose} className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
              {isEditing ? "Update Product" : "Save Product"}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
