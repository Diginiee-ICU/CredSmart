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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Save,
  Printer,
  FileText,
  UserPlus,
  ArrowLeft,
  Settings,
  ScanBarcode,
  Building2,
  Calendar as CalendarIcon,
  RotateCcw,
  QrCode,
  Edit3,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  Package,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useProducts } from "@/context/ProductsContext";
import { toast } from "sonner";
import {
  BusinessDocument,
  DocumentLineItem,
  PurchaseDocumentType,
} from "@/types/documents";
import {
  INDIAN_STATES_AND_CODES,
  PAYMENT_TERMS_SUGGESTIONS,
} from "@/utils/suggestionData";
import { documentsService } from "@/services/documentsService";
import { cn } from "@/lib/utils";
import { UnifiedInvoiceRenderer } from "@/components/invoices/UnifiedInvoiceRenderer";
import { AddItemsToBillModal, BillItemOption } from "@/components/invoices/AddItemsToBillModal";
import { downloadExactInvoicePdf } from "@/utils/downloadExactInvoice";
import { QuickCreateItemModal, CreatedProductResult } from "@/components/items/QuickCreateItemModal";
import { PartyCustomItem } from "@/types/parties";

interface SupplierOption {
  id: string;
  name: string;
  phone: string;
  email?: string;
  gstin?: string;
  address?: string;
  balance?: number;
  custom_fields?: unknown;
  customItems?: PartyCustomItem[];
  keepSamePrice?: boolean;
  keepSameInventory?: boolean;
}

interface ProductCatalogOption {
  id: string;
  name: string;
  barcode: string | null;
  sku?: string;
  category?: string;
  unit?: string;
  altUnit?: string;
  altUnitConversion?: number;
  tax_rate?: number;
  selling_price?: number;
  tags?: Record<string, unknown>;
  product_batches?: {
    id: string;
    batch_number: string;
    cost_price?: number;
    mrp: number;
    stock: number;
  }[];
}

interface UnifiedPurchaseProduct {
  id: string;
  name: string;
  category: string;
  barcode?: string;
  sku?: string;
  hsn?: string;
  unit: string;
  altUnit?: string;
  altUnitConversion?: number;
  costPrice: number;
  mrp: number;
  gstRate: number;
  stock: number;
  isDb?: boolean;
}

interface PurchaseInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  initialDocType?: PurchaseDocumentType;
  editingDoc?: BusinessDocument | null;
  prefilledSupplier?: {
    id?: string;
    name: string;
    phone?: string;
    email?: string;
    gstin?: string;
    address?: string;
  } | null;
  onSaved: (doc: BusinessDocument) => void;
  onPrintRequest?: (doc: BusinessDocument) => void;
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : typeof error === "string" ? error : fallback;

