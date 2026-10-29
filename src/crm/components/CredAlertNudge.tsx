import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const CREDALERT_URL = "https://credalert.business";

/** One message shows at a time, in this order, then the list repeats. */
export const NUDGE_MESSAGES = [
  "Maal bhi chala gaya, payment bhi atak gayi?",
  "Udhaar dene se pehle, credibility check karo",
  "Har business genuine dikhta hai. Har business hota nahi.",
  "Every deal has a risk. Know yours.",
  "Trust. But verify.",
  "Delivery ho gayi. Payment kab hogi?",
  "Before you give credit to your next buyer, know who you're dealing with.",
  "Had a bad business experience? Let your voice be heard.",
  "Galat hua hai? Chup rehna zaroori nahi.",
  "Complaint ki, par solution nahi mila?",
  "Don't let your next business deal become another costly lesson.",
  "Business mein ek galat faisla, aur sab kuch badal sakta hai.",
];

/** Index shown after the one just displayed (wraps back to the first). */
export const nextNudgeIndex = (last: number, total = NUDGE_MESSAGES.length) =>
  (last + 1 + total) % total;

const FIRST_MS = 15_000;
const EVERY_MS = 60_000;
const VISIBLE_MS = 12_000;

const readCursor = (key: string) => {
  try {
    const raw = Number(localStorage.getItem(key));
    return Number.isFinite(raw) ? raw : -1;
  } catch {
    return -1;
  }
};
const writeCursor = (key: string, value: number) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* ignore */
  }
};

const playPop = () => {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(980, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.26);
    osc.onended = () => void ctx.close();
  } catch {
    /* sound blocked */
  }
};

/** Small CredAlert nudge: opens briefly every minute, one message at a time. */
export function CredAlertNudge({ storeKey }: { storeKey: string }) {
  const [shown, setShown] = useState<number | null>(null);
  const hideTimers = useRef<number[]>([]);

  useEffect(() => {
    const open = () => {
      const next = nextNudgeIndex(readCursor(storeKey));
      writeCursor(storeKey, next);
      setShown(next);
      playPop();
      hideTimers.current.push(
        window.setTimeout(() => setShown((cur) => (cur === next ? null : cur)), VISIBLE_MS),
      );
    };
    const first = window.setTimeout(open, FIRST_MS);
    const loop = window.setInterval(open, EVERY_MS);
    const timers = hideTimers.current;
    return () => {
      window.clearTimeout(first);
      window.clearInterval(loop);
      timers.forEach(window.clearTimeout);
    };
  }, [storeKey]);

  if (shown === null) return null;
  const close = () => setShown(null);
  const visit = () => {
    window.open(CREDALERT_URL, "_blank", "noopener,noreferrer");
    close();
  };

  return (
    <div
      role="status"
      aria-live="polite"
      data-no-i18n
      className="cred-nudge metal-frame fixed left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-[70] w-[min(320px,90vw)] p-3 pr-8 shadow-2xl"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={close}
        className="absolute right-2 top-2 p-1 text-muted-foreground hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
      <p className="text-[9px] uppercase font-bold tracking-wide cred-orange mb-1">
        CredAlert
      </p>
      <p className="text-xs font-semibold leading-snug mb-2 cred-orange">{NUDGE_MESSAGES[shown]}</p>
      <Button size="sm" className="cred-orange-btn h-7 w-full text-[11px] rounded-full" onClick={visit}>
        visit CredAlert
      </Button>
    </div>
  );
}
