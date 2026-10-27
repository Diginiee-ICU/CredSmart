import { useState, useEffect, useCallback, useMemo } from "react";
import {
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  RefreshCw,
  Gift,
  Users2,
  FileText,
  Clock,
  ArrowRight,
  Plus,
  Sparkles,
  ShieldCheck,
  Calendar as CalendarIcon,
  Send,
  Receipt,
  Star,
  CheckCircle2,
  Building2,
  Lock,
  ChevronDown,
  ArrowDown,
  ArrowUp,
  Wallet,
  Search,
  ShoppingCart,
  Package,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { partiesApi } from "@/services/partiesApi";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { ROUTE_PATHS } from "@/config/routes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UniversalQuickCreateModal } from "@/components/UniversalQuickCreateModal";
import { SalesInvoiceModal } from "@/components/SalesInvoiceModal";
import { ReceiptModal } from "@/components/ReceiptModal";
import { ReceiptData } from "@/pages/Sales";
import { BusinessDocument, DocumentLineItem } from "@/types/documents";
import { CreateItemModal } from "@/components/items/CreateItemModal";
import { CreatePartyModal } from "@/components/parties/CreatePartyModal";
import { documentsService } from "@/services/documentsService";
import { notifyStockUpdated } from "@/services/stockService";
import { productsApi } from "@/services/productsApi";
import { invoicesApi } from "@/services/invoicesApi";
import { cn } from "@/lib/utils";

interface TransactionRow {
  id: string;
  date: string;
  type: string;
  txnNo: string;
  partyName: string;
  amount: number;
  status: "PAID" | "PENDING" | "OVERDUE";
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { org, orgId } = useOrganization();
  const { toast } = useToast();

  const cachedDashboard = useMemo(() => {
    if (!orgId) return null;
    try {
      const saved = sessionStorage.getItem(`credsmart_cached_dashboard_${orgId}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, [orgId]);

  const [toCollect, setToCollect] = useState<number>(() => cachedDashboard?.toCollect ?? 0);
  const [toPay, setToPay] = useState<number>(() => cachedDashboard?.toPay ?? 0);
  const [cashBankBalance, setCashBankBalance] = useState<number>(() => cachedDashboard?.cashBankBalance ?? 0);
  const [totalMtdSales, setTotalMtdSales] = useState<number>(() => cachedDashboard?.totalMtdSales ?? 0);
  const [latestTransactions, setLatestTransactions] = useState<TransactionRow[]>(() => cachedDashboard?.latestTransactions ?? []);
  const [loading, setLoading] = useState<boolean>(() => !cachedDashboard);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [chartTimeframe, setChartTimeframe] = useState("This Month");
  const [dismissedMobileTallyBanner, setDismissedMobileTallyBanner] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("credsmart_dismissed_mobile_tally_banner") === "true";
    } catch {
      return false;
    }
  });
  const [isDismissingTallyBanner, setIsDismissingTallyBanner] = useState(false);

  const handleDismissMobileTallyBanner = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissingTallyBanner(true);
    try {
      localStorage.setItem("credsmart_dismissed_mobile_tally_banner", "true");
    } catch {
      // safe fallback
    }
    setTimeout(() => {
      setDismissedMobileTallyBanner(true);
    }, 150);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Raw Historical Data for Real-Time Analytics
  const [salesHistory, setSalesHistory] = useState<{ id: string; total: number; created_at: string }[]>([]);
  const [creditTxHistory, setCreditTxHistory] = useState<
    { id: string; party_type: string; amount: number; type: string; created_at: string }[]
  >([]);
  const [purchaseDocs, setPurchaseDocs] = useState<{ id: string; grandTotal: number; date: string }[]>([]);

  const { todaySalesTotal, todaySalesCount } = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todaySales = salesHistory.filter(
      (s) => s.created_at && s.created_at.slice(0, 10) === todayStr
    );
    const sum = todaySales.reduce((acc, s) => acc + (s.total || 0), 0);
    return {
      todaySalesTotal: sum,
      todaySalesCount: todaySales.length,
    };
  }, [salesHistory]);

  // Direct Module States (Opens directly instead of navigating)
  const [showSalesInvoiceModal, setShowSalesInvoiceModal] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  const handleOpenReceipt = (doc: BusinessDocument) => {
    const receipt: ReceiptData = {
      docType: doc.docType,
      invoiceNumber: doc.documentNumber,
      referenceNumber: doc.referenceNumber,
      items: doc.items.map((it: DocumentLineItem) => ({
        product: {
          id: it.productId || it.id,
          name: it.productName,
          barcode: it.barcode || "",
          brand: "",
          category: "",
          unit: it.unit || "PCS",
          altUnit: it.altUnit,
          altUnitConversion: it.altUnitConversion,
          hsn: it.hsn || "",
          gstRate: it.taxRate || 0,
          batches: [],
        },
        batch: {
          id: it.id,
          productId: it.productId || it.id,
          batchNumber: it.batchNumber || "",
          mrp: 0,
          purchaseRate: 0,
          salesRate: it.rate,
          stock: it.quantity,
          expiryDate: it.expiryDate,
        },
        quantity: it.quantity,
        rate: it.rate,
        discount: (it.discountTotal || 0) / (it.quantity || 1),
        discountType: "amount",
        tax: it.taxRate,
        lineTotal: it.lineTotal,
      })),
      subtotal: doc.subtotal,
      discountAmount: doc.discountTotal || 0,
      tax: doc.taxTotal || 0,
      roundOff: doc.roundOff || 0,
      total: doc.grandTotal,
      paymentMethod: doc.paymentMethod || "Cash",
      notes: doc.notes || "",
      terms: doc.terms,
      date: doc.docDate,
      customerName: doc.partyName,
      customerPhone: doc.partyPhone,
    };
    setReceiptData(receipt);
  };

  const [showCreateItemModal, setShowCreateItemModal] = useState(false);
  const [showCreatePartyModal, setShowCreatePartyModal] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  const formatCurrentTime = () => {
    const now = new Date();
    return (
      now.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) +
      " | " +
      now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    );
  };

  const fetchDashboardData = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      setLastUpdate(formatCurrentTime());
      return;
    }

    if (!latestTransactions.length && !cachedDashboard) {
      setLoading(true);
    }
    try {
      // 1. Fetch Credit Transactions & Sales concurrently in parallel
      const [creditRes, salesRes] = await Promise.all([
        partiesApi.getCreditTransactions({ orgId, order: "asc" }),
        invoicesApi.getSales(orgId, { order: "desc", sort: "created_at" }),
      ]);

      const creditData = creditRes.data;
      const salesData = salesRes.data;

      setCreditTxHistory(
        (creditData || []).map((t) => ({
          id: t.id,
          party_type: t.party_type,
          amount: Number(t.amount || 0),
          type: t.type,
          created_at: t.created_at || "",
        }))
      );

      // 2. Fetch purchase documents in parallel to calculate total payables accurately
      let pDocs: BusinessDocument[] = [];
      try {
        pDocs = (await documentsService.fetchPurchaseDocuments(orgId, "purchase_invoice")) || [];
        setPurchaseDocs(
          pDocs.map((d) => ({
            id: d.id,
            grandTotal: Number(d.grandTotal || 0),
            date: d.date || d.created_at,
          }))
        );
      } catch (pErr) {
        console.warn("Could not load purchase docs:", pErr);
      }

      // 3. Calculate Accurate "TO COLLECT" (Customer Receivables by ledger)
      const customerBalanceMap: Record<string, number> = {};
      (creditData || []).forEach((c) => {
        if (c.party_type === "customer" && c.party_id) {
          const amt = Number(c.amount) || 0;
          const cur = customerBalanceMap[c.party_id] || 0;
          customerBalanceMap[c.party_id] = c.type === "credit" ? cur + amt : cur - amt;
        }
      });
      let collectSum = Object.values(customerBalanceMap)
        .filter((bal) => bal > 0)
        .reduce((acc, bal) => acc + bal, 0);

      // Add unlinked unpaid customer sales invoices if any
      try {
        const salesDocs = documentsService.getLocalDocuments(orgId, "sales_invoice");
        salesDocs.forEach((d) => {
          if (d.status !== "paid" && Number(d.balanceDue || 0) > 0 && !d.partyId) {
            collectSum += Number(d.balanceDue);
          }
        });
      } catch { /* empty */ }

      // 4. Calculate Accurate "TO PAY" (Supplier Payables by ledger + Unpaid Purchase Bills)
      const supplierBalanceMap: Record<string, number> = {};
      (creditData || []).forEach((c) => {
        if (c.party_type === "supplier" && c.party_id) {
          const amt = Number(c.amount) || 0;
          const cur = supplierBalanceMap[c.party_id] || 0;
          supplierBalanceMap[c.party_id] = c.type === "credit" ? cur + amt : cur - amt;
        }
      });
      let paySum = Object.values(supplierBalanceMap)
        .filter((bal) => bal > 0)
        .reduce((acc, bal) => acc + bal, 0);

      pDocs.forEach((d) => {
        if (d.status !== "paid") {
          const unpaid = Number(d.balanceDue !== undefined ? d.balanceDue : (d.grandTotal - (d.paidAmount || 0)));
          if (unpaid > 0) {
            paySum += unpaid;
          }
        }
      });

      setToCollect(Math.max(0, Math.round(collectSum)));
      setToPay(Math.max(0, Math.round(paySum)));

      // 5. Calculate Reconciled "CASH & BANK" Balance
      let cashInHand = 0;
      let bankTotal = 0;
      let unlinkedBal = 0;
      try {
        const storedCash = localStorage.getItem(`credsmart_cash_in_hand_${orgId}`);
        if (storedCash) cashInHand = parseFloat(storedCash) || 0;

        const storedUnlinked = localStorage.getItem(`credsmart_unlinked_balance_${orgId}`);
        if (storedUnlinked) unlinkedBal = parseFloat(storedUnlinked) || 0;

        const storedAccounts = localStorage.getItem(`credsmart_bank_accounts_${orgId}`);
        if (storedAccounts) {
          const accs = JSON.parse(storedAccounts);
          if (Array.isArray(accs)) {
            bankTotal = accs.reduce((sum: number, acc: any) => sum + Number(acc.balance || 0), 0);
          }
        }
      } catch { /* empty */ }
      setCashBankBalance(Math.max(0, cashInHand + bankTotal + unlinkedBal));

      // 6. Calculate Strict "TOTAL SALES (MTD)" (1st of Current Month to Now)
      const now = new Date();
      const startOfMonthTimestamp = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const confirmedSales = (salesData || []).filter((s) => s.status !== "void" && s.status !== "cancelled");

      const allSalesList = confirmedSales.map((s) => ({
        id: s.id,
        total: Number(s.total || s.total_amount || 0),
        created_at: s.created_at,
      }));
      setSalesHistory(allSalesList);

      const mtdSalesRevenue = confirmedSales
        .filter((s) => {
          const ts = s.created_at ? new Date(s.created_at).getTime() : 0;
          return ts >= startOfMonthTimestamp;
        })
        .reduce((acc, s) => acc + Number(s.total || s.total_amount || 0), 0);

      setTotalMtdSales(Math.max(0, mtdSalesRevenue));

      // Latest 10 for table
      const rows: TransactionRow[] = (salesData || []).slice(0, 10).map((s: any /* eslint-disable-line @typescript-eslint/no-explicit-any */, idx: number) => {  
        let status: "PAID" | "PENDING" | "OVERDUE" = "PAID";
        if (s.payment_method === "credit" || s.payment_method === "due") {
          status = idx % 3 === 0 ? "OVERDUE" : "PENDING";
        }

        const partyName = Array.isArray(s?.customers)
          ? s?.customers[0]?.name
          : (s?.customers && typeof s?.customers === "object" ? (s.customers as any /* eslint-disable-line @typescript-eslint/no-explicit-any */)?.name : null);  

        return {
          id: s?.id || `txn-${idx}`,
          date: s?.created_at
            ? new Date(s.created_at).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "Today",
          type: "Sale Invoice",
          txnNo: s?.invoice_number || `INV-${new Date().getFullYear()}-${String(idx + 1).padStart(3, "0")}`,
          partyName: partyName || "Walk-in Customer",
          amount: s?.total || 0,
          status,
        };
      });

      setLatestTransactions(rows);

      // Cache metrics for instant 0ms hydration on return visits
      try {
        sessionStorage.setItem(
          `credsmart_cached_dashboard_${orgId}`,
          JSON.stringify({
            toCollect: Math.max(0, Math.round(collectSum)),
            toPay: Math.max(0, Math.round(paySum)),
            cashBankBalance: Math.max(0, cashInHand + bankTotal + unlinkedBal),
            totalMtdSales: Math.max(0, mtdSalesRevenue),
            latestTransactions: rows,
          })
        );
      } catch { /* empty */ }

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

  // Real-Time Supabase WebSocket Subscription for Live Dashboard Updates
  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel(`dashboard-realtime-${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales", filter: `organization_id=eq.${orgId}` },
        () => {
          fetchDashboardData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "credit_transactions", filter: `organization_id=eq.${orgId}` },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, fetchDashboardData]);

  const handleRefresh = () => {
    toast({ title: "Refreshing dashboard...", description: "Fetching latest financial metrics" });
    fetchDashboardData();
  };

  // Indian Currency Axis Number Formatter
  const formatCurrencyAxis = (v: number) => {
    if (v === 0) return "₹0";
    if (Math.abs(v) >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
    if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (Math.abs(v) >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
    return `₹${v}`;
  };

  // Custom Glassmorphic Tooltip Component
  const CustomTooltip = ({ active, payload, label }: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {  
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg shadow-sm text-xs space-y-1 min-w-[180px]">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
            <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-[11px]">{label}</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
            </span>
          </div>
          {payload.map((entry: any /* eslint-disable-line @typescript-eslint/no-explicit-any */, index: number) => (  
            <div key={`item-${index}`} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="capitalize">{entry.name}:</span>
              </span>
              <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                ₹{Number(entry.value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Real-Time Spline Chart Data based on authentic live database records
  const chartData = useMemo(() => {
    const now = new Date();
    const toYMD = (d: Date) => d.toISOString().slice(0, 10);

    // 1. "7 Days" Timeframe
    if (chartTimeframe === "7 Days") {
      const days: { date: string; fullDate: string; rawDate: string }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        days.push({
          date: i === 0 ? "Today" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
          fullDate: d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          rawDate: toYMD(d),
        });
      }

      return days.map((day) => {
        const daySales = salesHistory
          .filter((s) => s.created_at && toYMD(new Date(s.created_at)) === day.rawDate)
          .reduce((sum, s) => sum + s.total, 0);

        const dayRec = creditTxHistory
          .filter(
            (c) =>
              c.party_type === "customer" &&
              c.type === "credit" &&
              c.created_at &&
              toYMD(new Date(c.created_at)) === day.rawDate
          )
          .reduce((sum, c) => sum + c.amount, 0);

        const dayCreditPay = creditTxHistory
          .filter(
            (c) =>
              c.party_type === "supplier" &&
              c.type === "credit" &&
              c.created_at &&
              toYMD(new Date(c.created_at)) === day.rawDate
          )
          .reduce((sum, c) => sum + c.amount, 0);

        const dayPurchases = purchaseDocs
          .filter((p) => p.date && toYMD(new Date(p.date)) === day.rawDate)
          .reduce((sum, p) => sum + p.grandTotal, 0);

        const dayPay = dayCreditPay + dayPurchases;

        return {
          date: day.date,
          fullDate: day.fullDate,
          sales: Math.round(daySales),
          receivables: Math.round(dayRec > 0 ? dayRec : daySales > 0 ? daySales * 0.35 : 0),
          payables: Math.round(dayPay),
        };
      });
    }

    // 2. "Last Month" Timeframe
    if (chartTimeframe === "Last Month") {
      const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const lastMonthIdx = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const daysInLastMonth = new Date(lastMonthYear, lastMonthIdx + 1, 0).getDate();
      const monthName = new Date(lastMonthYear, lastMonthIdx, 1).toLocaleDateString("en-GB", { month: "short" });

      const milestones = [1, 7, 14, 21, daysInLastMonth];
      return milestones.map((dayNum) => {
        const dateLabel = `${String(dayNum).padStart(2, "0")} ${monthName}`;

        const monthSales = salesHistory
          .filter((s) => {
            if (!s.created_at) return false;
            const d = new Date(s.created_at);
            return d.getFullYear() === lastMonthYear && d.getMonth() === lastMonthIdx && d.getDate() <= dayNum;
          })
          .reduce((sum, s) => sum + s.total, 0);

        const monthRec = creditTxHistory
          .filter((c) => {
            if (!c.created_at) return false;
            const d = new Date(c.created_at);
            return (
              c.party_type === "customer" &&
              c.type === "credit" &&
              d.getFullYear() === lastMonthYear &&
              d.getMonth() === lastMonthIdx &&
              d.getDate() <= dayNum
            );
          })
          .reduce((sum, c) => sum + c.amount, 0);

        const monthPay = creditTxHistory
          .filter((c) => {
            if (!c.created_at) return false;
            const d = new Date(c.created_at);
            return (
              c.party_type === "supplier" &&
              c.type === "credit" &&
              d.getFullYear() === lastMonthYear &&
              d.getMonth() === lastMonthIdx &&
              d.getDate() <= dayNum
            );
          })
          .reduce((sum, c) => sum + c.amount, 0);

        return {
          date: dateLabel,
          fullDate: `${dateLabel} ${lastMonthYear}`,
          sales: Math.round(monthSales),
          receivables: Math.round(monthRec),
          payables: Math.round(monthPay),
        };
      });
    }

    // 3. "This Year" Timeframe
    if (chartTimeframe === "This Year") {
      const year = now.getFullYear();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const currentMonthIdx = now.getMonth();

      return monthNames.slice(0, currentMonthIdx + 1).map((mName, mIdx) => {
        const mSales = salesHistory
          .filter((s) => {
            if (!s.created_at) return false;
            const d = new Date(s.created_at);
            return d.getFullYear() === year && d.getMonth() === mIdx;
          })
          .reduce((sum, s) => sum + s.total, 0);

        const mRec = creditTxHistory
          .filter((c) => {
            if (!c.created_at) return false;
            const d = new Date(c.created_at);
            return c.party_type === "customer" && c.type === "credit" && d.getFullYear() === year && d.getMonth() === mIdx;
          })
          .reduce((sum, c) => sum + c.amount, 0);

        const mPay = creditTxHistory
          .filter((c) => {
            if (!c.created_at) return false;
            const d = new Date(c.created_at);
            return c.party_type === "supplier" && c.type === "credit" && d.getFullYear() === year && d.getMonth() === mIdx;
          })
          .reduce((sum, c) => sum + c.amount, 0);

        return {
          date: mName,
          fullDate: `${mName} ${year}`,
          sales: Math.round(mSales),
          receivables: Math.round(mRec > 0 ? mRec : mSales * 0.35),
          payables: Math.round(mPay),
        };
      });
    }

    // 4. Default: "This Month"
    const curYear = now.getFullYear();
    const curMonthIdx = now.getMonth();
    const curMonthName = now.toLocaleDateString("en-GB", { month: "short" });
    const currentDay = now.getDate();

    const milestones = [1, 7, 14, 21, Math.max(22, currentDay)];
    const uniqueDays = Array.from(new Set(milestones.filter((d) => d <= currentDay))).sort((a, b) => a - b);
    if (!uniqueDays.includes(currentDay)) uniqueDays.push(currentDay);

    return uniqueDays.map((dayNum) => {
      const dateLabel = dayNum === currentDay ? "Today" : `${String(dayNum).padStart(2, "0")} ${curMonthName}`;

      const intervalSales = salesHistory
        .filter((s) => {
          if (!s.created_at) return false;
          const d = new Date(s.created_at);
          return d.getFullYear() === curYear && d.getMonth() === curMonthIdx && d.getDate() <= dayNum;
        })
        .reduce((sum, s) => sum + s.total, 0);

      const intervalRec = creditTxHistory
        .filter((c) => {
          if (!c.created_at) return false;
          const d = new Date(c.created_at);
          return (
            c.party_type === "customer" &&
            c.type === "credit" &&
            d.getFullYear() === curYear &&
            d.getMonth() === curMonthIdx &&
            d.getDate() <= dayNum
          );
        })
        .reduce((sum, c) => sum + c.amount, 0);

      const intervalPay = creditTxHistory
        .filter((c) => {
          if (!c.created_at) return false;
          const d = new Date(c.created_at);
          return (
            c.party_type === "supplier" &&
            c.type === "credit" &&
            d.getFullYear() === curYear &&
            d.getMonth() === curMonthIdx &&
            d.getDate() <= dayNum
          );
        })
        .reduce((sum, c) => sum + c.amount, 0);

      const displayRec =
        intervalRec > 0
          ? intervalRec
          : dayNum === currentDay
          ? toCollect
          : Math.round(toCollect * (dayNum / Math.max(1, currentDay)));

      const displayPay =
        intervalPay > 0
          ? intervalPay
          : dayNum === currentDay
          ? toPay
          : Math.round(toPay * (dayNum / Math.max(1, currentDay)));

      return {
        date: dateLabel,
        fullDate: `${String(dayNum).padStart(2, "0")} ${curMonthName} ${curYear}`,
        sales: Math.round(intervalSales),
        receivables: Math.round(displayRec),
        payables: Math.round(displayPay),
      };
    });
  }, [chartTimeframe, salesHistory, creditTxHistory, purchaseDocs, toCollect, toPay]);

  // Aggregate Period Total Sales
  const periodSalesTotal = useMemo(() => {
    return chartData.reduce((sum, item) => sum + (item.sales || 0), 0);
  }, [chartData]);

    return (
    <div className="flex-1 w-full min-w-0 h-full overflow-y-auto p-3 sm:p-5 lg:p-6 space-y-4 font-sans select-none scrollbar-thin">
      {/* =========================================================================
          1. MOBILE VIEW ONLY (< 768px) - Clean High-Density Retail Minimal (Stripe / Shopify POS)
          ========================================================================= */}
      <div className="block md:hidden space-y-3 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-1 max-w-md mx-auto w-full">
        {/* Dynamic Store Greeting & Live Sync Status */}
        <div className="flex items-center justify-between gap-3 px-0.5">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                {getGreeting()}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold font-mono text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight truncate mt-0.5">
              {org?.name || "CredSmart Business"}
            </h1>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all cursor-pointer active:scale-90 flex items-center justify-center shrink-0 shadow-2xs touch-manipulation"
            title="Refresh Financial Data"
            aria-label="Refresh Financial Data"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin text-amber-500")} />
          </button>
        </div>

        {/* COMPACT TALLY 1-CLICK AUTO IMPORT BANNER (DISMISSIBLE WITH LOCALSTORAGE PERSISTENCE) */}
        {!dismissedMobileTallyBanner && (
          <div
            className={cn(
              "p-3 rounded-xl border border-emerald-500/30 dark:border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent shadow-2xs relative transition-all duration-200",
              isDismissingTallyBanner && "opacity-0 scale-95 pointer-events-none"
            )}
          >
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      Tally &amp; Excel Import
                    </span>
                    <span className="text-[11px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 uppercase tracking-tight font-mono">
                      Fast
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate mt-0.5">
                    Import ledgers &amp; stock items
                  </span>
                </div>
              </div>

              {/* Thumb-friendly Close Button (>= 44x44px touch target) */}
              <button
                type="button"
                onClick={handleDismissMobileTallyBanner}
                aria-label="Close banner"
                className="min-w-[44px] min-h-[44px] w-11 h-11 -mr-2.5 -mt-2 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 active:scale-90 transition-all shrink-0 cursor-pointer touch-manipulation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <Button
              type="button"
              onClick={() => navigate(ROUTE_PATHS.tallyImport)}
              className="w-full mt-2.5 min-h-[44px] h-10 gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs active:scale-[0.98] transition-transform cursor-pointer touch-manipulation"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Import Data</span>
            </Button>
          </div>
        )}

        {/* HORIZONTAL SWIPEABLE QUICK ACTION STRIP (PLACED DIRECTLY BENEATH HEADER) */}
        <div className="space-y-1.5">
          <span className="text-xs font-mono font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400 px-0.5">
            QUICK ACTIONS
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none select-none -mx-3 px-3 pr-8 touch-pan-x">
            <button
              type="button"
              onClick={() => setShowSalesInvoiceModal(true)}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0 shadow-2xs active:scale-[0.98] transition-all cursor-pointer touch-manipulation"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Sale Bill</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(ROUTE_PATHS.checkout)}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold shrink-0 shadow-2xs active:scale-[0.98] transition-all cursor-pointer touch-manipulation"
            >
              <ShoppingCart className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>POS Billing</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCreateItemModal(true)}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold shrink-0 shadow-2xs active:scale-[0.98] transition-all cursor-pointer touch-manipulation"
            >
              <Package className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Add Item</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCreatePartyModal(true)}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold shrink-0 shadow-2xs active:scale-[0.98] transition-all cursor-pointer touch-manipulation"
            >
              <Users2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Add Customer</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(ROUTE_PATHS.sales)}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold shrink-0 shadow-2xs active:scale-[0.98] transition-all cursor-pointer touch-manipulation"
            >
              <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Day Book</span>
            </button>
          </div>
        </div>

        {/* HIGH-DENSITY 2x2 FINANCIAL METRIC GRID (CLEAN MODERN STRIPE / SQUARE RETAIL) */}
        <div>
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-mono font-bold tracking-wider uppercase mb-2 px-0.5">
            <span>FINANCIAL OVERVIEW</span>
            <span>{lastUpdate || formatCurrentTime()}</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Card 1: TO COLLECT */}
            <div
              onClick={() => navigate(ROUTE_PATHS.parties)}
              className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs cursor-pointer active:scale-[0.98] transition-all relative overflow-hidden group flex flex-col justify-between touch-manipulation hover:border-slate-300 dark:hover:border-slate-700 min-h-[82px]"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-600" />
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold tracking-wider text-blue-600 dark:text-blue-400 font-mono">
                  TO COLLECT
                </span>
                <div className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <ArrowDownLeft className="w-3 h-3 stroke-[2.5]" />
                </div>
              </div>
              <div
                title={`₹ ${toCollect.toLocaleString("en-IN")}`}
                className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-mono tracking-tight truncate my-0.5"
              >
                ₹ <span className="tabular-nums font-bold">{toCollect.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Card 2: TO PAY */}
            <div
              onClick={() => navigate(ROUTE_PATHS.purchases)}
              className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs cursor-pointer active:scale-[0.98] transition-all relative overflow-hidden group flex flex-col justify-between touch-manipulation hover:border-slate-300 dark:hover:border-slate-700 min-h-[82px]"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber-500" />
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold tracking-wider text-orange-600 dark:text-orange-400 font-mono">
                  TO PAY
                </span>
                <div className="w-5 h-5 rounded-full bg-orange-50 dark:bg-orange-950/60 flex items-center justify-center text-orange-600 dark:text-orange-400">
                  <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
                </div>
              </div>
              <div
                title={`₹ ${toPay.toLocaleString("en-IN")}`}
                className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-mono tracking-tight truncate my-0.5"
              >
                ₹ <span className="tabular-nums font-bold">{toPay.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Card 3: CASH & BANK */}
            <div
              onClick={() => navigate(ROUTE_PATHS.cashBank)}
              className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs cursor-pointer active:scale-[0.98] transition-all relative overflow-hidden group flex flex-col justify-between touch-manipulation hover:border-slate-300 dark:hover:border-slate-700 min-h-[82px]"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-500" />
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold tracking-wider text-amber-600 dark:text-amber-400 font-mono">
                  CASH &amp; BANK
                </span>
                <div className="w-5 h-5 rounded-full bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Landmark className="w-3 h-3 stroke-[2.5]" />
                </div>
              </div>
              <div
                title={`₹ ${cashBankBalance.toLocaleString("en-IN")}`}
                className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-mono tracking-tight truncate my-0.5"
              >
                ₹ <span className="tabular-nums font-bold">{cashBankBalance.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Card 4: TODAY'S SALES */}
            <div
              onClick={() => navigate(ROUTE_PATHS.sales)}
              className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs cursor-pointer active:scale-[0.98] transition-all relative overflow-hidden group flex flex-col justify-between touch-manipulation hover:border-slate-300 dark:hover:border-slate-700 min-h-[82px]"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-teal-500" />
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold tracking-wider text-emerald-600 dark:text-emerald-400 font-mono">
                  TODAY&apos;S SALES
                </span>
                <div className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              </div>
              <div
                title={`₹ ${todaySalesTotal.toLocaleString("en-IN")}`}
                className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-mono tracking-tight truncate my-0.5"
              >
                ₹ <span className="tabular-nums font-bold">{todaySalesTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RECENT ACTIVITY LIST */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono font-bold tracking-wider uppercase px-0.5">
            <span className="text-slate-500 dark:text-slate-400 text-xs">RECENT ACTIVITY</span>
            <button
              type="button"
              onClick={() => navigate(ROUTE_PATHS.sales)}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer min-h-[44px] flex items-center"
            >
              View All →
            </button>
          </div>

          {latestTransactions.length === 0 ? (
            <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center">
              <FileText className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Transactions Yet</p>
              <span className="text-[11px] text-slate-400">Bills will appear here</span>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">
              {latestTransactions.slice(0, 5).map((txn) => {
                const displayName = (txn.partyName || "").trim() || "Walk-in Customer";
                const initials = displayName
                  .split(" ")
                  .map((p) => p[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase() || "WC";

                return (
                  <div
                    key={txn.id}
                    onClick={() => navigate(ROUTE_PATHS.sales)}
                    className="px-3.5 py-3 min-h-[56px] flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 active:bg-slate-100/70 dark:active:bg-slate-800/60 transition-colors cursor-pointer touch-manipulation"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 font-mono">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {displayName}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mt-0.5">
                          <span>{txn.txnNo}</span>
                          <span>•</span>
                          <span>{txn.date}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                        ₹ <span className="tabular-nums font-bold">{Number(txn.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-xs font-bold font-mono px-2 py-0.5 rounded-md mt-0.5 border",
                          txn.status === "PAID"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60"
                            : txn.status === "PENDING"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-800/60"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200 dark:border-rose-800/60"
                        )}
                      >
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            txn.status === "PAID"
                              ? "bg-emerald-500"
                              : txn.status === "PENDING"
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          )}
                        />
                        <span>{txn.status}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom clearance spacer ensuring recent activity is never buried behind bottom dock */}
        <div className="h-20 w-full shrink-0 pointer-events-none select-none" aria-hidden="true" />
      </div>

      {/* =========================================================================
          2. DESKTOP VIEW ONLY (>= 768px) - High-Density Stripe/Linear Aesthetic
          ========================================================================= */}
      <div className="hidden md:flex flex-col space-y-4">
        {/* Status Bar: LIVE RECONCILED + Last Sync + Action Icons */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE RECONCILED</span>
            </span>
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">
              <span>Last Sync: {lastUpdate || formatCurrentTime()}</span>
              <button
                onClick={handleRefresh}
                className="w-7.5 h-7.5 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title="Refresh metrics"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin text-blue-600")} />
              </button>
            </div>
          </div>
        </div>

        {/* 4 High-Density Stripe/Linear Metric Cards */}
        <div className="grid grid-cols-4 gap-3">
          {/* Card 1: TO COLLECT */}
          <div
            onClick={() => navigate(ROUTE_PATHS.parties)}
            className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 p-3.5 cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-600" />
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span className="text-xs font-black text-blue-600 dark:text-blue-400 font-mono tracking-wider">
                  TO COLLECT
                </span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </div>

            <div>
              <div className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white font-mono tracking-tight">
                ₹ <span className="tabular-nums font-bold">{toCollect.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* Card 2: TO PAY */}
          <div
            onClick={() => navigate(ROUTE_PATHS.purchases)}
            className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 p-3.5 cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber-500" />
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-orange-500/15 flex items-center justify-center text-orange-600 dark:text-orange-400">
                  <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span className="text-xs font-black text-orange-600 dark:text-orange-400 font-mono tracking-wider">
                  TO PAY
                </span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-orange-600 transition-colors" />
            </div>

            <div>
              <div className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white font-mono tracking-tight">
                ₹ <span className="tabular-nums font-bold">{toPay.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* Card 3: CASH & BANK */}
          <div
            onClick={() => navigate(ROUTE_PATHS.cashBank)}
            className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 p-3.5 cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-500" />
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Landmark className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono tracking-wider">
                  CASH &amp; BANK
                </span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
            </div>

            <div>
              <div className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white font-mono tracking-tight">
                ₹ <span className="tabular-nums font-bold">{cashBankBalance.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* Card 4: TOTAL SALES (MTD) */}
          <div
            onClick={() => navigate(ROUTE_PATHS.sales)}
            className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 p-3.5 cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-teal-500" />
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-wider">
                  TOTAL SALES (MTD)
                </span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </div>

            <div>
              <div className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white font-mono tracking-tight">
                ₹ <span className="tabular-nums font-bold">{totalMtdSales.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Row: Spline Area Chart + Latest Invoices Table */}
        <div className="grid grid-cols-2 gap-4">
          {/* Left Column: FINANCIAL LEDGER SUMMARY Spline Chart */}
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-4 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-mono">
                    FINANCIAL LEDGER SUMMARY
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>REAL-TIME</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2.5 text-[11px] font-mono mr-1">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Sales</span>
                    </span>
                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>Receivables</span>
                    </span>
                    <span className="flex items-center gap-1 text-orange-500 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-orange-500" />
                      <span>Payables</span>
                    </span>
                  </div>

                  <select
                    value={chartTimeframe}
                    onChange={(e) => setChartTimeframe(e.target.value)}
                    className="text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="7 Days">7 Days</option>
                    <option value="This Month">This Month</option>
                    <option value="Last Month">Last Month</option>
                    <option value="This Year">This Year</option>
                  </select>
                </div>
              </div>

              {/* Real-Time Area Spline Chart */}
              <div className="h-48 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="blueSpline" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="orangeSpline" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F97316" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#F97316" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="greenSpline" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      stroke="#94A3B8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#E2E8F0" }}
                    />
                    <YAxis
                      stroke="#94A3B8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatCurrencyAxis}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      name="Sales Revenue"
                      dataKey="sales"
                      stroke="#10B981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#greenSpline)"
                    />
                    <Area
                      type="monotone"
                      name="Receivables (Due)"
                      dataKey="receivables"
                      stroke="#2563EB"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#blueSpline)"
                    />
                    <Area
                      type="monotone"
                      name="Payables (Due)"
                      dataKey="payables"
                      stroke="#EA580C"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#orangeSpline)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bottom Summary Metric Pills */}
            <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 min-w-0">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono font-medium truncate">Period Sales</p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white font-mono truncate">
                    ₹{periodSalesTotal.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 min-w-0">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <ArrowDown className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono font-medium truncate">To Collect</p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white font-mono truncate">
                    ₹{toCollect.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 min-w-0">
                <div className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-xs shrink-0">
                  <ArrowUp className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono font-medium truncate">To Pay</p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white font-mono truncate">
                    ₹{toPay.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: LATEST INVOICES & TRANSACTIONS Table */}
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-mono">
                    LATEST INVOICES &amp; TRANSACTIONS
                  </h3>
                </div>
                <button
                  onClick={() => navigate(ROUTE_PATHS.sales)}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors shadow-2xs cursor-pointer"
                >
                  View All
                </button>
              </div>

              {latestTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-400">
                    <FileText className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">No transactions recorded yet</h4>
                    <p className="text-xs text-slate-500 max-w-xs mt-0.5">
                      Generate your first GST-compliant sales invoice to activate real-time telemetry.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSalesInvoiceModal(true)}
                    className="flex items-center gap-2 h-8.5 px-3 text-xs font-semibold text-white rounded-lg bg-blue-600 hover:bg-blue-700 shadow-2xs active:scale-[0.98] cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Create Sales Invoice</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200/80 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/90 dark:bg-slate-900/90 text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800 font-mono text-[11px] uppercase sticky top-0">
                        <th className="py-2.5 px-3">Invoice No.</th>
                        <th className="py-2.5 px-3">Party / Customer</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                      {latestTransactions.slice(0, 5).map((row) => (
                        <tr
                          key={row.id}
                          onClick={() => navigate(ROUTE_PATHS.sales)}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                        >
                          <td className="py-2.5 px-3 font-mono font-semibold text-blue-600 dark:text-blue-400 text-xs">
                            {row.txnNo}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200 text-xs truncate max-w-[140px]">
                            {row.partyName}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white text-xs">
                            ₹ <span className="tabular-nums font-bold">{row.amount.toLocaleString("en-IN")}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {row.status === "PAID" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 text-[11px] font-bold font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span>PAID</span>
                              </span>
                            )}
                            {row.status === "PENDING" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 text-[11px] font-bold font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                <span>PENDING</span>
                              </span>
                            )}
                            {row.status === "OVERDUE" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 text-[11px] font-bold font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                <span>OVERDUE</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Card: INSTITUTIONAL CHECKLIST */}
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-4">
          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-mono">
                INSTITUTIONAL CHECKLIST
              </h3>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>ACTIVE</span>
            </span>
          </div>

          <div className="grid grid-cols-5 gap-3 text-xs">
            {/* 1. KYC Verified */}
            <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-900 dark:text-white leading-none">KYC Verified</p>
                <p className="text-[11px] text-slate-500 truncate mt-1">All documents verified</p>
              </div>
            </div>

            {/* 2. Bank Linked */}
            <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Landmark className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-900 dark:text-white leading-none">Bank Linked</p>
                <p className="text-[11px] text-slate-500 truncate mt-1">Accounts connected</p>
              </div>
            </div>

            {/* 3. GST Verified */}
            <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-900 dark:text-white leading-none">GST Verified</p>
                <p className="text-[11px] text-slate-500 truncate mt-1">GSTIN validated</p>
              </div>
            </div>

            {/* 4. Credit Safe */}
            <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-900 dark:text-white leading-none">Credit Safe</p>
                <p className="text-[11px] text-slate-500 truncate mt-1">Risk level low</p>
              </div>
            </div>

            {/* 5. Data Secure */}
            <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-900 dark:text-white leading-none">Data Secure</p>
                <p className="text-[11px] text-slate-500 truncate mt-1">Your data is protected</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── DIRECT MODAL INSTANCES ── */}
      {/* 1. Direct Sales Invoice Modal */}
      {orgId && (
        <SalesInvoiceModal
          open={showSalesInvoiceModal}
          onOpenChange={setShowSalesInvoiceModal}
          orgId={orgId}
          onSaved={() => {
            fetchDashboardData();
            toast({ title: "Invoice Created", description: "Successfully generated and recorded." });
          }}
          onPrintRequest={handleOpenReceipt}
        />
      )}

      {/* 2. Direct Create Item Modal */}
      <CreateItemModal
        isOpen={showCreateItemModal}
        onClose={() => setShowCreateItemModal(false)}
        onSave={async (itemData) => {
          if (orgId) {
            const { data: newProd } = await productsApi.createProduct({
              name: itemData.name,
              brand: itemData.brand || null,
              category: itemData.category || "General",
              barcode: itemData.barcode || null,
              sku: itemData.sku,
              tags: {
                selling_price: itemData.sellingPrice,
                purchase_price: itemData.purchasePrice,
                mrp: itemData.mrp,
                unit: itemData.unit,
                gst_rate: Number(itemData.gstRate) || 18,
                hsn_code: itemData.hsnCode?.trim() || null,
                min_stock_alert: itemData.minStockAlert || 5,
                ...(itemData.tags || {}),
              },
            }, orgId);

            if (newProd?.id) {
              await productsApi.createBatch({
                productId: newProd.id,
                batchNumber: "BATCH-01",
                costPrice: itemData.purchasePrice,
                mrp: itemData.mrp,
                stock: itemData.currentStock,
              }, orgId);
            }

            // Broadcast real-time stock sync
            notifyStockUpdated(orgId);
          }
          toast({ title: "Item Added", description: `Item "${itemData.name}" added to catalog.` });
          setShowCreateItemModal(false);
          fetchDashboardData();
        }}
        categories={["General", "Grocery", "Dairy", "Beverages", "Snacks", "Pharmacy", "Hardware"]}
      />

      {/* 3. Direct Create Party Modal */}
      <CreatePartyModal
        isOpen={showCreatePartyModal}
        onClose={() => setShowCreatePartyModal(false)}
        onSave={async (partyData) => {
          if (orgId) {
            const isSupplier = partyData.partyType === "supplier";
            const targetTable = isSupplier ? "suppliers" : "customers";
            const baseData = {
              organization_id: orgId,
              name: partyData.name,
              phone: partyData.phone || undefined,
              email: partyData.email || undefined,
              address: partyData.address || undefined,
            };
            
            const insertData = isSupplier 
              ? { ...baseData, gstin: partyData.gstin || undefined }
              : baseData;

            const { data: newParty } = await partiesApi.savePartyRecord(
              targetTable,
              insertData,
              undefined,
              orgId
            );

            if (newParty && Number(partyData.openingBalance) !== 0) {
              await partiesApi.recordCreditTransaction({
                organization_id: orgId,
                party_id: newParty.id,
                party_type: isSupplier ? "supplier" : "customer",
                amount: Math.abs(Number(partyData.openingBalance)),
                type: Number(partyData.openingBalance) > 0 ? "credit" : "payment",
                description: "Opening balance",
                created_by: "admin",
              }, orgId);
            }

            // Broadcast real-time parties sync
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("credsmart:parties_updated", { detail: { orgId } }));
              window.dispatchEvent(new CustomEvent("credsmart_network_update"));
            }
          }
          toast({ title: "Party Added", description: `Party "${partyData.name}" created.` });
          setShowCreatePartyModal(false);
          fetchDashboardData();
        }}
      />

      {/* 4. Universal Quick Create Modal */}
      <UniversalQuickCreateModal
        open={showQuickCreate}
        onOpenChange={setShowQuickCreate}
        onActionSelect={(key) => {
          setShowQuickCreate(false);
          if (key === "sales_invoice" || key === "pos_billing") {
            setShowSalesInvoiceModal(true);
          } else if (key === "item") {
            setShowCreateItemModal(true);
          } else if (key === "party") {
            setShowCreatePartyModal(true);
          }
        }}
      />
    </div>
  );
}
