import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useAnimationFrame } from "framer-motion";

/* ===================== Dial geometry ===================== */
const SIZE = 440;
const STROKE = 18;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;
const CENTER = SIZE / 2;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const fmt = (s: number) => {
  s = Math.max(0, Math.floor(s));
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
};

/* ===================== Helpers ===================== */
const onlyDigits = (s: string) => s.replace(/\D+/g, "");
const normalizeMinutes = (raw: string, fallback: number) => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return String(fallback);
  return String(Math.max(1, Math.min(600, Math.floor(n))));
};

/* ===================== Background blobs (break only) ===================== */
type Hsl = { h: number; s: number; l: number };
const SUNSET: Hsl[] = [
  { h: 12, s: 88, l: 70 },
  { h: 27, s: 90, l: 72 },
  { h: 323, s: 72, l: 75 },
  { h: 208, s: 78, l: 74 },
];
const grad = (c: Hsl, a1 = 0.95, a2 = 0.75) =>
  `radial-gradient(circle at 50% 50%, hsla(${c.h},${c.s}%,${c.l}%,${a1}), hsla(${c.h},${c.s}%,${Math.max(
    0,
    c.l - 10
  )}%,${a2}) 60%, transparent 72%)`;

type Blob = {
  c: Hsl;
  x: number;
  y: number;
  s: number;
  vx: number;
  vy: number;
  phase: number;
  wobble: number;
};

