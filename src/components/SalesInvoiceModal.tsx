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
import { Badge } from "@/components/ui/badge";
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
  Sparkles,
  Truck,
} from "lucide-react";
import { GenerateEwayBillModal } from "@/components/eway/GenerateEwayBillModal";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { partiesApi } from "@/services/partiesApi";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import {
  BusinessDocument,
  DocumentLineItem,
  SalesDocumentType,
} from "@/types/documents";
import {
  INDIAN_STATES_AND_CODES,
  PAYMENT_TERMS_SUGGESTIONS,
} from "@/utils/suggestionData";
import { documentsService } from "@/services/documentsService";
import { cn } from "@/lib/utils";
import { calculateInvoiceBreakdown } from "@/utils/invoiceCalculations";
import { UnifiedInvoiceRenderer } from "@/components/invoices/UnifiedInvoiceRenderer";
import { InvoiceFitView } from "@/components/invoices/InvoiceFitView";
import { AddItemsToBillModal, BillItemOption } from "@/components/invoices/AddItemsToBillModal";
import { downloadExactInvoicePdf } from "@/utils/downloadExactInvoice";
import { useProducts } from "@/context/ProductsContext";
import { networkInvoicingService } from "@/services/networkInvoicingService";
import { ConnectedOrgInfo } from "@/types/networkInvoicing";
import { PartyCustomItem } from "@/types/parties";
import { QuickCreateItemModal, CreatedProductResult } from "@/components/items/QuickCreateItemModal";
import { MobileCreateInvoice } from "@/components/invoices/mobile/MobileCreateInvoice";
import { MobileInvoiceSuccessView } from "@/components/invoices/mobile/MobileInvoiceSuccessView";

interface CustomerOption {
  id: string;
  name: string;
  phone: string;
  email?: string;
  gstin?: string;
  address?: string;
  balance?: number;
  custom_fields?: Record<string, unknown>;
  keepSamePrice?: boolean;
  keepSameInventory?: boolean;
  customItems?: PartyCustomItem[];
}

interface ProductCatalogOption {
  id: string;
  name: string;
  category?: string;
  barcode: string | null;
  brand: string | null;
  sku?: string;
  unit?: string;
  altUnit?: string;
  altUnitConversion?: number;
  selling_price?: number;
  tax_rate?: number;
  tags?: Record<string, unknown>;
  product_batches?: {
    id: string;
    batch_number: string;
    mrp: number;
    stock: number;
    expiry_date: string | null;
  }[];
}

interface UnifiedProductSuggestion {
  id: string;
  name: string;
  category: string;
  barcode?: string;
  sku?: string;
  hsn?: string;
  unit: string;
  altUnit?: string;
  altUnitConversion?: number;
  rate: number;
  mrp?: number;
  gstRate: number;
  stock: number;
  batchNumber?: string;
  isDb?: boolean;
}

interface SalesInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  initialDocType?: SalesDocumentType;
  editingDoc?: BusinessDocument | null;
  onSaved: (doc: BusinessDocument) => void;
  onPrintRequest?: (doc: BusinessDocument) => void;
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : typeof error === "string" ? error : fallback;

