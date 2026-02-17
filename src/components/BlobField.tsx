import { useRef, useState } from "react";
import { useAnimationFrame } from "framer-motion";
import { type Hsl } from "../types";

const SUNSET: Hsl[] = [
  { h: 12, s: 88, l: 70 },
  { h: 27, s: 90, l: 72 },
  { h: 323, s: 72, l: 75 },
  { h: 208, s: 78, l: 74 },
];

// Opaque gradient with soft edge — the frosted veil blurs everything in one pass
const grad = (c: Hsl) =>
  `radial-gradient(circle at 50% 50%, hsla(${c.h},${c.s}%,${c.l}%,0.9), hsla(${c.h},${c.s}%,${Math.max(0, c.l - 8)}%,0.7) 50%, transparent 72%)`;

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

export default function BlobField({ count = 5 }: { count?: number }) {
  const blobCount = typeof window !== "undefined" && window.innerWidth < 768
    ? Math.min(count, 3)
    : count;

  const blobsRef = useRef<Blob[]>(
    Array.from({ length: count }, (_, i) => {
      const c = SUNSET[i % SUNSET.length];
      return {
        c,
        grad: grad(c),
        x: 10 + Math.random() * 80,
        y: 10 + Math.random() * 80,
        s: 1.0 + Math.random() * 0.4,
        vx: (Math.random() - 0.5) * 0.03,
        vy: (Math.random() - 0.5) * 0.03,
        phase: Math.random() * Math.PI * 2,
        wobble: 0.0002 + Math.random() * 0.00012,
      };
    })
  );

  const [, force] = useState(0);
  const last = useRef(performance.now());
  const lastDraw = useRef(0);

  useAnimationFrame((t) => {
    const rawDt = t - last.current;
    last.current = t;
    const dt = Math.min(rawDt, 100);

    blobsRef.current.forEach((b, idx) => {
      const turn = Math.sin(t * 0.00004 + idx * 0.7) * 0.0012;
      b.vx += turn * 0.02;
      b.vy += Math.cos(t * 0.000035 + idx) * 0.0012;

      const cap = 0.03;
      b.vx = Math.max(-cap, Math.min(cap, b.vx));
      b.vy = Math.max(-cap, Math.min(cap, b.vy));

      b.x += b.vx * 0.5;
      b.y += b.vy * 0.5;

      const pad = 10;
      if (b.x < pad) { b.x = pad; b.vx = Math.abs(b.vx) * 0.9; }
      if (b.x > 100 - pad) { b.x = 100 - pad; b.vx = -Math.abs(b.vx) * 0.9; }
      if (b.y < pad) { b.y = pad; b.vy = Math.abs(b.vy) * 0.9; }
      if (b.y > 100 - pad) { b.y = 100 - pad; b.vy = -Math.abs(b.vy) * 0.9; }

      b.phase += b.wobble * dt;
    });

    // ~20fps — plenty for slowly drifting blobs
    if (t - lastDraw.current > 50) {
      lastDraw.current = t;
      force((n) => (n + 1) % 1e6);
    }
  });

  return (
    <div
      className="absolute pointer-events-none overflow-hidden z-0"
      style={{ inset: "-200px" }}
    >
      {blobsRef.current.slice(0, blobCount).map((b, i) => {
        const sp = Math.sin(b.phase);
        const cp = Math.cos(b.phase + 1.2);
        const r1 = 40 + 18 * sp;
        const r2 = 60 - 16 * cp;
        const r3 = 45 + 20 * Math.sin(b.phase + 2.0);
        const r4 = 55 - 14 * Math.cos(b.phase + 2.8);

        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: 0,
              top: 0,
              transform: `translate(calc(${b.x}vw - 50%), calc(${b.y}vh - 50%)) scale(${b.s})`,
              willChange: "transform",
              width: "80vw",
              height: "80vw",
              background: b.grad,
              borderRadius: `${r1}% ${r2}% ${r3}% ${r4}%`,
              opacity: 0.92,
            }}
          />
        );
      })}
      {/* Single backdrop-filter blurs ALL blobs in one GPU pass (vs. 6 individual blur filters before) */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: 0,
          background: "rgba(255,255,255,0.32)",
          backdropFilter: "blur(44px) saturate(1.05)",
          WebkitBackdropFilter: "blur(44px) saturate(1.05)",
        }}
      />
    </div>
  );
}
