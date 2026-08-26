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
import { Package, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CreatedProductResult {
  id: string;
  name: string;
  barcode?: string;
  sku: string;
  unit: string;
  sellingPrice: number;
  purchasePrice: number;
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
  const [sellingPrice, setSellingPrice] = useState<number | "">("");
  const [purchasePrice, setPurchasePrice] = useState<number | "">("");
  const [mrp, setMrp] = useState<number | "">("");
  const [gstRate, setGstRate] = useState<number>(18);
  const [hsn, setHsn] = useState("9999");
  const [openingStock, setOpeningStock] = useState<number | "">(10);
  const [barcode, setBarcode] = useState("");
  const [saving, setSaving] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setCategory("General");
      setUnit("PCS");
      setSellingPrice("");
      setPurchasePrice("");
      setMrp("");
      setGstRate(18);
      setHsn("9999");
      setOpeningStock(10);
      setBarcode("");
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
    const normalizedHsn = (hsn || "9999").trim() || "9999";

    setSaving(true);
    try {
      // Build tags payload to align with DB schema (pricing belongs to tags/product_batches)
      const tagsPayload = {
        unit: unit.toUpperCase(),
        gst_rate: gstRate,
        hsn_code: normalizedHsn,
        selling_price: sp,
        purchase_price: pp,
        mrp: itemMrp,
        min_stock_alert: 5,
      };

      // 1. Insert product record (pricing will be stored in tags and batches)
      const { data: newProd, error: prodErr } = await supabase
        .from("products")
        .insert({
          organization_id: orgId,
          name: name.trim(),
          brand: null,
          category: category.trim() || "General",
          barcode: barcode.trim() || null,
          sku: generatedSku,
          tags: tagsPayload,
        })
        .select()
        .single();

      if (prodErr) throw prodErr;

      // 2. Insert batch / opening inventory
      const batchNumber = "BATCH-01";
      if (!newProd) {
        throw new Error("The item was not created. Please try again.");
      }

      const { error: batchErr } = await supabase.from("product_batches").insert({
        product_id: newProd.id,
        batch_number: batchNumber,
        cost_price: pp,
        mrp: itemMrp,
        stock: stockQty,
      });

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
        unit: unit.toUpperCase(),
        sellingPrice: sp,
        purchasePrice: pp,
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
          unit: unit.toUpperCase(),
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
      <DialogContent className="z-modal w-[calc(100vw-1rem)] max-w-md sm:max-w-lg h-[calc(100dvh-1rem)] sm:h-auto max-h-[94vh] p-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
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
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Purchase / Cost Price (₹)
                </Label>
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
                  placeholder="9999"
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
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{saving ? "Saving to Inventory..." : "Save & Insert in Invoice"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
