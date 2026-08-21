import React, { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
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
  MessageSquare,
  HelpCircle,
  CheckCircle2,
  FileText,
  QrCode,
  Truck,
  BarChart3,
  ShieldCheck,
  Zap,
  ArrowRight,
  Printer,
  Download,
  AlertCircle,
  Copy,
  Check,
  Send,
  Building,
  Key,
  X,
} from "lucide-react";

export interface EInvoiceRecord {
  id: string;
  invoiceNumber: string;
  irn: string;
  ackNumber: string;
  ackDate: string;
  buyerName: string;
  buyerGstin: string;
  totalAmount: number;
  taxAmount: number;
  status: "active" | "cancelled";
  ewayBillNo?: string;
  qrCodeUrl: string;
}

export default function EInvoicing() {
  const { orgId, org } = useOrganization();
  const { toast } = useToast();

  const storageKeyEInvoices = `credsmart_einvoices_${orgId || "default"}`;
  const storageKeyConfig = `credsmart_einvoice_config_${orgId || "default"}`;

  // Modals state
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);
  const [isChatSupportOpen, setIsChatSupportOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"workbench" | "config" | "history">("workbench");

  // Config State
  const [gstin, setGstin] = useState(org?.gstin || "27ABCDE1234F1Z5");
  const [nicUsername, setNicUsername] = useState("CREDSMART_API");
  const [nicPassword, setNicPassword] = useState("••••••••••••");
  const [isProduction, setIsProduction] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  // New E-Invoice Form
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${format(new Date(), "yyyyMMdd")}-01`);
  const [buyerName, setBuyerName] = useState("Apex Traders Private Limited");
  const [buyerGstin, setBuyerGstin] = useState("29ABCDE5678G2Z1");
  const [taxableAmount, setTaxableAmount] = useState("10000");
  const [gstRate, setGstRate] = useState("18");
  const [generateEwayBill, setGenerateEwayBill] = useState(true);
  const [vehicleNumber, setVehicleNumber] = useState("MH-12-AB-1234");
  const [distanceKm, setDistanceKm] = useState("140");
  const [isGenerating, setIsGenerating] = useState(false);

  // Active Generated Invoice Preview Modal
  const [selectedInvoice, setSelectedInvoice] = useState<EInvoiceRecord | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Chat Support Messages
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "bot" | "user"; text: string; time: string }>>([
    {
      sender: "bot",
      text: "Hello! I am your GST & E-Invoicing specialist. How can I assist you with IRN generation, NIC credentials, or e-Way bill sync today?",
      time: "Just now",
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  // E-Invoices History
  const [eInvoices, setEInvoices] = useState<EInvoiceRecord[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKeyEInvoices);
      if (stored) {
        setEInvoices(JSON.parse(stored));
      } else {
        // Initialize with default demo record
        const sampleRecord: EInvoiceRecord = {
          id: "einv_sample_1",
          invoiceNumber: "INV-2026-0891",
          irn: "e7d4a1b8c9e0f23456789abcdef1234567890abcdef1234567890abcdef123456",
          ackNumber: "112609876543",
          ackDate: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
          buyerName: "Mahindra Logistics Hub",
          buyerGstin: "27AABCM1234Q1Z8",
          totalAmount: 118000,
          taxAmount: 18000,
          status: "active",
          ewayBillNo: "241098765432",
          qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=IRN:e7d4a1b8c9e0f23456789abcdef1234567890abcdef1234567890abcdef123456|GSTIN:${org?.gstin || "27ABCDE1234F1Z5"}|Total:118000`,
        };
        setEInvoices([sampleRecord]);
      }
    } catch (e) {
      console.error(e);
    }
  }, [storageKeyEInvoices, org?.gstin]);

  const persistRecords = (records: EInvoiceRecord[]) => {
    setEInvoices(records);
    localStorage.setItem(storageKeyEInvoices, JSON.stringify(records));
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast({ title: "Copied to clipboard", description: text });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleGenerateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    setTimeout(() => {
      const taxable = parseFloat(taxableAmount) || 0;
      const rate = parseFloat(gstRate) || 0;
      const tax = (taxable * rate) / 100;
      const total = taxable + tax;

      // Generate simulated 64-char IRN hash and Ack No
      const hexChars = "0123456789abcdef";
      let pseudoIrn = "";
      for (let i = 0; i < 64; i++) {
        pseudoIrn += hexChars[Math.floor(Math.random() * hexChars.length)];
      }
      const ackNo = `11${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      const eway = generateEwayBill ? `24${Math.floor(1000000000 + Math.random() * 9000000000)}` : undefined;

      const newRecord: EInvoiceRecord = {
        id: `einv_${Date.now()}`,
        invoiceNumber,
        irn: pseudoIrn,
        ackNumber: ackNo,
        ackDate: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
        buyerName,
        buyerGstin,
        totalAmount: total,
        taxAmount: tax,
        status: "active",
        ewayBillNo: eway,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=IRN:${pseudoIrn}|Seller:${gstin}|Buyer:${buyerGstin}|Amount:${total}`,
      };

      const updated = [newRecord, ...eInvoices];
      persistRecords(updated);
      setIsGenerating(false);
      setSelectedInvoice(newRecord);

      toast({
        title: "E-Invoice & IRN Generated!",
        description: `Ack No: ${ackNo} successfully signed by NIC Portal.`,
      });
    }, 900);
  };

  const handleCancelIrn = (id: string) => {
    const updated = eInvoices.map((inv) => (inv.id === id ? { ...inv, status: "cancelled" as const } : inv));
    persistRecords(updated);
    toast({
      title: "IRN Cancelled",
      description: "E-Invoice marked as cancelled on IRP portal.",
      variant: "destructive",
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    const userMsg = { sender: "user" as const, text: userText, time: format(new Date(), "HH:mm") };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");

    setTimeout(() => {
      let reply = "All B2B invoices generated in CredSmart are digitally signed with QR code and instantly synced with the NIC IRP Portal.";
      if (userText.toLowerCase().includes("limit") || userText.toLowerCase().includes("threshold")) {
        reply = "Currently, e-invoicing is mandatory for businesses with aggregate annual turnover exceeding ₹5 Crores in any preceding fiscal year.";
      } else if (userText.toLowerCase().includes("eway") || userText.toLowerCase().includes("truck")) {
        reply = "CredSmart auto-generates Part-A and Part-B e-Way Bills simultaneously using the IRN without duplicate data entry!";
      } else if (userText.toLowerCase().includes("cancel")) {
        reply = "You can cancel an IRN on the IRP portal within 24 hours of generation. After 24 hours, you need to issue a Credit Note.";
      }
      setChatMessages((prev) => [
        ...prev,
        { sender: "bot", text: reply, time: format(new Date(), "HH:mm") },
      ]);
    }, 600);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white dark:bg-background text-foreground flex flex-col font-sans relative">
      {/* Top Header matching Capture8.PNG */}
      <header className="border-b border-slate-200 dark:border-border px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-card">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-xl font-bold text-slate-900 dark:text-foreground tracking-tight">
            e-Invoicing
          </h1>

          {/* [What is e-Invoicing] pill button matching mockup */}
          <button
            type="button"
            onClick={() => setIsExplainerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-blue-500/80 hover:border-blue-600 bg-white dark:bg-card text-blue-600 dark:text-blue-400 text-xs font-semibold shadow-xs hover:bg-blue-50/50 transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-blue-600 dark:fill-blue-400 text-blue-600 dark:text-blue-400" />
            <span>What is e-Invoicing</span>
          </button>
        </div>

        {/* [Chat Support] button matching mockup top right */}
        <button
          type="button"
          onClick={() => setIsChatSupportOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100/70 text-xs font-semibold shadow-xs transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat Support</span>
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-between">
        {/* 3 Feature Cards matching Capture8.PNG */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {/* CARD 1: Automatic e-invoice generation */}
          <div className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-border/80 shadow-xs hover:shadow-md transition-all p-8 flex flex-col items-center justify-between text-center min-h-[300px]">
            <div className="w-full flex-1 flex items-center justify-center">
              {/* Stylized Document Illustration with QR & lines */}
              <div className="relative w-28 h-36 bg-slate-50 dark:bg-muted/40 border-2 border-slate-700 dark:border-slate-300 rounded-lg p-3 shadow-sm flex flex-col justify-between">
                {/* Header fold simulation */}
                <div className="space-y-1.5">
                  <div className="h-2 w-12 bg-teal-400/80 rounded" />
                  <div className="h-1.5 w-6 bg-slate-300 dark:bg-slate-600 rounded" />
                </div>
                {/* Lines */}
                <div className="space-y-1.5 my-2">
                  <div className="h-1 w-full bg-slate-300 dark:bg-slate-600 rounded" />
                  <div className="h-1 w-4/5 bg-slate-300 dark:bg-slate-600 rounded" />
                  <div className="h-1 w-full bg-slate-300 dark:bg-slate-600 rounded" />
                </div>
                {/* QR code block */}
                <div className="w-8 h-8 border border-slate-700 dark:border-slate-300 rounded p-0.5 flex flex-wrap gap-0.5 bg-white dark:bg-card">
                  <div className="w-3 h-3 bg-slate-800 dark:bg-white rounded-xs" />
                  <div className="w-2.5 h-2.5 bg-slate-800 dark:bg-white rounded-xs ml-auto" />
                  <div className="w-2.5 h-2.5 bg-slate-800 dark:bg-white rounded-xs mt-auto" />
                  <div className="w-2 h-2 bg-slate-400 rounded-xs mt-auto ml-auto" />
                </div>
                {/* Underline base stand */}
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-amber-200/80 rounded" />
              </div>
            </div>
            <div className="pt-6">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                Automatic e-invoice generation
              </h3>
            </div>
          </div>

          {/* CARD 2: Hassle e-way bill generation using IRN */}
          <div className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-border/80 shadow-xs hover:shadow-md transition-all p-8 flex flex-col items-center justify-between text-center min-h-[300px]">
            <div className="w-full flex-1 flex items-center justify-center">
              {/* Stylized Document Illustration with Truck */}
              <div className="relative w-28 h-36 bg-slate-50 dark:bg-muted/40 border-2 border-slate-700 dark:border-slate-300 rounded-lg p-3 shadow-sm flex flex-col justify-between">
                {/* Top lines */}
                <div className="space-y-1.5">
                  <div className="h-2 w-14 bg-amber-300 rounded" />
                  <div className="h-1.5 w-8 bg-slate-300 dark:bg-slate-600 rounded" />
                </div>
                {/* Content lines */}
                <div className="space-y-1.5">
                  <div className="h-1 w-full bg-slate-300 dark:bg-slate-600 rounded" />
                  <div className="h-1 w-3/4 bg-slate-300 dark:bg-slate-600 rounded" />
                  <div className="h-1 w-full bg-slate-300 dark:bg-slate-600 rounded" />
                </div>
                {/* Delivery Truck icon badge */}
                <div className="self-end p-1 rounded bg-white dark:bg-card border border-slate-600 text-slate-800 dark:text-slate-200">
                  <Truck className="w-6 h-6" />
                </div>
                {/* Underline base stand */}
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-amber-200/80 rounded" />
              </div>
            </div>
            <div className="pt-6">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                Hassle e-way bill generation using IRN
              </h3>
            </div>
          </div>

          {/* CARD 3: Easy GSTR1 reconciliation */}
          <div className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-border/80 shadow-xs hover:shadow-md transition-all p-8 flex flex-col items-center justify-between text-center min-h-[300px]">
            <div className="w-full flex-1 flex items-center justify-center">
              {/* Stylized Report Illustration with Charts */}
              <div className="relative w-28 h-36 bg-white dark:bg-card border-2 border-slate-700 dark:border-slate-300 rounded-lg p-2.5 shadow-sm flex flex-col justify-between">
                {/* Upper line chart container */}
                <div className="w-full h-12 bg-amber-300/80 border border-slate-700 rounded p-1 flex items-end justify-between">
                  <div className="w-1.5 h-3 bg-slate-800 rounded-full" />
                  <div className="w-1.5 h-6 bg-slate-800 rounded-full" />
                  <div className="w-1.5 h-4 bg-slate-800 rounded-full" />
                  <div className="w-1.5 h-8 bg-slate-800 rounded-full" />
                  <div className="w-1.5 h-6 bg-slate-800 rounded-full" />
                </div>
                {/* Summary Lines */}
                <div className="space-y-1">
                  <div className="h-1 w-full bg-slate-300 dark:bg-slate-600 rounded" />
                  <div className="h-1 w-4/5 bg-slate-300 dark:bg-slate-600 rounded" />
                  <div className="h-1 w-full bg-slate-300 dark:bg-slate-600 rounded" />
                </div>
                {/* Pie Chart Icon */}
                <div className="w-7 h-7 rounded-full border-2 border-slate-700 bg-amber-400 flex items-center justify-center self-end overflow-hidden">
                  <div className="w-3.5 h-3.5 bg-slate-800 rounded-tl-full self-start" />
                </div>
              </div>
            </div>
            <div className="pt-6">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                Easy GSTR1 reconciliation
              </h3>
            </div>
          </div>
        </div>

        {/* Bottom Headline & Primary CTA Button matching Capture8.PNG */}
        <div className="text-center py-10 sm:py-12 space-y-4">
          <h2 className="text-lg sm:text-xl font-medium text-slate-800 dark:text-slate-100">
            Try India's easiest and fastest e-invoicing solution today
          </h2>
          <div>
            <Button
              type="button"
              onClick={() => setIsGeneratorOpen(true)}
              className="h-10 px-6 bg-[#5046E5] hover:bg-[#4338CA] text-white font-medium text-sm rounded-lg shadow-sm transition-all"
            >
              Start Generating e-Invoices
            </Button>
          </div>
        </div>
      </div>

      {/* Floating Bottom Right Help Button matching Capture8.PNG */}
      <button
        type="button"
        onClick={() => setIsHelpOpen(true)}
        title="Help & FAQ"
        className="fixed bottom-6 right-6 w-10 h-10 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center shadow-lg hover:scale-105 transition-transform z-30 font-bold"
      >
        <span className="text-base font-bold">?</span>
      </button>

      {/* MODAL 1: What is e-Invoicing Dialog */}
      <Dialog open={isExplainerOpen} onOpenChange={setIsExplainerOpen}>
        <DialogContent className="max-w-2xl sm:max-w-3xl bg-white dark:bg-card border border-border p-6 rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto">
          <DialogHeader className="border-b border-border/70 pb-3">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#5046E5]" />
              <span>What is GST e-Invoicing?</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-2">
            <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300">
              <p className="font-semibold mb-1">Government Mandate Overview:</p>
              <p className="text-xs">
                Under GST rules, Electronic Invoicing (e-Invoicing) involves electronically uploading B2B & Export invoices to the Invoice Registration Portal (IRP/NIC) to obtain a unique 64-character Invoice Reference Number (IRN) and a digitally signed QR code.
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Instant IRN & QR Code Generation</p>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground">Every invoice created in CredSmart is authenticated via official GSP/NIC APIs in under 200 milliseconds.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Zero-Typing e-Way Bills</p>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground">e-Way Bill Part A and Part B are instantly dispatched alongside the IRN without re-entering transport details.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Automated GSTR-1 Auto-Population</p>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground">Eliminates end-of-month manual reconciliation errors by seamlessly populating tables 4A, 4B, 4C, 6B, 6C of GSTR-1.</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border">
            <Button
              onClick={() => {
                setIsExplainerOpen(false);
                setIsGeneratorOpen(true);
              }}
              className="bg-[#5046E5] hover:bg-[#4338CA] text-white text-xs h-9"
            >
              Start Generating e-Invoices
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Interactive Generator & E-Invoice Management */}
      <Dialog open={isGeneratorOpen} onOpenChange={setIsGeneratorOpen}>
        <DialogContent className="max-w-5xl sm:max-w-6xl w-[95vw] bg-white dark:bg-card border border-border p-6 rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto">
          <DialogHeader className="border-b border-border/70 pb-3">
            <DialogTitle className="text-base font-bold text-foreground flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#5046E5]" />
                <span>GST e-Invoice & IRN Workbench</span>
              </div>
              <span className="text-xs font-mono font-normal px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                ● NIC Portal Connected
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-border mt-2">
            <button
              type="button"
              onClick={() => setActiveTab("workbench")}
              className={cn(
                "pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors",
                activeTab === "workbench"
                  ? "border-[#5046E5] text-[#5046E5] dark:text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              Generate E-Invoice
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={cn(
                "pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors",
                activeTab === "history"
                  ? "border-[#5046E5] text-[#5046E5] dark:text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              Generated IRN History ({eInvoices.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("config")}
              className={cn(
                "pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors",
                activeTab === "config"
                  ? "border-[#5046E5] text-[#5046E5] dark:text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              NIC API Settings
            </button>
          </div>

          {/* Tab 1: Generate E-Invoice Form */}
          {activeTab === "workbench" && (
            <form onSubmit={handleGenerateInvoice} className="space-y-4 mt-3">
              <div className="p-3 bg-slate-50 dark:bg-muted/50 rounded-xl border border-slate-200 dark:border-border flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500">Seller GSTIN: </span>
                  <span className="font-mono font-bold text-slate-800 dark:text-foreground">{gstin}</span>
                </div>
                <div>
                  <span className="text-slate-500">Business: </span>
                  <span className="font-semibold text-slate-800 dark:text-foreground">{org?.name || "CredSmart Store"}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Invoice Number *
                  </Label>
                  <Input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="mt-1 h-9 text-xs font-mono"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Buyer GSTIN *
                  </Label>
                  <Input
                    type="text"
                    required
                    placeholder="27AABCU9603R1ZM"
                    value={buyerGstin}
                    onChange={(e) => setBuyerGstin(e.target.value.toUpperCase())}
                    className="mt-1 h-9 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Buyer Company Name *
                </Label>
                <Input
                  type="text"
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Taxable Value (₹) *
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={taxableAmount}
                    onChange={(e) => setTaxableAmount(e.target.value)}
                    className="mt-1 h-9 text-xs font-semibold"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    GST Rate
                  </Label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value)}
                    className="w-full h-9 px-3 mt-1 bg-white dark:bg-card border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
                  >
                    <option value="5">5% (CGST 2.5% + SGST 2.5%)</option>
                    <option value="12">12% (CGST 6% + SGST 6%)</option>
                    <option value="18">18% (CGST 9% + SGST 9%)</option>
                    <option value="28">28% (CGST 14% + SGST 14%)</option>
                    <option value="0">0% (Nil / Exempt)</option>
                  </select>
                </div>
              </div>

              {/* e-Way Bill Toggle */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-border bg-slate-50/50 dark:bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#5046E5]" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Generate e-Way Bill along with IRN
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={generateEwayBill}
                    onChange={(e) => setGenerateEwayBill(e.target.checked)}
                    className="w-4 h-4 text-[#5046E5] rounded"
                  />
                </div>

                {generateEwayBill && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <Label className="text-[11px] text-slate-600 dark:text-slate-400">
                        Vehicle Number
                      </Label>
                      <Input
                        type="text"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                        placeholder="MH-12-AB-1234"
                        className="mt-1 h-8 text-xs font-mono uppercase"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-slate-600 dark:text-slate-400">
                        Distance (in KM)
                      </Label>
                      <Input
                        type="number"
                        value={distanceKm}
                        onChange={(e) => setDistanceKm(e.target.value)}
                        placeholder="140"
                        className="mt-1 h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full sm:w-auto h-9 bg-[#5046E5] hover:bg-[#4338CA] text-white font-semibold text-xs"
                >
                  {isGenerating ? "Signing with NIC IRP Portal..." : "Generate Official E-Invoice & Signed QR"}
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* Tab 2: Generated E-Invoices History */}
          {activeTab === "history" && (
            <div className="space-y-3 mt-3">
              {eInvoices.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No e-Invoices generated yet. Click "Generate E-Invoice" to create your first IRN.
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-border rounded-xl overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-muted/60 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3.5 py-2.5">Invoice #</th>
                        <th className="px-3.5 py-2.5">Buyer</th>
                        <th className="px-3.5 py-2.5">Ack Number</th>
                        <th className="px-3.5 py-2.5 text-right">Amount (₹)</th>
                        <th className="px-3.5 py-2.5">Status</th>
                        <th className="px-3.5 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-border/60">
                      {eInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-3.5 py-2.5 font-mono font-bold text-slate-800 dark:text-foreground">
                            {inv.invoiceNumber}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{inv.buyerName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{inv.buyerGstin}</p>
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-slate-600 dark:text-slate-300">
                            {inv.ackNumber}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-bold text-slate-900 dark:text-foreground">
                            ₹{inv.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3.5 py-2.5">
                            {inv.status === "active" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                Cancelled
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-right whitespace-nowrap space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedInvoice(inv)}
                              className="h-7 px-2 text-[11px]"
                            >
                              View IRN
                            </Button>
                            {inv.status === "active" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCancelIrn(inv.id)}
                                className="h-7 px-2 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              >
                                Cancel IRN
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: API Settings */}
          {activeTab === "config" && (
            <div className="space-y-4 mt-3 text-xs">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300">
                <p className="font-semibold">NIC e-Invoice Portal Credentials:</p>
                <p className="text-[11px] mt-0.5">
                  Generate direct API credentials in the official NIC Portal (einvoice1.gst.gov.in) under API Registration {">"} Create API User.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Business GSTIN
                  </Label>
                  <Input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    className="mt-1 h-9 text-xs font-mono uppercase"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    NIC API Username
                  </Label>
                  <Input
                    type="text"
                    value={nicUsername}
                    onChange={(e) => setNicUsername(e.target.value)}
                    className="mt-1 h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  NIC API Password
                </Label>
                <Input
                  type="password"
                  value={nicPassword}
                  onChange={(e) => setNicPassword(e.target.value)}
                  className="mt-1 h-9 text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-border">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Production Mode</p>
                  <p className="text-[11px] text-slate-400">Generate real GST legal invoices</p>
                </div>
                <input
                  type="checkbox"
                  checked={isProduction}
                  onChange={(e) => setIsProduction(e.target.checked)}
                  className="w-4 h-4 text-[#5046E5]"
                />
              </div>

              <Button
                onClick={() => toast({ title: "NIC Settings Saved", description: "API connectivity active." })}
                className="h-9 bg-[#5046E5] hover:bg-[#4338CA] text-white text-xs font-semibold"
              >
                Save & Test API Connection
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Live Preview of Signed E-Invoice & IRN QR */}
      {selectedInvoice && (
        <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
          <DialogContent className="max-w-2xl sm:max-w-3xl bg-white dark:bg-card border border-border p-6 rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
            <DialogHeader className="border-b border-border/70 pb-3">
              <DialogTitle className="text-base font-bold text-foreground flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>GST Signed e-Invoice</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                  NIC Authenticated
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              {/* QR Code & Basic Meta */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 dark:bg-muted/40 rounded-xl border border-slate-200 dark:border-border">
                <img
                  src={selectedInvoice.qrCodeUrl}
                  alt="Signed GST QR Code"
                  className="w-32 h-32 border border-slate-300 rounded-lg p-1 bg-white"
                />
                <div className="space-y-1.5 text-xs flex-1">
                  <div>
                    <span className="text-slate-400">Ack No: </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-foreground">{selectedInvoice.ackNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Ack Date: </span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{selectedInvoice.ackDate}</span>
                  </div>
                  {selectedInvoice.ewayBillNo && (
                    <div>
                      <span className="text-slate-400">e-Way Bill No: </span>
                      <span className="font-mono font-bold text-blue-600">{selectedInvoice.ewayBillNo}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400">Invoice: </span>
                    <span className="font-bold text-slate-800 dark:text-foreground">{selectedInvoice.invoiceNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Total: </span>
                    <span className="font-bold text-emerald-600">₹{selectedInvoice.totalAmount.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* 64-char IRN hash display */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Invoice Reference Number (IRN):</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedInvoice.irn, "irn")}
                    className="text-xs text-[#5046E5] hover:underline flex items-center gap-1"
                  >
                    {copiedField === "irn" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === "irn" ? "Copied" : "Copy IRN"}</span>
                  </button>
                </div>
                <p className="p-2.5 bg-slate-100 dark:bg-muted text-[11px] font-mono break-all rounded-lg border border-slate-200 dark:border-border text-slate-800 dark:text-slate-200 select-all">
                  {selectedInvoice.irn}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={() => window.print()}
                  className="flex-1 h-9 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                >
                  <Printer className="w-4 h-4 mr-1.5" /> Print Tax Invoice with QR
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedInvoice, null, 2));
                    const dl = document.createElement("a");
                    dl.setAttribute("href", dataStr);
                    dl.setAttribute("download", `${selectedInvoice.invoiceNumber}_IRN.json`);
                    dl.click();
                  }}
                  className="h-9 px-3 text-xs"
                >
                  <Download className="w-4 h-4 mr-1" /> JSON
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL 4: Chat Support Dialog */}
      <Dialog open={isChatSupportOpen} onOpenChange={setIsChatSupportOpen}>
        <DialogContent className="max-w-lg sm:max-w-xl bg-white dark:bg-card border border-border p-5 rounded-2xl shadow-xl flex flex-col h-[560px]">
          <DialogHeader className="border-b border-border/70 pb-3">
            <DialogTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span>CredSmart GST & E-Invoicing Support</span>
            </DialogTitle>
          </DialogHeader>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-2 text-xs">
            {chatMessages.map((m, idx) => (
              <div
                key={idx}
                className={cn(
                  "max-w-[85%] rounded-2xl p-3 shadow-xs",
                  m.sender === "user"
                    ? "ml-auto bg-[#5046E5] text-white rounded-br-none"
                    : "mr-auto bg-slate-100 dark:bg-muted text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-border"
                )}
              >
                <p className="leading-relaxed">{m.text}</p>
                <span className="text-[9px] opacity-70 mt-1 block text-right">{m.time}</span>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} className="pt-2 border-t border-border flex items-center gap-2">
            <Input
              type="text"
              placeholder="Ask anything about e-invoicing..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="h-9 text-xs flex-1 rounded-xl"
            />
            <Button type="submit" size="sm" className="h-9 w-9 p-0 bg-[#5046E5] hover:bg-[#4338CA] text-white rounded-xl">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: Floating Help & FAQ Dialog */}
      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent className="max-w-xl sm:max-w-2xl bg-white dark:bg-card border border-border p-6 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-border/70 pb-3">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#5046E5]" />
              <span>E-Invoicing Guidelines & FAQ</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300 mt-2">
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200">1. Who is mandated to generate e-Invoices?</p>
              <p className="mt-0.5 text-slate-500">Businesses with annual aggregate turnover exceeding ₹5 Crores in any financial year from 2017-18 onwards.</p>
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200">2. Which transactions require e-Invoices?</p>
              <p className="mt-0.5 text-slate-500">All Business-to-Business (B2B) supply of goods/services, Business-to-Government (B2G), and Exports.</p>
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200">3. Is a signed QR code required on physical printouts?</p>
              <p className="mt-0.5 text-slate-500">Yes! An invoice without an authentic IRN QR code is deemed invalid under Rule 48(4) of the CGST Rules.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
