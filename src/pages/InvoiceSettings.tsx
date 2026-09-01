import { useState, useEffect } from "react";
import {
  Save,
  Check,
  ChevronDown,
  ChevronUp,
  Trash2,
  Info,
  Palette,
  Eye,
  Sliders,
  ShieldCheck,
} from "lucide-react";
import { SettingsNavSidebar } from "@/components/settings/SettingsNavSidebar";
import { LiveInvoicePreview } from "@/components/settings/LiveInvoicePreview";
import { SignaturePad } from "@/components/settings/SignaturePad";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InvoiceSettingsState,
  COLOR_SWATCHES,
  INDUSTRY_TYPES,
  CustomField,
  CustomColumn,
} from "@/types/invoice-settings";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "credsmart_invoice_settings";

const defaultInitialSettings: InvoiceSettingsState = {
  theme: "advanced_gst",
  styling: "classic",
  primaryColor: "#0284C7", // Royal Blue default
  showPartyBalance: true,
  enableFreeQty: false,
  showItemDescription: true,
  showAlternateUnit: false,
  showPhoneNumber: true,
  showTimestamp: false,
  priceHistory: false,
  autoApplyLuxury: false,

  industryType: "General",
  showPoNumber: false,
  poNumber: "",
  showEwayBill: false,
  ewayBillNumber: "",
  showVehicleNumber: false,
  vehicleNumber: "",
  invoiceCustomFields: [],

  partyCustomFields: [],

  columns: {
    pricePerItem: true,
    quantity: true,
    batchNo: false,
    expDate: false,
    mfgDate: false,
    customColumns: [],
  },

  selectedBankAccountId: "",
  bankAccounts: [],
  selectedPaymentQrUpi: "",
  termsAndConditionsType: "Sales Invoices",
  termsAndConditions: {
    "Sales Invoices":
      "1. Goods once sold will not be taken back or exchanged.\n2. All disputes are subject to local jurisdiction only.\n3. This is a computer generated invoice.",
    Quotations:
      "1. Quotation valid for 15 days from the date of issue.\n2. 50% advance along with confirmed purchase order.",
    "Delivery Challans":
      "1. Goods dispatched in good condition.\n2. Please sign duplicate copy as acknowledgment of receipt.",
  },
  signatureMode: "upload",
  signatureDataUrl: "",
  signatoryTitle: "Authorized Signatory",
};

