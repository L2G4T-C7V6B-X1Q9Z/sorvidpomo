import { motion, AnimatePresence } from "framer-motion";

export default function ModeTag({ mode, isBreak }: { mode: "focus" | "break"; isBreak: boolean }) {
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
