import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Keyboard,
  MessageSquare,
  Calendar,
  Save,
  X,
  Building2,
  Globe,
  Award,
  CreditCard,
  Landmark,
  QrCode,
  ShieldAlert,
  HelpCircle,
  Store,
} from "lucide-react";
import { SettingsNavSidebar } from "@/components/settings/SettingsNavSidebar";
import { SignaturePad } from "@/components/settings/SignaturePad";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  INDIAN_STATES,
  BUSINESS_TYPES,
  INDUSTRY_TYPES,
  REGISTRATION_TYPES,
  BusinessSettingsState,
  BankAccountDetails,
} from "@/types/invoice-settings";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "credsmart_business_settings";

export default function BusinessSettings() {
  const navigate = useNavigate();
  const { org, orgId, refresh } = useOrganization();

  // Form State
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [isGstRegistered, setIsGstRegistered] = useState<boolean>(true);
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [selectedBusinessTypes, setSelectedBusinessTypes] = useState<string[]>([
    "Retailer",
    "Wholesaler",
    "Distributor",
    "Manufacturer",
    "Services",
  ]);
  const [industryType, setIndustryType] = useState("Other services");
  const [registrationType, setRegistrationType] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("");
  const [signatoryTitle, setSignatoryTitle] = useState("Authorized Signatory");

  // Additional Details State
  const [website, setWebsite] = useState("");
  const [msmeNumber, setMsmeNumber] = useState("");
  const [upiId, setUpiId] = useState("");
  const [bankAccounts, setBankAccounts] = useState<BankAccountDetails[]>([
    {
      id: "bank_1",
      bankName: "HDFC Bank Ltd.",
      accountNumber: "50200084920194",
      ifsc: "HDFC0001429",
      branch: "Main Branch",
      accountHolder: "",
      isDefault: true,
    },
  ]);

  // Bank Form State
  const [showAddBank, setShowAddBank] = useState(false);
  const [newBank, setNewBank] = useState({
    bankName: "",
    accountNumber: "",
    ifsc: "",
    branch: "",
  });

  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Modals for header actions
  const [newBusinessModal, setNewBusinessModal] = useState(false);
  const [chatSupportModal, setChatSupportModal] = useState(false);
  const [closeFyModal, setCloseFyModal] = useState(false);
  const [shortcutsModal, setShortcutsModal] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState("");

  // Initialize from organization & localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: BusinessSettingsState = JSON.parse(saved);
        if (parsed.businessName) setBusinessName(parsed.businessName);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.billingAddress) setBillingAddress(parsed.billingAddress);
        if (parsed.state) setState(parsed.state);
        if (parsed.pincode) setPincode(parsed.pincode);
        if (parsed.city) setCity(parsed.city);
        if (typeof parsed.isGstRegistered === "boolean") setIsGstRegistered(parsed.isGstRegistered);
        if (parsed.gstin) setGstin(parsed.gstin);
        if (parsed.pan) setPan(parsed.pan);
        if (parsed.businessTypes?.length) setSelectedBusinessTypes(parsed.businessTypes);
        if (parsed.industryType) setIndustryType(parsed.industryType);
        if (parsed.businessRegistrationType) setRegistrationType(parsed.businessRegistrationType);
        if (parsed.logoUrl) setLogoUrl(parsed.logoUrl);
        if (parsed.signatureDataUrl) setSignatureUrl(parsed.signatureDataUrl);
        if (parsed.signatoryTitle) setSignatoryTitle(parsed.signatoryTitle);
        if (parsed.website) setWebsite(parsed.website);
        if (parsed.msmeNumber) setMsmeNumber(parsed.msmeNumber);
        if (parsed.upiId) setUpiId(parsed.upiId);
        if (parsed.bankAccounts?.length) setBankAccounts(parsed.bankAccounts);
      } else if (org) {
        setBusinessName(org.name || "Business Name");
        setPhone(org.phone || "7409200341");
        setEmail(org.email || "");
        setBillingAddress(org.address || "");
        setGstin(org.gstin || "");
        setPan(org.pan || "");
        if (org.logo_url) setLogoUrl(org.logo_url);
      }
    } catch {
      // fallback
    }
  }, [org]);

  // Auto extract PAN and state from GSTIN
  const handleGstinChange = (val: string) => {
    const cleanGst = val.toUpperCase().trim();
    setGstin(cleanGst);

    if (cleanGst.length >= 2) {
      const stateCode = cleanGst.slice(0, 2);
      const matchedState = INDIAN_STATES.find((s) => s.code === stateCode);
      if (matchedState && !state) {
        setState(matchedState.name);
      }
    }

    if (cleanGst.length >= 12) {
      const panPart = cleanGst.slice(2, 12);
      setPan(panPart);
    }
  };

  const isGstValid = gstin.length === 15 && /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Logo image must be under 5MB (PNG/JPG)",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogoUrl(reader.result as string);
      setLogoFile(file);
      toast({ title: "Logo loaded successfully!" });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoUrl("");
    setLogoFile(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
    toast({ title: "Logo removed" });
  };

  const toggleBusinessType = (type: string) => {
    setSelectedBusinessTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleAddBank = () => {
    if (!newBank.bankName.trim() || !newBank.accountNumber.trim()) {
      toast({ title: "Please enter Bank Name and Account Number", variant: "destructive" });
      return;
    }
    const created: BankAccountDetails = {
      id: `bank_${Date.now()}`,
      bankName: newBank.bankName.trim(),
      accountNumber: newBank.accountNumber.trim(),
      ifsc: newBank.ifsc.trim().toUpperCase(),
      branch: newBank.branch.trim(),
      isDefault: bankAccounts.length === 0,
    };
    setBankAccounts((prev) => [...prev, created]);
    setNewBank({ bankName: "", accountNumber: "", ifsc: "", branch: "" });
    setShowAddBank(false);
    toast({ title: "Bank account added!" });
  };

  const handleRemoveBank = (id: string) => {
    setBankAccounts((prev) => prev.filter((b) => b.id !== id));
  };

  const handleSave = async () => {
    if (!businessName.trim()) {
      toast({ title: "Business Name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      let finalLogoUrl = logoUrl;

      // Upload logo to Supabase storage if file was selected and orgId exists
      if (logoFile && orgId) {
        const ext = logoFile.name.split(".").pop();
        const path = `${orgId}/logo_${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("store-logos")
          .upload(path, logoFile, { upsert: true });

        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("store-logos").getPublicUrl(path);
          if (urlData?.publicUrl) finalLogoUrl = urlData.publicUrl;
        }
      }

      const payload: BusinessSettingsState = {
        businessName: businessName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        billingAddress: billingAddress.trim(),
        state,
        pincode: pincode.trim(),
        city: city.trim(),
        isGstRegistered,
        gstin: gstin.trim(),
        pan: pan.trim(),
        businessTypes: selectedBusinessTypes,
        industryType,
        businessRegistrationType: registrationType,
        logoUrl: finalLogoUrl,
        signatureDataUrl: signatureUrl,
        signatoryTitle,
        website: website.trim(),
        msmeNumber: msmeNumber.trim(),
        upiId: upiId.trim(),
        bankAccounts,
        customDetails: [],
      };

      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

      // Also sync to Supabase organization record if orgId is available
      if (orgId) {
        await supabase
          .from("organizations")
          .update({
            name: businessName.trim(),
            phone: phone.trim(),
            email: email.trim(),
            address: billingAddress.trim(),
            gstin: gstin.trim(),
            pan: pan.trim(),
            logo_url: finalLogoUrl,
            business_type: selectedBusinessTypes.join(", "),
          })
          .eq("id", orgId);

        await refresh();
      }

      toast({
        title: "Changes Saved Successfully!",
        description: "Your company details have been updated across your invoices and POS.",
      });
    } catch (err: any) {
      toast({
        title: "Error saving changes",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-2.5 sm:p-4 space-y-2 sm:space-y-3 overflow-hidden max-w-[1550px] mx-auto w-full">
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 sm:gap-4 items-stretch overflow-hidden">
        {/* Left Navigation Sidebar Matching Capture12.PNG */}
        <div className="shrink-0 lg:w-56 overflow-y-auto">
          <SettingsNavSidebar activeItem="business" />
        </div>

        {/* Main Content Area - Single Screen View */}
        <main className="flex-1 min-h-0 w-full bg-card rounded-xl border border-border/80 p-3.5 sm:p-5 shadow-2xs flex flex-col overflow-hidden">
          {/* Top Header Bar - Compact */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border/70 shrink-0">
            <div>
              <h1 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                Business Settings
              </h1>
              <p className="text-[11px] text-muted-foreground truncate">
                Edit Your Company Settings And Information
              </p>
            </div>

            {/* Header Action Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <Button
                onClick={() => setNewBusinessModal(true)}
                size="sm"
                className="h-8 px-2.5 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-bold shadow-2xs transition-transform active:scale-[0.98]"
              >
                Create new business
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShortcutsModal(true)}
                className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                title="Keyboard Shortcuts"
              >
                <Keyboard className="w-3.5 h-3.5" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setChatSupportModal(true)}
                className="h-8 px-2.5 rounded-lg text-[#0284C7] hover:text-[#0369A1] hover:bg-sky-50 dark:hover:bg-sky-950/30 border-sky-200 dark:border-sky-800 text-xs font-semibold gap-1"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>Chat Support</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCloseFyModal(true)}
                className="h-8 px-2.5 rounded-lg text-xs font-semibold gap-1"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Close FY</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(ROUTE_PATHS.dashboard)}
                className="h-8 px-2.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>

              <Button
                onClick={handleSave}
                disabled={saving}
                size="sm"
                className="h-8 px-3 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold shadow-2xs gap-1.5 transition-transform active:scale-[0.98]"
              >
                {saving ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Save Changes</span>
              </Button>
            </div>
          </div>

          {/* Form Scrollable 2-Column Layout */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto w-full pt-3 pr-1 scrollbar-thin">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Form Column (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Logo Upload Box + Business Name */}
              <div className="flex flex-col sm:flex-row items-start gap-3">
                {/* Logo Uploader */}
                <div className="w-36 shrink-0">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <div
                    onClick={() => !logoUrl && logoInputRef.current?.click()}
                    className={cn(
                      "relative h-28 w-36 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center p-2 transition-all group overflow-hidden bg-slate-50/50 dark:bg-slate-900/30",
                      logoUrl
                        ? "border-border hover:border-primary/50"
                        : "border-[#38BDF8] hover:border-sky-500 cursor-pointer bg-sky-50/20"
                    )}
                  >
                    {logoUrl ? (
                      <>
                        <img
                          src={logoUrl}
                          alt="Logo Preview"
                          className="h-full w-full object-contain p-1 rounded-xl"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveLogo();
                          }}
                          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-sm transition-transform active:scale-95"
                          title="Remove Logo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950/50 text-[#0284C7] mb-1 group-hover:scale-105 transition-transform">
                          <Upload className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-[#0284C7]">Upload Logo</span>
                        <span className="text-[9px] text-muted-foreground leading-tight mt-0.5">
                          PNG/JPG, max 5 MB.
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Business Name Field */}
                <div className="flex-1 w-full space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    Business Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Enter Business Name"
                    className="h-10 rounded-xl font-medium"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    This official name will be prominently printed on invoices, vouchers, and thermal receipts.
                  </p>
                </div>
              </div>

              {/* Phone & Email side-by-side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Company Phone Number</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="7409200341"
                    className="h-10 rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Company E-Mail</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter company e-mail"
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>

              {/* Billing Address */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Billing Address</Label>
                <textarea
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="Enter Billing Address"
                  rows={2}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 resize-none font-medium"
                />
              </div>

              {/* State & Pincode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">State</Label>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger className="h-10 rounded-xl text-xs">
                      <SelectValue placeholder="Enter State / Select" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {INDIAN_STATES.map((s) => (
                        <SelectItem key={s.code} value={s.name} className="text-xs">
                          {s.name} ({s.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Pincode</Label>
                  <Input
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="Enter Pincode"
                    maxLength={6}
                    className="h-10 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* City */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">City</Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Enter City"
                  className="h-10 rounded-xl"
                />
              </div>

              {/* GST Registered Toggle & Validation */}
              <div className="p-4 rounded-2xl border border-border/80 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">Are you GST Registered?</Label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsGstRegistered(true)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-semibold transition-all",
                        isGstRegistered
                          ? "bg-[#6366F1] text-white shadow-xs"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsGstRegistered(false);
                        setGstin("");
                      }}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-semibold transition-all",
                        !isGstRegistered
                          ? "bg-[#6366F1] text-white shadow-xs"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      No
                    </button>
                  </div>
                </div>

                {isGstRegistered && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-muted-foreground">
                        GSTIN (15-Digit Goods &amp; Services Tax ID)
                      </Label>
                      {gstin && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[11px] font-bold",
                            isGstValid ? "text-emerald-600" : "text-amber-600"
                          )}
                        >
                          {isGstValid ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" /> Valid GSTIN Format
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3.5 h-3.5" /> 15 Alphanumeric Required
                            </>
                          )}
                        </span>
                      )}
                    </div>
                    <Input
                      value={gstin}
                      onChange={(e) => handleGstinChange(e.target.value)}
                      placeholder="e.g. 05AAAAA0000A1Z5"
                      maxLength={15}
                      className={cn(
                        "h-10 rounded-xl font-mono uppercase tracking-wider text-xs",
                        isGstValid && "border-emerald-500/80 ring-1 ring-emerald-500/30"
                      )}
                    />
                    {pan && (
                      <p className="text-[10px] text-muted-foreground font-mono">
                        Extracted Entity PAN: <strong className="text-foreground">{pan}</strong>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Form Column (5 Cols) */}
            <div className="lg:col-span-5 space-y-5">
              {/* Business Type Multi-Select */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">
                  Business Type (Select multiple, if applicable)
                </Label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-muted/40 border border-border/80">
                  {BUSINESS_TYPES.map((bt) => {
                    const isSelected = selectedBusinessTypes.includes(bt);
                    return (
                      <button
                        key={bt}
                        type="button"
                        onClick={() => toggleBusinessType(bt)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                          isSelected
                            ? "bg-[#6366F1] text-white font-semibold shadow-xs"
                            : "bg-card text-muted-foreground hover:text-foreground border border-border/70"
                        )}
                      >
                        {bt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Industry Type Dropdown */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Industry Type</Label>
                <Select value={industryType} onValueChange={setIndustryType}>
                  <SelectTrigger className="h-10 rounded-xl text-xs">
                    <SelectValue placeholder="Select Industry" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {INDUSTRY_TYPES.map((ind) => (
                      <SelectItem key={ind} value={ind} className="text-xs">
                        {ind}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Business Registration Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Business Registration Type</Label>
                <Select value={registrationType} onValueChange={setRegistrationType}>
                  <SelectTrigger className="h-10 rounded-xl text-xs">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGISTRATION_TYPES.map((reg) => (
                      <SelectItem key={reg} value={reg} className="text-xs">
                        {reg}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!registrationType && (
                  <p className="text-[11px] text-rose-500 font-medium">
                    Business registration type is not selected
                  </p>
                )}
              </div>

              {/* Note Banner matching Capture12.PNG */}
              <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 text-center">
                <p className="text-[11px] text-blue-900 dark:text-blue-200 font-medium">
                  <strong>Note:</strong> Terms &amp; Conditions and Signature added below will be shown on your Invoices
                </p>
              </div>

              {/* Signature Section matching Capture12.PNG */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Signature</Label>
                <SignaturePad
                  value={signatureUrl}
                  onChange={setSignatureUrl}
                  title={signatoryTitle}
                  onTitleChange={setSignatoryTitle}
                />
              </div>

              {/* Add Business Details Card matching Capture12.PNG */}
              <div className="p-4 rounded-2xl border border-border bg-slate-50/60 dark:bg-slate-900/40 space-y-4">
                <div>
                  <h3 className="font-bold text-xs text-foreground">Add Business Details</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Add additional business information such as MSME number, Website etc.
                  </p>
                </div>

                {/* Website */}
                <div className="flex items-center gap-2">
                  <span className="w-20 text-xs font-semibold text-muted-foreground shrink-0">Website</span>
                  <span className="text-muted-foreground">=</span>
                  <Input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="www.website.com"
                    className="h-9 rounded-xl text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 px-3 rounded-xl text-xs font-semibold shrink-0"
                    onClick={() => toast({ title: "Website saved!" })}
                  >
                    Add
                  </Button>
                </div>

                {/* MSME Number */}
                <div className="flex items-center gap-2">
                  <span className="w-20 text-xs font-semibold text-muted-foreground shrink-0">MSME</span>
                  <span className="text-muted-foreground">=</span>
                  <Input
                    value={msmeNumber}
                    onChange={(e) => setMsmeNumber(e.target.value.toUpperCase())}
                    placeholder="UDYAM-UK-00-0000000"
                    className="h-9 rounded-xl text-xs font-mono uppercase"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 px-3 rounded-xl text-xs font-semibold shrink-0"
                    onClick={() => toast({ title: "MSME Number saved!" })}
                  >
                    Add
                  </Button>
                </div>

                {/* UPI ID */}
                <div className="flex items-center gap-2">
                  <span className="w-20 text-xs font-semibold text-muted-foreground shrink-0">UPI ID</span>
                  <span className="text-muted-foreground">=</span>
                  <Input
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="merchant@okhdfcbank"
                    className="h-9 rounded-xl text-xs font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 px-3 rounded-xl text-xs font-semibold shrink-0"
                    onClick={() => toast({ title: "UPI ID saved!" })}
                  >
                    Add
                  </Button>
                </div>

                {/* Bank Accounts List & Add Bank Button */}
                <div className="pt-2 space-y-2 border-t border-border/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Linked Bank Accounts</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddBank(!showAddBank)}
                      className="h-7 text-xs text-[#6366F1] font-semibold gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Bank
                    </Button>
                  </div>

                  {bankAccounts.map((b) => (
                    <div
                      key={b.id}
                      className="p-2.5 rounded-xl bg-card border border-border/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-foreground">{b.bankName}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          A/C: {b.accountNumber} | IFSC: {b.ifsc}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveBank(b.id)}
                        className="text-rose-500 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {showAddBank && (
                    <div className="p-3 rounded-xl bg-card border border-[#6366F1]/40 space-y-2">
                      <Input
                        placeholder="Bank Name (e.g. ICICI Bank)"
                        value={newBank.bankName}
                        onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })}
                        className="h-8 text-xs rounded-lg"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Account Number"
                          value={newBank.accountNumber}
                          onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })}
                          className="h-8 text-xs rounded-lg font-mono"
                        />
                        <Input
                          placeholder="IFSC Code"
                          value={newBank.ifsc}
                          onChange={(e) => setNewBank({ ...newBank, ifsc: e.target.value.toUpperCase() })}
                          className="h-8 text-xs rounded-lg font-mono uppercase"
                        />
                      </div>
                      <Input
                        placeholder="Branch Name (Optional)"
                        value={newBank.branch}
                        onChange={(e) => setNewBank({ ...newBank, branch: e.target.value })}
                        className="h-8 text-xs rounded-lg"
                      />
                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAddBank(false)}
                          className="h-7 text-xs rounded-lg"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAddBank}
                          className="h-7 text-xs rounded-lg bg-[#6366F1] text-white"
                        >
                          Save Account
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Create New Business Modal */}
      <Dialog open={newBusinessModal} onOpenChange={setNewBusinessModal}>
        <DialogContent className="max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#EA580C]" />
              Create New Business / Branch
            </DialogTitle>
            <DialogDescription>
              Add another store or company under your CredSmart account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="font-semibold text-foreground">New Business / Branch Name</Label>
              <Input
                placeholder="e.g. CredSmart Wholesale Depot"
                value={newBusinessName}
                onChange={(e) => setNewBusinessName(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
            <Button
              className="w-full h-10 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold"
              onClick={() => {
                if (!newBusinessName.trim()) {
                  toast({ title: "Please enter business name", variant: "destructive" });
                  return;
                }
                toast({
                  title: "New business profile initialized!",
                  description: `Switched to ${newBusinessName}`,
                });
                setBusinessName(newBusinessName);
                setNewBusinessName("");
                setNewBusinessModal(false);
              }}
            >
              Create Business
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Support Modal */}
      <Dialog open={chatSupportModal} onOpenChange={setChatSupportModal}>
        <DialogContent className="max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#0284C7]" />
              CredSmart Chat &amp; Help Desk
            </DialogTitle>
            <DialogDescription>
              Direct live support for GST setup, printers, and migration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-muted/40 rounded-xl space-y-1.5 border">
              <p className="text-muted-foreground">Our support engineers are available 24x7 to assist you.</p>
              <p className="font-bold text-foreground">Direct Hotline: +91 74092 00341</p>
            </div>
            <Button
              className="w-full text-xs h-9 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              onClick={() => {
                window.open("https://wa.me/917409200341", "_blank");
                setChatSupportModal(false);
              }}
            >
              Open WhatsApp Support Desk
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Financial Year Modal */}
      <Dialog open={closeFyModal} onOpenChange={setCloseFyModal}>
        <DialogContent className="max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <Calendar className="w-5 h-5" />
              Close Financial Year (2025-2026)
            </DialogTitle>
            <DialogDescription>
              Roll over closing stock and customer balances to the new financial year
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <p className="text-muted-foreground">
              Closing the financial year will carry forward your inventory stock counts and party balances into FY 2026-2027 while locking previous fiscal books.
            </p>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl">
              <p className="font-semibold text-amber-800 dark:text-amber-200">Recommendation:</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                Ensure all GSTR-1 and GSTR-3B filings for the current quarter are completed before rollover.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setCloseFyModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                onClick={() => {
                  toast({ title: "Financial Year Rolled Over Successfully to 2026-2027!" });
                  setCloseFyModal(false);
                }}
              >
                Confirm FY Rollover
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shortcuts Modal */}
      <Dialog open={shortcutsModal} onOpenChange={setShortcutsModal}>
        <DialogContent className="max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-primary" />
              Keyboard Shortcuts Reference
            </DialogTitle>
            <DialogDescription>Quick navigation keys across CredSmart POS</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 text-xs">
            <div className="p-3 bg-muted/40 rounded-xl space-y-1.5 border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Save Changes:</span>
                <kbd className="px-1.5 py-0.5 bg-card border rounded font-mono text-[10px]">Ctrl+S</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">New POS Invoice:</span>
                <kbd className="px-1.5 py-0.5 bg-card border rounded font-mono text-[10px]">F9</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Global Search:</span>
                <kbd className="px-1.5 py-0.5 bg-card border rounded font-mono text-[10px]">Ctrl+K</kbd>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
