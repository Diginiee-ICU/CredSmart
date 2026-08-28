import React, { useState, useEffect, useMemo } from "react";
import { usePagination } from "@/hooks/usePagination";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  isWithinInterval,
  parseISO,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Receipt,
  Search,
  Calendar as CalendarIcon,
  ChevronDown,
  ArrowUpDown,
  Settings,
  Keyboard,
  BarChart3,
  FileSpreadsheet,
  Printer,
  Trash2,
  Tag,
  IndianRupee,
  Building,
  CreditCard,
  X,
  FileText,
  Check,
  PieChart,
  HelpCircle,
} from "lucide-react";

import { EXPENSE_CATEGORY_SUGGESTIONS } from "@/utils/suggestionData";

export interface ExpenseRecord {
  id: string;
  expense_number?: string;
  party_name?: string;
  category: string;
  amount: number;
  date: string;
  description?: string;
  payment_method?: string;
  created_at?: string;
}

const DEFAULT_EXPENSE_CATEGORIES = [
  "All Expenses Categories",
  ...EXPENSE_CATEGORY_SUGGESTIONS,
];

const DATE_RANGE_PRESETS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 Days" },
  { id: "last30", label: "Last 30 Days" },
  { id: "thisMonth", label: "This Month" },
  { id: "lastMonth", label: "Last Month" },
  { id: "last365", label: "Last 365 Days" },
  { id: "all", label: "All Time" },
];

