import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { Bold, Italic, List, ListChecks, Minus, Pin, Plus, StickyNote, Trash2 } from "lucide-react";
import { actions, PALETTE, useStore } from "@/crm/lib/store";
import { Button, inputCls } from "./primitives";

export function QuickNotes({ onConvert, ownerId }: { onConvert: (text: string) => void; ownerId?: string | undefined }) {
  const allNotes = useStore((s) => s.notes);
  const notes = allNotes.filter((n) => ownerId ? n.ownerId === ownerId : !n.ownerId);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const editor = useRef<HTMLDivElement>(null);
  const note = notes.find((n) => n.id === selected) ?? notes[0];
  useEffect(() => {
    if (editor.current) editor.current.innerHTML = DOMPurify.sanitize(note?.html ?? "", { ALLOWED_TAGS: ["b", "strong", "i", "em", "ul", "ol", "li", "div", "p", "br"], ALLOWED_ATTR: [] });
  }, [note?.id, open]);
  const save = () => {
    if (note && editor.current) actions.updateNote(note.id, { html: editor.current.innerHTML, text: editor.current.innerText });
  };
  const format = (command: string) => {
    editor.current?.focus();
    document.execCommand(command, false);
    save();
  };
  return <div className="quick-notes-anchor">
    {!open ? <Button variant="secondary" className="metal-silver h-9 rounded-full text-xs px-3 gap-2" onClick={() => { setOpen(true); if (!notes.length) setSelected(actions.addNote(ownerId)); }}><StickyNote className="size-4" />Note<span className="bg-primary/10 text-primary rounded-full min-w-5 px-1 text-[10px]">{notes.length}</span></Button> :
      <section aria-label="Quick Notepad" className="quick-notes-window rounded-2xl overflow-hidden">
        <header className="flex items-center justify-between px-3 py-2 border-b border-border">
          <h2 className="text-sm font-semibold flex gap-2 items-center"><StickyNote className="size-4 text-primary" />Quick Notepad</h2>
          <div className="flex gap-1"><Button variant="ghost" size="icon" className="size-7" aria-label="New note" title="New note" onClick={() => setSelected(actions.addNote(ownerId))}><Plus /></Button><Button variant="ghost" size="icon" className="size-7" aria-label="Minimise notes" title="Minimise" onClick={() => setOpen(false)}><Minus /></Button></div>
        </header>
        <div className="flex gap-1 overflow-x-auto px-2 py-2 border-b border-border">
          {[...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned)).map((n, i) => <Button key={n.id} variant={note?.id === n.id ? "secondary" : "ghost"} className="h-7 px-2 text-[11px] shrink-0 max-w-32" onClick={() => setSelected(n.id)}><span className="staff-dot size-2 rounded-full shrink-0" style={{ "--employee-color": n.color } as React.CSSProperties} />{n.pinned && <Pin className="size-3" />}<span className="truncate">{n.title || `Note ${i + 1}`}</span></Button>)}
        </div>
        {note && <div className="p-3 space-y-2">
          <input aria-label="Note title" placeholder="Untitled note" value={note.title} onChange={(e) => actions.updateNote(note.id, { title: e.target.value })} className={`${inputCls} text-xs`} />
          <div className="flex items-center gap-1">
            {[{ icon: Bold, command: "bold", label: "Bold" }, { icon: Italic, command: "italic", label: "Italic" }, { icon: List, command: "insertUnorderedList", label: "Checklist" }].map(({ icon: I, command, label }) => <Button key={command} variant="ghost" className="size-7" size="icon" title={label} aria-label={label} onMouseDown={(e) => e.preventDefault()} onClick={() => format(command)}><I className="size-3.5" /></Button>)}
            <Button variant="ghost" size="icon" className={`size-7 ${note.pinned ? "text-primary" : ""}`} title="Pin note" aria-label="Pin note" aria-pressed={note.pinned} onClick={() => actions.updateNote(note.id, { pinned: !note.pinned })}><Pin /></Button>
            <span className="ml-auto text-[9px] text-muted-foreground">Saved</span>
            <Button variant="ghost" size="icon" className="size-7 text-destructive" title="Delete note" aria-label="Delete note" onClick={() => { actions.removeNote(note.id); setSelected(null); }}><Trash2 /></Button>
          </div>
          <div ref={editor} contentEditable suppressContentEditableWarning role="textbox" aria-label="Note content" aria-multiline="true" className="note-editor bg-input rounded-xl border border-border p-2 text-xs outline-none focus:ring-2 focus:ring-ring overflow-y-auto" onInput={save} onPaste={(e) => { e.preventDefault(); document.execCommand("insertText", false, e.clipboardData.getData("text/plain")); save(); }} />
          <div className="flex gap-2">{PALETTE.slice(0, 5).map((p) => <Button key={p.name} variant="ghost" size="icon" className={`staff-swatch size-5 rounded-full p-0 ${note.color === p.c ? "ring-2 ring-ring ring-offset-2" : ""}`} style={{ "--employee-color": p.c } as React.CSSProperties} title={`${p.name} note`} aria-label={`${p.name} note`} onClick={() => actions.updateNote(note.id, { color: p.c })} />)}</div>
          <Button className="w-full h-8 text-xs" disabled={!note.text.trim() && !note.title.trim()} onClick={() => { onConvert([note.title, note.text].filter(Boolean).join("\n")); setOpen(false); }}><ListChecks />Convert Note to Task</Button>
        </div>}
      </section>}
  </div>;
}