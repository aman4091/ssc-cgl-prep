"use client";

// 🍅 Pomodoro — Answers ke roop 9 jaisa hi, ab har PYQ / padhai wale page par
// (owner). Page khulte hi pehle wahi card: "🍅 25 minute, sirf yahi ▶ Shuru";
// chalte waqt upar wahi ghadi wali patti aur neeche page; aaram mein ☕.
// Minute us page ke subject mein judte hain (lib/pomo).

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SUBJ, subjectOfPath, isStudyPath, getRun, startFocus, getLog, tick, fmtMin, FOCUS_MIN } from "@/lib/pomo";
import { dayKey } from "@/lib/daytime";
import "./answers-play.css";

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const subNow = () => subjectOfPath(window.location.pathname, window.location.search);

export default function PomoGate({ children }) {
  const path = usePathname() || "/";
  const [run, setRun] = useState(null);
  const [now, setNow] = useState(0);
  const [skip, setSkip] = useState(false);
  const [, setT] = useState(0);

  useEffect(() => {
    setRun(getRun()); setNow(Date.now());
    const on = () => { setRun(getRun()); setT((x) => x + 1); };
    window.addEventListener("cgl:pomo", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => { window.removeEventListener("cgl:pomo", on); window.removeEventListener("cgl:sync-applied", on); };
  }, []);
  // Ghadi har second; hisaab har 5 second (jis page par ho uske subject mein).
  useEffect(() => {
    if (!run) return undefined;
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
  const left = run ? Math.max(0, Math.ceil((run.endAt - (now || Date.now())) / 1000)) : 0;

  if (run && run.mode === "break") {
    return <div className="pomo-gate"><div className="ap4-start"><h2>☕ Aaram — {mmss(left)}</h2><p>Paani piyo, aankhein band. Aaj 🍅 {today._n || 0}</p></div></div>;
  }
  if (!run && !skip) {
    const s = SUBJ[subjectOfPath(path, window.location.search)] || SUBJ.other;
    const later = () => { setSkip(true); try { sessionStorage.setItem(`cgl.pomo.skip.${path}`, "1"); } catch { /* ignore */ } };
    return (
      <div className="pomo-gate">
        <div className="ap4-start">
          <h2>🍅 {FOCUS_MIN} minute, sirf yahi</h2>
          <p>Phone door, bas padhai. Aaj 🍅 {today._n || 0}{mins ? ` · ${mins}` : ""}</p>
          <button type="button" className="ap-go" onClick={() => startFocus(subjectOfPath(path, window.location.search))}>▶ 🍅 Shuru · {s.icon} {s.label}</button>
          <button type="button" className="pomo-gate__skip" onClick={later}>Bina pomodoro ke →</button>
        </div>
      </div>
    );
  }
  if (run) {
    return (
      <>
        <div className="pomo-gate pomo-gate--bar">
          <div className="ap4-bar is-pomo"><b>🍅 {mmss(left)}</b><span>Aaj 🍅 {today._n || 0}{mins ? ` · ${mins}` : ""}</span><div className="ap-bar"><i style={{ width: `${(left / (FOCUS_MIN * 60)) * 100}%` }} /></div></div>
        </div>
        {children}
      </>
    );
  }
  return children;
}

// Poori-screen wale PYQ (components/PyqSplit) apni patti mein upar ki ghadi
// dhak lete hain — wahan isi patti mein chhoti 🍅 ghadi.
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
  const left = Math.max(0, Math.ceil((run.endAt - now) / 1000));
  return <span className="pomo-chip">{run.mode === "break" ? "☕" : "🍅"} {mmss(left)}</span>;
}
