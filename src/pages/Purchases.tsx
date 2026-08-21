import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  Truck,
  Mail,
  Check,
  Clock,
  AlertTriangle,
  PackageCheck,
  FileText,
  Building2,
  Calendar,
  IndianRupee,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { PurchaseInvoiceForm } from "@/components/PurchaseInvoiceForm";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  supplier_name: string;
  supplier_id: string;
  item_count: number;
  total_amount: number;
  status: "draft" | "sent" | "received" | "partial";
  created_at: string;
}

const statusConfig = {
  draft: { label: "Draft", badgeClass: "badge-neutral", icon: Clock },
  sent: { label: "Sent", badgeClass: "badge-info", icon: Mail },
  received: { label: "Received", badgeClass: "badge-success", icon: Check },
  partial: { label: "Partial", badgeClass: "badge-warning", icon: AlertTriangle },
};

export default function Purchases() {
  const { orgId, loading: orgLoading } = useOrganization();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [initialSupplierId, setInitialSupplierId] = useState<string | undefined>(undefined);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [prefilledSupplier, setPrefilledSupplier] = useState<any>(null);

  useEffect(() => {
    if (location.state?.openForm) {
      if (location.state?.supplierId) {
        setInitialSupplierId(location.state.supplierId);
      }
      if (location.state?.prefilledSupplier) {
        setPrefilledSupplier(location.state.prefilledSupplier);
      }
      setShowForm(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchInvoices = useCallback(async () => {
    if (!orgId) {
      setInvoices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("purchase_invoices")
        .select(`
          id, invoice_number, total_amount, status, created_at, supplier_id,
          suppliers ( name ),
          purchase_invoice_items ( id )
        `)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("fetchInvoices error:", error);
        toast.error("Failed to load purchase invoices");
        setInvoices([]);
      } else if (data) {
        setInvoices(
          data.map((inv: any) => ({
            id: inv.id,
            invoice_number: inv.invoice_number,
            supplier_name: inv.suppliers?.name || "Unknown",
            supplier_id: inv.supplier_id,
            item_count: inv.purchase_invoice_items?.length || 0,
            total_amount: inv.total_amount,
            status: inv.status as PurchaseInvoice["status"],
            created_at: inv.created_at,
          }))
        );
      }
    } catch (err: any) {
      console.error("fetchInvoices failed:", err);
      toast.error("Failed to load purchase invoices");
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (orgLoading) return;
    fetchInvoices();
  }, [fetchInvoices, orgLoading]);

  const handleMarkReceived = async (invoiceId: string) => {
    try {
      const { error } = await supabase
        .from("purchase_invoices")
        .update({ status: "received" })
        .eq("id", invoiceId);
      if (error) {
        console.error("handleMarkReceived error:", error);
        toast.error("Failed to mark as received");
      } else {
        toast.success("Invoice received — stock updated!");
        fetchInvoices();
      }
    } catch (err: any) {
      console.error("handleMarkReceived failed:", err);
      toast.error("Failed to mark as received");
    }
  };

  const filtered = invoices.filter((po) => {
    const matchesSearch =
      po.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      po.supplier_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: invoices.length,
    pending: invoices.filter((i) => i.status === "draft" || i.status === "sent").length,
    totalValue: invoices.reduce((s, i) => s + Number(i.total_amount), 0),
    received: invoices.filter((i) => i.status === "received").length,
  };

  if (orgLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-wrapper space-y-6">
      
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Truck className="w-6 h-6 text-primary" />
            Purchase Invoices
          </h1>
          <p className="page-subtitle">
            Manage vendor purchase orders, incoming consignments & stock replenishment
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="shadow-sm hover:shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-1.5" /> New Purchase Invoice
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card-base p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Invoices
            </span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground mt-0.5">All created POs</p>
          </div>
        </div>

        <div className="card-base p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pending Delivery
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.pending}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Awaiting reception</p>
          </div>
        </div>

        <div className="card-base p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Received Orders
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Check className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.received}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Stock added</p>
          </div>
        </div>

        <div className="card-base p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Purchase Value
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-bold text-foreground">
              ₹{stats.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Gross order spend</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card-base p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice number or supplier name..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          />
        </div>
        
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "All" },
            { id: "draft", label: "Draft" },
            { id: "sent", label: "Sent" },
            { id: "received", label: "Received" },
            { id: "partial", label: "Partial" },
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

      {/* Invoices Table Container */}
      <div className="card-base p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            <Truck className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="font-semibold text-foreground">No purchase invoices found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {invoices.length === 0
                ? "Create your first supplier invoice to start tracking incoming stock."
                : "Try adjusting your search query or filters."}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile View */}
            <div className="block md:hidden divide-y divide-border/60">
              {filtered.map((po) => {
                const status = statusConfig[po.status] || statusConfig.draft;
                const StatusIcon = status.icon;
                return (
                  <div key={po.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-primary" />
                        <span className="text-sm font-bold text-foreground font-mono">
                          {po.invoice_number || "—"}
                        </span>
                      </div>
                      <span className={cn("badge text-[11px]", status.badgeClass)}>
                        <StatusIcon className="w-3 h-3" /> {status.label}
                      </span>
                    </div>

                    <div className="text-sm">
                      <p className="font-medium text-foreground">{po.supplier_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(po.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                      <span className="text-muted-foreground">{po.item_count} items</span>
                      <span className="font-bold text-sm text-foreground">
                        ₹{Number(po.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {po.status === "draft" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => handleMarkReceived(po.id)}
                      >
                        <PackageCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Mark Received
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Supplier</th>
                    <th>Items</th>
                    <th>Total Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((po) => {
                    const status = statusConfig[po.status] || statusConfig.draft;
                    const StatusIcon = status.icon;

                    return (
                      <tr key={po.id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                              <Truck className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-mono font-semibold text-foreground text-sm">
                                {po.invoice_number}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <div>
                              <p className="font-medium text-foreground">{po.supplier_name}</p>
                              <p className="text-[11px] text-muted-foreground font-mono">
                                ID: {po.supplier_id ? `${po.supplier_id.slice(0, 8)}...` : "—"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-neutral text-xs">
                            {po.item_count} {po.item_count === 1 ? "item" : "items"}
                          </span>
                        </td>
                        <td>
                          <span className="font-bold text-foreground">
                            ₹{po.total_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
                              {new Date(po.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-muted-foreground text-[11px]">
                              {new Date(po.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </td>
                        <td className="text-right">
                          {po.status === "draft" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkReceived(po.id)}
                              className="h-8 text-xs hover:border-emerald-500 hover:text-emerald-600"
                            >
                              <PackageCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                              Receive
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground font-medium">
                              Completed
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

      {/* Purchase Invoice Form Modal */}
      {showForm && orgId && (
        <PurchaseInvoiceForm
          organizationId={orgId}
          initialSupplierId={initialSupplierId}
          initialSupplier={prefilledSupplier}
          onClose={() => {
            setShowForm(false);
            setInitialSupplierId(undefined);
            setPrefilledSupplier(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setInitialSupplierId(undefined);
            setPrefilledSupplier(null);
            fetchInvoices();
          }}
        />
      )}
    </div>
  );
}


