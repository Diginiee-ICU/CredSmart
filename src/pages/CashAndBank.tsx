import React, { useState, useEffect, useMemo } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, startOfDay, endOfDay, isWithinInterval, parseISO } from "date-fns";
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
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  ArrowLeftRight,
  Landmark,
  Building2,
  Calendar as CalendarIcon,
  Download,
  Shield,
  Search,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  Trash2,
  FileSpreadsheet,
  FileText,
  CreditCard,
  X,
  IndianRupee,
} from "lucide-react";

export interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountType: "savings" | "current" | "overdraft";
  balance: number;
  upiId?: string;
  isPrimary?: boolean;
  createdAt: string;
}

export interface BankTransaction {
  id: string;
  date: string;
  type: "money_in" | "money_out" | "transfer";
  accountId: string; // "cash" | bank account id | "unlinked"
  targetAccountId?: string; // For transfers
  amount: number;
  paymentMode: "cash" | "upi" | "cheque" | "neft_rtgs" | "card" | "net_banking";
  referenceNo?: string;
  partyName?: string;
  category: string;
  notes?: string;
  createdAt: string;
}

const DEFAULT_BANKS_LIST = [
  "State Bank of India (SBI)",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Punjab National Bank (PNB)",
  "Bank of Baroda",
  "Canara Bank",
  "Union Bank of India",
  "IndusInd Bank",
  "IDFC FIRST Bank",
  "Federal Bank",
];

const DATE_FILTER_OPTIONS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 Days" },
  { id: "last30", label: "Last 30 Days" },
  { id: "thisMonth", label: "This Month" },
  { id: "lastMonth", label: "Last Month" },
  { id: "last365", label: "Last 365 Days" },
  { id: "all", label: "All Time" },
];

