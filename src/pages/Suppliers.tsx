import { useState, useEffect, useCallback, useMemo } from "react";
import { usePagination } from "@/hooks/usePagination";
import { PaginationBar } from "@/components/ui/PaginationBar";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Save,
  Users2,
  Phone,
  Mail,
  MapPin,
  Building2,
  IndianRupee,
  ArrowDownCircle,
  ArrowUpCircle,
  Truck,
  FileSpreadsheet,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  ExternalLink,
  Sparkles,
  KeyRound,
  ShoppingBag,
} from "lucide-react";
import { lookupGSTIN, isValidGSTIN, isValidPAN, lookupTaxIdentifier } from "@/utils/gstinLookup";
import { partiesApi } from "@/services/partiesApi";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate, Link } from "react-router-dom";
import { ROUTE_PATHS } from "@/config/routes";
import { CompanySearchAutocomplete } from "@/components/CompanySearchAutocomplete";
import { TallyGstSearchModal } from "@/components/settings/TallyGstSearchModal";

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  address: string | null;
  created_at: string;
  balance: number;
  custom_fields?: any /* eslint-disable-line @typescript-eslint/no-explicit-any */; // eslint-disable-line @typescript-eslint/no-explicit-any
  customItems?: any /* eslint-disable-line @typescript-eslint/no-explicit-any */[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  keepSamePrice?: boolean;
  keepSameInventory?: boolean;
}

interface FormData {
  name: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
}

const emptyForm: FormData = { name: "", phone: "", email: "", gstin: "", address: "" };

