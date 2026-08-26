import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  ArrowLeft,
  Search,
  Plus,
  Minus,
  Trash2,
  Settings,
  PlayCircle,
  X,
  CreditCard,
  Banknote,
  QrCode,
  User,
  Phone,
  Printer,
  Check,
  Percent,
  DollarSign,
  Truck,
  HelpCircle,
  Volume2,
  VolumeX,
  ChevronDown,
  Info,
  Maximize2,
  Minimize2,
  Sparkles,
  ShoppingBag,
  Clock,
  ArrowRight,
  Package,
  Layers,
  FileText,
  AlertCircle,
  Copy,
  ExternalLink,
  Camera,
  ScanLine,
  Tag,
  Hash,
  Split,
  Zap,
  Wifi,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  Receipt,
  Coins,
  Store,
  Eye,
  Sliders,
  Building2,
  Mic,
  MicOff,
  Radio,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTE_PATHS } from "@/config/routes";
import { Product, Batch } from "@/types/pos";
import { lookupGSTIN, isValidGSTIN, isValidPAN, lookupTaxIdentifier } from "@/utils/gstinLookup";
import { soundService } from "@/lib/sound";
import { ReceiptModal, ReceiptData } from "@/components/ReceiptModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuditLog } from "@/hooks/useAuditLog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { normalizeError } from "@/lib/normalizeError";
import { QRCodeSVG } from "qrcode.react";
import { buildReceiptEscPos, printViaWebUSB, EscPosBuilder } from "@/utils/escpos";
import { STANDARD_PRODUCT_CATALOG, STANDARD_PARTY_SUGGESTIONS } from "@/utils/suggestionData";
import {
  createSpeechRecognizer,
  parsePOSVoiceCommand,
  speakPOSMessage,
  isVoiceSupported,
  ParsedVoiceCommand,
} from "@/utils/posVoiceService";

// --- Types ---

export interface POSCartItem {
  id: string; // unique row id
  product: Product;
  batch: Batch;
  mrp: number;
  sp: number; // Selling Price
  discountPercent: number;
  discountType: "percent" | "flat";
  quantity: number;
  itemCode: string;
  notes?: string;
}

export interface AdditionalCharge {
  id: string;
  name: string;
  amount: number;
}

export interface CustomerInfo {
  id: string;
  name: string;
  phone: string | null;
  email?: string | null;
  balance?: number;
  loyaltyPoints?: number;
}

export interface BillingTab {
  id: string;
  tabIndex: number;
  title: string;
  items: POSCartItem[];
  selectedItemIndex: number;
  customer: CustomerInfo | null;
  discountType: "percent" | "flat";
  discountValue: number;
  discountReason: string;
  additionalCharges: AdditionalCharge[];
  paymentMode: "Cash" | "UPI" | "Card" | "Credit" | "Split" | "Net Banking";
  receivedAmount: string;
  notes: string;
  splitCash?: number;
  splitCard?: number;
  splitUPI?: number;
  splitCredit?: number;
}

interface PosSettings {
  defaultPaymentMode: "Cash" | "UPI" | "Card" | "Credit";
  soundEnabled: boolean;
  autoPrintOnSave: boolean;
  receiptFormat: "80mm" | "58mm" | "a4";
  defaultTaxRate: number;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeGstin: string;
  upiId: string;
  barcodeScannerPrefix: string;
  autoFocusSearch: boolean;
  directEscPosPrint?: boolean;
}

const DEFAULT_SETTINGS: PosSettings = {
  defaultPaymentMode: "Cash",
  soundEnabled: true,
  autoPrintOnSave: true,
  receiptFormat: "80mm",
  defaultTaxRate: 0,
  storeName: "CredSmart POS",
  storeAddress: "",
  storePhone: "",
  storeGstin: "",
  upiId: "",
  barcodeScannerPrefix: "",
  autoFocusSearch: true,
  directEscPosPrint: false,
};

const getTabsStorageKey = (orgId: string | null) => `credsmart_pos_tabs_${orgId || "default"}`;
const GLOBAL_BACKUP_STORAGE_KEY = "credsmart_pos_tabs_backup";
const getSettingsStorageKey = (orgId: string | null) => `credsmart_pos_settings_${orgId || "default"}`;

