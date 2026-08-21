import { useState, useRef, useEffect } from "react";
import {
  Printer,
  ScanBarcode,
  Scale,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Receipt,
  FileText,
  Plus,
  Store,
  Upload,
  Save,
  Building2,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Percent,
  Hash,
  Sparkles,
  Trash2,
  CheckCircle2,
  Layers,
  Sliders,
  Cpu,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableReceiptItem } from "@/components/SortableReceiptItem";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const receiptFormats = [
  { id: "58mm", label: "58mm Thermal Receipt", icon: Receipt, width: "220px" },
  { id: "80mm", label: "80mm Standard POS", icon: Receipt, width: "300px" },
  { id: "a4", label: "Full A4 Tax Invoice", icon: FileText, width: "100%" },
];

const allReceiptComponents = [
  "Store Logo",
  "Store Name & Address",
  "Date & Time",
  "Items Table",
  "Tax Breakdown",
  "Total Amount",
  "Payment Method",
  "UPI QR Code",
  "Footer Message",
  "Barcode",
];

type SettingsTab = "business" | "hardware" | "receipt";

export default function SettingsPage() {
  const { org, orgId, refresh } = useOrganization();
  const [activeTab, setActiveTab] = useState<SettingsTab>("business");

  // Business details form
  const [storeName, setStoreName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [invoicePrefix, setInvoicePrefix] = useState("");
  const [receiptFooter, setReceiptFooter] = useState(() => {
    return localStorage.getItem("pos_receipt_footer") || "Thank you for your purchase! Visit again.";
  });
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize form from org data in useEffect to avoid render loops
  useEffect(() => {
    if (org && !initialized) {
      setStoreName(org.name || "");
      setAddress(org.address || "");
      setPhone(org.phone || "");
      setEmail(org.email || "");
      setGstin(org.gstin || "");
      setPan(org.pan || "");
      setTaxRate(String(org.tax_rate ?? 18));
      setInvoicePrefix(org.invoice_prefix || "INV");
      setLogoPreview(org.logo_url || "");
      setInitialized(true);
    }
  }, [org, initialized]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 2MB", variant: "destructive" });
      return;
    }

    try {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    } catch (err) {
      console.error("handleLogoChange failed:", err);
      toast({ title: "Error", description: "Could not load selected file", variant: "destructive" });
    }
  };

  const handleSaveBusinessDetails = async () => {
    if (!orgId) return;
    setSaving(true);

    try {
      let logoUrl = org?.logo_url || "";

      // Upload logo if changed
      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `${orgId}/logo.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("store-logos")
          .upload(path, logoFile, { upsert: true });
        if (uploadError) {
          console.warn("Storage upload failed (bucket store-logos may require public RLS):", uploadError.message);
        } else {
          const { data: urlData } = supabase.storage.from("store-logos").getPublicUrl(path);
          if (urlData?.publicUrl) {
            logoUrl = urlData.publicUrl;
          }
        }
      }

      const { error } = await supabase
        .from("organizations")
        .update({
          name: storeName.trim(),
          address: address.trim(),
          phone: phone.trim(),
          email: email.trim(),
          gstin: gstin.trim().toUpperCase(),
          pan: pan.trim().toUpperCase(),
          tax_rate: parseFloat(taxRate) || 18,
          invoice_prefix: invoicePrefix.trim() || "INV",
          logo_url: logoUrl,
        })
        .eq("id", orgId);

      if (error) throw error;

      // Save receipt footer locally
      localStorage.setItem("pos_receipt_footer", receiptFooter.trim());

      await refresh();
      setLogoFile(null);
      toast({ title: "Business details saved successfully!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Hardware & Peripherals state
  const [selectedFormat, setSelectedFormat] = useState(() => {
    try {
      const saved = localStorage.getItem("pos_receipt_designer_settings");
      return saved ? JSON.parse(saved).format || "80mm" : "80mm";
    } catch {
      return "80mm";
    }
  });

  const [autoEnter, setAutoEnter] = useState(() => {
    try {
      const saved = localStorage.getItem("pos_hardware_settings");
      return saved ? JSON.parse(saved).autoEnter ?? true : true;
    } catch {
      return true;
    }
  });

  const [comPort, setComPort] = useState(() => {
    try {
      const saved = localStorage.getItem("pos_hardware_settings");
      return saved ? JSON.parse(saved).comPort || "COM3 (Active)" : "COM3 (Active)";
    } catch {
      return "COM3 (Active)";
    }
  });

  const [cashDrawer, setCashDrawer] = useState(() => {
    try {
      const saved = localStorage.getItem("pos_hardware_settings");
      return saved ? JSON.parse(saved).cashDrawer ?? false : false;
    } catch {
      return false;
    }
  });

  const [receiptPrinter, setReceiptPrinter] = useState(() => {
    try {
      const saved = localStorage.getItem("pos_hardware_settings");
      return saved ? JSON.parse(saved).receiptPrinter || "Epson TM-T82II (Default)" : "Epson TM-T82II (Default)";
    } catch {
      return "Epson TM-T82II (Default)";
    }
  });

  const [activeComponents, setActiveComponents] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("pos_receipt_designer_settings");
      return saved ? JSON.parse(saved).components || [
        "Store Name & Address",
        "Date & Time",
        "Items Table",
        "Tax Breakdown",
        "Total Amount",
        "Payment Method",
        "Footer Message",
      ] : [
        "Store Name & Address",
        "Date & Time",
        "Items Table",
        "Tax Breakdown",
        "Total Amount",
        "Payment Method",
        "Footer Message",
      ];
    } catch {
      return [
        "Store Name & Address",
        "Date & Time",
        "Items Table",
        "Tax Breakdown",
        "Total Amount",
        "Payment Method",
        "Footer Message",
      ];
    }
  });

  const handleSaveHardware = () => {
    try {
      localStorage.setItem(
        "pos_hardware_settings",
        JSON.stringify({
          autoEnter,
          comPort,
          cashDrawer,
          receiptPrinter,
        })
      );
      toast({ title: "Hardware preferences saved!" });
    } catch (err: any) {
      toast({ title: "Error saving hardware settings", description: err.message, variant: "destructive" });
    }
  };

  const handleSaveReceiptLayout = () => {
    try {
      localStorage.setItem(
        "pos_receipt_designer_settings",
        JSON.stringify({
          format: selectedFormat,
          components: activeComponents,
        })
      );
      localStorage.setItem("pos_receipt_footer", receiptFooter.trim());
      toast({ title: "Receipt layout saved!" });
    } catch (err: any) {
      toast({ title: "Error saving layout", description: err.message, variant: "destructive" });
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setActiveComponents((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addComponent = (comp: string) => {
    if (!activeComponents.includes(comp)) {
      setActiveComponents((prev) => [...prev, comp]);
    }
  };

  const removeComponent = (comp: string) => {
    setActiveComponents((prev) => prev.filter((c) => c !== comp));
  };

  const availableToAdd = allReceiptComponents.filter(
    (c) => !activeComponents.includes(c)
  );

  const tabs = [
    { id: "business" as SettingsTab, label: "Business Details", icon: Building2, desc: "Store profile, tax IDs & logo" },
    { id: "hardware" as SettingsTab, label: "Hardware & Peripherals", icon: Cpu, desc: "Scanners, COM scale & printers" },
    { id: "receipt" as SettingsTab, label: "Receipt Designer", icon: Receipt, desc: "Format, thermal layout & branding" },
  ];

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 py-6 sm:px-8 sm:py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Store className="w-7 h-7 text-primary" />
            Store Settings & Preferences
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure business identity, POS hardware integration, and invoice templates
          </p>
        </div>
      </div>

      {/* Pill-style Tab Navigation */}
      <div className="flex p-1.5 bg-muted/60 rounded-2xl border border-border/60 gap-1.5 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap",
              activeTab === tab.id
                ? "bg-card text-foreground shadow-sm border border-border/80"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-primary" : "text-muted-foreground")} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Business Details */}
      {activeTab === "business" && (
        <div className="max-w-4xl space-y-6 animate-fade-in">
          {/* Card: Brand & Logo */}
          <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-border/60 pb-4">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-foreground text-base">Store Identity & Branding</h2>
                <p className="text-xs text-muted-foreground">Upload your store logo and basic profile details</p>
              </div>
            </div>

            {/* Logo Upload Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 rounded-2xl bg-muted/30 border border-border/60">
              <div
                onClick={() => logoInputRef.current?.click()}
                className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-border bg-card flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden group shrink-0 shadow-sm"
              >
                {logoPreview ? (
                  <>
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-semibold transition-opacity">
                      Change Logo
                    </div>
                  </>
                ) : (
                  <div className="text-center p-2">
                    <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-medium text-muted-foreground">Upload Logo</span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">Official Store Logo</p>
                <p className="text-xs text-muted-foreground max-w-md">
                  Recommended size: 400x400 PNG or JPEG (Max 2MB). This logo is printed on thermal receipts and PDF invoices.
                </p>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  className="mt-2 text-xs h-8 rounded-lg gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {logoPreview ? "Replace Logo" : "Choose File"}
                </Button>
              </div>
            </div>

            {/* General Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Store / Business Name *
                </Label>
                <Input
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="e.g. CredSmart Supermarket"
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Invoice Number Prefix
                </Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                    placeholder="INV"
                    className="pl-9 h-10 rounded-xl font-mono uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Support Phone
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="pl-9 h-10 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Support Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@credsmart.in"
                    className="pl-9 h-10 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Receipt Footer Message / Slogan
                </Label>
                <Input
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  placeholder="e.g. Thank you for your purchase! Visit again."
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Full Store Address
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street address, Market area, City, State, PIN Code"
                    rows={1}
                    className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Tax & Compliance */}
          <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-border/60 pb-4">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-foreground text-base">GST, Tax & Compliance</h2>
                <p className="text-xs text-muted-foreground">Tax identification numbers printed on invoices</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  GSTIN
                </Label>
                <Input
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="29AAAAA0000A1Z5"
                  className="h-10 rounded-xl font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  PAN
                </Label>
                <Input
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  placeholder="AAAAA0000A"
                  className="h-10 rounded-xl font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Default Tax Rate (%)
                </Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    placeholder="18"
                    className="pl-9 h-10 rounded-xl font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                onClick={handleSaveBusinessDetails}
                disabled={saving || !storeName.trim()}
                className="h-11 px-8 rounded-xl font-semibold gap-2 shadow-sm"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Store Settings
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Hardware & Peripherals */}
      {activeTab === "hardware" && (
        <div className="max-w-4xl space-y-6 animate-fade-in">
          <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-border/60 pb-4">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-foreground text-base">Connected POS Peripherals</h2>
                <p className="text-xs text-muted-foreground">Configure barcode scanners, weighing scales, and cash drawers</p>
              </div>
            </div>

            {/* Scanner config */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-muted/20 border border-border/60">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <ScanBarcode className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Auto-Enter for Barcode Scanners</p>
                  <p className="text-xs text-muted-foreground">
                    Automatically triggers item add immediately upon reading EAN/UPC barcode signal
                  </p>
                </div>
              </div>
              <button onClick={() => setAutoEnter(!autoEnter)} className="self-end sm:self-auto text-primary">
                {autoEnter ? <ToggleRight className="w-9 h-9 text-primary" /> : <ToggleLeft className="w-9 h-9 text-muted-foreground" />}
              </button>
            </div>

            {/* Weighing scale */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-muted/20 border border-border/60">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Digital Weighing Scale COM Port</p>
                  <p className="text-xs text-muted-foreground">
                    Live serial RS232/USB communication for real-time item tare and weight measurement
                  </p>
                </div>
              </div>
              <select
                value={comPort}
                onChange={(e) => setComPort(e.target.value)}
                className="h-10 px-3.5 rounded-xl border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 sm:w-44 w-full"
              >
                <option value="COM3 (Active)">COM3 (Active)</option>
                <option value="COM4">COM4</option>
                <option value="COM5">COM5</option>
                <option value="Disabled">Disabled</option>
              </select>
            </div>

            {/* Cash drawer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-muted/20 border border-border/60">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Auto Cash Drawer Kick</p>
                  <p className="text-xs text-muted-foreground">
                    Sends RJ11/RJ12 drawer pulse signal automatically when cash billing is confirmed
                  </p>
                </div>
              </div>
              <button onClick={() => setCashDrawer(!cashDrawer)} className="self-end sm:self-auto text-primary">
                {cashDrawer ? <ToggleRight className="w-9 h-9 text-primary" /> : <ToggleLeft className="w-9 h-9 text-muted-foreground" />}
              </button>
            </div>

            {/* Thermal receipt printer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-muted/20 border border-border/60">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Thermal Receipt Printer</p>
                  <p className="text-xs text-muted-foreground">
                    Target ESC/POS printer device for high-speed printing
                  </p>
                </div>
              </div>
              <select
                value={receiptPrinter}
                onChange={(e) => setReceiptPrinter(e.target.value)}
                className="h-10 px-3.5 rounded-xl border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 sm:w-56 w-full"
              >
                <option value="Epson TM-T82II (Default)">Epson TM-T82II (Default)</option>
                <option value="Star Micronics TSP143">Star Micronics TSP143</option>
                <option value="TVS Electronics RP-3200">TVS Electronics RP-3200</option>
                <option value="Generic ESC/POS Thermal">Generic ESC/POS Thermal</option>
              </select>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                onClick={handleSaveHardware}
                className="h-11 px-8 rounded-xl font-semibold gap-2 shadow-sm"
              >
                <Save className="w-4 h-4" />
                Save Hardware Preferences
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Receipt Designer */}
      {activeTab === "receipt" && (
        <div className="max-w-4xl space-y-6 animate-fade-in">
          {/* Format selection */}
          <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-border/60 pb-4">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-foreground text-base">Receipt Format & Structure</h2>
                <p className="text-xs text-muted-foreground">Choose paper format and arrange visual components</p>
              </div>
            </div>

            {/* Format pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {receiptFormats.map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => setSelectedFormat(fmt.id)}
                  className={cn(
                    "p-4 rounded-2xl border text-left transition-all flex items-center gap-3",
                    selectedFormat === fmt.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/40 bg-background"
                  )}
                >
                  <div
                    className={cn(
                      "p-2.5 rounded-xl",
                      selectedFormat === fmt.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <fmt.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm">{fmt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Width: {fmt.width}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Available to Add palette */}
            {availableToAdd.length > 0 && (
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-2.5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Available Components Palette (Click to Add):
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableToAdd.map((comp) => (
                    <button
                      key={comp}
                      onClick={() => addComponent(comp)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-card border border-border hover:border-primary text-foreground hover:text-primary transition-colors shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5 text-primary" />
                      {comp}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Live Paper Preview Card */}
            <div className="p-6 rounded-2xl bg-muted/40 border border-border/80 flex flex-col items-center">
              <Badge variant="outline" className="mb-4 bg-background text-xs font-semibold gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" /> Live Thermal Layout ({selectedFormat}) — Drag to Reorder
              </Badge>

              <div
                className={cn(
                  "bg-white dark:bg-slate-900 border-2 border-dashed border-border rounded-2xl shadow-lg p-3 transition-all",
                  selectedFormat === "58mm" ? "w-[240px]" : selectedFormat === "80mm" ? "w-[320px]" : "w-full max-w-xl"
                )}
              >
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={activeComponents} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {activeComponents.map((comp) => (
                        <SortableReceiptItem
                          key={comp}
                          id={comp}
                          label={comp}
                          onRemove={() => removeComponent(comp)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                {activeComponents.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    No components added yet. Select components from the palette above to construct your receipt.
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                onClick={handleSaveReceiptLayout}
                className="h-11 px-8 rounded-xl font-semibold gap-2 shadow-sm"
              >
                <Save className="w-4 h-4" />
                Save Receipt Layout
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
