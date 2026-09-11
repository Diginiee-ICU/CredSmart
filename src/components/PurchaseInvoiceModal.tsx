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
import { calculateInvoiceBreakdown } from "@/utils/invoiceCalculations";
import { UnifiedInvoiceRenderer } from "@/components/invoices/UnifiedInvoiceRenderer";
import { AddItemsToBillModal, BillItemOption } from "@/components/invoices/AddItemsToBillModal";
import { QuickCreateItemModal, CreatedProductResult } from "@/components/items/QuickCreateItemModal";

interface SupplierOption {
  id: string;
  name: string;
  phone: string;
  email?: string;
  gstin?: string;
  address?: string;
  balance?: number;
}

interface ProductCatalogOption {
  id: string;
  name: string;
  barcode: string | null;
  sku?: string;
  category?: string;
  unit?: string;
  tax_rate?: number;
  selling_price?: number;
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
  onSaved: (doc: BusinessDocument) => void;
  onPrintRequest?: (doc: BusinessDocument) => void;
}

export function PurchaseInvoiceModal({
  open,
  onOpenChange,
  orgId,
  initialDocType = "purchase_invoice",
  editingDoc = null,
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

  // Products catalog & Item search
  const [productsCatalog, setProductsCatalog] = useState<ProductCatalogOption[]>([]);
  const [itemSearchText, setItemSearchText] = useState<Record<number, string>>({});
  const [activeItemDropdown, setActiveItemDropdown] = useState<number | null>(null);
  const [showAddItemsModal, setShowAddItemsModal] = useState(false);

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

  const billItemOptions: BillItemOption[] = useMemo(() => {
    return productsCatalog.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category || "General",
      barcode: p.barcode,
      sku: p.sku,
      unit: p.unit || "Pcs",
      sellingPrice: p.selling_price || 0,
      costPrice: p.product_batches?.[0]?.cost_price || Math.round((p.selling_price || 0) * 0.8),
      gstRate: p.tax_rate !== undefined ? p.tax_rate : 18,
      stock: p.product_batches?.reduce((sum, b) => sum + (Number(b.stock) || 0), 0) || 0,
    }));
  }, [productsCatalog]);

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

  // Bank & QR
  const [showBankDetails, setShowBankDetails] = useState(true);
  const [bankAccount, setBankAccount] = useState({
    accountNumber: "",
    ifsc: "",
    bankName: "",
    branch: "",
    accountHolder: "",
  });
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
          const def = parsed.bankAccounts.find((b: any) => b.isDefault) || parsed.bankAccounts[0];
          setBankAccount({
            accountNumber: def.accountNumber || "",
            ifsc: def.ifsc || "",
            bankName: def.bankName || "",
            branch: def.branch || "",
            accountHolder: def.accountHolder || parsed.businessName || org?.name || "",
          });
        }
        if (parsed.upiId) setUpiId(parsed.upiId);
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

  // Fetch Suppliers & Products with Ledger Balances
  const fetchSuppliers = async () => {
    if (!orgId) return;
    try {
      const { data: suppData } = await supabase
        .from("suppliers")
        .select("id, name, phone, email, address, gstin")
        .eq("organization_id", orgId)
        .order("name");

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

      if (suppData) {
        const merged = suppData.map((s) => ({
          ...s,
          balance: balanceMap[s.id] || 0,
        }));
        setSuppliers(merged);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async () => {
    if (!orgId) return;
    try {
      const { data } = await supabase
        .from("products")
        .select("id, name, barcode, sku, category, unit, tax_rate, selling_price, product_batches(id, batch_number, cost_price, mrp, stock)")
        .eq("organization_id", orgId)
        .order("name");
      if (data) setProductsCatalog(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Reset or Init Form
  useEffect(() => {
    if (open) {
      fetchSuppliers();
      fetchProducts();
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
        setDocDate(editingDoc.docDate || new Date().toISOString().split("T")[0]);
        if (editingDoc.dueDate) {
          setShowDueDate(true);
          setDueDate(editingDoc.dueDate);
        }
        setPaymentTerms(editingDoc.paymentTerms || "30 Days Net");
        setItems(editingDoc.items && editingDoc.items.length > 0 ? editingDoc.items : [createNewRow("row-1")]);
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
        setSelectedSupplierId("");
        setPartyName("");
        setSupplierSearch("");
        setPartyPhone("");
        setPartyGstin("");
        setPartyAddress("");
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

  // Interstate Check
  const orgStateCode = "27";
  const isInterState = useMemo(() => {
    const suppCode = (placeOfSupply || "").slice(0, 2);
    return suppCode !== "" && suppCode !== orgStateCode;
  }, [placeOfSupply]);

  // Recalculate Line Items
  const { recalculatedItems, totals } = useMemo(() => {
    return calculateInvoiceBreakdown({
      items: items.map((item) => ({
        quantity: Number(item.quantity) || 0,
        rate: Number(item.rate) || 0,
        discountPercent: Number(item.discountPercent) || 0,
        discountAmount: Number(item.discountAmount) || 0,
        taxRate: Number(item.taxRate) || 0,
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

  useEffect(() => {
    if (markAsFullyPaid) {
      setAmountPaid(totals.grandTotal);
    }
  }, [markAsFullyPaid, totals.grandTotal]);

  const handleUpdateItem = (index: number, field: keyof DocumentLineItem, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSelectProduct = (index: number, product: UnifiedPurchaseProduct) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        productId: product.id,
        productName: product.name,
        barcode: product.barcode || undefined,
        hsn: product.hsn || copy[index].hsn || "",
        unit: product.unit || copy[index].unit || "Pcs",
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
    fetchProducts();
    if (targetRowIndexForNewItem !== null) {
      setItems((prev) => {
        const copy = [...prev];
        if (targetRowIndexForNewItem < copy.length) {
          copy[targetRowIndexForNewItem] = {
            ...copy[targetRowIndexForNewItem],
            productId: product.id,
            productName: product.name,
            barcode: product.barcode || undefined,
            hsn: product.hsn || copy[targetRowIndexForNewItem].hsn || "",
            unit: product.unit || copy[targetRowIndexForNewItem].unit || "Pcs",
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
      toast.error("Please enter a supplier name");
      return;
    }
    try {
      const { data, error } = await supabase
        .from("suppliers")
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

      toast.success(`Supplier "${newSuppName}" created successfully!`);
      const newOpt: SupplierOption = {
        id: data.id,
        name: data.name,
        phone: data.phone || "",
        address: data.address || "",
        gstin: data.gstin || "",
        balance: 0,
      };
      setSuppliers((prev) => [newOpt, ...prev]);
      handleSelectSupplier(newOpt);
      setShowNewSupplierDialog(false);
      setNewSuppName("");
      setNewSuppPhone("");
      setNewSuppGstin("");
      setNewSuppAddress("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create supplier");
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
        created_at: editingDoc?.created_at || new Date().toISOString(),
      };

      const saved = await documentsService.saveDocument(finalDoc, user?.id);
      toast.success(`Purchase Bill ${fullDocumentNumber} recorded successfully!`);
      onSaved(saved);

      if (andPrint && onPrintRequest) {
        onPrintRequest(saved);
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
    } catch (err: any) {
      toast.error(err.message || "Failed to save purchase bill");
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
    if (!query) return productsCatalog.slice(0, 12).map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category || "General",
      barcode: p.barcode || undefined,
      sku: p.sku,
      unit: p.unit || "Pcs",
      costPrice: p.product_batches?.[0]?.cost_price || Math.round((p.selling_price || 0) * 0.8),
      mrp: p.product_batches?.[0]?.mrp || p.selling_price || 0,
      gstRate: p.tax_rate || 18,
      stock: p.product_batches?.reduce((sum, b) => sum + (Number(b.stock) || 0), 0) || 0,
      isDb: true,
    }));

    const q = query.toLowerCase();
    return productsCatalog
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q))
      )
      .slice(0, 15)
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category || "General",
        barcode: p.barcode || undefined,
        sku: p.sku,
        unit: p.unit || "Pcs",
        costPrice: p.product_batches?.[0]?.cost_price || Math.round((p.selling_price || 0) * 0.8),
        mrp: p.product_batches?.[0]?.mrp || p.selling_price || 0,
        gstRate: p.tax_rate || 18,
        stock: p.product_batches?.reduce((sum, b) => sum + (Number(b.stock) || 0), 0) || 0,
        isDb: true,
      }));
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
        <DialogContent className="bill-editor-shell z-[60] w-full h-[100dvh] max-h-[100dvh] max-w-full rounded-none border-none p-0 sm:max-w-7xl sm:w-[98vw] sm:h-auto sm:max-h-[96vh] sm:rounded-none sm:border flex flex-col gap-0 overflow-visible bg-white dark:bg-slate-950">
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

            {/* Center Mode Switcher */}
            <div className="flex items-center p-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
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
                Edit Mode
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
                Preview Mode
              </button>
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

              <div className="flex items-center">
                <Button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave(false, false)}
                  className="h-8 px-4 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-l-lg shadow-sm cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave(true, false)}
                  className="h-8 px-2 text-xs font-bold bg-primary/95 hover:bg-primary text-primary-foreground rounded-r-lg border-l border-primary-foreground/20 shadow-sm cursor-pointer"
                  title="Save & Print"
                >
                  <Printer className="w-3.5 h-3.5" />
                </Button>
              </div>
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
                    rate: Number(it.rate) || 0,
                    discount: it.discountPercent || 0,
                    discountPercent: it.discountPercent,
                    taxRate: it.taxRate || 18,
                    taxAmount: (it.taxRate || 18) * (it.taxableAmount || 0) / 100,
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
              </div>
            </div>
          ) : (
            <div className="bill-editor-body flex-1 min-h-0 overflow-y-auto p-1 sm:p-1 space-y-1 scrollbar-thin">
              {/* TOP ROW: Bill From (Dropdown Format) & Purchase Bill Details */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* BILL FROM (Dropdown Format with Balance) */}
                <div className="bill-panel lg:col-span-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-primary" />
                      Bill From (Supplier)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowNewSupplierDialog(true)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="Add Supplier"
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
                      + Add Supplier
                    </button>
                  )}
                  <div className={cn("relative", !partyName.trim() && !showSupplierDropdown && "hidden")}>
                    <div
                      className="flex items-center justify-between border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 cursor-pointer shadow-2xs hover:border-primary/60 transition-colors"
                      onClick={() => setShowSupplierDropdown(true)}
                    >
                      <input
                        placeholder="Search supplier by name or number"
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
                      <div className="absolute z-[70] left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                        <div className="px-3.5 py-2 bg-slate-100/90 dark:bg-slate-800/80 flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                          <span>Supplier Name</span>
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
                              No supplier found matching "{supplierSearch}"
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
                            + Create Supplier
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
                        <th className="py-2.5 px-3 min-w-[280px]">ITEMS</th>
                        <th className="py-2.5 px-2 w-24">HSN</th>
                        <th className="py-2.5 px-2 w-20 text-center">QTY</th>
                        <th className="py-2.5 px-2 w-28 text-right">PURCHASE PRICE (₹)</th>
                        <th className="py-2.5 px-2 w-24 text-center">DISCOUNT</th>
                        <th className="py-2.5 px-2 w-24 text-center">TAX</th>
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

                          {/* Item Search Autocomplete & Auto-Advance */}
                          <td className="py-2 px-3 relative">
                            <Input
                              ref={(el) => {
                                itemInputRefs.current[idx] = el;
                              }}
                              value={item.productName}
                              onChange={(e) => {
                                handleUpdateItem(idx, "productName", e.target.value);
                                setItemSearchText((prev) => ({ ...prev, [idx]: e.target.value }));
                                setActiveItemDropdown(idx);
                              }}
                              onFocus={() => {
                                setActiveItemDropdown(idx);
                                if (!itemSearchText[idx] && item.productName) {
                                  setItemSearchText((prev) => ({ ...prev, [idx]: item.productName }));
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const matches = getFilteredProducts(itemSearchText[idx] || item.productName);
                                  if (matches.length > 0) {
                                    handleSelectProduct(idx, matches[0]);
                                  } else if (idx === recalculatedItems.length - 1) {
                                    handleAddRow();
                                  }
                                }
                              }}
                              onBlur={() => {
                                setTimeout(() => {
                                  setActiveItemDropdown((curr) => (curr === idx ? null : curr));
                                }, 220);
                              }}
                              placeholder="Enter Inward Item Name / Barcode..."
                              className="h-8 text-xs font-medium bg-transparent"
                            />

                            {activeItemDropdown === idx && (
                              <div className="absolute z-[70] left-3 top-full mt-1 w-[min(440px,calc(100vw-2rem))] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-h-64 overflow-y-auto p-1.5 text-left divide-y divide-slate-100 dark:divide-slate-800">
                                {getFilteredProducts(itemSearchText[idx] || item.productName).length > 0 ? (
                                  <>
                                    <div className="space-y-0.5 pb-1">
                                      {getFilteredProducts(itemSearchText[idx] || item.productName).map((prod) => (
                                        <button
                                          key={prod.id}
                                          type="button"
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleSelectProduct(idx, prod);
                                          }}
                                          className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-primary/10 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                                        >
                                          <div className="flex-1 min-w-0">
                                            <span className="font-bold text-slate-900 dark:text-white truncate block">
                                              {prod.name}
                                            </span>
                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono mt-0.5">
                                              {prod.barcode && <span>Code: {prod.barcode}</span>}
                                              <span>Current Stock: {prod.stock} {prod.unit}</span>
                                            </div>
                                          </div>
                                          <div className="text-right shrink-0">
                                            <span className="font-bold text-slate-900 dark:text-white font-mono text-xs">
                                              ₹{prod.costPrice}
                                            </span>
                                            <p className="text-[10px] text-muted-foreground font-mono">{prod.gstRate}% GST</p>
                                          </div>
                                        </button>
                                      ))}
                                    </div>

                                    {/* Direct Create Item Action at Bottom of Matches */}
                                    <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800">
                                      <button
                                        type="button"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          handleOpenCreateItemDialog(idx, itemSearchText[idx] || item.productName);
                                        }}
                                        className="w-full flex items-center justify-between p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
                                      >
                                        <div className="flex items-center gap-1.5 truncate">
                                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                          <span className="truncate">Create "{itemSearchText[idx] || item.productName || "New Item"}"</span>
                                        </div>
                                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-primary/20 text-primary shrink-0 ml-1">
                                          + Add to Inventory
                                        </span>
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <div className="p-3 text-center space-y-2">
                                    <p className="text-xs text-muted-foreground font-medium">
                                      No catalog item matching "{itemSearchText[idx] || item.productName || ""}"
                                    </p>
                                    <button
                                      type="button"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleOpenCreateItemDialog(idx, itemSearchText[idx] || item.productName);
                                      }}
                                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                      <span>+ Create Item &amp; Add to Inventory</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
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
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(idx, "quantity", Math.max(1, Number(e.target.value)))}
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

                {/* Direct Add Item Row Actions (Like POS) */}
                <div className="p-3 bg-slate-50/70 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px] flex-wrap">
                    {/* Primary Button: Add Items to Bill (Opens Popup Modal) */}
                    <button
                      type="button"
                      onClick={() => setShowAddItemsModal(true)}
                      className="py-2 px-3.5 rounded-xl glowing-btn-blue text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 shrink-0"
                    >
                      <Package className="w-4 h-4 text-cyan-300 stroke-[2.2]" />
                      <span>+ Add Items to Bill</span>
                    </button>

                    {/* Secondary Button: Create New Item Inline */}
                    <button
                      type="button"
                      onClick={() => handleOpenCreateItemDialog(recalculatedItems.length - 1, "")}
                      className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>+ Create New Item</span>
                    </button>

                    {/* Optional: Add Empty Row */}
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="py-2 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-primary bg-white/50 dark:bg-slate-800/50 hover:bg-primary/5 text-slate-700 dark:text-slate-300 hover:text-primary text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Blank Row</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddItemsModal(true)}
                      className="h-9 px-3 text-xs font-semibold text-slate-700 dark:text-slate-300 gap-1.5 shrink-0 rounded-xl cursor-pointer"
                    >
                      <ScanBarcode className="w-4 h-4 text-primary" />
                      <span>Scan Barcode</span>
                    </Button>
                  </div>
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
                          onValueChange={(val: any) => setOverallDiscountType(val)}
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
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* INLINE QUICK ADD SUPPLIER MODAL */}
      <Dialog open={showNewSupplierDialog} onOpenChange={setShowNewSupplierDialog}>
        <DialogContent className="max-w-md rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              Add New Supplier (Bill From)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Quickly save supplier party details into your supplier ledger
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">Supplier / Vendor Name *</Label>
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
        onOpenChange={setShowAddItemsModal}
        items={billItemOptions}
        onAddSelectedItems={handleBatchAddItems}
        priceMode="purchase"
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
        priceMode="purchase"
        onItemCreated={handleItemCreated}
      />
    </>
  );
}
