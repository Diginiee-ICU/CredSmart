import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { CheckCircle2, Mic, MicOff, Send, Volume2 } from "lucide-react";
import { useStore, type Employee } from "@/crm/lib/store";
import { executeVoiceCommand, hindiError, parseVoiceCommand, type VoiceResult } from "@/crm/lib/voice-commands";
import { getLang, useLang } from "@/crm/lib/i18n";
import { Button, inputCls, Sheet } from "./primitives";
import { Switch } from "@/components/ui/switch";

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type Recognition = { lang: string; continuous: boolean; interimResults: boolean; onresult: ((e: { resultIndex: number; results: { length: number; [i: number]: RecognitionResult } }) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void; abort: () => void };
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
const hiSamples = ["लक्ष्मी को टास्क दो बिल चेक करना", "राहुल के टास्क का क्या अपडेट है", "राहुल की हाजिरी दिखाओ", "राहुल को 1500 रुपये एडवांस दो", "नेहा को स्टाफ में जोड़ो"];
const samples = ["Assign task to Laxmi to audit bills", "What's the update on Rahul's task?", "Open attendance report of Rahul", "Add ₹1500 advance to Rahul", "Add Neha in staff"];
export const VoiceCopilot = forwardRef(function VoiceCopilot({ staff, onNavigate }: { staff?: Employee | undefined; onNavigate: (target: NonNullable<VoiceResult["navigate"]>) => void }, ref) {
  useImperativeHandle(ref, () => ({ open: () => quickListen() }));
  const s = useStore((s) => s);
  const lang = useLang();
  const [speechLang, setSpeechLang] = useState<"hi-IN" | "en-IN">(() => (getLang() === "hi" ? "hi-IN" : "en-IN"));
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [speakReply, setSpeakReply] = useState(true);
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [error, setError] = useState("");
  const [quick, setQuick] = useState(false);
  const quickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const lastCommand = useRef("");
  const latest = useRef({ s, staff, onNavigate, speakReply });
  latest.current = { s, staff, onNavigate, speakReply };
  const stop = () => { const rec = recognition.current; recognition.current = null; if (rec) { rec.onresult = null; rec.onerror = null; rec.onend = null; rec.abort(); } setListening(false); };
  useEffect(() => () => { const rec = recognition.current; if (rec) { rec.onresult = null; rec.onerror = null; rec.onend = null; rec.abort(); } if ("speechSynthesis" in window) window.speechSynthesis.cancel(); }, []);
  const speak = (text: string) => {
    if (!latest.current.speakReply || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = /[\u0900-\u097F]/.test(text) ? "hi-IN" : "en-IN";
    window.speechSynthesis.speak(utterance);
  };
  const execute = (command: string, confirmAdd = false) => {
    lastCommand.current = command;
    stop(); setInput(command); setTranscript(command); setError(""); setResult(null);
    try {
      const { s: state, staff: actor, onNavigate: navigate } = latest.current;
      const intent = parseVoiceCommand(command, state.employees);
      const output = executeVoiceCommand(intent, state, actor, confirmAdd, getLang() === "hi" || /[\u0900-\u097F]/.test(command) ? "hi" : "en");
      setResult(output); speak(output.reply);
      if (output.navigate) navigate(output.navigate);
    } catch (err) { const raw = err instanceof Error ? err.message : "Could not run this command."; const message = getLang() === "hi" || /[\u0900-\u097F]/.test(command) ? hindiError(raw) : raw; setError(message); speak(message); }
  };
  const quickListen = () => {
    const w = window as SpeechWindow;
    if (!(w.SpeechRecognition ?? w.webkitSpeechRecognition)) { setOpen(true); return; }
    if (quickTimer.current) clearTimeout(quickTimer.current);
    setOpen(false); setQuick(true); listen();
  };
  useEffect(() => {
    if (!quick || listening) return;
    if (result?.add) return;
    quickTimer.current = setTimeout(() => setQuick(false), result || error ? 3500 : 1200);
    return () => { if (quickTimer.current) clearTimeout(quickTimer.current); };
  }, [quick, listening, result, error]);
  const listen = () => {
    if (listening) { recognition.current?.stop(); return; }
    const w = window as SpeechWindow;
    const Constructor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Constructor) { setError("Voice recognition isn't available in this browser. Type a command or tap a sample below."); return; }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    stop(); setError(""); setTranscript(""); setResult(null);
    const rec = new Constructor(); recognition.current = rec;
    rec.lang = speechLang; rec.continuous = false; rec.interimResults = true;
    let handled = false;
    rec.onresult = (event) => {
      if (recognition.current !== rec || handled) return;
      const parts = Array.from({ length: event.results.length }, (_, i) => event.results[i]?.[0].transcript ?? "");
      const text = parts.join(" ").trim(); setTranscript(text); setInput(text);
      if (event.results.length > 0 && Array.from({ length: event.results.length }, (_, i) => event.results[i]?.isFinal).every(Boolean) && text) { handled = true; execute(text); }
    };
    rec.onerror = (event) => { setListening(false); setError(event.error === "not-allowed" || event.error === "service-not-allowed" ? "Microphone access was blocked. Open the app in a full browser tab, or type a command below." : event.error === "no-speech" ? "No speech detected. Try again or type a command." : `Voice recognition unavailable (${event.error}). You can still type a command.`); };
    rec.onend = () => { if (recognition.current === rec) recognition.current = null; setListening(false); };
    try { rec.start(); setListening(true); } catch { stop(); setError("Couldn't start the microphone. Type a command or try in a full browser tab."); }
  };
  return <>
    <div className="voice-anchor"><Button variant="secondary" size="icon" className="voice-orb metal-voice-orb rounded-full size-11" aria-label="Open Voice Copilot" title="Voice commands" onClick={() => (listening ? stop() : quickListen())}><Mic className="size-4" /></Button></div>
    {quick && !open && <div role="status" aria-live="polite" aria-label="Voice quick mode" className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[60] glass rounded-full px-3 py-2 flex items-center gap-2 max-w-[92vw] shadow-lg">
      {listening ? <><div className="voice-wave is-listening flex h-5 gap-0.5 items-center">{Array.from({ length: 9 }, (_, i) => <span key={i} className="w-0.5 rounded-full bg-primary" />)}</div><button type="button" className="text-[10px] text-muted-foreground" onClick={stop}>Stop</button></>
        : error ? <p className="text-xs text-destructive break-words">{error}</p>
        : result ? <><CheckCircle2 className="size-4 shrink-0 text-success" /><p className="text-xs font-medium break-words">{result.reply}</p>{result.add && <Button className="h-7 text-[10px] rounded-full" onClick={() => execute(lastCommand.current, true)}>Add</Button>}</>
        : <p className="text-xs text-muted-foreground">…</p>}
      <button type="button" aria-label="Open voice options" className="text-[10px] underline text-muted-foreground shrink-0" onClick={() => { stop(); setQuick(false); setOpen(true); }}>More</button>
    </div>}
    {open && <Sheet title="Voice Copilot" onClose={() => { stop(); if ("speechSynthesis" in window) window.speechSynthesis.cancel(); setOpen(false); }}>
      <div className="flex items-center justify-between gap-3"><Button variant={listening ? "destructive" : "secondary"} className="h-9 text-xs rounded-full" onClick={listen}>{listening ? <MicOff /> : <Mic />}{listening ? "Stop Listening" : "Start Listening"}</Button><div className="glass p-0.5 rounded-full flex text-[10px]" role="group" aria-label="Voice language">{(["hi-IN", "en-IN"] as const).map((l) => <button key={l} type="button" className={`px-2 py-1 rounded-full ${speechLang === l ? "bg-primary text-primary-foreground" : ""}`} onClick={() => { stop(); setSpeechLang(l); }}>{l === "hi-IN" ? "हिंदी" : "EN"}</button>)}</div><label className="flex items-center gap-2 text-xs"><Volume2 className="size-3.5" />Speak Reply<Switch aria-label="Speak Reply" checked={speakReply} onCheckedChange={(checked) => { setSpeakReply(checked); if (!checked && "speechSynthesis" in window) window.speechSynthesis.cancel(); }} /></label></div>
      <div className="border-y border-border py-3 space-y-2"><div className={`voice-wave flex h-7 gap-1 justify-center items-center ${listening ? "is-listening" : ""}`} aria-label={listening ? "Listening" : "Microphone idle"}>{Array.from({ length: 15 }, (_, i) => <span key={i} className="w-1 rounded-full bg-primary" />)}</div><p aria-live="polite" className="text-xs min-h-8 break-words text-muted-foreground">{transcript || (listening ? "Listening…" : "Ready for your command")}</p></div>
      <form className="flex gap-2" onSubmit={(ev) => { ev.preventDefault(); if (input.trim()) execute(input); }}><input aria-label="Text command" className={`${inputCls} min-w-0 text-xs`} placeholder="Type a command…" value={input} onChange={(ev) => setInput(ev.target.value)} /><Button size="icon" type="submit" className="size-9 shrink-0" disabled={!input.trim()} aria-label="Run command"><Send /></Button></form>
      <div className="grid grid-cols-2 gap-2">{[...(lang === "hi" ? hiSamples : samples), ...(lang === "hi" ? samples.slice(0, 1) : hiSamples.slice(0, 1))].map((sample) => <Button key={sample} variant="secondary" className="text-[10px] h-auto min-h-10 p-2 whitespace-normal text-left justify-start" onClick={() => execute(sample)}>{sample}</Button>)}</div>
      {error && <p role="alert" className="text-xs text-destructive break-words">{error}</p>}
      {result && <section aria-label="Voice command result" aria-live="polite" className="glass p-3 space-y-2"><p className="flex gap-2 text-sm font-semibold"><CheckCircle2 className="size-4 shrink-0 text-success mt-0.5" />{result.reply}</p>{result.details.map((detail, i) => <p key={i} className="text-xs text-muted-foreground break-words">{detail}</p>)}{result.add && <Button className="h-8 text-xs w-full" onClick={() => execute(lastCommand.current, true)}>Add {result.add.name} & Assign</Button>}{result.tasks?.map((t) => <div key={t.id} className="border-t border-border pt-2"><p className="text-xs font-semibold break-words">{t.title}</p><p className="text-[10px] text-muted-foreground">{t.done ? "Completed" : t.review === "pending" ? "Awaiting approval" : t.inProgress ? "In Progress" : "Pending"} · {t.isPublic ? "Public" : "Private"}</p></div>)}</section>}
    </Sheet>}
  </>;
});