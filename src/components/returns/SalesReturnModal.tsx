import { useState, useEffect, useMemo, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RotateCcw,
  Search,
  Plus,
  Minus,
  Trash2,
  Save,
  Printer,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Wallet,
  Banknote,
  Package,
  PackageX,
  FileText,
  User,
  X,
  CreditCard,
  QrCode,
  Store,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import {
  BusinessDocument,
  DocumentLineItem,
  SalesDocumentType,
} from "@/types/documents";
import { documentsService } from "@/services/documentsService";
import { calculateInvoiceBreakdown } from "@/utils/invoiceCalculations";
import { ReceiptData } from "@/components/ReceiptModal";
import { cn } from "@/lib/utils";
import { useProducts, ProductCatalogOption } from "@/context/ProductsContext";

const RETURN_REASONS = [
  "Defective / Damaged Goods",
  "Expired / Near Expiry Item",
  "Wrong Item Delivered",
  "Customer Exchange / Size Issue",
  "Order Cancellation / Full Return",
  "Post-Sale Price Difference",
  "Quality Not Satisfactory",
  "Other",
];

interface ReturnItemState extends DocumentLineItem {
  selected: boolean;
  maxQty: number;
}

interface SalesReturnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  initialDocType?: SalesDocumentType;
  initialInvoice?: BusinessDocument | null;
  editingReturn?: BusinessDocument | null;
  onSaved: (doc: BusinessDocument) => void;
  onPrintRequest?: (receiptData: ReceiptData) => void;
}

