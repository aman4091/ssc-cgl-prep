"use client";

// 🍅 Pomodoro — har page par (app/layout). Neeche-baayen kone mein 🍅; padhai
// wale page (PYQ, Answers, Vocab …) par khulte hi upar "pehle pomodoro?" ki
// patti. Chalte waqt jis page par ho uske subject ke minute judte hain —
// hisaab lib/pomo mein, 🍅 dabao to aaj ka subject-wise dikhta hai.

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FOCUS_MIN, BREAK_MIN, SUBJ, subjectOfPath, isStudyPath, getRun, startFocus, stopRun, getLog, tick, fmtMin } from "@/lib/pomo";
import { dayKey } from "@/lib/daytime";
import "./pomo.css";

const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
function beep() {
  try {
    const a = new (window.AudioContext || window.webkitAudioContext)();
    const o = a.createOscillator(); const g = a.createGain();
    o.connect(g); g.connect(a.destination); o.frequency.value = 880; g.gain.value = 0.08;
    o.start(); o.stop(a.currentTime + 0.35);
  } catch { /* ignore */ }
}

export default function PomoWidget() {
  const path = usePathname() || "/";
  const [run, setRun] = useState(null);
  const [now, setNow] = useState(0);
  const [open, setOpen] = useState(false);
  const [skip, setSkip] = useState(false);
  const [, setT] = useState(0);
  const sub = subjectOfPath(path, typeof window !== "undefined" ? window.location.search : "");

  useEffect(() => {
    setRun(getRun()); setNow(Date.now());
    const on = () => { setRun(getRun()); setT((x) => x + 1); };
    window.addEventListener("cgl:pomo", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => { window.removeEventListener("cgl:pomo", on); window.removeEventListener("cgl:sync-applied", on); };
  }, []);
  // Har second ghadi; har 5 second hisaab (is page ke subject mein).
  useEffect(() => {
    if (!run) return undefined;
    let n = 0;
    const id = setInterval(() => {
      setNow(Date.now());
      n += 1;
      if (n % 5 === 0 || Date.now() >= run.endAt) {
        const before = run.mode;
        const r = tick(subjectOfPath(window.location.pathname, window.location.search));
        if (before === "focus" && r && r.mode === "break") { beep(); setOpen(true); }
        if (before === "break" && !r) beep();
      }
    }, 1000);
    const vis = () => { if (document.visibilityState === "visible") tick(subjectOfPath(window.location.pathname, window.location.search)); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", vis); };
  }, [run]);
  // Naye page par patti phir puchhe.
  useEffect(() => {
    try { setSkip(sessionStorage.getItem(`cgl.pomo.skip.${path}`) === "1"); } catch { setSkip(false); }
  }, [path]);

  const go = () => { startFocus(sub); setOpen(false); };
  const stop = () => { tick(subjectOfPath(window.location.pathname, window.location.search)); stopRun(); };
  const later = () => { setSkip(true); try { sessionStorage.setItem(`cgl.pomo.skip.${path}`, "1"); } catch { /* ignore */ } };

  const log = getLog();
  const today = log[dayKey()] || {};
  const todaySec = Object.entries(today).filter(([k]) => k !== "_n").reduce((a, [, v]) => a + v, 0);
  const week = Array.from({ length: 7 }, (_, k) => { const d = new Date(); d.setDate(d.getDate() - k); const e = log[dayKey(d)] || {}; return Object.entries(e).filter(([x]) => x !== "_n").reduce((a, [, v]) => a + v, 0); });
  const weekSec = week.reduce((a, b) => a + b, 0);
  const left = run ? run.endAt - (now || Date.now()) : 0;
  const s = SUBJ[sub] || SUBJ.other;

  return (
    <>
      {!run && !skip && isStudyPath(path) ? (
        <div className="pomo-ask">
          <span>🍅 Pehle {FOCUS_MIN} minute ka pomodoro? <small>{s.icon} {s.label} mein judega · aaj {fmtMin(todaySec)}</small></span>
          <button type="button" className="pomo-go" onClick={go}>▶ Shuru</button>
          <button type="button" className="pomo-no" onClick={later}>Abhi nahi</button>
        </div>
      ) : null}

      <button type="button" className={`pomo-fab${run ? ` is-${run.mode}` : ""}`} onClick={() => setOpen(!open)} title="Pomodoro">
        {run ? <><b>{run.mode === "break" ? "☕" : "🍅"} {mmss(left)}</b>{run.mode === "focus" ? <small>{s.icon}</small> : null}</> : "🍅"}
      </button>

      {open ? (
        <div className="pomo-pop">
          <div className="pomo-pop__hd"><b>🍅 Pomodoro</b><button type="button" onClick={() => setOpen(false)} aria-label="Band karo">✕</button></div>
          {run ? (
            <div className="pomo-now">
              <div className="pomo-big">{run.mode === "break" ? "☕" : "🍅"} {mmss(left)}</div>
              <p>{run.mode === "break" ? `Aaram — ${BREAK_MIN} minute. Paani piyo, aankhein band.` : `Focus — ${s.icon} ${s.label} mein ginti chal rahi hai`}</p>
              <div className="pomo-row">
                {run.mode === "break" ? <button type="button" className="pomo-go" onClick={go}>⏭ Aaram chhodo, agla 🍅</button> : null}
                <button type="button" className="pomo-no" onClick={stop}>⏹ Roko</button>
              </div>
            </div>
          ) : (
            <div className="pomo-now">
              <button type="button" className="pomo-go" onClick={go}>▶ {FOCUS_MIN} min shuru · {s.icon} {s.label}</button>
            </div>
          )}
          <div className="pomo-stats">
            <div className="pomo-sum"><b>{fmtMin(todaySec)}</b><span>aaj · 🍅 {today._n || 0}</span></div>
            <div className="pomo-sum"><b>{fmtMin(weekSec)}</b><span>7 din</span></div>
          </div>
          <div className="pomo-subs">
            {Object.keys(SUBJ).map((k) => (
              <div key={k}><span>{SUBJ[k].icon} {SUBJ[k].label}</span><i style={{ width: `${todaySec ? ((today[k] || 0) / todaySec) * 100 : 0}%` }} /><b>{fmtMin(today[k] || 0)}</b></div>
            ))}
          </div>
          <div className="pomo-week">{week.slice().reverse().map((v, k) => <i key={k} style={{ height: `${Math.min(100, (v / Math.max(1, ...week)) * 100)}%` }} title={fmtMin(v)} />)}</div>
        </div>
      ) : null}
    </>
  );
}