export default function Suppliers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { orgId, loading: orgLoading } = useOrganization();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "gst" | "credit">("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isLookingUpGst, setIsLookingUpGst] = useState(false);
  const [gstLookupSuccess, setGstLookupSuccess] = useState<string | null>(null);
  const [tallyModalOpen, setTallyModalOpen] = useState(false);

  // Credit modal
  const [creditModal, setCreditModal] = useState<{ supplierId: string; name: string } | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDesc, setCreditDesc] = useState("");
  const [creditType, setCreditType] = useState<"credit" | "payment">("credit");
  type CreditHistoryEntry = {
    id: string;
    amount: number | string | null;
    type: "credit" | "payment";
    description: string | null;
    created_at: string;
  };
  const [creditHistory, setCreditHistory] = useState<CreditHistoryEntry[]>([]);

  const triggerGstAutoFill = async (targetId: string, showToast = true) => {
    const clean = targetId.trim().toUpperCase();
    if (!clean) {
      if (showToast) toast.error("Please enter a valid 15-character GSTIN or 10-character PAN.");
      return;
    }
    if (!isValidGSTIN(clean) && !isValidPAN(clean)) {
      if (showToast) toast.error("Invalid format. Expected 15-char GSTIN (e.g. 24AABCA1234F1ZA) or 10-char PAN (e.g. AABCA1234F)");
      return;
    }

    setIsLookingUpGst(true);
    setGstLookupSuccess(null);
    try {
      const result = await lookupTaxIdentifier(clean);
      setForm((prev) => ({
        ...prev,
        name: result.legalName || prev.name,
        address: result.address || prev.address,
        phone: result.phone || prev.phone,
        email: result.email || prev.email,
        gstin: result.gstin || clean,
      }));

      if (result.legalName) {
        setGstLookupSuccess(`Verified: ${result.legalName} • ${result.state} (Active)`);
        if (showToast) {
          toast.success(`Verified details auto-filled for ${result.legalName}!`);
        }
      } else {
        setGstLookupSuccess(`State: ${result.state} • PAN: ${result.pan} (${result.category})`);
        if (showToast) {
          toast.info(`State: ${result.state} • PAN: ${result.pan} detected`);
        }
      }
    } catch (err: unknown) {
      if (showToast) {
        const message = err instanceof Error ? err.message : typeof err === "string" ? err : "Failed to fetch tax details.";
        toast.error(message);
      }
    } finally {
      setIsLookingUpGst(false);
    }
  };

  const handleGstinChange = (value: string) => {
    const clean = value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15);
    setForm((prev) => ({ ...prev, gstin: clean }));

    if (clean.length === 10 && isValidPAN(clean)) {
      triggerGstAutoFill(clean, false);
    } else if (clean.length === 15 && isValidGSTIN(clean)) {
      triggerGstAutoFill(clean, false);
    } else if (clean.length < 10) {
      setGstLookupSuccess(null);
    }
  };

  const fetchSuppliers = useCallback(async () => {
    if (!orgId) {
      setSuppliers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await partiesApi.getSuppliers(orgId, {
        sort: "name",
        order: "asc",
      });

      if (error) {
        console.error("fetchSuppliers error:", error);
        setSuppliers([]);
        setLoading(false);
        return;
      }

      const { data: credits, error: creditsError } = await partiesApi.getCreditTransactions({
        orgId,
        partyType: "supplier",
      });

      if (creditsError) {
        console.error("fetchSuppliers credits error:", creditsError);
      }

      const balanceMap: Record<string, number> = {};
      (credits || []).forEach((c) => {
        if (!balanceMap[c.party_id]) balanceMap[c.party_id] = 0;
        balanceMap[c.party_id] += c.type === "credit" ? Number(c.amount || 0) : -Number(c.amount || 0);
      });

      if (data) {
        setSuppliers(
          data.map((s: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            let cf = s.custom_fields;
            if (typeof cf === "string") {
              try {
                cf = JSON.parse(cf);
              } catch {
                cf = {};
              }
            }
            if (!cf || typeof cf !== "object") cf = {};
            const customItems = Array.isArray(cf.customItems)
              ? cf.customItems
              : Array.isArray(cf.custom_items)
              ? cf.custom_items
              : [];
            const keepSamePrice = cf.keepSamePrice !== false && cf.keep_same_price !== false;
            const keepSameInventory = cf.keepSameInventory !== false && cf.keep_same_inventory !== false;

            return {
              ...s,
              balance: balanceMap[s.id] || 0,
              custom_fields: cf,
              customItems,
              keepSamePrice,
              keepSameInventory,
            };
          })
        );
      }
    } catch (err) {
      console.error("fetchSuppliers unexpected error:", err);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (orgLoading) return;
    fetchSuppliers();
  }, [fetchSuppliers, orgLoading]);

  const filtered = useMemo(() => {
    return suppliers.filter((s) => {
      const matchSearch =
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.phone && s.phone.includes(search)) ||
        (s.gstin && s.gstin.toLowerCase().includes(search.toLowerCase())) ||
        (s.email && s.email.toLowerCase().includes(search.toLowerCase()));

      const matchFilter =
        filterType === "all" ||
        (filterType === "gst" && s.gstin && s.gstin.trim().length > 0) ||
        (filterType === "credit" && s.balance > 0);

      return matchSearch && matchFilter;
    });
  }, [suppliers, search, filterType]);

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    paginatedItems,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    hasNext,
    hasPrev,
  } = usePagination(filtered, 25);

  const gstinSuppliersCount = useMemo(() => {
    return suppliers.filter((s) => s.gstin && s.gstin.trim().length > 0).length;
  }, [suppliers]);

  const totalCreditPayables = useMemo(() => {
    return suppliers.reduce((s, sup) => s + Math.max(sup.balance, 0), 0);
  }, [suppliers]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (s: Supplier) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      phone: s.phone || "",
      email: s.email || "",
      gstin: s.gstin || "",
      address: s.address || "",
    });
    setShowForm(true);
  };

  const handleQuickPurchase = (s: Supplier) => {
    navigate(ROUTE_PATHS.purchases, {
      state: {
        openForm: true,
        supplierId: s.id,
        supplierName: s.name,
      },
    });
  };

  const handleSave = async () => {
    const nameTrimmed = form.name.trim();
    if (!nameTrimmed) {
      toast.error("Supplier name is required");
      return;
    }

    const gstinTrimmed = form.gstin.trim().toUpperCase();
    if (gstinTrimmed) {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(gstinTrimmed)) {
        toast.error("Invalid GSTIN format. Expected 15 characters (e.g. 29AAAAA0000A1Z5)");
        return;
      }
    }

    const emailTrimmed = form.email.trim();
    if (emailTrimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!orgId) return;
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await partiesApi.updateSupplier(editingId, {
          name: nameTrimmed,
          phone: form.phone.trim(),
          email: emailTrimmed,
          gstin: gstinTrimmed,
          address: form.address.trim(),
        }, orgId);
        if (error) throw error;
        toast.success("Supplier updated successfully");
      } else {
        const normName = nameTrimmed.toLowerCase();
        const existing = suppliers.find((s) => s.name.trim().toLowerCase() === normName);
        if (existing) {
          toast.error(`A supplier named "${nameTrimmed}" already exists!`);
          setSaving(false);
          return;
        }

        const { error } = await partiesApi.createSupplier({
          organization_id: orgId,
          name: nameTrimmed,
          phone: form.phone.trim(),
          email: emailTrimmed,
          gstin: gstinTrimmed,
          address: form.address.trim(),
        }, orgId);
        if (error) throw error;
        toast.success("Supplier created successfully");
      }
      setShowForm(false);
      fetchSuppliers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : typeof err === "string" ? err : "Failed to save supplier";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await partiesApi.deleteSupplier(id, orgId);
      if (error) {
        toast.error(
          error.message.includes("violates foreign key")
            ? "Cannot delete — supplier has linked invoices/purchases"
            : error.message
        );
      } else {
        toast.success("Supplier deleted");
        fetchSuppliers();
      }
    } catch (err: unknown) {
      console.error("handleDelete error:", err);
      const message = err instanceof Error ? err.message : typeof err === "string" ? err : "Failed to delete";
      toast.error(message);
    }
    setDeleteConfirm(null);
  };

  const openCreditModal = async (s: Supplier) => {
    setCreditModal({ supplierId: s.id, name: s.name });
    setCreditAmount("");
    setCreditDesc("");
    setCreditType("credit");
    try {
      const { data, error } = await partiesApi.getCreditTransactions({
        orgId,
        partyId: s.id,
        partyType: "supplier",
        order: "desc",
        limit: 20,
      });
      if (error) {
        console.error("openCreditModal error:", error);
        setCreditHistory([]);
      } else {
        setCreditHistory(data || []);
      }
    } catch (err) {
      console.error("openCreditModal unexpected error:", err);
      setCreditHistory([]);
    }
  };

  const handleCreditSubmit = async () => {
    const amt = parseFloat(creditAmount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!orgId || !user || !creditModal) return;
    try {
      const { error } = await partiesApi.recordCreditTransaction({
        organization_id: orgId,
        party_type: "supplier",
        party_id: creditModal.supplierId,
        amount: amt,
        type: creditType,
        description: creditDesc,
        created_by: user.id,
      }, orgId);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(creditType === "credit" ? "Credit recorded" : "Payment recorded");
      setCreditModal(null);
      fetchSuppliers();
    } catch (err: unknown) {
      console.error("handleCreditSubmit error:", err);
      const message = err instanceof Error ? err.message : typeof err === "string" ? err : "Failed to save credit transaction";
      toast.error(message);
    }
  };

  if (orgLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 py-6 sm:px-8 sm:py-8 space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white font-sans flex items-center gap-2.5">
              <Truck className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Suppliers &amp; Vendors
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>PROCUREMENT HUB</span>
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your procurement directory, GSTIN numbers, and supplier payables
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Button
            asChild
            variant="outline"
            className="gap-1.5 font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 rounded-xl text-xs h-9 shadow-xs"
          >
            <Link to={`${ROUTE_PATHS.parties}?bulk=1`}>
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Bulk Import</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="gap-2 font-medium bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 rounded-xl text-xs h-9 shadow-xs"
          >
            <Link to={ROUTE_PATHS.discovery}>
              <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Discover 3M+ Vendors
            </Link>
          </Button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl glowing-btn-amber text-white font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Supplier</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards - 3D Frosted Glass */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {/* Total Suppliers */}
        <div className="glass-card-3d p-2.5 sm:p-5 relative overflow-hidden group select-none">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 via-blue-500 to-indigo-600 rounded-l-2xl shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider font-mono truncate">Total Suppliers</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 hidden sm:flex">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1 sm:mt-3">
            <p className="text-sm sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono truncate">{suppliers.length}</p>
            <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 mt-1">Active vendor partners</p>
          </div>
        </div>

        {/* GST Registered */}
        <div className="glass-card-3d p-2.5 sm:p-5 relative overflow-hidden group select-none">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 via-teal-500 to-green-600 rounded-l-2xl shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-mono truncate">GST Registered</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hidden sm:flex">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1 sm:mt-3">
            <p className="text-sm sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono truncate">
              {gstinSuppliersCount}
            </p>
            <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 mt-1">With valid GSTIN on file</p>
          </div>
        </div>

        {/* Total Payables / Credit */}
        <div className="glass-card-3d p-5 relative overflow-hidden group select-none">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 via-orange-500 to-rose-600 rounded-l-2xl shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider font-mono">Supplier Payables</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight font-mono">
              ₹{totalCreditPayables.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Outstanding payable credit</p>
          </div>
        </div>

        {/* Recently Added */}
        <div className="glass-card-3d p-5 relative overflow-hidden group select-none">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 via-purple-500 to-violet-600 rounded-l-2xl shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-mono">New (Last 30 Days)</span>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
              {
                suppliers.filter((s) => {
                  const d = new Date(s.created_at);
                  return Date.now() - d.getTime() < 30 * 24 * 60 * 60 * 1000;
                }).length
              }
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Recently onboarded</p>
          </div>
        </div>
      </div>

      {/* Search & Filters - Frosted Glass Container */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by supplier name, phone, email, or GSTIN..."
              className="w-full h-10 pl-10 pr-10 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all text-xs"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/50 shrink-0 overflow-x-auto">
            {([
              { id: "all", label: "All Suppliers", count: suppliers.length },
              { id: "gst", label: "GST Registered", count: gstinSuppliersCount },
              { id: "credit", label: "Has Balance", count: suppliers.filter((s) => s.balance > 0).length },
            ] as const).map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5",
                  filterType === f.id
                    ? "bg-background text-foreground shadow-sm border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full",
                    filterType === f.id ? "bg-primary/10 text-primary font-bold" : "bg-muted text-muted-foreground"
                  )}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Supplier List / Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
              <Truck className="w-7 h-7 opacity-50" />
            </div>
            <h3 className="text-base font-bold text-foreground">No Suppliers Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              {suppliers.length === 0
                ? "You haven't registered any suppliers yet. Add your first supplier to track purchases."
                : "No supplier records matched your search term or filter criteria."}
            </p>
            {suppliers.length === 0 && (
              <Button onClick={openCreate} size="sm" className="mt-4 gap-1.5 text-xs font-semibold">
                <Plus className="w-4 h-4" /> Add First Supplier
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile View: Cards */}
            <div className="block md:hidden divide-y divide-border pb-24">
              {paginatedItems.map((s) => (
                <div key={s.id} className="p-4 space-y-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{s.name}</p>
                        {s.gstin && (
                          <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 mt-0.5 bg-background">
                            GST: {s.gstin}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {s.balance > 0 && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                        ₹{s.balance.toFixed(2)} Due
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    {s.phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> {s.phone}
                      </p>
                    )}
                    {s.email && (
                      <p className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" /> {s.email}
                      </p>
                    )}
                    {s.address && (
                      <p className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 shrink-0" /> {s.address}
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      onClick={() => handleQuickPurchase(s)}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" /> New Purchase
                    </Button>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        onClick={() => openCreditModal(s)}
                        title="Manage Credit"
                      >
                        <IndianRupee className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)} title="Edit Supplier">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteConfirm(s.id)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {deleteConfirm === s.id && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 mt-2">
                      <span className="text-xs font-medium text-destructive">Delete this supplier?</span>
                      <div className="flex gap-2">
                        <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => handleDelete(s.id)}>
                          Delete
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDeleteConfirm(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                    <th className="text-left px-5 py-3.5">Supplier Name</th>
                    <th className="text-left px-5 py-3.5">Contact Details</th>
                    <th className="text-left px-5 py-3.5">GSTIN</th>
                    <th className="text-left px-5 py-3.5">Address</th>
                    <th className="text-right px-5 py-3.5">Payable Balance</th>
                    <th className="text-right px-5 py-3.5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedItems.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors group">
                      {/* Name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{s.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              Added {new Date(s.created_at).toLocaleDateString("en-IN")}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-4">
                        <div className="space-y-0.5 text-xs">
                          {s.phone && (
                            <p className="font-mono text-foreground flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-muted-foreground" /> {s.phone}
                            </p>
                          )}
                          {s.email && (
                            <p className="text-muted-foreground flex items-center gap-1.5 truncate max-w-[170px]">
                              <Mail className="w-3 h-3 text-muted-foreground" /> {s.email}
                            </p>
                          )}
                          {!s.phone && !s.email && <span className="text-muted-foreground">—</span>}
                        </div>
                      </td>

                      {/* GSTIN */}
                      <td className="px-5 py-4">
                        {s.gstin ? (
                          <Badge
                            variant="outline"
                            className="font-mono text-xs px-2.5 py-1 bg-background border-border/80 text-foreground font-semibold gap-1"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            {s.gstin}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs font-medium">Unregistered</span>
                        )}
                      </td>

                      {/* Address */}
                      <td className="px-5 py-4">
                        {s.address ? (
                          <span className="text-muted-foreground text-xs truncate max-w-[180px] block" title={s.address}>
                            {s.address}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>

                      {/* Balance */}
                      <td className="px-5 py-4 text-right">
                        {s.balance > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            ₹{s.balance.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground font-medium">Settled (₹0)</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs gap-1.5 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold"
                            onClick={() => handleQuickPurchase(s)}
                            title="Create Purchase from Supplier"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">+ Purchase</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            title="Manage Credit"
                            onClick={() => openCreditModal(s)}
                          >
                            <IndianRupee className="w-3.5 h-3.5" />
                          </Button>

                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)} title="Edit Supplier">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>

                          {deleteConfirm === s.id ? (
                            <div className="flex items-center gap-1 bg-destructive/10 p-1 rounded-lg border border-destructive/20">
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-6 text-[11px] px-2"
                                onClick={() => handleDelete(s.id)}
                              >
                                Confirm
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[11px] px-2"
                                onClick={() => setDeleteConfirm(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteConfirm(s.id)}
                              title="Delete Supplier"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <PaginationBar
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              startIndex={startIndex}
              endIndex={endIndex}
              hasNext={hasNext}
              hasPrev={hasPrev}
              onPageChange={setPage}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>

      {/* Create / Edit Supplier Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center px-4 pt-6 pb-6 overflow-y-auto animate-fade-in">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl sm:max-w-3xl overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    {editingId ? "Edit Supplier Record" : "Add New Supplier"}
                  </h2>
                  <p className="text-xs text-muted-foreground">Register vendor details and tax credentials</p>
                </div>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* MCA 3M+ Live Company Search */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">Live MCA Company Search (3M+ Indian Suppliers)</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground bg-background/80 px-2 py-0.5 rounded border border-border">
                    Auto-fills Name & Address
                  </span>
                </div>
                <CompanySearchAutocomplete
                  onSelect={(comp) => {
                    setForm((prev) => ({
                      ...prev,
                      name: comp.name,
                      address: comp.address || prev.address,
                      phone: comp.phone || prev.phone,
                    }));
                    setGstLookupSuccess(`Selected: ${comp.name} • ${comp.state || "India"}`);
                    toast.success(`Loaded verified supplier: ${comp.name}`);
                  }}
                  placeholder="Search any registered supplier by name or CIN..."
                />
              </div>

              {/* GSTIN / PAN Auto Lookup Banner */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold text-foreground">GSTIN / PAN Tax Verification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTallyModalOpen(true)}
                      className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 bg-[#FCB316]/15 px-2 py-0.5 rounded border border-amber-500/30"
                    >
                      <Building2 className="w-3 h-3 text-[#D97706] dark:text-[#FBBF24]" />
                      Tally Search
                    </button>
                    <span className="text-[10px] text-muted-foreground bg-background/80 px-2 py-0.5 rounded border border-border hidden sm:inline-block">
                      Official Tally Live Engine
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      className="pl-9 h-10 rounded-xl font-mono uppercase tracking-wider text-xs"
                      placeholder="Enter 15-char GSTIN or 10-char PAN..."
                      value={form.gstin}
                      onChange={(e) => handleGstinChange(e.target.value)}
                      maxLength={15}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => triggerGstAutoFill(form.gstin, true)}
                    disabled={isLookingUpGst || !form.gstin || form.gstin.length < 10}
                    className="shrink-0 gap-1.5 border-blue-500/40 text-blue-600 hover:bg-blue-500 hover:text-white text-xs rounded-xl h-10 px-3"
                  >
                    {isLookingUpGst ? (
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Verify
                  </Button>
                </div>

                {gstLookupSuccess && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium pt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{gstLookupSuccess}</span>
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Supplier / Company Name *
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-9 h-10 rounded-xl"
                    placeholder="e.g. Apex Wholesalers Pvt Ltd"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    autoFocus
                  />
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Phone Number
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      className="pl-9 h-10 rounded-xl"
                      placeholder="+91 98765 43210"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      className="pl-9 h-10 rounded-xl"
                      type="email"
                      placeholder="vendor@company.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Vendor Address / Warehouse Location
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <textarea
                    className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none transition-all"
                    rows={2}
                    placeholder="Full business address, state, pin code"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving} className="rounded-xl font-semibold gap-1.5">
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {editingId ? "Update Supplier" : "Save Supplier"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Credit Modal */}
      {creditModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center px-4 pt-6 pb-6 overflow-y-auto animate-fade-in">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-xl sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <IndianRupee className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Supplier Credit & Payables</h2>
                  <p className="text-xs text-muted-foreground truncate max-w-[240px]">Supplier: {creditModal.name}</p>
                </div>
              </div>
              <button
                onClick={() => setCreditModal(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Type Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted/50 rounded-xl border border-border/60">
                <button
                  type="button"
                  onClick={() => setCreditType("credit")}
                  className={cn(
                    "py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all",
                    creditType === "credit"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  Supplier Credit (Payable)
                </button>
                <button
                  type="button"
                  onClick={() => setCreditType("payment")}
                  className={cn(
                    "py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all",
                    creditType === "payment"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ArrowDownCircle className="w-4 h-4" />
                  Made Payment (Settlement)
                </button>
              </div>

              {/* Amount & Description */}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Transaction Amount (₹) *
                  </Label>
                  <div className="relative mt-1">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      className="pl-9 h-10 rounded-xl font-bold text-base"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Particulars / Reference (Optional)
                  </Label>
                  <Input
                    placeholder="e.g. PO #892 goods delivered on credit, Bank Transfer ref..."
                    value={creditDesc}
                    onChange={(e) => setCreditDesc(e.target.value)}
                    className="mt-1 h-10 rounded-xl"
                  />
                </div>

                <Button className="w-full h-10 rounded-xl font-semibold gap-1.5 mt-2" onClick={handleCreditSubmit}>
                  {creditType === "credit" ? "Record Payable Credit" : "Confirm Payment to Supplier"}
                </Button>
              </div>

              {/* History */}
              {creditHistory.length > 0 && (
                <div className="pt-3 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Recent Credit History
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {creditHistory.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50 text-xs"
                      >
                        <div>
                          <span
                            className={cn(
                              "font-bold px-2 py-0.5 rounded-full text-[10px]",
                              t.type === "credit"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            )}
                          >
                            {t.type === "credit" ? "Credit Payable" : "Payment Made"}
                          </span>
                          {t.description && <p className="text-muted-foreground mt-1 font-medium">{t.description}</p>}
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(t.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "font-bold text-sm",
                            t.type === "credit" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          {t.type === "credit" ? "+" : "-"}₹{Number(t.amount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <TallyGstSearchModal
        open={tallyModalOpen}
        onOpenChange={setTallyModalOpen}
        initialGstin={form.gstin}
        onApply={(result) => {
          setForm((prev) => ({
            ...prev,
            name: result.legalName || prev.name,
            address: result.address || prev.address,
            phone: result.phone || prev.phone,
            gstin: result.gstin || prev.gstin,
          }));
          setGstLookupSuccess(`Verified via Tally: ${result.legalName} • ${result.state} (${result.status})`);
        }}
      />
    </div>
  );
}
