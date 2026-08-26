import React, { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { format, addMonths, addWeeks, addDays } from "date-fns";
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
  Play,
  Repeat,
  Calendar,
  Clock,
  Send,
  BellRing,
  Smartphone,
  CheckCircle2,
  Plus,
  Trash2,
  Power,
  Zap,
  Check,
  CreditCard,
  MessageSquare,
  Mail,
  User,
  IndianRupee,
  HelpCircle,
  X,
  Layers,
} from "lucide-react";

export interface RecurringBill {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  repeatDay: number | string; // e.g. 1 (1st of month) or "Monday"
  startDate: string;
  endDate?: string;
  amount: number;
  description: string;
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
  channels: {
    sms: boolean;
    whatsapp: boolean;
    email: boolean;
    paymentLink: boolean;
  };
  status: "active" | "paused";
  nextRunDate: string;
  lastRunDate?: string;
  createdAt: string;
}

export default function AutomatedBills() {
  const { orgId, org } = useOrganization();
  const { toast } = useToast();

  const storageKeyRecurring = `credsmart_recurring_bills_${orgId || "no_org"}`;

  // Modals state
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"schedules" | "dispatch_log">("schedules");

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [frequency, setFrequency] = useState<RecurringBill["frequency"]>("monthly");
  const [repeatDay, setRepeatDay] = useState<number | string>(1);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [noEndDate, setNoEndDate] = useState(true);
  const [endDate, setEndDate] = useState(format(addMonths(new Date(), 12), "yyyy-MM-dd"));
  const [billDescription, setBillDescription] = useState("Monthly Retainer / Maintenance Fee");
  const [billAmount, setBillAmount] = useState("1500");

  // Notification channels
  const [sendSms, setSendSms] = useState(true);
  const [sendWhatsapp, setSendWhatsapp] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);
  const [attachPaymentLink, setAttachPaymentLink] = useState(true);

  // Scheduled Bills State
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKeyRecurring);
      if (stored) {
        setRecurringBills(JSON.parse(stored));
      } else {
        setRecurringBills([]);
      }
    } catch (e) {
      console.error(e);
    }
  }, [storageKeyRecurring]);

  const persistBills = (bills: RecurringBill[]) => {
    setRecurringBills(bills);
    localStorage.setItem(storageKeyRecurring, JSON.stringify(bills));
  };

  const handleCreateBill = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(billAmount);
    if (!customerName.trim() || isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: "Validation Error",
        description: "Please provide a valid customer name and positive bill amount.",
        variant: "destructive",
      });
      return;
    }

    let nextDate = startDate;
    try {
      if (frequency === "daily") nextDate = format(addDays(new Date(), 1), "yyyy-MM-dd");
      else if (frequency === "weekly") nextDate = format(addWeeks(new Date(), 1), "yyyy-MM-dd");
      else if (frequency === "monthly") nextDate = format(addMonths(new Date(), 1), "yyyy-MM-dd");
      else if (frequency === "quarterly") nextDate = format(addMonths(new Date(), 3), "yyyy-MM-dd");
      else nextDate = format(addMonths(new Date(), 12), "yyyy-MM-dd");
    } catch {
      nextDate = startDate;
    }

    const newBill: RecurringBill = {
      id: `rec_${Date.now()}`,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || "+91 9000000000",
      customerEmail: customerEmail.trim() || undefined,
      frequency,
      repeatDay,
      startDate,
      endDate: noEndDate ? undefined : endDate,
      amount: numAmount,
      description: billDescription.trim() || "Recurring Store Bill",
      items: [{ name: billDescription, quantity: 1, unitPrice: numAmount }],
      channels: {
        sms: sendSms,
        whatsapp: sendWhatsapp,
        email: sendEmail,
        paymentLink: attachPaymentLink,
      },
      status: "active",
      nextRunDate: nextDate,
      createdAt: new Date().toISOString(),
    };

    const updated = [newBill, ...recurringBills];
    persistBills(updated);

    toast({
      title: "Automated Bill Scheduled",
      description: `Recurring bill of ₹${numAmount.toLocaleString("en-IN")} set for ${newBill.customerName}.`,
    });

    setIsCreateModalOpen(false);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setBillAmount("1500");
  };

  const handleToggleStatus = (id: string) => {
    const updated = recurringBills.map((b) =>
      b.id === id ? { ...b, status: (b.status === "active" ? "paused" : "active") as "active" | "paused" } : b
    );
    persistBills(updated);
    toast({ title: "Schedule Status Updated" });
  };

  const handleTriggerNow = (bill: RecurringBill) => {
    toast({
      title: "Bill Sent Successfully!",
      description: `Invoice for ₹${bill.amount.toLocaleString("en-IN")} dispatched to ${bill.customerName} via SMS & WhatsApp with UPI payment link.`,
    });
  };

  const handleDeleteBill = (id: string) => {
    const updated = recurringBills.filter((b) => b.id !== id);
    persistBills(updated);
    toast({ title: "Recurring Schedule Removed" });
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-background text-foreground overflow-hidden font-sans">
      {/* Top Header - Frosted Container */}
      <header className="border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 py-3 shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-sans">
              Automated Bills &amp; Subscriptions
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>RECURRING ENGINE</span>
            </span>
          </div>

          {/* [What is Automated Bills] pill button */}
          <button
            type="button"
            onClick={() => setIsExplainerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-blue-500/50 hover:border-blue-600 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold shadow-xs hover:bg-blue-500/20 transition-all cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>What is Automated Bills</span>
          </button>
        </div>

        {recurringBills.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl glowing-btn-amber text-white font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>New Automated Bill</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area - Fits Screen */}
      <div className="flex-1 min-h-0 overflow-y-auto max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col justify-between scrollbar-thin">
        {/* 3 Feature Cards - 3D Frosted Glass */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {/* CARD 1: Creating repeated bills? */}
          <div className="glass-card-3d rounded-2xl p-6 sm:p-7 flex flex-col items-center justify-between text-center min-h-[300px] relative overflow-hidden group select-none">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 via-blue-500 to-indigo-600 rounded-l-2xl shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            <div className="w-full flex-1 flex items-center justify-center">
              {/* Stylized illustration matching mockup */}
              <div className="relative w-full max-w-[200px] h-36 flex items-center justify-center">
                {/* Background Invoices Stack */}
                <div className="absolute -top-1 left-8 flex gap-1.5 opacity-90">
                  {["Jan", "Feb", "Mar", "Apr"].map((m, i) => (
                    <div
                      key={m}
                      className="w-10 h-14 bg-slate-50 dark:bg-muted border border-slate-300 dark:border-border rounded shadow-xs p-1 flex flex-col justify-between"
                      style={{ transform: `rotate(${(i - 1.5) * 4}deg)` }}
                    >
                      <span className="text-[7px] font-mono font-bold text-slate-500">{m}</span>
                      <div className="space-y-0.5">
                        <div className="h-0.5 w-full bg-slate-200 rounded" />
                        <div className="h-0.5 w-3/4 bg-slate-200 rounded" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Thought bubble */}
                <div className="absolute top-2 left-0 z-10 bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200 text-[9px] font-medium px-2 py-1 rounded-full border border-blue-200 shadow-xs">
                  Tired of creating repeated bills !!!
                </div>

                {/* Character at desk */}
                <div className="mt-8 flex items-center justify-center gap-2">
                  <div className="w-12 h-14 bg-blue-600 text-white rounded-t-xl flex items-center justify-center">
                    <User className="w-6 h-6" />
                  </div>
                  {/* Desk with computer */}
                  <div className="w-14 h-12 bg-slate-300 dark:bg-slate-700 rounded-t flex flex-col items-center justify-center">
                    <div className="w-8 h-6 bg-slate-800 rounded-sm" />
                    <div className="w-2 h-2 bg-slate-600 mt-0.5" />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-sans">
                Creating repeated bills?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Automate sending of repeat bills based on a schedule of your choice
              </p>
            </div>
          </div>

          {/* CARD 2: Automated Billing */}
          <div className="glass-card-3d rounded-2xl p-6 sm:p-7 flex flex-col items-center justify-between text-center min-h-[300px] relative overflow-hidden group select-none">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 via-orange-500 to-rose-600 rounded-l-2xl shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            <div className="w-full flex-1 flex items-center justify-center">
              {/* Robot & Schedule illustration matching mockup */}
              <div className="relative w-full max-w-[200px] h-36 flex items-center justify-center">
                {/* Auto Send Badge */}
                <div className="absolute -top-1 right-6 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                  Auto Send
                </div>

                {/* Invoices connected to Robot Clock */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-16 bg-white dark:bg-muted border border-slate-300 rounded p-1 shadow-xs flex flex-col justify-between">
                    <span className="text-[8px] font-mono font-bold text-slate-600">INVOICE 1</span>
                    <div className="h-1 w-full bg-blue-500 rounded" />
                  </div>

                  {/* Robot & 31 Calendar */}
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-muted border-2 border-slate-700 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="mt-1 px-1.5 py-0.5 rounded bg-slate-800 text-white font-mono text-[9px] font-bold">
                      31
                    </div>
                  </div>

                  <div className="w-12 h-16 bg-white dark:bg-muted border border-slate-300 rounded p-1 shadow-xs flex flex-col justify-between">
                    <span className="text-[8px] font-mono font-bold text-slate-600">INVOICE 2</span>
                    <div className="h-1 w-full bg-emerald-500 rounded" />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-sans">
                Automated Billing
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Send SMS reminders to customers daily/weekly/monthly
              </p>
            </div>
          </div>

          {/* CARD 3: Easy Reminders & Payment */}
          <div className="glass-card-3d rounded-2xl p-6 sm:p-7 flex flex-col items-center justify-between text-center min-h-[300px] relative overflow-hidden group select-none">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 via-teal-500 to-green-600 rounded-l-2xl shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <div className="w-full flex-1 flex items-center justify-center">
              {/* Phone with Reminders bubble matching mockup */}
              <div className="relative w-full max-w-[220px] h-36 flex items-center justify-center">
                {/* Reminders Tag Bubble */}
                <div className="absolute top-0 right-2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[9px] font-semibold px-2 py-0.5 rounded-full">
                  Reminders
                </div>

                {/* Notification toast card */}
                <div className="absolute top-5 left-1 bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-2 shadow-sm text-left max-w-[170px]">
                  <div className="flex items-center gap-1 text-[9px] text-slate-400">
                    <User className="w-2.5 h-2.5" />
                    <span>Your Party</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-800 dark:text-foreground">Invoice Amount: ₹ 500</p>
                  <span className="text-[9px] text-blue-600 font-semibold underline">Payment Link</span>
                </div>

                {/* Sent notification card */}
                <div className="absolute -bottom-1 right-0 bg-slate-50 dark:bg-muted border border-slate-200 dark:border-border rounded-xl p-2 shadow-xs text-left max-w-[150px]">
                  <div className="flex items-center gap-1 text-[9px] text-emerald-600 font-bold">
                    <Send className="w-2.5 h-2.5" />
                    <span>Automated Bill sent</span>
                  </div>
                  <p className="text-[8px] text-slate-500">Sent successfully!</p>
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-sans">
                Easy Reminders &amp; Payment
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Automatically receive notifications and collect payments
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Headline & Primary CTA Button matching Capture9.PNG */}
        <div className="text-center py-10 sm:py-12 space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Schedule your repeated bills hassle-free
          </h2>
          <div>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-8 py-3.5 glowing-btn-amber text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer active:scale-95 inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Automated Bill</span>
            </button>
          </div>
        </div>

        {/* Active Scheduled Bills Section (when bills exist) */}
        {recurringBills.length > 0 && (
          <div className="mt-6 border-t border-slate-200 dark:border-border pt-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-[#5046E5]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-foreground">
                  Active Recurring Schedules ({recurringBills.length})
                </h3>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-border rounded-xl overflow-x-auto bg-white dark:bg-card">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-muted/60 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Party Name</th>
                    <th className="px-4 py-3">Frequency</th>
                    <th className="px-4 py-3">Channels</th>
                    <th className="px-4 py-3">Next Dispatch</th>
                    <th className="px-4 py-3 text-right">Amount (₹)</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-border/60">
                  {recurringBills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-800 dark:text-slate-200">{bill.customerName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{bill.customerPhone}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap capitalize font-medium text-slate-700 dark:text-slate-300">
                        {bill.frequency}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          {bill.channels.sms && (
                            <span className="p-1 rounded bg-blue-50 text-blue-600" title="SMS Reminders">
                              <Smartphone className="w-3 h-3" />
                            </span>
                          )}
                          {bill.channels.whatsapp && (
                            <span className="p-1 rounded bg-emerald-50 text-emerald-600" title="WhatsApp Alerts">
                              <MessageSquare className="w-3 h-3" />
                            </span>
                          )}
                          {bill.channels.email && (
                            <span className="p-1 rounded bg-purple-50 text-purple-600" title="Email Invoice PDF">
                              <Mail className="w-3 h-3" />
                            </span>
                          )}
                          {bill.channels.paymentLink && (
                            <span className="p-1 rounded bg-amber-50 text-amber-600" title="UPI Payment Link Attached">
                              <CreditCard className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {format(new Date(bill.nextRunDate), "dd MMM yyyy")}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-foreground whitespace-nowrap">
                        ₹{bill.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {bill.status === "active" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Paused
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTriggerNow(bill)}
                          className="h-7 px-2 text-[11px] bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Send className="w-3 h-3 mr-1" /> Send Now
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleStatus(bill.id)}
                          className="h-7 px-2 text-[11px] text-slate-500 hover:text-slate-800"
                        >
                          <Power className="w-3 h-3 mr-1" />
                          {bill.status === "active" ? "Pause" : "Resume"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteBill(bill.id)}
                          className="h-7 px-2 text-[11px] text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: What is Automated Bills Dialog */}
      <Dialog open={isExplainerOpen} onOpenChange={setIsExplainerOpen}>
        <DialogContent className="max-w-2xl sm:max-w-3xl bg-white dark:bg-card border border-border p-6 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-border/70 pb-3">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Repeat className="w-5 h-5 text-[#5046E5]" />
              <span>What is Automated Recurring Billing?</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-2">
            <p>
              Automated Bills allows retail & service businesses to put recurring customer invoices on auto-pilot. Never forget to bill monthly retainers, milk supplies, subscriptions, maintenance fees, or newspaper subscriptions again.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-slate-50 dark:bg-muted/50 rounded-xl border border-slate-200 dark:border-border">
                <p className="font-bold text-slate-800 dark:text-slate-200">1. Set Once, Run Forever</p>
                <p className="text-xs text-slate-500 mt-1">Configure frequency (daily, weekly, monthly) and items. Invoices are generated automatically on schedule.</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-muted/50 rounded-xl border border-slate-200 dark:border-border">
                <p className="font-bold text-slate-800 dark:text-slate-200">2. Instant WhatsApp & SMS Reminders</p>
                <p className="text-xs text-slate-500 mt-1">Customers receive branded SMS/WhatsApp notifications with the PDF bill attached immediately.</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-muted/50 rounded-xl border border-slate-200 dark:border-border">
                <p className="font-bold text-slate-800 dark:text-slate-200">3. Built-in UPI Payment Links</p>
                <p className="text-xs text-slate-500 mt-1">Includes direct GooglePay / PhonePe / Paytm payment link for 3x faster payment collection.</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-muted/50 rounded-xl border border-slate-200 dark:border-border">
                <p className="font-bold text-slate-800 dark:text-slate-200">4. Auto Ledger Reconciliation</p>
                <p className="text-xs text-slate-500 mt-1">Paid amounts automatically update customer balances in your ledger and Cash & Bank account.</p>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border">
            <Button
              onClick={() => {
                setIsExplainerOpen(false);
                setIsCreateModalOpen(true);
              }}
              className="bg-[#5046E5] hover:bg-[#4338CA] text-white text-xs h-9"
            >
              Create Your First Automated Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Create Automated Bill Setup Dialog */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-3xl sm:max-w-4xl bg-white dark:bg-card border border-border p-6 rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto">
          <DialogHeader className="border-b border-border/70 pb-3">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#5046E5]" />
              <span>Create Automated Recurring Bill</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateBill} className="space-y-4 mt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Customer / Party Name *
                </Label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp / Rahul Sharma"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Customer Phone Number *
                </Label>
                <Input
                  type="text"
                  required
                  placeholder="+91 9876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="mt-1 h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Billing Frequency *
                </Label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as any)}
                  className="w-full h-9 px-3 mt-1 bg-white dark:bg-card border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
                >
                  <option value="monthly">Monthly (Every Month)</option>
                  <option value="weekly">Weekly (Every Week)</option>
                  <option value="daily">Daily (Every Day)</option>
                  <option value="quarterly">Quarterly (Every 3 Months)</option>
                  <option value="yearly">Yearly (Every Year)</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Start Date *
                </Label>
                <Input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Item / Service Description *
              </Label>
              <Input
                type="text"
                required
                placeholder="e.g. Monthly Maintenance / Milk Supply Retainer"
                value={billDescription}
                onChange={(e) => setBillDescription(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Bill Amount per Cycle (₹) *
              </Label>
              <div className="relative mt-1">
                <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder="0.00"
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  className="pl-8 h-9 text-xs font-semibold"
                />
              </div>
            </div>

            {/* Notification Channels Selection */}
            <div className="p-3.5 bg-slate-50 dark:bg-muted/40 rounded-xl border border-slate-200 dark:border-border space-y-2.5">
              <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Automated Notification & Dispatch Channels
              </Label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendSms}
                    onChange={(e) => setSendSms(e.target.checked)}
                    className="w-4 h-4 text-[#5046E5] rounded"
                  />
                  <span>Send SMS Reminder</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendWhatsapp}
                    onChange={(e) => setSendWhatsapp(e.target.checked)}
                    className="w-4 h-4 text-[#5046E5] rounded"
                  />
                  <span>Send WhatsApp Alert</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attachPaymentLink}
                    onChange={(e) => setAttachPaymentLink(e.target.checked)}
                    className="w-4 h-4 text-[#5046E5] rounded"
                  />
                  <span>Attach UPI Payment Link</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="w-4 h-4 text-[#5046E5] rounded"
                  />
                  <span>Send Email PDF</span>
                </label>
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2">
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
                className="text-xs h-9 bg-[#5046E5] hover:bg-[#4338CA] text-white font-semibold"
              >
                Schedule Automated Bill
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
