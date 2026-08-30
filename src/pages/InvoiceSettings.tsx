import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Save,
  Check,
  Plus,
  Trash2,
  Info,
  Palette,
  FileText,
  Building2,
  Receipt,
  QrCode,
  Landmark,
  Eye,
  Sliders,
  CheckCircle2,
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
  InvoiceTheme,
  InvoiceThemeStyling,
  COLOR_SWATCHES,
  INDUSTRY_TYPES,
  CustomField,
  CustomColumn,
} from "@/types/invoice-settings";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "credsmart_invoice_settings";

const defaultInitialSettings: InvoiceSettingsState = {
  theme: "stylish",
  styling: "classic",
  primaryColor: "#0284C7", // Royal Blue default
  showPartyBalance: false,
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
      "1. Goods once sold will not be taken back or exchanged.\n2. All disputes are subject to Dehradun jurisdiction only.",
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
  const stylingScrollRef = useRef<HTMLDivElement>(null);

  // Accordion Sections State
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    themeSettings: true,
    invoiceDetails: false,
    partyDetails: false,
    itemColumns: false,
    miscellaneous: false,
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
        description: "Your live invoice customization and theme settings are now active across the POS.",
      });
    } catch (err: unknown) {
      toast({ title: "Error saving settings", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Styling Pill Scroll
  const scrollStyling = (direction: "left" | "right") => {
    if (stylingScrollRef.current) {
      const offset = direction === "left" ? -150 : 150;
      stylingScrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
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

  const themes: Array<{ id: InvoiceTheme; label: string; badge?: string }> = [
    { id: "stylish", label: "Stylish" },
    { id: "luxury", label: "Luxury", badge: "NEW" },
    { id: "advanced_gst", label: "Advanced GST (Tally)" },
    { id: "modern", label: "Modern" },
    { id: "classic", label: "Classic" },
  ];

  const themeStylings: Array<{ id: InvoiceThemeStyling; label: string }> = [
    { id: "uttarakhand_2", label: "Uttarakhand 2" },
    { id: "uttarakhand", label: "Uttarakhand" },
    { id: "jagganth", label: "Jagganth" },
    { id: "uttar_pradesh", label: "Uttar Pradesh" },
    { id: "maharashtra", label: "Maharashtra" },
    { id: "gujarat", label: "Gujarat" },
  ];

  return (
    <div className="min-h-full h-auto lg:h-full flex flex-col p-2 sm:p-4 space-y-2 sm:space-y-3 overflow-y-auto lg:overflow-hidden max-w-[1700px] mx-auto w-full">
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 sm:gap-4 items-stretch overflow-visible lg:overflow-hidden">
        {/* Left Navigation Sidebar Matching in.PNG */}
        <div className="shrink-0 w-full lg:w-56 overflow-visible lg:overflow-y-auto">
          <SettingsNavSidebar activeItem="invoice" />
        </div>

        {/* Main Split-Screen Customizer Area - 3D Glass Container */}
        <main className="flex-1 min-h-0 w-full glass-card-3d rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col overflow-hidden">
          {/* Top Header Bar - Compact & Responsive */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-sans">
                  Invoice Settings
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>GST THEME ENGINE</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Live interactive theme customizer with real-time tax template rendering
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
                <span className="text-[10px] text-muted-foreground">
                  Theme: <strong className="text-foreground capitalize">{settings.theme}</strong> ({settings.styling})
                </span>
              </div>

              {/* Render Preview Component in Scrollable Viewport */}
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto rounded-xl border border-border/70 p-2 sm:p-3 bg-muted/20 scrollbar-thin">
                <LiveInvoicePreview
                  settings={settings}
                  businessName={org?.name || "Business Store"}
                  businessPhone={org?.phone || ""}
                  businessEmail={org?.email || ""}
                  businessAddress={org?.address || ""}
                  businessGstin={org?.gstin || ""}
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
              {/* Themes Card */}
              <div className="p-3.5 sm:p-4 rounded-2xl border border-border/90 bg-card shadow-xs space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-[#6366F1] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
                  </div>
                  <span>Themes</span>
                </div>

                {/* Theme Thumbnails / Buttons Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                  {themes.slice(0, 3).map((thm) => {
                    const isSelected = settings.theme === thm.id;
                    return (
                      <button
                        key={thm.id}
                        type="button"
                        onClick={() => updateSetting("theme", thm.id)}
                        className={cn(
                          "relative p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 group bg-slate-50/50 dark:bg-slate-900/40",
                          isSelected
                            ? "border-[#6366F1] ring-2 ring-[#6366F1]/20 bg-indigo-50/20 dark:bg-indigo-950/20"
                            : "border-border/80 hover:border-border"
                        )}
                      >
                        {/* Mini Simulated Invoice Card Preview */}
                        <div className="w-full h-14 sm:h-16 rounded-md bg-white border border-slate-200 p-1 flex flex-col justify-between shadow-2xs">
                          <div className="flex justify-between items-center border-b border-slate-100 pb-0.5">
                            <div className="w-4 h-1.5 rounded-xs bg-slate-300" />
                            <div
                              className="w-6 h-1.5 rounded-xs"
                              style={{ backgroundColor: settings.primaryColor }}
                            />
                          </div>
                          <div className="space-y-0.5">
                            <div className="w-full h-1 bg-slate-100 rounded-xs" />
                            <div className="w-4/5 h-1 bg-slate-100 rounded-xs" />
                            <div className="w-3/5 h-1 bg-slate-100 rounded-xs" />
                          </div>
                          <div className="flex justify-end">
                            <div
                              className="w-5 h-1.5 rounded-xs"
                              style={{ backgroundColor: settings.primaryColor }}
                            />
                          </div>
                        </div>

                        {thm.badge && (
                          <span className="absolute -top-1.5 -right-1 px-1.5 py-0.2 rounded-full text-[8px] font-black bg-rose-500 text-white shadow-xs">
                            {thm.badge}
                          </span>
                        )}

                        <span
                          className={cn(
                            "text-[11px] font-semibold truncate max-w-full",
                            isSelected ? "text-[#6366F1] font-bold" : "text-slate-700 dark:text-slate-300"
                          )}
                        >
                          {thm.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Second row of themes */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                  {themes.slice(3).map((thm) => {
                    const isSelected = settings.theme === thm.id;
                    return (
                      <button
                        key={thm.id}
                        type="button"
                        onClick={() => updateSetting("theme", thm.id)}
                        className={cn(
                          "relative p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 group bg-slate-50/50 dark:bg-slate-900/40",
                          isSelected
                            ? "border-[#6366F1] ring-2 ring-[#6366F1]/20 bg-indigo-50/20"
                            : "border-border/80 hover:border-border"
                        )}
                      >
                        <div className="w-full h-14 sm:h-16 rounded-md bg-white border border-slate-200 p-1 flex flex-col justify-between shadow-2xs">
                          <div className="w-6 h-1.5 rounded-xs bg-slate-300" />
                          <div className="space-y-0.5">
                            <div className="w-full h-1 bg-slate-100 rounded-xs" />
                            <div className="w-3/4 h-1 bg-slate-100 rounded-xs" />
                          </div>
                          <div className="w-5 h-1.5 rounded-xs bg-slate-400 self-end" />
                        </div>
                        <span
                          className={cn(
                            "text-[11px] font-semibold truncate max-w-full",
                            isSelected ? "text-[#6366F1] font-bold" : "text-slate-700 dark:text-slate-300"
                          )}
                        >
                          {thm.label}
                        </span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => toast({ title: "More enterprise themes are unlocked in Pro!" })}
                    className="p-2 rounded-xl border border-dashed border-border text-center flex flex-col items-center justify-center gap-1 hover:border-[#6366F1] text-xs font-bold text-[#6366F1] transition-all bg-card"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>See All</span>
                  </button>
                </div>

                {/* Theme Styling Carousel */}
                <div className="pt-2 border-t border-border/70 space-y-2">
                  <div className="flex items-center gap-2">
                    <Palette className="w-3.5 h-3.5 text-[#6366F1]" />
                    <span className="text-xs font-bold text-foreground">Theme Styling</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                      New
                    </span>
                  </div>

                  <div className="relative flex items-center">
                    <button
                      type="button"
                      onClick={() => scrollStyling("left")}
                      className="p-1 rounded-full bg-card border shadow-xs hover:bg-muted text-muted-foreground shrink-0 z-10 mr-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    <div
                      ref={stylingScrollRef}
                      className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 px-0.5"
                    >
                      {themeStylings.map((ts) => {
                        const isSelected = settings.styling === ts.id;
                        return (
                          <button
                            key={ts.id}
                            type="button"
                            onClick={() => updateSetting("styling", ts.id)}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border",
                              isSelected
                                ? "bg-slate-900 text-white border-slate-900 font-semibold shadow-xs"
                                : "bg-card text-muted-foreground hover:text-foreground border-border/80 hover:border-border"
                            )}
                          >
                            {ts.label}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => scrollStyling("right")}
                      className="p-1 rounded-full bg-card border shadow-xs hover:bg-muted text-muted-foreground shrink-0 z-10 ml-1"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Create Custom Theme Action Button */}
                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={() => toast({ title: "Custom Theme Builder activated!" })}
                    className="w-full h-9 rounded-xl bg-[#5B68DF] hover:bg-[#4E5BC9] text-white text-xs font-bold shadow-xs transition-transform active:scale-[0.99]"
                  >
                    Create your own theme
                  </Button>
                </div>

                {/* Select Color Swatches */}
                <div className="pt-2 border-t border-border/70 space-y-2">
                  <span className="text-xs font-bold text-foreground">Select Color</span>
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
                            "w-full aspect-square rounded-lg transition-transform flex items-center justify-center shadow-xs",
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

              {/* Accordion 1: Theme Settings (Matching in2.PNG) */}
              <div className="rounded-2xl border border-border/90 bg-card overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleSection("themeSettings")}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">Theme Settings</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
                      New
                    </span>
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
                        Show party balance in invoice
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="free-qty"
                        checked={settings.enableFreeQty}
                        onCheckedChange={(c) => updateSetting("enableFreeQty", Boolean(c))}
                      />
                      <label htmlFor="free-qty" className="font-medium text-foreground cursor-pointer">
                        Enable free item quantity
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="item-desc"
                        checked={settings.showItemDescription}
                        onCheckedChange={(c) => updateSetting("showItemDescription", Boolean(c))}
                      />
                      <label htmlFor="item-desc" className="font-medium text-foreground cursor-pointer">
                        Show item description in invoice
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="alt-unit"
                        checked={settings.showAlternateUnit}
                        onCheckedChange={(c) => updateSetting("showAlternateUnit", Boolean(c))}
                      />
                      <label htmlFor="alt-unit" className="font-medium text-foreground cursor-pointer">
                        Show Alternate Unit in Invoice
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="phone-num"
                        checked={settings.showPhoneNumber}
                        onCheckedChange={(c) => updateSetting("showPhoneNumber", Boolean(c))}
                      />
                      <label htmlFor="phone-num" className="font-medium text-foreground cursor-pointer">
                        Show phone number on Invoice
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
                          Show time on Invoices
                        </label>
                      </div>
                      <Info className="w-3.5 h-3.5 text-muted-foreground" title="Prints exact transaction time" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="price-hist"
                          checked={settings.priceHistory}
                          onCheckedChange={(c) => updateSetting("priceHistory", Boolean(c))}
                        />
                        <label htmlFor="price-hist" className="font-medium text-foreground cursor-pointer">
                          Price History
                        </label>
                      </div>
                      <Info className="w-3.5 h-3.5 text-muted-foreground" title="Shows previous billed rate" />
                    </div>

                    <div className="flex items-center space-x-2 pt-1 border-t border-border/60">
                      <Checkbox
                        id="auto-luxury"
                        checked={settings.autoApplyLuxury}
                        onCheckedChange={(c) => updateSetting("autoApplyLuxury", Boolean(c))}
                      />
                      <label htmlFor="auto-luxury" className="font-medium text-foreground cursor-pointer">
                        Auto-apply luxury theme for sharing
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 2: Invoice Details (Matching in3.PNG) */}
              <div className="rounded-2xl border border-border/90 bg-card overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleSection("invoiceDetails")}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/40 transition-colors"
                >
                  <span className="text-xs font-bold text-foreground">Invoice Details</span>
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

                    {/* PO Number Checkbox & input */}
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="po-num"
                          checked={settings.showPoNumber}
                          onCheckedChange={(c) => updateSetting("showPoNumber", Boolean(c))}
                        />
                        <label htmlFor="po-num" className="font-medium text-foreground cursor-pointer">
                          PO Number
                        </label>
                      </div>
                      {settings.showPoNumber && (
                        <Input
                          placeholder="PO-2026-902"
                          value={settings.poNumber}
                          onChange={(e) => updateSetting("poNumber", e.target.value)}
                          className="h-8 text-xs rounded-lg font-mono pl-6"
                        />
                      )}
                    </div>

                    {/* E-way Bill Checkbox & input */}
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
                          className="h-8 text-xs rounded-lg font-mono pl-6"
                        />
                      )}
                    </div>

                    {/* Vehicle Number Checkbox & input */}
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="veh-num"
                          checked={settings.showVehicleNumber}
                          onCheckedChange={(c) => updateSetting("showVehicleNumber", Boolean(c))}
                        />
                        <label htmlFor="veh-num" className="font-medium text-foreground cursor-pointer">
                          Vehicle Number
                        </label>
                      </div>
                      {settings.showVehicleNumber && (
                        <Input
                          placeholder="UK-07-AB-4491"
                          value={settings.vehicleNumber}
                          onChange={(e) => updateSetting("vehicleNumber", e.target.value)}
                          className="h-8 text-xs rounded-lg font-mono pl-6 uppercase"
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
                          className="text-rose-500 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleAddInvoiceField}
                      className="text-xs font-semibold text-[#0284C7] hover:underline inline-flex items-center gap-1 pt-1"
                    >
                      + Add Custom Field
                    </button>
                  </div>
                )}
              </div>

              {/* Accordion 3: Party Details (Matching iii.PNG) */}
              <div className="rounded-2xl border border-border/90 bg-card overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleSection("partyDetails")}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/40 transition-colors"
                >
                  <span className="text-xs font-bold text-foreground">Party Details</span>
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
                          className="text-rose-500 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleAddPartyField}
                      className="text-xs font-semibold text-[#0284C7] hover:underline inline-flex items-center gap-1 pt-2"
                    >
                      + Add Custom Field
                    </button>
                  </div>
                )}
              </div>

              {/* Accordion 4: Item Table Columns (Matching nii.PNG) */}
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
                        Price/Item (₹)
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
                          className="text-rose-500 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleAddCustomColumn}
                      className="text-xs font-semibold text-[#0284C7] hover:underline inline-flex items-center gap-1 pt-1"
                    >
                      + Add Custom Column
                    </button>
                  </div>
                )}
              </div>

              {/* Accordion 5: Miscellaneous Details (Matching inn.PNG) */}
              <div className="rounded-2xl border border-border/90 bg-card overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleSection("miscellaneous")}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">Miscellaneous Details</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
                      New
                    </span>
                  </div>
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
                      <Label className="text-[11px] font-semibold text-muted-foreground">Bank Account</Label>
                      <Select
                        value={settings.selectedBankAccountId}
                        onValueChange={(val) => updateSetting("selectedBankAccountId", val)}
                      >
                        <SelectTrigger className="h-9 rounded-xl text-xs">
                          <SelectValue placeholder="Select Account" />
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
                      <Label className="text-[11px] font-semibold text-muted-foreground">Payment QR</Label>
                      <Input
                        value={settings.selectedPaymentQrUpi}
                        onChange={(e) => updateSetting("selectedPaymentQrUpi", e.target.value)}
                        placeholder="yourname@bank"
                        className="h-9 rounded-xl font-mono text-xs"
                      />
                    </div>

                    {/* Terms and Conditions Editor */}
                    <div className="space-y-2 pt-2 border-t border-border/60">
                      <Label className="text-[11px] font-semibold text-muted-foreground">Terms and Conditions</Label>
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

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => toast({ title: "Terms and conditions updated!" })}
                        className="h-7 text-xs rounded-lg px-4"
                      >
                        Save
                      </Button>
                    </div>

                    {/* Signature Mode & Pad */}
                    <div className="space-y-2 pt-2 border-t border-border/60">
                      <Label className="text-[11px] font-semibold text-muted-foreground">Signature</Label>
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