export function SalesReturnModal({
  open,
  onOpenChange,
  orgId,
  initialDocType = "sales_return",
  initialInvoice = null,
  editingReturn = null,
  onSaved,
  onPrintRequest,
}: SalesReturnModalProps) {
  const { user } = useAuth();
  const { org } = useOrganization();
  const { products: productsCatalog } = useProducts();

  // Mode: "from_invoice" (Against Bill) vs "direct" (Walk-in / Direct Return)
  const [returnMode, setReturnMode] = useState<"from_invoice" | "direct">("from_invoice");

  // Invoices list for lookup
  const [invoices, setInvoices] = useState<BusinessDocument[]>([]);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<BusinessDocument | null>(null);

  // Return Document Details
  const [returnNumber, setReturnNumber] = useState("");
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split("T")[0]);
  const [docType] = useState<SalesDocumentType>(
    initialDocType === "credit_note" ? "credit_note" : "sales_return"
  );

  // Original Invoice Ref
  const [originalInvoiceNumber, setOriginalInvoiceNumber] = useState("");
  const [originalInvoiceDate, setOriginalInvoiceDate] = useState("");
  const [originalSaleId, setOriginalSaleId] = useState<string | undefined>(undefined);

  // Customer State
  const [partyId, setPartyId] = useState<string | undefined>(undefined);
  const [partyName, setPartyName] = useState("Walk-in Customer");
  const [partyPhone, setPartyPhone] = useState("");
  const [partyGstin, setPartyGstin] = useState("");
  const [partyAddress, setPartyAddress] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("27-Maharashtra");

  // Return Disposition & Settlement
  const [overallReason, setOverallReason] = useState("Defective / Damaged Goods");
  const [returnAction, setReturnAction] = useState<"return_to_stock" | "scrap_damaged">("return_to_stock");
  const [settlementMode, setSettlementMode] = useState<"store_credit" | "cash_refund" | "upi_refund" | "bank_refund">("store_credit");
  const [notes, setNotes] = useState("");

  // Line items
  const [lineItems, setLineItems] = useState<ReturnItemState[]>([]);

  // Direct Return Product Search
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Loading & saving
  const [saving, setSaving] = useState(false);

  // Generate Return Number
  const generateReturnNumber = useCallback(() => {
    const prefix = docType === "credit_note" ? "CN" : "SR";
    const year = new Date().getFullYear().toString().slice(-2);
    const nextYear = (new Date().getFullYear() + 1).toString().slice(-2);
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}/${year}-${nextYear}/${randomSeq}`;
  }, [docType]);

  // Load past invoices for invoice-linked returns
  const loadPastInvoices = useCallback(async () => {
    if (!orgId) return;
    try {
      const sales = await documentsService.fetchSalesDocuments(orgId, "sales_invoice");
      setInvoices(sales);
    } catch (e) {
      console.warn("Failed to load past invoices:", e);
    }
  }, [orgId]);

  useEffect(() => {
    if (open) {
      loadPastInvoices();
    }
  }, [open, loadPastInvoices]);

  // Handle invoice selection
  const handleSelectInvoice = useCallback((inv: BusinessDocument) => {
    setSelectedInvoice(inv);
    setOriginalSaleId(inv.id);
    setOriginalInvoiceNumber(inv.documentNumber);
    setOriginalInvoiceDate(inv.docDate);
    setPartyId(inv.partyId);
    setPartyName(inv.partyName || "Walk-in Customer");
    setPartyPhone(inv.partyPhone || "");
    setPartyGstin(inv.partyGstin || "");
    setPartyAddress(inv.partyAddress || "");
    setPlaceOfSupply(inv.placeOfSupply || "27-Maharashtra");

    // Map line items from invoice
    if (inv.items && inv.items.length > 0) {
      const mapped: ReturnItemState[] = inv.items.map((it) => ({
        ...it,
        selected: true,
        maxQty: it.quantity,
        quantity: it.quantity, // Default to returning the full quantity
        returnReason: overallReason,
      }));
      setLineItems(mapped);
    } else {
      setLineItems([]);
    }
    setShowInvoiceDropdown(false);
  }, [overallReason]);

  // Reset or populate modal upon open/props change
  useEffect(() => {
    if (!open) return;

    if (editingReturn) {
      // Editing existing return
      setReturnNumber(editingReturn.documentNumber);
      setReturnDate(editingReturn.docDate);
      setOriginalInvoiceNumber(editingReturn.originalInvoiceNumber || editingReturn.referenceNumber || "");
      setOriginalInvoiceDate(editingReturn.originalInvoiceDate || "");
      setOriginalSaleId(editingReturn.convertedFromId);
      setPartyId(editingReturn.partyId);
      setPartyName(editingReturn.partyName);
      setPartyPhone(editingReturn.partyPhone || "");
      setPartyGstin(editingReturn.partyGstin || "");
      setPartyAddress(editingReturn.partyAddress || "");
      setPlaceOfSupply(editingReturn.placeOfSupply || "27-Maharashtra");
      setOverallReason(editingReturn.returnReason || "Defective / Damaged Goods");
      setReturnAction(editingReturn.returnAction || "return_to_stock");
      setSettlementMode(
        (editingReturn.settlementMode as "store_credit" | "cash_refund" | "upi_refund" | "bank_refund") || "store_credit"
      );
      setNotes(editingReturn.notes || "");
      setReturnMode(editingReturn.originalInvoiceNumber ? "from_invoice" : "direct");

      const mapped: ReturnItemState[] = (editingReturn.items || []).map((it) => ({
        ...it,
        selected: true,
        maxQty: it.quantity * 2,
        returnReason: it.returnReason || editingReturn.returnReason || "Defective / Damaged Goods",
      }));
      setLineItems(mapped);
    } else if (initialInvoice) {
      // Creating return from a specific invoice
      setReturnNumber(generateReturnNumber());
      setReturnDate(new Date().toISOString().split("T")[0]);
      setReturnMode("from_invoice");
      handleSelectInvoice(initialInvoice);
    } else {
      // Fresh new return
      setReturnNumber(generateReturnNumber());
      setReturnDate(new Date().toISOString().split("T")[0]);
      setSelectedInvoice(null);
      setOriginalSaleId(undefined);
      setOriginalInvoiceNumber("");
      setOriginalInvoiceDate("");
      setPartyId(undefined);
      setPartyName("Walk-in Customer");
      setPartyPhone("");
      setPartyGstin("");
      setPartyAddress("");
      setPlaceOfSupply("27-Maharashtra");
      setOverallReason("Defective / Damaged Goods");
      setReturnAction("return_to_stock");
      setSettlementMode("store_credit");
      setNotes("");
      setLineItems([]);
    }
  }, [open, editingReturn, initialInvoice, generateReturnNumber, handleSelectInvoice]);

  // Toggle item selection
  const handleToggleItemSelection = (index: number) => {
    setLineItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, selected: !it.selected } : it))
    );
  };

  // Toggle Select All
  const handleToggleSelectAll = () => {
    const allSelected = lineItems.every((it) => it.selected);
    setLineItems((prev) => prev.map((it) => ({ ...it, selected: !allSelected })));
  };

  // Update item quantity
  const handleQtyChange = (index: number, newQty: number) => {
    setLineItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== index) return it;
        const clamped = Math.max(0.01, Math.min(newQty, it.maxQty || 99999));
        return { ...it, quantity: clamped };
      })
    );
  };

  // Update item return reason
  const handleItemReasonChange = (index: number, reason: string) => {
    setLineItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, returnReason: reason } : it))
    );
  };

  // Remove item row (direct mode)
  const handleRemoveItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Add product from catalog (direct mode)
  const handleAddCatalogProduct = (prod: ProductCatalogOption & { hsn?: string }) => {
    const batch = prod.product_batches?.[0];
    const rate = Number(prod.selling_price || prod.sellingPrice || batch?.mrp || 0);
    const taxRate = Number(prod.tax_rate || prod.gstRate || 0);

    const newItem: ReturnItemState = {
      id: `ret_it_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      productId: prod.id,
      productName: prod.name,
      barcode: prod.barcode || undefined,
      hsn: prod.hsn || undefined,
      batchNumber: batch?.batch_number || "BATCH-01",
      quantity: 1,
      maxQty: 99999,
      unit: prod.unit || "PCS",
      rate: rate,
      discountPercent: 0,
      discountAmount: 0,
      taxRate: taxRate,
      taxableAmount: rate,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      lineTotal: rate,
      selected: true,
      returnReason: overallReason,
    };

    setLineItems((prev) => [...prev, newItem]);
    setProductSearchQuery("");
    setShowProductDropdown(false);
  };

  // Filtered invoices for search
  const filteredInvoices = useMemo(() => {
    if (!invoiceSearch.trim()) return invoices.slice(0, 15);
    const q = invoiceSearch.toLowerCase().trim();
    return invoices.filter(
      (inv) =>
        inv.documentNumber.toLowerCase().includes(q) ||
        inv.partyName.toLowerCase().includes(q) ||
        (inv.partyPhone && inv.partyPhone.includes(q)) ||
        inv.docDate.includes(q)
    );
  }, [invoices, invoiceSearch]);

  // Filtered products for direct search
  const filteredCatalogProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return [];
    const q = productSearchQuery.toLowerCase().trim();
    return (productsCatalog || [])
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q))
      )
      .slice(0, 10);
  }, [productsCatalog, productSearchQuery]);

  // Calculate totals for selected items
  const isInterState = useMemo(() => {
    const storeStateCode = (org?.gstin || "27").slice(0, 2);
    const partyStateCode = (partyGstin || placeOfSupply || "27").slice(0, 2);
    return storeStateCode !== partyStateCode;
  }, [org?.gstin, partyGstin, placeOfSupply]);

  const selectedItems = useMemo(() => {
    return lineItems.filter((it) => it.selected);
  }, [lineItems]);

  const breakdown = useMemo(() => {
    return calculateInvoiceBreakdown({
      items: selectedItems.map((it) => ({
        quantity: it.quantity,
        rate: it.rate,
        discountPercent: it.discountPercent,
        discountAmount: it.discountAmount,
        taxRate: it.taxRate,
      })),
      overallDiscountType: "flat",
      overallDiscountValue: 0,
      autoRoundOff: true,
      manualRoundOff: 0,
      isInterState,
    });
  }, [selectedItems, isInterState]);

  // Save Return
  const handleSave = async (andPrint = false) => {
    if (selectedItems.length === 0) {
      toast.error("Please select at least one item to return");
      return;
    }

    if (!returnNumber.trim()) {
      toast.error("Return number is required");
      return;
    }

    setSaving(true);
    try {
      // Re-map line items with recalculated tax breakdown
      const finalizedItems: DocumentLineItem[] = selectedItems.map((it, idx) => {
        const calc = breakdown.items[idx];
        return {
          id: it.id || `ret_item_${Date.now()}_${idx}`,
          productId: it.productId,
          productName: it.productName,
          barcode: it.barcode,
          hsn: it.hsn,
          batchNumber: it.batchNumber || "BATCH-01",
          quantity: it.quantity,
          unit: it.unit || "PCS",
          altUnit: it.altUnit,
          altQty: it.altQty,
          altUnitConversion: it.altUnitConversion,
          rate: it.rate,
          taxRate: it.taxRate,
          discountPercent: it.discountPercent,
          discountAmount: it.discountAmount,
          taxableAmount: calc?.taxableAmount ?? it.rate * it.quantity,
          cgstAmount: calc?.cgstAmount ?? 0,
          sgstAmount: calc?.sgstAmount ?? 0,
          igstAmount: calc?.igstAmount ?? 0,
          lineTotal: calc?.lineTotal ?? it.rate * it.quantity,
          returnReason: it.returnReason || overallReason,
        };
      });

      const returnDoc: BusinessDocument = {
        id: editingReturn?.id || `sr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        organizationId: orgId,
        docType: docType,
        documentNumber: returnNumber.trim(),
        referenceNumber: originalInvoiceNumber || undefined,
        originalInvoiceNumber: originalInvoiceNumber || undefined,
        originalInvoiceDate: originalInvoiceDate || undefined,
        convertedFromId: originalSaleId,
        convertedFromType: originalSaleId ? "sales_invoice" : undefined,
        returnReason: overallReason,
        returnAction: returnAction,
        settlementMode: settlementMode,
        partyId: partyId,
        partyName: partyName || "Walk-in Customer",
        partyPhone: partyPhone || undefined,
        partyGstin: partyGstin || undefined,
        partyAddress: partyAddress || undefined,
        placeOfSupply: placeOfSupply || "27-Maharashtra",
        docDate: returnDate,
        items: finalizedItems,
        subtotal: breakdown.subtotal,
        discountTotal: breakdown.discountTotal,
        taxableTotal: breakdown.taxableBase,
        cgstTotal: breakdown.cgstTotal,
        sgstTotal: breakdown.sgstTotal,
        igstTotal: breakdown.igstTotal,
        taxTotal: breakdown.taxTotal,
        roundOff: breakdown.roundOff,
        grandTotal: breakdown.grandTotal,
        paidAmount: breakdown.grandTotal,
        balanceDue: 0,
        status: "paid",
        paymentMethod: settlementMode === "store_credit" ? "Store Credit" : settlementMode === "cash_refund" ? "Cash" : "UPI",
        notes: notes.trim(),
        created_at: editingReturn?.created_at || new Date().toISOString(),
      };

      const saved = await documentsService.saveDocument(returnDoc, user?.id);

      toast.success(
        returnAction === "return_to_stock"
          ? "Sales Return saved — inventory restocked & account updated!"
          : "Sales Return saved as scrap / write-off!"
      );

      onSaved(saved);
      onOpenChange(false);

      if (andPrint && onPrintRequest) {
        const receiptData: ReceiptData = {
          invoiceNumber: saved.documentNumber,
          referenceNumber: saved.referenceNumber,
          originalInvoiceNumber: saved.originalInvoiceNumber,
          originalInvoiceDate: saved.originalInvoiceDate,
          returnReason: saved.returnReason,
          settlementMode: saved.settlementMode,
          docType: docType === "credit_note" ? "credit_note" : "sales_return",
          customerName: saved.partyName,
          customerPhone: saved.partyPhone,
          partyGstin: saved.partyGstin,
          partyAddress: saved.partyAddress,
          storeName: org?.name || "CredSmart Store",
          storeAddress: org?.address,
          storePhone: org?.phone,
          gstin: org?.gstin,
          subtotal: saved.subtotal,
          discountAmount: saved.discountTotal,
          discountLabel: "Discount",
          tax: saved.taxTotal,
          total: saved.grandTotal,
          roundOff: saved.roundOff,
          paymentMethod: saved.paymentMethod || "Store Credit",
          date: saved.docDate,
          notes: saved.notes,
          items: saved.items.map((it) => ({
            product: {
              name: it.productName,
              unit: it.unit,
              hsn: it.hsn,
              gstRate: it.taxRate,
            },
            quantity: it.quantity,
            batch: {
              mrp: it.rate,
              batchNumber: it.batchNumber,
              costPrice: it.rate,
            },
          })),
        };
        onPrintRequest(receiptData);
      }
    } catch (err) {
      console.error("Failed to save return:", err);
      toast.error("Failed to save Sales Return");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[96vw] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background text-foreground border border-border shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 border-b border-border/80 bg-muted/40 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                  <span>Create {docType === "credit_note" ? "Credit Note" : "Sales Return"}</span>
                  <Badge variant="outline" className="text-[10px] font-mono uppercase bg-amber-500/10 text-amber-600 border-amber-500/30">
                    GST Sec 34
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Process full or partial item returns, restock inventory, and issue store credit or refunds.
                </DialogDescription>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center bg-muted p-1 rounded-xl border border-border/80 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setReturnMode("from_invoice")}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                  returnMode === "from_invoice"
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>From Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => setReturnMode("direct")}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                  returnMode === "direct"
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Direct Return</span>
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin">
          {/* Top Row: Return Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/70 text-xs">
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                Return Number
              </Label>
              <Input
                value={returnNumber}
                onChange={(e) => setReturnNumber(e.target.value)}
                placeholder="SR/26-27/001"
                className="h-9 font-mono font-bold text-xs"
              />
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                Return Date
              </Label>
              <div className="relative">
                <Input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="h-9 text-xs"
                />
                <Calendar className="w-3.5 h-3.5 absolute right-2.5 top-3 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                Overall Reason
              </Label>
              <Select value={overallReason} onValueChange={setOverallReason}>
                <SelectTrigger className="h-9 text-xs font-medium">
                  <SelectValue placeholder="Select Reason" />
                </SelectTrigger>
                <SelectContent>
                  {RETURN_REASONS.map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mode A: Select From Past Invoice */}
          {returnMode === "from_invoice" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  1. Link Original Sales Invoice
                </Label>
                {selectedInvoice && (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Linked to {selectedInvoice.documentNumber}
                  </span>
                )}
              </div>

              <div className="relative">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <Input
                    value={invoiceSearch}
                    onChange={(e) => {
                      setInvoiceSearch(e.target.value);
                      setShowInvoiceDropdown(true);
                    }}
                    onFocus={() => setShowInvoiceDropdown(true)}
                    placeholder="Search past invoices by Invoice #, Customer Name, Phone..."
                    className="h-10 pl-9 text-xs font-medium"
                  />
                  {invoiceSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setInvoiceSearch("");
                        setShowInvoiceDropdown(false);
                      }}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdown Results */}
                {showInvoiceDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 max-h-60 overflow-y-auto rounded-xl bg-popover border border-border shadow-xl z-20 divide-y divide-border/50 text-xs">
                    {filteredInvoices.length > 0 ? (
                      filteredInvoices.map((inv) => (
                        <div
                          key={inv.id}
                          onClick={() => handleSelectInvoice(inv)}
                          className="p-3 hover:bg-muted/60 cursor-pointer transition-colors flex items-center justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-foreground">
                                {inv.documentNumber}
                              </span>
                              <Badge variant="outline" className="text-[10px]">
                                {inv.docDate}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {inv.partyName} {inv.partyPhone ? `• ${inv.partyPhone}` : ""}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-foreground">
                              ₹ {inv.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                            <div className="text-[10px] text-muted-foreground">
                              {inv.items?.length || 0} items
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-muted-foreground text-xs">
                        No sales invoices found matching &quot;{invoiceSearch}&quot;
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Party Details Card */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-muted-foreground text-[10px] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Customer / Party Details
              </span>
              {originalInvoiceNumber && (
                <span className="font-mono text-[11px] text-muted-foreground">
                  Original Invoice: <strong>{originalInvoiceNumber}</strong> ({originalInvoiceDate})
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div>
                <Label className="text-[10px] text-muted-foreground">Party Name</Label>
                <Input
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder="Customer Name"
                  className="h-8 text-xs font-semibold"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Phone</Label>
                <Input
                  value={partyPhone}
                  onChange={(e) => setPartyPhone(e.target.value)}
                  placeholder="9876543210"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">GSTIN</Label>
                <Input
                  value={partyGstin}
                  onChange={(e) => setPartyGstin(e.target.value.toUpperCase())}
                  placeholder="27AAPFU0939F1ZV"
                  className="h-8 text-xs font-mono uppercase"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Place of Supply</Label>
                <Input
                  value={placeOfSupply}
                  onChange={(e) => setPlaceOfSupply(e.target.value)}
                  placeholder="27-Maharashtra"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Direct Return Product Adder (Direct Mode only) */}
          {returnMode === "direct" && (
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Add Items From Product Catalog
              </Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  value={productSearchQuery}
                  onChange={(e) => {
                    setProductSearchQuery(e.target.value);
                    setShowProductDropdown(true);
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  placeholder="Search products by Name, Barcode, Category..."
                  className="h-9 pl-9 text-xs"
                />
                {showProductDropdown && filteredCatalogProducts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-xl bg-popover border border-border shadow-xl z-20 divide-y divide-border/50 text-xs">
                    {filteredCatalogProducts.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleAddCatalogProduct(p)}
                        className="p-2.5 hover:bg-muted/60 cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-foreground">{p.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {p.barcode ? `Barcode: ${p.barcode} • ` : ""}Unit: {p.unit || "PCS"}
                          </div>
                        </div>
                        <div className="text-right font-mono font-bold text-foreground">
                          ₹ {(p.selling_price || 0).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Returned Items ({selectedItems.length}/{lineItems.length} selected)
                </Label>
                {lineItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {lineItems.every((it) => it.selected) ? "Deselect All" : "Select All"}
                  </button>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground">
                Set quantity and reason for each returned item
              </span>
            </div>

            {lineItems.length > 0 ? (
              <div className="border border-border/80 rounded-xl overflow-hidden divide-y divide-border/60 bg-card">
                {lineItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className={cn(
                      "p-3 sm:p-4 transition-colors",
                      item.selected ? "bg-muted/20" : "bg-muted/5 opacity-60"
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Checkbox & Product Info */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <Checkbox
                          checked={item.selected}
                          onCheckedChange={() => handleToggleItemSelection(idx)}
                          className="mt-1"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs sm:text-sm text-foreground truncate">
                            {item.productName}
                          </h4>
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground mt-0.5">
                            {item.batchNumber && (
                              <span className="font-mono font-medium">
                                Batch: {item.batchNumber}
                              </span>
                            )}
                            {item.hsn && <span>HSN: {item.hsn}</span>}
                            <span>GST: {item.taxRate}%</span>
                            {item.maxQty < 9999 && (
                              <span className="text-amber-600 dark:text-amber-400 font-medium">
                                (Sold: {item.maxQty} {item.unit})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Quantity Controls, Rate, & Line Total */}
                      <div className="flex items-center gap-3 sm:gap-4 shrink-0 pl-7 sm:pl-0">
                        {/* Qty Adjuster */}
                        <div className="flex items-center border border-border rounded-lg bg-background overflow-hidden h-8 shadow-2xs">
                          <button
                            type="button"
                            disabled={!item.selected || item.quantity <= 1}
                            onClick={() => handleQtyChange(idx, item.quantity - 1)}
                            className="w-7 h-full flex items-center justify-center hover:bg-muted text-muted-foreground disabled:opacity-40"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            disabled={!item.selected}
                            value={item.quantity}
                            onChange={(e) => handleQtyChange(idx, parseFloat(e.target.value) || 1)}
                            className="w-12 text-center text-xs font-mono font-bold bg-transparent border-none focus:outline-none"
                            min="0.01"
                            max={item.maxQty}
                          />
                          <button
                            type="button"
                            disabled={!item.selected || (item.maxQty && item.quantity >= item.maxQty)}
                            onClick={() => handleQtyChange(idx, item.quantity + 1)}
                            className="w-7 h-full flex items-center justify-center hover:bg-muted text-muted-foreground disabled:opacity-40"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Unit Rate */}
                        <div className="text-right w-20">
                          <div className="text-[10px] text-muted-foreground">Rate</div>
                          <div className="text-xs font-mono font-semibold text-foreground">
                            ₹ {Number(item.rate ?? 0).toFixed(2)}
                          </div>
                        </div>

                        {/* Line Total */}
                        <div className="text-right w-24">
                          <div className="text-[10px] text-muted-foreground">Refund</div>
                          <div className="text-xs sm:text-sm font-mono font-bold text-amber-600 dark:text-amber-400">
                            ₹ {(Number(item.rate ?? 0) * Number(item.quantity ?? 0)).toFixed(2)}
                          </div>
                        </div>

                        {/* Direct mode delete button */}
                        {returnMode === "direct" && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-muted-foreground hover:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Item Specific Return Reason Dropdown */}
                    {item.selected && (
                      <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center gap-2 pl-7">
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          Item Reason:
                        </span>
                        <select
                          value={item.returnReason || overallReason}
                          onChange={(e) => handleItemReasonChange(idx, e.target.value)}
                          className="text-[11px] bg-background border border-border rounded px-2 py-0.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {RETURN_REASONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center border-2 border-dashed border-border/80 rounded-2xl bg-muted/10 space-y-2">
                <RotateCcw className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <p className="text-sm font-semibold text-muted-foreground">
                  {returnMode === "from_invoice"
                    ? "Select an invoice above to view its sold items"
                    : "No items added yet. Search and add products from the catalog."}
                </p>
              </div>
            )}
          </div>

          {/* Disposition & Settlement Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Inventory Action */}
            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2.5 text-xs">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                Stock Action
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReturnAction("return_to_stock")}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col gap-1",
                    returnAction === "return_to_stock"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs"
                      : "border-border/80 hover:bg-muted text-muted-foreground"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Restock Inventory</span>
                  </div>
                  <span className="text-[10px] font-normal opacity-80">
                    Add items back to active stock/batches
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setReturnAction("scrap_damaged")}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col gap-1",
                    returnAction === "scrap_damaged"
                      ? "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-bold shadow-xs"
                      : "border-border/80 hover:bg-muted text-muted-foreground"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <PackageX className="w-3.5 h-3.5 text-rose-600" />
                    <span>Damaged / Scrap</span>
                  </div>
                  <span className="text-[10px] font-normal opacity-80">
                    Write off items; do NOT restock
                  </span>
                </button>
              </div>
            </div>

            {/* Settlement Mode */}
            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2.5 text-xs">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" />
                Refund / Settlement Method
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSettlementMode("store_credit")}
                  className={cn(
                    "p-2.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-1",
                    settlementMode === "store_credit"
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-bold shadow-xs"
                      : "border-border/80 hover:bg-muted text-muted-foreground"
                  )}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Store Credit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettlementMode("cash_refund")}
                  className={cn(
                    "p-2.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-1",
                    settlementMode === "cash_refund"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs"
                      : "border-border/80 hover:bg-muted text-muted-foreground"
                  )}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Cash Refund</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettlementMode("upi_refund")}
                  className={cn(
                    "p-2.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-1",
                    settlementMode === "upi_refund"
                      ? "border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold shadow-xs"
                      : "border-border/80 hover:bg-muted text-muted-foreground"
                  )}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span className="text-[11px]">UPI / Online</span>
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {settlementMode === "store_credit" && "Credits the customer's khata ledger; reduces pending customer balance."}
                {settlementMode === "cash_refund" && "Returns cash directly to the customer; customer ledger is not touched."}
                {settlementMode === "upi_refund" && "Refunds via UPI / Bank transfer; customer ledger is not touched."}
              </p>
            </div>
          </div>

          {/* Notes / Remarks */}
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
              Notes / Remarks (Optional)
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any internal return notes or customer comments..."
              className="text-xs h-16"
            />
          </div>
        </div>

        {/* Footer Financial Breakdown & Action Buttons */}
        <div className="p-4 sm:p-5 border-t border-border bg-muted/30 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Financial Breakdown */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs w-full sm:w-auto">
            <div>
              <span className="text-muted-foreground">Items:</span>{" "}
              <strong className="text-foreground">{selectedItems.length}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">Taxable:</span>{" "}
              <strong className="font-mono text-foreground">₹ {Number(breakdown.taxableBase ?? 0).toFixed(2)}</strong>
            </div>
            {breakdown.taxTotal > 0 && (
              <div>
                <span className="text-muted-foreground">GST:</span>{" "}
                <strong className="font-mono text-foreground">₹ {Number(breakdown.taxTotal ?? 0).toFixed(2)}</strong>
              </div>
            )}
            <div className="text-sm">
              <span className="text-muted-foreground">Total Refund:</span>{" "}
              <strong className="font-mono font-black text-amber-600 dark:text-amber-400 text-base">
                ₹ {breakdown.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs font-semibold h-10 px-4"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving || selectedItems.length === 0}
              onClick={() => handleSave(false)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-10 px-4 gap-1.5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? "Saving..." : "Save Return"}</span>
            </Button>
            <Button
              type="button"
              disabled={saving || selectedItems.length === 0}
              onClick={() => handleSave(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold h-10 px-4 gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Save & Print Slip</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
