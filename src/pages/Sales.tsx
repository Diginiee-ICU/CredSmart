import { useState, useEffect, useCallback, useMemo } from "react";
import { usePagination } from "@/hooks/usePagination";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Search,
  ChevronDown,
  Calendar as CalendarIcon,
  Filter,
  FileSpreadsheet,
  Settings,
  Keyboard,
  Plus,
  ArrowUpDown,
  Download,
  Printer,
  Trash2,
  Share2,
  FileText,
  Receipt,
  Wallet,
  RotateCcw,
  FileCheck,
  Truck,
  HelpCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  MoreVertical,
  ArrowRightLeft,
  Eye,
  Sparkles,
  Layers,
  X,
} from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { shareInvoicePdfToWhatsApp, downloadInvoicePdf } from "@/utils/whatsappPdfShare";
import { downloadExactInvoicePdf } from "@/utils/downloadExactInvoice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { cn, exportToCSV } from "@/lib/utils";
import {
  BusinessDocument,
  SalesDocumentType,
  DocumentStatus,
} from "@/types/documents";
import { documentsService } from "@/services/documentsService";
import { SalesInvoiceModal } from "@/components/SalesInvoiceModal";
import { SalesSettingsModal } from "@/components/SalesSettingsModal";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";
import { ReceiptModal, ReceiptData } from "@/components/ReceiptModal";
import { GenerateEwayBillModal } from "@/components/eway/GenerateEwayBillModal";
import { EwayBillPrintSlip } from "@/components/eway/EwayBillPrintSlip";
import { ewayBillService } from "@/services/ewayBillService";
import { EwayBillRecord } from "@/types/ewayBill";
import { SalesReturnModal } from "@/components/returns/SalesReturnModal";
import { UniversalDocType } from "@/components/invoices/UnifiedInvoiceRenderer";

export type { ReceiptData };

const TABS: { id: SalesDocumentType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "sales_invoice", label: "Sales Invoices", icon: Receipt },
  { id: "quotation", label: "Quotation / Estimate", icon: FileText },
  { id: "payment_in", label: "Payment In", icon: Wallet },
  { id: "sales_return", label: "Sales Return", icon: RotateCcw },
  { id: "credit_note", label: "Credit Note", icon: FileCheck },
  { id: "delivery_challan", label: "Delivery Challan", icon: Truck },
  { id: "proforma_invoice", label: "Proforma Invoice", icon: FileText },
];

const DATE_PRESETS = [
  { label: "Today", days: 0 },
  { label: "Yesterday", days: 1 },
  { label: "This Week", days: 7 },
  { label: "This Month", days: 30 },
  { label: "Last 365 Days", days: 365 },
  { label: "All Time", days: 9999 },
];