export default function InvoiceSettings() {
  const { org } = useOrganization();
  const [settings, setSettings] = useState<InvoiceSettingsState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaultInitialSettings, ...JSON.parse(saved) } : defaultInitialSettings;
    } catch {
      return defaultInitialSettings;
    }
  });

  const [saving, setSaving] = useState(false);
  const [mobileTab, setMobileTab] = useState<"customize" | "preview">("customize");

  // Accordion Sections State
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    themeSettings: true,
    invoiceDetails: false,
    partyDetails: false,
    itemColumns: false,
    miscellaneous: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Sync with localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  const updateSetting = <K extends keyof InvoiceSettingsState>(key: K, val: InvoiceSettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  const updateColumns = (key: keyof InvoiceSettingsState["columns"], val: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    setSettings((prev) => ({
      ...prev,
      columns: {
        ...prev.columns,
        [key]: val,
      },
    }));
  };

  const handleSave = () => {
    setSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      toast({
        title: "Invoice Settings Saved!",
        description: "Your master invoice customization and brand settings are active across all bills.",
      });
    } catch (err: unknown) {
      toast({
        title: "Error saving settings",
        description: err instanceof Error ? err.message : "Failed to save",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Add custom invoice field
  const handleAddInvoiceField = () => {
    const newField: CustomField = {
      id: `inv_cf_${Date.now()}`,
      label: `Field ${settings.invoiceCustomFields.length + 1}`,
      value: "Sample Value",
    };
    updateSetting("invoiceCustomFields", [...settings.invoiceCustomFields, newField]);
  };

  const handleRemoveInvoiceField = (id: string) => {
    updateSetting(
      "invoiceCustomFields",
      settings.invoiceCustomFields.filter((f) => f.id !== id)
    );
  };

  // Add custom party field
  const handleAddPartyField = () => {
    const newField: CustomField = {
      id: `party_cf_${Date.now()}`,
      label: `Party Detail ${settings.partyCustomFields.length + 1}`,
      value: "Standard Delivery",
    };
    updateSetting("partyCustomFields", [...settings.partyCustomFields, newField]);
  };

  const handleRemovePartyField = (id: string) => {
    updateSetting(
      "partyCustomFields",
      settings.partyCustomFields.filter((f) => f.id !== id)
    );
  };

  // Add custom item table column
  const handleAddCustomColumn = () => {
    const newCol: CustomColumn = {
      id: `col_${Date.now()}`,
      label: `Col ${settings.columns.customColumns.length + 1}`,
      key: `custom_${Date.now()}`,
      defaultValue: "-",
    };
    updateColumns("customColumns", [...settings.columns.customColumns, newCol]);
  };

  const handleRemoveCustomColumn = (id: string) => {
    updateColumns(
      "customColumns",
      settings.columns.customColumns.filter((c) => c.id !== id)
    );
  };

  return (
    <div className="min-h-full h-auto lg:h-full flex flex-col p-2 sm:p-4 space-y-2 sm:space-y-3 overflow-y-auto lg:overflow-hidden max-w-[1700px] mx-auto w-full">
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 sm:gap-4 items-stretch overflow-visible lg:overflow-hidden">
        {/* Left Navigation Sidebar */}
        <div className="shrink-0 w-full lg:w-56 overflow-visible lg:overflow-y-auto">
          <SettingsNavSidebar activeItem="invoice" />
        </div>

        {/* Main Split-Screen Customizer Area */}
        <main className="flex-1 min-h-0 w-full glass-card-3d rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col overflow-hidden">
          {/* Top Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-sans">
                  Invoice Settings
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>MASTER GST STANDARD</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Single unified professional GST format with dual address, HSN tax matrix, and digital signature
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl glowing-btn-amber text-white font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
              >
                {saving ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
                <span>Save Changes</span>
              </button>
            </div>
          </div>

          {/* Mobile Tab Toggle (< xl) */}
          <div className="xl:hidden flex items-center p-1 bg-muted/60 rounded-xl border border-border/80 my-2 shrink-0">
            <button
              type="button"
              onClick={() => setMobileTab("customize")}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                mobileTab === "customize"
                  ? "bg-card text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sliders className="w-3.5 h-3.5 text-[#6366F1]" />
              <span>Customize Options</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("preview")}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                mobileTab === "preview"
                  ? "bg-[#6366F1] text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Invoice Preview</span>
            </button>
          </div>

          {/* Split-Screen: Live Preview Left (7 Cols) & Configuration Right (5 Cols) */}
          <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch overflow-hidden pt-1 sm:pt-2">
            {/* Left Column: Live Interactive Invoice Preview */}
            <div
              className={cn(
                "xl:col-span-7 h-full flex-col overflow-hidden min-h-[480px] xl:min-h-0",
                mobileTab === "preview" ? "flex" : "hidden xl:flex"
              )}
            >
              <div className="flex items-center justify-between px-1 pb-1.5 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-foreground">Live Invoice Preview</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Master Format • 1-Page Standard
                </span>
              </div>

              {/* Render Preview Component in Scrollable Viewport */}
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto rounded-xl border border-border/70 p-2 sm:p-3 bg-muted/20 scrollbar-thin">
                <LiveInvoicePreview
                  settings={settings}
                  businessName={org?.name || "Sharma Store"}
                  businessPhone={org?.phone || "+91 98765 43210"}
                  businessEmail={org?.email || "billing@sharmastore.in"}
                  businessAddress={org?.address || "812, Street 12, Ramra Nagar, Mumbai, Maharashtra"}
                  businessGstin={org?.gstin || "27AABCU5007R1Z12"}
                  businessLogo={org?.logo_url || ""}
                />
              </div>
            </div>

            {/* Right Column: Configuration Panels */}
            <div
              className={cn(
                "xl:col-span-5 h-full overflow-y-auto pr-0 sm:pr-1 space-y-3.5 scrollbar-thin",
                mobileTab === "customize" ? "block" : "hidden xl:block"
              )}
            >
              {/* Single Master Theme Banner & Color Customizer Card */}
              <div className="p-3.5 sm:p-4 rounded-2xl border border-border/90 bg-card shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Master Invoice Design Standard</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Active Everywhere
                  </span>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  CredSmart applies one single, high-fidelity Indian GST standard invoice layout across POS receipts, sales bills, and PDF downloads.
                </p>

                {/* Select Brand Color Swatches */}
                <div className="pt-2 border-t border-border/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Brand Color Accent</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{settings.primaryColor}</span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {COLOR_SWATCHES.map((swatch) => {
                      const isSelected =
                        settings.primaryColor.toLowerCase() === swatch.hex.toLowerCase();
                      return (
                        <button
                          key={swatch.id}
                          type="button"
                          onClick={() => updateSetting("primaryColor", swatch.hex)}
                          className={cn(
                            "w-full aspect-square rounded-lg transition-transform flex items-center justify-center shadow-xs cursor-pointer",
                            isSelected
                              ? "ring-2 ring-offset-2 ring-primary scale-110 shadow-sm"
                              : "hover:scale-105 opacity-90 hover:opacity-100"
                          )}
                          style={{ backgroundColor: swatch.hex }}
                          title={swatch.name}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Accordion 1: Theme Settings / Display Toggles */}
              <div className="rounded-2xl border border-border/90 bg-card overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleSection("themeSettings")}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Palette className="w-3.5 h-3.5 text-[#6366F1]" />
                    <span className="text-xs font-bold text-foreground">Display & Visibility Options</span>
                  </div>
                  {openSections.themeSettings ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>

                {openSections.themeSettings && (
                  <div className="p-4 pt-0 space-y-3 text-xs border-t border-border/60">
                    <div className="flex items-center space-x-2 pt-2">
                      <Checkbox
                        id="party-bal"
                        checked={settings.showPartyBalance}
                        onCheckedChange={(c) => updateSetting("showPartyBalance", Boolean(c))}
                      />
                      <label htmlFor="party-bal" className="font-medium text-foreground cursor-pointer">
                        Show customer / party balance in invoice
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="item-desc"
                        checked={settings.showItemDescription}
                        onCheckedChange={(c) => updateSetting("showItemDescription", Boolean(c))}
                      />
                      <label htmlFor="item-desc" className="font-medium text-foreground cursor-pointer">
                        Show item description in invoice table
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="alt-unit"
                        checked={settings.showAlternateUnit}
                        onCheckedChange={(c) => updateSetting("showAlternateUnit", Boolean(c))}
                      />
                      <label htmlFor="alt-unit" className="font-medium text-foreground cursor-pointer">
                        Show dual units & conversions (e.g. 1 Box = 24 Pcs)
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="phone-num"
                        checked={settings.showPhoneNumber}
                        onCheckedChange={(c) => updateSetting("showPhoneNumber", Boolean(c))}
                      />
                      <label htmlFor="phone-num" className="font-medium text-foreground cursor-pointer">
                        Show phone & contact numbers on invoice
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="show-time"
                          checked={settings.showTimestamp}
                          onCheckedChange={(c) => updateSetting("showTimestamp", Boolean(c))}
                        />
                        <label htmlFor="show-time" className="font-medium text-foreground cursor-pointer">
                          Show timestamp on invoices
                        </label>
                      </div>
                      <Info className="w-3.5 h-3.5 text-muted-foreground" title="Prints exact transaction time" />
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 2: Invoice Details */}
              <div className="rounded-2xl border border-border/90 bg-card overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleSection("invoiceDetails")}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/40 transition-colors"
                >
                  <span className="text-xs font-bold text-foreground">Document & Transport Metadata</span>
                  {openSections.invoiceDetails ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>

                {openSections.invoiceDetails && (
                  <div className="p-4 pt-0 space-y-3.5 text-xs border-t border-border/60">
                    <div className="space-y-1.5 pt-2">
                      <Label className="text-[11px] font-semibold text-muted-foreground">Industry Type</Label>
                      <Select
                        value={settings.industryType}
                        onValueChange={(val) => updateSetting("industryType", val)}
                      >
                        <SelectTrigger className="h-9 rounded-xl text-xs">
                          <SelectValue placeholder="Select Industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {INDUSTRY_TYPES.map((ind) => (
                            <SelectItem key={ind} value={ind} className="text-xs">
                              {ind}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* PO Number */}
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="po-num"
                          checked={settings.showPoNumber}
                          onCheckedChange={(c) => updateSetting("showPoNumber", Boolean(c))}
                        />
                        <label htmlFor="po-num" className="font-medium text-foreground cursor-pointer">
                          PO / Order Reference Number
                        </label>
                      </div>
                      {settings.showPoNumber && (
                        <Input
                          placeholder="PO-2026-902"
                          value={settings.poNumber}
                          onChange={(e) => updateSetting("poNumber", e.target.value)}
                          className="h-8 text-xs rounded-lg font-mono pl-3"
                        />
                      )}
                    </div>

                    {/* E-way Bill */}
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="eway-bill"
                          checked={settings.showEwayBill}
                          onCheckedChange={(c) => updateSetting("showEwayBill", Boolean(c))}
                        />
                        <label htmlFor="eway-bill" className="font-medium text-foreground cursor-pointer">
                          E-way Bill Number
                        </label>
                      </div>
                      {settings.showEwayBill && (
                        <Input
                          placeholder="EWB-881920391"
                          value={settings.ewayBillNumber}
                          onChange={(e) => updateSetting("ewayBillNumber", e.target.value)}
                          className="h-8 text-xs rounded-lg font-mono pl-3"
                        />
                      )}
                    </div>

                    {/* Vehicle Number */}
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="veh-num"
                          checked={settings.showVehicleNumber}
                          onCheckedChange={(c) => updateSetting("showVehicleNumber", Boolean(c))}
                        />
                        <label htmlFor="veh-num" className="font-medium text-foreground cursor-pointer">
                          Dispatch Vehicle Number
                        </label>
                      </div>
                      {settings.showVehicleNumber && (
                        <Input
                          placeholder="UK-07-AB-4491"
                          value={settings.vehicleNumber}
                          onChange={(e) => updateSetting("vehicleNumber", e.target.value)}
                          className="h-8 text-xs rounded-lg font-mono pl-3 uppercase"
                        />
                      )}
                    </div>

                    {/* Custom fields list */}
                    {settings.invoiceCustomFields.map((cf) => (
                      <div key={cf.id} className="flex items-center gap-2 bg-muted/40 p-2 rounded-xl border">
                        <Input
                          value={cf.label}
                          onChange={(e) => {
                            const updated = settings.invoiceCustomFields.map((f) =>
                              f.id === cf.id ? { ...f, label: e.target.value } : f
                            );
                            updateSetting("invoiceCustomFields", updated);
                          }}
                          className="h-7 text-xs rounded-lg w-1/3"
                          placeholder="Label"
                        />
                        <Input
                          value={cf.value}
                          onChange={(e) => {
                            const updated = settings.invoiceCustomFields.map((f) =>
                              f.id === cf.id ? { ...f, value: e.target.value } : f
                            );
                            updateSetting("invoiceCustomFields", updated);
                          }}
                          className="h-7 text-xs rounded-lg flex-1"
                          placeholder="Value"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveInvoiceField(cf.id)}
                          className="text-rose-500 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleAddInvoiceField}
                      className="text-xs font-semibold text-[#0284C7] hover:underline inline-flex items-center gap-1 pt-1 cursor-pointer"
                    >
                      + Add Custom Document Field
                    </button>
                  </div>
                )}
              </div>

              {/* Accordion 3: Party Details */}
              <div className="rounded-2xl border border-border/90 bg-card overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleSection("partyDetails")}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/40 transition-colors"
                >
                  <span className="text-xs font-bold text-foreground">Party & Consignee Details</span>
                  {openSections.partyDetails ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>

                {openSections.partyDetails && (
                  <div className="p-4 pt-0 space-y-3 text-xs border-t border-border/60">
                    {settings.partyCustomFields.map((pcf) => (
                      <div key={pcf.id} className="flex items-center gap-2 bg-muted/40 p-2 rounded-xl border mt-2">
                        <Input
                          value={pcf.label}
                          onChange={(e) => {
                            const updated = settings.partyCustomFields.map((f) =>
                              f.id === pcf.id ? { ...f, label: e.target.value } : f
                            );
                            updateSetting("partyCustomFields", updated);
                          }}
                          className="h-7 text-xs rounded-lg w-1/3"
                          placeholder="Label (e.g. DL No.)"
                        />
                        <Input
                          value={pcf.value}
                          onChange={(e) => {
                            const updated = settings.partyCustomFields.map((f) =>
                              f.id === pcf.id ? { ...f, value: e.target.value } : f
                            );
                            updateSetting("partyCustomFields", updated);
                          }}
                          className="h-7 text-xs rounded-lg flex-1"
                          placeholder="Value"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePartyField(pcf.id)}
                          className="text-rose-500 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleAddPartyField}
                      className="text-xs font-semibold text-[#0284C7] hover:underline inline-flex items-center gap-1 pt-2 cursor-pointer"
                    >
                      + Add Custom Party Field
                    </button>
                  </div>
                )}
              </div>

              {/* Accordion 4: Item Table Columns */}
              <div className="rounded-2xl border border-border/90 bg-card overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleSection("itemColumns")}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/40 transition-colors"
                >
                  <span className="text-xs font-bold text-foreground">Item Table Columns</span>
                  {openSections.itemColumns ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>

                {openSections.itemColumns && (
                  <div className="p-4 pt-0 space-y-3 text-xs border-t border-border/60">
                    <div className="flex items-center space-x-2 pt-2">
                      <Checkbox
                        id="col-rate"
                        checked={settings.columns.pricePerItem}
                        onCheckedChange={(c) => updateColumns("pricePerItem", Boolean(c))}
                      />
                      <label htmlFor="col-rate" className="font-medium text-foreground cursor-pointer">
                        Price/Item Rate (₹)
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="col-qty"
                        checked={settings.columns.quantity}
                        onCheckedChange={(c) => updateColumns("quantity", Boolean(c))}
                      />
                      <label htmlFor="col-qty" className="font-medium text-foreground cursor-pointer">
                        Quantity
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="col-batch"
                        checked={settings.columns.batchNo}
                        onCheckedChange={(c) => updateColumns("batchNo", Boolean(c))}
                      />
                      <label htmlFor="col-batch" className="font-medium text-foreground cursor-pointer">
                        Batch No.
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="col-exp"
                        checked={settings.columns.expDate}
                        onCheckedChange={(c) => updateColumns("expDate", Boolean(c))}
                      />
                      <label htmlFor="col-exp" className="font-medium text-foreground cursor-pointer">
                        Exp. Date
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="col-mfg"
                        checked={settings.columns.mfgDate}
                        onCheckedChange={(c) => updateColumns("mfgDate", Boolean(c))}
                      />
                      <label htmlFor="col-mfg" className="font-medium text-foreground cursor-pointer">
                        Mfg Date
                      </label>
                    </div>

                    {settings.columns.customColumns.map((cc) => (
                      <div key={cc.id} className="flex items-center gap-2 bg-muted/40 p-2 rounded-xl border">
                        <Input
                          value={cc.label}
                          onChange={(e) => {
                            const updated = settings.columns.customColumns.map((col) =>
                              col.id === cc.id ? { ...col, label: e.target.value } : col
                            );
                            updateColumns("customColumns", updated);
                          }}
                          className="h-7 text-xs rounded-lg flex-1"
                          placeholder="Column Name"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomColumn(cc.id)}
                          className="text-rose-500 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleAddCustomColumn}
                      className="text-xs font-semibold text-[#0284C7] hover:underline inline-flex items-center gap-1 pt-1 cursor-pointer"
                    >
                      + Add Custom Column
                    </button>
                  </div>
                )}
              </div>

              {/* Accordion 5: Bank, UPI QR, Terms & Signature */}
              <div className="rounded-2xl border border-border/90 bg-card overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleSection("miscellaneous")}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/40 transition-colors"
                >
                  <span className="text-xs font-bold text-foreground">Bank, UPI QR, Terms &amp; Signature</span>
                  {openSections.miscellaneous ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>

                {openSections.miscellaneous && (
                  <div className="p-4 pt-0 space-y-4 text-xs border-t border-border/60">
                    {/* Bank Account */}
                    <div className="space-y-1.5 pt-2">
                      <Label className="text-[11px] font-semibold text-muted-foreground">Default Bank Account</Label>
                      <Select
                        value={settings.selectedBankAccountId}
                        onValueChange={(val) => updateSetting("selectedBankAccountId", val)}
                      >
                        <SelectTrigger className="h-9 rounded-xl text-xs">
                          <SelectValue placeholder="Select Business Bank Account" />
                        </SelectTrigger>
                        <SelectContent>
                          {settings.bankAccounts.map((b) => (
                            <SelectItem key={b.id} value={b.id} className="text-xs">
                              {b.bankName} ({b.accountNumber.slice(-4)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Payment QR */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold text-muted-foreground">Default UPI ID for QR Code</Label>
                      <Input
                        value={settings.selectedPaymentQrUpi}
                        onChange={(e) => updateSetting("selectedPaymentQrUpi", e.target.value)}
                        placeholder="yourname@okbank"
                        className="h-9 rounded-xl font-mono text-xs"
                      />
                    </div>

                    {/* Terms and Conditions Editor */}
                    <div className="space-y-2 pt-2 border-t border-border/60">
                      <Label className="text-[11px] font-semibold text-muted-foreground">Terms &amp; Conditions</Label>
                      <Select
                        value={settings.termsAndConditionsType}
                        onValueChange={(val: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => updateSetting("termsAndConditionsType", val)} // eslint-disable-line @typescript-eslint/no-explicit-any
                      >
                        <SelectTrigger className="h-9 rounded-xl text-xs">
                          <SelectValue placeholder="Select Document Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sales Invoices" className="text-xs">Sales Invoices</SelectItem>
                          <SelectItem value="Quotations" className="text-xs">Quotations</SelectItem>
                          <SelectItem value="Delivery Challans" className="text-xs">Delivery Challans</SelectItem>
                        </SelectContent>
                      </Select>

                      <textarea
                        value={settings.termsAndConditions[settings.termsAndConditionsType] || ""}
                        onChange={(e) => {
                          const updated = {
                            ...settings.termsAndConditions,
                            [settings.termsAndConditionsType]: e.target.value,
                          };
                          updateSetting("termsAndConditions", updated);
                        }}
                        rows={3}
                        className="w-full rounded-xl border border-input bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 resize-none font-medium"
                      />
                    </div>

                    {/* Signature Mode & Pad */}
                    <div className="space-y-2 pt-2 border-t border-border/60">
                      <Label className="text-[11px] font-semibold text-muted-foreground">Authorized Digital Signature</Label>
                      <SignaturePad
                        value={settings.signatureDataUrl}
                        onChange={(val) => updateSetting("signatureDataUrl", val)}
                        title={settings.signatoryTitle}
                        onTitleChange={(val) => updateSetting("signatoryTitle", val)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
