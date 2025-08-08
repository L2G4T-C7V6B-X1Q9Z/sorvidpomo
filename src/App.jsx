import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useAnimationFrame } from "framer-motion";

/* ===================== Dial sizing ===================== */
const SIZE = 440;
const STROKE = 18;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;
const CENTER = SIZE / 2;
const polar = (cx, cy, r, a) => ({ x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) });

/* ===================== Util ===================== */
const fmt = (s) => {
  s = Math.max(0, Math.floor(s));
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
};

/* ===================== Blob Field ===================== */
const SUNSET = [
  { h: 12, s: 88, l: 70 },
  { h: 27, s: 90, l: 72 },
  { h: 323, s: 72, l: 75 },
  { h: 208, s: 78, l: 74 },
];
const grad = (c, a1 = 0.95, a2 = 0.75) =>
  `radial-gradient(circle at 50% 50%, hsla(${c.h},${c.s}%,${c.l}%,${a1}), hsla(${c.h},${c.s}%,${Math.max(
    0, c.l - 10
  )}%,${a2}) 60%, transparent 72%)`;

function BlobField({ count = 6 }) {
  const blobsRef = useRef(
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

      const padX = 1.5, padY = 2.0;
      if (b.x < padX) { b.x = padX; b.vx = Math.abs(b.vx) * 0.96; }
      if (b.x > 100 - padX) { b.x = 100 - padX; b.vx = -Math.abs(b.vx) * 0.96; }
      if (b.y < padY) { b.y = padY; b.vy = Math.abs(b.vy) * 0.96; }
      if (b.y > 100 - padY) { b.y = 100 - padY; b.vy = -Math.abs(b.vy) * 0.96; }

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

/* ===================== App ===================== */
export default function App() {
  // editable durations
  const [focusText, setFocusText] = useState("30");
  const [breakText, setBreakText] = useState("5");
  const focusMin = parseInt(focusText, 10) || 30;
  const breakMin = parseInt(breakText, 10) || 5;

  // state
  const [mode, setMode] = useState("break");
  const [isRunning, setIsRunning] = useState(false);
  const [endAt, setEndAt] = useState(null);
  const [totalSec, setTotalSec] = useState(breakMin * 60);
  const [cycle, setCycle] = useState(1);
  const [now, setNow] = useState(Date.now());
  const [blebs, setBlebs] = useState([]);
  const lastMinuteRef = useRef(Math.floor(totalSec / 60));
  const [lockDuration, setLockDuration] = useState(false);

  // smooth tick every frame while running
  useAnimationFrame(() => {
    if (isRunning && endAt) setNow(Date.now());
  });

  // smooth remaining time (float)
  const remainingFloat = useMemo(
    () => (endAt ? Math.max(0, (endAt - now) / 1000) : totalSec),
    [endAt, now, totalSec]
  );

  // update base total when idle/unlocked and values change
  useEffect(() => {
    if (!isRunning && !lockDuration) {
      const base = (mode === "focus" ? focusMin : breakMin) * 60;
      setTotalSec(base);
      lastMinuteRef.current = Math.floor(base / 60);
    }
  }, [mode, focusMin, breakMin, isRunning, lockDuration]);

  // minute dots (use floored minutes from float time)
  useEffect(() => {
    if (!isRunning || totalSec === 0) return;
    const m = Math.floor(remainingFloat / 60);
    if (m !== lastMinuteRef.current) {
      lastMinuteRef.current = m;
      const frac = totalSec ? remainingFloat / totalSec : 0;
      const angle = (1 - Math.min(1, Math.max(0, frac))) * 2 * Math.PI;
      setBlebs((p) => [...p, { id: `${Date.now()}-${p.length}`, angle }].slice(-140));
    }
  }, [remainingFloat, isRunning, totalSec]);

  // end of session -> auto switch
  useEffect(() => {
    if (!isRunning || endAt === null) return;
    if (remainingFloat <= 0) {
      const next = mode === "focus" ? "break" : "focus";
      const nt = (next === "focus" ? focusMin : breakMin) * 60;
      setMode(next);
      setCycle((c) => (mode === "break" ? c + 1 : c));
      setLockDuration(false);
      setTotalSec(nt);
      lastMinuteRef.current = Math.floor(nt / 60);
      setBlebs([]);
      setEndAt(Date.now() + nt * 1000);
      setNow(Date.now());
    }
  }, [remainingFloat, isRunning, endAt, mode, focusMin, breakMin]);

  // controls
  const togglePlayPause = () => {
    if (!isRunning) {
      setLockDuration(false);
      setEndAt(Date.now() + remainingFloat * 1000);
      setIsRunning(true);
      setNow(Date.now());
    } else {
      const rem = remainingFloat;
      setIsRunning(false);
      setEndAt(null);
      setTotalSec(Math.max(0, Math.floor(rem)));
      setLockDuration(true);
    }
  };

  const skip = () => {
    const next = mode === "focus" ? "break" : "focus";
    const sec = (next === "focus" ? focusMin : breakMin) * 60;
    setMode(next);
    setIsRunning(false);
    setEndAt(null);
    setTotalSec(sec);
    lastMinuteRef.current = Math.floor(sec / 60);
    setBlebs([]);
    setLockDuration(false);
  };

  // theming
  const isBreak = mode === "break";
  const pageBase = isBreak ? "bg-white" : "bg-black";
  const textMain = isBreak ? "text-black/90" : "text-white/90";
  const label = isBreak ? "text-black/60" : "text-white/60";
  const subTx = isBreak ? "text-black/60" : "text-white/60";

  const inputCls = isBreak
    ? "w-20 bg-white text-black rounded-xl px-2.5 py-1.5 outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-black/20 text-center"
    : "w-20 bg-white/10 text-white rounded-xl px-2.5 py-1.5 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/40 text-center";

  const playBtn =
    "w-28 justify-center bg-white text-black font-semibold rounded-xl px-3.5 py-2 active:scale-95 transition-transform flex items-center gap-2";
  const skipBtn = isBreak
    ? "w-24 justify-center px-3 bg-black/10 text-black rounded-xl py-2 backdrop-blur active:scale-95 transition-transform flex items-center gap-2"
    : "w-24 justify-center px-3 bg-white/15 text-white rounded-xl py-2 backdrop-blur active:scale-95 transition-transform flex items-center gap-2";

  // progress fraction uses float for smoothness
  const fraction = Math.min(1, Math.max(0, totalSec ? remainingFloat / totalSec : 0));

  return (
    <div className={`relative ${pageBase}`} style={{ minHeight: "100vh" }}>
      <AnimatePresence>{isBreak && <BlobField key="sunset" />}</AnimatePresence>

      {/* ======= CENTER STACK (title line -> controls line -> dial) ======= */}
      <div className="fixed inset-0 z-10">
        <div className="grid place-items-center h-full">
          <div className="flex flex-col items-center gap-5">
            {/* Pomodoro line (centered) */}
            <div className={`flex items-center justify-center gap-3 flex-wrap ${textMain}`}>
              <span className="text-2xl font-bold tracking-tight">Pomodoro</span>

              {/* cycle/duration chip (rounded box) */}
              <span
                className={`px-3 py-1 rounded-full text-sm border ${
                  isBreak ? "border-black/15 bg-white/70 text-black/80" : "border-white/20 bg-white/10 text-white/80"
                } backdrop-blur`}
              >
                Cycle {cycle} • {focusMin}m
              </span>

              {/* status chip with a SINGLE perfectly centered dot */}
              <span
                className={`px-3 py-1 rounded-full text-xs uppercase tracking-[0.22em] border ${
                  isBreak ? "border-black/15 bg-black/5 text-black/70" : "border-white/20 bg-white/10 text-white/70"
                } flex items-center gap-2`}
              >
                {isBreak ? "Break" : "Focus"}
                {/* the dot is a true circle, centered vertically */}
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" />
                <span>{isRunning ? "Running" : "Idle"}</span>
              </span>
            </div>

            {/* controls — one row (centered) */}
            <div className="flex items-end justify-center gap-3 flex-nowrap">
              <div className="flex flex-col items-center shrink-0">
                <label className={`${label} text-[11px] mb-1`}>Focus (min)</label>
                <input
                  type="number" min={1} max={600}
                  value={focusText}
                  onChange={(e) => setFocusText(e.target.value.replace(/[^0-9]/g, ""))}
                  onBlur={() => setFocusText((v) => (v.trim() === "" ? "30" : String(Math.max(1, Math.min(600, Number(v))))))}
                  className={inputCls} inputMode="numeric"
                />
              </div>
              <div className="flex flex-col items-center shrink-0">
                <label className={`${label} text-[11px] mb-1`}>Break (min)</label>
                <input
                  type="number" min={1} max={600}
                  value={breakText}
                  onChange={(e) => setBreakText(e.target.value.replace(/[^0-9]/g, ""))}
                  onBlur={() => setBreakText((v) => (v.trim() === "" ? "5" : String(Math.max(1, Math.min(600, Number(v))))))}
                  className={inputCls} inputMode="numeric"
                />
              </div>

              <button onClick={togglePlayPause} className={playBtn}>
                <span aria-hidden className="text-sm">{isRunning ? "❚❚" : "▶"}</span>
                <span>{isRunning ? "Pause" : "Play"}</span>
              </button>

              <button onClick={skip} className={skipBtn}>
                <span aria-hidden className="text-sm">⏭</span>
                <span>Skip</span>
              </button>
            </div>

            {/* dial */}
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

                {/* base + progress (start at north, clockwise) */}
                <g transform={`translate(${CENTER}, ${CENTER}) rotate(-90)`}>
                  <circle
                    r={R} cx={0} cy={0}
                    stroke={isBreak ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.16)"}
                    strokeWidth={STROKE} fill="none"
                  />
                  <motion.circle
                    r={R} cx={0} cy={0}
                    stroke={isBreak ? "rgba(0,0,0,0.96)" : "rgba(255,255,255,0.97)"}
                    strokeWidth={STROKE} strokeLinecap="round" fill="none"
                    filter="url(#ringGlow)"
                    strokeDasharray={`${CIRC * fraction} ${CIRC}`}
                    animate={{ pathLength: Math.max(0.001, fraction) }}
                    transition={{ type: "tween", ease: "linear", duration: 0.05 }}
                  />
                </g>
              </svg>

              {/* minute dots */}
              <div className="absolute inset-0">
                {blebs.map((b) => {
                  const h = polar(CENTER, CENTER, R - STROKE / 2, b.angle);
                  const out = polar(CENTER, CENTER, R - STROKE / 2 + 10, b.angle);
                  return (
                    <motion.div
                      key={b.id}
                      initial={{ x: h.x, y: h.y, scale: 0.2, opacity: 0 }}
                      animate={{ x: out.x, y: out.y, scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 22 }}
                      className="absolute"
                      style={{
                        width: 8, height: 8, borderRadius: 9999,
                        transform: "translate(-50%, -50%)",
                        background: isBreak ? "rgba(0,0,0,0.88)" : "rgba(255,255,255,0.96)",
                        boxShadow: isBreak
                          ? "0 0 10px rgba(0,0,0,0.25), 0 0 20px rgba(0,0,0,0.15)"
                          : "0 0 12px rgba(255,255,255,0.60), 0 0 18px rgba(255,255,255,0.35)",
                      }}
                    />
                  );
                })}
              </div>

              {/* time + label */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <motion.div
                    key={`t-${Math.floor(remainingFloat)}`}
                    initial={{ scale: 0.985, opacity: 0.7 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 420, damping: 28 }}
                    className={`${isBreak ? "text-black" : "text-white"} text-6xl md:text-7xl font-bold tabular-nums text-center`}
                  >
                    {fmt(remainingFloat)}
                  </motion.div>
                </div>
                <motion.div
                  key={`lbl-${mode}`}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 320, damping: 22 }}
                  className={`${isBreak ? "text-black/60" : "text-white/70"} absolute left-1/2 -translate-x-1/2`}
                  style={{ top: "calc(50% - 72px)" }}
                >
                  <span className="text-[11px] uppercase tracking-[0.22em]">
                    {isBreak ? "Break" : "Focus"}
                  </span>
                </motion.div>
              </div>
            </div>
            {/* ===== end dial ===== */}
          </div>
        </div>
      </div>
    </div>
  );
}
