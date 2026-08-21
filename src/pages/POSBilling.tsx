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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTE_PATHS } from "@/config/routes";
import { Product, Batch } from "@/types/pos";
import { soundService } from "@/lib/sound";
import { ReceiptModal, ReceiptData } from "@/components/ReceiptModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuditLog } from "@/hooks/useAuditLog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";
import { buildReceiptEscPos, printViaWebUSB, EscPosBuilder } from "@/utils/escpos";

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
  defaultTaxRate: 5,
  storeName: "CredSmart Retail Store",
  storeAddress: "Shop #12, Market Complex, MG Road",
  storePhone: "+91 98765 43210",
  storeGstin: "29AAAAA0000A1Z5",
  upiId: "credsmart@upi",
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

  // Multi-Tab Held Bills State with local cart restoration
  const [tabs, setTabs] = useState<BillingTab[]>(() => {
    try {
      const saved = localStorage.getItem(getTabsStorageKey(orgId)) || localStorage.getItem(GLOBAL_BACKUP_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
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
          const totalItems = parsed.reduce((sum: number, t: BillingTab) => sum + (t.items?.length || 0), 0);
          if (totalItems > 0 && tabs.every((t) => t.items.length === 0)) {
            setTabs(parsed);
            if (parsed[0]?.id) setActiveTabId(parsed[0].id);
            toast({
              title: "🛒 Active Cart Restored",
              description: `Recovered ${totalItems} unbilled items across ${parsed.length} tab(s) from previous session.`,
              duration: 3000,
            });
          }
        }
      }
    } catch (e) {
      console.warn("Cart auto-sync error:", e);
    }
  }, [orgId]);

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
      // Also persist to global backup if tabs contain items
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
      } catch {}

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
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [isProcessingSave, setIsProcessingSave] = useState(false);

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

        let batchMap: Record<string, Batch[]> = {};
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

        if (!error && data) {
          setCustomers(
            data.map((c) => ({
              id: c.id,
              name: c.name,
              phone: c.phone,
              email: c.email,
              balance: 0,
              loyaltyPoints: Math.floor(Math.random() * 250),
            }))
          );
        }
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
      const batch = customBatch || product.batches[0] || {
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
              title: "Item Scanned",
              description: `${matched.name} added to bill.`,
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
      title: "Bill Held",
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
      toast({ title: "Item Created", description: `${newItemName} added to inventory & bill.` });
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
      toast({ title: "Customer Added", description: `${newCustomerName} saved & selected.` });
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
          description: "Please add at least one item before saving.",
          variant: "destructive",
        });
        soundService.playErrorBeep();
        return;
      }

      setIsProcessingSave(true);
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      const storeName = settings.storeName || org?.name || "CredSmart Retail Store";

      try {
        if (orgId && user) {
          // 1. Insert Sales Record into Supabase
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
            // 2. Insert Sale Items
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

            // 3. Deduct Stock
            for (const ci of currentTab.items) {
              try {
                const newStock = Math.max(0, ci.batch.stock - ci.quantity);
                await supabase.from("product_batches").update({ stock: newStock }).eq("id", ci.batch.id);
              } catch (uErr) {
                console.warn("Stock update notice:", uErr);
              }
            }

            // 4. Record Udhar / Credit Ledger if Payment Mode is Credit
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

            // 5. Audit Log
            auditLog("create", "sale", sale.id, {
              invoice: invoiceNumber,
              total: grandTotal,
              items: currentTab.items.length,
              payment: currentTab.paymentMode,
              customer: currentTab.customer?.name || "Walk-in",
            });
          }
        }

        soundService.playSuccessChime();

        // Prepare Receipt Data
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
          storeAddress: settings.storeAddress,
          storePhone: settings.storePhone,
          gstin: settings.storeGstin,
          customerName: currentTab.customer?.name || null,
          customerPhone: currentTab.customer?.phone || null,
          date: new Date(),
        };

        if (shouldPrint || settings.autoPrintOnSave) {
          setReceiptData(preparedReceipt);
        }

        toast({
          title: "Bill Saved Successfully! 🎉",
          description: `Invoice #${invoiceNumber} recorded for ₹${grandTotal}.`,
          duration: 3000,
        });

        // Reset current tab or close if multiple tabs
        if (tabs.length > 1) {
          handleCloseTab(activeTabId);
        } else {
          const reset = createNewTab(1);
          setTabs([reset]);
          setActiveTabId(reset.id);
        }
      } catch (err) {
        console.error("Save bill error:", err);
        toast({
          title: "Save Notice",
          description: "Bill processed locally. Check your sales history.",
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
    } catch (err: any) {
      toast({ title: "Test Print Failed", description: err.message, variant: "destructive" });
    }
  };

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
      // Ignore if user is inside an input or modal when single keys (P, Q, D, DEL) fire,
      // but always process Ctrl combinations and Function keys F1..F7
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
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 select-none overflow-hidden h-screen w-screen">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER matching Capture11.PNG */}
      {/* ========================================================================= */}
      <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between shrink-0 shadow-2xs z-30">
        {/* Left: Exit POS */}
        <button
          onClick={handleExitPOS}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all shadow-2xs active:scale-95"
          title="Exit POS Terminal"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          <span>Exit POS</span>
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-normal">
            [CTRL + ESC]
          </span>
        </button>

        {/* Center: Title */}
        <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
          <span>POS Billing</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono font-medium text-emerald-600 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>TURBO SPEED</span>
          </span>
        </h1>

        {/* Right: Watch Tutorial & Settings */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowTutorialModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-400 dark:border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100/80 transition-all text-xs font-medium active:scale-95"
          >
            <PlayCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Watch how to use POS Billing</span>
            <span className="sm:hidden">Tutorial</span>
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-all active:scale-95"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Settings</span>
            <span className="text-[10px] font-mono text-slate-400 font-normal">[CTRL + S]</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MULTI-TAB BILLING (HELD BILLS) BAR matching Capture11.PNG */}
      {/* ========================================================================= */}
      <div className="h-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 flex items-center justify-between shrink-0 overflow-x-auto scrollbar-none z-20">
        <div className="flex items-center gap-1.5 h-full">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const itemsCount = tab.items.reduce((acc, it) => acc + it.quantity, 0);

            return (
              <div
                key={tab.id}
                onClick={() => handleSwitchTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 h-8 px-3.5 rounded-t-md text-xs font-medium cursor-pointer border-t border-x transition-all select-none relative",
                  isActive
                    ? "bg-[#fffbf0] dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 font-semibold shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                )}
              >
                <span>{tab.title}</span>
                <span className="text-[10px] font-mono opacity-60">
                  [CTRL + {tab.tabIndex}]
                </span>

                {itemsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                    {itemsCount}
                  </span>
                )}

                <button
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  className="hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors ml-1"
                  title="Close Tab"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {/* + Hold Bill & Create Another */}
          {tabs.length < 5 && (
            <button
              onClick={handleHoldBillAndCreate}
              className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-md transition-colors ml-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Hold Bill &amp; Create Another</span>
              <span className="text-[10px] font-mono font-normal opacity-70">
                [CTRL + B]
              </span>
            </button>
          )}
        </div>

        <div className="hidden md:flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
          <span>Active: {currentTab.title}</span>
          <span>•</span>
          <span>{currentTab.items.length} Lines</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN TERMINAL WORKSPACE (LEFT ITEMS + RIGHT SUMMARY) */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden bg-slate-50 dark:bg-slate-950">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: ACTION BUTTONS + SEARCH + ITEMS TABLE */}
        {/* ========================================================================= */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          {/* ACTION HOTKEY BAR matching Capture11.PNG */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 flex-wrap bg-white dark:bg-slate-900 shrink-0">
            {/* + New Item [CTRL + I] */}
            <button
              onClick={() => setShowNewItemModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all shadow-2xs active:scale-95"
            >
              <span>+ New Item</span>
              <span className="text-[10px] font-mono text-slate-400 font-normal">
                [CTRL + I]
              </span>
            </button>

            {/* Change Price [P] */}
            <button
              onClick={handleOpenChangePrice}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 transition-all shadow-2xs active:scale-95"
            >
              <span>Change Price</span>
              <span className="text-[10px] font-mono text-slate-400 font-normal">[P]</span>
            </button>

            {/* Change QTY [Q] */}
            <button
              onClick={handleOpenChangeQty}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 transition-all shadow-2xs active:scale-95"
            >
              <span>Change QTY</span>
              <span className="text-[10px] font-mono text-slate-400 font-normal">[Q]</span>
            </button>

            {/* Change Discount [D] */}
            <button
              onClick={handleOpenChangeDiscount}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 transition-all shadow-2xs active:scale-95"
            >
              <span>Change Discount</span>
              <span className="text-[10px] font-mono text-slate-400 font-normal">[D]</span>
            </button>

            {/* Delete Item [DEL] */}
            <button
              onClick={handleDeleteSelectedItem}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/30 hover:bg-red-100 text-xs font-semibold text-red-600 dark:text-red-400 transition-all shadow-2xs active:scale-95 ml-auto sm:ml-0"
            >
              <span>Delete Item</span>
              <span className="text-[10px] font-mono opacity-70 font-normal">[DEL]</span>
            </button>
          </div>

          {/* SEARCH & BARCODE INPUT BAR matching Capture11.PNG */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 relative">
            <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all bg-white dark:bg-slate-800 shadow-xs">
              {/* Category Dropdown */}
              <div className="relative border-r border-slate-200 dark:border-slate-700 shrink-0">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="appearance-none bg-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50 py-2.5 pl-3 pr-7 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat} className="bg-white dark:bg-slate-900">
                      {cat === "All" ? "Category ˅" : cat}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                  placeholder="Search by Item/ Serial no./ HSN code/ SKU/ Custom Field / Category or Scan Barcode"
                  className="w-full py-2.5 px-3 text-xs bg-transparent focus:outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 font-medium"
                />

                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      searchInputRef.current?.focus();
                    }}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-600 mr-2"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* [F1] Badge */}
                <div className="pr-3 flex items-center">
                  <span className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded">
                    F1
                  </span>
                </div>
              </div>
            </div>

            {/* Instant Search Dropdown Auto-suggest */}
            {searchFocused && searchQuery.trim().length > 0 && (
              <div className="absolute top-full left-3 right-3 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 max-h-72 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No items found matching "{searchQuery}". Press{" "}
                    <kbd className="px-1 bg-slate-100 border rounded font-mono">CTRL + I</kbd> to add as new item.
                  </div>
                ) : (
                  filteredProducts.map((p, idx) => (
                    <div
                      key={p.id}
                      onClick={() => handleAddProduct(p)}
                      onMouseEnter={() => setSearchSelectedIdx(idx)}
                      className={cn(
                        "p-2.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 cursor-pointer text-xs transition-colors",
                        idx === searchSelectedIdx
                          ? "bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-100"
                          : "hover:bg-slate-50 dark:hover:bg-slate-700/40"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {p.name}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          {p.barcode ? `Barcode: ${p.barcode}` : p.sku ? `SKU: ${p.sku}` : `Category: ${p.category}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            ₹{p.batches[0]?.mrp || 100}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-mono">
                            Stock: {p.batches[0]?.stock || 0}
                          </span>
                        </div>
                        <button className="px-2 py-1 bg-primary text-primary-foreground rounded text-[10px] font-bold">
                          Add
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* ITEM TABLE matching Capture11.PNG */}
          <div className="flex-1 overflow-y-auto overflow-x-auto relative flex flex-col">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">NO</th>
                  <th className="py-2.5 px-3">ITEMS</th>
                  <th className="py-2.5 px-3">ITEM CODE</th>
                  <th className="py-2.5 px-3 text-right">MRP</th>
                  <th className="py-2.5 px-3 text-right">SP (₹)</th>
                  <th className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span>DISC (%)</span>
                      <Info className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-2.5 px-3 text-center w-28">QUANTITY</th>
                  <th className="py-2.5 px-3 text-right">AMOUNT (₹)</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {currentTab.items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center">
                      {/* Empty State matching Capture11.PNG */}
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400 dark:text-slate-500">
                        {/* 3D Isometric Boxes Wireframe SVG */}
                        <svg
                          className="w-24 h-24 mb-4 text-slate-300 dark:text-slate-700"
                          viewBox="0 0 100 100"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          {/* Box 1 */}
                          <path d="M50 20 L80 35 L50 50 L20 35 Z" fill="currentColor" fillOpacity="0.05" />
                          <path d="M20 35 L20 65 L50 80 L50 50 Z" />
                          <path d="M80 35 L80 65 L50 80 L50 50 Z" />
                          {/* Top accent + */}
                          <path d="M50 32 L50 38" strokeWidth="2" stroke="#6366f1" />
                          <path d="M47 35 L53 35" strokeWidth="2" stroke="#6366f1" />
                        </svg>

                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-1">
                          <Search className="w-3.5 h-3.5 text-slate-400" />
                          <span>Add items by searching item name or item code</span>
                        </p>
                        <p className="text-xs text-slate-400 my-1 font-medium">Or</p>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <span className="font-mono text-indigo-500 font-bold">[⛶]</span>
                          <span>Simply scan barcode to add items</span>
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentTab.items.map((item, idx) => {
                    const isSelected = idx === currentTab.selectedItemIndex;
                    const lineAmount = (item.sp - (item.discountType === "percent" ? (item.sp * item.discountPercent) / 100 : item.discountPercent)) * item.quantity;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => updateCurrentTab((tab) => ({ ...tab, selectedItemIndex: idx }))}
                        className={cn(
                          "transition-colors cursor-pointer",
                          isSelected
                            ? "bg-blue-50/70 dark:bg-blue-950/40 ring-1 ring-inset ring-blue-500/40 font-medium"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        )}
                      >
                        {/* NO */}
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>

                        {/* ITEMS */}
                        <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-100">
                          <div className="flex flex-col">
                            <span>{item.product.name}</span>
                            {item.product.brand && (
                              <span className="text-[10px] text-slate-400">
                                {item.product.brand}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* ITEM CODE */}
                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                          {item.itemCode}
                        </td>

                        {/* MRP */}
                        <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300 font-mono">
                          ₹{item.mrp.toFixed(2)}
                        </td>

                        {/* SP (₹) */}
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-100">
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              updateCurrentTab((tab) => ({ ...tab, selectedItemIndex: idx }));
                              handleOpenChangePrice();
                            }}
                            className="hover:underline hover:text-primary cursor-pointer"
                          >
                            ₹{item.sp.toFixed(2)}
                          </span>
                        </td>

                        {/* DISC (%) */}
                        <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300 font-mono">
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              updateCurrentTab((tab) => ({ ...tab, selectedItemIndex: idx }));
                              handleOpenChangeDiscount();
                            }}
                            className="hover:underline hover:text-primary cursor-pointer"
                          >
                            {item.discountPercent > 0
                              ? `${item.discountPercent}${item.discountType === "percent" ? "%" : "₹"}`
                              : "0%"}
                          </span>
                        </td>

                        {/* QUANTITY with +/- */}
                        <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 shadow-2xs">
                            <button
                              onClick={() => {
                                updateCurrentTab((tab) => {
                                  const newItems = tab.items
                                    .map((it, i) => {
                                      if (i === idx) {
                                        return { ...it, quantity: Math.max(1, it.quantity - 1) };
                                      }
                                      return it;
                                    });
                                  return { ...tab, items: newItems };
                                });
                              }}
                              className="px-1.5 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-l"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span
                              onClick={() => {
                                updateCurrentTab((tab) => ({ ...tab, selectedItemIndex: idx }));
                                handleOpenChangeQty();
                              }}
                              className="px-2.5 py-0.5 text-xs font-bold font-mono min-w-[28px] text-center cursor-pointer hover:bg-slate-50"
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
                              className="px-1.5 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-r"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>

                        {/* AMOUNT (₹) */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          ₹{lineAmount.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT SUMMARY & CHECKOUT PANEL matching Capture11.PNG */}
        {/* ========================================================================= */}
        <div className="w-full lg:w-96 bg-white dark:bg-slate-900 flex flex-col justify-between shrink-0 p-4 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 overflow-y-auto">
          <div className="space-y-4">
            {/* Top Action Buttons: [Add Discount [F2]], [Add Additional Charge [F3]] */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleOpenBillDiscount}
                className="flex items-center justify-between px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all shadow-2xs active:scale-95"
              >
                <span>Add Discount</span>
                <span className="text-[10px] font-mono text-slate-400 font-normal">[F2]</span>
              </button>

              <button
                onClick={handleOpenAdditionalCharge}
                className="flex items-center justify-between px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all shadow-2xs active:scale-95"
              >
                <span>Add Charge</span>
                <span className="text-[10px] font-mono text-slate-400 font-normal">[F3]</span>
              </button>
            </div>

            {/* Bill Details Box */}
            <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                Bill details
              </div>

              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Sub Total</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  ₹{subTotal.toFixed(2)}
                </span>
              </div>

              {itemDiscountsTotal > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Item Discounts</span>
                  <span className="font-mono">- ₹{itemDiscountsTotal.toFixed(2)}</span>
                </div>
              )}

              {billDiscountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Bill Discount ({currentTab.discountValue}{currentTab.discountType === "percent" ? "%" : "₹"})</span>
                  <span className="font-mono">- ₹{billDiscountAmount.toFixed(2)}</span>
                </div>
              )}

              {chargesTotal > 0 && (
                <div className="flex justify-between text-blue-600 font-medium">
                  <span>Additional Charges</span>
                  <span className="font-mono">+ ₹{chargesTotal.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Tax (GST)</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  ₹{taxAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Total Amount Box (Light Green Highlight) matching Capture11.PNG */}
            <div className="bg-[#f0fdf4] dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center justify-between shadow-2xs">
              <span className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                Total Amount
              </span>
              <span className="text-2xl font-black font-mono text-emerald-800 dark:text-emerald-100">
                ₹{grandTotal.toLocaleString("en-IN")}
              </span>
            </div>

            {/* Received Amount & Payment Mode Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Received Amount</span>
                <span className="text-[10px] font-mono text-slate-400">[F4]</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Received Amount Input */}
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
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
                    className="w-full pl-7 pr-3 py-2 text-base font-bold font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/40 focus:outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Payment Mode Dropdown */}
                <div className="relative w-32 shrink-0">
                  <select
                    value={currentTab.paymentMode}
                    onChange={(e) => {
                      const mode = e.target.value as BillingTab["paymentMode"];
                      updateCurrentTab((tab) => ({ ...tab, paymentMode: mode }));
                      if (mode === "UPI") {
                        setShowUPIQRModal(true);
                      }
                    }}
                    className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg py-2.5 pl-3 pr-7 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="Card">Card</option>
                    <option value="Credit">Credit / Khata</option>
                    <option value="Net Banking">Net Banking</option>
                    <option value="Split">Split</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Quick Cash Chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <button
                  type="button"
                  onClick={() =>
                    updateCurrentTab((tab) => ({
                      ...tab,
                      receivedAmount: String(grandTotal),
                    }))
                  }
                  className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[10px] font-bold rounded text-slate-700 dark:text-slate-300"
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
                    className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[10px] font-mono rounded text-slate-600 dark:text-slate-300"
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              {/* Change Return / Balance Due Indicator */}
              {receivedNum > 0 && (
                <div
                  className={cn(
                    "p-2 rounded-lg text-xs font-bold flex justify-between items-center transition-all",
                    receivedNum >= grandTotal
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                  )}
                >
                  <span>
                    {receivedNum >= grandTotal ? "Change Return:" : "Balance Due:"}
                  </span>
                  <span className="font-mono text-sm">
                    ₹{(receivedNum >= grandTotal ? changeDue : balanceRemaining).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Customer Details [F5] */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Customer Details</span>
                </span>
                <button
                  onClick={handleOpenCustomerModal}
                  className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                >
                  {currentTab.customer ? "Change [F5]" : "+ Select [F5]"}
                </button>
              </div>

              {currentTab.customer ? (
                <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {currentTab.customer.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {currentTab.customer.phone || "No Phone"}
                    </span>
                  </div>
                  <button
                    onClick={() => handleSelectCustomer(null)}
                    className="p-1 text-slate-400 hover:text-red-500"
                    title="Remove Customer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={handleOpenCustomerModal}
                  className="text-xs text-slate-400 text-center py-1.5 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Walk-in Customer (Click to add name/phone)
                </div>
              )}
            </div>
          </div>

          {/* Bottom Action Buttons: Save & Print [F6], Save Bill [F7] matching Capture11.PNG */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
            {/* Save & Print [F6] */}
            <button
              onClick={() => handleSaveBill(true)}
              disabled={isProcessingSave || currentTab.items.length === 0}
              className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs sm:text-sm transition-all shadow-xs active:scale-95 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Save &amp; Print</span>
              <span className="text-[10px] font-mono opacity-60 font-normal">[F6]</span>
            </button>

            {/* Save Bill [F7] */}
            <button
              onClick={() => handleSaveBill(false)}
              disabled={isProcessingSave || currentTab.items.length === 0}
              className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-indigo-500/25 active:scale-95 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Save Bill</span>
              <span className="text-[10px] font-mono opacity-80 font-normal">[F7]</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODALS AND DIALOGS */}
      {/* ========================================================================= */}

      {/* Tutorial / Walkthrough Modal */}
      {showTutorialModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-blue-600" />
                <span>How to use High-Speed POS Billing</span>
              </h3>
              <button
                onClick={() => setShowTutorialModal(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl space-y-2">
                <p className="font-bold text-blue-900 dark:text-blue-200">⚡ Supercharged Hotkeys Cheat Sheet:</p>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div><kbd className="px-1 bg-white border rounded">F1</kbd> Focus Search Bar</div>
                  <div><kbd className="px-1 bg-white border rounded">CTRL + B</kbd> Hold Bill &amp; New Tab</div>
                  <div><kbd className="px-1 bg-white border rounded">P</kbd> Change Price of Item</div>
                  <div><kbd className="px-1 bg-white border rounded">Q</kbd> Change Quantity of Item</div>
                  <div><kbd className="px-1 bg-white border rounded">D</kbd> Change Discount %</div>
                  <div><kbd className="px-1 bg-white border rounded">DEL</kbd> Delete Row</div>
                  <div><kbd className="px-1 bg-white border rounded">F2</kbd> Add Bill Discount</div>
                  <div><kbd className="px-1 bg-white border rounded">F3</kbd> Add Extra Charges</div>
                  <div><kbd className="px-1 bg-white border rounded">F4</kbd> Received Amount</div>
                  <div><kbd className="px-1 bg-white border rounded">F5</kbd> Customer Lookup</div>
                  <div><kbd className="px-1 bg-white border rounded">F6</kbd> Save &amp; Print</div>
                  <div><kbd className="px-1 bg-white border rounded">F7</kbd> Quick Save Bill</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  📦 Barcode Scanner Ready:
                </p>
                <p>
                  Any standard USB/Bluetooth barcode scanner will automatically add products without needing to click on the search bar. Audio beep confirmation plays instantly.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowTutorialModal(false)}
                className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs"
              >
                Got it, Start Billing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal [CTRL + S] */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-600" />
                <span>POS Billing Settings</span>
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Default Payment Mode</label>
                <select
                  value={settings.defaultPaymentMode}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      defaultPaymentMode: e.target.value as any,
                    }))
                  }
                  className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-800"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / QR</option>
                  <option value="Card">Card</option>
                  <option value="Credit">Credit / Khata</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Receipt Paper Format</label>
                <select
                  value={settings.receiptFormat}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      receiptFormat: e.target.value as any,
                    }))
                  }
                  className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-800"
                >
                  <option value="80mm">80mm Thermal Slip (Recommended)</option>
                  <option value="58mm">58mm Mini Thermal Slip</option>
                  <option value="a4">Standard A4 Tax Invoice</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-1">
                <div>
                  <div className="font-semibold">Audio Beep on Scan</div>
                  <div className="text-[11px] text-slate-400">Play sound effect when barcode is scanned</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSettings((s) => ({ ...s, soundEnabled: checked }));
                    soundService.setEnabled(checked);
                  }}
                  className="w-4 h-4 rounded text-primary"
                />
              </div>

              <div className="flex items-center justify-between py-1">
                <div>
                  <div className="font-semibold">Auto-focus Search Bar</div>
                  <div className="text-[11px] text-slate-400">Refocus search after adding each item</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoFocusSearch}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, autoFocusSearch: e.target.checked }))
                  }
                  className="w-4 h-4 rounded text-primary"
                />
              </div>

              {/* ESC/POS Thermal Hardware Section */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>⚡ Thermal Printer (ESC/POS)</span>
                  <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
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
                      className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Test USB Print</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleTestEscPosPrint(false)}
                    className="flex-1 py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg text-[11px] flex items-center justify-center gap-1 border border-slate-300 dark:border-slate-700"
                  >
                    <span>Download .BIN Test</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => {
                  try {
                    localStorage.setItem(getSettingsStorageKey(orgId), JSON.stringify(settings));
                    toast({ title: "Settings Saved", description: "Preferences updated." });
                  } catch {}
                  setShowSettingsModal(false);
                }}
                className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Price Modal [P] */}
      {showChangePriceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3">
            <h3 className="font-bold text-sm">Change Selling Price (SP) [P]</h3>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">New Selling Price (₹)</label>
              <input
                type="number"
                autoFocus
                value={modalPriceValue}
                onChange={(e) => setModalPriceValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSavePrice()}
                className="w-full text-lg font-bold p-2 border rounded-lg bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowChangePriceModal(false)}
                className="px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePrice}
                className="px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg"
              >
                Update Price
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Quantity Modal [Q] */}
      {showChangeQtyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3">
            <h3 className="font-bold text-sm">Change Quantity [Q]</h3>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Quantity Units</label>
              <input
                type="number"
                autoFocus
                min={1}
                value={modalQtyValue}
                onChange={(e) => setModalQtyValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveQty()}
                className="w-full text-lg font-bold p-2 border rounded-lg bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowChangeQtyModal(false)}
                className="px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQty}
                className="px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg"
              >
                Update Quantity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Item Discount Modal [D] */}
      {showChangeDiscountModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3">
            <h3 className="font-bold text-sm">Item Discount [D]</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModalDiscountType("percent")}
                className={cn(
                  "flex-1 py-1.5 text-xs font-bold rounded-lg border",
                  modalDiscountType === "percent" ? "bg-primary text-white" : "bg-slate-50"
                )}
              >
                Percentage (%)
              </button>
              <button
                type="button"
                onClick={() => setModalDiscountType("flat")}
                className={cn(
                  "flex-1 py-1.5 text-xs font-bold rounded-lg border",
                  modalDiscountType === "flat" ? "bg-primary text-white" : "bg-slate-50"
                )}
              >
                Flat Amount (₹)
              </button>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">
                Discount Value ({modalDiscountType === "percent" ? "%" : "₹"})
              </label>
              <input
                type="number"
                autoFocus
                value={modalDiscountValue}
                onChange={(e) => setModalDiscountValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveItemDiscount()}
                className="w-full text-lg font-bold p-2 border rounded-lg bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowChangeDiscountModal(false)}
                className="px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItemDiscount}
                className="px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg"
              >
                Apply Discount
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Discount Modal [F2] */}
      {showBillDiscountModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3">
            <h3 className="font-bold text-sm">Add Bill Discount [F2]</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBillDiscountTypeInput("percent")}
                className={cn(
                  "flex-1 py-1.5 text-xs font-bold rounded-lg border",
                  billDiscountTypeInput === "percent" ? "bg-primary text-white" : "bg-slate-50"
                )}
              >
                Percentage (%)
              </button>
              <button
                type="button"
                onClick={() => setBillDiscountTypeInput("flat")}
                className={cn(
                  "flex-1 py-1.5 text-xs font-bold rounded-lg border",
                  billDiscountTypeInput === "flat" ? "bg-primary text-white" : "bg-slate-50"
                )}
              >
                Flat Amount (₹)
              </button>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Discount Value</label>
              <input
                type="number"
                autoFocus
                value={billDiscountInput}
                onChange={(e) => setBillDiscountInput(e.target.value)}
                className="w-full text-lg font-bold p-2 border rounded-lg bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Reason / Coupon (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Festival Offer / Member VIP"
                value={billDiscountReasonInput}
                onChange={(e) => setBillDiscountReasonInput(e.target.value)}
                className="w-full text-xs p-2 border rounded-lg bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowBillDiscountModal(false)}
                className="px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBillDiscount}
                className="px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Additional Charge Modal [F3] */}
      {showAdditionalChargeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3">
            <h3 className="font-bold text-sm">Add Additional Charge [F3]</h3>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Charge Name</label>
              <input
                type="text"
                value={chargeNameInput}
                onChange={(e) => setChargeNameInput(e.target.value)}
                placeholder="Delivery / Packaging Charge"
                className="w-full text-xs p-2 border rounded-lg bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Amount (₹)</label>
              <input
                type="number"
                autoFocus
                value={chargeAmountInput}
                onChange={(e) => setChargeAmountInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveAdditionalCharge()}
                placeholder="50"
                className="w-full text-lg font-bold p-2 border rounded-lg bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAdditionalChargeModal(false)}
                className="px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAdditionalCharge}
                className="px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg"
              >
                Add Charge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Lookup Modal [F5] */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm">Customer Details [F5]</h3>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="p-1 hover:bg-slate-100 rounded text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search customer by name or phone..."
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs border rounded-lg bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <button
                onClick={() => {
                  setShowCustomerModal(false);
                  setShowQuickAddCustomerModal(true);
                }}
                className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold shrink-0"
              >
                + New
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              <div
                onClick={() => handleSelectCustomer(null)}
                className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs font-medium text-slate-600 flex justify-between"
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
                    className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs flex justify-between items-center"
                  >
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{c.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{c.phone || "No phone"}</div>
                    </div>
                    {c.loyaltyPoints && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3">
            <h3 className="font-bold text-sm">+ Add New Customer</h3>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Customer Name</label>
              <input
                type="text"
                autoFocus
                placeholder="Ramesh Kumar"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                className="w-full text-xs p-2 border rounded-lg bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Phone Number (Optional)</label>
              <input
                type="tel"
                placeholder="9876543210"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                className="w-full text-xs p-2 border rounded-lg bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowQuickAddCustomerModal(false)}
                className="px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuickCustomer}
                className="px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg"
              >
                Save &amp; Select
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Item Modal [CTRL + I] */}
      {showNewItemModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-sm">+ Quick Add Item [CTRL + I]</h3>
              <button
                onClick={() => setShowNewItemModal(false)}
                className="p-1 text-slate-400 hover:bg-slate-100 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="block text-slate-500 mb-1">Item Name *</label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Amul Butter 500g"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Barcode / SKU</label>
                <input
                  type="text"
                  placeholder="Scan or auto-gen"
                  value={newItemBarcode}
                  onChange={(e) => setNewItemBarcode(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Category</label>
                <input
                  type="text"
                  placeholder="Dairy, Grocery..."
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">MRP (₹) *</label>
                <input
                  type="number"
                  placeholder="100"
                  value={newItemMRP}
                  onChange={(e) => setNewItemMRP(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Selling Price (SP ₹)</label>
                <input
                  type="number"
                  placeholder="95"
                  value={newItemSP}
                  onChange={(e) => setNewItemSP(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-800 font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                onClick={() => setShowNewItemModal(false)}
                className="px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewItem}
                className="px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg"
              >
                Create &amp; Add to Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPI QR Payment Modal */}
      {showUPIQRModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <h3 className="font-bold text-base flex items-center justify-center gap-2">
              <QrCode className="w-5 h-5 text-indigo-600" />
              <span>Scan UPI QR to Pay</span>
            </h3>

            <div className="bg-white p-4 rounded-xl border inline-block shadow-xs mx-auto">
              <QRCodeSVG
                value={`upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(
                  settings.storeName
                )}&am=${grandTotal}&cu=INR`}
                size={180}
              />
            </div>

            <div className="text-xl font-bold font-mono text-emerald-600">
              ₹{grandTotal.toLocaleString("en-IN")}
            </div>

            <p className="text-xs text-slate-400">
              Customer can scan with GPay, PhonePe, Paytm, or BHIM.
            </p>

            <button
              onClick={() => setShowUPIQRModal(false)}
              className="w-full py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs"
            >
              Done / Payment Received
            </button>
          </div>
        </div>
      )}

      {/* Exit POS Confirmation Modal */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <span>Unsaved Items in Cart</span>
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              You have active or held bills on screen. Would you like to keep them saved or discard them before exiting?
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-xs font-bold">
              <button
                onClick={() => {
                  setShowExitConfirmModal(false);
                  navigate(ROUTE_PATHS.dashboard);
                }}
                className="py-2.5 px-3 bg-primary text-primary-foreground rounded-xl"
              >
                Keep &amp; Exit
              </button>

              <button
                onClick={() => {
                  try {
                    localStorage.removeItem(getTabsStorageKey(orgId));
                  } catch {}
                  setShowExitConfirmModal(false);
                  navigate(ROUTE_PATHS.dashboard);
                }}
                className="py-2.5 px-3 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl"
              >
                Discard &amp; Exit
              </button>

              <button
                onClick={() => setShowExitConfirmModal(false)}
                className="py-2.5 px-3 border hover:bg-slate-100 rounded-xl text-slate-700"
              >
                Cancel
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
