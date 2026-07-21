"use client";

import { useEffect, useRef, useState } from "react";
import { getQTime, setQTime, clearQTime } from "@/lib/qprogress";

// Per-question stopwatch: how long did THIS question take?
//
// Press ⏱ to start, then answer — answering stops it and the time freezes so you
// can read it. It is opt-in per question because most of the time you are
// browsing, not timing yourself, and a clock that starts itself on every card
// would just be noise.
//
// Two things it now does that it did not:
//
//   It PERSISTS. The time is written to lib/qprogress under the same key qstats
//   uses, so refreshing the page shows what the question took you last time
//   instead of resetting to an untouched ⏱.
//
//   A stopped clock is CLICKABLE. It used to render a <span>, so there was
//   nothing to press — tapping it does the obvious thing now: throws the old
//   time away, starts again from zero, and tells the card to clear your answer
//   so the question is genuinely re-attemptable.
export default function QTimer({ q, answered = false, onRestart, className = "" }) {
  const [startedAt, setStartedAt] = useState(null); // ms; null = not running
  const [elapsed, setElapsed] = useState(0);        // seconds
  const [stopped, setStopped] = useState(false);
  const tick = useRef(null);

  // A time from a previous visit shows straight away, already stopped.
  useEffect(() => {
    const saved = getQTime(q);
    if (saved > 0) { setElapsed(saved); setStopped(true); }
  }, [q]);

  useEffect(() => {
    if (startedAt === null || stopped) return undefined;
    tick.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 250);
    return () => clearInterval(tick.current);
  }, [startedAt, stopped]);

  // Answering stops it — but only if it was running, and only once.
  useEffect(() => {
    if (!answered || startedAt === null || stopped) return;
    const secs = Math.floor((Date.now() - startedAt) / 1000);
    setElapsed(secs);
    setStopped(true);
    setQTime(q, secs);
  }, [answered, startedAt, stopped, q]);

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const restart = () => {
    clearQTime(q);
    setElapsed(0);
    setStopped(false);
    setStartedAt(Date.now());
    if (onRestart) onRestart();
  };

  // Never started and nothing saved.
  if (startedAt === null && !stopped) {
    return (
      <button
        className={`btn btn--ghost btn--sm qtimer ${className}`}
        onClick={() => { setStartedAt(Date.now()); setElapsed(0); }}
        title="Is question ka timer start karo — answer lagate hi ruk jayega"
      >
        ⏱️
      </button>
    );
  }

  // Running: not a button, because stopping is what answering is for.
  if (!stopped) {
    return (
      <span
        className={`qtimer qtimer--live is-running ${className}`}
        title="Chal raha hai — answer lagate hi rukega"
      >
        ⏱️ {fmt(elapsed)}
      </span>
    );
  }

  return (
    <button
      className={`qtimer qtimer--live is-stopped ${className}`}
      onClick={restart}
      title={`Is question mein ${elapsed}s lage — dobara attempt karne ke liye click karo`}
    >
      ⏱️ {fmt(elapsed)} ↻
    </button>
  );
}
