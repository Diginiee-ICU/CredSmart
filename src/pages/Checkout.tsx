import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  ShoppingCart,
  Package,
  Receipt,
  ScanLine,
  Mic,
  MicOff,
  X,
  Camera,
  User,
  Wallet,
  SplitSquareHorizontal,
  FileText,
  PauseCircle,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  ArrowLeft,
  LayoutDashboard,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTE_PATHS } from "@/config/routes";
import { CartItem, Batch, Product } from "@/types/pos";
import { BatchConflictModal } from "@/components/BatchConflictModal";
import { ReceiptModal, ReceiptData } from "@/components/ReceiptModal";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Button } from "@/components/ui/button";

// Extend window for SpeechRecognition types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface PosProductRow {
  id: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  category: string | null;
  sku?: string | null;
  tags?: Record<string, string> | null;
  image_url?: string | null;
}

interface HeldCart {
  id: string;
  timestamp: Date | string;
  items: CartItem[];
  customer: { id: string; name: string; phone: string | null } | null;
  discountType: "percent" | "flat";
  discountValue: string;
}

const getHeldCartsStorageKey = (id: string | null) => `credsmart_held_carts_${id || "default"}`;
const getLegacyHeldCartsStorageKey = (id: string | null) => `nexis_held_carts_${id || "default"}`;

