import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const fmt = (s: number) => {
  s = Math.max(0, Math.floor(s));
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
};

export default function AnimatedTime({ value, dark }: { value: number; dark: boolean }) {
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
