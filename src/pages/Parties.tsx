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
  ArrowDownLeft,
  ArrowUpRight,
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
import { partiesApi } from "@/services/partiesApi";
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

  const [parties, setParties] = useState<Party[]>(() => {
    if (!orgId) return [];
    try {
      const saved = sessionStorage.getItem(`credsmart_cached_parties_${orgId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* empty */ }
    return [];
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (!orgId) return false;
    try {
      const saved = sessionStorage.getItem(`credsmart_cached_parties_${orgId}`);
      if (saved && JSON.parse(saved)?.length > 0) return false;
    } catch { /* empty */ }
    return true;
  });

  // Search & Filter
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [partyTab, setPartyTab] = useState<"all" | "customer" | "supplier" | "to_collect" | "to_pay">("all");
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

    // Only show full loading spinner if no parties are currently displayed
    setParties((prev) => {
      if (!prev || prev.length === 0) setLoading(true);
      return prev;
    });
    try {
      // 1. Fetch Customers, Suppliers & Credit Transactions in parallel (3x speedup)
      const [
        { data: dbCustomers, error: custErr },
        { data: dbSuppliers, error: suppErr },
        { data: credits, error: creditErr }
      ] = await Promise.all([
        partiesApi.getCustomers(orgId),
        partiesApi.getSuppliers(orgId),
        partiesApi.getCreditTransactions({ orgId })
      ]);

      setRawCreditTransactions((credits as any) || []);

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
        orgName: "CredSmart Business",
        parties: finalParties,
        creditTransactions: credits || [],
      });
      setAuditResult(audit);
    } catch (err) {
      console.error("Error fetching parties:", err);
      setParties(DEFAULT_SAMPLE_PARTIES);
      const audit = performFullLedgerReconciliation({
        orgName: "CredSmart Business",
        parties: DEFAULT_SAMPLE_PARTIES,
        creditTransactions: [],
      });
      setAuditResult(audit);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchParties();
  }, [fetchParties]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("new") === "1") {
      setEditingParty(null);
      setShowCreateModal(true);
    } else if (params.get("bulk") === "1") {
      setExcelModalTab("excel");
      setShowExcelUploadModal(true);
    }
  }, [location.search]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setEditingParty(null);
        setShowCreateModal(true);
      }
      if ((e.altKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowKeyboardModal((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleRunAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      const audit = performFullLedgerReconciliation({
        orgId,
        orgName: "CredSmart Business",
        parties,
        creditTransactions: rawCreditTransactions,
      });
      setAuditResult(audit);
      setIsAuditing(false);
      toast.success("Automated Ledger Integrity Verification completed!");
    }, 500);
  };

  // Save / Create / Update Party
  const handleSaveParty = async (partyData: Omit<Party, "id" | "created_at">) => {
    if (!orgId) {
      if (editingParty) {
        setParties((prev) =>
          prev.map((p) => (p.id === editingParty.id ? { ...p, ...partyData } : p))
        );
        toast.success(`Updated party "${partyData.name}"`);
      } else {
        const normName = partyData.name.trim().toLowerCase();
        const existing = parties.find(
          (p) => p.name.trim().toLowerCase() === normName && p.partyType === partyData.partyType
        );
        if (existing) {
          toast.error(`A ${partyData.partyType} named "${partyData.name.trim()}" already exists!`);
          return;
        }
        const newParty: Party = {
          ...partyData,
          id: `party-${Date.now()}`,
          created_at: new Date().toISOString(),
        };
        setParties((prev) => [newParty, ...prev]);
        toast.success(`Created new party "${partyData.name}"`);
      }
      return;
    }

    try {
      const customFieldsPayload = {
        ...(partyData.customFields || {}),
        keepSamePrice: partyData.keepSamePrice !== false,
        keepSameInventory: partyData.keepSameInventory !== false,
        customItems: partyData.customItems || [],
      };

      if (editingParty) {
        const targetTable = editingParty.partyType === "supplier" ? "suppliers" : "customers";
        const { error } = await partiesApi.savePartyRecord(
          targetTable,
          {
            name: partyData.name.trim(),
            phone: partyData.phone,
            email: partyData.email,
            address: partyData.address,
            trade_name: partyData.tradeName || null,
            pan: partyData.pan || null,
            pincode: partyData.pincode || null,
            shipping_address: partyData.shippingAddress || null,
            category: partyData.category || "General",
            credit_limit: partyData.creditLimit || null,
            credit_period_days: partyData.creditPeriodDays || null,
            custom_fields: customFieldsPayload,
          },
          editingParty.id,
          orgId
        );
        if (error) throw error;

        toast.success(`Updated party "${partyData.name}"`);
      } else {
        const normName = partyData.name.trim().toLowerCase();
        const existing = parties.find(
          (p) => p.name.trim().toLowerCase() === normName && p.partyType === partyData.partyType
        );
        if (existing) {
          toast.error(`A ${partyData.partyType} named "${partyData.name.trim()}" already exists!`);
          return;
        }

        const isSupplier = partyData.partyType === "supplier";
        const targetTable = isSupplier ? "suppliers" : "customers";

        const { data: newRecord, error } = await partiesApi.savePartyRecord(
          targetTable,
          {
            organization_id: orgId,
            name: partyData.name.trim(),
            phone: partyData.phone,
            email: partyData.email,
            address: partyData.address,
            trade_name: partyData.tradeName || null,
            pan: partyData.pan || null,
            pincode: partyData.pincode || null,
            shipping_address: partyData.shippingAddress || null,
            category: partyData.category || "General",
            credit_limit: partyData.creditLimit || null,
            credit_period_days: partyData.creditPeriodDays || null,
            custom_fields: customFieldsPayload,
          },
          undefined,
          orgId
        );

        if (error) throw error;

        if (partyData.openingBalance !== 0 && newRecord) {
          await partiesApi.recordCreditTransaction({
            organization_id: orgId,
            party_id: newRecord.id,
            party_type: isSupplier ? "supplier" : "customer",
            amount: Math.abs(partyData.openingBalance),
            type: partyData.openingBalance > 0 ? "credit" : "payment",
            description: "Opening balance",
            created_by: user?.id || "admin",
          }, orgId);
        }
        toast.success(`Created party "${partyData.name}"!`);
      }
      fetchParties();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : typeof err === "string" ? err : "Failed to save party.";
      toast.error(message);
    }
  };

  // Bulk Import Parties from Excel or Software Migration
  const handleBulkImportParties = async (importedList: Partial<Party>[]) => {
    if (!orgId) {
      const newItems: Party[] = importedList.map((p, i) => ({
        id: `party-imp-${Date.now()}-${i}`,
        name: p.name || "Unnamed Party",
        tradeName: p.tradeName,
        phone: p.phone || null,
        email: p.email || null,
        partyType: p.partyType || "customer",
        category: p.category || "General",
        gstin: p.gstin || null,
        pan: p.pan || null,
        address: p.address || null,
        city: p.city || null,
        state: p.state || null,
        pincode: p.pincode || null,
        openingBalance: p.openingBalance || 0,
        balance: p.balance || p.openingBalance || 0,
        creditLimit: p.creditLimit || 50000,
        creditPeriodDays: p.creditPeriodDays || 30,
        sharedLedgerEnabled: true,
        sharedLedgerStatus: "synced",
        created_at: new Date().toISOString(),
      }));
      setParties((prev) => [...newItems, ...prev]);
      return;
    }

    try {
      for (const p of importedList) {
        const isSupplier = p.partyType === "supplier";
        const targetTable = isSupplier ? "suppliers" : "customers";
        const { data: newParty, error: pErr } = await partiesApi.savePartyRecord(
          targetTable,
          {
            organization_id: orgId,
            name: p.name || "Unnamed Party",
            phone: p.phone || undefined,
            email: p.email || undefined,
            address: p.address || undefined,
            gstin: p.gstin || undefined,
          },
          undefined,
          orgId
        );

        if (newParty && !pErr && Number(p.openingBalance) !== 0) {
          await partiesApi.recordCreditTransaction({
            organization_id: orgId,
            party_id: newParty.id,
            party_type: isSupplier ? "supplier" : "customer",
            amount: Math.abs(Number(p.openingBalance)),
            type: Number(p.openingBalance) > 0 ? "credit" : "payment",
            description: "Opening balance import",
            created_by: user?.id || "admin",
          }, orgId);
        }
      }
      toast.success(`Successfully imported ${importedList.length} parties!`);
      fetchParties();
    } catch (err: unknown) {
      console.error("Bulk party import error:", err);
      const message = err instanceof Error ? err.message : typeof err === "string" ? err : "Failed to save imported parties.";
      toast.error(message);
    }
  };

  // Delete Party
  const handleDeleteParty = async (party: Party) => {
    if (!confirm(`Are you sure you want to delete party "${party.name}"?`)) return;

    if (!orgId) {
      setParties((prev) => prev.filter((p) => p.id !== party.id));
      toast.success("Party deleted.");
      return;
    }

    try {
      const targetTable = party.partyType === "supplier" ? "suppliers" : "customers";
      await partiesApi.deletePartyRecord(targetTable, party.id, orgId);
      toast.success("Party deleted successfully.");
      fetchParties();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : typeof err === "string" ? err : "Failed to delete party.";
      toast.error(message);
    }
  };

  // Bulk Delete
  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected parties?`)) return;
    setParties((prev) => prev.filter((p) => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
    toast.success("Selected parties removed.");
  };

  // Bulk Export
  const handleBulkExport = () => {
    const listToExport =
      selectedIds.size > 0 ? parties.filter((p) => selectedIds.has(p.id)) : parties;
    const csv = exportPartiesToCSV(listToExport);
    downloadCSV(`CredSmart_Parties_Export_${new Date().toISOString().slice(0, 10)}.csv`, csv);
    toast.success(`Exported ${listToExport.length} parties to CSV!`);
  };

  // Merge Duplicates Helper
  const handleMergeDuplicates = async () => {
    const groups: { [key: string]: Party[] } = {};
    parties.forEach((p) => {
      const key = `${p.partyType}-${p.name.trim().toLowerCase()}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });

    const duplicateKeys = Object.keys(groups).filter((k) => groups[k].length > 1);
    if (duplicateKeys.length === 0) {
      toast.info("No duplicate parties found!");
      return;
    }

    let mergedCount = 0;
    for (const key of duplicateKeys) {
      const list = groups[key];
      const primary = list[0];
      const duplicates = list.slice(1);

      if (orgId) {
        for (const dup of duplicates) {
          const targetTable = dup.partyType === "supplier" ? "suppliers" : "customers";
          await partiesApi.reassignCreditTransactions(dup.id, primary.id, orgId);
          await partiesApi.deletePartyRecord(targetTable, dup.id, orgId);
          mergedCount++;
        }
      }
    }

    toast.success(`Successfully merged ${mergedCount} duplicate parties!`);
    fetchParties();
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
        // Party Type / Balance Tab filter
        if (partyTab === "customer" && party.partyType !== "customer" && party.partyType !== "both") return false;
        if (partyTab === "supplier" && party.partyType !== "supplier" && party.partyType !== "both") return false;
        if (partyTab === "to_collect" && party.balance <= 0) return false;
        if (partyTab === "to_pay" && party.balance >= 0) return false;

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
          if (party.category?.toLowerCase() !== categoryFilter.toLowerCase()) return false;
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
  }, [parties, partyTab, categoryFilter, search, sortField, sortDirection]);

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

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredParties.length && filteredParties.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredParties.map((p) => p.id)));
    }
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
    <div className="h-full flex flex-col p-2.5 sm:p-4 space-y-2 sm:space-y-2.5 overflow-hidden bg-slate-50/40 dark:bg-slate-950/40">
      {/* ============================================================= */}
      {/* 1. MOBILE FAST-ACCESS CONTROL STRIP (<sm: 2 High-Density Rows) */}
      {/* ============================================================= */}
      {/* Mobile Row 1: Title + Compact Direct KPI Filter Pills */}
      <div className="flex sm:hidden items-center justify-between gap-1.5 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-slate-900 text-white dark:bg-slate-800 dark:text-blue-400 shrink-0 shadow-2xs">
            <Users2 className="w-3.5 h-3.5" />
          </div>
          <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
            Parties
          </h1>
          <span className="px-1.5 py-0.2 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60 shrink-0">
            {parties.length}
          </span>
        </div>

        {/* Compact KPI Pills: To Collect & To Pay (No (Dr)/(Cr) overflow) */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none shrink-0">
          <button
            type="button"
            onClick={() => setPartyTab((prev) => (prev === "to_collect" ? "all" : "to_collect"))}
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-mono font-semibold transition-all shrink-0 active:scale-95 shadow-2xs cursor-pointer",
              partyTab === "to_collect"
                ? "bg-emerald-600 text-white border-emerald-600 font-bold"
                : "bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60"
            )}
            title="Filter To Collect"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Collect:</span>
            <span className="font-bold tabular-nums">₹{toCollectTotal.toLocaleString("en-IN")}</span>
          </button>

          <button
            type="button"
            onClick={() => setPartyTab((prev) => (prev === "to_pay" ? "all" : "to_pay"))}
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-mono font-semibold transition-all shrink-0 active:scale-95 shadow-2xs cursor-pointer",
              partyTab === "to_pay"
                ? "bg-rose-600 text-white border-rose-600 font-bold"
                : "bg-rose-50/80 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60"
            )}
            title="Filter To Pay"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            <span>Pay:</span>
            <span className="font-bold tabular-nums">₹{toPayTotal.toLocaleString("en-IN")}</span>
          </button>
        </div>
      </div>

      {/* Mobile Row 2: Search + Filter Dropdown + Single Action CTA */}
      <div className="flex sm:hidden items-center gap-1.5 w-full shrink-0">
        <div className="relative flex-1 min-w-0">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search parties..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-7 pr-7 h-8 text-xs bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 rounded-lg shadow-2xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 gap-1 text-xs justify-between font-semibold border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg shrink-0 text-slate-700 dark:text-slate-300 shadow-2xs"
            >
              <span>
                {partyTab === "all"
                  ? "All"
                  : partyTab === "customer"
                  ? "Cust"
                  : partyTab === "supplier"
                  ? "Supp"
                  : partyTab === "to_collect"
                  ? "Collect"
                  : "Pay"}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setPartyTab("all")}>All Parties ({parties.length})</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPartyTab("customer")}>
              Customers ({parties.filter((p) => p.partyType === "customer" || p.partyType === "both").length})
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPartyTab("supplier")}>
              Suppliers ({parties.filter((p) => p.partyType === "supplier" || p.partyType === "both").length})
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setPartyTab("to_collect")}>
              To Collect ({parties.filter((p) => p.balance > 0).length})
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPartyTab("to_pay")}>
              To Pay ({parties.filter((p) => p.balance < 0).length})
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { setExcelModalTab("excel"); setShowExcelUploadModal(true); }}>
              <FileSpreadsheet className="w-3.5 h-3.5 mr-2 text-emerald-600" />
              Bulk Upload Parties
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          onClick={() => {
            setEditingParty(null);
            setShowCreateModal(true);
          }}
          className="flex items-center gap-1 h-8 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs active:scale-[0.98] transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Party</span>
        </button>
      </div>

      {/* ============================================================= */}
      {/* 2. DESKTOP & TABLET CONTROLS (sm: and above) */}
      {/* ============================================================= */}
      {/* Desktop Header */}
      <div className="hidden sm:flex sm:items-center justify-between gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-900 text-white dark:bg-slate-800 dark:text-blue-400 border border-slate-800 dark:border-slate-700 shadow-2xs">
              <Users2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">Parties Directory</h1>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60">
                  {parties.length} Total
                </span>
              </div>
              <p className="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Customer &amp; Supplier ledgers, directional balance tracking, and real-time reconciliation
              </p>
            </div>
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
            className="h-8 gap-1.5 text-xs font-bold border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 dark:text-emerald-300 shadow-2xs px-2.5 rounded-lg"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Reconcile Hub</span>
            <span className="bg-emerald-600 text-white text-[11px] font-mono px-1.5 py-0.2 rounded font-bold">
              {auditResult?.integrityScore ?? 100}%
            </span>
          </Button>

          {/* SharedLedger Portal Button */}
          <Button
            onClick={() => {
              setSharedLedgerSelectedParty(null);
              setShowSharedLedgerModal(true);
            }}
            size="sm"
            className="h-8 gap-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 border border-slate-700/60 shadow-2xs font-bold text-xs px-2.5 rounded-lg"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>SharedLedger</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </Button>

          {/* Reports Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-semibold px-2.5 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg shadow-2xs text-slate-700 dark:text-slate-300">
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Reports</span>
                <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs">Party Reports &amp; Audits</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  handleRunAudit();
                  setShowReconciliationModal(true);
                }}
                className="text-xs cursor-pointer text-emerald-600 dark:text-emerald-400 font-semibold"
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-2" />
                Ledger Integrity Audit &amp; Hub
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
                onClick={handleMergeDuplicates}
                className="text-xs cursor-pointer text-amber-600 dark:text-amber-400 font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-2 text-amber-500" />
                Merge Duplicate Parties
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setReportModalType("aging");
                  setShowReportsModal(true);
                }}
                className="text-xs cursor-pointer"
              >
                Aging Analysis &amp; Overdue Days
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
            className="h-8 w-8 p-0 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg shadow-2xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
            title="Party Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </Button>

          {/* Keyboard Icon */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowKeyboardModal(true)}
            className="h-8 w-8 p-0 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg shadow-2xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
            title="Keyboard Shortcuts (Alt+K)"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* METRIC CARDS: Total Parties, To Collect (Dr), To Pay (Cr) (Desktop) */}
      <div className="hidden sm:grid sm:grid-cols-3 gap-3 shrink-0">
        {/* Card 1: All Parties */}
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-2xs relative overflow-hidden select-none border-t-2 border-t-blue-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider font-mono truncate block">
              Total Parties
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40 shrink-0 flex">
              <Users2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white tracking-tight mt-0.5">
            {totalPartiesCount}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
            <span>{parties.filter((p) => p.partyType === "customer").length} Cust</span>
            <span>·</span>
            <span>{parties.filter((p) => p.partyType === "supplier").length} Supp</span>
          </div>
        </div>

        {/* Card 2: To Collect (Dr) Emerald */}
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-2xs relative overflow-hidden select-none border-t-2 border-t-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-mono truncate block">
              To Collect (Dr)
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 shrink-0 flex">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 tracking-tight truncate mt-0.5">
            ₹ {toCollectTotal.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 font-mono mt-0.5">
            From {parties.filter((p) => p.balance > 0).length} customer ledgers
          </p>
        </div>

        {/* Card 3: To Pay (Cr) Rose */}
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-2xs relative overflow-hidden select-none border-t-2 border-t-rose-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider font-mono truncate block">
              To Pay (Cr)
            </span>
            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40 shrink-0 flex">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 tracking-tight truncate mt-0.5">
            ₹ {toPayTotal.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-rose-700/80 dark:text-rose-400/80 font-mono mt-0.5">
            To {parties.filter((p) => p.balance < 0).length} supplier bills
          </p>
        </div>
      </div>

      {/* CATEGORY TABS BAR (Desktop) */}
      <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 shrink-0">
        <button
          type="button"
          onClick={() => setPartyTab("all")}
          className={cn(
            "h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all border",
            partyTab === "all"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-2xs font-bold"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
          )}
        >
          <span>All Parties</span>
          <span className={cn(
            "px-1.5 py-0.2 rounded text-xs font-mono",
            partyTab === "all" ? "bg-white/20 dark:bg-slate-900/20" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
          )}>
            {parties.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setPartyTab("customer")}
          className={cn(
            "h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all border",
            partyTab === "customer"
              ? "bg-emerald-600 text-white border-transparent shadow-2xs font-bold"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
          )}
        >
          <span>Customers</span>
          <span className={cn(
            "px-1.5 py-0.2 rounded text-xs font-mono",
            partyTab === "customer" ? "bg-emerald-700/60 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
          )}>
            {parties.filter((p) => p.partyType === "customer" || p.partyType === "both").length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setPartyTab("supplier")}
          className={cn(
            "h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all border",
            partyTab === "supplier"
              ? "bg-purple-600 text-white border-transparent shadow-2xs font-bold"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
          )}
        >
          <span>Suppliers</span>
          <span className={cn(
            "px-1.5 py-0.2 rounded text-xs font-mono",
            partyTab === "supplier" ? "bg-purple-700/60 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
          )}>
            {parties.filter((p) => p.partyType === "supplier" || p.partyType === "both").length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setPartyTab("to_collect")}
          className={cn(
            "h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all border",
            partyTab === "to_collect"
              ? "bg-emerald-600 text-white border-transparent shadow-2xs font-bold"
              : "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/60 hover:bg-emerald-50/50"
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span>To Collect (Dr)</span>
          <span className={cn(
            "px-1.5 py-0.2 rounded text-xs font-mono",
            partyTab === "to_collect" ? "bg-emerald-700/60 text-white" : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
          )}>
            {parties.filter((p) => p.balance > 0).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setPartyTab("to_pay")}
          className={cn(
            "h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all border",
            partyTab === "to_pay"
              ? "bg-rose-600 text-white border-transparent shadow-2xs font-bold"
              : "bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 border-rose-200/80 dark:border-rose-800/60 hover:bg-rose-50/50"
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
          <span>To Pay (Cr)</span>
          <span className={cn(
            "px-1.5 py-0.2 rounded text-xs font-mono",
            partyTab === "to_pay" ? "bg-rose-700/60 text-white" : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
          )}>
            {parties.filter((p) => p.balance < 0).length}
          </span>
        </button>
      </div>

      {/* FILTER & SEARCH BAR (Desktop) */}
      <div className="hidden sm:flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 sm:p-2.5 shadow-2xs shrink-0">
        <div className="flex items-center justify-between gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Search input */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Search by party name, phone, GSTIN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8.5 text-xs bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 rounded-lg focus-visible:ring-1 focus-visible:ring-blue-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Categories Dropdown Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8.5 px-2.5 gap-1.5 text-xs justify-between font-semibold border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 rounded-lg shrink-0 text-slate-700 dark:text-slate-300">
                  <span className="truncate max-w-[85px] sm:max-w-[130px]">
                    {categoryFilter === "all" ? "Categories" : categoryFilter}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
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

            {/* Import Data from Tally / Excel Button */}
            <button
              type="button"
              onClick={() => navigate(ROUTE_PATHS.tallyImport)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 font-semibold text-xs shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
              title="Import Full Data from Tally or Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Import Data</span>
            </button>

            {/* Bulk Upload Parties Button */}
            <button
              type="button"
              onClick={() => {
                setExcelModalTab("excel");
                setShowExcelUploadModal(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 font-semibold text-xs shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
              title="Bulk Upload Parties from Excel / CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Bulk Parties</span>
            </button>

            {/* Create Party Button */}
            <button
              type="button"
              onClick={() => {
                setEditingParty(null);
                setShowCreateModal(true);
              }}
              className="flex items-center gap-1.5 h-8.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs active:scale-[0.98] transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create Party</span>
            </button>
          </div>
        </div>

        {/* Bulk Action Dropdown */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8.5 gap-1.5 text-xs font-semibold w-full sm:w-auto border-slate-200/80 dark:border-slate-700 rounded-lg"
                >
                  <span>Bulk Action ({selectedIds.size})</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={handleBulkExport} className="text-xs cursor-pointer font-medium">
                  <Download className="w-3.5 h-3.5 mr-2 text-slate-500" />
                  Download CSV Statement
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBulkDelete} className="text-xs cursor-pointer text-rose-600 dark:text-rose-400 font-medium">
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Delete Selected ({selectedIds.size})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Quick Software Migration Ribbon */}
      <div className="hidden sm:flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none shrink-0 py-0.5">
        <button
          onClick={() => {
            setExcelModalTab("software");
            setShowExcelUploadModal(true);
          }}
          className="h-7 px-2.5 text-[11px] font-semibold gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 shrink-0 cursor-pointer shadow-2xs flex items-center transition-all active:scale-95"
        >
          <RotateCcw className="w-3 h-3 text-indigo-500" />
          <span>Import from Vyapar / Tally / My Bill Book</span>
        </button>

        <button
          onClick={() => {
            handleRunAudit();
            setShowReconciliationModal(true);
          }}
          className="h-7 px-2.5 text-[11px] font-semibold gap-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 shrink-0 cursor-pointer shadow-2xs flex items-center transition-all active:scale-95 sm:hidden"
        >
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span>SharedLedger & Reconcile</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PARTIES TABLE / MOBILE CARDS STREAM - High-Density Surface */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 min-h-0 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col overflow-hidden">
        {/* MOBILE VIEW: High-Density Touch Cards (screens < md) */}
        <div className="block md:hidden flex-1 min-h-0 overflow-y-auto px-0 pb-28 divide-y divide-slate-100 dark:divide-slate-800/60 scrollbar-thin">
          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <div className="w-6 h-6 border-2 border-slate-900 dark:border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading parties...
            </div>
          ) : filteredParties.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Users2 className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white">No parties found</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {search ? `No records match "${search}".` : "Create your first party to manage ledgers and billing."}
              </p>
              <Button
                size="sm"
                onClick={() => {
                  setEditingParty(null);
                  setShowCreateModal(true);
                }}
                className="gap-1.5 rounded-lg text-xs"
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
                    "px-3.5 py-3 transition-colors bg-white dark:bg-slate-900 space-y-2.5",
                    isSelected
                      ? "bg-blue-50/40 dark:bg-blue-950/30"
                      : "hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center border border-slate-200/80 dark:border-slate-700/60 shrink-0">
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
                            className="font-bold text-sm sm:text-base text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors truncate"
                          >
                            {party.name}
                          </h4>
                          {party.sharedLedgerEnabled && (
                            <Zap className="w-3 h-3 text-emerald-500 fill-emerald-500 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-xs font-mono">
                            {party.category || "General"}
                          </span>
                          <span>•</span>
                          <span className="truncate">{party.city || party.state || "India"}</span>
                          <span>•</span>
                          <span className={cn(
                            "font-bold font-mono uppercase text-xs",
                            isCustomer ? "text-emerald-600 dark:text-emerald-400" : isSupplier ? "text-purple-600 dark:text-purple-400" : "text-blue-600 dark:text-blue-400"
                          )}>
                            {party.partyType}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Directional Balance Badge (Mobile) */}
                    <div className="text-right shrink-0">
                      {party.balance > 0 ? (
                        <div className="flex flex-col items-end">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-sm font-mono font-bold tabular-nums bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            Dr · ₹{party.balance.toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                            To Collect
                          </span>
                        </div>
                      ) : party.balance < 0 ? (
                        <div className="flex flex-col items-end">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-sm font-mono font-bold tabular-nums bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                            Cr · ₹{Math.abs(party.balance).toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 font-mono mt-0.5">
                            To Pay
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-medium tabular-nums bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60">
                          ₹0.00 · Settled
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mobile Quick Action Strip */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60">
                    <div className="flex items-center gap-1.5">
                      {party.phone ? (
                        <>
                          <a
                            href={`tel:${party.phone}`}
                            className="flex items-center gap-1.5 h-7.5 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 text-xs font-semibold active:scale-95 transition-transform"
                            title="Call Party"
                          >
                            <Phone className="w-3.5 h-3.5 text-slate-500" />
                            <span>Call</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              const clean = party.phone?.replace(/[^0-9]/g, "");
                              const text = party.balance > 0
                                ? `Hello ${party.name}, your outstanding receivable on CredSmart is ₹${party.balance.toLocaleString("en-IN")} (Dr). Kindly arrange the payment at your earliest convenience.`
                                : party.balance < 0
                                ? `Hello ${party.name}, your payable balance on CredSmart is ₹${Math.abs(party.balance).toLocaleString("en-IN")} (Cr).`
                                : `Hello ${party.name}, your account on CredSmart is fully settled (₹0.00).`;
                              window.open(`https://wa.me/91${clean}?text=${encodeURIComponent(text)}`, "_blank");
                            }}
                            className="flex items-center gap-1.5 h-7.5 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold active:scale-95 transition-transform"
                            title="Chat on WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>WhatsApp</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No phone number</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {isCustomer && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/customers/${party.id}/ledger`)}
                          className="h-7.5 px-2.5 flex items-center text-xs font-semibold rounded-lg border-slate-200/80 dark:border-slate-700"
                        >
                          Ledger
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-7.5 h-7.5 p-0 rounded-lg flex items-center justify-center border border-slate-200/80 dark:border-slate-700/60">
                            <MoreVertical className="w-3.5 h-3.5 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingParty(party);
                              setShowCreateModal(true);
                            }}
                            className="text-xs cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5 mr-2 text-slate-500" />
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSharedLedgerSelectedParty(party);
                              setShowSharedLedgerModal(true);
                            }}
                            className="text-xs cursor-pointer text-emerald-600 dark:text-emerald-400 font-medium"
                          >
                            <Share2 className="w-3.5 h-3.5 mr-2" />
                            SharedLedger Portal
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              const partyTxns = rawCreditTransactions.filter(
                                (t) => (t.party_id || t.partyId) === party.id
                              );
                              const res = reconcilePartyLedger(party, partyTxns);
                              if (res.isReconciled) {
                                toast.success(`Reconciled: "${party.name}" ledger verified with 0 discrepancy.`);
                              } else {
                                toast.warning(`Discrepancy: "${party.name}" has variance ₹${Math.abs(res.variance).toLocaleString("en-IN")}.`);
                              }
                            }}
                            className="text-xs cursor-pointer text-emerald-600 dark:text-emerald-400 font-medium"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 mr-2" />
                            Verify & Reconcile
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteParty(party)}
                            className="text-xs cursor-pointer text-rose-600 dark:text-rose-400 font-medium"
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
          {/* Mobile Bottom Clearance Spacer */}
          <div className="h-20 w-full shrink-0 select-none pointer-events-none" aria-hidden="true" />
        </div>



        {/* DESKTOP VIEW: High-Density 36px Data Table (md: and above) */}
        <div className="hidden md:block flex-1 min-h-0 overflow-y-auto overflow-x-auto w-full scrollbar-thin">
          <table className="w-full text-xs text-left min-w-[680px]">
            <thead className="sticky top-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200/80 dark:border-slate-800 text-slate-500 font-mono text-[11px] uppercase tracking-wider z-10 select-none">
              <tr>
                <th className="px-3 py-2 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    {selectedIds.size > 0 && selectedIds.size === filteredParties.length ? (
                      <CheckSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                </th>
                <th
                  onClick={() => handleSort("name")}
                  className="px-3 py-2 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Party Name</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Mobile & Communications</th>
                <th className="px-3 py-2">Type</th>
                <th
                  onClick={() => handleSort("balance")}
                  className="px-3 py-2 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Balance (Dr / Cr)</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="px-3 py-2 text-center w-14 sticky right-0 bg-slate-50/95 dark:bg-slate-900/95 border-l border-slate-200/80 dark:border-slate-800 z-10">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-slate-900 dark:border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading parties...
                  </td>
                </tr>
              ) : filteredParties.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 space-y-3">
                    <Users2 className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">No parties found</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
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
                      className="gap-1.5 rounded-lg text-xs"
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
                        "hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group",
                        isSelected && "bg-blue-50/40 dark:bg-blue-950/20"
                      )}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelect(party.id)}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>
                      </td>

                      {/* Party Name */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center border border-slate-200/80 dark:border-slate-700/60 shrink-0">
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
                                className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors truncate"
                              >
                                {party.name}
                              </span>
                              {party.sharedLedgerEnabled && (
                                <span title="SharedLedger Connected" className="inline-flex">
                                  <Zap className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                              {party.tradeName && party.tradeName !== party.name && (
                                <span>{party.tradeName} ·</span>
                              )}
                              <span>{party.city || party.state || "India"}</span>
                              {party.gstin && (
                                <span className="font-mono text-slate-400 dark:text-slate-500">
                                  · GST: {party.gstin}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60">
                          {party.category || "General"}
                        </span>
                      </td>

                      {/* Mobile Number & 1-tap Communication Actions */}
                      <td className="px-3 py-2 font-mono">
                        {party.phone ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-900 dark:text-slate-100 font-medium tabular-nums">{party.phone}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const clean = party.phone?.replace(/[^0-9]/g, "");
                                const text = party.balance > 0
                                  ? `Hello ${party.name}, your outstanding receivable on CredSmart is ₹${party.balance.toLocaleString("en-IN")} (Dr). Kindly arrange the payment at your earliest convenience.`
                                  : party.balance < 0
                                  ? `Hello ${party.name}, your payable balance on CredSmart is ₹${Math.abs(party.balance).toLocaleString("en-IN")} (Cr).`
                                  : `Hello ${party.name}, your account on CredSmart is fully settled (₹0.00).`;
                                window.open(`https://wa.me/91${clean}?text=${encodeURIComponent(text)}`, "_blank");
                              }}
                              title="Chat on WhatsApp"
                              className="p-1 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/40 transition-colors cursor-pointer"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={`tel:${party.phone}`}
                              title="Call Party"
                              className="p-1 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/40 transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600">—</span>
                        )}
                      </td>

                      {/* Party Type Badge */}
                      <td className="px-3 py-2">
                        {isCustomer && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 uppercase">
                            Customer
                          </span>
                        )}
                        {isSupplier && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 border border-purple-200/80 dark:border-purple-800/60 uppercase">
                            Supplier
                          </span>
                        )}
                        {isBoth && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/60 uppercase">
                            Both
                          </span>
                        )}
                      </td>

                      {/* Directional Balance (Sortable) */}
                      <td className="px-3 py-2 text-right">
                        {party.balance > 0 ? (
                          <div className="inline-flex flex-col items-end">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-bold tabular-nums bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              Dr · ₹{party.balance.toLocaleString("en-IN")}
                            </span>
                            <span className="text-[11px] font-medium text-emerald-600/90 dark:text-emerald-400/90 font-mono">
                              To Collect
                            </span>
                          </div>
                        ) : party.balance < 0 ? (
                          <div className="inline-flex flex-col items-end">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-bold tabular-nums bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                              Cr · ₹{Math.abs(party.balance).toLocaleString("en-IN")}
                            </span>
                            <span className="text-[11px] font-medium text-rose-600/90 dark:text-rose-400/90 font-mono">
                              To Pay
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-medium tabular-nums bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60">
                            ₹0.00 · Settled
                          </span>
                        )}
                      </td>

                      {/* Actions Menu */}
                      <td className="px-3 py-2 text-center sticky right-0 bg-white group-hover:bg-slate-50/70 dark:bg-slate-900 dark:group-hover:bg-slate-800/40 transition-colors z-10 border-l border-slate-100 dark:border-slate-800/60">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
                              <MoreVertical className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" />
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
                              <Edit className="w-3.5 h-3.5 mr-2 text-slate-500" />
                              Edit Party Details
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => {
                                setSharedLedgerSelectedParty(party);
                                setShowSharedLedgerModal(true);
                              }}
                              className="text-xs cursor-pointer text-emerald-600 dark:text-emerald-400 font-medium"
                            >
                              <Share2 className="w-3.5 h-3.5 mr-2" />
                              SharedLedger Portal
                            </DropdownMenuItem>

                            {party.partyType === "customer" && (
                              <DropdownMenuItem
                                onClick={() => navigate(`/customers/${party.id}/ledger`)}
                                className="text-xs cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5 mr-2 text-slate-500" />
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
                              <Download className="w-3.5 h-3.5 mr-2 text-blue-600" />
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
                                  const text = party.balance > 0
                                    ? `Hello ${party.name}, your outstanding receivable on CredSmart is ₹${party.balance.toLocaleString("en-IN")} (Dr). Kindly arrange the payment at your earliest convenience.`
                                    : party.balance < 0
                                    ? `Hello ${party.name}, your payable balance on CredSmart is ₹${Math.abs(party.balance).toLocaleString("en-IN")} (Cr).`
                                    : `Hello ${party.name}, your account on CredSmart is fully settled (₹0.00).`;
                                  window.open(`https://wa.me/91${clean}?text=${encodeURIComponent(text)}`, "_blank");
                                }}
                                className="text-xs cursor-pointer text-emerald-600 dark:text-emerald-400"
                              >
                                <MessageSquare className="w-3.5 h-3.5 mr-2" />
                                Send WhatsApp Reminder
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteParty(party)}
                              className="text-xs cursor-pointer text-rose-600 dark:text-rose-400 font-medium"
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
        <div className="hidden md:block border-t border-slate-100 dark:border-slate-800">
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
        <div className="p-2 sm:px-4 sm:py-2.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between gap-2 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono">
          <span>
            Showing <strong className="text-slate-900 dark:text-white">{partiesTotalItems === 0 ? 0 : `${partiesStartIndex}–${partiesEndIndex}`}</strong> of{" "}
            {parties.length} parties
          </span>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline">
              Selected: <strong className="text-slate-900 dark:text-white">{selectedIds.size}</strong>
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
              Net: ₹ {toCollectTotal.toLocaleString("en-IN")}
            </span>
            {partiesTotalPages > 1 && (
              <div className="flex md:hidden items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPartiesPage(partiesPage - 1)}
                  disabled={!partiesHasPrev}
                  className="w-6.5 h-6.5 flex items-center justify-center rounded border border-slate-200 dark:border-slate-700 disabled:opacity-30"
                  aria-label="Previous Page"
                >
                  ‹
                </button>
                <span className="text-[11px] font-semibold">{partiesPage}/{partiesTotalPages}</span>
                <button
                  type="button"
                  onClick={() => setPartiesPage(partiesPage + 1)}
                  disabled={!partiesHasNext}
                  className="w-6.5 h-6.5 flex items-center justify-center rounded border border-slate-200 dark:border-slate-700 disabled:opacity-30"
                  aria-label="Next Page"
                >
                  ›
                </button>
              </div>
            )}
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
                  <span className="text-[11px] font-bold text-muted-foreground uppercase">Audited Parties</span>
                  <p className="text-xl font-black text-foreground mt-0.5">{auditResult.totalPartiesAudited}</p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                    {auditResult.reconciledPartiesCount} Verified Reconciled
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase">Trial Balance</span>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {auditResult.trialBalance.isBalanced ? "Balanced ✓" : "Variance"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Diff: ₹{auditResult.trialBalance.netDifference.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase">Total Receivables</span>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                    ₹{auditResult.totalReceivables.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">To Collect (Dr)</p>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase">Total Payables</span>
                  <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5 font-mono">
                    ₹{auditResult.totalPayables.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">To Pay (Cr)</p>
                </div>
              </div>

              {/* Party Reconciliation Table */}
              <div className="border border-border rounded-xl overflow-hidden bg-card">
                <div className="p-3 bg-muted/40 border-b border-border flex items-center justify-between">
                  <span className="font-bold text-foreground">Party Balances & Variance Verification</span>
                  <span className="text-[11px] text-muted-foreground font-semibold">Zero-Tolerance Double Entry</span>
                </div>
                <div className="max-h-60 overflow-y-auto overflow-x-auto w-full pb-2 scrollbar-thin">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/20 border-b border-border text-muted-foreground font-semibold uppercase text-[11px]">
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
                            <Badge variant="outline" className="text-[11px] py-0">
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
                                "text-[11px] py-0",
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
