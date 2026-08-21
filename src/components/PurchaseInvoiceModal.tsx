import { useState, useEffect, useMemo, useRef } from "react";
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
  Truck,
  Upload,
  Sparkles,
  CheckCircle2,
  FileText,
  UserPlus,
  Building2,
  Wallet,
  RotateCcw,
  Receipt,
  FileCheck,
  Zap,
  Image as ImageIcon,
  Scan,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  BusinessDocument,
  DocumentLineItem,
  PurchaseDocumentType,
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

interface SupplierOption {
  id: string;
  name: string;
  phone: string;
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
  batchNumber: string;
  isDb?: boolean;
}

interface PurchaseInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  initialDocType?: PurchaseDocumentType;
  editingDoc?: BusinessDocument | null;
  onSaved: (doc: BusinessDocument) => void;
}

const PURCHASE_DOC_META: Record<PurchaseDocumentType, { title: string; prefix: string; icon: any; color: string }> = {
  purchase_invoice: { title: "Purchase Invoice", prefix: "PI-", icon: Truck, color: "text-indigo-600 dark:text-indigo-400" },
  payment_out: { title: "Payment Out", prefix: "PAY-", icon: Wallet, color: "text-emerald-600 dark:text-emerald-400" },
  purchase_return: { title: "Purchase Return", prefix: "PR-", icon: RotateCcw, color: "text-rose-600 dark:text-rose-400" },
  debit_note: { title: "Debit Note", prefix: "DN-", icon: FileCheck, color: "text-amber-600 dark:text-amber-400" },
  purchase_order: { title: "Purchase Order", prefix: "PO-", icon: FileText, color: "text-purple-600 dark:text-purple-400" },
};