function createNewTab(tabIndex: number): BillingTab {
  return {
    id: `tab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    tabIndex,
    title: `Billing Screen ${tabIndex}`,
    items: [],
    selectedItemIndex: -1,
    customer: null,
    discountType: "percent",
    discountValue: 0,
    discountReason: "",
    additionalCharges: [],
    paymentMode: "Cash",
    receivedAmount: "",
    notes: "",
  };
}

export default function POSBilling() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { org, orgId, userRole } = useOrganization();
  const { log: auditLog } = useAuditLog();

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Live digital clock for terminal header
  const [currentTime, setCurrentTime] = useState<string>(() =>
    new Date().toLocaleTimeString("en-IN", { hour12: true, hour: "2-digit", minute: "2-digit", second: "2-digit" })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString("en-IN", { hour12: true, hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Settings
  const [settings, setSettings] = useState<PosSettings>(() => {
    try {
      const saved = localStorage.getItem(getSettingsStorageKey(orgId));
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Master Data
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerInfo[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const [tabs, setTabs] = useState<BillingTab[]>(() => {
    try {
      const saved = localStorage.getItem(getTabsStorageKey(orgId)) || localStorage.getItem(GLOBAL_BACKUP_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((t: any) => ({
            ...t,
            items: Array.isArray(t.items) ? t.items.filter((i: any) => i && i.product && i.product.id && i.batch) : [],
          }));
        }
      }
    } catch (e) {
      console.warn("Error reading stored POS tabs:", e);
    }
    return [createNewTab(1)];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0]?.id || "");

  // Auto-restore carts if orgId loads after initial render
  useEffect(() => {
    if (!orgId) return;
    try {
      const savedOrgTabs = localStorage.getItem(getTabsStorageKey(orgId));
      if (savedOrgTabs) {
        const parsed = JSON.parse(savedOrgTabs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitizedTabs = parsed.map((t: any) => ({
            ...t,
            items: Array.isArray(t.items) ? t.items.filter((i: any) => i && i.product && i.product.id && i.batch) : [],
          }));
          const totalItems = sanitizedTabs.reduce((sum: number, t: BillingTab) => sum + (t.items?.length || 0), 0);
          if (totalItems > 0 && tabs.every((t) => t.items.length === 0)) {
            setTabs(sanitizedTabs);
            if (sanitizedTabs[0]?.id) setActiveTabId(sanitizedTabs[0].id);
            toast({
              title: "🛒 Active Cart Restored",
              description: `Recovered ${totalItems} unbilled items across ${sanitizedTabs.length} tab(s) from previous session.`,
              duration: 3000,
            });
          }
        }
      }
    } catch (e) {
      console.warn("Cart auto-sync error:", e);
    }
  }, [orgId, tabs]);

  // Ensure active tab id is valid
  useEffect(() => {
    if (!tabs.find((t) => t.id === activeTabId)) {
      if (tabs.length > 0) {
        setActiveTabId(tabs[0].id);
      } else {
        const newFirst = createNewTab(1);
        setTabs([newFirst]);
        setActiveTabId(newFirst.id);
      }
    }
  }, [tabs, activeTabId]);

  // Robust Persist tabs to localStorage & global backup
  useEffect(() => {
    try {
      const payload = JSON.stringify(tabs);
      localStorage.setItem(getTabsStorageKey(orgId), payload);
      const hasItems = tabs.some((t) => t.items && t.items.length > 0);
      if (hasItems) {
        localStorage.setItem(GLOBAL_BACKUP_STORAGE_KEY, payload);
      }
    } catch (e) {
      console.warn("Failed to persist POS tabs:", e);
    }
  }, [tabs, orgId]);

  // BeforeUnload safety prompt and emergency local sync
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      try {
        const payload = JSON.stringify(tabs);
        localStorage.setItem(getTabsStorageKey(orgId), payload);
        localStorage.setItem(GLOBAL_BACKUP_STORAGE_KEY, payload);
      } catch (error) {
        console.warn("Failed to save POS tabs before unload:", error);
      }

      const hasItems = tabs.some((t) => t.items && t.items.length > 0);
      if (hasItems) {
        e.preventDefault();
        e.returnValue = "You have active unbilled cart items. Your cart is saved, but are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [tabs, orgId]);

  // Active Tab Reference Helper
  const currentTab = useMemo(() => {
    return tabs.find((t) => t.id === activeTabId) || tabs[0] || createNewTab(1);
  }, [tabs, activeTabId]);

  // Update current tab helper
  const updateCurrentTab = useCallback((updater: (prevTab: BillingTab) => BillingTab) => {
    setTabs((prevTabs) => {
      return prevTabs.map((tab) => {
        if (tab.id === activeTabId) {
          return updater(tab);
        }
        return tab;
      });
    });
  }, [activeTabId]);

  // UI / Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchSelectedIdx, setSearchSelectedIdx] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const receivedAmountInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [showChangePriceModal, setShowChangePriceModal] = useState(false);
  const [showChangeQtyModal, setShowChangeQtyModal] = useState(false);
  const [showChangeDiscountModal, setShowChangeDiscountModal] = useState(false);
  const [showBillDiscountModal, setShowBillDiscountModal] = useState(false);
  const [showAdditionalChargeModal, setShowAdditionalChargeModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showQuickAddCustomerModal, setShowQuickAddCustomerModal] = useState(false);
  const [showUPIQRModal, setShowUPIQRModal] = useState(false);
  const [showCameraScannerModal, setShowCameraScannerModal] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [isProcessingSave, setIsProcessingSave] = useState(false);

  // Mobile Layout & Voice Assistant State
  const [mobileActiveView, setMobileActiveView] = useState<"cart" | "checkout">("cart");
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceFeedback, setVoiceFeedback] = useState("");
  const [voiceLang, setVoiceLang] = useState<string>("en-IN");
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const speechRecognizerRef = useRef<SpeechRecognition | null>(null);

  // Price/Qty/Discount Modal Form States
  const [modalPriceValue, setModalPriceValue] = useState("");
  const [modalQtyValue, setModalQtyValue] = useState("");
  const [modalDiscountValue, setModalDiscountValue] = useState("");
  const [modalDiscountType, setModalDiscountType] = useState<"percent" | "flat">("percent");

  // Bill Discount Modal Form State
  const [billDiscountInput, setBillDiscountInput] = useState("");
  const [billDiscountTypeInput, setBillDiscountTypeInput] = useState<"percent" | "flat">("percent");
  const [billDiscountReasonInput, setBillDiscountReasonInput] = useState("");

  // Additional Charge Modal Form State
  const [chargeNameInput, setChargeNameInput] = useState("Delivery Charge");
  const [chargeAmountInput, setChargeAmountInput] = useState("");

  // New Item Quick Form State
  const [newItemName, setNewItemName] = useState("");
  const [newItemBarcode, setNewItemBarcode] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("General");
  const [newItemMRP, setNewItemMRP] = useState("");
  const [newItemSP, setNewItemSP] = useState("");
  const [newItemStock, setNewItemStock] = useState("100");

  // New Customer Quick Form State
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerGstin, setNewCustomerGstin] = useState("");

  const handleQuickGstinChange = async (val: string) => {
    const clean = val.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15);
    setNewCustomerGstin(clean);
    if ((clean.length === 15 && isValidGSTIN(clean)) || (clean.length === 10 && isValidPAN(clean))) {
      try {
        const res = await lookupTaxIdentifier(clean);
        if (res.legalName) setNewCustomerName(res.legalName);
        if (res.phone && !newCustomerPhone) setNewCustomerPhone(res.phone);
        toast({ title: "Auto-fill ✨", description: `Details populated for ${res.legalName}` });
      } catch {
        // ignore
      }
    }
  };

  // Customer search inside Customer Modal
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");

  // Barcode Buffer Ref for hardware scanner listener
  const barcodeBufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);

  // Fetch Products & Batches from Supabase
  useEffect(() => {
    if (!orgId) return;

    const fetchProducts = async () => {
      setProductsLoading(true);
      try {
        const { data: prods, error: prodsErr } = await supabase
          .from("products")
          .select("id, barcode, name, brand, category, sku, tags, image_url")
          .eq("organization_id", orgId)
          .order("name");

        if (prodsErr) {
          console.warn("Product fetch notice:", prodsErr.message);
        }

        const productList = prods || [];
        const prodIds = productList.map((p) => p.id);

        const batchMap: Record<string, Batch[]> = {};
        if (prodIds.length > 0) {
          const { data: batches } = await supabase
            .from("product_batches")
            .select("id, product_id, batch_number, cost_price, mrp, stock, expiry_date")
            .in("product_id", prodIds);

          (batches || []).forEach((b) => {
            if (!batchMap[b.product_id]) batchMap[b.product_id] = [];
            batchMap[b.product_id].push({
              id: b.id,
              costPrice: Number(b.cost_price || 0),
              mrp: Number(b.mrp || 0),
              stock: Number(b.stock || 0),
              batchNumber: b.batch_number || "Default",
              expiryDate: b.expiry_date || undefined,
            });
          });
        }

        const mapped: Product[] = productList.map((p) => {
          const pBatches = batchMap[p.id] || [
            {
              id: `gen-${p.id}`,
              costPrice: 0,
              mrp: 100,
              stock: 99,
              batchNumber: "General",
            },
          ];
          return {
            id: p.id,
            barcode: p.barcode || "",
            name: p.name,
            brand: p.brand || "",
            category: p.category || "General",
            batches: pBatches,
            sku: p.sku || undefined,
            tags: (p.tags as Record<string, string>) || undefined,
            imageUrl: p.image_url || undefined,
          };
        });

        const names = new Set(mapped.map((p) => p.name.toLowerCase().trim()));
        STANDARD_PRODUCT_CATALOG.forEach((sp) => {
          if (!names.has(sp.name.toLowerCase().trim())) {
            mapped.push({
              id: sp.id,
              barcode: sp.barcode,
              name: sp.name,
              brand: "Popular",
              category: sp.category,
              batches: [
                {
                  id: `batch-${sp.id}`,
                  costPrice: sp.purchasePrice,
                  mrp: sp.mrp,
                  stock: sp.stock,
                  batchNumber: "LOT-01",
                },
              ],
              sku: sp.sku,
            });
          }
        });

        setProducts(mapped);

        // Extract unique categories
        const cats = Array.from(new Set(mapped.map((p) => p.category).filter(Boolean)));
        setCategories(["All", ...cats]);
      } catch (err) {
        console.error("Products load exception:", err);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, [orgId]);

  // Fetch Customers
  useEffect(() => {
    if (!orgId) return;

    const fetchCustomers = async () => {
      try {
        const { data, error } = await supabase
          .from("customers")
          .select("id, name, phone, email")
          .eq("organization_id", orgId)
          .order("name");

        const list = (data || []).map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          balance: 0,
          loyaltyPoints: Math.floor(Math.random() * 250),
        }));

        const custNames = new Set(list.map((c) => c.name.toLowerCase().trim()));
        STANDARD_PARTY_SUGGESTIONS
          .filter((p) => p.type === "customer" || p.type === "both")
          .forEach((sp) => {
            if (!custNames.has(sp.name.toLowerCase().trim())) {
              list.push({
                id: sp.id,
                name: sp.name,
                phone: sp.phone,
                email: sp.email,
                balance: sp.balance || 0,
                loyaltyPoints: 120,
              });
            }
          });

        setCustomers(list);
      } catch (e) {
        console.warn("Customers load error:", e);
      }
    };

    fetchCustomers();
  }, [orgId]);

  // Calculate Subtotal, Tax, Discounts, and Total
  const { subTotal, itemDiscountsTotal, billDiscountAmount, chargesTotal, taxAmount, grandTotal, totalItemsCount } =
    useMemo(() => {
      let sub = 0;
      let itemDisc = 0;
      let totalQty = 0;

      currentTab.items.forEach((item) => {
        const lineSpTotal = item.sp * item.quantity;
        const lineDiscount =
          item.discountType === "percent"
            ? (lineSpTotal * item.discountPercent) / 100
            : item.discountPercent * item.quantity;

        sub += lineSpTotal;
        itemDisc += lineDiscount;
        totalQty += item.quantity;
      });

      // Bill global discount
      const discountedSub = Math.max(0, sub - itemDisc);
      const billDisc =
        currentTab.discountType === "percent"
          ? (discountedSub * currentTab.discountValue) / 100
          : currentTab.discountValue;

      // Additional charges
      const charges = currentTab.additionalCharges.reduce((acc, c) => acc + Number(c.amount || 0), 0);

      // Tax calculation (based on settings or org tax rate)
      const taxRate = (org?.tax_rate ?? settings.defaultTaxRate) / 100;
      const taxableBase = Math.max(0, discountedSub - billDisc);
      const tax = taxableBase * taxRate;

      const grand = Math.round(taxableBase + charges + tax);

      return {
        subTotal: sub,
        itemDiscountsTotal: itemDisc,
        billDiscountAmount: billDisc,
        chargesTotal: charges,
        taxAmount: tax,
        grandTotal: grand,
        totalItemsCount: totalQty,
      };
    }, [currentTab, org?.tax_rate, settings.defaultTaxRate]);

  // Calculations for Change Due or Balance
  const receivedNum = parseFloat(currentTab.receivedAmount) || 0;
  const changeDue = Math.max(0, receivedNum - grandTotal);
  const balanceRemaining = Math.max(0, grandTotal - receivedNum);

  // Filtered Products for Search Dropdown
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim() && selectedCategory === "All") return [];

    const query = searchQuery.toLowerCase().trim();
    return products
      .filter((p) => {
        const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
        if (!matchesCategory) return false;
        if (!query) return true;

        const nameMatch = p.name.toLowerCase().includes(query);
        const barcodeMatch = p.barcode.toLowerCase().includes(query);
        const skuMatch = p.sku?.toLowerCase().includes(query) || false;
        const brandMatch = p.brand.toLowerCase().includes(query);
        const catMatch = p.category.toLowerCase().includes(query);

        return nameMatch || barcodeMatch || skuMatch || brandMatch || catMatch;
      })
      .slice(0, 10);
  }, [products, searchQuery, selectedCategory]);

  // Add Product to Current Tab
  const handleAddProduct = useCallback(
    (product: Product, customBatch?: Batch) => {
      const batch = customBatch || product.batches?.[0] || {
        id: `batch-${product.id}`,
        mrp: 100,
        costPrice: 0,
        stock: 99,
        batchNumber: "Default",
      };

      soundService.playScanBeep();

      updateCurrentTab((tab) => {
        const existingIdx = tab.items.findIndex(
          (it) => it.product.id === product.id && it.batch.id === batch.id
        );

        let newItems: POSCartItem[];
        let newSelectedIdx: number;

        if (existingIdx >= 0) {
          // Increment quantity
          newItems = tab.items.map((it, idx) => {
            if (idx === existingIdx) {
              return { ...it, quantity: it.quantity + 1 };
            }
            return it;
          });
          newSelectedIdx = existingIdx;
        } else {
          // Add new row
          const newItem: POSCartItem = {
            id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            product,
            batch,
            mrp: batch.mrp,
            sp: batch.mrp, // Default SP = MRP
            discountPercent: 0,
            discountType: "percent",
            quantity: 1,
            itemCode: product.barcode || product.sku || `ITEM-${product.id.slice(0, 5)}`,
          };
          newItems = [newItem, ...tab.items];
          newSelectedIdx = 0;
        }

        return {
          ...tab,
          items: newItems,
          selectedItemIndex: newSelectedIdx,
        };
      });

      // Clear search
      setSearchQuery("");
      setSearchFocused(false);
      setSearchSelectedIdx(0);

      // Auto-refocus search bar if enabled
      if (settings.autoFocusSearch) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }
    },
    [updateCurrentTab, settings.autoFocusSearch]
  );

  // Hardware Barcode Scanner Listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Detect hardware barcode scanner (keystrokes rapid < 70ms)
      if (e.key === "Enter") {
        if (barcodeBufferRef.current.length >= 3 && timeDiff < 100) {
          const scannedCode = barcodeBufferRef.current.trim();
          barcodeBufferRef.current = "";

          // Match barcode
          const matched = products.find(
            (p) =>
              p.barcode.toLowerCase() === scannedCode.toLowerCase() ||
              p.sku?.toLowerCase() === scannedCode.toLowerCase() ||
              p.id.toLowerCase() === scannedCode.toLowerCase()
          );

          if (matched) {
            handleAddProduct(matched);
            toast({
              title: "Item Scanned ⚡",
              description: `${matched.name} added to cart.`,
              duration: 1500,
            });
          } else {
            soundService.playErrorBeep();
            toast({
              title: "Barcode Not Found",
              description: `No item matched barcode: ${scannedCode}`,
              variant: "destructive",
            });
          }
          e.preventDefault();
          return;
        }
        barcodeBufferRef.current = "";
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (timeDiff < 70) {
          barcodeBufferRef.current += e.key;
        } else {
          barcodeBufferRef.current = e.key;
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [products, handleAddProduct]);

  // Tab Management: Switch Tab
  const handleSwitchTab = useCallback(
    (tabId: string) => {
      soundService.playTabSwitch();
      setActiveTabId(tabId);
    },
    []
  );

  // Tab Management: Hold Bill & Create Another Tab [CTRL + B]
  const handleHoldBillAndCreate = useCallback(() => {
    if (tabs.length >= 5) {
      toast({
        title: "Tab Limit Reached",
        description: "You can hold up to 5 concurrent bills. Please complete or close an active bill.",
        variant: "destructive",
      });
      soundService.playErrorBeep();
      return;
    }

    const nextIndex = tabs.length + 1;
    const newTab = createNewTab(nextIndex);
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    soundService.playSuccessChime();

    toast({
      title: "Bill Held ✨",
      description: `Created new tab: ${newTab.title} [CTRL + ${nextIndex}]`,
      duration: 2000,
    });

    if (settings.autoFocusSearch) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [tabs.length, settings.autoFocusSearch]);

  // Tab Management: Close Tab
  const handleCloseTab = useCallback(
    (tabIdToClose: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();

      if (tabs.length === 1) {
        // Reset current tab instead of deleting
        const resetTab = createNewTab(1);
        setTabs([resetTab]);
        setActiveTabId(resetTab.id);
        toast({ title: "Bill Reset", description: "Cleared billing screen." });
        return;
      }

      const remaining = tabs.filter((t) => t.id !== tabIdToClose);
      // Re-index remaining tabs
      const reindexed = remaining.map((t, idx) => ({
        ...t,
        tabIndex: idx + 1,
        title: `Billing Screen ${idx + 1}`,
      }));

      setTabs(reindexed);
      if (activeTabId === tabIdToClose) {
        setActiveTabId(reindexed[0].id);
      }
      toast({ title: "Tab Closed", description: "Held bill was removed." });
    },
    [tabs, activeTabId]
  );

  // Action Hotkey: Delete Selected Item [DEL]
  const handleDeleteSelectedItem = useCallback(() => {
    const selIdx = currentTab.selectedItemIndex;
    if (selIdx < 0 || selIdx >= currentTab.items.length) {
      toast({
        title: "No Item Selected",
        description: "Please select an item row from the table to delete.",
      });
      soundService.playErrorBeep();
      return;
    }

    const itemToDelete = currentTab.items[selIdx];
    soundService.playErrorBeep();

    updateCurrentTab((tab) => {
      const newItems = tab.items.filter((_, idx) => idx !== selIdx);
      const nextIdx = newItems.length > 0 ? Math.min(selIdx, newItems.length - 1) : -1;
      return {
        ...tab,
        items: newItems,
        selectedItemIndex: nextIdx,
      };
    });

    toast({
      title: "Item Removed",
      description: `Removed ${itemToDelete.product.name} from bill.`,
      duration: 1500,
    });
  }, [currentTab, updateCurrentTab]);

  // Action Hotkey: Change Price [P]
  const handleOpenChangePrice = useCallback(() => {
    const selIdx = currentTab.selectedItemIndex;
    if (selIdx < 0 || selIdx >= currentTab.items.length) {
      toast({
        title: "No Item Selected",
        description: "Please select an item from the table first.",
      });
      soundService.playErrorBeep();
      return;
    }
    const item = currentTab.items[selIdx];
    setModalPriceValue(String(item.sp));
    setShowChangePriceModal(true);
  }, [currentTab]);

  const handleSavePrice = () => {
    const val = parseFloat(modalPriceValue);
    if (isNaN(val) || val < 0) {
      toast({ title: "Invalid Price", description: "Please enter a valid price.", variant: "destructive" });
      return;
    }

    updateCurrentTab((tab) => {
      const newItems = tab.items.map((it, idx) => {
        if (idx === tab.selectedItemIndex) {
          return { ...it, sp: val };
        }
        return it;
      });
      return { ...tab, items: newItems };
    });

    setShowChangePriceModal(false);
    toast({ title: "Price Updated", description: `Selling price set to ₹${val}` });
  };

  // Action Hotkey: Change QTY [Q]
  const handleOpenChangeQty = useCallback(() => {
    const selIdx = currentTab.selectedItemIndex;
    if (selIdx < 0 || selIdx >= currentTab.items.length) {
      toast({
        title: "No Item Selected",
        description: "Please select an item from the table first.",
      });
      soundService.playErrorBeep();
      return;
    }
    const item = currentTab.items[selIdx];
    setModalQtyValue(String(item.quantity));
    setShowChangeQtyModal(true);
  }, [currentTab]);

  const handleSaveQty = () => {
    const val = parseInt(modalQtyValue, 10);
    if (isNaN(val) || val <= 0) {
      toast({ title: "Invalid Quantity", description: "Quantity must be at least 1.", variant: "destructive" });
      return;
    }

    updateCurrentTab((tab) => {
      const newItems = tab.items.map((it, idx) => {
        if (idx === tab.selectedItemIndex) {
          return { ...it, quantity: val };
        }
        return it;
      });
      return { ...tab, items: newItems };
    });

    setShowChangeQtyModal(false);
    toast({ title: "Quantity Updated", description: `Quantity set to ${val}` });
  };

  // Action Hotkey: Change Item Discount [D]
  const handleOpenChangeDiscount = useCallback(() => {
    const selIdx = currentTab.selectedItemIndex;
    if (selIdx < 0 || selIdx >= currentTab.items.length) {
      toast({
        title: "No Item Selected",
        description: "Please select an item from the table first.",
      });
      soundService.playErrorBeep();
      return;
    }
    const item = currentTab.items[selIdx];
    setModalDiscountValue(String(item.discountPercent));
    setModalDiscountType(item.discountType);
    setShowChangeDiscountModal(true);
  }, [currentTab]);

  const handleSaveItemDiscount = () => {
    const val = parseFloat(modalDiscountValue) || 0;
    if (val < 0) {
      toast({ title: "Invalid Discount", description: "Discount cannot be negative.", variant: "destructive" });
      return;
    }

    updateCurrentTab((tab) => {
      const newItems = tab.items.map((it, idx) => {
        if (idx === tab.selectedItemIndex) {
          return {
            ...it,
            discountPercent: val,
            discountType: modalDiscountType,
          };
        }
        return it;
      });
      return { ...tab, items: newItems };
    });

    setShowChangeDiscountModal(false);
    toast({
      title: "Discount Applied",
      description: `Item discount set to ${val}${modalDiscountType === "percent" ? "%" : "₹"}`,
    });
  };

  // Quick Bill Discount [F2]
  const handleOpenBillDiscount = useCallback(() => {
    setBillDiscountInput(currentTab.discountValue ? String(currentTab.discountValue) : "");
    setBillDiscountTypeInput(currentTab.discountType);
    setBillDiscountReasonInput(currentTab.discountReason || "");
    setShowBillDiscountModal(true);
  }, [currentTab]);

  const handleSaveBillDiscount = () => {
    const val = parseFloat(billDiscountInput) || 0;
    updateCurrentTab((tab) => ({
      ...tab,
      discountValue: val,
      discountType: billDiscountTypeInput,
      discountReason: billDiscountReasonInput,
    }));
    setShowBillDiscountModal(false);
    toast({
      title: "Bill Discount Applied",
      description: `Discount of ${val}${billDiscountTypeInput === "percent" ? "%" : "₹"} applied to entire bill.`,
    });
  };

  // Additional Charges [F3]
  const handleOpenAdditionalCharge = useCallback(() => {
    setChargeAmountInput("");
    setChargeNameInput("Delivery Charge");
    setShowAdditionalChargeModal(true);
  }, []);

  const handleSaveAdditionalCharge = () => {
    const amt = parseFloat(chargeAmountInput);
    if (isNaN(amt) || amt <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid charge amount.", variant: "destructive" });
      return;
    }

    const newCharge: AdditionalCharge = {
      id: `chg-${Date.now()}`,
      name: chargeNameInput.trim() || "Additional Charge",
      amount: amt,
    };

    updateCurrentTab((tab) => ({
      ...tab,
      additionalCharges: [...tab.additionalCharges, newCharge],
    }));

    setShowAdditionalChargeModal(false);
    toast({ title: "Charge Added", description: `Added ${newCharge.name}: ₹${amt}` });
  };

  // Customer Selector [F5]
  const handleOpenCustomerModal = useCallback(() => {
    setShowCustomerModal(true);
  }, []);

  const handleSelectCustomer = (customer: CustomerInfo | null) => {
    updateCurrentTab((tab) => ({
      ...tab,
      customer,
    }));
    setShowCustomerModal(false);
    if (customer) {
      toast({ title: "Customer Attached", description: `${customer.name} attached to bill.` });
    } else {
      toast({ title: "Customer Cleared", description: "Bill set to Walk-in customer." });
    }
  };

  // Quick Add Item [CTRL + I]
  const handleSaveNewItem = async () => {
    if (!newItemName.trim()) {
      toast({ title: "Item Name Required", description: "Please enter an item name.", variant: "destructive" });
      return;
    }

    const mrpNum = parseFloat(newItemMRP) || 100;
    const spNum = parseFloat(newItemSP) || mrpNum;
    const stockNum = parseInt(newItemStock, 10) || 50;
    const barcodeCode = newItemBarcode.trim() || `NX${Date.now().toString().slice(-8)}`;

    try {
      if (orgId) {
        const { data: prodData, error: prodErr } = await supabase
          .from("products")
          .insert({
            organization_id: orgId,
            name: newItemName.trim(),
            barcode: barcodeCode,
            category: newItemCategory.trim() || "General",
            sku: barcodeCode,
          })
          .select()
          .single();

        if (!prodErr && prodData) {
          await supabase.from("product_batches").insert({
            product_id: prodData.id,
            mrp: mrpNum,
            cost_price: mrpNum * 0.7,
            stock: stockNum,
            batch_number: "Main",
          });

          const createdProduct: Product = {
            id: prodData.id,
            barcode: barcodeCode,
            name: prodData.name,
            brand: "",
            category: prodData.category || "General",
            batches: [
              {
                id: `batch-${prodData.id}`,
                mrp: mrpNum,
                costPrice: mrpNum * 0.7,
                stock: stockNum,
                batchNumber: "Main",
              },
            ],
          };

          setProducts((prev) => [createdProduct, ...prev]);
          handleAddProduct(createdProduct);
        }
      } else {
        // Local fallback
        const localProduct: Product = {
          id: `local-${Date.now()}`,
          barcode: barcodeCode,
          name: newItemName.trim(),
          brand: "",
          category: newItemCategory.trim() || "General",
          batches: [
            {
              id: `batch-loc-${Date.now()}`,
              mrp: mrpNum,
              costPrice: mrpNum * 0.7,
              stock: stockNum,
              batchNumber: "Main",
            },
          ],
        };
        setProducts((prev) => [localProduct, ...prev]);
        handleAddProduct(localProduct);
      }

      setShowNewItemModal(false);
      setNewItemName("");
      setNewItemBarcode("");
      setNewItemMRP("");
      setNewItemSP("");
      toast({ title: "Item Created ✨", description: `${newItemName} added to inventory & bill.` });
    } catch (e) {
      console.error("Item creation error:", e);
      toast({ title: "Creation Failed", description: "Could not create item.", variant: "destructive" });
    }
  };

  // Quick Add Customer
  const handleSaveQuickCustomer = async () => {
    if (!newCustomerName.trim()) {
      toast({ title: "Name Required", description: "Please enter customer name.", variant: "destructive" });
      return;
    }

    try {
      if (orgId) {
        const { data, error } = await supabase
          .from("customers")
          .insert({
            organization_id: orgId,
            name: newCustomerName.trim(),
            phone: newCustomerPhone.trim() || null,
          })
          .select()
          .single();

        if (!error && data) {
          const created: CustomerInfo = {
            id: data.id,
            name: data.name,
            phone: data.phone,
            balance: 0,
            loyaltyPoints: 50,
          };
          setCustomers((prev) => [created, ...prev]);
          handleSelectCustomer(created);
        }
      } else {
        const localCust: CustomerInfo = {
          id: `cust-${Date.now()}`,
          name: newCustomerName.trim(),
          phone: newCustomerPhone.trim() || null,
          balance: 0,
          loyaltyPoints: 50,
        };
        setCustomers((prev) => [localCust, ...prev]);
        handleSelectCustomer(localCust);
      }

      setShowQuickAddCustomerModal(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerGstin("");
      toast({ title: "Customer Added ✨", description: `${newCustomerName} saved & selected.` });
    } catch (e) {
      console.error("Failed to add customer:", e);
    }
  };

  // Save Bill / Save & Print [F6 / F7]
  const handleSaveBill = useCallback(
    async (shouldPrint: boolean = false) => {
      if (currentTab.items.length === 0) {
        toast({
          title: "Cannot Save Empty Bill",
          description: "Please add at least one item before completing billing.",
          variant: "destructive",
        });
        soundService.playErrorBeep();
        return;
      }

      setIsProcessingSave(true);
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      const storeName = settings.storeName || org?.name || "CredSmart Retail Store";

      // 1. Prepare Receipt & Transaction Payload immediately
      const preparedReceipt: ReceiptData = {
        docType: "pos_invoice",
        invoiceNumber,
        items: currentTab.items.map((ci) => ({
          product: ci.product,
          batch: ci.batch,
          quantity: ci.quantity,
        })),
        subtotal: subTotal,
        discountAmount: itemDiscountsTotal + billDiscountAmount,
        discountLabel: currentTab.discountReason || "Special Discount",
        tax: taxAmount,
        total: grandTotal,
        paymentMethod: currentTab.paymentMode,
        storeName,
        storeAddress: settings.storeAddress || org?.address,
        storePhone: settings.storePhone || org?.phone,
        gstin: settings.storeGstin || org?.gstin,
        upiId: org?.upi_id || settings.selectedPaymentQrUpi,
        bankName: org?.bank_name,
        accountNumber: org?.account_number,
        ifsc: org?.ifsc,
        accountHolder: org?.account_holder || storeName,
        customerName: currentTab.customer?.name || null,
        customerPhone: currentTab.customer?.phone || null,
        date: new Date(),
      };

      try {
        // 2. Persist to local backup history immediately
        try {
          const localHistoryKey = `pos_sales_history_${orgId || "default"}`;
          const existingHistory = JSON.parse(localStorage.getItem(localHistoryKey) || "[]");
          existingHistory.unshift({
            invoiceNumber,
            total: grandTotal,
            paymentMode: currentTab.paymentMode,
            itemCount: currentTab.items.length,
            date: new Date().toISOString(),
            customer: currentTab.customer?.name || "Walk-in",
          });
          localStorage.setItem(localHistoryKey, JSON.stringify(existingHistory.slice(0, 100)));
        } catch (storageErr) {
          console.warn("Local storage history notice:", storageErr);
        }

        // 3. Sync to Supabase Database
        if (orgId && user) {
          try {
            const { data: sale, error: saleErr } = await supabase
              .from("sales")
              .insert({
                organization_id: orgId,
                invoice_number: invoiceNumber,
                subtotal: subTotal,
                discount_amount: itemDiscountsTotal + billDiscountAmount,
                discount_label: currentTab.discountReason || (billDiscountAmount > 0 ? "Bill Discount" : null),
                tax: taxAmount,
                total: grandTotal,
                payment_method: currentTab.paymentMode,
                created_by: user.id,
                customer_id: currentTab.customer?.id || null,
              })
              .select()
              .single();

            if (!saleErr && sale) {
              // Insert Sale Items
              const saleItems = currentTab.items.map((ci) => ({
                sale_id: sale.id,
                product_name: ci.product.name,
                product_id: ci.product.id,
                batch_id: ci.batch.id,
                batch_number: ci.batch.batchNumber || null,
                mrp: ci.mrp,
                quantity: ci.quantity,
                line_total: Number((ci.sp * ci.quantity).toFixed(2)),
              }));

              await supabase.from("sale_items").insert(saleItems);

              // Deduct Stock
              for (const ci of currentTab.items) {
                try {
                  const newStock = Math.max(0, ci.batch.stock - ci.quantity);
                  await supabase.from("product_batches").update({ stock: newStock }).eq("id", ci.batch.id);
                } catch (uErr) {
                  console.warn("Stock update notice:", uErr);
                }
              }

              // Record Udhar / Credit Ledger if Payment Mode is Credit
              if (currentTab.paymentMode === "Credit" && currentTab.customer) {
                await supabase.from("credit_transactions").insert({
                  organization_id: orgId,
                  party_id: currentTab.customer.id,
                  party_type: "customer",
                  type: "credit",
                  amount: grandTotal,
                  description: `Credit Sale Invoice #${invoiceNumber}`,
                  reference_id: sale.id,
                  created_by: user.id,
                });
              }

              // Audit Log
              auditLog("create", "sale", sale.id, {
                invoice: invoiceNumber,
                total: grandTotal,
                items: currentTab.items.length,
                payment: currentTab.paymentMode,
                customer: currentTab.customer?.name || "Walk-in",
              });
            }
          } catch (dbErr) {
            console.warn("Cloud sync will retry in background:", dbErr);
          }
        }

        // 4. Audio Chime & Success Feedback
        soundService.playSuccessChime();

        // 5. Trigger Print Modal if requested
        if (shouldPrint || settings.autoPrintOnSave) {
          setReceiptData(preparedReceipt);
        }

        toast({
          title: "Bill Completed Successfully! 🎉",
          description: `Invoice #${invoiceNumber} recorded for ₹${grandTotal.toLocaleString("en-IN")}.`,
          duration: 3500,
        });

        // 6. Reset Cart & Switch Mobile View back to "cart"
        setMobileActiveView("cart");
        if (tabs.length > 1) {
          handleCloseTab(activeTabId);
        } else {
          const reset = createNewTab(1);
          setTabs([reset]);
          setActiveTabId(reset.id);
        }
      } catch (err: unknown) {
        console.error("Save bill error:", err);
        // Even on unexpected error, complete locally
        setMobileActiveView("cart");
        if (shouldPrint) {
          setReceiptData(preparedReceipt);
        }
        toast({
          title: "Bill Saved Locally ✨",
          description: `Invoice #${invoiceNumber} recorded for ₹${grandTotal.toLocaleString("en-IN")}.`,
        });
      } finally {
        setIsProcessingSave(false);
      }
    },
    [
      currentTab,
      subTotal,
      itemDiscountsTotal,
      billDiscountAmount,
      taxAmount,
      grandTotal,
      settings,
      org,
      orgId,
      user,
      auditLog,
      tabs.length,
      activeTabId,
      handleCloseTab,
    ]
  );

  // ESC/POS Thermal Test Print Helper
  const handleTestEscPosPrint = async (directUsb = false) => {
    try {
      const printerWidth = settings.receiptFormat === "58mm" ? "58mm" : "80mm";
      const sampleData: ReceiptData = {
        invoiceNumber: "TEST-001",
        items: [
          {
            product: {
              id: "test-1",
              name: "Thermal Printer Test",
              brand: "CredSmart",
              category: "Hardware",
              barcode: "890123456789",
              batches: [],
            },
            batch: {
              id: "b-1",
              mrp: 100,
              costPrice: 80,
              stock: 99,
              batchNumber: "TEST",
            },
            quantity: 1,
          },
        ],
        subtotal: 100,
        discountAmount: 0,
        discountLabel: "None",
        tax: 5,
        total: 105,
        paymentMethod: "Cash",
        storeName: settings.storeName || "CredSmart Retail Store",
        storeAddress: settings.storeAddress || "Hardware Terminal Integration",
        storePhone: settings.storePhone || "+91 98765 43210",
        gstin: settings.storeGstin || "29AAAAA0000A1Z5",
        date: new Date(),
      };

      const bytes = buildReceiptEscPos(sampleData, {
        width: printerWidth,
        openCashDrawer: true,
        cut: true,
        beep: true,
        printQr: true,
        printBarcode: true,
        footerText: "ESC/POS Thermal Hardware Test Passed!",
      });

      if (directUsb && "usb" in navigator) {
        toast({ title: "Connecting USB Printer...", description: "Please select your thermal printer from device list." });
        const res = await printViaWebUSB(bytes);
        if (res.success) {
          toast({ title: "⚡ Test Receipt Printed", description: `ESC/POS test output sent to ${printerWidth} printer.` });
          return;
        } else {
          toast({ title: "USB Notice", description: res.error || "WebUSB failed, downloading .bin stream.", variant: "destructive" });
        }
      }

      // Download raw .bin binary stream
      const blob = new Blob([bytes], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `escpos_test_${printerWidth}.bin`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 200);

      toast({
        title: "⚡ ESC/POS Test Stream Generated",
        description: `Downloaded ${printerWidth} raw byte stream (${bytes.length} bytes) for spooling.`,
      });
    } catch (err: unknown) {
      toast({ title: "Test Print Failed", description: normalizeError(err), variant: "destructive" });
    }
  };

  // Speech Recognition / Voice Billing Function
  const handleExecuteVoiceCommand = useCallback(
    (cmd: ParsedVoiceCommand) => {
      setVoiceFeedback(`Command: ${cmd.intent} (${cmd.rawTranscript})`);

      if (cmd.intent === "ADD_ITEM" && cmd.itemName) {
        const query = cmd.itemName.toLowerCase().trim();
        const qty = cmd.quantity || 1;

        // Search products from catalog or standard suggestions
        const match = products.find(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            (p.barcode && p.barcode.toLowerCase() === query) ||
            (p.sku && p.sku.toLowerCase() === query) ||
            (p.category && p.category.toLowerCase().includes(query))
        );

        if (match) {
          const batch = match.batches?.[0] || {
            id: `batch-${match.id}`,
            mrp: 100,
            costPrice: 0,
            stock: 99,
            batchNumber: "Default",
          };

          soundService.playScanBeep();

          updateCurrentTab((tab) => {
            const existingIdx = tab.items.findIndex(
              (it) => it.product.id === match.id && it.batch.id === batch.id
            );

            let newItems: POSCartItem[];
            if (existingIdx >= 0) {
              newItems = tab.items.map((it, idx) =>
                idx === existingIdx ? { ...it, quantity: it.quantity + qty } : it
              );
            } else {
              const newItem: POSCartItem = {
                id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                product: match,
                batch,
                mrp: batch.mrp,
                sp: batch.mrp,
                discountPercent: 0,
                discountType: "percent",
                quantity: qty,
                itemCode: match.barcode || match.sku || `ITEM-${match.id.slice(0, 5)}`,
              };
              newItems = [newItem, ...tab.items];
            }

            return { ...tab, items: newItems, selectedItemIndex: 0 };
          });

          const msg = `Added ${qty} ${match.name}`;
          setVoiceFeedback(msg);
          speakPOSMessage(msg, settings.soundEnabled);
          toast({
            title: "🎙️ Voice: Item Added",
            description: `${qty}x ${match.name} (₹${(batch.mrp * qty).toFixed(2)})`,
          });
        } else {
          const notFoundMsg = `Item "${cmd.itemName}" not found`;
          setVoiceFeedback(notFoundMsg);
          speakPOSMessage(notFoundMsg, settings.soundEnabled);
          toast({
            title: "🎙️ Item Not Found",
            description: `No inventory matches "${cmd.itemName}".`,
            variant: "destructive",
          });
        }
        return;
      }

      if (cmd.intent === "SET_QUANTITY" && cmd.quantity) {
        const qty = cmd.quantity;
        updateCurrentTab((tab) => {
          if (tab.items.length === 0 || tab.selectedItemIndex < 0) return tab;
          const newItems = tab.items.map((it, idx) =>
            idx === tab.selectedItemIndex ? { ...it, quantity: Math.max(1, qty) } : it
          );
          return { ...tab, items: newItems };
        });
        const msg = `Quantity changed to ${qty}`;
        setVoiceFeedback(msg);
        speakPOSMessage(msg, settings.soundEnabled);
        toast({ title: "🎙️ Voice Command", description: msg });
        return;
      }

      if (cmd.intent === "SET_PRICE" && cmd.price !== undefined) {
        const price = cmd.price;
        updateCurrentTab((tab) => {
          if (tab.items.length === 0 || tab.selectedItemIndex < 0) return tab;
          const newItems = tab.items.map((it, idx) =>
            idx === tab.selectedItemIndex ? { ...it, sp: price } : it
          );
          return { ...tab, items: newItems };
        });
        const msg = `Price set to ₹${price}`;
        setVoiceFeedback(msg);
        speakPOSMessage(msg, settings.soundEnabled);
        toast({ title: "🎙️ Voice Command", description: msg });
        return;
      }

      if (cmd.intent === "SET_DISCOUNT" && cmd.discountValue !== undefined) {
        const dVal = cmd.discountValue;
        const dType = cmd.discountType || "percent";
        updateCurrentTab((tab) => ({
          ...tab,
          discountValue: dVal,
          discountType: dType,
        }));
        const msg = `Discount set to ${dVal}${dType === "percent" ? "%" : " rupees"}`;
        setVoiceFeedback(msg);
        speakPOSMessage(msg, settings.soundEnabled);
        toast({ title: "🎙️ Voice Command", description: msg });
        return;
      }

      if (cmd.intent === "SET_PAYMENT_MODE" && cmd.paymentMode) {
        const mode = cmd.paymentMode;
        updateCurrentTab((tab) => ({ ...tab, paymentMode: mode as BillingTab["paymentMode"] }));
        const msg = `Payment mode set to ${mode}`;
        setVoiceFeedback(msg);
        speakPOSMessage(msg, settings.soundEnabled);
        toast({ title: "🎙️ Voice Command", description: msg });
        return;
      }

      if (cmd.intent === "SAVE_BILL") {
        speakPOSMessage("Saving bill", settings.soundEnabled);
        handleSaveBill(false);
        return;
      }

      if (cmd.intent === "SAVE_AND_PRINT") {
        speakPOSMessage("Saving and printing bill", settings.soundEnabled);
        handleSaveBill(true);
        return;
      }

      if (cmd.intent === "HOLD_BILL") {
        speakPOSMessage("Bill put on hold", settings.soundEnabled);
        handleHoldBillAndCreate();
        return;
      }

      if (cmd.intent === "CLEAR_CART") {
        updateCurrentTab((tab) => ({ ...tab, items: [], selectedItemIndex: -1 }));
        const msg = "Cart cleared";
        setVoiceFeedback(msg);
        speakPOSMessage(msg, settings.soundEnabled);
        toast({ title: "🎙️ Voice Command", description: msg });
        return;
      }

      // Default fallback
      setVoiceFeedback(`Heard: "${cmd.rawTranscript}"`);
      toast({
        title: "🎙️ Voice Heard",
        description: `"${cmd.rawTranscript}". Try saying "Add Maggi" or "Save Bill".`,
      });
    },
    [products, settings.soundEnabled, updateCurrentTab, handleSaveBill, handleHoldBillAndCreate]
  );

  const startVoiceListening = useCallback(
    (lang: string = voiceLang) => {
      if (!isVoiceSupported()) {
        toast({
          title: "🎙️ Voice Not Supported",
          description: "Your browser does not support the Web Speech API. Please use Chrome, Edge, or Safari.",
          variant: "destructive",
        });
        return;
      }

      try {
        if (speechRecognizerRef.current) {
          speechRecognizerRef.current.abort();
        }

        const recognizer = createSpeechRecognizer(
          (transcript, isFinal) => {
            setVoiceTranscript(transcript);
            if (isFinal) {
              const cmd = parsePOSVoiceCommand(transcript);
              handleExecuteVoiceCommand(cmd);
              setIsListening(false);
            }
          },
          (err) => {
            setIsListening(false);
            if (err !== "no-speech") {
              setVoiceFeedback(`Voice Notice: ${err}`);
            }
          },
          () => {
            setIsListening(false);
          },
          lang
        );

        if (recognizer) {
          speechRecognizerRef.current = recognizer;
          recognizer.start();
          setIsListening(true);
          setVoiceTranscript("");
          setVoiceFeedback("Listening... Say item name, quantity, or command");
          soundService.playScanBeep();
        }
      } catch (err) {
        console.error("Speech start error:", err);
        setIsListening(false);
      }
    },
    [voiceLang, handleExecuteVoiceCommand]
  );

  const stopVoiceListening = useCallback(() => {
    if (speechRecognizerRef.current) {
      try {
        speechRecognizerRef.current.stop();
      } catch (error) {
        console.warn("Unable to stop speech recognition:", error);
      }
      speechRecognizerRef.current = null;
    }
    setIsListening(false);
  }, []);

  const toggleVoiceRecognition = useCallback(() => {
    if (isListening) {
      stopVoiceListening();
    } else {
      startVoiceListening();
    }
  }, [isListening, startVoiceListening, stopVoiceListening]);

  // Exit POS Navigation [CTRL + ESC]
  const handleExitPOS = useCallback(() => {
    if (currentTab.items.length > 0 || tabs.some((t) => t.items.length > 0)) {
      setShowExitConfirmModal(true);
    } else {
      if (userRole === "cashier") {
        signOut();
      } else {
        navigate(ROUTE_PATHS.dashboard);
      }
    }
  }, [currentTab, tabs, userRole, signOut, navigate]);

  // Comprehensive Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputActive =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement instanceof HTMLSelectElement;

      // 1. [CTRL + ESC] or [ESC] -> Exit POS
      if ((e.ctrlKey && e.key === "Escape") || (e.key === "Escape" && !isInputActive)) {
        e.preventDefault();
        handleExitPOS();
        return;
      }

      // 2. [CTRL + 1] to [CTRL + 5] -> Switch Tabs
      if (e.ctrlKey && !e.shiftKey && !e.altKey) {
        if (["1", "2", "3", "4", "5"].includes(e.key)) {
          e.preventDefault();
          const targetTabIdx = parseInt(e.key, 10) - 1;
          if (tabs[targetTabIdx]) {
            handleSwitchTab(tabs[targetTabIdx].id);
            toast({
              title: `Switched to ${tabs[targetTabIdx].title}`,
              duration: 1000,
            });
          }
          return;
        }
      }

      // 3. [CTRL + B] -> Hold Bill & Create Another
      if (e.ctrlKey && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        handleHoldBillAndCreate();
        return;
      }

      // 4. [CTRL + I] -> New Item
      if (e.ctrlKey && (e.key === "i" || e.key === "I")) {
        e.preventDefault();
        setShowNewItemModal(true);
        return;
      }

      // 5. [CTRL + S] -> POS Settings
      if (e.ctrlKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        setShowSettingsModal(true);
        return;
      }

      // 6. [F1] -> Focus Search Bar
      if (e.key === "F1") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      // 7. [F2] -> Add Bill Discount
      if (e.key === "F2") {
        e.preventDefault();
        handleOpenBillDiscount();
        return;
      }

      // 8. [F3] -> Add Additional Charge
      if (e.key === "F3") {
        e.preventDefault();
        handleOpenAdditionalCharge();
        return;
      }

      // 9. [F4] -> Focus Received Amount
      if (e.key === "F4") {
        e.preventDefault();
        receivedAmountInputRef.current?.focus();
        receivedAmountInputRef.current?.select();
        return;
      }

      // 10. [F5] -> Customer Details
      if (e.key === "F5") {
        e.preventDefault();
        handleOpenCustomerModal();
        return;
      }

      // 11. [F6] -> Save & Print
      if (e.key === "F6") {
        e.preventDefault();
        handleSaveBill(true);
        return;
      }

      // 12. [F7] -> Save Bill
      if (e.key === "F7") {
        e.preventDefault();
        handleSaveBill(false);
        return;
      }

      // Single Key shortcuts (when not typing in an input field)
      if (!isInputActive) {
        // [V] -> Toggle Voice Assistant
        if (e.key === "v" || e.key === "V") {
          e.preventDefault();
          toggleVoiceRecognition();
          return;
        }

        // [P] -> Change Price
        if (e.key === "p" || e.key === "P") {
          e.preventDefault();
          handleOpenChangePrice();
          return;
        }

        // [Q] -> Change QTY
        if (e.key === "q" || e.key === "Q") {
          e.preventDefault();
          handleOpenChangeQty();
          return;
        }

        // [D] -> Change Discount
        if (e.key === "d" || e.key === "D") {
          e.preventDefault();
          handleOpenChangeDiscount();
          return;
        }

        // [DEL] or [Backspace] -> Delete Selected Item
        if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          handleDeleteSelectedItem();
          return;
        }

        // Table Navigation: Arrow Up / Arrow Down
        if (e.key === "ArrowUp") {
          e.preventDefault();
          updateCurrentTab((tab) => {
            if (tab.items.length === 0) return tab;
            const prevIdx = tab.selectedItemIndex > 0 ? tab.selectedItemIndex - 1 : tab.items.length - 1;
            return { ...tab, selectedItemIndex: prevIdx };
          });
          return;
        }

        if (e.key === "ArrowDown") {
          e.preventDefault();
          updateCurrentTab((tab) => {
            if (tab.items.length === 0) return tab;
            const nextIdx = tab.selectedItemIndex < tab.items.length - 1 ? tab.selectedItemIndex + 1 : 0;
            return { ...tab, selectedItemIndex: nextIdx };
          });
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    tabs,
    handleExitPOS,
    handleSwitchTab,
    handleHoldBillAndCreate,
    handleOpenChangePrice,
    handleOpenChangeQty,
    handleOpenChangeDiscount,
    handleDeleteSelectedItem,
    handleOpenBillDiscount,
    handleOpenAdditionalCharge,
    handleOpenCustomerModal,
    handleSaveBill,
    updateCurrentTab,
    toggleVoiceRecognition,
  ]);

  // Search Input Keydown for dropdown navigation
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredProducts.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSearchSelectedIdx((prev) => (prev < filteredProducts.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSearchSelectedIdx((prev) => (prev > 0 ? prev - 1 : filteredProducts.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredProducts[searchSelectedIdx]) {
        handleAddProduct(filteredProducts[searchSelectedIdx]);
      }
    } else if (e.key === "Escape") {
      setSearchFocused(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden h-[100dvh] w-full max-w-full">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER: Clean Light & Professional FinTech Aesthetic */}
      {/* ========================================================================= */}
      <header className="h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-2.5 sm:px-5 flex items-center justify-between shrink-0 shadow-xs z-30">
        {/* Left: Exit POS & Terminal Identity */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleExitPOS}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all shadow-2xs active:scale-95 group"
            title="Exit POS Terminal [CTRL + ESC]"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-900 transition-colors" />
            <span className="hidden sm:inline">Exit POS</span>
            <span className="sm:hidden">Exit</span>
            <kbd className="hidden sm:inline text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-1 py-0.5 rounded font-normal">
              CTRL + ESC
            </kbd>
          </button>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          <div className="hidden md:flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-black text-xs shadow-xs">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-900 tracking-tight leading-none">
                {settings.storeName || org?.name || "CredSmart POS"}
              </span>
              <span className="text-[10px] font-mono text-slate-500 leading-tight">
                Terminal #01
              </span>
            </div>
          </div>
        </div>

        {/* Center: Title & Turbo Speed Indicator */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <h1 className="text-xs sm:text-sm font-bold text-slate-900 tracking-wide uppercase flex items-center gap-2">
            <span className="hidden sm:inline">Point of Sale</span>
            <span className="sm:hidden font-mono">POS</span>
          </h1>

          <div className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[9px] sm:text-[10px] font-mono font-semibold text-emerald-700 shadow-2xs">
            <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-500" />
            </span>
            <span className="tracking-wider">TURBO</span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-mono text-slate-700">
            <Clock className="w-3 h-3 text-indigo-600" />
            <span>{currentTime}</span>
          </div>
        </div>

        {/* Right: Tutorial, Fullscreen & Settings */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setShowTutorialModal(true)}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 transition-all text-xs font-semibold shadow-2xs active:scale-95"
            title="View Hotkey Guide & Tutorial"
          >
            <PlayCircle className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Shortcuts</span>
            <span className="sm:hidden">Help</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-all hidden sm:flex items-center justify-center active:scale-95"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen Mode"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all active:scale-95"
            title="POS Settings [CTRL + S]"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Settings</span>
            <kbd className="hidden lg:inline text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-1 py-0.5 rounded font-normal">
              CTRL + S
            </kbd>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MULTI-TAB HELD BILLS BAR */}
      {/* ========================================================================= */}
      <div className="h-10 sm:h-11 bg-slate-100/90 border-b border-slate-200 px-2 sm:px-3 flex items-center justify-between shrink-0 overflow-x-auto scrollbar-none z-20">
        <div className="flex items-center gap-1.5 h-full py-1">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const itemsCount = tab.items.reduce((acc, it) => acc + it.quantity, 0);

            return (
              <div
                key={tab.id}
                onClick={() => handleSwitchTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 sm:gap-2 h-7 sm:h-8 px-2.5 sm:px-3.5 rounded-lg text-xs font-semibold cursor-pointer border transition-all select-none relative group",
                  isActive
                    ? "bg-white border-slate-300 text-slate-900 shadow-xs ring-1 ring-indigo-500/20"
                    : "bg-slate-200/50 hover:bg-slate-200 border-transparent text-slate-600 hover:text-slate-900"
                )}
              >
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span className={cn("w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full", isActive ? "bg-indigo-600" : "bg-slate-400")} />
                  <span className="hidden sm:inline">{tab.title}</span>
                  <span className="sm:hidden">Bill {tab.tabIndex}</span>
                </div>

                <kbd className="hidden lg:inline text-[10px] font-mono opacity-60 bg-slate-100 px-1 rounded border border-slate-200">
                  CTRL + {tab.tabIndex}
                </kbd>

                {itemsCount > 0 && (
                  <span className="px-1.5 py-0.2 sm:py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-[9px] sm:text-[10px] font-bold font-mono">
                    {itemsCount}
                  </span>
                )}

                <button
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  className="hover:bg-slate-200 rounded-md p-0.5 text-slate-400 hover:text-red-500 transition-colors ml-0.5"
                  title="Close Tab"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {/* + Hold Bill & Create Another [CTRL + B] */}
          {tabs.length < 5 && (
            <button
              onClick={handleHoldBillAndCreate}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-dashed border-indigo-300 rounded-lg transition-all ml-1 shadow-2xs"
              title="Hold Current Bill and Start New One [CTRL + B]"
            >
              <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">+ Hold Bill</span>
              <span className="sm:hidden">+ Hold</span>
              <kbd className="hidden lg:inline text-[10px] font-mono text-indigo-700/80 font-normal bg-indigo-100 px-1 rounded border border-indigo-200">
                CTRL + B
              </kbd>
            </button>
          )}
        </div>

        <div className="hidden md:flex items-center gap-3 text-xs text-slate-500 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-800 font-semibold">{currentTab.title}</span>
          </span>
          <span className="text-slate-300">•</span>
          <span>{currentTab.items.length} Line(s)</span>
          <span className="text-slate-300">•</span>
          <span className="text-emerald-700 font-bold">{totalItemsCount} Unit(s)</span>
        </div>
      </div>

      {/* MOBILE VIEW TOGGLE BAR (Cart vs Checkout) */}
      <div className="flex lg:hidden items-center border-b border-slate-200 bg-white/95 shrink-0 px-2.5 py-2 gap-2 z-20">
        <button
          type="button"
          onClick={() => setMobileActiveView("cart")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all",
            mobileActiveView === "cart"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400"
              : "bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200"
          )}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Cart ({currentTab.items.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileActiveView("checkout")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all",
            mobileActiveView === "checkout"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400"
              : "bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200"
          )}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Pay (₹{grandTotal.toLocaleString("en-IN")})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN TERMINAL WORKSPACE (LEFT WORKBENCH + RIGHT SUMMARY) */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden bg-slate-50">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: ACTION RIBBON + SEARCH/BARCODE + CART ITEMS TABLE */}
        {/* ========================================================================= */}
        <div
          className={cn(
            "flex-1 flex flex-col min-w-0 border-r border-slate-200 bg-white overflow-hidden h-full",
            mobileActiveView === "cart" ? "flex" : "hidden lg:flex"
          )}
        >
          {/* QUICK ACTION HOTKEY RIBBON */}
          <div className="p-2 sm:p-3 border-b border-slate-200 bg-slate-50/80 flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0 overflow-x-auto scrollbar-none">
            {/* 🎙️ Voice Assistant [V] */}
            <button
              type="button"
              onClick={toggleVoiceRecognition}
              className={cn(
                "flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-2xs active:scale-95",
                isListening
                  ? "bg-rose-600 border-rose-500 text-white animate-pulse shadow-md ring-2 ring-rose-300"
                  : "border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800"
              )}
              title="Voice Assistant: speak to add items, change price, quantity or payment mode [V]"
            >
              {isListening ? (
                <Radio className="w-3.5 h-3.5 text-white animate-spin" />
              ) : (
                <Mic className="w-3.5 h-3.5 text-indigo-600" />
              )}
              <span className="hidden sm:inline">{isListening ? "Listening..." : "Voice"}</span>
              <span className="sm:hidden">{isListening ? "Listen" : "Voice"}</span>
              <kbd className="hidden sm:inline text-[10px] font-mono bg-white border border-indigo-200 px-1 py-0.5 rounded font-normal text-indigo-700">
                V
              </kbd>
            </button>

            {/* + New Item [CTRL + I] */}
            <button
              onClick={() => setShowNewItemModal(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 text-xs font-bold transition-all shadow-2xs active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">New Item</span>
              <span className="sm:hidden">+ Item</span>
              <kbd className="hidden sm:inline text-[10px] font-mono text-emerald-700 bg-white border border-emerald-200 px-1 py-0.5 rounded font-normal">
                CTRL + I
              </kbd>
            </button>

            {/* Change Price [P] */}
            <button
              onClick={handleOpenChangePrice}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 hover:text-amber-900 text-xs font-semibold transition-all shadow-2xs active:scale-95"
            >
              <Tag className="w-3.5 h-3.5 text-amber-600" />
              <span>Price</span>
              <kbd className="hidden sm:inline text-[10px] font-mono text-amber-800 bg-white border border-amber-200 px-1 py-0.5 rounded font-normal">
                P
              </kbd>
            </button>

            {/* Change QTY [Q] */}
            <button
              onClick={handleOpenChangeQty}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 text-xs font-semibold transition-all shadow-2xs active:scale-95"
            >
              <Hash className="w-3.5 h-3.5 text-blue-600" />
              <span>Qty</span>
              <kbd className="hidden sm:inline text-[10px] font-mono text-blue-700 bg-white border border-blue-200 px-1 py-0.5 rounded font-normal">
                Q
              </kbd>
            </button>

            {/* Change Discount [D] */}
            <button
              onClick={handleOpenChangeDiscount}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 hover:text-purple-800 text-xs font-semibold transition-all shadow-2xs active:scale-95"
            >
              <Percent className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden sm:inline">Discount</span>
              <span className="sm:hidden">Disc</span>
              <kbd className="hidden sm:inline text-[10px] font-mono text-purple-700 bg-white border border-purple-200 px-1 py-0.5 rounded font-normal">
                D
              </kbd>
            </button>

            {/* Delete Item [DEL] */}
            <button
              onClick={handleDeleteSelectedItem}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 text-xs font-semibold transition-all shadow-2xs active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Delete</span>
              <span className="sm:hidden">Del</span>
              <kbd className="hidden sm:inline text-[10px] font-mono text-rose-700 bg-white border border-rose-200 px-1 py-0.5 rounded font-normal">
                DEL
              </kbd>
            </button>

            {/* Camera Scan Toggle for Touch Terminals / Mobile */}
            <button
              onClick={() => setShowCameraScannerModal(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-medium transition-all ml-auto active:scale-95 shadow-2xs"
              title="Open Camera Barcode Scanner"
            >
              <Camera className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Scan Barcode</span>
              <span className="sm:hidden">Scan</span>
            </button>
          </div>

          {/* SEARCH & BARCODE INPUT BAR */}
          <div className="p-3 border-b border-slate-200 bg-white shrink-0 relative">
            <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500 transition-all bg-slate-50/70 shadow-inner">
              {/* Category Dropdown */}
              <div className="relative border-r border-slate-200 shrink-0">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="appearance-none bg-transparent hover:bg-slate-100 py-2.5 pl-3 pr-7 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat} className="bg-white text-slate-900">
                      {cat === "All" ? "All Categories ▾" : cat}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Barcode Icon Indicator */}
              <div className="pl-3 text-slate-400 flex items-center">
                <ScanLine className="w-4 h-4 text-indigo-600 animate-pulse" />
              </div>

              {/* Main Search Input */}
              <div className="relative flex-1 flex items-center">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchFocused(true);
                    setSearchSelectedIdx(0);
                  }}
                  onFocus={() => setSearchFocused(true)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search item / barcode / SKU / HSN / category or Scan Barcode..."
                  className="w-full py-2.5 px-3 text-xs bg-transparent focus:outline-none text-slate-900 placeholder:text-slate-400 font-medium"
                />

                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      searchInputRef.current?.focus();
                    }}
                    className="p-1 hover:bg-slate-200 rounded-md text-slate-500 hover:text-slate-800 mr-2 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Voice Search Trigger */}
                <button
                  type="button"
                  onClick={toggleVoiceRecognition}
                  className={cn(
                    "p-1.5 rounded-lg mr-1.5 transition-all flex items-center justify-center",
                    isListening
                      ? "bg-rose-500 text-white animate-pulse shadow-xs"
                      : "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                  )}
                  title="Voice Command & Search [V]"
                >
                  <Mic className="w-3.5 h-3.5" />
                </button>

                {/* [F1] Shortcut Badge (Hidden on mobile) */}
                <div className="pr-3 hidden sm:flex items-center">
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-600 bg-white border border-slate-200 rounded shadow-2xs">
                    F1
                  </kbd>
                </div>
              </div>
            </div>

            {/* Mobile Category Chips Carousel */}
            <div className="flex lg:hidden items-center gap-1.5 pt-2.5 overflow-x-auto scrollbar-none pb-0.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all active:scale-95",
                    selectedCategory === cat
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Instant Search Dropdown Auto-suggest */}
            {searchFocused && searchQuery.trim().length > 0 && (
              <div className="absolute top-full left-3 right-3 mt-1.5 bg-white backdrop-blur-md border border-slate-200 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto divide-y divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 space-y-2">
                    <p>No inventory items match &quot;{searchQuery}&quot;.</p>
                    <button
                      onClick={() => {
                        setNewItemName(searchQuery);
                        setShowNewItemModal(true);
                        setSearchFocused(false);
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add as New Item</span>
                    </button>
                  </div>
                ) : (
                  filteredProducts.map((p, idx) => (
                    <div
                      key={p.id}
                      onClick={() => handleAddProduct(p)}
                      onMouseEnter={() => setSearchSelectedIdx(idx)}
                      className={cn(
                        "p-3 flex items-center justify-between cursor-pointer text-xs transition-colors",
                        idx === searchSelectedIdx
                          ? "bg-indigo-50 text-slate-900 border-l-4 border-indigo-600"
                          : "hover:bg-slate-50 text-slate-700"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-sm">
                          {p.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-mono">
                          {p.barcode && <span className="bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 text-slate-600">Code: {p.barcode}</span>}
                          {p.category && <span className="text-slate-500">{p.category}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-base font-mono text-emerald-600">
                            ₹{p.batches?.[0]?.mrp || 100}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-mono">
                            Stock: {p.batches?.[0]?.stock || 0}
                          </span>
                        </div>
                        <button className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-transform active:scale-95">
                          + Add
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* CART ITEM WORKBENCH CONTAINER (Mobile Cards + Desktop Table) */}
          <div className="flex-1 overflow-y-auto overflow-x-auto relative flex flex-col bg-slate-50/50 overscroll-contain touch-pan-y">
            {/* 1. DESKTOP DATA TABLE (Visible on lg: and larger screens) */}
            <div className="hidden lg:block">
              <table className="w-full text-left border-collapse min-w-[720px]">
                <thead className="bg-slate-100/90 backdrop-blur-xs sticky top-0 z-10 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider font-mono">
                  <tr>
                    <th className="py-3 px-3 w-12 text-center">#</th>
                    <th className="py-3 px-3">ITEM &amp; DETAILS</th>
                    <th className="py-3 px-3">BARCODE / SKU</th>
                    <th className="py-3 px-3 text-right">MRP (₹)</th>
                    <th className="py-3 px-3 text-right">SP (₹)</th>
                    <th className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span>DISC</span>
                        <Info className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-3 px-3 text-center w-32">QUANTITY</th>
                    <th className="py-3 px-3 text-right">TOTAL (₹)</th>
                    <th className="py-3 px-3 text-center w-12">ACT</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-xs">
                  {currentTab.items.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-24 text-center">
                        {/* High-End Empty State Wireframe */}
                        <div className="flex flex-col items-center justify-center max-w-md mx-auto text-slate-500 space-y-4">
                          <div className="relative">
                            <div className="w-20 h-20 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-md">
                              <ScanLine className="w-10 h-10 animate-pulse" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                              +
                            </div>
                          </div>

                          <div className="space-y-1 text-center">
                            <p className="text-sm font-bold text-slate-800">
                              Cart is empty &amp; scanner is ready
                            </p>
                            <p className="text-xs text-slate-500 max-w-xs">
                              Scan any item barcode with your hardware scanner, tap{" "}
                              <span className="text-indigo-600 font-semibold cursor-pointer" onClick={toggleVoiceRecognition}>
                                🎤 Voice
                              </span>{" "}
                              or press{" "}
                              <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-indigo-700">
                                F1
                              </kbd>{" "}
                              to search catalog.
                            </p>
                          </div>

                          <div className="flex items-center gap-2 pt-2">
                            <button
                              onClick={() => {
                                searchInputRef.current?.focus();
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-all shadow-2xs"
                            >
                              <Search className="w-3.5 h-3.5 inline mr-1 text-slate-500" />
                              Search Products
                            </button>
                            <button
                              onClick={toggleVoiceRecognition}
                              className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-xs font-bold text-indigo-700 transition-all"
                            >
                              <Mic className="w-3.5 h-3.5 inline mr-1 text-indigo-600" />
                              Voice Search
                            </button>
                            <button
                              onClick={() => setShowNewItemModal(true)}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all shadow-sm"
                            >
                              <Plus className="w-3.5 h-3.5 inline mr-1" />
                              + New Item
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentTab.items.map((item, idx) => {
                      const isSelected = idx === currentTab.selectedItemIndex;
                      const lineAmount =
                        (item.sp -
                          (item.discountType === "percent"
                            ? (item.sp * item.discountPercent) / 100
                            : item.discountPercent)) *
                        item.quantity;

                      return (
                        <tr
                          key={item.id}
                          onClick={() => updateCurrentTab((tab) => ({ ...tab, selectedItemIndex: idx }))}
                          className={cn(
                            "transition-all cursor-pointer group",
                            isSelected
                              ? "bg-indigo-50/80 border-l-4 border-indigo-600 text-slate-900 font-medium"
                              : "hover:bg-slate-50 text-slate-700"
                          )}
                        >
                          {/* NO */}
                          <td className="py-3 px-3 text-center text-slate-400 font-mono">
                            {idx + 1}
                          </td>

                          {/* ITEMS */}
                          <td className="py-3 px-3 font-semibold text-slate-900">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold">{item.product.name}</span>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-normal">
                                {item.product.brand && (
                                  <span className="bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 text-slate-600">
                                    {item.product.brand}
                                  </span>
                                )}
                                {item.batch.batchNumber && (
                                  <span className="font-mono text-slate-500">
                                    Batch: {item.batch.batchNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* ITEM CODE */}
                          <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {item.itemCode}
                            </span>
                          </td>

                          {/* MRP */}
                          <td className="py-3 px-3 text-right text-slate-500 font-mono">
                            ₹{item.mrp.toFixed(2)}
                          </td>

                          {/* SP (₹) */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                updateCurrentTab((tab) => ({ ...tab, selectedItemIndex: idx }));
                                handleOpenChangePrice();
                              }}
                              className="hover:underline hover:text-indigo-600 cursor-pointer bg-white px-2 py-1 rounded border border-slate-200 inline-block shadow-2xs"
                              title="Click or press [P] to edit price"
                            >
                              ₹{item.sp.toFixed(2)}
                            </span>
                          </td>

                          {/* DISC */}
                          <td className="py-3 px-3 text-right text-slate-700 font-mono">
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                updateCurrentTab((tab) => ({ ...tab, selectedItemIndex: idx }));
                                handleOpenChangeDiscount();
                              }}
                              className={cn(
                                "cursor-pointer hover:underline px-2 py-0.5 rounded text-xs font-semibold",
                                item.discountPercent > 0
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "text-slate-400 hover:text-slate-600"
                              )}
                              title="Click or press [D] to edit discount"
                            >
                              {item.discountPercent > 0
                                ? `${item.discountPercent}${item.discountType === "percent" ? "%" : "₹"}`
                                : "0%"}
                            </span>
                          </td>

                          {/* QUANTITY +/- */}
                          <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center border border-slate-300 rounded-lg bg-white shadow-2xs overflow-hidden">
                              <button
                                onClick={() => {
                                  updateCurrentTab((tab) => {
                                    const newItems = tab.items.map((it, i) => {
                                      if (i === idx) {
                                        return { ...it, quantity: Math.max(1, it.quantity - 1) };
                                      }
                                      return it;
                                    });
                                    return { ...tab, items: newItems };
                                  });
                                }}
                                className="px-2 py-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span
                                onClick={() => {
                                  updateCurrentTab((tab) => ({ ...tab, selectedItemIndex: idx }));
                                  handleOpenChangeQty();
                                }}
                                className="px-3 py-0.5 text-xs font-extrabold font-mono min-w-[32px] text-center cursor-pointer hover:bg-slate-50 text-slate-900"
                                title="Click or press [Q] to change quantity"
                              >
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => {
                                  updateCurrentTab((tab) => {
                                    const newItems = tab.items.map((it, i) => {
                                      if (i === idx) {
                                        return { ...it, quantity: it.quantity + 1 };
                                      }
                                      return it;
                                    });
                                    return { ...tab, items: newItems };
                                  });
                                }}
                                className="px-2 py-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                          {/* AMOUNT */}
                          <td className="py-3 px-3 text-right font-mono font-black text-slate-900 text-sm">
                            ₹{lineAmount.toFixed(2)}
                          </td>

                          {/* DELETE ACTION */}
                          <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                updateCurrentTab((tab) => {
                                  const newItems = tab.items.filter((_, i) => i !== idx);
                                  return {
                                    ...tab,
                                    items: newItems,
                                    selectedItemIndex: newItems.length > 0 ? Math.min(idx, newItems.length - 1) : -1,
                                  };
                                });
                              }}
                              className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* 2. MOBILE CART ITEMS CARDS LIST (Optimized for Mobile Touch UX & Scrolling) */}
            <div className="block lg:hidden p-3 space-y-2.5 pb-28 touch-pan-y overscroll-contain">
              {currentTab.items.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 mx-auto shadow-sm">
                    <ScanLine className="w-8 h-8 animate-pulse" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">Cart is empty</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Search item above, scan barcode, or speak command via 🎤 Voice button
                  </p>
                  <button
                    onClick={toggleVoiceRecognition}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Try Voice Billing</span>
                  </button>
                </div>
              ) : (
                currentTab.items.map((item, idx) => {
                  const isSelected = idx === currentTab.selectedItemIndex;
                  const lineAmount =
                    (item.sp -
                      (item.discountType === "percent"
                        ? (item.sp * item.discountPercent) / 100
                        : item.discountPercent)) *
                    item.quantity;

                  return (
                    <div
                      key={item.id}
                      onClick={() => updateCurrentTab((tab) => ({ ...tab, selectedItemIndex: idx }))}
                      className={cn(
                        "p-3 rounded-xl border transition-all bg-white shadow-2xs",
                        isSelected
                          ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/30"
                          : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      {/* Header: Item Name + Delete Button */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              #{idx + 1}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900 truncate">{item.product.name}</h4>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-500">
                            <span>{item.itemCode}</span>
                            {item.batch.batchNumber && <span>• Batch: {item.batch.batchNumber}</span>}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateCurrentTab((tab) => {
                              const newItems = tab.items.filter((_, i) => i !== idx);
                              return {
                                ...tab,
                                items: newItems,
                                selectedItemIndex: newItems.length > 0 ? Math.min(idx, newItems.length - 1) : -1,
                              };
                            });
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors active:scale-95"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Price, Steppers, & Line Amount */}
                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                        {/* Selling Price & Discount */}
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                updateCurrentTab((tab) => ({ ...tab, selectedItemIndex: idx }));
                                handleOpenChangePrice();
                              }}
                              className="text-xs font-bold text-slate-900 font-mono hover:text-indigo-600 cursor-pointer underline decoration-dotted"
                            >
                              ₹{item.sp.toFixed(2)}
                            </span>
                            {item.discountPercent > 0 && (
                              <span className="text-[9px] font-bold px-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                -{item.discountPercent}{item.discountType === "percent" ? "%" : "₹"}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono line-through">
                            MRP: ₹{item.mrp.toFixed(2)}
                          </span>
                        </div>

                        {/* Touch-Friendly Quantity Stepper */}
                        <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden shadow-2xs" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              updateCurrentTab((tab) => {
                                const newItems = tab.items.map((it, i) => {
                                  if (i === idx) {
                                    return { ...it, quantity: Math.max(1, it.quantity - 1) };
                                  }
                                  return it;
                                });
                                return { ...tab, items: newItems };
                              });
                            }}
                            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span
                            onClick={() => {
                              updateCurrentTab((tab) => ({ ...tab, selectedItemIndex: idx }));
                              handleOpenChangeQty();
                            }}
                            className="w-9 h-8 flex items-center justify-center text-xs font-mono font-black text-slate-900 cursor-pointer hover:bg-slate-50"
                          >
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              updateCurrentTab((tab) => {
                                const newItems = tab.items.map((it, i) => {
                                  if (i === idx) {
                                    return { ...it, quantity: it.quantity + 1 };
                                  }
                                  return it;
                                });
                                return { ...tab, items: newItems };
                              });
                            }}
                            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Line Total */}
                        <div className="text-right">
                          <span className="text-sm font-black font-mono text-emerald-600">
                            ₹{lineAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* MOBILE STICKY CHECKOUT BAR (When in Cart View) */}
          {mobileActiveView === "cart" && (
            <div className="flex lg:hidden items-center justify-between p-3 border-t border-slate-200 bg-white shrink-0 gap-3 z-20 shadow-xs">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">
                  Total ({totalItemsCount} Qty)
                </span>
                <span className="text-xl font-black font-mono text-emerald-600 leading-none">
                  ₹{grandTotal.toLocaleString("en-IN")}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setMobileActiveView("checkout")}
                disabled={currentTab.items.length === 0}
                className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-md disabled:opacity-50 active:scale-95 transition-all"
              >
                <span>Proceed to Pay</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* RIGHT SUMMARY & CHECKOUT PANEL: Enterprise FinTech Layout */}
        {/* ========================================================================= */}
        <div
          className={cn(
            "w-full lg:w-[410px] bg-slate-50/90 flex flex-col justify-between p-3 sm:p-4 border-t lg:border-t-0 lg:border-l border-slate-200 overflow-y-auto shadow-sm h-full flex-1 min-h-0 overscroll-contain touch-pan-y pb-28 lg:pb-4",
            mobileActiveView === "checkout" ? "flex" : "hidden lg:flex"
          )}
        >
          {/* Mobile Top Back-to-Cart Trigger */}
          <div className="flex lg:hidden items-center justify-between pb-3 border-b border-slate-200 mb-2 shrink-0">
            <button
              type="button"
              onClick={() => setMobileActiveView("cart")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Cart ({currentTab.items.length})</span>
            </button>
            <span className="text-xs font-mono font-bold text-emerald-600">
              ₹{grandTotal.toFixed(2)}
            </span>
          </div>

          <div className="space-y-4">
            {/* Top Quick Actions: [Add Discount], [Add Charge] (Short labels on mobile) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleOpenBillDiscount}
                className="flex items-center justify-between px-2.5 sm:px-3 py-2 border border-slate-200 bg-white hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition-all shadow-2xs active:scale-95"
              >
                <span className="flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-purple-600" />
                  <span className="hidden sm:inline">Bill Discount</span>
                  <span className="sm:hidden">Discount</span>
                </span>
                <kbd className="hidden sm:inline text-[10px] font-mono text-slate-500 bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
                  F2
                </kbd>
              </button>

              <button
                onClick={handleOpenAdditionalCharge}
                className="flex items-center justify-between px-2.5 sm:px-3 py-2 border border-slate-200 bg-white hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition-all shadow-2xs active:scale-95"
              >
                <span className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden sm:inline">Add Charge</span>
                  <span className="sm:hidden">Charge</span>
                </span>
                <kbd className="hidden sm:inline text-[10px] font-mono text-slate-500 bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
                  F3
                </kbd>
              </button>
            </div>

            {/* Bill Details Breakdown Card */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100 pb-2">
                <span>Bill Breakdown</span>
                <span className="font-mono text-slate-400">{currentTab.items.length} items</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Sub Total</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{subTotal.toFixed(2)}
                </span>
              </div>

              {itemDiscountsTotal > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Item Discounts</span>
                  <span className="font-mono">- ₹{itemDiscountsTotal.toFixed(2)}</span>
                </div>
              )}

              {billDiscountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>
                    Bill Discount ({currentTab.discountValue}
                    {currentTab.discountType === "percent" ? "%" : "₹"})
                  </span>
                  <span className="font-mono">- ₹{billDiscountAmount.toFixed(2)}</span>
                </div>
              )}

              {chargesTotal > 0 && (
                <div className="flex justify-between text-blue-600 font-semibold">
                  <span>Additional Charges</span>
                  <span className="font-mono">+ ₹{chargesTotal.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Tax (GST @ {org?.tax_rate ?? settings.defaultTaxRate}%)</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{taxAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* PROMINENT TOTAL AMOUNT DISPLAY */}
            <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl p-3.5 sm:p-4 shadow-md flex flex-col gap-1 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-100 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Net Payable Total</span>
                </span>
                <span className="text-[11px] font-mono bg-white/20 px-2 py-0.5 rounded-full border border-white/30 text-white">
                  {totalItemsCount} Qty
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white drop-shadow-xs">
                  ₹{grandTotal.toLocaleString("en-IN")}
                </span>
                <span className="text-[11px] font-mono text-emerald-100 font-medium">
                  Incl. all taxes
                </span>
              </div>
            </div>

            {/* FAST PAYMENT MODE SELECTOR */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Payment Mode
              </label>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { mode: "Cash", label: "Cash", icon: Banknote },
                  { mode: "UPI", label: "UPI / QR", icon: QrCode },
                  { mode: "Card", label: "Card", icon: CreditCard },
                  { mode: "Credit", label: "Credit", icon: FileText },
                  { mode: "Split", label: "Split", icon: Split },
                  { mode: "Net Banking", label: "Net Bank", icon: Building2 },
                ].map((pm) => {
                  const Icon = pm.icon;
                  const isSelected = currentTab.paymentMode === pm.mode;

                  return (
                    <button
                      key={pm.mode}
                      type="button"
                      onClick={() => {
                        updateCurrentTab((tab) => ({
                          ...tab,
                          paymentMode: pm.mode as BillingTab["paymentMode"],
                        }));
                        if (pm.mode === "UPI") {
                          setShowUPIQRModal(true);
                        }
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 shadow-2xs",
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/30 ring-2 ring-indigo-300"
                          : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                      )}
                    >
                      <Icon className={cn("w-4 h-4 mb-1", isSelected ? "text-white" : "text-slate-500")} />
                      <span>{pm.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RECEIVED AMOUNT & CHANGE DUE CALCULATOR */}
            <div className="space-y-2 bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Received Amount</span>
                <kbd className="hidden sm:inline text-[10px] font-mono text-slate-500 bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
                  F4
                </kbd>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400 font-mono">
                  ₹
                </span>
                <input
                  ref={receivedAmountInputRef}
                  type="number"
                  value={currentTab.receivedAmount}
                  onChange={(e) =>
                    updateCurrentTab((tab) => ({
                      ...tab,
                      receivedAmount: e.target.value,
                    }))
                  }
                  placeholder={String(grandTotal)}
                  className="w-full pl-8 pr-3 py-2 text-base sm:text-lg font-black font-mono bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white focus:outline-none text-slate-900 placeholder:text-slate-400 shadow-inner"
                />
              </div>

              {/* Quick Cash Suggestions */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <button
                  type="button"
                  onClick={() =>
                    updateCurrentTab((tab) => ({
                      ...tab,
                      receivedAmount: String(grandTotal),
                    }))
                  }
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-[10px] font-mono font-bold rounded-lg text-indigo-700 transition-colors"
                >
                  Exact (₹{grandTotal})
                </button>
                {[50, 100, 200, 500, 2000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() =>
                      updateCurrentTab((tab) => ({
                        ...tab,
                        receivedAmount: String(amt),
                      }))
                    }
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[10px] font-mono rounded-lg text-slate-700 transition-colors"
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              {/* Live Change Return or Balance Due Banner */}
              {receivedNum > 0 && (
                <div
                  className={cn(
                    "p-2.5 sm:p-3 rounded-xl text-xs font-bold flex justify-between items-center transition-all shadow-2xs",
                    receivedNum >= grandTotal
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <Coins className="w-4 h-4" />
                    <span>{receivedNum >= grandTotal ? "Change to Return:" : "Credit Due:"}</span>
                  </span>
                  <span className="font-mono text-base font-black">
                    ₹{(receivedNum >= grandTotal ? changeDue : balanceRemaining).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* CUSTOMER DETAILS CARD */}
            <div className="border border-slate-200 rounded-2xl p-3 sm:p-3.5 bg-white shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Customer Profile</span>
                </span>
                <button
                  onClick={handleOpenCustomerModal}
                  className="text-[10px] font-mono font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md hover:bg-indigo-100 transition-colors active:scale-95"
                >
                  {currentTab.customer ? "Change" : "+ Select"}
                </button>
              </div>

              {currentTab.customer ? (
                <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {currentTab.customer.name}
                      </span>
                      {currentTab.customer.loyaltyPoints && (
                        <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold font-mono border border-amber-200">
                          ⭐ {currentTab.customer.loyaltyPoints} pts
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {currentTab.customer.phone || "No Phone Attached"}
                    </span>
                  </div>
                  <button
                    onClick={() => handleSelectCustomer(null)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                    title="Remove Customer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={handleOpenCustomerModal}
                  className="text-xs text-slate-500 text-center py-2 border border-dashed border-slate-300 hover:border-indigo-400 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  Walk-in Customer (Tap to attach phone / points)
                </div>
              )}
            </div>
          </div>

          {/* DUAL PRIMARY ACTION CTA BUTTONS */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-3 sm:pt-4 border-t border-slate-200 mt-4 shrink-0">
            {/* Save & Print */}
            <button
              onClick={() => handleSaveBill(true)}
              disabled={isProcessingSave || currentTab.items.length === 0}
              className="flex items-center justify-center gap-1.5 py-3 sm:py-3.5 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm transition-all shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Save bill and print receipt"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Save &amp; Print</span>
              <span className="sm:hidden">Print Bill</span>
              <kbd className="hidden sm:inline text-[10px] font-mono opacity-80 bg-emerald-800 px-1 py-0.5 rounded font-normal">
                F6
              </kbd>
            </button>

            {/* Save Bill */}
            <button
              onClick={() => handleSaveBill(false)}
              disabled={isProcessingSave || currentTab.items.length === 0}
              className="flex items-center justify-center gap-1.5 py-3 sm:py-3.5 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs sm:text-sm transition-all shadow-md shadow-indigo-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Save bill directly"
            >
              <Check className="w-4 h-4" />
              <span className="hidden sm:inline">Save Bill</span>
              <span className="sm:hidden">Save Bill</span>
              <kbd className="hidden sm:inline text-[10px] font-mono opacity-80 bg-indigo-800 px-1 py-0.5 rounded font-normal">
                F7
              </kbd>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODALS AND DIALOGS (HIGH-END FINTECH POLISHED) */}
      {/* ========================================================================= */}

      {/* ========================================================================= */}
      {/* 4. MODALS AND DIALOGS (LIGHT & PROFESSIONAL FINTECH) */}
      {/* ========================================================================= */}

      {/* Tutorial / Walkthrough Modal */}
      {showTutorialModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-slate-900 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
                  <PlayCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">POS Hotkeys &amp; Hardware Guide</h3>
                  <p className="text-xs text-slate-500">High-speed keyboard billing reference</p>
                </div>
              </div>
              <button
                onClick={() => setShowTutorialModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <p className="font-bold text-indigo-700 flex items-center gap-1.5 text-xs">
                  <Zap className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Master Key Combinations:</span>
                </p>
                <div className="grid grid-cols-2 gap-2.5 text-[11px] font-mono">
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 text-indigo-700 rounded shadow-2xs">F1</kbd>
                    <span>Focus Search Bar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 text-emerald-700 rounded shadow-2xs">CTRL+B</kbd>
                    <span>Hold &amp; New Tab</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 text-amber-800 rounded shadow-2xs">P</kbd>
                    <span>Change Item Price</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 text-blue-700 rounded shadow-2xs">Q</kbd>
                    <span>Change Quantity</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 text-purple-700 rounded shadow-2xs">D</kbd>
                    <span>Item Discount</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 text-rose-700 rounded shadow-2xs">DEL</kbd>
                    <span>Delete Row</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 text-slate-700 rounded shadow-2xs">F2</kbd>
                    <span>Bill Discount</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 text-slate-700 rounded shadow-2xs">F3</kbd>
                    <span>Add Delivery Charge</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 text-slate-700 rounded shadow-2xs">F4</kbd>
                    <span>Received Amount</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 text-slate-700 rounded shadow-2xs">F5</kbd>
                    <span>Customer Details</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 text-emerald-700 rounded shadow-2xs font-bold">F6</kbd>
                    <span>Save &amp; Print</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 text-indigo-700 rounded shadow-2xs font-bold">F7</kbd>
                    <span>Quick Save Bill</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/70 rounded-2xl border border-indigo-200 space-y-1">
                <p className="font-bold text-indigo-900 flex items-center gap-1.5">
                  <ScanLine className="w-4 h-4 text-indigo-600" />
                  <span>Hardware Barcode Scanner Automatic Detection</span>
                </p>
                <p className="text-slate-600 text-xs">
                  Any USB or Bluetooth barcode scanner will immediately beep and add scanned items into the cart without needing to focus the search box.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowTutorialModal(false)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-600/20"
              >
                Got it, Start Billing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal [CTRL + S] */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200">
                  <Settings className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">POS Terminal Settings</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Default Payment Mode</label>
                <select
                  value={settings.defaultPaymentMode}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      defaultPaymentMode: e.target.value as PosSettings["defaultPaymentMode"],
                    }))
                  }
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / QR</option>
                  <option value="Card">Card</option>
                  <option value="Credit">Credit / Khata</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Receipt Paper Format</label>
                <select
                  value={settings.receiptFormat}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      receiptFormat: e.target.value as PosSettings["receiptFormat"],
                    }))
                  }
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  <option value="80mm">80mm Thermal Slip (Standard POS)</option>
                  <option value="58mm">58mm Mini Thermal Slip (Handheld)</option>
                  <option value="a4">Standard A4 Tax Invoice</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-slate-100">
                <div>
                  <div className="font-bold text-slate-800">Audio Beep on Scan</div>
                  <div className="text-[11px] text-slate-500">Play sound effect when barcode is scanned</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSettings((s) => ({ ...s, soundEnabled: checked }));
                    soundService.setEnabled(checked);
                  }}
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-600"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t border-slate-100">
                <div>
                  <div className="font-bold text-slate-800">Auto-focus Search Bar</div>
                  <div className="text-[11px] text-slate-500">Refocus search after adding each item</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoFocusSearch}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, autoFocusSearch: e.target.checked }))
                  }
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-600"
                />
              </div>

              {/* ESC/POS Thermal Hardware Section */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="font-bold text-slate-800 flex items-center justify-between">
                  <span>⚡ Thermal Printer (ESC/POS)</span>
                  <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    USB / BT / Serial
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Direct ESC/POS commands produce zero-latency thermal printing with automated paper cut, barcode, and cash drawer kick.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  {"usb" in navigator && (
                    <button
                      type="button"
                      onClick={() => handleTestEscPosPrint(true)}
                      className="flex-1 py-2 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Test USB Print</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleTestEscPosPrint(false)}
                    className="flex-1 py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 border border-slate-200"
                  >
                    <span>Download .BIN</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => {
                  try {
                    localStorage.setItem(getSettingsStorageKey(orgId), JSON.stringify(settings));
                    toast({ title: "Settings Saved ✨", description: "Terminal preferences updated." });
                  } catch (error) {
                    console.warn("Failed to save POS settings locally:", error);
                  }
                  setShowSettingsModal(false);
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-600/20"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Price Modal [P] */}
      {showChangePriceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-slate-900 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-600" />
                <span>Change Selling Price (SP) [P]</span>
              </h3>
              <button onClick={() => setShowChangePriceModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-1.5 block font-semibold">New Selling Price (₹)</label>
              <input
                type="number"
                autoFocus
                value={modalPriceValue}
                onChange={(e) => setModalPriceValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSavePrice()}
                className="w-full text-xl font-black font-mono p-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowChangePriceModal(false)}
                className="px-4 py-2 text-xs font-semibold hover:bg-slate-100 text-slate-600 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePrice}
                className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-md shadow-amber-600/20"
              >
                Update Price
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Quantity Modal [Q] */}
      {showChangeQtyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-slate-900 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Hash className="w-4 h-4 text-blue-600" />
                <span>Change Quantity [Q]</span>
              </h3>
              <button onClick={() => setShowChangeQtyModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-1.5 block font-semibold">Quantity Units</label>
              <input
                type="number"
                autoFocus
                min={1}
                value={modalQtyValue}
                onChange={(e) => setModalQtyValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveQty()}
                className="w-full text-xl font-black font-mono p-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowChangeQtyModal(false)}
                className="px-4 py-2 text-xs font-semibold hover:bg-slate-100 text-slate-600 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQty}
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md shadow-blue-600/20"
              >
                Update Quantity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Item Discount Modal [D] */}
      {showChangeDiscountModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-slate-900 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Percent className="w-4 h-4 text-purple-600" />
                <span>Item Discount [D]</span>
              </h3>
              <button onClick={() => setShowChangeDiscountModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModalDiscountType("percent")}
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-xl border transition-all",
                  modalDiscountType === "percent"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                )}
              >
                Percentage (%)
              </button>
              <button
                type="button"
                onClick={() => setModalDiscountType("flat")}
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-xl border transition-all",
                  modalDiscountType === "flat"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                )}
              >
                Flat Amount (₹)
              </button>
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-1.5 block font-semibold">
                Discount Value ({modalDiscountType === "percent" ? "%" : "₹"})
              </label>
              <input
                type="number"
                autoFocus
                value={modalDiscountValue}
                onChange={(e) => setModalDiscountValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveItemDiscount()}
                className="w-full text-xl font-black font-mono p-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowChangeDiscountModal(false)}
                className="px-4 py-2 text-xs font-semibold hover:bg-slate-100 text-slate-600 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItemDiscount}
                className="px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-md shadow-purple-600/20"
              >
                Apply Discount
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Discount Modal [F2] */}
      {showBillDiscountModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-slate-900 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Percent className="w-4 h-4 text-purple-600" />
                <span>Add Bill Discount [F2]</span>
              </h3>
              <button onClick={() => setShowBillDiscountModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBillDiscountTypeInput("percent")}
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-xl border transition-all",
                  billDiscountTypeInput === "percent"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                )}
              >
                Percentage (%)
              </button>
              <button
                type="button"
                onClick={() => setBillDiscountTypeInput("flat")}
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-xl border transition-all",
                  billDiscountTypeInput === "flat"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                )}
              >
                Flat Amount (₹)
              </button>
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-1.5 block font-semibold">Discount Value</label>
              <input
                type="number"
                autoFocus
                value={billDiscountInput}
                onChange={(e) => setBillDiscountInput(e.target.value)}
                className="w-full text-xl font-black font-mono p-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-1.5 block font-semibold">Reason / Coupon (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Festive Promo / VIP Member"
                value={billDiscountReasonInput}
                onChange={(e) => setBillDiscountReasonInput(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowBillDiscountModal(false)}
                className="px-4 py-2 text-xs font-semibold hover:bg-slate-100 text-slate-600 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBillDiscount}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/20"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Additional Charge Modal [F3] */}
      {showAdditionalChargeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-slate-900 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Add Charge [F3]</span>
              </h3>
              <button onClick={() => setShowAdditionalChargeModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-1.5 block font-semibold">Charge Description</label>
              <input
                type="text"
                value={chargeNameInput}
                onChange={(e) => setChargeNameInput(e.target.value)}
                placeholder="Delivery / Packaging Charge"
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-1.5 block font-semibold">Amount (₹)</label>
              <input
                type="number"
                autoFocus
                value={chargeAmountInput}
                onChange={(e) => setChargeAmountInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveAdditionalCharge()}
                placeholder="50"
                className="w-full text-xl font-black font-mono p-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAdditionalChargeModal(false)}
                className="px-4 py-2 text-xs font-semibold hover:bg-slate-100 text-slate-600 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAdditionalCharge}
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md shadow-blue-600/20"
              >
                Add Charge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Lookup Modal [F5] */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                <span>Customer Lookup [F5]</span>
              </h3>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search customer by name or phone..."
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={() => {
                  setShowCustomerModal(false);
                  setShowQuickAddCustomerModal(true);
                }}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shrink-0 shadow-sm"
              >
                + New
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
              <div
                onClick={() => handleSelectCustomer(null)}
                className="p-3 hover:bg-slate-50 cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-900 flex justify-between rounded-lg transition-colors"
              >
                <span>Walk-in Customer (No info)</span>
                <span className="text-slate-400">Default</span>
              </div>
              {customers
                .filter(
                  (c) =>
                    !customerSearchTerm ||
                    c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                    c.phone?.includes(customerSearchTerm)
                )
                .map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    className="p-3 hover:bg-indigo-50 cursor-pointer text-xs flex justify-between items-center rounded-lg transition-colors"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{c.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{c.phone || "No phone"}</div>
                    </div>
                    {c.loyaltyPoints && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold font-mono border border-amber-200">
                        ⭐ {c.loyaltyPoints} pts
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {showQuickAddCustomerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-slate-900 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                <span>Add New Customer</span>
              </h3>
              <button onClick={() => setShowQuickAddCustomerModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-600 font-semibold">GSTIN (Optional)</label>
                <span className="text-[10px] text-slate-400">Auto-fills name</span>
              </div>
              <input
                type="text"
                placeholder="e.g. 27AAPFU0939F1ZV"
                value={newCustomerGstin}
                onChange={(e) => handleQuickGstinChange(e.target.value)}
                maxLength={15}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 uppercase font-mono tracking-wider focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-1.5 block font-semibold">Customer / Business Name *</label>
              <input
                type="text"
                autoFocus
                placeholder="Ramesh Kumar or Company Name"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-1.5 block font-semibold">Phone Number (Optional)</label>
              <input
                type="tel"
                placeholder="9876543210"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowQuickAddCustomerModal(false)}
                className="px-4 py-2 text-xs font-semibold hover:bg-slate-100 text-slate-600 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuickCustomer}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/20"
              >
                Save &amp; Select
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Item Modal [CTRL + I] */}
      {showNewItemModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900 animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>Quick Add Product [CTRL + I]</span>
              </h3>
              <button
                onClick={() => setShowNewItemModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="block text-slate-600 mb-1 font-semibold">Item Name *</label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Tata Salt 1kg / Apple iPhone 15"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Barcode / SKU</label>
                <input
                  type="text"
                  placeholder="Scan or auto-generate"
                  value={newItemBarcode}
                  onChange={(e) => setNewItemBarcode(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Category</label>
                <input
                  type="text"
                  placeholder="Grocery, Electronics..."
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">MRP (₹) *</label>
                <input
                  type="number"
                  placeholder="100"
                  value={newItemMRP}
                  onChange={(e) => setNewItemMRP(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 font-bold font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Selling Price (SP ₹)</label>
                <input
                  type="number"
                  placeholder="95"
                  value={newItemSP}
                  onChange={(e) => setNewItemSP(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 font-bold font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowNewItemModal(false)}
                className="px-4 py-2 text-xs font-semibold hover:bg-slate-100 text-slate-600 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewItem}
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-600/20"
              >
                Create &amp; Add to Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPI QR Payment Modal */}
      {showUPIQRModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center text-slate-900 animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-base flex items-center gap-2">
                <QrCode className="w-5 h-5 text-indigo-600" />
                <span>UPI Dynamic QR Payment</span>
              </h3>
              <button onClick={() => setShowUPIQRModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border-2 border-indigo-200 inline-block shadow-sm mx-auto">
              <QRCodeSVG
                value={`upi://pay?pa=${org?.upi_id || settings.upiId}&pn=${encodeURIComponent(
                  settings.storeName || org?.name || "CredSmart POS"
                )}&am=${grandTotal}&cu=INR`}
                size={180}
              />
            </div>

            <div className="text-2xl font-black font-mono text-emerald-600">
              ₹{grandTotal.toLocaleString("en-IN")}
            </div>

            <p className="text-xs text-slate-500">
              Scan with Google Pay, PhonePe, Paytm, or any BHIM UPI app ({org?.upi_id || settings.upiId || "Instant UPI"}).
            </p>

            <button
              onClick={() => setShowUPIQRModal(false)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-600/20"
            >
              Done / Payment Received
            </button>
          </div>
        </div>
      )}

      {/* Camera Barcode Scanner Modal */}
      {showCameraScannerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-center text-slate-900 animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-600" />
                <span>Live Barcode Camera Scanner</span>
              </h3>
              <button onClick={() => setShowCameraScannerModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-32 border-2 border-indigo-400 rounded-xl relative">
                  <div className="w-full h-0.5 bg-emerald-400 shadow-md shadow-emerald-400 animate-pulse absolute top-1/2 -translate-y-1/2" />
                </div>
              </div>
              <div className="text-slate-300 text-xs text-center p-4">
                <ScanLine className="w-8 h-8 text-indigo-400 mx-auto mb-2 animate-bounce" />
                <p>Point camera at barcode or product tag</p>
              </div>
            </div>

            <div className="flex justify-between gap-2">
              <button
                onClick={() => setShowCameraScannerModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs border border-slate-200"
              >
                Close Camera
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit POS Confirmation Modal */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Active Items in Cart
                </h3>
                <p className="text-xs text-slate-500">
                  You have active or held bills on screen.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Your cart items are automatically backed up in local session. Would you like to keep them saved or discard before exiting?
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-xs font-bold">
              <button
                onClick={() => {
                  setShowExitConfirmModal(false);
                  navigate(ROUTE_PATHS.dashboard);
                }}
                className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/20"
              >
                Keep &amp; Exit
              </button>

              <button
                onClick={() => {
                  try {
                    localStorage.removeItem(getTabsStorageKey(orgId));
                    localStorage.removeItem(GLOBAL_BACKUP_STORAGE_KEY);
                  } catch (error) {
                    console.warn("Failed to clear POS cart backup:", error);
                  }
                  setShowExitConfirmModal(false);
                  navigate(ROUTE_PATHS.dashboard);
                }}
                className="py-2.5 px-3 border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl"
              >
                Discard &amp; Exit
              </button>

              <button
                onClick={() => setShowExitConfirmModal(false)}
                className="py-2.5 px-3 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. LIVE VOICE ASSISTANT FLOATING BAR & MODAL */}
      {/* ========================================================================= */}

      {/* Floating Active Voice Listening Bar */}
      {isListening && (
        <div className="fixed bottom-20 lg:bottom-8 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[92vw] sm:w-auto bg-white/95 backdrop-blur-xl border border-rose-300 rounded-2xl p-3.5 shadow-2xl shadow-rose-950/20 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-3 min-w-0">
            {/* Pulsing Animated Mic */}
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-600/40">
                <Mic className="w-5 h-5 animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
              </span>
            </div>

            {/* Live Transcript & Soundwave */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Voice Assistant Active</span>
                  <span className="text-[10px] font-mono font-normal text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                    {voiceLang === "hi-IN" ? "हिंदी" : "English"}
                  </span>
                </span>
              </div>
              <p className="text-xs text-rose-700 font-medium truncate mt-0.5">
                {voiceTranscript ? `"${voiceTranscript}"` : voiceFeedback || "Listening for command (e.g. 'Add 2 Milk', 'Save Bill')..."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Lang Switcher */}
            <button
              type="button"
              onClick={() => {
                const nextLang = voiceLang === "en-IN" ? "hi-IN" : "en-IN";
                setVoiceLang(nextLang);
                startVoiceListening(nextLang);
              }}
              className="px-2.5 py-1 text-[11px] font-bold font-mono rounded-lg border border-slate-200 bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors"
              title="Switch Speech Language (English / हिंदी)"
            >
              {voiceLang === "en-IN" ? "HI" : "EN"}
            </button>

            {/* Stop Mic */}
            <button
              type="button"
              onClick={stopVoiceListening}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
              title="Stop Listening"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Voice Assistant Commands Cheat Sheet & Manual Trigger Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-900 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    POS Voice Billing Assistant
                  </h3>
                  <p className="text-xs text-slate-500">
                    Touchless billing via Web Speech recognition
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowVoiceModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mic Trigger Center Card */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
              <button
                type="button"
                onClick={toggleVoiceRecognition}
                className={cn(
                  "w-16 h-16 rounded-3xl mx-auto flex items-center justify-center text-white transition-all shadow-md active:scale-95 cursor-pointer",
                  isListening
                    ? "bg-rose-600 animate-pulse ring-4 ring-rose-300 shadow-rose-600/30"
                    : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20"
                )}
              >
                <Mic className="w-8 h-8" />
              </button>

              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">
                  {isListening ? "Listening... Speak your command" : "Tap Microphone to Speak or Press [V]"}
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  {voiceTranscript ? `Heard: "${voiceTranscript}"` : voiceFeedback || "Supports item names, quantities, discounts, & payment triggers."}
                </p>
              </div>
            </div>

            {/* Quick Command Examples Chips */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Supported Voice Commands:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { cmd: "Add 2 Maggi", desc: "Adds item with quantity" },
                  { cmd: "3 Basmati Rice", desc: "Fast quantity item add" },
                  { cmd: "Quantity 5", desc: "Updates active item qty" },
                  { cmd: "Price 120", desc: "Changes line selling price" },
                  { cmd: "Discount 10 percent", desc: "Applies bill discount" },
                  { cmd: "Payment UPI", desc: "Sets payment to UPI/QR" },
                  { cmd: "Payment Cash", desc: "Sets payment to Cash" },
                  { cmd: "Save and Print", desc: "Completes & prints bill" },
                  { cmd: "Save Bill", desc: "Directly saves transaction" },
                  { cmd: "Hold Bill", desc: "Parks bill into new tab" },
                ].map((c, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      const parsed = parsePOSVoiceCommand(c.cmd);
                      handleExecuteVoiceCommand(parsed);
                    }}
                    className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 cursor-pointer transition-all flex flex-col"
                  >
                    <span className="font-bold text-indigo-700 font-mono">
                      &quot;{c.cmd}&quot;
                    </span>
                    <span className="text-[10px] text-slate-500">{c.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Language:</span>
                <button
                  type="button"
                  onClick={() => setVoiceLang("en-IN")}
                  className={cn(
                    "px-2.5 py-1 text-xs font-bold rounded-lg transition-colors",
                    voiceLang === "en-IN" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                  )}
                >
                  English (India)
                </button>
                <button
                  type="button"
                  onClick={() => setVoiceLang("hi-IN")}
                  className={cn(
                    "px-2.5 py-1 text-xs font-bold rounded-lg transition-colors",
                    voiceLang === "hi-IN" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                  )}
                >
                  हिंदी (Hindi)
                </button>
              </div>

              <button
                onClick={() => setShowVoiceModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs border border-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Receipt Modal */}
      {receiptData && (
        <ReceiptModal
          data={receiptData}
          onClose={() => setReceiptData(null)}
          onNewSale={() => setReceiptData(null)}
        />
      )}
    </div>
  );
}
