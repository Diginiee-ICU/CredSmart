import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { usePublicStorefront } from "@/hooks/usePublicStorefront";
import { StoreHeader } from "@/components/public-store/StoreHeader";
import { StoreCategoryBar } from "@/components/public-store/StoreCategoryBar";
import { StoreProductCard } from "@/components/public-store/StoreProductCard";
import { StoreProductModal } from "@/components/public-store/StoreProductModal";
import { StoreCartDrawer } from "@/components/public-store/StoreCartDrawer";
import { StoreOrderSuccessModal } from "@/components/public-store/StoreOrderSuccessModal";
import { SEOHead } from "@/components/public/SEOHead";
import { StorefrontProduct } from "@/types/storefront";
import { ShoppingBag, ArrowRight, Store, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PublicStorefront() {
  const { slug } = useParams<{ slug: string }>();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeModalProduct, setActiveModalProduct] = useState<StorefrontProduct | null>(null);

  const {
    store,
    products,
    loading,
    notFound,
    categories,
    filteredProducts,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    cart,
    cartCount,
    cartSubtotal,
    deliveryCharge,
    grandTotal,
    isCartOpen,
    setIsCartOpen,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    checkoutOnWhatsApp,
    isSubmitting,
    lastPlacedOrder,
    setLastPlacedOrder,
  } = usePublicStorefront(slug || "");

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-[#FF6A00] animate-bounce">
            <Store className="w-6 h-6" />
          </div>
          <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-500 to-amber-500 w-1/2 rounded-full animate-ping" />
          </div>
          <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
            Loading Storefront...
          </p>
        </div>
      </div>
    );
  }

  // Not found fallback
  if (notFound || !store) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4 border border-slate-200">
          <Store className="w-10 h-10 stroke-[1.2]" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Store Not Found</h1>
        <p className="text-sm text-slate-500 max-w-sm mt-1.5 mb-6">
          The digital catalogue or store link you followed does not exist, or has been temporarily taken offline by the merchant.
        </p>
        <Link to="/">
          <Button className="rounded-xl bg-[#FF6A00] hover:bg-[#E65F00] text-white font-semibold text-xs px-5 h-10 shadow-md">
            Go to CredSmart Homepage
          </Button>
        </Link>
      </div>
    );
  }

  const accentColor = store.theme_color || "#FF6A00";

  // Quantity helper
  const getProductCartQty = (productId: string) => {
    const item = cart.find((c) => c.product.id === productId);
    return item ? item.quantity : 0;
  };

  const seoTitle = `${store.store_name} | Online Catalogue & Storefront`;
  const seoDescription =
    store.tagline ||
    store.description ||
    `Browse products and order directly on WhatsApp from ${store.store_name}. Fast delivery, verified pricing, and simple ordering.`;

  return (
    <div className="min-h-screen bg-slate-50/70 pb-28 sm:pb-16 flex flex-col">
      {/* Dynamic SEO & Social Graph for WhatsApp Previews */}
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        ogImage={store.logo_url || store.banner_url}
        canonicalUrl={`/store/${store.slug}`}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: store.store_name,
          description: store.description,
          telephone: store.contact_phone || store.whatsapp_number,
          address: {
            "@type": "PostalAddress",
            streetAddress: store.address,
            addressLocality: store.city,
            addressRegion: store.state,
            postalCode: store.pincode,
            addressCountry: "IN",
          },
        }}
      />

      {/* Store Header */}
      <StoreHeader store={store} />

      {/* Sticky Category & Search Bar */}
      <StoreCategoryBar
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        themeColor={accentColor}
      />

      {/* Product Catalog Grid / List */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full">
        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center text-slate-400">
            <Search className="w-12 h-12 stroke-[1.2] mb-3 text-slate-300" />
            <h3 className="text-base font-semibold text-slate-700">No items found</h3>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              {searchQuery
                ? `No products matched "${searchQuery}". Try a different keyword.`
                : "No products available in this category right now."}
            </p>
            {(searchQuery || selectedCategory !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="mt-4 rounded-xl text-xs"
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3.5 sm:gap-5"
                : "flex flex-col gap-2.5 max-w-3xl mx-auto"
            }
          >
            {filteredProducts.map((product) => (
              <StoreProductCard
                key={product.id}
                product={product}
                cartQuantity={getProductCartQty(product.id)}
                onAddToCart={addToCart}
                onUpdateQuantity={updateQuantity}
                onOpenDetails={setActiveModalProduct}
                viewMode={viewMode}
                themeColor={accentColor}
              />
            ))}
          </div>
        )}
      </main>

      {/* Sticky Bottom Floating Bag Button (Mobile & Desktop) */}
      {cartCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-40 max-w-md sm:max-w-xs mx-auto animate-in slide-in-from-bottom duration-200">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full h-13 sm:h-12 rounded-2xl text-white font-bold text-sm shadow-xl flex items-center justify-between px-4 sm:px-4.5 hover:opacity-95 transition backdrop-blur-xs"
            style={{ backgroundColor: accentColor }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-black/15 flex items-center justify-center font-black text-xs">
                {cartCount}
              </div>
              <div className="text-left">
                <span className="text-[11px] font-normal block leading-none text-white/80">
                  Total
                </span>
                <span className="text-base font-extrabold leading-tight block">
                  ₹{grandTotal}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-white/20 hover:bg-white/25 px-3 py-1.5 rounded-xl">
              <span>View Bag</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}

      {/* Product Detail Modal */}
      <StoreProductModal
        product={activeModalProduct}
        isOpen={!!activeModalProduct}
        onClose={() => setActiveModalProduct(null)}
        cartQuantity={activeModalProduct ? getProductCartQty(activeModalProduct.id) : 0}
        onAddToCart={addToCart}
        onUpdateQuantity={updateQuantity}
        store={store}
      />

      {/* Cart & WhatsApp Checkout Drawer */}
      <StoreCartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        cartSubtotal={cartSubtotal}
        deliveryCharge={deliveryCharge}
        grandTotal={grandTotal}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
        onClearCart={clearCart}
        onCheckout={checkoutOnWhatsApp}
        isSubmitting={isSubmitting}
        store={store}
      />

      {/* Order Placed Success Modal */}
      <StoreOrderSuccessModal
        orderInfo={lastPlacedOrder}
        onClose={() => setLastPlacedOrder(null)}
        storeName={store.store_name}
      />

      {/* Store Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5 font-semibold text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Powered by CredSmart Digital Storefront</span>
          </div>
          <p className="text-[11px] text-slate-400">
            &copy; {new Date().getFullYear()} {store.store_name}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