export function PurchaseInvoiceModal({
  open,
  onOpenChange,
  orgId,
  initialDocType = "purchase_invoice",
  editingDoc = null,
  onSaved,
}: PurchaseInvoiceModalProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Document Type
  const [docType, setDocType] = useState<PurchaseDocumentType>(initialDocType);

  // Suppliers & Products
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [partyName, setPartyName] = useState("");
  const [partyPhone, setPartyPhone] = useState("");
  const [partyGstin, setPartyGstin] = useState("");
  const [partyAddress, setPartyAddress] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("27-Maharashtra");

  // Inline Add Supplier Modal
  const [showNewSupplierDialog, setShowNewSupplierDialog] = useState(false);
  const [newSuppName, setNewSuppName] = useState("");
  const [newSuppPhone, setNewSuppPhone] = useState("");
  const [newSuppGstin, setNewSuppGstin] = useState("");
  const [newSuppAddress, setNewSuppAddress] = useState("");

  // Document Info
  const [documentNumber, setDocumentNumber] = useState("");
  const [docDate, setDocDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [referenceNumber, setReferenceNumber] = useState("");

  // Product Catalog
  const [productsCatalog, setProductsCatalog] = useState<ProductCatalogOption[]>([]);
  const [itemSearchText, setItemSearchText] = useState<Record<number, string>>({});
  const [activeItemDropdown, setActiveItemDropdown] = useState<number | null>(null);

  // Line items
  const [items, setItems] = useState<DocumentLineItem[]>([
    {
      id: "prow-1",
      productName: "",
      batchNumber: "BATCH-01",
      quantity: 10,
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
  const [overallDiscountValue, setOverallDiscountValue] = useState<number>(0);
  const [autoRoundOff, setAutoRoundOff] = useState(true);

  // Payment details
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "partial" | "unpaid">("paid");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [amountPaid, setAmountPaid] = useState<number>(0);

  // Notes
  const [notes, setNotes] = useState("");

  // OCR Upload / Parsing State
  const [isParsingBill, setIsParsingBill] = useState(false);
  const [parsedBillData, setParsedBillData] = useState<{
    fileName: string;
    extractedVendor: string;
    extractedGstin: string;
    extractedBillNo: string;
    extractedDate: string;
    extractedTotal: number;
    extractedItems: { name: string; qty: number; rate: number; taxRate: number }[];
  } | null>(null);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchSuppliers();
      fetchProducts();

      if (editingDoc) {
        setDocType(editingDoc.docType as PurchaseDocumentType);
        setDocumentNumber(editingDoc.documentNumber);
        setSelectedSupplierId(editingDoc.partyId || "");
        setPartyName(editingDoc.partyName || "");
        setPartyPhone(editingDoc.partyPhone || "");
        setPartyGstin(editingDoc.partyGstin || "");
        setPartyAddress(editingDoc.partyAddress || "");
        setDocDate(editingDoc.docDate || new Date().toISOString().split("T")[0]);
        setDueDate(editingDoc.dueDate || new Date().toISOString().split("T")[0]);
        setItems(editingDoc.items && editingDoc.items.length > 0 ? editingDoc.items : [createNewRow("prow-1")]);
        setPaymentMethod(editingDoc.paymentMethod || "Bank Transfer");
        setAmountPaid(editingDoc.paidAmount || 0);
        setNotes(editingDoc.notes || "");
      } else {
        const targetType = initialDocType || "purchase_invoice";
        setDocType(targetType);
        const meta = PURCHASE_DOC_META[targetType];
        const nextNum = documentsService.getNextDocumentNumber(meta.prefix, Math.floor(Math.random() * 50) + 1);
        setDocumentNumber(nextNum);
        setSelectedSupplierId("");
        setPartyName("");
        setPartyPhone("");
        setPartyGstin("");
        setPartyAddress("");
        setDocDate(new Date().toISOString().split("T")[0]);
        setDueDate(new Date().toISOString().split("T")[0]);
        setPaymentTerms("Net 30");
        setReferenceNumber("");
        setItems([createNewRow("prow-1")]);
        setAmountPaid(0);
        setParsedBillData(null);
      }
    }
  }, [open, initialDocType, editingDoc]);

  // Update Due Date
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
    batchNumber: "BATCH-01",
    quantity: 10,
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

  const fetchSuppliers = async () => {
    try {
      const { data } = await supabase
        .from("suppliers")
        .select("id, name, phone, gstin, address")
        .eq("organization_id", orgId)
        .order("name");
      if (data) setSuppliers(data);
    } catch {}
  };

  const fetchProducts = async () => {
    try {
      const { data } = await supabase
        .from("products")
        .select("id, name, barcode, sku, selling_price, product_batches ( id, batch_number, cost_price, mrp, stock )")
        .eq("organization_id", orgId)
        .order("name");
      if (data) setProductsCatalog(data as any);
    } catch {}
  };

  const handleSelectSupplier = (s: SupplierOption) => {
    setSelectedSupplierId(s.id);
    setPartyName(s.name);
    setPartyPhone(s.phone || "");
    setPartyGstin(s.gstin || "");
    setPartyAddress(s.address || "");
    setShowSupplierDropdown(false);
  };

  // Combine database suppliers with standard supplier suggestions
  const combinedSuppliers = useMemo(() => {
    const list: SupplierOption[] = [];
    const names = new Set<string>();

    suppliers.forEach((s) => {
      names.add(s.name.toLowerCase().trim());
      list.push(s);
    });

    STANDARD_PARTY_SUGGESTIONS
      .filter((p) => p.type === "supplier" || p.type === "both")
      .forEach((sp) => {
        if (!names.has(sp.name.toLowerCase().trim())) {
          list.push({
            id: sp.id,
            name: sp.name,
            phone: sp.phone,
            gstin: sp.gstin,
            address: sp.address,
            balance: sp.balance,
          });
        }
      });

    return list;
  }, [suppliers]);

  const filteredSuppliers = useMemo(() => {
    const q = supplierSearch.toLowerCase().trim();
    if (!q) {
      return combinedSuppliers.slice(0, 10);
    }
    return combinedSuppliers
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.phone && s.phone.includes(q)) ||
          (s.gstin && s.gstin.toLowerCase().includes(q))
      )
      .slice(0, 12);
  }, [combinedSuppliers, supplierSearch]);

  // Combine database products with standard product catalog for inward purchases
  const combinedProducts = useMemo(() => {
    const list: UnifiedPurchaseProduct[] = [];
    const names = new Set<string>();

    productsCatalog.forEach((p) => {
      const defaultBatch = p.product_batches?.[0];
      const cost = defaultBatch?.cost_price || p.selling_price || 0;
      const stock = p.product_batches?.reduce((acc, b) => acc + (b.stock || 0), 0) ?? 0;
      names.add(p.name.toLowerCase().trim());
      list.push({
        id: p.id,
        name: p.name,
        category: p.category || "General",
        barcode: p.barcode || undefined,
        sku: p.sku,
        unit: p.unit || "Pcs",
        costPrice: cost,
        mrp: defaultBatch?.mrp || p.selling_price || cost,
        gstRate: p.tax_rate ?? 18,
        stock,
        batchNumber: defaultBatch?.batch_number || `BATCH-${new Date().getFullYear()}-01`,
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
          costPrice: sp.purchasePrice,
          mrp: sp.mrp,
          gstRate: sp.gstRate,
          stock: sp.stock,
          batchNumber: `BATCH-${new Date().getFullYear()}-01`,
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

  const handleCreateSupplierInline = async () => {
    if (!newSuppName.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .insert({
          organization_id: orgId,
          name: newSuppName.trim(),
          phone: newSuppPhone.trim() || null,
          gstin: newSuppGstin.trim() || null,
          address: newSuppAddress.trim() || null,
        })
        .select()
        .single();

      if (error || !data) {
        throw new Error(error?.message || "Failed to create supplier");
      }

      toast.success(`Supplier "${data.name}" added`);
      setSuppliers((prev) => [data, ...prev]);
      handleSelectSupplier(data);
      setShowNewSupplierDialog(false);
      setNewSuppName("");
      setNewSuppPhone("");
      setNewSuppGstin("");
      setNewSuppAddress("");
    } catch (e: any) {
      toast.error(e.message || "Failed to add supplier");
    }
  };

  // OCR Bill Simulation & Parser
  const handleBillFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingBill(true);
    toast.info("Extracting details from bill using OCR...");

    // Simulate smart OCR extraction
    setTimeout(() => {
      const isPdf = file.name.toLowerCase().endsWith(".pdf");
      const simulatedData = {
        fileName: file.name,
        extractedVendor: "Bharat Wholesale Distributors Pvt Ltd",
        extractedGstin: "27AABCB1234F1Z8",
        extractedBillNo: `BILL-${Math.floor(1000 + Math.random() * 9000)}`,
        extractedDate: new Date().toISOString().split("T")[0],
        extractedTotal: 14750.0,
        extractedItems: [
          { name: "Cadbury Dairy Milk Silk 60g (Pack of 24)", qty: 5, rate: 1650, taxRate: 18 },
          { name: "Tata Salt 1kg Vacuum Evaporated", qty: 50, rate: 22, taxRate: 0 },
          { name: "Fortune Sunlite Refined Sunflower Oil 1L", qty: 24, rate: 145, taxRate: 5 },
        ],
      };

      setParsedBillData(simulatedData);
      setIsParsingBill(false);
      toast.success("Bill parsed successfully! Review the extracted data.");
    }, 1200);
  };

  const handleApplyParsedBill = () => {
    if (!parsedBillData) return;

    // Check if supplier already exists
    const match = suppliers.find(
      (s) => s.name.toLowerCase() === parsedBillData.extractedVendor.toLowerCase()
    );
    if (match) {
      handleSelectSupplier(match);
    } else {
      setPartyName(parsedBillData.extractedVendor);
      setPartyGstin(parsedBillData.extractedGstin);
    }

    setReferenceNumber(parsedBillData.extractedBillNo);
    setDocDate(parsedBillData.extractedDate);

    // Populate items
    const parsedItems: DocumentLineItem[] = parsedBillData.extractedItems.map((it, idx) => ({
      id: `prow-ocr-${idx}`,
      productName: it.name,
      batchNumber: `BATCH-${Date.now().toString().slice(-4)}`,
      quantity: it.qty,
      unit: "Pcs",
      rate: it.rate,
      discountPercent: 0,
      discountAmount: 0,
      taxRate: it.taxRate,
      taxableAmount: it.qty * it.rate,
      cgstAmount: ((it.qty * it.rate * it.taxRate) / 100) / 2,
      sgstAmount: ((it.qty * it.rate * it.taxRate) / 100) / 2,
      igstAmount: 0,
      lineTotal: it.qty * it.rate + (it.qty * it.rate * it.taxRate) / 100,
    }));

    setItems(parsedItems);
    setParsedBillData(null);
    toast.success("Purchase bill form auto-filled with extracted data");
  };

  const isInterState = useMemo(() => {
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

  const totals = useMemo(() => {
    const rawSubtotal = recalculatedItems.reduce((acc, it) => acc + it.quantity * it.rate, 0);
    const taxableTotal = recalculatedItems.reduce((acc, it) => acc + it.taxableAmount, 0);
    const cgstTotal = recalculatedItems.reduce((acc, it) => acc + it.cgstAmount, 0);
    const sgstTotal = recalculatedItems.reduce((acc, it) => acc + it.sgstAmount, 0);
    const igstTotal = recalculatedItems.reduce((acc, it) => acc + it.igstAmount, 0);
    const taxTotal = cgstTotal + sgstTotal + igstTotal;

    const unroundedGrand = taxableTotal + taxTotal - (overallDiscountValue || 0);
    const roundedGrand = autoRoundOff ? Math.round(unroundedGrand) : Number(unroundedGrand.toFixed(2));
    const roundOff = Number((roundedGrand - unroundedGrand).toFixed(2));

    return {
      rawSubtotal: Number(rawSubtotal.toFixed(2)),
      taxableTotal: Number(taxableTotal.toFixed(2)),
      cgstTotal: Number(cgstTotal.toFixed(2)),
      sgstTotal: Number(sgstTotal.toFixed(2)),
      igstTotal: Number(igstTotal.toFixed(2)),
      taxTotal: Number(taxTotal.toFixed(2)),
      roundOff,
      grandTotal: roundedGrand,
    };
  }, [recalculatedItems, overallDiscountValue, autoRoundOff]);

  useEffect(() => {
    if (paymentStatus === "paid") {
      setAmountPaid(totals.grandTotal);
    } else if (paymentStatus === "unpaid") {
      setAmountPaid(0);
    }
  }, [totals.grandTotal, paymentStatus]);

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
        hsn: product.hsn || copy[index].hsn || undefined,
        unit: product.unit || copy[index].unit || "Pcs",
        rate: product.costPrice || 0,
        batchNumber: product.batchNumber || copy[index].batchNumber || `BATCH-${new Date().getFullYear()}-01`,
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
    setItems((prev) => [...prev, createNewRow(`prow-${Date.now()}`)]);
  };

  const handleRemoveRow = (index: number) => {
    if (items.length <= 1) {
      setItems([createNewRow(`prow-${Date.now()}`)]);
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!partyName.trim()) {
      toast.error("Please enter or select supplier / vendor name");
      return;
    }
    if (items.length === 0 || (items.length === 1 && !items[0].productName.trim())) {
      toast.error("Please add at least one purchase item");
      return;
    }

    setSaving(true);
    try {
      const finalDoc: BusinessDocument = {
        id: editingDoc?.id || `pdoc-${Date.now()}`,
        organizationId: orgId,
        docType,
        documentNumber: documentNumber.trim() || `PI-${Date.now().toString().slice(-6)}`,
        referenceNumber: referenceNumber.trim() || undefined,
        partyId: selectedSupplierId || undefined,
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
        discountTotal: overallDiscountValue || 0,
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
        notes,
        created_at: editingDoc?.created_at || new Date().toISOString(),
      };

      const saved = await documentsService.saveDocument(finalDoc, user?.id);
      toast.success(`${PURCHASE_DOC_META[docType].title} recorded and inventory updated`);
      onSaved(saved);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save purchase document");
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
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-slate-800 shadow-2xs border", PURCHASE_DOC_META[docType].color)}>
                {(() => {
                  const Icon = PURCHASE_DOC_META[docType].icon;
                  return <Icon className="w-5 h-5" />;
                })()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                    {editingDoc ? `Edit ${PURCHASE_DOC_META[docType].title}` : `Create ${PURCHASE_DOC_META[docType].title}`}
                  </DialogTitle>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 font-mono font-medium border border-indigo-200 dark:border-indigo-800">
                    {documentNumber}
                  </span>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Record supplier purchase bills, inward shipments, and update inventory batches
                </DialogDescription>
              </div>
            </div>

            {/* Document Type Switcher */}
            <div className="flex items-center gap-2 mr-6">
              <Select
                value={docType}
                onValueChange={(val: any) => {
                  setDocType(val);
                  const meta = PURCHASE_DOC_META[val as PurchaseDocumentType];
                  setDocumentNumber(documentsService.getNextDocumentNumber(meta.prefix, Math.floor(Math.random() * 50) + 1));
                }}
              >
                <SelectTrigger className="h-8 text-xs font-semibold bg-background border-border/80 min-w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="purchase_invoice">Purchase Invoice</SelectItem>
                  <SelectItem value="payment_out">Payment Out</SelectItem>
                  <SelectItem value="purchase_return">Purchase Return</SelectItem>
                  <SelectItem value="debit_note">Debit Note</SelectItem>
                  <SelectItem value="purchase_order">Purchase Order</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </DialogHeader>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 scrollbar-thin">
            {/* AI Bill Uploader Banner */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 border border-orange-200 dark:border-orange-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span>AI Bill Scanner &amp; Photo Parser</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-orange-500/20 text-orange-700 dark:text-orange-300 font-semibold uppercase">Instant OCR</span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Upload purchase bill photo or PDF to auto-extract vendor, items, tax breakdown &amp; totals.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,.pdf"
                  onChange={handleBillFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isParsingBill}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 text-xs font-semibold border-orange-300 dark:border-orange-800 text-orange-800 dark:text-orange-200 hover:bg-orange-100 dark:hover:bg-orange-950 gap-1.5 shadow-2xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {isParsingBill ? "Parsing Bill..." : "Upload Bill Photo/PDF"}
                </Button>
              </div>
            </div>

            {/* Parsed Bill Preview Card (if extracted) */}
            {parsedBillData && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 animate-fade-in space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Extracted Bill Data from &quot;{parsedBillData.fileName}&quot;</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleApplyParsedBill}
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    Auto-fill Form with Extracted Data
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground pt-1">
                  <div>Vendor: <span className="font-semibold text-foreground">{parsedBillData.extractedVendor}</span></div>
                  <div>GSTIN: <span className="font-mono text-foreground">{parsedBillData.extractedGstin}</span></div>
                  <div>Bill #: <span className="font-mono text-foreground">{parsedBillData.extractedBillNo}</span></div>
                  <div>Total: <span className="font-mono font-bold text-foreground">₹{parsedBillData.extractedTotal.toFixed(2)}</span></div>
                </div>
              </div>
            )}

            {/* Supplier & Document Metadata */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Supplier Info */}
              <div className="lg:col-span-7 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/50 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                    Supplier / Vendor Details
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewSupplierDialog(true)}
                    className="h-6 px-2 text-[11px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950 font-semibold gap-1"
                  >
                    <UserPlus className="w-3 h-3" />
                    + New Supplier
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <Label className="text-[11px] text-muted-foreground">Supplier Name *</Label>
                    <Input
                      value={partyName}
                      onChange={(e) => {
                        setPartyName(e.target.value);
                        setSupplierSearch(e.target.value);
                        setShowSupplierDropdown(true);
                      }}
                      onFocus={() => setShowSupplierDropdown(true)}
                      onBlur={() => {
                        setTimeout(() => setShowSupplierDropdown(false), 200);
                      }}
                      placeholder="e.g. Metro Wholesale / Kisan Agro"
                      className="mt-1 text-xs font-medium"
                    />

                    {showSupplierDropdown && filteredSuppliers.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-h-56 overflow-y-auto p-1.5 divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredSuppliers.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectSupplier(s);
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-indigo-50/70 dark:hover:bg-indigo-950/50 transition-colors flex items-center justify-between group"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                  {s.name}
                                </span>
                                {s.gstin && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 font-mono text-muted-foreground">
                                    {s.gstin}
                                  </span>
                                )}
                              </div>
                              {s.phone && <span className="text-[11px] text-muted-foreground font-mono">Ph: {s.phone}</span>}
                              {s.address && <p className="text-[10px] text-muted-foreground/80 truncate max-w-[240px]">{s.address}</p>}
                            </div>
                            {s.balance !== undefined && s.balance > 0 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-mono font-bold shrink-0">
                                Bal: ₹{s.balance.toLocaleString("en-IN")}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-[11px] text-muted-foreground">Supplier Phone</Label>
                    <Input
                      value={partyPhone}
                      onChange={(e) => setPartyPhone(e.target.value)}
                      placeholder="10-digit mobile"
                      className="mt-1 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] text-muted-foreground">Supplier GSTIN</Label>
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

              {/* Document Meta */}
              <div className="lg:col-span-5 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/50 border border-border space-y-3">
                <Label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  Bill &amp; Terms Details
                </Label>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Internal Doc #</Label>
                    <Input
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(e.target.value)}
                      className="mt-1 text-xs font-mono font-semibold"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] text-muted-foreground">Vendor Bill / Ref #</Label>
                    <Input
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="e.g. INV-9842"
                      className="mt-1 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] text-muted-foreground">Bill Date</Label>
                    <Input
                      type="date"
                      value={docDate}
                      onChange={(e) => setDocDate(e.target.value)}
                      className="mt-1 text-xs"
                    />
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
              </div>
            </div>

            {/* Line items table */}
            <div className="rounded-xl border border-border bg-card shadow-2xs">
              <div className="p-3 bg-slate-100/70 dark:bg-slate-900/80 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Purchased Items, Stock Batches &amp; Costs
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

              {/* Table wrapper with min-h and pb-36 to prevent clipping */}
              <div className="overflow-x-auto min-h-[300px] pb-36">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/40 text-muted-foreground font-semibold text-[11px] border-b border-border">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 min-w-[320px]">Product Name</th>
                      <th className="py-2.5 px-2 w-32">Batch #</th>
                      <th className="py-2.5 px-2 w-24 text-center">Qty</th>
                      <th className="py-2.5 px-2 w-28">Unit</th>
                      <th className="py-2.5 px-3 w-32 text-right">Cost (₹)</th>
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
                            placeholder="Type product name or select..."
                            className="h-8 text-xs font-medium"
                          />

                          {activeItemDropdown === idx && (
                            <div className="absolute z-50 left-3 top-full mt-1 w-[380px] sm:w-[480px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-h-64 overflow-y-auto p-1.5 text-left divide-y divide-slate-100 dark:divide-slate-800/80">
                              <div className="p-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                                <span>Suggested Inward Items</span>
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
                                        <span className={cn("font-medium", prod.stock > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                                          Stock: {prod.stock} {prod.unit}
                                        </span>
                                        <span>MRP: ₹{prod.mrp}</span>
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <div className="font-mono font-bold text-foreground text-xs">
                                        Cost: ₹{prod.costPrice}
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
                            value={item.batchNumber || ""}
                            onChange={(e) => handleUpdateItem(idx, "batchNumber", e.target.value)}
                            placeholder={`BATCH-${new Date().getFullYear()}-01`}
                            className="h-8 text-xs font-mono"
                          />
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
                  Add Inward Item
                </Button>
                <div className="text-xs text-muted-foreground font-mono">
                  Subtotal: <span className="font-bold text-foreground">₹{totals.rawSubtotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-6 space-y-3">
                <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/50 border border-border space-y-3">
                  <Label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                    Supplier Payment
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
                          <SelectItem value="Bank Transfer">Bank Transfer / NEFT</SelectItem>
                          <SelectItem value="UPI">UPI / QR</SelectItem>
                          <SelectItem value="Cheque">Cheque</SelectItem>
                          <SelectItem value="Cash">Cash</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-[11px] text-muted-foreground">Amount Paid (₹)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(Number(e.target.value))}
                        className="mt-1 text-xs font-mono font-semibold"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] text-muted-foreground">Balance Payable (₹)</Label>
                      <div className="mt-1 h-9 px-3 py-2 rounded-md bg-muted/60 border border-input font-mono text-xs font-bold text-rose-600 flex items-center">
                        ₹{Math.max(0, totals.grandTotal - amountPaid).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-[11px] text-muted-foreground">Notes / Inward Remarks</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Receiving remarks or godown location..."
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              {/* Totals */}
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
                        <span>CGST (Input Tax Credit)</span>
                        <span className="font-mono text-foreground">₹{totals.cgstTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-1 text-muted-foreground">
                        <span>SGST (Input Tax Credit)</span>
                        <span className="font-mono text-foreground">₹{totals.sgstTotal.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between py-1 text-muted-foreground">
                      <span>IGST (Input Tax Credit)</span>
                      <span className="font-mono text-foreground">₹{totals.igstTotal.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between py-1 text-muted-foreground">
                    <span>Total Input Tax (ITC)</span>
                    <span className="font-mono font-semibold text-foreground">₹{totals.taxTotal.toFixed(2)}</span>
                  </div>

                  {totals.roundOff !== 0 && (
                    <div className="flex justify-between py-1 text-muted-foreground">
                      <span>Round Off</span>
                      <span className="font-mono text-foreground">{totals.roundOff > 0 ? `+₹${totals.roundOff}` : `-₹${Math.abs(totals.roundOff)}`}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-2 pt-3 border-t-2 border-border">
                    <span className="text-sm font-extrabold text-foreground">Total Purchase Amount (₹)</span>
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

            <Button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="text-xs h-9 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Saving..." : "Record Purchase Bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Supplier Modal */}
      <Dialog open={showNewSupplierDialog} onOpenChange={setShowNewSupplierDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              Quick Add Supplier / Vendor
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add a new supplier to vendor directory instantly
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">Supplier Name *</Label>
              <Input
                value={newSuppName}
                onChange={(e) => setNewSuppName(e.target.value)}
                placeholder="e.g. Krishna Traders"
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Phone Number</Label>
              <Input
                value={newSuppPhone}
                onChange={(e) => setNewSuppPhone(e.target.value)}
                placeholder="10-digit mobile"
                className="mt-1 text-xs font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">GSTIN</Label>
              <Input
                value={newSuppGstin}
                onChange={(e) => setNewSuppGstin(e.target.value.toUpperCase())}
                placeholder="27ABCDE1234F1Z5"
                className="mt-1 text-xs font-mono uppercase"
              />
            </div>
            <div>
              <Label className="text-xs">Address</Label>
              <Input
                value={newSuppAddress}
                onChange={(e) => setNewSuppAddress(e.target.value)}
                placeholder="City, State"
                className="mt-1 text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowNewSupplierDialog(false)} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateSupplierInline} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
              Add Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
