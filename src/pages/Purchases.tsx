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
  Smartphone,
  X,
  Upload,
} from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { useNetworkInvoices } from "@/hooks/useNetworkInvoices";
import { NetworkInvoicePreviewModal } from "@/components/notifications/NetworkInvoicePreviewModal";
import { NetworkInvoice } from "@/types/networkInvoicing";
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
import { shareInvoicePdfToWhatsApp, downloadInvoicePdf } from "@/utils/whatsappPdfShare";
import { downloadExactInvoicePdf } from "@/utils/downloadExactInvoice";

const PURCHASE_TABS: { id: PurchaseDocumentType; label: string; icon: any }[] = [
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

  // Top banner dismiss state
  const [bannerVisible, setBannerVisible] = useState(true);

  // Network Invoicing
  const {
    pendingInvoices,
    pendingCount,
    approveInvoice,
    rejectInvoice,
    approvingId,
    rejectingId,
  } = useNetworkInvoices();
  const [inspectingInvoice, setInspectingInvoice] = useState<NetworkInvoice | null>(null);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<BusinessDocument | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [mobileScanModalOpen, setMobileScanModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

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
    return () => {
      window.removeEventListener("credsmart_network_update", handleReload);
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

  return (
    <div className="h-full flex flex-col w-full bg-slate-50/60 dark:bg-slate-950/40 select-none overflow-hidden font-sans">
      {/* Sub-document Tabs Navigation Bar - Frosted Glass Ribbon */}
      <div className="w-full bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-5 shrink-0 overflow-x-auto scrollbar-none h-11 flex items-center">
        <div className="flex items-center gap-1.5 min-w-max">
          {PURCHASE_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 relative cursor-pointer active:scale-95",
                  isActive
                    ? "glowing-btn-amber text-amber-300 shadow-sm"
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
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
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
                  className="h-8 px-2.5 text-xs font-semibold gap-1.5 border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-foreground hover:bg-muted/80 shadow-2xs rounded-xl"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Reports</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5" />
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

            {/* Settings Cog with Red Dot */}
            <button
              onClick={() => setSettingsModalOpen(true)}
              className="relative p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 text-muted-foreground hover:text-foreground transition-colors shadow-2xs cursor-pointer"
              title="Purchase Preferences"
              aria-label="Purchase Preferences"
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

        {/* ───────────────────────────────────────────────────────────── */}
        {/* PENDING INWARD INVOICES (AUTO-SYNC APPROVAL BANNER) */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === "purchase_invoice" && pendingInvoices.length > 0 && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-primary/5 border border-amber-500/30 shadow-md shrink-0 space-y-3 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                    <span>Incoming Sales Invoices Awaiting Inward Approval</span>
                    <Badge className="bg-amber-500 text-white font-bold text-[10px] px-2 py-0.2 rounded-full font-mono">
                      {pendingInvoices.length} Pending
                    </Badge>
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Other CredSmart businesses generated invoices in your name. Approving will automatically record them as inward purchase bills.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {pendingInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-3 rounded-xl bg-card border border-amber-500/30 shadow-xs flex flex-col justify-between gap-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        Sale was Created by <span className="text-primary">{inv.senderOrgName}</span> on your name
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                        <span className="font-mono font-medium text-foreground bg-muted px-1.5 py-0.2 rounded">
                          #{inv.invoiceNumber}
                        </span>
                        <span>·</span>
                        <span>{inv.docDate}</span>
                        <span>·</span>
                        <span>{inv.items.length} item{inv.items.length > 1 ? "s" : ""}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                        ₹{inv.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60 gap-2 flex-wrap sm:flex-nowrap">
                    <button
                      type="button"
                      onClick={() => {
                        setInspectingInvoice(inv);
                        setInspectModalOpen(true);
                      }}
                      className="text-xs text-primary hover:underline font-bold flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-primary/5 active:scale-95 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Bill</span>
                    </button>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 sm:h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-300 dark:border-rose-800 font-semibold px-3 active:scale-95 flex-1 sm:flex-none"
                        onClick={async () => {
                          await rejectInvoice(inv.id);
                          await loadDocuments();
                        }}
                        disabled={rejectingId === inv.id || approvingId === inv.id}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="h-9 sm:h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 active:scale-95 flex-1 sm:flex-none shadow-xs"
                        onClick={async () => {
                          const ok = await approveInvoice(inv.id);
                          if (ok) await loadDocuments();
                        }}
                        disabled={approvingId === inv.id || rejectingId === inv.id}
                      >
                        {approvingId === inv.id ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Approve &amp; Inward
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3 Frosted 3D Glass Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 shrink-0">
          {/* Total Purchases */}
          <div
            onClick={() => setStatusFilter("all")}
            className={cn(
              "glass-card-3d p-2.5 sm:p-3.5 transition-all cursor-pointer relative overflow-hidden group select-none",
              statusFilter === "all"
                ? "ring-2 ring-amber-500/40 bg-amber-50/30 dark:bg-amber-950/30"
                : "hover:scale-[1.01]"
            )}
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 via-orange-500 to-rose-600 rounded-l-2xl shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-amber-600 dark:text-amber-400 font-mono uppercase tracking-wider">
              <Truck className="w-3.5 h-3.5" />
              <span>Total Purchases</span>
            </div>
            <div className="mt-0.5 sm:mt-1 text-sm sm:text-lg font-black text-slate-900 dark:text-white font-mono tracking-tight truncate">
              ₹ {metrics.totalAmount.toLocaleString("en-IN")}
            </div>
            <p className="hidden sm:block text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Inward bills &amp; vendor orders</p>
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
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Paid Out</span>
            </div>
            <div className="mt-0.5 sm:mt-1 text-sm sm:text-lg font-black text-slate-900 dark:text-white font-mono tracking-tight truncate">
              ₹ {metrics.paidAmount.toLocaleString("en-IN")}
            </div>
            <p className="hidden sm:block text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Supplier payments cleared</p>
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
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-rose-400 via-red-500 to-rose-700 rounded-l-2xl shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-rose-600 dark:text-rose-400 font-mono uppercase tracking-wider">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Vendor Payables</span>
            </div>
            <div className="mt-0.5 sm:mt-1 text-sm sm:text-lg font-black text-slate-900 dark:text-white font-mono tracking-tight truncate">
              ₹ {metrics.unpaidAmount.toLocaleString("en-IN")}
            </div>
            <p className="hidden sm:block text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Pending supplier bills</p>
          </div>
        </div>

        {/* Filter Bar - Frosted Glass Container */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs shrink-0">
          {/* Left: Search & Date Picker */}
          <div className="flex items-center gap-2 flex-1 max-w-xl flex-wrap">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by bill #, supplier name, mobile..."
                className="pl-8 h-9 text-xs bg-slate-50/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>

            {/* Date Range Selector */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 text-xs font-medium border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 rounded-xl gap-1.5 shadow-xs shrink-0"
                >
                  <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{selectedPreset}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-3">
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
          </div>

          {/* Right: Glowing Create Purchase Invoice Button */}
          <div className="flex items-center gap-2 shrink-0">
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

        {/* Transactions Table Card / Mobile Stream - 3D Glass Container */}
        <div className="flex-1 min-h-0 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl flex flex-col overflow-hidden shadow-sm">
          {/* MOBILE VIEW: Touch Transaction Cards (Visible on screens < md) */}
          <div className="block md:hidden flex-1 min-h-0 overflow-y-auto p-2.5 pb-28 space-y-2.5 scrollbar-thin">
            {filteredDocuments.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-muted/60 border border-border flex items-center justify-center text-muted-foreground mx-auto">
                  <Truck className="w-7 h-7 stroke-[1.5]" />
                </div>
                <p className="text-xs font-bold text-foreground">No Purchases Found</p>
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                  No records match current filter. Tap below to record your first {activeTabMeta.label.replace(/s$/, "")}.
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-xs bg-muted px-2 py-0.5 rounded border border-border/60 text-foreground">
                            {doc.documentNumber}
                          </span>
                          {doc.referenceNumber && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Ref: {doc.referenceNumber}
                            </span>
                          )}
                          {(doc.notes?.includes("Auto-imported from Sales Invoice") || doc.referenceNumber?.startsWith("INV")) && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.2 rounded-full">
                              <Sparkles className="w-2.5 h-2.5 text-emerald-500" />
                              Auto-Synced
                            </span>
                          )}
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize",
                              (doc.status === "paid" || doc.status === "received") && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800",
                              doc.status === "partial" && "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800",
                              doc.status === "unpaid" && "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800",
                              doc.status === "draft" && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300"
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
                        {/* 1. View Bill (Print) */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReceipt(doc)}
                          className="h-7 px-2 text-[11px] font-semibold gap-1 border-border bg-white dark:bg-slate-900 shadow-2xs cursor-pointer"
                          title="View / Print Bill"
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
                              discountAmount: doc.discountAmount,
                              tax: doc.taxAmount,
                              date: doc.docDate,
                              isEstimate: false,
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

                        {/* 3. WhatsApp Share */}
                        <Button
                          variant="outline"
                          size="sm"
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
                                rate: it.rate,
                                total: it.lineTotal,
                              })),
                            });
                          }}
                          className="h-7 px-2 text-[11px] font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-2xs cursor-pointer"
                          title="Share to WhatsApp"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </Button>

                        {/* 4. More Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem onClick={() => handleOpenReceipt(doc)} className="gap-2 font-semibold">
                              <Printer className="w-3.5 h-3.5 text-indigo-600" />
                              <span>View / Print Bill</span>
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
                                  discountAmount: doc.discountAmount,
                                  tax: doc.taxAmount,
                                  date: doc.docDate,
                                  isEstimate: false,
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
                                  storeName: "CredSmart Store",
                                  totalAmount: doc.grandTotal,
                                  date: doc.docDate,
                                  isEstimate: false,
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
                              <span>Edit Bill</span>
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

          {/* DESKTOP VIEW: Untouched Desktop Data Table (Visible on md: and above) */}
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
                  <th className="py-3 px-3">Purchase Invoice Number</th>
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
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-semibold text-foreground px-2 py-0.5 rounded bg-muted/60 border border-border/50 text-[11px]">
                              {doc.documentNumber}
                            </span>
                            {doc.referenceNumber && (
                              <span className="text-[10px] text-muted-foreground font-mono">
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
                              (doc.status === "paid" || doc.status === "received") && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800",
                              doc.status === "partial" && "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800",
                              doc.status === "unpaid" && "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800",
                              doc.status === "draft" && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300"
                            )}
                          >
                            {doc.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
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
                                <DropdownMenuItem onClick={handleExportCSV} className="gap-2">
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Download CSV</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
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
                  // Empty State matching Capture5.PNG
                  <tr>
                    <td colSpan={8} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400">
                          <Truck className="w-8 h-8 stroke-current" />
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
                          Create Purchase Invoice
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

      {/* Floating Help (?) Button */}
      <button
        onClick={() => setShortcutsModalOpen(true)}
        className="fixed bottom-5 right-5 w-10 h-10 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center shadow-xl hover:scale-105 transition-all z-30 font-bold"
        title="Help & Shortcuts"
        aria-label="Help & Shortcuts"
      >
        <span className="text-base font-semibold">?</span>
      </button>

      {/* Purchase Invoice Modal */}
      <PurchaseInvoiceModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        orgId={orgId || ""}
        initialDocType={activeTab}
        editingDoc={editingDoc}
        onSaved={() => loadDocuments()}
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

      {/* Incoming B2B Network Invoice Inspection Modal */}
      <NetworkInvoicePreviewModal
        open={inspectModalOpen}
        onOpenChange={setInspectModalOpen}
        invoice={inspectingInvoice}
        onApprove={async (id) => {
          const ok = await approveInvoice(id);
          if (ok) await loadDocuments();
        }}
        onReject={async (id) => {
          await rejectInvoice(id);
          await loadDocuments();
        }}
        isApproving={approvingId === inspectingInvoice?.id}
        isRejecting={rejectingId === inspectingInvoice?.id}
      />
    </div>
  );
}
