import { useState, useEffect, useCallback, useMemo } from "react";
import { usePagination } from "@/hooks/usePagination";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
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
  Smartphone,
  X,
  Upload,
  Loader2,
  CreditCard,
  Check,
} from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { PendingInwardBanner } from "@/components/purchases/PendingInwardBanner";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { cn, exportToCSV } from "@/lib/utils";
import {
  BusinessDocument,
  PurchaseDocumentType,
  DocumentStatus,
} from "@/types/documents";
import { documentsService } from "@/services/documentsService";
import { PurchaseInvoiceModal } from "@/components/PurchaseInvoiceModal";
import { SalesSettingsModal } from "@/components/SalesSettingsModal";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";
import { MobileScanModal } from "@/components/MobileScanModal";
import { ReceiptModal, ReceiptData } from "@/components/ReceiptModal";
import { shareInvoicePdfToWhatsApp } from "@/utils/whatsappPdfShare";
import { downloadExactInvoicePdf } from "@/utils/downloadExactInvoice";
import { UniversalDocType } from "@/components/invoices/UnifiedInvoiceRenderer";

const PURCHASE_TABS: { id: PurchaseDocumentType; label: string; icon: any /* eslint-disable-line @typescript-eslint/no-explicit-any */ }[] = [ // eslint-disable-line @typescript-eslint/no-explicit-any
  { id: "purchase_invoice", label: "Purchase Invoices", icon: Truck },
  { id: "payment_out", label: "Payment Out", icon: Wallet },
  { id: "purchase_return", label: "Purchase Return", icon: RotateCcw },
  { id: "debit_note", label: "Debit Note", icon: FileCheck },
  { id: "purchase_order", label: "Purchase Orders", icon: FileText },
];

const DATE_PRESETS = [
  { label: "Today", days: 0 },
  { label: "Yesterday", days: 1 },
  { label: "This Week", days: 7 },
  { label: "This Month", days: 30 },
  { label: "Last 365 Days", days: 365 },
  { label: "All Time", days: 9999 },
];

