import { useState, useEffect, useRef } from "react";

export function useIdle(timeout = 3000): boolean {
  const [idle, setIdle] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => {
    const reset = () => {
      setIdle(false);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setIdle(true), timeout);
    };
    window.addEventListener("mousemove", reset);
    window.addEventListener("touchstart", reset);
    reset();
    return () => {
      window.removeEventListener("mousemove", reset);
      window.removeEventListener("touchstart", reset);
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [timeout]);
  return idle;
}
