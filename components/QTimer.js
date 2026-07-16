"use client";

import { useEffect, useRef, useState } from "react";

// Per-question stopwatch: how long did THIS question take?
//
// Press ⏱ to start, then answer — answering stops it and the time freezes on
// the button so you can read it. It is opt-in per question (nothing runs until
// you press it) because most of the time you are browsing, not timing yourself,
// and a clock that starts itself on every card would just be noise.
//
// The card owns "answered" — this component has no idea what a question is, so
// the same one works on a maths crop, a reasoning figure and a text MCQ. The
// caller flips `answered` to true when the user picks an option; the stop is
// driven by that prop rather than by a callback, so a card that re-renders (or
// reveals the answer some other way) still stops the clock exactly once.
//
// Deliberately not persisted: this is a "how long am I taking right now" check,
// not a stat. Per-question accuracy already lives in lib/qstats.
export default function QTimer({ answered = false, className = "" }) {
  const [startedAt, setStartedAt] = useState(null); // ms; null = not started
  const [elapsed, setElapsed] = useState(0);        // seconds
  const [stopped, setStopped] = useState(false);
  const tick = useRef(null);

  // Tick while running.
  useEffect(() => {
    if (startedAt === null || stopped) return undefined;
    tick.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 250);
    return () => clearInterval(tick.current);
  }, [startedAt, stopped]);

  // Answering stops it — but only if it was ever started, and only once.
  useEffect(() => {
    if (!answered || startedAt === null || stopped) return;
    setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    setStopped(true);
  }, [answered, startedAt, stopped]);

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (startedAt === null) {
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

  return (
    <span
      className={`qtimer qtimer--live ${stopped ? "is-stopped" : "is-running"} ${className}`}
      title={stopped ? `Is question mein ${elapsed}s lage` : "Chal raha hai — answer lagate hi rukega"}
    >
      ⏱️ {fmt(elapsed)}{stopped ? " ✓" : ""}
    </span>
  );
}