export function PurchaseInvoiceModal({
  open,
  onOpenChange,
  orgId,
  initialDocType = "purchase_invoice",
  editingDoc = null,
  prefilledSupplier = null,
  onSaved,
  onPrintRequest,
}: PurchaseInvoiceModalProps) {
  const { user } = useAuth();
  const { org } = useOrganization();

  // View mode: "edit" | "preview"
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");

  // Document Type
  const [docType, setDocType] = useState<PurchaseDocumentType>(initialDocType);

  // Supplier / Party State
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [partyName, setPartyName] = useState("");
  const [partyPhone, setPartyPhone] = useState("");
  const [partyGstin, setPartyGstin] = useState("");
  const [partyAddress, setPartyAddress] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("27-Maharashtra");

  // Inline New Supplier Modal
  const [showNewSupplierDialog, setShowNewSupplierDialog] = useState(false);
  const [newSuppName, setNewSuppName] = useState("");
  const [newSuppPhone, setNewSuppPhone] = useState("");
  const [newSuppGstin, setNewSuppGstin] = useState("");
  const [newSuppAddress, setNewSuppAddress] = useState("");

  // Purchase Bill Details
  const [billPrefix, setBillPrefix] = useState("PUR/26-27/");
  const [billNumberSeq, setBillNumberSeq] = useState("201");
  const [repeatBill, setRepeatBill] = useState(false);
  const [docDate, setDocDate] = useState(new Date().toISOString().split("T")[0]);
  const [showDueDate, setShowDueDate] = useState(false);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentTerms, setPaymentTerms] = useState("30 Days Net");
  const [ewayBillNo, setEwayBillNo] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");

  // Products catalog & Item search (use shared ProductsContext)
  const { products: productsCatalog, refreshProducts, addOrUpdateProduct } = useProducts();
  const [itemSearchText, setItemSearchText] = useState<Record<number, string>>({});
  const [activeItemDropdown, setActiveItemDropdown] = useState<number | null>(null);
  const [showAddItemsModal, setShowAddItemsModal] = useState(false);
  const [addItemsTargetRow, setAddItemsTargetRow] = useState<number | null>(null);

  // Item input refs for auto-focus
  const itemInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const focusItemInput = (index: number) => {
    setTimeout(() => {
      itemInputRefs.current[index]?.focus();
    }, 60);
  };

  // Quick Create Item State
  const [showQuickCreateItemModal, setShowQuickCreateItemModal] = useState(false);
  const [targetRowIndexForNewItem, setTargetRowIndexForNewItem] = useState<number | null>(null);
  const [initialNewItemName, setInitialNewItemName] = useState("");

  const activeSupplier = useMemo(() => {
    return suppliers.find(
      (s) =>
        s.id === selectedSupplierId ||
        (partyPhone && s.phone === partyPhone) ||
        (partyName && s.name.toLowerCase().trim() === partyName.toLowerCase().trim())
    );
  }, [suppliers, selectedSupplierId, partyPhone, partyName]);

  const billItemOptions: BillItemOption[] = useMemo(() => {
    const customPriceMap = new Map<string, number>();
    const customItemsList = activeSupplier?.customItems || [];

    if (activeSupplier && activeSupplier.keepSamePrice === false && customItemsList.length > 0) {
      customItemsList.forEach((ci) => {
        const price = ci.costPrice !== undefined ? ci.costPrice : ci.customPrice;
        if (ci.productId) customPriceMap.set(ci.productId, price);
        if (ci.productName) customPriceMap.set(ci.productName.toLowerCase().trim(), price);
        if (ci.barcode) customPriceMap.set(ci.barcode.trim(), price);
      });
    }

    const synthesizedCustomOptions: BillItemOption[] = customItemsList.map((ci) => {
      const existing = productsCatalog.find(
        (p) =>
          p.id === ci.productId ||
          (ci.barcode && p.barcode === ci.barcode) ||
          (ci.productName && p.name?.toLowerCase().trim() === ci.productName.toLowerCase().trim())
      );

      if (existing) {
        const tags = (existing as unknown).tags || {};
        const defaultCost =
          existing.product_batches?.[0]?.cost_price ||
          (tags && tags.purchase_price !== undefined && tags.purchase_price !== null
            ? Number(tags.purchase_price)
            : Math.round((existing.selling_price || 0) * 0.8));
        const cost =
          activeSupplier?.keepSamePrice === false && (ci.costPrice !== undefined || ci.customPrice !== undefined)
            ? (ci.costPrice ?? ci.customPrice)
            : customPriceMap.get(existing.id) ?? defaultCost;

        return {
          id: existing.id,
          name: existing.name || ci.productName || "Unnamed Item",
          category: existing.category || ci.category || "General",
          barcode: existing.barcode || ci.barcode || null,
          sku: existing.sku || ci.sku,
          hsn: ci.hsnCode || tags?.hsn_code || tags?.hsn || (existing as unknown).hsn || undefined,
          unit: ci.unit || existing.unit || "Pcs",
          altUnit: (existing as unknown).altUnit || tags?.alt_unit || undefined,
          altUnitConversion: (existing as unknown).altUnitConversion ?? tags?.alt_unit_conversion ?? undefined,
          sellingPrice: existing.selling_price || ci.standardPrice || 0,
          costPrice: cost,
          gstRate: ci.gstRate || (tags && tags.gst_rate !== undefined ? Number(tags.gst_rate) : 18),
          stock: existing.product_batches?.reduce((sum, b) => sum + (Number(b.stock) || 0), 0) || ci.customStock || 0,
        };
      }

      return {
        id: ci.productId || `custom-${Date.now()}-${Math.random()}`,
        name: ci.productName || "Custom Product",
        category: ci.category || "General",
        barcode: ci.barcode || null,
        sku: ci.sku,
        hsn: ci.hsnCode,
        unit: ci.unit || "Pcs",
        sellingPrice: ci.standardPrice || ci.customPrice || 0,
        costPrice: ci.costPrice ?? ci.customPrice ?? 0,
        gstRate: ci.gstRate || 18,
        stock: ci.customStock || 999,
      };
    });

    if (activeSupplier && activeSupplier.keepSameInventory === false && customItemsList.length > 0) {
      return synthesizedCustomOptions;
    }

    const catalogOptions = productsCatalog.map((p) => {
      const tags = (p as unknown).tags || {};
      const selling =
        tags && tags.selling_price !== undefined && tags.selling_price !== null
          ? Number(tags.selling_price)
          : p.product_batches?.[0]?.mrp || 0;
      const defaultCost =
        p.product_batches?.[0]?.cost_price ||
        (tags && tags.purchase_price !== undefined && tags.purchase_price !== null
          ? Number(tags.purchase_price)
          : Math.round((selling || 0) * 0.8));
      const matchCost =
        customPriceMap.get(p.id) ??
        (p.name ? customPriceMap.get(p.name.toLowerCase().trim()) : undefined) ??
        (p.barcode ? customPriceMap.get(p.barcode.trim()) : undefined);
      const cost = matchCost !== undefined ? matchCost : defaultCost;
      const gst = tags && tags.gst_rate !== undefined && tags.gst_rate !== null ? Number(tags.gst_rate) : 18;
      const hsnVal = tags?.hsn_code || tags?.hsn || (p as unknown).hsn || undefined;
      const altUnitVal = (p as unknown).altUnit || tags?.alt_unit || undefined;
      const altConvVal = (p as unknown).altUnitConversion ?? tags?.alt_unit_conversion ?? undefined;

      return {
        id: p.id,
        name: p.name,
        category: p.category || "General",
        barcode: p.barcode,
        sku: p.sku,
        hsn: hsnVal,
        unit: p.unit || "Pcs",
        altUnit: altUnitVal,
        altUnitConversion: altConvVal ? Number(altConvVal) : undefined,
        sellingPrice: selling,
        costPrice: cost,
        gstRate: gst,
        stock: p.product_batches?.reduce((sum, b) => sum + (Number(b.stock) || 0), 0) || 0,
      };
    });

    const uniqueAdditional = synthesizedCustomOptions.filter(
      (cp) =>
        !productsCatalog.some(
          (p) =>
            p.id === cp.id ||
            (p.name && cp.name && p.name.toLowerCase().trim() === cp.name.toLowerCase().trim())
        )
    );

    return [...catalogOptions, ...uniqueAdditional];
  }, [productsCatalog, activeSupplier]);

  // Line items
  const [items, setItems] = useState<DocumentLineItem[]>([
    {
      id: "row-1",
      productName: "",
      hsn: "",
      quantity: 1,
      unit: "Pcs",
      rate: 0,
      discountPercent: 0,
      discountAmount: 0,
      taxRate: 18,
      taxableAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      lineTotal: 0,
    },
  ]);

  // Notes & Terms
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [termsOpen, setTermsOpen] = useState(true);
  const [terms, setTerms] = useState(
    "1. Goods received in good condition.\n2. Payment terms as agreed with supplier."
  );

  // Billing Address fields (new)
  const [billingAddress, setBillingAddress] = useState("");
  const [billingPincode, setBillingPincode] = useState("");
  const [billingPlaceOfSupply, setBillingPlaceOfSupply] = useState("27-Maharashtra");
  const [sameAsSupplier, setSameAsSupplier] = useState(false);


  // Payment details
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [bankAccount, setBankAccount] = useState({
    accountNumber: "",
    ifsc: "",
    bankName: "",
    branch: "",
    accountHolder: "",
  });
  // Signature & Stamp
  const [showStamp, setShowStamp] = useState(true);
  const [stampUrl, setStampUrl] = useState<string>("");

  const editorBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      editorBodyRef.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
      if (editorBodyRef.current) editorBodyRef.current.scrollTop = 0;
    }
  }, [open, viewMode]);

  const [showPaymentQr, setShowPaymentQr] = useState(true);
  const [upiId, setUpiId] = useState("");

  // Financial Calculations & Settlement
  const [showAdditionalCharges, setShowAdditionalCharges] = useState(false);
  const [additionalChargesAmount, setAdditionalChargesAmount] = useState<number>(0);
  const [additionalChargesReason, setAdditionalChargesReason] = useState("Freight / Cartage");

  const [showDiscount, setShowDiscount] = useState(false);
  const [overallDiscountType, setOverallDiscountType] = useState<"flat" | "percent">("flat");
  const [overallDiscountValue, setOverallDiscountValue] = useState<number>(0);

  const [autoRoundOff, setAutoRoundOff] = useState(true);
  const [manualRoundOff, setManualRoundOff] = useState<number>(0);

  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [markAsFullyPaid, setMarkAsFullyPaid] = useState(false);

  // Loading & Saving
  const [saving, setSaving] = useState(false);

  const fullDocumentNumber = `${billPrefix}${billNumberSeq}`.trim();

  // Load Store Settings on Mount
  useEffect(() => {
    if (!orgId) return;
    try {
      const storedSettings = localStorage.getItem(`credsmart_business_settings_${orgId}`);
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        if (parsed.bankAccounts && parsed.bankAccounts.length > 0) {
          const def = parsed.bankAccounts.find((b: { isDefault?: boolean }) => b.isDefault) || parsed.bankAccounts[0];
          setBankAccount({
            accountNumber: def.accountNumber || "",
            ifsc: def.ifsc || "",
            bankName: def.bankName || "",
            branch: def.branch || "",
            accountHolder: def.accountHolder || parsed.businessName || org?.name || "",
          });
        }
        if (parsed.upiId) setUpiId(parsed.upiId);
        if (parsed.signatureUrl) setStampUrl(parsed.signatureUrl);
      } else if (org) {
        if (org.upi_id) setUpiId(org.upi_id);
        if (org.account_number) {
          setBankAccount({
            accountNumber: org.account_number,
            ifsc: org.ifsc || "",
            bankName: org.bank_name || "",
            branch: "",
            accountHolder: org.account_holder || org.name || "",
          });
        }
      }
    } catch (e) {
      console.warn("Could not load business settings in purchase modal:", e);
    }
  }, [orgId, org]);

  // Fetch parties from BOTH customers and suppliers tables (unified party list)
  const fetchSuppliers = async () => {
    if (!orgId) return;
    try {
      const parsePartyCf = (rawCf: unknown, rawRecord: unknown) => {
        let cf = rawCf;
        if (typeof cf === "string") {
          try {
            cf = JSON.parse(cf);
          } catch {
            cf = {};
          }
        }
        if (!cf || typeof cf !== "object") cf = {};
        const customItems = Array.isArray(cf.customItems)
          ? cf.customItems
          : Array.isArray(cf.custom_items)
          ? cf.custom_items
          : Array.isArray(rawRecord?.custom_items)
          ? rawRecord.custom_items
          : [];
        const keepSamePrice = cf.keepSamePrice !== false && cf.keep_same_price !== false;
        const keepSameInventory = cf.keepSameInventory !== false && cf.keep_same_inventory !== false;

        return { cf, customItems, keepSamePrice, keepSameInventory };
      };

      // 1. Fetch from customers table (same as Sales Invoice)
      const { data: custData } = await supabase
        .from("customers")
        .select("id, name, phone, email, address, gstin, custom_fields")
        .eq("organization_id", orgId)
        .order("name");

      // 2. Fetch from suppliers table (legacy/dedicated suppliers)
      const { data: suppData } = await supabase
        .from("suppliers")
        .select("id, name, phone, email, address, gstin, custom_fields")
        .eq("organization_id", orgId)
        .order("name");

      // 3. Fetch credit balances
      const { data: creditData } = await supabase
        .from("credit_transactions")
        .select("party_id, amount, type")
        .eq("organization_id", orgId);

      const balanceMap: Record<string, number> = {};
      (creditData || []).forEach((c) => {
        const amt = Number(c.amount) || 0;
        const curr = balanceMap[c.party_id] || 0;
        if (c.type === "credit") {
          balanceMap[c.party_id] = curr + amt;
        } else if (c.type === "payment") {
          balanceMap[c.party_id] = curr - amt;
        }
      });

      // 4. Merge both lists, deduplicate by name+phone
      const seenKeys = new Set<string>();
      const merged: SupplierOption[] = [];

      // Customers first (preferred source of truth)
      for (const c of custData || []) {
        const key = `${c.name.toLowerCase().trim()}|${(c.phone || "").trim()}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          const { cf, customItems, keepSamePrice, keepSameInventory } = parsePartyCf(c.custom_fields, c);
          merged.push({
            id: c.id,
            name: c.name,
            phone: c.phone || "",
            email: c.email || undefined,
            address: c.address || undefined,
            gstin: c.gstin || undefined,
            balance: balanceMap[c.id] || 0,
            custom_fields: cf,
            customItems,
            keepSamePrice,
            keepSameInventory,
          });
        }
      }

      // Then suppliers (add any that aren't already in customers)
      for (const s of suppData || []) {
        const key = `${s.name.toLowerCase().trim()}|${(s.phone || "").trim()}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          const { cf, customItems, keepSamePrice, keepSameInventory } = parsePartyCf(s.custom_fields, s);
          merged.push({
            id: s.id,
            name: s.name,
            phone: s.phone || "",
            email: s.email || undefined,
            address: s.address || undefined,
            gstin: s.gstin || undefined,
            balance: balanceMap[s.id] || 0,
            custom_fields: cf,
            customItems,
            keepSamePrice,
            keepSameInventory,
          });
        }
      }

      // Sort alphabetically
      merged.sort((a, b) => a.name.localeCompare(b.name));
      setSuppliers(merged);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async () => {
    if (!orgId) return;
    try {
      await refreshProducts(orgId);
    } catch (e) {
      console.error('refreshProducts failed in PurchaseInvoiceModal:', e);
    }
  };

  // Reset or Init Form
  useEffect(() => {
    if (open) {
      fetchSuppliers();
      fetchProducts(); // calls shared refreshProducts under the hood
      setViewMode("edit");

      if (editingDoc) {
        setDocType(editingDoc.docType as PurchaseDocumentType);
        const docNum = editingDoc.documentNumber || "";
        const lastSlash = docNum.lastIndexOf("/");
        const lastDash = docNum.lastIndexOf("-");
        const splitIndex = Math.max(lastSlash, lastDash);
        if (splitIndex !== -1) {
          setBillPrefix(docNum.substring(0, splitIndex + 1));
          setBillNumberSeq(docNum.substring(splitIndex + 1));
        } else {
          setBillPrefix("PUR/");
          setBillNumberSeq(docNum);
        }

        setSelectedSupplierId(editingDoc.partyId || "");
        setPartyName(editingDoc.partyName || "");
        setPartyPhone(editingDoc.partyPhone || "");
        setPartyGstin(editingDoc.partyGstin || "");
        setPartyAddress(editingDoc.partyAddress || "");
        setPlaceOfSupply(editingDoc.placeOfSupply || "27-Maharashtra");
        // Billing fields from editing document (if available)
        const legacyBillingAddress = editingDoc.billingAddress ?? editingDoc.partyAddress ?? "";
        setBillingAddress(legacyBillingAddress);
        setBillingPincode(editingDoc.billingPincode || "");
        setBillingPlaceOfSupply(editingDoc.billingPlaceOfSupply || editingDoc.placeOfSupply || "27-Maharashtra");
        setSameAsSupplier(Boolean(editingDoc.partyAddress && legacyBillingAddress === editingDoc.partyAddress));
        setDocDate(editingDoc.docDate || new Date().toISOString().split("T")[0]);
        if (editingDoc.dueDate) {
          setShowDueDate(true);
          setDueDate(editingDoc.dueDate);
        }
        setPaymentTerms(editingDoc.paymentTerms || "30 Days Net");
        const loadedItems = (editingDoc.items && editingDoc.items.length > 0 ? editingDoc.items : [createNewRow("row-1")]).map((it) => {
          const matchedProd = (productsCatalog || []).find(
            (p) => p.id === it.productId || (it.productName && p.name.toLowerCase().trim() === it.productName.toLowerCase().trim())
          );
          const pTags = ((matchedProd as unknown) as { tags?: Record<string, unknown> })?.tags || {};
          const resolvedAltUnit = it.altUnit || matchedProd?.altUnit || (pTags.alt_unit as string) || undefined;
          const resolvedAltConvRaw = it.altUnitConversion ?? matchedProd?.altUnitConversion ?? pTags.alt_unit_conversion ?? undefined;
          const resolvedAltConv = resolvedAltConvRaw != null ? Number(resolvedAltConvRaw) : undefined;
          return {
            ...it,
            altUnit: resolvedAltUnit,
            altUnitConversion: resolvedAltConv,
          };
        });
        setItems(loadedItems);
        setPaymentMethod(editingDoc.paymentMethod || "Bank Transfer");
        setAmountPaid(editingDoc.paidAmount || 0);
        setNotes(editingDoc.notes || "");
        if (editingDoc.notes) setShowNotes(true);
        setTerms(editingDoc.terms || "1. Goods received in good condition.\n2. Payment terms as agreed.");
        if (editingDoc.transportDetails?.vehicleNumber) {
          setVehicleNumber(editingDoc.transportDetails.vehicleNumber);
        }
      } else {
        const targetType = initialDocType || "purchase_invoice";
        setDocType(targetType);
        const randSeq = Math.floor(200 + Math.random() * 800).toString();
        setBillPrefix("PUR/26-27/");
        setBillNumberSeq(randSeq);
        if (prefilledSupplier) {
          setSelectedSupplierId(prefilledSupplier.id || "");
          setPartyName(prefilledSupplier.name || "");
          setSupplierSearch(prefilledSupplier.name || "");
          setPartyPhone(prefilledSupplier.phone || "");
          setPartyGstin(prefilledSupplier.gstin || "");
          setPartyAddress(prefilledSupplier.address || "");
          if (prefilledSupplier.address) {
            setBillingAddress(prefilledSupplier.address);
            setSameAsSupplier(true);
          } else {
            setBillingAddress("");
            setSameAsSupplier(false);
          }
        } else {
          setSelectedSupplierId("");
          setPartyName("");
          setSupplierSearch("");
          setPartyPhone("");
          setPartyGstin("");
          setPartyAddress("");
          // Reset billing fields for new document
          setBillingAddress("");
          setSameAsSupplier(false);
        }
        setBillingPincode("");
        setBillingPlaceOfSupply("27-Maharashtra");
        setDocDate(new Date().toISOString().split("T")[0]);
        setShowDueDate(false);
        setEwayBillNo("");
        setVehicleNumber("");
        setNotes("");
        setShowNotes(false);
        setShowAdditionalCharges(false);
        setAdditionalChargesAmount(0);
        setShowDiscount(false);
        setOverallDiscountValue(0);
        setItems([createNewRow("row-1")]);
        setAmountPaid(0);
        setMarkAsFullyPaid(false);
        setPaymentMethod("Bank Transfer");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingDoc, initialDocType, prefilledSupplier]);

  const createNewRow = (id: string): DocumentLineItem => ({
    id,
    productName: "",
    hsn: "",
    quantity: 1,
    unit: "Pcs",
    rate: 0,
    discountPercent: 0,
    discountAmount: 0,
    taxRate: 18,
    taxableAmount: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
    lineTotal: 0,
  });

  const handleAddRow = () => {
    const newId = `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setItems((prev) => {
      const newIdx = prev.length;
      focusItemInput(newIdx);
      return [...prev, createNewRow(newId)];
    });
  };

  const handleBatchAddItemsAtTarget = (newItems: DocumentLineItem[]) => {
    if (!newItems || newItems.length === 0) return;
    const target = addItemsTargetRow;

    setItems((prev) => {
      const copy = [...prev];

      const mapped = newItems.map((ni) => ({
        id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        productId: (ni as unknown).productId || (ni as unknown).id || undefined,
        productName: (ni as unknown).productName || (ni as unknown).name || "",
        barcode: (ni as unknown).barcode || undefined,
        hsn: (ni as unknown).hsn || "",
        quantity: Number((ni as unknown).quantity) || 1,
        unit: (ni as unknown).unit || "Pcs",
        rate: Number((ni as unknown).rate) || Number((ni as unknown).costPrice) || 0,
        discountPercent: Number((ni as unknown).discountPercent) || 0,
        discountAmount: Number((ni as unknown).discountAmount) || 0,
        taxRate: Number((ni as unknown).taxRate) || 18,
        taxableAmount: Number((ni as unknown).taxableAmount) || 0,
        cgstAmount: Number((ni as unknown).cgstAmount) || 0,
        sgstAmount: Number((ni as unknown).sgstAmount) || 0,
        igstAmount: Number((ni as unknown).igstAmount) || 0,
        lineTotal: Number((ni as unknown).lineTotal) || 0,
      } as DocumentLineItem));

      let insertAt = copy.length;
      if (typeof target === "number" && target >= 0 && target < copy.length) {
        insertAt = target;
      }

      if (typeof target === "number" && target >= 0 && target < copy.length && (!copy[target].productName || copy[target].productName.trim() === "")) {
        copy.splice(target, 1, ...mapped);
      } else {
        copy.splice(insertAt, 0, ...mapped);
      }

      const last = copy[copy.length - 1];
      if (!last || (last.productName && last.productName.trim() !== "")) {
        copy.push(createNewRow(`row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`));
      }

      return copy;
    });

    setAddItemsTargetRow(null);
    setShowAddItemsModal(false);

    setTimeout(() => {
      const focusIndex = typeof target === "number" && target >= 0 ? target : (items.length - 1);
      focusItemInput(focusIndex + (newItems?.length ? newItems.length - 1 : 0));
    }, 80);
  };

  const handleRemoveRow = (index: number) => {
    if (items.length <= 1) {
      setItems([createNewRow(`row-${Date.now()}`)]);
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Interstate Check
  const orgStateCode = "27";
  const isInterState = useMemo(() => {
    const suppCode = (placeOfSupply || "").slice(0, 2);
    return suppCode !== "" && suppCode !== orgStateCode;
  }, [placeOfSupply]);

  // Recalculate Line Items
  const recalculatedItems = useMemo(() => {
    return items.map((item) => {
      const billedQty = item.altUnit && item.altUnitConversion && item.altQty != null && item.altQty > 0
        ? Number(item.altQty)
        : (Number(item.quantity) || 0);

      const rawSub = billedQty * (Number(item.rate) || 0);
      const discount = item.discountPercent > 0
        ? (rawSub * item.discountPercent) / 100
        : item.discountAmount || 0;
      const taxable = Math.max(0, rawSub - discount);

      const taxAmount = (taxable * (Number(item.taxRate) || 0)) / 100;
      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (isInterState) {
        igst = taxAmount;
      } else {
        cgst = taxAmount / 2;
        sgst = taxAmount / 2;
      }

      const lineTotal = taxable + taxAmount;

      return {
        ...item,
        taxableAmount: Number(taxable.toFixed(2)),
        cgstAmount: Number(cgst.toFixed(2)),
        sgstAmount: Number(sgst.toFixed(2)),
        igstAmount: Number(igst.toFixed(2)),
        lineTotal: Number(lineTotal.toFixed(2)),
      };
    });
  }, [items, isInterState]);

  // Totals
  const totals = useMemo(() => {
    const totalQty = recalculatedItems.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
    const rawSubtotal = recalculatedItems.reduce((acc, it) => {
      const q = it.altUnit && it.altUnitConversion && it.altQty != null && it.altQty > 0 ? Number(it.altQty) : (Number(it.quantity) || 0);
      return acc + q * (Number(it.rate) || 0);
    }, 0);
    const itemDiscounts = recalculatedItems.reduce((acc, it) => {
      const q = it.altUnit && it.altUnitConversion && it.altQty != null && it.altQty > 0 ? Number(it.altQty) : (Number(it.quantity) || 0);
      return acc + (q * (Number(it.rate) || 0) - it.taxableAmount);
    }, 0);
    const taxableTotal = recalculatedItems.reduce((acc, it) => acc + it.taxableAmount, 0);

    const overallDisc = overallDiscountType === "percent"
      ? (taxableTotal * (overallDiscountValue || 0)) / 100
      : overallDiscountValue || 0;

    const finalTaxable = Math.max(0, taxableTotal - overallDisc);
    const cgstTotal = recalculatedItems.reduce((acc, it) => acc + it.cgstAmount, 0);
    const sgstTotal = recalculatedItems.reduce((acc, it) => acc + it.sgstAmount, 0);
    const igstTotal = recalculatedItems.reduce((acc, it) => acc + it.igstAmount, 0);
    const taxTotal = cgstTotal + sgstTotal + igstTotal;

    const addCharges = showAdditionalCharges ? Number(additionalChargesAmount) || 0 : 0;
    const unroundedGrand = finalTaxable + taxTotal + addCharges;

    let roundedGrand = unroundedGrand;
    let roundOff = 0;

    if (autoRoundOff) {
      roundedGrand = Math.round(unroundedGrand);
      roundOff = Number((roundedGrand - unroundedGrand).toFixed(2));
    } else {
      roundedGrand = Number((unroundedGrand + (Number(manualRoundOff) || 0)).toFixed(2));
      roundOff = Number(manualRoundOff) || 0;
    }

    return {
      totalQty,
      rawSubtotal: Number(rawSubtotal.toFixed(2)),
      itemDiscounts: Number(itemDiscounts.toFixed(2)),
      taxableTotal: Number(finalTaxable.toFixed(2)),
      cgstTotal: Number(cgstTotal.toFixed(2)),
      sgstTotal: Number(sgstTotal.toFixed(2)),
      igstTotal: Number(igstTotal.toFixed(2)),
      taxTotal: Number(taxTotal.toFixed(2)),
      additionalCharges: addCharges,
      roundOff,
      grandTotal: Math.max(0, roundedGrand),
    };
  }, [recalculatedItems, overallDiscountType, overallDiscountValue, showAdditionalCharges, additionalChargesAmount, autoRoundOff, manualRoundOff]);

  useEffect(() => {
    if (markAsFullyPaid) {
      setAmountPaid(totals.grandTotal);
    }
  }, [markAsFullyPaid, totals.grandTotal]);

  const handleUpdateItem = (index: number, field: keyof DocumentLineItem, value: DocumentLineItem[keyof DocumentLineItem]) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleUpdateItemFields = (index: number, fields: Partial<DocumentLineItem>) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...fields };
      return copy;
    });
  };

  const handleSelectProduct = (index: number, product: UnifiedPurchaseProduct) => {
    setItems((prev) => {
      const copy = [...prev];
      const pRecord = (product && typeof product === "object" ? product : {}) as Record<string, unknown>;
      const pTags = (pRecord.tags && typeof pRecord.tags === "object" ? pRecord.tags : {}) as Record<string, unknown>;
      const altU = (product.altUnit as string) || (pTags.alt_unit as string) || (pRecord.alt_unit as string) || undefined;
      const altConvRaw = product.altUnitConversion ?? pTags.alt_unit_conversion ?? pRecord.alt_unit_conversion ?? undefined;
      const altConv = altConvRaw != null && !isNaN(Number(altConvRaw)) ? Number(altConvRaw) : undefined;

      copy[index] = {
        ...copy[index],
        productId: product.id,
        productName: product.name,
        barcode: product.barcode || undefined,
        hsn: product.hsn || copy[index].hsn || "",
        unit: product.unit || (pTags.unit as string) || copy[index].unit || "Pcs",
        altUnit: altU,
        altUnitConversion: altConv,
        altQty: undefined,
        rate: product.costPrice || 0,
        taxRate: product.gstRate !== undefined ? product.gstRate : 18,
      };

      // Auto-add next item line if this was the last row
      if (index === copy.length - 1) {
        const nextId = `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        copy.push(createNewRow(nextId));
      }
      return copy;
    });
    setActiveItemDropdown(null);
    focusItemInput(index + 1);
  };

  const handleOpenCreateItemDialog = (rowIndex: number, prefillName?: string) => {
    setActiveItemDropdown(null);
    setTargetRowIndexForNewItem(rowIndex);
    setInitialNewItemName(prefillName || "");
    setShowQuickCreateItemModal(true);
  };

  const handleItemCreated = (product: CreatedProductResult) => {
    const normalizedHsn = (product.hsn || "").trim();
    const catalogRow: ProductCatalogOption = {
      id: product.id,
      name: product.name,
      category: product.category || "General",
      barcode: product.barcode || null,
      sku: product.sku,
      unit: product.unit || "Pcs",
      altUnit: product.altUnit,
      altUnitConversion: product.altUnitConversion,
      tags: {
        hsn_code: normalizedHsn,
        gst_rate: product.taxRate,
        selling_price: product.sellingPrice,
        purchase_price: product.purchasePrice,
        mrp: product.sellingPrice || product.purchasePrice || 0,
        unit: product.unit || "Pcs",
        alt_unit: product.altUnit,
        alt_unit_conversion: product.altUnitConversion,
        min_stock_alert: 5,
      },
      product_batches: [
        {
          id: product.batchNumber || `batch-${product.id}`,
          batch_number: product.batchNumber || "BATCH-01",
          cost_price: product.purchasePrice || 0,
          mrp: product.sellingPrice || product.purchasePrice || 0,
          stock: product.stock || 0,
        },
      ],
    };

    // Update shared products store so item is available across the app
    try {
      addOrUpdateProduct(catalogRow as unknown);
    } catch (e) {
      console.warn('Failed to update shared products store from PurchaseInvoiceModal:', e);
    }

    if (targetRowIndexForNewItem !== null) {
      setItems((prev) => {
        const copy = [...prev];
        if (targetRowIndexForNewItem < copy.length) {
          copy[targetRowIndexForNewItem] = {
            ...copy[targetRowIndexForNewItem],
            productId: product.id,
            productName: product.name,
            barcode: product.barcode || undefined,
            hsn: normalizedHsn,
            unit: product.unit || copy[targetRowIndexForNewItem].unit || "Pcs",
            altUnit: product.altUnit || undefined,
            altUnitConversion: product.altUnitConversion || undefined,
            altQty: undefined,
            rate: product.purchasePrice || product.sellingPrice || 0,
            taxRate: product.taxRate,
            batchNumber: product.batchNumber || undefined,
          };
        }

        if (targetRowIndexForNewItem === copy.length - 1) {
          const nextId = `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          copy.push(createNewRow(nextId));
        }
        return copy;
      });

      focusItemInput(targetRowIndexForNewItem + 1);
    }

    setTargetRowIndexForNewItem(null);
    setInitialNewItemName("");
    setShowQuickCreateItemModal(false);
  };

  const handleSelectSupplier = (s: SupplierOption) => {
    setSelectedSupplierId(s.id);
    setPartyName(s.name);
    setSupplierSearch(s.name);
    setPartyPhone(s.phone || "");
    setPartyGstin(s.gstin || "");
    setPartyAddress(s.address || "");
    if (s.gstin && s.gstin.length >= 2) {
      const statePrefix = s.gstin.slice(0, 2);
      const match = INDIAN_STATES_AND_CODES.find((st) => st.startsWith(statePrefix));
      if (match) setPlaceOfSupply(match);
    }
    setShowSupplierDropdown(false);
  };

  const handleCreateSupplierInline = async () => {
    if (!newSuppName.trim()) {
      toast.error("Please enter a party name");
      return;
    }

    const normName = newSuppName.trim().toLowerCase();
    const existing = suppliers.find((s) => s.name.trim().toLowerCase() === normName);
    if (existing) {
      toast.info(`Selected existing supplier "${existing.name}"`);
      handleSelectSupplier(existing);
      setShowNewSupplierDialog(false);
      setNewSuppName("");
      setNewSuppPhone("");
      setNewSuppGstin("");
      setNewSuppAddress("");
      return;
    }

    try {
      // Insert into customers table (shared with Sales Invoice party list)
      const { data, error } = await supabase
        .from("customers")
        .insert({
          organization_id: orgId,
          name: newSuppName.trim(),
          phone: newSuppPhone.trim() || undefined,
          email: undefined,
          address: newSuppAddress.trim() || undefined,
          gstin: newSuppGstin.trim().toUpperCase() || undefined,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Party "${newSuppName}" added and synced with Sales!`);
      const newOpt: SupplierOption = {
        id: data.id,
        name: data.name,
        phone: data.phone || "",
        address: data.address || "",
        gstin: data.gstin || "",
        balance: 0,
      };
      setSuppliers((prev) => [newOpt, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
      handleSelectSupplier(newOpt);
      setShowNewSupplierDialog(false);
      setNewSuppName("");
      setNewSuppPhone("");
      setNewSuppGstin("");
      setNewSuppAddress("");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to create party"));
    }
  };

  const handlePrint = () => {
    if (!partyName.trim()) {
      toast.error("Please enter or select a supplier name (Bill From)");
      return;
    }

    const validItems = recalculatedItems.filter((it) => it.productName.trim() !== "");
    if (validItems.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }

    const resolvedBillingAddress = sameAsSupplier ? (partyAddress.trim() || undefined) : (billingAddress.trim() || undefined);
    const resolvedBillingPlaceOfSupply = sameAsSupplier ? (placeOfSupply || "27-Maharashtra") : (billingPlaceOfSupply.trim() || placeOfSupply || "27-Maharashtra");

    const docToPrint: BusinessDocument = {
      id: editingDoc?.id || `preview-${Date.now()}`,
      organizationId: orgId,
      docType,
      documentNumber: fullDocumentNumber,
      referenceNumber: ewayBillNo.trim() || undefined,
      partyId: selectedSupplierId || undefined,
      partyName: partyName.trim(),
      partyPhone: partyPhone.trim() || undefined,
      partyGstin: partyGstin.trim() || undefined,
      partyAddress: partyAddress.trim() || undefined,
      billingAddress: resolvedBillingAddress,
      billingPincode: sameAsSupplier ? undefined : (billingPincode.trim() || undefined),
      billingPlaceOfSupply: resolvedBillingPlaceOfSupply,
      placeOfSupply,
      docDate,
      dueDate: showDueDate ? dueDate : docDate,
      paymentTerms,
      items: validItems,
      subtotal: totals.rawSubtotal,
      discountTotal: totals.itemDiscounts + (overallDiscountValue || 0),
      taxableTotal: totals.taxableTotal,
      cgstTotal: totals.cgstTotal,
      sgstTotal: totals.sgstTotal,
      igstTotal: totals.igstTotal,
      taxTotal: totals.taxTotal,
      roundOff: totals.roundOff,
      grandTotal: totals.grandTotal,
      paidAmount: amountPaid,
      balanceDue: Math.max(0, totals.grandTotal - amountPaid),
      status: amountPaid >= totals.grandTotal ? "paid" : amountPaid > 0 ? "partial" : "unpaid",
      paymentMethod,
      notes: showNotes ? notes : undefined,
      terms,
      transportDetails: vehicleNumber.trim() ? { vehicleNumber: vehicleNumber.trim() } : undefined,
      showStamp,
      stampUrl: stampUrl || undefined,
      created_at: new Date().toISOString(),
    };

    if (onPrintRequest) {
      onPrintRequest(docToPrint);
    } else {
      downloadExactInvoicePdf({
        invoiceNumber: docToPrint.documentNumber,
        referenceNumber: docToPrint.referenceNumber,
        docType: docToPrint.docType as any,
        date: docToPrint.docDate,
        dueDate: docToPrint.dueDate,
        customerName: docToPrint.partyName,
        customerPhone: docToPrint.partyPhone,
        customerAddress: docToPrint.partyAddress,
        customerGstin: docToPrint.partyGstin,
        storeName: org?.name || "CredSmart Store",
        storePhone: org?.phone,
        storeEmail: org?.email,
        storeAddress: org?.address,
        storeGstin: org?.gstin,
        totalAmount: docToPrint.grandTotal,
        subtotal: docToPrint.subtotal,
        discountAmount: docToPrint.discountTotal ?? 0,
        tax: docToPrint.taxTotal ?? 0,
        roundOff: docToPrint.roundOff ?? 0,
        paymentMethod: docToPrint.paymentMethod,
        notes: docToPrint.notes,
        terms: docToPrint.terms,
        items: docToPrint.items.map((it) => ({
          name: it.productName,
          quantity: it.quantity,
          unit: it.unit || "PCS",
          altUnit: it.altUnit,
          altQty: it.altQty,
          altUnitConversion: it.altUnitConversion,
          rate: it.rate,
          total: it.lineTotal,
          hsn: it.hsn,
          taxRate: it.taxRate,
          batchNo: it.batchNumber,
          expDate: it.expiryDate,
        })),
      });
    }
  };

  const handleSave = async (andPrint = false, saveAndNew = false) => {
    if (!partyName.trim()) {
      toast.error("Please enter or select a supplier name (Bill From)");
      return;
    }

    const validItems = recalculatedItems.filter((it) => it.productName.trim() !== "");
    if (validItems.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }

    
    const resolvedBillingAddress = sameAsSupplier ? (partyAddress.trim() || undefined) : (billingAddress.trim() || undefined);
    const resolvedBillingPlaceOfSupply = sameAsSupplier ? (placeOfSupply || "27-Maharashtra") : (billingPlaceOfSupply.trim() || placeOfSupply || "27-Maharashtra");

    setSaving(true);
    try {
      const finalDoc: Omit<BusinessDocument, "id"> = {
        organizationId: orgId,
        docType,
        documentNumber: fullDocumentNumber,
        referenceNumber: ewayBillNo.trim() || undefined,
        partyId: selectedSupplierId || undefined,
        partyName: partyName.trim(),
        partyPhone: partyPhone.trim() || undefined,
        partyGstin: partyGstin.trim() || undefined,
        partyAddress: partyAddress.trim() || undefined,
        billingAddress: resolvedBillingAddress,
        billingPincode: sameAsSupplier ? undefined : (billingPincode.trim() || undefined),
        billingPlaceOfSupply: resolvedBillingPlaceOfSupply,
        placeOfSupply,
        docDate,
        dueDate: showDueDate ? dueDate : docDate,
        paymentTerms,
        items: validItems,
        subtotal: totals.rawSubtotal,
        discountTotal: totals.itemDiscounts + (overallDiscountValue || 0),
        taxableTotal: totals.taxableTotal,
        cgstTotal: totals.cgstTotal,
        sgstTotal: totals.sgstTotal,
        igstTotal: totals.igstTotal,
        taxTotal: totals.taxTotal,
        roundOff: totals.roundOff,
        grandTotal: totals.grandTotal,
        paidAmount: amountPaid,
        balanceDue: Math.max(0, totals.grandTotal - amountPaid),
        status:
          amountPaid >= totals.grandTotal
            ? "paid"
            : amountPaid > 0
            ? "partial"
            : "unpaid",
        paymentMethod,
        notes: showNotes ? notes : undefined,
        terms,
        transportDetails: vehicleNumber.trim() ? { vehicleNumber: vehicleNumber.trim() } : undefined,
        showStamp,
        stampUrl: stampUrl || undefined,
        created_at: editingDoc?.created_at || new Date().toISOString(),
      };

      const saved = await documentsService.saveDocument(finalDoc, user?.id);
      toast.success(`Purchase Bill ${fullDocumentNumber} recorded successfully!`);
      onSaved(saved);

      if (andPrint) {
        if (onPrintRequest) {
          onPrintRequest(saved);
        } else {
          downloadExactInvoicePdf({
            invoiceNumber: saved.documentNumber,
            referenceNumber: saved.referenceNumber,
            docType: saved.docType as any,
            date: saved.docDate,
            dueDate: saved.dueDate,
            customerName: saved.partyName,
            customerPhone: saved.partyPhone,
            customerAddress: saved.partyAddress,
            customerGstin: saved.partyGstin,
            storeName: org?.name || "CredSmart Store",
            storePhone: org?.phone,
            storeEmail: org?.email,
            storeAddress: org?.address,
            storeGstin: org?.gstin,
            totalAmount: saved.grandTotal,
            subtotal: saved.subtotal,
            discountAmount: saved.discountTotal ?? 0,
            tax: saved.taxTotal ?? 0,
            roundOff: saved.roundOff ?? 0,
            paymentMethod: saved.paymentMethod,
            notes: saved.notes,
            terms: saved.terms,
            items: saved.items.map((it) => ({
              name: it.productName,
              quantity: it.quantity,
              unit: it.unit || "PCS",
              altUnit: it.altUnit,
              altQty: it.altQty,
              altUnitConversion: it.altUnitConversion,
              rate: it.rate,
              total: it.lineTotal,
              hsn: it.hsn,
              taxRate: it.taxRate,
              batchNo: it.batchNumber,
              expDate: it.expiryDate,
            })),
          });
        }
      }

      if (saveAndNew) {
        const nextSeq = (parseInt(billNumberSeq, 10) + 1 || Math.floor(200 + Math.random() * 800)).toString();
        setBillNumberSeq(nextSeq);
        setPartyName("");
        setSupplierSearch("");
        setSelectedSupplierId("");
        setPartyPhone("");
        setPartyGstin("");
        setPartyAddress("");
        setItems([createNewRow("row-1")]);
        setAmountPaid(0);
        setMarkAsFullyPaid(false);
      } else {
        onOpenChange(false);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to save purchase bill"));
    } finally {
      setSaving(false);
    }
  };

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch) return suppliers.slice(0, 20);
    const q = supplierSearch.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.gstin && s.gstin.toLowerCase().includes(q))
    );
  }, [suppliers, supplierSearch]);

  const getFilteredProducts = (query: string): UnifiedPurchaseProduct[] => {
    const customPriceMap = new Map<string, number>();
    const customItemsList = activeSupplier?.customItems || [];

    if (activeSupplier && activeSupplier.keepSamePrice === false && customItemsList.length > 0) {
      customItemsList.forEach((ci) => {
        const price = ci.costPrice !== undefined ? ci.costPrice : ci.customPrice;
        if (ci.productId) customPriceMap.set(ci.productId, price);
        if (ci.productName) customPriceMap.set(ci.productName.toLowerCase().trim(), price);
        if (ci.barcode) customPriceMap.set(ci.barcode.trim(), price);
      });
    }

    const synthesizedCustomProducts: UnifiedPurchaseProduct[] = customItemsList.map((ci) => {
      const existing = productsCatalog.find(
        (p) =>
          p.id === ci.productId ||
          (ci.barcode && p.barcode === ci.barcode) ||
          (ci.productName && p.name?.toLowerCase().trim() === ci.productName.toLowerCase().trim())
      );

      if (existing) {
        const tags = (existing as unknown).tags || {};
        const defaultCost =
          existing.product_batches?.[0]?.cost_price ||
          (tags?.purchase_price ? Number(tags.purchase_price) : Math.round((existing.selling_price || 0) * 0.8));
        const cost =
          activeSupplier?.keepSamePrice === false && (ci.costPrice !== undefined || ci.customPrice !== undefined)
            ? (ci.costPrice ?? ci.customPrice)
            : customPriceMap.get(existing.id) ?? defaultCost;

        return {
          id: existing.id,
          name: existing.name || ci.productName || "Unnamed Item",
          category: existing.category || ci.category || "General",
          barcode: existing.barcode || ci.barcode || undefined,
          sku: existing.sku || ci.sku,
          hsn: ci.hsnCode || tags?.hsn_code || tags?.hsn || (existing as unknown).hsn || undefined,
          unit: ci.unit || existing.unit || "Pcs",
          altUnit: (existing as unknown).altUnit || tags?.alt_unit || undefined,
          altUnitConversion: (existing as unknown).altUnitConversion ?? tags?.alt_unit_conversion ?? undefined,
          costPrice: cost,
          mrp: existing.product_batches?.[0]?.mrp || existing.selling_price || ci.standardPrice || 0,
          gstRate: ci.gstRate || (tags?.gst_rate ? Number(tags.gst_rate) : 18),
          stock: existing.product_batches?.reduce((sum, b) => sum + (Number(b.stock) || 0), 0) || ci.customStock || 0,
          isDb: true,
        };
      }

      return {
        id: ci.productId || `custom-${Date.now()}-${Math.random()}`,
        name: ci.productName || "Custom Product",
        category: ci.category || "General",
        barcode: ci.barcode || undefined,
        sku: ci.sku,
        hsn: ci.hsnCode,
        unit: ci.unit || "Pcs",
        costPrice: ci.costPrice ?? ci.customPrice ?? 0,
        mrp: ci.standardPrice || ci.customPrice || 0,
        gstRate: ci.gstRate || 18,
        stock: ci.customStock || 999,
        isDb: true,
      };
    });

    if (activeSupplier && activeSupplier.keepSameInventory === false && customItemsList.length > 0) {
      if (!query) return synthesizedCustomProducts.slice(0, 15);
      const q = query.toLowerCase();
      return synthesizedCustomProducts
        .filter((p) => {
          const name = (p.name || "").toLowerCase();
          const barcode = (p.barcode || "").toLowerCase();
          const sku = (p.sku || "").toLowerCase();
          return name.includes(q) || barcode.includes(q) || sku.includes(q);
        })
        .slice(0, 15);
    }

    const toPurchaseSuggestion = (p: ProductCatalogOption): UnifiedPurchaseProduct => {
      const tags = (p as unknown).tags || {};
      const altUnitVal = p.altUnit || tags?.alt_unit || undefined;
      const altConvVal = p.altUnitConversion ?? tags?.alt_unit_conversion ?? undefined;
      const defaultCost =
        p.product_batches?.[0]?.cost_price ||
        (tags?.purchase_price ? Number(tags.purchase_price) : Math.round((p.selling_price || 0) * 0.8));
      const matchCost =
        customPriceMap.get(p.id) ??
        (p.name ? customPriceMap.get(p.name.toLowerCase().trim()) : undefined) ??
        (p.barcode ? customPriceMap.get(p.barcode.trim()) : undefined);
      const costPrice = matchCost !== undefined ? matchCost : defaultCost;

      return {
        id: p.id,
        name: p.name,
        category: p.category || "General",
        barcode: p.barcode || undefined,
        sku: p.sku,
        hsn: tags?.hsn_code || tags?.hsn || (p as unknown).hsn || undefined,
        unit: p.unit || "Pcs",
        altUnit: altUnitVal,
        altUnitConversion: altConvVal ? Number(altConvVal) : undefined,
        costPrice,
        mrp: p.product_batches?.[0]?.mrp || p.selling_price || 0,
        gstRate: p.tax_rate || (tags?.gst_rate ? Number(tags.gst_rate) : 18),
        stock: p.product_batches?.reduce((sum, b) => sum + (Number(b.stock) || 0), 0) || 0,
        isDb: true,
      };
    };

    const uniqueAdditional = synthesizedCustomProducts.filter(
      (cp) =>
        !productsCatalog.some(
          (p) =>
            p.id === cp.id ||
            (p.name && cp.name && p.name.toLowerCase().trim() === cp.name.toLowerCase().trim())
        )
    );

    const allProducts = [...productsCatalog.map(toPurchaseSuggestion), ...uniqueAdditional];

    if (!query) return allProducts.slice(0, 12);

    const q = query.toLowerCase();
    return allProducts
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q))
      )
      .slice(0, 15);
  };

  const upiPayload = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
        org?.name || "Business"
      )}&am=${totals.grandTotal}&cu=INR&tn=${encodeURIComponent(
        `Bill ${fullDocumentNumber}`
      )}`
    : "";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bill-editor-shell z-modal w-full h-[100dvh] max-h-[100dvh] max-w-full rounded-none border-none p-0 sm:max-w-7xl sm:w-[98vw] sm:h-auto sm:max-h-[96vh] sm:rounded-none sm:border flex flex-col gap-0 overflow-visible bg-white dark:bg-slate-950">
          {/* ───────────────────────────────────────────────────────────── */}
          {/* 1. TOP HEADER BAR */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="bill-editor-toolbar px-3 py-2.5 sm:px-4 sm:py-2.5 border-b border-slate-200 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 px-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 gap-1.5 rounded-lg shadow-2xs cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Exit
              </Button>

              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>{editingDoc ? "Edit Purchase Bill" : "Create Purchase Bill"}</span>
              </h2>
            </div>


            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground"
                title="Purchase Settings"
              >
                <Settings className="w-4 h-4" />
              </Button>

              {/* Edit / Preview Toggle — matches SalesInvoiceModal */}
              <div className="flex items-center p-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mr-2">
                <button
                  type="button"
                  onClick={() => setViewMode("edit")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer",
                    viewMode === "edit"
                      ? "bg-white dark:bg-slate-900 text-primary shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("preview")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer",
                    viewMode === "preview"
                      ? "bg-white dark:bg-slate-900 text-primary shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Preview
                </button>
              </div>

              {/* Standalone Print button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handlePrint()}
                className="h-8 px-3 text-xs font-semibold border-slate-300 dark:border-slate-700 rounded-lg shadow-2xs cursor-pointer"
                title="Print"
              >
                <Printer className="w-3.5 h-3.5" />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={() => handleSave(false, true)}
                className="h-8 px-3 text-xs font-semibold border-slate-300 dark:border-slate-700 rounded-lg shadow-2xs cursor-pointer"
              >
                Save &amp; New
              </Button>

            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* 2. BODY CONTENT */}
          {/* ───────────────────────────────────────────────────────────── */}
          {viewMode === "preview" ? (
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200 dark:bg-slate-900 flex justify-center scrollbar-thin">
              <div className="w-full max-w-3xl bg-white dark:bg-card shadow-xl rounded-xl border border-border p-4 sm:p-6 overflow-hidden">
                <UnifiedInvoiceRenderer
                  docType="purchase_invoice"
                  invoiceNumber={fullDocumentNumber}
                  invoiceDate={docDate}
                  dueDate={showDueDate ? dueDate : undefined}
                  storeInfo={{
                    name: org?.name || "CredSmart Store",
                    phone: org?.phone || "",
                    email: org?.email || "",
                    address: org?.address || "",
                    gstin: org?.gstin || "",
                    pan: org?.pan || "",
                    logoUrl: org?.logo_url || "",
                    bank_name: bankAccount.bankName || org?.bank_name,
                    account_number: bankAccount.accountNumber || org?.account_number,
                    ifsc: bankAccount.ifsc || org?.ifsc,
                    account_holder: bankAccount.accountHolder || org?.account_holder || org?.name,
                    upi_id: upiId || org?.upi_id,
                  }}
                  party={{
                    name: partyName || "Supplier",
                    phone: partyPhone,
                    address: partyAddress,
                    gstin: partyGstin,
                    state: placeOfSupply,
                  }}
                  items={recalculatedItems.map((it) => ({
                    id: it.id,
                    name: it.productName || "Item",
                    hsn: it.hsn,
                    qty: Number(it.quantity) || 1,
                    unit: it.unit || "Pcs",
                    altUnit: it.altUnit,
                    altQty: it.altQty,
                    altUnitConversion: it.altUnitConversion,
                    rate: Number(it.rate) || 0,
                    discount: it.discountPercent || 0,
                    discountPercent: it.discountPercent,
                    taxRate: it.taxRate || 18,
                    taxAmount: (it.taxRate || 18) * (it.taxableAmount || 0) / 100,
                    total: it.lineTotal,
                  }))}
                  totals={{
                    subtotal: totals.rawSubtotal,
                    discountTotal: totals.itemDiscounts + (overallDiscountValue || 0),
                    taxableAmount: totals.taxableTotal,
                    taxTotal: totals.taxTotal,
                    cgst: totals.cgstTotal,
                    sgst: totals.sgstTotal,
                    igst: totals.igstTotal,
                    grandTotal: totals.grandTotal,
                  }}
                  notes={showNotes ? notes : undefined}
                  terms={terms}
                  propBankDetails={showBankDetails && bankAccount.accountNumber ? bankAccount : undefined}
                  propUpiId={showPaymentQr && upiId ? upiId : undefined}
                />
              </div>
            </div>
          ) : (
            <div ref={editorBodyRef} className="bill-editor-body flex-1 min-h-0 overflow-y-auto p-1 sm:p-1 space-y-1 scrollbar-thin">
              {/* TOP ROW: Bill From (Dropdown Format) & Purchase Bill Details */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* BILL FROM (Dropdown Format with Balance) */}
                <div className="bill-panel lg:col-span-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-primary" />
                      Bill From (Party / Vendor)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowNewSupplierDialog(true)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="Add New Party"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Search / Dropdown Input */}
                  {!partyName.trim() && !showSupplierDropdown && (
                    <button
                      type="button"
                      onClick={() => setShowSupplierDropdown(true)}
                      className="w-full h-[104px] border border-dashed border-primary/40 hover:border-primary/70 bg-white dark:bg-slate-900 text-primary text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer"
                    >
                      + Select Party / Vendor
                    </button>
                  )}
                  <div className={cn("relative", !partyName.trim() && !showSupplierDropdown && "hidden")}>
                    <div
                      className="flex items-center justify-between border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 cursor-pointer shadow-2xs hover:border-primary/60 transition-colors"
                      onClick={() => setShowSupplierDropdown(true)}
                    >
                      <input
                        placeholder="Search party by name or phone..."
                        value={showSupplierDropdown ? supplierSearch : (partyName || supplierSearch)}
                        onChange={(e) => {
                          setSupplierSearch(e.target.value);
                          setShowSupplierDropdown(true);
                        }}
                        onFocus={() => setShowSupplierDropdown(true)}
                        className="w-full text-xs font-semibold text-slate-900 dark:text-white bg-transparent focus:outline-none placeholder:text-slate-400 placeholder:font-normal"
                      />
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>

                    {showSupplierDropdown && (
                      <div className="absolute z-[200] left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                        <div className="px-3.5 py-2 bg-slate-100/90 dark:bg-slate-800/80 flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                          <span>Party / Vendor Name</span>
                          <span>Balance</span>
                        </div>

                        <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                          {filteredSuppliers.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectSupplier(s);
                              }}
                              className="w-full text-left px-3.5 py-2.5 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                            >
                              <div className="flex-1 min-w-0 pr-2">
                                <p className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-tight truncate">
                                  {s.name}
                                </p>
                                {s.phone && (
                                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{s.phone}</p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <span className={cn(
                                  "font-mono font-bold text-xs flex items-center justify-end gap-1",
                                  (s.balance || 0) > 0 ? "text-slate-800 dark:text-slate-200" : "text-slate-500"
                                )}>
                                  ₹ {(s.balance || 0).toLocaleString("en-IN")}
                                  {(s.balance || 0) > 0 && <span className="text-[10px] text-emerald-600">↓</span>}
                                </span>
                              </div>
                            </button>
                          ))}
                          {filteredSuppliers.length === 0 && (
                            <div className="p-4 text-center text-xs text-muted-foreground">
                              No party found matching "{supplierSearch}"
                            </div>
                          )}
                        </div>

                        <div className="p-2 bg-slate-50 dark:bg-slate-800/40">
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setShowNewSupplierDialog(true);
                              setShowSupplierDropdown(false);
                            }}
                            className="w-full py-2 rounded-lg border border-dashed border-primary/40 hover:border-primary text-primary text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-primary/5 transition-all cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            + Create New Party
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Selected Supplier Summary Card */}
                  {partyName.trim() && !showSupplierDropdown && (
                    <div className="p-3 rounded-lg bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            {partyName}
                            {partyGstin && (
                              <span className="text-[9px] font-mono font-medium px-1 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                GST: {partyGstin}
                              </span>
                            )}
                          </h4>
                          {partyPhone && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                              Phone: {partyPhone}
                            </p>
                          )}
                          {partyAddress && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                              {partyAddress}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Place of Supply: <span className="font-semibold text-slate-700 dark:text-slate-300">{placeOfSupply}</span>
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowSupplierDropdown(true);
                            setSupplierSearch("");
                          }}
                          className="h-6 px-2 text-[11px] text-primary hover:text-primary font-semibold shrink-0"
                        >
                          Change
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 p-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                        Billing Address
                      </Label>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="same-as-party-address"
                          checked={sameAsSupplier}
                          onCheckedChange={(checked) => {
                            const isChecked = Boolean(checked);
                            setSameAsSupplier(isChecked);
                            if (isChecked) {
                              setBillingAddress(partyAddress || "");
                              setBillingPincode("");
                              setBillingPlaceOfSupply(placeOfSupply || "27-Maharashtra");
                            }
                          }}
                        />
                        <Label htmlFor="same-as-party-address" className="text-[10px] text-slate-600 dark:text-slate-400 cursor-pointer">
                          Same as Party Address
                        </Label>
                      </div>
                    </div>

                    <Textarea
                      value={billingAddress}
                      onChange={(e) => setBillingAddress(e.target.value)}
                      disabled={sameAsSupplier}
                      placeholder="Enter billing address"
                      className="min-h-[78px] text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 disabled:opacity-100 disabled:cursor-default"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                          Pincode
                        </Label>
                        <Input
                          value={billingPincode}
                          onChange={(e) => {
                            setBillingPincode(e.target.value);
                            if (sameAsSupplier) setSameAsSupplier(false);
                          }}
                          placeholder="400001"
                          className="h-8 text-xs mt-1 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                        />
                      </div>

                      <div>
                        <Label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                          State
                        </Label>
                        <Select value={billingPlaceOfSupply} onValueChange={(val) => {
                          setBillingPlaceOfSupply(val);
                          if (sameAsSupplier && val !== (placeOfSupply || "27-Maharashtra")) {
                            setSameAsSupplier(false);
                          }
                        }}>
                          <SelectTrigger className="h-8 text-xs mt-1 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INDIAN_STATES_AND_CODES.map((state) => (
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PURCHASE BILL DETAILS CARD */}
                <div className="bill-panel lg:col-span-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Purchase Bill Details
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={repeatBill}
                          onCheckedChange={setRepeatBill}
                          id="repeat-bill"
                          className="scale-75"
                        />
                        <Label htmlFor="repeat-bill" className="text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                          Repeat this bill
                        </Label>
                      </div>
                      <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Row 1: Bill Prefix & Bill Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Bill Prefix
                      </Label>
                      <Input
                        value={billPrefix}
                        onChange={(e) => setBillPrefix(e.target.value)}
                        placeholder="PUR/26-27/"
                        className="h-8 text-xs font-mono font-medium mt-1 bg-slate-50/50 dark:bg-slate-800/50"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Bill Number
                      </Label>
                      <Input
                        value={billNumberSeq}
                        onChange={(e) => setBillNumberSeq(e.target.value)}
                        placeholder="201"
                        className="h-8 text-xs font-mono font-bold mt-1 bg-slate-50/50 dark:bg-slate-800/50"
                      />
                    </div>
                  </div>

                  {/* Row 2: Bill Date */}
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Bill Date
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        type="date"
                        value={docDate}
                        onChange={(e) => setDocDate(e.target.value)}
                        className="h-8 text-xs font-medium pl-8 bg-slate-50/50 dark:bg-slate-800/50"
                      />
                      <CalendarIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                    </div>
                  </div>

                  {/* Row 3: Due Date Toggle */}
                  {showDueDate ? (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          Payment Terms
                        </Label>
                        <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                          <SelectTrigger className="h-8 text-xs mt-1 bg-slate-50/50 dark:bg-slate-800/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_TERMS_SUGGESTIONS.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Due Date
                          </Label>
                          <button
                            type="button"
                            onClick={() => setShowDueDate(false)}
                            className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                        <Input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="h-8 text-xs font-medium mt-1 bg-slate-50/50 dark:bg-slate-800/50"
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowDueDate(true)}
                      className="w-full py-1.5 border border-dashed border-primary/30 hover:border-primary/60 rounded-lg text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      + Add Due Date
                    </button>
                  )}

                  {/* Row 4: E-Way Bill & Vehicle No */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                        E-Way Bill No. <HelpCircle className="w-3 h-3 text-slate-400" />
                      </Label>
                      <Input
                        value={ewayBillNo}
                        onChange={(e) => setEwayBillNo(e.target.value)}
                        placeholder="e.g. 241098765432"
                        className="h-8 text-xs font-mono mt-1 bg-slate-50/50 dark:bg-slate-800/50"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Vehicle No.
                      </Label>
                      <Input
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                        placeholder="e.g. MH-12-AB-1234"
                        className="h-8 text-xs font-mono uppercase mt-1 bg-slate-50/50 dark:bg-slate-800/50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* 3. LINE ITEMS TABLE (Direct POS-Style + Auto Add Next Line) */}
              {/* ───────────────────────────────────────────────────────────── */}
              <div className="bill-panel bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        <th className="py-2.5 px-3 w-10 text-center">NO</th>
                        <th className="py-2.5 px-3 min-w-[260px]">ITEMS</th>
                        <th className="py-2.5 px-2 w-20">HSN</th>
                        <th className="py-2.5 px-2 w-16 text-center">QTY</th>
                        <th className="py-2.5 px-2 w-24 text-center">UNIT</th>
                        <th className="py-2.5 px-2 w-28 text-right">PURCHASE PRICE (₹)</th>
                        <th className="py-2.5 px-2 w-20 text-center">DISCOUNT</th>
                        <th className="py-2.5 px-2 w-20 text-center">TAX</th>
                        <th className="py-2.5 px-3 w-28 text-right">AMOUNT (₹)</th>
                        <th className="py-2.5 px-2 w-10 text-center">
                          <Settings className="w-3.5 h-3.5 text-muted-foreground mx-auto" />
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {recalculatedItems.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-2 px-3 text-center text-slate-400 font-mono text-xs">
                            {idx + 1}
                          </td>

                          {/* Item Search (Add Items Button) */}
                          <td className="py-2 px-3 relative">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  setAddItemsTargetRow(idx);
                                  try {
                                    if ((productsCatalog || []).length === 0) {
                                      await fetchProducts();
                                    }
                                  } catch (e) {
                                    console.warn('Failed to refresh product catalog before opening Add Items modal', e);
                                  }
                                  setShowAddItemsModal(true);
                                }}
                                className="w-full text-left px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-2">
                                  <Package className="w-4 h-4 text-primary" />
                                  <div className="text-left">
                                    <div className="truncate text-sm font-medium text-slate-900 dark:text-white">{item.productName || "Add Item To Bill"}</div>
                                    <div className="text-[10px] text-muted-foreground">{item.hsn ? `HSN: ${item.hsn}` : "Select from inventory"}</div>
                                  </div>
                                </div>
                                <div className="text-xs text-muted-foreground">Open</div>
                              </button>
                            </div>
                          </td>

                          {/* HSN */}
                          <td className="py-2 px-2">
                            <Input
                              value={item.hsn || ""}
                              onChange={(e) => handleUpdateItem(idx, "hsn", e.target.value)}
                              placeholder="HSN"
                              className="h-8 text-xs font-mono bg-transparent"
                            />
                          </td>

                          {/* Qty */}
                          <td className="py-2 px-2">
                            <Input
                              type="number"
                              min="1"
                              value={item.altUnit && item.altUnitConversion && item.altQty != null ? item.altQty : item.quantity}
                              onChange={(e) => {
                                const val = Math.max(1, Number(e.target.value));
                                if (item.altUnit && item.altUnitConversion && item.altQty != null) {
                                  handleUpdateItemFields(idx, {
                                    altQty: val,
                                    quantity: val * item.altUnitConversion,
                                  });
                                } else {
                                  handleUpdateItem(idx, "quantity", val);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  if (idx === recalculatedItems.length - 1) {
                                    handleAddRow();
                                  } else {
                                    focusItemInput(idx + 1);
                                  }
                                }
                              }}
                              className="h-8 text-xs text-center font-mono font-semibold bg-transparent"
                            />
                            {item.altUnit && item.altUnitConversion && item.altQty != null && (
                              <span className="block text-[9px] text-blue-600 dark:text-blue-400 font-mono font-semibold text-center mt-0.5 whitespace-nowrap">
                                ({item.altQty}*{item.altUnitConversion} {item.unit || "Pcs"})
                              </span>
                            )}
                          </td>

                          {/* Unit */}
                          <td className="py-2 px-2">
                            {item.altUnit && item.altUnitConversion && item.altUnitConversion > 1 ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <div className="inline-flex rounded-md border border-primary/40 overflow-hidden text-[10px] font-bold bg-white dark:bg-slate-900 shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItemFields(idx, { altQty: undefined })}
                                    className={cn(
                                      "px-2 py-1 transition-colors cursor-pointer",
                                      item.altQty == null
                                        ? "bg-primary text-primary-foreground font-bold"
                                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    )}
                                  >
                                    {item.unit || "PCS"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const altQ = Math.max(1, Math.round((item.quantity || 1) / item.altUnitConversion!));
                                      handleUpdateItemFields(idx, {
                                        altQty: altQ,
                                        quantity: altQ * item.altUnitConversion!,
                                      });
                                    }}
                                    className={cn(
                                      "px-2 py-1 transition-colors border-l border-primary/40 cursor-pointer",
                                      item.altQty != null
                                        ? "bg-primary text-primary-foreground font-bold"
                                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    )}
                                  >
                                    {item.altUnit}
                                  </button>
                                </div>
                                <span className="text-[8.5px] text-muted-foreground font-mono whitespace-nowrap">
                                  1 {item.altUnit} = {item.altUnitConversion} {item.unit || "Pcs"}
                                </span>
                              </div>
                            ) : (
                              <Select
                                value={item.unit || "Pcs"}
                                onValueChange={(val) => handleUpdateItem(idx, "unit", val)}
                              >
                                <SelectTrigger className="h-8 text-xs bg-transparent font-medium">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="max-h-56">
                                  {["PCS", "KG", "LTR", "BOX", "NOS", "MTR", "PKT", "DOZ", "BAG", "CAN", "BTL", "SET", "GM", "ML", "STEPS"].map((u) => (
                                    <SelectItem key={u} value={u} className="text-xs">
                                      {u}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </td>

                          {/* Price / Rate */}
                          <td className="py-2 px-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.rate}
                              onChange={(e) => handleUpdateItem(idx, "rate", Number(e.target.value))}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  if (idx === recalculatedItems.length - 1) {
                                    handleAddRow();
                                  } else {
                                    focusItemInput(idx + 1);
                                  }
                                }
                              }}
                              className="h-8 text-xs text-right font-mono font-semibold bg-transparent"
                            />
                          </td>

                          {/* Discount */}
                          <td className="py-2 px-2">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discountPercent || ""}
                              onChange={(e) => handleUpdateItem(idx, "discountPercent", Number(e.target.value))}
                              placeholder="%"
                              className="h-8 text-xs text-center font-mono bg-transparent"
                            />
                          </td>

                          {/* Tax Dropdown */}
                          <td className="py-2 px-2">
                            <Select
                              value={String(item.taxRate)}
                              onValueChange={(val) => handleUpdateItem(idx, "taxRate", Number(val))}
                            >
                              <SelectTrigger className="h-8 text-xs bg-transparent">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">0%</SelectItem>
                                <SelectItem value="5">5%</SelectItem>
                                <SelectItem value="12">12%</SelectItem>
                                <SelectItem value="18">18%</SelectItem>
                                <SelectItem value="28">28%</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>

                          {/* Amount */}
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            ₹{item.lineTotal.toFixed(2)}
                          </td>

                          {/* Remove button */}
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(idx)}
                              className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Subtotals Summary Strip */}
                <div className="px-4 py-2.5 bg-slate-100/90 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Subtotal</span>
                  <div className="flex items-center gap-6 font-mono">
                    <span>Qty: <strong className="text-slate-900 dark:text-white">{totals.totalQty}</strong></span>
                    <span>Tax: <strong className="text-slate-900 dark:text-white">₹{totals.taxTotal.toFixed(2)}</strong></span>
                    <span>Total: <strong className="text-slate-900 dark:text-white">₹{totals.rawSubtotal.toFixed(2)}</strong></span>
                  </div>
                </div>
              </div>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* 4. BOTTOM SECTION: Split 2 Columns */}
              {/* ───────────────────────────────────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* LEFT COLUMN: Notes, Terms, Bank Details */}
                <div className="lg:col-span-6 space-y-4">
                  {showNotes ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-primary" />
                          Purchase Remarks / Notes
                        </Label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNotes(false);
                            setNotes("");
                          }}
                          className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Inward delivery notes or po comments..."
                        rows={2}
                        className="text-xs resize-none"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowNotes(true)}
                      className="text-xs text-primary font-semibold flex items-center gap-1.5 hover:underline py-1 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Add Notes
                    </button>
                  )}

                  {/* Terms & Conditions */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setTermsOpen((prev) => !prev)}
                      className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Purchase Terms &amp; Conditions
                      </span>
                      {termsOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                    {termsOpen && (
                      <div className="px-3.5 pb-3.5 pt-0">
                        <Textarea
                          value={terms}
                          onChange={(e) => setTerms(e.target.value)}
                          rows={2}
                          className="text-xs text-slate-600 dark:text-slate-300 font-sans resize-none leading-relaxed bg-slate-50/50 dark:bg-slate-800/30"
                        />
                      </div>
                    )}
                  </div>

                  {/* Payment Details Card */}
                  {showBankDetails && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-2.5">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Our Payout Bank Account
                      </span>

                      {bankAccount.accountNumber ? (
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                          <div>
                            <span className="text-slate-500 text-[11px]">Account Number:</span>
                            <p className="font-mono font-bold text-slate-900 dark:text-white">
                              {bankAccount.accountNumber}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[11px]">IFSC Code:</span>
                            <p className="font-mono font-bold text-slate-900 dark:text-white">
                              {bankAccount.ifsc}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[11px]">Bank &amp; Branch:</span>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              {bankAccount.bankName} {bankAccount.branch ? `, ${bankAccount.branch}` : ""}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[11px]">Account Holder:</span>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              {bankAccount.accountHolder || org?.name || "Business"}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          No default bank configured in settings.
                        </p>
                      )}

                      <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <button
                          type="button"
                          onClick={() => setShowBankDetails(false)}
                          className="text-rose-500 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newAcc = prompt("Enter Bank Account Number:", bankAccount.accountNumber);
                            if (newAcc !== null) setBankAccount((p) => ({ ...p, accountNumber: newAcc }));
                          }}
                          className="text-primary hover:underline flex items-center gap-1 font-medium cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" /> Change
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: Calculations, Totals, Settlement */}
                <div className="bill-panel lg:col-span-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-3.5">
                  {showAdditionalCharges ? (
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Freight / Cartage Charges
                        </Label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAdditionalCharges(false);
                            setAdditionalChargesAmount(0);
                          }}
                          className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={additionalChargesReason}
                          onChange={(e) => setAdditionalChargesReason(e.target.value)}
                          placeholder="e.g. Transport / Inward Freight"
                          className="h-7 text-xs"
                        />
                        <Input
                          type="number"
                          min="0"
                          value={additionalChargesAmount || ""}
                          onChange={(e) => setAdditionalChargesAmount(Number(e.target.value))}
                          placeholder="Amount (₹)"
                          className="h-7 text-xs font-mono font-semibold"
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAdditionalCharges(true)}
                      className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Freight / Additional Charges
                    </button>
                  )}

                  {/* Taxable Amount */}
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 py-1">
                    <span>Taxable Inward Amount</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      ₹{totals.taxableTotal.toFixed(2)}
                    </span>
                  </div>

                  {/* Discount */}
                  {showDiscount ? (
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Supplier Discount
                        </Label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowDiscount(false);
                            setOverallDiscountValue(0);
                          }}
                          className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          value={overallDiscountType}
                          onValueChange={(val) => setOverallDiscountType(val as "flat" | "percent")}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                            <SelectItem value="percent">Percentage (%)</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min="0"
                          value={overallDiscountValue || ""}
                          onChange={(e) => setOverallDiscountValue(Number(e.target.value))}
                          placeholder="Discount value"
                          className="h-7 text-xs font-mono font-semibold"
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowDiscount(true)}
                      className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Supplier Discount
                    </button>
                  )}

                  {/* Auto Round Off */}
                  <div className="flex items-center justify-between text-xs py-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="round-off-pur"
                        checked={autoRoundOff}
                        onCheckedChange={(checked) => setAutoRoundOff(!!checked)}
                      />
                      <Label htmlFor="round-off-pur" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                        Auto Round Off
                      </Label>
                    </div>
                    {!autoRoundOff && (
                      <div className="flex items-center gap-1 font-mono text-xs">
                        <Input
                          type="number"
                          step="0.01"
                          value={manualRoundOff}
                          onChange={(e) => setManualRoundOff(Number(e.target.value))}
                          className="h-7 w-20 text-right font-mono"
                        />
                      </div>
                    )}
                  </div>

                  {/* Total Amount */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Total Bill Amount:
                    </span>
                    <span className="text-xl font-black font-mono text-primary">
                      ₹ {totals.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Amount Paid & Mode */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Total Amount Paid to Supplier</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        ₹ {amountPaid.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-mono">₹</span>
                        <Input
                          type="number"
                          min="0"
                          value={amountPaid || ""}
                          onChange={(e) => {
                            setAmountPaid(Number(e.target.value));
                            if (Number(e.target.value) >= totals.grandTotal) {
                              setMarkAsFullyPaid(true);
                            } else {
                              setMarkAsFullyPaid(false);
                            }
                          }}
                          placeholder="0"
                          className="h-8 text-xs font-mono font-bold pl-6"
                        />
                      </div>

                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger className="h-8 text-xs w-32 shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="UPI">UPI / QR</SelectItem>
                          <SelectItem value="Cheque">Cheque</SelectItem>
                          <SelectItem value="Credit">Supplier Credit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Checkbox
                        id="fully-paid-pur"
                        checked={markAsFullyPaid}
                        onCheckedChange={(checked) => setMarkAsFullyPaid(!!checked)}
                      />
                      <Label htmlFor="fully-paid-pur" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                        Mark as fully paid
                      </Label>
                    </div>
                  </div>

                  {/* Balance Amount Payable */}
                  <div className="flex items-center justify-between text-xs py-2 border-t border-slate-100 dark:border-slate-800 font-semibold">
                    <span className="text-slate-600 dark:text-slate-400">Balance Amount Payable</span>
                    <span className={cn("font-mono font-bold text-sm", totals.grandTotal - amountPaid > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400")}>
                      ₹ {Math.max(0, totals.grandTotal - amountPaid).toFixed(2)}
                    </span>
                  </div>

                  {/* Stamp / Signature Box */}
                  {showStamp && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col items-end">
                      <div className="w-36 h-16 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-center p-1 overflow-hidden">
                        {stampUrl ? (
                          <img src={stampUrl} alt="Store Stamp" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <div className="text-center">
                            <span className="text-[10px] text-muted-foreground font-serif italic">Authorized Signatory</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] mt-1.5">
                        <button
                          type="button"
                          onClick={() => setShowStamp(false)}
                          className="text-rose-500 hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newUrl = prompt("Enter Signature / Stamp Image URL:", stampUrl);
                            if (newUrl !== null) setStampUrl(newUrl);
                          }}
                          className="text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" /> Change
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* INLINE QUICK ADD SUPPLIER MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={showNewSupplierDialog} onOpenChange={setShowNewSupplierDialog}>
        <DialogContent className="z-modal max-w-md rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              Add New Party (Bill From)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Party will be saved and synced across both Sales &amp; Purchase invoices
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">Party / Vendor Name *</Label>
              <Input
                value={newSuppName}
                onChange={(e) => setNewSuppName(e.target.value)}
                placeholder="e.g. Tata Consumer Products / Sharma Wholesalers"
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Phone Number</Label>
              <Input
                value={newSuppPhone}
                onChange={(e) => setNewSuppPhone(e.target.value)}
                placeholder="10-digit mobile"
                className="mt-1 text-xs font-mono"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">GSTIN (Optional)</Label>
              <Input
                value={newSuppGstin}
                onChange={(e) => setNewSuppGstin(e.target.value.toUpperCase())}
                placeholder="27ABCDE1234F1Z5"
                className="mt-1 text-xs font-mono uppercase"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Address / City</Label>
              <Input
                value={newSuppAddress}
                onChange={(e) => setNewSuppAddress(e.target.value)}
                placeholder="Warehouse / Factory location"
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNewSupplierDialog(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCreateSupplierInline}
              className="text-xs font-bold bg-primary text-primary-foreground"
            >
              Save Supplier
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ADD ITEMS TO BILL MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      <AddItemsToBillModal
        open={showAddItemsModal}
        onOpenChange={(open) => {
          setShowAddItemsModal(open);
          if (!open) setAddItemsTargetRow(null);
        }}
        items={billItemOptions}
        onAddSelectedItems={handleBatchAddItemsAtTarget}
        priceMode="purchase"
        onOpenCreateItem={() => {
          setShowAddItemsModal(false);
          handleOpenCreateItemDialog(addItemsTargetRow ?? recalculatedItems.length - 1, "");
        }}
      />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DIRECT INLINE QUICK CREATE ITEM & ADD TO INVENTORY MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      <QuickCreateItemModal
        open={showQuickCreateItemModal}
        onOpenChange={setShowQuickCreateItemModal}
        orgId={orgId}
        initialName={initialNewItemName}
        priceMode="purchase"
        onItemCreated={handleItemCreated}
      />
    </>
  );
}
