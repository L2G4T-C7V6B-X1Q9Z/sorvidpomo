import { useRef, useState } from "react";
import { useAnimationFrame } from "framer-motion";
import { type Hsl } from "../types";

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
  grad: string;
  x: number;
  y: number;
  s: number;
  vx: number;
  vy: number;
  phase: number;
  wobble: number;
};

export default function BlobField({ count = 6 }: { count?: number }) {
  // Reduce blob count on mobile to save CPU
  const blobCount = typeof window !== "undefined" && window.innerWidth < 768
    ? Math.min(count, 3)
    : count;

  const blobsRef = useRef<Blob[]>(
    Array.from({ length: count }, (_, i) => {
      const c = SUNSET[i % SUNSET.length];
      return {
        c,
        grad: grad(c),
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
  const lastDraw = useRef(0);

  useAnimationFrame((t) => {
    const rawDt = t - last.current;
    last.current = t;
    // Cap deltaTime to 100ms to prevent teleporting after tab switch
    const dt = Math.min(rawDt, 100);

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

    // Throttle re-rendering to ~30fps to reduce CPU usage
    if (t - lastDraw.current > 33) {
      lastDraw.current = t;
      force((n) => (n + 1) % 1e6);
    }
  });

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {blobsRef.current.slice(0, blobCount).map((b, i) => {
        // Precompute sin/cos values for shape morphing
        const sp0 = Math.sin(b.phase);
        const cp1 = Math.cos(b.phase + 0.8);
        const sp2 = Math.sin(b.phase + 1.6);
        const cp3 = Math.cos(b.phase + 2.2);

        const r1 = 38 + 24 * sp0;
        const r2 = 62 - 22 * cp1;
        const r3 = 44 + 26 * sp2;
        const r4 = 56 - 20 * cp3;
        const e1 = 36 + 22 * Math.cos(b.phase + 0.4);
        const e2 = 48 - 20 * Math.sin(b.phase + 1.2);
        const e3 = 60 + 18 * Math.cos(b.phase + 1.9);
        const e4 = 64 - 22 * Math.sin(b.phase + 2.8);

        return (
          <div
            key={i}
            className="absolute"
            style={{
              // Use transform for position instead of top/left — GPU composited, no layout thrash
              left: 0,
              top: 0,
              transform: `translate(calc(${b.x}vw - 50%), calc(${b.y}vh - 50%)) scale(${b.s})`,
              willChange: "transform",
              width: "62vw",
              height: "62vw",
              background: b.grad,
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
