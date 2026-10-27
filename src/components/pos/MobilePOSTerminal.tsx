import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  Search,
  X,
  Camera,
  Mic,
  MicOff,
  Package,
} from "lucide-react";
import { Product, Batch } from "@/types/pos";
import { BillingTab } from "@/pages/POSBilling";
import { MobileProductCard } from "./MobileProductCard";
import { MobileCartDock } from "./MobileCartDock";
import { MobileCheckoutDrawer } from "./MobileCheckoutDrawer";
import { cn } from "@/lib/utils";

export interface MobilePOSTerminalProps {
  products: Product[];
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currentTab: BillingTab;
  updateCurrentTab: (updater: (tab: BillingTab) => BillingTab) => void;
  onAddProduct: (product: Product, customBatch?: Batch) => void;
  onRemoveItem: (index: number) => void;
  grandTotal: number;
  subTotal: number;
  taxAmount: number;
  itemDiscountsTotal: number;
  billDiscountAmount: number;
  totalItemsCount: number;
  receivedNum: number;
  changeDue: number;
  balanceRemaining: number;
  onSaveBill: (shouldPrint?: boolean, shouldWhatsApp?: boolean) => Promise<void>;
  isProcessingSave: boolean;
  onExitPOS: () => void;
  onOpenCustomerModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenReturnModal: () => void;
  onOpenCameraScanner: () => void;
  isListening: boolean;
  onToggleVoice: () => void;
  org?: { id?: string; name?: string; logo_url?: string } | null;
  settings?: { storeName?: string; upiId?: string; defaultPaymentMode?: string };
}

