import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Plus, Layers } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { productsApi } from "@/services/productsApi";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ItemImageUpload } from "./ItemImageUpload";

export interface CreatedProductResult {
  id: string;
  name: string;
  barcode?: string;
  sku: string;
  imageUrl?: string;
  unit: string;
  altUnit?: string;
  altUnitConversion?: number;
  sellingPrice: number;
  purchasePrice: number;
  purchaseTaxType?: "exclusive" | "inclusive";
  taxType?: "exclusive" | "inclusive";
  taxRate: number;
  hsn: string;
  category: string;
  stock: number;
  batchNumber?: string;
}

interface QuickCreateItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  initialName?: string;
  priceMode?: "sales" | "purchase";
  onItemCreated: (product: CreatedProductResult) => void;
}

const COMMON_CATEGORIES = [
  "General",
  "Groceries & Staples",
  "Dairy & Bakery",
  "Snacks & Packaged Food",
  "Beverages",
  "Personal Care",
  "Pharmacy & Health",
  "Hardware & Tools",
  "Apparel & Textiles",
  "Electronics",
];

const UNIT_OPTIONS = [
  "PCS",
  "KG",
  "LTR",
  "BOX",
  "NOS",
  "PKT",
  "MTR",
  "DOZ",
  "BAG",
  "CAN",
  "BTL",
  "SET",
  "GM",
  "ML",
  "STEPS",
];

const GST_RATES = [0, 5, 12, 18, 28];

