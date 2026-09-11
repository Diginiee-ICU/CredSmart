import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileText,
  DollarSign,
  Search,
  Package,
  Sliders,
  Percent,
  Trash2,
  Plus,
  Tag,
  RotateCcw,
  Check,
  Layers,
  ArrowRight,
  Filter,
  CheckSquare,
  Square,
  Info,
  Upload,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { Party, PartyType, PartyCategory, PartyCustomItem } from "@/types/parties";
import { lookupGSTIN, isValidGSTIN, isValidPAN, lookupTaxIdentifier } from "@/utils/gstinLookup";
import { CompanySearchAutocomplete } from "@/components/CompanySearchAutocomplete";
import { TallyGstSearchModal } from "@/components/settings/TallyGstSearchModal";
import { PartyCustomItemsImportModal } from "@/components/parties/PartyCustomItemsImportModal";
import { exportPartyCustomItemsToCSV, downloadCSV } from "@/utils/excelImportExport";
import { INDIAN_STATES_AND_CODES } from "@/utils/suggestionData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useProducts } from "@/context/ProductsContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { normalizeError } from "@/lib/normalizeError";

interface CreatePartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (partyData: Omit<Party, "id" | "created_at">) => Promise<void>;
  initialData?: Party | null;
  defaultType?: PartyType;
}

type CompanySearchResult = {
  name: string;
  tradeName?: string;
  phone?: string;
  address?: string;
  pincode?: string;
  city?: string;
  state?: string;
  category?: string;
  cin?: string;
};

const CATEGORY_OPTIONS: string[] = [
  "Retailer",
  "Wholesaler",
  "Distributor",
  "Walk-in Customer",
  "Corporate",
  "Manufacturer",
  "End Consumer",
  "Vendor",
  "General",
];

