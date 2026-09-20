import { useState, useEffect, useMemo, useCallback } from "react";
import { StorefrontSettings, StorefrontProduct, StorefrontCartItem, StorefrontOrderItem } from "@/types/storefront";
import {
  getPublicStorefrontData,
  submitStorefrontOrder,
  buildWhatsAppOrderMessage,
} from "@/services/storefrontService";
import { toast } from "sonner";

export function usePublicStorefront(slug: string) {
  const [store, setStore] = useState<StorefrontSettings | null>(null);
  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Cart state
  const [cart, setCart] = useState<StorefrontCartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<{ orderNumber: string; whatsappUrl: string } | null>(null);

  // Load public store data
  useEffect(() => {
    let isMounted = true;
    if (!slug) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    setLoading(true);
    setNotFound(false);

    getPublicStorefrontData(slug)
      .then(({ store: loadedStore, products: loadedProducts }) => {
        if (!isMounted) return;
        if (!loadedStore) {
          setNotFound(true);
          setStore(null);
          setProducts([]);
        } else {
          setStore(loadedStore);
          setProducts(loadedProducts);
          setNotFound(false);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Public store error:", err);
        setNotFound(true);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Derive categories with counts
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      const cat = p.category?.trim() || "General";
      map.set(cat, (map.get(cat) || 0) + 1);
    });

    const list = Array.from(map.entries()).map(([name, count]) => ({
      name,
      count,
    }));

    return [{ name: "all", label: "All Items", count: products.length }, ...list];
  }, [products]);

  // Filtered products based on search and category
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const matchCategory =
        selectedCategory === "all" ||
        (p.category || "General").toLowerCase() === selectedCategory.toLowerCase();

      if (!matchCategory) return false;

      if (!q) return true;

      const nameMatch = p.name.toLowerCase().includes(q);
      const brandMatch = p.brand?.toLowerCase().includes(q) || false;
      const skuMatch = p.sku?.toLowerCase().includes(q) || false;

      return nameMatch || brandMatch || skuMatch;
    });
  }, [products, searchQuery, selectedCategory]);

  // Cart operations
  const addToCart = useCallback((product: StorefrontProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast.success(`Added ${product.name} to bag`);
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setCart((prev) => {
      if (quantity <= 0) {
        return prev.filter((item) => item.product.id !== productId);
      }
      return prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      );
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // Cart Calculations
  const cartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0);
  }, [cart]);

  const deliveryCharge = useMemo(() => {
    if (!store) return 0;
    const minFree = store.free_delivery_above || 0;
    if (minFree > 0 && cartSubtotal >= minFree) return 0;
    return store.delivery_charges || 0;
  }, [store, cartSubtotal]);

  const grandTotal = useMemo(() => {
    return cartSubtotal + deliveryCharge;
  }, [cartSubtotal, deliveryCharge]);

  // Checkout via WhatsApp
  const checkoutOnWhatsApp = useCallback(
    async (details: {
      customerName: string;
      customerPhone: string;
      customerAddress?: string;
      deliveryType: "home_delivery" | "store_pickup";
      notes?: string;
    }): Promise<{ success: boolean; whatsappUrl?: string }> => {
      if (!store) return { success: false };
      if (cart.length === 0) {
        toast.error("Your bag is empty!");
        return { success: false };
      }

      const minOrder = store.minimum_order_amount || 0;
      if (minOrder > 0 && cartSubtotal < minOrder) {
        toast.error(`Minimum order amount is ₹${minOrder}. Please add more items.`);
        return { success: false };
      }

      setIsSubmitting(true);
      try {
        const orderItems: StorefrontOrderItem[] = cart.map((c) => ({
          product_id: c.product.id,
          name: c.product.name,
          unit: c.product.unit || "PCS",
          price: c.product.selling_price,
          mrp: c.product.mrp,
          quantity: c.quantity,
          total: c.product.selling_price * c.quantity,
        }));

        const orderResult = await submitStorefrontOrder({
          organization_id: store.organization_id,
          customer_name: details.customerName,
          customer_phone: details.customerPhone,
          customer_address: details.customerAddress,
          delivery_type: details.deliveryType,
          items: orderItems,
          subtotal: cartSubtotal,
          delivery_charge: details.deliveryType === "store_pickup" ? 0 : deliveryCharge,
          total_amount:
            details.deliveryType === "store_pickup" ? cartSubtotal : grandTotal,
          notes: details.notes,
          source: "whatsapp",
        });

        // Build WhatsApp order message
        const messageText = buildWhatsAppOrderMessage(store, {
          orderNumber: orderResult.orderNumber,
          customerName: details.customerName,
          customerPhone: details.customerPhone,
          customerAddress: details.customerAddress,
          deliveryType: details.deliveryType,
          items: orderItems,
          subtotal: cartSubtotal,
          deliveryCharge: details.deliveryType === "store_pickup" ? 0 : deliveryCharge,
          totalAmount: details.deliveryType === "store_pickup" ? cartSubtotal : grandTotal,
          notes: details.notes,
        });

        const targetPhone = (store.whatsapp_number || store.contact_phone || "").replace(/[^0-9]/g, "");
        const formattedPhone = targetPhone.length === 10 ? `91${targetPhone}` : targetPhone;

        const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;

        setLastPlacedOrder({
          orderNumber: orderResult.orderNumber,
          whatsappUrl,
        });

        clearCart();
        setIsCartOpen(false);

        // Open WhatsApp in new tab/window
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");

        return { success: true, whatsappUrl };
      } catch (err) {
        console.error("WhatsApp checkout error:", err);
        toast.error("Failed to process order. Please try again.");
        return { success: false };
      } finally {
        setIsSubmitting(false);
      }
    },
    [store, cart, cartSubtotal, deliveryCharge, grandTotal, clearCart]
  );

  return {
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
  };
}