export function QuickCreateItemModal({
  open,
  onOpenChange,
  orgId,
  initialName = "",
  priceMode = "sales",
  onItemCreated,
}: QuickCreateItemModalProps) {
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState("General");
  const [unit, setUnit] = useState("PCS");
  const [enableAltUnit, setEnableAltUnit] = useState(false);
  const [altUnit, setAltUnit] = useState("PKT");
  const [altUnitConversion, setAltUnitConversion] = useState("4");
  const [sellingPrice, setSellingPrice] = useState<number | "">("");
  const [purchasePrice, setPurchasePrice] = useState<number | "">("");
  const [purchaseTaxType, setPurchaseTaxType] = useState<"exclusive" | "inclusive">("exclusive");
  const [mrp, setMrp] = useState<number | "">("");
  const [gstRate, setGstRate] = useState<number>(18);
  const [hsn, setHsn] = useState("");
  const [openingStock, setOpeningStock] = useState<number | "">(10);
  const [barcode, setBarcode] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setCategory("General");
      setUnit("PCS");
      setEnableAltUnit(false);
      setAltUnit("PKT");
      setAltUnitConversion("4");
      setSellingPrice("");
      setPurchasePrice("");
      setPurchaseTaxType("exclusive");
      setMrp("");
      setGstRate(18);
      setHsn("");
      setOpeningStock(10);
      setBarcode("");
      setImageUrl("");
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 120);
    }
  }, [open, initialName]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter the item name");
      return;
    }

    if (!orgId) {
      toast.error("No active organization found");
      return;
    }

    const sp = Number(sellingPrice) || 0;
    const pp = Number(purchasePrice) || 0;
    const itemMrp = Number(mrp) || sp || pp || 0;
    const stockQty = Number(openingStock) || 0;
    const generatedSku = `SKU-${Date.now().toString(36).toUpperCase()}`;
    const normalizedHsn = (hsn || "").trim();

    const convFactor = enableAltUnit ? (parseFloat(altUnitConversion) || 1) : undefined;
    const resolvedAltUnit = enableAltUnit && altUnit && altUnit !== unit ? altUnit : undefined;
    const finalAltConv = resolvedAltUnit && convFactor && convFactor > 1 ? convFactor : undefined;

    setSaving(true);
    try {
      // Build tags payload to align with DB schema (pricing belongs to tags/product_batches)
      const tagsPayload = {
        unit: unit.toUpperCase(),
        alt_unit: resolvedAltUnit,
        alt_unit_conversion: finalAltConv,
        gst_rate: gstRate,
        hsn_code: normalizedHsn,
        selling_price: sp,
        purchase_price: pp,
        purchase_tax_type: purchaseTaxType,
        mrp: itemMrp,
        min_stock_alert: 5,
        image_url: imageUrl.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
      };

      // 1. Insert product record (pricing will be stored in tags and batches)
      const { data: newProd, error: prodErr } = await productsApi.createProduct(
        {
          organization_id: orgId,
          name: name.trim(),
          brand: null,
          category: category.trim() || "General",
          barcode: barcode.trim() || null,
          sku: generatedSku,
          image_url: imageUrl.trim() || null,
          tags: tagsPayload,
        },
        orgId
      );

      if (prodErr) throw new Error(prodErr.message);

      // 2. Insert batch / opening inventory
      const batchNumber = "BATCH-01";
      if (!newProd) {
        throw new Error("The item was not created. Please try again.");
      }

      const { error: batchErr } = await productsApi.createBatch(
        {
          product_id: newProd.id,
          batch_number: batchNumber,
          cost_price: pp,
          mrp: itemMrp,
          stock: stockQty,
        },
        orgId
      );

      if (batchErr) {
        throw new Error(`Item created, but inventory stock could not be added: ${batchErr.message}`);
      }

      toast.success(`Item "${name}" created and added to inventory!`);

      // 3. Trigger callback with newly created product
      onItemCreated({
        id: newProd.id,
        name: newProd.name,
        barcode: newProd.barcode || undefined,
        sku: newProd.sku,
        imageUrl: imageUrl.trim() || undefined,
        unit: unit.toUpperCase(),
        altUnit: resolvedAltUnit,
        altUnitConversion: finalAltConv,
        sellingPrice: sp,
        purchasePrice: pp,
        purchaseTaxType,
        taxType: purchaseTaxType,
        taxRate: gstRate,
        hsn: normalizedHsn,
        category: newProd.category || category,
        stock: stockQty,
        batchNumber,
      });

      onOpenChange(false);
    } catch (err: unknown) {
      console.error("Error creating item:", err);
      const msg = err instanceof Error ? err.message : typeof err === "string" ? err : "Failed to create item";
      if (msg && /schema|relation|could not find|does not exist|PGRST202/i.test(msg)) {
        // Fallback to local creation to avoid blocking POS usage when DB schema is missing
        const fallbackId = `item-local-${Date.now()}`;
        const fallbackProduct = {
          id: fallbackId,
          name: name.trim(),
          barcode: barcode.trim() || undefined,
          sku: generatedSku,
          imageUrl: imageUrl.trim() || undefined,
          unit: unit.toUpperCase(),
          altUnit: resolvedAltUnit,
          altUnitConversion: finalAltConv,
          sellingPrice: sp,
          purchasePrice: pp,
          taxRate: gstRate,
          hsn: normalizedHsn,
          category: category.trim() || "General",
          stock: stockQty,
          batchNumber,
        };
        toast.warning(
          "Database schema not found — item created locally. Ensure Supabase schema/tables exist and that migrations/RLS are applied. See SUPABASE_VERCEL_INTEGRATION.md in the project root for guidance."
        );
        onItemCreated(fallbackProduct);
        onOpenChange(false);
      } else {
        toast.error(msg || "Failed to create item");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-modal w-[calc(100vw-1rem)] max-w-md sm:max-w-lg h-[calc(100dvh-1rem)] sm:h-auto max-h-[85dvh] sm:max-h-[94vh] p-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        <form onSubmit={handleSave} className="flex h-full min-h-0 flex-col">
          <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                  Add New Item &amp; Inventory
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Instantly creates the product in your catalog and inserts it into this invoice.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
            {/* Item Name */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Item / Product Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                ref={nameInputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Basmati Rice 5kg, Parle-G 100g, Dolo 650mg"
                className="h-9 text-xs font-semibold mt-1"
                required
              />
            </div>

            {/* Item Image Upload */}
            <ItemImageUpload
              compact
              value={imageUrl}
              onChange={setImageUrl}
              label="Item Photo (Optional)"
            />

            {/* Category & Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Category
                </Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-9 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Unit of Measurement
                </Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger className="h-9 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Alternate Unit Section */}
            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Alternate Unit</span>
                  <p className="text-[10px] text-muted-foreground">e.g. 1 PKT = 4 PCS, 1 BOX = 10 PCS</p>
                </div>
                <Switch checked={enableAltUnit} onCheckedChange={setEnableAltUnit} />
              </div>

              {enableAltUnit && (
                <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Alt Unit</Label>
                      <Select value={altUnit} onValueChange={setAltUnit}>
                        <SelectTrigger className="h-8 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIT_OPTIONS.filter((u) => u !== unit).map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">{unit}s per {altUnit}</Label>
                      <Input
                        type="number"
                        min="1"
                        value={altUnitConversion}
                        onChange={(e) => setAltUnitConversion(e.target.value)}
                        placeholder="e.g. 4"
                        className="h-8 text-xs font-mono font-bold mt-1"
                      />
                    </div>
                  </div>
                  {altUnit && altUnitConversion && parseFloat(altUnitConversion) > 1 && (
                    <div className="flex items-center gap-1.5 text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 p-1.5 rounded-md">
                      <Layers className="w-3 h-3 shrink-0" />
                      <span>1 {altUnit} = {altUnitConversion} {unit}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pricing Details */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Selling Price (₹) <span className="text-rose-500">*</span>
                </Label>
                <div className="relative mt-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono">
                    ₹
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0.00"
                    className="h-9 pl-7 text-xs font-mono font-bold"
                    required={priceMode === "sales"}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Purchase Price (₹)
                  </Label>
                  <div className="inline-flex rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-0.5 text-[9px]">
                    <button
                      type="button"
                      onClick={() => setPurchaseTaxType("exclusive")}
                      className={cn(
                        "px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer",
                        purchaseTaxType === "exclusive"
                          ? "bg-white dark:bg-slate-900 text-primary shadow-xs"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      )}
                    >
                      Excl.
                    </button>
                    <button
                      type="button"
                      onClick={() => setPurchaseTaxType("inclusive")}
                      className={cn(
                        "px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer",
                        purchaseTaxType === "inclusive"
                          ? "bg-white dark:bg-slate-900 text-primary shadow-xs"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      )}
                    >
                      Incl.
                    </button>
                  </div>
                </div>
                <div className="relative mt-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono">
                    ₹
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0.00"
                    className="h-9 pl-7 text-xs font-mono font-medium"
                    required={priceMode === "purchase"}
                  />
                </div>
              </div>
            </div>

            {/* GST & HSN & Opening Stock */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  GST Rate (%)
                </Label>
                <Select
                  value={String(gstRate)}
                  onValueChange={(val) => setGstRate(Number(val))}
                >
                  <SelectTrigger className="h-9 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GST_RATES.map((r) => (
                      <SelectItem key={r} value={String(r)}>
                        {r}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  HSN / SAC
                </Label>
                <Input
                  value={hsn}
                  onChange={(e) => setHsn(e.target.value)}
                  placeholder="e.g. 2106, 0405, 8517"
                  className="h-9 text-xs font-mono mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Opening Stock
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={openingStock}
                  onChange={(e) => setOpeningStock(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="10"
                  className="h-9 text-xs font-mono font-semibold mt-1"
                />
              </div>
            </div>

            {/* Barcode / SKU */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Item Barcode / QR (Optional)
              </Label>
              <Input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan or enter barcode"
                className="h-8 text-xs font-mono mt-1"
              />
            </div>
          </div>

          <DialogFooter className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="text-xs font-bold bg-primary text-primary-foreground gap-1.5 shadow-md cursor-pointer"
            >
              {saving ? (
                <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
              <span>{saving ? "Saving to Inventory..." : "Save & Insert in Invoice"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
