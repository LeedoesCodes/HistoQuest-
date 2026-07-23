/**
 * Tiny synthesized sound effects via the Web Audio API.
 *
 * No audio files: every sound is generated at runtime, so the game gets audio
 * feedback with zero assets and zero load time. Swap for real recordings later
 * by keeping these call sites and changing the implementation.
 *
 * Everything is wrapped so audio can NEVER break gameplay — if the AudioContext
 * is unavailable or blocked, the calls silently no-op.
 */

let ctx: AudioContext | null = null;
let failed = false;

function ac(): AudioContext | null {
  if (failed) return null;
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) {
        failed = true;
        return null;
      }
      ctx = new Ctor();
    }
    // Browsers start the context suspended until a user gesture; every sound
    // here follows a tap, so resuming on demand is safe.
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    failed = true;
    return null;
  }
}

/** A short pitched blip. */
function tone(
  freq: number,
  duration: number,
  type: OscillatorType = "triangle",
  gain = 0.05,
  delay = 0
): void {
  const c = ac();
  if (!c) return;
  try {
    const osc = c.createOscillator();
    const amp = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(amp);
    amp.connect(c.destination);
    const t = c.currentTime + delay;
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  } catch {
    /* ignore */
  }
}

/** Filtered white noise — used for the paper tear. */
function noise(duration = 0.25, gain = 0.07, highpass = 1100): void {
  const c = ac();
  if (!c) return;
  try {
    const len = Math.max(1, Math.floor(c.sampleRate * duration));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len); // decaying
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = highpass;
    const amp = c.createGain();
    amp.gain.value = gain;
    src.connect(filter);
    filter.connect(amp);
    amp.connect(c.destination);
    src.start();
  } catch {
    /* ignore */
  }
}

export const sfx = {
  /** Generic UI tap. */
  tap: () => tone(430, 0.07, "triangle", 0.045),
  /** Placing a tile / picking something up. */
  pop: () => tone(680, 0.06, "square", 0.035),
  /** Small positive hit (recruit, repel an invader). */
  hit: () => {
    tone(620, 0.07, "triangle", 0.05);
    tone(930, 0.06, "triangle", 0.03, 0.04);
  },
  /** Round or puzzle solved. */
  success: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.17, "triangle", 0.05, i * 0.075)),
  /** Wrong answer / mistake. */
  error: () => {
    tone(180, 0.2, "sawtooth", 0.045);
    tone(120, 0.24, "sawtooth", 0.035, 0.04);
  },
  /** Something got past the defence. */
  thud: () => tone(90, 0.28, "sine", 0.07),
  /** Tearing the cedula. */
  tear: () => noise(0.32, 0.08, 900),
  /**
   * One character of typewriter text. Deliberately tiny and quiet — it plays
   * many times per line, so anything louder becomes irritating fast.
   */
  type: () => tone(1500 + Math.random() * 260, 0.015, "square", 0.012),
};
