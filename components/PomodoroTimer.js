"use client";

import { useEffect, useRef, useState } from "react";
import { getSettings, saveSettings } from "@/lib/storage";
import { setTargetDone } from "@/lib/targets";
import {
  addFocusSeconds, completeSession,
  getTodaySeconds, getTodaySessions, getTotalSeconds, getWeekSeconds, fmtDuration,
} from "@/lib/pomodoro";

const STATE_KEY = "cgl.pomodoro.state";
const FOCUS_OPTS = [15, 25, 50];

function mmss(sec) {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// Navbar Pomodoro: start / pause / reset a focus timer and auto-track how much
// you studied today. Lives in the (persistent) navbar so it keeps running while
// you move between pages. Time spent in FOCUS mode is counted into the tracker.
export default function PomodoroTimer() {
  const [mode, setMode] = useState("focus"); // "focus" | "break"
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(25 * 60);
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState({ today: 0, sessions: 0, week: 0, total: 0 });

  // Task-timer mode: a one-shot countdown tied to a specific Today target.
  const [taskMode, setTaskMode] = useState(false);
  const [taskLabel, setTaskLabel] = useState("");
  const [taskDone, setTaskDone] = useState(null); // { label, targetId } when a task finishes

  const tickRef = useRef(null);
  const lastTsRef = useRef(0);
  const unflushedRef = useRef(0);
  const remainingRef = useRef(remaining);
  const modeRef = useRef(mode);
  const focusMinRef = useRef(25);
  const breakMinRef = useRef(5);
  const origTitleRef = useRef("");
  const taskModeRef = useRef(false);
  const taskLabelRef = useRef("");
  const taskTargetIdRef = useRef("");
  const startTaskRef = useRef(null);
  const [focusMin, setFocusMin] = useState(25);

  useEffect(() => { remainingRef.current = remaining; }, [remaining]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  const refreshStats = () =>
    setStats({ today: getTodaySeconds(), sessions: getTodaySessions(), week: getWeekSeconds(), total: getTotalSeconds() });

  // Init durations from settings + restore any saved (paused) state.
  useEffect(() => {
    const s = getSettings();
    const fm = s.pomodoroFocusMin || 25;
    const bm = s.pomodoroBreakMin || 5;
    focusMinRef.current = fm; breakMinRef.current = bm; setFocusMin(fm);
    let restored = false;
    try {
      const saved = JSON.parse(localStorage.getItem(STATE_KEY) || "null");
      if (saved && typeof saved.remaining === "number") {
        const m = saved.mode === "break" ? "break" : "focus";
        setMode(m); modeRef.current = m;
        setRemaining(saved.remaining); remainingRef.current = saved.remaining;
        if (saved.task) {
          setTaskMode(true); taskModeRef.current = true;
          setTaskLabel(saved.task.label || ""); taskLabelRef.current = saved.task.label || "";
          taskTargetIdRef.current = saved.task.targetId || "";
        }
        restored = true;
      }
    } catch { /* ignore */ }
    if (!restored) { setRemaining(fm * 60); remainingRef.current = fm * 60; }
    refreshStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flush = () => {
    const whole = Math.floor(unflushedRef.current);
    if (whole >= 1) {
      addFocusSeconds(whole);
      unflushedRef.current -= whole;
      refreshStats();
    }
  };
  const persist = (m, rem) => {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify({
        mode: m, remaining: Math.round(rem),
        task: taskModeRef.current ? { label: taskLabelRef.current, targetId: taskTargetIdRef.current } : null,
      }));
    } catch { /* ignore */ }
  };

  const beep = () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      o.start(); o.stop(ctx.currentTime + 0.6);
      setTimeout(() => { try { ctx.close(); } catch { /* ignore */ } }, 800);
    } catch { /* ignore */ }
  };
  // Louder "time's up" alert for a finished task timer — a few beeps.
  const alarm = () => { beep(); setTimeout(beep, 700); setTimeout(beep, 1400); };

  const doTick = () => {
    const now = Date.now();
    let delta = (now - lastTsRef.current) / 1000;
    lastTsRef.current = now;
    if (delta <= 0) return;
    if (delta > 3600) delta = 1; // clock jump / long sleep guard

    const wasFocus = modeRef.current === "focus";
    if (wasFocus) {
      unflushedRef.current += Math.min(delta, Math.max(0, remainingRef.current));
      if (unflushedRef.current >= 5) flush();
    }

    const rem = remainingRef.current - delta;
    if (rem <= 0) {
      flush();
      if (wasFocus) { completeSession(); refreshStats(); }

      // Task timer: STOP here (don't roll into a break) and pop the "done" dialog.
      if (taskModeRef.current) {
        alarm();
        setRunning(false);
        if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
        const label = taskLabelRef.current, tid = taskTargetIdRef.current;
        setTaskMode(false); taskModeRef.current = false;
        taskLabelRef.current = ""; taskTargetIdRef.current = "";
        const nRem = focusMinRef.current * 60;
        setMode("focus"); modeRef.current = "focus";
        setRemaining(nRem); remainingRef.current = nRem;
        persist("focus", nRem);
        if (origTitleRef.current) document.title = origTitleRef.current;
        setTaskDone({ label, targetId: tid });
        setOpen(false);
        return;
      }

      beep();
      const nextMode = wasFocus ? "break" : "focus";
      const nextRem = (wasFocus ? breakMinRef.current : focusMinRef.current) * 60;
      setMode(nextMode); modeRef.current = nextMode;
      setRemaining(nextRem); remainingRef.current = nextRem;
      persist(nextMode, nextRem);
      // keep running straight into the next interval
    } else {
      remainingRef.current = rem;
      setRemaining(rem);
    }
  };

  const beginTicking = () => {
    if (!origTitleRef.current) origTitleRef.current = document.title;
    setRunning(true);
    lastTsRef.current = Date.now();
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(doTick, 1000);
  };
  const start = () => { if (!running) beginTicking(); };

  // Start a one-shot countdown for a specific Today target (fired from the
  // Today page via a window event). Focus time still counts into the tracker.
  const startTask = ({ minutes, label, targetId } = {}) => {
    const secs = Math.max(1, Math.round((Number(minutes) || 0) * 60));
    flush();
    setTaskDone(null);
    setTaskMode(true); taskModeRef.current = true;
    setTaskLabel(label || "Study"); taskLabelRef.current = label || "Study";
    taskTargetIdRef.current = targetId || "";
    setMode("focus"); modeRef.current = "focus";
    setRemaining(secs); remainingRef.current = secs;
    persist("focus", secs);
    setOpen(true);
    beginTicking();
  };
  startTaskRef.current = startTask;
  const pause = () => {
    setRunning(false);
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    flush();
    persist(modeRef.current, remainingRef.current);
    if (origTitleRef.current) document.title = origTitleRef.current;
  };
  const reset = () => {
    pause();
    setTaskMode(false); taskModeRef.current = false;
    taskLabelRef.current = ""; taskTargetIdRef.current = "";
    const rem = focusMinRef.current * 60;
    setMode("focus"); modeRef.current = "focus";
    setRemaining(rem); remainingRef.current = rem;
    persist("focus", rem);
  };
  const skip = () => {
    // jump to the other mode immediately
    flush();
    const wasFocus = modeRef.current === "focus";
    if (wasFocus) { completeSession(); refreshStats(); }
    const nextMode = wasFocus ? "break" : "focus";
    const nextRem = (wasFocus ? breakMinRef.current : focusMinRef.current) * 60;
    setMode(nextMode); modeRef.current = nextMode;
    setRemaining(nextRem); remainingRef.current = nextRem;
    lastTsRef.current = Date.now();
    persist(nextMode, nextRem);
  };

  const changeFocusLen = (min) => {
    focusMinRef.current = min; setFocusMin(min);
    try { saveSettings({ ...getSettings(), pomodoroFocusMin: min }); } catch { /* ignore */ }
    if (!running && modeRef.current === "focus") {
      setRemaining(min * 60); remainingRef.current = min * 60;
      persist("focus", min * 60);
    }
  };

  // Show the countdown in the browser tab while running.
  useEffect(() => {
    if (running) document.title = `⏱ ${mmss(remaining)} · ${mode === "focus" ? "Focus" : "Break"}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, running, mode]);

  // Listen for a "start this target's timer" request from the Today page.
  useEffect(() => {
    const onStart = (e) => startTaskRef.current && startTaskRef.current(e.detail || {});
    window.addEventListener("cgl:start-task-timer", onStart);
    return () => window.removeEventListener("cgl:start-task-timer", onStart);
  }, []);

  // Flush + persist on unload / unmount so nothing is lost.
  useEffect(() => {
    const onHide = () => { flush(); persist(modeRef.current, remainingRef.current); };
    window.addEventListener("beforeunload", onHide);
    return () => {
      window.removeEventListener("beforeunload", onHide);
      if (tickRef.current) clearInterval(tickRef.current);
      flush(); persist(modeRef.current, remainingRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isBreak = mode === "break";

  return (
    <div className="pomo">
      <button
        className={`pomo__pill ${isBreak ? "is-break" : ""} ${taskMode ? "is-task" : ""}`}
        onClick={() => setOpen((o) => !o)}
        title={taskMode ? `⏱ ${taskLabel}` : "Pomodoro study timer"}
      >
        <span className={`pomo__dot ${running ? "is-run" : ""}`} />
        <span className="pomo__time">{mmss(remaining)}</span>
      </button>
      <button className="pomo__play" onClick={running ? pause : start} title={running ? "Pause" : "Start"}>
        {running ? "⏸" : "▶"}
      </button>

      {open && (
        <>
          <div className="pomo__scrim" onClick={() => setOpen(false)} />
          <div className="pomo__panel" role="dialog">
            <div className="pomo__panel-head">
              <span className={`pomo__badge ${isBreak ? "is-break" : "is-focus"}`}>
                {taskMode ? "⏱ Task timer" : isBreak ? "☕ Break" : "🎯 Focus"}
              </span>
              <button className="pomo__x" onClick={() => setOpen(false)}>✕</button>
            </div>

            {taskMode && taskLabel && (
              <p className="muted" style={{ fontSize: "0.82rem", textAlign: "center", margin: "2px 0 -4px" }}>
                🎯 {taskLabel}
              </p>
            )}

            <div className="pomo__big">{mmss(remaining)}</div>

            <div className="pomo__controls">
              <button className="btn btn--primary btn--sm" onClick={running ? pause : start}>
                {running ? "⏸ Pause" : "▶ Start"}
              </button>
              <button className="btn btn--ghost btn--sm" onClick={reset}>{taskMode ? "⏹ Stop task" : "⏹ Reset"}</button>
              {!taskMode && <button className="btn btn--ghost btn--sm" onClick={skip}>⏭ Skip</button>}
            </div>

            {!isBreak && !taskMode && (
              <div className="pomo__lens">
                <span className="muted" style={{ fontSize: "0.75rem" }}>Focus length:</span>
                {FOCUS_OPTS.map((m) => (
                  <button
                    key={m}
                    className={`chip chip--btn chip--sm ${focusMin === m ? "is-active" : ""}`}
                    onClick={() => changeFocusLen(m)}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            )}

            <div className="pomo__stats">
              <div className="pomo__stat">
                <strong>{fmtDuration(stats.today)}</strong>
                <span>Aaj pada</span>
              </div>
              <div className="pomo__stat">
                <strong>{stats.sessions}</strong>
                <span>Sessions</span>
              </div>
              <div className="pomo__stat">
                <strong>{fmtDuration(stats.week)}</strong>
                <span>Is hafte</span>
              </div>
              <div className="pomo__stat">
                <strong>{fmtDuration(stats.total)}</strong>
                <span>Total</span>
              </div>
            </div>
          </div>
        </>
      )}

      {taskDone && (
        <div className="modal-overlay" onClick={() => setTaskDone(null)}>
          <div className="modal glass pomo-done" onClick={(e) => e.stopPropagation()}>
            <div className="pomo-done__ico">✅</div>
            <h2 style={{ fontSize: "1.25rem" }}>Time complete!</h2>
            <p className="muted mt-8" style={{ fontSize: "0.9rem" }}>
              {taskDone.label ? <>“<strong>{taskDone.label}</strong>” ka</> : "Iska"} time pura ho gaya. 🎉 Ab rok do — chai break le lo!
            </p>
            <div className="row mt-16" style={{ justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
              {taskDone.targetId && (
                <button
                  className="btn btn--primary"
                  onClick={() => {
                    try { setTargetDone(taskDone.targetId, true); } catch { /* ignore */ }
                    try { window.dispatchEvent(new Event("cgl:targets-changed")); } catch { /* ignore */ }
                    setTaskDone(null);
                  }}
                >
                  ✅ Mark done &amp; stop
                </button>
              )}
              <button className="btn btn--ghost" onClick={() => setTaskDone(null)}>⏹ Stop</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