export default function Expenses() {
  const { orgId, org } = useOrganization();
  const { toast } = useToast();

  const storageKeyLocalExpenses = `credsmart_expenses_${orgId || "no_org"}`;
  const storageKeyCategories = `credsmart_expense_categories_${orgId || "no_org"}`;

  // Main State
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState("last365");
  const [selectedCategory, setSelectedCategory] = useState("All Expenses Categories");
  const [categoriesList, setCategoriesList] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES);

  // Sorting
  const [sortField, setSortField] = useState<"date" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State for New Expense
  const [expenseNumber, setExpenseNumber] = useState("");
  const [partyName, setPartyName] = useState("");
  const [formCategory, setFormCategory] = useState("Tea & Snacks");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentMethod, setPaymentMethod] = useState("Cash in Hand");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Settings State
  const [newCustomCategory, setNewCustomCategory] = useState("");
  const [expensePrefix, setExpensePrefix] = useState("EXP-");

  // Keyboard Shortcuts Listener (Alt+N, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.key.toLowerCase() === "n") || (e.ctrlKey && e.key.toLowerCase() === "e")) {
        e.preventDefault();
        openCreateModal();
      } else if (e.key === "?" && !e.ctrlKey && !e.altKey) {
        const active = document.activeElement;
        const isInput = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.tagName === "SELECT");
        if (!isInput) {
          e.preventDefault();
          setIsShortcutsModalOpen(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [expenses]);

  // Load Categories & Expenses
  const fetchExpenses = async () => {
    setLoading(true);
    let loadedFromDb = false;

    if (orgId) {
      try {
        const { data, error } = await supabase
          .from("expenses")
          .select("*")
          .eq("organization_id", orgId)
          .order("date", { ascending: false });

        if (!error && data) {
          const mapped: ExpenseRecord[] = data.map((d: any, idx: number) => ({
            id: d.id,
            expense_number: d.expense_number || `EXP-${String(data.length - idx).padStart(3, "0")}`,
            party_name: d.party_name || d.description?.split(" - ")[0] || "Vendor / Store",
            category: d.category || "Miscellaneous",
            amount: Number(d.amount || 0),
            date: d.date ? d.date.slice(0, 10) : format(new Date(), "yyyy-MM-dd"),
            description: d.description || "",
            payment_method: d.payment_method || "Cash",
            created_at: d.created_at,
          }));
          setExpenses(mapped);
          loadedFromDb = true;
        }
      } catch (err) {
        console.warn("Supabase fetch failed, falling back to local persistence:", err);
      }
    }

    if (!loadedFromDb) {
      try {
        const local = localStorage.getItem(storageKeyLocalExpenses);
        if (local) {
          setExpenses(JSON.parse(local));
        } else {
          // Initialize with empty array matching Capture10.PNG initial state
          setExpenses([]);
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Load custom categories if any
    try {
      const storedCats = localStorage.getItem(storageKeyCategories);
      if (storedCats) {
        setCategoriesList(JSON.parse(storedCats));
      }
    } catch {}

    setLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, [orgId]);

  const persistExpensesLocally = (newList: ExpenseRecord[]) => {
    setExpenses(newList);
    localStorage.setItem(storageKeyLocalExpenses, JSON.stringify(newList));
  };

  const openCreateModal = () => {
    const nextSeq = expenses.length + 1;
    setExpenseNumber(`${expensePrefix}${String(nextSeq).padStart(3, "0")}`);
    setPartyName("");
    setFormCategory("Tea & Snacks");
    setAmount("");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setDescription("");
    setPaymentMethod("Cash in Hand");
    setIsCreateModalOpen(true);
  };

  // Add Expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid expense amount.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    const newExpense: ExpenseRecord = {
      id: `exp_${Date.now()}`,
      expense_number: expenseNumber.trim() || `EXP-${Date.now().toString().slice(-4)}`,
      party_name: partyName.trim() || "General Expense Payee",
      category: formCategory,
      amount: numAmount,
      date,
      description: description.trim() || undefined,
      payment_method: paymentMethod,
      created_at: new Date().toISOString(),
    };

    // Save to Supabase if orgId is available
    if (orgId) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          await supabase.from("expenses").insert({
            organization_id: orgId,
            category: formCategory,
            amount: numAmount,
            date,
            description: `${newExpense.party_name} - ${newExpense.description || formCategory}`,
            created_by: userData.user.id,
          });
        }
      } catch (err) {
        console.warn("Could not insert directly to Supabase table, saving locally:", err);
      }
    }

    const updated = [newExpense, ...expenses];
    persistExpensesLocally(updated);

    toast({
      title: "Expense Created",
      description: `Recorded ₹${numAmount.toLocaleString("en-IN")} for ${newExpense.category}.`,
    });

    setSaving(false);
    setIsCreateModalOpen(false);
  };

  // Delete Expense
  const handleDelete = async (id: string) => {
    if (orgId) {
      try {
        await supabase.from("expenses").delete().eq("id", id);
      } catch {}
    }
    const updated = expenses.filter((e) => e.id !== id);
    persistExpensesLocally(updated);
    setDeletingId(null);
    toast({ title: "Expense Deleted" });
  };

  // Filtering & Sorting
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    let startDate = subDays(now, 365);
    let endDate = endOfDay(now);

    if (selectedDatePreset === "today") {
      startDate = startOfDay(now);
      endDate = endOfDay(now);
    } else if (selectedDatePreset === "yesterday") {
      startDate = startOfDay(subDays(now, 1));
      endDate = endOfDay(subDays(now, 1));
    } else if (selectedDatePreset === "last7") {
      startDate = subDays(now, 7);
    } else if (selectedDatePreset === "last30") {
      startDate = subDays(now, 30);
    } else if (selectedDatePreset === "thisMonth") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (selectedDatePreset === "lastMonth") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (selectedDatePreset === "last365") {
      startDate = subDays(now, 365);
    } else if (selectedDatePreset === "all") {
      startDate = new Date(2000, 0, 1);
    }

    return expenses
      .filter((exp) => {
        // Category Filter
        if (selectedCategory !== "All Expenses Categories" && exp.category !== selectedCategory) {
          return false;
        }

        // Date Filter
        try {
          const expDate = parseISO(exp.date);
          const inRange = isWithinInterval(expDate, { start: startDate, end: endDate });
          if (!inRange) return false;
        } catch {
          // Ignore parse errors
        }

        // Search Query Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matches =
            (exp.expense_number && exp.expense_number.toLowerCase().includes(q)) ||
            (exp.party_name && exp.party_name.toLowerCase().includes(q)) ||
            (exp.category && exp.category.toLowerCase().includes(q)) ||
            (exp.description && exp.description.toLowerCase().includes(q));
          if (!matches) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortField === "date") {
          const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
          return sortOrder === "desc" ? diff : -diff;
        } else {
          const diff = Number(b.amount) - Number(a.amount);
          return sortOrder === "desc" ? diff : -diff;
        }
      });
  }, [expenses, selectedDatePreset, selectedCategory, searchQuery, sortField, sortOrder]);

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    paginatedItems: paginatedExpenses,
    totalPages,
    totalItems: totalExpenseCount,
    startIndex,
    endIndex,
    hasNext,
    hasPrev,
  } = usePagination(filteredExpenses, 25);

  const totalFilteredAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [filteredExpenses]);

  // Export
  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      toast({ title: "No data to export", description: "Current filter has no transactions." });
      return;
    }
    const headers = ["Date", "Expense Number", "Party Name", "Category", "Amount (₹)", "Payment Method", "Remarks"];
    const rows = filteredExpenses.map((e) => [
      format(new Date(e.date), "dd/MM/yyyy"),
      e.expense_number || "-",
      e.party_name || "-",
      e.category,
      e.amount,
      e.payment_method || "Cash",
      e.description || "-",
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.map((val) => `"${val}"`).join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Expenses_Report_${format(new Date(), "yyyyMMdd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Expense Report Downloaded" });
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/60 dark:bg-slate-950/40 text-foreground overflow-hidden font-sans p-3 sm:p-4 space-y-3">
      {/* Top Header - Frosted Glass Container */}
      <header className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 px-4 sm:px-5 py-2.5 shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-sans">
            Expenses
          </h1>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span>OUTFLOW TRACKER</span>
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          {/* [Reports v] Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50/60 font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                <span>Reports</span>
                <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => setIsReportModalOpen(true)} className="text-xs">
                <PieChart className="w-4 h-4 mr-2 text-purple-600" />
                <span>Category Breakdown</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV} className="text-xs">
                <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
                <span>Export to CSV / Excel</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.print()} className="text-xs">
                <Printer className="w-4 h-4 mr-2 text-indigo-600" />
                <span>Print Expense Sheet</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* [Settings Cog] button */}
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            title="Expense Settings"
            className="w-9 h-9 border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors shadow-xs cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* [Keyboard Icon] button */}
          <button
            type="button"
            onClick={() => setIsShortcutsModalOpen(true)}
            title="Keyboard Shortcuts"
            className="w-9 h-9 border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors shadow-xs cursor-pointer"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>

          {/* [Create Expense] Primary Glowing Button */}
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl glowing-btn-amber text-white font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Create Expense</span>
          </button>
        </div>
      </header>

      {/* Filter Bar - Frosted Glass Container */}
      <div className="px-4 py-2.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center gap-2.5 shrink-0 shadow-xs">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search expenses by party, category..."
            className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Date Filter Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-foreground text-xs font-semibold rounded-xl flex items-center justify-between gap-2 hover:bg-slate-50 shadow-xs"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {DATE_RANGE_PRESETS.find((d) => d.id === selectedDatePreset)?.label || "Last 365 Days"}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {DATE_RANGE_PRESETS.map((p) => (
              <DropdownMenuItem
                key={p.id}
                onClick={() => setSelectedDatePreset(p.id)}
                className={cn(
                  "text-xs flex items-center justify-between",
                  selectedDatePreset === p.id ? "font-bold text-amber-600" : ""
                )}
              >
                <span>{p.label}</span>
                {selectedDatePreset === p.id && <Check className="w-3.5 h-3.5 text-amber-600" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Category Dropdown */}
        <div className="w-full md:w-56">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full h-9 px-3 bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
          >
            {categoriesList.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Summary Info */}
        {filteredExpenses.length > 0 && (
          <div className="ml-auto text-xs font-semibold text-slate-600 dark:text-slate-300">
            Total Outflow: <span className="font-black text-rose-600 dark:text-rose-400 font-mono text-sm">₹{totalFilteredAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
        )}
      </div>

      {/* Main Table & Empty State Area - 3D Glass Container */}
      <div className="flex-1 min-h-0 flex flex-col glass-card-3d overflow-hidden rounded-2xl">
        {/* DESKTOP Table Header Bar (Visible on md: and above) */}
        <div className="hidden md:grid bg-slate-100/80 dark:bg-muted/60 border-b border-slate-200 dark:border-border grid-cols-12 text-xs font-semibold text-slate-600 dark:text-slate-300 px-4 sm:px-6 py-2.5 shrink-0">
          <div
            onClick={() => {
              setSortField("date");
              setSortOrder(sortOrder === "desc" ? "asc" : "desc");
            }}
            className="col-span-2 flex items-center gap-1 cursor-pointer select-none hover:text-slate-900"
          >
            <span>Date</span>
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="col-span-3">Expense Number</div>
          <div className="col-span-3">Party Name</div>
          <div className="col-span-2">Category</div>
          <div
            onClick={() => {
              setSortField("amount");
              setSortOrder(sortOrder === "desc" ? "asc" : "desc");
            }}
            className="col-span-2 flex items-center justify-end gap-1 cursor-pointer select-none hover:text-slate-900 text-right pr-4"
          >
            <span>Amount</span>
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        {/* Content Body: Empty State vs Rows */}
        <div className="flex-1 flex flex-col justify-start overflow-y-auto pb-28 md:pb-0">
          {loading ? (
            <div className="py-20 text-center text-xs text-slate-400 my-auto">
              <div className="w-7 h-7 border-2 border-[#5046E5] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading expenses...
            </div>
          ) : filteredExpenses.length === 0 ? (
            // Empty State
            <div className="py-24 flex flex-col items-center justify-center text-center max-w-md px-4 mx-auto my-auto">
              <div className="w-20 h-20 mb-4 rounded-2xl bg-slate-50 dark:bg-muted/40 border border-slate-200 dark:border-border flex items-center justify-center text-slate-400 relative">
                <div className="relative">
                  <FileText className="w-10 h-10 stroke-[1.3] text-slate-400" />
                  <div className="absolute -bottom-1 -right-1 bg-white dark:bg-card rounded-full p-0.5 border border-slate-300">
                    <X className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </div>
              </div>

              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                No Transactions Matching the current filter
              </h3>

              <div className="mt-6">
                <Button
                  onClick={openCreateModal}
                  className="bg-[#5046E5] hover:bg-[#4338CA] text-white text-xs h-8 px-4 rounded-lg font-medium"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add New Expense
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* MOBILE VIEW: Touch Expense Cards (Visible on screens < md) */}
              <div className="block md:hidden p-2.5 space-y-2.5">
                {paginatedExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-border bg-card space-y-2.5 shadow-2xs active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-muted px-2 py-0.5 rounded border border-slate-200 dark:border-border text-foreground">
                            {exp.expense_number || "EXP"}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-muted text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-border">
                            <Tag className="w-2.5 h-2.5 text-slate-400" />
                            {exp.category}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-foreground mt-1">{exp.party_name || "General Payee"}</h4>
                        {exp.description && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{exp.description}</p>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-base font-black font-mono text-rose-600 dark:text-rose-400">
                          ₹{Number(exp.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          {format(new Date(exp.date), "dd MMM yyyy")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-border/60">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        Method: {exp.payment_method || "Cash"}
                      </span>

                      <div>
                        {deletingId === exp.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDelete(exp.id)}
                              className="text-xs text-rose-600 font-bold hover:underline"
                            >
                              Confirm Delete
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="text-xs text-slate-400 hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeletingId(exp.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Mobile Pagination */}
                <PaginationBar
                  page={page}
                  totalPages={totalPages}
                  totalItems={totalExpenseCount}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  hasNext={hasNext}
                  hasPrev={hasPrev}
                  onPageChange={setPage}
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                />
              </div>

              {/* DESKTOP VIEW: Active Table Rows (Visible on md: and above) */}
              <div className="hidden md:flex flex-col justify-between w-full h-full">
                <div className="w-full divide-y divide-slate-100 dark:divide-border/60">
                  {paginatedExpenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="grid grid-cols-12 items-center text-xs px-6 py-3.5 hover:bg-slate-50/70 dark:hover:bg-muted/30 transition-colors"
                    >
                      <div className="col-span-2 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                        {format(new Date(exp.date), "dd MMM yyyy")}
                      </div>

                      <div className="col-span-3 font-mono font-semibold text-slate-900 dark:text-foreground truncate">
                        {exp.expense_number || "—"}
                      </div>

                      <div className="col-span-3 text-slate-800 dark:text-slate-200 font-medium truncate">
                        <p className="truncate">{exp.party_name || "—"}</p>
                        {exp.description && (
                          <p className="text-[10px] text-slate-400 truncate">{exp.description}</p>
                        )}
                      </div>

                      <div className="col-span-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-muted text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-border">
                          <Tag className="w-2.5 h-2.5 text-slate-400" />
                          {exp.category}
                        </span>
                      </div>

                      <div className="col-span-2 flex items-center justify-end gap-3 text-right pr-2">
                        <span className="font-bold text-rose-600 dark:text-rose-400 text-xs whitespace-nowrap">
                          ₹{Number(exp.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>

                        {deletingId === exp.id ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleDelete(exp.id)}
                              className="text-[10px] text-rose-600 font-bold hover:underline"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="text-[10px] text-slate-400 hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeletingId(exp.id)}
                            className="p-1 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Pagination */}
                <PaginationBar
                  page={page}
                  totalPages={totalPages}
                  totalItems={totalExpenseCount}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  hasNext={hasNext}
                  hasPrev={hasPrev}
                  onPageChange={setPage}
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL 1: Create Expense Dialog */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-xl sm:max-w-2xl bg-white dark:bg-card border border-border p-6 rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto">
          <DialogHeader className="border-b border-border/70 pb-3">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#5046E5]" />
              <span>Create Store Expense</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddExpense} className="space-y-3.5 mt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Expense Number *
                </Label>
                <Input
                  type="text"
                  required
                  value={expenseNumber}
                  onChange={(e) => setExpenseNumber(e.target.value)}
                  className="mt-1 h-9 text-xs font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Date *
                </Label>
                <Input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Party / Vendor Name *
              </Label>
              <Input
                type="text"
                required
                placeholder="e.g. Sharma Stationery / Electric Board"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Category *
                </Label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full h-9 px-3 mt-1 bg-white dark:bg-card border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
                >
                  {categoriesList
                    .filter((c) => c !== "All Expenses Categories")
                    .map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Amount (₹) *
                </Label>
                <div className="relative mt-1">
                  <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8 h-9 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Payment Mode
              </Label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-9 px-3 mt-1 bg-white dark:bg-card border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
              >
                <option value="Cash in Hand">Cash in Hand</option>
                <option value="Bank Account Transfer">Bank Account Transfer</option>
                <option value="UPI / QR">UPI / QR</option>
                <option value="Cheque">Cheque</option>
                <option value="Credit Card">Credit Card</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Remarks / Description (Optional)
              </Label>
              <Input
                type="text"
                placeholder="e.g. Daily office tea, snacks & biscuits for clients"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="text-xs h-9 bg-[#5046E5] hover:bg-[#4338CA] text-white font-semibold"
              >
                {saving ? "Saving..." : "Save Expense"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Settings Dialog */}
      <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
        <DialogContent className="max-w-lg sm:max-w-xl bg-white dark:bg-card border border-border p-6 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-border/70 pb-3">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#5046E5]" />
              <span>Expense Settings & Categories</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-3 text-xs">
            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Expense Number Prefix
              </Label>
              <Input
                type="text"
                value={expensePrefix}
                onChange={(e) => setExpensePrefix(e.target.value)}
                placeholder="EXP-"
                className="mt-1 h-9 text-xs font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Add Custom Category
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="text"
                  placeholder="e.g. Staff Uniforms"
                  value={newCustomCategory}
                  onChange={(e) => setNewCustomCategory(e.target.value)}
                  className="h-9 text-xs flex-1"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (newCustomCategory.trim() && !categoriesList.includes(newCustomCategory.trim())) {
                      const updated = [...categoriesList, newCustomCategory.trim()];
                      setCategoriesList(updated);
                      localStorage.setItem(storageKeyCategories, JSON.stringify(updated));
                      setNewCustomCategory("");
                      toast({ title: "Category Added" });
                    }
                  }}
                  className="h-9 px-3 text-xs bg-[#5046E5] text-white"
                >
                  Add
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Current Categories ({categoriesList.length - 1})
              </Label>
              <div className="flex flex-wrap gap-1.5 mt-2 max-h-36 overflow-y-auto pr-1">
                {categoriesList
                  .filter((c) => c !== "All Expenses Categories")
                  .map((cat) => (
                    <span
                      key={cat}
                      className="px-2 py-1 bg-slate-100 dark:bg-muted rounded text-[11px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1"
                    >
                      <span>{cat}</span>
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Keyboard Shortcuts Dialog */}
      <Dialog open={isShortcutsModalOpen} onOpenChange={setIsShortcutsModalOpen}>
        <DialogContent className="max-w-md sm:max-w-lg bg-white dark:bg-card border border-border p-6 rounded-2xl shadow-xl">
          <DialogHeader className="border-b border-border/70 pb-3">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-[#5046E5]" />
              <span>Keyboard Shortcuts</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2.5 mt-3 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-muted/50">
              <span className="text-slate-700 dark:text-slate-300">Create New Expense</span>
              <kbd className="px-2 py-1 rounded bg-white dark:bg-card border border-slate-200 dark:border-border font-mono font-bold text-[11px]">
                Alt + N
              </kbd>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-muted/50">
              <span className="text-slate-700 dark:text-slate-300">Open Reports</span>
              <kbd className="px-2 py-1 rounded bg-white dark:bg-card border border-slate-200 dark:border-border font-mono font-bold text-[11px]">
                F8
              </kbd>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-muted/50">
              <span className="text-slate-700 dark:text-slate-300">Show Shortcuts Help</span>
              <kbd className="px-2 py-1 rounded bg-white dark:bg-card border border-slate-200 dark:border-border font-mono font-bold text-[11px]">
                ?
              </kbd>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: Category Breakdown Report */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="max-w-lg sm:max-w-xl bg-white dark:bg-card border border-border p-6 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-border/70 pb-3">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#5046E5]" />
              <span>Expense Category Summary</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-3 text-xs max-h-80 overflow-y-auto pr-1">
            {categoriesList
              .filter((c) => c !== "All Expenses Categories")
              .map((cat) => {
                const total = expenses
                  .filter((e) => e.category === cat)
                  .reduce((sum, e) => sum + Number(e.amount || 0), 0);
                if (total === 0) return null;
                const pct = totalFilteredAmount > 0 ? (total / totalFilteredAmount) * 100 : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between font-semibold">
                      <span>{cat}</span>
                      <span>₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#5046E5] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>

          <DialogFooter className="pt-3 border-t border-border">
            <Button onClick={handleExportCSV} className="bg-[#5046E5] text-white text-xs h-9">
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Export Full Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
