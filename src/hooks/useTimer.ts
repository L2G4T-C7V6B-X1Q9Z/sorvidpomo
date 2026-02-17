import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAnimationFrame } from "framer-motion";
import { sound } from "../audio/SoundEngine";
import { fmt } from "../components/AnimatedTime";
import { type Mode } from "../types";

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const onlyDigits = (s: string) => s.replace(/\D+/g, "");
const normalizeMinutes = (raw: string, fallback: number) => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return String(fallback);
  return String(Math.max(1, Math.min(600, Math.floor(n))));
};

export function useTimer() {
  // duration text state (with localStorage)
  const [focusText, setFocusText] = useState(() => {
    const saved = localStorage.getItem("focusMinutes");
    return saved ? normalizeMinutes(saved, 30) : "30";
  });
  const [breakText, setBreakText] = useState(() => {
    const saved = localStorage.getItem("breakMinutes");
    return saved ? normalizeMinutes(saved, 5) : "5";
  });
  const focusMin = parseInt(focusText, 10) || 30;
  const breakMin = parseInt(breakText, 10) || 5;

  useEffect(() => { localStorage.setItem("focusMinutes", String(focusMin)); }, [focusMin]);
  useEffect(() => { localStorage.setItem("breakMinutes", String(breakMin)); }, [breakMin]);

  // mode/cycle
  const [mode, setMode] = useState<Mode>("focus");
  const [cycle, setCycle] = useState(1);

  // timing state
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [pausedSec, setPausedSec] = useState(focusMin * 60);
  const [totalSec, setTotalSec] = useState(focusMin * 60);
  const [now, setNow] = useState(Date.now());
  const [timeBump, setTimeBump] = useState(0);
  const [justCompleted, setJustCompleted] = useState(false);

  // refs for sound/completion tracking
  const lastSecondRef = useRef<number | null>(null);
  const completedRef = useRef<number | null>(null);
  const lastKeyRef = useRef<string>("");
  const resetBeepRefs = useCallback(() => {
    lastSecondRef.current = null;
    completedRef.current = null;
  }, []);

  // throttled animation frame tick (~20fps)
  const lastTick = useRef(0);
  useAnimationFrame((t) => {
    if (!isRunning || !endAt) return;
    if (t - lastTick.current < 50) return;
    lastTick.current = t;
    setNow(Date.now());
  });

  // background tick (keeps running when tab hidden)
  useEffect(() => {
    if (!isRunning || endAt === null) return;
    let id: number;
    const tick = () => { setNow(Date.now()); id = window.setTimeout(tick, 1000); };
    id = window.setTimeout(tick, 1000);
    return () => clearTimeout(id);
  }, [isRunning, endAt]);

  // resume audio on tab focus
  useEffect(() => {
    const resume = () => { sound.unlock(); setNow(Date.now()); };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("focus", resume);
    return () => {
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("focus", resume);
    };
  }, []);

  // remaining time
  const remaining = useMemo(
    () => (endAt ? Math.max(0, (endAt - now) / 1000) : pausedSec),
    [endAt, now, pausedSec]
  );
  const fracRemaining = clamp01(totalSec ? remaining / totalSec : 0);

  // 5-second countdown beeps
  useEffect(() => {
    if (!isRunning || endAt === null) return;
    const secLeft = Math.ceil(remaining);
    if (secLeft <= 5 && secLeft > 0 && secLeft !== lastSecondRef.current) {
      sound.play("tick");
      lastSecondRef.current = secLeft;
    }
    if (remaining <= 0 && completedRef.current !== endAt) {
      const next: Mode = mode === "focus" ? "break" : "focus";
      sound.play("complete", next);
      completedRef.current = endAt;
    }
  }, [remaining, isRunning, endAt, mode]);

  // reset when idle and duration changes
  useEffect(() => {
    if (isRunning) return;
    const key = `${mode}-${focusMin}-${breakMin}`;
    if (key !== lastKeyRef.current) {
      const base = (mode === "focus" ? focusMin : breakMin) * 60;
      setTotalSec(base);
      setPausedSec(base);
      lastKeyRef.current = key;
    }
  }, [mode, focusMin, breakMin, isRunning]);

  // auto-switch sessions
  useEffect(() => {
    if (!isRunning || endAt === null) return;
    if (remaining <= 0) {
      const next: Mode = mode === "focus" ? "break" : "focus";
      const nt = (next === "focus" ? focusMin : breakMin) * 60;
      setMode(next);
      setCycle((c) => (mode === "break" ? c + 1 : c));
      setTotalSec(nt);
      setPausedSec(nt);
      const newEnd = Date.now() + nt * 1000;
      setEndAt(newEnd);
      setNow(newEnd - nt * 1000);
      lastKeyRef.current = `${next}-${focusMin}-${breakMin}`;
      resetBeepRefs();
      setJustCompleted(true);
      window.setTimeout(() => setJustCompleted(false), 1500);
    }
  }, [remaining, isRunning, endAt, mode, focusMin, breakMin, resetBeepRefs]);

  // document title
  useEffect(() => {
    const modeLabel = mode === "focus" ? "Focus" : "Break";
    document.title = `${fmt(remaining)} - ${modeLabel}`;
  }, [remaining, mode]);

  // controls - ALL wrapped in useCallback for stability
  const playPause = useCallback(async () => {
    await sound.unlock();
    sound.play("click");
    if (!isRunning) {
      setHasStarted(true);
      let rem: number;
      if (endAt && endAt > Date.now()) {
        rem = (endAt - Date.now()) / 1000;
      } else {
        rem = pausedSec;
      }
      if (rem < 0.5) rem = pausedSec || totalSec || 60;
      const newEnd = Date.now() + rem * 1000;
      setEndAt(newEnd);
      setIsRunning(true);
      setNow(Date.now());
      resetBeepRefs();
    } else {
      const rem = Math.max(0, endAt ? (endAt - Date.now()) / 1000 : pausedSec);
      setIsRunning(false);
      setEndAt(null);
      setPausedSec(rem);
      resetBeepRefs();
    }
  }, [isRunning, endAt, pausedSec, totalSec, resetBeepRefs]);

  const skip = useCallback(async () => {
    await sound.unlock();
    sound.play("click");
    setJustCompleted(false);
    const next: Mode = mode === "focus" ? "break" : "focus";
    const sec = (next === "focus" ? focusMin : breakMin) * 60;
    setMode(next);
    setIsRunning(false);
    setEndAt(null);
    setTotalSec(sec);
    setPausedSec(sec);
    resetBeepRefs();
  }, [mode, focusMin, breakMin, resetBeepRefs]);

  const resetTimer = useCallback(async () => {
    await sound.unlock();
    sound.play("click");
    const sec = (mode === "focus" ? focusMin : breakMin) * 60;
    setIsRunning(false);
    setEndAt(null);
    setTotalSec(sec);
    setPausedSec(sec);
    resetBeepRefs();
    lastKeyRef.current = `${mode}-${focusMin}-${breakMin}`;
    setTimeBump((k) => k + 1);
  }, [mode, focusMin, breakMin, resetBeepRefs]);

  const addTime = useCallback(async (sec: number) => {
    if (sec <= 0) return;
    await sound.unlock();
    sound.play("click");
    setTotalSec((t) => t + sec);
    if (isRunning && endAt) {
      setEndAt(endAt + sec * 1000);
      resetBeepRefs();
    } else if (!isRunning) {
      setPausedSec((s) => s + sec);
    }
    setTimeBump((k) => k + 1);
  }, [isRunning, endAt, resetBeepRefs]);

  // input helpers
  const handleFocusTextChange = useCallback((v: string) => setFocusText(onlyDigits(v)), []);
  const handleBreakTextChange = useCallback((v: string) => setBreakText(onlyDigits(v)), []);
  const normalizeFocus = useCallback(() => setFocusText((v) => (v.trim() === "" ? "30" : normalizeMinutes(v, 30))), []);
  const normalizeBreak = useCallback(() => setBreakText((v) => (v.trim() === "" ? "5" : normalizeMinutes(v, 5))), []);

  return {
    // duration
    focusText, breakText, focusMin, breakMin,
    handleFocusTextChange, handleBreakTextChange, normalizeFocus, normalizeBreak,
    // mode
    mode, cycle,
    // state
    isRunning, hasStarted, justCompleted, timeBump,
    // time
    remaining, fracRemaining,
    // actions
    playPause, skip, resetTimer, addTime,
  };
}
