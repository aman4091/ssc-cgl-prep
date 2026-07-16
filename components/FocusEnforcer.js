"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSettings } from "@/lib/storage";
import { getTopPending, startTarget, setTargetDone } from "@/lib/targets";
import { inFocusWindow } from "@/lib/daytime";

// Attention beep (same WebAudio idea as the Pomodoro timer).
function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine"; o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.55);
    o.start(); o.stop(ctx.currentTime + 0.55);
    setTimeout(() => { try { ctx.close(); } catch { /* ignore */ } }, 900);
  } catch { /* ignore */ }
}

// Strict Focus Mode: a forced (non-dismissible) "do this now" popup for the #1
// pending target. It reappears every strictIntervalMin until you Start it; once a
// task is started/done it moves to the next #1. Only escape = turn Strict off.
export default function FocusEnforcer() {
  const router = useRouter();
  const [task, setTask] = useState(null); // the target shown in the popup (null = hidden)
  const openRef = useRef(false);
  const nextAtRef = useRef(0);      // don't nag again until this time (after a snooze)
  const snoozeIdRef = useRef("");   // which task was snoozed

  useEffect(() => {
    const tick = () => {
      const s = getSettings();
      const active = s.strictMode && inFocusWindow();
      const top = active ? getTopPending() : null;
      const pending = top && !top.startedAt ? top : null; // nag only for un-started #1
      if (!pending) {
        if (openRef.current) { openRef.current = false; setTask(null); }
        return;
      }
      if (openRef.current) {
        setTask((cur) => (cur && cur.id === pending.id ? cur : pending)); // swap if #1 changed
        return;
      }
      const snoozed = snoozeIdRef.current === pending.id && Date.now() < nextAtRef.current;
      if (!snoozed) { openRef.current = true; setTask(pending); beep(); }
    };
    tick();
    const iv = setInterval(tick, 15000); // re-check every 15s (picks up settings + task changes)
    const onChanged = () => tick();
    window.addEventListener("cgl:targets-changed", onChanged);
    return () => { clearInterval(iv); window.removeEventListener("cgl:targets-changed", onChanged); };
  }, []);

  if (!task) return null;

  const close = () => { openRef.current = false; setTask(null); };
  const startNow = () => {
    startTarget(task.id);
    const dur = task.ref?.durationMin || 0;
    if (dur > 0) window.dispatchEvent(new CustomEvent("cgl:start-task-timer", { detail: { minutes: dur, label: task.title, targetId: task.id } }));
    window.dispatchEvent(new CustomEvent("cgl:targets-changed"));
    close();
    router.push("/today");
  };
  const markDone = () => {
    setTargetDone(task.id, true);
    window.dispatchEvent(new CustomEvent("cgl:targets-changed"));
    close();
  };
  const snooze = () => {
    const mins = Math.max(1, getSettings().strictIntervalMin || 2);
    snoozeIdRef.current = task.id;
    nextAtRef.current = Date.now() + mins * 60 * 1000;
    close();
  };

  return (
    // Non-dismissible: NO backdrop onClick, NO ✕, NO Escape. Only the buttons act.
    <div className="modal-overlay" style={{ zIndex: 400, background: "rgba(20,4,8,0.92)" }}>
      <div className="modal glass" style={{ maxWidth: 460, borderColor: "rgba(255,138,122,0.5)" }}>
        <div className="center">
          <div style={{ fontSize: "2.2rem" }}>⏰</div>
          <span className="badge" style={{ background: "rgba(255,138,122,0.18)", color: "var(--danger)", border: "1px solid rgba(255,138,122,0.4)" }}>
            STRICT FOCUS · #1 kaam
          </span>
        </div>
        <h2 className="center" style={{ fontSize: "1.35rem", marginTop: 14 }}>{task.title}</h2>
        <p className="muted center mt-8" style={{ fontSize: "0.9rem" }}>
          Ye <strong>#1 target</strong> abhi karo. Jab tak start nahi karoge, har {Math.max(1, getSettings().strictIntervalMin || 2)} min baad ye phir aayega. 💪
        </p>
        <div className="grid" style={{ gap: 10, marginTop: 20 }}>
          <button className="btn btn--primary" onClick={startNow} style={{ fontSize: "1.05rem", padding: "13px" }}>▶ Start now</button>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn--ghost" style={{ flex: 1 }} onClick={markDone}>✓ Already done</button>
            <button className="btn btn--ghost" style={{ flex: 1 }} onClick={snooze}>⏰ 2 min baad</button>
          </div>
        </div>
        <p className="center mt-16">
          <a href="/settings" className="muted" style={{ fontSize: "0.76rem", textDecoration: "underline" }}>⚙️ Strict mode band karo</a>
        </p>
      </div>
    </div>
  );
}
