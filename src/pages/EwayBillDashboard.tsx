import React, { useState, useEffect, useMemo } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Truck,
  Plus,
  Search,
  Download,
  ExternalLink,
  Printer,
  Ban,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MoreVertical,
  Layers,
  FileCheck,
  RefreshCw,
  Eye,
  FileSpreadsheet,
} from "lucide-react";
import { EwayBillRecord, EwayBillStatus } from "@/types/ewayBill";
import { ewayBillService, buildGovernmentEwayJson } from "@/services/ewayBillService";
import { GenerateEwayBillModal } from "@/components/eway/GenerateEwayBillModal";
import { UpdatePartBModal } from "@/components/eway/UpdatePartBModal";
import { CancelEwayBillModal } from "@/components/eway/CancelEwayBillModal";
import { EwayBillPrintSlip } from "@/components/eway/EwayBillPrintSlip";
import { toast } from "sonner";

export default function EwayBillDashboard() {
  const { orgId, org } = useOrganization();

  const [records, setRecords] = useState<EwayBillRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | EwayBillStatus>("all");

  // Modal States
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isUpdatePartBOpen, setIsUpdatePartBOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isPrintSlipOpen, setIsPrintSlipOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<EwayBillRecord | null>(null);

  const loadEwayBills = () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const data = ewayBillService.getEwayBills(orgId);
      setRecords(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load E-Way Bills");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEwayBills();
  }, [orgId]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesStatus =
        statusFilter === "all" ? true : r.status === statusFilter;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        r.ewayBillNo.toLowerCase().includes(query) ||
        r.docNo.toLowerCase().includes(query) ||
        r.toTrdName.toLowerCase().includes(query) ||
        (r.vehicleNo && r.vehicleNo.toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [records, statusFilter, searchQuery]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = records.length;
    const active = records.filter((r) => r.status === "active").length;
    const partAOnly = records.filter((r) => r.status === "part_a_only").length;
    const expired = records.filter((r) => r.status === "expired").length;
    const cancelled = records.filter((r) => r.status === "cancelled").length;
    const totalValue = records.reduce((acc, r) => acc + (r.totInvValue || 0), 0);

    return { total, active, partAOnly, expired, cancelled, totalValue };
  }, [records]);

  // Bulk Government JSON Export
  const handleExportGovernmentJson = () => {
    if (records.length === 0) {
      toast.info("No E-Way Bills available to export");
      return;
    }

    const payload = buildGovernmentEwayJson(records);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ewaybill_bulk_upload_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(
      `Government JSON (version 1.0.0421) generated with ${payload.billLists.length} bills. Ready to upload to ewaybillgst.gov.in.`
    );
  };

  const handleExportSingleJson = (record: EwayBillRecord) => {
    const payload = buildGovernmentEwayJson([record]);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ewaybill_${record.ewayBillNo}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`E-Way Bill ${record.ewayBillNo} exported to official Government JSON format.`);
  };

  const formatDateTime = (isoStr?: string) => {
    if (!isoStr) return "-";
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-950 p-3 pb-6 sm:p-6 space-y-4 sm:space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                GST E-Way Bill Hub
              </h1>
              <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                Rule 138 Compliant
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed">
              Consignment transit slips, vehicle updates (Part-B), and Government NIC portal bulk exports.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportGovernmentJson}
            className="h-10 sm:h-9 gap-1.5 text-xs font-semibold text-indigo-600 border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20"
          >
            <Download className="w-4 h-4" />
            <span>NIC JSON (v1.0.0421)</span>
          </Button>

          <a
            href="https://ewaybillgst.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex"
          >
            <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-xs text-slate-600">
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Official Portal</span>
            </Button>
          </a>

          <Button
            size="sm"
            onClick={() => {
              setSelectedRecord(null);
              setIsGenerateOpen(true);
            }}
            className="h-10 sm:h-9 gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm col-span-2 sm:col-span-1 flex-1 sm:flex-initial"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Generate E-Way Bill</span>
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
        <div className="p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total E-Way Bills
          </span>
          <span className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1 block">
            {metrics.total}
          </span>
        </div>

        <div className="p-3 sm:p-4 rounded-xl border border-emerald-200 dark:border-emerald-950 bg-emerald-50/30 dark:bg-emerald-950/10 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
              Active In-Transit
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono mt-1 block">
            {metrics.active}
          </span>
        </div>

        <div className="p-3 sm:p-4 rounded-xl border border-blue-200 dark:border-blue-950 bg-blue-50/30 dark:bg-blue-950/10 shadow-2xs">
          <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider block">
            Part-A (Awaiting Vehicle)
          </span>
          <span className="text-xl font-black text-blue-700 dark:text-blue-300 font-mono mt-1 block">
            {metrics.partAOnly}
          </span>
        </div>

        <div className="p-3 sm:p-4 rounded-xl border border-amber-200 dark:border-amber-950 bg-amber-50/30 dark:bg-amber-950/10 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
            Expired
          </span>
          <span className="text-xl font-black text-amber-700 dark:text-amber-300 font-mono mt-1 block">
            {metrics.expired}
          </span>
        </div>

        <div className="p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Transit Value
          </span>
          <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-1 block">
            ₹{metrics.totalValue.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* Toolbar & Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: "all", label: "All Bills" },
              { id: "active", label: "Active" },
              { id: "part_a_only", label: "Part-A Only" },
              { id: "expired", label: "Expired" },
              { id: "cancelled", label: "Cancelled" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setStatusFilter(t.id)}
              className={`min-h-10 sm:min-h-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                statusFilter === t.id
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            placeholder="Search by EWB, doc no, customer, vehicle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-10 sm:h-8 text-xs bg-slate-50 dark:bg-slate-800/60"
          />
        </div>
      </div>

      {/* Table / List Container */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No E-Way Bills Found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? "No records matching your search query. Try clearing filters."
                : "You haven't generated any E-Way Bills yet. Generate one directly from here or automatically from your invoices over ₹50,000."}
            </p>
            <Button
              size="sm"
              onClick={() => {
                setSelectedRecord(null);
                setIsGenerateOpen(true);
              }}
              className="mt-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Generate First E-Way Bill
            </Button>
          </div>
        ) : (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 text-[11px]">
                <tr>
                  <th className="p-3">E-Way Bill No.</th>
                  <th className="p-3">Doc Details</th>
                  <th className="p-3">Party (Recipient)</th>
                  <th className="p-3">Route & Distance</th>
                  <th className="p-3">Vehicle (Part-B)</th>
                  <th className="p-3 text-right">Invoice Value</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3">Validity</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredRecords.map((r) => {
                  const isExp =
                    r.status === "expired" ||
                    (r.validUpto && new Date(r.validUpto).getTime() < Date.now());

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* EWB Number */}
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {r.ewayBillNo}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {formatDateTime(r.ewayBillDate)}
                          </span>
                        </div>
                      </td>

                      {/* Doc Details */}
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {r.docType}: {r.docNo}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {r.docDate}
                          </span>
                        </div>
                      </td>

                      {/* Party */}
                      <td className="p-3">
                        <div className="flex flex-col max-w-[160px]">
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {r.toTrdName}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {r.toGstin || "URP"}
                          </span>
                        </div>
                      </td>

                      {/* Route */}
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {r.fromPlace} ➔ {r.toPlace}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {r.transDistance} KM • {r.fromPincode} to {r.toPincode}
                          </span>
                        </div>
                      </td>

                      {/* Vehicle */}
                      <td className="p-3">
                        {r.vehicleNo ? (
                          <div className="flex flex-col">
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded w-max">
                              {r.vehicleNo}
                            </span>
                            {r.vehicleHistory && r.vehicleHistory.length > 0 && (
                              <span className="text-[10px] text-indigo-600 font-semibold mt-0.5">
                                Updated {r.vehicleHistory.length} time(s)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 italic">
                            Awaiting Vehicle
                          </span>
                        )}
                      </td>

                      {/* Value */}
                      <td className="p-3 text-right">
                        <span className="font-mono font-black text-slate-900 dark:text-white">
                          ₹{r.totInvValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        {r.status === "cancelled" ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
                            Cancelled
                          </span>
                        ) : isExp ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                            Expired
                          </span>
                        ) : r.status === "part_a_only" ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-300">
                            Part-A Only
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                            Active
                          </span>
                        )}
                      </td>

                      {/* Validity */}
                      <td className="p-3">
                        <div className="flex flex-col text-[10px]">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                            {formatDateTime(r.validUpto)}
                          </span>
                          <span className="text-slate-500">
                            {isExp ? "Expired" : "Valid in transit"}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRecord(r);
                              setIsPrintSlipOpen(true);
                            }}
                            className="h-8 w-8 p-0 text-slate-600 hover:text-indigo-600"
                            title="Print Form GST EWB-01"
                          >
                            <Printer className="w-4 h-4" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-500"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-xs">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedRecord(r);
                                  setIsPrintSlipOpen(true);
                                }}
                                className="gap-2 font-semibold"
                              >
                                <Printer className="w-3.5 h-3.5 text-indigo-600" />
                                <span>View & Print Slip</span>
                              </DropdownMenuItem>

                              {r.status !== "cancelled" && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedRecord(r);
                                    setIsUpdatePartBOpen(true);
                                  }}
                                  className="gap-2"
                                >
                                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Update Vehicle (Part-B)</span>
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem
                                onClick={() => handleExportSingleJson(r)}
                                className="gap-2"
                              >
                                <Download className="w-3.5 h-3.5 text-amber-600" />
                                <span>Export Government JSON</span>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              {r.status !== "cancelled" && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedRecord(r);
                                    setIsCancelOpen(true);
                                  }}
                                  className="gap-2 text-rose-600 font-semibold"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>Cancel E-Way Bill</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filteredRecords.map((r) => {
              const isExp =
                r.status === "expired" ||
                (r.validUpto && new Date(r.validUpto).getTime() < Date.now());
              const statusLabel = r.status === "cancelled" ? "Cancelled" : isExp ? "Expired" : r.status === "part_a_only" ? "Part-A Only" : "Active";
              const statusClass = r.status === "cancelled"
                ? "bg-rose-100 text-rose-700 border-rose-300"
                : isExp
                ? "bg-amber-100 text-amber-700 border-amber-300"
                : r.status === "part_a_only"
                ? "bg-blue-100 text-blue-700 border-blue-300"
                : "bg-emerald-100 text-emerald-700 border-emerald-300";

              return (
                <article key={r.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-black text-slate-900 dark:text-white truncate">{r.ewayBillNo}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{formatDateTime(r.ewayBillDate)}</p>
                    </div>
                    <span className={`shrink-0 px-2 py-1 rounded-full text-[10px] font-bold border ${statusClass}`}>{statusLabel}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                    <div className="min-w-0"><span className="block text-[10px] uppercase tracking-wide text-slate-500">Recipient</span><span className="block font-bold text-slate-800 dark:text-slate-200 truncate">{r.toTrdName}</span><span className="block text-[10px] text-slate-500 font-mono truncate">{r.toGstin || "URP"}</span></div>
                    <div className="text-right"><span className="block text-[10px] uppercase tracking-wide text-slate-500">Invoice Value</span><span className="block font-mono font-black text-slate-900 dark:text-white">₹{r.totInvValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                    <div className="min-w-0"><span className="block text-[10px] uppercase tracking-wide text-slate-500">Route</span><span className="block font-medium text-slate-700 dark:text-slate-300 truncate">{r.fromPlace} to {r.toPlace}</span><span className="block text-[10px] text-slate-500 font-mono">{r.transDistance} KM</span></div>
                    <div className="text-right"><span className="block text-[10px] uppercase tracking-wide text-slate-500">Vehicle</span><span className="block font-mono font-bold text-slate-800 dark:text-slate-200 truncate">{r.vehicleNo || "Awaiting Vehicle"}</span></div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[10px] text-slate-500">Valid until {formatDateTime(r.validUpto)}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" onClick={() => { setSelectedRecord(r); setIsPrintSlipOpen(true); }} className="h-10 px-3 gap-1.5 text-xs font-semibold"><Printer className="w-3.5 h-3.5" />View</Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-10 w-10 p-0" aria-label={`Actions for ${r.ewayBillNo}`}><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 text-xs">
                          {r.status !== "cancelled" && <DropdownMenuItem onClick={() => { setSelectedRecord(r); setIsUpdatePartBOpen(true); }} className="min-h-11 gap-2"><Truck className="w-3.5 h-3.5 text-blue-600" />Update Vehicle (Part-B)</DropdownMenuItem>}
                          <DropdownMenuItem onClick={() => handleExportSingleJson(r)} className="min-h-11 gap-2"><Download className="w-3.5 h-3.5 text-amber-600" />Export Government JSON</DropdownMenuItem>
                          {r.status !== "cancelled" && <DropdownMenuItem onClick={() => { setSelectedRecord(r); setIsCancelOpen(true); }} className="min-h-11 gap-2 text-rose-600"><Ban className="w-3.5 h-3.5" />Cancel E-Way Bill</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <GenerateEwayBillModal
        open={isGenerateOpen}
        onOpenChange={setIsGenerateOpen}
        onSuccess={(saved) => {
          loadEwayBills();
          setSelectedRecord(saved);
          setIsPrintSlipOpen(true);
        }}
      />

      <UpdatePartBModal
        open={isUpdatePartBOpen}
        onOpenChange={setIsUpdatePartBOpen}
        ewayBill={selectedRecord}
        onSuccess={() => loadEwayBills()}
      />

      <CancelEwayBillModal
        open={isCancelOpen}
        onOpenChange={setIsCancelOpen}
        ewayBill={selectedRecord}
        onSuccess={() => loadEwayBills()}
      />

      <EwayBillPrintSlip
        open={isPrintSlipOpen}
        onOpenChange={setIsPrintSlipOpen}
        ewayBill={selectedRecord}
      />
    </div>
  );
}