export function SalesInvoiceModal({
  open,
  onOpenChange,
  orgId,
  initialDocType = "sales_invoice",
  editingDoc = null,
  onSaved,
  onPrintRequest,
}: SalesInvoiceModalProps) {
  const { user } = useAuth();
  const { org } = useOrganization();

  // Mode: "edit" | "preview"
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [previewLayout, setPreviewLayout] = useState<"a4" | "a4_detailed">("a4");
  const [mobileTab, setMobileTab] = useState<'party'|'items'|'summary'>('items');

  // Document Type
  const [docType, setDocType] = useState<SalesDocumentType>(initialDocType);

  // Party State
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [partyName, setPartyName] = useState("");
  const [partyPhone, setPartyPhone] = useState("");
  const [partyGstin, setPartyGstin] = useState("");
  const [partyAddress, setPartyAddress] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("27-Maharashtra");
  const [connectedPartner, setConnectedPartner] = useState<ConnectedOrgInfo | null>(null);

  // Auto-detect if customer is a connected CredSmart partner business
  useEffect(() => {
    let isMounted = true;
    if (!partyName.trim()) {
      setConnectedPartner(null);
      return;
    }
    networkInvoicingService.findConnectedOrganization({
      phone: partyPhone,
      gstin: partyGstin,
      name: partyName,
    }).then((partner) => {
      if (isMounted) {
        if (partner && partner.id !== orgId) {
          setConnectedPartner(partner);
        } else {
          setConnectedPartner(null);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [partyName, partyPhone, partyGstin, selectedCustomerId, orgId]);

  // Billing Address fields (new)
  const [billingAddress, setBillingAddress] = useState("");
  const [billingPincode, setBillingPincode] = useState("");
  const [billingPlaceOfSupply, setBillingPlaceOfSupply] = useState("27-Maharashtra");
  const [sameAsParty, setSameAsParty] = useState(false);

  // Inline New Customer Modal
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustGstin, setNewCustGstin] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");

  // Invoice Details
  const [invoicePrefix, setInvoicePrefix] = useState("INV/26-27/");
  const [invoiceNumberSeq, setInvoiceNumberSeq] = useState("101");
  const [repeatInvoice, setRepeatInvoice] = useState(false);
  const [docDate, setDocDate] = useState(new Date().toISOString().split("T")[0]);
  const [showDueDate, setShowDueDate] = useState(false);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentTerms, setPaymentTerms] = useState("Due on Receipt");
  const [ewayBillNo, setEwayBillNo] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [isEwayModalOpen, setIsEwayModalOpen] = useState(false);
  
  // Toggle visibility states
  const [showEwayBill, setShowEwayBill] = useState(false);
  const [showBillingAddress, setShowBillingAddress] = useState(false);
  const [showVehicleNo, setShowVehicleNo] = useState(false);
  const [showPoReference, setShowPoReference] = useState(false);
  const [poReference, setPoReference] = useState("");

  // Products catalog & Item search (shared store)
  const { products: productsCatalog, refreshProducts, addOrUpdateProduct } = useProducts();
  const [itemSearchText, setItemSearchText] = useState<Record<number, string>>({});
  const [activeItemDropdown, setActiveItemDropdown] = useState<number | null>(null);
  const [showAddItemsModal, setShowAddItemsModal] = useState(false);

  // Item input refs for auto-focus
  const itemInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const focusItemInput = (index: number) => {
    setTimeout(() => {
      itemInputRefs.current[index]?.focus();
    }, 60);
  };

  useEffect(() => {
    if (!showCustomerDropdown) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showCustomerDropdown]);

  // Quick Create Item State
  const [showQuickCreateItemModal, setShowQuickCreateItemModal] = useState(false);
  const [mobileSuccessInvoice, setMobileSuccessInvoice] = useState<BusinessDocument | null>(null);
  const [activeSavedDocId, setActiveSavedDocId] = useState<string | null>(editingDoc?.id || null);
  const [targetRowIndexForNewItem, setTargetRowIndexForNewItem] = useState<number | null>(null);
  const [initialNewItemName, setInitialNewItemName] = useState("");
  // When AddItems modal is opened from a specific row, this remembers the row index so
  // selected items can be inserted/handled for that row if needed.
  const [addItemsTargetRow, setAddItemsTargetRow] = useState<number | null>(null);

  const activeCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const billItemOptions: BillItemOption[] = useMemo(() => {
    let catalog = productsCatalog || [];

    if (activeCustomer && activeCustomer.keepSameInventory === false && activeCustomer.customItems && activeCustomer.customItems.length > 0) {
      const allowedIds = new Set(activeCustomer.customItems.map((ci) => ci.productId));
      catalog = catalog.filter((p) => allowedIds.has(p.id));
    }

    const customPriceMap = new Map<string, number>();
    if (activeCustomer && activeCustomer.keepSamePrice === false && activeCustomer.customItems) {
      activeCustomer.customItems.forEach((ci) => {
        customPriceMap.set(ci.productId, ci.customPrice);
      });
    }

    return catalog.map((p) => {
      const tags = (p as unknown).tags || {};
      const productName = p.name || (p as typeof p & { productName?: string; title?: string }).productName || (p as typeof p & { title?: string }).title || "Unnamed Item";
      const defaultSelling = tags && (tags.selling_price !== undefined && tags.selling_price !== null)
        ? Number(tags.selling_price)
        : (p.product_batches?.[0]?.mrp || 0);
      const selling = customPriceMap.has(p.id) ? (customPriceMap.get(p.id) ?? defaultSelling) : defaultSelling;
      const gst = tags && (tags.gst_rate !== undefined && tags.gst_rate !== null) ? Number(tags.gst_rate) : 18;
      const hsnVal = tags?.hsn_code || tags?.hsn || (p as unknown).hsn || undefined;
      const altUnitVal = (p as unknown).altUnit || tags?.alt_unit || undefined;
      const altConvVal = (p as unknown).altUnitConversion ?? tags?.alt_unit_conversion ?? undefined;

      return {
        id: p.id,
        name: productName,
        category: p.category || "General",
        barcode: p.barcode,
        sku: p.sku,
        hsn: hsnVal,
        unit: p.unit || "Pcs",
        altUnit: altUnitVal,
        altUnitConversion: altConvVal ? Number(altConvVal) : undefined,
        sellingPrice: selling,
        gstRate: gst,
        stock: p.product_batches?.reduce((sum, b) => sum + (Number(b.stock) || 0), 0) || 0,
      };
    });
  }, [productsCatalog, activeCustomer]);

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
    "1. Goods once sold will not be taken back or exchanged.\n2. All disputes are subject to local jurisdiction only."
  );

  // Bank & UPI QR details
  const [showBankDetails, setShowBankDetails] = useState(true);
  const [bankAccount, setBankAccount] = useState({
    accountNumber: "",
    ifsc: "",
    bankName: "",
    branch: "",
    accountHolder: "",
  });

  const editorBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMobileTab('items');
      editorBodyRef.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
      if (editorBodyRef.current) editorBodyRef.current.scrollTop = 0;
    }
  }, [open, viewMode]);
  const [showPaymentQr, setShowPaymentQr] = useState(true);
  const [upiId, setUpiId] = useState("");

  // Signature & Stamp
  const [showStamp, setShowStamp] = useState(true);
  const [stampUrl, setStampUrl] = useState<string>("");

  // Financial Settlement & Calculations
  const [showAdditionalCharges, setShowAdditionalCharges] = useState(false);
  const [additionalChargesAmount, setAdditionalChargesAmount] = useState<number>(0);
  const [additionalChargesReason, setAdditionalChargesReason] = useState("Delivery / Shipping");

  const [showDiscount, setShowDiscount] = useState(false);
  const [overallDiscountType, setOverallDiscountType] = useState<"flat" | "percent">("flat");
  const [overallDiscountValue, setOverallDiscountValue] = useState<number>(0);

  const [autoRoundOff, setAutoRoundOff] = useState(true);
  const [manualRoundOff, setManualRoundOff] = useState<number>(0);

  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [markAsFullyPaid, setMarkAsFullyPaid] = useState(true);

  // Loading & Saving
  const [saving, setSaving] = useState(false);

  // Full Document Number Computed
  const fullDocumentNumber = `${invoicePrefix}${invoiceNumberSeq}`.trim();

  // Load Store Settings (Bank, UPI, Stamp) on Mount/Org change
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
      console.warn("Could not load business settings in invoice modal:", e);
    }
  }, [orgId, org]);

  // Fetch Customers & Products with Ledger Balances
  const fetchCustomers = async () => {
    if (!orgId) return;
    try {
      const { data: custData } = await partiesApi.getCustomers(orgId, {
        sort: "name",
        order: "asc",
      });

      const { data: creditData } = await partiesApi.getCreditTransactions({ orgId });

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

      if (custData) {
        const merged = custData.map((c: unknown) => {
          const cf = typeof c.custom_fields === "object" && c.custom_fields !== null ? c.custom_fields : {};
          const keepSamePrice = cf.keepSamePrice !== false;
          const keepSameInventory = cf.keepSameInventory !== false;
          const customItems = Array.isArray(cf.customItems) ? cf.customItems : [];

          return {
            ...c,
            balance: balanceMap[c.id] || 0,
            custom_fields: cf,
            keepSamePrice,
            keepSameInventory,
            customItems,
          };
        });
        setCustomers(merged);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async () => {
    if (!orgId) return;
    try {
      await refreshProducts(orgId);
    } catch (e) {
      console.error(e);
    }
  };

  // Reset or Init Form
  useEffect(() => {
    if (open) {
      fetchCustomers();
      fetchProducts();
      setViewMode("edit");

      if (editingDoc) {
        setActiveSavedDocId(editingDoc.id);
        setDocType(editingDoc.docType as SalesDocumentType);
        const docNum = editingDoc.documentNumber || "";
        const lastSlash = docNum.lastIndexOf("/");
        const lastDash = docNum.lastIndexOf("-");
        const splitIndex = Math.max(lastSlash, lastDash);
        if (splitIndex !== -1) {
          setInvoicePrefix(docNum.substring(0, splitIndex + 1));
          setInvoiceNumberSeq(docNum.substring(splitIndex + 1));
        } else {
          setInvoicePrefix("INV/");
          setInvoiceNumberSeq(docNum);
        }

        setSelectedCustomerId(editingDoc.partyId || "");
        setPartyName(editingDoc.partyName || "");
        setPartyPhone(editingDoc.partyPhone || "");
        setPartyGstin(editingDoc.partyGstin || "");
        setPartyAddress(editingDoc.partyAddress || "");
        // Billing fields from editing document (if available)
        const legacyBillingAddress = editingDoc.billingAddress ?? editingDoc.partyAddress ?? "";
        setBillingAddress(legacyBillingAddress);
        setBillingPincode(editingDoc.billingPincode || "");
        setBillingPlaceOfSupply(editingDoc.billingPlaceOfSupply || editingDoc.placeOfSupply || "27-Maharashtra");
        setSameAsParty(Boolean(editingDoc.partyAddress && legacyBillingAddress === editingDoc.partyAddress));
        setShowBillingAddress(Boolean(legacyBillingAddress && legacyBillingAddress.trim() !== ""));
        setPlaceOfSupply(editingDoc.placeOfSupply || "27-Maharashtra");
        setDocDate(editingDoc.docDate || new Date().toISOString().split("T")[0]);
        if (editingDoc.dueDate) {
          setShowDueDate(true);
          setDueDate(editingDoc.dueDate);
        }
        setPaymentTerms(editingDoc.paymentTerms || "Due on Receipt");
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
        setPaymentMethod(editingDoc.paymentMethod || "Cash");
        const docPaid = editingDoc.paidAmount ?? (editingDoc.status === "paid" ? editingDoc.grandTotal : 0);
        setAmountReceived(docPaid);
        setMarkAsFullyPaid(editingDoc.status === "paid" || docPaid >= (editingDoc.grandTotal ?? 0));
        setNotes(editingDoc.notes || "");
        if (editingDoc.notes) setShowNotes(true);
        setTerms(editingDoc.terms || "1. Goods once sold will not be taken back or exchanged.\n2. All disputes are subject to local jurisdiction only.");
        
        if (editingDoc.transportDetails?.vehicleNumber) {
          setVehicleNumber(editingDoc.transportDetails.vehicleNumber);
          setShowVehicleNo(true);
        }
        if (editingDoc.referenceNumber) {
          setEwayBillNo(editingDoc.referenceNumber);
          setShowEwayBill(true);
        }
        if (editingDoc.custom_fields?.poReference) {
          setPoReference(editingDoc.custom_fields.poReference);
          setShowPoReference(true);
        }
      } else {
        setActiveSavedDocId(null);
        const targetType = initialDocType || "sales_invoice";
        setDocType(targetType);
        const randSeq = Math.floor(100 + Math.random() * 900).toString();
        setInvoicePrefix("INV/26-27/");
        setInvoiceNumberSeq(randSeq);
        setSelectedCustomerId("");
        setPartyName("");
        setCustomerSearch("");
        setPartyPhone("");
        setPartyGstin("");
        setPartyAddress("");
        // Reset billing fields for new document
        setBillingAddress("");
        setBillingPincode("");
        setBillingPlaceOfSupply("27-Maharashtra");
        setSameAsParty(false);
        setShowBillingAddress(false);
        setDocDate(new Date().toISOString().split("T")[0]);
        setShowDueDate(false);
        
        setEwayBillNo("");
        setShowEwayBill(false);
        setVehicleNumber("");
        setShowVehicleNo(false);
        setPoReference("");
        setShowPoReference(false);
        
        setNotes("");
        setShowNotes(false);
        setShowAdditionalCharges(false);
        setAdditionalChargesAmount(0);
        setShowDiscount(false);
        setOverallDiscountValue(0);
        setItems([createNewRow("row-1")]);
        setAmountReceived(0);
        setMarkAsFullyPaid(true);
        setPaymentMethod("Cash");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingDoc, initialDocType]);

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

  // Direct line adding like POS & auto-focus
  const handleAddRow = () => {
    const newId = `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setItems((prev) => {
      const newIdx = prev.length;
      focusItemInput(newIdx);
      return [...prev, createNewRow(newId)];
    });
  };

  const handleBatchAddItems = (newItems: DocumentLineItem[]) => {
    setItems((prev) => {
      const cleanExisting = prev.filter((it) => it.productName.trim() !== "");
      const combined = [...cleanExisting, ...newItems];
      // Auto add new blank line after every item selection
      const nextId = `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      return [...combined, createNewRow(nextId)];
    });
  };

  const handleRemoveRow = (index: number) => {
    if (items.length <= 1) {
      setItems([createNewRow(`row-${Date.now()}`)]);
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // State Code / Interstate
  const orgStateCode = "27"; // Maharashtra
  const isInterState = useMemo(() => {
      const custCode = (placeOfSupply || "").slice(0, 2);
    return custCode !== "" && custCode !== orgStateCode;
  }, [placeOfSupply]);

  // Recalculate Line Items
  const { recalculatedItems, totals } = useMemo(() => {
    return calculateInvoiceBreakdown({
      items: items.map((item) => ({
        ...item,
        quantity: Number(item.quantity) || 0,
        rate: Number(item.rate) || 0,
        discountPercent: Number(item.discountPercent) || 0,
        discountAmount: Number(item.discountAmount) || 0,
        taxRate: Number(item.taxRate) || 0,
        altQty: item.altQty != null ? Number(item.altQty) : undefined,
        altUnit: item.altUnit,
        altUnitConversion: item.altUnitConversion != null ? Number(item.altUnitConversion) : undefined,
      })),
      overallDiscountType,
      overallDiscountValue,
      showAdditionalCharges,
      additionalChargesAmount,
      autoRoundOff,
      manualRoundOff,
      isInterState,
    });
  }, [items, overallDiscountType, overallDiscountValue, showAdditionalCharges, additionalChargesAmount, autoRoundOff, manualRoundOff, isInterState]);

  // Current Invoice document object for E-Way Bill generation
  const currentInvoiceAsDoc: BusinessDocument = useMemo(() => {
    return {
      id: editingDoc?.id || `draft-${Date.now()}`,
      organizationId: orgId || "org",
      docType,
      documentNumber: fullDocumentNumber,
      partyId: selectedCustomerId || undefined,
      partyName: partyName.trim() || "Cash Customer",
      partyPhone: partyPhone.trim() || undefined,
      partyGstin: partyGstin.trim() || undefined,
      partyAddress: partyAddress.trim() || undefined,
      billingAddress: sameAsParty ? (partyAddress.trim() || undefined) : (billingAddress.trim() || partyAddress.trim() || undefined),
      billingPincode: sameAsParty ? undefined : (billingPincode.trim() || undefined),
      billingPlaceOfSupply: sameAsParty ? (placeOfSupply || "27-Maharashtra") : (billingPlaceOfSupply || placeOfSupply || "27-Maharashtra"),
      placeOfSupply,
      docDate,
      dueDate: showDueDate ? dueDate : docDate,
      items: recalculatedItems,
      subtotal: totals.rawSubtotal,
      discountTotal: totals.totalDiscount,
      taxableTotal: totals.taxableTotal,
      cgstTotal: totals.cgstTotal,
      sgstTotal: totals.sgstTotal,
      igstTotal: totals.igstTotal,
      taxTotal: totals.taxTotal,
      roundOff: totals.roundOff,
      grandTotal: totals.grandTotal,
      paidAmount: (markAsFullyPaid || (paymentMethod !== "Credit" && amountReceived === 0)) ? totals.grandTotal : amountReceived,
      balanceDue: (markAsFullyPaid || (paymentMethod !== "Credit" && amountReceived === 0)) ? 0 : Math.max(0, totals.grandTotal - amountReceived),
      status: (markAsFullyPaid || amountReceived >= totals.grandTotal || (paymentMethod !== "Credit" && amountReceived === 0 && totals.grandTotal > 0))
        ? "paid"
        : amountReceived > 0
        ? "partial"
        : "unpaid",
      paymentMethod,
      transportDetails: vehicleNumber.trim() ? { vehicleNumber: vehicleNumber.trim() } : undefined,
      created_at: editingDoc?.created_at || new Date().toISOString(),
    };
  }, [
    editingDoc, orgId, docType, fullDocumentNumber, selectedCustomerId, partyName, partyPhone,
    partyGstin, partyAddress, sameAsParty, billingAddress, billingPincode, billingPlaceOfSupply,
    placeOfSupply, docDate, showDueDate, dueDate, recalculatedItems, totals, amountReceived,
    paymentMethod, vehicleNumber
  ]);

  // Mark as fully paid sync
  useEffect(() => {
    if (markAsFullyPaid) {
      setAmountReceived(totals.grandTotal);
    }
  }, [markAsFullyPaid, totals.grandTotal]);

  // Sync billing when 'same as above' toggled or party address/state changes
  useEffect(() => {
    if (sameAsParty) {
      setBillingAddress(partyAddress || "");
      setBillingPincode("");
      setBillingPlaceOfSupply(placeOfSupply || "27-Maharashtra");
    }
  }, [sameAsParty, partyAddress, placeOfSupply]);

  const handleBillingAddressChange = (value: string) => {
    setBillingAddress(value);
    if (sameAsParty && value !== (partyAddress || "")) {
      setSameAsParty(false);
    }
  };

  const handleBillingPlaceChange = (value: string) => {
    setBillingPlaceOfSupply(value);
    if (sameAsParty && value !== (placeOfSupply || "27-Maharashtra")) {
      setSameAsParty(false);
    }
  };

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

  // Directly selecting product & auto-adding next line item like POS
  const handleSelectProduct = (index: number, product: UnifiedProductSuggestion) => {
    setItems((prev) => {
      const copy = [...prev];
      const pRecord = (product && typeof product === "object" ? product : {}) as Record<string, unknown>;
      const pTags = (pRecord.tags && typeof pRecord.tags === "object" ? pRecord.tags : {}) as Record<string, unknown>;
      const primaryU = product.unit || (pTags.unit as string) || (pRecord.unit as string) || copy[index].unit || "Pcs";
      const altU = (product.altUnit as string) || (pTags.alt_unit as string) || (pRecord.alt_unit as string) || undefined;
      const altConvRaw = product.altUnitConversion ?? pTags.alt_unit_conversion ?? pRecord.alt_unit_conversion ?? undefined;
      const altConv = altConvRaw != null && !isNaN(Number(altConvRaw)) ? Number(altConvRaw) : undefined;

      const hasAlt = altU && altConv && altConv > 1;
      const defaultAltQty = hasAlt ? 1 : undefined;
      const defaultQty = hasAlt ? altConv : 1;

      copy[index] = {
        ...copy[index],
        productId: product.id,
        productName: product.name,
        barcode: product.barcode || undefined,
        hsn: product.hsn || copy[index].hsn || "",
        unit: primaryU,
        altUnit: altU,
        altUnitConversion: altConv,
        altQty: defaultAltQty,
        quantity: defaultQty,
        rate: product.rate,
        batchNumber: product.batchNumber || undefined,
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
          mrp: product.sellingPrice || product.purchasePrice || 0,
          stock: product.stock || 0,
          expiry_date: null,
        },
      ],
    };

    // Update shared product store so all views get refreshed
    try {
      addOrUpdateProduct(catalogRow);
    } catch (e) {
      console.warn('Failed to update shared product store', e);
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
            rate: product.sellingPrice,
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

  // When user selects multiple items from the AddItemsToBillModal, insert them
  // at the row that opened the modal (addItemsTargetRow) if set; otherwise append.
  // The function preserves the existing behavior of ensuring a trailing empty row.
  const handleBatchAddItemsAtTarget = (newItems: DocumentLineItem[]) => {
    if (!newItems || newItems.length === 0) return;
    const target = addItemsTargetRow;

    setItems((prev) => {
      const copy = [...prev];

      // Normalize incoming items into the local DocumentLineItem shape
      const mapped = newItems.map((ni) => ({
        id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        productId: (ni as unknown).productId || (ni as unknown).id || undefined,
        productName: (ni as unknown).productName || (ni as unknown).name || "",
        barcode: (ni as unknown).barcode || undefined,
        hsn: (ni as unknown).hsn || "",
        quantity: Number((ni as unknown).quantity) || 1,
        unit: (ni as unknown).unit || "Pcs",
        altUnit: (ni as unknown).altUnit || undefined,
        altQty: (ni as unknown).altQty !== undefined ? Number((ni as unknown).altQty) : undefined,
        altUnitConversion: (ni as unknown).altUnitConversion ? Number((ni as unknown).altUnitConversion) : undefined,
        rate: Number((ni as unknown).rate) || 0,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: Number((ni as unknown).taxRate) || 18,
        taxableAmount: Number((ni as unknown).taxableAmount) || 0,
        cgstAmount: Number((ni as unknown).cgstAmount) || 0,
        sgstAmount: Number((ni as unknown).sgstAmount) || 0,
        igstAmount: Number((ni as unknown).igstAmount) || 0,
        lineTotal: Number((ni as unknown).lineTotal) || 0,
      } as DocumentLineItem));

        // Determine insertion index
        let insertAt = copy.length; // default append
        let replaceCount = 0;
        
        if (typeof target === "number" && target >= 0 && target < copy.length) {
          insertAt = target;
          if (!copy[target].productName || copy[target].productName.trim() === "") {
            replaceCount = 1;
          }
        } else {
          // If no specific target, but the last row is blank, replace it
          if (copy.length > 0 && (!copy[copy.length - 1].productName || copy[copy.length - 1].productName.trim() === "")) {
            insertAt = copy.length - 1;
            replaceCount = 1;
          }
        }

        copy.splice(insertAt, replaceCount, ...mapped);

        // Ensure trailing blank row exists ONLY if we aren't using the mobile interface
        // We can just add it unconditionally since mobile filters it out, but let's avoid infinite growth
        const last = copy[copy.length - 1];
        if (!last || (last.productName && last.productName.trim() !== "")) {
          copy.push(createNewRow(`row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`));
        }

        return copy;
    });

    // reset the remembered target and close modal
    setAddItemsTargetRow(null);
    setShowAddItemsModal(false);

    // Focus first new inserted row after a tick
    setTimeout(() => {
      const focusIndex = typeof target === "number" && target >= 0 ? target : (items.length - 1);
      focusItemInput(focusIndex + (newItems?.length ? newItems.length - 1 : 0));
    }, 80);
  };

  const handleSelectCustomer = (c: CustomerOption) => {
    setSelectedCustomerId(c.id);
    setPartyName(c.name);
    setCustomerSearch(c.name);
    setPartyPhone(c.phone || "");
    setPartyGstin(c.gstin || "");
    setPartyAddress(c.address || "");
    if (c.gstin && c.gstin.length >= 2) {
      const statePrefix = c.gstin.slice(0, 2);
      const match = INDIAN_STATES_AND_CODES.find((s) => s.startsWith(statePrefix));
      if (match) setPlaceOfSupply(match);
    }
    setShowCustomerDropdown(false);
  };

  const handleCreateCustomerInline = async () => {
    if (!newCustName.trim()) {
      toast.error("Please enter a customer name");
      return;
    }

    const normName = newCustName.trim().toLowerCase();
    const existing = customers.find((c) => c.name.trim().toLowerCase() === normName);
    if (existing) {
      toast.info(`Selected existing customer "${existing.name}"`);
      handleSelectCustomer(existing);
      setShowNewCustomerDialog(false);
      setNewCustName("");
      setNewCustPhone("");
      setNewCustGstin("");
      setNewCustAddress("");
      return;
    }

    try {
      const { data, error } = await partiesApi.createCustomer(
        {
          organization_id: orgId,
          name: newCustName.trim(),
          phone: newCustPhone.trim() || undefined,
          email: undefined,
          address: newCustAddress.trim() || undefined,
        },
        orgId
      );

      if (error || !data) throw error || new Error("Failed to create customer");

      toast.success(`Customer "${newCustName}" created successfully!`);
      const newOpt: CustomerOption = {
        id: data.id,
        name: data.name,
        phone: data.phone || "",
        address: data.address || "",
        balance: 0,
      };
      setCustomers((prev) => [newOpt, ...prev]);
      handleSelectCustomer(newOpt);
      setShowNewCustomerDialog(false);
      setNewCustName("");
      setNewCustPhone("");
      setNewCustGstin("");
      setNewCustAddress("");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to create customer"));
    }
  };

  const handleSave = async (andPrint = false, saveAndNew = false) => {
    if (saving) return;
    if (!partyName.trim()) {
      toast.error("Please enter or select a customer name (Bill To)");
      return;
    }

    const validItems = recalculatedItems.filter((it) => it.productName.trim() !== "");
    if (validItems.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }

    setSaving(true);
    try {
      const resolvedBillingAddress = sameAsParty ? (partyAddress.trim() || undefined) : (billingAddress.trim() || undefined);
      const resolvedBillingPlaceOfSupply = sameAsParty ? (placeOfSupply || "27-Maharashtra") : (billingPlaceOfSupply.trim() || placeOfSupply || "27-Maharashtra");

      const currentDocId = activeSavedDocId || editingDoc?.id || undefined;
      const isUpdate = Boolean(currentDocId);

      const isCredit = paymentMethod === "Credit";
      const isFullyPaid = markAsFullyPaid || (!isCredit && (amountReceived >= totals.grandTotal || amountReceived === 0));
      const finalPaidAmount = isFullyPaid ? totals.grandTotal : amountReceived;
      const finalBalanceDue = Math.max(0, totals.grandTotal - finalPaidAmount);
      const finalStatus =
        finalBalanceDue <= 0.005 || finalPaidAmount >= totals.grandTotal
          ? "paid"
          : finalPaidAmount > 0
          ? "partial"
          : "unpaid";

      const finalDoc: Omit<BusinessDocument, "id"> & { id?: string } = {
        id: currentDocId,
        organizationId: orgId,
        docType,
        documentNumber: fullDocumentNumber,
        referenceNumber: ewayBillNo.trim() || undefined,
        partyId: selectedCustomerId || undefined,
        partyName: partyName.trim(),
        partyPhone: partyPhone.trim() || undefined,
        partyGstin: partyGstin.trim() || undefined,
        partyAddress: partyAddress.trim() || undefined,
        billingAddress: resolvedBillingAddress,
        billingPincode: sameAsParty ? undefined : (billingPincode.trim() || undefined),
        billingPlaceOfSupply: resolvedBillingPlaceOfSupply,
        placeOfSupply,
        docDate,
        dueDate: showDueDate ? dueDate : docDate,
        paymentTerms,
        items: validItems,
        subtotal: totals.rawSubtotal,
        discountTotal: totals.totalDiscount,
        taxableTotal: totals.taxableTotal,
        cgstTotal: totals.cgstTotal,
        sgstTotal: totals.sgstTotal,
        igstTotal: totals.igstTotal,
        taxTotal: totals.taxTotal,
        roundOff: totals.roundOff,
        grandTotal: totals.grandTotal,
        paidAmount: finalPaidAmount,
        balanceDue: finalBalanceDue,
        status: finalStatus,
        paymentMethod,
        notes: showNotes ? notes : undefined,
        terms,
        transportDetails: vehicleNumber.trim() ? { vehicleNumber: vehicleNumber.trim() } : undefined,
        custom_fields: {
          ...(typeof editingDoc?.custom_fields === 'object' && editingDoc?.custom_fields !== null ? editingDoc.custom_fields : {}),
          poReference: showPoReference && poReference.trim() ? poReference.trim() : undefined,
        },
        created_at: editingDoc?.created_at || new Date().toISOString(),
      };

      const saved = await documentsService.saveDocument(finalDoc, user?.id);
      setActiveSavedDocId(saved.id);

      const isMobileView = typeof window !== "undefined" && window.innerWidth < 1024;

      // Toast notification: on desktop show single crisp toast; on mobile suppress toast since full-screen MobileInvoiceSuccessView opens
      if (!isMobileView) {
        if (isUpdate) {
          toast.success(`Invoice #${fullDocumentNumber} updated successfully!`);
        } else if (saveAndNew) {
          toast.success(`Invoice #${saved.documentNumber} created! Ready for next bill.`);
        } else {
          toast.success(`Sales Invoice ${fullDocumentNumber} saved successfully!`);
        }
      }

      // Background network invoice dispatch: silent background sync (eliminate annoying secondary toast popups)
      if (docType === "sales_invoice") {
        networkInvoicingService
          .sendSalesInvoiceToNetwork(saved, org, user?.id)
          .catch((netErr) => {
            console.warn("Network dispatch notice:", netErr);
          });
      }
      onSaved(saved);

      const isMobileView = typeof window !== "undefined" && window.innerWidth < 1024;
      if (andPrint && !isMobileView) {
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
        const parsed = parseInt(invoiceNumberSeq, 10);
        const nextSeq = !isNaN(parsed)
          ? String(parsed + 1).padStart(invoiceNumberSeq.length, "0")
          : Math.floor(100 + Math.random() * 900).toString();
        setInvoiceNumberSeq(nextSeq);
        setPartyName("");
        setCustomerSearch("");
        setSelectedCustomerId("");
        setPartyPhone("");
        setPartyGstin("");
        setPartyAddress("");
        setBillingAddress("");
        setBillingPincode("");
        setBillingPlaceOfSupply("27-Maharashtra");
        setPlaceOfSupply("27-Maharashtra");
        setShowDueDate(false);
        setManualRoundOff(0);
        setSameAsParty(false);
        setShowBillingAddress(false);
        setItems([createNewRow("row-1")]);
        setAmountReceived(0);
        setMarkAsFullyPaid(true);
        setNotes("");
        setShowNotes(false);
        setEwayBillNo("");
        setShowEwayBill(false);
        setVehicleNumber("");
        setShowVehicleNo(false);
        setPoReference("");
        setShowPoReference(false);
        setAdditionalChargesAmount(0);
        setShowAdditionalCharges(false);
        setOverallDiscountValue(0);
        setShowDiscount(false);
        setActiveSavedDocId(null);
        setMobileSuccessInvoice(null);
      } else if (window.innerWidth < 1024) {
        setMobileSuccessInvoice(saved);
      } else {
        onOpenChange(false);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to save invoice"));
    } finally {
      setSaving(false);
    }
  };

  // Print current invoice without saving (validation guards applied)
  const handlePrint = () => {
    if (!partyName.trim()) {
      toast.error("Please enter or select a customer name (Bill To)");
      return;
    }

    const validItems = recalculatedItems.filter((it) => it.productName.trim() !== "");
    if (validItems.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }

    const resolvedBillingAddress = sameAsParty ? (partyAddress.trim() || undefined) : (billingAddress.trim() || undefined);
    const resolvedBillingPlaceOfSupply = sameAsParty ? (placeOfSupply || "27-Maharashtra") : (billingPlaceOfSupply.trim() || placeOfSupply || "27-Maharashtra");

    const docToPrint: BusinessDocument = {
      id: editingDoc?.id || `preview-${Date.now()}`,
      organizationId: orgId,
      docType,
      documentNumber: fullDocumentNumber,
      referenceNumber: ewayBillNo.trim() || undefined,
      partyId: selectedCustomerId || undefined,
      partyName: partyName.trim(),
      partyPhone: partyPhone.trim() || undefined,
      partyGstin: partyGstin.trim() || undefined,
      partyAddress: partyAddress.trim() || undefined,
      billingAddress: resolvedBillingAddress,
      billingPincode: sameAsParty ? undefined : (billingPincode.trim() || undefined),
      billingPlaceOfSupply: resolvedBillingPlaceOfSupply,
      placeOfSupply,
      docDate,
      dueDate: showDueDate ? dueDate : docDate,
      paymentTerms,
      items: validItems,
      subtotal: totals.rawSubtotal,
      discountTotal: totals.totalDiscount,
      taxableTotal: totals.taxableTotal,
      cgstTotal: totals.cgstTotal,
      sgstTotal: totals.sgstTotal,
      igstTotal: totals.igstTotal,
      taxTotal: totals.taxTotal,
      roundOff: totals.roundOff,
      grandTotal: totals.grandTotal,
      paidAmount: (markAsFullyPaid || (paymentMethod !== "Credit" && amountReceived === 0)) ? totals.grandTotal : amountReceived,
      balanceDue: (markAsFullyPaid || (paymentMethod !== "Credit" && amountReceived === 0)) ? 0 : Math.max(0, totals.grandTotal - amountReceived),
      status: (markAsFullyPaid || amountReceived >= totals.grandTotal || (paymentMethod !== "Credit" && amountReceived === 0 && totals.grandTotal > 0)) ? "paid" : amountReceived > 0 ? "partial" : "unpaid",
      paymentMethod,
      notes: showNotes ? notes : undefined,
      terms,
      transportDetails: vehicleNumber.trim() ? { vehicleNumber: vehicleNumber.trim() } : undefined,
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

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase();

    // Filter local customers
    const localMatched = q
      ? customers.filter((c) => {
          const safeName = (c?.name || "").toLowerCase();
          const safePhone = c?.phone || "";
          const safeGstin = c?.gstin || "";
          return safeName.includes(q) || safePhone.includes(q) || safeGstin.toLowerCase().includes(q);
        })
      : customers.slice(0, 20);

    // Merge network org suggestions (read synchronously from localStorage)
    const networkOrgs = networkInvoicingService.getNetworkOrgSuggestions(customerSearch, 10);
    const seenKeys = new Set(
      localMatched.map((c) => `${(c.name || "").toLowerCase().trim()}|${(c.phone || "").trim()}`)
    );
    const networkOnly = networkOrgs
      .filter((o) => {
        const key = `${(o.name || "").toLowerCase().trim()}|${(o.phone || "").trim()}`;
        return !seenKeys.has(key) && o.id !== orgId; // exclude own org
      })
      .map((o) => ({
        id: o.id,
        name: o.name,
        phone: o.phone || "",
        email: o.email,
        gstin: o.gstin,
        address: o.address,
        balance: 0,
        isNetworkOrg: true as const,
      }));

    return [...localMatched, ...networkOnly].slice(0, 25);
  }, [customers, customerSearch, orgId]);

  const getFilteredProducts = (query: string): UnifiedProductSuggestion[] => {
    const safeCatalog = (productsCatalog || []).filter(Boolean);

    const customPriceMap = new Map<string, number>();
    const customItemsList = activeCustomer?.customItems || [];

    if (activeCustomer && activeCustomer.keepSamePrice === false && customItemsList.length > 0) {
      customItemsList.forEach((ci) => {
        if (ci.productId) customPriceMap.set(ci.productId, ci.customPrice);
        if (ci.productName) customPriceMap.set(ci.productName.toLowerCase().trim(), ci.customPrice);
        if (ci.barcode) customPriceMap.set(ci.barcode.trim(), ci.customPrice);
      });
    }

    const synthesizedCustomSuggestions: UnifiedProductSuggestion[] = customItemsList.map((ci) => {
      const existing = safeCatalog.find(
        (p) =>
          p.id === ci.productId ||
          (ci.barcode && p.barcode === ci.barcode) ||
          (ci.productName && p.name?.toLowerCase().trim() === ci.productName.toLowerCase().trim())
      );

      if (existing) {
        const tags = (existing as unknown).tags || {};
        const defaultRate =
          tags && tags.selling_price !== undefined && tags.selling_price !== null
            ? Number(tags.selling_price)
            : existing.product_batches?.reduce((sum, b) => sum + (Number(b.mrp) || 0), 0) || 0;
        const rate =
          activeCustomer?.keepSamePrice === false && ci.customPrice !== undefined
            ? ci.customPrice
            : customPriceMap.get(existing.id) ?? defaultRate;

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
          rate,
          gstRate: ci.gstRate || (tags && tags.gst_rate !== undefined ? Number(tags.gst_rate) : 18),
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
        rate: ci.customPrice || ci.standardPrice || 0,
        gstRate: ci.gstRate || 18,
        stock: ci.customStock || 999,
        isDb: true,
      };
    });

    if (activeCustomer && activeCustomer.keepSameInventory === false && customItemsList.length > 0) {
      if (!query) return synthesizedCustomSuggestions.slice(0, 15);
      const q = query.toLowerCase();
      return synthesizedCustomSuggestions.filter((p) => {
        const name = (p.name || "").toLowerCase();
        const barcode = (p.barcode || "").toLowerCase();
        const sku = (p.sku || "").toLowerCase();
        return name.includes(q) || barcode.includes(q) || sku.includes(q);
      }).slice(0, 15);
    }

    const toSuggestion = (p: ProductCatalogOption): UnifiedProductSuggestion => {
      const tags = (p as unknown).tags || {};
      const defaultRate = tags && (tags.selling_price !== undefined && tags.selling_price !== null)
        ? Number(tags.selling_price)
        : (p.product_batches?.reduce((sum, b) => sum + (Number(b.mrp) || 0), 0) || 0);
      const matchRate =
        customPriceMap.get(p.id) ??
        (p.name ? customPriceMap.get(p.name.toLowerCase().trim()) : undefined) ??
        (p.barcode ? customPriceMap.get(p.barcode.trim()) : undefined);
      const rate = matchRate !== undefined ? matchRate : defaultRate;
      const gst = tags && (tags.gst_rate !== undefined && tags.gst_rate !== null) ? Number(tags.gst_rate) : 18;
      const hsnVal = tags?.hsn_code || tags?.hsn || (p as unknown).hsn || undefined;
      const altUnitVal = (p as unknown).altUnit || tags?.alt_unit || undefined;
      const altConvVal = (p as unknown).altUnitConversion ?? tags?.alt_unit_conversion ?? undefined;

      return {
        id: p.id,
        name: p.name || "Unnamed Item",
        category: p.category || "General",
        barcode: p.barcode || undefined,
        sku: p.sku,
        hsn: hsnVal,
        unit: p.unit || "Pcs",
        altUnit: altUnitVal,
        altUnitConversion: altConvVal ? Number(altConvVal) : undefined,
        rate,
        gstRate: gst,
        stock: p.product_batches?.reduce((sum, b) => sum + (Number(b.stock) || 0), 0) || 0,
        isDb: true,
      };
    };

    const uniqueAdditional = synthesizedCustomSuggestions.filter(
      (cp) =>
        !safeCatalog.some(
          (p) =>
            p.id === cp.id ||
            (p.name && cp.name && p.name.toLowerCase().trim() === cp.name.toLowerCase().trim())
        )
    );

    const fullCatalogSuggestions = [...safeCatalog.map(toSuggestion), ...uniqueAdditional];

    if (!query) return fullCatalogSuggestions.slice(0, 15);

    const q = query.toLowerCase();
    return fullCatalogSuggestions
      .filter((p) => {
        const name = (p?.name || "").toLowerCase();
        const barcode = (p?.barcode || "").toLowerCase();
        const sku = (p?.sku || "").toLowerCase();
        return name.includes(q) || barcode.includes(q) || sku.includes(q);
      })
      .slice(0, 15);
  };

  const upiPayload = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
        org?.name || "Business"
      )}&am=${totals.grandTotal}&cu=INR&tn=${encodeURIComponent(
        `Inv ${fullDocumentNumber}`
      )}`
    : "";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bill-editor-shell z-modal flex flex-col h-[100dvh] max-h-[100dvh] sm:h-[92vh] sm:max-h-[92vh] w-full sm:max-w-7xl sm:w-[98vw] sm:rounded-xl overflow-hidden border-none sm:border p-0 gap-0 bg-white dark:bg-slate-950 lg:block">
          
          {mobileSuccessInvoice ? (
            <div className="lg:hidden">
              <MobileInvoiceSuccessView
                invoice={mobileSuccessInvoice}
                onClose={() => {
                  setActiveSavedDocId(null);
                  setMobileSuccessInvoice(null);
                  onOpenChange(false);
                }}
                onEdit={() => {
                  if (mobileSuccessInvoice) {
                    setActiveSavedDocId(mobileSuccessInvoice.id);
                  }
                  setMobileSuccessInvoice(null);
                }}
                onDelete={async () => {
                  if (mobileSuccessInvoice) {
                    try {
                      await documentsService.deleteDocument(orgId, mobileSuccessInvoice.docType, mobileSuccessInvoice.id);
                      toast.success(`Invoice #${mobileSuccessInvoice.documentNumber} deleted`);
                    } catch (err) {
                      console.error("Delete failed:", err);
                      toast.error("Failed to delete invoice");
                    }
                  }
                  setActiveSavedDocId(null);
                  setMobileSuccessInvoice(null);
                  onOpenChange(false);
                }}
                onDuplicate={() => {
                  if (!mobileSuccessInvoice) return;
                  setActiveSavedDocId(null);
                  const parsed = parseInt(invoiceNumberSeq, 10);
                  const nextSeq = !isNaN(parsed)
                    ? String(parsed + 1).padStart(invoiceNumberSeq.length, "0")
                    : Math.floor(100 + Math.random() * 900).toString();
                  setInvoiceNumberSeq(nextSeq);
                  setAmountReceived(0);
                  setMarkAsFullyPaid(false);
                  setMobileSuccessInvoice(null);
                  toast.success(`Bill duplicated! New bill sequence #${nextSeq}`);
                }}
                onVoid={async () => {
                  if (!mobileSuccessInvoice) return;
                  try {
                    const voidedDoc: BusinessDocument = {
                      ...mobileSuccessInvoice,
                      status: "cancelled",
                    };
                    await documentsService.saveDocument(voidedDoc, user?.id);
                    setMobileSuccessInvoice(voidedDoc);
                    toast.success(`Invoice #${mobileSuccessInvoice.documentNumber} marked as Cancelled`);
                  } catch (err) {
                    console.error("Void failed:", err);
                    toast.error("Failed to cancel invoice");
                  }
                }}
                onGenerateEwayBill={() => setIsEwayModalOpen(true)}
                storeInfo={{
                  name: org?.name || "CredSmart Store",
                  phone: org?.phone,
                  email: org?.email,
                  address: org?.address,
                  gstin: org?.gstin,
                }}
              />
            </div>
          ) : (
            <MobileCreateInvoice
              onClose={() => onOpenChange(false)}
              saving={saving}
              docType={docType}
              docDate={docDate}
              dueDate={dueDate}
              showDueDate={showDueDate}
              invoicePrefix={invoicePrefix}
              invoiceNumberSeq={invoiceNumberSeq}
              selectedCustomerId={selectedCustomerId}
              partyName={partyName}
              customers={customers}
              items={items}
              recalculatedItems={recalculatedItems}
              totals={totals}
              onSetSelectedCustomerId={(id, newCust) => {
                setSelectedCustomerId(id);
                if (newCust) {
                  setCustomers((prev) => [...prev.filter((c) => c.id !== id), newCust]);
                  setPartyName(newCust.name);
                  setPartyPhone(newCust.phone || "");
                  setPartyGstin(newCust.gstin || "");
                  setPartyAddress(newCust.address || "");
                  if (newCust.gstin && newCust.gstin.length >= 2) {
                    const statePrefix = newCust.gstin.slice(0, 2);
                    const match = INDIAN_STATES_AND_CODES.find((s) => s.startsWith(statePrefix));
                    if (match) setPlaceOfSupply(match);
                  }
                  return;
                }
                const cust = customers.find((c) => c.id === id);
                if (cust) {
                  setPartyName(cust.name);
                  setPartyPhone(cust.phone || "");
                  setPartyGstin(cust.gstin || "");
                  setPartyAddress(cust.address || "");
                }
              }}
              onCustomerCreated={(newCust) => {
                setCustomers((prev) => [...prev.filter((c) => c.id !== newCust.id), newCust]);
                setSelectedCustomerId(newCust.id);
                setPartyName(newCust.name);
                setPartyPhone(newCust.phone || "");
                setPartyGstin(newCust.gstin || "");
                setPartyAddress(newCust.address || "");
                if (newCust.gstin && newCust.gstin.length >= 2) {
                  const statePrefix = newCust.gstin.slice(0, 2);
                  const match = INDIAN_STATES_AND_CODES.find((s) => s.startsWith(statePrefix));
                  if (match) setPlaceOfSupply(match);
                }
              }}
              onUpdateItem={handleUpdateItem}
              onRemoveItem={handleRemoveRow}
              onSave={handleSave}
              catalog={billItemOptions}
              onAddSelectedItems={handleBatchAddItemsAtTarget}
              partyPhone={partyPhone}
              partyGstin={partyGstin}
              partyAddress={partyAddress}
              placeOfSupply={placeOfSupply}
              amountReceived={amountReceived}
              paymentMethod={paymentMethod}
              notes={notes}
              terms={terms}
              ewayBillNo={ewayBillNo}
              vehicleNumber={vehicleNumber}
              poReference={poReference}
              storeInfo={{
                name: org?.name || "CredSmart Store",
                phone: org?.phone,
                email: org?.email,
                address: org?.address,
                gstin: org?.gstin,
                pan: org?.pan,
                bank_name: bankAccount.bankName,
                account_number: bankAccount.accountNumber,
                ifsc: bankAccount.ifsc,
                account_holder: bankAccount.accountHolder,
                branch: bankAccount.branch,
                upi_id: upiId,
              }}
            />
          )}

          <div className="hidden lg:flex flex-col h-full w-full">
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
                <span>{editingDoc ? "Edit Sales Invoice" : "Create Sales Invoice"}</span>
              </h2>
            </div>


            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground"
                title="Invoice Settings"
              >
                <Settings className="w-4 h-4" />
              </Button>

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

              {viewMode === "preview" && (
                <div className="flex items-center p-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mr-2">
                  <button
                    type="button"
                    onClick={() => setPreviewLayout("a4")}
                    className={cn(
                      "px-2 py-1 text-[11px] font-semibold rounded transition-all cursor-pointer",
                      previewLayout === "a4"
                        ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs font-bold"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    )}
                    title="Standard A4 (Clean Single-Page Preview Layout)"
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewLayout("a4_detailed")}
                    className={cn(
                      "px-2 py-1 text-[11px] font-semibold rounded transition-all cursor-pointer",
                      previewLayout === "a4_detailed"
                        ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    )}
                    title="Detailed GST (With HSN/SAC Tax Summary Matrix)"
                  >
                    Detailed GST
                  </button>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handlePrint()}
                className="h-8 px-2.5 sm:px-3 text-xs font-semibold border-slate-300 dark:border-slate-700 rounded-lg shadow-2xs cursor-pointer"
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
                className="h-8 px-2.5 sm:px-3 text-xs font-semibold border-slate-300 dark:border-slate-700 rounded-lg shadow-2xs cursor-pointer flex items-center gap-1.5"
                title="Save & New"
              >
                <Save className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Save &amp; New</span>
              </Button>

            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* 2. BODY CONTENT */}
          {/* ───────────────────────────────────────────────────────────── */}
          {viewMode === "preview" ? (
            <InvoiceFitView className="flex-1 min-h-0">
              <UnifiedInvoiceRenderer
                docType="sales_invoice"
                layout={previewLayout}
                showHsnSummary={previewLayout === "a4_detailed"}
                invoiceNumber={fullDocumentNumber}
                date={docDate}
                dueDate={showDueDate ? dueDate : undefined}
                time={new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                referenceNumber={showEwayBill && ewayBillNo.trim() ? ewayBillNo : undefined}
                vehicleNumber={showVehicleNo && vehicleNumber.trim() ? vehicleNumber : undefined}
                poReference={showPoReference && poReference.trim() ? poReference : undefined}
                billingAddress={showBillingAddress && billingAddress.trim() ? billingAddress : undefined}
                billingPincode={showBillingAddress && billingPincode.trim() ? billingPincode : undefined}
                placeOfSupply={placeOfSupply}
                deliveryCharge={0}
                storeInfo={{
                  name: org?.name || "CredSmart Store",
                  phone: org?.phone || "",
                  email: org?.email || "",
                  address: org?.address || "",
                  gstin: org?.gstin || "",
                  pan: org?.pan || "",
                  logoUrl: org?.logo_url || "",
                  bank_name: (showBankDetails && bankAccount.bankName) ? bankAccount.bankName : org?.bank_name,
                  account_number: (showBankDetails && bankAccount.accountNumber) ? bankAccount.accountNumber : org?.account_number,
                  ifsc: (showBankDetails && bankAccount.ifsc) ? bankAccount.ifsc : org?.ifsc,
                  account_holder: (showBankDetails && bankAccount.accountHolder) ? bankAccount.accountHolder : (org?.account_holder || org?.name),
                  branch: (showBankDetails && bankAccount.branch) ? bankAccount.branch : "",
                  upi_id: (showPaymentQr && upiId) ? upiId : org?.upi_id,
                }}
                partyInfo={{
                  name: partyName || "Walk-in Customer",
                  phone: partyPhone,
                  address: partyAddress,
                  gstin: partyGstin,
                  state: placeOfSupply,
                }}
                items={recalculatedItems
                  .filter((it) => (it.productName && it.productName.trim() !== "") || Number(it.rate) > 0 || Number(it.lineTotal) > 0)
                  .map((it) => ({
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
                    taxRate: it.taxRate || 0,
                    taxAmount: ((it.taxRate || 0) * (it.taxableAmount || 0)) / 100,
                    total: it.lineTotal,
                  }))}
                  totals={{
                    subtotal: totals.rawSubtotal,
                    discountTotal: totals.totalDiscount,
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
            </InvoiceFitView>
          ) : (
            <>
            <div ref={editorBodyRef} className="bill-editor-body flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
              
              {/* MOBILE TAB BAR */}
              <div className="lg:hidden flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setMobileTab('party')} 
                  className={cn("flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors", mobileTab === 'party' ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700")}
                >
                  Party & Details
                </button>
                <button 
                  type="button" 
                  onClick={() => setMobileTab('items')} 
                  className={cn("flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors", mobileTab === 'items' ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700")}
                >
                  Items
                </button>
                <button 
                  type="button" 
                  onClick={() => setMobileTab('summary')} 
                  className={cn("flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors", mobileTab === 'summary' ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700")}
                >
                  Summary
                </button>
              </div>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* LEFT COLUMN: PARTY & DETAILS */}
              {/* ───────────────────────────────────────────────────────────── */}
              <div className={cn("lg:w-[280px] xl:w-[320px] shrink-0 overflow-y-auto border-r border-slate-200 dark:border-slate-800 p-3 space-y-3", mobileTab === 'party' ? "flex flex-col" : "hidden lg:flex lg:flex-col")}>
                
                {/* BILL TO CARD (Dropdown Format with Balance) */}
                <div className="bill-panel bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-primary" />
                      Bill To
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowNewCustomerDialog(true)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="Add Customer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Search / Dropdown Input */}
                  {!partyName.trim() && !showCustomerDropdown && (
                    <button
                      type="button"
                      onClick={() => setShowCustomerDropdown(true)}
                      className="w-full h-[104px] border border-dashed border-primary/40 hover:border-primary/70 bg-white dark:bg-slate-900 text-primary text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer"
                    >
                      + Add Party
                    </button>
                  )}
                  <div ref={customerDropdownRef} className={cn("relative", !partyName.trim() && !showCustomerDropdown && "hidden")}>
                    <div
                      className="flex items-center justify-between border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 cursor-pointer shadow-2xs hover:border-primary/60 transition-colors"
                      onClick={() => setShowCustomerDropdown(true)}
                    >
                      <input
                        placeholder="Search party by name or number"
                        value={showCustomerDropdown ? customerSearch : (partyName || customerSearch)}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setShowCustomerDropdown(true);
                        }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        className="w-full text-xs font-semibold text-slate-900 dark:text-white bg-transparent focus:outline-none placeholder:text-slate-400 placeholder:font-normal"
                      />
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>

                    {showCustomerDropdown && (
                      <div className="absolute z-[200] left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                        {/* Table Header Strip */}
                        <div className="px-3.5 py-2 bg-slate-100/90 dark:bg-slate-800/80 flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                          <span>Party Name</span>
                          <span>Balance</span>
                        </div>

                        {/* List of Parties */}
                        <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                          {filteredCustomers.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectCustomer(c);
                              }}
                              className="w-full text-left px-3.5 py-2.5 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                            >
                              <div className="flex-1 min-w-0 pr-2">
                                <p className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-tight truncate flex items-center gap-1.5">
                                  {c.name}
                                  {(c as { isNetworkOrg?: boolean }).isNetworkOrg && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 uppercase tracking-wide shrink-0">
                                      CredSmart
                                    </span>
                                  )}
                                </p>
                                {c.phone && (
                                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{c.phone}</p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                {(c as { isNetworkOrg?: boolean }).isNetworkOrg ? (
                                  <span className="text-[10px] text-indigo-500 font-semibold">Network</span>
                                ) : (
                                  <span className={cn(
                                    "font-mono font-bold text-xs flex items-center justify-end gap-1",
                                    (c.balance || 0) > 0 ? "text-slate-800 dark:text-slate-200" : "text-slate-500"
                                  )}>
                                    ₹ {(c.balance || 0).toLocaleString("en-IN")}
                                    {(c.balance || 0) > 0 && <span className="text-[10px] text-emerald-600">↓</span>}
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                          {filteredCustomers.length === 0 && (
                            <div className="p-4 text-center text-xs text-muted-foreground">
                              No party found matching "{customerSearch}"
                            </div>
                          )}
                        </div>

                        {/* Bottom Action: + Create Party */}
                        <div className="p-2 bg-slate-50 dark:bg-slate-800/40">
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setShowNewCustomerDialog(true);
                              setShowCustomerDropdown(false);
                            }}
                            className="w-full py-2 rounded-lg border border-dashed border-primary/40 hover:border-primary text-primary text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-primary/5 transition-all cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            + Create Party
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Selected Party Summary Card */}
                  {partyName.trim() && !showCustomerDropdown && (
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
                            setShowCustomerDropdown(true);
                            setCustomerSearch("");
                          }}
                          className="h-6 px-2 text-[11px] text-primary hover:text-primary font-semibold shrink-0"
                        >
                          Change
                        </Button>
                      </div>

                      {connectedPartner && (
                        <div className="mt-2 pt-2 border-t border-emerald-500/20 flex items-start gap-2 bg-emerald-500/10 p-2 rounded-md">
                          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <div className="text-[11px] flex-1">
                            <span className="font-bold text-emerald-800 dark:text-emerald-300">
                              ⚡ Connected CredSmart Store: {connectedPartner.name}
                            </span>
                            <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                              Saving this invoice will automatically send an in-app notification to {connectedPartner.name} to approve &amp; inward this into their Purchases.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {showBillingAddress && (
                    <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 p-3 space-y-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                          Billing Address
                        </Label>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="same-as-party-address"
                            checked={sameAsParty}
                            onCheckedChange={(checked) => {
                              const isChecked = Boolean(checked);
                              setSameAsParty(isChecked);
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
                        onChange={(e) => handleBillingAddressChange(e.target.value)}
                        disabled={sameAsParty}
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
                              if (sameAsParty) setSameAsParty(false);
                            }}
                            placeholder="400001"
                            className="h-8 text-xs mt-1 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                          />
                        </div>

                        <div>
                          <Label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                            State
                          </Label>
                          <Select value={billingPlaceOfSupply} onValueChange={handleBillingPlaceChange}>
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
                  )}
                </div>

                {/* ───────────────────────────────────────────────────────────── */}
                {/* INVOICE DETAILS CARD */}
                {/* ───────────────────────────────────────────────────────────── */}
                <div className="bill-panel bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Invoice Details
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={repeatInvoice}
                          onCheckedChange={setRepeatInvoice}
                          id="repeat-inv"
                          className="scale-75"
                        />
                        <Label htmlFor="repeat-inv" className="text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                          Repeat this invoice
                        </Label>
                      </div>
                      <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Row 1: Invoice Prefix & Invoice Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Invoice Prefix
                      </Label>
                      <Input
                        value={invoicePrefix}
                        onChange={(e) => setInvoicePrefix(e.target.value)}
                        placeholder="KE/26-27/"
                        className="h-8 text-xs font-mono font-medium mt-1 bg-slate-50/50 dark:bg-slate-800/50"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Invoice Number
                      </Label>
                      <Input
                        value={invoiceNumberSeq}
                        onChange={(e) => setInvoiceNumberSeq(e.target.value)}
                        placeholder="130"
                        className="h-8 text-xs font-mono font-bold mt-1 bg-slate-50/50 dark:bg-slate-800/50"
                      />
                    </div>
                  </div>

                  {/* Row 2: Sales Invoice Date */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Date & Time</Label>
                    <div className="h-8 text-xs font-medium bg-slate-50 dark:bg-slate-800/50 flex items-center px-3 rounded-md border border-input text-slate-500">
                      Auto-generated
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

                  {/* ── Optional Fields Toggle Row ── */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 block">Optional Fields</span>
                    <div className="flex flex-col gap-2 mt-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-semibold text-slate-500 cursor-pointer" htmlFor="toggle-eway">E-Way Bill</Label>
                        <Switch id="toggle-eway" checked={showEwayBill} onCheckedChange={(c) => { setShowEwayBill(c); if (!c) setEwayBillNo(""); }} />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-semibold text-slate-500 cursor-pointer" htmlFor="toggle-billing">Billing Address</Label>
                        <Switch id="toggle-billing" checked={showBillingAddress} onCheckedChange={(c) => { setShowBillingAddress(c); if (!c) { setBillingAddress(""); setBillingPincode(""); setSameAsParty(false); } }} />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-semibold text-slate-500 cursor-pointer" htmlFor="toggle-vehicle">Vehicle No</Label>
                        <Switch id="toggle-vehicle" checked={showVehicleNo} onCheckedChange={(c) => { setShowVehicleNo(c); if (!c) setVehicleNumber(""); }} />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-semibold text-slate-500 cursor-pointer" htmlFor="toggle-po">PO Reference</Label>
                        <Switch id="toggle-po" checked={showPoReference} onCheckedChange={(c) => { setShowPoReference(c); if (!c) setPoReference(""); }} />
                      </div>
                    </div>

                    {/* Inline fields — only shown when toggled ON */}
                    {(showEwayBill || showVehicleNo || showPoReference) && (
                      <div className="mt-2 space-y-2">
                        {showEwayBill && (
                          <div>
                            <div className="flex items-center justify-between">
                              <Label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                E-Way Bill No. <HelpCircle className="w-3 h-3 text-slate-400" />
                              </Label>
                              <button
                                type="button"
                                onClick={() => setIsEwayModalOpen(true)}
                                className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
                              >
                                {ewayBillNo ? "Update E-Way" : "+ Auto-Generate"}
                              </button>
                            </div>
                            <Input
                              value={ewayBillNo}
                              onChange={(e) => setEwayBillNo(e.target.value)}
                              placeholder="e.g. 241098765432"
                              className="h-7 text-xs font-mono mt-0.5 bg-slate-50/50 dark:bg-slate-800/50"
                            />
                          </div>
                        )}
                        {showVehicleNo && (
                          <div>
                            <Label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Vehicle No.</Label>
                            <Input
                              value={vehicleNumber}
                              onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                              placeholder="e.g. MH-12-AB-1234"
                              className="h-7 text-xs font-mono uppercase mt-0.5 bg-slate-50/50 dark:bg-slate-800/50"
                            />
                          </div>
                        )}
                        {showPoReference && (
                          <div>
                            <Label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">PO Reference No.</Label>
                            <Input
                              value={poReference}
                              onChange={(e) => setPoReference(e.target.value)}
                              placeholder="e.g. PO-2026-001"
                              className="h-7 text-xs font-mono mt-0.5 bg-slate-50/50 dark:bg-slate-800/50"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* CENTER COLUMN: ITEMS */}
              {/* ───────────────────────────────────────────────────────────── */}
              <div className={cn("flex-1 min-w-0 flex flex-col overflow-hidden border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900", mobileTab === 'items' ? "flex" : "hidden lg:flex")}>
                <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-0 space-y-2">
                  {/* GST Rule 138 E-Way Bill Warning Banner when Total > ₹50,000 */}
                  {totals.grandTotal > 50000 && (
                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center justify-between gap-3 text-xs mb-2">
                      <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-medium">
                        <Truck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>
                          <strong>GST Rule 138 Requirement:</strong> Total invoice value exceeds ₹50,000 threshold (₹{Number(totals.grandTotal ?? 0).toLocaleString("en-IN")}). E-Way Bill is required for consignment transit.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEwayModalOpen(true)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shrink-0 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>{ewayBillNo ? `EWB: ${ewayBillNo.slice(0, 8)}...` : "Generate E-Way Bill"}</span>
                      </button>
                    </div>
                  )}
              {activeCustomer && (activeCustomer.keepSamePrice === false || activeCustomer.keepSameInventory === false) && (
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between gap-2 text-xs mb-2">
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <Sparkles className="w-4 h-4 text-primary shrink-0" />
                    <span>
                      <strong>Custom Party Catalog Active:</strong> {activeCustomer.name}
                      {activeCustomer.keepSamePrice === false && " • Custom Prices Applied"}
                      {activeCustomer.keepSameInventory === false && ` • Restricted to ${activeCustomer.customItems?.length || 0} product(s)`}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-background font-semibold">
                    Party Rule Active
                  </Badge>
                </div>
              )}
              <div className="bill-panel bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                                {/* 1. MOBILE INVOICE ITEMS CARDS VIEW (< md screens) */}
                <div className="block md:hidden divide-y divide-slate-200 dark:divide-slate-800 p-3 space-y-3">
                  {recalculatedItems.map((item, idx) => (
                    <div key={item.id} className="pt-3 first:pt-0 space-y-2.5">
                      {/* Card Header: Row Number + Product Button + Delete Button */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                              #{idx + 1}
                            </span>
                            {item.hsn && (
                              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                HSN: {item.hsn}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              setAddItemsTargetRow(idx);
                              try {
                                if ((productsCatalog || []).length === 0) {
                                  await fetchProducts();
                                }
                              } catch (e) {
                                console.warn('Failed to refresh product catalog', e);
                              }
                              setShowAddItemsModal(true);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between gap-2 shadow-2xs"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Package className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span className="truncate text-xs font-medium text-slate-900 dark:text-white">
                                {item.productName || "Add Item To Bill"}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0 font-mono">Select ▾</span>
                          </button>
                        </div>

                        {/* Direct Mobile Delete Button (To delete wrong added item in 1 tap) */}
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 transition-all active:scale-95 shrink-0 mt-5 cursor-pointer shadow-2xs"
                          title="Delete wrong added item"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </button>
                      </div>

                      {/* Mobile Item Controls: Qty, Unit, Price, Discount, Tax, Line Total */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        {/* Quantity */}
                        <div>
                          <Label className="text-[10px] text-slate-500 font-semibold uppercase">Qty</Label>
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
                            className="h-8 text-xs font-mono font-semibold"
                          />
                        </div>

                        {/* Unit */}
                        <div>
                          <Label className="text-[10px] text-slate-500 font-semibold uppercase">Unit</Label>
                          <Select
                            value={item.unit || "Pcs"}
                            onValueChange={(val) => handleUpdateItem(idx, "unit", val)}
                          >
                            <SelectTrigger className="h-8 text-xs">
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
                        </div>

                        {/* Price / Rate */}
                        <div>
                          <Label className="text-[10px] text-slate-500 font-semibold uppercase">Price (₹)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) => handleUpdateItem(idx, "rate", Number(e.target.value))}
                            className="h-8 text-xs font-mono text-right"
                          />
                        </div>

                        {/* Discount */}
                        <div>
                          <Label className="text-[10px] text-slate-500 font-semibold uppercase">Disc %</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discountPercent || ""}
                            onChange={(e) => handleUpdateItem(idx, "discountPercent", Number(e.target.value))}
                            placeholder="0%"
                            className="h-8 text-xs font-mono text-center"
                          />
                        </div>

                        {/* Tax */}
                        <div>
                          <Label className="text-[10px] text-slate-500 font-semibold uppercase">Tax</Label>
                          <Select
                            value={String(item.taxRate)}
                            onValueChange={(val) => handleUpdateItem(idx, "taxRate", Number(val))}
                          >
                            <SelectTrigger className="h-8 text-xs">
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
                        </div>

                        {/* Line Total */}
                        <div className="flex flex-col justify-end">
                          <Label className="text-[10px] text-slate-500 font-semibold uppercase">Amount</Label>
                          <div className="h-8 flex items-center justify-end px-2.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700">
                            ₹{Number(item.lineTotal ?? 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 2. DESKTOP DATA TABLE (>= md screens) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[600px] text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        <th className="py-2.5 px-1.5 w-8 text-center">NO</th>
                        <th className="py-2.5 px-2 min-w-[150px] w-auto">ITEMS</th>
                        <th className="py-2.5 px-1.5 w-16">HSN</th>
                        <th className="py-2.5 px-1.5 w-14 text-center">QTY</th>
                        <th className="py-2.5 px-1.5 w-20 text-center">UNIT</th>
                        <th className="py-2.5 px-1.5 w-20 text-right">PRICE</th>
                        <th className="py-2.5 px-1.5 w-16 text-center">DISC</th>
                        <th className="py-2.5 px-1.5 w-16 text-center">TAX</th>
                        <th className="py-2.5 px-2 w-24 text-right">AMOUNT</th>
                        <th className="py-2.5 px-1 w-8 text-center">
                          <Settings className="w-3.5 h-3.5 text-muted-foreground mx-auto" />
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {recalculatedItems.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-2 px-1.5 text-center text-slate-400 font-mono text-xs">
                            {idx + 1}
                          </td>

                          {/* Product selection replaced by an explicit Add Items button (opens modal)
                              per user's request: typing field replaced with a simple button that shows
                              the full inventory. This preserves Create New Item flow via the modal too. */}
                                  <td className="py-2 px-2 relative">
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          // Remember which row opened the Add Items modal — useful if
                                          // the batch-add handler wants to insert at that row.
                                          setAddItemsTargetRow(idx);
                                          // If catalog is empty for some reason (stale state), try fetching again
                                          try {
                                            if ((productsCatalog || []).length === 0) {
                                              // fetchProducts is defined in this component scope
                                              await fetchProducts();
                                            }
                                          } catch (e) {
                                            console.warn('Failed to refresh product catalog before opening Add Items modal', e);
                                          }
                                          setShowAddItemsModal(true);
                                        }}
                                        className="w-full text-left px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between gap-2"
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
                          <td className="py-2 px-1.5">
                            <Input
                              value={item.hsn || ""}
                              onChange={(e) => handleUpdateItem(idx, "hsn", e.target.value)}
                              placeholder="HSN"
                              className="h-8 text-xs font-mono bg-transparent px-1.5"
                            />
                          </td>

                          {/* Qty (Pressing Enter auto advances) */}
                          <td className="py-2 px-1.5">
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
                              className="h-8 text-xs text-center font-mono font-semibold bg-transparent px-1.5"
                            />
                            {item.altUnit && item.altUnitConversion && item.altQty != null && (
                              <span className="block text-[9px] text-blue-600 dark:text-blue-400 font-mono font-semibold text-center mt-0.5 whitespace-nowrap">
                                ({item.altQty}*{item.altUnitConversion} {item.unit || "Pcs"})
                              </span>
                            )}
                          </td>

                          {/* Unit */}
                          <td className="py-2 px-1.5">
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
                                <SelectTrigger className="h-8 text-xs bg-transparent font-medium px-2">
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
                          <td className="py-2 px-1.5">
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
                              className="h-8 text-xs text-right font-mono font-semibold bg-transparent px-1.5"
                            />
                          </td>

                          {/* Discount */}
                          <td className="py-2 px-1.5">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discountPercent || ""}
                              onChange={(e) => handleUpdateItem(idx, "discountPercent", Number(e.target.value))}
                              placeholder="%"
                              className="h-8 text-xs text-center font-mono bg-transparent px-1.5"
                            />
                          </td>

                          {/* Tax Dropdown */}
                          <td className="py-2 px-1.5">
                            <Select
                              value={String(item.taxRate)}
                              onValueChange={(val) => handleUpdateItem(idx, "taxRate", Number(val))}
                            >
                              <SelectTrigger className="h-8 text-xs bg-transparent px-2">
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
                          <td className="py-2 px-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                            ₹{Number(item.lineTotal ?? 0).toFixed(2)}
                          </td>

                          {/* Remove button */}
                          <td className="py-2 px-1 text-center">
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

                {/* Direct Add Item Row Actions (Like POS) */}
                <div className="p-3 bg-slate-50/70 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px] flex-wrap">
                      {/* Buttons removed as per user request: Add Item To Bill, Create New Item, Add Blank Row */}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Scan Barcode removed as per user request */}
                    </div>
                </div>

                {/* Subtotals Summary Strip */}
                <div className="shrink-0 px-4 py-2.5 bg-slate-100/90 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Subtotal</span>
                  <div className="flex items-center gap-6 font-mono">
                    <span>Qty: <strong className="text-slate-900 dark:text-white">{totals.totalQty}</strong></span>
                    <span>Tax: <strong className="text-slate-900 dark:text-white">₹{Number(totals.taxTotal ?? 0).toFixed(2)}</strong></span>
                    <span>Total: <strong className="text-slate-900 dark:text-white">₹{Number(totals.rawSubtotal ?? 0).toFixed(2)}</strong></span>
                  </div>
                </div>
              </div> {/* close internal bill-panel */}
              </div> {/* close inner flex-1 */}
              </div> {/* close CENTER COLUMN */}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* RIGHT COLUMN: SUMMARY & PAYMENT */}
              {/* ───────────────────────────────────────────────────────────── */}
              <div className={cn("lg:w-[280px] xl:w-[320px] shrink-0 overflow-y-auto p-3 space-y-3", mobileTab === 'summary' ? "flex flex-col" : "hidden lg:flex lg:flex-col")}>
                {/* SECTION: Notes, Terms, Bank Details, Payment QR */}
                <div className="space-y-3">
                  {showNotes ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-primary" />
                          Notes &amp; Remarks
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
                        placeholder="Add remarks or notes for the customer..."
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


                </div>

                {/* SECTION: Calculations, Totals, Settlement & Stamp */}
                <div className="bill-panel bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-3.5">
                  {showAdditionalCharges ? (
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Additional Charges
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
                          placeholder="e.g. Shipping / Packing"
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
                      <Plus className="w-3.5 h-3.5" /> Add Additional Charges
                    </button>
                  )}

                  {/* Taxable Amount */}
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 py-1">
                    <span>Taxable Amount</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      ₹{Number(totals.taxableTotal ?? 0).toFixed(2)}
                    </span>
                  </div>

                  {/* Add Discount link */}
                  {showDiscount ? (
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Overall Discount
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
                      <Plus className="w-3.5 h-3.5" /> Add Discount
                    </button>
                  )}

                  {/* Auto Round Off */}
                  <div className="flex items-center justify-between text-xs py-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="round-off"
                        checked={autoRoundOff}
                        onCheckedChange={(checked) => setAutoRoundOff(!!checked)}
                      />
                      <Label htmlFor="round-off" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
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

                  {/* Total Amount (Prominent Bold Display) */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Total Amount:
                    </span>
                    <span className="text-xl font-black font-mono text-primary">
                      ₹ {Number(totals.grandTotal ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Total Amount Received & Mode */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Total Amount Received</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        ₹ {Number(amountReceived ?? 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-mono">₹</span>
                        <Input
                          type="number"
                          min="0"
                          value={amountReceived || ""}
                          onChange={(e) => {
                            setAmountReceived(Number(e.target.value));
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

                      <Select 
                        value={paymentMethod} 
                        onValueChange={(val) => {
                          setPaymentMethod(val);
                          if (val === "Credit") {
                            setMarkAsFullyPaid(false);
                            setAmountReceived(0);
                          } else {
                            setMarkAsFullyPaid(true);
                            setAmountReceived(totals.grandTotal);
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs w-28 shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="UPI">UPI</SelectItem>
                          <SelectItem value="Card">Card</SelectItem>
                          <SelectItem value="Net Banking">Net Banking</SelectItem>
                          <SelectItem value="Cheque">Cheque</SelectItem>
                          <SelectItem value="Credit">Credit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Mark as fully paid checkbox */}
                    <div className="flex items-center gap-2 pt-1">
                      <Checkbox
                        id="fully-paid"
                        checked={markAsFullyPaid}
                        onCheckedChange={(checked) => setMarkAsFullyPaid(!!checked)}
                      />
                      <Label htmlFor="fully-paid" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                        Mark as fully paid
                      </Label>
                    </div>
                  </div>

                  {/* Balance Amount */}
                  <div className="flex items-center justify-between text-xs py-2 border-t border-slate-100 dark:border-slate-800 font-semibold">
                    <span className="text-slate-600 dark:text-slate-400">Balance Amount</span>
                    <span className={cn("font-mono font-bold text-sm", totals.grandTotal - amountReceived > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400")}>
                      ₹ {Math.max(0, Number(totals.grandTotal ?? 0) - Number(amountReceived ?? 0)).toFixed(2)}
                    </span>
                  </div>


                </div>
              </div>
            </div>
            
            {/* ───────────────────────────────────────────────────────────── */}
            {/* MOBILE BOTTOM ACTION BAR */}
            {/* ───────────────────────────────────────────────────────────── */}
            <div className="lg:hidden shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5 flex items-center justify-between gap-3 pb-[env(safe-area-inset-bottom)] z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Grand Total</span>
                <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                  ₹ {Number(totals.grandTotal ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={saving}
                onClick={() => handleSave(true, false)}
                className="h-9 px-4 text-xs font-bold rounded-lg bg-primary text-primary-foreground shadow-2xs gap-1.5 flex items-center shrink-0 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Save &amp; Print
              </Button>
            </div>
            </>
          )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* INLINE QUICK ADD CUSTOMER MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
        <DialogContent className="z-modal max-w-md rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              Add New Party (Customer)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Quickly save party details into your CRM directory
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">Customer / Trade Name *</Label>
              <Input
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                placeholder="e.g. Ramesh Enterprises"
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Phone Number</Label>
              <Input
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                placeholder="10-digit mobile"
                className="mt-1 text-xs font-mono"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">GSTIN (Optional)</Label>
              <Input
                value={newCustGstin}
                onChange={(e) => setNewCustGstin(e.target.value.toUpperCase())}
                placeholder="27ABCDE1234F1Z5"
                className="mt-1 text-xs font-mono uppercase"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Billing Address</Label>
              <Input
                value={newCustAddress}
                onChange={(e) => setNewCustAddress(e.target.value)}
                placeholder="Shop 14, Main Market, City"
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNewCustomerDialog(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCreateCustomerInline}
              className="text-xs font-bold bg-primary text-primary-foreground"
            >
              Save Customer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ADD ITEMS TO BILL MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      <AddItemsToBillModal
        open={showAddItemsModal}
        onOpenChange={setShowAddItemsModal}
        items={billItemOptions}
        onAddSelectedItems={handleBatchAddItemsAtTarget}
        priceMode="sales"
        onOpenCreateItem={() => {
          setShowAddItemsModal(false);
          handleOpenCreateItemDialog(recalculatedItems.length - 1, "");
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
        priceMode="sales"
        onItemCreated={handleItemCreated}
      />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* GST E-WAY BILL GENERATION MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      <GenerateEwayBillModal
        open={isEwayModalOpen}
        onOpenChange={setIsEwayModalOpen}
        initialInvoice={mobileSuccessInvoice || currentInvoiceAsDoc}
        onSuccess={(saved) => {
          setEwayBillNo(saved.ewayBillNo);
          setShowEwayBill(true);
          if (saved.vehicleNo) {
            setVehicleNumber(saved.vehicleNo);
            setShowVehicleNo(true);
          }
          toast.success(`E-Way Bill ${saved.ewayBillNo} attached to this invoice!`);
        }}
      />
    </>
  );
}
