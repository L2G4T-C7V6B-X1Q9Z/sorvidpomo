import { useEffect, useRef } from "react";
import { useAnimationFrame } from "framer-motion";

interface Dot {
  x: number;
  y: number;
  r: number;
  base: number;
}

function randn() {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function generateDots(count = 220): Dot[] {
  const dots: Dot[] = [];
  const clusters = 7;
  for (let i = 0; i < clusters; i++) {
    const cx = 0.1 + Math.random() * 0.8;
    const cy = 0.1 + Math.random() * 0.8;
    const spread = 0.04 + Math.random() * 0.06;
    const n = Math.floor(count / clusters + Math.random() * 6);
    for (let j = 0; j < n; j++) {
      const dx = randn() * spread;
      const dy = randn() * spread * 0.6;
      dots.push({
        x: Math.min(1, Math.max(0, cx + dx)),
        y: Math.min(1, Math.max(0, cy + dy)),
        r: 0.6 + Math.random() * 0.8,
        base: 0.04 + Math.random() * 0.08,
      });
    }
  }
  for (let i = 0; i < 20; i++) {
    dots.push({
      x: Math.random(),
      y: Math.random(),
      r: 0.6 + Math.random() * 0.8,
      base: 0.04 + Math.random() * 0.08,
    });
  }
  return dots;
}

export default function FocusField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>(generateDots());
  const size = useRef({ w: 0, h: 0, d: 1 });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      size.current = { w, h, d: dpr };
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useAnimationFrame((t) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { w, h, d } = size.current;
    ctx.clearRect(0, 0, w * d, h * d);
    const t1 = t * 0.00002;
    const t2 = t * 0.00005;

    for (const dot of dotsRef.current) {
      const x = dot.x;
      const y = dot.y;
      const wave1 = 0.5 + 0.5 * Math.sin(x * 2 * Math.PI + t1);
      const wave2 = 0.5 + 0.5 * Math.sin(x * 6 + y * 8 + t2);
      let a = dot.base + 0.4 * wave1 + 0.3 * wave2 + 0.3 * wave1 * wave2;
      a = Math.min(1, a);
      const px = x * w * d;
      const py = y * h * d;
      const r = dot.r * d;
      const g = ctx.createRadialGradient(px, py, 0, px, py, r * 2);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(px - r * 2, py - r * 2, r * 4, r * 4);
    }

    const edge = ctx.createRadialGradient((w * d) / 2, (h * d) / 2, 0, (w * d) / 2, (h * d) / 2, Math.max(w, h) * d * 0.7);
    edge.addColorStop(0, "rgba(0,0,0,0)");
    edge.addColorStop(1, "rgba(0,0,0,0.7)");
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, w * d, h * d);
  });

  return <canvas ref={canvasRef} className="absolute inset-0 -z-10 pointer-events-none" />;
}
