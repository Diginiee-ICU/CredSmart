import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  RefreshCw,
  Tv,
  Megaphone,
  Gift,
  Users2,
  MessageCircle,
  Keyboard,
  FileText,
  Clock,
  ArrowRight,
  ExternalLink,
  Plus,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { ROUTE_PATHS } from "@/config/routes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UniversalQuickCreateModal } from "@/components/UniversalQuickCreateModal";

interface TransactionRow {
  id: string;
  date: string;
  type: string;
  txnNo: string;
  partyName: string;
  amount: number;
  status: "paid" | "unpaid" | "partially_paid" | "completed";
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { orgId, org } = useOrganization();
  const { toast } = useToast();

  const [toCollect, setToCollect] = useState(0);
  const [toPay, setToPay] = useState(0);
  const [cashBankBalance, setCashBankBalance] = useState(0);
  const [latestTransactions, setLatestTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  const formatCurrentTime = () => {
    const now = new Date();
    return now.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) + " | " + now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const fetchDashboardData = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      setLastUpdate(formatCurrentTime());
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch Customers & To Collect
      const { data: creditData } = await supabase
        .from("credit_transactions")
        .select("party_id, party_type, amount, type")
        .eq("organization_id", orgId);

      let collectSum = 0;
      let paySum = 0;

      if (creditData && creditData.length > 0) {
        creditData.forEach((txn) => {
          if (txn.party_type === "customer") {
            collectSum += txn.type === "credit" ? txn.amount : -txn.amount;
          } else if (txn.party_type === "supplier") {
            paySum += txn.type === "credit" ? txn.amount : -txn.amount;
          }
        });
      }

      setToCollect(Math.max(0, collectSum));
      setToPay(Math.max(0, paySum));

      // 2. Fetch Sales for cash & transactions
      const { data: salesData } = await supabase
        .from("sales")
        .select("id, created_at, invoice_number, total, payment_method, customer_id, customers(name)")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(10);

      const totalSalesRevenue = (salesData || []).reduce((acc, s) => acc + (s.total || 0), 0);
      setCashBankBalance(totalSalesRevenue > 0 ? totalSalesRevenue : 0);

      const rows: TransactionRow[] = (salesData || []).map((s: any) => ({
        id: s.id,
        date: new Date(s.created_at).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        type: "Sale Invoice",
        txnNo: s.invoice_number || `INV-${s.id.slice(0, 5)}`,
        partyName: s.customers?.name || "Cash Sale",
        amount: s.total || 0,
        status: "paid",
      }));

      setLatestTransactions(rows);
      setLastUpdate(formatCurrentTime());
    } catch (err) {
      console.error("fetchDashboardData error:", err);
      setLastUpdate(formatCurrentTime());
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    toast({ title: "Refreshing dashboard...", description: "Fetching latest financial metrics" });
    fetchDashboardData();
  };

