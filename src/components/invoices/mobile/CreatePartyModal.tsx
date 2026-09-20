import React, { useState } from "react";
import { ArrowLeft, User, Phone, MapPin, Building2, Mail, IndianRupee, Check, RotateCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { INDIAN_STATES_AND_CODES } from "@/utils/suggestionData";

export interface MobileCreatedPartyResult {
  id: string;
  name: string;
  phone: string;
  gstin: string;
  address: string;
  balance: number;
  partyType: "customer" | "supplier";
}

interface CreatePartyModalProps {
  onClose: () => void;
  defaultType?: "customer" | "supplier";
  initialName?: string;
  onPartyCreated: (party: MobileCreatedPartyResult) => void;
}

export function CreatePartyModal({
  onClose,
  defaultType = "customer",
  initialName = "",
  onPartyCreated,
}: CreatePartyModalProps) {
  const { orgId } = useOrganization();

  const [partyType, setPartyType] = useState<"customer" | "supplier">(defaultType);
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState("");
  const [gstin, setGstin] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [balanceType, setBalanceType] = useState<"receive" | "pay">(
    defaultType === "customer" ? "receive" : "pay"
  );
  const [isSaving, setIsSaving] = useState(false);

  // Auto state detection from GSTIN
  const detectedState = React.useMemo(() => {
    if (gstin && gstin.length >= 2) {
      const prefix = gstin.substring(0, 2);
      return INDIAN_STATES_AND_CODES.find((s) => s.startsWith(prefix));
    }
    return null;
  }, [gstin]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Please enter Party / Business Name");
      return;
    }

    if (!orgId) {
      toast.error("Organization session not found. Please reload.");
      return;
    }

    const trimmedPhone = phone.trim();
    const cleanGstin = gstin.trim().toUpperCase();
    const trimmedAddress = address.trim();
    const trimmedEmail = email.trim();
    const parsedBalance = parseFloat(openingBalance) || 0;
    const signedBalance = balanceType === "receive" ? parsedBalance : -parsedBalance;

    setIsSaving(true);
    try {
      const isSupplier = partyType === "supplier";
      const targetTable = isSupplier ? "suppliers" : "customers";

      const baseData: Record<string, any> = {
        organization_id: orgId,
        name: trimmedName,
        phone: trimmedPhone || null,
        email: trimmedEmail || null,
        address: trimmedAddress || null,
      };

      const insertData = isSupplier
        ? { ...baseData, gstin: cleanGstin || null }
        : { ...baseData, custom_fields: cleanGstin ? { gstin: cleanGstin } : {} };

      const { data: newParty, error } = await supabase
        .from(targetTable)
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // If opening balance entered, record initial ledger entry
      if (newParty && parsedBalance > 0) {
        try {
          await supabase.from("credit_transactions").insert({
            organization_id: orgId,
            party_id: newParty.id,
            party_type: isSupplier ? "supplier" : "customer",
            amount: parsedBalance,
            type: balanceType === "receive" ? "credit" : "payment",
            description: "Opening balance",
            created_by: "mobile_invoice",
          });
        } catch (trxErr) {
          console.warn("Could not insert opening credit transaction:", trxErr);
        }
      }

      toast.success(`${isSupplier ? "Supplier" : "Customer"} "${trimmedName}" created!`);

      const result: MobileCreatedPartyResult = {
        id: newParty.id,
        name: trimmedName,
        phone: trimmedPhone,
        gstin: cleanGstin,
        address: trimmedAddress,
        balance: signedBalance,
        partyType,
      };

      onPartyCreated(result);
    } catch (err: any) {
      console.error("Failed to create party on mobile:", err);
      toast.error(err?.message || "Failed to create party. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col h-[100dvh] overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
      {/* 1. Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -ml-1 text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-[17px] font-bold text-slate-900 leading-tight">Create New Party</h2>
            <p className="text-[11px] text-slate-500 font-medium">Add to your directory instantly</p>
          </div>
        </div>

        {/* Party Type Switcher */}
        <div className="flex bg-slate-100 p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => setPartyType("customer")}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
              partyType === "customer"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Customer
          </button>
          <button
            type="button"
            onClick={() => setPartyType("supplier")}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
              partyType === "supplier"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Supplier
          </button>
        </div>
      </div>

      {/* 2. Scrollable Form */}
      <form id="mobile-create-party-form" onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
        {/* Party Name */}
        <div>
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
            Party Name / Business Name <span className="text-rose-500">*</span>
          </label>
          <div className="flex items-center border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50/50 focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
            <User className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
            <input
              type="text"
              autoFocus
              required
              placeholder="e.g. Ramesh Traders / Sharma Store"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Phone Number */}
        <div>
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
            Mobile Number
          </label>
          <div className="flex items-center border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50/50 focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
            <Phone className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
            <span className="text-sm font-semibold text-slate-400 mr-1.5">+91</span>
            <input
              type="tel"
              maxLength={10}
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              className="w-full bg-transparent text-sm font-mono font-medium text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* GSTIN */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              GSTIN (Optional)
            </label>
            {detectedState && (
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-mono">
                {detectedState}
              </span>
            )}
          </div>
          <div className="flex items-center border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50/50 focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
            <Building2 className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
            <input
              type="text"
              maxLength={15}
              placeholder="e.g. 27ABCDE1234F1Z5"
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              className="w-full bg-transparent text-sm font-mono font-bold text-slate-900 uppercase outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Billing Address */}
        <div>
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
            Billing Address
          </label>
          <div className="flex items-start border border-slate-200 rounded-xl p-3 bg-slate-50/50 focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
            <MapPin className="w-4 h-4 text-slate-400 mr-2.5 mt-0.5 shrink-0" />
            <textarea
              rows={2}
              placeholder="Shop No, Market, City, State..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none resize-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Opening Balance */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5 text-indigo-600" />
              Opening Balance
            </label>
            <div className="flex bg-slate-200/70 p-0.5 rounded-lg text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setBalanceType("receive")}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  balanceType === "receive"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600"
                }`}
              >
                To Receive (Dr)
              </button>
              <button
                type="button"
                onClick={() => setBalanceType("pay")}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  balanceType === "pay"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-slate-600"
                }`}
              >
                To Pay (Cr)
              </button>
            </div>
          </div>
          <input
            type="number"
            step="any"
            min="0"
            placeholder="0.00"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            className="w-full border border-slate-200 rounded-xl p-2.5 bg-white text-base font-bold font-mono text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10"
          />
        </div>

        {/* Email (Optional) */}
        <div>
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
            Email ID (Optional)
          </label>
          <div className="flex items-center border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50/50 focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
            <Mail className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
            <input
              type="email"
              placeholder="party@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>
      </form>

      {/* 3. Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-slate-200 bg-white z-20 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <button
          type="submit"
          form="mobile-create-party-form"
          disabled={isSaving || !name.trim()}
          className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-[15px] shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin" />
              <span>Saving Party...</span>
            </>
          ) : (
            <>
              <Check className="w-5 h-5 stroke-[2.5]" />
              <span>Save &amp; Select Party</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
