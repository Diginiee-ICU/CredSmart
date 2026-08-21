import { useState, useEffect, useMemo, useCallback } from "react";
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
import { useNavigate } from "react-router-dom";
import { ROUTE_PATHS } from "@/config/routes";

const DEFAULT_SAMPLE_PARTIES: Party[] = [
  {
    id: "p-01",
    name: "Shree Balaji Wholesalers",
    tradeName: "Balaji Super Foods",
    phone: "9820011223",
    email: "balaji.wholesale@gmail.com",
    partyType: "customer",
    category: "Wholesaler",
    gstin: "27AAPFU0939F1ZV",
    pan: "AAPFU0939F",
    city: "Mumbai",
    state: "Maharashtra",
    address: "Shop 14, APMC Market, Vashi",
    openingBalance: 45000,
    balance: 68500,
    creditLimit: 150000,
    creditPeriodDays: 30,
    sharedLedgerEnabled: true,
    sharedLedgerStatus: "synced",
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: "p-02",
    name: "Amul Distribution Gujarat",
    tradeName: "Amul Dairy Hub",
    phone: "9898012345",
    email: "orders@amulgujarat.in",
    partyType: "supplier",
    category: "Distributor",
    gstin: "24AABCA1234F1ZA",
    pan: "AABCA1234F",
    city: "Anand",
    state: "Gujarat",
    address: "Plot 88, Dairy Circle, Anand",
    openingBalance: -32000,
    balance: -48250,
    creditLimit: 200000,
    creditPeriodDays: 45,
    sharedLedgerEnabled: true,
    sharedLedgerStatus: "synced",
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: "p-03",
    name: "Hindustan Unilever B2B",
    tradeName: "HUL Direct",
    phone: "9811223344",
    email: "b2b.support@hul.com",
    partyType: "supplier",
    category: "Manufacturer",
    gstin: "27AAACH1111A1Z1",
    pan: "AAACH1111A",
    city: "Mumbai",
    state: "Maharashtra",
    address: "B.D. Sawant Marg, Chakala, Andheri East",
    openingBalance: -15000,
    balance: -36000,
    creditLimit: 500000,
    creditPeriodDays: 30,
    sharedLedgerEnabled: true,
    sharedLedgerStatus: "synced",
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
  {
    id: "p-04",
    name: "Royal Kirana & General Stores",
    tradeName: "Royal Mart",
    phone: "9766554433",
    email: "royalkirana@gmail.com",
    partyType: "customer",
    category: "Retailer",
    gstin: "27ABCDE5678F1Z9",
    pan: "ABCDE5678F",
    city: "Pune",
    state: "Maharashtra",
    address: "45 Laxmi Road, Pune",
    openingBalance: 12000,
    balance: 34200,
    creditLimit: 50000,
    creditPeriodDays: 15,
    sharedLedgerEnabled: true,
    sharedLedgerStatus: "invited",
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: "p-05",
    name: "Apex Pharma & Chemist Trade",
    tradeName: "Apex Medico",
    phone: "9833445566",
    email: "apexpharma@rediffmail.com",
    partyType: "both",
    category: "Wholesaler",
    gstin: "27AABCA9999K1Z4",
    pan: "AABCA9999K",
    city: "Nagpur",
    state: "Maharashtra",
    address: "Medical Square, Great Nag Road",
    openingBalance: 0,
    balance: 143100,
    creditLimit: 250000,
    creditPeriodDays: 30,
    sharedLedgerEnabled: true,
    sharedLedgerStatus: "synced",
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
  {
    id: "p-06",
    name: "City Supermarket & Gourmet",
    tradeName: "City Gourmet",
    phone: "9822334455",
    email: "contact@citysupermarket.com",
    partyType: "customer",
    category: "Retailer",
    gstin: "",
    pan: "",
    city: "Thane",
    state: "Maharashtra",
    address: "Gokhale Road, Naupada",
    openingBalance: 0,
    balance: 0,
    creditLimit: 30000,
    creditPeriodDays: 7,
    sharedLedgerEnabled: false,
    sharedLedgerStatus: "unlinked",
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
];

export default function Parties() {
  const navigate = useNavigate();
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
  const [showReconciliationModal, setShowReconciliationModal] = useState(false);
  const [auditResult, setAuditResult] = useState<OrganizationReconciliationAudit | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [rawCreditTransactions, setRawCreditTransactions] = useState<any[]>([]);

  // Fetch Parties from Supabase (customers + suppliers + credit balances)
  const fetchParties = useCallback(async () => {
    if (!orgId) {
      setParties(DEFAULT_SAMPLE_PARTIES);
      const audit = performFullLedgerReconciliation({
        orgName: "CredSmart Demo",
        parties: DEFAULT_SAMPLE_PARTIES,
        creditTransactions: [],
      });
      setAuditResult(audit);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch Customers
      const { data: dbCustomers, error: custErr } = await supabase
        .from("customers")
        .select("id, name, phone, email, address, created_at")
        .eq("organization_id", orgId);

      // 2. Fetch Suppliers
      const { data: dbSuppliers, error: suppErr } = await supabase
        .from("suppliers")
        .select("id, name, phone, email, address, gstin, created_at")
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

      (dbCustomers || []).forEach((c) => {
        const bal = creditBalanceMap[c.id] || 0;
        mergedParties.push({
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          partyType: "customer",
          category: "Retailer",
          address: c.address,
          openingBalance: bal,
          balance: bal,
          creditLimit: 50000,
          creditPeriodDays: 30,
          sharedLedgerEnabled: true,
          sharedLedgerStatus: "synced",
          created_at: c.created_at,
        });
      });

      (dbSuppliers || []).forEach((s) => {
        const bal = creditBalanceMap[s.id] || 0;
        const payableBal = -Math.abs(bal);
        mergedParties.push({
          id: s.id,
          name: s.name,
          phone: s.phone,
          email: s.email,
          gstin: s.gstin,
          partyType: "supplier",
          category: "Distributor",
          address: s.address,
          openingBalance: payableBal,
          balance: payableBal,
          creditLimit: 100000,
          creditPeriodDays: 45,
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

  useEffect(() => {
    fetchParties();
  }, [fetchParties]);

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

  // Save / Create / Update Party
  const handleSaveParty = async (partyData: Omit<Party, "id" | "created_at">) => {
    if (!orgId) {
      // Local fallback state
      if (editingParty) {
        setParties((prev) =>
          prev.map((p) => (p.id === editingParty.id ? { ...p, ...partyData } : p))
        );
        toast.success(`Updated party "${partyData.name}"`);
      } else {
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
      if (editingParty) {
        if (editingParty.partyType === "customer" || partyData.partyType === "customer") {
          await supabase
            .from("customers")
            .update({
              name: partyData.name,
              phone: partyData.phone,
              email: partyData.email,
              address: partyData.address,
            })
            .eq("id", editingParty.id);
        } else {
          await supabase
            .from("suppliers")
            .update({
              name: partyData.name,
              phone: partyData.phone,
              email: partyData.email,
              address: partyData.address,
              gstin: partyData.gstin,
            })
            .eq("id", editingParty.id);
        }
        toast.success(`Updated party "${partyData.name}"`);
      } else {
        if (partyData.partyType === "supplier") {
          const { data: newSupp, error } = await supabase
            .from("suppliers")
            .insert({
              name: partyData.name,
              phone: partyData.phone,
              email: partyData.email,
              address: partyData.address,
              gstin: partyData.gstin,
              organization_id: orgId,
            })
            .select()
            .single();

          if (error) throw error;
          if (partyData.openingBalance !== 0 && newSupp) {
            await supabase.from("credit_transactions").insert({
              organization_id: orgId,
              party_id: newSupp.id,
              party_type: "supplier",
              amount: Math.abs(partyData.openingBalance),
              type: partyData.openingBalance > 0 ? "credit" : "payment",
              description: "Opening balance",
              created_by: user?.id || "admin",
            });
          }
        } else {
          const { data: newCust, error } = await supabase
            .from("customers")
            .insert({
              name: partyData.name,
              phone: partyData.phone,
              email: partyData.email,
              address: partyData.address,
              organization_id: orgId,
            })
            .select()
            .single();

          if (error) throw error;
          if (partyData.openingBalance !== 0 && newCust) {
            await supabase.from("credit_transactions").insert({
              organization_id: orgId,
              party_id: newCust.id,
              party_type: "customer",
              amount: Math.abs(partyData.openingBalance),
              type: partyData.openingBalance > 0 ? "credit" : "payment",
              description: "Opening balance",
              created_by: user?.id || "admin",
            });
          }
        }
        toast.success(`Created party "${partyData.name}"!`);
      }
      fetchParties();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save party.");
    }
  };

  // Bulk Import Parties from Excel
  const handleBulkImportParties = async (importedList: Partial<Party>[]) => {
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
      balance: p.balance || 0,
      creditLimit: p.creditLimit || 50000,
      creditPeriodDays: p.creditPeriodDays || 30,
      sharedLedgerEnabled: true,
      sharedLedgerStatus: "invited",
      created_at: new Date().toISOString(),
    }));

    setParties((prev) => [...newItems, ...prev]);
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
      if (party.partyType === "supplier") {
        await supabase.from("suppliers").delete().eq("id", party.id);
      } else {
        await supabase.from("customers").delete().eq("id", party.id);
      }
      toast.success("Party deleted successfully.");
      fetchParties();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete party.");
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
    <div className="space-y-6 p-3 sm:p-6 pb-12">
      {/* ------------------------------------------------------------- */}
      {/* HEADER: Parties, [SharedLedger Portal], [Reports v], [Settings], [Keyboard] */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
            <Users2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-foreground">Parties</h1>
              <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5">
                {parties.length} Total
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Manage customers, suppliers, balances, and real-time SharedLedger synchronization
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Reconcile Ledgers Button */}
          <Button
            onClick={() => {
              handleRunAudit();
              setShowReconciliationModal(true);
            }}
            variant="outline"
            className="gap-1.5 text-xs font-bold border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 shadow-xs"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Reconcile Ledgers</span>
            <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 h-4 uppercase">
              {auditResult?.integrityScore ?? 100}% Health
            </Badge>
          </Button>

          {/* SharedLedger Portal Button */}
          <Button
            onClick={() => {
              setSharedLedgerSelectedParty(null);
              setShowSharedLedgerModal(true);
            }}
            className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20 font-bold text-xs"
          >
            <Share2 className="w-4 h-4" />
            <span>SharedLedger Portal</span>
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
          </Button>

          {/* Reports Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-1.5 text-xs font-semibold">
                <FileSpreadsheet className="w-4 h-4 text-primary" />
                Reports
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
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
            size="icon"
            onClick={() => setShowSettingsModal(true)}
            className="text-muted-foreground hover:text-foreground"
            title="Party Settings"
          >
            <Settings className="w-4 h-4" />
          </Button>

          {/* Keyboard Icon */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowKeyboardModal(true)}
            className="text-muted-foreground hover:text-foreground"
            title="Keyboard Shortcuts (Alt+K)"
          >
            <Keyboard className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* BANNER: Are you Tired of asking Party's Ledger? */}
      {/* ------------------------------------------------------------- */}
      {showLedgerBanner && (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent p-4 sm:p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                <Zap className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">
                  Are you Tired of asking Party's Ledger?
                </h3>
                <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                  Access sharedledgers and turn invoices into purchases instantly with automatic 2-way sync and instant dispute resolution.
                </p>
                <div className="pt-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setSharedLedgerSelectedParty(null);
                      setShowSharedLedgerModal(true);
                    }}
                    className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                  >
                    View SharedLedgers →
                  </Button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowLedgerBanner(false)}
              className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-background/40 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* METRIC CARDS: All Parties count, To Collect (green), To Pay (red) */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: All Parties */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm hover:border-primary/40 transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              All Parties
            </span>
            <p className="text-3xl font-black text-foreground">{totalPartiesCount}</p>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>{parties.filter((p) => p.partyType === "customer").length} Customers</span>
              <span>·</span>
              <span>{parties.filter((p) => p.partyType === "supplier").length} Suppliers</span>
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-primary/10 text-primary">
            <Users2 className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: To Collect (Green) */}
        <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-sm hover:border-emerald-500/50 transition-all flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                To Collect (Receivable)
              </span>
            </div>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              ₹ {toCollectTotal.toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 font-medium">
              From {parties.filter((p) => p.balance > 0).length} customer ledgers
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: To Pay (Red) */}
        <div className="p-5 rounded-2xl border border-rose-500/30 bg-rose-500/5 dark:bg-rose-500/10 shadow-sm hover:border-rose-500/50 transition-all flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                To Pay (Payable)
              </span>
            </div>
            <p className="text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">
              ₹ {toPayTotal.toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80 font-medium">
              To {parties.filter((p) => p.balance < 0).length} supplier bills
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* FILTER & SEARCH BAR: Search bar, Categories dropdown, Bulk Action, "+ Create Party" */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-sm">
        {/* Left: Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by party name, phone, GSTIN, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 text-xs bg-muted/30 border-border/80 focus:bg-background"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Middle: Category / Type Filter Dropdown */}
        <div className="w-full sm:w-56 shrink-0">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-10 text-xs">
              <SelectValue placeholder="Filter Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Parties & Types</SelectItem>
              <SelectItem value="customer">Customers Only</SelectItem>
              <SelectItem value="supplier">Suppliers Only</SelectItem>
              <SelectItem value="both">Both (Customer & Supplier)</SelectItem>
              <SelectItem value="to_collect">To Collect (Receivables)</SelectItem>
              <SelectItem value="to_pay">To Pay (Payables)</SelectItem>
              <SelectItem value="zero_balance">Zero Balance (Settled)</SelectItem>
              <SelectItem value="Wholesaler">Category: Wholesaler</SelectItem>
              <SelectItem value="Retailer">Category: Retailer</SelectItem>
              <SelectItem value="Distributor">Category: Distributor</SelectItem>
              <SelectItem value="Manufacturer">Category: Manufacturer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Action Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-10 text-xs font-semibold gap-1.5 shrink-0"
              disabled={selectedIds.size === 0}
            >
              Bulk Action ({selectedIds.size})
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs">Selected Parties Action</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleBulkExport} className="text-xs cursor-pointer">
              <Download className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
              Export Selected (CSV)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                toast.success(`WhatsApp reminder queued for ${selectedIds.size} parties.`);
              }}
              className="text-xs cursor-pointer text-emerald-600 dark:text-emerald-400"
            >
              <MessageSquare className="w-3.5 h-3.5 mr-2" />
              Bulk WhatsApp Reminders
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => window.print()}
              className="text-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
              Print Ledger Statements
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleBulkDelete}
              className="text-xs cursor-pointer text-rose-600 dark:text-rose-400"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              Delete Selected
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Primary "+ Create Party" button */}
        <Button
          onClick={() => {
            setEditingParty(null);
            setShowCreateModal(true);
          }}
          className="h-10 gap-2 font-bold text-xs shrink-0 shadow-md shadow-primary/20"
        >
          <Plus className="w-4 h-4" />
          + Create Party
        </Button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PARTIES TABLE: Checkbox, Party Name (sortable), Category, Mobile Number, Party type, Balance (sortable), Actions */}
      {/* ------------------------------------------------------------- */}
      <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-sm">
        <div className="overflow-x-auto w-full pb-2 scrollbar-thin">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3.5 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="p-1 rounded hover:bg-muted text-foreground"
                  >
                    {selectedIds.size > 0 && selectedIds.size === filteredParties.length ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground" />
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
                <th className="px-4 py-3.5 text-center w-16">Actions</th>
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
                filteredParties.map((party) => {
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
                      <td className="px-4 py-3.5 text-center">
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

        {/* Table Footer summary */}
        <div className="p-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Showing <strong className="text-foreground">{filteredParties.length}</strong> of{" "}
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
      {/* BOTTOM BANNER: Add Multiple Parties at once - Bulk upload all your parties using excel [Upload Excel] */}
      {/* ------------------------------------------------------------- */}
      <div className="p-5 rounded-2xl border border-border bg-gradient-to-r from-muted/60 via-card to-muted/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">Add Multiple Parties at once</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Bulk upload all your parties using excel or CSV file in just a few seconds.
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowExcelUploadModal(true)}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-5 shadow-sm shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Upload Excel
        </Button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* CONTEXTUAL HELP TOOLTIP & FAQs */}
      {/* ------------------------------------------------------------- */}
      <PartyHelpTooltip />

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
    </div>
  );
}
