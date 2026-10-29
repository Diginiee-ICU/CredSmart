import { useState } from "react";
import { Coffee, Clock3, FileText, ListChecks, MoreHorizontal, Plus, Share2, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { money, monthKey, payrollRow, teamStatus, today, useStore, waLink, type Employee, type TeamStatus } from "@/crm/lib/store";
import { staffSignInMessage, staffSignInUrl } from "@/crm/lib/app-url";
import { Avatar, Button } from "./primitives";
import { TeamHub } from "./TeamHub";

export function MetallicCommand({ onAssign, onManage, onAdd, onEod }: {
  onAssign: (e: Employee) => void;
  onManage: (e: Employee) => void;
  onAdd: () => void;
  onEod: () => void;
}) {
  const s = useStore((s) => s);
  const [filter, setFilter] = useState<TeamStatus | null>(null);
  const present = s.attendance.filter((a) => a.date === today() && a.inAt && !a.outAt).length;
  const pending = s.employees.reduce((sum, employee) => {
    const row = payrollRow(employee, s, monthKey());
    return sum + (row.paid ? 0 : row.net);
  }, 0);
  const summaries = [
    { label: "Present", value: `${present}/${s.employees.length}`, icon: Users, finish: "metal-green" },
    { label: "Tasks", value: s.tasks.filter((t) => !t.done).length, icon: ListChecks, finish: "metal-blue" },
    { label: "Pending", value: money(pending), icon: Wallet, finish: "metal-silver" },
  ];
  return <section className="metal-command space-y-3">
    <div className="grid grid-cols-2 gap-3">
      <Button className="metal-blue h-11 rounded-xl text-xs" onClick={async () => {
        const url = staffSignInUrl(s.companyId);
        try { await navigator.clipboard.writeText(url); toast.success("Sign-in link copied"); }
        catch { toast.message(url); }
        window.open(waLink("", staffSignInMessage(s.companyId)), "_blank", "noopener");
      }}><Share2 className="size-4" />Join Link</Button>
      <Button className="metal-blue h-11 rounded-xl text-xs" onClick={onAdd}><Plus className="size-4" />Add Employee</Button>
    </div>
    <div className="command-summary-grid grid grid-cols-4 gap-2 p-3">
      {summaries.map(({ label, value, icon: Icon, finish }) => <div key={label} className={`${finish} command-summary min-w-0 rounded-xl p-2`}>
        <Icon className="size-4 mb-2" />
        <p className="text-sm font-bold break-words leading-tight tabular-nums">{value}</p>
        <p className="text-[9px] font-semibold mt-1">{label}</p>
      </div>)}
      <Button variant="ghost" className="metal-silver command-summary h-auto min-w-0 rounded-xl p-2 flex-col items-start justify-start gap-0 whitespace-normal" onClick={onEod}>
        <FileText className="size-4 mb-2" /><span className="text-sm font-bold">EOD ↗</span><span className="text-[9px] font-semibold mt-1">EOD Report</span>
      </Button>
    </div>
    <div aria-label="Live counters" className="command-live-grid grid grid-cols-4 p-3 text-center">
      {(["Present", "On Break", "Late", "Absent"] as const).map((status) => <Button key={status} variant="ghost" aria-pressed={filter === status} className={`live-counter h-auto min-w-0 flex-col gap-1.5 p-1 rounded-lg ${filter === status ? "bg-primary/10 ring-1 ring-ring" : ""}`} onClick={() => setFilter(filter === status ? null : status)}>
        {status === "Present" || status === "Absent" ? <span aria-hidden="true" className={`metal-status-orb ${status === "Present" ? "status-present" : "status-absent"}`} /> : status === "On Break" ? <Coffee className="metal-bronze-icon size-6" /> : <Clock3 className="metal-copper-icon size-6" />}
        <span className="text-sm font-bold tabular-nums">{s.employees.filter((e) => teamStatus(e, s) === status).length}</span>
        <span className="text-[9px] font-medium whitespace-normal">{status}</span>
      </Button>)}
    </div>
    <div className="space-y-2" aria-label="Company employees">
      {s.employees.filter((e) => !filter || teamStatus(e, s) === filter).map((employee) => <div key={employee.id} className="metal-frame flex items-center gap-2 h-14 px-3 min-w-0">
        <Button variant="ghost" className="flex-1 min-w-0 p-0 h-11 justify-start gap-2 hover:bg-transparent" aria-label={`Assign task to ${employee.name}`} onClick={() => onAssign(employee)}>
          <Avatar e={employee} />
          <span className="min-w-0 text-left"><span className="block text-sm font-semibold truncate">{employee.name}</span><span className="block text-[10px] text-muted-foreground truncate">{employee.designation || employee.role}</span></span>
        </Button>
        <span className="metal-blue command-role-pill rounded-full px-2 py-1 text-[9px] font-semibold truncate" title={employee.role}>{employee.role}</span>
        <Button variant="ghost" size="icon" className="metal-silver size-6 rounded-full shrink-0" aria-label={`Manage ${employee.name}`} title="Manage employee & permissions" onClick={() => onManage(employee)}><MoreHorizontal className="size-3.5" /></Button>
      </div>)}
      {!s.employees.filter((e) => !filter || teamStatus(e, s) === filter).length && <p className="text-xs text-muted-foreground py-4 text-center">No employees</p>}
    </div>
    <TeamHub />
  </section>;
}