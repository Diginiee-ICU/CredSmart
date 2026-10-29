import { useState } from "react";
import { Check, MessageCircle, Pencil, Plus, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { actions, useStore, payrollRow, money, monthKey, today, waLink, operatorRole, payslipText, type Employee } from "@/crm/lib/store";
import { Avatar, Button, Field, inputCls, Sheet } from "./primitives";
import { CompanyRules } from "./CompanyRules";
export function Payroll({ employeeId }: { employeeId?: string | undefined }) {
  const s = useStore((s) => s);
  const [month, setMonth] = useState(monthKey());
  const [rules, setRules] = useState(false);
  const [edit, setEdit] = useState<{ e: Employee; mode: "salary" | "advance" | "ot" | "deduction" } | null>(null);
  const [amount, setAmount] = useState("");
  const [hours, setHours] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [pay, setPay] = useState<Employee | null>(null);
  const admin = operatorRole(s) === "Admin";
  const rows = s.employees.filter((e) => !employeeId || e.id === employeeId).map((e) => ({ e, row: payrollRow(e, s, month) }));
  const open = (e: Employee, mode: "salary" | "advance" | "ot" | "deduction") => {
    setEdit({ e, mode }); setAmount(mode === "salary" ? String(e.salary) : mode === "ot" ? String(e.otRate ?? s.policy.otRate) : ""); setHours(""); setNote(""); setDate(month === monthKey() ? today() : `${month}-01`);
  };
  const slip = (e: Employee) => {
    if (!e.mobile) { toast.error("Add the employee's phone in Staff & Roles"); return; }
    const row = payrollRow(e, s, month);
    const p = row.paid;
    const text = p?.breakdown ? payslipText(e, month, p.breakdown, p.paidAt) : p ? `CredSmart Salary Slip — ${month}\n${e.name}\nBase: ${money(p.base)}\nDeductions: ${money(p.deductions)}\nNet Paid: ${money(p.amount)}\nPaid: ${new Date(p.paidAt).toLocaleDateString()}` : payslipText(e, month, row.breakdown);
    window.open(waLink(e.mobile, text), "_blank", "noopener");
  };
  return <section className="space-y-3">
    <div className="flex items-center justify-between gap-2"><input aria-label="Payroll month" type="month" value={month} onChange={(e) => { if (e.target.value) setMonth(e.target.value); }} className={`${inputCls} max-w-40`} />{admin && <Button variant="secondary" className="h-9 px-2 text-xs" onClick={() => setRules(true)}><Settings2 />Company Rules</Button>}</div>
    {!s.policy.configured && <p className="text-[11px] text-warning">Set company rules to enable attendance-based pay. Until then, full monthly salary applies.</p>}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{[
      ["Total Net Payroll", money(rows.reduce((n, { row }) => n + (row.paid?.amount ?? row.net), 0))],
      ["Active Staff Profiles", rows.length],
      ["Staff Udhar", money(rows.reduce((n, { row }) => n + row.advance, 0))],
      ["Overtime Logged", `${rows.reduce((n, { row }) => n + row.overtimeHours, 0)}h / ${money(rows.reduce((n, { row }) => n + row.overtimePay, 0))}`],
    ].map(([label, value]) => <div key={label} className="glass p-2.5 min-w-0"><p className="text-[10px] text-muted-foreground">{label}</p><p className="text-sm font-bold mt-1 break-words">{value}</p></div>)}</div>
    {admin && s.requests.length > 0 && <section className="border-y border-border py-3 space-y-2"><h2 className="text-sm font-semibold">Staff Requests</h2><div className="grid gap-2 md:grid-cols-2">{s.requests.map((r) => <article key={r.id} className="glass p-2.5 space-y-2"><p className="text-xs font-semibold">{s.employees.find((e) => e.id === r.empId)?.name} · {r.kind}</p><p className="text-[11px]">{r.date} · {r.kind === "Advance" ? money(r.value) : `${r.value}${r.kind === "Overtime" ? " hours" : " days"}`} · {r.note}</p>{r.status === "pending" ? <div className="flex gap-2"><Button className="h-7 text-[10px]" onClick={() => { try { actions.reviewRequest(r.id, true); toast.success("Request approved"); } catch (err) { toast.error(err instanceof Error ? err.message : "Could not approve"); } }}><Check />Approve</Button><Button variant="secondary" className="h-7 text-[10px]" onClick={() => actions.reviewRequest(r.id, false)}>Decline</Button></div> : <p className="text-[10px] text-muted-foreground">{r.status}</p>}</article>)}</div></section>}
    <div className="grid gap-2.5 md:grid-cols-2">{rows.map(({ e, row }) => {
      const b = row.paid?.breakdown ?? row.breakdown;
      return <article key={e.id} className="glass p-3 space-y-2.5 min-w-0">
        <div className="flex justify-between items-center gap-2"><div className="flex gap-2 items-center min-w-0"><Avatar e={e} /><div className="min-w-0"><h3 className="text-sm font-semibold truncate">{e.name}</h3><p className="text-[10px] text-muted-foreground truncate">{e.role}</p></div></div>{row.paid && <span className="text-[10px] text-success flex gap-1 items-center"><Check className="size-3" />Paid</span>}</div>
        <div className="grid grid-cols-3 gap-x-2 gap-y-2">{[["Monthly Base", money(b.monthlyBase)], ["Paid / Work Days", `${b.paidDays} / ${b.workingDays}`], ["Prorated Base", money(b.proratedBase)], ["Present / Late / Absent", `${b.present} / ${b.late} / ${b.absent}`], ["Overtime", `${b.overtimeHours}h · ${money(b.overtimePay)}`], ["Udhar / Deductions", money(b.deductions)]].map(([label, value]) => <div key={label} className="min-w-0"><p className="text-[9px] text-muted-foreground leading-tight min-h-6">{label}</p><p className="text-[11px] font-semibold break-words">{value}</p></div>)}</div>
        <div className="flex justify-between items-center border-t border-border pt-2"><span className="text-xs">Net {row.paid ? "Paid" : "Payable"}</span><strong className="text-sm">{money(row.paid?.amount ?? b.net)}</strong>{admin && <Button variant="ghost" size="icon" className="size-6" title="Edit salary" aria-label={`Edit Salary for ${e.name}`} onClick={() => open(e, "salary")}><Pencil className="size-3" /></Button>}</div>
        {admin && <div className="grid grid-cols-2 gap-2"><Button variant="secondary" className="h-8 text-[10px] px-1" disabled={!!row.paid} onClick={() => open(e, "advance")}><Plus />Advance (Udhar)</Button><Button variant="secondary" className="h-8 text-[10px] px-1" disabled={!!row.paid} onClick={() => open(e, "ot")}><Plus />Overtime</Button></div>}
        <Button variant="secondary" className="h-8 w-full text-[11px] text-success" onClick={() => slip(e)}><MessageCircle />WhatsApp Payslip</Button>
        {admin && !row.paid && <div className="flex gap-2"><Button variant="ghost" className="h-7 text-[10px] px-1" onClick={() => open(e, "deduction")}><Plus />Deduction</Button><Button className="h-7 flex-1 text-[10px]" onClick={() => setPay(e)}>Record Paid</Button></div>}
        {[...s.adjustments.filter((a) => a.empId === e.id && a.month === month).map((a) => ({ id: a.id, text: `${a.date ?? a.month} · ${a.kind === "Advance" ? "Udhar" : a.kind} ${money(a.amount)} · ${a.note}` })), ...s.overtime.filter((o) => o.empId === e.id && o.date.startsWith(month)).map((o) => ({ id: o.id, text: `${o.date} · ${o.hours}h × ${money(o.rate)} · ${o.note}` }))].map((entry) => <p key={entry.id} className="text-[9px] text-muted-foreground break-words">{entry.text}</p>)}
      </article>;
    })}</div>
    {rules && <CompanyRules onClose={() => setRules(false)} />}
    {edit && <Sheet title={edit.mode === "salary" ? "Edit Salary" : edit.mode === "ot" ? "Log Overtime" : edit.mode === "advance" ? "Log Advance (Staff Udhar)" : "Log Deduction"} onClose={() => setEdit(null)}>
      <p className="text-sm font-semibold">{edit.e.name}</p>
      {edit.mode !== "salary" && <Field label="Date"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>}
      {edit.mode === "ot" && <Field label="Hours"><input type="number" min="0.25" max="24" step="0.25" className={inputCls} value={hours} onChange={(e) => setHours(e.target.value)} /></Field>}
      <Field label={edit.mode === "ot" ? "Hourly OT rate (₹)" : "Amount (₹)"}><input autoFocus type="number" min="0" step="0.01" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
      {edit.mode !== "salary" && <Field label="Note / Cash or UPI reference"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></Field>}
      <Button className="w-full text-xs" onClick={() => {
        const n = Number(amount);
        if (!amount || !Number.isFinite(n) || n < 0) { toast.error("Enter a valid amount"); return; }
        if (edit.mode !== "salary" && (!date || date.slice(0, 7) !== month)) { toast.error("Choose a date in the selected payroll month"); return; }
        try {
          if (edit.mode === "salary") actions.updateEmployee(edit.e.id, { salary: n });
          else if (edit.mode === "ot") actions.addOvertime({ empId: edit.e.id, date, hours: Number(hours), rate: n, note });
          else actions.addAdjustment({ empId: edit.e.id, month, date, amount: n, kind: edit.mode === "advance" ? "Advance" : "Deduction", note });
          setEdit(null); toast.success("Payroll updated");
        } catch (err) { toast.error(err instanceof Error ? err.message : "Could not save payroll"); }
      }}>Save</Button>
    </Sheet>}
    {pay && <Sheet title="Record Salary Payment" onClose={() => setPay(null)}><p className="text-sm">{pay.name} · {month}</p><p className="text-lg font-bold">{money(payrollRow(pay, s, month).net)}</p><p className="text-xs text-muted-foreground">Record a payment already made. No money is transferred by the app.</p><Button className="w-full text-xs" onClick={() => { const p = actions.pay(pay.id, month); if (p) toast.success("Payment recorded"); setPay(null); }}>Confirm Paid</Button></Sheet>}
  </section>;
}
