"use client";

// 🍅 Pomodoro — Answers ke roop 9 jaisa hi, har PYQ / padhai wale page par
// (owner). Page khulte hi pehle wahi card: "🍅 25 minute, sirf yahi ▶ Shuru";
// chalte waqt upar wahi ghadi wali patti (scroll ke saath tiki) — ⏸ Roko /
// ▶ Chalu. Site band (tab band / reload / chhod di) → apne aap ⏸. 25 minute
// poore → bas band, aaram ka koi screen nahi; upar chhoti patti "▶ Agla 🍅".
// Minute us page ke subject mein judte hain (lib/pomo).

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SUBJ, subjectOfPath, isStudyPath, getRun, startFocus, stopRun, pauseRun, resumeRun, recoverStale, getLog, tick, fmtMin, FOCUS_MIN } from "@/lib/pomo";
import { dayKey } from "@/lib/daytime";
import "./answers-play.css";

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const subNow = () => subjectOfPath(window.location.pathname, window.location.search);
const leftOf = (run, now) => (!run ? 0 : run.paused ? Math.ceil((run.left || 0) / 1000) : Math.max(0, Math.ceil((run.endAt - now) / 1000)));

export default function PomoGate({ children }) {
  const path = usePathname() || "/";
  const [run, setRun] = useState(null);
  const [now, setNow] = useState(0);
  const [skip, setSkip] = useState(false);
  const [after, setAfter] = useState(false);
  const [, setT] = useState(0);

  useEffect(() => {
    recoverStale();
    setRun(getRun()); setNow(Date.now());
    const on = () => {
      setRun(getRun()); setT((x) => x + 1);
      try { setAfter(sessionStorage.getItem("cgl.pomo.after") === "1"); } catch { /* ignore */ }
    };
    on();
    window.addEventListener("cgl:pomo", on);
    window.addEventListener("cgl:sync-applied", on);
    // Site band / reload / doosri site — wahin ruk jao.
    const bye = () => pauseRun(subNow());
    window.addEventListener("pagehide", bye);
    return () => { window.removeEventListener("cgl:pomo", on); window.removeEventListener("cgl:sync-applied", on); window.removeEventListener("pagehide", bye); };
  }, []);
  // Ghadi har second; hisaab har 5 second (jis page par ho uske subject mein).
  useEffect(() => {
    if (!run || run.paused) return undefined;
    let n = 0;
    const id = setInterval(() => {
      setNow(Date.now());
      n += 1;
      if (n % 5 === 0 || Date.now() >= run.endAt) tick(subNow());
    }, 1000);
    return () => clearInterval(id);
  }, [run]);
  useEffect(() => {
    try { setSkip(sessionStorage.getItem(`cgl.pomo.skip.${path}`) === "1"); } catch { setSkip(false); }
  }, [path]);

  if (!isStudyPath(path)) return children;

  const today = getLog()[dayKey()] || {};
  const mins = Object.keys(SUBJ).filter((k) => today[k]).map((k) => `${SUBJ[k].icon} ${fmtMin(today[k])}`).join(" · ");
  const left = leftOf(run, now || Date.now());
  const sub = SUBJ[subjectOfPath(path, typeof window !== "undefined" ? window.location.search : "")] || SUBJ.other;
  const start = () => { try { sessionStorage.removeItem("cgl.pomo.after"); } catch { /* ignore */ } startFocus(subjectOfPath(path, window.location.search)); };

  if (run) {
    return (
      <>
        <div className="pomo-gate pomo-gate--bar">
          <div className={`ap4-bar is-pomo${run.paused ? " is-paused" : ""}`}>
            <b>{run.paused ? "⏸" : "🍅"} {mmss(left)}</b>
            <span>{run.paused ? "Ruka hua" : `Aaj 🍅 ${today._n || 0}${mins ? ` · ${mins}` : ""}`}</span>
            <div className="ap-bar"><i style={{ width: `${(left / (FOCUS_MIN * 60)) * 100}%` }} /></div>
            {run.paused ? (
              <span className="pomo-btns"><button type="button" className="pomo-b is-go" onClick={resumeRun}>▶ Chalu</button><button type="button" className="pomo-b" onClick={stopRun} title="Ye pomodoro khatam">✕</button></span>
            ) : (
              <span className="pomo-btns"><button type="button" className="pomo-b" onClick={() => pauseRun(subNow())}>⏸ Roko</button></span>
            )}
          </div>
        </div>
        {children}
      </>
    );
  }
  // 25 minute poore ho chuke — page rokna nahi, bas chhoti patti.
  if (after) {
    return (
      <>
        <div className="pomo-gate pomo-gate--bar">
          <div className="ap4-bar is-pomo is-done">
            <b>✓ 🍅</b><span>{FOCUS_MIN} minute poore · Aaj 🍅 {today._n || 0}{mins ? ` · ${mins}` : ""}</span><span />
            <span className="pomo-btns"><button type="button" className="pomo-b is-go" onClick={start}>▶ Agla 🍅</button></span>
          </div>
        </div>
        {children}
      </>
    );
  }
  if (!skip) {
    const later = () => { setSkip(true); try { sessionStorage.setItem(`cgl.pomo.skip.${path}`, "1"); } catch { /* ignore */ } };
    return (
      <div className="pomo-gate">
        <div className="ap4-start">
          <h2>🍅 {FOCUS_MIN} minute, sirf yahi</h2>
          <p>Phone door, bas padhai. Aaj 🍅 {today._n || 0}{mins ? ` · ${mins}` : ""}</p>
          <button type="button" className="ap-go" onClick={start}>▶ 🍅 Shuru · {sub.icon} {sub.label}</button>
          <button type="button" className="pomo-gate__skip" onClick={later}>Bina pomodoro ke →</button>
        </div>
      </div>
    );
  }
  return children;
}

// Poori-screen wale PYQ (components/PyqSplit) apni patti mein upar ki ghadi
// dhak lete hain — wahan isi patti mein chhoti 🍅 ghadi (dabao = ⏸ / ▶).
export function PomoChip() {
  const [run, setRun] = useState(null);
  const [now, setNow] = useState(0);
  useEffect(() => {
    const on = () => setRun(getRun());
    on(); setNow(Date.now());
    window.addEventListener("cgl:pomo", on);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => { window.removeEventListener("cgl:pomo", on); clearInterval(t); };
  }, []);
  if (!run) return null;
  const left = leftOf(run, now);
  return (
    <button type="button" className={`pomo-chip${run.paused ? " is-paused" : ""}`} onClick={() => (run.paused ? resumeRun() : pauseRun(subNow()))} title={run.paused ? "▶ Chalu karo" : "⏸ Roko"}>
      {run.paused ? "⏸" : "🍅"} {mmss(left)}
    </button>
  );
}
