import { useState } from "react";
import {
  X,
  Sparkles,
  Percent,
  Gift,
  Tag,
  Calendar,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { ItemOffer } from "@/types/inventory";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CreateOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  onSaveOffer?: (offer: ItemOffer) => void;
}

export function CreateOfferModal({
  isOpen,
  onClose,
  categories,
  onSaveOffer,
}: CreateOfferModalProps) {
  const [title, setTitle] = useState("");
  const [offerType, setOfferType] = useState<"percentage" | "flat" | "bogo" | "bundle">("percentage");
  const [discountValue, setDiscountValue] = useState("10");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [minOrderValue, setMinOrderValue] = useState("500");
  const [couponCode, setCouponCode] = useState("FESTIVE10");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter an Offer Title.");
      return;
    }

    const offer: ItemOffer = {
      id: `offer-${Date.now()}`,
      title: title.trim(),
      offerType,
      discountValue: parseFloat(discountValue) || 0,
      appliedCategories: selectedCategory === "all" ? categories : [selectedCategory],
      appliedProductIds: [],
      minOrderValue: parseFloat(minOrderValue) || 0,
      startDate,
      endDate,
      couponCode: couponCode.trim().toUpperCase() || undefined,
      isActive: true,
      created_at: new Date().toISOString(),
    };

    if (onSaveOffer) onSaveOffer(offer);
    toast.success(`Promotional Offer "${offer.title}" launched successfully!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Launch Promotional Offer</h2>
              <p className="text-xs text-muted-foreground">
                Set up discounts, BOGO deals, and seasonal discounts for your products
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          <div className="space-y-1.5">
            <Label htmlFor="offer-title" className="text-xs font-semibold">
              Offer / Campaign Title *
            </Label>
            <Input
              id="offer-title"
              placeholder="e.g. Weekend Mega Grocery Sale 15% OFF"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Offer Type */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Offer Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "percentage", label: "Percentage %", icon: Percent },
                { id: "flat", label: "Flat ₹ OFF", icon: Tag },
                { id: "bogo", label: "Buy 1 Get 1 (BOGO)", icon: Gift },
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setOfferType(t.id as any)}
                    className={cn(
                      "p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5",
                      offerType === t.id
                        ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Discount Value & Coupon */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="discount-val" className="text-xs font-semibold">
                {offerType === "percentage" ? "Discount Percentage (%)" : "Discount Amount (₹)"}
              </Label>
              <Input
                id="discount-val"
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                min="1"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="coupon-code" className="text-xs font-semibold">
                Coupon Code
              </Label>
              <Input
                id="coupon-code"
                placeholder="e.g. SAVE10"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="uppercase font-mono"
              />
            </div>
          </div>

          {/* Applicable Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Applicable Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Product Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="min-order" className="text-xs font-semibold">
                Min. Order Amount (₹)
              </Label>
              <Input
                id="min-order"
                type="number"
                value={minOrderValue}
                onChange={(e) => setMinOrderValue(e.target.value)}
              />
            </div>
          </div>

          {/* Date Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="start-date" className="text-xs font-semibold">
                Start Date
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end-date" className="text-xs font-semibold">
                End Date
              </Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              <Zap className="w-4 h-4" />
              Launch Offer Now
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
