import { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  Calendar,
  ShoppingBag,
  DollarSign,
  CreditCard,
  IndianRupee,
  Activity,
  ArrowUpRight,
  PieChart as PieChartIcon,
  Layers,
  Sparkles,
  Receipt,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import { cn } from "@/lib/utils";

interface SaleRow {
  total: number;
  payment_method: string;
  created_at: string;
}

export default function Analytics() {
  const { orgId, loading: orgLoading } = useOrganization();
  const { toast } = useToast();
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orgLoading) return;

    if (!orgId) {
      setSales([]);
      setLoading(false);
      return;
    }

    fetchSales();
  }, [orgId, orgLoading]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sales")
        .select("total, payment_method, created_at")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: true });
      if (error) {
        console.error("fetchSales error:", error);
        toast({ title: "Could not load analytics", description: "Failed to fetch sales" });
        setSales([]);
      } else if (data) {
        setSales(
          data.map((r: any) => ({
            total: Number(r.total || 0),
            payment_method: r.payment_method || "cash",
            created_at: r.created_at,
          }))
        );
      } else {
        setSales([]);
      }
    } catch (err) {
      console.error("fetchSales unexpected error:", err);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  // Monthly revenue data
  const monthlyData = useMemo(() => {
    const months: Record<string, { sales: number; orders: number }> = {};
    sales.forEach((s) => {
      const key = (s.created_at || "").slice(0, 7); // YYYY-MM
      if (!key || key.length < 7) return;
      if (!months[key]) months[key] = { sales: 0, orders: 0 };
      months[key].sales += s.total;
      months[key].orders += 1;
    });
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const entries = Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6);

    if (entries.length === 0) {
      // Fallback empty months for clean visual chart
      const current = new Date();
      return Array.from({ length: 6 }).map((_, idx) => {
        const d = new Date(current.getFullYear(), current.getMonth() - (5 - idx), 1);
        return {
          month: monthNames[d.getMonth()],
          sales: 0,
          orders: 0,
        };
      });
    }

    return entries.map(([key, val]) => ({
      month: monthNames[parseInt(key.slice(5)) - 1] + " " + key.slice(2, 4),
      sales: Math.round(val.sales),
      orders: val.orders,
    }));
  }, [sales]);

  // Payment method breakdown
  const paymentData = useMemo(() => {
    const methods: Record<string, number> = {};
    sales.forEach((s) => {
      const m = s.payment_method ? s.payment_method.toUpperCase() : "CASH";
      methods[m] = (methods[m] || 0) + s.total;
    });

    const colors = [
      "hsl(235 56% 48%)", // Primary Blue
      "hsl(160 60% 42%)", // Emerald Green
      "hsl(38 92% 50%)",  // Amber
      "hsl(280 65% 55%)", // Purple
      "hsl(190 90% 45%)", // Cyan
    ];

    const total = Object.values(methods).reduce((a, b) => a + b, 0);

    return Object.entries(methods).map(([name, value], i) => ({
      name,
      value: Math.round(value),
      percentage: total > 0 ? ((value / total) * 100).toFixed(1) : "0",
      color: colors[i % colors.length],
    }));
  }, [sales]);

  const totalRevenue = useMemo(() => sales.reduce((s, r) => s + r.total, 0), [sales]);
  const totalOrders = sales.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Today's and This Month sales calculation
  const todaySales = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return sales
      .filter((s) => (s.created_at || "").slice(0, 10) === today)
      .reduce((sum, s) => sum + s.total, 0);
  }, [sales]);

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 py-6 sm:px-8 sm:py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-primary" />
            Financial & Sales Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time revenue metrics, transaction trends, and payment mode breakdowns
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant="outline" className="px-3 py-1.5 bg-card border-border text-xs font-semibold gap-1.5 shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-primary" /> All Historical Data
          </Badge>
        </div>
      </div>

      {/* KPI Cards with Gradient Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="relative overflow-hidden p-5 rounded-2xl border border-border/80 bg-gradient-to-br from-blue-500/10 via-card to-card shadow-sm hover:shadow-md transition-all group">
          <div className="absolute right-0 top-0 -mt-2 -mr-2 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              ₹{totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
              <span className="text-emerald-600 font-semibold flex items-center">
                <ArrowUpRight className="w-3 h-3" /> ₹{todaySales.toLocaleString("en-IN")}
              </span>
              <span>generated today</span>
            </div>
          </div>
        </div>

        {/* Total Orders */}
        <div className="relative overflow-hidden p-5 rounded-2xl border border-border/80 bg-gradient-to-br from-emerald-500/10 via-card to-card shadow-sm hover:shadow-md transition-all group">
          <div className="absolute right-0 top-0 -mt-2 -mr-2 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Total Invoices
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {totalOrders.toLocaleString("en-IN")}
            </p>
            <div className="text-xs text-muted-foreground mt-1.5 font-medium">
              Completed checkout transactions
            </div>
          </div>
        </div>

        {/* Avg Order Value */}
        <div className="relative overflow-hidden p-5 rounded-2xl border border-border/80 bg-gradient-to-br from-purple-500/10 via-card to-card shadow-sm hover:shadow-md transition-all group">
          <div className="absolute right-0 top-0 -mt-2 -mr-2 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
              Avg Basket Value
            </span>
            <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              ₹{avgOrderValue.toFixed(2)}
            </p>
            <div className="text-xs text-muted-foreground mt-1.5 font-medium">
              Average billing per order
            </div>
          </div>
        </div>

        {/* Payment Channels */}
        <div className="relative overflow-hidden p-5 rounded-2xl border border-border/80 bg-gradient-to-br from-amber-500/10 via-card to-card shadow-sm hover:shadow-md transition-all group">
          <div className="absolute right-0 top-0 -mt-2 -mr-2 w-24 h-24 bg-amber-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Payment Channels
            </span>
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {paymentData.length} Modes
            </p>
            <div className="text-xs text-muted-foreground mt-1.5 font-medium">
              UPI, Cash, Card & Credit splits
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-muted-foreground text-sm flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
          Analyzing revenue streams...
        </div>
      ) : sales.length === 0 ? (
        <div className="p-16 text-center text-muted-foreground border-2 border-dashed border-border rounded-3xl bg-card">
          <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30 text-primary" />
          <h3 className="text-base font-bold text-foreground">No Sales Records Found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Complete your first checkout invoice in the POS terminal to populate revenue charts and payment distributions.
          </p>
        </div>
      ) : (
        <>
          {/* Main Visual Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend Area Chart */}
            <div className="p-5 sm:p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm sm:text-base">Revenue Trajectory</h3>
                    <p className="text-xs text-muted-foreground">Monthly gross sales volume (₹)</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs font-semibold">
                  Last 6 Months
                </Badge>
              </div>

              <div className="h-[280px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(160 60% 42%)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="hsl(160 60% 42%)" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + "k" : val}`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "14px",
                        border: "1px solid hsl(var(--border))",
                        backgroundColor: "hsl(var(--card))",
                        color: "hsl(var(--foreground))",
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                      formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, "Revenue"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="hsl(160 60% 42%)"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#revenueGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Orders by Month Bar Chart */}
            <div className="p-5 sm:p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm sm:text-base">Order Volume Trend</h3>
                    <p className="text-xs text-muted-foreground">Monthly invoice checkout count</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs font-semibold">
                  Orders Count
                </Badge>
              </div>

              <div className="h-[280px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "14px",
                        border: "1px solid hsl(var(--border))",
                        backgroundColor: "hsl(var(--card))",
                        color: "hsl(var(--foreground))",
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                      formatter={(val: any) => [`${val} orders`, "Orders"]}
                    />
                    <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Payment Method Breakdown Card */}
          <div className="p-5 sm:p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm sm:text-base">Payment Method Breakdown</h3>
                  <p className="text-xs text-muted-foreground">Revenue distribution by settlement gateway</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                {paymentData.length} Channels Active
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-2">
              {/* Donut Chart */}
              <div className="md:col-span-5 flex justify-center items-center h-[230px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                    >
                      {paymentData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid hsl(var(--border))",
                        backgroundColor: "hsl(var(--card))",
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                      formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, "Total"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Breakdown Bars & Values */}
              <div className="md:col-span-7 space-y-3">
                {paymentData.map((p) => (
                  <div
                    key={p.name}
                    className="p-3.5 rounded-xl bg-background border border-border/80 hover:border-primary/40 transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                        <span className="font-bold text-foreground text-sm uppercase">{p.name}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
                          {p.percentage}% share
                        </Badge>
                      </div>
                      <span className="font-bold text-foreground text-sm">
                        ₹{p.value.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <Progress
                      value={parseFloat(p.percentage)}
                      className="h-1.5 rounded-full bg-muted"
                      style={
                        {
                          "--progress-color": p.color,
                        } as any
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
