import { useState } from "react";
import {
  X,
  FileSpreadsheet,
  Download,
  Printer,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  FileText,
  Search,
} from "lucide-react";
import { Party } from "@/types/parties";
import { exportPartiesToCSV, downloadCSV } from "@/utils/excelImportExport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PartyReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  parties: Party[];
  reportType?: "statement" | "receivables" | "payables" | "all";
}

export function PartyReportsModal({
  isOpen,
  onClose,
  parties,
  reportType = "all",
}: PartyReportsModalProps) {
  const [selectedReport, setSelectedReport] = useState<"all" | "receivables" | "payables" | "aging">(reportType);
  const [search, setSearch] = useState("");

  if (!isOpen) return null;

  const receivables = parties.filter((p) => p.balance > 0);
  const payables = parties.filter((p) => p.balance < 0);
  const totalReceivable = receivables.reduce((sum, p) => sum + p.balance, 0);
  const totalPayable = payables.reduce((sum, p) => sum + Math.abs(p.balance), 0);

  const displayedParties = parties.filter((p) => {
    if (selectedReport === "receivables" && p.balance <= 0) return false;
    if (selectedReport === "payables" && p.balance >= 0) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.phone && p.phone.includes(q)) ||
      (p.gstin && p.gstin.toLowerCase().includes(q))
    );
  });

  const handleExportCSV = () => {
    const csv = exportPartiesToCSV(displayedParties);
    downloadCSV(`CredSmart_${selectedReport}_report_${new Date().toISOString().slice(0, 10)}.csv`, csv);
    toast.success("Report downloaded as CSV!");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Party Reports & Statements</h2>
              <p className="text-xs text-muted-foreground">
                Outstanding balances, aging analysis, and party-wise ledger breakdowns
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Report Switcher Tabs */}
        <div className="flex items-center justify-between border-b border-border px-6 py-2 bg-muted/10 gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            {[
              { id: "all", label: "All Parties Ledger" },
              { id: "receivables", label: `Receivables (To Collect - ₹${totalReceivable.toLocaleString("en-IN")})` },
              { id: "payables", label: `Payables (To Pay - ₹${totalPayable.toLocaleString("en-IN")})` },
              { id: "aging", label: "Aging Analysis" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedReport(tab.id as any)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  selectedReport === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleExportCSV} className="gap-1.5 text-xs h-8">
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
            <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5 text-xs h-8">
              <Printer className="w-3.5 h-3.5" />
              Print
            </Button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="px-6 py-3 border-b border-border bg-card">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter report list..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-xs"
            />
          </div>
        </div>

        {/* Report Content Table */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Party Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Mobile / GSTIN</th>
                  <th className="px-4 py-3">Credit Limit</th>
                  <th className="px-4 py-3 text-right">Balance Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayedParties.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {p.name}
                      {p.category && (
                        <span className="block text-[10px] font-normal text-muted-foreground">
                          {p.category}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 capitalize">
                      <Badge variant="outline" className="text-[10px]">
                        {p.partyType}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {p.phone || "—"}
                      {p.gstin && <span className="block text-[10px]">{p.gstin}</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {p.creditLimit ? `₹ ${p.creditLimit.toLocaleString("en-IN")}` : "Unlimited"}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right font-mono font-bold text-sm",
                        p.balance > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : p.balance < 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-muted-foreground"
                      )}
                    >
                      {p.balance > 0
                        ? `+₹ ${p.balance.toLocaleString("en-IN")}`
                        : p.balance < 0
                        ? `-₹ ${Math.abs(p.balance).toLocaleString("en-IN")}`
                        : "₹ 0.00"}
                    </td>
                  </tr>
                ))}
                {displayedParties.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No parties match the selected report filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Summary */}
        <div className="px-6 py-3 border-t border-border bg-muted/40 flex items-center justify-between text-xs font-semibold">
          <span className="text-muted-foreground">Showing {displayedParties.length} parties</span>
          <div className="flex items-center gap-4">
            <span className="text-emerald-600 dark:text-emerald-400">
              Total To Collect: ₹ {totalReceivable.toLocaleString("en-IN")}
            </span>
            <span className="text-rose-600 dark:text-rose-400">
              Total To Pay: ₹ {totalPayable.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
