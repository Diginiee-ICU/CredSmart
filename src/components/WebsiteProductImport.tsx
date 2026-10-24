import { useState } from "react";
import { Globe, Loader2, Check, X, AlertTriangle, Package, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ScrapedProduct {
  name: string;
  brand: string;
  category: string;
  barcode: string;
  mrp: number;
  costPrice: number;
  imageUrl: string;
  selected: boolean;
}

interface WebsiteProductImportProps {
  onImport: (products: Omit<ScrapedProduct, "selected">[]) => void;
  compact?: boolean;
}

export function WebsiteProductImport({ onImport, compact = false }: WebsiteProductImportProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [products, setProducts] = useState<ScrapedProduct[]>([]);
  const [scraped, setScraped] = useState(false);

  const handleScrape = async () => {
    let targetUrl = url.trim();
    if (!targetUrl) return;

    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = `https://${targetUrl}`;
    }

    setLoading(true);
    setError("");
    setProducts([]);
    setScraped(false);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("scrape-products", {
        body: { url: targetUrl },
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "Failed to scrape products");

      const scraped: ScrapedProduct[] = (data.products || []).map((p: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        name: p.name || "Untitled Product",
        brand: p.brand || "",
        category: p.category || "",
        barcode: p.barcode || "",
        mrp: Number(p.mrp) || 0,
        costPrice: Number(p.costPrice) || 0,
        imageUrl: p.imageUrl || "",
        selected: true,
      }));

      if (scraped.length === 0) {
        setError("No products found on this page. Try a different URL with product listings.");
      } else {
        setProducts(scraped);
        setScraped(true);
      }
    } catch (err: unknown) {
      setError(err.message || "Failed to scrape website");
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (idx: number) => {
    setProducts((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, selected: !p.selected } : p))
    );
  };

  const toggleAll = () => {
    const allSelected = products.every((p) => p.selected);
    setProducts((prev) => prev.map((p) => ({ ...p, selected: !allSelected })));
  };

  const handleImport = () => {
    const selected = products
      .filter((p) => p.selected)
      .map(({ selected, ...rest }) => rest);
    if (selected.length > 0) {
      onImport(selected);
    }
  };

  const selectedCount = products.filter((p) => p.selected).length;

  return (
    <div className={cn("space-y-3", compact ? "" : "p-4 rounded-xl border border-border bg-muted/30")}>
      {!compact && (
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-4 h-4 text-primary" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Import Products from Website
          </p>
        </div>
      )}

      {!scraped ? (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/products"
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                onKeyDown={(e) => e.key === "Enter" && handleScrape()}
              />
            </div>
            <button
              onClick={handleScrape}
              disabled={loading || !url.trim()}
              className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scraping...
                </>
              ) : (
                "Fetch Products"
              )}
            </button>
          </div>

          {loading && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">
                Scanning website for products... This may take a moment.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {!compact && (
            <p className="text-[11px] text-muted-foreground">
              Paste a URL of a product listing page (e.g., an online catalog or store page). We'll extract product names, prices, and categories automatically.
            </p>
          )}
        </>
      ) : (
        <>
          {/* Product selection */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">
              Found {products.length} products · {selectedCount} selected
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleAll}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                {products.every((p) => p.selected) ? "Deselect All" : "Select All"}
              </button>
              <button
                onClick={() => { setScraped(false); setProducts([]); }}
                className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                ← Change URL
              </button>
            </div>
          </div>

          <div className="max-h-60 overflow-auto rounded-lg border border-border divide-y divide-border">
            {products.map((p, idx) => (
              <button
                key={idx}
                onClick={() => toggleProduct(idx)}
                className={cn(
                  "w-full flex items-center gap-3 p-2.5 text-left transition-colors",
                  p.selected ? "bg-primary/5" : "bg-background hover:bg-muted/50"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors",
                    p.selected
                      ? "bg-primary border-primary"
                      : "border-border"
                  )}
                >
                  {p.selected && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-9 h-9 rounded-lg object-cover shrink-0 bg-muted"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {p.brand && `${p.brand} · `}{p.category && `${p.category} · `}₹{p.mrp || "N/A"}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={handleImport}
            disabled={selectedCount === 0}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Package className="w-4 h-4" />
            Import {selectedCount} Products
          </button>
        </>
      )}
    </div>
  );
}
