import { useState } from "react";
import { KeyRound, LogOut } from "lucide-react";
import { toast } from "sonner";
import { actions, isStaffSession, money, monthKey, payrollRow, useStore, type Employee } from "@/crm/lib/store";
import { Avatar, Button, Field, inputCls } from "./primitives";

/** Change a 4-digit passcode after confirming the current one. */
export function ChangePasscode({ employee: e }: { employee: Employee }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const save = async () => {
    if (isStaffSession()) {
      if (!/^\d{4}$/.test(next)) { toast.error("New passcode must be 4 digits"); return; }
      if (next !== confirm) { toast.error("Passcodes do not match"); return; }
      try {
        const { changeStaffPin } = await import("@/crm/lib/staff-auth.functions");
        await changeStaffPin({ data: { current, next } });
        setCurrent(""); setNext(""); setConfirm("");
        toast.success("Passcode updated");
      } catch (err) { toast.error(err instanceof Error ? err.message : "Could not update passcode"); }
      return;
    }
    if (current !== e.pin) { toast.error("Current passcode is incorrect"); return; }
    if (!/^\d{4}$/.test(next)) { toast.error("New passcode must be 4 digits"); return; }
    if (next !== confirm) { toast.error("Passcodes do not match"); return; }
    if (next === e.pin) { toast.error("Choose a different passcode"); return; }
    actions.updateEmployee(e.id, { pin: next });
    setCurrent(""); setNext(""); setConfirm("");
    toast.success("Passcode updated");
  };
  const pin = (v: string) => v.replace(/\D/g, "").slice(0, 4);
  return (
    <section className="glass p-3 space-y-2" aria-label="Change passcode">
      <h3 className="text-sm font-semibold flex items-center gap-2"><KeyRound className="size-4" />Change Passcode</h3>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Current"><input type="password" inputMode="numeric" aria-label="Current passcode" className={`${inputCls} text-xs`} value={current} onChange={(ev) => setCurrent(pin(ev.target.value))} /></Field>
        <Field label="New"><input type="password" inputMode="numeric" aria-label="New passcode" className={`${inputCls} text-xs`} value={next} onChange={(ev) => setNext(pin(ev.target.value))} /></Field>
        <Field label="Confirm"><input type="password" inputMode="numeric" aria-label="Confirm passcode" className={`${inputCls} text-xs`} value={confirm} onChange={(ev) => setConfirm(pin(ev.target.value))} /></Field>
      </div>
      <Button className="h-9 text-xs w-full" onClick={save} disabled={!current || !next || !confirm}>Update Passcode</Button>
    </section>
  );
}

export function LogoutButton({ onLogout }: { onLogout: () => void }) {
  return <Button variant="destructive" className="h-9 text-xs w-full" onClick={onLogout}><LogOut />Log Out</Button>;
}

export function AdminProfile({ onLogout }: { onLogout: () => void }) {
  const s = useStore((s) => s);
  const me = s.employees.find((e) => e.id === s.me) ?? s.employees[0];
  if (!me) return null;
  const month = monthKey();
  const total = s.employees.reduce((sum, e) => sum + payrollRow(e, s, month).net, 0);
  const openTasks = s.tasks.filter((t) => !t.done).length;
  const review = s.tasks.filter((t) => !t.done && t.review === "pending").length;
  const stats = [["Team Size", String(s.employees.length)], ["Open Tasks", String(openTasks)], ["Awaiting Review", String(review)], ["Month Payroll", money(total)]];
  return (
    <div className="space-y-4">
      <article className="glass p-3 flex gap-3 items-center">
        <Avatar e={me} />
        <div className="min-w-0"><h2 className="text-sm font-bold truncate">{me.name}</h2><p className="text-xs text-muted-foreground">{me.designation} · {me.role}</p><p className="text-xs">{me.mobile || "Phone not set"}</p></div>
      </article>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">{stats.map(([l, v]) => <div key={l} className="glass p-2.5 rounded-2xl"><p className="text-[10px] text-muted-foreground">{l}</p><p className="text-base font-bold">{v}</p></div>)}</div>
      <ChangePasscode employee={me} />
      <LogoutButton onLogout={onLogout} />
    </div>
  );
}
