import React, { useEffect, useRef } from "react";
import { useAnimationFrame } from "framer-motion";

// Small utility for easing (smoothstep)
const ease = (t: number) => t * t * (3 - 2 * t);

interface Dot {
  x: number; // 0-1
  y: number; // 0-1
  r: number; // radius relative to min(width,height)
  base: number; // baseline brightness 0-1
}

function generateDots() {
  const dots: Dot[] = [];
  const clusterCount = 12;
  for (let i = 0; i < clusterCount; i++) {
    const cx = Math.random();
    const cy = Math.random();
    const angle = Math.random() * Math.PI * 2;
    const chainLen = 0.04 + Math.random() * 0.04; // length of stretched chain
    const chainWidth = 0.015 + Math.random() * 0.015;
    const count = 6 + Math.floor(Math.random() * 10);
    for (let j = 0; j < count; j++) {
      const along = (Math.random() - 0.5) * chainLen;
      const off = (Math.random() - 0.5) * chainWidth;
      let x = cx + along * Math.cos(angle) - off * Math.sin(angle);
      let y = cy + along * Math.sin(angle) + off * Math.cos(angle);
      if (x < 0 || x > 1 || y < 0 || y > 1) {
        j--;
        continue;
      }
      const base = 0.02 + Math.random() * 0.05;
      const r = 0.0006 + Math.random() * 0.0012;
      dots.push({ x, y, r, base });
    }
  }
  // stray dots between clusters
  for (let i = 0; i < 40; i++) {
    dots.push({
      x: Math.random(),
      y: Math.random(),
      r: 0.0006 + Math.random() * 0.001,
      base: 0.015 + Math.random() * 0.04,
    });
  }
  return dots;
}

export default function DotField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>(generateDots());

  useEffect(() => {
    const canvas = canvasRef.current!;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
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
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    const time = t / 1000;
    const pos1 = (time / 40) % 1; // slow sweep left to right
    const pos2 = (time / 23) % 1; // second angled pattern
    const angle = 0.35 * Math.PI; // slight angle for second pattern
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    dotsRef.current.forEach((d) => {
      const nx = d.x;
      const ny = d.y;

      // wide, slow sweep
      const dx1 = ((nx - pos1 + 1.5) % 1) - 0.5;
      const w1 = ease(Math.max(0, 1 - Math.abs(dx1) / 0.45)) * 0.07;

      // finer angled bands
      const proj = nx * cos + ny * sin;
      const dx2 = ((proj - pos2 + 1.5) % 1) - 0.5;
      const w2 = ease(Math.max(0, 1 - Math.abs(dx2) / 0.18)) * 0.05;

      const b = Math.min(1, d.base + w1 + w2);
      const radius = d.r * Math.min(w, h);
      const x = nx * w;
      const y = ny * h;

      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius * 3);
      grad.addColorStop(0, `rgba(255,255,255,${b})`);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius * 3, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 vignette">
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
