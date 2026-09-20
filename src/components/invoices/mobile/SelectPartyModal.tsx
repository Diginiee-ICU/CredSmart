import React, { useState, useMemo } from "react";
import { X, Search, ArrowDown, ArrowUp, Plus, UserPlus } from "lucide-react";
import { CreatePartyModal, MobileCreatedPartyResult } from "./CreatePartyModal";

export interface CustomerOption {
  id: string;
  name: string;
  phone: string;
  balance?: number;
  gstin?: string;
  address?: string;
}

export interface SelectPartyModalProps {
  onClose: () => void;
  customers: CustomerOption[];
  onSelect: (id: string, party?: any) => void;
  partyType?: "customer" | "supplier";
  onPartyCreated?: (party: MobileCreatedPartyResult) => void;
  orgId?: string; // own org id to exclude from suggestions
}

/** Reads network org cache from localStorage (synchronous, zero latency) */
function getNetworkOrgSuggestions(query: string, ownOrgId?: string): CustomerOption[] {
  if (typeof window === "undefined") return [];
  const q = query.trim().toLowerCase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allOrgs: any[] = [];
  try {
    const cachedRaw = localStorage.getItem("credsmart_registered_orgs_cache");
    if (cachedRaw) {
      const parsed = JSON.parse(cachedRaw);
      if (Array.isArray(parsed)) allOrgs.push(...parsed);
    }
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("credsmart_org_registry_")) {
        try {
          const orgs = JSON.parse(localStorage.getItem(k) || "[]");
          if (Array.isArray(orgs)) allOrgs.push(...orgs);
        } catch { /* ignore */ }
      }
    }
    const activeOrgRaw = localStorage.getItem("credsmart_active_org_data");
    if (activeOrgRaw) {
      try {
        const parsed = JSON.parse(activeOrgRaw);
        if (parsed?.id) allOrgs.push(parsed);
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }

  // Deduplicate and filter
  const seenIds = new Set<string>();
  return allOrgs
    .filter((o) => {
      if (!o?.id || seenIds.has(o.id)) return false;
      if (ownOrgId && o.id === ownOrgId) return false;
      seenIds.add(o.id);
      if (!q) return true;
      const name = (o.name || "").toLowerCase();
      const phone = (o.phone || "").replace(/\D/g, "");
      const gstin = (o.gstin || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || gstin.includes(q);
    })
    .slice(0, 10)
    .map((o) => ({
      id: o.id as string,
      name: o.name as string,
      phone: o.phone || "",
      gstin: o.gstin || undefined,
      address: o.address || undefined,
      balance: 0,
      isNetworkOrg: true as const,
    }));
}

export function SelectPartyModal({
  onClose,
  customers,
  onSelect,
  partyType = "customer",
  onPartyCreated,
  orgId,
}: SelectPartyModalProps) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "contacts">("all");
  const [isCreatePartyOpen, setIsCreatePartyOpen] = useState(false);

  // Merge local customers + network org suggestions
  const merged = useMemo(() => {
    const networkOrgs = getNetworkOrgSuggestions(search, orgId);
    const seenKeys = new Set(
      customers.map((c) => `${(c.name || "").toLowerCase().trim()}|${(c.phone || "").trim()}`)
    );
    const networkOnly = networkOrgs.filter((o) => {
      const key = `${(o.name || "").toLowerCase().trim()}|${(o.phone || "").trim()}`;
      return !seenKeys.has(key);
    });
    return [...customers, ...networkOnly];
  }, [customers, search, orgId]);

  const filtered = merged.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search)) ||
      (c.gstin && c.gstin.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreatedParty = (newParty: MobileCreatedPartyResult) => {
    setIsCreatePartyOpen(false);
    if (onPartyCreated) {
      onPartyCreated(newParty);
    }
    onSelect(newParty.id, newParty);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col h-[100dvh] overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-white shrink-0">
        <h2 className="text-[17px] font-bold text-slate-900">
          Select {partyType === "supplier" ? "Supplier" : "Party"}
        </h2>
        <button
          onClick={onClose}
          className="p-1 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-2 shrink-0">
        <div className="bg-slate-100 rounded-xl p-3 flex items-center gap-2 border border-slate-200/60 focus-within:border-indigo-500 focus-within:bg-white transition-all">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder={
              partyType === "supplier"
                ? "Search by Supplier Name, Phone or GSTIN"
                : "Search by Party Name, Phone or GSTIN"
            }
            className="bg-transparent border-none outline-none flex-1 text-[15px] placeholder:text-slate-400 text-slate-900 font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 shrink-0 px-2">
        <button
          onClick={() => setTab("all")}
          className={`flex-1 text-center py-3 text-[14px] transition-colors cursor-pointer ${
            tab === "all"
              ? "border-b-2 border-indigo-600 text-indigo-700 font-bold"
              : "text-slate-500 font-medium"
          }`}
        >
          All {partyType === "supplier" ? "Suppliers" : "Parties"} ({customers.length})
        </button>
        <button
          onClick={() => setTab("contacts")}
          className={`flex-1 text-center py-3 text-[14px] transition-colors cursor-pointer ${
            tab === "contacts"
              ? "border-b-2 border-indigo-600 text-indigo-700 font-bold"
              : "text-slate-500 font-medium"
          }`}
        >
          With Phone Numbers
        </button>
      </div>

      {/* Parties List */}
      <div className="flex-1 overflow-y-auto pb-24">
        {filtered.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-800 font-bold text-base">
                {search ? `No party found for "${search}"` : "No parties recorded yet"}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Create a new party and start billing immediately
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreatePartyOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-transform cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create "{search || "New Party"}"</span>
            </button>
          </div>
        ) : (
          filtered
            .filter((c) => (tab === "contacts" ? !!c.phone : true))
            .map((c) => {
              const bal = c.balance ?? 0;
              const isReceivable = bal >= 0;
              const isNetworkOrg = (c as { isNetworkOrg?: boolean }).isNetworkOrg;

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    onSelect(c.id, c);
                    onClose();
                  }}
                  className="flex justify-between items-center p-4 border-b border-slate-100 active:bg-indigo-50/50 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex flex-col gap-0.5 min-w-0 pr-3">
                    <span className="text-[15px] font-semibold text-slate-900 truncate flex items-center gap-1.5">
                      {c.name}
                      {isNetworkOrg && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700 uppercase tracking-wide shrink-0">
                          CredSmart
                        </span>
                      )}
                    </span>
                    <div className="text-xs text-slate-400 font-medium tracking-wide flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono">{c.phone || "No phone"}</span>
                      {c.gstin && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span className="font-mono text-[11px] text-slate-500 uppercase">{c.gstin}</span>
                        </>
                      )}
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span className="capitalize">{isNetworkOrg ? "Network" : partyType}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 text-right">
                    {isNetworkOrg ? (
                      <span className="text-xs font-bold text-indigo-500">Network</span>
                    ) : (
                      <>
                        <span
                          className={`text-sm font-bold font-mono ${
                            isReceivable ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {bal !== 0 ? (isReceivable ? "+ " : "- ") : ""}₹ {Math.abs(bal).toLocaleString("en-IN")}
                        </span>
                        {isReceivable ? (
                          <ArrowDown className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <ArrowUp className="w-3.5 h-3.5 text-rose-500" />
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
        )}
      </div>

      {/* Floating Bottom Button: Create Party */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[260px] z-10 pb-[env(safe-area-inset-bottom)]">
        <button
          type="button"
          onClick={() => setIsCreatePartyOpen(true)}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-full flex items-center justify-center gap-2.5 shadow-[0_8px_20px_-4px_rgba(79,70,229,0.4)] active:scale-95 transition-transform font-bold text-[15px] cursor-pointer"
        >
          <div className="bg-white text-indigo-600 rounded-full p-0.5">
            <Plus className="w-4 h-4 stroke-[3]" />
          </div>
          <span>Create Party</span>
        </button>
      </div>

      {/* Embedded Mobile Create Party Modal */}
      {isCreatePartyOpen && (
        <CreatePartyModal
          onClose={() => setIsCreatePartyOpen(false)}
          defaultType={partyType}
          initialName={search}
          onPartyCreated={handleCreatedParty}
        />
      )}
    </div>
  );
}
