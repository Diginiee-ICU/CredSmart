import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileText,
  DollarSign,
  Search,
} from "lucide-react";
import { Party, PartyType, PartyCategory } from "@/types/parties";
import { lookupGSTIN, isValidGSTIN, isValidPAN, lookupTaxIdentifier } from "@/utils/gstinLookup";
import { CompanySearchAutocomplete } from "@/components/CompanySearchAutocomplete";
import { TallyGstSearchModal } from "@/components/settings/TallyGstSearchModal";
import { INDIAN_STATES_AND_CODES } from "@/utils/suggestionData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { normalizeError } from "@/lib/normalizeError";

interface CreatePartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (partyData: Omit<Party, "id" | "created_at">) => Promise<void>;
  initialData?: Party | null;
  defaultType?: PartyType;
}

type CompanySearchResult = {
  name: string;
  tradeName?: string;
  phone?: string;
  address?: string;
  pincode?: string;
  city?: string;
  state?: string;
  category?: string;
  cin?: string;
};

const CATEGORY_OPTIONS: string[] = [
  "Retailer",
  "Wholesaler",
  "Distributor",
  "Walk-in Customer",
  "Corporate",
  "Manufacturer",
  "End Consumer",
  "Vendor",
  "General",
];

export function CreatePartyModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultType = "customer",
}: CreatePartyModalProps) {
  const [activeTab, setActiveTab] = useState<"general" | "address" | "credit" | "custom">("general");
  const [partyType, setPartyType] = useState<PartyType>(defaultType);
  const [name, setName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<string>("General");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");

  // Address
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Maharashtra");
  const [pincode, setPincode] = useState("");
  const [sameShipping, setSameShipping] = useState(true);
  const [shippingAddress, setShippingAddress] = useState("");

  // Balance & Credit
  const [openingBalance, setOpeningBalance] = useState("0");
  const [balanceType, setBalanceType] = useState<"to_collect" | "to_pay">("to_collect");
  const [creditLimit, setCreditLimit] = useState("");
  const [creditPeriodDays, setCreditPeriodDays] = useState("30");

  // Custom Fields
  const [dlNumber, setDlNumber] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [notes, setNotes] = useState("");

  // GST Lookup Status
  const [isLookingUpGst, setIsLookingUpGst] = useState(false);
  const [gstLookupSuccess, setGstLookupSuccess] = useState<string | null>(null);
  const [tallyModalOpen, setTallyModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const prevActiveElRef = useRef<HTMLElement | null>(null);


  useEffect(() => {
    if (initialData) {
      setPartyType(initialData.partyType);
      setName(initialData.name || "");
      setTradeName(initialData.tradeName || "");
      setPhone(initialData.phone || "");
      setEmail(initialData.email || "");
      setCategory(initialData.category || "General");
      setGstin(initialData.gstin || "");
      setPan(initialData.pan || "");
      setAddress(initialData.address || "");
      setCity(initialData.city || "");
      setState(initialData.state || "Maharashtra");
      setPincode(initialData.pincode || "");
      setShippingAddress(initialData.shippingAddress || "");
      setOpeningBalance(Math.abs(initialData.openingBalance || 0).toString());
      setBalanceType(initialData.balance >= 0 ? "to_collect" : "to_pay");
      setCreditLimit(initialData.creditLimit ? initialData.creditLimit.toString() : "");
      setCreditPeriodDays(initialData.creditPeriodDays ? initialData.creditPeriodDays.toString() : "30");
      setDlNumber(initialData.customFields?.dlNumber || "");
      setBankAccount(initialData.customFields?.bankAccount || "");
      setBankIfsc(initialData.customFields?.bankIfsc || "");
      setNotes(initialData.customFields?.notes || "");
    } else {
      setPartyType(defaultType);
      setName("");
      setTradeName("");
      setPhone("");
      setEmail("");
      setCategory("General");
      setGstin("");
      setPan("");
      setAddress("");
      setCity("");
      setState("Maharashtra");
      setPincode("");
      setShippingAddress("");
      setOpeningBalance("0");
      setBalanceType(defaultType === "supplier" ? "to_pay" : "to_collect");
      setCreditLimit("");
      setCreditPeriodDays("30");
      setDlNumber("");
      setBankAccount("");
      setBankIfsc("");
      setNotes("");
      setGstLookupSuccess(null);
    }
  }, [initialData, defaultType, isOpen]);

  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (isOpen) {
      prevActiveElRef.current = document.activeElement as HTMLElement | null;
      if (mainEl) mainEl.setAttribute('aria-hidden', 'true');
      // Prevent background scroll while modal is open
      document.body.style.overflow = 'hidden';
      // Autoscroll modal to top
      modalRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      const scrollables = modalRef.current?.querySelectorAll('.overflow-y-auto, form');
      scrollables?.forEach((s) => {
        (s as HTMLElement).scrollTop = 0;
        s.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      });
      setTimeout(() => {
        modalRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        scrollables?.forEach((s) => {
          (s as HTMLElement).scrollTop = 0;
          s.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        });
        const focusTarget = modalRef.current?.querySelector('input,button,select,textarea,[tabindex]') as HTMLElement | null;
        focusTarget?.focus();
      }, 80);
    } else {
      if (mainEl) mainEl.removeAttribute('aria-hidden');
      document.body.style.overflow = '';
      prevActiveElRef.current?.focus?.();
    }

    return () => {
      if (mainEl) mainEl.removeAttribute('aria-hidden');
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const triggerAutoFill = async (targetId: string, showToast = true) => {
    const clean = targetId.trim().toUpperCase();
    if (!clean) {
      if (showToast) toast.error("Please enter a valid 15-character GSTIN or 10-character PAN.");
      return;
    }
    if (!isValidGSTIN(clean) && !isValidPAN(clean)) {
      if (showToast) toast.error("Invalid format. Enter 15-char GSTIN (e.g. 27AAPFU0939F1ZV) or 10-char PAN (e.g. AAPFU0939F).");
      return;
    }

    setIsLookingUpGst(true);
    setGstLookupSuccess(null);
    try {
      const result = await lookupTaxIdentifier(clean);
      if (result.legalName) {
        setName(result.legalName);
        setTradeName(result.tradeName || result.legalName);
      }
      if (result.pan) {
        setPan(result.pan);
      }
      if (isValidGSTIN(result.gstin) && (!gstin || gstin.length < 15)) {
        setGstin(result.gstin);
      }
      if (result.state) {
        setState(result.state);
      }
      if (result.city) {
        setCity(result.city);
      }
      if (result.pincode) {
        setPincode(result.pincode);
      }
      if (result.address) {
        setAddress(result.address);
        if (sameShipping) {
          setShippingAddress(result.address);
        }
      }
      if (result.category && CATEGORY_OPTIONS.includes(result.category)) {
        setCategory(result.category);
      }
      if (result.phone && !phone) {
        setPhone(result.phone);
      }
      if (result.email && !email) {
        setEmail(result.email);
      }

      if (result.legalName) {
        setGstLookupSuccess(`Verified: ${result.legalName} • ${result.state} (${result.category || "Active"})`);
        if (showToast) {
          toast.success(`Verified details loaded for ${result.legalName}!`);
        }
      } else {
        setGstLookupSuccess(`State: ${result.state} (Code ${result.stateCode}) • PAN: ${result.pan} • Category: ${result.category}`);
        if (showToast) {
          toast.info(`State: ${result.state} • PAN: ${result.pan} detected`);
        }
      }
    } catch (err: unknown) {
      if (showToast) {
        toast.error(normalizeError(err) || "Failed to fetch tax details.");
      }
    } finally {
      setIsLookingUpGst(false);
    }  };

  const handleGstinChange = (value: string) => {
    const clean = value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15);
    setGstin(clean);

    // Auto-detect 10-char PAN
    if (clean.length === 10 && isValidPAN(clean)) {
      setPan(clean);
      triggerAutoFill(clean, false);
      return;
    }

    // Auto-extract PAN from 12+ chars of GSTIN
    if (clean.length >= 12) {
      const extractedPan = clean.substring(2, 12);
      if (extractedPan && !pan) {
        setPan(extractedPan);
      }
    }

    // Auto-trigger on full 15-char GSTIN
    if (clean.length === 15 && isValidGSTIN(clean)) {
      triggerAutoFill(clean, false);
    } else if (clean.length < 10) {
      setGstLookupSuccess(null);
    }
  };

  const handleGSTLookup = () => {
    triggerAutoFill(gstin || pan, true);
  };

  const handleCompanySelect = (comp: CompanySearchResult) => {
    setName(comp.name);
    setTradeName(comp.tradeName || comp.name);
    if (comp.phone) setPhone(comp.phone);
    if (comp.address) {
      setAddress(comp.address);
      if (sameShipping) setShippingAddress(comp.address);
    }
    if (comp.pincode) setPincode(comp.pincode);
    if (comp.city) setCity(comp.city);
    if (comp.state) setState(comp.state);
    if (comp.category && CATEGORY_OPTIONS.includes(String(comp.category))) {
      setCategory(String(comp.category));
    }
    if (comp.cin) {
      setNotes((prev) => (prev ? `${prev} | CIN: ${comp.cin}` : `CIN: ${comp.cin}`));
    }
    setGstLookupSuccess(`Selected: ${comp.name} • ${comp.state || "India"} (${comp.cin || "Registered"})`);
    toast.success(`Loaded verified company: ${comp.name}`);
  };

  const handleApplyTallyResult = (result: GSTLookupResult) => {
    if (result.legalName) {
      setName(result.legalName);
      setTradeName(result.tradeName || result.legalName);
    }
    if (result.pan) setPan(result.pan);
    if (result.gstin && isValidGSTIN(result.gstin)) setGstin(result.gstin);
    if (result.address) {
      setAddress(result.address);
      if (sameShipping) setShippingAddress(result.address);
    }
    if (result.pincode) setPincode(result.pincode);
    if (result.city) setCity(result.city);
    if (result.state) setState(result.state);
    if (result.category && CATEGORY_OPTIONS.includes(String(result.category))) {
      setCategory(String(result.category));
    }
    setGstLookupSuccess(`Verified via Tally: ${result.legalName} • ${result.state} (${result.status})`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Party Name is required.");
      return;
    }

    const rawBal = parseFloat(openingBalance) || 0;
    const finalBalance = balanceType === "to_pay" ? -Math.abs(rawBal) : Math.abs(rawBal);

    const payload: Omit<Party, "id" | "created_at"> = {
      name: name.trim(),
      tradeName: tradeName.trim() || undefined,
      phone: phone.trim() || null,
      email: email.trim() || null,
      partyType,
      category: category || "General",
      gstin: gstin.trim() ? gstin.trim().toUpperCase() : null,
      pan: pan.trim() ? pan.trim().toUpperCase() : null,
      address: address.trim() || null,
      city: city.trim() || null,
      state: state.trim() || null,
      pincode: pincode.trim() || null,
      shippingAddress: sameShipping ? (address.trim() || null) : (shippingAddress.trim() || null),
      openingBalance: finalBalance,
      balance: finalBalance,
      creditLimit: creditLimit ? parseFloat(creditLimit) : null,
      creditPeriodDays: creditPeriodDays ? parseInt(creditPeriodDays, 10) : 30,
      customFields: {
        dlNumber: dlNumber.trim(),
        bankAccount: bankAccount.trim(),
        bankIfsc: bankIfsc.trim().toUpperCase(),
        notes: notes.trim(),
      },
      sharedLedgerEnabled: true,
      sharedLedgerStatus: "invited",
    };

    setIsSubmitting(true);
    try {
      await onSave(payload);
      onClose();
    } catch (err: unknown) {
      toast.error(normalizeError(err) || "Failed to save party.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="create-party-title" className="fixed inset-0 z-modal flex items-center justify-center p-0 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-card w-full h-[100dvh] max-h-[100dvh] max-w-full rounded-none border-none p-0 sm:max-w-5xl sm:h-auto sm:max-h-[92vh] sm:rounded-2xl sm:border flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 shadow-2xl">
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 text-primary">
              <Building2 className="w-4 sm:w-5 h-4 sm:h-5" />
            </div>
            <div>
              <h2 id="create-party-title" className="text-base sm:text-lg font-bold text-foreground">
                {initialData ? "Edit Party" : "Create New Party"}
              </h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-1">
                Customer, Supplier, MCA Directory Search & GSTIN/PAN Verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Create Party"
            className="p-1.5 sm:p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors touch-target"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-border px-3 sm:px-6 bg-muted/20 gap-1 overflow-x-auto scrollbar-none shrink-0">
          {[
            { id: "general", label: "General & GSTIN/PAN" },
            { id: "address", label: "Address & Shipping" },
            { id: "credit", label: "Balance & Credit Limit" },
            { id: "custom", label: "Bank & Custom Fields" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as "general" | "address" | "credit" | "custom")}
              className={cn(
                "px-3 sm:px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6 scrollbar-thin">
          {/* TAB 1: General & GSTIN */}
          {activeTab === "general" && (
            <div className="space-y-5">
              {/* Party Type Selector */}
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                  Party Type *
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "customer", label: "Customer", desc: "Buyer / Client" },
                    { id: "supplier", label: "Supplier", desc: "Vendor / Seller" },
                    { id: "both", label: "Both", desc: "Customer & Supplier" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setPartyType(t.id as PartyType)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all flex flex-col justify-between",
                        partyType === t.id
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border hover:border-primary/50 text-foreground bg-card"
                      )}
                    >
                      <span className="font-bold text-sm">{t.label}</span>
                      <span className="text-[11px] text-muted-foreground mt-0.5">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* MCA 3M+ Live Company Search Bar */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">Live MCA Company Directory (3 Million+ Indian Companies)</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground bg-background/80 px-2 py-0.5 rounded border border-border">
                    Auto-fills Name, Address, City, PIN & State
                  </span>
                </div>
                <CompanySearchAutocomplete onSelect={handleCompanySelect} placeholder="Search any company by Name (e.g. Reliance, Haldiram, Apollo, Balaji) or CIN..." />
              </div>

              {/* GSTIN / PAN Auto Lookup Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold text-foreground">GSTIN / PAN Tax Verification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTallyModalOpen(true)}
                      className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 bg-[#FCB316]/15 px-2 py-0.5 rounded border border-amber-500/30"
                    >
                      <Building2 className="w-3 h-3 text-[#D97706] dark:text-[#FBBF24]" />
                      Tally Search
                    </button>
                    <span className="text-[10px] text-muted-foreground bg-background/80 px-2 py-0.5 rounded border border-border hidden sm:inline-block">
                      Official Tally Live Engine
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Enter 15-character GSTIN or 10-character PAN..."
                      value={gstin}
                      onChange={(e) => handleGstinChange(e.target.value)}
                      className="uppercase font-mono text-sm tracking-wider"
                      maxLength={15}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGSTLookup}
                    disabled={isLookingUpGst || (gstin.length < 10 && pan.length < 10)}
                    className="shrink-0 gap-2 border-blue-500/40 text-blue-600 hover:bg-blue-500 hover:text-white"
                  >
                    {isLookingUpGst ? (
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Verify
                  </Button>
                </div>

                {gstLookupSuccess && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium pt-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{gstLookupSuccess}</span>
                  </div>
                )}
              </div>

              {/* Name & Trade Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="party-name" className="text-xs font-semibold">
                    Party / Business Legal Name *
                  </Label>
                  <Input
                    id="party-name"
                    placeholder="e.g. Apex Enterprises Pvt Ltd"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="trade-name" className="text-xs font-semibold">
                    Trade / Display Name
                  </Label>
                  <Input
                    id="trade-name"
                    placeholder="e.g. Apex Store"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                  />
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="party-phone" className="text-xs font-semibold">
                    Mobile Number (WhatsApp) *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      +91
                    </span>
                    <Input
                      id="party-phone"
                      placeholder="9876543210"
                      className="pl-12"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="party-email" className="text-xs font-semibold">
                    Email Address
                  </Label>
                  <Input
                    id="party-email"
                    type="email"
                    placeholder="billing@apexstore.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Category & PAN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Party Category / Group</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="party-pan" className="text-xs font-semibold">
                    PAN Number
                  </Label>
                  <Input
                    id="party-pan"
                    placeholder="e.g. ABCDE1234F"
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase().slice(0, 10))}
                    className="uppercase font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Address & Shipping */}
          {activeTab === "address" && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="billing-address" className="text-xs font-semibold">
                  Billing Street Address
                </Label>
                <Textarea
                  id="billing-address"
                  placeholder="Shop / Unit No, Building, Street, Landmark..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-xs font-semibold">
                    City / District
                  </Label>
                  <Input
                    id="city"
                    placeholder="e.g. Mumbai"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state" className="text-xs font-semibold">
                    State / Place of Supply
                  </Label>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger id="state">
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {INDIAN_STATES_AND_CODES.map((st) => (
                        <SelectItem key={st} value={st}>
                          {st}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pincode" className="text-xs font-semibold">
                    PIN Code
                  </Label>
                  <Input
                    id="pincode"
                    placeholder="e.g. 400001"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                    maxLength={6}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-border space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="same-shipping"
                    checked={sameShipping}
                    onChange={(e) => setSameShipping(e.target.checked)}
                    className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
                  />
                  <Label htmlFor="same-shipping" className="text-xs font-medium cursor-pointer">
                    Shipping Address is the same as Billing Address
                  </Label>
                </div>

                {!sameShipping && (
                  <div className="space-y-1.5 animate-in fade-in duration-200">
                    <Label htmlFor="shipping-address" className="text-xs font-semibold">
                      Shipping / Delivery Address
                    </Label>
                    <Textarea
                      id="shipping-address"
                      placeholder="Warehouse / Delivery Location Address..."
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      rows={3}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Balance & Credit Limit */}
          {activeTab === "credit" && (
            <div className="space-y-5">
              {/* Opening Balance Card */}
              <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Opening Balance
                  </span>
                  <span className="text-[11px] text-muted-foreground">As of Today</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="opening-bal" className="text-xs font-semibold">
                      Amount (₹)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                        ₹
                      </span>
                      <Input
                        id="opening-bal"
                        type="number"
                        placeholder="0.00"
                        className="pl-8 text-base font-semibold"
                        value={openingBalance}
                        onChange={(e) => setOpeningBalance(e.target.value)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Balance Nature</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBalanceType("to_collect")}
                        className={cn(
                          "py-2 px-3 rounded-lg border text-xs font-bold transition-all",
                          balanceType === "to_collect"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                            : "border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        To Collect (Receivable / Dr)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBalanceType("to_pay")}
                        className={cn(
                          "py-2 px-3 rounded-lg border text-xs font-bold transition-all",
                          balanceType === "to_pay"
                            ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"
                            : "border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        To Pay (Payable / Cr)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Credit Terms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="credit-limit" className="text-xs font-semibold">
                    Credit Limit (₹)
                  </Label>
                  <Input
                    id="credit-limit"
                    type="number"
                    placeholder="e.g. 50000 (0 for Unlimited)"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Alerts cashier when unpaid invoices exceed this threshold
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="credit-period" className="text-xs font-semibold">
                    Credit Period (Days)
                  </Label>
                  <Select value={creditPeriodDays} onValueChange={setCreditPeriodDays}>
                    <SelectTrigger id="credit-period">
                      <SelectValue placeholder="Select Days" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 Days (Weekly)</SelectItem>
                      <SelectItem value="15">15 Days (Fortnightly)</SelectItem>
                      <SelectItem value="30">30 Days (Monthly)</SelectItem>
                      <SelectItem value="45">45 Days</SelectItem>
                      <SelectItem value="60">60 Days (2 Months)</SelectItem>
                      <SelectItem value="90">90 Days (Quarterly)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Generates overdue alerts after this grace period
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Custom Fields & Bank Details */}
          {activeTab === "custom" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="dl-number" className="text-xs font-semibold">
                    Drug License (DL) / FSSAI / Reg. Number
                  </Label>
                  <Input
                    id="dl-number"
                    placeholder="e.g. MH-MZ2-123456"
                    value={dlNumber}
                    onChange={(e) => setDlNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bank-account" className="text-xs font-semibold">
                    Bank Account Number
                  </Label>
                  <Input
                    id="bank-account"
                    placeholder="e.g. 50200012345678"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="bank-ifsc" className="text-xs font-semibold">
                    Bank IFSC Code
                  </Label>
                  <Input
                    id="bank-ifsc"
                    placeholder="e.g. HDFC0001234"
                    value={bankIfsc}
                    onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                    className="uppercase font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="party-notes" className="text-xs font-semibold">
                    Internal Remarks / Payment Instructions
                  </Label>
                  <Input
                    id="party-notes"
                    placeholder="Special discounts, preferred transport, etc."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {activeTab !== "general" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (activeTab === "address") setActiveTab("general");
                      else if (activeTab === "credit") setActiveTab("address");
                      else if (activeTab === "custom") setActiveTab("credit");
                    }}
                  >
                    ← Back
                  </Button>
                )}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              {activeTab !== "custom" ? (
                <Button
                  type="button"
                  onClick={() => {
                    if (activeTab === "general") setActiveTab("address");
                    else if (activeTab === "address") setActiveTab("credit");
                    else if (activeTab === "credit") setActiveTab("custom");
                  }}
                  className="gap-1.5"
                >
                  Continue →
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {initialData ? "Update Party" : "Save & Create Party"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>

      <TallyGstSearchModal
        open={tallyModalOpen}
        onOpenChange={setTallyModalOpen}
        initialGstin={gstin}
        onApply={handleApplyTallyResult}
      />
    </div>
  , document.body);
}
