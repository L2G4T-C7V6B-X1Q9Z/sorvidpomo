import React, { useEffect, useRef } from "react";
import { useAnimationFrame } from "framer-motion";

type Dot = { x: number; y: number; size: number; base: number };

export default function DotField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const spriteRef = useRef<HTMLCanvasElement>();

  // create dot sprite
  useEffect(() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const g = c.getContext("2d");
    if (!g) return;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    spriteRef.current = c;
  }, []);

  // generate clustered dots
  useEffect(() => {
    const clusters = Array.from({ length: 7 }, () => ({ x: Math.random(), y: Math.random() }));
    const dots: Dot[] = [];
    clusters.forEach((c) => {
      const n = 18 + Math.floor(Math.random() * 16);
      for (let i = 0; i < n; i++) {
        const ang = Math.random() * Math.PI * 2;
        const rad = Math.pow(Math.random(), 1.6) * 0.12;
        dots.push({
          x: c.x + Math.cos(ang) * rad,
          y: c.y + Math.sin(ang) * rad,
          size: 1 + Math.random() * 2,
          base: 0.02 + Math.random() * 0.06,
        });
      }
    });
    for (let i = 0; i < 30; i++) {
      dots.push({
        x: Math.random(),
        y: Math.random(),
        size: 1 + Math.random() * 2,
        base: 0.02 + Math.random() * 0.06,
      });
    }
    dotsRef.current = dots.filter((d) => d.x >= 0 && d.x <= 1 && d.y >= 0 && d.y <= 1);
  }, []);

  // resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
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
    const ctx = canvas?.getContext("2d");
    const sprite = spriteRef.current;
    if (!canvas || !ctx || !sprite) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);

    const w1 = t * 0.00002;
    const w2 = t * 0.00004;
    const ang = 0.6;
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);

    dotsRef.current.forEach((d) => {
      const x = d.x * width;
      const y = d.y * height;
      const wave1 = 0.25 * (1 + Math.cos((x / width) * 2 * Math.PI + w1));
      const wave2 = 0.2 * (1 + Math.cos(((x * ca + y * sa) / width) * 2 * Math.PI + w2));
      const alpha = Math.min(0.8, d.base + wave1 + wave2);
      ctx.globalAlpha = alpha;
      const s = d.size * 6; // convert to pixels
      ctx.drawImage(sprite, x - s / 2, y - s / 2, s, s);
    });

    ctx.globalAlpha = 1;
  });

  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(0,0,0,0.4))",
        }}
      />
    </div>
  );
}