export const MobilePOSTerminal: React.FC<MobilePOSTerminalProps> = ({
  products,
  categories,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  currentTab,
  updateCurrentTab,
  onAddProduct,
  onRemoveItem,
  grandTotal,
  subTotal,
  taxAmount,
  itemDiscountsTotal,
  billDiscountAmount,
  totalItemsCount,
  receivedNum,
  changeDue,
  onSaveBill,
  isProcessingSave,
  onExitPOS,
  onOpenCustomerModal,
  onOpenCameraScanner,
  isListening,
  onToggleVoice,
  org,
  settings,
}) => {
  const [isCheckoutDrawerOpen, setIsCheckoutDrawerOpen] = useState(false);

  // Compute category list with "All" fallback
  const categoryChips = useMemo(() => {
    if (categories && categories.length > 0) {
      return categories.includes("All") ? categories : ["All", ...categories];
    }
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["All", ...Array.from(set)];
  }, [categories, products]);

  // Filter products by category and search query
  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === "All" || !selectedCategory || p.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!query) return true;

      const nameMatch = p.name ? p.name.toLowerCase().includes(query) : false;
      const barcodeMatch = p.barcode ? p.barcode.toLowerCase().includes(query) : false;
      const skuMatch = p.sku ? p.sku.toLowerCase().includes(query) : false;
      const brandMatch = p.brand ? p.brand.toLowerCase().includes(query) : false;
      const catMatch = p.category ? p.category.toLowerCase().includes(query) : false;

      return nameMatch || barcodeMatch || skuMatch || brandMatch || catMatch;
    });
  }, [products, searchQuery, selectedCategory]);

  // Helper: Get total quantity of a product currently in the cart
  const getProductCartQty = (productId: string) => {
    return currentTab.items
      .filter((item) => item.product.id === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  // 1-Tap Quantity Stepper Handlers
  const handleIncrement = (product: Product) => {
    const existingIdx = currentTab.items.findIndex(
      (item) => item.product.id === product.id
    );
    if (existingIdx >= 0) {
      updateCurrentTab((tab) => ({
        ...tab,
        items: tab.items.map((it, idx) =>
          idx === existingIdx ? { ...it, quantity: it.quantity + 1 } : it
        ),
      }));
    } else {
      onAddProduct(product);
    }
  };

  const handleDecrement = (product: Product) => {
    const existingIdx = currentTab.items.findIndex(
      (item) => item.product.id === product.id
    );
    if (existingIdx >= 0) {
      const currentQty = currentTab.items[existingIdx].quantity;
      if (currentQty <= 1) {
        onRemoveItem(existingIdx);
      } else {
        updateCurrentTab((tab) => ({
          ...tab,
          items: tab.items.map((it, idx) =>
            idx === existingIdx ? { ...it, quantity: it.quantity - 1 } : it
          ),
        }));
      }
    }
  };

  return (
    <div
      data-testid="mobile-pos-terminal-container"
      className="flex flex-col w-full h-full min-h-0 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans overflow-hidden relative select-none"
    >
      {/* 1. STICKY TOP BAR (48px / h-12) */}
      <header
        data-testid="mobile-pos-top-bar"
        className="h-12 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-2.5 flex items-center justify-between gap-2 shrink-0 z-30 shadow-xs"
      >
        {/* Back to Dashboard Button */}
        <button
          type="button"
          data-testid="mobile-pos-back-btn"
          onClick={onExitPOS}
          className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center shrink-0 active:scale-95 transition-all cursor-pointer shadow-2xs"
          title="Back to Dashboard"
          aria-label="Back to Dashboard"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Live Search Input with Clear Button */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            data-testid="mobile-pos-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items, barcode, SKU..."
            className="w-full h-8 pl-8 pr-7 rounded-lg border border-slate-200/90 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-colors"
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              data-testid="mobile-pos-clear-search-btn"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action Controls: Barcode Scanner & Voice */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick Camera Barcode Scan Trigger */}
          <button
            type="button"
            data-testid="mobile-pos-scan-barcode-btn"
            onClick={onOpenCameraScanner}
            className="w-8 h-8 rounded-lg border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-2xs"
            title="Scan Barcode via Camera"
            aria-label="Scan Barcode via Camera"
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* Voice Assistant Trigger */}
          <button
            type="button"
            data-testid="mobile-pos-voice-btn"
            onClick={onToggleVoice}
            className={cn(
              "w-8 h-8 rounded-lg border flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-2xs",
              isListening
                ? "bg-rose-50 border-rose-300 text-rose-600 animate-pulse"
                : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
            )}
            title={isListening ? "Stop Voice Assistant" : "Start Voice Assistant"}
            aria-label="Voice Assistant"
          >
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 opacity-70" />}
          </button>
        </div>
      </header>

      {/* 2. HORIZONTAL CATEGORY CHIPS CAROUSEL */}
      <div
        data-testid="mobile-category-carousel"
        className="shrink-0 px-3 py-2 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 overflow-x-auto scrollbar-none flex items-center gap-1.5 select-none"
      >
        {categoryChips.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              data-testid={`category-chip-${cat.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "h-7 px-3 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all active:scale-95 cursor-pointer border",
                isActive
                  ? "bg-blue-600 text-white border-blue-600 shadow-2xs font-bold"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* 3. SCROLLABLE HIGH-DENSITY PRODUCT CARDS STREAM */}
      <main
        data-testid="mobile-product-stream"
        className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 pb-24 touch-pan-y overscroll-contain"
      >
        {filteredProducts.length === 0 ? (
          <div
            data-testid="mobile-empty-products"
            className="h-48 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900"
          >
            <Package className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              No products found
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {searchQuery
                ? `No items match "${searchQuery}" in ${selectedCategory}`
                : `No items in ${selectedCategory} category`}
            </p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const qtyInCart = getProductCartQty(product.id);
            return (
              <MobileProductCard
                key={product.id}
                product={product}
                quantityInCart={qtyInCart}
                onAdd={(p) => onAddProduct(p)}
                onIncrement={handleIncrement}
                onDecrement={handleDecrement}
              />
            );
          })
        )}
      </main>

      {/* 4. FLOATING BOTTOM CART DOCK */}
      <MobileCartDock
        itemsCount={currentTab.items.length}
        totalUnits={totalItemsCount}
        grandTotal={grandTotal}
        onOpenCheckout={() => setIsCheckoutDrawerOpen(true)}
      />

      {/* 5. 1-TAP CHECKOUT BOTTOM DRAWER */}
      <MobileCheckoutDrawer
        isOpen={isCheckoutDrawerOpen}
        onClose={() => setIsCheckoutDrawerOpen(false)}
        currentTab={currentTab}
        updateCurrentTab={updateCurrentTab}
        onRemoveItem={onRemoveItem}
        onOpenCustomerModal={onOpenCustomerModal}
        grandTotal={grandTotal}
        subTotal={subTotal}
        taxAmount={taxAmount}
        itemDiscountsTotal={itemDiscountsTotal}
        billDiscountAmount={billDiscountAmount}
        receivedNum={receivedNum}
        changeDue={changeDue}
        onSaveBill={async (shouldPrint, shouldWhatsApp) => {
          await onSaveBill(shouldPrint, shouldWhatsApp);
          setIsCheckoutDrawerOpen(false);
        }}
        isProcessingSave={isProcessingSave}
        storeUpiId={settings?.upiId || ""}
        storeName={settings?.storeName || org?.name || "CredSmart POS"}
      />
    </div>
  );
};
