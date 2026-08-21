import { useState, useMemo } from "react";
import {
  FileSpreadsheet,
  Star,
  Crown,
  Search,
  Download,
  Share2,
  Calendar,
  Filter,
  FileText,
  TrendingUp,
  Landmark,
  Receipt,
  Scale,
  Percent,
  CheckCircle2,
  X,
  Send,
  Eye,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

interface ReportItem {
  id: string;
  name: string;
  category: "Favourite" | "GST" | "Transaction" | "Party" | "Item" | "Summary";
  isFavourite?: boolean;
  isPro?: boolean;
  description: string;
  tags: string[];
}

const ALL_REPORTS: ReportItem[] = [
  // Favourite
  { id: "balance-sheet", name: "Balance Sheet", category: "Favourite", isFavourite: true, isPro: true, description: "Statement of financial position showing assets, liabilities, and equity", tags: ["Summary", "Accounting"] },
  { id: "gstr-1", name: "GSTR-1 (Sales)", category: "Favourite", isFavourite: true, isPro: true, description: "Monthly/quarterly statement of outward supplies / sales for GST filing", tags: ["GST", "Sales"] },
  { id: "p-and-l", name: "Profit And Loss Report", category: "Favourite", isFavourite: true, isPro: true, description: "Detailed income statement with gross margin and net profit", tags: ["Summary", "Accounting"] },
  { id: "sales-summary", name: "Sales Summary", category: "Favourite", isFavourite: true, isPro: true, description: "Aggregated overview of total sales, invoices, and collected tax", tags: ["Sales", "Summary"] },

  // GST
  { id: "gstr-2", name: "GSTR-2 (Purchase)", category: "GST", isPro: true, description: "Statement of inward supplies and input tax credit (ITC)", tags: ["GST", "Purchases"] },
  { id: "gstr-3b", name: "GSTR-3b", category: "GST", isPro: true, description: "Monthly self-declaration summary return for GST payment", tags: ["GST", "Summary"] },
  { id: "gst-purchase-hsn", name: "GST Purchase (With HSN)", category: "GST", isPro: true, description: "Purchase records classified by 4/6/8-digit HSN codes", tags: ["GST", "Purchases"] },
  { id: "gst-sales-hsn", name: "GST Sales (With HSN)", category: "GST", isPro: true, description: "Sales records classified by HSN/SAC codes for return validation", tags: ["GST", "Sales"] },
  { id: "hsn-wise-sales-summary", name: "HSN Wise Sales Summary", category: "GST", isPro: true, description: "Consolidated volume and tax rate summary per HSN code", tags: ["GST", "Item"] },
  { id: "tds-payable", name: "TDS Payable", category: "GST", isPro: true, description: "Tax deducted at source liabilities to be deposited", tags: ["GST", "Accounting"] },
  { id: "tds-receivable", name: "TDS Receivable", category: "GST", isPro: true, description: "Tax deducted by clients and customers awaiting credit", tags: ["GST", "Accounting"] },
  { id: "tcs-payable", name: "TCS Payable", category: "GST", isPro: true, description: "Tax collected at source on high value transactions", tags: ["GST", "Accounting"] },
  { id: "tcs-receivable", name: "TCS Receivable", category: "GST", isPro: true, description: "Tax collected at source by suppliers", tags: ["GST", "Accounting"] },

  // Transaction
  { id: "bill-wise-profit", name: "Bill Wise Profit", category: "Transaction", isPro: true, description: "Gross and net profitability calculated for each individual invoice", tags: ["Transaction", "Sales"] },
  { id: "cash-bank-report", name: "Cash and Bank Report (All Payments)", category: "Transaction", isPro: true, description: "Consolidated cashbook and bank account ledger statement", tags: ["Transaction", "Payment Collection"] },
  { id: "daybook", name: "Daybook", category: "Transaction", isPro: true, description: "Chronological ledger of all daily financial and billing events", tags: ["Transaction", "Summary"] },
  { id: "expense-category-report", name: "Expense Category Report", category: "Transaction", isPro: true, description: "Breakdown of operating costs by business expense head", tags: ["Transaction", "Category"] },
  { id: "expense-txn-report", name: "Expense Transaction Report", category: "Transaction", isPro: true, description: "Itemized receipts and payments for business expenses", tags: ["Transaction", "Category"] },
  { id: "purchase-summary", name: "Purchase Summary", category: "Transaction", isPro: true, description: "Consolidated purchase volume, supplier totals, and taxes paid", tags: ["Transaction", "Purchases"] },
  { id: "stock-summary", name: "Stock & Inventory Valuation Report", category: "Transaction", isPro: false, description: "Current inventory valuation using FIFO/weighted average", tags: ["Item", "Summary"] },
  { id: "party-ledger-statement", name: "Party Statement & Aging Analysis", category: "Transaction", isPro: false, description: "Comprehensive receivables aging and ledger per party", tags: ["Party", "Payment Collection"] },
];

const FILTER_TABS = ["All", "Party", "Category", "Payment Collection", "Item", "Invoice Details", "Summary"] as const;

export default function Reports() {
  const { org } = useOrganization();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("All");
  const [showCaModal, setShowCaModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [showSeeMoreTxn, setShowSeeMoreTxn] = useState(false);

  // CA Sharing form state
  const [caEmail, setCaEmail] = useState("");
  const [caDateRange, setCaDateRange] = useState("current_fy");
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const filteredReports = useMemo(() => {
    let reports = ALL_REPORTS;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      reports = reports.filter((r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.tags.some((t) => t.toLowerCase().includes(q)));
    }
    if (activeTab !== "All") {
      reports = reports.filter((r) => r.tags.includes(activeTab) || r.category === activeTab);
    }
    return reports;
  }, [searchQuery, activeTab]);

  const favouriteReports = filteredReports.filter((r) => r.category === "Favourite");
  const gstReports = filteredReports.filter((r) => r.category === "GST");
  const txnReports = filteredReports.filter((r) => r.category === "Transaction");

  const handleShareWithCa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caEmail) {
      toast.error("Please enter your CA's email address");
      return;
    }
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setShowCaModal(false);
      toast.success(`CA Audit Package successfully sent to ${caEmail}!`);
      setCaEmail("");
    }, 1200);
  };

  const handleDownloadReport = (report: ReportItem) => {
    toast.success(`Downloading ${report.name} (Excel & PDF)...`);
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports</h1>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
              GST Compliant
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Access 20+ GST, Accounting, Sales & Profitability reports ready for filing and audit.
          </p>
        </div>

        {/* CA Reports Sharing CTA */}
        <Button
          onClick={() => setShowCaModal(true)}
          className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-sm gap-2 font-medium px-4 py-2"
        >
          <div className="w-5 h-5 rounded bg-white/20 flex items-center justify-center text-xs font-bold font-mono">
            CA
          </div>
          <span>CA Reports Sharing</span>
        </Button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 mr-1.5">Filter By:</span>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === tab
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search Box with Ctrl+F badge */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Find Report"
            className="pl-9 pr-14 h-9 text-xs bg-slate-50 focus:bg-white border-slate-200"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-semibold text-slate-400 bg-slate-200/80 px-1.5 py-0.5 rounded border border-slate-300/50">
            Ctrl + F
          </span>
        </div>
      </div>

      {/* Categorized 3-Column Report Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1: Favourite */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-slate-50/90 border-b border-slate-200 font-semibold text-sm text-slate-800">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Favourite</span>
          </div>
          <div className="divide-y divide-slate-100 flex-1">
            {favouriteReports.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No favourite reports matched</div>
            ) : (
              favouriteReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className="flex items-center justify-between px-4 py-3 hover:bg-indigo-50/50 transition-colors cursor-pointer group"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                        {report.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{report.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Col 2: GST */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-slate-50/90 border-b border-slate-200 font-semibold text-sm text-slate-800">
            <Percent className="w-4 h-4 text-emerald-600" />
            <span>GST</span>
          </div>
          <div className="divide-y divide-slate-100 flex-1">
            {gstReports.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No GST reports matched</div>
            ) : (
              gstReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className="flex items-center justify-between px-4 py-3 hover:bg-emerald-50/50 transition-colors cursor-pointer group"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors">
                        {report.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{report.description}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Col 3: Transaction */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-slate-50/90 border-b border-slate-200 font-semibold text-sm text-slate-800">
            <Receipt className="w-4 h-4 text-blue-600" />
            <span>Transaction</span>
          </div>
          <div className="divide-y divide-slate-100 flex-1">
            {txnReports.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No transaction reports matched</div>
            ) : (
              (showSeeMoreTxn ? txnReports : txnReports.slice(0, 6)).map((report) => (
                <div
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className="flex items-center justify-between px-4 py-3 hover:bg-blue-50/50 transition-colors cursor-pointer group"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">
                        {report.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{report.description}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {report.isPro && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                  </div>
                </div>
              ))
            )}
          </div>
          {txnReports.length > 6 && (
            <div className="p-2.5 bg-slate-50/80 border-t border-slate-100 text-center">
              <button
                onClick={() => setShowSeeMoreTxn(!showSeeMoreTxn)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                {showSeeMoreTxn ? "See less ^" : `See ${txnReports.length - 6} more v`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CA Sharing Dialog */}
      <Dialog open={showCaModal} onOpenChange={setShowCaModal}>
        <DialogContent className="sm:max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                CA
              </div>
              <span>Chartered Accountant Reports Sharing</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Directly bundle all required financial ledgers, GSTR JSONs, P&L, Balance Sheet, and Purchase/Sales summaries for your accountant.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleShareWithCa} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">CA / Auditor Email Address *</label>
              <Input
                type="email"
                required
                value={caEmail}
                onChange={(e) => setCaEmail(e.target.value)}
                placeholder="ca.auditor@firm.com"
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Financial Period</label>
                <select
                  value={caDateRange}
                  onChange={(e) => setCaDateRange(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800"
                >
                  <option value="current_fy">Current FY 2026-27</option>
                  <option value="last_quarter">Last Quarter (Q1)</option>
                  <option value="current_month">Current Month</option>
                  <option value="last_month">Last Month</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Package Format</label>
                <select className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800">
                  <option value="all">Excel + PDF + JSON Zip</option>
                  <option value="excel">Excel Workbooks (.xlsx)</option>
                  <option value="pdf">Auditor Signed PDF (.pdf)</option>
                </select>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100 text-xs text-indigo-900 space-y-1">
              <p className="font-semibold">Package Includes:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-indigo-700">
                <li>GSTR-1, GSTR-2 & GSTR-3B summary sheets</li>
                <li>Trial Balance, Balance Sheet & Profit & Loss</li>
                <li>Party aging ledger and payment reconciliation</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setShowCaModal(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={isExporting} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5">
                {isExporting ? (
                  <span>Preparing & Sending...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send to CA</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Individual Report Preview / Download Modal */}
      {selectedReport && (
        <Dialog open={Boolean(selectedReport)} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="sm:max-w-2xl bg-white">
            <DialogHeader>
              <div className="flex items-center justify-between pr-6">
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <span>{selectedReport.name}</span>
                </DialogTitle>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Live Ready</Badge>
              </div>
              <DialogDescription className="text-xs text-slate-500">
                {selectedReport.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* Sample Data Table for Report */}
              <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50/50">
                <div className="p-3 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Report Summary ({org?.name || "CredSmart Store"})</span>
                  <span>Period: Current FY 2026</span>
                </div>
                <div className="p-4 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-600">Total Taxable Value</span>
                    <span className="font-semibold text-slate-900">₹ 1,42,850.00</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-600">Total CGST @ 9%</span>
                    <span className="font-semibold text-slate-900">₹ 12,856.50</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-600">Total SGST @ 9%</span>
                    <span className="font-semibold text-slate-900">₹ 12,856.50</span>
                  </div>
                  <div className="flex justify-between py-1.5 font-bold text-sm bg-indigo-50/70 px-2 rounded">
                    <span className="text-indigo-900">Net Invoice Total</span>
                    <span className="text-indigo-900">₹ 1,68,563.00</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadReport(selectedReport)}
                  className="text-xs gap-1.5 border-slate-300"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Excel (.xlsx)</span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadReport(selectedReport)}
                    className="text-xs gap-1.5 border-slate-300"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedReport(null);
                      setShowCaModal(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share to CA</span>
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
