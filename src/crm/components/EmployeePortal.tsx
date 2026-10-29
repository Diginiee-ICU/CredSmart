import { useEffect, useState } from "react";
import { Check, Download, Globe, Lock, MapPin, MessageCircle, Phone, Play, Upload, Video } from "lucide-react";
import { toast } from "sonner";
import { actions, fmtTime, haversine, money, monthKey, payslipText, payrollRow, teamStatus, today, untilPing, useStore, waLink, type Employee, type Task, type StaffRequest } from "@/crm/lib/store";
import { reminderActive, staffRecords, staffTasks } from "@/crm/lib/staff-portal";
import { validMeetingLink } from "@/crm/lib/workforce-rules";
import { Avatar, Button, Field, inputCls, Sheet } from "./primitives";

function useClock() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  return now;
}
export function EmployeeShift({ employee: e }: { employee: Employee }) {
  const s = useStore((s) => s);
  const now = useClock();
  const a = s.attendance.find((a) => a.empId === e.id && a.date === today());
  const live = !!a?.inAt && !a.outAt;
  const [busy, setBusy] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const elapsed = Math.max(0, ((a?.outAt ?? now) - (a?.inAt ?? now)) - (a?.breaks ?? []).reduce((n, b) => n + ((b.end ?? a?.outAt ?? now) - b.start), 0));
  const minutes = Math.floor(elapsed / 60000);
  const clock = (kind: "in" | "out") => {
    if (kind === "out") { actions.clock(e.id, "out", a?.distance, a?.verified); return; }
    if (!s.workplace) { toast.error("Ask your admin to set the workplace location"); return; }
    if (!navigator.geolocation) { toast.error("GPS is unavailable"); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition((p) => {
      setBusy(false);
      const d = haversine({ lat: p.coords.latitude, lng: p.coords.longitude }, s.workplace ?? { lat: 0, lng: 0 });
      setDistance(d);
      const ok = d <= (s.workplace?.radius ?? 0);
      if (!ok && !e.permissions.outside) { toast.error("Outside the GPS geofence. Clock-in not allowed."); return; }
      actions.clock(e.id, "in", d, ok); toast.success("Clocked in");
    }, () => { setBusy(false); toast.error("Location unavailable. Allow GPS and try again."); }, { enableHighAccuracy: true, timeout: 15000 });
  };
  return <article className="glass p-3 space-y-3">
    <div className="flex gap-3 items-center"><Avatar e={e} live={live} /><div className="min-w-0 flex-1"><h2 className="text-sm font-bold truncate">{e.name}</h2><p className="text-[10px] text-muted-foreground">{e.role} · {teamStatus(e, s)}</p></div><span className="text-sm font-bold tabular-nums">{Math.floor(minutes / 60)}h {minutes % 60}m</span></div>
    <div className="grid grid-cols-3 gap-2"><Button className="h-8 px-1 text-[10px]" disabled={live || busy} onClick={() => clock("in")}><MapPin className="size-3" />{busy ? "Locating…" : "Clock In (GPS)"}</Button><Button variant="secondary" className="h-8 px-1 text-[10px]" disabled={!live} onClick={() => actions.setBreak(e.id, !a?.onBreak)}>{a?.onBreak ? "Back from Break" : "Take Break"}</Button><Button variant="destructive" className="h-8 px-1 text-[10px]" disabled={!live} onClick={() => clock("out")}>Clock Out</Button></div>
    <p className="text-[10px] text-muted-foreground">Shift {e.shiftStart || s.policy.shiftStart || "Not set"} · In {fmtTime(a?.inAt)} · Out {fmtTime(a?.outAt)}{distance !== null ? ` · ${distance}m away` : ""}</p>
  </article>;
}
export function EmployeeNotices() {
  const s = useStore((s) => s);
  const safe = s.huddle?.active ? validMeetingLink(s.huddle.url) : null;
  return <div className="space-y-2">
    {safe && <div className="glass p-2 flex justify-between items-center"><span className="text-xs font-semibold text-success">Team huddle is live</span><Button asChild className="h-8 text-xs"><a href={safe} target="_blank" rel="noreferrer"><Video />Join Huddle</a></Button></div>}
    {s.broadcasts.map((b) => <article key={b.id} className="glass p-2.5 space-y-1"><p className={`text-[10px] font-semibold ${b.priority === "Urgent" ? "text-destructive" : "text-primary"}`}>{b.priority ?? "General"}</p><p className="text-xs whitespace-pre-wrap break-words">{b.text}</p><p className="text-[9px] text-muted-foreground">{b.author ?? "Admin"} · {new Date(b.at).toLocaleString()}</p></article>)}
  </div>;
}
function PersonalTask({ task: t, readonly = false }: { task: Task; readonly?: boolean }) {
  const now = useClock();
  const [editing, setEditing] = useState(false);
  const [proof, setProof] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  return <article className="glass p-3 space-y-2">
    <div className="flex gap-2 items-start"><h3 className="text-sm font-semibold break-words flex-1">{t.title}</h3>{t.isPublic ? <Globe className="size-3.5 text-muted-foreground shrink-0" /> : <Lock className="size-3.5 text-muted-foreground shrink-0" />}</div>
    <p className={`text-[10px] ${t.done ? "text-success" : "text-muted-foreground"}`}>{t.done ? "Approved & Done" : t.review === "pending" ? "Awaiting admin sign-off · reminders paused" : `${t.inProgress ? "In Progress · " : ""}Next ping in ${untilPing(t, now)}`}</p>
    {t.review === "rejected" && <p className="text-[10px] text-destructive">Proof returned — please update and resubmit.</p>}
    {t.proof && !readonly && <p className="text-xs break-words">{t.proof}</p>}
    {!readonly && !t.done && t.review !== "pending" && (editing ? <form className="space-y-2" onSubmit={(ev) => { ev.preventDefault(); actions.submitProof(t.id, proof, images); setEditing(false); toast.success("Proof sent for admin sign-off"); }}>
      <Field label="Completion notes / checklist"><textarea required className={`${inputCls} h-20 py-2`} value={proof} onChange={(ev) => setProof(ev.target.value)} /></Field>
      <Field label="Proof photos (up to 3)"><input type="file" accept="image/*" multiple className="text-xs w-full" onChange={async (ev) => {
        const files = [...(ev.target.files ?? [])];
        if (files.length > 3 || files.some((f) => f.size > 5_000_000 || !f.type.startsWith("image/"))) { toast.error("Choose up to 3 images, each under 5 MB"); return; }
        setLoading(true);
        try { const data = await Promise.all(files.map(async (file) => { const bitmap = await createImageBitmap(file); const canvas = document.createElement("canvas"); const scale = Math.min(1, 800 / Math.max(bitmap.width, bitmap.height)); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale); const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Image unavailable"); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close(); return canvas.toDataURL("image/jpeg", 0.65); })); setImages(data); } catch { toast.error("Could not read these photos"); } finally { setLoading(false); }
      }} /></Field>
      <div className="flex gap-2">{images.map((src, i) => <img key={i} src={src} alt={`Proof ${i + 1}`} className="size-14 object-cover rounded-lg" />)}</div>
      <Button type="submit" className="h-8 w-full text-xs" disabled={loading || !proof.trim()}><Upload />{loading ? "Preparing photos…" : "Submit Proof"}</Button>
    </form> : <div className="flex gap-2">{!t.inProgress && <Button variant="secondary" className="h-8 px-2 text-[10px]" onClick={() => actions.startTask(t.id)}><Play />In Progress</Button>}<Button className="h-8 flex-1 px-2 text-[10px]" onClick={() => setEditing(true)}><Check />Submit Proof & Complete</Button></div>)}
  </article>;
}
export function EmployeeTasks({ employee: e, home = false, onAssign }: { employee: Employee; home?: boolean; onAssign: () => void }) {
  const tasks = useStore((s) => s.tasks);
  const [board, setBoard] = useState<"mine" | "team">("mine");
  const visible = staffTasks(tasks, e.id, home ? "mine" : board, e.permissions.publicTasks).filter((t) => !home || reminderActive(t));
  return <section className="space-y-2">
    {home ? <h2 className="text-sm font-semibold">My Urgent Tasks <span className="text-muted-foreground text-xs">({visible.length})</span></h2> : <><div className="grid grid-cols-2 gap-1 bg-muted p-1 rounded-xl"><Button variant={board === "mine" ? "default" : "ghost"} className="h-8 text-xs" onClick={() => setBoard("mine")}>My Tasks</Button><Button disabled={!e.permissions.publicTasks} variant={board === "team" ? "default" : "ghost"} className="h-8 text-xs" onClick={() => setBoard("team")}>Team Public Board</Button></div>{e.permissions.assign && <Button variant="secondary" className="h-8 text-xs" onClick={onAssign}>Assign Task to Others</Button>}</>}
    <div className="grid gap-2 md:grid-cols-2">{visible.map((t) => <PersonalTask key={t.id} task={t} readonly={t.assigneeId !== e.id} />)}</div>
    {!visible.length && <p className="text-xs text-muted-foreground py-3">No tasks here</p>}
  </section>;
}
export function EmployeeTeam({ employee: e, directory = false }: { employee: Employee; directory?: boolean }) {
  const s = useStore((s) => s);
  return <section className="space-y-2"><h2 className="text-sm font-semibold">{directory ? "Colleague Contacts" : "Live Team Status"}</h2><div className="grid grid-cols-2 md:grid-cols-3 gap-2">
    {s.employees.filter((other) => other.id !== e.id && (directory || ["Present", "Late", "On Break"].includes(teamStatus(other, s)))).map((other) => <article key={other.id} className="glass p-2.5 space-y-2 min-w-0"><div className="flex gap-2 items-center"><Avatar e={other} live={teamStatus(other, s) !== "Absent"} /><div className="min-w-0"><p className="text-xs font-semibold truncate">{other.name}</p><p className="text-[9px] text-muted-foreground truncate">{directory ? other.designation : teamStatus(other, s)}</p></div></div>{directory && <div className="flex gap-2"><Button asChild variant="secondary" size="icon" className="size-7" disabled={!other.mobile}><a href={`tel:${other.mobile.replace(/[^+\d]/g, "")}`} aria-label={`Call ${other.name}`}><Phone className="size-3" /></a></Button><Button asChild variant="secondary" size="icon" className="size-7"><a href={waLink(other.mobile, "")} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${other.name}`}><MessageCircle className="size-3 text-success" /></a></Button></div>}</article>)}
  </div></section>;
}
export function EmployeeProfile({ employee: e }: { employee: Employee }) {
  const s = useStore((s) => s);
  const a = s.attendance.find((a) => a.empId === e.id && a.date === today());
  return <div className="space-y-4"><article className="glass p-3 space-y-3"><div className="flex gap-3 items-center"><Avatar e={e} /><div><h2 className="text-sm font-bold">{e.name}</h2><p className="text-xs text-muted-foreground">{e.designation} · {e.role}</p></div></div><p className="text-xs">{e.mobile || "Phone not set"}</p><p className="text-xs">Shift: {e.shiftStart || s.policy.shiftStart || "Not set"}</p><p className="text-xs text-muted-foreground">GPS: {a?.verified ? "Verified today" : s.workplace ? `${s.workplace.radius}m geofence · not verified today` : "Workplace not configured"}{e.permissions.outside ? " · Outside attendance allowed" : ""}</p></article><EmployeeTeam employee={e} directory /></div>;
}
export function EmployeePay({ employee: e }: { employee: Employee }) {
  const s = useStore((s) => s);
  const row = payrollRow(e, s, monthKey());
  const own = staffRecords(s, e.id);
  const [kind, setKind] = useState<StaffRequest["kind"] | null>(null);
  const [value, setValue] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const request = (k: StaffRequest["kind"]) => { setKind(k); setValue(""); setNote(""); setDate(today()); };
  return <section className="space-y-3">
    <div className="border-b border-border pb-3"><p className="text-xs text-muted-foreground">My Earned Salary This Month · {monthKey()}</p><p className="text-xl font-bold text-primary mt-1">{money(row.net)}</p>{!s.policy.configured && <p className="text-[10px] text-warning">Provisional full base — attendance rules not configured.</p>}</div>
    <div className="grid grid-cols-2 gap-2">{[["Base Monthly Salary", money(e.salary)], ["Days Present / Late", `${row.present} / ${row.late}`], ["My Overtime Earned", `+${money(row.overtimePay)}`], ["My Staff Udhar", `−${money(row.advance)}`]].map(([label, v]) => <article key={label} className="glass p-2.5"><p className="text-[10px] text-muted-foreground">{label}</p><p className="text-sm font-bold mt-1">{v}</p></article>)}</div>
    <div className="flex flex-wrap gap-2"><Button className="h-8 text-xs" onClick={() => request("Advance")}>Request Advance</Button><Button variant="secondary" className="h-8 text-xs" onClick={() => request("Overtime")}>Log Overtime Hours</Button><Button variant="secondary" className="h-8 text-xs" onClick={() => request("Leave")}>Request Leave</Button></div>
    <h2 className="text-sm font-semibold">My Passbook</h2>{own.adjustments.map((a) => <p key={a.id} className="text-xs">{a.date ?? a.month} · {a.kind} −{money(a.amount)} · {a.note}</p>)}{own.requests.map((r) => <p key={r.id} className="text-xs">{r.date} · {r.kind} {r.kind === "Advance" ? money(r.value) : `${r.value}${r.kind === "Overtime" ? "h" : " days"}`} · <span className={r.status === "approved" ? "text-success" : "text-muted-foreground"}>{r.status}</span></p>)}
    <h2 className="text-sm font-semibold">My Payslips</h2>{!own.payments.length && <p className="text-xs text-muted-foreground">No recorded payslips yet</p>}{own.payments.map((p) => { const text = p.breakdown ? payslipText(e, p.month, p.breakdown, p.paidAt) : `CredSmart Payslip — ${p.month}\n${e.name}\nPaid: ${money(p.amount)}\nBase: ${money(p.base)}\nDeductions: ${money(p.deductions)}`; return <article key={p.id} className="glass p-2.5 flex gap-2 items-center"><div className="flex-1 text-xs">{p.month}<strong className="block">{money(p.amount)} paid</strong></div><Button variant="secondary" size="icon" className="size-8" aria-label={`Download payslip ${p.month}`} onClick={() => { const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" })); const a = document.createElement("a"); a.href = url; a.download = `CredSmart-payslip-${p.month}.txt`; a.click(); URL.revokeObjectURL(url); }}><Download /></Button><Button asChild variant="secondary" size="icon" className="size-8"><a href={waLink(e.mobile, text)} target="_blank" rel="noreferrer" aria-label={`Share payslip ${p.month}`}><MessageCircle /></a></Button></article>; })}
    {kind && <Sheet title={kind === "Advance" ? "Ask for Advance (Udhar)" : kind === "Overtime" ? "Request Overtime Approval" : "Request Leave"} onClose={() => setKind(null)}><form className="space-y-3" onSubmit={(ev) => { ev.preventDefault(); try { actions.request({ empId: e.id, kind, value: Number(value), date, note }); setKind(null); toast.success("Request sent for admin approval"); } catch (err) { toast.error(err instanceof Error ? err.message : "Could not send request"); } }}><Field label="Date"><input required type="date" className={inputCls} value={date} onChange={(ev) => setDate(ev.target.value)} /></Field><Field label={kind === "Advance" ? "Amount (₹)" : kind === "Overtime" ? "Hours" : "Number of days"}><input required type="number" min={kind === "Leave" ? 1 : 0.25} max={kind === "Overtime" ? 24 : undefined} step={kind === "Leave" ? 1 : 0.25} value={value} onChange={(ev) => setValue(ev.target.value)} className={inputCls} /></Field><Field label="Reason / work notes"><textarea required className={`${inputCls} h-20 py-2`} value={note} onChange={(ev) => setNote(ev.target.value)} /></Field><Button type="submit" className="w-full h-9 text-xs">Send Request</Button></form></Sheet>}
  </section>;
}