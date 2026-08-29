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
  IndianRupee,
  ArrowDownCircle,
  ArrowUpCircle,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  KeyRound,
  FileSpreadsheet,
  MessageSquare,
  Send,
  Columns,
  LayoutGrid,
  ExternalLink,
  Copy,
} from "lucide-react";
import { lookupGSTIN, isValidGSTIN, isValidPAN, lookupTaxIdentifier } from "@/utils/gstinLookup";
import { supabase } from "@/integrations/supabase/client";
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
import { SwipeableListItem } from "@/components/ui/SwipeableListItem";
import {
  playSuccessChime,
  playScanBeep,
  triggerHapticSuccess,
  triggerHapticScan,
  triggerHapticDelete,
} from "@/utils/soundAndHaptics";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
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
  address: string;
  gstin?: string;
}

const emptyForm: FormData = { name: "", phone: "", email: "", address: "", gstin: "" };

export default function Customers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { orgId, loading: orgLoading } = useOrganization();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [creditFilter, setCreditFilter] = useState<"all" | "due" | "clear">("all");
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
  const [creditModal, setCreditModal] = useState<{ customerId: string; name: string } | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDesc, setCreditDesc] = useState("");
  const [creditType, setCreditType] = useState<"credit" | "payment">("credit");
  const [creditHistory, setCreditHistory] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any

  // Split-screen & Selected customer state
  const [desktopLayoutMode, setDesktopLayoutMode] = useState<"split" | "table">("split");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [loadingTx, setLoadingTx] = useState(false);

  const fetchCustomerTransactions = useCallback(async (customerId: string) => {
    if (!orgId || !customerId) return;
    setLoadingTx(true);
    try {
      const { data: txData } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("party_id", customerId)
        .order("created_at", { ascending: false })
        .limit(15);
      setSelectedTransactions(txData || []);
    } catch (e) {
      console.error("Failed to load customer transactions:", e);
    } finally {
      setLoadingTx(false);
    }
  }, [orgId]);

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomerId(c.id);
    playScanBeep();
    triggerHapticScan();
    fetchCustomerTransactions(c.id);
  };

  const handleSendWhatsAppReminder = (c: Customer) => {
    const rawPhone = c.phone ? c.phone.replace(/\D/g, "") : "";
    const phoneParam = rawPhone.length >= 10 ? `91${rawPhone.slice(-10)}` : "";
    const balanceText = c.balance > 0 ? `₹${c.balance.toFixed(2)}` : "₹0.00";
    const message = `Hello *${c.name}*,\n\nThis is a friendly reminder regarding your pending balance of *${balanceText}* at our store.\n\nPlease clear the balance at your earliest convenience via UPI or cash.\n\nThank you!`;
    const waUrl = phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");
    triggerHapticSuccess();
    toast.success(`WhatsApp reminder opened for ${c.name}`);
  };

  const handleQuickCall = (c: Customer) => {
    if (c.phone) {
      window.location.href = `tel:${c.phone}`;
    } else {
      toast.error("No phone number saved for this customer.");
    }
  };

  const triggerGstAutoFill = async (targetId: string, showToast = true) => {
    const clean = targetId.trim().toUpperCase();
    if (!clean) {
      if (showToast) toast.error("Please enter a valid 15-character GSTIN or 10-character PAN.");
      return;
    }
    if (!isValidGSTIN(clean) && !isValidPAN(clean)) {
      if (showToast) toast.error("Invalid format. Expected 15-char GSTIN (e.g. 27AAPFU0939F1ZV) or 10-char PAN (e.g. AAPFU0939F)");
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
        toast.error(err?.message || "Failed to fetch tax details.");
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

  const fetchCustomers = useCallback(async () => {
    if (!orgId) {
      setCustomers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: custs, error } = await supabase
        .from("customers")
        .select("id, name, phone, email, address, created_at, custom_fields")
        .eq("organization_id", orgId)
        .order("name");

      if (error) {
        console.error("fetchCustomers error:", error);
        setCustomers([]);
        setLoading(false);
        return;
      }

      const { data: credits, error: creditsError } = await supabase
        .from("credit_transactions")
        .select("party_id, amount, type")
        .eq("organization_id", orgId)
        .eq("party_type", "customer");

      if (creditsError) {
        console.error("fetchCustomers credits error:", creditsError);
      }

      const balanceMap: Record<string, number> = {};
      (credits || []).forEach((c) => {
        if (!balanceMap[c.party_id]) balanceMap[c.party_id] = 0;
        balanceMap[c.party_id] += c.type === "credit" ? Number(c.amount || 0) : -Number(c.amount || 0);
      });

      if (custs) {
        setCustomers(
          custs.map((c: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            let cf = c.custom_fields;
            if (typeof cf === "string") {
              try {
                cf = JSON.parse(cf);
              } catch {
                cf = {};
              }
            }
            if (!cf || typeof cf !== "object") cf = {};
            const customItems = Array.isArray(cf.customItems) ? cf.customItems : Array.isArray(cf.custom_items) ? cf.custom_items : [];
            const keepSamePrice = cf.keepSamePrice !== false && cf.keep_same_price !== false;
            const keepSameInventory = cf.keepSameInventory !== false && cf.keep_same_inventory !== false;

            return {
              ...c,
              balance: balanceMap[c.id] || 0,
              custom_fields: cf,
              customItems,
              keepSamePrice,
              keepSameInventory,
            };
          })
        );
      }
    } catch (err) {
      console.error("fetchCustomers unexpected error:", err);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (orgLoading) return;
    fetchCustomers();
  }, [fetchCustomers, orgLoading]);

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone && c.phone.includes(search)) ||
        (c.email && c.email.toLowerCase().includes(search.toLowerCase()));

      const matchCredit =
        creditFilter === "all" ||
        (creditFilter === "due" && c.balance > 0) ||
        (creditFilter === "clear" && c.balance <= 0);

      return matchSearch && matchCredit;
    });
  }, [customers, search, creditFilter]);

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    paginatedItems: paginatedCustomers,
    totalPages,
    totalItems: totalCustomerCount,
    startIndex,
    endIndex,
    hasNext,
    hasPrev,
  } = usePagination(filtered, 25);

  const totalOutstandingCredit = useMemo(() => {
    return customers.reduce((s, c) => s + Math.max(c.balance, 0), 0);
  }, [customers]);

  const customersWithDue = useMemo(() => {
    return customers.filter((c) => c.balance > 0).length;
  }, [customers]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (c: Customer) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      phone: c.phone || "",
      email: c.email || "",
      address: c.address || "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!orgId) return;
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from("customers")
          .update({
            name: form.name.trim(),
            phone: form.phone,
            email: form.email,
            address: form.address,
          })
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Customer updated successfully");
      } else {
        const { error } = await supabase
          .from("customers")
          .insert({
            organization_id: orgId,
            name: form.name.trim(),
            phone: form.phone,
            email: form.email,
            address: form.address,
          });
        if (error) throw error;
        toast.success("Customer created successfully");
      }
      setShowForm(false);
      fetchCustomers();
    } catch (err: unknown) {
      toast.error(err.message || "Failed to save customer");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) toast.error(error.message);
      else {
        toast.success("Customer deleted");
        fetchCustomers();
      }
    } catch (err: unknown) {
      console.error("handleDelete error:", err);
      toast.error(err.message || "Failed to delete");
    }
    setDeleteConfirm(null);
  };

  const openCreditModal = async (c: Customer) => {
    setCreditModal({ customerId: c.id, name: c.name });
    setCreditAmount("");
    setCreditDesc("");
    setCreditType("credit");
    try {
      const { data, error } = await supabase
        .from("credit_transactions")
        .select("id, amount, type, description, created_at")
        .eq("party_id", c.id)
        .eq("party_type", "customer")
        .order("created_at", { ascending: false })
        .limit(20);
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
      const { error } = await supabase.from("credit_transactions").insert({
        organization_id: orgId,
        party_type: "customer",
        party_id: creditModal.customerId,
        amount: amt,
        type: creditType,
        description: creditDesc,
        created_by: user.id,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(creditType === "credit" ? "Credit given recorded" : "Payment received recorded");
      setCreditModal(null);
      fetchCustomers();
    } catch (err: unknown) {
      console.error("handleCreditSubmit error:", err);
      toast.error(err.message || "Failed to save transaction");
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
    <div className="w-full max-w-[1400px] mx-auto px-4 py-6 sm:px-8 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white font-sans flex items-center gap-2.5">
              <Users2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Customer Directory
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>CRM &amp; KHATA</span>
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track customer contact details, credit ledger, and payment balances
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
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl glowing-btn-amber text-white font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Stats Cards - 3D Frosted Glass */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
        {/* Total Customers */}
        <div className="glass-card-3d p-2.5 sm:p-5 relative overflow-hidden group select-none">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 via-blue-500 to-indigo-600 rounded-l-2xl shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider font-mono truncate">Total Customers</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 hidden sm:flex">
              <Users2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1 sm:mt-3">
            <p className="text-sm sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono truncate">{customers.length}</p>
            <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 mt-1">Active customer profiles</p>
          </div>
        </div>

        {/* Total Outstanding Credit */}
        <div className="glass-card-3d p-2.5 sm:p-5 relative overflow-hidden group select-none">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-rose-400 via-red-500 to-rose-700 rounded-l-2xl shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider font-mono truncate">Receivables</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hidden sm:flex">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1 sm:mt-3">
            <p className="text-sm sm:text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight font-mono truncate">
              ₹{totalOutstandingCredit.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </p>
            <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 mt-1">Pending payments to collect</p>
          </div>
        </div>

        {/* Customers with Balance */}
        <div className="glass-card-3d p-2.5 sm:p-5 relative overflow-hidden col-span-2 lg:col-span-1 group select-none">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 via-orange-500 to-rose-600 rounded-l-2xl shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider font-mono truncate">With Balance Due</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 hidden sm:flex">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1 sm:mt-3">
            <div className="flex items-baseline gap-1.5 sm:gap-2">
              <p className="text-sm sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">{customersWithDue}</p>
              <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">/ {customers.length} total</span>
            </div>
            <p className="hidden sm:block text-xs text-amber-600 dark:text-amber-400 mt-1 font-semibold">
              {customers.length > 0 ? `${Math.round((customersWithDue / customers.length) * 100)}% have debit balance` : "No debit balance"}
            </p>
          </div>
        </div>
      </div>

      {/* Search & Credit Filters - Frosted Glass Container */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, phone number, or email..."
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
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shrink-0 overflow-x-auto">
            {([
              { id: "all", label: "All Customers", count: customers.length },
              { id: "due", label: "With Balance", count: customersWithDue },
              { id: "clear", label: "Settled (₹0)", count: customers.length - customersWithDue },
            ] as const).map((f) => (
              <button
                key={f.id}
                onClick={() => setCreditFilter(f.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer",
                  creditFilter === f.id
                    ? "glowing-btn-amber text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-foreground"
                )}
              >
                {f.label}
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full",
                    creditFilter === f.id ? "bg-white/20 text-white font-bold" : "bg-muted text-muted-foreground"
                  )}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          {/* View Mode Toggle for Desktop */}
          <div className="hidden md:flex items-center gap-1 p-1 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shrink-0">
            <button
              onClick={() => setDesktopLayoutMode("split")}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                desktopLayoutMode === "split"
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-foreground"
              )}
              title="Split-Screen Khata Workspace"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Split Khata</span>
            </button>
            <button
              onClick={() => setDesktopLayoutMode("table")}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                desktopLayoutMode === "table"
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-foreground"
              )}
              title="Full Data Table"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Table View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customer List Container */}
      <div className="rounded-2xl overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <div className="py-16 text-center px-4 bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
              <Users2 className="w-7 h-7 opacity-50" />
            </div>
            <h3 className="text-base font-bold text-foreground">No Customers Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              {customers.length === 0
                ? "Start building your customer base by clicking the Add Customer button above."
                : "No customer records matched your search or credit filter."}
            </p>
            {customers.length === 0 && (
              <Button onClick={openCreate} size="sm" className="mt-4 gap-1.5 text-xs font-semibold">
                <Plus className="w-4 h-4" /> Add First Customer
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile View: Swipeable Cards */}
            <div className="block md:hidden space-y-2.5">
              <p className="text-[11px] text-muted-foreground px-1 flex items-center justify-between">
                <span>👉 Swipe Right for <b>WhatsApp Reminder</b></span>
                <span>👈 Swipe Left to <b>Call</b></span>
              </p>
              {paginatedCustomers.map((c) => {
                const hasDue = c.balance > 0;
                return (
                  <SwipeableListItem
                    key={c.id}
                    onSwipeRight={() => handleSendWhatsAppReminder(c)}
                    rightActionLabel="WhatsApp"
                    rightActionIcon={Send}
                    rightActionColor="emerald"
                    onSwipeLeft={() => handleQuickCall(c)}
                    leftActionLabel="Call"
                    leftActionIcon={Phone}
                    leftActionColor="blue"
                  >
                    <div className="p-4 space-y-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm shrink-0 border border-amber-500/20">
                            {c.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-sm">{c.name}</p>
                            {c.phone && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-muted-foreground" /> {c.phone}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Balance Badge */}
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-bold shrink-0",
                            hasDue
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          )}
                        >
                          {hasDue ? `₹${c.balance.toFixed(2)} Due` : "Clear (₹0)"}
                        </span>
                      </div>

                      {c.address && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                          <MapPin className="w-3 h-3 shrink-0" /> {c.address}
                        </p>
                      )}

                      {/* Actions row */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1.5 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/40 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                          onClick={() => navigate(`/customers/${c.id}/ledger`)}
                        >
                          <FileText className="w-3.5 h-3.5" /> Ledger Statement
                        </Button>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            onClick={() => handleSendWhatsAppReminder(c)}
                            title="Send WhatsApp Reminder"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                            onClick={() => openCreditModal(c)}
                            title="Manage Credit"
                          >
                            <IndianRupee className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(c)}
                            title="Edit Customer"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteConfirm(c.id)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {deleteConfirm === c.id && (
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 mt-2">
                          <span className="text-xs font-medium text-destructive">Delete this customer?</span>
                          <div className="flex gap-2">
                            <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => handleDelete(c.id)}>
                              Delete
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDeleteConfirm(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </SwipeableListItem>
                );
              })}

              {/* Mobile Pagination */}
              <PaginationBar
                page={page}
                totalPages={totalPages}
                totalItems={totalCustomerCount}
                startIndex={startIndex}
                endIndex={endIndex}
                hasNext={hasNext}
                hasPrev={hasPrev}
                onPageChange={setPage}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
              />
            </div>

            {/* Desktop View: Split-Screen Khata Workspace or Full Table */}
            {desktopLayoutMode === "split" ? (
              <div className="hidden md:grid grid-cols-12 gap-5 items-start min-h-[580px]">
                {/* LEFT PANE: Customer Selection List (4 of 12 cols) */}
                <div className="col-span-5 lg:col-span-4 max-h-[720px] overflow-y-auto space-y-2 pr-1 rounded-2xl flex flex-col justify-between">
                  <div className="space-y-2">
                    {paginatedCustomers.map((c) => {
                      const isSelected = selectedCustomerId === c.id;
                      const hasDue = c.balance > 0;
                      return (
                        <div
                          key={c.id}
                          onClick={() => handleSelectCustomer(c)}
                          className={cn(
                            "p-3.5 rounded-2xl border transition-all cursor-pointer select-none",
                            isSelected
                              ? "bg-amber-50/80 dark:bg-amber-950/30 border-amber-400 dark:border-amber-500/50 shadow-md ring-1 ring-amber-400/40"
                              : "bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={cn(
                                  "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-transform",
                                  isSelected
                                    ? "bg-amber-500 text-slate-950 shadow-xs scale-105"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                )}
                              >
                                {c.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className={cn("font-bold text-xs truncate", isSelected ? "text-amber-950 dark:text-amber-200 font-extrabold" : "text-foreground")}>
                                  {c.name}
                                </p>
                                {c.phone && (
                                  <p className="text-[11px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                                    <Phone className="w-3 h-3" /> {c.phone}
                                  </p>
                                )}
                              </div>
                            </div>

                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0",
                                hasDue
                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              )}
                            >
                              {hasDue ? `₹${c.balance.toFixed(2)}` : "₹0"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <PaginationBar
                    page={page}
                    totalPages={totalPages}
                    totalItems={totalCustomerCount}
                    startIndex={startIndex}
                    endIndex={endIndex}
                    hasNext={hasNext}
                    hasPrev={hasPrev}
                    onPageChange={setPage}
                    pageSize={pageSize}
                    onPageSizeChange={setPageSize}
                    compact
                    className="mt-2 rounded-xl border"
                  />
                </div>

                {/* RIGHT PANE: Selected Customer Khata Ledger & Transactions (8 of 12 cols) */}
                <div className="col-span-7 lg:col-span-8 sticky top-20 space-y-4">
                  {(() => {
                    const activeCust = customers.find((c) => c.id === selectedCustomerId) || filtered[0];
                    if (!activeCust) {
                      return (
                        <div className="p-12 text-center bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-3xl">
                          <Users2 className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                          <p className="text-sm font-bold text-foreground">Select a customer from the left list</p>
                        </div>
                      );
                    }

                    const hasDue = activeCust.balance > 0;

                    return (
                      <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 backdrop-blur-xl">
                        {/* Header Banner */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black text-base shadow-md">
                              {activeCust.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-black text-foreground">{activeCust.name}</h3>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-muted-foreground font-semibold">
                                  ID: {activeCust.id.slice(0, 8)}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                                {activeCust.phone && (
                                  <span className="flex items-center gap-1 font-mono text-foreground font-medium">
                                    <Phone className="w-3.5 h-3.5 text-amber-500" /> {activeCust.phone}
                                  </span>
                                )}
                                {activeCust.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-3.5 h-3.5" /> {activeCust.email}
                                  </span>
                                )}
                                {activeCust.address && (
                                  <span className="flex items-center gap-1 truncate max-w-[200px]" title={activeCust.address}>
                                    <MapPin className="w-3.5 h-3.5" /> {activeCust.address}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendWhatsAppReminder(activeCust)}
                              className="h-8 gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-bold cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" /> WhatsApp
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => openCreditModal(activeCust)}
                              className="h-8 gap-1.5 text-xs glowing-btn-amber font-bold cursor-pointer"
                            >
                              <IndianRupee className="w-3.5 h-3.5" /> Payment In
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/customers/${activeCust.id}/ledger`)}
                              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Open Full Ledger Statement"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Balance Stats Row */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Net Due Balance</p>
                            <p className="text-lg font-black text-rose-700 dark:text-rose-300 mt-0.5">₹{activeCust.balance.toFixed(2)}</p>
                          </div>
                          <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Status</p>
                            <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300 mt-1.5 flex items-center gap-1">
                              {hasDue ? "Payment Due" : "Settled (All Clear)"}
                            </p>
                          </div>
                          <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Joined On</p>
                            <p className="text-xs font-semibold text-foreground mt-1.5">
                              {new Date(activeCust.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </div>
                        </div>

                        {/* Transactions Preview Table */}
                        <div className="space-y-2 pt-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-500" /> Recent Ledger Entries
                            </h4>
                            <button
                              type="button"
                              onClick={() => navigate(`/customers/${activeCust.id}/ledger`)}
                              className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <span>Full Statement</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="rounded-xl border border-slate-200/70 dark:border-slate-800 overflow-hidden">
                            {loadingTx ? (
                              <div className="p-6 text-center text-xs text-muted-foreground animate-pulse">
                                Loading transactions...
                              </div>
                            ) : selectedTransactions.length === 0 ? (
                              <div className="p-6 text-center text-xs text-muted-foreground">
                                No credit/payment transactions recorded yet for this customer.
                              </div>
                            ) : (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-muted-foreground border-b border-slate-200/70 dark:border-slate-800 text-[11px] uppercase tracking-wider">
                                    <th className="text-left py-2.5 px-3">Date</th>
                                    <th className="text-left py-2.5 px-3">Type</th>
                                    <th className="text-left py-2.5 px-3">Description</th>
                                    <th className="text-right py-2.5 px-3">Amount</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                  {selectedTransactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                      <td className="py-2 px-3 text-muted-foreground font-mono text-[11px]">
                                        {new Date(tx.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                                      </td>
                                      <td className="py-2 px-3 font-semibold">
                                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] uppercase font-bold", tx.type === "credit" ? "bg-rose-100 dark:bg-rose-950/50 text-rose-600" : "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600")}>
                                          {tx.type === "credit" ? "Debit / Sale" : "Payment Received"}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-muted-foreground truncate max-w-[160px]">
                                        {tx.description || "Credit transaction"}
                                      </td>
                                      <td className={cn("py-2 px-3 text-right font-bold font-mono", tx.type === "credit" ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400")}>
                                        {tx.type === "credit" ? "+" : "-"}₹{Number(tx.amount || 0).toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              /* Traditional Full Table View */
              <div className="hidden md:block overflow-x-auto bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
                <table className="w-full min-w-[780px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                      <th className="text-left px-5 py-3.5">Customer Name</th>
                      <th className="text-left px-5 py-3.5">Phone Number</th>
                      <th className="text-left px-5 py-3.5">Email Address</th>
                      <th className="text-left px-5 py-3.5">City / Address</th>
                      <th className="text-right px-5 py-3.5">Credit Balance</th>
                      <th className="text-right px-5 py-3.5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedCustomers.map((c) => {
                      const hasDue = c.balance > 0;
                      return (
                        <tr key={c.id} className="hover:bg-muted/30 transition-colors group">
                          {/* Name */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                                {c.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-foreground">{c.name}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  Added {new Date(c.created_at).toLocaleDateString("en-IN")}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Phone */}
                          <td className="px-5 py-4">
                            {c.phone ? (
                              <span className="text-foreground font-mono text-xs flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                                {c.phone}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>

                          {/* Email */}
                          <td className="px-5 py-4">
                            {c.email ? (
                              <span className="text-muted-foreground text-xs truncate max-w-[180px] block">
                                {c.email}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>

                          {/* Address */}
                          <td className="px-5 py-4">
                            {c.address ? (
                              <span className="text-muted-foreground text-xs truncate max-w-[160px] block" title={c.address}>
                                {c.address}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>

                          {/* Credit Balance */}
                          <td className="px-5 py-4 text-right">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold",
                                hasDue
                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              )}
                            >
                              {hasDue ? (
                                <>
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  ₹{c.balance.toFixed(2)}
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Clear (₹0)
                                </>
                              )}
                            </span>
                          </td>

                          {/* Action buttons */}
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2.5 text-xs gap-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                                title="View Ledger Statement"
                                onClick={() => navigate(`/customers/${c.id}/ledger`)}
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span className="hidden xl:inline">Ledger</span>
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2.5 text-xs gap-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                                title="Send WhatsApp Reminder"
                                onClick={() => handleSendWhatsAppReminder(c)}
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span className="hidden xl:inline">WhatsApp</span>
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2.5 text-xs gap-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50"
                                title="Manage Credit"
                                onClick={() => openCreditModal(c)}
                              >
                                <IndianRupee className="w-3.5 h-3.5" />
                                <span className="hidden xl:inline">Credit</span>
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEdit(c)}
                                title="Edit Customer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>

                              {deleteConfirm === c.id ? (
                                <div className="flex items-center gap-1 bg-destructive/10 p-1 rounded-lg border border-destructive/20">
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-6 text-[11px] px-2"
                                    onClick={() => handleDelete(c.id)}
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
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeleteConfirm(c.id)}
                                  title="Delete Customer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Desktop Full Table Pagination */}
                <PaginationBar
                  page={page}
                  totalPages={totalPages}
                  totalItems={totalCustomerCount}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  hasNext={hasNext}
                  hasPrev={hasPrev}
                  onPageChange={setPage}
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Customer Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center px-4 pt-6 pb-6 overflow-y-auto animate-fade-in">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl sm:max-w-3xl overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Users2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    {editingId ? "Edit Customer Details" : "Create New Customer"}
                  </h2>
                  <p className="text-xs text-muted-foreground">Add contact and billing information</p>
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
                    <span className="text-xs font-bold text-foreground">Live MCA Company Search (3M+ Indian Companies)</span>
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
                    toast.success(`Loaded verified company: ${comp.name}`);
                  }}
                  placeholder="Search any registered company by name or CIN..."
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
                      value={form.gstin || ""}
                      onChange={(e) => handleGstinChange(e.target.value)}
                      maxLength={15}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => triggerGstAutoFill(form.gstin || "", true)}
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

              {/* Customer Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Customer Name *
                </Label>
                <Input
                  placeholder="e.g. Ramesh Traders, John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-10 rounded-xl"
                  autoFocus
                />
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
                      placeholder="customer@domain.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Billing / Delivery Address
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <textarea
                    className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none transition-all"
                    rows={2}
                    placeholder="Enter complete street address, city, pin code"
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
                  {editingId ? "Update Customer" : "Save Customer"}
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
                  <h2 className="text-base font-bold text-foreground">Record Credit Transaction</h2>
                  <p className="text-xs text-muted-foreground truncate max-w-[240px]">Customer: {creditModal.name}</p>
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
                      ? "bg-rose-500 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  Give Credit (Debit Customer)
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
                  Record Payment (Received)
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
                    Particulars / Note (Optional)
                  </Label>
                  <Input
                    placeholder="e.g. Bill #1042 partial payment, UPI ref, etc."
                    value={creditDesc}
                    onChange={(e) => setCreditDesc(e.target.value)}
                    className="mt-1 h-10 rounded-xl"
                  />
                </div>

                <Button className="w-full h-10 rounded-xl font-semibold gap-1.5 mt-2" onClick={handleCreditSubmit}>
                  {creditType === "credit" ? "Record Credit Amount" : "Confirm Payment Received"}
                </Button>
              </div>

              {/* Recent History */}
              {creditHistory.length > 0 && (
                <div className="pt-3 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Recent Credit History
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
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            )}
                          >
                            {t.type === "credit" ? "Credit Given" : "Payment Received"}
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
                            t.type === "credit" ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
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
