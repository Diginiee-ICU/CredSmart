import { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  ScanBarcode,
  X,
  Plus,
  Minus,
  Check,
  Package,
  Layers,
  Sparkles,
  Barcode,
  Tag,
  ArrowUpDown,
  CornerDownLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DocumentLineItem } from "@/types/documents";

export interface BillItemOption {
  id: string;
  name: string;
  category?: string;
  barcode?: string | null;
  sku?: string;
  hsn?: string;
  unit: string;
  sellingPrice: number;
  costPrice?: number;
  gstRate: number;
  stock: number;
  batchNumber?: string;
}

interface AddItemsToBillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: BillItemOption[];
  onAddSelectedItems: (items: DocumentLineItem[]) => void;
  priceMode?: "sales" | "purchase";
  onOpenCreateItem?: () => void;
}

export function AddItemsToBillModal({
  open,
  onOpenChange,
  items,
  onAddSelectedItems,
  priceMode = "sales",
  onOpenCreateItem,
}: AddItemsToBillModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [selectedItemQuantities, setSelectedItemQuantities] = useState<Record<string, number>>({});
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Extract distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.category && it.category.trim()) {
        set.add(it.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [items]);

  // Reset state when opening modal
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setSelectedCategory("all");
      setSelectedIndex(0);
      setSelectedItemQuantities({});
      setShowOnlySelected(false);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Filter items based on search query and category
  const filteredItems = useMemo(() => {
    let result = items;

    if (showOnlySelected) {
      return result.filter((it) => (selectedItemQuantities[it.id] || 0) > 0);
    }

    if (selectedCategory !== "all") {
      result = result.filter(
        (it) => (it.category || "").toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          (it.sku && it.sku.toLowerCase().includes(q)) ||
          (it.barcode && it.barcode.toLowerCase().includes(q)) ||
          (it.hsn && it.hsn.toLowerCase().includes(q)) ||
          (it.category && it.category.toLowerCase().includes(q))
      );
    }

    return result;
  }, [items, searchQuery, selectedCategory, selectedItemQuantities, showOnlySelected]);

  // Total selected count & amount
  const { totalSelectedCount, totalSelectedAmount } = useMemo(() => {
    let count = 0;
    let amount = 0;
    Object.entries(selectedItemQuantities).forEach(([itemId, qty]) => {
      if (qty > 0) {
        count += qty;
        const itemObj = items.find((i) => i.id === itemId);
        if (itemObj) {
          const rate = priceMode === "purchase" ? itemObj.costPrice || 0 : itemObj.sellingPrice;
          amount += rate * qty;
        }
      }
    });
    return {
      totalSelectedCount: count,
      totalSelectedAmount: amount,
    };
  }, [selectedItemQuantities, items, priceMode]);

  const distinctSelectedItemsCount = useMemo(() => {
    return Object.values(selectedItemQuantities).filter((q) => q > 0).length;
  }, [selectedItemQuantities]);

  const handleToggleItem = (item: BillItemOption) => {
    setSelectedItemQuantities((prev) => {
      const current = prev[item.id] || 0;
      if (current > 0) {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      } else {
        return { ...prev, [item.id]: 1 };
      }
    });
  };

  const handleSetQuantity = (itemId: string, qty: number) => {
    setSelectedItemQuantities((prev) => {
      if (qty <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: qty };
    });
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, Math.max(0, filteredItems.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleToggleItem(filteredItems[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      onOpenChange(false);
    }
  };

  // Confirm and inject into bill
  const handleConfirmAdd = () => {
    const lineItemsToAdd: DocumentLineItem[] = [];

    Object.entries(selectedItemQuantities).forEach(([itemId, qty]) => {
      if (qty > 0) {
        const product = items.find((i) => i.id === itemId);
        if (product) {
          const rate = priceMode === "purchase" ? product.costPrice || 0 : product.sellingPrice;
          const gstRate = product.gstRate || 18;
          const taxable = rate * qty;
          const taxAmt = (taxable * gstRate) / 100;
          const total = taxable + taxAmt;

          lineItemsToAdd.push({
            id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            productId: product.id,
            productName: product.name,
            hsn: product.hsn || "",
            barcode: product.barcode || undefined,
            quantity: qty,
            unit: product.unit || "Pcs",
            rate: rate,
            discountPercent: 0,
            discountAmount: 0,
            taxRate: gstRate,
            taxableAmount: Number(taxable.toFixed(2)),
            cgstAmount: Number((taxAmt / 2).toFixed(2)),
            sgstAmount: Number((taxAmt / 2).toFixed(2)),
            igstAmount: 0,
            lineTotal: Number(total.toFixed(2)),
          });
        }
      }
    });

    if (lineItemsToAdd.length > 0) {
      onAddSelectedItems(lineItemsToAdd);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onKeyDown={handleKeyDown}
        className="bill-items-modal w-[80vw] max-w-3xl max-h-[68vh] p-0 rounded-none flex flex-col gap-0 overflow-hidden bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 shadow-2xl"
      >
        {/* ───────────────────────────────────────────────────────────── */}
        {/* MODAL HEADER */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="hidden w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {priceMode === "purchase" ? "Add Items to Purchase Bill" : "Add Items to Bill"}
              </DialogTitle>
              <DialogDescription className="hidden text-xs text-muted-foreground mt-0.5">
                Search, batch-select catalog items, or scan barcodes to add directly
              </DialogDescription>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* SEARCH & CATEGORY FILTER BAR */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="p-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center gap-2">
          {/* Main Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search by Item/ Serial no./ HSN code/ SKU/ Custom Field / Category"
              className="h-8 pl-9 pr-10 text-[11px] sm:text-xs bg-white dark:bg-slate-800/40 border-primary/40 rounded-md focus-visible:ring-primary"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <ScanBarcode className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* Category Dropdown & Create Item Action */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <div className="w-full sm:w-48">
              <Select
                value={selectedCategory}
                onValueChange={(val) => {
                  setSelectedCategory(val);
                  setSelectedIndex(0);
                }}
              >
                <SelectTrigger className="h-8 text-[11px] font-medium rounded-md bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {onOpenCreateItem && (
              <button
                type="button"
                onClick={onOpenCreateItem}
                className="h-8 px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1.5 transition-all shrink-0 active:scale-95 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden sm:inline">+ Create Item</span>
                <span className="sm:hidden">+ Item</span>
              </button>
            )}
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* ITEMS LIST TABLE (Matching User Reference Image) */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div
          ref={listContainerRef}
          className="flex-1 overflow-y-auto min-h-0 scrollbar-thin bg-white dark:bg-slate-950"
        >
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-100/90 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300">
              <tr>
                <th className="py-2 px-3 min-w-[260px] font-semibold text-slate-800 dark:text-slate-200">Item Name</th>
                <th className="py-2 px-3 w-24 text-center font-semibold text-slate-800 dark:text-slate-200">Item Code</th>
                <th className="py-2 px-3 w-28 text-right font-semibold text-slate-800 dark:text-slate-200">Stock</th>
                <th className="py-2 px-3 w-28 text-right font-semibold text-slate-800 dark:text-slate-200">
                  {priceMode === "purchase" ? "Purchase Price" : "Sales Price"}
                </th>
                <th className="py-2 px-3 w-24 text-center font-semibold text-slate-800 dark:text-slate-200">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredItems.map((item, idx) => {
                const isSelected = (selectedItemQuantities[item.id] || 0) > 0;
                const isHighlighted = selectedIndex === idx;
                const qty = selectedItemQuantities[item.id] || 0;
                const price = priceMode === "purchase" ? item.costPrice || 0 : item.sellingPrice;

                return (
                  <tr
                    key={item.id}
                    onClick={() => {
                      setSelectedIndex(idx);
                      handleToggleItem(item);
                    }}
                    className={cn(
                      "cursor-pointer transition-colors select-none",
                      isSelected
                        ? "bg-primary/5 dark:bg-primary/15 hover:bg-primary/10"
                        : isHighlighted
                        ? "bg-slate-50 dark:bg-slate-850"
                        : "hover:bg-slate-50/80 dark:hover:bg-slate-900"
                    )}
                  >
                    {/* Item Name */}
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">
                        {item.name}
                      </div>
                      {item.category && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {item.category} {item.hsn ? `• HSN: ${item.hsn}` : ""}
                        </div>
                      )}
                    </td>

                    {/* Item Code */}
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500 text-xs">
                      {item.sku || item.barcode || "-"}
                    </td>

                    {/* Stock */}
                    <td className="py-2.5 px-3 text-right font-mono">
                      <span
                        className={cn(
                          "font-semibold text-xs",
                          item.stock <= 0
                            ? "text-rose-600 dark:text-rose-400"
                            : item.stock < 10
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-slate-700 dark:text-slate-300"
                        )}
                      >
                        {item.stock.toLocaleString("en-IN")}{" "}
                        <span className="text-[10px] uppercase font-normal">{item.unit || "PCS"}</span>
                      </span>
                    </td>

                    {/* Sales Price */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                      ₹ {price.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </td>

                    {/* Action / Quantity Counter */}
                    <td
                      className="py-2.5 px-3 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isSelected ? (
                        <div className="inline-flex items-center border border-primary/50 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleSetQuantity(item.id, qty - 1)}
                            className="w-6 h-6 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={qty}
                            onChange={(e) =>
                              handleSetQuantity(item.id, Math.max(1, parseInt(e.target.value, 10) || 1))
                            }
                            className="w-8 h-6 text-center font-mono font-bold text-xs bg-transparent border-x border-primary/30 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSetQuantity(item.id, qty + 1)}
                            className="w-6 h-6 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleItem(item)}
                          className="px-3 py-1 text-[11px] font-bold text-primary hover:bg-primary/10 rounded-lg border border-primary/30 transition-all active:scale-95 cursor-pointer"
                        >
                          + Select
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground space-y-3">
                    <Package className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        No items matching "{searchQuery}"
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Try searching by barcode, SKU, category, or add a new item
                      </p>
                    </div>
                    {onOpenCreateItem && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          onOpenChange(false);
                          onOpenCreateItem();
                        }}
                        className="text-xs font-bold gap-1.5 bg-primary text-primary-foreground"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        + Create New Item
                      </Button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* SELECTION SUMMARY STRIP */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="px-5 py-2.5 bg-slate-100/90 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold">
          <button
            type="button"
            onClick={() => setShowOnlySelected((prev) => !prev)}
            className="text-primary hover:underline font-bold flex items-center gap-1.5"
          >
            {showOnlySelected ? "Show All Items" : `Show ${distinctSelectedItemsCount} Item(s) Selected`}
          </button>

          <div className="font-mono text-sm font-bold text-slate-900 dark:text-white">
            ₹ {totalSelectedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* MODAL FOOTER */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-950">
          {/* Keyboard Shortcuts Hint */}
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
            <span>Keyboard Shortcuts :</span>
            <span className="flex items-center gap-1">
              Change Quantity <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border text-[10px]">Enter</kbd>
            </span>
            <span className="flex items-center gap-1">
              Move between Items <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border text-[10px]">↑</kbd> <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border text-[10px]">↓</kbd>
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 ml-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs font-semibold"
            >
              Cancel [ESC]
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={distinctSelectedItemsCount === 0}
              onClick={handleConfirmAdd}
              className="text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              Add to Bill ({distinctSelectedItemsCount})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