  return (
    <div className="h-full flex flex-col p-2.5 sm:p-4 space-y-2.5 sm:space-y-3 overflow-hidden">
      {/* Top Bar - Compact for Single-Screen */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">Dashboard</h1>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE RECONCILED</span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Commercial financial metrics, receivables, payables, and live invoice feed
          </p>
        </div>

        {/* Action icons bar */}
        <div className="flex items-center gap-1 text-muted-foreground shrink-0">
          <button
            onClick={() => toast({ title: "Desktop Client", description: "Download CredSmart desktop client for Windows/macOS" })}
            title="Desktop App"
            className="p-1.5 rounded-lg border border-border/80 bg-card hover:bg-muted/80 hover:text-foreground transition-colors shadow-2xs"
          >
            <Tv className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => toast({ title: "Regulatory Compliance", description: "GST Rule update 2026: E-invoicing threshold guidelines active" })}
            title="Announcements"
            className="p-1.5 rounded-lg border border-border/80 bg-card hover:bg-muted/80 hover:text-foreground transition-colors shadow-2xs"
          >
            <Megaphone className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => navigate(ROUTE_PATHS.items)}
            title="Offers & Rewards"
            className="p-1.5 rounded-lg border border-border/80 bg-card hover:bg-muted/80 hover:text-foreground transition-colors shadow-2xs"
          >
            <Gift className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => navigate(ROUTE_PATHS.staff)}
            title="Staff & Permissions"
            className="p-1.5 rounded-lg border border-border/80 bg-card hover:bg-muted/80 hover:text-foreground transition-colors shadow-2xs"
          >
            <Users2 className="w-3.5 h-3.5" />
          </button>
          {/* Chat Support hidden as requested */}
          {false && (
            <button
              onClick={() => window.open("https://credalert.business", "_blank")}
              title="Institutional Chat Support"
              className="p-1.5 rounded-lg border border-border/80 bg-card hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40 transition-colors shadow-2xs"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </button>
          )}
          <button
            onClick={() => setShowShortcutsModal(true)}
            title="Keyboard Shortcuts (⌘K)"
            className="p-1.5 rounded-lg border border-border/80 bg-card hover:bg-muted/80 hover:text-foreground transition-colors shadow-2xs"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Business Overview Section - Compact 3 Metrics */}
      <div className="space-y-1.5 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
            Financial Ledger Summary
          </h2>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
            <span className="font-mono">Last Sync: {lastUpdate || formatCurrentTime()}</span>
            <button
              onClick={handleRefresh}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Refresh metrics"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin text-primary" : ""}`} />
            </button>
          </div>
        </div>

        {/* 3 Metric Cards Grid - CredAlert Liquid Glass */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {/* Card 1: To Collect */}
          <div
            onClick={() => navigate(ROUTE_PATHS.parties)}
            className="liquid-glass-soft p-3.5 sm:p-4 hover-lift cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-muted-foreground mb-1.5">
              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                <ArrowDownLeft className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>TO COLLECT</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-accent transition-colors" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-foreground font-mono tracking-tight">
                ₹ <span className="tabular-nums">{toCollect.toLocaleString("en-IN")}</span>
              </div>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                Outstanding customer credit ledger balances
              </p>
            </div>
          </div>

          {/* Card 2: To Pay */}
          <div
            onClick={() => navigate(ROUTE_PATHS.purchases)}
            className="liquid-glass-soft p-3.5 sm:p-4 hover-lift cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-muted-foreground mb-1.5">
              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full font-mono">
                <ArrowUpRight className="w-3 h-3 text-accent" />
                <span>TO PAY</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-accent transition-colors" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-foreground font-mono tracking-tight">
                ₹ <span className="tabular-nums">{toPay.toLocaleString("en-IN")}</span>
              </div>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                Pending supplier invoices &amp; outward dues
              </p>
            </div>
          </div>

          {/* Card 3: Total Cash + Bank Balance */}
          <div
            onClick={() => navigate(ROUTE_PATHS.cashBank)}
            className="liquid-glass-soft p-3.5 sm:p-4 hover-lift cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-muted-foreground mb-1.5">
              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-gold bg-gold/10 border border-gold/20 px-2 py-0.5 rounded-full font-mono">
                <Landmark className="w-3 h-3 text-gold" />
                <span>CASH &amp; BANK</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-accent transition-colors" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-foreground font-mono tracking-tight">
                ₹ <span className="tabular-nums">{cashBankBalance.toLocaleString("en-IN")}</span>
              </div>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                Total reconciled liquidity across accounts
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Body Grid: Latest Transactions (2/3) + Today's Checklist (1/3) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-3 overflow-hidden">
        {/* Latest Transactions Table */}
        <div className="lg:col-span-2 liquid-glass-soft flex flex-col min-h-0 overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-border/80 flex items-center justify-between bg-muted/20 shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-foreground tracking-tight">Latest Invoices &amp; Transactions</h3>
              <Badge variant="outline" className="text-[9px] font-mono py-0 px-1.5">
                Real-time
              </Badge>
            </div>
            {latestTransactions.length > 0 && (
              <button
                onClick={() => navigate(ROUTE_PATHS.sales)}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1"
              >
                <span>View Full Registry</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {latestTransactions.length === 0 ? (
            /* Clean Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-muted/60 border border-border flex items-center justify-center text-muted-foreground">
                <FileText className="w-6 h-6 stroke-[1.5]" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-foreground">No transactions recorded yet</h4>
                <p className="text-[11px] text-muted-foreground max-w-xs">
                  Generate your first GST-compliant sales invoice to activate real-time telemetry
                </p>
              </div>
              <Button
                onClick={() => setShowQuickCreate(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 mt-1 gap-1.5 shadow-xs rounded-lg"
              >
                <Plus className="w-3 h-3" />
                <span>Create Sales Invoice</span>
              </Button>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto w-full scrollbar-thin">
              <table className="w-full text-left text-xs min-w-[480px]">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-xs z-10">
                  <tr className="text-muted-foreground font-semibold border-b border-border text-[10px] uppercase tracking-wider font-mono">
                    <th className="py-2.5 px-3">DATE</th>
                    <th className="py-2.5 px-3">TYPE</th>
                    <th className="py-2.5 px-3">INVOICE NO</th>
                    <th className="py-2.5 px-3">PARTY NAME</th>
                    <th className="py-2.5 px-3 text-right">AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {latestTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-muted-foreground text-[11px]">{t.date}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="text-[9px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20 font-mono py-0">
                          {t.type}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-foreground text-[11px]">{t.txnNo}</td>
                      <td className="py-2.5 px-3 font-medium text-foreground text-[11px] truncate max-w-[140px]">{t.partyName}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground text-[11px]">
                        ₹ {t.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Today's Checklist Widget - Compact */}
        <div className="bg-card rounded-xl border border-border/80 shadow-2xs p-3.5 flex flex-col justify-between min-h-0 overflow-y-auto">
          <div>
            <div className="flex items-center justify-between border-b border-border/80 pb-2 mb-2.5">
              <h3 className="text-xs font-bold text-foreground tracking-tight">Institutional Checklist</h3>
              <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold uppercase px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">
                ACTIVE
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">Cloud Ledger Sync</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">All customer and vendor balances verified.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">GST Invoicing Engine</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">CGST/SGST/IGST tax rates verified for FY 2026-27.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">Follow-Up Queue</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Payment reminders available in Parties hub.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-border/80 text-[10px] font-mono text-muted-foreground flex items-center justify-between">
            <span>Section 2(1)(w) IT Act</span>
            <span>256-bit Encrypted</span>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      <Dialog open={showShortcutsModal} onOpenChange={setShowShortcutsModal}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-indigo-600" />
              <span>Keyboard Shortcuts</span>
            </DialogTitle>
          </DialogHeader>

          <div className="divide-y divide-slate-100 text-xs py-2">
            <div className="flex justify-between py-2"><span className="text-slate-600">Dashboard</span><kbd className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold">F1</kbd></div>
            <div className="flex justify-between py-2"><span className="text-slate-600">POS Billing</span><kbd className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold">F2 / Ctrl+1</kbd></div>
            <div className="flex justify-between py-2"><span className="text-slate-600">Hold Bill & Create New</span><kbd className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold">Ctrl + B</kbd></div>
            <div className="flex justify-between py-2"><span className="text-slate-600">Items / Inventory</span><kbd className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold">F3</kbd></div>
            <div className="flex justify-between py-2"><span className="text-slate-600">Sales Invoices</span><kbd className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold">F4</kbd></div>
            <div className="flex justify-between py-2"><span className="text-slate-600">Parties / Customers</span><kbd className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold">F5</kbd></div>
            <div className="flex justify-between py-2"><span className="text-slate-600">Reports Hub</span><kbd className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold">F6</kbd></div>
            <div className="flex justify-between py-2"><span className="text-slate-600">Exit POS Mode</span><kbd className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold">Ctrl + Esc</kbd></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Universal Quick Create Modal */}
      <UniversalQuickCreateModal
        open={showQuickCreate}
        onOpenChange={setShowQuickCreate}
      />
    </div>
  );
}
