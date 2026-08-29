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

const TABS: { id: SalesDocumentType; label: string; icon: any }[] = [
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
  const [sortField, setSortField] = useState<"docDate" | "grandTotal">("docDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

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
      date: doc.docDate,
      dueDate: doc.dueDate,
      isEstimate: doc.docType === "quotation",
      notes: doc.notes,
      terms: doc.terms,
    };
    setReceiptData(receipt);
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
      {/* Sub-document Tabs Navigation Bar - Frosted Glass Ribbon */}
      <div className="w-full bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-5 shrink-0 overflow-x-auto scrollbar-none h-11 flex items-center">
        <div className="flex items-center gap-1.5 min-w-max">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 relative cursor-pointer active:scale-95",
                  isActive
                    ? "glowing-btn-blue text-blue-900 dark:text-blue-100 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
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
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-sans">
              {activeTabMeta.label}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
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
                  className="h-8 px-2.5 text-xs font-semibold gap-1.5 border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-foreground hover:bg-muted/80 shadow-2xs rounded-xl"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Reports</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5" />
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

            {/* Settings Cog with Red Notification Dot */}
            <button
              onClick={() => setSettingsModalOpen(true)}
              className="relative p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 text-muted-foreground hover:text-foreground transition-colors shadow-2xs cursor-pointer"
              title="Sales & Invoicing Preferences"
              aria-label="Sales Preferences"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-card animate-pulse" />
            </button>

            {/* Keyboard Shortcuts Button */}
            <button
              onClick={() => setShortcutsModalOpen(true)}
              className="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 text-muted-foreground hover:text-foreground transition-colors shadow-2xs cursor-pointer"
              title="Keyboard Shortcuts"
              aria-label="Keyboard Shortcuts"
            >
              <Keyboard className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Metric Cards - 3D Glass Cards (Compact on Mobile) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 shrink-0">
          {/* Total Volume */}
          <div
            onClick={() => setStatusFilter("all")}
            className={cn(
              "glass-card-3d p-2.5 sm:p-3.5 transition-all cursor-pointer relative overflow-hidden group select-none",
              statusFilter === "all"
                ? "ring-2 ring-blue-500/40 bg-blue-50/30 dark:bg-blue-950/30"
                : "hover:scale-[1.01]"
            )}
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 via-blue-500 to-indigo-600 rounded-l-2xl shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-blue-600 dark:text-blue-400 font-mono uppercase tracking-wider truncate">
              <Receipt className="w-3.5 h-3.5 shrink-0" />
              <span>Total Volume</span>
            </div>
            <div className="mt-0.5 sm:mt-1 text-sm sm:text-lg font-black text-slate-900 dark:text-white font-mono tracking-tight truncate">
              ₹ {metrics.totalAmount.toLocaleString("en-IN")}
            </div>
            <p className="hidden sm:block text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">All outward documents</p>
          </div>

          {/* Paid */}
          <div
            onClick={() => setStatusFilter("paid")}
            className={cn(
              "glass-card-3d p-2.5 sm:p-3.5 transition-all cursor-pointer relative overflow-hidden group select-none",
              statusFilter === "paid"
                ? "ring-2 ring-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/30"
                : "hover:scale-[1.01]"
            )}
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 via-teal-500 to-green-600 rounded-l-2xl shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono uppercase tracking-wider truncate">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Settled</span>
            </div>
            <div className="mt-0.5 sm:mt-1 text-sm sm:text-lg font-black text-slate-900 dark:text-white font-mono tracking-tight truncate">
              ₹ {metrics.paidAmount.toLocaleString("en-IN")}
            </div>
            <p className="hidden sm:block text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Cash / UPI / Bank cleared</p>
          </div>

          {/* Unpaid */}
          <div
            onClick={() => setStatusFilter("unpaid")}
            className={cn(
              "glass-card-3d p-2.5 sm:p-3.5 transition-all cursor-pointer relative overflow-hidden group select-none",
              statusFilter === "unpaid"
                ? "ring-2 ring-rose-500/40 bg-rose-50/30 dark:bg-rose-950/30"
                : "hover:scale-[1.01]"
            )}
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 via-rose-500 to-red-600 rounded-l-2xl shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-rose-600 dark:text-rose-400 font-mono uppercase tracking-wider truncate">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Receivables</span>
            </div>
            <div className="mt-0.5 sm:mt-1 text-sm sm:text-lg font-black text-slate-900 dark:text-white font-mono tracking-tight truncate">
              ₹ {metrics.unpaidAmount.toLocaleString("en-IN")}
            </div>
            <p className="hidden sm:block text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Pending customer credit</p>
          </div>

          {/* Cancelled */}
          <div
            onClick={() => setStatusFilter("cancelled")}
            className={cn(
              "glass-card-3d p-2.5 sm:p-3.5 transition-all cursor-pointer relative overflow-hidden group select-none",
              statusFilter === "cancelled"
                ? "ring-2 ring-slate-500/40 bg-slate-50/30 dark:bg-slate-900/30"
                : "hover:scale-[1.01]"
            )}
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-slate-400 via-slate-500 to-slate-700 rounded-l-2xl shadow-[0_0_8px_rgba(100,116,139,0.5)]" />
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider truncate">
              <XCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Voided</span>
            </div>
            <div className="mt-0.5 sm:mt-1 text-sm sm:text-lg font-black text-slate-900 dark:text-white font-mono tracking-tight truncate">
              {metrics.cancelledAmount > 0 ? `₹ ${metrics.cancelledAmount.toLocaleString("en-IN")}` : "—"}
            </div>
            <p className="hidden sm:block text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Cancelled vouchers</p>
          </div>
        </div>

        {/* Filter Bar - Frosted Glass Container */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs shrink-0 glass-panel">
          <div className="flex flex-1 items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by party, phone, invoice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs bg-slate-50/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>

            {/* Date Range Preset Selector */}
            <Select value={selectedPreset} onValueChange={handleDatePresetChange}>
              <SelectTrigger className="h-9 w-[140px] text-xs bg-slate-50/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl">
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
              <SelectTrigger className="h-9 w-[120px] text-xs bg-slate-50/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl">
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
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Bulk Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 text-xs font-semibold gap-1.5 border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 rounded-xl shadow-xs"
                >
                  <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Bulk Actions</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleExportCSV} className="gap-2">
                  <Download className="w-4 h-4" />
                  <span>Export to Excel/CSV</span>
                </DropdownMenuItem>
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
                  <Printer className="w-4 h-4" />
                  <span>Print Selected ({selectedDocIds.size})</span>
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

            {/* Glowing Create Sales Invoice Button */}
            <button
              onClick={() => {
                setEditingDoc(null);
                setCreateModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl glowing-btn-amber text-white font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create {activeTabMeta.label.replace(/s$/, "")}</span>
            </button>
          </div>
        </div>

        {/* Transactions Table Card / Mobile Card Stream - 3D Glass Container */}
        <div className="flex-1 min-h-0 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl flex flex-col overflow-hidden shadow-sm">
          {/* MOBILE VIEW: Touch Transaction Cards (Visible on screens < md) */}
          <div className="block md:hidden flex-1 min-h-0 overflow-y-auto p-2.5 pb-28 space-y-2.5 scrollbar-thin">
            {filteredDocuments.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-muted/60 border border-border flex items-center justify-center text-muted-foreground mx-auto">
                  <FileText className="w-7 h-7 stroke-[1.5]" />
                </div>
                <p className="text-xs font-bold text-foreground">No Transactions Found</p>
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                  No records match current filter. Tap below to create your first {activeTabMeta.label.replace(/s$/, "")}.
                </p>
                <Button
                  onClick={() => {
                    setEditingDoc(null);
                    setCreateModalOpen(true);
                  }}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 mt-1 gap-1.5 shadow-xs"
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
                      "p-3.5 rounded-2xl border transition-all bg-card space-y-2.5 shadow-2xs active:scale-[0.99]",
                      isSelected
                        ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20"
                        : "border-border/80 hover:border-border"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs bg-muted px-2 py-0.5 rounded border border-border/60 text-foreground">
                            {doc.documentNumber}
                          </span>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize",
                              doc.status === "paid" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800",
                              doc.status === "partial" && "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800",
                              doc.status === "unpaid" && "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800",
                              doc.status === "draft" && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300",
                              doc.status === "cancelled" && "bg-gray-100 text-gray-500 line-through"
                            )}
                          >
                            {doc.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-foreground mt-1">{doc.partyName}</h4>
                        {doc.partyPhone && (
                          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{doc.partyPhone}</p>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-base font-black font-mono text-foreground">
                          ₹ {doc.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{doc.docDate}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/60">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {calculateDueInText(doc)}
                      </span>

                      <div className="flex items-center gap-1 sm:gap-1.5">
                        {/* 1. Print Receipt */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReceipt(doc)}
                          className="h-7 px-2 text-[11px] font-semibold gap-1 border-border bg-white dark:bg-slate-900 shadow-2xs cursor-pointer"
                          title="Print Invoice"
                        >
                          <Printer className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="hidden sm:inline">Print</span>
                        </Button>

                        {/* 2. Download PDF */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            downloadExactInvoicePdf({
                              invoiceNumber: doc.documentNumber,
                              docType: doc.docType as any,
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
                                rate: it.rate,
                                total: it.lineTotal,
                              })),
                            });
                          }}
                          className="h-7 px-2 text-[11px] font-semibold border-amber-400/40 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/30 shadow-2xs cursor-pointer gap-1"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">PDF</span>
                        </Button>

                        {/* 3. WhatsApp PDF Share */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
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
                                rate: it.rate,
                                total: it.lineTotal,
                              })),
                            });
                          }}
                          className="h-7 px-2 text-[11px] font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-2xs cursor-pointer"
                          title="Share to WhatsApp"
                        >
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                          </svg>
                        </Button>

                        {/* 4. Dropdown Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem
                              onClick={() => handleOpenReceipt(doc)}
                              className="gap-2 font-semibold"
                            >
                              <Printer className="w-3.5 h-3.5 text-indigo-600" />
                              <span>View / Print Receipt</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                downloadExactInvoicePdf({
                                  invoiceNumber: doc.documentNumber,
                                  docType: doc.docType as any,
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
                                    rate: it.rate,
                                    total: it.lineTotal,
                                  })),
                                });
                              }}
                              className="gap-2 font-semibold text-amber-600 dark:text-amber-400"
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
                                  storeName: org?.name || "CredSmart Store",
                                  storePhone: org?.phone,
                                  totalAmount: doc.grandTotal,
                                  date: doc.docDate,
                                  isEstimate: doc.docType === "quotation",
                                  items: doc.items.map((it) => ({
                                    name: it.productName,
                                    quantity: it.quantity,
                                    rate: it.rate,
                                    total: it.lineTotal,
                                  })),
                                });
                              }}
                              className="gap-2 font-semibold text-emerald-600 dark:text-emerald-400"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Share PDF to WhatsApp</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingDoc(doc);
                                setCreateModalOpen(true);
                              }}
                              className="gap-2"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Edit Document</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteDocument(doc)}
                              className="gap-2 text-rose-600"
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
          <div className="md:hidden">
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

          {/* DESKTOP VIEW: Untouched Data Table (Visible on md: and above) */}
          <div className="hidden md:flex flex-1 min-h-0 overflow-y-auto overflow-x-auto w-full scrollbar-thin flex-col justify-between">
            <table className="w-full text-left text-xs border-collapse min-w-[640px]">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur-xs z-10">
                <tr className="text-slate-700 dark:text-slate-300 font-semibold border-b border-border text-[10px] sm:text-[11px] uppercase tracking-wider font-mono">
                  <th className="py-2.5 px-3 w-10">
                    <input
                      type="checkbox"
                      checked={
                        filteredDocuments.length > 0 &&
                        selectedDocIds.size === filteredDocuments.length
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-border"
                    />
                  </th>
                  <th
                    onClick={() => {
                      setSortField("docDate");
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    }}
                    className="py-3 px-3 cursor-pointer hover:text-foreground select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Date</span>
                      <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                    </div>
                  </th>
                  <th className="py-3 px-3">Invoice Number</th>
                  <th className="py-3 px-3">Party Name</th>
                  <th className="py-3 px-3">Due In</th>
                  <th
                    onClick={() => {
                      setSortField("grandTotal");
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    }}
                    className="py-3 px-3 cursor-pointer hover:text-foreground select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Amount</span>
                      <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                    </div>
                  </th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 w-16 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border/60">
                {paginatedDocs.length > 0 ? (
                  paginatedDocs.map((doc) => {
                    const isSelected = selectedDocIds.has(doc.id);
                    return (
                      <tr
                        key={doc.id}
                        className={cn(
                          "hover:bg-muted/30 transition-colors group",
                          isSelected && "bg-indigo-50/30 dark:bg-indigo-950/20"
                        )}
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(doc.id)}
                            className="rounded border-border"
                          />
                        </td>
                        <td className="py-3 px-3 font-mono text-muted-foreground">
                          {doc.docDate}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono font-semibold text-foreground px-2 py-0.5 rounded bg-muted/60 border border-border/50 text-[11px]">
                            {doc.documentNumber}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div>
                            <span className="font-semibold text-foreground">{doc.partyName}</span>
                            {doc.partyPhone && (
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                {doc.partyPhone}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={cn(
                              "text-[11px] font-medium",
                              doc.status === "paid"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : calculateDueInText(doc).includes("Overdue")
                                ? "text-rose-600 font-semibold"
                                : "text-muted-foreground"
                            )}
                          >
                            {calculateDueInText(doc)}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-foreground">
                          ₹ {doc.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize",
                              doc.status === "paid" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800",
                              doc.status === "partial" && "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800",
                              doc.status === "unpaid" && "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800",
                              doc.status === "draft" && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300",
                              doc.status === "cancelled" && "bg-gray-100 text-gray-500 line-through"
                            )}
                          >
                            {doc.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 1. Print Receipt - always visible indigo */}
                            <button
                              type="button"
                              onClick={() => handleOpenReceipt(doc)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer text-[11px] font-semibold"
                              title="Print / View Receipt"
                            >
                              <Printer className="w-3 h-3 shrink-0" />
                              <span>Print</span>
                            </button>

                            {/* 2. Download PDF - always visible amber */}
                            <button
                              type="button"
                              onClick={() => {
                                downloadExactInvoicePdf({
                                  invoiceNumber: doc.documentNumber,
                                  docType: doc.docType as any,
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
                                    rate: it.rate,
                                    total: it.lineTotal,
                                  })),
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors cursor-pointer text-[11px] font-semibold"
                              title="Download PDF"
                            >
                              <Download className="w-3 h-3 shrink-0" />
                              <span>PDF</span>
                            </button>

                            {/* 3. WhatsApp PDF Share - always visible emerald */}
                            <button
                              type="button"
                              onClick={() => {
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
                                    rate: it.rate,
                                    total: it.lineTotal,
                                  })),
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer text-[11px] font-semibold"
                              title="Share PDF to WhatsApp"
                            >
                              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current shrink-0" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                              </svg>
                              <span>WA</span>
                            </button>

                            {/* 4. Dropdown Menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem onClick={() => handleOpenReceipt(doc)} className="gap-2 font-semibold">
                                  <Printer className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>View / Print Receipt</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    downloadExactInvoicePdf({
                                      invoiceNumber: doc.documentNumber,
                                      docType: doc.docType as any,
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
                                        rate: it.rate,
                                        total: it.lineTotal,
                                      })),
                                    });
                                  }}
                                  className="gap-2 font-semibold text-amber-600 dark:text-amber-400 cursor-pointer"
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
                                      storeName: org?.name || "CredSmart Store",
                                      storePhone: org?.phone,
                                      totalAmount: doc.grandTotal,
                                      date: doc.docDate,
                                      isEstimate: doc.docType === "quotation",
                                      items: doc.items.map((it) => ({
                                        name: it.productName,
                                        quantity: it.quantity,
                                        rate: it.rate,
                                        total: it.lineTotal,
                                      })),
                                    });
                                  }}
                                  className="gap-2 font-semibold text-emerald-600 dark:text-emerald-400 cursor-pointer"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                  <span>Share PDF to WhatsApp</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingDoc(doc);
                                    setCreateModalOpen(true);
                                  }}
                                  className="gap-2"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Edit Document</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteDocument(doc)}
                                  className="gap-2 text-rose-600"
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
                  // Empty State matching Capture4.PNG exactly
                  <tr>
                    <td colSpan={8} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                        {/* Empty Icon matching Capture4.PNG */}
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400">
                          <svg
                            className="w-10 h-10 stroke-current"
                            viewBox="0 0 24 24"
                            fill="none"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="8" y1="13" x2="16" y2="13" />
                            <line x1="8" y1="17" x2="12" y2="17" />
                            <path d="M16 17l4 4m0-4l-4 4" />
                          </svg>
                        </div>
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                          No Transactions Matching the current filter
                        </p>
                        <Button
                          onClick={() => {
                            setEditingDoc(null);
                            setCreateModalOpen(true);
                          }}
                          size="sm"
                          className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs gap-1 mt-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Create Sales Invoice
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Desktop Pagination */}
            <div className="hidden md:block">
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

      {/* Floating Help (?) Button at bottom right matching Capture4 */}
      <button
        onClick={() => setShortcutsModalOpen(true)}
        className="fixed bottom-5 right-5 w-10 h-10 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center shadow-xl hover:scale-105 transition-all z-30 font-bold"
        title="Help & Shortcuts"
        aria-label="Help & Shortcuts"
      >
        <span className="text-base font-semibold">?</span>
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
    </div>
  );
}
