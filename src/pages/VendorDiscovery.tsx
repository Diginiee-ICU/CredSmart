import { useState, useEffect } from "react";
import {
  Search,
  MapPin,
  Building2,
  ExternalLink,
  Plus,
  Map,
  Briefcase,
  Sparkles,
  ShieldCheck,
  Globe2,
  Compass,
  ArrowRight,
  X,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { discoverCompanies } from "@/lib/turso";
import { useNavigate } from "react-router-dom";
import { ROUTE_PATHS } from "@/config/routes";
import { cn } from "@/lib/utils";

const QUICK_TAGS = [
  "Textiles",
  "Pharmaceuticals",
  "Electronics",
  "Packaging",
  "Logistics",
  "Food Products",
  "Steel & Metals",
  "Automotive",
];

export default function VendorDiscovery() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [results, setResults] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // We load a default set of companies on mount (or first search)
  useEffect(() => {
    handleSearch();
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (customSearch?: string) => {
    const searchTerm = customSearch !== undefined ? customSearch : search;
    if (customSearch !== undefined) {
      setSearch(customSearch);
    }
    setLoading(true);
    setHasSearched(true);
    try {
      const data = await discoverCompanies({
        search: (searchTerm || "").trim() || undefined,
        pinCode: pinCode.trim() || undefined,
        limit: 50,
      });
      setResults(data || []);
    } catch (err: unknown) {
      toast.error(err.message || "Failed to fetch companies");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAsSupplier = (comp: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    navigate(ROUTE_PATHS.purchases, {
      state: {
        openForm: true,
        prefilledSupplier: {
          name: comp.company_name,
          phone: comp.phone_number || "",
          address: comp.company_address || "",
          gstin: comp.cin || "",
        },
      },
    });
    toast.success(`Opening Purchase Invoice with "${comp.company_name}" pre-filled`);
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 py-6 sm:px-8 sm:py-8 space-y-6">
      {/* Hero Search Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/95 via-primary to-slate-900 text-white p-6 sm:p-10 shadow-xl border border-primary/20">
        {/* Glow & background patterns */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-white/90">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>3,000,000+ MCA Registered Indian Businesses</span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              B2B Vendor & Supplier Discovery
            </h1>
            <p className="text-sm sm:text-base text-white/80 mt-2 max-w-2xl leading-relaxed">
              Instantly discover manufacturers, wholesale distributors, and suppliers across all Indian states and pin codes.
            </p>
          </div>

          {/* Search Inputs Card */}
          <div className="pt-2">
            <div className="bg-card/95 backdrop-blur-md border border-white/20 p-2 sm:p-2.5 rounded-2xl shadow-2xl flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search industry or company name (e.g., Textile, Steel, Pharma)..."
                  className="w-full h-8.5 pl-10 pr-4 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm font-medium"
                />
                {search && (
                  <button
                    onClick={() => {
                      setSearch("");
                      handleSearch("");
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="relative sm:w-44">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="PIN Code..."
                  maxLength={6}
                  className="w-full h-8.5 pl-10 pr-4 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm font-mono"
                />
              </div>

              <button
                onClick={() => handleSearch()}
                disabled={loading}
                className="h-8.5 px-6 font-bold rounded-xl gap-2 shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-xs shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Compass className="w-4 h-4 stroke-[2.5]" />
                )}
                <span>{loading ? "Searching..." : "Discover Vendors"}</span>
              </button>
            </div>
          </div>

          {/* Quick industry chips */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-xs text-white/70 font-medium">Popular Industries:</span>
            {QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => handleSearch(tag)}
                className="text-xs px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-medium transition-colors cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-foreground">Verified Companies</h2>
          {!loading && (
            <Badge variant="secondary" className="font-semibold text-xs px-2 py-0.5">
              {results.length} results
            </Badge>
          )}
        </div>
        {hasSearched && (
          <p className="text-xs text-muted-foreground hidden sm:block">
            Showing top MCA database matches from Turso
          </p>
        )}
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-52 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs rounded-2xl p-5 shadow-sm space-y-3 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-xl" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-5/6" />
              </div>
              <div className="h-9 bg-muted rounded-xl pt-2" />
            </div>
          ))
        ) : results.length > 0 ? (
          results.map((comp) => (
            <div
              key={comp.cin || comp.company_name}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 via-blue-500 to-cyan-500 rounded-l-2xl" />
              <div>
                {/* Header */}
                <div className="flex items-start gap-3 mb-3 pl-1">
                  <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3
                      className="font-bold text-foreground text-sm leading-snug line-clamp-2"
                      title={comp.company_name}
                    >
                      {comp.company_name}
                    </h3>
                    <p className="text-[11px] font-mono text-muted-foreground mt-0.5 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      CIN: {comp.cin}
                    </p>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2.5 my-3 text-xs text-muted-foreground border-y border-border/50 py-3">
                  {comp.company_industrial_classification && (
                    <div className="flex items-start gap-2">
                      <Briefcase className="w-3.5 h-3.5 shrink-0 text-primary mt-0.5" />
                      <span className="line-clamp-2 font-medium text-foreground">
                        {comp.company_industrial_classification}
                      </span>
                    </div>
                  )}
                  {comp.company_address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-rose-500 mt-0.5" />
                      <span className="line-clamp-2 leading-relaxed">{comp.company_address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action */}
              <Button
                variant="outline"
                className="w-full mt-2 rounded-xl text-xs font-semibold gap-2 hover:bg-primary hover:text-primary-foreground border-border hover:border-primary transition-colors"
                onClick={() => handleAddAsSupplier(comp)}
              >
                <Plus className="w-4 h-4" /> Add to Suppliers
              </Button>
            </div>
          ))
        ) : hasSearched ? (
          <div className="col-span-full py-16 text-center text-muted-foreground border-2 border-dashed border-border rounded-2xl bg-muted/20 px-4">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30 text-primary" />
            <h3 className="text-base font-bold text-foreground">No Businesses Found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              No registered companies matched your search term or PIN code. Try searching by industry keyword
              (e.g., &apos;Textile&apos;, &apos;Steel&apos;) or check for typographical errors.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setPinCode("");
                handleSearch("");
              }}
              className="mt-4 text-xs font-medium"
            >
              Reset Search Criteria
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
