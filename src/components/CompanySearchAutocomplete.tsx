import { useState, useRef, useEffect } from "react";
import { Search, Building2, MapPin, Hash, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchCompanies } from "@/lib/turso";
import { cn } from "@/lib/utils";

export const CIN_STATE_MAP: Record<string, { name: string; code: string }> = {
  MH: { name: "Maharashtra", code: "27" },
  DL: { name: "Delhi", code: "07" },
  KA: { name: "Karnataka", code: "29" },
  GJ: { name: "Gujarat", code: "24" },
  TN: { name: "Tamil Nadu", code: "33" },
  TG: { name: "Telangana", code: "36" },
  TS: { name: "Telangana", code: "36" },
  WB: { name: "West Bengal", code: "19" },
  UP: { name: "Uttar Pradesh", code: "09" },
  RJ: { name: "Rajasthan", code: "08" },
  HR: { name: "Haryana", code: "06" },
  PB: { name: "Punjab", code: "03" },
  MP: { name: "Madhya Pradesh", code: "23" },
  KL: { name: "Kerala", code: "32" },
  AP: { name: "Andhra Pradesh", code: "37" },
  OR: { name: "Odisha", code: "21" },
  OD: { name: "Odisha", code: "21" },
  BR: { name: "Bihar", code: "10" },
  JH: { name: "Jharkhand", code: "20" },
  CT: { name: "Chhattisgarh", code: "22" },
  CG: { name: "Chhattisgarh", code: "22" },
  GA: { name: "Goa", code: "30" },
  UT: { name: "Uttarakhand", code: "05" },
  UR: { name: "Uttarakhand", code: "05" },
  UK: { name: "Uttarakhand", code: "05" },
  HP: { name: "Himachal Pradesh", code: "02" },
  AS: { name: "Assam", code: "18" },
  JK: { name: "Jammu and Kashmir", code: "01" },
  CH: { name: "Chandigarh", code: "04" },
  PY: { name: "Puducherry", code: "34" },
  ML: { name: "Meghalaya", code: "17" },
  TR: { name: "Tripura", code: "16" },
  MZ: { name: "Mizoram", code: "15" },
  MN: { name: "Manipur", code: "14" },
  NL: { name: "Nagaland", code: "13" },
  AR: { name: "Arunachal Pradesh", code: "12" },
  SK: { name: "Sikkim", code: "11" },
  DN: { name: "Dadra & Nagar Haveli", code: "26" },
  DD: { name: "Daman & Diu", code: "26" },
  LD: { name: "Lakshadweep", code: "31" },
  AN: { name: "Andaman and Nicobar", code: "35" },
};

export interface SelectedCompanyData {
  name: string;
  tradeName?: string;
  phone: string;
  address: string;
  cin: string;
  pincode: string;
  city: string;
  state: string;
  stateCode: string;
  category: string;
}

interface CompanySearchAutocompleteProps {
  onSelect: (company: SelectedCompanyData) => void;
  placeholder?: string;
  className?: string;
}

export function CompanySearchAutocomplete({
  onSelect,
  placeholder = "Search 3M+ Indian Companies by Name or CIN...",
  className,
}: CompanySearchAutocompleteProps) {
  const [query, setQuery] = useState("");
  interface CompanySearchResult {
    company_name: string;
    company_address?: string;
    pin_code?: string;
    phone_number?: string;
    cin?: string;
    company_roc?: string;
    // add other optional fields returned by searchCompanies as needed
  }

  const [results, setResults] = useState<CompanySearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentQueryIdRef = useRef(0);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const handleChange = (val: string) => {
    setQuery(val);
    setError(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val.trim() || val.trim().length < 2) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setOpen(true);

    const queryId = ++currentQueryIdRef.current;
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const data = await searchCompanies(val);
        if (queryId === currentQueryIdRef.current) {
          setResults((data as CompanySearchResult[]) || []);
          setError(null);
        }
      } catch (err: unknown) {
        if (queryId === currentQueryIdRef.current) {
          console.error("CompanySearchAutocomplete error:", err);
          const message = err instanceof Error ? err.message : String(err);
          setError(message || "Search failed");
          setResults([]);
        }
      } finally {
        if (queryId === currentQueryIdRef.current) {
          setLoading(false);
        }
      }
    }, 250);
  };

  const handleSelectCompany = (comp: CompanySearchResult) => {
    const rawCin = (comp.cin || "").toUpperCase().trim();
    let state = "";
    let stateCode = "";

    // Extract state from CIN code at chars 6-7 (e.g. U45200OR2022PTC040678 -> OR)
    if (rawCin.length >= 8) {
      const cinStateAlpha = rawCin.substring(6, 8);
      if (CIN_STATE_MAP[cinStateAlpha]) {
        state = CIN_STATE_MAP[cinStateAlpha].name;
        stateCode = CIN_STATE_MAP[cinStateAlpha].code;
      }
    }

    const addr = comp.company_address || "";
    const pincode = comp.pin_code || addr.match(/\b[1-9][0-9]{5}\b/)?.[0] || "";

    // Extract city from address parts
    let city = "";
    if (addr) {
      const parts = addr.split(",").map((p: string) => p.trim());
      if (parts.length >= 3) {
        city = parts[parts.length - 3] || parts[parts.length - 2];
      }
    }

    onSelect({
      name: comp.company_name,
      tradeName: comp.company_name,
      phone: comp.phone_number || "",
      address: addr,
      cin: rawCin,
      pincode,
      city,
      state: state || (comp.company_roc ? comp.company_roc.replace("ROC ", "") : ""),
      stateCode: stateCode || "27",
      category: "Corporate",
    });

    setOpen(false);
    setQuery("");
  };

  return (
    <div className={cn("relative w-full", className)} ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
        <Input
          placeholder={placeholder}
          className="pl-9 pr-9 bg-card border-border hover:border-primary/40 focus:border-primary text-sm transition-colors shadow-sm"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => {
            if (results.length > 0 || (query.trim().length >= 2 && !loading)) setOpen(true);
          }}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-2xl max-h-72 overflow-y-auto divide-y divide-border/60 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 bg-muted/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span>Found in MCA 3M+ Database</span>
            <span>Click to Auto-fill</span>
          </div>
          {results.map((comp) => (
            <button
              key={comp.cin || comp.company_name}
              type="button"
              onClick={() => handleSelectCompany(comp)}
              className="w-full text-left px-3.5 py-2.5 hover:bg-primary/5 transition-colors flex items-start gap-3 group"
            >
              <div className="mt-0.5 p-1.5 bg-primary/10 text-primary rounded-lg shrink-0 group-hover:scale-105 transition-transform">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                  {comp.company_name}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-muted-foreground">
                  {comp.cin && (
                    <span className="font-mono bg-muted text-foreground px-1.5 py-0.5 rounded text-[10px]">
                      {comp.cin}
                    </span>
                  )}
                  {comp.company_address && (
                    <span className="truncate max-w-[280px] text-[11px]">
                      {comp.company_address}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && !loading && query.trim().length >= 2 && results.length === 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg p-4 text-center text-xs text-muted-foreground">
          {error ? `Search error: ${error}` : `No registered companies found matching "${query}"`}
        </div>
      )}
    </div>
  );
}
