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
  SalesDocumentType,
} from "@/types/documents";
import {
  INDIAN_STATES_AND_CODES,
  PAYMENT_TERMS_SUGGESTIONS,
} from "@/utils/suggestionData";
import { documentsService } from "@/services/documentsService";
import { cn } from "@/lib/utils";
import { UnifiedInvoiceRenderer } from "@/components/invoices/UnifiedInvoiceRenderer";
import { AddItemsToBillModal, BillItemOption } from "@/components/invoices/AddItemsToBillModal";
import { QuickCreateItemModal, CreatedProductResult } from "@/components/items/QuickCreateItemModal";

interface CustomerOption {
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
  category?: string;
  barcode: string | null;
  brand: string | null;
  sku?: string;
  unit?: string;
  selling_price?: number;
  tax_rate?: number;
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
  const [markAsFullyPaid, setMarkAsFullyPaid] = useState(false);

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
      const { data: custData } = await supabase
        .from("customers")
        .select("id, name, phone, email, address")
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

      if (custData) {
        const merged = custData.map((c) => ({
          ...c,
          balance: balanceMap[c.id] || 0,
        }));
        setCustomers(merged);
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
        .select("id, name, barcode, sku, category, unit, selling_price, tax_rate, brand, product_batches(id, batch_number, mrp, stock, expiry_date)")
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
      fetchCustomers();
      fetchProducts();
      setViewMode("edit");

      if (editingDoc) {
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
        setPlaceOfSupply(editingDoc.placeOfSupply || "27-Maharashtra");
        setDocDate(editingDoc.docDate || new Date().toISOString().split("T")[0]);
        if (editingDoc.dueDate) {
          setShowDueDate(true);
          setDueDate(editingDoc.dueDate);
        }
        setPaymentTerms(editingDoc.paymentTerms || "Due on Receipt");
        setItems(editingDoc.items && editingDoc.items.length > 0 ? editingDoc.items : [createNewRow("row-1")]);
        setPaymentMethod(editingDoc.paymentMethod || "Cash");
        setAmountReceived(editingDoc.paidAmount || 0);
        setNotes(editingDoc.notes || "");
        if (editingDoc.notes) setShowNotes(true);
        setTerms(editingDoc.terms || "1. Goods once sold will not be taken back or exchanged.\n2. All disputes are subject to local jurisdiction only.");
        if (editingDoc.transportDetails?.vehicleNumber) {
          setVehicleNumber(editingDoc.transportDetails.vehicleNumber);
        }
      } else {
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
        setAmountReceived(0);
        setMarkAsFullyPaid(false);
        setPaymentMethod("Cash");
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
  const recalculatedItems = useMemo(() => {
    return items.map((item) => {
      const rawSub = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
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

  // Document Grand Totals
  const totals = useMemo(() => {
    const totalQty = recalculatedItems.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
    const rawSubtotal = recalculatedItems.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.rate) || 0), 0);
    const itemDiscounts = recalculatedItems.reduce((acc, it) => acc + ((Number(it.quantity) || 0) * (Number(it.rate) || 0) - it.taxableAmount), 0);
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

  // Mark as fully paid sync
  useEffect(() => {
    if (markAsFullyPaid) {
      setAmountReceived(totals.grandTotal);
    }
  }, [markAsFullyPaid, totals.grandTotal]);

  const handleUpdateItem = (index: number, field: keyof DocumentLineItem, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Directly selecting product & auto-adding next line item like POS
  const handleSelectProduct = (index: number, product: UnifiedProductSuggestion) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        productId: product.id,
        productName: product.name,
        barcode: product.barcode || undefined,
        hsn: product.hsn || copy[index].hsn || "",
        unit: product.unit || copy[index].unit || "Pcs",
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
    try {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          organization_id: orgId,
          name: newCustName.trim(),
          phone: newCustPhone.trim() || undefined,
          email: undefined,
          address: newCustAddress.trim() || undefined,
        })
        .select()
        .single();

      if (error) throw error;

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
    } catch (err: any) {
      toast.error(err.message || "Failed to create customer");
    }
  };

  const handleSave = async (andPrint = false, saveAndNew = false) => {
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
      const finalDoc: Omit<BusinessDocument, "id"> = {
        organizationId: orgId,
        docType,
        documentNumber: fullDocumentNumber,
        referenceNumber: ewayBillNo.trim() || undefined,
        partyId: selectedCustomerId || undefined,
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
        discountTotal: totals.itemDiscounts + (overallDiscountValue || 0),
        taxableTotal: totals.taxableTotal,
        cgstTotal: totals.cgstTotal,
        sgstTotal: totals.sgstTotal,
        igstTotal: totals.igstTotal,
        taxTotal: totals.taxTotal,
        roundOff: totals.roundOff,
        grandTotal: totals.grandTotal,
        paidAmount: amountReceived,
        balanceDue: Math.max(0, totals.grandTotal - amountReceived),
        status:
          amountReceived >= totals.grandTotal
            ? "paid"
            : amountReceived > 0
            ? "partial"
            : "unpaid",
        paymentMethod,
        notes: showNotes ? notes : undefined,
        terms,
        transportDetails: vehicleNumber.trim() ? { vehicleNumber: vehicleNumber.trim() } : undefined,
        created_at: editingDoc?.created_at || new Date().toISOString(),
      };

      const saved = await documentsService.saveDocument(finalDoc, user?.id);
      toast.success(`Sales Invoice ${fullDocumentNumber} saved successfully!`);
      onSaved(saved);

      if (andPrint && onPrintRequest) {
        onPrintRequest(saved);
      }

      if (saveAndNew) {
        const nextSeq = (parseInt(invoiceNumberSeq, 10) + 1 || Math.floor(100 + Math.random() * 900)).toString();
        setInvoiceNumberSeq(nextSeq);
        setPartyName("");
        setCustomerSearch("");
        setSelectedCustomerId("");
        setPartyPhone("");
        setPartyGstin("");
        setPartyAddress("");
        setItems([createNewRow("row-1")]);
        setAmountReceived(0);
        setMarkAsFullyPaid(false);
      } else {
        onOpenChange(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 20);
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.gstin && c.gstin.toLowerCase().includes(q))
    );
  }, [customers, customerSearch]);

  const getFilteredProducts = (query: string): UnifiedProductSuggestion[] => {
    if (!query) return productsCatalog.slice(0, 12).map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category || "General",
      barcode: p.barcode || undefined,
      sku: p.sku,
      unit: p.unit || "Pcs",
      rate: p.selling_price || 0,
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
        rate: p.selling_price || 0,
        gstRate: p.tax_rate || 18,
        stock: p.product_batches?.reduce((sum, b) => sum + (Number(b.stock) || 0), 0) || 0,
        isDb: true,
      }));
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
                <span>{editingDoc ? "Edit Sales Invoice" : "Create Sales Invoice"}</span>
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
                title="Invoice Settings"
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
                  docType="sales_invoice"
                  invoiceNumber={fullDocumentNumber}
                  invoiceDate={docDate}
                  dueDate={showDueDate ? dueDate : undefined}
                  party={{
                    name: partyName || "Customer",
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
            <div className="bill-editor-body flex-1 min-h-0 overflow-y-auto p-1 sm:p-1 space-y-1 scrollbar-thin">
              {/* TOP ROW: Bill To (Dropdown Format) & Invoice Details */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* ───────────────────────────────────────────────────────────── */}
                {/* BILL TO CARD (Dropdown Format with Balance) */}
                {/* ───────────────────────────────────────────────────────────── */}
                <div className="bill-panel lg:col-span-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-3">
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
                      <Settings className="w-3.5 h-3.5" />
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
                  <div className={cn("relative", !partyName.trim() && !showCustomerDropdown && "hidden")}>
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
                      <div className="absolute z-[70] left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
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
                                <p className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-tight truncate">
                                  {c.name}
                                </p>
                                {c.phone && (
                                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{c.phone}</p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <span className={cn(
                                  "font-mono font-bold text-xs flex items-center justify-end gap-1",
                                  (c.balance || 0) > 0 ? "text-slate-800 dark:text-slate-200" : "text-slate-500"
                                )}>
                                  ₹ {(c.balance || 0).toLocaleString("en-IN")}
                                  {(c.balance || 0) > 0 && <span className="text-[10px] text-emerald-600">↓</span>}
                                </span>
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
                    </div>
                  )}
                </div>

                {/* ───────────────────────────────────────────────────────────── */}
                {/* INVOICE DETAILS CARD */}
                {/* ───────────────────────────────────────────────────────────── */}
                <div className="bill-panel lg:col-span-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-3.5">
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
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Sales Invoice Date
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

                  {/* Row 4: E-Way Bill No & Vehicle No */}
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
                        <th className="py-2.5 px-2 w-28 text-right">PRICE/ITEM (₹)</th>
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
                              placeholder="Enter Item Name / Barcode..."
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
                                              <span>Stock: {prod.stock} {prod.unit}</span>
                                            </div>
                                          </div>
                                          <div className="text-right shrink-0">
                                            <span className="font-bold text-slate-900 dark:text-white font-mono text-xs">
                                              ₹{prod.rate}
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

                          {/* Qty (Pressing Enter auto advances) */}
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
                {/* LEFT COLUMN: Notes, Terms, Bank Details, Payment QR */}
                <div className="lg:col-span-6 space-y-4">
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

                  {/* Terms & Conditions */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setTermsOpen((prev) => !prev)}
                      className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Terms &amp; Conditions
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

                  {/* Bank Details Card */}
                  {showBankDetails && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-2.5">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Bank Details
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
                            <span className="text-slate-500 text-[11px]">Bank &amp; Branch Name:</span>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              {bankAccount.bankName} {bankAccount.branch ? `, ${bankAccount.branch}` : ""}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[11px]">Account Holder's Name:</span>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              {bankAccount.accountHolder || org?.name || "Store Owner"}
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

                  {/* Payment QR Card */}
                  {showPaymentQr && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="p-1 bg-white border border-slate-200 rounded-lg shadow-2xs shrink-0">
                          {upiPayload ? (
                            <QRCodeSVG value={upiPayload} size={54} level="M" />
                          ) : (
                            <QrCode className="w-12 h-12 text-slate-400 p-1" />
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            Payment QR <HelpCircle className="w-3 h-3 text-slate-400" />
                          </span>
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-mono mt-0.5">
                            {upiId || "No UPI ID set"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 text-xs">
                        <button
                          type="button"
                          onClick={() => setShowPaymentQr(false)}
                          className="text-rose-500 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newUpi = prompt("Enter UPI ID (e.g. store@upi):", upiId);
                            if (newUpi !== null) setUpiId(newUpi);
                          }}
                          className="text-primary hover:underline flex items-center gap-1 font-medium cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" /> Change
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: Calculations, Totals, Settlement & Stamp */}
                <div className="bill-panel lg:col-span-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-3.5">
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
                      ₹{totals.taxableTotal.toFixed(2)}
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
                      ₹ {totals.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Total Amount Received & Mode */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Total Amount Received</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        ₹ {amountReceived.toFixed(2)}
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

                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
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
                      ₹ {Math.max(0, totals.grandTotal - amountReceived).toFixed(2)}
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
      {/* INLINE QUICK ADD CUSTOMER MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
        <DialogContent className="z-[80] max-w-md rounded-2xl p-5">
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
        onAddSelectedItems={handleBatchAddItems}
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
    </>
  );
}
