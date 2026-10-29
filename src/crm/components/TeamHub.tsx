import { useState } from "react";
import { BellRing, MessageCircle, Pin, Plus, Video, X } from "lucide-react";
import { toast } from "sonner";
import { actions, operatorRole, teamStatus, useStore, waLink, type TeamStatus } from "@/crm/lib/store";
import { validMeetingLink } from "@/crm/lib/workforce-rules";
import { Button, Field, inputCls, Sheet } from "./primitives";
export const STATUS_COLORS: Record<TeamStatus, string> = { Present: "text-success", "On Break": "text-warning", Late: "text-late", Absent: "text-destructive" };
export function TeamPulse({ filter, onFilter }: { filter: TeamStatus | null; onFilter: (f: TeamStatus | null) => void }) {
  const s = useStore((s) => s);
  return <div className="space-y-2"><h2 className="text-xs font-semibold">Live Team Pulse</h2><div className="grid grid-cols-4 gap-2">
    {(["Present", "On Break", "Late", "Absent"] as TeamStatus[]).map((status) => <Button key={status} variant="ghost" aria-pressed={filter === status} className={`glass h-auto p-2 flex-col items-start gap-1 min-w-0 ${filter === status ? "ring-2 ring-ring" : ""}`} onClick={() => onFilter(filter === status ? null : status)}>
      <span className={`flex items-center gap-1 text-[10px] whitespace-nowrap ${STATUS_COLORS[status]}`}><span className={`size-1.5 rounded-full bg-current ${status === "Present" ? "animate-pulse" : ""}`} />{status}</span><span className="text-sm font-bold">{s.employees.filter((e) => teamStatus(e, s) === status).length}</span>
    </Button>)}
  </div></div>;
}
export function TeamHub() {
  const s = useStore((s) => s);
  const role = operatorRole(s);
  const [post, setPost] = useState(false);
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<"Urgent" | "Policy" | "General">("General");
  const [url, setUrl] = useState("");
  const share = (text: string) => window.open(waLink("", text), "_blank", "noopener");
  return <section className="border-t border-border pt-3 space-y-3">
    <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">Team Broadcasts & Huddles</h2>{role === "Admin" && <Button variant="secondary" className="h-8 text-[10px] px-2" onClick={() => setPost(true)}><Plus />New Broadcast</Button>}</div>
    <div className="grid gap-2 md:grid-cols-2">
      {[...s.broadcasts].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.at - a.at).map((b) => <article key={b.id} className="glass p-3 space-y-2 min-w-0">
        <div className="flex justify-between gap-2 items-center"><span className={`text-[10px] font-semibold ${b.priority === "Urgent" ? "text-destructive" : "text-primary"}`}>{b.priority ?? "General"}</span>{role === "Admin" ? <Button variant="ghost" size="icon" className={`size-6 ${b.pinned ? "text-primary" : ""}`} title="Pin broadcast" aria-label="Pin broadcast" onClick={() => actions.pinBroadcast(b.id)}><Pin className="size-3" /></Button> : b.pinned && <Pin className="size-3 text-primary" />}</div>
        <p className="text-xs whitespace-pre-wrap break-words">{b.text}</p><p className="text-[9px] text-muted-foreground">{b.author ?? "Admin"} · {new Date(b.at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
        {role === "Admin" && <Button variant="ghost" className="h-7 px-0 text-[10px] text-success" onClick={() => share(`${b.priority ?? "General"} — CredSmart\n${b.text}`)}><MessageCircle className="size-3" />Broadcast on WhatsApp</Button>}
      </article>)}
    </div>
    {["Admin", "Manager"].includes(role) && <div className="border-t border-border pt-3 space-y-2"><h3 className="text-xs font-semibold flex gap-2 items-center"><Video className="size-4 text-primary" />Start Team Huddle</h3>
      <input aria-label="Meeting room link" className={inputCls} placeholder="Google Meet / Zoom / Jitsi link" value={url} onChange={(e) => setUrl(e.target.value)} />
      <div className="flex gap-2 flex-wrap"><Button variant="secondary" className="h-8 text-xs" onClick={() => setUrl(`https://meet.jit.si/woodzire-${crypto.randomUUID()}`)}><Plus />Generate Room</Button><Button className="h-8 text-xs" onClick={() => { const safe = validMeetingLink(url); if (!safe) { toast.error("Enter a secure Google Meet, Zoom or Jitsi room link"); return; } actions.startHuddle(safe); toast.success("Huddle is live in this workspace"); }}><BellRing />Ring Team</Button>{s.huddle?.active && <Button variant="ghost" className="h-8 text-xs text-success" onClick={() => share(`Join our team huddle: ${s.huddle?.url}`)}><MessageCircle />Share</Button>}</div>
    </div>}
    {post && <Sheet title="New Broadcast" onClose={() => setPost(false)}><Field label="Priority"><select className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}><option>Urgent</option><option>Policy</option><option>General</option></select></Field><Field label="Announcement"><textarea className={`${inputCls} h-24 py-2`} value={text} onChange={(e) => setText(e.target.value)} /></Field><Button className="w-full text-xs" disabled={!text.trim()} onClick={() => { actions.broadcast(text.trim(), priority); setText(""); setPost(false); }}>Post Announcement</Button></Sheet>}
  </section>;
}
export function LiveHuddle() {
  const s = useStore((s) => s);
  if (!s.huddle?.active) return null;
  const safe = validMeetingLink(s.huddle.url);
  if (!safe) return null;
  return <div className="glass mb-3 p-2 flex items-center gap-2 border-success/30"><span className="size-2 rounded-full bg-success animate-pulse shrink-0" /><Button asChild variant="ghost" className="h-auto p-0 text-[11px] flex-1 justify-start whitespace-normal"><a href={safe} target="_blank" rel="noreferrer">Live Huddle in Progress — Tap to Join</a></Button>{["Admin", "Manager"].includes(operatorRole(s)) && <Button variant="ghost" size="icon" className="size-6" title="End huddle" aria-label="End huddle" onClick={() => actions.endHuddle()}><X /></Button>}</div>;
}