import { useState, useEffect, useCallback, useMemo } from "react";
import { usePagination } from "@/hooks/usePagination";
import { PaginationBar } from "@/components/ui/PaginationBar";
import {
  Search,
  ChevronDown,
  ChevronUp,
  CalendarIcon,
  Receipt,
  CreditCard,
  Banknote,
  QrCode,
  User,
  Download,
  IndianRupee,
  Activity,
  Layers,
  Printer,
  FileText,
  Wallet,
  SplitSquareHorizontal,
  Share2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { cn, exportToCSV } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ReceiptModal, ReceiptData } from "@/components/ReceiptModal";
import { shareInvoicePdfToWhatsApp, downloadInvoicePdf } from "@/utils/whatsappPdfShare";
import { downloadExactInvoicePdf } from "@/utils/downloadExactInvoice";
import { toast } from "@/hooks/use-toast";

interface SaleItem {
  id: string;
  product_name: string;
  product_id?: string | null;
  batch_id?: string | null;
  quantity: number;
  mrp: number;
  line_total: number;
  batch_number: string | null;
}

interface Sale {
  id: string;
  invoice_number: string;
  subtotal: number;
  discount_amount: number;
  discount_label: string | null;
  tax: number;
  total: number;
  payment_method: string;
  created_at: string;
  customer_id: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  items?: SaleItem[];
}

const paymentIcons: Record<string, React.ReactNode> = {
  Cash: <Banknote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
  Card: <CreditCard className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />,
  UPI: <QrCode className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />,
  Credit: <Wallet className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
  Split: <SplitSquareHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />,
  Estimate: <FileText className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />,
};

