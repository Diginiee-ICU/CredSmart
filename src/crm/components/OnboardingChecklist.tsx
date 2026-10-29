import { useEffect, useState } from "react";
import { CheckCircle2, Circle, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { staffSignInUrl } from "@/crm/lib/app-url";
import { useStore } from "@/crm/lib/store";
import { CompanyRules } from "./CompanyRules";

export function OnboardingChecklist({ onAdd, onAttendance }: { onAdd: () => void; onAttendance: () => void }) {
  const s = useStore((s) => s);
  const inviteKey = `credsmart-invited-${s.companyId}`;
  const hideKey = `credsmart-checklist-hidden-${s.companyId}`;
  const [invited, setInvited] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [rules, setRules] = useState(false);
  useEffect(() => { setInvited(!!localStorage.getItem(inviteKey)); setHidden(!!localStorage.getItem(hideKey)); }, [inviteKey, hideKey]);
  const invite = async () => {
    const url = staffSignInUrl(s.companyId);
    try { await navigator.clipboard.writeText(url); toast.success("Sign-in link copied — share it with your staff"); } catch { toast.message(url); }
    localStorage.setItem(inviteKey, "1"); setInvited(true);
  };
  const steps = [
    { label: "Add company details", done: !!s.company, action: undefined, cta: "" },
    { label: "Add your first employee", done: s.employees.length > 1, action: onAdd, cta: "Add" },
    { label: "Invite staff with the join link", done: invited, action: invite, cta: "Copy link" },
    { label: "Set workplace location", done: !!s.workplace, action: onAttendance, cta: "Set" },
    { label: "Configure shifts, calendar & overtime", done: s.policy.configured, action: () => setRules(true), cta: "Configure" },
  ];
  const doneCount = steps.filter((x) => x.done).length;
  if (hidden || doneCount === steps.length) return null;
  return <div className="metal-frame rounded-2xl p-3 space-y-2">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-bold">Get your company ready</p>
        <p className="text-[11px] text-muted-foreground">{doneCount} of {steps.length} steps done</p>
      </div>
      <button aria-label="Hide checklist" className="p-1 text-muted-foreground" onClick={() => { localStorage.setItem(hideKey, "1"); setHidden(true); }}><X className="size-4" /></button>
    </div>
    <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full metal-green" style={{ width: `${(doneCount / steps.length) * 100}%` }} /></div>
    <ul className="space-y-1">
      {steps.map((st) => <li key={st.label} className="flex items-center gap-2 h-9">
        {st.done ? <CheckCircle2 className="size-4 text-primary shrink-0" /> : <Circle className="size-4 text-muted-foreground shrink-0" />}
        <span className={`text-xs flex-1 ${st.done ? "line-through text-muted-foreground" : ""}`}>{st.label}</span>
        {!st.done && st.action && <Button size="sm" variant="outline" className="h-7 text-[11px] rounded-lg" onClick={st.action}>{st.cta}</Button>}
      </li>)}
    </ul>
    {rules && <CompanyRules onClose={() => setRules(false)} />}
  </div>;
}
