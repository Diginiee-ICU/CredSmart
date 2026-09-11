import { useState } from "react";
import {
  Building2,
  Store,
  Phone,
  Mail,
  MapPin,
  FileText,
  Landmark,
  CreditCard,
  QrCode,
  CheckCircle2,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "@/hooks/use-toast";
import { INDIAN_STATES, BUSINESS_TYPES } from "@/types/invoice-settings";

interface CreateBusinessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (orgId: string) => void;
}

export function CreateBusinessModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateBusinessModalProps) {
  const { createOrganization } = useOrganization();
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "tax" | "bank">("general");

  // Form State
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("General Store");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [state, setState] = useState("");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [invoicePrefix, setInvoicePrefix] = useState("INV");

  // Bank & UPI Details
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [upiId, setUpiId] = useState("");

  const handleGstinChange = (val: string) => {
    const clean = val.toUpperCase().trim();
    setGstin(clean);
    if (clean.length >= 2) {
      const code = clean.slice(0, 2);
      const match = INDIAN_STATES.find((s) => s.code === code);
      if (match && !state) {
        setState(match.name);
      }
    }
    if (clean.length >= 12 && !pan) {
      setPan(clean.slice(2, 12));
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({
        title: "Store Name Required",
        description: "Please provide a valid business or store name.",
        variant: "destructive",
      });
      setActiveTab("general");
      return;
    }

    setSubmitting(true);
    try {
      const newId = await createOrganization({
        name: name.trim(),
        business_type: businessType,
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        gstin: gstin.trim(),
        pan: pan.trim(),
        invoice_prefix: invoicePrefix.trim() || "INV",
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifsc: ifsc.trim(),
        accountHolder: accountHolder.trim() || name.trim(),
        upiId: upiId.trim(),
      });

      toast({
        title: "Business Created Successfully! 🎉",
        description: `Switched active store to "${name.trim()}".`,
      });

      // Reset Form
      setName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setGstin("");
      setPan("");
      setBankName("");
      setAccountNumber("");
      setIfsc("");
      setAccountHolder("");
      setUpiId("");
      setActiveTab("general");

      onOpenChange(false);
      if (newId && onSuccess) {
        onSuccess(newId);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({
        title: "Failed to create business",
        description: message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl sm:max-w-2xl max-h-[90vh] overflow-y-auto font-sans p-0 gap-0 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-[#0E121E]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  Add New Business / Branch
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Create multiple companies, warehouses or branches under one account
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Stepper / Tab Toggle */}
          <div className="flex items-center gap-2 mt-4 bg-slate-200/70 dark:bg-slate-800/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                activeTab === "general"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              1. Store Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tax")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                activeTab === "tax"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              2. GST &amp; Tax
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("bank")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                activeTab === "bank"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              3. Bank &amp; UPI
            </button>
          </div>
        </div>

        {/* Tab 1: General Info */}
        {activeTab === "general" && (
          <div className="p-5 sm:p-6 space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700 dark:text-slate-300">
                Business / Branch Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. CredSmart Mega Store or Mumbai Branch"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Business Type</Label>
                <Select value={businessType} onValueChange={setBusinessType}>
                  <SelectTrigger className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General Store">General Store / Kirana</SelectItem>
                    <SelectItem value="Supermarket">Supermarket / Grocery</SelectItem>
                    <SelectItem value="Electronics">Electronics &amp; Mobile</SelectItem>
                    <SelectItem value="Apparel & Fashion">Apparel &amp; Fashion</SelectItem>
                    <SelectItem value="Pharmacy">Pharmacy / Medical</SelectItem>
                    <SelectItem value="Restaurant & Cafe">Restaurant &amp; Cafe</SelectItem>
                    <SelectItem value="Wholesale Depot">Wholesale Depot</SelectItem>
                    <SelectItem value="Manufacturing">Manufacturing / Factory</SelectItem>
                    <SelectItem value="Services">Services &amp; Consulting</SelectItem>
                    <SelectItem value="Other">Other Retail / Trade</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Phone Number</Label>
                <Input
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Store Email</Label>
                <Input
                  type="email"
                  placeholder="store@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Invoice Prefix</Label>
                <Input
                  placeholder="e.g. INV, BILL, DEL"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700 dark:text-slate-300">Store / Billing Address</Label>
              <Input
                placeholder="Shop No. 12, Commercial Complex, MG Road"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>
        )}

        {/* Tab 2: GST & Tax */}
        {activeTab === "tax" && (
          <div className="p-5 sm:p-6 space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700 dark:text-slate-300">
                GSTIN Number (Optional)
              </Label>
              <Input
                placeholder="27ABCDE1234F1Z5"
                value={gstin}
                onChange={(e) => handleGstinChange(e.target.value)}
                className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 font-mono tracking-wider uppercase"
              />
              <p className="text-[10px] text-slate-500">
                Entering GSTIN auto-fills PAN and operating state.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">PAN Number</Label>
                <Input
                  placeholder="ABCDE1234F"
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">State</Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {INDIAN_STATES.map((s) => (
                      <SelectItem key={s.code} value={s.name}>
                        {s.code} - {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Bank & UPI Details */}
        {activeTab === "bank" && (
          <div className="p-5 sm:p-6 space-y-4 text-xs">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2.5">
              <QrCode className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                These bank and UPI details will automatically appear on invoices, receipts, and QR payment codes.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700 dark:text-slate-300">UPI ID for Dynamic QR Payment</Label>
              <Input
                placeholder="e.g. storename@okaxis or 9876543210@paytm"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value.trim())}
                className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Bank Name</Label>
                <Input
                  placeholder="e.g. State Bank of India, HDFC, ICICI"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Account Holder Name</Label>
                <Input
                  placeholder="Name as in bank account"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Bank Account Number</Label>
                <Input
                  placeholder="e.g. 123456789012"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.trim())}
                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 dark:text-slate-300">IFSC Code</Label>
                <Input
                  placeholder="e.g. SBIN0001234"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase().trim())}
                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 font-mono uppercase"
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between gap-3">
          {activeTab === "general" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveTab(activeTab === "bank" ? "tax" : "general")}
              className="rounded-xl text-xs"
            >
              Back
            </Button>
          )}

          <div className="flex items-center gap-2">
            {activeTab !== "bank" ? (
              <Button
                type="button"
                onClick={() => {
                  if (activeTab === "general" && !name.trim()) {
                    toast({ title: "Please enter store name", variant: "destructive" });
                    return;
                  }
                  setActiveTab(activeTab === "general" ? "tax" : "bank");
                }}
                className="rounded-full text-xs font-bold [background-image:var(--gradient-primary)] text-white px-5"
              >
                Next Step
              </Button>
            ) : (
              <Button
                type="button"
                disabled={submitting}
                onClick={handleCreate}
                className="rounded-full text-xs font-bold [background-image:var(--gradient-ruby)] text-white px-6 shadow-md"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Creating Business...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Complete &amp; Switch Business
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