export default function SalesHistory() {
  const { org, orgId, loading: orgLoading } = useOrganization();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [itemsCache, setItemsCache] = useState<Record<string, SaleItem[]>>({});
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [reprintData, setReprintData] = useState<ReceiptData | null>(null);

  const fetchSales = useCallback(async () => {
    if (!orgId) {
      setSales([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let query = supabase
        .from("sales")
        .select("id, invoice_number, subtotal, discount_amount, discount_label, tax, total, payment_method, created_at, customer_id, customers(name, phone)")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (dateFrom) {
        const start = new Date(dateFrom);
        start.setHours(0, 0, 0, 0);
        query = query.gte("created_at", start.toISOString());
      }
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query = query.lte("created_at", end.toISOString());
      }

      const { data, error } = await query;
      if (error) {
        console.error("fetchSales error:", error);
        toast({ title: "Failed to load sales", description: error.message, variant: "destructive" });
        setSales([]);
        return;
      }
      if (data) {
        setSales(
          data.map((s: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => ({
            ...s,
            customer_name: s.customers?.name || null,
            customer_phone: s.customers?.phone || null,
          }))
        );
      } else {
        setSales([]);
      }
    } catch (err: unknown) {
      console.error("fetchSales unexpected error:", err);
      setSales([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, dateFrom, dateTo]);

  useEffect(() => {
    if (orgLoading) return;
    fetchSales();
  }, [fetchSales, orgLoading]);

  const toggleExpand = async (saleId: string) => {
    if (expandedId === saleId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(saleId);
    if (!itemsCache[saleId]) {
      try {
        const { data, error } = await supabase
          .from("sale_items")
          .select("id, product_name, product_id, batch_id, quantity, mrp, line_total, batch_number")
          .eq("sale_id", saleId);
        if (error) {
          console.error("fetch sale_items error:", error);
        } else if (data) {
          setItemsCache((prev) => ({ ...prev, [saleId]: data }));
        }
      } catch (err) {
        console.error("toggleExpand unexpected error:", err);
      }
    }
  };

  const handleReprintReceipt = async (sale: Sale) => {
    let items = itemsCache[sale.id];
    if (!items) {
      const { data } = await supabase
        .from("sale_items")
        .select("id, product_name, product_id, batch_id, quantity, mrp, line_total, batch_number")
        .eq("sale_id", sale.id);
      items = data || [];
      if (data) setItemsCache((prev) => ({ ...prev, [sale.id]: data }));
    }

    const mappedItems = items.map((it) => ({
      product: {
        id: it.product_id || it.id,
        name: it.product_name,
        barcode: "",
        brand: "",
        category: "",
        batches: [],
      },
      batch: {
        id: it.batch_id || it.id,
        costPrice: 0,
        mrp: it.mrp,
        stock: 0,
        batchNumber: it.batch_number || "General",
      },
      quantity: it.quantity,
    }));

    setReprintData({
      invoiceNumber: sale.invoice_number,
      items: mappedItems,
      subtotal: sale.subtotal,
      discountAmount: sale.discount_amount,
      discountLabel: sale.discount_label || "",
      tax: sale.tax,
      total: sale.total,
      customerName: sale.customer_name,
      customerPhone: sale.customer_phone,
      paymentMethod: sale.payment_method,
      storeName: org?.name || "CredSmart Retail Store",
      storeAddress: org?.address || "",
      storePhone: org?.phone || "",
      storeEmail: org?.email || "",
      storeLogoUrl: org?.logo_url || "",
      gstin: org?.gstin || "",
      pan: org?.pan || "",
      bankName: org?.bank_name || "",
      accountNumber: org?.account_number || "",
      ifsc: org?.ifsc || "",
      accountHolder: org?.account_holder || org?.name || "",
      branch: org?.branch || "",
      upiId: org?.upi_id || "",
      date: new Date(sale.created_at),
      isEstimate: sale.payment_method === "Estimate",
    });
  };

  const filtered = useMemo(() => {
    return sales.filter((s) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        s.invoice_number.toLowerCase().includes(q) ||
        (s.customer_name && s.customer_name.toLowerCase().includes(q)) ||
        (s.payment_method && s.payment_method.toLowerCase().includes(q))
      );
    });
  }, [sales, search]);

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    paginatedItems,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    hasNext,
    hasPrev,
  } = usePagination(filtered, 25);

  const totalRevenue = filtered.reduce((s, sale) => s + (sale.payment_method !== "Estimate" ? sale.total : 0), 0);
  const regularSalesCount = filtered.filter((s) => s.payment_method !== "Estimate").length;

  const handleExportCA = () => {
    if (filtered.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    const rows = [
      [
        "Invoice Number",
        "Date",
        "Customer Name",
        "Customer Phone",
        "Payment Mode",
        "Subtotal (₹)",
        "Discount (₹)",
        "CGST (₹)",
        "SGST (₹)",
        "Total Tax (₹)",
        "Grand Total (₹)",
        "Type",
      ],
      ...filtered.map((sale) => {
        const cgst = (sale.tax || 0) / 2;
        const sgst = (sale.tax || 0) / 2;
        return [
          sale.invoice_number,
          format(new Date(sale.created_at), "yyyy-MM-dd HH:mm:ss"),
          sale.customer_name || "Walk-in Customer",
          sale.customer_phone || "",
          sale.payment_method,
          sale.subtotal?.toFixed(2) || "0.00",
          sale.discount_amount?.toFixed(2) || "0.00",
          cgst.toFixed(2),
          sgst.toFixed(2),
          sale.tax?.toFixed(2) || "0.00",
          sale.total.toFixed(2),
          sale.payment_method === "Estimate" ? "Estimate" : "Tax Invoice",
        ];
      }),
    ];
    exportToCSV(`GSTR-Sales-Ledger-${format(new Date(), "yyyy-MM-dd")}.csv`, rows);
    toast({ title: "Sales report exported successfully" });
  };

  if (orgLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-wrapper space-y-6">
      
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Receipt className="w-6 h-6 text-primary" />
            Sales Ledger & Invoices
          </h1>
          <p className="page-subtitle">
            Browse transaction records, line-item itemization, tax audit breakdowns & reprints.
          </p>
        </div>
        <Button
          onClick={handleExportCA}
          variant="outline"
          className="shrink-0 bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-500/20 shadow-xs"
        >
          <Download className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
          Export for CA (CSV)
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="card-base p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Invoices
            </span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-bold text-foreground">{filtered.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{regularSalesCount} billed transactions</p>
          </div>
        </div>

        <div className="card-base p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-bold text-foreground">
              ₹{totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Filtered gross turnover</p>
          </div>
        </div>

        <div className="card-base p-4 sm:p-5 hidden lg:flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Avg. Order Value
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-bold text-foreground">
              ₹{regularSalesCount > 0 ? (totalRevenue / regularSalesCount).toFixed(2) : "0.00"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Per paid invoice</p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card-base p-3 sm:p-4 flex flex-col sm:flex-row sm:flex-wrap items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice number, customer, or payment method..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal h-10 rounded-xl flex-1 sm:flex-none sm:min-w-[140px] text-xs",
                  !dateFrom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="w-3.5 h-3.5 mr-2" />
                {dateFrom ? format(dateFrom, "dd MMM yyyy") : "From date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal h-10 rounded-xl flex-1 sm:flex-none sm:min-w-[140px] text-xs",
                  !dateTo && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="w-3.5 h-3.5 mr-2" />
                {dateTo ? format(dateTo, "dd MMM yyyy") : "To date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {(dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateFrom(undefined);
                setDateTo(undefined);
              }}
              className="h-10 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear Dates
            </Button>
          )}
        </div>
      </div>

      {/* Sales Transactions List Container */}
      <div className="card-base p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            <Receipt className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="font-semibold text-foreground">No sales transactions found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {sales.length === 0
                ? "Generate sales from the POS checkout screen to see records here."
                : "Try adjusting your search query or date range filters."}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-border/70">
              {paginatedItems.map((sale) => (
                <div key={sale.id} className="transition-colors">
                  <button
                    type="button"
                    onClick={() => toggleExpand(sale.id)}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 px-4 sm:px-6 py-4 hover:bg-muted/40 transition-colors text-left",
                      expandedId === sale.id && "bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Receipt className="w-4 h-4" />
                      </div>
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold font-mono text-foreground">
                            {sale.invoice_number}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(sale.created_at), "dd MMM yyyy, hh:mm a")}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="badge badge-neutral text-[11px] py-0.5">
                            {paymentIcons[sale.payment_method] || null}
                            <span>{sale.payment_method}</span>
                          </span>

                          {sale.customer_name ? (
                            <span className="badge badge-info text-[11px] py-0.5">
                              <User className="w-3 h-3" />
                              <span>{sale.customer_name}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Walk-in Customer</span>
                          )}

                          {sale.discount_amount > 0 && (
                            <span className="badge badge-success text-[10px] py-0">
                              -₹{sale.discount_amount.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-base font-extrabold text-foreground">
                          ₹{sale.total.toFixed(2)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Tax: ₹{sale.tax.toFixed(2)}
                        </p>
                      </div>

                      <div className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground">
                        {expandedId === sale.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Detail Panel */}
                  {expandedId === sale.id && (
                    <div className="px-4 sm:px-6 py-4 bg-muted/15 border-t border-border/60 animate-fade-in space-y-4">
                      <div className="rounded-xl border border-border/80 overflow-hidden bg-card shadow-xs">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/60 border-b border-border/70 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                              <th className="text-left px-4 py-2.5">Product</th>
                              <th className="text-right px-4 py-2.5">Qty</th>
                              <th className="text-right px-4 py-2.5">MRP / Price</th>
                              <th className="text-right px-4 py-2.5">Line Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {(itemsCache[sale.id] || []).map((item) => (
                              <tr key={item.id} className="hover:bg-muted/20">
                                <td className="px-4 py-2.5 text-foreground font-medium text-xs sm:text-sm">
                                  <div>{item.product_name}</div>
                                  {item.batch_number && (
                                    <span className="text-[11px] text-muted-foreground font-mono">
                                      Batch: {item.batch_number}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-right text-muted-foreground text-xs sm:text-sm">
                                  {item.quantity}
                                </td>
                                <td className="px-4 py-2.5 text-right text-muted-foreground text-xs sm:text-sm">
                                  ₹{item.mrp.toFixed(2)}
                                </td>
                                <td className="px-4 py-2.5 text-right font-bold text-foreground text-xs sm:text-sm">
                                  ₹{item.line_total.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                            {!itemsCache[sale.id] && (
                              <tr>
                                <td colSpan={4} className="px-4 py-4 text-center text-muted-foreground text-xs">
                                  Loading item details...
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Financial Summary & Actions */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleReprintReceipt(sale)}
                            className="rounded-xl text-xs gap-1.5 h-9 font-semibold"
                          >
                            <Printer className="w-3.5 h-3.5 text-primary" />
                            <span>View / Re-print</span>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              downloadExactInvoicePdf({
                                invoiceNumber: sale.invoice_number,
                                customerName: sale.customer_name || undefined,
                                customerPhone: sale.customer_phone || undefined,
                                storeName: org?.name || "CredSmart Store",
                                storePhone: org?.phone,
                                totalAmount: sale.total,
                                subtotal: sale.subtotal,
                                discountAmount: sale.discount_amount,
                                tax: sale.tax,
                                date: sale.created_at,
                                items: (itemsCache[sale.id] || []).map((it) => ({
                                  name: it.product_name,
                                  quantity: it.quantity,
                                  rate: it.mrp,
                                  total: it.line_total,
                                })),
                              });
                            }}
                            className="rounded-xl text-xs gap-1.5 h-9 font-semibold border-amber-400/40 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/30"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download PDF</span>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              shareInvoicePdfToWhatsApp({
                                invoiceNumber: sale.invoice_number,
                                customerName: sale.customer_name || undefined,
                                customerPhone: sale.customer_phone || undefined,
                                storeName: org?.name || "CredSmart Store",
                                storePhone: org?.phone,
                                totalAmount: sale.total,
                                date: sale.created_at,
                                items: (itemsCache[sale.id] || []).map((it) => ({
                                  name: it.product_name,
                                  quantity: it.quantity,
                                  rate: it.mrp,
                                  total: it.line_total,
                                })),
                              });
                            }}
                            className="rounded-xl text-xs gap-1.5 h-9 font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </Button>
                        </div>

                        <div className="flex flex-col items-end gap-1 text-xs sm:text-sm w-full sm:w-auto">
                          <div className="flex justify-between w-64 text-muted-foreground">
                            <span>Subtotal:</span>
                            <span className="font-medium text-foreground">₹{sale.subtotal.toFixed(2)}</span>
                          </div>
                          {sale.discount_amount > 0 && (
                            <div className="flex justify-between w-64 text-emerald-600 dark:text-emerald-400">
                              <span>Discount {sale.discount_label ? `(${sale.discount_label})` : ""}:</span>
                              <span className="font-medium">-₹{sale.discount_amount.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between w-64 text-muted-foreground">
                            <span>GST / Tax:</span>
                            <span className="font-medium text-foreground">₹{sale.tax.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between w-64 border-t border-border/80 pt-1.5 text-sm sm:text-base font-bold text-foreground">
                            <span>Grand Total:</span>
                            <span className="text-primary">₹{sale.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <PaginationBar
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              startIndex={startIndex}
              endIndex={endIndex}
              hasNext={hasNext}
              hasPrev={hasPrev}
              onPageChange={setPage}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>

      {/* Re-print Receipt Modal */}
      {reprintData && (
        <ReceiptModal
          data={reprintData}
          onClose={() => setReprintData(null)}
          onNewSale={() => setReprintData(null)}
        />
      )}
    </div>
  );
}



