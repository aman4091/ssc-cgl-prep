"use client";

// 🍅 Pomodoro — PYQ / padhai wale page par neeche ek chhota button, bas
// Start aur Pause (owner: "jyada kuch nahi"). Koi card / patti nahi.
//   band → "▶ 🍅"   chal raha → "⏸ 24:59"   ruka → "▶ 24:59"
// Site band (tab band / reload / chhod di) → apne aap ⏸. 25 minute poore →
// bas band. Minute us page ke subject mein judte hain (lib/pomo).

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { subjectOfPath, isStudyPath, getRun, startFocus, pauseRun, resumeRun, recoverStale, tick } from "@/lib/pomo";
import "./answers-play.css";

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const subNow = () => subjectOfPath(window.location.pathname, window.location.search);
const leftOf = (run, now) => (!run ? 0 : run.paused ? Math.ceil((run.left || 0) / 1000) : Math.max(0, Math.ceil((run.endAt - now) / 1000)));

export default function PomoGate({ children }) {
  const path = usePathname() || "/";
  const [run, setRun] = useState(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    recoverStale();
    const on = () => setRun(getRun());
    on(); setNow(Date.now());
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

  if (!isStudyPath(path)) return children;

  const left = leftOf(run, now || Date.now());
  const press = () => {
    if (!run) startFocus(subNow());
    else if (run.paused) resumeRun();
    else pauseRun(subNow());
  };
  return (
    <>
      {children}
      <button type="button" className={`pomo-btn${run ? (run.paused ? " is-paused" : " is-on") : ""}`} onClick={press} title={!run ? "Pomodoro shuru" : run.paused ? "Chalu karo" : "Roko"}>
        {!run ? "▶ 🍅" : run.paused ? `▶ ${mmss(left)}` : `⏸ ${mmss(left)}`}
      </button>
    </>
  );
}
