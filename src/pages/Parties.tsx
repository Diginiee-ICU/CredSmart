import { useState, useEffect, useMemo, useCallback } from "react";
import { usePagination } from "@/hooks/usePagination";
import { PaginationBar } from "@/components/ui/PaginationBar";
import {
  Users2,
  Share2,
  FileSpreadsheet,
  Settings,
  Keyboard,
  X,
  Search,
  Plus,
  ArrowUpDown,
  MoreVertical,
  Phone,
  MessageSquare,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Trash2,
  Edit,
  FileText,
  CreditCard,
  Download,
  Printer,
  CheckSquare,
  Square,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Zap,
  ShieldCheck,
  RefreshCw,
  CheckCheck,
  RotateCcw,
} from "lucide-react";
import { Party, PartyType } from "@/types/parties";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { CreatePartyModal } from "@/components/parties/CreatePartyModal";
import { SharedLedgerModal } from "@/components/parties/SharedLedgerModal";
import { PartyReportsModal } from "@/components/parties/PartyReportsModal";
import { PartySettingsModal } from "@/components/parties/PartySettingsModal";
import { PartyExcelUploadModal } from "@/components/parties/PartyExcelUploadModal";
import { PartyHelpTooltip } from "@/components/parties/PartyHelpTooltip";
import { exportPartiesToCSV, downloadCSV } from "@/utils/excelImportExport";
import {
  performFullLedgerReconciliation,
  downloadReconciliationAuditCSV,
  downloadPartyStatementCSV,
  reconcilePartyLedger,
  OrganizationReconciliationAudit,
} from "@/utils/ledgerReconciliation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import { ROUTE_PATHS } from "@/config/routes";

const DEFAULT_SAMPLE_PARTIES: Party[] = [];

type CreditTransactionRecord = {
  party_id: string;
  party_type: "customer" | "supplier";
  amount: number | string | null;
  type: "credit" | "payment";
  created_at?: string;
  reference_id?: string | null;
  description?: string | null;
};

