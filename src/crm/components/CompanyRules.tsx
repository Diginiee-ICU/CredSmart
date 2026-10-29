import { useState } from "react";
import { toast } from "sonner";
import { actions, useStore } from "@/crm/lib/store";
import { Button, Field, inputCls, Sheet } from "./primitives";
export function CompanyRules({ onClose }: { onClose: () => void }) {
  const saved = useStore((s) => s.policy);
  const [p, setP] = useState({ ...saved });
  return <Sheet title="Company Salary & Shift Rules" onClose={onClose}>
    <Field label="Salary calendar"><select className={inputCls} value={p.calendar} onChange={(e) => setP({ ...p, calendar: e.target.value as typeof p.calendar })}><option value="all">All calendar days</option><option value="sunday">Sunday off</option><option value="weekly">One weekly day off</option></select></Field>
    {p.calendar === "weekly" && <Field label="Weekly day off"><select className={inputCls} value={p.weeklyOff} onChange={(e) => setP({ ...p, weeklyOff: Number(e.target.value) })}>{["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d, i) => <option value={i} key={d}>{d}</option>)}</select></Field>}
    <Field label="Late arrival pay"><select className={inputCls} value={p.lateCredit} onChange={(e) => setP({ ...p, lateCredit: Number(e.target.value) })}><option value={0.5}>Half paid day (default)</option><option value={1}>Full paid day</option><option value={0}>Unpaid day</option></select></Field>
    <div className="grid grid-cols-2 gap-3"><Field label="Company shift start"><input type="time" required className={inputCls} value={p.shiftStart} onChange={(e) => setP({ ...p, shiftStart: e.target.value })} /></Field><Field label="Company overtime (₹/hr)"><input type="number" min="0" className={inputCls} value={p.otRate} onChange={(e) => setP({ ...p, otRate: Number(e.target.value) })} /></Field></div>
    <p className="text-[11px] text-muted-foreground">Off-days are excluded from the salary divisor and attendance credit. Changes apply to unpaid months; recorded payslips stay unchanged.</p>
    <Button className="w-full text-xs" onClick={() => { try { actions.savePolicy(p); toast.success("Company rules saved"); onClose(); } catch (err) { toast.error(err instanceof Error ? err.message : "Could not save rules"); } }}>Save Company Rules</Button>
  </Sheet>;
}