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
    <div className="flex-1 min-h-screen bg-[#F4F6F9] p-4 sm:p-6 lg:p-7 space-y-5">
      {/* Top Bar matching Capture.PNG */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Dashboard</h1>

        {/* Action icons bar */}
        <div className="flex items-center gap-2 text-slate-500">
          <button
            onClick={() => toast({ title: "Desktop App", description: "Download CredSmart desktop client for Windows/macOS" })}
            title="Desktop App"
            className="p-2 rounded-lg hover:bg-slate-200/70 hover:text-slate-800 transition-colors"
          >
            <Tv className="w-4 h-4" />
          </button>
          <button
            onClick={() => toast({ title: "Announcements", description: "GST Rule update 2026: E-invoicing threshold guidelines" })}
            title="Announcements"
            className="p-2 rounded-lg hover:bg-slate-200/70 hover:text-slate-800 transition-colors"
          >
            <Megaphone className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(ROUTE_PATHS.items)}
            title="Offers & Rewards"
            className="p-2 rounded-lg hover:bg-slate-200/70 hover:text-slate-800 transition-colors"
          >
            <Gift className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(ROUTE_PATHS.staff)}
            title="Community & Users"
            className="p-2 rounded-lg hover:bg-slate-200/70 hover:text-slate-800 transition-colors"
          >
            <Users2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.open("https://wa.me/919999999999", "_blank")}
            title="Chat Support"
            className="p-2 rounded-lg hover:bg-slate-200/70 hover:text-slate-800 transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
          </button>
          <button
            onClick={() => setShowShortcutsModal(true)}
            title="Keyboard Shortcuts"
            className="p-2 rounded-lg hover:bg-slate-200/70 hover:text-slate-800 transition-colors"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Business Overview Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 tracking-tight">Business Overview</h2>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <span>Last Update: {lastUpdate || formatCurrentTime()}</span>
            <button
              onClick={handleRefresh}
              className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
              title="Refresh metrics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* 3 Metric Cards Grid matching Capture.PNG */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: To Collect */}
          <div
            onClick={() => navigate(ROUTE_PATHS.parties)}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-slate-600 mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                <span>To Collect</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              ₹ {toCollect.toLocaleString("en-IN")}
            </div>
          </div>

          {/* Card 2: To Pay */}
          <div
            onClick={() => navigate(ROUTE_PATHS.purchases)}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-slate-600 mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <span>To Pay</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-rose-600 transition-colors" />
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              ₹ {toPay.toLocaleString("en-IN")}
            </div>
          </div>

          {/* Card 3: Total Cash + Bank Balance */}
          <div
            onClick={() => navigate(ROUTE_PATHS.cashBank)}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-slate-600 mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700">
                <Landmark className="w-4 h-4 text-indigo-600" />
                <span>Total Cash + Bank Balance</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              ₹ {cashBankBalance.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </div>

      {/* Main Body Grid: Latest Transactions (2/3) + Today's Checklist (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Latest Transactions Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Latest Transactions</h3>
            {latestTransactions.length > 0 && (
              <button
                onClick={() => navigate(ROUTE_PATHS.sales)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {latestTransactions.length === 0 ? (
            /* Clean Empty State matching Capture.PNG */
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-400">
                <FileText className="w-8 h-8 stroke-[1.5]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800">No transactions made yet!</h4>
                <p className="text-xs text-slate-500 max-w-xs">
                  Create your first transaction to start seeing your data
                </p>
              </div>
              <Button
                onClick={() => setShowQuickCreate(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 mt-2 gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Invoice</span>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                    <th className="py-2.5 px-4">DATE</th>
                    <th className="py-2.5 px-4">TYPE</th>
                    <th className="py-2.5 px-4">TXN NO</th>
                    <th className="py-2.5 px-4">PARTY NAME</th>
                    <th className="py-2.5 px-4 text-right">AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {latestTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-600">{t.date}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">
                          {t.type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-800">{t.txnNo}</td>
                      <td className="py-3 px-4 font-medium text-slate-700">{t.partyName}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ₹ {t.amount.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Today's Checklist Widget matching Capture.PNG */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-800 mb-6">Today's Checklist</h3>

          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 py-6">
            {/* Construction cones / rocket icon illustration */}
            <div className="w-20 h-20 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-500 shadow-xs">
              <Sparkles className="w-10 h-10 animate-pulse" />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800">Coming Soon...</h4>
              <p className="text-xs text-slate-500 max-w-[220px]">
                Smarter daily checklist for overdue and follow-ups
              </p>
            </div>
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
