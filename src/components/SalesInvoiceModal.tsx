import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  ArrowRightLeft,
  Search,
  ScanBarcode,
  Sparkles,
  CheckCircle2,
  Receipt,
  FileCheck,
  Truck,
  RotateCcw,
  Wallet,
  Building2,
  Calendar as CalendarIcon,
  Percent,
  IndianRupee,
  X,
  ShieldCheck,
} from "lucide-react";
import { lookupGSTIN, isValidGSTIN, isValidPAN, lookupTaxIdentifier } from "@/utils/gstinLookup";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  BusinessDocument,
  DocumentLineItem,
  SalesDocumentType,
  INDIAN_STATES,
  PAYMENT_TERMS_OPTIONS,
} from "@/types/documents";
import {
  STANDARD_PRODUCT_CATALOG,
  STANDARD_PARTY_SUGGESTIONS,
  STANDARD_HSN_CODES,
  STANDARD_GST_UNITS,
  INDIAN_STATES_AND_CODES,
  PAYMENT_TERMS_SUGGESTIONS,
  SuggestionProduct,
  SuggestionParty,
} from "@/utils/suggestionData";
import { documentsService } from "@/services/documentsService";
import { numberToWords } from "@/lib/numberToWords";
import { cn } from "@/lib/utils";

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

