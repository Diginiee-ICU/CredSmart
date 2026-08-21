import { useState, useRef, useEffect } from "react";
import { Search, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchCompanies } from "@/lib/turso";
import { cn } from "@/lib/utils";

interface CompanySearchAutocompleteProps {
  onSelect: (company: { name: string; phone: string; address: string; cin: string }) => void;
}

export function CompanySearchAutocomplete({ onSelect }: CompanySearchAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
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
        // Ensure this response is for the most recent query
        if (queryId === currentQueryIdRef.current) {
          setResults(data || []);
          setError(null);
        }
      } catch (err: any) {
        if (queryId === currentQueryIdRef.current) {
          console.error("CompanySearchAutocomplete error:", err);
          setError(err?.message || "Search failed");
          setResults([]);
        }
      } finally {
        if (queryId === currentQueryIdRef.current) {
          setLoading(false);
        }
      }
    }, 300);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
        <Input
          placeholder="Auto-fill from MCA (Type Company Name or CIN)"
          className="pl-9 bg-primary/5 border-primary/20 text-primary placeholder:text-primary/60 focus:ring-primary/30"
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
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-border/60">
          {results.map((comp) => (
            <button
              key={comp.cin || comp.company_name}
              type="button"
              onClick={() => {
                onSelect({
                  name: comp.company_name,
                  phone: comp.phone_number || "",
                  address: comp.company_address || "",
                  cin: comp.cin,
                });
                setOpen(false);
                setQuery("");
              }}
              className="w-full text-left px-3.5 py-2.5 hover:bg-muted/50 transition-colors flex items-start gap-3 group"
            >
              <div className="mt-0.5 p-1.5 bg-primary/10 text-primary rounded-lg shrink-0 group-hover:scale-105 transition-transform">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-foreground truncate">{comp.company_name}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[10px] font-mono font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                    {comp.cin}
                  </span>
                  {comp.company_address && (
                    <span className="text-xs text-muted-foreground truncate max-w-[280px]">
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
