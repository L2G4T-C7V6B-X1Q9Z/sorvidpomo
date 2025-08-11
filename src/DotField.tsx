import React, { useEffect, useRef } from "react";
import { useAnimationFrame } from "framer-motion";

type Dot = {
  x: number;
  y: number;
  r: number;
  base: number;
  amp1: number;
  amp2: number;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function makeDot(x: number, y: number): Dot {
  return {
    x,
    y,
    r: 0.6 + Math.random() * 1.1,
    base: 0.02 + Math.random() * 0.05,
    amp1: 0.08 + Math.random() * 0.12,
    amp2: 0.1 + Math.random() * 0.14,
  };
}

function generateDots(): Dot[] {
  const dots: Dot[] = [];
  const centers: { x: number; y: number }[] = [];
  while (centers.length < 8) {
    const cx = Math.random();
    const cy = Math.random();
    if (centers.every((c) => Math.hypot(c.x - cx, c.y - cy) > 0.18)) {
      centers.push({ x: cx, y: cy });
    }
  }

  centers.forEach((c) => {
    const count = 12 + Math.floor(Math.random() * 18);
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = (Math.random() * 0.04 + 0.015) * (Math.random() < 0.6 ? 1 : 1.8);
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist * 0.6;
      dots.push(makeDot(clamp01(c.x + dx), clamp01(c.y + dy)));
    }
  });

  for (let i = 0; i < 25; i++) {
    dots.push(makeDot(Math.random(), Math.random()));
  }

  return dots;
}

export default function DotField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handle = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      dotsRef.current = generateDots();
    };
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, [dpr]);

  useAnimationFrame((t) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width: w, height: h } = canvas;
    ctx.clearRect(0, 0, w, h);

    const time1 = (t / 1000) * 0.2;
    const time2 = (t / 1000) * 0.27;

    dotsRef.current.forEach((d) => {
      const px = d.x * w;
      const py = d.y * h;
      const w1 = 0.5 + 0.5 * Math.sin(d.x * 2 - time1);
      const w2 = 0.5 + 0.5 * Math.sin(d.x * 4 + d.y * 5 - time2);
      const b = Math.min(1, d.base + w1 * d.amp1 + w2 * d.amp2);
      const r = d.r * dpr;
      const g = ctx.createRadialGradient(px, py, 0, px, py, r * 3);
      g.addColorStop(0, `rgba(255,255,255,${b})`);
      g.addColorStop(1, `rgba(255,255,255,0)`);
      ctx.fillStyle = g;
      ctx.fillRect(px - r * 3, py - r * 3, r * 6, r * 6);
    });
  });

  return (
    <div className="absolute inset-0 -z-10 pointer-events-none">
      <canvas ref={canvasRef} />
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.6) 100%)",
        }}
      />
    </div>
  );
}