function BlobField({ count = 6 }: { count?: number }) {
  const blobsRef = useRef<Blob[]>(
    Array.from({ length: count }, (_, i) => {
      const c = SUNSET[i % SUNSET.length];
      return {
        c,
        x: 6 + Math.random() * 88,
        y: 10 + Math.random() * 80,
        s: 0.95 + Math.random() * 0.55,
        vx: (Math.random() - 0.5) * 0.04,
        vy: (Math.random() - 0.5) * 0.04,
        phase: Math.random() * Math.PI * 2,
        wobble: 0.00022 + Math.random() * 0.00016,
      };
    })
  );

  const [, force] = useState(0);
  const last = useRef(performance.now());

  useAnimationFrame((t) => {
    const dt = t - last.current;
    last.current = t;

    blobsRef.current.forEach((b, idx) => {
      const turn = Math.sin(t * 0.00004 + idx * 0.7) * 0.0016;
      b.vx += turn * 0.02;
      b.vy += Math.cos(t * 0.000035 + idx) * 0.0016;

      const cap = 0.04;
      b.vx = Math.max(-cap, Math.min(cap, b.vx));
      b.vy = Math.max(-cap, Math.min(cap, b.vy));

      b.x += b.vx * 0.58;
      b.y += b.vy * 0.58;

      const padX = 1.5,
        padY = 2.0;
      if (b.x < padX) {
        b.x = padX;
        b.vx = Math.abs(b.vx) * 0.96;
      }
      if (b.x > 100 - padX) {
        b.x = 100 - padX;
        b.vx = -Math.abs(b.vx) * 0.96;
      }
      if (b.y < padY) {
        b.y = padY;
        b.vy = Math.abs(b.vy) * 0.96;
      }
      if (b.y > 100 - padY) {
        b.y = 100 - padY;
        b.vy = -Math.abs(b.vy) * 0.96;
      }

      b.phase += b.wobble * dt;
    });

    force((n) => (n + 1) % 1e6);
  });

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {blobsRef.current.map((b, i) => {
        const r1 = 38 + 24 * Math.sin(b.phase + 0.0);
        const r2 = 62 - 22 * Math.cos(b.phase + 0.8);
        const r3 = 44 + 26 * Math.sin(b.phase + 1.6);
        const r4 = 56 - 20 * Math.cos(b.phase + 2.2);
        const e1 = 36 + 22 * Math.cos(b.phase + 0.4);
        const e2 = 48 - 20 * Math.sin(b.phase + 1.2);
        const e3 = 60 + 18 * Math.cos(b.phase + 1.9);
        const e4 = 64 - 22 * Math.sin(b.phase + 2.8);

        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${b.x}vw`,
              top: `${b.y}vh`,
              transform: `translate(-50%, -50%) scale(${b.s})`,
              width: "62vw",
              height: "62vw",
              background: grad(b.c),
              borderRadius: `${r1}% ${r2}% ${r3}% ${r4}% / ${e1}% ${e2}% ${e3}% ${e4}%`,
              filter: "blur(90px) saturate(1.05)",
              opacity: 0.94,
            }}
          />
        );
      })}
      <div
        className="absolute inset-0"
        style={{
          background: "rgba(255,255,255,0.36)",
          backdropFilter: "blur(28px) saturate(1.05)",
          WebkitBackdropFilter: "blur(28px) saturate(1.05)",
        }}
      />
    </div>
  );
}


/* ===================== Clean Sounds ===================== */
class SoundEngine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  unlocked = false;
  // Track scheduled completion tones on the AudioContext timeline
  scheduled: OscillatorNode[] = [];
  volume = 0.4;
  muted = false;

  ensure() {
    if (!this.ctx) {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new Ctx();
      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : this.volume;
      master.connect(ctx.destination);
      this.ctx = ctx;
      this.master = master;
    }
  }
  unlock = async () => {
    this.ensure();
    if (this.ctx && !this.unlocked) {
      try {
        await this.ctx.resume();
        this.unlocked = true;
      } catch {}
    }
  };

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) {
      this.master.gain.value = m ? 0 : this.volume;
    }
  }

  blip(
    f: number,
    o: Partial<{
      type: OscillatorType;
      attack: number;
      decay: number;
      release: number;
      peak: number;
      sweep: number;
      lpf: number;
    }> = {}
  ) {
    this.ensure();
    if (!this.ctx || !this.master) return;
    const {
      type = "triangle",
      attack = 0.003,
      decay = 0.12,
      release = 0.06,
      peak = 0.8,
      sweep = 0,
      lpf = 9000,
    } = o;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = lpf;
    osc.type = type;
    osc.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(Math.max(1e-4, 0.001), t + attack + decay);
    g.gain.exponentialRampToValueAtTime(Math.max(1e-4, 0.0005), t + attack + decay + release);
    if (sweep) osc.frequency.linearRampToValueAtTime(f + sweep, t + attack + decay);
    osc.connect(lp);
    lp.connect(g);
    g.connect(this.master!);
    osc.start(t);
    osc.stop(t + attack + decay + release + 0.02);
  }
  chord(freqs: number[], opts: Parameters<SoundEngine["blip"]>[1]) {
    freqs.forEach((f, i) => this.blip(f, { ...opts, peak: (opts?.peak ?? 0.8) * (i ? 0.7 : 1) }));
  }
  play(kind: "start" | "pause" | "skip" | "complete" | "click") {
    if (kind === "start")
      this.chord([520, 780], { attack: 0.004, decay: 0.11, release: 0.07, sweep: 14 });
    if (kind === "pause")
      this.blip(420, { type: "sine", decay: 0.12, release: 0.06, sweep: -18 });
    if (kind === "skip")
      this.blip(600, {
        type: "triangle",
        attack: 0.0015,
        decay: 0.07,
        release: 0.03,
        sweep: -10,
        lpf: 5200,
        peak: 0.55,
      });
    if (kind === "click")
      this.blip(600, {
        type: "sine",
        attack: 0.002,
        decay: 0.05,
        release: 0.02,
        peak: 0.15,
        lpf: 1500,
      });
    if (kind === "complete") {
      // Fallback chime pattern (used only when needed)
      const a = 660;
      const base = [a, a * 1.25, a * 1.5, a * 2];
      const focusToBreak = base.concat(base.slice(0, -1).reverse());
      const breakToFocus = base.slice().reverse().concat(base.slice(1));
      const freqs = this.nextMode === "focus" ? breakToFocus : focusToBreak;
      const peaks = [0.5, 0.5, 0.5, 0.3, 0.3, 0.3, 0.15];
      freqs.forEach((f, i) =>
        setTimeout(
          () =>
            this.blip(f, {
              type: "sine",
              decay: 0.15,
              release: 0.15,
              peak: peaks[i],
            }),
          i * 180
        )
      );
    }
  }

  cancelScheduled = () => {
    if (this.scheduled && this.scheduled.length) {
      this.scheduled.forEach((o) => {
        try {
          o.stop(0);
        } catch {}
      });
      this.scheduled = [];
    }
  };

  nextMode: Mode = "break";

  scheduleCompleteIn = (delaySec: number, nextMode: Mode) => {
    this.ensure();
    if (!this.ctx || !this.master) return;
    this.cancelScheduled();
    this.nextMode = nextMode;
    const t0 = this.ctx.currentTime + Math.max(0, delaySec);
    // gentle ticks for the final 5 seconds before a mode switch
    for (let i = 5; i >= 1; i--) {
      const start = t0 - i;
      if (start > this.ctx.currentTime) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        const lp = this.ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 2000;
        osc.type = "sine";
        osc.frequency.setValueAtTime(1000, start);
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(0.08, start + 0.004);
        g.gain.exponentialRampToValueAtTime(
          Math.max(1e-4, 0.001),
          start + 0.05
        );
        osc.connect(lp);
        lp.connect(g);
        g.connect(this.master!);
        osc.start(start);
        osc.stop(start + 0.06);
        this.scheduled.push(osc);
      }
    }
    const a = 660;
    const base = [a, a * 1.25, a * 1.5, a * 2];
    const focusToBreak = base.concat(base.slice(0, -1).reverse());
    const breakToFocus = base.slice().reverse().concat(base.slice(1));
    const freqs = nextMode === "focus" ? breakToFocus : focusToBreak;
    const peaks = [0.5, 0.5, 0.5, 0.3, 0.3, 0.3, 0.15];
    freqs.forEach((f, i) => {
      const start = t0 + i * 0.18;
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      const lp = this.ctx!.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 9000;
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, start);
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(peaks[i], start + 0.004);
      g.gain.exponentialRampToValueAtTime(
        Math.max(1e-4, 0.0005),
        start + 0.004 + 0.15 + 0.15
      );
      osc.connect(lp);
      lp.connect(g);
      g.connect(this.master!);
      osc.start(start);
      osc.stop(start + 0.004 + 0.15 + 0.15 + 0.02);
      this.scheduled.push(osc);
    });
  };
}
const sound = new SoundEngine();

/* ===================== Icons (SVG) ===================== */
const PlayIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M8 5v14l11-7z" />
  </svg>
);
const PauseIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
  </svg>
);
const SkipIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M7 6l8 6-8 6V6zm9 0h2v12h-2z" />
  </svg>
);
const FullscreenIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M7 7h3V5H5v5h2V7zm7-2v2h3v3h2V5h-5zm3 10h-3v2h5v-5h-2v3zm-7 3v-2H7v-3H5v5h5z" />
  </svg>
);
const ExitFullscreenIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M16 14h3v5h-5v-2h3v-3zm-7 3v2H4v-5h2v3h3zm7-11h-3V4h5v5h-2V6zm-7 0V4H4v5h2V6h3z" />
  </svg>
);
const VolumeIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06Z"/>
    <path d="M18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z"/>
    <path d="M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06Z"/>
  </svg>
);
const MuteIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM17.78 9.22a.75.75 0 1 0-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L19.5 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L20.56 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L19.5 10.94l-1.72-1.72Z"/>
  </svg>
);

/* ===================== Animated time ===================== */
function AnimatedTime({ value, dark }: { value: number; dark: boolean }) {
  const [display, setDisplay] = useState(fmt(value));
  useEffect(() => setDisplay(fmt(value)), [value]);
  const chars = display.split("");
  const cls = `${dark ? "text-white" : "text-black"} text-6xl md:text-7xl font-bold`;

  return (
    <div className={`${cls} inline-flex whitespace-nowrap`} style={{ fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
      {chars.map((ch, i) => {
        const key = `${i}-${ch}`;
        const isDigit = /\d/.test(ch);
        const isColon = ch === ":";
        return (
          <span
            key={key}
            className={`relative inline-block text-center align-middle ${isColon ? "translate-y-[-10%]" : ""}`}
            style={{ width: "0.6em", verticalAlign: "middle" }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={key}
                initial={
                  isDigit
                    ? { opacity: 0, scale: 0.95 }
                    : { opacity: 1 }
                }
                animate={
                  isDigit
                    ? { opacity: 1, scale: 1 }
                    : { opacity: 1 }
                }
                exit={
                  isDigit
                    ? { opacity: 0, scale: 1.05 }
                    : { opacity: 1 }
                }
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute inset-0"
              >
                {ch}
              </motion.span>
            </AnimatePresence>
            <span className="invisible">{ch}</span>
          </span>
        );
      })}
    </div>
  );
}

/* ===================== MODE tag ===================== */
function ModeTag({ mode, isBreak }: { mode: "focus" | "break"; isBreak: boolean }) {
  const text = mode === "focus" ? "FOCUS" : "BREAK";
  const fg = isBreak ? "text-black/50" : "text-white/50";
  return (
    <div className="relative h-6">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={text}
          initial={{ y: -6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 6, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 26 }}
          className={`inline-flex items-center justify-center text-[13px] tracking-[0.15em] ${fg}`}
          style={{ lineHeight: 1 }}
        >
          {text}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ===================== App ===================== */
type Mode = "focus" | "break";

export default function App() {
  // durations
  const [focusText, setFocusText] = useState(() => {
    const saved = localStorage.getItem("focusMinutes");
    return saved ? normalizeMinutes(saved, 30) : "30";
  });
  const [breakText, setBreakText] = useState(() => {
    const saved = localStorage.getItem("breakMinutes");
    return saved ? normalizeMinutes(saved, 5) : "5";
  });
  const focusMin = parseInt(focusText, 10) || 30;
  const breakMin = parseInt(breakText, 10) || 5;

  useEffect(() => {
    localStorage.setItem("focusMinutes", String(focusMin));
  }, [focusMin]);

  useEffect(() => {
    localStorage.setItem("breakMinutes", String(breakMin));
  }, [breakMin]);

  // mode/cycle
  const [mode, setMode] = useState<Mode>("focus");
  const [cycle, setCycle] = useState(1);

  // timing
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [pausedSec, setPausedSec] = useState(focusMin * 60);
  const [totalSec, setTotalSec] = useState(focusMin * 60);
  const [now, setNow] = useState(Date.now());
  const [timeBump, setTimeBump] = useState(0);
  // Hide controls when idle and show on mouse movement
  const [idle, setIdle] = useState(false);
  const idleTimeoutRef = useRef<number | null>(null);
  useEffect(() => {
    const reset = () => {
      setIdle(false);
      if (idleTimeoutRef.current !== null)
        window.clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = window.setTimeout(() => setIdle(true), 3000);
    };
    window.addEventListener("mousemove", reset);
    reset();
    return () => {
      window.removeEventListener("mousemove", reset);
      if (idleTimeoutRef.current !== null)
        window.clearTimeout(idleTimeoutRef.current);
    };
  }, []);

  // Fullscreen handling
  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggleFullscreen = useCallback(() => {
    sound.unlock().then(() => sound.play("click"));
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Mute handling
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    sound.setMuted(muted);
  }, [muted]);
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
      const key = e.key.toLowerCase();
      if (key === "f") {
        e.preventDefault();
        toggleFullscreen();
      } else if (key === "escape" && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggleFullscreen]);

  // --- Background chime reliability ---
  // Track absolute end time (ms) and whether we've already beeped for that timestamp.
  const scheduledEndRef = useRef<number | null>(null);
  const beepedForRef = useRef<number | null>(null);
  const beepMarkTimeoutRef = useRef<number | null>(null);
  const clearBeepMark = () => {
    if (beepMarkTimeoutRef.current !== null) {
      clearTimeout(beepMarkTimeoutRef.current);
      beepMarkTimeoutRef.current = null;
    }
  };
  const scheduleBeepMarkIn = (delaySec: number) => {
    clearBeepMark();
    beepMarkTimeoutRef.current = window.setTimeout(() => {
      if (scheduledEndRef.current) beepedForRef.current = scheduledEndRef.current;
    }, Math.max(0, delaySec) * 1000);
  };

  // tick (animation frame)
  useAnimationFrame(() => {
    if (isRunning && endAt) setNow(Date.now());
  });

  // background tick so time advances when tab is hidden
  useEffect(() => {
    if (!isRunning || endAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isRunning, endAt]);

  // If tab was hidden and audio got suspended, play a catch-up chime on return
  useEffect(() => {
    const checkMissed = () => {
      sound.unlock(); // try to resume AudioContext
      const to = scheduledEndRef.current;
      if (!isRunning || !to) return;
      if (!beepedForRef.current && Date.now() >= to) {
        sound.play("complete");
        beepedForRef.current = to;
      }
    };
    document.addEventListener("visibilitychange", checkMissed);
    window.addEventListener("focus", checkMissed);
    return () => {
      document.removeEventListener("visibilitychange", checkMissed);
      window.removeEventListener("focus", checkMissed);
    };
  }, [isRunning]);

  // remaining
  const remaining = useMemo(
    () => (endAt ? Math.max(0, (endAt - now) / 1000) : pausedSec),
    [endAt, now, pausedSec]
  );
  const fracRemaining = clamp01(totalSec ? remaining / totalSec : 0);

  // idle-only reset on changes
  const lastKeyRef = useRef<string>("");
  useEffect(() => {
    if (isRunning) return;
    const key = `${mode}-${focusMin}-${breakMin}`;
    if (key !== lastKeyRef.current) {
      const base = (mode === "focus" ? focusMin : breakMin) * 60;
      setTotalSec(base);
      setPausedSec(base);
      lastKeyRef.current = key;
    }
  }, [mode, focusMin, breakMin, isRunning]);

  // auto-switch when a session completes
  useEffect(() => {
    if (!isRunning || endAt === null) return;
    if (remaining <= 0) {
      const next: Mode = mode === "focus" ? "break" : "focus";
      const nt = (next === "focus" ? focusMin : breakMin) * 60;
      setMode(next);
      setCycle((c) => (mode === "break" ? c + 1 : c));
      setTotalSec(nt);
      setPausedSec(nt);
      const newEnd = Date.now() + nt * 1000;
      setEndAt(newEnd);
      setNow(newEnd - nt * 1000);

      // ensure completion chime even if tab was hidden/suspended
      if (
        scheduledEndRef.current &&
        beepedForRef.current !== scheduledEndRef.current
      ) {
        sound.play("complete");
        beepedForRef.current = scheduledEndRef.current;
      }
      // allow alarm to finish before scheduling the next chime
      const nextNext: Mode = next === "focus" ? "break" : "focus";
      setTimeout(
        () => sound.scheduleCompleteIn(Math.max(0, nt - 2.4), nextNext),
        2400
      );
      scheduledEndRef.current = newEnd;
      beepedForRef.current = null;
      scheduleBeepMarkIn(nt);

      lastKeyRef.current = `${next}-${focusMin}-${breakMin}`;
    }
  }, [remaining, isRunning, endAt, mode, focusMin, breakMin]);

  useEffect(() => {
    const modeLabel = mode === "focus" ? "Focus" : "Break";
    document.title = `${fmt(remaining)} – ${modeLabel}`;
  }, [remaining, mode]);

  // controls (no persistent focus on buttons)
  const blurTarget = (e: React.SyntheticEvent<HTMLButtonElement>) =>
    (e.currentTarget as HTMLButtonElement).blur();

  const playPause = async () => {
    await sound.unlock();
    sound.play("click");
    if (!isRunning) {
      setHasStarted(true);
      // Robust remaining time: if previous endAt is stale/past, use pausedSec
      let rem: number;
      if (endAt && endAt > Date.now()) {
        rem = (endAt - Date.now()) / 1000;
      } else {
        rem = pausedSec;
      }
      if (rem < 0.5) rem = pausedSec || totalSec || 60; // avoid instant chime on start
      const newEnd = Date.now() + rem * 1000;
      setEndAt(newEnd);
      setIsRunning(true);
      setNow(Date.now());

      const next: Mode = mode === "focus" ? "break" : "focus";
      sound.cancelScheduled();
      sound.scheduleCompleteIn(rem, next);
      scheduledEndRef.current = newEnd;
      beepedForRef.current = null;
      scheduleBeepMarkIn(rem);

    } else {
      const rem = Math.max(0, endAt ? (endAt - Date.now()) / 1000 : pausedSec);
      setIsRunning(false);
      setEndAt(null);
      setPausedSec(rem);

      sound.cancelScheduled();
      scheduledEndRef.current = null;
      beepedForRef.current = null;
      clearBeepMark();

    }
  };

  const skip = async () => {
    await sound.unlock();
    sound.play("click");
    const next: Mode = mode === "focus" ? "break" : "focus";
    const sec = (next === "focus" ? focusMin : breakMin) * 60;
    setMode(next);
    setIsRunning(false);
    setEndAt(null);
    setTotalSec(sec);
    setPausedSec(sec);

    sound.cancelScheduled();
    scheduledEndRef.current = null;
    beepedForRef.current = null;
    clearBeepMark();

  };

  const resetTimer = () => {
    sound.play("click");
    const sec = (mode === "focus" ? focusMin : breakMin) * 60;
    setIsRunning(false);
    setEndAt(null);
    setTotalSec(sec);
    setPausedSec(sec);

    sound.cancelScheduled();
    scheduledEndRef.current = null;
    beepedForRef.current = null;
    clearBeepMark();
    lastKeyRef.current = `${mode}-${focusMin}-${breakMin}`;
    setTimeBump((k) => k + 1);
  };

  const addTime = (sec: number) => {
    if (sec <= 0) return;
    sound.play("click");
    setTotalSec((t) => t + sec);
    if (isRunning && endAt) {
      const newEnd = endAt + sec * 1000;
      const newRem = Math.max(0, (newEnd - Date.now()) / 1000);
      setEndAt(newEnd);
      const next: Mode = mode === "focus" ? "break" : "focus";
      sound.cancelScheduled();
      sound.scheduleCompleteIn(newRem, next);
      scheduledEndRef.current = newEnd;
      beepedForRef.current = null;
      scheduleBeepMarkIn(newRem);
    } else if (!isRunning) {
      setPausedSec((s) => s + sec);
    }
    setTimeBump((k) => k + 1);
  };

  // Pause/play with space bar
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "BUTTON" ||
          target.isContentEditable
        ) {
          return;
        }
      }
      if (e.repeat) return;
      e.preventDefault();
      playPause();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [playPause]);

  // theming
  const isBreak = mode === "break";
  const textMain = isBreak ? "text-black/90" : "text-white/90";
  const label = isBreak ? "text-black/60" : "text-white/60";

  // unified chip sizing
  const CONTROL_W = "w-20";
  const CONTROL_H = "h-9";

  // Inputs: keep focus ring; Buttons: no ring/outline
  const inputRing = isBreak
    ? "ring-1 ring-black/10 focus:ring-2 focus:ring-black/20"
    : "ring-1 ring-white/10 focus:ring-2 focus:ring-white/30";
  const surface = isBreak ? "bg-black/12 text-black backdrop-blur-md" : "bg-white/10 text-white backdrop-blur-md";
  const inputCls = `${CONTROL_W} ${CONTROL_H} leading-none rounded-xl px-2 text-center outline-none ${inputRing} ${surface} transition-colors`;
  const btnCls = `rounded-xl ${CONTROL_W} ${CONTROL_H} flex items-center justify-center ${surface} select-none active:scale-95 transition-transform outline-none focus:outline-none focus:ring-0`;
  const tinyBtnCls = `rounded-lg w-8 h-8 flex items-center justify-center text-xs ${surface} select-none active:scale-95 transition-transform outline-none focus:outline-none focus:ring-0`;

  // stack position
  const controlsAnchorTop = `calc(25vh - ${SIZE / 4}px)`;

  const showStoppedWarning = hasStarted && !isRunning;

  return (
    <div className={`relative${idle ? " cursor-none" : ""}`} style={{ minHeight: "100vh" }}>
      {/* Base background */}
      <div className="absolute inset-0 -z-10" style={{ backgroundColor: isBreak ? "#ffffff" : "#000000" }} />

      {/* BREAK: blobs + grain overlay */}
      <AnimatePresence>{isBreak && <BlobField key="sunset" />}</AnimatePresence>
      {isBreak && (
        <div
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{
            backgroundImage: [
              "radial-gradient(rgba(0,0,0,0.28) 1px, transparent 1.4px)",
              "radial-gradient(rgba(0,0,0,0.22) 1px, transparent 2px)",
              "radial-gradient(rgba(0,0,0,0.14) 1px, transparent 3px)",
              "radial-gradient(rgba(0,0,0,0.10) 1px, transparent 4px)",
            ].join(","),
            backgroundSize: "1.8px 1.8px, 3.4px 3.4px, 5px 5px, 7px 7px",
            backgroundPosition: "0 0, 1px 1px, 0.5px 0.5px, 0.25px 0.25px",
            opacity: 0.9,
            mixBlendMode: "multiply",
          }}
        />
      )}

      {/* Controls */}
      <div className="fixed inset-0 z-10">
        <motion.button
          aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
          onClick={toggleFullscreen}
          className={`absolute top-4 right-4 ${tinyBtnCls}`}
          animate={{ opacity: idle ? 0 : 1 }}
          transition={{ duration: 0.2 }}
          style={{ pointerEvents: idle ? "none" : "auto" }}
          onMouseDown={sound.unlock}
          onTouchStart={sound.unlock}
        >
          {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
        </motion.button>
        <motion.button
          aria-label={muted ? "Unmute" : "Mute"}
          onClick={() => setMuted((m) => !m)}
          className={`absolute bottom-4 right-4 ${tinyBtnCls}`}
          animate={{ opacity: idle ? 0 : 1 }}
          transition={{ duration: 0.2 }}
          style={{ pointerEvents: idle ? "none" : "auto" }}
          onMouseDown={sound.unlock}
          onTouchStart={sound.unlock}
        >
          {muted ? <MuteIcon /> : <VolumeIcon />}
        </motion.button>
        <div className="absolute inset-x-0 text-center" style={{ top: controlsAnchorTop, transform: "translateY(-50%)" }}>
          <div className="relative mx-auto w-fit flex flex-col items-center gap-2">
            {/* Title */}
            <div className={`-mb-1 ${textMain}`}>
              <a
                href="https://github.com/l2g4t-c7v6b-x1q9z/sorvidpomo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-3xl md:text-4xl font-extrabold tracking-tight"
              >
                Pomodoro
              </a>
            </div>

            {/* Durations */}
            <motion.div
              animate={{ opacity: idle ? 0 : 1 }}
              transition={{ duration: 0.2 }}
              className="flex items-end justify-center gap-3"
              style={{ pointerEvents: idle ? "none" : "auto" }}
            >
              <div className="flex flex-col items-center shrink-0">
                <label className={`${label} text-[10px] mb-1`}>Focus (min)</label>
                <input
                  type="number"
                  min={1}
                  max={600}
                  value={focusText}
                  onChange={(e) => setFocusText(onlyDigits(e.target.value))}
                  onBlur={() =>
                    setFocusText((v) => (v.trim() === "" ? "30" : normalizeMinutes(v, 30)))}
                  className={inputCls}
                  inputMode="numeric"
                />
              </div>
              <div className="flex flex-col items-center shrink-0">
                <label className={`${label} text-[10px] mb-1`}>Break (min)</label>
                <input
                  type="number"
                  min={1}
                  max={600}
                  value={breakText}
                  onChange={(e) => setBreakText(onlyDigits(e.target.value))}
                  onBlur={() =>
                    setBreakText((v) => (v.trim() === "" ? "5" : normalizeMinutes(v, 5)))}
                  className={inputCls}
                  inputMode="numeric"
                />
              </div>
            </motion.div>

            {/* Buttons */}
            <motion.div
              animate={{ opacity: idle ? 0 : 1 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center gap-3"
              style={{ pointerEvents: idle ? "none" : "auto" }}
            >
              <button
                aria-label={isRunning ? "Pause" : "Play"}
                onClick={playPause}
                className={btnCls}
                onMouseDown={sound.unlock}
                onTouchStart={sound.unlock}
                onMouseUp={blurTarget}
                onKeyUp={blurTarget}
              >
                {isRunning ? <PauseIcon /> : <PlayIcon />}
              </button>
              <button
                aria-label="Skip"
                onClick={skip}
                className={btnCls}
                onMouseDown={sound.unlock}
                onTouchStart={sound.unlock}
                onMouseUp={blurTarget}
                onKeyUp={blurTarget}
              >
                <SkipIcon />
              </button>
            </motion.div>

          </div>
        </div>

        {/* Dial center */}
        <div className="absolute" style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
          <div style={{ width: SIZE, height: SIZE }} className="relative select-none overflow-visible">
            <svg width={SIZE} height={SIZE} className="block overflow-visible">
              <defs>
                <filter id="ringGlow" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <g transform={`translate(${CENTER}, ${CENTER}) rotate(-90)`}>
                <circle
                  r={R}
                  cx={0}
                  cy={0}
                  stroke={isBreak ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.16)"}
                  strokeWidth={STROKE}
                  fill="none"
                />
                <motion.circle
                  r={R}
                  cx={0}
                  cy={0}
                  stroke={isBreak ? "rgba(0,0,0,0.96)" : "rgba(255,255,255,0.97)"}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  fill="none"
                  filter="url(#ringGlow)"
                  strokeDasharray={`${CIRC * Math.max(0.001, fracRemaining)} ${CIRC}`}
                  animate={{ pathLength: Math.max(0.001, fracRemaining) }}
                  transition={{ type: "tween", ease: "linear", duration: 0.05 }}
                />
              </g>
            </svg>

            {/* Warning + MODE tag ABOVE time */}
            <div
              className="absolute pointer-events-none"
              style={{
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -60px)",
              }}
            >
              <ModeTag mode={mode} isBreak={isBreak} />
              <AnimatePresence>
                {showStoppedWarning && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-1/2 bottom-full mb-1 -translate-x-1/2 flex items-center whitespace-nowrap text-[13px] font-bold text-red-500"
                  >
                    <span className="mr-1">⚠</span>
                    <span>timer stopped.</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Centered time and add buttons */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <motion.div
                  key={timeBump}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="pointer-events-none"
                >
                  <AnimatedTime value={remaining} dark={!isBreak} />
                </motion.div>
                <motion.div
                  animate={{ opacity: idle ? 0 : 1 }}
                  transition={{ duration: 0.2 }}
                  style={{ pointerEvents: idle ? "none" : "auto" }}
                  className="absolute right-0 top-full mt-1 flex items-center gap-1"
                >
                  <button
                    aria-label="Reset timer"
                    onClick={resetTimer}
                    className={`${tinyBtnCls} [&>span]:rotate-[270deg] [&>span]:text-base inline-block`}
                    onMouseDown={sound.unlock}
                    onTouchStart={sound.unlock}
                    onMouseUp={blurTarget}
                    onKeyUp={blurTarget}
                  >
                    <span className="inline-block">↺</span>
                  </button>
                  <button
                    aria-label="Add 1 minute"
                    onClick={() => addTime(60)}
                    className={tinyBtnCls}
                    onMouseDown={sound.unlock}
                    onTouchStart={sound.unlock}
                    onMouseUp={blurTarget}
                    onKeyUp={blurTarget}
                  >
                    +1
                  </button>
                  <button
                    aria-label="Add 5 minutes"
                    onClick={() => addTime(300)}
                    className={tinyBtnCls}
                    onMouseDown={sound.unlock}
                    onTouchStart={sound.unlock}
                    onMouseUp={blurTarget}
                    onKeyUp={blurTarget}
                  >
                    +5
                  </button>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
