import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Printer,
  FileText,
  Phone,
  Mail,
  MapPin,
  IndianRupee,
  Calendar,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
  Receipt,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { ROUTE_PATHS } from "@/config/routes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function CustomerLedger() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { orgId, org } = useOrganization();
  const { toast } = useToast();

  const [customer, setCustomer] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<"all" | "30days" | "thisMonth">("all");

  const fetchLedger = async () => {
    if (!orgId || !id) return;
    try {
      // Get Customer Details
      const { data: custData, error: custError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();
      if (custError) throw custError;
      setCustomer(custData);

      // Get Transactions
      const { data: txData, error: txError } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("party_id", id)
        .order("created_at", { ascending: true }); // Chronological order
      if (txError) throw txError;

      // Calculate running balance
      let currentBalance = 0;
      const txWithBalance = (txData || []).map((tx) => {
        const amount = Number(tx.amount);
        if (tx.type === "credit") {
          currentBalance += amount;
        } else {
          currentBalance -= amount;
        }
        return { ...tx, runningBalance: currentBalance };
      });

      // Reverse so newest is at the top
      setTransactions(txWithBalance.reverse());
    } catch (err: any) {
      toast({ title: "Error fetching ledger", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [orgId, id]);

  const currentBalance = transactions.length > 0 ? transactions[0].runningBalance : 0;

  // Filtered transactions based on date selection
  const filteredTransactions = useMemo(() => {
    if (dateFilter === "all") return transactions;

    const now = new Date();
    if (dateFilter === "30days") {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return transactions.filter((tx) => new Date(tx.created_at) >= thirtyDaysAgo);
    }
    if (dateFilter === "thisMonth") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return transactions.filter((tx) => new Date(tx.created_at) >= startOfMonth);
    }
    return transactions;
  }, [transactions, dateFilter]);

  const totalCreditGiven = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === "credit")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [filteredTransactions]);

  const totalPaymentReceived = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === "payment")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [filteredTransactions]);

  const handleShareWhatsApp = () => {
    if (!customer) return;
    const storeTitle = org?.name || "Our Store";
    const statusText =
      currentBalance > 0
        ? `₹${currentBalance.toFixed(2)} (Due / Debit)`
        : currentBalance < 0
        ? `₹${Math.abs(currentBalance).toFixed(2)} (Advance Credit)`
        : "Settled (₹0.00)";

    const message =
      `*Account Statement from ${storeTitle}*\n\n` +
      `Dear *${customer.name}*,\n` +
      `Here is your ledger statement summary as of ${format(new Date(), "dd MMM yyyy")}:\n\n` +
      `• Total Credit / Udhar: ₹${totalCreditGiven.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n` +
      `• Total Payment Received: ₹${totalPaymentReceived.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n` +
      `• *Net Outstanding: ${statusText}*\n\n` +
      (org?.phone ? `For any queries, contact: ${org.phone}\n` : "") +
      `Thank you for your business!`;

    const cleanPhone = customer.phone ? customer.phone.replace(/\D/g, "") : "";
    const waUrl =
      cleanPhone.length >= 10
        ? `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, "_blank");
  };

  return (
    <div className="w-full max-w-[1100px] mx-auto px-4 py-6 sm:px-8 sm:py-8 space-y-6">
      {/* Top Navigation & Print / WhatsApp Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(ROUTE_PATHS.customers)}
            className="h-10 w-10 rounded-xl shadow-sm hover:bg-muted"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              {loading ? "Loading Statement..." : `${customer?.name || "Customer"}'s Ledger`}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Verified Statement of Account & Transaction History
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Button
            onClick={handleShareWhatsApp}
            className="rounded-xl font-semibold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
            Share on WhatsApp
          </Button>

          <Button
            onClick={() => window.print()}
            variant="outline"
            className="rounded-xl font-semibold gap-2 shadow-sm border-border hover:bg-muted"
          >
            <Printer className="w-4 h-4 text-primary" /> Print Statement
          </Button>
        </div>
      </div>

      {/* Statement Header Card */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden p-6 print:border-none print:shadow-none space-y-6">
        {/* Printable Business Identity Bar */}
        {org && (
          <div className="hidden print:block pb-4 border-b border-border">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-foreground">{org.name}</h1>
                <p className="text-xs text-muted-foreground mt-0.5">{org.address}</p>
                {org.phone && <p className="text-xs text-muted-foreground">Tel: {org.phone}</p>}
                {org.gstin && <p className="text-xs font-mono text-muted-foreground">GSTIN: {org.gstin}</p>}
              </div>
              <div className="text-right">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Account Statement</span>
                <p className="text-xs text-muted-foreground mt-1">Generated: {format(new Date(), "dd MMM yyyy")}</p>
              </div>
            </div>
          </div>
        )}

        {/* Printable Business & Customer Identity */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-6 border-b border-border/80">
          {/* Customer profile */}
          <div className="md:col-span-7 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base shrink-0">
                {customer?.name ? customer.name.slice(0, 2).toUpperCase() : <User className="w-6 h-6" />}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Statement For
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-foreground">{customer?.name || "—"}</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
              {customer?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-foreground font-mono">{customer.phone}</span>
                </div>
              )}
              {customer?.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">{customer.email}</span>
                </div>
              )}
              {customer?.address && (
                <div className="sm:col-span-2 flex items-start gap-2 pt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{customer.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Balance summary card */}
          <div className="md:col-span-5 flex flex-col justify-center items-start md:items-end p-5 rounded-2xl bg-muted/40 border border-border/60">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Net Outstanding Balance
            </span>
            <p
              className={cn(
                "text-3xl font-extrabold mt-1 tracking-tight",
                currentBalance > 0
                  ? "text-rose-600 dark:text-rose-400"
                  : currentBalance < 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-foreground"
              )}
            >
              ₹{Math.abs(currentBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              <span className="text-xs font-bold ml-1.5 uppercase">
                {currentBalance > 0 ? "Debit (Due)" : currentBalance < 0 ? "Credit (Advance)" : "Settled"}
              </span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Statement Generated: {format(new Date(), "dd MMMM yyyy")}
            </p>
          </div>
        </div>

        {/* Filter bar & stats strip */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 print:hidden">
          {/* Date Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/50">
            {([
              { id: "all", label: "All Transactions" },
              { id: "thisMonth", label: "This Month" },
              { id: "30days", label: "Last 30 Days" },
            ] as const).map((f) => (
              <button
                key={f.id}
                onClick={() => setDateFilter(f.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  dateFilter === f.id
                    ? "bg-card text-foreground shadow-sm border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Quick Debit / Credit totals */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-muted-foreground">Total Credit:</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">
                ₹{totalCreditGiven.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Total Received:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                ₹{totalPaymentReceived.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs sm:text-sm text-left">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                <th className="px-5 py-3.5">Date & Time</th>
                <th className="px-5 py-3.5">Particulars / Details</th>
                <th className="px-5 py-3.5 text-right text-rose-600 dark:text-rose-400">Debit (You Gave)</th>
                <th className="px-5 py-3.5 text-right text-emerald-600 dark:text-emerald-400">Credit (You Got)</th>
                <th className="px-5 py-3.5 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                    {/* Timestamp */}
                    <td className="px-5 py-4 font-medium text-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{format(new Date(tx.created_at), "dd MMM yyyy, p")}</span>
                      </div>
                    </td>

                    {/* Particulars */}
                    <td className="px-5 py-4">
                      <p className="font-semibold text-foreground">
                        {tx.type === "credit" ? "Credit Bill / Purchase" : "Payment Received"}
                      </p>
                      {tx.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{tx.description}</p>
                      )}
                    </td>

                    {/* Debit (Credit given) */}
                    <td className="px-5 py-4 text-right font-bold text-rose-600 dark:text-rose-400">
                      {tx.type === "credit" ? `₹${Number(tx.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                    </td>

                    {/* Credit (Payment received) */}
                    <td className="px-5 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {tx.type === "payment" ? `₹${Number(tx.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                    </td>

                    {/* Running Balance */}
                    <td className="px-5 py-4 text-right font-extrabold text-foreground">
                      ₹{Math.abs(tx.runningBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      <span
                        className={cn(
                          "ml-1 text-[11px] font-bold px-1.5 py-0.2 rounded",
                          tx.runningBalance > 0
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            : tx.runningBalance < 0
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {tx.runningBalance > 0 ? "Dr" : tx.runningBalance < 0 ? "Cr" : "0"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-muted-foreground">
                    <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30 text-primary" />
                    <p className="font-semibold text-sm">No ledger transactions found</p>
                    <p className="text-xs mt-0.5">Transactions added in Credit modal or POS will appear here.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
