import { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  AlertTriangle,
  ArrowUpRight,
  Zap,
  Truck,
  IndianRupee,
  Activity,
  ArrowRight,
  Clock,
  Receipt,
  Sparkles,
  Package,
  Layers,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { ROUTE_PATHS } from "@/config/routes";
import { cn } from "@/lib/utils";

interface LowStockItem {
  id: string;
  name: string;
  stock: number;
  threshold: number;
}

interface TopSellingItem {
  id: string;
  name: string;
  unitsSold: number;
  revenue: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { orgId, org } = useOrganization();
  const { toast } = useToast();
  const LOW_STOCK_THRESHOLD = 20;

  const [totalSales, setTotalSales] = useState(0);
  const [todaySales, setTodaySales] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [avgOrderValue, setAvgOrderValue] = useState(0);
  const [weeklyData, setWeeklyData] = useState<{ day: string; sales: number }[]>([]);
  const [recentSales, setRecentSales] = useState<{ invoice: string; total: number; method: string; date: string }[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [topSellingItems, setTopSellingItems] = useState<TopSellingItem[]>([]);

  useEffect(() => {
    if (!orgId) {
      setTotalSales(0);
      setTodaySales(0);
      setTotalOrders(0);
      setAvgOrderValue(0);
      setWeeklyData([]);
      setRecentSales([]);
      setLowStockItems([]);
      setTopSellingItems([]);
      return;
    }

    fetchSalesStats();
    fetchInventoryInsights();
  }, [orgId]);

  const fetchSalesStats = async () => {
    if (!orgId) return;
    try {
      // Total sales & orders
      const { data: allSales, error: salesError } = await supabase
        .from("sales")
        .select("id, total, created_at, invoice_number, payment_method")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (salesError || !allSales) {
        setTotalSales(0);
        setTodaySales(0);
        setTotalOrders(0);
        setAvgOrderValue(0);
        setWeeklyData([]);
        setRecentSales([]);
        setTopSellingItems([]);
        if (salesError) {
          console.error("fetchSalesStats error:", salesError);
          toast({ title: "Could not load sales", description: "Check your network or try again." });
        }
        return;
      }

      const total = allSales.reduce((s, r) => s + Number(r.total || 0), 0);
      setTotalSales(total);
      setTotalOrders(allSales.length);
      setAvgOrderValue(allSales.length > 0 ? total / allSales.length : 0);

      // Today
      const today = new Date().toISOString().slice(0, 10);
      const todayRows = allSales.filter((r) => (r.created_at || "").slice(0, 10) === today);
      setTodaySales(todayRows.reduce((s, r) => s + Number(r.total || 0), 0));

      // Recent 5
      setRecentSales(
        allSales.slice(0, 5).map((r) => ({
          invoice: r.invoice_number,
          total: Number(r.total || 0),
          method: r.payment_method,
          date: r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN") : "-",
        }))
      );

      // Weekly data (last 7 days)
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const last7: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        last7[key] = 0;
      }
      allSales.forEach((r) => {
        const key = (r.created_at || "").slice(0, 10);
        if (key in last7) last7[key] += Number(r.total || 0);
      });
      setWeeklyData(
        Object.entries(last7).map(([date, sales]) => ({
          day: days[new Date(date).getDay()],
          sales: Math.round(sales),
        }))
      );

      const saleIds = allSales.map((s) => s.id).filter(Boolean);
      if (saleIds.length === 0) {
        setTopSellingItems([]);
        return;
      }

      const { data: saleItems, error: saleItemsError } = await supabase
        .from("sale_items")
        .select("product_id, product_name, quantity, line_total")
        .in("sale_id", saleIds);

      if (saleItemsError || !saleItems || saleItems.length === 0) {
        if (saleItemsError) console.error("fetch sale_items error:", saleItemsError);
        setTopSellingItems([]);
        return;
      }

      const aggregate: Record<string, TopSellingItem> = {};
      saleItems.forEach((item) => {
        const key = item.product_id || `name:${item.product_name}`;
        if (!aggregate[key]) {
          aggregate[key] = {
            id: key,
            name: item.product_name,
            unitsSold: 0,
            revenue: 0,
          };
        }
        aggregate[key].unitsSold += Number(item.quantity || 0);
        aggregate[key].revenue += Number(item.line_total || 0);
      });

      const rankedItems = Object.values(aggregate)
        .sort((a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue)
        .slice(0, 5);

      setTopSellingItems(rankedItems);
    } catch (err) {
      console.error("fetchSalesStats unexpected error:", err);
    }
  };

  const fetchInventoryInsights = async () => {
    if (!orgId) return;
    try {
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, name")
        .eq("organization_id", orgId)
        .order("name");

      if (productsError || !products || products.length === 0) {
        if (productsError) console.error("fetchInventoryInsights products error:", productsError);
        setLowStockItems([]);
        return;
      }

      const productIds = products.map((p) => p.id).filter(Boolean);
      const { data: batches, error: batchesError } = await supabase
        .from("product_batches")
        .select("product_id, stock")
        .in(
          "product_id",
          productIds.length > 0 ? productIds : ["00000000-0000-0000-0000-000000000000"]
        );

      if (batchesError) {
        console.error("fetchInventoryInsights batches error:", batchesError);
        setLowStockItems([]);
        return;
      }

      const stockByProduct: Record<string, number> = {};
      (batches || []).forEach((batch) => {
        stockByProduct[batch.product_id] = (stockByProduct[batch.product_id] || 0) + Number(batch.stock || 0);
      });

      const lowStock = products
        .map((product) => ({
          id: product.id,
          name: product.name,
          stock: stockByProduct[product.id] || 0,
          threshold: LOW_STOCK_THRESHOLD,
        }))
        .filter((product) => product.stock <= LOW_STOCK_THRESHOLD)
        .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name))
        .slice(0, 5);

      setLowStockItems(lowStock);
    } catch (err) {
      console.error("fetchInventoryInsights unexpected error:", err);
      setLowStockItems([]);
    }
  };

  return (
    <div className="page-wrapper space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">
            <Sparkles className="w-6 h-6 text-primary animate-pulse-soft" />
            Executive Dashboard
          </h1>
          <p className="page-subtitle">
            Welcome back{org?.name ? `, ${org.name}` : ""} · Live overview of sales, inventory & operations
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full self-start border border-border/60">
          <Clock className="w-3.5 h-3.5" />
          <span>Updated just now</span>
        </div>
      </div>

      {/* Quick Action Tiles */}
      <div className="card-base p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Quick Business Actions</h2>
          <span className="text-xs text-muted-foreground">One-click shortcuts</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <button
            onClick={() => navigate(ROUTE_PATHS.checkout)}
            className="group relative flex flex-col items-start p-4 rounded-xl border border-blue-200/70 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent hover:from-blue-500/15 hover:border-blue-400 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 text-left overflow-hidden"
          >
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-blue-600">
              <ArrowRight className="w-4 h-4" />
            </div>
            <div className="w-11 h-11 bg-blue-500 text-white rounded-xl flex items-center justify-center mb-3 shadow-md shadow-blue-500/30 group-hover:scale-110 transition-transform duration-200">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              New Sale Invoice
            </span>
            <span className="text-xs text-muted-foreground mt-0.5">Fast POS checkout</span>
          </button>

          <button
            onClick={() => navigate(ROUTE_PATHS.purchases, { state: { openForm: true } })}
            className="group relative flex flex-col items-start p-4 rounded-xl border border-emerald-200/70 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent hover:from-emerald-500/15 hover:border-emerald-400 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 text-left overflow-hidden"
          >
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-emerald-600">
              <ArrowRight className="w-4 h-4" />
            </div>
            <div className="w-11 h-11 bg-emerald-500 text-white rounded-xl flex items-center justify-center mb-3 shadow-md shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-200">
              <Truck className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Purchase Invoice
            </span>
            <span className="text-xs text-muted-foreground mt-0.5">Restock inventory</span>
          </button>

          <button
            onClick={() => navigate(ROUTE_PATHS.items, { state: { openForm: true } })}
            className="group relative flex flex-col items-start p-4 rounded-xl border border-purple-200/70 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent hover:from-purple-500/15 hover:border-purple-400 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 text-left overflow-hidden"
          >
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-purple-600">
              <ArrowRight className="w-4 h-4" />
            </div>
            <div className="w-11 h-11 bg-purple-500 text-white rounded-xl flex items-center justify-center mb-3 shadow-md shadow-purple-500/30 group-hover:scale-110 transition-transform duration-200">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              Add New Product
            </span>
            <span className="text-xs text-muted-foreground mt-0.5">Catalog & barcodes</span>
          </button>

          <button
            onClick={() => navigate(ROUTE_PATHS.customers, { state: { openForm: true } })}
            className="group relative flex flex-col items-start p-4 rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent hover:from-amber-500/15 hover:border-amber-400 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 text-left overflow-hidden"
          >
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-amber-600">
              <ArrowRight className="w-4 h-4" />
            </div>
            <div className="w-11 h-11 bg-amber-500 text-white rounded-xl flex items-center justify-center mb-3 shadow-md shadow-amber-500/30 group-hover:scale-110 transition-transform duration-200">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              Add Customer Party
            </span>
            <span className="text-xs text-muted-foreground mt-0.5">Khata & ledger</span>
          </button>
        </div>
      </div>

      {/* Stats Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Today's Sales */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-card to-card p-5 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Today's Sales
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              ₹{todaySales.toLocaleString("en-IN")}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center text-emerald-600 font-semibold">
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> Live
              </span>
              <span>today's revenue</span>
            </div>
          </div>
        </div>

        {/* Total Sales */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card to-card p-5 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Total Revenue
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              ₹{totalSales.toLocaleString("en-IN")}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center text-emerald-600 font-semibold">
                All-time
              </span>
              <span>gross turnover</span>
            </div>
          </div>
        </div>

        {/* Total Orders */}
        <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-card to-card p-5 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Total Orders
            </span>
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {totalOrders.toLocaleString("en-IN")}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center text-purple-600 font-semibold">
                Invoices
              </span>
              <span>successfully settled</span>
            </div>
          </div>
        </div>

        {/* Avg Order Value */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-card to-card p-5 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Avg. Order Value
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              ₹{avgOrderValue.toFixed(2)}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center text-amber-600 font-semibold">
                Average ticket
              </span>
              <span>per checkout</span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Grid: Recent Transactions & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Transactions Table */}
        <div className="lg:col-span-2 card-base p-0 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Recent Transactions</h2>
                  <p className="text-xs text-muted-foreground">Latest invoices generated across terminals</p>
                </div>
              </div>
              <button
                onClick={() => navigate(ROUTE_PATHS.salesHistory)}
                className="text-xs font-semibold text-primary hover:text-primary/80 hover:underline flex items-center gap-1"
              >
                View Full Ledger <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Invoice No</th>
                    <th>Payment Mode</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.length > 0 ? (
                    recentSales.map((sale, i) => (
                      <tr key={i}>
                        <td className="text-muted-foreground text-xs">{sale.date}</td>
                        <td className="font-mono font-medium text-xs text-foreground">
                          {sale.invoice || "—"}
                        </td>
                        <td>
                          <span className="badge badge-neutral text-[11px]">
                            {sale.method}
                          </span>
                        </td>
                        <td className="text-right font-bold text-foreground">
                          ₹{sale.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-muted-foreground text-sm">
                        <Receipt className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                        No transactions recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="p-3 border-t border-border/60 bg-muted/10 text-right">
            <span className="text-xs text-muted-foreground">
              Showing last {recentSales.length} records
            </span>
          </div>
        </div>

        {/* Right Column: Low Stock Alerts & Top Selling Items */}
        <div className="space-y-6">
          
          {/* Low Stock Alerts */}
          <div className="card-base p-5">
            <div className="flex items-center justify-between pb-3 border-b border-border/80 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-foreground">Low Stock Alerts</h2>
              </div>
              <span className="badge badge-warning text-[10px]">
                Threshold: ≤{LOW_STOCK_THRESHOLD}
              </span>
            </div>

            <div className="space-y-3">
              {lowStockItems.length > 0 ? (
                lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/50 hover:bg-muted/70 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Needs restock</p>
                    </div>
                    <span className="badge badge-danger text-xs whitespace-nowrap shrink-0">
                      {item.stock} left
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <Package className="w-7 h-7 mx-auto mb-1 text-emerald-500/50" />
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Stock levels healthy
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">No critical shortages</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Selling Items */}
          <div className="card-base p-5">
            <div className="flex items-center justify-between pb-3 border-b border-border/80 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-600">
                  <Layers className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-foreground">Top Selling Items</h2>
              </div>
              <span className="text-xs text-muted-foreground">By Volume</span>
            </div>

            <div className="space-y-3">
              {topSellingItems.length > 0 ? (
                topSellingItems.map((item, i) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/50"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.unitsSold} units sold</p>
                      </div>
                    </div>
                    <span className="font-bold text-sm text-foreground whitespace-nowrap">
                      ₹{item.revenue.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <p className="text-xs text-muted-foreground">No sales recorded yet.</p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}



