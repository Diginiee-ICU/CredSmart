import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Receipt,
  Trash2,
  Calendar,
  IndianRupee,
  Search,
  Filter,
  Layers,
  PieChart,
  Tag,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  description: string;
}

const EXPENSE_CATEGORIES = [
  "Rent",
  "Electricity/Utilities",
  "Tea & Snacks",
  "Office Supplies",
  "Transport/Delivery",
  "Salaries",
  "Maintenance",
  "Miscellaneous",
];

const categoryColors: Record<string, string> = {
  Rent: "badge-purple",
  "Electricity/Utilities": "badge-info",
  "Tea & Snacks": "badge-warning",
  "Office Supplies": "badge-info",
  "Transport/Delivery": "badge-neutral",
  Salaries: "badge-success",
  Maintenance: "badge-warning",
  Miscellaneous: "badge-neutral",
};

export default function Expenses() {
  const { orgId } = useOrganization();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Form State
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchExpenses = async () => {
    if (!orgId) return;
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("organization_id", orgId)
        .order("date", { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error fetching expenses",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [orgId]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    setSaving(true);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { error } = await supabase.from("expenses").insert({
        organization_id: orgId,
        category,
        amount: Number(amount),
        date,
        description,
        created_by: userData.user.id,
      });

      if (error) throw error;
      
      toast({ title: "Expense Added", description: `Recorded ₹${amount} for ${category}` });
      setShowModal(false);
      setAmount("");
      setDescription("");
      fetchExpenses();
    } catch (err: any) {
      toast({ title: "Failed to add expense", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
      setDeletingId(null);
      fetchExpenses();
      toast({ title: "Expense deleted" });
    } catch (err: any) {
      toast({ title: "Error deleting", description: err.message, variant: "destructive" });
    }
  };

  const [dateFilter, setDateFilter] = useState<"all" | "thisMonth" | "today">("all");

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [expenses]);

  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const thisMonthStr = useMemo(() => format(new Date(), "yyyy-MM"), []);

  const todayExpenses = useMemo(() => {
    return expenses
      .filter((e) => (e.date || "").slice(0, 10) === todayStr)
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [expenses, todayStr]);

  const thisMonthExpenses = useMemo(() => {
    return expenses
      .filter((e) => (e.date || "").slice(0, 7) === thisMonthStr)
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [expenses, thisMonthStr]);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + Number(e.amount || 0);
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return {
      topCategory: sorted[0] ? sorted[0][0] : "None",
      topAmount: sorted[0] ? sorted[0][1] : 0,
    };
  }, [expenses]);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch =
        !search ||
        (e.description && e.description.toLowerCase().includes(search.toLowerCase())) ||
        e.category.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || e.category === selectedCategory;

      let matchesDate = true;
      if (dateFilter === "today") {
        matchesDate = (e.date || "").slice(0, 10) === todayStr;
      } else if (dateFilter === "thisMonth") {
        matchesDate = (e.date || "").slice(0, 7) === thisMonthStr;
      }

      return matchesSearch && matchesCategory && matchesDate;
    });
  }, [expenses, search, selectedCategory, dateFilter, todayStr, thisMonthStr]);

  return (
    <div className="page-wrapper space-y-6">
      
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Receipt className="w-6 h-6 text-primary" />
            Daily Store Expenses
          </h1>
          <p className="page-subtitle">
            Track daily operational expenditures, utilities, tea, supplies & overheads
          </p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Add Expense
        </Button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Expenses */}
        <div className="card-base p-5 flex flex-col justify-between border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-card to-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Today's Expenses
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground">
              ₹{todayExpenses.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Disbursed today ({format(new Date(), "dd MMM")})</p>
          </div>
        </div>

        {/* This Month's Expenses */}
        <div className="card-base p-5 flex flex-col justify-between border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-card to-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              This Month
            </span>
            <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground">
              ₹{thisMonthExpenses.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{format(new Date(), "MMMM yyyy")} expenses</p>
          </div>
        </div>

        {/* Total Expenses (All Time) */}
        <div className="card-base p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Total Expenses
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground">
              ₹{totalExpenses.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{expenses.length} total entries recorded</p>
          </div>
        </div>

        {/* Top Expense Category */}
        <div className="card-base p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Top Category
            </span>
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-bold text-foreground truncate">
              {categoryBreakdown.topCategory}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ₹{categoryBreakdown.topAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} total
            </p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card-base p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expenses by category or note description..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          />
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border/50 shrink-0">
          {([
            { id: "all", label: "All" },
            { id: "thisMonth", label: "This Month" },
            { id: "today", label: "Today" },
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

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 w-full sm:w-auto"
          >
            <option value="all">All Categories</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Log Table */}
      <div className="card-base p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading expenses log...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            <Receipt className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="font-semibold text-foreground">No expenses recorded</p>
            <p className="text-xs text-muted-foreground mt-1">
              {expenses.length === 0
                ? "Click 'Add Expense' above to log operational costs like tea, rent, and supplies."
                : "No expenses match your current filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((expense) => (
                  <tr key={expense.id}>
                    <td className="font-medium text-foreground text-xs whitespace-nowrap">
                      {format(new Date(expense.date), "dd MMM yyyy")}
                    </td>
                    <td>
                      <span
                        className={cn(
                          "badge text-xs font-semibold",
                          categoryColors[expense.category] || "badge-neutral"
                        )}
                      >
                        <Tag className="w-3 h-3" />
                        {expense.category}
                      </span>
                    </td>
                    <td className="text-muted-foreground text-sm">
                      {expense.description || "—"}
                    </td>
                    <td className="text-right font-bold text-rose-600 dark:text-rose-400 text-sm whitespace-nowrap">
                      ₹{Number(expense.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-right">
                      {deletingId === expense.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="text-xs text-rose-600 font-bold hover:underline"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="text-xs text-muted-foreground hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(expense.id)}
                          className="p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border overflow-hidden animate-scale-in">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Receipt className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-foreground">Add Daily Expense</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Amount (₹) *
                </Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-9 h-10 rounded-xl"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Expense Category *
                </Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-3 bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Date of Expense *
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="pl-9 h-10 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Description / Remarks (Optional)
                </Label>
                <Input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-10 rounded-xl"
                  placeholder="e.g. Daily milk, tea & biscuits for customers"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="flex-1 h-10 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !amount}
                  className="flex-1 h-10 rounded-xl"
                >
                  {saving ? "Saving..." : "Save Expense"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

