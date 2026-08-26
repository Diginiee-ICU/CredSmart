import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  RotateCcw,
  Undo2,
  Check,
  Clock,
  X,
  Trash2,
  Save,
  PackageX,
  Building2,
  Calendar,
  IndianRupee,
  FileText,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ReturnRow {
  id: string;
  return_number: string;
  supplier_name: string;
  reason: string;
  total_amount: number;
  status: "draft" | "completed";
  item_count: number;
  created_at: string;
}

interface Supplier { id: string; name: string; }
interface ProductBatch {
  id: string;
  batch_number: string;
  cost_price: number;
  mrp: number;
  stock: number;
}
interface ProductOption {
  id: string;
  name: string;
  barcode: string | null;
  product_batches?: ProductBatch[];
}

interface ReturnLineItem {
  productId: string;
  productName: string;
  batchNumber: string;
  quantity: number;
  costPrice: number;
}

const statusConfig = {
  draft: { label: "Draft", badgeClass: "badge-warning", icon: Clock },
  completed: { label: "Completed", badgeClass: "badge-success", icon: Check },
};

export default function PurchaseReturns() {
  const { user } = useAuth();
  const { orgId, loading: orgLoading } = useOrganization();
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierInvoices, setSupplierInvoices] = useState<{ id: string; invoice_number: string; created_at: string; total_amount: number }[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [returnNumber, setReturnNumber] = useState("");
  const [reason, setReason] = useState("");
  const [lineItems, setLineItems] = useState<ReturnLineItem[]>([
    { productId: "", productName: "", batchNumber: "BATCH-01", quantity: 1, costPrice: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState<Record<number, string>>({});
  const [showProductDropdown, setShowProductDropdown] = useState<number | null>(null);

  const fetchReturns = useCallback(async () => {
    if (!orgId) {
      setReturns([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("purchase_returns")
        .select("id, return_number, reason, total_amount, status, created_at, suppliers ( name ), purchase_return_items ( id )")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("fetchReturns error:", error);
        setReturns([]);
      } else if (data) {
        type SupplierJoin = { name?: string | null };
        type PurchaseReturnRow = {
          id: string;
          return_number: string;
          reason: string | null;
          total_amount: number | string | null;
          status: "draft" | "completed";
          created_at: string;
          suppliers?: SupplierJoin | null;
          purchase_return_items?: Array<{ id: string }> | null;
        };
        setReturns((data as PurchaseReturnRow[]).map((r) => ({
          id: r.id,
          return_number: r.return_number,
          supplier_name: r.suppliers?.name || "Unknown",
          reason: r.reason || "",
          total_amount: Number(r.total_amount) || 0,
          status: r.status,
          item_count: r.purchase_return_items?.length || 0,
          created_at: r.created_at,
        })));
      } else {
        setReturns([]);
      }
    } catch (err) {
      console.error("fetchReturns unexpected error:", err);
      setReturns([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (orgLoading) return;
    fetchReturns();
  }, [fetchReturns, orgLoading]);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      try {
        const { data: suppData, error: suppError } = await supabase
          .from("suppliers")
          .select("id, name")
          .eq("organization_id", orgId)
          .order("name");
        if (suppError) {
          console.error("fetch suppliers error:", suppError);
        } else if (suppData) {
          setSuppliers(suppData);
        }
      } catch (err) {
        console.error("suppliers fetch unexpected error:", err);
      }

      try {
        const { data: prodData, error: prodError } = await supabase
          .from("products")
          .select("id, name, barcode, product_batches ( id, batch_number, cost_price, mrp, stock )")
          .eq("organization_id", orgId)
          .order("name");
        if (prodError) {
          console.error("fetch products error:", prodError);
        } else if (prodData) {
          setProducts(prodData as ProductOption[]);
        }
      } catch (err) {
        console.error("products fetch unexpected error:", err);
      }
    })();
  }, [orgId]);

  // When supplier changes, fetch recent invoices for quick import
  useEffect(() => {
    if (!orgId || !selectedSupplierId) {
      setSupplierInvoices([]);
      setSelectedInvoiceId("");
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("purchase_invoices")
        .select("id, invoice_number, created_at, total_amount")
        .eq("organization_id", orgId)
        .eq("supplier_id", selectedSupplierId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) setSupplierInvoices(data);
    })();
  }, [orgId, selectedSupplierId]);

  const handleSelectInvoice = async (invId: string) => {
    setSelectedInvoiceId(invId);
    if (!invId) return;
    try {
      const { data: invItems, error } = await supabase
        .from("purchase_invoice_items")
        .select("product_id, batch_number, quantity, cost_price, products ( name )")
        .eq("purchase_invoice_id", invId);

      if (error) throw error;
      if (invItems && invItems.length > 0) {
        type InvoiceItemRow = {
          product_id: string;
          batch_number?: string | null;
          quantity: number | string | null;
          cost_price: number | string | null;
          products?: { name?: string | null } | null;
        };
        setLineItems(
          (invItems as InvoiceItemRow[]).map((item) => ({
            productId: item.product_id,
            productName: item.products?.name || "Product",
            batchNumber: item.batch_number || "BATCH-01",
            quantity: Number(item.quantity) || 1,
            costPrice: Number(item.cost_price) || 0,
          }))
        );
        toast.info(`Loaded ${invItems.length} items from selected invoice`);
      }
    } catch (err) {
      console.error("Failed to load invoice items:", err);
    }
  };

  const handleMarkCompleted = async (id: string) => {
    if (!user || !orgId) return;
    try {
      // Fetch return details to record debit transaction
      const { data: ret, error: getErr } = await supabase
        .from("purchase_returns")
        .select("id, return_number, supplier_id, total_amount, reason")
        .eq("id", id)
        .single();

      if (getErr || !ret) throw getErr || new Error("Return record not found");

      const { error } = await supabase.from("purchase_returns").update({ status: "completed" }).eq("id", id);
      if (error) {
        console.error("handleMarkCompleted error:", error);
        toast.error("Failed to complete return");
        return;
      }

      // Record supplier debit note in credit_transactions
      if (ret.supplier_id && Number(ret.total_amount) > 0) {
        await supabase.from("credit_transactions").insert({
          organization_id: orgId,
          party_type: "supplier",
          party_id: ret.supplier_id,
          amount: Number(ret.total_amount),
          type: "payment", // Reduces payable amount
          reference_id: ret.id,
          description: `Debit Note #${ret.return_number} - ${ret.reason || "Purchase Return"}`,
          created_by: user.id,
        });
      }

      toast.success("Return completed â€” stock reversed and supplier account debited!"); 
      fetchReturns(); 
    } catch (err: unknown) {
      console.error("handleMarkCompleted unexpected error:", err);
      const message = err instanceof Error ? err.message : typeof err === "string" ? err : "Failed to complete";
      toast.error(message);
    }
  };

  const addLineItem = () => setLineItems((p) => [...p, { productId: "", productName: "", batchNumber: `BATCH-0${p.length + 1}`, quantity: 1, costPrice: 0 }]);
  const removeLineItem = (i: number) => setLineItems((p) => p.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof ReturnLineItem, val: string | number) =>
    setLineItems((p) => p.map((item, idx) => (idx === i ? { ...item, [field]: val } : item)));

  const selectProduct = (i: number, p: ProductOption) => {
    const defaultBatch = p.product_batches?.[0];
    updateLine(i, "productId", p.id);
    updateLine(i, "productName", p.name);
    if (defaultBatch) {
      updateLine(i, "batchNumber", defaultBatch.batch_number || "BATCH-01");
      updateLine(i, "costPrice", Number(defaultBatch.cost_price) || 0);
    }
    setProductSearch((prev) => ({ ...prev, [i]: "" }));
    setShowProductDropdown(null);
  };

  const filteredProducts = (i: number) => {
    const s = (productSearch[i] || "").toLowerCase();
    if (!s) return products.slice(0, 10);
    return products.filter((p) => p.name.toLowerCase().includes(s) || (p.barcode && p.barcode.includes(s)));
  };

  const totalAmount = lineItems.reduce((s, li) => s + (Number(li.quantity) || 0) * (Number(li.costPrice) || 0), 0);

  const handleSave = async (markCompleted: boolean) => {
    if (!selectedSupplierId) { toast.error("Please select a supplier"); return; }
    if (lineItems.some((li) => !li.productId || Number(li.quantity) <= 0)) {
      toast.error("Please select products and enter valid quantities (> 0) for all items");
      return;
    }
    if (!orgId || !user) return;
    setSaving(true);
    try {
      const generatedReturnNum = returnNumber.trim() || `DN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

      const { data: ret, error } = await supabase
        .from("purchase_returns")
        .insert({
          organization_id: orgId,
          supplier_id: selectedSupplierId,
          return_number: generatedReturnNum,
          reason: reason.trim(),
          total_amount: totalAmount,
          status: "draft",
          created_by: user.id,
        })
        .select("id")
        .single();
      if (error) throw error;

      const items = lineItems.map((li) => ({
        purchase_return_id: ret.id,
        product_id: li.productId,
        batch_number: li.batchNumber?.trim() || "BATCH-01",
        quantity: Number(li.quantity) || 1,
        cost_price: Number(li.costPrice) || 0,
      }));
      const { error: itemsErr } = await supabase.from("purchase_return_items").insert(items);
      if (itemsErr) throw itemsErr;

      if (markCompleted) {
        const { error: upErr } = await supabase.from("purchase_returns").update({ status: "completed" }).eq("id", ret.id);
        if (upErr) throw upErr;

        // Record supplier debit note in credit_transactions
        if (totalAmount > 0) {
          await supabase.from("credit_transactions").insert({
            organization_id: orgId,
            party_type: "supplier",
            party_id: selectedSupplierId,
            amount: totalAmount,
            type: "payment", // Reduces payable amount
            reference_id: ret.id,
            description: `Debit Note #${generatedReturnNum} - ${reason.trim() || "Purchase Return"}`,
            created_by: user.id,
          });
        }
      }

      toast.success(markCompleted ? "Return completed â€” stock reversed & account debited!" : "Return saved as draft");
      setShowForm(false);
      setSelectedSupplierId("");
      setSelectedInvoiceId("");
      setReturnNumber("");
      setReason("");
      setLineItems([{ productId: "", productName: "", batchNumber: "BATCH-01", quantity: 1, costPrice: 0 }]);
      fetchReturns();
    } catch (err: unknown) {
      console.error("handleSave error:", err);
      const message = err instanceof Error ? err.message : typeof err === "string" ? err : "Failed to save return";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = returns.filter((r) => {
    const matchesSearch =
      r.return_number.toLowerCase().includes(search.toLowerCase()) ||
      r.supplier_name.toLowerCase().includes(search.toLowerCase()) ||
      r.reason.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalReturnValue = returns.reduce((s, r) => s + Number(r.total_amount || 0), 0);

  if (orgLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-wrapper max-w-7xl space-y-6 font-sans">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="page-title flex items-center gap-2.5 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-sans">
              {typeof Undo2 !== 'undefined' ? <Undo2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" /> : <RotateCcw className="w-7 h-7 text-indigo-600 dark:text-indigo-400" /> }
              Purchase Returns &amp; Debit Notes
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span>DEBIT NOTES</span>
            </span>
          </div>
          <p className="page-subtitle text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage vendor returns, damaged goods reversals &amp; debit note accounting
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl glowing-btn-amber text-white font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Return / Debit Note</span>
        </button>
      </div>

      {/* Stats Cards - 3D Frosted Glass */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <div className="glass-card-3d p-2.5 sm:p-5 flex flex-col justify-between relative overflow-hidden group select-none">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 via-blue-500 to-indigo-600 rounded-l-2xl shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider font-mono truncate">
              Total Returns
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 hidden sm:flex">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1 sm:mt-3">
            <p className="text-sm sm:text-2xl font-black text-slate-900 dark:text-white font-mono truncate">{returns.length}</p>
            <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 mt-0.5">Recorded debit notes</p>
          </div>
        </div>

        <div className="glass-card-3d p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group select-none">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 via-orange-500 to-rose-600 rounded-l-2xl shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider font-mono">
              Draft / Pending
            </span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {returns.filter((r) => r.status === "draft").length}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Pending reversal</p>
          </div>
        </div>

        <div className="glass-card-3d p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group select-none">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 via-teal-500 to-green-600 rounded-l-2xl shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-mono">
              Completed
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Check className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {returns.filter((r) => r.status === "completed").length}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Stock reversed</p>
          </div>
        </div>

        <div className="glass-card-3d p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group select-none">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 via-purple-500 to-violet-600 rounded-l-2xl shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-mono">
              Total Value
            </span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
              â‚¹{totalReturnValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Reversed merchandise</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar - Frosted Container */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by return number, supplier, or reason..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: "all", label: "All Returns" },
            { id: "draft", label: "Draft" },
            { id: "completed", label: "Completed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
                statusFilter === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Returns List / Table Container */}
      <div className="card-base p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            <RotateCcw className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="font-semibold text-foreground">No purchase returns recorded</p>
            <p className="text-xs text-muted-foreground mt-1">
              {returns.length === 0
                ? "Debit notes and vendor returns created will appear in this ledger."
                : "Try adjusting your search query or filters."}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="block md:hidden divide-y divide-border/60 pb-28">
              {filtered.map((r) => {
                const status = statusConfig[r.status] || statusConfig.draft;
                const StatusIcon = status.icon;
                return (
                  <div key={r.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RotateCcw className="w-4 h-4 text-primary" />
                        <span className="text-sm font-bold text-foreground font-mono">
                          {r.return_number || "â€”"}
                        </span>
                      </div>
                      <span className={cn("badge text-[11px]", status.badgeClass)}>
                        <StatusIcon className="w-3 h-3" /> {status.label}
                      </span>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-foreground">{r.supplier_name}</p>
                      {r.reason && (
                        <p className="text-xs text-muted-foreground mt-0.5 italic">
                          Reason: "{r.reason}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                      <span className="text-muted-foreground">{r.item_count} items</span>
                      <span className="font-bold text-sm text-foreground">
                        â‚¹{Number(r.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {r.status === "draft" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => handleMarkCompleted(r.id)}
                      >
                        <PackageX className="w-3.5 h-3.5 mr-1.5 text-rose-600" /> Complete & Reverse Stock
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Return / DN #</th>
                    <th>Supplier</th>
                    <th>Reason</th>
                    <th>Items</th>
                    <th>Total Value</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const status = statusConfig[r.status] || statusConfig.draft;
                    const StatusIcon = status.icon;

                    return (
                      <tr key={r.id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                              <RotateCcw className="w-4 h-4" />
                            </div>
                            <span className="font-mono font-semibold text-foreground text-sm">
                              {r.return_number || "â€”"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="font-medium text-foreground">{r.supplier_name}</span>
                          </div>
                        </td>
                        <td>
                          {r.reason ? (
                            <span className="badge badge-neutral text-xs max-w-[180px] truncate">
                              {r.reason}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">â€”</span>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-neutral text-xs">
                            {r.item_count} {r.item_count === 1 ? "item" : "items"}
                          </span>
                        </td>
                        <td>
                          <span className="font-bold text-foreground">
                            â‚¹{Number(r.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td>
                          <span className={cn("badge text-xs", status.badgeClass)}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </span>
                        </td>
                        <td>
                          <div className="text-xs">
                            <p className="font-medium text-foreground">
                              {new Date(r.created_at).toLocaleDateString("en-IN")}
                            </p>
                          </div>
                        </td>
                        <td className="text-right">
                          {r.status === "draft" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkCompleted(r.id)}
                              className="h-8 text-xs hover:border-rose-500 hover:text-rose-600"
                            >
                              <PackageX className="w-3.5 h-3.5 mr-1.5 text-rose-600" />
                              Complete
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground font-medium">
                              Stock Reversed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Create Return Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center px-3 sm:px-4 pt-3 sm:pt-8 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-3xl mb-0 sm:mb-8 max-h-[calc(100dvh-0.75rem)] sm:max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">New Purchase Return / Debit Note</h2>
                  <p className="text-xs text-muted-foreground">Reverse vendor stock & debit payable amount</p>
                </div>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-5 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Supplier *
                  </Label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Select supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Return / Debit Note #
                  </Label>
                  <Input
                    placeholder="Auto-generated if blank (e.g. DN-2026-001)"
                    value={returnNumber}
                    onChange={(e) => setReturnNumber(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>

              {/* Optional Link to Purchase Invoice */}
              {selectedSupplierId && supplierInvoices.length > 0 && (
                <div className="space-y-1.5 p-3 rounded-xl bg-muted/40 border border-border">
                  <Label className="text-xs font-semibold text-primary uppercase tracking-wider">
                    Quick Autofill from Previous Invoice (Optional)
                  </Label>
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => handleSelectInvoice(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Choose an invoice to auto-load items...</option>
                    {supplierInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_number} ({new Date(inv.created_at).toLocaleDateString("en-IN")}) â€” â‚¹{Number(inv.total_amount).toLocaleString("en-IN")}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Reason for Return
                </Label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="Damaged goods, expired batch, incorrect shipment, etc..."
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              {/* Line Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Return Items & Quantities
                  </Label>
                  <Button variant="outline" size="sm" onClick={addLineItem} className="h-8 text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Product
                  </Button>
                </div>

                <div className="hidden md:grid grid-cols-[2fr_1fr_0.7fr_0.8fr_auto] gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  <span>Product</span>
                  <span>Batch #</span>
                  <span>Qty</span>
                  <span>Cost â‚¹</span>
                  <span></span>
                </div>

                <div className="space-y-2 max-h-[45dvh] sm:max-h-[250px] overflow-y-auto pr-1">
                  {lineItems.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 md:grid-cols-[2fr_1fr_0.7fr_0.8fr_auto] gap-2 p-2.5 rounded-xl border border-border bg-muted/20 items-center"
                    >
                      <div className="relative">
                        {item.productId ? (
                          <div className="flex items-center h-10 px-3 rounded-lg border border-input bg-background text-sm">
                            <span className="flex-1 truncate text-foreground font-medium">
                              {item.productName}
                            </span>
                            <button
                              onClick={() => {
                                updateLine(index, "productId", "");
                                updateLine(index, "productName", "");
                              }}
                              className="text-muted-foreground hover:text-foreground p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <Input
                              placeholder="Search product..."
                              value={productSearch[index] || ""}
                              onChange={(e) => {
                                setProductSearch((p) => ({ ...p, [index]: e.target.value }));
                                setShowProductDropdown(index);
                              }}
                              onFocus={() => setShowProductDropdown(index)}
                              onBlur={() => setTimeout(() => setShowProductDropdown(null), 200)}
                              className="h-10 rounded-lg"
                            />
                            {showProductDropdown === index && (
                              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg max-h-40 overflow-y-auto">
                                {filteredProducts(index).map((p) => (
                                  <button
                                    key={p.id}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted text-foreground transition-colors"
                                    onMouseDown={() => selectProduct(index, p)}
                                  >
                                    {p.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <Input
                        placeholder="Batch"
                        value={item.batchNumber}
                        onChange={(e) => updateLine(index, "batchNumber", e.target.value)}
                        className="h-10 rounded-lg"
                      />

                      <Input
                        type="number"
                        min={1}
                        placeholder="Qty"
                        value={item.quantity || ""}
                        onChange={(e) => updateLine(index, "quantity", parseInt(e.target.value) || 0)}
                        className="h-10 rounded-lg"
                      />

                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="Cost"
                        value={item.costPrice || ""}
                        onChange={(e) => updateLine(index, "costPrice", parseFloat(e.target.value) || 0)}
                        className="h-10 rounded-lg"
                      />

                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 h-10 w-10"
                        onClick={() => removeLineItem(index)}
                        disabled={lineItems.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Summary & Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Total Debit Value</p>
                  <p className="text-2xl font-extrabold text-foreground">
                    â‚¹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:flex gap-2.5 w-full sm:w-auto">
                  <Button
                    className="w-full sm:w-auto"
                    variant="outline"
                    onClick={() => handleSave(false)}
                    disabled={saving}
                  >
                    <Save className="w-4 h-4 mr-1.5" /> Save as Draft
                  </Button>
                  <Button
                    className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white"
                    onClick={() => handleSave(true)}
                    disabled={saving}
                  >
                    <PackageX className="w-4 h-4 mr-1.5" /> Save & Reverse Stock
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