export default function Checkout() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { org, orgId, userRole } = useOrganization();
  const { log: auditLog } = useAuditLog();
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [conflictProduct, setConflictProduct] = useState<Product | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // Hold Cart state
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>(() => {
    try {
      const saved =
        localStorage.getItem(getHeldCartsStorageKey(orgId)) ||
        localStorage.getItem(getLegacyHeldCartsStorageKey(orgId));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showHeldCartsModal, setShowHeldCartsModal] = useState(false);

  const performExit = () => {
    if (userRole === "cashier") {
      signOut();
    } else {
      navigate(ROUTE_PATHS.dashboard);
    }
  };

  const handleExitClick = () => {
    if (cart.length > 0) {
      setShowExitModal(true);
    } else {
      performExit();
    }
  };

  const handleHoldAndExit = () => {
    if (cart.length > 0) {
      const newHeld: HeldCart = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        items: [...cart],
        customer: selectedCustomer,
        discountType,
        discountValue,
      };
      const updated = [newHeld, ...heldCarts];
      setHeldCarts(updated);
      try {
        localStorage.setItem(getHeldCartsStorageKey(orgId), JSON.stringify(updated));
      } catch (e) {
        console.warn("Failed to persist held cart:", e);
      }
      toast({ title: "Cart Held Successfully", description: "Cart saved to storage." });
    }
    setShowExitModal(false);
    performExit();
  };

  const handleDiscardAndExit = () => {
    setCart([]);
    setShowExitModal(false);
    performExit();
  };

  const storeInfo = {
    name: org?.name || "My Store",
    address: org?.address || "",
    phone: org?.phone || "",
    gstin: org?.gstin || "",
    invoicePrefix: org?.invoice_prefix || "INV",
  };

  const searchRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  // Customer linking
  const [customers, setCustomers] = useState<{ id: string; name: string; phone: string | null }[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string; phone: string | null } | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerBalance, setCustomerBalance] = useState(0); // positive = owes money (Udhar), negative = advance
  const customerSearchRef = useRef<HTMLDivElement>(null);

  // Save held carts to localStorage
  useEffect(() => {
    if (!orgId) return;
    try {
      localStorage.setItem(getHeldCartsStorageKey(orgId), JSON.stringify(heldCarts));
    } catch (e) {
      console.warn("Failed to persist held carts:", e);
    }
  }, [heldCarts, orgId]);

  useEffect(() => {
    searchRef.current?.focus();
  }, [user]);

  // Fetch real products from database
  useEffect(() => {
    if (!orgId) {
      setProducts([]);
      setProductsLoading(false);
      return;
    }

    const fetchProducts = async () => {
      setProductsLoading(true);

      let prods: PosProductRow[] | null = null;
      const { data: richData, error: richError } = await supabase
        .from("products")
        .select("id, barcode, name, brand, category, sku, tags, image_url")
        .eq("organization_id", orgId)
        .order("name");

      if (richError) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("products")
          .select("id, barcode, name, brand, category")
          .eq("organization_id", orgId)
          .order("name");

        if (fallbackError) {
          toast({
            title: "Unable to load products",
            description: fallbackError.message,
            variant: "destructive",
          });
          setProducts([]);
          setProductsLoading(false);
          return;
        }

        prods = fallbackData as PosProductRow[] | null;
      } else {
        prods = richData as PosProductRow[] | null;
      }

      if (!prods || prods.length === 0) {
        setProducts([]);
        setProductsLoading(false);
        return;
      }

      const prodIds = prods.map((p) => p.id);
      const { data: batches, error: batchesError } = await supabase
        .from("product_batches")
        .select("id, product_id, batch_number, cost_price, mrp, stock, expiry_date")
        .in("product_id", prodIds);

      if (batchesError) {
        toast({
          title: "Unable to load product stock",
          description: batchesError.message,
          variant: "destructive",
        });
      }

      const batchMap: Record<string, Batch[]> = {};
      (batches || []).forEach((b) => {
        if (!batchMap[b.product_id]) batchMap[b.product_id] = [];
        batchMap[b.product_id].push({
          id: b.id,
          costPrice: Number(b.cost_price || 0),
          mrp: Number(b.mrp || 0),
          stock: Number(b.stock || 0),
          batchNumber: b.batch_number || "General",
          expiryDate: b.expiry_date || undefined,
        });
      });

      const mapped: Product[] = prods.map((p) => ({
        id: p.id,
        barcode: p.barcode || "",
        name: p.name,
        brand: p.brand || "",
        category: p.category || "",
        batches: batchMap[p.id] || [],
        sku: p.sku || undefined,
        tags: (p.tags as Record<string, string>) || undefined,
        imageUrl: p.image_url || undefined,
      }));

      setProducts(mapped);
      setProductsLoading(false);
    };
    fetchProducts();
  }, [orgId]);

  // Fetch customers when org is available
  useEffect(() => {
    if (!orgId) return;
    const fetchCustomers = async () => {
      try {
        const { data, error } = await supabase
          .from("customers")
          .select("id, name, phone")
          .eq("organization_id", orgId)
          .order("name");
        if (error) {
          console.error("fetchCustomers error:", error);
          setCustomers([]);
        } else if (data) {
          setCustomers(data);
        }
      } catch (err) {
        console.error("fetchCustomers unexpected error:", err);
        setCustomers([]);
      }
    };
    fetchCustomers();
  }, [orgId]);

  // Fetch credit ledger balance when customer is selected
  useEffect(() => {
    if (!selectedCustomer || !orgId) {
      setCustomerBalance(0);
      return;
    }
    const fetchCredit = async () => {
      try {
        const { data, error } = await supabase
          .from("credit_transactions")
          .select("type, amount")
          .eq("party_id", selectedCustomer.id)
          .eq("party_type", "customer")
          .eq("organization_id", orgId);
        if (error) {
          console.error("fetchCredit error:", error);
          setCustomerBalance(0);
          return;
        }
        if (data) {
          const balance = data.reduce((sum, t) => {
            return t.type === "credit" ? sum + Number(t.amount || 0) : sum - Number(t.amount || 0);
          }, 0);
          setCustomerBalance(balance);
        }
      } catch (err) {
        console.error("fetchCredit unexpected error:", err);
        setCustomerBalance(0);
      }
    };
    fetchCredit();
  }, [selectedCustomer, orgId]);

  // Close customer dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Tax rate from org settings
  const orgTaxRate = (org?.tax_rate ?? 5) / 100;

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      stopScanner();
      stopVoice();
    };
  }, []);

  // Dynamic categories from products
  const dynamicCategories = useMemo(() => {
    const cats = [...new Set(products.map((p) => p.category).filter(Boolean))].sort();
    return [
      { id: "all", name: "All Items" },
      ...cats.map((c) => ({ id: c, name: c })),
    ];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory = activeCategory === "all" || p.category === activeCategory;
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase())) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
        (p.brand && p.brand.toLowerCase().includes(search.toLowerCase()));
      return matchCategory && matchSearch;
    });
  }, [search, activeCategory, products]);

  const addToCart = (product: Product, batch: Batch) => {
    if (batch.stock <= 0) {
      toast({
        title: "Item Out of Stock",
        description: `${product.name} (Batch: ${batch.batchNumber}) is out of stock.`,
        variant: "destructive",
      });
      return;
    }

    setCart((prev) => {
      const existing = prev.find(
        (ci) => ci.product.id === product.id && ci.batch.id === batch.id
      );
      if (existing) {
        if (existing.quantity >= batch.stock) {
          toast({
            title: "Stock Limit Reached",
            description: `Only ${batch.stock} units available in stock for this batch.`,
            variant: "destructive",
          });
          return prev;
        }
        return prev.map((ci) =>
          ci.product.id === product.id && ci.batch.id === batch.id
            ? { ...ci, quantity: ci.quantity + 1 }
            : ci
        );
      }
      return [...prev, { product, batch, quantity: 1 }];
    });
  };

  const handleProductClick = (product: Product) => {
    const availableBatches = product.batches.filter((b) => b.stock > 0);
    if (availableBatches.length === 0) {
      toast({
        title: "Out of Stock",
        description: `${product.name} has no available inventory.`,
        variant: "destructive",
      });
      return;
    }
    if (availableBatches.length === 1) {
      addToCart(product, availableBatches[0]);
    } else {
      setConflictProduct(product);
    }
  };

  const handleBarcodeScanned = useCallback(
    (barcode: string) => {
      const trimmed = barcode.trim();
      const product = products.find(
        (p) =>
          (p.barcode && p.barcode.toLowerCase() === trimmed.toLowerCase()) ||
          (p.sku && p.sku.toLowerCase() === trimmed.toLowerCase())
      );

      if (product) {
        handleProductClick(product);
        toast({ title: "Product Added", description: `${product.name} added to cart.` });
      } else {
        toast({
          title: "Product Not Found",
          description: `No product found matching barcode/SKU: ${barcode}`,
          variant: "destructive",
        });
      }
      setShowScanner(false);
      stopScanner();
    },
    [products]
  );

  // Handle Hardware USB Barcode Scanner Enter Keypress
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && search.trim()) {
      const term = search.trim().toLowerCase();
      // 1. Check exact barcode / sku match
      const exactMatch = products.find(
        (p) =>
          (p.barcode && p.barcode.toLowerCase() === term) ||
          (p.sku && p.sku.toLowerCase() === term)
      );

      if (exactMatch) {
        handleProductClick(exactMatch);
        setSearch("");
        return;
      }

      // 2. If filteredProducts has exactly 1 match
      if (filteredProducts.length === 1) {
        handleProductClick(filteredProducts[0]);
        setSearch("");
        return;
      }
    }
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart((prev) => {
      const item = prev[index];
      if (!item) return prev;
      const newQty = item.quantity + delta;
      if (delta > 0 && newQty > item.batch.stock) {
        toast({
          title: "Stock Limit Reached",
          description: `Cannot exceed available batch stock (${item.batch.stock} units).`,
          variant: "destructive",
        });
        return prev;
      }
      return prev
        .map((ci, i) => (i === index ? { ...ci, quantity: newQty } : ci))
        .filter((ci) => ci.quantity > 0);
    });
  };

  const removeItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    setDiscountValue("");
    setSplitMode(false);
    toast({ title: "Cart Cleared" });
  };

  // Hold Cart functionality
  const handleHoldCart = () => {
    if (cart.length === 0) {
      toast({ title: "Cart is empty", description: "Add items to hold the cart.", variant: "destructive" });
      return;
    }

    const newHold: HeldCart = {
      id: "HOLD-" + Date.now(),
      timestamp: new Date(),
      items: [...cart],
      customer: selectedCustomer,
      discountType,
      discountValue,
    };

    setHeldCarts((prev) => [newHold, ...prev]);
    setCart([]);
    setSelectedCustomer(null);
    setDiscountValue("");
    setSplitMode(false);
    toast({ title: "Cart Held", description: "Cart saved. You can resume it anytime from Held Carts." });
  };

  const handleResumeCart = (held: HeldCart) => {
    setCart(held.items);
    setSelectedCustomer(held.customer);
    setDiscountType(held.discountType);
    setDiscountValue(held.discountValue);
    setHeldCarts((prev) => prev.filter((h) => h.id !== held.id));
    setShowHeldCartsModal(false);
    toast({ title: "Cart Resumed", description: `Restored ${held.items.length} items to active cart.` });
  };

  const handleDeleteHeldCart = (id: string) => {
    setHeldCarts((prev) => prev.filter((h) => h.id !== id));
    toast({ title: "Held Cart Deleted" });
  };

  // === QR/Barcode Camera Scanner ===
  const startScanner = async () => {
    setShowScanner(true);
    setTimeout(async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode("qr-scanner-region");
        html5QrCodeRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText: string) => {
            handleBarcodeScanned(decodedText);
          },
          () => {} // ignore interim frame scan misses
        );
      } catch (err: any) {
        console.error("Scanner error:", err);
        toast({
          title: "Camera Error",
          description: "Could not access camera. Please check browser permissions.",
          variant: "destructive",
        });
        setShowScanner(false);
      }
    }, 100);
  };

  const stopScanner = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current
        .stop()
        .then(() => {
          html5QrCodeRef.current.clear();
          html5QrCodeRef.current = null;
        })
        .catch(() => {});
    }
    setShowScanner(false);
  };

  // === Voice Search ===
  const startVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast({
        title: "Voice Not Supported",
        description: "Voice recognition is not supported in this browser. Try Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join("");
      setSearch(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Voice error:", event.error);
      setIsListening(false);
      if (event.error === "not-allowed") {
        toast({
          title: "Microphone Blocked",
          description: "Please allow microphone access in browser settings.",
          variant: "destructive",
        });
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopVoice = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const toggleVoice = () => {
    if (isListening) {
      stopVoice();
    } else {
      startVoice();
    }
  };

  const [discountType, setDiscountType] = useState<"percent" | "flat">("percent");
  const [discountValue, setDiscountValue] = useState("");

  // Split payment state
  const [splitMode, setSplitMode] = useState(false);
  const [splitCash, setSplitCash] = useState("");
  const [splitCard, setSplitCard] = useState("");
  const [splitUpi, setSplitUpi] = useState("");
  const [splitCredit, setSplitCredit] = useState("");

  const subtotal = cart.reduce((sum, ci) => sum + ci.batch.mrp * ci.quantity, 0);
  const rawDiscount = Math.max(0, parseFloat(discountValue) || 0);
  const discountNum = discountType === "percent" ? Math.min(100, rawDiscount) : rawDiscount;
  const discountAmount =
    discountType === "percent"
      ? Math.min(subtotal * (discountNum / 100), subtotal)
      : Math.min(discountNum, subtotal);
  const afterDiscount = subtotal - discountAmount;
  const tax = afterDiscount * orgTaxRate;
  const exactTotal = afterDiscount + tax;
  const total = Math.round(exactTotal);
  const roundOff = Number((total - exactTotal).toFixed(2));
  const cartItemCount = cart.reduce((sum, ci) => sum + ci.quantity, 0);

  const generateInvoiceNumber = (isEst = false) => {
    const now = new Date();
    const prefix = isEst ? "EST" : storeInfo.invoicePrefix || "INV";
    const seq = Math.floor(Math.random() * 9000) + 1000;
    return `${prefix}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${seq}`;
  };

  const handlePayment = async (
    method: string,
    splitPayments?: { cash: number; card: number; upi: number; credit?: number },
    isEstimate = false
  ) => {
    if (cart.length === 0) {
      toast({ title: "Cart is empty", description: "Add products before checking out.", variant: "destructive" });
      return;
    }

    if (isProcessingPayment) return;

    // Credit validation: must select customer
    if (method === "Credit" && !selectedCustomer) {
      toast({
        title: "Customer Required for Credit / Udhar",
        description: "Please select or search a customer to record credit ledger balance.",
        variant: "destructive",
      });
      searchRef.current?.focus();
      return;
    }

    if (!orgId || !user) {
      toast({
        title: "Unable to complete sale",
        description: "Organization or user context not found. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingPayment(true);

    const discountLabel =
      discountAmount > 0
        ? discountType === "percent"
          ? `${discountNum}%`
          : `₹${discountNum.toFixed(2)}`
        : "";

    const invoiceNumber = generateInvoiceNumber(isEstimate);
    const paymentMethodLabel = isEstimate ? "Estimate" : splitPayments ? "Split" : method;

    try {
      // 1. Insert Sales Record
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          organization_id: orgId,
          invoice_number: invoiceNumber,
          subtotal,
          discount_amount: discountAmount,
          discount_label: discountLabel || null,
          tax,
          total,
          payment_method: paymentMethodLabel,
          created_by: user.id,
          customer_id: selectedCustomer?.id || null,
        })
        .select()
        .single();

      if (saleError || !sale) {
        throw new Error(saleError?.message || "Failed to create invoice record.");
      }

      // 2. Insert Sale Items
      const saleItems = cart.map((ci) => ({
        sale_id: sale.id,
        product_name: ci.product.name,
        product_id: ci.product.id,
        batch_id: ci.batch.id,
        batch_number: ci.batch.batchNumber || null,
        mrp: ci.batch.mrp,
        quantity: ci.quantity,
        line_total: Number((ci.batch.mrp * ci.quantity).toFixed(2)),
      }));

      const { error: itemsError } = await supabase.from("sale_items").insert(saleItems);
      if (itemsError) {
        console.warn("Sale items insert failed:", itemsError.message);
      }

      // 3. If NOT an estimate, deduct inventory stock & record credit transaction
      if (!isEstimate) {
        // Deduct inventory batch stock in Supabase
        for (const ci of cart) {
          try {
            const newStock = Math.max(0, ci.batch.stock - ci.quantity);
            await supabase
              .from("product_batches")
              .update({ stock: newStock })
              .eq("id", ci.batch.id);
          } catch (uErr) {
            console.warn("Batch stock update warning:", uErr);
          }
        }

        // Locally update `products` state stock so inventory changes reflect on UI immediately
        setProducts((prev) =>
          prev.map((p) => {
            const updatedBatches = p.batches.map((b) => {
              const matchedCartItem = cart.find(
                (ci) => ci.product.id === p.id && ci.batch.id === b.id
              );
              if (matchedCartItem) {
                return { ...b, stock: Math.max(0, b.stock - matchedCartItem.quantity) };
              }
              return b;
            });
            return { ...p, batches: updatedBatches };
          })
        );

        // Record Credit / Udhar transaction in ledger
        const creditOwed =
          method === "Credit" ? total : splitPayments?.credit && splitPayments.credit > 0 ? splitPayments.credit : 0;

        if (creditOwed > 0 && selectedCustomer) {
          try {
            await supabase.from("credit_transactions").insert({
              organization_id: orgId,
              party_id: selectedCustomer.id,
              party_type: "customer",
              type: "credit",
              amount: creditOwed,
              description: `Udhar / Credit Sale Invoice #${invoiceNumber}`,
              reference_id: sale.id,
              created_by: user.id,
            });
          } catch (cErr) {
            console.warn("Failed to record credit transaction:", cErr);
          }
        }
      }

      // 4. Audit log
      try {
        await supabase.from("audit_logs").insert({
          organization_id: orgId,
          user_id: user.id,
          action: "create",
          entity_type: isEstimate ? "estimate" : "sale",
          entity_id: sale.id,
          details: {
            invoice: invoiceNumber,
            total,
            items: cart.length,
            payment: paymentMethodLabel,
            customer: selectedCustomer?.name || "Walk-in",
          },
        });
      } catch (aErr) {
        console.warn("Audit log notice:", aErr);
      }

      toast({
        title: isEstimate ? "Estimate Generated" : "Payment Successful",
        description: `Invoice ${invoiceNumber} created (₹${total.toFixed(2)}).`,
      });

      // 5. Open Receipt Modal
      setReceiptData({
        invoiceNumber,
        items: [...cart],
        subtotal,
        discountAmount,
        discountLabel,
        tax,
        total,
        roundOff,
        customerName: selectedCustomer?.name || null,
        customerPhone: selectedCustomer?.phone || null,
        paymentMethod: paymentMethodLabel,
        splitPayments: splitPayments || null,
        storeName: storeInfo.name,
        storeAddress: storeInfo.address,
        storePhone: storeInfo.phone,
        gstin: storeInfo.gstin,
        date: new Date(),
        isEstimate,
      });

      // Reset cart and checkout states
      setSplitMode(false);
      setSplitCash("");
      setSplitCard("");
      setSplitUpi("");
      setSplitCredit("");
      setCart([]);
      setDiscountValue("");
    } catch (err: any) {
      console.error("Payment failed:", err);
      toast({
        title: "Transaction Failed",
        description: err?.message || "An unexpected error occurred while processing checkout.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleSplitPayment = () => {
    const cash = Math.max(0, parseFloat(splitCash) || 0);
    const card = Math.max(0, parseFloat(splitCard) || 0);
    const upi = Math.max(0, parseFloat(splitUpi) || 0);
    const credit = Math.max(0, parseFloat(splitCredit) || 0);
    const splitTotal = cash + card + upi + credit;

    if (credit > 0 && !selectedCustomer) {
      toast({
        title: "Customer Required for Split Credit",
        description: "Please link a customer to record the credit/Udhar portion.",
        variant: "destructive",
      });
      return;
    }

    if (Math.abs(splitTotal - total) > 0.01) {
      toast({
        title: "Split amount mismatch",
        description: `Split total ₹${splitTotal.toFixed(2)} must equal bill total ₹${total.toFixed(2)}.`,
        variant: "destructive",
      });
      return;
    }

    handlePayment("Split", { cash, card, upi, credit });
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.phone && c.phone.includes(customerSearch))
  );

  return (
    <div className="flex w-full min-w-0 h-full min-h-full relative overflow-hidden bg-background">
      
      {/* LEFT: POS Billing Cart */}
      <div
        className={cn(
          "flex flex-col border-r border-border bg-card shrink-0 z-30",
          "hidden lg:flex lg:w-[420px]",
          showCart && "!flex fixed inset-0 w-full lg:relative lg:w-[420px] z-[60]"
        )}
      >
        {/* Cart header */}
        <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-foreground text-sm sm:text-base">Current Sale</h2>
            </div>
            
            <div className="flex items-center gap-1.5">
              {heldCarts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHeldCartsModal(true)}
                  className="text-xs font-semibold px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors flex items-center gap-1"
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                  Held ({heldCarts.length})
                </button>
              )}

              <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-semibold">
                {cartItemCount} qty
              </span>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  title="Clear Cart"
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-destructive/10 text-destructive transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={handleExitClick}
                title={userRole === "cashier" ? "Sign Out" : "Exit POS to Dashboard"}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Exit POS"
              >
                <LogOut className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowCart(false)}
                className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground"
                aria-label="Close cart"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Customer selector bar */}
        <div className="px-4 py-2.5 border-b border-border bg-muted/10" ref={customerSearchRef}>
          {selectedCustomer ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{selectedCustomer.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {selectedCustomer.phone || "No phone"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {customerBalance !== 0 && (
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      customerBalance > 0
                        ? "bg-destructive/10 text-destructive"
                        : "bg-emerald-500/10 text-emerald-600"
                    )}
                  >
                    {customerBalance > 0
                      ? `Udhar: ₹${customerBalance.toFixed(0)}`
                      : `Adv: ₹${Math.abs(customerBalance).toFixed(0)}`}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerSearch("");
                  }}
                  className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground"
                  aria-label="Unlink customer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                placeholder="Link customer / Udhar account (optional)..."
                className="w-full h-8 pl-9 pr-3 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {showCustomerDropdown && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-auto rounded-xl border border-border bg-popover shadow-lg">
                  {filteredCustomers.length === 0 ? (
                    <p className="p-3 text-xs text-muted-foreground text-center">No matching customers found</p>
                  ) : (
                    filteredCustomers.slice(0, 8).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomerSearch("");
                          setShowCustomerDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center justify-between border-b border-border/40 last:border-0"
                      >
                        <span className="font-semibold text-foreground">{c.name}</span>
                        {c.phone && <span className="text-[11px] text-muted-foreground font-mono">{c.phone}</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart items list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center p-6">
              <ShoppingCart className="w-12 h-12 mb-3 opacity-25" />
              <p className="text-sm font-semibold text-foreground">Cart is empty</p>
              <p className="text-xs text-muted-foreground mt-1">
                Scan barcodes or tap products on the right to start billing.
              </p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={`${item.product.id}-${item.batch.id}`}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-background border border-border/80 hover:border-primary/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{item.product.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    ₹{item.batch.mrp.toFixed(2)} × {item.quantity}{" "}
                    <span className="text-[10px] text-muted-foreground/80 font-mono">
                      (B:{item.batch.batchNumber || "Gen"})
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateQuantity(idx, -1)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted hover:bg-border text-foreground transition-colors touch-manipulation active:scale-95"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-bold w-6 text-center text-foreground">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(idx, 1)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted hover:bg-border text-foreground transition-colors touch-manipulation active:scale-95"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors ml-0.5"
                    aria-label="Delete item"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                <p className="text-xs font-bold text-foreground w-16 text-right">
                  ₹{(item.batch.mrp * item.quantity).toFixed(2)}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Financial Summary & Payment Actions */}
        <div className="border-t border-border p-3.5 sm:p-4 space-y-2.5 pb-[max(1rem,env(safe-area-inset-bottom,0px))] lg:pb-4 bg-card">
          
          {/* Subtotal & Discount Input */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="text-foreground font-semibold">₹{subtotal.toFixed(2)}</span>
            </div>

            {/* Discount Control Bar */}
            <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/40 border border-border/70">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Discount
              </span>
              <div className="flex rounded-lg overflow-hidden border border-border shrink-0">
                <button
                  type="button"
                  onClick={() => setDiscountType("percent")}
                  className={cn(
                    "px-2 py-0.5 text-[10px] font-bold transition-colors",
                    discountType === "percent"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground"
                  )}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType("flat")}
                  className={cn(
                    "px-2 py-0.5 text-[10px] font-bold transition-colors",
                    discountType === "flat"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground"
                  )}
                >
                  ₹
                </button>
              </div>

              <input
                type="number"
                min="0"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === "percent" ? "0%" : "₹0.00"}
                className="flex-1 h-7 px-2 rounded-md border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 text-right font-medium"
              />

              {discountAmount > 0 && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                  -₹{discountAmount.toFixed(2)}
                </span>
              )}
            </div>

            {/* GST Tax Breakdown */}
            <div className="flex justify-between text-muted-foreground">
              <span>GST Tax ({(orgTaxRate * 100).toFixed(0)}%)</span>
              <span className="text-foreground font-semibold">₹{tax.toFixed(2)}</span>
            </div>

            {Math.abs(roundOff) > 0.001 && (
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Round Off</span>
                <span className="font-mono">{roundOff > 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}</span>
              </div>
            )}
          </div>

          {/* Grand Total */}
          <div className="flex justify-between items-center text-base sm:text-lg font-black border-t border-border pt-2">
            <span className="text-foreground">Total Amount</span>
            <span className="text-primary text-xl font-black">₹{total.toFixed(2)}</span>
          </div>

          {/* Action Row: Hold Cart & Clear */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleHoldCart}
              disabled={cart.length === 0}
              className="flex-1 py-1.5 px-2 rounded-lg border border-border bg-muted/30 hover:bg-muted text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
              Hold Cart
            </button>
            <button
              type="button"
              onClick={handleClearCart}
              disabled={cart.length === 0}
              className="py-1.5 px-3 rounded-lg border border-border hover:bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>

          {/* Payment Modes Bar */}
          {!splitMode ? (
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handlePayment("Cash")}
                disabled={cart.length === 0 || isProcessingPayment}
                className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-[11px] disabled:opacity-40 touch-manipulation active:scale-95 transition-all shadow-xs"
              >
                <Banknote className="w-4 h-4" />
                Cash
              </button>

              <button
                type="button"
                onClick={() => handlePayment("Card")}
                disabled={cart.length === 0 || isProcessingPayment}
                className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-bold text-[11px] disabled:opacity-40 touch-manipulation active:scale-95 transition-all shadow-xs"
              >
                <CreditCard className="w-4 h-4" />
                Card
              </button>

              <button
                type="button"
                onClick={() => handlePayment("UPI")}
                disabled={cart.length === 0 || isProcessingPayment}
                className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 font-bold text-[11px] disabled:opacity-40 touch-manipulation active:scale-95 transition-all shadow-xs"
              >
                <QrCode className="w-4 h-4" />
                UPI
              </button>

              <button
                type="button"
                onClick={() => handlePayment("Credit")}
                disabled={cart.length === 0 || isProcessingPayment}
                className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-amber-600 text-white hover:bg-amber-700 font-bold text-[11px] disabled:opacity-40 touch-manipulation active:scale-95 transition-all shadow-xs"
                title="Udhar / Pay Later (Links to customer ledger)"
              >
                <Wallet className="w-4 h-4" />
                Udhar
              </button>

              <button
                type="button"
                onClick={() => {
                  setSplitMode(true);
                  setSplitCash("");
                  setSplitCard("");
                  setSplitUpi("");
                  setSplitCredit("");
                }}
                disabled={cart.length === 0 || isProcessingPayment}
                className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl border-2 border-primary/40 text-primary hover:bg-primary/5 font-bold text-[11px] disabled:opacity-40 touch-manipulation active:scale-95 transition-all"
              >
                <SplitSquareHorizontal className="w-4 h-4" />
                Split
              </button>
            </div>
          ) : (
            <div className="pt-1 space-y-2 bg-muted/30 p-2.5 rounded-xl border border-border">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Split Payment Breakdown
                </span>
                <button
                  type="button"
                  onClick={() => setSplitMode(false)}
                  className="text-xs text-muted-foreground hover:text-foreground font-semibold"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={splitCash}
                    onChange={(e) => setSplitCash(e.target.value)}
                    placeholder="Cash ₹"
                    className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={splitCard}
                    onChange={(e) => setSplitCard(e.target.value)}
                    placeholder="Card ₹"
                    className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={splitUpi}
                    onChange={(e) => setSplitUpi(e.target.value)}
                    placeholder="UPI ₹"
                    className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={splitCredit}
                    onChange={(e) => setSplitCredit(e.target.value)}
                    placeholder="Udhar ₹"
                    className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
              </div>

              {(() => {
                const splitTotal =
                  (parseFloat(splitCash) || 0) +
                  (parseFloat(splitCard) || 0) +
                  (parseFloat(splitUpi) || 0) +
                  (parseFloat(splitCredit) || 0);
                const remaining = total - splitTotal;
                const isBalanced = Math.abs(remaining) < 0.01;

                return (
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className={isBalanced ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
                        {isBalanced ? "✓ Amount Balanced" : remaining > 0 ? `₹${remaining.toFixed(2)} remaining` : `₹${Math.abs(remaining).toFixed(2)} over`}
                      </span>
                      <span className="text-muted-foreground">Sum: ₹{splitTotal.toFixed(2)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleSplitPayment}
                      disabled={cart.length === 0 || !isBalanced || isProcessingPayment}
                      className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition-opacity disabled:opacity-40"
                    >
                      Confirm Split Payment
                    </button>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Estimate / Quotation option */}
          <div className="pt-0.5">
            <button
              type="button"
              onClick={() => handlePayment("Estimate", undefined, true)}
              disabled={cart.length === 0 || isProcessingPayment}
              className="w-full py-2 rounded-xl border border-dashed border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <FileText className="w-3.5 h-3.5" />
              Save as Quotation / Estimate (No Stock Deduction)
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT: Product Search & Inventory Catalog Grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Search bar with camera scanner + voice input */}
        <div className="px-3 sm:px-5 py-3 sm:py-3.5 border-b border-border bg-card">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Scan barcode (press Enter) or search products..."
                className={cn(
                  "w-full h-11 pl-10 pr-4 rounded-xl bg-background border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-xs sm:text-sm font-medium transition-all",
                  isListening ? "border-amber-500 ring-2 ring-amber-500/30" : "border-border"
                )}
              />
              {isListening && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-amber-500 uppercase">Listening</span>
                </span>
              )}
            </div>

            {/* Voice Search Button */}
            <button
              type="button"
              onClick={toggleVoice}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0",
                isListening
                  ? "bg-amber-500 text-white animate-pulse"
                  : "bg-muted text-muted-foreground hover:bg-border hover:text-foreground"
              )}
              title={isListening ? "Stop listening" : "Voice search"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Camera Barcode Scanner Button */}
            <button
              type="button"
              onClick={showScanner ? stopScanner : startScanner}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0",
                showScanner
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-border hover:text-foreground"
              )}
              title="Scan barcode with camera"
            >
              <ScanLine className="w-4 h-4" />
            </button>

            {/* Exit POS / Back to Dashboard Button */}
            <button
              type="button"
              onClick={handleExitClick}
              className="h-11 px-3 sm:px-4 rounded-xl border border-border bg-muted/40 hover:bg-muted text-foreground flex items-center gap-1.5 font-semibold text-xs sm:text-sm transition-all shrink-0 active:scale-95 touch-manipulation"
              title={userRole === "cashier" ? "Sign Out of Register" : "Exit POS to Dashboard"}
            >
              <LogOut className="w-4 h-4 text-muted-foreground" />
              <span className="hidden sm:inline">
                {userRole === "cashier" ? "Sign Out" : "Exit POS"}
              </span>
            </button>
          </div>
        </div>

        {/* Camera QR/Barcode Scanner Panel */}
        {showScanner && (
          <div className="relative bg-card border-b border-border">
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-primary" />
                  <span className="text-xs sm:text-sm font-bold text-foreground">Camera Barcode Scanner</span>
                </div>
                <button
                  type="button"
                  onClick={stopScanner}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-w-[300px] mx-auto rounded-xl overflow-hidden border-2 border-primary/30">
                <div id="qr-scanner-region" ref={scannerRef} />
              </div>
              <p className="text-[11px] text-muted-foreground text-center mt-2">
                Point camera steadily at a barcode or QR sticker to scan
              </p>
            </div>
          </div>
        )}

        {/* Categories Bar */}
        <div className="px-3 sm:px-5 py-2.5 border-b border-border bg-card flex gap-1.5 overflow-x-auto scrollbar-none">
          {dynamicCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0",
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:bg-border hover:text-foreground"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 pb-24 lg:pb-5">
          {productsLoading ? (
            <div className="h-full min-h-[280px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-medium">Loading store inventory...</p>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-full min-h-[280px] flex items-center justify-center">
              <div className="text-center text-muted-foreground max-w-sm p-4">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-30 text-primary" />
                <p className="text-sm font-semibold text-foreground">
                  {products.length === 0 ? "No products in inventory yet" : "No matching products found"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {products.length === 0
                    ? "Add items from the Items or Purchases screens to see them here."
                    : "Try clearing your search query or switching categories."}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {filteredProducts.map((product) => {
                const totalStock = product.batches.reduce((s, b) => s + b.stock, 0);
                const lowestMrp =
                  product.batches.length > 0
                    ? Math.min(...product.batches.map((b) => b.mrp))
                    : 0;
                const activeBatchesCount = product.batches.filter((b) => b.stock > 0).length;
                const hasMultipleBatches = activeBatchesCount > 1;

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleProductClick(product)}
                    disabled={totalStock === 0}
                    className={cn(
                      "flex flex-col p-3 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all text-left group active:scale-[0.98] touch-manipulation relative",
                      totalStock === 0 && "opacity-40 cursor-not-allowed bg-muted/20"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-10 h-10 rounded-xl object-cover bg-muted"
                          onError={(e) => {
                            const el = e.target as HTMLImageElement;
                            el.style.display = "none";
                            if (el.nextElementSibling) {
                              (el.nextElementSibling as HTMLElement).classList.remove("hidden");
                            }
                          }}
                        />
                      ) : null}
                      <div
                        className={cn(
                          "w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary",
                          product.imageUrl && "hidden"
                        )}
                      >
                        <Package className="w-4 h-4" />
                      </div>

                      {hasMultipleBatches && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-500/10 text-amber-600 rounded-full">
                          Multi-MRP
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm font-bold text-foreground truncate">{product.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {product.brand || product.category || "General"}
                    </p>

                    <div className="flex items-center justify-between mt-auto pt-2.5 border-t border-border/50">
                      <span className="text-sm sm:text-base font-black text-primary">
                        ₹{lowestMrp.toFixed(2)}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-semibold",
                          totalStock > 0 ? "text-muted-foreground" : "text-destructive"
                        )}
                      >
                        {totalStock > 0 ? `${totalStock} in stock` : "Out of stock"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Cart Floating Action Button */}
      <button
        type="button"
        onClick={() => setShowCart(true)}
        className={cn(
          "lg:hidden fixed right-4 z-20 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center card-shadow-lg",
          "bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px)+0.75rem)]",
          cart.length === 0 && "opacity-60"
        )}
        aria-label="Open cart"
      >
        <ShoppingCart className="w-6 h-6" />
        {cartItemCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
            {cartItemCount}
          </span>
        )}
      </button>

      {/* Held Carts Modal */}
      {showHeldCartsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-card rounded-2xl border border-border p-5 max-w-md w-full max-h-[80vh] flex flex-col card-shadow-lg animate-scale-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <PauseCircle className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-foreground text-base">Held Carts ({heldCarts.length})</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHeldCartsModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
              {heldCarts.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">No held carts.</p>
              ) : (
                heldCarts.map((h) => {
                  const hTotal = h.items.reduce((s, i) => s + i.batch.mrp * i.quantity, 0);
                  return (
                    <div
                      key={h.id}
                      className="p-3 rounded-xl border border-border bg-muted/20 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground truncate">
                          {h.customer?.name ? `Customer: ${h.customer.name}` : "Walk-in Customer"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {h.items.length} items · Total ₹{hTotal.toFixed(2)}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {new Date(h.timestamp).toLocaleTimeString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleResumeCart(h)}
                          className="h-8 text-xs font-bold rounded-lg"
                        >
                          Resume
                        </Button>
                        <button
                          type="button"
                          onClick={() => handleDeleteHeldCart(h.id)}
                          className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Batch Conflict Modal */}
      {conflictProduct && (
        <BatchConflictModal
          product={conflictProduct}
          batches={conflictProduct.batches.filter((b) => b.stock > 0)}
          onSelect={(batch) => {
            addToCart(conflictProduct, batch);
            setConflictProduct(null);
          }}
          onClose={() => setConflictProduct(null)}
        />
      )}

      {/* Receipt / Invoice Modal */}
      {receiptData && (
        <ReceiptModal
          data={receiptData}
          onClose={() => setReceiptData(null)}
          onNewSale={() => {
            setReceiptData(null);
            setCart([]);
            setDiscountValue("");
            setSearch("");
            setSelectedCustomer(null);
            setCustomerSearch("");
            setSplitMode(false);
            setSplitCash("");
            setSplitCard("");
            setSplitUpi("");
            setSplitCredit("");
            searchRef.current?.focus();
          }}
        />
      )}

      {/* Exit POS Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4 animate-fade-in">
          <div className="bg-card rounded-2xl border border-border p-6 max-w-md w-full card-shadow-lg space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base">Active Cart in Progress</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You have {cartItemCount} item(s) (₹{total.toFixed(2)}) in your current sale.
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl border border-border">
              Would you like to hold this cart to resume later, discard it, or continue billing?
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowExitModal(false)}
                className="flex-1 rounded-xl text-xs font-semibold"
              >
                Keep Billing
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDiscardAndExit}
                className="flex-1 rounded-xl text-xs font-semibold"
              >
                Discard & Exit
              </Button>
              <Button
                type="button"
                onClick={handleHoldAndExit}
                className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
              >
                Hold & Exit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