export default function Purchases() {
  const { org, orgId } = useOrganization();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab / Sub-view
  const tabParam = searchParams.get("tab") as PurchaseDocumentType | null;
  const activeTab: PurchaseDocumentType =
    tabParam && PURCHASE_TABS.some((t) => t.id === tabParam) ? tabParam : "purchase_invoice";

  const setActiveTab = (tab: PurchaseDocumentType) => {
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
  const [sortField, setSortField] = useState<"docDate" | "grandTotal">("docDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<BusinessDocument | null>(null);
  const [prefilledSupplier, setPrefilledSupplier] = useState<{
    id?: string;
    name: string;
    phone?: string;
    address?: string;
    gstin?: string;
  } | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [mobileScanModalOpen, setMobileScanModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  useEffect(() => {
    const state = location.state as {
      openForm?: boolean;
      prefilledSupplier?: {
        id?: string;
        name: string;
        phone?: string;
        address?: string;
        gstin?: string;
      };
      supplierId?: string;
      supplierName?: string;
    } | null;

    if (state?.openForm) {
      if (state.prefilledSupplier) {
        setPrefilledSupplier(state.prefilledSupplier);
      } else if (state.supplierId || state.supplierName) {
        setPrefilledSupplier({
          id: state.supplierId,
          name: state.supplierName || "",
        });
      }
      setEditingDoc(null);
      setCreateModalOpen(true);
    }
  }, [location.state]);

  // Fetch Documents
  const loadDocuments = useCallback(async () => {
    if (!orgId) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await documentsService.fetchPurchaseDocuments(orgId, activeTab);
      setDocuments(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load purchase documents");
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
    window.addEventListener("credsmart_network_update", handleReload);
    window.addEventListener("credsmart_documents_updated", handleReload);
    return () => {
      window.removeEventListener("credsmart_network_update", handleReload);
      window.removeEventListener("credsmart_documents_updated", handleReload);
    };
  }, [loadDocuments]);

  // Global Keyboard Shortcuts
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
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matches =
            doc.documentNumber.toLowerCase().includes(q) ||
            doc.partyName.toLowerCase().includes(q) ||
            (doc.partyPhone && doc.partyPhone.includes(q)) ||
            (doc.partyGstin && doc.partyGstin.toLowerCase().includes(q)) ||
            (doc.referenceNumber && doc.referenceNumber.toLowerCase().includes(q));
          if (!matches) return false;
        }

        if (statusFilter !== "all" && doc.status !== statusFilter) {
          return false;
        }

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
        if (sortField === "docDate") {
          const timeA = new Date(a.docDate).getTime();
          const timeB = new Date(b.docDate).getTime();
          return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
        } else {
          return sortOrder === "asc" ? a.grandTotal - b.grandTotal : b.grandTotal - a.grandTotal;
        }
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
      ["Date", "Document Number", "Vendor Bill No", "Supplier Name", "Phone", "GSTIN", "Taxable", "Tax (ITC)", "Grand Total", "Paid", "Balance Due", "Status"],
      ...filteredDocuments.map((d) => [
        d.docDate,
        d.documentNumber,
        d.referenceNumber || "",
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
    exportToCSV(`Purchases_${activeTab}_${new Date().toISOString().split("T")[0]}.csv`, rows);
    toast.success("Purchase transactions exported to CSV");
  };

  const handleDeleteDocument = async (doc: BusinessDocument) => {
    if (!orgId) return;
    if (confirm(`Are you sure you want to delete ${doc.documentNumber}?`)) {
      await documentsService.deleteDocument(orgId, doc.docType, doc.id);
      toast.success(`${doc.documentNumber} deleted`);
      loadDocuments();
    }
  };

  const handleDuplicate = (doc: BusinessDocument) => {
    const duplicated: BusinessDocument = {
      ...doc,
      id: "",
      documentNumber: "",
      docDate: new Date().toISOString().split("T")[0],
    };
    setEditingDoc(duplicated);
    setCreateModalOpen(true);
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
    toast.success(`Bill ${doc.documentNumber} marked as ${newStatus.toUpperCase()}`);
    loadDocuments();
  };

  const handleOpenReceipt = (doc: BusinessDocument) => {
    const receipt: ReceiptData = {
      docType: doc.docType || "purchase_invoice",
      invoiceNumber: doc.documentNumber,
      referenceNumber: doc.referenceNumber,
      items: doc.items.map((it) => ({
        product: {
          name: it.productName,
          brand: "",
          category: "",
          unit: it.unit || "PCS",
          altUnit: it.altUnit,
          altUnitConversion: it.altUnitConversion,
          hsn: it.hsn || "",
          gstRate: it.taxRate || 0,
        },
        batch: {
          mrp: it.rate,
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
      paymentMethod: doc.paymentMethod || "Bank Transfer",
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
      notes: doc.notes,
      terms: doc.terms,
    };
    setReceiptData(receipt);
  };

  const activeTabMeta = PURCHASE_TABS.find((t) => t.id === activeTab) || PURCHASE_TABS[0];

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

  const renderStatusBadge = (status: string, interactive = false, doc?: BusinessDocument) => {
    let badgeClass = "bg-slate-50 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    let dotClass = "bg-slate-400";
    let label = status;

    if (status === "paid" || status === "received") {
      badgeClass = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60";
      dotClass = "bg-emerald-500";
      label = "Paid";
    } else if (status === "partial") {
      badgeClass = "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-800/60";
      dotClass = "bg-amber-500";
      label = "Partial";
    } else if (status === "unpaid") {
      badgeClass = "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200 dark:border-rose-800/60";
      dotClass = "bg-rose-500";
      label = "Unpaid";
    }

    const content = (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono border uppercase tracking-wider select-none shrink-0",
          badgeClass,
          interactive && "cursor-pointer hover:opacity-80 active:scale-95 transition-all"
        )}
      >
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotClass)} />
        <span>{label}</span>
      </span>
    );

    if (interactive && doc) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="inline-flex focus:outline-hidden">
              {content}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-36 text-xs">
            <DropdownMenuItem
              onClick={() => handleTogglePaymentStatus(doc, "paid")}
              className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Mark as Paid
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleTogglePaymentStatus(doc, "unpaid")}
              className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Mark as Unpaid
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return content;
  };

  return (
    <div className="h-full flex flex-col w-full bg-slate-50/60 dark:bg-slate-950/40 select-none overflow-hidden font-sans">
      {/* Sub-document Tabs Navigation Ribbon - Stripe / Linear hairline */}
      <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-6 shrink-0 overflow-x-auto scrollbar-none h-11 flex items-center">
        <div className="flex items-center gap-1.5 min-w-max">
          {PURCHASE_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer active:scale-[0.98]",
                  isActive
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs font-bold"
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

      {/* Main Container */}
      <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-5 space-y-3 max-w-7xl w-full mx-auto overflow-hidden">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight font-sans">
              {activeTabMeta.label}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>GSTR-2 ITC READY</span>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Reports Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8.5 px-3 text-xs font-medium gap-1.5 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-2xs rounded-lg"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Reports</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => navigate("/analytics")}>
                  Purchase Summary Report
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/analytics")}>
                  GSTR-2 Input Tax Credit (ITC)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/suppliers")}>
                  Vendor Payables Aging
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/items")}>
                  Item-wise Inward Report
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportCSV}>
                  Export All Purchases (CSV)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Settings Cog */}
            <button
              onClick={() => setSettingsModalOpen(true)}
              className="p-2 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors shadow-2xs cursor-pointer relative"
              title="Purchase Preferences"
              aria-label="Purchase Preferences"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900" />
            </button>

            {/* Keyboard Shortcuts Button */}
            <button
              onClick={() => setShortcutsModalOpen(true)}
              className="p-2 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors shadow-2xs cursor-pointer"
              title="Keyboard Shortcuts"
              aria-label="Keyboard Shortcuts"
            >
              <Keyboard className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* B2B AUTO-SYNC INWARD BANNER — Sleek hairline with emerald/teal line */}
        {/* ───────────────────────────────────────────────────────────── */}
        <PendingInwardBanner
          className="!rounded-xl !border-slate-200/80 dark:!border-slate-800 !bg-white dark:!bg-slate-900 !p-3 sm:!p-3.5 !shadow-2xs relative overflow-hidden before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-gradient-to-r before:from-emerald-500 before:via-teal-500 before:to-emerald-600"
          onActionComplete={loadDocuments}
        />

        {/* ───────────────────────────────────────────────────────────── */}
        {/* KPI METRIC STRIP — Stripe / Linear Hairline Cards */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3.5 shrink-0">
          {/* Card 1: Total Purchases */}
          <div
            onClick={() => setStatusFilter("all")}
            className={cn(
              "rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 sm:p-3.5 shadow-2xs cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden group select-none active:scale-[0.99]",
              statusFilter === "all"
                ? "ring-1.5 ring-amber-500/40 border-amber-500/50 bg-amber-50/10 dark:bg-amber-950/15"
                : "hover:border-slate-300 dark:hover:border-slate-700"
            )}
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <Truck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-amber-600 dark:text-amber-400 font-mono uppercase tracking-wider truncate">
                  Purchases
                </span>
              </div>
              <span className="hidden sm:inline-block text-[10px] font-mono text-slate-400 font-medium">All Bills</span>
            </div>
            <div>
              <div className="text-xs sm:text-lg lg:text-xl font-bold text-slate-900 dark:text-white font-mono tracking-tight truncate">
                ₹ <span className="tabular-nums font-bold">{metrics.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <p className="hidden sm:block text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Total inward bills &amp; vendor orders
              </p>
            </div>
          </div>

          {/* Card 2: Paid Out */}
          <div
            onClick={() => setStatusFilter("paid")}
            className={cn(
              "rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 sm:p-3.5 shadow-2xs cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden group select-none active:scale-[0.99]",
              statusFilter === "paid"
                ? "ring-1.5 ring-emerald-500/40 border-emerald-500/50 bg-emerald-50/10 dark:bg-emerald-950/15"
                : "hover:border-slate-300 dark:hover:border-slate-700"
            )}
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono uppercase tracking-wider truncate">
                  Paid Out
                </span>
              </div>
              <span className="hidden sm:inline-block text-[10px] font-mono text-emerald-600/80 dark:text-emerald-400 font-medium">Cleared</span>
            </div>
            <div>
              <div className="text-xs sm:text-lg lg:text-xl font-bold text-slate-900 dark:text-white font-mono tracking-tight truncate">
                ₹ <span className="tabular-nums font-bold">{metrics.paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <p className="hidden sm:block text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Supplier payments cleared &amp; settled
              </p>
            </div>
          </div>

          {/* Card 3: Vendor Payables */}
          <div
            onClick={() => setStatusFilter("unpaid")}
            className={cn(
              "rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 sm:p-3.5 shadow-2xs cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden group select-none active:scale-[0.99]",
              statusFilter === "unpaid"
                ? "ring-1.5 ring-rose-500/40 border-rose-500/50 bg-rose-50/10 dark:bg-rose-950/15"
                : "hover:border-slate-300 dark:hover:border-slate-700"
            )}
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-rose-500 to-red-600" />
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                  <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-rose-600 dark:text-rose-400 font-mono uppercase tracking-wider truncate">
                  Payables
                </span>
              </div>
              <span className="hidden sm:inline-block text-[10px] font-mono text-rose-600/80 dark:text-rose-400 font-medium">Pending</span>
            </div>
            <div>
              <div className="text-xs sm:text-lg lg:text-xl font-bold text-rose-600 dark:text-rose-400 font-mono tracking-tight truncate">
                ₹ <span className="tabular-nums font-bold">{metrics.unpaidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <p className="hidden sm:block text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Outstanding supplier balances due
              </p>
            </div>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* FILTERS & ACTIONS BAR */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 p-2 sm:p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs shrink-0">
          {/* Quick Filter Tabs for Vendor Payments */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200/70 dark:border-slate-700/70">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  if (activeTab === "purchase_order") setActiveTab("purchase_invoice");
                }}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                  statusFilter === "all" && activeTab !== "purchase_order"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("paid");
                  if (activeTab === "purchase_order") setActiveTab("purchase_invoice");
                }}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1",
                  statusFilter === "paid" && activeTab !== "purchase_order"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Paid</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("unpaid");
                  if (activeTab === "purchase_order") setActiveTab("purchase_invoice");
                }}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1",
                  statusFilter === "unpaid" && activeTab !== "purchase_order"
                    ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-2xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Unpaid</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("purchase_order");
                  setStatusFilter("all");
                }}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1",
                  activeTab === "purchase_order"
                    ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400"
                )}
              >
                <FileText className="w-3 h-3" />
                <span>Purchase Orders</span>
              </button>
            </div>
          </div>

          {/* Search, Date Picker & Create Trigger */}
          <div className="flex items-center gap-2 flex-1 justify-end flex-wrap sm:flex-nowrap">
            {/* Clean Search Input with Clear Button */}
            <div className="relative flex-1 min-w-[150px] max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by bill #, supplier..."
                className="pl-8 pr-7 h-8.5 text-xs bg-slate-50/70 dark:bg-slate-800/50 border-slate-200/90 dark:border-slate-700/80 rounded-lg focus:ring-1 focus:ring-amber-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Date Range Selector */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8.5 px-2.5 text-xs font-medium border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900 rounded-lg gap-1.5 shadow-2xs shrink-0"
                >
                  <CalendarIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>{selectedPreset}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-3">
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-1.5">
                    {DATE_PRESETS.map((p) => (
                      <Button
                        key={p.label}
                        variant={selectedPreset === p.label ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setSelectedPreset(p.label);
                          const to = new Date();
                          const from = new Date(Date.now() - p.days * 24 * 60 * 60 * 1000);
                          setDateRange({ from, to });
                        }}
                        className="text-xs h-7"
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Primary Create Button */}
            <button
              onClick={() => {
                setEditingDoc(null);
                setCreateModalOpen(true);
              }}
              className="h-8.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-semibold text-xs shadow-2xs active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create {activeTabMeta.label.replace(/s$/, "")}</span>
            </button>
          </div>
        </div>

        {/* Bulk Selection Ribbon */}
        {selectedDocIds.size > 0 && (
          <div className="flex items-center justify-between px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs shrink-0">
            <span className="font-bold text-amber-700 dark:text-amber-300 font-mono">
              {selectedDocIds.size} Bill{selectedDocIds.size > 1 ? "s" : ""} Selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="h-7 text-xs font-semibold gap-1 rounded-lg border-amber-400 text-amber-700"
              >
                <Download className="w-3 h-3" />
                <span>Export Selected</span>
              </Button>
              <button
                type="button"
                onClick={() => setSelectedDocIds(new Set())}
                className="text-xs text-slate-500 hover:text-slate-900 underline ml-2 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TRANSACTIONS TABLE / MOBILE STREAM CONTAINER */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs flex flex-col justify-between">
          {/* MOBILE VIEW: High-Density Touch Card Stream (< md) */}
          <div className="block md:hidden flex-1 min-h-0 overflow-y-auto p-2.5 pb-24 space-y-2.5 scrollbar-thin overscroll-y-contain">
            {loading ? (
              <div className="py-16 text-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
                <p className="text-xs text-slate-500 font-mono">Loading purchase bills...</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="py-12 text-center space-y-2.5">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto border border-slate-200/80 dark:border-slate-700">
                  <Truck className="w-6 h-6 stroke-[1.5]" />
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">No Purchases Found</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  No records match current filter. Tap below to record your first {activeTabMeta.label.replace(/s$/, "")}.
                </p>
                <Button
                  onClick={() => {
                    setEditingDoc(null);
                    setCreateModalOpen(true);
                  }}
                  size="sm"
                  className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold px-3 py-1.5 mt-1 gap-1.5 shadow-2xs rounded-lg"
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
                      "p-3 rounded-xl border transition-all bg-white dark:bg-slate-900 space-y-2 shadow-2xs active:scale-[0.99]",
                      isSelected
                        ? "border-amber-500 ring-1.5 ring-amber-500/30 bg-amber-50/10"
                        : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    )}
                  >
                    {/* Line 1: Voucher Number + Status + Grand Total */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-white truncate">
                          {doc.documentNumber}
                        </span>
                        {renderStatusBadge(doc.status, true, doc)}
                        {(doc.notes?.includes("Auto-imported from Sales Invoice") || doc.referenceNumber?.startsWith("INV")) && (
                          <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-emerald-600 bg-emerald-500/10 px-1 py-0.2 rounded-md shrink-0">
                            <Sparkles className="w-2 h-2 text-emerald-500" />
                            Sync
                          </span>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                          ₹ {doc.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Line 2: Supplier Name + Date + Due */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs text-slate-900 dark:text-white truncate">{doc.partyName}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          <span>{doc.docDate}</span>
                          <span>•</span>
                          <span className={doc.status === "unpaid" ? "text-rose-600 font-semibold" : ""}>{calculateDueInText(doc)}</span>
                        </div>
                      </div>

                      {/* 1-Tap Record Payment Trigger (if unpaid/partial) */}
                      {doc.status !== "paid" && (
                        <button
                          type="button"
                          onClick={() => handleTogglePaymentStatus(doc, "paid")}
                          className="min-h-[44px] px-3.5 rounded-md border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                          title="Record Payment"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Pay Now</span>
                        </button>
                      )}
                    </div>

                    {/* Line 3: Quick Touch Actions */}
                    <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
                      {/* Print */}
                      <button
                        onClick={() => handleOpenReceipt(doc)}
                        className="p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all cursor-pointer min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center"
                        title="Print Receipt"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      {/* Download PDF */}
                      <button
                        onClick={() => {
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
                            isEstimate: false,
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
                        }}
                        className="p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all cursor-pointer min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center"
                        title="Download PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* WhatsApp */}
                      <button
                        onClick={() => {
                          shareInvoicePdfToWhatsApp({
                            invoiceNumber: doc.documentNumber,
                            customerName: doc.partyName,
                            customerPhone: doc.partyPhone,
                            storeName: "CredSmart Store",
                            totalAmount: doc.grandTotal,
                            date: doc.docDate,
                            isEstimate: false,
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
                        }}
                        className="p-1.5 rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 active:scale-95 transition-all cursor-pointer min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center"
                        title="WhatsApp Share"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      {/* More Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 active:scale-95 transition-all cursor-pointer min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 text-xs">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingDoc(doc);
                              setCreateModalOpen(true);
                            }}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1.5" />
                            Edit Voucher
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(doc)}>
                            <Plus className="w-3.5 h-3.5 mr-1.5" />
                            Duplicate Voucher
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteDocument(doc)}
                            className="text-rose-600 dark:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                            Delete Voucher
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Mobile Pagination */}
          <div className="md:hidden border-t border-slate-200/80 dark:border-slate-800 p-2">
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

          {/* DESKTOP VIEW: High-Density Stripe/Linear Table (md: and above) */}
          <div className="hidden md:flex flex-1 min-h-0 overflow-y-auto overflow-x-auto w-full scrollbar-thin flex-col justify-between">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead className="sticky top-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xs border-b border-slate-200/80 dark:border-slate-800 text-slate-500 text-[10.5px] uppercase font-mono tracking-wider z-10">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredDocuments.length > 0 &&
                        selectedDocIds.size === filteredDocuments.length
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700"
                    />
                  </th>
                  <th
                    onClick={() => {
                      setSortField("docDate");
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    }}
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Date</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-2.5 px-3">Bill / Invoice #</th>
                  <th className="py-2.5 px-3">Supplier Name</th>
                  <th className="py-2.5 px-3">Due In</th>
                  <th
                    onClick={() => {
                      setSortField("grandTotal");
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    }}
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white select-none text-right"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Amount</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 w-28 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                        <p className="text-xs font-mono text-slate-500">Loading purchase ledger...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedDocs.length > 0 ? (
                  paginatedDocs.map((doc) => {
                    const isSelected = selectedDocIds.has(doc.id);
                    return (
                      <tr
                        key={doc.id}
                        className={cn(
                          "py-2.5 px-3 border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group",
                          isSelected && "bg-amber-50/30 dark:bg-amber-950/20"
                        )}
                      >
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(doc.id)}
                            className="rounded border-slate-300 dark:border-slate-700"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {doc.docDate}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-[11px]">
                              {doc.documentNumber}
                            </span>
                            {doc.referenceNumber && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                (Ref: {doc.referenceNumber})
                              </span>
                            )}
                            {(doc.notes?.includes("Auto-imported from Sales Invoice") || doc.referenceNumber?.startsWith("INV")) && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.2 rounded-full">
                                <Sparkles className="w-2.5 h-2.5 text-emerald-500" />
                                Auto-Synced
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white">{doc.partyName}</span>
                            {doc.partyPhone && (
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {doc.partyPhone}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={cn(
                              "text-[11px] font-medium",
                              doc.status === "paid"
                                ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                                : calculateDueInText(doc).includes("Overdue")
                                ? "text-rose-600 font-semibold"
                                : "text-slate-500 dark:text-slate-400"
                            )}
                          >
                            {calculateDueInText(doc)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          ₹ {doc.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3">
                          {renderStatusBadge(doc.status, true, doc)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* 1-tap Record Payment Trigger (if unpaid/partial) */}
                            {doc.status !== "paid" && (
                              <button
                                type="button"
                                onClick={() => handleTogglePaymentStatus(doc, "paid")}
                                className="h-6 px-1.5 rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold hover:bg-emerald-100 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                                title="1-Tap Record Payment"
                              >
                                <Check className="w-3 h-3" />
                                <span>Pay</span>
                              </button>
                            )}

                            {/* View / Print Bill */}
                            <button
                              type="button"
                              onClick={() => handleOpenReceipt(doc)}
                              className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded transition-colors cursor-pointer"
                              title="View & Print Bill"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded transition-colors cursor-pointer"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 text-xs">
                                <DropdownMenuItem
                                  onClick={() => handleOpenReceipt(doc)}
                                  className="gap-2"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>View &amp; Print Bill</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingDoc(doc);
                                    setCreateModalOpen(true);
                                  }}
                                  className="gap-2"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Edit Bill</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDuplicate(doc)}
                                  className="gap-2"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Duplicate Bill</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
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
                                      isEstimate: false,
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
                                  }}
                                  className="gap-2"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Download PDF</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    shareInvoicePdfToWhatsApp({
                                      invoiceNumber: doc.documentNumber,
                                      customerName: doc.partyName,
                                      customerPhone: doc.partyPhone,
                                      storeName: "CredSmart Store",
                                      totalAmount: doc.grandTotal,
                                      date: doc.docDate,
                                      isEstimate: false,
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
                                  }}
                                  className="gap-2"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                  <span>Share WhatsApp</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteDocument(doc)}
                                  className="gap-2 text-rose-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete Bill</span>
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
                        <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-200/80 dark:border-slate-700">
                          <Truck className="w-7 h-7 stroke-[1.5]" />
                        </div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          No Transactions Matching the Current Filter
                        </p>
                        <p className="text-xs text-slate-500">
                          Create an inward bill or change the date range preset.
                        </p>
                        <Button
                          onClick={() => {
                            setEditingDoc(null);
                            setCreateModalOpen(true);
                          }}
                          size="sm"
                          className="text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs gap-1.5 mt-1 rounded-lg"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Create Purchase Invoice</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Desktop Pagination */}
            <div className="hidden md:block border-t border-slate-200/80 dark:border-slate-800 p-2">
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

      {/* Floating Help (?) Button */}
      <button
        onClick={() => setShortcutsModalOpen(true)}
        className="fixed bottom-5 right-5 w-9 h-9 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all z-30 font-bold border border-slate-200/50 dark:border-slate-800"
        title="Help & Shortcuts"
        aria-label="Help & Shortcuts"
      >
        <span className="text-sm font-semibold">?</span>
      </button>

      {/* Purchase Invoice Modal */}
      <PurchaseInvoiceModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        orgId={orgId || ""}
        initialDocType={activeTab}
        editingDoc={editingDoc}
        prefilledSupplier={prefilledSupplier}
        onSaved={() => loadDocuments()}
        onPrintRequest={(doc) => handleOpenReceipt(doc)}
      />

      {/* Mobile Scan & OCR Modal */}
      <MobileScanModal
        open={mobileScanModalOpen}
        onOpenChange={setMobileScanModalOpen}
        onFileUploaded={(file) => {
          setEditingDoc(null);
          setCreateModalOpen(true);
        }}
      />

      {/* Settings Modal */}
      <SalesSettingsModal
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
        orgId={orgId || ""}
      />

      {/* Shortcuts Modal */}
      <KeyboardShortcutsModal
        open={shortcutsModalOpen}
        onOpenChange={setShortcutsModalOpen}
      />

      {/* Receipt / Invoice Modal */}
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
    </div>
  );
}