export default function CashAndBank() {
  const { orgId, org } = useOrganization();
  const { toast } = useToast();

  const storageKeyAccounts = `credsmart_bank_accounts_${orgId || "default"}`;
  const storageKeyTransactions = `credsmart_bank_txns_${orgId || "default"}`;
  const storageKeyCash = `credsmart_cash_in_hand_${orgId || "default"}`;
  const storageKeyUnlinked = `credsmart_unlinked_balance_${orgId || "default"}`;

  // State
  const [cashInHand, setCashInHand] = useState<number>(0);
  const [unlinkedBalance, setUnlinkedBalance] = useState<number>(0);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("unlinked"); // "all" | "cash" | "unlinked" | bankId
  const [dateFilter, setDateFilter] = useState<string>("last30");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [isAddMoneyModalOpen, setIsAddMoneyModalOpen] = useState(false);
  const [moneyActionType, setMoneyActionType] = useState<"add" | "reduce">("add");
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);

  // Add/Reduce Money Form
  const [moneyAmount, setMoneyAmount] = useState<string>("");
  const [moneyAccount, setMoneyAccount] = useState<string>("cash");
  const [moneyMode, setMoneyMode] = useState<BankTransaction["paymentMode"]>("cash");
  const [moneyParty, setMoneyParty] = useState<string>("");
  const [moneyCategory, setMoneyCategory] = useState<string>("Direct Cash");
  const [moneyRef, setMoneyRef] = useState<string>("");
  const [moneyNotes, setMoneyNotes] = useState<string>("");
  const [moneyDate, setMoneyDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  // Transfer Money Form
  const [transferFromAccount, setTransferFromAccount] = useState<string>("cash");
  const [transferToAccount, setTransferToAccount] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("");
  const [transferDate, setTransferDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [transferMode, setTransferMode] = useState<BankTransaction["paymentMode"]>("neft_rtgs");
  const [transferRef, setTransferRef] = useState<string>("");
  const [transferNotes, setTransferNotes] = useState<string>("");

  // Add Bank Form
  const [bankName, setBankName] = useState<string>("");
  const [accountHolderName, setAccountHolderName] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [ifscCode, setIfscCode] = useState<string>("");
  const [accountType, setAccountType] = useState<BankAccount["accountType"]>("current");
  const [openingBalance, setOpeningBalance] = useState<string>("0");
  const [upiId, setUpiId] = useState<string>("");

  // Load Initial Data
  useEffect(() => {
    try {
      const storedCash = localStorage.getItem(storageKeyCash);
      if (storedCash !== null) setCashInHand(parseFloat(storedCash) || 0);

      const storedUnlinked = localStorage.getItem(storageKeyUnlinked);
      if (storedUnlinked !== null) setUnlinkedBalance(parseFloat(storedUnlinked) || 0);

      const storedAccounts = localStorage.getItem(storageKeyAccounts);
      if (storedAccounts) {
        setBankAccounts(JSON.parse(storedAccounts));
      }

      const storedTxns = localStorage.getItem(storageKeyTransactions);
      if (storedTxns) {
        setTransactions(JSON.parse(storedTxns));
      }
    } catch (e) {
      console.error("Failed to load local banking data", e);
    }
  }, [storageKeyAccounts, storageKeyTransactions, storageKeyCash, storageKeyUnlinked]);

  // Save changes
  const persistAccounts = (accounts: BankAccount[]) => {
    setBankAccounts(accounts);
    localStorage.setItem(storageKeyAccounts, JSON.stringify(accounts));
  };

  const persistTransactions = (txns: BankTransaction[]) => {
    setTransactions(txns);
    localStorage.setItem(storageKeyTransactions, JSON.stringify(txns));
  };

  const persistCashInHand = (amt: number) => {
    setCashInHand(amt);
    localStorage.setItem(storageKeyCash, amt.toString());
  };

  const persistUnlinked = (amt: number) => {
    setUnlinkedBalance(amt);
    localStorage.setItem(storageKeyUnlinked, amt.toString());
  };

  // Calculations
  const bankAccountsTotal = useMemo(() => {
    return bankAccounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
  }, [bankAccounts]);

  const totalBalance = useMemo(() => {
    return cashInHand + bankAccountsTotal + unlinkedBalance;
  }, [cashInHand, bankAccountsTotal, unlinkedBalance]);

  // Date Filtering
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    let startDate = subDays(now, 30);
    let endDate = endOfDay(now);

    if (dateFilter === "today") {
      startDate = startOfDay(now);
      endDate = endOfDay(now);
    } else if (dateFilter === "yesterday") {
      startDate = startOfDay(subDays(now, 1));
      endDate = endOfDay(subDays(now, 1));
    } else if (dateFilter === "last7") {
      startDate = subDays(now, 7);
    } else if (dateFilter === "last30") {
      startDate = subDays(now, 30);
    } else if (dateFilter === "thisMonth") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (dateFilter === "lastMonth") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (dateFilter === "last365") {
      startDate = subDays(now, 365);
    } else if (dateFilter === "all") {
      startDate = new Date(2000, 0, 1);
    }

    return transactions
      .filter((t) => {
        // Filter by selected account
        if (selectedAccountId !== "all") {
          if (t.type === "transfer") {
            const matchesTransfer =
              t.accountId === selectedAccountId || t.targetAccountId === selectedAccountId;
            if (!matchesTransfer) return false;
          } else if (t.accountId !== selectedAccountId) {
            return false;
          }
        }

        // Filter by Date
        try {
          const tDate = parseISO(t.date);
          const inRange = isWithinInterval(tDate, { start: startDate, end: endDate });
          if (!inRange) return false;
        } catch {
          // Ignore invalid dates
        }

        // Filter by Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matches =
            (t.partyName && t.partyName.toLowerCase().includes(q)) ||
            (t.category && t.category.toLowerCase().includes(q)) ||
            (t.notes && t.notes.toLowerCase().includes(q)) ||
            (t.referenceNo && t.referenceNo.toLowerCase().includes(q));
          if (!matches) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedAccountId, dateFilter, searchQuery]);

  // Add / Reduce Money Action
  const handleAddReduceMoney = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(moneyAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid positive amount.",
        variant: "destructive",
      });
      return;
    }

    const type = moneyActionType === "add" ? "money_in" : "money_out";

    // Update the corresponding account balance
    if (moneyAccount === "cash") {
      const newBalance = moneyActionType === "add" ? cashInHand + numAmount : cashInHand - numAmount;
      persistCashInHand(Math.max(0, newBalance));
    } else if (moneyAccount === "unlinked") {
      const newBalance =
        moneyActionType === "add" ? unlinkedBalance + numAmount : unlinkedBalance - numAmount;
      persistUnlinked(Math.max(0, newBalance));
    } else {
      const updatedAccounts = bankAccounts.map((acc) => {
        if (acc.id === moneyAccount) {
          const newBal = moneyActionType === "add" ? acc.balance + numAmount : acc.balance - numAmount;
          return { ...acc, balance: newBal };
        }
        return acc;
      });
      persistAccounts(updatedAccounts);
    }

    // Record Transaction
    const newTxn: BankTransaction = {
      id: `txn_${Date.now()}`,
      date: moneyDate || format(new Date(), "yyyy-MM-dd"),
      type,
      accountId: moneyAccount,
      amount: numAmount,
      paymentMode: moneyMode,
      partyName: moneyParty.trim() || undefined,
      category: moneyCategory,
      referenceNo: moneyRef.trim() || undefined,
      notes: moneyNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    persistTransactions([newTxn, ...transactions]);

    toast({
      title: moneyActionType === "add" ? "Money Added Successfully" : "Money Reduced Successfully",
      description: `₹${numAmount.toLocaleString("en-IN")} recorded for ${
        moneyAccount === "cash"
          ? "Cash in Hand"
          : moneyAccount === "unlinked"
          ? "Unlinked Transactions"
          : bankAccounts.find((b) => b.id === moneyAccount)?.bankName || "Bank Account"
      }.`,
    });

    setIsAddMoneyModalOpen(false);
    setMoneyAmount("");
    setMoneyParty("");
    setMoneyRef("");
    setMoneyNotes("");
  };

  // Transfer Money Action
  const handleTransferMoney = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(transferAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid positive transfer amount.",
        variant: "destructive",
      });
      return;
    }

    if (!transferToAccount || transferFromAccount === transferToAccount) {
      toast({
        title: "Select Different Accounts",
        description: "Source and Destination accounts must be different.",
        variant: "destructive",
      });
      return;
    }

    // Deduct from Source
    if (transferFromAccount === "cash") {
      persistCashInHand(Math.max(0, cashInHand - numAmount));
    } else if (transferFromAccount === "unlinked") {
      persistUnlinked(Math.max(0, unlinkedBalance - numAmount));
    } else {
      setBankAccounts((prev) =>
        prev.map((acc) =>
          acc.id === transferFromAccount ? { ...acc, balance: acc.balance - numAmount } : acc
        )
      );
    }

    // Add to Destination
    if (transferToAccount === "cash") {
      persistCashInHand(cashInHand + numAmount);
    } else if (transferToAccount === "unlinked") {
      persistUnlinked(unlinkedBalance + numAmount);
    } else {
      setBankAccounts((prev) => {
        const updated = prev.map((acc) =>
          acc.id === transferToAccount ? { ...acc, balance: acc.balance + numAmount } : acc
        );
        localStorage.setItem(storageKeyAccounts, JSON.stringify(updated));
        return updated;
      });
    }

    const newTxn: BankTransaction = {
      id: `txn_${Date.now()}`,
      date: transferDate || format(new Date(), "yyyy-MM-dd"),
      type: "transfer",
      accountId: transferFromAccount,
      targetAccountId: transferToAccount,
      amount: numAmount,
      paymentMode: transferMode,
      referenceNo: transferRef.trim() || undefined,
      category: "Internal Account Transfer",
      notes: transferNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    persistTransactions([newTxn, ...transactions]);

    toast({
      title: "Transfer Completed",
      description: `Transferred ₹${numAmount.toLocaleString("en-IN")} successfully.`,
    });

    setIsTransferModalOpen(false);
    setTransferAmount("");
    setTransferRef("");
    setTransferNotes("");
  };

  // Add Bank Account Action
  const handleAddBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim() || !accountNumber.trim()) {
      toast({
        title: "Missing Required Fields",
        description: "Please enter both Bank Name and Account Number.",
        variant: "destructive",
      });
      return;
    }

    const numOpeningBal = parseFloat(openingBalance) || 0;

    const newAccount: BankAccount = {
      id: `bank_${Date.now()}`,
      name: accountHolderName.trim() || org?.name || "Business Account",
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.trim().toUpperCase(),
      accountType,
      balance: numOpeningBal,
      upiId: upiId.trim() || undefined,
      isPrimary: bankAccounts.length === 0,
      createdAt: new Date().toISOString(),
    };

    const updatedAccounts = [...bankAccounts, newAccount];
    persistAccounts(updatedAccounts);

    // If opening balance > 0, create an opening balance transaction
    if (numOpeningBal > 0) {
      const openingTxn: BankTransaction = {
        id: `txn_open_${Date.now()}`,
        date: format(new Date(), "yyyy-MM-dd"),
        type: "money_in",
        accountId: newAccount.id,
        amount: numOpeningBal,
        paymentMode: "neft_rtgs",
        category: "Opening Balance",
        notes: "Account Initial Opening Balance",
        createdAt: new Date().toISOString(),
      };
      persistTransactions([openingTxn, ...transactions]);
    }

    toast({
      title: "Bank Account Added",
      description: `${newAccount.bankName} (${newAccount.accountNumber.slice(-4)}) added successfully.`,
    });

    setIsAddBankModalOpen(false);
    setBankName("");
    setAccountHolderName("");
    setAccountNumber("");
    setIfscCode("");
    setOpeningBalance("0");
    setUpiId("");
  };

  // Delete Transaction
  const handleDeleteTransaction = (id: string) => {
    const txn = transactions.find((t) => t.id === id);
    if (!txn) return;

    // Rollback balance adjustments
    if (txn.type === "money_in") {
      if (txn.accountId === "cash") persistCashInHand(Math.max(0, cashInHand - txn.amount));
      else if (txn.accountId === "unlinked") persistUnlinked(Math.max(0, unlinkedBalance - txn.amount));
      else {
        persistAccounts(
          bankAccounts.map((a) => (a.id === txn.accountId ? { ...a, balance: a.balance - txn.amount } : a))
        );
      }
    } else if (txn.type === "money_out") {
      if (txn.accountId === "cash") persistCashInHand(cashInHand + txn.amount);
      else if (txn.accountId === "unlinked") persistUnlinked(unlinkedBalance + txn.amount);
      else {
        persistAccounts(
          bankAccounts.map((a) => (a.id === txn.accountId ? { ...a, balance: a.balance + txn.amount } : a))
        );
      }
    }

    persistTransactions(transactions.filter((t) => t.id !== id));
    toast({ title: "Transaction Deleted" });
  };

  // Export Statement (CSV)
  const handleExportStatement = (exportFormat: "csv" | "print") => {
    if (filteredTransactions.length === 0) {
      toast({ title: "No Transactions to Export", description: "Filter range contains no entries." });
      return;
    }

    if (exportFormat === "csv") {
      const headers = ["Date", "Type", "Account", "Party / Category", "Mode", "Reference", "Amount (₹)", "Notes"];
      const rows = filteredTransactions.map((t) => [
        format(new Date(t.date), "dd/MM/yyyy"),
        t.type.toUpperCase().replace("_", " "),
        t.accountId === "cash"
          ? "Cash in hand"
          : t.accountId === "unlinked"
          ? "Unlinked Transactions"
          : bankAccounts.find((b) => b.id === t.accountId)?.bankName || "Bank",
        t.partyName || t.category || "-",
        t.paymentMode.toUpperCase(),
        t.referenceNo || "-",
        t.type === "money_out" ? `-${t.amount}` : `+${t.amount}`,
        t.notes || "-",
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Cash_Bank_Statement_${format(new Date(), "yyyyMMdd")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Statement Downloaded", description: "CSV file saved successfully." });
    } else {
      window.print();
    }
  };

  // Get Account Name Helper
  const getAccountLabel = (id: string) => {
    if (id === "cash") return "Cash in hand";
    if (id === "unlinked") return "Unlinked Transactions";
    const found = bankAccounts.find((b) => b.id === id);
    return found ? `${found.bankName} (••${found.accountNumber.slice(-4)})` : "Bank Account";
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F8FAFC] dark:bg-background text-foreground flex flex-col font-sans">
      {/* Top Header matching Capture7.PNG */}
      <header className="bg-white dark:bg-card border-b border-border/80 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-foreground tracking-tight">
            Cash and Bank
          </h1>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setMoneyActionType("add");
              setIsAddMoneyModalOpen(true);
            }}
            className="h-9 px-3.5 bg-white dark:bg-card border-slate-300 dark:border-border text-slate-700 dark:text-foreground hover:bg-slate-50 font-medium text-xs sm:text-sm rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 mr-1.5 text-slate-500" />
            Add/Reduce Money
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setIsTransferModalOpen(true)}
            className="h-9 px-3.5 bg-white dark:bg-card border-slate-300 dark:border-border text-slate-700 dark:text-foreground hover:bg-slate-50 font-medium text-xs sm:text-sm rounded-lg shadow-xs transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4 mr-1.5 text-slate-500" />
            Transfer Money
          </Button>

          <Button
            type="button"
            onClick={() => setIsAddBankModalOpen(true)}
            className="h-9 px-4 bg-[#5046E5] hover:bg-[#4338CA] text-white font-medium text-xs sm:text-sm rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add New Account
          </Button>
        </div>
      </header>

      {/* Main 2-Column Dashboard Layout matching Capture7.PNG */}
      <div className="flex-1 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-border bg-white dark:bg-card">
        {/* Left Side Panel: Balances & Accounts */}
        <div className="w-full lg:w-[340px] xl:w-[380px] shrink-0 p-0 flex flex-col bg-white dark:bg-card border-r border-slate-200 dark:border-border">
          {/* Total Balance Card */}
          <div className="p-5 border-b border-slate-200 dark:border-border flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Total Balance:
            </span>
            <span className="text-lg font-bold text-slate-900 dark:text-foreground">
              ₹ {totalBalance.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
            </span>
          </div>

          {/* Cash Section */}
          <div className="border-b border-slate-200 dark:border-border">
            <div className="px-5 pt-4 pb-2">
              <span className="text-xs font-semibold text-slate-400 dark:text-muted-foreground uppercase tracking-wider">
                Cash
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedAccountId("cash")}
              className={cn(
                "w-full px-5 py-3.5 flex items-center justify-between text-left transition-colors border-l-4",
                selectedAccountId === "cash"
                  ? "bg-[#EEF0FD] dark:bg-primary/15 border-[#5046E5] text-[#5046E5] dark:text-primary font-semibold"
                  : "border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-muted/40 font-medium"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Wallet className="w-4 h-4 text-slate-500" />
                <span className="text-sm">Cash in hand</span>
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-foreground">
                ₹ {cashInHand.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
              </span>
            </button>
          </div>

          {/* Bank Accounts Section */}
          <div className="border-b border-slate-200 dark:border-border">
            <div className="px-5 pt-4 pb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 dark:text-muted-foreground uppercase tracking-wider">
                Bank Accounts
              </span>
              <button
                type="button"
                onClick={() => setIsAddBankModalOpen(true)}
                className="text-xs font-semibold text-[#5046E5] hover:text-[#4338CA] hover:underline"
              >
                + Add New Bank
              </button>
            </div>

            {bankAccounts.length === 0 ? (
              <div className="px-5 py-3 text-xs text-slate-400 dark:text-muted-foreground italic">
                No bank accounts linked yet. Click + Add New Bank to connect your business bank accounts.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-border/50">
                {bankAccounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => setSelectedAccountId(account.id)}
                    className={cn(
                      "w-full px-5 py-3.5 flex items-center justify-between text-left transition-colors border-l-4",
                      selectedAccountId === account.id
                        ? "bg-[#EEF0FD] dark:bg-primary/15 border-[#5046E5] text-[#5046E5] dark:text-primary font-semibold"
                        : "border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-muted/40 font-medium"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Landmark className="w-4 h-4 text-slate-500 shrink-0" />
                      <div className="truncate">
                        <p className="text-sm truncate leading-tight">{account.bankName}</p>
                        <p className="text-[11px] text-slate-400 dark:text-muted-foreground font-mono">
                          •••• {account.accountNumber.slice(-4)}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-foreground shrink-0 ml-2">
                      ₹ {Number(account.balance).toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Unlinked Transactions Row (Highlighted in Capture7.PNG) */}
          <div className="border-b border-slate-200 dark:border-border">
            <button
              type="button"
              onClick={() => setSelectedAccountId("unlinked")}
              className={cn(
                "w-full px-5 py-4 flex items-center justify-between text-left transition-colors border-l-4",
                selectedAccountId === "unlinked"
                  ? "bg-[#EEF0FD] dark:bg-primary/15 border-[#5046E5] text-[#5046E5] dark:text-primary font-semibold"
                  : "border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-muted/40 font-medium"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-[#5046E5] dark:text-primary" />
                <span className="text-sm">Unlinked Transactions</span>
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-foreground">
                ₹ {unlinkedBalance.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
              </span>
            </button>
          </div>

          {/* All Accounts Summary View Tab */}
          <div className="p-3">
            <button
              type="button"
              onClick={() => setSelectedAccountId("all")}
              className={cn(
                "w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border",
                selectedAccountId === "all"
                  ? "bg-slate-900 text-white border-slate-900 dark:bg-primary dark:text-primary-foreground"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-muted dark:text-muted-foreground"
              )}
            >
              <span>View All Combined Transactions ({transactions.length})</span>
            </button>
          </div>
        </div>

        {/* Right Side Panel: Transactions Feed & Table */}
        <div className="flex-1 flex flex-col bg-white dark:bg-card min-w-0">
          {/* Transactions Tab Header */}
          <div className="border-b border-slate-200 dark:border-border px-6 pt-4 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button
                type="button"
                className="pb-3 border-b-2 border-[#5046E5] text-sm font-bold text-[#5046E5] dark:text-primary flex items-center gap-2"
              >
                <span>Transactions</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-[#EEF0FD] dark:bg-primary/20 text-[#5046E5] dark:text-primary font-bold">
                  {filteredTransactions.length}
                </span>
              </button>
            </div>

            <div className="text-xs text-slate-500 dark:text-muted-foreground font-medium pb-3 hidden sm:block">
              Filter:{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {selectedAccountId === "all"
                  ? "All Accounts"
                  : selectedAccountId === "cash"
                  ? "Cash in hand"
                  : selectedAccountId === "unlinked"
                  ? "Unlinked Transactions"
                  : bankAccounts.find((b) => b.id === selectedAccountId)?.bankName || "Bank Account"}
              </span>
            </div>
          </div>

          {/* Controls Bar: Date Filter & Download Icon matching Capture7.PNG */}
          <div className="px-6 py-3.5 border-b border-slate-100 dark:border-border flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/40 dark:bg-muted/20">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Date Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 px-3.5 bg-white dark:bg-card border-slate-200 dark:border-border text-slate-700 dark:text-foreground text-xs font-semibold rounded-lg flex items-center gap-2 hover:bg-slate-50"
                  >
                    <CalendarIcon className="w-4 h-4 text-slate-500" />
                    <span>
                      {DATE_FILTER_OPTIONS.find((d) => d.id === dateFilter)?.label || "Last 30 Days"}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44">
                  {DATE_FILTER_OPTIONS.map((opt) => (
                    <DropdownMenuItem
                      key={opt.id}
                      onClick={() => setDateFilter(opt.id)}
                      className={cn(
                        "text-xs flex items-center justify-between",
                        dateFilter === opt.id ? "font-bold text-[#5046E5]" : ""
                      )}
                    >
                      <span>{opt.label}</span>
                      {dateFilter === opt.id && <Check className="w-3.5 h-3.5 text-[#5046E5]" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Quick Search */}
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search transactions..."
                  className="w-full h-9 pl-9 pr-3 text-xs bg-white dark:bg-card border border-slate-200 dark:border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-[#5046E5]"
                />
              </div>
            </div>

            {/* Statement Download Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  title="Download Statement"
                  className="w-9 h-9 border border-slate-200 dark:border-border bg-white dark:bg-card rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
                >
                  <Download className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleExportStatement("csv")} className="text-xs">
                  <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
                  <span>Export as CSV</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportStatement("print")} className="text-xs">
                  <FileText className="w-4 h-4 mr-2 text-indigo-600" />
                  <span>Print Statement</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Transactions List / Empty State */}
          <div className="flex-1 p-6 flex flex-col justify-center items-center overflow-auto">
            {filteredTransactions.length === 0 ? (
              // Empty State matching Capture7.PNG Shield Icon & Text
              <div className="py-16 flex flex-col items-center justify-center text-center max-w-sm">
                <div className="w-20 h-20 mb-4 rounded-2xl bg-slate-50 dark:bg-muted/40 border border-slate-200 dark:border-border flex items-center justify-center text-slate-400">
                  <Shield className="w-10 h-10 stroke-[1.4] text-slate-400" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-foreground">
                  No Transactions
                </h3>
                <p className="text-xs text-slate-400 dark:text-muted-foreground mt-1 leading-relaxed">
                  Your don't have any transaction in selected period
                </p>
                <div className="mt-6 flex items-center gap-2.5">
                  <Button
                    size="sm"
                    onClick={() => {
                      setMoneyActionType("add");
                      setIsAddMoneyModalOpen(true);
                    }}
                    className="bg-[#5046E5] hover:bg-[#4338CA] text-white text-xs h-8 px-3.5 rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Money Entry
                  </Button>
                </div>
              </div>
            ) : (
              // Active Transactions Table
              <div className="w-full h-full flex flex-col">
                <div className="overflow-x-auto border border-slate-200 dark:border-border rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-muted/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-border">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Account</th>
                        <th className="px-4 py-3">Category / Party</th>
                        <th className="px-4 py-3">Mode & Ref</th>
                        <th className="px-4 py-3 text-right">Amount (₹)</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-border/60">
                      {filteredTransactions.map((txn) => {
                        const isMoneyIn = txn.type === "money_in";
                        const isTransfer = txn.type === "transfer";

                        return (
                          <tr
                            key={txn.id}
                            className="hover:bg-slate-50/70 dark:hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                              {format(new Date(txn.date), "dd MMM yyyy")}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {isTransfer ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
                                  <ArrowLeftRight className="w-3 h-3" /> Transfer
                                </span>
                              ) : isMoneyIn ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                                  <ArrowDownLeft className="w-3 h-3" /> Money In
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300">
                                  <ArrowUpRight className="w-3 h-3" /> Money Out
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                              {isTransfer ? (
                                <span className="text-[11px]">
                                  {getAccountLabel(txn.accountId)} → {getAccountLabel(txn.targetAccountId || "")}
                                </span>
                              ) : (
                                <span>{getAccountLabel(txn.accountId)}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <p className="font-semibold text-slate-800 dark:text-slate-200">
                                {txn.partyName || txn.category}
                              </p>
                              {txn.notes && (
                                <p className="text-[10px] text-slate-400 dark:text-muted-foreground truncate max-w-[160px]">
                                  {txn.notes}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-slate-500 dark:text-muted-foreground">
                              <span className="uppercase font-mono text-[10px]">
                                {txn.paymentMode.replace("_", " ")}
                              </span>
                              {txn.referenceNo && (
                                <span className="ml-1 text-[10px] text-slate-400 font-mono">
                                  #{txn.referenceNo}
                                </span>
                              )}
                            </td>
                            <td
                              className={cn(
                                "px-4 py-3 text-right font-bold whitespace-nowrap",
                                isMoneyIn
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : isTransfer
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-rose-600 dark:text-rose-400"
                              )}
                            >
                              {isMoneyIn ? "+ " : isTransfer ? "⇄ " : "- "}₹{" "}
                              {txn.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleDeleteTransaction(txn.id)}
                                title="Delete Record"
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: Add / Reduce Money Dialog */}
      <Dialog open={isAddMoneyModalOpen} onOpenChange={setIsAddMoneyModalOpen}>
        <DialogContent className="max-w-xl sm:max-w-2xl bg-white dark:bg-card border border-border p-6 rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto">
          <DialogHeader className="border-b border-border/70 pb-3">
            <DialogTitle className="text-base font-bold text-foreground flex items-center justify-between">
              <span>{moneyActionType === "add" ? "Add Money (Cash / Bank In)" : "Reduce Money (Cash / Bank Out)"}</span>
            </DialogTitle>
          </DialogHeader>

          {/* Action Tabs */}
          <div className="grid grid-cols-2 gap-2 mt-3 p-1 bg-slate-100 dark:bg-muted rounded-xl">
            <button
              type="button"
              onClick={() => setMoneyActionType("add")}
              className={cn(
                "py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                moneyActionType === "add"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-muted-foreground hover:text-foreground"
              )}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" /> Add Money (+)
            </button>
            <button
              type="button"
              onClick={() => setMoneyActionType("reduce")}
              className={cn(
                "py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                moneyActionType === "reduce"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-muted-foreground hover:text-foreground"
              )}
            >
              <ArrowUpRight className="w-3.5 h-3.5" /> Reduce Money (-)
            </button>
          </div>

          <form onSubmit={handleAddReduceMoney} className="space-y-3.5 mt-4">
            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Target Account *
              </Label>
              <select
                value={moneyAccount}
                onChange={(e) => setMoneyAccount(e.target.value)}
                className="w-full h-9 px-3 mt-1 bg-white dark:bg-card border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
              >
                <option value="cash">Cash in hand</option>
                <option value="unlinked">Unlinked Transactions</option>
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bankName} (•••• {b.accountNumber.slice(-4)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                    value={moneyAmount}
                    onChange={(e) => setMoneyAmount(e.target.value)}
                    className="pl-8 h-9 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Date *
                </Label>
                <Input
                  type="date"
                  required
                  value={moneyDate}
                  onChange={(e) => setMoneyDate(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Payment Mode
                </Label>
                <select
                  value={moneyMode}
                  onChange={(e) => setMoneyMode(e.target.value as any)}
                  className="w-full h-9 px-3 mt-1 bg-white dark:bg-card border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI / QR Code</option>
                  <option value="neft_rtgs">NEFT / RTGS / IMPS</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card (Debit/Credit)</option>
                  <option value="net_banking">Net Banking</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Category / Reason
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. Sales, Advance, Petty cash"
                  value={moneyCategory}
                  onChange={(e) => setMoneyCategory(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Party / Contact Name (Optional)
              </Label>
              <Input
                type="text"
                placeholder="e.g. Customer Name or Payee"
                value={moneyParty}
                onChange={(e) => setMoneyParty(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Reference / Notes (Optional)
              </Label>
              <Input
                type="text"
                placeholder="UTR / Cheque No / Remarks"
                value={moneyRef}
                onChange={(e) => setMoneyRef(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddMoneyModalOpen(false)}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className={cn(
                  "text-xs h-9 text-white font-semibold",
                  moneyActionType === "add"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                )}
              >
                Confirm {moneyActionType === "add" ? "Deposit" : "Withdrawal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Transfer Money Dialog */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="max-w-xl sm:max-w-2xl bg-white dark:bg-card border border-border p-6 rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto">
          <DialogHeader className="border-b border-border/70 pb-3">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-[#5046E5]" />
              <span>Transfer Money Between Accounts</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleTransferMoney} className="space-y-3.5 mt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  From Account *
                </Label>
                <select
                  value={transferFromAccount}
                  onChange={(e) => setTransferFromAccount(e.target.value)}
                  className="w-full h-9 px-3 mt-1 bg-white dark:bg-card border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
                >
                  <option value="cash">Cash in hand (₹{cashInHand})</option>
                  <option value="unlinked">Unlinked Transactions (₹{unlinkedBalance})</option>
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} (₹{b.balance})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  To Account *
                </Label>
                <select
                  value={transferToAccount}
                  onChange={(e) => setTransferToAccount(e.target.value)}
                  required
                  className="w-full h-9 px-3 mt-1 bg-white dark:bg-card border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
                >
                  <option value="">-- Select Destination --</option>
                  <option value="cash" disabled={transferFromAccount === "cash"}>
                    Cash in hand
                  </option>
                  <option value="unlinked" disabled={transferFromAccount === "unlinked"}>
                    Unlinked Transactions
                  </option>
                  {bankAccounts
                    .filter((b) => b.id !== transferFromAccount)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} (•••• {b.accountNumber.slice(-4)})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="pl-8 h-9 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Transfer Date *
                </Label>
                <Input
                  type="date"
                  required
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Transfer Mode
              </Label>
              <select
                value={transferMode}
                onChange={(e) => setTransferMode(e.target.value as any)}
                className="w-full h-9 px-3 mt-1 bg-white dark:bg-card border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
              >
                <option value="neft_rtgs">NEFT / RTGS / IMPS</option>
                <option value="upi">UPI / Online</option>
                <option value="cash">ATM Cash Deposit / Withdrawal</option>
                <option value="cheque">Bank Cheque</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Reference / Notes
              </Label>
              <Input
                type="text"
                placeholder="e.g. Daily Cash Deposit to Bank / UTR Ref"
                value={transferRef}
                onChange={(e) => setTransferRef(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTransferModalOpen(false)}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="text-xs h-9 bg-[#5046E5] hover:bg-[#4338CA] text-white font-semibold"
              >
                Transfer Now
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Add Bank Account Dialog */}
      <Dialog open={isAddBankModalOpen} onOpenChange={setIsAddBankModalOpen}>
        <DialogContent className="max-w-xl sm:max-w-2xl bg-white dark:bg-card border border-border p-6 rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto">
          <DialogHeader className="border-b border-border/70 pb-3">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Landmark className="w-4 h-4 text-[#5046E5]" />
              <span>Add New Bank Account</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddBankAccount} className="space-y-3.5 mt-3">
            {/* Quick Bank Chips */}
            <div>
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Select Popular Bank
              </Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5 max-h-20 overflow-y-auto pr-1">
                {DEFAULT_BANKS_LIST.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBankName(b)}
                    className={cn(
                      "px-2 py-1 rounded text-[11px] font-medium border transition-colors",
                      bankName === b
                        ? "bg-[#5046E5] text-white border-[#5046E5]"
                        : "bg-slate-50 dark:bg-muted text-slate-700 dark:text-slate-300 border-slate-200 hover:border-slate-400"
                    )}
                  >
                    {b.split(" (")[0]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Bank Name *
              </Label>
              <Input
                type="text"
                required
                placeholder="e.g. HDFC Bank, ICICI, SBI"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Account Number *
                </Label>
                <Input
                  type="text"
                  required
                  placeholder="501000..."
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="mt-1 h-9 text-xs font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  IFSC Code (Optional)
                </Label>
                <Input
                  type="text"
                  placeholder="HDFC0001234"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  className="mt-1 h-9 text-xs font-mono uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Account Type
                </Label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as any)}
                  className="w-full h-9 px-3 mt-1 bg-white dark:bg-card border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
                >
                  <option value="current">Current Account</option>
                  <option value="savings">Savings Account</option>
                  <option value="overdraft">Overdraft (OD / CC)</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Opening Balance (₹)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="mt-1 h-9 text-xs font-semibold"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Account Holder / Display Name
              </Label>
              <Input
                type="text"
                placeholder={org?.name || "Business Legal Name"}
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                UPI ID (Optional)
              </Label>
              <Input
                type="text"
                placeholder="storename@hdfcbank"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="mt-1 h-9 text-xs font-mono"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddBankModalOpen(false)}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="text-xs h-9 bg-[#5046E5] hover:bg-[#4338CA] text-white font-semibold"
              >
                Save Bank Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
