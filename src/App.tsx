import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BlobField from "./components/BlobField";
import AnimatedTime from "./components/AnimatedTime";
import ModeTag from "./components/ModeTag";
import { PlayIcon, PauseIcon, SkipIcon, FullscreenIcon, ExitFullscreenIcon, VolumeIcon, MuteIcon } from "./components/Icons";
import { useTimer } from "./hooks/useTimer";
import { useIdle } from "./hooks/useIdle";
import { useFullscreen } from "./hooks/useFullscreen";
import { sound } from "./audio/SoundEngine";

/* Dial geometry */
const SIZE = 440;
const STROKE = 18;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;
const CENTER = SIZE / 2;

export default function App() {
  const timer = useTimer();
  const idle = useIdle();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const [muted, setMuted] = useState(false);

  // sync mute to sound engine
  useEffect(() => { sound.setMuted(muted); }, [muted]);

  // fullscreen keyboard shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
      const key = e.key.toLowerCase();
      if (key === "f") { e.preventDefault(); toggleFullscreen(); }
      else if (key === "escape" && document.fullscreenElement) { document.exitFullscreen().catch(() => {}); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggleFullscreen]);

  // spacebar shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON" || target.isContentEditable) return;
      }
      if (e.repeat) return;
      e.preventDefault();
      timer.playPause();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [timer.playPause]);

  const blurTarget = (e: React.SyntheticEvent<HTMLButtonElement>) => e.currentTarget.blur();

  // theming
  const isBreak = timer.mode === "break";
  const logoColor = idle
    ? isBreak ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.16)"
    : isBreak ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.9)";
  const label = isBreak ? "text-black/60" : "text-white/60";

  // unified chip sizing
  const CONTROL_W = "w-20";
  const CONTROL_H = "h-9";

  const inputRing = isBreak
    ? "ring-1 ring-black/10 focus:ring-2 focus:ring-black/20"
    : "ring-1 ring-white/10 focus:ring-2 focus:ring-white/30";
  const surface = isBreak ? "bg-black/12 text-black backdrop-blur-md" : "bg-white/10 text-white backdrop-blur-md";
  const inputCls = `${CONTROL_W} ${CONTROL_H} leading-none rounded-xl px-2 text-center outline-none ${inputRing} ${surface} transition-all duration-500`;
  const btnCls = `rounded-xl ${CONTROL_W} ${CONTROL_H} flex items-center justify-center ${surface} select-none active:scale-95 transition-all duration-500 outline-none focus:outline-none focus:ring-0`;
  const tinyBtnCls = `rounded-lg w-8 h-8 flex items-center justify-center text-xs ${surface} select-none active:scale-95 transition-all duration-500 outline-none focus:outline-none focus:ring-0`;

  const controlsAnchorTop = `calc(25vh - ${SIZE / 4}px)`;
  const showStoppedWarning = timer.hasStarted && !timer.isRunning;

  return (
    <div className={`relative${idle ? " cursor-none" : ""}`} style={{ height: "100vh", overflow: "hidden", backgroundColor: isBreak ? "#ffffff" : "#000000", transition: "background-color 0.8s ease" }}>

      {/* BREAK: blobs */}
      <AnimatePresence>
        {isBreak && (
          <motion.div
            key="blob-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0 z-0"
          >
            <BlobField />
          </motion.div>
        )}
      </AnimatePresence>

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
            <motion.div
              className="-mb-1"
              animate={{ color: logoColor }}
              transition={{ duration: 0.6 }}
            >
              <a
                href="https://github.com/l2g4t-c7v6b-x1q9z/sorvidpomo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-3xl md:text-4xl font-extrabold tracking-tight"
              >
                Pomodoro
              </a>
            </motion.div>

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
                  value={timer.focusText}
                  onChange={(e) => timer.handleFocusTextChange(e.target.value)}
                  onBlur={timer.normalizeFocus}
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
                  value={timer.breakText}
                  onChange={(e) => timer.handleBreakTextChange(e.target.value)}
                  onBlur={timer.normalizeBreak}
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
                aria-label={timer.isRunning ? "Pause" : "Play"}
                onClick={timer.playPause}
                className={btnCls}
                onMouseDown={sound.unlock}
                onTouchStart={sound.unlock}
                onMouseUp={blurTarget}
                onKeyUp={blurTarget}
              >
                {timer.isRunning ? <PauseIcon /> : <PlayIcon />}
              </button>
              <button
                aria-label="Skip"
                onClick={timer.skip}
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
                  style={{ transition: "stroke 0.8s ease" }}
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
                  style={{ transition: "stroke 0.8s ease" }}
                  strokeDasharray={`${CIRC * Math.max(0.001, timer.fracRemaining)} ${CIRC}`}
                  animate={{ pathLength: Math.max(0.001, timer.fracRemaining) }}
                  transition={{ type: "tween", ease: "linear", duration: 0.05 }}
                />
              </g>
            </svg>

            {/* Warning + MODE tag ABOVE time */}
            <div
              className="absolute pointer-events-none"
              style={{ left: "50%", top: "50%", transform: "translate(-50%, -60px)" }}
            >
              <ModeTag mode={timer.mode} isBreak={isBreak} />
              <AnimatePresence>
                {timer.justCompleted && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className="absolute left-full ml-2 top-1/2 -translate-y-1/2 text-green-500"
                  >
                    &#10003;
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {showStoppedWarning && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-1/2 bottom-full mb-1 -translate-x-1/2 flex items-center whitespace-nowrap text-[13px] font-bold text-red-500"
                  >
                    <span className="mr-1">&#9888;</span>
                    <span>timer stopped.</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Centered time and add buttons */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <motion.div
                  key={timer.timeBump}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="pointer-events-none"
                >
                  <AnimatedTime value={timer.remaining} dark={!isBreak} />
                </motion.div>
                <motion.div
                  animate={{ opacity: idle ? 0 : 1 }}
                  transition={{ duration: 0.2 }}
                  style={{ pointerEvents: idle ? "none" : "auto" }}
                  className="absolute right-0 top-full mt-1 flex items-center gap-1"
                >
                  <button
                    aria-label="Reset timer"
                    onClick={timer.resetTimer}
                    className={`${tinyBtnCls} [&>span]:rotate-[270deg] [&>span]:text-base inline-block`}
                    onMouseDown={sound.unlock}
                    onTouchStart={sound.unlock}
                    onMouseUp={blurTarget}
                    onKeyUp={blurTarget}
                  >
                    <span className="inline-block">&#8634;</span>
                  </button>
                  <button
                    aria-label="Add 1 minute"
                    onClick={() => timer.addTime(60)}
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
                    onClick={() => timer.addTime(300)}
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
