import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/crm/integrations/supabase/client";
import { actions, useStore } from "@/crm/lib/store";
const logoFull = { url: "/logo.png" };
import { Button, Field, inputCls, Sheet } from "./primitives";
import { Users } from "lucide-react";

/** Email/password sign-up & sign-in. */
export function AuthSheet({ onClose, onStaff }: { onClose: () => void; onStaff?: () => void }) {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setBusy(true);
    const { data, error } = mode === "signup"
      ? await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (!data.session) { toast.error("Account created but not signed in. Please sign in."); setMode("signin"); return; }
    toast.success(mode === "signup" ? "Account created — let's set up your company" : "Signed in");
    onClose();
  };
  return (
    <Sheet title={mode === "signup" ? "Create Your Company Account" : "Sign In"} onClose={onClose}>
      <img src={logoFull.url} alt="CredSmart CRM by CredAlert" className="mx-auto w-48 max-w-full" data-no-i18n />
      <div className="glass p-1 rounded-full grid grid-cols-2 gap-1">
        <Button type="button" className="h-8 text-xs rounded-full" variant={mode === "signup" ? "default" : "ghost"} onClick={() => setMode("signup")}>Sign Up</Button>
        <Button type="button" className="h-8 text-xs rounded-full" variant={mode === "signin" ? "default" : "ghost"} onClick={() => setMode("signin")}>Sign In</Button>
      </div>
      <form className="space-y-2" onSubmit={submit}>
        <Field label="Email"><input type="email" required autoComplete="email" className={`${inputCls} text-xs`} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password"><input type="password" required minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} className={`${inputCls} text-xs`} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <Button type="submit" className="w-full h-9 text-xs rounded-xl" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create Account" : "Sign In"}</Button>
      </form>
      {onStaff && <Button type="button" variant="secondary" className="w-full h-9 text-xs rounded-xl" onClick={onStaff}><Users /> Staff Sign In</Button>}
    </Sheet>
  );
}

const SIZES = ["1–10", "11–50", "51–200", "200+"];
/** Shown once after sign-in until the company profile is created. */
export function CompanyOnboarding() {
  const s = useStore((s) => s);
  const me = s.employees.find((e) => e.id === s.me);
  const [f, setF] = useState({ name: "", industry: "", size: SIZES[0] ?? "1–10", city: "", ownerName: me?.name === "You (Admin)" ? "" : (me?.name ?? ""), ownerPhone: me?.mobile ?? "", shiftStart: s.policy.shiftStart || "10:00" });
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-xl overflow-y-auto p-4 flex items-start sm:items-center justify-center">
      <form className="glass w-full max-w-md p-4 space-y-3 rounded-3xl" aria-label="Company onboarding" onSubmit={(ev) => { ev.preventDefault(); try { actions.setupCompany(f); toast.success("Company workspace ready"); } catch (err) { toast.error(err instanceof Error ? err.message : "Could not save"); } }}>
        <img src={logoFull.url} alt="CredSmart CRM by CredAlert" className="mx-auto w-44 max-w-full" data-no-i18n />
        <div><p className="text-[10px] uppercase font-semibold text-muted-foreground">Step 1 of 1</p><h2 className="text-lg font-bold">Set up your company</h2><p className="text-xs text-muted-foreground">You'll be the admin. You can add staff right after.</p></div>
        <Field label="Company name"><input required className={`${inputCls} text-xs`} value={f.name} onChange={up("name")} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Industry"><input className={`${inputCls} text-xs`} placeholder="Retail, Furniture…" value={f.industry} onChange={up("industry")} /></Field>
          <Field label="Team size"><select className={`${inputCls} text-xs`} value={f.size} onChange={up("size")}>{SIZES.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="City"><input className={`${inputCls} text-xs`} value={f.city} onChange={up("city")} /></Field>
          <Field label="Shift starts"><input type="time" required className={`${inputCls} text-xs`} value={f.shiftStart} onChange={up("shiftStart")} /></Field>
          <Field label="Your name"><input required className={`${inputCls} text-xs`} value={f.ownerName} onChange={up("ownerName")} /></Field>
          <Field label="Your phone"><input type="tel" className={`${inputCls} text-xs`} value={f.ownerPhone} onChange={up("ownerPhone")} /></Field>
        </div>
        <div className="flex gap-2"><Button type="submit" className="flex-1 h-9 text-xs rounded-xl">Create Company Workspace</Button><Button type="button" variant="ghost" className="h-9 text-xs" onClick={() => void supabase.auth.signOut()}>Log Out</Button></div>
      </form>
    </div>
  );
}

export const STAFF_COMPANY_KEY = "wf-staff-company";
/** Full-screen employee sign-in: company code + mobile + 4-digit passcode, verified on the server. */
export function StaffSignIn({ initialCompany, onOwner }: { initialCompany: string; onOwner: () => void }) {
  const [company, setCompany] = useState(initialCompany);
  const [mobile, setMobile] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setBusy(true);
    try {
      const { staffSignIn } = await import("@/crm/lib/staff-auth.functions");
      const { tokenHash } = await staffSignIn({ data: { companyId: company.trim(), mobile, pin } });
      if (tokenHash.startsWith("staff_") || tokenHash.startsWith("local_")) {
        localStorage.setItem(STAFF_COMPANY_KEY, company.trim());
        toast.success("Signed in");
        return;
      }
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
      if (error) throw error;
      localStorage.setItem(STAFF_COMPANY_KEY, company.trim());
      toast.success("Signed in");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 bg-background grid place-items-center p-4">
      <form onSubmit={submit} className="glass w-full max-w-sm p-4 space-y-3" aria-label="Staff sign in">
        <div>
          <img src={logoFull.url} alt="CredSmart CRM by CredAlert" className="w-44 max-w-full mb-2" data-no-i18n />
          <h1 className="text-xl font-bold">Staff Sign In</h1>
          <p className="text-xs text-muted-foreground">Use the mobile number and passcode your admin shared.</p>
        </div>
        {!initialCompany && <Field label="Company Code"><input required className={`${inputCls} text-xs`} value={company} onChange={(e) => setCompany(e.target.value)} /></Field>}
        <Field label="Mobile Number"><input required type="tel" inputMode="numeric" autoComplete="tel" className={`${inputCls} text-xs`} value={mobile} onChange={(e) => setMobile(e.target.value)} /></Field>
        <Field label="Passcode"><input required type="password" inputMode="numeric" aria-label="Passcode" className={`${inputCls} text-xs`} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} /></Field>
        <Button type="submit" className="w-full h-9 text-xs rounded-xl" disabled={busy || pin.length !== 4}>{busy ? "Signing in…" : "Sign In"}</Button>
        <Button type="button" variant="ghost" className="w-full h-8 text-[11px]" onClick={onOwner}>I'm the company owner</Button>
      </form>
    </div>
  );
}
