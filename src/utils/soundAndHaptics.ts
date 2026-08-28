/**
 * Zero-latency Web Audio API Synthesizer & Mobile Haptic Vibration Engine
 * No external audio files or dependencies required.
 */

// Shared AudioContext instance (initialized on first user interaction)
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play a crisp 1400Hz retail barcode scan beep (80ms)
 */
export function playScanBeep(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.07);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {
    console.debug("Audio play failed:", e);
  }
}

/**
 * Play harmonious C5-E5-G5 success chime for payment/invoice save
 */
export function playSuccessChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

      const startTime = ctx.currentTime + idx * 0.08;
      const duration = 0.22;

      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch (e) {
    console.debug("Audio chime failed:", e);
  }
}

/**
 * Play a low acoustic delete click/thud
 */
export function playDeleteThud(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.07);
  } catch (e) {
    console.debug("Audio thud failed:", e);
  }
}

// ─── Haptic Vibration Helpers (Mobile Chrome / Android / PWA) ─────────────

/**
 * Quick 30ms haptic feedback for barcode scan
 */
export function triggerHapticScan(): void {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate(30);
    } catch {}
  }
}

/**
 * Success dual-pulse haptic feedback for payment / bill save
 */
export function triggerHapticSuccess(): void {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate([40, 30, 60]);
    } catch {}
  }
}

/**
 * Gentle alert pulse for item delete or warning
 */
export function triggerHapticDelete(): void {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate([25, 20, 25]);
    } catch {}
  }
}