export default function Parties() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orgId, org, loading: orgLoading } = useOrganization();
  const { user } = useAuth();

  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Sorting
  const [sortField, setSortField] = useState<"name" | "balance" | "created_at">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Banners & Modals
  const [showLedgerBanner, setShowLedgerBanner] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [showSharedLedgerModal, setShowSharedLedgerModal] = useState(false);
  const [sharedLedgerSelectedParty, setSharedLedgerSelectedParty] = useState<Party | null>(null);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [reportModalType, setReportModalType] = useState<"statement" | "receivables" | "payables" | "all">("all");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showKeyboardModal, setShowKeyboardModal] = useState(false);
  const [showExcelUploadModal, setShowExcelUploadModal] = useState(false);
  const [excelModalTab, setExcelModalTab] = useState<"excel" | "software">("excel");
  const [showReconciliationModal, setShowReconciliationModal] = useState(false);
  const [auditResult, setAuditResult] = useState<OrganizationReconciliationAudit | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [rawCreditTransactions, setRawCreditTransactions] = useState<CreditTransactionRecord[]>([]);

  // Fetch Parties from Supabase (customers + suppliers + credit balances)
  const fetchParties = useCallback(async () => {
    if (!orgId) {
      setParties([]);
      setAuditResult(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch Customers
      const { data: dbCustomers, error: custErr } = await supabase
        .from("customers")
        .select("id, name, phone, email, address, trade_name, pan, pincode, shipping_address, custom_fields, credit_limit, credit_period_days, category, created_at")
        .eq("organization_id", orgId);

      // 2. Fetch Suppliers
      const { data: dbSuppliers, error: suppErr } = await supabase
        .from("suppliers")
        .select("id, name, phone, email, address, gstin, trade_name, pan, pincode, shipping_address, custom_fields, credit_limit, credit_period_days, category, created_at")
        .eq("organization_id", orgId);

      // 3. Fetch Credit Transactions
      const { data: credits, error: creditErr } = await supabase
        .from("credit_transactions")
        .select("party_id, party_type, amount, type, created_at, reference_id, description")
        .eq("organization_id", orgId);

      setRawCreditTransactions(credits || []);

      const creditBalanceMap: Record<string, number> = {};
      (credits || []).forEach((c) => {
        const amt = Number(c.amount) || 0;
        const current = creditBalanceMap[c.party_id] || 0;
        if (c.type === "credit") {
          creditBalanceMap[c.party_id] = current + amt;
        } else if (c.type === "payment") {
          creditBalanceMap[c.party_id] = current - amt;
        }
      });

      const mergedParties: Party[] = [];

      const parsePartyCustomFields = (rawCf: any /* eslint-disable-line @typescript-eslint/no-explicit-any */, rawRecord: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {  
        let cf = rawCf;
        if (typeof cf === "string") {
          try {
            cf = JSON.parse(cf);
          } catch {
            cf = {};
          }
        }
        if (!cf || typeof cf !== "object") cf = {};

        let customItems = cf.customItems || cf.custom_items || rawRecord?.custom_items || rawRecord?.customItems;
        if (typeof customItems === "string") {
          try {
            customItems = JSON.parse(customItems);
          } catch {
            customItems = [];
          }
        }
        if (!Array.isArray(customItems)) customItems = [];

        const keepSamePrice = cf.keepSamePrice !== false && cf.keep_same_price !== false;
        const keepSameInventory = cf.keepSameInventory !== false && cf.keep_same_inventory !== false;

        return {
          cf,
          keepSamePrice,
          keepSameInventory,
          customItems,
        };
      };

      (dbCustomers || []).forEach((c: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {  
        const bal = creditBalanceMap[c.id] || 0;
        const { cf, keepSamePrice, keepSameInventory, customItems } = parsePartyCustomFields(c.custom_fields, c);

        mergedParties.push({
          id: c.id,
          name: c.name,
          tradeName: c.trade_name || undefined,
          phone: c.phone,
          email: c.email,
          partyType: "customer",
          category: c.category || "Retailer",
          address: c.address,
          pan: c.pan || undefined,
          pincode: c.pincode || undefined,
          shippingAddress: c.shipping_address || undefined,
          openingBalance: bal,
          balance: bal,
          creditLimit: c.credit_limit ? Number(c.credit_limit) : 50000,
          creditPeriodDays: c.credit_period_days ? Number(c.credit_period_days) : 30,
          customFields: {
            ...cf,
            keepSamePrice,
            keepSameInventory,
            customItems,
          },
          keepSamePrice,
          keepSameInventory,
          customItems,
          sharedLedgerEnabled: true,
          sharedLedgerStatus: "synced",
          created_at: c.created_at,
        });
      });

      (dbSuppliers || []).forEach((s: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {  
        const bal = creditBalanceMap[s.id] || 0;
        const payableBal = -Math.abs(bal);
        const { cf, keepSamePrice, keepSameInventory, customItems } = parsePartyCustomFields(s.custom_fields, s);

        mergedParties.push({
          id: s.id,
          name: s.name,
          tradeName: s.trade_name || undefined,
          phone: s.phone,
          email: s.email,
          gstin: s.gstin,
          partyType: "supplier",
          category: s.category || "Distributor",
          address: s.address,
          pan: s.pan || undefined,
          pincode: s.pincode || undefined,
          shippingAddress: s.shipping_address || undefined,
          openingBalance: payableBal,
          balance: payableBal,
          creditLimit: s.credit_limit ? Number(s.credit_limit) : 100000,
          creditPeriodDays: s.credit_period_days ? Number(s.credit_period_days) : 45,
          customFields: {
            ...cf,
            keepSamePrice,
            keepSameInventory,
            customItems,
          },
          keepSamePrice,
          keepSameInventory,
          customItems,
          sharedLedgerEnabled: true,
          sharedLedgerStatus: "synced",
          created_at: s.created_at,
        });
      });

      const finalParties = mergedParties.length === 0 ? DEFAULT_SAMPLE_PARTIES : mergedParties;
      setParties(finalParties);

      // Perform Automated Ledger Reconciliation Audit
      const audit = performFullLedgerReconciliation({
        orgId,
  };

  // Calculations for Metrics Cards
  const totalPartiesCount = parties.length;
  const toCollectTotal = parties
    .filter((p) => p.balance > 0)
    .reduce((sum, p) => sum + p.balance, 0);
  const toPayTotal = parties
    .filter((p) => p.balance < 0)
    .reduce((sum, p) => sum + Math.abs(p.balance), 0);

  // Sorting and Filtering
  const filteredParties = useMemo(() => {
    return parties
      .filter((party) => {
        // Category / Type filter
        if (categoryFilter === "customer" && party.partyType !== "customer") return false;
        if (categoryFilter === "supplier" && party.partyType !== "supplier") return false;
        if (categoryFilter === "both" && party.partyType !== "both") return false;
        if (categoryFilter === "to_collect" && party.balance <= 0) return false;
        if (categoryFilter === "to_pay" && party.balance >= 0) return false;
        if (categoryFilter === "zero_balance" && party.balance !== 0) return false;
        if (
          categoryFilter !== "all" &&
          categoryFilter !== "customer" &&
          categoryFilter !== "supplier" &&
          categoryFilter !== "both" &&
          categoryFilter !== "to_collect" &&
          categoryFilter !== "to_pay" &&
          categoryFilter !== "zero_balance"
        ) {
          if (party.category.toLowerCase() !== categoryFilter.toLowerCase()) return false;
        }

        // Search text
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          party.name.toLowerCase().includes(q) ||
          (party.tradeName && party.tradeName.toLowerCase().includes(q)) ||
          (party.phone && party.phone.includes(q)) ||
          (party.gstin && party.gstin.toLowerCase().includes(q)) ||
          (party.city && party.city.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortField === "name") {
          const comp = a.name.localeCompare(b.name);
          return sortDirection === "asc" ? comp : -comp;
        }
        if (sortField === "balance") {
          const diff = a.balance - b.balance;
          return sortDirection === "asc" ? diff : -diff;
        }
        if (sortField === "created_at") {
          const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          return sortDirection === "asc" ? diff : -diff;
        }
        return 0;
      });
  }, [parties, categoryFilter, search, sortField, sortDirection]);

  // ── Pagination ──────────────────────────────────────────────────────────────
  const {
    page: partiesPage,
    setPage: setPartiesPage,
    pageSize: partiesPageSize,
    setPageSize: setPartiesPageSize,
    paginatedItems: paginatedParties,
    totalPages: partiesTotalPages,
    totalItems: partiesTotalItems,
    startIndex: partiesStartIndex,
    endIndex: partiesEndIndex,
    hasNext: partiesHasNext,
    hasPrev: partiesHasPrev,
  } = usePagination(filteredParties, 25);

  const handleSelectAll = () => {
    if (selectedIds.size === filteredParties.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredParties.map((p) => p.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSort = (field: "name" | "balance") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
setSortDirection("asc");
    }
  };

  return (
    <div className="h-full flex flex-col p-2.5 sm:p-4 space-y-2 sm:space-y-2.5 overflow-hidden">
      {/* ------------------------------------------------------------- */}
      {/* HEADER: Parties, [SharedLedger Portal], [Reports v], [Settings], [Keyboard] */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Users2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">Parties</h1>
                <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0.2">
                  {parties.length} Total
                </Badge>
              </div>
              <p className="hidden sm:block text-[11px] text-muted-foreground truncate">
                Manage customers, suppliers, balances, and real-time SharedLedger synchronization
              </p>
            </div>
          </div>

          {/* Quick mobile reconcile badge */}
          <div className="flex sm:hidden items-center gap-1.5">
            <Button
              onClick={() => {
                handleRunAudit();
                setShowReconciliationModal(true);
              }}
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-[11px] font-bold border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 rounded-lg"
            >
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>{auditResult?.integrityScore ?? 100}%</span>
            </Button>
          </div>
        </div>

        {/* Header Action Buttons (Desktop & Tablet) */}
        <div className="hidden sm:flex items-center gap-1.5 flex-wrap shrink-0">
          {/* Reconcile Ledgers Button */}
          <Button
            onClick={() => {
              handleRunAudit();
              setShowReconciliationModal(true);
            }}
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs font-bold border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 shadow-2xs px-2.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Reconcile</span>
            <Badge className="bg-emerald-600 text-white text-[9px] px-1 py-0 h-3.5 uppercase">
              {auditResult?.integrityScore ?? 100}%
            </Badge>
          </Button>

          {/* SharedLedger Portal Button */}
          <Button
            onClick={() => {
              setSharedLedgerSelectedParty(null);
              setShowSharedLedgerModal(true);
            }}
            size="sm"
            className="h-8 gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xs font-bold text-xs px-2.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>SharedLedger</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
          </Button>

          {/* Reports Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs font-semibold px-2.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
                <span>Reports</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs">Party Reports & Audits</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  handleRunAudit();
                  setShowReconciliationModal(true);
                }}
                className="text-xs cursor-pointer text-emerald-600 dark:text-emerald-400 font-semibold"
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-2" />
                Ledger Integrity Audit & Hub
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (auditResult) {
                    downloadReconciliationAuditCSV(auditResult, org);
                    toast.success("CA Reconciliation Audit Package downloaded!");
                  } else {
                    const audit = performFullLedgerReconciliation({
                      orgId,
                      orgName: org?.name || "CredSmart Business",
                      parties,
                      creditTransactions: rawCreditTransactions,
                    });
                    downloadReconciliationAuditCSV(audit, org);
                    toast.success("CA Reconciliation Audit Package downloaded!");
                  }
                }}
                className="text-xs cursor-pointer font-semibold"
              >
                <Download className="w-3.5 h-3.5 mr-2 text-primary" />
                Download CA Audit Package (CSV)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setReportModalType("all");
                  setShowReportsModal(true);
                }}
                className="text-xs cursor-pointer"
              >
                All Parties Ledger Statement
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setReportModalType("receivables");
                  setShowReportsModal(true);
                }}
                className="text-xs cursor-pointer text-emerald-600 dark:text-emerald-400"
              >
                Outstanding Receivables (To Collect)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setReportModalType("payables");
                  setShowReportsModal(true);
                }}
                className="text-xs cursor-pointer text-rose-600 dark:text-rose-400"
              >
                Outstanding Payables (To Pay)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setReportModalType("aging");
                  setShowReportsModal(true);
                }}
                className="text-xs cursor-pointer"
              >
                Aging Analysis & Overdue Days
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleBulkExport} className="text-xs cursor-pointer">
                <Download className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                Download CSV Statement
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings Cog */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettingsModal(true)}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            title="Party Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </Button>

          {/* Keyboard Icon */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowKeyboardModal(true)}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            title="Keyboard Shortcuts (Alt+K)"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* METRIC CARDS: All Parties count, To Collect (green), To Pay (red) */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5 shrink-0">
        {/* Card 1: All Parties */}
        <div className="glass-card-3d p-2.5 sm:p-3.5 flex items-center justify-between relative overflow-hidden group select-none">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 via-blue-500 to-indigo-600 rounded-l-2xl shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          <div className="space-y-0.5 min-w-0">
            <span className="text-[9px] sm:text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider font-mono truncate block">
              Total Parties
            </span>
            <p className="text-sm sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">{totalPartiesCount}</p>
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
              <span>{parties.filter((p) => p.partyType === "customer").length} Cust</span>
              <span>·</span>
              <span>{parties.filter((p) => p.partyType === "supplier").length} Supp</span>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 hidden sm:flex">
            <Users2 className="w-4 h-4" />
          </div>
        </div>

        {/* Card 2: To Collect (Green) */}
        <div className="glass-card-3d p-2.5 sm:p-3.5 flex items-center justify-between relative overflow-hidden group select-none">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 via-teal-500 to-green-600 rounded-l-2xl shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <div className="space-y-0.5 min-w-0">
            <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-mono truncate block">
              To Collect
            </span>
            <p className="text-sm sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight truncate">
              ₹ {toCollectTotal.toLocaleString("en-IN")}
            </p>
            <p className="hidden sm:block text-[10px] text-emerald-700/80 dark:text-emerald-400/80 font-medium">
              From {parties.filter((p) => p.balance > 0).length} customer ledgers
            </p>
          </div>
          <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0 hidden sm:flex">
            <CreditCard className="w-4 h-4" />
          </div>
        </div>

        {/* Card 3: To Pay (Red) */}
        <div className="glass-card-3d p-2.5 sm:p-3.5 flex items-center justify-between relative overflow-hidden group select-none">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-rose-400 via-red-500 to-rose-700 rounded-l-2xl shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
          <div className="space-y-0.5 min-w-0">
            <span className="text-[9px] sm:text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider font-mono truncate block">
              To Pay
            </span>
            <p className="text-sm sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight truncate">
              ₹ {toPayTotal.toLocaleString("en-IN")}
            </p>
            <p className="hidden sm:block text-[10px] text-rose-700/80 dark:text-rose-400/80 font-medium">
              To {parties.filter((p) => p.balance < 0).length} supplier bills
            </p>
          </div>
          <div className="p-2 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 shrink-0 hidden sm:flex">
            <CreditCard className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* FILTER & SEARCH BAR - Frosted Glass Container */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
          {/* Search input */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by party name, phone, GSTIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs bg-slate-50/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Categories Dropdown Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-3 gap-1.5 text-xs justify-between font-semibold border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 rounded-xl shrink-0">
                <span className="truncate max-w-[85px] sm:max-w-[130px]">
                  {categoryFilter === "all" ? "Categories" : categoryFilter}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setCategoryFilter("all")}>
                All Categories
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCategoryFilter("Wholesaler")}>Wholesaler</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCategoryFilter("Retailer")}>Retailer</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCategoryFilter("Distributor")}>Distributor</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCategoryFilter("Manufacturer")}>Manufacturer</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Bulk Upload Parties Button - 3D Tactile Emerald/Teal Gradient */}
          <button
            onClick={() => {
              setExcelModalTab("excel");
              setShowExcelUploadModal(true);
            }}
            className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-500 hover:to-emerald-600 text-white font-bold text-xs shadow-[0_4px_14px_rgba(16,185,129,0.35)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.5)] border border-emerald-400/40 active:scale-95 transition-all duration-200 cursor-pointer shrink-0 overflow-hidden group"
            title="Bulk Upload Parties from Excel / CSV"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200 group-hover:scale-110 transition-transform" />
            <span>Bulk Parties</span>
          </button>

          {/* Glowing Create Party Button */}
          <button
            onClick={() => {
              setEditingParty(null);
              setShowCreateModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl glowing-btn-amber text-white font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Create Party</span>
          </button>
        </div>

        {/* Bulk Action Dropdown (shows on desktop or when items selected) */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 text-xs font-semibold w-full sm:w-auto border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <span>Bulk Action ({selectedIds.size})</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={handleBulkExport} className="text-xs">
                  <Download className="w-3.5 h-3.5 mr-2" />
                  Download CSV Statement
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBulkDelete} className="text-xs text-rose-600">
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Delete Selected ({selectedIds.size})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Quick Software Migration Ribbon */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none shrink-0 py-0.5">
        <button
          onClick={() => {
            setExcelModalTab("software");
            setShowExcelUploadModal(true);
          }}
          className="h-7.5 px-3 text-[11px] font-bold gap-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shrink-0 cursor-pointer shadow-2xs flex items-center transition-all active:scale-95"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Import from Vyapar / Tally / My Bill Book</span>
        </button>

        <button
          onClick={() => {
            handleRunAudit();
            setShowReconciliationModal(true);
          }}
          className="h-7.5 px-3 text-[11px] font-bold gap-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0 cursor-pointer shadow-2xs flex items-center transition-all active:scale-95 sm:hidden"
        >
          <ShieldCheck className="w-3 h-3" />
          <span>SharedLedger & Reconcile</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PARTIES TABLE / MOBILE CARDS STREAM - Fits Remaining Height */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 min-h-0 border border-border rounded-xl overflow-hidden bg-card shadow-2xs flex flex-col glass-panel">
        {/* MOBILE VIEW: High-Touch Party Cards (Visible on screens < md) */}
        <div className="block md:hidden flex-1 min-h-0 overflow-y-auto p-2.5 pb-28 space-y-2.5 scrollbar-thin">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading parties...
            </div>
          ) : filteredParties.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Users2 className="w-10 h-10 mx-auto text-muted-foreground/50" />
              <p className="text-sm font-semibold text-foreground">No parties found</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {search ? `No records match "${search}".` : "Create your first party to manage ledgers and billing."}
              </p>
              <Button
                size="sm"
                onClick={() => {
                  setEditingParty(null);
                  setShowCreateModal(true);
                }}
                className="gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Create New Party
              </Button>
            </div>
          ) : (
            paginatedParties.map((party) => {
              const isSelected = selectedIds.has(party.id);
              const isCustomer = party.partyType === "customer";
              const isSupplier = party.partyType === "supplier";

              return (
                <div
                  key={party.id}
                  className={cn(
                    "p-3.5 rounded-2xl border transition-all bg-card space-y-3 shadow-2xs active:scale-[0.99]",
                    isSelected ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-bold text-sm flex items-center justify-center border border-primary/20 shrink-0">
                        {party.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4
                            onClick={() => {
                              if (party.partyType === "customer") {
                                navigate(`/customers/${party.id}/ledger`);
                              } else {
                                setSharedLedgerSelectedParty(party);
                                setShowSharedLedgerModal(true);
                              }
                            }}
                            className="font-bold text-sm text-foreground hover:text-primary cursor-pointer transition-colors truncate"
                          >
                            {party.name}
                          </h4>
                          {party.sharedLedgerEnabled && (
                            <Zap className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          <span className="bg-muted px-1.5 py-0.2 rounded text-[10px] font-medium uppercase font-mono">
                            {party.category || "General"}
                          </span>
                          <span>•</span>
                          <span className="truncate">{party.city || party.state || "India"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={cn(
                          "font-mono font-bold text-sm",
                          party.balance > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : party.balance < 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-muted-foreground"
                        )}
                      >
                        {party.balance > 0
                          ? `+ ₹ ${party.balance.toLocaleString("en-IN")}`
                          : party.balance < 0
                          ? `- ₹ ${Math.abs(party.balance).toLocaleString("en-IN")}`
                          : "₹ 0.00"}
                      </span>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {party.balance > 0 ? "To Collect" : party.balance < 0 ? "To Pay" : "Settled"}
                      </p>
                    </div>
                  </div>

                  {/* Mobile Quick Action Strip */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <div className="flex items-center gap-1.5">
                      {party.phone && (
                        <>
                          <a
                            href={`tel:${party.phone}`}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground text-[11px] font-medium"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>Call</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              const clean = party.phone?.replace(/[^0-9]/g, "");
                              const text = `Hello ${party.name}, your account balance on CredSmart is ₹${Math.abs(party.balance).toLocaleString("en-IN")}.`;
                              window.open(`https://wa.me/91${clean}?text=${encodeURIComponent(text)}`, "_blank");
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-medium"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp</span>
                          </button>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {isCustomer && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/customers/${party.id}/ledger`)}
                          className="h-7 px-2.5 text-[11px] font-semibold"
                        >
                          Ledger
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingParty(party);
                              setShowCreateModal(true);
                            }}
                            className="text-xs cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSharedLedgerSelectedParty(party);
                              setShowSharedLedgerModal(true);
                            }}
                            className="text-xs cursor-pointer text-emerald-600"
                          >
                            <Share2 className="w-3.5 h-3.5 mr-2" />
                            SharedLedger
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteParty(party)}
                            className="text-xs cursor-pointer text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Delete Party
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
            page={partiesPage}
            totalPages={partiesTotalPages}
            totalItems={partiesTotalItems}
            startIndex={partiesStartIndex}
            endIndex={partiesEndIndex}
            hasNext={partiesHasNext}
            hasPrev={partiesHasPrev}
            onPageChange={setPartiesPage}
            pageSize={partiesPageSize}
            onPageSizeChange={setPartiesPageSize}
          />
        </div>

        {/* DESKTOP VIEW: Untouched Data Table (Visible on md: and above) */}
        <div className="hidden md:block flex-1 min-h-0 overflow-y-auto overflow-x-auto w-full scrollbar-thin">
          <table className="w-full text-xs text-left min-w-[640px]">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-xs border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px] sm:text-[11px] z-10">
              <tr>
                <th className="px-3 py-2.5 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="p-0.5 rounded hover:bg-muted text-foreground"
                  >
                    {selectedIds.size > 0 && selectedIds.size === filteredParties.length ? (
                      <CheckSquare className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </button>
                </th>
                <th
                  onClick={() => handleSort("name")}
                  className="px-4 py-3.5 cursor-pointer hover:text-foreground select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Party Name</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Mobile Number</th>
                <th className="px-4 py-3.5">Party Type</th>
                <th
                  onClick={() => handleSort("balance")}
                  className="px-4 py-3.5 cursor-pointer hover:text-foreground select-none text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Balance (₹)</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th className="px-4 py-3.5 text-center w-16 sticky right-0 bg-muted/80 backdrop-blur-xs z-10 border-l border-border/50">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading parties...
                  </td>
                </tr>
              ) : filteredParties.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-muted-foreground space-y-3">
                    <Users2 className="w-10 h-10 mx-auto text-muted-foreground/50" />
                    <p className="text-sm font-semibold text-foreground">No parties found</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      {search
                        ? `No records match your search "${search}". Try clearing filters.`
                        : "Start by creating your first customer or supplier to manage ledgers and billing."}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingParty(null);
                        setShowCreateModal(true);
                      }}
                      className="gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Create New Party
                    </Button>
                  </td>
                </tr>
              ) : (
                paginatedParties.map((party) => {
                  const isSelected = selectedIds.has(party.id);
                  const isCustomer = party.partyType === "customer";
                  const isSupplier = party.partyType === "supplier";
                  const isBoth = party.partyType === "both";

                  return (
                    <tr
                      key={party.id}
                      className={cn(
                        "hover:bg-muted/30 transition-colors group",
                        isSelected && "bg-primary/5"
                      )}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelect(party.id)}
                          className="p-1 rounded hover:bg-muted text-foreground"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                      </td>

                      {/* Party Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-bold text-xs flex items-center justify-center border border-primary/20 shrink-0">
                            {party.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                onClick={() => {
                                  if (party.partyType === "customer") {
                                    navigate(`/customers/${party.id}/ledger`);
                                  } else {
                                    setSharedLedgerSelectedParty(party);
                                    setShowSharedLedgerModal(true);
                                  }
                                }}
                                className="font-bold text-foreground hover:text-primary cursor-pointer transition-colors truncate"
                              >
                                {party.name}
                              </span>
                              {party.sharedLedgerEnabled && (
                                <span title="SharedLedger Connected" className="inline-flex">
                                  <Zap className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              {party.tradeName && party.tradeName !== party.name && (
                                <span>{party.tradeName} ·</span>
                              )}
                              <span>{party.city || party.state || "India"}</span>
                              {party.gstin && (
                                <span className="font-mono text-muted-foreground/80">
                                  · GST: {party.gstin}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                          {party.category || "General"}
                        </span>
                      </td>

                      {/* Mobile Number */}
                      <td className="px-4 py-3.5 font-mono">
                        {party.phone ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-foreground font-medium">{party.phone}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const clean = party.phone?.replace(/[^0-9]/g, "");
                                window.open(`https://wa.me/91${clean}`, "_blank");
                              }}
                              title="Chat on WhatsApp"
                              className="p-1 rounded text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={`tel:${party.phone}`}
                              title="Call Party"
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Party Type Badge */}
                      <td className="px-4 py-3.5">
                        {isCustomer && (
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] uppercase font-bold">
                            Customer
                          </Badge>
                        )}
                        {isSupplier && (
                          <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20 text-[10px] uppercase font-bold">
                            Supplier
                          </Badge>
                        )}
                        {isBoth && (
                          <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 text-[10px] uppercase font-bold">
                            Both
                          </Badge>
                        )}
                      </td>

                      {/* Balance (Sortable) */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="space-y-0.5">
                          <span
                            className={cn(
                              "font-mono font-bold text-sm",
                              party.balance > 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : party.balance < 0
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-muted-foreground"
                            )}
                          >
                            {party.balance > 0
                              ? `+ ₹ ${party.balance.toLocaleString("en-IN")}`
                              : party.balance < 0
                              ? `- ₹ ${Math.abs(party.balance).toLocaleString("en-IN")}`
                              : "₹ 0.00"}
                          </span>
                          <p className="text-[10px] text-muted-foreground">
                            {party.balance > 0
                              ? "To Collect (Dr)"
                              : party.balance < 0
                              ? "To Pay (Cr)"
                              : "Settled"}
                          </p>
                        </div>
                      </td>

                      {/* Actions Menu */}
                      <td className="px-4 py-3.5 text-center sticky right-0 bg-background group-hover:bg-muted/30 transition-colors z-10 border-l border-border/50">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-xs">Party Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingParty(party);
                                setShowCreateModal(true);
                              }}
                              className="text-xs cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                              Edit Party Details
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => {
                                setSharedLedgerSelectedParty(party);
                                setShowSharedLedgerModal(true);
                              }}
                              className="text-xs cursor-pointer text-emerald-600 dark:text-emerald-400"
                            >
                              <Share2 className="w-3.5 h-3.5 mr-2" />
                              SharedLedger Portal
                            </DropdownMenuItem>

                            {party.partyType === "customer" && (
                              <DropdownMenuItem
                                onClick={() => navigate(`/customers/${party.id}/ledger`)}
                                className="text-xs cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                                View Full Ledger
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              onClick={() => {
                                const partyTxns = rawCreditTransactions.filter(
                                  (t) => (t.party_id || t.partyId) === party.id
                                );
                                downloadPartyStatementCSV(party, partyTxns, org);
                                toast.success(`Statement for "${party.name}" downloaded as CSV!`);
                              }}
                              className="text-xs cursor-pointer font-medium"
                            >
                              <Download className="w-3.5 h-3.5 mr-2 text-primary" />
                              Download Statement (CSV)
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => {
                                const partyTxns = rawCreditTransactions.filter(
                                  (t) => (t.party_id || t.partyId) === party.id
                                );
                                const res = reconcilePartyLedger(party, partyTxns);
                                if (res.isReconciled) {
                                  toast.success(
                                    `Reconciled: "${party.name}" ledger is verified with 0 discrepancy (Balance: ₹${Math.abs(
                                      res.calculatedBalance
                                    ).toLocaleString("en-IN")}).`
                                  );
                                } else {
                                  toast.warning(
                                    `Discrepancy: "${party.name}" has variance ₹${Math.abs(
                                      res.variance
                                    ).toLocaleString("en-IN")}.`
                                  );
                                }
                              }}
                              className="text-xs cursor-pointer text-emerald-600 dark:text-emerald-400 font-medium"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 mr-2" />
                              Verify & Reconcile
                            </DropdownMenuItem>

                            {party.phone && (
                              <DropdownMenuItem
                                onClick={() => {
                                  const clean = party.phone?.replace(/[^0-9]/g, "");
                                  const text = `Hello ${party.name}, your current account balance on CredSmart is ₹${Math.abs(
                                    party.balance
                                  ).toLocaleString("en-IN")} (${
                                    party.balance >= 0 ? "Due" : "Advance"
                                  }).`;
                                  window.open(`https://wa.me/91${clean}?text=${encodeURIComponent(text)}`, "_blank");
                                }}
                                className="text-xs cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                                Send WhatsApp Reminder
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteParty(party)}
                              className="text-xs cursor-pointer text-rose-600 dark:text-rose-400"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Delete Party
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Desktop Pagination */}
        <div className="hidden md:block">
          <PaginationBar
            page={partiesPage}
            totalPages={partiesTotalPages}
            totalItems={partiesTotalItems}
            startIndex={partiesStartIndex}
            endIndex={partiesEndIndex}
            hasNext={partiesHasNext}
            hasPrev={partiesHasPrev}
            onPageChange={setPartiesPage}
            pageSize={partiesPageSize}
            onPageSizeChange={setPartiesPageSize}
          />
        </div>

        {/* Table Footer summary */}
        <div className="p-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Showing <strong className="text-foreground">{partiesTotalItems === 0 ? 0 : `${partiesStartIndex}–${partiesEndIndex}`}</strong> of{" "}
            {parties.length} parties
          </span>
          <div className="flex items-center gap-4">
            <span>
              Selected: <strong className="text-foreground">{selectedIds.size}</strong>
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
              Net Collectible: ₹ {toCollectTotal.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>


      {/* ------------------------------------------------------------- */}
      {/* ALL MODALS */}
      {/* ------------------------------------------------------------- */}
      {/* 1. Create / Edit Party Modal */}
      <CreatePartyModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingParty(null);
        }}
        onSave={handleSaveParty}
        initialData={editingParty}
      />

      {/* 2. SharedLedger Portal Modal */}
      <SharedLedgerModal
        isOpen={showSharedLedgerModal}
        onClose={() => {
          setShowSharedLedgerModal(false);
          setSharedLedgerSelectedParty(null);
        }}
        parties={parties}
        selectedParty={sharedLedgerSelectedParty}
        orgInfo={org}
      />

      {/* 3. Reports Modal */}
      <PartyReportsModal
        isOpen={showReportsModal}
        onClose={() => setShowReportsModal(false)}
        parties={parties}
        reportType={reportModalType}
      />

      {/* 4. Settings Modal */}
      <PartySettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      {/* 5. Excel Upload Modal */}
      <PartyExcelUploadModal
        isOpen={showExcelUploadModal}
        onClose={() => setShowExcelUploadModal(false)}
        onImport={handleBulkImportParties}
      />

      {/* 6. Keyboard Shortcuts Modal */}
      <Dialog open={showKeyboardModal} onOpenChange={setShowKeyboardModal}>
        <DialogContent className="max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Keyboard className="w-5 h-5 text-primary" />
              Parties Keyboard Shortcuts
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-xs divide-y divide-border pt-2">
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Create New Party</span>
              <kbd className="px-2 py-1 rounded bg-muted border border-border font-mono font-bold">
                Alt + N
              </kbd>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Open Keyboard Help</span>
              <kbd className="px-2 py-1 rounded bg-muted border border-border font-mono font-bold">
                Alt + K
              </kbd>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Navigate to Parties Screen</span>
              <kbd className="px-2 py-1 rounded bg-muted border border-border font-mono font-bold">
                F2
              </kbd>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Search Focus</span>
              <kbd className="px-2 py-1 rounded bg-muted border border-border font-mono font-bold">
                /
              </kbd>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 7. Ledger Reconciliation & Audit Dialog */}
      <Dialog open={showReconciliationModal} onOpenChange={setShowReconciliationModal}>
        <DialogContent className="max-w-5xl sm:max-w-6xl w-[95vw] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Automated Ledger Integrity & Reconciliation Hub
              </DialogTitle>
              {auditResult && (
                <Badge className="bg-emerald-600 text-white text-xs font-bold">
                  Score: {auditResult.integrityScore}/100 ({auditResult.integrityStatus.toUpperCase()})
                </Badge>
              )}
            </div>
          </DialogHeader>

          {auditResult ? (
            <div className="space-y-5 pt-2 text-xs">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-card border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Audited Parties</span>
                  <p className="text-xl font-black text-foreground mt-0.5">{auditResult.totalPartiesAudited}</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                    {auditResult.reconciledPartiesCount} Verified Reconciled
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Trial Balance</span>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {auditResult.trialBalance.isBalanced ? "Balanced ✓" : "Variance"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Diff: ₹{auditResult.trialBalance.netDifference.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Receivables</span>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                    ₹{auditResult.totalReceivables.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">To Collect (Dr)</p>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Payables</span>
                  <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5 font-mono">
                    ₹{auditResult.totalPayables.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">To Pay (Cr)</p>
                </div>
              </div>

              {/* Party Reconciliation Table */}
              <div className="border border-border rounded-xl overflow-hidden bg-card">
                <div className="p-3 bg-muted/40 border-b border-border flex items-center justify-between">
                  <span className="font-bold text-foreground">Party Balances & Variance Verification</span>
                  <span className="text-[10px] text-muted-foreground font-semibold">Zero-Tolerance Double Entry</span>
                </div>
                <div className="max-h-60 overflow-y-auto overflow-x-auto w-full pb-2 scrollbar-thin">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/20 border-b border-border text-muted-foreground font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2">Party Name</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2 text-right">Calculated Bal</th>
                        <th className="px-3 py-2 text-right">Recorded Bal</th>
                        <th className="px-3 py-2 text-right">Variance</th>
                        <th className="px-3 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {auditResult.partyResults.map((p) => (
                        <tr key={p.partyId} className="hover:bg-muted/20">
                          <td className="px-3 py-2 font-semibold text-foreground">{p.partyName}</td>
                          <td className="px-3 py-2 capitalize">
                            <Badge variant="outline" className="text-[9px] py-0">
                              {p.partyType}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold">
                            ₹{Math.abs(p.calculatedBalance).toLocaleString("en-IN")}
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            ₹{Math.abs(p.recordedBalance).toLocaleString("en-IN")}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{Math.abs(p.variance).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Badge
                              className={cn(
                                "text-[9px] py-0",
                                p.isReconciled
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              )}
                            >
                              {p.isReconciled ? "Reconciled ✓" : "Variance"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons in Modal Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRunAudit}
                  disabled={isAuditing}
                  className="gap-1.5 text-xs h-8"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5 text-primary", isAuditing && "animate-spin")} />
                  {isAuditing ? "Re-Auditing..." : "Re-Verify All Ledgers"}
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      downloadReconciliationAuditCSV(auditResult, org);
                      toast.success("Complete Reconciliation Audit Package downloaded as CSV!");
                    }}
                    className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download CA Audit CSV
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setShowReconciliationModal(false)} className="h-8 text-xs">
                    Close
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-primary opacity-50" />
              <p>Auditing and verifying ledger records...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Excel & Software Migration Modal */}
      <PartyExcelUploadModal
        isOpen={showExcelUploadModal}
        onClose={() => setShowExcelUploadModal(false)}
        onImport={handleBulkImportParties}
        initialTab={excelModalTab}
      />
    </div>
  );
}