export function CreatePartyModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultType = "customer",
}: CreatePartyModalProps) {
  const { products: catalogProducts, loading: loadingProducts, refreshProducts } = useProducts();
  const [activeTab, setActiveTab] = useState<"general" | "address" | "credit" | "inventory" | "custom">("general");
  const [partyType, setPartyType] = useState<PartyType>(defaultType);
  const [name, setName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<string>("General");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");

  // Address
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Maharashtra");
  const [pincode, setPincode] = useState("");
  const [sameShipping, setSameShipping] = useState(true);
  const [shippingAddress, setShippingAddress] = useState("");

  // Balance & Credit
  const [openingBalance, setOpeningBalance] = useState("0");
  const [balanceType, setBalanceType] = useState<"to_collect" | "to_pay">("to_collect");
  const [creditLimit, setCreditLimit] = useState("");
  const [creditPeriodDays, setCreditPeriodDays] = useState("30");

  // Custom Inventory & Pricing
  const [keepSamePrice, setKeepSamePrice] = useState(true);
  const [keepSameInventory, setKeepSameInventory] = useState(true);
  const [customItems, setCustomItems] = useState<PartyCustomItem[]>([]);
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryCategory, setInventoryCategory] = useState("all");
  const [showCataloguePicker, setShowCataloguePicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerCategory, setPickerCategory] = useState("all");
  const [selectedPickerProductIds, setSelectedPickerProductIds] = useState<Set<string>>(new Set());
  const [bulkDiscountVal, setBulkDiscountVal] = useState("");
  const [showBulkDiscountModal, setShowBulkDiscountModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Custom Fields
  const [dlNumber, setDlNumber] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [notes, setNotes] = useState("");

  // GST Lookup Status
  const [isLookingUpGst, setIsLookingUpGst] = useState(false);
  const [gstLookupSuccess, setGstLookupSuccess] = useState<string | null>(null);
  const [tallyModalOpen, setTallyModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const prevActiveElRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (initialData) {
      setPartyType(initialData.partyType);
      setName(initialData.name || "");
      setTradeName(initialData.tradeName || "");
      setPhone(initialData.phone || "");
      setEmail(initialData.email || "");
      setCategory(initialData.category || "General");
      setGstin(initialData.gstin || "");
      setPan(initialData.pan || "");
      setAddress(initialData.address || "");
      setCity(initialData.city || "");
      setState(initialData.state || "Maharashtra");
      setPincode(initialData.pincode || "");
      setShippingAddress(initialData.shippingAddress || "");
      setOpeningBalance(Math.abs(initialData.openingBalance || 0).toString());
      setBalanceType(initialData.balance >= 0 ? "to_collect" : "to_pay");
      setCreditLimit(initialData.creditLimit ? initialData.creditLimit.toString() : "");
      setCreditPeriodDays(initialData.creditPeriodDays ? initialData.creditPeriodDays.toString() : "30");
      setDlNumber(initialData.customFields?.dlNumber || "");
      setBankAccount(initialData.customFields?.bankAccount || "");
      setBankIfsc(initialData.customFields?.bankIfsc || "");
      setNotes(initialData.customFields?.notes || "");
      setKeepSamePrice(initialData.keepSamePrice ?? (initialData.customFields?.keepSamePrice !== false));
      setKeepSameInventory(initialData.keepSameInventory ?? (initialData.customFields?.keepSameInventory !== false));
      setCustomItems(initialData.customItems || initialData.customFields?.customItems || []);
    } else {
      setPartyType(defaultType);
      setName("");
      setTradeName("");
      setPhone("");
      setEmail("");
      setCategory("General");
      setGstin("");
      setPan("");
      setAddress("");
      setCity("");
      setState("Maharashtra");
      setPincode("");
      setShippingAddress("");
      setOpeningBalance("0");
      setBalanceType(defaultType === "supplier" ? "to_pay" : "to_collect");
      setCreditLimit("");
      setCreditPeriodDays("30");
      setDlNumber("");
      setBankAccount("");
      setBankIfsc("");
      setNotes("");
      setKeepSamePrice(true);
      setKeepSameInventory(true);
      setCustomItems([]);
      setGstLookupSuccess(null);
    }
  }, [initialData, defaultType, isOpen]);

  useEffect(() => {
    if (isOpen && (!catalogProducts || catalogProducts.length === 0)) {
      refreshProducts();
    }
  }, [isOpen, catalogProducts, refreshProducts]);

  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (isOpen) {
      prevActiveElRef.current = document.activeElement as HTMLElement | null;
      if (mainEl) mainEl.setAttribute('aria-hidden', 'true');
      // Prevent background scroll while modal is open
      document.body.style.overflow = 'hidden';
      // Autoscroll modal to top
      modalRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      const scrollables = modalRef.current?.querySelectorAll('.overflow-y-auto, form');
      scrollables?.forEach((s) => {
        (s as HTMLElement).scrollTop = 0;
        s.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      });
      setTimeout(() => {
        modalRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        scrollables?.forEach((s) => {
          (s as HTMLElement).scrollTop = 0;
          s.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        });
        const focusTarget = modalRef.current?.querySelector('input,button,select,textarea,[tabindex]') as HTMLElement | null;
        focusTarget?.focus();
      }, 80);
    } else {
      if (mainEl) mainEl.removeAttribute('aria-hidden');
      document.body.style.overflow = '';
      prevActiveElRef.current?.focus?.();
    }

    return () => {
      if (mainEl) mainEl.removeAttribute('aria-hidden');
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const triggerAutoFill = async (targetId: string, showToast = true) => {
    const clean = targetId.trim().toUpperCase();
    if (!clean) {
      if (showToast) toast.error("Please enter a valid 15-character GSTIN or 10-character PAN.");
      return;
    }
    if (!isValidGSTIN(clean) && !isValidPAN(clean)) {
      if (showToast) toast.error("Invalid format. Enter 15-char GSTIN (e.g. 27AAPFU0939F1ZV) or 10-char PAN (e.g. AAPFU0939F).");
      return;
    }

    setIsLookingUpGst(true);
    setGstLookupSuccess(null);
    try {
      const result = await lookupTaxIdentifier(clean);
      if (result.legalName) {
        setName(result.legalName);
        setTradeName(result.tradeName || result.legalName);
      }
      if (result.pan) {
        setPan(result.pan);
      }
      if (isValidGSTIN(result.gstin) && (!gstin || gstin.length < 15)) {
        setGstin(result.gstin);
      }
      if (result.state) {
        setState(result.state);
      }
      if (result.city) {
        setCity(result.city);
      }
      if (result.pincode) {
        setPincode(result.pincode);
      }
      if (result.address) {
        setAddress(result.address);
        if (sameShipping) {
          setShippingAddress(result.address);
        }
      }
      if (result.category && CATEGORY_OPTIONS.includes(result.category)) {
        setCategory(result.category);
      }
      if (result.phone && !phone) {
        setPhone(result.phone);
      }
      if (result.email && !email) {
        setEmail(result.email);
      }

      if (result.legalName) {
        setGstLookupSuccess(`Verified: ${result.legalName} • ${result.state} (${result.category || "Active"})`);
        if (showToast) {
          toast.success(`Verified details loaded for ${result.legalName}!`);
        }
      } else {
        setGstLookupSuccess(`State: ${result.state} (Code ${result.stateCode}) • PAN: ${result.pan} • Category: ${result.category}`);
        if (showToast) {
          toast.info(`State: ${result.state} • PAN: ${result.pan} detected`);
        }
      }
    } catch (err: unknown) {
      if (showToast) {
        toast.error(normalizeError(err) || "Failed to fetch tax details.");
      }
    } finally {
      setIsLookingUpGst(false);
    }  };

  const handleGstinChange = (value: string) => {
    const clean = value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15);
    setGstin(clean);

    // Auto-detect 10-char PAN
    if (clean.length === 10 && isValidPAN(clean)) {
      setPan(clean);
      triggerAutoFill(clean, false);
      return;
    }

    // Auto-extract PAN from 12+ chars of GSTIN
    if (clean.length >= 12) {
      const extractedPan = clean.substring(2, 12);
      if (extractedPan && !pan) {
        setPan(extractedPan);
      }
    }

    // Auto-trigger on full 15-char GSTIN
    if (clean.length === 15 && isValidGSTIN(clean)) {
      triggerAutoFill(clean, false);
    } else if (clean.length < 10) {
      setGstLookupSuccess(null);
    }
  };

  const handleGSTLookup = () => {
    triggerAutoFill(gstin || pan, true);
  };

  const handleCompanySelect = (comp: CompanySearchResult) => {
    setName(comp.name);
    setTradeName(comp.tradeName || comp.name);
    if (comp.phone) setPhone(comp.phone);
    if (comp.address) {
      setAddress(comp.address);
      if (sameShipping) setShippingAddress(comp.address);
    }
    if (comp.pincode) setPincode(comp.pincode);
    if (comp.city) setCity(comp.city);
    if (comp.state) setState(comp.state);
    if (comp.category && CATEGORY_OPTIONS.includes(String(comp.category))) {
      setCategory(String(comp.category));
    }
    if (comp.cin) {
      setNotes((prev) => (prev ? `${prev} | CIN: ${comp.cin}` : `CIN: ${comp.cin}`));
    }
    setGstLookupSuccess(`Selected: ${comp.name} • ${comp.state || "India"} (${comp.cin || "Registered"})`);
    toast.success(`Loaded verified company: ${comp.name}`);
  };

  const handleApplyTallyResult = (result: GSTLookupResult) => {
    if (result.legalName) {
      setName(result.legalName);
      setTradeName(result.tradeName || result.legalName);
    }
    if (result.pan) setPan(result.pan);
    if (result.gstin && isValidGSTIN(result.gstin)) setGstin(result.gstin);
    if (result.address) {
      setAddress(result.address);
      if (sameShipping) setShippingAddress(result.address);
    }
    if (result.pincode) setPincode(result.pincode);
    if (result.city) setCity(result.city);
    if (result.state) setState(result.state);
    if (result.category && CATEGORY_OPTIONS.includes(String(result.category))) {
      setCategory(String(result.category));
    }
    setGstLookupSuccess(`Verified via Tally: ${result.legalName} • ${result.state} (${result.status})`);
  };

  // Distinct product categories from catalog
  const catalogCategories = useMemo(() => {
    const set = new Set<string>();
    (catalogProducts || []).forEach((p) => {
      if (p?.category && typeof p.category === "string" && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [catalogProducts]);

  // Filtered party custom items
  const filteredCustomItems = useMemo(() => {
    return customItems.filter((item) => {
      if (!item) return false;
      const matchCat = inventoryCategory === "all" || item.category === inventoryCategory;
      if (!matchCat) return false;
      if (!inventorySearch.trim()) return true;
      const q = inventorySearch.toLowerCase();
      const pName = (item.productName || "").toLowerCase();
      const pSku = (item.sku || "").toLowerCase();
      const pBarcode = (item.barcode || "").toLowerCase();
      return pName.includes(q) || pSku.includes(q) || pBarcode.includes(q);
    });
  }, [customItems, inventoryCategory, inventorySearch]);

  // Available catalog products for picker
  const filteredPickerProducts = useMemo(() => {
    return (catalogProducts || []).filter((p) => {
      if (!p) return false;
      const matchCat = pickerCategory === "all" || p.category === pickerCategory;
      if (!matchCat) return false;
      if (!pickerSearch.trim()) return true;
      const q = pickerSearch.toLowerCase();
      const pName = (p.name || "").toLowerCase();
      const pSku = (p.sku || "").toLowerCase();
      const pBarcode = (p.barcode || "").toLowerCase();
      return pName.includes(q) || pSku.includes(q) || pBarcode.includes(q);
    });
  }, [catalogProducts, pickerCategory, pickerSearch]);

  // ⚠️ Early return MUST come after all hooks (Rules of Hooks)
  if (!isOpen) return null;

  const handleTogglePickerProduct = (prodId: string) => {
    setSelectedPickerProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(prodId)) next.delete(prodId);
      else next.add(prodId);
      return next;
    });
  };

  const handleSelectAllPickerProducts = (selectAll: boolean) => {
    if (selectAll) {
      const allIds = new Set(filteredPickerProducts.map((p) => p.id));
      setSelectedPickerProductIds(allIds);
    } else {
      setSelectedPickerProductIds(new Set());
    }
  };

  const handleAddSelectedFromCatalogue = () => {
    if (selectedPickerProductIds.size === 0) {
      toast.error("Please select at least one product from catalogue.");
      return;
    }

    const newItems: PartyCustomItem[] = [];
    const existingMap = new Map(customItems.map((ci) => [ci.productId, ci]));

    (catalogProducts || []).forEach((p) => {
      if (selectedPickerProductIds.has(p.id)) {
        if (!existingMap.has(p.id)) {
          const stdPrice = p.selling_price || p.sellingPrice || p.mrp || 0;
          newItems.push({
            productId: p.id,
            productName: p.name,
            category: p.category || "General",
            brand: p.brand || null,
            sku: p.sku || undefined,
            barcode: p.barcode || null,
            unit: p.unit || "PCS",
            standardPrice: stdPrice,
            customPrice: stdPrice,
            costPrice: p.purchase_price || p.purchasePrice || 0,
            gstRate: p.gstRate || p.tax_rate || 18,
            hsnCode: p.hsnCode || undefined,
            customStock: p.currentStock || p.stock || 0,
            minStockAlert: p.minStockAlert || 5,
            isActive: true,
          });
        }
      }
    });

    if (newItems.length > 0) {
      setCustomItems((prev) => [...prev, ...newItems]);
      toast.success(`Added ${newItems.length} product(s) to party catalog!`);
    } else {
      toast.info("Selected products are already in the party catalog.");
    }

    setSelectedPickerProductIds(new Set());
    setShowCataloguePicker(false);
  };

  const handleUpdateCustomPrice = (productId: string, val: string) => {
    const num = parseFloat(val);
    const safeNum = isNaN(num) ? 0 : Math.max(0, num);
    setCustomItems((prev) =>
      prev.map((ci) => (ci.productId === productId ? { ...ci, customPrice: safeNum } : ci))
    );
  };

  const handleResetCustomPrice = (productId: string) => {
    setCustomItems((prev) =>
      prev.map((ci) => (ci.productId === productId ? { ...ci, customPrice: ci.standardPrice } : ci))
    );
    toast.info("Reset price to master catalogue price.");
  };

  const handleRemoveCustomItem = (productId: string) => {
    setCustomItems((prev) => prev.filter((ci) => ci.productId !== productId));
    toast.success("Removed product from party catalog.");
  };

  const handleApplyBulkDiscount = () => {
    const percent = parseFloat(bulkDiscountVal);
    if (isNaN(percent)) {
      toast.error("Please enter a valid percentage number.");
      return;
    }
    setCustomItems((prev) =>
      prev.map((ci) => {
        const discounted = Math.round(ci.standardPrice * (1 - percent / 100) * 100) / 100;
        return {
          ...ci,
          customPrice: Math.max(0, discounted),
        };
      })
    );
    setShowBulkDiscountModal(false);
    setBulkDiscountVal("");
    toast.success(`Applied ${percent}% discount across ${customItems.length} party product(s)!`);
  };

  const handleClearAllCustomItems = () => {
    setCustomItems([]);
    toast.success("Cleared all custom party products.");
  };

  const handleImportCustomItems = (importedItems: PartyCustomItem[], mode: "merge" | "replace") => {
    setCustomItems((prev) => {
      if (mode === "replace") {
        return importedItems;
      }
      const map = new Map<string, PartyCustomItem>();
      prev.forEach((it) => map.set(it.productId, it));
      importedItems.forEach((it) => map.set(it.productId, it));
      return Array.from(map.values());
    });

    // If imported items contain custom prices, ensure keepSamePrice is turned off
    if (importedItems.some((it) => it.customPrice !== it.standardPrice)) {
      setKeepSamePrice(false);
    }
  };

  const handleExportCustomItems = () => {
    if (customItems.length === 0) {
      toast.error("No custom products to export.");
      return;
    }
    const csv = exportPartyCustomItemsToCSV(customItems, name || "Party");
    downloadCSV(`${(name || "Party").replace(/[^a-zA-Z0-9_-]/g, "_")}_Custom_Price_List.csv`, csv);
    toast.success("Custom product prices exported to CSV!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Party Name is required.");
      return;
    }

    const rawBal = parseFloat(openingBalance) || 0;
    const finalBalance = balanceType === "to_pay" ? -Math.abs(rawBal) : Math.abs(rawBal);

    const payload: Omit<Party, "id" | "created_at"> = {
      name: name.trim(),
      tradeName: tradeName.trim() || undefined,
      phone: phone.trim() || null,
      email: email.trim() || null,
      partyType,
      category: category || "General",
      gstin: gstin.trim() ? gstin.trim().toUpperCase() : null,
      pan: pan.trim() ? pan.trim().toUpperCase() : null,
      address: address.trim() || null,
      city: city.trim() || null,
      state: state.trim() || null,
      pincode: pincode.trim() || null,
      shippingAddress: sameShipping ? (address.trim() || null) : (shippingAddress.trim() || null),
      openingBalance: finalBalance,
      balance: finalBalance,
      creditLimit: creditLimit ? parseFloat(creditLimit) : null,
      creditPeriodDays: creditPeriodDays ? parseInt(creditPeriodDays, 10) : 30,
      keepSamePrice,
      keepSameInventory,
      customItems,
      customFields: {
        dlNumber: dlNumber.trim(),
        bankAccount: bankAccount.trim(),
        bankIfsc: bankIfsc.trim().toUpperCase(),
        notes: notes.trim(),
        keepSamePrice,
        keepSameInventory,
        customItems,
      },
      sharedLedgerEnabled: true,
      sharedLedgerStatus: "invited",
    };

    setIsSubmitting(true);
    try {
      await onSave(payload);
      onClose();
    } catch (err: unknown) {
      toast.error(normalizeError(err) || "Failed to save party.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="create-party-title" className="fixed inset-0 z-modal flex items-center justify-center p-0 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-card w-full h-[100dvh] max-h-[100dvh] max-w-full rounded-none border-none p-0 sm:max-w-5xl sm:h-auto sm:max-h-[92vh] sm:rounded-2xl sm:border flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 shadow-2xl">
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 text-primary">
              <Building2 className="w-4 sm:w-5 h-4 sm:h-5" />
            </div>
            <div>
              <h2 id="create-party-title" className="text-base sm:text-lg font-bold text-foreground">
                {initialData ? "Edit Party" : "Create New Party"}
              </h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-1">
                Customer, Supplier, Custom Inventory & Pricing, MCA Directory & GSTIN Verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Create Party"
            className="p-1.5 sm:p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors touch-target cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-border px-3 sm:px-6 bg-muted/20 gap-1 overflow-x-auto scrollbar-none shrink-0">
          {[
            { id: "general", label: "General & GSTIN/PAN" },
            { id: "address", label: "Address & Shipping" },
            { id: "credit", label: "Balance & Credit Limit" },
            {
              id: "inventory",
              label: "Custom Inventory & Pricing",
              badge: (!keepSamePrice || !keepSameInventory || customItems.length > 0) ? (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 bg-primary/15 text-primary font-semibold">
                  {customItems.length > 0 ? `${customItems.length} items` : "Customized"}
                </Badge>
              ) : undefined,
            },
            { id: "custom", label: "Bank & Custom Fields" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as "general" | "address" | "credit" | "inventory" | "custom")}
              className={cn(
                "px-3 sm:px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer",
                activeTab === tab.id
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              {tab.label}
              {tab.badge}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6 scrollbar-thin">
          {/* TAB 1: General & GSTIN */}
          {activeTab === "general" && (
            <div className="space-y-5">
              {/* Party Type Selector */}
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                  Party Type *
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "customer", label: "Customer", desc: "Buyer / Client" },
                    { id: "supplier", label: "Supplier", desc: "Vendor / Seller" },
                    { id: "both", label: "Both", desc: "Customer & Supplier" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setPartyType(t.id as PartyType)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all flex flex-col justify-between",
                        partyType === t.id
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border hover:border-primary/50 text-foreground bg-card"
                      )}
                    >
                      <span className="font-bold text-sm">{t.label}</span>
                      <span className="text-[11px] text-muted-foreground mt-0.5">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* MCA 3M+ Live Company Search Bar */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">Live MCA Company Directory (3 Million+ Indian Companies)</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground bg-background/80 px-2 py-0.5 rounded border border-border">
                    Auto-fills Name, Address, City, PIN & State
                  </span>
                </div>
                <CompanySearchAutocomplete onSelect={handleCompanySelect} placeholder="Search any company by Name (e.g. Reliance, Haldiram, Apollo, Balaji) or CIN..." />
              </div>

              {/* GSTIN / PAN Auto Lookup Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold text-foreground">GSTIN / PAN Tax Verification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTallyModalOpen(true)}
                      className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 bg-[#FCB316]/15 px-2 py-0.5 rounded border border-amber-500/30"
                    >
                      <Building2 className="w-3 h-3 text-[#D97706] dark:text-[#FBBF24]" />
                      Tally Search
                    </button>
                    <span className="text-[10px] text-muted-foreground bg-background/80 px-2 py-0.5 rounded border border-border hidden sm:inline-block">
                      Official Tally Live Engine
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Enter 15-character GSTIN or 10-character PAN..."
                      value={gstin}
                      onChange={(e) => handleGstinChange(e.target.value)}
                      className="uppercase font-mono text-sm tracking-wider"
                      maxLength={15}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGSTLookup}
                    disabled={isLookingUpGst || (gstin.length < 10 && pan.length < 10)}
                    className="shrink-0 gap-2 border-blue-500/40 text-blue-600 hover:bg-blue-500 hover:text-white"
                  >
                    {isLookingUpGst ? (
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Verify
                  </Button>
                </div>

                {gstLookupSuccess && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium pt-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{gstLookupSuccess}</span>
                  </div>
                )}
              </div>

              {/* Name & Trade Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="party-name" className="text-xs font-semibold">
                    Party / Business Legal Name *
                  </Label>
                  <Input
                    id="party-name"
                    placeholder="e.g. Apex Enterprises Pvt Ltd"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="trade-name" className="text-xs font-semibold">
                    Trade / Display Name
                  </Label>
                  <Input
                    id="trade-name"
                    placeholder="e.g. Apex Store"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                  />
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="party-phone" className="text-xs font-semibold">
                    Mobile Number (WhatsApp) *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      +91
                    </span>
                    <Input
                      id="party-phone"
                      placeholder="9876543210"
                      className="pl-12"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="party-email" className="text-xs font-semibold">
                    Email Address
                  </Label>
                  <Input
                    id="party-email"
                    type="email"
                    placeholder="billing@apexstore.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Category & PAN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Party Category / Group</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="party-pan" className="text-xs font-semibold">
                    PAN Number
                  </Label>
                  <Input
                    id="party-pan"
                    placeholder="e.g. ABCDE1234F"
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase().slice(0, 10))}
                    className="uppercase font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Address & Shipping */}
          {activeTab === "address" && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="billing-address" className="text-xs font-semibold">
                  Billing Street Address
                </Label>
                <Textarea
                  id="billing-address"
                  placeholder="Shop / Unit No, Building, Street, Landmark..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-xs font-semibold">
                    City / District
                  </Label>
                  <Input
                    id="city"
                    placeholder="e.g. Mumbai"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state" className="text-xs font-semibold">
                    State / Place of Supply
                  </Label>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger id="state">
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {INDIAN_STATES_AND_CODES.map((st) => (
                        <SelectItem key={st} value={st}>
                          {st}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pincode" className="text-xs font-semibold">
                    PIN Code
                  </Label>
                  <Input
                    id="pincode"
                    placeholder="e.g. 400001"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                    maxLength={6}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-border space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="same-shipping"
                    checked={sameShipping}
                    onChange={(e) => setSameShipping(e.target.checked)}
                    className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
                  />
                  <Label htmlFor="same-shipping" className="text-xs font-medium cursor-pointer">
                    Shipping Address is the same as Billing Address
                  </Label>
                </div>

                {!sameShipping && (
                  <div className="space-y-1.5 animate-in fade-in duration-200">
                    <Label htmlFor="shipping-address" className="text-xs font-semibold">
                      Shipping / Delivery Address
                    </Label>
                    <Textarea
                      id="shipping-address"
                      placeholder="Warehouse / Delivery Location Address..."
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      rows={3}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Balance & Credit Limit */}
          {activeTab === "credit" && (
            <div className="space-y-5">
              {/* Opening Balance Card */}
              <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Opening Balance
                  </span>
                  <span className="text-[11px] text-muted-foreground">As of Today</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="opening-bal" className="text-xs font-semibold">
                      Amount (₹)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                        ₹
                      </span>
                      <Input
                        id="opening-bal"
                        type="number"
                        placeholder="0.00"
                        className="pl-8 text-base font-semibold"
                        value={openingBalance}
                        onChange={(e) => setOpeningBalance(e.target.value)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Balance Nature</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBalanceType("to_collect")}
                        className={cn(
                          "py-2 px-3 rounded-lg border text-xs font-bold transition-all",
                          balanceType === "to_collect"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                            : "border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        To Collect (Receivable / Dr)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBalanceType("to_pay")}
                        className={cn(
                          "py-2 px-3 rounded-lg border text-xs font-bold transition-all",
                          balanceType === "to_pay"
                            ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"
                            : "border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        To Pay (Payable / Cr)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Credit Terms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="credit-limit" className="text-xs font-semibold">
                    Credit Limit (₹)
                  </Label>
                  <Input
                    id="credit-limit"
                    type="number"
                    placeholder="e.g. 50000 (0 for Unlimited)"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Alerts cashier when unpaid invoices exceed this threshold
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="credit-period" className="text-xs font-semibold">
                    Credit Period (Days)
                  </Label>
                  <Select value={creditPeriodDays} onValueChange={setCreditPeriodDays}>
                    <SelectTrigger id="credit-period">
                      <SelectValue placeholder="Select Days" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 Days (Weekly)</SelectItem>
                      <SelectItem value="15">15 Days (Fortnightly)</SelectItem>
                      <SelectItem value="30">30 Days (Monthly)</SelectItem>
                      <SelectItem value="45">45 Days</SelectItem>
                      <SelectItem value="60">60 Days (2 Months)</SelectItem>
                      <SelectItem value="90">90 Days (Quarterly)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Generates overdue alerts after this grace period
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Custom Inventory & Pricing */}
          {activeTab === "inventory" && (
            <div className="space-y-5">
              {/* Dual Checkbox Control Panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Checkbox 1: Keep Same Price */}
                <div
                  className={cn(
                    "p-4 rounded-xl border transition-all flex items-start gap-3",
                    keepSamePrice
                      ? "bg-muted/30 border-border"
                      : "bg-primary/5 border-primary/40 shadow-xs"
                  )}
                >
                  <Checkbox
                    id="keep-same-price"
                    checked={keepSamePrice}
                    onCheckedChange={(checked) => setKeepSamePrice(!!checked)}
                    className="mt-0.5"
                  />
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="keep-same-price" className="text-xs font-bold text-foreground cursor-pointer flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-primary" />
                      Keep Same Price
                    </Label>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {keepSamePrice
                        ? "Using default catalogue prices. Uncheck to define custom selling rates for this party."
                        : "Custom pricing enabled! Updated rates set below will automatically apply when billing."}
                    </p>
                  </div>
                </div>

                {/* Checkbox 2: Keep Same Inventory */}
                <div
                  className={cn(
                    "p-4 rounded-xl border transition-all flex items-start gap-3",
                    keepSameInventory
                      ? "bg-muted/30 border-border"
                      : "bg-primary/5 border-primary/40 shadow-xs"
                  )}
                >
                  <Checkbox
                    id="keep-same-inventory"
                    checked={keepSameInventory}
                    onCheckedChange={(checked) => setKeepSameInventory(!!checked)}
                    className="mt-0.5"
                  />
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="keep-same-inventory" className="text-xs font-bold text-foreground cursor-pointer flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-primary" />
                      Keep Same Inventory
                    </Label>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {keepSameInventory
                        ? "All master catalogue products are sellable to this party."
                        : "Restricted catalogue enabled! Only products added below will be selectable during billing."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Mode Summary Banner & Party-Specific Scope Note */}
              <div className="space-y-2">
                <div className="p-3 sm:p-3.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Info className="w-4 h-4 text-primary shrink-0" />
                    <span>
                      {keepSamePrice && keepSameInventory ? (
                        <span><strong>Standard Mode:</strong> Full catalogue available at standard master prices.</span>
                      ) : !keepSamePrice && keepSameInventory ? (
                        <span><strong>Custom Pricing Mode:</strong> Full catalogue available with party price overrides.</span>
                      ) : keepSamePrice && !keepSameInventory ? (
                        <span><strong>Restricted Inventory Mode:</strong> Only {customItems.length} configured product(s) available at standard rates.</span>
                      ) : (
                        <span><strong>Custom Catalogue & Pricing Mode:</strong> Only {customItems.length} configured product(s) available at custom rates.</span>
                      )}
                    </span>
                  </div>
                  <Badge variant="outline" className="font-semibold shrink-0 text-[11px]">
                    {customItems.length} Party Product{customItems.length === 1 ? "" : "s"}
                  </Badge>
                </div>

                <div className="p-2.5 sm:p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-medium">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5 sm:mt-0" />
                    <span>
                      <strong>Note:</strong> These items and custom prices will be saved <u>only for this Party/Customer</u> ({name || "this party"}) and will not affect other parties or your master catalogue.
                    </span>
                  </div>
                  <Badge variant="outline" className="font-semibold shrink-0 text-[10px] bg-background border-blue-500/30 text-blue-700 dark:text-blue-300 hidden sm:inline-flex">
                    Party Scoped
                  </Badge>
                </div>
              </div>

              {/* Filter & Actions Bar */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="flex flex-1 items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Filter party products by Name, SKU, Barcode..."
                        value={inventorySearch}
                        onChange={(e) => setInventorySearch(e.target.value)}
                        className="pl-8 h-9 text-xs"
                      />
                      {inventorySearch && (
                        <button
                          type="button"
                          onClick={() => setInventorySearch("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowImportModal(true)}
                      className="h-9 gap-1.5 text-xs font-semibold"
                      title="Bulk import custom product price list from Excel/CSV"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
                      Bulk Import CSV
                    </Button>

                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setSelectedPickerProductIds(new Set());
                        setPickerSearch("");
                        setPickerCategory("all");
                        setShowCataloguePicker(true);
                      }}
                      className="h-9 gap-1.5 text-xs font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add from Catalogue
                    </Button>

                    {customItems.length > 0 && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleExportCustomItems}
                          className="h-9 gap-1.5 text-xs font-medium"
                          title="Export current party custom price list to CSV"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Export CSV
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowBulkDiscountModal(true)}
                          className="h-9 gap-1.5 text-xs"
                          disabled={keepSamePrice}
                          title={keepSamePrice ? "Uncheck 'Keep Same Price' to apply bulk discount" : undefined}
                        >
                          <Percent className="w-3.5 h-3.5 text-primary" />
                          Bulk Discount
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleClearAllCustomItems}
                          className="h-9 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          title="Clear all assigned products"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Touch Category Filter Chips */}
                {catalogCategories.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                    <span className="text-muted-foreground font-semibold text-[11px] shrink-0">Filter:</span>
                    <button
                      type="button"
                      onClick={() => setInventoryCategory("all")}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer",
                        inventoryCategory === "all"
                          ? "bg-primary text-primary-foreground shadow-2xs"
                          : "bg-muted hover:bg-muted/80 text-muted-foreground"
                      )}
                    >
                      All ({customItems.length})
                    </button>
                    {catalogCategories.map((cat) => {
                      const count = customItems.filter((it) => (it.category || "General") === cat).length;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setInventoryCategory(cat)}
                          className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer",
                            inventoryCategory === cat
                              ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                              : "bg-muted/60 hover:bg-muted text-muted-foreground"
                          )}
                        >
                          {cat} {count > 0 ? `(${count})` : ""}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Custom Items List */}
              {customItems.length === 0 ? (
                <div className="p-8 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center text-center space-y-4 bg-muted/10">
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <Package className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 max-w-md">
                    <h4 className="text-sm font-bold text-foreground">No Products Configured for this Party</h4>
                    <p className="text-xs text-muted-foreground">
                      Select items from your master catalogue or bulk import an Excel / CSV price list to assign custom selling prices. <span className="font-semibold text-foreground">These items and custom prices will be saved only for this Party/Customer.</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 flex-wrap justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowImportModal(true)}
                      className="gap-1.5 text-xs font-semibold"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
                      Bulk Import Excel / CSV
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setSelectedPickerProductIds(new Set());
                        setPickerSearch("");
                        setPickerCategory("all");
                        setShowCataloguePicker(true);
                      }}
                      className="gap-1.5 text-xs font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Browse Master Catalogue
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border border-border rounded-xl overflow-hidden shadow-2xs bg-card">
                  {/* Desktop Table Header */}
                  <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2.5 bg-muted/60 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                    <div className="col-span-5">Product Details</div>
                    <div className="col-span-2 text-right">Catalogue Price</div>
                    <div className="col-span-3 text-right">Party Selling Price</div>
                    <div className="col-span-2 text-center">Action</div>
                  </div>

                  {/* Product Rows */}
                  <div className="divide-y divide-border max-h-[380px] overflow-y-auto scrollbar-thin">
                    {filteredCustomItems.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground">
                        No products match your search query "{inventorySearch}".
                      </div>
                    ) : (
                      filteredCustomItems.map((item) => {
                        const diff = item.customPrice - item.standardPrice;
                        const pctDiff = item.standardPrice > 0 ? (diff / item.standardPrice) * 100 : 0;

                        return (
                          <div
                            key={item.productId}
                            className="p-3 sm:px-4 sm:py-3 flex flex-col md:grid md:grid-cols-12 gap-3 items-start md:items-center hover:bg-muted/25 transition-colors"
                          >
                            {/* Product Info */}
                            <div className="col-span-5 flex flex-col min-w-0">
                              <span className="text-xs font-bold text-foreground truncate">
                                {item.productName}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {item.category || "General"}
                                </Badge>
                                {item.sku && <span className="font-mono text-[10px]">SKU: {item.sku}</span>}
                                {item.barcode && <span className="font-mono text-[10px]">• Code: {item.barcode}</span>}
                                <span className="text-[10px]">• Unit: {item.unit || "PCS"}</span>
                              </div>
                            </div>

                            {/* Catalogue Standard Price */}
                            <div className="col-span-2 text-left md:text-right text-xs">
                              <span className="text-[10px] text-muted-foreground md:hidden mr-1">Standard:</span>
                              <span className="font-semibold text-muted-foreground line-through mr-1">
                                {item.customPrice !== item.standardPrice ? `₹${item.standardPrice.toFixed(2)}` : ""}
                              </span>
                              <span className="font-bold text-foreground">₹{item.standardPrice.toFixed(2)}</span>
                            </div>

                            {/* Party Custom Selling Price + Quick Stepper Chips */}
                            <div className="col-span-3 flex flex-col items-start md:items-end w-full">
                              <div className="relative w-full md:w-32">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                                  ₹
                                </span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  disabled={keepSamePrice}
                                  value={item.customPrice}
                                  onChange={(e) => handleUpdateCustomPrice(item.productId, e.target.value)}
                                  className={cn(
                                    "pl-6 h-8 text-xs font-bold text-right",
                                    keepSamePrice
                                      ? "bg-muted/50 text-muted-foreground cursor-not-allowed"
                                      : "bg-background text-foreground border-primary/40 focus:border-primary"
                                  )}
                                />
                              </div>

                              {/* Mobile Quick Increment / Decrement Steppers */}
                              {!keepSamePrice && (
                                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = Math.max(0, Math.round((item.customPrice - 10) * 100) / 100);
                                      handleUpdateCustomPrice(item.productId, String(next));
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-[10px] font-bold text-muted-foreground cursor-pointer"
                                  >
                                    -₹10
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = Math.round((item.customPrice + 10) * 100) / 100;
                                      handleUpdateCustomPrice(item.productId, String(next));
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-[10px] font-bold text-muted-foreground cursor-pointer"
                                  >
                                    +₹10
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const discounted = Math.round(item.standardPrice * 0.9 * 100) / 100;
                                      handleUpdateCustomPrice(item.productId, String(discounted));
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer"
                                  >
                                    -10%
                                  </button>
                                </div>
                              )}

                              {/* Price Delta Badge */}
                              {!keepSamePrice && item.customPrice !== item.standardPrice && (
                                <div className="mt-1">
                                  {diff < 0 ? (
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                      -₹{Math.abs(diff).toFixed(2)} ({Math.abs(pctDiff).toFixed(1)}% off)
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                      +₹{diff.toFixed(2)} (+{pctDiff.toFixed(1)}%)
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="col-span-2 flex items-center justify-end md:justify-center gap-1.5 w-full md:w-auto">
                              {!keepSamePrice && item.customPrice !== item.standardPrice && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleResetCustomPrice(item.productId)}
                                  title="Reset to catalogue price"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveCustomItem(item.productId)}
                                title="Remove item"
                                className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Custom Fields & Bank Details */}
          {activeTab === "custom" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="dl-number" className="text-xs font-semibold">
                    Drug License (DL) / FSSAI / Reg. Number
                  </Label>
                  <Input
                    id="dl-number"
                    placeholder="e.g. MH-MZ2-123456"
                    value={dlNumber}
                    onChange={(e) => setDlNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bank-account" className="text-xs font-semibold">
                    Bank Account Number
                  </Label>
                  <Input
                    id="bank-account"
                    placeholder="e.g. 50200012345678"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="bank-ifsc" className="text-xs font-semibold">
                    Bank IFSC Code
                  </Label>
                  <Input
                    id="bank-ifsc"
                    placeholder="e.g. HDFC0001234"
                    value={bankIfsc}
                    onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                    className="uppercase font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="party-notes" className="text-xs font-semibold">
                    Internal Remarks / Payment Instructions
                  </Label>
                  <Input
                    id="party-notes"
                    placeholder="Special discounts, preferred transport, etc."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {activeTab !== "general" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (activeTab === "address") setActiveTab("general");
                      else if (activeTab === "credit") setActiveTab("address");
                      else if (activeTab === "inventory") setActiveTab("credit");
                      else if (activeTab === "custom") setActiveTab("inventory");
                    }}
                    className="cursor-pointer"
                  >
                    ← Back
                  </Button>
                )}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="cursor-pointer">
                Cancel
              </Button>
              {activeTab !== "custom" ? (
                <Button
                  type="button"
                  onClick={() => {
                    if (activeTab === "general") setActiveTab("address");
                    else if (activeTab === "address") setActiveTab("credit");
                    else if (activeTab === "credit") setActiveTab("inventory");
                    else if (activeTab === "inventory") setActiveTab("custom");
                  }}
                  className="gap-1.5 cursor-pointer"
                >
                  Continue →
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting} className="gap-2 cursor-pointer">
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {initialData ? "Update Party" : "Save & Create Party"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Catalogue Multi-Select Modal Dialog */}
      {showCataloguePicker && (
        <div className="fixed inset-0 z-popover flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-card w-full max-w-3xl rounded-2xl border border-border shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Select Products from Master Catalogue</h3>
                  <p className="text-xs text-muted-foreground">Pick items to assign or customize pricing only for this Party/Customer</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowCataloguePicker(false)}
                className="h-8 w-8 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Filter Bar */}
            <div className="p-3 border-b border-border flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-background">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search catalogue by Name, SKU, Barcode..."
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
                {pickerSearch && (
                  <button
                    type="button"
                    onClick={() => setPickerSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {catalogCategories.length > 0 && (
                <Select value={pickerCategory} onValueChange={setPickerCategory}>
                  <SelectTrigger className="w-full sm:w-[150px] h-8 text-xs shrink-0">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {catalogCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const allSelected = filteredPickerProducts.length > 0 && filteredPickerProducts.every((p) => selectedPickerProductIds.has(p.id));
                  handleSelectAllPickerProducts(!allSelected);
                }}
                className="h-8 text-xs shrink-0"
              >
                {filteredPickerProducts.length > 0 && filteredPickerProducts.every((p) => selectedPickerProductIds.has(p.id))
                  ? "Deselect All"
                  : "Select All"}
              </Button>
            </div>

            {/* Products List */}
            <div className="flex-1 overflow-y-auto p-3 divide-y divide-border max-h-[400px] scrollbar-thin">
              {loadingProducts ? (
                <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Loading catalogue products...</span>
                </div>
              ) : filteredPickerProducts.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                  <p className="font-semibold text-foreground">No Catalogue Products Found</p>
                  <p>Create products in Item Master or Catalogue first, or refresh.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => refreshProducts()}
                    className="h-7 text-xs gap-1.5"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Refresh Catalogue
                  </Button>
                </div>
              ) : (
                filteredPickerProducts.map((prod) => {
                  const isSelected = selectedPickerProductIds.has(prod.id);
                  const isAlreadyAdded = customItems.some((ci) => ci.productId === prod.id);
                  const price = prod.selling_price || prod.sellingPrice || prod.mrp || 0;

                  return (
                    <div
                      key={prod.id}
                      onClick={() => !isAlreadyAdded && handleTogglePickerProduct(prod.id)}
                      className={cn(
                        "p-3 rounded-lg flex items-center justify-between gap-3 transition-colors",
                        isAlreadyAdded
                          ? "opacity-50 bg-muted/20 cursor-not-allowed"
                          : isSelected
                          ? "bg-primary/10 border border-primary/30 cursor-pointer"
                          : "hover:bg-muted/40 cursor-pointer"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Checkbox
                          checked={isSelected || isAlreadyAdded}
                          disabled={isAlreadyAdded}
                          onCheckedChange={() => !isAlreadyAdded && handleTogglePickerProduct(prod.id)}
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-foreground block truncate">
                            {prod.name}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {prod.category || "General"}
                            </Badge>
                            {prod.sku && <span>SKU: {prod.sku}</span>}
                            <span>• Stock: {prod.currentStock ?? prod.stock ?? 0} {prod.unit || "PCS"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-foreground">₹{price.toFixed(2)}</span>
                        {isAlreadyAdded && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Already Added
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border flex items-center justify-between bg-muted/20">
              <span className="text-xs text-muted-foreground font-medium">
                {selectedPickerProductIds.size} product{selectedPickerProductIds.size === 1 ? "" : "s"} selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCataloguePicker(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={selectedPickerProductIds.size === 0}
                  onClick={handleAddSelectedFromCatalogue}
                  className="gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Selected ({selectedPickerProductIds.size})
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Discount Modal */}
      {showBulkDiscountModal && (
        <div className="fixed inset-0 z-popover flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Apply Bulk Discount</h3>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowBulkDiscountModal(false)}
                className="h-7 w-7"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Enter a percentage to discount all {customItems.length} party products below their standard catalogue price.
            </p>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Discount Percentage (%)</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="e.g. 10"
                  value={bulkDiscountVal}
                  onChange={(e) => setBulkDiscountVal(e.target.value)}
                  className="pr-8 text-sm font-bold"
                  autoFocus
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  %
                </span>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 pt-1">
                {[5, 10, 15, 20, 25].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBulkDiscountVal(preset.toString())}
                    className="px-2 py-1 rounded-md text-[11px] font-semibold bg-muted hover:bg-primary/10 hover:text-primary transition-colors border border-border"
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowBulkDiscountModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!bulkDiscountVal}
                onClick={handleApplyBulkDiscount}
              >
                Apply Discount
              </Button>
            </div>
          </div>
        </div>
      )}

      <TallyGstSearchModal
        open={tallyModalOpen}
        onOpenChange={setTallyModalOpen}
        initialGstin={gstin}
        onApply={handleApplyTallyResult}
      />

      <PartyCustomItemsImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        partyName={name || "Party"}
        catalogProducts={catalogProducts || []}
        onImport={handleImportCustomItems}
      />
    </div>,
    document.body
  );
}