const DOC_TYPE_META: Record<SalesDocumentType, { title: string; prefix: string; icon: any; color: string }> = {
  sales_invoice: { title: "Sales Invoice", prefix: "INV-", icon: Receipt, color: "text-indigo-600 dark:text-indigo-400" },
  quotation: { title: "Quotation / Estimate", prefix: "EST-", icon: FileText, color: "text-blue-600 dark:text-blue-400" },
  payment_in: { title: "Payment In", prefix: "REC-", icon: Wallet, color: "text-emerald-600 dark:text-emerald-400" },
  sales_return: { title: "Sales Return", prefix: "SR-", icon: RotateCcw, color: "text-rose-600 dark:text-rose-400" },
  credit_note: { title: "Credit Note", prefix: "CN-", icon: FileCheck, color: "text-amber-600 dark:text-amber-400" },
  delivery_challan: { title: "Delivery Challan", prefix: "DC-", icon: Truck, color: "text-purple-600 dark:text-purple-400" },
  proforma_invoice: { title: "Proforma Invoice", prefix: "PI-", icon: FileText, color: "text-cyan-600 dark:text-cyan-400" },
};

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

  // Document Numbers & Dates
  const [documentNumber, setDocumentNumber] = useState("");
  const [docDate, setDocDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentTerms, setPaymentTerms] = useState("Due on Receipt");
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [referenceNumber, setReferenceNumber] = useState("");

  // Products catalog
  const [productsCatalog, setProductsCatalog] = useState<ProductCatalogOption[]>([]);
  const [itemSearchText, setItemSearchText] = useState<Record<number, string>>({});
  const [activeItemDropdown, setActiveItemDropdown] = useState<number | null>(null);

  // Line items
  const [items, setItems] = useState<DocumentLineItem[]>([
    {
      id: "row-1",
      productName: "",
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

  // Overall Discount & Round Off
  const [overallDiscountType, setOverallDiscountType] = useState<"flat" | "percent">("flat");
  const [overallDiscountValue, setOverallDiscountValue] = useState<number>(0);
  const [autoRoundOff, setAutoRoundOff] = useState(true);

  // Payment details
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "partial" | "unpaid">("paid");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [amountReceived, setAmountReceived] = useState<number>(0);

  // Notes & Terms
  const [notes, setNotes] = useState("Thank you for your business!");
  const [terms, setTerms] = useState("1. Goods once sold will not be taken back.\n2. Payment is due within agreed terms.");

  // Delivery Challan vehicle details
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [transporterName, setTransporterName] = useState("");

  // Loading
  const [saving, setSaving] = useState(false);

  // Initialize or Reset
  useEffect(() => {
    if (open) {
      fetchCustomers();
      fetchProducts();

      if (editingDoc) {
        setDocType(editingDoc.docType as SalesDocumentType);
        setDocumentNumber(editingDoc.documentNumber);
        setSelectedCustomerId(editingDoc.partyId || "");
        setPartyName(editingDoc.partyName || "");
        setPartyPhone(editingDoc.partyPhone || "");
        setPartyGstin(editingDoc.partyGstin || "");
        setPartyAddress(editingDoc.partyAddress || "");
        setPlaceOfSupply(editingDoc.placeOfSupply || "27-Maharashtra");
        setDocDate(editingDoc.docDate || new Date().toISOString().split("T")[0]);
        setDueDate(editingDoc.dueDate || new Date().toISOString().split("T")[0]);
        setPaymentTerms(editingDoc.paymentTerms || "Due on Receipt");
        setReferenceNumber(editingDoc.referenceNumber || "");
        setItems(editingDoc.items && editingDoc.items.length > 0 ? editingDoc.items : [createNewRow("row-1")]);
        setPaymentMethod(editingDoc.paymentMethod || "Cash");
        setAmountReceived(editingDoc.paidAmount || 0);
        setNotes(editingDoc.notes || "Thank you for your business!");
        setTerms(editingDoc.terms || "1. Goods once sold will not be taken back.");
      } else {
        const targetType = initialDocType || "sales_invoice";
        setDocType(targetType);
        const meta = DOC_TYPE_META[targetType];
        const nextNum = documentsService.getNextDocumentNumber(meta.prefix, Math.floor(Math.random() * 80) + 1);
        setDocumentNumber(nextNum);
        setSelectedCustomerId("");
        setPartyName("Cash Customer");
        setPartyPhone("");
        setPartyGstin("");
        setPartyAddress("");
        setDocDate(new Date().toISOString().split("T")[0]);
        setDueDate(new Date().toISOString().split("T")[0]);
        setPaymentTerms("Due on Receipt");
        setReferenceNumber("");
        setItems([createNewRow("row-1")]);
        setAmountReceived(0);
        setOverallDiscountValue(0);
      }
    }
  }, [open, initialDocType, editingDoc]);

  // Update Due Date when Payment Terms or Doc Date changes
  useEffect(() => {
    const termObj = PAYMENT_TERMS_OPTIONS.find((t) => t.value === paymentTerms);
    if (termObj && termObj.days > 0 && docDate) {
      const d = new Date(docDate);
      d.setDate(d.getDate() + termObj.days);
      setDueDate(d.toISOString().split("T")[0]);
    } else if (paymentTerms === "Due on Receipt") {
      setDueDate(docDate);
    }
  }, [paymentTerms, docDate]);

  const createNewRow = (id: string): DocumentLineItem => ({
    id,
    productName: "",
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

  const fetchCustomers = async () => {
    try {
      const { data } = await supabase
        .from("customers")
        .select("id, name, phone, email, gstin, address, balance")
        .eq("organization_id", orgId)
        .order("name");
      if (data) setCustomers(data);
    } catch {}
  };

  const fetchProducts = async () => {
    try {
      const { data } = await supabase
        .from("products")
        .select("id, name, barcode, brand, sku, product_batches ( id, batch_number, mrp, stock, expiry_date )")
        .eq("organization_id", orgId)
        .order("name");
      if (data) setProductsCatalog(data as any);
    } catch {}
  };

  const handleSelectCustomer = (c: CustomerOption) => {
    setSelectedCustomerId(c.id);
    setPartyName(c.name);
    setPartyPhone(c.phone || "");
    setPartyGstin(c.gstin || "");
    setPartyAddress(c.address || "");
    setShowCustomerDropdown(false);
  };

  // Combine database customers with standard party suggestions
  const combinedCustomers = useMemo(() => {
    const list: CustomerOption[] = [];
    const names = new Set<string>();

    customers.forEach((c) => {
      names.add(c.name.toLowerCase().trim());
      list.push(c);
    });

    STANDARD_PARTY_SUGGESTIONS
      .filter((p) => p.type === "customer" || p.type === "both")
      .forEach((sp) => {
        if (!names.has(sp.name.toLowerCase().trim())) {
          list.push({
            id: sp.id,
            name: sp.name,
            phone: sp.phone,
            email: sp.email,
            gstin: sp.gstin,
            address: sp.address,
            balance: sp.balance,
          });
        }
      });

    return list;
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) {
      return combinedCustomers.slice(0, 10);
    }
    return combinedCustomers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q)) ||
          (c.gstin && c.gstin.toLowerCase().includes(q))
      )
      .slice(0, 12);
  }, [combinedCustomers, customerSearch]);

  // Combine database products with standard product catalog
  const combinedProducts = useMemo(() => {
    const list: UnifiedProductSuggestion[] = [];
    const names = new Set<string>();

    productsCatalog.forEach((p) => {
      const defaultBatch = p.product_batches?.[0];
      const rate = defaultBatch?.mrp || p.selling_price || 0;
      const stock = p.product_batches?.reduce((acc, b) => acc + (b.stock || 0), 0) ?? 0;
      names.add(p.name.toLowerCase().trim());
      list.push({
        id: p.id,
        name: p.name,
        category: p.category || "General",
        barcode: p.barcode || undefined,
        sku: p.sku,
        unit: p.unit || "Pcs",
        rate,
        mrp: defaultBatch?.mrp || rate,
        gstRate: p.tax_rate ?? 18,
        stock,
        batchNumber: defaultBatch?.batch_number,
        isDb: true,
      });
    });

    STANDARD_PRODUCT_CATALOG.forEach((sp) => {
      if (!names.has(sp.name.toLowerCase().trim())) {
        list.push({
          id: sp.id,
          name: sp.name,
          category: sp.category,
          barcode: sp.barcode,
          sku: sp.sku,
          hsn: sp.hsn,
          unit: sp.unit || "Pcs",
          rate: sp.sellingPrice,
          mrp: sp.mrp,
          gstRate: sp.gstRate,
          stock: sp.stock,
          isDb: false,
        });
      }
    });

    return list;
  }, [productsCatalog]);

  const getFilteredProducts = (query: string) => {
    const q = (query || "").toLowerCase().trim();
    if (!q) {
      return combinedProducts.slice(0, 15);
    }
    return combinedProducts
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q))
      )
      .slice(0, 15);
  };

  const handleQuickCustGstinChange = async (val: string) => {
    const clean = val.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15);
    setNewCustGstin(clean);
    if ((clean.length === 15 && isValidGSTIN(clean)) || (clean.length === 10 && isValidPAN(clean))) {
      try {
        const res = await lookupTaxIdentifier(clean);
        if (res.legalName) {
          setNewCustName(res.legalName);
        }
        if (res.address) {
          setNewCustAddress(res.address);
        }
        if (res.phone && !newCustPhone) {
          setNewCustPhone(res.phone);
        }
        if (res.stateCode && res.state) {
          setPlaceOfSupply(`${res.stateCode}-${res.state}`);
        }
        toast.success(`Auto-filled details for ${res.legalName}!`);
      } catch {
        // silent fail on fast typing
      }
    }
  };

  const handleCreateCustomerInline = async () => {
    if (!newCustName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    try {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          organization_id: orgId,
          name: newCustName.trim(),
          phone: newCustPhone.trim() || null,
          gstin: newCustGstin.trim() || null,
          address: newCustAddress.trim() || null,
        })
        .select()
        .single();

      if (error || !data) {
        throw new Error(error?.message || "Failed to create customer");
      }

      toast.success(`Customer "${data.name}" added`);
      setCustomers((prev) => [data, ...prev]);
      handleSelectCustomer(data);
      setShowNewCustomerDialog(false);
      setNewCustName("");
      setNewCustPhone("");
      setNewCustGstin("");
      setNewCustAddress("");
    } catch (e: any) {
      toast.error(e.message || "Failed to add customer");
    }
  };

  // Determine if Inter-state (IGST) or Intra-state (CGST+SGST)
  const isInterState = useMemo(() => {
    // Standard place of supply: if state code doesn't match store home state (e.g. 27 for Maharashtra)
    return placeOfSupply.startsWith("27") ? false : true;
  }, [placeOfSupply]);

  // Recalculate line items
  const recalculatedItems = useMemo(() => {
    return items.map((item) => {
      const rawSub = item.quantity * item.rate;
      const discount = item.discountPercent > 0
        ? (rawSub * item.discountPercent) / 100
        : item.discountAmount || 0;
      const taxable = Math.max(0, rawSub - discount);

      const taxAmount = (taxable * item.taxRate) / 100;
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
    const rawSubtotal = recalculatedItems.reduce((acc, it) => acc + it.quantity * it.rate, 0);
    const itemDiscounts = recalculatedItems.reduce((acc, it) => acc + (it.quantity * it.rate - it.taxableAmount), 0);
    const taxableTotal = recalculatedItems.reduce((acc, it) => acc + it.taxableAmount, 0);

    // Overall discount
    const overallDisc = overallDiscountType === "percent"
      ? (taxableTotal * overallDiscountValue) / 100
      : overallDiscountValue;

    const finalTaxable = Math.max(0, taxableTotal - overallDisc);
    const cgstTotal = recalculatedItems.reduce((acc, it) => acc + it.cgstAmount, 0);
    const sgstTotal = recalculatedItems.reduce((acc, it) => acc + it.sgstAmount, 0);
    const igstTotal = recalculatedItems.reduce((acc, it) => acc + it.igstAmount, 0);
    const taxTotal = cgstTotal + sgstTotal + igstTotal;

    const unroundedGrand = finalTaxable + taxTotal;
    const roundedGrand = autoRoundOff ? Math.round(unroundedGrand) : Number(unroundedGrand.toFixed(2));
    const roundOff = Number((roundedGrand - unroundedGrand).toFixed(2));

    return {
      rawSubtotal: Number(rawSubtotal.toFixed(2)),
      itemDiscounts: Number(itemDiscounts.toFixed(2)),
      taxableTotal: Number(finalTaxable.toFixed(2)),
      cgstTotal: Number(cgstTotal.toFixed(2)),
      sgstTotal: Number(sgstTotal.toFixed(2)),
      igstTotal: Number(igstTotal.toFixed(2)),
      taxTotal: Number(taxTotal.toFixed(2)),
      roundOff,
      grandTotal: roundedGrand,
    };
  }, [recalculatedItems, overallDiscountType, overallDiscountValue, autoRoundOff]);

  // Update Amount Received when Grand Total changes (if full payment status)
  useEffect(() => {
    if (paymentStatus === "paid") {
      setAmountReceived(totals.grandTotal);
    } else if (paymentStatus === "unpaid") {
      setAmountReceived(0);
    }
  }, [totals.grandTotal, paymentStatus]);

  const handleUpdateItem = (index: number, field: keyof DocumentLineItem, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSelectProduct = (index: number, product: UnifiedProductSuggestion) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        productId: product.id,
        productName: product.name,
        barcode: product.barcode || undefined,
        hsn: product.hsn || copy[index].hsn || undefined,
        unit: product.unit || copy[index].unit || "Pcs",
        rate: product.rate,
        batchNumber: product.batchNumber || undefined,
        taxRate: product.gstRate !== undefined ? product.gstRate : 18,
      };
      return copy;
    });
    setActiveItemDropdown(null);
  };

  const handleAddCustomItem = (index: number, customName: string) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        productName: customName,
        rate: copy[index].rate || 0,
      };
      return copy;
    });
    setActiveItemDropdown(null);
  };

  const handleAddRow = () => {
    setItems((prev) => [...prev, createNewRow(`row-${Date.now()}`)]);
  };

  const handleRemoveRow = (index: number) => {
    if (items.length <= 1) {
      setItems([createNewRow(`row-${Date.now()}`)]);
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Convert Document Type
  const handleConvertDocumentType = (newType: SalesDocumentType) => {
    const meta = DOC_TYPE_META[newType];
    const nextNum = documentsService.getNextDocumentNumber(meta.prefix, Math.floor(Math.random() * 80) + 1);
    setDocType(newType);
    setDocumentNumber(nextNum);
    toast.info(`Converted document format to "${meta.title}"`);
  };

  const handleSave = async (andPrint = false) => {
    if (!partyName.trim()) {
      toast.error("Please enter party / customer name");
      return;
    }
    if (items.length === 0 || (items.length === 1 && !items[0].productName.trim())) {
      toast.error("Please add at least one line item");
      return;
    }

    setSaving(true);
    try {
      const finalDoc: BusinessDocument = {
        id: editingDoc?.id || `doc-${Date.now()}`,
        organizationId: orgId,
        docType,
        documentNumber: documentNumber.trim() || `INV-${Date.now().toString().slice(-6)}`,
        referenceNumber: referenceNumber.trim() || undefined,
        partyId: selectedCustomerId || undefined,
        partyName: partyName.trim(),
        partyPhone: partyPhone.trim() || undefined,
        partyGstin: partyGstin.trim() || undefined,
        partyAddress: partyAddress.trim() || undefined,
        placeOfSupply,
        docDate,
        dueDate,
        paymentTerms,
        items: recalculatedItems,
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
        notes,
        terms,
        transportDetails:
          docType === "delivery_challan"
            ? { vehicleNumber, transporterName }
            : undefined,
        created_at: editingDoc?.created_at || new Date().toISOString(),
      };

      const saved = await documentsService.saveDocument(finalDoc, user?.id);
      toast.success(`${DOC_TYPE_META[docType].title} saved successfully`);
      onSaved(saved);

      if (andPrint && onPrintRequest) {
        onPrintRequest(saved);
      }

      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save document");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full h-[100dvh] max-h-[100dvh] max-w-full rounded-none border-none p-0 sm:max-w-7xl sm:w-[96vw] sm:h-auto sm:max-h-[95vh] sm:rounded-2xl sm:border flex flex-col gap-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b border-border bg-slate-50/80 dark:bg-slate-900/80 flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-slate-800 shadow-2xs border", DOC_TYPE_META[docType].color)}>
                {(() => {
                  const Icon = DOC_TYPE_META[docType].icon;
                  return <Icon className="w-5 h-5" />;
                })()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                    {editingDoc ? `Edit ${DOC_TYPE_META[docType].title}` : `Create ${DOC_TYPE_META[docType].title}`}
                  </DialogTitle>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 font-mono font-medium border border-indigo-200 dark:border-indigo-800">
                    {documentNumber}
                  </span>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  GST-compliant sales multi-document wizard with real-time tax calculation
                </DialogDescription>
              </div>
            </div>

            {/* Document Type Switcher Dropdown */}
            <div className="flex items-center gap-2 mr-6">
              <Select
                value={docType}
                onValueChange={(val: any) => handleConvertDocumentType(val)}
              >
                <SelectTrigger className="h-8 text-xs font-semibold bg-background border-border/80 min-w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales_invoice">Sales Invoice</SelectItem>
                  <SelectItem value="quotation">Quotation / Estimate</SelectItem>
                  <SelectItem value="payment_in">Payment In</SelectItem>
                  <SelectItem value="sales_return">Sales Return</SelectItem>
                  <SelectItem value="credit_note">Credit Note</SelectItem>
                  <SelectItem value="delivery_challan">Delivery Challan</SelectItem>
                  <SelectItem value="proforma_invoice">Proforma Invoice</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </DialogHeader>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 scrollbar-thin">
            {/* Top Row: Customer Selection & Document Metadata */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Customer / Party Section */}
              <div className="lg:col-span-7 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/50 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                    Customer / Party Details
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewCustomerDialog(true)}
                    className="h-6 px-2 text-[11px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950 font-semibold gap-1"
                  >
                    <UserPlus className="w-3 h-3" />
                    + New Customer
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Party Search Autocomplete */}
                  <div className="relative">
                    <Label className="text-[11px] text-muted-foreground">Party Name *</Label>
                    <Input
                      value={partyName}
                      onChange={(e) => {
                        setPartyName(e.target.value);
                        setCustomerSearch(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      onBlur={() => {
                        setTimeout(() => setShowCustomerDropdown(false), 200);
                      }}
                      placeholder="e.g. Sharma Retailers / Walk-in"
                      className="mt-1 text-xs font-medium"
                    />

                    {showCustomerDropdown && filteredCustomers.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-h-56 overflow-y-auto p-1.5 divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredCustomers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectCustomer(c);
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-indigo-50/70 dark:hover:bg-indigo-950/50 transition-colors flex items-center justify-between group"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                  {c.name}
                                </span>
                                {c.gstin && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 font-mono text-muted-foreground">
                                    {c.gstin}
                                  </span>
                                )}
                              </div>
                              {c.phone && <span className="text-[11px] text-muted-foreground font-mono">Ph: {c.phone}</span>}
                              {c.address && <p className="text-[10px] text-muted-foreground/80 truncate max-w-[240px]">{c.address}</p>}
                            </div>
                            {c.balance !== undefined && c.balance > 0 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-mono font-bold shrink-0">
                                Due: ₹{c.balance.toLocaleString("en-IN")}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-[11px] text-muted-foreground">Phone Number</Label>
                    <Input
                      value={partyPhone}
                      onChange={(e) => setPartyPhone(e.target.value)}
                      placeholder="10-digit mobile"
                      className="mt-1 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] text-muted-foreground">GSTIN (Optional)</Label>
                    <Input
                      value={partyGstin}
                      onChange={(e) => setPartyGstin(e.target.value.toUpperCase())}
                      placeholder="27ABCDE1234F1Z5"
                      className="mt-1 text-xs font-mono uppercase"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] text-muted-foreground">Place of Supply (State)</Label>
                    <Select value={placeOfSupply} onValueChange={setPlaceOfSupply}>
                      <SelectTrigger className="mt-1 text-xs">
                        <SelectValue />
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
                </div>
              </div>

              {/* Document Meta Section */}
              <div className="lg:col-span-5 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/50 border border-border space-y-3">
                <Label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  Document Details
                </Label>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Document #</Label>
                    <Input
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(e.target.value)}
                      className="mt-1 text-xs font-mono font-semibold"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] text-muted-foreground">Date</Label>
                    <Input
                      type="date"
                      value={docDate}
                      onChange={(e) => setDocDate(e.target.value)}
                      className="mt-1 text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] text-muted-foreground">Payment Terms</Label>
                    <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                      <SelectTrigger className="mt-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_TERMS_SUGGESTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[11px] text-muted-foreground">Due Date</Label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>

                {docType === "delivery_challan" && (
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/60">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Vehicle No.</Label>
                      <Input
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value)}
                        placeholder="MH-12-AB-1234"
                        className="mt-0.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Transporter</Label>
                      <Input
                        value={transporterName}
                        onChange={(e) => setTransporterName(e.target.value)}
                        placeholder="VRL Logistics"
                        className="mt-0.5 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="rounded-xl border border-border bg-card shadow-2xs">
              <div className="p-3 bg-slate-100/70 dark:bg-slate-900/80 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Line Items &amp; Taxable Breakdown
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-muted-foreground font-mono">
                    {items.length} item{items.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-2">
                  <span>Tax Mode:</span>
                  <span className={cn("font-bold px-1.5 py-0.5 rounded text-[10px]", isInterState ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300")}>
                    {isInterState ? "IGST (Inter-State)" : "CGST + SGST (Intra-State)"}
                  </span>
                </div>
              </div>

              {/* Table wrapper with min-h and pb-36 to prevent clipping of absolute popover dropdowns */}
              <div className="overflow-x-auto min-h-[300px] pb-36">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/40 text-muted-foreground font-semibold text-[11px] border-b border-border">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 min-w-[320px]">Item Description</th>
                      <th className="py-2.5 px-2 w-24 text-center">Qty</th>
                      <th className="py-2.5 px-2 w-28">Unit</th>
                      <th className="py-2.5 px-3 w-32 text-right">Rate (₹)</th>
                      <th className="py-2.5 px-2 w-24 text-center">Disc (%)</th>
                      <th className="py-2.5 px-2 w-28 text-center">GST (%)</th>
                      <th className="py-2.5 px-3 w-32 text-right">Taxable</th>
                      <th className="py-2.5 px-3 w-32 text-right">Total (₹)</th>
                      <th className="py-2.5 px-2 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recalculatedItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2 px-3 text-muted-foreground font-mono text-center">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 relative">
                          <Input
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
                            onBlur={() => {
                              setTimeout(() => {
                                setActiveItemDropdown((current) => (current === idx ? null : current));
                              }, 220);
                            }}
                            placeholder="Type product name or scan barcode..."
                            className="h-8 text-xs font-medium"
                          />

                          {activeItemDropdown === idx && (
                            <div className="absolute z-50 left-3 top-full mt-1 w-[380px] sm:w-[480px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-h-64 overflow-y-auto p-1.5 text-left divide-y divide-slate-100 dark:divide-slate-800/80">
                              <div className="p-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                                <span>Suggested Products</span>
                                <span className="font-mono">
                                  {getFilteredProducts(itemSearchText[idx] || item.productName).length} items
                                </span>
                              </div>
                              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                                {getFilteredProducts(itemSearchText[idx] || item.productName).map((prod) => (
                                  <button
                                    key={prod.id}
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      handleSelectProduct(idx, prod);
                                    }}
                                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-indigo-50/70 dark:hover:bg-indigo-950/50 transition-colors flex items-center justify-between gap-3 group"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-semibold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                                          {prod.name}
                                        </span>
                                        {prod.category && (
                                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium shrink-0 border border-indigo-200/60 dark:border-indigo-800/60">
                                            {prod.category}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground mt-0.5 font-mono">
                                        {prod.barcode && <span>Code: {prod.barcode}</span>}
                                        {prod.sku && !prod.barcode && <span>SKU: {prod.sku}</span>}
                                        <span className={cn("font-medium", prod.stock > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                                          Stock: {prod.stock} {prod.unit}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <div className="font-mono font-bold text-foreground text-xs">
                                        ₹{prod.rate}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground font-mono">
                                        {prod.gstRate}% GST
                                      </div>
                                    </div>
                                  </button>
                                ))}

                                {itemSearchText[idx]?.trim() && (
                                  <button
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      handleAddCustomItem(idx, itemSearchText[idx].trim());
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 transition-colors flex items-center gap-1.5"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>+ Add &ldquo;{itemSearchText[idx].trim()}&rdquo; as custom item (₹0)</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(idx, "quantity", Math.max(1, Number(e.target.value)))}
                            className="h-8 text-xs text-center font-mono"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Select
                            value={item.unit}
                            onValueChange={(val) => handleUpdateItem(idx, "unit", val)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-56">
                              {STANDARD_GST_UNITS.map((u) => (
                                <SelectItem key={u.value} value={u.value}>
                                  {u.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) => handleUpdateItem(idx, "rate", Number(e.target.value))}
                            className="h-8 text-xs text-right font-mono"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discountPercent}
                            onChange={(e) => handleUpdateItem(idx, "discountPercent", Number(e.target.value))}
                            className="h-8 text-xs text-center font-mono"
                          />
                        </td>
                        <td className="py-2 px-2">
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
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                          ₹{item.taxableAmount.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                          ₹{item.lineTotal.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            className="p-1 text-muted-foreground hover:text-rose-500 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-muted/20 border-t border-border flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddRow}
                  className="h-8 text-xs gap-1.5 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Line Item
                </Button>
                <div className="text-xs text-muted-foreground font-mono">
                  Subtotal: <span className="font-bold text-foreground">₹{totals.rawSubtotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Bottom Summary, Tax Table & Payment */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Payment Terms & Notes */}
              <div className="lg:col-span-6 space-y-3">
                <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/50 border border-border space-y-3">
                  <Label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                    Payment Settlement
                  </Label>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Payment Status</Label>
                      <Select
                        value={paymentStatus}
                        onValueChange={(val: any) => setPaymentStatus(val)}
                      >
                        <SelectTrigger className="mt-1 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paid">Fully Paid</SelectItem>
                          <SelectItem value="partial">Partial Payment</SelectItem>
                          <SelectItem value="unpaid">Credit / Unpaid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-[11px] text-muted-foreground">Payment Mode</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger className="mt-1 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="UPI">UPI / QR</SelectItem>
                          <SelectItem value="Card">Card / POS</SelectItem>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          <SelectItem value="Cheque">Cheque</SelectItem>
                          <SelectItem value="Credit">Customer Udhar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-[11px] text-muted-foreground">Amount Received (₹)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(Number(e.target.value))}
                        className="mt-1 text-xs font-mono font-semibold"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] text-muted-foreground">Balance Due (₹)</Label>
                      <div className="mt-1 h-9 px-3 py-2 rounded-md bg-muted/60 border border-input font-mono text-xs font-bold text-rose-600 flex items-center">
                        ₹{Math.max(0, totals.grandTotal - amountReceived).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-[11px] text-muted-foreground">Notes &amp; Remarks</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Customer notes or dispatch comments..."
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              {/* GST Breakdown & Grand Total Card */}
              <div className="lg:col-span-6 p-4 rounded-xl bg-slate-50/90 dark:bg-slate-900/80 border border-border space-y-3">
                <Label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Grand Total &amp; Tax Calculation</span>
                  <span className="text-[10px] font-mono text-muted-foreground lowercase">
                    {numberToWords(totals.grandTotal)}
                  </span>
                </Label>

                <div className="space-y-1.5 text-xs divide-y divide-border/60">
                  <div className="flex justify-between py-1 text-muted-foreground">
                    <span>Taxable Amount</span>
                    <span className="font-mono text-foreground font-semibold">₹{totals.taxableTotal.toFixed(2)}</span>
                  </div>

                  {!isInterState ? (
                    <>
                      <div className="flex justify-between py-1 text-muted-foreground">
                        <span>CGST (Central Tax)</span>
                        <span className="font-mono text-foreground">₹{totals.cgstTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-1 text-muted-foreground">
                        <span>SGST (State Tax)</span>
                        <span className="font-mono text-foreground">₹{totals.sgstTotal.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between py-1 text-muted-foreground">
                      <span>IGST (Integrated Tax)</span>
                      <span className="font-mono text-foreground">₹{totals.igstTotal.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between py-1 text-muted-foreground">
                    <span>Total Tax</span>
                    <span className="font-mono font-semibold text-foreground">₹{totals.taxTotal.toFixed(2)}</span>
                  </div>

                  {totals.roundOff !== 0 && (
                    <div className="flex justify-between py-1 text-muted-foreground">
                      <span>Round Off</span>
                      <span className="font-mono text-foreground">{totals.roundOff > 0 ? `+₹${totals.roundOff}` : `-₹${Math.abs(totals.roundOff)}`}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-2 pt-3 border-t-2 border-border">
                    <span className="text-sm font-extrabold text-foreground">Grand Total (₹)</span>
                    <span className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400">
                      ₹{totals.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <DialogFooter className="px-6 py-3 border-t border-border bg-slate-50/80 dark:bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs h-9"
            >
              Cancel
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => handleSave(true)}
                className="text-xs h-9 gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Save &amp; Print
              </Button>

              <Button
                type="button"
                disabled={saving}
                onClick={() => handleSave(false)}
                className="text-xs h-9 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Saving..." : "Save Document"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inline Quick Add Customer Modal */}
      <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              Quick Add Customer
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add a new customer to party directory instantly
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">GSTIN (Optional)</Label>
                <span className="text-[10px] text-muted-foreground">Auto-fills name & address</span>
              </div>
              <Input
                value={newCustGstin}
                onChange={(e) => handleQuickCustGstinChange(e.target.value)}
                placeholder="e.g. 27AAPFU0939F1ZV"
                className="mt-1 text-xs font-mono uppercase tracking-wider"
                maxLength={15}
              />
            </div>
            <div>
              <Label className="text-xs">Customer / Business Name *</Label>
              <Input
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                placeholder="e.g. Rajesh Kumar or Company Name"
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Phone Number</Label>
              <Input
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                placeholder="10-digit mobile"
                className="mt-1 text-xs font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">Billing Address</Label>
              <Input
                value={newCustAddress}
                onChange={(e) => setNewCustAddress(e.target.value)}
                placeholder="City, State, Pincode"
                className="mt-1 text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowNewCustomerDialog(false)} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateCustomerInline} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
