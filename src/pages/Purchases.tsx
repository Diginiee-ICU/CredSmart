import { useState, useEffect, useCallback, useMemo } from "react";
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
          hsn: it.hsn || "",
          gstRate: it.taxRate || 0,
        },
        batch: {
          mrp: it.rate,
          batchNumber: it.batchNumber || "BATCH-01",
          expiryDate: it.expiryDate,
        },
        quantity: it.quantity,
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
    <div className="flex flex-col min-h-full w-full bg-slate-50/60 dark:bg-slate-950/40 select-none pb-12">
      {/* Sub-document Tabs Navigation Bar */}
      <div className="w-full bg-card/95 border-b border-border/80 px-4 sm:px-6 pt-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 min-w-max pb-2">
          {PURCHASE_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 relative",
                  isActive
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
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
      <div className="flex-1 px-3 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5 max-w-7xl w-full mx-auto">
        {/* Top Header matching Capture5.PNG */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              {activeTabMeta.label}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Reports Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 text-xs font-semibold gap-1.5 border-border bg-card text-foreground hover:bg-muted/80 shadow-2xs"
                >
                  <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Reports</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
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
              className="relative p-2 rounded-lg border border-border bg-card hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors shadow-2xs"
              title="Purchase Preferences"
              aria-label="Purchase Preferences"
            >
              <Settings className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-card animate-pulse" />
            </button>

            {/* Keyboard Shortcuts Button */}
            <button
              onClick={() => setShortcutsModalOpen(true)}
              className="p-2 rounded-lg border border-border bg-card hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors shadow-2xs"
              title="Keyboard Shortcuts"
              aria-label="Keyboard Shortcuts"
            >
              <Keyboard className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Top Dark Banner matching Capture5.PNG */}
        {bannerVisible && (
          <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-3.5 sm:p-4 shadow-xl border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden">
            {/* Left side: Icon + Text */}
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-200">
                  Skip typing - <span className="font-bold text-amber-400">Add purchases from your phone</span>
                </p>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                  Upload photo/pdf, purchase made in seconds.
                </p>
              </div>
            </div>

            {/* Right side: Try on Mobile button & Close button */}
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                onClick={() => setMobileScanModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs shadow-md transition-all hover:scale-105 active:scale-95"
              >
                Try on Mobile
              </button>
              <button
                onClick={() => setBannerVisible(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Dismiss Banner"
                aria-label="Dismiss Banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 3 Metric Cards matching Capture5.PNG */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Total Purchases */}
          <div
            onClick={() => setStatusFilter("all")}
            className={cn(
              "p-4 rounded-xl border bg-card transition-all cursor-pointer shadow-2xs",
              statusFilter === "all"
                ? "border-indigo-500/80 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20"
                : "border-border/80 hover:border-indigo-300"
            )}
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <Truck className="w-4 h-4" />
              <span>Total Purchases</span>
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-bold text-foreground font-mono">
              ₹ {metrics.totalAmount.toLocaleString("en-IN")}
            </div>
          </div>

          {/* Paid */}
          <div
            onClick={() => setStatusFilter("paid")}
            className={cn(
              "p-4 rounded-xl border bg-card transition-all cursor-pointer shadow-2xs",
              statusFilter === "paid"
                ? "border-emerald-500/80 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20"
                : "border-border/80 hover:border-emerald-300"
            )}
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Paid</span>
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-bold text-foreground font-mono">
              ₹ {metrics.paidAmount.toLocaleString("en-IN")}
            </div>
          </div>

          {/* Unpaid */}
          <div
            onClick={() => setStatusFilter("unpaid")}
            className={cn(
              "p-4 rounded-xl border bg-card transition-all cursor-pointer shadow-2xs",
              statusFilter === "unpaid"
                ? "border-rose-500/80 ring-2 ring-rose-500/20 bg-rose-50/20 dark:bg-rose-950/20"
                : "border-border/80 hover:border-rose-300"
            )}
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-4 h-4" />
              <span>Unpaid</span>
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-bold text-foreground font-mono">
              ₹ {metrics.unpaidAmount.toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        {/* Filter Bar matching Capture5.PNG */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Search & Date Picker */}
          <div className="flex items-center gap-2.5 flex-1 max-w-xl">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by bill #, supplier name, mobile..."
                className="pl-9 h-9 text-xs bg-card border-border/80 shadow-2xs"
              />
            </div>

            {/* Date Range Selector */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 text-xs font-medium border-border/80 bg-card gap-2 shadow-2xs shrink-0"
                >
                  <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{selectedPreset}</span>
                  <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground ml-1" />
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

          {/* Right: + Create Purchase Invoice Button */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={() => {
                setEditingDoc(null);
                setCreateModalOpen(true);
              }}
              size="sm"
              className="h-9 px-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create {activeTabMeta.label.replace(/s$/, "")}</span>
            </Button>
          </div>
        </div>

        {/* Transactions Table Card matching Capture5.PNG */}
        <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
          <div className="overflow-x-auto w-full pb-2 scrollbar-thin min-h-[380px] flex flex-col justify-between">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-border">
                  <th className="py-3 px-4 w-10">
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
                {filteredDocuments.length > 0 ? (
                  filteredDocuments.map((doc) => {
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
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-semibold text-foreground px-2 py-0.5 rounded bg-muted/60 border border-border/50 text-[11px]">
                              {doc.documentNumber}
                            </span>
                            {doc.referenceNumber && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                (Ref: {doc.referenceNumber})
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
    </div>
  );
}