export default function Sales() {
  const { org, orgId } = useOrganization();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab / Sub-view
  const tabParam = searchParams.get("tab") as SalesDocumentType | null;
  const activeTab: SalesDocumentType =
    tabParam && TABS.some((t) => t.id === tabParam) ? tabParam : "sales_invoice";

  const setActiveTab = (tab: SalesDocumentType) => {
    setSearchParams({ tab });
  };

  // State
  const [documents, setDocuments] = useState<BusinessDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("Last 365 Days");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<"docDate" | "grandTotal" | "documentNumber" | "partyName" | "status">("docDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  const handleSort = (field: "docDate" | "grandTotal" | "documentNumber" | "partyName" | "status") => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const handleDatePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    const found = DATE_PRESETS.find((p) => p.label === preset);
    if (found) {
      if (found.days === 9999) {
        setDateRange({});
      } else {
        const to = new Date();
        const from = new Date(Date.now() - found.days * 24 * 60 * 60 * 1000);
        setDateRange({ from, to });
      }
    }
  };

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<BusinessDocument | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  // E-Way Bill Modals
  const [ewayModalOpen, setEwayModalOpen] = useState(false);
  const [ewaySlipOpen, setEwaySlipOpen] = useState(false);
  const [selectedEwayDoc, setSelectedEwayDoc] = useState<BusinessDocument | null>(null);
  const [selectedEwayRecord, setSelectedEwayRecord] = useState<EwayBillRecord | null>(null);

  // Sales Return Modals
  const [salesReturnModalOpen, setSalesReturnModalOpen] = useState(false);
  const [selectedReturnInvoice, setSelectedReturnInvoice] = useState<BusinessDocument | null>(null);
  const [editingReturnDoc, setEditingReturnDoc] = useState<BusinessDocument | null>(null);

  // Auto-open return modal if navigated with new=1 on sales_return or credit_note
  useEffect(() => {
    if (searchParams.get("new") === "1" && (activeTab === "sales_return" || activeTab === "credit_note")) {
      setSelectedReturnInvoice(null);
      setEditingReturnDoc(null);
      setSalesReturnModalOpen(true);
    }
  }, [searchParams, activeTab]);

  const handleOpenEway = (doc: BusinessDocument) => {
    setSelectedEwayDoc(doc);
    if (orgId) {
      const existing = ewayBillService.getEwayBills(orgId).find(
        (b) =>
          b.docNo === doc.documentNumber ||
          b.invoiceId === doc.id ||
          (doc.referenceNumber && b.ewayBillNo === doc.referenceNumber)
      );
      if (existing) {
        setSelectedEwayRecord(existing);
        setEwaySlipOpen(true);
        return;
      }
    }
    setEwayModalOpen(true);
  };

  // Fetch Documents
  const loadDocuments = useCallback(async () => {
    if (!orgId) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await documentsService.fetchSalesDocuments(orgId, activeTab);
      setDocuments(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [orgId, activeTab]);

  useEffect(() => {
    loadDocuments();
    setSelectedDocIds(new Set());

    const handleReload = () => {
      loadDocuments();
    };

    window.addEventListener("credsmart_documents_updated", handleReload);
    window.addEventListener("credsmart_network_update", handleReload);
    return () => {
      window.removeEventListener("credsmart_documents_updated", handleReload);
      window.removeEventListener("credsmart_network_update", handleReload);
    };
  }, [loadDocuments]);

  // Global Keyboard Shortcuts (Alt+N, F4, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setEditingDoc(null);
        setCreateModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filter & Sort Documents
  const filteredDocuments = useMemo(() => {
    return documents
      .filter((doc) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matches =
            doc.documentNumber.toLowerCase().includes(q) ||
            doc.partyName.toLowerCase().includes(q) ||
            (doc.partyPhone && doc.partyPhone.includes(q)) ||
            (doc.partyGstin && doc.partyGstin.toLowerCase().includes(q));
          if (!matches) return false;
        }

        // Status filter
        if (statusFilter !== "all" && doc.status !== statusFilter) {
          return false;
        }

        // Date range
        if (dateRange.from && doc.docDate) {
          const docTime = new Date(doc.docDate).getTime();
          const fromTime = new Date(dateRange.from).setHours(0, 0, 0, 0);
          if (docTime < fromTime) return false;
        }
        if (dateRange.to && doc.docDate) {
          const docTime = new Date(doc.docDate).getTime();
          const toTime = new Date(dateRange.to).setHours(23, 59, 59, 999);
          if (docTime > toTime) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === "docDate") {
          const timeA = new Date(a.docDate).getTime() || 0;
          const timeB = new Date(b.docDate).getTime() || 0;
          cmp = timeA - timeB;
        } else if (sortField === "grandTotal") {
          cmp = (Number(a.grandTotal) || 0) - (Number(b.grandTotal) || 0);
        } else if (sortField === "documentNumber") {
          cmp = (a.documentNumber || "").localeCompare(b.documentNumber || "");
        } else if (sortField === "partyName") {
          cmp = (a.partyName || "").localeCompare(b.partyName || "");
        } else if (sortField === "status") {
          cmp = (a.status || "").localeCompare(b.status || "");
        }
        return sortOrder === "asc" ? cmp : -cmp;
      });
  }, [documents, searchQuery, statusFilter, dateRange, sortField, sortOrder]);

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    paginatedItems: paginatedDocs,
    totalPages,
    totalItems: totalDocCount,
    startIndex,
    endIndex,
    hasNext,
    hasPrev,
  } = usePagination(filteredDocuments, 25);

  // Metrics
  const metrics = useMemo(() => {
    return documentsService.calculateMetrics(filteredDocuments);
  }, [filteredDocuments]);

  // Bulk Actions
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDocIds(new Set(filteredDocuments.map((d) => d.id)));
    } else {
      setSelectedDocIds(new Set());
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExportCSV = () => {
    const rows = [
      ["Date", "Document Number", "Document Type", "Party Name", "Phone", "GSTIN", "Taxable", "Tax", "Grand Total", "Paid", "Balance Due", "Status"],
      ...filteredDocuments.map((d) => [
        d.docDate,
        d.documentNumber,
        d.docType,
        d.partyName,
        d.partyPhone || "",
        d.partyGstin || "",
        d.taxableTotal,
        d.taxTotal,
        d.grandTotal,
        d.paidAmount,
        d.balanceDue,
        d.status,
      ]),
    ];
    exportToCSV(`Sales_${activeTab}_${new Date().toISOString().split("T")[0]}.csv`, rows);
    toast.success("Sales transactions exported to CSV");
  };

  const handleDeleteDocument = async (doc: BusinessDocument) => {
    if (!orgId) return;
    if (confirm(`Are you sure you want to delete ${doc.documentNumber}?`)) {
      await documentsService.deleteDocument(orgId, doc.docType, doc.id);
      toast.success(`${doc.documentNumber} deleted`);
      loadDocuments();
    }
  };

  const handleTogglePaymentStatus = async (doc: BusinessDocument, newStatus: "paid" | "unpaid" | "partial") => {
    if (!orgId) return;
    const paidAmount = newStatus === "paid" ? doc.grandTotal : 0;
    const balanceDue = newStatus === "paid" ? 0 : doc.grandTotal;
    const updatedDoc: BusinessDocument = {
      ...doc,
      status: newStatus,
      paidAmount,
      balanceDue,
    };
    await documentsService.saveDocument(updatedDoc, user?.id);
    toast.success(`Invoice ${doc.documentNumber} marked as ${newStatus.toUpperCase()}`);
    loadDocuments();
  };

  const handleDuplicate = (doc: BusinessDocument) => {
    const duplicated: BusinessDocument = {
      ...doc,
      id: "",
      documentNumber: "",
      docDate: new Date().toISOString().split("T")[0],
      dueDate: undefined,
      status: "paid",
      paidAmount: doc.grandTotal,
      balanceDue: 0,
      createdAt: undefined,
      updatedAt: undefined,
    };
    setEditingDoc(duplicated);
    setCreateModalOpen(true);
  };

  const handleDownloadPdf = (doc: BusinessDocument) => {
    downloadExactInvoicePdf({
      invoiceNumber: doc.documentNumber,
      docType: doc.docType as UniversalDocType,
      customerName: doc.partyName,
      customerPhone: doc.partyPhone,
      storeName: org?.name || "CredSmart Store",
      storePhone: org?.phone,
      totalAmount: doc.grandTotal,
      subtotal: doc.subtotal,
      discountAmount: doc.discountTotal ?? 0,
      tax: doc.taxTotal ?? 0,
      date: doc.docDate,
      isEstimate: doc.docType === "quotation",
      items: doc.items.map((it) => ({
        name: it.productName,
        quantity: it.quantity,
        unit: it.unit,
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
  };

  const handleWhatsAppShare = (doc: BusinessDocument) => {
    shareInvoicePdfToWhatsApp({
      invoiceNumber: doc.documentNumber,
      customerName: doc.partyName,
      customerPhone: doc.partyPhone,
      storeName: org?.name || "CredSmart Store",
      storePhone: org?.phone,
      totalAmount: doc.grandTotal,
      date: doc.docDate,
      isEstimate: doc.docType === "quotation",
      items: doc.items.map((it) => ({
        name: it.productName,
        quantity: it.quantity,
        unit: it.unit,
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
  };

  const handleOpenReceipt = (doc: BusinessDocument) => {
    const receipt: ReceiptData = {
      docType: doc.docType,
      invoiceNumber: doc.documentNumber,
      referenceNumber: doc.referenceNumber,
      items: doc.items.map((it) => ({
        product: {
          id: it.productId || it.id,
          name: it.productName,
          barcode: it.barcode || "",
          brand: "",
          category: "",
          unit: it.unit || "PCS",
          altUnit: it.altUnit,
          altUnitConversion: it.altUnitConversion,
          hsn: it.hsn || "",
          gstRate: it.taxRate || 0,
          batches: [],
        },
        batch: {
          id: it.id,
          costPrice: 0,
          mrp: it.rate,
          stock: 100,
          batchNumber: it.batchNumber || "BATCH-01",
          expiryDate: it.expiryDate,
        },
        quantity: it.quantity,
        altUnit: it.altUnit,
        altQty: it.altQty,
        altUnitConversion: it.altUnitConversion,
        unit: it.unit || "PCS",
      })),
      subtotal: doc.subtotal,
      discountAmount: doc.discountTotal,
      discountLabel: "Discount",
      tax: doc.taxTotal,
      total: doc.grandTotal,
      roundOff: doc.roundOff,
      customerName: doc.partyName,
      customerPhone: doc.partyPhone,
      partyAddress: doc.partyAddress,
      partyGstin: doc.partyGstin,
      partyEmail: doc.partyEmail,
      paymentMethod: doc.paymentMethod || "Cash",
      storeName: org?.name || "CredSmart Enterprises",
      storeAddress: org?.address || "",
      storePhone: org?.phone || "",
      storeEmail: org?.email || "",
      storeLogoUrl: org?.logo_url || "",
      gstin: org?.gstin || "",
      pan: org?.pan || "",
      bankName: org?.bank_name || "",
      accountNumber: org?.account_number || "",
      ifsc: org?.ifsc || "",
      accountHolder: org?.account_holder || org?.name || "",
      branch: org?.branch || "",
      upiId: org?.upi_id || "",
      date: doc.docDate,
      dueDate: doc.dueDate,
      isEstimate: doc.docType === "quotation",
      originalInvoiceNumber: doc.originalInvoiceNumber || doc.referenceNumber,
      originalInvoiceDate: doc.originalInvoiceDate,
      returnReason: doc.returnReason,
      settlementMode: doc.settlementMode,
      notes: doc.notes,
      terms: doc.terms,
    };
    setReceiptData(receipt);
  };

  const handleOpenCreateDoc = () => {
    if (activeTab === "sales_return" || activeTab === "credit_note") {
      setSelectedReturnInvoice(null);
      setEditingReturnDoc(null);
      setSalesReturnModalOpen(true);
    } else {
      setEditingDoc(null);
      setCreateModalOpen(true);
    }
  };

  const activeTabMeta = TABS.find((t) => t.id === activeTab) || TABS[0];

  const calculateDueInText = (doc: BusinessDocument) => {
    if (doc.status === "paid") return "Paid";
    if (!doc.dueDate) return "Immediate";
    const dueTime = new Date(doc.dueDate).getTime();
    const today = new Date().setHours(0, 0, 0, 0);
    const diffDays = Math.round((dueTime - today) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Due Today";
    if (diffDays > 0) return `Due in ${diffDays} day${diffDays > 1 ? "s" : ""}`;
    return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? "s" : ""}`;
  };

  return (
    <div className="h-full flex flex-col w-full bg-slate-50/60 dark:bg-slate-950/40 select-none overflow-hidden font-sans">
      {/* Sub-document Tabs Navigation Bar - Hairline Stripe/Linear Ribbon */}
      <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-5 shrink-0 overflow-x-auto scrollbar-none h-11 flex items-center">
        <div className="flex items-center gap-1.5 min-w-max">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer active:scale-95",
                  isActive
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Container - Fitted to Screen */}
      <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-4 space-y-3 max-w-7xl w-full mx-auto overflow-hidden">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-sans">
              {activeTabMeta.label}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE GST SYNC</span>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Reports Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8.5 px-3 text-xs font-semibold gap-1.5 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-2xs rounded-lg"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Reports</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => navigate("/analytics")}>
                  Sales Summary Report
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/analytics")}>
                  GSTR-1 Sales Report
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/customers")}>
                  Customer Receivable Aging
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/items")}>
                  Item-wise Sales Report
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportCSV}>
                  Export All Transactions (CSV)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Settings Cog with Notification Dot */}
            <button
              onClick={() => setSettingsModalOpen(true)}
              className="relative w-7.5 h-7.5 rounded-md border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors shadow-2xs cursor-pointer flex items-center justify-center"
              title="Sales & Invoicing Preferences"
              aria-label="Sales Preferences"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
            </button>

            {/* Keyboard Shortcuts Button */}
            <button
              onClick={() => setShortcutsModalOpen(true)}
              className="w-7.5 h-7.5 rounded-md border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors shadow-2xs cursor-pointer flex items-center justify-center"
              title="Keyboard Shortcuts"
              aria-label="Keyboard Shortcuts"
            >
              <Keyboard className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Mobile Compact 4-Col KPI Mini Strip (Mobile Only) */}
        <div className="grid grid-cols-2 sm:hidden gap-2 shrink-0">
          <div
            onClick={() => setStatusFilter(statusFilter === "all" ? "all" : "all")}
            className={cn(
              "p-2 rounded-xl border transition-all cursor-pointer select-none bg-white dark:bg-slate-900 text-center shadow-2xs active:scale-95",
              statusFilter === "all"
                ? "ring-1.5 ring-slate-900 dark:ring-white border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800/50"
                : "border-slate-200/80 dark:border-slate-800"
            )}
          >
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
              Volume
            </div>
            <div className="text-xs font-bold font-mono tabular-nums text-slate-900 dark:text-white tracking-tight truncate mt-0.5">
              ₹{Number(metrics.totalAmount ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === "paid" ? "all" : "paid")}
            className={cn(
              "p-2 rounded-xl border transition-all cursor-pointer select-none bg-white dark:bg-slate-900 text-center shadow-2xs active:scale-95",
              statusFilter === "paid"
                ? "ring-1.5 ring-emerald-600 border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30"
                : "border-slate-200/80 dark:border-slate-800"
            )}
          >
            <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 truncate">
              Settled
            </div>
            <div className="text-xs font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 tracking-tight truncate mt-0.5">
              ₹{Number(metrics.paidAmount ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === "unpaid" ? "all" : "unpaid")}
            className={cn(
              "p-2 rounded-xl border transition-all cursor-pointer select-none bg-white dark:bg-slate-900 text-center shadow-2xs active:scale-95",
              statusFilter === "unpaid"
                ? "ring-1.5 ring-rose-600 border-rose-600 bg-rose-50/50 dark:bg-rose-950/30"
                : "border-slate-200/80 dark:border-slate-800"
            )}
          >
            <div className="text-[11px] font-mono uppercase tracking-wider text-rose-600 dark:text-rose-400 truncate">
              Receivables
            </div>
            <div className="text-xs font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 tracking-tight truncate mt-0.5">
              ₹{Number(metrics.unpaidAmount ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === "cancelled" ? "all" : "cancelled")}
            className={cn(
              "p-2 rounded-xl border transition-all cursor-pointer select-none bg-white dark:bg-slate-900 text-center shadow-2xs active:scale-95",
              statusFilter === "cancelled"
                ? "ring-1.5 ring-slate-600 border-slate-600 bg-slate-100 dark:bg-slate-800"
                : "border-slate-200/80 dark:border-slate-800"
            )}
          >
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
              Voided
            </div>
            <div className="text-xs font-bold font-mono tabular-nums text-slate-700 dark:text-slate-300 tracking-tight truncate mt-0.5">
              {Number(metrics.cancelledAmount ?? 0) > 0 ? `₹${Number(metrics.cancelledAmount ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"}
            </div>
          </div>
        </div>

        {/* Metric Cards - Hairline Stripe/Linear KPI Cards (Tablet / Desktop) */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
          {/* Total Volume */}
          <div
            onClick={() => setStatusFilter(statusFilter === "all" ? "all" : "all")}
            className={cn(
              "p-3.5 rounded-xl border bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between cursor-pointer transition-all select-none hover:border-slate-300 dark:hover:border-slate-700",
              statusFilter === "all"
                ? "ring-1.5 ring-slate-900 dark:ring-white border-slate-900 dark:border-white bg-slate-50/50 dark:bg-slate-800/30"
                : "border-slate-200/80 dark:border-slate-800"
            )}
          >
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span className="font-semibold">Total Volume</span>
              <Receipt className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="mt-2 text-lg sm:text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white tracking-tight">
              ₹ {Number(metrics.totalAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>

          </div>

          {/* Settled */}
          <div
            onClick={() => setStatusFilter(statusFilter === "paid" ? "all" : "paid")}
            className={cn(
              "p-3.5 rounded-xl border bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between cursor-pointer transition-all select-none hover:border-slate-300 dark:hover:border-slate-700",
              statusFilter === "paid"
                ? "ring-1.5 ring-emerald-600 border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20"
                : "border-slate-200/80 dark:border-slate-800"
            )}
          >
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <span className="font-semibold">Settled</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-lg sm:text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white tracking-tight">
              ₹ {Number(metrics.paidAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>

          </div>

          {/* Receivables */}
          <div
            onClick={() => setStatusFilter(statusFilter === "unpaid" ? "all" : "unpaid")}
            className={cn(
              "p-3.5 rounded-xl border bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between cursor-pointer transition-all select-none hover:border-slate-300 dark:hover:border-slate-700",
              statusFilter === "unpaid"
                ? "ring-1.5 ring-rose-600 border-rose-600 bg-rose-50/30 dark:bg-rose-950/20"
                : "border-slate-200/80 dark:border-slate-800"
            )}
          >
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-rose-600 dark:text-rose-400">
              <span className="font-semibold">Receivables</span>
              <AlertCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-2 text-lg sm:text-xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 tracking-tight">
              ₹ {Number(metrics.unpaidAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>

          </div>

          {/* Voided */}
          <div
            onClick={() => setStatusFilter(statusFilter === "cancelled" ? "all" : "cancelled")}
            className={cn(
              "p-3.5 rounded-xl border bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between cursor-pointer transition-all select-none hover:border-slate-300 dark:hover:border-slate-700",
              statusFilter === "cancelled"
                ? "ring-1.5 ring-slate-600 border-slate-600 bg-slate-50/50 dark:bg-slate-800/30"
                : "border-slate-200/80 dark:border-slate-800"
            )}
          >
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span className="font-semibold">Voided</span>
              <XCircle className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 text-lg sm:text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white tracking-tight">
              {Number(metrics.cancelledAmount ?? 0) > 0 ? `₹ ${Number(metrics.cancelledAmount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
            </div>

          </div>
        </div>

        {/* Filter Bar - Hairline Stripe/Linear Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs shrink-0">
          <div className="flex flex-1 items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[150px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                placeholder="Search party, phone, invoice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-7 h-8.5 text-xs bg-slate-50/70 dark:bg-slate-800/50 border-slate-200/90 dark:border-slate-700/80 rounded-lg focus-visible:ring-1 focus-visible:ring-slate-900 dark:focus-visible:ring-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date Range Preset Selector */}
            <Select value={selectedPreset} onValueChange={handleDatePresetChange}>
              <SelectTrigger className="h-8.5 w-[115px] sm:w-[135px] text-xs bg-slate-50/70 dark:bg-slate-800/50 border-slate-200/90 dark:border-slate-700/80 rounded-lg">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESETS.map((p) => (
                  <SelectItem key={p.label} value={p.label}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter Selector */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8.5 w-[100px] sm:w-[120px] text-xs bg-slate-50/70 dark:bg-slate-800/50 border-slate-200/90 dark:border-slate-700/80 rounded-lg">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="partially_paid">Partially Paid</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Quick Status Filter Tabs on Large Screens */}
            <div className="hidden xl:flex items-center gap-1 border-l border-slate-200/80 dark:border-slate-800 pl-2">
              {[
                { id: "all", label: "All" },
                { id: "paid", label: "Paid" },
                { id: "unpaid", label: "Unpaid / Due" },
                { id: "partially_paid", label: "Partial" },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setStatusFilter(pill.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer",
                    statusFilter === pill.id
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  )}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Bulk Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8.5 px-2.5 text-xs font-medium gap-1.5 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg shadow-2xs"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Bulk Actions</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => {
                    if (selectedDocIds.size === 0) {
                      toast.info("Please select at least one document");
                      return;
                    }
                    toast.success(`Exporting ${selectedDocIds.size} selected documents`);
                  }}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Selected</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    if (selectedDocIds.size === 0) {
                      toast.info("Please select at least one document");
                      return;
                    }
                    toast.success(`Payment reminders queued for ${selectedDocIds.size} customers`);
                  }}
                  className="gap-2 text-emerald-600"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Send Reminders</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* High-Contrast Create Sales Invoice Button */}
            <button
              onClick={handleOpenCreateDoc}
              className="flex items-center gap-1.5 px-3 h-8.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create {activeTabMeta.label.replace(/s$/, "")}</span>
            </button>
          </div>
        </div>

        {/* Transactions Table Card / Mobile Card Stream Container */}
        <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 flex flex-col overflow-hidden">
          {/* MOBILE VIEW: Touch Transaction Cards (Visible on screens < md) */}
          <div className="block md:hidden flex-1 min-h-0 overflow-y-auto px-0 pb-36 divide-y divide-slate-100 dark:divide-slate-800/60 scrollbar-thin overscroll-y-contain">
            {filteredDocuments.length === 0 ? (
              <div className="py-12 text-center space-y-2.5">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
                  <FileText className="w-6 h-6 stroke-[1.5]" />
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">No Transactions Found</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  No records match current filter. Tap below to create your first {activeTabMeta.label.replace(/s$/, "")}.
                </p>
                <Button
                  onClick={handleOpenCreateDoc}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 mt-1 gap-1.5 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create {activeTabMeta.label.replace(/s$/, "")}</span>
                </Button>
              </div>
            ) : (
              paginatedDocs.map((doc) => {
                const isSelected = selectedDocIds.has(doc.id);
                return (
                  <div
                    key={doc.id}
                    className={cn(
                      "px-3.5 py-3 transition-all bg-white dark:bg-slate-900 space-y-2",
                      isSelected
                        ? "bg-blue-50/30 dark:bg-blue-950/20"
                        : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                    )}
                  >
                    {/* Line 1: Invoice Number + Status Badge + Grand Total */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-white truncate">
                          {doc.documentNumber}
                        </span>
                        {/* Micro-dot Status Pill with >=44px touch target */}
                        <button
                          type="button"
                          onClick={() => handleTogglePaymentStatus(doc, doc.status === "paid" ? "unpaid" : "paid")}
                          title={`Click to mark as ${doc.status === "paid" ? "Unpaid" : "Paid"}`}
                          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-1 -m-1 cursor-pointer active:scale-95 transition-transform"
                        >
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold font-mono border",
                              doc.status === "paid" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60",
                              doc.status === "partial" && "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-800/60",
                              doc.status === "unpaid" && "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200 dark:border-rose-800/60",
                              doc.status === "draft" && "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
                              doc.status === "cancelled" && "bg-slate-100 text-slate-500 line-through border-slate-200"
                            )}
                          >
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full shrink-0",
                                doc.status === "paid" && "bg-emerald-500",
                                doc.status === "partial" && "bg-amber-500",
                                doc.status === "unpaid" && "bg-rose-500",
                                doc.status === "draft" && "bg-slate-400",
                                doc.status === "cancelled" && "bg-slate-400"
                              )}
                            />
                            <span className="capitalize">{doc.status}</span>
                          </span>
                        </button>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm sm:text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                          ₹ {Number(doc.grandTotal ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Line 2: Customer Name + Date + Quick Actions */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs text-slate-900 dark:text-white truncate">{doc.partyName}</p>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          <span>{doc.docDate}</span>
                          <span>•</span>
                          <span className={doc.status === "unpaid" ? "text-rose-600 font-semibold" : ""}>{calculateDueInText(doc)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Print */}
                        <button
                          onClick={() => handleOpenReceipt(doc)}
                          className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer shadow-2xs"
                          title="Print Invoice"
                          aria-label="Print Invoice"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {/* Download PDF */}
                        <button
                          onClick={() => handleDownloadPdf(doc)}
                          className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer shadow-2xs"
                          title="Download PDF"
                          aria-label="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {/* WhatsApp */}
                        <button
                          onClick={() => handleWhatsAppShare(doc)}
                          className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 active:scale-95 transition-all cursor-pointer shadow-2xs"
                          title="WhatsApp Share"
                          aria-label="WhatsApp Share"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>

                        {/* More Options Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer shadow-2xs"
                              aria-label="More Options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem
                              onClick={() => handleOpenReceipt(doc)}
                              className="gap-2 font-semibold"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                              <span>View / Print Receipt</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleOpenEway(doc)}
                              className="gap-2 font-semibold text-indigo-600 dark:text-indigo-400"
                            >
                              <Truck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                              <span>Generate / View E-Way Bill</span>
                            </DropdownMenuItem>
                            {doc.docType === "sales_invoice" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedReturnInvoice(doc);
                                  setEditingReturnDoc(null);
                                  setSalesReturnModalOpen(true);
                                }}
                                className="gap-2 font-semibold text-amber-600 dark:text-amber-400 cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                                <span>Create Sales Return</span>
                              </DropdownMenuItem>
                            )}
                            {doc.docType === "sales_return" || doc.docType === "credit_note" ? (
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingReturnDoc(doc);
                                  setSelectedReturnInvoice(null);
                                  setSalesReturnModalOpen(true);
                                }}
                                className="gap-2 font-semibold text-amber-600 dark:text-amber-400 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-amber-600" />
                                <span>Edit Return</span>
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingDoc(doc);
                                  setCreateModalOpen(true);
                                }}
                                className="gap-2"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Edit Invoice</span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDuplicate(doc)}
                              className="gap-2"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Duplicate Invoice</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {doc.status !== "paid" ? (
                              <DropdownMenuItem
                                onClick={() => handleTogglePaymentStatus(doc, "paid")}
                                className="gap-2 font-semibold text-emerald-600 dark:text-emerald-400 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Mark as Paid</span>
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleTogglePaymentStatus(doc, "unpaid")}
                                className="gap-2 font-semibold text-rose-600 dark:text-rose-400 cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Mark as Unpaid</span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteDocument(doc)}
                              className="gap-2 text-rose-600 dark:text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Mobile Pagination */}
          <div className="md:hidden border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
            <PaginationBar
              page={page}
              totalPages={totalPages}
              totalItems={totalDocCount}
              startIndex={startIndex}
              endIndex={endIndex}
              hasNext={hasNext}
              hasPrev={hasPrev}
              onPageChange={setPage}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          </div>

          {/* DESKTOP VIEW: High-Density Stripe/Linear Data Table (Visible on md: and above) */}
          <div className="hidden md:flex flex-1 min-h-0 overflow-y-auto overflow-x-auto w-full scrollbar-thin flex-col justify-between">
            <table className="w-full text-left text-xs border-collapse min-w-[640px]">
              <thead className="sticky top-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xs border-b border-slate-200/80 dark:border-slate-800 text-[11px] uppercase font-mono tracking-wider text-slate-500 dark:text-slate-400 z-10">
                <tr>
                  <th className="py-2.5 px-3 w-10">
                    <input
                      type="checkbox"
                      checked={
                        filteredDocuments.length > 0 &&
                        selectedDocIds.size === filteredDocuments.length
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 text-slate-900 focus:ring-slate-900 cursor-pointer"
                    />
                  </th>
                  <th
                    onClick={() => handleSort("docDate")}
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white select-none transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Date</span>
                      <ArrowUpDown className={cn("w-3 h-3", sortField === "docDate" ? "text-slate-900 dark:text-white" : "text-slate-400")} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("documentNumber")}
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white select-none transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>{activeTab === "sales_return" || activeTab === "credit_note" ? "Return Number" : "Invoice Number"}</span>
                      <ArrowUpDown className={cn("w-3 h-3", sortField === "documentNumber" ? "text-slate-900 dark:text-white" : "text-slate-400")} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("partyName")}
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white select-none transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Party Name</span>
                      <ArrowUpDown className={cn("w-3 h-3", sortField === "partyName" ? "text-slate-900 dark:text-white" : "text-slate-400")} />
                    </div>
                  </th>
                  <th className="py-2.5 px-3">
                    {activeTab === "sales_return" || activeTab === "credit_note" ? "Return Details" : "Due In"}
                  </th>
                  <th
                    onClick={() => handleSort("grandTotal")}
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white select-none transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Amount</span>
                      <ArrowUpDown className={cn("w-3 h-3", sortField === "grandTotal" ? "text-slate-900 dark:text-white" : "text-slate-400")} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("status")}
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white select-none transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Status</span>
                      <ArrowUpDown className={cn("w-3 h-3", sortField === "status" ? "text-slate-900 dark:text-white" : "text-slate-400")} />
                    </div>
                  </th>
                  <th className="py-2.5 px-3 w-40 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {paginatedDocs.length > 0 ? (
                  paginatedDocs.map((doc) => {
                    const isSelected = selectedDocIds.has(doc.id);
                    return (
                      <tr
                        key={doc.id}
                        className={cn(
                          "py-2.5 px-3 border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group",
                          isSelected && "bg-blue-50/20 dark:bg-blue-950/20"
                        )}
                      >
                        <td className="py-2.5 px-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(doc.id)}
                            className="rounded border-slate-300 dark:border-slate-700 text-slate-900 focus:ring-slate-900 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {doc.docDate}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono font-semibold text-slate-900 dark:text-white px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-[11px] whitespace-nowrap">
                            {doc.documentNumber}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white">{doc.partyName}</span>
                            {doc.partyPhone && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                {doc.partyPhone}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {activeTab === "sales_return" || activeTab === "credit_note" ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/60">
                                <RotateCcw className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate max-w-[140px]">{doc.returnReason || "Sales Return"}</span>
                              </span>
                              {doc.originalInvoiceNumber && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                  Ref: {doc.originalInvoiceNumber}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span
                              className={cn(
                                "text-[11px] font-medium",
                                doc.status === "paid"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : calculateDueInText(doc).includes("Overdue")
                                  ? "text-rose-600 font-semibold"
                                  : "text-slate-500 dark:text-slate-400"
                              )}
                            >
                              {calculateDueInText(doc)}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          ₹ {Number(doc.grandTotal ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {/* Micro-dot Status Pill Button */}
                          <button
                            type="button"
                            onClick={() => handleTogglePaymentStatus(doc, doc.status === "paid" ? "unpaid" : "paid")}
                            title={`Click to mark as ${doc.status === "paid" ? "Unpaid" : "Paid"}`}
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold font-mono border cursor-pointer active:scale-95 transition-all shadow-2xs",
                              doc.status === "paid" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100",
                              doc.status === "partial" && "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100",
                              doc.status === "unpaid" && "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200 dark:border-rose-800/60 hover:bg-rose-100",
                              doc.status === "draft" && "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100",
                              doc.status === "cancelled" && "bg-slate-100 text-slate-500 line-through border-slate-200 hover:bg-slate-200"
                            )}
                          >
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full shrink-0",
                                doc.status === "paid" && "bg-emerald-500",
                                doc.status === "partial" && "bg-amber-500",
                                doc.status === "unpaid" && "bg-rose-500",
                                doc.status === "draft" && "bg-slate-400",
                                doc.status === "cancelled" && "bg-slate-400"
                              )}
                            />
                            <span className="capitalize">{doc.status}</span>
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {/* 1. Print Receipt */}
                            <button
                              type="button"
                              onClick={() => handleOpenReceipt(doc)}
                              className="p-1.5 rounded-md border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer shadow-2xs"
                              title="Print / View Receipt"
                              aria-label="Print Invoice"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* 2. Download PDF */}
                            <button
                              type="button"
                              onClick={() => handleDownloadPdf(doc)}
                              className="p-1.5 rounded-md border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer shadow-2xs"
                              title="Download PDF"
                              aria-label="Download PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {/* 3. WhatsApp Share */}
                            <button
                              type="button"
                              onClick={() => handleWhatsAppShare(doc)}
                              className="p-1.5 rounded-md border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer shadow-2xs"
                              title="Share PDF to WhatsApp"
                              aria-label="Share PDF to WhatsApp"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>

                            {/* 4. Dropdown Menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-md border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer shadow-2xs"
                                  aria-label="More actions"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem onClick={() => handleOpenReceipt(doc)} className="gap-2 font-semibold">
                                  <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                                  <span>View / Print Receipt</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenEway(doc)} className="gap-2 font-semibold text-indigo-600 dark:text-indigo-400">
                                  <Truck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                  <span>Generate / View E-Way Bill</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDownloadPdf(doc)}
                                  className="gap-2 font-semibold text-amber-600 dark:text-amber-400 cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Download PDF</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleWhatsAppShare(doc)}
                                  className="gap-2 font-semibold text-emerald-600 dark:text-emerald-400 cursor-pointer"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                  <span>Share PDF to WhatsApp</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {doc.status !== "paid" ? (
                                  <DropdownMenuItem
                                    onClick={() => handleTogglePaymentStatus(doc, "paid")}
                                    className="gap-2 font-semibold text-emerald-600 dark:text-emerald-400 cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Mark as Paid</span>
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => handleTogglePaymentStatus(doc, "unpaid")}
                                    className="gap-2 font-semibold text-rose-600 dark:text-rose-400 cursor-pointer"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Mark as Unpaid</span>
                                  </DropdownMenuItem>
                                )}
                                {doc.docType === "sales_invoice" && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedReturnInvoice(doc);
                                      setEditingReturnDoc(null);
                                      setSalesReturnModalOpen(true);
                                    }}
                                    className="gap-2 font-semibold text-amber-600 dark:text-amber-400 cursor-pointer"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Create Sales Return</span>
                                  </DropdownMenuItem>
                                )}
                                {doc.docType === "sales_return" || doc.docType === "credit_note" ? (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditingReturnDoc(doc);
                                      setSelectedReturnInvoice(null);
                                      setSalesReturnModalOpen(true);
                                    }}
                                    className="gap-2 font-semibold text-amber-600 dark:text-amber-400 cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Edit Return</span>
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditingDoc(doc);
                                      setCreateModalOpen(true);
                                    }}
                                    className="gap-2 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Edit Document</span>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleDuplicate(doc)}
                                  className="gap-2"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Duplicate Invoice</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteDocument(doc)}
                                  className="gap-2 text-rose-600 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                        <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400">
                          <FileText className="w-7 h-7 stroke-[1.5]" />
                        </div>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                          No Transactions Matching the current filter
                        </p>
                        <Button
                          onClick={handleOpenCreateDoc}
                          size="sm"
                          className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs gap-1.5 mt-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Create {activeTabMeta.label.replace(/s$/, "")}</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Desktop Pagination */}
            <div className="hidden md:block border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
              <PaginationBar
                page={page}
                totalPages={totalPages}
                totalItems={totalDocCount}
                startIndex={startIndex}
                endIndex={endIndex}
                hasNext={hasNext}
                hasPrev={hasPrev}
                onPageChange={setPage}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Help (?) Button at bottom right */}
      <button
        onClick={() => setShortcutsModalOpen(true)}
        className="fixed bottom-5 right-5 w-9 h-9 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-all z-30 font-bold border border-slate-700/50 cursor-pointer"
        title="Help & Shortcuts"
        aria-label="Help & Shortcuts"
      >
        <span className="text-sm font-semibold">?</span>
      </button>

      {/* Sales Invoice & Document Creation Modal */}
      <SalesInvoiceModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        orgId={orgId || ""}
        initialDocType={activeTab}
        editingDoc={editingDoc}
        onSaved={() => loadDocuments()}
        onPrintRequest={(doc) => handleOpenReceipt(doc)}
      />

      {/* Sales Return & Credit Note Modal */}
      <SalesReturnModal
        open={salesReturnModalOpen}
        onOpenChange={setSalesReturnModalOpen}
        orgId={orgId || ""}
        initialDocType={activeTab === "credit_note" ? "credit_note" : "sales_return"}
        initialInvoice={selectedReturnInvoice}
        editingReturn={editingReturnDoc}
        onSaved={() => loadDocuments()}
        onPrintRequest={(data) => setReceiptData(data)}
      />

      {/* Sales Settings Modal */}
      <SalesSettingsModal
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
        orgId={orgId || ""}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        open={shortcutsModalOpen}
        onOpenChange={setShortcutsModalOpen}
      />

      {/* Receipt Modal */}
      {receiptData && (
        <ReceiptModal
          data={receiptData}
          onClose={() => setReceiptData(null)}
          onNewSale={() => {
            setReceiptData(null);
            setEditingDoc(null);
            setCreateModalOpen(true);
          }}
        />
      )}

      {/* E-Way Bill Generation & Slip Modals */}
      <GenerateEwayBillModal
        open={ewayModalOpen}
        onOpenChange={setEwayModalOpen}
        initialInvoice={selectedEwayDoc}
        onSuccess={(saved) => {
          setSelectedEwayRecord(saved);
          setEwaySlipOpen(true);
          loadDocuments();
        }}
      />

      <EwayBillPrintSlip
        open={ewaySlipOpen}
        onOpenChange={setEwaySlipOpen}
        ewayBill={selectedEwayRecord}
      />
    </div>
  );
}
